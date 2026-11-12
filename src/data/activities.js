// Endgame activities, portal modifiers, difficulty bands. Pure data; run logic in src/game.js.
export const ACTIVITIES = {
  maps: {
    n: 'Затерянные измерения', i: 'd_portal', gen: 'cave', keyCost: 0,
    desc: 'Случайное измерение: открытая локация, стаи монстров, элита, алтари, сундуки и босс в самой дальней точке.',
    goal: 'Найдите и убейте босса измерения.', mats: { chaos: 1, annul: 0.5, whet: 0.5 },
  },
  dungeon: {
    n: 'Бездонные подземелья', i: 'd_stairs', gen: 'dungeon', keyCost: 0, floors: 3,
    desc: 'Три этажа комнат и коридоров: ловушки, сокровищницы, комнаты элиты. На последнем этаже — страж подземелья.',
    goal: 'Спускайтесь по лестницам и убейте стража на нижнем этаже.', mats: { exalt: 0.6, regal: 0.5, whet: 0.4 },
  },
  tower: {
    n: 'Бесконечная башня', i: 'd_wiztower', gen: 'arena', keyCost: 0, noDeath: 1,
    desc: 'Этаж за этажом без права на ошибку. Каждый этаж сильнее, каждый пятый — босс. Смерть завершает восхождение.',
    goal: 'Зачищайте этажи. Рекорд сохраняется.', mats: { shard: 1 },
  },
  rift: {
    n: 'Адские разломы', i: 'd_firepillar', gen: 'arena', keyCost: 0,
    desc: 'Арена, на которую без остановки прут орды. Заполните шкалу убийств — и явится Владыка разлома. Чем быстрее, тем богаче награда.',
    goal: 'Убивайте, пока не явится Владыка разлома.', mats: { ember: 1.2 },
  },
  boss: {
    n: 'Царство боссов', i: 'd_throne', gen: 'arena', keyCost: 1,
    desc: 'Дуэль с выбранным владыкой. У каждого своя арена, свои фазы и своя уникальная добыча. Вход — Ключ владыки.',
    goal: 'Убейте владыку.', mats: { divine: 1, key: 0 },
  },
  chaos: {
    n: 'Испытания хаоса', i: 'd_runeobelisk', gen: 'cave', keyCost: 0,
    desc: 'Измерение с тремя случайными правилами хаоса, которые нельзя убрать. Награды значительно выше.',
    goal: 'Выживите и убейте босса.', mats: { annul: 0.8, divine: 0.5, chaos: 1, exalt: 0.4 },
  },
  gdungeon: {
    n: 'Чертоги на пятерых', i: 'd_gatehouse', gen: 'dungeon', keyCost: 0, floors: 2, group: 5,
    desc: 'Групповое подземелье для пяти героев: танк, лекарь и три бойца. Монстры втрое крепче и бьют больнее, боссы используют групповые механики. Добыча боссов разыгрывается броском.',
    goal: 'Пройдите два этажа и убейте стража.', mats: { exalt: 0.8, regal: 0.6, divine: 0.3 },
  },
  raid: {
    n: 'Межпространственный рейд', i: 'd_gate', gen: 'arena', keyCost: 0, group: 10, stages: 3, weekly: 1,
    desc: 'Десять героев, три владыки подряд. Групповые механики, розыгрыш добычи, Печати владыки. Сохранение — раз в неделю.',
    goal: 'Убейте трёх владык подряд.', mats: { divine: 1.5, shard: 0.5 },
  },
};
export const ACT_IDS = Object.keys(ACTIVITIES).filter((a) => !ACTIVITIES[a].group);
export const GROUP_IDS = Object.keys(ACTIVITIES).filter((a) => ACTIVITIES[a].group);
export const weekId = () => Math.floor((Date.now() / 86400000 + 3) / 7);

