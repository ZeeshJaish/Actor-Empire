/* Shared pieces used by more than one Studio Finance view. Nothing here knows
   about finance — they are the screen's vocabulary, not its content. */

import { useEffect, useRef, useState, type ReactNode } from 'react';

export type Tone = 'good' | 'warn' | 'bad' | 'flat' | 'gold';

/* --- segmented control ------------------------------------------------------ */

interface SegmentedProps<T extends string> {
  options: Array<{ key: T; label: string }>;
  value: T;
  onChange: (key: T) => void;
  /** `bar` is the screen-wide period strip, `line` an in-page lens switch,
      `pill` the small enclosed switch. */
  variant?: 'pill' | 'line' | 'bar';
  ariaLabel?: string;
}

export function Segmented<T extends string>({ options, value, onChange, variant = 'pill', ariaLabel }: SegmentedProps<T>) {
  const index = Math.max(0, options.findIndex((o) => o.key === value));
  return (
    <div
      className={`sf-seg sf-seg--${variant}`}
      role="tablist"
      aria-label={ariaLabel}
      style={{ ['--sf-seg-count' as string]: options.length, ['--sf-seg-index' as string]: index }}
    >
      <span className="sf-seg-marker" aria-hidden="true" />
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          role="tab"
          aria-selected={option.key === value}
          className={option.key === value ? 'sf-seg-btn is-on' : 'sf-seg-btn'}
          onClick={() => onChange(option.key)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* --- bottom sheet ----------------------------------------------------------- */

interface SheetProps {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export function Sheet({ open, onClose, eyebrow, title, children, footer }: SheetProps) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="sf-sheet-layer">
      <button type="button" className="sf-sheet-scrim" aria-label="Close" onClick={onClose} />
      <section className="sf-sheet" role="dialog" aria-modal="true">
        <span className="sf-sheet-grip" aria-hidden="true" />
        <header className="sf-sheet-head">
          <div>
            {eyebrow && <p className="sf-eyebrow">{eyebrow}</p>}
            <h3 className="sf-sheet-title">{title}</h3>
          </div>
          <button type="button" className="sf-icon-btn" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
        </header>
        <div className="sf-sheet-body">{children}</div>
        {footer && <footer className="sf-sheet-foot">{footer}</footer>}
      </section>
    </div>
  );
}

/* --- small display pieces ---------------------------------------------------- */

export function Tag({ tone = 'flat', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`sf-tag sf-tone-${tone}`}>{children}</span>;
}

export function TrendChip({ value, label }: { value: number; label: string }) {
  const tone: Tone = value > 0.5 ? 'good' : value < -0.5 ? 'bad' : 'flat';
  const glyph = value > 0.5 ? '▲' : value < -0.5 ? '▼' : '—';
  return (
    <span className={`sf-trend sf-tone-${tone}`}>
      <span aria-hidden="true">{glyph}</span> {label}
    </span>
  );
}

/** A labelled horizontal meter. `fill` is 0–1; anything past 1 clamps. */
export function Meter({ fill, tone = 'flat', ticks = 0 }: { fill: number; tone?: Tone; ticks?: number }) {
  const width = `${Math.max(0, Math.min(1, fill)) * 100}%`;
  return (
    <div className={`sf-meter sf-tone-${tone}`}>
      <span className="sf-meter-fill" style={{ width }} />
      {ticks > 0 && (
        <span className="sf-meter-ticks" aria-hidden="true">
          {Array.from({ length: ticks }, (_, i) => <i key={i} />)}
        </span>
      )}
    </div>
  );
}

export function Row({ label, value, tone = 'flat', muted }: { label: ReactNode; value: ReactNode; tone?: Tone; muted?: boolean }) {
  return (
    <div className={muted ? 'sf-row is-muted' : 'sf-row'}>
      <span className="sf-row-label">{label}</span>
      <span className={`sf-row-value sf-tone-${tone}`}>{value}</span>
    </div>
  );
}

/* --- animated money --------------------------------------------------------- */

/** Counts to a new value when it changes. Instant for reduced-motion players. */
export function useCountUp(target: number, duration = 620): number {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    const reduced = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const from = fromRef.current;
    if (reduced || from === target) {
      fromRef.current = target;
      setDisplay(target);
      return undefined;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(from + (target - from) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return display;
}
