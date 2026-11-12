// Game loop, player control, hub, runs (endgame activities), drops, XP.
import { G } from './state.js';
import { CLASSES } from './data/classes.js';
import { BIOMES, BIOME_IDS } from './data/monsters.js';
import { BOSSES, BOSS_IDS } from './data/bosses.js';
import { ACTIVITIES, PORTAL_MODS, MOD_IDS, COMBOS, CURVE } from './data/activities.js';
import { MATS } from './data/items.js';
import { SUPPORTS } from './data/supports.js';
import { RAR } from './data/defs.js';
import { calcStats } from './stats.js';
import { resolveAll, useSkill, updateCasting } from './skills.js';
import { tickStatuses, updateProjs, updateAreas, addArea, applyHit, simpleHit, slowMult, text, fx, heal, addBuff } from './combat.js';
import { mkActor, spawnMob, spawnPack, spawnBoss, updateMob, updateBoss, updateMinion, separate, moveActor } from './actors.js';
import { genCave, genDungeon, genArena, genHub, updateFlow, walkable, safeSpot } from './world.js';
import { rollDrops, dropAt, addToBag, genItem, vendorStock } from './items.js';
import { render, initRender, s2w, R } from './render.js';
import { saveNow } from './save.js';
import { mkHero, refreshActor, heroTick, heroDash } from './hero.js';
import { spawnAllies, updateAlly, reviveHero } from './ally.js';
import { botById, botSay, partyReward, claimInbox } from './bots.js';
import { weekId } from './data/activities.js';
import { rnd, rint, pick, shuffle, dist2, clamp, bus, chance } from './util.js';

export const NPCS = {
  portal: { n: 'Хранитель порталов', spr: 'n_portal', fn: 'portal', fnName: 'Порталы' },
  smith: { n: 'Кузнец', spr: 'n_smith', fn: 'craft', fnName: 'Кузница' },
  merchant: { n: 'Торговец', spr: 'n_merchant', fn: 'vendor', fnName: 'Торговля' },
  rune: { n: 'Мастер рун', spr: 'n_rune', fn: 'runes', fnName: 'Руны навыков' },
  auction: { n: 'Аукционист', spr: 'n_jewel', fn: 'auction', fnName: 'Аукцион' },
  collector: { n: 'Коллекционер', spr: 'n_collector', fn: 'collector', fnName: 'Добыча владык' },
  lfg: { n: 'Распорядительница', spr: 'n_ench', fn: 'lfg', fnName: 'Группы и рейды' },
  trainer: { n: 'Наставник', spr: 'n_trainer', fn: 'trainer', fnName: 'Специализация' },
  alch: { n: 'Алхимик', spr: 'n_alch', fn: 'alch', fnName: 'Зелья' },
  stash: { n: 'Хранилище', spr: null, fn: 'stash', fnName: 'Открыть', label: 1 },
  board: { n: 'Доска испытаний', spr: null, fn: 'board', fnName: 'Летопись', label: 1 },
  guard: { n: 'Страж ворот', spr: 'n_guard' }, guard2: { n: 'Страж ворот', spr: 'n_guard' },
  villager: { n: 'Беженка', spr: 'n_villager' }, peasant: { n: 'Беженец', spr: 'n_peasant' }, king: { n: 'Последний король', spr: 'n_king' },
};

const mkZone = (map) => ({ map, actors: [], minions: [], bosses: [], projs: [], areas: [], drops: [], fx: [], texts: [], objs: [], heroes: [], party: [], run: null });
export const toast = (msg, col = '#ffd27a') => bus.emit('toast', msg, col);

function makePlayer(x, y) {
  const p = mkHero(G.ch, x, y, 'player', { threatMul: G.party && G.party.role === 'tank' ? 5 : 1, role: (G.party && G.party.role) || 'dps' });
  G.p = p; bus.emit('statsChanged');
  return p;
}
export function refreshStats(full) { if (G.p) refreshActor(G.p, full); }

// ------------------------------------------------------------------ hub
export function enterHub() {
  const map = genHub(), z = mkZone(map); z.hub = true; G.zone = z;
  for (const n of map.npcs) { const d = NPCS[n.id]; z.actors.push(mkActor({ kind: 'npc', team: 2, x: n.x, y: n.y, name: d.n, spr: d.spr, fn: d.fn, fnName: d.fnName, label: d.label, sc: 3, r: 0.4 })); }
  z.actors.push(makePlayer(map.start.x, map.start.y));
  G.cam.x = G.p.x; G.cam.y = G.p.y;
  const top = Math.max(...Object.values(G.ch.prog.tier));
  G.vendor = vendorStock(CURVE.ilvl(top));
  if (G.pendingPortal) { z.objs.push({ kind: 'portal', x: map.portalPos.x, y: map.portalPos.y, cfg: G.pendingPortal, dwell: 0 }); }
  z.heroes = [G.p];
  // other "players" hanging around town
  const pts = map.npcs;
  for (const b of shuffle(G.save.world.bots.filter((x) => x.online && !(G.party && G.party.ids.includes(x.id)))).slice(0, 24)) {
    let x = map.start.x, y = map.start.y;
    for (let k = 0; k < 8; k++) { const n = pick(pts), nx = n.x + rnd(-2.5, 2.5), ny = n.y + rnd(0.8, 3); if (walkable(map, nx, ny)) { x = nx; y = ny; break; } }
    z.actors.push(mkActor({ kind: 'npc', team: 2, x, y, name: `${b.ch.name} · ${b.ch.level}`, spr: CLASSES[b.ch.cls].spr, bot: b, sc: 3, r: 0.36, wander: { tx: x, ty: y, wait: rnd(0, 6), stuck: 0 } }));
  }
  claimInbox();
  saveNow(); bus.emit('zone');
}
export function openPortal(cfg) {
  const z = G.zone; if (!z.hub) return;
  z.objs = z.objs.filter((o) => o.kind !== 'portal');
  G.pendingPortal = cfg;
  z.objs.push({ kind: 'portal', x: z.map.portalPos.x, y: z.map.portalPos.y, cfg, dwell: 0 });
  fx('ring', z.map.portalPos.x, z.map.portalPos.y, { rad: 3, col: '#b06bff', dur: 0.8 });
  toast('Портал открыт: ' + ACTIVITIES[cfg.act].n);
}

