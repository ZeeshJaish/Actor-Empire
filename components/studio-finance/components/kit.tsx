/* ============================================================================
   THE KIT — the family's shared vocabulary.

   Both wizards are built from these, so a stage in the Build looks like a step
   in Define the Launch because it is made of the same parts, not because
   someone matched the CSS by hand. Three rules these enforce:

   · every stage opens on a Headline — its question, large, with its state;
   · every decision is a Tile or a Dial you tap, never a bare form control;
   · every number that matters is a Figure, and it counts to its value.

   Nothing here knows about finance. kit.css carries the look.
   ========================================================================== */

import { useEffect, useState } from 'react';
import type { Key, ReactNode } from 'react';
import { useCountUp } from './ui';

export type KitTone = 'good' | 'warn' | 'bad' | 'flat';

/* --- the question this stage answers ------------------------------------ */

export function Headline({ ask, state, tone, step }: {
  ask: string;
  state: string;
  tone: KitTone;
  /** Which of how many, and what this one is called. */
  step?: { n: number; of: number; name: string };
}) {
  return (
    <header className={`kit-headline is-${tone}`}>
      {/* Where you are and how it stands, on one line above the question. The
          state used to sit underneath as a grey line of small caps, which read
          like an answer to the question above it; it is a pill up here, beside
          the step you are on — a checkout says "2 of 4" before it asks you
          anything, and so does this. */}
      <div className="kit-headline-top">
        {step && (
          <span className="kit-step-mark">
            <b>{String(step.n).padStart(2, '0')}</b>
            <span>/{String(step.of).padStart(2, '0')}</span>
            <em>{step.name}</em>
          </span>
        )}
        <span className="kit-state" role="status"><i aria-hidden="true" />{state}</span>
      </div>
      <h2>{ask}</h2>
    </header>
  );
}

/* --- a number that counts to its value ----------------------------------- */

export function Figure({ value, format, unit, className }: {
  /** No @types/react here: a value-based component declares key itself. */
  key?: Key;
  value: number;
  format: (value: number) => string;
  unit?: string;
  className?: string;
}) {
  const shown = useCountUp(value);
  return (
    <b className={className ? `kit-figure ${className}` : 'kit-figure'}>
      {format(shown)}
      {unit && <s>{unit}</s>}
    </b>
  );
}

/* --- a strip of figures, read in one line -------------------------------- */

export function Hud({ items, children }: {
  items: Array<{ label: string; value: ReactNode }>;
  children?: ReactNode;
}) {
  return (
    <section className="kit-hud">
      <div className="kit-hud-figures">
        {items.map((item) => (
          <span key={item.label}>
            <em>{item.label}</em>
            {item.value}
          </span>
        ))}
      </div>
      {children}
    </section>
  );
}

/* --- a verdict: a word in a tone, and a sentence only if it is bad news --- */

export function Verdict({ label, tone, line }: { label: string; tone: KitTone; line?: string }) {
  return (
    <p className={`kit-verdict is-${tone}`}>
      <b>{label}</b>
      {line && <span>{line}</span>}
    </p>
  );
}

/* --- one-of-N on a track, with a thumb that slides ------------------------
   Under it, what the choice resolves to and what that costs — so a player is
   never asked to pick "Premium" without being told what Premium buys. */

export interface DialOption {
  id: string;
  name: string;
  resolved?: string;
  line?: string;
  effects?: string[];
}

export function Dial({ label, value, options, onPick }: {
  label: string;
  value: string;
  options: DialOption[];
  onPick: (id: string) => void;
}) {
  const index = Math.max(0, options.findIndex((option) => option.id === value));
  const current = options[index];
  return (
    <div className="kit-dial">
      <div className="kit-dial-head">
        <em>{label}</em>
        {current.resolved && <b>{current.resolved}</b>}
      </div>
      <div
        className="kit-dial-track"
        role="radiogroup"
        aria-label={label}
        style={{ ['--kit-n' as string]: options.length, ['--kit-i' as string]: index }}
      >
        <i className="kit-dial-thumb" aria-hidden="true" />
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={option.id === value}
            className={option.id === value ? 'kit-dial-opt is-on' : 'kit-dial-opt'}
            onClick={() => onPick(option.id)}
          >
            {option.name}
          </button>
        ))}
      </div>
      {current.line && <p className="kit-dial-why">{current.line}</p>}
      {current.effects && current.effects.length > 0 && (
        <p className="kit-dial-effects">
          {current.effects.map((effect) => <span key={effect}>{effect}</span>)}
        </p>
      )}
    </div>
  );
}

/* --- a decision you tap: a picture, a name, one line ----------------------- */

