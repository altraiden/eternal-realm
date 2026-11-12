// All windows: inventory, skills, hub services, menu, title screen.
import { G } from '../state.js';
import { bus, fmt } from '../util.js';
import { iconHTML } from '../gfx.js';
import { CLASSES, CLASS_IDS } from '../data/classes.js';
import { SKILLS } from '../data/skills.js';
import { SUPPORTS, SUPPORT_IDS } from '../data/supports.js';
import { MATS, BASES } from '../data/items.js';
import { RAR, SLOTS, ATTRS, DTN } from '../data/defs.js';
import { ACTIVITIES, ACT_IDS, PORTAL_MODS, MOD_IDS, COMBOS, DIFFS, diffOf, CURVE } from '../data/activities.js';
import { BOSSES, BOSS_IDS } from '../data/bosses.js';
import { TREE, startNode } from '../data/passives.js';
import { defenceSummary } from '../stats.js';
import { resolveSkill, skillDps, supOK, maxSockets } from '../skills.js';
import { equipFromBag, unequip, salvage, sellValue, buyPrice, gamblePrice, genItem, addToBag, CRAFT, craftCost, doCraft, STASH_SIZE } from '../items.js';
import { refreshStats, openPortal, describeRun, leaveRun, enterHub, toast } from '../game.js';
import { saveNow, exportSave, importSave, newChar } from '../save.js';
import { $, UI, definePanel, openPanel, closePanel, refresh, cellHTML, getItem, itemTip, matHTML } from './core.js';
import { buildHud, rebuildBar } from './hud.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const changed = () => { refreshStats(true); saveNow(); };

function bagHTML(hint) {
  const ch = G.ch;
  return `<div class="col" style="width:500px"><div class="row"><h3 class="grow" style="margin:0">Сумка</h3><span class="gold">${fmt(ch.gold)} зол.</span></div>
  <div class="grid" style="grid-template-columns:repeat(10,46px)">${ch.bag.map((it, i) => cellHTML(it, 'bag:' + i)).join('')}</div>
  <div class="row wrap">${Object.keys(MATS).map((id) => matHTML(id, ch.mats[id] || 0, MATS)).join('')}</div>
  <div class="dim small">${hint}</div></div>`;
}

