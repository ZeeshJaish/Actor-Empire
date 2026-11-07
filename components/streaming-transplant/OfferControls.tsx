/**
 * The offer's three controls under the plans (#107; plan §18.4 and §18.3's "one editor for each thing"). Zeesh, 2026-11-01:
 * "I LIKE THE concept of attached layut but rest all of the stuffs …" and "थोड़ा गेम वाला भी फील आना चाहिए".
 * Each is a cover in its offer's colour (#104) that shows what it does now, with its editor attached under it:
 *   AD BREAKS (Free with ads' violet)  the one cadence editor: a dial from viewers kept to money earned, its effect
 *                                      as two meters; the ad-free passes; the free tier's early access
 *   STORE (Rent or buy's amber)        rent and buy prices to the cent, the top edition's, the rental length, who can
 *                                      buy, and the store's early access
 *   DEALS (Subscription's sky)         Pay yearly and First three months as the prices they make, and the plan the
 *                                      first three months are on
 * The wizard's Pricing step and the Offer tab both use them; every change is a pure pricing function handed back whole.
 */
import React, { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import css from './presentation/screens/Pricing/OfferControls.module.css';
import { cx } from './presentation/cx';
import { STREAMING_OFFER_PERSONALITY, StreamingOfferEmblem, type StreamingOfferKind } from './offerPersonality';
import type { OwnedStreamingPricingConfiguration, OwnedStreamingTechTreeState, StreamingCommercialOfferBenefit } from '../../types';
import {
  configureStreamingPricingOffer, projectStreamingCommercialOffers, streamingStoreSellsToNobody, type StreamingPricingOfferAction,
} from '../../services/streamingCommercialOffers';
import {
  STREAMING_AD_INTERVAL_PRESETS, STREAMING_MAXIMUM_ANNUAL_DISCOUNT, STREAMING_MAXIMUM_INTRO_OFFER, STREAMING_MINIMUM_PAID_PLAN_PRICE,
  STREAMING_STORE_BUY_MAX, STREAMING_STORE_RENT_MAX, STREAMING_STORE_TOP_BUY_MAX, STREAMING_STORE_TOP_RENT_MAX,
  adIntervalForMinutesPerHour, adMinutesPerHourForInterval, normalizeStreamingPricingConfiguration, streamingAnnualBillingShare,
  streamingDiscountedMonthly,
} from '../../services/streamingPricingEconomy';
import { setStreamingStoreTerms, setStreamingStoreTopEdition } from '../../services/streamingPlanBuilder';
import { resolveStreamingStoreEditions } from '../../services/streamingStoreEditions';
import { getStreamingTechDefinition } from '../../services/streamingTechTreeCatalogue';
import { createRangeDraft } from '../studio-finance/components/launch/rangeDraft';

export type OfferControlId = 'ADS' | 'STORE' | 'DEALS';

const money = (value: number) => (value <= 0 ? 'Free' : `$${value.toFixed(2)}`);
const percent = (value: number) => `${Math.round(value)}%`;
const tint = (offer: StreamingOfferKind) => ({ ['--c' as string]: STREAMING_OFFER_PERSONALITY[offer].colour }) as React.CSSProperties;
/* the cadence dial runs from few breaks to many */
const CADENCE = [...STREAMING_AD_INTERVAL_PRESETS].sort((left, right) => right - left);
const MOST_AD_MINUTES = adMinutesPerHourForInterval(Math.min(...STREAMING_AD_INTERVAL_PRESETS));

/** A slider that commits once, when let go, and previews while it moves (the wizard's forecast follows it). */
const useCommittedRange = (value: number, onCommit: (value: number) => void, onPreview?: (value: number | null) => void) => {
  const commit = useRef(onCommit);
  commit.current = onCommit;
  const preview = useRef(onPreview);
  preview.current = onPreview;
  const controller = useRef<ReturnType<typeof createRangeDraft> | null>(null);
  if (!controller.current) controller.current = createRangeDraft(value, next => commit.current(next), next => preview.current?.(next));
  const range = controller.current;
  const [draft, setDraft] = useState(value);
  useEffect(() => { range.sync(value); setDraft(range.value); }, [range, value]);
  useEffect(() => { range.revive(); return () => range.dispose(); }, [range]);
  const finish = (next: number) => { range.finish(next); setDraft(range.value); preview.current?.(null); };
  return {
    draft,
    events: {
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => { range.change(Number(event.currentTarget.value)); setDraft(range.value); },
      onPointerUp: (event: React.PointerEvent<HTMLInputElement>) => finish(Number(event.currentTarget.value)),
      onPointerCancel: (event: React.PointerEvent<HTMLInputElement>) => finish(Number(event.currentTarget.value)),
      onTouchEnd: (event: React.TouchEvent<HTMLInputElement>) => finish(Number(event.currentTarget.value)),
      onKeyUp: (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) finish(Number(event.currentTarget.value));
      },
      onBlur: (event: React.FocusEvent<HTMLInputElement>) => finish(Number(event.currentTarget.value)),
    },
  };
};

