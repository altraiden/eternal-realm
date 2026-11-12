// Passive tree window: pan / zoom canvas, allocate with LMB, refund with RMB.
import { G } from '../state.js';
import { TREE, startNode } from '../data/passives.js';
import { CLASSES } from '../data/classes.js';
import { statLine } from '../data/defs.js';
import { refreshStats, toast } from '../game.js';
import { saveNow } from '../save.js';
import { $, definePanel, showTip, hideTip } from './core.js';

const view = { x: 0, y: 0, z: 0.55, init: null };
const RAD = { small: 9, notable: 14, key: 21, start: 17 };
const COL = { str: '#d8573c', int: '#4d8dff', dex: '#55c46a', spi: '#b06bff' };
const REFUND = 150;

function connectedWithout(ch, id) {
  const set = new Set(ch.passives); set.delete(id);
  const start = startNode(ch.cls), seen = new Set([start]), q = [start];
  while (q.length) for (const l of TREE[q.pop()].links) if (set.has(l) && !seen.has(l)) { seen.add(l); q.push(l); }
  return seen.size === set.size;
}
function draw(cv) {
  const ch = G.ch, x = cv.getContext('2d'), W = cv.width, H = cv.height, has = new Set(ch.passives);
  x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = '#0b090d'; x.fillRect(0, 0, W, H);
  x.setTransform(view.z, 0, 0, view.z, W / 2 - view.x * view.z, H / 2 - view.y * view.z);
  x.lineWidth = 3;
  for (const n of TREE) for (const l of n.links) { if (l < n.id) continue; const m = TREE[l], on = has.has(n.id) && has.has(l); x.strokeStyle = on ? '#e0b866' : has.has(n.id) || has.has(l) ? '#6b5a3a' : '#2a2530'; x.beginPath(); x.moveTo(n.x, n.y); x.lineTo(m.x, m.y); x.stroke(); }
  for (const n of TREE) {
    const r = RAD[n.type], on = has.has(n.id), avail = !on && n.links.some((l) => has.has(l));
    x.beginPath(); x.arc(n.x, n.y, r, 0, 6.2832);
    x.fillStyle = on ? (n.type === 'key' ? '#ff8a2a' : '#e0b866') : n.type === 'key' ? '#3a1d10' : n.type === 'notable' ? '#2a2333' : '#1a161f'; x.fill();
    x.lineWidth = n.type === 'small' ? 2 : 3; x.strokeStyle = on ? '#fff3c0' : avail ? '#9fe6a0' : n.type === 'key' ? '#b0541a' : n.type === 'notable' ? '#8a7a5a' : '#4a4252'; x.stroke();
    if (n.type === 'start') { x.fillStyle = n.cls === ch.cls ? '#fff' : '#777'; x.font = '600 15px Georgia'; x.textAlign = 'center'; x.fillText(CLASSES[n.cls].n, n.x, n.y - 24); }
    if (n.type === 'key') { x.fillStyle = on ? '#fff' : '#c98a5a'; x.font = '600 14px Georgia'; x.textAlign = 'center'; x.fillText(n.n, n.x, n.y + 38); }
  }
}
function nodeAt(cv, mx, my) {
  const r = cv.getBoundingClientRect(), wx = (mx - r.left - cv.width / 2) / view.z + view.x, wy = (my - r.top - cv.height / 2) / view.z + view.y;
  let best = null, bd = 1e9;
  for (const n of TREE) { const d = Math.hypot(n.x - wx, n.y - wy); if (d < RAD[n.type] + 5 && d < bd) { bd = d; best = n; } }
  return best;
}
const head = () => `Свободных очков: <b class="good">${G.ch.pp}</b> · изучено ${G.ch.passives.length - 1} из ${TREE.length - 10} · возврат узла ${REFUND} зол. (ПКМ)`;

definePanel('tree', {
  title: 'Древо талантов',
  head: () => `<span id="tr-head" class="small">${head()}</span>`,
  render: () => `<canvas id="tree" width="${Math.min(1280, window.innerWidth - 120)}" height="${Math.min(760, window.innerHeight - 130)}"></canvas>`,
  after(root) {
    const cv = $('#tree', root), ch = G.ch;
    if (view.init !== ch.id) { const s = TREE[startNode(ch.cls)]; view.x = s.x * 1.5; view.y = s.y * 1.5; view.z = 0.75; view.init = ch.id; }
    let drag = null, moved = false;
    draw(cv);
    cv.onmousedown = (e) => { drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }; moved = false; };
    cv.onmousemove = (e) => {
      if (drag && e.buttons) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 4) moved = true; view.x = drag.vx - dx / view.z; view.y = drag.vy - dy / view.z; draw(cv); hideTip(); return; }
      const n = nodeAt(cv, e.clientX, e.clientY);
      if (!n) return hideTip();
      const on = ch.passives.includes(n.id);
      showTip(`<div class="tip"><div class="nm" style="color:${n.type === 'key' ? '#ff8a2a' : '#e0b866'}">${n.n || (n.type === 'small' ? 'Талант' : '')}</div>${n.desc ? `<div>${n.desc}</div>` : n.mods.map((m) => `<div class="aff">${statLine(m[0], m[1])}</div>`).join('')}<div class="sep"></div><div class="dim small">${on ? 'Изучено · ПКМ — вернуть' : n.links.some((l) => ch.passives.includes(l)) ? 'ЛКМ — изучить' : 'Недоступно: нет пути от изученных узлов'}</div></div>`, e.clientX, e.clientY);
      e.stopPropagation();
    };
    cv.onmouseleave = hideTip;
    const done = () => { refreshStats(true); saveNow(); draw(cv); $('#tr-head').innerHTML = head(); };
    cv.onclick = (e) => {
      if (moved) return; const n = nodeAt(cv, e.clientX, e.clientY); if (!n || ch.passives.includes(n.id)) return;
      if (!n.links.some((l) => ch.passives.includes(l))) return;
      if (ch.pp <= 0) return toast('Нет свободных очков талантов', '#f88');
      ch.pp--; ch.passives.push(n.id); done();
    };
    cv.oncontextmenu = (e) => {
      e.preventDefault(); e.stopPropagation(); const n = nodeAt(cv, e.clientX, e.clientY); if (!n || n.type === 'start' || !ch.passives.includes(n.id)) return;
      if (!connectedWithout(ch, n.id)) return toast('Нельзя: другие таланты потеряют связь с началом', '#f88');
      if (ch.gold < REFUND) return toast(`Нужно ${REFUND} золота`, '#f88');
      ch.gold -= REFUND; ch.pp++; ch.passives.splice(ch.passives.indexOf(n.id), 1); done();
    };
    cv.onwheel = (e) => { e.preventDefault(); view.z = Math.max(0.25, Math.min(1.6, view.z * (e.deltaY < 0 ? 1.12 : 0.89))); draw(cv); };
  },
});
