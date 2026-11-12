// Procedural maps: caves, room dungeons, arenas and the hub. Tiles: t=1 floor. solid: 1 wall/void, 2 decor.
import { mulberry, wpick } from './util.js';
import { BIOMES } from './data/monsters.js';

function blank(w, h, biome) {
  return { w, h, biome, t: new Uint8Array(w * h), solid: new Uint8Array(w * h), va: new Uint8Array(w * h), seen: new Uint8Array(w * h), flow: new Int16Array(w * h).fill(32767), decor: [], packs: [], chests: [], shrines: [], traps: [], rooms: [], npcs: [], start: { x: 2, y: 2 }, bossPos: null, exit: null };
}
const I = (m, x, y) => y * m.w + x;
export const isFloor = (m, x, y) => x >= 0 && y >= 0 && x < m.w && y < m.h && m.t[y * m.w + x] === 1;
export const walkable = (m, x, y, fly) => { const tx = Math.floor(x), ty = Math.floor(y); if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return false; const s = m.solid[ty * m.w + tx]; return s === 0 || (fly && s === 2); };

function finish(m, r) {
  for (let i = 0; i < m.t.length; i++) { m.solid[i] = m.t[i] === 1 ? 0 : 1; m.va[i] = Math.floor(r() * 4); }
}
export function bfs(m, sx, sy, maxD = 1e9, out = null) {
  const d = out || new Int16Array(m.w * m.h); d.fill(32767);
  const q = new Int32Array(m.w * m.h); let qh = 0, qt = 0;
  const s = I(m, Math.floor(sx), Math.floor(sy)); d[s] = 0; q[qt++] = s;
  while (qh < qt) {
    const c = q[qh++], cd = d[c]; if (cd >= maxD) continue;
    const cx = c % m.w, cy = (c / m.w) | 0;
    for (let k = 0; k < 4; k++) {
      const nx = cx + (k === 0 ? 1 : k === 1 ? -1 : 0), ny = cy + (k === 2 ? 1 : k === 3 ? -1 : 0);
      if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
      const n = ny * m.w + nx;
      if (m.solid[n] || d[n] <= cd + 1) continue;
      d[n] = cd + 1; q[qt++] = n;
    }
  }
  return d;
}
export function updateFlow(m, px, py) { bfs(m, px, py, 34, m.flow); }

function openArea(m, x, y, rad) {
  for (let j = -rad; j <= rad; j++) for (let i = -rad; i <= rad; i++) if (!isFloor(m, x + i, y + j)) return false;
  return true;
}
function carveDisc(m, cx, cy, rad) {
  for (let j = -rad; j <= rad; j++) for (let i = -rad; i <= rad; i++) {
    const x = cx + i, y = cy + j;
    if (x > 1 && y > 1 && x < m.w - 2 && y < m.h - 2 && i * i + j * j <= rad * rad) m.t[I(m, x, y)] = 1;
  }
}
function placeDecor(m, r, density, avoid) {
  const b = BIOMES[m.biome];
  for (let y = 2; y < m.h - 2; y++) for (let x = 2; x < m.w - 2; x++) {
    if (m.t[I(m, x, y)] !== 1 || m.solid[I(m, x, y)] || r() > density) continue;
    if (avoid.some((a) => Math.abs(a.x - x) < a.r && Math.abs(a.y - y) < a.r)) continue;
    const d = wpick(b.decor, (e) => e[1], r);
    if (d[2] && !openArea(m, x, y, 1)) continue;
    if (d[2]) { let near = false; for (let j = -2; j <= 2 && !near; j++) for (let i = -2; i <= 2; i++) if (m.solid[I(m, x + i, y + j)] === 2) { near = true; break; } if (near) continue; m.solid[I(m, x, y)] = 2; }
    m.decor.push({ x: x + 0.5, y: y + 0.5, spr: d[0], v: Math.floor(r() * 8), sc: d[3], solid: d[2], light: d[4] });
  }
}
function pickSpots(m, r, dist, minD, spacing, count, taken = []) {
  const out = [];
  for (let tries = 0; tries < count * 60 && out.length < count; tries++) {
    const x = 3 + Math.floor(r() * (m.w - 6)), y = 3 + Math.floor(r() * (m.h - 6));
    const i = I(m, x, y);
    if (m.solid[i] || dist[i] === 32767 || dist[i] < minD) continue;
    if ([...out, ...taken].some((o) => Math.hypot(o.x - x, o.y - y) < spacing)) continue;
    out.push({ x: x + 0.5, y: y + 0.5 });
  }
  return out;
}

