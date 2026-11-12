// Item bases, affixes, legendary powers, uniques, currencies. Pure data; generator lives in src/items.js.
const W = (n, spr, w, d, aps, crit, x = {}) => ({ n, s: 'mainhand', spr, w, d, aps, crit, ...x });
const AR = (n, s, spr, def, x = {}) => ({ n, s, spr, def, ...x });

export const BASES = {
  // one-handed
  longsword: W('Длинный меч', 'i_sword', 'sword', [68, 112], 1.35, 5),
  katana: W('Катана', 'i_katana', 'sword', [60, 104], 1.5, 7, { imp: [['critMulti', 15, 25]] }),
  battleaxe: W('Боевой топор', 'i_axe', 'axe', [78, 128], 1.2, 5, { imp: [['ailChance', 10, 15]] }),
  mace: W('Булава', 'i_mace', 'mace', [82, 122], 1.15, 5, { imp: [['cc_inc', 15, 25]] }),
  flail: W('Кистень', 'i_flail', 'mace', [58, 150], 1.2, 6),
  dagger: W('Кинжал', 'i_dagger', 'dagger', [44, 82], 1.7, 9, { imp: [['crit_inc', 20, 30]] }),
  claw: W('Когти', 'i_claw', 'claw', [50, 84], 1.65, 7, { imp: [['lifeOnHit', 6, 10]] }),
  wand: W('Жезл', 'i_wand', 'wand', [30, 56], 1.4, 7, { cast: 1, imp: [['spell_inc', 25, 40]] }),
  scepter: W('Скипетр', 'i_scepter', 'mace', [50, 80], 1.25, 6, { cast: 1, imp: [['minion_inc', 20, 35], ['spell_inc', 12, 20]] }),
  // two-handed
  greatsword: W('Двуручный меч', 'i_greatsword', 'sword', [128, 205], 1.1, 5, { h: 2 }),
  halberd: W('Алебарда', 'i_halberd', 'axe', [140, 220], 1.0, 5, { h: 2, imp: [['area_inc', 10, 18]] }),
  warhammer: W('Боевой молот', 'i_hammer', 'mace', [150, 235], 0.92, 5, { h: 2, imp: [['cc_inc', 25, 40]] }),
  spear: W('Копьё', 'i_spear', 'spear', [112, 180], 1.2, 6, { h: 2 }),
  scythe: W('Коса жнеца', 'i_scythe', 'scythe', [120, 200], 1.1, 6, { h: 2, imp: [['leech', 0.6, 1]] }),
  staff: W('Посох', 'i_staff', 'staff', [70, 120], 1.15, 6, { h: 2, cast: 1, imp: [['spell_inc', 45, 70]] }),
  bow: W('Длинный лук', 'i_bow', 'bow', [92, 150], 1.3, 6, { h: 2, rng: 1 }),
  crossbow: W('Арбалет', 'i_crossbow', 'bow', [125, 200], 1.0, 7, { h: 2, rng: 1, imp: [['critMulti', 15, 25]] }),
  // armour
  helm: AR('Латный шлем', 'helm', 'i_helm', { armor: 260 }),
  hood: AR('Капюшон', 'helm', 'i_hood', { evasion: 250 }),
  magehood: AR('Колпак чародея', 'helm', 'i_magehood', { mana: 70, armor: 90 }),
  crown: AR('Корона', 'helm', 'i_crown', { armor: 150 }, { imp: [['res_all', 6, 10]] }),
  plate: AR('Латный нагрудник', 'chest', 'i_plate', { armor: 430 }),
  leather: AR('Кожаный доспех', 'chest', 'i_leather', { evasion: 410 }),
  robe: AR('Мантия', 'chest', 'i_robe', { mana: 110, armor: 150 }),
  gauntlet: AR('Латные рукавицы', 'gloves', 'i_gauntlet', { armor: 180 }),
  glove: AR('Перчатки', 'gloves', 'i_glove', { evasion: 170 }),
  greaves: AR('Латные сапоги', 'boots', 'i_greaves', { armor: 180 }),
  boots: AR('Сапоги', 'boots', 'i_boots', { evasion: 170 }),
  belt: AR('Пояс', 'belt', 'i_belt', { armor: 90 }, { imp: [['life', 40, 70]] }),
  // off-hand
  knightshield: AR('Рыцарский щит', 'offhand', 'i_shield', { armor: 340, block: 22 }, { shield: 1 }),
  towershield: AR('Башенный щит', 'offhand', 'i_towershield', { armor: 480, block: 26 }, { shield: 1, imp: [['moveSpeed_inc', -4, -4]] }),
  buckler: AR('Баклер', 'offhand', 'i_buckler', { evasion: 300, block: 18 }, { shield: 1 }),
  quiver: AR('Колчан', 'offhand', 'i_quiver', {}, { imp: [['proj_inc', 15, 25], ['atkSpeed_inc', 4, 8]], needs: 'bow' }),
  tome: AR('Гримуар', 'offhand', 'i_tome', { mana: 60 }, { imp: [['spell_inc', 15, 25], ['minion_inc', 15, 25]] }),
  orb: AR('Сфера духа', 'offhand', 'i_orb', { mana: 90 }, { imp: [['elem_inc', 12, 20], ['manaRegen_inc', 20, 30]] }),
  // jewellery etc.
  amulet: AR('Амулет', 'amulet', 'i_amulet', {}, { imp: [['allAttr', 4, 8]] }),
  ring: AR('Кольцо', 'ring', 'i_ring', {}, { imp: [['life', 20, 40]] }),
  skullring: AR('Кольцо черепа', 'ring', 'i_skullring', {}, { imp: [['dark_inc', 8, 14], ['leech', 0.2, 0.4]] }),
  talisman: AR('Талисман', 'relic', 'i_relic', {}, { imp: [['res_all', 4, 8]] }),
  idol: AR('Идол', 'relic', 'i_idol', {}, { imp: [['minion_inc', 10, 20], ['dmg_inc', 4, 8]] }),
  soulgem: AR('Камень душ', 'artifact', 'i_artifact', {}, { imp: [['dmg_inc', 6, 12]] }),
  core: AR('Ядро стихий', 'artifact', 'i_core', {}, { imp: [['elem_inc', 10, 18]] }),
  dragonheart: AR('Сердце дракона', 'artifact', 'i_heart', {}, { imp: [['life_inc', 4, 8], ['fire_inc', 8, 14]] }),
};
export const BASE_IDS = Object.keys(BASES);
export const SLOT_CODE = { mainhand: 'w', offhand: 'o', helm: 'h', chest: 'c', gloves: 'g', boots: 'b', belt: 'l', amulet: 'a', ring: 'r', relic: 'k', artifact: 't' };

