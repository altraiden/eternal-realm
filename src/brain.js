// Bot "brains": goals, relationships, guilds, private messages, understanding of the player's chat, ladders.
import { G } from './state.js';
import { CLASSES } from './data/classes.js';
import { UNIQUES, UNIQUE_IDS, MATS } from './data/items.js';
import { BOSSES } from './data/bosses.js';
import { ACTIVITIES, CURVE, weekId } from './data/activities.js';
import { ROLE_N, classBases } from './data/social.js';
import { genItem, addToBag, usable, itemScore } from './items.js';
import { botById, botPower, playerPower, say, fairPrice, partySize } from './bots.js';
import { rnd, rint, pick, chance, shuffle, bus, clamp, uid, fmt } from './util.js';

const W = () => G.save.world;
const GUILD_NAMES = ['Пепельный легион', 'Ночной дозор', 'Сыны бездны', 'Вольные клинки', 'Орден рассвета', 'Кривые руки', 'Железный обет', 'Последний рубеж'];
export const guildOf = (b) => (b && b.guild ? W().guilds.find((g) => g.id === b.guild) : null);
export const myGuild = () => W().guilds.find((g) => g.id === W().myGuild) || null;

// ------------------------------------------------------------------ goals
const GOAL_TEXT = {
  level: (g) => `дойти до ${g.target} уровня`, gs: (g) => `поднять экипировку до ${g.target}`, tier: (g) => `закрыть порталы ${g.target} уровня`,
  rich: (g) => `накопить ${fmt(g.target)} золота`, tower: (g) => `взять ${g.target} этаж башни`, exclusive: (g) => `выбить «${UNIQUES[g.target].n}» (${BOSSES[UNIQUES[g.target].boss].n})`,
};
export const goalText = (b) => (b.goal ? GOAL_TEXT[b.goal.type](b.goal) : '—');
export function chooseGoal(b) {
  const ch = b.ch, p = b.pers, opts = [['gs', 3], ['tier', 2], ['tower', 1 + p.compet * 2], ['rich', 0.5 + p.greed * 3]];
  if (ch.level < 100) opts.push(['level', 3]);
  const ex = UNIQUE_IDS.filter((u) => UNIQUES[u].boss && classBases(ch.cls).includes(UNIQUES[u].base) && !Object.values(ch.equip).some((it) => it && it.uniq === u));
  if (ex.length) opts.push(['exclusive', 3]);
  let tot = 0; for (const o of opts) tot += o[1]; let x = Math.random() * tot, type = opts[0][0];
  for (const o of opts) { x -= o[1]; if (x <= 0) { type = o[0]; break; } }
  const target = { level: Math.min(100, ch.level + rint(3, 7)), gs: (b.gs || botPower(b)) + rint(120, 350), tier: Math.min(60, b.tier + rint(2, 4)), rich: Math.round((ch.gold + 4000) * rnd(1.8, 3.5)), tower: (b.tower || 0) + rint(3, 9), exclusive: ex.length ? pick(ex) : null }[type];
  b.goal = { type, target, pity: 0 };
}
const BRAG = { level: ['{t} уровень взят!', 'ап {t}, наконец'], gs: ['собрал шмот, гс {t}', 'гс {t}, кто больше?'], tier: ['закрыл порталы {t}', '{t} тир пал'], rich: ['накопил {t} золота, я богат', 'первые {t}з в кармане'], tower: ['{t} этаж башни!!', 'башня {t}, новый личный рекорд'], exclusive: ['ВЫБИЛ «{t}»!!!', '«{t}» мой, столько фармил'] };
// Called after each successful background run: progress the goal, celebrate, pick the next one.
export function goalStep(b, silent) {
  if (!b.goal) chooseGoal(b);
  const g = b.goal, ch = b.ch;
  if (g.type === 'tower' && Math.random() < 0.4) b.tower = (b.tower || 0) + 1;
  if (g.type === 'exclusive') {
    b.bossK = (b.bossK || 0) + 1;
    if (Math.random() * 100 < 8 + g.pity * 4) { const it = genItem(CURVE.ilvl(b.tier) + 2, { uniq: g.target }); const slot = Object.keys(ch.equip).find((s) => ch.equip[s] && ch.equip[s].base === it.base) || null; if (slot) ch.equip[slot] = it; else { const s2 = ['mainhand', 'offhand', 'helm', 'chest', 'gloves', 'boots', 'belt', 'amulet', 'ring1', 'relic', 'artifact'].find((s) => !ch.equip[s]); if (s2) ch.equip[s2] = it; } g.done = true; botPower(b); } else g.pity++;
  }
  const cur = { level: ch.level, gs: b.gs || 0, tier: b.tier, rich: ch.gold, tower: b.tower || 0 }[g.type];
  if (g.done || (cur !== undefined && cur >= g.target)) {
    const t = g.type === 'exclusive' ? UNIQUES[g.target].n : g.type === 'rich' ? fmt(g.target) : g.target;
    if (!silent && chance(35 + 55 * b.pers.chatty)) say(b.guild && Math.random() < 0.4 ? 'guild_' + b.guild : 'world', ch.name, pick(BRAG[g.type]).replace('{t}', t));
    b.done = (b.done || 0) + 1; chooseGoal(b);
  }
}

