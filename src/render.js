// Isometric canvas renderer: procedural tiles, depth-sorted sprites, telegraphs, lighting, overlays.
import { G } from './state.js';
import { BIOMES } from './data/monsters.js';
import { RAR, DTC } from './data/defs.js';
import { MATS } from './data/items.js';
import { drawSpr } from './gfx.js';
import { mulberry } from './util.js';
import { itemSprite } from './items.js';

export const R = { cv: null, ctx: null, W: 0, H: 0, lcv: null, lctx: null, tiles: {}, labels: [], hover: null };
const HW = 32, HH = 16, WALL = 46;
const HUB = { n: 'Последний оплот', floor: ['#4a463f', '#514c44', '#45413a', '#4d4840', '#5f5a4e', '#55503f', '#6a6353'], wall: ['#33302b', '#201e1b'], accent: '#ffb060', void: '#0b0a09', ambient: 0.42 };
export const biomeOf = (id) => (id === 'hub' ? HUB : BIOMES[id]);

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function tileCanvas(col, seed, kind) {
  const r = mulberry(seed), c = document.createElement('canvas'), wallH = kind === 'wall' ? WALL / 2 : 0;
  c.width = 32; c.height = 16 + wallH;
  const x = c.getContext('2d'), img = x.createImageData(32, 16 + wallH), d = img.data;
  const top = hex(kind === 'wall' ? col[0] : col), side = kind === 'wall' ? hex(col[1]) : null;
  const put = (px, py, rgb, k) => { const i = (py * 32 + px) * 4; d[i] = Math.min(255, rgb[0] * k); d[i + 1] = Math.min(255, rgb[1] * k); d[i + 2] = Math.min(255, rgb[2] * k); d[i + 3] = 255; };
  for (let px = 0; px < 32; px++) {
    const half = 8 - Math.abs(px - 15.5) / 2; // diamond half-height at this column
    const y0 = Math.ceil(7.5 - half), y1 = Math.floor(7.5 + half);
    for (let py = y0; py <= y1; py++) {
      let k = 0.9 + r() * 0.2;
      if (r() < 0.06) k *= r() < 0.5 ? 0.78 : 1.18;
      if (py === y0 || py === y1) k *= kind === 'wall' ? 1.25 : 0.86;
      put(px, py, top, k);
    }
    if (side) for (let py = y1 + 1; py <= y1 + wallH; py++) { const k = (px < 16 ? 0.72 : 1) * (0.86 + r() * 0.16) * (1 - (py - y1) / wallH * 0.35); put(px, py, side, k * 1.5); }
  }
  if (kind === 'floor') for (let n = r() < 0.55 ? 1 : 0; n > 0; n--) { // hairline cracks
    let px = 6 + Math.floor(r() * 20), py = 5 + Math.floor(r() * 6);
    for (let k = 3 + Math.floor(r() * 6); k > 0; k--) { const i = (py * 32 + px) * 4; if (d[i + 3] === 255) { d[i] *= 0.62; d[i + 1] *= 0.62; d[i + 2] *= 0.62; } px += r() < 0.5 ? 1 : r() < 0.5 ? -1 : 0; py += r() < 0.4 ? 1 : 0; if (px < 1 || px > 30 || py > 14) break; }
  }
  x.putImageData(img, 0, 0);
  return c;
}
function tilesFor(id) {
  if (R.tiles[id]) return R.tiles[id];
  const b = biomeOf(id), t = { floor: [], wall: [] };
  b.floor.forEach((col, i) => { const n = id === 'hub' ? 1 : 2; for (let k = 0; k < n; k++) t.floor.push(tileCanvas(col, 100 + i * 7 + k * 31 + id.length, 'floor')); });
  for (let k = 0; k < 3; k++) t.wall.push(tileCanvas(b.wall, 500 + k * 13, 'wall'));
  return (R.tiles[id] = t);
}

export function initRender(cv) {
  R.cv = cv; R.ctx = cv.getContext('2d'); R.lcv = document.createElement('canvas'); R.lctx = R.lcv.getContext('2d');
  const fit = () => { R.W = cv.width = window.innerWidth; R.H = cv.height = window.innerHeight; R.lcv.width = Math.ceil(R.W / 3); R.lcv.height = Math.ceil(R.H / 3); };
  window.addEventListener('resize', fit); fit();
}
export const zoomNow = () => Math.max(0.6, Math.min(1.8, (R.H / 900) * (G.save ? G.save.settings.zoom : 1) * 1.15));
export function w2s(x, y) { const z = zoomNow(), c = G.cam; return [((x - y) - (c.x - c.y)) * HW * z + R.W / 2, ((x + y) - (c.x + c.y)) * HH * z + R.H / 2]; }
export function s2w(sx, sy) { const z = zoomNow(), c = G.cam; const ix = (sx - R.W / 2) / (HW * z) + (c.x - c.y), iy = (sy - R.H / 2) / (HH * z) + (c.x + c.y); return [(ix + iy) / 2, (iy - ix) / 2]; }
const iso = (x, y) => [(x - y) * HW, (x + y) * HH];

