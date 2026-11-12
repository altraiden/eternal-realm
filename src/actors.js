// Actors: creation, monster AI, elite abilities, boss script engine, minions.
import { G } from './state.js';
import { MONSTERS, ELITE_MODS, ELITE_IDS } from './data/monsters.js';
import { BOSSES } from './data/bosses.js';
import { MINIONS } from './data/skills.js';
import { CURVE, diffOf } from './data/activities.js';
import { DTC } from './data/defs.js';
import { applyHit, simpleHit, addArea, addProj, hitCircle, slowMult, fx, text, kill, nearest, heal } from './combat.js';
import { walkable } from './world.js';
import { rnd, pick, dist2, clamp, bus, shuffle } from './util.js';

let _id = 1;
export const mkActor = (o) => ({ id: _id++, x: 0, y: 0, r: 0.38, hp: 1, mp: 0, s: { maxLife: 1 }, st: {}, team: 1, kind: 'mob', face: 1, flash: 0, inv: 0, sv: 0, sc: 3, bob: Math.random() * 6, mv: 0, ...o });

export function los(map, x0, y0, x1, y1) {
  const d = dist2(x0, y0, x1, y1), n = Math.ceil(d * 2);
  for (let i = 1; i < n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; if (map.solid[Math.floor(y) * map.w + Math.floor(x)] === 1) return false; }
  return true;
}
export function moveActor(a, dx, dy, map) {
  const fly = a.fly, r = a.r * 0.7;
  if (dx && walkable(map, a.x + dx + Math.sign(dx) * r, a.y, fly)) a.x += dx;
  if (dy && walkable(map, a.x, a.y + dy + Math.sign(dy) * r, fly)) a.y += dy;
  if (dx) a.face = dx - dy >= 0 ? 1 : -1;
  a.mv = 0.15;
}
function freeSpot(map, x, y, rad = 1.5) {
  for (let i = 0; i < 12; i++) { const nx = x + rnd(-rad, rad), ny = y + rnd(-rad, rad); if (walkable(map, nx, ny)) return [nx, ny]; }
  return [x, y];
}

// ---------------------------------------------------------------- monsters
export function spawnMob(id, x, y, run, o = {}) {
  const def = MONSTERS[id], t = run.tier, fxr = run.fx, z = G.zone;
  let hp = CURVE.mobHp(t) * def.hp * (fxr.mobHp || 1), dmg = CURVE.mobDmg(t) * def.dmg * (fxr.mobDmg || 1), spd = def.spd, sc = def.sc || 3;
  const m = mkActor({ kind: 'mob', team: 1, x, y, def, mid: id, name: def.n, spr: def.spr, dt: def.dt, ai: def.ai, range: def.range || 7, fly: def.fly, leech: def.leech, pack: o.pack, home: { x, y }, atkT: rnd(0.3, 1.2), cdA: rnd(1, 3), cdE: rnd(2, 5), pow: CURVE.mobDmg(t) / 62, xpM: 1, tp: def.tp, regen: def.regen, noSplit: o.noSplit, mods: [] });
  const elite = o.elite || 0, diff = diffOf(t);
  let nMods = elite === 2 ? 2 + (diff >= 1 ? 1 : 0) : elite === 1 ? 1 + (diff >= 1 ? 1 : 0) : (fxr.allElite || diff >= 5) && !o.add ? 1 : 0;
  if (elite === 1) { hp *= 2.4; dmg *= 1.15; sc *= 1.12; m.xpM = 3; }
  if (elite === 2) { hp *= 6.5; dmg *= 1.3; sc *= 1.3; m.xpM = 10; }
  m.elite = elite;
  for (const mid of shuffle(ELITE_IDS.slice()).slice(0, nMods)) {
    const E = ELITE_MODS[mid]; m.mods.push(mid);
    if (E.hp) hp *= E.hp; if (E.dmg) dmg *= E.dmg; if (E.spd) spd *= E.spd; if (E.sc) sc *= E.sc;
    for (const k of ['deathNova', 'leech', 'mortar', 'tp', 'shield', 'trail', 'storm', 'spawn']) if (E[k]) m[k] = E[k];
    if (E.onhit) m.onhit = { [E.onhit]: 40 };
  }
  if (diff >= 2 && !m.onhit) { const a = { fire: 'ignite', cold: 'chill', light: 'shock', poison: 'poison', phys: 'bleed' }[def.dt]; if (a) m.onhit = { [a]: 20 }; }
  if (o.add) { hp *= 0.6; m.xpM = 0.3; m.add = true; }
  if (o.small) { hp *= 0.4; dmg *= 0.7; sc *= 0.7; m.xpM = 0.4; }
  m.s = { maxLife: hp, armorF: (def.armor || 0) * 300 * Math.pow(1.12, t - 1), evasionF: 0, blockF: 0 };
  for (const k in def.res || {}) m.s['res_' + k] = def.res[k];
  m.hp = hp; m.dmg = dmg; m.spd = spd * (fxr.mobSpd || 1); m.sc = sc; m.r = 0.3 + sc * 0.035; m.sv = Math.floor(rnd(0, 4));
  if (elite) m.name = m.mods.map((x) => ELITE_MODS[x].n).slice(0, 2).join(' ') + ' ' + def.n.toLowerCase();
  z.actors.push(m);
  return m;
}

