// Core definitions: damage types, rarities, slots, stat display.
export const DT = ['phys', 'fire', 'cold', 'light', 'poison', 'dark', 'holy'];
export const DTN = { phys: 'физ.', fire: 'огонь', cold: 'холод', light: 'молния', poison: 'яд', dark: 'тьма', holy: 'свет' };
export const DTC = { phys: '#e8e0d0', fire: '#ff7a2a', cold: '#7fd4ff', light: '#ffe95e', poison: '#7be04a', dark: '#b06bff', holy: '#fff2a8' };

export const RAR = [
  { n: 'Обычный', c: '#c9c9c9', aff: 0, pow: 0, mult: 1, minRoll: 0, w: 46 },
  { n: 'Магический', c: '#6f8fff', aff: 2, pow: 0, mult: 1, minRoll: 0, w: 34 },
  { n: 'Редкий', c: '#ffe45e', aff: 4, pow: 0, mult: 1, minRoll: 0, w: 15 },
  { n: 'Эпический', c: '#c56bff', aff: 5, pow: 0, mult: 1.05, minRoll: 0.1, w: 3.6 },
  { n: 'Легендарный', c: '#ff8a2a', aff: 5, pow: 1, mult: 1.1, minRoll: 0.2, w: 0.8 },
  { n: 'Уникальный', c: '#d2a25e', aff: 0, pow: 0, mult: 1, minRoll: 0, w: 0.4 },
  { n: 'Древний', c: '#ff4d4d', aff: 6, pow: 1, mult: 1.25, minRoll: 0.35, w: 0.12 },
  { n: 'Мифический', c: '#36e0c8', aff: 6, pow: 1, mult: 1.4, minRoll: 0.6, w: 0.03 },
  { n: 'Божественный', c: '#fff3b0', aff: 6, pow: 2, mult: 1.55, minRoll: 0.85, w: 0.006 },
];

export const SLOTS = [
  ['helm', 'Шлем', 'helm'], ['amulet', 'Амулет', 'amulet'], ['relic', 'Реликвия', 'relic'],
  ['mainhand', 'Оружие', 'mainhand'], ['chest', 'Нагрудник', 'chest'], ['offhand', 'Левая рука', 'offhand'],
  ['gloves', 'Перчатки', 'gloves'], ['belt', 'Пояс', 'belt'], ['ring1', 'Кольцо', 'ring'],
  ['boots', 'Обувь', 'boots'], ['artifact', 'Артефакт', 'artifact'], ['ring2', 'Кольцо', 'ring'],
];
export const SLOT_NAME = { helm: 'Шлем', chest: 'Нагрудник', gloves: 'Перчатки', boots: 'Обувь', belt: 'Пояс', amulet: 'Амулет', ring: 'Кольцо', mainhand: 'Оружие', offhand: 'Левая рука', relic: 'Реликвия', artifact: 'Артефакт' };

export const ATTRS = [['str', 'Сила'], ['dex', 'Ловкость'], ['int', 'Интеллект'], ['vit', 'Живучесть'], ['spi', 'Дух'], ['luck', 'Удача']];

