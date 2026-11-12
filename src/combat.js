// Damage pipeline, status effects, procs, areas and projectiles.
import { G } from './state.js';
import { DT, DTC } from './data/defs.js';
import { rnd, chance, clamp, dist2, bus } from './util.js';

const ELEM = { fire: 1, cold: 1, light: 1, poison: 1 };
const S = (a, k) => a.s[k] || 0;
const Mo = (a, k) => a.s[k] ?? 1;

export function text(x, y, txt, col = '#fff', size = 14, crit = false) {
  const z = G.zone; if (!z || z.texts.length > 140) return;
  z.texts.push({ x: x + rnd(-0.3, 0.3), y: y + rnd(-0.2, 0.2), t: 0, txt, col, size, crit });
}
export function fx(kind, x, y, o = {}) { const z = G.zone; if (z && z.fx.length < 400) z.fx.push({ kind, x, y, t: 0, dur: o.dur || 0.4, ...o }); }
export const enemiesOf = (team) => G.zone.actors.filter((a) => !a.dead && a.team !== team && a.team !== 2);
export function nearest(x, y, team, maxD = 99, skip = null) {
  let best = null, bd = maxD;
  for (const a of G.zone.actors) {
    if (a.dead || a.team === team || a.team === 2 || (skip && skip.has(a.id))) continue;
    const d = dist2(x, y, a.x, a.y) - a.r;
    if (d < bd) { bd = d; best = a; }
  }
  return best;
}

// ---- class mechanic multipliers (runtime state lives on the player actor)
export function mechMult(p) {
  const m = p.mech; if (!m) return 1;
  let k = 1;
  if (m.id === 'rage') k *= 1 + m.v / 100;
  if (m.id === 'combo') k *= 1 + m.v * 0.08;
  if (m.id === 'souls') k *= 1 + m.v * 0.02;
  if (m.id === 'nature' && m.ready) k *= 1.5;
  return k;
}

// Build a hit from a resolved player skill.
export function buildHit(src, sk, o = {}) {
  const s = src.s, tags = sk.tags, base = {};
  const lm = 1 + 0.08 * (sk.lvl - 1);
  const isAtk = !!sk.wm;
  if (isAtk) base.phys = rnd(s.wpn.min, s.wpn.max) * (sk.wm / 100) * lm;
  if (sk.d) for (const t in sk.d) base[t] = (base[t] || 0) + rnd(sk.d[t][0], sk.d[t][1]) * lm;
  const ae = (sk.ae ?? (isAtk ? sk.wm : 70)) / 100;
  for (const t of DT) { const a = s['add_' + t]; if (a) base[t] = (base[t] || 0) + a * rnd(0.8, 1.2) * ae; }
  // conversions
  const conv = (from, to, pct) => { if (!base[from] || pct <= 0 || from === to) return; const x = base[from] * Math.min(100, pct) / 100; base[from] -= x; base[to] = (base[to] || 0) + x; };
  if (sk.conv) for (const t in sk.conv) conv('phys', t, sk.conv[t]);
  for (const t of ['fire', 'cold', 'light', 'dark']) if (s['conv_' + t]) conv('phys', t, s['conv_' + t]);
  if (sk.infuse) for (const t of DT) if (t !== sk.infuse) conv(t, sk.infuse, 50);
  if (s.ks_allFire) for (const t of DT) conv(t, 'fire', 100);
  // scaling
  const has = (t) => tags.includes(t);
  let incAll = S(src, 'dmg_inc') + (has('attack') ? S(src, 'attack_inc') : 0) + (has('spell') ? S(src, 'spell_inc') : 0) + (has('melee') ? S(src, 'melee_inc') : 0) + (has('proj') ? S(src, 'proj_inc') : 0) + (has('aoe') ? S(src, 'aoe_inc') : 0);
  let more = Mo(src, 'dmg_more') * (sk.moreMul || 1) * (o.mult || 1) * mechMult(src) * (has('proj') ? Mo(src, 'proj_more') : 1);
  const hpf = src.hp / s.maxLife;
  if (s.lowLife_more && hpf < 0.35) more *= 1 + s.lowLife_more / 100;
  if (s.fullLife_more && hpf >= 0.999) more *= 1 + s.fullLife_more / 100;
  if (s.ks_berserk) more *= 1 + (s.ks_berserk / 100) * clamp(1 - hpf, 0, 1);
  const dmg = {};
  for (const t in base) {
    if (base[t] <= 0) continue;
    const inc = incAll + S(src, t + '_inc') + (ELEM[t] ? S(src, 'elem_inc') : 0);
    dmg[t] = base[t] * Math.max(0.05, 1 + inc / 100) * more * (ELEM[t] ? Mo(src, 'elem_more') : 1);
  }
  let cc = s.ks_noCrit ? 0 : ((sk.crit ?? (isAtk ? s.wpn.crit : 5)) + S(src, 'crit')) * Math.max(0, 1 + S(src, 'crit_inc') / 100);
  const crit = chance(clamp(cc, 0, 95));
  const ail = {};
  if (!sk.noAil) {
    const bonus = S(src, 'ailChance');
    for (const k in sk.ail || {}) ail[k] = sk.ail[k] + bonus;
    if (dmg.fire) ail.ignite = Math.max(ail.ignite || 0, 10 + bonus);
    if (dmg.cold) ail.chill = Math.max(ail.chill || 0, 10 + bonus);
    if (dmg.light) ail.shock = Math.max(ail.shock || 0, 10 + bonus);
    if (dmg.poison) ail.poison = Math.max(ail.poison || 0, 10 + bonus);
  }
  return { dmg, crit, critMult: (150 + S(src, 'critMulti') + (sk.critMulti || 0)) / 100, tags, ail, leech: s.leechF + (sk.leech || 0), sk, pull: sk.pull };
}