export function spawnPack(pos, run, o = {}) {
  const z = G.zone, pool = o.pool || run.mobPool, id = pick(pool), def = MONSTERS[id];
  const packId = _id++;
  const heavy = def.hp >= 2;
  let n = Math.round((heavy ? rnd(2, 3) : def.hp < 0.6 ? rnd(7, 10) : rnd(4, 7)) * (pos.big ? 1.5 : 1));
  const eliteRoll = Math.random() * 100, eRate = (run.fx.elite || 1) * (diffOf(run.tier) >= 4 ? 1.4 : 1);
  let mode = o.rare || pos.rare ? 2 : eliteRoll < 5 * eRate ? 2 : eliteRoll < 20 * eRate ? 1 : 0;
  const out = [];
  if (mode === 2) {
    const [x, y] = freeSpot(z.map, pos.x, pos.y, 1); out.push(spawnMob(id, x, y, run, { elite: 2, pack: packId }));
    n = Math.max(2, Math.round(n * 0.6));
  }
  const second = Math.random() < 0.35 ? pick(pool) : id;
  for (let i = 0; i < n; i++) {
    const [x, y] = freeSpot(z.map, pos.x, pos.y, 2.2);
    out.push(spawnMob(i % 3 === 2 ? second : id, x, y, run, { elite: mode === 1 ? 1 : 0, pack: packId }));
  }
  return out;
}

function aggroPack(m) { for (const a of G.zone.actors) if (a.kind === 'mob' && !a.dead && (a.pack === m.pack && m.pack || dist2(a.x, a.y, m.x, m.y) < 4)) a.aggro = true; }

function approach(m, tg, speed, dt, map, isPlayer) {
  const d = dist2(m.x, m.y, tg.x, tg.y);
  let dx = (tg.x - m.x) / (d || 1), dy = (tg.y - m.y) / (d || 1);
  if (isPlayer && !m.fly && !los(map, m.x, m.y, tg.x, tg.y)) {
    const tx = Math.floor(m.x), ty = Math.floor(m.y), cur = map.flow[ty * map.w + tx]; let best = cur, bx = 0, by = 0;
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const nx = tx + ox, ny = ty + oy; if (nx < 0 || ny < 0 || nx >= map.w || ny >= map.h) continue;
      const f = map.flow[ny * map.w + nx];
      if (f < best && (ox === 0 || oy === 0 || (map.flow[ty * map.w + nx] < 32767 && map.flow[ny * map.w + tx] < 32767))) { best = f; bx = ox; by = oy; }
    }
    if (best < cur) { const cx = tx + bx + 0.5 - m.x, cy = ty + by + 0.5 - m.y, l = Math.hypot(cx, cy) || 1; dx = cx / l; dy = cy / l; }
  }
  moveActor(m, dx * speed * dt, dy * speed * dt, map);
}

function mobShoot(m, tg, mult = 1, spd = 8.5, spreadN = 1, spreadA = 0.25) {
  const a = Math.atan2(tg.y - m.y, tg.x - m.x);
  for (let i = 0; i < spreadN; i++) {
    const an = a + (spreadN > 1 ? (-spreadA + (2 * spreadA * i) / (spreadN - 1)) : 0);
    addProj({ x: m.x, y: m.y, vx: Math.cos(an) * spd, vy: Math.sin(an) * spd, r: 0.28, life: 2.2, src: m, vs: 0, mk: () => simpleHit(m, mult), col: DTC[m.dt] || '#f66', hostile: 1 });
  }
}

