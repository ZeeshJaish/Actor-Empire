/* ============================================================================
   PLATFORM · OFFER — what viewers get, what they pay, and how they may share.

   Everything about the service's configuration that used to be frozen at
   launch (or scattered over the launch wizard and the Audience room) lives
   here, in the Platform room:

     WAYS TO EARN     the money engine (#104): the main way crowned, each with
                      what it earned
     PLANS            the plan builder (PlanBuilder.tsx): plans side by side, a
                      bar of who is on which; while editing, every cell is a tap
     BREAKS, STORE    #108: the Pricing step's controls (OfferControls, #107):
     AND DEALS        ad breaks, store prices and who can buy, Pay yearly and
                      First three months, passes, early access
     CHANGE PRICING   a staged editor: nothing saves until "Apply from next
                      week"; a receipt of every change; an on-demand forecast;
                      a pinned bar with the count and the last change
     ACCOUNT SHARING  the policy card (moved here from the Audience room), its
                      posture a dial, enforcement levels, its figures gauges
     BRAND STUDIO     #116: the front page and the ident moved to the brand
                      studio (the HQ logo); one line here opens it

   Presentation only: the HQ hands in the data and the canonical actions.
   ========================================================================== */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import css from './presentation/screens/NetworkDesk/PlatformOffer.module.css';
import { cx } from './presentation/cx';
import { compact } from './audienceAtlasModel';
import { SharingPolicyCard } from './SharingPolicyCard';
import { PlanBuilder } from './PlanBuilder';
import { MoneyEngine, type MoneyEngineSlot } from './MoneyEngine';
import { OfferControls, type OfferControlId } from './OfferControls';
import { configureStreamingPricingOffer, projectStreamingCommercialOffers } from '../../services/streamingCommercialOffers';
import { describeStreamingPlanChanges, getStreamingPlanBuilderView, type StreamingPlanBuilderView } from '../../services/streamingPlanBuilder';
import { STREAMING_FREE_TIER_ID } from '../../services/streamingPlanOffer';
import { STREAMING_STORE_ID, resolveStreamingStoreEditions } from '../../services/streamingStoreEditions';
import { getStreamingTechDefinition } from '../../services/streamingTechTreeCatalogue';
import { adIntervalForMinutesPerHour, normalizeStreamingPricingConfiguration } from '../../services/streamingPricingEconomy';
import type { StreamingSharingControl, StreamingSharingPolicyFigures } from '../../services/streamingSharingPolicy';
import type {
  OwnedStreamingPricingConfiguration,
  StreamingEnforcementInvestment,
  StreamingSharingPosture,
  StreamingTechId,
  WorldStreamingCustomerAccessPolicy,
} from '../../types';

export interface PlatformOfferData {
  live: boolean;
  pricing: OwnedStreamingPricingConfiguration;
  /** Paid accounts and monthly revenue per plan id, from the customer ledger. */
  planStats: Record<string, { accounts: number; monthlyRevenue: number }>;
  /** Homes watching free with ads at the last settlement (#46); absent on older callers. */
  freeAdViewers?: number;
  /** Rentals and purchases at the last settlement (#47); absent on older callers. */
  storeBuyers?: number;
  /** What each way of earning brought in, as monthly figures (last settled week). */
  earnings: { subscription: number; ads: number; store: number; settled: boolean };
  storefront: {
    currentId: string | null;
    /** locked: the Tech step's name that unlocks it (#109), lockTech its id */
    layouts: Array<{ id: string; name: string; line: string; composition: string; category: string; locked: string | null; lockTech?: StreamingTechId | null }>;
  };
  ident: { label: string; detail: string };
  /** the plan builder's rows, locks and starters (Phase 2 #45) */
  planBuilder?: StreamingPlanBuilderView;
}

export interface PricingForecastSummary {
  subscribers: number;
  monthlySubscriptionRevenue: number;
  weeklyAdRevenue: number;
  weeklyStoreRevenue: number;
  freeAdHouseholds: number;
  storeHouseholds: number;
  rivalMedianEntryPrice: number;
}

