// Passive tree: 500 nodes generated deterministically from themed pools (10 starts, ~400 small, ~70 notables, 20 keystones).
import { mulberry } from '../util.js';

export const TREE_ORDER = ['warrior', 'paladin', 'dk', 'necro', 'warlock', 'mage', 'druid', 'monk', 'hunter', 'assassin'];

const P = {
  str: [['str', 10], ['life', 45], ['armor_inc', 12], ['phys_inc', 10], ['melee_inc', 10], ['attack_inc', 8], ['life_inc', 4], ['block', 2], ['atkSpeed_inc', 4], ['cc_inc', 10], ['res_all', 4], ['vit', 10], ['lifeRegen', 8]],
  int: [['int', 10], ['mana', 40], ['spell_inc', 10], ['elem_inc', 8], ['fire_inc', 12], ['cold_inc', 12], ['light_inc', 12], ['castSpeed_inc', 4], ['manaRegen_inc', 15], ['crit_inc', 12], ['area_inc', 6], ['mana_inc', 6]],
  dex: [['dex', 10], ['evasion_inc', 12], ['atkSpeed_inc', 4], ['crit_inc', 12], ['critMulti', 10], ['proj_inc', 10], ['moveSpeed_inc', 3], ['poison_inc', 12], ['attack_inc', 8], ['ailChance', 8], ['luck', 8]],
  spi: [['spi', 10], ['minion_inc', 12], ['minionLife_inc', 12], ['dark_inc', 12], ['dot_inc', 10], ['duration_inc', 8], ['life', 45], ['lifeRegen', 8], ['holy_inc', 12], ['res_all', 4], ['cdr', 3]],
};
const THEME = {
  warrior: ['str', 'str', 'str', 'dex'], paladin: ['str', 'str', 'spi'], dk: ['str', 'spi', 'spi'], necro: ['spi', 'spi', 'int'], warlock: ['int', 'spi', 'spi'],
  mage: ['int', 'int', 'int'], druid: ['int', 'spi', 'str'], monk: ['dex', 'str', 'dex'], hunter: ['dex', 'dex', 'dex'], assassin: ['dex', 'dex', 'int'],
};
const NA = ['Закалка', 'Натиск', 'Воля', 'Хватка', 'Ярость', 'Прозрение', 'Стойкость', 'Мастерство', 'Гнев', 'Сосредоточение', 'Бдительность', 'Безжалостность', 'Наследие', 'Клятва', 'Инстинкт', 'Дар'];
const NB = ['ветерана', 'бури', 'чемпиона', 'пустоты', 'предков', 'охотника', 'титана', 'мудреца', 'теней', 'зари', 'пепла', 'глубин', 'вожака', 'стража', 'палача', 'пророка'];

const KEYSTONES = [
  ['Неудержимый', 'Вы не можете уклоняться. На 50% больше брони, −8% получаемого урона.', [['ks_noEvade', 1], ['armor_more', 50], ['dr', 8]]],
  ['Кровавая ярость', 'До 50% больше урона по мере потери здоровья. На 10% меньше здоровья.', [['ks_berserk', 50], ['life_more', -10]]],
  ['Бастион', 'Максимум блока 75%. +10% блока. На 12% меньше урона.', [['ks_blockCap', 1], ['block', 10], ['dmg_more', -12]]],
  ['Решимость', 'Вы не наносите критических ударов. На 32% больше урона.', [['ks_noCrit', 1], ['dmg_more', 32]]],
  ['Вампир', 'Вдвое больше вампиризма. Здоровье не восстанавливается само.', [['leech_more', 100], ['ks_noRegen', 1], ['leech', 0.5]]],
  ['Колосс', 'На 25% больше здоровья. −10% скорости передвижения.', [['life_more', 25], ['moveSpeed_inc', -10]]],
  ['Повелитель мёртвых', 'Существа наносят на 60% больше урона. Вы сами — на 40% меньше.', [['minion_more', 60], ['dmg_more', -40]]],
  ['Узы смерти', '+3 к максимуму существ. −30% здоровья существ.', [['minion_extra', 3], ['minionLife_inc', -30]]],
  ['Магия крови', 'Навыки тратят здоровье вместо маны. На 15% больше здоровья.', [['ks_blood', 1], ['life_more', 15]]],
  ['Медленная смерть', 'На 70% больше периодического урона. Вы не наносите критических ударов.', [['dot_more', 70], ['ks_noCrit', 1]]],
  ['Щит разума', '35% получаемого урона сначала тратит ману. На 20% больше маны, на 15% меньше здоровья.', [['ks_mind', 35], ['mana_more', 20], ['life_more', -15]]],
  ['Аватар огня', 'Весь ваш урон становится огненным. +40% урона огнём.', [['ks_allFire', 1], ['fire_inc', 40]]],
  ['Единство со стихиями', 'На 25% больше стихийного урона, +15% сопротивлений. −50% физического урона.', [['elem_more', 25], ['res_all', 15], ['phys_inc', -50]]],
  ['Вечный поток', 'Вдвое больше восстановления маны, +20% перезарядки. Навыки на 40% дороже.', [['manaRegen_more', 100], ['cdr', 20], ['cost_more', 40]]],
  ['Призрачный танец', 'На 50% больше уклонения. На 60% меньше брони, блок невозможен.', [['evasion_more', 50], ['armor_more', -60], ['block', -100]]],
  ['Стремительность', 'На 20% больше скорости атак и заклинаний. На 10% меньше урона.', [['speed_more', 20], ['dmg_more', -10]]],
  ['Скорострел', '+1 дополнительный снаряд. На 12% меньше урона снарядов.', [['proj_extra', 1], ['proj_more', -12]]],
  ['Дальнобойность', 'На 22% больше урона снарядов, +40% их скорости. −30% области действия.', [['proj_more', 22], ['projSpeed_inc', 40], ['area_inc', -30]]],
  ['Стеклянная пушка', 'На 40% больше урона. На 30% меньше здоровья.', [['dmg_more', 40], ['life_more', -30]]],
  ['Совершенное убийство', '+100% крит. множителя. −40% к шансу крит. удара.', [['critMulti', 100], ['crit_inc', -40]]],
];

