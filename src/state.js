// Global runtime state shared by all modules.
export const G = {
  save: null,   // whole persisted save
  ch: null,     // current character (persisted data)
  p: null,      // player actor (runtime)
  zone: null,   // current zone runtime
  time: 0,
  paused: false,
  mouse: { x: 0, y: 0, wx: 0, wy: 0, l: false, r: false },
  keys: {},
  cam: { x: 0, y: 0, zoom: 1, shake: 0 },
  dps: { total: 0, t0: 0, win: [] },
};
