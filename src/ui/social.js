// Social UI: group finder, auction house, boss loot tables, bot inspection, chat, loot rolls, party frames.
import { G } from '../state.js';
import { bus, fmt } from '../util.js';
import { iconHTML } from '../gfx.js';
import { CLASSES } from '../data/classes.js';
import { MATS, UNIQUES, BOSS_UNIQUES, BASES } from '../data/items.js';
import { RAR, SLOTS } from '../data/defs.js';
import { ACTIVITIES, GROUP_IDS, DIFFS, diffOf, CURVE, weekId } from '../data/activities.js';
import { BOSSES, BOSS_IDS } from '../data/bosses.js';
import { ROLE_N, ROLE_C, classBases } from '../data/social.js';
import { genItem, addToBag, usable, sellValue } from '../items.js';
import { botById, botPower, playerPower, findParty, disband, partySize, fairPrice, ahList, ahBuy, matBuyPrice, matSellPrice, matTrade, TRADE_MATS, resolveRoll, ROLL_N } from '../bots.js';
import { openPortal, toast } from '../game.js';
import { saveNow } from '../save.js';
import { guildOf, myGuild, goalText, thread, unreadTotal, dmSend, chatSend, ladder, guildLadder, LADDERS, guildPower, leaveGuild, createGuild, inviteToGuild } from '../brain.js';
import { $, UI, definePanel, openPanel, closePanel, refresh, cellHTML, getItem, itemSources } from './core.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const W = () => G.save.world;
const PREV = {};
itemSources.lot = (id) => { const l = W().ah.lots.find((x) => x.id === id); return l && l.it; };
itemSources.bot = (id, slot) => { const b = botById(id); return b && b.ch.equip[slot]; };
itemSources.roll = (id) => { const r = G.rolls.find((x) => x.id === id); return r && r.item; };
itemSources.prev = (u) => (PREV[u] ||= (() => { const it = genItem(CURVE.ilvl(Math.max(...Object.values(G.ch.prog.tier))) + 2, { uniq: u }); it.ur = it.ur.map(() => 0.5); it.pr = 0.5; return it; })());
const skillWord = (s) => (s > 0.88 ? 'ветеран' : s > 0.72 ? 'опытный игрок' : s > 0.58 ? 'середнячок' : 'новичок');
const botRow = (b, extra = '') => `<div class="skillrow" data-a="insp" data-k="${b.id}">${iconHTML(CLASSES[b.ch.cls].spr, 0, 32)}<div class="grow"><div>${esc(b.ch.name)} <span class="dim small">${CLASSES[b.ch.cls].n} · ур. ${b.ch.level}${b.guild && guildOf(b) ? ' · &lt;' + guildOf(b).name + '&gt;' : ''}</span></div><div class="small"><span style="color:${ROLE_C[b.role]}">${ROLE_N[b.role]}</span> · экипировка ${b.gs || botPower(b)} · порталы ур. ${b.tier} · ${skillWord(b.pers.skill)}${b.online ? '' : ' · <span class="dim">не в сети</span>'}</div></div>${extra}</div>`;

