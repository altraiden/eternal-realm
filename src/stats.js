// Stat sheet: aggregates class, level, attributes, passives, specialization, items and buffs into final numbers.
import { CLASSES } from './data/classes.js';
import { TREE } from './data/passives.js';
import { BASES, AFFIX_BY_ID, POWERS, UNIQUES } from './data/items.js';
import { RAR, DT } from './data/defs.js';
import { G } from './state.js';

const FLAT_K = new Set(['life', 'mana', 'armor', 'evasion', 'thorns', 'lifeRegen', 'lifeOnKill', 'manaOnKill', 'lifeOnHit', 'add_phys', 'add_fire', 'add_cold', 'add_light', 'add_poison', 'add_dark', 'add_holy', 'str', 'dex', 'int', 'vit', 'spi', 'luck', 'allAttr']);
const kOf = (stat) => (FLAT_K.has(stat) ? 0.03 : 0.004);
const rd = (v, hi) => (Math.abs(hi) <= 3 ? Math.round(v * 10) / 10 : Math.round(v));
export const itemScale = (it) => RAR[it.rar].mult * (1 + (it.up || 0) * 0.04);
export const wMult = (it) => Math.pow(1.035, it.ilvl - 70) * (1 + (it.q || 0) * 0.02) * (1 + (it.up || 0) * 0.04);
export const dMult = (it) => Math.pow(1.03, it.ilvl - 70) * (1 + (it.q || 0) * 0.02) * (1 + (it.up || 0) * 0.04);

function rolled(lo, hi, r, k, it) {
  if (lo === hi && (k === 0 || Number.isInteger(lo) && Math.abs(lo) <= 3)) return lo;
  const v = (lo + (hi - lo) * r) * (1 + k * (it.ilvl - 70)) * itemScale(it);
  return rd(v, hi);
}
export function affixValue(it, af) {
  const a = AFFIX_BY_ID[af.id];
  return rolled(a.lo, a.hi, af.r, a.k, it);
}
export function powerInfo(pdef, r) {
  const v = Math.round((pdef.v[0] + (pdef.v[1] - pdef.v[0]) * r) * 10) / 10;
  return { v, text: pdef.d.replace('#', Math.abs(v)) };
}

// Full description of an item: stat mods, procs, weapon / defence numbers and tooltip lines.
export function itemInfo(it) {
  const base = BASES[it.base];
  const out = { mods: [], procs: [], lines: [], imp: [], pow: [], wpn: null, def: {} };
  let wdmgLocal = 0;
  const push = (stat, v, list) => {
    if (stat === 'wdmg_inc') wdmgLocal += v; else out.mods.push([stat, v]);
    list.push([stat, v]);
  };
  (base.imp || []).forEach((im, i) => push(im[0], rolled(im[1], im[2], it.imp?.[i] ?? 0.5, 0.004, it), out.imp));
  if (it.uniq) {
    const u = UNIQUES[it.uniq];
    u.mods.forEach((m, i) => push(m[0], rolled(m[1], m[2], it.ur?.[i] ?? 0.5, m[1] === m[2] ? 0 : kOf(m[0]), it), out.lines));
    addPower(out, u.pow, it.pr ?? 0.5, 'u_' + it.uniq);
  } else {
    for (const af of it.aff || []) push(AFFIX_BY_ID[af.id].stat, affixValue(it, af), out.lines);
    for (const pw of it.pw || []) addPower(out, POWERS[pw.id], pw.r, pw.id);
  }
  if (base.d) {
    const m = wMult(it) * (1 + wdmgLocal / 100);
    out.wpn = { min: Math.round(base.d[0] * m), max: Math.round(base.d[1] * m), aps: base.aps, crit: base.crit, type: base.w, rng: !!base.rng, cast: !!base.cast, h: base.h || 1 };
  }
  if (base.def) {
    const m = dMult(it);
    for (const k in base.def) {
      const v = k === 'block' ? base.def[k] : Math.round(base.def[k] * m);
      out.def[k] = v; out.mods.push([k, v]);
    }
  }
  return out;
}
function addPower(out, pdef, r, key) {
  const { v, text } = powerInfo(pdef, r);
  out.pow.push(text);
  if (pdef.mods) for (const m of pdef.mods) out.mods.push([m[0], m[1] * v + (m[2] || 0)]);
  if (pdef.proc) out.procs.push({ ...pdef.proc, v, key });
}