export function updateMob(m, dt) {
  const z = G.zone, map = z.map, p = G.p, run = z.run;
  if (m.inv > 0) m.inv -= dt;
  if (m.regen) heal(m, m.s.maxLife * m.regen / 100 * dt);
  if (m.st.freeze || m.st.stun) return;
  if (m.dashTo) { const d = m.dashTo; d.t += dt; const k = Math.min(1, d.t / 0.18); m.x = d.x0 + (d.x - d.x0) * k; m.y = d.y0 + (d.y - d.y0) * k; if (k >= 1) m.dashTo = null; return; }
  let tg = p && !p.dead ? p : null, td = tg ? dist2(m.x, m.y, tg.x, tg.y) : 99, isP = true;
  for (const mn of z.minions) { if (mn.dead) continue; const d = dist2(m.x, m.y, mn.x, mn.y) - (mn.taunt ? 3 : 0); if (d < td && d < 8) { tg = mn; td = Math.max(0.1, dist2(m.x, m.y, mn.x, mn.y)); isP = false; } }
  if (!m.aggro) {
    if (tg && td < 10.5 && (td < 5 || los(map, m.x, m.y, tg.x, tg.y))) aggroPack(m);
    return;
  }
  if (!tg) return;
  const sm = slowMult(m), speed = m.spd * sm, reach = m.r + tg.r + 0.55;
  m.atkT -= dt * sm; m.cdA -= dt; m.cdE -= dt;
  if (m.wait > 0) { m.wait -= dt; return; }
  // elite abilities
  if (m.cdE <= 0 && m.mods.length) {
    m.cdE = rnd(4, 6.5);
    if (m.mortar) for (let i = 0; i < 3; i++) addArea({ x: tg.x + rnd(-2, 2), y: tg.y + rnd(-2, 2), rad: 1.8, delay: 1 + i * 0.2, src: m, vs: 0, mk: () => simpleHit(m, 1.3, 'fire'), col: DTC.fire, meteor: 1 });
    if (m.tp && td > 4 && td < 14) { fx('poof', m.x, m.y, { col: '#b06bff' }); const a = rnd(0, 6.28); if (walkable(map, tg.x + Math.cos(a) * 1.8, tg.y + Math.sin(a) * 1.8)) { m.x = tg.x + Math.cos(a) * 1.8; m.y = tg.y + Math.sin(a) * 1.8; } fx('poof', m.x, m.y, { col: '#b06bff' }); m.atkT = 0.5; }
    if (m.shield) { m.inv = 2; fx('ring', m.x, m.y, { rad: 1.2, col: '#fff', dur: 0.5 }); }
    if (m.storm) for (let i = 0; i < 4; i++) addArea({ x: tg.x + rnd(-4, 4), y: tg.y + rnd(-4, 4), rad: 1.4, delay: 0.8 + i * 0.15, src: m, vs: 0, mk: () => simpleHit(m, 1.2, 'light', { shock: 50 }), col: DTC.light });
    if (m.spawn && z.actors.length < 220) for (let i = 0; i < 2; i++) { const [x, y] = freeSpot(map, m.x, m.y, 1.5); const a = spawnMob(m.mid, x, y, run, { add: 1, small: 1, noSplit: 1 }); a.aggro = true; }
  }
  if (m.trail && m.mv > 0 && m.cdA < 0.01 && Math.random() < 0.1) addArea({ x: m.x, y: m.y, rad: 1.1, delay: 0, src: m, vs: 0, zone: { dur: 4, every: 0.5 }, zmk: () => simpleHit(m, 0.25, 'poison'), col: DTC.poison, keep: 1 });
  if (m.mv > 0) m.mv -= dt;
  const see = td < 14 && (m.fly || los(map, m.x, m.y, tg.x, tg.y));
  switch (m.ai) {
    case 'melee':
      if (m.wind > 0) {
        m.wind -= dt;
        if (m.wind <= 0) {
          if (m.def.aoe || (m.kind === 'mob' && m.elite === 2)) { fx('ring', m.x, m.y, { rad: reach + 0.8, col: '#f55', dur: 0.2 }); hitCircle(m, m.x, m.y, reach + 0.8, () => simpleHit(m, 1), 0); }
          else if (dist2(m.x, m.y, tg.x, tg.y) < reach + 0.7) applyHit(m, tg, simpleHit(m, 1));
          m.atkT = m.def.atk || 1.15; m.lunge = 0.15;
        }
      } else if (td < reach) { if (m.atkT <= 0) m.wind = 0.32; }
      else approach(m, tg, speed, dt, map, isP);
      break;
    case 'ranged':
      if (m.burstN > 0) { m.burstT -= dt; if (m.burstT <= 0) { mobShoot(m, tg); m.burstN--; m.burstT = 0.16; } break; }
      if (see && td < m.range) {
        if (m.atkT <= 0) { m.atkT = 1.9; if (m.def.burst) { m.burstN = m.def.burst; m.burstT = 0; } else mobShoot(m, tg); }
        if (td < 3.2) { const a = Math.atan2(m.y - tg.y, m.x - tg.x); moveActor(m, Math.cos(a) * speed * 0.7 * dt, Math.sin(a) * speed * 0.7 * dt, map); }
      } else approach(m, tg, speed, dt, map, isP);
      break;
    case 'charger':
      if (td < reach) { if (m.atkT <= 0) { applyHit(m, tg, simpleHit(m, 1)); m.atkT = 1.1; m.lunge = 0.15; } }
      else if (see && td < 8 && td > 3 && m.cdA <= 0) {
        m.cdA = rnd(3.5, 5); m.wait = 0.75;
        const ang = Math.atan2(tg.y - m.y, tg.x - m.x), len = Math.min(9, td + 2.5);
        addArea({ shape: 'line', x: m.x, y: m.y, ang, len, w: 1.3, rad: len, delay: 0.6, src: m, vs: 0, mk: () => simpleHit(m, 1.5), col: '#ff5a5a', onTrigger: () => { if (m.dead) return; let ex = m.x, ey = m.y; for (let i = 1; i <= len * 4; i++) { const nx = m.x + Math.cos(ang) * i / 4, ny = m.y + Math.sin(ang) * i / 4; if (!walkable(map, nx, ny, m.fly)) break; ex = nx; ey = ny; } m.dashTo = { x0: m.x, y0: m.y, x: ex, y: ey, t: 0 }; } });
      } else approach(m, tg, speed, dt, map, isP);
      break;
    case 'caster':
      if (see && td < m.range) {
        if (m.atkT <= 0) { m.atkT = 2.7; m.wait = 0.4; addArea({ x: tg.x, y: tg.y, rad: 2, delay: 0.95, src: m, vs: 0, mk: () => simpleHit(m, 1.5), col: DTC[m.dt] }); }
        if (td < 4) { const a = Math.atan2(m.y - tg.y, m.x - tg.x); moveActor(m, Math.cos(a) * speed * 0.6 * dt, Math.sin(a) * speed * 0.6 * dt, map); }
      } else approach(m, tg, speed, dt, map, isP);
      break;
    case 'exploder':
      if (m.fuse > 0) { m.fuse -= dt; m.flash = 0.05; if (m.fuse <= 0) { fx('ring', m.x, m.y, { rad: 2.6, col: DTC[m.dt] }); hitCircle(m, m.x, m.y, 2.6, () => simpleHit(m, 2.2), 0); kill(m, null); } }
      else if (td < 1.6) m.fuse = 0.75;
      else approach(m, tg, speed * 1.15, dt, map, isP);
      break;
    case 'summoner':
      if (m.cdA <= 0 && see) {
        m.cdA = 5.5; let mine = 0; for (const a of z.actors) if (a.owner === m && !a.dead) mine++;
        if (mine < 5 && z.actors.length < 220) { fx('ring', m.x, m.y, { rad: 1.5, col: '#b06bff', dur: 0.5 }); for (let i = 0; i < 2; i++) { const [x, y] = freeSpot(map, m.x, m.y, 2); const a = spawnMob(m.def.adds, x, y, run, { add: 1, noSplit: 1 }); a.owner = m; a.aggro = true; } }
      }
      if (see && td < 9) { if (m.atkT <= 0) { m.atkT = 2.4; mobShoot(m, tg, 0.8); } if (td < 5) { const a = Math.atan2(m.y - tg.y, m.x - tg.x); moveActor(m, Math.cos(a) * speed * 0.7 * dt, Math.sin(a) * speed * 0.7 * dt, map); } }
      else approach(m, tg, speed, dt, map, isP);
      break;
  }
}

