// Skill engine: resolves a skill with its modifiers and executes one of the behaviour archetypes.
import { G } from './state.js';
import { SKILLS } from './data/skills.js';
import { SUPPORTS } from './data/supports.js';
import { DTC } from './data/defs.js';
import { buildHit, hitCircle, chainHit, addArea, addProj, addBuff, addStatus, nearest, fx, text, heal, applyHit } from './combat.js';
import { rnd, clamp, dist2, chance, bus } from './util.js';

const TAG_LV = ['fire', 'cold', 'light', 'phys', 'dark', 'holy', 'poison', 'minion'];
export const supOK = (def, S) => { const tags = def.tg.split(' '); return S.req.some((t) => tags.includes(t)) && !(S.not || []).some((t) => tags.includes(t)); };
export const maxSockets = (lvl) => (lvl >= 95 ? 4 : lvl >= 80 ? 3 : 2);

export function resolveSkill(p, id) {
  const def = SKILLS[id], s = p.s;
  const sk = { ...def, id, tags: def.tg.split(' ') };
  for (const k of ['zone', 'ail', 'end', 'pulse', 'buff', 'conv', 'd']) if (def[k]) sk[k] = { ...def[k] };
  let lvl = 1 + Math.floor((s.level - 70) / 3) + (s.skill_all || 0) + (def.c === p.cls ? 2 : 0);
  for (const t of TAG_LV) if (sk.tags.includes(t)) lvl += s['sk_' + t] || 0;
  sk.lvl = Math.max(1, lvl);
  let more = 1, cost = 1, speed = 0;
  const sups = (p.ch.skills.sup[id] || []).slice(0, maxSockets(s.level)).filter((x) => SUPPORTS[x] && supOK(def, SUPPORTS[x]));
  sk.sups = sups;
  for (const x of sups) {
    const S = SUPPORTS[x];
    more *= 1 + (S.more || 0) / 100; cost *= 1 + (S.cost || 0) / 100; speed += S.speed || 0;
    if (S.add) for (const k in S.add) sk[k] = (sk[k] || 0) + S.add[k];
    if (S.mul) for (const k in S.mul) if (sk[k]) sk[k] *= S.mul[k];
    if (S.mul && sk.pulse && S.mul.rad) sk.pulse.rad *= S.mul.rad;
    if (S.mul && sk.end && S.mul.rad) sk.end.rad *= S.mul.rad;
    if (S.set) Object.assign(sk, S.set);
    if (S.tags) for (const t of S.tags) if (!sk.tags.includes(t)) sk.tags.push(t);
    if (S.ail) { sk.ail = { ...(sk.ail || {}) }; for (const k in S.ail) sk.ail[k] = (sk.ail[k] || 0) + S.ail[k]; }
    if (S.critMulti) sk.critMulti = (sk.critMulti || 0) + S.critMulti;
    if (S.zdur && sk.zone) sk.zone.dur *= S.zdur;
  }
  if (sk.t === 'proj') { sk.n1 = (sk.n1 || 1) + (s.proj_extra || 0); sk.spd *= 1 + (s.projSpeed_inc || 0) / 100; }
  const am = Math.sqrt(Math.max(0.2, 1 + (s.area_inc || 0) / 100));
  for (const k of ['rad', 'expl']) if (sk[k] && sk.t !== 'proj' || k === 'expl' && sk[k]) sk[k] *= am;
  if (sk.pulse) sk.pulse.rad *= am; if (sk.end) sk.end.rad *= am;
  const dm = 1 + (s.duration_inc || 0) / 100;
  if (sk.dur) sk.dur *= dm; if (sk.zone) sk.zone.dur *= dm; if (sk.mdur) sk.mdur *= dm;
  sk.cd = (sk.cd || 0) / (1 + (s.cdr || 0) / 100);
  sk.cost = Math.round((def.mana || 0) * cost * Math.max(0.2, 1 + (s.cost_inc || 0) / 100) * (s.cost_more ?? 1) * (1 + 0.03 * (sk.lvl - 1)));
  if (sk.t === 'summon') sk.max = Math.max(1, (sk.max || 1) + (s.minion_extra || 0));
  const sm = (s.speed_more ?? 1) * (1 + speed / 100);
  let period;
  if (sk.wm && sk.t !== 'buff') period = 1 / (s.wpn.aps * (sk.as || 1) * Math.max(0.2, 1 + (s.atkSpeed_inc || 0) / 100) * sm);
  else period = (sk.ct || 0.2) / (Math.max(0.2, 1 + (s.castSpeed_inc || 0) / 100) * sm);
  sk.wind = period * 0.45; sk.rec = period * 0.55;
  sk.moreMul = more;
  sk.col = DTC[primaryType(sk)] || '#fff';
  return sk;
}
function primaryType(sk) {
  if (sk.infuse) return sk.infuse;
  for (const t of ['fire', 'cold', 'light', 'poison', 'dark', 'holy']) if (sk.tags.includes(t)) return t;
  return 'phys';
}
export function resolveAll(p) {
  p.sk = {};
  for (const id of p.ch.skills.bar) if (id) p.sk[id] = resolveSkill(p, id);
}