// qty / rar = % bonus to item quantity / rarity. fx is read by the run logic.
export const PORTAL_MODS = {
  dense: { n: 'Столпотворение', d: 'На 40% больше монстров.', qty: 20, rar: 0, fx: { mobCount: 1.4 } },
  tough: { n: 'Толстокожие', d: 'У монстров на 50% больше здоровья.', qty: 5, rar: 15, fx: { mobHp: 1.5 } },
  deadly: { n: 'Смертоносные', d: 'Монстры наносят на 35% больше урона.', qty: 5, rar: 20, fx: { mobDmg: 1.35 } },
  elites: { n: 'Знать бездны', d: 'Вдвое больше элитных стай.', qty: 25, rar: 10, fx: { elite: 2 } },
  twin: { n: 'Двоевластие', d: 'Дополнительный босс.', qty: 10, rar: 30, fx: { bosses: 1 } },
  noregen: { n: 'Иссушение', d: 'Здоровье и мана не восстанавливаются сами; вампиризм вдвое слабее.', qty: 25, rar: 10, fx: { noRegen: 1 } },
  fragile: { n: 'Уязвимость', d: 'Ваши сопротивления снижены на 25%.', qty: 15, rar: 10, fx: { playerRes: -25 } },
  swift: { n: 'Проворные', d: 'Монстры двигаются и атакуют на 25% быстрее.', qty: 15, rar: 5, fx: { mobSpd: 1.25 } },
  meteors: { n: 'Огненный дождь', d: 'С неба постоянно падают метеоры.', qty: 15, rar: 10, fx: { meteors: 1 } },
  blizzard: { n: 'Вечная стужа', d: 'Вы постоянно охлаждены: −20% скорости передвижения.', qty: 15, rar: 5, fx: { chill: 1 } },
  volatile: { n: 'Нестабильность', d: 'Монстры взрываются после смерти.', qty: 15, rar: 10, fx: { volatile: 1 } },
  heavy: { n: 'Искажённая физика', d: 'Все снаряды в измерении летят вдвое медленнее.', qty: 10, rar: 5, fx: { slowProj: 1 } },
  // chaos-only rules (cannot be chosen by hand)
  degen: { n: 'Кровоточащий мир', d: 'Вы теряете 1.5% здоровья в секунду.', qty: 30, rar: 20, fx: { degen: 1.5 }, chaos: 1 },
  noflask: { n: 'Пересохшие фляги', d: 'Зелья не действуют.', qty: 25, rar: 15, fx: { noFlask: 1 }, chaos: 1 },
  empowered: { n: 'Одержимость', d: 'Каждый монстр получает случайную способность элиты.', qty: 35, rar: 25, fx: { allElite: 1 }, chaos: 1 },
  reflect: { n: 'Зеркальная плоть', d: 'Монстры возвращают 6% полученного урона.', qty: 30, rar: 20, fx: { reflect: 6 }, chaos: 1 },
};
export const MOD_IDS = Object.keys(PORTAL_MODS);

// Secret combinations of modifiers.
export const COMBOS = [
  { need: ['dense', 'elites', 'twin'], n: 'Орда бездны', d: 'Секретное событие: пробуждённый босс с гарантированным Ключом владыки.', fx: { awakened: 1 } },
  { need: ['meteors', 'blizzard', 'volatile'], n: 'Конец света', d: 'Секретное событие: +60% редкости добычи, а из босса выпадает Божественная искра.', fx: { apocalypse: 1 }, rar: 60 },
  { need: ['tough', 'deadly', 'swift'], n: 'Высшая лига', d: 'Секретное событие: каждый редкий монстр роняет сферу.', fx: { league: 1 } },
];

export const DIFFS = [
  { n: 'Normal', from: 1, c: '#c9c9c9', d: 'Базовые правила.' },
  { n: 'Hard', from: 6, c: '#6f8fff', d: 'Элита получает дополнительную способность.' },
  { n: 'Nightmare', from: 11, c: '#ffe45e', d: 'Атаки монстров накладывают стихийные эффекты.' },
  { n: 'Torment', from: 17, c: '#ff8a2a', d: 'Боссы действуют быстрее, пауз между атаками меньше.' },
  { n: 'Infernal', from: 25, c: '#ff4d4d', d: 'Больше редких монстров; боссы впадают в ярость раньше.' },
  { n: 'Abyssal', from: 35, c: '#b06bff', d: 'Каждый монстр обладает способностью элиты.' },
];
export const diffOf = (tier) => { let d = 0; for (let i = 0; i < DIFFS.length; i++) if (tier >= DIFFS[i].from) d = i; return d; };

// Balance curves (single source of truth).
export const CURVE = {
  mobHp: (t) => 320 * Math.pow(1.14, t - 1),
  mobDmg: (t) => 56 * Math.pow(1.085, t - 1),
  mobXp: (t) => 22 * Math.pow(1.1, t - 1),
  ilvl: (t) => 70 + Math.round((t - 1) * 1.6),
  xpNeed: (lvl) => Math.round(16000 * Math.pow(1.17, lvl - 70)),
  gold: (t) => 6 * Math.pow(1.07, t - 1),
};
