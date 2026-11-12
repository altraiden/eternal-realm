// In-game HUD: orbs, skill bar, buffs, minimap, run info, boss bar, DPS meter.
import { G } from '../state.js';
import { bus, fmt } from '../util.js';
import { iconHTML } from '../gfx.js';
import { SKILLS } from '../data/skills.js';
import { CLASSES } from '../data/classes.js';
import { ACTIVITIES, PORTAL_MODS, DIFFS, diffOf, CURVE } from '../data/activities.js';
import { biomeOf, drawMinimap } from '../render.js';
import { $, openPanel } from './core.js';

const KEYS = ['ЛКМ', 'ПКМ', 'Q', 'E', 'R', 'F'];
let els = null, mmT = 0, slowT = 0;

export function buildHud() {
  const hud = $('#hud'); hud.classList.remove('hidden');
  hud.innerHTML = `
  <div class="hud-tl"><div class="name" id="h-name"></div><div class="small" id="h-gold"></div><div class="small" id="h-mech"></div><div class="buffs" id="h-buffs"></div></div>
  <div class="bossbar hidden" id="h-boss"><div class="nm" id="h-bn"></div><div class="tt" id="h-bt"></div><div class="hp"><i id="h-bh"></i></div></div>
  <div class="hud-tr"><canvas id="minimap" width="180" height="180"></canvas><div class="runinfo" id="h-run"></div></div>
  <div class="hud-bl" id="h-hint"></div>
  <div class="hud-br"><div class="dps" id="h-dps"></div><div class="row"><button data-p="inv">Сумка [I]</button><button data-p="skills">Навыки [K]</button><button data-p="tree">Таланты [P]</button><button data-p="menu">Меню</button></div></div>
  <div class="hud-bottom">
    <div class="orb life"><div class="fill" id="h-hp"></div><div class="num" id="h-hpn"></div></div>
    <div class="col" style="align-items:center"><div class="bar" id="h-bar"></div></div>
    <div class="orb mana"><div class="fill" id="h-mp"></div><div class="num" id="h-mpn"></div></div>
  </div>
  <div class="xpbar"><i id="h-xp"></i></div>`;
  hud.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => openPanel(b.dataset.p)));
  hud.addEventListener('mouseenter', () => {}, true);
  els = {}; hud.querySelectorAll('[id]').forEach((e) => (els[e.id] = e));
  rebuildBar(); slowUpdate(true);
}
export function rebuildBar() {
  if (!els) return;
  const bar = G.ch.skills.bar;
  els['h-bar'].innerHTML = bar.map((id, i) => `<div class="slot" id="sl${i}" data-tip="${id ? SKILLS[id].n + ' — ' + SKILLS[id].desc : 'Пустая ячейка'}"><span class="key">${KEYS[i]}</span>${id ? iconHTML(SKILLS[id].i, 0, 48) : ''}<div class="cd"></div><div class="cdt"></div></div>`).join('') +
    `<div class="slot" id="slf" data-tip="Зелье: лечит часть здоровья и маны. Заряды восполняются убийствами."><span class="key">1</span>${iconHTML('u_flask', 0, 48)}<span class="cnt"></span></div>` +
    `<div class="slot" id="slr" data-tip="Перекат: короткий рывок с неуязвимостью."><span class="key">Пробел</span>${iconHTML('k_boot', 0, 48)}<div class="cd"></div></div>`;
}
const setTxt = (e, v) => { if (e._v !== v) { e._v = v; e.textContent = v; } };
const setHTML = (e, v) => { if (e._v !== v) { e._v = v; e.innerHTML = v; } };

