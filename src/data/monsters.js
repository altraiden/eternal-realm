// Monsters, elite modifiers and biomes. Pure data; AI lives in src/actors.js.
// hp/dmg are multipliers of the tier baseline. ai: melee | ranged | charger | caster | exploder | summoner
const M = (n, spr, hp, dmg, spd, ai, dt, x = {}) => ({ n, spr, hp, dmg, spd, ai, dt, ...x });
export const MONSTERS = {
  // ash wastes
  firehound: M('Огненная гончая', 'm_firehound', 0.8, 0.9, 5.4, 'charger', 'fire', { res: { fire: 50, cold: -20 } }),
  fireele: M('Огненный элементаль', 'm_fireele', 0.9, 1.1, 3.2, 'ranged', 'fire', { res: { fire: 75, cold: -30 }, range: 8 }),
  magmagolem: M('Магмовый голем', 'm_magmagolem', 2.4, 1.5, 2.4, 'melee', 'fire', { res: { fire: 60 }, sc: 4, armor: 2 }),
  fireslime: M('Лавовый слизень', 'm_fireslime', 0.6, 0.8, 3, 'exploder', 'fire', { res: { fire: 60 } }),
  firewyvern: M('Огненная виверна', 'm_firewyvern', 1.3, 1.2, 4.2, 'ranged', 'fire', { res: { fire: 50 }, range: 7, burst: 3 }),
  demonwar: M('Демон-воин', 'm_demonwar', 1.5, 1.3, 3.8, 'melee', 'phys', { res: { fire: 40, dark: 30 } }),
  horned: M('Рогатый демон', 'm_horned', 1.8, 1.4, 3.4, 'charger', 'phys', { res: { fire: 40 } }),
  magmaele: M('Магмовый дух', 'm_magmaele', 1.1, 1.3, 2.8, 'caster', 'fire', { res: { fire: 75 }, range: 9 }),
  // graveyard
  skeleton: M('Скелет', 'm_skeleton', 0.7, 0.8, 3.6, 'melee', 'phys', { res: { poison: 75, holy: -30 } }),
  skelsoldier: M('Скелет-солдат', 'm_skelsoldier', 1.1, 1, 3.4, 'melee', 'phys', { res: { poison: 75, holy: -30 }, armor: 1.5 }),
  skelspear: M('Скелет-копейщик', 'm_skelspear', 0.9, 1.2, 3.6, 'charger', 'phys', { res: { poison: 75, holy: -30 } }),
  skelarcher: M('Скелет-лучник', 's_skel_a', 0.7, 1, 3.2, 'ranged', 'phys', { res: { poison: 75, holy: -30 }, range: 9 }),
  skelmage: M('Скелет-маг', 's_skel_m', 0.7, 1.2, 3, 'caster', 'cold', { res: { poison: 75, holy: -30 }, range: 9 }),
  skelknight: M('Скелет-рыцарь', 'm_skelknight', 2, 1.4, 3, 'melee', 'phys', { res: { poison: 75, holy: -30 }, armor: 2.5 }),
  ghoul: M('Упырь', 'm_ghoul', 1, 1.1, 5, 'melee', 'dark', { res: { dark: 40, holy: -30 } }),
  ghost: M('Призрак', 'm_ghost', 0.7, 1, 3.8, 'ranged', 'dark', { res: { phys: 50, dark: 50, holy: -40 }, range: 6, fly: 1 }),
  zombie: M('Чумной зомби', 'm_zombie', 1.6, 1.1, 2.2, 'exploder', 'poison', { res: { poison: 75 } }),
  vbat: M('Летучая мышь-вампир', 'm_vbat', 0.4, 0.6, 6, 'melee', 'phys', { fly: 1, leech: 1 }),
  bonewolf: M('Костяной волк', 'm_bonewolf', 0.8, 1, 5.6, 'charger', 'phys', { res: { poison: 75 } }),
  reaper: M('Жнец в капюшоне', 'm_reaper', 1.5, 1.6, 3.6, 'melee', 'dark', { res: { dark: 60, holy: -30 }, tp: 1 }),
  vampire: M('Вампир', 'm_vampire', 1.6, 1.3, 4, 'ranged', 'dark', { res: { dark: 50, holy: -40 }, range: 6, leech: 1 }),
  necromancer: M('Некромант', 'm_darksorc', 1.2, 1, 2.8, 'summoner', 'dark', { res: { dark: 50 }, adds: 'skeleton' }),
  // ice
  icegolem: M('Ледяной голем', 'm_icegolem', 2.4, 1.4, 2.4, 'melee', 'cold', { res: { cold: 75, fire: -30 }, sc: 4, armor: 2 }),
  frostspirit: M('Дух мороза', 'm_frostspirit', 0.7, 1.1, 3.6, 'ranged', 'cold', { res: { cold: 75, fire: -30 }, range: 8, fly: 1 }),
  iceele: M('Ледяной элементаль', 'm_iceele', 1.2, 1.2, 2.8, 'caster', 'cold', { res: { cold: 75, fire: -30 }, range: 9 }),
  arcticwolf: M('Полярный волк', 'm_arcticwolf', 0.8, 1, 5.8, 'charger', 'phys', { res: { cold: 40 } }),
  icezombie: M('Мёрзлый мертвец', 'm_icezombie', 1.4, 1.1, 2.6, 'melee', 'cold', { res: { cold: 60, poison: 60 } }),
  icetroll: M('Ледяной тролль', 'm_icetroll', 2.2, 1.6, 3.2, 'melee', 'phys', { res: { cold: 50 }, regen: 2, sc: 4 }),
  frostwyvern: M('Ледяная виверна', 'm_frostwyvern', 1.3, 1.2, 4.2, 'ranged', 'cold', { res: { cold: 60 }, range: 7, burst: 3 }),
  snowgolem: M('Снежный голем', 'm_snowgolem', 1.5, 1, 2.8, 'exploder', 'cold', { res: { cold: 75, fire: -40 } }),
  // swamp
  poisonslime: M('Ядовитый слизень', 'm_poisonslime', 0.7, 0.8, 3, 'melee', 'poison', { res: { poison: 75 }, split: 1 }),
  acidslime: M('Кислотный слизень', 'm_acidslime', 0.6, 1, 3, 'ranged', 'poison', { res: { poison: 75 }, range: 6 }),
  swampzombie: M('Болотный утопленник', 'm_swampzombie', 1.5, 1.2, 2.4, 'melee', 'poison', { res: { poison: 60 } }),
  swamptroll: M('Болотный тролль', 'm_swamptroll', 2.2, 1.5, 3.2, 'melee', 'phys', { res: { poison: 50 }, regen: 2, sc: 4 }),
  mosquito: M('Гигантский комар', 'm_mosquito', 0.35, 0.6, 6.4, 'melee', 'phys', { fly: 1, leech: 1 }),
  spider: M('Гигантский паук', 'm_spider', 1, 1.1, 5, 'charger', 'poison', { res: { poison: 50 } }),
  mudele: M('Грязевой элементаль', 'm_mudele', 1.8, 1.2, 2.6, 'caster', 'phys', { res: { poison: 40 }, range: 8 }),
  venomwyvern: M('Ядовитая виверна', 'm_venomwyvern', 1.3, 1.2, 4.2, 'ranged', 'poison', { res: { poison: 60 }, range: 7, burst: 3 }),
  centipede: M('Сколопендра', 'm_centipede', 0.9, 1, 5.2, 'melee', 'poison', { res: { poison: 50 } }),
  swampwitch: M('Болотная ведьма', 'm_swampwitch', 1.1, 1.2, 3, 'summoner', 'poison', { res: { poison: 50, dark: 30 }, adds: 'poisonslime' }),
  // desert
  scorpion: M('Гигантский скорпион', 'm_scorpion', 1.2, 1.2, 4.4, 'melee', 'poison', { res: { fire: 30 }, armor: 1.5 }),
  sandworm: M('Песчаный червь', 'm_sandworm', 1.6, 1.4, 3, 'charger', 'phys', { res: { fire: 30 }, sc: 4 }),
  sandgolem: M('Песчаный голем', 'm_sandgolem', 2.3, 1.4, 2.4, 'melee', 'phys', { res: { fire: 40, light: 40 }, sc: 4, armor: 2 }),
  sandele: M('Песчаный дух', 'm_sandele', 1, 1.1, 3.2, 'caster', 'phys', { res: { light: 40 }, range: 9 }),
  sandwyvern: M('Песчаная виверна', 'm_sandwyvern', 1.3, 1.2, 4.2, 'ranged', 'fire', { res: { fire: 50 }, range: 7, burst: 3 }),
  scimitar: M('Пустынный разбойник', 'm_scimitar', 1, 1.2, 4.6, 'melee', 'phys', {}),
  beetle: M('Жук-скарабей', 'm_beetle', 0.5, 0.7, 5, 'melee', 'phys', { armor: 2 }),
  boneserpent: M('Костяной змей', 'm_boneserpent', 1.1, 1.2, 4, 'ranged', 'poison', { res: { poison: 75 }, range: 7 }),
  // abyss
  eyeball: M('Око бездны', 'm_eyeball', 0.9, 1.2, 3, 'ranged', 'dark', { res: { dark: 60 }, range: 9, fly: 1 }),
  floateye: M('Парящий глаз', 'm_floateye', 0.7, 1.1, 3.4, 'caster', 'light', { res: { light: 60 }, range: 9, fly: 1 }),
  tentacle: M('Щупальцевик', 'm_tentacle', 1.6, 1.3, 2.8, 'melee', 'dark', { res: { dark: 50 } }),
  wingeye: M('Крылатое око', 'm_wingeye', 0.5, 0.8, 6, 'melee', 'dark', { fly: 1 }),
  tenteye: M('Созерцатель', 'm_tenteye', 1.4, 1.3, 2.6, 'summoner', 'dark', { res: { dark: 60 }, adds: 'wingeye', fly: 1 }),
  wingdemon: M('Крылатый демон', 'm_wingdemon', 1.4, 1.3, 4.6, 'charger', 'fire', { res: { fire: 40, dark: 40 }, fly: 1 }),
  demonknight: M('Рыцарь бездны', 'm_demonknight', 2.2, 1.5, 3.2, 'melee', 'dark', { res: { dark: 50, fire: 30 }, armor: 2.5 }),
  darksorc: M('Тёмный колдун', 'm_darksorc', 1, 1.4, 3, 'caster', 'dark', { res: { dark: 60 }, range: 9, tp: 1 }),
  gargoyle: M('Горгулья', 'm_gargoyle', 1.6, 1.3, 4.4, 'charger', 'phys', { res: { phys: 30 }, armor: 3, fly: 1 }),
  shadowhound: M('Гончая теней', 's_hound', 0.9, 1.1, 6, 'charger', 'dark', { res: { dark: 50 } }),
  // greenskin caves
  goblin: M('Гоблин', 'm_goblin', 0.6, 0.8, 4.6, 'melee', 'phys', {}),
  gobarcher: M('Гоблин-лучник', 'm_gobarcher', 0.5, 0.9, 4, 'ranged', 'phys', { range: 9 }),
  gobshaman: M('Гоблин-шаман', 'm_gobshaman', 0.8, 1.1, 3.4, 'caster', 'light', { range: 9 }),
  gobbrute: M('Гоблин-громила', 'm_gobbrute', 1.6, 1.3, 3.4, 'melee', 'phys', { armor: 1.5 }),
  bombgoblin: M('Гоблин-подрывник', 'm_bombgoblin', 0.5, 1.2, 5, 'exploder', 'fire', {}),
  orc: M('Орк-воин', 'm_orc', 1.5, 1.3, 3.8, 'melee', 'phys', { armor: 1.5 }),
  orcarcher: M('Орк-лучник', 'm_orcarcher', 1, 1.2, 3.6, 'ranged', 'phys', { range: 9 }),
  orcshaman: M('Орк-шаман', 'm_orcshaman', 1.1, 1.1, 3, 'summoner', 'light', { adds: 'goblin' }),
  orcberserk: M('Орк-берсерк', 'm_orcberserk', 1.3, 1.6, 4.8, 'charger', 'phys', {}),
  cavetroll: M('Пещерный тролль', 'm_cavetroll', 2.6, 1.7, 3, 'melee', 'phys', { regen: 2, sc: 4 }),
  ogre: M('Огр', 'm_ogre', 2.8, 1.8, 2.8, 'caster', 'phys', { sc: 4, range: 6 }),
  werewolf: M('Оборотень', 'm_werewolf', 1.6, 1.4, 5.6, 'charger', 'phys', {}),
  stonegolem: M('Каменный голем', 'm_stonegolem', 2.6, 1.4, 2.4, 'melee', 'phys', { res: { phys: 30, light: 50 }, sc: 4, armor: 3 }),
  crystalgolem: M('Кристальный голем', 'm_crystalgolem', 2, 1.4, 2.6, 'caster', 'light', { res: { light: 60, cold: 40 }, sc: 4, range: 8 }),
  stormele: M('Грозовой элементаль', 'm_stormele', 1, 1.3, 3.6, 'ranged', 'light', { res: { light: 75 }, range: 8, fly: 1 }),
  mimic: M('Мимик', 'm_mimic', 3, 1.6, 4.4, 'melee', 'phys', { rich: 1 }),
};

