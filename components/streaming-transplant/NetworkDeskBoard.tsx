/* ============================================================================
   PLATFORM · NETWORK (#90, codex-handoff/plans/platform-tech-plan.md §17): a live
   company's network, changed here region by region, with no Build wizard
   (Zeesh: "network ko tech jaisa naya banayenge … achchha banana, tagda … wizard
   se bhi jo jo cheezein lena hai, map and all").

   #96 made it clean and short (Zeesh: "page bahut zyada long scroll ho gaya …
   minimal, clean aur premium … sell aur sell back wala system symmetric nahi
   hai … build it / done dekhne ke liye scroll karna pad raha"):

     MAP        the hero: Build's own map, green reach that grows and the ground
                of a room not yet paid for; it pins while a region is open
     STATS      one strip of three dials (#99: a game's, not a dashboard's): load,
                markets served (the engine's 80%), the week's cost (a tap opens
                every part of it and the year's up-front)
     ONLINE     one line for a build that came into service (and its moment)
     BUILDING   a row a region: what, weeks left, its energy speed-up
     LOAD TEST  one card (#97 one row, #99 a level): the verdict, the three
                nights as a bar of three, a play button; a tap opens the test;
                "Suggest a fix" only when something is short
     REGIONS    Build's region board. A maker's − / + both sell back below what
                stands and build above it; a region's head carries its badge
     SITES      folded: what stands, region by region, the markets each serves
     BAR        pinned under the page (#97 simple, #99 even): where and when, a
                slot a maker in the board's order (its mark, + or −, its name), a
                warning only when something gets worse, then Undo beside one
                button that says what it does (Build · $X, Sell · +$X); Done when
                nothing is drawn; Suggest's answer lands here too

   Money moves when a region is ordered (services/streamingNetworkOrders); the
   region changes when it is ready.
   ========================================================================== */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type {
  OwnedStreamingFacility,
  OwnedStreamingNetworkOrder,
  OwnedStreamingRegionNetworkPlan,
  StreamingServerTier,
} from '../../types';
import type { BuildData, BuildDraft } from '../studio-finance/finance/build';
import { buildTotals, serviceForecast } from '../studio-finance/finance/build';
import { placeRegion, regionReport, regionsOf, type RegionSetup } from '../studio-finance/finance/placer';
import { brandVars } from '../studio-finance/finance/brand';
import { RegionBoard } from '../studio-finance/components/build/RegionBoard';
import { useCountUp } from '../studio-finance/components/build/motion';
import { ServerMark } from '../studio-finance/components/build/BuildMachineMarks';
import { getStreamingServerSite } from '../../services/streamingServerSites';
import { STREAMING_SERVER_TIERS, STREAMING_SERVER_TIER_ORDER } from '../../services/streamingServerTiers';
import {
  STREAMING_NETWORK_REGION_NAMES,
  describeStreamingNetworkChange,
  dropStreamingNetworkCloud,
  isStreamingCloudFacility,
  sellStreamingNetworkRacks,
  streamingFacilityRacksByTier,
  streamingNetworkRegionOf,
  streamingNetworkResaleRate,
  streamingNetworkSpeedUpEnergy,
  type StreamingNetworkOrderPreview,
} from '../../services/streamingNetworkOrders';
import type { RunResult, Scenario } from './StreamingBuildoutExperience';
import { LoadDial, MarketsDial, MoneyDial } from './NetworkDeskGauges';
import './presentation/screens/NetworkDesk/NetworkDeskBoard.css';

/** #91: the load test's nights. The rehearsal's three slots carry them: this week in LIKELY, a big night in QUIET (the
 *  HQ puts the big night's demand there), a surge in SURGE. */
export const STREAMING_NETWORK_NIGHTS: Array<{ id: Scenario; name: string; sub: string }> = [
  { id: 'LIKELY', name: 'This week', sub: "This week's busiest hour, as it came" },
  { id: 'QUIET', name: 'Big night', sub: 'A premiere: the biggest hour of 12 weeks, or a third more' },
  { id: 'SURGE', name: 'Surge', sub: 'It catches. Everyone at once' },
];
const VERDICT: Record<RunResult['verdict'], { word: string; tone: string }> = {
  HELD: { word: 'Holds', tone: 'is-good' },
  BURST: { word: 'Tight', tone: 'is-warn' },
  BROKE: { word: 'Breaks', tone: 'is-bad' },
};

/** What the Platform room hands the Network tab: the live numbers and the three actions */
export interface StreamingNetworkDeskHooks {
  absoluteWeek: number;
  energy: number;
  peakLoadPercent: number;
  /** load at the busiest hour (viewers × their load: Optimisation cuts it) against capacity, and the viewers */
  peakStreams: number;
  capacityStreams: number;
  peakViewers: number;
  /** orders under way, and those done this week or last (the ONLINE line) */
  orders: OwnedStreamingNetworkOrder[];
  /** #92: a whole-network change commissioned in Build before the orders came, still finishing; orders wait for it */
  pendingChange?: { readyAtAbsoluteWeek: number } | null;
  /** what the network costs a week, part by part; the NETWORK row (servers, cloud and rooms) the desk splits (#93) */
  money: Array<{ id?: 'NETWORK'; label: string; weekly: number }>;
  preview: (regionId: string, facilities: OwnedStreamingFacility[]) => StreamingNetworkOrderPreview;
  order: (regionId: string, facilities: OwnedStreamingFacility[], regionPlan: OwnedStreamingRegionNetworkPlan) => { ok: boolean; message: string };
  speedUp: (orderId: string) => { ok: boolean; message: string };
}

interface NetworkDeskBoardProps {
  data: BuildData;
  /** what stands, as Build draws it (every room built) */
  initialDraft: BuildDraft;
  /** what stands, as the save holds it */
  built: OwnedStreamingFacility[];
  /** a drawing's rooms as the save would hold them (every region) */
  toSave: (draft: BuildDraft) => OwnedStreamingFacility[];
  /** the save's rooms as Build draws them, as built */
  toDraft: (facilities: OwnedStreamingFacility[]) => BuildDraft['facilities'];
  /** a region's plan from its rooms */
  regionPlanOf: (facilities: OwnedStreamingFacility[], regionId: string) => OwnedStreamingRegionNetworkPlan;
  desk: StreamingNetworkDeskHooks;
  /** #91: open the Build wizard's rehearsal on a night, on this drawing */
  onWatchNight?: (draft: BuildDraft, scenario: Scenario) => void;
  /** a region the rehearsal's repairs asked to open */
  requestedRegion?: { id: number; regionId: string } | null;
}