// ------------------------------------------------------------------ guilds
export function initGuilds(w) {
  w.guilds = GUILD_NAMES.map((n, i) => ({ id: 'g' + i, name: n, leader: null, members: [], wins: 0 }));
  for (const b of w.bots) { b.guild = null; if (Math.random() < 0.7) { const g = pick(w.guilds); g.members.push(b.id); b.guild = g.id; } }
  for (const g of w.guilds) g.leader = g.members.map((id) => w.bots.find((b) => b.id === id)).sort((a, b) => (b.gs || 0) - (a.gs || 0))[0]?.id || null;
}
export function guildPower(g) {
  const gs = g.members.map((id) => { const b = botById(id); return b ? b.gs || 0 : 0; }); if (W().myGuild === g.id) gs.push(playerPower());
  return Math.round(gs.sort((a, b) => b - a).slice(0, 15).reduce((a, b) => a + b, 0));
}
export function joinGuild(gid) { const w = W(); leaveGuild(); w.myGuild = gid; say('guild_' + gid, '', `${G.ch.name} вступает в гильдию!`, '#7be04a'); const g = myGuild(); for (const id of shuffle(g.members.slice()).slice(0, 3)) { const b = botById(id); if (b && b.online) say('guild_' + gid, b.ch.name, pick(['добро пожаловать!', 'о, новенький. привет', 'велком', 'наконец-то свежая кровь'])); } bus.emit('guild'); }
export function leaveGuild() { const w = W(); if (!w.myGuild) return; const g = myGuild(); if (g && g.mine) w.guilds = w.guilds.filter((x) => x !== g); w.myGuild = null; bus.emit('guild'); }
export function createGuild(name) { const w = W(); if (G.ch.gold < 20000) return 'Нужно 20 000 золота'; if (!name || name.length < 3) return 'Название слишком короткое'; G.ch.gold -= 20000; leaveGuild(); const g = { id: 'g' + uid(), name, leader: 'you', members: [], wins: 0, mine: true }; w.guilds.push(g); w.myGuild = g.id; bus.emit('guild'); return null; }
export function inviteToGuild(b) {
  const g = myGuild(); if (!g || !g.mine) return 'Приглашать может только глава своей гильдии';
  const rel = b.mem.rel + (b.guild ? -3 : 1) + (b.pers.social - 0.5) * 2;
  if (rel < 1.5) { botDM(b, pick(['не, мне и так норм', 'спасибо, но я в своей гильдии останусь', 'может позже'])); return 'Отказ'; }
  const old = guildOf(b); if (old) old.members = old.members.filter((x) => x !== b.id);
  g.members.push(b.id); b.guild = g.id; botDM(b, pick(['го, вступаю', 'давно хотел сменить гильдию. я с тобой', 'ок, записывай'])); return null;
}

// ------------------------------------------------------------------ private messages
export function thread(id) { const w = W(); w.dm ||= {}; return (w.dm[id] ||= { msgs: [], unread: 0, offer: null }); }
export function botDM(b, msg, offer) {
  const t = thread(b.id); t.msgs.push({ me: false, msg, t: Date.now() }); if (t.msgs.length > 60) t.msgs.shift(); t.unread++; if (offer !== undefined) t.offer = offer;
  bus.emit('dm', b.id); bus.emit('toast', `✉ ${b.ch.name}: ${msg.length > 46 ? msg.slice(0, 46) + '…' : msg}`, '#ff9ae0');
}
export const unreadTotal = () => Object.values(W().dm || {}).reduce((a, t) => a + t.unread, 0);

