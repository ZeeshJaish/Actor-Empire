/**
 * WORLD (#133; plan §20.8): the streaming industry around you, all from the world simulation.
 *  - the race: who holds the paying homes and who holds the watch time, one bar each (the way real share-of-viewing
 *    charts read), your row first; watch time is every platform's settled viewing hours (#128), so yours is real;
 *  - from homes to you: homes that can stream → pay for streaming → pay you, what a home can spend, the homes
 *    outside the market, and the homes that want you at today's price with the plans they would pick;
 *  - the market over 52 weeks: paying homes and your share of them, from the customer ledger's weekly snapshots;
 *  - who's out there (#140): of every 100 people streaming as a grid of figures, then each group's card (AudiencePeople);
 *  - #141: the Platform Wars link went with the room.
 * Gone from here: the second map (MARKETS has the one map), the cinema bar, the notes, the formula curve and
 * facts, "willing to move", the fixed reasons, and the eight rival cards.
 */
import React, { useMemo, useState } from 'react';
import r from './presentation/screens/AudienceDesk/AudienceRoom.module.css';
import { cx } from './presentation/cx';
import { SplitBar, TrendChart } from './AudienceCharts';
import { AudiencePeople } from './AudiencePeople';
import { compact, formatShare, sharesOf, type AtlasCountry, type AudienceKind } from './audienceAtlasModel';
import type { StreamingAudienceMarketView } from '../../services/streamingAudienceMarket';

type Line = 'PAYING' | 'SHARE';
const NAMED = 6;
const keyOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

interface RaceRow { key: string; name: string; color: string; homes: number | null; watch: number | null; you: boolean }

