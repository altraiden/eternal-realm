// The living world: persistent bot players, their background life, the auction house, group loot rolls, chat.
import { G } from './state.js';
import { CLASSES, CLASS_IDS } from './data/classes.js';
import { TREE, startNode } from './data/passives.js';
import { BASES, MATS } from './data/items.js';
import { RAR } from './data/defs.js';
import { ACTIVITIES, CURVE, weekId } from './data/activities.js';
import { CLASS_GEAR, CLASS_ROLES, CLASS_ARCH, ROLE_SPEC, ROLE_BAR, ROLE_N, W_BASE, W_ARCH, NAMES, NICK_SUFFIX, GUILDS, CHAT, classBases } from './data/social.js';
import { genItem, itemScore, usable, sellValue, addToBag, dropAt, CRAFT } from './items.js';
import { rnd, rint, pick, chance, shuffle, uid, bus, clamp } from './util.js';
import { goalStep, brainTick, initGuilds } from './brain.js';

const SLOTS = ['helm', 'chest', 'gloves', 'boots', 'belt', 'amulet', 'ring1', 'ring2', 'mainhand', 'offhand', 'relic', 'artifact'];
const slotType = (s) => (s === 'ring1' || s === 'ring2' ? 'ring' : s);
const MAT_BASE = { dust: 15, chaos: 120, exalt: 400, annul: 250, regal: 300, divine: 900, whet: 80, ember: 150, shard: 200, key: 600 };
export const TRADE_MATS = Object.keys(MAT_BASE);
const W = () => G.save.world;
export const botById = (id) => W().bots.find((b) => b.id === id);
const fill = (tpl, o) => tpl.replace(/\{(\w)\}/g, (_, k) => o[k] ?? '');

// ------------------------------------------------------------------ chat
G.chat = [];
export function say(chan, from, msg, col) {
  G.chat.push({ chan, from, msg, col, t: Date.now() }); if (G.chat.length > 120) G.chat.shift();
  bus.emit('chat');
}
const botSay = (b, key, o = {}, chan = 'world') => say(chan, b.ch.name, fill(pick(CHAT[key]), o));