// death side-effects
bus.on('mobKilled', (m) => {
  const z = G.zone; if (!z || !z.run) return;
  const run = z.run;
  if (m.deathNova) addArea({ x: m.x, y: m.y, rad: 2.6, delay: 0.9, src: m, vs: 0, mk: () => simpleHit(m, 1.6, m.deathNova, m.deathNova === 'cold' ? { chill: 100 } : { ignite: 100 }), col: DTC[m.deathNova], keep: 1 });
  else if (run.fx.volatile && !m.add) addArea({ x: m.x, y: m.y, rad: 1.8, delay: 1, src: m, vs: 0, mk: () => simpleHit(m, 1.1, 'fire'), col: DTC.fire, keep: 1 });
  if (m.def && m.def.split && !m.noSplit && !m.boss) for (let i = 0; i < 2; i++) { const [x, y] = freeSpot(z.map, m.x, m.y, 1); const a = spawnMob(m.mid, x, y, run, { small: 1, noSplit: 1, add: 1 }); a.aggro = true; }
});

// ---------------------------------------------------------------- bosses
export function spawnBoss(id, x, y, run, o = {}) {
  const def = BOSSES[id], t = run.tier, fxr = run.fx;
  const hp = CURVE.mobHp(t) * def.hp * (fxr.mobHp || 1) * (o.hpMul || 1), dmg = CURVE.mobDmg(t) * def.dmg * (fxr.mobDmg || 1) * (o.dmgMul || 1);
  const b = mkActor({ kind: 'mob', team: 1, boss: true, bid: id, x, y, def, name: def.n + (o.awakened ? ' (пробуждённый)' : ''), title: def.title, spr: def.spr, dt: def.dt, sc: def.sc * (o.awakened ? 1.15 : 1), r: 0.95, spd: def.spd * (fxr.mobSpd || 1), dmg, hp, pow: CURVE.mobDmg(t) / 62, ph: 0, pi: 0, cur: null, wait: 1.2, spdMul: 1, dmgMul: 1, rate: diffOf(t) >= 3 ? 1.3 : 1, xpM: 60, aggro: true, mods: [], awakened: o.awakened, minor: o.minor, home: { x, y } });
  b.s = { maxLife: hp, armorF: 500 * Math.pow(1.12, t - 1), evasionF: 0, blockF: 0 };
  for (const k in def.res || {}) b.s['res_' + k] = def.res[k];
  G.zone.actors.push(b); G.zone.bosses.push(b);
  return b;
}
const bossHit = (b, m, a) => () => simpleHit({ ...b, dmg: b.dmg * b.dmgMul }, m, null, a && (a.chill ? { chill: 100 } : a.poison ? { poison: 100 } : a.bleed ? { bleed: 100 } : null));
function bossProj(b, ang, spd, m, a) {
  addProj({ x: b.x + Math.cos(ang) * 0.8, y: b.y + Math.sin(ang) * 0.8, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, r: 0.32, life: 4, src: b, vs: 0, mk: bossHit(b, m, a), col: DTC[b.dt], hostile: 1 });
}
function arenaPoint(b, kind, p) {
  const map = G.zone.map, c = map.center || b.home;
  if (kind === 'center') return [c.x, c.y];
  if (kind === 'player') { const a = rnd(0, 6.28); const x = p.x + Math.cos(a) * 2.5, y = p.y + Math.sin(a) * 2.5; return walkable(map, x, y) ? [x, y] : [p.x, p.y]; }
  for (let i = 0; i < 20; i++) { const a = rnd(0, 6.28), d = rnd(3, 9), x = c.x + Math.cos(a) * d, y = c.y + Math.sin(a) * d; if (walkable(map, x, y)) return [x, y]; }
  return [c.x, c.y];
}
function zoneOf(b, a) { return a.zone ? { zone: { dur: a.zone.dur, every: 0.5, slow: a.zone.slow }, zmk: bossHit(b, a.zone.m * 0.5) } : {}; }

