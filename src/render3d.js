// 2.5D renderer: Three.js on WebGPU (falls back to WebGL2). The world is real 3D geometry built from the tile map;
// characters and most props are pixel sprites standing in it as lit, shadow-casting billboards.
import * as THREE from 'three/webgpu';
import { pass, output, min, max, vec3, vec4, float } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { G } from './state.js';
import { R, biomeOf, drawOverlay, dangerOverlay, vignette, zoomNow } from './render.js';
import { ATL, sprIdx } from './gfx.js';
import { RAR } from './data/defs.js';
import { MATS } from './data/items.js';
import { itemSprite } from './items.js';
import { mulberry } from './util.js';

const FXQ = [0.3, 0.6, 1];
const PPU = 45.25, ELEV = (41 * Math.PI) / 180, BIAS = 0.5, MAXP = 3500, NLIGHT = 12;
const T = { ready: false, map: null, live: new Map(), areas: new Map(), fxm: new Map(), geo: new Map(), lights: [], src: [], flames: [] };
const V = new THREE.Vector3(), V2 = new THREE.Vector3(), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), C = new THREE.Color(), S3 = new THREE.Vector3();
const toCam = new THREE.Vector3(Math.cos(ELEV) / Math.SQRT2, Math.sin(ELEV), Math.cos(ELEV) / Math.SQRT2);
const camUp = new THREE.Vector3(), camFwd = new THREE.Vector3();
const hdr = (hex, k) => new THREE.Color(hex).multiplyScalar(k);

// ---------------------------------------------------------------- textures made in code
function canvasTex(size, draw, repeat) {
  const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}
function slabTex() {
  return canvasTex(128, (x, s) => {
    const r = mulberry(11); x.fillStyle = '#b9b9b9'; x.fillRect(0, 0, s, s);
    for (let i = 0; i < 2600; i++) { const v = 150 + r() * 90; x.fillStyle = `rgba(${v},${v},${v},0.35)`; x.fillRect(r() * s, r() * s, 1 + r() * 3, 1 + r() * 3); }
    x.strokeStyle = 'rgba(40,40,40,0.55)'; x.lineWidth = 1;
    for (let i = 0; i < 5; i++) { x.beginPath(); let px = r() * s, py = r() * s; x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += (r() - 0.5) * 30; py += (r() - 0.5) * 30; x.lineTo(px, py); } x.stroke(); }
    const g = x.createLinearGradient(0, 0, s, s); g.addColorStop(0, 'rgba(255,255,255,0.10)'); g.addColorStop(1, 'rgba(0,0,0,0.18)'); x.fillStyle = g; x.fillRect(0, 0, s, s);
    x.strokeStyle = 'rgba(20,20,20,0.85)'; x.lineWidth = 5; x.strokeRect(0, 0, s, s); x.strokeStyle = 'rgba(255,255,255,0.14)'; x.lineWidth = 2; x.strokeRect(5, 5, s - 10, s - 10);
  });
}
function brickTex() {
  return canvasTex(128, (x, s) => {
    const r = mulberry(23); x.fillStyle = '#8f8f8f'; x.fillRect(0, 0, s, s);
    for (let row = 0; row < 4; row++) for (let col = -1; col < 3; col++) { const bx = col * 64 + (row % 2) * 32, by = row * 32, v = 120 + r() * 80; x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(bx + 2, by + 2, 60, 28); x.fillStyle = 'rgba(255,255,255,0.10)'; x.fillRect(bx + 2, by + 2, 60, 4); x.fillStyle = 'rgba(0,0,0,0.22)'; x.fillRect(bx + 2, by + 25, 60, 5); }
    for (let i = 0; i < 1500; i++) { x.fillStyle = `rgba(0,0,0,${r() * 0.2})`; x.fillRect(r() * s, r() * s, 2, 2); }
  }, true);
}
function depthTex(accent) {
  return canvasTex(256, (x, s) => {
    const r = mulberry(5); x.fillStyle = '#000'; x.fillRect(0, 0, s, s);
    for (let i = 0; i < 26; i++) { const g = x.createRadialGradient(r() * s, r() * s, 0, r() * s, r() * s, 30 + r() * 70); g.addColorStop(0, accent); g.addColorStop(1, 'rgba(0,0,0,0)'); x.globalAlpha = 0.25 + r() * 0.4; x.fillStyle = g; x.fillRect(0, 0, s, s); }
  }, true);
}