export function genCave(seed, biome, size = 86, packCount = 26) {
  const r = mulberry(seed), m = blank(size, size, biome), w = size, h = size;
  let g = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) g[y * w + x] = x < 3 || y < 3 || x >= w - 3 || y >= h - 3 ? 0 : r() < 0.56 ? 1 : 0;
  for (let it = 0; it < 5; it++) {
    const n = new Uint8Array(w * h);
    for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
      let c = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) c += g[(y + j) * w + x + i];
      n[y * w + x] = c >= 5 ? 1 : 0;
    }
    g = n;
  }
  m.t = g; finish(m, r);
  // keep the largest connected region
  let best = null, bestN = 0; const seen = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (m.solid[i] || seen[i]) continue;
    const d = bfs(m, i % w, (i / w) | 0); let n = 0;
    for (let k = 0; k < w * h; k++) if (d[k] !== 32767) { seen[k] = 1; n++; }
    if (n > bestN) { bestN = n; best = d; }
  }
  for (let i = 0; i < w * h; i++) if (best[i] === 32767) m.t[i] = 0;
  // start = a reachable tile near an edge of the region, boss = farthest point
  let sx = 0, sy = 0;
  for (let tries = 0; tries < 4000; tries++) { const x = 4 + Math.floor(r() * (w - 8)), y = 4 + Math.floor(r() * (h - 8)); if (m.t[I(m, x, y)] === 1 && openArea(m, x, y, 1)) { sx = x; sy = y; break; } }
  finish(m, r);
  let d = bfs(m, sx, sy), far = I(m, sx, sy);
  for (let i = 0; i < w * h; i++) if (d[i] !== 32767 && d[i] > d[far]) far = i;
  sx = far % w; sy = (far / w) | 0; d = bfs(m, sx, sy); far = I(m, sx, sy);
  for (let i = 0; i < w * h; i++) if (d[i] !== 32767 && d[i] > d[far]) far = i;
  const bx = far % w, by = (far / w) | 0;
  carveDisc(m, bx, by, 7); carveDisc(m, sx, sy, 3); finish(m, r);
  m.start = { x: sx + 0.5, y: sy + 0.5 }; m.bossPos = { x: bx + 0.5, y: by + 0.5 };
  d = bfs(m, sx, sy);
  m.packs = pickSpots(m, r, d, 11, 6.5, packCount, [{ x: bx, y: by }]);
  m.chests = pickSpots(m, r, d, 14, 16, 4, m.packs.slice(0, 0));
  m.shrines = pickSpots(m, r, d, 18, 22, 2, m.chests);
  placeDecor(m, r, 0.035, [{ x: sx, y: sy, r: 4 }, { x: bx, y: by, r: 9 }]);
  return m;
}