// ------------------------------------------------------------ group finder
definePanel('lfg', {
  title: 'Группы и рейды', style: 'width:1080px',
  render(arg) {
    const ch = G.ch; arg.act ||= GROUP_IDS[0]; arg.role ||= (G.party && G.party.role) || 'dps'; arg.tab ||= 'party';
    const act = ACTIVITIES[arg.act], maxT = ch.prog.tier[arg.act] || 1; arg.tier = Math.max(1, Math.min(arg.tier || maxT, maxT));
    const df = DIFFS[diffOf(arg.tier)], size = partySize(arg.act), locked = act.weekly && ch.prog.raidWeek === weekId();
    const party = G.party ? G.party.ids.map(botById).filter(Boolean) : [];
    let right;
    if (arg.tab === 'party') {
      const cnt = { tank: 0, healer: 0, dps: 0 }; cnt[arg.role]++; for (const b of party) cnt[b.role]++;
      right = `<div class="row"><h3 class="grow" style="margin:0">Ваша группа (${party.length + 1}/${size})</h3><span class="small"><span style="color:${ROLE_C.tank}">танков ${cnt.tank}</span> · <span style="color:${ROLE_C.healer}">лекарей ${cnt.healer}</span> · <span style="color:${ROLE_C.dps}">бойцов ${cnt.dps}</span></span></div>
      <div class="list scroll" style="max-height:52vh"><div class="skillrow on">${iconHTML(CLASSES[ch.cls].spr, 0, 32)}<div class="grow"><div>${esc(ch.name)} <span class="dim small">это вы</span></div><div class="small"><span style="color:${ROLE_C[arg.role]}">${ROLE_N[arg.role]}</span> · экипировка ${playerPower()}</div></div></div>
      ${party.map((b) => botRow(b, `<button data-a="kick" data-k="${b.id}">✕</button>`)).join('') || '<div class="dim">Группа пуста. Нажмите «Найти группу» — подберутся герои, которые сейчас в сети и подходят по уровню.</div>'}</div>
      <div class="row wrap"><button data-a="find">Найти группу</button><button data-a="disband" ${party.length ? '' : 'disabled'}>Распустить</button><button class="big" data-a="open" ${party.length && !locked ? '' : 'disabled'}>Открыть портал</button></div>
      ${locked ? '<div class="bad small">Рейд уже пройден на этой неделе. Сохранение сбросится в понедельник.</div>' : ''}${W().rep < -3 ? '<div class="bad small">О вас ходит слава ниндзя-лутера: часть героев отказывается идти с вами.</div>' : ''}`;
    } else {
      const all = W().bots.map((b) => ({ b, gs: b.gs || botPower(b) })).concat([{ me: 1, gs: playerPower() }]).sort((a, b) => b.gs - a.gs);
      right = `<h3 style="margin:0">Рейтинг героев по экипировке</h3><div class="list scroll" style="max-height:62vh">${all.map((e, i) => (e.me ? `<div class="skillrow on">${iconHTML(CLASSES[ch.cls].spr, 0, 32)}<div class="grow"><b class="gold">#${i + 1} ${esc(ch.name)}</b> <span class="dim small">это вы · экипировка ${e.gs}</span></div></div>` : botRow(e.b, `<span class="dim">#${i + 1}</span>${arg.tab === 'roster' && e.b.online && !(G.party && G.party.ids.includes(e.b.id)) ? `<button data-a="invite" data-k="${e.b.id}">＋</button>` : ''}`))).join('')}</div>`;
    }
    return `<div class="col" style="width:420px"><div class="list">${GROUP_IDS.map((a) => `<div class="card${arg.act === a ? ' on' : ''}" data-a="act" data-k="${a}"><div class="row">${iconHTML(ACTIVITIES[a].i, 0, 32)}<div><h4>${ACTIVITIES[a].n}</h4><div class="dim small">${ACTIVITIES[a].group} героев · уровень ${ch.prog.tier[a] || 1}</div></div></div></div>`).join('')}</div>
      <div>${act.desc}</div>
      <h3>Уровень</h3><div class="row"><button data-a="tier" data-k="-1">−</button><b style="font-size:20px;width:46px;text-align:center">${arg.tier}</b><button data-a="tier" data-k="1">+</button><span class="dim small">открыто до ${maxT} · <span style="color:${df.c}">${df.n}</span> · предметы ур. ${CURVE.ilvl(arg.tier)}</span></div>
      <h3>Ваша роль</h3><div class="row">${['tank', 'healer', 'dps'].map((r) => `<button data-a="role" data-k="${r}" class="${arg.role === r ? 'on' : ''}" style="color:${ROLE_C[r]}">${ROLE_N[r]}</button>`).join('')}</div>
      <div class="dim small">${arg.role === 'tank' ? 'Танк: ваши удары создают впятеро больше угрозы. Возьмите навык «Вызов» (окно навыков, раздел «Воин»).' : arg.role === 'healer' ? 'Лекарь: возьмите «Исцеление», «Целительную волну» и «Возложение рук» — они есть у друида, монаха и паладина и доступны любому классу.' : 'Боец: бейте цель танка и выполняйте механики.'}</div>
      <div class="dim small">Добыча боссов разыгрывается броском: «Нужно» сильнее, чем «Не откажусь».</div></div>
    <div class="col grow"><div class="row"><button data-a="tab" data-k="party" class="${arg.tab === 'party' ? 'on' : ''}">Группа</button><button data-a="tab" data-k="roster" class="${arg.tab === 'roster' ? 'on' : ''}">Герои и рейтинг</button></div>${right}</div>`;
  },
  act(d) {
    const arg = UI.arg, ch = G.ch;
    if (d.a === 'act') { arg.act = d.k; arg.tier = ch.prog.tier[d.k] || 1; }
    else if (d.a === 'tier') arg.tier += +d.k;
    else if (d.a === 'role') { arg.role = d.k; if (G.party) G.party.role = d.k; }
    else if (d.a === 'tab') arg.tab = d.k;
    else if (d.a === 'find') { const r = findParty(arg.act, arg.tier, arg.role); const miss = Object.entries(r.missing).filter(([, n]) => n > 0).map(([k, n]) => `${ROLE_N[k].toLowerCase()} ×${n}`); toast(miss.length ? 'Не нашлось: ' + miss.join(', ') + '. Попробуйте позже.' : 'Группа собрана', miss.length ? '#f88' : '#7be04a'); bus.emit('party'); }
    else if (d.a === 'disband') disband();
    else if (d.a === 'kick') { G.party.ids = G.party.ids.filter((x) => x !== d.k); bus.emit('party'); }
    else if (d.a === 'invite') { G.party ||= { ids: [], role: arg.role, wipes: 0 }; if (G.party.ids.length + 1 >= partySize(arg.act)) { toast('Группа полна', '#f88'); return false; } G.party.ids.push(d.k); bus.emit('party'); }
    else if (d.a === 'insp') { openPanel('inspect', { id: d.k, back: { ...arg } }); return false; }
    else if (d.a === 'open') { G.party.role = arg.role; openPortal({ act: arg.act, tier: arg.tier, mods: [] }); closePanel(); return false; }
  },
});

