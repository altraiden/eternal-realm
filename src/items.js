// Item generation, loot tables, inventory operations and crafting.
import { G } from './state.js';
import { BASES, BASE_IDS, AFFIXES, AFFIX_BY_ID, POWERS, POWER_IDS, UNIQUES, UNIQUE_IDS, BOSS_UNIQUES, SLOT_CODE, MATS, RARE_NAMES_A, RARE_NAMES_B } from './data/items.js';
import { classBases, CLASS_ARCH, W_BASE, W_ARCH, W_TANK } from './data/social.js';
import { itemInfo } from './stats.js';
import { RAR } from './data/defs.js';
import { ACTIVITIES, CURVE } from './data/activities.js';
import { SUPPORT_IDS } from './data/supports.js';
import { rnd, rint, pick, wpick, chance, uid, bus } from './util.js';

const SLOT_LIST = ['helm', 'chest', 'gloves', 'boots', 'belt', 'amulet', 'ring', 'mainhand', 'mainhand', 'offhand', 'relic', 'artifact'];
const basesOf = (slot) => BASE_IDS.filter((b) => BASES[b].s === slot);
const roll = (rar) => RAR[rar].minRoll + Math.random() * (1 - RAR[rar].minRoll);

export function rollRarity(mf = 0, min = 0) {
  const k = 1 + mf / 100;
  const list = RAR.map((r, i) => ({ i, w: i < min ? 0 : r.w * (i >= 2 ? Math.pow(k, 0.6 + i * 0.12) : 1) }));
  return wpick(list, (x) => x.w).i;
}
function pickAffixes(it, count, have = []) {
  const code = SLOT_CODE[BASES[it.base].s], out = have.slice();
  const maxKind = Math.ceil(Math.max(count, out.length + 1) / 2);
  for (let guard = 0; out.length < count && guard < 80; guard++) {
    const nP = out.filter((a) => AFFIX_BY_ID[a.id].kind === 'p').length, nS = out.length - nP;
    const pool = AFFIXES.filter((a) => a.on.includes(code) && !out.some((o) => AFFIX_BY_ID[o.id].stat === a.stat) && (a.kind === 'p' ? nP < maxKind : nS < maxKind) && !(a.id === 'wdmg' && !BASES[it.base].d));
    if (!pool.length) break;
    out.push({ id: wpick(pool, (a) => a.w).id, r: roll(it.rar) });
  }
  return out;
}
function nameItem(it) {
  const b = BASES[it.base];
  if (it.uniq) return UNIQUES[it.uniq].n;
  if (it.rar === 0) return b.n;
  if (it.rar === 1) { const s = it.aff.find((a) => AFFIX_BY_ID[a.id].sn); return b.n + (s ? ' ' + AFFIX_BY_ID[s.id].sn : ''); }
  return pick(RARE_NAMES_A) + ' ' + pick(RARE_NAMES_B);
}

export function genItem(ilvl, o = {}) {
  let rar = o.rar ?? rollRarity(o.mf || 0, o.minRar || 0);
  let base = o.base;
  let uniq = o.uniq || null;
  if (rar === 5 && !uniq) {
    const pool = UNIQUE_IDS.filter((u) => (o.boss ? UNIQUES[u].boss === o.boss || !UNIQUES[u].boss : !UNIQUES[u].boss) && (!o.slot || BASES[UNIQUES[u].base].s === o.slot));
    const mine = o.cls ? pool.filter((u) => classBases(o.cls).includes(UNIQUES[u].base)) : [];
    if (o.exclusive && BOSS_UNIQUES(o.boss).length) { const ex = BOSS_UNIQUES(o.boss), exMine = o.cls ? ex.filter((u) => classBases(o.cls).includes(UNIQUES[u].base)) : []; uniq = exMine.length && chance(60) ? pick(exMine) : pick(ex); }
    else if (pool.length) uniq = o.boss && chance(45) && pool.some((u) => UNIQUES[u].boss) ? pick(pool.filter((u) => UNIQUES[u].boss)) : mine.length && chance(70) ? pick(mine) : pick(pool); else rar = 4;
  }
  if (uniq) { base = UNIQUES[uniq].base; rar = 5; }
  if (!base) {
    let pool = basesOf(o.slot || pick(SLOT_LIST));
    if (o.cls && chance(o.smart ?? 70)) { const cb = classBases(o.cls), f = pool.filter((b) => cb.includes(b)); if (f.length) pool = f; } // smart loot
    base = pick(pool);
  }
  const B = BASES[base];
  const it = { uid: uid(), base, rar, ilvl, v: rint(0, 7), q: 0, up: 0, aff: [], pw: [], imp: (B.imp || []).map(() => roll(rar)) };
  if (uniq) { it.uniq = uniq; it.ur = UNIQUES[uniq].mods.map(() => Math.random()); it.pr = Math.random(); }
  else {
    it.aff = pickAffixes(it, RAR[rar].aff);
    const pws = POWER_IDS.slice();
    for (let i = 0; i < RAR[rar].pow; i++) it.pw.push({ id: pws.splice(rint(0, pws.length - 1), 1)[0], r: roll(rar) });
  }
  it.name = nameItem(it);
  return it;
}
// How good an item is for a class / role (used by bots, loot rolls and the ladder).
export const usable = (cls, it) => classBases(cls).includes(it.base);
export function itemScore(it, cls, role) {
  const info = itemInfo(it), arch = W_ARCH[CLASS_ARCH[cls]]; let sc = 0;
  for (const [stat, v] of info.mods) { let w = (W_BASE[stat] || 0) + (arch[stat] || 0); if (role === 'tank' && W_TANK[stat]) w *= W_TANK[stat]; sc += v * w; }
  if (info.wpn && arch.wdps) sc += ((info.wpn.min + info.wpn.max) / 2) * info.wpn.aps * arch.wdps;
  if (info.procs.length || info.pow.length) sc += 60 * info.pow.length;
  return sc;
}
export const sellValue = (it) => Math.round(Math.max(4, it.ilvl - 62) * 2.2 * Math.pow(1 + it.rar, 1.5));
export const itemSprite = (it) => [BASES[it.base].spr, it.v];

