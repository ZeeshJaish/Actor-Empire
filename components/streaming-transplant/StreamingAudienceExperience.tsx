/**
 * EMPIRE+ v2 — AUDIENCE
 *
 * The third division page. Same rule as the others: borrow an interface the
 * player has already used.
 *   ANALYTICS → a creator-analytics dashboard (range chips, stat tiles, one trend)
 *   TOP 10    → the Top 10 chart every streaming app shows — and the payoff of
 *               the very first screen: the rivals from the Wall are in it, and
 *               now so are you
 *   CAMPAIGNS → the Boost / Promote flow, with estimate ranges
 *   REGIONS   → per-territory performance, tied back to the server latency
 *
 * Charting follows the house rules: one axis, a single series needs no legend,
 * colour follows the entity (yours) rather than rank, magnitude is one hue at
 * varying length, and every line chart ships a hover layer.
 */
import css from './presentation/screens/AudienceDesk/AudienceDesk.module.css';
import { cx } from './presentation/cx';
import { brandVars } from './presentation/brand';
import React, { useMemo, useRef, useState } from 'react';
import { Brand, Mark, brandColor } from './StreamingBrandVisuals';
import type {
  OwnedStreamingMarketOperation,
  StreamingEnforcementInvestment,
  StreamingSharingPosture,
  WorldStreamingCustomerAccessPolicy,
} from '../../types';
import type {
  StreamingAudienceCountryView,
  StreamingAudienceMarketView,
  StreamingAudiencePlatformView,
} from '../../services/streamingAudienceMarket';

/* ============================================================
   MODEL
   ============================================================ */
export interface TrendPoint { label: string; value: number }

export interface AudienceMetric {
  id: string; label: string; value: string;
  delta: number;                    // % change, signed
  /** lower is better — churn, latency */
  inverse?: boolean;
  spark: number[];
}

export interface ChartRow {
  rank: number;
  /** last week's rank; undefined means new to the chart */
  prevRank?: number;
  title: string;
  platform: string;
  mine: boolean;
  hue: number;
}

export type Attribution = { id: string; label: string; value: number; note: string };

export interface Campaign {
  id: string; name: string; channel: string;
  spend: number; reachLow: number; reachHigh: number;
  weeksLeft: number; live: boolean;
}

export type RecObjective = 'BALANCED' | 'RETENTION' | 'DISCOVERY' | 'BREAKOUT';

export interface RegionRow {
  id: string; label: string;
  subs: number; sharePct: number; growthPct: number;
  latencyMs: number; rivals: string[];
}

export interface AudienceState {
  live: boolean;
  metrics: AudienceMetric[];
  trend: TrendPoint[];
  trendLabel: string;
  chart: ChartRow[];
  attribution: Attribution[];
  campaigns: Campaign[];
  objective: RecObjective;
  regions: RegionRow[];
  /** The deterministic game-world market behind this ZIP presentation. */
  market?: StreamingAudienceMarketView;
}

type Tab = 'ANALYTICS' | 'TOP 10' | 'CAMPAIGNS' | 'REGIONS' | 'MARKETS';
type Range = '7D' | '28D' | '90D';
type AnalyticsScope = 'PLATFORM' | 'MARKET';
type MarketView = 'OVERVIEW' | 'PEOPLE' | 'SWITCHING' | 'RIVALS';

/* ============================================================
   HELPERS
   ============================================================ */
const money = (n: number) => n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M`
  : n >= 1e3 ? `$${Math.round(n / 1e3)}k` : `$${n}`;
const count = (n: number) => n >= 1e9 ? `${(n / 1e9).toFixed(2)}B`
  : n >= 1e6 ? `${(n / 1e6).toFixed(2)}M`
  : n >= 1e3 ? `${(n / 1e3).toFixed(0)}K` : `${n}`;
const pct = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(1)}%`;
const plainPct = (n: number) => `${n.toFixed(n < 10 ? 1 : 0)}%`;

/** A sparkline: 2px line, no axes, no markers. */
const Spark: React.FC<{ data: number[]; good: boolean }> = ({ data, good }) => {
  const w = 62, h = 20, pad = 2;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / span) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg className={css.spark} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline points={pts} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        stroke={good ? '#4ade80' : '#ff5a5f'} opacity=".9" />
    </svg>
  );
};

const MarketLine: React.FC<{ data: number[]; color: string; label: string }> = ({ data, color, label }) => {
  const w = 320, h = 104, pad = 8;
  const safe = data.length > 1 ? data : [0, data[0] ?? 0];
  const min = Math.min(...safe), max = Math.max(...safe), span = max - min || 1;
  const points = safe.map((value, index) => {
    const x = pad + (index / Math.max(1, safe.length - 1)) * (w - pad * 2);
    const y = h - pad - ((value - min) / span) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg className={css.marketLine} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} preserveAspectRatio="none">
      {[.25, .55, .85].map(row => <line key={row} x1={pad} x2={w - pad} y1={h * row} y2={h * row} />)}
      <polygon points={`${pad},${h - pad} ${points} ${w - pad},${h - pad}`} style={{ fill: color }} />
      <polyline points={points} style={{ stroke: color }} />
      <circle cx={w - pad} cy={Number(points.split(' ').at(-1)?.split(',')[1] ?? h / 2)} r="4" style={{ fill: color }} />
    </svg>
  );
};

