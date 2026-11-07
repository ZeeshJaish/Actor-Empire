/**
 * ANALYTICS (#131; plan §20.8): how your service did this week, from the settled ledger.
 *  - the week as a scoreboard: your audience, the net change, joined · came back · left;
 *  - the next move: one card, with the button that acts on it;
 *  - one line under three metric tabs (the creator-studio way), 12 / 26 / 52 weeks;
 *  - churn on a dial with its comfort line, members still here after 12 weeks on a ring, ARPU and where the
 *    month's revenue comes from;
 *  - why homes came and why they left, a reason a row (the week's real movements, #128);
 *  - the titles that brought members in and kept them, as posters;
 *  - who pays and who watches, the plans they pick, and the way to the Offer.
 * Ad-only and store services see the same page in their own unit, without the subscription parts.
 */
import { gameWeekText } from '../../services/gameWeek';
import React, { useMemo, useState } from 'react';
import r from './presentation/screens/AudienceDesk/AudienceRoom.module.css';
import { cx } from './presentation/cx';
import { Poster } from '../../content-market-exact/Poster';
import { Butterfly, Dial, FlowBar, Ring, SplitBar, TrendChart, type ButterflyRow, type TrendPointView } from './AudienceCharts';
import { CountUp } from './AudienceUi';
import { AUDIENCE_WORDS, compact, signedCompact, type AudienceKind } from './audienceAtlasModel';
import type { AudienceNextMove, AudienceRoomModel } from './audienceRoomModel';
import type { StreamingAudienceMarketView } from '../../services/streamingAudienceMarket';
import type { WorldStreamingCustomerReasonId } from '../../types';

type Metric = 'PAID' | 'REVENUE' | 'CHURN' | 'VIEWERS';
type Weeks = 12 | 26 | 52;

const money = (value: number) => `$${compact(value)}`;
const percent = (value: number, digits = 1) => `${value.toFixed(digits)}%`;

/* a reason, named the same on both sides of the butterfly */
const REASON_NAMES: Record<WorldStreamingCustomerReasonId, string> = {
  COMPETITOR: 'Rivals', CATALOGUE: 'Catalogue', PLAN_VALUE: 'Plans and price', PRICE: 'Price', ROTATION: 'Rotation',
  RELEASE: 'Came back', SHARING_POLICY: 'Sharing rules', MARKETING: 'Campaigns', LOCALIZATION: 'Local fit',
  RELIABILITY: 'Playback', PROMO_EXPIRY: 'Offer ended', ECONOMY: 'Household budgets', PIRACY_ACCESS: 'Piracy', OTHER: 'Other',
};

const MOVE_LOOK: Record<AudienceNextMove['id'], { icon: string; color: string; kicker: string }> = {
  RETENTION: { icon: '♥', color: '#ffb020', kicker: 'NEXT MOVE · KEEP MEMBERS' },
  OFFER_PRICE: { icon: '$', color: '#ffb020', kicker: 'NEXT MOVE · PRICE' },
  OFFER_SHARING: { icon: '⇄', color: '#ffb020', kicker: 'NEXT MOVE · SHARING' },
  ENTER_MARKET: { icon: '⚑', color: 'var(--epx-ad-c)', kicker: 'NEXT MOVE · GROW' },
  PUSH_TITLE: { icon: '▶', color: 'var(--epx-ad-c)', kicker: 'NEXT MOVE · PROMOTE' },
  STEADY: { icon: '✓', color: '#4ade80', kicker: 'ALL CLEAR' },
};

const change = (now: number, before: number | undefined) => (before === undefined || before === 0 ? null : (now - before) / Math.abs(before) * 100);