/** A price to the cent: − and + by a step, or typed. `name` is what it is called aloud when the label is shorter. */
const PriceStepper: React.FC<{ label: string; name?: string; value: number; step: number; min: number; max: number; onChange: (value: number) => void }> = ({
  label, name = label, value, step, min, max, onChange,
}) => {
  const [text, setText] = useState(value.toFixed(2));
  useEffect(() => setText(value.toFixed(2)), [value]);
  const clamp = (next: number) => Math.round(Math.min(max, Math.max(min, next)) * 100) / 100;
  const commit = () => {
    const typed = Number(text);
    if (Number.isFinite(typed) && text.trim()) onChange(clamp(typed)); else setText(value.toFixed(2));
  };
  return (
    <div className={css.stepper} role="group" aria-label={name}>
      <span>{label}</span>
      <button type="button" disabled={value <= min} onClick={() => onChange(clamp(value - step))} aria-label={`Lower ${name.toLowerCase()}`}>−</button>
      <label><i aria-hidden="true">$</i>
        {/* #118: as wide as its digits, so "$" and the price stay one centred unit */}
        <input type="number" inputMode="decimal" min={min} max={max} step="0.01" value={text} aria-label={`${name}, in dollars`}
          style={{ width: `${Math.max(3, text.replace(/[^0-9]/g, '').length + (text.includes('.') ? .4 : 0))}ch` }}
          onChange={event => setText(event.target.value)} onBlur={commit} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} />
      </label>
      <button type="button" disabled={value >= max} onClick={() => onChange(clamp(value + step))} aria-label={`Raise ${name.toLowerCase()}`}>+</button>
    </div>
  );
};

/** A whole number with − and +: the rental length. */
const CountStepper: React.FC<{ label: string; value: number; min: number; max: number; unit: (value: number) => string; onChange: (value: number) => void }> = ({
  label, value, min, max, unit, onChange,
}) => (
  <div className={css.stepper} role="group" aria-label={label}>
    <span>{label}</span>
    <button type="button" disabled={value <= min} onClick={() => onChange(value - 1)} aria-label={`Lower ${label.toLowerCase()}`}>−</button>
    <b>{unit(value)}</b>
    <button type="button" disabled={value >= max} onClick={() => onChange(value + 1)} aria-label={`Raise ${label.toLowerCase()}`}>+</button>
  </div>
);

/** A switch that slides, with what it is beside it. */
const Toggle: React.FC<{ label: string; detail?: string; on: boolean; onChange: (on: boolean) => void; children?: ReactNode }> = ({ label, detail, on, onChange, children }) => (
  <div className={cx(css.toggleRow, on && css.isOn)}>
    <button type="button" role="switch" aria-checked={on} aria-label={`${label}: ${on ? 'on' : 'off'}`} onClick={() => onChange(!on)}>
      <span><b>{label}</b>{detail && <small>{detail}</small>}</span><i aria-hidden="true" />
    </button>
    {on && children}
  </div>
);