// Elite modifiers (magic packs get 1, rare monsters get 2-3).
export const ELITE_MODS = {
  fast: { n: 'Стремительный', spd: 1.4 },
  tanky: { n: 'Исполин', hp: 1.8, sc: 1.2 },
  berserk: { n: 'Яростный', dmg: 1.45 },
  firedeath: { n: 'Пылающий', deathNova: 'fire', onhit: 'ignite' },
  frostdeath: { n: 'Леденящий', deathNova: 'cold', onhit: 'chill' },
  vampiric: { n: 'Вампир', leech: 1 },
  mortar: { n: 'Бомбардир', mortar: 1 },
  teleport: { n: 'Скачущий', tp: 1 },
  shielded: { n: 'Неуязвимый', shield: 1 },
  trail: { n: 'Чумной', trail: 'poison' },
  storm: { n: 'Грозовой', storm: 1 },
  summoner: { n: 'Призывающий', spawn: 1 },
};
export const ELITE_IDS = Object.keys(ELITE_MODS);

// Biomes: palette + decor + monster pools.  decor: [sprite, weight, solid, scale, light colour]
export const BIOMES = {
  ash: {
    n: 'Пепельные пустоши', floor: ['#3a2a26', '#43302a', '#352420'], wall: ['#221614', '#150d0c'], accent: '#ff6a2a', void: '#0c0605', ambient: 0.62, dmg: 'fire',
    decor: [['d_boulder', 5, 1, 3], ['d_deadtree', 4, 1, 4], ['d_firepillar', 1.5, 1, 3, '#ff7a2a'], ['d_skull', 2, 0, 2], ['d_animalskull', 2, 0, 2.5], ['d_brazier', 1, 1, 3, '#ff8a3a'], ['d_column', 1, 1, 4]],
    mobs: ['firehound', 'fireele', 'magmagolem', 'fireslime', 'firewyvern', 'demonwar', 'horned', 'magmaele'], bosses: ['ashking', 'destroyer', 'archdemon'],
  },
  grave: {
    n: 'Мёртвый погост', floor: ['#2b2f33', '#30353a', '#262a2e'], wall: ['#181b1f', '#0e1013'], accent: '#8fd0c0', void: '#06080a', ambient: 0.72, dmg: 'dark',
    decor: [['d_tombstone', 8, 1, 3], ['d_deadtree', 4, 1, 4], ['d_coffin', 2, 1, 3], ['d_sarcophagus', 1, 1, 3], ['d_skull', 3, 0, 2], ['d_lantern', 1.2, 1, 3, '#ffb060'], ['d_gargstatue', 1, 1, 4], ['d_column', 1.5, 1, 4]],
    mobs: ['skeleton', 'skelsoldier', 'skelspear', 'skelarcher', 'skelmage', 'skelknight', 'ghoul', 'ghost', 'zombie', 'vbat', 'bonewolf', 'reaper', 'vampire', 'necromancer'], bosses: ['deadqueen', 'bonedragon', 'bloodgod', 'timekeeper'],
  },
  ice: {
    n: 'Ледяная пустошь', floor: ['#5d7286', '#667b90', '#56697c'], wall: ['#3b4c5e', '#2a3745'], accent: '#aee6ff', void: '#0a1016', ambient: 0.45, dmg: 'cold',
    decor: [['d_icecrystal', 5, 1, 3, '#7fd4ff'], ['d_snowpine', 6, 1, 4], ['d_boulder', 3, 1, 3], ['d_icicle', 3, 1, 3], ['d_crystalpillar', 1.5, 1, 4, '#7fd4ff'], ['d_animalskull', 1.5, 0, 2.5]],
    mobs: ['icegolem', 'frostspirit', 'iceele', 'arcticwolf', 'icezombie', 'icetroll', 'frostwyvern', 'snowgolem'], bosses: ['frostlord', 'bonedragon', 'timekeeper'],
  },
  swamp: {
    n: 'Гиблые топи', floor: ['#27341f', '#2c3a22', '#222e1b'], wall: ['#152012', '#0c140a'], accent: '#8be04a', void: '#050a04', ambient: 0.68, dmg: 'poison',
    decor: [['d_mushtree', 4, 1, 4], ['d_mushroom', 4, 0, 2.5, '#6bd0a0'], ['d_bramble', 4, 1, 3], ['d_deadtree', 3, 1, 4], ['d_cocoon', 2, 1, 3], ['d_web', 2, 0, 3], ['d_spirittree', 1, 1, 5, '#b080ff'], ['d_boulder', 2, 1, 3]],
    mobs: ['poisonslime', 'acidslime', 'swampzombie', 'swamptroll', 'mosquito', 'spider', 'mudele', 'venomwyvern', 'centipede', 'swampwitch'], bosses: ['hydra', 'slimeking', 'deadqueen'],
  },
  desert: {
    n: 'Пески забвения', floor: ['#8a7046', '#94794c', '#806840'], wall: ['#5c4a2c', '#40331e'], accent: '#ffd27a', void: '#120d06', ambient: 0.35, dmg: 'fire',
    decor: [['d_cactus', 6, 1, 3], ['d_animalskull', 4, 0, 2.5], ['d_boulder', 4, 1, 3], ['d_column', 3, 1, 4], ['d_obelisk', 1.5, 1, 4], ['d_urn', 2, 1, 2.5], ['d_pillar', 1.5, 1, 4]],
    mobs: ['scorpion', 'sandworm', 'sandgolem', 'sandele', 'sandwyvern', 'scimitar', 'beetle', 'boneserpent'], bosses: ['destroyer', 'warlord', 'timekeeper'],
  },
  abyss: {
    n: 'Чертоги бездны', floor: ['#241a33', '#2a1f3b', '#1f162c'], wall: ['#130d1d', '#0a0611'], accent: '#b06bff', void: '#040208', ambient: 0.78, dmg: 'dark',
    decor: [['d_runepillar', 3, 1, 4, '#b06bff'], ['d_runeobelisk', 3, 1, 4, '#8f6bff'], ['d_crystal', 4, 1, 3, '#b06bff'], ['d_sigil', 2, 0, 2.5], ['d_gargstatue', 2, 1, 4], ['d_cage', 1.5, 1, 3], ['d_runestone', 3, 1, 3]],
    mobs: ['eyeball', 'floateye', 'tentacle', 'wingeye', 'tenteye', 'wingdemon', 'demonknight', 'darksorc', 'gargoyle', 'shadowhound'], bosses: ['worldeater', 'archdemon', 'bloodgod'],
  },
  cave: {
    n: 'Орочьи пещеры', floor: ['#3a352e', '#403a32', '#34302a'], wall: ['#24211c', '#161412'], accent: '#ffb060', void: '#080706', ambient: 0.7, dmg: 'phys',
    decor: [['d_boulder', 6, 1, 3], ['d_crystal', 2, 1, 3, '#7fd4ff'], ['d_barrel', 3, 1, 2.5], ['d_crate', 3, 1, 2.5], ['d_bonfire', 1.2, 1, 3, '#ff8a3a'], ['d_banner', 2, 1, 3], ['d_mushroom', 3, 0, 2.5], ['d_cage', 1, 1, 3]],
    mobs: ['goblin', 'gobarcher', 'gobshaman', 'gobbrute', 'bombgoblin', 'orc', 'orcarcher', 'orcshaman', 'orcberserk', 'cavetroll', 'ogre', 'werewolf', 'stonegolem', 'crystalgolem', 'stormele'], bosses: ['warlord', 'slimeking', 'hydra'],
  },
};
export const BIOME_IDS = Object.keys(BIOMES);