// Hit from a monster / minion with a flat damage number.
export function simpleHit(src, mult = 1, dt = null, ail = null) {
  const d = src.dmg * mult * rnd(0.85, 1.15);
  return { dmg: { [dt || src.dt || 'phys']: d }, crit: false, critMult: 1.5, tags: ['mob'], ail: ail || src.onhit || {}, leech: 0 };
}

export function heal(a, v) { if (a.dead || v <= 0) return; a.hp = Math.min(a.s.maxLife, a.hp + v); }

export function applyHit(src, tgt, hit, o = {}) {
  if (!tgt || tgt.dead || tgt.inv > 0 || tgt.team === 2) return 0;
  const ts = tgt.s, isP = tgt.kind === 'player', srcP = src && (src.kind === 'player' || src.kind === 'minion');
  const owner = src && src.kind === 'minion' ? src.owner : src;
  if (isP && tgt.iframe > 0) { text(tgt.x, tgt.y, 'мимо', '#9cf', 12); return 0; }
  if (!hit.dot && ts.evasionF > 0 && Math.random() < Math.min(0.75, ts.evasionF / (ts.evasionF + 1200 * ((src && src.pow) || 1)))) {
    text(tgt.x, tgt.y, 'уклонение', '#9cf', 12); return 0;
  }
  const blocked = !hit.dot && ts.blockF > 0 && chance(ts.blockF);
  let total = 0, fireD = 0;
  const pen = srcP && owner.s ? (owner.s.pen_all || 0) : 0;
  for (const t in hit.dmg) {
    let d = hit.dmg[t] * (hit.crit ? hit.critMult : 1);
    if (t === 'phys' && ts.armorF > 0) d *= 1 - Math.min(0.85, ts.armorF / (ts.armorF + 8 * d));
    let res = Math.min(75, (ts['res_' + t] || 0) + (t === 'phys' ? 0 : ts.res_all || 0));
    if (srcP && owner.s) res -= pen + (owner.s['pen_' + t] || 0);
    if (tgt.st.weak) res -= 15;
    d *= 1 - Math.max(-100, res) / 100;
    total += d; if (t === 'fire') fireD += d;
  }
  if (tgt.st.shock) total *= tgt.st.shock.v;
  if (tgt.st.mark) total *= 1.35;
  if (tgt.st.weak) total *= 1.2;
  if (src && src.st && src.st.weak) total *= 0.75;
  if (srcP && owner.s) {
    const os = owner.s;
    if (tgt.boss) total *= 1 + (os.bossDmg_inc || 0) / 100; else if (tgt.elite) total *= 1 + (os.eliteDmg_inc || 0) / 100;
    if (os.ail_more && os.ail_more !== 1 && hasAilment(tgt)) total *= os.ail_more;
    if (owner.mech && owner.mech.id === 'range' && hit.tags.includes('proj') && src === owner) total *= 1 + 0.35 * clamp(dist2(src.x, src.y, tgt.x, tgt.y) / 9, 0, 1);
  }
  total *= 1 - Math.min(60, ts.dr || 0) / 100;
  if (blocked) total *= 0.25;
  if (tgt.dmgTaken) total *= tgt.dmgTaken;
  if (total <= 0) return 0;
  if (isP && ts.ks_mind && tgt.mp > 0) {
    const m = Math.min(tgt.mp, total * Math.min(80, ts.ks_mind) / 100);
    tgt.mp -= m; total -= m;
  }
  if (srcP && owner.s && owner.s.execute && !tgt.boss && !tgt.elite && (tgt.hp - total) / ts.maxLife * 100 < owner.s.execute) total = Math.max(total, tgt.hp);
  tgt.hp -= total; tgt.flash = 0.12; tgt.lastHurt = G.time;
  if (tgt.kind === 'mob') { tgt.aggro = true; if (owner && owner.kind === 'player') tgt.tag = true; }
  // feedback
  if (isP) { text(tgt.x, tgt.y, '-' + Math.round(total), blocked ? '#aaa' : '#ff5a5a', blocked ? 12 : 15); G.cam.shake = Math.min(8, G.cam.shake + total / ts.maxLife * 30); }
  else if (!hit.dot || Math.random() < 0.3) {
    const col = hit.crit ? '#ffd24a' : DTC[Object.keys(hit.dmg)[0]] || '#fff';
    text(tgt.x, tgt.y - 0.3, Math.round(total) + (hit.crit ? '!' : ''), col, hit.crit ? 20 : 14, hit.crit);
  }
  if (owner && owner.kind === 'player') {
    G.dps.win.push([G.time, total]);
    if (!hit.dot) {
      if (hit.leech) heal(owner, total * hit.leech / 100);
      if (owner.s.lifeOnHit && !hit.proc) heal(owner, owner.s.lifeOnHit);
    }
  } else if (src && src.kind === 'mob' && src.leech) heal(src, src.s.maxLife * 0.03);
  if (isP && src && src.kind === 'mob' && !hit.dot) {
    if (ts.thorns && dist2(src.x, src.y, tgt.x, tgt.y) < 3.5) applyHit(tgt, src, { dmg: { phys: ts.thorns * (1 + (ts.phys_inc || 0) / 100) }, crit: false, tags: ['thorns'], ail: {}, leech: 0, proc: true });
    if (blocked) { text(tgt.x, tgt.y - 0.6, 'блок', '#ddd', 12); if (tgt.mech && tgt.mech.id === 'faith') heal(tgt, ts.maxLife * 0.04); fireProcs(tgt, 'block', { tgt: src, total }); }
    fireProcs(tgt, 'hurt', { tgt: src, total });
  }
  if (srcP && G.zone.run && G.zone.run.fx.reflect && tgt.kind === 'mob' && !hit.dot && !hit.proc && owner.kind === 'player') {
    owner.hp -= total * G.zone.run.fx.reflect / 100 * 0.2; if (owner.hp <= 0) owner.hp = 1;
  }
  // ailments
  if (!blocked && !hit.dot && tgt.hp > 0) applyAilments(src, tgt, hit, total, fireD);
  if (hit.pull && owner && !tgt.boss && tgt.hp > 0) { const a = Math.atan2(tgt.y - owner.y, tgt.x - owner.x); tgt.x = owner.x + Math.cos(a) * 1.3; tgt.y = owner.y + Math.sin(a) * 1.3; }
  if (owner && owner.kind === 'player' && src === owner && !hit.proc && !hit.dot) {
    if (owner.mech && owner.mech.id === 'rage') { owner.mech.v = Math.min(40, owner.mech.v + 1); owner.mech.t = 4; }
    fireProcs(owner, 'hit', { tgt, total, hit });
    if (hit.crit) fireProcs(owner, 'crit', { tgt, total, hit });
  }
  if (tgt.hp <= 0) kill(tgt, owner, total, hit);
  return total;
}

