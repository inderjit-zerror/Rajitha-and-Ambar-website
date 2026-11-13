// Watercolour-style building blocks used to paint the Riviera illustrations on
// the event cards and the pocket. Everything is procedural (no image files).
import { rgba, mix } from './utils';

/** Fill a path several times with jitter for soft, layered watercolour edges. */
export function wcFill(ctx, buildPath, color, rand, { layers = 3, jitter = 2, alpha = 0.45, edge = 0.22, edgeColor, lineWidth = 1.2 } = {}) {
  for (let l = 0; l < layers; l++) {
    ctx.save();
    ctx.translate((rand() - 0.5) * jitter, (rand() - 0.5) * jitter);
    ctx.beginPath();
    buildPath(ctx);
    ctx.fillStyle = rgba(color, alpha);
    ctx.fill();
    ctx.restore();
  }
  if (edge > 0) {
    ctx.beginPath();
    buildPath(ctx);
    ctx.strokeStyle = rgba(edgeColor || mix(color, '#1a2433', 0.35), edge);
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

/** Vertical gradient sky. */
export function sky(ctx, x, y, w, h, stops) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  stops.forEach(([t, c]) => g.addColorStop(t, c));
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

/** A hill / mountain ridge filled down to `bottom`. */
export function ridge(ctx, { x0, x1, bottom, top: topFn, color, rand, alpha = 0.55, layers = 3, edge = 0.18, step = 4 }) {
  wcFill(
    ctx,
    (c) => {
      c.moveTo(x0, bottom);
      for (let x = x0; x <= x1 + step; x += step) c.lineTo(x, topFn(Math.min(x, x1)));
      c.lineTo(x1, bottom);
      c.closePath();
    },
    color,
    rand,
    { alpha, layers, edge, jitter: 2 }
  );
}

/** Sea with horizontal light streaks. */
export function sea(ctx, { x0, x1, top, bottom, colorTop, colorBottom, rand, scale = 1, streaks = 140, sparkle = '#ffffff', dark = '#1f3550' }) {
  const g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, colorTop);
  g.addColorStop(1, colorBottom);
  ctx.fillStyle = g;
  ctx.fillRect(x0, top, x1 - x0, bottom - top);
  for (let i = 0; i < streaks; i++) {
    const y = top + Math.pow(rand(), 1.4) * (bottom - top);
    const depth = (y - top) / Math.max(1, bottom - top);
    const len = (8 + rand() * 50) * scale * (0.5 + depth);
    const x = x0 + rand() * (x1 - x0);
    const light = rand() < 0.6;
    ctx.strokeStyle = light ? rgba(sparkle, 0.12 + rand() * 0.28) : rgba(dark, 0.05 + rand() * 0.1);
    ctx.lineWidth = (0.6 + rand() * 1.4) * scale * (0.6 + depth);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y + (rand() - 0.5) * scale);
    ctx.stroke();
  }
}

const FACADES = ['#f5ecdc', '#f1dfc4', '#ecd5b8', '#f7f1e6', '#e9cdb0', '#f2e6d3', '#e4d9c8'];
const ROOFS = ['#c98d6d', '#b9785c', '#d4a184', '#a86d55'];

/**
 * Hillside town: rows of buildings following a base line.
 * baseFn(x) -> y of the ground at x.
 */