// ------------------------------------------------------------ inspect a bot
definePanel('inspect', {
  title: (arg) => { const b = botById(arg.id); return b ? esc(b.ch.name) : 'Герой'; }, style: 'width:560px',
  render(arg) {
    const b = botById(arg.id); if (!b) return '<div class="dim">Герой не найден.</div>';
    const ch = b.ch, inP = G.party && G.party.ids.includes(b.id);
    return `<div class="col grow"><div class="row">${iconHTML(CLASSES[ch.cls].spr, 0, 64)}<div><div class="gold" style="font-size:18px">${esc(ch.name)}</div><div>${CLASSES[ch.cls].n} · ур. ${ch.level} · <span style="color:${ROLE_C[b.role]}">${ROLE_N[b.role]}</span></div><div class="dim small">${b.guild && guildOf(b) ? 'Гильдия «' + guildOf(b).name + '» · ' : ''}${skillWord(b.pers.skill)} · ${b.online ? 'в сети' : 'не в сети'}</div></div></div>
    <div class="grid" style="grid-template-columns:repeat(3,46px);justify-content:center;gap:6px 30px">${SLOTS.map(([slot, name]) => cellHTML(ch.equip[slot], `bot:${b.id}:${slot}`, `<span class="ph">${name}</span>`)).join('')}</div>
    <div class="stat"><span>Оценка экипировки</span><b>${botPower(b)}</b></div><div class="stat"><span>Уровень порталов</span><b>${b.tier}</b></div><div class="stat"><span>Убито монстров</span><b>${fmt(b.kills)}</b></div><div class="stat"><span>Текущая цель</span><b>${goalText(b)}</b></div><div class="stat"><span>Отношение к вам</span><b>${b.mem.rel >= 3 ? 'друг' : b.mem.rel >= 1 ? 'приятель' : b.mem.rel <= -2 ? 'неприязнь' : 'нейтрально'}${b.mem.runs ? ' · походов вместе: ' + b.mem.runs : ''}</b></div><div class="stat"><span>Специализация</span><b>${(CLASSES[ch.cls].specs.find((s) => s.id === ch.spec) || {}).n || '—'}</b></div>
    <div class="row">${arg.back ? '<button data-a="back">← Назад</button>' : ''}${b.online ? `<button data-a="${inP ? 'kick' : 'invite'}">${inP ? 'Исключить из группы' : 'Пригласить в группу'}</button>` : ''}<button data-a="dm">Написать</button>${myGuild() && myGuild().mine && b.guild !== myGuild().id ? '<button data-a="ginv">Позвать в гильдию</button>' : ''}</div></div>`;
  },
  act(d) {
    const arg = UI.arg;
    if (d.a === 'back') { openPanel('lfg', arg.back); return false; }
    if (d.a === 'invite') { G.party ||= { ids: [], role: 'dps', wipes: 0 }; if (G.party.ids.length >= 9) { toast('Группа полна', '#f88'); return false; } G.party.ids.push(arg.id); toast('Приглашение принято'); bus.emit('party'); }
    if (d.a === 'kick') { G.party.ids = G.party.ids.filter((x) => x !== arg.id); bus.emit('party'); }
    if (d.a === 'dm') { openPanel('dm', { id: arg.id }); return false; }
    if (d.a === 'ginv') { const e = inviteToGuild(botById(arg.id)); toast(e || 'Герой вступил в вашу гильдию', e ? '#f88' : '#7be04a'); }
  },
});
bus.on('inspect', (id) => openPanel('inspect', { id }));

