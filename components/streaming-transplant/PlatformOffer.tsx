/* ============================================================================
   PLATFORM · OFFER — what viewers get, what they pay, and how they may share.

   Everything about the service's configuration that used to be frozen at
   launch (or scattered over the launch wizard and the Audience room) lives
   here, in the Platform room:

     WAYS TO EARN     subscription, free with ads, rent or buy: lit when on,
                      the main one crowned, each with what it earned
     PLANS            each plan as a price card, with a bar of who is on which
     AD BREAKS/STORE  the ad cadence and the store's two prices
     CHANGE PRICING   a staged editor: nothing saves until "Apply from next
                      week"; a receipt of every change; an on-demand forecast
     ACCOUNT SHARING  the policy card (moved here from the Audience room)
     STOREFRONT       the home-screen layouts, drawn as small wireframes
     IDENT            the playback ident, as set at launch

   Presentation only: the HQ hands in the data and the canonical actions.
   ========================================================================== */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import css from './presentation/screens/NetworkDesk/PlatformOffer.module.css';
import { cx } from './presentation/cx';
import { compact } from './audienceAtlasModel';
import { SharingPolicyCard } from './SharingPolicyCard';
import { PLAN_FEATURES } from '../studio-finance/finance/launch';
import { configureStreamingPricingOffer, projectStreamingCommercialOffers } from '../../services/streamingCommercialOffers';
import {
  STREAMING_AD_INTERVAL_PRESETS,
  adIntervalForMinutesPerHour,
  adMinutesPerHourForInterval,
  normalizeStreamingPricingConfiguration,
} from '../../services/streamingPricingEconomy';
import type { StreamingSharingPolicyFigures } from '../../services/streamingSharingPolicy';
import type {
  OwnedStreamingPricingConfiguration,
  StreamingEnforcementInvestment,
  StreamingSharingPosture,
  WorldStreamingCustomerAccessPolicy,
} from '../../types';

export interface PlatformOfferData {
  live: boolean;
  pricing: OwnedStreamingPricingConfiguration;
  /** Paid accounts and monthly revenue per plan id, from the customer ledger. */
  planStats: Record<string, { accounts: number; monthlyRevenue: number }>;
  /** What each way of earning brought in, as monthly figures (last settled week). */
  earnings: { subscription: number; ads: number; store: number; settled: boolean };
  storefront: {
    currentId: string | null;
    layouts: Array<{ id: string; name: string; line: string; composition: string; category: string; locked: string | null }>;
  };
  ident: { label: string; detail: string };
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
}

export interface PlatformSharingProps {
  policy: WorldStreamingCustomerAccessPolicy;
  settled: StreamingSharingPolicyFigures;
  settledPolicy?: Pick<WorldStreamingCustomerAccessPolicy, 'sharingPosture' | 'enforcementInvestment'>;
  available: boolean;
  appliesNextWeek: boolean;
  onApply: (policy: { sharingPosture: StreamingSharingPosture; enforcementInvestment: StreamingEnforcementInvestment }) => void;
}

const money = (value: number) => `$${compact(Math.max(0, Math.round(value)))}`;
const price = (value: number) => (value <= 0 ? 'Free' : `$${value.toFixed(2)}`);
const FEATURE_NAME = new Map(PLAN_FEATURES.map(feature => [feature.id, feature.name]));
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

const isOn = (pricing: OwnedStreamingPricingConfiguration, offer: Offer) => pricing.streams.includes(STREAM_OF[offer]);
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
   receipt the player reads before applying. */
