// Lays out the invitation card text for one event (in card units, origin at the
// card centre, y up). Line breaks are measured with canvas using the same font
// as the 3D SDF text, so the layout is deterministic and auto-fits the card.
import { createCanvas, wrapText } from './paint/utils';
import { sdfFont } from './fonts';

const PX = 200; // measuring resolution (px per world unit)

/** What is printed on an event's invitation card, top to bottom. */
function invitationBlocks(event, header) {
  const d = event.detail || {};
  const blocks = [];
  const text = (value, opts) => {
    if (value === undefined || value === null || String(value).trim() === '') return;
    blocks.push({ kind: 'text', text: String(value), ...opts });
  };
  const gap = (size) => blocks.push({ kind: 'gap', size });

  // sizes are fractions of the card height
  text(header.blessing, { size: 0.025, weight: 600, role: 'soft', spacing: 0.06 });
  gap(0.016);
  blocks.push({ kind: 'emblem', size: 0.11 });
  gap(0.02);
  text(header.hosts, { size: 0.0285, weight: 600, role: 'ink', lh: 1.28 });
  text(d.invitationLine, { size: 0.0285, weight: 600, role: 'ink', lh: 1.28 });
  gap(0.012);
  text(header.bride, { size: 0.062, weight: 600, role: 'ink', lh: 1.05 });
  text(header.joiner, { size: 0.031, weight: 500, style: 'italic', role: 'soft', lh: 1.05 });
  text(header.groom, { size: 0.062, weight: 600, role: 'ink', lh: 1.05 });
  text(header.groomParents, { size: 0.026, weight: 600, role: 'ink', lh: 1.3 });
  gap(0.018);
  blocks.push({ kind: 'divider', size: 0.022 });
  gap(0.018);
  text(String(event.title || '').toUpperCase(), { size: 0.043, weight: 700, role: 'accent', spacing: 0.24, lh: 1.15 });
  text(d.tagline, { size: 0.029, weight: 500, style: 'italic', role: 'soft', lh: 1.3 });
  gap(0.014);
  text(d.date, { size: 0.036, weight: 700, role: 'ink', lh: 1.22 });
  text(d.time, { size: 0.03, weight: 600, role: 'ink', lh: 1.25 });
  gap(0.01);
  text(d.venue, { size: 0.033, weight: 700, role: 'ink', lh: 1.25 });
  text(d.address, { size: 0.027, weight: 600, role: 'soft', lh: 1.3 });
  if (d.dressCode || d.note) gap(0.014);
  text(d.dressCode, { size: 0.028, weight: 600, style: 'italic', role: 'ink', lh: 1.3 });
  text(d.note, { size: 0.027, weight: 500, style: 'italic', role: 'soft', lh: 1.3 });
  return blocks;
}

export function layoutInvitation({ event, header, family, width, height }) {
  const { ctx } = createCanvas(8, 8);
  const blocks = invitationBlocks(event, header);
  const maxWidth = width * 0.84;
  const measure = (scale) => {
    let total = 0;
    blocks.forEach((b) => {
      const size = b.size * height * scale;
      if (b.kind === 'gap') b.h = size;
      else if (b.kind === 'emblem') b.h = size * 1.3;
      else if (b.kind === 'divider') b.h = size;
      else {
        ctx.font = `${b.style || 'normal'} ${b.weight} ${size * PX}px ${family}`;
        const spacing = (b.spacing || 0) * size * PX;
        b.lines = wrapText(ctx, b.text, maxWidth * PX, spacing);
        b.lineH = size * (b.lh || 1.25);
        b.h = b.lines.length * b.lineH;
      }
      total += b.h;
    });
    return total;
  };

  const available = height * 0.86;
  let scale = 1;
  let total = measure(scale);
  if (total > available) {
    scale = available / total;
    total = measure(scale);
  }

  const items = [];
  let y = total / 2; // top of the content block (card centre = 0)
  blocks.forEach((b) => {
    const size = b.size * height * scale;
    if (b.kind === 'emblem') items.push({ kind: 'emblem', y: y - b.h / 2, size: size * 1.2 });
    else if (b.kind === 'divider') items.push({ kind: 'divider', y: y - b.h / 2, width: width * 0.4 });
    else if (b.kind === 'text') {
      b.lines.forEach((line, i) => {
        items.push({
          kind: 'text',
          text: line,
          y: y - b.lineH * (i + 0.5),
          size,
          weight: b.weight,
          style: b.style || 'normal',
          role: b.role,
          spacing: b.spacing || 0,
        });
      });
    }
    y -= b.h;
  });
  return items;
}

/**
 * The characters each SDF font prints on the cards (font URL → string), for
 * glyph preloading: only the glyphs that are really used, and no font that
 * isn't.
 */
export function charactersByFont(events, header) {
  const sets = new Map();
  events.forEach((event) => {
    invitationBlocks(event, header).forEach((block) => {
      if (block.kind !== 'text') return;
      const font = sdfFont(block.weight, block.style);
      if (!sets.has(font)) sets.set(font, new Set());
      for (const c of block.text) if (c.trim()) sets.get(font).add(c);
    });
  });
  return new Map([...sets].map(([font, chars]) => [font, [...chars].join('')]));
}