// ------------------------------------------------------------ inventory / character
definePanel('inv', {
  title: 'Персонаж и сумка',
  render() {
    const ch = G.ch, s = G.p.s, st = G.save.settings;
    const top = Math.max(...Object.values(ch.prog.tier)), ds = defenceSummary(s, CURVE.mobDmg(top));
    const S = (n, v, tip) => `<div class="stat"${tip ? ` data-tip="${esc(tip)}"` : ''}><span>${n}</span><b>${v}</b></div>`;
    const res = ['fire', 'cold', 'light', 'poison', 'dark'].map((t) => `${DTN[t]} ${Math.min(75, Math.round((s['res_' + t] || 0) + (s.res_all || 0)))}%`).join(' · ');
    const rarOpt = (cur) => RAR.map((r, i) => `<option value="${i}"${i === cur ? ' selected' : ''}>${r.n}</option>`).join('');
    return `<div class="col" style="width:350px">
      <div class="grid" style="grid-template-columns:repeat(3,46px);justify-content:center;gap:6px 30px">${SLOTS.map(([slot, name]) => cellHTML(ch.equip[slot], 'eq:' + slot, `<span class="ph">${name}</span>`)).join('')}</div>
      <h3>Характеристики ${ch.attrPts ? `<span class="good small">(свободно: ${ch.attrPts})</span>` : ''}</h3>
      <div class="grid" style="grid-template-columns:1fr 1fr;gap:2px 14px">${ATTRS.map(([a, n]) => `<div class="stat"><span>${n}</span><b>${Math.round(s[a.toUpperCase()])} ${ch.attrPts ? `<button data-a="attr" data-k="${a}" style="padding:0 6px">+</button>` : ''}</b></div>`).join('')}</div>
      <div class="scroll" style="max-height:250px;padding-right:6px">
      ${S('Здоровье', s.maxLife)}${S('Мана', s.maxMana)}${S('Восст. здоровья/сек', s.regen.toFixed(1))}${S('Восст. маны/сек', s.manaRegen.toFixed(1))}
      ${S('Броня', Math.round(s.armorF), `Снижает физический урон примерно на ${ds.physRed}% на вашем текущем уровне контента`)}${S('Уклонение', Math.round(s.evasionF), `Шанс уклониться около ${ds.eva}%`)}${S('Блок', Math.round(s.blockF) + '%')}${S('Снижение урона', Math.min(60, Math.round(s.dr || 0)) + '%')}
      ${S('Сопротивления', '', res)}<div class="small dim">${res}</div>
      ${S('Урон оружия', `${s.wpn.min}–${s.wpn.max}`)}${S('Шанс крита', '+' + (s.crit || 0).toFixed(1) + '% / ×' + (1 + (s.crit_inc || 0) / 100).toFixed(2))}${S('Крит. множитель', 150 + Math.round(s.critMulti || 0) + '%')}
      ${S('Скорость атаки', '+' + Math.round(s.atkSpeed_inc || 0) + '%')}${S('Скорость заклинаний', '+' + Math.round(s.castSpeed_inc || 0) + '%')}${S('Скорость бега', s.moveSpeed.toFixed(1))}
      ${S('Урон: атаки / заклинания', `+${Math.round((s.attack_inc || 0) + (s.dmg_inc || 0))}% / +${Math.round((s.spell_inc || 0) + (s.dmg_inc || 0))}%`)}${S('Урон существ', '+' + Math.round(s.minion_inc || 0) + '%')}
      ${S('Вампиризм', (s.leechF || 0).toFixed(1) + '%')}${S('Перезарядка', '+' + Math.round(s.cdr || 0) + '%')}${S('Редкость / золото', `+${Math.round(s.mf || 0)}% / +${Math.round(s.gf || 0)}%`)}
      </div>
      ${ch.level >= 100 ? `<h3>Парагон <span class="good small">(очков: ${ch.pgPts || 0})</span></h3><div class="row wrap">${[['dmg', '+1% урона'], ['life', '+0.5% здоровья'], ['mf', '+1% редкости'], ['res', '+0.3% сопр.']].map(([k, n]) => `<button data-a="pg" data-k="${k}" ${!ch.pgPts || (ch.paragon[k] || 0) >= 50 ? 'disabled' : ''}>${n} (${ch.paragon[k] || 0}/50)</button>`).join('')}</div>` : ''}
    </div>
    <div class="col">${bagHTML('ЛКМ — надеть · ПКМ — разобрать на пыль')}
      <div class="row wrap small"><span>Разобрать всё до редкости:</span><select id="salv">${rarOpt(1)}</select><button data-a="salvAll">Разобрать</button></div>
      <div class="row wrap small"><span>Фильтр: подбирать от</span><select id="pick">${rarOpt(st.pickRar)}</select><span>показывать от</span><select id="show">${rarOpt(st.showRar)}</select></div>
    </div>`;
  },
  after(root) {
    $('#pick', root).onchange = (e) => { G.save.settings.pickRar = +e.target.value; saveNow(); };
    $('#show', root).onchange = (e) => { G.save.settings.showRar = +e.target.value; saveNow(); };
  },
  act(d, right, e) {
    const ch = G.ch;
    if (d.it) {
      const [src, k] = d.it.split(':');
      if (src === 'bag') {
        if (right) { const it = ch.bag[k]; if (it.rar >= 3 && !confirm(`Разобрать «${it.name}» (${RAR[it.rar].n})?`)) return false; const r = salvage(ch, it); ch.bag[k] = null; toast(`+${r.dust} пыли${r.extra.length ? ' и ' + r.extra.join(', ') : ''}`); }
        else { const err = equipFromBag(ch, +k); if (err) toast(err, '#f88'); }
      } else if (src === 'eq') { const err = unequip(ch, k); if (err) toast(err, '#f88'); }
      changed();
    } else if (d.a === 'attr') { const n = e.shiftKey ? Math.min(5, ch.attrPts) : 1; ch.attrs[d.k] += n; ch.attrPts -= n; changed(); }
    else if (d.a === 'pg') { ch.paragon[d.k] = (ch.paragon[d.k] || 0) + 1; ch.pgPts--; changed(); }
    else if (d.a === 'salvAll') {
      const max = +$('#salv').value; let n = 0, dust = 0;
      ch.bag.forEach((it, i) => { if (it && it.rar <= max && !it.uniq) { dust += salvage(ch, it).dust; ch.bag[i] = null; n++; } });
      toast(n ? `Разобрано предметов: ${n} (+${dust} пыли)` : 'Нечего разбирать'); saveNow();
    }
  },
});