// ------------------------------------------------------------------ creation
function mainAttr(cls) { return { melee: cls === 'assassin' || cls === 'monk' ? 'dex' : 'str', ranged: 'dex', caster: 'int', minion: 'spi' }[CLASS_ARCH[cls]]; }
function allocPassives(cls, n) {
  const arch = W_ARCH[CLASS_ARCH[cls]], have = new Set([startNode(cls)]);
  const val = (node) => node.mods.reduce((a, m) => a + Math.abs(m[1]) * ((W_BASE[m[0]] || 0) + (arch[m[0]] || 0)), 0) + Math.random() * 3;
  for (let i = 0; i < n; i++) {
    let best = null, bv = -1;
    for (const id of have) for (const l of TREE[id].links) { if (have.has(l) || TREE[l].type === 'key' || TREE[l].type === 'start') continue; const v = val(TREE[l]); if (v > bv) { bv = v; best = l; } }
    if (best == null) break; have.add(best);
  }
  return [...have];
}
function gearFor(cls, tier, quality) {
  const eq = {}, ilvl = CURVE.ilvl(tier), g = CLASS_GEAR[cls];
  const rar = () => (Math.random() < quality * 0.25 ? 3 : Math.random() < quality ? 2 : 1);
  eq.mainhand = genItem(ilvl, { base: pick(g.w), rar: rar() });
  const mh = BASES[eq.mainhand.base];
  for (const s of SLOTS) {
    if (s === 'mainhand') continue;
    if (s === 'offhand') { const o = g.o.filter((b) => (BASES[b].needs === 'bow' ? mh.rng : mh.h !== 2)); eq[s] = o.length ? genItem(ilvl, { base: pick(o), rar: rar() }) : null; continue; }
    eq[s] = Math.random() < 0.12 ? null : genItem(ilvl, { slot: slotType(s), cls, smart: 100, rar: rar() });
  }
  return eq;
}
function makeBot(i, taken) {
  const cls = CLASS_IDS[i % CLASS_IDS.length], roles = CLASS_ROLES[cls];
  const role = roles.length > 1 && i % 3 !== 2 ? roles[0] : roles[roles.length - 1];
  let name; do { name = pick(NAMES) + pick(NICK_SUFFIX); } while (taken.has(name)); taken.add(name);
  const level = rint(70, 84), tier = clamp(Math.round((level - 69) * 0.45 + rnd(-1, 2)), 1, 9), skill = rnd(0.45, 0.97);
  const ma = mainAttr(cls), pts = 20 + 5 * (level - 70), attrs = { str: 0, dex: 0, int: 0, vit: 0, spi: 0, luck: 0 };
  attrs[ma] += Math.round(pts * 0.6); attrs.vit += pts - Math.round(pts * 0.6);
  const spec = (ROLE_SPEC[cls] && ROLE_SPEC[cls][role]) || pick(CLASSES[cls].specs).id;
  const ch = {
    id: uid(), name, cls, level, xp: 0, gold: rint(400, 5000), attrs, attrPts: 0, passives: allocPassives(cls, 45 + level - 70), pp: 0, spec, paragon: {},
    equip: gearFor(cls, tier, skill), skills: { bar: (ROLE_BAR[cls + ':' + role] || CLASSES[cls].bar).slice(), sup: {} }, mats: { dust: rint(5, 40), chaos: rint(0, 4), whet: rint(0, 4), ember: rint(0, 3) }, flask: { max: 3, pow: 45 },
  };
  return { id: 'b' + i, role, tier, online: Math.random() < 0.6, guild: null, lock: 0, kills: rint(500, 9000), tower: rint(0, 12), bossK: rint(0, 15), sched: { h: rint(0, 23), len: rint(6, 15) }, mem: { rel: 0, runs: 0 }, goal: null, done: 0, ch, pers: { skill, greed: rnd(0, 1), chatty: rnd(0, 1), patience: rint(2, 5), social: rnd(0, 1), compet: rnd(0, 1), helpful: rnd(0, 1), toxic: Math.random() < 0.25 ? rnd(0.5, 1) : rnd(0, 0.4) } };
}
export function botPower(b) {
  let p = b.ch.level * 20;
  for (const s in b.ch.equip) if (b.ch.equip[s]) p += itemScore(b.ch.equip[s], b.ch.cls, b.role);
  return (b.gs = Math.round(p));
}
export function playerPower() {
  let p = G.ch.level * 20; const role = (G.party && G.party.role) || 'dps';
  for (const s in G.ch.equip) if (G.ch.equip[s]) p += itemScore(G.ch.equip[s], G.ch.cls, role);
  return Math.round(p);
}
const needPower = (tier) => W().ref * Math.pow(1.085, tier - 1);

export function initWorld() {
  const s = G.save;
  if (!s.world || s.world.v !== 2) {
    const taken = new Set(), bots = []; for (let i = 0; i < 300; i++) bots.push(makeBot(i, taken));
    s.world = { v: 2, dm: {}, myGuild: null, bots, ah: { lots: [], mats: {} }, t: Date.now(), tick: 0, rep: 0, ref: 1 };
    const t1 = bots.filter((b) => b.tier <= 2).map(botPower); s.world.ref = (t1.reduce((a, b) => a + b, 0) / Math.max(1, t1.length)) * 0.92;
    for (const id of TRADE_MATS) s.world.ah.mats[id] = { price: MAT_BASE[id], stock: rint(8, 30) };
    for (const b of bots) botPower(b);
    initGuilds(s.world);
    for (let i = 0; i < 25; i++) simTick(true);
  }
  for (const b of s.world.bots) botPower(b);
  const missed = Math.min(300, Math.floor((Date.now() - s.world.t) / 20000));
  if (missed > 5) { const before = s.world.bots.reduce((a, b) => a + b.ch.level, 0); for (let i = 0; i < missed; i++) simTick(true); const gain = s.world.bots.reduce((a, b) => a + b.ch.level, 0) - before; say('sys', '', `Пока вас не было, мир жил своей жизнью: герои получили ${gain} уровней, на аукционе ${s.world.ah.lots.length} лотов.`, '#36e0c8'); }
  s.world.t = Date.now();
}