function build() {
  const r = mulberry(1337);
  const nodes = [];
  const rings = [[10, 190], [20, 290], [40, 395], [60, 510], [80, 635], [90, 765], [100, 900], [80, 1040], [20, 1185]];
  const ringNodes = [];
  rings.forEach(([count, rad], k) => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      const ang = ((i + (k % 2 ? 0.5 : 0)) / count) * Math.PI * 2 + (k === 0 ? Math.PI / 10 : 0);
      const a = ((ang % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const sector = Math.min(9, Math.floor(a / (Math.PI * 2 / 10)));
      const cls = TREE_ORDER[sector];
      const jitter = k === 0 || k === 8 ? 0 : (r() - 0.5) * 34;
      const node = { id: nodes.length, x: Math.cos(ang) * (rad + jitter), y: Math.sin(ang) * (rad + jitter), ring: k, cls, links: [], type: 'small', n: '', mods: [] };
      if (k === 0) {
        node.type = 'start'; node.n = 'Начало пути'; node.mods = [[P[THEME[cls][0]][0][0], 15], ['life', 60]];
      } else if (k === 8) {
        const ks = KEYSTONES[i]; node.type = 'key'; node.n = ks[0]; node.desc = ks[1]; node.mods = ks[2];
      } else {
        const pool = P[THEME[cls][Math.floor(r() * THEME[cls].length)]];
        const notable = k >= 2 && i % 6 === 3;
        const m1 = pool[Math.floor(r() * pool.length)];
        if (notable) {
          let m2 = pool[Math.floor(r() * pool.length)];
          while (m2[0] === m1[0]) m2 = pool[Math.floor(r() * pool.length)];
          node.type = 'notable'; node.mods = [[m1[0], m1[1] * 2.5], [m2[0], m2[1] * 2]];
          node.n = NA[Math.floor(r() * NA.length)] + ' ' + NB[Math.floor(r() * NB.length)];
        } else node.mods = [[m1[0], m1[1]]];
      }
      nodes.push(node); arr.push(node);
    }
    ringNodes.push(arr);
  });
  const link = (a, b) => { if (a !== b && !a.links.includes(b.id)) { a.links.push(b.id); b.links.push(a.id); } };
  ringNodes.forEach((arr, k) => {
    if (k === 0 || k === 8) return;
    const group = k <= 2 ? 0 : 5 + (k % 3);
    arr.forEach((n, i) => { if (!group || i % group !== group - 1) link(n, arr[(i + 1) % arr.length]); });
  });
  for (let k = 1; k < ringNodes.length; k++) {
    for (const n of ringNodes[k]) {
      let best = null, bd = 1e9;
      for (const m of ringNodes[k - 1]) { const d = Math.hypot(n.x - m.x, n.y - m.y); if (d < bd) { bd = d; best = m; } }
      link(n, best);
    }
  }
  return nodes;
}
export const TREE = build();
export const startNode = (cls) => TREE.find((n) => n.type === 'start' && n.cls === cls).id;
