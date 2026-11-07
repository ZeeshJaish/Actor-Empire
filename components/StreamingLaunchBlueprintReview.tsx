/**
 * #253: what was approved, on the waiting screen's second tab. It was a page of its own, with a Refresh for a plan that had changed. While the opening is
 * being built the plan cannot change (#253), so there is nothing to refresh, only something to read.
 */
import React from 'react';
import type { Player, StreamingRevenueStreamId } from '../types';
import css from './streaming-transplant/presentation/screens/OpeningBuild/OpeningBuild.module.css';

const CHIPS = 14;
const SLATE_ROWS = 6;
const STREAM_WORDS: Partial<Record<StreamingRevenueStreamId, string>> = { subs: 'Subscriptions', ads: 'Ads', rentals: 'Rent and buy', premium: 'Premium', daypass: 'Day pass', sponsor: 'Sponsors', metered: 'Metered', patron: 'Patrons' };
const words = (value: string | null | undefined) => (value || '').replaceAll('_', ' ').toLowerCase().replace(/^\w/, letter => letter.toUpperCase());

export default function StreamingLaunchBlueprintReview({ player }: { player: Player }) {
  const platform = player.ownedStreamingPlatform;
  const service = platform.serviceConfiguration;
  const pricing = service.pricing;
  const markets = platform.marketOperations
    .filter(operation => operation.entryKind === 'OPENING' && operation.status !== 'EXITED')
    .map(operation => operation.countryId!)
    .filter(Boolean);
  const launchAt = platform.openingProgrammeCommission?.committedAtAbsoluteWeek;
  const slate = [...(platform.launchSlate?.entries || [])].sort((left, right) => left.launchWeek - right.launchWeek);
  const earns = pricing.streams.map(stream => STREAM_WORDS[stream] || words(stream)).join(' · ');
  return (
    <>
      <section className={css.planSection} aria-label="Opening markets">
        <div className={css.planHead}><span>OPENING MARKETS</span><b>{markets.length}</b></div>
        <div className={css.planChips}>
          {markets.slice(0, CHIPS).map(id => <i key={id}>{id}</i>)}
          {markets.length > CHIPS && <i>+{markets.length - CHIPS}</i>}
        </div>
      </section>
      <section className={css.planSection} aria-label="Service and storefront">
        <div className={css.planHead}><span>SERVICE</span></div>
        <div className={css.planRows}>
          <div><b>Sound ident</b><em>{words(service.soundIdentKey)}</em></div>
          <div><b>Ident package</b><em>{words(service.identPackageId)}</em></div>
          <div><b>Front page</b><em>{words(service.storefrontLayoutId)}</em></div>
        </div>
      </section>
      <section className={css.planSection} aria-label="Pricing">
        <div className={css.planHead}><span>THE OFFER</span>{pricing.annualDiscount > 0 && <b>{pricing.annualDiscount}% off yearly</b>}</div>
        <div className={css.planRows}>
          {pricing.plans.map(plan => <div key={plan.id || plan.name}><b>{plan.name}</b><em>${plan.monthly.toFixed(2)} a month</em></div>)}
        </div>
        <p className={css.planLine}>{earns}{pricing.streams.includes('rentals') ? ` · rent $${pricing.rentals.rent.toFixed(2)}, buy $${pricing.rentals.buy.toFixed(2)}` : ''}</p>
      </section>
      <section className={css.planSection} aria-label="Opening slate">
        <div className={css.planHead}><span>OPENING SLATE</span><b>{slate.length} {slate.length === 1 ? 'title' : 'titles'}</b></div>
        <div className={css.planRows}>
          {slate.slice(0, SLATE_ROWS).map(entry => <div key={entry.id}><b>{entry.title}</b><em>Week {entry.launchWeek}</em></div>)}
        </div>
        {slate.length > SLATE_ROWS && <p className={css.planLine}>And {slate.length - SLATE_ROWS} more across the first twelve weeks.</p>}
      </section>
      <p className={css.planNote}>{launchAt === undefined ? 'Commissioned.' : 'Approved when you commissioned the build.'} It all stays this way until opening night, and you can change it from the rooms after that.</p>
    </>
  );
}