// ------------------------------------------------------------ skills
definePanel('skills', {
  title: 'Навыки и руны', style: 'width:1060px',
  render(arg) {
    const ch = G.ch, p = G.p, sel = arg.slot ?? 0, id = ch.skills.bar[sel];
    const keys = ['ЛКМ', 'ПКМ', 'Q', 'E', 'R', 'F'];
    let h = `<div class="col" style="width:440px"><div class="row">${ch.skills.bar.map((s, i) => `<div class="slot${i === sel ? ' on' : ''}" data-a="slot" data-k="${i}" style="cursor:pointer;${i === sel ? 'border-color:#fff' : ''}"><span class="key">${keys[i]}</span>${s ? iconHTML(SKILLS[s].i, 0, 48) : ''}</div>`).join('')}</div>`;
    if (id) {
      const sk = resolveSkill(p, id), def = SKILLS[id], socks = maxSockets(ch.level), sups = ch.skills.sup[id] || [], dps = skillDps(p, sk);
      h += `<h3>${def.n} <span class="dim small">ур. ${sk.lvl} · ${CLASSES[def.c].n}${def.c === ch.cls ? ' (+2 за свой класс)' : ''}</span></h3><div>${def.desc}</div>
      <div class="dim small">Теги: ${sk.tags.join(', ')}</div>
      <div class="stat"><span>Стоимость</span><b>${sk.cost} ${p.s.ks_blood ? 'здоровья' : 'маны'}</b></div><div class="stat"><span>Перезарядка</span><b>${sk.cd ? sk.cd.toFixed(1) + ' сек.' : 'нет'}</b></div><div class="stat"><span>Время применения</span><b>${(sk.wind + sk.rec).toFixed(2)} сек.</b></div>${dps ? `<div class="stat"><span>Расчётный урон в секунду (по одной цели)</span><b class="gold">${fmt(dps)}</b></div>` : ''}
      <h3>Руны навыка <span class="dim small">(${socks} ячейки; больше на 80 и 95 уровне)</span></h3><div class="row">${Array.from({ length: socks }, (_, i) => `<div class="sock" data-a="sock" data-k="${i}" style="${arg.sock === i ? 'border-color:#fff;border-style:solid' : ''}" ${sups[i] ? `data-tip="${esc(SUPPORTS[sups[i]].n + ': ' + SUPPORTS[sups[i]].d)}"` : 'data-tip="Пустая ячейка — нажмите, чтобы выбрать руну"'}>${sups[i] ? iconHTML(SUPPORTS[sups[i]].i, 0, 28) : ''}</div>`).join('')}</div>`;
      if (arg.sock != null) {
        const ok = G.save.supports.filter((s) => supOK(def, SUPPORTS[s]) && !sups.includes(s));
        h += `<div class="list scroll" style="max-height:230px">${sups[arg.sock] ? '<div class="skillrow" data-a="sup" data-k="">— убрать руну —</div>' : ''}${ok.map((s) => `<div class="skillrow" data-a="sup" data-k="${s}">${iconHTML(SUPPORTS[s].i, 0, 24)}<div><b>${SUPPORTS[s].n}</b><div class="dim small">${SUPPORTS[s].d}</div></div></div>`).join('') || '<div class="dim">Нет подходящих изученных рун. Новые выпадают с монстров и продаются у Мастера рун.</div>'}</div>`;
      }
    } else h += '<div class="dim">Ячейка пуста — выберите навык справа.</div>';
    h += '</div><div class="scroll" style="width:560px;max-height:70vh;padding-right:6px">';
    for (const c of [ch.cls, ...CLASS_IDS.filter((x) => x !== ch.cls)]) {
      h += `<h3>${CLASSES[c].n}</h3><div class="grid" style="grid-template-columns:1fr 1fr">`;
      for (const s in SKILLS) if (SKILLS[s].c === c) h += `<div class="skillrow${ch.skills.bar.includes(s) ? ' on' : ''}" data-a="skill" data-k="${s}" data-tip="${esc(SKILLS[s].desc)}">${iconHTML(SKILLS[s].i, 0, 32)}<div><div>${SKILLS[s].n}</div><div class="dim small">${SKILLS[s].tg}</div></div></div>`;
      h += '</div>';
    }
    return h + '</div>';
  },
  act(d) {
    const ch = G.ch, arg = UI.arg, sel = arg.slot ?? 0, id = ch.skills.bar[sel];
    if (d.a === 'slot') { arg.slot = +d.k; arg.sock = null; }
    else if (d.a === 'skill') { const j = ch.skills.bar.indexOf(d.k); if (j >= 0) ch.skills.bar[j] = id; ch.skills.bar[sel] = d.k; arg.sock = null; changed(); rebuildBar(); }
    else if (d.a === 'sock') arg.sock = arg.sock === +d.k ? null : +d.k;
    else if (d.a === 'sup') { const a = (ch.skills.sup[id] ||= []); if (d.k) a[arg.sock] = d.k; else a.splice(arg.sock, 1); ch.skills.sup[id] = a.filter(Boolean); arg.sock = null; changed(); }
  },
});