function initiate(silent) {
  const w = W(), ch = G.ch; if (silent || !ch || unreadTotal() > 3) return;
  const b = pick(w.bots.filter((x) => x.online && !(G.party && G.party.ids.includes(x.id)))); if (!b || Math.random() > 0.04 + b.pers.social * 0.07 + b.mem.rel * 0.01) return;
  if (b.mem.rel < -2) { if (b.pers.toxic > 0.6 && chance(30)) botDM(b, pick(['ты всё ещё ниндзишь лут?', 'видел тебя в рейтинге. ну такое'])); return; }
  const kinds = [];
  kinds.push('party');
  const lots = w.ah.lots.filter((l) => l.by === 'you' && usable(b.ch.cls, l.it) && l.price <= b.ch.gold); if (lots.length) kinds.push('haggle', 'haggle');
  const log = G.save.lootLog[0]; if (log && Date.now() - log.t < 600000 && w.lastGratz !== log.t) kinds.push('gratz', 'gratz');
  if (!w.myGuild && b.guild && b.mem.rel >= 1) kinds.push('guild');
  if (chance(40)) kinds.push('sell');
  if (b.mem.rel >= 2) kinds.push('talk');
  const k = pick(kinds), role = ROLE_N[b.role].toLowerCase();
  if (k === 'party') { const act = Math.random() < 0.7 ? 'gdungeon' : 'raid'; if (act === 'raid' && (b.lock === weekId() || ch.prog.raidWeek === weekId())) return; botDM(b, pick([`го в ${act === 'raid' ? 'рейд' : 'чертоги'}? я ${role}, собираем пати`, `привет, нужен ещё один в ${act === 'raid' ? 'рейд' : 'чертоги'}. пойдёшь?`, `${act === 'raid' ? 'рейд' : 'чертоги'} сейчас, место есть. ты как?`]), { type: 'party', act }); }
  else if (k === 'haggle') { const l = pick(lots), price = Math.round(l.price * rnd(0.72, 0.9)); botDM(b, pick([`твой лот «${l.it.name}» — отдашь за ${price}?`, `привет. «${l.it.name}» за ${price} заберу прямо сейчас`]), { type: 'haggle', lot: l.id, price, max: Math.round(l.price * 0.97) }); }
  else if (k === 'gratz') { w.lastGratz = log.t; botDM(b, pick([`видел, тебе упал «${log.n}». грац!`, `«${log.n}»?! везунчик. поздравляю`, `ого, «${log.n}». где выбил?`])); b.mem.rel += 0.3; }
  else if (k === 'guild') { const g = guildOf(b); botDM(b, pick([`слушай, иди к нам в «${g.name}». нужны толковые люди`, `в гильдию «${g.name}» не хочешь? ходим в рейды каждую неделю`]), { type: 'guild', gid: g.id }); }
  else if (k === 'sell') { const it = genItem(CURVE.ilvl(Math.max(b.tier, ch.prog.tier.maps || 1)), { cls: ch.cls, smart: 100, minRar: 2, mf: 60 }); const price = Math.round(fairPrice(it) * rnd(0.8, 1.1)); botDM(b, pick([`выбил «${it.name}», тебе по классу подойдёт. ${price}з?`, `есть «${it.name}» на твой класс, отдам за ${price}`]), { type: 'sell', it, price, min: Math.round(price * 0.8) }); }
  else botDM(b, pick(['как успехи? я вот ' + goalText(b).split(' ')[0] + ' потихоньку…', 'сегодня дроп никакой, а у тебя?', 'спасибо за прошлый ран, норм сходили']));
}

