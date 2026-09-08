/* ============================================================================
   DEFINE THE LAUNCH — the wizard shell.

   Seven steps that together answer one question: what is this service going to
   be on opening night? The shell owns three things the steps all depend on:

   · the spine — where the player is, and which steps carry a problem;
   · the money rail — the studio's money against the plan, on every screen,
     with the way out of a shortfall attached to it. Funding used to be step
     one; it is not a step, it is a condition of every step, and a page the
     player walks past once is the wrong place for it;
   · the draft — selections live here until a paid step is confirmed, so that
     planning is genuinely free.
   ========================================================================== */

import React, { useMemo, useState } from 'react';
import type { LaunchData, LaunchDraft, LaunchHandlers, LaunchStepId } from '../../finance/launch';
import { STEPS, blockersFor, launchStageSummaries, plannedTotal, resolveLaunchDraftAfterDetour, selectedCountries, shortfall, spendable } from '../../finance/launch';
import { brandVars } from '../../finance/brand';
import { money } from '../../finance/format';
import { Row, Sheet, useCountUp } from '../ui';
import { StepMarkets } from './StepMarkets';
import { StepClearance } from './StepClearance';
import { StepIdent } from './StepIdent';
import { StepStorefront } from './StepStorefront';
import { StepCatalogue } from './StepCatalogue';
import { StepPricing } from './StepPricing';
import { StepBlueprint } from './StepBlueprint';
import '../../styles/tokens.css';
import '../../styles/studio-finance.css';
import '../../styles/launch.css';

export interface LaunchWizardProps extends LaunchHandlers {
  data: LaunchData;
  initialStep?: LaunchStepId;
  initialDraft?: LaunchDraft | null;
  onDraftChange?: (draft: LaunchDraft) => void;
}

