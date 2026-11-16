'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { useFrame } from '@react-three/fiber';
import { BOOK, PALETTE } from '@/lib/constants';
import { settle } from '@/lib/activity';
import { PRESETS } from '@/lib/quality';
import Book from './Book';
import CameraRig from './CameraRig';
import Dust from './Dust';
import { AdaptiveResolution, ContextGuard, FrameDriver, ShadowCache, Warmup } from './Performance';

/** A warm light that glides across the cover so the foil and seal glint. */
function SweepLight({ trigger, phase }) {
  const lightRef = useRef();
  // never let a hover sweep wash out the cover while the book opens
  useEffect(() => {
    if (phase !== 'opening' || !lightRef.current) return;
    gsap.killTweensOf([lightRef.current, lightRef.current.position]);
    gsap.to(lightRef.current, { intensity: 0, duration: 0.3 });
  }, [phase]);
  useEffect(() => {
    const light = lightRef.current;
    if (!light || !trigger) return undefined;
    const tl = gsap
      .timeline()
      .set(light.position, { x: -5.5, y: 2.2 })
      .to(light.position, { x: 5.5, y: -1.2, duration: 2.6, ease: 'sine.inOut' }, 0)
      .to(light, { intensity: 55, duration: 0.9, ease: 'sine.out' }, 0)
      .to(light, { intensity: 0, duration: 0.9, ease: 'sine.in' }, 1.7);
    return () => tl.kill();
  }, [trigger]);
  return <pointLight ref={lightRef} position={[-5.5, 2.2, 3.2]} intensity={0} color="#fff1d6" distance={0} decay={2} />;
}

/** Darkens everything below the lifted invitation card while reading. */
function ReadDimmer({ active, onClose }) {
  const ref = useRef();
  useFrame((_, delta) => {
    const m = ref.current?.material;
    if (!m) return;
    const target = active ? 0.42 : 0;
    m.opacity = THREE.MathUtils.damp(m.opacity, target, 6, Math.min(delta, 0.05));
    ref.current.visible = m.opacity > 0.002;
    settle(m.opacity, target, 2e-3);
  });
  return (
    <mesh
      ref={ref}
      position={[0, 0, 0.26]}
      visible={false}
      onClick={
        active
          ? (e) => {
              e.stopPropagation();
              onClose?.();
            }
          : undefined
      }
    >
      <planeGeometry args={[80, 80]} />
      <meshBasicMaterial color="#1b2233" transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

export default function Scene({
  assets,
  events,
  phase,
  selected,
  framing,
  reading,
  sweep,
  quality = PRESETS.medium,
  onWarm,
  onFail,
  onSelect,
  onRequestOpen,
  onIntroDone,
  onOpened,
  onToggleRead,
  onHoverBook,
}) {
  // continuous frames only while something always moves (idle hover, dust);
  // otherwise frames are drawn on demand
  const hovering = phase === 'intro' || phase === 'ready';
  const continuous = hovering || quality.dust > 0;
  // Once the book is open, only the slow dust motes keep moving when nobody
  // interacts: 30 fps is plenty for them and halves the GPU work while idle.
  // (Anything that animates still runs at activeFps.)
  const idleFps = hovering ? quality.idleFps : Math.min(quality.idleFps, 30);

  return (
    <>
      <color attach="background" args={[PALETTE.table]} />
      <fog attach="fog" args={[PALETTE.table, 32, 80]} />

      {/* Soft studio light: warm key from the top-left (like a window) + fill */}
      <hemisphereLight args={['#fffaf2', '#cbbfae', 0.9]} />
      <directionalLight
        castShadow
        position={[-4.5, 6, 9]}
        intensity={2.4}
        color="#fff4e4"
        shadow-mapSize={[quality.shadowMap, quality.shadowMap]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-radius={quality.shadowRadius}
        shadow-camera-left={-6.5}
        shadow-camera-right={6.5}
        shadow-camera-top={6.5}
        shadow-camera-bottom={-6.5}
        shadow-camera-near={4}
        shadow-camera-far={22}
      />
      {quality.sweepLight && <SweepLight trigger={sweep} phase={phase} />}
      {/* reflections: <StudioEnvironment> is mounted by Stage, with the canvas */}

      {/* The table the book rests on */}
      <mesh position={[0, 0, -BOOK.T - 0.002]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color={PALETTE.table} roughness={1} metalness={0} />
      </mesh>

      {quality.dust > 0 && <Dust count={quality.dust} />}

      <Book
        assets={assets}
        events={events}
        phase={phase}
        selected={selected}
        reading={reading}
        quality={quality}
        onSelect={onSelect}
        onRequestOpen={onRequestOpen}
        onIntroDone={onIntroDone}
        onOpened={onOpened}
        onToggleRead={onToggleRead}
        onHoverBook={onHoverBook}
      />
      <ReadDimmer active={reading} onClose={onToggleRead} />

      <CameraRig framing={framing} phase={phase} />

      <FrameDriver continuous={continuous} activeFps={quality.activeFps} idleFps={idleFps} />
      <ContextGuard onGiveUp={onFail} />
      <ShadowCache />
      <AdaptiveResolution min={quality.dpr[0]} max={quality.dpr[1]} />
      <Warmup textures={assets.textures} onReady={onWarm} />
    </>
  );
}
