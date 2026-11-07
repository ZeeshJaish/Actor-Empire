/* ============================================================================
   The launch HUD — one bar at the foot of every step (#110; plan §18.4: "One
   HUD bar at the bottom: the money left and this step's number, one big button
   for the next step, and Back as an icon").

   It replaces two bars: the plan strip (the step's figure, a budget bar, the
   studio's money) and a Back | Next row under it. One card now carries:

   · what still blocks the step, at its top edge;
   · this step's number on the left and the money left after the plan on the
     right, with the fuel line between them: the plan against the money;
   · Back as an icon, and the next stage as the one big button.

   Tapping the readout opens the detail above it: the step's state in a
   sentence, the money and the plan, the bill, and where more money comes from.
   ========================================================================== */

import { useEffect, useState, type ReactNode } from 'react';
import { Figure, type StripView } from '../kit';
import { money } from '../../finance/format';

export interface LaunchHudProps {
  view: StripView;
  /** The step this bar reads, so leaving it closes the detail. */
  page: string;
  /** The launch plan's cost against what the studio can still spend. */
  planned: number;
  free: number;
  /** False hides the readout: Pricing before an offer is chosen has no number. */
  readout: boolean;
  blockers: Array<{ id: string; text: string; severity: 'block' | 'warn' }>;
  ways: Array<{ label: string; primary?: boolean; onClick: () => void }>;
  /** Missing on the first step. */
  onBack?: () => void;
  next: { label: string; eyebrow?: string; glyph?: ReactNode; disabled?: boolean; describedBy?: string; onClick: () => void };
  /** #157: what the plan is called in the detail (The Build: "The build") */
  planLabel?: string;
}

export function LaunchHud({ view, page, planned, free, readout, blockers, ways, onBack, next, planLabel = 'Launch plan' }: LaunchHudProps) {
  const [open, setOpen] = useState(false);
  /* An opened detail that followed you to the next step would arrive reading
     the last one's numbers. */
  useEffect(() => setOpen(false), [page]);
  const short = Math.max(0, planned - free);
  const scale = Math.max(1, planned, free);
  const within = (Math.min(planned, free) / scale) * 100;
  const past = short > 0 ? (short / scale) * 100 : 0;

  return (
    <footer
      className={short > 0 || view.blocking ? 'lw-hud is-over' : 'lw-hud'}
      data-page={page}
      data-tone={view.verdict?.tone ?? 'flat'}
    >
      {open && readout && (
        <div className="lw-hud-more">
          <p className="lw-hud-say">
            {view.verdict && <b className={`is-${view.verdict.tone}`}><i aria-hidden="true" />{view.verdict.label}</b>}
            <span>{view.gauge.label}</span>
          </p>
          <p className="lw-hud-sums">
            <span><em>Studio money</em><b>{money(free)}</b></span>
            <span><em>{planLabel}</em><b>{money(planned)}</b></span>
          </p>
          <div className="lw-hud-ways">
            {ways.map((way) => (
              <button key={way.label} type="button" className={way.primary ? 'is-primary' : undefined} onClick={way.onClick}>
                {way.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {blockers.length > 0 && (
        <ul className="lw-hud-alerts">
          {blockers.map((b) => (
            <li key={b.id} className={b.severity === 'block' ? 'is-block' : 'is-warn'}>
              <i aria-hidden="true" />{b.text}
            </li>
          ))}
        </ul>
      )}

      {readout && (
        <button type="button" className="lw-hud-read" aria-expanded={open} onClick={() => setOpen((was) => !was)}>
          <span className="lw-hud-cell">
            <em><i aria-hidden="true" />{view.subject}</em>
            {/* Keyed by page so each step's figure starts at its own value
                instead of counting from the last step's. */}
            <Figure key={page} value={view.value} format={view.format} unit={view.unit} duration={page === 'pricing' ? 260 : undefined} />
          </span>
          <span className="lw-hud-cell is-end">
            <em>{short > 0 ? 'Short' : 'Money left'}</em>
            <b className={short > 0 ? 'is-short' : undefined}>{money(short > 0 ? short : free - planned)}</b>
          </span>
          <span className="lw-hud-caret" aria-hidden="true" />
          <span className="lw-hud-fuel" role="img" aria-label={`${planLabel} ${money(planned)} of ${money(free)}`}>
            <i className="lw-hud-within" style={{ width: `${within}%` }} />
            {past > 0 && <i className="lw-hud-past" style={{ width: `${past}%` }} />}
          </span>
        </button>
      )}

      <div className="lw-hud-go">
        <button type="button" className="lw-hud-back" aria-label="Back" disabled={!onBack} onClick={onBack}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 2.5L4.5 8l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <button type="button" className="lw-hud-next" disabled={next.disabled} aria-describedby={next.describedBy} onClick={next.onClick}>
          {next.glyph && <span className="lw-hud-next-glyph" aria-hidden="true">{next.glyph}</span>}
          <span className="lw-hud-next-words">
            {next.eyebrow && <em>{next.eyebrow}</em>}
            <b>{next.label}</b>
          </span>
          <svg className="lw-hud-next-go" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 2.5L11.5 8 6 13.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </footer>
  );
}