// ------------------------------------------------------------------ gear handling
function equipIfBetter(b, it) {
  const ch = b.ch, B = BASES[it.base]; if (!usable(ch.cls, it)) return false;
  let slot = B.s === 'ring' ? (!ch.equip.ring1 ? 'ring1' : !ch.equip.ring2 ? 'ring2' : (itemScore(ch.equip.ring1, ch.cls, b.role) <= itemScore(ch.equip.ring2, ch.cls, b.role) ? 'ring1' : 'ring2')) : B.s;
  const mh = slot === 'mainhand' ? B : ch.equip.mainhand ? BASES[ch.equip.mainhand.base] : null;
  if (slot === 'offhand' && mh && (B.needs === 'bow' ? !mh.rng : mh.h === 2)) return false;
  const cur = ch.equip[slot];
  let curScore = cur ? itemScore(cur, ch.cls, b.role) : 0;
  if (slot === 'mainhand' && B.h === 2 && !B.rng && ch.equip.offhand) curScore += itemScore(ch.equip.offhand, ch.cls, b.role);
  if (itemScore(it, ch.cls, b.role) <= curScore * 1.03) return false;
  ch.equip[slot] = it;
  if (slot === 'mainhand' && ch.equip.offhand) { const o = BASES[ch.equip.offhand.base]; if ((B.h === 2 && !B.rng) || (o.needs === 'bow' && !B.rng)) { dispose(b, ch.equip.offhand, true); ch.equip.offhand = null; } }
  if (cur) dispose(b, cur, true);
  botPower(b);
  return true;
}
export const fairPrice = (it) => Math.round(sellValue(it) * (5 + it.rar * 3) * (1 + (it.up || 0) * 0.15));
function dispose(b, it, silent) {
  const w = W(), ch = b.ch;
  if (it.rar >= 2 && w.ah.lots.length < 140 && Math.random() < 0.55) {
    const price = Math.round(fairPrice(it) * rnd(0.75, 1.5));
    w.ah.lots.push({ id: uid(), it, price, by: b.id, byName: ch.name, t: w.tick });
    if (!silent && it.rar >= 3 && chance(25 * b.pers.chatty)) botSay(b, 'wts', { i: it.name, p: price });
  } else if (Math.random() < 0.5) ch.gold += sellValue(it); else ch.mats.dust = (ch.mats.dust || 0) + 1 + it.rar * 2;
}
function botCraft(b) {
  const ch = b.ch, m = ch.mats, slots = SLOTS.filter((s) => ch.equip[s]); if (!slots.length) return;
  const it = ch.equip[pick(slots)], B = BASES[it.base];
  if (m.whet > 0 && (it.q || 0) < 10 && (B.d || B.def)) { m.whet--; it.q = (it.q || 0) + 1; }
  else if ((m.ember || 0) >= 1 + Math.floor((it.up || 0) / 2) && (it.up || 0) < 7) { m.ember -= 1 + Math.floor((it.up || 0) / 2); CRAFT.ember.run(it); }
  else if (m.regal > 0 && !it.uniq && it.rar < 4) { m.regal--; CRAFT.regal.run(it); }
  else if (m.exalt > 0 && !it.uniq && it.rar >= 2 && it.aff.length < 6) { m.exalt--; CRAFT.exalt.run(it); }
  else if (m.chaos > 0 && !it.uniq && it.rar >= 1 && it.rar <= 3) { m.chaos--; const c = JSON.parse(JSON.stringify(it)); CRAFT.chaos.run(c); if (itemScore(c, ch.cls, b.role) > itemScore(it, ch.cls, b.role)) Object.assign(it, c); }
  else return;
  botPower(b);
}
export function botXp(b, xp) {
  const ch = b.ch; if (ch.level >= 100) return; ch.xp += xp; let up = false;
  while (ch.level < 100 && ch.xp >= CURVE.xpNeed(ch.level)) { ch.xp -= CURVE.xpNeed(ch.level); ch.level++; up = true; const ma = mainAttr(ch.cls); ch.attrs[ma] += 3; ch.attrs.vit += 2; ch.passives = allocPassives(ch.cls, 45 + ch.level - 70); }
  return up;
}