// ------------------------------------------------------------------ understanding the player
const RX = {
  yes: /^(да|ага|ок|окей|го|гоу|давай|погнали|согласен|беру|идёт|хорошо|конечно|yes|ok|\+|плюс)\b|договорились|по рукам/i, no: /^(нет|не|неа|no|-|минус|отказ)\b|не надо|не хочу|не интересно|потом/i,
  greet: /привет|здаров|ку\b|хай|добрый|hello|\bhi\b/i, thanks: /спасибо|спс|благодар|thx|ty\b/i, insult: /дурак|идиот|нуб|рак\b|лох|тупой|отвали|пошёл|пошел|заткнись|бот\b/i,
  gs: /гс|экип|шмот|гир/i, level: /уров|лвл|level/i, goal: /цел|чем занят|что делаешь|что фармишь|планы/i, guildq: /гильд|клан/i, price: /сколько|цена|почём|почем/i,
  invite: /го |пошли|пойд[её]м|инв|в пати|в группу|в рейд|в чертоги|со мной|помоги/i, lfg: /лфг|lfg|ищу|нужен|нужна|нужны/i, wts: /продам|wts|продаю/i, wtb: /куплю|wtb|ищу купить/i,
  stop: /стоп|стой|жд[иё]|подожд|wait/i, follow: /за мной|ко мне|сюда|follow|бегом/i, boss: /босс|в босса|фокус босс/i, adds: /адд|мелоч|мобов|треш/i, free: /бейте|атак|вперёд|вперед|го$|погнали/i, mana: /мана|mana/i, rez: /рес|воскрес|подними/i,
};
export function parseIntent(text) {
  const t = text.trim().toLowerCase(), num = t.match(/(\d[\d\s]{1,8})(к|k)?/);
  const out = { text: t, num: num ? Math.round(parseInt(num[1].replace(/\s/g, ''), 10) * (num[2] ? 1000 : 1)) : null };
  for (const k in RX) if (RX[k].test(t)) out[k] = true;
  return out;
}
function tryJoin(b, act) {
  const ch = G.ch; act ||= (G.party && G.party.act) || 'gdungeon';
  if (!b.online) return 'я уже выхожу, в другой раз';
  if (b.mem.rel < -2) return pick(['не, с тобой не пойду', 'после прошлого раза? нет уж']);
  if (act === 'raid' && b.lock === weekId()) return 'я уже сохранён в рейде на этой неделе';
  G.party ||= { ids: [], role: 'dps', act, wipes: 0 };
  if (G.party.ids.includes(b.id)) return 'я уже в группе)';
  if (G.party.ids.length + 1 >= partySize(act)) return 'у тебя же группа полная';
  G.party.ids.push(b.id); G.party.act = act; bus.emit('party'); void ch;
  return pick(['го, кидай инвайт… а, уже в группе. жду у распорядительницы', 'иду. я ' + ROLE_N[b.role].toLowerCase(), 'ок, вступил']);
}
// The player wrote to a bot. Returns nothing; the bot answers in the same thread.
export function dmSend(botId, text) {
  const b = botById(botId), t = thread(botId), ch = G.ch, w = W(); if (!b || !text.trim()) return;
  t.msgs.push({ me: true, msg: text.trim(), t: Date.now() }); const i = parseIntent(text), o = t.offer; let r = null;
  const reply = (m) => setTimeout(() => { t.msgs.push({ me: false, msg: m, t: Date.now() }); bus.emit('dm', botId); }, 500 + Math.random() * 1200);
  if (!b.online) { reply('(герой не в сети — ответит, когда зайдёт)'); bus.emit('dm', botId); return; }
  if (i.insult) { b.mem.rel -= 2; r = b.pers.toxic > 0.5 ? pick(['сам такой', 'в игнор', 'ну и вали']) : pick(['зачем так грубо?', 'ладно, понял тебя', '…']); t.offer = null; }
  else if (o && (i.yes || i.num != null || i.no)) {
    if (i.no && !i.yes && i.num == null) { r = b.pers.toxic > 0.7 ? 'ну и зря' : pick(['ок, как знаешь', 'ладно, если что — пиши', 'понял']); t.offer = null; }
    else if (o.type === 'party') { r = tryJoin(b, o.act); t.offer = null; b.mem.rel += 0.5; }
    else if (o.type === 'guild') { joinGuild(o.gid); r = pick(['отлично, принял!', 'добро пожаловать. рейды по выходным']); t.offer = null; b.mem.rel += 1; }
    else if (o.type === 'sell') {
      const price = i.num != null ? i.num : o.price;
      if (price < o.min) r = `не, меньше ${o.min} не отдам`;
      else if (ch.gold < price) r = 'у тебя золота не хватает, копи)';
      else if (addToBag(ch, o.it) < 0) r = 'у тебя сумка полная, освободи место';
      else { ch.gold -= price; b.ch.gold += price; r = pick(['держи, носи на здоровье', 'сделка! удачи с ним', 'отправил']); t.offer = null; b.mem.rel += 1; bus.emit('bag'); bus.emit('toast', 'Куплено: ' + o.it.name, '#ffd24a'); }
    } else if (o.type === 'haggle') {
      const l = w.ah.lots.find((x) => x.id === o.lot), price = i.num != null ? i.num : o.price;
      if (!l) { r = 'а, его уже купили. жаль'; t.offer = null; }
      else if (price > o.max) r = `дорого. ${o.price} — моя цена, ну максимум ${Math.round((o.price + o.max) / 2)}`;
      else { w.ah.lots = w.ah.lots.filter((x) => x !== l); ch.gold += price; b.ch.gold -= Math.min(b.ch.gold, price); r = pick(['забрал, спасибо!', 'сделка. золото у тебя', 'отлично, давно искал такую']); t.offer = null; b.mem.rel += 1; bus.emit('toast', `Продано напрямую: +${price} зол.`, '#ffd24a'); }
    }
  }
  else if (i.invite) { r = tryJoin(b, /рейд/.test(i.text) ? 'raid' : 'gdungeon'); }
  else if (i.gs) r = `гс ${b.gs || botPower(b)}, порталы ${b.tier}`;
  else if (i.level) r = `${b.ch.level} уровень, ${CLASSES[b.ch.cls].n.toLowerCase()}`;
  else if (i.goal) r = `сейчас хочу ${goalText(b)}`;
  else if (i.guildq) { const g = guildOf(b); r = g ? `я в «${g.name}»${g.leader === b.id ? ', я там глава' : ''}` : 'без гильдии пока'; }
  else if (i.thanks) { b.mem.rel += 0.3; r = pick(['не за что', 'обращайся', ':)']); }
  else if (i.greet) r = pick(['привет', 'ку', 'здаров', 'привет, как дроп?']);
  else if (i.price && o && o.price) r = `${o.price} золота`;
  else r = pick(['не понял, я в данже. скажи проще', '?', 'хз', 'ща, бой идёт', 'это ты мне?']);
  b.mem.rel = clamp(b.mem.rel, -10, 10);
  reply(r); bus.emit('dm', botId);
}
// The player wrote to a public channel.
export function chatSend(chan, text) {
  const w = W(), ch = G.ch; if (!text.trim()) return; say(chan, ch.name, text.trim(), '#ffffff'); const i = parseIntent(text);
  const later = (fn, ms = 900) => setTimeout(fn, ms + Math.random() * 1500);
  if (chan === 'party') {
    const z = G.zone, al = z && z.party ? z.party.filter((a) => !a.dead) : []; if (!G.party) return;
    const ack = () => { const a = pick(al); if (a) later(() => say('party', a.ch.name, pick(['ок', 'понял', 'принял', 'есть', '+'])), 300); };
    if (i.mana) { for (const a of al.filter((x) => x.role === 'healer')) later(() => say('party', a.ch.name, `мана ${Math.round((a.mp / Math.max(1, a.s.maxMana)) * 100)}%`), 300); }
    else if (i.stop) { G.party.order = 'stop'; ack(); } else if (i.follow) { G.party.order = 'follow'; ack(); }
    else if (i.boss) { G.party.focus = 'boss'; G.party.order = null; ack(); } else if (i.adds) { G.party.focus = 'adds'; G.party.order = null; ack(); }
    else if (i.free || i.yes) { G.party.order = null; G.party.focus = null; ack(); }
    else if (i.thanks) { const a = pick(al); if (a) later(() => say('party', a.ch.name, pick(['и тебе спс', 'норм сходили', 'гг']))); }
    return;
  }
  const on = w.bots.filter((b) => b.online && (chan === 'world' || b.guild === w.myGuild));
  if (i.lfg || i.invite) {
    const role = /хил|лекар/.test(i.text) ? 'healer' : /танк/.test(i.text) ? 'tank' : /дд|дамаг|бойц/.test(i.text) ? 'dps' : null, act = /рейд/.test(i.text) ? 'raid' : 'gdungeon';
    for (const b of shuffle(on.filter((x) => (!role || x.role === role) && x.mem.rel > -2)).slice(0, rint(1, 3))) later(() => { say(chan, b.ch.name, pick([`я ${ROLE_N[b.role].toLowerCase()}, возьми`, `${ROLE_N[b.role].toLowerCase()} ${b.ch.level}, го`, 'инв'])); botDM(b, `видел в чате, что собираешь в ${act === 'raid' ? 'рейд' : 'чертоги'}. я ${ROLE_N[b.role].toLowerCase()}, берёшь?`, { type: 'party', act }); });
  } else if (i.wts || i.wtb) { for (const b of shuffle(on).slice(0, rint(0, 2))) later(() => say(chan, b.ch.name, pick(i.wts ? ['сколько хочешь?', 'кинь на аук, гляну', 'покажи статы в лс'] : ['глянь на ауке, там было', 'у меня нет, сорри', 'напиши в лс, поищу в сумке']))); }
  else if (i.price) { const id = Object.keys(MATS).find((m) => i.text.includes(MATS[m].n.toLowerCase().split(' ')[1] || '~')); const b = pick(on); if (b) later(() => say(chan, b.ch.name, id && w.ah.mats[id] ? `${MATS[id].n} сейчас около ${w.ah.mats[id].price}з` : 'смотря что. глянь на ауке')); }
  else if (i.insult) { for (const b of shuffle(on.filter((x) => x.pers.toxic > 0.5)).slice(0, 2)) later(() => { b.mem.rel -= 1; say(chan, b.ch.name, pick(['репорт', 'успокойся', 'чс'])); }); }
  else if (i.greet) { for (const b of shuffle(on.filter((x) => x.pers.social > 0.4)).slice(0, rint(1, 3))) later(() => say(chan, b.ch.name, pick(['привет', 'ку', 'хай', 'здаров']))); }
  else if (i.thanks) { const b = pick(on); if (b) later(() => say(chan, b.ch.name, 'не за что')); }
  else if (chance(35)) { const b = pick(on.filter((x) => x.pers.chatty > 0.5)); if (b) later(() => say(chan, b.ch.name, pick(['согласен', 'ага', 'хз', 'лол', 'бывает', 'тоже так думаю']))); }
}