// stat -> display template ('#' is the value). Stats ending with _more are multiplicative.
export const STAT = {
  str: '+# к силе', dex: '+# к ловкости', int: '+# к интеллекту', vit: '+# к живучести', spi: '+# к духу', luck: '+# к удаче', allAttr: '+# ко всем характеристикам',
  life: '+# к здоровью', life_inc: '+#% здоровья', mana: '+# к мане', mana_inc: '+#% маны',
  lifeRegen: '+# здоровья в секунду', lifeRegenPct: '+#% здоровья в секунду', manaRegen_inc: '+#% восстановления маны',
  armor: '+# к броне', armor_inc: '+#% брони', evasion: '+# к уклонению', evasion_inc: '+#% уклонения',
  block: '+#% шанс блока', dr: '+#% снижения получаемого урона',
  res_fire: '+#% сопр. огню', res_cold: '+#% сопр. холоду', res_light: '+#% сопр. молнии', res_poison: '+#% сопр. яду', res_dark: '+#% сопр. тьме', res_holy: '+#% сопр. свету', res_all: '+#% ко всем сопротивлениям',
  pen_all: 'Пробивает #% сопротивлений', pen_fire: 'Пробивает #% сопр. огню', pen_cold: 'Пробивает #% сопр. холоду', pen_light: 'Пробивает #% сопр. молнии', pen_dark: 'Пробивает #% сопр. тьме',
  dmg_inc: '+#% урона', phys_inc: '+#% физического урона', fire_inc: '+#% урона огнём', cold_inc: '+#% урона холодом', light_inc: '+#% урона молнией', poison_inc: '+#% урона ядом', dark_inc: '+#% урона тьмой', holy_inc: '+#% урона светом', elem_inc: '+#% стихийного урона',
  attack_inc: '+#% урона атак', spell_inc: '+#% урона заклинаний', melee_inc: '+#% урона в ближнем бою', proj_inc: '+#% урона снарядов', aoe_inc: '+#% урона по области', dot_inc: '+#% периодического урона', minion_inc: '+#% урона призванных существ',
  wdmg_inc: '+#% урона оружия',
  add_phys: '+# физического урона', add_fire: '+# урона огнём', add_cold: '+# урона холодом', add_light: '+# урона молнией', add_poison: '+# урона ядом', add_dark: '+# урона тьмой', add_holy: '+# урона светом',
  atkSpeed_inc: '+#% скорости атаки', castSpeed_inc: '+#% скорости заклинаний', moveSpeed_inc: '+#% скорости передвижения',
  crit: '+#% шанс крит. удара', crit_inc: '+#% к шансу крит. удара', critMulti: '+#% крит. множителя',
  leech: '#% урона восполняет здоровье', lifeOnKill: '+# здоровья за убийство', manaOnKill: '+# маны за убийство', lifeOnHit: '+# здоровья за удар',
  cdr: '+#% скорости перезарядки', cost_inc: '#% стоимости навыков', area_inc: '+#% области действия', projSpeed_inc: '+#% скорости снарядов', proj_extra: '+# дополнительных снарядов', duration_inc: '+#% длительности эффектов',
  minionLife_inc: '+#% здоровья существ', minion_extra: '+# к максимуму существ',
  cc_inc: '+#% силы эффектов контроля', ailChance: '+#% шанс наложить стихийный эффект',
  bossDmg_inc: '+#% урона по боссам', eliteDmg_inc: '+#% урона по элите',
  mf: '+#% редкости предметов', gf: '+#% найденного золота', xp_inc: '+#% опыта',
  skill_all: '+# к уровню всех навыков', sk_fire: '+# к навыкам огня', sk_cold: '+# к навыкам холода', sk_light: '+# к навыкам молнии', sk_phys: '+# к физическим навыкам', sk_dark: '+# к навыкам тьмы', sk_holy: '+# к навыкам света', sk_poison: '+# к навыкам яда', sk_minion: '+# к навыкам призыва',
  conv_fire: '#% физ. урона становится огнём', conv_cold: '#% физ. урона становится холодом', conv_light: '#% физ. урона становится молнией', conv_dark: '#% физ. урона становится тьмой',
  thorns: 'Отражает # урона атакующим',
  dmg_more: '#% больше урона', life_more: '#% больше здоровья', mana_more: '#% больше маны', armor_more: '#% больше брони', evasion_more: '#% больше уклонения', minion_more: '#% больше урона существ', elem_more: '#% больше стихийного урона', proj_more: '#% больше урона снарядов', dot_more: '#% больше периодического урона', regen_more: '#% больше восстановления здоровья', leech_more: '#% больше вампиризма', speed_more: '#% больше скорости действий', manaRegen_more: '#% больше восстановления маны', cost_more: '#% больше стоимости навыков',
  lowLife_more: '#% больше урона при здоровье ниже 35%', fullLife_more: '#% больше урона при полном здоровье', ail_more: '#% больше урона по целям с эффектами',
  execute: 'Добивает обычных врагов ниже #% здоровья',
  ks_blood: 'Навыки тратят здоровье вместо маны', ks_noCrit: 'Вы не наносите критических ударов', ks_noEvade: 'Вы не можете уклоняться', ks_mind: '#% получаемого урона сначала тратит ману',
  ks_berserk: 'До #% больше урона по мере потери здоровья', ks_allFire: 'Весь ваш урон становится огненным', ks_noRegen: 'Здоровье не восстанавливается само', ks_blockCap: 'Максимум блока повышен до 75%',
};

export function statLine(stat, v) {
  const t = STAT[stat] || stat + ' #';
  let val = Math.abs(v) >= 10 || Number.isInteger(v) ? Math.round(v) : Math.round(v * 10) / 10;
  if (stat.endsWith('_more')) {
    if (val < 0) return t.replace('#%', -val + '%').replace('больше', 'меньше');
    return t.replace('#', val);
  }
  if (!t.includes('#')) return t;
  if (t.startsWith('+#') && val < 0) return t.replace('+#', val);
  return t.replace('#', val);
}