// ------------------------------------------------------------ portal device
definePanel('portal', {
  title: 'Хранитель порталов', style: 'width:1120px',
  render(arg) {
    const ch = G.ch, act = ACTIVITIES[arg.act], maxT = ch.prog.tier[arg.act] || 1;
    if (arg.act === 'tower') arg.tier = 1; else arg.tier = Math.max(1, Math.min(arg.tier || maxT, maxT));
    const d = describeRun(arg), df = DIFFS[diffOf(arg.tier)];
    let mid = `<h3>${act.n}</h3><div>${act.desc}</div><div class="dim small">Особая добыча: ${Object.keys(act.mats).map((m) => MATS[m].n).join(', ')}</div>`;
    if (arg.act === 'tower') {
      const best = ch.prog.towerBest, opts = [1]; for (let f = 6; f <= best; f += 5) opts.push(f);
      mid += `<h3>Начать с этажа</h3><div class="row wrap">${opts.map((f) => `<button data-a="floor" data-k="${f}" class="${(arg.floor || 1) === f ? 'on' : ''}">${f}</button>`).join('')}</div><div class="dim small">Рекорд: ${best}. Контрольные точки — каждые 5 этажей.</div>`;
    } else {
      mid += `<h3>Уровень портала</h3><div class="row"><button data-a="tier" data-k="-5">−5</button><button data-a="tier" data-k="-1">−</button><b style="font-size:20px;width:46px;text-align:center">${arg.tier}</b><button data-a="tier" data-k="1">+</button><button data-a="tier" data-k="5">+5</button><span class="dim small">открыто до ${maxT}</span></div>
      <div><span style="color:${df.c}">${df.n}</span> — ${df.d}</div><div class="dim small">Монстры: здоровье ×${(CURVE.mobHp(arg.tier) / CURVE.mobHp(1)).toFixed(1)}, урон ×${(CURVE.mobDmg(arg.tier) / CURVE.mobDmg(1)).toFixed(1)} · уровень предметов ${CURVE.ilvl(arg.tier)}</div>`;
    }
    if (arg.act === 'boss') {
      arg.bossId ||= BOSS_IDS[0];
      mid += `<h3>Владыка <span class="dim small">(ключей: ${ch.mats.key || 0})</span></h3><div class="grid" style="grid-template-columns:repeat(4,1fr)">${BOSS_IDS.map((b) => `<div class="card${arg.bossId === b ? ' on' : ''}" data-a="boss" data-k="${b}" data-tip="${esc(BOSSES[b].title + '. Стихия: ' + DTN[BOSSES[b].dt] + '. Убит раз: ' + (ch.prog.bossKills[b] || 0))}" style="text-align:center;padding:5px">${iconHTML(BOSSES[b].spr, 0, 48)}<div class="small">${BOSSES[b].n}</div></div>`).join('')}</div>`;
    }
    mid += `<h3>Модификаторы портала</h3><div class="grid" style="grid-template-columns:1fr 1fr">${MOD_IDS.filter((m) => !PORTAL_MODS[m].chaos).map((m) => { const M = PORTAL_MODS[m]; return `<div class="card${arg.mods.includes(m) ? ' on' : ''}" data-a="mod" data-k="${m}" style="padding:4px 8px"><b>${M.n}</b> <span class="good small">+${M.qty}% / +${M.rar}%</span><div class="dim small">${M.d}</div></div>`; }).join('')}</div>`;
    const combo = COMBOS.map((c) => `<div class="${d.combo === c ? 'good' : 'dim'} small">${d.combo === c ? '✔ ' + c.n + ': ' + c.d : '??? — ' + c.need.filter((n) => arg.mods.includes(n)).length + '/' + c.need.length + ' условий'}</div>`).join('');
    return `<div class="list" style="width:230px">${ACT_IDS.map((a) => `<div class="card${arg.act === a ? ' on' : ''}" data-a="act" data-k="${a}"><div class="row">${iconHTML(ACTIVITIES[a].i, 0, 32)}<div><h4>${ACTIVITIES[a].n}</h4><div class="dim small">${a === 'tower' ? 'рекорд ' + ch.prog.towerBest : 'уровень ' + (ch.prog.tier[a] || 1)}</div></div></div></div>`).join('')}</div>
    <div class="col scroll" style="width:560px;max-height:74vh;padding-right:6px">${mid}</div>
    <div class="col" style="width:250px"><h3>Итог</h3><div class="stat"><span>Количество добычи</span><b>+${d.qty}%</b></div><div class="stat"><span>Редкость добычи</span><b>+${d.rar}%</b></div>
    ${arg.act === 'chaos' ? '<div class="bad small">+3 случайных правила хаоса будут добавлены при входе.</div>' : ''}<div class="small">${act.goal}</div><div class="dim small">${act.noDeath ? 'Смерть завершает попытку.' : 'Три возрождения на попытку.'}</div>
    <h3>Тайные сочетания</h3>${combo}
    <button class="big" data-a="open" style="margin-top:14px">Открыть портал</button>${act.keyCost ? `<div class="small ${ch.mats.key ? 'dim' : 'bad'}">Стоимость: 1 Ключ владыки (есть ${ch.mats.key || 0})</div>` : ''}</div>`;
  },
  act(d) {
    const arg = UI.arg, ch = G.ch;
    if (d.a === 'act') { arg.act = d.k; arg.tier = ch.prog.tier[d.k] || 1; }
    else if (d.a === 'tier') arg.tier = Math.max(1, Math.min(ch.prog.tier[arg.act] || 1, arg.tier + +d.k));
    else if (d.a === 'floor') arg.floor = +d.k;
    else if (d.a === 'boss') arg.bossId = d.k;
    else if (d.a === 'mod') { const i = arg.mods.indexOf(d.k); if (i >= 0) arg.mods.splice(i, 1); else arg.mods.push(d.k); }
    else if (d.a === 'open') {
      if (ACTIVITIES[arg.act].keyCost && !(ch.mats.key > 0)) { toast('Нужен Ключ владыки — они выпадают в других активностях', '#f88'); return false; }
      G.lastPortal = { ...arg, mods: arg.mods.slice() };
      openPortal({ act: arg.act, tier: arg.tier, mods: arg.mods.slice(), bossId: arg.bossId, floor: arg.floor || 1 }); closePanel(); return false;
    }
  },
});