/** The free tier's or the store's early access: premieres before everyone else, in weeks. */
const EarlyAccess: React.FC<{ value?: StreamingCommercialOfferBenefit; onChange: (benefit: StreamingCommercialOfferBenefit) => void }> = ({ value, onChange }) => {
  const benefit = value || { premiumAccess: false, earlyAccessWeeks: 0 };
  return (
    <Toggle label="Early access" detail="Eligible titles before their general release" on={benefit.premiumAccess}
      onChange={on => onChange({ premiumAccess: on, earlyAccessWeeks: on ? Math.max(1, benefit.earlyAccessWeeks) : 0 })}>
      <div className={css.segments} role="group" aria-label="Early access timing">
        {[0, 1, 2, 3, 4].map(weeks => (
          <button key={weeks} type="button" aria-pressed={benefit.earlyAccessWeeks === weeks} onClick={() => onChange({ ...benefit, earlyAccessWeeks: weeks })}
            aria-label={weeks === 0 ? 'Opening week' : `${weeks} week${weeks === 1 ? '' : 's'} early`}>{weeks === 0 ? 'Now' : `${weeks} wk`}</button>
        ))}
      </div>
    </Toggle>
  );
};

/** An ad-free pass: on with a price, or off. */
const Pass: React.FC<{ label: string; price: number | null; onChange: (price: number | null) => void }> = ({ label, price, onChange }) => (
  <Toggle label={label} detail="Removes the breaks for that long; unlocks no paid titles" on={price !== null} onChange={on => onChange(on ? 1.99 : null)}>
    {/* #118: "Price" under its pass (the pass names it aloud), so the label stays on one line at 320 */}
    {price !== null && <PriceStepper label="Price" name={`${label} price`} value={price} step={.5} min={.99} max={100} onChange={onChange} />}
  </Toggle>
);

/**
 * The one ad cadence control (#103 took "No ads" away: a free tier or an ad plan runs ads). A dial of breaks from few
 * to many, what one break every so many minutes makes (spots and ad minutes an hour), and its effect as two meters.
 */
export const AdCadenceControl: React.FC<{
  minutesPerHour: number;
  estimatedCpm: number | null;
  estimatedFillRate: number | null;
  onChange: (minutesPerHour: number) => void;
}> = ({ minutesPerHour, estimatedCpm, estimatedFillRate, onChange }) => {
  const interval = adIntervalForMinutesPerHour(minutesPerHour);
  const isCustom = minutesPerHour > 0 && interval === null;
  const spots = Math.round(minutesPerHour * 2 * 100) / 100;
  const load = Math.min(1, minutesPerHour / MOST_AD_MINUTES);
  return (
    <div className={css.cadence}>
      <p className={css.eyebrow}>Show an ad every…</p>
      <div className={css.dial} role="group" aria-label="Show an ad every">
        {CADENCE.map(minutes => (
          <button key={minutes} type="button" aria-pressed={interval === minutes} onClick={() => onChange(adMinutesPerHourForInterval(minutes))}
            aria-label={`${minutes} minutes`}><b>{minutes}</b><small>min</small></button>
        ))}
      </div>
      <div className={css.dialEnds} aria-hidden="true"><span>Fewer breaks · viewers stay</span><span>More breaks · more money</span></div>
      <div className={css.reading} aria-live="polite">
        <b>{isCustom ? 'Custom saved load' : minutesPerHour === 0 ? 'No ads' : `Every ${interval} minutes`}</b>
        <span>{minutesPerHour === 0 ? '0 opportunities · 0 ad min per eligible hour' : `${spots} opportunities · ${minutesPerHour} ad min per eligible hour`}</span>
      </div>
      <div className={css.meters} aria-hidden="true">
        <span>Ad money</span><i><em style={{ width: `${Math.round(load * 100)}%` }} /></i>
        <span>Viewers put off</span><i className={css.cost}><em style={{ width: `${Math.round(load * 100)}%` }} /></i>
      </div>
      {isCustom && <p className={css.note}>This saved load is kept exactly. Choose a break only if you want to change it.</p>}
      {minutesPerHour > 6 && <p className={css.warn}>Heavy ad load can reduce viewing and retention.</p>}
      {/* the market's price and fill, where a forecast has them (the wizard's; the Offer tab has none) */}
      {(estimatedCpm != null || estimatedFillRate != null) && (
        <div className={css.outcome}>
          <span>Estimated CPM <b>{estimatedCpm == null ? '—' : `$${estimatedCpm.toFixed(2)}`}</b></span>
          <span>Estimated fill <b>{estimatedFillRate == null ? '—' : percent(estimatedFillRate * 100)}</b></span>
        </div>
      )}
    </div>
  );
};

