// Bot companions in the field: role-based combat AI with human-like reaction time, mistakes and chatter.
import { G } from './state.js';
import { heroTick, heroDash, mkHero } from './hero.js';
import { castSkill, canUse, updateCasting } from './skills.js';
import { slowMult, heal, fx, text } from './combat.js';
import { moveActor, approach, los, pickTarget } from './actors.js';
import { walkable } from './world.js';
import { botById, botSay } from './bots.js';
import { rnd, dist2, chance, bus } from './util.js';

export function spawnAllies() {
  const z = G.zone, p = G.p; z.party = [];
  if (!G.party || !z.run || !z.run.group) return;
  G.party.ids.forEach((id, i) => {
    const b = botById(id); if (!b) return;
    const a = (i / G.party.ids.length) * 6.283, x = p.x + Math.cos(a) * 1.6, y = p.y + Math.sin(a) * 1.6;
    const al = mkHero(b.ch, walkable(z.map, x, y) ? x : p.x, walkable(z.map, x, y) ? y : p.y, 'ally', { bot: b, role: b.role, threatMul: b.role === 'tank' ? 5 : 1, slot: i, ai: { think: 0, seen: new WeakMap(), afk: 0, flaskT: 0, brez: 0 } });
    z.actors.push(al); z.party.push(al);
  });
}
export function reviveHero(h, frac = 0.5) {
  const z = G.zone; if (!h.dead) return;
  h.dead = false; h.hp = h.s.maxLife * frac; h.mp = h.s.maxMana * 0.5; h.st = {}; h.iframe = 2; h.act = null; h.dash = null;
  if (h !== G.p && !z.actors.includes(h)) z.actors.push(h);
  fx('ring', h.x, h.y, { rad: 1.6, col: '#fff2a8', dur: 0.7 });
}

// Where should I run? Reads the same telegraph data the player sees — after a reaction delay, and sometimes not at all.
function danger(a) {
  const z = G.zone, ai = a.ai, sk = a.bot.pers.skill; let vx = 0, vy = 0, hit = false, buster = false;
  for (const ar of z.areas) {
    if (ar.done || ar.vs !== 0 || (ar.trap && ar.state === 0)) continue;
    let n = ai.seen.get(ar);
    if (!n) { n = { at: G.time + rnd(0.18, 0.6) * (1.5 - sk), fail: Math.random() > sk + (ar.soak || ar.spread ? 0.2 : 0.06) }; ai.seen.set(ar, n); }
    if (n.fail || G.time < n.at) continue;
    const dx = a.x - ar.x, dy = a.y - ar.y, d = Math.hypot(dx, dy) || 0.01;
    if (ar.soak) { if (a.role !== 'tank' && ar.state === 0 && d > ar.rad * 0.55) { vx -= (dx / d) * 2; vy -= (dy / d) * 2; hit = true; } continue; }
    if (ar.buster) { if (ar.buster === a) buster = true; continue; }
    if (ar.follow === a) { // I carry a spread mark: get away from the others
      for (const h of z.heroes) { if (h === a || h.dead) continue; const hx = a.x - h.x, hy = a.y - h.y, hd = Math.hypot(hx, hy) || 0.01; if (hd < 5) { vx += hx / hd; vy += hy / hd; hit = true; } }
      continue;
    }
    if (ar.shape === 'line') {
      const cx = Math.cos(ar.ang), cy = Math.sin(ar.ang), along = dx * cx + dy * cy, perp = -dx * cy + dy * cx;
      if (along > -1 && along < ar.len + 1 && Math.abs(perp) < ar.w / 2 + 0.8) { const s = perp >= 0 ? 1 : -1; vx += -cy * s; vy += cx * s; hit = true; }
    } else if (ar.shape === 'ring') {
      if (d > ar.inner - 0.5 && d < ar.rad + 0.5) { vx -= dx / d; vy -= dy / d; hit = true; }
    } else if (d < ar.rad + 0.7) { vx += dx / d; vy += dy / d; hit = true; }
  }
  return { vx, vy, hit, buster };
}

