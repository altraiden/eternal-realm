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

async function boot() {
  await loadAtlas();
  loadSave();
  initUICore();
  initGame(document.getElementById('game'));
  bus.on('flask', useFlask);
  window.addEventListener('beforeunload', saveNow);
  showTitle();
  window.__G = G; window.__game = game; window.__ui = uicore; // handy for debugging in the console
}
boot().catch((e) => { document.body.innerHTML = '<pre style="color:#f88;padding:20px">Ошибка запуска: ' + e + '</pre>'; console.error(e); });
