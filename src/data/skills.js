// Active skills (data only). Engine: src/skills.js. Every class can slot any skill; own-class skills get +2 levels.
// t: melee | proj | nova | ground | chain | dash | summon | buff | curse | trap
// wm = % weapon damage (attacks). d = base spell damage by type at skill level 1.
export const SKILLS = {
  // ---------------- Воин
  cleave: { n: 'Рассекающий удар', c: 'warrior', i: 'k_sword', tg: 'attack melee phys aoe', t: 'melee', mana: 0, cd: 0, wm: 140, rng: 2.1, arc: 150, desc: 'Широкий удар по дуге перед собой.' },
  slam: { n: 'Сокрушение', c: 'warrior', i: 'k_hammer', tg: 'attack melee phys aoe', t: 'ground', mana: 18, cd: 3, wm: 260, rad: 2.6, delay: 0.25, range: 2.2, ail: { stun: 60 }, desc: 'Удар по земле оглушает врагов в области.' },
  whirlwind: { n: 'Вихрь клинков', c: 'warrior', i: 'k_whirl', tg: 'attack melee phys aoe', t: 'buff', mana: 28, cd: 6, dur: 3, wm: 70, pulse: { rad: 2.4, every: 0.25 }, mods: [['moveSpeed_inc', 15]], desc: 'Вращаетесь 3 сек., раня всех вокруг. Можно двигаться.' },
  charge: { n: 'Рывок', c: 'warrior', i: 'k_boot', tg: 'attack melee phys aoe move', t: 'dash', mana: 10, cd: 5, dist: 7, wm: 170, end: { rad: 2 }, ail: { stun: 40 }, desc: 'Рывок к цели с ударом по области.' },
  warcry: { n: 'Боевой клич', c: 'warrior', i: 'k_horn', tg: 'buff', t: 'buff', mana: 25, cd: 20, dur: 8, mods: [['dmg_inc', 35], ['armor_inc', 50], ['atkSpeed_inc', 15]], desc: '8 сек.: +35% урона, +50% брони, +15% скорости атаки.' },
  rend: { n: 'Кровавый разрез', c: 'warrior', i: 'k_blood', tg: 'attack melee phys', t: 'melee', mana: 10, cd: 0, wm: 190, rng: 2, arc: 70, ail: { bleed: 100 }, desc: 'Мощный удар, вызывающий кровотечение.' },
  // ---------------- Маг
  fireball: { n: 'Огненный шар', c: 'mage', i: 'k_fireball', tg: 'spell fire proj aoe', t: 'proj', mana: 14, cd: 0, ct: 0.6, d: { fire: [150, 220] }, n1: 1, spd: 12, rad: 0.3, expl: 1.6, ail: { ignite: 30 }, desc: 'Шар огня взрывается при попадании.' },
  frostnova: { n: 'Кольцо льда', c: 'mage', i: 'k_snowflake', tg: 'spell cold aoe', t: 'nova', mana: 22, cd: 4, ct: 0.3, d: { cold: [170, 240] }, rad: 4, ail: { freeze: 60, chill: 100 }, desc: 'Взрыв холода замораживает врагов вокруг.' },
  chainlight: { n: 'Цепная молния', c: 'mage', i: 'k_lightning', tg: 'spell light chain', t: 'chain', mana: 16, cd: 0, ct: 0.55, d: { light: [110, 250] }, jumps: 4, rng: 9, ail: { shock: 40 }, desc: 'Молния перескакивает между врагами.' },
  meteor: { n: 'Метеор', c: 'mage', i: 'k_meteor', tg: 'spell fire aoe', t: 'ground', mana: 35, cd: 5, ct: 0.5, d: { fire: [520, 760] }, rad: 3, delay: 0.9, range: 10, zone: { dur: 3, tick: 0.12, every: 0.5 }, ail: { ignite: 100, stun: 50 }, desc: 'Метеор падает с небес и оставляет горящую землю.' },
  blink: { n: 'Скачок', c: 'mage', i: 'k_star', tg: 'spell move', t: 'dash', mana: 16, cd: 4, dist: 8, blink: 1, desc: 'Мгновенная телепортация.' },
  icelance: { n: 'Ледяное копьё', c: 'mage', i: 'k_iceshard', tg: 'spell cold proj', t: 'proj', mana: 9, cd: 0, ct: 0.42, d: { cold: [95, 140] }, n1: 1, spd: 17, rad: 0.25, pierce: 2, crit: 8, ail: { chill: 60 }, desc: 'Быстрое копьё, пронзающее врагов.' },
  // ---------------- Некромант
  bonespear: { n: 'Костяное копьё', c: 'necro', i: 'k_bone', tg: 'spell phys dark proj', t: 'proj', mana: 12, cd: 0, ct: 0.55, d: { phys: [70, 100], dark: [70, 100] }, n1: 1, spd: 15, rad: 0.3, pierce: 4, crit: 7, desc: 'Пронзает всех на пути.' },
  raiseskel: { n: 'Поднять скелетов', c: 'necro', i: 'k_skull', tg: 'spell minion dark', t: 'summon', mana: 30, cd: 1.5, ct: 0.5, m: 'skel_w', n1: 2, max: 5, desc: 'Призывает скелетов-воинов (постоянные).' },
  skelmage: { n: 'Скелеты-маги', c: 'necro', i: 'k_tome', tg: 'spell minion fire', t: 'summon', mana: 34, cd: 2, ct: 0.5, m: 'skel_m', n1: 1, max: 3, desc: 'Призывает скелетов-магов, мечущих огонь.' },
  boneblast: { n: 'Взрыв костей', c: 'necro', i: 'k_explosion', tg: 'spell phys dark aoe', t: 'ground', mana: 24, cd: 2, ct: 0.5, d: { phys: [130, 190], dark: [130, 190] }, rad: 2.8, delay: 0.35, range: 9, desc: 'Взрыв тёмной энергии в указанной точке.' },
  enfeeble: { n: 'Немощь', c: 'necro', i: 'k_curse', tg: 'spell curse dark aoe', t: 'curse', mana: 20, cd: 3, ct: 0.3, rad: 4, dur: 10, cid: 'weak', range: 10, desc: 'Проклятие: враги наносят на 25% меньше урона и получают на 20% больше.' },
  bonegolem: { n: 'Костяной голем', c: 'necro', i: 'k_fist', tg: 'spell minion phys', t: 'summon', mana: 60, cd: 10, ct: 0.8, m: 'bonegolem', n1: 1, max: 1, desc: 'Призывает могучего голема, отвлекающего врагов.' },
  // ---------------- Ассасин
  backstab: { n: 'Удар из тени', c: 'assassin', i: 'k_dagger', tg: 'attack melee phys', t: 'melee', mana: 6, cd: 0, wm: 165, as: 1.2, rng: 1.9, arc: 80, crit: 12, ail: { poison: 30 }, desc: 'Быстрый удар с высоким шансом крита.' },
  fanknives: { n: 'Веер ножей', c: 'assassin', i: 'k_shuriken', tg: 'attack proj phys poison', t: 'proj', mana: 14, cd: 1.5, wm: 85, n1: 7, spread: 80, spd: 15, rad: 0.25, ail: { poison: 70 }, desc: 'Семь отравленных ножей веером.' },
  shadowstep: { n: 'Шаг сквозь тень', c: 'assassin', i: 'k_shadow', tg: 'spell move dark', t: 'dash', mana: 14, cd: 5, dist: 8, blink: 1, buff: { dur: 4, mods: [['crit', 25], ['critMulti', 40]] }, desc: 'Телепорт. 4 сек.: +25% шанс крита и +40% крит. множителя.' },
  poisontrap: { n: 'Ядовитая ловушка', c: 'assassin', i: 'k_trap', tg: 'spell trap poison aoe', t: 'trap', mana: 16, cd: 0.8, ct: 0.3, d: { poison: [160, 230] }, n1: 1, max: 6, trig: 1.4, rad: 2.6, dur: 20, ail: { poison: 100 }, zone: { dur: 4, tick: 0.2, every: 0.5 }, desc: 'Ловушка взрывается облаком яда.' },
  smoke: { n: 'Дымовая завеса', c: 'assassin', i: 'k_smoke', tg: 'buff', t: 'buff', mana: 20, cd: 14, dur: 5, mods: [['evasion_more', 100], ['moveSpeed_inc', 30], ['dr', 15]], desc: '5 сек.: вдвое больше уклонения, +30% скорости, −15% получаемого урона.' },
  deathmark: { n: 'Метка смерти', c: 'assassin', i: 'k_eye', tg: 'spell curse dark', t: 'curse', mana: 15, cd: 6, ct: 0.2, rad: 2.5, dur: 8, cid: 'mark', range: 10, desc: 'Помеченные враги получают на 35% больше урона.' },
  // ---------------- Паладин
  smite: { n: 'Удар праведника', c: 'paladin', i: 'k_swords', tg: 'attack melee holy aoe', t: 'melee', mana: 0, cd: 0, wm: 135, rng: 2.1, arc: 120, conv: { holy: 60 }, desc: 'Удар, 60% урона которого — святой.' },
  consecrate: { n: 'Освящение', c: 'paladin', i: 'k_sun', tg: 'spell holy aoe dot', t: 'ground', mana: 26, cd: 6, ct: 0.3, d: { holy: [60, 90] }, rad: 3.6, delay: 0, range: 0, zone: { dur: 6, tick: 1, every: 0.5 }, desc: 'Освящает землю под собой на 6 сек.' },
  hammer: { n: 'Молот небес', c: 'paladin', i: 'k_hammer', tg: 'spell holy light aoe', t: 'ground', mana: 24, cd: 3, ct: 0.4, d: { holy: [200, 280], light: [90, 160] }, rad: 2.4, delay: 0.5, range: 10, ail: { stun: 80 }, desc: 'Небесный молот оглушает врагов.' },
  faithshield: { n: 'Щит веры', c: 'paladin', i: 'k_shield', tg: 'buff', t: 'buff', mana: 22, cd: 16, dur: 6, mods: [['block', 25], ['dr', 20], ['res_all', 20]], desc: '6 сек.: +25% блока, −20% получаемого урона, +20% сопротивлений.' },
  holylight: { n: 'Священный свет', c: 'paladin', i: 'k_heart', tg: 'spell holy aoe', t: 'nova', mana: 30, cd: 10, ct: 0.4, d: { holy: [180, 260] }, rad: 4, heal: 30, desc: 'Исцеляет 30% здоровья и обжигает врагов светом.' },
  retaura: { n: 'Аура возмездия', c: 'paladin', i: 'k_banner', tg: 'buff holy', t: 'buff', mana: 30, cd: 25, dur: 12, mods: [['thorns', 400], ['holy_inc', 40], ['attack_inc', 20]], desc: '12 сек.: отражает урон, +40% урона светом, +20% урона атак.' },
  // ---------------- Охотник
  quickshot: { n: 'Быстрый выстрел', c: 'hunter', i: 'k_arrow', tg: 'attack proj phys bow', t: 'proj', mana: 0, cd: 0, wm: 120, n1: 1, spd: 20, rad: 0.2, desc: 'Базовый выстрел без затрат.' },
  volley: { n: 'Залп', c: 'hunter', i: 'k_crossbow', tg: 'attack proj phys bow', t: 'proj', mana: 12, cd: 0, wm: 75, n1: 5, spread: 40, spd: 19, rad: 0.2, desc: 'Пять стрел веером.' },
  piercing: { n: 'Пронзающая стрела', c: 'hunter', i: 'k_spear', tg: 'attack proj phys bow', t: 'proj', mana: 16, cd: 3, wm: 300, n1: 1, spd: 26, rad: 0.35, pierce: 99, crit: 12, desc: 'Мощная стрела проходит сквозь всех врагов.' },
  arrowrain: { n: 'Дождь стрел', c: 'hunter', i: 'k_storm', tg: 'attack phys aoe bow dot', t: 'ground', mana: 24, cd: 5, wm: 45, rad: 3.4, delay: 0.3, range: 11, zone: { dur: 4, tick: 1, every: 0.4 }, desc: 'Стрелы 4 сек. сыплются на область.' },
  snare: { n: 'Капкан', c: 'hunter', i: 'k_trap', tg: 'attack trap phys aoe', t: 'trap', mana: 14, cd: 1, wm: 220, n1: 1, max: 5, trig: 1.3, rad: 2.2, dur: 20, ail: { stun: 100, bleed: 100 }, desc: 'Капкан оглушает и вызывает кровотечение.' },
  roll: { n: 'Кувырок', c: 'hunter', i: 'k_wing', tg: 'move', t: 'dash', mana: 6, cd: 2.5, dist: 5.5, buff: { dur: 3, mods: [['atkSpeed_inc', 25], ['moveSpeed_inc', 20]] }, desc: 'Перекат. 3 сек.: +25% скорости атаки.' },
  // ---------------- Друид
  stormwrath: { n: 'Гнев бури', c: 'druid', i: 'k_storm', tg: 'spell light chain', t: 'chain', mana: 14, cd: 0, ct: 0.6, d: { light: [130, 230] }, jumps: 3, rng: 9, ail: { shock: 50 }, desc: 'Разряд молнии, перескакивающий на соседей.' },
  thorns: { n: 'Терновник', c: 'druid', i: 'k_thorn', tg: 'spell phys poison aoe dot', t: 'ground', mana: 22, cd: 3, ct: 0.4, d: { phys: [40, 60], poison: [40, 60] }, rad: 3, delay: 0.2, range: 10, zone: { dur: 6, tick: 1, every: 0.5, slow: 40 }, ail: { poison: 40, bleed: 40 }, desc: 'Заросли шипов ранят и замедляют врагов 6 сек.' },
  treant: { n: 'Призыв древня', c: 'druid', i: 'k_leaf', tg: 'spell minion phys', t: 'summon', mana: 50, cd: 8, ct: 0.7, m: 'treant', n1: 1, max: 1, desc: 'Древень принимает удары на себя.' },
  wolves: { n: 'Волчья стая', c: 'druid', i: 'k_wolf', tg: 'spell minion phys', t: 'summon', mana: 32, cd: 2, ct: 0.4, m: 'wolf', n1: 2, max: 4, desc: 'Призывает быстрых волков.' },
  stoneskin: { n: 'Каменная кожа', c: 'druid', i: 'k_rock', tg: 'buff', t: 'buff', mana: 24, cd: 18, dur: 8, mods: [['armor_more', 80], ['lifeRegenPct', 4], ['dr', 10]], desc: '8 сек.: +80% брони, 4% здоровья в сек., −10% получаемого урона.' },
  tornado: { n: 'Торнадо', c: 'druid', i: 'k_tornado', tg: 'spell phys light proj aoe', t: 'proj', mana: 26, cd: 4, ct: 0.5, d: { phys: [45, 65], light: [45, 65] }, n1: 1, spd: 5, rad: 1.3, pierce: 99, hitcd: 0.3, life: 4, desc: 'Медленный вихрь многократно ранит всех на пути.' },
  // ---------------- Чернокнижник
  shadowbolt: { n: 'Стрела тьмы', c: 'warlock', i: 'k_spiritflame', tg: 'spell dark proj', t: 'proj', mana: 11, cd: 0, ct: 0.55, d: { dark: [150, 215] }, n1: 1, spd: 13, rad: 0.3, home: 1, desc: 'Самонаводящийся сгусток тьмы.' },
  corruption: { n: 'Порча', c: 'warlock', i: 'k_poison', tg: 'spell curse dark aoe dot', t: 'curse', mana: 18, cd: 1, ct: 0.3, d: { dark: [110, 150] }, rad: 3.2, dur: 8, cid: 'rot', range: 10, desc: 'Враги в области 8 сек. получают урон тьмой каждую секунду.' },
  hellfire: { n: 'Адское пламя', c: 'warlock', i: 'k_flame', tg: 'spell fire dark aoe', t: 'nova', mana: 26, cd: 3, ct: 0.4, d: { fire: [150, 210], dark: [110, 160] }, rad: 4.2, ail: { ignite: 60 }, desc: 'Волна пламени преисподней вокруг вас.' },
  imp: { n: 'Призыв беса', c: 'warlock', i: 'k_claw', tg: 'spell minion fire', t: 'summon', mana: 28, cd: 2, ct: 0.4, m: 'imp', n1: 1, max: 3, desc: 'Бес метает огненные сгустки.' },
  drainlife: { n: 'Похищение жизни', c: 'warlock', i: 'k_chain', tg: 'spell dark chain', t: 'chain', mana: 12, cd: 0, ct: 0.5, d: { dark: [120, 170] }, jumps: 1, rng: 9, leech: 25, desc: 'Вытягивает жизнь: 25% урона лечит вас.' },
  chaosrain: { n: 'Дождь хаоса', c: 'warlock', i: 'k_meteor', tg: 'spell fire dark aoe', t: 'ground', mana: 40, cd: 8, ct: 0.5, d: { fire: [170, 240], dark: [170, 240] }, rad: 2, delay: 0.6, range: 10, multi: 6, scatter: 4, desc: 'Шесть сгустков хаоса падают вокруг точки.' },
  // ---------------- Монах
  palm: { n: 'Удар ладонью', c: 'monk', i: 'k_fist', tg: 'attack melee phys', t: 'melee', mana: 0, cd: 0, wm: 125, as: 1.35, rng: 1.9, arc: 100, desc: 'Очень быстрый удар.' },
  flurry: { n: 'Шквал ударов', c: 'monk', i: 'k_swords', tg: 'attack melee phys', t: 'melee', mana: 12, cd: 2, wm: 75, hits: 5, rng: 2, arc: 110, desc: 'Пять ударов подряд.' },
  chiwave: { n: 'Волна ци', c: 'monk', i: 'k_frostorb', tg: 'spell holy proj aoe', t: 'proj', mana: 18, cd: 2, ct: 0.4, d: { holy: [190, 270] }, n1: 1, spd: 13, rad: 0.9, pierce: 99, life: 0.9, desc: 'Широкая волна энергии проходит сквозь врагов.' },
  dashstrike: { n: 'Стремительный удар', c: 'monk', i: 'k_boot', tg: 'attack melee phys aoe move', t: 'dash', mana: 8, cd: 3, dist: 6, wm: 150, end: { rad: 1.8 }, desc: 'Рывок с ударом в конце.' },
  innerpeace: { n: 'Внутренний покой', c: 'monk', i: 'k_moon', tg: 'buff', t: 'buff', mana: 20, cd: 15, dur: 6, heal: 20, mods: [['dr', 20], ['lifeRegenPct', 3], ['manaRegen_inc', 100]], desc: 'Лечит 20%. 6 сек.: −20% получаемого урона, 3% здоровья в сек.' },
  sevenstars: { n: 'Семь звёзд', c: 'monk', i: 'k_star', tg: 'spell light holy aoe', t: 'nova', mana: 28, cd: 5, ct: 0.3, d: { light: [150, 260], holy: [100, 150] }, rad: 3.8, ail: { shock: 80, stun: 40 }, desc: 'Вспышка энергии оглушает врагов вокруг.' },
  // ---------------- Рыцарь смерти
  deathstrike: { n: 'Удар смерти', c: 'dk', i: 'k_scythe', tg: 'attack melee phys dark aoe', t: 'melee', mana: 0, cd: 0, wm: 145, rng: 2.2, arc: 130, conv: { dark: 50 }, leech: 4, desc: 'Половина урона — тьма. 4% урона лечит вас.' },
  icechains: { n: 'Ледяные оковы', c: 'dk', i: 'k_cross', tg: 'spell cold aoe', t: 'nova', mana: 20, cd: 5, ct: 0.3, d: { cold: [160, 220] }, rad: 4.5, ail: { chill: 100, freeze: 40 }, desc: 'Сковывает холодом всех вокруг.' },
  decay: { n: 'Смерть и разложение', c: 'dk', i: 'k_potion', tg: 'spell dark aoe dot', t: 'ground', mana: 26, cd: 6, ct: 0.3, d: { dark: [70, 100] }, rad: 3.5, delay: 0.1, range: 10, zone: { dur: 7, tick: 1, every: 0.5 }, desc: 'Гниющая земля 7 сек. разъедает врагов.' },
  deathgrip: { n: 'Хватка смерти', c: 'dk', i: 'k_chain', tg: 'spell dark', t: 'chain', mana: 12, cd: 4, ct: 0.25, d: { dark: [120, 170] }, jumps: 3, rng: 11, pull: 1, ail: { stun: 100 }, desc: 'Притягивает до трёх врагов к себе и оглушает.' },
  armydead: { n: 'Армия мёртвых', c: 'dk', i: 'k_skull', tg: 'spell minion dark', t: 'summon', mana: 50, cd: 30, ct: 0.6, m: 'ghoul', n1: 5, max: 5, mdur: 15, desc: 'На 15 сек. поднимает пять упырей.' },
  boneshield: { n: 'Костяной щит', c: 'dk', i: 'k_shieldbash', tg: 'buff', t: 'buff', mana: 22, cd: 18, dur: 10, mods: [['dr', 22], ['thorns', 300], ['armor_inc', 40]], desc: '10 сек.: −22% получаемого урона, отражение урона.' },
};

