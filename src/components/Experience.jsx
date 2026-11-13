'use client';

import { useCallback, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { couple, events, invitationHeader, ui } from '@/content/invitation';
import { buildAssets } from '@/lib/assets';
import { getSerifFamily, loadSerifFonts } from '@/lib/fonts';
import Scene from './three/Scene';
import Overlay from './Overlay';

function useCompact() {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 700px)');
    const update = () => setCompact(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return compact;
}

// Handy while editing content: add ?open to the URL to open the book
// automatically, ?event=2 to start on a specific card (0-based) and ?read to
// start in reading mode.
function readUrlOptions() {
  const params = new URLSearchParams(window.location.search);
  const event = Number.parseInt(params.get('event') ?? '0', 10);
  return {
    autoOpen: params.has('open') || params.has('read'),
    autoRead: params.has('read'),
    event: Number.isFinite(event) ? Math.min(Math.max(event, 0), events.length - 1) : 0,
  };
}

/**
 * phase:  loading → intro → ready → opening → open
 * reading: the invitation card is lifted towards the camera for comfortable reading
 */
export default function Experience() {
  const compact = useCompact();
  const [urlOptions] = useState(readUrlOptions);
  const [assets, setAssets] = useState(null);
  const [phase, setPhase] = useState('loading');
  const [selected, setSelected] = useState(urlOptions.event);
  const [reading, setReading] = useState(urlOptions.autoRead);
  const [sweep, setSweep] = useState(0);
  const [progress, setProgress] = useState(0);

  // Paint all textures once fonts are ready (re-paints when content changes).
  useEffect(() => {
    let cancelled = false;
    let built = null;
    (async () => {
      const family = getSerifFamily();
      await loadSerifFonts(family);
      if (!cancelled) setProgress(0.1);
      const isSmall = window.matchMedia('(max-width: 700px)').matches;
      built = await buildAssets({
        couple,
        events,
        header: invitationHeader,
        family,
        compact: isSmall,
        onProgress: (p) => !cancelled && setProgress(0.1 + p * 0.9),
      });
      if (cancelled) {
        built.dispose();
        return;
      }
      // the scene mounts behind the loader (shaders warm up); the intro starts
      // when the loader opens onto it
      setAssets(built);
    })();
    return () => {
      cancelled = true;
      built?.dispose();
    };
  }, []);

  // Each event tints the page accents (nav, buttons) with its theme.
  useEffect(() => {
    const theme = events[selected]?.theme;
    if (!theme) return;
    const root = document.documentElement.style;
    root.setProperty('--event-paper', theme.paper);
    root.setProperty('--event-accent', theme.accent);
    root.setProperty('--event-ink', theme.ink);
  }, [selected]);

  const isOpen = phase === 'open';

  const handleOpen = useCallback(() => {
    setPhase((p) => (p === 'ready' ? 'opening' : p));
  }, []);

  const handleSelect = useCallback(
    (index) => {
      setSelected(index);
      if (compact) setReading(true);
    },
    [compact]
  );

  const step = useCallback((dir) => {
    setSelected((s) => (s + dir + events.length) % events.length);
  }, []);

  const toggleRead = useCallback(() => setReading((r) => !r), []);
  const closeRead = useCallback(() => setReading(false), []);
  const triggerSweep = useCallback(() => setSweep((n) => n + 1), []);
  const handleRevealed = useCallback(() => {
    setPhase((p) => (p === 'loading' ? 'intro' : p));
    setSweep((n) => n + 1);
  }, []);

  // keyboard: Enter/Space opens, ←/→ browse events, Esc leaves reading mode
  useEffect(() => {
    const onKey = (e) => {
      if (e.target instanceof HTMLElement && e.target.closest('button')) {
        if (e.key === 'Enter' || e.key === ' ') return;
      }
      if (phase === 'ready' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        handleOpen();
      } else if (isOpen && e.key === 'ArrowRight') step(1);
      else if (isOpen && e.key === 'ArrowLeft') step(-1);
      else if (isOpen && e.key === 'Escape') closeRead();
      else if (isOpen && (e.key === 'r' || e.key === 'R')) toggleRead();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, isOpen, handleOpen, step, closeRead, toggleRead]);

  const framing = phase === 'opening' || isOpen ? (reading ? 'read' : 'spread') : 'closed';

  return (
    <main className="experience">
      <div className="experience__canvas" aria-hidden="true">
        <Canvas
          shadows="percentage"
          dpr={[1, 2]}
          camera={{ fov: 30, near: 0.1, far: 120, position: [2.6, -7.4, 3.8], up: [0, 0, 1] }}
          gl={{ antialias: true, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1.0, localClippingEnabled: true }}
        >
          {assets && (
            <Scene
              assets={assets}
              events={events}
              phase={phase}
              selected={selected}
              framing={framing}
              reading={reading && isOpen}
              compact={compact}
              sweep={sweep}
              onSelect={handleSelect}
              onRequestOpen={handleOpen}
              onToggleRead={toggleRead}
              onHoverBook={triggerSweep}
              onIntroDone={() => setPhase((p) => (p === 'intro' ? (urlOptions.autoOpen ? 'opening' : 'ready') : p))}
              onOpened={() => setPhase('open')}
            />
          )}
        </Canvas>
      </div>

      <Overlay
        ui={ui}
        couple={couple}
        events={events}
        phase={phase}
        compact={compact}
        selected={selected}
        reading={reading && isOpen}
        progress={progress}
        assetsReady={Boolean(assets)}
        onReveal={handleRevealed}
        onOpen={handleOpen}
        onSelect={handleSelect}
        onStep={step}
        onToggleRead={toggleRead}
        onCloseRead={closeRead}
        onHoverOpen={triggerSweep}
      />
    </main>
  );
}