// ------------------------------------------------------------ blacksmith
definePanel('craft', {
  title: 'Кузница', style: 'width:1000px',
  render() {
    const ch = G.ch, it = getItem(UI.sel);
    let left = '<div class="dim">Выберите предмет в сумке справа.</div>';
    if (it) {
      left = `<div class="row" style="align-items:flex-start">${itemTip(it)}</div><div class="list">` + Object.keys(CRAFT).map((op) => {
        const c = CRAFT[op], err = c.need(it), cost = craftCost(op, it), have = (ch.mats[c.mat] || 0) >= cost.mat && (ch.mats.dust || 0) >= cost.dust && ch.gold >= cost.gold;
        return `<div class="card${err ? ' locked' : ''}" ${err ? '' : `data-a="op" data-k="${op}"`}><div class="row">${iconHTML(MATS[c.mat].i, 0, 28)}<div class="grow"><h4>${c.n}${c.chance ? ` <span class="small dim">шанс ${c.chance(it)}%</span>` : ''}</h4><div class="dim small">${c.d}</div></div><div class="small ${err ? 'bad' : have ? 'good' : 'bad'}" style="text-align:right">${err || `${cost.mat}× ${MATS[c.mat].n}<br>${cost.dust} пыли · ${cost.gold} зол.`}</div></div></div>`;
      }).join('') + '</div>';
    }
    return `<div class="col scroll" style="width:450px;max-height:76vh;padding-right:6px">${left}</div>${bagHTML('ЛКМ — выбрать предмет для работы · ПКМ — разобрать на пыль')}`;
  },
  act(d, right) {
    const ch = G.ch;
    if (d.it && d.it.startsWith('bag:')) {
      if (right) { const k = d.it.split(':')[1], it = ch.bag[k]; if (it.rar >= 3 && !confirm(`Разобрать «${it.name}»?`)) return false; const r = salvage(ch, it); ch.bag[k] = null; if (UI.sel === d.it) UI.sel = null; toast(`+${r.dust} пыли`); saveNow(); }
      else UI.sel = d.it;
    } else if (d.a === 'op') { const r = doCraft(ch, d.k, getItem(UI.sel)); toast(r.msg, r.ok ? '#7be04a' : '#f88'); if (r.ok) changed(); }
  },
});

// ------------------------------------------------------------ vendor
const GAMBLE = [['mainhand', 'Оружие'], ['offhand', 'Левая рука'], ['helm', 'Шлем'], ['chest', 'Нагрудник'], ['gloves', 'Перчатки'], ['boots', 'Обувь'], ['belt', 'Пояс'], ['amulet', 'Амулет'], ['ring', 'Кольцо'], ['relic', 'Реликвия'], ['artifact', 'Артефакт']];
definePanel('vendor', {
  title: 'Торговец', style: 'width:1000px',
  render() {
    const ilvl = CURVE.ilvl(Math.max(...Object.values(G.ch.prog.tier))), gp = gamblePrice(ilvl);
    return `<div class="col" style="width:450px"><h3 style="margin:0">Товары</h3><div class="grid" style="grid-template-columns:repeat(7,46px)">${G.vendor.map((it, i) => (it ? cellHTML(it, 'vend:' + i) : '<div class="cell"></div>')).join('')}</div><div class="dim small">ЛКМ — купить (цена = 6× цены продажи). Ассортимент обновляется после каждой вылазки.</div>
    <h3>Тёмная лошадка <span class="dim small">${gp} зол. за попытку</span></h3><div class="dim small">Неопознанный предмет уровня ${ilvl}: редкость решит удача.</div><div class="row wrap">${GAMBLE.map(([s, n]) => `<button data-a="gamble" data-k="${s}">${n}</button>`).join('')}</div></div>${bagHTML('ЛКМ или ПКМ — продать предмет')}`;
  },
  act(d) {
    const ch = G.ch;
    if (d.it) {
      const [src, k] = d.it.split(':');
      if (src === 'vend') { const it = G.vendor[k], pr = buyPrice(it); if (ch.gold < pr) { toast(`Нужно ${pr} золота`, '#f88'); return false; } if (addToBag(ch, it) < 0) { toast('Сумка полна', '#f88'); return false; } ch.gold -= pr; G.vendor[k] = null; }
      else if (src === 'bag') { const it = ch.bag[k]; if (it.rar >= 4 && !confirm(`Продать «${it.name}» за ${sellValue(it)} зол.?`)) return false; ch.gold += sellValue(it); ch.bag[k] = null; }
      saveNow();
    } else if (d.a === 'gamble') {
      const ilvl = CURVE.ilvl(Math.max(...Object.values(ch.prog.tier))), pr = gamblePrice(ilvl);
      if (ch.gold < pr) { toast(`Нужно ${pr} золота`, '#f88'); return false; }
      const it = genItem(ilvl, { slot: d.k, cls: ch.cls, mf: 60 + (G.p.s.mf || 0) }); if (addToBag(ch, it) < 0) { toast('Сумка полна', '#f88'); return false; }
      ch.gold -= pr; toast('Получено: ' + it.name, RAR[it.rar].c); saveNow();
    }
  },
});

// ------------------------------------------------------------ stash
definePanel('stash', {
  title: 'Хранилище (общее для всех персонажей)', style: 'width:1260px',
  render() { return `<div class="grid" style="grid-template-columns:repeat(15,46px);align-content:start">${G.save.stash.map((it, i) => cellHTML(it, 'stash:' + i)).join('')}</div>${bagHTML('ЛКМ — переложить предмет в хранилище и обратно')}`; },
  act(d) {
    if (!d.it) return false; const ch = G.ch, [src, k] = d.it.split(':'), st = G.save.stash;
    if (src === 'bag') { const i = st.findIndex((x) => !x); if (i < 0 || i >= STASH_SIZE) { toast('Хранилище заполнено', '#f88'); return false; } st[i] = ch.bag[k]; ch.bag[k] = null; }
    else if (src === 'stash') { if (addToBag(ch, st[k]) < 0) { toast('Сумка полна', '#f88'); return false; } st[k] = null; }
    saveNow();
  },
});

