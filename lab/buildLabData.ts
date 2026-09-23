/* ============================================================================
   DEV HARNESS — real Build data without a career.

   The Build wizard normally receives its world from
   StreamingBuildWizardExperience, which can only assemble it from a live game
   state. Designing the Network page against that means playing to it every
   time. This builds the same shape from the same catalogues the game reads —
   the day-one markets, the production locations, the facility marketplace — so
   the page under design is looking at the real world, not a fixture with three
   cities in it.

   Nothing here is imported by the game. It exists for lab.html.
   ========================================================================== */

import {
  STREAMING_DAY_ONE_MARKETS,
  STREAMING_DAY_ONE_REGION_LABELS,
  type StreamingDayOneRegionId,
} from '../services/streamingDayOneMarkets';
import { getStreamingFacilityMarketplace } from '../services/streamingFacilityMarketplace';
import { STREAMING_SERVER_SITES } from '../services/streamingServerSites';
import { listingToBuild } from '../components/streaming-transplant/StreamingBuildWizardExperience';
import { getCountryPosition } from '../services/worldEconomy/worldCountryGeography';
import { WORLD_COUNTRY_DEFINITIONS } from '../services/worldEconomy/worldCountryRegistry';
import { DEFAULT_FIBRE_STATE, type StreamingFibreState } from '../services/streamingFibreLadder';
import type {
  BuildData, BuildDraft, City, FacilityListing,
} from '../components/studio-finance/finance/build';

const REGION_LINES: Record<StreamingDayOneRegionId, string> = {
  NORTH_AMERICA: 'Deep fibre, expensive attention and the strongest subscription habit.',
  SOUTH_AMERICA: 'Fast audience growth with one or two cities carrying enormous distances.',
  EUROPE: 'Dense exchanges, expensive power and strict infrastructure obligations.',
  AFRICA: 'Mobile-first growth where power resilience matters as much as fibre.',
  ASIA: 'The largest audiences, sharp price pressure and long routes between hubs.',
  OCEANIA: 'Strong subscription markets separated from the rest of the network by ocean.',
};

const plotFor = (index: number, count: number): { x: number; y: number } => {
  const slots = [{ x: 30, y: 46 }, { x: 58, y: 38 }, { x: 48, y: 66 }, { x: 72, y: 58 }];
  return slots[Math.min(index, Math.max(0, Math.min(slots.length - 1, count - 1)))] || slots[0];
};

/** Which markets the lab opens in. Kept small and spread, the way a first
    launch actually looks: a home market, a European one, one long route. */
export const LAB_OPENING_MARKET_IDS = ['US', 'GB', 'DE', 'IN', 'BR', 'AU', 'ID', 'RU'];

export function createLabBuildData(
  openingIds: string[] = LAB_OPENING_MARKET_IDS,
  fibre?: StreamingFibreState,
  platformWeeks?: number,
): BuildData {
  const opening = new Set(openingIds);

  const regions = (Object.entries(STREAMING_DAY_ONE_REGION_LABELS) as Array<[StreamingDayOneRegionId, string]>)
    .map(([id, name]) => ({ id, name, line: REGION_LINES[id] }));

  const dayOneById = new Map(STREAMING_DAY_ONE_MARKETS.map(market => [market.id, market]));
  const countries = WORLD_COUNTRY_DEFINITIONS.map(country => ({
    id: `country:${country.id}`,
    regionId: country.regionId,
    name: country.name,
    code: country.id,
    shape: country.id === 'GB' ? 'uk' : country.id.toLowerCase(),
    opening: opening.has(country.id),
    note: dayOneById.get(country.id)?.marketNote || `${country.name} network market.`,
  }));

  /* Sites, as the game builds them: the server catalogue, each naming its own
     country, rather than film locations forced through a hand-written table. */
  const cities: City[] = STREAMING_SERVER_SITES.map((entry, index) => ({
    id: entry.id,
    name: entry.name,
    countryId: `country:${entry.countryCode}`,
    country: entry.countryCode,
    code: entry.countryCode,
    coord: { lat: entry.latitude, lng: entry.longitude },
    plot: plotFor(index % 4, 4),
    recommended: STREAMING_DAY_ONE_MARKETS.some(market => market.recommendedCityId === entry.id),
    note: `Tier ${entry.tier} · ${entry.powerPricePerKwh}c power`,
  }));

  const listings: FacilityListing[] = cities.flatMap(city => (
    getStreamingFacilityMarketplace(city.id).map(listingToBuild)
  ));

  /* The full 197, not the 24 authored ones — otherwise a derived market like
     Indonesia cannot be opened here and the map has nothing to show for it. */
  const markets = WORLD_COUNTRY_DEFINITIONS
    .filter(country => opening.has(country.id))
    .map(country => {
      return {
        id: country.id,
        name: country.name,
        code: country.id,
        /* Where the audience is, not where it is served from. This read the
           recommended city's coordinates and fell back to 0,0 — the Gulf of
           Guinea — for every market the film catalogue did not hold, which was
           most of them. The country's own position now answers it. */
        coord: (() => {
          const position = getCountryPosition(country.id);
          return position
            ? { lat: position.latitude, lng: position.longitude }
            : { lat: 0, lng: 0 };
        })(),
        /* The same shape the experience uses: audience to a concurrent-stream
           peak, then divided by the .09 concurrency assumption. */
        demand: Math.max(1, Math.round(country.baselinePopulation * 0.00018) / 0.09),
        catalogue: 0.9,
      };
    });

  return {
    company: { name: 'Lab Platform', week: 12, brandHex: '#e0322f' },
    treasury: { available: 900_000_000, committedLaunch: 0 },
    hasExplicitOpeningMarkets: true,
    /* The lab starts at the bottom of the ladder on day one, so what you see is
       a new platform's reach and the launch standard. */
    fibre: fibre ?? DEFAULT_FIBRE_STATE,
    platformWeeks: platformWeeks ?? 0,
    markets,
    regions,
    countries,
    cities,
    listings,
    presets: [],
    campaigns: [],
    spend: [],
    pricing: { model: 'Two plans', plans: 2, arpu: 11, reach: markets.reduce((sum, m) => sum + m.demand, 0), problems: [] },
    repairs: [],
    team: { priority: 'BALANCED', maxBudget: 400_000_000, risk: 'NORMAL', preferredCityIds: [], askAbove: 50_000_000 },
    existing: [],
    commissioned: false,
  };
}

export function createLabDraft(): BuildDraft {
  return {
    facilities: [],
    architecture: 'HYBRID',
    ownedShare: 0.6,
    doctrine: 'STANDARD',
    campaignId: '',
    mode: 'HANDS',
    instructions: { priority: 'BALANCED', maxBudget: 400_000_000, risk: 'NORMAL', preferredCityIds: [], askAbove: 50_000_000 },
    repairIds: [],
    rehearsal: null,
    override: false,
  };
}
