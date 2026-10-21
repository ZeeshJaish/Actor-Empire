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

import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import type { LaunchData, LaunchDraft, LaunchHandlers, LaunchStepId, PricingForecast } from '../../finance/launch';
import type { WorldStreamingLaunchPricingForecast } from '../../../../services/worldEconomy/worldStreamingPricingForecast';
import { STEPS, blockersFor, forecastPricing, launchStageSummaries, launchStepBar, plannedTotal, previewMonthlyAtCurrentAudience, resolveLaunchDraftAfterDetour, selectedCountries, shortfall, spendable, type PricingSettings } from '../../finance/launch';
import type { LinkedBudgetSummary } from '../../finance/budgetLinks';
import { brandVars } from '../../finance/brand';
import { money } from '../../finance/format';
import { Row, Sheet } from '../ui';
import { PlanStrip } from '../kit';
import { LaunchBudgetContent } from '../BudgetSheets';
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
import '../../styles/kit.css';

export interface LaunchWizardProps extends LaunchHandlers {
  data: LaunchData;
  operation?: { title: string; section: 'Audience' | 'Platform'; note: string;
    onSave?: (draft: LaunchDraft) => { ok: boolean; message: string } };
  initialCountryId?: string;
  initialStep?: LaunchStepId;
  initialDraft?: LaunchDraft | null;
  initialSheet?: 'money' | 'plan' | null;
  buildBudgetSummary?: LinkedBudgetSummary;
  onDraftChange?: (draft: LaunchDraft) => void;
  /** World changes invalidate a preview; ordinary draft autosaves do not. */
  forecastWorldState?: unknown;
  forecastContextKey?: string;
}