// ------------------------------------------------------------ rune master
const runePrice = (id) => 1500 + SUPPORT_IDS.indexOf(id) * 220;
definePanel('runes', {
  title: 'Мастер рун', style: 'width:900px',
  render() {
    return `<div class="col grow"><div class="dim">Руны изменяют поведение навыков. Изученная руна доступна всем персонажам и может стоять в нескольких навыках сразу. Золото: <b class="gold">${fmt(G.ch.gold)}</b></div>
    <div class="grid scroll" style="grid-template-columns:1fr 1fr;max-height:68vh;padding-right:6px">${SUPPORT_IDS.map((id) => { const S = SUPPORTS[id], known = G.save.supports.includes(id); return `<div class="card${known ? ' locked' : ''}" ${known ? '' : `data-a="buy" data-k="${id}"`}><div class="row">${iconHTML(S.i, 0, 28)}<div class="grow"><h4>${S.n}</h4><div class="dim small">${S.d}</div><div class="dim small">Для навыков: ${S.req.join(', ')}</div></div><div class="small ${known ? 'good' : 'gold'}">${known ? 'изучена' : runePrice(id) + ' зол.'}</div></div></div>`; }).join('')}</div></div>`;
  },
  act(d) { if (d.a !== 'buy') return false; const ch = G.ch, pr = runePrice(d.k); if (ch.gold < pr) { toast(`Нужно ${pr} золота`, '#f88'); return false; } ch.gold -= pr; G.save.supports.push(d.k); toast('Изучена руна: ' + SUPPORTS[d.k].n, '#36e0c8'); saveNow(); },
});

// ------------------------------------------------------------ trainer
definePanel('trainer', {
  title: 'Наставник', style: 'width:860px',
  render() {
    const ch = G.ch, cls = CLASSES[ch.cls], spent = ch.passives.length - 1, attrSpent = Object.values(ch.attrs).reduce((a, b) => a + b, 0);
    return `<div class="col grow"><div><b class="gold">${cls.mech.n}.</b> ${cls.mech.d}</div><h3>Специализация ${ch.spec ? '<span class="dim small">смена стоит 5000 зол.</span>' : '<span class="good small">первый выбор бесплатный</span>'}</h3>
    <div class="grid" style="grid-template-columns:1fr 1fr">${cls.specs.map((s) => `<div class="card${ch.spec === s.id ? ' on' : ''}" data-a="spec" data-k="${s.id}"><h4>${s.n}</h4><div class="dim small">${s.d}</div>${s.mods.map((m) => `<div class="small" style="color:#9db7ff">${statLineSafe(m)}</div>`).join('')}</div>`).join('')}</div>
    <h3>Перераспределение</h3><div class="row wrap"><button data-a="respecTree" ${spent ? '' : 'disabled'}>Сбросить таланты (${spent * 150} зол.)</button><button data-a="respecAttr" ${attrSpent ? '' : 'disabled'}>Сбросить характеристики (${attrSpent * 40} зол.)</button></div></div>`;
  },
  act(d) {
    const ch = G.ch;
    if (d.a === 'spec') { if (ch.spec === d.k) return false; if (ch.spec) { if (ch.gold < 5000) { toast('Нужно 5000 золота', '#f88'); return false; } ch.gold -= 5000; } ch.spec = d.k; toast('Специализация выбрана', '#7be04a'); }
    else if (d.a === 'respecTree') { const n = ch.passives.length - 1, pr = n * 150; if (ch.gold < pr) { toast(`Нужно ${pr} золота`, '#f88'); return false; } ch.gold -= pr; ch.pp += n; ch.passives = [startNode(ch.cls)]; }
    else if (d.a === 'respecAttr') { const n = Object.values(ch.attrs).reduce((a, b) => a + b, 0), pr = n * 40; if (ch.gold < pr) { toast(`Нужно ${pr} золота`, '#f88'); return false; } ch.gold -= pr; ch.attrPts += n; for (const k in ch.attrs) ch.attrs[k] = 0; }
    changed();
  },
});
import { statLine } from '../data/defs.js';
const statLineSafe = (m) => statLine(m[0], m[0].endsWith('_more') ? m[1] : m[1]);

