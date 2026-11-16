// The invitation card on the inside of the front cover (left page).
//
// A real two-sided card: each side has its own paper colour, foil frame, emblem
// and crisp SDF text (troika). Selecting another event lifts the card, flips it
// over to reveal the other side (already printed with the new event in its own
// colours), lands it, and writes the text in line by line.
import * as THREE from 'three';
import gsap from 'gsap';
import { Text, preloadFont } from 'troika-three-text';
import { DETAIL_CARD } from './constants';
import { sdfFont } from './fonts';
import { settle } from './activity';

const W = DETAIL_CARD.W;
const H = DETAIL_CARD.H;
const DEPTH = 0.008;
const FLIP_CLEARANCE = (W / 2) * 0.97 + 0.32; // keeps the card above the page while edge-on

/**
 * Warm up troika's glyph atlas so text never pops in late.
 * charactersByFont: Map of font URL → characters (see charactersByFont in layout.js)
 */
export function preloadSdfFonts(charactersByFont) {
  const timeout = new Promise((resolve) => setTimeout(resolve, 6000));
  const all = [...charactersByFont].map(
    ([font, characters]) => new Promise((resolve) => preloadFont({ font, characters }, () => resolve()))
  );
  return Promise.race([Promise.all(all), timeout]);
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (t) => t * t * (3 - 2 * t);

export function createInvitationCard(assets) {
  const inv = assets.invitation;
  const root = new THREE.Group();
  const disposables = [];
  const track = (o) => {
    disposables.push(o);
    return o;
  };

  // soft shadow on the linen that follows the card's lift
  const shadowMat = track(
    new THREE.MeshBasicMaterial({ map: assets.softShadow, transparent: true, opacity: 0.42, depthWrite: false })
  );
  const shadow = new THREE.Mesh(track(new THREE.PlaneGeometry(W * 1.28, H * 1.2)), shadowMat);
  shadow.position.set(0.035, -0.05, 0.0015);
  shadow.raycast = () => {};
  root.add(shadow);

  const card = new THREE.Group();
  const baseZ = DEPTH / 2 + 0.002;
  card.position.z = baseZ;
  root.add(card);

  const body = new THREE.Mesh(
    track(new THREE.BoxGeometry(W, H, DEPTH)),
    track(new THREE.MeshStandardMaterial({ color: '#f1ece2', roughness: 0.9 }))
  );
  body.castShadow = true;
  card.add(body);

  const plane = track(new THREE.PlaneGeometry(1, 1));

  const createFace = (index) => {
    const group = new THREE.Group();
    if (index === 1) group.rotation.y = Math.PI;
    card.add(group);
    const z = DEPTH / 2;
    const paperMat = track(new THREE.MeshStandardMaterial({ map: inv.paper, roughness: 0.8, metalness: 0 }));
    const paper = new THREE.Mesh(plane, paperMat);
    paper.scale.set(W, H, 1);
    paper.position.z = z + 0.0004;
    paper.receiveShadow = true;
    group.add(paper);

    const foil = (map, metal = 0.6) =>
      track(new THREE.MeshStandardMaterial({ map, transparent: true, depthWrite: false, roughness: 0.32, metalness: metal }));
    const frameMat = foil(inv.frame);
    const frame = new THREE.Mesh(plane, frameMat);
    frame.scale.set(W, H, 1);
    frame.position.z = z + 0.0008;
    group.add(frame);

    const emblemMat = foil(inv.emblem, inv.emblemIsImage ? 0 : 0.6);
    const emblem = new THREE.Mesh(plane, emblemMat);
    emblem.position.z = z + 0.001;
    group.add(emblem);

    const dividerMat = foil(inv.divider);
    const divider = new THREE.Mesh(plane, dividerMat);
    divider.position.z = z + 0.001;
    group.add(divider);

    return { group, paperMat, frameMat, emblem, emblemMat, divider, dividerMat, texts: [], ordered: [], reveal: { v: 0 }, z };
  };

  const faces = [createFace(0), createFace(1)];

  const setFace = (face, eventIndex) => {
    gsap.killTweensOf(face.reveal);
    face.reveal.v = 0;
    const theme = inv.themes[eventIndex];
    const items = inv.layouts[eventIndex] || [];
    face.paperMat.color.set(theme.paper);
    face.frameMat.color.set(theme.accent);
    face.dividerMat.color.set(theme.accent);
    face.emblemMat.color.set(inv.emblemIsImage ? '#ffffff' : theme.accent);

    const textItems = items.filter((it) => it.kind === 'text');
    while (face.texts.length < textItems.length) {
      const t = new Text();
      t.anchorX = 'center';
      t.anchorY = 'middle';
      t.material = track(new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0, transparent: true }));
      t.raycast = () => {};
      face.group.add(t);
      face.texts.push(t);
    }

    face.ordered = [];
    let textIndex = 0;
    face.emblem.visible = false;
    face.divider.visible = false;
    items.forEach((it) => {
      if (it.kind === 'emblem') {
        face.emblem.visible = true;
        face.emblem.scale.set(it.size * inv.emblemAspect, it.size, 1);
        face.emblem.userData = { baseY: it.y, opacity: 1 };
        face.ordered.push(face.emblem);
      } else if (it.kind === 'divider') {
        face.divider.visible = true;
        face.divider.scale.set(it.width, it.width / 16, 1);
        face.divider.userData = { baseY: it.y, opacity: 0.95 };
        face.ordered.push(face.divider);
      } else {
        const t = face.texts[textIndex++];
        t.visible = true;
        t.text = it.text;
        t.font = sdfFont(it.weight, it.style);
        t.fontSize = it.size;
        t.letterSpacing = it.spacing;
        const accent = it.role === 'accent';
        t.color = accent ? theme.accent : it.role === 'soft' ? theme.soft : theme.ink;
        t.material.metalness = accent ? 0.55 : 0;
        t.material.roughness = accent ? 0.3 : 0.6;
        t.position.set(0, it.y, face.z + 0.0012);
        t.userData = { baseY: it.y, isText: true };
        t.sync();
        face.ordered.push(t);
      }
    });
    for (let i = textIndex; i < face.texts.length; i++) face.texts[i].visible = false;
    applyReveal(face);
  };

  // staggered "write in": each line fades and rises into place
  const applyReveal = (face) => {
    face.applied = face.reveal.v;
    const n = face.ordered.length;
    const wave = face.reveal.v * (n + 5);
    face.ordered.forEach((obj, i) => {
      const k = smooth(clamp01((wave - i) / 5));
      obj.position.y = obj.userData.baseY - (1 - k) * 0.05;
      if (obj.userData.isText) obj.fillOpacity = k;
      else obj.material.opacity = k * obj.userData.opacity;
    });
  };

  const s = {
    front: 0,
    shown: -1,
    target: -1,
    flipping: false,
    rot: 0,
    flip: { p: 0 },
    lift: 0,
    reading: false,
    hover: false,
    tiltX: 0,
    tiltY: 0,
  };

  const runFlip = () => {
    const to = s.target;
    if (to === s.shown || to < 0) return;
    s.flipping = true;
    const back = 1 - s.front;
    setFace(faces[back], to);
    gsap
      .timeline()
      .to(s.flip, { p: 1, duration: 1.3, ease: 'power2.inOut' }, 0)
      .to(faces[back].reveal, { v: 1, duration: 1.6, ease: 'power1.out' }, 0.72)
      .call(
        () => {
          s.rot += Math.PI;
          s.flip.p = 0;
          gsap.killTweensOf(faces[s.front].reveal);
          faces[s.front].reveal.v = 0;
          s.front = back;
          s.shown = to;
          s.flipping = false;
          if (s.target !== s.shown) runFlip();
        },
        null,
        1.3
      );
  };

  return {
    root,

    /** Show an event without animation (before the book is open). */
    setInitial(eventIndex) {
      if (s.flipping || eventIndex === s.shown) return;
      setFace(faces[s.front], eventIndex);
      s.shown = eventIndex;
      s.target = eventIndex;
    },

    /** Flip the card over to another event. Requests made mid-flip are queued. */
    flipTo(eventIndex) {
      s.target = eventIndex;
      if (!s.flipping) runFlip();
    },

    revealFront(delay = 0) {
      gsap.to(faces[s.front].reveal, { v: 1, duration: 2.2, delay, ease: 'power1.out' });
    },

    hideText() {
      faces.forEach((f) => {
        gsap.killTweensOf(f.reveal);
        f.reveal.v = 0;
      });
    },

    setReading(value) {
      s.reading = value;
    },

    setHover(value) {
      s.hover = value;
    },

    update(dt, pointer) {
      faces.forEach((face) => {
        if (face.applied !== face.reveal.v) applyReveal(face);
      });
      const damp = THREE.MathUtils.damp;
      const step = Math.min(dt, 0.05);
      const liftTarget = (s.reading ? 0.42 : 0) + (s.hover ? 0.05 : 0);
      const tiltOn = s.reading || s.hover ? 1 : 0;
      const tiltXTarget = -pointer.y * 0.06 * tiltOn;
      const tiltYTarget = pointer.x * 0.08 * tiltOn * (s.reading ? 1 : 0.4);
      s.lift = damp(s.lift, liftTarget, 5, step);
      s.tiltX = damp(s.tiltX, tiltXTarget, 4, step);
      s.tiltY = damp(s.tiltY, tiltYTarget, 4, step);
      settle(s.lift, liftTarget);
      settle(s.tiltX, tiltXTarget);
      settle(s.tiltY, tiltYTarget);

      const p = s.flip.p;
      const arc = Math.sin(Math.PI * p);
      card.position.z = baseZ + s.lift + FLIP_CLEARANCE * arc;
      card.rotation.y = s.rot + Math.PI * p + s.tiltY;
      card.rotation.x = -0.14 * arc + s.tiltX;
      card.rotation.z = 0.03 * arc;
      card.scale.setScalar(1 - 0.035 * arc);

      const h = card.position.z - baseZ;
      shadow.position.set(0.035 + h * 0.22, -0.05 - h * 0.3, 0.0015);
      shadow.scale.setScalar(1 + h * 0.22);
      shadowMat.opacity = (0.42 / (1 + h * 1.4)) * (1 - arc * 0.5);
    },

    dispose() {
      gsap.killTweensOf(s.flip);
      faces.forEach((f) => {
        gsap.killTweensOf(f.reveal);
        f.texts.forEach((t) => t.dispose());
      });
      disposables.forEach((d) => d.dispose());
    },
  };
}
