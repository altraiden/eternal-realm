// In-game HUD: unit frame, class resource, buffs, orbs, skill bar, XP, minimap, objective tracker, boss bar, micro-menu.
import { G } from '../state.js';
import { bus, fmt } from '../util.js';
import { iconHTML } from '../gfx.js';
import { SKILLS } from '../data/skills.js';
import { CLASSES } from '../data/classes.js';
import { ACTIVITIES, PORTAL_MODS, DIFFS, diffOf, CURVE } from '../data/activities.js';
import { biomeOf, drawMinimap } from '../render.js';
import { $, openPanel, UI, closePanel } from './core.js';

const KEYS = ['ЛКМ', 'ПКМ', 'Q', 'E', 'R', 'F'];
// class resource: [max value or null, colour]
const MECH_BAR = { rage: [40, '#e0452c'], combo: [5, '#f0c040'], souls: [20, '#9b7bff'] };
export const MICRO = [
  ['inv', 'u_pouch', 'Персонаж и сумка', 'I'], ['skills', 'k_tome', 'Навыки и руны', 'K'], ['tree', 'k_spiritflame', 'Древо талантов', 'P'],
  ['lfg', 'k_swords', 'Группы и рейды', 'G'], ['ladder', 'k_banner', 'Рейтинги', 'L'], ['guild', 'k_shield', 'Гильдия', ''], ['dm', 'u_scroll', 'Личные сообщения', ''], ['menu', 'k_hourglass', 'Меню и настройки', 'Esc'],
];
let els = null, mmT = 0, slowT = 0;

export function buildHud() {
  const hud = $('#hud'); hud.classList.remove('hidden');
  hud.innerHTML = `
  <div class="uf" id="h-uf">
    <div class="uf-port" data-p="inv" data-tip="Персонаж (I)"><div id="h-port"></div><span class="uf-lvl" id="h-lvl"></span></div>
    <div class="uf-main"><div class="uf-name" id="h-name"></div><div class="uf-sub" id="h-sub"></div>
      <div class="uf-res" id="h-mechw"><i id="h-mech"></i><span id="h-mecht"></span></div>
      <div class="uf-badges" id="h-badges"></div></div>
  </div>
  <div class="buffs" id="h-buffs"></div>
  <div class="bossbar hidden" id="h-boss"><div class="nm" id="h-bn"></div><div class="tt" id="h-bt"></div><div class="hp"><i class="lag" id="h-bl"></i><i id="h-bh"></i><span id="h-bp"></span><b style="left:66%"></b><b style="left:33%"></b></div></div>
  <div class="hud-tr"><div class="mm-wrap"><canvas id="minimap" width="180" height="180"></canvas><div class="mm-label" id="h-zone"></div></div><div class="tracker" id="h-run"></div></div>
  <div class="hud-hint" id="h-hint"></div>
  <div class="micro" id="h-micro">${MICRO.map(([p, ic, n, k]) => `<button class="mi" data-p="${p}" data-tip="${n}${k ? ' <span class=&quot;dim&quot;>(' + k + ')</span>' : ''}">${iconHTML(ic, 0, 26)}<span class="badge" id="mb-${p}"></span></button>`).join('')}</div>
  <div class="dps" id="h-dps"></div>
  <div class="hud-bottom">
    <div class="orb life"><div class="fill" id="h-hp"></div><div class="num" id="h-hpn"></div><div class="orb-cap">Здоровье</div></div>
    <div class="bar-wrap"><div class="xpbar" id="h-xpw"><i id="h-xp"></i><span id="h-xpt"></span></div><div class="bar" id="h-bar"></div></div>
    <div class="orb mana"><div class="fill" id="h-mp"></div><div class="num" id="h-mpn"></div><div class="orb-cap">Мана</div></div>
  </div>`;
  hud.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => { if (UI.panel === b.dataset.p) closePanel(); else openPanel(b.dataset.p, b.dataset.p === 'skills' ? { slot: 0 } : {}); }));
  els = {}; hud.querySelectorAll('[id]').forEach((e) => (els[e.id] = e));
  rebuildBar(); slowUpdate(true);
}
export function rebuildBar() {
  if (!els) return;
  const bar = G.ch.skills.bar;
  els['h-port'].innerHTML = iconHTML(CLASSES[G.ch.cls].spr, 0, 56);
  els['h-bar'].innerHTML = bar.map((id, i) => `<div class="slot${i < 2 ? ' mouse' : ''}" id="sl${i}" data-tip="${id ? '<b class=&quot;gold&quot;>' + SKILLS[id].n + '</b><br>' + String(SKILLS[id].desc).replace(/"/g, '&quot;') : 'Пустая ячейка — назначьте навык в окне «Навыки» (K)'}"><span class="key">${KEYS[i]}</span>${id ? iconHTML(SKILLS[id].i, 0, 44) : ''}<div class="cd"></div><div class="cdt"></div></div>`).join('') +
    '<div class="bar-sep"></div>' +
    `<div class="slot util" id="slf" data-tip="Зелье: лечит часть здоровья и маны. Заряды восполняются убийствами."><span class="key">1</span>${iconHTML('u_flask', 0, 44)}<div class="pips" id="h-pips"></div></div>` +
    `<div class="slot util" id="slr" data-tip="Перекат: короткий рывок с неуязвимостью."><span class="key">␣</span>${iconHTML('k_boot', 0, 44)}<div class="cd"></div></div>`;
}
const setTxt = (e, v) => { if (e._v !== v) { e._v = v; e.textContent = v; } };
const setHTML = (e, v) => { if (e._v !== v) { e._v = v; e.innerHTML = v; } };