// ------------------------------------------------------------ alchemist
definePanel('alch', {
  title: 'Алхимик', style: 'width:560px',
  render() {
    const f = G.ch.flask, c1 = 3000 * Math.pow(2.2, f.max - 3), c2 = 1500 * Math.pow(1.6, (f.pow - 45) / 5);
    return `<div class="col grow"><div>Ваша фляга: <b>${f.max}</b> зарядов, лечит <b>${f.pow}%</b> здоровья и 30% маны. Заряд восполняется за каждые 14 убийств.</div>
    <div class="card${f.max >= 6 ? ' locked' : ''}" ${f.max >= 6 ? '' : 'data-a="max"'}><h4>Вместительная фляга</h4><div class="dim small">+1 заряд (максимум 6)</div><div class="gold small">${f.max >= 6 ? 'максимум' : Math.round(c1) + ' зол.'}</div></div>
    <div class="card${f.pow >= 75 ? ' locked' : ''}" ${f.pow >= 75 ? '' : 'data-a="pow"'}><h4>Крепкий настой</h4><div class="dim small">+5% лечения (максимум 75%)</div><div class="gold small">${f.pow >= 75 ? 'максимум' : Math.round(c2) + ' зол.'}</div></div>
    <div class="dim small">Золото: ${fmt(G.ch.gold)}</div></div>`;
  },
  act(d) {
    const ch = G.ch, f = ch.flask, pr = Math.round(d.a === 'max' ? 3000 * Math.pow(2.2, f.max - 3) : 1500 * Math.pow(1.6, (f.pow - 45) / 5));
    if (d.a !== 'max' && d.a !== 'pow') return false;
    if (ch.gold < pr) { toast(`Нужно ${pr} золота`, '#f88'); return false; }
    ch.gold -= pr; if (d.a === 'max') { f.max++; G.p.flask.n++; } else f.pow += 5; saveNow();
  },
});

// ------------------------------------------------------------ board (records)
definePanel('board', {
  title: 'Летопись', style: 'width:820px',
  render() {
    const ch = G.ch, pr = ch.prog, h = Math.floor(pr.played / 3600), m = Math.floor((pr.played % 3600) / 60);
    return `<div class="col" style="width:330px"><h3 style="margin:0">Свершения</h3>
    <div class="stat"><span>Время в игре</span><b>${h} ч ${m} мин</b></div><div class="stat"><span>Убито монстров</span><b>${fmt(pr.kills)}</b></div><div class="stat"><span>Вылазок</span><b>${pr.runs}</b></div><div class="stat"><span>Смертей</span><b>${pr.deaths}</b></div><div class="stat"><span>Рекорд башни</span><b>${pr.towerBest}</b></div>
    ${ACT_IDS.filter((a) => a !== 'tower').map((a) => `<div class="stat"><span>${ACTIVITIES[a].n}</span><b>ур. ${pr.tier[a] || 1}</b></div>`).join('')}
    <h3>Поверженные владыки</h3>${BOSS_IDS.map((b) => `<div class="stat"><span>${BOSSES[b].n}</span><b>${pr.bossKills[b] || 0}</b></div>`).join('')}</div>
    <div class="col grow"><h3 style="margin:0">Ценные находки</h3><div class="scroll list" style="max-height:60vh">${G.save.lootLog.map((l) => `<div class="stat"><span style="color:${RAR[l.r].c}">${esc(l.n)}</span><b class="dim small">${RAR[l.r].n} · ур. ${l.tier}</b></div>`).join('') || '<div class="dim">Пока пусто. Легендарные и более редкие предметы попадают сюда.</div>'}</div></div>`;
  },
});

// ------------------------------------------------------------ menu
definePanel('menu', {
  title: 'Меню', style: 'width:420px',
  render() {
    const st = G.save.settings, run = G.zone && G.zone.run;
    return `<div class="col grow"><button class="big" data-a="close">Продолжить</button>${run ? '<button data-a="hub">Вернуться в город (покинуть вылазку)</button>' : ''}
    <button data-a="chars">Сменить персонажа</button><button data-a="dps">Счётчик урона: ${st.dps ? 'вкл.' : 'выкл.'}</button><button data-a="gfx">Графика: ${st.gfx === '2d' ? '2D (лёгкая)' : '3D · ' + (G.gfx || '')} — сменить</button>
    <h3>Сохранение</h3><div class="row"><button data-a="exp">Экспорт в буфер</button><button data-a="imp">Импорт</button></div><div class="dim small">Игра сохраняется автоматически в этом браузере. Колесо мыши — масштаб.</div></div>`;
  },
  act(d) {
    if (d.a === 'hub') { closePanel(); leaveRun(); return false; }
    if (d.a === 'chars') { saveNow(); closePanel(); showTitle(); return false; }
    if (d.a === 'gfx') { G.save.settings.gfx = G.save.settings.gfx === '2d' ? '3d' : '2d'; saveNow(); location.reload(); return false; }
    if (d.a === 'dps') { G.save.settings.dps = !G.save.settings.dps; saveNow(); }
    if (d.a === 'exp') { const s = exportSave(); (navigator.clipboard ? navigator.clipboard.writeText(s) : Promise.reject()).then(() => toast('Сохранение скопировано в буфер обмена'), () => prompt('Скопируйте строку сохранения:', s)); return false; }
    if (d.a === 'imp') { const s = prompt('Вставьте строку сохранения:'); if (s) { if (importSave(s)) { closePanel(); showTitle(); toast('Сохранение загружено'); } else toast('Строка повреждена', '#f88'); } return false; }
  },
});