// ------------------------------------------------------------------ runs
export function describeRun(cfg) {
  let qty = cfg.tier * 2, rar = cfg.tier * 3; const fxm = {};
  for (const m of cfg.mods) { const M = PORTAL_MODS[m]; qty += M.qty; rar += M.rar; for (const k in M.fx) fxm[k] = ['mobCount', 'mobHp', 'mobDmg', 'elite', 'mobSpd'].includes(k) ? (fxm[k] || 1) * M.fx[k] : (fxm[k] || 0) + M.fx[k]; }
  let combo = null;
  for (const c of COMBOS) if (c.need.every((n) => cfg.mods.includes(n))) { Object.assign(fxm, c.fx); rar += c.rar || 0; combo = c; }
  if (cfg.act === 'chaos') { qty += 40; rar += 40; }
  return { qty, rar, fx: fxm, combo };
}
export function startRun(cfg) {
  const ch = G.ch, act = ACTIVITIES[cfg.act];
  if (act.keyCost) { if ((ch.mats.key || 0) < act.keyCost) { toast('Нужен Ключ владыки', '#f88'); return false; } ch.mats.key -= act.keyCost; }
  const mods = cfg.mods.slice();
  if (cfg.act === 'chaos') {
    const co = shuffle(MOD_IDS.filter((m) => PORTAL_MODS[m].chaos)), re = shuffle(MOD_IDS.filter((m) => !PORTAL_MODS[m].chaos && !mods.includes(m)));
    mods.push(co[0], co[1], re[0]);
  }
  const d = describeRun({ ...cfg, mods });
  const biome = cfg.act === 'boss' ? BOSSES[cfg.bossId].biome : pick(BIOME_IDS);
  const run = { act: cfg.act, tier: cfg.tier, baseTier: cfg.tier, mods, fx: d.fx, fxAll: d.fx, qty: d.qty, rar: d.rar, combo: d.combo, biome, mobPool: BIOMES[biome].mobs, seed: (Date.now() % 1e8) + rint(0, 9999), deaths: 0, maxDeaths: act.noDeath ? 0 : 3, kills: 0, state: 'active', floor: cfg.floor || 1, t: 0, bossId: cfg.bossId, need: 0, wave: 0, spawnT: 1, metT: 3 };
  if (act.group) {
    if (!G.party || !G.party.ids.length) { toast('Сначала соберите группу у Распорядительницы', '#f88'); return false; }
    if (act.weekly && ch.prog.raidWeek === weekId()) { toast('Рейд уже пройден на этой неделе', '#f88'); return false; }
    const n = G.party.ids.length + 1;
    run.group = n; run.maxDeaths = 999; run.stage = 1; G.party.wipes = 0;
    run.fx.mobHp = (run.fx.mobHp || 1) * n * 1.6; run.fx.mobDmg = (run.fx.mobDmg || 1) * 4.5;
    run.partyCls = [ch.cls, ...G.party.ids.map((id) => botById(id).ch.cls)];
  }
  ch.prog.runs++; G.pendingPortal = null;
  buildFloor(run);
  if (run.combo) toast('Секретное событие: ' + run.combo.n, '#36e0c8');
  return true;
}
function envActor(run) { return mkActor({ kind: 'mob', dmg: CURVE.mobDmg(run.tier) * (run.fx.mobDmg || 1), dt: 'fire', pow: CURVE.mobDmg(run.tier) / 62, name: 'Окружение' }); }

