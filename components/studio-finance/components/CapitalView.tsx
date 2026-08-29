/* ============================================================================
   CAPITAL — where the company gets money, and what it costs the player.

   Three company funding routes on one track: the founder's own contribution,
   an investor who wants a piece, and finally the public markets. Personal
   borrowing remains entirely inside the actor-side Bank.

   The track stays long on purpose: seeing the locked rungs above you is how the
   screen tells you what is coming. What does NOT stay long is the explanation.
   Each rung shows its state and its action always, and holds its copy behind a
   tap, because a mechanic needs explaining once and reading past it forever.

   Nothing is confirmed without the preview: what the company receives, what the
   founder gives up, what it costs every week from now on.
   ========================================================================== */

import { forwardRef, useMemo, useRef, useState, type ReactNode } from 'react';
import type { StudioFinanceData, StudioFinanceHandlers } from '../finance/types';
import { ipoProgress } from '../finance/derive';
import { money, pct } from '../finance/format';
import { Row, Sheet, Tag } from './ui';

type RouteKey = 'founder' | 'equity' | 'public';

interface Props {
  data: StudioFinanceData;
  handlers: StudioFinanceHandlers;
  initialRoute?: 'founder' | 'equity';
  /** Fired after a confirmed capital action so the shell can play the cash move. */
  onCashMoved: (amount: number, label: string) => void;
}

