// UI plumbing: panels, tooltips, toasts, item rendering.
import { G } from '../state.js';
import { bus, fmt } from '../util.js';
import { iconHTML } from '../gfx.js';
import { RAR, SLOT_NAME, statLine } from '../data/defs.js';
import { BASES, UNIQUES } from '../data/items.js';
import { itemInfo } from '../stats.js';
import { sellValue, itemSprite, slotFor, itemScore } from '../items.js';

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

export const itemSources = {}; // extra tooltip sources registered by other UI modules
export function getItem(ref) {
  if (!ref) return null; const [src, k, k2] = ref.split(':');
  if (itemSources[src]) return itemSources[src](k, k2);
  return src === 'bag' ? G.ch.bag[k] : src === 'eq' ? G.ch.equip[k] : src === 'stash' ? G.save.stash[k] : src === 'vend' ? G.vendor[k] : null;
}
export function cellHTML(it, ref, extra = '') {
  if (!it) return `<div class="cell" data-slot="${ref}">${extra}</div>`;
  const [spr, v] = itemSprite(it);
  return `<div class="cell r${it.rar}${UI.sel === ref ? ' sel' : ''}" data-it="${ref}">${iconHTML(spr, v, 40)}${it.up ? `<span class="tag">+${it.up}</span>` : ''}</div>`;
}
export function itemTip(it, hd) {
  const B = BASES[it.base], info = itemInfo(it), R = RAR[it.rar];
  const [spr, v] = itemSprite(it);
  let h = `<div class="tip itip r${it.rar}" style="--rc:${R.c}">${hd ? `<div class="hd">${hd}</div>` : ''}<div class="ihead"><div class="cell r${it.rar}">${iconHTML(spr, v, 40)}</div><div><div class="nm" style="color:${R.c}">${it.name}${it.up ? ' +' + it.up : ''}</div>`;
  h += `<div class="small" style="color:${R.c};opacity:.8">${R.n} · ${B.n}</div><div class="dim small">${SLOT_NAME[B.s]}${B.h === 2 ? ' (двуручное)' : ''} · ур. ${it.ilvl}${it.q ? ` · качество +${it.q * 2}%` : ''}</div></div></div>`;
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
// Stat-by-stat difference if the item replaced the equipped one.
function deltaHTML(it, eq) {
  const a = itemInfo(it), b = eq ? itemInfo(eq) : { mods: [], wpn: null }, d = {};
  for (const [k, v] of a.mods) d[k] = (d[k] || 0) + v;
  for (const [k, v] of b.mods) d[k] = (d[k] || 0) - v;
  const rows = [];
  const dps = (w) => (w ? ((w.min + w.max) / 2) * w.aps : 0);
  if (a.wpn || b.wpn) { const x = dps(a.wpn) - dps(b.wpn); if (Math.abs(x) >= 0.5) rows.push([x, `${x > 0 ? '+' : ''}${Math.round(x)} УВС оружия`]); }
  for (const k in d) { const x = d[k]; if (Math.abs(x) < 0.05) continue; rows.push([x, statLine(k, x)]); }
  if (!rows.length) return '';
  const sa = itemScore(it, G.ch.cls), sb = eq ? itemScore(eq, G.ch.cls) : 0, pct = sb > 0 ? Math.round(((sa - sb) / sb) * 100) : null;
  return `<div class="sep"></div><div class="hd">Если надеть${pct != null ? ` · <span class="${pct >= 0 ? 'good' : 'bad'}">${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct)}%</span>` : ''}</div>` +
    rows.slice(0, 12).map(([x, t]) => `<div class="small ${x > 0 ? 'good' : 'bad'}">${x > 0 ? '▲' : '▼'} ${t}</div>`).join('');
}
export function itemTipCompare(it, ref) {
  if (!ref || ref.startsWith('eq:') || ref.startsWith('bot:') || !G.ch) return itemTip(it);
  const eq = G.ch.equip[slotFor(G.ch, it)];
  let h = itemTip(it); if (eq !== it) h = h.replace(/<\/div>$/, deltaHTML(it, eq) + '</div>');
  if (eq && eq !== it) h += itemTip(eq, 'Надето');
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
const TABS = [['inv', 'Персонаж', 'I'], ['skills', 'Навыки', 'K'], ['tree', 'Таланты', 'P'], ['lfg', 'Группы', 'G'], ['ladder', 'Рейтинги', 'L'], ['guild', 'Гильдия', ''], ['dm', 'Письма', '']];
export function refresh() {
  if (!UI.panel) return;
  const def = PANELS[UI.panel], root = $('#panels');
  const keep = [...root.querySelectorAll('.scroll')].map((e) => e.scrollTop);
  root.classList.add('open');
  const tabs = TABS.some((t) => t[0] === UI.panel) ? `<nav class="ptabs">${TABS.map(([n, l, k]) => `<button data-tab="${n}" class="${n === UI.panel ? 'on' : ''}">${l}${k ? `<span class="hk">${k}</span>` : ''}</button>`).join('')}</nav>` : '';
  root.innerHTML = `<div class="panel pn-${UI.panel}" style="${def.style || ''}">${tabs}<header><h2>${typeof def.title === 'function' ? def.title(UI.arg) : def.title}</h2>${def.head ? def.head(UI.arg) : ''}<button data-a="close" class="xbtn" data-tip="Закрыть (Esc)">✕</button></header><div class="body">${def.render(UI.arg)}</div></div>`;
  root.querySelectorAll('.scroll').forEach((e, i) => { if (keep[i]) e.scrollTop = keep[i]; });
  if (def.after) def.after(root, UI.arg);
}
export function initUICore() {
  const root = $('#panels');
  root.addEventListener('mousedown', (e) => { if (e.target === root) closePanel(); });
  const handle = (e, right) => {
    const tb = e.target.closest('[data-tab]'); if (tb && !right) { openPanel(tb.dataset.tab, tb.dataset.tab === 'skills' ? { slot: 0 } : {}); return; }
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
