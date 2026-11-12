// Small shared helpers: RNG, math, events.
export function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const rnd = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const rint = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const chance = (pct) => Math.random() * 100 < pct;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const dist2 = (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2);
export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function wpick(list, wf, r = Math.random) {
  let tot = 0;
  for (const it of list) tot += wf(it);
  let x = r() * tot;
  for (const it of list) { x -= wf(it); if (x <= 0) return it; }
  return list[list.length - 1];
}
export function shuffle(arr, r = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}
export const fmt = (n) => {
  n = Math.round(n);
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'млрд';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'м';
  if (n >= 1e4) return (n / 1e3).toFixed(1) + 'к';
  return String(n);
};
let _uid = Date.now() % 1e9;
export const uid = () => (++_uid).toString(36) + Math.floor(Math.random() * 1296).toString(36);

const handlers = {};
export const bus = {
  on(ev, fn) { (handlers[ev] ||= []).push(fn); },
  emit(ev, ...a) { (handlers[ev] || []).forEach((f) => f(...a)); },
};