// ------------------------------------------------------------------ background simulation (one tick ≈ 20 real seconds)
export function simTick(silent) {
  const w = W(), inParty = new Set(G.party ? G.party.ids : []);
  w.tick++;
  for (const b of w.bots) {
    if (inParty.has(b.id)) continue;
    { const hr = new Date().getHours(), want = ((hr - b.sched.h + 24) % 24) < b.sched.len; if (b.online !== want && Math.random() < 0.12) b.online = want; }
    if (!b.online) continue;
    const ch = b.ch, r = Math.random();
    if (r < 0.3) {
      // "runs" an activity: success depends on gear against the tier
      const ok = Math.random() < clamp(0.55 + (botPower(b) / needPower(b.tier) - 1) * 1.4, 0.06, 0.97);
      if (!ok) { if (b.tier > 1 && Math.random() < 0.15) b.tier--; continue; }
      b.kills += rint(60, 160);
      if (botXp(b, CURVE.mobXp(b.tier) * rint(180, 420)) && !silent && chance(30 * b.pers.chatty)) botSay(b, 'lvl', { t: ch.level });
      ch.gold += Math.round(CURVE.gold(b.tier) * rint(150, 400));
      for (let i = rint(1, 3); i > 0; i--) {
        const it = genItem(CURVE.ilvl(b.tier), { cls: ch.cls, mf: 20 + b.tier * 3 });
        if (equipIfBetter(b, it)) { if (!silent && it.rar >= 4 && chance(40 + 40 * b.pers.chatty)) botSay(b, 'loot', { i: it.name }); } else dispose(b, it, silent);
      }
      for (const id of ['chaos', 'whet', 'ember', 'exalt', 'regal', 'dust']) if (Math.random() < (id === 'dust' ? 0.8 : 0.22)) ch.mats[id] = (ch.mats[id] || 0) + 1;
      if (botPower(b) > needPower(b.tier + 1) * 0.95 && b.tier < 60 && Math.random() < 0.5) b.tier++;
      goalStep(b, silent);
    } else if (r < 0.45) botCraft(b);
    else if (r < 0.62) botShop(b, silent);
    else if (r < 0.66 && !silent && chance(60 * b.pers.chatty)) {
      if (Math.random() < 0.5) botSay(b, 'lfg', { a: pick(['чертоги', 'рейд', 'башню', 'разлом']), t: b.tier, r: ROLE_N[b.role].toLowerCase(), c: CLASSES[ch.cls].n.toLowerCase() }); else botSay(b, 'idle');
    }
  }
  // auction upkeep: stale lots get cheaper, then expire; outside demand occasionally buys the player's fair lots
  const lots = w.ah.lots;
  for (const l of lots) {
    const age = w.tick - l.t;
    if (age > 45 && age % 15 === 0) l.price = Math.max(sellValue(l.it), Math.round(l.price * 0.92));
    if (l.by === 'you' && l.price <= fairPrice(l.it) * 1.25 && Math.random() < 0.05) sellLot(l, null, silent);
    else if (age > 260 && l.by !== 'you') l.gone = true;
  }
  w.ah.lots = lots.filter((l) => !l.gone);
  for (const id of TRADE_MATS) { const m = w.ah.mats[id]; m.price = Math.round(m.price + (MAT_BASE[id] - m.price) * 0.03 + rnd(-0.02, 0.02) * m.price); m.stock = clamp(m.stock + rint(-1, 2), 0, 60); }
  brainTick(silent);
}
function sellLot(l, buyer, silent) {
  const w = W(), cut = Math.round(l.price * 0.95);
  if (l.by === 'you') { w.inbox = (w.inbox || 0) + cut; if (!silent) { say('sys', '', `Ваш лот «${l.it.name}» продан за ${l.price} зол. (после комиссии ${cut}).`, '#ffd24a'); bus.emit('toast', `Аукцион: «${l.it.name}» продан`, '#ffd24a'); } }
  else { const s = botById(l.by); if (s) s.ch.gold += cut; }
  if (buyer) { buyer.ch.gold -= l.price; equipIfBetter(buyer, l.it); }
  l.gone = true;
}
function botShop(b, silent) {
  const w = W(), ch = b.ch; let best = null, bg = 0;
  if (b.goal && b.goal.type === 'rich' && Math.random() < 0.7) return;
  for (const l of w.ah.lots) {
    if (l.gone || l.by === b.id || l.price > ch.gold * 0.8 || !usable(ch.cls, l.it)) continue;
    const slot = BASES[l.it.base].s === 'ring' ? 'ring1' : BASES[l.it.base].s, cur = ch.equip[slot];
    const gain = itemScore(l.it, ch.cls, b.role) - (cur ? itemScore(cur, ch.cls, b.role) : 0);
    if (gain > 15 && gain / l.price > bg) { bg = gain / l.price; best = l; }
  }
  if (best) { sellLot(best, b, silent); w.ah.lots = w.ah.lots.filter((l) => !l.gone); return; }
  // otherwise trade materials: sell surplus, buy what crafting needs
  const id = pick(TRADE_MATS), m = w.ah.mats[id];
  if ((ch.mats[id] || 0) > 6) { ch.mats[id] -= 2; m.stock += 2; ch.gold += m.price; m.price = Math.round(m.price * 0.97); }
  else if (ch.gold > m.price * 6 && m.stock > 0 && ['whet', 'ember', 'chaos', 'regal'].includes(id)) { ch.gold -= m.price; m.stock--; ch.mats[id] = (ch.mats[id] || 0) + 1; m.price = Math.round(m.price * 1.02); }
}
// player-facing auction API
export function ahList(it, price) { const w = W(); w.ah.lots.push({ id: uid(), it, price, by: 'you', byName: G.ch.name, t: w.tick }); }
export function ahBuy(id) {
  const w = W(), l = w.ah.lots.find((x) => x.id === id), ch = G.ch; if (!l) return 'Лот уже продан';
  if (l.by === 'you') { if (addToBag(ch, l.it) < 0) return 'Сумка полна'; }
  else { if (ch.gold < l.price) return 'Не хватает золота'; if (addToBag(ch, l.it) < 0) return 'Сумка полна'; ch.gold -= l.price; const s = botById(l.by); if (s) s.ch.gold += Math.round(l.price * 0.95); }
  w.ah.lots = w.ah.lots.filter((x) => x !== l); return null;
}
export const matBuyPrice = (id) => Math.round(W().ah.mats[id].price * 1.1);
export const matSellPrice = (id) => Math.round(W().ah.mats[id].price * 0.9);
export function matTrade(id, buy) {
  const m = W().ah.mats[id], ch = G.ch;
  if (buy) { const p = matBuyPrice(id); if (m.stock <= 0) return 'Нет в продаже'; if (ch.gold < p) return 'Не хватает золота'; ch.gold -= p; ch.mats[id] = (ch.mats[id] || 0) + 1; m.stock--; m.price = Math.round(m.price * 1.03); }
  else { if (!(ch.mats[id] > 0)) return 'У вас этого нет'; ch.gold += matSellPrice(id); ch.mats[id]--; m.stock++; m.price = Math.max(Math.round(MAT_BASE[id] * 0.3), Math.round(m.price * 0.97)); }
  return null;
}
export function claimInbox() { const w = W(); if (w.inbox > 0 && G.ch) { G.ch.gold += w.inbox; bus.emit('toast', `Выручка с аукциона: +${w.inbox} зол.`, '#ffd24a'); w.inbox = 0; } }

