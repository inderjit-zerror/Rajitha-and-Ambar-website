// Front cover, spine and back cover: blue book-cloth with white-foil embossing.
// Each surface produces three maps: colour, bump (emboss height) and an
// ORM-style map (G = roughness, B = metalness) so the foil catches the light.
import { BOOK, PALETTE } from '../constants';
import { createCanvas, seeded, fillSpaced } from './utils';
import { fillWithLinen, boardEdgeShade } from './linen';

function foilSurface(w, h, linenTile, ppu, drawArt) {
  const s = ppu / 512;

  const color = createCanvas(w, h);
  fillWithLinen(color.ctx, linenTile, w, h);
  boardEdgeShade(color.ctx, w, h);
  drawArt(color.ctx, { color: 'rgba(28,46,80,0.38)', dx: 1.8 * s, dy: 2.4 * s, blur: 1.6 * s });
  drawArt(color.ctx, { color: 'rgba(255,255,255,0.45)', dx: -1.1 * s, dy: -1.1 * s, blur: 0.8 * s });
  drawArt(color.ctx, { color: PALETTE.foil });

  const bump = createCanvas(w, h);
  bump.ctx.fillStyle = '#6f6f6f';
  bump.ctx.fillRect(0, 0, w, h);
  bump.ctx.globalAlpha = 0.75;
  fillWithLinen(bump.ctx, linenTile, w, h);
  bump.ctx.globalAlpha = 1;
  drawArt(bump.ctx, { color: '#ffffff', blur: 1.4 * s });

  const orm = createCanvas(w, h);
  orm.ctx.fillStyle = 'rgb(0,236,0)';
  orm.ctx.fillRect(0, 0, w, h);
  drawArt(orm.ctx, { color: 'rgb(0,96,165)' });

  return { color: color.canvas, bump: bump.canvas, orm: orm.canvas };
}

function withStyle(ctx, { color, dx = 0, dy = 0, blur = 0 }, fn) {
  ctx.save();
  ctx.translate(dx, dy);
  if (blur > 0) ctx.filter = `blur(${blur}px)`;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  fn();
  ctx.restore();
}

/** Interlaced "R & A" monogram. */
export function drawMonogram(ctx, cx, cy, size, family, monogram) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `400 ${size}px ${family}`;
  ctx.fillText(monogram.first, cx - size * 0.26, cy + size * 0.1);
  ctx.fillText(monogram.second, cx + size * 0.24, cy + size * 0.34);
  ctx.font = `italic 500 ${size * 0.36}px ${family}`;
  ctx.fillText('&', cx - size * 0.01, cy + size * 0.27);
}