/* a discount, told as the price it makes */
const Deal: React.FC<{
  label: string; value: number; max: number; step: number; from: number; to?: number;
  aside: (value: number) => string; onChange: (value: number) => void; onPreview?: (value: number | null) => void; children?: ReactNode;
}> = ({ label, value, max, step, from, to, aside, onChange, onPreview, children }) => {
  const { draft, events } = useCommittedRange(value, onChange, onPreview);
  const on = draft > 0;
  const low = streamingDiscountedMonthly(from, draft, max);
  const high = to === undefined ? undefined : streamingDiscountedMonthly(to, draft, max);
  const floored = on && from > STREAMING_MINIMUM_PAID_PLAN_PRICE && low <= STREAMING_MINIMUM_PAID_PLAN_PRICE;
  return (
    <div className={cx(css.deal, on && css.isOn)}>
      <div className={css.dealTop}>
        <em>{label}</em>
        <span className={css.cut}>{on ? `−${draft}%` : 'Off'}</span>
        <b>{money(low)}{high !== undefined && high !== low && <>–{money(high)}</>}</b>
      </div>
      <input className={css.slider} type="range" min={0} max={max} step={step} value={draft} {...events}
        style={{ ['--fill' as string]: `${max > 0 ? Math.round(draft / max * 100) : 0}%` }}
        aria-label={label} aria-valuetext={on ? `${draft}% off, ${money(low)} a month` : 'Full price'} />
      <small className={cx(css.aside, floored && css.floored)}>{floored ? `${money(STREAMING_MINIMUM_PAID_PLAN_PRICE)} is the floor` : aside(draft)}</small>
      {children}
    </div>
  );
};

/* the cover and its attached editor */
const Control: React.FC<{
  id: OfferControlId; offer: StreamingOfferKind; eyebrow: string; headline: ReactNode; detail: string; effect?: ReactNode;
  open: boolean; editable: boolean; onToggle: () => void; children: ReactNode;
}> = ({ id, offer, eyebrow, headline, detail, effect, open, editable, onToggle, children }) => {
  const editor = useId();
  const face = (
    <>
      <span className={css.badge}><StreamingOfferEmblem offer={offer} /></span>
      <span className={css.coverText}>
        <small>{eyebrow}</small>
        <b>{headline}</b>
        <span>{detail}</span>
      </span>
      {editable && <i className={css.chip} aria-hidden="true">{open ? 'Close −' : 'Edit +'}</i>}
      {effect && <span className={css.effect}>{effect}</span>}
    </>
  );
  return (
    <section id={`offer-control-${id}`} className={cx(css.control, open && css.isOpen)} style={tint(offer)} aria-label={eyebrow}>
      {editable ? (
        <button type="button" className={css.cover} aria-expanded={open} aria-controls={open ? editor : undefined}
          aria-label={`Edit ${eyebrow.toLowerCase()}`} onClick={onToggle}>{face}</button>
      ) : <div className={css.cover}>{face}</div>}
      {open && editable && <div className={css.editor} id={editor}>{children}</div>}
    </section>
  );
};

export interface OfferControlsProps {
  pricing: OwnedStreamingPricingConfiguration;
  tree: OwnedStreamingTechTreeState;
  /** absent: the covers alone, read-only */
  onChange?: (next: OwnedStreamingPricingConfiguration) => void;
  /** a discount being dragged, before it is let go (null when it ends) */
  onPreview?: (next: OwnedStreamingPricingConfiguration | null) => void;
  open: OfferControlId | null;
  onOpen: (id: OfferControlId | null) => void;
  /** the market's ad price and fill for the cadence, when a forecast has them */
  adEstimate?: { cpm: number | null; fill: number | null };
}