const ACT = {
  wait: (b, c, a, dt) => (c.t += dt) >= (a.t || 1),
  chase(b, c, a, dt, p, map) {
    c.t += dt; const d = dist2(b.x, b.y, p.x, p.y), reach = b.r + p.r + 0.7;
    if (c.wind > 0) { c.wind -= dt; if (c.wind <= 0) { fx('slash', b.x, b.y, { ang: c.ang, rad: reach + 1.2, arc: 140, col: '#f66', dur: 0.2 }); hitCircle(b, b.x + Math.cos(c.ang) * 1.2, b.y + Math.sin(c.ang) * 1.2, reach + 0.6, bossHit(b, 1), 0); c.cd = 1.1 / b.rate; } }
    else if (d < reach && (c.cd || 0) <= 0) { c.wind = 0.4; c.ang = Math.atan2(p.y - b.y, p.x - b.x); }
    else { c.cd = (c.cd || 0) - dt; if (d >= reach * 0.8) approach(b, p, b.spd * b.spdMul * slowMult(b), dt, map, true); }
    return c.t >= a.t;
  },
  burst(b, c, a, dt) {
    c.t += dt;
    if (c.t >= c.k * a.gap && c.k < a.waves) { const off = (c.k * a.rot * Math.PI) / 180; for (let i = 0; i < a.n; i++) bossProj(b, off + (i / a.n) * 6.283, a.spd, a.m, a); c.k++; }
    return c.k >= a.waves && c.t > a.waves * a.gap;
  },
  aimed(b, c, a, dt, p) {
    c.t += dt;
    if (c.t >= c.k * a.gap && c.k < a.rep) { const base = Math.atan2(p.y - b.y, p.x - b.x), sp = (a.spread * Math.PI) / 180; for (let i = 0; i < a.n; i++) bossProj(b, base + (a.n > 1 ? -sp / 2 + (sp * i) / (a.n - 1) : 0), a.spd, a.m, a); c.k++; }
    return c.k >= a.rep;
  },
  slam(b, c, a, dt, p) {
    if (!c.k) { c.k = 1; for (let i = 0; i < a.n; i++) { const sc = a.scatter && (i > 0 || a.n > 2) ? a.scatter : 0, an = rnd(0, 6.28), d = rnd(0, sc); addArea({ x: p.x + Math.cos(an) * d, y: p.y + Math.sin(an) * d, rad: a.rad, delay: a.delay + i * 0.12, src: b, vs: 0, mk: bossHit(b, a.m, a), col: DTC[b.dt], meteor: 1, ...zoneOf(b, a) }); } }
    return (c.t += dt) >= a.delay + 0.3;
  },
  rain(b, c, a, dt, p) {
    c.t += dt;
    while (c.k * a.rate < c.t && c.t < a.t) { c.k++; const an = rnd(0, 6.28), d = rnd(0, a.scatter); addArea({ x: p.x + Math.cos(an) * d, y: p.y + Math.sin(an) * d, rad: a.rad, delay: a.delay, src: b, vs: 0, mk: bossHit(b, a.m, a), col: DTC[b.dt], ...zoneOf(b, a) }); }
    return c.t >= a.t;
  },
  line(b, c, a, dt, p, map) {
    if (!c.k) {
      c.k = 1; const base = a.n === 1 ? Math.atan2(p.y - b.y, p.x - b.x) : ((a.off || 0) * Math.PI) / 180 + rnd(0, 0.3);
      for (let i = 0; i < a.n; i++) {
        const ang = base + (i / a.n) * 6.283;
        addArea({ shape: 'line', x: b.x, y: b.y, ang, len: a.len, w: a.w, rad: a.len, delay: a.delay, src: b, vs: 0, mk: bossHit(b, a.m, a), col: DTC[b.dt], shake: 1,
          onTrigger: a.dash ? () => { let ex = b.x, ey = b.y; for (let k = 1; k <= a.len * 4; k++) { const nx = b.x + Math.cos(ang) * k / 4, ny = b.y + Math.sin(ang) * k / 4; if (!walkable(map, nx, ny)) break; ex = nx; ey = ny; } b.dashTo = { x0: b.x, y0: b.y, x: ex, y: ey, t: 0 }; } : null });
      }
    }
    return (c.t += dt) >= a.delay + 0.45;
  },
  summon(b, c, a, dt, p, map) {
    if (!c.k) { c.k = 1; let alive = 0; for (const x of G.zone.actors) if (x.owner === b && !x.dead) alive++; if (alive < 14) { fx('ring', b.x, b.y, { rad: 3, col: '#b06bff', dur: 0.6 }); for (let i = 0; i < a.n; i++) { const [x, y] = freeSpot(map, b.x, b.y, 4); const m = spawnMob(a.m, x, y, G.zone.run, { add: 1, noSplit: 1 }); m.owner = b; m.aggro = true; } } }
    return (c.t += dt) >= 0.6;
  },
  spiral(b, c, a, dt) {
    c.t += dt;
    while (c.k * a.rate < c.t && c.t < a.t) { c.k++; const off = c.k * 0.31; for (let i = 0; i < a.arms; i++) bossProj(b, off + (i / a.arms) * 6.283, a.spd, a.m, a); }
    return c.t >= a.t;
  },
  tp(b, c, a, dt, p) {
    if (!c.k) { c.k = 1; fx('poof', b.x, b.y, { col: DTC[b.dt], dur: 0.5 }); const [x, y] = arenaPoint(b, a.to, p); b.x = x; b.y = y; fx('poof', x, y, { col: DTC[b.dt], dur: 0.5 }); }
    return (c.t += dt) >= 0.5;
  },
  nova(b, c, a, dt) {
    if (!c.k) { c.k = 1; addArea({ x: b.x, y: b.y, rad: a.rad, delay: a.delay, src: b, vs: 0, mk: bossHit(b, a.m, a), col: DTC[b.dt], shake: 1, ...zoneOf(b, a) }); }
    return (c.t += dt) >= a.delay + 0.3;
  },
  ring(b, c, a, dt) {
    if (!c.k) { c.k = 1; addArea({ shape: 'ring', x: b.x, y: b.y, rad: a.outer, inner: a.inner, delay: a.delay, src: b, vs: 0, mk: bossHit(b, a.m, a), col: DTC[b.dt], shake: 1 }); }
    return (c.t += dt) >= a.delay + 0.3;
  },
  enrage(b, c, a) {
    if (b.enraged !== b.ph) { b.enraged = b.ph; b.spdMul = a.spd || 1; b.dmgMul = a.dmg || 1; if (a.leech) b.leech = 1; if (a.regen) b.regen = a.regen; fx('ring', b.x, b.y, { rad: 4, col: '#f33', dur: 0.7 }); text(b.x, b.y - 2, 'ЯРОСТЬ', '#ff4d4d', 20); }
    return true;
  },
};

