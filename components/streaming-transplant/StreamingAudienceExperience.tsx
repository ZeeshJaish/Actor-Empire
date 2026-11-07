/**
 * EMPIRE+ v2 — AUDIENCE (plan §20.8, #130–#136)
 *
 * The frame: the room's four figures, five tabs with one job each, and the tab's action in a pinned bar.
 *   ANALYTICS → your service: the week's scoreboard, the next move, metrics, churn, why homes came and left
 *   MARKETS   → where you win and where to grow: the living map, regions, countries, entering a market
 *   WORLD     → the streaming industry around you: the race, the funnel, the market over a year, who's out there
 *   CAMPAIGNS → what your promotion did: the season, campaigns locked in, graded results
 *   TOP 10    → what the world watched this week, every service together
 * Every number comes from the save (`audienceRoomModel.ts`, the market view); nothing is estimated for show.
 */
import css from './presentation/screens/AudienceDesk/AudienceDesk.module.css';
import atlas from './presentation/screens/AudienceDesk/AudienceAtlas.module.css';
import { brandVars } from './presentation/brand';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Brand, Mark, brandColor, hslHex } from './StreamingBrandVisuals';
import { AudienceCountrySheet } from './AudienceCountrySheet';
import type { AudienceNextMove, AudienceRoomModel } from './audienceRoomModel';
import { AudienceAnalyticsTab } from './AudienceAnalyticsTab';
import { AudienceMarketsTab } from './AudienceMarketsTab';
import { AudienceWorldTab } from './AudienceWorldTab';
import { AudienceCampaignsTab } from './AudienceCampaignsTab';
import { AudienceTopTenTab } from './AudienceTopTenTab';
import { CountUp } from './AudienceUi';
import { ENFORCEMENT_WORDS, SHARING_POSTURE_WORDS } from './SharingPolicyCard';
import { AudienceMarketEntry, type MarketEntryActions } from './AudienceMarketEntry';
import {
  AUDIENCE_WORDS,
  buildAtlasCountries,
  compact,
  signedCompact,
  summariseRegions,
  type AtlasRegionId,
  type AudienceKind,
} from './audienceAtlasModel';
import type {
  OwnedStreamingMarketOperation,
  WorldStreamingCustomerAccessPolicy,
} from '../../types';
import type { StreamingAudienceMarketView } from '../../services/streamingAudienceMarket';
import { RoomSubtitle } from './RoomSubtitle';

/* ============================================================
   MODEL
   ============================================================ */
/** The campaign objective the War Room opens on (the next move "Fix retention" opens it on RETENTION). */
export type RecObjective = 'BALANCED' | 'RETENTION' | 'DISCOVERY' | 'BREAKOUT';

/** #136: the room reads only this; the old made-up metrics, trend, chart, attribution, campaigns and regions are gone. */
export interface AudienceState {
  live: boolean;
  /** The deterministic game-world market behind the room. */
  market?: StreamingAudienceMarketView;
  /** #130: the room's numbers, every one from the save (audienceRoomModel.ts). */
  room: AudienceRoomModel;
}

/* #130 (plan §20.8): five tabs, one job each. ANALYTICS is your service, MARKETS is where (the regions are its
   chips), WORLD is the industry around you, then the levers and the chart. */
export type AudienceTab = 'ANALYTICS' | 'MARKETS' | 'WORLD' | 'CAMPAIGNS' | 'TOP 10';
type Tab = AudienceTab;
const TAB_ORDER: Tab[] = ['ANALYTICS', 'MARKETS', 'WORLD', 'CAMPAIGNS', 'TOP 10'];

/* ============================================================
   THE PAGE
   ============================================================ */
