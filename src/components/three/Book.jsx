'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { BOOK } from '@/lib/constants';
import { createBoardGeometry, createSealHalves, createRibbonGeometry, createStripPlane } from '@/lib/geometry';
import { seeded } from '@/lib/paint/utils';
import InvitationCard from './InvitationCard';
import EventPocket from './EventPocket';
import Sparkles from './Sparkles';

const { W, H, T, D } = BOOK;
const SPINE_W = D + T * 2;
const SEAL_R = 0.3;
const RIBBON_Y = -0.52;
const RIBBON_W = 0.2;
const SEAL_X = 0.92;
const RIBBON_LEFT = W / 2 + 0.015 + SEAL_X; // spine edge -> seal
const RIBBON_RIGHT = W / 2 + 0.015 - SEAL_X; // seal -> fore-edge
const noRaycast = () => null;

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/*
 * Hierarchy (book lies on the table, front cover facing the camera):
 *
 *   book (GSAP: levitate / land)
 *   └─ float (idle hover + pointer tilt)
 *      ├─ back board          – inner face at z = 0: pocket, cards, bookmark
 *      ├─ closure             – satin ribbon + wax seal (broken when opening)
 *      └─ spine (hinge at the back board's left edge)
 *         └─ front cover (hinge at the spine's far edge) – invitation card
 *
 * open = 0 → closed (spine upright, cover on top), open = 1 → flat spread.
 */
