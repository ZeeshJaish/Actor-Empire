/* Define Launch pricing edits the saved commercial offer. The three core
   choices are starting postures; compatible offers remain optional hybrids. */

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FocusEvent, type KeyboardEvent, type PointerEvent, type ReactNode, type TouchEvent } from 'react';
import { createRangeDraft } from './rangeDraft';
export { createRangeDraft } from './rangeDraft';
import { CoreOfferPicker } from './CoreOfferPicker';
import { PricingOfferCard } from './PricingOfferCard';
import {
  CUSTOM_PLAN_COLORS, PLAN_FEATURES, forecastPricing,
  type CustomPlanColorId, type Plan, type PricingCohortSignal, type PricingSettings,
} from '../../finance/launch';
import type { OwnedStreamingPricingConfiguration, StreamingCommercialOfferBenefit } from '../../../../types';
import { configureStreamingPricingOffer, projectStreamingCommercialOffers, type StreamingPricingOfferAction } from '../../../../services/streamingCommercialOffers';
import type { StepProps } from './LaunchWizard';
import { compactCount, money, moneyPrecise, pct } from '../../finance/format';
import { ResearchLockMark } from './ResearchLockMark';
import {
  STREAMING_AD_INTERVAL_PRESETS,
  STREAMING_MAXIMUM_ANNUAL_DISCOUNT,
  STREAMING_MAXIMUM_INTRO_OFFER,
  STREAMING_MAXIMUM_PLAN_PRICE,
  STREAMING_MINIMUM_PAID_PLAN_PRICE,
  effectiveMonthlyStreamingPlanPrice,
  firstYearStreamingPlanRevenuePerSubscriber,
  normalizeStreamingPlanPrice,
  normalizeStreamingPricingConfiguration,
  streamingDiscountedMonthly,
  streamingIntroOfferAppliesTo,
  adMinutesPerHourForInterval,
  adIntervalForMinutesPerHour,
} from '../../../../services/streamingPricingEconomy';

const OPTIONAL_FEATURE_IDS = ['spatial', 'downloads', 'catalogue', 'live', 'extraseat'];

const planTone = (plan: Plan) => {
  if (plan.id === 'BASIC' || plan.name.trim().toLowerCase() === 'essential') return 'essential';
  if (plan.id === 'PREMIUM' || plan.name.trim().toLowerCase() === 'standard') return 'standard';
  if (plan.id === 'FAMILY' || plan.name.trim().toLowerCase() === 'premiere') return 'premiere';
  return 'custom';
};

const PLAN_COLOR_LABELS: Record<CustomPlanColorId, string> = {
  emerald: 'Emerald',
  ocean: 'Ocean',
  teal: 'Teal',
  rose: 'Rose',
  magenta: 'Magenta',
  graphite: 'Graphite',
};

const stablePlanColor = (plan: Plan): CustomPlanColorId => {
  if (plan.colorId && CUSTOM_PLAN_COLORS.includes(plan.colorId)) return plan.colorId;
  const hash = [...plan.id].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return CUSTOM_PLAN_COLORS[hash % CUSTOM_PLAN_COLORS.length];
};

const assignPlanColor = (plans: Plan[]): CustomPlanColorId => {
  const used = new Set(plans.filter((plan) => planTone(plan) === 'custom').map(stablePlanColor));
  const available = CUSTOM_PLAN_COLORS.filter((color) => !used.has(color));
  const pool = available.length ? available : CUSTOM_PLAN_COLORS;
  return pool[Math.floor(Math.random() * pool.length)];
};

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

