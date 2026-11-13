// Wax seal (stamped R&A) and satin ribbon textures.
import { createCanvas, seeded, grain } from './utils';
import { drawMonogram } from './cover';

/** Draws the stamp design: raised ring, dotted border, monogram. */
function stamp(ctx, size, family, monogram, color) {
  const c = size / 2;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.018;
  ctx.beginPath();
  ctx.arc(c, c, size * 0.34, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = size * 0.008;
  ctx.beginPath();
  ctx.arc(c, c, size * 0.3, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(c + Math.cos(a) * size * 0.32, c + Math.sin(a) * size * 0.32, size * 0.006, 0, Math.PI * 2);
    ctx.fill();
  }
  drawMonogram(ctx, c - size * 0.005, c - size * 0.09, size * 0.3, family, monogram);
}

export function paintSeal({ family, monogram, size = 512 }) {
  const rand = seeded(77);
  // height map: body 50% grey, recessed stamp disc, raised design
  const bump = createCanvas(size, size);
  const b = bump.ctx;
  b.fillStyle = '#909090';
  b.fillRect(0, 0, size, size);
  b.save();
  b.shadowColor = '#5a5a5a';
  b.shadowBlur = size * 0.03;
  b.fillStyle = '#5c5c5c';
  b.beginPath();
  b.arc(size / 2, size / 2, size * 0.37, 0, Math.PI * 2);
  b.fill();
  b.restore();
  b.save();
  b.shadowColor = '#ffffff';
  b.shadowBlur = size * 0.008;
  stamp(b, size, family, monogram, '#e8e8e8');
  b.restore();
  grain(b, size, size, { amount: 0.08, rand });

  // colour: antique gold wax, lighter on the raised design
  const color = createCanvas(size, size);
  const c = color.ctx;
  const g = c.createRadialGradient(size * 0.42, size * 0.38, 0, size / 2, size / 2, size * 0.55);
  g.addColorStop(0, '#e2c486');
  g.addColorStop(0.6, '#c4a062');
  g.addColorStop(1, '#9c7a43');
  c.fillStyle = g;
  c.fillRect(0, 0, size, size);
  c.fillStyle = 'rgba(90,60,25,0.25)';
  c.beginPath();
  c.arc(size / 2, size / 2, size * 0.37, 0, Math.PI * 2);
  c.fill();
  stamp(c, size, family, monogram, 'rgba(255,236,190,0.65)');
  for (let i = 0; i < 40; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = size * (0.02 + rand() * 0.08);
    const rg = c.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, rand() < 0.5 ? 'rgba(255,240,200,0.12)' : 'rgba(80,50,20,0.12)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = rg;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return { color: color.canvas, bump: bump.canvas };
}

/** Satin weave: fine lengthwise threads (along the canvas height). */
export function paintSatin() {
  const rand = seeded(31);
  const { canvas, ctx } = createCanvas(128, 512);
  ctx.fillStyle = '#f4f4f2';
  ctx.fillRect(0, 0, 128, 512);
  for (let x = 0; x < 128; x += 2) {
    ctx.fillStyle = rand() < 0.5 ? `rgba(255,255,255,${0.2 + rand() * 0.3})` : `rgba(0,0,0,${0.03 + rand() * 0.05})`;
    ctx.fillRect(x, 0, 1, 512);
  }
  // woven selvedge edges
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(0, 0, 5, 512);
  ctx.fillRect(123, 0, 5, 512);
  return canvas;
}
