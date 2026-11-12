// Sprite atlas access (sprites: Pixel Art Atlas 1.4M, CC0).
import atlasData from './atlas.json';

export const ATL = { img: null, white: null, cols: atlasData.cols, rows: 1, map: atlasData.sprites, url: '' };

export function loadAtlas() {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      ATL.img = img; ATL.rows = img.height / 16;
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
      ATL.white = c;
      res();
    };
    img.onerror = rej;
    ATL.url = new URL('atlas.png', document.baseURI).href;
    img.src = ATL.url;
  });
}

export function sprIdx(name, v = 0) {
  const a = ATL.map[name];
  if (!a) return 0;
  return a[v % a.length];
}
export const sprVariants = (name) => (ATL.map[name] || [0]).length;

// Draw a sprite with its bottom-centre at (x, y).
export function drawSpr(ctx, name, v, x, y, scale = 3, flip = false, white = false) {
  const i = sprIdx(name, v), sx = (i % ATL.cols) * 16, sy = Math.floor(i / ATL.cols) * 16, s = 16 * scale;
  const img = white ? ATL.white : ATL.img;
  if (flip) {
    ctx.save(); ctx.translate(Math.round(x), Math.round(y - s)); ctx.scale(-1, 1);
    ctx.drawImage(img, sx, sy, 16, 16, -s / 2, 0, s, s); ctx.restore();
  } else ctx.drawImage(img, sx, sy, 16, 16, Math.round(x - s / 2), Math.round(y - s), s, s);
}

export function iconHTML(name, v = 0, size = 48, cls = '') {
  const i = sprIdx(name, v), s = size / 16;
  return `<i class="ic ${cls}" style="width:${size}px;height:${size}px;background-image:url(${ATL.url});background-size:${ATL.cols * size}px ${ATL.rows * size}px;background-position:-${(i % ATL.cols) * 16 * s}px -${Math.floor(i / ATL.cols) * 16 * s}px"></i>`;
}
