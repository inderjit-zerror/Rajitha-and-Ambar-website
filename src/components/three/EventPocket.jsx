'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import gsap from 'gsap';

const _normal = new THREE.Vector3();
const _point = new THREE.Vector3();

/**
 * Right page: the illustrated pocket holding one card per event.
 * Cards slide out of the pocket once the book is open; hovering lifts a card,
 * clicking selects it.
 */
export default function EventPocket({ assets, events, selected, onSelect, interactive, revealed }) {
  const { layout } = assets;
  const groupRef = useRef();
  const shadowRef = useRef();
  const cardRefs = useRef([]);
  const lifts = useRef([]);
  const pulses = useRef([]);
  const reveal = useRef([]);
  const [hovered, setHovered] = useState(-1);
  useCursor(interactive && hovered >= 0);

  const resources = useMemo(() => {
    // Anything below the pocket's bottom edge is clipped (used while the cards
    // are tucked inside the pocket).
    const clipPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const cardMaterials = assets.cards.map(
      (map) =>
        new THREE.MeshStandardMaterial({
          map,
          roughness: 0.78,
          metalness: 0,
          clippingPlanes: [clipPlane],
        })
    );
    const cardGeometry = new THREE.PlaneGeometry(layout.cardW, layout.cardH);
    const edgeMaterial = new THREE.MeshBasicMaterial({
      map: assets.edgeShadow,
      transparent: true,
      depthWrite: false,
      clippingPlanes: [clipPlane],
    });
    const edgeGeometry = new THREE.PlaneGeometry(layout.cardW, 0.08);
    const tabFrameGeometry = new THREE.PlaneGeometry(layout.cardW - 0.05, Math.min(layout.band, 0.6) - 0.05);
    const tabFrameMaterials = assets.cards.map(
      () =>
        new THREE.MeshBasicMaterial({
          map: assets.tabFrame,
          color: '#ecd29a',
          transparent: true,
          opacity: 0,
          depthWrite: false,
          clippingPlanes: [clipPlane],
        })
    );

    const p = layout.pocket;
    const pw = p.right - p.left;
    const ph = Math.max(p.topLeft, p.topRight) - p.bottom;
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(pw, 0);
    shape.lineTo(pw, p.topRight - p.bottom);
    shape.lineTo(p.dipX - p.left, p.dipY - p.bottom);
    shape.lineTo(0, p.topLeft - p.bottom);
    shape.closePath();
    const pocketGeometry = new THREE.ShapeGeometry(shape);
    const uv = pocketGeometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / pw, uv.getY(i) / ph);
    const pocketMaterial = new THREE.MeshStandardMaterial({ map: assets.pocket, roughness: 0.8 });

    // occlusion strips along the pocket's slanted mouth
    const pocketEdges = [
      [p.left, p.topLeft, p.dipX, p.dipY],
      [p.dipX, p.dipY, p.right, p.topRight],
    ].map(([x0, y0, x1, y1]) => {
      const len = Math.hypot(x1 - x0, y1 - y0);
      const angle = Math.atan2(y1 - y0, x1 - x0);
      const geometry = new THREE.PlaneGeometry(len + 0.02, 0.09);
      return { geometry, angle, x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
    });

    const shadowMaterial = new THREE.MeshBasicMaterial({
      map: assets.softShadow,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    return { clipPlane, cardMaterials, cardGeometry, edgeMaterial, edgeGeometry, tabFrameGeometry, tabFrameMaterials, pocketGeometry, pocketMaterial, pocketEdges, shadowMaterial };
  }, [assets, layout]);

  useEffect(
    () => () => {
      resources.cardMaterials.forEach((m) => m.dispose());
      resources.cardGeometry.dispose();
      resources.edgeMaterial.dispose();
      resources.edgeGeometry.dispose();
      resources.tabFrameGeometry.dispose();
      resources.tabFrameMaterials.forEach((m) => m.dispose());
      resources.pocketGeometry.dispose();
      resources.pocketMaterial.dispose();
      resources.pocketEdges.forEach((e) => e.geometry.dispose());
      resources.shadowMaterial.dispose();
    },
    [resources]
  );

  // Slide the cards out of the pocket (staggered) once the book has opened.
  useEffect(() => {
    reveal.current = layout.cards.map((_, i) => reveal.current[i] || { value: 0 });
    const targets = reveal.current;
    if (!revealed) {
      gsap.killTweensOf(targets);
      targets.forEach((t) => (t.value = 0));
      return undefined;
    }
    const tween = gsap.to(targets, {
      value: 1,
      duration: 1.15,
      delay: 0.1,
      ease: 'back.out(1.25)',
      stagger: 0.12,
    });
    return () => tween.kill();
  }, [revealed, layout]);

  useFrame((_, dt) => {
    const group = groupRef.current;
    if (!group) return;
    group.updateWorldMatrix(true, false);
    _normal.set(0, 1, 0).transformDirection(group.matrixWorld);
    _point.set(0, layout.pocket.bottom, 0).applyMatrix4(group.matrixWorld);
    resources.clipPlane.setFromNormalAndCoplanarPoint(_normal, _point);

    layout.cards.forEach((card, i) => {
      const mesh = cardRefs.current[i];
      if (!mesh) return;
      const isSelected = i === selected;
      const isHovered = interactive && i === hovered;
      const target = (isSelected ? 0.1 : 0) + (isHovered ? 0.06 : 0);
      lifts.current[i] = THREE.MathUtils.damp(lifts.current[i] ?? 0, target, 9, dt);
      pulses.current[i] = THREE.MathUtils.damp(pulses.current[i] ?? 0, 0, 5, dt);
      const r = reveal.current[i]?.value ?? 0;
      const pulse = Math.sin(Math.min(1, pulses.current[i]) * Math.PI) * 0.08;
      mesh.position.y = card.centerY + card.hiddenOffset * (1 - r) + (lifts.current[i] + pulse) * r;
      mesh.position.z = card.z + pulses.current[i] * 0.01;
      // gold hairline frame on the selected (and hovered) tab
      const frame = mesh.children.find((c) => c.userData.tabFrame);
      if (frame) {
        const o = (isSelected ? 0.95 : isHovered ? 0.45 : 0) * r;
        frame.material.opacity = THREE.MathUtils.damp(frame.material.opacity, o, 8, dt);
      }
    });
    // the stack's shadow only exists once the cards are out of the pocket
    if (shadowRef.current) shadowRef.current.material.opacity = 0.24 * (reveal.current[0]?.value ?? 0);
  });

  const stop = (e) => e.stopPropagation();
  const stackTop = layout.cards[0]?.top ?? 0;
  const stackH = stackTop - layout.pocket.bottom;

  return (
    <group ref={groupRef}>
      {/* soft shadow of the whole stack on the board */}
      <mesh ref={shadowRef} position={[0.03, layout.pocket.bottom + stackH / 2 - 0.04, 0.0015]} material={resources.shadowMaterial}>
        <planeGeometry args={[layout.cardW * 1.45, stackH * 1.3]} />
      </mesh>

      {layout.cards.map((card, i) => (
        <mesh
          key={events[i]?.id ?? i}
          ref={(el) => (cardRefs.current[i] = el)}
          geometry={resources.cardGeometry}
          material={resources.cardMaterials[i]}
          position={[0, card.centerY + card.hiddenOffset, card.z]}
          receiveShadow
          onPointerOver={(e) => {
            e.stopPropagation();
            if (interactive) setHovered(i);
          }}
          onPointerOut={() => setHovered((h) => (h === i ? -1 : h))}
          onClick={(e) => {
            e.stopPropagation();
            if (!interactive) return;
            pulses.current[i] = 1;
            onSelect(i);
          }}
        >
          <mesh
            geometry={resources.tabFrameGeometry}
            material={resources.tabFrameMaterials[i]}
            position={[0, layout.cardH / 2 - Math.min(layout.band, 0.6) / 2, 0.0008]}
            userData={{ tabFrame: true }}
          />
          {i > 0 && (
            <mesh
              geometry={resources.edgeGeometry}
              material={resources.edgeMaterial}
              position={[0, layout.cardH / 2 + 0.028, -0.003]}
            />
          )}
        </mesh>
      ))}

      <group position={[0, 0, layout.pocket.z]}>
        {resources.pocketEdges.map((edge, i) => (
          <mesh
            key={i}
            geometry={edge.geometry}
            material={resources.edgeMaterial}
            position={[
              edge.x - Math.sin(edge.angle) * 0.03,
              edge.y + Math.cos(edge.angle) * 0.03,
              -0.0025,
            ]}
            rotation={[0, 0, edge.angle]}
          />
        ))}
        <mesh
          geometry={resources.pocketGeometry}
          material={resources.pocketMaterial}
          position={[layout.pocket.left, layout.pocket.bottom, 0]}
          receiveShadow
          onPointerOver={stop}
          onPointerMove={stop}
          onClick={stop}
        />
      </group>
    </group>
  );
}