export function CapitalView({ data, handlers, initialRoute, onCashMoved }: Props) {
  const [injecting, setInjecting] = useState(initialRoute === 'founder');
  const [reviewing, setReviewing] = useState(initialRoute === 'equity');
  const [expanded, setExpanded] = useState<RouteKey | null>(initialRoute ?? null);
  const publicRef = useRef<HTMLLIElement>(null);
  const { capital } = data;

  const founderPct = capital.ownership.find((o) => o.kind === 'founder')?.pct ?? 100;
  const ipo = useMemo(() => ipoProgress(data), [data]);
  const offer = capital.equityOffer ?? null;
  /* A slice at zero is not information — it is an empty row the player reads
     every visit for the whole first act of the game. */
  const heldSlices = capital.ownership.filter((slice) => slice.pct > 0);

  const toggle = (key: RouteKey) => setExpanded((prev) => (prev === key ? null : key));

  const openPublicMarkets = () => {
    setExpanded('public');
    window.requestAnimationFrame(() => {
      publicRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  return (
    <div className="sf-view">
      {/* --- ownership ---------------------------------------------------- */}
      <section className="sf-owner">
        <header className="sf-sec-head">
          <h2>Company ownership</h2>
          <span className="sf-owner-val">{money(capital.valuation)} valuation</span>
        </header>
        <div className="sf-owner-bar" role="img" aria-label="Ownership split">
          {capital.ownership.map((slice) => (
            <i key={slice.label} className={`sf-own-${slice.kind}`} style={{ width: `${slice.pct}%` }} />
          ))}
        </div>
        {heldSlices.length === 1 && heldSlices[0].kind === 'founder' ? (
          <p className="sf-owner-solo">Wholly founder-owned · no investors, no public float</p>
        ) : (
          <ul className="sf-owner-list">
            {heldSlices.map((slice) => (
              <li key={slice.label}>
                <span className={`sf-dot sf-own-${slice.kind}`} aria-hidden="true" />
                <span>{slice.label}</span>
                <strong>{pct(slice.pct, slice.pct % 1 === 0 ? 0 : 1)}</strong>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* --- the thing late-game players check most, kept at the top ------- */}
      <button type="button" className="sf-ipochip" onClick={openPublicMarkets}>
        <span className="sf-eyebrow">IPO readiness</span>
        <span className="sf-ipochip-count">{ipo.met} / {ipo.total}</span>
        <span className="sf-ipochip-bar" aria-hidden="true">
          {Array.from({ length: ipo.total }, (_, i) => <i key={i} className={i < ipo.met ? 'is-met' : undefined} />)}
        </span>
        <span className="sf-ipochip-go" aria-hidden="true">›</span>
      </button>

      <p className="sf-eyebrow sf-track-head">Funding routes</p>

      <ol className="sf-track">
        {/* --- founder ---------------------------------------------------- */}
        <Route
          step="01"
          state="open"
          name="Founder capital"
          line={`${money(capital.founderPersonalCash)} of your own money available`}
          expanded={expanded === 'founder'}
          onToggle={() => toggle('founder')}
          action={<button type="button" className="sf-btn sf-btn--primary" onClick={() => setInjecting(true)}>Inject capital</button>}
        >
          <p className="sf-route-copy">Moves money from your personal balance into the company. No dilution, no interest — but it is gone from your own account.</p>
        </Route>

        {/* --- private equity --------------------------------------------- */}
        <Route
          step="02"
          state={capital.cfoHired ? 'open' : 'locked'}
          name="Private equity"
          line={capital.cfoHired
            ? offer ? `${offer.investor} · ${money(offer.amount)} offered` : 'No investor at the table yet'
            : 'Requires a qualified CFO'}
          expanded={expanded === 'equity'}
          onToggle={() => toggle('equity')}
          action={capital.cfoHired && offer
            ? <button type="button" className="sf-btn sf-btn--primary" onClick={() => setReviewing(true)}>Review term sheet</button>
            : !capital.cfoHired
              ? <button type="button" className="sf-btn sf-btn--ghost" onClick={() => handlers.onOpenLeadership?.()}>Open Leadership</button>
            : undefined}
        >
          {capital.cfoHired
            ? <p className="sf-route-copy">An outside investor buys new shares. The company gets cash it never repays; you get a smaller share of everything that follows.</p>
            : <p className="sf-route-copy">Hire a CFO to open equity fundraising. Investors will not sit down with a company that cannot produce audited numbers.</p>}
        </Route>

        {/* --- public markets --------------------------------------------- */}
        <Route
          ref={publicRef}
          step="03"
          state={capital.ipo.unlocked ? 'open' : 'milestone'}
          name="Public markets"
          line={`IPO readiness · ${ipo.met} of ${ipo.total} met`}
          expanded={expanded === 'public'}
          onToggle={() => toggle('public')}
          action={capital.ipo.unlocked
            ? <button type="button" className="sf-btn sf-btn--gold" onClick={() => handlers.onOpenPublicMarkets?.()}>Open IPO desk</button>
            : undefined}
        >
          <ul className="sf-req">
            {capital.ipo.requirements.map((req) => (
              <li key={req.label} className={req.met ? 'is-met' : undefined}>
                <span className="sf-req-mark" aria-hidden="true">{req.met ? '✓' : '○'}</span>
                <span className="sf-req-label">{req.label}</span>
                <span className="sf-req-detail">{req.detail ?? (req.met ? 'Met' : 'Not met')}</span>
              </li>
            ))}
          </ul>
          <p className="sf-route-copy">Finance keeps the cap table and the company's cash. Listing, share price and public trading move to the IPO desk once you qualify.</p>
        </Route>
      </ol>

      <InjectionSheet
        open={injecting}
        data={data}
        onClose={() => setInjecting(false)}
        onConfirm={(amount) => {
          const result = handlers.onFounderInjection?.(amount);
          if (!result || result.ok) {
            onCashMoved(amount, 'Founder capital injected');
            setInjecting(false);
          }
        }}
      />

      {offer && (
        <Sheet
          open={reviewing}
          onClose={() => setReviewing(false)}
          eyebrow="Term sheet"
          title={offer.investor}
          footer={
            <div className="sf-sheet-actions">
              <button
                type="button"
                className="sf-btn sf-btn--ghost"
                onClick={() => { handlers.onRejectOffer?.(offer.id); setReviewing(false); }}
              >
                Decline
              </button>
              <button
                type="button"
                className="sf-btn sf-btn--primary"
                onClick={() => {
                  const result = handlers.onAcceptOffer?.(offer.id);
                  if (!result || result.ok) {
                    onCashMoved(offer.amount, `${offer.investor} funded`);
                    setReviewing(false);
                  }
                }}
              >
                Accept {money(offer.amount)}
              </button>
            </div>
          }
        >
          <Preview
            receives={offer.amount}
            founderFrom={founderPct}
            founderTo={founderPct * (1 - offer.dilutionPct / 100)}
            weekly={offer.weeklyObligation}
            control={offer.controlRights}
          />
          <p className="sf-eyebrow sf-block-head">Terms</p>
          <Row label="Pre-money valuation" value={money(offer.valuation)} />
          <Row label="Stake sold" value={pct(offer.dilutionPct)} />
          <Row label="Implied company value after" value={money(offer.valuation + offer.amount)} muted />
          <p className="sf-eyebrow sf-block-head">Conditions</p>
          <ul className="sf-conditions">
            {offer.conditions.map((c) => <li key={c}>{c}</li>)}
          </ul>
        </Sheet>
      )}
    </div>
  );
}

/* --- one rung of the funding track ------------------------------------------ */

interface RouteProps {
  step: string;
  state: 'open' | 'locked' | 'milestone';
  name: string;
  line: string;
  expanded: boolean;
  onToggle: () => void;
  action?: ReactNode;
  children?: ReactNode;
}

/* forwardRef, not a `ref` prop: the IPO chip scrolls the Public Markets rung
   into view, and a plain prop would be swallowed by React 18. */
const Route = forwardRef<HTMLLIElement, RouteProps>(function Route(
  { step, state, name, line, expanded, onToggle, action, children },
  ref,
) {
  return (
    <li className={`sf-route is-${state}${expanded ? ' is-expanded' : ''}`} ref={ref}>
      <span className="sf-route-step" aria-hidden="true">{step}</span>
      <div className="sf-route-card">
        <button type="button" className="sf-route-head" aria-expanded={expanded} onClick={onToggle}>
          <span className="sf-route-titles">
            {/* The status tag rides under the name, not beside it — beside it,
                a two-word route name wraps on a 375px phone. */}
            <span className="sf-route-name">{name}</span>
            <span className="sf-route-sub">
              <span className="sf-route-line">{line}</span>
              {state === 'locked' && <Tag tone="flat">Locked</Tag>}
              {state === 'milestone' && <Tag tone="gold">Milestone</Tag>}
            </span>
          </span>
          <span className="sf-route-caret" aria-hidden="true">{expanded ? '▾' : '▸'}</span>
        </button>
        {expanded && <div className="sf-route-detail">{children}</div>}
        {action && <div className="sf-route-action">{action}</div>}
      </div>
    </li>
  );
});

/* --- founder injection ------------------------------------------------------- */

function InjectionSheet({ open, data, onClose, onConfirm }: {
  open: boolean;
  data: StudioFinanceData;
  onClose: () => void;
  onConfirm: (amount: number) => void;
}) {
  const max = data.capital.founderPersonalCash;
  const [amount, setAmount] = useState(() => roundStep(max * 0.25));

  const capped = Math.min(amount, max);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      eyebrow="Founder capital"
      title="Move money into the company"
      footer={
        <button
          type="button"
          className="sf-btn sf-btn--primary"
          disabled={capped <= 0}
          onClick={() => onConfirm(capped)}
        >
          Transfer {money(capped)}
        </button>
      }
    >
      <p className="sf-amount">{money(capped)}</p>
      <input
        className="sf-slider"
        type="range"
        min={0}
        max={Math.max(1, max)}
        step={Math.max(1, roundStep(max / 40))}
        value={capped}
        onChange={(e) => setAmount(Number(e.target.value))}
        aria-label="Injection amount"
      />
      <div className="sf-quick">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <button key={f} type="button" className="sf-chip" onClick={() => setAmount(roundStep(max * f))}>
            {f === 1 ? 'Max' : `${f * 100}%`}
          </button>
        ))}
      </div>

      <Preview
        receives={capped}
        founderFrom={data.capital.ownership.find((o) => o.kind === 'founder')?.pct ?? 100}
        founderTo={data.capital.ownership.find((o) => o.kind === 'founder')?.pct ?? 100}
        weekly={0}
        control="Unchanged"
      />

      <p className="sf-eyebrow sf-block-head">After the transfer</p>
      <Row label="Your personal balance" value={money(max - capped)} tone={max - capped < max * 0.2 ? 'warn' : 'flat'} />
      <Row label="Company cash" value={money(data.cash + capped)} tone="good" />
    </Sheet>
  );
}

/* --- the confirmation preview every capital action shares -------------------- */

function Preview({ receives, founderFrom, founderTo, weekly, control }: {
  receives: number;
  founderFrom: number;
  founderTo: number;
  weekly: number;
  control: string;
}) {
  const dilutes = Math.abs(founderFrom - founderTo) > 0.05;
  return (
    <section className="sf-preview">
      <div className="sf-preview-row">
        <span>Company receives</span>
        <strong className="sf-tone-good">{money(receives, { sign: true })}</strong>
      </div>
      <div className="sf-preview-row">
        <span>Founder ownership</span>
        <strong className={dilutes ? 'sf-tone-warn' : undefined}>
          {pct(founderFrom, 0)}{dilutes ? ` → ${pct(founderTo, 0)}` : ''}
        </strong>
      </div>
      <div className="sf-preview-row">
        <span>New weekly obligation</span>
        <strong className={weekly > 0 ? 'sf-tone-warn' : undefined}>{weekly > 0 ? money(weekly) : 'None'}</strong>
      </div>
      <div className="sf-preview-row">
        <span>Investor control rights</span>
        <strong>{control}</strong>
      </div>
    </section>
  );
}

function roundStep(value: number): number {
  if (value <= 0) return 0;
  const magnitude = 10 ** Math.max(4, Math.floor(Math.log10(value)) - 1);
  return Math.round(value / magnitude) * magnitude;
}