// [id, kind p/s, stat, lo, hi, growth per ilvl, slots, weight, suffix name]
const ALL = 'wohcgblarkt', ARM = 'hcgbl', JEW = 'ar', TRI = 'akt';
const AF = (id, kind, stat, lo, hi, k, on, w, sn) => ({ id, kind, stat, lo, hi, k, on, w, sn });
const EL = [['fire', 'пламени'], ['cold', 'стужи'], ['light', 'грозы'], ['poison', 'яда'], ['dark', 'мрака'], ['holy', 'света']];
export const AFFIXES = [
  AF('life', 'p', 'life', 60, 120, 0.03, ARM + JEW + 'ok', 10, 'жизни'),
  AF('lifeP', 'p', 'life_inc', 4, 8, 0.004, 'cla', 4, 'исполина'),
  AF('mana', 'p', 'mana', 40, 80, 0.03, 'harok', 6, 'разума'),
  AF('armor', 'p', 'armor', 80, 160, 0.03, ARM + 'o', 8, 'стали'),
  AF('armorP', 'p', 'armor_inc', 15, 30, 0.006, ARM + 'o', 6, 'черепахи'),
  AF('eva', 'p', 'evasion', 80, 160, 0.03, 'hcgb', 6, 'ветра'),
  AF('evaP', 'p', 'evasion_inc', 15, 30, 0.006, 'hcgb', 5, 'призрака'),
  AF('wdmg', 'p', 'wdmg_inc', 30, 60, 0.012, 'w', 14, 'палача'),
  AF('addPhys', 'p', 'add_phys', 10, 20, 0.035, 'wrag', 7, 'клинков'),
  ...EL.map(([e, sn]) => AF('add_' + e, 'p', 'add_' + e, 14, 28, 0.035, 'wragk', 3.2, sn)),
  ...EL.map(([e, sn]) => AF(e + 'P', 'p', e + '_inc', 14, 28, 0.008, 'waorkt', 3, sn)),
  AF('physP', 'p', 'phys_inc', 14, 28, 0.008, 'wakt', 6, 'силача'),
  AF('elemP', 'p', 'elem_inc', 8, 16, 0.008, 'wakt', 4, 'стихий'),
  AF('spellP', 'p', 'spell_inc', 16, 32, 0.008, 'woa', 7, 'чародея'),
  AF('attackP', 'p', 'attack_inc', 12, 24, 0.008, 'wgr', 7, 'воина'),
  AF('minionP', 'p', 'minion_inc', 16, 32, 0.008, 'woahk', 5, 'повелителя'),
  AF('dmgP', 'p', 'dmg_inc', 6, 12, 0.006, 'arkt', 5, 'разрушения'),
  AF('ms', 'p', 'moveSpeed_inc', 8, 15, 0.002, 'b', 14, 'скорохода'),
  AF('thorns', 'p', 'thorns', 40, 80, 0.035, 'co', 3, 'шипов'),
  AF('dotP', 'p', 'dot_inc', 14, 28, 0.008, 'wakt', 4, 'увядания'),
  AF('aoeP', 'p', 'aoe_inc', 12, 24, 0.008, 'wakt', 4, 'бури'),
  AF('projP', 'p', 'proj_inc', 12, 24, 0.008, 'wgak', 4, 'стрелка'),
  AF('meleeP', 'p', 'melee_inc', 12, 24, 0.008, 'wgak', 4, 'ярости'),
  ...[['str', 'силы'], ['dex', 'ловкости'], ['int', 'интеллекта'], ['vit', 'живучести'], ['spi', 'духа'], ['luck', 'удачи']].map(([a, sn]) => AF(a, 's', a, 10, 20, 0.02, ALL, 4, sn)),
  AF('allAttr', 's', 'allAttr', 5, 10, 0.02, 'arkt', 3, 'совершенства'),
  ...[['fire', 'саламандры'], ['cold', 'йети'], ['light', 'громоотвода'], ['poison', 'змеи'], ['dark', 'тени']].map(([e, sn]) => AF('res_' + e, 's', 'res_' + e, 12, 24, 0.004, ARM + JEW + 'ok', 5, sn)),
  AF('resAll', 's', 'res_all', 5, 10, 0.003, 'aroc', 4, 'радуги'),
  AF('as', 's', 'atkSpeed_inc', 5, 10, 0.003, 'wgr', 8, 'быстроты'),
  AF('cs', 's', 'castSpeed_inc', 5, 10, 0.003, 'woar', 8, 'вдохновения'),
  AF('crit', 's', 'crit', 1, 2.5, 0.004, 'wgar', 6, 'меткости'),
  AF('critP', 's', 'crit_inc', 12, 24, 0.006, 'wgar', 6, 'остроты'),
  AF('critM', 's', 'critMulti', 10, 22, 0.006, 'wgark', 6, 'расправы'),
  AF('leech', 's', 'leech', 0.4, 1, 0.004, 'wrg', 4, 'вампира'),
  AF('lok', 's', 'lifeOnKill', 15, 30, 0.03, 'wgr', 4, 'жатвы'),
  AF('mok', 's', 'manaOnKill', 8, 16, 0.03, 'wgro', 4, 'озарения'),
  AF('regen', 's', 'lifeRegen', 8, 16, 0.03, 'hcbl', 5, 'исцеления'),
  AF('mregen', 's', 'manaRegen_inc', 15, 30, 0.006, 'haro', 5, 'потока'),
  AF('block', 's', 'block', 3, 6, 0.002, 'oc', 4, 'стража'),
  AF('dr', 's', 'dr', 2, 4, 0.001, 'col', 3, 'стойкости'),
  AF('cdr', 's', 'cdr', 4, 8, 0.002, 'halkt', 5, 'времени'),
  AF('cost', 's', 'cost_inc', -5, -10, 0, 'harkt', 3, 'бережливости'),
  AF('area', 's', 'area_inc', 8, 16, 0.003, 'wakt', 4, 'простора'),
  AF('proj', 's', 'proj_extra', 1, 1, 0, 'wo', 0.5, 'залпа'),
  AF('dur', 's', 'duration_inc', 10, 20, 0.004, 'akt', 3, 'вечности'),
  AF('minionN', 's', 'minion_extra', 1, 1, 0, 'ho', 0.6, 'свиты'),
  AF('minionL', 's', 'minionLife_inc', 16, 32, 0.008, 'hoak', 3, 'орды'),
  AF('pen', 's', 'pen_all', 3, 6, 0.002, 'wakt', 3, 'сокрушения'),
  AF('boss', 's', 'bossDmg_inc', 8, 16, 0.006, 'wkt', 3, 'убийцы титанов'),
  AF('elite', 's', 'eliteDmg_inc', 8, 16, 0.006, 'wkt', 3, 'охотника'),
  AF('mf', 's', 'mf', 8, 16, 0.004, 'arhbk', 4, 'находок'),
  AF('gf', 's', 'gf', 15, 30, 0.006, 'arbl', 4, 'алчности'),
  AF('xp', 's', 'xp_inc', 3, 6, 0.001, 'arkt', 2, 'познания'),
  AF('skAll', 's', 'skill_all', 1, 1, 0, 'akt', 0.5, 'мастера'),
  ...[['fire', 'пироманта'], ['cold', 'криоманта'], ['light', 'громовержца'], ['phys', 'бойца'], ['dark', 'оккультиста'], ['holy', 'жреца'], ['poison', 'отравителя'], ['minion', 'некроманта']].map(([e, sn]) => AF('sk_' + e, 's', 'sk_' + e, 1, 2, 0, 'who', 1, sn)),
  AF('ail', 's', 'ailChance', 8, 16, 0.004, 'wg', 3, 'напасти'),
  AF('cc', 's', 'cc_inc', 10, 20, 0.004, 'wgk', 2, 'оков'),
  AF('convFire', 's', 'conv_fire', 20, 40, 0, 'wg', 1, 'горнила'),
  AF('convCold', 's', 'conv_cold', 20, 40, 0, 'wg', 1, 'ледника'),
  AF('convLight', 's', 'conv_light', 20, 40, 0, 'wg', 1, 'разряда'),
];
export const AFFIX_BY_ID = Object.fromEntries(AFFIXES.map((a) => [a.id, a]));

