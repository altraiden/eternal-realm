// Data for the "living world": class gear preferences, roles, stat weights, bot names, chat lines.
export const CLASS_GEAR = {
  warrior: { w: ['longsword', 'battleaxe', 'mace', 'flail', 'katana', 'greatsword', 'halberd', 'warhammer'], o: ['knightshield', 'towershield'], a: 'plate' },
  mage: { w: ['staff', 'wand'], o: ['orb', 'tome'], a: 'robe' },
  necro: { w: ['scepter', 'wand', 'staff', 'scythe'], o: ['tome', 'orb'], a: 'robe' },
  assassin: { w: ['dagger', 'claw', 'katana'], o: ['buckler'], a: 'leather' },
  paladin: { w: ['mace', 'flail', 'longsword', 'warhammer'], o: ['towershield', 'knightshield'], a: 'plate' },
  hunter: { w: ['bow', 'crossbow'], o: ['quiver'], a: 'leather' },
  druid: { w: ['staff', 'scepter', 'spear'], o: ['orb', 'tome'], a: 'leather' },
  warlock: { w: ['wand', 'staff', 'scepter'], o: ['orb', 'tome'], a: 'robe' },
  monk: { w: ['claw', 'spear', 'dagger'], o: ['buckler'], a: 'leather' },
  dk: { w: ['greatsword', 'scythe', 'halberd', 'longsword', 'battleaxe'], o: ['knightshield'], a: 'plate' },
};
const ARMOR = { plate: ['helm', 'plate', 'gauntlet', 'greaves'], leather: ['hood', 'leather', 'glove', 'boots'], robe: ['magehood', 'robe', 'glove', 'boots'] };
const COMMON = ['crown', 'belt', 'amulet', 'ring', 'skullring', 'talisman', 'idol', 'soulgem', 'core', 'dragonheart'];
export const classBases = (cls) => { const g = CLASS_GEAR[cls]; return [...g.w, ...g.o, ...ARMOR[g.a], ...COMMON]; };

export const CLASS_ROLES = { warrior: ['tank', 'dps'], paladin: ['tank', 'healer'], dk: ['tank', 'dps'], druid: ['healer', 'dps'], monk: ['healer', 'dps'], mage: ['dps'], necro: ['dps'], assassin: ['dps'], hunter: ['dps'], warlock: ['dps'] };
export const ROLE_N = { tank: 'Танк', healer: 'Лекарь', dps: 'Боец' };
export const ROLE_C = { tank: '#6f8fff', healer: '#7be04a', dps: '#ff8a5a' };
export const ROLE_SPEC = { warrior: { tank: 'guardian', dps: 'berserk' }, paladin: { tank: 'templar', healer: 'crusader' }, dk: { tank: 'blood', dps: 'frost' }, druid: { healer: 'warden', dps: 'tempest' }, monk: { healer: 'sage', dps: 'ironfist' } };
// Skill bars used by bots, by role (falls back to the class default bar).
export const ROLE_BAR = {
  'warrior:tank': ['cleave', 'slam', 'taunt', 'warcry', 'charge', 'rend'],
  'paladin:tank': ['smite', 'consecrate', 'taunt', 'faithshield', 'hammer', 'holylight'],
  'paladin:healer': ['smite', 'mend', 'healwave', 'layhands', 'hammer', 'faithshield'],
  'dk:tank': ['deathstrike', 'icechains', 'taunt', 'boneshield', 'decay', 'deathgrip'],
  'druid:healer': ['stormwrath', 'mend', 'healwave', 'layhands', 'thorns', 'stoneskin'],
  'monk:healer': ['chiwave', 'mend', 'healwave', 'layhands', 'sevenstars', 'innerpeace'],
};

// Stat weights used to judge whether an item is an upgrade (bots) — per archetype on top of the common table.
export const CLASS_ARCH = { warrior: 'melee', paladin: 'melee', dk: 'melee', monk: 'melee', assassin: 'melee', hunter: 'ranged', mage: 'caster', warlock: 'caster', druid: 'caster', necro: 'minion' };
export const W_BASE = { life: 0.06, life_inc: 3, armor: 0.012, evasion: 0.012, block: 1.2, dr: 3, res_fire: 0.35, res_cold: 0.35, res_light: 0.35, res_poison: 0.35, res_dark: 0.35, res_all: 1.5, moveSpeed_inc: 0.8, dmg_inc: 1.2, crit: 3, crit_inc: 0.25, critMulti: 0.3, cdr: 0.6, skill_all: 25, allAttr: 1.2, vit: 0.5, lifeRegen: 0.1, leech: 6, pen_all: 2.5, bossDmg_inc: 0.5, eliteDmg_inc: 0.3, mf: 0.1, lifeOnKill: 0.05 };
export const W_ARCH = {
  melee: { attack_inc: 1, phys_inc: 1, melee_inc: 1, atkSpeed_inc: 1.5, add_phys: 0.4, add_fire: 0.3, add_cold: 0.3, add_light: 0.3, add_dark: 0.3, add_holy: 0.3, add_poison: 0.3, str: 0.4, dex: 0.25, wdps: 0.6, aoe_inc: 0.4 },
  ranged: { attack_inc: 1, proj_inc: 1, phys_inc: 1, atkSpeed_inc: 1.5, add_phys: 0.4, add_fire: 0.3, add_cold: 0.3, add_light: 0.3, add_poison: 0.3, dex: 0.4, proj_extra: 30, wdps: 0.6 },
  caster: { spell_inc: 1, elem_inc: 0.9, fire_inc: 0.6, cold_inc: 0.6, light_inc: 0.6, dark_inc: 0.6, castSpeed_inc: 1.5, int: 0.4, mana: 0.02, manaRegen_inc: 0.1, sk_fire: 12, sk_cold: 12, sk_light: 12, sk_dark: 12, aoe_inc: 0.4, dot_inc: 0.4 },
  minion: { minion_inc: 1.2, minion_extra: 40, minionLife_inc: 0.3, sk_minion: 20, spell_inc: 0.5, dark_inc: 0.5, spi: 0.4, int: 0.2, mana: 0.02, castSpeed_inc: 0.6 },
};
export const W_TANK = { armor: 2, life: 1.5, block: 2, dr: 2, res_all: 1.5, vit: 2, life_inc: 1.5 };