export function updateBoss(b, dt) {
  const z = G.zone, p = G.p, def = b.def;
  if (b.inv > 0) b.inv -= dt;
  if (b.regen) heal(b, b.s.maxLife * b.regen / 100 * dt);
  if (b.dashTo) { const d = b.dashTo; d.t += dt; const k = Math.min(1, d.t / 0.22); b.x = d.x0 + (d.x - d.x0) * k; b.y = d.y0 + (d.y - d.y0) * k; if (k >= 1) b.dashTo = null; return; }
  if (!p || p.dead) return;
  if (!b.engaged) { if (dist2(b.x, b.y, p.x, p.y) > 13 && b.hp >= b.s.maxLife) return; b.engaged = true; bus.emit('bossEngaged', b); }
  const hpf = b.hp / b.s.maxLife, early = diffOf(z.run.tier) >= 4 ? 0.08 : 0;
  while (b.ph + 1 < def.phases.length && hpf <= def.phases[b.ph + 1].at + early) {
    b.ph++; b.pi = 0; b.cur = null; b.inv = 1.2; b.wait = 1.2;
    fx('ring', b.x, b.y, { rad: 6, col: DTC[b.dt], dur: 0.8 }); G.cam.shake = 10;
    if (def.phases[b.ph].say) text(b.x, b.y - 2.5, def.phases[b.ph].say, '#ffd0a0', 18);
    for (const pr of z.projs) if (pr.src === b) pr.dead = true;
  }
  if (b.wait > 0) { b.wait -= dt; if (dist2(b.x, b.y, p.x, p.y) > 4) approach(b, p, b.spd * 0.5 * slowMult(b), dt, z.map, true); return; }
  const pat = def.phases[b.ph].pat;
  if (!b.cur) { const a = pat[b.pi % pat.length]; b.pi++; if (a.a === 'enrage' && b.enraged === b.ph) return; b.cur = { a, t: 0, k: 0 }; }
  const c = b.cur;
  if (ACT[c.a.a](b, c, c.a, dt, p, z.map)) { b.wait = (c.a.w ?? 0.7) / b.rate; b.cur = null; }
}