const hasAilment = (a) => a.st.ignite || a.st.chill || a.st.freeze || a.st.shock || a.st.poison || a.st.bleed || a.st.stun || a.st.weak || a.st.mark || a.st.rot;
function dotScale(src) { const o = src && src.kind === 'minion' ? src.owner : src; return o && o.kind === 'player' ? (1 + (o.s.dot_inc || 0) / 100) * (o.s.dot_more ?? 1) : 1; }
function ccScale(src, tgt) { const o = src && src.kind === 'minion' ? src.owner : src; return (o && o.kind === 'player' ? 1 + (o.s.cc_inc || 0) / 100 : 1) * (tgt.elite ? 0.5 : 1); }

function applyAilments(src, tgt, hit, total, fireD) {
  const a = hit.ail; if (!a) return;
  const ds = dotScale(src), cs = ccScale(src, tgt);
  const set = (id, o) => { const cur = tgt.st[id]; if (!cur || (o.dps || 0) >= (cur.dps || 0) || !o.dps) tgt.st[id] = { ...o, src }; else cur.t = Math.max(cur.t, o.t); };
  if (a.ignite && chance(a.ignite)) set('ignite', { t: 4, dps: (fireD || total * 0.5) * 0.4 * ds, type: 'fire' });
  if (a.poison && chance(a.poison)) { const cur = tgt.st.poison; const dps = total * 0.2 * ds; tgt.st.poison = { t: 3, dps: Math.min((cur ? cur.dps : 0) + dps, dps * 12), type: 'poison', src }; }
  if (a.bleed && chance(a.bleed)) set('bleed', { t: 4, dps: total * 0.3 * ds, type: 'phys' });
  if (a.shock && chance(a.shock)) set('shock', { t: 4, v: 1.2 });
  if (a.freeze && chance(a.freeze) && !tgt.boss) set('freeze', { t: 1.5 * cs });
  else if (a.chill && chance(a.chill)) set('chill', { t: 2.5 * cs, v: tgt.boss ? 0.15 : 0.3 });
  if (a.stun && chance(a.stun) && !tgt.boss) set('stun', { t: 1 * cs });
}
export function addStatus(src, tgt, id, o) { if (!tgt.dead) tgt.st[id] = { ...o, src }; }

