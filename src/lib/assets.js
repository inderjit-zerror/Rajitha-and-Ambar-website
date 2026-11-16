// Wraps the painted canvases (see ./paint/index.js) as three.js textures.
// Painting happens before this, while the 3D chunk downloads; this step is
// cheap (no pixels are touched until Warmup uploads them to the GPU).
import * as THREE from 'three';
import { BOOK } from './constants';
import { PRESETS } from './quality';

function toTexture(source, { srgb = true, repeat, mipmaps = true, anisotropy }) {
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

export function createTextures(painted, quality = PRESETS.medium) {
  const texture = (source, options = {}) => toTexture(source, { anisotropy: quality.anisotropy, ...options });
  const surface = (set) => ({
    color: texture(set.color),
    bump: texture(set.bump, { srgb: false }),
    orm: texture(set.orm, { srgb: false }),
  });

  const linen = texture(painted.linenTile, { repeat: [BOOK.W, BOOK.H] });
  const linenSpine = linen.clone();
  linenSpine.repeat.set(BOOK.D + BOOK.T * 2, BOOK.H);

  const cover = surface(painted.cover);
  const spine = surface(painted.spine);
  const cards = painted.cards.map((card) => texture(card));
  const pocket = texture(painted.pocket);
  const satin = texture(painted.satin, { repeat: [1, 1] });

  const inv = painted.invitation;
  const invitation = {
    ...inv,
    paper: texture(inv.paper),
    frame: texture(inv.frame),
    emblem: texture(inv.emblem),
    divider: texture(inv.divider),
  };

  const e = painted.extras;
  const extras = {
    softShadow: texture(e.softShadow, { srgb: false }),
    roundShadow: texture(e.roundShadow, { srgb: false }),
    edgeShadow: texture(e.edgeShadow, { srgb: false }),
    gutter: texture(e.gutter, { srgb: false }),
    tabFrame: texture(e.tabFrame),
    sealColor: texture(painted.seal.color),
    sealBump: texture(painted.seal.bump, { srgb: false }),
    ring: texture(e.ring),
  };

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
    ppu: painted.ppu,
    layout: painted.layout,
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