// Rough DPS number for the skill tooltip.
export function skillDps(p, sk) {
  if (sk.t === 'heal' || sk.t === 'taunt' || sk.t === 'summon' || sk.t === 'buff' && !sk.pulse || sk.t === 'dash' && !sk.end || sk.t === 'curse' && !sk.d) return 0;
  let sum = 0;
  for (let i = 0; i < 24; i++) { const h = buildHit(p, sk); let d = 0; for (const t in h.dmg) d += h.dmg[t]; sum += d * (h.crit ? h.critMult : 1); }
  const per = sum / 24, period = sk.wind + sk.rec;
  return sk.cd > period ? per / sk.cd : per / period;
}

export function canUse(p, sk) {
  if (!sk) return 'нет навыка';
  if ((p.cdT[sk.id] || 0) > G.time) return 'перезарядка';
  if (sk.tags.includes('bow') && !p.s.wpn.rng) return 'нужен лук или арбалет';
  if (sk.tags.includes('melee') && sk.tags.includes('attack') && p.s.wpn.rng) return 'нужно оружие ближнего боя';
  if (p.s.ks_blood) { if (p.hp <= sk.cost) return 'мало здоровья'; } else if (p.mp < sk.cost) return 'мало маны';
  return null;
}

export const useSkill = (p, slot) => castSkill(p, p.ch.skills.bar[slot]);
export function castSkill(p, id) {
  if (!id || p.act || p.dead) return false;
  const sk = p.sk[id];
  const why = canUse(p, sk);
  if (why) { if (p === G.p && why !== 'перезарядка' && (p.warnT || 0) < G.time) { p.warnT = G.time + 0.8; text(p.x, p.y - 1, why, '#f88', 12); } return false; }
  let wind = sk.wind, rec = sk.rec;
  if (p.mech && p.mech.id === 'combo') { const k = 1 + p.mech.v * 0.03; wind /= k; rec /= k; }
  p.act = { sk, t: wind, rec, fired: false };
  p.face = p.aim.x - p.aim.y >= p.x - p.y ? 1 : -1;
  return true;
}

export function updateCasting(p, dt) {
  const a = p.act;
  if (a) {
    if (!a.fired) {
      a.t -= dt;
      if (a.t <= 0) {
        a.fired = true;
        const sk = a.sk;
        let free = false, bonus = 1;
        for (const pr of p.s.procs) if (pr.on === 'cast' && pr.act === 'freecast' && sk.tags.includes('spell') && chance(pr.ch)) { free = true; bonus = 1 + pr.v / 100; }
        if (!free) { if (p.s.ks_blood) p.hp -= sk.cost; else p.mp -= sk.cost; }
        if (sk.cd > 0) p.cdT[sk.id] = G.time + sk.cd;
        const m = p.mech;
        if (m && m.id === 'combo') { if (m.last !== sk.id) m.v = Math.min(5, m.v + 1); m.last = sk.id; m.t = 5; }
        exec(p, sk, p.aim.x, p.aim.y, { mult: bonus });
        if (m && m.id === 'nature' && m.ready) { m.ready = false; m.t = 5; heal(p, p.s.maxLife * 0.06); }
        if (sk.echo) p.timers.push({ t: 0.28, fn: () => exec(p, sk, p.aim.x, p.aim.y, { mult: bonus, echo: true }) });
      }
    } else { a.rec -= dt; if (a.rec <= 0) p.act = null; }
  }
  for (const t of p.timers) { t.t -= dt; if (t.t <= 0) { t.done = true; if (!p.dead) t.fn(); } }
  if (p.timers.some((t) => t.done)) p.timers = p.timers.filter((t) => !t.done);
  for (const pu of p.pulses) {
    pu.t -= dt; pu.acc += dt;
    if (pu.acc >= pu.every) { pu.acc -= pu.every; fx('ring', p.x, p.y, { rad: pu.rad, col: pu.sk.col, dur: 0.2 }); hitCircle(p, p.x, p.y, pu.rad, () => buildHit(p, pu.sk), 1); }
  }
  if (p.pulses.some((x) => x.t <= 0)) p.pulses = p.pulses.filter((x) => x.t > 0);
  updateTraps();
}

