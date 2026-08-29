/* ============================================================================
   CUTSCENE — the shell every big moment plays inside.

   Two moments in this game are not screens, they are events: the night the
   drawing becomes paid steel, and the night the service opens. Both used to be
   a list you scrolled. A list is a receipt. These are supposed to feel like
   something happened.

   So: full screen, no chrome, one beat at a time. Each beat owns the whole
   viewport, holds for its own length, and hands over. The player can tap to
   push it along, or skip straight to the card at the end — nothing here is
   load-bearing, the state change happens when the sequence completes either
   way. Reduced motion turns every animation off and leaves the final frame
   of each beat, which still reads.
   ========================================================================== */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { brandVars } from '../../finance/brand';

export interface Beat {
  id: string;
  /** Two digits in the corner. Cheap, and it tells you how far in you are. */
  mark: string;
  title: string;
  line: string;
  /** How long this beat holds before it hands over, in ms. */
  ms: number;
  scene: React.ReactNode;
}

export function Cutscene({ beats, finale, brandHex, onComplete, onClose, closeLabel = 'Continue', finaleTone = 'dark' }: {
  beats: Beat[];
  finale: React.ReactNode;
  brandHex?: string;
  /** Fired exactly once, the moment the sequence reaches its end card. */
  onComplete?: () => void;
  onClose: () => void;
  closeLabel?: string;
  /** 'paper' lets a finale be a printed object rather than another dark card. */
  finaleTone?: 'dark' | 'paper';
}) {
  const [i, setI] = useState(0);
  const still = usePrefersStill();
  const brand = useMemo(() => brandVars(brandHex), [brandHex]);
  const ended = i >= beats.length;

  /* The state change belongs to the sequence, not to the button at the end —
     a player who skips has still commissioned the build. Fired once. */
  const fired = useRef(false);
  useEffect(() => {
    if (ended && !fired.current) { fired.current = true; onComplete?.(); }
  }, [ended, onComplete]);

  useEffect(() => {
    if (ended) return undefined;
    const hold = still ? Math.min(beats[i].ms, 900) : beats[i].ms;
    const t = window.setTimeout(() => setI((n) => n + 1), hold);
    return () => window.clearTimeout(t);
  }, [i, ended, beats, still]);

  /* The page behind must not scroll under a full-screen event. */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const beat = beats[Math.min(i, beats.length - 1)];

  return createPortal(
    <div className={`sf cine${still ? ' is-still' : ''}`} style={brand as React.CSSProperties} role="dialog" aria-modal="true">
      <div className="cine-vignette" aria-hidden="true" />
      <div className="cine-grain" aria-hidden="true" />

      {!ended && (
        <>
          {/* progress: one segment a beat, filling in real time */}
          <div className="cine-rail" aria-hidden="true">
            {beats.map((b, n) => (
              <i
                key={b.id}
                className={n < i ? 'is-done' : n === i ? 'is-now' : undefined}
                style={n === i ? { ['--hold' as string]: `${b.ms}ms` } : undefined}
              />
            ))}
          </div>

          <button type="button" className="cine-skip" onClick={() => setI(beats.length)}>Skip</button>

          {/* tap anywhere to push it along — nobody should be held hostage */}
          <button
            type="button"
            className="cine-advance"
            aria-label="Next"
            onClick={() => setI((n) => n + 1)}
          />

          <div className="cine-stage" key={beat.id}>{beat.scene}</div>

          <div className="cine-caption" key={`${beat.id}-cap`}>
            <span className="cine-mark">{beat.mark}</span>
            <h2>{beat.title}</h2>
            <p>{beat.line}</p>
          </div>
        </>
      )}

      {ended && (
        <div className={finaleTone === 'paper' ? 'cine-finale is-paper' : 'cine-finale'}>
          <div className="cine-finale-body">{finale}</div>
          <button type="button" className="sf-btn sf-btn--primary cine-finale-btn" onClick={onClose}>
            {closeLabel}
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
}

/* --- shared scene furniture ------------------------------------------------ */

/** A number that arrives rather than appears.

    It writes straight to the text node instead of calling setState sixty times
    a second — a counter should not put React in the animation loop, and on the
    ops-wall beat two of these running at once was enough to make the whole
    scene feel heavy. */
export function Tally({ to, from = 0, ms = 1400, format }: {
  to: number; from?: number; ms?: number; format: (n: number) => string;
}) {
  const el = useRef<HTMLSpanElement | null>(null);
  const still = usePrefersStill();

  useEffect(() => {
    const node = el.current;
    if (!node) return undefined;
    if (still) { node.textContent = format(to); return undefined; }

    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      /* ease-out: the last digits should settle, not race */
      node.textContent = format(from + (to - from) * (1 - (1 - p) ** 3));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, from, ms, still, format]);

  return <span ref={el}>{format(from)}</span>;
}

export function usePrefersStill(): boolean {
  const [still, setStill] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true,
  );
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return undefined;
    const on = () => setStill(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return still;
}

/** Deterministic jitter, so a scene looks hand-placed but never re-rolls. */
export function seeded(seed: number) {
  let s = seed || 1;
  return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
}
