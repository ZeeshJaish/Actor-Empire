/* Define Launch pricing edits the saved commercial offer. The three core
   choices are starting postures; compatible offers remain optional hybrids.
   Subscription plans are built in the plan builder (Phase 2 #45): plans side
   by side, every row a tap, locked steps say what to unlock. */

import { useEffect, useMemo, useState } from 'react';
export { createRangeDraft } from './rangeDraft';
import { MoneyEngine } from '../../../streaming-transplant/MoneyEngine';
import { OfferControls, type OfferControlId } from '../../../streaming-transplant/OfferControls';
/* #107: the one ad cadence control lives with the offer's controls */
export { AdCadenceControl } from '../../../streaming-transplant/OfferControls';
import type { StreamingOfferKind } from '../../../streaming-transplant/offerPersonality';
import {
  CUSTOM_PLAN_COLORS, forecastPricing,
  type Plan, type PricingCohortSignal, type PricingSettings,
} from '../../finance/launch';
import type { OwnedStreamingPricingConfiguration } from '../../../../types';
import {
  configureStreamingPricingOffer, projectStreamingCommercialOffers, type StreamingPricingOfferAction,
} from '../../../../services/streamingCommercialOffers';
import { getStreamingPlanBuilderView } from '../../../../services/streamingPlanBuilder';
import { STREAMING_FREE_TIER_ID } from '../../../../services/streamingPlanOffer';
import { STREAMING_STORE_ID } from '../../../../services/streamingStoreEditions';
import { PlanBuilder } from '../../../streaming-transplant/PlanBuilder';
import type { StepProps } from './LaunchWizard';
import { compactCount, money, moneyPrecise, pct } from '../../finance/format';
import {
  STREAMING_MAXIMUM_ANNUAL_DISCOUNT,
  STREAMING_MAXIMUM_INTRO_OFFER,
  STREAMING_MAXIMUM_PLAN_PRICE,
  effectiveMonthlyStreamingPlanPrice,
  firstYearStreamingPlanRevenuePerSubscriber,
  normalizeStreamingPlanPrice,
  streamingAnnualBillingShare,
  streamingDiscountedMonthly,
  streamingIntroOfferAppliesTo,
  adIntervalForMinutesPerHour,
} from '../../../../services/streamingPricingEconomy';

export function PlanPriceEditorControl({
  value,
  minimum,
  maximum,
  onCommit,
  onPreview,
}: {
  value: number;
  minimum: number;
  maximum: number;
  onCommit: (value: number) => void;
  onPreview?: (value: number | null) => void;
}) {
  const [draftValue, setDraftValue] = useState(String(value));
  useEffect(() => setDraftValue(String(value)), [value]);
  const commit = () => {
    const parsed = Number(draftValue);
    const next = Number.isFinite(parsed)
      ? Math.min(maximum, Math.max(minimum, parsed))
      : value;
    const rounded = Math.round(next * 100) / 100;
    setDraftValue(String(rounded));
    onCommit(rounded);
    onPreview?.(null);
  };
  return (
    <div className="pr-price">
      <button type="button" className="st-step" onClick={() => onCommit(Math.max(minimum, Math.round((value - 1) * 100) / 100))} aria-label="Lower price">−</button>
      <label className="pr-price-figure">
        <span aria-hidden="true">$</span>
        <input
          type="number"
          inputMode="decimal"
          min={minimum}
          max={maximum}
          step="0.01"
          value={draftValue}
          aria-label="Monthly plan price"
          onChange={(event) => {
            setDraftValue(event.target.value);
            const parsed = Number(event.target.value);
            onPreview?.(event.target.value.trim() && Number.isFinite(parsed)
              ? Math.min(maximum, Math.max(minimum, parsed)) : null);
          }}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
        />
        <i>/mo</i>
      </label>
      <button type="button" className="st-step" onClick={() => onCommit(Math.min(maximum, Math.round((value + 1) * 100) / 100))} aria-label="Raise price">+</button>
    </div>
  );
}

