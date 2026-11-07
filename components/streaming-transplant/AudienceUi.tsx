/**
 * Small moving parts of the Audience room (#130): a figure that counts up when the room opens.
 * A tap never waits on it: the final figure is in the DOM from the first frame for screen readers, and reduced
 * motion shows it at once.
 */
import React, { useEffect, useRef, useState } from 'react';

const reducedMotion = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Counts from zero to `value` over `ms` (ease-out), formatting each frame; re-runs when the value changes. */
export const CountUp: React.FC<{ value: number; format: (value: number) => string; ms?: number; className?: string }> = ({ value, format, ms = 650, className }) => {
  const [shown, setShown] = useState(() => (reducedMotion() ? value : 0));
  const from = useRef(0);
  useEffect(() => {
    if (reducedMotion() || typeof requestAnimationFrame === 'undefined') { setShown(value); return undefined; }
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(origin + (value - origin) * eased);
      if (t < 1) frame = requestAnimationFrame(step);
      else from.current = value;
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, ms]);
  return (
    <span className={className}>
      <span aria-hidden="true">{format(shown)}</span>
      <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>{format(value)}</span>
    </span>
  );
};
