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

import { useMemo, useState, type ReactNode } from 'react';
import {
  PLAN_FEATURES, REVENUE_STREAMS, forecastPricing,
  type Plan, type PricingSettings, type StreamId,
} from '../../finance/launch';
import type { StepProps } from './LaunchWizard';
import { compactCount, money, moneyPrecise, pct } from '../../finance/format';

const GROUPS = [
  { id: 'quality' as const, label: 'Picture & sound' },
  { id: 'access' as const, label: 'Access' },
  { id: 'extras' as const, label: 'Extras' },
];

export function StepPricing({ data, draft, patch, chosen, handlers }: StepProps) {
  const settings: PricingSettings = draft.pricing ?? data.pricing;
  const addressable = useMemo(() => chosen.reduce((sum, c) => sum + c.addressableHouseholds, 0), [chosen]);
  const forecast = useMemo(
    () => forecastPricing(settings, addressable, data.market),
    [settings, addressable, data.market],
  );

  const write = (next: Partial<PricingSettings>) => patch({ pricing: { ...settings, ...next } });
  const writePlan = (id: string, next: Partial<Plan>) =>
    write({ plans: settings.plans.map((p) => (p.id === id ? { ...p, ...next } : p)) });
  const toggleStream = (id: StreamId) => write({
    streams: settings.streams.includes(id)
      ? settings.streams.filter((s) => s !== id)
      : [...settings.streams, id],
  });

  const top = [...forecast.streams].sort((a, b) => b.monthly - a.monthly)[0];
  const [openDetail, setOpenDetail] = useState(false);

  return (
    <>
      {/* --- the answer, pinned above everything that changes it -------------
          One line by default. It used to be a full panel, which pushed the
          controls it exists to answer off the screen; the breakdown is one tap
          away instead. */}
      <section className={openDetail ? 'pr-live is-open' : 'pr-live'}>
        <button type="button" className="pr-live-face" onClick={() => setOpenDetail((v) => !v)}>
          <span className="pr-live-cell">
            <em>Households</em>
            <b>{compactCount(forecast.households)}</b>
          </span>
          <span className="pr-live-bar" aria-hidden="true">
            {forecast.streams.map((stream, i) => (
              <i key={stream.id} style={{ width: `${(stream.monthly / Math.max(1, forecast.monthlyRevenue)) * 100}%`, opacity: 1 - i * 0.13 }} />
            ))}
            {forecast.streams.length === 0 && <i className="is-empty" style={{ width: '100%' }} />}
          </span>
          <span className="pr-live-cell is-end">
            <em>A month</em>
            <b>{money(forecast.monthlyRevenue)}</b>
          </span>
          <span className="pr-live-caret" aria-hidden="true">{openDetail ? '▾' : '▸'}</span>
        </button>

        {openDetail && (
          <div className="pr-live-detail">
            <p className="pr-sub">
              {forecast.subscribers > 0 ? `${compactCount(forecast.subscribers)} paying · ` : ''}
              of {compactCount(forecast.addressable)} reachable · {money(forecast.yearlyRevenue)} a year
            </p>
            <p className="pr-position">
              Range · {money(forecast.conservativeMonthlyRevenue)} conservative · {money(forecast.monthlyRevenue)} expected · {money(forecast.breakoutMonthlyRevenue)} breakout
            </p>
            <ul className="pr-streamkeys">
              {forecast.streams.map((stream, i) => (
                <li key={stream.id}>
                  <i style={{ opacity: 1 - i * 0.13 }} aria-hidden="true" />
                  <span>{stream.name}</span>
                  <b>{money(stream.monthly)}</b>
                </li>
              ))}
              {forecast.streams.length === 0 && <li className="is-empty"><span>No way to earn switched on yet</span></li>}
            </ul>
            <p className="pr-position">
              {forecast.position}
              {top && forecast.streams.length > 1 && ` ${top.name} is ${pct((top.monthly / forecast.monthlyRevenue) * 100, 0)} of the money.`}
            </p>
          </div>
        )}
      </section>

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
                  <span className="pr-pick-real">{lock ? `Research required · ${lock}` : stream.real}</span>
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
              onClick={() => write({
                plans: [...settings.plans, {
                  id: `plan-${Date.now()}`,
                  name: `Plan ${settings.plans.length + 1}`,
                  monthly: 12,
                  featureIds: ['noads', 'catalogue'],
                  ads: false,
                }],
              })}
            >
              Add a plan
            </button>
          </div>

          <ul className="pr-plans">
            {settings.plans.map((plan) => {
              const row = forecast.plans.find((r) => r.plan.id === plan.id);
              return (
                <li key={plan.id} className="pr-plan">
                  <header className="pr-plan-head">
                    <input
                      className="pr-plan-name"
                      value={plan.name}
                      onChange={(e) => writePlan(plan.id, { name: e.target.value })}
                      aria-label="Plan name"
                    />
                    {settings.plans.length > 1 && (
                      <button
                        type="button"
                        className="pr-remove"
                        onClick={() => write({ plans: settings.plans.filter((p) => p.id !== plan.id) })}
                        aria-label={`Remove ${plan.name}`}
                      >
                        ×
                      </button>
                    )}
                  </header>

                  <div className="pr-price">
                    <button type="button" className="st-step" onClick={() => writePlan(plan.id, { monthly: Math.max(0, plan.monthly - 1) })} aria-label="Lower price">−</button>
                    <span className="pr-price-figure">{money(plan.monthly)}<i>/mo</i></span>
                    <button type="button" className="st-step" onClick={() => writePlan(plan.id, { monthly: plan.monthly + 1 })} aria-label="Raise price">+</button>
                  </div>

                  <div className="pr-feats">
                    {GROUPS.map((group) => (
                      <div key={group.id} className="pr-featgroup">
                        <em>{group.label}</em>
                        <div className="pr-chips">
                          {PLAN_FEATURES.filter((f) => f.group === group.id).map((feature) => {
                            const has = plan.featureIds.includes(feature.id);
                            const lock = data.capabilityLocks[`feature:${feature.id}`];
                            return (
                              <button
                                key={feature.id}
                                type="button"
                                disabled={Boolean(lock)}
                                title={lock || undefined}
                                aria-label={lock ? `${feature.name} locked: ${lock}` : feature.name}
                                className={`${has ? 'pr-chip is-on' : 'pr-chip'}${lock ? ' is-locked' : ''}`}
                                onClick={() => writePlan(plan.id, {
                                  featureIds: has
                                    ? plan.featureIds.filter((f) => f !== feature.id)
                                    : [...plan.featureIds, feature.id],
                                })}
                              >
                                {feature.name}
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
                            className={plan.ads ? 'pr-chip is-ads is-on' : 'pr-chip'}
                            onClick={() => writePlan(plan.id, { ads: !plan.ads })}
                          >
                            {plan.ads ? 'This plan carries adverts' : 'No adverts on this plan'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {row && (
                    <footer className="pr-plan-foot">
                      <span><b>{compactCount(row.subscribers)}</b> households</span>
                      <span><b>{pct(row.share, 0)}</b> of subscribers</span>
                      <span><b>{money(row.monthly)}</b> a month</span>
                    </footer>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="pr-dials">
            <Dial label="Pay yearly" value={settings.annualDiscount} max={40} step={5} suffix="%"
              note={`${settings.annualDiscount}% off · about a third of households take it`}
              onChange={(v) => write({ annualDiscount: v })} />
            <Dial label="First three months" value={settings.introOffer} max={60} step={10} suffix="%"
              note={settings.introOffer > 0 ? 'Cheap way in, and a churn cliff when it ends' : 'No introductory offer'}
              onChange={(v) => write({ introOffer: v })} />
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

      <div className="pr-summary">
        <div><span>Per household</span><b>{moneyPrecise(forecast.perHousehold)}<i>/mo</i></b></div>
        <div><span>Forecast a year</span><b>{money(forecast.yearlyRevenue)}</b></div>
      </div>

      <button type="button" className="sf-btn sf-btn--primary" onClick={() => handlers.onSavePricing?.(settings)}>
        Save pricing
      </button>
    </>
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
      <input
        className="sf-slider"
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