// ---------------------------------------------------------------- init
export async function init3D(overlay) {
  const cv = document.createElement('canvas'); cv.id = 'gl'; cv.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;display:block';
  overlay.parentNode.insertBefore(cv, overlay);
  const renderer = new THREE.WebGPURenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
  await renderer.init();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.22;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#050407');
  const cam = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 400);
  Object.assign(T, { renderer, scene, cam, cv, backend: renderer.backend && renderer.backend.isWebGPUBackend ? 'WebGPU' : 'WebGL2' });
  // lights
  T.hemi = new THREE.HemisphereLight(0x8899bb, 0x1a1410, 0.5); scene.add(T.hemi);
  T.sun = new THREE.DirectionalLight(0xffffff, 1.4); T.sun.castShadow = true; T.sun.shadow.mapSize.set(2048, 2048);
  const sc = T.sun.shadow.camera; sc.left = -26; sc.right = 26; sc.top = 26; sc.bottom = -26; sc.near = 1; sc.far = 90; T.sun.shadow.bias = -0.0015; T.sun.shadow.normalBias = 0.04;
  scene.add(T.sun); scene.add(T.sun.target);
  T.plight = new THREE.PointLight(0xffc890, 0, 18, 1.3); scene.add(T.plight);
  for (let i = 0; i < NLIGHT; i++) { const l = new THREE.PointLight(0xffffff, 0, 9, 1.8); scene.add(l); T.lights.push(l); }
  // shared sprite resources
  const tex = new THREE.Texture(ATL.img); tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; tex.colorSpace = THREE.SRGBColorSpace; tex.needsUpdate = true; T.atlas = tex;
  const sm = (o) => new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 1, metalness: 0, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.3, ...o });
  T.mSpr = sm({}); T.mWhite = sm({ emissiveIntensity: 3.2 }); T.mGhost = sm({ transparent: true, opacity: 0.5, alphaTest: 0.2 });
  // sprites stand right next to point lights: soft-clip their lit colour so heroes never burn out to white
  const soft = () => { const c = output.rgb, k = max(c.sub(0.72), vec3(0)); return vec4(min(c.sub(k).add(k.div(k.add(1)).mul(0.28)), vec3(float(0.93))), output.a); };
  T.mSpr.outputNode = soft(); T.mGhost.outputNode = soft();
  T.mXray = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, transparent: true, opacity: 0.45, color: 0x9fc4ff, depthFunc: THREE.GreaterDepth, depthWrite: false });
  T.gCircle = new THREE.CircleGeometry(1, 48); T.gRing = new THREE.RingGeometry(0.955, 1, 64); T.gPlane = new THREE.PlaneGeometry(1, 1); T.gBall = new THREE.SphereGeometry(1, 12, 8);
  T.world = new THREE.Group(); T.dyn = new THREE.Group(); scene.add(T.world, T.dyn);
  // particles: one instanced quad mesh, additive
  T.pm = new THREE.InstancedMesh(T.gPlane, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), MAXP);
  T.pm.instanceMatrix.setUsage(THREE.DynamicDrawUsage); T.pm.setColorAt(0, C.set(0xffffff)); T.pm.instanceColor.setUsage(THREE.DynamicDrawUsage); T.pm.frustumCulled = false; T.pm.count = 0; scene.add(T.pm);
  T.P = { n: 0, x: new Float32Array(MAXP), y: new Float32Array(MAXP), z: new Float32Array(MAXP), vx: new Float32Array(MAXP), vy: new Float32Array(MAXP), vz: new Float32Array(MAXP), l: new Float32Array(MAXP), m: new Float32Array(MAXP), s: new Float32Array(MAXP), r: new Float32Array(MAXP), g: new Float32Array(MAXP), b: new Float32Array(MAXP), gr: new Float32Array(MAXP) };
  // post-processing: bloom
  try {
    const sp = pass(scene, cam), col = sp.getTextureNode('output');
    T.pipe = new THREE.RenderPipeline(renderer); T.pipe.outputNode = (G.save.settings.bloom ?? 1) ? col.add(bloom(col, 0.42, 0.5, 0.97)) : col;
  } catch (e) { console.warn('bloom unavailable', e); T.pipe = null; }
  resize(); R.onResize = resize;
  R.proj = { w2s, s2w }; R.r3 = frame; T.ready = true;
  overlay.style.background = 'transparent';
  return T.backend;
}
function resize() {
  if (!T.renderer) return;
  T.renderer.setSize(window.innerWidth, window.innerHeight, false);
}
function setCamera() {
  const cam = T.cam, c = G.cam, W = R.W, H = R.H, ppu = PPU * zoomNow();
  cam.left = -W / 2 / ppu; cam.right = W / 2 / ppu; cam.top = H / 2 / ppu; cam.bottom = -H / 2 / ppu;
  const sh = c.shake > 0.2 ? (c.shake / ppu) * (G.save.settings.shake ?? 1) : 0;
  V.set(c.x + (Math.random() - 0.5) * sh, 0, c.y + (Math.random() - 0.5) * sh);
  cam.position.copy(V).addScaledVector(toCam, 120); cam.lookAt(V); cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
  camUp.set(0, 1, 0).applyQuaternion(cam.quaternion); camFwd.set(0, 0, -1).applyQuaternion(cam.quaternion);
}
function w2s(x, y) { if (!T.cam) return [0, 0]; V2.set(x, 0, y).project(T.cam); return [(V2.x + 1) * 0.5 * R.W, (1 - V2.y) * 0.5 * R.H]; }
function s2w(sx, sy) {
  const cam = T.cam; if (!cam) return [0, 0];
  V2.set((sx / R.W) * 2 - 1, 1 - (sy / R.H) * 2, -1).unproject(cam);
  const f = camFwd.y ? camFwd : V.set(0, 0, -1).applyQuaternion(cam.quaternion), k = -V2.y / f.y;
  return [V2.x + f.x * k, V2.z + f.z * k];
}