export function Tile({ art, name, line, on, onClick, badge, disabled, tone }: {
  /** No @types/react here: a value-based component declares key itself. */
  key?: Key;
  art?: ReactNode;
  name: ReactNode;
  line?: ReactNode;
  on?: boolean;
  onClick?: () => void;
  badge?: ReactNode;
  disabled?: boolean;
  tone?: KitTone;
}) {
  return (
    <button
      type="button"
      className={`kit-tile${on ? ' is-on' : ''}${tone ? ` is-${tone}` : ''}`}
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
    >
      {art && <span className="kit-tile-art" aria-hidden="true">{art}</span>}
      <span className="kit-tile-body">
        <b>{name}</b>
        {line && <em>{line}</em>}
      </span>
      {badge && <span className="kit-tile-badge">{badge}</span>}
    </button>
  );
}

/* --- a few labelled fills, read at a glance ------------------------------- */

export function Bars({ items }: {
  items: Array<{ label: string; value?: string; fill: number; tone?: KitTone }>;
}) {
  return (
    <div className="kit-bars">
      {items.map((item) => (
        <span key={item.label} className={`is-${item.tone ?? 'flat'}`}>
          <em>{item.label}</em>
          {/* The figure sits under its name rather than beside it — three of
              "Expected 3.1M" across a phone truncates every one of them. */}
          {item.value && <s>{item.value}</s>}
          <i aria-hidden="true">
            <b style={{ width: `${Math.round(Math.max(0, Math.min(1, item.fill)) * 100)}%` }} />
          </i>
        </span>
      ))}
    </div>
  );
}

/* --- the team, present and waiting ---------------------------------------
   An empty state used to be a grey dot in a circle. The people you are
   briefing are drawn here instead, so waiting reads as presence. */

export function Presence({ line, children, working = false }: {
  line: ReactNode;
  children?: ReactNode;
  /** The team is on it: the idle becomes work, and a pulse says so. */
  working?: boolean;
}) {
  return (
    <div className={working ? 'kit-presence is-working' : 'kit-presence'} role={working ? 'status' : undefined} aria-live={working ? 'polite' : undefined}>
      <span className="kit-presence-team" aria-hidden="true">
        <Engineer index={0} />
        <Engineer index={1} />
        <Engineer index={2} />
      </span>
      <p>{working && <i className="kit-presence-pulse" aria-hidden="true" />}{line}</p>
      {children}
    </div>
  );
}

function Engineer({ index }: { index: number }) {
  return (
    <svg viewBox="0 0 40 44" className="kit-engineer" style={{ ['--i' as string]: index }}>
      <path className="kit-engineer-body" d="M6 44c0-9 6-14 14-14s14 5 14 14" />
      <circle className="kit-engineer-head" cx="20" cy="15" r="9" />
      <path className="kit-engineer-cap" d="M11 13a9 9 0 0118 0z" />
      <rect className="kit-engineer-cap" x="9" y="12.5" width="22" height="2.4" rx="1.2" />
    </svg>
  );
}

/* --- one whole, split into its parts ---------------------------------------
   Where the money goes, as one bar: each part a solid colour, its width its
   share. If the whole runs past a limit, a line says where and what lies
   beyond it is dimmed — the bill is drawn in full; the treasury is the line.
   The same tone class on a `kit-swatch` names the part anywhere else. */

export type KitPartTone = KitTone | 'brand' | 'gold';

export function Split({ parts, limit, label }: {
  parts: Array<{ id: string; share: number; tone?: KitPartTone }>;
  /** Where cover stops, in the parts' own units. Drawn only if the whole passes it. */
  limit?: { at: number; label: string };
  label: string;
}) {
  const whole = parts.reduce((sum, part) => sum + Math.max(0, part.share), 0);
  const over = Boolean(limit) && whole > (limit?.at ?? Infinity);
  const covered = over && limit ? Math.max(0, Math.min(1, limit.at / whole)) : 1;
  return (
    <div className={over ? 'kit-split is-over' : 'kit-split'} role="img" aria-label={label}>
      <i className="kit-split-bar" aria-hidden="true">
        {parts.filter((part) => part.share > 0).map((part) => (
          <b key={part.id} className={`is-${part.tone ?? 'flat'}`} style={{ width: `${whole > 0 ? (100 * part.share) / whole : 0}%` }} />
        ))}
        {over && <span className="kit-split-beyond" style={{ left: `${covered * 100}%` }} />}
      </i>
      {over && limit && (
        <em
          className={covered > 0.5 ? 'kit-split-limit is-late' : 'kit-split-limit'}
          style={covered > 0.5 ? { paddingRight: `${(1 - covered) * 100}%` } : { paddingLeft: `${covered * 100}%` }}
        >
          {limit.label}
        </em>
      )}
    </div>
  );
}

/* --- a count you nudge -------------------------------------------------------
   Minus, the value, plus — the control the room composer uses for racks, so
   a weight is nudged the way a rack is. The ends are marked at the edges,
   never disabled: tapping past says nothing happened rather than looking
   broken. */