export function town(ctx, { x0, x1, baseFn, rand, scale = 1, rows = 3, rowRise = 14, facades = FACADES, roofs = ROOFS, windowColor = '#6f8299', windowAlpha = 0.55, lit = false, outline = 0 }) {
  for (let r = rows - 1; r >= 0; r--) {
    const rowScale = scale * (1 - r * 0.18);
    let x = x0 + (rand() - 0.5) * 10 * scale;
    while (x < x1) {
      const tower = rand() < 0.05;
      const bw = (tower ? 8 + rand() * 6 : 14 + rand() * 26) * rowScale;
      const bh = (tower ? 50 + rand() * 30 : 14 + rand() * 32) * rowScale;
      const base = baseFn(x + bw / 2) - r * rowRise * scale + rand() * 3 * scale;
      const facade = facades[Math.floor(rand() * facades.length)];
      const bx = x;
      const by = base - bh;
      // body
      ctx.fillStyle = facade;
      ctx.fillRect(bx, by, bw, bh);
      // side shade
      ctx.fillStyle = 'rgba(60,70,90,0.13)';
      ctx.fillRect(bx + bw * 0.72, by, bw * 0.28, bh);
      // roof
      const roof = roofs[Math.floor(rand() * roofs.length)];
      if (tower || rand() < 0.45) {
        const rh = (tower ? bw * 1.2 : bw * 0.22) * (0.8 + rand() * 0.4);
        ctx.fillStyle = roof;
        ctx.beginPath();
        ctx.moveTo(bx - bw * 0.06, by);
        ctx.lineTo(bx + bw / 2, by - rh);
        ctx.lineTo(bx + bw * 1.06, by);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = rgba(roof, 0.85);
        ctx.fillRect(bx - bw * 0.03, by - 2.5 * rowScale, bw * 1.06, 3 * rowScale);
      }
      // windows
      const cols = Math.max(1, Math.floor(bw / (7.5 * rowScale)));
      const wrows = Math.max(1, Math.floor((bh - 6 * rowScale) / (9 * rowScale)));
      const ww = 2.2 * rowScale;
      const wh = 3.4 * rowScale;
      for (let cx = 0; cx < cols; cx++) {
        for (let cy = 0; cy < wrows; cy++) {
          if (rand() < 0.22) continue;
          const wx = bx + (bw / cols) * (cx + 0.5) - ww / 2;
          const wy = by + 5 * rowScale + cy * 9 * rowScale;
          if (lit && rand() < 0.55) {
            ctx.fillStyle = `rgba(255,214,140,${0.65 + rand() * 0.35})`;
          } else {
            ctx.fillStyle = rgba(windowColor, windowAlpha * (0.6 + rand() * 0.4));
          }
          ctx.fillRect(wx, wy, ww, wh);
        }
      }
      if (outline > 0) {
        ctx.strokeStyle = `rgba(80,95,120,${outline})`;
        ctx.lineWidth = 0.8 * rowScale;
        ctx.strokeRect(bx, by, bw, bh);
      }
      // little trees between buildings
      if (rand() < 0.25) {
        const tr = (4 + rand() * 6) * rowScale;
        ctx.fillStyle = rgba(rand() < 0.5 ? '#5d7d5f' : '#4d6b52', 0.85);
        ctx.beginPath();
        ctx.ellipse(bx + bw + tr * 0.3, base - tr * 0.8, tr, tr * 1.1, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      x += bw * (0.72 + rand() * 0.3);
    }
  }
}

/** Palm tree with curved trunk and drooping fronds. */
export function palm(ctx, { x, y, h, lean = 0.12, rand, trunk = '#7a6650', leaf = '#4b6b4c', leafLight = '#6f8f63', fronds = 10, alpha = 1 }) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const tx = x + lean * h;
  const ty = y - h;
  const cx = x + lean * h * 0.1 + (rand() - 0.5) * h * 0.06;
  const cy = y - h * 0.55;
  const N = 48;
  const point = (t) => {
    const a = (1 - t) * (1 - t);
    const b = 2 * (1 - t) * t;
    const c = t * t;
    return [a * x + b * cx + c * tx, a * y + b * cy + c * ty];
  };
  for (let i = 0; i < N; i++) {
    const t0 = i / N;
    const t1 = (i + 1) / N;
    const [x0, y0] = point(t0);
    const [x1, y1] = point(t1);
    const width = h * (0.038 - 0.016 * t0);
    ctx.strokeStyle = i % 3 === 0 ? mix(trunk, '#3c3026', 0.35) : trunk;
    ctx.lineWidth = width;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1 - 0.5);
    ctx.stroke();
  }
  // fronds
  for (let k = 0; k < fronds; k++) {
    const spread = (k / (fronds - 1) - 0.5) * Math.PI * 1.55;
    const angle = -Math.PI / 2 + spread + (rand() - 0.5) * 0.25;
    const len = h * (0.3 + rand() * 0.14);
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const droop = len * (0.35 + Math.abs(spread) * 0.25);
    const ex = tx + dx * len;
    const ey = ty + dy * len * 0.55 + droop;
    const mx = tx + dx * len * 0.55;
    const my = ty + dy * len * 0.6 - len * 0.12;
    const color = rand() < 0.5 ? leaf : leafLight;
    const steps = 22;
    let px = tx;
    let py = ty;
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const a = (1 - t) * (1 - t);
      const b = 2 * (1 - t) * t;
      const c = t * t;
      const qx = a * tx + b * mx + c * ex;
      const qy = a * ty + b * my + c * ey;
      const tanx = qx - px;
      const tany = qy - py;
      const tl = Math.hypot(tanx, tany) || 1;
      const nx = -tany / tl;
      const ny = tanx / tl;
      const leafLen = len * 0.2 * Math.sin(Math.PI * Math.min(1, t * 1.15)) + len * 0.02;
      ctx.strokeStyle = rgba(color, 0.85);
      ctx.lineWidth = Math.max(0.6, h * 0.006);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(qx, qy);
        ctx.lineTo(qx + (nx * side * 0.8 + (tanx / tl) * 0.6) * leafLen, qy + (ny * side * 0.8 + (tany / tl) * 0.6) * leafLen + leafLen * 0.35);
        ctx.stroke();
      }
      px = qx;
      py = qy;
    }
    // midrib
    ctx.strokeStyle = rgba(mix(color, '#26331f', 0.3), 0.9);
    ctx.lineWidth = Math.max(0.8, h * 0.008);
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(mx, my, ex, ey);
    ctx.stroke();
  }
  ctx.restore();
}