export interface PlatformOfferActions {
  /** Where the market settles under a pricing (the target, not next week). */
  forecast?: (pricing: OwnedStreamingPricingConfiguration) => PricingForecastSummary | null;
  applyPricing?: (pricing: OwnedStreamingPricingConfiguration) => { ok: boolean; message: string };
  applyStorefront?: (layoutId: string) => { ok: boolean; message: string };
  /** Before launch the offer is set in Define the Launch. */
  editBeforeLaunch?: () => void;
  /** #116: the front page and the ident live in the brand studio */
  openBrandStudio?: () => void;
}

export interface PlatformSharingProps {
  policy: WorldStreamingCustomerAccessPolicy;
  settled: StreamingSharingPolicyFigures;
  settledPolicy?: Pick<WorldStreamingCustomerAccessPolicy, 'sharingPosture' | 'enforcementInvestment'>;
  /** Sharing control in Tech (#56) */
  control?: StreamingSharingControl;
  available: boolean;
  appliesNextWeek: boolean;
  onApply: (policy: { sharingPosture: StreamingSharingPosture; enforcementInvestment: StreamingEnforcementInvestment }) => void;
}

const money = (value: number) => `$${compact(Math.max(0, Math.round(value)))}`;
const price = (value: number) => (value <= 0 ? 'Free' : `$${value.toFixed(2)}`);
type Offer = 'SUBSCRIPTION' | 'ADS' | 'STORE';
const OFFERS: Offer[] = ['SUBSCRIPTION', 'ADS', 'STORE'];
const STREAM_OF: Record<Offer, 'subs' | 'ads' | 'rentals'> = { SUBSCRIPTION: 'subs', ADS: 'ads', STORE: 'rentals' };
const CORE_OF: Record<Offer, 'SUBSCRIPTION' | 'ADVERTISING' | 'STORE'> = { SUBSCRIPTION: 'SUBSCRIPTION', ADS: 'ADVERTISING', STORE: 'STORE' };
const OFFER_WORDS: Record<Offer, { name: string; line: string }> = {
  SUBSCRIPTION: { name: 'Subscription', line: 'monthly plans' },
  ADS: { name: 'Free with ads', line: 'ads pay the bill' },
  STORE: { name: 'Rent or buy', line: 'title by title' },
};
/* plan colours: the brand accent, then quieter steps of it */
const PLAN_TINTS = [100, 72, 50, 34, 24, 16];

/* #103 (plan §18.3): Free with ads is on when its free tier is open; ads on plans are the plans' own */
const isOn = (pricing: OwnedStreamingPricingConfiguration, offer: Offer) => (offer === 'ADS'
  ? Boolean(projectStreamingCommercialOffers(pricing).freeAdOffer)
  : pricing.streams.includes(STREAM_OF[offer]));
/* The main way of earning. Old saves carry no explicit choice ('LEGACY'), and
   read the way the build summary reads them: the first stream that is on. */
const coreOf = (pricing: OwnedStreamingPricingConfiguration): Offer | null => {
  const core = pricing.commercialOffers?.coreModel;
  if (core === 'SUBSCRIPTION') return 'SUBSCRIPTION';
  if (core === 'ADVERTISING') return 'ADS';
  if (core === 'STORE') return 'STORE';
  return OFFERS.find(offer => isOn(pricing, offer)) ?? null;
};
const adBreakWords = (minutesPerHour: number) => {
  const interval = adIntervalForMinutesPerHour(minutesPerHour);
  return minutesPerHour <= 0 ? 'No ad breaks' : interval ? `A break every ${interval} min` : `${minutesPerHour} ad min an hour`;
};

/* Every difference between the saved offer and the draft, in words — the
   receipt the player reads before applying. Plans read through the plan
   builder: added, removed, renamed, and every changed cell. */