// ---------------------------------------------------------------- particles
function emit(x, h, z, o) {
  const q = FXQ[G.save.settings.fx ?? 2]; if (q < 1 && Math.random() > q) return;
  const P = T.P, n = Math.max(1, Math.round((o.n || 1) * (q < 1 ? q + 0.2 : 1))), col = C.set(o.col || '#ffffff'), k = o.k || 1.6;
  for (let i = 0; i < n; i++) {
    if (P.n >= MAXP || (P.n > MAXP * 0.6 && Math.random() < 0.5)) return; const j = P.n++, a = Math.random() * 6.283, sp = (o.spd || 0) * (0.3 + Math.random() * 0.7);
    P.x[j] = x + (Math.random() - 0.5) * (o.spread || 0); P.y[j] = h + Math.random() * (o.hs || 0); P.z[j] = z + (Math.random() - 0.5) * (o.spread || 0);
    P.vx[j] = Math.cos(a) * sp + (o.vx || 0); P.vz[j] = Math.sin(a) * sp + (o.vz || 0); P.vy[j] = (o.up || 0) * (0.4 + Math.random() * 0.8);
    P.l[j] = P.m[j] = (o.life || 0.5) * (0.6 + Math.random() * 0.7); P.s[j] = (o.size || 0.07) * (0.6 + Math.random() * 0.8); P.gr[j] = o.grav || 0;
    const kk = Math.min(k, 1.25) * (P.n > MAXP * 0.5 ? 0.6 : 1); P.r[j] = col.r * kk; P.g[j] = col.g * kk; P.b[j] = col.b * kk;
  }
}
function updateParticles(dt) {
  const P = T.P, pm = T.pm, q = T.cam.quaternion; let n = P.n;
  for (let i = 0; i < n; i++) {
    P.l[i] -= dt;
    if (P.l[i] <= 0) { n--; for (const k of ['x', 'y', 'z', 'vx', 'vy', 'vz', 'l', 'm', 's', 'r', 'g', 'b', 'gr']) P[k][i] = P[k][n]; i--; continue; }
    P.vy[i] -= P.gr[i] * dt; P.x[i] += P.vx[i] * dt; P.y[i] += P.vy[i] * dt; P.z[i] += P.vz[i] * dt;
    if (P.y[i] < 0.02 && P.gr[i] > 0) { P.y[i] = 0.02; P.vy[i] *= -0.35; P.vx[i] *= 0.6; P.vz[i] *= 0.6; }
    const f = P.l[i] / P.m[i], s = P.s[i] * (0.35 + 0.65 * f);
    M4.compose(V.set(P.x[i], P.y[i], P.z[i]), q, S3.set(s, s, s)); pm.setMatrixAt(i, M4);
    pm.setColorAt(i, C.setRGB(P.r[i] * f, P.g[i] * f, P.b[i] * f));
  }
  P.n = n; pm.count = n; pm.instanceMatrix.needsUpdate = true; pm.instanceColor.needsUpdate = true;
}

// ---------------------------------------------------------------- sprites
function sprGeo(idx) {
  let g = T.geo.get(idx); if (g) return g;
  g = new THREE.PlaneGeometry(1, 1); g.translate(0, 0.5, 0);
  const u0 = ((idx % ATL.cols) * 16) / ATL.img.width, v1 = 1 - (Math.floor(idx / ATL.cols) * 16) / ATL.img.height, du = 16 / ATL.img.width, dv = 16 / ATL.img.height, e = 0.0004;
  g.attributes.uv.array.set([u0 + e, v1 - e, u0 + du - e, v1 - e, u0 + e, v1 - dv + e, u0 + du - e, v1 - dv + e]);
  T.geo.set(idx, g); return g;
}
const sprSize = (sc) => (sc * 16) / PPU;
function mkSprite(name, v, sc, mat = T.mSpr, shadow = true) {
  const m = new THREE.Mesh(sprGeo(sprIdx(name, v)), mat); const s = sprSize(sc); m.scale.set(s, s, 1); m.castShadow = shadow; m.quaternion.copy(T.cam.quaternion); return m;
}
function place(m, x, y, h = 0) { m.position.set(x, h, y).addScaledVector(toCam, BIAS); }