function leaveZone(p, sk, x, y, mult) {
  const z = sk.leaveZone; if (!z) return;
  addArea({ x, y, rad: z.rad, delay: 0, src: p, vs: 1, zone: { dur: z.dur, every: z.every }, zmk: () => scaleHit(buildHit(p, { ...sk, infuse: z.type, ail: { ignite: 30 } }, { mult }), z.tick), col: DTC[z.type] });
}
function scaleHit(h, k) { for (const t in h.dmg) h.dmg[t] *= k; return h; }
function walkTo(map, x0, y0, x1, y1) {
  const d = dist2(x0, y0, x1, y1), n = Math.ceil(d / 0.25); let x = x0, y = y0;
  for (let i = 1; i <= n; i++) {
    const nx = x0 + (x1 - x0) * i / n, ny = y0 + (y1 - y0) * i / n;
    if (map.solid[Math.floor(ny) * map.w + Math.floor(nx)]) break;
    x = nx; y = ny;
  }
  return [x, y];
}
function groundStrike(p, sk, x, y, mult, rad, delay) {
  const z = sk.zone;
  addArea({
    x, y, rad, delay, src: p, vs: 1, col: sk.col, meteor: delay > 0.5,
    mk: z && z.tick >= 1 ? null : () => buildHit(p, sk, { mult }),
    zone: z ? { dur: z.dur, every: z.every, slow: z.slow } : null,
    zmk: z ? () => scaleHit(buildHit(p, sk, { mult }), z.tick >= 1 ? z.every : z.tick) : null,
    onTrigger: () => leaveZone(p, sk, x, y, mult),
  });
}