export function tickStatuses(a, dt) {
  const st = a.st;
  for (const id in st) {
    const e = st[id]; e.t -= dt;
    if (e.dps) {
      e.acc = (e.acc || 0) + dt;
      if (e.acc >= 0.5) { e.acc -= 0.5; applyHit(e.src, a, { dmg: { [e.type]: e.dps * 0.5 }, crit: false, tags: ['dot'], ail: {}, leech: 0, dot: true, proc: true }); if (a.dead) return; }
    }
    if (e.t <= 0) delete st[id];
  }
}
export const slowMult = (a) => (a.st.freeze || a.st.stun ? 0 : 1) * (a.st.chill ? 1 - a.st.chill.v : 1) * (a.st.slow ? 1 - a.st.slow.v : 1);

// ---- buffs (player)
export function addBuff(p, b) {
  const cur = p.buffs.find((x) => x.id === b.id);
  if (cur) { cur.t = b.t; cur.dur = b.t; if (b.max) cur.stacks = Math.min(b.max, (cur.stacks || 1) + 1); cur.mods = b.mods; }
  else p.buffs.push({ ...b, dur: b.t, stacks: 1 });
  p.dirty = true;
}

// ---- procs from items
export function fireProcs(p, ev, ctx) {
  if (!p.s.procs || !p.s.procs.length) return;
  for (const pr of p.s.procs) {
    if (pr.on !== ev) continue;
    if ((p.pcd[pr.key] || 0) > G.time) continue;
    if (!chance(pr.chV ? pr.v : pr.ch)) continue;
    if (pr.cd) p.pcd[pr.key] = G.time + pr.cd;
    const tgt = ctx.tgt, amt = (ctx.total || 0) * pr.v / 100;
    const mk = (d, ail) => ({ dmg: { [pr.type]: d }, crit: false, tags: ['proc', 'aoe'], ail: ail || {}, leech: 0, proc: true });
    switch (pr.act) {
      case 'chain': chainHit(p, tgt, () => mk(amt), pr.jumps, 6, DTC[pr.type]); break;
      case 'nova': { const c = pr.at === 'target' && tgt ? tgt : p; fx('ring', c.x, c.y, { rad: pr.rad, col: DTC[pr.type] }); hitCircle(p, c.x, c.y, pr.rad, () => mk(amt, pr.ail), 1); break; }
      case 'explode': if (tgt && !tgt.boss) { const d = tgt.s.maxLife * pr.v / 100; fx('ring', tgt.x, tgt.y, { rad: pr.rad, col: DTC[pr.type] }); hitCircle(p, tgt.x, tgt.y, pr.rad, () => mk(d), 1); } break;
      case 'meteor': if (tgt) addArea({ x: tgt.x, y: tgt.y, rad: pr.rad, delay: 0.6, src: p, vs: 1, mk: () => mk(amt, { ignite: 50 }), col: DTC.fire, meteor: 1 }); break;
      case 'buff': addBuff(p, { id: pr.key, name: pr.name, t: pr.dur, mods: [].concat(pr.stat).map((st) => [st, pr.v]) }); break;
      case 'stack': addBuff(p, { id: pr.key, name: pr.name, t: pr.dur, max: pr.max, mods: [[pr.stat, pr.v]] }); break;
      case 'heal': heal(p, p.s.maxLife * pr.v / 100); break;
      case 'repeat': if (tgt && !tgt.dead && ctx.hit) applyHit(p, tgt, { ...ctx.hit, proc: true, ail: {} }); break;
      case 'summon': bus.emit('spawnMinion', { owner: p, m: pr.m, x: tgt ? tgt.x : p.x, y: tgt ? tgt.y : p.y, dur: pr.dur, max: pr.max, key: pr.key, lvl: 1 }); break;
      case 'zone': if (tgt) addArea({ x: tgt.x, y: tgt.y, rad: pr.rad, delay: 0, src: p, vs: 1, zone: { dur: pr.dur, every: 0.5 }, zmk: () => mk(amt * 0.5, { poison: 20 }), col: DTC[pr.type] }); break;
      case 'armorNova': fx('ring', p.x, p.y, { rad: pr.rad, col: '#ddd' }); hitCircle(p, p.x, p.y, pr.rad, () => mk(p.s.armorF * pr.v / 100), 1); break;
    }
  }
}