function runProgress(run, act, ch) {
  if (run.state === 'done') return [1, 'Пройдено — портал домой открыт'];
  if (run.act === 'tower') return [run.wave / Math.max(1, run.waves), `Этаж ${run.floor} · волна ${run.wave}/${run.waves} · рекорд ${ch.prog.towerBest}`];
  if (run.act === 'rift') return run.lord ? [1, 'Владыка разлома!'] : [Math.min(1, run.kills / Math.max(1, run.need)), `Убито ${Math.min(run.kills, run.need)}/${run.need} · ${Math.floor(run.t)} сек.`];
  if (act.floors) return [(run.floor - 1) / act.floors, `Этаж ${run.floor}/${act.floors} · убито ${run.kills}`];
  if (act.stages) return [(run.stage - 1) / act.stages, `Владыка ${run.stage} из ${act.stages}`];
  return [null, `Убито ${run.kills}`];
}

function slowUpdate() {
  const ch = G.ch, z = G.zone, p = G.p; if (!els || !ch || !z || !p) return;
  const cls = CLASSES[ch.cls];
  setTxt(els['h-name'], ch.name); setTxt(els['h-lvl'], ch.level); setTxt(els['h-sub'], cls.n + (ch.spec ? ' · ' + ((cls.specs.find((s) => s.id === ch.spec) || {}).n || '') : ''));
  const m = p.mech, mb = MECH_BAR[m.id];
  let frac, txt;
  if (mb) { frac = m.v / mb[0]; txt = `${cls.mech.n} ${Math.floor(m.v)}/${mb[0]}`; els['h-mech'].style.background = `linear-gradient(90deg, ${mb[1]}88, ${mb[1]})`; }
  else if (m.id === 'nature') { frac = m.ready ? 1 : 1 - m.t / 5; txt = `${cls.mech.n}: ${m.ready ? 'готово' : Math.ceil(m.t) + ' сек.'}`; els['h-mech'].style.background = 'linear-gradient(90deg,#3a8a3e,#8fe07a)'; }
  else { frac = 1; txt = cls.mech.n; els['h-mech'].style.background = 'linear-gradient(90deg,#5a4526,#a8863e)'; }
  els['h-mech'].style.width = Math.max(0, Math.min(100, frac * 100)) + '%'; setTxt(els['h-mecht'], txt);
  els['h-mechw'].dataset.tip = `<b class="gold">${cls.mech.n}</b><br>${cls.mech.d}`;
  setHTML(els['h-badges'], `<span class="bdg gold" data-tip="Золото">${iconHTML('u_coin', 0, 16)}${fmt(ch.gold)}</span>` + (ch.pp > 0 ? `<span class="bdg hot" data-p2="tree" data-tip="Свободные очки талантов — откройте древо (P)">✦ ${ch.pp}</span>` : '') + (ch.attrPts > 0 ? `<span class="bdg hot" data-p2="inv" data-tip="Свободные очки характеристик (I)">+${ch.attrPts}</span>` : ''));
  setHTML(els['h-buffs'], p.buffs.map((b) => { const sk = SKILLS[b.id]; const left = Math.max(0, b.t); return `<div class="buff" data-tip="<b class=&quot;gold&quot;>${b.name}</b>${b.stacks > 1 ? ' ×' + b.stacks : ''}<br>${Math.ceil(left)} сек.">${iconHTML(sk ? sk.i : 'k_star', 0, 26)}${b.stacks > 1 ? `<span class="st">${b.stacks}</span>` : ''}<span class="bt">${left >= 60 ? Math.ceil(left / 60) + 'м' : Math.ceil(left)}</span></div>`; }).join(''));
  document.body.classList.toggle('has-buffs', p.buffs.length > 0);
  const run = z.run;
  setTxt(els['h-zone'], run ? biomeOf(run.biome).n : biomeOf('hub').n);
  if (!run) setHTML(els['h-run'], `<div class="tr-h">Последний оплот</div><div class="tr-s">Подойдите к жителю и нажмите <b class="key">E</b></div><div class="tr-s dim">Порталы — у Хранителя в центре площади</div>`);
  else {
    const act = ACTIVITIES[run.act], d = DIFFS[diffOf(run.tier)], [pf, ptxt] = runProgress(run, act, ch);
    const lives = run.maxDeaths > 50 ? '∞' : Math.max(0, run.maxDeaths - run.deaths + 1);
    setHTML(els['h-run'], `<div class="tr-h">${act.n} <span class="tier" style="color:${d.c};border-color:${d.c}">${d.n} ${run.tier}</span></div>
      <div class="tr-goal${run.state === 'done' ? ' good' : ''}">${run.state === 'done' ? '✔ ' : '◇ '}${run.state === 'done' ? 'Испытание пройдено' : act.goal}</div>
      ${pf != null ? `<div class="tr-bar"><i style="width:${Math.round(pf * 100)}%"></i></div>` : ''}<div class="tr-s">${ptxt}</div>
      <div class="tr-s dim">${run.maxDeaths ? `Возрождений: ${lives} · ` : 'Без права на смерть · '}добыча +${run.qty}% · редкость +${run.rar}%</div>
      ${run.mods.length ? `<div class="tr-mods">${run.mods.map((x) => `<span data-tip="${PORTAL_MODS[x].d || ''}">${PORTAL_MODS[x].n}</span>`).join('')}</div>` : ''}`);
  }
  const fresh = ch.prog.runs < 3;
  setHTML(els['h-hint'], !fresh ? '' : z.hub ? '<b class="key">WASD</b> движение · <b class="key">E</b> говорить · <b class="key">I</b> сумка · <b class="key">K</b> навыки · <b class="key">P</b> таланты' : '<b class="key">ЛКМ ПКМ Q E R F</b> навыки · <b class="key">Пробел</b> перекат · <b class="key">1</b> зелье · <b class="key">T</b> домой');
  const w = G.dps.win; let sum = 0; for (const e of w) sum += e[1];
  setHTML(els['h-dps'], G.save.settings.dps && sum > 0 ? `<span class="dim">УВС</span> ${fmt(sum / 4)}` : '');
  els['h-dps'].style.display = G.save.settings.dps && sum > 0 ? '' : 'none';
  const need = ch.level >= 100 ? 4e6 : CURVE.xpNeed(ch.level), xf = Math.min(1, ch.xp / need);
  els['h-xp'].style.width = xf * 100 + '%'; els['h-xpw'].dataset.tip = `Опыт: ${fmt(ch.xp)} / ${fmt(need)} (${(xf * 100).toFixed(1)}%)`; setTxt(els['h-xpt'], `${ch.level} ур. · ${(xf * 100).toFixed(1)}%`);
  // micro-menu badges
  const unread = G.save.world && G.save.world.dm ? Object.values(G.save.world.dm).reduce((a, t) => a + (t.unread || 0), 0) : 0;
  const bd = { tree: ch.pp, inv: ch.attrPts, dm: unread };
  for (const [pn] of MICRO) { const e = els['mb-' + pn]; if (e) setTxt(e, bd[pn] > 0 ? String(bd[pn]) : ''); }
  const fl = els['h-pips']; if (fl) setHTML(fl, Array.from({ length: p.flask.max || ch.flask.max }, (_, i) => `<i class="${i < p.flask.n ? 'on' : ''}"></i>`).join(''));
}