function buildFloor(run) {
  const act = ACTIVITIES[run.act], fxr = run.fx, keep = G.p ? { hp: G.p.hp / G.p.s.maxLife, mp: G.p.mp / Math.max(1, G.p.s.maxMana), flask: G.p.flask, buffs: G.p.buffs } : null;
  let map;
  if (run.act === 'tower') { run.tier = 1 + Math.floor((run.floor - 1) * 0.8); run.biome = pick(BIOME_IDS); run.mobPool = BIOMES[run.biome].mobs; run.wave = 0; run.waves = run.floor % 5 === 0 ? 1 : 2 + (run.floor > 10 ? 1 : 0); run.cleared = false; }
  if (act.gen === 'cave') map = genCave(run.seed, run.biome, run.act === 'chaos' ? 72 : 86, Math.round((run.act === 'chaos' ? 18 : 26) * (fxr.mobCount || 1)));
  else if (act.gen === 'dungeon') map = genDungeon(run.seed + run.floor * 7919, run.biome, run.floor >= act.floors);
  else map = genArena(run.seed + run.floor * 31, run.biome, run.act === 'rift' ? 15 : run.act === 'raid' ? 16 : run.act === 'tower' ? 12 : 13, run.act === 'rift' ? 4 : 6);
  const z = mkZone(map); z.run = run; G.zone = z; run.env = envActor(run);
  const p = makePlayer(map.start.x, map.start.y); z.actors.push(p); z.heroes = [p]; spawnAllies();
  if (keep && run.floor > 1) { p.hp = p.s.maxLife * keep.hp; p.mp = p.s.maxMana * keep.mp; p.flask = keep.flask; }
  G.cam.x = p.x; G.cam.y = p.y;
  for (const c of map.chests) z.objs.push({ kind: 'chest', x: c.x, y: c.y, rich: c.rich });
  for (const s of map.shrines) z.objs.push({ kind: 'shrine', x: s.x, y: s.y });
  for (const t of map.traps) z.objs.push({ kind: 'trap', x: t.x, y: t.y, ph: t.ph, hitT: 0 });
  if (map.exit) z.objs.push({ kind: 'stairs', x: map.exit.x, y: map.exit.y });
  if (act.gen !== 'arena') {
    const n = Math.round(map.packs.length * (act.gen === 'dungeon' ? (fxr.mobCount || 1) : 1));
    for (let i = 0; i < n; i++) spawnPack(map.packs[i % map.packs.length], run);
    if (map.bossPos) {
      const ids = shuffle(BIOMES[run.biome].bosses.slice());
      spawnBoss(ids[0], map.bossPos.x, map.bossPos.y, run, { hpMul: (run.act === 'gdungeon' ? 3.5 : run.act === 'dungeon' ? 0.55 : 0.45) * (fxr.awakened ? 2 : 1), awakened: fxr.awakened });
      if (fxr.bosses) spawnBoss(ids[1] || pick(BOSS_IDS), map.bossPos.x + 3, map.bossPos.y + 2, run, { hpMul: 0.35 });
    }
  } else if (run.act === 'raid') {
    run.raidIds ||= shuffle(BOSS_IDS.slice()).slice(0, act.stages);
    spawnBoss(run.raidIds[run.stage - 1], map.bossPos.x, map.bossPos.y, run, { hpMul: 6 });
  } else if (run.act === 'boss') {
    spawnBoss(run.bossId, map.bossPos.x, map.bossPos.y, run, { hpMul: 1 });
    if (fxr.bosses) spawnBoss(pick(BOSS_IDS.filter((b) => b !== run.bossId)), map.bossPos.x + 4, map.bossPos.y, run, { hpMul: 0.5 });
  } else if (run.act === 'rift') run.need = Math.round(110 * (fxr.mobCount || 1));
  updateFlow(map, p.x, p.y);
  bus.emit('zone');
}

function ringSpawn(run, n, o = {}) {
  const z = G.zone, map = z.map, c = map.center, id = pick(run.mobPool);
  const a0 = rnd(0, 6.28), eliteRoll = Math.random() * 100, eRate = run.fx.elite || 1;
  const mode = eliteRoll < 4 * eRate ? 2 : eliteRoll < 16 * eRate ? 1 : 0;
  for (let i = 0; i < n; i++) {
    const a = a0 + rnd(-0.5, 0.5), d = rnd(map.rad * 0.55, map.rad - 1.5);
    let x = c.x + Math.cos(a) * d, y = c.y + Math.sin(a) * d;
    if (!walkable(map, x, y) || dist2(x, y, G.p.x, G.p.y) < 4) { x = c.x + Math.cos(a + 3.14) * d; y = c.y + Math.sin(a + 3.14) * d; if (!walkable(map, x, y)) continue; }
    const m = spawnMob(i % 3 === 2 ? pick(run.mobPool) : id, x, y, run, { elite: i === 0 && mode === 2 ? 2 : mode === 1 ? 1 : 0, add: o.add });
    m.aggro = true; fx('poof', x, y, { col: BIOMES[run.biome].accent });
  }
}
const aliveMobs = () => { let n = 0; for (const a of G.zone.actors) if (a.kind === 'mob' && !a.dead) n++; return n; };

