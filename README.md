# Rajitha & Ambar — 3D wedding invitation

A Next.js + React Three Fiber site. While it loads, the R&A monogram draws itself in
ink and a gold ring traces the real loading progress; the screen then opens like an
iris onto a low camera shot gliding across the table to a linen-bound invitation
book, tied with a satin ribbon and sealed in gold wax. On **Click To Open** the seal
glows and bursts into gold sparks, the ribbon is pulled back around the edges, and
the book rises towards the guest, opens in mid-air, then settles open on the table.
The left page holds the invitation card; the right page holds a pocket of event
cards. Choosing an event flips the invitation card over to that event, in its own
colours, and the text writes itself in.

```bash
npm run dev
```

Open http://localhost:3000.

Shortcuts while editing:
- `/?open` opens the book automatically
- `/?open&event=2` starts on the third event
- `/?read` opens straight into reading mode
- `/?quality=low` (or `medium`, `high`) forces a device tier; `/?quality=flat` shows the no-WebGL fallback

## Interactions

| Action | Result |
| --- | --- |
| Click the button, the seal or the book | Opens the book |
| Click a card in the pocket, or a tab in the bottom bar | Flips the invitation to that event |
| Click the invitation card (or **Read**, or press `R`) | Reading mode: the card lifts toward you |
| `←` / `→` | Previous / next event |
| `Esc` | Leave reading mode |

On phones, tapping an event opens it straight in reading mode.

## Editing the content

Everything printed in the book lives in **`src/content/invitation.js`**:

| What | Where |
| --- | --- |
| Cover monogram, names, location | `couple` |
| Blessing, hosts, bride/groom lines on the invitation card | `invitationHeader` |
| Events: title, tab artwork, card colours (`theme`), details | `events` |
| On-screen labels (button, hints, reader controls) | `ui` |

- Remove a detail field (or set it to `""`) and it simply isn't printed; the
  card re-lays itself out and shrinks the text if needed.
- `theme` sets each event's card colours: `paper`, `ink`, `soft` (secondary text)
  and `accent` (gold foil title, border and emblem).
- `artwork` picks the painted tab illustration: `curtains`, `cypress`, `riviera`, `palms`.
- Use your own art: put a file in `public/images/` and set `image: '/images/sangeet.jpg'`
  on an event, or `emblemImage: '/images/ganesha.png'` in `invitationHeader`.

## How it's built

| File | Role |
| --- | --- |
| `src/components/Experience.jsx` | State: loading → intro → ready → opening → open, plus reading mode and keys; starts the texture painting |
| `src/components/Overlay.jsx` | DOM layer: loader, button, event bar, reading controls |
| `src/components/Stage.jsx` | Client-only 3D chunk: turns the painted canvases into textures, creates the WebGL renderer, reports failures |
| `src/components/StagePreload.jsx` | Entry point of the 3D chunk; also puts a preload hint for it in the HTML |
| `src/components/FlatInvitation.jsx` | Plain HTML invitation for devices without WebGL2 (or if the GPU gives up) |
| `src/lib/quality.js` | Device tiers (high / medium / low / flat): resolution, textures, effects, frame caps |
| `src/components/three/Performance.jsx` | On-demand frames, shadow caching, adaptive resolution, context-loss recovery |
| `src/components/three/Book.jsx` | Bevelled boards, hinges, ribbon + wax seal, bookmark, intro/open timelines |
| `src/lib/invitationCard.js` | Two-sided invitation card: SDF text, theme colours, flip animation |
| `src/components/three/EventPocket.jsx` | Pocket and cards: reveal, hover, selection frame |
| `src/components/three/CameraRig.jsx` | Cinematic camera paths + responsive framing |
| `src/lib/layout.js` | Measures and lays out the invitation text for each event |
| `src/lib/geometry.js` | Bevelled board, cracked seal halves, ribbon strips |
| `src/lib/paint/*` | Procedural canvas painting: linen, foil cover, illustrations, wax (`paint/index.js` paints everything) |
| `src/lib/environment.js` | Reflection environment (PMREM), with its filter shaders compiled in the background |

Invitation text uses Cormorant Garamond `.woff` files in `public/fonts`
(SIL Open Font License, see `public/fonts/OFL.txt`) rendered as SDF text, so it stays
sharp at any zoom. All other artwork is painted procedurally at start-up.

### Loading

Everything runs side by side rather than one step after another:

1. The HTML carries the loader (drawn by CSS straight away) and a preload hint for
   the 3D chunk (three.js, ~290 KB gzipped), which downloads alongside the page's scripts.
2. Once the page runs, the textures are painted on canvases (`paint/index.js`, a small
   chunk with no three.js) while the 3D chunk is still arriving.
3. When the 3D chunk arrives, the renderer is created, the reflection environment is
   built and the SDF glyphs are generated (only the characters each font actually prints).
4. The textures are uploaded and the shaders compiled behind the loader, then it opens.

Keep anything that imports `three` or `troika-three-text` out of `Experience.jsx`,
`Overlay.jsx`, `fonts.js`, `layout.js` and `paint/*`: those load before the 3D chunk.