let lagHp = 1;
bus.on('frame', (dt) => {
  const p = G.p, z = G.zone; if (!els || !p || !z) return;
  const s = p.s, hf = Math.max(0, p.hp / s.maxLife);
  els['h-hp'].style.height = hf * 100 + '%';
  els['h-mp'].style.height = s.maxMana ? Math.max(0, (p.mp / s.maxMana) * 100) + '%' : '0%';
  setTxt(els['h-hpn'], `${fmt(Math.max(0, Math.ceil(p.hp)))} / ${fmt(s.maxLife)}`);
  setTxt(els['h-mpn'], `${fmt(Math.floor(p.mp))} / ${fmt(s.maxMana)}`);
  const low = hf < 0.3 && !p.dead; if (els['h-hp']._low !== low) { els['h-hp']._low = low; els['h-hp'].parentNode.classList.toggle('low', low); }
  const bar = G.ch.skills.bar;
  for (let i = 0; i < 6; i++) {
    const e = document.getElementById('sl' + i); if (!e) continue; const id = bar[i], sk = id && p.sk[id];
    if (!sk) continue;
    const left = (p.cdT[id] || 0) - G.time, cd = e.children[e.children.length - 2], cdt = e.lastChild;
    cd.style.height = left > 0 ? Math.min(100, (left / sk.cd) * 100) + '%' : '0%';
    setTxt(cdt, left > 0.05 ? (left >= 10 ? Math.ceil(left) : left.toFixed(1)) : '');
    const ready = !(left > 0.05); if (e._rd === false && ready) { e.classList.remove('flash'); void e.offsetWidth; e.classList.add('flash'); } e._rd = ready;
    const no = s.ks_blood ? p.hp <= sk.cost : p.mp < sk.cost; if (e._no !== no) { e._no = no; e.classList.toggle('nomana', no); }
    const act = p.act && p.act.id === id; if (e._ac !== act) { e._ac = act; e.classList.toggle('on', !!act); }
  }
  const rl = document.getElementById('slr'); if (rl) rl.querySelector('.cd').style.height = Math.max(0, Math.min(100, ((p.rollCd - G.time) / 1.3) * 100)) + '%';
  const b = z.bosses.find((x) => !x.dead && x.engaged);
  if (b) {
    const f = Math.max(0, b.hp / b.s.maxLife);
    if (els['h-boss'].classList.contains('hidden')) { els['h-boss'].classList.remove('hidden'); lagHp = f; }
    setTxt(els['h-bn'], b.name); setTxt(els['h-bt'], b.title + ' · фаза ' + (b.ph + 1));
    lagHp = Math.max(f, lagHp - dt * 0.25); els['h-bh'].style.width = f * 100 + '%'; els['h-bl'].style.width = lagHp * 100 + '%'; setTxt(els['h-bp'], (f * 100).toFixed(1) + '%');
  } else els['h-boss'].classList.add('hidden');
  mmT -= dt; if (mmT <= 0) { mmT = 0.15; drawMinimap(els['minimap']); }
  slowT -= dt; if (slowT <= 0) { slowT = 0.2; slowUpdate(); }
});
document.addEventListener('click', (e) => { const t = e.target.closest && e.target.closest('[data-p2]'); if (t && G.ch) openPanel(t.dataset.p2, {}); });
bus.on('zone', () => {
  rebuildBar(); slowUpdate(true);
  const z = G.zone; if (!z || !$('#hud')) return;
  let el = $('#zonecard'); if (!el) { el = document.createElement('div'); el.id = 'zonecard'; document.body.appendChild(el); }
  const run = z.run, sub = run ? `${ACTIVITIES[run.act].n} · ${DIFFS[diffOf(run.tier)].n} ${run.tier}${run.floor > 1 ? ' · этаж ' + run.floor : ''}` : 'Последнее убежище человечества';
  el.innerHTML = `<div class="zc-orn">✦</div><div class="zc-name">${biomeOf(z.map.biome).n}</div><div class="zc-line"></div><div class="zc-sub">${sub}</div>`;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
});