export function StepPricing({ data, draft, patch, chosen, handlers, pricingPreview, onPricingGesture, operations }: StepProps) {
  const settings: PricingSettings = draft.pricing ?? data.pricing;
  const selected = settings.commercialOffers?.coreModelSelected !== false;
  const offer = useMemo(() => projectStreamingCommercialOffers(settings as OwnedStreamingPricingConfiguration), [settings]);
  const addressable = useMemo(() => chosen.reduce((sum, c) => sum + c.addressableHouseholds, 0), [chosen]);
  const pricingCohorts = useMemo(() => chosen.flatMap(country => country.pricingCohorts || []), [chosen]);
  const localWorldForecast = useMemo(
    () => !pricingPreview && selected ? handlers.onForecastPricing?.(settings, chosen.map(country => country.id)) ?? null : null,
    [pricingPreview, handlers.onForecastPricing, settings, chosen, selected],
  );
  const worldForecast = pricingPreview ? pricingPreview.worldForecast : localWorldForecast;
  const forecastUpdating = pricingPreview?.updating ?? false;
  const localForecast = useMemo(
    () => !pricingPreview ? forecastPricing(settings, addressable, data.market, pricingCohorts, worldForecast) : null,
    [pricingPreview, settings, addressable, data.market, pricingCohorts, worldForecast],
  );
  const forecast = pricingPreview?.forecast ?? localForecast ?? forecastPricing(settings, addressable, data.market, pricingCohorts);

  const writeOffer = (action: StreamingPricingOfferAction) => patch({ pricing: configureStreamingPricingOffer(
    settings as OwnedStreamingPricingConfiguration, action,
  ) });
  const [openOffer, setOpenOffer] = useState<OfferControlId | null>(null);
  /* the plan builder reads the tech the service owns; a bare preview falls back to a new service's */
  const builder = useMemo(() => data.planBuilder ?? getStreamingPlanBuilderView(null), [data.planBuilder]);
  const planRow = (planId: string) => forecast.plans.find((row) => row.plan.id === planId);

  /* #104 (Zeesh: "चेंज द मॉडल में जो … बॉक्सेस आ रहे हैं वो बॉक्स मुझे एकदम पसंद नहीं" … "तीनों का एक पर्सनैलिटी", plan
     §18.4): the money engine, the main offer's slot and two side slots with their switches, in place of the three boxes
     and each card's "Extend your service" switches; each slot's money is the opening forecast's */
  const CORE_OF = { SUBSCRIPTION: 'SUBSCRIPTION', ADS: 'ADVERTISING', STORE: 'STORE' } as const;
  const engineMain: StreamingOfferKind | null = !selected ? null
    : offer.coreModel === 'ADVERTISING' ? 'ADS' : offer.coreModel === 'STORE' ? 'STORE' : 'SUBSCRIPTION';
  const streamMonthly = (...ids: string[]) => forecast.streams.filter(row => ids.includes(row.id)).reduce((sum, row) => sum + row.monthly, 0);
  const paidPlans = settings.plans.filter(plan => plan.monthly > 0);
  const adPlans = settings.streams.includes('subs') ? settings.plans.filter(plan => plan.ads).length : 0;
  const breakEvery = adIntervalForMinutesPerHour(settings.ads.minutesPerHour);
  const forecastMoney = (...ids: string[]) => (worldForecast && !forecastUpdating ? money(streamMonthly(...ids)) : null);
  const forecastNote = forecastUpdating ? 'updating the forecast' : 'a month, forecast';
  const engine = <MoneyEngine main={engineMain} editable
    aside={engineMain && worldForecast && !forecastUpdating ? `forecast ${money(forecast.monthlyRevenue)} a month` : undefined}
    slots={{
      SUBSCRIPTION: {
        on: settings.streams.includes('subs'), value: forecastMoney('subs'), note: forecastNote,
        detail: paidPlans.length
          ? `${paidPlans.length} plan${paidPlans.length === 1 ? '' : 's'} · from ${moneyPrecise(Math.min(...paidPlans.map(plan => plan.monthly)))}${adPlans ? ` · ${adPlans} with ads` : ''}`
          : 'No plans yet',
      },
      ADS: {
        on: Boolean(offer.freeAdOffer), value: forecastMoney('ads', 'daypass'), note: adPlans ? `${forecastNote} · with ${adPlans === 1 ? 'the ad plan' : `${adPlans} ad plans`}` : forecastNote,
        detail: breakEvery ? `A break every ${breakEvery} min` : `${settings.ads.minutesPerHour} ad min an hour`,
      },
      STORE: {
        on: Boolean(offer.storeOffer), value: forecastMoney('rentals'), note: forecastNote,
        detail: `Rent ${moneyPrecise(settings.rentals.rent)} · Buy ${moneyPrecise(settings.rentals.buy)}`,
      },
    }}
    onMain={kind => { writeOffer({ kind: 'CORE', coreModel: CORE_OF[kind] }); setOpenOffer(null); }}
    onToggle={(kind, on) => writeOffer({ kind: 'TOGGLE', offer: kind, enabled: on })} />;

  /* What a plan's price makes once the discounts apply, shown in its price picker. */
  const priceDetail = (plan: Plan) => {
    const row = planRow(plan.id);
    return <>
      {forecast.rivalMedianEntryPrice !== undefined && plan.monthly > forecast.rivalMedianEntryPrice * 2 && (
        <p className="pr-price-warning">Most reachable households cannot afford this tier. Its features must justify more than twice the rival entry price.</p>
      )}
      {forecast.rivalMedianEntryPrice !== undefined && plan.monthly > 0 && plan.monthly < forecast.rivalMedianEntryPrice * .35 && (
        <p className="pr-price-warning is-watch">This can win volume, but every new household still creates content, delivery and support costs.</p>
      )}
      <PlanPricePaths plan={plan} settings={settings} share={row?.share ?? 0} cohorts={pricingCohorts}
        pathHouseholds={row ? { monthly: row.monthlyBillingSubscribers, annual: row.annualBillingSubscribers } : undefined} />
    </>;
  };

  const forecastPanel = (
      <section className="pr-forecast" aria-label={operations ? "Conditional offer forecast" : "Conditional opening forecast"} aria-busy={forecastUpdating}>
        <div className="pr-forecast-head">
          <div><span className="sf-eyebrow">{operations ? 'Potential audience' : 'Opening audience'}</span><strong>{forecastUpdating ? '—' : compactCount(forecast.households)}</strong><small>households</small></div>
          <div><span className="sf-eyebrow">Potential gross</span><strong>{!forecastUpdating && worldForecast ? money(forecast.monthlyRevenue) : '—'}</strong><small>per month · before costs</small></div>
        </div>
        {forecastUpdating && <p className="pr-forecast-updating" role="status">Updating forecast…</p>}
        <p className="pr-forecast-qualifier">Conditional on eligible titles, delivery and real buyers. Not money earned.</p>
        {data.blockers?.filter(blocker => blocker.severity === 'block').slice(0, 2).map(blocker =>
          <p key={blocker.id} className="pr-forecast-warning" role="status">{blocker.text}</p>)}
        {(data.blockers?.filter(blocker => blocker.severity === 'block').length || 0) > 2 &&
          <p className="pr-forecast-warning">More launch requirements remain unresolved.</p>}
        <details className="pr-forecast-detail"><summary>Revenue breakdown <span aria-hidden="true">⌄</span></summary>
        <div className="pr-forecast-lines">
          {forecast.streams.map(row => <div key={row.id}><span>{row.name}</span><b>{worldForecast ? money(row.monthly) : '—'}</b></div>)}
        </div>
        {worldForecast && <p className="pr-forecast-buyers">Billing mix: {compactCount(worldForecast.monthlySubscribers)} monthly · {compactCount(worldForecast.annualSubscribers)} annual subscribers. {compactCount(worldForecast.freeAdHouseholds)} free ad viewers.</p>}
        {worldForecast && worldForecast.countries.length > 0 && <div className="pr-forecast-countries">
          <p className="sf-eyebrow">{operations ? 'Service markets' : 'Opening markets'}</p>
          {worldForecast.countries.map(country => <div key={country.countryId}>
            <b>{chosen.find(item => item.id === country.countryId)?.name || country.countryId}</b>
            <span>Subscription {compactCount(country.monthlySubscribers)} monthly · {compactCount(country.annualSubscribers)} annual · {compactCount(country.freeAdHouseholds)} free ad viewers</span>
            <em>{money(country.monthlySubscriptionRevenue)}/mo subscriptions
              {settings.streams.includes('ads') && <> · Expected ads {money(country.estimatedWeeklyAdRevenueIfPlayable)}/wk</>}
              {settings.streams.includes('rentals') && <> · Store {money(country.estimatedWeeklyRentalRevenueIfPlayable + country.estimatedWeeklyPurchaseRevenueIfPlayable)}/wk</>}
            </em>
          </div>)}
        </div>}
        <p>Advertising, passes and store purchases are estimates converted from weekly opportunity to a monthly equivalent. Annual subscribers pay yearly; their monthly figure here is an equivalent, not a second charge.</p>
        </details>
      </section>
  );

  if (!selected) return <div className="pr-rebuild">{engine}</div>;
  /* #107 (plan §18.4): the step in one line of play: the money engine, the plans, the three controls under them (ad
     breaks, store, deals: one editor each, plan §18.3), then the forecast. The plans table's free Ads cell and the
     store's price open their control here rather than a second editor. */
  const plansOn = settings.streams.includes('subs');
  const openControl = (id: OfferControlId) => {
    setOpenOffer(id);
    if (typeof window !== 'undefined') window.requestAnimationFrame(() => document.getElementById(`offer-control-${id}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
  };
  const plansTable = (plansOn || Boolean(offer.freeAdOffer) || Boolean(offer.storeOffer)) && (
        <section className="lw-block">
          <PlanBuilder
            pricing={settings as OwnedStreamingPricingConfiguration}
            builder={builder}
            onChange={(next) => patch({ pricing: next as PricingSettings })}
            onPricePreview={(next) => onPricingGesture?.(next as PricingSettings | null)}
            onGoToTech={handlers.onOpenTechnology ? (techId) => handlers.onOpenTechnology!(techId) : undefined}
            onOpenControl={openControl}
            priceDetail={priceDetail}
            colours={CUSTOM_PLAN_COLORS}
            suggest
            footer={{
              label: 'Forecast',
              cells: forecastUpdating ? {} : {
                ...Object.fromEntries(forecast.plans.map((row) => [row.plan.id, {
                  value: compactCount(row.subscribers), detail: pct(row.share, 0),
                }])),
                ...(worldForecast && offer.freeAdOffer
                  ? { [STREAMING_FREE_TIER_ID]: { value: compactCount(worldForecast.freeAdHouseholds), detail: 'homes' } } : {}),
                ...(worldForecast && offer.storeOffer ? { [STREAMING_STORE_ID]: {
                  value: compactCount(worldForecast.estimatedWeeklyRentalBuyersIfPlayable + worldForecast.estimatedWeeklyPurchaseBuyersIfPlayable),
                  detail: 'a week',
                } } : {}),
              },
            }}
          />
        </section>
      );
  return <div className="pr-rebuild">
      {engine}
      {plansTable}
      <OfferControls pricing={settings as OwnedStreamingPricingConfiguration} tree={builder.tree}
        onChange={next => patch({ pricing: next as PricingSettings })}
        onPreview={next => onPricingGesture?.(next as PricingSettings | null)}
        open={openOffer} onOpen={setOpenOffer}
        adEstimate={{ cpm: worldForecast?.adRealizedCpm ?? null, fill: worldForecast?.adFillRate ?? null }} />
      {forecastPanel}

      {settings.streams.some(stream => ['premium', 'daypass', 'sponsor', 'metered', 'patron'].includes(stream)) &&
        <p className="pr-legacy-note">Legacy commercial settings are retained in this save but are not new launch offers. Existing settled income is unchanged.</p>}

      <p className="lw-autosave-state is-current" role="status">
        <i aria-hidden="true" />
        {operations ? 'Preview only · Save changes to apply' : 'Autosaved as you edit'}
      </p>
    </div>;
}

export function PlanPricePaths({ plan, settings, share, cohorts = [], pathHouseholds }: {
  plan: Plan;
  settings: PricingSettings;
  share: number;
  cohorts?: PricingCohortSignal[];
  pathHouseholds?: { monthly: number; annual: number };
}) {
  if (plan.monthly <= 0) {
    return (
      <section className="pr-price-paths" aria-label={`${plan.name} price and audience forecast`}>
        <p>Free ad-supported access. Introductory and annual discounts do not apply; advertising revenue is forecast separately.</p>
        <p>{pct(share, 0)} projected share. Free entry still competes on catalogue, features and rival offers.</p>
      </section>
    );
  }
  const introApplies = streamingIntroOfferAppliesTo(plan.id, settings.introOfferPlanId);
  const introActive = introApplies && settings.introOffer > 0;
  const introMonthly = introActive
    ? streamingDiscountedMonthly(plan.monthly, settings.introOffer, STREAMING_MAXIMUM_INTRO_OFFER)
    : plan.monthly;
  const annualMonthly = streamingDiscountedMonthly(plan.monthly, settings.annualDiscount, STREAMING_MAXIMUM_ANNUAL_DISCOUNT);
  /* Pay yearly (#71): who pays yearly follows the discount */
  const yearlyShare = streamingAnnualBillingShare(settings.annualDiscount);
  const openingBlend = effectiveMonthlyStreamingPlanPrice(
    plan.monthly, settings.annualDiscount, settings.introOffer, 0, introApplies, yearlyShare,
  );
  const totalBuyers = (pathHouseholds?.monthly || 0) + (pathHouseholds?.annual || 0);
  const monthlyFirstYear = introMonthly * 3 + plan.monthly * 9;
  const annualFirstYear = annualMonthly * 12;
  const firstYear = totalBuyers > 0
    ? Math.round((monthlyFirstYear * pathHouseholds!.monthly + annualFirstYear * pathHouseholds!.annual) / totalBuyers * 100) / 100
    : firstYearStreamingPlanRevenuePerSubscriber(plan.monthly, settings.annualDiscount, settings.introOffer, introApplies, yearlyShare);
  const cohortHouseholds = cohorts.reduce((sum, cohort) => sum + Math.max(0, cohort.households), 0);
  const affordablePercent = (price: number): number | null => cohortHouseholds > 0
    ? cohorts.reduce((sum, cohort) => sum + (price <= cohort.monthlyStreamingBudgetPerHousehold + .001
      ? Math.max(0, cohort.households) : 0), 0) / cohortHouseholds * 100
    : null;
  const monthlyAffordable = affordablePercent(introMonthly);
  const annualAffordable = affordablePercent(annualMonthly);
  return (
    <section className="pr-price-paths" aria-label={`${plan.name} price and audience forecast`}>
      <dl>
        <div><dt>List price</dt><dd>{moneyPrecise(plan.monthly)}/mo</dd></div>
        <div><dt>First three months</dt><dd>{moneyPrecise(introMonthly)}/mo <small>{introActive ? 'monthly subscribers, then list price' : settings.introOffer > 0 ? 'not targeted' : 'offer off'}</small></dd></div>
        <div><dt>Pay yearly</dt><dd>{moneyPrecise(annualMonthly)}/mo <small>equivalent · billed yearly</small></dd></div>
        <div><dt>Opening blend</dt><dd>{moneyPrecise(openingBlend)}/mo <small>{pct(yearlyShare * 100, 0)} yearly, {pct((1 - yearlyShare) * 100, 0)} monthly reference average, not a charged price</small></dd></div>
        <div><dt>Year one</dt><dd>{moneyPrecise(firstYear)} <small>per subscriber</small></dd></div>
      </dl>
      <p>
        {pct(share, 0)} projected share. {monthlyAffordable !== null && annualAffordable !== null && (
          <>Monthly path: {pct(monthlyAffordable, 0)} affordable. Annual path: {pct(annualAffordable, 0)} affordable in the selected-market sample. </>
        )}
        {pathHouseholds && <>{Math.round(pathHouseholds.monthly).toLocaleString()} monthly buyers · {Math.round(pathHouseholds.annual).toLocaleString()} annual buyers. </>}
        Households also weigh features, catalogue and rivals; affordable does not mean guaranteed to subscribe.
      </p>
    </section>
  );
}