export const OfferControls: React.FC<OfferControlsProps> = ({ pricing, tree, onChange, onPreview, open, onOpen, adEstimate }) => {
  const editable = Boolean(onChange);
  const offer = projectStreamingCommercialOffers(pricing);
  const subsOn = pricing.streams.includes('subs') && pricing.plans.length > 0;
  const adsOn = pricing.streams.includes('ads');
  const storeOn = Boolean(offer.storeOffer);
  if (!subsOn && !adsOn && !storeOn) return null;
  const write = (next: Partial<OwnedStreamingPricingConfiguration>) => onChange?.(normalizeStreamingPricingConfiguration({ ...pricing, ...next }));
  const act = (action: StreamingPricingOfferAction) => onChange?.(configureStreamingPricingOffer(pricing, action));
  const preview = (next: Partial<OwnedStreamingPricingConfiguration> | null) => onPreview?.(next ? { ...pricing, ...next } : null);
  /* the store's prices through the plan builder's setters, so they keep #103's one range */
  const terms = (next: Partial<{ rent: number; buy: number; windowWeeks: number }>) => onChange?.(setStreamingStoreTerms(pricing, next));
  const topEdition = (next: { rent: number; buy: number } | null) => onChange?.(setStreamingStoreTopEdition(pricing, next));
  const toggle = (id: OfferControlId) => onOpen(open === id ? null : id);

  /* ad breaks: whose they are */
  const interval = adIntervalForMinutesPerHour(pricing.ads.minutesPerHour);
  const adPlans = subsOn ? pricing.plans.filter(plan => plan.ads).length : 0;
  const adsWhere = [offer.freeAdOffer ? 'the free tier' : null, adPlans ? `${adPlans} plan${adPlans === 1 ? '' : 's'}` : null].filter(Boolean).join(' and ');
  const load = Math.min(1, pricing.ads.minutesPerHour / MOST_AD_MINUTES);

  /* the store: its editions, who can buy */
  const editions = storeOn ? resolveStreamingStoreEditions(pricing, tree) : null;
  const topName = editions?.topPicture ? getStreamingTechDefinition(editions.topPicture)?.name || null : null;
  const top = pricing.storeTopEdition;
  const members = offer.storeOffer?.eligibility.kind === 'MEMBERSHIP_PLANS';
  const memberIds = offer.storeOffer?.eligibility.planIds || [];
  const weeks = pricing.rentals.windowWeeks;

  /* deals: against the cheapest and the dearest plan, the first three months against their plan */
  const paid = pricing.plans.filter(plan => plan.monthly > 0);
  const entry = paid.length ? Math.min(...paid.map(plan => plan.monthly)) : STREAMING_MINIMUM_PAID_PLAN_PRICE;
  const dearest = paid.length ? Math.max(...paid.map(plan => plan.monthly)) : entry;
  const introPlan = pricing.introOfferPlanId ? pricing.plans.find(plan => plan.id === pricing.introOfferPlanId) : undefined;
  const introFrom = introPlan ? introPlan.monthly : entry;
  const yearly = streamingAnnualBillingShare(pricing.annualDiscount);
  const deals = [pricing.annualDiscount > 0 ? `−${pricing.annualDiscount}% yearly` : null, pricing.introOffer > 0 ? `−${pricing.introOffer}% first 3 months` : null].filter(Boolean);

  return (
    <div className={css.controls}>
      <p className={css.head}>Breaks, store and deals</p>

      {adsOn && (
        <Control id="ADS" offer="ADS" eyebrow="AD BREAKS" open={open === 'ADS'} editable={editable} onToggle={() => toggle('ADS')}
          headline={interval ? `Every ${interval} min` : pricing.ads.minutesPerHour > 0 ? `${pricing.ads.minutesPerHour} ad min an hour` : 'No breaks'}
          detail={`${interval ? `${pricing.ads.minutesPerHour} ad min an hour` : 'a custom saved load'}${adsWhere ? ` · on ${adsWhere}` : ''}`}
          effect={<span className={css.miniMeters} aria-label={`Ad money ${Math.round(load * 100)}%, viewers put off ${Math.round(load * 100)}%`}>
            <span><small>Ad money</small><i><em style={{ width: `${Math.round(load * 100)}%` }} /></i></span>
            <span><small>Viewers put off</small><i className={css.cost}><em style={{ width: `${Math.round(load * 100)}%` }} /></i></span>
          </span>}>
          <AdCadenceControl minutesPerHour={pricing.ads.minutesPerHour} estimatedCpm={adEstimate?.cpm ?? null} estimatedFillRate={adEstimate?.fill ?? null}
            onChange={minutesPerHour => write({ ads: { ...pricing.ads, minutesPerHour } })} />
          <div className={css.group}>
            <p className={css.eyebrow}>Ad-free passes</p>
            <Pass label="1 hour ad-free" price={offer.adFreePasses.oneHourPrice} onChange={price => act({ kind: 'PASS', duration: 'ONE_HOUR', price })} />
            <Pass label="24 hours ad-free" price={offer.adFreePasses.dayPrice} onChange={price => act({ kind: 'PASS', duration: 'DAY', price })} />
          </div>
          {offer.freeAdOffer && (
            <div className={css.group}>
              <p className={css.eyebrow}>The free tier</p>
              <EarlyAccess value={offer.freeAdOffer.benefits} onChange={benefit => act({ kind: 'BENEFIT', offer: 'FREE_AD', ...benefit })} />
            </div>
          )}
        </Control>
      )}

      {storeOn && (
        <Control id="STORE" offer="STORE" eyebrow="STORE" open={open === 'STORE'} editable={editable} onToggle={() => toggle('STORE')}
          headline={<>Rent {money(pricing.rentals.rent)} · Buy {money(pricing.rentals.buy)}</>}
          detail={`${weeks}-week rentals · ${members ? `members of ${memberIds.length} plan${memberIds.length === 1 ? '' : 's'}` : 'everyone can buy'}${topName ? ` · ${topName} ${top ? `${money(top.rent)} / ${money(top.buy)}` : 'at the same prices'}` : ''}`}>
          <div className={css.group}>
            <p className={css.eyebrow}>{topName ? 'HD edition' : 'Every title'}</p>
            {/* #103: one range wherever store prices are set */}
            <PriceStepper label="Rent" value={pricing.rentals.rent} step={.5} min={.99} max={STREAMING_STORE_RENT_MAX}
              onChange={rent => terms({ rent })} />
            <PriceStepper label="Buy" value={pricing.rentals.buy} step={1} min={.99} max={STREAMING_STORE_BUY_MAX}
              onChange={buy => terms({ buy })} />
            <CountStepper label="Rental length" value={weeks} min={1} max={16} unit={value => `${value} week${value === 1 ? '' : 's'}`}
              onChange={windowWeeks => terms({ windowWeeks })} />
            <small className={css.note}>Browsing is free. One rent and one purchase price for every eligible title; a rental never outlasts its rights.</small>
          </div>
          {topName && editions && (
            <div className={css.group}>
              <p className={css.eyebrow}>{topName} edition</p>
              <div className={css.segments} role="group" aria-label={`${topName} edition price`}>
                <button type="button" aria-pressed={!top} onClick={() => topEdition(null)}>Same as HD</button>
                <button type="button" aria-pressed={Boolean(top)}
                  onClick={() => topEdition(top || { rent: Math.round((pricing.rentals.rent + 2) * 100) / 100, buy: Math.round((pricing.rentals.buy + 5) * 100) / 100 })}>Its own price</button>
              </div>
              {top && <>
                <PriceStepper label={`Rent in ${topName}`} value={top.rent} step={.5} min={pricing.rentals.rent} max={STREAMING_STORE_TOP_RENT_MAX}
                  onChange={rent => topEdition({ ...top, rent })} />
                <PriceStepper label={`Buy in ${topName}`} value={top.buy} step={1} min={pricing.rentals.buy} max={STREAMING_STORE_TOP_BUY_MAX}
                  onChange={buy => topEdition({ ...top, buy })} />
              </>}
              <small className={css.note}>{percent(editions.topRentShare * 100)} of renters take {topName}{top ? `, so a rental earns ${money(editions.rentPrice)} on average and a purchase ${money(editions.buyPrice)}` : ' at the HD price'}. Each {topName} viewer needs more of your servers.</small>
            </div>
          )}
          <div className={css.group}>
            <p className={css.eyebrow}>Who can rent or buy?</p>
            <div className={css.segments} role="group" aria-label="Store buyer access">
              <button type="button" aria-pressed={!members} onClick={() => act({ kind: 'STORE_ELIGIBILITY', scope: 'PUBLIC', planIds: [] })}>Everyone</button>
              <button type="button" aria-pressed={members} onClick={() => act({ kind: 'STORE_ELIGIBILITY', scope: 'MEMBERSHIP_PLANS', planIds: memberIds })}>Members of plans</button>
            </div>
            {members && (subsOn ? (
              <div className={css.chips} role="group" aria-label="Plans whose members can rent or buy">
                {paid.map(plan => {
                  const on = memberIds.includes(plan.id);
                  return <button key={plan.id} type="button" aria-pressed={on}
                    onClick={() => act({ kind: 'STORE_ELIGIBILITY', scope: 'MEMBERSHIP_PLANS', planIds: on ? memberIds.filter(id => id !== plan.id) : [...memberIds, plan.id] })}>
                    {on ? '✓ ' : ''}{plan.name}</button>;
                })}
              </div>
            ) : <small className={css.note}>Turn Subscription on to choose whose members can buy.</small>)}
            {/* #103: a store nobody can buy from says so */}
            {streamingStoreSellsToNobody(pricing) && <p className={css.warn}>{subsOn
              ? 'No plan is chosen: browsing stays open, but new rentals and purchases will be zero.'
              : 'Subscriptions are off, so there are no members to buy: new rentals and purchases will be zero.'}</p>}
          </div>
          {offer.storeOffer && (
            <div className={css.group}>
              <EarlyAccess value={offer.storeOffer.benefits} onChange={benefit => act({ kind: 'BENEFIT', offer: 'STORE', ...benefit })} />
            </div>
          )}
        </Control>
      )}

      {subsOn && (
        <Control id="DEALS" offer="SUBSCRIPTION" eyebrow="DEALS" open={open === 'DEALS'} editable={editable} onToggle={() => toggle('DEALS')}
          headline={deals.length ? deals.join(' · ') : 'No deals'}
          detail={pricing.annualDiscount > 0
            ? `${percent(yearly * 100)} pay yearly · from ${money(streamingDiscountedMonthly(entry, pricing.annualDiscount, STREAMING_MAXIMUM_ANNUAL_DISCOUNT))} a month`
            : 'Everyone pays monthly, at full price'}>
          <Deal label="Pay yearly" value={pricing.annualDiscount} max={STREAMING_MAXIMUM_ANNUAL_DISCOUNT} step={5} from={entry} to={dearest > entry ? dearest : undefined}
            onChange={annualDiscount => write({ annualDiscount })} onPreview={value => preview(value === null ? null : { annualDiscount: value })}
            aside={value => value > 0 ? `on all ${pricing.plans.length} plan${pricing.plans.length === 1 ? '' : 's'} · ${percent(streamingAnnualBillingShare(value) * 100)} pay yearly` : 'nothing off, so everyone pays monthly'} />
          <Deal label="First three months" value={pricing.introOffer} max={STREAMING_MAXIMUM_INTRO_OFFER} step={10} from={introFrom}
            onChange={introOffer => write({ introOffer })} onPreview={value => preview(value === null ? null : { introOffer: value })}
            aside={value => value > 0 ? `${introPlan ? introPlan.name : 'every plan'}, then ${money(introFrom)}` : 'full price from day one'}>
            {pricing.plans.length > 1 && (
              <div className={css.chips} role="group" aria-label="Which plan the first three months are on">
                <button type="button" aria-pressed={!pricing.introOfferPlanId} onClick={() => write({ introOfferPlanId: undefined })}>Every plan</button>
                {pricing.plans.map(plan => (
                  <button key={plan.id} type="button" aria-pressed={pricing.introOfferPlanId === plan.id} onClick={() => write({ introOfferPlanId: plan.id })}>{plan.name}</button>
                ))}
              </div>
            )}
          </Deal>
        </Control>
      )}
    </div>
  );
};

export default OfferControls;