function chooseTarget(a) {
  const z = G.zone, p = G.p; let best = null, bd = 1e9;
  const boss = z.bosses.find((b) => !b.dead && b.engaged);
  if (boss && (a.role === 'tank' || dist2(a.x, a.y, boss.x, boss.y) < 16)) {
    if (a.role !== 'tank') { let add = null, ad = 7; for (const m of z.actors) { if (m.kind !== 'mob' || m.dead || m.boss) continue; const d = dist2(a.x, a.y, m.x, m.y); if (d < ad) { ad = d; add = m; } } if (add && a.slot % 2 === 0) return add; }
    return boss;
  }
  if (a.role !== 'tank') { const tank = z.party.find((x) => x.role === 'tank' && !x.dead && x.ai.tgt && !x.ai.tgt.dead); if (tank && dist2(a.x, a.y, tank.ai.tgt.x, tank.ai.tgt.y) < 14) return tank.ai.tgt; }
  for (const m of z.actors) {
    if (m.kind !== 'mob' || m.dead) continue;
    const d = dist2(a.x, a.y, m.x, m.y); if (d > 13) continue;
    if (!m.aggro && (p.dead || dist2(p.x, p.y, m.x, m.y) > 7)) continue;
    const v = d + (a.role === 'tank' && m.elite ? -3 : 0); if (v < bd) { bd = v; best = m; }
  }
  return best;
}

function tryCast(a, tg, d, bust) {
  const ch = a.ch, z = G.zone; let pick = null, pv = -1;
  for (const id of ch.skills.bar) {
    const sk = a.sk[id]; if (!sk || canUse(a, sk)) continue;
    let ok = false, v = sk.cd;
    switch (sk.t) {
      case 'heal': continue;
      case 'taunt': ok = a.role === 'tank' && tg && d < sk.rad && pickTarget(tg) !== a; v = 100; break;
      case 'buff': ok = !!tg && !a.buffs.some((b) => b.id === 'sk_' + id) && (a.role !== 'tank' || bust || a.hp < a.s.maxLife * 0.65 || !(sk.mods || []).some((m) => m[0] === 'dr' || m[0] === 'block')); if (ok && sk.pulse) ok = d < sk.pulse.rad + 0.5; v = bust ? 200 : 50; break;
      case 'summon': ok = z.minions.filter((m) => !m.dead && m.key === id && m.owner === a).length < sk.max; v = 60; break;
      case 'curse': ok = !!tg && d < sk.range && !tg.st[sk.cid]; break;
      case 'dash': ok = !!tg && !!sk.end && d > 3 && d < sk.dist; break;
      case 'ground': ok = !!tg && (sk.range > 0 ? d < sk.range : d < sk.rad); break;
      case 'nova': ok = !!tg && d < sk.rad * 0.85; break;
      case 'melee': ok = !!tg && d < sk.rng + tg.r; break;
      default: ok = !!tg && d < 9.5 && los(z.map, a.x, a.y, tg.x, tg.y);
    }
    if (ok && v > pv) { pv = v; pick = id; }
  }
  if (!pick) return false;
  if (tg) { a.aim.x = tg.x; a.aim.y = tg.y; } else { a.aim.x = a.x; a.aim.y = a.y; }
  return castSkill(a, pick);
}
function tryHeal(a) {
  const z = G.zone, hs = z.heroes.filter((h) => !h.dead); let low = null, lf = 1, n = 0;
  for (const h of hs) { const f = h.hp / h.s.maxLife; if (f < 0.72) n++; if (f < lf && dist2(a.x, a.y, h.x, h.y) < 11) { lf = f; low = h; } }
  if (!low) return false;
  const use = (id) => { const sk = a.sk[id]; if (!sk || canUse(a, sk)) return false; a.aim.x = low.x; a.aim.y = low.y; return castSkill(a, id); };
  if (lf < 0.45 && use('layhands')) return true;
  if (n >= (hs.length > 6 ? 3 : 2) && use('healwave')) return true;
  if (lf < 0.82 && use('mend')) return true;
  if (lf < 0.6 && use('holylight')) return true;
  return false;
}