// ------------------------------------------------------------ auction house
definePanel('auction', {
  title: 'Аукцион', style: 'width:1100px',
  render(arg) {
    const ch = G.ch, w = W(); arg.tab ||= 'buy';
    const tabs = `<div class="row"><button data-a="tab" data-k="buy" class="${arg.tab === 'buy' ? 'on' : ''}">Купить</button><button data-a="tab" data-k="sell" class="${arg.tab === 'sell' ? 'on' : ''}">Продать</button><button data-a="tab" data-k="mats" class="${arg.tab === 'mats' ? 'on' : ''}">Материалы</button><span class="grow"></span><span class="gold">${fmt(ch.gold)} зол.</span></div>`;
    if (arg.tab === 'mats') {
      return `<div class="col grow">${tabs}<div class="dim small">Цены плавают от спроса: герои тоже покупают материалы для своего крафта и продают излишки.</div><div class="list">${TRADE_MATS.map((id) => `<div class="skillrow" style="cursor:default">${iconHTML(MATS[id].i, 0, 28)}<div class="grow"><div>${MATS[id].n} <span class="dim small">у вас ${ch.mats[id] || 0} · в продаже ${w.ah.mats[id].stock}</span></div><div class="dim small">${MATS[id].d}</div></div><button data-a="mbuy" data-k="${id}">Купить за ${matBuyPrice(id)}</button><button data-a="msell" data-k="${id}">Продать за ${matSellPrice(id)}</button></div>`).join('')}</div></div>`;
    }
    if (arg.tab === 'sell') {
      const it = getItem(UI.sel), mine = w.ah.lots.filter((l) => l.by === 'you');
      return `<div class="col grow">${tabs}<div class="row" style="align-items:flex-start;gap:16px"><div class="col" style="width:500px"><div class="grid" style="grid-template-columns:repeat(10,46px)">${ch.bag.map((x, i) => cellHTML(x, 'bag:' + i)).join('')}</div><div class="dim small">Выберите предмет в сумке.</div></div>
      <div class="col grow">${it ? `<div><b style="color:${RAR[it.rar].c}">${esc(it.name)}</b></div><div class="dim small">Справедливая цена около ${fairPrice(it)} зол. Торговцу — ${sellValue(it)}.</div><div class="row"><input id="ah-price" type="number" min="1" value="${fairPrice(it)}" style="width:120px" /><button data-a="list">Выставить</button></div><div class="dim small">Комиссия 5% с продажи. Лоты дороже справедливой цены покупают редко.</div>` : '<div class="dim">Предмет не выбран.</div>'}
      <h3>Ваши лоты (${mine.length})</h3><div class="list scroll" style="max-height:40vh">${mine.map((l) => `<div class="skillrow" style="cursor:default">${cellHTML(l.it, 'lot:' + l.id)}<div class="grow" style="color:${RAR[l.it.rar].c}">${esc(l.it.name)}</div><span class="gold">${l.price}</span><button data-a="buy" data-k="${l.id}">Снять</button></div>`).join('') || '<div class="dim">Нет активных лотов.</div>'}</div></div></div></div>`;
    }
    let lots = w.ah.lots.filter((l) => l.by !== 'you');
    if (arg.mine) lots = lots.filter((l) => usable(ch.cls, l.it));
    if (arg.slot) lots = lots.filter((l) => BASES[l.it.base].s === arg.slot);
    lots = lots.slice().sort((a, b) => (arg.sort === 'price' ? a.price - b.price : b.it.rar - a.it.rar || b.it.ilvl - a.it.ilvl)).slice(0, 80);
    const slots = [['', 'все'], ['mainhand', 'оружие'], ['offhand', 'левая рука'], ['helm', 'шлем'], ['chest', 'нагрудник'], ['gloves', 'перчатки'], ['boots', 'обувь'], ['belt', 'пояс'], ['amulet', 'амулет'], ['ring', 'кольцо'], ['relic', 'реликвия'], ['artifact', 'артефакт']];
    return `<div class="col grow">${tabs}<div class="row wrap small"><button data-a="mine" class="${arg.mine ? 'on' : ''}">Для моего класса</button><button data-a="sort" class="${arg.sort === 'price' ? 'on' : ''}">Сначала дешёвые</button>${slots.map(([s, n]) => `<button data-a="slot" data-k="${s}" class="${(arg.slot || '') === s ? 'on' : ''}" style="padding:2px 8px">${n}</button>`).join('')}</div>
    <div class="list scroll" style="max-height:62vh">${lots.map((l) => `<div class="skillrow" style="cursor:default">${cellHTML(l.it, 'lot:' + l.id)}<div class="grow"><div style="color:${RAR[l.it.rar].c}">${esc(l.it.name)}${l.it.up ? ' +' + l.it.up : ''}</div><div class="dim small">${BASES[l.it.base].n} · ур. ${l.it.ilvl} · продавец ${esc(l.byName)}</div></div><b class="${ch.gold >= l.price ? 'gold' : 'bad'}">${fmt(l.price)}</b><button data-a="buy" data-k="${l.id}">Купить</button></div>`).join('') || '<div class="dim">Подходящих лотов нет. Герои выставляют находки по мере своих походов.</div>'}</div><div class="dim small">Лотов всего: ${w.ah.lots.length}. Наведите на предмет, чтобы сравнить с надетым.</div></div>`;
  },
  act(d) {
    const arg = UI.arg, ch = G.ch;
    if (d.a === 'tab') { arg.tab = d.k; UI.sel = null; }
    else if (d.a === 'mine') arg.mine = !arg.mine;
    else if (d.a === 'sort') arg.sort = arg.sort === 'price' ? '' : 'price';
    else if (d.a === 'slot') arg.slot = d.k;
    else if (d.it && d.it.startsWith('bag:') && arg.tab === 'sell') UI.sel = d.it;
    else if (d.a === 'list') { const it = getItem(UI.sel), pr = Math.max(1, Math.floor(+$('#ah-price').value || 0)); if (!it) return false; ch.bag[UI.sel.split(':')[1]] = null; UI.sel = null; ahList(it, pr); toast('Лот выставлен'); saveNow(); }
    else if (d.a === 'buy') { const e = ahBuy(d.k); if (e) { toast(e, '#f88'); return false; } saveNow(); }
    else if (d.a === 'mbuy' || d.a === 'msell') { const e = matTrade(d.k, d.a === 'mbuy'); if (e) { toast(e, '#f88'); return false; } }
    else return false;
  },
});