type SellKey = StreamingServerTier | 'CLOUD';
const TIERS = STREAMING_SERVER_TIER_ORDER;
const compact = (value: number): string => {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${+(value / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${+(value / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${Math.round(value / 1e3)}K`;
  return String(Math.round(value));
};
const money = (value: number): string => `$${compact(Math.max(0, Math.round(value)))}`;
const weeksWord = (weeks: number) => `${weeks} week${weeks === 1 ? '' : 's'}`;
/** a ready week as the calendar says it: "week 41", or "week 2 next year" */
const weekLabel = (absoluteWeek: number, now: number) => `week ${(absoluteWeek % 52) + 1}${Math.floor(absoluteWeek / 52) > Math.floor(now / 52) ? ' next year' : ''}`;
const regionName = (regionId: string) => STREAMING_NETWORK_REGION_NAMES[regionId] || regionId;
const draftRegion = (facility: BuildDraft['facilities'][number]) => streamingNetworkRegionOf(facility.cityId);
/** what a region's rooms hold, for telling a change from what stands */
const signature = (facilities: OwnedStreamingFacility[]): string => facilities
  .map(facility => {
    const racks = streamingFacilityRacksByTier(facility);
    return `${facility.id}:${racks.SCOUT}/${racks.WORKHORSE}/${racks.TITAN}/${isStreamingCloudFacility(facility) ? facility.installedRacks : 0}`;
  })
  .sort()
  .join('|');
const cloudOf = (facilities: OwnedStreamingFacility[]) => facilities
  .filter(isStreamingCloudFacility)
  .reduce((sum, facility) => sum + facility.installedRacks, 0);
const orderChange = (order: OwnedStreamingNetworkOrder) => ({
  racksAdded: Object.fromEntries(TIERS.map(tier => [tier, Math.max(0, order.racksDelta[tier])])) as Record<StreamingServerTier, number>,
  racksSold: Object.fromEntries(TIERS.map(tier => [tier, Math.max(0, -order.racksDelta[tier])])) as Record<StreamingServerTier, number>,
  cloudAdded: Math.max(0, order.cloudDelta),
  cloudDropped: Math.max(0, -order.cloudDelta),
});
/** "Asia: +8 Titans" → "+8 Titans" (the region is named beside it) */
const changeWords = (regionId: string, line: string) => line.replace(`${regionName(regionId)}: `, '');
const percent = (share: number) => `${Math.round(Math.max(0, share) * 100)}%`;
const VERDICT_RANK: Record<RunResult['verdict'], number> = { HELD: 0, BURST: 1, BROKE: 2 };
/** a change as slots and words: "+2 Workhorses · −1 Titan" (#97). #99: in the board's order of makers (Scout,
 *  Workhorse, Titan, then cloud), so each slot sits under the stepper that made it */
type PartTier = StreamingServerTier | 'CLOUD';
type ChangePart = { key: string; tier: PartTier; sign: 1 | -1; count: number; name: string; names: string; text: string };
const PART_ORDER: PartTier[] = [...TIERS, 'CLOUD'];
const partOf = (tier: PartTier, sign: 1 | -1, count: number): ChangePart => {
  const name = tier === 'CLOUD' ? 'Cloud' : STREAMING_SERVER_TIERS[tier].name;
  const names = tier === 'CLOUD' || count === 1 ? name : `${name}s`;
  return { key: `${tier}${sign > 0 ? '+' : '-'}`, tier, sign, count, name, names, text: `${sign > 0 ? '+' : '−'}${tier === 'CLOUD' ? `${count} cloud` : `${count} ${names}`}` };
};
const changeParts = (preview: Pick<StreamingNetworkOrderPreview, 'racksAdded' | 'racksSold' | 'cloudAdded' | 'cloudDropped'>): ChangePart[] => PART_ORDER.flatMap(tier => {
  const added = tier === 'CLOUD' ? preview.cloudAdded : preview.racksAdded[tier];
  const sold = tier === 'CLOUD' ? preview.cloudDropped : preview.racksSold[tier];
  return [...(added > 0 ? [partOf(tier, 1, added)] : []), ...(sold > 0 ? [partOf(tier, -1, sold)] : [])];
});
/** every change at once: a maker's slots added up across the regions, in the same order */
const mergeParts = (lists: ChangePart[][]): ChangePart[] => {
  const merged = new Map<string, ChangePart>();
  lists.flat().forEach(item => {
    const was = merged.get(item.key);
    merged.set(item.key, was ? partOf(item.tier, item.sign, was.count + item.count) : item);
  });
  return [...merged.values()].sort((a, b) => PART_ORDER.indexOf(a.tier) - PART_ORDER.indexOf(b.tier) || b.sign - a.sign);
};
/** what the button says it does: build for a price, sell for a refund */
const actionFor = (capital: number, refund: number, all = false) => (capital > 0
  ? `${all ? 'Build all' : 'Build'} · ${money(capital)}`
  : refund > 0 ? `${all ? 'Sell all' : 'Sell'} · +${money(refund)}` : all ? 'Build all' : 'Build it');
const UndoIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </svg>
);
const CloudIcon = () => (
  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 18h10.5a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.34 9.5 4.25 4.25 0 0 0 7 18Z" />
  </svg>
);
/** #99 the makers a change touches, a slot each (Zeesh: "more clean, symmetric and good premium"): the maker's mark in its own
 *  colour, + or − how many, its name. The slots share the bar's width evenly; one slot reads as a line ("+3
 *  Workhorses"), four drop their names, and past four the last says how many more. What Suggest drew is tagged. */
const ChangeSlots: React.FC<{ parts: ChangePart[]; tag?: string | null }> = ({ parts, tag }) => {
  const shown = parts.length > 4 ? parts.slice(0, 3) : parts;
  const more = parts.length - shown.length;
  const count = shown.length + (more > 0 ? 1 : 0);
  return (
    <div className={['nd-slots', count === 1 ? 'is-single' : '', count > 3 ? 'is-dense' : ''].filter(Boolean).join(' ')}
      style={{ ['--n' as string]: count } as React.CSSProperties} role="list" aria-label="What changes">
      {tag && <small className="nd-bar-tag">{tag}</small>}
      {shown.map(part => (
        <span key={part.key} role="listitem" aria-label={part.text}
          className={`nd-slot is-${part.tier.toLowerCase()} ${part.sign > 0 ? 'is-plus' : 'is-minus'}`}>
          <i aria-hidden="true">{part.tier === 'CLOUD' ? <CloudIcon /> : <ServerMark tier={part.tier} />}</i>
          <b key={part.count} aria-hidden="true">{part.sign > 0 ? '+' : '−'}{part.count}</b>
          <em aria-hidden="true">{count === 1 ? part.names : part.name}</em>
        </span>
      ))}
      {more > 0 && <span role="listitem" className="nd-slot is-more" aria-label={`and ${more} more`}><b aria-hidden="true">+{more}</b><em aria-hidden="true">more</em></span>}
    </div>
  );
};

/* #93: a region's build coming into service plays its moment once; what has played is remembered on this device (the
   session's own list when storage is unavailable) */
const ONLINE_SEEN_KEY = 'ae.networkOnline.seen';
const onlineSeenThisSession = new Set<string>();
const onlineSeen = (): Set<string> => {
  try {
    const stored = JSON.parse(window.localStorage.getItem(ONLINE_SEEN_KEY) || '[]');
    return new Set([...onlineSeenThisSession, ...(Array.isArray(stored) ? stored.map(String) : [])]);
  } catch {
    return new Set(onlineSeenThisSession);
  }
};
const markOnlineSeen = (ids: string[]) => {
  ids.forEach(id => onlineSeenThisSession.add(id));
  try {
    window.localStorage.setItem(ONLINE_SEEN_KEY, JSON.stringify([...onlineSeen(), ...ids].slice(-40)));
  } catch { /* the session's list still holds them */ }
};
const MOMENT_MS = 3400;
/* #96: Build it presses at once and sweeps; the game hears a beat later, and "Ordered" stands in the bar a moment */
const ORDER_SWEEP_MS = 420;
const ORDERED_MS = 1800;

/** what a region's change does to it, before → after (#93) */
interface ChangeEffect {
  servedBefore: number;
  servedAfter: number;
  carriedBefore: number;
  carriedAfter: number;
  weeklyBefore: number;
  weeklyAfter: number;
}

export const NetworkDeskBoard: React.FC<NetworkDeskBoardProps> = ({ data, initialDraft, built, toSave, toDraft, regionPlanOf, desk, onWatchNight, requestedRegion }) => {
  const builtKey = useMemo(() => signature(built), [built]);
  const [draft, setDraft] = useState<BuildDraft>(initialDraft);
  const [openId, setOpenId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [suggesting, setSuggesting] = useState<string | null>(null);
  const [moment, setMoment] = useState<OwnedStreamingNetworkOrder[] | null>(null);
  const [moneyOpen, setMoneyOpen] = useState(false);
  const [allSites, setAllSites] = useState(false);
  const [ordering, setOrdering] = useState<string | null>(null);
  const [ordered, setOrdered] = useState<{ what: string; when: string; regionIds: string[] } | null>(null);
  /* #97: Suggest says what it did where the eye already is, the bar: "All set" for a moment, or the drawing it made,
     tagged, with what stays short */
  const [notice, setNotice] = useState<{ title: string; text: string } | null>(null);
  const [suggested, setSuggested] = useState<{ regionIds: string[]; short: string | null } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  /* what stands changed (an order came into service, or another tab changed it): draw from it again */
  useEffect(() => { setDraft(initialDraft); }, [builtKey]); // eslint-disable-line react-hooks/exhaustive-deps
  /* a word that went well fades on its own; one that went wrong stays until the next */
  useEffect(() => {
    if (!message?.ok) return undefined;
    const timer = window.setTimeout(() => setMessage(null), 8000);
    return () => window.clearTimeout(timer);
  }, [message]);
  useEffect(() => {
    if (!ordered) return undefined;
    const timer = window.setTimeout(() => setOrdered(null), ORDERED_MS);
    return () => window.clearTimeout(timer);
  }, [ordered]);
  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const patch = useCallback((next: Partial<BuildDraft>) => setDraft(current => ({ ...current, ...next })), []);
  const totals = useMemo(() => buildTotals(data, draft), [data, draft]);
  const services = useMemo(() => serviceForecast(data, draft), [data, draft]);
  const standing = useMemo(() => serviceForecast(data, initialDraft), [data, initialDraft]);
  const drawn = useMemo(() => toSave(draft), [draft, toSave]);
  const building = desk.orders.filter(order => order.status === 'BUILDING');
  const online = desk.orders.filter(order => order.status === 'DONE' && (order.completedAtAbsoluteWeek ?? -1) >= desk.absoluteWeek - 1);
  const busy = (regionId: string) => building.find(order => order.regionId === regionId) || null;
  /* the regions the company sells in, as Build's board lists them */
  const regionViews = useMemo(() => regionsOf(data).filter(region => region.opening.length > 0), [data]);

  /* #93: NETWORK ONLINE — a region's build in service plays once, like Tech's level-up */
  const onlineKey = online.map(order => order.id).join('|');
  useEffect(() => {
    if (!onlineKey) return;
    const seen = onlineSeen();
    const fresh = online.filter(order => !seen.has(order.id));
    if (!fresh.length) return;
    markOnlineSeen(fresh.map(order => order.id));
    setMoment(fresh);
  }, [onlineKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!moment) return undefined;
    const timer = window.setTimeout(() => setMoment(null), MOMENT_MS);
    return () => window.clearTimeout(timer);
  }, [moment]);
  const skipMoment = useCallback(() => setMoment(null), []);

  /* every region drawn differently from what stands, with what ordering it would do, and (#93) what it does to the
     region: its markets served, what it carries and its week's cost, before → after, in Build's own figures. What it
     carries is told in the engine's capacity (#96: Build's model counts a network about a quarter higher than the weekly
     close does, so its figures are scaled by what stands: the strip's 59.8M and the bar's add up). */
  const carriedScale = useMemo(() => {
    const whole = buildTotals(data, initialDraft);
    const modelled = whole.capacity + whole.burst;
    return modelled > 0 && desk.capacityStreams > 0 ? desk.capacityStreams / modelled : 1;
  }, [data, initialDraft, desk.capacityStreams]);
  const changes = useMemo(() => {
    const regionIds = Array.from(new Set([...built, ...drawn].map(facility => streamingNetworkRegionOf(facility.cityId)).filter(Boolean))) as string[];
    const carried = (from: BuildDraft, regionId: string) => {
      const regionTotals = buildTotals(data, { ...from, facilities: from.facilities.filter(facility => draftRegion(facility) === regionId) });
      return (regionTotals.capacity + regionTotals.burst) * carriedScale;
    };
    return regionIds.flatMap(regionId => {
      const before = built.filter(facility => streamingNetworkRegionOf(facility.cityId) === regionId);
      const after = drawn.filter(facility => streamingNetworkRegionOf(facility.cityId) === regionId);
      if (signature(before) === signature(after)) return [];
      const view = regionViews.find(region => region.id === regionId);
      const was = view ? regionReport(data, initialDraft, standing, view) : null;
      const now = view ? regionReport(data, draft, services, view) : null;
      const effect: ChangeEffect | null = was && now ? {
        servedBefore: was.peak > 0 ? was.served / was.peak : 0,
        servedAfter: now.peak > 0 ? now.served / now.peak : 0,
        carriedBefore: carried(initialDraft, regionId),
        carriedAfter: carried(draft, regionId),
        weeklyBefore: was.weekly,
        weeklyAfter: now.weekly,
      } : null;
      return [{ regionId, after, preview: desk.preview(regionId, after), effect }];
    });
  }, [built, drawn, desk, data, draft, initialDraft, services, standing, regionViews, carriedScale]);
  const changeOf = (regionId: string) => changes.find(change => change.regionId === regionId) || null;
  /* #91: the three nights on what stands, and on the drawing when it differs */
  const drawnDiffers = changes.length > 0;
  const nights = useMemo(() => {
    const run = data.canonical?.runRehearsal;
    if (!run) return null;
    return STREAMING_NETWORK_NIGHTS.map(night => ({ ...night, now: run(initialDraft, night.id), after: drawnDiffers ? run(draft, night.id) : null }));
  }, [data, initialDraft, draft, drawnDiffers]);
  useEffect(() => { if (requestedRegion) setOpenId(requestedRegion.regionId); }, [requestedRegion]);

  /* #93 Suggest (plan §17.2: "Suggest network works per region and for all of them"): what a region needs to hold a
     surge and reach 80% of each of its markets, in Workhorses the placer lays where the people are.
     - Capacity: the surge on the drawing; its rooms here that run hot ask for racks of a Workhorse's 65K (the
       rehearsal's own sizing), with no room here the region's whole surge does, and plays still failing add one. Six
       rounds at most.
     - Reach: the fewest more (up to 12) that bring every market here to 80% served. The placer opens a city only once
       a region has racks enough, so reach comes in steps; with none reaching 80%, the fewest that lift the short
       markets most, if that is 3 points or more.
     What stays short, the message names. Its price is the order's own, in the bar. (The wizard's Suggest prices a whole
     network as new, so the desk has this one.) */
  const suggestRegion = (base: BuildDraft, regionId: string): { draft: BuildDraft; added: number } => {
    const run = data.canonical?.runRehearsal;
    const view = regionViews.find(region => region.id === regionId);
    if (!run || !view) return { draft: base, added: 0 };
    const here = (cityId: string) => streamingNetworkRegionOf(cityId) === regionId;
    const unservable = new Set(regionReport(data, base, serviceForecast(data, base), view).unservable.markets.map(market => market.id));
    const withMore = (from: BuildDraft, count: number) => {
      const setup = regionReport(data, from, serviceForecast(data, from), view).setup;
      return placeRegion(data, from, regionId, { ...setup, servers: { ...setup.servers, WORKHORSE: setup.servers.WORKHORSE + count } }).draft;
    };
    let next = base;
    let added = 0;
    for (let round = 0; round < 6; round += 1) {
      const result = run(next, 'SURGE');
      const countries = result.countries.filter(country => country.regionId === regionId && !unservable.has(country.marketId));
      const rooms = result.facilities.filter(room => here(room.cityId));
      const hotRacks = rooms.reduce((sum, room) => sum + (room.verdict !== 'HELD' || room.loadPercent >= 82
        ? Math.ceil(Math.max(0, room.demand - room.steadyCapacity * .72) / 65_000) : 0), 0);
      const homeless = rooms.length === 0 && countries.length > 0
        ? Math.ceil(countries.reduce((sum, country) => sum + country.demand, 0) / (65_000 * .72)) : 0;
      /* a market's failed share counts its people out of reach too; those are reach's, not capacity's */
      const failing = countries.some(country => country.failedPercent > (country.unreachablePercent ?? 0) + .5);
      const need = Math.max(hotRacks, homeless, failing ? 1 : 0);
      if (!need) break;
      next = withMore(next, need);
      added += need;
    }
    /* reach: each market's served share, capped at the 80% that counts */
    const reach = (from: BuildDraft) => regionReport(data, from, serviceForecast(data, from), view).countries
      .filter(country => country.coverageAvailable && !unservable.has(country.id))
      .map(country => Math.min(.8, country.share));
    const reachNow = reach(next);
    if (reachNow.some(share => share < .8)) {
      const scoreNow = reachNow.reduce((sum, share) => sum + share, 0);
      let best: { count: number; draft: BuildDraft; score: number } | null = null;
      for (let count = 1; count <= 12; count += 1) {
        const tried = withMore(next, count);
        const shares = reach(tried);
        const score = shares.reduce((sum, share) => sum + share, 0);
        if (!best || score > best.score + .0001) best = { count, draft: tried, score };
        if (shares.every(share => share >= .8)) break;
      }
      if (best && best.score >= scoreNow + .03) {
        next = best.draft;
        added += best.count;
      }
    }
    return { draft: next, added };
  };
  const suggest = (regionIds: string[]) => {
    const open = regionIds.filter(regionId => !busy(regionId));
    if (!open.length) return;
    setSuggesting(open.length === 1 ? open[0] : 'ALL');
    /* the press paints first; the search runs a frame later */
    window.setTimeout(() => {
      let next = draft;
      const lines: string[] = [];
      open.forEach(regionId => {
        const result = suggestRegion(next, regionId);
        next = result.draft;
        if (result.added) lines.push(`${regionName(regionId)} +${result.added} Workhorse${result.added === 1 ? '' : 's'}`);
      });
      setSuggesting(null);
      setMessage(null);
      if (!lines.length) {
        setNotice({ title: 'All set', text: open.length === 1
          ? `${regionName(open[0])} already holds a surge and reaches 80% of every market. Nothing to add.`
          : 'Every region already holds a surge and reaches 80% of every market. Nothing to add.' });
        return;
      }
      setDraft({ ...next, rehearsal: null });
      /* what the surge still finds short in these regions, said plainly */
      const after = data.canonical?.runRehearsal?.(next, 'SURGE');
      const short = (after?.countries ?? []).filter(country => open.includes(country.regionId) && country.verdict !== 'HELD')
        .map(country => `${country.country}${(country.unreachablePercent ?? 0) > 0 ? ` (${country.unreachablePercent}% out of reach)` : ''}`);
      setSuggested({ regionIds: open.filter(regionId => lines.some(line => line.startsWith(regionName(regionId)))), short: short.length ? `Still short on a surge: ${short.join(', ')}` : null });
    }, 30);
  };

  /* what stands in a region, as the save holds it: racks by maker and cloud compute */
  const builtIn = (regionId: string) => built.filter(facility => streamingNetworkRegionOf(facility.cityId) === regionId);
  const standingBy = (regionId: string): Record<SellKey, number> => {
    const rooms = builtIn(regionId);
    const counts = rooms.reduce((sum, room) => {
      const racks = streamingFacilityRacksByTier(room);
      TIERS.forEach(tier => { sum[tier] += racks[tier]; });
      return sum;
    }, { SCOUT: 0, WORKHORSE: 0, TITAN: 0 } as Record<StreamingServerTier, number>);
    return { ...counts, CLOUD: cloudOf(rooms) };
  };
  /* #96 one write for a live region, so a maker's − and + do both, as the wizard's do: below what stands sells back (the
     standing rooms lose those racks, at the region's rate), above it builds (the placer lays the new ones). Every press
     redraws the region from what stands. */
  const writeRegion = (regionId: string, setup: RegionSetup): string | null => {
    setSuggested(null);
    setNotice(null);
    const stand = standingBy(regionId);
    let rooms = built;
    TIERS.forEach(tier => {
      const sell = Math.max(0, stand[tier] - setup.servers[tier]);
      if (sell > 0) rooms = sellStreamingNetworkRacks(rooms, regionId, tier, sell);
    });
    if (setup.cloud.compute < stand.CLOUD) rooms = dropStreamingNetworkCloud(rooms, regionId, Math.max(0, setup.cloud.compute));
    const standingHere = toDraft(rooms.filter(facility => streamingNetworkRegionOf(facility.cityId) === regionId));
    const base: BuildDraft = {
      ...draft,
      facilities: [...draft.facilities.filter(facility => draftRegion(facility) !== regionId), ...standingHere],
      rehearsal: null,
    };
    const placed = placeRegion(data, base, regionId, setup);
    setDraft({ ...placed.draft, rehearsal: null });
    return placed.note || null;
  };

  /* a region back to what stands */
  const resetRegion = (regionId: string) => {
    setDraft(current => ({
      ...current,
      facilities: [
        ...current.facilities.filter(facility => draftRegion(facility) !== regionId),
        ...initialDraft.facilities.filter(facility => draftRegion(facility) === regionId),
      ],
    }));
  };
  /* Undo: the region back to what stands, and the last word about it gone with it */
  const undoRegion = (regionId: string) => {
    resetRegion(regionId);
    setMessage(null);
    setSuggested(null);
  };
  /* Build it: the press sweeps at once; the order goes a beat later; "Ordered" stands in the bar, and its row comes in
     under Building */
  const build = (changeList: Array<(typeof changes)[number]>, key: string) => {
    const ready = changeList.filter(change => change.preview.ok);
    if (!ready.length) {
      setMessage({ ok: false, text: changeList[0]?.preview.message || 'Nothing to build.' });
      return;
    }
    setOrdering(key);
    window.setTimeout(() => {
      const done: Array<(typeof changes)[number]> = [];
      const failed: string[] = [];
      ready.forEach(change => {
        const result = desk.order(change.regionId, change.after, regionPlanOf(change.after, change.regionId));
        if (result.ok) done.push(change);
        else failed.push(`${regionName(change.regionId)}: ${result.message}`);
      });
      setOrdering(null);
      setSuggested(null);
      done.forEach(change => resetRegion(change.regionId));
      if (done.length === 1) {
        const [only] = done;
        setOrdered({
          what: `${regionName(only.regionId)} · ${changeWords(only.regionId, describeStreamingNetworkChange(only.regionId, only.preview))}`,
          when: `ready ${weekLabel(desk.absoluteWeek + only.preview.buildWeeks, desk.absoluteWeek)}, in ${weeksWord(only.preview.buildWeeks)}`,
          regionIds: [only.regionId],
        });
      } else if (done.length > 1) {
        setOrdered({ what: done.map(change => regionName(change.regionId)).join(' · '), when: `${done.length} regions building side by side`, regionIds: done.map(change => change.regionId) });
      }
      setMessage(failed.length ? { ok: false, text: failed.join(' · ') } : null);
    }, ORDER_SWEEP_MS);
  };
  const speedUp = (order: OwnedStreamingNetworkOrder) => {
    const result = desk.speedUp(order.id);
    const left = Math.max(1, order.readyAtAbsoluteWeek - desk.absoluteWeek - 1);
    setMessage({ ok: result.ok, text: result.ok ? `${regionName(order.regionId)}: a week sooner, ready in ${weeksWord(left)}.` : result.message });
  };
  /* the map comes into view with a region open on it */
  const findOnMap = (regionId: string) => {
    setOpenId(regionId);
    window.requestAnimationFrame(() => rootRef.current?.querySelector('.bw-net')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  /* a region opened from the bar: its row comes into view */
  const review = (regionId: string) => {
    setOpenId(regionId);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => rootRef.current?.querySelector('.bw-rg-row.is-open')?.scrollIntoView({ behavior: 'smooth', block: 'start' })));
  };

  /* a region's head: its build under way, or what is drawn there */
  const regionBadge = (regionId: string): React.ReactNode => {
    const order = busy(regionId);
    if (order) {
      const left = Math.max(1, order.readyAtAbsoluteWeek - desk.absoluteWeek);
      return <span className={ordered?.regionIds.includes(regionId) ? 'nd-badge is-building is-new' : 'nd-badge is-building'}><i aria-hidden="true" />Building · {left} wk</span>;
    }
    const change = changeOf(regionId);
    if (!change) return null;
    const sells = TIERS.some(tier => change.preview.racksSold[tier] > 0) || change.preview.cloudDropped > 0;
    const adds = TIERS.some(tier => change.preview.racksAdded[tier] > 0) || change.preview.cloudAdded > 0;
    return <span className={adds && !sells ? 'nd-badge is-add' : !adds && sells ? 'nd-badge is-sell' : 'nd-badge'}>{changeWords(regionId, describeStreamingNetworkChange(regionId, change.preview))}</span>;
  };
  const regionExtra = (regionId: string): React.ReactNode => {
    const order = busy(regionId);
    return (
      <div className="nd-extra">
        {order ? (
          <p className="nd-busy">
            <b>Building · {changeWords(regionId, describeStreamingNetworkChange(regionId, orderChange(order)))}</b>
            <span>Ready {weekLabel(order.readyAtAbsoluteWeek, desk.absoluteWeek)}. One build a region at a time.</span>
          </p>
        ) : (
          <button type="button" className="nd-suggest" disabled={Boolean(suggesting)} onClick={() => suggest([regionId])}>
            <i className="nd-suggest-icon" aria-hidden="true">✦</i>
            <span>
              <b>{suggesting === regionId ? 'Working it out…' : 'Suggest servers'}</b>
              <em>Draws what {regionName(regionId)} needs to hold a surge and reach 80% of each market. Nothing is bought until you build.</em>
            </span>
            <i className="nd-suggest-go" aria-hidden="true" />
          </button>
        )}
      </div>
    );
  };

  /* #93: the markets each city serves: Build's own service reading names a market's two best cities (its servedBy) */
  const servedBy = useMemo(() => {
    const byCity = new Map<string, string[]>();
    standing.forEach(service => service.servedBy.forEach(cityName => byCity.set(cityName, [...(byCity.get(cityName) ?? []), service.name])));
    return byCity;
  }, [standing]);
  const sites = useMemo(() => {
    const rows = new Map<string, { cityId: string; name: string; regionId: string; racks: Record<StreamingServerTier, number>; cloud: number; origin: boolean }>();
    built.forEach(facility => {
      const site = getStreamingServerSite(facility.cityId);
      const row = rows.get(facility.cityId) || {
        cityId: facility.cityId, name: site?.name || facility.cityId, regionId: site?.regionId || '',
        racks: { SCOUT: 0, WORKHORSE: 0, TITAN: 0 }, cloud: 0, origin: false,
      };
      const racks = streamingFacilityRacksByTier(facility);
      TIERS.forEach(tier => { row.racks[tier] += racks[tier]; });
      if (isStreamingCloudFacility(facility)) row.cloud += facility.installedRacks;
      if (facility.role === 'CORE_ORIGIN') row.origin = true;
      rows.set(facility.cityId, row);
    });
    return Array.from(rows.values()).sort((a, b) => a.regionId.localeCompare(b.regionId)
      || (b.racks.TITAN + b.racks.WORKHORSE + b.racks.SCOUT + b.cloud) - (a.racks.TITAN + a.racks.WORKHORSE + a.racks.SCOUT + a.cloud));
  }, [built]);
  /* by region, the biggest region first; folded, each region shows its first three */
  const siteRegions = useMemo(() => {
    const groups = new Map<string, typeof sites>();
    sites.forEach(site => groups.set(site.regionId, [...(groups.get(site.regionId) ?? []), site]));
    const weight = (list: typeof sites) => list.reduce((sum, site) => sum + site.racks.SCOUT + site.racks.WORKHORSE + site.racks.TITAN + site.cloud, 0);
    return [...groups.entries()].map(([regionId, list]) => ({ regionId, sites: list })).sort((a, b) => weight(b.sites) - weight(a.sites));
  }, [sites]);
  const SITES_PER_REGION = 3;
  const foldedAway = siteRegions.reduce((sum, group) => sum + Math.max(0, group.sites.length - SITES_PER_REGION), 0);

  /* #93 the money: the network's row split into servers and rooms and cloud (Build's own split of the week), and what
     was paid up front this calendar year */
  const cloudShare = useMemo(() => {
    const all = buildTotals(data, initialDraft).weeklyCost;
    if (all <= 0) return 0;
    const cloud = buildTotals(data, { ...initialDraft, facilities: initialDraft.facilities.filter(facility => facility.tenure === 'CLOUD') }).weeklyCost;
    return Math.max(0, Math.min(1, cloud / all));
  }, [data, initialDraft]);
  /* #99 each part keeps its shade on the week's dial and beside its row: the brand's, darker part by part, and
     incidents red */
  const moneyRows = desk.money.flatMap(row => {
    if (row.id !== 'NETWORK') return [{ label: row.label, note: '', weekly: row.weekly }];
    const servers = { label: 'Servers and rooms', note: 'rent, power, water and staff', weekly: row.weekly * (1 - cloudShare) };
    const cloud = { label: 'Cloud', note: 'rented compute', weekly: row.weekly * cloudShare };
    return [servers, cloud];
  }).map((row, index) => ({ ...row, shade: /^incident/i.test(row.label) ? 4 : Math.min(3, index) })).filter(row => row.weekly > 0);
  const year = Math.floor(desk.absoluteWeek / 52);
  const thisYear = desk.orders.filter(order => Math.floor(order.orderedAtAbsoluteWeek / 52) === year);
  const paidThisYear = thisYear.reduce((sum, order) => sum + order.capitalCost, 0);
  const backThisYear = thisYear.reduce((sum, order) => sum + order.refund, 0);

  /* the strip: what stands now */
  const servedMarkets = standing.filter(service => service.coveredShare >= .8).length;
  const weekly = desk.money.reduce((sum, row) => sum + row.weekly, 0);
  const weeklyShown = useCountUp(weekly, { duration: 420 });
  const loadTone = desk.peakLoadPercent >= 85 ? 'is-bad' : desk.peakLoadPercent >= 70 ? 'is-warn' : 'is-good';

  const nightDetail = (shown: RunResult) => (shown.failedPercent > 0 ? `${+shown.failedPercent.toFixed(1)}% of plays fail · ${shown.estimatedDowntimeMinutes} min down`
    /* the rehearsal breaks a market any part of which no room reaches, with no play failing */
    : shown.countries.some(country => (country.unreachablePercent ?? 0) > 0) ? 'part of a market out of reach'
      : shown.verdict === 'BURST' ? 'into its reserve capacity' : shown.verdict === 'HELD' ? 'every play starts' : 'past its reserve capacity');
  /* #97 the load test in one line: the worst of the three nights (on the drawing when it differs), what moved, and
     whether a fix is worth suggesting */
  const testLine = useMemo(() => {
    if (!nights) return null;
    const shownOf = (night: (typeof nights)[number]) => night.after || night.now;
    const worst = [...nights].sort((a, b) => VERDICT_RANK[shownOf(b).verdict] - VERDICT_RANK[shownOf(a).verdict] || shownOf(b).failedPercent - shownOf(a).failedPercent)[0];
    const moved = nights.find(night => night.after && VERDICT_RANK[night.after.verdict] !== VERDICT_RANK[night.now.verdict]) || null;
    const shown = shownOf(worst);
    const verdict = VERDICT[shown.verdict];
    const line = moved
      ? `With your changes: ${moved.name} ${VERDICT[moved.now.verdict].word.toLowerCase()} → ${VERDICT[moved.after!.verdict].word.toLowerCase()}`
      : shown.verdict === 'HELD' ? 'This week, a big night and a surge all play' : `${worst.name}: ${nightDetail(shown)}`;
    /* #99 the card reads like a level's result: every night held, or which night (or how many) did not */
    const broke = nights.filter(night => shownOf(night).verdict === 'BROKE');
    const tight = nights.filter(night => shownOf(night).verdict === 'BURST');
    const title = broke.length === nights.length ? 'Every night breaks'
      : broke.length > 1 ? 'Two nights break'
        : broke.length === 1 ? `${broke[0].name} breaks`
          : tight.length === nights.length ? 'Every night runs tight'
            : tight.length > 1 ? 'Two nights run tight'
              : tight.length === 1 ? `${tight[0].name} runs tight` : 'All nights hold';
    return {
      tone: verdict.tone, word: verdict.word, line, title, openOn: shown.verdict === 'HELD' ? 'LIKELY' as Scenario : worst.id,
      needsFix: shown.verdict !== 'HELD' || standing.some(service => service.coveredShare < .8),
      nights: nights.map(night => ({
        id: night.id, name: night.name, tone: VERDICT[shownOf(night).verdict].tone,
        moved: Boolean(night.after && night.after.verdict !== night.now.verdict),
      })),
    };
  }, [nights, standing]); // eslint-disable-line react-hooks/exhaustive-deps

  const top = (
    <div className="nd-top">
      {/* #99 the strip as three dials (Zeesh: "like its a game … but its feeling like a saas app"): load, markets, the week's costs (a
          tap opens every part of it) */}
      <div className="nd-hud">
        <div className={`nd-hud-tile ${loadTone}`} role="img"
          aria-label={`Load ${desk.peakLoadPercent}%: ${compact(desk.peakStreams)} of ${compact(desk.capacityStreams)} at the busiest hour`}>
          <span className="nd-dial">
            <LoadDial percent={desk.peakLoadPercent} />
            <span className="nd-dial-read"><b>{desk.peakLoadPercent}%</b><em>of {compact(desk.capacityStreams)}</em></span>
          </span>
          <span className="nd-hud-name">LOAD</span>
        </div>
        <div className={servedMarkets < standing.length ? 'nd-hud-tile is-warn' : 'nd-hud-tile is-good'} role="img"
          aria-label={`Markets: ${servedMarkets} of ${standing.length} with 80% or more served`}>
          <span className="nd-dial">
            <MarketsDial shares={standing.map(service => service.coveredShare)} />
            <span className="nd-dial-read"><b>{servedMarkets}</b><em>of {standing.length}</em></span>
          </span>
          <span className="nd-hud-name">MARKETS</span>
        </div>
        <button type="button" className={moneyOpen ? 'nd-hud-tile is-money is-open' : 'nd-hud-tile is-money'} onClick={() => setMoneyOpen(!moneyOpen)}
          aria-expanded={moneyOpen} aria-controls="nd-money-panel" aria-label={`Costs: ${money(weekly)} a week. ${moneyOpen ? 'Hide' : 'Show'} every part`}>
          <span className="nd-dial">
            <MoneyDial parts={moneyRows} />
            <span className="nd-dial-read">
              <b className={money(weeklyShown).length >= 7 ? 'is-longer' : money(weeklyShown).length >= 6 ? 'is-long' : undefined}>{money(weeklyShown)}</b>
              <em>a week</em>
            </span>
          </span>
          <span className="nd-hud-name">COSTS<i aria-hidden="true" /></span>
        </button>
      </div>
      <div id="nd-money-panel" className={moneyOpen ? 'nd-money-panel is-open' : 'nd-money-panel'} aria-hidden={!moneyOpen}>
        <div>
          <ul className="nd-money">
            {moneyRows.map(row => (
              <li key={row.label}>
                <i className={`nd-swatch is-p${row.shade}`} aria-hidden="true" />
                <span>{row.label}{row.note && <em>{row.note}</em>}</span>
                <b>{money(row.weekly)}</b>
              </li>
            ))}
            <li className="is-total"><span>The whole network</span><b>{money(weekly)}</b></li>
          </ul>
          <p className="nd-money-year">
            {thisYear.length > 0
              ? <><b>{money(paidThisYear)}</b> paid up front this year for {thisYear.length} order{thisYear.length === 1 ? '' : 's'}{backThisYear > 0 ? <>, <b>+{money(backThisYear)}</b> back from sell-backs</> : ''}.</>
              : 'Nothing paid up front this year: no network orders yet.'}
          </p>
        </div>
      </div>

      {desk.pendingChange && (
        <p className="nd-msg is-wait" role="status">
          A network change from Build is finishing: in service {weekLabel(desk.pendingChange.readyAtAbsoluteWeek, desk.absoluteWeek)}, in {weeksWord(Math.max(1, desk.pendingChange.readyAtAbsoluteWeek - desk.absoluteWeek))}. New orders open when it is.
        </p>
      )}

      {message && (
        <p key={message.text} className={message.ok ? 'nd-msg is-ok' : 'nd-msg is-bad'} role="status">
          <span>{message.text}</span>
          <button type="button" onClick={() => setMessage(null)} aria-label="Dismiss">×</button>
        </p>
      )}

      {online.length > 0 && (
        <p className="nd-online" role="status">
          <i aria-hidden="true" />
          <b>ONLINE</b>
          <span>{online.map(order => describeStreamingNetworkChange(order.regionId, orderChange(order))).join(' · ')}</span>
        </p>
      )}

      {building.length > 0 && (
        <section className="nd-block">
          <p className="nd-eyebrow"><b>BUILDING</b><em>{building.length === 1 ? '1 region' : `${building.length} regions, side by side`}</em></p>
          <ul className="nd-builds">
            {building.map(order => {
              const left = Math.max(1, order.readyAtAbsoluteWeek - desk.absoluteWeek);
              const done = Math.max(0, Math.min(1, (desk.absoluteWeek - order.orderedAtAbsoluteWeek) / Math.max(1, order.readyAtAbsoluteWeek - order.orderedAtAbsoluteWeek)));
              const energy = streamingNetworkSpeedUpEnergy(order);
              const canSpeed = left > 1 && desk.energy >= energy;
              return (
                <li key={order.id} className={ordered?.regionIds.includes(order.regionId) ? 'is-new' : undefined}>
                  <span className="nd-build-who">
                    <b>{regionName(order.regionId)}</b>
                    <em>{changeWords(order.regionId, describeStreamingNetworkChange(order.regionId, orderChange(order)))} · ready {weekLabel(order.readyAtAbsoluteWeek, desk.absoluteWeek)}{order.orderedBy ? ` · by ${order.orderedBy.name.split(' ')[0]}` : ''}</em>
                  </span>
                  <span className="nd-build-left"><b>{left}</b><em>{left === 1 ? 'wk' : 'wks'}</em></span>
                  <button type="button" className="nd-speed" disabled={!canSpeed} onClick={() => speedUp(order)}
                    aria-label={left > 1 ? `Bring ${regionName(order.regionId)} a week forward for ${energy} energy` : `${regionName(order.regionId)} is a week away`}>
                    {left > 1 ? <>−1 wk · {energy}⚡</> : 'next wk'}
                  </button>
                  <i className="nd-build-bar" aria-hidden="true"><em style={{ width: `${Math.round(done * 100)}%` }} /></i>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {testLine && (
        <section className="nd-test">
          {/* #99 a level's card (Zeesh: "load test section … like its a game"): the verdict, the three nights as a bar of three
              with light running through what holds, and a play button; one tap opens the test on its worst night */}
          <button type="button" className={`nd-test-card ${testLine.tone}`} onClick={() => onWatchNight?.(drawnDiffers ? draft : initialDraft, testLine.openOn)}
            aria-label={`Load test: ${testLine.title}. ${testLine.line}. Open the load test`}>
            <span className="nd-test-text">
              <small><i aria-hidden="true" />LOAD TEST{drawnDiffers ? ' · YOUR CHANGES' : ''}</small>
              <b className="nd-test-title" key={testLine.title}>{testLine.title}</b>
              <span className="nd-test-nights" aria-hidden="true">
                {testLine.nights.map((night, index) => (
                  <span key={night.id} className={night.moved ? `${night.tone} is-moved` : night.tone} style={{ ['--i' as string]: index } as React.CSSProperties}>
                    <i /><em>{night.name}</em>
                  </span>
                ))}
              </span>
            </span>
            <span className="nd-test-play" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor" /></svg>
            </span>
          </button>
          {testLine.needsFix && (
            <button type="button" className="nd-fix" disabled={Boolean(suggesting)} onClick={() => suggest(regionViews.map(region => region.id))}>
              <i aria-hidden="true">✦</i>
              <span><b>{suggesting === 'ALL' ? 'Working it out…' : 'Suggest a fix'}</b><em>Draws what each short region needs. Nothing is bought until you build.</em></span>
            </button>
          )}
        </section>
      )}
    </div>
  );

  /* the bar, pinned under the page: what the open region would do, or every change, with the buttons always in reach.
     #97 (Zeesh: "complex lag raha hai … clean aur mazedaar"): the makers' marks, what changes, where and when, a warning
     only when something gets worse, and one button that says what it does. */
  const pending = changes.filter(change => !busy(change.regionId));
  const openChange = openId ? changeOf(openId) : null;
  const openOrder = openId ? busy(openId) : null;
  const warningFor = (change: (typeof changes)[number]): string | null => {
    if (!change.preview.ok) return change.preview.message;
    if (suggested?.short && suggested.regionIds.includes(change.regionId)) return suggested.short;
    const effect = change.effect;
    if (effect && effect.servedAfter < effect.servedBefore - .005) return `Served here drops to ${percent(effect.servedAfter)}`;
    const worse = nights?.find(night => night.after && VERDICT_RANK[night.after.verdict] > VERDICT_RANK[night.now.verdict]);
    return worse ? `${worse.name}: ${VERDICT[worse.now.verdict].word.toLowerCase()} → ${VERDICT[worse.after!.verdict].word.toLowerCase()}` : null;
  };
  let bar: React.ReactNode = null;
  if (ordered) {
    bar = (
      <div className="nd-bar is-done" role="status" key="ordered">
        <i className="nd-check" aria-hidden="true" />
        <span className="nd-bar-title"><b>Ordered</b><em>{ordered.what} · {ordered.when}</em></span>
      </div>
    );
  } else if (notice) {
    bar = (
      <div className="nd-bar is-notice" role="status" key={`notice-${notice.text}`}>
        <i className="nd-check is-info" aria-hidden="true" />
        <span className="nd-bar-title"><b>{notice.title}</b><em>{notice.text}</em></span>
      </div>
    );
  } else if (openId && openChange && !openOrder) {
    /* #99 (Zeesh: "more clean, symmetric and good premium"): where and when on one line, a slot a maker, then Undo
       beside the one button; money back from a sale rides under the button's price */
    const { preview } = openChange;
    const warning = warningFor(openChange);
    bar = (
      <div className={['nd-bar', ordering === openId ? 'is-ordering' : '', preview.ok ? '' : 'is-blocked'].filter(Boolean).join(' ')} key={`change-${openId}`}>
        <p className="nd-bar-where"><b>{regionName(openId)}</b><em>ready in {weeksWord(preview.buildWeeks)}</em></p>
        <ChangeSlots parts={changeParts(preview)} tag={suggested?.regionIds.includes(openId) ? '✦ Suggested' : null} />
        {warning && <p className="nd-bar-warn" key={warning}><i aria-hidden="true">!</i>{warning}</p>}
        <div className="nd-bar-actions">
          <button type="button" className="nd-bar-icon" disabled={Boolean(ordering)} onClick={() => undoRegion(openId)} aria-label={`Undo the changes in ${regionName(openId)}`}><UndoIcon /></button>
          <button type="button" className="nd-bar-build" disabled={!preview.ok || Boolean(ordering)} onClick={() => build([openChange], openId)}>
            <span>{ordering === openId ? 'Ordering…' : actionFor(preview.capitalCost, preview.refund)}</span>
            {preview.capitalCost > 0 && preview.refund > 0 && ordering !== openId && <small>+{money(preview.refund)} back from the sale</small>}
          </button>
        </div>
      </div>
    );
  } else if (openId) {
    const left = openOrder ? Math.max(1, openOrder.readyAtAbsoluteWeek - desk.absoluteWeek) : 0;
    bar = (
      <div className="nd-bar is-quiet" key={`open-${openId}`}>
        <span className="nd-bar-title">
          <b>{regionName(openId)}</b>
          <em>{openOrder ? `building · ready in ${weeksWord(left)}` : `+ builds more · − sells back at ${Math.round(streamingNetworkResaleRate(openId) * 100)}%`}</em>
        </span>
        <button type="button" className="nd-bar-done" onClick={() => setOpenId(null)}>Done</button>
      </div>
    );
  } else if (pending.length > 0) {
    const now = pending.reduce((sum, change) => sum + change.preview.capitalCost, 0);
    const back = pending.reduce((sum, change) => sum + change.preview.refund, 0);
    const warning = pending.map(warningFor).find(Boolean) || null;
    const allSuggested = Boolean(suggested) && pending.every(change => suggested?.regionIds.includes(change.regionId));
    bar = (
      <div className={ordering === 'ALL' ? 'nd-bar is-ordering' : 'nd-bar'} key="all">
        <button type="button" className="nd-bar-where is-button" onClick={() => review(pending[0].regionId)}>
          <b>{pending.length > 2 ? `${pending.length} regions` : pending.map(change => regionName(change.regionId)).join(' · ')}</b>
          <em>{pending.length === 1 ? `ready in ${weeksWord(pending[0].preview.buildWeeks)} · ` : ''}review ›</em>
        </button>
        <ChangeSlots parts={mergeParts(pending.map(change => changeParts(change.preview)))} tag={allSuggested ? '✦ Suggested' : null} />
        {warning && <p className="nd-bar-warn" key={warning}><i aria-hidden="true">!</i>{warning}</p>}
        <div className="nd-bar-actions">
          <button type="button" className="nd-bar-icon" disabled={Boolean(ordering)} aria-label="Undo every change"
            onClick={() => { pending.forEach(change => resetRegion(change.regionId)); setMessage(null); setSuggested(null); }}><UndoIcon /></button>
          <button type="button" className="nd-bar-build" disabled={Boolean(ordering) || !pending.some(change => change.preview.ok)} onClick={() => build(pending, 'ALL')}>
            <span>{ordering === 'ALL' ? 'Ordering…' : actionFor(now, back, pending.length > 1)}</span>
            {now > 0 && back > 0 && ordering !== 'ALL' && <small>+{money(back)} back from the sale</small>}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className={openId ? 'sf nd-desk is-editing' : 'sf nd-desk'} style={brandVars(data.company.brandHex) as React.CSSProperties}>
      <RegionBoard
        data={data}
        draft={draft}
        patch={patch}
        totals={totals}
        plan={undefined as never}
        services={services}
        handlers={{}}
        managed={false}
        teamProposal={null}
        setTeamProposal={() => undefined}
        selectedRegionId={openId}
        onSelectRegion={setOpenId}
        focusRegionId={requestedRegion?.regionId}
        live
        renderRegionExtra={regionExtra}
        afterMap={top}
        liveDesk={{
          standing: regionId => {
            const stand = standingBy(regionId);
            return { servers: { SCOUT: stand.SCOUT, WORKHORSE: stand.WORKHORSE, TITAN: stand.TITAN }, cloud: stand.CLOUD };
          },
          resaleRate: streamingNetworkResaleRate,
          write: writeRegion,
          badge: regionBadge,
          locked: regionId => Boolean(busy(regionId)),
        }}
      />

      <details className="nd-sites-box">
        <summary>
          <span><b>Sites</b><em>{sites.length} {sites.length === 1 ? 'city' : 'cities'} in {siteRegions.length} {siteRegions.length === 1 ? 'region' : 'regions'}</em></span>
          <i aria-hidden="true" />
        </summary>
        <div className="nd-sites-body">
          {siteRegions.map(group => (
            <div key={group.regionId} className="nd-site-region">
              <p className="nd-site-region-head"><b>{regionName(group.regionId)}</b><em>{group.sites.length} {group.sites.length === 1 ? 'city' : 'cities'}</em></p>
              <ul className="nd-sites">
                {(allSites ? group.sites : group.sites.slice(0, SITES_PER_REGION)).map(site => {
                  const markets = servedBy.get(site.name) ?? [];
                  return (
                    <li key={site.cityId}>
                      <button type="button" className="nd-site" onClick={() => findOnMap(site.regionId)} aria-label={`${site.name}: find it on the map`}>
                        <i className={site.origin ? 'is-origin' : undefined} aria-hidden="true" />
                        <span className="nd-site-who"><b>{site.name}</b><em>{site.origin ? 'Origin' : 'Hub'}</em></span>
                        <span className="nd-site-kit">
                          {TIERS.filter(tier => site.racks[tier] > 0).map(tier => <b key={tier} className={`is-${tier.toLowerCase()}`}>{site.racks[tier]} {STREAMING_SERVER_TIERS[tier].name}{site.racks[tier] === 1 ? '' : 's'}</b>)}
                          {site.cloud > 0 && <b className="is-cloud">{site.cloud} cloud</b>}
                        </span>
                        {markets.length > 0 && (
                          <span className="nd-site-serves">serves {markets.slice(0, 3).join(', ')}{markets.length > 3 ? ` +${markets.length - 3} more` : ''}</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {foldedAway > 0 && (
            <button type="button" className="nd-more" onClick={() => setAllSites(!allSites)}>{allSites ? 'Show fewer' : `Show all ${sites.length} cities`}</button>
          )}
        </div>
      </details>

      {bar && <div className="nd-bar-dock">{bar}</div>}

      {moment && <OnlineMoment orders={moment} accent={data.company.brandHex} onSkip={skipMoment} />}
    </div>
  );
};

/** #93 NETWORK ONLINE (plan §17.6: "a moment like Tech's plays"): over the whole screen, a region's build coming into
 *  service; a tap or Escape skips it, and nothing under it moves. */
const OnlineMoment: React.FC<{ orders: OwnedStreamingNetworkOrder[]; accent: string; onSkip: () => void }> = ({ orders, accent, onSkip }) => {
  const layer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = layer.current;
    if (!node) return undefined;
    const hold = (event: WheelEvent) => event.preventDefault();
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') onSkip(); };
    node.addEventListener('wheel', hold, { passive: false });
    window.addEventListener('keydown', key);
    return () => {
      node.removeEventListener('wheel', hold);
      window.removeEventListener('keydown', key);
    };
  }, [onSkip]);
  const [first, ...more] = orders;
  const words = (order: OwnedStreamingNetworkOrder) => changeWords(order.regionId, describeStreamingNetworkChange(order.regionId, orderChange(order)));
  /* a build that adds comes online; one that only sells back is a change done */
  const grew = orders.some(order => TIERS.some(tier => order.racksDelta[tier] > 0) || order.cloudDelta > 0);
  return createPortal(
    <div ref={layer} className="nd-moment" style={{ ['--nd-ac' as string]: accent, animationDuration: `${MOMENT_MS}ms` }} onClick={onSkip}
      role="status" aria-label={`${grew ? 'Network online' : 'Network updated'}: ${orders.map(order => `${regionName(order.regionId)}, ${words(order)}`).join('; ')}`}>
      <div className="nd-moment-core" aria-hidden="true"><i /><i /><i /><span /></div>
      <small>{grew ? 'NETWORK ONLINE' : 'NETWORK UPDATED'}</small>
      <b>{regionName(first.regionId)}</b>
      <em>{words(first)}</em>
      {more.map(order => <p key={order.id}>{regionName(order.regionId)} · {words(order)}</p>)}
      <span className="nd-moment-foot">{grew ? 'In service from this week' : 'Done this week'} · tap to go on</span>
    </div>,
    document.body,
  );
};