function slowUpdate(force) {
  const ch = G.ch, z = G.zone, p = G.p; if (!els || !ch || !z || !p) return;
  setTxt(els['h-name'], `${ch.name} · ${CLASSES[ch.cls].n} · ур. ${ch.level}`);
  setTxt(els['h-gold'], `Золото: ${fmt(ch.gold)}` + (ch.pp > 0 ? ` · свободных талантов: ${ch.pp}` : '') + (ch.attrPts > 0 ? ` · очков характеристик: ${ch.attrPts}` : ''));
  const m = p.mech, mn = CLASSES[ch.cls].mech.n;
  setTxt(els['h-mech'], m.id === 'rage' || m.id === 'combo' || m.id === 'souls' ? `${mn}: ${Math.floor(m.v)}` : m.id === 'nature' ? `${mn}: ${m.ready ? 'готово' : Math.ceil(m.t) + ' сек.'}` : mn);
  setHTML(els['h-buffs'], p.buffs.map((b) => `<span class="buff">${b.name}${b.stacks > 1 ? ' ×' + b.stacks : ''} ${Math.ceil(b.t)}с</span>`).join(''));
  const run = z.run;
  if (!run) setHTML(els['h-run'], `<b class="gold">${biomeOf('hub').n}</b><div class="dim small">Подойдите к жителю и нажмите E</div>`);
  else {
    const act = ACTIVITIES[run.act], d = DIFFS[diffOf(run.tier)];
    let prog = '';
    if (run.act === 'tower') prog = `Этаж ${run.floor} · волна ${run.wave}/${run.waves} · рекорд ${ch.prog.towerBest}`;
    else if (run.act === 'rift') prog = run.lord ? 'Владыка разлома!' : `Убито ${Math.min(run.kills, run.need)}/${run.need} · ${Math.floor(run.t)} сек.`;
    else if (run.act === 'dungeon') prog = `Этаж ${run.floor}/${act.floors} · убито ${run.kills}`;
    else prog = `Убито ${run.kills}`;
    setHTML(els['h-run'], `<b class="gold">${act.n}</b> <span style="color:${d.c}">${d.n} ${run.tier}</span><div>${biomeOf(run.biome).n}</div><div>${run.state === 'done' ? '<span class="good">Пройдено — портал открыт</span>' : act.goal}</div><div class="dim">${prog}</div><div class="dim">Попыток: ${Math.max(0, run.maxDeaths - run.deaths + 1)} · добыча +${run.qty}% / редкость +${run.rar}%</div>${run.mods.length ? `<div class="mods">${run.mods.map((x) => PORTAL_MODS[x].n).join(', ')}</div>` : ''}`);
  }
  setTxt(els['h-hint'], z.hub ? 'WASD — движение · E — говорить · I сумка · K навыки · P таланты' : 'WASD — движение · ЛКМ/ПКМ/Q/E/R/F — навыки · Пробел — перекат · 1 — зелье · T — портал домой');
  const w = G.dps.win; let sum = 0; for (const e of w) sum += e[1];
  setTxt(els['h-dps'], G.save.settings.dps ? `УВС: ${fmt(sum / 4)}` : '');
  const need = ch.level >= 100 ? 4e6 : CURVE.xpNeed(ch.level);
  els['h-xp'].style.width = Math.min(100, (ch.xp / need) * 100) + '%';
}

bus.on('frame', (dt) => {
  const p = G.p, z = G.zone; if (!els || !p || !z) return;
  const s = p.s;
  els['h-hp'].style.height = Math.max(0, (p.hp / s.maxLife) * 100) + '%';
  els['h-mp'].style.height = s.maxMana ? Math.max(0, (p.mp / s.maxMana) * 100) + '%' : '0%';
  setTxt(els['h-hpn'], `${Math.max(0, Math.ceil(p.hp))}/${s.maxLife}`);
  setTxt(els['h-mpn'], `${Math.floor(p.mp)}/${s.maxMana}`);
  const bar = G.ch.skills.bar;
  for (let i = 0; i < 6; i++) {
    const e = document.getElementById('sl' + i); if (!e) continue; const id = bar[i], sk = id && p.sk[id];
    if (!sk) continue;
    const left = (p.cdT[id] || 0) - G.time, cd = e.children[e.children.length - 2], cdt = e.lastChild;
    cd.style.height = left > 0 ? Math.min(100, (left / sk.cd) * 100) + '%' : '0%';
    setTxt(cdt, left > 0.05 ? (left >= 10 ? Math.ceil(left) : left.toFixed(1)) : '');
    const no = s.ks_blood ? p.hp <= sk.cost : p.mp < sk.cost; if (e._no !== no) { e._no = no; e.classList.toggle('nomana', no); }
  }
  const fl = document.getElementById('slf'); if (fl) setTxt(fl.querySelector('.cnt'), String(p.flask.n));
  const rl = document.getElementById('slr'); if (rl) rl.querySelector('.cd').style.height = Math.max(0, Math.min(100, ((p.rollCd - G.time) / 1.3) * 100)) + '%';
  const b = z.bosses.find((x) => !x.dead && x.engaged);
  if (b) {
    els['h-boss'].classList.remove('hidden'); setTxt(els['h-bn'], b.name); setTxt(els['h-bt'], b.title + ' · фаза ' + (b.ph + 1));
    els['h-bh'].style.width = Math.max(0, (b.hp / b.s.maxLife) * 100) + '%';
  } else els['h-boss'].classList.add('hidden');
  mmT -= dt; if (mmT <= 0) { mmT = 0.15; drawMinimap(els['minimap']); }
  slowT -= dt; if (slowT <= 0) { slowT = 0.2; slowUpdate(); }
});
bus.on('zone', () => {
  rebuildBar(); slowUpdate(true);
  const z = G.zone; if (!z || !$('#hud')) return;
  let el = $('#zonecard'); if (!el) { el = document.createElement('div'); el.id = 'zonecard'; document.body.appendChild(el); }
  const run = z.run, sub = run ? `${ACTIVITIES[run.act].n} · ${DIFFS[diffOf(run.tier)].n} ${run.tier}${run.floor > 1 ? ' · этаж ' + run.floor : ''}` : 'Последнее убежище человечества';
  el.innerHTML = `<div class="zc-line"></div><div class="zc-name">${biomeOf(z.map.biome).n}</div><div class="zc-sub">${sub}</div><div class="zc-line"></div>`;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
});
bus.on('statsChanged', () => { /* skill tooltips depend on stats; bar is rebuilt on skill change only */ });