export function updateAlly(a, dt) {
  if (!heroTick(a, dt)) return;
  if (heroDash(a, dt)) return;
  const z = G.zone, map = z.map, p = G.p, ai = a.ai, b = a.bot;
  if (a.mv > 0) a.mv -= dt; if (a.lunge > 0) a.lunge -= dt;
  if (a.st.freeze || a.st.stun) { updateCasting(a, dt); return; }
  const speed = a.s.moveSpeed * slowMult(a) * (a.act && !a.act.fired ? 0.35 : 1);
  const go = (vx, vy, k = 1) => { const l = Math.hypot(vx, vy) || 1; moveActor(a, (vx / l) * speed * k * dt, (vy / l) * speed * k * dt, map); };
  // potion (refills slowly)
  ai.flaskT -= dt; if (ai.flaskT <= 0) { ai.flaskT = 30; if (a.flask.n < a.ch.flask.max) a.flask.n++; }
  if (a.hp < a.s.maxLife * 0.32 && a.flask.n > 0 && !(z.run.fx.noFlask)) { a.flask.n--; heal(a, a.s.maxLife * 0.45); fx('ring', a.x, a.y, { rad: 1.2, col: '#f44', dur: 0.4 }); }
  const dg = danger(a);
  const tg = (ai.tgt = chooseTarget(a));
  const inFight = !!tg || z.bosses.some((x) => !x.dead && x.engaged);
  // resurrection: healers raise the fallen (one battle-res per minute during boss fights)
  if (a.role === 'healer' && !dg.hit) {
    const dead = z.party.find((h) => h.dead) || (p.dead ? p : null);
    const bossUp = z.bosses.some((x) => !x.dead && x.engaged);
    if (dead && (!bossUp || ai.brez <= G.time) && (!ai.rez || ai.rez.tgt !== dead)) ai.rez = { tgt: dead, t: bossUp ? 3 : 2 };
    if (ai.rez) {
      const r = ai.rez; if (!r.tgt.dead) ai.rez = null;
      else if (dist2(a.x, a.y, r.tgt.x, r.tgt.y) > 4) { go(r.tgt.x - a.x, r.tgt.y - a.y); return; }
      else { r.t -= dt; a.wind = 0.1; if (r.t <= 0) { ai.rez = null; if (bossUp) ai.brez = G.time + 60; bus.emit('revive', r.tgt); if (chance(40)) botSay(b, 'rez', {}, 'party'); } updateCasting(a, dt); return; }
    }
  }
  if (ai.afk > G.time && !inFight) { updateCasting(a, dt); return; }
  if (dg.hit) go(dg.vx, dg.vy);
  // decide on a skill
  if (!a.act && G.time >= ai.think) {
    const d = tg ? dist2(a.x, a.y, tg.x, tg.y) : 99;
    let cast = false;
    if (a.role === 'healer') cast = tryHeal(a);
    if (!cast && (tg || a.role !== 'healer')) cast = tryCast(a, tg, d, dg.buster);
    ai.think = G.time + rnd(0.05, 0.28) * (1.6 - b.pers.skill) + (cast ? 0 : 0.1);
  }
  updateCasting(a, dt);
  if (dg.hit) return;
  // positioning
  if (tg) {
    const d = dist2(a.x, a.y, tg.x, tg.y), ranged = a.s.wpn.rng || a.s.wpn.cast || a.role === 'healer';
    const want = ranged ? 6.5 : a.r + tg.r + 0.9;
    if (ranged) {
      if (d > want + 1.5 || !los(map, a.x, a.y, tg.x, tg.y)) go(tg.x - a.x, tg.y - a.y);
      else if (d < 3.5) go(a.x - tg.x, a.y - tg.y, 0.8);
      else if (a.role === 'healer') { const t = z.party.find((x) => x.role === 'tank' && !x.dead) || p; if (dist2(a.x, a.y, t.x, t.y) > 9) go(t.x - a.x, t.y - a.y); }
    } else if (d > want) go(tg.x - a.x, tg.y - a.y);
    else if (a.role === 'tank' && tg.boss) { /* hold the boss still */ }
    return;
  }
  // out of combat: follow the leader in a loose formation, sometimes drift off
  if (!ai.afk && b.pers.skill < 0.75 && Math.random() < 0.00012) { ai.afk = G.time + rnd(4, 8); botSay(b, 'afk', {}, 'party'); return; }
  if (ai.afk && ai.afk < G.time) ai.afk = 0;
  const lead = p.dead ? z.party.find((x) => !x.dead) || p : p;
  const ang = a.slot * 2.4, fx0 = lead.x + Math.cos(ang) * (1.6 + (a.slot % 3) * 0.7), fy0 = lead.y + Math.sin(ang) * (1.6 + (a.slot % 3) * 0.7);
  const dl = dist2(a.x, a.y, lead.x, lead.y);
  if (dl > 22) { a.x = lead.x; a.y = lead.y; return; }
  if (dl > 4) approach(a, lead, speed, dt, map, lead === p);
  else if (dist2(a.x, a.y, fx0, fy0) > 1 && walkable(map, fx0, fy0)) go(fx0 - a.x, fy0 - a.y, 0.7);
}
bus.on('allyDeath', (a) => { if (a.bot && chance(35 + 40 * a.bot.pers.chatty)) botSay(a.bot, 'dead', {}, 'party'); });