function updateRun(dt) {
  const z = G.zone, run = z.run, p = G.p, map = z.map, fxr = run.fx;
  run.t += dt;
  if (run.group && groupTick(dt)) return;
  if (run.state === 'dead') { run.respawnT -= dt; if (run.respawnT <= 0) respawn(); return; }
  if (run.state === 'failed') { run.respawnT -= dt; if (run.respawnT <= 0) enterHub(); return; }
  if (fxr.degen && !p.dead) p.hp = Math.max(1, p.hp - p.s.maxLife * fxr.degen / 100 * dt);
  if (fxr.meteors && run.state === 'active') { run.metT -= dt; if (run.metT <= 0) { run.metT = rnd(0.9, 1.6); addArea({ x: p.x + rnd(-5, 5), y: p.y + rnd(-5, 5), rad: 2, delay: 1.2, src: run.env, vs: 0, mk: () => simpleHit(run.env, 1.5, 'fire', { ignite: 60 }), col: '#ff7a2a', meteor: 1 }); } }
  for (const o of z.objs) {
    const d = dist2(o.x, o.y, p.x, p.y);
    if (o.kind === 'trap') { if (((G.time + o.ph) % 3) > 2 && d < 0.75 && o.hitT < G.time && !p.dead) { o.hitT = G.time + 0.8; applyHit(run.env, p, simpleHit(run.env, 0.9, 'phys', { bleed: 50 })); } }
    else if (o.kind === 'chest' && !o.used && d < 1.3) openChest(o);
    else if (o.kind === 'shrine' && !o.used && d < 1.3) useShrine(o);
    else if (o.kind === 'stairs' && d < 1.1) { run.floor++; if (run.act === 'tower') G.ch.prog.towerBest = Math.max(G.ch.prog.towerBest, run.floor - 1); buildFloor(run); return; }
    else if (o.kind === 'portal') { if (d < 1.2) { o.dwell += dt; if (o.dwell > 0.7) { enterHub(); return; } } else o.dwell = 0; }
  }
  if (run.state !== 'active') return;
  if (run.act === 'tower' && !run.cleared) {
    const alive = aliveMobs();
    if (alive <= 1 && run.wave < run.waves) {
      run.wave++;
      if (run.floor % 5 === 0) { spawnBoss(pick(BOSS_IDS), map.bossPos.x, map.bossPos.y, run, { hpMul: 0.35 }); ringSpawn(run, 6); }
      else for (let g = 0; g < 2; g++) ringSpawn(run, Math.min(14, Math.round((4 + run.floor * 0.5) * (fxr.mobCount || 1))));
    } else if (alive === 0 && run.wave >= run.waves) {
      run.cleared = true; G.ch.prog.towerBest = Math.max(G.ch.prog.towerBest, run.floor);
      const c = map.center; z.objs.push({ kind: 'stairs', x: c.x, y: c.y });
      dropAt(c.x, c.y + 1, { kind: 'mat', mid: 'shard', n: 1 + Math.floor(run.floor / 5) });
      if (run.floor % 5 === 0) for (let i = 0; i < 4; i++) dropAt(c.x, c.y + 1, { kind: 'item', item: genItem(CURVE.ilvl(run.tier) + 2, { cls: G.ch.cls, mf: 150 + (p.s.mf || 0), minRar: i === 0 ? 3 : 2 }) });
      toast(`Этаж ${run.floor} зачищен. Лестница открыта.`); saveNow();
    }
  }
  if (run.act === 'rift') {
    run.spawnT -= dt;
    if (!run.lord) {
      if (run.kills >= run.need) { run.lord = true; const c = map.center; spawnBoss(pick(BOSS_IDS), c.x, c.y, run, { hpMul: 0.6 }); toast('Владыка разлома явился!', '#ff4d4d'); G.cam.shake = 12; }
      else if (run.spawnT <= 0 && aliveMobs() < Math.min(42, 12 + run.tier) * (fxr.mobCount || 1)) { run.spawnT = 0.55; ringSpawn(run, rint(5, 8)); }
    }
  }
  const act = ACTIVITIES[run.act];
  if (run.act === 'raid' && z.bosses.length === 0 && run.bossSeen && run.stage < act.stages) {
    run.nextT = (run.nextT ?? 8) - dt;
    if (run.nextT <= 0) {
      run.stage++; run.nextT = null; run.bossSeen = false;
      for (const h of [p, ...z.party]) { reviveHero(h, 1); h.hp = h.s.maxLife; h.mp = h.s.maxMana; }
      spawnBoss(run.raidIds[run.stage - 1], map.bossPos.x, map.bossPos.y, run, { hpMul: 6 }); toast(`Владыка ${run.stage} из ${act.stages} входит на арену`, '#ff4d4d'); G.cam.shake = 10;
    }
    return;
  }
  const needBoss = run.act !== 'tower' && (run.act !== 'rift' || run.lord) && (!act.floors || run.floor >= act.floors) && (!act.stages || run.stage >= act.stages);
  if (needBoss && z.bosses.length === 0 && run.bossSeen) completeRun();
}

function openChest(o) {
  const run = G.zone.run, p = G.p; o.used = true;
  const n = o.rich ? rint(4, 6) : rint(2, 3);
  for (let i = 0; i < n; i++) dropAt(o.x, o.y, { kind: 'item', item: genItem(CURVE.ilvl(run.tier), { cls: G.ch.cls, mf: (p.s.mf || 0) + run.rar + (o.rich ? 120 : 50), minRar: o.rich && i === 0 ? 2 : 0 }) });
  dropAt(o.x, o.y, { kind: 'gold', n: Math.round(CURVE.gold(run.tier) * rnd(8, 16) * (1 + (p.s.gf || 0) / 100)) });
  for (const id in ACTIVITIES[run.act].mats) if (chance(35 * ACTIVITIES[run.act].mats[id] * (o.rich ? 2 : 1))) dropAt(o.x, o.y, { kind: 'mat', mid: id, n: 1 });
  fx('ring', o.x, o.y, { rad: 1.5, col: '#ffd24a' });
}
const SHRINES = [
  ['Алтарь ярости', [['dmg_more', 40]]], ['Алтарь ветра', [['moveSpeed_inc', 35], ['atkSpeed_inc', 20], ['castSpeed_inc', 20]]], ['Алтарь камня', [['dr', 30], ['armor_more', 50]]],
  ['Алтарь удачи', [['mf', 120], ['gf', 100]]], ['Алтарь крови', [['lifeRegenPct', 4], ['leech', 2]]], ['Алтарь мудрости', [['xp_inc', 60], ['cdr', 30]]],
];
function useShrine(o) { o.used = true; const s = pick(SHRINES); addBuff(G.p, { id: 'shrine', name: s[0], t: 60, mods: s[1] }); toast(s[0] + ' (60 сек.)', '#36e0c8'); fx('ring', o.x, o.y, { rad: 3, col: '#36e0c8', dur: 0.8 }); }

