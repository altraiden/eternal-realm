// Shared logic for hero actors: the player and bot allies use the same stat sheet, skills and ticking.
import { G } from './state.js';
import { CLASSES } from './data/classes.js';
import { calcStats } from './stats.js';
import { resolveAll, updateCasting } from './skills.js';
import { mkActor } from './actors.js';
import { tickStatuses, heal } from './combat.js';
import { bus } from './util.js';

export function refreshActor(a, full) {
  const f = a.s && a.s.maxLife > 1 ? [a.hp / a.s.maxLife, a.s.maxMana ? a.mp / a.s.maxMana : 1] : null;
  a.s = calcStats(a.ch, a.buffs, G.zone && G.zone.run ? G.zone.run.fx : {});
  if (full && f) { a.hp = a.s.maxLife * f[0]; a.mp = a.s.maxMana * f[1]; }
  a.hp = Math.min(a.hp, a.s.maxLife); a.mp = Math.min(a.mp, a.s.maxMana);
  resolveAll(a); a.dirty = false;
  if (a === G.p) bus.emit('statsChanged');
}
export function mkHero(ch, x, y, kind = 'player', extra = {}) {
  const cls = CLASSES[ch.cls];
  ch.flask ||= { max: 3, pow: 45 };
  const a = mkActor({ kind, team: 0, hero: true, ch, cls: ch.cls, spr: cls.spr, name: ch.name, x, y, r: 0.36, sc: 3, buffs: [], cdT: {}, pcd: {}, timers: [], pulses: [], iframe: 0, mech: { id: cls.mech.id, v: 0, t: 0, ready: false }, flask: { n: ch.flask.max, kills: 0 }, rollCd: 0, dirty: false, aim: { x, y }, threatMul: 1, dmgDone: 0, healDone: 0, ...extra });
  refreshActor(a); a.hp = a.s.maxLife; a.mp = a.s.maxMana;
  return a;
}
// Buffs, class mechanic decay, regeneration, statuses. Returns false when the hero cannot act (dead).
export function heroTick(a, dt) {
  if (a.dirty) refreshActor(a);
  let ch = false;
  for (const b of a.buffs) { b.t -= dt; if (b.t <= 0) ch = true; }
  if (ch) { a.buffs = a.buffs.filter((b) => b.t > 0); refreshActor(a); }
  if (a.dead) return false;
  const m = a.mech, s = a.s;
  if (m.id === 'rage') { m.t -= dt; if (m.t <= 0 && m.v > 0) m.v = Math.max(0, m.v - 10 * dt); }
  else if (m.id === 'combo' || m.id === 'souls') { if (m.v > 0) { m.t -= dt; if (m.t <= 0) m.v = 0; } }
  else if (m.id === 'nature' && !m.ready) { m.t -= dt; if (m.t <= 0) m.ready = true; }
  if (s.regen) heal(a, s.regen * dt);
  a.mp = Math.min(s.maxMana, a.mp + s.manaRegen * dt);
  if (a.iframe > 0) a.iframe -= dt;
  tickStatuses(a, dt);
  return !a.dead;
}
// Dash interpolation shared by player and allies. Returns true while dashing.
export function heroDash(a, dt) {
  const d = a.dash; if (!d) return false;
  d.t += dt; const k = Math.min(1, d.t / d.dur);
  a.x = d.x0 + (d.x - d.x0) * k; a.y = d.y0 + (d.y - d.y0) * k; a.mv = 0.1;
  if (k >= 1) { a.dash = null; if (d.land) d.land(); }
  updateCasting(a, dt);
  return true;
}