// ---- starting gear
export function starterGear(cls, def) {
  const eq = {};
  for (const slot in def.start) { const it = genItem(70, { base: def.start[slot], rar: slot === 'mainhand' ? 1 : 0 }); eq[slot] = it; }
  return eq;
}

// ---- drops
export function dropAt(x, y, d) {
  const z = G.zone; if (!z) return; const m = z.map;
  const free = (px, py) => { const tx = Math.floor(px), ty = Math.floor(py); return tx >= 0 && ty >= 0 && tx < m.w && ty < m.h && !m.solid[ty * m.w + tx]; };
  let tx = x, ty = y;
  for (let k = 0; k < 12; k++) { const a = rnd(0, 6.28), r = rnd(0.3, 1.4); const nx = x + Math.cos(a) * r, ny = y + Math.sin(a) * r; if (free(nx, ny)) { tx = nx; ty = ny; break; } }
  if (!free(tx, ty)) { tx = Math.floor(x) + 0.5; ty = Math.floor(y) + 0.5; }
  z.drops.push({ ...d, x, y, tx, ty, t: 0, id: uid() });
}

export function rollDrops(m, run, p) {
  const z = G.zone, act = ACTIVITIES[run.act], t = run.tier, ilvl = CURVE.ilvl(t);
  const qty = (1 + run.qty / 100) * (run.act === 'rift' ? 0.55 : 1), mf = (p.s.mf || 0) + run.rar;
  const boss = m.boss && !m.minor, rare = m.elite === 2, magic = m.elite === 1;
  let nItems = 0;
  if (boss) nItems = rint(7, 10) + (m.awakened ? 4 : 0); else if (m.boss) nItems = rint(3, 5); else if (rare) nItems = rint(2, 4); else if (magic) nItems = chance(55 * qty) ? 1 : 0; else nItems = chance((m.add ? 2 : 8) * qty) ? 1 : 0;
  if (m.def && m.def.rich) nItems += 4;
  const grp = run.group, lootCls = () => (grp ? pick(run.partyCls) : G.ch.cls);
  const out = (item) => { if (grp && (m.boss || (rare && item.rar >= 3))) bus.emit('groupLoot', item); else dropAt(m.x, m.y, { kind: 'item', item }); };
  if (grp && boss) nItems = grp >= 10 ? 5 : 3;
  for (let i = 0; i < nItems; i++) out(genItem(ilvl + (boss ? 2 : rare ? 1 : 0), { cls: lootCls(), mf: mf + (boss ? 150 : rare ? 60 : 0), minRar: boss && i === 0 ? 3 : rare && i === 0 ? 2 : 0, boss: boss ? m.bid : null }));
  if (boss) {
    // exclusive drop with bad-luck protection: every miss in the Boss realm / raid raises the next chance
    const big = run.act === 'boss' || run.act === 'raid', pity = (G.ch.prog.pity ||= {});
    const c = big ? Math.min(100, 30 + t + (pity[m.bid] || 0) * 9) : 6;
    if (chance(c)) { out(genItem(ilvl + 2, { rar: 5, boss: m.bid, exclusive: true, cls: lootCls() })); if (big) pity[m.bid] = 0; } else if (big) pity[m.bid] = (pity[m.bid] || 0) + 1;
    if (big) dropAt(m.x, m.y, { kind: 'mat', mid: 'token', n: run.act === 'raid' ? 2 : rint(1, 2) }); else if (run.act === 'gdungeon') dropAt(m.x, m.y, { kind: 'mat', mid: 'token', n: 1 });
  }
  if (chance(m.add ? 8 : 38) || m.elite || m.boss) dropAt(m.x, m.y, { kind: 'gold', n: Math.round(CURVE.gold(t) * rnd(0.6, 1.6) * (1 + (p.s.gf || 0) / 100) * (boss ? 40 : m.boss ? 15 : rare ? 8 : magic ? 2.5 : 1)) });
  const mm = boss ? 60 : m.boss ? 25 : rare ? 7 : magic ? 2 : m.add ? 0.2 : 1;
  for (const id in act.mats) { let c = 1.5 * act.mats[id] * mm * qty; while (c > 0) { if (chance(Math.min(100, c))) dropAt(m.x, m.y, { kind: 'mat', mid: id, n: 1 }); c -= 100; } }
  if (chance(0.5 * mm * qty)) dropAt(m.x, m.y, { kind: 'mat', mid: 'whet', n: 1 });
  if (chance(Math.min(100, 0.12 * mm * qty * (run.act === 'boss' ? 0 : 1))) || (m.awakened && boss)) dropAt(m.x, m.y, { kind: 'mat', mid: 'key', n: 1 });
  if (boss && run.fxAll.apocalypse) dropAt(m.x, m.y, { kind: 'mat', mid: 'divine', n: 1 });
  if (rare && run.fxAll.league) dropAt(m.x, m.y, { kind: 'mat', mid: pick(['chaos', 'exalt', 'annul', 'regal']), n: 1 });
  if (chance(0.25 * mm)) { const unk = SUPPORT_IDS.filter((s) => !G.save.supports.includes(s)); if (unk.length) dropAt(m.x, m.y, { kind: 'support', sid: pick(unk) }); }
}