/** Fine line drawing of the Cannes coastline (embossed on the cover). */
function drawCoast(ctx, w, h, s) {
  const rand = seeded(42);
  const lw = 2.1 * s;
  ctx.lineWidth = lw;
  const shoreY = h * 0.842;

  // hills
  ctx.beginPath();
  ctx.moveTo(w * 0.27, h * 0.812);
  ctx.bezierCurveTo(w * 0.36, h * 0.77, w * 0.44, h * 0.735, w * 0.55, h * 0.728);
  ctx.bezierCurveTo(w * 0.66, h * 0.72, w * 0.76, h * 0.738, w * 0.86, h * 0.758);
  ctx.bezierCurveTo(w * 0.92, h * 0.77, w * 0.96, h * 0.79, w * 0.985, h * 0.81);
  ctx.stroke();
  ctx.lineWidth = lw * 0.7;
  ctx.beginPath();
  ctx.moveTo(w * 0.06, h * 0.825);
  ctx.bezierCurveTo(w * 0.15, h * 0.806, w * 0.24, h * 0.796, w * 0.33, h * 0.8);
  ctx.stroke();

  // buildings: a low seaside town, taller towards the middle
  ctx.lineWidth = lw * 0.8;
  let x = w * 0.42;
  while (x < w * 0.82) {
    const bw = w * (0.02 + rand() * 0.024);
    const mid = Math.sin(((x - w * 0.42) / (w * 0.4)) * Math.PI);
    const bh = h * (0.012 + mid * 0.016 + rand() * 0.012);
    const by = shoreY - bh;
    ctx.strokeRect(x, by, bw, bh);
    if (rand() < 0.5) {
      ctx.beginPath();
      ctx.moveTo(x - bw * 0.05, by);
      ctx.lineTo(x + bw / 2, by - bw * 0.3);
      ctx.lineTo(x + bw * 1.05, by);
      ctx.stroke();
    }
    // window ticks
    const cols = Math.max(1, Math.floor(bw / (w * 0.008)));
    for (let r = by + h * 0.006; r < shoreY - h * 0.004; r += h * 0.008) {
      for (let c = 0; c < cols; c++) {
        if (rand() < 0.35) continue;
        const wx = x + (bw / cols) * (c + 0.5);
        ctx.beginPath();
        ctx.moveTo(wx, r);
        ctx.lineTo(wx, r + h * 0.0035);
        ctx.stroke();
      }
    }
    x += bw * (0.85 + rand() * 0.35);
  }
  // bell tower
  const tx = w * 0.6;
  const towerTop = h * 0.79;
  ctx.strokeRect(tx, towerTop, w * 0.016, shoreY - towerTop);
  ctx.beginPath();
  ctx.moveTo(tx - w * 0.002, towerTop);
  ctx.lineTo(tx + w * 0.008, towerTop - h * 0.016);
  ctx.lineTo(tx + w * 0.018, towerTop);
  ctx.stroke();

  // shoreline and water
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(w * 0.04, shoreY);
  for (let px = w * 0.04; px <= w * 0.97; px += w * 0.01) {
    ctx.lineTo(px, shoreY + Math.sin(px * 0.05) * h * 0.0012);
  }
  ctx.stroke();
  ctx.lineWidth = lw * 0.7;
  [0.858, 0.874, 0.89, 0.905].forEach((fy, row) => {
    let px = w * (0.06 + row * 0.03 + rand() * 0.03);
    while (px < w * (0.92 - row * 0.05)) {
      const len = w * (0.02 + rand() * 0.06);
      ctx.beginPath();
      ctx.moveTo(px, h * fy);
      ctx.quadraticCurveTo(px + len / 2, h * fy - h * 0.002, px + len, h * fy);
      ctx.stroke();
      px += len + w * (0.02 + rand() * 0.05);
    }
  });

  // sailboats
  const boat = (bx, by, bs) => {
    ctx.lineWidth = lw * 0.85;
    ctx.beginPath();
    ctx.moveTo(bx - bs * 0.32, by);
    ctx.quadraticCurveTo(bx, by + bs * 0.1, bx + bs * 0.34, by - bs * 0.02);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx, by - bs * 0.02);
    ctx.lineTo(bx, by - bs);
    ctx.lineTo(bx + bs * 0.34, by - bs * 0.1);
    ctx.lineTo(bx, by - bs * 0.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx - bs * 0.03, by - bs * 0.9);
    ctx.lineTo(bx - bs * 0.26, by - bs * 0.12);
    ctx.lineTo(bx - bs * 0.03, by - bs * 0.12);
    ctx.stroke();
  };
  boat(w * 0.13, shoreY + h * 0.006, h * 0.078);
  boat(w * 0.235, shoreY + h * 0.002, h * 0.062);

  // palm tree
  const px0 = w * 0.885;
  const py0 = h * 0.872;
  const ptx = w * 0.872;
  const pty = h * 0.695;
  ctx.lineWidth = lw * 0.9;
  for (const off of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(px0 + off * w * 0.006, py0);
    ctx.quadraticCurveTo(w * 0.89 + off * w * 0.004, h * 0.78, ptx + off * w * 0.003, pty);
    ctx.stroke();
  }
  for (let ty = py0 - h * 0.012; ty > pty + h * 0.01; ty -= h * 0.011) {
    const t = (py0 - ty) / (py0 - pty);
    const cx = px0 + (ptx - px0) * t + Math.sin(t * Math.PI) * w * 0.006;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.006, ty);
    ctx.quadraticCurveTo(cx, ty + h * 0.003, cx + w * 0.006, ty);
    ctx.stroke();
  }
  const fronds = [-2.95, -2.55, -2.15, -1.8, -1.35, -0.95, -0.55, -0.2];
  fronds.forEach((a) => {
    const len = h * (0.06 + rand() * 0.018);
    const ex = ptx + Math.cos(a) * len;
    const ey = pty + Math.sin(a) * len * 0.35 + len * 0.38;
    const mx = ptx + Math.cos(a) * len * 0.5;
    const my = pty + Math.sin(a) * len * 0.75 - len * 0.05;
    ctx.lineWidth = lw * 0.85;
    ctx.beginPath();
    ctx.moveTo(ptx, pty);
    ctx.quadraticCurveTo(mx, my, ex, ey);
    ctx.stroke();
    ctx.lineWidth = lw * 0.55;
    for (let t = 0.2; t < 0.95; t += 0.09) {
      const qx = (1 - t) * (1 - t) * ptx + 2 * (1 - t) * t * mx + t * t * ex;
      const qy = (1 - t) * (1 - t) * pty + 2 * (1 - t) * t * my + t * t * ey;
      const ll = len * 0.16 * Math.sin(Math.PI * t);
      ctx.beginPath();
      ctx.moveTo(qx, qy);
      ctx.lineTo(qx + Math.cos(a + 0.9) * ll, qy + ll * 0.9);
      ctx.moveTo(qx, qy);
      ctx.lineTo(qx + Math.cos(a - 0.9) * ll, qy + ll * 0.9);
      ctx.stroke();
    }
  });
}