const ShareBoard: React.FC<{ shares: StreamingAudienceMarketView['globalWatchShare'] }> = ({ shares }) => (
  <div className={css.shareBoard}>
    <div className={css.shareTrack} role="img" aria-label={shares.map(item => `${item.name} ${plainPct(item.sharePercent)}`).join(', ')}>
      {shares.filter(item => item.sharePercent >= .25).map(item => (
        <i key={item.id} style={{ width: `${item.sharePercent}%`, background: item.color }} />
      ))}
    </div>
    <div className={css.shareKeys}>
      {shares.slice(0, 7).map(item => (
        <div key={item.id}><i style={{ background: item.color }} /><span>{item.name}</span><b>{plainPct(item.sharePercent)}</b></div>
      ))}
    </div>
  </div>
);

const RivalMarketCard: React.FC<{ platform: StreamingAudiencePlatformView }> = ({ platform }) => (
  <article className={css.marketRival} style={{ ['--epx-rival' as string]: platform.color }}>
    <header>
      <i>{platform.shortName.slice(0, 2)}</i>
      <div><span>{platform.id === 'PLAYER' ? 'YOUR POSITION' : 'GLOBAL RIVAL'}</span><b>{platform.name}</b></div>
      <em>{platform.momentum}</em>
    </header>
    <div className={css.rivalNumbers}>
      <div><span>STRENGTH</span><b>{platform.globalStrength}</b></div>
      <div><span>WATCH TIME</span><b>{plainPct(platform.watchSharePercent)}</b></div>
      <div><span>PAID REACH</span><b>{plainPct(platform.householdReachPercent)}</b></div>
    </div>
    <p>{platform.strengthLine}</p>
    <div className={css.rivalMeters}>
      {[
        ['Catalogue', platform.catalogStrength],
        ['Value', platform.valueStrength],
        ['Technology', platform.technologyStrength],
        ['Local fit', platform.localStrength],
      ].map(([label, value]) => (
        <div key={label as string}><span>{label}</span><i><b style={{ width: `${value}%` }} /></i></div>
      ))}
    </div>
    <div className={css.rivalReason}><b>Why viewers stay</b><span>{platform.audienceReason}</span></div>
    <div className={css.rivalWeak}><b>Where they can lose</b><span>{platform.weakSpot}</span></div>
  </article>
);

const CountryMarketCard: React.FC<{ country: StreamingAudienceCountryView; color: string }> = ({ country, color }) => (
  <article className={cx(css.countryMarket, country.selectedForLaunch ? css.openMarket : '')}>
    <header><div><span>{country.regionName}</span><b>{country.country}</b></div><em>{country.selectedForLaunch ? 'OPEN' : 'MARKET'}</em></header>
    <div className={css.countryNumbers}>
      <div><span>VIEWERS</span><b>{count(country.activeViewers)}</b></div>
      <div><span>ADOPTION</span><b>{plainPct(country.streamingAdoptionPercent)}</b></div>
      <div><span>GROWTH</span><b>+{country.annualGrowthPercent}%</b></div>
    </div>
    <MarketLine data={country.trend.map(point => point.value)} color={color} label={`${country.country} active viewer trend`} />
    <div className={css.countryLeader}><span>WATCH-TIME LEADER</span><b>{country.topPlatformName} · {plainPct(country.topPlatformSharePercent)}</b></div>
    <p>{country.audienceReason}</p>
    <details><summary>Market behavior <span>＋</span></summary><div>{country.subscriptionsPerHousehold} paid services per home · {plainPct(country.switchingPercent)} switch in a typical active week.<br />{money(country.averageMonthlyEntertainmentBudget)} monthly entertainment capacity · {count(country.nonParticipantHouseholds)} homes currently outside the commercial market.<br />Streaming reach: {count(country.streamingReachableHouseholds)} homes · cinema reach: {count(country.cinemaReachableHouseholds)} homes · both: {count(country.dualParticipantHouseholds)}.<br />Main barriers: {country.topStreamingBarrier} for streaming · {country.topCinemaBarrier} for cinema.<br />Local pressure: {country.regionalServices.join(' · ')}.</div></details>
  </article>
);

/* ============================================================
   THE PAGE
   ============================================================ */