// ---- inventory
export const BAG_SIZE = 60, STASH_SIZE = 150;
export function addToBag(ch, it) { const i = ch.bag.findIndex((x) => !x); if (i < 0) return -1; ch.bag[i] = it; return i; }
export function freeBag(ch) { return ch.bag.filter((x) => !x).length; }
export function slotFor(ch, it) {
  const s = BASES[it.base].s;
  if (s !== 'ring') return s;
  return !ch.equip.ring1 ? 'ring1' : !ch.equip.ring2 ? 'ring2' : 'ring1';
}
export function canEquip(ch, it, slot) {
  const B = BASES[it.base], mh = ch.equip.mainhand ? BASES[ch.equip.mainhand.base] : null;
  if (slot === 'offhand') {
    if (B.needs === 'bow') return mh && mh.rng ? null : 'Колчан требует лук или арбалет';
    if (mh && mh.h === 2) return 'Обе руки заняты двуручным оружием';
  }
  return null;
}
export function equipFromBag(ch, idx) {
  const it = ch.bag[idx]; if (!it) return 'Пусто';
  const slot = slotFor(ch, it), err = canEquip(ch, it, slot); if (err) return err;
  const B = BASES[it.base], off = ch.equip.offhand;
  const dropOff = slot === 'mainhand' && off && ((B.h === 2 && BASES[off.base].needs !== 'bow') || (BASES[off.base].needs === 'bow' && !B.rng) || (B.h === 2 && !B.rng && BASES[off.base].needs === 'bow'));
  if (dropOff && freeBag(ch) < 1 && ch.equip[slot]) return 'Нет места в сумке';
  ch.bag[idx] = ch.equip[slot] || null; ch.equip[slot] = it;
  if (dropOff) { ch.equip.offhand = null; if (addToBag(ch, off) < 0) { ch.equip.offhand = off; } }
  return null;
}
export function unequip(ch, slot) { const it = ch.equip[slot]; if (!it) return null; if (addToBag(ch, it) < 0) return 'Нет места в сумке'; ch.equip[slot] = null; return null; }
export function salvage(ch, it) {
  const dust = 1 + it.rar * 2 + Math.floor((it.up || 0) / 2);
  ch.mats.dust = (ch.mats.dust || 0) + dust;
  const extra = [];
  if (it.rar >= 4 && chance(50)) { const m = pick(['chaos', 'exalt', 'annul', 'regal', 'divine']); ch.mats[m] = (ch.mats[m] || 0) + 1; extra.push(MATS[m].n); }
  return { dust, extra };
}