export function Step({ label, value, onDown, onUp, atMin = false, atMax = false }: {
  label: string;
  value: ReactNode;
  onDown: () => void;
  onUp: () => void;
  atMin?: boolean;
  atMax?: boolean;
}) {
  return (
    <span className="kit-step" role="group" aria-label={label}>
      <button type="button" className="kit-step-btn" aria-label={`Less ${label}`} aria-disabled={atMin} onClick={() => { if (!atMin) onDown(); }}>−</button>
      <b>{value}</b>
      <button type="button" className="kit-step-btn" aria-label={`More ${label}`} aria-disabled={atMax} onClick={() => { if (!atMax) onUp(); }}>+</button>
    </span>
  );
}

/* --- the strip above the footer -------------------------------------------
   One line, in the grammar the pricing step already uses: a labelled figure on
   the left, a bar, a labelled figure on the right, and a caret. Everything
   else — the state, the facts, the ways in — is one tap away, above it.

   It has been a card at the top, a four-row block at the bottom, and an object
   with a mark, a pill and a filled button. Each of those was louder than what
   it was summarising. This one tells you where you are, what it costs and
   whether the money covers it, and then gets out of the way. */

export interface StripView {
  /** What is being summarised — the page, in two or three words. */
  subject: string;
  value: number;
  format: (value: number) => string;
  unit?: string;
  verdict?: { label: string; tone: KitTone };
  /** True only when this page holds something that stops the wizard finishing. */
  blocking?: boolean;
  /** The page's own measure, and the one line the opened strip reads out. */
  gauge: { value: number; limit: number; label: string };
}

export function PlanStrip({ view, page, tone, over, money, measure, ways }: {
  view: StripView;
  /** Which page this is summarising. Reaches the DOM, so the strip can always
      be checked against the page it claims to be about. */
  page: string;
  /** The page's own state. It is a 6px dot beside the subject — the smallest
      thing that can carry a colour. */
  tone: KitTone;
  /** Money is a condition of every page, so a shortfall marks the strip
      wherever you are, not only on the page that caused it. */
  over?: boolean;
  /** The right-hand cell, and the bar: what the plan costs against what the
      studio can still spend. */
  money: { label: string; value: string; bad?: boolean; spent: number; of: number };
  /** Optional stage-specific bar. The right cell remains the shared money condition. */
  measure?: { label: string; value: number; of: number };
  /** What the opened strip offers to do. A destructive one is quiet and
      last, because it is not the reason anyone opened the strip. */
  ways: Array<{ label: string; primary?: boolean; danger?: boolean; onClick: () => void }>;
}) {
  const [open, setOpen] = useState(false);
  /* Leaving the page closes it. An opened strip that followed you to the
     next step arrived reading the last one's numbers, and took a tap to
     get rid of before you could see the page you had just asked for. */
  useEffect(() => setOpen(false), [page]);
  const measured = measure ?? { label: 'Budget', value: money.spent, of: money.of };
  const scale = Math.max(1, measured.value, measured.of);
  const within = (Math.min(measured.value, measured.of) / scale) * 100;
  const past = measured.value > measured.of ? ((measured.value - measured.of) / scale) * 100 : 0;

  return (
    <section
      className={over || view.blocking ? 'kit-strip is-over' : 'kit-strip'}
      data-page={page}
      data-tone={tone}
    >
      {/* The detail opens upward, over the page, so the line you tapped stays
          exactly where your thumb left it. */}
      {open && (
        <div className="kit-strip-more">
          <p className="kit-strip-read">
            {view.verdict && (
              <b className={`is-${view.verdict.tone}`}><i aria-hidden="true" />{view.verdict.label}</b>
            )}
            <span>{view.gauge.label}</span>
          </p>
          <div className="kit-strip-ways">
            {ways.map((way) => (
              <button
                key={way.label}
                type="button"
                className={way.primary ? 'is-primary' : way.danger ? 'is-danger' : undefined}
                onClick={way.onClick}
              >
                {way.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        className="kit-strip-face"
        aria-expanded={open}
        onClick={() => setOpen((was) => !was)}
      >
        <span className="kit-strip-cell">
          <em><i aria-hidden="true" />{view.subject}</em>
          {/* Keyed by page so each one's figure starts at its own value
              instead of counting down from the last page's. */}
          <Figure key={page} value={view.value} format={view.format} unit={view.unit} />
        </span>

        <span className="kit-strip-measure-wrap">
          <span className="kit-strip-measure">{measured.label}</span>
          <span className="kit-strip-bar" role="img" aria-label={`${measured.label}: ${measure ? view.gauge.label : `${money.spent} of ${money.of}`}`}>
            <i className="kit-strip-within" style={{ width: `${within}%` }} />
            {past > 0 && <i className="kit-strip-past" style={{ width: `${past}%` }} />}
          </span>
        </span>

        <span className="kit-strip-cell is-end">
          <em>{money.label}</em>
          <b className={money.bad ? 'is-short' : undefined}>{money.value}</b>
        </span>

        <span className="kit-strip-caret" aria-hidden="true">{open ? '\u25BE' : '\u25B8'}</span>
      </button>
    </section>
  );
}