// ------------------------------------------------------------ collector: boss loot tables, pity, token exchange
const TOKEN_COST = 12;
definePanel('collector', {
  title: 'Коллекционер: добыча владык', style: 'width:1000px',
  render(arg) {
    const ch = G.ch, pity = ch.prog.pity || {}; arg.boss ||= BOSS_IDS[0];
    const b = BOSSES[arg.boss], ex = BOSS_UNIQUES(arg.boss), kills = ch.prog.bossKills[arg.boss] || 0, t = ch.prog.tier.boss || 1;
    const chance = Math.min(100, 30 + t + (pity[arg.boss] || 0) * 9);
    return `<div class="grid scroll" style="grid-template-columns:1fr 1fr;width:400px;max-height:74vh;align-content:start">${BOSS_IDS.map((id) => `<div class="card${arg.boss === id ? ' on' : ''}" data-a="boss" data-k="${id}" style="text-align:center;padding:5px">${iconHTML(BOSSES[id].spr, 0, 48)}<div class="small">${BOSSES[id].n}</div><div class="dim small">убит ${ch.prog.bossKills[id] || 0}×</div></div>`).join('')}</div>
    <div class="col grow"><h3 style="margin:0">${b.n}</h3><div class="dim">${b.title}</div>
    <div class="stat"><span>Шанс эксклюзива в Царстве боссов и рейде (ваш уровень ${t})</span><b class="gold">${chance}%</b></div>
    <div class="stat"><span>Неудач подряд (каждая даёт +9% к шансу)</span><b>${pity[arg.boss] || 0}</b></div>
    <div class="stat"><span>Шанс эксклюзива в других активностях</span><b>6%</b></div>
    <div class="dim small">Кроме эксклюзивов, владыка роняет 7–10 предметов (первый не ниже эпического) и 1–2 Печати владыки. Большая часть добычи подбирается под ваш класс.</div>
    <h3>Эксклюзивные предметы</h3><div class="list">${ex.map((u) => { const U = UNIQUES[u], mine = classBases(ch.cls).includes(U.base); return `<div class="skillrow" style="cursor:default">${cellHTML(itemSources.prev(u), 'prev:' + u)}<div class="grow"><div style="color:${RAR[5].c}">${U.n}</div><div class="dim small">${BASES[U.base].n}${mine ? ' · <span class="good">подходит вашему классу</span>' : ''}</div></div><button data-a="buy" data-k="${u}" ${kills > 0 && (ch.mats.token || 0) >= TOKEN_COST ? '' : 'disabled'}>${TOKEN_COST} печатей</button></div>`; }).join('')}</div>
    <div class="dim small">Печатей у вас: <b class="gold">${ch.mats.token || 0}</b>. Обмен доступен после первой победы над этим владыкой${kills ? '' : ' <span class="bad">(ещё не побеждён)</span>'}.</div></div>`;
  },
  act(d) {
    const ch = G.ch;
    if (d.a === 'boss') UI.arg.boss = d.k;
    else if (d.a === 'buy') { const it = genItem(CURVE.ilvl(ch.prog.tier.boss || 1) + 2, { uniq: d.k }); if (addToBag(ch, it) < 0) { toast('Сумка полна', '#f88'); return false; } ch.mats.token -= TOKEN_COST; toast('Получено: ' + it.name, RAR[5].c); saveNow(); }
    else return false;
  },
});
bus.on('npc', (fn) => { if (fn === 'auction' || fn === 'collector' || fn === 'lfg') openPanel(fn, {}); });
bus.on('key', (code) => { if (code === 'KeyG' && G.ch && G.zone && G.zone.hub && !UI.panel) openPanel('lfg', {}); });