export const changesBetween = (
  saved: OwnedStreamingPricingConfiguration,
  draft: OwnedStreamingPricingConfiguration,
  builder: StreamingPlanBuilderView,
): string[] => {
  const lines: string[] = [];
  const savedCore = coreOf(saved);
  const draftCore = coreOf(draft);
  if (savedCore !== draftCore && draftCore) lines.push(`${OFFER_WORDS[draftCore].name} becomes the main offer`);
  OFFERS.forEach(offer => {
    if (isOn(saved, offer) && !isOn(draft, offer)) lines.push(`${OFFER_WORDS[offer].name} off`);
    /* a new main offer was switched on to become it: one line says both */
    if (!isOn(saved, offer) && isOn(draft, offer) && !(offer === draftCore && savedCore !== draftCore)) lines.push(`${OFFER_WORDS[offer].name} on`);
  });
  if (isOn(draft, 'SUBSCRIPTION') || projectStreamingCommercialOffers(draft).freeAdOffer) lines.push(...describeStreamingPlanChanges(saved, draft, builder));
  if (isOn(draft, 'ADS') && isOn(saved, 'ADS') && saved.ads.minutesPerHour !== draft.ads.minutesPerHour) {
    lines.push(`Ad breaks: ${adBreakWords(saved.ads.minutesPerHour).toLowerCase()} → ${adBreakWords(draft.ads.minutesPerHour).toLowerCase()}`);
  }
  if (isOn(draft, 'STORE') && isOn(saved, 'STORE')) {
    if (saved.rentals.rent !== draft.rentals.rent) lines.push(`Rent ${price(saved.rentals.rent)} → ${price(draft.rentals.rent)}`);
    if (saved.rentals.buy !== draft.rentals.buy) lines.push(`Buy ${price(saved.rentals.buy)} → ${price(draft.rentals.buy)}`);
    if (saved.rentals.windowWeeks !== draft.rentals.windowWeeks) lines.push(`Rental length ${saved.rentals.windowWeeks} → ${draft.rentals.windowWeeks} weeks`);
    // the store's top edition (#47), named by its picture
    const topName = (pricing: OwnedStreamingPricingConfiguration) => {
      const picture = resolveStreamingStoreEditions(pricing, builder.tree).topPicture;
      return picture ? getStreamingTechDefinition(picture)?.name || picture : null;
    };
    const was = saved.storeTopEdition;
    const now = draft.storeTopEdition;
    const name = topName(draft);
    if (name && JSON.stringify(was) !== JSON.stringify(now)) {
      lines.push(now ? `${name} edition: rent ${price(now.rent)}, buy ${price(now.buy)}` : `${name} edition at the HD prices`);
    }
  }
  /* #108: what the Pricing step's controls change, now that the Offer tab has them (plan §18.3, 7) */
  const was = projectStreamingCommercialOffers(saved);
  const now = projectStreamingCommercialOffers(draft);
  const off = (value: number) => (value > 0 ? `${value}% off` : 'off');
  if (isOn(draft, 'SUBSCRIPTION')) {
    if (saved.annualDiscount !== draft.annualDiscount) lines.push(`Pay yearly: ${off(saved.annualDiscount)} → ${off(draft.annualDiscount)}`);
    const introPlan = (pricing: OwnedStreamingPricingConfiguration) => pricing.plans.find(plan => plan.id === pricing.introOfferPlanId)?.name || 'every plan';
    if (saved.introOffer !== draft.introOffer || (draft.introOffer > 0 && introPlan(saved) !== introPlan(draft))) {
      lines.push(`First three months: ${off(saved.introOffer)} → ${off(draft.introOffer)}${draft.introOffer > 0 ? ` on ${introPlan(draft)}` : ''}`);
    }
  }
  const pass = (value: number | null) => (value === null ? 'off' : price(value));
  if (was.adFreePasses.oneHourPrice !== now.adFreePasses.oneHourPrice) lines.push(`1 hour ad-free pass: ${pass(was.adFreePasses.oneHourPrice)} → ${pass(now.adFreePasses.oneHourPrice)}`);
  if (was.adFreePasses.dayPrice !== now.adFreePasses.dayPrice) lines.push(`24 hours ad-free pass: ${pass(was.adFreePasses.dayPrice)} → ${pass(now.adFreePasses.dayPrice)}`);
  const buyers = (offers: typeof now) => (offers.storeOffer?.eligibility.kind === 'MEMBERSHIP_PLANS'
    ? `members of ${offers.storeOffer.eligibility.planIds.length} plan${offers.storeOffer.eligibility.planIds.length === 1 ? '' : 's'}` : 'everyone');
  if (was.storeOffer && now.storeOffer && buyers(was) !== buyers(now)) lines.push(`Who can rent or buy: ${buyers(was)} → ${buyers(now)}`);
  const early = (benefit?: { premiumAccess: boolean; earlyAccessWeeks: number }) => (benefit?.premiumAccess
    ? benefit.earlyAccessWeeks > 0 ? `${benefit.earlyAccessWeeks} week${benefit.earlyAccessWeeks === 1 ? '' : 's'} early` : 'on release day' : 'off');
  if (was.freeAdOffer && now.freeAdOffer && early(was.freeAdOffer.benefits) !== early(now.freeAdOffer.benefits)) {
    lines.push(`Free tier early access: ${early(was.freeAdOffer.benefits)} → ${early(now.freeAdOffer.benefits)}`);
  }
  if (was.storeOffer && now.storeOffer && early(was.storeOffer.benefits) !== early(now.storeOffer.benefits)) {
    lines.push(`Store early access: ${early(was.storeOffer.benefits)} → ${early(now.storeOffer.benefits)}`);
  }
  return lines;
};