function completeRun() {
  const z = G.zone, run = z.run, ch = G.ch, p = G.p, act = ACTIVITIES[run.act];
  run.state = 'done';
  if (run.group) partyReward(run, true);
  if (act.weekly) ch.prog.raidWeek = weekId();
  const cur = ch.prog.tier[run.act] || 1;
  if (run.tier >= cur && cur < 60) { ch.prog.tier[run.act] = cur + 1; toast(`${act.n}: открыт уровень ${cur + 1}`, '#36e0c8'); }
  const n = 2 + (run.act === 'chaos' ? 2 : 0) + (run.act === 'rift' && run.t < 150 ? 2 : 0);
  for (let i = 0; i < n; i++) dropAt(p.x, p.y, { kind: 'item', item: genItem(CURVE.ilvl(run.tier) + 1, { cls: G.ch.cls, mf: (p.s.mf || 0) + run.rar + 100, minRar: 2 }) });
  for (const id in act.mats) dropAt(p.x, p.y, { kind: 'mat', mid: id, n: 1 + (chance(40) ? 1 : 0) });
  if (run.act === 'rift' && run.t < 150) toast('Быстрая зачистка: бонусная добыча!', '#36e0c8');
  { const sp = safeSpot(z.map, p.x, p.y, 2); z.objs.push({ kind: 'portal', x: sp.x, y: sp.y, dwell: 0 }); fx('ring', sp.x, sp.y, { rad: 3, col: '#b06bff', dur: 0.8 }); }
  toast('Испытание пройдено! Портал домой открыт.', '#7be04a');
  saveNow(); bus.emit('zone');
}
function respawn() {
  const z = G.zone, run = z.run, p = G.p;
  p.dead = false; p.hp = p.s.maxLife; p.mp = p.s.maxMana; p.st = {}; p.iframe = 3; p.x = z.map.start.x; p.y = z.map.start.y; p.act = null; p.dash = null;
  run.state = run.stateBefore || 'active'; G.cam.x = p.x; G.cam.y = p.y;
}
bus.on('playerDeath', () => {
  const run = G.zone.run; if (!run) { G.p.dead = false; G.p.hp = G.p.s.maxLife; return; }
  if (run.group) { G.ch.prog.deaths++; toast('Вы пали. Лекарь поднимет вас, если группа выстоит.', '#ff5a5a'); return; }
  G.ch.prog.deaths++; run.deaths++;
  run.stateBefore = run.state === 'done' ? 'done' : 'active';
  if (run.deaths > run.maxDeaths && run.state !== 'done') { run.state = 'failed'; run.respawnT = 3; toast(run.act === 'tower' ? `Восхождение окончено на этаже ${run.floor}.` : 'Попытки исчерпаны. Портал закрылся.', '#ff5a5a'); }
  else { run.state = 'dead'; run.respawnT = 2; toast(`Вы погибли. Осталось попыток: ${run.maxDeaths - run.deaths + 1}`, '#ff5a5a'); }
  bus.emit('hud');
});
bus.on('bossEngaged', () => { if (G.zone.run) G.zone.run.bossSeen = true; });
bus.on('mobKilled', (m) => {
  const z = G.zone, run = z.run, p = G.p, ch = G.ch; if (!run) return;
  addXp(CURVE.mobXp(run.tier) * (m.xpM || 1) * (1 + (p.s.xp_inc || 0) / 100));
  rollDrops(m, run, p);
  ch.prog.kills++;
  if (!m.add || run.act === 'rift') run.kills++;
  if (m.boss) { run.bossSeen = true; if (!m.minor) ch.prog.bossKills[m.bid] = (ch.prog.bossKills[m.bid] || 0) + 1; G.cam.shake = 14; }
  p.flask.kills++; if (p.flask.kills >= 14 && p.flask.n < ch.flask.max) { p.flask.kills = 0; p.flask.n++; }
});

export function addXp(n) {
  const ch = G.ch; ch.xp += n;
  if (ch.level >= 100) { const need = 4e6; while (ch.xp >= need) { ch.xp -= need; ch.pgPts = (ch.pgPts || 0) + 1; toast('Очко парагона получено!', '#36e0c8'); } return; }
  let up = false;
  while (ch.level < 100 && ch.xp >= CURVE.xpNeed(ch.level)) { ch.xp -= CURVE.xpNeed(ch.level); ch.level++; ch.pp++; ch.attrPts += 5; up = true; }
  if (up) { toast(`Уровень ${ch.level}! +1 талант, +5 характеристик`, '#7be04a'); refreshStats(); G.p.hp = G.p.s.maxLife; G.p.mp = G.p.s.maxMana; fx('ring', G.p.x, G.p.y, { rad: 4, col: '#ffd24a', dur: 0.9 }); saveNow(); bus.emit('hud'); }
}

