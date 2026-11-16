// Two font pipelines:
//  • CSS / canvas: Cormorant Garamond via next/font (CSS variable --font-serif),
//    used for the DOM and for the painted textures (cover, card tabs).
//  • 3D text: the same family as .woff files in /public/fonts, rendered as crisp
//    SDF text (troika-three-text) on the invitation card.
//
// No three.js / troika imports here: this module is part of the first-load
// bundle (troika's glyph warm-up lives in ./invitationCard.js).

const FALLBACK = "'Cormorant Garamond', 'Times New Roman', serif";

export function getSerifFamily() {
  if (typeof window === 'undefined') return FALLBACK;
  const value = getComputedStyle(document.documentElement).getPropertyValue('--font-serif').trim();
  return value || FALLBACK;
}

export async function loadSerifFonts(family) {
  if (typeof document === 'undefined' || !document.fonts) return;
  const variants = ['400', '500', '600', '700', 'italic 500', 'italic 600'];
  const timeout = new Promise((resolve) => setTimeout(resolve, 4000));
  await Promise.race([
    Promise.all(variants.map((v) => document.fonts.load(`${v} 48px ${family}`, 'R&A Sangeet').catch(() => null))),
    timeout,
  ]);
}

const SDF_FONTS = {
  '500-normal': '/fonts/cormorant-500-normal.woff',
  '600-normal': '/fonts/cormorant-600-normal.woff',
  '700-normal': '/fonts/cormorant-700-normal.woff',
  '500-italic': '/fonts/cormorant-500-italic.woff',
  '600-italic': '/fonts/cormorant-600-italic.woff',
};

export function sdfFont(weight = 500, style = 'normal') {
  const w = weight >= 650 ? 700 : weight >= 550 ? 600 : 500;
  const key = `${style === 'italic' ? Math.min(w, 600) : w}-${style}`;
  return SDF_FONTS[key] || SDF_FONTS['500-normal'];
}