/* ── a storefront as a tiny wireframe ─────────────────────────────────────── */
export const Wireframe: React.FC<{ composition: string }> = ({ composition }) => {
  const r = (x: number, y: number, w: number, h: number, key: string, strong = false) => (
    <rect key={key} x={x} y={y} width={w} height={h} rx={1.6} className={strong ? css.wireStrong : css.wire} />
  );
  const shapes: React.ReactNode[] = [];
  if (composition === 'hero') { shapes.push(r(4, 4, 52, 22, 'h', true)); [0, 1, 2, 3].forEach(i => shapes.push(r(4 + i * 13.5, 30, 11, 14, `p${i}`))); }
  else if (composition === 'wall') { for (let y = 0; y < 3; y++) for (let x = 0; x < 4; x++) shapes.push(r(4 + x * 13.5, 4 + y * 13.6, 11, 11, `w${x}${y}`, x === 0 && y === 0)); }
  else if (composition === 'shelves') { [0, 1, 2].forEach(row => { shapes.push(r(4, 4 + row * 14, 18, 2, `l${row}`)); [0, 1, 2, 3].forEach(i => shapes.push(r(4 + i * 13.5, 8 + row * 14, 11, 8, `s${row}${i}`))); }); }
  else if (composition === 'timeline') { [0, 1, 2, 3].forEach(i => { shapes.push(r(4, 5 + i * 10.5, 7, 7, `d${i}`, i === 0)); shapes.push(r(14, 5 + i * 10.5, 42, 7, `t${i}`)); }); }
  else if (composition === 'vault') { shapes.push(r(4, 4, 24, 40, 'v', true)); [0, 1, 2, 3].forEach(i => shapes.push(r(31, 4 + i * 10.3, 25, 7.5, `i${i}`))); }
  else if (composition === 'split') { shapes.push(r(4, 4, 25, 24, 'a', true)); shapes.push(r(31, 4, 25, 24, 'b', true)); [0, 1, 2, 3].forEach(i => shapes.push(r(4 + i * 13.5, 32, 11, 12, `p${i}`))); }
  else if (composition === 'rooms') { [[4, 4], [31, 4], [4, 25], [31, 25]].forEach(([x, y], i) => shapes.push(r(x, y, 25, 19, `r${i}`, i === 0))); }
  else if (composition === 'feed') { [0, 1].forEach(i => shapes.push(r(10, 4 + i * 21, 40, 18, `f${i}`, i === 0))); }
  else { [[4, 4, 20, 16], [27, 6, 14, 10], [44, 4, 12, 20], [8, 24, 14, 20], [26, 20, 22, 12], [28, 35, 12, 9], [44, 28, 12, 16]].forEach(([x, y, w, h], i) => shapes.push(r(x, y, w, h, `c${i}`, i === 0))); }
  return <svg viewBox="0 0 60 48" className={css.wireframe} aria-hidden="true">{shapes}</svg>;
};

