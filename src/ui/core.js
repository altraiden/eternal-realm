// UI plumbing: panels, tooltips, toasts, item rendering.
import { G } from '../state.js';
import { bus, fmt } from '../util.js';
import { iconHTML } from '../gfx.js';
import { RAR, SLOT_NAME, statLine } from '../data/defs.js';
import { BASES, UNIQUES } from '../data/items.js';
import { itemInfo } from '../stats.js';
import { sellValue, itemSprite, slotFor } from '../items.js';

export const $ = (s, r = document) => r.querySelector(s);
export const UI = { panel: null, arg: null, sel: null };
const PANELS = {};
export const definePanel = (name, def) => { PANELS[name] = def; };

bus.on('toast', (msg, col) => {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; t.style.color = col || '#ffd27a';
  const box = $('#toasts'); box.appendChild(t); while (box.children.length > 5) box.firstChild.remove();
  setTimeout(() => t.remove(), 3300);
});

// ---- tooltips
const tipEl = () => $('#tooltip');
export function showTip(html, x, y) {
  const t = tipEl(); t.innerHTML = html; t.style.display = 'flex';
  const r = t.getBoundingClientRect();
  t.style.left = Math.max(4, Math.min(window.innerWidth - r.width - 6, x + 16)) + 'px';
  t.style.top = Math.max(4, Math.min(window.innerHeight - r.height - 6, y + 12)) + 'px';
}
export const hideTip = () => { tipEl().style.display = 'none'; };

export function getItem(ref) {
  if (!ref) return null; const [src, k] = ref.split(':');
  return src === 'bag' ? G.ch.bag[k] : src === 'eq' ? G.ch.equip[k] : src === 'stash' ? G.save.stash[k] : src === 'vend' ? G.vendor[k] : null;
}
export function cellHTML(it, ref, extra = '') {
  if (!it) return `<div class="cell" data-slot="${ref}">${extra}</div>`;
  const [spr, v] = itemSprite(it);
  return `<div class="cell r${it.rar}${UI.sel === ref ? ' sel' : ''}" data-it="${ref}">${iconHTML(spr, v, 40)}${it.up ? `<span class="tag">+${it.up}</span>` : ''}</div>`;
}
export function itemTip(it, hd) {
  const B = BASES[it.base], info = itemInfo(it), R = RAR[it.rar];
  let h = `<div class="tip">${hd ? `<div class="hd">${hd}</div>` : ''}<div class="nm" style="color:${R.c}">${it.name}${it.up ? ' +' + it.up : ''}</div>`;
  h += `<div class="dim">${R.n} · ${B.n} · ${SLOT_NAME[B.s]}${B.h === 2 ? ' (двуручное)' : ''}</div><div class="dim small">Уровень предмета ${it.ilvl}${it.q ? ` · качество +${it.q * 2}%` : ''}</div>`;
  if (info.wpn) { const w = info.wpn; h += `<div class="sep"></div><div>Урон: <b>${w.min}–${w.max}</b></div><div>Атак в секунду: ${w.aps} · крит ${w.crit}%</div><div class="gold">УВС: ${Math.round(((w.min + w.max) / 2) * w.aps)}</div>`; }
  const dn = { armor: 'Броня', evasion: 'Уклонение', mana: 'Мана', block: 'Блок %' };
  if (Object.keys(info.def).length) { h += '<div class="sep"></div>'; for (const k in info.def) h += `<div>${dn[k]}: <b>${info.def[k]}</b></div>`; }
  if (info.imp.length) { h += '<div class="sep"></div>'; for (const m of info.imp) h += `<div class="imp">${statLine(m[0], m[1])}</div>`; }
  if (info.lines.length) { h += '<div class="sep"></div>'; for (const m of info.lines) h += `<div class="aff">${statLine(m[0], m[1])}</div>`; }
  if (info.pow.length) { h += '<div class="sep"></div>'; for (const p of info.pow) h += `<div class="pow">◆ ${p}</div>`; }
  if (it.uniq) { const u = UNIQUES[it.uniq]; h += `<div class="sep"></div><div class="fl">«${u.flavor}»</div>`; if (u.boss) h += '<div class="dim small">Эксклюзивная добыча владыки</div>'; }
  h += `<div class="sep"></div><div class="dim small">Цена продажи: ${sellValue(it)} зол.</div></div>`;
  return h;
}
export function itemTipCompare(it, ref) {
  let h = itemTip(it);
  if (ref && !ref.startsWith('eq:')) { const eq = G.ch.equip[slotFor(G.ch, it)]; if (eq && eq !== it) h += itemTip(eq, 'Надето'); }
  return h;
}
export const matHTML = (id, n, MATS) => `<div class="mat" data-tip="${MATS[id].n}: ${MATS[id].d}">${iconHTML(MATS[id].i, 0, 20)}<span>${fmt(n)}</span></div>`;

// ---- panels
export function openPanel(name, arg) {
  if (!PANELS[name]) return;
  UI.panel = name; UI.arg = arg || {}; UI.sel = null; G.paused = true; G.keys = {}; G.mouse.l = G.mouse.r = false;
  refresh();
}
export function closePanel() { UI.panel = null; UI.sel = null; G.paused = false; const p = $('#panels'); p.classList.remove('open'); p.innerHTML = ''; hideTip(); }
export function refresh() {
  if (!UI.panel) return;
  const def = PANELS[UI.panel], root = $('#panels');
  const keep = [...root.querySelectorAll('.scroll')].map((e) => e.scrollTop);
  root.classList.add('open');
  root.innerHTML = `<div class="panel" style="${def.style || ''}"><header><h2>${typeof def.title === 'function' ? def.title(UI.arg) : def.title}</h2>${def.head ? def.head(UI.arg) : ''}<button data-a="close">✕</button></header><div class="body">${def.render(UI.arg)}</div></div>`;
  root.querySelectorAll('.scroll').forEach((e, i) => { if (keep[i]) e.scrollTop = keep[i]; });
  if (def.after) def.after(root, UI.arg);
}
export function initUICore() {
  const root = $('#panels');
  root.addEventListener('mousedown', (e) => { if (e.target === root) closePanel(); });
  const handle = (e, right) => {
    const t = e.target.closest('[data-a],[data-it],[data-slot]'); if (!t) return;
    if (right) e.preventDefault();
    if (t.dataset.a === 'close') return closePanel();
    const def = PANELS[UI.panel]; if (!def || !def.act) return;
    hideTip();
    if (def.act(t.dataset, right, e) !== false) refresh();
  };
  root.addEventListener('click', (e) => handle(e, false));
  root.addEventListener('contextmenu', (e) => { e.preventDefault(); handle(e, true); });
  document.addEventListener('mousemove', (e) => {
    const t = e.target.closest && e.target.closest('[data-it],[data-tip]');
    if (!t) return hideTip();
    if (t.dataset.it) { const it = getItem(t.dataset.it); if (it) showTip(itemTipCompare(it, t.dataset.it), e.clientX, e.clientY); else hideTip(); }
    else showTip(`<div class="tip">${t.dataset.tip}</div>`, e.clientX, e.clientY);
  });
}