// ---- crafting. Each op: {n, mat, need(it) -> error|null, run(it)}
const hasAff = (it) => !it.uniq;
export const CRAFT = {
  chaos: { n: 'Перековка', d: 'Заменяет все аффиксы новыми.', mat: 'chaos', need: (it) => (it.uniq ? 'Нельзя для уникальных' : it.rar === 0 ? 'Нужен предмет с аффиксами' : null), run(it) { it.aff = pickAffixes(it, Math.max(it.aff.length, RAR[it.rar].aff)); it.name = nameItem(it); } },
  exalt: { n: 'Добавить аффикс', d: 'Добавляет случайный аффикс (до 6).', mat: 'exalt', need: (it) => (it.uniq ? 'Нельзя для уникальных' : it.rar < 2 ? 'Нужна редкость не ниже редкой' : it.aff.length >= 6 ? 'Максимум аффиксов' : null), run(it) { it.aff = pickAffixes(it, it.aff.length + 1, it.aff); } },
  annul: { n: 'Удалить аффикс', d: 'Удаляет один случайный аффикс.', mat: 'annul', need: (it) => (it.uniq ? 'Нельзя для уникальных' : !it.aff.length ? 'Нет аффиксов' : null), run(it) { it.aff.splice(rint(0, it.aff.length - 1), 1); } },
  regal: { n: 'Повысить редкость', d: 'Обычный → магический → редкий → эпический → легендарный.', mat: 'regal', need: (it) => (it.uniq ? 'Нельзя для уникальных' : it.rar >= 4 ? 'Выше только пробуждением' : null), run(it) { it.rar++; it.aff = pickAffixes(it, Math.max(RAR[it.rar].aff, it.aff.length), it.aff); if (it.rar === 4) it.pw = [{ id: pick(POWER_IDS), r: roll(4) }]; it.name = nameItem(it); } },
  divine: { n: 'Перебросить значения', d: 'Заново бросает значения всех свойств.', mat: 'divine', need: (it) => (!it.uniq && !it.aff.length ? 'Нечего перебрасывать' : null), run(it) { for (const a of it.aff) a.r = roll(it.rar); it.imp = it.imp.map(() => roll(it.rar)); if (it.uniq) { it.ur = it.ur.map(() => Math.random()); it.pr = Math.random(); } for (const p of it.pw) p.r = roll(it.rar); } },
  whet: { n: 'Улучшить качество', d: '+2% базового урона / защиты (до 20%).', mat: 'whet', need: (it) => ((it.q || 0) >= 10 ? 'Максимальное качество' : !BASES[it.base].d && !BASES[it.base].def ? 'У предмета нет базовых показателей' : null), run(it) { it.q = (it.q || 0) + 1; } },
  ember: { n: 'Заточка', d: '+4% ко всем свойствам за уровень. Шанс успеха падает с уровнем.', mat: 'ember', cost: (it) => 1 + Math.floor((it.up || 0) / 2), chance: (it) => 100 - (it.up || 0) * 8, need: (it) => ((it.up || 0) >= 10 ? 'Максимальная заточка' : null), run(it) { if (chance(100 - (it.up || 0) * 8)) { it.up = (it.up || 0) + 1; return 'Успех! +' + it.up; } return 'Неудача. Материалы потрачены.'; } },
  shard: { n: 'Пробуждение', d: 'Легендарный предмет становится древним (+25% к значениям, 6 аффиксов).', mat: 'shard', cost: () => 20, need: (it) => (it.rar !== 4 ? 'Нужен легендарный предмет' : null), run(it) { it.rar = 6; it.aff = pickAffixes(it, 6, it.aff); } },
};
export function craftCost(op, it) { const c = CRAFT[op]; return { mat: c.cost ? c.cost(it) : 1, dust: 2 * (1 + it.rar), gold: Math.round(40 * (1 + it.rar) * Math.pow(1.04, it.ilvl - 70)) }; }
export function doCraft(ch, op, it) {
  const c = CRAFT[op], err = c.need(it); if (err) return { ok: false, msg: err };
  const cost = craftCost(op, it);
  if ((ch.mats[c.mat] || 0) < cost.mat) return { ok: false, msg: 'Не хватает: ' + MATS[c.mat].n };
  if ((ch.mats.dust || 0) < cost.dust) return { ok: false, msg: 'Не хватает пыли' };
  if (ch.gold < cost.gold) return { ok: false, msg: 'Не хватает золота' };
  ch.mats[c.mat] -= cost.mat; ch.mats.dust -= cost.dust; ch.gold -= cost.gold;
  const msg = c.run(it);
  return { ok: true, msg: msg || c.n + ': готово' };
}

// ---- vendor
export function vendorStock(ilvl) { const out = []; for (let i = 0; i < 14; i++) out.push(genItem(ilvl, { rar: wpick([[1, 50], [2, 40], [3, 10]], (x) => x[1])[0] })); return out; }
export const buyPrice = (it) => sellValue(it) * 6;
export const gamblePrice = (ilvl) => Math.round(220 * Math.pow(1.05, ilvl - 70));
