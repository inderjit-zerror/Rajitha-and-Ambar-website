'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import Loader from './Loader';

const Arrow = ({ dir }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path
      d={dir === 'left' ? 'M14.5 5.5 8 12l6.5 6.5' : 'M9.5 5.5 16 12l-6.5 6.5'}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Everything drawn on top of the 3D canvas (DOM). */
export default function Overlay({ ui, couple, events, phase, flat = false, compact, selected, reading, progress, assetsReady, onReveal, onOpen, onSelect, onStep, onToggleRead, onCloseRead, onHoverOpen }) {
  const ctaRef = useRef(null);
  const isOpen = phase === 'open';
  const showChrome = phase !== 'loading';

  // CTA: the invitation line and the button letters stagger in once the book
  // hovers; on click everything folds away before the seal breaks.
  useGSAP(
    () => {
      const root = ctaRef.current;
      if (!root) return;
      const line = root.querySelector('.cta__line');
      const btn = root.querySelector('.cta__btn');
      const letters = root.querySelectorAll('.cta__char');
      if (phase === 'ready') {
        gsap.set(root, { autoAlpha: 1 });
        gsap
          .timeline()
          .fromTo(line, { autoAlpha: 0, y: 14, filter: 'blur(6px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 1, ease: 'power3.out' })
          .fromTo(btn, { autoAlpha: 0, y: 18, scale: 0.94 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.9, ease: 'power3.out' }, 0.25)
          .fromTo(letters, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.035, ease: 'power2.out' }, 0.45);
      } else if (phase === 'opening' || phase === 'open') {
        gsap
          .timeline({ onComplete: () => gsap.set(root, { display: 'none' }) })
          .to(letters, { autoAlpha: 0, y: -6, duration: 0.25, stagger: 0.015, ease: 'power2.in' }, 0)
          .to(btn, { autoAlpha: 0, scale: 0.92, duration: 0.4, ease: 'power2.in' }, 0.1)
          .to(line, { autoAlpha: 0, y: -10, duration: 0.4, ease: 'power2.in' }, 0);
      } else {
        gsap.set(root, { autoAlpha: 0 });
      }
    },
    { dependencies: [phase] }
  );

  const current = events[selected];
  const pad = (n) => String(n).padStart(2, '0');

  return (
    <div className="overlay">
      {/* photographic atmosphere: window light, vignette and grain */}
      <div className="atmos atmos--light" />
      <div className="atmos atmos--vignette" />
      <div className="atmos atmos--grain" />

      <Loader couple={couple} ui={ui} progress={progress} ready={assetsReady} onReveal={onReveal} />

      {/* the plain HTML invitation (no WebGL) brings its own navigation */}
      {!flat && (
        <>
          <header className={`brand ${showChrome ? 'is-visible' : ''} ${reading ? 'is-reading' : ''}`}>
            <span className="brand__mark">
              {couple.monogram.first}
              <i>&amp;</i>
              {couple.monogram.second}
            </span>
            <span className="brand__meta">{couple.location}</span>
          </header>

          <div ref={ctaRef} className="cta" style={{ visibility: 'hidden', opacity: 0 }}>
            <p className="cta__line">{ui.invitedLine}</p>
            <button
              type="button"
              className="cta__btn"
              onClick={onOpen}
              onMouseEnter={onHoverOpen}
              disabled={phase !== 'ready'}
              aria-label={ui.openButton}
            >
              <span className="cta__seal" aria-hidden="true">
                {couple.monogram.first}
                <i>&amp;</i>
                {couple.monogram.second}
              </span>
              <span className="cta__label" aria-hidden="true">
                {[...ui.openButton].map((c, i) => (
                  <span key={i} className="cta__char">
                    {c === ' ' ? ' ' : c}
                  </span>
                ))}
              </span>
            </button>
          </div>

          {/* event navigation, synced with the 3D cards */}
          <nav className={`events-nav ${isOpen && !reading ? 'is-visible' : ''}`} aria-label="Wedding events">
            <p className="events-nav__hint">{compact ? ui.hintMobile : ui.hint}</p>
            <div className="events-nav__list">
              {events.map((event, i) => (
                <button
                  key={event.id}
                  type="button"
                  className={`events-nav__item ${selected === i ? 'is-active' : ''}`}
                  aria-pressed={selected === i}
                  onClick={() => onSelect(i)}
                  tabIndex={isOpen && !reading ? 0 : -1}
                >
                  <span className="events-nav__swatch" style={{ background: event.theme?.paper, borderColor: event.theme?.accent }} />
                  {event.title}
                </button>
              ))}
              {!compact && (
                <button type="button" className="events-nav__read" onClick={onToggleRead} tabIndex={isOpen && !reading ? 0 : -1}>
                  Read
                </button>
              )}
            </div>
          </nav>

          {/* reading mode controls */}
          <div className={`reader ${reading ? 'is-visible' : ''}`}>
            <button type="button" className="reader__close" onClick={onCloseRead} tabIndex={reading ? 0 : -1}>
              <span aria-hidden="true">✕</span> {ui.close}
            </button>
            <button type="button" className="reader__arrow reader__arrow--prev" onClick={() => onStep(-1)} aria-label={ui.previous} tabIndex={reading ? 0 : -1}>
              <Arrow dir="left" />
            </button>
            <button type="button" className="reader__arrow reader__arrow--next" onClick={() => onStep(1)} aria-label={ui.next} tabIndex={reading ? 0 : -1}>
              <Arrow dir="right" />
            </button>
            <div className="reader__caption">
              <span className="reader__count">
                {pad(selected + 1)} <i>/</i> {pad(events.length)}
              </span>
              <span className="reader__title">{current?.title}</span>
              {!compact && <span className="reader__hint">{ui.readHint}</span>}
            </div>
          </div>

          {/* screen-reader copy of the invitation */}
          <section className="sr-only" aria-live="polite">
            {isOpen && current && (
              <>
                <h2>{current.title}</h2>
                {Object.values(current.detail || {})
                  .filter(Boolean)
                  .map((line) => (
                    <p key={line}>{line}</p>
                  ))}
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
