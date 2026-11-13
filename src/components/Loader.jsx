'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

const MIN_ON_SCREEN = 2.4; // seconds: lets the monogram finish drawing itself

/**
 * Loading screen: the monogram draws itself in ink while a gold ring traces the
 * real loading progress. When everything is painted, the emblem lifts away and
 * the screen opens like an iris onto the 3D scene.
 */
export default function Loader({ couple, ui, progress, ready, onReveal }) {
  const rootRef = useRef(null);
  const ringRef = useRef(null);
  const dotRef = useRef(null);
  const countRef = useRef(null);
  const shown = useRef({ v: 0 });
  const mountedAt = useRef(0);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    mountedAt.current = performance.now();
  }, []);

  // smooth the progress: the counter, ring and travelling dot follow it
  useEffect(() => {
    const draw = () => {
      const v = shown.current.v;
      if (countRef.current) countRef.current.textContent = String(Math.round(v)).padStart(2, '0');
      if (ringRef.current) ringRef.current.style.strokeDashoffset = String(100 - v);
      if (dotRef.current) dotRef.current.style.transform = `rotate(${v * 3.6}deg)`;
    };
    const target = ready ? 100 : Math.min(97, progress * 100);
    const tween = gsap.to(shown.current, {
      v: target,
      duration: ready ? 0.9 : 0.8,
      ease: 'power2.out',
      onUpdate: draw,
    });
    return () => tween.kill();
  }, [progress, ready]);

  // exit: emblem lifts and dissolves, then the iris opens onto the scene
  useEffect(() => {
    if (!ready) return undefined;
    const root = rootRef.current;
    const elapsed = (performance.now() - mountedAt.current) / 1000;
    const emblem = root.querySelector('.loader__emblem');
    const texts = root.querySelectorAll('.loader__text, .loader__count, .loader__rule');
    const tl = gsap
      .timeline({ delay: Math.max(0.9, MIN_ON_SCREEN - elapsed) })
      .to(emblem, { scale: 1.05, duration: 0.45, ease: 'power2.out' }, 0)
      .to(root.querySelector('.loader__glow'), { opacity: 1, scale: 1.25, duration: 0.6, ease: 'power2.out' }, 0)
      .to(texts, { autoAlpha: 0, y: 10, duration: 0.45, stagger: 0.05, ease: 'power2.in' }, 0.05)
      .to(emblem, { autoAlpha: 0, scale: 1.22, filter: 'blur(6px)', duration: 0.65, ease: 'power2.in' }, 0.4)
      .call(() => onReveal?.(), null, 0.75)
      .fromTo(root, { '--iris': '-18%' }, { '--iris': '125%', duration: 1.7, ease: 'power2.inOut' }, 0.75)
      .call(() => setGone(true));
    return () => tl.kill();
  }, [ready, onReveal]);

  if (gone) return null;

  return (
    <div ref={rootRef} className="loader" role="status" aria-live="polite" aria-label={ui.loading}>
      <div className="loader__glow" />
      <div className="loader__emblem">
        <svg className="loader__svg" viewBox="0 0 240 240" aria-hidden="true">
          <circle className="loader__ring-inner" cx="120" cy="120" r="96" />
          <circle className="loader__ring-base" cx="120" cy="120" r="110" pathLength="100" />
          <circle ref={ringRef} className="loader__ring" cx="120" cy="120" r="110" pathLength="100" transform="rotate(-90 120 120)" />
          <g ref={dotRef} className="loader__dot">
            <circle cx="120" cy="10" r="3.4" />
          </g>
          <text className="loader__mono" x="120" y="146" textAnchor="middle">
            <tspan>{couple.monogram.first}</tspan>
            <tspan className="loader__amp" dx="-2" dy="-6">
              &amp;
            </tspan>
            <tspan dx="-2" dy="6">
              {couple.monogram.second}
            </tspan>
          </text>
        </svg>
      </div>
      <span className="loader__rule" aria-hidden="true" />
      <p className="loader__text">{ui.loading}</p>
      <p className="loader__count" aria-hidden="true">
        <span ref={countRef}>00</span>
        <i>%</i>
      </p>
    </div>
  );
}