export function StepPricing({ data, draft, patch, chosen, handlers, pricingPreview, onPricingGesture }: StepProps) {
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

  /* What each discount is worked out against. Annual billing is on every plan,
     so it reads as the range from the cheapest to the dearest; the introductory
     offer is aimed, so it reads against the plan it is aimed at. */
  const entryPrice = forecast.entryPrice;
  const dearestPrice = settings.plans.length ? Math.max(...settings.plans.map((plan) => plan.monthly)) : entryPrice;
  const introPlan = settings.introOfferPlanId
    ? settings.plans.find((plan) => plan.id === settings.introOfferPlanId)
    : undefined;
  const introBasePrice = introPlan ? introPlan.monthly : entryPrice;
  const write = (next: Partial<PricingSettings>) => patch({ pricing: normalizeStreamingPricingConfiguration({
    ...settings, ...next,
  } as OwnedStreamingPricingConfiguration) });
  const preview = (next: Partial<PricingSettings> | null) => onPricingGesture?.(next
    ? { ...settings, ...next } as PricingSettings : null);
  const writeOffer = (action: StreamingPricingOfferAction) => patch({ pricing: configureStreamingPricingOffer(
    settings as OwnedStreamingPricingConfiguration, action,
  ) });
  const writePlan = (id: string, next: Partial<Plan>) =>
    write({ plans: settings.plans.map((p) => (p.id === id ? { ...p, ...next } : p)) });
  const setExclusiveFeature = (plan: Plan, group: string[], selectedId: string | null) =>
    writePlan(plan.id, { featureIds: [...plan.featureIds.filter(id => !group.includes(id)),
      ...(selectedId ? [selectedId] : [])] });
  const setBenefit = (target: 'PLAN' | 'FREE_AD' | 'STORE', benefit: StreamingCommercialOfferBenefit, planId?: string) =>
    writeOffer({ kind: 'BENEFIT', offer: target, planId, ...benefit });
  const [openPlanId, setOpenPlanId] = useState<string | null>(null);
  const [openOffer, setOpenOffer] = useState<'ADS' | 'STORE' | null>(null);
  const openPlanIndex = settings.plans.findIndex((plan) => plan.id === openPlanId);
  const openPlan = openPlanIndex >= 0 ? settings.plans[openPlanIndex] : null;
  const openPlanRow = openPlan ? forecast.plans.find((row) => row.plan.id === openPlan.id) : null;


  const addPlan = () => {
    if (settings.plans.length >= 6) return;
    const id = `plan-${Date.now()}`;
    write({
      plans: [...settings.plans, {
        id,
        name: `Plan ${settings.plans.length + 1}`,
        monthly: 12,
        featureIds: ['noads', 'catalogue'],
        ads: false,
        colorId: assignPlanColor(settings.plans),
      }],
    });
    setOpenPlanId(id);
    setOpenOffer(null);
  };

  const picker = <CoreOfferPicker core={offer.coreModel} selected={selected} onChoose={coreModel => {
    writeOffer({ kind: 'CORE', coreModel }); setOpenPlanId(null); setOpenOffer(null);
  }} />;
  const additions = (context: 'SUBSCRIPTION' | 'ADS' | 'STORE') => <div className="pr-included-offers">
    <p className="sf-eyebrow">Extend your service</p>
    <small>Public offers across your service, not a benefit exclusive to this plan.</small>
    {([
      ['SUBSCRIPTION', 'Membership plans', settings.streams.includes('subs'), 'SUBSCRIPTION'],
      ['ADS', 'Free ad-supported viewing', Boolean(offer.freeAdOffer), 'ADVERTISING'],
      ['STORE', 'Rentals & purchases', Boolean(offer.storeOffer), 'STORE'],
    ] as const).filter(([id]) => id !== context).map(([id, label, enabled, core]) => (
      <label key={id} className="pr-setting-row"><span>{label}{core === offer.coreModel && <small>Core offer</small>}</span>
        <input type="checkbox" role="switch" checked={enabled} disabled={core === offer.coreModel}
          onChange={event => writeOffer({ kind: 'TOGGLE', offer: id, enabled: event.target.checked })} />
      </label>
    ))}
  </div>;

  /* The offering picker now lives INSIDE the plan it belongs to, so the card
     expands rather than handing off to a panel somewhere below it. */
  const planEditor = openPlan ? (
            <div
              className="pr-plan pr-plan-editor"
              data-plan-tone={planTone(openPlan)}
              data-plan-color={planTone(openPlan) === 'custom' ? stablePlanColor(openPlan) : undefined}
            >
              <header className="pr-plan-head">
                <input
                  className="pr-plan-name"
                  value={openPlan.name}
                  onChange={(e) => writePlan(openPlan.id, { name: e.target.value })}
                  aria-label="Plan name"
                />
                {settings.plans.length > 1 && (
                  <button
                    type="button"
                    className="pr-remove"
                    onClick={() => {
                      write({ plans: settings.plans.filter((plan) => plan.id !== openPlan.id) });
                      setOpenPlanId(null);
                    }}
                    aria-label={`Remove ${openPlan.name}`}
                  >
                    ×
                  </button>
                )}
              </header>

              <PlanPriceEditorControl
                value={openPlan.monthly}
                minimum={openPlan.ads && settings.streams.includes('ads') ? 0 : STREAMING_MINIMUM_PAID_PLAN_PRICE}
                maximum={STREAMING_MAXIMUM_PLAN_PRICE}
                onCommit={(monthly) => writePlan(openPlan.id, {
                  monthly: normalizeStreamingPlanPrice(monthly, openPlan.ads && settings.streams.includes('ads')),
                })}
                onPreview={monthly => preview(monthly === null ? null : { plans: settings.plans.map(plan =>
                  plan.id === openPlan.id ? { ...plan, monthly } : plan) })}
              />
              {forecast.rivalMedianEntryPrice !== undefined && openPlan.monthly > forecast.rivalMedianEntryPrice * 2 && (
                <p className="pr-price-warning">Most reachable households cannot afford this tier. Its features must justify more than twice the rival entry price.</p>
              )}
              {forecast.rivalMedianEntryPrice !== undefined && openPlan.monthly > 0 && openPlan.monthly < forecast.rivalMedianEntryPrice * .35 && (
                <p className="pr-price-warning is-watch">This can win volume, but every new household still creates content, delivery and support costs.</p>
              )}

              {planTone(openPlan) === 'custom' && (
                <div className="pr-plan-colour-picker">
                  <em>Plan colour</em>
                  <div className="pr-plan-colours" role="group" aria-label="Plan colour">
                    {CUSTOM_PLAN_COLORS.map((colorId) => (
                      <button
                        key={colorId}
                        type="button"
                        className="pr-plan-colour"
                        data-plan-color={colorId}
                        aria-label={`${PLAN_COLOR_LABELS[colorId]} plan colour`}
                        aria-pressed={stablePlanColor(openPlan) === colorId}
                        onClick={() => writePlan(openPlan.id, { colorId })}
                      >
                        <span aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="pr-feats">
                {([
                  { label: 'Picture quality', ids: ['hd', 'uhd'], base: 'Standard picture' },
                  { label: 'Simultaneous streams', ids: ['streams2', 'streams4'], base: '1 stream' },
                ] as const).map(group => <div key={group.label} className="pr-featgroup">
                  <em>{group.label}</em>
                  <div className="pr-feature-segments" role="group" aria-label={group.label}>
                    <button type="button" aria-pressed={!group.ids.some(id => openPlan.featureIds.includes(id))}
                      onClick={() => setExclusiveFeature(openPlan, [...group.ids], null)}>{group.base}</button>
                    {group.ids.map(id => {
                      const feature = PLAN_FEATURES.find(item => item.id === id)!;
                      const lock = data.capabilityLocks[`feature:${id}`];
                      return <button key={id} type="button" disabled={Boolean(lock)}
                        aria-label={lock ? `${feature.name}, research locked` : feature.name}
                        aria-pressed={openPlan.featureIds.includes(id)}
                        onClick={() => setExclusiveFeature(openPlan, [...group.ids], id)}>
                        {feature.name}{lock && <ResearchLockMark compact />}
                      </button>;
                    })}
                  </div>
                </div>)}
                <div className="pr-featgroup"><em>More benefits</em>
                  <div className="pr-feature-list">
                    {OPTIONAL_FEATURE_IDS.map(id => {
                      const feature = PLAN_FEATURES.find(item => item.id === id)!;
                      const has = openPlan.featureIds.includes(id);
                      const lock = data.capabilityLocks[`feature:${id}`];
                      return <button key={id} type="button" disabled={Boolean(lock)} aria-pressed={has}
                        aria-label={lock ? `${feature.name}, research locked` : feature.name}
                        onClick={() => writePlan(openPlan.id, { featureIds: has
                          ? openPlan.featureIds.filter(item => item !== id) : [...openPlan.featureIds, id] })}>
                        <span>{feature.name}</span>{lock ? <ResearchLockMark compact />
                          : <span className="pr-feature-check" aria-hidden="true">{has ? '✓' : '+'}</span>}
                      </button>;
                    })}
                  </div>
                </div>
                {settings.streams.includes('ads') && (
                  <div className="pr-featgroup">
                    <em>Ad experience</em>
                    <div className="pr-feature-segments" role="group" aria-label="Ad experience">
                      {[false, true].map(ads => <button key={String(ads)} type="button" aria-pressed={openPlan.ads === ads}
                        onClick={() => writePlan(openPlan.id, { ads,
                          monthly: normalizeStreamingPlanPrice(openPlan.monthly, ads) })}>
                        {ads ? 'With adverts' : 'No adverts'}
                      </button>)}
                    </div>
                  </div>
                )}
              </div>

              <OfferBenefitEditor
                value={offer.subscriptions.find(plan => plan.id === openPlan.id)?.benefits}
                onChange={(benefit) => setBenefit('PLAN', benefit, openPlan.id)}
              />
              {additions('SUBSCRIPTION')}

              <PlanPricePaths plan={openPlan} settings={settings} share={openPlanRow?.share ?? 0} cohorts={pricingCohorts}
                pathHouseholds={openPlanRow ? {
                  monthly: openPlanRow.monthlyBillingSubscribers,
                  annual: openPlanRow.annualBillingSubscribers,
                } : undefined} />
              {openPlanRow && (
                <footer className="pr-plan-foot">
                  <span><b>{compactCount(openPlanRow.subscribers)}</b> households</span>
                  <span><b>{pct(openPlanRow.share, 0)}</b> of subscribers</span>
                  <span><b>{money(openPlanRow.monthly)}</b> a month</span>
                </footer>
              )}
            </div>
  ) : null;

  const forecastPanel = (
      <section className="pr-forecast" aria-label="Conditional opening forecast" aria-busy={forecastUpdating}>
        <div className="pr-forecast-head">
          <div><span className="sf-eyebrow">Opening audience</span><strong>{forecastUpdating ? '—' : compactCount(forecast.households)}</strong><small>households</small></div>
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
          <p className="sf-eyebrow">Opening markets</p>
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

  if (!selected) return <div className="pr-rebuild">{picker}</div>;
  const subscriptionCards = settings.streams.includes('subs') && (
        <section className="lw-block">
          <div className="pr-head">
            <p className="sf-eyebrow">Plans</p>
            <button
              type="button"
              className="sf-link"
              disabled={settings.plans.length >= 6}
              onClick={addPlan}
            >
              {settings.plans.length >= 6 ? 'Six-plan limit' : 'Add a plan'}
            </button>
          </div>

          <ul className="pr-plan-tabs" aria-label="Compare subscription plans">
            {settings.plans.map((plan) => {
              const row = forecast.plans.find((r) => r.plan.id === plan.id);
              const tone = planTone(plan);
              const colorId = tone === 'custom' ? stablePlanColor(plan) : undefined;
              const featureNames = PLAN_FEATURES
                .filter((feature) => feature.id !== 'early' && plan.featureIds.includes(feature.id))
                .map((feature) => feature.name);
              const benefit = offer.subscriptions.find(item => item.id === plan.id)?.benefits;
              if (benefit?.premiumAccess) featureNames.push(benefit.earlyAccessWeeks > 0
                ? `${benefit.earlyAccessWeeks} wk early access` : 'Premium access');
              if (plan.ads) featureNames.push('Ad-supported');
              const visibleFeatures = featureNames.slice(0, 2);
              const extraFeatures = Math.max(0, featureNames.length - visibleFeatures.length);
              const isOpen = openPlanId === plan.id;
              return (
                <li key={plan.id} className={isOpen ? 'is-open' : undefined}>
                  <button
                    type="button"
                    className={isOpen ? 'pr-plan-tab is-open' : 'pr-plan-tab'}
                    data-plan-tone={tone}
                    data-plan-color={colorId}
                    aria-expanded={isOpen}
                    aria-label={`Edit ${plan.name} plan`}
                    onClick={() => { setOpenPlanId(isOpen ? null : plan.id); setOpenOffer(null); }}
                  >
                    <span className="pr-plan-tab-name">{plan.name}</span>
                    <strong><Price value={plan.monthly} /><i>/mo</i></strong>
                    <span className="pr-plan-tab-features" title={featureNames.join(', ')}>
                      {visibleFeatures.length ? visibleFeatures.join(' · ') : 'Base access'}
                      {extraFeatures > 0 && ` +${extraFeatures}`}
                    </span>
                    <span className="pr-plan-tab-foot">
                      <b>{row ? pct(row.share, 0) : '—'}</b>
                      <i>{isOpen ? 'Close' : 'Edit'} {isOpen ? '⌃' : '⌄'}</i>
                    </span>
                  </button>
                  {isOpen && planEditor}
                </li>
              );
            })}
          </ul>


          {/* The two discounts are a pair — what you give away to get a
              household in — so they are one block of two rows. Each says the
              price it produces, because "15%" is not a thing anyone can picture
              and "$6.79 a month" is.

              Which plan each is on is the thing the screen used to leave
              unanswered: annual billing is on every tier, the way real services
              run it, and the introductory offer is aimed — at one plan or at
              all of them — because that is how a cheap way in is actually sold.
              Both read the canonical pricing economy, floor included, so the
              price here is the price the world model charges. */}
          <div className="pr-offers">
            <Offer
              label="Pay yearly"
              value={settings.annualDiscount}
              max={STREAMING_MAXIMUM_ANNUAL_DISCOUNT}
              step={5}
              from={entryPrice}
              to={dearestPrice > entryPrice ? dearestPrice : undefined}
              onChange={(v) => write({ annualDiscount: v })}
              onPreview={v => preview(v === null ? null : { annualDiscount: v })}
              aside={value => value > 0
                ? `on all ${settings.plans.length} ${settings.plans.length === 1 ? 'plan' : 'plans'}`
                : 'nothing off for paying up front'}
              offLabel="Full price"
            />
            <Offer
              label="First three months"
              value={settings.introOffer}
              max={STREAMING_MAXIMUM_INTRO_OFFER}
              step={10}
              from={introBasePrice}
              onChange={(v) => write({ introOffer: v })}
              onPreview={v => preview(v === null ? null : { introOffer: v })}
              aside={value => value > 0
                ? `${introPlan ? introPlan.name : 'every plan'}, then ${moneyPrecise(introBasePrice)}`
                : 'full price from day one'}
              offLabel="Full price"
            >
              {settings.plans.length > 1 && (
                <div className="pr-offer-aim" role="group" aria-label="Which plan the introductory offer is on">
                  <button
                    type="button"
                    className={settings.introOfferPlanId ? undefined : 'is-on'}
                    onClick={() => write({ introOfferPlanId: undefined })}
                  >
                    Every plan
                  </button>
                  {settings.plans.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      className={settings.introOfferPlanId === plan.id ? 'is-on' : undefined}
                      onClick={() => write({ introOfferPlanId: plan.id })}
                    >
                      {plan.name}
                    </button>
                  ))}
                </div>
              )}
            </Offer>
          </div>
        </section>
      );

  const adInterval = adIntervalForMinutesPerHour(settings.ads.minutesPerHour);
  const adCard = settings.streams.includes('ads') && (
        <PricingOfferCard title={offer.freeAdOffer ? 'Free with ads' : 'Ads on plans'} tone="standard"
          headline={offer.freeAdOffer ? <>$0<i> to watch</i></> : <>Ad-supported</>}
          summary={settings.ads.minutesPerHour === 0 ? 'No ad breaks · no ad receipts'
            : offer.freeAdOffer ? 'Free entry · funded by delivered ads' : 'Advertising on eligible membership plans'}
          detail={settings.ads.minutesPerHour === 0 ? 'No ads' : adInterval
            ? `An ad every ${adInterval} min` : `Custom saved load · ${settings.ads.minutesPerHour} ad min/hour`}
          open={openOffer === 'ADS'}
          onToggle={() => { setOpenOffer(openOffer === 'ADS' ? null : 'ADS'); setOpenPlanId(null); }}>
          <p className="pr-config-note">One free offer. Ads can also run on individual paid plans. More breaks create inventory but can push viewers away.</p>
          <AdCadenceControl minutesPerHour={settings.ads.minutesPerHour}
            estimatedCpm={worldForecast?.adRealizedCpm ?? null}
            estimatedFillRate={worldForecast?.adFillRate ?? null}
            onChange={minutesPerHour => write({ ads: { ...settings.ads, minutesPerHour } })} />
          {offer.freeAdOffer && <OfferBenefitEditor value={offer.freeAdOffer.benefits}
            onChange={(benefit) => setBenefit('FREE_AD', benefit)} />}
          <div className="pr-pass-list">
            <p className="sf-eyebrow">Optional ad-free passes</p>
            <p>Passes remove ads for their duration. They do not unlock paid titles.</p>
            <PassEditor label="1 hour ad-free" price={offer.adFreePasses.oneHourPrice}
              onChange={(price) => writeOffer({ kind: 'PASS', duration: 'ONE_HOUR', price })} />
            <PassEditor label="24 hours ad-free" price={offer.adFreePasses.dayPrice}
              onChange={(price) => writeOffer({ kind: 'PASS', duration: 'DAY', price })} />
          </div>
          {additions('ADS')}
        </PricingOfferCard>
      );

  const storeCard = settings.streams.includes('rentals') && (
        <PricingOfferCard title="Rent or buy" tone="premiere"
          headline={<><Price value={settings.rentals.rent} /><i> / rental</i></>}
          summary={`${moneyPrecise(settings.rentals.buy)} to buy · same price for every eligible title`}
          detail="Free to browse" open={openOffer === 'STORE'}
          onToggle={() => { setOpenOffer(openOffer === 'STORE' ? null : 'STORE'); setOpenPlanId(null); }}>
          <p className="pr-config-note">Browsing is free. One rent price and one purchase price apply to every eligible title; rights may still restrict a title or country.</p>
          <Dial label="Rent a film" value={settings.rentals.rent} max={12} step={0.01} prefix="$"
            note="Charged only when a viewer rents an eligible title." onChange={(v) => write({ rentals: { ...settings.rentals, rent: v } })} />
          <Dial label="Own it" value={settings.rentals.buy} max={30} step={0.01} prefix="$"
            note="Purchase requires fulfillment rights." onChange={(v) => write({ rentals: { ...settings.rentals, buy: v } })} />
          <Dial label="Weeks before the catalogue" value={settings.rentals.windowWeeks} max={16} step={1} suffix=" wk"
            note="The rental window cannot outlast a title's rights."
            onChange={(v) => write({ rentals: { ...settings.rentals, windowWeeks: v } })} />
          <div className="pr-store-scope">
            <p className="sf-eyebrow">Who can rent or buy?</p>
            <div className="pr-feature-segments" role="group" aria-label="Store buyer access">
              <button type="button" aria-pressed={offer.storeOffer?.eligibility.kind !== 'MEMBERSHIP_PLANS'}
                onClick={() => writeOffer({ kind: 'STORE_ELIGIBILITY', scope: 'PUBLIC', planIds: [] })}>Everyone</button>
              <button type="button" aria-pressed={offer.storeOffer?.eligibility.kind === 'MEMBERSHIP_PLANS'}
                onClick={() => writeOffer({ kind: 'STORE_ELIGIBILITY', scope: 'MEMBERSHIP_PLANS',
                  planIds: offer.storeOffer?.eligibility.planIds || [] })}>Selected members</button>
            </div>
            {offer.storeOffer?.eligibility.kind === 'MEMBERSHIP_PLANS' && <>
              <p>Only active members of the selected plans can make a new rental or purchase. Existing purchases and unexpired rentals remain available.</p>
              <div className="pr-store-plan-list" role="group" aria-label="Plans permitted to rent or buy">
                {settings.streams.includes('subs') ? settings.plans.filter(plan => plan.monthly > 0).map(plan => {
                  const selectedPlanIds = offer.storeOffer!.eligibility.planIds;
                  const enabled = selectedPlanIds.includes(plan.id);
                  return <button type="button" key={plan.id} aria-pressed={enabled}
                    onClick={() => writeOffer({ kind: 'STORE_ELIGIBILITY', scope: 'MEMBERSHIP_PLANS',
                      planIds: enabled ? selectedPlanIds.filter(id => id !== plan.id) : [...selectedPlanIds, plan.id] })}>
                    <span>{plan.name}</span><b>{enabled ? '✓ Eligible' : 'Not eligible'}</b>
                  </button>;
                }) : <p>Enable membership plans in this offer to select who can buy.</p>}
              </div>
              {!offer.storeOffer.eligibility.planIds.length && <p className="pr-scope-warning">No plan is eligible: browsing stays open, but new rentals and purchases will be zero.</p>}
            </>}
          </div>
          {offer.storeOffer && <OfferBenefitEditor value={offer.storeOffer.benefits}
            onChange={(benefit) => setBenefit('STORE', benefit)} />}
          {additions('STORE')}
        </PricingOfferCard>
      );
  return <div className="pr-rebuild">
      {picker}
      {offer.coreModel === 'ADVERTISING' && adCard}
      {offer.coreModel === 'STORE' && storeCard}
      {subscriptionCards}
      {offer.coreModel !== 'ADVERTISING' && adCard}
      {offer.coreModel !== 'STORE' && storeCard}
      {forecastPanel}

      {settings.streams.some(stream => ['premium', 'daypass', 'sponsor', 'metered', 'patron'].includes(stream)) &&
        <p className="pr-legacy-note">Legacy commercial settings are retained in this save but are not new launch offers. Existing settled income is unchanged.</p>}

      <p className="lw-autosave-state is-current" role="status">
        <i aria-hidden="true" />
        Autosaved as you edit
      </p>
    </div>;
}

export function AdCadenceControl({ minutesPerHour, estimatedCpm, estimatedFillRate, onChange }: {
  minutesPerHour: number;
  estimatedCpm: number | null;
  estimatedFillRate: number | null;
  onChange: (minutesPerHour: number) => void;
}) {
  const interval = adIntervalForMinutesPerHour(minutesPerHour);
  const isCustom = minutesPerHour > 0 && interval === null;
  const opportunities = Math.round(minutesPerHour * 2 * 100) / 100;
  return <div className="pr-ad-cadence">
    <p className="sf-eyebrow">Show an ad every…</p>
    <div className="pr-ad-cadence-options" role="group" aria-label="Show an ad every">
      <button type="button" aria-pressed={minutesPerHour === 0} onClick={() => onChange(0)}>No ads</button>
      {STREAMING_AD_INTERVAL_PRESETS.map(minutes => <button type="button" key={minutes}
        aria-pressed={interval === minutes} onClick={() => onChange(adMinutesPerHourForInterval(minutes))}>
        {minutes} minutes</button>)}
    </div>
    <div className="pr-ad-cadence-reading" aria-live="polite">
      <b>{isCustom ? 'Custom saved load' : minutesPerHour === 0 ? 'No ads' : `Every ${interval} minutes`}</b>
      <span>{minutesPerHour === 0 ? '0 opportunities · 0 ad min per eligible hour'
        : `${opportunities} opportunities · ${minutesPerHour} ad min per eligible hour`}</span>
    </div>
    {isCustom && <p className="pr-config-note">This saved load is kept exactly. Choose a preset only if you want to change it.</p>}
    {minutesPerHour > 6 && <p className="pr-ad-cadence-warning">Heavy ad load can reduce viewing and retention.</p>}
    <div className="pr-ad-outcome"><span>Estimated CPM <b>{estimatedCpm == null ? '—' : moneyPrecise(estimatedCpm)}</b></span>
      <span>Estimated fill <b>{estimatedFillRate == null ? '—' : pct(estimatedFillRate * 100, 0)}</b></span></div>
    <details className="pr-ad-market-explainer"><summary>How ad revenue is estimated</summary>
      <p>These are ad opportunities, not guaranteed impressions. Delivered viewing creates inventory; country advertiser demand, rival inventory, audience quality and brand suitability determine filled ads and market CPM. Ad-free passes remove covered breaks. No demand or no eligible viewing means no ad revenue.</p>
    </details>
  </div>;
}

function OfferBenefitEditor({ value, onChange }: {
  value?: StreamingCommercialOfferBenefit;
  onChange: (benefit: StreamingCommercialOfferBenefit) => void;
}) {
  const benefit = value || { premiumAccess: false, earlyAccessWeeks: 0 };
  return <div className="pr-benefit-editor">
    <label className="pr-benefit-toggle"><input type="checkbox" checked={benefit.premiumAccess}
      onChange={event => onChange({ premiumAccess: event.target.checked,
        earlyAccessWeeks: event.target.checked ? Math.max(1, benefit.earlyAccessWeeks) : 0 })} />
      <span>Premium access</span></label>
    {benefit.premiumAccess && <div className="pr-early-setting"><span>Early access <small>weeks before general release</small></span>
      <div role="group" aria-label="Early access timing">
        {[0, 1, 2, 3, 4].map(weeks => <button key={weeks} type="button" aria-pressed={benefit.earlyAccessWeeks === weeks}
          aria-label={weeks === 0 ? 'Opening week' : `${weeks} week${weeks === 1 ? '' : 's'} early`}
          onClick={() => onChange({ ...benefit, earlyAccessWeeks: weeks })}>{weeks === 0 ? 'Now' : weeks}</button>)}
      </div>
    </div>}
    <small>Eligible titles only, once delivered and licensed in that country.</small>
  </div>;
}

function PassEditor({ label, price, onChange }: { label: string; price: number | null; onChange: (price: number | null) => void }) {
  const [draftPrice, setDraftPrice] = useState(price === null ? '' : String(price));
  useEffect(() => setDraftPrice(price === null ? '' : String(price)), [price]);
  const commit = () => {
    if (price === null) return;
    const value = Number(draftPrice);
    const next = Number.isFinite(value) && value > 0 ? Math.max(.99, Math.min(100, Math.round(value * 100) / 100)) : price;
    setDraftPrice(String(next));
    onChange(next);
  };
  return <div className="pr-pass-row">
    <label><input type="checkbox" checked={price !== null} onChange={event => onChange(event.target.checked ? 1.99 : null)} />{label}</label>
    {price !== null && <label className="pr-pass-price">$
      <input type="number" inputMode="decimal" min="0.99" max="100" step="0.01" value={draftPrice}
        aria-label={`${label} price`}
        onChange={event => setDraftPrice(event.target.value)} onBlur={commit}
        onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} />
    </label>}
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
  const openingBlend = effectiveMonthlyStreamingPlanPrice(
    plan.monthly, settings.annualDiscount, settings.introOffer, 0, introApplies,
  );
  const totalBuyers = (pathHouseholds?.monthly || 0) + (pathHouseholds?.annual || 0);
  const monthlyFirstYear = introMonthly * 3 + plan.monthly * 9;
  const annualFirstYear = annualMonthly * 12;
  const firstYear = totalBuyers > 0
    ? Math.round((monthlyFirstYear * pathHouseholds!.monthly + annualFirstYear * pathHouseholds!.annual) / totalBuyers * 100) / 100
    : firstYearStreamingPlanRevenuePerSubscriber(plan.monthly, settings.annualDiscount, settings.introOffer, introApplies);
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
        <div><dt>Opening blend</dt><dd>{moneyPrecise(openingBlend)}/mo <small>33% yearly, 67% monthly reference average, not a charged price</small></dd></div>
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

/* $13.99 is not $14. `money` rounds to whole dollars under a thousand, so the
   plan card was printing a price the player never typed — and charm pricing is
   the whole reason they typed the cents. The cents stay, smaller, so $12.99 and
   $13 are visibly different things. */
function Price({ value }: { value: number }) {
  const text = moneyPrecise(value);
  const dot = text.indexOf('.');
  if (dot === -1) return <>{text}</>;
  return <>{text.slice(0, dot)}<span className="pr-cents">{text.slice(dot)}</span></>;
}

function useCommittedRange(value: number, onCommit: (value: number) => void, onPreview?: (value: number | null) => void) {
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;
  const previewRef = useRef(onPreview);
  previewRef.current = onPreview;
  const controllerRef = useRef<ReturnType<typeof createRangeDraft> | null>(null);
  if (!controllerRef.current) controllerRef.current = createRangeDraft(value,
    next => commitRef.current(next), next => previewRef.current?.(next));
  const controller = controllerRef.current;
  const [draftValue, setDraftValue] = useState(value);
  useEffect(() => {
    controller.sync(value);
    setDraftValue(controller.value);
  }, [controller, value]);
  useEffect(() => () => controller.dispose(), [controller]);
  const change = (next: number) => {
    controller.change(next);
    setDraftValue(controller.value);
  };
  const finish = (next?: number) => {
    controller.finish(next);
    setDraftValue(controller.value);
    previewRef.current?.(null);
  };
  return {
    draftValue,
    rangeEvents: {
      onChange: (event: ChangeEvent<HTMLInputElement>) => change(Number(event.currentTarget.value)),
      onPointerUp: (event: PointerEvent<HTMLInputElement>) => finish(Number(event.currentTarget.value)),
      onPointerCancel: (event: PointerEvent<HTMLInputElement>) => finish(Number(event.currentTarget.value)),
      onTouchEnd: (event: TouchEvent<HTMLInputElement>) => finish(Number(event.currentTarget.value)),
      onKeyUp: (event: KeyboardEvent<HTMLInputElement>) => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) finish(Number(event.currentTarget.value));
      },
      onBlur: (event: FocusEvent<HTMLInputElement>) => finish(Number(event.currentTarget.value)),
    },
  };
}

/* A discount, told as the price it produces. The percentage is a chip beside
   the name; the figure is what a household pays because of it. */
function Offer({ label, value, max, step, from, to, aside, offLabel, onChange, onPreview, children }: {
  label: string; value: number; max: number; step: number;
  /** Undiscounted prices; the visible figures follow the local slider draft. */
  from: number; to?: number;
  aside: (value: number) => string; offLabel: string;
  onChange: (value: number) => void;
  onPreview?: (value: number | null) => void;
  children?: ReactNode;
}) {
  const { draftValue, rangeEvents } = useCommittedRange(value, onChange, onPreview);
  const on = draftValue > 0;
  const previewFrom = streamingDiscountedMonthly(from, draftValue, max);
  const previewTo = to === undefined ? undefined : streamingDiscountedMonthly(to, draftValue, max);
  const floored = on && from > STREAMING_MINIMUM_PAID_PLAN_PRICE && previewFrom <= STREAMING_MINIMUM_PAID_PLAN_PRICE;
  return (
    <div className={on ? 'pr-offer is-on' : 'pr-offer'}>
      {/* One line: what it is, how deep it goes, and the price it produces. */}
      <div className="pr-offer-top">
        <em>{label}</em>
        <span className="pr-offer-cut">{on ? `−${draftValue}%` : 'Off'}</span>
        <b>
          <Price value={previewFrom} />
          {previewTo !== undefined && previewTo !== previewFrom && <>–<Price value={previewTo} /></>}
        </b>
        <u className={floored ? 'is-floored' : undefined}>
          {floored ? `${moneyPrecise(STREAMING_MINIMUM_PAID_PLAN_PRICE)} is the floor` : aside(draftValue)}
        </u>
      </div>
      <input
        className="sf-slider pr-offer-slider"
        style={{
          ['--sf-fill' as string]: `${max > 0 ? Math.round((draftValue / max) * 100) : 0}%`,
          ['--pr-steps' as string]: `${max / step}`,
        }}
        type="range"
        min={0}
        max={max}
        step={step}
        value={draftValue}
        {...rangeEvents}
        aria-label={label}
        aria-valuetext={on ? `${draftValue}% off, ${moneyPrecise(previewFrom)} a month` : offLabel}
      />
      {children}
    </div>
  );
}

function Dial({ label, value, max, step, note, prefix, suffix, onChange }: {
  label: string; value: number; max: number; step: number; note: string;
  prefix?: string; suffix?: string; onChange: (value: number) => void;
}) {
  const { draftValue, rangeEvents } = useCommittedRange(value, onChange);
  return (
    <div className="pr-dial">
      <div className="pr-dial-top">
        <em>{label}</em>
        <b>{prefix ?? ''}{draftValue}{suffix ?? ''}</b>
      </div>
      {/* The track used to be a brand-to-transparent wash across its whole
          width, so a slider at 0% still read as a full red bar. `--sf-fill` is
          the real value, and the track paints two solid blocks at that exact
          stop — a fill, not a fade. */}
      <input
        className="sf-slider"
        style={{ ['--sf-fill' as string]: `${max > 0 ? Math.round((draftValue / max) * 100) : 0}%` }}
        type="range"
        min={0}
        max={max}
        step={step}
        value={draftValue}
        {...rangeEvents}
        aria-label={label}
      />
      <s>{note}</s>
    </div>
  );
}
