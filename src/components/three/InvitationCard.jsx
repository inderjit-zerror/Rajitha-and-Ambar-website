'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useCursor } from '@/lib/useCursor';
import { createInvitationCard } from '@/lib/invitationCard';

/** Left page: the two-sided invitation card (flip + themed colours + SDF text). */
export default function InvitationCard({ assets, selected, phase, reading, interactive, onActivate, ...props }) {
  const card = useMemo(() => createInvitationCard(assets), [assets]);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered && interactive);

  useEffect(() => () => card.dispose(), [card]);

  useEffect(() => {
    if (phase === 'open') card.flipTo(selected);
    else card.setInitial(selected);
  }, [card, selected, phase]);

  useEffect(() => {
    if (phase === 'open') card.revealFront(0.15);
    else card.hideText();
  }, [card, phase]);

  useEffect(() => card.setReading(reading), [card, reading]);
  useEffect(() => card.setHover(hovered && interactive && !reading), [card, hovered, interactive, reading]);

  useFrame((state, dt) => card.update(dt, state.pointer));

  return (
    <primitive
      object={card.root}
      {...props}
      onClick={(e) => {
        if (!interactive) return;
        e.stopPropagation();
        onActivate?.();
      }}
      onPointerOver={(e) => {
        if (!interactive) return;
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    />
  );
}