// Legendary powers. Either a stat bundle (mods) or a proc (handled by combat.fireProcs). v = rolled range.
export const POWERS = {
  chainCrit: { d: 'Критические удары с шансом 30% вызывают цепную молнию (#% урона удара).', v: [50, 90], proc: { on: 'crit', ch: 30, cd: 0.3, act: 'chain', type: 'light', jumps: 4 } },
  corpseBoom: { d: 'Убитые враги взрываются, нанося #% своего здоровья огнём.', v: [8, 16], proc: { on: 'kill', ch: 100, cd: 0, act: 'explode', type: 'fire', rad: 2.6 } },
  frostNova: { d: 'Удары с шансом 12% вызывают ледяную вспышку (#% урона удара).', v: [70, 130], proc: { on: 'hit', ch: 12, cd: 0.6, act: 'nova', type: 'cold', rad: 3.2, ail: { chill: 100, freeze: 30 } } },
  barrier: { d: 'При получении урона: на 4 сек. −#% получаемого урона (перезарядка 8 сек.).', v: [20, 35], proc: { on: 'hurt', ch: 100, cd: 8, act: 'buff', stat: 'dr', dur: 4, name: 'Барьер' } },
  lowLife: { d: '#% больше урона при здоровье ниже 35%.', v: [30, 55], mods: [['lowLife_more', 1]] },
  fullLife: { d: '#% больше урона при полном здоровье.', v: [18, 32], mods: [['fullLife_more', 1]] },
  frenzy: { d: 'Убийство: на 5 сек. +#% скорости атаки, заклинаний и бега.', v: [14, 24], proc: { on: 'kill', ch: 100, cd: 0, act: 'buff', stat: ['atkSpeed_inc', 'castSpeed_inc', 'moveSpeed_inc'], dur: 5, name: 'Раж' } },
  meteor: { d: 'Удары с шансом 8% обрушивают метеор (#% урона удара).', v: [150, 260], proc: { on: 'hit', ch: 8, cd: 1, act: 'meteor', type: 'fire', rad: 2.6 } },
  soulDrink: { d: 'Убийство восстанавливает #% здоровья.', v: [2, 4], proc: { on: 'kill', ch: 100, cd: 0, act: 'heal' } },
  mindShield: { d: '#% получаемого урона сначала тратит ману.', v: [15, 25], mods: [['ks_mind', 1]] },
  twin: { d: 'Удары с шансом #% наносят урон дважды.', v: [10, 18], proc: { on: 'hit', chV: 1, cd: 0, act: 'repeat' } },
  spirits: { d: 'Убийство с шансом #% призывает духа-помощника на 12 сек.', v: [10, 20], proc: { on: 'kill', chV: 1, cd: 0.5, act: 'summon', m: 'spirit', dur: 12, max: 5 } },
  plague: { d: 'Убитые враги оставляют ядовитое облако (#% урона удара в сек.).', v: [20, 40], proc: { on: 'kill', ch: 100, cd: 0.4, act: 'zone', type: 'poison', rad: 2.2, dur: 4 } },
  barrage: { d: '+2 дополнительных снаряда, но #% меньше урона снарядов.', v: [20, 10], mods: [['proj_extra', 0, 2], ['proj_more', -1]] },
  fury: { d: 'Каждый удар даёт заряд (до 20, 4 сек.): +#% урона за заряд.', v: [1, 2], proc: { on: 'hit', ch: 100, cd: 0.1, act: 'stack', stat: 'dmg_inc', dur: 4, max: 20, name: 'Неистовство' } },
  timeWarp: { d: '+#% скорости перезарядки навыков.', v: [15, 28], mods: [['cdr', 1]] },
  executioner: { d: 'Обычные враги ниже #% здоровья погибают мгновенно.', v: [10, 18], mods: [['execute', 1]] },
  titanSlayer: { d: '+#% урона по боссам и элите.', v: [25, 45], mods: [['bossDmg_inc', 1], ['eliteDmg_inc', 1]] },
  thornNova: { d: 'Блок вызывает взрыв шипов (#% вашей брони физическим уроном).', v: [40, 80], proc: { on: 'block', ch: 100, cd: 0.5, act: 'armorNova', type: 'phys', rad: 3 } },
  manaBurn: { d: 'Заклинания с шансом 20% не тратят ману и наносят #% больше урона.', v: [20, 40], proc: { on: 'cast', ch: 20, cd: 0, act: 'freecast' } },
  overlord: { d: '+1 к максимуму существ и #% больше их урона.', v: [15, 30], mods: [['minion_extra', 0, 1], ['minion_more', 1]] },
  glass: { d: '#% больше урона, но на 15% меньше здоровья.', v: [18, 30], mods: [['dmg_more', 1], ['life_more', 0, -15]] },
};
export const POWER_IDS = Object.keys(POWERS);

