/* ============================================================================
   5 · Pricing — how the service makes money at all.

   Subscriptions are an option here, not the premise. A service can run on
   advertising alone, on rentals alone, on any mix of the eight streams — two of
   which nobody has shipped, because a game about running a studio should be
   allowed to be ahead of the industry it copies.

   The forecast is pinned to the top of the step and answers every change
   immediately: how many households, on what, and what it earns. Nobody should
   have to scroll to find out what moving a price did.
   ========================================================================== */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  CUSTOM_PLAN_COLORS, PLAN_FEATURES, REVENUE_STREAMS, forecastPricing,
  type CustomPlanColorId, type Plan, type PricingCohortSignal, type PricingSettings, type StreamId,
} from '../../finance/launch';
import type { StepProps } from './LaunchWizard';
import { compactCount, money, moneyPrecise, pct } from '../../finance/format';
import { ResearchLockMark } from './ResearchLockMark';
import {
  STREAMING_MAXIMUM_ANNUAL_DISCOUNT,
  STREAMING_MAXIMUM_INTRO_OFFER,
  STREAMING_MAXIMUM_PLAN_PRICE,
  STREAMING_MINIMUM_PAID_PLAN_PRICE,
  effectiveMonthlyStreamingPlanPrice,
  firstYearStreamingPlanRevenuePerSubscriber,
  normalizeStreamingPlanPrice,
  streamingDiscountedMonthly,
  streamingIntroOfferAppliesTo,
} from '../../../../services/streamingPricingEconomy';