export const NAMES = ['Вардан', 'Мирослава', 'Грим', 'Элара', 'Торвин', 'Лютик', 'Сайрус', 'Ниара', 'Борз', 'Кассия', 'Ратибор', 'Иви', 'Думгар', 'Селена', 'Хакон', 'Зоря', 'Мортен', 'Айла', 'Крон', 'Весна', 'Рагнар', 'Тэсса', 'Ольгерд', 'Мира', 'Баст', 'Лиара', 'Стриж', 'Ульма', 'Фенрир', 'Яра', 'Каин', 'Нокс', 'Тихон', 'Рысь', 'Дарек', 'Эйла', 'Волк', 'Сова', 'Гаррет', 'Ильва', 'Орм', 'Лада', 'Зигфрид', 'Мгла', 'Тарн', 'Искра', 'Бьорн', 'Вея', 'Клык', 'Рута', 'Северин', 'Нель', 'Грач', 'Аста', 'Корвин', 'Юна', 'Хольд', 'Тень', 'Ярл', 'Мэй', 'Дрозд', 'Фрея', 'Ингвар', 'Лис', 'Морок', 'Аэлин', 'Буран', 'Сигрид', 'Радим', 'Вирея'];
export const NICK_SUFFIX = ['', '', '', '', 'XX', '_tv', '777', 'Pro', 'ик', 'ыч', '2', 'OK'];
export const GUILDS = ['Пепельный легион', 'Ночной дозор', 'Сыны бездны', 'Вольные клинки', 'Орден рассвета', 'Кривые руки'];

// Chat templates. {n} name, {i} item, {a} activity, {t} tier, {r} role, {c} class, {p} price.
export const CHAT = {
  lfg: ['ЛФГ {a} {t}, {r} {c}', '{r} ищет группу в {a}, ур. {t}', 'нужен хил в {a} {t}, остальные есть', 'пати в {a}? я {r}', 'кто в рейд на этой неделе? {r} {c}', 'ищу танка, {a} {t}, быстро'],
  loot: ['выбил «{i}»!!!', 'наконец-то «{i}» упал', 'ого, «{i}». грац мне', '«{i}» с первого раза, изи'],
  wts: ['WTS «{i}», {p} зол., на аукционе', 'выставил «{i}» на аук, недорого', 'продам «{i}» {p}з, торг'],
  lvl: ['дзынь! {t}', '{t} уровень, пацаны', 'ап {t}'],
  idle: ['кто знает где фармить печати?', 'опять пыли нет на заточку', 'король пепла вайпает третий раз за вечер', 'цены на аукционе с ума сошли', 'хил, ты где', 'го башню на рекорд', 'у кого есть лишняя сфера возвышения?', 'лагает или мне кажется', 'когда уже новый рейд', 'заточил на +7 с первого раза))', 'сломал на +8, ненавижу это пламя', 'разлом на 20 реально соло?'],
  join: ['привет', 'всем привет', 'го', 'ку', 'готов', 'я тут', 'погнали'],
  pull: ['пулю', 'бафы есть? пулю', 'го', 'тащим'],
  win: ['гг', 'гг вп', 'изи', 'фух, затащили', 'красавцы', 'грац всем'],
  wipe: ['сорри', 'мой косяк', 'хил, мана?', 'не стойте в огне!!', 'ну как так', 'ещё раз, соберитесь', 'танк, держи босса'],
  dead: ['рес плз', 'упал', 'лаг((', 'не увидел лужу', 'ой'],
  leave: ['ладно, мне пора. удачи', 'сорри, надо идти', 'не, с таким дпс не убьём. я пас'],
  need: ['это мой апгрейд, спасибо', 'наконец-то', 'о, мне как раз'],
  ninja: ['эй, это же не твой класс', '{n}, зачем тебе это? не твой тип', 'ну и ниндзя'],
  afk: ['сек, афк', 'минуту, кот на клавиатуре', 'бр'],
  thx: ['спс за ран', 'спасибо за группу', 'добавлю в друзья', 'норм сходили'],
  rez: ['поднимаю', 'встаём', 'рес'],
  buff: ['кд прожал', 'сейв'],
};