const changesBetween = (saved: OwnedStreamingPricingConfiguration, draft: OwnedStreamingPricingConfiguration): string[] => {
  const lines: string[] = [];
  const savedCore = coreOf(saved);
  const draftCore = coreOf(draft);
  if (savedCore !== draftCore && draftCore) lines.push(`${OFFER_WORDS[draftCore].name} becomes the main offer`);
  OFFERS.forEach(offer => {
    if (isOn(saved, offer) && !isOn(draft, offer)) lines.push(`${OFFER_WORDS[offer].name} off`);
    /* a new main offer was switched on to become it: one line says both */
    if (!isOn(saved, offer) && isOn(draft, offer) && !(offer === draftCore && savedCore !== draftCore)) lines.push(`${OFFER_WORDS[offer].name} on`);
  });
  if (isOn(draft, 'SUBSCRIPTION')) {
    draft.plans.forEach(plan => {
      const before = saved.plans.find(row => row.id === plan.id);
      if (!before) lines.push(`${plan.name} added at ${price(plan.monthly)}`);
      else if (before.monthly !== plan.monthly) lines.push(`${plan.name} ${price(before.monthly)} → ${price(plan.monthly)}`);
    });
  }
  if (isOn(draft, 'ADS') && isOn(saved, 'ADS') && saved.ads.minutesPerHour !== draft.ads.minutesPerHour) {
    lines.push(`Ad breaks: ${adBreakWords(saved.ads.minutesPerHour).toLowerCase()} → ${adBreakWords(draft.ads.minutesPerHour).toLowerCase()}`);
  }
  if (isOn(draft, 'STORE') && isOn(saved, 'STORE')) {
    if (saved.rentals.rent !== draft.rentals.rent) lines.push(`Rent ${price(saved.rentals.rent)} → ${price(draft.rentals.rent)}`);
    if (saved.rentals.buy !== draft.rentals.buy) lines.push(`Buy ${price(saved.rentals.buy)} → ${price(draft.rentals.buy)}`);
  }
  return lines;
};

/* ── glyphs ──────────────────────────────────────────────────────────────── */
const OfferGlyph: React.FC<{ offer: Offer }> = ({ offer }) => (
  <svg viewBox="0 0 24 24" className={css.glyph} aria-hidden="true">
    {offer === 'SUBSCRIPTION' && <><rect x="3" y="5.5" width="18" height="13" rx="2.6" /><path d="M3 10h18M7 15h4" /></>}
    {offer === 'ADS' && <><path d="M4 10v4h3.2l5.8 4V6L7.2 10H4z" /><path d="M16.4 9.2a4 4 0 010 5.6M18.8 7a7 7 0 010 10" /></>}
    {offer === 'STORE' && <><path d="M5.5 8.5h13l-1.1 10.5H6.6L5.5 8.5z" /><path d="M9 8.5V7a3 3 0 016 0v1.5" /></>}
  </svg>
);

