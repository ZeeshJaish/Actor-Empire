/* ============================================================================
   AUDIENCE ATLAS — the model behind the living map.

   Pure functions only. The map, the region tiles and the country card all read
   the same three things from here:

     · where each country stands for you (live, on its way, or open ground)
     · what each region adds up to
     · who holds the homes in a country

   Everything is derived from the canonical world rows the Audience market view
   already carries (`worldCountries`) and the platform's own market operations.
   Nothing here estimates, saves or charges anything.
   ========================================================================== */

import type { OwnedStreamingMarketOperation, StreamingMarketOperationStatus } from '../../types';
import type { StreamingAudienceWorldCountryView } from '../../services/streamingAudienceMarket';
import {
  STREAMING_DAY_ONE_REGION_LABELS,
  STREAMING_DAY_ONE_REGION_ORDER,
  type StreamingDayOneRegionId,
} from '../../services/streamingDayOneMarkets';

export type AtlasRegionId = StreamingDayOneRegionId;

/** The three states a market can be in, as the player thinks of it. */
export type MarketState = 'LIVE' | 'OPENING' | 'PAUSED' | 'AVAILABLE';

export interface AtlasCountry {
  id: string;
  name: string;
  regionId: AtlasRegionId;
  state: MarketState;
  status: StreamingMarketOperationStatus | null;
  /** 0–100 while a market is moving through review; null otherwise. */
  progress: number | null;
  view: StreamingAudienceWorldCountryView;
}

export interface AtlasShare {
  id: string;
  name: string;
  color: string;
  /** Share of this country's (or region's) paying homes, 0–100. */
  share: number;
  households: number;
}

export interface AtlasRegionSummary {
  id: AtlasRegionId;
  label: string;
  countries: number;
  live: number;
  opening: number;
  playerAccounts: number;
  /** Your audience by your primary model (accounts, ad homes or buyers). */
  playerAudience: number;
  playerNetChange: number;
  activeViewers: number;
  payingHouseholds: number;
  unclaimedHouseholds: number;
  leader: AtlasShare | null;
  /** Fourteen equal segments in proportion to the states of the region's
      countries — the same strip the Build wizard's Test stage draws. */
  segments: MarketState[];
}

const OPENING_STATUSES = new Set<StreamingMarketOperationStatus>([
  'PLANNED', 'AWAITING_FUNDING', 'CLEARANCE', 'INFRASTRUCTURE_PREPARATION', 'READY',
]);

export const marketStateOf = (status: StreamingMarketOperationStatus | null | undefined): MarketState => {
  if (status === 'ACTIVE') return 'LIVE';
  if (status === 'SUSPENDED') return 'PAUSED';
  if (status && OPENING_STATUSES.has(status)) return 'OPENING';
  return 'AVAILABLE';
};

/** The newest country-level operation per country. A country can carry an
    old exited file and a new one; the newest one is the truth. */
const latestOperationByCountry = (operations: OwnedStreamingMarketOperation[]): Map<string, OwnedStreamingMarketOperation> => {
  const byCountry = new Map<string, OwnedStreamingMarketOperation>();
  operations.forEach(operation => {
    if (operation.scope !== 'COUNTRY') return;
    const id = String(operation.countryId || operation.scopeId || '').toUpperCase();
    if (!id) return;
    const current = byCountry.get(id);
    if (!current || operation.plannedAtAbsoluteWeek >= current.plannedAtAbsoluteWeek) byCountry.set(id, operation);
  });
  return byCountry;
};

export const buildAtlasCountries = (
  worldCountries: StreamingAudienceWorldCountryView[] | undefined,
  operations: OwnedStreamingMarketOperation[] = [],
): AtlasCountry[] => {
  if (!worldCountries?.length) return [];
  const byCountry = latestOperationByCountry(operations);
  return worldCountries.map(view => {
    const operation = byCountry.get(view.id);
    const status = operation?.status ?? null;
    const state = marketStateOf(status);
    return {
      id: view.id,
      name: view.name,
      regionId: view.regionId,
      state,
      status,
      progress: state === 'OPENING' && operation?.clearance ? Math.round(operation.clearance.progressPercent) : null,
      view,
    };
  });
};

/** Who holds the paying homes, largest first, with the homes nobody holds yet
    reported separately. Shares are of reachable homes so the unclaimed slice
    is honest: a market where most homes chose nobody looks like one. */
export const sharesOf = (
  rows: Array<{ platformHouseholds: StreamingAudienceWorldCountryView['platformHouseholds']; reachableHouseholds: number; unclaimedHouseholds: number }>,
): { shares: AtlasShare[]; unclaimedShare: number; base: number } => {
  const totals = new Map<string, AtlasShare>();
  let reachable = 0;
  let unclaimed = 0;
  rows.forEach(row => {
    reachable += row.reachableHouseholds;
    unclaimed += row.unclaimedHouseholds;
    row.platformHouseholds.forEach(platform => {
      const current = totals.get(platform.id) || { id: platform.id, name: platform.name, color: platform.color, share: 0, households: 0 };
      current.households += platform.households;
      totals.set(platform.id, current);
    });
  });
  const held = Array.from(totals.values()).reduce((sum, item) => sum + item.households, 0);
  /* Platforms can hold more subscriptions than there are homes (a home can pay
     for two services). The bar is drawn against whichever is larger, so the
     slices never overflow it. */
  const base = Math.max(1, reachable, held + unclaimed);
  const shares = Array.from(totals.values())
    .map(item => ({ ...item, share: item.households / base * 100 }))
    .sort((left, right) => right.households - left.households || left.id.localeCompare(right.id));
  return { shares, unclaimedShare: unclaimed / base * 100, base };
};