// ------------------------------------------------------------------ party
export const partySize = (act) => ACTIVITIES[act].group;
export function findParty(act, tier, myRole) {
  const w = W(), size = partySize(act), want = size >= 10 ? { tank: 2, healer: 2, dps: 6 } : { tank: 1, healer: 1, dps: 3 };
  want[myRole]--;
  const wk = weekId(), pool = shuffle(w.bots.filter((b) => b.online && (act !== 'raid' || b.lock !== wk))).sort((a, b) => Math.abs(a.tier - tier) - Math.abs(b.tier - tier));
  const ids = [], declined = [];
  for (const role of ['tank', 'healer', 'dps']) for (const b of pool) {
    if (want[role] <= 0) break; if (b.role !== role || ids.includes(b.id)) continue;
    if (w.rep < -6 && Math.random() < 0.3) { declined.push(b); continue; }
    ids.push(b.id); want[role]--;
  }
  G.party = { ids, role: myRole, act, tier, wipes: 0 };
  for (const b of declined.slice(0, 2)) say('world', b.ch.name, 'не, с ниндзя-лутерами не хожу');
  for (const id of ids.slice(0, 4)) { const b = botById(id); if (chance(50 + 40 * b.pers.chatty)) botSay(b, 'join', {}, 'party'); }
  return { missing: want };
}
export function disband() { G.party = null; bus.emit('party'); }
export function partyReward(run, win) {
  if (!G.party) return; const wk = weekId();
  for (const id of G.party.ids) {
    const b = botById(id); if (!b) continue;
    if (win) { b.mem.rel = Math.min(10, b.mem.rel + 0.6); b.mem.runs++; botXp(b, CURVE.mobXp(run.tier) * 500); b.ch.gold += Math.round(CURVE.gold(run.tier) * 400); if (run.tier >= b.tier && b.tier < 60) b.tier++; if (run.act === 'raid') b.lock = wk; }
    botPower(b);
  }
  if (win) for (const id of shuffle(G.party.ids.slice()).slice(0, 3)) botSay(botById(id), Math.random() < 0.5 ? 'win' : 'thx', {}, 'party');
}