export const AudienceDesk: React.FC<{
  brand: Brand;
  state: AudienceState;
  onBack: () => void;
  initialTab?: Tab;
  initialAnalyticsScope?: AnalyticsScope;
  initialMarketView?: MarketView;
  onNewCampaign?: () => void;
  onObjective?: (o: RecObjective) => void;
  onOpenRegion?: (r: RegionRow) => void;
  marketOperations?: OwnedStreamingMarketOperation[];
  onManageMarkets?: () => void;
  accessPolicy?: WorldStreamingCustomerAccessPolicy;
  onAccessPolicyChange?: (policy: {
    sharingPosture: StreamingSharingPosture;
    enforcementInvestment: StreamingEnforcementInvestment;
  }) => void;
}> = ({ brand, state, onBack, initialTab, initialAnalyticsScope, initialMarketView, onNewCampaign, onObjective, onOpenRegion, marketOperations = [], onManageMarkets, accessPolicy, onAccessPolicyChange }) => {
  const c = brandColor(brand);
  /* a console chip can open this page straight on the tab it names */
  const [tab, setTab] = useState<Tab>(initialTab ?? 'ANALYTICS');
  const [range, setRange] = useState<Range>('28D');
  const [hover, setHover] = useState<number | null>(null);
  const [analyticsScope, setAnalyticsScope] = useState<AnalyticsScope>(initialAnalyticsScope ?? (state.live ? 'PLATFORM' : 'MARKET'));
  const [marketView, setMarketView] = useState<MarketView>(initialMarketView ?? 'OVERVIEW');
  const [countryRegion, setCountryRegion] = useState<string>('ALL');
  const svgRef = useRef<SVGSVGElement>(null);
  const countryMarketOperations = useMemo(() => marketOperations.filter(operation => operation.scope === 'COUNTRY' && operation.status !== 'EXITED'), [marketOperations]);
  const plannedAudience = countryMarketOperations.reduce((sum, operation) => sum + (operation.countryProfile?.audienceSize || 0), 0);
  const averagePolicyRate = countryMarketOperations.length
    ? countryMarketOperations.reduce((sum, operation) => sum + (operation.policySnapshot?.effectiveTaxPercent || operation.countryProfile?.taxBaselinePercent || 0) + (operation.policySnapshot?.streamingLevyPercent || operation.countryProfile?.streamingLevyBaselinePercent || 0), 0) / countryMarketOperations.length
    : 0;

  /* the visible window of the trend, driven by the range chips */
  const shown = useMemo(() => {
    const n = range === '7D' ? 7 : range === '28D' ? 28 : state.trend.length;
    return state.trend.slice(-n);
  }, [state.trend, range]);

  const geom = useMemo(() => {
    const w = 320, h = 132, l = 6, r = 6, t = 10, b = 20;
    const vals = shown.map(p => p.value);
    const min = Math.min(...vals), max = Math.max(...vals);
    const lo = min - (max - min) * 0.18, hi = max + (max - min) * 0.12;
    const span = hi - lo || 1;
    const x = (i: number) => l + (i / Math.max(1, shown.length - 1)) * (w - l - r);
    const y = (v: number) => t + (1 - (v - lo) / span) * (h - t - b);
    const line = shown.map((p, i) => `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
    const area = `${l},${h - b} ${line} ${w - r},${h - b}`;
    return { w, h, b, x, y, line, area };
  }, [shown]);

  const onMove = (e: React.PointerEvent) => {
    const el = svgRef.current; if (!el) return;
    const box = el.getBoundingClientRect();
    const rel = ((e.clientX - box.left) / box.width) * geom.w;
    const i = Math.round(((rel - 6) / (geom.w - 12)) * (shown.length - 1));
    setHover(Math.max(0, Math.min(shown.length - 1, i)));
  };

  const totalAttr = state.attribution.reduce((a, x) => a + x.value, 0) || 1;
  const climbing = state.chart.filter(r => r.mine).length;
  const market = state.market;
  const countries = useMemo(() => {
    if (!market) return [];
    return countryRegion === 'ALL' ? market.countries : market.countries.filter(country => country.regionId === countryRegion);
  }, [market, countryRegion]);
  const countryRegions = useMemo(() => market
    ? Array.from(new Map(market.countries.map(country => [country.regionId, country.regionName])).entries())
    : [], [market]);
  const marketTrend = market?.globalTrend.map(point => point.activeViewers) ?? [];

  return (
    <div className={css.ad} data-epx-root style={brandVars(brand)}>
      <div className={css.adtop}>
        <button className={css.adback} onClick={onBack} aria-label="Back">←</button>
        <div className={css.adtitle}>
          <b>AUDIENCE</b>
          <span>ANALYTICS · CHART · GROWTH</span>
        </div>
        <span className={css.admark}><Mark brand={brand} /></span>
      </div>

      <div className={css.adstats}>
        <div><span>SUBSCRIBERS</span><b>{state.metrics[0]?.value ?? '—'}</b></div>
        <div><span>ON CHART</span><b className={climbing ? css.good : ''}>{climbing}</b></div>
        <div><span>CAMPAIGNS</span><b>{state.campaigns.filter(x => x.live).length}</b></div>
        <div><span>REGIONS</span><b>{state.regions.length}</b></div>
      </div>

      <div className={css.adtabs}>
        {(['ANALYTICS', 'TOP 10', 'CAMPAIGNS', 'REGIONS', 'MARKETS'] as Tab[]).map(t => (
          <button key={t} className={tab === t ? css.on : ''} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <div className={css.adscroll}>

        {/* ── ANALYTICS ── */}
        {tab === 'ANALYTICS' && (
          <>
            <div className={css.analyticsScope} aria-label="Analytics scope">
              <button className={analyticsScope === 'PLATFORM' ? css.on : ''} onClick={() => setAnalyticsScope('PLATFORM')} disabled={!state.live}>
                <span>YOUR PLATFORM</span><small>{state.live ? 'Performance' : 'After launch'}</small>
              </button>
              <button className={analyticsScope === 'MARKET' ? css.on : ''} onClick={() => setAnalyticsScope('MARKET')}>
                <span>STREAMING MARKET</span><small>Industry</small>
              </button>
            </div>

            {analyticsScope === 'PLATFORM' && !state.live ? (
              <div className={css.adpending}>
                <b>No audience data yet</b>
                <span>Your performance appears after launch. The Streaming Market is already available for planning.</span>
                <button type="button" onClick={() => setAnalyticsScope('MARKET')}>SEE THE STREAMING MARKET →</button>
              </div>
            ) : analyticsScope === 'PLATFORM' ? (
              <>
                {/* filters in one row, above the charts */}
                <div className={css.ranges}>
                  {(['7D', '28D', '90D'] as Range[]).map(r => (
                    <button key={r} className={range === r ? css.on : ''} onClick={() => setRange(r)}>{r}</button>
                  ))}
                </div>

                <div className={css.tiles}>
                  {state.metrics.map(m => {
                    const good = m.inverse ? m.delta <= 0 : m.delta >= 0;
                    return (
                      <div className={css.tile} key={m.id}>
                        <span className={css.tlabel}>{m.label}</span>
                        <b className={css.tval}>{m.value}</b>
                        <div className={css.trow}>
                          <em className={good ? css.up : css.down}>{pct(m.delta)}</em>
                          <Spark data={m.spark} good={good} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* one series, one axis — the title names it, so no legend box */}
                <section className={css.adsec}>
                  <div className={css.adhead}>
                    <h2>{state.trendLabel}</h2>
                    <span>{range === '90D' ? 'last 90 days' : `last ${range === '7D' ? 7 : 28} days`}</span>
                  </div>
                  <div className={css.chartwrap}>
                    <svg ref={svgRef} className={css.trendchart} viewBox={`0 0 ${geom.w} ${geom.h}`}
                      onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
                      <defs>
                        <linearGradient id="adfill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={c} stopOpacity=".34" />
                          <stop offset="100%" stopColor={c} stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {/* recessive grid */}
                      {[0, .33, .66, 1].map(f => (
                        <line key={f} x1="6" x2={geom.w - 6}
                          y1={10 + f * (geom.h - 30)} y2={10 + f * (geom.h - 30)}
                          stroke="#fff" strokeOpacity=".07" strokeWidth="1" />
                      ))}
                      <polygon points={geom.area} fill="url(#adfill)" />
                      <polyline points={geom.line} fill="none" stroke={c}
                        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      {hover !== null && (
                        <>
                          <line x1={geom.x(hover)} x2={geom.x(hover)} y1="10" y2={geom.h - geom.b}
                            stroke="#fff" strokeOpacity=".3" strokeWidth="1" />
                          <circle cx={geom.x(hover)} cy={geom.y(shown[hover].value)} r="5"
                            fill={c} stroke="#050609" strokeWidth="2" />
                        </>
                      )}
                      {/* the last point is direct-labelled — never a number on every point */}
                      <circle cx={geom.x(shown.length - 1)} cy={geom.y(shown[shown.length - 1].value)} r="4"
                        fill={c} stroke="#050609" strokeWidth="2" />
                    </svg>
                    {hover !== null && (
                      <div className={css.tip} style={{ left: `${(geom.x(hover) / geom.w) * 100}%` }}>
                        <b>{count(shown[hover].value)}</b>
                        <span>{shown[hover].label}</span>
                      </div>
                    )}
                    <div className={css.axis}>
                      <span>{shown[0]?.label}</span>
                      <span>{shown[shown.length - 1]?.label}</span>
                    </div>
                  </div>
                </section>

                {/* attribution as small multiples of one magnitude — no rainbow needed */}
                <section className={css.adsec}>
                  <div className={css.adhead}>
                    <h2>What moved it</h2>
                    <span>this week's net adds</span>
                  </div>
                  {state.attribution.map(a => (
                    <div className={css.attr} key={a.id}>
                      <div className={css.attrtop}>
                        <b>{a.label}</b>
                        <em>{count(a.value)}</em>
                      </div>
                      <div className={css.attrbar}>
                        <i style={{ width: `${Math.max(2, (a.value / totalAttr) * 100)}%` }} />
                      </div>
                      <span className={css.attrnote}>{a.note}</span>
                    </div>
                  ))}
                </section>
              </>
            ) : market ? (
              <>
                <div className={css.marketTabs} aria-label="Streaming market views">
                  {([
                    ['OVERVIEW', 'Overview'],
                    ['PEOPLE', 'People'],
                    ['SWITCHING', 'Switching'],
                    ['RIVALS', 'Rivals'],
                  ] as [MarketView, string][]).map(([id, label]) => (
                    <button key={id} className={marketView === id ? css.on : ''} onClick={() => setMarketView(id)}>{label}</button>
                  ))}
                </div>

                {marketView === 'OVERVIEW' && (
                  <>
                    <section className={css.marketHero}>
                      <span>THE LIVING MARKET · WK {market.generatedAtAbsoluteWeek}</span>
                      <strong>{count(market.activeViewers)}</strong>
                      <h2>active streaming viewers</h2>
                      <p>{count(market.globalPopulation)} people · {plainPct(market.streamingAdoptionPercent)} adoption</p>
                    </section>
                    <div className={css.marketKpis}>
                      <div><span>PAYING HOMES</span><b>{count(market.payingHouseholds)}</b></div>
                      <div><span>PAID SUBSCRIPTIONS</span><b>{count(market.paidSubscriptions)}</b></div>
                      <div><span>SUBS / HOME</span><b>{market.subscriptionsPerHousehold}</b></div>
                      <div><span>WATCH HOURS / WK</span><b>{count(market.weeklyWatchHours)}</b></div>
                      <div><span>HOUSEHOLD BUDGET</span><b>{money(market.householdEconomy.averageMonthlyEntertainmentBudget)}/mo</b></div>
                      <div><span>OUTSIDE MARKET</span><b>{count(market.householdEconomy.nonParticipantHouseholds)}</b></div>
                    </div>
                    <p className={css.marketExplain}>This is spending capacity, not automatic streaming revenue. Every service still has to win a place in the household budget.</p>
                    <section className={css.adsec}>
                      <div className={css.adhead}><h2>Subscription competition</h2><span>{market.streamingCompetition.offerCount} active offers</span></div>
                      <div className={css.marketKpis}>
                        <div><span>HOMES WON</span><b>{count(market.streamingCompetition.playerHouseholds)}</b></div>
                        <div><span>UNCLAIMED HOMES</span><b>{count(market.streamingCompetition.unclaimedHouseholds)}</b></div>
                        <div><span>EFFECTIVE PRICE</span><b>{money(market.streamingCompetition.playerEffectiveMonthlyPrice)}/mo</b></div>
                        <div><span>YOUR PLAN MIX</span><b>{market.streamingCompetition.playerPlanAllocations.length || '—'}</b></div>
                      </div>
                      {market.streamingCompetition.playerPlanAllocations.length > 0 && (
                        <div className={css.overlapGrid}>
                          {market.streamingCompetition.playerPlanAllocations.map(plan => (
                            <div key={plan.planId}><strong>{count(plan.households)}</strong><span>{plan.planName} · {money(plan.effectiveMonthlyPrice)}</span></div>
                          ))}
                        </div>
                      )}
                      <p className={css.marketExplain}>Every active service competes for the same finite country households. Price, plan fit, catalogue, localization and trust decide who wins; homes may still choose nobody.</p>
                    </section>
                    <section className={css.adsec}>
                      <div className={css.adhead}><h2>Paid audience and access</h2><span>{market.customerAccess.available ? 'canonical customers' : 'forecast'}</span></div>
                      <div className={css.marketKpis}>
                        <div><span>PAID ACCOUNTS</span><b>{count(market.customerAccess.paidAccounts)}</b></div>
                        <div><span>PAYING HOMES</span><b>{count(market.customerAccess.payingHouseholds)}</b></div>
                        <div><span>SHARED ACCESS</span><b>{count(market.customerAccess.externalSharedHouseholds)}</b></div>
                        <div><span>PIRACY REACH</span><b>{count(market.customerAccess.piracyReach)}</b></div>
                        <div><span>ACCESS LOAD</span><b>{count(market.customerAccess.accessLoadAccounts)}</b></div>
                        <div><span>MONTHLY SUBS</span><b>{money(market.customerAccess.monthlySubscriptionRevenue)}</b></div>
                      </div>
                      <p className={css.marketExplain}>Only paid accounts create subscription revenue. Shared viewers still use delivery capacity; piracy is reach outside the paid service.</p>
                      {accessPolicy && onAccessPolicyChange ? (
                        <div className={css.accessPolicy}>
                          <div>
                            <span>SHARING POSTURE</span>
                            <div className={css.marketTabs}>
                              {([
                                ['REACH_FIRST', 'Reach first'],
                                ['BALANCED', 'Balanced'],
                                ['HOUSEHOLD_ONLY', 'Household only'],
                              ] as [StreamingSharingPosture, string][]).map(([id, label]) => (
                                <button key={id} type="button" className={accessPolicy.sharingPosture === id ? css.on : ''} onClick={() => onAccessPolicyChange({ sharingPosture: id, enforcementInvestment: accessPolicy.enforcementInvestment })}>{label}</button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <span>ENFORCEMENT</span>
                            <div className={css.marketTabs}>
                              {([
                                ['LIGHT', 'Light'],
                                ['STANDARD', 'Standard'],
                                ['AGGRESSIVE', 'Aggressive'],
                              ] as [StreamingEnforcementInvestment, string][]).map(([id, label]) => (
                                <button key={id} type="button" className={accessPolicy.enforcementInvestment === id ? css.on : ''} onClick={() => onAccessPolicyChange({ sharingPosture: accessPolicy.sharingPosture, enforcementInvestment: id })}>{label}</button>
                              ))}
                            </div>
                          </div>
                          <small>{accessPolicy.source === 'LEADERSHIP_DEFAULT' ? 'Leadership default. Choosing a control makes this a direct player policy.' : 'Direct player policy.'}</small>
                        </div>
                      ) : null}
                    </section>
                    <section className={css.adsec}>
                      <div className={css.adhead}><h2>Where households can participate</h2><span>industry access</span></div>
                      <div className={css.marketKpis}>
                        <div><span>STREAMING REACH</span><b>{count(market.industryParticipation.streamingReachableHouseholds)}</b></div>
                        <div><span>CINEMA REACH</span><b>{count(market.industryParticipation.cinemaReachableHouseholds)}</b></div>
                        <div><span>BOTH</span><b>{count(market.industryParticipation.dualParticipantHouseholds)}</b></div>
                        <div><span>NEITHER</span><b>{count(market.industryParticipation.neitherHouseholds)}</b></div>
                      </div>
                      <p className={css.marketExplain}>This is market potential, not automatic customers or revenue. Streaming and cinema still have to win attention and a place in each household budget.</p>
                    </section>
                    <section className={css.adsec}>
                      <div className={css.adhead}><h2>Streaming adoption</h2><span>last 52 game weeks</span></div>
                      <MarketLine data={marketTrend} color={c} label="Global active streaming viewers over the last 52 game weeks" />
                      <div className={css.marketAxis}><span>52 weeks ago</span><span>{count(market.activeViewers)} now</span></div>
                    </section>
                    <section className={css.adsec}>
                      <div className={css.adhead}><h2>Who owns watch time?</h2><span>all services</span></div>
                      <p className={css.marketExplain}>Viewing time is different from subscriber count. Free and local services can win attention without owning the household bill.</p>
                      <ShareBoard shares={market.globalWatchShare} />
                    </section>
                    <section className={css.adsec}>
                      <div className={css.adhead}><h2>One home, many subscriptions</h2><span>subscriber overlap</span></div>
                      <div className={css.overlapGrid}>
                        <div><strong>{plainPct(market.subscriberOverlap.oneServicePercent)}</strong><span>one service</span></div>
                        <div><strong>{plainPct(market.subscriberOverlap.twoServicesPercent)}</strong><span>two services</span></div>
                        <div><strong>{plainPct(market.subscriberOverlap.threePlusPercent)}</strong><span>three or more</span></div>
                      </div>
                      <p className={css.marketCallout}>You do not always need to replace Netflix. Winning the second subscription slot can be the first victory.</p>
                    </section>
                  </>
                )}

                {marketView === 'PEOPLE' && (
                  <section className={css.adsec}>
                    <div className={css.adhead}><h2>Why people subscribe</h2><span>audience personas</span></div>
                    <p className={css.marketExplain}>Each group reacts differently to price, originals, localization and release gaps.</p>
                    <div className={css.personaList}>
                      {market.personas.map((persona, index) => (
                        <article key={persona.id} style={{ ['--epx-persona' as string]: persona.color }}>
                          <div className={css.personaTop}><i>0{index + 1}</i><div><span>{plainPct(persona.sharePercent)} · {count(persona.activeViewers)} viewers</span><b>{persona.name}</b></div><em>{persona.switchSensitivity} RISK</em></div>
                          <p>{persona.need}</p>
                          <div className={css.personaFacts}><span>{persona.weeklyHours}h / week</span><span>{persona.subscriptionsPerHousehold} services</span><span>{money(persona.averageMonthlyEntertainmentBudget)} monthly capacity</span><span>Best fit: {persona.bestFitPlatform}</span></div>
                          <div className={css.personaLeave}><b>Leaves when</b><span>{persona.leavesWhen}</span></div>
                        </article>
                      ))}
                    </div>
                  </section>
                )}

                {marketView === 'SWITCHING' && (
                  <>
                    <section className={css.switchHero}>
                      <span>THIS WEEK</span><strong>{count(market.switching.globalSwitchPool)}</strong><h2>viewers are willing to move</h2>
                    </section>
                    <div className={css.switchNumbers}>
                      <div className={css.positive}><span>JOINED</span><b>{state.live ? `+${count(market.switching.joinedThisWeek)}` : 'PRE-LAUNCH'}</b></div>
                      <div className={css.negative}><span>CANCELLED</span><b>{state.live ? `−${count(market.switching.cancelledThisWeek)}` : 'PRE-LAUNCH'}</b></div>
                      <div><span>RETURNED</span><b>{state.live ? count(market.switching.reactivatedThisWeek) : 'PRE-LAUNCH'}</b></div>
                    </div>
                    <section className={css.adsec}>
                      <div className={css.adhead}><h2>Plan movement</h2><span>paid accounts</span></div>
                      <div className={css.marketKpis}>
                        <div><span>UPGRADES</span><b>{count(market.switching.upgradedThisWeek)}</b></div>
                        <div><span>DOWNGRADES</span><b>{count(market.switching.downgradedThisWeek)}</b></div>
                        <div><span>SWITCHED IN</span><b>{count(market.customerAccess.switchIns)}</b></div>
                        <div><span>SWITCHED OUT</span><b>{count(market.customerAccess.switchOuts)}</b></div>
                      </div>
                    </section>
                    <section className={css.adsec}>
                      <div className={css.adhead}><h2>Why homes move</h2><span>{state.live ? `${plainPct(market.switching.playerChurnPercent)} player churn` : 'market pressure'}</span></div>
                      {market.switching.reasons.map(reason => (
                        <div className={css.switchReason} key={reason.id}>
                          <div><b>{reason.label}</b><em>{plainPct(reason.sharePercent)}</em></div>
                          <span><i style={{ width: `${reason.sharePercent}%` }} /></span>
                          <p>{reason.detail}</p>
                        </div>
                      ))}
                    </section>
                  </>
                )}

                {marketView === 'RIVALS' && (
                  <section className={css.adsec}>
                    <div className={css.adhead}><h2>Rival strength</h2><span>more than subscribers</span></div>
                    <p className={css.marketExplain}>Catalogue, value, technology and local fit explain why each platform wins—and where it can lose.</p>
                    <div className={css.marketRivalList}>{market.platforms.map(platform => <RivalMarketCard key={platform.id} platform={platform} />)}</div>
                  </section>
                )}
              </>
            ) : (
              <div className={css.adpending}><b>Market data unavailable</b><span>The living-market simulation will appear when this save is ready.</span></div>
            )}
          </>
        )}

        {/* ── TOP 10 — the Wall of Screens, settled into a chart ── */}
        {tab === 'TOP 10' && (
          <section className={css.adsec}>
            <div className={css.adhead}>
              <h2>Top 10 today</h2>
              <span>all platforms</span>
            </div>
            <div className={css.chartlist}>
              {state.chart.map(row => {
                const move = row.prevRank === undefined ? 0 : row.prevRank - row.rank;
                return (
                  <div className={cx(css.crow, (row.mine ? css.mine : ''))} key={`${row.rank}-${row.title}`}>
                    <span className={css.crank}>{row.rank}</span>
                    <span className={cx(css.cmove, (move > 0 ? ' up' : move < 0 ? ' down' : row.prevRank === undefined ? css.new : ''))}>
                      {row.prevRank === undefined ? 'NEW' : move > 0 ? `▲${move}` : move < 0 ? `▼${-move}` : '—'}
                    </span>
                    <span className={css.cart} style={{ ['--epx-ad-h' as string]: `${row.hue}` }} />
                    <div className={css.cinfo}>
                      <b>{row.title}</b>
                      <span>{row.platform}</span>
                    </div>
                    {/* identity is never colour alone — yours is labelled too */}
                    {row.mine && <i className={css.youpill}>YOU</i>}
                  </div>
                );
              })}
            </div>
            <div className={css.adnote}>
              Every screen on the wall is in this chart. {climbing === 0
                ? 'None of them are yours yet.'
                : `${climbing} of them ${climbing === 1 ? 'is' : 'are'} yours.`}
            </div>
          </section>
        )}

        {/* ── CAMPAIGNS — the Boost / Promote pattern ── */}
        {tab === 'CAMPAIGNS' && (
          <>
            <section className={css.adsec}>
              <div className={css.adhead}>
                <h2>Campaigns</h2>
                <button className={css.adadd} onClick={onNewCampaign}>+ NEW</button>
              </div>
              {state.campaigns.length === 0 && <div className={css.adempty}>Nothing running.</div>}
              {state.campaigns.map(k => (
                <div className={cx(css.camp, (k.live ? css.live : ''))} key={k.id}>
                  <div className={css.camptop}>
                    <div className={css.campid}>
                      <b>{k.name}</b>
                      <span>{k.channel}</span>
                    </div>
                    <i className={cx(css.campstate, (k.live ? css.on : ''))}>{k.live ? 'RUNNING' : 'DRAFT'}</i>
                  </div>
                  <div className={css.campfoot}>
                    <div><span>SPEND</span><em>{money(k.spend)}</em></div>
                    {/* an estimate is a range, and says so */}
                    <div><span>EST. REACH</span><em>{count(k.reachLow)}–{count(k.reachHigh)}</em></div>
                    <div className={css.right}>
                      <span>{k.live ? 'ENDS' : 'RUNS'}</span>
                      <em>{k.live ? `${k.weeksLeft}w` : 'NOT STARTED'}</em>
                    </div>
                  </div>
                </div>
              ))}
            </section>

            <section className={css.adsec}>
              <div className={css.adhead}>
                <h2>Recommendation engine</h2>
                <span>what the algorithm optimises for</span>
              </div>
              <div className={css.objgrid}>
                {([
                  ['BALANCED', 'Balanced', 'Steady growth, no side effects'],
                  ['RETENTION', 'Retention', 'Keep the people you already have'],
                  ['DISCOVERY', 'Catalogue discovery', 'Push the back catalogue, spread watch time'],
                  ['BREAKOUT', 'Breakout creation', 'Bet everything on making one title huge'],
                ] as [RecObjective, string, string][]).map(([id, label, note]) => (
                  <button key={id} className={cx(css.obj, (state.objective === id ? css.on : ''))}
                    onClick={() => onObjective?.(id)}>
                    <b>{label}</b>
                    <span>{note}</span>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ── REGIONS ── */}
        {tab === 'REGIONS' && (
          <>
            <section className={css.adsec}>
              <div className={css.adhead}><h2>Territories</h2><span>{state.live ? 'your platform' : 'opening footprint'}</span></div>
              {state.regions.map(r => (
                <button className={css.reg} key={r.id} onClick={() => onOpenRegion?.(r)}>
                  <div className={css.regtop}><b>{r.label}</b><em className={r.growthPct >= 0 ? css.up : css.down}>{pct(r.growthPct)}</em></div>
                  <div className={css.regbar}><i style={{ width: `${Math.max(2, r.sharePct * 6)}%` }} /></div>
                  <div className={css.regfoot}>
                    <div><span>SUBSCRIBERS</span><em>{count(r.subs)}</em></div>
                    <div><span>SHARE</span><em>{r.sharePct.toFixed(1)}%</em></div>
                    <div className={css.right}><span>LATENCY</span><em className={r.latencyMs > 120 ? css.bad : r.latencyMs > 60 ? css.warn : css.good}>{r.latencyMs}ms</em></div>
                  </div>
                  {r.rivals.length > 0 && <div className={css.regrivals}>Contested by {r.rivals.join(', ')}</div>}
                </button>
              ))}
            </section>
            {market && (
              <section className={css.adsec}>
                <div className={css.adhead}><h2>Country markets</h2><span>living industry data</span></div>
                <div className={css.countryFilters}>
                  <button className={countryRegion === 'ALL' ? css.on : ''} onClick={() => setCountryRegion('ALL')}>World</button>
                  {countryRegions.map(([id, label]) => <button key={id} className={countryRegion === id ? css.on : ''} onClick={() => setCountryRegion(id)}>{label}</button>)}
                </div>
                <div className={css.countryMarketList}>{countries.map(country => <CountryMarketCard key={country.id} country={country} color={c} />)}</div>
              </section>
            )}
          </>
        )}

        {/* Markets owns territory entry and expansion. Regions remains analytics. */}
        {tab === 'MARKETS' && (
          <>
            <section className={css.marketOpsHero}>
              <span>MARKET OPERATIONS</span>
              <strong>{countryMarketOperations.filter(operation => operation.status === 'ACTIVE').length}</strong>
              <h2>countries live</h2>
              <p>{countryMarketOperations.filter(operation => ['PLANNED', 'AWAITING_FUNDING', 'CLEARANCE', 'INFRASTRUCTURE_PREPARATION', 'READY'].includes(operation.status)).length} entries moving toward launch</p>
              <div className={css.marketOpsPulse}>
                <div><small>REACH IN PLAY</small><b>{count(plannedAudience)}</b></div>
                <div><small>AVG TAX + LEVY</small><b>{averagePolicyRate.toFixed(1)}%</b></div>
                <div><small>OPEN FILES</small><b>{countryMarketOperations.filter(operation => operation.status === 'CLEARANCE' || operation.status === 'AWAITING_FUNDING').length}</b></div>
              </div>
              <button type="button" onClick={onManageMarkets}>ENTER A NEW MARKET →</button>
            </section>
            <section className={css.adsec}>
              <div className={css.adhead}><h2>Country portfolio</h2><span>one living record per market</span></div>
              <div className={css.marketOpsList}>
                {countryMarketOperations.length ? countryMarketOperations.map(operation => (
                  <details key={operation.id} className={css.marketOpsFile}>
                    <summary>
                      <span><b>{operation.countryProfile?.country || operation.countryId || operation.scopeId}</b><small>{operation.entryKind === 'OPENING' ? 'Opening territory' : 'Expansion'} · {count(operation.countryProfile?.audienceSize || 0)} viewers</small></span>
                      <em className={css[`status${operation.status}`] || ''}>{operation.status.replaceAll('_', ' ')}</em>
                    </summary>
                    <div className={css.marketOpsDetail}>
                      {operation.clearance && <div className={css.marketOpsReview}><span><small>REVIEW STAGE</small><b>{operation.clearance.stage.replaceAll('_', ' ')}</b></span><strong>{Math.round(operation.clearance.progressPercent)}%</strong><i><b style={{ width: `${operation.clearance.progressPercent}%` }} /></i></div>}
                      <div className={css.marketOpsTerms}>
                        <span><small>TAX</small><b>{operation.policySnapshot?.effectiveTaxPercent ?? operation.countryProfile?.taxBaselinePercent ?? 0}%</b></span>
                        <span><small>LEVY</small><b>{operation.policySnapshot?.streamingLevyPercent ?? operation.countryProfile?.streamingLevyBaselinePercent ?? 0}%</b></span>
                        <span><small>LOCAL</small><b>{operation.policySnapshot?.localContentObligationPercent ?? operation.countryProfile?.localContentObligationPercent ?? 0}%</b></span>
                      </div>
                      <p>{operation.clearance?.condition || `${operation.countryProfile?.localizationPreference.replaceAll('_', ' ').toLowerCase() || 'mixed'} audience preference · ${operation.countryProfile?.privacyComplianceLevel || 'standard'} privacy review.`}</p>
                      {operation.policySnapshot && <small className={css.marketOpsElection}>NEXT POLICY CYCLE · WEEK {operation.policySnapshot.nextElectionAtAbsoluteWeek}</small>}
                    </div>
                  </details>
                )) : <div className={css.adpending}><b>No market entries yet</b><span>Evaluate countries and create your first expansion plan.</span></div>}
              </div>
            </section>
          </>
        )}

        <div className={css.adfoot} />
      </div>
    </div>
  );
};

/* ============================================================
   STYLES
   ============================================================ */
/* Styles now live in presentation/screens/AudienceDesk/AudienceDesk.module.css */
