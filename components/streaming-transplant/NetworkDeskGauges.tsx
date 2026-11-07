/* ============================================================================
   PLATFORM · NETWORK · the strip's three dials (#99; Zeesh 2026-11-01:
   "redesign that load market a week and also load test section in such a way
   like its a game bro but its feeling like a saas app").

   One instrument, three readings: a 270° arc of ticks round a dark well, the
   value at its heart, the gap at the foot open like a dashboard's.
     LOAD     a tick lights for every step of the busiest hour's load: green,
              amber from 70%, red from 85% (the red line glows faintly when it
              is not reached); the last lit tick is the needle's tip
     MARKETS  a tick a market: green where 80% or more is served, amber where
              some is, dark where none is; the lit ones first
     A WEEK   the week's money a tick ring, split by part in the brand's shades
              (servers and rooms, cloud, bandwidth, fibre), incidents in red
   The ticks light in turn when a dial comes in, and a light runs along the lit
   ones now and then. Reduced motion stills them (NetworkDeskBoard.css).
   ========================================================================== */
import React from 'react';

const ARC_FROM = -135;
const ARC_SWEEP = 270;
const TICKS = 28;

/** a tick at an angle (0 = top, clockwise) between two radii of the 100-unit box */
const tickAt = (angle: number, inner = 38, outer = 46) => {
  const rad = (angle - 90) * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x1: 50 + inner * cos, y1: 50 + inner * sin, x2: 50 + outer * cos, y2: 50 + outer * sin };
};
const angleOf = (index: number, count: number) => ARC_FROM + (count > 1 ? index / (count - 1) : .5) * ARC_SWEEP;

type Tick = { className?: string };
const Ticks: React.FC<{ ticks: Tick[]; kind: string; width?: number }> = ({ ticks, kind, width }) => {
  const lit = ticks.filter(tick => tick.className?.includes('is-on')).length;
  return (
    <svg className={`nd-ring is-${kind}`} viewBox="0 0 100 100" aria-hidden="true" focusable="false"
      style={{ ['--n' as string]: Math.max(1, lit) } as React.CSSProperties}>
      {ticks.map((tick, index) => (
        <line key={index} {...tickAt(angleOf(index, ticks.length))} className={tick.className} strokeWidth={width}
          style={{ ['--i' as string]: index } as React.CSSProperties} />
      ))}
    </svg>
  );
};

/** LOAD: the busiest hour's load against capacity, green → amber at 70% → red at 85% */
export const LoadDial: React.FC<{ percent: number }> = ({ percent }) => {
  const value = Math.max(0, Math.min(100, percent));
  const ticks = Array.from({ length: TICKS }, (_, index) => {
    const step = index / (TICKS - 1) * 100;
    const zone = step >= 85 ? 'is-bad' : step >= 70 ? 'is-warn' : 'is-good';
    return { step, zone, on: value > 0 && step <= value + .001 };
  });
  const tip = ticks.reduce((last, tick, index) => (tick.on ? index : last), -1);
  return <Ticks kind="load" ticks={ticks.map((tick, index) => ({
    className: [tick.zone, tick.on ? 'is-on' : '', index === tip ? 'is-tip' : ''].filter(Boolean).join(' '),
  }))} />;
};

/** MARKETS: a tick a market, the best served first */
export const MarketsDial: React.FC<{ shares: number[] }> = ({ shares }) => {
  const sorted = [...shares].sort((a, b) => b - a);
  /* a tick's width follows how many share the arc, so 25 markets and 60 both read */
  const spacing = 2 * Math.PI * 42 * (ARC_SWEEP / 360) / Math.max(1, sorted.length);
  return <Ticks kind="markets" width={Math.max(1.4, Math.min(3.6, spacing * .42))} ticks={sorted.map(share => ({
    className: share >= .8 ? 'is-on is-good' : share > .02 ? 'is-on is-warn' : undefined,
  }))} />;
};

/** A WEEK: the week's money by part; `shade` 0–3 are the brand's, 4 is incidents */
export const MoneyDial: React.FC<{ parts: Array<{ weekly: number; shade: number }> }> = ({ parts }) => {
  const total = parts.reduce((sum, part) => sum + Math.max(0, part.weekly), 0);
  /* where each part ends along the arc, 0–1 */
  let end = 0;
  const edges = parts.map(part => {
    end += total > 0 ? Math.max(0, part.weekly) / total : 0;
    return { end, shade: part.shade };
  });
  return <Ticks kind="money" ticks={Array.from({ length: TICKS }, (_, index) => {
    const middle = (index + .5) / TICKS;
    const part = total > 0 ? edges.find(edge => middle <= edge.end + 1e-9) : undefined;
    return { className: part ? `is-on is-p${part.shade}` : undefined };
  })} />;
};
