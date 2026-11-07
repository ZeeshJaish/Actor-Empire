/* ============================================================================
   DEFINE THE LAUNCH — the wizard shell.

   Seven steps that together answer one question: what is this service going to
   be on opening night? The shell owns three things the steps all depend on:

   · the launch sequence — seven stages along the top, each lit when settled,
     the one you are on drawn big (#110);
   · the HUD — one bar at the foot: this step's number, the money left after
     the plan, what still blocks the step, Back as an icon and the next stage
     as the big button (#110). Funding is not a step, it is a condition of
     every step, so the money is on every screen with the way out of a
     shortfall one tap away;
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
import { LaunchBudgetContent } from '../BudgetSheets';
import { LaunchHud } from './LaunchHud';
import { StepIcon, TickIcon } from './StageIcons';
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

  const planned = useMemo(() => plannedTotal(data, draft), [data, draft]);
  const treasury = { ...data.treasury, planned };
  const free = spendable(treasury);
  const gap = shortfall(treasury);
  const chosen = useMemo(() => selectedCountries(data, draft), [data, draft]);
  const blockers = blockersFor(stepId, data);
  const stageRows = useMemo(() => launchStageSummaries(data, draft), [data, draft]);
  const settled = new Set(stageRows.filter((row) => row.done).map((row) => row.id));

  /* One pricing preview belongs to the wizard, not each step. The page, strip
     and blueprint consume the same world result for a given edit. */
  const pricingSettings = draft.pricing ?? data.pricing;
  /* Pricing before an offer is chosen has no number to read and nowhere to go. */
  const noOffer = stepId === 'pricing' && pricingSettings.commercialOffers?.coreModelSelected === false;
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

  /* What the HUD reads on this step: the step's own number and state, over
     the same plan-against-money fuel line on all seven. */
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
    <div className="sf lw dl" style={brand as React.CSSProperties}>
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

      {/* --- the launch sequence ---------------------------------------------
          Seven stages on one rail, all seven on a phone. A stage is lit once it
          is settled — the same `done` the bill and the blueprint read, so the
          rail, the bill and the briefing can never disagree — and keeps its
          own glyph either way; the stage you are on is drawn big and names
          itself underneath. A stage carrying something blocking wears a red
          dot wherever you are. */}
      {!operation && <nav className="lw-seq" aria-label="Launch steps">
        <span className="lw-seq-rail" aria-hidden="true">
          <i style={{ width: `${(index / (STEPS.length - 1)) * 100}%` }} />
        </span>
        {STEPS.map((s, i) => {
          const lit = settled.has(s.id);
          const state = i === index ? 'now' : lit ? 'lit' : i < index ? 'open' : 'ahead';
          const flagged = data.blockers.some((b) => b.step === s.id && b.severity === 'block');
          return (
            <button
              key={s.id}
              type="button"
              className={`lw-seq-stop is-${state}${lit ? ' is-settled' : ''}${flagged ? ' is-flagged' : ''}`}
              onClick={() => selectStep(s.id)}
              aria-label={`${s.verb}${lit ? ' — settled' : ''}`}
              aria-current={i === index ? 'step' : undefined}
            >
              <span className="lw-seq-glyph" aria-hidden="true"><StepIcon step={s.id} /></span>
              {lit && <span className="lw-seq-tick" aria-hidden="true"><TickIcon /></span>}
              {i === index && <span className="lw-seq-name">{s.label}</span>}
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

      {!operation && <LaunchHud
        view={bar}
        page={stepId}
        planned={planned}
        free={free}
        readout={!noOffer}
        blockers={blockers}
        ways={[
          { label: 'The bill', onClick: () => setOpenSheet('plan') },
          gap > 0
            ? { label: 'Add money', primary: true, onClick: () => setOpenSheet('money') }
            : { label: 'Money', onClick: () => setOpenSheet('money') },
        ]}
        onBack={index > 0 ? () => go(index - 1) : undefined}
        next={noOffer
          ? { label: 'Choose an offer', disabled: true, onClick: () => undefined }
          : index === STEPS.length - 1
            ? { eyebrow: 'Next', label: 'Build the Platform', glyph: <BuildGlyph />, onClick: () => handlers.onOpenBuildPlatform?.() }
            : { eyebrow: 'Next', label: STEPS[index + 1].label, glyph: <StepIcon step={STEPS[index + 1].id} />, onClick: () => go(index + 1) }}
      />}

      {operation && <footer className="lw-foot op-editor-footer">
        {saveFeedback && <p role="status">{saveFeedback}</p>}
        <button type="button" className="sf-btn sf-btn--ghost" onClick={handlers.onExit}>Close</button>
        {operation.onSave && <button type="button" className="sf-btn sf-btn--primary" onClick={() => {
          const result = operation.onSave!(draft); setSaveFeedback(result.message);
        }}>Save changes</button>}
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

/* The last stage's way on: Build the Platform, drawn as the launch it leads to. */
function BuildGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3c3 2.2 4.5 5.6 4.5 9.5V16h-9v-3.5C7.5 8.6 9 5.2 12 3z" />
      <path d="M7.5 13.5L5 16v3l2.5-1.5M16.5 13.5L19 16v3l-2.5-1.5M10.5 19.5h3" />
      <circle cx="12" cy="10" r="1.4" />
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