/** Italian cypress – a tall dark flame. */
export function cypress(ctx, { x, y, h, w, color = '#40624f', rand }) {
  wcFill(
    ctx,
    (c) => {
      c.moveTo(x - w * 0.32, y);
      c.bezierCurveTo(x - w * 0.62, y - h * 0.35, x - w * 0.34, y - h * 0.82, x, y - h);
      c.bezierCurveTo(x + w * 0.34, y - h * 0.82, x + w * 0.62, y - h * 0.35, x + w * 0.32, y);
      c.closePath();
    },
    color,
    rand,
    { alpha: 0.55, layers: 3, edge: 0.25, jitter: 1.5 }
  );
  // foliage texture
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - w * 0.32, y);
  ctx.bezierCurveTo(x - w * 0.62, y - h * 0.35, x - w * 0.34, y - h * 0.82, x, y - h);
  ctx.bezierCurveTo(x + w * 0.34, y - h * 0.82, x + w * 0.62, y - h * 0.35, x + w * 0.32, y);
  ctx.closePath();
  ctx.clip();
  for (let i = 0; i < 60; i++) {
    const fx = x + (rand() - 0.5) * w;
    const fy = y - rand() * h;
    ctx.fillStyle = rand() < 0.5 ? 'rgba(20,40,30,0.18)' : 'rgba(150,180,150,0.14)';
    ctx.beginPath();
    ctx.ellipse(fx, fy, w * (0.06 + rand() * 0.1), h * (0.015 + rand() * 0.02), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** A small sailboat with reflection. */
export function sailboat(ctx, { x, y, s, sail = '#fbfaf5', shade = '#d4dde6', hull = '#3d4b5e', alpha = 1 }) {
  ctx.save();
  ctx.globalAlpha = alpha;
  // reflection
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(x - 1 * s, y + 2 * s, 2.5 * s, 22 * s);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(x + 6 * s, y + 3 * s, 2 * s, 14 * s);
  // hull
  ctx.fillStyle = hull;
  ctx.beginPath();
  ctx.moveTo(x - 18 * s, y - 2 * s);
  ctx.lineTo(x + 20 * s, y - 2 * s);
  ctx.quadraticCurveTo(x + 14 * s, y + 3 * s, x - 12 * s, y + 3 * s);
  ctx.closePath();
  ctx.fill();
  // mast
  ctx.strokeStyle = hull;
  ctx.lineWidth = 1.2 * s;
  ctx.beginPath();
  ctx.moveTo(x, y - 2 * s);
  ctx.lineTo(x, y - 60 * s);
  ctx.stroke();
  // main sail
  ctx.fillStyle = sail;
  ctx.beginPath();
  ctx.moveTo(x + 1.5 * s, y - 58 * s);
  ctx.quadraticCurveTo(x + 18 * s, y - 30 * s, x + 24 * s, y - 7 * s);
  ctx.lineTo(x + 1.5 * s, y - 7 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba(shade, 0.7);
  ctx.beginPath();
  ctx.moveTo(x + 1.5 * s, y - 58 * s);
  ctx.lineTo(x + 6 * s, y - 7 * s);
  ctx.lineTo(x + 1.5 * s, y - 7 * s);
  ctx.closePath();
  ctx.fill();
  // jib
  ctx.fillStyle = sail;
  ctx.beginPath();
  ctx.moveTo(x - 1.5 * s, y - 52 * s);
  ctx.quadraticCurveTo(x - 10 * s, y - 28 * s, x - 17 * s, y - 8 * s);
  ctx.lineTo(x - 1.5 * s, y - 8 * s);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Theatre drape for one side, with folds and a tie-back. */
export function drape(ctx, { side, w, h, width, color, dark, light, rand }) {
  ctx.save();
  if (side === 'right') {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  const tieY = h * 0.62;
  const path = (c) => {
    c.moveTo(0, 0);
    c.lineTo(width, 0);
    c.bezierCurveTo(width * 0.95, h * 0.3, width * 0.45, tieY * 0.85, width * 0.38, tieY);
    c.bezierCurveTo(width * 0.55, h * 0.8, width * 0.8, h * 0.95, width * 0.9, h);
    c.lineTo(0, h);
    c.closePath();
  };
  const g = ctx.createLinearGradient(0, 0, width, 0);
  const folds = 7;
  for (let i = 0; i <= folds * 2; i++) {
    const t = i / (folds * 2);
    g.addColorStop(t, i % 2 === 0 ? dark : light);
  }
  ctx.beginPath();
  path(ctx);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = g;
  ctx.fill();
  ctx.globalAlpha = 1;
  // inner shadow edge
  ctx.strokeStyle = 'rgba(5,20,12,0.35)';
  ctx.lineWidth = Math.max(1, width * 0.02);
  ctx.beginPath();
  ctx.moveTo(width, 0);
  ctx.bezierCurveTo(width * 0.95, h * 0.3, width * 0.45, tieY * 0.85, width * 0.38, tieY);
  ctx.bezierCurveTo(width * 0.55, h * 0.8, width * 0.8, h * 0.95, width * 0.9, h);
  ctx.stroke();
  // gold tie-back
  ctx.strokeStyle = '#cfae6a';
  ctx.lineWidth = Math.max(1.5, width * 0.035);
  ctx.beginPath();
  ctx.moveTo(0, tieY - width * 0.05);
  ctx.quadraticCurveTo(width * 0.25, tieY + width * 0.08, width * 0.42, tieY);
  ctx.stroke();
  ctx.fillStyle = '#d8bb7a';
  ctx.beginPath();
  ctx.arc(width * 0.42, tieY, width * 0.035, 0, Math.PI * 2);
  ctx.fill();
  // subtle velvet noise
  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = rand() < 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)';
    ctx.fillRect(rand() * width, rand() * h, 1 + rand() * 2, 3 + rand() * 12);
  }
  ctx.restore();
}

/** Scalloped valance across the top of a stage. */
export function valance(ctx, { w, h, color, dark, swags = 3 }) {
  const sw = w / swags;
  for (let i = 0; i < swags; i++) {
    const x0 = i * sw;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, dark);
    g.addColorStop(0.6, color);
    g.addColorStop(1, dark);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x0, 0);
    ctx.lineTo(x0 + sw, 0);
    ctx.lineTo(x0 + sw, h * 0.45);
    ctx.quadraticCurveTo(x0 + sw / 2, h * 1.35, x0, h * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(207,174,106,0.6)';
    ctx.lineWidth = Math.max(1, h * 0.04);
    ctx.beginPath();
    ctx.moveTo(x0 + sw, h * 0.45);
    ctx.quadraticCurveTo(x0 + sw / 2, h * 1.35, x0, h * 0.45);
    ctx.stroke();
  }
}