// ------------------------------------------------------------------ tick + ladders
export function brainTick(silent) {
  const w = W(); if (!w.guilds) initGuilds(w);
  initiate(silent);
  if (!silent && w.myGuild && chance(18)) { const g = myGuild(), b = g && botById(pick(g.members.length ? g.members : [null])); if (b && b.online) say('guild_' + g.id, b.ch.name, pick(['кто в рейд на выходных?', 'гильдия, го чертоги', 'нужен крафтер, есть кто?', `я сейчас хочу ${goalText(b)}`, 'у кого лишние печати?', 'всем привет'])); }
  if (w.tick % 30 === 0) for (const b of w.bots) if (b.mem.rel > 0) b.mem.rel = Math.max(0, b.mem.rel - 0.05);
}
const uniqCount = (ch) => Object.values(ch.equip).filter((it) => it && it.uniq).length;
export const LADDERS = { gs: 'Экипировка', level: 'Уровень', tower: 'Башня', kills: 'Убийства', gold: 'Богатство', uniq: 'Уникальные', boss: 'Владыки' };
export function ladder(cat) {
  const ch = G.ch, f = { gs: (b) => b.gs || botPower(b), level: (b) => b.ch.level + (b.ch.xp / CURVE.xpNeed(Math.min(99, b.ch.level))) * 0.99, tower: (b) => b.tower || 0, kills: (b) => b.kills || 0, gold: (b) => b.ch.gold, uniq: (b) => uniqCount(b.ch), boss: (b) => b.bossK || 0 }[cat];
  const me = { gs: playerPower(), level: ch.level + (ch.level < 100 ? ch.xp / CURVE.xpNeed(ch.level) * 0.99 : 0), tower: ch.prog.towerBest, kills: ch.prog.kills, gold: ch.gold, uniq: uniqCount(ch), boss: Object.values(ch.prog.bossKills).reduce((a, b) => a + b, 0) }[cat];
  return W().bots.map((b) => ({ b, v: f(b) })).concat([{ me: true, v: me }]).sort((a, b) => b.v - a.v);
}
export function guildLadder() { return W().guilds.map((g) => ({ g, v: guildPower(g), n: g.members.length + (W().myGuild === g.id ? 1 : 0) })).sort((a, b) => b.v - a.v); }
void ACTIVITIES; void itemScore;