/* ── a storefront as a tiny wireframe ─────────────────────────────────────── */
const Wireframe: React.FC<{ composition: string }> = ({ composition }) => {
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

/* ── a small −/+ control for a price ──────────────────────────────────────── */
const Stepper: React.FC<{ value: number; step: number; min: number; max: number; format: (value: number) => string; onChange: (value: number) => void; label: string }> = ({ value, step, min, max, format, onChange, label }) => (
  <div className={css.stepper} role="group" aria-label={label}>
    <button type="button" onClick={() => onChange(Math.max(min, Math.round((value - step) * 100) / 100))} disabled={value <= min} aria-label={`Lower ${label}`}>−</button>
    <b>{format(value)}</b>
    <button type="button" onClick={() => onChange(Math.min(max, Math.round((value + step) * 100) / 100))} disabled={value >= max} aria-label={`Raise ${label}`}>+</button>
  </div>
);

export const PlatformOffer: React.FC<{
  accent: string;
  offer: PlatformOfferData;
  actions: PlatformOfferActions;
  sharing?: PlatformSharingProps;
}> = ({ accent, offer, actions, sharing }) => {
  const saved = offer.pricing;
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
  const [layoutPick, setLayoutPick] = useState<string | null>(null);
  /* follow the saved offer when it changes underneath (e.g. after Apply) */
  useEffect(() => { if (!editing) setDraft(saved); }, [editing, saved]);

  const changes = useMemo(() => (editing ? changesBetween(saved, draft) : []), [editing, saved, draft]);
  const changed = editing && JSON.stringify(normalizeStreamingPricingConfiguration(draft)) !== JSON.stringify(normalizeStreamingPricingConfiguration(saved));
  const shown = editing ? draft : saved;
  const core = coreOf(shown);
  const freeTier = Boolean(projectStreamingCommercialOffers(shown).freeAdOffer);
  const dropsSubscriptions = isOn(saved, 'SUBSCRIPTION') && !isOn(draft, 'SUBSCRIPTION');
  const nothingOn = !OFFERS.some(item => isOn(shown, item));
  const planAccounts = shown.plans.reduce((sum, plan) => sum + (offer.planStats[plan.id]?.accounts ?? 0), 0);
  /* the layout in use first, then the ones ready to use, then the locked ones */
  const layouts = useMemo(() => {
    const rank = (layout: PlatformOfferData['storefront']['layouts'][number]) => (layout.id === offer.storefront.currentId ? 0 : layout.locked ? 2 : 1);
    return [...offer.storefront.layouts].sort((a, b) => rank(a) - rank(b));
  }, [offer.storefront]);
  const unlocked = layouts.filter(layout => !layout.locked).length;

  const update = (next: OwnedStreamingPricingConfiguration) => { cancelForecast(); setDraft(normalizeStreamingPricingConfiguration(next)); setForecast(null); setFeedback(null); };
  const toggle = (item: Offer) => update(configureStreamingPricingOffer(draft, { kind: 'TOGGLE', offer: item, enabled: !isOn(draft, item) }));
  /* Choosing a new main way of earning resets the offer to that one stream, so
     the others that were on are switched straight back on, and a subscription
     service that ran ads only on its cheaper plans does not grow a free tier. */
  const makeCore = (item: Offer) => {
    const kept = OFFERS.filter(other => other !== item && isOn(draft, other));
    const rebuilt = kept.reduce(
      (next, other) => configureStreamingPricingOffer(next, { kind: 'TOGGLE', offer: other, enabled: true }),
      configureStreamingPricingOffer(draft, { kind: 'CORE', coreModel: CORE_OF[item] }),
    );
    const hadFreeTier = Boolean(projectStreamingCommercialOffers(draft).freeAdOffer);
    update(kept.includes('ADS') && !hadFreeTier
      ? { ...rebuilt, commercialOffers: { ...rebuilt.commercialOffers!, freeAdAccess: false } }
      : rebuilt);
  };
  const setPlanPrice = (planId: string, monthly: number) => update({ ...draft, plans: draft.plans.map(plan => (plan.id === planId ? { ...plan, monthly } : plan)) });
  const startEditing = () => { cancelForecast(); setDraft(saved); setEditing(true); setFeedback(null); setForecast(null); };
  const stopEditing = () => { cancelForecast(); setEditing(false); setDraft(saved); setForecast(null); };

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

      {/* ── the three ways to earn ── */}
      <div className={css.secHead}><h2>Ways to earn</h2><span>{offer.live ? (offer.earnings.settled ? 'last settled week, per month' : 'settles next week') : 'planned for launch'}</span></div>
      <div className={css.models}>
        {OFFERS.map(item => {
          const on = isOn(shown, item);
          const earned = item === 'SUBSCRIPTION' ? offer.earnings.subscription : item === 'ADS' ? offer.earnings.ads : offer.earnings.store;
          return (
            <div key={item} className={cx(css.model, on && css.modelOn, core === item && on && css.modelCore)}>
              <div className={css.modelTop}>
                <OfferGlyph offer={item} />
                <span>{core === item && on ? 'MAIN' : on ? 'ON' : 'OFF'}</span>
              </div>
              <b>{OFFER_WORDS[item].name}</b>
              <small>{item === 'ADS' && on && !freeTier ? 'ads on cheaper plans' : OFFER_WORDS[item].line}</small>
              {/* a figure when there is one; otherwise a small word for the state */}
              {on && offer.live && isOn(saved, item) && offer.earnings.settled
                ? <em>{money(earned)}<i>/mo</i></em>
                : <em className={css.modelState}>{!on ? '—' : !offer.live ? 'FROM LAUNCH' : !isOn(saved, item) ? 'NEW' : 'NEXT WEEK'}</em>}
              {editing && (
                <div className={css.modelActions}>
                  {!(core === item && on) && <button type="button" onClick={() => toggle(item)}>{on ? 'Turn off' : 'Turn on'}</button>}
                  {on && core !== item && <button type="button" onClick={() => makeCore(item)}>Make main</button>}
                  {core === item && on && <span>Your main offer</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {nothingOn && <p className={css.hint}>No way of earning is set yet.</p>}

      {/* ── plans as price cards ── */}
      {isOn(shown, 'SUBSCRIPTION') && shown.plans.length > 0 && (
        <>
          <div className={css.secHead}><h2>Plans</h2><span>{offer.live ? 'who is on each' : 'as planned for launch'}</span></div>
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
          <div className={css.plans}>
            {shown.plans.map((plan, index) => {
              const stats = offer.planStats[plan.id];
              const share = planAccounts > 0 ? Math.round((stats?.accounts ?? 0) / planAccounts * 100) : 0;
              const before = saved.plans.find(row => row.id === plan.id);
              const moved = editing && before && before.monthly !== plan.monthly;
              return (
                <article key={plan.id} className={cx(css.plan, moved && css.planMoved)} style={{ ['--tint' as string]: `${PLAN_TINTS[index] ?? 16}%` }}>
                  <header><i className={css.planDot} /><b>{plan.name}</b>{plan.ads && <em>with ads</em>}</header>
                  {editing
                    ? <Stepper label={`${plan.name} price`} value={plan.monthly} step={0.5} min={plan.ads ? 0 : 0.99} max={99.99} format={price} onChange={value => setPlanPrice(plan.id, value)} />
                    : <strong>{price(plan.monthly)}{plan.monthly > 0 && <small>/mo</small>}</strong>}
                  {moved && <s className={css.was}>was {price(before!.monthly)}</s>}
                  <div className={css.features}>
                    {plan.featureIds.filter(id => id !== 'noads' || !plan.ads).slice(0, 4).map(id => <span key={id}>{FEATURE_NAME.get(id) || id}</span>)}
                    {!plan.featureIds.length && <span>Standard</span>}
                  </div>
                  {offer.live && !editing && (
                    <footer>
                      <span><b>{compact(stats?.accounts ?? 0)}</b> accounts{planAccounts > 0 ? ` · ${share}%` : ''}</span>
                      <span>{money(stats?.monthlyRevenue ?? 0)}/mo</span>
                    </footer>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}

      {/* ── ads and store terms ── */}
      {(isOn(shown, 'ADS') || isOn(shown, 'STORE')) && (
        <div className={css.terms}>
          {isOn(shown, 'ADS') && (
            <div className={css.term}>
              <span>AD BREAKS</span>
              {editing ? (
                <div className={css.segments} role="group" aria-label="How often an ad break plays">
                  {STREAMING_AD_INTERVAL_PRESETS.map(interval => {
                    const minutes = adMinutesPerHourForInterval(interval);
                    return (
                      <button key={interval} type="button" aria-pressed={Math.abs(draft.ads.minutesPerHour - minutes) < .0001}
                        onClick={() => update({ ...draft, ads: { ...draft.ads, minutesPerHour: minutes } })}>
                        {interval}<small>min</small>
                      </button>
                    );
                  })}
                </div>
              ) : <b>{adBreakWords(shown.ads.minutesPerHour)}</b>}
              <small>{editing ? 'One 30-second break every so many minutes. ' : ''}More breaks earn more an hour but push viewers away.</small>
            </div>
          )}
          {isOn(shown, 'STORE') && (
            <div className={css.term}>
              <span>STORE PRICES</span>
              {editing ? (
                <div className={css.termSteppers}>
                  <Stepper label="Rental price" value={draft.rentals.rent} step={0.5} min={0.99} max={12} format={value => `Rent ${price(value)}`} onChange={value => update({ ...draft, rentals: { ...draft.rentals, rent: value } })} />
                  <Stepper label="Purchase price" value={draft.rentals.buy} step={1} min={1.99} max={30} format={value => `Buy ${price(value)}`} onChange={value => update({ ...draft, rentals: { ...draft.rentals, buy: value } })} />
                </div>
              ) : <b>Rent {price(shown.rentals.rent)} · Buy {price(shown.rentals.buy)}</b>}
              <small>One price for every eligible title · rental window {shown.rentals.windowWeeks} week{shown.rentals.windowWeeks === 1 ? '' : 's'}.</small>
            </div>
          )}
        </div>
      )}

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
            : <p className={css.editorNote}>Use − and + on a price, pick an ad cadence, or switch a way of earning on or off above.</p>}
          {dropsSubscriptions && <p className={css.warn}>Turning subscriptions off ends every paid account at the next weekly settlement.</p>}
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
            settledAvailable={sharing.available}
            appliesNextWeek={sharing.appliesNextWeek}
            onApply={sharing.onApply}
          />
        </>
      )}

      {/* ── storefront ── */}
      <div className={css.secHead}><h2>Storefront</h2><span>{unlocked} of {layouts.length} ready · swipe</span></div>
      <div className={css.storefronts}>
        {layouts.map(layout => {
          const current = layout.id === offer.storefront.currentId;
          const picked = layoutPick === layout.id;
          return (
            <button key={layout.id} type="button" disabled={Boolean(layout.locked)}
              className={cx(css.storefront, current && css.storefrontCurrent, picked && css.storefrontPicked)}
              onClick={() => setLayoutPick(current || picked ? null : layout.id)} aria-pressed={picked}>
              <Wireframe composition={layout.composition} />
              <b>{layout.name}</b>
              <small>{layout.locked ? `Needs ${layout.locked}` : current ? 'IN USE' : layout.category.toLowerCase()}</small>
            </button>
          );
        })}
      </div>
      {layoutPick && (() => {
        const layout = offer.storefront.layouts.find(item => item.id === layoutPick);
        return layout ? (
          <div className={css.storefrontApply}>
            <p><b>{layout.name}</b>{layout.line}</p>
            {offer.live && actions.applyStorefront
              ? <button type="button" className={css.primary} onClick={() => { const result = actions.applyStorefront!(layout.id); setFeedback(result); if (result.ok) setLayoutPick(null); }}>Use this storefront</button>
              : actions.editBeforeLaunch && <button type="button" className={css.secondary} onClick={actions.editBeforeLaunch}>Choose it in Define the Launch →</button>}
          </div>
        ) : null;
      })()}

      {/* ── ident ── */}
      <div className={css.secHead}><h2>Playback ident</h2><span>set at launch</span></div>
      <div className={css.ident}>
        <svg viewBox="0 0 24 24" className={css.glyph} aria-hidden="true"><path d="M4 12h1.5M7.5 8v8M11 5v14M14.5 8.5v7M18 10.5v3M20.5 12H20" /></svg>
        <div><b>{offer.ident.label}</b><small>{offer.ident.detail}</small></div>
      </div>

      {/* while editing, the commit stays in reach wherever the page is scrolled */}
      {editing && (
        <div className={css.tray}>
          <span><b>{changes.length || 'No'}</b> change{changes.length === 1 ? '' : 's'}</span>
          <button type="button" className={css.secondary} onClick={stopEditing}>Cancel</button>
          <button type="button" className={css.primary} onClick={apply} disabled={!changed}>Apply from next week</button>
        </div>
      )}
    </div>
  );
};
