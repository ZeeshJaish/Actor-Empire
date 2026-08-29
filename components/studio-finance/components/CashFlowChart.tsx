/* ============================================================================
   Revenue against expense, week by week.

   Revenue rises from the centre line, expense falls from it, so the shape of a
   healthy company is legible before a single number is read: top-heavy is good.
   The net line rides above the columns. Game events sit on their own rail under
   the axis, because a founder injection is not a revenue week and should never
   be drawn as one.

   Colour is never the only signal — revenue is solid, expense is hatched.
   ========================================================================== */

import { useMemo, useState } from 'react';
import type { FinanceEvent, WeekPoint } from '../finance/types';
import { delta, money } from '../finance/format';

const W = 360;
const H = 150;
const PAD_X = 6;
const BASE = 72;      // the centre line — the two fields are equal so a
const TOP = 10;       // revenue bar and an expense bar of the same size
const FLOOR = 134;    // are drawn the same length
const RAIL = 146;     // event rail

const EVENT_GLYPH: Record<FinanceEvent['kind'], string> = {
  launch: '▲',
  build: '●',
  capital: '◆',
  record: '★',
  risk: '!',
};

interface Props {
  weeks: WeekPoint[];
  events: FinanceEvent[];
  totals: { revenue: number; expense: number; net: number };
}

export function CashFlowChart({ weeks, events, totals }: Props) {
  const [active, setActive] = useState<number | null>(null);

  const view = useMemo(() => {
    const peak = Math.max(1, ...weeks.map((w) => Math.max(w.revenue, w.expense)));
    const step = (W - PAD_X * 2) / Math.max(1, weeks.length);
    const barW = Math.max(2, Math.min(14, step * 0.52));
    const x = (i: number) => PAD_X + step * i + step / 2;
    const up = (value: number) => BASE - (value / peak) * (BASE - TOP);
    const down = (value: number) => BASE + (value / peak) * (FLOOR - BASE);
    const netLine = weeks
      .map((w, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${up(Math.max(0, w.revenue - w.expense)).toFixed(1)}`)
      .join(' ');
    return { peak, step, barW, x, up, down, netLine };
  }, [weeks]);

  const eventsByWeek = useMemo(() => {
    const map = new Map<number, FinanceEvent>();
    events.forEach((e) => map.set(e.week, e));
    return map;
  }, [events]);

  const shown = active !== null ? weeks[active] : null;
  const shownEvent = shown ? eventsByWeek.get(shown.week) : null;

  if (weeks.length === 0) {
    return (
      <section className="sf-chart">
        <header className="sf-chart-head">
          <div className="sf-chart-stat"><p className="sf-eyebrow">Revenue</p><p className="sf-chart-value sf-tone-good">{money(0)}</p></div>
          <div className="sf-chart-stat"><p className="sf-eyebrow">Expenses</p><p className="sf-chart-value sf-tone-bad">{money(0)}</p></div>
          <div className="sf-chart-stat"><p className="sf-eyebrow">Net result</p><p className="sf-chart-value sf-tone-good">{delta(0)}</p></div>
        </header>
        <p className="sf-empty">Operating history begins after opening night.</p>
      </section>
    );
  }

  const pick = (clientX: number, target: SVGSVGElement) => {
    const box = target.getBoundingClientRect();
    const ratio = (clientX - box.left) / box.width;
    const index = Math.round((ratio * W - PAD_X - view.step / 2) / view.step);
    setActive(Math.max(0, Math.min(weeks.length - 1, index)));
  };

  return (
    <section className="sf-chart">
      <header className="sf-chart-head">
        {shown ? (
          <>
            <div className="sf-chart-stat">
              <p className="sf-eyebrow">Week {shown.week}</p>
              <p className="sf-chart-value">{money(shown.revenue - shown.expense, { sign: true })}</p>
            </div>
            <div className="sf-chart-stat">
              <p className="sf-eyebrow">In</p>
              <p className="sf-chart-value sf-tone-good">{money(shown.revenue)}</p>
            </div>
            <div className="sf-chart-stat">
              <p className="sf-eyebrow">Out</p>
              <p className="sf-chart-value sf-tone-bad">{money(shown.expense)}</p>
            </div>
          </>
        ) : (
          <>
            <div className="sf-chart-stat">
              <p className="sf-eyebrow">Revenue</p>
              <p className="sf-chart-value sf-tone-good">{money(totals.revenue)}</p>
            </div>
            <div className="sf-chart-stat">
              <p className="sf-eyebrow">Expenses</p>
              <p className="sf-chart-value sf-tone-bad">{money(totals.expense)}</p>
            </div>
            <div className="sf-chart-stat">
              <p className="sf-eyebrow">Net result</p>
              <p className={`sf-chart-value ${totals.net >= 0 ? 'sf-tone-good' : 'sf-tone-bad'}`}>{delta(totals.net)}</p>
            </div>
          </>
        )}
      </header>

      <svg
        className="sf-chart-svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Revenue against expenses across ${weeks.length} weeks`}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); pick(e.clientX, e.currentTarget); }}
        onPointerMove={(e) => { if (e.buttons > 0) pick(e.clientX, e.currentTarget); }}
        onPointerUp={() => setActive(null)}
        onPointerLeave={() => setActive(null)}
      >
        <defs>
          <pattern id="sfHatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="4" height="4" fill="var(--sf-bad-deep)" />
            <line x1="0" y1="0" x2="0" y2="4" stroke="var(--sf-bad)" strokeWidth="1.6" />
          </pattern>
        </defs>

        {weeks.map((w, i) => {
          const isOn = i === active;
          const y = view.up(w.revenue);
          const yd = view.down(w.expense);
          const event = eventsByWeek.get(w.week);
          return (
            <g key={w.week} opacity={active === null || isOn ? 1 : 0.42}>
              <rect x={view.x(i) - view.barW / 2} y={y} width={view.barW} height={Math.max(1, BASE - y)} rx="1" fill="var(--sf-good)" opacity={isOn ? 1 : 0.85} />
              <rect x={view.x(i) - view.barW / 2} y={BASE} width={view.barW} height={Math.max(1, yd - BASE)} rx="1" fill="url(#sfHatch)" />
              {event && (
                <>
                  <line x1={view.x(i)} y1={FLOOR + 2} x2={view.x(i)} y2={RAIL - 7} stroke="var(--sf-line)" strokeWidth="1" />
                  <text x={view.x(i)} y={RAIL} textAnchor="middle" className={`sf-ev sf-ev--${event.kind}`}>{EVENT_GLYPH[event.kind]}</text>
                </>
              )}
            </g>
          );
        })}

        <path d={view.netLine} fill="none" stroke="var(--sf-fg)" strokeWidth="1.4" strokeLinejoin="round" opacity="0.55" vectorEffect="non-scaling-stroke" />
        <line x1="0" y1={BASE} x2={W} y2={BASE} stroke="var(--sf-line-strong)" strokeWidth="1" vectorEffect="non-scaling-stroke" />

        {active !== null && (
          <line x1={view.x(active)} y1={TOP - 6} x2={view.x(active)} y2={FLOOR + 4} stroke="var(--sf-brand-on)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        )}
      </svg>

      <p className="sf-chart-foot">
        {shownEvent
          ? <><span className={`sf-ev-inline sf-ev--${shownEvent.kind}`}>{EVENT_GLYPH[shownEvent.kind]}</span> {shownEvent.label}</>
          : <>Drag across the weeks to read one. {weeks.length} weeks shown · <span className="sf-key-rev">solid</span> in, <span className="sf-key-exp">hatched</span> out.</>}
      </p>
    </section>
  );
}
