/* ============================================================================
   MOTION — the small physics of a figure that changes.

   A number that jumps reads as a mistake; a number that rolls to its new
   value reads as a meter settling, which is what it is. One hook, used by
   the region rows and the map's readout, so every figure on the page moves
   the same way — and none of them move at all for someone who asked their
   phone for less motion, or in a static render, where the final value is
   the only honest one.
   ========================================================================== */

import { useEffect, useRef, useState } from 'react';

export const prefersReducedMotion = (): boolean => (
  typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches
);

const inBrowser = (): boolean => typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function';

/** The value as it should be shown right now: rolling toward `value` over
    `duration` ms, eased out, from wherever the display was. With `fromZero`
    the first reading rolls up from nothing — the meter being read for the
    first time — otherwise it opens on the value and only moves after. */
export function useCountUp(value: number, options: { duration?: number; fromZero?: boolean } = {}): number {
  const { duration = 520, fromZero = false } = options;
  const still = !inBrowser() || prefersReducedMotion();
  const [shown, setShown] = useState<number>(fromZero && !still ? 0 : value);
  const current = useRef(shown);
  current.current = shown;
  const frame = useRef(0);

  useEffect(() => {
    if (still) { setShown(value); return undefined; }
    const from = current.current;
    if (from === value) return undefined;
    const startedAt = performance.now();
    const tick = (now: number) => {
      /* A browser may hand the first RAF callback the frame timestamp that
         began just before this effect ran. Clamp both ends so an honest zero
         never flashes as a negative number on that first painted frame. */
      const t = Math.max(0, Math.min(1, (now - startedAt) / duration));
      const eased = 1 - (1 - t) ** 3;
      setShown(from + (value - from) * eased);
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [value, duration, still]);

  return shown;
}