// ------------------------------------------------------------ HUD widgets: chat, loot rolls, party frames
const CH_COL = { world: '#9fb4d8', party: '#8fd6ff', loot: '#e0b866', sys: '#36e0c8', guild: '#7be04a' }, CH_TAG = { world: '[Мир]', party: '[Группа]', loot: '', sys: '', guild: '[Гильдия]' };
const chanKey = (c) => (c.startsWith('guild_') ? 'guild' : c);
let chanSel = 'world', chatTab = 'all';
const CH_TABS = [['all', 'Все'], ['world', 'Мир'], ['party', 'Группа'], ['guild', 'Гильдия'], ['loot', 'Добыча']];
const tabOk = (m) => chatTab === 'all' || chanKey(m.chan) === chatTab || (chatTab === 'loot' && m.chan === 'sys');
function ensure() {
  const hud = $('#hud'); if (!hud || $('#chat')) return !!hud;
  hud.insertAdjacentHTML('beforeend', '<div id="chatbox"><div id="chattabs">' + CH_TABS.map(([k, n]) => `<button data-ct="${k}" class="${chatTab === k ? 'on' : ''}">${n}</button>`).join('') + '</div><div id="chat"></div><div id="chatbar"><button id="chan">Мир</button><input id="chatin" maxlength="120" placeholder="Enter — написать в чат…" /></div></div><div id="rolls"></div><div id="partyf"></div>');
  const inp = $('#chatin'), cb = $('#chan');
  const cyc = () => { const opts = ['world']; if (G.party && G.party.ids.length) opts.push('party'); if (W().myGuild) opts.push('guild'); chanSel = opts[(opts.indexOf(chanSel) + 1) % opts.length]; cb.textContent = { world: 'Мир', party: 'Группа', guild: 'Гильдия' }[chanSel]; };
  cb.onclick = cyc;
  inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { const v = inp.value.trim(); inp.value = ''; inp.blur(); if (v) chatSend(chanSel === 'guild' ? 'guild_' + W().myGuild : chanSel, v); } else if (e.key === 'Escape') inp.blur(); else if (e.key === 'Tab') { e.preventDefault(); cyc(); } });
  inp.addEventListener('keyup', (e) => e.stopPropagation());
  $('#chattabs').addEventListener('click', (e) => { const t = e.target.closest('[data-ct]'); if (!t) return; chatTab = t.dataset.ct; document.querySelectorAll('#chattabs button').forEach((b) => b.classList.toggle('on', b.dataset.ct === chatTab)); drawChat(); });
  $('#rolls').addEventListener('click', (e) => { const t = e.target.closest('[data-roll]'); if (!t) return; const r = G.rolls.find((x) => x.id === t.dataset.roll); if (r) resolveRoll(r, t.dataset.c); });
  drawChat(); drawRolls(); chatVis();
  return true;
}
function drawChat() {
  const el = $('#chat'); if (!el) return;
  const mg = W().myGuild;
  el.innerHTML = G.chat.filter((m) => (!m.chan.startsWith('guild_') || m.chan === 'guild_' + mg) && tabOk(m)).slice(-50).map((m) => `<div class="cm" style="color:${m.col || CH_COL[chanKey(m.chan)]}">${CH_TAG[chanKey(m.chan)] ? `<span class="ctag">${CH_TAG[chanKey(m.chan)]}</span> ` : ''}${m.from ? `<b class="cfrom">${esc(m.from)}:</b> ` : ''}${esc(m.msg)}</div>`).join('') || '<div class="dim">Тишина…</div>';
  el.scrollTop = el.scrollHeight;
}
function drawRolls() {
  const el = $('#rolls'); if (!el) return;
  el.innerHTML = G.rolls.slice(0, 4).map((r) => `<div class="rollcard">${cellHTML(r.item, 'roll:' + r.id)}<div class="grow"><div style="color:${RAR[r.item.rar].c}">${esc(r.item.name)}</div><div class="row" style="gap:4px;margin-top:3px">${['need', 'greed', 'dis', 'pass'].map((c) => `<button data-roll="${r.id}" data-c="${c}" style="padding:2px 7px;font-size:12px">${ROLL_N[c]}</button>`).join('')}</div><div class="rollbar"><i data-rb="${r.id}"></i></div></div></div>`).join('') + (G.rolls.length > 4 ? `<div class="dim small">ещё ${G.rolls.length - 4}…</div>` : '');
}
const chatVis = () => { const c = $('#chatbox'); if (c) c.style.display = (G.save.settings.chat ?? 1) ? '' : 'none'; };
bus.on('settings', chatVis);
bus.on('chat', drawChat); bus.on('rolls', drawRolls);
let pfT = 0;
bus.on('frame', (dt) => {
  if (!G.ch || !ensure()) return;
  for (const r of G.rolls.slice(0, 4)) { const b = document.querySelector(`[data-rb="${r.id}"]`); if (b) b.style.width = Math.max(0, ((r.until - G.time) / 30) * 100) + '%'; }
  pfT -= dt; if (pfT > 0) return; pfT = 0.2;
  const el = $('#partyf'), z = G.zone; if (!el || !z) return;
  let h = '';
  if (z.run && z.run.group) h = z.party.map((a) => { const f = Math.max(0, a.hp / a.s.maxLife); return `<div class="pf${a.dead ? ' dead' : ''}${f < 0.35 && !a.dead ? ' low' : ''}" style="border-left-color:${ROLE_C[a.role]}">${iconHTML(CLASSES[a.ch.cls].spr, 0, 26)}<div class="grow"><div class="pfn"><span>${esc(a.ch.name)}</span><span class="pfr" style="color:${ROLE_C[a.role]}">${ROLE_N[a.role]}</span></div><div class="pfb"><i style="width:${f * 100}%"></i></div>${a.s.maxMana ? `<div class="pfm"><i style="width:${Math.max(0, (a.mp / a.s.maxMana) * 100)}%"></i></div>` : ''}</div></div>`; }).join('');
  else if (G.party && G.party.ids.length) h = `<div class="pf pfsum" data-tip="Группа собрана — откройте «Группы и рейды» (G)">${iconHTML('k_swords', 0, 22)}<span>Группа: ${G.party.ids.length + 1} героев</span></div>`;
  if (el._v !== h) { el._v = h; el.innerHTML = h; }
});