export function LaunchWizard({ data, operation, initialCountryId, initialStep = 'markets', initialDraft, initialSheet, buildBudgetSummary, onDraftChange,
  forecastWorldState, forecastContextKey, ...handlers }: LaunchWizardProps) {
  const [saveFeedback, setSaveFeedback] = useState('');
  const [stepId, setStepId] = useState<LaunchStepId>(initialStep);
  const [openSheet, setOpenSheet] = useState<'money' | 'plan' | null>(initialSheet ?? null);
  const [pricingGesture, setPricingGesture] = useState<{ settings: PricingSettings; active: boolean } | null>(null);
  const [draft, setDraft] = useState<LaunchDraft>(() => {
    const restored = resolveLaunchDraftAfterDetour({
      selectedCountryIds: data.selectedCountryIds,
      soundId: data.ident.soundId,
      packageId: data.ident.packageId,
      customAudio: data.ident.customAudio,
      storefrontId: data.offer.storefrontId,
      pricing: data.pricing,
    }, initialDraft);
    return {
      ...restored,
      soundId: restored.soundId ?? data.ident.soundId ?? 'silent',
      packageId: restored.packageId ?? data.ident.packageId ?? 'sting',
    };
  });
  const initialAutosaveSent = useRef(false);
  const trackRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (initialAutosaveSent.current) return;
    initialAutosaveSent.current = true;
    /* Opening or returning to the wizard is itself enough to persist the
       visible working copy. The player never needs to make a meaningless
       edit just to turn an older/session-only draft into a device save. */
    if (!operation) onDraftChange?.(resolveLaunchDraftAfterDetour(draft, null));
  }, []);

  const brand = useMemo(() => brandVars(data.company.brandHex), [data.company.brandHex]);
  const index = Math.max(0, STEPS.findIndex((s) => s.id === stepId));
  useEffect(() => {
    const track = trackRef.current;
    const active = track?.querySelector<HTMLElement>('.lw-stop.is-now');
    if (!track || !active) return;
    const alignActive = () => {
      // Keep the rail anchored like Build. Scroll only when the selected stop
      // is outside the visible rail, rather than clipping earlier stops merely
      // to center a middle step.
      const left = active.offsetLeft;
      const right = left + active.offsetWidth;
      if (left < track.scrollLeft) track.scrollLeft = Math.max(0, left - 12);
      else if (right > track.scrollLeft + track.clientWidth) track.scrollLeft = right - track.clientWidth + 12;
    };
    alignActive();
    window.addEventListener('resize', alignActive);
    const observer = new ResizeObserver(alignActive);
    observer.observe(track);
    observer.observe(active);
    return () => {
      window.removeEventListener('resize', alignActive);
      observer.disconnect();
    };
  }, [index]);
  const step = STEPS[index];

  const planned = useMemo(() => plannedTotal(data, draft), [data, draft]);
  const treasury = { ...data.treasury, planned };
  const free = spendable(treasury);
  const gap = shortfall(treasury);
  const chosen = useMemo(() => selectedCountries(data, draft), [data, draft]);
  const blockers = blockersFor(stepId, data);
  const stageRows = useMemo(() => launchStageSummaries(data, draft), [data, draft]);

  /* One pricing preview belongs to the wizard, not each step. The page, strip
     and blueprint consume the same world result for a given edit. */
  const pricingSettings = draft.pricing ?? data.pricing;
  const pricingCountryKey = chosen.map(country => country.id).join('|');
  const pricingCountryIds = useMemo(() => pricingCountryKey ? pricingCountryKey.split('|') : [], [pricingCountryKey]);
  const forecastHandlerRef = useRef(handlers.onForecastPricing);
  forecastHandlerRef.current = handlers.onForecastPricing;
  const forecastInput = useMemo(() => ({ settings: pricingSettings, countryIds: pricingCountryIds }),
    [pricingSettings, pricingCountryIds, forecastWorldState, forecastContextKey]);
  const deferredForecastInput = useDeferredValue(forecastInput);
  const forecastUpdating = deferredForecastInput !== forecastInput;
  const pricingWorldForecast = useMemo(() =>
    deferredForecastInput.settings.commercialOffers?.coreModelSelected === false
      ? null : forecastHandlerRef.current?.(deferredForecastInput.settings, deferredForecastInput.countryIds) ?? null,
    [deferredForecastInput],
  );
  const pricingForecast = useMemo(() =>
    deferredForecastInput.settings.commercialOffers?.coreModelSelected === false ? null : forecastPricing(
      deferredForecastInput.settings,
      chosen.reduce((sum, country) => sum + country.addressableHouseholds, 0),
      data.market,
      chosen.flatMap(country => country.pricingCohorts || []),
      pricingWorldForecast,
    ), [deferredForecastInput, chosen, data.market, pricingWorldForecast],
  );
  useEffect(() => {
    if (pricingGesture && !pricingGesture.active && !forecastUpdating
      && deferredForecastInput.settings === pricingSettings) setPricingGesture(null);
  }, [pricingGesture, forecastUpdating, deferredForecastInput.settings, pricingSettings]);
  const gestureMonthly = pricingGesture && pricingForecast
    ? previewMonthlyAtCurrentAudience(pricingForecast, pricingGesture.settings) : null;
  const pricingPreview = useMemo(() => ({ forecast: forecastUpdating ? null : pricingForecast,
    worldForecast: forecastUpdating ? null : pricingWorldForecast, updating: forecastUpdating }),
    [pricingForecast, pricingWorldForecast, forecastUpdating]);
  const earnings = pricingForecast ? { households: pricingForecast.households,
    monthly: gestureMonthly ?? pricingForecast.monthlyRevenue, yearly: pricingForecast.yearlyRevenue,
    position: pricingForecast.position } : undefined;

  /* What the strip above the footer says on this step: the step's own number
     and state, over the same plan-against-money bar on all seven. */
  const bar = useMemo(() => {
    const next = launchStepBar(data, draft, stepId, earnings);
    return stepId === 'pricing' && (pricingGesture || forecastUpdating)
      ? { ...next, subject: pricingGesture?.active ? 'Pricing · preview' : 'Pricing · settling',
        gauge: { ...next.gauge, label: pricingGesture
          ? 'At the last settled audience; full market forecast follows when you release.'
          : 'Calculating the full market forecast.' } } : next;
  }, [data, draft, stepId, earnings, forecastUpdating, pricingGesture]);

  const scale = Math.max(1, free, planned);

  const patch = (next: Partial<LaunchDraft>) => {
    const updated = { ...draft, ...next };
    setDraft(updated);
    /* Notify after deriving from the current render, rather than from inside a
       React state-updater callback. Autosave can update the parent safely
       without causing a render-during-render warning. */
    setSaveFeedback('');
    if (!operation) onDraftChange?.(resolveLaunchDraftAfterDetour(updated, null));
  };
  const selectStep = (next: LaunchStepId) => {
    setOpenSheet(null);
    setPricingGesture(null);
    setStepId(next);
    handlers.onStepChange?.(next);
  };
  const go = (to: number) => selectStep(STEPS[Math.max(0, Math.min(STEPS.length - 1, to))].id);

  const previewHandlers = operation ? { ...handlers, onSelectIdent: undefined,
    onClearIdent: undefined, onRemoveCustomIdentAudio: undefined, onClearViewerOffer: undefined,
    onSaveViewerOffer: undefined, onSavePricing: undefined } : handlers;
  const shared = { operations: Boolean(operation), initialCountryId, data, draft, patch, chosen, treasury, free, gap, handlers: previewHandlers, pricingPreview,
    onPricingGesture: (settings: PricingSettings | null) => setPricingGesture(current => settings
      ? { settings, active: true } : current ? { ...current, active: false } : null) };

  return (
    <div className="sf lw" style={brand as React.CSSProperties}>
      <header className="sf-head">
        <button type="button" className="sf-icon-btn" onClick={() => handlers.onExit?.()} aria-label="Back">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 2L4 8l6 6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <div className="sf-head-titles">
          <h1>{operation?.title || 'Define the Launch'}</h1>
          <p>{operation ? `${operation.section} · ${data.company.name}` : `${data.company.name} · Week ${data.company.week}`}</p>
        </div>
        {!operation && <span className="lw-count">{index + 1}<i>/{STEPS.length}</i></span>}
      </header>

      {/* --- the stage rail --------------------------------------------------
          Seven stops on one track. A finished stop is a tick, an unvisited one
          its own glyph, and the stop you are on opens into a pill that names
          itself — which is how seven steps fit on a phone without a second
          line of text underneath doing the naming. */}
      {!operation && <nav ref={trackRef} className="lw-track" aria-label="Launch steps">
        <span className="lw-track-line" aria-hidden="true">
          <i style={{ width: `${(index / (STEPS.length - 1)) * 100}%` }} />
        </span>
        {STEPS.map((s, i) => {
          /* A tick means finished, not merely walked past. Moving on from a
             stage that still owes something — a storefront previewed but never
             saved because it is research-locked, say — leaves it open behind
             you rather than ticking it. `blockersFor` is the same source the
             stage itself uses to say what is outstanding, so the rail and the
             stage can never disagree. */
          const outstanding = i < index && blockersFor(s.id, data).length > 0;
          const state = i < index ? (outstanding ? 'todo' : 'done') : i === index ? 'now' : 'ahead';
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
      </nav>}

      {operation && <div className="op-editor-intro"><p>{operation.note}</p>
        {(initialStep === 'markets' || initialStep === 'clearance') && <div className="op-editor-tabs" role="tablist" aria-label="Market management">
          {(['markets','clearance'] as const).map(id => <button type="button" role="tab" aria-selected={stepId === id} key={id} onClick={() => selectStep(id)}>{id === 'markets' ? 'Choose markets' : 'Clearance & requests'}</button>)}
        </div>}
      </div>}
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

      {!operation && blockers.length > 0 && (
        <ul className="lw-blockers">
          {blockers.map((b) => (
            <li key={b.id} className={b.severity === 'block' ? 'is-block' : 'is-warn'}>{b.text}</li>
          ))}
        </ul>
      )}

      {/* --- the plan, wherever you are ------------------------------------
          This was a rail at the top of every step: studio money, what the plan
          would cost, a gauge between them. It said the same thing on all seven
          screens and nothing about the step you were on, and it sat furthest
          from the thumb doing the work. Same money, same gauge, same two ways
          in — and now it also says what this step amounts to. */}
      {!operation && !(stepId === 'pricing' && (draft.pricing ?? data.pricing).commercialOffers?.coreModelSelected === false) && <PlanStrip
        view={bar}
        page={stepId}
        tone={bar.verdict ? bar.verdict.tone : 'flat'}
        over={gap > 0}
        money={gap > 0
          ? { label: 'Short', value: money(gap), bad: true, spent: planned, of: free }
          : { label: 'Money', value: money(free), spent: planned, of: free }}
        ways={[
          { label: 'The bill', onClick: () => setOpenSheet('plan') },
          gap > 0
            ? { label: 'Add money', primary: true, onClick: () => setOpenSheet('money') }
            : { label: 'Money', onClick: () => setOpenSheet('money') },
        ]}
      />}

      {operation ? <footer className="lw-foot op-editor-footer">
        {saveFeedback && <p role="status">{saveFeedback}</p>}
        <button type="button" className="sf-btn sf-btn--ghost" onClick={handlers.onExit}>Close</button>
        {operation.onSave && <button type="button" className="sf-btn sf-btn--primary" onClick={() => {
          const result = operation.onSave!(draft); setSaveFeedback(result.message);
        }}>Save changes</button>}
      </footer> : <footer className="lw-foot">
        <button type="button" className="sf-btn sf-btn--ghost" disabled={index === 0} onClick={() => go(index - 1)}>
          Back
        </button>
        <button
          type="button"
          className="sf-btn sf-btn--primary"
          disabled={stepId === 'pricing' && (draft.pricing ?? data.pricing).commercialOffers?.coreModelSelected === false}
          onClick={() => (index === STEPS.length - 1 ? handlers.onOpenBuildPlatform?.() : go(index + 1))}
        >
          {stepId === 'pricing' && (draft.pricing ?? data.pricing).commercialOffers?.coreModelSelected === false
            ? 'Choose an offer' : index === STEPS.length - 1 ? 'Open Build the Platform' : `Next · ${STEPS[index + 1].label}`}
        </button>
      </footer>}

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
        <LaunchBudgetContent
          rows={stageRows}
          available={free}
          linkedSummary={buildBudgetSummary}
          onSelectStep={selectStep}
          onOpenLinked={() => {
            setOpenSheet(null);
            (handlers.onOpenBuildBudget || handlers.onOpenBuildPlatform)?.();
          }}
        />
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
  operations?: boolean;
  initialCountryId?: string;
  data: LaunchData;
  draft: LaunchDraft;
  patch: (next: Partial<LaunchDraft>) => void;
  chosen: ReturnType<typeof selectedCountries>;
  treasury: LaunchData['treasury'];
  free: number;
  gap: number;
  handlers: LaunchHandlers;
  onPricingGesture?: (settings: PricingSettings | null) => void;
  pricingPreview?: {
    forecast: PricingForecast | null;
    worldForecast: WorldStreamingLaunchPricingForecast | null;
    updating: boolean;
  };
}