export function paintCover({ ppu, family, couple, linenTile }) {
  const w = BOOK.W * ppu;
  const h = BOOK.H * ppu;
  const s = ppu / 512;
  const art = (ctx, style) =>
    withStyle(ctx, style, () => {
      drawMonogram(ctx, w / 2, h * 0.215, h * 0.135, family, couple.monogram);
      ctx.textAlign = 'center';
      ctx.font = `500 ${h * 0.056}px ${family}`;
      ctx.fillText(couple.names, w / 2, h * 0.475);
      ctx.font = `500 ${h * 0.0205}px ${family}`;
      fillSpaced(ctx, couple.location, w / 2, h * 0.545, h * 0.0055, 'center');
      drawCoast(ctx, w, h, s);
    });
  return foilSurface(w, h, linenTile, ppu, art);
}

export function paintSpine({ ppu, family, couple, linenTile }) {
  const sw = BOOK.D + BOOK.T * 2;
  const w = sw * ppu;
  const h = BOOK.H * ppu;
  const art = (ctx, style) =>
    withStyle(ctx, style, () => {
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `500 ${w * 0.3}px ${family}`;
      fillSpaced(ctx, couple.names.toUpperCase(), 0, 0, w * 0.06, 'center');
      ctx.restore();
      ctx.fillRect(w * 0.18, h * 0.04, w * 0.64, Math.max(1, w * 0.012));
      ctx.fillRect(w * 0.18, h * 0.96, w * 0.64, Math.max(1, w * 0.012));
    });
  return foilSurface(w, h, linenTile, ppu, art);
}

export function paintBackCover({ ppu, family, couple, linenTile }) {
  const w = BOOK.W * ppu;
  const h = BOOK.H * ppu;
  const art = (ctx, style) =>
    withStyle(ctx, style, () => {
      drawMonogram(ctx, w / 2, h * 0.86, h * 0.05, family, couple.monogram);
    });
  return foilSurface(w, h, linenTile, ppu, art);
}