export const AudienceWorldTab: React.FC<{
  market: StreamingAudienceMarketView;
  countries: AtlasCountry[];
  live: boolean;
  kind: AudienceKind;
  accent: string;
  brandName: string;
}> = ({ market, countries, live, kind, accent, brandName }) => {
  const [line, setLine] = useState<Line>('PAYING');

  /* ── the race: homes from the countries' paying homes, watch time from the settled viewing ── */
  const race = useMemo(() => {
    const homes = sharesOf(countries.map(country => country.view));
    const rows = new Map<string, RaceRow>();
    const add = (id: string, name: string, color: string, side: 'homes' | 'watch', value: number) => {
      const key = id === 'PLAYER' ? 'PLAYER' : keyOf(name) || id;
      const row = rows.get(key) || { key, name: id === 'PLAYER' ? brandName : name, color: id === 'PLAYER' ? accent : color, homes: null, watch: null, you: id === 'PLAYER' };
      row[side] = (row[side] ?? 0) + value;
      rows.set(key, row);
    };
    homes.shares.forEach(item => add(item.id, item.name, item.color, 'homes', item.share));
    market.watchRace.entries.forEach(item => add(item.player ? 'PLAYER' : item.id, item.name, item.color, 'watch', item.sharePercent));
    const ranked = [...rows.values()].sort((left, right) => Number(right.you) - Number(left.you)
      || Math.max(right.homes ?? 0, right.watch ?? 0) - Math.max(left.homes ?? 0, left.watch ?? 0));
    const named = ranked.filter(row => row.you || row.key !== 'otherservices').slice(0, NAMED + 1);
    const rest = ranked.filter(row => !named.includes(row));
    const other: RaceRow | null = rest.length ? {
      key: 'other', name: 'Other services', color: '#5b6474', you: false,
      homes: rest.reduce((sum, row) => sum + (row.homes ?? 0), 0) || null,
      watch: rest.reduce((sum, row) => sum + (row.watch ?? 0), 0) || null,
    } : null;
    return { rows: other ? [...named, other] : named, unclaimed: homes.unclaimedShare };
  }, [countries, market.watchRace, accent, brandName]);
  const pct = (value: number | null) => (value === null ? '—' : value > 0 && value < 1 ? formatShare(value) : `${value.toFixed(0)}%`);

  /* ── from homes to you ── */
  const canStream = market.industryParticipation.streamingReachableHouseholds;
  const paying = market.payingHouseholds;
  const yours = kind === 'AD_HOMES' ? market.playerCommercial.adHouseholds
    : kind === 'BUYERS' ? market.playerCommercial.storeBuyers
      : market.customerAccess.available ? market.customerAccess.payingHouseholds : market.streamingCompetition.playerHouseholds;
  const wanting = market.streamingCompetition.playerHouseholds;
  const plans = market.playerPlans.map(plan => ({
    ...plan,
    homes: market.streamingCompetition.playerPlanAllocations.find(row => row.planId === plan.id)?.households ?? 0,
  }));
  const planHomes = plans.reduce((sum, plan) => sum + plan.homes, 0);
  const steps = [
    { label: 'CAN STREAM', value: canStream, unit: 'homes' },
    { label: 'PAY FOR STREAMING', value: paying, unit: 'homes' },
    { label: kind === 'AD_HOMES' ? 'WATCH YOU FREE' : kind === 'BUYERS' ? 'BUY FROM YOU' : 'PAY YOU', value: live ? yours : 0, unit: kind === 'BUYERS' ? 'buyers' : 'homes', you: true },
  ];

  /* ── the market over 52 weeks (the customer ledger's snapshots) ── */
  const history = market.history;
  const points = useMemo(() => history.map(point => ({
    week: point.absoluteWeek,
    value: line === 'PAYING' ? point.payingHouseholds : point.payingHouseholds > 0 ? point.playerAccounts / point.payingHouseholds * 100 : 0,
  })), [history, line]);
  const first = history[0];
  const last = history.at(-1);
  const growth = first && last && first.payingHouseholds > 0 ? (last.payingHouseholds - first.payingHouseholds) / first.payingHouseholds * 100 : null;

  return (
    <div className={r.room}>
      {/* ── the race ── */}
      <div className={r.sh}><h2>The race</h2><span>{market.streamingCompetition.offerCount} services competing</span></div>
      <section className={cx(r.card, r.rise)}>
        <div className={r.raceLabel}><span>PAYING HOMES</span><em>{pct(race.unclaimed)} pay nobody</em></div>
        <div className={r.raceBar} role="img" aria-label="Share of paying homes by service">
          {race.rows.filter(row => (row.homes ?? 0) > 0).map(row => <i key={row.key} className={row.you ? r.raceYou : ''} style={{ width: `${row.homes}%`, background: row.color }} />)}
          <i className={r.raceOpen} style={{ width: `${race.unclaimed}%` }} />
        </div>
        <div className={r.raceLabel}><span>WATCH TIME</span><em>{market.watchRace.available ? `${compact(market.watchRace.totalHours)} hours this week` : 'settles next week'}</em></div>
        <div className={r.raceBar} role="img" aria-label="Share of the week's watch time by service">
          {market.watchRace.available && race.rows.filter(row => (row.watch ?? 0) > 0).map(row => <i key={row.key} className={row.you ? r.raceYou : ''} style={{ width: `${row.watch}%`, background: row.color }} />)}
        </div>
        <div className={r.raceTable}>
          <div className={r.raceHead}><span /><small>HOMES</small><small>WATCH</small></div>
          {race.rows.map((row, index) => (
            <div key={row.key} className={cx(r.raceRow, row.you && r.raceMe)} style={{ ['--i' as string]: index }}>
              <span><i style={{ background: row.color }} />{row.you ? `${row.name} · you` : row.name}</span>
              <b>{pct(row.homes)}</b>
              <b>{pct(row.watch)}</b>
            </div>
          ))}
        </div>
        <p className={r.bfNote}>Every service competes for the same homes, and a home can pay for more than one. Watch time is the week's settled viewing hours.</p>
      </section>

      {/* ── from homes to you ── */}
      <div className={r.sh}><h2>From homes to you</h2><span>can stream · pay · {kind === 'ACCOUNTS' ? 'pay you' : 'yours'}</span></div>
      <section className={cx(r.card, r.rise)} style={{ ['--i' as string]: 1 }}>
        <div className={r.funnel}>
          {steps.map((step, index) => {
            const share = canStream > 0 ? step.value / canStream * 100 : 0;
            return (
              <div key={step.label} className={cx(r.fstep, step.you && r.fyou)} style={{ ['--w' as string]: `${Math.max(step.you ? 14 : 30, 100 - index * 26)}%` }}>
                <div className={r.fshape} />
                <div className={r.ftext}>
                  <span>{step.label}</span>
                  {step.you && !live ? <b>at launch</b> : <b>{compact(step.value)}<small> {step.unit}{index > 0 ? ` · ${formatShare(share)}` : ''}</small></b>}
                </div>
              </div>
            );
          })}
        </div>
        <div className={r.facts}>
          <div><b>${market.householdEconomy.averageMonthlyEntertainmentBudget >= 100 ? Math.round(market.householdEconomy.averageMonthlyEntertainmentBudget) : market.householdEconomy.averageMonthlyEntertainmentBudget.toFixed(1)}</b><span>HOUSEHOLD BUDGET / MO</span></div>
          <div><b>{compact(market.householdEconomy.nonParticipantHouseholds)}</b><span>HOMES OUTSIDE THE MARKET</span></div>
        </div>
        {kind === 'ACCOUNTS' && (wanting > 0 || market.streamingCompetition.playerOfferPresent || plans.length > 0) && (
          <div className={r.won}>
            <div className={r.wonTop}>
              <div><small>HOMES WON AT TODAY'S PRICE</small><b>{compact(wanting)}</b></div>
              <div className={r.wonPrice}><small>EFFECTIVE PRICE</small><b>${market.streamingCompetition.playerEffectiveMonthlyPrice.toFixed(2)}</b><small>a month</small></div>
            </div>
            <p>{wanting <= 0 ? 'No homes would pay at today\'s price yet.' : !live ? 'They start paying at launch.' : wanting > yours ? `${compact(wanting - yours)} more than pay you today: they arrive over the coming weeks.` : wanting < yours * .95 ? `Fewer than pay you today: expect cancellations.` : 'About as many as pay you today.'}</p>
            {planHomes > 0 ? (
              <SplitBar ariaLabel="The plans these homes would pick" parts={plans.map((plan, index) => ({
                id: plan.id,
                label: plan.name,
                value: plan.homes,
                color: `color-mix(in srgb, ${accent} ${[100, 66, 42, 28, 18, 12][index] ?? 12}%, #1b2130)`,
                display: `${Math.round(plan.homes / planHomes * 100)}%`,
              }))} />
            ) : plans.length > 0 && (
              /* no homes won yet: the plans on offer, so the player sees what the homes would choose between */
              <div className={r.keys}>{plans.map(plan => <span key={plan.id}>{plan.name} <b>${plan.monthly.toFixed(2)}</b></span>)}</div>
            )}
          </div>
        )}
      </section>

      {/* ── the market over 52 weeks ── */}
      {history.length >= 2 && (
        <section className={cx(r.card, r.rise)} style={{ ['--i' as string]: 2 }}>
          <div className={r.mtabs} role="tablist" aria-label="Market line" style={{ ['--n' as string]: 2 }}>
            <button type="button" role="tab" aria-selected={line === 'PAYING'} className={cx(r.mtab, line === 'PAYING' && r.on)} onClick={() => setLine('PAYING')}>
              <span>PAYING HOMES</span><b>{compact(last!.payingHouseholds)}</b>
              <em className={growth === null || growth === 0 ? '' : growth > 0 ? r.up : r.down}>{growth === null ? `${history.length} weeks` : `${growth >= 0 ? '▲' : '▼'} ${Math.abs(growth).toFixed(1)}% in ${history.length} wks`}</em>
            </button>
            <button type="button" role="tab" aria-selected={line === 'SHARE'} className={cx(r.mtab, line === 'SHARE' && r.on)} onClick={() => setLine('SHARE')}>
              <span>YOUR SHARE</span><b>{last!.payingHouseholds > 0 ? `${(last!.playerAccounts / last!.payingHouseholds * 100).toFixed(1)}%` : '—'}</b>
              <em>{first && first.payingHouseholds > 0 ? `was ${(first.playerAccounts / first.payingHouseholds * 100).toFixed(1)}%` : 'of paying homes'}</em>
            </button>
          </div>
          <TrendChart key={line} points={points} format={line === 'PAYING' ? compact : value => `${value.toFixed(1)}%`} color={line === 'PAYING' ? '#94a3b8' : accent} />
        </section>
      )}

      {/* ── who's out there (#140) ── */}
      <div className={r.sh}><h2>Who's out there</h2><span>{market.personas.length} audience groups · tap one</span></div>
      <AudiencePeople personas={market.personas} />

    </div>
  );
};