// ------------------------------------------------------------------ group content: wipes, resurrection, town life
function groupTick(dt) {
  const z = G.zone, run = z.run, p = G.p, all = [p, ...z.party];
  if (run.wipeT != null) { run.wipeT -= dt; if (run.wipeT <= 0) doWipe(); return true; }
  if (all.every((h) => h.dead)) { run.wipeT = 3; toast('Группа пала…', '#ff5a5a'); return true; }
  if (all.some((h) => h.dead)) {
    const fight = z.bosses.some((b) => !b.dead && b.engaged) || z.actors.some((m) => m.kind === 'mob' && !m.dead && m.aggro && all.some((h) => !h.dead && dist2(m.x, m.y, h.x, h.y) < 14));
    run.rezT = fight ? 0 : (run.rezT || 0) + dt;
    if (run.rezT > 6) { run.rezT = 0; const l = all.find((x) => !x.dead); for (const h of all) if (h.dead) { h.x = l.x; h.y = l.y; reviveHero(h, 0.6); } }
  }
  return false;
}
function doWipe() {
  const z = G.zone, run = z.run, p = G.p, map = z.map;
  run.wipeT = null; G.party.wipes++; z.areas = []; z.projs = [];
  for (const m of z.actors) {
    if (m.kind === 'minion') m.dead = true;
    if (m.kind !== 'mob') continue;
    if (m.add && m.owner) { m.dead = true; continue; }
    m.hp = m.s.maxLife; m.threat = null; m.st = {}; m.x = m.home.x; m.y = m.home.y;
    if (m.boss) Object.assign(m, { ph: 0, pi: 0, cur: null, engaged: false, enraged: undefined, spdMul: 1, dmgMul: 1, wait: 1.5, gT: undefined, dashTo: null }); else m.aggro = false;
  }
  const stay = [];
  for (const a of z.party) { if (G.party.wipes > a.bot.pers.patience) { botSay(a.bot, 'leave', {}, 'party'); a.dead = true; a.gone = true; G.party.ids = G.party.ids.filter((id) => id !== a.bot.id); } else stay.push(a); }
  z.party = stay; z.actors = z.actors.filter((a) => !a.gone);
  [p, ...z.party].forEach((h, i) => { h.x = map.start.x + Math.cos(i * 1.3) * 1.3; h.y = map.start.y + Math.sin(i * 1.3) * 1.3; reviveHero(h, 1); h.hp = h.s.maxLife; h.mp = h.s.maxMana; });
  if (z.party.length) botSay(pick(z.party).bot, 'wipe', {}, 'party');
  G.cam.x = p.x; G.cam.y = p.y; toast(`Вайп №${G.party.wipes}. Группа собирается у входа.`, '#ff9a5a'); bus.emit('party');
}
bus.on('revive', (h) => reviveHero(h, 0.5));
function wander(a, dt) {
  const w = a.wander, map = G.zone.map;
  if (w.wait > 0) { w.wait -= dt; return; }
  const d = dist2(a.x, a.y, w.tx, w.ty);
  if (d < 0.6 || w.stuck > 1.2) { w.wait = rnd(2, 10); const n = pick(map.npcs); w.tx = n.x + rnd(-2.5, 2.5); w.ty = n.y + rnd(0.8, 3); w.stuck = 0; return; }
  const ox = a.x, oy = a.y; moveActor(a, ((w.tx - a.x) / d) * 2.6 * dt, ((w.ty - a.y) / d) * 2.6 * dt, map);
  if (dist2(ox, oy, a.x, a.y) < 1.2 * dt) w.stuck += dt;
}

// ------------------------------------------------------------------ drops
function collect(d) {
  const ch = G.ch;
  if (d.kind === 'gold') { ch.gold += d.n; text(G.p.x, G.p.y - 0.4, '+' + d.n, '#ffd24a', 12); }
  else if (d.kind === 'mat') { ch.mats[d.mid] = (ch.mats[d.mid] || 0) + d.n; text(G.p.x, G.p.y - 0.4, '+' + d.n + ' ' + MATS[d.mid].n, '#9fe', 12); }
  else if (d.kind === 'support') { if (!G.save.supports.includes(d.sid)) { G.save.supports.push(d.sid); toast('Изучена руна навыка: ' + SUPPORTS[d.sid].n, '#36e0c8'); } }
  else if (d.kind === 'item') {
    if (addToBag(ch, d.item) < 0) { if ((G.p.warnT || 0) < G.time) { G.p.warnT = G.time + 1.5; text(G.p.x, G.p.y - 1, 'Сумка полна', '#f88', 13); } return false; }
    if (d.item.rar >= 4) { G.save.lootLog.unshift({ n: d.item.name, r: d.item.rar, t: Date.now(), tier: G.zone.run ? G.zone.run.tier : 0 }); G.save.lootLog.length = Math.min(G.save.lootLog.length, 60); toast('Найдено: ' + d.item.name, RAR[d.item.rar].c); }
    bus.emit('bag');
  }
  d.gone = true; return true;
}
function updateDrops(dt) {
  const z = G.zone, p = G.p, pickRar = G.save.settings.pickRar;
  for (const d of z.drops) {
    d.t += dt; if (d.t < 0.4 || p.dead) continue;
    const dd = dist2(d.tx, d.ty, p.x, p.y);
    if (d.kind !== 'item') { if (dd < 3.4) { const a = Math.atan2(p.y - d.ty, p.x - d.tx), s = 14 * dt; d.tx += Math.cos(a) * s; d.ty += Math.sin(a) * s; d.x = d.tx; d.y = d.ty; } if (dd < 0.7) collect(d); }
    else if (dd < 1.1 && d.item.rar >= pickRar && !d.noAuto) { if (!collect(d)) d.noAuto = G.time + 2; }
    if (d.noAuto && d.noAuto < G.time) d.noAuto = 0;
  }
  if (z.drops.some((d) => d.gone)) z.drops = z.drops.filter((d) => !d.gone);
  if (z.drops.length > 400) z.drops.splice(0, z.drops.length - 400);
}
function clickLabel() {
  const m = G.mouse;
  for (const l of R.labels) if (m.x >= l.x && m.x <= l.x + l.w && m.y >= l.y && m.y <= l.y + l.h) {
    const d = G.zone.drops.find((x) => x.id === l.id); if (!d) return true;
    if (dist2(d.tx, d.ty, G.p.x, G.p.y) < 8) collect(d); else text(G.p.x, G.p.y - 1, 'Слишком далеко', '#f88', 12);
    return true;
  }
  return false;
}

