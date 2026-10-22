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
import atlas from './presentation/screens/AudienceDesk/AudienceAtlas.module.css';
import { cx } from './presentation/cx';
import { brandVars } from './presentation/brand';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Brand, Mark, brandColor, hslHex } from './StreamingBrandVisuals';
import { AudienceAtlas } from './AudienceAtlas';
import { AudienceCountrySheet } from './AudienceCountrySheet';
import { AccessBoard, CountryRows, MarketFunnel, MarketPulse, RegionRail, RegionTiles, TopCountryRail, WinnersBoard, type CountryRowItem, type TopCountryCard } from './AudiencePanels';
import { ENFORCEMENT_WORDS, SHARING_POSTURE_WORDS } from './SharingPolicyCard';
import { AudienceMarketEntry, type MarketEntryActions } from './AudienceMarketEntry';
import {
  AUDIENCE_WORDS,
  buildAtlasCountries,
  compact,
  formatShare,
  sharesOf,
  signedCompact,
  summariseRegions,
  type AtlasCountry,
  type AtlasRegionId,
  type AudienceKind,
} from './audienceAtlasModel';
import type {
  OwnedStreamingMarketOperation,
  WorldStreamingCustomerAccessPolicy,
} from '../../types';
import type {
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
/* Map-led tabs first: what is happening, where you stand, by continent; then
   the levers and the chart. */
const TAB_ORDER: Tab[] = ['ANALYTICS', 'MARKETS', 'REGIONS', 'CAMPAIGNS', 'TOP 10'];
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
/** A home's monthly entertainment budget: dollars, with cents only when they matter. */
const budgetLabel = (n: number) => `$${n >= 100 ? Math.round(n) : n.toFixed(1)}`;

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
  initialMapSelection?: { regionId: string | null; countryId: string | null };
  onNavigationChange?: (navigation: { tab: Tab; regionId: string | null; countryId: string | null }) => void;
  initialEntry?: { tab: 'CHOOSE' | 'CLEARANCE' } | null;
  onEntryClose?: () => void;
  onNewCampaign?: () => void;
  onObjective?: (o: RecObjective) => void;
  /** Kept for callers; regions now open in place on the Regions tab. */
  onOpenRegion?: (r: RegionRow) => void;
  marketOperations?: OwnedStreamingMarketOperation[];
  /** Before launch: opens the opening-markets step of Define the Launch. */
  onManageMarkets?: () => void;
  /** After launch: the purse and canonical actions behind the Enter New Markets page. */
  marketEntry?: MarketEntryActions;
  /** Named on the link to the Platform room, where the policy is changed. */
  accessPolicy?: WorldStreamingCustomerAccessPolicy;
  /** Opens the Platform room's Offer page (prices, plans, account sharing). */
  onOpenPlatformOffer?: () => void;
}> = ({ brand, state, onBack, initialTab, initialAnalyticsScope, initialMarketView, initialMapSelection, onNavigationChange, initialEntry, onEntryClose, onNewCampaign, onObjective, marketOperations = [], onManageMarkets, marketEntry, accessPolicy, onOpenPlatformOffer }) => {
  const c = brandColor(brand);
  /* After launch, entering a market happens on this room's own page. */
  const [entry, setEntry] = useState<{ picked: string[]; region: AtlasRegionId | null; tab?: 'CHOOSE' | 'CLEARANCE' } | null>(() => initialEntry && state.live && marketEntry ? { picked: [], region: initialMapSelection?.regionId as AtlasRegionId || null, tab: initialEntry.tab } : null);
  const canEnterHere = state.live && Boolean(marketEntry);
  const setEntryPicked = useCallback((update: (current: string[]) => string[]) => (
    setEntry(current => (current ? { ...current, picked: update(current.picked) } : current))
  ), []);
  /* a console chip can open this page straight on the tab it names */
  const [tab, setTab] = useState<Tab>(initialTab ?? 'ANALYTICS');
  const [range, setRange] = useState<Range>('28D');
  const [hover, setHover] = useState<number | null>(null);
  const [analyticsScope, setAnalyticsScope] = useState<AnalyticsScope>(initialAnalyticsScope ?? (state.live ? 'PLATFORM' : 'MARKET'));
  const [marketView, setMarketView] = useState<MarketView>(initialMarketView ?? 'OVERVIEW');
  /* The living map: one camera for the room, one open country card. */
  const [focusRegion, setFocusRegion] = useState<AtlasRegionId | null>(initialMapSelection?.regionId as AtlasRegionId || null);
  const [openCountryId, setOpenCountryId] = useState<string | null>(initialMapSelection?.countryId || null);
  const navigationRef = useRef(onNavigationChange); navigationRef.current = onNavigationChange;
  useEffect(() => { navigationRef.current?.({ tab, regionId: focusRegion, countryId: openCountryId }); }, [tab, focusRegion, openCountryId]);
  const [showAllCountries, setShowAllCountries] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const countryMarketOperations = useMemo(() => marketOperations.filter(operation => operation.scope === 'COUNTRY' && operation.status !== 'EXITED'), [marketOperations]);
  const plannedAudience = countryMarketOperations.reduce((sum, operation) => sum + (operation.countryProfile?.audienceSize || 0), 0);

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
  const marketTrend = market?.globalTrend.map(point => point.activeViewers) ?? [];

  /* ── the living map's model: every country, where you stand in it ── */
  const accentHex = useMemo(() => hslHex(brand.hue, brand.sat, 58), [brand.hue, brand.sat]);
  const atlasCountries = useMemo(() => buildAtlasCountries(market?.worldCountries, marketOperations), [market, marketOperations]);
  const atlasRegions = useMemo(() => summariseRegions(atlasCountries), [atlasCountries]);
  const regionById = useMemo(() => new Map(atlasRegions.map(region => [region.id, region])), [atlasRegions]);
  const focusSummary = focusRegion ? regionById.get(focusRegion) : undefined;
  const scoped = useMemo(() => (focusRegion ? atlasCountries.filter(country => country.regionId === focusRegion) : atlasCountries), [atlasCountries, focusRegion]);
  const liveCountries = atlasCountries.filter(country => country.state === 'LIVE');
  const openingCountries = atlasCountries.filter(country => country.state === 'OPENING');
  const pausedCountries = atlasCountries.filter(country => country.state === 'PAUSED');
  const openGroundCount = Math.max(0, atlasCountries.length - liveCountries.length - openingCountries.length - pausedCountries.length);
  /* "Your audience" in the words of the business model: paid accounts for a
     subscription service, homes watching free for an ad-supported one, buyers
     for a rent-or-buy store (see AUDIENCE_WORDS). */
  const audienceKind: AudienceKind = market?.playerModel.primary ?? 'ACCOUNTS';
  const words = AUDIENCE_WORDS[audienceKind];
  const subscriptionModel = audienceKind === 'ACCOUNTS';
  const playerAudienceTotal = atlasCountries.reduce((sum, country) => sum + country.view.playerAudience, 0);
  const playerNetTotal = atlasCountries.reduce((sum, country) => sum + country.view.playerNetChange, 0);
  const revenueOf = (list: AtlasCountry[]) => list.reduce((sum, country) => sum + country.view.playerMonthlyRevenueTotal, 0);
  const commercial = market?.playerCommercial;
  const settledNote = (text: string) => (commercial?.available ? text : 'settles next week');
  const modelTiles = !commercial ? [] : audienceKind === 'AD_HOMES' ? [
    { label: 'HOMES WATCHING', value: compact(commercial.adHouseholds), note: settledNote('free with ads, this week') },
    { label: 'AD IMPRESSIONS', value: compact(commercial.adImpressions), note: settledNote('ads served this week') },
    { label: 'AD REVENUE', value: `$${compact(commercial.adRevenueWeekly)}`, note: settledNote('this week') },
    { label: 'HOURS WATCHED', value: compact(commercial.hoursViewed), note: settledNote('on your service') },
  ] : [
    { label: 'BUYERS', value: compact(commercial.storeBuyers), note: settledNote('this week') },
    { label: 'RENTALS', value: compact(commercial.rentals), note: settledNote('this week') },
    { label: 'PURCHASES', value: compact(commercial.purchases), note: settledNote('this week') },
    { label: 'STORE REVENUE', value: `$${compact(commercial.storeRevenueWeekly)}`, note: settledNote('this week') },
  ];
  const alsoEarning = subscriptionModel && commercial?.available ? [
    ...(market?.playerModel.ads ? [{ label: 'from ads', value: `$${compact(commercial.adRevenueWeekly)}` }] : []),
    ...(market?.playerModel.store ? [{ label: 'from the store', value: `$${compact(commercial.storeRevenueWeekly)}` }] : []),
    ...(commercial.otherRevenueWeekly > 0 ? [{ label: 'passes and add-ons', value: `$${compact(commercial.otherRevenueWeekly)}` }] : []),
  ] : [];
  const worldShares = useMemo(() => sharesOf(atlasCountries.map(country => country.view)), [atlasCountries]);
  const youShare = worldShares.shares.find(item => item.id === 'PLAYER');
  /* The homes that pay you: from the customer ledger once a week has settled,
     the same ledger as the industry's paying homes above it in the funnel. */
  const yourHomes = market
    ? (market.customerAccess.available ? market.customerAccess.payingHouseholds : market.streamingCompetition.playerHouseholds)
    : 0;
  /* The funnel's last row and the "who wins" corner, in the model's own unit. */
  const yourAudienceHomes = audienceKind === 'AD_HOMES' ? (market?.playerCommercial.adHouseholds ?? 0)
    : audienceKind === 'BUYERS' ? (market?.playerCommercial.storeBuyers ?? 0)
      : yourHomes;
  /* Paying homes settle a little each week toward the homes that want the offer. */
  const demand = market?.streamingCompetition.playerHouseholds ?? 0;
  const demandNote = !state.live || !subscriptionModel || !demand ? ''
    : demand > yourHomes * 1.05 ? `${compact(demand)} homes want your offer at today's price; more of them start paying each week. `
      : demand < yourHomes * .95 ? `Only ${compact(demand)} homes want your offer at today's price, fewer than pay today: expect cancellations. `
        : '';
  const reachTotal = atlasCountries.reduce((sum, country) => sum + country.view.reachableHouseholds, 0);
  const unclaimedTotal = atlasCountries.reduce((sum, country) => sum + country.view.unclaimedHouseholds, 0);
  const openCountry = openCountryId ? atlasCountries.find(country => country.id === openCountryId) ?? null : null;
  const openCountryRegion = openCountry ? (regionById.get(openCountry.regionId)?.label ?? openCountry.regionId) : '';
  const openCard = useCallback((countryId: string) => setOpenCountryId(countryId), []);
  const focusOn = useCallback((regionId: AtlasRegionId | null) => { setFocusRegion(regionId); setShowAllCountries(false); }, []);

  /* Cards for the top-countries rail: your accounts once you are live, the
     industry's viewers before that or when looking at the whole market. */
  const topCountryCards = (scope: 'PLATFORM' | 'MARKET'): TopCountryCard[] => {
    if (scope === 'PLATFORM') {
      const rows = scoped.filter(country => country.view.playerAudience > 0).sort((left, right) => right.view.playerAudience - left.view.playerAudience).slice(0, 8);
      const max = rows[0]?.view.playerAudience || 1;
      return rows.map(country => {
        const share = sharesOf([country.view]).shares.find(item => item.id === 'PLAYER')?.share ?? 0;
        const caption = subscriptionModel ? `${formatShare(share)} of homes` : audienceKind === 'AD_HOMES' ? 'watching free' : 'bought this week';
        return { country, value: compact(country.view.playerAudience), caption, meter: country.view.playerAudience / max, tone: c, change: subscriptionModel ? country.view.playerNetChange : undefined };
      });
    }
    const rows = [...scoped].sort((left, right) => right.view.activeViewers - left.view.activeViewers).slice(0, 8);
    const max = rows[0]?.view.activeViewers || 1;
    return rows.map(country => {
      const leader = country.view.platformHouseholds[0];
      return { country, value: compact(country.view.activeViewers), caption: leader ? `led by ${leader.name}` : 'no leader yet', meter: country.view.activeViewers / max, tone: leader?.id === 'PLAYER' ? c : leader?.color || '#9aa3b3' };
    });
  };

  /* Rows under a map: your files first, then the biggest open ground. */
  const countryRowsFor = (list: AtlasCountry[], limit: number): CountryRowItem[] => {
    const rank = (country: AtlasCountry) => (country.state === 'LIVE' ? 3 : country.state === 'OPENING' ? 2 : country.state === 'PAUSED' ? 1 : 0);
    const sorted = [...list].sort((left, right) => rank(right) - rank(left)
      || right.view.playerAudience - left.view.playerAudience
      || right.view.activeViewers - left.view.activeViewers);
    /* Each bar is measured against its own kind: your accounts against your
       biggest country, an audience against the biggest audience in the list. */
    const maxAccounts = Math.max(1, ...sorted.map(country => country.view.playerAudience));
    const maxViewers = Math.max(1, ...sorted.map(country => country.view.activeViewers));
    return sorted.slice(0, limit).map(country => {
      const mine = state.live && country.view.playerAudience > 0;
      if (mine) {
        return {
          country,
          value: compact(country.view.playerAudience),
          caption: `${words.short} · ${compact(country.view.activeViewers)} watching`,
          meter: country.view.playerAudience / maxAccounts,
        };
      }
      if (country.view.activeViewers <= 0) {
        return { country, value: '—', caption: `${compact(country.view.population)} people · no streaming audience yet` };
      }
      return {
        country,
        value: compact(country.view.activeViewers),
        caption: `${compact(country.view.activeViewers)} watching · ${compact(country.view.population)} people`,
        meter: country.view.activeViewers / maxViewers,
      };
    });
  };

  /* Derived lists, memoised so the flag cards are not rebuilt on every tap. */
  const platformCards = useMemo(() => topCountryCards('PLATFORM'), [scoped, c]); // eslint-disable-line react-hooks/exhaustive-deps
  const marketCards = useMemo(() => topCountryCards('MARKET'), [scoped, c]); // eslint-disable-line react-hooks/exhaustive-deps
  const regionRows = useMemo(() => countryRowsFor(scoped, showAllCountries ? scoped.length : 12), [scoped, showAllCountries, state.live]); // eslint-disable-line react-hooks/exhaustive-deps
  const yourMarkets = useMemo(() => scoped.filter(country => country.state !== 'AVAILABLE'), [scoped]);
  const marketRows = useMemo(() => countryRowsFor(yourMarkets, showAllCountries ? yourMarkets.length : 12), [yourMarkets, showAllCountries, state.live]); // eslint-disable-line react-hooks/exhaustive-deps
  const openGroundRows = useMemo(() => countryRowsFor(scoped.filter(country => country.state === 'AVAILABLE'), 6), [scoped, state.live]); // eslint-disable-line react-hooks/exhaustive-deps

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
        <div><span>{words.header}</span><b>{subscriptionModel ? (state.metrics[0]?.value ?? '—') : state.live ? compact(playerAudienceTotal) : '—'}</b></div>
        <div><span>ON CHART</span><b className={climbing ? css.good : ''}>{climbing}</b></div>
        <div><span>CAMPAIGNS</span><b>{state.campaigns.filter(x => x.live).length}</b></div>
        <div><span>{!atlasCountries.length ? 'REGIONS' : state.live ? 'COUNTRIES' : 'MARKETS'}</span><b>{!atlasCountries.length ? state.regions.length : state.live ? liveCountries.length : liveCountries.length + openingCountries.length}</b></div>
      </div>

      <div className={css.adtabs}>
        {TAB_ORDER.map(t => (
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
                {/* the living map: your countries, lit by the accounts you hold there */}
                {atlasCountries.length > 0 && (
                  <>
                    <AudienceAtlas
                      mode="PLATFORM"
                      countries={atlasCountries}
                      regions={atlasRegions}
                      accent={c}
                      focusRegion={focusRegion}
                      selectedCountryId={openCountryId}
                      onFocusRegion={focusOn}
                      onSelectCountry={openCard}
                      reading={focusSummary
                        ? { value: focusSummary.playerAudience > 0 ? compact(focusSummary.playerAudience) : '—', caption: `${focusSummary.label} · ${focusSummary.live} live` }
                        : { value: playerAudienceTotal > 0 ? compact(playerAudienceTotal) : (subscriptionModel ? (state.metrics[0]?.value ?? '0') : '0'), caption: `${words.plural} · ${liveCountries.length} ${liveCountries.length === 1 ? 'country' : 'countries'} live` }}
                      aside={subscriptionModel ? {
                        value: signedCompact(focusSummary ? focusSummary.playerNetChange : playerNetTotal),
                        caption: 'this week',
                        tone: (focusSummary ? focusSummary.playerNetChange : playerNetTotal) > 0 ? 'good' : (focusSummary ? focusSummary.playerNetChange : playerNetTotal) < 0 ? 'bad' : undefined,
                      } : {
                        /* ads and store keep no week-over-week history: show what they earn */
                        value: `$${compact(revenueOf(focusRegion ? scoped : atlasCountries))}`,
                        caption: 'a month',
                      }}
                      audienceKind={audienceKind}
                    />
                    <RegionRail regions={atlasRegions} focus={focusRegion} onFocus={focusOn}
                      valueOf={region => region.playerAudience} worldValue={playerAudienceTotal} />
                    <div className={atlas.secHead}><h2>Where your audience is</h2><span>{focusSummary ? focusSummary.label : 'top countries'}</span></div>
                    <TopCountryRail cards={platformCards} onOpen={openCard} />
                  </>
                )}

                {subscriptionModel ? (
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
                  {alsoEarning.length > 0 && (
                    /* a subscription service that also sells ads or a store: what those added */
                    <div className={atlas.alsoEarning}>
                      <span>ALSO EARNING THIS WEEK</span>
                      {alsoEarning.map(item => <div key={item.label}><b>{item.value}</b><small>{item.label}</small></div>)}
                    </div>
                  )}

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
                ) : (
                  /* An ad-supported or rent-or-buy service: what it did in the week that
                     just settled. These figures keep no weekly history, so there is no
                     trend chart here, only the week. */
                  <div className={css.tiles}>
                    {modelTiles.map(tile => (
                      <div className={css.tile} key={tile.label}>
                        <span className={css.tlabel}>{tile.label}</span>
                        <b className={css.tval}>{tile.value}</b>
                        <div className={css.trow}><em className={atlas.tileNote}>{tile.note}</em></div>
                      </div>
                    ))}
                  </div>
                )}

                {/* who watches your service, and the sharing rule that shapes it */}
                {market && subscriptionModel && (
                  <>
                    <div className={atlas.secHead}><h2>Who watches your service</h2><span>{market.customerAccess.available ? 'last settled week' : 'settles next week'}</span></div>
                    <AccessBoard
                      accent={c}
                      paidAccounts={market.customerAccess.paidAccounts}
                      sharedHomes={market.customerAccess.externalSharedHouseholds}
                      sharedViewers={market.customerAccess.sharedActiveViewers}
                      piracyReach={market.customerAccess.piracyReach}
                      accessLoadAccounts={market.customerAccess.accessLoadAccounts}
                      monthlySubscriptionRevenue={market.customerAccess.monthlySubscriptionRevenue}
                    />
                  </>
                )}
                {/* Pricing and the sharing rules are configuration, so they live
                    in the Platform room's Offer page; this room reads results. */}
                {market && onOpenPlatformOffer && (
                  <button type="button" className={atlas.offerLink} onClick={onOpenPlatformOffer}>
                    <span>PLATFORM · OFFER</span>
                    <b>{audienceKind === 'AD_HOMES' ? 'Ad breaks and how you earn' : audienceKind === 'BUYERS' ? 'Store prices and how you earn' : 'Prices, plans and account sharing'}</b>
                    <small>{accessPolicy && subscriptionModel ? `Sharing: ${SHARING_POSTURE_WORDS[accessPolicy.sharingPosture]} · ${ENFORCEMENT_WORDS[accessPolicy.enforcementInvestment]} checks` : 'Change how the service earns'}</small>
                    <i aria-hidden="true">→</i>
                  </button>
                )}
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
                    {atlasCountries.length > 0 ? (
                      <>
                        {/* the living market, on the map the player built their launch on */}
                        <AudienceAtlas
                          mode="MARKET"
                          countries={atlasCountries}
                          regions={atlasRegions}
                          accent={c}
                          focusRegion={focusRegion}
                          selectedCountryId={openCountryId}
                          onFocusRegion={focusOn}
                          onSelectCountry={openCard}
                          reading={focusSummary
                            ? { value: compact(focusSummary.activeViewers), caption: `${focusSummary.label} · people watching` }
                            : { value: compact(market.activeViewers), caption: `active streaming viewers · wk ${market.generatedAtAbsoluteWeek}` }}
                          aside={{ value: compact(focusSummary ? focusSummary.payingHouseholds : market.payingHouseholds), caption: 'paying homes' }}
                        />
                        <RegionRail regions={atlasRegions} focus={focusRegion} onFocus={focusOn}
                          valueOf={region => region.activeViewers} worldValue={market.activeViewers} />
                        <div className={atlas.secHead}><h2>Where people watch</h2><span>{focusSummary ? focusSummary.label : 'biggest audiences'}</span></div>
                        <TopCountryRail cards={marketCards} onOpen={openCard} />
                      </>
                    ) : (
                      <section className={css.marketHero}>
                        <span>THE LIVING MARKET · WK {market.generatedAtAbsoluteWeek}</span>
                        <strong>{count(market.activeViewers)}</strong>
                        <h2>active streaming viewers</h2>
                        <p>{count(market.globalPopulation)} people · {count(market.payingHouseholds)} paying homes</p>
                      </section>
                    )}
                    {/* the market as three pictures: who can and who pays, who wins, and the curve */}
                    <div className={atlas.secHead}><h2>From homes to you</h2><span>can stream · pay · {words.funnel.toLowerCase()}</span></div>
                    <MarketFunnel
                      accent={c}
                      rows={[
                        { label: 'CAN STREAM', value: market.industryParticipation.streamingReachableHouseholds, unit: 'homes' },
                        { label: 'PAY FOR STREAMING', value: market.payingHouseholds, unit: 'homes' },
                        state.live
                          ? { label: words.funnel, value: yourAudienceHomes, unit: audienceKind === 'BUYERS' ? 'buyers' : 'homes', you: true }
                          : { label: words.funnel, value: 0, unit: 'homes', you: true, pending: 'opens at launch' },
                      ]}
                      reach={{
                        streamingOnly: market.industryParticipation.streamingOnlyHouseholds,
                        dual: market.industryParticipation.dualParticipantHouseholds,
                        cinemaOnly: market.industryParticipation.cinemaOnlyHouseholds,
                        neither: market.industryParticipation.neitherHouseholds,
                        streamingReach: market.industryParticipation.streamingReachableHouseholds,
                        cinemaReach: market.industryParticipation.cinemaReachableHouseholds,
                      }}
                      facts={[
                        { value: market.subscriptionsPerHousehold.toFixed(1), label: 'SUBS / HOME' },
                        { value: compact(market.weeklyWatchHours), label: 'WATCH HOURS / WK' },
                        { value: `${budgetLabel(market.householdEconomy.averageMonthlyEntertainmentBudget)}/mo`, label: 'HOUSEHOLD BUDGET' },
                        { value: compact(market.householdEconomy.nonParticipantHouseholds), label: 'OUTSIDE MARKET' },
                      ]}
                      overlap={{
                        one: market.subscriberOverlap.oneServicePercent,
                        two: market.subscriberOverlap.twoServicesPercent,
                        three: market.subscriberOverlap.threePlusPercent,
                      }}
                      notes={[
                        demandNote.trim(),
                        'This is spending capacity, not automatic streaming revenue; reach is market potential, not automatic customers or revenue.',
                        "Winning a home's second subscription slot counts too.",
                      ]}
                    />
                    <div className={atlas.secHead}><h2>Who wins</h2><span>{market.streamingCompetition.offerCount} services competing</span></div>
                    <WinnersBoard
                      accent={c}
                      homes={worldShares}
                      homesWon={subscriptionModel ? (youShare?.households ?? yourHomes) : yourAudienceHomes}
                      homesWonLabel={!state.live ? 'HOMES WON' : audienceKind === 'AD_HOMES' ? 'WATCHING YOU FREE' : audienceKind === 'BUYERS' ? 'BUYERS THIS WEEK' : 'HOMES PAYING YOU'}
                      homesWonCaption={!state.live ? 'opens at launch'
                        : !subscriptionModel ? `${audienceKind === 'AD_HOMES' ? 'free with ads' : 'rent or buy'} · not in the paid race`
                          : youShare ? `${formatShare(youShare.share)} of homes that can stream` : 'none yet'}
                      unclaimedHomes={unclaimedTotal}
                      unclaimedCaption={`${Math.round(unclaimedTotal / Math.max(1, reachTotal) * 100)}% of homes that can stream pay for nothing`}
                      demandHomes={state.live && subscriptionModel ? market.streamingCompetition.playerHouseholds : undefined}
                      /* every saved plan, with the homes the competition model
                         gives it at today's offer (none before the offer is live) */
                      planMix={subscriptionModel && market.playerPlans.length ? {
                        plans: market.playerPlans.map(plan => ({
                          id: plan.id,
                          name: plan.name,
                          households: market.streamingCompetition.playerPlanAllocations.find(row => row.planId === plan.id)?.households ?? 0,
                        })),
                        effectivePrice: market.streamingCompetition.playerEffectiveMonthlyPrice,
                      } : undefined}
                      watch={market.globalWatchShare}
                    />
                    <div className={atlas.secHead}><h2>Streaming adoption</h2><span>last 52 game weeks</span></div>
                    <MarketPulse accent={c} data={marketTrend} now={market.activeViewers} caption="people watching streaming now" />
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

        {/* ── CAMPAIGNS before launch: say so, rather than offer buttons that do nothing ── */}
        {tab === 'CAMPAIGNS' && !state.live && (
          <div className={atlas.prelaunchCard}>
            <b>Campaigns start after launch</b>
            <span>Your opening campaign is planned in Build the Platform, on the Money stage. Once the service is live, new campaigns and the recommendation engine are run from here.</span>
          </div>
        )}

        {/* ── CAMPAIGNS — the Boost / Promote pattern ── */}
        {tab === 'CAMPAIGNS' && state.live && (
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

        {/* ── REGIONS: every continent as its own small map ── */}
        {tab === 'REGIONS' && (
          atlasCountries.length > 0 ? (
            <>
              <RegionTiles
                regions={atlasRegions}
                countries={atlasCountries}
                live={state.live}
                focus={focusRegion}
                audienceKind={audienceKind}
                onOpen={regionId => focusOn(focusRegion === regionId ? null : regionId)}
              />
              {focusSummary ? (
                <>
                  <div className={atlas.regionPanelHead}>
                    <div><small>{focusSummary.live} LIVE · {focusSummary.countries} COUNTRIES</small><h3>{focusSummary.label}</h3></div>
                    <button type="button" onClick={() => focusOn(null)}>ALL REGIONS</button>
                  </div>
                  <AudienceAtlas
                    mode={state.live ? 'PLATFORM' : 'OPERATIONS'}
                    countries={atlasCountries}
                    regions={atlasRegions}
                    accent={c}
                    focusRegion={focusRegion}
                    selectedCountryId={openCountryId}
                    onFocusRegion={focusOn}
                    onSelectCountry={openCard}
                    reading={state.live
                      ? { value: focusSummary.playerAudience > 0 ? compact(focusSummary.playerAudience) : '—', caption: `${words.region} here` }
                      : { value: compact(focusSummary.activeViewers), caption: 'people watching here' }}
                    aside={{ value: `${focusSummary.live}/${focusSummary.countries}`, caption: 'countries live' }}
                    gauge={focusSummary.countries ? focusSummary.live / focusSummary.countries : 0}
                  />
                  <CountryRows rows={regionRows} onOpen={openCard} />
                  {scoped.length > 12 && !showAllCountries && (
                    <button type="button" className={atlas.moreRow} onClick={() => setShowAllCountries(true)}>Show all {scoped.length} countries</button>
                  )}
                </>
              ) : (
                <p className={css.marketExplain} style={{ marginTop: 12 }}>Tap a region to fly there and see every country in it.</p>
              )}
            </>
          ) : (
            <div className={css.adpending}><b>Regions unavailable</b><span>The world map appears when this save's market data is ready.</span></div>
          )
        )}

        {/* ── MARKETS: where you stand, country by country ── */}
        {tab === 'MARKETS' && (
          <>
            {atlasCountries.length > 0 && (
              <>
                <AudienceAtlas
                  mode="OPERATIONS"
                  countries={atlasCountries}
                  regions={atlasRegions}
                  accent={c}
                  focusRegion={focusRegion}
                  selectedCountryId={openCountryId}
                  onFocusRegion={focusOn}
                  onSelectCountry={openCard}
                  reading={{
                    value: String(focusSummary ? focusSummary.live : liveCountries.length),
                    caption: focusSummary ? `${focusSummary.label} · countries live` : (liveCountries.length === 1 ? 'country live' : 'countries live'),
                  }}
                  aside={{
                    value: String(focusSummary ? focusSummary.opening : openingCountries.length),
                    caption: 'on their way',
                    tone: (focusSummary ? focusSummary.opening : openingCountries.length) > 0 ? 'warn' : undefined,
                  }}
                  gauge={(focusSummary ? focusSummary.live / Math.max(1, focusSummary.countries) : liveCountries.length / Math.max(1, atlasCountries.length))}
                />
                <RegionRail regions={atlasRegions} focus={focusRegion} onFocus={focusOn}
                  valueOf={region => (state.live ? region.live : region.live + region.opening)} format={value => String(value)}
                  worldValue={state.live ? liveCountries.length : liveCountries.length + openingCountries.length} />
              </>
            )}
            <div className={atlas.statusRow}>
              <div style={{ ['--st' as string]: '#4ade80' }}><span>LIVE</span><b>{liveCountries.length}</b></div>
              <div style={{ ['--st' as string]: '#f5b544' }}><span>ON ITS WAY</span><b>{openingCountries.length + pausedCountries.length}</b></div>
              <div style={{ ['--st' as string]: '#7d8698' }}><span>OPEN GROUND</span><b>{openGroundCount}</b></div>
            </div>
            {(canEnterHere || onManageMarkets) && (
              /* After launch this opens the room's own Enter New Markets page;
                 before launch, the opening-markets step of Define the Launch. Once
                 every country is entered there is nothing new to enter, only the
                 footprint (and any files in review) to look over. */
              <button type="button" className={atlas.enterCta} onClick={canEnterHere ? () => setEntry({ picked: [], region: focusRegion }) : onManageMarkets}>
                <b>{atlasCountries.length > 0 && openGroundCount === 0 ? 'Review your markets →' : state.live ? 'Enter a new market →' : 'Choose opening markets →'}</b>
                <span>{compact(plannedAudience)} reach in play</span>
              </button>
            )}
            <div className={atlas.secHead}><h2>Your markets</h2><span>{focusSummary ? focusSummary.label : 'tap for the country card'}</span></div>
            {yourMarkets.length > 0 ? (
              <>
                <CountryRows rows={marketRows} onOpen={openCard} />
                {yourMarkets.length > 12 && !showAllCountries && (
                  <button type="button" className={atlas.moreRow} onClick={() => setShowAllCountries(true)}>Show all {yourMarkets.length} markets</button>
                )}
              </>
            ) : (
              <div className={css.adpending}><b>No market entries {focusSummary ? 'here ' : ''}yet</b><span>Tap a country on the map to read its card, then enter it.</span></div>
            )}
            {scoped.some(country => country.state === 'AVAILABLE') && (
              <>
                <div className={atlas.secHead}><h2>Biggest open ground</h2><span>not entered yet</span></div>
                <CountryRows rows={openGroundRows} onOpen={openCard} />
              </>
            )}
          </>
        )}

        <div className={css.adfoot} />
      </div>

      {openCountry && (
        <AudienceCountrySheet
          country={openCountry}
          live={state.live}
          audienceKind={audienceKind}
          regionLabel={openCountryRegion}
          accent={c}
          accentHex={accentHex}
          onClose={() => setOpenCountryId(null)}
          onEnterMarket={canEnterHere
            ? (entry
              /* already on the entry page: the card's button adds or removes the country from the pick */
              ? () => { const countryId = openCountry.id; setOpenCountryId(null); setEntryPicked(current => (current.includes(countryId) ? current.filter(id => id !== countryId) : [...current, countryId])); }
              : () => { const countryId = openCountry.id; setOpenCountryId(null); setEntry({ picked: [countryId], region: openCountry.regionId }); })
            : onManageMarkets ? () => { setOpenCountryId(null); onManageMarkets(); } : undefined}
          enterLabel={entry ? (entry.picked.includes(openCountry.id) ? 'Remove from pick' : 'Pick for entry') : undefined}
          onShowRegion={() => { const regionId = openCountry.regionId; setOpenCountryId(null); setEntry(null); setTab('REGIONS'); focusOn(regionId); }}
        />
      )}
      {entry && marketEntry && (
        <AudienceMarketEntry
          accent={c}
          countries={atlasCountries}
          operations={marketOperations}
          actions={marketEntry}
          picked={entry.picked}
          onPickedChange={setEntryPicked}
          initialRegion={entry.region}
          initialTab={entry.tab}
          onOpenCountry={openCard}
          onClose={() => { setEntry(null); onEntryClose?.(); }}
        />
      )}
    </div>
  );
};

/* ============================================================
   STYLES
   ============================================================ */
/* Styles now live in presentation/screens/AudienceDesk/AudienceDesk.module.css */