// ---------------------------------------------------------------- minions
function minionStats(mn) {
  const o = mn.owner, s = o.s, def = mn.def, lv = 1 + 0.08 * (mn.lvl - 1);
  mn.dmg = (30 + s.level + s.wavg * 0.25) * def.dmg * lv * Math.max(0.1, 1 + (s.minion_inc || 0) / 100) * (s.minion_more ?? 1) * (1 + (mn.mmore || 0) / 100);
  const hp = s.maxLife * 0.45 * def.hp * (1 + 0.06 * (mn.lvl - 1)) * Math.max(0.2, 1 + ((s.minionLife_inc || 0) + (mn.mlife || 0)) / 100);
  const f = mn.s.maxLife ? mn.hp / mn.s.maxLife : 1;
  mn.s = { maxLife: hp, armorF: s.armorF * 0.5, evasionF: 0, blockF: 0, res_all: 30, dr: 30 }; mn.hp = hp * f;
}
export function spawnMinion({ owner, m, x, y, dur, key, lvl, mmore, mlife }) {
  const def = MINIONS[m], z = G.zone;
  const [nx, ny] = freeSpot(z.map, x, y, 1.2);
  const mn = mkActor({ kind: 'minion', team: 0, owner, def, x: nx, y: ny, name: def.n, spr: def.spr, dt: def.dt, sc: def.sc || 3, r: 0.36, spd: def.spd, ai: def.ai, range: def.range || 7, taunt: def.taunt, key, lvl: lvl || 1, mmore, mlife, ttl: dur ? G.time + dur : 0, atkT: 0.3, born: G.time });
  mn.s = { maxLife: 0 }; minionStats(mn); mn.hp = mn.s.maxLife;
  z.actors.push(mn); z.minions.push(mn);
  fx('poof', nx, ny, { col: '#b06bff' });
  return mn;
}
bus.on('spawnMinion', (o) => {
  const z = G.zone; if (!z) return;
  const mine = z.minions.filter((x) => !x.dead && x.key === o.key);
  if (o.max && mine.length >= o.max) return;
  spawnMinion(o);
});
bus.on('summonSkill', ({ p, sk, x, y }) => {
  const z = G.zone, mine = z.minions.filter((m) => !m.dead && m.key === sk.id).sort((a, b) => a.born - b.born);
  const d = Math.min(7, dist2(p.x, p.y, x, y)), a = Math.atan2(y - p.y, x - p.x);
  const cx = p.x + Math.cos(a) * d, cy = p.y + Math.sin(a) * d;
  for (let i = 0; i < (sk.n1 || 1); i++) {
    if (mine.length >= sk.max) { const old = mine.shift(); old.dead = true; }
    mine.push(spawnMinion({ owner: p, m: sk.m, x: walkable(z.map, cx, cy) ? cx : p.x, y: walkable(z.map, cx, cy) ? cy : p.y, dur: sk.mdur, key: sk.id, lvl: sk.lvl, mmore: sk.mmore, mlife: sk.mlife }));
  }
});
bus.on('statsChanged', () => { if (G.zone) for (const mn of G.zone.minions) if (!mn.dead) minionStats(mn); });