export function LaunchWizard({ data, initialStep = 'markets', initialDraft, onDraftChange, ...handlers }: LaunchWizardProps) {
  const [stepId, setStepId] = useState<LaunchStepId>(initialStep);
  const [openSheet, setOpenSheet] = useState<'money' | 'plan' | null>(null);
  const [draft, setDraft] = useState<LaunchDraft>(() => resolveLaunchDraftAfterDetour({
      selectedCountryIds: data.selectedCountryIds,
      soundId: data.ident.soundId,
      packageId: data.ident.packageId,
      customAudio: data.ident.customAudio,
      storefrontId: data.offer.storefrontId,
      pricing: data.pricing,
    }, initialDraft));

  const brand = useMemo(() => brandVars(data.company.brandHex), [data.company.brandHex]);
  const index = Math.max(0, STEPS.findIndex((s) => s.id === stepId));
  const step = STEPS[index];

  const planned = useMemo(() => plannedTotal(data, draft), [data, draft]);
  const treasury = { ...data.treasury, planned };
  const free = spendable(treasury);
  const gap = shortfall(treasury);
  const chosen = useMemo(() => selectedCountries(data, draft), [data, draft]);
  const blockers = blockersFor(stepId, data);
  const stageRows = useMemo(() => launchStageSummaries(data, draft), [data, draft]);
  const knownSubtotal = stageRows.reduce((sum, row) => sum + (row.cost || 0), 0);
  const paidSubtotal = stageRows.reduce((sum, row) => sum + row.paidAmount, 0);
  const dueSubtotal = Math.max(0, knownSubtotal - paidSubtotal);
  const completedStages = stageRows.filter(row => row.done).length;

  /* The plan is the number that moves while the player works, so it counts
     rather than jumping — the rail is the wizard's heartbeat. */
  const plannedShown = useCountUp(planned, 420);

  const scale = Math.max(1, free, planned);
  const fill = (Math.min(planned, free) / scale) * 100;
  const over = (Math.max(0, planned - free) / scale) * 100;
  const budgetMark = (free / scale) * 100;

  const patch = (next: Partial<LaunchDraft>) => setDraft((prev) => {
    const updated = { ...prev, ...next };
    onDraftChange?.(resolveLaunchDraftAfterDetour(updated, null));
    return updated;
  });
  const selectStep = (next: LaunchStepId) => {
    setOpenSheet(null);
    setStepId(next);
    handlers.onStepChange?.(next);
  };
  const go = (to: number) => selectStep(STEPS[Math.max(0, Math.min(STEPS.length - 1, to))].id);

  const shared = { data, draft, patch, chosen, treasury, free, gap, handlers };

  return (
    <div className="sf lw" style={brand as React.CSSProperties}>
      <header className="sf-head">
        <button type="button" className="sf-icon-btn" onClick={() => handlers.onExit?.()} aria-label="Back">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 2L4 8l6 6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="sf-head-titles">
          <h1>Define the Launch</h1>
          <p>{data.company.name} · Week {data.company.week}</p>
        </div>
        <span className="lw-count">{index + 1}<i>/{STEPS.length}</i></span>
      </header>

      {/* --- the stage rail --------------------------------------------------
          Seven stops on one track. A finished stop is a tick, an unvisited one
          its own glyph, and the stop you are on opens into a pill that names
          itself — which is how seven steps fit on a phone without a second
          line of text underneath doing the naming. */}
      <nav className="lw-track" aria-label="Launch steps">
        <span className="lw-track-line" aria-hidden="true">
          <i style={{ width: `${(index / (STEPS.length - 1)) * 100}%` }} />
        </span>
        {STEPS.map((s, i) => {
          const state = i < index ? 'done' : i === index ? 'now' : 'ahead';
          const flagged = data.blockers.some((b) => b.step === s.id && b.severity === 'block');
          return (
            <button
              key={s.id}
              type="button"
              className={`lw-stop is-${state}${flagged ? ' is-flagged' : ''}`}
              onClick={() => selectStep(s.id)}
              aria-label={s.verb}
              aria-current={i === index ? 'step' : undefined}
            >
              <span className="lw-stop-glyph" aria-hidden="true">
                {state === 'done' ? <TickIcon /> : <StepIcon step={s.id} />}
              </span>
              <span className="lw-stop-name">{s.label}</span>
            </button>
          );
        })}
      </nav>

      {/* --- the money rail --------------------------------------------------
          Studio money on the left, what the plan would cost on the right, and
          a gauge between them with a mark where the money runs out. Over the
          mark, the way out is attached to the problem. */}
      <section className={gap > 0 ? 'lw-rail is-over' : 'lw-rail'}>
        <div className="lw-rail-top">
          <button type="button" className="lw-rail-cell" onClick={() => setOpenSheet('money')} aria-haspopup="dialog">
            <em>Studio money</em>
            <b>{money(free)}</b>
          </button>
          <button
            type="button"
            className="lw-rail-cell is-end lw-bill-toggle"
            onClick={() => setOpenSheet('plan')}
            aria-haspopup="dialog"
          >
            <span>
              <em>Launch plan</em>
              <svg className="lw-bill-chevron" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3 10l5-5 5 5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <b className={gap > 0 ? 'sf-tone-bad' : undefined}>{money(plannedShown)}</b>
          </button>
        </div>

        <div className="lw-gauge" role="img" aria-label={`Plan ${money(planned)} against ${money(free)} available`}>
          <i className="lw-gauge-fill" style={{ width: `${fill}%` }} />
          {over > 0 && <i className="lw-gauge-over" style={{ width: `${over}%` }} />}
          <span className="lw-gauge-mark" style={{ left: `${budgetMark}%` }} aria-hidden="true" />
        </div>

        <div className="lw-rail-foot">
          {gap > 0 ? (
            <>
              <span className="sf-tone-bad">{money(gap)} over what the studio holds</span>
              <button type="button" className="lw-inject" onClick={() => setOpenSheet('money')}>Add money</button>
            </>
          ) : (
            <span>{money(free - planned)} still unspent{treasury.committed > 0 ? ` · ${money(treasury.committed)} already committed` : ''}</span>
          )}
        </div>

      </section>

      {/* Each step arrives rather than appearing. */}
      <div className="sf-scroll" key={stepId}>
        <div className="lw-body lw-enter">
          {stepId === 'markets' && <StepMarkets {...shared} />}
          {stepId === 'clearance' && <StepClearance {...shared} />}
          {stepId === 'ident' && <StepIdent {...shared} />}
          {stepId === 'storefront' && <StepStorefront {...shared} />}
          {stepId === 'catalogue' && <StepCatalogue {...shared} />}
          {stepId === 'pricing' && <StepPricing {...shared} />}
          {stepId === 'blueprint' && <StepBlueprint {...shared} onJump={selectStep} />}
          <div className="sf-tail" />
        </div>
      </div>

      {blockers.length > 0 && (
        <ul className="lw-blockers">
          {blockers.map((b) => (
            <li key={b.id} className={b.severity === 'block' ? 'is-block' : 'is-warn'}>{b.text}</li>
          ))}
        </ul>
      )}

      <footer className="lw-foot">
        <button type="button" className="sf-btn sf-btn--ghost" disabled={index === 0} onClick={() => go(index - 1)}>
          Back
        </button>
        <button
          type="button"
          className="sf-btn sf-btn--primary"
          onClick={() => (index === STEPS.length - 1 ? handlers.onOpenBuildPlatform?.() : go(index + 1))}
        >
          {index === STEPS.length - 1 ? 'Open Build the Platform' : `Next · ${STEPS[index + 1].label}`}
        </button>
      </footer>

      {/* --- where money comes from, attached to the shortfall --------------- */}
      <Sheet
        open={openSheet === 'money'}
        onClose={() => setOpenSheet(null)}
        eyebrow="Company money"
        title={gap > 0 ? `${money(gap)} short` : 'Studio money'}
        footer={
          <button type="button" className="sf-btn sf-btn--primary" onClick={() => { setOpenSheet(null); handlers.onOpenStudioFinance?.(); }}>
            Open Studio Finance
          </button>
        }
      >
        <div className="lw-injectbars">
          <div>
            <span className="sf-eyebrow">Studio holds</span>
            <b>{money(free)}</b>
            <i style={{ width: `${(free / scale) * 100}%` }} className="is-have" />
          </div>
          <div>
            <span className="sf-eyebrow">Launch plan</span>
            <b className={gap > 0 ? 'sf-tone-bad' : undefined}>{money(planned)}</b>
            <i style={{ width: `${(planned / scale) * 100}%` }} className={gap > 0 ? 'is-over' : 'is-plan'} />
          </div>
        </div>

        <Row label="Founder capital contributed" value={money(treasury.founderContributed)} />
        <Row label="Already committed" value={money(-treasury.committed)} tone={treasury.committed > 0 ? 'bad' : 'flat'} />
        {gap > 0 && <Row label="Still needed" value={money(gap)} tone="bad" />}

        <p className="sf-eyebrow sf-block-head">Where more can come from</p>
        <ul className="lw-routes">
          {data.capitalRoutes.map((route) => (
            <li key={route.id} className={route.state === 'open' ? 'is-open' : 'is-locked'}>
              <span className="lw-route-dot" aria-hidden="true" />
              <span className="lw-route-body">
                <b>{route.name}</b>
                <em>{route.note}</em>
              </span>
              {route.state === 'locked' && <span className="lw-route-lock">Locked</span>}
            </li>
          ))}
        </ul>

        <p className="lw-rule">
          You can plan the whole launch with nothing in the bank. Nothing is
          charged until you confirm a paid step, and each one tells you first.
        </p>
      </Sheet>

      <Sheet
        open={openSheet === 'plan'}
        onClose={() => setOpenSheet(null)}
        eyebrow="Launch budget"
        title={`${money(planned)} launch plan`}
        footer={gap > 0 ? (
          <button type="button" className="sf-btn sf-btn--primary" onClick={() => setOpenSheet('money')}>
            Review Studio Money
          </button>
        ) : undefined}
      >
        <section className="lw-plan-overview" aria-label="Launch plan summary">
          <div><span>Stages cleared</span><b>{completedStages}/{stageRows.length}</b></div>
          <div><span>Known subtotal</span><b>{money(knownSubtotal)}</b></div>
          <div><span>Still due</span><b className={dueSubtotal > free ? 'sf-tone-bad' : undefined}>{money(dueSubtotal)}</b></div>
        </section>

        <p className="sf-eyebrow sf-block-head">Launch checklist</p>
        <div className="lw-stage-bill-list">
          {stageRows.map(row => {
            const costLabel = row.cost === null ? 'Not priced' : row.cost === 0 ? 'Included' : money(row.cost);
            const paymentLabel = row.paymentState === 'paid'
              ? 'Paid'
              : row.paymentState === 'partial'
                ? `${money(row.paidAmount)} paid`
                : row.paymentState === 'planned'
                  ? 'Due when confirmed'
                  : row.paymentState === 'pending'
                    ? 'Pending'
                    : 'No charge';
            return (
              <button
                key={row.id}
                type="button"
                className={`lw-stage-bill-row ${row.done ? 'is-done' : 'is-open'}`}
                onClick={() => selectStep(row.id)}
              >
                <span className="lw-stage-bill-state" aria-hidden="true">{row.done ? '✓' : '!'}</span>
                <span className="lw-stage-bill-copy"><b>{row.label}</b><em>{row.done ? 'Done' : 'Not done'}</em></span>
                <span className="lw-stage-bill-money"><b>{costLabel}</b><em>{paymentLabel}</em></span>
              </button>
            );
          })}
        </div>

        <section className="lw-plan-totals" aria-label="Launch plan totals">
          <div><span>Known subtotal</span><b>{money(knownSubtotal)}</b></div>
          <div><span>Paid in this plan</span><b className="sf-tone-good">{money(paidSubtotal)}</b></div>
          <div><span>Still due</span><b className={dueSubtotal > free ? 'sf-tone-bad' : undefined}>{money(dueSubtotal)}</b></div>
        </section>
      </Sheet>
    </div>
  );
}