export const PlatformOffer: React.FC<{
  accent: string;
  offer: PlatformOfferData;
  actions: PlatformOfferActions;
  sharing?: PlatformSharingProps;
  /** a locked plan step's Go to Tech: the Tech tab, opened on the tech it needs */
  onGoToTech?: (techId: StreamingTechId) => void;
  /** #116: the front page and the ident live in the brand studio */
  onOpenBrandStudio?: () => void;
}> = ({ accent, offer, actions, sharing, onGoToTech, onOpenBrandStudio }) => {
  const saved = offer.pricing;
  const builder = useMemo(() => offer.planBuilder ?? getStreamingPlanBuilderView(null), [offer.planBuilder]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<OwnedStreamingPricingConfiguration>(saved);
  const [forecast, setForecast] = useState<{ now: PricingForecastSummary | null; next: PricingForecastSummary | null } | null>(null);
  const [forecasting, setForecasting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const forecastGeneration = useRef(0);
  const forecastTimers = useRef<number[]>([]);
  const cancelForecast = () => {
    forecastGeneration.current += 1;
    forecastTimers.current.forEach(window.clearTimeout);
    forecastTimers.current = [];
    setForecasting(false);
  };
  useEffect(() => () => {
    forecastGeneration.current += 1;
    forecastTimers.current.forEach(window.clearTimeout);
  }, []);
  useEffect(() => { cancelForecast(); setForecast(null); }, [saved]);
  /* #108: the open control (ad breaks, store, deals) while editing */
  const [control, setControl] = useState<OfferControlId | null>(null);
  /* follow the saved offer when it changes underneath (e.g. after Apply) */
  useEffect(() => { if (!editing) setDraft(saved); }, [editing, saved]);

  const changes = useMemo(() => (editing ? changesBetween(saved, draft, builder) : []), [editing, saved, draft, builder]);
  const changed = editing && JSON.stringify(normalizeStreamingPricingConfiguration(draft)) !== JSON.stringify(normalizeStreamingPricingConfiguration(saved));
  const shown = editing ? draft : saved;
  const core = coreOf(shown);
  const freeTier = Boolean(projectStreamingCommercialOffers(shown).freeAdOffer);
  const dropsSubscriptions = isOn(saved, 'SUBSCRIPTION') && !isOn(draft, 'SUBSCRIPTION');
  const nothingOn = !OFFERS.some(item => isOn(shown, item));
  const planAccounts = shown.plans.reduce((sum, plan) => sum + (offer.planStats[plan.id]?.accounts ?? 0), 0);
  const savedAccounts = saved.plans.reduce((sum, plan) => sum + (offer.planStats[plan.id]?.accounts ?? 0), 0);
  /* accounts on a plan the draft removes choose again at the next settlement */
  const removedAccounts = editing ? saved.plans.filter(plan => !draft.plans.some(row => row.id === plan.id))
    .reduce((sum, plan) => sum + (offer.planStats[plan.id]?.accounts ?? 0), 0) : 0;

  const update = (next: OwnedStreamingPricingConfiguration) => { cancelForecast(); setDraft(normalizeStreamingPricingConfiguration(next)); setForecast(null); setFeedback(null); };
  const toggle = (item: Offer) => update(configureStreamingPricingOffer(draft, { kind: 'TOGGLE', offer: item, enabled: !isOn(draft, item) }));
  /* #103 (plan §18.3): a new main offer only moves the front door; the others stay as they are, with their plans,
     ads and levels (it reset the offer and switched the rest back on, Light and Heavy ads coming back Standard) */
  const makeCore = (item: Offer) => update(configureStreamingPricingOffer(draft, { kind: 'CORE', coreModel: CORE_OF[item] }));
  /* #104: a money engine slot: the last settled week's money a month, or what the state is */
  const slotOf = (item: Offer): MoneyEngineSlot => {
    const on = isOn(shown, item);
    const earned = item === 'SUBSCRIPTION' ? offer.earnings.subscription : item === 'ADS' ? offer.earnings.ads : offer.earnings.store;
    const settled = on && offer.live && isOn(saved, item) && offer.earnings.settled;
    const paid = shown.plans.filter(plan => plan.monthly > 0);
    return {
      on,
      value: settled ? money(earned) : null,
      note: settled ? 'a month, last week' : !offer.live ? 'from launch' : !isOn(saved, item) ? 'new, from next week' : 'settles next week',
      detail: item === 'SUBSCRIPTION' ? `${paid.length} plan${paid.length === 1 ? '' : 's'} · ${compact(planAccounts)} accounts`
        : item === 'ADS' ? adBreakWords(shown.ads.minutesPerHour)
          : `Rent ${price(shown.rentals.rent)} · Buy ${price(shown.rentals.buy)}`,
    };
  };
  const startEditing = () => { cancelForecast(); setDraft(saved); setEditing(true); setFeedback(null); setForecast(null); };
  const stopEditing = () => { cancelForecast(); setEditing(false); setDraft(saved); setForecast(null); setControl(null); };
  /* the plans table's free Ads cell and the store's price open their control (one editor each, plan §18.3) */
  const openControl = (id: OfferControlId) => {
    setControl(id);
    window.requestAnimationFrame(() => document.getElementById(`offer-control-${id}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
  };

  /* The forecast rebuilds the market's response to a price, so it runs only
     when asked, and only after the button has already shown it is working. */
  const runForecast = () => {
    if (!actions.forecast) return;
    cancelForecast();
    const generation = forecastGeneration.current;
    const isCurrent = () => generation === forecastGeneration.current;
    const fail = () => {
      if (!isCurrent()) return;
      setFeedback({ ok: false, message: 'The forecast could not finish. Try again.' });
      setForecasting(false);
    };
    setForecasting(true);
    // Let the loading state paint; keep the two market rebuilds in separate frames.
    forecastTimers.current.push(window.setTimeout(() => {
      if (!isCurrent()) return;
      try {
        const now = actions.forecast!(saved);
        if (!isCurrent()) return;
        forecastTimers.current.push(window.setTimeout(() => {
          if (!isCurrent()) return;
          try {
            const next = actions.forecast!(draft);
            if (isCurrent()) { setForecast({ now, next }); setForecasting(false); }
          } catch { fail(); }
        }, 16));
      } catch { fail(); }
    }, 30));
  };
  const apply = () => {
    if (!actions.applyPricing || !changed) return;
    cancelForecast();
    const result = actions.applyPricing(draft);
    setFeedback(result);
    if (result.ok) { setEditing(false); setForecast(null); }
  };

  return (
    <div className={cx(css.offer, editing && css.isEditing)} style={{ ['--offer-accent' as string]: accent }}>
      {feedback && <p className={cx(css.feedback, feedback.ok ? css.good : css.bad)} role="status">{feedback.message}</p>}
      {editing && (
        <div className={css.editBanner}>
          <b>Editing your offer</b>
          <span>Change anything below. Nothing is saved until you apply.</span>
        </div>
      )}

      {/* ── #104 the money engine (plan §18.4): the ways to earn as a loadout, the same as Define the Launch's; each
           slot's money the last settled week's (the three cards with Turn on / Make main) ── */}
      <MoneyEngine className={css.engine} main={core} editable={editing}
        aside={offer.live ? (offer.earnings.settled ? 'last settled week' : 'settles next week') : 'planned for launch'}
        slots={{ SUBSCRIPTION: slotOf('SUBSCRIPTION'), ADS: slotOf('ADS'), STORE: slotOf('STORE') }}
        onMain={makeCore} onToggle={item => toggle(item)} />
      {nothingOn && <p className={css.hint}>No way of earning is set yet.</p>}

      {/* ── plans, side by side (Free with ads first and Rent or buy last, when they run) ── */}
      {((isOn(shown, 'SUBSCRIPTION') && shown.plans.length > 0) || freeTier || isOn(shown, 'STORE')) && (
        <>
          <div className={css.secHead}><h2>{isOn(shown, 'SUBSCRIPTION') ? 'Plans'
            : [freeTier ? 'Free with ads' : null, isOn(shown, 'STORE') ? 'Rent or buy' : null].filter(Boolean).join(' · ')}</h2>
            <span>{offer.live ? 'who is on each' : 'as planned for launch'}</span></div>
          {offer.live && !editing && planAccounts > 0 && (
            <div className={css.planShare} aria-label="Paid accounts by plan">
              {shown.plans.map((plan, index) => {
                const accounts = offer.planStats[plan.id]?.accounts ?? 0;
                return accounts > 0 ? (
                  <i key={plan.id} style={{ flexGrow: accounts, ['--tint' as string]: `${PLAN_TINTS[index] ?? 16}%` }}
                    title={`${plan.name}: ${compact(accounts)}`} />
                ) : null;
              })}
            </div>
          )}
          <PlanBuilder
            pricing={shown}
            builder={builder}
            saved={editing ? saved : undefined}
            onChange={editing ? update : undefined}
            onGoToTech={onGoToTech}
            onOpenControl={editing ? openControl : undefined}
            footer={offer.live ? {
              label: editing ? 'On it now' : 'On it',
              cells: {
                ...Object.fromEntries(shown.plans.map(plan => {
                  const accounts = offer.planStats[plan.id]?.accounts ?? 0;
                  return [plan.id, saved.plans.some(row => row.id === plan.id) ? {
                    value: compact(accounts),
                    detail: savedAccounts > 0 ? `${Math.round(accounts / savedAccounts * 100)}%` : undefined,
                  } : undefined];
                })),
                // homes watching free; a free tier switched on in this edit has none yet
                ...(projectStreamingCommercialOffers(saved).freeAdOffer && offer.freeAdViewers !== undefined
                  ? { [STREAMING_FREE_TIER_ID]: { value: compact(offer.freeAdViewers), detail: 'homes' } } : {}),
                ...(isOn(saved, 'STORE') && offer.storeBuyers !== undefined
                  ? { [STREAMING_STORE_ID]: { value: compact(offer.storeBuyers), detail: 'a week' } } : {}),
              },
              empty: 'new',
            } : undefined}
          />
        </>
      )}

      {/* ── #108 breaks, store and deals: the Pricing step's controls (#107), read-only until Change pricing ── */}
      <OfferControls pricing={shown} tree={builder.tree} onChange={editing ? update : undefined}
        open={editing ? control : null} onOpen={setControl} />

      {/* ── change pricing ── */}
      {!offer.live ? (
        actions.editBeforeLaunch && (
          <button type="button" className={cx(css.primary, css.wide)} onClick={actions.editBeforeLaunch}>Set pricing in Define the Launch →</button>
        )
      ) : !editing ? (
        actions.applyPricing && <button type="button" className={cx(css.primary, css.wide)} onClick={startEditing}>Change pricing</button>
      ) : (
        <div className={css.editor}>
          <span className={css.eyebrow}>{changes.length ? `YOUR CHANGES · ${changes.length}` : 'NOTHING CHANGED YET'}</span>
          {changes.length > 0
            ? <ul className={css.receipt}>{changes.map(line => <li key={line}>{line}</li>)}</ul>
            : <p className={css.editorNote}>Tap any cell of the plans to change it, add or remove a plan, pick an ad cadence, or switch a way of earning on or off above.</p>}
          {dropsSubscriptions && <p className={css.warn}>Turning subscriptions off ends every paid account at the next weekly settlement.</p>}
          {!dropsSubscriptions && removedAccounts > 0 && <p className={css.warn}>{compact(removedAccounts)} accounts are on plans you remove. At the next weekly settlement they choose another plan, or leave.</p>}
          {actions.forecast && changed && (
            forecast ? (
              <div className={css.forecast}>
                <div className={css.forecastHead}><span>WHERE THE MARKET SETTLES</span><small>now → with your changes</small></div>
                {[
                  { label: 'Paid accounts', now: forecast.now?.subscribers ?? 0, next: forecast.next?.subscribers ?? 0, fmt: compact },
                  { label: 'Watching free', now: forecast.now?.freeAdHouseholds ?? 0, next: forecast.next?.freeAdHouseholds ?? 0, fmt: compact },
                  { label: 'Subscription revenue', now: forecast.now?.monthlySubscriptionRevenue ?? 0, next: forecast.next?.monthlySubscriptionRevenue ?? 0, fmt: (value: number) => `${money(value)}/mo` },
                  { label: 'Ad revenue', now: forecast.now?.weeklyAdRevenue ?? 0, next: forecast.next?.weeklyAdRevenue ?? 0, fmt: (value: number) => `${money(value)}/wk` },
                  { label: 'Store revenue', now: forecast.now?.weeklyStoreRevenue ?? 0, next: forecast.next?.weeklyStoreRevenue ?? 0, fmt: (value: number) => `${money(value)}/wk` },
                ].filter(row => row.now > 0 || row.next > 0).map(row => {
                  /* a move too small to show in the figure is shown as no move */
                  const same = row.fmt(row.now) === row.fmt(row.next);
                  return (
                    <div key={row.label} className={css.forecastRow}>
                      <span>{row.label}</span>
                      <b className={same ? '' : row.next > row.now ? css.up : css.down}><s>{row.fmt(row.now)}</s><i aria-hidden="true">→</i>{row.fmt(row.next)}</b>
                    </div>
                  );
                })}
                {forecast.next && forecast.next.rivalMedianEntryPrice > 0 && <small className={css.rival}>Rivals' median entry price: {price(forecast.next.rivalMedianEntryPrice)}</small>}
                <small className={css.forecastNote}>These are the levels the market settles toward, not next week's numbers. Paid accounts move about 14% of the way there each week when growing and 18% when shrinking.</small>
              </div>
            ) : (
              <button type="button" className={css.secondary} onClick={runForecast} disabled={forecasting}>{forecasting ? 'Forecasting…' : 'See the forecast'}</button>
            )
          )}
          <small className={css.editorFoot}>Changes take effect at the next weekly settlement.</small>
        </div>
      )}

      {/* ── account sharing: a rule for paid accounts, so only while there are any ── */}
      {sharing && !isOn(saved, 'SUBSCRIPTION') && (
        <>
          <div className={css.secHead}><h2>Account sharing</h2><span>not in use</span></div>
          <p className={css.hint}>Sharing rules apply to paid accounts. With subscriptions off there are none to share, and no policing team is paid.</p>
        </>
      )}
      {sharing && isOn(saved, 'SUBSCRIPTION') && (
        <>
          <div className={css.secHead}><h2>Account sharing</h2><span>your policy</span></div>
          <SharingPolicyCard
            accent={accent}
            policy={sharing.policy}
            settled={sharing.settled}
            settledPolicy={sharing.settledPolicy}
            control={sharing.control}
            settledAvailable={sharing.available}
            appliesNextWeek={sharing.appliesNextWeek}
            onApply={sharing.onApply}
          />
        </>
      )}

      {/* ── the front page and the ident: in the brand studio (#116, plan §18.4/§18.6) ── */}
      {(() => {
        const current = offer.storefront.layouts.find(layout => layout.id === offer.storefront.currentId);
        return (
          <button type="button" className={css.brandLink} onClick={onOpenBrandStudio ?? actions.openBrandStudio} disabled={!(onOpenBrandStudio ?? actions.openBrandStudio)}>
            <Wireframe composition={current?.composition ?? 'hero'} />
            <span>
              <b>{current?.name ?? 'Cinema'} front page · {offer.ident.label} ident</b>
              <small>Both live in the brand studio, with the logo, colours and type</small>
            </span>
            <em>Brand studio ›</em>
          </button>
        );
      })()}

      {/* while editing, the commit stays in reach wherever the page is scrolled */}
      {editing && (
        <div className={css.tray}>
          {/* #108: the count and the last change, so the bar says what Apply will do */}
          <span className={css.trayWhat}>
            <small>{changes.length ? `YOUR CHANGES · ${changes.length}` : 'NO CHANGES YET'}</small>
            <em>{changes.at(-1) ?? 'Change anything above'}</em>
          </span>
          <div className={css.trayActs}>
            <button type="button" className={css.secondary} onClick={stopEditing}>Cancel</button>
            <button type="button" className={css.primary} onClick={apply} disabled={!changed}>Apply from next week</button>
          </div>
        </div>
      )}
    </div>
  );
};