// ---- death
export function kill(tgt, killer, total, hit) {
  if (tgt.dead) return;
  if (tgt.kind === 'player') {
    if (tgt.mech && tgt.mech.id === 'souls' && (tgt.mech.cheat || 0) <= G.time) { tgt.mech.cheat = G.time + 90; tgt.hp = tgt.s.maxLife * 0.3; tgt.iframe = 1.5; text(tgt.x, tgt.y - 1, 'Обман смерти!', '#b06bff', 18); return; }
    tgt.dead = true; tgt.hp = 0; bus.emit('playerDeath'); return;
  }
  tgt.dead = true; tgt.hp = 0;
  fx('death', tgt.x, tgt.y, { spr: tgt.spr, sv: tgt.sv, sc: tgt.sc, dur: 0.35 });
  if (tgt.kind === 'mob') {
    const p = G.p;
    if (p && !p.dead) {
      if (p.s.lifeOnKill) heal(p, p.s.lifeOnKill);
      if (p.s.manaOnKill) p.mp = Math.min(p.s.maxMana, p.mp + p.s.manaOnKill);
      if (p.mech) {
        if (p.mech.id === 'souls') { p.mech.v = Math.min(20, p.mech.v + 1); p.mech.t = 10; }
        if (p.mech.id === 'pact') heal(p, p.s.maxLife * 0.02);
      }
      fireProcs(p, 'kill', { tgt, total: total || 0, hit });
    }
    bus.emit('mobKilled', tgt, killer);
  }
}

