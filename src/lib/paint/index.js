// Paints every texture the book needs, once, at start-up, as plain canvases.
// Nothing is downloaded: all artwork is procedural, unless the content file
// points to optional images.
//
// This module does not touch three.js, so it lives in its own small chunk and
// runs while the (much larger) 3D chunk is still downloading. Stage then wraps
// the canvases as GPU textures (see ../assets.js).
import { DETAIL_CARD, PALETTE, computeCardLayout } from '../constants';
import { layoutInvitation } from '../layout';
import { PRESETS } from '../quality';
import { createCanvas, loadImage } from './utils';
import { paintLinenTile } from './linen';
import { paintCover, paintSpine } from './cover';
import { paintEventCard, paintPocket } from './cards';
import { paintPaperGrain, paintFrame, paintLotus, paintDivider, paintTabFrame } from './detail';
import { paintSeal, paintSatin } from './seal';

const DEFAULT_THEME = { paper: PALETTE.paper, ink: PALETTE.ink, soft: PALETTE.inkSoft, accent: '#a8843f' };

/** Blurred rectangle used as a soft contact shadow (works in every browser). */
function paintSoftShadow(size = 256, inset = 0.2, blur = 0.12) {
  const { canvas, ctx } = createCanvas(size, size);
  ctx.shadowColor = 'rgba(0,0,0,1)';
  ctx.shadowBlur = size * blur;
  ctx.shadowOffsetX = size * 4;
  ctx.fillStyle = '#000';
  ctx.fillRect(size * inset - size * 4, size * inset, size * (1 - inset * 2), size * (1 - inset * 2));
  return canvas;
}

/** Soft round shadow (for the wax seal). */
function paintRoundShadow(size = 128) {
  const { canvas, ctx } = createCanvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(0,0,0,0.55)');
  g.addColorStop(0.55, 'rgba(0,0,0,0.3)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

/** Vertical gradient: dark at the bottom, clear at the top (edge occlusion). */
function paintEdgeGradient() {
  const { canvas, ctx } = createCanvas(4, 128);
  const g = ctx.createLinearGradient(0, 128, 0, 0);
  g.addColorStop(0, 'rgba(0,0,0,0.42)');
  g.addColorStop(0.35, 'rgba(0,0,0,0.16)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 128);
  return canvas;
}

/** Horizontal shading for the spine gutter: dark creases at both hinges. */
function paintGutter() {
  const { canvas, ctx } = createCanvas(128, 4);
  const g = ctx.createLinearGradient(0, 0, 128, 0);
  [
    [0, 0],
    [0.17, 0.3],
    [0.3, 0.1],
    [0.5, 0.05],
    [0.7, 0.1],
    [0.83, 0.3],
    [1, 0],
  ].forEach(([t, a]) => g.addColorStop(t, `rgba(10,22,45,${a})`));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 4);
  return canvas;
}

/** Soft gold ring (the shock-wave when the seal bursts). */
function paintRing(size = 256) {
  const { canvas, ctx } = createCanvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,220,150,0)');
  g.addColorStop(0.62, 'rgba(255,220,150,0)');
  g.addColorStop(0.8, 'rgba(255,232,180,1)');
  g.addColorStop(0.9, 'rgba(255,214,140,0.35)');
  g.addColorStop(1, 'rgba(255,214,140,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

// let the browser paint (so the loader can show progress) between heavy steps
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

// (AbortSignal.throwIfAborted is missing from some of the browsers we support)
function checkAborted(signal) {
  if (signal?.aborted) throw new DOMException('Painting was cancelled', 'AbortError');
}

/**
 * Returns canvases (or loaded images) for every surface, plus the measured
 * invitation layouts. `signal` (an AbortSignal) stops the work between steps.
 */
export async function paintAssets({ couple, events, header, family, quality = PRESETS.medium, onProgress = () => {}, signal }) {
  const { ppu } = quality;
  const layout = computeCardLayout(events.length);
  const report = async (p) => {
    checkAborted(signal);
    onProgress(p);
    await nextFrame();
    checkAborted(signal);
  };

  const [emblemImage, ...eventImages] = await Promise.all([
    loadImage(header.emblemImage),
    ...events.map((e) => loadImage(e.image)),
  ]);
  await report(0.08);

  const linenTile = paintLinenTile(ppu, PALETTE.linen);
  await report(0.18);

  const cover = await paintCover({ ppu, family, couple, linenTile });
  await report(0.36);
  const spine = await paintSpine({ ppu, family, couple, linenTile });
  await report(0.46);

  const cards = [];
  for (let i = 0; i < events.length; i++) {
    cards.push(paintEventCard(events[i], { ppu, family, layout, image: eventImages[i] }));
    await report(0.46 + ((i + 1) / events.length) * 0.22);
  }
  const pocket = paintPocket({ ppu, layout });
  await report(0.76);

  const seal = paintSeal({ family, monogram: couple.monogram, size: ppu >= 450 ? 512 : 384 });
  const satin = paintSatin();

  const invitation = {
    paper: paintPaperGrain(quality.paper),
    frame: paintFrame(DETAIL_CARD.W, DETAIL_CARD.H, ppu),
    emblem: emblemImage || paintLotus(),
    emblemIsImage: Boolean(emblemImage),
    emblemAspect: emblemImage ? emblemImage.width / emblemImage.height : 1,
    divider: paintDivider(),
    layouts: events.map((event) =>
      layoutInvitation({ event, header, family, width: DETAIL_CARD.W, height: DETAIL_CARD.H })
    ),
    themes: events.map((e) => ({ ...DEFAULT_THEME, ...(e.theme || {}) })),
  };
  await report(0.86);

  const extras = {
    softShadow: paintSoftShadow(),
    roundShadow: paintRoundShadow(),
    edgeShadow: paintEdgeGradient(),
    gutter: paintGutter(),
    tabFrame: paintTabFrame(),
    ring: paintRing(),
  };
  checkAborted(signal);
  onProgress(1);

  return { ppu, layout, linenTile, cover, spine, cards, pocket, seal, satin, invitation, extras };
}