// Uniques: fixed mods [stat, lo, hi] + one signature power (same format as POWERS entries). boss = exclusive drop source.
const U = (n, base, mods, pow, flavor, boss) => ({ n, base, mods, pow, flavor, boss });
export const UNIQUES = {
  stormcaller: U('Зов грозы', 'longsword', [['wdmg_inc', 80, 120], ['add_light', 30, 60], ['crit', 3, 5], ['atkSpeed_inc', 8, 14]], { d: 'Критические удары всегда вызывают цепную молнию (#% урона удара).', v: [80, 120], proc: { on: 'crit', ch: 100, cd: 0.25, act: 'chain', type: 'light', jumps: 5 } }, 'Гром слышен раньше, чем виден клинок.'),
  soulharvest: U('Жнец душ', 'staff', [['spell_inc', 60, 90], ['castSpeed_inc', 8, 15], ['mana', 80, 140]], { d: 'Каждое убийство: +#% урона заклинаний на 8 сек. (до 25 зарядов).', v: [3, 5], proc: { on: 'kill', ch: 100, cd: 0, act: 'stack', stat: 'spell_inc', dur: 8, max: 25, name: 'Жатва' } }, 'Каждая погасшая жизнь питает его пламя.'),
  manaring: U('Кольцо прилива', 'ring', [['mana', 80, 140], ['manaRegen_inc', 40, 70], ['int', 15, 25]], { d: '#% получаемого урона превращается в расход маны.', v: [18, 28], mods: [['ks_mind', 1]] }, 'Боль — всего лишь волна.'),
  lastbreath: U('Последний вздох', 'plate', [['armor_inc', 60, 100], ['life', 120, 200], ['res_all', 8, 14]], { d: '#% больше урона при здоровье ниже 35%.', v: [60, 90], mods: [['lowLife_more', 1]] }, 'Загнанный зверь опаснее всего.'),
  mirror: U('Амулет двойника', 'amulet', [['allAttr', 12, 20], ['dmg_inc', 10, 18]], { d: 'Удары с шансом #% наносят урон дважды.', v: [20, 30], proc: { on: 'hit', chV: 1, cd: 0, act: 'repeat' } }, 'В отражении он улыбается иначе.'),
  cinderfists: U('Кулаки пепла', 'gauntlet', [['armor', 150, 260], ['conv_fire', 100, 100], ['fire_inc', 30, 50], ['atkSpeed_inc', 8, 12]], { d: 'Удары с шансом 20% вызывают огненный взрыв (#% урона удара).', v: [90, 140], proc: { on: 'hit', ch: 20, cd: 0.3, act: 'nova', at: 'target', type: 'fire', rad: 2.4, ail: { ignite: 100 } } }, 'Всё, чего они касаются, становится золой.'),
  windrunners: U('Сапоги ветра', 'boots', [['moveSpeed_inc', 22, 30], ['evasion', 200, 320], ['dex', 15, 25]], { d: 'Убийство: на 5 сек. +#% скорости атаки, заклинаний и бега.', v: [20, 30], proc: { on: 'kill', ch: 100, cd: 0, act: 'buff', stat: ['atkSpeed_inc', 'castSpeed_inc', 'moveSpeed_inc'], dur: 5, name: 'Попутный ветер' } }, 'Их не догонит даже эхо.'),
  bloodpact: U('Кровавый договор', 'skullring', [['dmg_inc', 20, 30], ['leech', 1.5, 2.5], ['life', -150, -100]], { d: '#% больше урона, но здоровье не восстанавливается само.', v: [20, 30], mods: [['dmg_more', 1], ['ks_noRegen', 0, 1]] }, 'Подписано. Скреплено. Оплачено.'),
  gravecrown: U('Корона могильщика', 'crown', [['minion_extra', 2, 2], ['minion_inc', 40, 60], ['spi', 20, 30], ['sk_minion', 2, 2]], { d: 'Убийство с шансом #% призывает духа-помощника на 12 сек.', v: [25, 35], proc: { on: 'kill', chV: 1, cd: 0.4, act: 'summon', m: 'spirit', dur: 12, max: 6 } }, 'Мёртвые признают только одного короля.'),
  frostheart: U('Сердце зимы', 'core', [['cold_inc', 40, 60], ['pen_cold', 12, 18], ['res_cold', 30, 40]], { d: 'Удары с шансом 20% вызывают ледяную вспышку (#% урона удара).', v: [120, 180], proc: { on: 'hit', ch: 20, cd: 0.5, act: 'nova', type: 'cold', rad: 3.5, ail: { chill: 100, freeze: 50 } } }, 'Оно бьётся раз в столетие.'),
  aegis: U('Эгида рассвета', 'towershield', [['armor_inc', 60, 90], ['block', 8, 12], ['res_all', 10, 15], ['life', 100, 160]], { d: 'Блок вызывает взрыв шипов (#% вашей брони физическим уроном).', v: [100, 160], proc: { on: 'block', ch: 100, cd: 0.4, act: 'armorNova', type: 'phys', rad: 3.4 } }, 'Ни одна тень не пережила рассвет.'),
  venomfang: U('Клык гадюки', 'dagger', [['wdmg_inc', 70, 110], ['add_poison', 40, 70], ['poison_inc', 30, 50], ['atkSpeed_inc', 10, 15]], { d: 'Убитые враги оставляют ядовитое облако (#% урона удара в сек.).', v: [50, 80], proc: { on: 'kill', ch: 100, cd: 0.3, act: 'zone', type: 'poison', rad: 2.6, dur: 5 } }, 'Одной царапины достаточно.'),
  hawkeye: U('Ястребиный глаз', 'bow', [['wdmg_inc', 80, 120], ['crit', 4, 6], ['critMulti', 30, 50], ['proj_extra', 1, 1]], { d: '#% больше урона при полном здоровье.', v: [30, 45], mods: [['fullLife_more', 1]] }, 'Он видит цель ещё до рассвета.'),
  doomhammer: U('Молот рока', 'warhammer', [['wdmg_inc', 100, 150], ['area_inc', 20, 30], ['cc_inc', 40, 60]], { d: 'Удары с шансом 10% обрушивают метеор (#% урона удара).', v: [220, 320], proc: { on: 'hit', ch: 10, cd: 0.8, act: 'meteor', type: 'fire', rad: 3 } }, 'Земля помнит каждый его удар.'),
  voidorb: U('Око пустоты', 'orb', [['dark_inc', 35, 55], ['spell_inc', 25, 40], ['mana', 80, 120]], { d: 'Заклинания с шансом 20% не тратят ману и наносят #% больше урона.', v: [40, 60], proc: { on: 'cast', ch: 20, cd: 0, act: 'freecast' } }, 'Оно смотрит в ответ.'),
  berserkerhelm: U('Шлем берсерка', 'helm', [['armor', 200, 320], ['str', 20, 35], ['atkSpeed_inc', 8, 12]], { d: 'Каждый удар даёт заряд (до 20, 4 сек.): +#% урона за заряд.', v: [2, 3], proc: { on: 'hit', ch: 100, cd: 0.1, act: 'stack', stat: 'dmg_inc', dur: 4, max: 20, name: 'Неистовство' } }, 'Снять его можно только с мертвеца.'),
  // boss-exclusive
  ashcrown: U('Венец Короля пепла', 'crown', [['fire_inc', 50, 80], ['pen_fire', 15, 25], ['res_fire', 35, 45], ['sk_fire', 3, 3]], { d: 'Убитые враги взрываются, нанося #% своего здоровья огнём.', v: [20, 30], proc: { on: 'kill', ch: 100, cd: 0, act: 'explode', type: 'fire', rad: 3 } }, 'Он правил, пока было чему гореть.', 'ashking'),
  deadqueen: U('Поцелуй Королевы мёртвых', 'scepter', [['minion_inc', 60, 90], ['minion_extra', 2, 2], ['dark_inc', 30, 50], ['sk_minion', 2, 3]], { d: '+1 к максимуму существ и #% больше их урона.', v: [40, 60], mods: [['minion_extra', 0, 1], ['minion_more', 1]] }, 'Её свита не знает усталости.', 'deadqueen'),
  frostlord: U('Клинок ледяной пустоши', 'greatsword', [['wdmg_inc', 110, 160], ['conv_cold', 100, 100], ['cold_inc', 40, 60], ['cc_inc', 40, 60]], { d: 'Удары с шансом 25% вызывают ледяную вспышку (#% урона удара).', v: [100, 150], proc: { on: 'hit', ch: 25, cd: 0.5, act: 'nova', at: 'target', type: 'cold', rad: 3, ail: { freeze: 60, chill: 100 } } }, 'Он не тает даже в аду.', 'frostlord'),
  worldeater: U('Чрево Пожирателя', 'soulgem', [['dmg_inc', 20, 30], ['life_inc', 8, 12], ['skill_all', 1, 2]], { d: 'Убийство восстанавливает #% здоровья.', v: [4, 6], proc: { on: 'kill', ch: 100, cd: 0, act: 'heal' } }, 'Оно всё ещё голодно.', 'worldeater'),
  archdemon: U('Коса Архидемона', 'scythe', [['wdmg_inc', 110, 160], ['add_dark', 60, 100], ['leech', 1.5, 2.5], ['crit', 3, 5]], { d: 'Обычные враги ниже #% здоровья погибают мгновенно.', v: [18, 25], mods: [['execute', 1]] }, 'Жатва не знает пощады.', 'archdemon'),
  timekeeper: U('Песочные часы Хранителя', 'talisman', [['cdr', 20, 30], ['castSpeed_inc', 10, 16], ['atkSpeed_inc', 10, 16]], { d: '+#% скорости перезарядки навыков.', v: [20, 30], mods: [['cdr', 1]] }, 'Время — единственная валюта, которую нельзя заработать.', 'timekeeper'),
  bloodgod: U('Сердце Бога крови', 'dragonheart', [['life_inc', 12, 18], ['leech', 2, 3], ['dmg_inc', 15, 25]], { d: '#% больше урона, но на 15% меньше здоровья.', v: [35, 50], mods: [['dmg_more', 1], ['life_more', 0, -15]] }, 'Оно бьётся в такт вашему.', 'bloodgod'),
  ancientone: U('Чешуя Древнего разрушителя', 'plate', [['armor_inc', 90, 140], ['life', 200, 300], ['res_all', 15, 22], ['dr', 4, 6]], { d: 'При получении урона: на 4 сек. −#% получаемого урона (перезарядка 8 сек.).', v: [40, 50], proc: { on: 'hurt', ch: 100, cd: 8, act: 'buff', stat: 'dr', dur: 4, name: 'Древняя чешуя' } }, 'Старше гор, прочнее времени.', 'destroyer'),
};
export const UNIQUE_IDS = Object.keys(UNIQUES);