const GROUPS = [
  { id: 'quality' as const, label: 'Picture & sound' },
  { id: 'access' as const, label: 'Access' },
  { id: 'extras' as const, label: 'Extras' },
];

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
}: {
  value: number;
  minimum: number;
  maximum: number;
  onCommit: (value: number) => void;
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
          onChange={(event) => setDraftValue(event.target.value)}
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

export function StepPricing({ data, draft, patch, chosen, handlers }: StepProps) {
  const settings: PricingSettings = draft.pricing ?? data.pricing;
  const addressable = useMemo(() => chosen.reduce((sum, c) => sum + c.addressableHouseholds, 0), [chosen]);
  const pricingCohorts = useMemo(() => chosen.flatMap(country => country.pricingCohorts || []), [chosen]);
  const worldForecast = useMemo(
    () => handlers.onForecastPricing?.(settings, chosen.map(country => country.id)) ?? null,
    [handlers.onForecastPricing, settings, chosen],
  );
  const forecast = useMemo(
    () => forecastPricing(settings, addressable, data.market, pricingCohorts, worldForecast),
    [settings, addressable, data.market, pricingCohorts, worldForecast],
  );

  /* What each discount is worked out against. Annual billing is on every plan,
     so it reads as the range from the cheapest to the dearest; the introductory
     offer is aimed, so it reads against the plan it is aimed at. */
  const entryPrice = forecast.entryPrice;
  const dearestPrice = settings.plans.length ? Math.max(...settings.plans.map((plan) => plan.monthly)) : entryPrice;
  const introPlan = settings.introOfferPlanId
    ? settings.plans.find((plan) => plan.id === settings.introOfferPlanId)
    : undefined;
  const introBasePrice = introPlan ? introPlan.monthly : entryPrice;
  /* A discount deep enough to hit the least the game lets anyone charge. Worth
     saying out loud: past it the slider costs margin and buys nothing. */
  const atFloor = (listPrice: number, percent: number, maximum: number): boolean => (
    listPrice > STREAMING_MINIMUM_PAID_PLAN_PRICE
    && streamingDiscountedMonthly(listPrice, percent, maximum) <= STREAMING_MINIMUM_PAID_PLAN_PRICE
  );

  const write = (next: Partial<PricingSettings>) => patch({ pricing: { ...settings, ...next } });
  const writePlan = (id: string, next: Partial<Plan>) =>
    write({ plans: settings.plans.map((p) => (p.id === id ? { ...p, ...next } : p)) });
  const toggleStream = (id: StreamId) => {
    const removing = settings.streams.includes(id);
    write({
      streams: removing
        ? settings.streams.filter((s) => s !== id)
        : [...settings.streams, id],
      ...(id === 'ads' && removing ? {
        plans: settings.plans.map(plan => ({
          ...plan,
          ads: false,
          monthly: normalizeStreamingPlanPrice(plan.monthly, false),
        })),
      } : {}),
    });
  };

  const top = [...forecast.streams].sort((a, b) => b.monthly - a.monthly)[0];
  const [openPlanId, setOpenPlanId] = useState<string | null>(null);
  const openPlanIndex = settings.plans.findIndex((plan) => plan.id === openPlanId);
  const openPlan = openPlanIndex >= 0 ? settings.plans[openPlanIndex] : null;
  const openPlanRow = openPlan ? forecast.plans.find((row) => row.plan.id === openPlan.id) : null;


  const addPlan = () => {
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
  };

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
                {GROUPS.map((group) => (
                  <div key={group.id} className="pr-featgroup">
                    <em>{group.label}</em>
                    <div className="pr-chips">
                      {PLAN_FEATURES.filter((feature) => feature.group === group.id).map((feature) => {
                        const has = openPlan.featureIds.includes(feature.id);
                        const lock = data.capabilityLocks[`feature:${feature.id}`];
                        return (
                          <button
                            key={feature.id}
                            type="button"
                            disabled={Boolean(lock)}
                            title={lock || undefined}
                            aria-label={lock ? `${feature.name} locked: ${lock}` : feature.name}
                            className={`${has ? 'pr-chip is-on' : 'pr-chip'}${lock ? ' is-locked' : ''}`}
                            onClick={() => writePlan(openPlan.id, {
                              featureIds: has
                                ? openPlan.featureIds.filter((id) => id !== feature.id)
                                : [...openPlan.featureIds, feature.id],
                            })}
                          >
                            <span className="pr-chip-name">{feature.name}</span>
                            {lock && <ResearchLockMark compact />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {settings.streams.includes('ads') && (
                  <div className="pr-featgroup">
                    <em>Adverts</em>
                    <div className="pr-chips">
                      <button
                        type="button"
                        className={openPlan.ads ? 'pr-chip is-ads is-on' : 'pr-chip'}
                        onClick={() => writePlan(openPlan.id, {
                          ads: !openPlan.ads,
                          monthly: normalizeStreamingPlanPrice(openPlan.monthly, !openPlan.ads),
                        })}
                      >
                        {openPlan.ads ? 'This plan carries adverts' : 'No adverts on this plan'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

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

  return (
    <>

      {/* --- 1 · which streams are running ---------------------------------- */}
      <section className="lw-block">
        <p className="sf-eyebrow lw-block-head">How the service earns</p>
        <ul className="pr-picks">
          {REVENUE_STREAMS.map((stream) => {
            const on = settings.streams.includes(stream.id);
            const row = forecast.streams.find((s) => s.id === stream.id);
            const lock = data.capabilityLocks[`stream:${stream.id}`];
            return (
              <li key={stream.id}>
                <button type="button" disabled={Boolean(lock)} aria-label={lock ? `${stream.name} locked: ${lock}` : stream.name} className={`${on ? 'pr-pick is-on' : 'pr-pick'}${lock ? ' is-locked' : ''}`} onClick={() => toggleStream(stream.id)}>
                  <span className="pr-pick-top">
                    <b>{stream.name}</b>
                    {row ? <s>{money(row.monthly)}</s> : <s className="is-off">off</s>}
                  </span>
                  <em>{stream.line}</em>
                  {lock
                    ? <ResearchLockMark reason={lock} />
                    : <span className="pr-pick-real">{stream.real}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* --- 2 · configure whatever is running -------------------------------- */}
      {settings.streams.includes('subs') && (
        <section className="lw-block">
          <div className="pr-head">
            <p className="sf-eyebrow">Plans</p>
            <button
              type="button"
              className="sf-link"
              onClick={addPlan}
            >
              Add a plan
            </button>
          </div>

          <ul className="pr-plan-tabs" aria-label="Compare subscription plans">
            {settings.plans.map((plan) => {
              const row = forecast.plans.find((r) => r.plan.id === plan.id);
              const tone = planTone(plan);
              const colorId = tone === 'custom' ? stablePlanColor(plan) : undefined;
              const featureNames = PLAN_FEATURES
                .filter((feature) => plan.featureIds.includes(feature.id))
                .map((feature) => feature.name);
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
                    onClick={() => setOpenPlanId(isOpen ? null : plan.id)}
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
              from={streamingDiscountedMonthly(entryPrice, settings.annualDiscount, STREAMING_MAXIMUM_ANNUAL_DISCOUNT)}
              to={dearestPrice > entryPrice
                ? streamingDiscountedMonthly(dearestPrice, settings.annualDiscount, STREAMING_MAXIMUM_ANNUAL_DISCOUNT)
                : undefined}
              onChange={(v) => write({ annualDiscount: v })}
              aside={settings.annualDiscount > 0
                ? `on all ${settings.plans.length} ${settings.plans.length === 1 ? 'plan' : 'plans'}`
                : 'nothing off for paying up front'}
              floored={settings.annualDiscount > 0 && atFloor(entryPrice, settings.annualDiscount, STREAMING_MAXIMUM_ANNUAL_DISCOUNT)}
              offLabel="Full price"
            />
            <Offer
              label="First three months"
              value={settings.introOffer}
              max={STREAMING_MAXIMUM_INTRO_OFFER}
              step={10}
              from={streamingDiscountedMonthly(introBasePrice, settings.introOffer, STREAMING_MAXIMUM_INTRO_OFFER)}
              onChange={(v) => write({ introOffer: v })}
              aside={settings.introOffer > 0
                ? `${introPlan ? introPlan.name : 'every plan'}, then ${moneyPrecise(introBasePrice)}`
                : 'full price from day one'}
              floored={settings.introOffer > 0 && atFloor(introBasePrice, settings.introOffer, STREAMING_MAXIMUM_INTRO_OFFER)}
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
      )}

      {settings.streams.includes('ads') && (
        <Config title="Advertising">
          <Dial label="Minutes an hour" value={settings.ads.minutesPerHour} max={12} step={1} suffix=" min"
            note={settings.ads.minutesPerHour > 6 ? 'Above six minutes households start leaving' : 'Broadcast television runs 14 minutes an hour'}
            onChange={(v) => write({ ads: { ...settings.ads, minutesPerHour: v } })} />
          <Dial label="What advertisers pay" value={settings.ads.cpm} max={40} step={1} suffix=" CPM"
            note="Streaming CPMs run $15–$35 depending on the audience"
            onChange={(v) => write({ ads: { ...settings.ads, cpm: v } })} />
        </Config>
      )}

      {settings.streams.includes('rentals') && (
        <Config title="Rentals & purchases">
          <Dial label="Rent a film" value={settings.rentals.rent} max={12} step={1} prefix="$"
            note="Apple and Amazon sit at $5.99" onChange={(v) => write({ rentals: { ...settings.rentals, rent: v } })} />
          <Dial label="Own it" value={settings.rentals.buy} max={30} step={1} prefix="$"
            note="$19.99 is the standard" onChange={(v) => write({ rentals: { ...settings.rentals, buy: v } })} />
          <Dial label="Weeks before the catalogue" value={settings.rentals.windowWeeks} max={16} step={1} suffix=" wk"
            note="A longer window earns more and annoys subscribers"
            onChange={(v) => write({ rentals: { ...settings.rentals, windowWeeks: v } })} />
        </Config>
      )}

      {settings.streams.includes('premium') && (
        <Config title="Premium access">
          <Dial label="Price of a premiere" value={settings.premium.price} max={45} step={1} prefix="$"
            note="Disney charged $29.99 and made it work twice"
            onChange={(v) => write({ premium: { price: v } })} />
        </Config>
      )}

      {settings.streams.includes('daypass') && (
        <Config title="Day passes">
          <Dial label="Twenty-four hours" value={settings.daypass.price} max={20} step={1} prefix="$"
            note="Cheap enough to be an impulse, dear enough to hurt the monthly plan"
            onChange={(v) => write({ daypass: { price: v } })} />
        </Config>
      )}

      {settings.streams.includes('sponsor') && (
        <Config title="Sponsored titles">
          <Dial label="Titles with a sponsor" value={settings.sponsor.titles} max={12} step={1} suffix=" titles"
            note="Every sponsored title carries a brand in its billing"
            onChange={(v) => write({ sponsor: { ...settings.sponsor, titles: v } })} />
          <Dial label="Paid per title" value={Math.round(settings.sponsor.perTitle / 1_000_000)} max={15} step={1} prefix="$" suffix="M"
            note="Presented-by deals run $2M–$12M"
            onChange={(v) => write({ sponsor: { ...settings.sponsor, perTitle: v * 1_000_000 } })} />
        </Config>
      )}

      {settings.streams.includes('metered') && (
        <Config title="Pay by the hour" experimental>
          <Dial label="Price an hour" value={settings.metered.perHour} max={4} step={1} prefix="$"
            note="No plan, no commitment. Light viewers love it; heavy ones cost you nothing to keep."
            onChange={(v) => write({ metered: { perHour: v } })} />
        </Config>
      )}

      {settings.streams.includes('patron') && (
        <Config title="Fund the show" experimental>
          <Dial label="A month, per patron" value={settings.patron.monthly} max={30} step={1} prefix="$"
            note="Named in the credits of what they funded. Small money, loud audience."
            onChange={(v) => write({ patron: { monthly: v } })} />
        </Config>
      )}

      <p className="lw-autosave-state is-current" role="status">
        <i aria-hidden="true" />
        Autosaved as you edit
      </p>
    </>
  );
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

function Config({ title, experimental, children }: { title: string; experimental?: boolean; children: ReactNode }) {
  return (
    <section className={experimental ? 'pr-config is-new' : 'pr-config'}>
      <header>
        <b>{title}</b>
        {experimental && <span>Nobody runs this yet</span>}
      </header>
      <div className="pr-dials">{children}</div>
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

/* A discount, told as the price it produces. The percentage is a chip beside
   the name; the figure is what a household pays because of it. */
function Offer({ label, value, max, step, from, to, aside, floored, offLabel, onChange, children }: {
  label: string; value: number; max: number; step: number;
  /** The price this discount produces, and the dearest one when it is on more
      than one plan. */
  from: number; to?: number;
  aside: string; floored?: boolean; offLabel: string;
  onChange: (value: number) => void;
  children?: ReactNode;
}) {
  const on = value > 0;
  return (
    <div className={on ? 'pr-offer is-on' : 'pr-offer'}>
      {/* One line: what it is, how deep it goes, and the price it produces. */}
      <div className="pr-offer-top">
        <em>{label}</em>
        <span className="pr-offer-cut">{on ? `−${value}%` : 'Off'}</span>
        <b>
          <Price value={from} />
          {to !== undefined && to !== from && <>–<Price value={to} /></>}
        </b>
        <u className={floored ? 'is-floored' : undefined}>
          {floored ? `${moneyPrecise(STREAMING_MINIMUM_PAID_PLAN_PRICE)} is the floor` : aside}
        </u>
      </div>
      <input
        className="sf-slider pr-offer-slider"
        style={{
          ['--sf-fill' as string]: `${max > 0 ? Math.round((value / max) * 100) : 0}%`,
          ['--pr-steps' as string]: `${max / step}`,
        }}
        type="range"
        min={0}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        aria-valuetext={on ? `${value}% off, ${moneyPrecise(from)} a month` : offLabel}
      />
      {children}
    </div>
  );
}

function Dial({ label, value, max, step, note, prefix, suffix, onChange }: {
  label: string; value: number; max: number; step: number; note: string;
  prefix?: string; suffix?: string; onChange: (value: number) => void;
}) {
  return (
    <div className="pr-dial">
      <div className="pr-dial-top">
        <em>{label}</em>
        <b>{prefix ?? ''}{value}{suffix ?? ''}</b>
      </div>
      {/* The track used to be a brand-to-transparent wash across its whole
          width, so a slider at 0% still read as a full red bar. `--sf-fill` is
          the real value, and the track paints two solid blocks at that exact
          stop — a fill, not a fade. */}
      <input
        className="sf-slider"
        style={{ ['--sf-fill' as string]: `${max > 0 ? Math.round((value / max) * 100) : 0}%` }}
        type="range"
        min={0}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
      <s>{note}</s>
    </div>
  );
}