export function genDungeon(seed, biome, last) {
  const r = mulberry(seed), W = 74, H = 74, m = blank(W, H, biome);
  const leaves = [];
  (function split(x, y, w, h, depth) {
    const canW = w > 30, canH = h > 30;
    if (depth > 4 || (!canW && !canH) || (depth > 2 && r() < 0.15)) { leaves.push({ x, y, w, h }); return; }
    if (canW && (!canH || r() < 0.5)) { const c = Math.floor(w * (0.4 + r() * 0.2)); split(x, y, c, h, depth + 1); split(x + c, y, w - c, h, depth + 1); }
    else { const c = Math.floor(h * (0.4 + r() * 0.2)); split(x, y, w, c, depth + 1); split(x, y + c, w, h - c, depth + 1); }
  })(3, 3, W - 6, H - 6, 0);
  const rooms = leaves.map((l) => {
    const rw = Math.max(8, Math.floor(l.w * (0.55 + r() * 0.3))), rh = Math.max(8, Math.floor(l.h * (0.55 + r() * 0.3)));
    const rx = l.x + 1 + Math.floor(r() * Math.max(1, l.w - rw - 2)), ry = l.y + 1 + Math.floor(r() * Math.max(1, l.h - rh - 2));
    return { x: rx, y: ry, w: Math.min(rw, l.w - 2), h: Math.min(rh, l.h - 2), role: 'normal' };
  });
  for (const R of rooms) { R.cx = Math.floor(R.x + R.w / 2); R.cy = Math.floor(R.y + R.h / 2); for (let y = R.y; y < R.y + R.h; y++) for (let x = R.x; x < R.x + R.w; x++) m.t[I(m, x, y)] = 1; }
  const corridor = (a, b) => {
    let x = a.cx, y = a.cy;
    const dig = () => { for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (x + i > 1 && y + j > 1 && x + i < W - 2 && y + j < H - 2) m.t[I(m, x + i, y + j)] = 1; };
    while (x !== b.cx) { dig(); x += Math.sign(b.cx - x); }
    while (y !== b.cy) { dig(); y += Math.sign(b.cy - y); }
    dig();
  };
  // connect each room to its nearest unconnected neighbour (MST-like) plus a couple of loops
  const conn = [rooms[0]], rest = rooms.slice(1);
  while (rest.length) {
    let bi = 0, bj = 0, bd = 1e9;
    conn.forEach((a, i) => rest.forEach((b, j) => { const dd = Math.abs(a.cx - b.cx) + Math.abs(a.cy - b.cy); if (dd < bd) { bd = dd; bi = i; bj = j; } }));
    corridor(conn[bi], rest[bj]); conn.push(rest.splice(bj, 1)[0]);
  }
  for (let k = 0; k < 2; k++) { const a = rooms[Math.floor(r() * rooms.length)], b = rooms[Math.floor(r() * rooms.length)]; if (a !== b) corridor(a, b); }
  finish(m, r);
  const start = rooms[0]; start.role = 'start';
  const d = bfs(m, start.cx, start.cy);
  const sorted = rooms.slice(1).sort((a, b) => d[I(m, b.cx, b.cy)] - d[I(m, a.cx, a.cy)]);
  const end = sorted[0]; end.role = last ? 'boss' : 'exit';
  if (last) { carveDisc(m, end.cx, end.cy, 8); finish(m, r); }
  const others = sorted.slice(1);
  const roles = ['treasure', 'elite', 'trap', 'shrine', 'treasure', 'elite', 'trap'];
  others.forEach((R, i) => { if (i < roles.length && r() < 0.8) R.role = roles[i]; });
  m.rooms = rooms; m.start = { x: start.cx + 0.5, y: start.cy + 0.5 };
  if (last) m.bossPos = { x: end.cx + 0.5, y: end.cy + 0.5 }; else m.exit = { x: end.cx + 0.5, y: end.cy + 0.5 };
  for (const R of rooms) {
    // braziers in the corners light the rooms
    for (const [cx, cy] of [[R.x + 1, R.y + 1], [R.x + R.w - 2, R.y + 1], [R.x + 1, R.y + R.h - 2], [R.x + R.w - 2, R.y + R.h - 2]]) {
      if (m.t[I(m, cx, cy)] === 1 && openArea(m, cx, cy, 0) && r() < 0.75) { m.solid[I(m, cx, cy)] = 2; m.decor.push({ x: cx + 0.5, y: cy + 0.5, spr: 'd_brazier', v: 0, sc: 3, solid: 1, light: '#ff8a3a' }); }
    }
    if (R.role === 'start') continue;
    const area = R.w * R.h;
    if (R.role === 'boss' || R.role === 'exit') { if (R.role === 'exit') m.packs.push({ x: R.cx + 2.5, y: R.cy + 0.5, big: 1 }); continue; }
    if (R.role === 'treasure') { m.chests.push({ x: R.cx + 0.5, y: R.cy + 0.5, rich: 1 }); m.packs.push({ x: R.cx + 2.5, y: R.cy + 1.5, big: 1 }); m.packs.push({ x: R.cx - 2.5, y: R.cy - 1.5 }); }
    else if (R.role === 'elite') m.packs.push({ x: R.cx + 0.5, y: R.cy + 0.5, rare: 1 });
    else if (R.role === 'shrine') { m.shrines.push({ x: R.cx + 0.5, y: R.cy + 0.5 }); m.packs.push({ x: R.cx + 3.5, y: R.cy + 0.5 }); }
    else if (R.role === 'trap') {
      for (let y = R.y + 2; y < R.y + R.h - 2; y += 2) for (let x = R.x + 2; x < R.x + R.w - 2; x += 2) if (r() < 0.45) m.traps.push({ x: x + 0.5, y: y + 0.5, ph: r() * 3 });
      m.chests.push({ x: R.cx + 0.5, y: R.cy + 0.5 }); m.packs.push({ x: R.cx - 2.5, y: R.cy + 0.5 });
    } else { m.packs.push({ x: R.cx + 0.5, y: R.cy + 0.5 }); if (area > 150) m.packs.push({ x: R.cx - 3.5, y: R.cy + 2.5 }); }
  }
  placeDecor(m, r, 0.012, [{ x: start.cx, y: start.cy, r: 4 }, { x: end.cx, y: end.cy, r: 9 }, ...m.chests.map((c) => ({ x: c.x, y: c.y, r: 2 })), ...m.shrines.map((c) => ({ x: c.x, y: c.y, r: 2 }))]);
  return m;
}

