import './style.css';
import { G } from './state.js';
import { bus } from './util.js';
import { loadAtlas } from './gfx.js';
import { loadSave, saveNow } from './save.js';
import * as game from './game.js';
const { initGame, useFlask } = game;
import * as uicore from './ui/core.js';
const { initUICore } = uicore;
import './ui/hud.js';
import './ui/tree.js';
import { showTitle } from './ui/panels.js';
import './ui/social.js';
import * as bots from './bots.js';

async function boot() {
  await loadAtlas();
  loadSave();
  bots.initWorld();
  initUICore();
  initGame(document.getElementById('game'));
  if (G.save.settings.gfx !== '2d') {
    try { const { init3D } = await import('./render3d.js'); G.gfx = await init3D(document.getElementById('game')); }
    catch (e) { console.warn('3D renderer unavailable, using 2D', e); G.gfx = '2D'; }
  } else G.gfx = '2D';
  bus.on('flask', useFlask);
  window.addEventListener('beforeunload', saveNow);
  showTitle();
  window.__G = G; window.__game = game; window.__ui = uicore; window.__bots = bots; // handy for debugging in the console
}
boot().catch((e) => { document.body.innerHTML = '<pre style="color:#f88;padding:20px">Ошибка запуска: ' + e + '</pre>'; console.error(e); });