// ------------------------------------------------------------ title / character select
export function showTitle() {
  const scr = $('#screen'); scr.classList.add('open'); $('#hud').classList.add('hidden'); G.ch = null; G.zone = null; G.p = null;
  let pickCls = CLASS_IDS[0];
  const draw = () => {
    const chars = G.save.chars, c = CLASSES[pickCls];
    scr.innerHTML = `<div class="embers">${Array.from({ length: 46 }, (_, i) => `<i style="left:${(i * 37) % 100}%;animation-delay:-${(i * 1.7) % 14}s;animation-duration:${9 + (i * 3) % 9}s;width:${1 + (i % 3)}px;height:${1 + (i % 3)}px"></i>`).join('')}</div><div class="col titlebox" style="align-items:center;padding:24px;max-width:860px"><div class="crest">✦</div><h1 class="title">ETERNAL REALM</h1><div class="sub">ЭНДГЕЙМ С ПЕРВОЙ МИНУТЫ</div>
    ${chars.length ? `<h3>Ваши герои</h3><div class="row wrap" style="justify-content:center">${chars.map((ch, i) => `<div class="card" data-a="play" data-k="${i}" style="text-align:center;width:150px">${iconHTML(CLASSES[ch.cls].spr, 0, 64)}<h4>${esc(ch.name)}</h4><div class="dim small">${CLASSES[ch.cls].n} · ур. ${ch.level}</div><button data-a="del" data-k="${i}" class="small" style="margin-top:4px;padding:1px 8px">удалить</button></div>`).join('')}</div>` : ''}
    <h3 style="margin-top:18px">Новый герой</h3><div class="classes">${CLASS_IDS.map((id) => `<div class="card${id === pickCls ? ' on' : ''}" data-a="cls" data-k="${id}">${iconHTML(CLASSES[id].spr, 0, 64)}<h4>${CLASSES[id].n}</h4></div>`).join('')}</div>
    <div class="tip" style="max-width:780px;width:100%;margin-top:8px"><div class="nm gold">${c.n}</div><div>${c.desc}</div><div class="sep"></div><div><b class="gold">${c.mech.n}.</b> ${c.mech.d}</div><div class="dim small">Специализации: ${c.specs.map((s) => s.n).join(' · ')}</div><div class="dim small">Стартовые навыки: ${c.bar.map((s) => SKILLS[s].n).join(', ')}</div></div>
    <div class="row" style="margin-top:10px"><input id="nm" maxlength="16" placeholder="Имя героя" /><button class="big" data-a="create">Создать героя 70 уровня</button></div>
    <div class="dim small" style="margin-top:14px;text-align:center">Спрайты: Pixel Art Atlas 1.4M (CC0). Прогресс хранится в браузере.</div></div>`;
  };
  scr.onclick = (e) => {
    const t = e.target.closest('[data-a]'); if (!t) return; const d = t.dataset;
    if (d.a === 'cls') { const nm = $('#nm').value; pickCls = d.k; draw(); $('#nm').value = nm; }
    else if (d.a === 'del') { e.stopPropagation(); if (confirm('Удалить героя навсегда?')) { G.save.chars.splice(+d.k, 1); saveNow(); draw(); } }
    else if (d.a === 'play') startChar(+d.k);
    else if (d.a === 'create') { newChar($('#nm').value.trim(), pickCls); saveNow(); startChar(G.save.chars.length - 1); }
  };
  draw();
}
function startChar(i) {
  G.save.cur = i; G.ch = G.save.chars[i]; G.pendingPortal = null;
  $('#screen').classList.remove('open'); $('#screen').innerHTML = '';
  enterHub(); buildHud();
  if (G.ch.prog.runs === 0) toast('Добро пожаловать в Последний оплот. Поговорите с Хранителем порталов (E).');
}

// ------------------------------------------------------------ keys & NPCs
const NPC_PANEL = { portal: () => openPanel('portal', G.lastPortal ? { ...G.lastPortal, mods: G.lastPortal.mods.slice() } : { act: 'maps', tier: G.ch.prog.tier.maps, mods: [] }), craft: () => openPanel('craft'), vendor: () => openPanel('vendor'), runes: () => openPanel('runes'), trainer: () => openPanel('trainer'), alch: () => openPanel('alch'), stash: () => openPanel('stash'), board: () => openPanel('board') };
bus.on('npc', (fn) => NPC_PANEL[fn] && NPC_PANEL[fn]());
bus.on('key', (code) => {
  if (!G.ch) return;
  if (code === 'Escape') { if (UI.panel) closePanel(); else openPanel('menu'); return; }
  const map = { KeyI: 'inv', KeyC: 'inv', KeyK: 'skills', KeyP: 'tree' };
  if (map[code]) { if (UI.panel === map[code]) closePanel(); else openPanel(map[code], map[code] === 'skills' ? { slot: 0 } : undefined); return; }
  if (UI.panel) return;
  if (code === 'Digit1') bus.emit('flask');
  if (code === 'KeyT' && G.zone.run) { if (G.zone.run.state === 'done' || confirm('Покинуть вылазку и вернуться в город? Прогресс вылазки будет потерян.')) leaveRun(); G.keys = {}; }
  if (code === 'KeyE' && G.zone.hub && G.zone.nearNpc) bus.emit('npc', G.zone.nearNpc.fn);
});
bus.on('bag', () => { if (UI.panel) refresh(); });