const SEGMENTS = 14;

/** Fourteen segments in proportion; any non-zero state keeps at least one
    segment, so a single live market in a region of fifty is still visible. */
export const segmentsOf = (countries: AtlasCountry[]): MarketState[] => {
  const total = countries.length;
  if (!total) return Array.from({ length: SEGMENTS }, () => 'AVAILABLE');
  const order: MarketState[] = ['LIVE', 'OPENING', 'PAUSED', 'AVAILABLE'];
  const counts = order.map(state => countries.filter(country => country.state === state).length);
  const sizes = counts.map(count => (count === 0 ? 0 : Math.max(1, Math.round(count / total * SEGMENTS))));
  let overflow = sizes.reduce((sum, size) => sum + size, 0) - SEGMENTS;
  /* Take any rounding excess from the biggest bucket, give any shortfall to it. */
  const biggest = sizes.indexOf(Math.max(...sizes));
  while (overflow > 0 && sizes[biggest] > 1) { sizes[biggest] -= 1; overflow -= 1; }
  while (overflow < 0) { sizes[biggest] += 1; overflow += 1; }
  return order.flatMap((state, index) => Array.from({ length: sizes[index] }, () => state)).slice(0, SEGMENTS);
};

export const summariseRegions = (countries: AtlasCountry[]): AtlasRegionSummary[] => (
  STREAMING_DAY_ONE_REGION_ORDER.map(regionId => {
    const inRegion = countries.filter(country => country.regionId === regionId);
    const { shares } = sharesOf(inRegion.map(country => country.view));
    const sum = (pick: (country: AtlasCountry) => number) => inRegion.reduce((total, country) => total + pick(country), 0);
    return {
      id: regionId,
      label: STREAMING_DAY_ONE_REGION_LABELS[regionId],
      countries: inRegion.length,
      live: inRegion.filter(country => country.state === 'LIVE').length,
      opening: inRegion.filter(country => country.state === 'OPENING').length,
      playerAccounts: sum(country => country.view.playerAccounts),
      playerAudience: sum(country => country.view.playerAudience),
      playerNetChange: sum(country => country.view.playerNetChange),
      activeViewers: sum(country => country.view.activeViewers),
      payingHouseholds: sum(country => country.view.payingHouseholds),
      unclaimedHouseholds: sum(country => country.view.unclaimedHouseholds),
      leader: shares.find(item => item.id !== 'PLAYER') ?? null,
      segments: segmentsOf(inRegion),
    };
  })
);

/* ── your audience, in the words of your business model ─────────────────── */
/* A subscription service counts paid accounts; an ad-supported one counts the
   homes that watched it free this week; a rent-or-buy store counts this week's
   buyers. Every label in the room comes from this one table. */
export type AudienceKind = 'ACCOUNTS' | 'AD_HOMES' | 'BUYERS';
export const AUDIENCE_WORDS: Record<AudienceKind, {
  /** "1.2M paid accounts" */
  plural: string;
  /** a column or chip: "accounts" */
  short: string;
  /** the map key */
  legend: string;
  /** the header stat */
  header: string;
  /** under a region's figure */
  region: string;
  /** the funnel's last row */
  funnel: string;
}> = {
  ACCOUNTS: { plural: 'paid accounts', short: 'your accounts', legend: 'Your accounts', header: 'SUBSCRIBERS', region: 'your paid accounts', funnel: 'PAY YOU' },
  AD_HOMES: { plural: 'homes watching free', short: 'homes watching you', legend: 'Your viewers', header: 'AD HOMES', region: 'homes watching you free', funnel: 'WATCH YOU FREE' },
  BUYERS: { plural: 'buyers this week', short: 'buyers this week', legend: 'Your buyers', header: 'BUYERS / WK', region: 'buyers this week', funnel: 'BOUGHT FROM YOU' },
};

/** Short names for the map's small labels. */
export const REGION_SHORT_LABELS: Record<AtlasRegionId, string> = {
  NORTH_AMERICA: 'N. AMERICA',
  SOUTH_AMERICA: 'S. AMERICA',
  EUROPE: 'EUROPE',
  AFRICA: 'AFRICA',
  ASIA: 'ASIA',
  OCEANIA: 'OCEANIA',
};

export const MARKET_STATE_LABELS: Record<MarketState, string> = {
  LIVE: 'Live',
  OPENING: 'On its way',
  PAUSED: 'Paused',
  AVAILABLE: 'Open ground',
};

/** A compact count: 4,927 → 4.9K, 773,041,000 → 773M. */
export const compact = (value: number): string => {
  const n = Math.abs(value);
  const sign = value < 0 ? '−' : '';
  if (n >= 1e9) return `${sign}${(n / 1e9).toFixed(n >= 1e10 ? 1 : 2)}B`;
  if (n >= 1e6) return `${sign}${(n / 1e6).toFixed(n >= 1e8 ? 0 : 1)}M`;
  if (n >= 1e3) return `${sign}${(n / 1e3).toFixed(n >= 1e5 ? 0 : 1)}K`;
  return `${sign}${Math.round(n)}`;
};

export const signedCompact = (value: number): string => (value > 0 ? `+${compact(value)}` : value < 0 ? compact(value) : '±0');

/** A share of homes: a new platform's sliver reads "<0.01%", never "0.00%". */
export const formatShare = (share: number): string => {
  if (share <= 0) return '0%';
  if (share < 0.01) return '<0.01%';
  if (share < 1) return `${share.toFixed(2)}%`;
  return `${share.toFixed(share < 10 ? 1 : 0)}%`;
};
