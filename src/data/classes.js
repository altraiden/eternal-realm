// Classes: base stats, unique mechanic, starting loadout and specializations. Pure data.
const A = (str, dex, int, vit, spi, luck) => ({ str, dex, int, vit, spi, luck });
const armorSet = (kind) => kind === 'plate'
  ? { helm: 'helm', chest: 'plate', gloves: 'gauntlet', boots: 'greaves', belt: 'belt' }
  : kind === 'leather'
    ? { helm: 'hood', chest: 'leather', gloves: 'glove', boots: 'boots', belt: 'belt' }
    : { helm: 'magehood', chest: 'robe', gloves: 'glove', boots: 'boots', belt: 'belt' };

export const CLASSES = {
  warrior: {
    n: 'Воин', spr: 'c_warrior', attr: A(70, 30, 15, 55, 15, 10), life: 620, mana: 110,
    desc: 'Мастер ближнего боя. Копит ярость в сражении и превращает её в сокрушительный урон.',
    mech: { id: 'rage', n: 'Ярость', d: 'Каждый удар даёт 1 ярость (до 40). Каждая единица: +1% урона. Спадает вне боя.' },
    mods: [['armor_inc', 15], ['melee_inc', 10]],
    start: { mainhand: 'longsword', offhand: 'knightshield', ...armorSet('plate') },
    bar: ['cleave', 'slam', 'whirlwind', 'charge', 'warcry', 'rend'],
    specs: [
      { id: 'berserk', n: 'Берсерк', d: 'Чем меньше здоровья, тем страшнее удары.', mods: [['atkSpeed_inc', 20], ['ks_berserk', 40], ['leech', 1.5], ['armor_more', -20]] },
      { id: 'guardian', n: 'Защитник', d: 'Несокрушимая стена из стали.', mods: [['block', 15], ['armor_more', 35], ['dr', 8], ['thorns', 150], ['life_more', 10]] },
      { id: 'titan', n: 'Мастер двуручного оружия', d: 'Медленные, но чудовищные удары по площади.', mods: [['dmg_more', 22], ['area_inc', 30], ['cc_inc', 40], ['atkSpeed_inc', -8]] },
      { id: 'butcher', n: 'Мясник', d: 'Кровотечения, которые не остановить.', mods: [['dot_more', 60], ['ailChance', 40], ['ail_more', 20], ['lifeOnKill', 60]] },
    ],
  },
  mage: {
    n: 'Маг', spr: 'c_mage', attr: A(12, 22, 75, 30, 45, 10), life: 430, mana: 320,
    desc: 'Повелитель стихий. Часть получаемого урона поглощается маной.',
    mech: { id: 'ward', n: 'Чародейский щит', d: '25% получаемого урона сначала тратит ману вместо здоровья.' },
    mods: [['ks_mind', 25], ['spell_inc', 10], ['manaRegen_inc', 40]],
    start: { mainhand: 'staff', ...armorSet('robe') },
    bar: ['fireball', 'frostnova', 'chainlight', 'meteor', 'blink', 'icelance'],
    specs: [
      { id: 'pyro', n: 'Пиромант', d: 'Всё горит.', mods: [['fire_inc', 45], ['pen_fire', 20], ['ailChance', 30], ['dot_more', 30], ['sk_fire', 2]] },
      { id: 'cryo', n: 'Криомант', d: 'Холод сковывает врагов и делает их беззащитными.', mods: [['cold_inc', 40], ['pen_cold', 20], ['cc_inc', 60], ['ail_more', 25], ['sk_cold', 2]] },
      { id: 'storm', n: 'Повелитель бурь', d: 'Молнии бьют без промаха и без пощады.', mods: [['light_inc', 40], ['pen_light', 20], ['crit', 4], ['castSpeed_inc', 15], ['sk_light', 2]] },
      { id: 'arcanist', n: 'Архимаг', d: 'Чистая магическая мощь и бездонная мана.', mods: [['mana_more', 40], ['ks_mind', 20], ['cdr', 20], ['elem_more', 15], ['skill_all', 1]] },
    ],
  },
  necro: {
    n: 'Некромант', spr: 'c_necro', attr: A(15, 20, 60, 35, 60, 10), life: 480, mana: 280,
    desc: 'Поднимает армию мёртвых и проклинает живых.',
    mech: { id: 'legion', n: 'Легион', d: '+2 к максимуму существ. Существа получают 30% больше урона и здоровья.' },
    mods: [['minion_extra', 2], ['minion_more', 30], ['minionLife_inc', 30]],
    start: { mainhand: 'scepter', offhand: 'tome', ...armorSet('robe') },
    bar: ['bonespear', 'raiseskel', 'skelmage', 'boneblast', 'enfeeble', 'bonegolem'],
    specs: [
      { id: 'horde', n: 'Повелитель орды', d: 'Числом возьмём.', mods: [['minion_extra', 4], ['minionLife_inc', 40], ['minion_inc', 30], ['sk_minion', 1]] },
      { id: 'summoner', n: 'Призыватель исполинов', d: 'Меньше слуг, но каждый — чудовище.', mods: [['minion_more', 70], ['minionLife_inc', 100], ['minion_extra', -2], ['sk_minion', 2]] },
      { id: 'hexer', n: 'Мастер проклятий', d: 'Проклятые враги гибнут сами.', mods: [['ail_more', 30], ['duration_inc', 50], ['area_inc', 30], ['dark_inc', 30], ['pen_dark', 15]] },
      { id: 'bonemage', n: 'Костяной чародей', d: 'Тёмная магия собственными руками.', mods: [['dark_inc', 45], ['phys_inc', 45], ['crit', 4], ['critMulti', 30], ['sk_dark', 2]] },
    ],
  },
  assassin: {
    n: 'Ассасин', spr: 'c_assassin', attr: A(25, 75, 25, 35, 15, 25), life: 470, mana: 170,
    desc: 'Яд, критические удары и тени. Добивает ослабленных.',
    mech: { id: 'exploit', n: 'Слабое место', d: 'Наносит на 25% больше урона по целям с любым негативным эффектом.' },
    mods: [['ail_more', 25], ['crit', 3], ['moveSpeed_inc', 8]],
    start: { mainhand: 'dagger', ...armorSet('leather') },
    bar: ['backstab', 'fanknives', 'shadowstep', 'poisontrap', 'smoke', 'deathmark'],
    specs: [
      { id: 'venom', n: 'Отравитель', d: 'Яд складывается бесконечно.', mods: [['poison_inc', 50], ['dot_more', 40], ['ailChance', 50], ['sk_poison', 2]] },
      { id: 'shadow', n: 'Клинок теней', d: 'Один удар — один труп.', mods: [['crit', 6], ['critMulti', 60], ['fullLife_more', 30], ['execute', 12]] },
      { id: 'trickster', n: 'Ловкач', d: 'Неуловим и вездесущ.', mods: [['evasion_more', 40], ['moveSpeed_inc', 15], ['cdr', 25], ['atkSpeed_inc', 15]] },
    ],
  },
  paladin: {
    n: 'Паладин', spr: 'c_paladin', attr: A(55, 20, 25, 55, 40, 10), life: 600, mana: 180,
    desc: 'Святой воин. Блокирует удары и исцеляется от каждого блока.',
    mech: { id: 'faith', n: 'Оплот веры', d: '+15% к блоку. Каждый блок восстанавливает 4% здоровья.' },
    mods: [['block', 15], ['res_all', 8], ['holy_inc', 15]],
    start: { mainhand: 'mace', offhand: 'towershield', ...armorSet('plate') },
    bar: ['smite', 'consecrate', 'hammer', 'faithshield', 'holylight', 'retaura'],
    specs: [
      { id: 'crusader', n: 'Крестоносец', d: 'Священный гнев в каждом ударе.', mods: [['holy_inc', 45], ['attack_inc', 25], ['critMulti', 30], ['sk_holy', 2]] },
      { id: 'templar', n: 'Храмовник', d: 'Щит, который нельзя пробить.', mods: [['ks_blockCap', 1], ['block', 12], ['armor_more', 25], ['thorns', 200], ['lifeRegenPct', 1]] },
      { id: 'inquisitor', n: 'Инквизитор', d: 'Сопротивления врагов ничего не значат.', mods: [['pen_all', 18], ['elem_more', 18], ['crit', 4], ['area_inc', 25]] },
    ],
  },
  hunter: {
    n: 'Охотник', spr: 'c_hunter', attr: A(25, 75, 20, 35, 20, 20), life: 470, mana: 170,
    desc: 'Стрелок. Чем дальше цель — тем больнее выстрел.',
    mech: { id: 'range', n: 'Дальний выстрел', d: 'Снаряды наносят до 35% больше урона целям на расстоянии.' },
    mods: [['proj_inc', 15], ['atkSpeed_inc', 8]],
    start: { mainhand: 'bow', offhand: 'quiver', ...armorSet('leather') },
    bar: ['quickshot', 'volley', 'piercing', 'arrowrain', 'snare', 'roll'],
    specs: [
      { id: 'sniper', n: 'Снайпер', d: 'Один выстрел. Наповал.', mods: [['crit', 6], ['critMulti', 50], ['proj_more', 20], ['projSpeed_inc', 30]] },
      { id: 'barrage', n: 'Шквальный стрелок', d: 'Небо темнеет от стрел.', mods: [['proj_extra', 2], ['atkSpeed_inc', 20], ['proj_more', -10], ['area_inc', 20]] },
      { id: 'beast', n: 'Повелитель зверей', d: 'Стая охотится вместе.', mods: [['minion_extra', 2], ['minion_more', 50], ['minionLife_inc', 60], ['sk_minion', 2]] },
    ],
  },
  druid: {
    n: 'Друид', spr: 'c_druid', attr: A(35, 30, 45, 45, 55, 10), life: 540, mana: 240,
    desc: 'Силы природы: бури, шипы и звери. Каждые несколько секунд навык усиливается и лечит.',
    mech: { id: 'nature', n: 'Милость природы', d: 'Каждые 5 сек. следующий навык наносит на 50% больше урона и исцеляет 6% здоровья.' },
    mods: [['lifeRegenPct', 0.8], ['minionLife_inc', 20]],
    start: { mainhand: 'staff', ...armorSet('leather') },
    bar: ['stormwrath', 'thorns', 'treant', 'wolves', 'stoneskin', 'tornado'],
    specs: [
      { id: 'tempest', n: 'Буревестник', d: 'Гроза идёт за вами.', mods: [['light_inc', 40], ['cold_inc', 30], ['area_inc', 25], ['castSpeed_inc', 15]] },
      { id: 'warden', n: 'Страж рощи', d: 'Кора вместо кожи.', mods: [['armor_more', 40], ['life_more', 15], ['lifeRegenPct', 1.5], ['thorns', 180]] },
      { id: 'packlord', n: 'Вожак стаи', d: 'Звери слушаются только вас.', mods: [['minion_extra', 2], ['minion_more', 45], ['minionLife_inc', 50], ['sk_minion', 2]] },
      { id: 'blight', n: 'Сеятель гнили', d: 'Яд и шипы медленно душат всё живое.', mods: [['poison_inc', 45], ['dot_more', 40], ['duration_inc', 40], ['sk_poison', 2]] },
    ],
  },
  warlock: {
    n: 'Чернокнижник', spr: 'c_warlock', attr: A(15, 20, 70, 40, 45, 10), life: 500, mana: 250,
    desc: 'Тьма и хаос. Проклятые враги страдают сильнее, а периодический урон усилен.',
    mech: { id: 'pact', n: 'Тёмный пакт', d: 'Периодический урон на 30% больше. Убийства восстанавливают 2% здоровья.' },
    mods: [['dot_more', 30], ['dark_inc', 15]],
    start: { mainhand: 'wand', offhand: 'orb', ...armorSet('robe') },
    bar: ['shadowbolt', 'corruption', 'hellfire', 'imp', 'drainlife', 'chaosrain'],
    specs: [
      { id: 'affliction', n: 'Мучитель', d: 'Смерть от тысячи порч.', mods: [['dot_more', 50], ['duration_inc', 40], ['dark_inc', 30], ['ailChance', 30]] },
      { id: 'demonologist', n: 'Демонолог', d: 'Бесы делают грязную работу.', mods: [['minion_extra', 3], ['minion_more', 50], ['minionLife_inc', 40], ['sk_minion', 2]] },
      { id: 'destruction', n: 'Разрушитель', d: 'Огонь и тьма в одном потоке.', mods: [['fire_inc', 35], ['dark_inc', 35], ['crit', 5], ['critMulti', 40], ['area_inc', 20]] },
    ],
  },
  monk: {
    n: 'Монах', spr: 'c_monk', attr: A(40, 60, 20, 45, 40, 10), life: 540, mana: 170,
    desc: 'Мастер рукопашного боя. Чередование разных приёмов наращивает комбо.',
    mech: { id: 'combo', n: 'Комбо', d: 'Использование навыка, отличного от предыдущего, даёт заряд комбо (до 5): +8% урона и +3% скорости за заряд.' },
    mods: [['evasion_inc', 20], ['atkSpeed_inc', 10], ['moveSpeed_inc', 8]],
    start: { mainhand: 'claw', ...armorSet('leather') },
    bar: ['palm', 'flurry', 'chiwave', 'dashstrike', 'innerpeace', 'sevenstars'],
    specs: [
      { id: 'windwalker', n: 'Идущий по ветру', d: 'Быстрее, чем видит глаз.', mods: [['atkSpeed_inc', 25], ['moveSpeed_inc', 15], ['evasion_more', 30], ['cdr', 15]] },
      { id: 'ironfist', n: 'Железный кулак', d: 'Каждый удар ломает кости.', mods: [['phys_inc', 50], ['cc_inc', 60], ['critMulti', 40], ['armor_more', 20]] },
      { id: 'sage', n: 'Мудрец', d: 'Сила духа важнее силы тела.', mods: [['holy_inc', 40], ['light_inc', 40], ['lifeRegenPct', 1.5], ['dr', 6], ['manaRegen_inc', 60]] },
    ],
  },
  dk: {
    n: 'Рыцарь смерти', spr: 'c_dk', attr: A(60, 20, 35, 55, 30, 10), life: 620, mana: 170,
    desc: 'Проклятый воин. Собирает души павших и обманывает смерть.',
    mech: { id: 'souls', n: 'Жатва душ', d: 'Убийства дают души (до 20, на 10 сек.): +2% урона и +0.1% вампиризма каждая. Раз в 90 сек. смертельный удар оставляет вас с 30% здоровья.' },
    mods: [['dark_inc', 12], ['cold_inc', 12], ['leech', 0.6]],
    start: { mainhand: 'greatsword', ...armorSet('plate') },
    bar: ['deathstrike', 'icechains', 'decay', 'deathgrip', 'armydead', 'boneshield'],
    specs: [
      { id: 'blood', n: 'Кровь', d: 'Чужая жизнь — ваше здоровье.', mods: [['leech', 2.5], ['life_more', 20], ['leech_more', 50], ['lifeOnHit', 15]] },
      { id: 'frost', n: 'Лёд', d: 'Мёртвый холод останавливает сердца.', mods: [['cold_inc', 50], ['conv_cold', 50], ['cc_inc', 50], ['ail_more', 20], ['sk_cold', 2]] },
      { id: 'unholy', n: 'Нечестивость', d: 'Чума и свита упырей.', mods: [['dark_inc', 40], ['minion_extra', 2], ['minion_more', 40], ['dot_more', 35]] },
    ],
  },
};
export const CLASS_IDS = Object.keys(CLASSES);
