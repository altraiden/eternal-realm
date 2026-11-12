// Bosses: data-driven phase scripts interpreted by the boss engine in src/actors.js.
// Actions: chase, burst, aimed, slam, line, summon, spiral, tp, nova, ring, rain, enrage, wait.
// m = damage multiplier of the boss baseline; w = pause after the action (sec).
const B = (n, title, spr, biome, hp, dmg, spd, dt, res, uniq, phases, x = {}) => ({ n, title, spr, biome, hp, dmg, spd, dt, res, uniq, phases, sc: 6, ...x });
export const BOSSES = {
  ashking: B('Король пепла', 'Владыка сгоревшего трона', 'b_firedemon', 'ash', 55, 1.5, 3.2, 'fire', { fire: 75, cold: -25 }, 'ashcrown', [
    { at: 1, pat: [{ a: 'chase', t: 3 }, { a: 'aimed', n: 3, spread: 24, rep: 3, gap: 0.3, spd: 10, m: 0.8 }, { a: 'slam', n: 1, rad: 3, delay: 0.9, m: 1.7, zone: { dur: 5, m: 0.25 } }, { a: 'burst', n: 14, spd: 6, waves: 2, gap: 0.6, rot: 13, m: 0.7 }] },
    { at: 0.6, say: 'Гори!', pat: [{ a: 'nova', rad: 6.5, delay: 1.3, m: 2.4 }, { a: 'chase', t: 2.5 }, { a: 'rain', t: 4, rate: 0.3, rad: 2, delay: 0.9, m: 1.3, scatter: 6, zone: { dur: 3, m: 0.2 } }, { a: 'spiral', t: 3.5, arms: 3, spd: 5.5, rate: 0.14, m: 0.6 }, { a: 'summon', m: 'fireslime', n: 4 }] },
    { at: 0.25, say: 'Весь мир — зола!', pat: [{ a: 'enrage', spd: 1.3, dmg: 1.2 }, { a: 'ring', inner: 3.5, outer: 13, delay: 1.5, m: 2.6 }, { a: 'burst', n: 20, spd: 7, waves: 4, gap: 0.4, rot: 9, m: 0.7 }, { a: 'chase', t: 3 }, { a: 'slam', n: 3, rad: 2.6, delay: 0.8, m: 1.6, scatter: 4, zone: { dur: 5, m: 0.25 } }] },
  ]),
  deadqueen: B('Королева мёртвых', 'Невеста могильного холода', 'b_vampcountess', 'grave', 50, 1.4, 3.6, 'dark', { dark: 75, holy: -30 }, 'deadqueen', [
    { at: 1, pat: [{ a: 'summon', m: 'skeleton', n: 5 }, { a: 'aimed', n: 5, spread: 50, rep: 2, gap: 0.5, spd: 9, m: 0.8 }, { a: 'tp', to: 'random' }, { a: 'slam', n: 2, rad: 2.6, delay: 1, m: 1.5, scatter: 3 }, { a: 'chase', t: 2.5 }] },
    { at: 0.65, say: 'Встаньте, мои верные!', pat: [{ a: 'summon', m: 'skelknight', n: 2 }, { a: 'summon', m: 'skelarcher', n: 3 }, { a: 'spiral', t: 4, arms: 4, spd: 5, rate: 0.16, m: 0.6 }, { a: 'tp', to: 'player' }, { a: 'nova', rad: 5.5, delay: 1.1, m: 2.2 }] },
    { at: 0.3, say: 'Твоя душа уже моя.', pat: [{ a: 'enrage', spd: 1.25, dmg: 1.2 }, { a: 'summon', m: 'ghost', n: 4 }, { a: 'line', n: 8, w: 1.4, len: 16, delay: 1.2, m: 1.9 }, { a: 'tp', to: 'random' }, { a: 'rain', t: 4, rate: 0.28, rad: 2, delay: 0.9, m: 1.3, scatter: 5 }, { a: 'chase', t: 2 }] },
  ]),
  frostlord: B('Повелитель ледяной пустоши', 'Тот, кто заморозил море', 'b_frostgiant', 'ice', 62, 1.6, 2.8, 'cold', { cold: 75, fire: -25 }, 'frostlord', [
    { at: 1, pat: [{ a: 'chase', t: 3.5 }, { a: 'line', n: 1, w: 2.2, len: 14, delay: 0.9, m: 2, dash: 1 }, { a: 'burst', n: 12, spd: 5.5, waves: 2, gap: 0.7, rot: 15, m: 0.8, chill: 1 }, { a: 'slam', n: 1, rad: 3.4, delay: 1, m: 1.9 }] },
    { at: 0.55, say: 'Замри.', pat: [{ a: 'ring', inner: 4, outer: 13, delay: 1.6, m: 2.6 }, { a: 'chase', t: 2.5 }, { a: 'rain', t: 5, rate: 0.35, rad: 2.2, delay: 1, m: 1.3, scatter: 7, zone: { dur: 6, m: 0.12, slow: 50 } }, { a: 'line', n: 3, w: 1.8, len: 16, delay: 1, m: 1.8 }, { a: 'summon', m: 'frostspirit', n: 4 }] },
    { at: 0.25, say: 'Вечная зима!', pat: [{ a: 'enrage', spd: 1.35, dmg: 1.25 }, { a: 'nova', rad: 7, delay: 1.4, m: 2.6 }, { a: 'line', n: 1, w: 2.4, len: 16, delay: 0.7, m: 2.2, dash: 1 }, { a: 'line', n: 1, w: 2.4, len: 16, delay: 0.7, m: 2.2, dash: 1 }, { a: 'burst', n: 22, spd: 6, waves: 3, gap: 0.5, rot: 8, m: 0.8, chill: 1 }] },
  ]),
  worldeater: B('Пожиратель миров', 'Голод без дна', 'b_kraken', 'abyss', 70, 1.5, 2.2, 'dark', { dark: 60, light: -25 }, 'worldeater', [
    { at: 1, pat: [{ a: 'slam', n: 4, rad: 2.2, delay: 1, m: 1.5, scatter: 5 }, { a: 'spiral', t: 4, arms: 5, spd: 4.5, rate: 0.18, m: 0.6 }, { a: 'summon', m: 'wingeye', n: 6 }, { a: 'aimed', n: 7, spread: 70, rep: 2, gap: 0.6, spd: 8, m: 0.8 }] },
    { at: 0.6, say: '…голоден…', pat: [{ a: 'nova', rad: 8, delay: 1.6, m: 2.6 }, { a: 'line', n: 6, w: 1.6, len: 18, delay: 1.2, m: 1.9 }, { a: 'summon', m: 'tentacle', n: 3 }, { a: 'rain', t: 5, rate: 0.22, rad: 1.9, delay: 0.9, m: 1.3, scatter: 7 }] },
    { at: 0.3, say: '…ВСЁ… МОЁ…', pat: [{ a: 'enrage', spd: 1.2, dmg: 1.25 }, { a: 'ring', inner: 4.5, outer: 14, delay: 1.5, m: 2.8 }, { a: 'spiral', t: 5, arms: 6, spd: 5.5, rate: 0.13, m: 0.6 }, { a: 'line', n: 10, w: 1.4, len: 18, delay: 1.1, m: 2 }, { a: 'slam', n: 6, rad: 2.2, delay: 0.9, m: 1.6, scatter: 6 }] },
  ]),
  archdemon: B('Архидемон бездны', 'Первый из павших', 'b_demonlord', 'abyss', 66, 1.7, 3.6, 'fire', { fire: 60, dark: 60, holy: -30 }, 'archdemon', [
    { at: 1, pat: [{ a: 'chase', t: 3 }, { a: 'line', n: 1, w: 2, len: 15, delay: 0.7, m: 2.1, dash: 1 }, { a: 'aimed', n: 5, spread: 40, rep: 3, gap: 0.3, spd: 11, m: 0.8 }, { a: 'slam', n: 1, rad: 3.2, delay: 0.8, m: 1.9, zone: { dur: 4, m: 0.25 } }] },
    { at: 0.6, say: 'На колени, смертный.', pat: [{ a: 'summon', m: 'wingdemon', n: 3 }, { a: 'tp', to: 'player' }, { a: 'nova', rad: 6, delay: 1.1, m: 2.5 }, { a: 'burst', n: 18, spd: 7, waves: 3, gap: 0.45, rot: 10, m: 0.8 }, { a: 'chase', t: 2.5 }] },
    { at: 0.3, say: 'ДОВОЛЬНО!', pat: [{ a: 'enrage', spd: 1.35, dmg: 1.3 }, { a: 'line', n: 1, w: 2.2, len: 16, delay: 0.55, m: 2.2, dash: 1 }, { a: 'line', n: 1, w: 2.2, len: 16, delay: 0.55, m: 2.2, dash: 1 }, { a: 'ring', inner: 3.5, outer: 13, delay: 1.3, m: 2.8 }, { a: 'rain', t: 4, rate: 0.2, rad: 2, delay: 0.8, m: 1.4, scatter: 6, zone: { dur: 4, m: 0.25 } }, { a: 'spiral', t: 3, arms: 4, spd: 6.5, rate: 0.12, m: 0.7 }] },
  ]),
  timekeeper: B('Хранитель времени', 'Он уже видел ваш конец', 'b_lich', 'grave', 52, 1.5, 3, 'cold', { cold: 50, dark: 50 }, 'timekeeper', [
    { at: 1, pat: [{ a: 'aimed', n: 1, spread: 0, rep: 8, gap: 0.18, spd: 12, m: 0.7 }, { a: 'tp', to: 'random' }, { a: 'slam', n: 3, rad: 2.4, delay: 1.3, m: 1.6, scatter: 4, zone: { dur: 8, m: 0.08, slow: 60 } }, { a: 'burst', n: 12, spd: 3.5, waves: 3, gap: 0.5, rot: 15, m: 0.7 }] },
    { at: 0.6, say: 'Время — моё оружие.', pat: [{ a: 'tp', to: 'center' }, { a: 'spiral', t: 5, arms: 2, spd: 4, rate: 0.09, m: 0.6 }, { a: 'tp', to: 'player' }, { a: 'nova', rad: 5.5, delay: 0.9, m: 2.3 }, { a: 'summon', m: 'reaper', n: 2 }, { a: 'line', n: 12, w: 1.2, len: 18, delay: 1.5, m: 1.9 }] },
    { at: 0.25, say: 'Твой час пробил.', pat: [{ a: 'enrage', spd: 1.3, dmg: 1.25 }, { a: 'tp', to: 'random' }, { a: 'aimed', n: 3, spread: 16, rep: 8, gap: 0.16, spd: 13, m: 0.7 }, { a: 'tp', to: 'player' }, { a: 'ring', inner: 3, outer: 12, delay: 1.2, m: 2.7 }, { a: 'rain', t: 4, rate: 0.22, rad: 2, delay: 1.1, m: 1.3, scatter: 6, zone: { dur: 6, m: 0.08, slow: 60 } }] },
  ]),
  bloodgod: B('Бог крови', 'Алый владыка', 'b_vamplord', 'grave', 60, 1.6, 4, 'phys', { phys: 30, dark: 50, holy: -30 }, 'bloodgod', [
    { at: 1, pat: [{ a: 'chase', t: 4 }, { a: 'aimed', n: 3, spread: 30, rep: 3, gap: 0.3, spd: 11, m: 0.8, bleed: 1 }, { a: 'tp', to: 'player' }, { a: 'nova', rad: 4.5, delay: 0.9, m: 2 }] },
    { at: 0.6, say: 'Твоя кровь поёт мне.', pat: [{ a: 'summon', m: 'vbat', n: 8 }, { a: 'slam', n: 4, rad: 2.4, delay: 0.9, m: 1.6, scatter: 4, zone: { dur: 6, m: 0.2 } }, { a: 'chase', t: 3 }, { a: 'line', n: 1, w: 2, len: 15, delay: 0.6, m: 2.2, dash: 1 }, { a: 'burst', n: 16, spd: 6.5, waves: 3, gap: 0.4, rot: 11, m: 0.8, bleed: 1 }] },
    { at: 0.3, say: 'ПЕЙ ИЛИ УМРИ!', pat: [{ a: 'enrage', spd: 1.4, dmg: 1.3, leech: 1 }, { a: 'chase', t: 3 }, { a: 'tp', to: 'player' }, { a: 'nova', rad: 5.5, delay: 0.8, m: 2.4 }, { a: 'summon', m: 'vampire', n: 2 }, { a: 'spiral', t: 3.5, arms: 5, spd: 6, rate: 0.13, m: 0.7 }] },
  ]),
  destroyer: B('Древний разрушитель', 'Последний дракон', 'b_elderdragon', 'ash', 78, 1.7, 3, 'fire', { fire: 60, phys: 30, cold: -20 }, 'ancientone', [
    { at: 1, pat: [{ a: 'line', n: 1, w: 3, len: 16, delay: 1.1, m: 2.2 }, { a: 'chase', t: 3 }, { a: 'slam', n: 1, rad: 3.6, delay: 0.9, m: 2 }, { a: 'aimed', n: 5, spread: 36, rep: 2, gap: 0.5, spd: 10, m: 0.9 }] },
    { at: 0.65, say: '', pat: [{ a: 'tp', to: 'center' }, { a: 'line', n: 4, w: 2.4, len: 18, delay: 1.3, m: 2.2 }, { a: 'line', n: 4, w: 2.4, len: 18, delay: 1.3, m: 2.2, off: 45 }, { a: 'rain', t: 5, rate: 0.25, rad: 2.2, delay: 0.9, m: 1.4, scatter: 8, zone: { dur: 4, m: 0.25 } }, { a: 'chase', t: 3 }] },
    { at: 0.3, say: '', pat: [{ a: 'enrage', spd: 1.3, dmg: 1.3 }, { a: 'nova', rad: 7.5, delay: 1.4, m: 2.8 }, { a: 'line', n: 1, w: 3, len: 16, delay: 0.7, m: 2.3, dash: 1 }, { a: 'burst', n: 24, spd: 6.5, waves: 4, gap: 0.4, rot: 7, m: 0.8 }, { a: 'ring', inner: 4, outer: 14, delay: 1.4, m: 2.8 }, { a: 'summon', m: 'firewyvern', n: 3 }] },
  ]),
  hydra: B('Гидра топей', 'Три пасти, один голод', 'b_hydra', 'swamp', 58, 1.5, 2.4, 'poison', { poison: 75, fire: -25 }, null, [
    { at: 1, pat: [{ a: 'aimed', n: 3, spread: 30, rep: 4, gap: 0.35, spd: 9, m: 0.8, poison: 1 }, { a: 'slam', n: 3, rad: 2.4, delay: 1, m: 1.4, scatter: 4, zone: { dur: 6, m: 0.2 } }, { a: 'chase', t: 3 }] },
    { at: 0.6, say: '', pat: [{ a: 'summon', m: 'poisonslime', n: 6 }, { a: 'spiral', t: 4, arms: 3, spd: 5, rate: 0.12, m: 0.6, poison: 1 }, { a: 'line', n: 3, w: 1.8, len: 16, delay: 1, m: 1.9 }, { a: 'nova', rad: 6, delay: 1.2, m: 2.3 }] },
    { at: 0.3, say: '', pat: [{ a: 'enrage', spd: 1.3, dmg: 1.2, regen: 0.4 }, { a: 'rain', t: 6, rate: 0.2, rad: 2, delay: 0.9, m: 1.3, scatter: 7, zone: { dur: 6, m: 0.2 } }, { a: 'aimed', n: 5, spread: 50, rep: 5, gap: 0.3, spd: 10, m: 0.8, poison: 1 }, { a: 'ring', inner: 3.5, outer: 13, delay: 1.4, m: 2.6 }] },
  ]),
  bonedragon: B('Костяной дракон', 'Крылья из чужих рёбер', 'b_bonedragon', 'grave', 60, 1.6, 3.4, 'cold', { poison: 90, cold: 50, holy: -30 }, null, [
    { at: 1, pat: [{ a: 'line', n: 1, w: 2.6, len: 16, delay: 1, m: 2.1 }, { a: 'chase', t: 3 }, { a: 'burst', n: 16, spd: 6, waves: 2, gap: 0.6, rot: 12, m: 0.8 }] },
    { at: 0.55, say: '', pat: [{ a: 'tp', to: 'random' }, { a: 'line', n: 1, w: 2.4, len: 18, delay: 0.7, m: 2.2, dash: 1 }, { a: 'summon', m: 'bonewolf', n: 4 }, { a: 'rain', t: 4, rate: 0.25, rad: 2, delay: 0.9, m: 1.3, scatter: 6 }, { a: 'nova', rad: 6, delay: 1.2, m: 2.4 }] },
    { at: 0.25, say: '', pat: [{ a: 'enrage', spd: 1.35, dmg: 1.25 }, { a: 'line', n: 1, w: 2.4, len: 18, delay: 0.55, m: 2.2, dash: 1 }, { a: 'line', n: 6, w: 1.6, len: 18, delay: 1.1, m: 2 }, { a: 'spiral', t: 4, arms: 4, spd: 6, rate: 0.12, m: 0.7 }, { a: 'summon', m: 'skelmage', n: 3 }] },
  ]),
  warlord: B('Вождь орды', 'Сильнейший правит', 'b_orcwarlord', 'cave', 56, 1.7, 4, 'phys', { phys: 30 }, null, [
    { at: 1, pat: [{ a: 'chase', t: 4 }, { a: 'slam', n: 1, rad: 3.2, delay: 0.8, m: 2 }, { a: 'line', n: 1, w: 2.2, len: 14, delay: 0.7, m: 2.1, dash: 1 }, { a: 'summon', m: 'goblin', n: 6 }] },
    { at: 0.6, say: 'ОРДА! КО МНЕ!', pat: [{ a: 'summon', m: 'orc', n: 3 }, { a: 'summon', m: 'orcarcher', n: 3 }, { a: 'chase', t: 3 }, { a: 'nova', rad: 5.5, delay: 1, m: 2.3 }, { a: 'aimed', n: 5, spread: 44, rep: 2, gap: 0.5, spd: 12, m: 0.9 }] },
    { at: 0.3, say: 'Я РАЗДАВЛЮ ТЕБЯ!', pat: [{ a: 'enrage', spd: 1.4, dmg: 1.35 }, { a: 'line', n: 1, w: 2.2, len: 14, delay: 0.5, m: 2.2, dash: 1 }, { a: 'slam', n: 1, rad: 3.6, delay: 0.7, m: 2.2 }, { a: 'chase', t: 3 }, { a: 'summon', m: 'orcberserk', n: 3 }, { a: 'ring', inner: 3, outer: 12, delay: 1.2, m: 2.6 }] },
  ]),
  slimeking: B('Король слизней', 'Его Вязкое Величество', 'b_kingslime', 'swamp', 50, 1.4, 3.4, 'poison', { poison: 75, light: -25 }, null, [
    { at: 1, pat: [{ a: 'line', n: 1, w: 3, len: 10, delay: 0.7, m: 1.9, dash: 1 }, { a: 'nova', rad: 4, delay: 0.7, m: 1.8 }, { a: 'summon', m: 'poisonslime', n: 4 }, { a: 'chase', t: 2.5 }] },
    { at: 0.6, say: 'Блорп!', pat: [{ a: 'line', n: 1, w: 3, len: 10, delay: 0.6, m: 2, dash: 1 }, { a: 'nova', rad: 4.5, delay: 0.6, m: 1.9, zone: { dur: 5, m: 0.2 } }, { a: 'line', n: 1, w: 3, len: 10, delay: 0.6, m: 2, dash: 1 }, { a: 'nova', rad: 4.5, delay: 0.6, m: 1.9, zone: { dur: 5, m: 0.2 } }, { a: 'summon', m: 'acidslime', n: 5 }, { a: 'burst', n: 16, spd: 5, waves: 2, gap: 0.6, rot: 12, m: 0.7, poison: 1 }] },
    { at: 0.3, say: 'БЛОРП!!!', pat: [{ a: 'enrage', spd: 1.35, dmg: 1.2 }, { a: 'line', n: 1, w: 3, len: 11, delay: 0.5, m: 2, dash: 1 }, { a: 'nova', rad: 5, delay: 0.5, m: 2, zone: { dur: 5, m: 0.2 } }, { a: 'summon', m: 'poisonslime', n: 6 }, { a: 'rain', t: 4, rate: 0.2, rad: 2, delay: 0.9, m: 1.3, scatter: 6, zone: { dur: 5, m: 0.2 } }] },
  ]),
};
export const BOSS_IDS = Object.keys(BOSSES);