// ---------------------------------------------------------------- world build
function disposeGroup(g) { for (const c of g.children.slice()) { g.remove(c); if (c.isInstancedMesh) c.dispose(); if (c.userData.own) { c.geometry.dispose(); if (c.material.dispose) c.material.dispose(); } } }
const ROCK = ['d_boulder', 'd_runestone'], CRYS = ['d_crystal', 'd_icecrystal', 'd_crystalpillar', 'd_icicle'], COLS = ['d_pillar', 'd_column', 'd_obelisk', 'd_runepillar', 'd_runeobelisk'], FIRE = ['d_brazier', 'd_bonfire', 'd_firepillar'];
function buildMap(z) {
  const map = z.map, b = biomeOf(map.biome), r = mulberry(map.w * 131 + map.h * 17 + map.biome.length), w = map.w, h = map.h;
  disposeGroup(T.world); T.src = []; T.flames = []; T.map = map;
  for (const [, e] of T.live) T.dyn.remove(e.mesh, e.ring, e.xray); T.live.clear();
  for (const [, e] of T.areas) T.dyn.remove(e.g); T.areas.clear(); for (const [, e] of T.fxm) T.dyn.remove(e); T.fxm.clear(); T.P.n = 0;
  T.slab ||= slabTex(); T.brick ||= brickTex();
  // distance to floor for wall thickness (2 tiles of rock around every walkable area)
  const near = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (map.t[y * w + x] === 1) continue; let d = 9; for (let j = -2; j <= 2 && d > 1; j++) for (let i = -2; i <= 2; i++) { const nx = x + i, ny = y + j; if (nx < 0 || ny < 0 || nx >= w || ny >= h || map.t[ny * w + nx] !== 1) continue; d = Math.min(d, Math.max(Math.abs(i), Math.abs(j))); } near[y * w + x] = d; }
  let nf = 0, nw = 0; for (let i = 0; i < w * h; i++) { if (map.t[i] === 1) nf++; else if (near[i] <= 2) nw++; }
  const fm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.4, 1), new THREE.MeshStandardMaterial({ map: T.slab, roughness: 0.92, metalness: 0.02 }), nf);
  const wm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ map: T.brick, roughness: 0.96, metalness: 0 }), nw);
  fm.receiveShadow = true; wm.receiveShadow = true; wm.castShadow = true;
  const fcol = b.floor.map((c) => new THREE.Color(c)), wc0 = new THREE.Color(b.wall[0]), wc1 = new THREE.Color(b.wall[1]), hub = map.biome === 'hub';
  let fi = 0, wi = 0; const id = Q.identity();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (map.t[i] === 1) {
      const lift = hub ? 0 : -r() * 0.05; M4.compose(V.set(x + 0.5, -0.2 + lift, y + 0.5), id, S3.set(1, 1, 1)); fm.setMatrixAt(fi, M4);
      const base = hub ? fcol[map.va[i] % fcol.length] : fcol[Math.floor(r() * fcol.length)];
      const k = (r() < 0.07 ? 0.72 : 0.92 + r() * 0.3) * 2.5; fm.setColorAt(fi++, C.copy(base).multiplyScalar(k));
    } else if (near[i] <= 2) {
      const ht = hub ? (near[i] === 1 ? 1.0 : 1.5) : near[i] === 1 ? 0.55 + r() * 0.4 : 1.0 + r() * 0.6;
      M4.compose(V.set(x + 0.5, ht / 2 - 0.4, y + 0.5), id, S3.set(1, ht, 1)); wm.setMatrixAt(wi, M4);
      wm.setColorAt(wi++, C.copy(wc0).lerp(fcol[0], 0.45).multiplyScalar((near[i] === 1 ? 2.3 : 1.7) + r() * 0.5));
    }
  }
  fm.instanceMatrix.needsUpdate = true; wm.instanceMatrix.needsUpdate = true; if (fm.instanceColor) fm.instanceColor.needsUpdate = true; if (wm.instanceColor) wm.instanceColor.needsUpdate = true;
  T.world.add(fm, wm);
  // the glowing depths under the map
  const dm = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshBasicMaterial({ map: depthTex(b.accent), color: hdr('#ffffff', 0.55) })); dm.material.map.repeat.set(14, 14);
  dm.rotation.x = -Math.PI / 2; dm.position.set(w / 2, -7, h / 2); dm.userData.own = true; T.world.add(dm); T.depth = dm;
  // props
  const stone = new THREE.MeshStandardMaterial({ color: C.copy(wc0).lerp(new THREE.Color('#888'), 0.35).multiplyScalar(1.9).clone(), roughness: 0.95, flatShading: true });
  const add = (m, own = true) => { m.userData.own = own; T.world.add(m); return m; };
  for (const d of map.decor) {
    if (ROCK.includes(d.spr)) {
      const s = 0.32 + (d.sc - 2) * 0.16 + r() * 0.12, m = add(new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), stone), false);
      m.scale.set(s * (0.9 + r() * 0.5), s * (0.7 + r() * 0.4), s * (0.9 + r() * 0.5)); m.position.set(d.x, s * 0.5, d.y); m.rotation.set(r() * 3, r() * 3, r() * 3); m.castShadow = m.receiveShadow = true;
    } else if (CRYS.includes(d.spr)) {
      const col = d.light || '#7fd4ff', mat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.6, roughness: 0.25, metalness: 0.1, flatShading: true });
      for (let k = 0; k < 4; k++) { const hgt = 0.5 + r() * 0.9, m = add(new THREE.Mesh(new THREE.ConeGeometry(0.13 + r() * 0.1, hgt, 5), mat), false); m.position.set(d.x + (r() - 0.5) * 0.5, hgt / 2, d.y + (r() - 0.5) * 0.5); m.rotation.set((r() - 0.5) * 0.6, r() * 6, (r() - 0.5) * 0.6); m.castShadow = true; }
      T.src.push({ x: d.x, h: 0.7, y: d.y, col, int: 9, fl: 0.15 });
    } else if (COLS.includes(d.spr)) {
      const ob = d.spr.includes('obelisk'), broken = d.spr === 'd_column', hgt = broken ? 1.0 + r() * 0.9 : ob ? 2.4 : 2.1;
      const m = add(new THREE.Mesh(new THREE.CylinderGeometry(ob ? 0.1 : 0.27, ob ? 0.34 : 0.3, hgt, ob ? 4 : 10), stone), false); m.position.set(d.x, hgt / 2, d.y); m.castShadow = m.receiveShadow = true; if (broken) m.rotation.z = (r() - 0.5) * 0.12;
      const base = add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.18, 0.8), stone), false); base.position.set(d.x, 0.09, d.y); base.castShadow = base.receiveShadow = true;
      if (d.light) { const band = add(new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.12, 10), new THREE.MeshBasicMaterial({ color: hdr(d.light, 2.6) })), false); band.position.set(d.x, hgt * 0.62, d.y); T.src.push({ x: d.x, h: 1.5, y: d.y, col: d.light, int: 10, fl: 0.1 }); }
    } else if (FIRE.includes(d.spr)) {
      const bowl = add(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.16, 0.3, 8), new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.6, metalness: 0.7 })), false);
      const big = d.spr !== 'd_brazier', bh = big ? 0.15 : 0.75; bowl.position.set(d.x, bh, d.y); bowl.castShadow = true;
      if (!big) { const leg = add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 0.7, 6), bowl.material), false); leg.position.set(d.x, 0.35, d.y); leg.castShadow = true; }
      const fl = add(new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), new THREE.MeshBasicMaterial({ color: hdr(d.light || '#ff8a3a', 3.2) })), false); fl.position.set(d.x, bh + 0.32, d.y);
      T.flames.push({ m: fl, x: d.x, h: bh + 0.3, y: d.y, col: d.light || '#ff8a3a', big });
      T.src.push({ x: d.x, h: bh + 0.8, y: d.y, col: d.light || '#ff8a3a', int: big ? 20 : 15, fl: 0.3 });
    } else {
      const m = mkSprite(d.spr, d.v, d.sc); place(m, d.x, d.y, 0); m.receiveShadow = false; add(m, false);
      if (d.light) T.src.push({ x: d.x, h: sprSize(d.sc) * 0.6, y: d.y, col: d.light, int: 11, fl: 0.2 });
    }
  }
  // mood per biome
  const acc = new THREE.Color(b.accent);
  T.hemi.color.copy(acc).lerp(new THREE.Color('#9fb0d0'), 0.6); T.hemi.groundColor.set(b.void); T.hemi.intensity = hub ? 1.3 : 0.95 + (1 - b.ambient) * 0.9;
  T.sun.color.copy(acc).lerp(new THREE.Color('#ffffff'), 0.55); T.sun.intensity = hub ? 2.0 : 1.5 + (1 - b.ambient) * 1.6;
  T.scene.background.set(b.void);
}