// ------------------------------------------------------------------ group loot rolls (need / greed / disenchant / pass)
G.rolls = [];
bus.on('groupLoot', (item) => { G.rolls.push({ id: uid(), item, until: G.time + 30 }); bus.emit('rolls'); });
const ROLL_N = { need: 'Нужно', greed: 'Не откажусь', dis: 'Распылить', pass: 'Пас' };
function botChoice(b, it) {
  const ch = b.ch, B = BASES[it.base];
  if (usable(ch.cls, it)) {
    const slot = B.s === 'ring' ? 'ring1' : B.s, cur = ch.equip[slot];
    if (itemScore(it, ch.cls, b.role) > (cur ? itemScore(cur, ch.cls, b.role) : 0) * 1.03) return 'need';
  } else if (b.pers.greed > 0.9 && b.pers.skill < 0.65 && Math.random() < 0.15) return 'need'; // the occasional ninja
  const r = Math.random();
  return r < 0.45 + b.pers.greed * 0.35 ? 'greed' : r < 0.85 ? 'dis' : 'pass';
}
export function resolveRoll(roll, choice) {
  const w = W(), it = roll.item, entries = [{ who: 'you', name: G.ch.name, c: choice }];
  for (const id of G.party ? G.party.ids : []) { const b = botById(id); if (b) entries.push({ who: b, name: b.ch.name, c: botChoice(b, it) }); }
  for (const e of entries) e.r = e.c === 'pass' ? 0 : rint(1, 100);
  const col = RAR[it.rar].c;
  say('loot', '', `Розыгрыш: «${it.name}»`, col);
  for (const e of entries) if (e.c !== 'pass') say('loot', e.name, `${ROLL_N[e.c]} — ${e.r}`, e.c === 'need' ? '#ffd24a' : '#9a9');
  let win = null;
  for (const c of ['need', 'greed', 'dis']) { const g = entries.filter((e) => e.c === c); if (g.length) { win = g.sort((a, b) => b.r - a.r)[0]; break; } }
  if (!win) say('loot', '', 'Все спасовали.', '#888');
  else {
    say('loot', '', `${win.name} получает «${it.name}»${win.c === 'dis' ? ' (распылено)' : ''}`, col);
    if (win.who === 'you') {
      if (win.c === 'dis') G.ch.mats.dust = (G.ch.mats.dust || 0) + 3 + it.rar * 3;
      else if (addToBag(G.ch, it) < 0) dropAt(G.p.x, G.p.y, { kind: 'item', item: it });
      bus.emit('toast', win.c === 'dis' ? 'Вы выиграли и распылили предмет' : 'Вы выиграли: ' + it.name, col); bus.emit('bag');
    } else {
      const b = win.who;
      if (win.c === 'dis') b.ch.mats.dust = (b.ch.mats.dust || 0) + 3 + it.rar * 3;
      else if (equipIfBetter(b, it)) { bus.emit('botGear', b); if (chance(40)) botSay(b, 'need', {}, 'party'); } else dispose(b, it, true);
    }
  }
  if (choice === 'need' && !usable(G.ch.cls, it)) { w.rep -= 2; for (const id of G.party ? G.party.ids : []) { const pb = botById(id); if (pb) pb.mem.rel -= 1.5; } const b = G.party && botById(pick(G.party.ids)); if (b) botSay(b, 'ninja', { n: G.ch.name }, 'party'); }
  else if (choice !== 'need' && w.rep < 0 && Math.random() < 0.3) w.rep++;
  G.rolls = G.rolls.filter((r) => r !== roll); bus.emit('rolls');
}

// ------------------------------------------------------------------ real-time clock
let acc = 0;
bus.on('frame', (dt) => {
  if (!G.save || !G.save.world || !G.ch) return;
  acc += dt; if (acc >= 20) { acc = 0; simTick(false); G.save.world.t = Date.now(); claimInbox(); }
  for (const r of G.rolls.slice()) if (G.time > r.until) resolveRoll(r, 'pass');
});
export { ROLL_N, botSay };