export function genArena(seed, biome, rad = 13, pillars = 6) {
  const r = mulberry(seed), S = rad * 2 + 9, m = blank(S, S, biome), c = Math.floor(S / 2);
  carveDisc(m, c, c, rad); finish(m, r);
  for (let i = 0; i < pillars; i++) {
    const a = (i / pillars) * Math.PI * 2 + 0.3, x = Math.round(c + Math.cos(a) * rad * 0.62), y = Math.round(c + Math.sin(a) * rad * 0.62);
    m.solid[I(m, x, y)] = 2; m.decor.push({ x: x + 0.5, y: y + 0.5, spr: i % 2 ? 'd_pillar' : 'd_brazier', v: 0, sc: i % 2 ? 4 : 3, solid: 1, light: i % 2 ? null : BIOMES[biome].accent });
  }
  placeDecor(m, r, 0.012, [{ x: c, y: c, r: 5 }]);
  m.start = { x: c + 0.5, y: c + rad - 2.5 }; m.bossPos = { x: c + 0.5, y: c - 2.5 }; m.center = { x: c + 0.5, y: c + 0.5 }; m.rad = rad;
  return m;
}

// The hub: last refuge of mankind. Hand-placed layout.
export function genHub() {
  const r = mulberry(7), S = 46, m = blank(S, S, 'hub'), c = 23;
  carveDisc(m, c, c, 17);
  for (let y = c - 3; y <= c + 3; y++) for (let x = 3; x < S - 3; x++) m.t[I(m, x, y)] = 1;
  for (let x = c - 3; x <= c + 3; x++) for (let y = 3; y < S - 3; y++) m.t[I(m, x, y)] = 1;
  finish(m, r);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const dd = Math.hypot(x - c, y - c); m.va[I(m, x, y)] = dd < 5 ? 4 + ((x + y) & 1) : (Math.abs(x - c) < 2 || Math.abs(y - c) < 2) ? 6 : Math.floor(r() * 4); }
  const D = (spr, x, y, sc, solid = 1, light = null, v = 0) => { if (solid) m.solid[I(m, Math.floor(x), Math.floor(y))] = 2; m.decor.push({ x, y, spr, v, sc, solid, light }); };
  const N = (id, x, y) => m.npcs.push({ id, x, y });
  D('d_fountain', c + 0.5, c + 6.5, 5);
  // buildings ring
  D('d_wiztower', c - 8.5, c - 10.5, 8); D('d_cottage', c + 9.5, c - 10.5, 7, 1, null, 1); D('d_cottage', c - 12.5, c + 2.5, 7); D('d_gatehouse', c + 0.5, c + 16.5, 8);
  D('d_cottage', c + 12.5, c + 6.5, 7, 1, null, 1); D('d_tent', c - 10.5, c + 9.5, 6); D('d_gate', c + 0.5, c - 16.5, 8);
  // stations
  D('d_forge', c + 8.5, c - 6.5, 4, 1, '#ff8a3a'); D('d_anvil', c + 6.5, c - 5.5, 3); N('smith', c + 7.5, c - 4.5);
  D('d_stall', c - 8.5, c - 5.5, 5); N('merchant', c - 7.5, c - 3.5);
  D('d_runeobelisk', c - 12.5, c - 1.5, 4, 1, '#8f6bff'); N('rune', c - 10.5, c - 0.5);
  D('d_stash', c + 5.5, c + 2.5, 3.5); N('stash', c + 5.5, c + 2.5);
  D('d_board', c - 5.5, c + 4.5, 4); N('board', c - 5.5, c + 4.5);
  D('d_banner', c + 10.5, c + 1.5, 4); N('trainer', c + 9.5, c + 2.5);
  D('d_runepillar', c - 3.5, c - 6.5, 4, 1, '#b06bff'); D('d_runepillar', c + 4.5, c - 6.5, 4, 1, '#b06bff'); N('portal', c + 2.5, c - 4.5);
  D('d_cauldron', c - 9.5, c + 6.5, 3, 1, '#7be04a'); N('alch', c - 8.5, c + 7.5);
  D('d_stall', c + 10.5, c + 11.5, 5, 1, null, 1); N('auction', c + 9.5, c + 12.5);
  D('d_bookshelf', c - 12.5, c - 9.5, 4); N('collector', c - 11.5, c - 8.5);
  D('d_banner', c - 3.5, c - 3.5, 4); N('lfg', c - 2.5, c - 2.5);
  N('guard', c - 2.5, c + 14.5); N('guard2', c + 3.5, c + 14.5); N('villager', c + 9.5, c + 9.5); N('peasant', c - 4.5, c + 10.5); N('king', c + 0.5, c - 12.5);
  D('d_throne', c + 0.5, c - 13.5, 4);
  for (const [x, y] of [[c - 6, c - 12], [c + 7, c - 12], [c - 14, c - 6], [c + 15, c - 6], [c - 14, c + 7], [c + 15, c + 7], [c - 6, c + 13], [c + 7, c + 13], [c - 3, c + 3], [c + 4, c + 3]]) D('d_lantern', x + 0.5, y + 0.5, 3, 1, '#ffb060');
  for (const [x, y] of [[c - 5, c - 9], [c + 6, c - 9], [c - 11, c + 5], [c + 11, c - 3], [c + 3, c + 9], [c - 2, c + 8]]) D(r() < 0.5 ? 'd_barrel' : 'd_crate', x + 0.5, y + 0.5, 2.5, 1, null, Math.floor(r() * 2));
  for (const [x, y] of [[c - 15, c - 2], [c + 16, c + 2], [c - 3, c + 16], [c + 4, c - 15]]) D('d_pine', x + 0.5, y + 0.5, 5, 1, null, Math.floor(r() * 2));
  m.start = { x: c + 0.5, y: c + 3.5 }; m.portalPos = { x: c + 0.5, y: c - 6.5 };
  m.seen.fill(1);
  return m;
}