// Crafting currencies and materials. src = main activity that drops it (see data/activities.js).
export const MATS = {
  dust: { n: 'Пыль распыления', i: 'u_dust', d: 'Получается при разборе предметов. Нужна для большинства операций кузнеца.' },
  chaos: { n: 'Сфера перемен', i: 'u_soulorb', d: 'Полностью меняет аффиксы предмета.' },
  exalt: { n: 'Сфера возвышения', i: 'u_elemcrystal', d: 'Добавляет предмету новый аффикс.' },
  annul: { n: 'Сфера очищения', i: 'u_runeshard', d: 'Удаляет случайный аффикс.' },
  regal: { n: 'Сфера величия', i: 'g_amethyst', d: 'Повышает редкость предмета на одну ступень (до легендарной).' },
  divine: { n: 'Божественная искра', i: 'g_diamond', d: 'Перебрасывает значения всех аффиксов.' },
  whet: { n: 'Точильный камень', i: 'u_whetstone', d: 'Повышает качество предмета (+2% базовых показателей, до 20%).' },
  ember: { n: 'Адское пламя', i: 'u_ember', d: 'Заточка предмета: +4% ко всем его свойствам за уровень (до +10).' },
  shard: { n: 'Осколок башни', i: 'u_essence', d: 'Пробуждение: превращает легендарный предмет в древний.' },
  key: { n: 'Ключ владыки', i: 'u_key2', d: 'Открывает врата в Царство боссов.' },
};

export const RARE_NAMES_A = ['Гибельный', 'Проклятый', 'Забытый', 'Багровый', 'Пепельный', 'Бездонный', 'Скорбный', 'Вечный', 'Кровавый', 'Туманный', 'Грозовой', 'Мёртвый', 'Безмолвный', 'Сумрачный', 'Яростный', 'Хладный', 'Древний', 'Чёрный', 'Алый', 'Призрачный'];
export const RARE_NAMES_B = ['Клык', 'Обет', 'Шёпот', 'Рок', 'Страж', 'Вопль', 'Закат', 'Узник', 'Жнец', 'Осколок', 'Прах', 'Венец', 'Завет', 'Оплот', 'Гнев', 'Плач', 'Пакт', 'Исход', 'Зов', 'Предел'];