export function updateMinion(mn, dt) {
  const z = G.zone, map = z.map, o = mn.owner;
  if (mn.ttl && G.time > mn.ttl) { mn.dead = true; fx('poof', mn.x, mn.y, { col: '#888' }); return; }
  if (mn.st.freeze || mn.st.stun) return;
  const dO = dist2(mn.x, mn.y, o.x, o.y);
  if (dO > 18) { const [x, y] = freeSpot(map, o.x, o.y, 1.5); mn.x = x; mn.y = y; return; }
  mn.atkT -= dt; if (mn.mv > 0) mn.mv -= dt;
  let tg = nearest(mn.x, mn.y, 0, 9);
  if (tg && dist2(tg.x, tg.y, o.x, o.y) > 13) tg = null;
  if (tg && !tg.aggro && tg.kind === 'mob' && !tg.boss) tg = null;
  const speed = mn.spd * slowMult(mn);
  if (!tg) { if (dO > 2.6) { const a = Math.atan2(o.y - mn.y, o.x - mn.x); moveActor(mn, Math.cos(a) * speed * 1.2 * dt, Math.sin(a) * speed * 1.2 * dt, map); } return; }
  const d = dist2(mn.x, mn.y, tg.x, tg.y), a = Math.atan2(tg.y - mn.y, tg.x - mn.x);
  if (mn.ai === 'ranged') {
    if (d < mn.range && los(map, mn.x, mn.y, tg.x, tg.y)) { if (mn.atkT <= 0) { mn.atkT = 1.3; addProj({ x: mn.x, y: mn.y, vx: Math.cos(a) * 12, vy: Math.sin(a) * 12, r: 0.25, life: 1.2, src: mn, vs: 1, mk: () => simpleHit(mn, 1), col: DTC[mn.dt] }); } }
    else moveActor(mn, Math.cos(a) * speed * dt, Math.sin(a) * speed * dt, map);
  } else {
    const reach = mn.r + tg.r + 0.5;
    if (d < reach) { if (mn.atkT <= 0) { mn.atkT = mn.def.atk || 1; mn.lunge = 0.15; if (mn.def.aoe) hitCircle(mn, mn.x, mn.y, mn.def.aoe + 0.6, () => simpleHit(mn, 1), 1); else applyHit(mn, tg, simpleHit(mn, 1)); } }
    else moveActor(mn, Math.cos(a) * speed * dt, Math.sin(a) * speed * dt, map);
  }
}

// simple crowd separation so packs do not stack into one tile
export function separate(actors) {
  const grid = new Map();
  for (const a of actors) { if (a.dead || a.kind === 'npc' || a.kind === 'player' || a.boss) continue; const k = ((a.x / 1.5) | 0) + ((a.y / 1.5) | 0) * 512; let l = grid.get(k); if (!l) grid.set(k, (l = [])); l.push(a); }
  const map = G.zone.map;
  for (const l of grid.values()) {
    if (l.length < 2) continue;
    for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) {
      const a = l[i], b = l[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01, min = a.r + b.r;
      if (d >= min) continue;
      const push = (min - d) * 0.25, px = (dx / d) * push, py = (dy / d) * push;
      if (walkable(map, a.x - px, a.y - py, a.fly)) { a.x -= px; a.y -= py; }
      if (walkable(map, b.x + px, b.y + py, b.fly)) { b.x += px; b.y += py; }
    }
  }
}
