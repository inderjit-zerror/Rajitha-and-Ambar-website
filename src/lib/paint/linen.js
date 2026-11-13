import { createCanvas, seeded, rgba } from './utils';

/**
 * A tileable book-cloth (linen) swatch. `size` px = 1 world unit.
 * Threads are drawn as short segments of varying brightness (slubs) in both
 * directions plus a tiny over/under weave checker.
 */
export function paintLinenTile(size, base, seed = 7) {
  const rand = seeded(seed);
  const { canvas, ctx } = createCanvas(size, size);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  const threads = 180;
  const step = size / threads;

  // over / under weave
  for (let y = 0; y < threads; y++) {
    for (let x = 0; x < threads; x++) {
      if ((x + y) % 2 === 0) {
        ctx.fillStyle = `rgba(255,255,255,${0.025 + rand() * 0.025})`;
      } else {
        ctx.fillStyle = `rgba(0,0,0,${0.02 + rand() * 0.025})`;
      }
      ctx.fillRect(x * step, y * step, step, step);
    }
  }

  const drawThreads = (horizontal) => {
    for (let i = 0; i < threads; i++) {
      const p = i * step + step / 2;
      let t = -rand() * step * 6;
      while (t < size) {
        const len = step * (2 + rand() * 14);
        const light = rand() < 0.5;
        ctx.strokeStyle = light
          ? `rgba(255,255,255,${0.02 + rand() * 0.06})`
          : `rgba(10,20,40,${0.02 + rand() * 0.05})`;
        ctx.lineWidth = step * (0.35 + rand() * 0.45);
        ctx.beginPath();
        if (horizontal) {
          ctx.moveTo(t, p);
          ctx.lineTo(t + len, p);
        } else {
          ctx.moveTo(p, t);
          ctx.lineTo(p, t + len);
        }
        ctx.stroke();
        t += len;
      }
    }
  };
  drawThreads(true);
  drawThreads(false);

  // occasional thicker slubs, typical of real linen
  for (let i = 0; i < 45; i++) {
    const horizontal = rand() < 0.6;
    const p = Math.floor(rand() * threads) * step + step / 2;
    const t = rand() * size;
    const len = step * (6 + rand() * 30);
    ctx.strokeStyle = rand() < 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,10,30,0.07)';
    ctx.lineWidth = step * (0.8 + rand() * 0.6);
    ctx.beginPath();
    if (horizontal) {
      ctx.moveTo(t, p);
      ctx.lineTo(t + len, p);
    } else {
      ctx.moveTo(p, t);
      ctx.lineTo(p, t + len);
    }
    ctx.stroke();
  }

  // soft large-scale tonal variation (dye irregularity)
  for (let i = 0; i < 18; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = size * (0.15 + rand() * 0.35);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const dark = rand() < 0.5;
    g.addColorStop(0, dark ? 'rgba(0,10,40,0.035)' : 'rgba(255,255,255,0.04)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    // draw wrapped so the tile stays seamless
    for (const ox of [-size, 0, size]) {
      for (const oy of [-size, 0, size]) {
        ctx.save();
        ctx.translate(ox, oy);
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
        ctx.restore();
      }
    }
  }
  return canvas;
}

/** Fills an area with a linen tile (tile size px = 1 unit). */
export function fillWithLinen(ctx, tile, w, h) {
  const pattern = ctx.createPattern(tile, 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
}

/** Slight darkening at the edges of a cloth-covered board (wear / wrap). */
export function boardEdgeShade(ctx, w, h, color = '#1d2c48', strength = 0.16) {
  const e = Math.min(w, h) * 0.05;
  const sides = [
    [0, 0, w, e, 0, 0, 0, e],
    [0, h - e, w, e, 0, h, 0, h - e],
    [0, 0, e, h, 0, 0, e, 0],
    [w - e, 0, e, h, w, 0, w - e, 0],
  ];
  sides.forEach(([x, y, sw, sh, gx0, gy0, gx1, gy1]) => {
    const g = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
    g.addColorStop(0, rgba(color, strength));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x, y, sw, sh);
  });
}