export const AudienceDesk: React.FC<{
  brand: Brand;
  state: AudienceState;
  onBack: () => void;
  initialTab?: Tab;
  initialMapSelection?: { regionId: string | null; countryId: string | null };
  onNavigationChange?: (navigation: { tab: Tab; regionId: string | null; countryId: string | null }) => void;
  initialEntry?: { tab: 'CHOOSE' | 'CLEARANCE' } | null;
  onEntryClose?: () => void;
  onNewCampaign?: () => void;
  onObjective?: (o: RecObjective) => void;
  marketOperations?: OwnedStreamingMarketOperation[];
  /** Before launch: opens the opening-markets step of Define the Launch. */
  onManageMarkets?: () => void;
  /** After launch: the purse and canonical actions behind the Enter New Markets page. */
  marketEntry?: MarketEntryActions;
  /** Named on the link to the Platform room, where the policy is changed. */
  accessPolicy?: WorldStreamingCustomerAccessPolicy;
  /** Opens the Platform room's Offer page (prices, plans, account sharing). */
  onOpenPlatformOffer?: () => void;
  /** #131: opens one of your titles (its dossier). */
  onOpenTitle?: (projectId: string) => void;
  /** #131: opens the War Room on a title (the next move "Push it"). */
  onPushTitle?: (projectId: string) => void;
  /** #137: the tab now open, so a page opened from here (a title, a campaign) comes back to it. */
  onTabChange?: (tab: AudienceTab) => void;
}> = ({ brand, state, onBack, initialTab, initialMapSelection, onNavigationChange, initialEntry, onEntryClose, onNewCampaign, onObjective, marketOperations = [], onManageMarkets, marketEntry, accessPolicy, onOpenPlatformOffer, onOpenTitle, onPushTitle, onTabChange }) => {
  const c = brandColor(brand);
  /* After launch, entering a market happens on this room's own page. */
  const [entry, setEntry] = useState<{ picked: string[]; region: AtlasRegionId | null; tab?: 'CHOOSE' | 'CLEARANCE' } | null>(() => initialEntry && state.live && marketEntry ? { picked: [], region: initialMapSelection?.regionId as AtlasRegionId || null, tab: initialEntry.tab } : null);
  const canEnterHere = state.live && Boolean(marketEntry);
  const setEntryPicked = useCallback((update: (current: string[]) => string[]) => (
    setEntry(current => (current ? { ...current, picked: update(current.picked) } : current))
  ), []);
  /* a console chip can open this page straight on the tab it names */
  const [tab, setTabState] = useState<Tab>(initialTab ?? 'ANALYTICS');
  const setTab = (next: Tab) => { setTabState(next); onTabChange?.(next); };
  /* The living map: one camera for the room, one open country card. */
  const [focusRegion, setFocusRegion] = useState<AtlasRegionId | null>(initialMapSelection?.regionId as AtlasRegionId || null);
  const [openCountryId, setOpenCountryId] = useState<string | null>(initialMapSelection?.countryId || null);
  const navigationRef = useRef(onNavigationChange); navigationRef.current = onNavigationChange;
  useEffect(() => { navigationRef.current?.({ tab, regionId: focusRegion, countryId: openCountryId }); }, [tab, focusRegion, openCountryId]);

  const market = state.market;
  const room = state.room;

  /* ── the living map's model: every country, where you stand in it ── */
  const accentHex = useMemo(() => hslHex(brand.hue, brand.sat, 58), [brand.hue, brand.sat]);
  /* #144: the scenes' made-for-you creative: your most-watched title this week, on your service */
  const spotlight = room.chart.own.lists.ALL[0] ?? room.titles[0] ?? null;
  const scenesSubject = useMemo(() => (spotlight ? {
    title: spotlight.title, service: brand.name, hue: spotlight.hue, brandHue: brand.hue, kind: 'TITLE' as const,
    art: { id: spotlight.id, genre: spotlight.genre, hue: spotlight.hue },
  } : null), [spotlight?.id, spotlight?.title, spotlight?.genre, spotlight?.hue, brand.name, brand.hue]);
  const atlasCountries = useMemo(() => buildAtlasCountries(market?.worldCountries, marketOperations), [market, marketOperations]);
  const atlasRegions = useMemo(() => summariseRegions(atlasCountries), [atlasCountries]);
  const regionById = useMemo(() => new Map(atlasRegions.map(region => [region.id, region])), [atlasRegions]);
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
  const openCountry = openCountryId ? atlasCountries.find(country => country.id === openCountryId) ?? null : null;
  const openCountryRegion = openCountry ? (regionById.get(openCountry.regionId)?.label ?? openCountry.regionId) : '';
  const openCard = useCallback((countryId: string) => setOpenCountryId(countryId), []);
  const focusOn = useCallback((regionId: AtlasRegionId | null) => setFocusRegion(regionId), []);
  /* #131: the next move's button opens the place that acts on it */
  const runMove = (move: AudienceNextMove) => {
    if (move.id === 'RETENTION') onObjective?.('RETENTION');
    else if (move.id === 'OFFER_PRICE' || move.id === 'OFFER_SHARING') onOpenPlatformOffer?.();
    else if (move.id === 'PUSH_TITLE' && move.projectId) onPushTitle?.(move.projectId);
    else if (move.id === 'ENTER_MARKET' && move.countryId) {
      const country = atlasCountries.find(item => item.id === move.countryId);
      if (canEnterHere) setEntry({ picked: [move.countryId], region: country?.regionId ?? null });
      else onManageMarkets?.();
    }
  };

  return (
    <div className={css.ad} data-epx-root style={brandVars(brand)}>
      <div className={css.adtop}>
        <button className={css.adback} onClick={onBack} aria-label="Back">←</button>
        <div className={css.adtitle}>
          <b>AUDIENCE</b>
          <RoomSubtitle>WHO WATCHES · WHERE · WHY</RoomSubtitle>
        </div>
        <span className={css.admark}><Mark brand={brand} /></span>
      </div>

      {/* #130: the room's four figures, the same on every tab: your audience in the service's own unit, the
          week's net change, a month of revenue at this week's rate, and the countries live */}
      <div className={css.adstats}>
        <div><span>{words.header}</span><b>{state.live ? <CountUp value={room.head.audience} format={compact} /> : '—'}</b></div>
        <div><span>THIS WEEK</span><b className={room.head.net === null ? '' : room.head.net > 0 ? css.good : room.head.net < 0 ? css.bad : ''}>
          {room.head.net === null ? '—' : <CountUp value={room.head.net} format={value => signedCompact(Math.round(value))} />}
        </b></div>
        <div><span>REVENUE / MO</span><b>{room.head.revenueMonthly === null ? '—' : <CountUp value={room.head.revenueMonthly} format={value => `$${compact(value)}`} />}</b></div>
        <div><span>{state.live ? 'COUNTRIES' : 'MARKETS'}</span><b>{state.live ? liveCountries.length : liveCountries.length + openingCountries.length}</b></div>
      </div>

      <div className={css.adtabs} role="tablist" aria-label="Audience">
        {TAB_ORDER.map(t => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? css.on : ''} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <div className={css.adscroll}>

        {/* ── ANALYTICS: your service ── */}
        {tab === 'ANALYTICS' && (
          <>
            {!state.live ? (
              <div className={css.adpending}>
                <b>Your numbers start at launch</b>
                <span>Who joins, who leaves and why appear after the first week settles. The world's streaming market is open for planning now.</span>
                <button type="button" onClick={() => setTab('WORLD')}>SEE THE WORLD →</button>
              </div>
            ) : (
              /* #131: the week as a scoreboard, the next move, one line under three metric tabs, the dials, why homes
                 came and left, the titles doing the work, and who pays (AudienceAnalyticsTab.tsx) */
              <AudienceAnalyticsTab
                room={room}
                market={market}
                kind={audienceKind}
                accent={c}
                onMove={runMove}
                onOpenTitle={onOpenTitle}
                onOpenPlatformOffer={market ? onOpenPlatformOffer : undefined}
                offerNote={accessPolicy && subscriptionModel ? `Sharing: ${SHARING_POSTURE_WORDS[accessPolicy.sharingPosture]} · ${ENFORCEMENT_WORDS[accessPolicy.enforcementInvestment]} checks` : 'Change how the service earns'}
              />
            )}
          </>
        )}

        {/* ── WORLD: the streaming industry around you (#133, AudienceWorldTab.tsx) ── */}
        {tab === 'WORLD' && (
          market ? (
            <AudienceWorldTab market={market} countries={atlasCountries} live={state.live} kind={audienceKind} accent={c} brandName={brand.name} />
          ) : (
            <div className={css.adpending}><b>Market data unavailable</b><span>The living-market simulation will appear when this save is ready.</span></div>
          )
        )}

        {/* ── TOP 10: your service's and every service's week (#135, #142, AudienceTopTenTab.tsx; the chart is #129's) ── */}
        {tab === 'TOP 10' && (
          <AudienceTopTenTab chart={room.chart} brand={brand} onOpenTitle={onOpenTitle} />
        )}

        {/* ── CAMPAIGNS before launch: say so, rather than offer buttons that do nothing ── */}
        {tab === 'CAMPAIGNS' && !state.live && (
          <div className={atlas.prelaunchCard}>
            <b>Campaigns start after launch</b>
            <span>Your opening campaign is planned in Build the Platform, on the Money stage. Once the service is live, new campaigns and the recommendation engine are run from here.</span>
          </div>
        )}

        {/* ── CAMPAIGNS: what your promotion did (#134, AudienceCampaignsTab.tsx); a new one starts from the pinned bar ── */}
        {tab === 'CAMPAIGNS' && state.live && (
          <AudienceCampaignsTab campaigns={room.campaigns} week={room.week} onOpenTitle={onOpenTitle} scenesSubject={scenesSubject} />
        )}

        {/* ── MARKETS: where you win and where to grow (#132, AudienceMarketsTab.tsx) ── */}
        {tab === 'MARKETS' && (
          atlasCountries.length > 0 ? (
            <AudienceMarketsTab
              live={state.live}
              kind={audienceKind}
              accent={c}
              countries={atlasCountries}
              regions={atlasRegions}
              focusRegion={focusRegion}
              onFocus={focusOn}
              selectedCountryId={openCountryId}
              onOpenCountry={openCard}
              onEnter={canEnterHere ? country => setEntry({ picked: [country.id], region: country.regionId }) : undefined}
            />
          ) : (
            <div className={css.adpending}><b>Markets unavailable</b><span>The world map appears when this save's market data is ready.</span></div>
          )
        )}

        <div className={css.adfoot} />
      </div>

      {/* #130: the tab's main action stays in a bar at the foot, never a scroll away. After launch MARKETS opens
          the room's own Enter New Markets page (before launch, the opening-markets step of Define the Launch;
          once every country is entered, the footprint to review); CAMPAIGNS opens the War Room. */}
      {tab === 'MARKETS' && (canEnterHere || onManageMarkets) && (
        <div className={css.adpin}>
          <button type="button" onClick={canEnterHere ? () => setEntry({ picked: [], region: focusRegion }) : onManageMarkets}>
            <span>
              <b>{atlasCountries.length > 0 && openGroundCount === 0 ? 'Review your markets' : state.live ? 'Enter a new market' : 'Choose opening markets'}</b>
              <small>{openGroundCount > 0 ? `${openGroundCount} countries still open` : 'every country entered'}</small>
            </span>
            <i aria-hidden="true">→</i>
          </button>
        </div>
      )}
      {tab === 'CAMPAIGNS' && state.live && onNewCampaign && (
        <div className={css.adpin}>
          <button type="button" onClick={onNewCampaign}>
            <span><b>Campaign Studio</b><small>New campaigns, and what is running</small></span>
            <i aria-hidden="true">+</i>
          </button>
        </div>
      )}

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
          onShowRegion={() => { const regionId = openCountry.regionId; setOpenCountryId(null); setEntry(null); setTab('MARKETS'); focusOn(regionId); }}
        />
      )}
      {entry && marketEntry && (
        <AudienceMarketEntry
          accent={c}
          accentHex={accentHex}
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
