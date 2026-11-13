/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  ALL INVITATION CONTENT LIVES HERE
 * ─────────────────────────────────────────────────────────────────────────────
 *  Edit any text below and save — the 3D book repaints itself automatically.
 *
 *  • `couple`  → what is printed on the outside of the book (front cover + spine)
 *  • `events`  → the cards in the pocket (right page). Clicking a card flips the
 *                invitation card (left page) to that event's `detail`, in that
 *                event's `theme` colours. The first event is shown by default.
 *
 *  Tips
 *  • Use "\n" inside a string to force a line break.
 *  • Any detail field can be removed (or set to "") and it simply won't be printed.
 *  • You can add or remove events — the pocket adapts (it looks best with 3–5).
 *  • `artwork` picks the painted illustration on a card's tab:
 *      "curtains" | "cypress" | "riviera" | "palms"
 *    Or set `image: "/images/your-file.jpg"` (put the file in /public/images) to use
 *    your own artwork instead of the painted one.
 *  • `theme` colours the invitation card when that event is selected:
 *      paper  → card stock          ink    → main text
 *      soft   → secondary text      accent → foil (title, border, emblem)
 *
 *  ⚠ Dates, times, venues and dress codes below are PLACEHOLDERS — replace them.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const couple = {
  monogram: { first: 'R', second: 'A' },
  names: 'Rajitha & Ambar',
  location: 'Cannes, France',
};

/** Shared lines printed at the top of every invitation card (left page). */
export const invitationHeader = {
  blessing: 'Om Ganeshaya Namaha',
  // Optional: path to your own deity / emblem artwork (transparent PNG works best),
  // e.g. "/images/ganesha.png". When empty, a foil lotus ornament is used.
  emblemImage: '',
  hosts:
    'Sri Penaka Venkata Ramprasad & Smt. Subha Sri\nrequest the pleasure of your company',
  bride: 'Rajitha Penaka',
  joiner: 'with',
  groom: 'Ambar Kumar',
  groomParents: 'Son of Sri Sharvan Kumar & Smt. Seema Kumar',
};

export const events = [
  {
    id: 'sangeet',
    title: 'Sangeet', // printed on the card tab (right page)
    artwork: 'curtains',
    // image: '/images/sangeet.jpg',
    theme: { paper: '#1f4a3a', ink: '#f4e9cc', soft: '#d8cba6', accent: '#d2b26e' },
    detail: {
      invitationLine: 'at the Sangeet celebrations of',
      tagline: 'An evening of music, dance & laughter',
      date: 'Thursday, 10 June 2027',
      time: '7:00 PM onwards',
      venue: 'The Garden Terrace',
      address: 'Boulevard de la Croisette, Cannes',
      dressCode: 'Dress code · Indo-Western glam',
      note: 'Bring your dancing shoes',
    },
  },
  {
    id: 'varmala',
    title: 'Varmala',
    artwork: 'cypress',
    theme: { paper: '#e4edf3', ink: '#24426c', soft: '#4b6890', accent: '#8a6f3c' },
    detail: {
      invitationLine: 'at the Varmala ceremony of',
      tagline: 'The exchange of garlands',
      date: 'Friday, 11 June 2027',
      time: '10:30 AM',
      venue: 'The Cypress Lawn',
      address: 'Route de Super-Cannes, Cannes',
      dressCode: 'Dress code · Pastel traditional',
      note: 'Baraat begins at 10:00 AM',
    },
  },
  {
    id: 'wedding',
    title: 'Wedding',
    artwork: 'riviera',
    theme: { paper: '#f8f2e3', ink: '#2c4c8c', soft: '#56699a', accent: '#a8843f' },
    detail: {
      invitationLine: 'at the wedding celebrations of',
      tagline: 'Pheras by the Mediterranean',
      date: 'Friday, 11 June 2027',
      time: 'Muhurtham · 12:15 PM',
      venue: 'The Sea Pavilion',
      address: 'Pointe Croisette, Cannes',
      dressCode: 'Dress code · Traditional Indian',
      note: 'Lunch to follow',
    },
  },
  {
    id: 'reception',
    title: 'Reception',
    artwork: 'palms',
    theme: { paper: '#203357', ink: '#f5ecd8', soft: '#cfc6b2', accent: '#d6b878' },
    detail: {
      invitationLine: 'at the wedding reception of',
      tagline: 'Dinner & dancing under the stars',
      date: 'Saturday, 12 June 2027',
      time: '7:30 PM onwards',
      venue: 'The Palm Ballroom',
      address: 'Boulevard de la Croisette, Cannes',
      dressCode: 'Dress code · Black tie',
      note: 'Carriages at midnight',
    },
  },
];

/** Text shown on screen (outside the book). */
export const ui = {
  invitedLine: 'You are cordially invited',
  openButton: 'Click To Open',
  hint: 'Choose an event card · click the invitation to read it',
  hintMobile: 'Tap an event to read its invitation',
  readHint: 'Use ← → to browse · Esc to go back',
  close: 'Back to book',
  previous: 'Previous event',
  next: 'Next event',
  loading: 'Preparing your invitation',
};