// ------------------------------------------------------------------ player
export function useFlask() {
  const p = G.p, run = G.zone.run;
  if (!p || p.dead || p.flask.n <= 0 || p.hp >= p.s.maxLife) return;
  if (run && run.fx.noFlask) { text(p.x, p.y - 1, 'Зелья не действуют', '#f88', 12); return; }
  p.flask.n--; heal(p, p.s.maxLife * G.ch.flask.pow / 100); p.mp = Math.min(p.s.maxMana, p.mp + p.s.maxMana * 0.3);
  fx('ring', p.x, p.y, { rad: 1.4, col: '#f44', dur: 0.4 });
}
function updatePlayer(dt) {
  const p = G.p, z = G.zone, map = z.map, k = G.keys;
  if (!heroTick(p, dt)) return;
  const s = p.s;
  p.aim.x = G.mouse.wx; p.aim.y = G.mouse.wy;
  if (heroDash(p, dt)) return;
  let dx = 0, dy = 0;
  if (k.KeyW || k.ArrowUp) { dx -= 1; dy -= 1; } if (k.KeyS || k.ArrowDown) { dx += 1; dy += 1; }
  if (k.KeyA || k.ArrowLeft) { dx -= 1; dy += 1; } if (k.KeyD || k.ArrowRight) { dx += 1; dy -= 1; }
  const frozen = p.st.freeze || p.st.stun;
  if ((dx || dy) && !frozen) {
    const l = Math.hypot(dx, dy), sp = s.moveSpeed * slowMult(p) * (p.act && !p.act.fired ? 0.35 : 1);
    moveActor(p, (dx / l) * sp * dt, (dy / l) * sp * dt, map);
    if (!p.act) p.face = dx - dy >= 0 ? 1 : -1;
    p.stepT = (p.stepT || 0) - dt; if (p.stepT <= 0) { p.stepT = 0.16; fx('dust', p.x, p.y, { dur: 0.45 }); }
  }
  if (p.mv > 0) p.mv -= dt;
  if (k.Space && !frozen && p.rollCd <= G.time) {
    p.rollCd = G.time + 1.3;
    let a = dx || dy ? Math.atan2(dy, dx) : Math.atan2(G.mouse.wy - p.y, G.mouse.wx - p.x), ex = p.x, ey = p.y;
    for (let i = 1; i <= 17; i++) { const nx = p.x + Math.cos(a) * i * 0.25, ny = p.y + Math.sin(a) * i * 0.25; if (!walkable(map, nx, ny)) break; ex = nx; ey = ny; }
    p.dash = { x0: p.x, y0: p.y, x: ex, y: ey, t: 0, dur: 0.2 }; p.iframe = Math.max(p.iframe, 0.4); p.act = null;
    fx('poof', p.x, p.y, { col: '#aaa', dur: 0.25 });
  }
  if (!z.hub && !frozen && !G.uiHover) {
    const want = G.mouse.l ? 0 : G.mouse.r ? 1 : k.KeyQ ? 2 : k.KeyE ? 3 : k.KeyR ? 4 : k.KeyF ? 5 : -1;
    if (want >= 0 && !(want === 0 && G.mouse.lConsumed)) useSkill(p, want);
  }
  updateCasting(p, dt);
  if (z.hub) {
    let best = null, bd = 2.6;
    for (const a of z.actors) { if (a.kind !== 'npc') continue; a.near = false; const d = dist2(a.x, a.y, p.x, p.y); if (a.fn && d < bd) { bd = d; best = a; } }
    if (best) best.near = true; z.nearNpc = best;
    for (const o of z.objs) if (o.kind === 'portal') { if (dist2(o.x, o.y, p.x, p.y) < 1.2) { o.dwell += dt; if (o.dwell > 0.5) { startRun(o.cfg); return; } } else o.dwell = 0; }
  }
}

