// Small helpers shared by all the procedural "printed" textures.

export function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(2, Math.round(width));
  canvas.height = Math.max(2, Math.round(height));
  const ctx = canvas.getContext('2d');
  return { canvas, ctx, w: canvas.width, h: canvas.height };
}

/** Deterministic random generator (mulberry32) so the paintings never change between reloads. */
export function seeded(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Smooth 1D value noise with octaves, returns 0..1 */
export function makeNoise1D(rand, size = 512) {
  const values = Array.from({ length: size }, () => rand());
  const smooth = (t) => t * t * (3 - 2 * t);
  const base = (x) => {
    const i = Math.floor(x);
    const f = x - i;
    const a = values[((i % size) + size) % size];
    const b = values[(((i + 1) % size) + size) % size];
    return a + (b - a) * smooth(f);
  };
  return (x, octaves = 4) => {
    let sum = 0;
    let amp = 0.5;
    let freq = 1;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += base(x * freq + o * 31.7) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return sum / norm;
  };
}

export function hexToRgb(hex) {
  const v = hex.replace('#', '');
  const n = parseInt(v.length === 3 ? v.split('').map((c) => c + c).join('') : v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(hex, alpha = 1) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function mix(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Draws text with manual letter-spacing (canvas letterSpacing support is uneven).
 * align: 'center' | 'left' | 'right'
 */
export function fillSpaced(ctx, text, x, y, spacing, align = 'center') {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((s, w) => s + w, 0) + spacing * Math.max(0, chars.length - 1);
  let cursor = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  chars.forEach((c, i) => {
    ctx.fillText(c, cursor, y);
    cursor += widths[i] + spacing;
  });
  ctx.textAlign = prevAlign;
  return total;
}

export function measureSpaced(ctx, text, spacing) {
  const chars = [...text];
  return chars.reduce((s, c) => s + ctx.measureText(c).width, 0) + spacing * Math.max(0, chars.length - 1);
}

/** Word-wraps a paragraph (respecting explicit \n) to a max width. */
export function wrapText(ctx, text, maxWidth, spacing = 0) {
  const out = [];
  String(text)
    .split('\n')
    .forEach((para) => {
      const words = para.split(/\s+/).filter(Boolean);
      let line = '';
      words.forEach((word) => {
        const test = line ? `${line} ${word}` : word;
        if (line && measureSpaced(ctx, test, spacing) > maxWidth) {
          out.push(line);
          line = word;
        } else {
          line = test;
        }
      });
      out.push(line);
    });
  return out;
}

/** Fine paper / print grain. Cheap: one random tile, drawn as a pattern. */
export function grain(ctx, w, h, { amount = 0.06, rand = Math.random, size = 256, scale = 1 } = {}) {
  const tile = createCanvas(size, size);
  const img = tile.ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = rand() * 255;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  tile.ctx.putImageData(img, 0, 0);
  const pattern = ctx.createPattern(tile.canvas, 'repeat');
  if (scale !== 1 && pattern.setTransform) pattern.setTransform(new DOMMatrix().scale(scale));
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Soft blotchy watercolour variation over an area (multiply). */
export function watercolorBlooms(ctx, w, h, { rand, color = '#000000', count = 40, alpha = 0.05, minR = 0.05, maxR = 0.25 }) {
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = (minR + rand() * (maxR - minR)) * Math.max(w, h);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(color, alpha * (0.4 + rand() * 0.6)));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
}

export function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn(`[invitation] Could not load image "${src}" — falling back to painted artwork.`);
      resolve(null);
    };
    img.src = src;
  });
}

/** Draws an image covering the given rect (like CSS object-fit: cover). */
export function drawImageCover(ctx, img, x, y, w, h, focusY = 0.5) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.width - sw) / 2;
  const sy = (img.height - sh) * focusY;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}