export function exec(p, sk, tx, ty, o = {}) {
  const mult = o.mult || 1, map = G.zone.map;
  const ang = Math.atan2(ty - p.y, tx - p.x);
  const mk = () => buildHit(p, sk, { mult });
  switch (sk.t) {
    case 'melee': {
      const hits = sk.hits || 1;
      const swing = () => {
        fx('slash', p.x, p.y, { ang, rad: sk.rng, arc: sk.arc, col: sk.col, dur: 0.18 });
        const half = (sk.arc * Math.PI / 180) / 2; let n = 0;
        for (const a of G.zone.actors) {
          if (a.dead || a.team !== 1) continue;
          const d = dist2(p.x, p.y, a.x, a.y);
          if (d > sk.rng + a.r) continue;
          let da = Math.atan2(a.y - p.y, a.x - p.x) - ang; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
          if (Math.abs(da) > half && d > a.r + 0.6) continue;
          applyHit(p, a, mk()); n++;
        }
        if (n && sk.leaveZone) leaveZone(p, sk, p.x + Math.cos(ang) * 1.4, p.y + Math.sin(ang) * 1.4, mult);
      };
      swing();
      for (let i = 1; i < hits; i++) p.timers.push({ t: i * 0.11, fn: swing });
      break;
    }
    case 'proj': {
      if (sk.toGround) {
        const d = Math.min(10, dist2(p.x, p.y, tx, ty));
        const n = sk.n1 || 1;
        for (let i = 0; i < n; i++) { const off = i ? rnd(0.8, 2.6) : 0, oa = rnd(0, 6.28); groundStrike(p, sk, p.x + Math.cos(ang) * d + Math.cos(oa) * off, p.y + Math.sin(ang) * d + Math.sin(oa) * off, mult, sk.toGround.rad, sk.toGround.delay + i * 0.08); }
        break;
      }
      const n = sk.n1 || 1, spread = ((sk.spread || Math.min(60, 9 * (n - 1))) * Math.PI) / 180;
      const life = sk.life || 1.25;
      for (let i = 0; i < n; i++) {
        const a = ang + (n > 1 ? -spread / 2 + (spread * i) / (n - 1) : 0);
        addProj({
          x: p.x + Math.cos(a) * 0.5, y: p.y + Math.sin(a) * 0.5, vx: Math.cos(a) * sk.spd, vy: Math.sin(a) * sk.spd, r: sk.rad || 0.25, life, life0: life,
          src: p, vs: 1, mk, pierce: sk.pierce || 0, chain: sk.chain || 0, fork: sk.fork || 0, expl: sk.expl || 0, home: sk.home, ret: sk.ret, hitcd: sk.hitcd,
          col: sk.col, big: (sk.rad || 0) > 0.6, serpent: sk.serpent, arrow: sk.tags.includes('bow') || sk.id === 'fanknives',
          onEnd: sk.leaveZone ? (pr) => leaveZone(p, sk, pr.x, pr.y, mult) : null,
        });
      }
      break;
    }
    case 'nova':
      fx('ring', p.x, p.y, { rad: sk.rad, col: sk.col, dur: 0.35 });
      hitCircle(p, p.x, p.y, sk.rad, mk, 1);
      if (sk.heal) heal(p, p.s.maxLife * sk.heal / 100);
      if (sk.leaveZone) leaveZone(p, sk, p.x, p.y, mult);
      if (sk.cascade) for (let i = 0; i < sk.cascade; i++) { const a = rnd(0, 6.28); const [x, y] = walkTo(map, p.x, p.y, p.x + Math.cos(a) * 3, p.y + Math.sin(a) * 3); addArea({ x, y, rad: sk.rad * 0.8, delay: 0.25 + i * 0.15, src: p, vs: 1, mk, col: sk.col }); }
      break;
    case 'ground': {
      let x = p.x, y = p.y;
      if (sk.range > 0) { const d = Math.min(sk.range, dist2(p.x, p.y, tx, ty)); x = p.x + Math.cos(ang) * d; y = p.y + Math.sin(ang) * d; }
      const n = sk.multi || 1;
      for (let i = 0; i < n; i++) {
        const off = n > 1 ? rnd(0, sk.scatter || 3) : 0, oa = rnd(0, 6.28);
        groundStrike(p, sk, x + Math.cos(oa) * off, y + Math.sin(oa) * off, mult, sk.rad, (sk.delay || 0) + i * 0.12);
      }
      if (sk.cascade) for (let i = 0; i < sk.cascade; i++) { const oa = rnd(0, 6.28); groundStrike(p, sk, x + Math.cos(oa) * 2.6, y + Math.sin(oa) * 2.6, mult, sk.rad, (sk.delay || 0) + 0.25 + i * 0.15); }
      break;
    }
    case 'chain': {
      let first = nearest(tx, ty, 0, 3.5);
      if (!first || dist2(p.x, p.y, first.x, first.y) > sk.rng) first = nearest(p.x, p.y, 0, sk.rng);
      if (!first) { fx('spark', p.x + Math.cos(ang) * 2, p.y + Math.sin(ang) * 2, { col: sk.col }); break; }
      chainHit(p, first, mk, (sk.jumps || 1) - 1 + (sk.chain || 0), 5.5, sk.col);
      break;
    }
    case 'dash': {
      const d = Math.min(sk.dist, Math.max(1.5, dist2(p.x, p.y, tx, ty)));
      const [x, y] = walkTo(map, p.x, p.y, p.x + Math.cos(ang) * d, p.y + Math.sin(ang) * d);
      const land = () => {
        if (sk.end) { fx('ring', p.x, p.y, { rad: sk.end.rad, col: sk.col }); hitCircle(p, p.x, p.y, sk.end.rad, mk, 1); if (sk.leaveZone) leaveZone(p, sk, p.x, p.y, mult); }
        if (sk.buff) addBuff(p, { id: 'sk_' + sk.id, name: sk.n, t: sk.buff.dur * (1 + (p.s.duration_inc || 0) / 100), mods: sk.buff.mods });
      };
      if (sk.blink) { fx('poof', p.x, p.y, { col: sk.col }); p.x = x; p.y = y; fx('poof', x, y, { col: sk.col }); p.iframe = Math.max(p.iframe, 0.25); land(); }
      else { p.dash = { x0: p.x, y0: p.y, x, y, t: 0, dur: Math.max(0.12, d / 30), land }; p.iframe = Math.max(p.iframe, 0.3); }
      break;
    }
    case 'summon': bus.emit('summonSkill', { p, sk, x: tx, y: ty }); break;
    case 'heal': {
      const hs = G.zone.heroes.filter((h) => !h.dead); let tg;
      if (sk.rad) tg = hs.filter((h) => dist2(p.x, p.y, h.x, h.y) <= sk.rad);
      else {
        let best = null, bd = 2.5;
        for (const h of hs) { const d = dist2(tx, ty, h.x, h.y); if (d < bd && dist2(p.x, p.y, h.x, h.y) <= sk.range) { bd = d; best = h; } }
        if (!best) { let bf = 0.999; for (const h of hs) { const f = h.hp / h.s.maxLife; if (f < bf && dist2(p.x, p.y, h.x, h.y) <= sk.range) { bf = f; best = h; } } }
        tg = [best || p];
      }
      let total = 0;
      for (const h of tg) { const v = Math.min(h.s.maxLife - h.hp, h.s.maxLife * (sk.hpPct / 100) * (1 + 0.04 * (sk.lvl - 1)) * (1 + (p.s.holy_inc || 0) / 300) * mult); if (v <= 0) continue; heal(h, v); total += v; fx('ring', h.x, h.y, { rad: 1.1, col: '#7be04a', dur: 0.4 }); if (h === G.p || p === G.p) text(h.x, h.y - 0.4, '+' + Math.round(v), '#7be04a', 13); }
      p.healDone = (p.healDone || 0) + total; bus.emit('healed', p, total);
      break;
    }
    case 'taunt':
      addBuff(p, { id: 'sk_' + sk.id, name: sk.n, t: sk.dur, mods: sk.mods || [] });
      fx('ring', p.x, p.y, { rad: sk.rad, col: '#6f8fff', dur: 0.5 }); bus.emit('taunt', p, sk.rad);
      break;
    case 'buff':
      addBuff(p, { id: 'sk_' + sk.id, name: sk.n, t: sk.dur, mods: sk.mods || [], icon: sk.i });
      fx('ring', p.x, p.y, { rad: 1.6, col: '#ffd27a', dur: 0.4 });
      if (sk.heal) heal(p, p.s.maxLife * sk.heal / 100);
      if (sk.pulse) p.pulses.push({ sk, t: sk.dur, acc: sk.pulse.every, every: sk.pulse.every, rad: sk.pulse.rad });
      break;
    case 'curse': {
      const d = Math.min(sk.range, dist2(p.x, p.y, tx, ty)), x = p.x + Math.cos(ang) * d, y = p.y + Math.sin(ang) * d;
      fx('ring', x, y, { rad: sk.rad, col: '#b06bff', dur: 0.5 });
      for (const a of G.zone.actors) {
        if (a.dead || a.team !== 1 || dist2(x, y, a.x, a.y) > sk.rad + a.r) continue;
        if (sk.d) { const h = mk(); let tot = 0; for (const t in h.dmg) tot += h.dmg[t] * (h.crit ? h.critMult : 1); addStatus(p, a, sk.cid, { t: sk.dur, dps: tot * (1 + (p.s.dot_inc || 0) / 100) * (p.s.dot_more ?? 1), type: 'dark' }); }
        else addStatus(p, a, sk.cid, { t: sk.dur });
        a.aggro = true;
      }
      break;
    }
    case 'trap': {
      const d = Math.min(8, dist2(p.x, p.y, tx, ty)), n = sk.n1 || 1;
      const mine = G.zone.areas.filter((a) => a.trap === sk.id && !a.done);
      while (mine.length + n > sk.max && mine.length) mine.shift().done = true;
      for (let i = 0; i < n; i++) {
        const oa = rnd(0, 6.28), off = i ? 1.6 : 0;
        const [x, y] = walkTo(map, p.x, p.y, p.x + Math.cos(ang) * d + Math.cos(oa) * off, p.y + Math.sin(ang) * d + Math.sin(oa) * off);
        const z = sk.zone;
        addArea({ x, y, rad: sk.rad, delay: 1e9, src: p, vs: 1, col: sk.col, trap: sk.id, trig: sk.trig, arm: G.time + 0.5, ttl: G.time + sk.dur, keep: 1, mk, zone: z ? { dur: z.dur, every: z.every } : null, zmk: z ? () => scaleHit(buildHit(p, sk, { mult }), z.tick) : null });
      }
      break;
    }
  }
}

function updateTraps() {
  for (const ar of G.zone.areas) {
    if (!ar.trap || ar.state !== 0 || ar.done) continue;
    if (G.time > ar.ttl) { ar.done = true; continue; }
    if (G.time < ar.arm) continue;
    for (const a of G.zone.actors) if (!a.dead && a.team === 1 && dist2(ar.x, ar.y, a.x, a.y) < ar.trig + a.r) { ar.delay = 0; break; }
  }
}