// ------------------------------------------------------------------ loop
let flowT = 0, seenT = 0, last = 0, saveT = 0;
function update(dt) {
  const z = G.zone, p = G.p; if (!z || !p) return;
  G.time += dt; G.cam.shake *= 0.86;
  [G.mouse.wx, G.mouse.wy] = s2w(G.mouse.x, G.mouse.y);
  R.hover = null; for (const l of R.labels) if (G.mouse.x >= l.x && G.mouse.x <= l.x + l.w && G.mouse.y >= l.y && G.mouse.y <= l.y + l.h) { R.hover = l.id; break; }
  z.heroes = z.party.length ? [p, ...z.party] : [p];
  updatePlayer(dt);
  if (G.zone !== z) return;
  if (z.run) { flowT -= dt; if (flowT <= 0) { flowT = 0.3; updateFlow(z.map, p.x, p.y); } }
  for (const a of z.actors) {
    if (a.dead || a === p) continue;
    if (a.flash > 0) a.flash -= dt; if (a.lunge > 0) a.lunge -= dt;
    if (a.kind === 'npc') { if (a.wander) wander(a, dt); if (a.mv > 0) a.mv -= dt; continue; }
    if (a.kind === 'ally') { updateAlly(a, dt); continue; }
    tickStatuses(a, dt); if (a.dead) continue;
    if (a.kind === 'minion') updateMinion(a, dt); else if (a.boss) updateBoss(a, dt); else updateMob(a, dt);
  }
  if (p.flash > 0) p.flash -= dt;
  separate(z.actors);
  updateProjs(dt); updateAreas(dt);
  for (const f of z.fx) f.t += dt; if (z.fx.length) z.fx = z.fx.filter((f) => f.t < f.dur);
  for (const t of z.texts) t.t += dt; if (z.texts.length) z.texts = z.texts.filter((t) => t.t < 0.9);
  updateDrops(dt);
  if (z.run) { updateRun(dt); if (G.zone !== z) return; }
  if (z.actors.some((a) => a.dead && a !== p)) { z.actors = z.actors.filter((a) => !a.dead || a === p); z.minions = z.minions.filter((a) => !a.dead); z.bosses = z.bosses.filter((a) => !a.dead); }
  { const mwx = Number.isFinite(G.mouse.wx) ? G.mouse.wx : p.x, mwy = Number.isFinite(G.mouse.wy) ? G.mouse.wy : p.y, lx = clamp((mwx - p.x) * 0.1, -1.4, 1.4), ly = clamp((mwy - p.y) * 0.1, -1.4, 1.4), k = Math.min(1, dt * 7); G.cam.x += (p.x + (z.hub || p.dead ? 0 : lx) - G.cam.x) * k; G.cam.y += (p.y + (z.hub || p.dead ? 0 : ly) - G.cam.y) * k; if (!Number.isFinite(G.cam.x + G.cam.y)) { G.cam.x = p.x; G.cam.y = p.y; } }
  seenT -= dt;
  if (seenT <= 0 && !z.hub) { seenT = 0.2; const m = z.map, px = Math.floor(p.x), py = Math.floor(p.y); for (let j = -12; j <= 12; j++) for (let i = -12; i <= 12; i++) { const x = px + i, y = py + j; if (x >= 0 && y >= 0 && x < m.w && y < m.h && i * i + j * j < 150) m.seen[y * m.w + x] = 1; } }
  const w = G.dps.win; while (w.length && w[0][0] < G.time - 4) w.shift();
  G.ch.prog.played += dt; saveT += dt; if (saveT > 45) { saveT = 0; saveNow(); }
}
function frame(ts) {
  const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
  if (G.ch && G.zone) { if (!G.paused) update(dt); render(dt); bus.emit('frame', dt); }
  requestAnimationFrame(frame);
}

export function initGame(canvas) {
  initRender(canvas);
  window.addEventListener('keydown', (e) => {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.code === 'Tab' || e.code === 'Space') e.preventDefault();
    if (e.repeat) return;
    G.keys[e.code] = true; bus.emit('key', e.code);
  });
  window.addEventListener('keyup', (e) => { G.keys[e.code] = false; });
  window.addEventListener('blur', () => { G.keys = {}; G.mouse.l = G.mouse.r = false; });
  canvas.addEventListener('mousemove', (e) => { G.mouse.x = e.clientX; G.mouse.y = e.clientY; });
  canvas.addEventListener('mousedown', (e) => {
    G.mouse.x = e.clientX; G.mouse.y = e.clientY;
    if (!G.zone || G.paused) return;
    if (e.button === 0) {
      G.mouse.lConsumed = clickLabel();
      if (!G.mouse.lConsumed && G.zone.hub) { const [wx, wy] = s2w(e.clientX, e.clientY); const b = G.zone.actors.find((a) => a.bot && a.kind === 'npc' && dist2(wx, wy, a.x - 0.6, a.y - 0.6) < 1); if (b) { bus.emit('inspect', b.bot.id); G.mouse.lConsumed = true; } }
      if (!G.mouse.lConsumed && G.zone.hub && G.zone.nearNpc) { const [wx, wy] = s2w(e.clientX, e.clientY); if (dist2(wx, wy, G.zone.nearNpc.x, G.zone.nearNpc.y - 0.5) < 1.6) bus.emit('npc', G.zone.nearNpc.fn); }
      G.mouse.l = true;
    } else if (e.button === 2) G.mouse.r = true;
  });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) { G.mouse.l = false; G.mouse.lConsumed = false; } else if (e.button === 2) G.mouse.r = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('wheel', (e) => { const st = G.save.settings; st.zoom = clamp(st.zoom * (e.deltaY < 0 ? 1.08 : 0.93), 0.7, 1.5); }, { passive: true });
  requestAnimationFrame(frame);
}
export function leaveRun() { if (G.zone && G.zone.run) { G.pendingPortal = null; enterHub(); } }
// Deterministic stepping for automated tests (window.__game.step).
export function step(dt = 1 / 30, n = 1) { for (let i = 0; i < n; i++) if (G.zone && G.p) update(dt); }
