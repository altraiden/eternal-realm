// Persistence: versioned save with checksum and automatic backup (protects against corrupted writes).
import { G } from './state.js';
import { hashStr, uid } from './util.js';
import { CLASSES } from './data/classes.js';
import { startNode } from './data/passives.js';
import { START_SUPPORTS } from './data/supports.js';
import { starterGear, BAG_SIZE, STASH_SIZE } from './items.js';

const KEY = 'eternal_realm_save_v1';
const blankSave = () => ({ v: 1, chars: [], cur: -1, stash: new Array(STASH_SIZE).fill(null), supports: START_SUPPORTS.slice(), settings: { pickRar: 1, showRar: 0, dps: true, zoom: 1 }, lootLog: [] });

function decode(raw) {
  if (!raw) return null;
  try { const o = JSON.parse(raw); if (!o || typeof o.d !== 'string' || hashStr(o.d) !== o.h) return null; const s = JSON.parse(o.d); return s && s.v === 1 ? s : null; } catch { return null; }
}
export function loadSave() {
  let s = decode(localStorage.getItem(KEY));
  if (!s) { s = decode(localStorage.getItem(KEY + '_bak')); if (s) console.warn('Основное сохранение повреждено — восстановлено из резервной копии'); }
  G.save = s || blankSave();
  const b = blankSave();
  for (const k in b) if (G.save[k] === undefined) G.save[k] = b[k];
  for (const k in b.settings) if (G.save.settings[k] === undefined) G.save.settings[k] = b.settings[k];
  return G.save;
}
// The living world (hundreds of bots, auction, guilds, messages) is too big for localStorage: it lives in IndexedDB.
let db = null, lastWorld = 0;
const openDb = () => new Promise((res, rej) => { const r = indexedDB.open('eternal_realm', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
export async function loadWorld() {
  try { db = await openDb(); const w = await new Promise((res) => { const q = db.transaction('kv').objectStore('kv').get('world'); q.onsuccess = () => res(q.result); q.onerror = () => res(null); }); if (w) G.save.world = w; }
  catch (e) { console.warn('IndexedDB недоступна, мир ботов не будет сохраняться', e); }
}
export function saveWorld(force) {
  if (!db || !G.save || !G.save.world || (!force && Date.now() - lastWorld < 15000)) return;
  lastWorld = Date.now();
  try { db.transaction('kv', 'readwrite').objectStore('kv').put(G.save.world, 'world'); } catch (e) { console.warn('world save failed', e); }
}
export function saveNow() {
  if (!G.save) return;
  const world = G.save.world;
  try {
    G.save.world = undefined;
    const d = JSON.stringify(G.save), prev = localStorage.getItem(KEY);
    G.save.world = world;
    if (prev && decode(prev)) localStorage.setItem(KEY + '_bak', prev);
    localStorage.setItem(KEY, JSON.stringify({ d, h: hashStr(d), t: Date.now() }));
  } catch (e) { G.save.world = world; console.error('save failed', e); }
  saveWorld();
}
export function exportSave() { const d = JSON.stringify({ ...G.save, world: undefined }); return btoa(unescape(encodeURIComponent(JSON.stringify({ d, h: hashStr(d) })))); }
export function importSave(str) {
  try { const s = decode(decodeURIComponent(escape(atob(str.trim())))); if (!s) return false; const w = G.save && G.save.world; G.save = s; G.save.world = w; saveNow(); return true; } catch { return false; }
}

export function newChar(name, cls) {
  const def = CLASSES[cls];
  const ch = {
    id: uid(), name: name || def.n, cls, level: 70, xp: 0, gold: 600,
    attrs: { str: 0, dex: 0, int: 0, vit: 0, spi: 0, luck: 0 }, attrPts: 20,
    passives: [startNode(cls)], pp: 45, spec: null, paragon: {}, pgPts: 0,
    equip: { helm: null, chest: null, gloves: null, boots: null, belt: null, amulet: null, ring1: null, ring2: null, mainhand: null, offhand: null, relic: null, artifact: null },
    bag: new Array(BAG_SIZE).fill(null),
    skills: { bar: def.bar.slice(), sup: {} },
    mats: { dust: 20, chaos: 3, whet: 2, key: 1 },
    prog: { tier: { maps: 1, dungeon: 1, rift: 1, boss: 1, chaos: 1, tower: 1 }, towerBest: 0, bossKills: {}, kills: 0, deaths: 0, runs: 0, played: 0 },
  };
  Object.assign(ch.equip, starterGear(cls, def));
  G.save.chars.push(ch); G.save.cur = G.save.chars.length - 1;
  return ch;
}