export function calcStats(ch, buffs = [], runFx = {}) {
  const cls = CLASSES[ch.cls];
  const s = {};
  const add = (k, v) => { if (k.endsWith('_more')) s[k] = (s[k] ?? 1) * (1 + v / 100); else s[k] = (s[k] || 0) + v; };
  const addAll = (mods) => { for (const m of mods) add(m[0], m[1]); };
  for (const a in cls.attr) add(a, cls.attr[a] + (ch.attrs[a] || 0));
  addAll(cls.mods);
  for (const id of ch.passives) addAll(TREE[id].mods);
  if (ch.spec) { const sp = cls.specs.find((x) => x.id === ch.spec); if (sp) addAll(sp.mods); }
  s.procs = [];
  let wpn = null;
  for (const slot in ch.equip) {
    const it = ch.equip[slot];
    if (!it) continue;
    const info = itemInfo(it);
    addAll(info.mods);
    s.procs.push(...info.procs);
    if (slot === 'mainhand') wpn = info.wpn;
  }
  for (const b of buffs) for (const m of b.mods) add(m[0], m[1] * (b.stacks || 1));
  // paragon (post-100 progression, capped)
  const pg = ch.paragon || {};
  add('dmg_inc', (pg.dmg || 0) * 1); add('life_inc', (pg.life || 0) * 0.5); add('mf', (pg.mf || 0) * 1); add('res_all', (pg.res || 0) * 0.3);

  const A = (k) => (s[k] || 0) + (s.allAttr || 0);
  const str = A('str'), dex = A('dex'), int = A('int'), vit = A('vit'), spi = A('spi'), luck = A('luck');
  Object.assign(s, { STR: str, DEX: dex, INT: int, VIT: vit, SPI: spi, LUCK: luck });
  add('attack_inc', str * 0.3); add('armor', str * 2); add('life', str);
  add('evasion', dex * 3); add('crit_inc', dex * 0.3);
  add('spell_inc', int * 0.3); add('mana', int * 2);
  add('life', vit * 6); add('lifeRegen', vit * 0.1);
  add('manaRegen_inc', spi * 0.5); add('minion_inc', spi * 0.3); add('mana', spi);
  add('mf', luck * 0.3); add('gf', luck * 0.5); add('crit_inc', luck * 0.2);

  const M = (k) => s[k] ?? 1;
  s.maxLife = Math.max(1, Math.round((cls.life + ch.level * 8 + (s.life || 0)) * (1 + (s.life_inc || 0) / 100) * M('life_more')));
  s.maxMana = Math.max(0, Math.round((cls.mana + ch.level * 2 + (s.mana || 0)) * (1 + (s.mana_inc || 0) / 100) * M('mana_more')));
  s.armorF = Math.max(0, (s.armor || 0) * (1 + (s.armor_inc || 0) / 100) * M('armor_more'));
  s.evasionF = s.ks_noEvade ? 0 : Math.max(0, (s.evasion || 0) * (1 + (s.evasion_inc || 0) / 100) * M('evasion_more'));
  s.blockF = Math.min(s.ks_blockCap ? 75 : 60, Math.max(0, s.block || 0));
  for (const t of DT) if (t !== 'phys') s['res_' + t] = (s['res_' + t] || 0) + (runFx.playerRes || 0);
  s.moveSpeed = 5.4 * Math.min(2.2, Math.max(0.3, 1 + (s.moveSpeed_inc || 0) / 100)) * (runFx.chill ? 0.8 : 1);
  s.regen = s.ks_noRegen || runFx.noRegen ? 0 : ((s.lifeRegen || 0) + s.maxLife * (0.4 + (s.lifeRegenPct || 0)) / 100) * M('regen_more');
  s.manaRegen = runFx.noRegen ? 0 : (s.maxMana * 0.035 + 3) * (1 + (s.manaRegen_inc || 0) / 100) * M('manaRegen_more');
  s.leechF = (s.leech || 0) * M('leech_more') * (runFx.noRegen ? 0.5 : 1);
  s.wpn = wpn || { min: 28, max: 44, aps: 1.4, crit: 5, type: 'fist', rng: false, cast: false, h: 1 };
  s.wavg = wpn ? (wpn.min + wpn.max) / 2 : 0;
  s.level = ch.level;
  return s;
}

// Approximate effective-HP style numbers for the character sheet.
export function defenceSummary(s, mobDmg) {
  const ar = s.armorF, physRed = Math.min(0.85, ar / (ar + 8 * mobDmg));
  const eva = Math.min(0.75, s.evasionF / (s.evasionF + 1200 * (mobDmg / 62)));
  return { physRed: Math.round(physRed * 100), eva: Math.round(eva * 100) };
}
export const recalc = () => { if (G.p) G.p.dirty = true; };
