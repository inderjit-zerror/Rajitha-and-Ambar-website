// Painted event cards (right page) and the illustrated pocket that holds them.
import { createCanvas, seeded, hashString, makeNoise1D, fillSpaced, grain, watercolorBlooms, drawImageCover, rgba } from './utils';
import { sky, ridge, sea, town, palm, cypress, sailboat, drape, valance } from './scenery';

/* ───────────────────────── card tab artworks ───────────────────────── */

function artCurtains(ctx, w, h, s, rand) {
  const g = ctx.createRadialGradient(w / 2, h * 0.42, 0, w / 2, h * 0.42, w * 0.62);
  g.addColorStop(0, '#4f8268');
  g.addColorStop(0.5, '#33604a');
  g.addColorStop(1, '#1d3a2c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  watercolorBlooms(ctx, w, h, { rand, color: '#0c2018', count: 26, alpha: 0.12, minR: 0.04, maxR: 0.18 });
  // faint palms in the background
  palm(ctx, { x: w * 0.83, y: h * 1.05, h: h * 0.85, lean: -0.12, rand, trunk: '#1f3a2c', leaf: '#244536', leafLight: '#2c5040', alpha: 0.55 });
  palm(ctx, { x: w * 0.9, y: h * 1.1, h: h * 0.7, lean: 0.1, rand, trunk: '#1f3a2c', leaf: '#244536', leafLight: '#2c5040', alpha: 0.45 });
  palm(ctx, { x: w * 0.13, y: h * 1.1, h: h * 0.7, lean: 0.14, rand, trunk: '#1f3a2c', leaf: '#244536', leafLight: '#2c5040', alpha: 0.45 });
  // stage glow
  const glow = ctx.createRadialGradient(w / 2, h * 0.3, 0, w / 2, h * 0.3, w * 0.3);
  glow.addColorStop(0, 'rgba(255,236,190,0.16)');
  glow.addColorStop(1, 'rgba(255,236,190,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  drape(ctx, { side: 'left', w, h, width: w * 0.14, color: '#2c5643', dark: '#183326', light: '#4a7a62', rand });
  drape(ctx, { side: 'right', w, h, width: w * 0.14, color: '#2c5643', dark: '#183326', light: '#4a7a62', rand });
  valance(ctx, { w, h: h * 0.13, color: '#2f5b47', dark: '#1a3628', swags: 5 });
}

function artCypress(ctx, w, h, s, rand) {
  const n = makeNoise1D(rand);
  sky(ctx, 0, 0, w, h, [
    [0, '#b8d0e2'],
    [0.6, '#dbe7ee'],
    [0.8, '#eef2f1'],
  ]);
  watercolorBlooms(ctx, w, h * 0.7, { rand, color: '#ffffff', count: 16, alpha: 0.25, minR: 0.05, maxR: 0.2 });
  // distant hills on the right
  ridge(ctx, { x0: w * 0.45, x1: w, bottom: h, top: (x) => h * 0.5 - ((x - w * 0.45) / (w * 0.55)) * h * 0.22 - n(x * 0.006) * h * 0.1, color: '#a7bdcf', rand, alpha: 0.5 });
  ridge(ctx, { x0: w * 0.6, x1: w, bottom: h, top: (x) => h * 0.58 - ((x - w * 0.6) / (w * 0.4)) * h * 0.12 - n(x * 0.01 + 40) * h * 0.05, color: '#9fb39a', rand, alpha: 0.55 });
  town(ctx, { x0: w * 0.66, x1: w * 1.02, baseFn: (x) => h * 0.66 - ((x - w * 0.66) / (w * 0.36)) * h * 0.08, rand, scale: s * 0.68, rows: 3, rowRise: 9 });
  sea(ctx, { x0: 0, x1: w, top: h * 0.66, bottom: h, colorTop: '#a6c3d6', colorBottom: '#86a9c2', rand, scale: s, streaks: 120 });
  // cypress grove on the left
  const trees = [
    [0.03, 0.7, 0.045],
    [0.065, 0.58, 0.04],
    [0.1, 0.74, 0.047],
    [0.14, 0.52, 0.037],
    [0.175, 0.44, 0.032],
  ];
  trees.forEach(([fx, fh, fw]) => cypress(ctx, { x: w * fx, y: h * 0.74, h: h * fh, w: w * fw, color: fx < 0.12 ? '#3f6450' : '#4b705a', rand }));
  // low shrubs
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = rgba(i % 2 ? '#56785c' : '#47684f', 0.85);
    ctx.beginPath();
    ctx.ellipse(w * (0.0 + rand() * 0.24), h * (0.74 + rand() * 0.04), w * (0.012 + rand() * 0.02), h * (0.03 + rand() * 0.03), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(126,150,110,0.9)';
  ctx.fillRect(0, h * 0.75, w * 0.26, h * 0.04);
}

function artRiviera(ctx, w, h, s, rand) {
  const n = makeNoise1D(rand);
  ctx.fillStyle = '#f4efe3';
  ctx.fillRect(0, 0, w, h);
  watercolorBlooms(ctx, w, h, { rand, color: '#d8c7a6', count: 22, alpha: 0.12 });
  // pale hills
  ridge(ctx, { x0: 0, x1: w * 0.36, bottom: h, top: (x) => h * 0.18 + (x / (w * 0.36)) * h * 0.4 + n(x * 0.008) * h * 0.08, color: '#d6dfdc', rand, alpha: 0.5, edge: 0.12 });
  ridge(ctx, { x0: w * 0.64, x1: w, bottom: h, top: (x) => h * 0.6 - ((x - w * 0.64) / (w * 0.36)) * h * 0.42 + n(x * 0.008 + 9) * h * 0.08, color: '#d9e0e2', rand, alpha: 0.5, edge: 0.12 });
  sea(ctx, { x0: 0, x1: w, top: h * 0.7, bottom: h, colorTop: '#dce7ec', colorBottom: '#c9dbe5', rand, scale: s, streaks: 70, dark: '#7f9cb5' });
  const sketch = { facades: ['#f6efe2', '#f1e3cf', '#eedfc9', '#f9f4ea'], roofs: ['#d9b7a0', '#cfa58d'], windowColor: '#8496ad', windowAlpha: 0.45, outline: 0.35 };
  town(ctx, { x0: -w * 0.02, x1: w * 0.26, baseFn: (x) => h * 0.72 - (1 - x / (w * 0.26)) * h * 0.1, rand, scale: s * 0.78, rows: 3, rowRise: 11, ...sketch });
  town(ctx, { x0: w * 0.74, x1: w * 1.02, baseFn: (x) => h * 0.72 - ((x - w * 0.74) / (w * 0.28)) * h * 0.1, rand, scale: s * 0.78, rows: 3, rowRise: 11, ...sketch });
  // a few palms framing the towns
  palm(ctx, { x: w * 0.29, y: h * 0.76, h: h * 0.55, lean: 0.08, rand, trunk: '#a08d74', leaf: '#8ea58a', leafLight: '#a9bb9f', alpha: 0.8 });
  palm(ctx, { x: w * 0.71, y: h * 0.76, h: h * 0.5, lean: -0.08, rand, trunk: '#a08d74', leaf: '#8ea58a', leafLight: '#a9bb9f', alpha: 0.8 });
  // soft fade towards the centre so the title breathes
  const fade = ctx.createRadialGradient(w / 2, h * 0.32, 0, w / 2, h * 0.32, w * 0.3);
  fade.addColorStop(0, 'rgba(244,239,227,0.85)');
  fade.addColorStop(1, 'rgba(244,239,227,0)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, w, h);
}

function artPalms(ctx, w, h, s, rand) {
  const n = makeNoise1D(rand);
  sky(ctx, 0, 0, w, h, [
    [0, '#4a6890'],
    [0.55, '#6c88ad'],
    [0.75, '#8aa0bd'],
  ]);
  watercolorBlooms(ctx, w, h * 0.7, { rand, color: '#ffffff', count: 14, alpha: 0.08 });
  ridge(ctx, { x0: 0, x1: w, bottom: h, top: (x) => h * 0.46 - n(x * 0.004) * h * 0.22, color: '#4a6287', rand, alpha: 0.55, edge: 0.1 });
  town(ctx, {
    x0: w * 0.2,
    x1: w * 0.82,
    baseFn: (x) => h * 0.66 - Math.sin(((x - w * 0.2) / (w * 0.62)) * Math.PI) * h * 0.06,
    rand,
    scale: s * 0.52,
    rows: 3,
    rowRise: 8,
    facades: ['#c9c3c0', '#bdb7b8', '#d2c6bd', '#b5b3ba'],
    roofs: ['#8d6a62', '#7f6060'],
    windowColor: '#2a3550',
    lit: true,
  });
  sea(ctx, { x0: 0, x1: w, top: h * 0.66, bottom: h, colorTop: '#3f5a80', colorBottom: '#30476a', rand, scale: s, streaks: 120, sparkle: '#f5d9a0' });
  const leaf = '#2a4652';
  const leafLight = '#38575d';
  palm(ctx, { x: w * 0.05, y: h * 1.0, h: h * 0.95, lean: 0.1, rand, trunk: '#283a4e', leaf, leafLight });
  palm(ctx, { x: w * 0.13, y: h * 1.02, h: h * 0.72, lean: -0.05, rand, trunk: '#283a4e', leaf, leafLight });
  palm(ctx, { x: w * 0.89, y: h * 1.0, h: h * 0.9, lean: -0.12, rand, trunk: '#283a4e', leaf, leafLight });
  palm(ctx, { x: w * 0.97, y: h * 1.02, h: h * 0.74, lean: 0.06, rand, trunk: '#283a4e', leaf, leafLight });
}

const ARTWORKS = {
  curtains: { paint: artCurtains, title: '#f6efdc', titleShadow: 'rgba(0,0,0,0.45)', base: '#1f3c2e' },
  cypress: { paint: artCypress, title: '#2c4a7c', titleShadow: 'rgba(255,255,255,0.75)', base: '#8eb0c8' },
  riviera: { paint: artRiviera, title: '#2c4a7c', titleShadow: 'rgba(255,255,255,0.8)', base: '#efe8d9' },
  palms: { paint: artPalms, title: '#f6f2ea', titleShadow: 'rgba(10,20,40,0.55)', base: '#30476a' },
};

/**
 * Paints one event card. Only the top "tab" is visible in the pocket, so the
 * artwork is concentrated there; the rest continues the base colour.
 */
export function paintEventCard(event, { ppu, family, layout, image }) {
  const w = layout.cardW * ppu;
  const h = layout.cardH * ppu;
  const { canvas, ctx } = createCanvas(w, h);
  const s = ppu / 512;
  const style = ARTWORKS[event.artwork] || ARTWORKS.riviera;
  const rand = seeded(hashString(event.id || event.title));
  // the visible tab is `band` tall; a little extra shows when a card is lifted
  const artH = Math.min(h, (layout.band + 0.14) * ppu);

  ctx.fillStyle = style.base;
  ctx.fillRect(0, 0, w, h);

  if (image) {
    drawImageCover(ctx, image, 0, 0, w, artH, 0.5);
  } else {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, artH);
    ctx.clip();
    style.paint(ctx, w, artH, s, rand);
    ctx.restore();
  }
  // blend the painting into the plain lower part
  const blend = ctx.createLinearGradient(0, artH - 40 * s, 0, artH);
  blend.addColorStop(0, rgba(style.base, 0));
  blend.addColorStop(1, rgba(style.base, 1));
  ctx.fillStyle = blend;
  ctx.fillRect(0, artH - 40 * s, w, 40 * s);

  grain(ctx, w, h, { amount: 0.07, rand });

  // title, centred in the visible tab
  const size = Math.min(layout.band * 0.34, 0.17) * ppu;
  ctx.font = `500 ${size}px ${family}`;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = style.title;
  ctx.shadowColor = style.titleShadow;
  ctx.shadowBlur = 10 * s;
  const ty = layout.band * ppu * 0.52;
  fillSpaced(ctx, String(event.title || '').toUpperCase(), w / 2, ty, size * 0.32, 'center');
  ctx.shadowBlur = 0;

  // crisp paper edge along the top
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(0, 0, w, 2.5 * s);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(0, 0, 2 * s, h);
  ctx.fillRect(w - 2 * s, 0, 2 * s, h);
  return canvas;
}

/* ───────────────────────── pocket ───────────────────────── */

export function paintPocket({ ppu, layout }) {
  const p = layout.pocket;
  const pw = p.right - p.left;
  const ph = Math.max(p.topLeft, p.topRight) - p.bottom;
  const w = pw * ppu;
  const h = ph * ppu;
  const s = ppu / 512;
  const { canvas, ctx } = createCanvas(w, h);
  const rand = seeded(2024);
  const n = makeNoise1D(rand);

  // sky
  sky(ctx, 0, 0, w, h * 0.5, [
    [0, '#cfdfea'],
    [0.7, '#e7eef0'],
    [1, '#f1f1ec'],
  ]);
  watercolorBlooms(ctx, w, h * 0.45, { rand, color: '#ffffff', count: 18, alpha: 0.3 });

  // big mountains on the left
  ridge(ctx, { x0: 0, x1: w * 0.75, bottom: h * 0.6, top: (x) => h * 0.16 + Math.pow(x / (w * 0.75), 1.3) * h * 0.3 + n(x * 0.004) * h * 0.1, color: '#a9bfd0', rand, alpha: 0.55 });
  ridge(ctx, { x0: 0, x1: w * 0.6, bottom: h * 0.6, top: (x) => h * 0.28 + (x / (w * 0.6)) * h * 0.2 + n(x * 0.007 + 13) * h * 0.06, color: '#93abbf', rand, alpha: 0.45 });
  // green hill behind the town
  ridge(ctx, { x0: w * 0.3, x1: w, bottom: h * 0.62, top: (x) => h * 0.36 - ((x - w * 0.3) / (w * 0.7)) * h * 0.08 + n(x * 0.008 + 3) * h * 0.06, color: '#9fb39b', rand, alpha: 0.6 });

  // the town along the coast
  town(ctx, { x0: w * 0.36, x1: w * 1.02, baseFn: (x) => h * 0.5 + Math.sin(x * 0.004) * 4 * s, rand, scale: s * 0.85, rows: 4, rowRise: 12 });

  // sea
  sea(ctx, { x0: 0, x1: w, top: h * 0.5, bottom: h, colorTop: '#8fb4cf', colorBottom: '#6d98ba', rand, scale: s, streaks: 260 });
  // promenade / sea wall
  ctx.fillStyle = 'rgba(236,226,206,0.9)';
  ctx.fillRect(w * 0.36, h * 0.5, w * 0.64, 4 * s);

  // beach curving in from the bottom right
  ctx.fillStyle = '#e9dcc2';
  ctx.beginPath();
  ctx.moveTo(w * 0.52, h);
  ctx.bezierCurveTo(w * 0.62, h * 0.82, w * 0.8, h * 0.66, w, h * 0.6);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 2.2 * s;
  ctx.beginPath();
  ctx.moveTo(w * 0.52, h);
  ctx.bezierCurveTo(w * 0.62, h * 0.82, w * 0.8, h * 0.66, w, h * 0.6);
  ctx.stroke();

  // sailboats
  sailboat(ctx, { x: w * 0.2, y: h * 0.68, s: s * 0.95 });
  sailboat(ctx, { x: w * 0.36, y: h * 0.77, s: s * 0.75 });

  // palms on the beach
  const palms = [
    [0.66, 1.02, 0.78, -0.06],
    [0.74, 0.98, 0.95, 0.04],
    [0.84, 1.03, 0.82, -0.1],
    [0.93, 0.97, 1.02, 0.08],
    [0.99, 1.02, 0.7, -0.05],
  ];
  palms.forEach(([fx, fy, fh, lean]) => palm(ctx, { x: w * fx, y: h * fy, h: h * fh, lean, rand }));
  // shrubs
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = rgba(i % 2 ? '#5f8160' : '#4c6c50', 0.9);
    ctx.beginPath();
    ctx.ellipse(w * (0.6 + rand() * 0.42), h * (0.9 + rand() * 0.12), w * (0.012 + rand() * 0.022), h * (0.02 + rand() * 0.03), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  grain(ctx, w, h, { amount: 0.07, rand });

  // white paper edge along the slanted top
  const toPx = (x, y) => [(x - p.left) * ppu, (Math.max(p.topLeft, p.topRight) - y) * ppu];
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.moveTo(...toPx(p.left, p.topLeft));
  ctx.lineTo(...toPx(p.dipX, p.dipY));
  ctx.lineTo(...toPx(p.right, p.topRight));
  ctx.stroke();
  return canvas;
}