// ---- area helpers
export function hitCircle(src, x, y, rad, mk, vs, o = {}) {
  let n = 0;
  for (const a of G.zone.actors) {
    if (a.dead || a.team === 2 || (vs === 1 ? a.team !== 1 : a.team !== 0)) continue;
    const d = dist2(x, y, a.x, a.y);
    if (d > rad + a.r || (o.inner && d < o.inner - a.r)) continue;
    applyHit(src, a, mk(a)); n++;
  }
  return n;
}
export function hitLine(src, x, y, ang, len, w, mk, vs) {
  const cx = Math.cos(ang), cy = Math.sin(ang);
  for (const a of G.zone.actors) {
    if (a.dead || a.team === 2 || (vs === 1 ? a.team !== 1 : a.team !== 0)) continue;
    const dx = a.x - x, dy = a.y - y, along = dx * cx + dy * cy, perp = Math.abs(-dx * cy + dy * cx);
    if (along >= -a.r && along <= len + a.r && perp <= w / 2 + a.r) applyHit(src, a, mk(a));
  }
}
export function chainHit(src, first, mk, jumps, range = 5, col = '#ffe95e') {
  const seen = new Set(); let cur = first, px = src.x, py = src.y, n = 0;
  while (cur && n <= jumps) {
    seen.add(cur.id); fx('bolt', px, py, { x2: cur.x, y2: cur.y, col, dur: 0.22 });
    applyHit(src, cur, mk(cur)); px = cur.x; py = cur.y; n++;
    cur = nearest(px, py, src.team === 1 ? 1 : 0, range, seen);
    if (cur && cur.team === src.team) cur = null;
  }
}

// Areas: telegraphed strikes and lingering zones.
// {x,y,rad, delay, src, vs, mk (hit on trigger), zone:{dur,every,slow}, zmk (hit per tick), shape:'circle'|'ring'|'line', inner, ang, len, w, col}
export function addArea(a) {
  const z = G.zone; if (!z) return null;
  const ar = { shape: 'circle', t: 0, state: a.delay > 0 ? 0 : 1, life: 0, acc: 0, ...a };
  if (ar.state === 1) trigger(ar);
  z.areas.push(ar); return ar;
}
function trigger(ar) {
  ar.state = 1;
  if (ar.mk) {
    if (ar.shape === 'line') hitLine(ar.src, ar.x, ar.y, ar.ang, ar.len, ar.w, ar.mk, ar.vs);
    else hitCircle(ar.src, ar.x, ar.y, ar.rad, ar.mk, ar.vs, { inner: ar.shape === 'ring' ? ar.inner : 0 });
    fx(ar.shape === 'line' ? 'lineflash' : 'ring', ar.x, ar.y, { rad: ar.rad, col: ar.col, ang: ar.ang, len: ar.len, w: ar.w, inner: ar.inner });
    if (ar.meteor || ar.shake) G.cam.shake = Math.min(10, G.cam.shake + 4);
  }
  if (ar.onTrigger) ar.onTrigger(ar);
  if (!ar.zone) ar.done = true; else ar.life = ar.zone.dur;
}
export function updateAreas(dt) {
  const z = G.zone;
  for (const ar of z.areas) {
    if (ar.done) continue;
    if (ar.src && ar.src.dead && ar.src.kind === 'mob' && ar.state === 0 && !ar.keep) { ar.done = true; continue; }
    if (ar.state === 0) { ar.t += dt; if (ar.t >= ar.delay) trigger(ar); continue; }
    ar.life -= dt; ar.acc += dt;
    if (ar.acc >= ar.zone.every) {
      ar.acc -= ar.zone.every;
      for (const a of z.actors) {
        if (a.dead || a.team === 2 || (ar.vs === 1 ? a.team !== 1 : a.team !== 0)) continue;
        if (dist2(ar.x, ar.y, a.x, a.y) > ar.rad + a.r) continue;
        if (ar.zmk) applyHit(ar.src, a, ar.zmk(a));
        if (ar.zone.slow && !a.dead) a.st.slow = { t: ar.zone.every + 0.2, v: ar.zone.slow / 100 };
      }
    }
    if (ar.life <= 0) ar.done = true;
  }
  if (z.areas.length > 60 || z.areas.some((a) => a.done)) z.areas = z.areas.filter((a) => !a.done);
}