export default function Book({ assets, events, phase, selected, reading, onSelect, onRequestOpen, onIntroDone, onOpened, onToggleRead, onHoverBook }) {
  const bookRef = useRef();
  const floatRef = useRef();
  const spineRef = useRef();
  const coverRef = useRef();
  const closureRef = useRef();
  const sealRef = useRef();
  const ribbonLeftRef = useRef();
  const ribbonRightRef = useRef();
  const ribbonEdgeLRef = useRef();
  const ribbonEdgeRRef = useRef();
  const shockRef = useRef();
  const motion = useRef({ open: 0, float: 0, hover: 0 });
  const [hovered, setHovered] = useState(false);
  const [sealBurst, setSealBurst] = useState(0);
  const [dustBurst, setDustBurst] = useState(0);
  const isReady = phase === 'ready';
  useCursor(hovered && isReady);

  const { geometries, materials } = useMemo(() => {
    const rand = seeded(11);
    const sealHalves = createSealHalves(SEAL_R, rand);
    const bx = -W / 2 + 0.07; // bookmark runs just right of the hinge
    const geometries = {
      board: createBoardGeometry(W, H, T, { radius: 0.06, bevel: 0.014 }),
      spine: createBoardGeometry(SPINE_W, H, T * 0.92, { radius: 0.03, bevel: 0.012 }),
      gutter: new THREE.PlaneGeometry(D + 0.08, H),
      sealLeft: sealHalves.left,
      sealRight: sealHalves.right,
      sealShadow: new THREE.PlaneGeometry(SEAL_R * 3, SEAL_R * 3),
      ribbonFront: createStripPlane(W + 0.03, RIBBON_W),
      // the front ribbon is two pieces anchored at the book's edges, so each can
      // be pulled back around its edge when the seal bursts
      ribbonLeft: createStripPlane(RIBBON_LEFT, RIBBON_W).translate(RIBBON_LEFT / 2, 0, 0),
      ribbonRight: createStripPlane(RIBBON_RIGHT, RIBBON_W).translate(-RIBBON_RIGHT / 2, 0, 0),
      unitPlane: new THREE.PlaneGeometry(1, 1),
      ribbonEdge: createStripPlane(D + T * 2 + 0.012, RIBBON_W),
      bookmark: createRibbonGeometry(
        [
          new THREE.Vector3(bx, H / 2 - 0.02, 0.0016),
          new THREE.Vector3(bx, 0, 0.0016),
          new THREE.Vector3(bx, -H / 2 + 0.03, 0.0016),
          new THREE.Vector3(bx, -H / 2 - 0.012, -0.012),
          new THREE.Vector3(bx + 0.005, -H / 2 - 0.035, -T * 0.7),
          new THREE.Vector3(bx + 0.02, -H / 2 - 0.09, -T - 0.0006),
          new THREE.Vector3(bx + 0.06, -H / 2 - 0.26, -T - 0.0006),
          new THREE.Vector3(bx + 0.15, -H / 2 - 0.42, -T - 0.0006),
        ],
        0.075,
        { notch: 0.05 }
      ),
    };
    const cloth = (map) =>
      new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: 1.4, roughness: 0.93, metalness: 0 });
    const foil = (set) =>
      new THREE.MeshStandardMaterial({
        map: set.color,
        bumpMap: set.bump,
        bumpScale: 3,
        roughnessMap: set.orm,
        metalnessMap: set.orm,
        roughness: 1,
        metalness: 1,
      });
    const linen = cloth(assets.linen);
    const linenSpine = cloth(assets.linenSpine);
    const cover = foil(assets.cover);
    const spine = foil(assets.spine);
    const back = foil(assets.back);
    const gutter = new THREE.MeshBasicMaterial({ map: assets.gutter, transparent: true, depthWrite: false });
    const satin = (color) =>
      new THREE.MeshPhysicalMaterial({
        map: assets.satin,
        color,
        roughness: 0.36,
        metalness: 0.05,
        sheen: 1,
        sheenRoughness: 0.3,
        sheenColor: new THREE.Color('#ffffff'),
        side: THREE.DoubleSide,
        transparent: true,
      });
    const ribbon = satin('#efe4cc');
    const bookmark = satin('#c9a865');
    const seal = new THREE.MeshPhysicalMaterial({
      map: assets.sealColor,
      bumpMap: assets.sealBump,
      bumpScale: 5,
      roughness: 0.42,
      metalness: 0.3,
      clearcoat: 0.8,
      clearcoatRoughness: 0.22,
      emissive: new THREE.Color('#ffbd55'),
      emissiveIntensity: 0,
      transparent: true,
    });
    const additive = (map) =>
      new THREE.MeshBasicMaterial({
        map,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      });
    const shock = additive(assets.ring);
    const sealShadow = new THREE.MeshBasicMaterial({ map: assets.roundShadow, transparent: true, depthWrite: false, opacity: 0.55 });
    // ExtrudeGeometry groups: 0 = outer face (-z), 1 = edges, 2 = inner face (+z)
    const materials = {
      all: [linen, linenSpine, cover, spine, back, gutter, ribbon, bookmark, seal, sealShadow, shock],
      cover: [cover, linen, linen],
      back: [back, linen, linen],
      spine: [spine, linenSpine, linenSpine],
      gutter,
      ribbon,
      bookmark,
      seal,
      sealShadow,
      shock,
    };
    return { geometries, materials };
  }, [assets]);

  useEffect(
    () => () => {
      Object.values(geometries).forEach((g) => g.dispose());
      materials.all.forEach((m) => m.dispose());
    },
    [geometries, materials]
  );

  // Intro: the book rests on the table while the camera glides in, then it
  // gently levitates and starts to hover.
  useGSAP(
    () => {
      if (phase !== 'intro') return;
      const b = bookRef.current;
      gsap
        .timeline({ delay: 2.4 })
        .to(motion.current, { float: 1, duration: 2.2, ease: 'power2.inOut' }, 0)
        .to(b.position, { z: 0.85, duration: 2.2, ease: 'power2.inOut' }, 0)
        .to(b.rotation, { x: 0.06, y: -0.1, z: 0.02, duration: 2.2, ease: 'power2.inOut' }, 0)
        .call(() => onIntroDone?.(), null, 1.2);
    },
    { dependencies: [phase] }
  );

  // Open: the wax seal glows and bursts into gold sparks, the ribbon is pulled
  // back around the edges, the book rises towards the guest and opens in mid-air,
  // then settles open on the table.
  useGSAP(
    () => {
      if (phase !== 'opening') return;
      const b = bookRef.current;
      const m = motion.current;
      const seal = sealRef.current;
      gsap
        .timeline()
        // 1. the seal glows, swells and bursts
        .to(materials.seal, { emissiveIntensity: 2.4, duration: 0.38, ease: 'power2.in' }, 0)
        .to(seal.scale, { x: 1.14, y: 1.14, z: 1.14, duration: 0.38, ease: 'power2.out' }, 0)
        .call(() => setSealBurst((n) => n + 1), null, 0.34)
        .fromTo(shockRef.current.scale, { x: 0.5, y: 0.5 }, { x: 4.6, y: 4.6, duration: 0.95, ease: 'power2.out' }, 0.32)
        .fromTo(materials.shock, { opacity: 0.95 }, { opacity: 0, duration: 0.95, ease: 'power1.out' }, 0.32)
        .to(seal.scale, { x: 0, y: 0, z: 0, duration: 0.3, ease: 'back.in(2.4)' }, 0.36)
        .to(seal.rotation, { z: 1.6, duration: 0.3, ease: 'power2.in' }, 0.36)
        .to(materials.sealShadow, { opacity: 0, duration: 0.25 }, 0.38)
        // 2. the ribbon is pulled back around both edges
        .to(ribbonLeftRef.current.scale, { x: 0, duration: 0.62, ease: 'power3.in' }, 0.46)
        .to(ribbonRightRef.current.scale, { x: 0, duration: 0.42, ease: 'power3.in' }, 0.46)
        .to([ribbonEdgeLRef.current.scale, ribbonEdgeRRef.current.scale], { x: 0, duration: 0.28, ease: 'power2.in' }, 0.95)
        .set(closureRef.current, { visible: false }, 1.3)
        // 3. the book rises towards the guest and turns a little
        .to(m, { float: 0, hover: 0, duration: 0.9, ease: 'power2.out' }, 0.5)
        .to(b.position, { x: 0.3, y: 0.12, z: 1.85, duration: 1.35, ease: 'power2.inOut', overwrite: 'auto' }, 0.55)
        .to(b.rotation, { x: -0.2, y: -0.28, z: 0.035, duration: 1.35, ease: 'power2.inOut', overwrite: 'auto' }, 0.55)
        // 4. the cover opens in mid-air, a little gold dust drifts out
        .call(() => setDustBurst((n) => n + 1), null, 1.4)
        .to(m, { open: 1, duration: 1.95, ease: 'power3.inOut' }, 1.15)
        // 5. the open book floats down and settles on the table
        .to(b.position, { x: 0, y: 0, z: 0, duration: 1.5, ease: 'power2.inOut' }, 2.75)
        .to(b.rotation, { x: 0, y: 0, z: 0, duration: 1.5, ease: 'power2.inOut' }, 2.75)
        .call(() => onOpened?.(), null, 4.3);
    },
    { dependencies: [phase] }
  );

  useFrame((state, dt) => {
    const m = motion.current;
    const f = m.float;
    const t = state.clock.elapsedTime;
    const g = floatRef.current;
    const { x: px, y: py } = state.pointer;
    const damp = THREE.MathUtils.damp;
    const step = Math.min(dt, 0.05);
    m.hover = damp(m.hover, hovered && isReady ? 1 : 0, 5, step);
    g.position.y = damp(g.position.y, Math.sin(t * 0.9) * 0.06 * f, 6, step);
    g.position.z = damp(g.position.z, m.hover * 0.12, 6, step);
    g.rotation.x = damp(g.rotation.x, (Math.sin(t * 0.6) * 0.025 - py * 0.13) * f, 4, step);
    g.rotation.y = damp(g.rotation.y, (Math.sin(t * 0.45) * 0.04 + px * 0.2) * f, 4, step);
    g.rotation.z = damp(g.rotation.z, Math.sin(t * 0.5) * 0.01 * f, 4, step);

    // two-hinge opening: the cover swings first, the spine lays down at the end
    const p = Math.min(1, m.open);
    const spineAngle = (1 - smoothstep(0.3, 1, p)) * (Math.PI / 2);
    const coverAngle = (1 - p) * Math.PI;
    spineRef.current.rotation.y = spineAngle;
    coverRef.current.rotation.y = coverAngle - spineAngle;
  });

  const isOpen = phase === 'open';

  return (
    <group ref={bookRef}>
      <group
        ref={floatRef}
        onClick={(e) => {
          if (!isReady) return;
          e.stopPropagation();
          onRequestOpen?.();
        }}
        onPointerOver={() => {
          setHovered(true);
          if (isReady) onHoverBook?.();
        }}
        onPointerOut={() => setHovered(false)}
      >
        {/* back board */}
        <mesh geometry={geometries.board} material={materials.back} castShadow receiveShadow />
        <mesh geometry={geometries.bookmark} material={materials.bookmark} castShadow receiveShadow />
        <EventPocket
          assets={assets}
          events={events}
          selected={selected}
          onSelect={onSelect}
          interactive={isOpen && !reading}
          revealed={isOpen}
        />

        {/* satin ribbon + wax seal holding the book closed */}
        <group ref={closureRef}>
          <mesh ref={ribbonLeftRef} geometry={geometries.ribbonLeft} material={materials.ribbon} position={[-W / 2 - 0.015, RIBBON_Y, D + T + 0.003]} castShadow />
          <mesh ref={ribbonRightRef} geometry={geometries.ribbonRight} material={materials.ribbon} position={[W / 2 + 0.015, RIBBON_Y, D + T + 0.003]} castShadow />
          <mesh
            ref={ribbonEdgeRRef}
            geometry={geometries.ribbonEdge}
            material={materials.ribbon}
            position={[W / 2 + 0.004, RIBBON_Y, D / 2]}
            rotation={[0, Math.PI / 2, 0]}
          />
          <mesh
            ref={ribbonEdgeLRef}
            geometry={geometries.ribbonEdge}
            material={materials.ribbon}
            position={[-W / 2 - T - 0.008, RIBBON_Y, D / 2]}
            rotation={[0, -Math.PI / 2, 0]}
          />
          <mesh geometry={geometries.ribbonFront} material={materials.ribbon} position={[0, RIBBON_Y, -T - 0.003]} rotation={[0, Math.PI, 0]} />
          <mesh geometry={geometries.sealShadow} material={materials.sealShadow} position={[SEAL_X + 0.04, RIBBON_Y - 0.05, D + T + 0.005]} />
          <group ref={sealRef} position={[SEAL_X, RIBBON_Y, D + T + 0.006 + SEAL_R * 0.09]}>
            <mesh geometry={geometries.sealLeft} material={materials.seal} castShadow />
            <mesh geometry={geometries.sealRight} material={materials.seal} castShadow />
          </group>
        </group>

        {/* opening effects: shock-wave, sparks, light from inside the book */}
        <mesh
          ref={shockRef}
          geometry={geometries.unitPlane}
          material={materials.shock}
          position={[SEAL_X, RIBBON_Y, D + T + 0.04]}
          raycast={noRaycast}
        />
        <Sparkles
          trigger={sealBurst}
          position={[SEAL_X, RIBBON_Y, D + T + 0.06]}
          count={190}
          spread={[0.3, 0.3, 0.05]}
          direction={[0, 0, 1]}
          cone={1.25}
          speed={[0.9, 3.1]}
          emit={0.12}
          life={[0.8, 1.7]}
          gravity={[0, -1, -0.6]}
          drag={2.4}
          size={5.5}
          seed={3}
          raycast={noRaycast}
        />
        <Sparkles
          trigger={dustBurst}
          position={[-W / 2, 0, 0.12]}
          count={300}
          spread={[0.6, 3.6, 0.05]}
          direction={[0, 0.1, 1]}
          cone={0.6}
          speed={[0.5, 1.7]}
          emit={1.4}
          life={[1.4, 2.8]}
          gravity={[0, 0.2, 0.18]}
          drag={1}
          size={4.4}
          color="#f6d58e"
          seed={7}
          raycast={noRaycast}
        />

        {/* spine, hinged on the back board's left edge */}
        <group ref={spineRef} position={[-W / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <mesh geometry={geometries.spine} material={materials.spine} position={[-D / 2, 0, -0.003]} castShadow receiveShadow />
          {/* soft crease shading along both hinges, visible when the book lies open */}
          <mesh geometry={geometries.gutter} material={materials.gutter} position={[-D / 2, 0, 0.0012]} />
          {/* front cover, hinged on the spine's far edge */}
          <group ref={coverRef} position={[-D, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <mesh geometry={geometries.board} material={materials.cover} position={[-W / 2, 0, 0]} castShadow receiveShadow />
            <InvitationCard
              assets={assets}
              selected={selected}
              phase={phase}
              reading={reading}
              interactive={isOpen}
              onActivate={onToggleRead}
              position={[-W / 2, 0, 0]}
            />
          </group>
        </group>
      </group>
    </group>
  );
}
