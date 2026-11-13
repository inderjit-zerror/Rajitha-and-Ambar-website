'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { useFrame, useThree } from '@react-three/fiber';
import { BOOK, DETAIL_CARD } from '@/lib/constants';

const { W, H, D } = BOOK;

// What the camera should frame (world units, margins included).
const FRAMES = {
  closed: { x: 0, y: -0.7, z: 0, w: 4.7, h: 7.6, lambda: 2 },
  spread: { x: -(W + D) / 2, y: -0.3, z: 0, w: W * 2 + D + 0.55, h: H + 1.55, lambda: 1.6 },
  read: { x: -(W + D), y: -0.12, z: 0.42, w: DETAIL_CARD.W + 0.3, h: DETAIL_CARD.H + 0.75, lambda: 2.6 },
};

// first frame of the intro shot (held while the loader is on screen)
const INTRO_START = new THREE.Vector3(2.6, -7.4, 3.8);
const INTRO_LOOK = new THREE.Vector3(0.2, 0.4, 0);

function frameFor(name, camera, size) {
  const f = FRAMES[name] || FRAMES.closed;
  const aspect = size.width / size.height;
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const dist = Math.max(f.h / 2 / tanHalf, f.w / 2 / (tanHalf * aspect));
  return { ...f, dist, pos: new THREE.Vector3(f.x, f.y, f.z + dist), look: new THREE.Vector3(f.x, f.y, f.z) };
}

/**
 * Cinematic moves for the intro and the opening (GSAP along spline paths), and
 * smooth damped framing + gentle pointer parallax the rest of the time.
 */
export default function CameraRig({ framing, phase }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const rig = useRef({ mode: 'damp', look: new THREE.Vector3(0, FRAMES.closed.y, 0), progress: { v: 0 }, path: null, lookPath: null, tween: null });

  // A cinematic move must finish even if the phase changes underneath it
  // (e.g. the guest clicks open before the intro shot ends); it is only
  // replaced by the next move or stopped on unmount.
  const play = (r, duration, end, kind) => {
    r.tween?.kill();
    r.kind = kind;
    r.progress.v = 0;
    r.mode = 'path';
    r.tween = gsap.to(r.progress, {
      v: 1,
      duration,
      ease: 'power2.inOut',
      onComplete: () => {
        r.mode = 'damp';
        r.look.copy(end.look);
        r.tween = null;
      },
    });
  };
  useEffect(() => () => rig.current.tween?.kill(), []);

  // Intro: a low, grazing view across the table that rises into the hero shot.
  useEffect(() => {
    if (phase !== 'intro') return undefined;
    const end = frameFor('closed', camera, size);
    const r = rig.current;
    r.path = new THREE.CatmullRomCurve3([
      INTRO_START.clone(),
      new THREE.Vector3(1.3, -5.0, 7.2),
      new THREE.Vector3(0.3, -2.0, end.dist * 0.95),
      end.pos,
    ]);
    r.lookPath = new THREE.CatmullRomCurve3([
      INTRO_LOOK.clone(),
      new THREE.Vector3(0.1, 0.1, 0),
      end.look,
    ]);
    play(r, 4.6, end, 'intro');
    return undefined;
    // size is read once for the path; resizing mid-intro just re-frames afterwards
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, camera]);

  // Opening: pull back and dip a little as the book rises towards the camera and
  // opens in mid-air, drift left with the opening cover, then settle top-down
  // over the spread as the book lands.
  useEffect(() => {
    if (phase !== 'opening') return undefined;
    const end = frameFor(framing === 'read' ? 'read' : 'spread', camera, size);
    const r = rig.current;
    const start = camera.position.clone();
    r.path = new THREE.CatmullRomCurve3([
      start,
      new THREE.Vector3(start.x + 0.3, start.y - 2.6, start.z + 2.4),
      new THREE.Vector3(end.pos.x * 0.55, end.pos.y - 3.2, end.pos.z + 2.2),
      new THREE.Vector3(end.pos.x, end.pos.y - 0.8, end.pos.z + 0.4),
      end.pos,
    ]);
    r.lookPath = new THREE.CatmullRomCurve3([
      r.look.clone(),
      new THREE.Vector3(0.2, 0.1, 1.2),
      new THREE.Vector3(end.look.x * 0.6, 0.1, 1.0),
      end.look,
    ]);
    play(r, 4.6, end, 'open');
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, camera]);

  useFrame((state, dt) => {
    const r = rig.current;
    const cam = state.camera;
    if (phase === 'loading') {
      cam.position.copy(INTRO_START);
      cam.up.set(0, 0, 1);
      r.look.copy(INTRO_LOOK);
      cam.lookAt(r.look);
      return;
    }
    if (r.mode === 'path' && r.path) {
      const v = r.progress.v;
      cam.position.copy(r.path.getPoint(v));
      r.look.copy(r.lookPath.getPoint(v));
      // low, grazing views keep the table's normal as "up"; top-down views use +y
      const k = THREE.MathUtils.smoothstep(v, 0, 0.85);
      if (r.kind === 'intro') cam.up.set(0, k, 1 - k).normalize();
      else cam.up.set(0, 1, 0);
      cam.lookAt(r.look);
      return;
    }
    cam.up.set(0, 1, 0);
    const f = frameFor(framing, cam, state.size);
    const parallax = f.dist * (framing === 'read' ? 0.012 : 0.018);
    const { x: px, y: py } = state.pointer;
    const damp = THREE.MathUtils.damp;
    const step = Math.min(dt, 0.05);
    cam.position.x = damp(cam.position.x, f.pos.x + px * parallax * 1.3, f.lambda, step);
    cam.position.y = damp(cam.position.y, f.pos.y + py * parallax, f.lambda, step);
    cam.position.z = damp(cam.position.z, f.pos.z, f.lambda, step);
    r.look.x = damp(r.look.x, f.look.x, f.lambda, step);
    r.look.y = damp(r.look.y, f.look.y, f.lambda, step);
    r.look.z = damp(r.look.z, f.look.z, f.lambda, step);
    cam.lookAt(r.look);
  });

  return null;
}
