'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { BOOK, PALETTE } from '@/lib/constants';
import Book from './Book';
import CameraRig from './CameraRig';
import Dust from './Dust';

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
  useFrame((_, dt) => {
    const m = ref.current?.material;
    if (!m) return;
    m.opacity = THREE.MathUtils.damp(m.opacity, active ? 0.42 : 0, 6, dt);
    ref.current.visible = m.opacity > 0.002;
  });
  return (
    <mesh
      ref={ref}
      position={[0, 0, 0.26]}
      visible={false}
      onClick={(e) => {
        if (!active) return;
        e.stopPropagation();
        onClose?.();
      }}
    >
      <planeGeometry args={[80, 80]} />
      <meshBasicMaterial color="#1b2233" transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

export default function Scene({ assets, events, phase, selected, framing, reading, compact, sweep, onSelect, onRequestOpen, onIntroDone, onOpened, onToggleRead, onHoverBook }) {
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
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-radius={6}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-camera-near={1}
        shadow-camera-far={30}
      />
      <SweepLight trigger={sweep} phase={phase} />

      {/* Image-based light for foil, wax and satin reflections (built locally) */}
      <Environment resolution={256} environmentIntensity={0.6}>
        <Lightformer form="rect" intensity={2.4} position={[0, 1.5, 9]} scale={[14, 7, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={2} position={[-9, 5, 4]} scale={[8, 5, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.2} position={[9, -3, 4]} scale={[6, 4, 1]} target={[0, 0, 0]} />
        <Lightformer form="circle" intensity={5} position={[-4, 7, 7]} scale={2.5} target={[0, 0, 0]} />
      </Environment>

      {/* The table the book rests on */}
      <mesh position={[0, 0, -BOOK.T - 0.002]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color={PALETTE.table} roughness={1} metalness={0} />
      </mesh>

      <Dust count={compact ? 70 : 140} />

      <Book
        assets={assets}
        events={events}
        phase={phase}
        selected={selected}
        reading={reading}
        onSelect={onSelect}
        onRequestOpen={onRequestOpen}
        onIntroDone={onIntroDone}
        onOpened={onOpened}
        onToggleRead={onToggleRead}
        onHoverBook={onHoverBook}
      />
      <ReadDimmer active={reading} onClose={onToggleRead} />

      <CameraRig framing={framing} phase={phase} />
    </>
  );
}
