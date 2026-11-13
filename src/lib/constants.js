// Book geometry (world units). The book lies on a "table" (the XY plane) and the
// camera looks down -Z at it, like a product photo shot from above.
export const BOOK = {
  W: 3, // board width
  H: 4, // board height
  T: 0.06, // board thickness
  D: 0.16, // spine width = depth of the inside of the book
};

// The inside of the front cover holds the invitation card.
export const DETAIL_CARD = {
  W: BOOK.W - 0.32,
  H: BOOK.H - 0.32,
};

// Colour palette used by the painted textures and materials.
export const PALETTE = {
  linen: '#8fadcd', // cover cloth
  linenDeep: '#7d9cc0',
  foil: '#f4f6f7', // white/pearl foil on the cover
  paper: '#f7f2e6', // invitation card stock
  ink: '#34549a', // invitation text
  inkSoft: '#5a73a8',
  silver: '#a9b0b8',
  table: '#e9e2d7',
};

// Right page: the pocket of event cards.
export function computeCardLayout(count) {
  const margin = 0.14;
  const top = BOOK.H / 2 - margin; // top of the first (back-most) card
  const pocketTop = -0.07; // highest point of the pocket's top edge
  const pocketDip = -0.17; // lowest point of the pocket's top edge
  const pocketBottom = -BOOK.H / 2 + 0.1;
  const n = Math.max(1, count);
  const band = (top - pocketTop) / n; // visible height of each card tab
  const lastTop = top - (n - 1) * band;
  const cardH = Math.max(top - pocketDip + 0.12, lastTop - pocketBottom - 0.05);
  const cardW = BOOK.W - margin * 2;
  const cards = Array.from({ length: n }, (_, i) => {
    const cardTop = top - i * band;
    return {
      top: cardTop,
      centerY: cardTop - cardH / 2,
      z: 0.006 + i * 0.006,
      hiddenOffset: -(cardTop - pocketDip + 0.08),
    };
  });
  return {
    cardW,
    cardH,
    band,
    cards,
    pocket: {
      left: -BOOK.W / 2 + 0.1,
      right: BOOK.W / 2 - 0.1,
      bottom: pocketBottom,
      topLeft: pocketTop,
      dipX: 0.78,
      dipY: pocketDip,
      topRight: pocketTop,
      z: 0.006 + n * 0.006 + 0.004,
    },
  };
}