export const AudienceAnalyticsTab: React.FC<{
  room: AudienceRoomModel;
  market?: StreamingAudienceMarketView;
  kind: AudienceKind;
  accent: string;
  onMove?: (move: AudienceNextMove) => void;
  onOpenTitle?: (projectId: string) => void;
  onOpenPlatformOffer?: () => void;
  offerNote?: string;
}> = ({ room, market, kind, accent, onMove, onOpenTitle, onOpenPlatformOffer, offerNote }) => {
  const words = AUDIENCE_WORDS[kind];
  const subscription = kind === 'ACCOUNTS';
  const metrics: Metric[] = subscription ? ['PAID', 'REVENUE', 'CHURN'] : kind === 'AD_HOMES' ? ['VIEWERS', 'REVENUE'] : ['REVENUE', 'VIEWERS'];
  const [metric, setMetric] = useState<Metric>(metrics[0]);
  const [weeks, setWeeks] = useState<Weeks>(26);
  const series = room.series;
  const valueOf = (point: AudienceRoomModel['series'][number], which: Metric) => (which === 'PAID' ? point.paid : which === 'REVENUE' ? point.revenue : which === 'CHURN' ? point.churn : point.viewers);
  const metricFormat = (which: Metric) => (value: number) => (which === 'REVENUE' ? money(value) : which === 'CHURN' ? percent(value) : compact(value));
  const points: TrendPointView[] = useMemo(() => series.slice(-weeks).map(point => ({ week: point.week, value: valueOf(point, metric) })), [series, weeks, metric]); // eslint-disable-line react-hooks/exhaustive-deps
  const latest = series.at(-1);
  const before = series.at(-2);

  /* the butterfly: every reason the week moved homes, either way */
  const flows = market?.flows;
  const butterfly: ButterflyRow[] = useMemo(() => {
    if (!flows?.available) return [];
    const rows = new Map<string, ButterflyRow>();
    const add = (id: WorldStreamingCustomerReasonId, side: 'came' | 'left', value: number) => {
      const row = rows.get(id) || { id, label: REASON_NAMES[id] ?? id, came: 0, left: 0 };
      row[side] += value;
      rows.set(id, row);
    };
    flows.came.forEach(row => add(row.id, 'came', row.households));
    flows.left.forEach(row => add(row.id, 'left', row.households));
    return [...rows.values()].sort((left, right) => (right.came + right.left) - (left.came + left.left)).slice(0, 6);
  }, [flows]);

  /* #136: a subscription service ranks its titles by the members they brought in and kept; an ad-supported service by
     the ads they earned, a store by what they sold, each with the accounts that watched */
  const titles = useMemo(() => [...room.titles]
    .filter(title => (subscription ? title.brought > 0 || title.kept > 0 : title.earned > 0 || title.watched > 0))
    .sort((left, right) => (subscription
      ? right.brought - left.brought || right.kept - left.kept
      : right.earned - left.earned || right.watched - left.watched))
    .slice(0, 8), [room.titles, subscription]);
  const titleWords = subscription ? { head: 'brought in · kept', earned: '' }
    : kind === 'AD_HOMES' ? { head: 'ads earned · watched', earned: 'ads' } : { head: 'sold · watched', earned: 'sold' };

  const net = room.head.net;
  const move = room.nextMove;
  const look = move ? MOVE_LOOK[move.id] : null;

  return (
    <div className={r.room}>
      {/* ── the week, as a scoreboard ── */}
      <section className={cx(r.card, r.wk, r.rise)}
        style={{ ['--i' as string]: 0, ['--wk-edge' as string]: net === null ? '#2a3242' : net >= 0 ? '#4ade80' : '#ff6b6f' }}>
        <div className={r.eyebrow}><i className={r.live} aria-hidden="true" />WEEK {room.week ?? '—'} · {room.card.settled ? 'SETTLED' : 'SETTLES NEXT WEEK'}</div>
        <div className={r.wkRow}>
          <div className={r.wkScore}>
            <CountUp className={r.wkBig} value={room.card.audience} format={compact} ms={800} />
            <span className={r.wkLabel}>{words.header}</span>
          </div>
          {net !== null && (
            <div className={r.net}>
              <span className={cx(r.netPill, net < 0 && r.down)}><i aria-hidden="true">{net >= 0 ? '▲' : '▼'}</i>{signedCompact(net)}</span>
              <small>THIS WEEK</small>
            </div>
          )}
        </div>
        {subscription && room.card.settled && (
          <FlowBar joined={room.card.joined} returned={room.card.returned} left={room.card.left} format={compact} />
        )}
      </section>

      {/* ── the next move ── */}
      {move && look && (
        <section className={cx(r.move, r.rise)} style={{ ['--mv' as string]: look.color, ['--i' as string]: 1 }}>
          <span className={r.moveIcon} aria-hidden="true">{look.icon}</span>
          <div>
            <small>{look.kicker}</small>
            <b>{move.title}</b>
            <p>{move.detail}</p>
            {move.cta && onMove && <button type="button" className={r.moveCta} onClick={() => onMove(move)}>{move.cta} →</button>}
          </div>
        </section>
      )}

      {/* ── one line, three metrics ── */}
      <section className={cx(r.card, r.rise)} style={{ ['--i' as string]: 2 }}>
        <div className={r.mtabs} role="tablist" aria-label="Metric" style={{ ['--n' as string]: metrics.length }}>
          {metrics.map(which => {
            const now = latest ? valueOf(latest, which) : 0;
            const was = before ? valueOf(before, which) : undefined;
            const delta = which === 'CHURN' ? (was === undefined ? null : now - was) : change(now, was);
            const good = delta === null ? true : which === 'CHURN' ? delta <= 0 : delta >= 0;
            return (
              <button key={which} type="button" role="tab" aria-selected={metric === which} className={cx(r.mtab, metric === which && r.on)} onClick={() => setMetric(which)}>
                <span>{which === 'PAID' ? words.header : which === 'REVENUE' ? 'REVENUE / MO' : which === 'CHURN' ? 'CHURN' : kind === 'AD_HOMES' ? 'HOMES WATCHING' : 'VIEWERS'}</span>
                <b>{latest ? metricFormat(which)(now) : '—'}</b>
                <em className={delta === null || delta === 0 ? '' : good ? r.up : r.down}>
                  {delta === null ? 'this week' : `${delta > 0 ? '▲' : delta < 0 ? '▼' : '='} ${which === 'CHURN' ? `${Math.abs(delta).toFixed(1)} pt` : `${Math.abs(delta).toFixed(1)}%`}`}
                </em>
              </button>
            );
          })}
        </div>
        <div className={r.ranges} role="group" aria-label="Weeks shown">
          {([12, 26, 52] as Weeks[]).map(range => (
            <button key={range} type="button" className={weeks === range ? r.on : ''} aria-pressed={weeks === range} onClick={() => setWeeks(range)}>{range}W</button>
          ))}
        </div>
        <TrendChart key={`${metric}-${weeks}`} points={points} format={metricFormat(metric)} color={metric === 'CHURN' ? '#ff6b6f' : accent} inverse={metric === 'CHURN'} />
      </section>

      {/* ── churn on a dial, members still here on a ring ── */}
      {subscription && room.churn && (
        <div className={cx(r.grid2, r.rise)} style={{ ['--i' as string]: 3 }}>
          <Dial
            value={room.churn.now * 100}
            max={8}
            zones={[{ to: 2, color: '#4ade80' }, { to: 5.5, color: '#ffb020' }, { to: 8, color: '#ff5a5f' }]}
            display={percent(room.churn.now * 100)}
            label="CHURN THIS WEEK"
            caption={room.churn.risingWeeks >= 2 ? `rising ${room.churn.risingWeeks} weeks` : room.churn.now >= .055 ? 'above the 5.5% line' : room.churn.now >= .02 ? 'under the 5.5% line' : 'healthy'}
            tone={room.churn.now >= .055 ? 'bad' : room.churn.risingWeeks >= 2 ? 'warn' : room.churn.now < .02 ? 'good' : undefined}
          />
          {room.retention ? (
            <Ring percent={room.retention.rate} color={accent} display={percent(room.retention.rate, room.retention.rate >= 99.95 ? 0 : 1)}
              label={`STILL HERE · ${room.retention.weeks} WKS`} caption={`of members ${room.retention.weeks} weeks ago`} />
          ) : (
            <Ring percent={0} color={accent} display="—" label="STILL HERE" caption="after two weeks settle" />
          )}
        </div>
      )}

      {/* ── ARPU and where the month's revenue comes from ── */}
      {room.revenue && (
        <section className={cx(r.card, r.rise)} style={{ ['--i' as string]: 4 }}>
          <div className={r.sh} style={{ margin: '0 0 10px' }}>
            <h2>{money(room.revenue.monthly)} a month</h2>
            <span>{subscription && room.arpu ? `${'$'}${room.arpu.now.toFixed(2)} a member${room.arpu.previous ? ` · ${room.arpu.now >= room.arpu.previous ? '▲' : '▼'} ${Math.abs((room.arpu.now - room.arpu.previous) / room.arpu.previous * 100).toFixed(1)}%` : ''}` : 'at this week\'s rate'}</span>
          </div>
          <SplitBar ariaLabel="Where the month's revenue comes from" parts={[
            { id: 'subs', label: 'Subscriptions', value: room.revenue.subscriptions, color: accent, display: money(room.revenue.subscriptions) },
            { id: 'ads', label: 'Ads', value: room.revenue.ads, color: '#f5b544', display: money(room.revenue.ads) },
            { id: 'store', label: 'Store', value: room.revenue.store, color: '#a78bfa', display: money(room.revenue.store) },
            { id: 'other', label: 'Passes and add-ons', value: room.revenue.other, color: '#38bdf8', display: money(room.revenue.other) },
          ]} />
        </section>
      )}

      {/* ── why they came · why they left ── */}
      {subscription && (
        <>
          <div className={r.sh}><h2>Why they came · why they left</h2><span>{flows?.available ? `${gameWeekText(flows.absoluteWeek)}` : 'the ledger'}</span></div>
          <section className={cx(r.card, r.rise)} style={{ ['--i' as string]: 5 }}>
            {butterfly.length ? (
              <>
                <Butterfly rows={butterfly} format={compact} />
                <p className={r.bfNote}>Every home that moved this week, by the reason it moved. A rival wins some homes from you and loses others to you.</p>
              </>
            ) : (
              <div className={r.chartEmpty}>The reasons appear when the next week settles.</div>
            )}
          </section>
        </>
      )}

      {/* ── titles doing the work ── */}
      {titles.length > 0 && (
        <>
          <div className={r.sh}><h2>Titles doing the work</h2><span>{titleWords.head}</span></div>
          <div className={r.rail}>
            {titles.map((title, index) => (
              <button key={title.id} type="button" className={r.pc} onClick={onOpenTitle ? () => onOpenTitle(title.id) : undefined}
                aria-label={subscription ? `${title.title}: ${compact(title.brought)} brought in, ${compact(title.kept)} kept`
                  : `${title.title}: $${compact(title.earned)} ${titleWords.earned}, ${compact(title.watched)} watched`}>
                <span className={r.pcArt}>
                  <span className={r.pcRank}>{index + 1}</span>
                  {/* the art without its type: a long word on a small sheet would be cut; the name sits below */}
                  <Poster id={title.id} title={title.title} genre={title.genre} hue={title.hue} size="sm" bare />
                </span>
                <b>{title.title}</b>
                {subscription ? (
                  <>
                    <em>+{compact(title.brought)} in</em>
                    <small>{compact(title.kept)} kept</small>
                  </>
                ) : (
                  <>
                    <em>${compact(title.earned)} {titleWords.earned}</em>
                    <small>{compact(title.watched)} watched</small>
                  </>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── who pays and who watches ── */}
      {subscription && market?.customerAccess.available && (
        <>
          <div className={r.sh}><h2>Who pays and who watches</h2><span>last week</span></div>
          <section className={cx(r.card, r.rise)} style={{ ['--i' as string]: 6 }}>
            <SplitBar ariaLabel="Paid accounts, outside homes on shared accounts, and pirates" parts={[
              { id: 'paid', label: 'Paid accounts', value: market.customerAccess.paidAccounts, color: accent, display: compact(market.customerAccess.paidAccounts) },
              { id: 'shared', label: 'Shared homes', value: market.customerAccess.externalSharedHouseholds, color: '#a78bfa', display: compact(market.customerAccess.externalSharedHouseholds) },
              { id: 'piracy', label: 'Pirates', value: market.customerAccess.piracyReach, color: '#ff8a4c', display: compact(market.customerAccess.piracyReach) },
            ]} />
            {room.plans && (
              <div style={{ marginTop: 16 }}>
                <div className={r.eyebrow} style={{ marginBottom: 8 }}>PLANS THEY PICK · ${room.plans.effectivePrice.toFixed(2)} A MONTH ON AVERAGE</div>
                <SplitBar ariaLabel="Paid accounts by plan" parts={room.plans.rows.map((plan, index) => ({
                  id: plan.id,
                  label: plan.name,
                  value: plan.accounts,
                  color: `color-mix(in srgb, ${accent} ${[100, 66, 42, 28, 18, 12][index] ?? 12}%, #1b2130)`,
                  display: `${Math.round(plan.share)}%`,
                }))} />
              </div>
            )}
          </section>
        </>
      )}

      {onOpenPlatformOffer && (
        <button type="button" className={cx(r.link, r.rise)} style={{ ['--i' as string]: 7 }} onClick={onOpenPlatformOffer}>
          <span>
            <small>PLATFORM · OFFER</small>
            <b>{kind === 'AD_HOMES' ? 'Ad breaks and how you earn' : kind === 'BUYERS' ? 'Store prices and how you earn' : 'Prices, plans and account sharing'}</b>
            {offerNote && <em>{offerNote}</em>}
          </span>
          <i aria-hidden="true">→</i>
        </button>
      )}
    </div>
  );
};