// Minions summoned by skills. hp/dmg are multiples of the owner's level-scaled base.
export const MINIONS = {
  skel_w: { n: 'Скелет-воин', spr: 's_skel_w', hp: 1.0, dmg: 1.0, spd: 4.2, ai: 'melee', dt: 'phys' },
  skel_m: { n: 'Скелет-маг', spr: 's_skel_m', hp: 0.6, dmg: 1.3, spd: 3.6, ai: 'ranged', dt: 'fire', range: 8 },
  bonegolem: { n: 'Костяной голем', spr: 's_bonegolem', hp: 5, dmg: 2.6, spd: 3.4, ai: 'melee', dt: 'phys', sc: 4, taunt: 1, aoe: 1.8 },
  wolf: { n: 'Волк', spr: 's_wolf', hp: 0.8, dmg: 1.1, spd: 5.6, ai: 'melee', dt: 'phys', atk: 0.7 },
  treant: { n: 'Древень', spr: 's_treant', hp: 6, dmg: 1.8, spd: 3, ai: 'melee', dt: 'phys', sc: 4, taunt: 1, aoe: 1.6 },
  imp: { n: 'Бес', spr: 's_demon', hp: 0.6, dmg: 1.5, spd: 4, ai: 'ranged', dt: 'fire', range: 8 },
  ghoul: { n: 'Упырь', spr: 'm_ghoul', hp: 1.2, dmg: 1.4, spd: 5, ai: 'melee', dt: 'dark' },
  spirit: { n: 'Дух', spr: 's_wisp', hp: 0.5, dmg: 1.2, spd: 5, ai: 'ranged', dt: 'cold', range: 7 },
};