function ellipse(ctx, x, y, rad, inner) {
  const [ix, iy] = iso(x, y);
  ctx.beginPath(); ctx.ellipse(ix, iy, rad * 45.25, rad * 22.63, 0, 0, 6.2832);
  if (inner) { ctx.moveTo(ix + inner * 45.25, iy); ctx.ellipse(ix, iy, inner * 45.25, inner * 22.63, 0, 0, 6.2832, true); }
}
function linePoly(ctx, x, y, ang, len, w) {
  const cx = Math.cos(ang), cy = Math.sin(ang), px = -cy * w / 2, py = cx * w / 2;
  const pts = [[x + px, y + py], [x + cx * len + px, y + cy * len + py], [x + cx * len - px, y + cy * len - py], [x - px, y - py]].map((p) => iso(p[0], p[1]));
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < 4; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath();
}

function drawActor(ctx, a, t) {
  const [ix, iy] = iso(a.x, a.y), sc = a.sc || 3;
  const bob = a.mv > 0 ? -Math.abs(Math.sin(t * 13 + a.bob)) * 3 : Math.sin(t * 2.2 + a.bob) * 0.8;
  const hov = a.fly ? -8 - Math.sin(t * 3 + a.bob) * 3 : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(ix, iy, sc * 5.2, sc * 2.5, 0, 0, 6.2832); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.34)'; ctx.beginPath(); ctx.ellipse(ix, iy, sc * 3.6, sc * 1.7, 0, 0, 6.2832); ctx.fill();
  if (a.elite || a.boss) { ctx.strokeStyle = a.boss ? '#ff4d4d' : a.elite === 2 ? '#ffe45e' : '#6f8fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(ix, iy, sc * 4.8, sc * 2.4, 0, 0, 6.2832); ctx.stroke(); }
  if (a.kind === 'minion') { ctx.strokeStyle = 'rgba(120,255,160,0.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(ix, iy, sc * 4, sc * 2, 0, 0, 6.2832); ctx.stroke(); }
  const st = a.st;
  if (st) { const col = st.freeze ? '#bff' : st.ignite ? '#f82' : st.poison ? '#7e4' : st.chill ? '#7cf' : st.shock ? '#fe5' : st.bleed ? '#c22' : st.weak || st.mark || st.rot ? '#b6f' : null; if (col) { ctx.fillStyle = col; ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.ellipse(ix, iy, sc * 3.6, sc * 1.8, 0, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1; } }
  let ox = 0;
  if (a.lunge > 0) ox = a.face * 5 * (a.lunge / 0.15);
  if (a.wind > 0 || a.fuse > 0) ox += Math.sin(t * 60) * 1.5;
  if (a.inv > 0 && a.kind !== 'player') ctx.globalAlpha = 0.55;
  if (a.kind === 'player' && a.iframe > 0) ctx.globalAlpha = 0.6;
  if (a.spr) {
    const br = 1 + Math.sin(t * 2.6 + a.bob) * 0.028, tilt = a.mv > 0 ? Math.sin(t * 13 + a.bob) * 0.07 : 0;
    ctx.save(); ctx.translate(ix + ox, iy + bob + hov + 2); if (tilt) ctx.rotate(tilt); ctx.scale(2 - br, br);
    drawSpr(ctx, a.spr, a.sv || 0, 0, 0, sc, a.face < 0, a.flash > 0 || (st && st.freeze && Math.sin(t * 20) > 0.6)); ctx.restore();
  }
  ctx.globalAlpha = 1;
}

export function render(dt) {
  const ctx = R.ctx, z = G.zone, W = R.W, H = R.H, t = G.time;
  ctx.imageSmoothingEnabled = false;
  if (!z) { ctx.fillStyle = '#07060a'; ctx.fillRect(0, 0, W, H); return; }
  const map = z.map, b = biomeOf(map.biome), tl = tilesFor(map.biome), zm = zoomNow(), c = G.cam;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = b.void; ctx.fillRect(0, 0, W, H);
  const shx = c.shake > 0.2 ? (Math.random() - 0.5) * c.shake : 0, shy = c.shake > 0.2 ? (Math.random() - 0.5) * c.shake : 0;
  const [cix, ciy] = iso(c.x, c.y);
  ctx.setTransform(zm, 0, 0, zm, Math.round(W / 2 - cix * zm + shx), Math.round(H / 2 - ciy * zm + shy));
  // visible range
  const cs = [s2w(0, 0), s2w(W, 0), s2w(0, H), s2w(W, H)];
  const x0 = Math.max(0, Math.floor(Math.min(...cs.map((p) => p[0]))) - 2), x1 = Math.min(map.w - 1, Math.ceil(Math.max(...cs.map((p) => p[0]))) + 2);
  const y0 = Math.max(0, Math.floor(Math.min(...cs.map((p) => p[1]))) - 2), y1 = Math.min(map.h - 1, Math.ceil(Math.max(...cs.map((p) => p[1]))) + 3);
  const hb = HW * (W / zm / 64 + 2), vb = HH * (H / zm / 32 + 4);
  const onScr = (ix, iy) => Math.abs(ix - cix) < hb && Math.abs(iy - ciy) < vb;
  const list = [];
  const nf = tl.floor.length, p = G.p;
  if (!map.ao) buildAO(map);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * map.w + x, ix = (x - y) * HW, iy = (x + y) * HH;
    if (!onScr(ix, iy)) continue;
    if (map.t[i] === 1) { ctx.drawImage(tl.floor[map.biome === 'hub' ? map.va[i] % nf : (map.va[i] + ((x * 7 + y * 13) & 1) * 4) % nf], ix - 32, iy, 64, 32); if (map.ao[i]) { ctx.globalAlpha = map.ao[i] * 0.1; ctx.drawImage(R.shade, ix - 32, iy, 64, 32); ctx.globalAlpha = 1; } }
    else if ((x + 1 < map.w && map.t[i + 1] === 1) || (y + 1 < map.h && map.t[i + map.w] === 1) || (x + 1 < map.w && y + 1 < map.h && map.t[i + map.w + 1] === 1) || (x > 0 && map.t[i - 1] === 1) || (y > 0 && map.t[i - map.w] === 1)) list.push({ d: x + y + 1, k: 0, x, y, ix, iy, v: map.va[i] % 3 });
  }
  // ground layer: traps, areas, objects
  for (const o of z.objs) {
    if (o.kind === 'trap') { const [ix, iy] = iso(o.x, o.y); const on = ((t + o.ph) % 3) > 2; ctx.globalAlpha = on ? 1 : 0.45; drawSpr(ctx, 'd_spiketrap', 0, ix, iy + 12, 2.5, false, on && Math.sin(t * 30) > 0); ctx.globalAlpha = 1; }
  }
  for (const a of z.areas) {
    if (a.done) continue;
    const col = a.col || '#f55', hostile = a.vs === 0 && !a.soak;
    if (a.trap && a.state === 0) { const [ix, iy] = iso(a.x, a.y); ctx.globalAlpha = G.time < a.arm ? 0.4 : 0.9; drawSpr(ctx, 'k_trap', 0, ix, iy + 10, 2); ctx.globalAlpha = 1; continue; }
    if (a.shape === 'line') linePoly(ctx, a.x, a.y, a.ang, a.len, a.w); else ellipse(ctx, a.x, a.y, a.rad, a.shape === 'ring' ? a.inner : 0);
    if (a.state === 0) {
      ctx.fillStyle = hostile ? 'rgba(255,40,40,0.16)' : 'rgba(255,255,255,0.08)'; ctx.fill('evenodd');
      ctx.strokeStyle = hostile ? '#ff4040' : col; ctx.lineWidth = 2; ctx.stroke();
      const k = Math.min(1, a.t / a.delay);
      if (a.shape === 'line') linePoly(ctx, a.x, a.y, a.ang, a.len * k, a.w); else if (a.shape === 'ring') ellipse(ctx, a.x, a.y, a.inner + (a.rad - a.inner) * k, a.inner); else ellipse(ctx, a.x, a.y, a.rad * k);
      ctx.fillStyle = hostile ? 'rgba(255,60,60,0.3)' : col; ctx.globalAlpha = hostile ? 1 : 0.25; ctx.fill('evenodd'); ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = col; ctx.globalAlpha = 0.16 + Math.sin(t * 6 + a.x) * 0.05; ctx.fill(); ctx.globalAlpha = 0.6; ctx.strokeStyle = hostile ? '#ff5050' : col; ctx.lineWidth = hostile ? 2.5 : 1.5; ctx.stroke(); ctx.globalAlpha = 1;
    }
  }
  for (const f of z.fx) {
    const k = f.t / f.dur;
    if (f.kind === 'ring') { ellipse(ctx, f.x, f.y, f.rad * (0.3 + 0.7 * k), f.inner ? f.inner : 0); ctx.strokeStyle = f.col || '#fff'; ctx.globalAlpha = 1 - k; ctx.lineWidth = 4 * (1 - k) + 1; ctx.stroke(); ctx.fillStyle = f.col || '#fff'; ctx.globalAlpha = (1 - k) * 0.22; ctx.fill('evenodd'); ctx.globalAlpha = 1; }
    else if (f.kind === 'dust') { const [ix, iy] = iso(f.x, f.y); ctx.fillStyle = '#b8ad98'; ctx.globalAlpha = (1 - k) * 0.28; ctx.beginPath(); ctx.ellipse(ix, iy - k * 6, 5 + k * 9, 2.5 + k * 4, 0, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1; }
    else if (f.kind === 'decal') { const [ix, iy] = iso(f.x, f.y); ctx.fillStyle = f.col || '#1a0606'; ctx.globalAlpha = Math.min(0.5, (1 - k) * 2) ; ctx.beginPath(); ctx.ellipse(ix, iy, f.rad * 16, f.rad * 8, 0, 0, 6.2832); ctx.fill(); ctx.beginPath(); ctx.ellipse(ix + f.rad * 11, iy + f.rad * 3, f.rad * 6, f.rad * 3, 0, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1; }
    else if (f.kind === 'lineflash') { linePoly(ctx, f.x, f.y, f.ang, f.len, f.w); ctx.fillStyle = f.col || '#fff'; ctx.globalAlpha = (1 - k) * 0.6; ctx.fill(); ctx.globalAlpha = 1; }
    else if (f.kind === 'slash') {
      const half = (f.arc * Math.PI / 180) / 2; ctx.beginPath();
      const [sx, sy] = iso(f.x, f.y); ctx.moveTo(sx, sy - 14);
      for (let i = 0; i <= 10; i++) { const a = f.ang - half + (2 * half * i) / 10, [px, py] = iso(f.x + Math.cos(a) * f.rad, f.y + Math.sin(a) * f.rad); ctx.lineTo(px, py - 14); }
      ctx.closePath(); ctx.fillStyle = f.col || '#fff'; ctx.globalAlpha = (1 - k) * 0.4; ctx.fill(); ctx.globalAlpha = 1;
    }
  }
  // sortable things
  for (const d of map.decor) { const [ix, iy] = iso(d.x, d.y); if (onScr(ix, iy)) list.push({ d: d.x + d.y, k: 1, o: d, ix, iy }); }
  for (const o of z.objs) { if (o.kind === 'trap') continue; const [ix, iy] = iso(o.x, o.y); if (onScr(ix, iy)) list.push({ d: o.x + o.y, k: 2, o, ix, iy }); }
  for (const a of z.actors) { if (a.dead) continue; const [ix, iy] = iso(a.x, a.y); if (onScr(ix, iy)) list.push({ d: a.x + a.y, k: 3, o: a }); }
  for (const d of z.drops) { const [ix, iy] = iso(d.x, d.y); if (onScr(ix, iy)) list.push({ d: d.x + d.y - 0.1, k: 4, o: d, ix, iy }); }
  for (const pr of z.projs) { const [ix, iy] = iso(pr.x, pr.y); if (onScr(ix, iy)) list.push({ d: pr.x + pr.y, k: 5, o: pr, ix, iy }); }
  for (const f of z.fx) if (f.kind === 'death' || f.kind === 'poof' || f.kind === 'spark' || f.kind === 'bolt') list.push({ d: f.x + f.y + 0.1, k: 6, o: f });
  list.sort((a, b) => a.d - b.d);
  for (const e of list) {
    switch (e.k) {
      case 0: {
        const front = p && e.x - p.x > -0.6 && e.y - p.y > -0.6 && e.x - p.x < 2.6 && e.y - p.y < 2.6 && (e.x + e.y + 1) > p.x + p.y;
        if (front) ctx.globalAlpha = 0.35;
        ctx.drawImage(tl.wall[e.v], e.ix - 32, e.iy - WALL, 64, 32 + WALL); ctx.globalAlpha = 1; break;
      }
      case 1: { const d = e.o; ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(e.ix, e.iy, d.sc * 4, d.sc * 1.8, 0, 0, 6.2832); ctx.fill(); const tall = p && d.sc >= 5 && d.x + d.y > p.x + p.y && Math.abs(d.x - p.x) < 3 && Math.abs(d.y - p.y) < 3; if (tall) ctx.globalAlpha = 0.45; drawSpr(ctx, d.spr, d.v, e.ix, e.iy + 3, d.sc); ctx.globalAlpha = 1; break; }
      case 2: {
        const o = e.o;
        if (o.kind === 'portal') { const s = 4 + Math.sin(t * 3) * 0.3; ctx.save(); ctx.translate(e.ix, e.iy - 30); ctx.rotate(t * 1.5); drawSpr(ctx, 'd_portal', 0, 0, 8 * s, s); ctx.restore(); }
        else if (o.kind === 'chest') drawSpr(ctx, o.used ? 'd_chestopen' : o.rich ? 'd_chestlocked' : 'd_chest', 0, e.ix, e.iy + 3, 3);
        else if (o.kind === 'shrine') { ctx.globalAlpha = o.used ? 0.4 : 1; drawSpr(ctx, 'd_runetablet', 0, e.ix, e.iy + 3 + (o.used ? 0 : Math.sin(t * 3) * 3 - 4), 3.5); ctx.globalAlpha = 1; }
        else if (o.kind === 'stairs') drawSpr(ctx, 'd_stairs', 0, e.ix, e.iy + 8, 4);
        break;
      }
      case 3: drawActor(ctx, e.o, t); break;
      case 4: {
        const d = e.o, k = Math.min(1, d.t / 0.35), arc = -Math.sin(k * Math.PI) * 26;
        const [ix, iy] = iso(d.x + (d.tx - d.x) * k, d.y + (d.ty - d.y) * k);
        const spr = d.kind === 'item' ? itemSprite(d.item) : d.kind === 'gold' ? ['u_coin', 0] : d.kind === 'support' ? ['k_gem', 0] : [MATS[d.mid].i, 0];
        if (d.kind === 'item' && d.item.rar >= 3 && k >= 1) { const col = RAR[d.item.rar].c, g = ctx.createLinearGradient(0, iy - 150, 0, iy); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, col); ctx.fillStyle = g; ctx.globalAlpha = 0.5 + Math.sin(t * 5 + d.x) * 0.15; ctx.fillRect(ix - 3, iy - 150, 6, 150); ctx.globalAlpha = 1; }
        drawSpr(ctx, spr[0], spr[1], ix, iy + arc + 4, d.kind === 'item' ? 2 : 1.5);
        break;
      }
      case 5: {
        const pr = e.o, y = e.iy - 20, r = (pr.big ? 14 : 7) * (pr.serpent ? 1.6 : 1);
        const vix = (pr.vx - pr.vy) * HW, viy = (pr.vx + pr.vy) * HH, l = Math.hypot(vix, viy) || 1;
        if (pr.arrow) { ctx.strokeStyle = pr.col; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(e.ix - (vix / l) * 16, y - (viy / l) * 16); ctx.lineTo(e.ix + (vix / l) * 6, y + (viy / l) * 6); ctx.stroke(); break; }
        ctx.globalCompositeOperation = 'lighter'; { const g = ctx.createRadialGradient(e.ix, y, 0, e.ix, y, r * 4.5); g.addColorStop(0, pr.col + '66'); g.addColorStop(1, pr.col + '00'); ctx.fillStyle = g; ctx.fillRect(e.ix - r * 4.5, y - r * 4.5, r * 9, r * 9); } ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = pr.col; ctx.globalAlpha = 0.45; ctx.lineWidth = r * 1.1; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(e.ix, y); ctx.lineTo(e.ix - (vix / l) * r * 3.2, y - (viy / l) * r * 3.2); ctx.stroke(); ctx.globalAlpha = 1;
        ctx.fillStyle = pr.hostile ? '#400' : '#000'; ctx.beginPath(); ctx.arc(e.ix, y, r + 2, 0, 6.2832); ctx.fill();
        ctx.fillStyle = pr.col; ctx.beginPath(); ctx.arc(e.ix, y, r, 0, 6.2832); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(e.ix - r * 0.25, y - r * 0.25, r * 0.45, 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1;
        break;
      }
      case 6: {
        const f = e.o, k = f.t / f.dur, [ix, iy] = iso(f.x, f.y);
        if (f.kind === 'death') { ctx.globalAlpha = 1 - k; drawSpr(ctx, f.spr, f.sv || 0, ix, iy + 2 - k * 10, (f.sc || 3) * (1 + k * 0.3), false, true); ctx.globalAlpha = 1; }
        else if (f.kind === 'poof' || f.kind === 'spark') { ctx.fillStyle = f.col || '#fff'; ctx.globalAlpha = 1 - k; const n = f.kind === 'poof' ? 10 : 5; for (let i = 0; i < n; i++) { const a = i * 2.4 + f.x, d = k * (f.kind === 'poof' ? 34 : 16); ctx.fillRect(ix + Math.cos(a) * d - 2, iy - 18 + Math.sin(a) * d * 0.6 - k * 14, 4, 4); } ctx.globalAlpha = 1; }
        else if (f.kind === 'bolt') { const [ax, ay] = iso(f.x, f.y), [bx, by] = iso(f.x2, f.y2); ctx.strokeStyle = f.col; ctx.lineWidth = 3; ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.moveTo(ax, ay - 20); for (let i = 1; i < 6; i++) ctx.lineTo(ax + (bx - ax) * i / 6 + (Math.random() - 0.5) * 14, ay - 20 + (by - ay) * i / 6 + (Math.random() - 0.5) * 14); ctx.lineTo(bx, by - 20); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1; }
        break;
      }
    }
  }
  // ---- lighting
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const lc = R.lctx, lw = R.lcv.width, lh = R.lcv.height;
  lc.globalCompositeOperation = 'source-over'; lc.clearRect(0, 0, lw, lh); lc.fillStyle = `rgba(4,3,10,${b.ambient})`; lc.fillRect(0, 0, lw, lh);
  lc.globalCompositeOperation = 'destination-out';
  const light = (x, y, rad, a = 1) => { const [sx, sy] = w2s(x, y); if (sx < -rad || sy < -rad || sx > W + rad || sy > H + rad) return; const g = lc.createRadialGradient(sx / 3, (sy - 20) / 3, 0, sx / 3, (sy - 20) / 3, (rad * zm) / 3); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); lc.fillStyle = g; const r3 = (rad * zm) / 3; lc.fillRect(sx / 3 - r3, (sy - 20) / 3 - r3, r3 * 2, r3 * 2); };
  if (p) light(p.x, p.y, 390 + Math.sin(t * 9) * 5 + Math.sin(t * 23) * 3, 1);
  for (const h of z.party) if (!h.dead) light(h.x, h.y, 200, 0.7);
  for (const d of map.decor) if (d.light) light(d.x, d.y, 190 + Math.sin(t * 7 + d.x) * 8, 0.85);
  for (const pr of z.projs) light(pr.x, pr.y, 80, 0.7);
  for (const a of z.areas) if (!a.done && a.state === 1) light(a.x, a.y, a.rad * 50, 0.5);
  for (const bo of z.bosses) if (!bo.dead) light(bo.x, bo.y, 240, 0.8);
  for (const o of z.objs) if (o.kind === 'portal' || (o.kind === 'shrine' && !o.used)) light(o.x, o.y, 200, 0.9);
  ctx.imageSmoothingEnabled = true; ctx.drawImage(R.lcv, 0, 0, W, H); ctx.imageSmoothingEnabled = false;
  ctx.globalCompositeOperation = 'lighter';
  for (const d of map.decor) if (d.light) { const [sx, sy] = w2s(d.x, d.y); if (sx < -150 || sy < -150 || sx > W + 150 || sy > H + 150) continue; const g = ctx.createRadialGradient(sx, sy - 24, 0, sx, sy - 24, 120 * zm); g.addColorStop(0, d.light + '44'); g.addColorStop(1, d.light + '00'); ctx.fillStyle = g; ctx.fillRect(sx - 130 * zm, sy - 150 * zm, 260 * zm, 260 * zm); }
  if (p) { const [sx, sy] = w2s(p.x, p.y), g = ctx.createRadialGradient(sx, sy - 24, 0, sx, sy - 24, 230 * zm); g.addColorStop(0, 'rgba(255,196,130,0.10)'); g.addColorStop(1, 'rgba(255,196,130,0)'); ctx.fillStyle = g; ctx.fillRect(sx - 240 * zm, sy - 270 * zm, 480 * zm, 480 * zm); }
  ctx.globalCompositeOperation = 'source-over';
  post(ctx, z, b, t, dt, W, H);
  // ---- overlays in screen space
  ctx.textAlign = 'center'; ctx.lineJoin = 'round';
  for (const a of z.actors) {
    if (a.dead) continue;
    const [sx, sy] = w2s(a.x, a.y); if (sx < -60 || sy < -60 || sx > W + 60 || sy > H + 60) continue;
    const top = sy - (a.sc || 3) * 16 * zm - 8 + (a.fly ? -8 * zm : 0);
    if (a.kind === 'npc') { if (!a.spr && !a.label) continue; ctx.font = '600 13px Alegreya,Georgia,serif'; ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.fillStyle = a.fn ? '#ffd27a' : '#cfc8b8'; const ty = a.spr ? top : sy - 70 * zm; ctx.strokeText(a.name, sx, ty); ctx.fillText(a.name, sx, ty); if (a.near && a.fn) { ctx.font = '12px sans-serif'; ctx.fillStyle = '#fff'; ctx.strokeText('[E] ' + a.fnName, sx, ty - 16); ctx.fillText('[E] ' + a.fnName, sx, ty - 16); } continue; }
    if (a.kind === 'player' || a.boss) continue;
    const f = a.hp / a.s.maxLife;
    if (f < 1 || a.elite) { const w = a.elite ? 46 : 30; ctx.fillStyle = '#000'; ctx.fillRect(sx - w / 2 - 1, top - 1, w + 2, 6); ctx.fillStyle = a.kind === 'minion' ? '#5c6' : a.elite === 2 ? '#fc3' : a.elite ? '#68f' : '#c33'; ctx.fillRect(sx - w / 2, top, w * Math.max(0, f), 4); }
    if (a.elite === 2) { ctx.font = '600 12.5px Alegreya,Georgia,serif'; ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.fillStyle = '#ffe45e'; ctx.strokeText(a.name, sx, top - 6); ctx.fillText(a.name, sx, top - 6); }
  }
  // drop labels
  R.labels = [];
  const showRar = G.save.settings.showRar, lab = [];
  for (const d of z.drops) {
    if (d.kind !== 'item' && d.kind !== 'support' || d.t < 0.35) continue;
    if (d.kind === 'item' && d.item.rar < showRar) continue;
    const [sx, sy] = w2s(d.tx, d.ty); if (sx < -100 || sy < -40 || sx > W + 100 || sy > H + 40) continue;
    lab.push({ d, sx, sy: sy - 30 });
  }
  lab.sort((a, b) => a.sy - b.sy);
  ctx.font = '600 12.5px Alegreya,Georgia,serif';
  const placed = [];
  for (const l of lab) {
    const name = l.d.kind === 'support' ? 'Руна навыка' : l.d.item.name, w = ctx.measureText(name).width + 12;
    let y = l.sy;
    for (let guard = 0; guard < 12; guard++) { const hit = placed.find((q) => Math.abs(q.y - y) < 18 && Math.abs(q.x - l.sx) < (q.w + w) / 2); if (!hit) break; y = hit.y - 18; }
    placed.push({ x: l.sx, y, w });
    const col = l.d.kind === 'support' ? '#36e0c8' : RAR[l.d.item.rar].c, hov = R.hover === l.d.id;
    ctx.fillStyle = hov ? 'rgba(60,50,30,0.95)' : 'rgba(0,0,0,0.78)'; ctx.fillRect(l.sx - w / 2, y - 12, w, 17);
    if (l.d.kind === 'support' || l.d.item.rar >= 3) { ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.strokeRect(l.sx - w / 2 + 0.5, y - 11.5, w - 1, 16); }
    ctx.fillStyle = col; ctx.fillText(name, l.sx, y + 1);
    R.labels.push({ id: l.d.id, x: l.sx - w / 2, y: y - 12, w, h: 17 });
  }
  // floating texts
  for (const tx of z.texts) {
    const [sx, sy] = w2s(tx.x, tx.y), k = tx.t / 0.9;
    const pop = k < 0.14 ? 1 + (0.14 - k) * 5 : 1;
    ctx.font = `${tx.crit ? '800' : '700'} ${Math.round(tx.size * pop)}px Alegreya,Georgia,serif`; ctx.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; const y = sy - 44 * zm - k * 42;
    ctx.strokeText(tx.txt, sx, y); ctx.fillStyle = tx.col; ctx.fillText(tx.txt, sx, y);
  }
  ctx.globalAlpha = 1;
  // cast bar
  if (p && p.act && !p.act.fired && p.act.sk.wind > 0.25) { const [sx, sy] = w2s(p.x, p.y), k = 1 - p.act.t / p.act.sk.wind; ctx.fillStyle = '#000'; ctx.fillRect(sx - 21, sy + 9, 42, 5); ctx.fillStyle = '#9cf'; ctx.fillRect(sx - 20, sy + 10, 40 * k, 3); }
}

// ---------------------------------------------------------------- atmosphere (post-processing in screen space)
const P_CFG = {
  ash: { n: 80, col: '#ff8a3a', glow: 1, vy: -22, vx: 8, size: [1, 3], wob: 1 }, ice: { n: 120, col: '#eef7ff', vy: 44, vx: -16, size: [1, 3] },
  swamp: { n: 60, col: '#a6e65e', glow: 1, vy: -5, vx: 3, size: [1, 2], wob: 1 }, desert: { n: 80, col: '#e8c98a', vy: 5, vx: 70, size: [1, 2] },
  abyss: { n: 75, col: '#b98bff', glow: 1, vy: -9, vx: 0, size: [1, 3], wob: 1 }, grave: { n: 55, col: '#9fd8c8', glow: 1, vy: -5, vx: 2, size: [1, 2], wob: 1 },
  cave: { n: 45, col: '#d8c8a0', vy: 7, vx: 2, size: [1, 2] }, hub: { n: 55, col: '#ffcf8a', glow: 1, vy: -11, vx: 5, size: [1, 2], wob: 1 },
};
function vignette(W, H) {
  if (R.vig && R.vig.width === W && R.vig.height === H) return R.vig;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const g = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.hypot(W, H) * 0.6);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.7, 'rgba(2,1,4,0.42)'); g.addColorStop(1, 'rgba(2,1,4,0.86)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  return (R.vig = c);
}
function post(ctx, z, b, t, dt, W, H) {
  const id = z.map.biome, cfg = P_CFG[id] || P_CFG.cave, c = G.cam;
  // drifting fog
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const fx0 = ((Math.sin(t * 0.05 + i * 2.1) * 0.5 + 0.5) * 1.2 - 0.1) * W - ((c.x - c.y) * 9) % W * 0.1, fy0 = ((Math.cos(t * 0.04 + i * 1.7) * 0.5 + 0.5) * 1.1 - 0.05) * H;
    const rad = Math.max(W, H) * 0.42, g = ctx.createRadialGradient(fx0, fy0, 0, fx0, fy0, rad);
    g.addColorStop(0, b.accent + '14'); g.addColorStop(1, b.accent + '00'); ctx.fillStyle = g; ctx.fillRect(fx0 - rad, fy0 - rad, rad * 2, rad * 2);
  }
  // particles with a little parallax against the camera
  if (R.partId !== id) { R.partId = id; R.parts = []; for (let i = 0; i < cfg.n; i++) R.parts.push({ x: Math.random(), y: Math.random(), s: cfg.size[0] + Math.random() * (cfg.size[1] - cfg.size[0]), ph: Math.random() * 6.28, d: 0.5 + Math.random() }); R.pc = [c.x, c.y]; }
  const dcx = ((c.x - c.y) - (R.pc[0] - R.pc[1])) * 32, dcy = ((c.x + c.y) - (R.pc[0] + R.pc[1])) * 16; R.pc = [c.x, c.y];
  if (!cfg.glow) ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = cfg.col;
  for (const p of R.parts) {
    p.x += ((cfg.vx * p.d + (cfg.wob ? Math.sin(t * 1.3 + p.ph) * 12 : 0)) * dt - dcx * p.d * 0.6) / W; p.y += (cfg.vy * p.d * dt - dcy * p.d * 0.6) / H;
    if (p.x < -0.02) p.x += 1.04; else if (p.x > 1.02) p.x -= 1.04; if (p.y < -0.02) p.y += 1.04; else if (p.y > 1.02) p.y -= 1.04;
    ctx.globalAlpha = (cfg.glow ? 0.35 + 0.45 * Math.abs(Math.sin(t * 1.7 + p.ph)) : 0.45) * Math.min(1, p.d);
    const s = p.s * (cfg.glow ? 1 : 1); ctx.fillRect(p.x * W, p.y * H, s, id === 'desert' ? 1 : s);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  // colour grade + vignette
  ctx.fillStyle = b.accent + '0b'; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(vignette(W, H), 0, 0);
  // danger feedback: hit flash and low-health pulse
  const p = G.p; let red = G.hurtFlash || 0; if (G.hurtFlash > 0) G.hurtFlash = Math.max(0, G.hurtFlash - dt * 2.2);
  if (p && !p.dead && p.s && p.hp < p.s.maxLife * 0.3) red = Math.max(red, 0.35 + 0.2 * Math.sin(t * 6));
  if (p && p.dead) red = 0.6;
  if (red > 0.01) { const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) * 0.55); g.addColorStop(0, 'rgba(150,0,0,0)'); g.addColorStop(1, `rgba(170,8,8,${Math.min(0.75, red * 0.7)})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
}
function buildAO(map) {
  const ao = (map.ao = new Uint8Array(map.w * map.h));
  for (let y = 1; y < map.h - 1; y++) for (let x = 1; x < map.w - 1; x++) { const i = y * map.w + x; if (map.t[i] !== 1) continue; let n = 0; if (map.t[i - 1] !== 1) n += 2; if (map.t[i - map.w] !== 1) n += 2; if (map.t[i - map.w - 1] !== 1) n++; if (map.t[i + 1] !== 1) n++; if (map.t[i + map.w] !== 1) n++; ao[i] = Math.min(5, n); }
  if (!R.shade) { const c = document.createElement('canvas'); c.width = 64; c.height = 32; const x = c.getContext('2d'); x.fillStyle = '#000'; x.beginPath(); x.moveTo(32, 0); x.lineTo(64, 16); x.lineTo(32, 32); x.lineTo(0, 16); x.closePath(); x.fill(); R.shade = c; }
}

// Minimap (top-down, rotated 45° to match the iso view).
export function drawMinimap(cv) {
  const z = G.zone; if (!z) return;
  const map = z.map, x = cv.getContext('2d'), S = cv.width, p = G.p, sc = 2.2;
  x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, S, S);
  x.translate(S / 2, S / 2); x.rotate(Math.PI / 4);
  const rng = Math.ceil(S / sc / 1.2), px = Math.floor(p.x), py = Math.floor(p.y);
  x.fillStyle = 'rgba(200,190,170,0.5)';
  for (let j = -rng; j <= rng; j++) for (let i = -rng; i <= rng; i++) { const tx = px + i, ty = py + j; if (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h) continue; const k = ty * map.w + tx; if (map.t[k] === 1 && map.seen[k]) x.fillRect(i * sc, j * sc, sc + 0.3, sc + 0.3); }
  const dot = (o, col, s) => { x.fillStyle = col; x.fillRect((o.x - p.x) * sc - s / 2, (o.y - p.y) * sc - s / 2, s, s); };
  for (const o of z.objs) { if (o.kind === 'trap' || !map.seen[Math.floor(o.y) * map.w + Math.floor(o.x)]) continue; dot(o, o.kind === 'portal' ? '#b06bff' : o.kind === 'stairs' ? '#fff' : o.kind === 'chest' ? (o.used ? '#665' : '#fc3') : o.used ? '#555' : '#3ec', 5); }
  for (const a of z.actors) { if (a.dead || a === p) continue; if (a.kind === 'npc') { if (a.fn) dot(a, '#ffd27a', 4); continue; } if (a.kind === 'minion') { dot(a, '#5c6', 3); continue; } if (!map.seen[Math.floor(a.y) * map.w + Math.floor(a.x)]) continue; dot(a, a.boss ? '#f33' : a.elite ? '#fc3' : '#c44', a.boss ? 7 : a.elite ? 4 : 2.5); }
  x.fillStyle = '#fff'; x.fillRect(-3, -3, 6, 6);
}
