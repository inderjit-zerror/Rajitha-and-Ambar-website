// Neutral textures for the invitation card. They are white/grey so the event
// theme colours (material.color) tint them: paper stock, foil frame, foil emblem.
import { createCanvas, seeded, grain, watercolorBlooms } from './utils';

/** Light, neutral paper grain (tinted by the theme's paper colour). */
export function paintPaperGrain(size = 1024) {
  const { canvas, ctx } = createCanvas(size, size * 1.37);
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = '#fbfbfa';
  ctx.fillRect(0, 0, w, h);
  const rand = seeded(99);
  watercolorBlooms(ctx, w, h, { rand, color: '#9a9a9a', count: 26, alpha: 0.05, minR: 0.1, maxR: 0.4 });
  // paper fibres
  for (let i = 0; i < 900; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const len = 4 + rand() * 18;
    const a = rand() * Math.PI;
    ctx.strokeStyle = rand() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 0.6 + rand() * 0.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  grain(ctx, w, h, { amount: 0.06, rand });
  return canvas;
}

/** Double-rule border with corner flourishes (white on transparent). */
export function paintFrame(width, height, px = 512) {
  const w = Math.round(width * px);
  const h = Math.round(height * px);
  const { canvas, ctx } = createCanvas(w, h);
  const s = px / 512;
  const inset = 0.075 * px;
  const gapLine = 0.022 * px;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.4 * s;
  ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  ctx.lineWidth = 1.2 * s;
  ctx.strokeRect(inset + gapLine, inset + gapLine, w - (inset + gapLine) * 2, h - (inset + gapLine) * 2);

  // corner flourishes
  const corner = (cx, cy, sx, sy) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(sx, sy);
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    const r = 0.11 * px;
    ctx.moveTo(0, r);
    ctx.bezierCurveTo(0, r * 0.35, r * 0.35, 0, r, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(r * 0.32, r * 0.32, r * 0.09, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    // little leaf
    ctx.beginPath();
    ctx.moveTo(r * 0.45, r * 0.45);
    ctx.quadraticCurveTo(r * 0.85, r * 0.5, r * 0.95, r * 0.95);
    ctx.quadraticCurveTo(r * 0.5, r * 0.85, r * 0.45, r * 0.45);
    ctx.fill();
    ctx.restore();
  };
  const c = inset + gapLine * 2.2;
  corner(c, c, 1, 1);
  corner(w - c, c, -1, 1);
  corner(c, h - c, 1, -1);
  corner(w - c, h - c, -1, -1);
  return canvas;
}

/** Lotus ornament in white with soft shading in alpha (tinted as foil). */
export function paintLotus(size = 512) {
  const { canvas, ctx } = createCanvas(size, size);
  const cx = size / 2;
  const cy = size * 0.66;
  const unit = size * 0.42;
  const petal = (angle, len, width, alpha) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    const g = ctx.createLinearGradient(0, 0, 0, -len);
    g.addColorStop(0, `rgba(255,255,255,${alpha})`);
    g.addColorStop(1, `rgba(255,255,255,${alpha * 0.7})`);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-width, -len * 0.35, -width * 0.6, -len * 0.8, 0, -len);
    ctx.bezierCurveTo(width * 0.6, -len * 0.8, width, -len * 0.35, 0, 0);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = size * 0.008;
    ctx.strokeStyle = 'rgba(255,255,255,1)';
    ctx.stroke();
    ctx.restore();
  };
  petal(-1.25, unit * 0.62, unit * 0.2, 0.55);
  petal(1.25, unit * 0.62, unit * 0.2, 0.55);
  petal(-0.72, unit * 0.8, unit * 0.24, 0.75);
  petal(0.72, unit * 0.8, unit * 0.24, 0.75);
  petal(0, unit * 0.98, unit * 0.28, 0.95);
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + unit * 0.05, unit * 0.44, unit * 0.075, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - unit * 0.26, cy + unit * 0.12);
  ctx.lineTo(cx + unit * 0.26, cy + unit * 0.12);
  ctx.lineTo(cx + unit * 0.17, cy + unit * 0.24);
  ctx.lineTo(cx - unit * 0.17, cy + unit * 0.24);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy - unit * 1.12, unit * 0.055, 0, Math.PI * 2);
  ctx.fill();
  return canvas;
}

/** Thin rule with a diamond in the middle. */
export function paintDivider() {
  const { canvas, ctx } = createCanvas(512, 32);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 15, 228, 2);
  ctx.fillRect(284, 15, 228, 2);
  ctx.beginPath();
  ctx.moveTo(256, 4);
  ctx.lineTo(268, 16);
  ctx.lineTo(256, 28);
  ctx.lineTo(244, 16);
  ctx.closePath();
  ctx.fill();
  return canvas;
}

/** Hairline frame that highlights the selected tab in the pocket. */
export function paintTabFrame() {
  const { canvas, ctx } = createCanvas(1024, 192);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, 1004, 172);
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, 984, 152);
  return canvas;
}
