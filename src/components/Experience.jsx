'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { couple, events, invitationHeader, ui } from '@/content/invitation';
import { detectQuality } from '@/lib/quality';
import Overlay from './Overlay';
import FlatInvitation from './FlatInvitation';

// The 3D stage (three.js, WebGL) is browser-only and heavy, so it lives in its
// own chunk. Everything else here, the loader included, is rendered into the
// HTML: the monogram starts drawing before any JavaScript has arrived.
const Stage = dynamic(() => import('./Stage'), { ssr: false });

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

// Device capabilities and URL options are only known in the browser. Read once,
// through useSyncExternalStore so the server render and hydration see `null`
// and the browser's values follow straight after.
const NO_URL_OPTIONS = { autoOpen: false, autoRead: false, event: 0 };
let clientInfo = null;
const getClientInfo = () => {
  if (!clientInfo) clientInfo = { quality: detectQuality(), url: readUrlOptions() };
  return clientInfo;
};
const getServerInfo = () => null;
const subscribeNever = () => () => {};

/**
 * phase:  loading → intro → ready → opening → open
 * reading: the invitation card is lifted towards the camera for comfortable reading
 * flat:    no usable WebGL — a plain HTML invitation replaces the 3D book
 */
export default function Experience() {
  const compact = useCompact();
  // null while rendering on the server and hydrating; the browser's values after
  const client = useSyncExternalStore(subscribeNever, getClientInfo, getServerInfo);
  const quality = client?.quality ?? null;
  const urlOptions = client?.url ?? NO_URL_OPTIONS;
  const [failed, setFailed] = useState(false);
  const [warm, setWarm] = useState(false); // textures uploaded + shaders compiled
  const [phase, setPhase] = useState('loading');
  const [selected, setSelected] = useState(0);
  const [reading, setReading] = useState(false);
  const [sweep, setSweep] = useState(0);
  const [progress, setProgress] = useState(0);
  const flat = failed || quality?.webgl === false;

  // apply ?event / ?read once the URL can be read (state adjusted during render)
  const [urlApplied, setUrlApplied] = useState(false);
  if (client && !urlApplied) {
    setUrlApplied(true);
    setSelected(urlOptions.event);
    setReading(urlOptions.autoRead);
  }

  // Low-end devices also get lighter page effects (see globals.css)
  useEffect(() => {
    if (quality) document.documentElement.dataset.quality = flat ? 'flat' : quality.tier;
  }, [quality, flat]);

  const handleWarm = useCallback(() => setWarm(true), []);
  const handleFail = useCallback((error) => {
    console.warn('[invitation] 3D view unavailable, showing the plain invitation instead.', error);
    setFailed(true);
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
  const autoOpen = urlOptions.autoOpen;
  const handleIntroDone = useCallback(() => {
    setPhase((p) => (p === 'intro' ? (autoOpen ? 'opening' : 'ready') : p));
  }, [autoOpen]);
  const handleOpened = useCallback(() => setPhase('open'), []);

  // keyboard: Enter/Space opens, ←/→ browse events, Esc leaves reading mode
  useEffect(() => {
    const onKey = (e) => {
      if (e.target instanceof HTMLElement && e.target.closest('button')) {
        if (e.key === 'Enter' || e.key === ' ') return;
      }
      if (flat) {
        if (e.key === 'ArrowRight') step(1);
        else if (e.key === 'ArrowLeft') step(-1);
      } else if (phase === 'ready' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        handleOpen();
      } else if (isOpen && e.key === 'ArrowRight') step(1);
      else if (isOpen && e.key === 'ArrowLeft') step(-1);
      else if (isOpen && e.key === 'Escape') closeRead();
      else if (isOpen && (e.key === 'r' || e.key === 'R')) toggleRead();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flat, phase, isOpen, handleOpen, step, closeRead, toggleRead]);

  const framing = phase === 'opening' || isOpen ? (reading ? 'read' : 'spread') : 'closed';

  return (
    <main className="experience">
      {flat ? (
        <FlatInvitation couple={couple} header={invitationHeader} events={events} selected={selected} onSelect={setSelected} />
      ) : (
        <div className="experience__canvas" aria-hidden="true">
          {quality && (
            <Stage
              quality={quality}
              couple={couple}
              events={events}
              header={invitationHeader}
              warm={warm}
              onProgress={setProgress}
              onFail={handleFail}
              phase={phase}
              selected={selected}
              framing={framing}
              reading={reading && isOpen}
              sweep={sweep}
              onWarm={handleWarm}
              onSelect={handleSelect}
              onRequestOpen={handleOpen}
              onToggleRead={toggleRead}
              onHoverBook={triggerSweep}
              onIntroDone={handleIntroDone}
              onOpened={handleOpened}
            />
          )}
        </div>
      )}

      <Overlay
        ui={ui}
        couple={couple}
        events={events}
        phase={phase}
        flat={flat}
        compact={compact}
        selected={selected}
        reading={reading && isOpen}
        progress={flat ? 1 : progress}
        assetsReady={flat || warm}
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