// Projectiles.
export function addProj(p) {
  const z = G.zone; if (!z || z.projs.length > 500) return null;
  const slow = z.run && z.run.fx.slowProj ? 0.5 : 1;
  const pr = { r: 0.25, life: 1.4, pierce: 0, chain: 0, fork: 0, hitT: new Map(), t: 0, col: '#fff', ...p };
  pr.vx *= slow; pr.vy *= slow; if (slow < 1) pr.life *= 1.6;
  z.projs.push(pr); return pr;
}
export function updateProjs(dt) {
  const z = G.zone, map = z.map;
  for (const pr of z.projs) {
    if (pr.dead) continue;
    pr.t += dt; pr.life -= dt;
    if (pr.home && pr.t > 0.1) {
      const tg = nearest(pr.x, pr.y, pr.vs === 1 ? 0 : 1, 7);
      if (tg) { const sp = Math.hypot(pr.vx, pr.vy), want = Math.atan2(tg.y - pr.y, tg.x - pr.x), cur = Math.atan2(pr.vy, pr.vx); let d = want - cur; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; const na = cur + clamp(d, -5 * dt, 5 * dt); pr.vx = Math.cos(na) * sp; pr.vy = Math.sin(na) * sp; }
    }
    if (pr.ret && !pr.back && pr.life < pr.life0 * 0.5) { pr.back = true; pr.hitT.clear(); }
    if (pr.back && pr.src && !pr.src.dead) { const sp = Math.hypot(pr.vx, pr.vy), a = Math.atan2(pr.src.y - pr.y, pr.src.x - pr.x); pr.vx = Math.cos(a) * sp; pr.vy = Math.sin(a) * sp; if (dist2(pr.x, pr.y, pr.src.x, pr.src.y) < 0.6) pr.dead = true; }
    pr.x += pr.vx * dt; pr.y += pr.vy * dt;
    const tx = Math.floor(pr.x), ty = Math.floor(pr.y);
    if (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h || map.solid[ty * map.w + tx] === 1) { if (!pr.back) { projEnd(pr); continue; } }
    if (pr.life <= 0) { projEnd(pr); continue; }
    for (const a of z.actors) {
      if (a.dead || a.team === 2 || (pr.vs === 1 ? a.team !== 1 : a.team !== 0)) continue;
      if (dist2(pr.x, pr.y, a.x, a.y) > pr.r + a.r) continue;
      const last = pr.hitT.get(a.id);
      if (last !== undefined && (!pr.hitcd || pr.t - last < pr.hitcd)) continue;
      pr.hitT.set(a.id, pr.t);
      if (pr.expl && pr.pierce <= 0 && pr.chain <= 0 && pr.fork <= 0) { projEnd(pr); break; }
      applyHit(pr.src, a, pr.mk(a));
      if (pr.onHit) pr.onHit(pr, a);
      if (pr.fork > 0) { pr.fork--; const sp = Math.hypot(pr.vx, pr.vy), an = Math.atan2(pr.vy, pr.vx); for (const o of [-0.5, 0.5]) addProj({ ...pr, hitT: new Map(pr.hitT), vx: Math.cos(an + o) * sp, vy: Math.sin(an + o) * sp, fork: 0, life: 0.7, t: 0 }); projEnd(pr, true); break; }
      if (pr.chain > 0) { pr.chain--; const nx = nearest(a.x, a.y, pr.vs === 1 ? 0 : 1, 6, new Set(pr.hitT.keys())); if (nx) { const sp = Math.hypot(pr.vx, pr.vy), an = Math.atan2(nx.y - pr.y, nx.x - pr.x); pr.vx = Math.cos(an) * sp; pr.vy = Math.sin(an) * sp; pr.life = Math.max(pr.life, 0.6); continue; } }
      if (pr.pierce > 0) { pr.pierce--; continue; }
      projEnd(pr); break;
    }
  }
  if (z.projs.some((p) => p.dead)) z.projs = z.projs.filter((p) => !p.dead);
}
function projEnd(pr, silent) {
  if (pr.dead) return; pr.dead = true;
  if (pr.expl && !silent) { fx('ring', pr.x, pr.y, { rad: pr.expl, col: pr.col }); hitCircle(pr.src, pr.x, pr.y, pr.expl, pr.mk, pr.vs); }
  if (pr.onEnd && !silent) pr.onEnd(pr);
  if (!pr.expl) fx('spark', pr.x, pr.y, { col: pr.col, dur: 0.2 });
}