// ---------------------------------------------------------------- frame
const AMB = { ash: ['#ff8a3a', 1.4, 0.5], ice: ['#dff2ff', -1.6, 0.9], swamp: ['#a6e65e', 0.35, 0.35], desert: ['#e8c98a', 0.2, 0.5], abyss: ['#b98bff', 0.6, 0.45], grave: ['#9fd8c8', 0.35, 0.3], cave: ['#d8c8a0', 0.2, 0.2], hub: ['#ffcf8a', 0.7, 0.3] };
function frame(dt) {
  const z = G.zone, ctx = R.ctx, W = R.W, H = R.H, t = G.time, p = G.p, zm = zoomNow();
  if (!z || !T.ready) return;
  setCamera();
  if (T.map !== z.map) buildMap(z);
  const b = biomeOf(z.map.biome), camQ = T.cam.quaternion, tick = (T.tick = (T.tick || 0) + 1);
  // ---- actors
  for (const a of z.actors) {
    if (a.dead || (a.kind === 'npc' && !a.spr)) continue;
    let e = T.live.get(a);
    if (!e) {
      e = { mesh: mkSprite(a.spr, a.sv || 0, a.sc || 3), ring: null, xray: null };
      if (a.elite || a.boss || a.kind === 'minion' || a.kind === 'ally') { e.ring = new THREE.Mesh(T.gRing, new THREE.MeshBasicMaterial({ color: hdr(a.boss ? '#ff4d4d' : a.elite === 2 ? '#ffe45e' : a.elite ? '#6f8fff' : a.kind === 'ally' ? '#8fd6ff' : '#7be04a', 1.8), transparent: true, opacity: 0.85, depthWrite: false })); e.ring.rotation.x = -Math.PI / 2; T.dyn.add(e.ring); }
      if (a.hero) { e.xray = new THREE.Mesh(e.mesh.geometry, T.mXray); e.xray.renderOrder = 5; T.dyn.add(e.xray); }
      T.dyn.add(e.mesh); T.live.set(a, e);
    }
    e.seen = tick;
    const s = sprSize(a.sc || 3), moving = a.mv > 0, bob = moving ? Math.abs(Math.sin(t * 13 + a.bob)) * 0.07 : 0, br = 1 + Math.sin(t * 2.6 + a.bob) * 0.03;
    const hov = a.fly ? 0.45 + Math.sin(t * 3 + a.bob) * 0.08 : 0, lun = a.lunge > 0 ? (a.lunge / 0.15) * 0.14 * a.face : 0;
    const m = e.mesh; place(m, a.x, a.y, hov + bob); if (lun) m.position.addScaledVector(V.set(1, 0, -1).normalize(), lun);
    if (a.wind > 0 || a.fuse > 0) m.position.x += Math.sin(t * 60) * 0.03;
    m.scale.set(s * (a.face < 0 ? -1 : 1) * (2 - br), s * br, 1);
    if (moving) { Q.setFromAxisAngle(V.set(0, 0, 1), Math.sin(t * 13 + a.bob) * 0.07); m.quaternion.copy(camQ).multiply(Q); } else m.quaternion.copy(camQ);
    m.material = a.flash > 0 || (a.st && a.st.freeze && Math.sin(t * 20) > 0.6) ? T.mWhite : (a.inv > 0 && !a.hero) || (a.hero && a.iframe > 0) ? T.mGhost : T.mSpr;
    if (e.ring) { const rr = s * 0.42; e.ring.position.set(a.x, 0.03, a.y); e.ring.scale.set(rr, rr, 1); }
    if (e.xray) { e.xray.position.copy(m.position); e.xray.scale.copy(m.scale); e.xray.quaternion.copy(m.quaternion); }
  }
  for (const [a, e] of T.live) if (e.seen !== tick) { T.dyn.remove(e.mesh); if (e.ring) { T.dyn.remove(e.ring); e.ring.material.dispose(); } if (e.xray) T.dyn.remove(e.xray); T.live.delete(a); }
  // ---- drops, objects, projectiles share one cache keyed by the game object
  const dynSeen = (key, make) => { let m = T.fxm.get(key); if (!m) { m = make(); T.dyn.add(m); T.fxm.set(key, m); } m.userData.seen = tick; return m; };
  const src = T.dynSrc = [];
  for (const d of z.drops) {
    const k = Math.min(1, d.t / 0.35), x = d.x + (d.tx - d.x) * k, y = d.y + (d.ty - d.y) * k, arc = Math.sin(k * Math.PI) * 0.6;
    const spr = d.kind === 'item' ? itemSprite(d.item) : d.kind === 'gold' ? ['u_coin', 0] : d.kind === 'support' ? ['k_gem', 0] : [MATS[d.mid].i, 0];
    const m = dynSeen(d, () => mkSprite(spr[0], spr[1], d.kind === 'item' ? 2 : 1.5)); place(m, x, y, arc + 0.03 + Math.sin(t * 3 + d.x) * 0.03);
    if (d.kind === 'item' && d.item.rar >= 3 && k >= 1) {
      const col = RAR[d.item.rar].c, beam = dynSeen(d.id + 'b', () => { const bm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 7, 0.07), new THREE.MeshBasicMaterial({ color: hdr(col, 2.2), transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false })); bm.userData.own = true; return bm; });
      beam.position.set(d.tx, 3.5, d.ty); if (Math.random() < 0.15) emit(d.tx, 0.2, d.ty, { col, up: 1.6, life: 0.9, size: 0.06, spread: 0.4 });
      if (d.item.rar >= 4) src.push({ x: d.tx, h: 0.8, y: d.ty, col, int: 7, fl: 0.2 });
    }
  }
  for (const o of z.objs) {
    if (o.kind === 'portal') {
      const m = dynSeen(o, () => { const g = new THREE.Group(); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.09, 10, 40), new THREE.MeshBasicMaterial({ color: hdr('#b06bff', 3) })); const disc = new THREE.Mesh(T.gCircle, new THREE.MeshBasicMaterial({ color: hdr('#5a2aa8', 1.4), transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending, depthWrite: false })); disc.scale.set(0.8, 0.8, 1); g.add(ring, disc); return g; });
      m.position.set(o.x, 1.15, o.y).addScaledVector(toCam, BIAS); m.quaternion.copy(camQ); m.children[0].rotation.z = t * 1.4; m.children[1].scale.setScalar(0.76 + Math.sin(t * 4) * 0.05);
      src.push({ x: o.x, h: 1.2, y: o.y, col: '#b06bff', int: 22, fl: 0.2 }); if (Math.random() < 0.5) emit(o.x, 1.1, o.y, { col: '#c89bff', spd: 1.2, up: 0.8, life: 0.8, size: 0.07, spread: 1 });
    } else if (o.kind === 'trap') { const on = ((t + o.ph) % 3) > 2, m = dynSeen(o, () => mkSprite('d_spiketrap', 0, 2.5)); place(m, o.x, o.y, on ? 0 : -0.28); m.material = on && Math.sin(t * 30) > 0 ? T.mWhite : T.mSpr; }
    else { const name = o.kind === 'chest' ? (o.used ? 'd_chestopen' : o.rich ? 'd_chestlocked' : 'd_chest') : o.kind === 'shrine' ? 'd_runetablet' : 'd_stairs'; const m = dynSeen(o.kind + o.x + '_' + o.y + name, () => mkSprite(name, 0, o.kind === 'stairs' ? 4 : o.kind === 'shrine' ? 3.5 : 3)); place(m, o.x, o.y, o.kind === 'shrine' && !o.used ? 0.15 + Math.sin(t * 3) * 0.08 : 0); if (o.kind === 'shrine' && !o.used) src.push({ x: o.x, h: 1, y: o.y, col: '#36e0c8', int: 12, fl: 0.2 }); }
  }
  for (const pr of z.projs) {
    const big = pr.big ? 0.3 : 0.15, sz = big * (pr.serpent ? 1.6 : 1);
    const m = dynSeen(pr, () => { const mm = new THREE.Mesh(pr.arrow ? new THREE.BoxGeometry(0.7, 0.05, 0.05) : T.gBall, new THREE.MeshBasicMaterial({ color: hdr(pr.col, pr.arrow ? 1.6 : 3.2) })); mm.userData.ownMat = true; return mm; });
    m.position.set(pr.x, 0.62, pr.y);
    if (pr.arrow) m.rotation.set(0, -Math.atan2(pr.vy, pr.vx), 0); else m.scale.setScalar(sz);
    if (!pr.arrow) { emit(pr.x, 0.62, pr.y, { col: pr.col, life: 0.32, size: sz * 0.9, spread: sz, k: 1.2 }); src.push({ x: pr.x, h: 0.9, y: pr.y, col: pr.col, int: pr.big ? 9 : 5, fl: 0 }); }
  }
  // ---- telegraphs and zones
  for (const a of z.areas) {
    if (a.done) continue;
    if (a.trap && a.state === 0) { const m = dynSeen(a, () => mkSprite('k_trap', 0, 2)); place(m, a.x, a.y, 0); m.material = G.time < a.arm ? T.mGhost : T.mSpr; continue; }
    let e = T.areas.get(a);
    if (!e) {
      const hostile = a.vs === 0 && !a.soak, col = hostile ? '#ff3a30' : a.col || '#ffffff', g = new THREE.Group();
      const mat = (k, op, addv) => new THREE.MeshBasicMaterial({ color: hdr(col, k), transparent: true, opacity: op, depthWrite: false, blending: addv ? THREE.AdditiveBlending : THREE.NormalBlending, side: THREE.DoubleSide });
      let fill, edge = null, grow;
      if (a.shape === 'line') { fill = new THREE.Mesh(T.gPlane, mat(0.9, 0.22)); grow = new THREE.Mesh(T.gPlane, mat(1.8, 0.4, true)); }
      else if (a.shape === 'ring') { const gg = new THREE.RingGeometry(a.inner, a.rad, 64); fill = new THREE.Mesh(gg, mat(0.9, 0.24)); grow = new THREE.Mesh(gg, mat(1.8, 0.35, true)); fill.userData.geo = gg; }
      else { fill = new THREE.Mesh(T.gCircle, mat(0.9, 0.2)); grow = new THREE.Mesh(T.gCircle, mat(1.8, 0.4, true)); edge = new THREE.Mesh(T.gRing, mat(2.8, 0.95, true)); }
      g.add(fill, grow); if (edge) g.add(edge); g.rotation.x = -Math.PI / 2; g.position.y = 0.035 + (T.areas.size % 7) * 0.003;
      e = { g, fill, grow, edge }; T.dyn.add(g); T.areas.set(a, e);
    }
    e.seen = tick; const g = e.g, k = a.state === 0 ? Math.min(1, a.t / a.delay) : 1;
    if (a.shape === 'line') {
      g.rotation.set(-Math.PI / 2, 0, -a.ang); const cx = Math.cos(a.ang), cy = Math.sin(a.ang);
      g.position.x = a.x; g.position.z = a.y; e.fill.position.set(a.len / 2, 0, 0); e.fill.scale.set(a.len, a.w, 1); e.grow.position.set((a.len * k) / 2, 0, 0.001); e.grow.scale.set(a.len * k, a.w, 1); void cx; void cy;
    } else {
      g.position.x = a.x; g.position.z = a.y;
      if (a.shape === 'ring') { const kk = a.inner / a.rad + (1 - a.inner / a.rad) * k; e.grow.scale.set(1, 1, 1); e.grow.material.opacity = 0.12 + 0.3 * kk; }
      else { e.fill.scale.set(a.rad, a.rad, 1); e.edge.scale.set(a.rad, a.rad, 1); e.grow.scale.set(a.rad * k, a.rad * k, 1); e.grow.position.z = 0.001; }
    }
    if (a.state === 1) { e.grow.material.opacity = 0.16 + Math.sin(t * 6 + a.x) * 0.06; e.fill.material.opacity = 0.1; if (Math.random() < 0.3) { const an = Math.random() * 6.28, d = Math.random() * a.rad; emit(a.x + Math.cos(an) * d, 0.05, a.y + Math.sin(an) * d, { col: a.col || '#ff5030', up: 1.3, life: 0.7, size: 0.07 }); } src.push({ x: a.x, h: 0.8, y: a.y, col: a.col || '#ff5030', int: 6 + a.rad * 2, fl: 0.2 }); }
  }
  for (const [a, e] of T.areas) if (e.seen !== tick) { T.dyn.remove(e.g); for (const c of e.g.children) { c.material.dispose(); if (c.userData.geo) c.userData.geo.dispose(); } T.areas.delete(a); }
  // ---- one-shot effects
  for (const f of z.fx) {
    const k = f.t / f.dur;
    if (!f._3d) {
      f._3d = 1;
      if (f.kind === 'poof') emit(f.x, 0.5, f.y, { n: 16, col: f.col || '#ffffff', spd: 2.6, up: 2.2, life: 0.5, size: 0.11, grav: 5 });
      else if (f.kind === 'spark') emit(f.x, 0.6, f.y, { n: 8, col: f.col || '#ffffff', spd: 3.4, up: 2, life: 0.28, size: 0.08, grav: 9 });
      else if (f.kind === 'dust') emit(f.x, 0.05, f.y, { n: 2, col: '#6a6050', spd: 0.5, up: 0.5, life: 0.5, size: 0.14, k: 0.5 });
      else if (f.kind === 'death') emit(f.x, 0.5, f.y, { n: 22, col: '#ff5a3a', spd: 3, up: 3, life: 0.6, size: 0.1, grav: 8 });
      else if (f.kind === 'ring') emit(f.x, 0.1, f.y, { n: Math.min(40, 10 + Math.round(f.rad * 6)), col: f.col || '#ffffff', spd: f.rad * 2.4, up: 1.4, life: 0.45, size: 0.09, grav: 3 });
    }
    if (f.kind === 'ring' || f.kind === 'slash' || f.kind === 'lineflash' || f.kind === 'bolt' || f.kind === 'decal' || f.kind === 'death') {
      const m = dynSeen(f, () => {
        const col = f.col || '#ffffff'; let mm;
        const bm = (kk, addv = true) => new THREE.MeshBasicMaterial({ color: hdr(col, kk), transparent: true, opacity: 1, depthWrite: false, blending: addv ? THREE.AdditiveBlending : THREE.NormalBlending, side: THREE.DoubleSide });
        if (f.kind === 'ring') { mm = new THREE.Mesh(T.gRing, bm(2.6)); mm.rotation.x = -Math.PI / 2; }
        else if (f.kind === 'slash') { const half = ((f.arc * Math.PI) / 180) / 2; mm = new THREE.Mesh(new THREE.RingGeometry(f.rad * 0.45, f.rad, 20, 1, -f.ang - half, half * 2), bm(1.8)); mm.rotation.x = -Math.PI / 2; mm.userData.own = true; }
        else if (f.kind === 'lineflash') { mm = new THREE.Mesh(T.gPlane, bm(2.4)); mm.rotation.set(-Math.PI / 2, 0, -f.ang); mm.scale.set(f.len, f.w, 1); }
        else if (f.kind === 'decal') { mm = new THREE.Mesh(T.gCircle, new THREE.MeshBasicMaterial({ color: f.col || '#1a0606', transparent: true, opacity: 0.55, depthWrite: false })); mm.rotation.x = -Math.PI / 2; mm.scale.set(f.rad * 0.7, f.rad * 0.5, 1); }
        else if (f.kind === 'death') { mm = mkSprite(f.spr, f.sv || 0, f.sc || 3, T.mWhite, false); }
        else { const pts = []; for (let i = 0; i <= 7; i++) pts.push(new THREE.Vector3(f.x + (f.x2 - f.x) * i / 7 + (i % 7 ? (Math.random() - 0.5) * 0.5 : 0), 0.7 + (i % 7 ? (Math.random() - 0.5) * 0.5 : 0), f.y + (f.y2 - f.y) * i / 7 + (i % 7 ? (Math.random() - 0.5) * 0.5 : 0))); mm = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, 0.045, 5), bm(3.4)); mm.userData.own = true; emit(f.x2, 0.7, f.y2, { n: 6, col, spd: 2.5, up: 1.5, life: 0.25, size: 0.08 }); }
        mm.userData.ownMat = true; return mm;
      });
      if (f.kind === 'ring') { const rr = f.rad * (0.3 + 0.7 * k); m.position.set(f.x, 0.06, f.y); m.scale.set(rr, rr, 1); m.material.opacity = 1 - k; }
      else if (f.kind === 'slash') { m.position.set(f.x, 0.55, f.y); m.material.opacity = (1 - k) * 0.85; }
      else if (f.kind === 'lineflash') { m.position.set(f.x + Math.cos(f.ang) * f.len / 2, 0.07, f.y + Math.sin(f.ang) * f.len / 2); m.material.opacity = (1 - k) * 0.8; }
      else if (f.kind === 'decal') { m.position.set(f.x, 0.022, f.y); m.material.opacity = Math.min(0.55, (1 - k) * 2); }
      else if (f.kind === 'death') { place(m, f.x, f.y, k * 0.4); const s = sprSize(f.sc || 3) * (1 - k * 0.8); m.scale.set(s, s * (1 + k * 0.5), 1); }
      else m.material.opacity = 1 - k;
    }
  }
  for (const [key, m] of T.fxm) if (m.userData.seen !== tick) { T.dyn.remove(m); if (m.userData.own && m.geometry) m.geometry.dispose(); if (m.userData.ownMat && m.material) m.material.dispose(); T.fxm.delete(key); }
  // ---- fire, ambience
  for (const f of T.flames) { const s = 0.85 + Math.sin(t * 17 + f.x) * 0.12 + Math.sin(t * 31 + f.y) * 0.08; f.m.scale.set(s, s * 1.5, s); f.m.rotation.y = t * 2; if (Math.abs(f.x - G.cam.x) + Math.abs(f.y - G.cam.y) < 26 && Math.random() < 0.55) emit(f.x, f.h + 0.1, f.y, { col: f.col, up: 1.9, life: 0.7, size: f.big ? 0.13 : 0.09, spread: 0.25, k: 1.8 }); }
  const am = AMB[z.map.biome] || AMB.cave;
  for (let i = 0; i < 3; i++) if (Math.random() < am[2]) emit(G.cam.x + (Math.random() - 0.5) * 30, am[1] < 0 ? 7 + Math.random() * 3 : Math.random() * 2.5, G.cam.y + (Math.random() - 0.5) * 30, { col: am[0], up: 0, vx: 0.3, life: 3.2, size: 0.05, k: 1.1, grav: -am[1] * 0.5 });
  updateParticles(dt);
  // ---- lights: the nearest sources get the pooled point lights
  if (p) { T.plight.position.set(p.x, 2.3, p.y); T.plight.intensity = (p.dead ? 5 : 24) * (1 + Math.sin(t * 9) * 0.03 + Math.sin(t * 23) * 0.02); T.sun.target.position.set(Math.round(G.cam.x), 0, Math.round(G.cam.y)); T.sun.position.set(Math.round(G.cam.x) - 14, 30, Math.round(G.cam.y) + 9); }
  for (const bo of z.bosses) if (!bo.dead) src.push({ x: bo.x, h: 1.6, y: bo.y, col: '#ff5a40', int: 14, fl: 0.15 });
  const all = src; for (const s of T.src) if (Math.abs(s.x - G.cam.x) + Math.abs(s.y - G.cam.y) < 30) all.push(s);
  for (const s of all) s.d = (s.x - G.cam.x) ** 2 + (s.y - G.cam.y) ** 2;
  all.sort((a, c) => a.d - c.d);
  // merge nearby sources so a cluster of projectiles/spells can't stack a dozen lights on one spot (overexposure)
  const pick = []; for (const s of all) { const m = pick.find((q) => (q.x - s.x) ** 2 + (q.y - s.y) ** 2 < 4); if (m) { m.int = Math.min(m.cap, m.int + s.int * 0.2); continue; } if (pick.length < NLIGHT) pick.push({ ...s, cap: Math.min(26, s.int * 1.5) }); }
  for (let i = 0; i < NLIGHT; i++) { const l = T.lights[i], s = pick[i]; if (!s) { l.intensity = 0; continue; } l.position.set(s.x, s.h, s.y); l.color.set(s.col); l.intensity = Math.min(26, s.int) * (1 + (s.fl ? Math.sin(t * 11 + s.x * 3) * s.fl * 0.5 + Math.sin(t * 27 + s.y) * s.fl * 0.3 : 0)); }
  if (T.depth) T.depth.material.map.offset.set(t * 0.004, t * 0.003);
  // ---- draw
  if (T.pipe) { try { T.pipe.render(); } catch (e) { console.warn('post pipeline failed, plain render', e); T.pipe = null; } }
  if (!T.pipe) T.renderer.render(T.scene, T.cam);
  // ---- 2D overlay: text, bars, labels, vignette
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H); ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = b.accent + '0a'; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(vignette(W, H), 0, 0);
  dangerOverlay(ctx, t, dt, W, H);
  drawOverlay(ctx, z, W, H, t, zm, p);
}
export const gfxInfo = () => (T.ready ? T.backend : '2D');