/* --- one glyph per stage ---------------------------------------------------- */

function StepIcon({ step }: { step: LaunchStepId }) {
  const paths: Record<LaunchStepId, React.ReactElement> = {
    markets: <><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4c4 4.5 4 11 0 16-4-5-4-11.5 0-16z" /></>,
    clearance: <><path d="M6 3.5h8l4 4V20a.5.5 0 01-.5.5h-11A.5.5 0 016 20V4a.5.5 0 010-.5z" /><path d="M13.5 3.5V8H18M9 13.5l2 2 4-4" /></>,
    ident: <><path d="M5 12a7 7 0 0114 0" /><path d="M9 12v5M15 12v5M12 9v11" /></>,
    storefront: <><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M3.5 10h17M9 10v9.5" /></>,
    pricing: <><path d="M4 11.5V5a1 1 0 011-1h6.5L20 12.5 12.5 20 4 11.5z" /><circle cx="8" cy="8" r="1.2" /></>,
    catalogue: <><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="M8 5.5v13M16 5.5v13M3.5 12h17" /></>,
    blueprint: <><rect x="4.5" y="3.5" width="15" height="17" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {paths[step]}
    </svg>
  );
}

function TickIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

/** What every step receives. Kept in one place so a new step is one file. */
export interface StepProps {
  data: LaunchData;
  draft: LaunchDraft;
  patch: (next: Partial<LaunchDraft>) => void;
  chosen: ReturnType<typeof selectedCountries>;
  treasury: LaunchData['treasury'];
  free: number;
  gap: number;
  handlers: LaunchHandlers;
}
