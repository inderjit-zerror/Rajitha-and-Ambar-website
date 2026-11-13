// Paints every texture the book needs (once, at start-up) and wraps them as
// three.js textures. Nothing is downloaded: all artwork is procedural, unless the
// content file points to optional images.
import * as THREE from 'three';
import { BOOK, DETAIL_CARD, PALETTE, computeCardLayout } from './constants';
import { createCanvas, loadImage } from './paint/utils';
import { paintLinenTile } from './paint/linen';
import { paintCover, paintSpine } from './paint/cover';
import { paintEventCard, paintPocket } from './paint/cards';
import { paintPaperGrain, paintFrame, paintLotus, paintDivider, paintTabFrame } from './paint/detail';
import { paintSeal, paintSatin } from './paint/seal';
import { layoutInvitation, collectCharacters } from './layout';
import { preloadSdfFonts } from './fonts';
import { PRESETS } from './quality';

const DEFAULT_THEME = { paper: PALETTE.paper, ink: PALETTE.ink, soft: PALETTE.inkSoft, accent: '#a8843f' };

let anisotropy = 8;

function toTexture(source, { srgb = true, repeat, mipmaps = true } = {}) {
  const t = source instanceof HTMLImageElement ? new THREE.Texture(source) : new THREE.CanvasTexture(source);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = anisotropy;
  if (!mipmaps) {
    t.generateMipmaps = false;
    t.minFilter = THREE.LinearFilter;
  }
  if (repeat) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  t.needsUpdate = true;
  return t;
}

function surfaceTextures(set) {
  return {
    color: toTexture(set.color),
    bump: toTexture(set.bump, { srgb: false }),
    orm: toTexture(set.orm, { srgb: false }),
  };
}

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

export async function buildAssets({ couple, events, header, family, quality = PRESETS.medium, onProgress = () => {} }) {
  const { ppu } = quality;
  anisotropy = quality.anisotropy;
  const layout = computeCardLayout(events.length);
  const report = async (p) => {
    onProgress(p);
    await nextFrame();
  };

  const [emblemImage, ...eventImages] = await Promise.all([
    loadImage(header.emblemImage),
    ...events.map((e) => loadImage(e.image)),
  ]);
  const fontsReady = preloadSdfFonts(collectCharacters(events, header));
  await report(0.08);

  const linenTile = paintLinenTile(ppu, PALETTE.linen);
  const linen = toTexture(linenTile, { repeat: [BOOK.W, BOOK.H] });
  const linenSpine = linen.clone();
  linenSpine.repeat.set(BOOK.D + BOOK.T * 2, BOOK.H);
  await report(0.18);

  const cover = surfaceTextures(await paintCover({ ppu, family, couple, linenTile }));
  await report(0.36);
  const spine = surfaceTextures(await paintSpine({ ppu, family, couple, linenTile }));
  await report(0.46);

  const cards = [];
  for (let i = 0; i < events.length; i++) {
    cards.push(toTexture(paintEventCard(events[i], { ppu, family, layout, image: eventImages[i] })));
    await report(0.46 + ((i + 1) / events.length) * 0.22);
  }
  const pocket = toTexture(paintPocket({ ppu, layout }));
  await report(0.76);

  const seal = paintSeal({ family, monogram: couple.monogram, size: ppu >= 450 ? 512 : 384 });
  const satin = toTexture(paintSatin(), { repeat: [1, 1] });

  const invitation = {
    paper: toTexture(paintPaperGrain(quality.paper)),
    frame: toTexture(paintFrame(DETAIL_CARD.W, DETAIL_CARD.H, ppu)),
    emblem: emblemImage ? toTexture(emblemImage) : toTexture(paintLotus()),
    emblemIsImage: Boolean(emblemImage),
    emblemAspect: emblemImage ? emblemImage.width / emblemImage.height : 1,
    divider: toTexture(paintDivider()),
    layouts: events.map((event) =>
      layoutInvitation({ event, header, family, width: DETAIL_CARD.W, height: DETAIL_CARD.H })
    ),
    themes: events.map((e) => ({ ...DEFAULT_THEME, ...(e.theme || {}) })),
  };
  await report(0.86);

  const extras = {
    softShadow: toTexture(paintSoftShadow(), { srgb: false }),
    roundShadow: toTexture(paintRoundShadow(), { srgb: false }),
    edgeShadow: toTexture(paintEdgeGradient(), { srgb: false }),
    gutter: toTexture(paintGutter(), { srgb: false }),
    tabFrame: toTexture(paintTabFrame()),
    sealColor: toTexture(seal.color),
    sealBump: toTexture(seal.bump, { srgb: false }),
    ring: toTexture(paintRing()),
  };

  await fontsReady;
  onProgress(1);

  const all = [
    linen,
    linenSpine,
    ...Object.values(cover),
    ...Object.values(spine),
    ...cards,
    pocket,
    satin,
    invitation.paper,
    invitation.frame,
    invitation.emblem,
    invitation.divider,
    ...Object.values(extras),
  ];

  return {
    ppu,
    layout,
    linen,
    linenSpine,
    cover,
    spine,
    cards,
    pocket,
    satin,
    invitation,
    ...extras,
    textures: all, // for uploading to the GPU ahead of the first frame
    dispose: () => all.forEach((t) => t.dispose()),
  };
}