// ------------------------------------------------------------ private messages
definePanel('dm', {
  title: 'Личные сообщения', style: 'width:900px',
  render(arg) {
    const dm = W().dm || {}, ids = Object.keys(dm).filter((id) => botById(id)).sort((a, b) => (dm[b].msgs.at(-1)?.t || 0) - (dm[a].msgs.at(-1)?.t || 0));
    if (arg.id && !dm[arg.id]) { thread(arg.id); ids.unshift(arg.id); }
    if (!arg.id && ids.length) arg.id = ids[0];
    const b = arg.id && botById(arg.id), t = b && thread(b.id); if (t) t.unread = 0;
    const list = ids.map((id) => { const x = botById(id), th = thread(id), last = th.msgs.at(-1); return `<div class="skillrow${id === arg.id ? ' on' : ''}" data-a="open" data-k="${id}">${iconHTML(CLASSES[x.ch.cls].spr, 0, 32)}<div class="grow"><div>${esc(x.ch.name)}${th.unread ? ` <b class="bad">(${th.unread})</b>` : ''}${x.online ? '' : ' <span class="dim small">не в сети</span>'}</div><div class="dim small" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${last ? esc(last.msg) : ''}</div></div></div>`; }).join('') || '<div class="dim">Пока никто не писал. Герои сами напишут, когда им что-то понадобится, — или кликните по герою в городе и нажмите «Написать».</div>';
    const offerText = (o) => ({ party: 'приглашение в группу', sell: 'продаёт «' + (o.it ? esc(o.it.name) : '') + '» за ' + o.price + ' зол.', haggle: 'хочет купить ваш лот за ' + o.price + ' зол.', guild: 'приглашение в гильдию' }[o.type]);
    const conv = b ? `<div class="row"><b class="gold grow">${esc(b.ch.name)} <span class="dim small">${CLASSES[b.ch.cls].n} · ур. ${b.ch.level}</span></b><button data-a="insp" data-k="${b.id}">Осмотреть</button></div>
      <div class="scroll col" id="dmlog" style="height:46vh;background:rgba(0,0,0,0.3);padding:8px;border:1px solid #332a20">${t.msgs.map((m) => `<div style="align-self:${m.me ? 'flex-end' : 'flex-start'};max-width:78%;background:${m.me ? 'rgba(90,70,36,0.55)' : 'rgba(40,34,48,0.8)'};padding:4px 10px;border-radius:3px;border:1px solid #3d3227">${esc(m.msg)}</div>`).join('')}</div>
      ${t.offer ? `<div class="small good">Ждёт ответа: ${offerText(t.offer)}${t.offer.it ? ` <span data-it="offer:${b.id}" style="text-decoration:underline">(показать предмет)</span>` : ''}</div>` : ''}
      <div class="row"><input id="dmin" class="grow" maxlength="120" placeholder="«да», «нет», «скинь до 900», «го в рейд», «какой у тебя гс?»…" /><button data-a="send">Отправить</button>${t.offer ? '<button data-a="q" data-k="да">Да</button><button data-a="q" data-k="нет">Нет</button>' : ''}</div>` : '';
    return `<div class="list scroll" style="width:290px;max-height:64vh">${list}</div><div class="col grow">${conv}</div>`;
  },
  after(root) { const l = $('#dmlog', root); if (l) l.scrollTop = l.scrollHeight; const i = $('#dmin', root); if (i) { i.focus(); i.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter' && i.value.trim()) { dmSend(UI.arg.id, i.value); refresh(); } }; i.onkeyup = (e) => e.stopPropagation(); } },
  act(d) {
    const arg = UI.arg;
    if (d.a === 'open') arg.id = d.k;
    else if (d.a === 'send') { const v = $('#dmin').value; if (!v.trim()) return false; dmSend(arg.id, v); }
    else if (d.a === 'q') dmSend(arg.id, d.k);
    else if (d.a === 'insp') { openPanel('inspect', { id: d.k }); return false; }
    else return false;
  },
});
itemSources.offer = (id) => { const t = (W().dm || {})[id]; return t && t.offer && t.offer.it; };
bus.on('dm', () => { if (UI.panel === 'dm') refresh(); });

// ------------------------------------------------------------ ladders
definePanel('ladder', {
  title: 'Рейтинги', style: 'width:860px',
  render(arg) {
    arg.cat ||= 'gs'; const tabs = `<div class="row wrap">${Object.keys(LADDERS).map((c) => `<button data-a="cat" data-k="${c}" class="${arg.cat === c ? 'on' : ''}">${LADDERS[c]}</button>`).join('')}<button data-a="cat" data-k="guild" class="${arg.cat === 'guild' ? 'on' : ''}">Гильдии</button></div>`;
    if (arg.cat === 'guild') return `<div class="col grow">${tabs}<div class="list scroll" style="max-height:62vh">${guildLadder().map((e, i) => `<div class="skillrow${W().myGuild === e.g.id ? ' on' : ''}" style="cursor:default"><b class="gold" style="width:40px">#${i + 1}</b><div class="grow"><div>${esc(e.g.name)}</div><div class="dim small">${e.n} участников · глава ${e.g.leader === 'you' ? 'вы' : esc(botById(e.g.leader)?.ch.name || '—')}</div></div><b>${fmt(e.v)}</b></div>`).join('')}</div><div class="dim small">Сила гильдии — сумма экипировки 15 сильнейших участников.</div></div>`;
    const all = ladder(arg.cat), mine = all.findIndex((e) => e.me), fv = (v) => (arg.cat === 'level' ? Math.floor(v) : fmt(v));
    const row = (e, i) => (e.me ? `<div class="skillrow on" style="cursor:default"><b class="gold" style="width:46px">#${i + 1}</b>${iconHTML(CLASSES[G.ch.cls].spr, 0, 32)}<div class="grow"><b class="gold">${esc(G.ch.name)}</b> <span class="dim small">это вы</span></div><b>${fv(e.v)}</b></div>` : `<div class="skillrow" data-a="insp" data-k="${e.b.id}"><b class="${i < 3 ? 'gold' : 'dim'}" style="width:46px">#${i + 1}</b>${iconHTML(CLASSES[e.b.ch.cls].spr, 0, 32)}<div class="grow"><div>${esc(e.b.ch.name)} <span class="dim small">${CLASSES[e.b.ch.cls].n} · ур. ${e.b.ch.level}${guildOf(e.b) ? ' · &lt;' + guildOf(e.b).name + '&gt;' : ''}</span></div></div><b>${fv(e.v)}</b></div>`);
    const above = mine > 0 ? all[mine - 1] : null;
    return `<div class="col grow">${tabs}<div class="small">Ваше место: <b class="gold">#${mine + 1}</b> из ${all.length}${above ? ` · до следующего: ${fv(above.v - all[mine].v)}` : ' · вы первый!'}</div><div class="list scroll" style="max-height:60vh">${all.slice(0, 50).map(row).join('')}${mine >= 50 ? '<div class="dim" style="text-align:center">…</div>' + row(all[mine], mine) : ''}</div></div>`;
  },
  act(d) { if (d.a === 'cat') UI.arg.cat = d.k; else if (d.a === 'insp') { openPanel('inspect', { id: d.k }); return false; } else return false; },
});

// ------------------------------------------------------------ guild
definePanel('guild', {
  title: 'Гильдия', style: 'width:820px',
  render() {
    const g = myGuild();
    if (!g) return `<div class="col grow"><div>Вы не состоите в гильдии. Главы гильдий сами зовут героев, с которыми хорошо сходили в поход, — или можно основать свою.</div>
      <h3>Основать гильдию <span class="dim small">20 000 золота</span></h3><div class="row"><input id="gname" maxlength="24" placeholder="Название" /><button data-a="create">Основать</button></div>
      <h3>Гильдии мира</h3><div class="list scroll" style="max-height:46vh">${guildLadder().map((e, i) => `<div class="skillrow" style="cursor:default"><b class="gold" style="width:40px">#${i + 1}</b><div class="grow">${esc(e.g.name)} <span class="dim small">${e.n} участников</span></div><b>${fmt(e.v)}</b></div>`).join('')}</div></div>`;
    const mem = g.members.map(botById).filter(Boolean).sort((a, b) => (b.gs || 0) - (a.gs || 0)), place = guildLadder().findIndex((e) => e.g.id === g.id) + 1;
    return `<div class="col grow"><div class="row"><div class="grow"><div class="gold" style="font:400 24px var(--head)">${esc(g.name)}</div><div class="dim small">Место в рейтинге гильдий: #${place} · сила ${fmt(guildPower(g))} · участников ${mem.length + 1} · в сети ${mem.filter((b) => b.online).length + 1}</div></div><button data-a="leave">${g.mine ? 'Распустить' : 'Покинуть'}</button></div>
      <div class="dim small">${g.mine ? 'Вы глава. Зовите героев: кликните по герою в городе или в рейтинге → «Позвать в гильдию». Соглашаются те, кто к вам хорошо относится.' : 'Гильдейский чат — переключатель канала рядом с полем ввода.'}</div>
      <h3>Состав</h3><div class="list scroll" style="max-height:50vh">${mem.map((b) => `<div class="skillrow" data-a="insp" data-k="${b.id}">${iconHTML(CLASSES[b.ch.cls].spr, 0, 32)}<div class="grow"><div>${esc(b.ch.name)}${g.leader === b.id ? ' <span class="gold small">глава</span>' : ''} <span class="dim small">${CLASSES[b.ch.cls].n} · ур. ${b.ch.level} · ${ROLE_N[b.role]}</span></div><div class="dim small">цель: ${goalText(b)}${b.online ? '' : ' · не в сети'}</div></div><b>${b.gs || 0}</b></div>`).join('')}</div></div>`;
  },
  act(d) {
    if (d.a === 'create') { const e = createGuild($('#gname').value.trim()); if (e) { toast(e, '#f88'); return false; } toast('Гильдия основана', '#7be04a'); saveNow(); }
    else if (d.a === 'leave') { if (!confirm('Точно?')) return false; leaveGuild(); }
    else if (d.a === 'insp') { openPanel('inspect', { id: d.k }); return false; }
    else return false;
  },
});
bus.on('key', (code) => { if (!G.ch || UI.panel) return; if (code === 'Enter') { const i = $('#chatin'); if (i) { i.focus(); G.keys = {}; } } else if (code === 'KeyL') openPanel('ladder', {}); });
let badgeT = 0;
bus.on('frame', (dt) => { badgeT -= dt; if (badgeT > 0) return; badgeT = 0.5; const b = $('#bdm'); if (b && G.save.world) { const n = unreadTotal(); const v = n ? '✉ ' + n : '✉'; if (b.textContent !== v) { b.textContent = v; b.classList.toggle('on', n > 0); } } });
