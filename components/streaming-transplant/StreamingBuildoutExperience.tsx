/**
 * EMPIRE+ v2 — THE BUILD
 *
 * Pre-launch the platform is not a company yet, so this is not a dashboard and
 * it is not a settings page. It is a cheque being spent on things that do not
 * exist. Three ideas carry the whole screen:
 *
 *   THE HALLS      infrastructure is a place, not a tier. Racks stand in named
 *                  cities. The page scrolls DOWN through your cities and each
 *                  hall scrolls ACROSS through its racks, so buying more never
 *                  shrinks anything — the room simply gets longer.
 *   ONE BUDGET     servers, catalogue, originals and the campaign all eat the
 *                  same pot. The decision is never "which tier is best", it is
 *                  "what am I willing to be bad at".
 *   THE REHEARSAL  a simulated premiere night, run before the real one — and it
 *                  breaks city by city, so you find out which of your own
 *                  territories you let down.
 *
 * The cruel links: marketing raises demand, and demand is what breaks servers;
 * and every rack you place in a cheap city is a rack far away from someone.
 */
import css from './presentation/screens/Buildout/Buildout.module.css';
import { cx } from './presentation/cx';
import { brandVars } from './presentation/brand';
import {
  StreamingBuildNetworkMap,
  type NetworkMapNode,
} from './StreamingBuildNetworkMap';
import { StreamingFacilityRoom } from './StreamingFacilityRoom';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type {
  OwnedStreamingFacility,
  OwnedStreamingRackGroup,
  StreamingDefineLaunchStepId,
  StreamingInfrastructureManagementPolicy,
  StreamingFacilityType,
  StreamingNetworkNodeRole,
  StreamingRackDuty,
} from '../../types';
import {
  aggregateStreamingFacilities,
  getStreamingFacilityCapacity,
  getStreamingFacilityContract,
  getStreamingFacilitySetupCost,
  getStreamingFacilityWeeklyRent,
  migratePlacementsToStreamingFacilities,
} from '../../services/streamingFacilities';
import {
  createStreamingRackGroupId,
  getProjectedRackDuty,
  getStreamingRackDutyRule,
  normalizeStreamingRackGroups,
  projectFacilityNetworkRole,
  STREAMING_RACK_DUTIES,
} from '../../services/streamingRackGroups';
import {
  createStreamingFacilityFromListing,
  getRecommendedStreamingFacilityListing,
  getStreamingFacilityMarketplace,
  type StreamingFacilityMarketplaceListing,
} from '../../services/streamingFacilityMarketplace';
import { normalizeStreamingInfrastructureManagementPolicy } from '../../services/streamingInfrastructureManagement';
import {
  applyStreamingFacilityRepair,
  getStreamingFacilityPhysicalView,
  getStreamingFacilityPhysicalUpgradeCost,
  type StreamingFacilityRepairAction,
  type StreamingFacilityPhysicalView,
} from '../../services/streamingInfrastructurePhysical';
import {
  createStreamingLaunchRehearsal,
  type StreamingLaunchRehearsalResult,
  type StreamingRehearsalRepairAction,
  type StreamingRehearsalScenario,
  type StreamingRehearsalVerdict,
} from '../../services/streamingLaunchRehearsal';
import {
  Brand, Mark, City, CITIES, RegionId, REGIONS, brandColor, brandDeep,
  cityById, latencyTo,
} from './StreamingBrandVisuals';

/* ============================================================
   MODEL
   ============================================================ */

export type PkgId = 'STARTER' | 'ESSENTIAL' | 'GROWTH' | 'PREMIERE';
export type ArchId = 'CLOUD' | 'HYBRID' | 'OWNED';
export type DoctrineId = 'SAFE' | 'STANDARD' | 'RUSHED';
export type CampId = 'NONE' | 'REGIONAL' | 'NATIONAL';
export type Scenario = 'QUIET' | 'LIKELY' | 'SURGE';
type BuildStage = 'SITES' | 'PLANS' | 'MONEY' | 'TEST' | 'LAUNCH';

const BUILD_STAGES: Array<{
  id: BuildStage;
  title: string;
  line: string;
}> = [
  { id: 'SITES', title: 'Place the network', line: 'Choose the cities and rooms that will carry opening night.' },
  { id: 'PLANS', title: 'Shape the machine', line: 'Set capacity, ownership and the pace of construction.' },
  { id: 'MONEY', title: 'Clear the cheque', line: 'Make the network, catalogue and launch fit one treasury.' },
  { id: 'TEST', title: 'Face the crowd', line: 'See what viewers feel, then push a real opening-night load.' },
  { id: 'LAUNCH', title: 'Sign the build', line: 'Review the final gates before money moves and steel arrives.' },
];

/** Compatibility projection used by the launch and market simulation. */
export interface Placement { cityId: string; racks: number; role: StreamingNetworkNodeRole }

export interface BuildSel {
  placements: Placement[];
  /** The physical source of truth. Missing only on saves created before Phase 1. */
  facilities?: OwnedStreamingFacility[];
  arch: ArchId;
  doctrine: DoctrineId;
  campaign: CampId;
  /** Workflow preference only. It never modifies derive() by itself. */
  managementPolicy?: StreamingInfrastructureManagementPolicy;
}

export interface BuildInputs {
  /** Current game week, used for maintenance history in persistent drafts. */
  absoluteWeek?: number;
  treasury: number;
  catalogueSpend: number;
  catalogueTitles: number;
  catalogueRights?: {
    globalTitleCount: number;
    primaryMarketId: string | null;
    licensedTitles: Array<{ territory: 'DOMESTIC' | 'MULTI_REGION' | 'GLOBAL' }>;
  };
  originalsSpend: number;
  originalsCount: number;
  /** Paid Define-the-Launch decisions shown again at commissioning so the two
      wizards read as one launch plan without charging them twice. */
  defineLaunchPaid?: Array<{ id: string; label: string; amount: number; note?: string }>;
  /** Canonical confirmations from the companion Define-the-Launch wizard. */
  defineLaunchChecks?: Array<{
    id: string;
    label: string;
    complete: boolean;
    detail: string;
    step: StreamingDefineLaunchStepId;
  }>;
  premiereTitle: string;
  /** the territories the player took in the wizard */
  regions: RegionId[];
  /** where the app can be opened, even before those places become paid launch markets */
  coverageRegions?: RegionId[];
  /** exact countries chosen in Day-One Markets; regions remain a migration fallback */
  markets?: Array<{
    id: string;
    country: string;
    region: RegionId;
    audience: number;
    annualGrowthPercent: number;
    recommendedCityId: string;
    localizationNote: string;
  }>;
  /** canonical advisory topology derived from the selected market IDs */
  recommendedPlacements?: Placement[];
  /** legacy fallback only; founding no longer chooses a data centre */
  homeCityId: string | null;
  /** how much bigger the crowd is because of the plans on sale (see pricing.tsx) */
  audienceMul: number;
  /** weekly repayment on anything borrowed (see raise.tsx) */
  debtWeekly?: number;
}

export interface BuildCommitResult {
  ok: boolean;
  message: string;
  next?: 'BACK' | 'LAUNCH';
}

/* one rack is the unit of everything — capacity, money, time */
export const PER_RACK_CEILING = 65_000;
const PER_RACK_CAPEX = 3_750_000;
const PER_RACK_WEEKLY = 90_000;
/** viewers per person of reachable population on a premiere night */
const DEMAND_RATE = 0.00018;

const ROLE_RULES: Record<StreamingNetworkNodeRole, {
  name: string; technical: string; short: string; line: string;
  capex: number; weekly: number; ceiling: number; cache: number; latency: number;
}> = {
  CORE_ORIGIN: {
    name: 'Main library', technical: 'Core origin', short: 'ORIGIN',
    line: 'Stores every title and controls the master stream. Your network needs one.',
    capex: 1, weekly: 1, ceiling: 1, cache: 100, latency: 12,
  },
  REGIONAL_HUB: {
    name: 'Region relay', technical: 'Regional hub', short: 'HUB',
    line: 'Copies the library closer to a region, reducing distance and taking load off the main site.',
    capex: .78, weekly: .84, ceiling: .95, cache: 76, latency: 4,
  },
  EDGE_CACHE: {
    name: 'Fast cache', technical: 'Edge cache', short: 'EDGE',
    line: 'Keeps popular titles near viewers for faster starts. It still depends on a library or relay.',
    capex: .48, weekly: .62, ceiling: .82, cache: 42, latency: 0,
  },
};

export const facilitiesOf = (sel: Pick<BuildSel, 'placements' | 'facilities'>): OwnedStreamingFacility[] => (
  sel.facilities?.length
    ? sel.facilities.map(facility => {
      const rackGroups = normalizeStreamingRackGroups(
        facility.rackGroups,
        facility.id,
        facility.installedRacks,
        facility.role,
      );
      return {
        ...facility,
        role: projectFacilityNetworkRole(rackGroups),
        lease: facility.lease ? { ...facility.lease } : undefined,
        rackGroups: rackGroups.map(group => ({
          ...group,
          migration: group.migration ? { ...group.migration } : undefined,
        })),
      };
    })
    : migratePlacementsToStreamingFacilities(sel.placements)
);

export const selectionWithFacilities = (
  sel: BuildSel,
  facilities: OwnedStreamingFacility[],
): BuildSel => {
  const normalizedFacilities = facilities.map(facility => {
    const rackGroups = normalizeStreamingRackGroups(
      facility.rackGroups,
      facility.id,
      facility.installedRacks,
      facility.role,
    );
    return {
      ...facility,
      role: projectFacilityNetworkRole(rackGroups),
      lease: facility.lease ? { ...facility.lease } : undefined,
      rackGroups: rackGroups.map(group => ({
        ...group,
        migration: group.migration ? { ...group.migration } : undefined,
      })),
    };
  });
  return {
    ...sel,
    facilities: normalizedFacilities,
    placements: aggregateStreamingFacilities(normalizedFacilities),
  };
};

const withSyncedRackGroups = (
  facility: OwnedStreamingFacility,
  installedRacks = facility.installedRacks,
): OwnedStreamingFacility => {
  const rackGroups = normalizeStreamingRackGroups(
    facility.rackGroups,
    facility.id,
    Math.max(1, installedRacks),
    facility.role,
  );
  return {
    ...facility,
    installedRacks,
    rackGroups,
    role: projectFacilityNetworkRole(rackGroups),
  };
};

const withFacilityNetworkRole = (
  facility: OwnedStreamingFacility,
  role: StreamingNetworkNodeRole,
): OwnedStreamingFacility => {
  const groups = normalizeStreamingRackGroups(facility.rackGroups, facility.id, facility.installedRacks, facility.role);
  const duty: StreamingRackDuty = role === 'CORE_ORIGIN'
    ? 'CONTENT_ORIGIN'
    : role === 'REGIONAL_HUB' ? 'REGIONAL_CACHE' : 'LOCAL_EDGE';
  groups[0] = {
    ...groups[0],
    duty,
    migration: undefined,
    name: `${getStreamingRackDutyRule(duty).name} 1`,
  };
  return { ...facility, role, rackGroups: groups };
};

const facilitiesForPlacements = (placements: Placement[]): OwnedStreamingFacility[] => (
  placements.reduce<OwnedStreamingFacility[]>((facilities, placement) => {
    const listing = getRecommendedStreamingFacilityListing(placement.cityId, placement.racks, false);
    if (listing) {
      facilities.push(createStreamingFacilityFromListing(
        listing,
        facilities,
        placement.role,
        placement.racks,
      ));
      return facilities;
    }
    const migrated = migratePlacementsToStreamingFacilities([placement])[0];
    if (migrated) facilities.push({ ...migrated, id: `FACILITY-${placement.cityId}-${String(facilities.length + 1).padStart(2, '0')}` });
    return facilities;
  }, [])
);

/* ── presets: a starting point, not a cage ─────────────────── */
interface Pkg { id: PkgId; name: string; sub: string; racks: number; cities: number }
export const PACKAGES: Pkg[] = [
  { id: 'STARTER', name: 'Starter Rack', sub: 'One room, one city', racks: 2, cities: 1 },
  { id: 'ESSENTIAL', name: 'Essential Grid', sub: 'Two cities, one spare', racks: 4, cities: 2 },
  { id: 'GROWTH', name: 'Growth Network', sub: 'Three cities, real spare', racks: 7, cities: 3 },
  { id: 'PREMIERE', name: 'Premiere Network', sub: 'Built for opening night', racks: 10, cities: 4 },
];

/* ── rent it, own it, or both ──────────────────────────────── */
interface Arch {
  id: ArchId; name: string; line: string;
  capexMul: number; weeklyMul: number; weeksMul: number;
  capacityMul: number; burst: number; latencyAdd: number; onPremFrac: number;
}
export const ARCHS: Arch[] = [
  {
    id: 'CLOUD', name: 'Cloud-first', line: 'Rent everything. Cheap to start, expensive forever.',
    capexMul: .55, weeklyMul: 1.50, weeksMul: .65, capacityMul: 1, burst: .45, latencyAdd: 18, onPremFrac: .18,
  },
  {
    id: 'HYBRID', name: 'Hybrid', line: 'Own the core, rent the edge. No answer is wrong.',
    capexMul: 1, weeklyMul: 1, weeksMul: 1, capacityMul: 1, burst: .20, latencyAdd: 8, onPremFrac: .5,
  },
  {
    id: 'OWNED', name: 'Owned metal', line: 'Buy the machines. Brutal upfront, cheap for years.',
    capexMul: 1.45, weeklyMul: .65, weeksMul: 1.35, capacityMul: 1.1, burst: 0, latencyAdd: 0, onPremFrac: 1,
  },
];

/* ── how carefully it gets built ───────────────────────────── */
interface Doctrine {
  id: DoctrineId; name: string; line: string;
  weeksMul: number; costMul: number; debt: number; ceilingMul: number; wobble: number;
}
export const DOCTRINES: Doctrine[] = [
  { id: 'SAFE', name: 'Hardened', line: 'Tested twice. Nothing falls over.', weeksMul: 1.25, costMul: 1.10, debt: 0, ceilingMul: 1.00, wobble: .00 },
  { id: 'STANDARD', name: 'Standard', line: 'Normal engineering. Normal risk.', weeksMul: 1.00, costMul: 1.00, debt: 4, ceilingMul: 1.00, wobble: .04 },
  { id: 'RUSHED', name: 'Sprint', line: 'Corners cut. You will pay this back.', weeksMul: .55, costMul: 1.15, debt: 14, ceilingMul: 1.00, wobble: .12 },
];

/* ── the campaign, which is also the trap ──────────────────── */
interface Camp { id: CampId; name: string; line: string; cost: number; demandMul: number }
export const CAMPAIGNS: Camp[] = [
  { id: 'NONE', name: 'No campaign', line: 'Word of mouth. Whoever finds you, finds you.', cost: 0, demandMul: 1.00 },
  { id: 'REGIONAL', name: 'Regional push', line: 'Outdoor, radio, one chat show.', cost: 1_800_000, demandMul: 1.55 },
  { id: 'NATIONAL', name: 'National campaign', line: 'Everyone in the country knows the date.', cost: 4_600_000, demandMul: 2.45 },
];

export const SCENARIOS: { id: Scenario; name: string; sub: string; mul: number }[] = [
  { id: 'QUIET', name: 'Quiet night', sub: 'Fewer turn up than you hoped', mul: .55 },
  { id: 'LIKELY', name: 'Likely', sub: 'What your team actually expects', mul: 1.0 },
  { id: 'SURGE', name: 'Surge', sub: 'It catches. Everyone at once', mul: 1.9 },
];

const archOf = (id: ArchId) => ARCHS.find(a => a.id === id)!;
const docOf = (id: DoctrineId) => DOCTRINES.find(d => d.id === id)!;
const campOf = (id: CampId) => CAMPAIGNS.find(c => c.id === id)!;
const regionOf = (id: RegionId) => REGIONS.find(r => r.id === id)!;

/** rent, power and people are not the same price everywhere */
export const costIndex = (c: City) => c.cost / 10_000_000;

/** the territories actually being served — never an empty list */
export const territoriesOf = (regions: RegionId[]): RegionId[] =>
  regions.length ? regions : ['NORTH_AMERICA'];

/** The obvious cities, best-connected first, taken one territory at a time so a
 *  two-territory player gets one in each before a second in either. Falls back
 *  to further cities inside the same territory when there is only one. */
export const suggestedCities = (regions: RegionId[], want = 1, homeCityId?: string | null): City[] => {
  const pools = [...territoriesOf(regions)]
    .sort((a, b) => regionOf(b).viewers - regionOf(a).viewers)
    .map(r => CITIES.filter(c => c.region === r)
      .sort((a, b) => (b.hub ? 1 : 0) - (a.hub ? 1 : 0) || a.cost - b.cost));

  const out: City[] = [];
  /* the headquarters city was chosen in the wizard and the platform is already
     staffed there — the first hall always goes where the company already is */
  const home = cityById(homeCityId ?? null);
  if (home) {
    out.push(home);
    for (const pool of pools) {
      const i = pool.findIndex(x => x.id === home.id);
      if (i >= 0) pool.splice(i, 1);
    }
  }
  for (let round = 0; out.length < want && round < 6; round++) {
    let added = false;
    for (const pool of pools) {
      if (out.length >= want) break;
      if (pool[round]) { out.push(pool[round]); added = true; }
    }
    if (!added) break;
  }
  return out;
};

/** spread a preset's racks across the obvious cities, biggest territory first.
 *  Racks that would overflow a city's floor spill into the next one rather than
 *  quietly vanishing — the chip promises a rack count and must deliver it. */
export const presetPlacements = (id: PkgId, regions: RegionId[], homeCityId?: string | null): Placement[] => {
  const p = PACKAGES.find(x => x.id === id)!;
  const need = Math.ceil(p.racks / 32);
  const cities = suggestedCities(regions, Math.max(p.cities, need), homeCityId);
  if (!cities.length) return [];
  const out: Placement[] = cities.map((c, index) => ({
    cityId: c.id,
    racks: 0,
    role: index === 0 ? 'CORE_ORIGIN' : index === 1 ? 'REGIONAL_HUB' : 'EDGE_CACHE',
  }));
  let left = p.racks;
  while (left > 0) {
    const open = out.filter(x => x.racks < 32);
    if (!open.length) break;
    for (const slot of open) { if (left <= 0) break; slot.racks++; left--; }
  }
  return out.filter(x => x.racks > 0);
};

/** which preset, if any, the current placements still match */
export const matchedPreset = (sel: BuildSel, regions: RegionId[], homeCityId?: string | null): PkgId | null => {
  const key = (ps: Placement[]) =>
    [...ps].filter(p => p.racks > 0).map(p => `${p.cityId}:${p.racks}:${p.role}`).sort().join('|');
  const mine = key(sel.placements);
  return PACKAGES.find(p => key(presetPlacements(p.id, regions, homeCityId)) === mine)?.id ?? null;
};

/* ============================================================
   DERIVED — every number on the screen comes out of here, so a
   display can never disagree with the thing it is displaying.
   ============================================================ */
export interface RackGroupView extends OwnedStreamingRackGroup {
  projectedDuty: StreamingRackDuty;
  capacity: number;
  viewerShare: number;
  serves: RegionId[];
}

export interface HallView {
  facilityId: string; facilityType: StreamingFacilityType;
  capacityRacks: number; freeRacks: number; facilitySetup: number; facilityWeekly: number;
  coolingKw: number; provisioningWeeks: number;
  providerName: string; contractWeeks: number | null; electricityRate: number | null;
  reliability: number | null; expansionRackPositions: number;
  city: City; racks: number; onPrem: number; remote: number;
  role: StreamingNetworkNodeRole;
  rackGroups: RackGroupView[];
  migrationWeeks: number;
  migrationPressurePercent: number;
  campusLabel: string; facilityCount: number; cacheHit: number;
  ceiling: number; burstCeiling: number;
  capex: number; weekly: number;
  /** territories this hall is the nearest placed city for */
  serves: RegionId[];
  /** worst latency among the territories it serves */
  latency: number | null;
  /** % of this hall's own ceiling used by a likely premiere night */
  load: number;
  physical: StreamingFacilityPhysicalView;
}
export interface CoverageRow {
  region: RegionId; label: string; viewers: number;
  cityId: string | null; cityLabel: string;
  latency: number | null; share: number; isLaunchMarket: boolean;
  cacheHit: number; bufferRisk: number; quality: 'EXCELLENT' | 'GOOD' | 'UNSTABLE' | 'POOR';
}
export interface CountryServiceRow {
  marketId: string; country: string; region: RegionId; audience: number;
  cityId: string | null; cityLabel: string; role: StreamingNetworkNodeRole | null;
  latency: number | null; cacheHit: number; bufferRisk: number;
  quality: CoverageRow['quality']; demand: number; loadPct: number;
  repairCityId: string; repairLabel: string; localizationNote: string;
  routeFacilityIds: string[]; servingCityLabels: string[];
  catalogueAvailableTitles: number; catalogueTotalTitles: number;
}
export interface Derived {
  capex: number; weekly: number; weeks: number;
  opsReserve: number; campaignCost: number; debtReserve: number;
  committed: number; remaining: number; over: boolean;
  ceiling: number; burstCeiling: number;
  racks: number; debt: number;
  /** Physical rooms may share a city. Outage safety counts locations, not leases. */
  uniqueCityCount: number;
  halls: HallView[];
  coverage: CoverageRow[];
  countryService: CountryServiceRow[];
  /** worst latency anyone in your territories suffers */
  worstLatency: number | null;
  /** territories with no server anywhere */
  unserved: RegionId[];
  averageLatency: number | null;
  averageCacheHit: number;
  bufferingRisk: number;
  deliveryCostPerHour: number;
  energyKwhWeekly: number;
  waterLitresWeekly: number;
  sustainabilityScore: number;
  publicReputation: number;
  limitingFactors: string[];
  resilienceLabel: 'FRAGILE' | 'EXPOSED' | 'REDUNDANT';
  plainSummary: string;
  demandTotal: (s: Scenario) => number;
  demandOfCity: (cityId: string, s: Scenario) => number;
}

export function derive(sel: BuildSel, inp: BuildInputs): Derived {
  const a = archOf(sel.arch), d = docOf(sel.doctrine), c = campOf(sel.campaign);
  const marketTerr = territoriesOf(inp.regions);
  const terr = territoriesOf(inp.coverageRegions?.length ? inp.coverageRegions : inp.regions);

  const facilities = facilitiesOf(sel);
  const placements = aggregateStreamingFacilities(facilities);
  const placed = placements
    .filter(p => p.racks > 0)
    .map(p => ({ p, city: cityById(p.cityId) }))
    .filter((x): x is { p: Placement; city: City } => !!x.city);

  /* A territory is carried by every hall close enough to serve it — not only the
     single nearest one — and the traffic splits between them by rack count. Any
     other rule would leave a second city in the same region standing idle, which
     is not how a delivery network behaves and would make redundancy worthless. */
  const NEARBY_MS = 30;
  const totalViewers = terr.reduce((s, r) => s + regionOf(r).viewers, 0);
  const marketViewers = inp.markets?.length
    ? inp.markets.reduce((sum, market) => sum + market.audience, 0)
    : marketTerr.reduce((s, r) => s + regionOf(r).viewers, 0);
  const marketViewersByRegion = new Map<RegionId, number>();
  if (inp.markets?.length) {
    inp.markets.forEach(market => marketViewersByRegion.set(
      market.region,
      (marketViewersByRegion.get(market.region) || 0) + market.audience,
    ));
  } else {
    marketTerr.forEach(region => marketViewersByRegion.set(region, regionOf(region).viewers));
  }
  const cityShare = new Map<string, number>();
  const poolOf = new Map<RegionId, string[]>();

  const coverage: CoverageRow[] = terr.map(r => {
    const cands = placed.map(({ p, city }) => ({
      city, racks: p.racks, role: p.role,
      cacheHit: Math.min(98, ROLE_RULES[p.role].cache + Math.round(Math.log2(Math.max(1, p.racks)) * 7)),
      ms: (latencyTo(city, r) ?? 999) + ROLE_RULES[p.role].latency
        + a.latencyAdd + (d.id === 'RUSHED' ? 9 : 0),
    })).sort((x, y) => x.ms - y.ms);

    const worldwideShare = totalViewers ? regionOf(r).viewers / totalViewers : 0;
    const demandShare = marketTerr.includes(r) && marketViewers
      ? (marketViewersByRegion.get(r) || 0) / marketViewers
      : 0;
    // Headline experience numbers describe the market the player is actually
    // opening today. The expanded table still previews every future region.
    const share = demandShare || (marketViewers ? 0 : worldwideShare);
    if (!cands.length) {
      return {
        region: r, label: regionOf(r).label, viewers: regionOf(r).viewers,
        cityId: null, cityLabel: 'NO SERVER', latency: null, share,
        isLaunchMarket: marketTerr.includes(r),
        cacheHit: 0, bufferRisk: 100, quality: 'POOR' as const,
      };
    }
    const best = cands[0];
    const pool = cands.filter(x => x.ms <= best.ms + NEARBY_MS);
    const poolRacks = pool.reduce((s, x) => s + x.racks * ROLE_RULES[x.role].ceiling, 0) || 1;
    for (const x of pool) {
      cityShare.set(x.city.id, (cityShare.get(x.city.id) ?? 0)
        + demandShare * ((x.racks * ROLE_RULES[x.role].ceiling) / poolRacks));
    }
    poolOf.set(r, pool.map(x => x.city.id));

    const cacheHit = Math.round(pool.reduce((sum, x) => sum + x.cacheHit * x.racks, 0)
      / Math.max(1, pool.reduce((sum, x) => sum + x.racks, 0)));
    const bufferRisk = Math.max(1, Math.min(38, Math.round(
      Math.max(0, best.ms - 42) * .105 + Math.max(0, 68 - cacheHit) * .16 + (d.id === 'RUSHED' ? 3.5 : 0),
    )));
    const quality: CoverageRow['quality'] = bufferRisk <= 3 && best.ms < 70 ? 'EXCELLENT'
      : bufferRisk <= 7 && best.ms < 125 ? 'GOOD'
        : bufferRisk <= 15 ? 'UNSTABLE' : 'POOR';
    return {
      region: r, label: regionOf(r).label, viewers: regionOf(r).viewers,
      cityId: best.city.id,
      cityLabel: pool.length > 1 ? `${best.city.label} +${pool.length - 1}` : best.city.label,
      latency: best.ms, share, isLaunchMarket: marketTerr.includes(r), cacheHit, bufferRisk, quality,
    };
  });

  const halls: HallView[] = facilities.flatMap(facility => {
    const city = cityById(facility.cityId);
    if (!city) return [];
    const p: Placement = { cityId: facility.cityId, racks: facility.installedRacks, role: facility.role };
    const idx = costIndex(city);
    const contract = getStreamingFacilityContract(facility.type);
    const physical = getStreamingFacilityPhysicalView(facility, facility.lease?.electricityRatePerKwh);
    const capacityRacks = getStreamingFacilityCapacity(facility);
    const facilitySetup = getStreamingFacilitySetupCost(facility) * (facility.lease ? 1 : idx);
    const facilityWeekly = getStreamingFacilityWeeklyRent(facility) * (facility.lease ? 1 : idx);
    const serves = coverage.filter(x => (poolOf.get(x.region) ?? []).includes(city.id));
    const onPrem = a.onPremFrac >= 1
      ? p.racks
      : Math.max(1, Math.round(p.racks * a.onPremFrac));
    const rackGroups = normalizeStreamingRackGroups(
      facility.rackGroups,
      facility.id,
      facility.installedRacks,
      facility.role,
    );
    const migrationPressurePercent = rackGroups.reduce((max, group) => (
      Math.max(max, group.migration?.pressurePercent || 0)
    ), 0);
    const migrationMultiplier = 1 - migrationPressurePercent / 100;
    const rawGroupCapacity = rackGroups.reduce((sum, group) => {
      const rule = getStreamingRackDutyRule(getProjectedRackDuty(group));
      return sum + group.rackCount * PER_RACK_CEILING * rule.capacityMultiplier;
    }, 0);
    const ceiling = Math.round(rawGroupCapacity * d.ceilingMul * a.capacityMul * migrationMultiplier * physical.steadyCapacityFactor);
    const burstCeiling = Math.round(rawGroupCapacity * d.ceilingMul * a.capacityMul * migrationMultiplier
      * (1 + a.burst) * physical.burstCapacityFactor);
    const groupCapacityTotal = Math.max(1, rawGroupCapacity);
    const groupViews: RackGroupView[] = rackGroups.map(group => {
      const projectedDuty = getProjectedRackDuty(group);
      const rule = getStreamingRackDutyRule(projectedDuty);
      const capacity = Math.round(group.rackCount * PER_RACK_CEILING * rule.capacityMultiplier * d.ceilingMul * a.capacityMul * (physical.usableCapacityFactor / 100));
      return {
        ...group,
        projectedDuty,
        capacity,
        viewerShare: capacity / groupCapacityTotal,
        serves: serves.map(row => row.region),
      };
    });
    const weightedCache = Math.round(rackGroups.reduce((sum, group) => (
      sum + getStreamingRackDutyRule(getProjectedRackDuty(group)).cacheScore * group.rackCount
    ), 0) / Math.max(1, p.racks));
    const weightedCapex = rackGroups.reduce((sum, group) => (
      sum + group.rackCount * getStreamingRackDutyRule(getProjectedRackDuty(group)).capexMultiplier
    ), 0);
    const weightedWeekly = rackGroups.reduce((sum, group) => (
      sum + group.rackCount * getStreamingRackDutyRule(getProjectedRackDuty(group)).weeklyMultiplier
    ), 0);
    return {
      facilityId: facility.id,
      facilityType: facility.type,
      capacityRacks,
      freeRacks: Math.max(0, capacityRacks - p.racks),
      facilitySetup: Math.round(facilitySetup),
      facilityWeekly: Math.round(facilityWeekly),
      coolingKw: physical.coolingUsedKw,
      provisioningWeeks: facility.lease?.provisioningWeeks ?? contract.provisioningWeeks,
      providerName: facility.lease?.providerName || 'Legacy city contract',
      contractWeeks: facility.lease?.contractWeeks ?? null,
      electricityRate: facility.lease?.electricityRatePerKwh ?? null,
      reliability: physical.reliabilityPercent,
      expansionRackPositions: facility.lease?.expansionRackPositions || 0,
      city, racks: p.racks, onPrem, remote: p.racks - onPrem,
      role: p.role,
      rackGroups: groupViews,
      migrationWeeks: rackGroups.reduce((max, group) => Math.max(max, group.migration?.weeks || 0), 0),
      migrationPressurePercent,
      campusLabel: contract.name,
      facilityCount: 1,
      cacheHit: Math.min(98, weightedCache + Math.round(Math.log2(Math.max(1, p.racks)) * 7)),
      ceiling, burstCeiling,
      capex: Math.round((weightedCapex * PER_RACK_CAPEX * idx + facilitySetup) * a.capexMul * d.costMul)
        + getStreamingFacilityPhysicalUpgradeCost(facility),
      weekly: Math.round((weightedWeekly * PER_RACK_WEEKLY * idx + facilityWeekly) * a.weeklyMul)
        + physical.weeklyOperatingCost,
      serves: serves.map(x => x.region),
      latency: serves.length ? Math.max(...serves.map(x => x.latency ?? 0)) : null,
      load: 0,        // filled once total demand is known, just below
      physical,
    } as HallView;
  }).sort((x, y) => y.racks - x.racks);

  const racks = halls.reduce((s, h) => s + h.racks, 0);
  const capex = halls.reduce((s, h) => s + h.capex, 0);
  const weekly = halls.reduce((s, h) => s + h.weekly, 0);

  /* a wider build takes longer, and the biggest hall sets the floor */
  const biggest = halls.reduce((m, h) => Math.max(m, h.racks), 0);
  const weeks = racks === 0 ? 0 : Math.max(1, Math.ceil(
    (2 + biggest * .28 + Math.max(0, halls.length - 1) * .7
      + halls.reduce((max, hall) => Math.max(max, hall.provisioningWeeks), 0) * .35
      + halls.reduce((max, hall) => Math.max(max, hall.migrationWeeks), 0)
    ) * a.weeksMul * d.weeksMul));

  const opsReserve = weekly * 6;
  const campaignCost = c.cost;
  /* borrowed money starts costing the week it is drawn, launched or not */
  const debtReserve = (inp.debtWeekly ?? 0) * 6;
  const committed = capex + opsReserve + campaignCost + debtReserve
    + inp.catalogueSpend + inp.originalsSpend;
  const remaining = inp.treasury - committed;

  const ceiling = halls.reduce((s, h) => s + h.ceiling, 0);
  const burstCeiling = halls.reduce((s, h) => s + h.burstCeiling, 0);
  const uniqueCityCount = new Set(halls.map(hall => hall.city.id)).size;

  /* three separate things swell the crowd, and none of them build a rack:
     the size of your territories, what the plans cost, and the campaign */
  const base = marketViewers * DEMAND_RATE * (inp.audienceMul || 1);
  const demandTotal = (s: Scenario) =>
    Math.round(base * c.demandMul * SCENARIOS.find(x => x.id === s)!.mul);
  const demandOfCity = (cityId: string, s: Scenario) =>
    Math.round(demandTotal(s) * (cityShare.get(cityId) ?? 0));

  /* A city receives one traffic share even when the player leases several
     separate rooms there. The rooms pool capacity; demand is never duplicated. */
  const capacityByCity = new Map<string, number>();
  for (const hall of halls) {
    capacityByCity.set(hall.city.id, (capacityByCity.get(hall.city.id) || 0) + hall.ceiling);
  }
  for (const h of halls) {
    const cityCapacity = capacityByCity.get(h.city.id) || 0;
    h.load = cityCapacity
      ? Math.round((demandOfCity(h.city.id, 'LIKELY') / cityCapacity) * 100)
      : 0;
  }
  const countryService: CountryServiceRow[] = (inp.markets || []).map(market => {
    const regional = coverage.find(row => row.region === market.region);
    const poolIds = poolOf.get(market.region) || [];
    const poolHalls = halls.filter(hall => poolIds.includes(hall.city.id));
    const servingHall = regional?.cityId
      ? halls.find(hall => hall.city.id === regional.cityId) || poolHalls[0]
      : null;
    const regionalDemand = demandTotal('LIKELY')
      * ((marketViewersByRegion.get(market.region) || 0) / Math.max(1, marketViewers));
    const regionalCapacity = poolHalls.reduce((sum, hall) => sum + hall.ceiling, 0);
    const loadPct = regionalCapacity ? Math.round((regionalDemand / regionalCapacity) * 100) : 999;
    const demand = Math.round(demandTotal('LIKELY') * (market.audience / Math.max(1, marketViewers)));
    const quality: CoverageRow['quality'] = !regional || regional.latency === null ? 'POOR'
      : loadPct > 118 ? 'POOR'
        : loadPct > 90 && regional.quality === 'EXCELLENT' ? 'UNSTABLE'
          : regional.quality;
    const repairCity = cityById(market.recommendedCityId);
    const hasRecommendedCity = placements.some(placement => placement.cityId === market.recommendedCityId);
    const globalTitles = inp.catalogueRights?.globalTitleCount ?? inp.catalogueTitles;
    const licensedTitles = inp.catalogueRights?.licensedTitles || [];
    const licensedAvailable = licensedTitles.filter(title => (
      title.territory === 'GLOBAL'
      || title.territory === 'MULTI_REGION'
      || title.territory === 'DOMESTIC' && market.id === inp.catalogueRights?.primaryMarketId
    )).length;
    const catalogueTotalTitles = Math.max(inp.catalogueTitles, globalTitles + licensedTitles.length);
    const catalogueAvailableTitles = Math.min(catalogueTotalTitles, globalTitles + licensedAvailable);
    return {
      marketId: market.id,
      country: market.country,
      region: market.region,
      audience: market.audience,
      cityId: servingHall?.city.id || null,
      cityLabel: servingHall?.city.label || 'NO DELIVERY NODE',
      role: servingHall?.role || null,
      latency: regional?.latency ?? null,
      cacheHit: regional?.cacheHit || 0,
      bufferRisk: Math.min(100, Math.max(regional?.bufferRisk || 100, loadPct > 100 ? 18 + Math.round((loadPct - 100) * .35) : 0)),
      quality,
      demand,
      loadPct,
      repairCityId: market.recommendedCityId,
      repairLabel: hasRecommendedCity
        ? `Add capacity in ${repairCity?.label || market.country}`
        : `Place a hub in ${repairCity?.label || market.country}`,
      localizationNote: market.localizationNote,
      routeFacilityIds: poolHalls.map(hall => hall.facilityId),
      servingCityLabels: Array.from(new Set(poolHalls.map(hall => hall.city.label))),
      catalogueAvailableTitles,
      catalogueTotalTitles,
    };
  }).sort((left, right) => right.loadPct - left.loadPct || right.audience - left.audience);
  const served = coverage.filter(x => x.latency !== null);
  const averageLatency = served.length
    ? Math.round(served.reduce((sum, row) => sum + (row.latency || 0) * row.share, 0)
      / Math.max(.001, served.reduce((sum, row) => sum + row.share, 0)))
    : null;
  const averageCacheHit = served.length
    ? Math.round(served.reduce((sum, row) => sum + row.cacheHit * row.share, 0)
      / Math.max(.001, served.reduce((sum, row) => sum + row.share, 0)))
    : 0;
  const bufferingRisk = served.length
    ? Math.round(served.reduce((sum, row) => sum + row.bufferRisk * row.share, 0)
      / Math.max(.001, served.reduce((sum, row) => sum + row.share, 0)))
    : 100;
  const energyKwhWeekly = halls.reduce((sum, hall) => sum + hall.physical.energyKwhWeekly, 0);
  const waterLitresWeekly = halls.reduce((sum, hall) => sum + hall.physical.waterLitresWeekly, 0);
  const sustainabilityScore = halls.length
    ? Math.round(halls.reduce((sum, hall) => sum + hall.physical.sustainabilityScore * hall.racks, 0) / Math.max(1, racks))
    : 0;
  const publicReputation = halls.length
    ? Math.round(halls.reduce((sum, hall) => sum + hall.physical.publicReputation * hall.racks, 0) / Math.max(1, racks))
    : 0;
  const limitingFactors = Array.from(new Set(halls
    .filter(hall => hall.physical.limitingFactor !== 'NONE')
    .map(hall => hall.physical.limitingFactor === 'RACK_SPACE' ? 'Rack space' : hall.physical.limitingFactor === 'POWER' ? 'Electrical power' : hall.physical.limitingFactor === 'COOLING' ? 'Cooling' : hall.physical.limitingFactor === 'BANDWIDTH' ? 'Network bandwidth' : 'Maintenance condition')));
  const deliveryCostPerHour = Math.max(.01, Math.round((weekly / Math.max(1, ceiling) * 4.2) * 100) / 100);
  const resilienceLabel: Derived['resilienceLabel'] = uniqueCityCount >= 3 ? 'REDUNDANT'
    : uniqueCityCount === 2 ? 'EXPOSED' : 'FRAGILE';
  const weak = [...coverage].filter(row => row.quality === 'POOR' || row.quality === 'UNSTABLE')
    .sort((x, y) => y.bufferRisk - x.bufferRisk);
  const weakLaunchMarket = weak.filter(row => row.isLaunchMarket);
  const plainSummary = !halls.length
    ? 'Nothing can stream until the first core origin exists.'
    : weakLaunchMarket.length
      ? `${weakLaunchMarket[0].label} is in your launch market and may buffer. Put a hub or edge cache closer to it.`
      : weak.length
        ? `Your launch market should feel good. ${weak[0].label} will struggle if you expand there without a closer node.`
      : resilienceLabel === 'FRAGILE'
        ? 'Picture quality is healthy, but one city failure can take the platform down.'
        : 'The network should feel fast during normal viewing. Rehearse a premiere before committing.';

  return {
    capex, weekly, weeks, opsReserve, campaignCost, debtReserve,
    committed, remaining, over: remaining < 0,
    ceiling, burstCeiling, racks, debt: d.debt, uniqueCityCount,
    halls, coverage, countryService,
    worstLatency: served.length ? Math.max(...served.map(x => x.latency!)) : null,
    unserved: coverage.filter(x => x.latency === null).map(x => x.region),
    averageLatency, averageCacheHit, bufferingRisk, deliveryCostPerHour,
    energyKwhWeekly, waterLitresWeekly, sustainabilityScore, publicReputation, limitingFactors,
    resilienceLabel, plainSummary,
    demandTotal, demandOfCity,
  };
}

export const deriveStreamingLaunchRehearsal = (
  d: Derived,
  inp: BuildInputs,
  sel: BuildSel,
  scenario: StreamingRehearsalScenario,
): StreamingLaunchRehearsalResult => {
  const likelyDemand = Math.max(1, d.demandTotal('LIKELY'));
  const scenarioMultiplier = d.demandTotal(scenario) / likelyDemand;
  return createStreamingLaunchRehearsal({
    scenario,
    rolloutRiskPercent: Math.round(docOf(sel.doctrine).wobble * 100),
    countries: d.countryService.map(country => ({
      marketId: country.marketId,
      country: country.country,
      regionId: country.region,
      regionLabel: regionOf(country.region).label,
      demand: Math.round(country.demand * scenarioMultiplier),
      latencyMs: country.latency,
      cacheHitPercent: country.cacheHit,
      baseBufferingRiskPercent: country.bufferRisk,
      routeFacilityIds: [...country.routeFacilityIds],
      servingCityLabels: [...country.servingCityLabels],
      recommendedCityId: country.repairCityId,
      localizationNote: country.localizationNote,
      catalogueAvailableTitles: country.catalogueAvailableTitles,
      catalogueTotalTitles: country.catalogueTotalTitles,
    })),
    facilities: d.halls.map(hall => ({
      facilityId: hall.facilityId,
      cityId: hall.city.id,
      cityLabel: hall.city.label,
      regionId: hall.city.region,
      steadyCapacity: hall.ceiling,
      burstCapacity: hall.burstCeiling,
      reliabilityPercent: hall.physical.reliabilityPercent,
      limitingFactor: hall.physical.limitingFactor,
      physicalRepairActions: hall.physical.repairActions.map(action => ({
        id: action.id,
        label: action.label,
        cost: action.cost,
      })),
    })),
  });
};

/** A proposal only. Applying it edits the drawing; commissioning remains the
 * only place where money moves or infrastructure becomes real. */
export const recommendedMarketPlacements = (inp: BuildInputs): Placement[] => {
  if (inp.recommendedPlacements?.length) {
    return inp.recommendedPlacements.map(placement => ({ ...placement }));
  }
  if (!inp.markets?.length) return presetPlacements('STARTER', inp.regions, inp.homeCityId);
  const lead = [...inp.markets].sort((left, right) => right.audience - left.audience)[0];
  return lead ? [{ cityId: lead.recommendedCityId, racks: 2, role: 'CORE_ORIGIN' }] : [];
};

export interface AssistedNetworkPlan {
  selection: BuildSel;
  policy: StreamingInfrastructureManagementPolicy;
  networkBudget: number;
  addedCommitment: number;
  requiresApproval: boolean;
  reasons: string[];
  warnings: string[];
}

const assistedPriorityShape: Record<StreamingInfrastructureManagementPolicy['priority'], {
  cities: number; racks: number; arch: ArchId;
}> = {
  ECONOMY: { cities: 1, racks: 2, arch: 'CLOUD' },
  BALANCED: { cities: 2, racks: 4, arch: 'HYBRID' },
  RELIABLE: { cities: 3, racks: 7, arch: 'HYBRID' },
  PREMIUM: { cities: 4, racks: 10, arch: 'OWNED' },
};

const assistedDoctrine: Record<StreamingInfrastructureManagementPolicy['riskTolerance'], DoctrineId> = {
  LOW: 'SAFE', MEDIUM: 'STANDARD', HIGH: 'RUSHED',
};

const uniqueCities = (ids: Array<string | null | undefined>): string[] => Array.from(new Set(
  ids.filter((id): id is string => !!id && !!cityById(id)),
));

const draftFacilitiesForAssistedPlan = (
  cityIds: string[],
  targetRacks: number,
  lockedFacilities: OwnedStreamingFacility[],
  preferCloud = false,
): OwnedStreamingFacility[] => {
  const facilities: OwnedStreamingFacility[] = lockedFacilities.map(facility => ({
    ...facility,
    lease: facility.lease ? { ...facility.lease } : undefined,
    rackGroups: facility.rackGroups?.map(group => ({ ...group, migration: group.migration ? { ...group.migration } : undefined })),
  }));
  const currentRacks = () => facilities.reduce((sum, facility) => sum + facility.installedRacks, 0);
  const addFacility = (cityId: string, racks: number, role: StreamingNetworkNodeRole) => {
    const listing = getRecommendedStreamingFacilityListing(cityId, racks, preferCloud);
    if (!listing) return;
    facilities.push(createStreamingFacilityFromListing(listing, facilities, role, racks));
  };

  const selectedCities = uniqueCities([
    ...facilities.map(facility => facility.cityId),
    ...cityIds,
  ]).slice(0, Math.max(1, Math.min(cityIds.length || 1, targetRacks)));
  if (!facilities.length && selectedCities.length) {
    selectedCities.forEach((cityId, index) => addFacility(
      cityId,
      1,
      index === 0 ? 'CORE_ORIGIN' : index === 1 ? 'REGIONAL_HUB' : 'EDGE_CACHE',
    ));
  }
  let cursor = 0;
  while (currentRacks() < targetRacks && selectedCities.length) {
    const cityId = selectedCities[cursor % selectedCities.length];
    const inCity = facilities.filter(facility => facility.cityId === cityId);
    const expandable = inCity.find(facility => (
      facility.installedRacks < getStreamingFacilityCapacity(facility)
    ));
    if (expandable) {
      const expanded = withSyncedRackGroups(expandable, expandable.installedRacks + 1);
      Object.assign(expandable, expanded);
    }
    else addFacility(cityId, 1, facilities.some(facility => facility.role === 'CORE_ORIGIN')
      ? (cursor % 2 ? 'EDGE_CACHE' : 'REGIONAL_HUB')
      : 'CORE_ORIGIN');
    cursor += 1;
  }
  if (facilities.length && !facilities.some(facility => facility.role === 'CORE_ORIGIN')) {
    facilities[0] = withFacilityNetworkRole(facilities[0], 'CORE_ORIGIN');
  }
  return facilities;
};

const addMarketplaceCapacity = (
  source: OwnedStreamingFacility[],
  cityId: string,
  requestedRacks: number,
  fallbackRole: StreamingNetworkNodeRole,
): OwnedStreamingFacility[] => {
  const facilities: OwnedStreamingFacility[] = source.map(facility => ({
    ...facility,
    lease: facility.lease ? { ...facility.lease } : undefined,
    rackGroups: facility.rackGroups?.map(group => ({ ...group, migration: group.migration ? { ...group.migration } : undefined })),
  }));
  let remaining = Math.max(0, Math.round(requestedRacks));
  for (const facility of facilities.filter(item => item.cityId === cityId)) {
    if (remaining <= 0) break;
    const free = Math.max(0, getStreamingFacilityCapacity(facility) - facility.installedRacks);
    const added = Math.min(free, remaining);
    const expanded = withSyncedRackGroups(facility, facility.installedRacks + added);
    Object.assign(facility, expanded);
    remaining -= added;
  }
  while (remaining > 0) {
    const wanted = Math.min(32, remaining);
    const listing = getRecommendedStreamingFacilityListing(cityId, wanted, false)
      || getRecommendedStreamingFacilityListing(cityId, 1, false);
    if (!listing) break;
    const installed = Math.min(listing.rackPositions, remaining);
    facilities.push(createStreamingFacilityFromListing(
      listing,
      facilities,
      facilities.some(facility => facility.role === 'CORE_ORIGIN') ? fallbackRole : 'CORE_ORIGIN',
      installed,
    ));
    remaining -= installed;
  }
  return facilities;
};

/**
 * Deterministic assistant: it drafts ordinary Phase 1 facilities and never
 * touches money. The player must apply the proposal and later commission it.
 */
export const createAssistedNetworkPlan = (
  sel: BuildSel,
  inp: BuildInputs,
  rawPolicy: unknown = sel.managementPolicy,
  lockedFacilities: OwnedStreamingFacility[] = [],
): AssistedNetworkPlan => {
  const policy = normalizeStreamingInfrastructureManagementPolicy(rawPolicy);
  const shape = assistedPriorityShape[policy.priority];
  const recommendation = recommendedMarketPlacements(inp);
  const relevantCities = suggestedCities(inp.regions, 10, inp.homeCityId).map(city => city.id);
  const cityIds = uniqueCities([
    ...policy.preferredCityIds,
    ...recommendation.map(placement => placement.cityId),
    ...relevantCities,
  ]);
  const lockedRackCount = lockedFacilities.reduce((sum, facility) => sum + facility.installedRacks, 0);
  const wantedRacks = Math.max(shape.racks, lockedRackCount || 1);
  let chosen: BuildSel | null = null;
  let chosenDerived: Derived | null = null;

  for (let rackTarget = wantedRacks; rackTarget >= Math.max(1, lockedRackCount); rackTarget -= 1) {
    const wantedCities = Math.max(1, Math.min(shape.cities, rackTarget, cityIds.length || 1));
    const facilities = draftFacilitiesForAssistedPlan(
      cityIds.slice(0, wantedCities),
      rackTarget,
      lockedFacilities,
      shape.arch === 'CLOUD',
    );
    const candidate = selectionWithFacilities({
      ...sel,
      arch: shape.arch,
      doctrine: assistedDoctrine[policy.riskTolerance],
      managementPolicy: policy,
    }, facilities);
    const candidateDerived = derive(candidate, inp);
    chosen = candidate;
    chosenDerived = candidateDerived;
    if (candidateDerived.capex + candidateDerived.opsReserve <= policy.maximumBudget) break;
  }

  if (!chosen || !chosenDerived) {
    const fallbackCity = cityIds[0] || CITIES[0].id;
    const facilities = draftFacilitiesForAssistedPlan([fallbackCity], 1, lockedFacilities, shape.arch === 'CLOUD');
    chosen = selectionWithFacilities({ ...sel, managementPolicy: policy }, facilities);
    chosenDerived = derive(chosen, inp);
  }

  const currentDerived = derive(sel, inp);
  const networkBudget = chosenDerived.capex + chosenDerived.opsReserve;
  const currentNetworkBudget = currentDerived.capex + currentDerived.opsReserve;
  const addedCommitment = Math.max(0, networkBudget - currentNetworkBudget);
  const preferredUsed = policy.preferredCityIds.filter(id => chosen!.placements.some(p => p.cityId === id));
  const warnings: string[] = [];
  if (networkBudget > policy.maximumBudget) {
    warnings.push(`Even the smallest safe draft exceeds your ${money(policy.maximumBudget)} network limit.`);
  }
  if (chosenDerived.demandTotal('LIKELY') > chosenDerived.ceiling) {
    warnings.push('Likely opening-night demand is above the steady capacity. Rehearse before committing.');
  }
  if (chosenDerived.resilienceLabel === 'FRAGILE') {
    warnings.push('One city carries the network, so a local outage could interrupt every market.');
  }
  return {
    selection: chosen,
    policy,
    networkBudget,
    addedCommitment,
    requiresApproval: policy.requireApprovalForExpensiveChanges
      && addedCommitment >= policy.approvalThreshold,
    reasons: [
      `${policy.priority === 'ECONOMY' ? 'Lower opening cost' : policy.priority === 'BALANCED' ? 'Cost and reliability kept in balance' : policy.priority === 'RELIABLE' ? 'More regional resilience' : 'Premium owned capacity'} shaped the footprint.`,
      `${policy.riskTolerance === 'LOW' ? 'Hardened engineering' : policy.riskTolerance === 'HIGH' ? 'Faster, higher-risk delivery' : 'Standard engineering'} matches your risk choice.`,
      preferredUsed.length
        ? `${preferredUsed.map(id => cityById(id)?.label || id).join(' and ')} received priority as requested.`
        : 'Cities were chosen from your Day-One audience and distance to viewers.',
    ],
    warnings,
  };
};

/* ============================================================
   FORMATTING
   ============================================================ */
const money = (n: number) => {
  const s = n < 0 ? '−' : '';
  const v = Math.abs(n);
  if (v >= 1e9) return `${s}$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${s}$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${s}$${Math.round(v / 1e3)}k`;
  return `${s}$${Math.round(v)}`;
};
const conc = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : `${Math.round(n / 1e3)}K`;
const people = (n: number) => n >= 1e9 ? `${(n / 1e9).toFixed(2)}B` : `${Math.round(n / 1e6)}M`;
const grade = (ms: number) => ms < 60 ? 'good' : ms < 120 ? 'ok' : 'bad';

/* ============================================================
   ONE HALL — racks in a named city, scrolling across
   ============================================================ */
/** A rack you own stands in metal. A rented one is the same machine drawn as a
 *  ghost — it exists and it carries traffic, it just is not in this building.
 *  Never an empty dashed slot: those would read as capacity you have not bought. */
const Rack: React.FC<{ n: number; owned: boolean; planned: boolean; dutyColor?: string }> = ({ n, owned, planned, dutyColor }) => (
  <div className={cx(css.rack, css.on, (owned ? '' : css.rented), (planned ? css.planned : ''))}
    style={{ ['--epx-bld-i' as string]: n, ['--rack-duty' as string]: dutyColor || 'var(--epx-bld-c)' }}>
    <i className={css.rvent} />
    {Array.from({ length: 5 }).map((_, u) => (
      <div className={css.runit} key={u}>
        <i className={css.led} style={{ ['--epx-bld-d' as string]: `${((n * 5 + u) % 7) * .21}s` }} />
        <i className={css.led} style={{ ['--epx-bld-d' as string]: `${((n * 3 + u) % 5) * .29 + .1}s` }} />
        <span className={css.rgrill} />
      </div>
    ))}
    <i className={css.rfoot} />
    {planned ? <span className={cx(css.rentmark, css.drawn)}>PLAN</span>
      : !owned && <span className={css.rentmark}>RENTED</span>}
  </div>
);

/** the one human figure — nothing else on the screen gives the racks a size */
const Technician: React.FC = () => (
  <svg className={css.tech} viewBox="0 0 14 40" aria-hidden="true">
    <circle cx="7" cy="4.4" r="3" />
    <path d="M7 7.6 C3.4 7.6 2.2 10.4 2.2 14.6 L2.2 23 L4.4 23 L4.8 39 L9.2 39 L9.6 23 L11.8 23 L11.8 14.6 C11.8 10.4 10.6 7.6 7 7.6 Z" />
  </svg>
);

const Hall: React.FC<{
  h: HallView; canAdd: boolean;
  /** racks already paid for and standing; the rest are still a drawing */
  builtRacks: number;
  onSet: (racks: number) => void;
  onInstallGroup: (duty: StreamingRackDuty) => void;
  onDuty: (groupId: string, duty: StreamingRackDuty) => void;
  onResizeGroup: (groupId: string, delta: number) => void;
  onMoveGroup: (groupId: string, targetFacilityId: string) => void;
  onRepair: (action: StreamingFacilityRepairAction) => void;
  moveTargets: Array<{ id: string; label: string; freeRacks: number }>;
  onSpace: () => void;
}> = ({ h, canAdd, builtRacks, onSet, onInstallGroup, onDuty, onResizeGroup, onMoveGroup, onRepair, moveTargets, onSpace }) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const selectedGroup = h.rackGroups.find(group => group.id === selectedGroupId) || null;
  const visibleRacks = Math.min(h.racks, 24);
  const hiddenRacks = Math.max(0, h.racks - visibleRacks);
  const rackDutyColors = h.rackGroups.flatMap(group => (
    Array.from({ length: group.rackCount }, () => getStreamingRackDutyRule(group.projectedDuty).color)
  ));
  return (
  <div className={cx(css.hall, (builtRacks < h.racks ? css.planning : ''), (builtRacks > 0 ? css.hasbuilt : ''))}>
    <div className={css.hallhead}>
      <div className={css.hallid}>
        <b>{h.city.label}</b>
        {h.city.hub && <i className={css.hubpill}>TIER-1</i>}
        <span>
          {h.campusLabel} · {h.providerName}
        </span>
        <span>
          {h.racks}/{h.capacityRacks} slots · {h.coolingKw}kW cooling · {money(h.weekly)}/wk
        </span>
      </div>
      <div className={css.stepper}>
        <button onClick={() => onSet(h.racks - 1)} aria-label="Remove a rack">−</button>
        <b>{h.racks}</b>
        <button onClick={() => onSet(h.racks + 1)} disabled={!canAdd} aria-label="Add a rack">+</button>
      </div>
    </div>

    <div className={css.facilitybar}>
      <div>
        <span>FIXED SPACE CONTRACT</span>
        <b>{h.freeRacks > 0 ? `${h.freeRacks} rack slot${h.freeRacks === 1 ? '' : 's'} free` : 'Facility full'}</b>
      </div>
      <div className={css.occupancy} aria-label={`${h.racks} of ${h.capacityRacks} rack slots used`}>
        <i style={{ width: `${Math.round(h.racks / h.capacityRacks * 100)}%` }} />
      </div>
      <button onClick={onSpace}>LEASE ANOTHER →</button>
    </div>

    <div className={css.leaseFacts}>
      <span><small>UPTIME</small><b>{h.reliability ? `${h.reliability}%` : 'Legacy terms'}</b></span>
      <span><small>POWER</small><b>{h.electricityRate ? `$${h.electricityRate.toFixed(2)}/kWh` : 'City rate'}</b></span>
      <span><small>TERM</small><b>{h.contractWeeks ? `${h.contractWeeks} weeks` : 'Existing'}</b></span>
      <span><small>NEARBY</small><b>{h.expansionRackPositions ? `${h.expansionRackPositions} slots listed` : 'No guarantee'}</b></span>
    </div>

    <div className={css.physicalpanel}>
      <div className={css.physicalhead}>
        <div><span>PHYSICAL LIMITS</span><b>{h.physical.limitingFactor === 'NONE' ? 'All systems have room' : `${h.physical.limitingFactor.replace('_', ' ')} is setting the ceiling`}</b></div>
        <em className={h.physical.usableCapacityFactor < 70 ? css.physicalbad : h.physical.usableCapacityFactor < 90 ? css.physicalwarn : css.physicalgood}>{Math.round(h.physical.usableCapacityFactor)}% USABLE</em>
      </div>
      <div className={css.physicalgrid}>
        <span><small>POWER</small><b>{Math.round(h.physical.powerUsedKw)} / {h.physical.state.powerContractKw}kW</b></span>
        <span><small>COOLING</small><b>{Math.round(h.physical.coolingUsedKw)} / {h.physical.state.coolingCapacityKw}kW</b></span>
        <span><small>BANDWIDTH</small><b>{Math.round(h.physical.bandwidthUsedMbps / 100) / 10} / {Math.round(h.physical.state.bandwidthMbps / 100) / 10}Gbps</b></span>
        <span><small>CONDITION</small><b>{h.physical.state.maintenanceConditionPercent}% · {h.physical.reliabilityPercent}% uptime</b></span>
        <span><small>BACKUP POWER</small><b>{h.physical.state.backupPowerMode.replaceAll('_', ' ')} · {h.physical.backupCoveragePercent}% load</b></span>
        <span><small>PUBLIC IMPACT</small><b>{h.physical.sustainabilityScore} eco · {h.physical.publicReputation} reputation</b></span>
      </div>
      {h.physical.repairActions.length > 0 && (
        <div className={css.repairactions}>
          {h.physical.repairActions.map(action => (
            <button key={action.id} onClick={() => onRepair(action.id)}>
              <b>{action.label}</b><span>{money(action.cost)} · {action.detail}</span>
            </button>
          ))}
        </div>
      )}
      <div className={css.physicalfoot}>
        <span>{h.physical.energyKwhWeekly.toLocaleString()} kWh · {Math.round(h.physical.waterLitresWeekly).toLocaleString()}L water / week</span>
        <b>{money(h.physical.weeklyOperatingCost)}/wk physical ops</b>
      </div>
    </div>

    <div className={css.groupdeck}>
      <div className={css.grouptitle}>
        <div><span>RACK FLOOR</span><b>{h.rackGroups.length} workload {h.rackGroups.length === 1 ? 'group' : 'groups'}</b></div>
        <button onClick={() => setSelectedGroupId(h.rackGroups[0]?.id || null)}>MANAGE →</button>
      </div>
      <div className={css.grouptrack} aria-label={`Rack groups inside ${h.city.label}`}>
        {h.rackGroups.map(group => {
          const rule = getStreamingRackDutyRule(group.projectedDuty);
          return (
            <button key={group.id} className={cx(css.groupcard, group.migration ? css.migrating : '')}
              style={{ ['--group-color' as string]: rule.color }} onClick={() => setSelectedGroupId(group.id)}>
              <i className={css.grouppulse} />
              <span>{rule.shortName}</span>
              <b>{rule.name}</b>
              <em>{group.rackCount} rack{group.rackCount === 1 ? '' : 's'} · {conc(group.capacity)}</em>
              <small>{group.migration ? `REWIRING · ${group.migration.weeks}W` : rule.viewerPromise}</small>
            </button>
          );
        })}
        {canAdd && (
          <button className={cx(css.groupcard, css.addgroup)} onClick={() => setSelectedGroupId('NEW')}>
            <i>+</i><b>New rack group</b><small>{h.freeRacks} slots free</small>
          </button>
        )}
      </div>
      {h.migrationPressurePercent > 0 && (
        <div className={css.pressurebar}>
          <span>WORKLOAD MOVE IN PROGRESS</span>
          <b>−{h.migrationPressurePercent}% temporary capacity · {h.migrationWeeks} week{h.migrationWeeks === 1 ? '' : 's'}</b>
        </div>
      )}
    </div>

    {/* the room itself: fixed-width racks that scroll, never squeeze */}
    <div className={css.room}>
      <div className={css.roomback} />
      <div className={css.roomfloor} />
      <div className={css.rackscroll}>
        <div className={css.rackrow}>
          {Array.from({ length: visibleRacks }).map((_, n) => (
            <React.Fragment key={n}>
              {/* one dashed line is the whole cloud-vs-owned story: this side of
                  it is your building, that side is somebody else's */}
              {h.remote > 0 && n === h.onPrem && (
                <div className={css.wall}><i className={css.wline} /></div>
              )}
              <Rack n={n} owned={n < h.onPrem} planned={n >= builtRacks} dutyColor={rackDutyColors[n]} />
            </React.Fragment>
          ))}
          {hiddenRacks > 0 && (
            <div className={css.rackoverflow}>
              <b>+{hiddenRacks}</b>
              <span>RACKS IN<br />ADJACENT HALLS</span>
            </div>
          )}
          {builtRacks > 0 && <Technician />}
          {h.racks < h.capacityRacks && (
            <button className={css.rackadd} onClick={() => onSet(h.racks + 1)}>
              <i>+</i><span>RACK</span>
            </button>
          )}
          {h.racks >= h.capacityRacks && (
            <button className={cx(css.rackadd, css.spacefull)} onClick={onSpace}>
              <i>↗</i><span>SPACE<br />FULL</span>
            </button>
          )}
        </div>
      </div>

      {/* a drawing has to say it is a drawing */}
      {builtRacks < h.racks && (
        <div className={css.plantag}>
          <span className={css.dim}>{(h.racks * .6 + 1.2).toFixed(1)}m × 4.2m</span>
          <span className={css.dim}>{h.racks * 12}kW</span>
          <span className={css.rev}>{builtRacks > 0 ? `REV B · +${h.racks - builtRacks} PLANNED` : 'REV A · NOT FOR CONSTRUCTION'}</span>
        </div>
      )}
    </div>

    <div className={css.hallfoot}>
      {h.serves.length ? (
        <>
          <span>
            Serves {h.serves.map(r => regionOf(r).label).join(' · ')}
          </span>
          {h.latency !== null && (
            <em className={css[grade(h.latency)] ?? ''}>{h.latency}ms</em>
          )}
        </>
      ) : (
        <span className={css.idle}>Serves nobody — another city is closer to all of your territories</span>
      )}
    </div>

    {selectedGroupId && (
      <div className={css.groupsheet} role="dialog" aria-modal="true" aria-label={selectedGroupId === 'NEW' ? 'Install a rack group' : 'Manage rack group'}
        onClick={() => setSelectedGroupId(null)}>
        <div className={css.groupbox} onClick={event => event.stopPropagation()}>
          <div className={css.groupboxhead}>
            <div>
              <span>{selectedGroupId === 'NEW' ? 'INSTALL INTO FREE SPACE' : 'RACK GROUP CONTROL'}</span>
              <b>{selectedGroupId === 'NEW' ? `${h.freeRacks} slots available` : selectedGroup?.name}</b>
            </div>
            <button aria-label="Close rack group control" onClick={() => setSelectedGroupId(null)}>×</button>
          </div>
          {selectedGroup ? (
            <>
              <div className={css.groupstatus}>
                <span><small>RACKS</small><b>{selectedGroup.rackCount}</b></span>
                <span><small>CAPACITY</small><b>{conc(selectedGroup.capacity)}</b></span>
                <span><small>SERVES</small><b>{selectedGroup.serves.length || '—'}</b></span>
              </div>
              <div className={css.groupsizing}>
                <div><span>HARDWARE IN THIS GROUP</span><b>{selectedGroup.rackCount} of {h.capacityRacks} facility slots</b></div>
                <button disabled={selectedGroup.rackCount <= 1} onClick={() => onResizeGroup(selectedGroup.id, -1)}>−</button>
                <button disabled={!canAdd} onClick={() => onResizeGroup(selectedGroup.id, 1)}>+</button>
              </div>
              <button className={css.retireRack} disabled={selectedGroup.rackCount <= 1}
                onClick={() => onResizeGroup(selectedGroup.id, -1)}>
                RETIRE ONE RACK <span>Removes hardware from this draft</span>
              </button>
              <span className={css.sheetlabel}>CHOOSE WHAT THESE RACKS DO</span>
              <div className={css.dutylist}>
                {STREAMING_RACK_DUTIES.map(rule => (
                  <button key={rule.id} disabled={!rule.available}
                    className={selectedGroup.projectedDuty === rule.id ? css.on : ''}
                    style={{ ['--group-color' as string]: rule.color }}
                    onClick={() => onDuty(selectedGroup.id, rule.id)}>
                    <i /><div><b>{rule.name}</b><span>{rule.description}</span></div>
                    <em>{rule.available ? `${rule.migrationWeeks}W` : 'RESEARCH'}</em>
                  </button>
                ))}
              </div>
              {moveTargets.length > 0 && (
                <>
                  <span className={css.sheetlabel}>MOVE THIS WORKLOAD</span>
                  <div className={css.movelist}>
                    {moveTargets.map(target => (
                      <button key={target.id} disabled={target.freeRacks < selectedGroup.rackCount}
                        onClick={() => { onMoveGroup(selectedGroup.id, target.id); setSelectedGroupId(null); }}>
                        <span>{target.label}</span><b>{target.freeRacks} slots free →</b>
                      </button>
                    ))}
                  </div>
                </>
              )}
              <p className={css.migrationnote}>Changing or moving a duty takes time. The rehearsal immediately shows the temporary pressure, and commissioning finishes the migration.</p>
            </>
          ) : (
            <>
              <p className={css.installnote}>Pick a job for one new rack. You can add more racks to its group immediately after installation.</p>
              <div className={css.dutylist}>
                {STREAMING_RACK_DUTIES.map(rule => (
                  <button key={rule.id} disabled={!rule.available || !canAdd}
                    style={{ ['--group-color' as string]: rule.color }}
                    onClick={() => { onInstallGroup(rule.id); setSelectedGroupId(null); }}>
                    <i /><div><b>{rule.name}</b><span>{rule.viewerPromise}</span></div>
                    <em>{rule.available ? '+1 RACK' : 'RESEARCH'}</em>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    )}
  </div>
  );
};

/* ============================================================
   ADD A CITY
   ============================================================ */
const CityPicker: React.FC<{
  sel: BuildSel; inp: BuildInputs; d: Derived;
  onCity: (cityId: string) => void; onClose: () => void;
}> = ({ sel, inp, d, onCity, onClose }) => {
  const cityFacilityCount = facilitiesOf(sel).reduce<Map<string, number>>((counts, facility) => {
    counts.set(facility.cityId, (counts.get(facility.cityId) || 0) + 1);
    return counts;
  }, new Map());
  const terr = territoriesOf(inp.coverageRegions?.length ? inp.coverageRegions : inp.regions);

  /* what one rack here would actually fix, said in milliseconds */
  const gain = (c: City) => {
    let best: { label: string; from: number | null; to: number } | null = null;
    for (const row of d.coverage) {
      const to = (latencyTo(c, row.region) ?? 999) + archOf(sel.arch).latencyAdd;
      const from = row.latency;
      if (from === null) return { label: regionOf(row.region).label, from: null, to };
      const win = from - to;
      if (win > 12 && (!best || win > (best.from! - best.to))) {
        best = { label: regionOf(row.region).label, from, to };
      }
    }
    return best;
  };

  return (
    <div className={css.picker} onClick={onClose}>
      <div className={css.pickbox} onClick={e => e.stopPropagation()}>
        <div className={css.pickhead}>
          <b>CHOOSE A NETWORK CITY</b>
          <button onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className={css.pickscroll}>
          {terr.map(r => {
            const inR = CITIES.filter(c => c.region === r);
            if (!inR.length) return null;
            return (
              <div className={css.pickgroup} key={r}>
                <span className={css.pickreg}>{regionOf(r).label}</span>
                {inR.map(c => {
                  const g = gain(c);
                  return (
                    <button className={css.pickcity} key={c.id} onClick={() => onCity(c.id)}>
                      <div className={css.pcid}>
                        <b>{c.label}</b>
                        {c.hub && <i className={css.hubpill}>TIER-1</i>}
                        <span>
                          {cityFacilityCount.get(c.id) ? `${cityFacilityCount.get(c.id)} facilit${cityFacilityCount.get(c.id) === 1 ? 'y' : 'ies'} already drafted · ` : ''}
                          {getStreamingFacilityMarketplace(c.id).length - 1} spaces listed
                          {' · '}{c.quality >= 9 ? 'elite grid' : c.quality >= 7 ? 'stable grid' : 'value grid'}
                        </span>
                      </div>
                      <div className={css.pcgain}>
                        {g ? (
                          g.from === null
                            ? <em className={css.new}>Connects {g.label} · {g.to}ms</em>
                            : <em className={css[grade(g.to)] ?? ''}>{g.label} {g.from}→{g.to}ms</em>
                        ) : <em className={css.none}>More capacity, same reach</em>}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const FacilityMarketplace: React.FC<{
  cityId: string;
  onLease: (listing: StreamingFacilityMarketplaceListing) => void;
  onClose: () => void;
}> = ({ cityId, onLease, onClose }) => {
  const closeRef = useRef<HTMLButtonElement>(null);
  const city = cityById(cityId);
  const listings = useMemo(() => getStreamingFacilityMarketplace(cityId), [cityId]);

  useEffect(() => {
    closeRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  if (!city) return null;
  return (
    <div className={css.picker} onClick={onClose}>
      <div className={cx(css.pickbox, css.facilitysheet)} role="dialog" aria-modal="true"
        aria-label={`${city.label} facility marketplace`} onClick={event => event.stopPropagation()}>
        <div className={css.marketHero}>
          <div className={css.marketGrid} aria-hidden="true" />
          <div className={css.marketTitle}>
            <span>LIVE SPACE MARKET · {city.region.replace('_', ' ')}</span>
            <b>{city.label}</b>
            <p>{listings.filter(listing => listing.status !== 'RESEARCH_REQUIRED').length} contracts available · each room has a fixed physical limit</p>
          </div>
          <div className={css.marketPulse}>
            <i />
            <span>{city.quality >= 9 ? 'PRIME FIBRE MARKET' : city.quality >= 7 ? 'STABLE CAPACITY' : 'VALUE MARKET'}</span>
          </div>
          <button ref={closeRef} className={css.marketClose} onClick={onClose} aria-label="Close facility marketplace">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <div className={css.marketRule}>
          <b>LEASE SPACE, THEN INSTALL RACKS</b>
          <span>A full room stays full. To grow, lease another listing here or enter a different city.</span>
        </div>

        <div className={css.facilityoptions}>
          {listings.map((listing, listingIndex) => {
            const locked = listing.status === 'RESEARCH_REQUIRED';
            return (
              <article key={listing.listingId} className={cx(css.marketListing, locked ? css.locked : '')}>
                <div className={css.listingTop}>
                  <div>
                    <span>LISTING {String(listingIndex + 1).padStart(2, '0')} · {listing.providerName}</span>
                    <b>{listing.facilityName}</b>
                  </div>
                  <em className={css[listing.status.toLowerCase()] || ''}>
                    {listing.status === 'RESEARCH_REQUIRED' ? 'RESEARCH' : listing.status}
                  </em>
                </div>

                <div className={css.listingBody}>
                  <div className={css.facilityvisual} aria-hidden="true">
                    <strong>{listing.rackPositions}</strong>
                    <span>RACK<br />POSITIONS</span>
                    <div>
                      {Array.from({ length: Math.min(8, listing.rackPositions) }).map((_, index) => <i key={index} />)}
                    </div>
                  </div>
                  <div className={css.listingDeal}>
                    <p>{listing.description}</p>
                    <div className={css.dealMoney}>
                      <span><small>MOVE-IN</small><b>{money(listing.depositCost + listing.setupCost)}</b></span>
                      <span><small>RENT</small><b>{money(listing.weeklyRent)}/wk</b></span>
                    </div>
                  </div>
                </div>

                <div className={css.contractFacts}>
                  <span><small>POWER</small><b>${listing.electricityRatePerKwh.toFixed(2)}/kWh</b></span>
                  <span><small>TAX</small><b>{listing.taxRatePercent}%</b></span>
                  <span><small>UPTIME</small><b>{listing.reliabilityPercent}%</b></span>
                  <span><small>FIBRE</small><b>{listing.fibreGrade === 'GLOBAL_BACKBONE' ? 'Global' : listing.fibreGrade === 'CARRIER' ? 'Carrier' : 'Metro'}</b></span>
                  <span><small>SECURITY</small><b>{listing.securityGrade === 'REINFORCED' ? 'Reinforced' : listing.securityGrade === 'FORTIFIED' ? 'Fortified' : 'Standard'}</b></span>
                  <span><small>LIVE IN</small><b>{listing.provisioningWeeks || '<1'} wk</b></span>
                </div>

                <div className={css.contractBottom}>
                  <p>{listing.marketNote}</p>
                  <span>{listing.contractWeeks} wk term · {listing.expansionRackPositions
                    ? `${listing.expansionRackPositions} nearby slots listed`
                    : 'no adjacent expansion'}</span>
                </div>

                <button className={css.leaseButton} disabled={locked} onClick={() => onLease(listing)}>
                  {locked ? 'RESEARCH CAMPUS CONSTRUCTION' : `LEASE ${listing.shortName.toUpperCase()} →`}
                </button>
              </article>
            );
          })}
        </div>
        <div className={css.facilityfoot}>Draft only. Deposits, setup and rent enter the forecast now; treasury moves only when you commission.</div>
      </div>
    </div>
  );
};

/* ============================================================
   COMMISSIONING — the drawing becomes the building
   ------------------------------------------------------------
   The whole point of the blueprint is this moment. Nothing on the
   Build screen has cost anything yet; here the money actually
   leaves and the outlines turn into machines. Six beats, ~6s,
   tap to skip — the same contract as the founding cinematics.
   ============================================================ */
const BEATS = [
  { ms: 1100, kicker: 'DRAWING APPROVED', line: 'Rev A signed off. Construction may begin.' },
  { ms: 1000, kicker: 'FLOORS POURED', line: 'Raised floor, cable trays, cooling loop.' },
  { ms: 1400, kicker: 'RACKS INSTALLED', line: 'Cabinets bolted down, empty and dark.' },
  { ms: 1500, kicker: 'POWER ON', line: 'Machines boot. The hum starts.' },
  { ms: 1900, kicker: 'FUNDS RELEASED', line: 'Contracts execute. The money leaves.' },
  { ms: 0, kicker: 'COMMISSIONED', line: 'You own a building full of running machines.' },
];

const Commissioning: React.FC<{
  brand: Brand; d: Derived; inp: BuildInputs; sel: BuildSel; onDone: () => void;
  doneLabel?: string;
}> = ({ brand, d, inp, sel, onDone, doneLabel = 'TO OPENING NIGHT →' }) => {
  const [beat, setBeat] = useState(0);
  const timer = useRef(0);

  useEffect(() => {
    if (beat >= BEATS.length - 1) return;
    timer.current = window.setTimeout(() => setBeat(b => b + 1), BEATS[beat].ms);
    return () => clearTimeout(timer.current);
  }, [beat]);

  /* the money only drains once the contracts execute — beat 4 */
  const drained = beat >= 5 ? 1 : beat === 4 ? .55 : 0;
  const spent = Math.round(d.committed * drained);

  const receipts = [
    ...d.halls.map(h => ({
      k: h.facilityId,
      what: `LEASE · ${h.city.label}`,
      detail: `${h.racks} rack${h.racks === 1 ? '' : 's'}`,
      v: h.capex,
    })),
    { k: 'ops', what: 'OPERATING RESERVE', detail: '6 weeks', v: d.opsReserve },
    { k: 'cat', what: 'CATALOGUE LICENCES', detail: `${inp.catalogueTitles} titles`, v: inp.catalogueSpend },
    { k: 'orig', what: 'ORIGINAL FIRST-WINDOW FEES', detail: `${inp.originalsCount} titles`, v: inp.originalsSpend },
    ...(d.campaignCost > 0
      ? [{ k: 'camp', what: 'LAUNCH CAMPAIGN', detail: campOf(sel.campaign).name, v: d.campaignCost }]
      : []),
  ];

  const skip = () => {
    clearTimeout(timer.current);
    setBeat(BEATS.length - 1);
  };

  return (
    <div className={cx(css.com, css['b' + (beat)])} onClick={beat < BEATS.length - 1 ? skip : undefined}>
      <div className={css.comtop}>
        <div className={css.comtitle}>
          <b>{brand.name || 'EMPIRE+'}</b>
          <span>
            {d.halls.length} SITE{d.halls.length === 1 ? '' : 'S'} · {d.racks} RACKS ·
            {beat >= BEATS.length - 1 ? ' BUILT · WEEK 0' : ' REV A'}
          </span>
        </div>
        <span className={css.commark}><Mark brand={brand} /></span>
      </div>

      <div className={css.comstage}>
        {d.halls.map((h, hi) => (
          <div className={css.comhall} key={h.facilityId} style={{ ['--epx-bld-hi' as string]: hi }}>
            <div className={css.comcity}>
              <b>{h.city.label}</b>
              <em>{h.racks} × {PER_RACK_CEILING / 1000}K</em>
            </div>
            <div className={css.comroom}>
              <div className={css.comfloor} />
              <div className={css.comracks}>
                {Array.from({ length: h.racks }).map((_, n) => (
                  <div className={css.crack} key={n} style={{ ['--epx-bld-i' as string]: n }}>
                    {Array.from({ length: 6 }).map((_, u) => (
                      <i className={css.cu} key={u} style={{ ['--epx-bld-d' as string]: `${((n * 6 + u) % 11) * .09}s` }} />
                    ))}
                  </div>
                ))}
                {beat >= 5 && <Technician />}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={css.comledger}>
        <div className={css.comspend}>
          <span>RELEASED</span>
          <b>{money(spent)}</b>
        </div>
        <div className={css.comdrain}><i style={{ width: `${drained * 100}%` }} /></div>
        <div className={css.comrec}>
          {receipts.map((r, i) => (
            <div className={cx(css.rec, (beat >= 4 ? css.in : ''))} key={r.k} style={{ ['--epx-bld-r' as string]: i }}>
              <span>{r.what}</span>
              <em>{r.detail}</em>
              <b>{money(r.v)}</b>
            </div>
          ))}
        </div>
      </div>

      <div className={css.combeat}>
        <span className={css.comkick}>{BEATS[beat].kicker}</span>
        <p>{BEATS[beat].line}</p>
      </div>

      <div className={css.comfoot}>
        {beat >= BEATS.length - 1 ? (
          <button className={css.comgo} onClick={e => { e.stopPropagation(); onDone(); }}>
            {doneLabel}
          </button>
        ) : (
          <div className={css.comskip}>TAP TO SKIP</div>
        )}
      </div>
    </div>
  );
};

/* ============================================================
   THE BUDGET — one pot, everything competing for it
   ============================================================ */
const BudgetBar: React.FC<{
  inp: BuildInputs; d: Derived;
  funding?: { borrowed: number; soldPct: number; own: number };
  onRaise?: () => void;
}> = ({ inp, d, funding, onRaise }) => {
  const segs = [
    { k: 'infra', label: 'Infrastructure', v: d.capex },
    { k: 'ops', label: 'Operating reserve', v: d.opsReserve },
    { k: 'debt', label: 'Debt service reserve', v: d.debtReserve },
    { k: 'cat', label: 'Catalogue licences', v: inp.catalogueSpend },
    { k: 'orig', label: 'Original first-window fees', v: inp.originalsSpend },
    { k: 'camp', label: 'Launch campaign', v: d.campaignCost },
  ].filter(s => s.v > 0);

  const scale = d.over ? d.committed : inp.treasury;

  return (
    <div className={cx(css.budget, (d.over ? css.over : ''))}>
      <div className={css.bghead}>
        <div>
          {/* Money you do not have is not "uncommitted" money. Once the plan is
              over the treasury the label has to change with the sign, or the
              headline reads as a negative amount of a positive thing. */}
          <span>{d.over ? 'SHORT BY' : 'UNCOMMITTED'}</span>
          <b className={d.over ? css.bad : d.remaining < inp.treasury * .08 ? css.warn : css.good}>
            {money(Math.abs(d.remaining))}
          </b>
        </div>
        <div className={css.right}>
          <span>OF {money(inp.treasury)}</span>
          <em>{money(d.committed)} committed</em>
          {onRaise && <button className={css.raisebtn} onClick={onRaise}>OPEN FINANCE</button>}
        </div>
      </div>

      <div className={css.bgbar}>
        {segs.map(s => (
          <i key={s.k} className={cx(css.sg, css[s.k])} style={{ width: `${(s.v / scale) * 100}%` }} title={s.label} />
        ))}
        {!d.over && <i className={cx(css.sg, css.free)} style={{ width: `${(d.remaining / scale) * 100}%` }} />}
      </div>

      <div className={css.bglegend}>
        {segs.map(s => (
          <span key={s.k}><i className={cx(css.dot, css[s.k])} />{s.label} <em>{money(s.v)}</em></span>
        ))}
      </div>

      {/* where the money came from follows it around */}
      {funding && (funding.borrowed > 0 || funding.soldPct > 0 || funding.own > 0) && (
        <div className={css.funding}>
          {funding.borrowed > 0 && <span><i className={cx(css.fdot, css.debt)} />{money(funding.borrowed)} borrowed</span>}
          {funding.soldPct > 0 && <span><i className={cx(css.fdot, css.eq)} />{funding.soldPct.toFixed(1)}% sold</span>}
          {funding.own > 0 && <span><i className={cx(css.fdot, css.own)} />{money(funding.own)} your own</span>}
        </div>
      )}

      {d.over && (
        <div className={css.bgover}>
          You are {money(-d.remaining)} short. Add company capital in Finance, or make this plan smaller.
        </div>
      )}
    </div>
  );
};

/** Once the cheque has cleared there is no budget left to allocate, so the
 *  same bar would be lying. After commissioning the only live number is what
 *  the racks you have newly drawn would cost on top. */
const RevisionBar: React.FC<{ spent: number; d: Derived; dBuilt: Derived }> = ({ spent, d, dBuilt }) => {
  const capex = d.capex - dBuilt.capex;
  const weekly = d.weekly - dBuilt.weekly;
  return (
    <div className={cx(css.budget, css.rev, (capex > 0 ? css.pending : ''))}>
      <div className={css.bghead}>
        <div>
          <span>{capex > 0 ? 'THIS REVISION' : 'ALREADY SPENT'}</span>
          <b className={capex > 0 ? css.warn : ''}>{capex > 0 ? `+${money(capex)}` : money(spent)}</b>
        </div>
        <div className={css.right}>
          <span>{capex > 0 ? `ON TOP OF ${money(spent)}` : 'COMMISSIONED'}</span>
          <em>{capex > 0 ? `+${money(weekly)}/wk running` : `${money(dBuilt.weekly)}/wk running`}</em>
        </div>
      </div>
      {capex > 0 && (
        <div className={cx(css.bgover, css.warn)}>
          Drawn, not built. Commission the revision and the machines go in.
        </div>
      )}
    </div>
  );
};

/* ============================================================
   THE REHEARSAL — a premiere night that costs nothing
   ============================================================ */
export type Verdict = StreamingRehearsalVerdict;
export type RunResult = StreamingLaunchRehearsalResult;

/** S-curve: nobody at 0, everyone by the time the show starts, then a slow bleed */
const curveAt = (t: number) => {
  const rise = 1 / (1 + Math.exp(-(t - .38) * 13));
  const bleed = t > .62 ? (t - .62) * .30 : 0;
  return Math.max(0, rise - bleed);
};

const Rehearsal: React.FC<{
  brand: Brand; d: Derived; inp: BuildInputs; sel: BuildSel;
  onClose: () => void; onResult: (r: RunResult) => void;
  onRepair: (next: BuildSel, message: string) => void;
  onOpenContent?: () => void;
}> = ({ brand, d, inp, sel, onClose, onResult, onRepair, onOpenContent }) => {
  const [scenario, setScenario] = useState<Scenario>('LIKELY');
  const [running, setRunning] = useState(false);
  const [t, setT] = useState(0);
  const [result, setResult] = useState<RunResult | null>(null);
  const [viewerMarketId, setViewerMarketId] = useState<string | null>(null);
  const [viewerViewOpen, setViewerViewOpen] = useState(false);
  const raf = useRef(0);

  const forecast = useMemo(
    () => deriveStreamingLaunchRehearsal(d, inp, sel, scenario),
    [d, inp, scenario, sel],
  );
  const target = forecast.peakConcurrentStreams;

  useEffect(() => {
    if (!running) return;
    const start = performance.now();
    const DUR = 6200;
    let over = false;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / DUR);
      setT(p);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else finish();
    };
    raf.current = requestAnimationFrame(tick);
    /* rAF stops firing in a backgrounded tab — without this the run would hang
       forever and the player would come back to a rehearsal that never ended */
    const guard = window.setTimeout(() => { setT(1); finish(); }, DUR + 400);
    return () => { cancelAnimationFrame(raf.current); clearTimeout(guard); };

    function finish() {
      if (over) return;
      over = true;
      setResult(forecast); setRunning(false); onResult(forecast);
    }
  }, [forecast, onResult, running]);

  const live = Math.round(target * curveAt(t));
  const loadPct = forecast.steadyCapacity ? (live / forecast.steadyCapacity) * 100 : 999;
  const overNow = live > forecast.steadyCapacity;
  const brokeNow = live > forecast.burstCapacity;

  const W = 300, H = 104;
  const top = Math.max(target, forecast.burstCapacity) * 1.1 || 1;
  const pts = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i <= 64; i++) {
      const tt = i / 64;
      if (tt > t) break;
      const v = target * curveAt(tt);
      out.push(`${(tt * W).toFixed(1)},${(H - (v / top) * H).toFixed(1)}`);
    }
    return out.join(' ');
  }, [t, target, top]);
  const yOf = (v: number) => H - (v / top) * H;
  const commandStep = result ? 5 : running ? Math.min(5, Math.floor(t * 5) + 1) : 0;
  const viewerCountry = result
    ? result.countries.find(country => country.marketId === viewerMarketId) || result.countries[0]
    : null;

  const applyRehearsalRepair = (action: StreamingRehearsalRepairAction) => {
    if (action.type === 'EXPAND_RIGHTS') {
      onClose();
      onOpenContent?.();
      return;
    }
    const facilities = facilitiesOf(sel);
    if (action.type === 'REPAIR_PHYSICAL') {
      const facility = facilities.find(item => item.id === action.facilityId);
      if (!facility) return;
      const repaired = applyStreamingFacilityRepair(facility, action.physicalAction, inp.absoluteWeek || 0);
      onRepair(
        selectionWithFacilities(sel, facilities.map(item => item.id === action.facilityId ? repaired.facility : item)),
        `${repaired.summary} The rehearsal evidence is now stale; run it again before commissioning.`,
      );
      return;
    }
    const repaired = addMarketplaceCapacity(
      facilities,
      action.cityId,
      action.racks,
      action.type === 'ADD_REGIONAL_HUB' ? 'REGIONAL_HUB' : 'EDGE_CACHE',
    );
    onRepair(
      selectionWithFacilities(sel, repaired),
      `${action.label}: ${action.racks} rack${action.racks === 1 ? '' : 's'} drafted. Run the rehearsal again to verify the viewer consequence.`,
    );
  };

  return (
    <div className={cx(css.rh, (brokeNow ? css.broke : overNow ? css.hot : ''), (result ? css.done : ''))}>
      <div className={css.rhtop}>
        <button className={css.rhx} onClick={onClose} aria-label="Close">✕</button>
        <div className={css.rhtitle}>
          <b>LOAD REHEARSAL</b>
          <span>SIMULATED · CHANGES NOTHING</span>
        </div>
        <span className={css.rhmark}><Mark brand={brand} /></span>
      </div>

      <div className={css.rhscroll}>
        <div className={css.rhsequence} aria-label="Launch rehearsal sequence">
          {[
            ['AUDIENCE', 'Countries arrive'],
            ['ROUTE', 'Traffic crosses the network'],
            ['STRESS', 'Facilities take the load'],
            ['VIEWERS', 'Consequences appear'],
            ['DECISION', 'Repair or accept risk'],
          ].map(([label, detail], index) => (
            <div key={label} className={cx(commandStep > index ? css.revealed : '', commandStep === index + 1 ? css.active : '')}>
              <i>{commandStep > index ? '✓' : index + 1}</i><span><b>{label}</b><em>{detail}</em></span>
            </div>
          ))}
        </div>
        {!running && !result && (
          <>
            <p className={css.rhlead}>
              We push a fake premiere night of <b>{inp.premiereTitle}</b> through the
              halls you have built, and watch which city gives first.
            </p>
            <div className={css.rhscen}>
              {SCENARIOS.map(s => (
                <button key={s.id} className={cx(css.scen, (scenario === s.id ? css.on : ''))}
                  onClick={() => setScenario(s.id)}>
                  <b>{s.name}</b>
                  <span>{s.sub}</span>
                  <em>{conc(d.demandTotal(s.id))}</em>
                </button>
              ))}
            </div>

            <div className={css.rhcities}>
              {forecast.countries.map(country => {
                const tone = country.verdict === 'BROKE' ? css.bad
                  : country.bufferingRiskPercent >= 15 || country.outageResistance === 'SINGLE_POINT' ? css.warn : css.good;
                return (
                  <div className={css.rhcity} key={country.marketId}>
                    <div className={css.rctop}>
                      <b>{country.country}</b>
                      <em className={tone}>{conc(country.demand)}</em>
                    </div>
                    <div className={css.rcbar}>
                      <i style={{ width: `${Math.min(100, Math.max(6, 100 - country.bufferingRiskPercent))}%` }} className={tone} />
                    </div>
                    <span>{country.startupTimeMs === null ? 'No delivery path' : `${(country.startupTimeMs / 1000).toFixed(1)}s startup`} · {country.bufferingRiskPercent}% buffer risk · {country.catalogueAvailabilityPercent}% catalogue</span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {(running || result) && (
          <>
            <div className={css.rhlive} role="status" aria-live="polite">
              <span>CONCURRENT STREAMS</span>
              <b className={brokeNow ? css.bad : overNow ? css.warn : ''}>{conc(result ? result.peakConcurrentStreams : live)}</b>
              <em>{Math.round(result ? result.peakLoadPercent : loadPct)}% of your own capacity</em>
            </div>

            <svg className={css.rhchart} viewBox={`0 0 ${W} ${H + 16}`} preserveAspectRatio="none">
              {forecast.burstCapacity > forecast.steadyCapacity && (
                <line className={css.burstline} x1="0" x2={W} y1={yOf(forecast.burstCapacity)} y2={yOf(forecast.burstCapacity)} />
              )}
              <line className={css.ceilline} x1="0" x2={W} y1={yOf(forecast.steadyCapacity)} y2={yOf(forecast.steadyCapacity)} />
              <polyline className={css.curve} points={pts} />
              {pts && <circle className={css.head} r="3.4" cx={(t * W).toFixed(1)} cy={yOf(live).toFixed(1)} />}
            </svg>
            <div className={css.rhkeys}>
              <span><i className={css.kc} />your capacity {conc(forecast.steadyCapacity)}</span>
              {forecast.burstCapacity > forecast.steadyCapacity && <span><i className={css.kb} />protected burst {conc(forecast.burstCapacity)}</span>}
            </div>

            <div className={css.rhbar}>
              <i className={css.fill} style={{ width: `${Math.min(100, loadPct)}%` }} />
            </div>

            {running && commandStep >= 2 && <div className={css.rhcommandfeed} aria-live="polite">
              {commandStep === 2 && forecast.countries.slice(0, 4).map(country => (
                <span key={country.marketId}><i />{country.country}<b>{country.servingCityLabels.join(' + ') || 'NO ROUTE'}</b></span>
              ))}
              {commandStep === 3 && forecast.facilities.map(facility => (
                <span key={facility.facilityId} className={css[facility.state.toLowerCase()] || ''}><i />{facility.cityLabel}<b>{facility.loadPercent}% · {facility.state}</b></span>
              ))}
              {commandStep === 4 && forecast.countries.slice(0, 4).map(country => (
                <span key={country.marketId}><i />{country.country}<b>{country.viewerConsequence}</b></span>
              ))}
            </div>}
          </>
        )}

        {result && (
          <div className={cx(css.verdict, css[result.verdict.toLowerCase()])}>
            <b className={css.vhead}>
              {result.verdict === 'HELD' ? 'IT HELD'
                : result.verdict === 'BURST' ? 'IT HELD — BY RENTING'
                  : 'IT BROKE'}
            </b>
            <p>
              {result.verdict === 'HELD' && (
                <>Peak {conc(result.peakConcurrentStreams)} against {conc(result.steadyCapacity)} steady capacity.
                  {' '}{result.spareCapacityPercent}% burst room remains, with country-level rights and delivery checks included.</>
              )}
              {result.verdict === 'BURST' && (
                <>Peak {conc(result.peakConcurrentStreams)} crosses steady capacity and uses the protected burst envelope.
                  {result.failedPercent > 0 ? ` ${result.failedPercent}% of streams are still expected to stutter or fail.` : ' Viewers should remain connected, but the margin is thin.'}</>
              )}
              {result.verdict === 'BROKE' && (() => {
                const worst = [...result.countries].sort((a, b) => b.failedPercent - a.failedPercent)[0];
                const ok = result.countries.filter(x => x.verdict === 'HELD').map(x => x.country);
                return (
                  <>{ok.length ? `${ok.join(' and ')} held. ` : ''}
                    <b>{worst.country} failed.</b> {conc(worst.demand)} viewers arrived through
                    {' '}{worst.servingCityLabels.join(' + ') || 'no working route'}, and {worst.failedPercent}%
                    {' '}of attempted streams are expected to fail.</>
                );
              })()}
            </p>

            <div className={css.rhsummarygrid} aria-label="Launch rehearsal summary">
              <span><em>PEAK</em><b>{conc(result.peakConcurrentStreams)}</b></span>
              <span><em>SPARE</em><b className={result.spareCapacityPercent < 10 ? css.bad : ''}>{result.spareCapacityPercent}%</b></span>
              <span><em>CATALOGUE</em><b className={result.catalogueAvailabilityPercent < 100 ? css.warn : ''}>{result.catalogueAvailabilityPercent}%</b></span>
              <span><em>REGIONAL SPF</em><b className={result.regionalSinglePointFailures.length ? css.warn : ''}>{result.regionalSinglePointFailures.length}</b></span>
            </div>
            <div className={css.rhwarning}>{result.warningSummary}</div>

            <button
              type="button"
              className={css.rhvieweropen}
              onClick={() => {
                const worstCountry = [...result.countries]
                  .sort((a, b) => b.failedPercent - a.failedPercent)[0];
                setViewerMarketId(worstCountry?.marketId || result.countries[0]?.marketId || null);
                setViewerViewOpen(true);
              }}
            >
              <span><b>SEE WHAT VIEWERS SEE</b><em>Open the stream in every launch market</em></span>
              <i aria-hidden="true">→</i>
            </button>

            {/* per city, because "which of my own territories did I let down" is
                a far better question than one global percentage */}
            <div className={css.citygrid}>
              {result.countries.map(x => (
                <div className={cx(css.cres, css[x.verdict.toLowerCase()])} key={x.marketId}>
                  <div className={css.crtop}>
                    <b>{x.country}</b>
                    <em>{x.verdict === 'HELD' ? 'HELD' : x.verdict === 'BURST' ? 'RENTED' : 'FAILED'}</em>
                  </div>
                  <span>{conc(x.demand)} · {x.startupTimeMs === null ? 'no route' : `${(x.startupTimeMs / 1000).toFixed(1)}s start`} · {x.bufferingRiskPercent}% buffer{x.failedPercent > 0 ? ` · ${x.failedPercent}% lost` : ''}</span>
                  <small>{x.catalogueAvailabilityPercent}% catalogue · {x.outageResistance.replace('_', ' ')}</small>
                </div>
              ))}
            </div>

            {/* said in the language of the page they will be staring at when it happens for real */}
            <div className={css.ministatus}>
              <div className={css.mstop}>
                <b>Streaming delivery</b>
                <em className={result.verdict === 'BROKE' ? css.outage : result.verdict === 'BURST' && result.failedPercent > 0 ? css.degraded : css.operational}>
                  {result.verdict === 'BROKE' ? 'Major outage'
                    : result.verdict === 'BURST' && result.failedPercent > 0 ? 'Degraded performance'
                      : 'Operational'}
                </em>
              </div>
              <div className={css.mstrip}>
                {Array.from({ length: 46 }).map((_, n) => {
                  const bad = n >= 42 && result.verdict === 'BROKE';
                  const deg = n >= 43 && result.verdict === 'BURST' && result.failedPercent > 0;
                  return <i key={n} className={bad ? css.down : deg ? css.deg : css.ok} />;
                })}
              </div>
            </div>

            <div className={css.fixes}>
              <span className={css.fixhead}>REPAIR THE PLAN</span>
              {result.repairActions.map(action => (
                <button className={css.fixaction} key={action.id} onClick={() => applyRehearsalRepair(action)}>
                  <span><b>{action.label.toUpperCase()}</b>{action.detail}</span>
                  <i>{action.type === 'EXPAND_RIGHTS' ? 'OPEN →' : 'FIX →'}</i>
                </button>
              ))}
              {result.verdict !== 'HELD' && archOf(sel.arch).burst === 0 && (
                <button className={css.fixaction} onClick={() => onRepair({ ...sel, arch: 'HYBRID' }, 'Hybrid burst enabled. Rehearse again before commissioning.')}>
                  <span><b>ENABLE HYBRID BURST</b>Rent temporary capacity when a premiere crosses your own ceiling.</span><i>FIX →</i>
                </button>
              )}
              {sel.doctrine === 'RUSHED' && (
                <button className={css.fixaction} onClick={() => onRepair({ ...sel, doctrine: 'STANDARD' }, 'Construction returned to a standard schedule. Rehearse again to verify it.')}>
                  <span><b>STOP RUSHING THE BUILD</b>Restore testing time and rated stability.</span><i>FIX →</i>
                </button>
              )}
              {result.verdict !== 'HELD' && sel.campaign !== 'NONE' && (
                <button className={css.fixaction} onClick={() => onRepair({ ...sel, campaign: 'NONE' }, 'The launch campaign was removed. Demand forecast has been recalculated.')}>
                  <span><b>REDUCE OPENING HYPE</b>Lower demand instead of buying more capacity.</span><i>CHANGE →</i>
                </button>
              )}
              {result.repairActions.length === 0 && result.verdict === 'HELD' && (
                <div className={css.fix}>Nothing needs to change. Every opening market clears traffic, rights and resilience checks.</div>
              )}
            </div>
            {result.verdict !== 'HELD' && (
              <div className={css.overridecopy}>
                <b>FOUNDER OVERRIDE AVAILABLE</b>
                <span>This warning will remain on the launch record, but it will not stop you from commissioning the network.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {viewerViewOpen && viewerCountry && (
        <div className={css.viewerOverlay} role="dialog" aria-modal="true" aria-label="Viewer experience">
          <header className={css.viewerTop}>
            <button type="button" onClick={() => setViewerViewOpen(false)} aria-label="Close viewer experience">✕</button>
            <span><b>VIEWER EXPERIENCE</b><em>{viewerCountry.country}</em></span>
          </header>

          <div className={css.viewerBody}>
            <div className={cx(css.viewerScreen, css[viewerCountry.verdict.toLowerCase()])}>
              <div className={css.viewerSignal} aria-hidden="true" />
              <span className={css.viewerService}>{brand.name}</span>
              <div className={css.viewerTitle}>
                <span>PREMIERE NIGHT</span>
                <b>{inp.premiereTitle}</b>
              </div>
              <div className={css.viewerPlayback}>
                {viewerCountry.verdict === 'BROKE' ? (
                  <><i className={css.viewerSpinner} /><b>STREAM UNAVAILABLE</b></>
                ) : viewerCountry.bufferingRiskPercent >= 15 ? (
                  <><i className={css.viewerSpinner} /><b>BUFFERING</b></>
                ) : (
                  <><i className={css.viewerPlay}><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor" /></svg></i><b>PLAYING</b></>
                )}
              </div>
              <div className={css.viewerTimeline}><i style={{ width: viewerCountry.verdict === 'BROKE' ? '12%' : '42%' }} /></div>
            </div>

            <div className={css.viewerMarkets} aria-label="Choose viewer market">
              {result.countries.map(country => (
                <button
                  type="button"
                  key={country.marketId}
                  className={country.marketId === viewerCountry.marketId ? css.on : undefined}
                  onClick={() => setViewerMarketId(country.marketId)}
                >
                  <b>{country.country}</b>
                  <em>{country.verdict === 'HELD' ? 'Clear' : country.verdict === 'BURST' ? 'At risk' : 'Failed'}</em>
                </button>
              ))}
            </div>

            <section className={css.viewerReport}>
              <p>{viewerCountry.viewerConsequence}</p>
              <div>
                <span><em>STARTUP</em><b>{viewerCountry.startupTimeMs === null ? 'NO ROUTE' : `${(viewerCountry.startupTimeMs / 1000).toFixed(1)}s`}</b></span>
                <span><em>BUFFER RISK</em><b>{viewerCountry.bufferingRiskPercent}%</b></span>
                <span><em>STREAMS LOST</em><b>{viewerCountry.failedPercent}%</b></span>
                <span><em>CATALOGUE</em><b>{viewerCountry.catalogueAvailabilityPercent}%</b></span>
              </div>
            </section>
          </div>
        </div>
      )}

      <div className={css.rhfoot}>
        {!running && !result && (
          <button className={css.rhrun} onClick={() => { setT(0); setRunning(true); }}>RUN THE REHEARSAL</button>
        )}
        {running && <div className={css.rhwait}><i />PUSHING TRAFFIC…</div>}
        {result && (
          <>
            <button className={css.rhagain} onClick={() => { setResult(null); setT(0); }}>RUN AGAIN</button>
            <button className={css.rhrun} onClick={onClose}>BACK TO THE BUILD</button>
          </>
        )}
      </div>
    </div>
  );
};

/**
 * Reuses the original rehearsal as a standalone full-screen experience from
 * the transplanted Build wizard. The `.bld` shell supplies the exact legacy
 * tokens and fixed mobile frame without duplicating any simulation logic.
 */
export const StreamingLoadRehearsalExperience: React.FC<React.ComponentProps<typeof Rehearsal>> = props => (
  <div className={css.bld} style={brandVars(props.brand)}>
    <Rehearsal {...props} />
  </div>
);

/* ============================================================
   THE SCREEN
   ============================================================ */
export const TheBuild: React.FC<{
  brand: Brand;
  inputs: BuildInputs;
  sel: BuildSel;
  /** the rehearsal lives in the parent so the HQ's readiness count and this
      screen's gate can never disagree about whether one has been run */
  result?: RunResult | null;
  onResult?: (r: RunResult | null) => void;
  /** what has actually been paid for and stands. null until commissioning —
      everything on screen before that is a drawing, and says so. */
  built?: Placement[] | null;
  builtFacilities?: OwnedStreamingFacility[] | null;
  /** true only once opening night has actually been played */
  isLive?: boolean;
  onCommit?: (p: Placement[]) => BuildCommitResult | void;
  onOpenNight?: () => void;
  onChange: (s: BuildSel) => void;
  onBack: () => void;
  onLaunch?: () => void;
  /** the plans on sale, summarised — the page itself lives in pricing.tsx */
  pricing?: { label: string; arpu: string; reach: string; problems: number; sellable: number };
  onOpenPricing?: () => void;
  /** Route catalogue-rights repair actions back to the canonical Content desk. */
  onOpenContent?: () => void;
  /** where the money came from — the canonical Finance Room owns new capital */
  funding?: { borrowed: number; soldPct: number; own: number };
  onRaise?: () => void;
}> = ({ brand, inputs, sel, result, onResult, built, builtFacilities, isLive, onCommit, onOpenNight,
  onChange, onBack, onLaunch, pricing, onOpenPricing, onOpenContent, funding, onRaise }) => {
  const c = brandColor(brand), c2 = brandDeep(brand);
  const d = useMemo(() => derive(sel, inputs), [sel, inputs]);
  const [rehearse, setRehearse] = useState(false);
  const [picking, setPicking] = useState(false);
  const [commissioning, setCommissioning] = useState(false);
  const [commitResult, setCommitResult] = useState<BuildCommitResult | null>(null);
  const [commitFeedback, setCommitFeedback] = useState('');
  const [planFeedback, setPlanFeedback] = useState('');
  const [showNetworkDetail, setShowNetworkDetail] = useState(false);
  const [marketplaceCityId, setMarketplaceCityId] = useState<string | null>(null);
  const [assistedPlan, setAssistedPlan] = useState<AssistedNetworkPlan | null>(null);
  /** Which node the player last tapped on the map. Detail is pulled, not pushed. */
  const [mapFocusId, setMapFocusId] = useState<string | null>(null);
  /** The team's standing orders exist, but they are never the first read. */
  const [showTeamRules, setShowTeamRules] = useState(false);
  const [activeStage, setActiveStage] = useState<BuildStage>(() => (
    sel.placements.some(placement => placement.racks > 0) ? 'PLANS' : 'SITES'
  ));
  const buildScrollRef = useRef<HTMLDivElement>(null);
  const last = result ?? null;
  const recommendation = useMemo(() => recommendedMarketPlacements(inputs), [inputs]);
  const recommendationFacilities = useMemo(
    () => facilitiesForPlacements(recommendation),
    [recommendation],
  );
  const currentFacilities = useMemo(() => facilitiesOf(sel), [sel.facilities, sel.placements]);
  const managementPolicy = useMemo(
    () => normalizeStreamingInfrastructureManagementPolicy(sel.managementPolicy),
    [sel.managementPolicy],
  );
  const plannerCities = useMemo(() => uniqueCities([
    ...managementPolicy.preferredCityIds,
    ...recommendation.map(placement => placement.cityId),
    ...suggestedCities(inputs.regions, 8, inputs.homeCityId).map(city => city.id),
  ]).slice(0, 8), [managementPolicy.preferredCityIds, recommendation, inputs.regions, inputs.homeCityId]);
  const placementKey = (placements: Placement[]) => [...placements]
    .filter(placement => placement.racks > 0)
    .map(placement => `${placement.cityId}:${placement.racks}:${placement.role}`)
    .sort().join('|');
  const recommendationActive = placementKey(recommendation) === placementKey(sel.placements);
  const preset = useMemo(
    () => matchedPreset(sel, inputs.regions, inputs.homeCityId),
    [sel, inputs.regions, inputs.homeCityId]);

  const isBuilt = !!built;
  const builtFacilityList = useMemo(
    () => builtFacilities?.length ? builtFacilities : migratePlacementsToStreamingFacilities(built),
    [built, builtFacilities],
  );
  const builtOf = (facilityId: string, cityId: string) => (
    builtFacilityList.find(facility => facility.id === facilityId)?.installedRacks
    ?? built?.find(p => p.cityId === cityId)?.racks
    ?? 0
  );
  const planned = d.halls.reduce((s, h) => s + Math.max(0, h.racks - builtOf(h.facilityId, h.city.id)), 0);

  /* ── what the map draws ───────────────────────────────────────────────
     One node per hall, marked built or merely drawn. The map derives nothing
     of its own; every number here already came out of derive(). */
  const mapNodes = useMemo<NetworkMapNode[]>(() => d.halls.map(hall => ({
    facilityId: hall.facilityId,
    city: hall.city,
    racks: hall.racks,
    role: hall.role,
    load: hall.load / 100,
    built: builtOf(hall.facilityId, hall.city.id) > 0,
  })), [d.halls, builtFacilityList, built]);
  const focusHall = mapFocusId ? d.halls.find(hall => hall.facilityId === mapFocusId) ?? null : null;

  /* The size slider's position. -1 means the network no longer matches any
     package, which is the honest reading once a player has hand-placed. */
  const sizeIndex = preset ? PACKAGES.findIndex(pkg => pkg.id === preset) : -1;
  const applyPackage = (id: PkgId) => {
    const placements = presetPlacements(id, inputs.regions, inputs.homeCityId);
    commit(selectionWithFacilities(sel, facilitiesForPlacements(placements)));
  };
  /* what the committed build costs, so a revision can be priced as a difference */
  const dBuilt = useMemo(
    () => derive({
      ...sel,
      placements: built ?? [],
      facilities: builtFacilityList,
    }, inputs),
    [sel.arch, sel.doctrine, sel.campaign, built, builtFacilityList, inputs]);

  const commit = (s: BuildSel) => {
    setAssistedPlan(null);
    setCommitFeedback('');
    setPlanFeedback('');
    setCommitResult(null);
    onResult?.(null);
    onChange(s.facilities?.length ? selectionWithFacilities(s, s.facilities) : s);
  };

  const saveManagementPolicy = (patch: Partial<StreamingInfrastructureManagementPolicy>) => {
    const nextPolicy = normalizeStreamingInfrastructureManagementPolicy({
      ...managementPolicy,
      ...patch,
    });
    setAssistedPlan(null);
    setPlanFeedback('');
    // Preferences do not invalidate a load test because they are not part of
    // the network simulation. Only an applied facility draft does that.
    onChange({ ...sel, managementPolicy: nextPolicy });
  };

  const togglePreferredCity = (cityId: string) => {
    const selected = managementPolicy.preferredCityIds.includes(cityId);
    const preferredCityIds = selected
      ? managementPolicy.preferredCityIds.filter(id => id !== cityId)
      : [...managementPolicy.preferredCityIds, cityId].slice(0, 4);
    saveManagementPolicy({ preferredCityIds });
  };

  const draftAssistedPlan = () => {
    setPlanFeedback('');
    setAssistedPlan(createAssistedNetworkPlan(
      sel,
      inputs,
      managementPolicy,
      builtFacilityList,
    ));
  };

  const applyAssistedPlan = () => {
    if (!assistedPlan) return;
    const next = assistedPlan.selection;
    commit(next);
    setPlanFeedback(`Assisted draft applied: ${next.placements.length} network ${next.placements.length === 1 ? 'city' : 'cities'} and ${next.placements.reduce((sum, placement) => sum + placement.racks, 0)} racks. Rehearse before commissioning.`);
  };

  const beginCommissioning = () => {
    const outcome = onCommit?.(sel.placements.map(p => ({ ...p })));
    if (outcome && !outcome.ok) {
      setCommitResult(outcome);
      setCommitFeedback(outcome.message);
      return;
    }
    const success = outcome || { ok: true, message: 'The infrastructure contract was committed.', next: 'LAUNCH' as const };
    setCommitResult(success);
    setCommitFeedback('');
    setCommissioning(true);
  };

  const setRacks = (facilityId: string, racks: number) => {
    const facility = currentFacilities.find(item => item.id === facilityId);
    if (!facility) return;
    const capacity = getStreamingFacilityCapacity(facility);
    const n = Math.max(0, Math.min(capacity, racks));
    const next = currentFacilities
      .map(item => item.id === facilityId ? withSyncedRackGroups(item, n) : item)
      .filter(item => item.installedRacks > 0);
    if (next.length && !next.some(item => item.role === 'CORE_ORIGIN')) {
      next[0] = withFacilityNetworkRole(next[0], 'CORE_ORIGIN');
    }
    commit(selectionWithFacilities(sel, next));
  };

  const setFacilityGroups = (facilityId: string, groups: OwnedStreamingRackGroup[]) => {
    const next = currentFacilities.map(facility => {
      if (facility.id !== facilityId) return facility;
      const rackGroups = groups.filter(group => group.rackCount > 0);
      const installedRacks = rackGroups.reduce((sum, group) => sum + group.rackCount, 0);
      return {
        ...facility,
        installedRacks,
        rackGroups,
        role: projectFacilityNetworkRole(rackGroups),
      };
    }).filter(facility => facility.installedRacks > 0);
    if (next.length && !next.some(facility => facility.rackGroups?.some(group => getProjectedRackDuty(group) === 'CONTENT_ORIGIN'))) {
      const first = next[0];
      const groups = normalizeStreamingRackGroups(first.rackGroups, first.id, first.installedRacks, first.role);
      groups[0] = { ...groups[0], duty: 'CONTENT_ORIGIN', migration: undefined, name: 'Content origin 1' };
      next[0] = { ...first, rackGroups: groups, role: 'CORE_ORIGIN' };
    }
    commit(selectionWithFacilities(sel, next));
  };

  const installRackGroup = (facilityId: string, duty: StreamingRackDuty) => {
    const facility = currentFacilities.find(item => item.id === facilityId);
    if (!facility || facility.installedRacks >= getStreamingFacilityCapacity(facility)) return;
    const groups = normalizeStreamingRackGroups(facility.rackGroups, facility.id, facility.installedRacks, facility.role);
    const ordinal = groups.length + 1;
    setFacilityGroups(facilityId, [...groups, {
      id: createStreamingRackGroupId(facilityId, ordinal),
      name: `${getStreamingRackDutyRule(duty).name} ${ordinal}`,
      rackCount: 1,
      duty,
    }]);
    setPlanFeedback(`${getStreamingRackDutyRule(duty).name} group installed in ${cityById(facility.cityId)?.label || facility.cityId}. Rehearsal demand has been recalculated.`);
  };

  const changeRackGroupDuty = (facilityId: string, groupId: string, duty: StreamingRackDuty) => {
    const facility = currentFacilities.find(item => item.id === facilityId);
    if (!facility) return;
    const allGroups = currentFacilities.flatMap(item => normalizeStreamingRackGroups(
      item.rackGroups,
      item.id,
      item.installedRacks,
      item.role,
    ));
    const currentGroup = allGroups.find(group => group.id === groupId);
    const originCount = allGroups.filter(group => getProjectedRackDuty(group) === 'CONTENT_ORIGIN').length;
    if (currentGroup && getProjectedRackDuty(currentGroup) === 'CONTENT_ORIGIN'
      && duty !== 'CONTENT_ORIGIN' && originCount <= 1) {
      setPlanFeedback('Keep one Content Origin online. It is the master library every cache and edge group depends on. Install another origin before changing this duty.');
      return;
    }
    const groups = normalizeStreamingRackGroups(facility.rackGroups, facility.id, facility.installedRacks, facility.role)
      .map(group => group.id !== groupId || getProjectedRackDuty(group) === duty ? group : {
        ...group,
        migration: {
          fromDuty: group.duty,
          toDuty: duty,
          weeks: getStreamingRackDutyRule(duty).migrationWeeks,
          pressurePercent: getStreamingRackDutyRule(duty).migrationPressurePercent,
        },
      });
    setFacilityGroups(facilityId, groups);
  };

  const resizeRackGroup = (facilityId: string, groupId: string, delta: number) => {
    const facility = currentFacilities.find(item => item.id === facilityId);
    if (!facility) return;
    const groups = normalizeStreamingRackGroups(facility.rackGroups, facility.id, facility.installedRacks, facility.role);
    const group = groups.find(item => item.id === groupId);
    if (!group) return;
    if (delta > 0 && facility.installedRacks >= getStreamingFacilityCapacity(facility)) return;
    if (delta < 0 && group.rackCount <= 1) return;
    setFacilityGroups(facilityId, groups.map(item => item.id === groupId
      ? { ...item, rackCount: item.rackCount + delta }
      : item));
  };

  const moveRackGroup = (facilityId: string, groupId: string, targetFacilityId: string) => {
    const source = currentFacilities.find(item => item.id === facilityId);
    const target = currentFacilities.find(item => item.id === targetFacilityId);
    if (!source || !target) return;
    const sourceGroups = normalizeStreamingRackGroups(source.rackGroups, source.id, source.installedRacks, source.role);
    const moving = sourceGroups.find(group => group.id === groupId);
    if (!moving || moving.rackCount > getStreamingFacilityCapacity(target) - target.installedRacks) return;
    const targetGroups = normalizeStreamingRackGroups(target.rackGroups, target.id, target.installedRacks, target.role);
    const movedGroup: OwnedStreamingRackGroup = {
      ...moving,
      id: createStreamingRackGroupId(target.id, targetGroups.length + 1),
      name: `${getStreamingRackDutyRule(getProjectedRackDuty(moving)).name} ${targetGroups.length + 1}`,
      migration: {
        fromDuty: moving.duty,
        toDuty: getProjectedRackDuty(moving),
        weeks: 2,
        pressurePercent: 15,
      },
    };
    const next = currentFacilities.map(facility => {
      if (facility.id === source.id) {
        const rackGroups = sourceGroups.filter(group => group.id !== groupId);
        return rackGroups.length
          ? { ...facility, rackGroups, installedRacks: rackGroups.reduce((sum, group) => sum + group.rackCount, 0), role: projectFacilityNetworkRole(rackGroups) }
          : null;
      }
      if (facility.id === target.id) {
        const rackGroups = [...targetGroups, movedGroup];
        return { ...facility, rackGroups, installedRacks: rackGroups.reduce((sum, group) => sum + group.rackCount, 0), role: projectFacilityNetworkRole(rackGroups) };
      }
      return facility;
    }).filter((facility): facility is OwnedStreamingFacility => Boolean(facility));
    commit(selectionWithFacilities(sel, next));
    setPlanFeedback(`Rack group move scheduled. Capacity runs under extra pressure for ${movedGroup.migration?.weeks || 2} weeks.`);
  };

  const repairFacility = (facilityId: string, action: StreamingFacilityRepairAction) => {
    const facility = currentFacilities.find(item => item.id === facilityId);
    if (!facility) return;
    const repaired = applyStreamingFacilityRepair(facility, action, inputs.absoluteWeek || 0);
    const next = currentFacilities.map(item => item.id === facilityId ? repaired.facility : item);
    commit(selectionWithFacilities(sel, next));
    setPlanFeedback(`${repaired.summary} The draft adds ${money(repaired.cost)} to infrastructure capital; treasury moves only at commissioning.`);
  };

  const openCityMarketplace = (cityId: string) => {
    setPicking(false);
    setMarketplaceCityId(cityId);
  };

  const leaseFacility = (listing: StreamingFacilityMarketplaceListing) => {
    const role: StreamingNetworkNodeRole = currentFacilities.some(facility => facility.role === 'CORE_ORIGIN')
      ? currentFacilities.some(facility => facility.cityId === listing.cityId)
        ? 'EDGE_CACHE'
        : 'REGIONAL_HUB'
      : 'CORE_ORIGIN';
    const next = [
      ...currentFacilities,
      createStreamingFacilityFromListing(listing, currentFacilities, role, 1),
    ];
    commit(selectionWithFacilities(sel, next));
    setMarketplaceCityId(null);
    setPlanFeedback(`${listing.providerName} ${listing.shortName.toLowerCase()} added in ${cityById(listing.cityId)?.label || listing.cityId}. It is a draft contract until commissioning.`);
  };

  const set = <K extends keyof BuildSel>(k: K, v: BuildSel[K]) => {
    if (sel[k] === v) return;
    commit({ ...sel, [k]: v });
  };

  const repairCountry = (row: CountryServiceRow) => {
    const existing = currentFacilities.find(facility => facility.cityId === row.repairCityId);
    if (existing) {
      if (existing.installedRacks < getStreamingFacilityCapacity(existing)) {
        setRacks(existing.id, existing.installedRacks + 1);
      } else {
        setMarketplaceCityId(existing.cityId);
      }
      return;
    }
    setMarketplaceCityId(row.repairCityId);
  };

  const ready = !d.over && last !== null && d.racks > 0
    && (!pricing || pricing.sellable > 0);
  const activeStageMeta = BUILD_STAGES.find(stage => stage.id === activeStage) || BUILD_STAGES[0];
  const stageDone: Record<BuildStage, boolean> = {
    SITES: d.racks > 0 && d.unserved.length === 0,
    PLANS: d.racks > 0 && (!pricing || pricing.sellable > 0),
    MONEY: !d.over,
    TEST: last !== null,
    LAUNCH: ready,
  };
  const goToStage = (stage: BuildStage) => {
    setActiveStage(stage);
    buildScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };
  /* "Tight" is the last moment a player can still choose a smaller network
     instead of being told to raise. Below a tenth of the treasury there is not
     enough headroom left for the catalogue and the campaign to both land. */
  const tight = !d.over && d.remaining < inputs.treasury * 0.1;
  const constrainedHalls = d.halls.filter(hall => hall.physical.limitingFactor !== 'NONE');
  const physicalFloor = d.halls.length
    ? Math.round(Math.min(...d.halls.map(hall => hall.physical.usableCapacityFactor)))
    : 0;
  const physicalWeekly = d.halls.reduce((sum, hall) => sum + hall.physical.weeklyOperatingCost, 0);
  const backupCoverage = d.racks
    ? Math.round(d.halls.reduce((sum, hall) => sum + hall.physical.backupCoveragePercent * hall.racks, 0) / d.racks)
    : 0;

  return (
    /* 'drawing', not 'plan' — pricing.tsx owns a global .plan for its columns
       and both stylesheets are live at once while that sheet is open */
    <div className={css.bld}
      data-epx-root
      data-active-stage={isBuilt ? undefined : activeStage}
      style={brandVars(brand)}>
      <div className={css.bldtop}>
        <button className={css.bldback} onClick={onBack} aria-label="Back">←</button>
        <div className={css.bldtitle}>
          <b>{isBuilt ? 'INFRASTRUCTURE' : 'THE BUILD'}</b>
          <span>
            {isBuilt
              ? `${isLive ? 'BUILT' : 'BUILT · NOT OPEN'} · ${d.racks - planned} RACKS STANDING${planned ? ` · ${planned} DRAWN` : ''}`
              : `NOTHING EXISTS YET · ${d.weeks} WEEK${d.weeks === 1 ? '' : 'S'} TO BUILD`}
          </span>
        </div>
        <span className={css.bldmark}><Mark brand={brand} /></span>
      </div>

      {/* The spine is now the build itself: five short rooms, not one giant page. */}
      {!isBuilt && (
        <div className={css.spine} role="navigation" aria-label="Build stages">
          {BUILD_STAGES.map((stage, i) => (
            <button type="button"
              className={cx(css.sp, stageDone[stage.id] ? css.done : '', activeStage === stage.id ? css.active : '')}
              aria-current={activeStage === stage.id ? 'step' : undefined}
              onClick={() => goToStage(stage.id)}
              key={stage.id}>
              <i className={css.spdot}>{stageDone[stage.id] ? '✓' : i + 1}</i>
              <span>{stage.id}</span>
            </button>
          ))}
        </div>
      )}

      {!isBuilt && (
        <div className={cx(css.budgethud, d.over ? css.over : tight ? css.tight : '')}>
          <button type="button" className={css.budgethudmain} onClick={() => goToStage('MONEY')}
            aria-label="Open build money stage">
            {/* "SHORTFALL −$7.74M" reads as a double negative. The label already
                carries the sign, so the number states magnitude. */}
            <span><small>{d.over ? 'SHORTFALL' : 'HEADROOM'}</small><b>{money(Math.abs(d.remaining))}</b></span>
            <span><small>COMMITTED</small><b>{money(d.committed)}</b></span>
            <span><small>NETWORK</small><b>{d.racks}R · {d.uniqueCityCount}C</b></span>
          </button>
          {/* FUND used to appear only once the plan was ALREADY over the
              treasury — the player found out they needed money at the moment
              they could no longer do anything about it. It now appears while
              there is still room to act. */}
          {onRaise && (d.over || tight)
            ? <button type="button" className={css.budgethudaction} onClick={onRaise}>FUND</button>
            : <button type="button" className={css.budgethudaction} onClick={() => goToStage('MONEY')}>MONEY ›</button>}
        </div>
      )}

      <div className={css.bldscroll} ref={buildScrollRef}>

        {!isBuilt && (
          <div className={css.stagehero}>
            <span>{BUILD_STAGES.findIndex(stage => stage.id === activeStage) + 1} / {BUILD_STAGES.length} · {activeStage}</span>
            <b>{activeStageMeta.title}</b>
            <p>{activeStageMeta.line}</p>
          </div>
        )}

        {commitFeedback ? (
          <div className={css.commiterror} role="alert">
            <b>BUILD NOT COMMITTED</b>
            <span>{commitFeedback}</span>
          </div>
        ) : null}
        {planFeedback ? (
          <div className={css.plannotice} role="status">
            <b>PLAN UPDATED</b>
            <span>{planFeedback}</span>
          </div>
        ) : null}

        <div data-build-stage="MONEY">
          {isBuilt
            ? <RevisionBar spent={dBuilt.committed} d={d} dBuilt={dBuilt} />
            : <BudgetBar inp={inputs} d={d} funding={funding} onRaise={onRaise} />}
        </div>

        {/* ══ SITES — one path.

               This stage used to offer four ways to place a network AT THE SAME
               TIME: an assisted questionnaire, a blueprint auto-fill card, a row
               of presets, and the facility list. Every one of them was a good
               feature; together they made the player's first question "which of
               these am I supposed to use?" rather than "how big should this be?".

               There is now a single spine — see it, size it, accept it — and
               hand placement is a deliberate step OFF that path instead of a
               rival to it. The team's own proposal is one line, not a card. ══ */}
        <section className={cx(css.bsec, css.sites)} data-build-stage="SITES">

          <StreamingBuildNetworkMap
            nodes={mapNodes}
            coverage={inputs.coverageRegions?.length ? inputs.coverageRegions : inputs.regions}
            unserved={d.unserved}
            selectedFacilityId={mapFocusId}
            onSelect={id => setMapFocusId(current => current === id ? null : id)}
            live={Boolean(isBuilt)} />

          {/* What the map is worth, in four numbers and no sentences. */}
          <div className={css.siteFacts}>
            <span className={css.fact}>
              <small>SITES</small>
              <b>{d.uniqueCityCount}</b>
              <em>{d.uniqueCityCount === 1 ? 'city' : 'cities'}</em>
            </span>
            <span className={css.fact}>
              <small>MACHINES</small>
              <b>{d.racks}</b>
              <em>racks</em>
            </span>
            <span className={css.fact}>
              <small>OUTAGE SAFETY</small>
              <b className={cx(
                d.resilienceLabel === 'REDUNDANT' ? css.good : d.resilienceLabel === 'EXPOSED' ? css.warn : css.bad,
              )}>{d.resilienceLabel === 'REDUNDANT' ? 'SAFE' : d.resilienceLabel}</b>
              <em>{d.uniqueCityCount > 1 ? 'spread out' : 'single point'}</em>
            </span>
            <span className={css.fact}>
              <small>TO BUILD</small>
              <b>{money(d.capex)}</b>
              <em>{d.weeks} wk{d.weeks === 1 ? '' : 's'}</em>
            </span>
          </div>

          {focusHall && (
            <div className={css.siteFocus}>
              <div>
                <span>{focusHall.city.label} · {ROLE_RULES[focusHall.role].technical}</span>
                {/* hall.load is already a percentage out of derive(); only the
                    map's ring wants it as a 0-1 fraction. */}
                <b>{focusHall.racks} rack{focusHall.racks === 1 ? '' : 's'} · {Math.round(focusHall.load)}% of its ceiling</b>
                <p>{ROLE_RULES[focusHall.role].line}</p>
              </div>
              <button type="button" onClick={() => setMapFocusId(null)} aria-label="Close site detail">✕</button>
            </div>
          )}

          {/* ── the one control that replaces the preset row and the budget dial ── */}
          {!isBuilt && (
            <div className={css.sizer}>
              <div className={css.sizerHead}>
                <div>
                  <span>HOW BIG</span>
                  <b>{sizeIndex < 0 ? 'Custom' : PACKAGES[sizeIndex].name}</b>
                </div>
                <em>{sizeIndex < 0
                  ? 'Hand-placed'
                  : `${PACKAGES[sizeIndex].racks} racks · ${PACKAGES[sizeIndex].cities} cit${PACKAGES[sizeIndex].cities === 1 ? 'y' : 'ies'}`}</em>
              </div>
              <input
                type="range"
                min="0"
                max={PACKAGES.length - 1}
                step="1"
                className={css.sizerRange}
                aria-label="Network size"
                value={sizeIndex < 0 ? 0 : sizeIndex}
                onChange={event => applyPackage(PACKAGES[Number(event.target.value)].id)} />
              <div className={css.sizerTicks} aria-hidden="true">
                {PACKAGES.map((pkg, index) => (
                  <span key={pkg.id} className={index === sizeIndex ? css.on : ''}>{pkg.name.split(' ')[0]}</span>
                ))}
              </div>

              {/* The blueprint, demoted from a card to a line. */}
              {recommendation.length > 0 && (
                <button type="button"
                  className={cx(css.suggest, recommendationActive ? css.taken : '')}
                  disabled={recommendationActive}
                  onClick={() => commit(selectionWithFacilities(sel, recommendationFacilities))}>
                  <i />
                  <span>{recommendationActive
                    ? 'Using your team’s plan'
                    : `Your team suggests ${recommendation.length} cit${recommendation.length === 1 ? 'y' : 'ies'} · ${recommendation.reduce((sum, placement) => sum + placement.racks, 0)} racks`}</span>
                  {!recommendationActive && <em>USE IT</em>}
                </button>
              )}
            </div>
          )}

          {/* ── stepping off the path is a choice, not a competing mode ── */}
          {!isBuilt && (
            <div className={css.handoff}>
              {managementPolicy.mode === 'HANDS_ON' ? (
                <div className={css.handsonnote}>
                  <span>HANDS-ON CONTROL ACTIVE</span>
                  <b>Facilities, rack duties, architecture and build pace are unlocked below.</b>
                  <button type="button" onClick={() => saveManagementPolicy({ mode: 'ASSISTED' })}>
                    Hand it back to the team
                  </button>
                </div>
              ) : (
                <button type="button" className={css.takeover}
                  onClick={() => saveManagementPolicy({ mode: 'HANDS_ON' })}>
                  <b>Place the cities myself</b>
                  <span>Lease specific rooms, set rack duties, pick the architecture</span>
                  <i>›</i>
                </button>
              )}

              <button type="button" className={css.rulesToggle}
                aria-expanded={showTeamRules}
                onClick={() => setShowTeamRules(open => !open)}>
                HOW YOUR NETWORK GETS MANAGED <i>{showTeamRules ? '−' : '+'}</i>
              </button>
            </div>
          )}

          {/* ── the team's standing orders: real, but never the first thing you read ── */}
          {showTeamRules && !isBuilt && (
            <div className={css.rules}>
              <div className={css.ruleblock}>
                <div className={css.rulelabel}><span>1</span><b>WHAT MATTERS MOST?</b></div>
                <div className={css.prioritygrid}>
                  {([
                    ['ECONOMY', 'Save cash', 'Lean opening'],
                    ['BALANCED', 'Balanced', 'Smart default'],
                    ['RELIABLE', 'Stay online', 'More backup'],
                    ['PREMIUM', 'Premium', 'Own more capacity'],
                  ] as const).map(([id, title, line]) => (
                    <button key={id} className={managementPolicy.priority === id ? css.on : ''}
                      onClick={() => saveManagementPolicy({ priority: id })}>
                      <b>{title}</b><span>{line}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={css.ruleblock}>
                <div className={css.rulelabel}><span>2</span><b>MAX NETWORK BUDGET</b></div>
                <div className={css.budgetguard}>
                  <b>{money(managementPolicy.maximumBudget)}</b>
                  <input type="range" min="4" max="30" step="1"
                    aria-label="Maximum assisted network budget in millions"
                    value={Math.round(managementPolicy.maximumBudget / 1_000_000)}
                    onChange={event => saveManagementPolicy({ maximumBudget: Number(event.target.value) * 1_000_000 })} />
                  <small>Server spaces, machines and the opening operating reserve.</small>
                </div>
                <div className={css.riskrow} role="group" aria-label="Risk tolerance">
                  {([
                    ['LOW', 'CAREFUL'], ['MEDIUM', 'NORMAL'], ['HIGH', 'FAST'],
                  ] as const).map(([id, label]) => (
                    <button key={id} className={managementPolicy.riskTolerance === id ? css.on : ''}
                      onClick={() => saveManagementPolicy({ riskTolerance: id })}>{label}</button>
                  ))}
                </div>
              </div>

              <div className={css.ruleblock}>
                <div className={css.rulelabel}><span>3</span><b>PREFERRED CITIES <em>OPTIONAL · UP TO 4</em></b></div>
                <div className={css.citychips}>
                  {plannerCities.map(cityId => (
                    <button key={cityId}
                      className={managementPolicy.preferredCityIds.includes(cityId) ? css.on : ''}
                      onClick={() => togglePreferredCity(cityId)}>
                      {cityById(cityId)?.label || cityId}
                    </button>
                  ))}
                </div>
                <label className={css.approvalrow}>
                  <input type="checkbox" checked={managementPolicy.requireApprovalForExpensiveChanges}
                    onChange={event => saveManagementPolicy({ requireApprovalForExpensiveChanges: event.target.checked })} />
                  <span><b>ASK BEFORE A BIG UPGRADE</b><em>Pause when added commitment reaches {money(managementPolicy.approvalThreshold)}.</em></span>
                </label>
              </div>

              <button className={css.draftbutton} onClick={draftAssistedPlan}>
                DRAFT MY NETWORK <span>→</span>
              </button>

              {assistedPlan && (
                <div className={css.planreview}>
                  <div className={css.planreviewtop}>
                    <div>
                      <span>YOUR TEAM&rsquo;S DRAFT</span>
                      <b>{assistedPlan.selection.placements.length} network {assistedPlan.selection.placements.length === 1 ? 'city' : 'cities'} · {assistedPlan.selection.placements.reduce((sum, placement) => sum + placement.racks, 0)} racks</b>
                    </div>
                    <em>{assistedPlan.requiresApproval ? 'APPROVAL NEEDED' : 'WITHIN RULES'}</em>
                  </div>
                  <div className={css.planfacts}>
                    <span><b>{money(assistedPlan.networkBudget)}</b>network + reserve</span>
                    <span><b>{money(assistedPlan.addedCommitment)}</b>added commitment</span>
                  </div>
                  <div className={css.planwhy}>
                    {assistedPlan.reasons.map(reason => <span key={reason}>✓ {reason}</span>)}
                    {assistedPlan.warnings.map(warning => <span className={css.warn} key={warning}>! {warning}</span>)}
                  </div>
                  <button className={css.applyplan} onClick={applyAssistedPlan}>
                    {assistedPlan.requiresApproval ? 'APPROVE & APPLY DRAFT' : 'APPLY THIS DRAFT'} →
                  </button>
                </div>
              )}
            </div>
          )}
        </section>


        {d.halls.length > 0 && <section className={cx(css.bsec, css.utilitysection)} data-build-stage="PLANS">
          <div className={css.bhead}>
            <h2>Physical infrastructure</h2>
            <span>{managementPolicy.mode === 'ASSISTED' ? 'team-monitored · you approve' : 'live engineering envelope'}</span>
          </div>

          {/* One line, and only when it is not the boring answer. The eight-cell
              metric grid that used to live here said the same thing in seven
              numbers nobody read. */}
          <div className={cx(css.envelope, constrainedHalls.length ? css.strained : '')}>
            <span>PHYSICAL LIMITS</span>
            <b>{constrainedHalls.length
              ? `${constrainedHalls.length} of ${d.halls.length} room${d.halls.length === 1 ? '' : 's'} cannot run every rack you have drawn.`
              : 'Every room can run every rack you have drawn.'}</b>
            <em>{physicalFloor}% usable at the tightest site · {backupCoverage}% of load on backup power</em>
          </div>

          {/* The rooms themselves. Detail belongs to the thing it describes. */}
          <div className={css.physRooms}>
            {d.halls.map(hall => (
              <StreamingFacilityRoom
                key={hall.facilityId}
                hall={hall}
                builtRacks={builtOf(hall.facilityId, hall.city.id)}
                assisted={managementPolicy.mode === 'ASSISTED'}
                approvalThreshold={managementPolicy.requireApprovalForExpensiveChanges
                  ? managementPolicy.approvalThreshold
                  : null}
                onRepair={action => repairFacility(hall.facilityId, action)}
                onLease={() => setMarketplaceCityId(hall.city.id)} />
            ))}
          </div>

          {/* What the estate costs to keep running, kept out of the rooms
              because it is one number about all of them, not about any one. */}
          <div className={css.estate}>
            <span className={css.fact}><small>RUNNING COST</small><b>{money(physicalWeekly)}</b><em>per week</em></span>
            <span className={css.fact}><small>ENERGY / WEEK</small><b>{Math.round(d.energyKwhWeekly / 1000)}k</b><em>kWh</em></span>
            <span className={css.fact}><small>WATER / WEEK</small><b>{Math.round(d.waterLitresWeekly / 1000)}k</b><em>litres</em></span>
            <span className={css.fact}><small>REPUTATION</small><b>{d.publicReputation}</b><em>of 100</em></span>
          </div>

          <button type="button" className={css.estateMove}
            disabled={d.halls.length < 2}
            onClick={() => {
              saveManagementPolicy({ mode: 'HANDS_ON' });
              setPlanFeedback('Hands-On opened for rack movement. Choose Manage on a workload group, then select its destination facility.');
            }}>
            <b>MOVE RACK GROUP</b>
            <span>{d.halls.length < 2 ? 'Needs a second facility' : 'Rebalance into existing headroom'}</span>
          </button>
        </section>}


        {/* ── coverage: a simple answer first, engineering detail on demand ── */}
        <section className={css.bsec} data-build-stage="TEST">
          <div className={css.bhead}>
            <h2>Viewer experience</h2>
            <span>launch market · {d.racks} rack{d.racks === 1 ? '' : 's'}</span>
          </div>
          <div className={css.signalread}>
            <span>WHAT VIEWERS WILL FEEL</span>
            <b>{d.plainSummary}</b>
          </div>
          <div className={css.signalgrid}>
            <div><span>STARTUP</span><b>{d.averageLatency === null ? '—' : d.averageLatency < 70 ? 'FAST' : d.averageLatency < 125 ? 'OKAY' : 'SLOW'}</b><em>{d.averageLatency === null ? 'No network' : `${d.averageLatency}ms average`}</em></div>
            <div><span>BUFFERING</span><b>{d.bufferingRisk <= 5 ? 'LOW' : d.bufferingRisk <= 13 ? 'WATCH' : 'HIGH'}</b><em>{d.bufferingRisk}% risk</em></div>
            <div><span>VIDEO READY</span><b>{d.averageCacheHit}%</b><em>on the serving node</em></div>
            <div><span>OUTAGE SAFETY</span><b>{d.resilienceLabel}</b><em>{d.uniqueCityCount} network cit{d.uniqueCityCount === 1 ? 'y' : 'ies'}</em></div>
          </div>
          {d.countryService.length ? (
            <div className={css.countryforecast}>
              <div className={css.forecasthead}>
                <span>COUNTRY SERVICE FORECAST</span>
                <em>swipe →</em>
              </div>
              <div className={css.forecasttrack}>
                {d.countryService.map(row => (
                  <article className={cx(css.forecastcard, css[row.quality.toLowerCase()] || '')} key={row.marketId}>
                    <div className={css.forecasttitle}>
                      <div><b>{row.country}</b><span>{row.cityLabel} · {row.role ? ROLE_RULES[row.role].short : 'NO NODE'}</span></div>
                      <em>{row.quality}</em>
                    </div>
                    <div className={css.forecastnumbers}>
                      <span><b>{row.latency === null ? '—' : `${row.latency}ms`}</b>startup</span>
                      <span><b>{row.bufferRisk}%</b>buffer risk</span>
                      <span><b>{conc(row.demand)}</b>peak</span>
                    </div>
                    <p>{row.localizationNote}</p>
                    {(row.quality === 'POOR' || row.quality === 'UNSTABLE' || row.loadPct > 88) ? (
                      <button onClick={() => repairCountry(row)}>{row.repairLabel} →</button>
                    ) : <i className={css.forecastclear}>READY FOR OPENING NIGHT</i>}
                  </article>
                ))}
              </div>
            </div>
          ) : null}
          <button className={css.detailtoggle} onClick={() => setShowNetworkDetail(value => !value)}
            aria-expanded={showNetworkDetail}>
            {showNetworkDetail ? 'HIDE ENGINEERING DETAIL' : 'SHOW WHY'} <span>{showNetworkDetail ? '−' : '+'}</span>
          </button>
          {showNetworkDetail && <div className={css.cov}>
            {d.coverage.map(row => (
              <div className={cx(css.covrow, (row.quality === 'POOR' ? css.dark : ''))} key={row.region}>
                <div className={css.covid}>
                  <b>{row.label}</b>
                  <span>{row.isLaunchMarket ? 'Launch market' : 'Future reach'} · {people(row.viewers)} viewers · {row.cacheHit}% cached</span>
                </div>
                <div className={css.covserve}>
                  <span>{row.cityLabel}</span>
                  {row.latency === null
                    ? <em className={css.bad}>NO NETWORK</em>
                    : <em className={css[row.quality.toLowerCase()] ?? ''}>{row.quality} · {row.latency}ms</em>}
                </div>
              </div>
            ))}
          </div>}
          {d.unserved.length > 0 && (
            <div className={css.covwarn}>
              {d.unserved.map(r => regionOf(r).label).join(' and ')} {d.unserved.length === 1 ? 'has' : 'have'} no
              delivery path yet. Add one core origin to begin serving viewers.
            </div>
          )}
        </section>


        {/* ── leased facilities: Y through rooms, X through racks ── */}
        {managementPolicy.mode === 'HANDS_ON' && <section className={css.bsec} data-build-stage="SITES">
          <div className={css.bhead}>
            <h2>Your facilities</h2>
            <button className={css.addcity} onClick={() => setPicking(true)}>+ ADD FACILITY</button>
          </div>

          {d.halls.length === 0 ? (
            <div className={css.nohalls}>
              No leased space yet. Pick a starting blueprint, or enter a city marketplace.
            </div>
          ) : (
            <div className={css.halls}>
              {d.halls.map(h => (
                <Hall key={h.facilityId} h={h}
                  canAdd={h.racks < h.capacityRacks}
                  builtRacks={Math.min(h.racks, builtOf(h.facilityId, h.city.id))}
                  /* you cannot un-build a rack that is already standing */
                  onSet={n => setRacks(h.facilityId, Math.max(builtOf(h.facilityId, h.city.id), n))}
                  onInstallGroup={duty => installRackGroup(h.facilityId, duty)}
                  onDuty={(groupId, duty) => changeRackGroupDuty(h.facilityId, groupId, duty)}
                  onResizeGroup={(groupId, delta) => resizeRackGroup(h.facilityId, groupId, delta)}
                  onMoveGroup={(groupId, targetFacilityId) => moveRackGroup(h.facilityId, groupId, targetFacilityId)}
                  onRepair={action => repairFacility(h.facilityId, action)}
                  moveTargets={d.halls.filter(target => target.facilityId !== h.facilityId).map(target => ({
                    id: target.facilityId,
                    label: `${target.city.label} · ${target.campusLabel}`,
                    freeRacks: target.freeRacks,
                  }))}
                  onSpace={() => setMarketplaceCityId(h.city.id)} />
              ))}
            </div>
          )}
        </section>}

        {/* ── how you get paid — the other half of the same trap as the
               campaign, since a free door fills the halls for nothing ── */}
        {pricing && (
          <section className={css.bsec} data-build-stage="MONEY">
            <div className={css.bhead}><h2>How you get paid</h2></div>
            <button className={cx(css.payrow, (pricing.sellable === 0 ? css.empty : ''))} onClick={onOpenPricing}>
              <div className={css.payid}>
                <b>{pricing.label}</b>
                <span>{pricing.sellable
                  ? `${pricing.sellable} plan${pricing.sellable === 1 ? '' : 's'} on sale`
                  : 'Nothing on sale'}</span>
              </div>
              <div className={css.paynums}>
                <em>{pricing.arpu}</em>
                <span>ARPU · reach {pricing.reach}</span>
              </div>
              <i className={css.chev}>›</i>
            </button>
            {pricing.problems > 0 && (
              <div className={css.paywarn}>
                {pricing.problems} thing{pricing.problems === 1 ? '' : 's'} wrong with your pricing.
              </div>
            )}
          </section>
        )}

        {/* ── architecture ── */}
        {managementPolicy.mode === 'HANDS_ON' && <section className={css.bsec} data-build-stage="PLANS">
          <div className={css.bhead}><h2>Rent it or own it</h2></div>
          <div className={css.trio}>
            {ARCHS.map(a => (
              <button key={a.id} className={cx(css.tri, (sel.arch === a.id ? css.on : ''))} onClick={() => set('arch', a.id)}>
                <b>{a.name}</b>
                <span>{a.line}</span>
                <div className={css.trifoot}>
                  <em>{a.burst > 0 ? `+${Math.round(a.burst * 100)}% burst` : 'hard ceiling'}</em>
                </div>
              </button>
            ))}
          </div>
        </section>}

        {/* ── doctrine ── */}
        {managementPolicy.mode === 'HANDS_ON' && <section className={css.bsec} data-build-stage="PLANS">
          <div className={css.bhead}><h2>How carefully</h2></div>
          <div className={css.trio}>
            {DOCTRINES.map(x => (
              <button key={x.id} className={cx(css.tri, (sel.doctrine === x.id ? css.on : ''), (x.id === 'RUSHED' ? css.risky : ''))}
                onClick={() => set('doctrine', x.id)}>
                <b>{x.name}</b>
                <span>{x.line}</span>
                <div className={css.trifoot}><em>{x.debt > 0 ? `+${x.debt} debt` : 'no debt'}</em></div>
              </button>
            ))}
          </div>
        </section>}

        {/* ── campaign — the choice that fights the servers ── */}
        <section className={css.bsec} data-build-stage="MONEY">
          <div className={css.bhead}><h2>Who knows you exist</h2></div>
          {CAMPAIGNS.map(x => (
            <button key={x.id} className={cx(css.opt, (sel.campaign === x.id ? css.on : ''))} onClick={() => set('campaign', x.id)}>
              <i className={css.tick} />
              <div className={css.optid}>
                <b>{x.name}</b>
                <span>{x.line}</span>
              </div>
              <div className={css.optnums}>
                <em>{x.cost ? money(x.cost) : 'free'}</em>
                <span>×{x.demandMul.toFixed(2)} turnout</span>
              </div>
            </button>
          ))}
          {sel.campaign !== 'NONE' && d.racks > 0 && (
            <div className={css.tension}>
              A campaign is capacity spent in reverse. {campOf(sel.campaign).name} brings
              {' '}{conc(d.demandTotal('LIKELY'))} people at a {conc(d.ceiling)} ceiling.
            </div>
          )}
        </section>

        {last && (
          <section className={css.bsec} data-build-stage="TEST">
            <div className={cx(css.carry, css[last.verdict.toLowerCase()])}>
              <b>LAST REHEARSAL · {last.verdict === 'HELD' ? 'HELD' : last.verdict === 'BURST' ? 'HELD BY RENTING' : 'BROKE'}</b>
              <span>Peak {conc(last.peakConcurrentStreams)} · {last.peakLoadPercent}% of capacity
                {last.verdict === 'BROKE'
                  ? ` · ${last.countries.filter(x => x.verdict === 'BROKE').map(x => x.country).join(', ')} failed`
                  : ''}</span>
            </div>
          </section>
        )}

        {!isBuilt && (
          <section className={cx(css.bsec, css.launchstage)} data-build-stage="LAUNCH">
            <div className={cx(css.launchhero, ready ? css.ready : css.blocked)}>
              <span>{ready ? 'OPENING CONTRACT READY' : 'THE SIGNATURE IS WAITING'}</span>
              <b>{ready
                ? last?.verdict === 'BROKE' ? 'You can build — with a founder override.' : 'Every launch gate has an answer.'
                : 'Finish the red gates before steel moves.'}</b>
              <p>Commissioning is the moment the drawing becomes a paid, persistent network.</p>
            </div>
            <div className={css.launchchecks} aria-label="Build launch readiness">
              <div data-state={d.racks > 0 ? 'clear' : 'blocked'}><i>{d.racks > 0 ? '✓' : '!'}</i><span><b>NETWORK</b><em>{d.racks > 0 ? `${d.racks} racks · ${d.uniqueCityCount} cities` : 'No servers placed'}</em></span></div>
              <div data-state={!d.over ? 'clear' : 'blocked'}><i>{!d.over ? '✓' : '!'}</i><span><b>MONEY</b><em>{d.over ? `${money(-d.remaining)} short` : `${money(d.remaining)} headroom`}</em></span></div>
              <div data-state={!pricing || pricing.sellable > 0 ? 'clear' : 'blocked'}><i>{!pricing || pricing.sellable > 0 ? '✓' : '!'}</i><span><b>PLANS</b><em>{!pricing ? 'Pricing handled elsewhere' : pricing.sellable > 0 ? `${pricing.sellable} on sale` : 'Nothing on sale'}</em></span></div>
              <div data-state={last ? last.verdict === 'BROKE' ? 'warning' : 'clear' : 'blocked'}><i>{last ? last.verdict === 'BROKE' ? '!' : '✓' : '!'}</i><span><b>REHEARSAL</b><em>{last ? last.verdict === 'BROKE' ? 'Broke · override available' : last.verdict : 'Not run yet'}</em></span></div>
            </div>
          </section>
        )}

        <div className={css.bldspace} />
      </div>

      <div className={css.bldfoot}>
        {isBuilt ? (
          <>
            <button className={css.rehbtn} onClick={() => setRehearse(true)} disabled={d.over || d.racks === 0}>
              <i className={css.rbdot} />
              {last ? 'REHEARSE AGAIN' : 'REHEARSE LOAD'}
            </button>
            {planned > 0
              ? <button className={css.gobtn} onClick={() => setCommissioning(true)}>BUILD THE PLAN →</button>
              /* commissioned but never opened — the only thing left to do is the
                 night, and without this the player would be stranded here */
              : !isLive
                ? <button className={css.gobtn} onClick={onOpenNight}>GO TO OPENING NIGHT →</button>
                : <button className={css.gobtn} onClick={onBack}>BACK TO HQ →</button>}
          </>
        ) : activeStage === 'SITES' ? (
          <button className={cx(css.gobtn, d.racks === 0 ? css.off : '')} disabled={d.racks === 0}
            onClick={() => goToStage('PLANS')}>LOCK SITES &amp; PLAN →</button>
        ) : activeStage === 'PLANS' ? (
          <button className={css.gobtn} onClick={() => goToStage('MONEY')}>REVIEW THE MONEY →</button>
        ) : activeStage === 'MONEY' ? (
          <button className={cx(css.gobtn, d.over && !onRaise ? css.off : '', d.over ? css.anyway : '')}
            disabled={d.over && !onRaise}
            onClick={() => d.over ? onRaise?.() : goToStage('TEST')}>
            {d.over ? `FUND ${money(-d.remaining)} SHORTFALL →` : 'TEST THE NETWORK →'}
          </button>
        ) : activeStage === 'TEST' ? (
          <>
            {last && <button className={css.rehbtn} onClick={() => setRehearse(true)} disabled={d.over || d.racks === 0}>
              <i className={css.rbdot} /> REHEARSE AGAIN
            </button>}
            <button className={cx(css.gobtn, d.over || d.racks === 0 ? css.off : '')}
              disabled={d.over || d.racks === 0}
              onClick={() => last ? goToStage('LAUNCH') : setRehearse(true)}>
              {last ? 'REVIEW LAUNCH →' : 'RUN THE REHEARSAL →'}
            </button>
          </>
        ) : (
          <button className={cx(css.gobtn, ready ? '' : css.off, last?.verdict === 'BROKE' ? css.anyway : '')}
            disabled={!ready}
            onClick={beginCommissioning}>
            {d.racks === 0 ? 'NO SERVERS'
              : pricing && pricing.sellable === 0 ? 'NOTHING ON SALE'
                : d.over ? 'OVER BUDGET'
                  : !last ? 'REHEARSE FIRST'
                    : last.verdict === 'BROKE' ? 'BUILD IT ANYWAY →'
                      : 'COMMISSION THE BUILD →'}
          </button>
        )}
      </div>

      {picking && (
        <CityPicker sel={sel} inp={inputs} d={d}
          onCity={openCityMarketplace}
          onClose={() => setPicking(false)} />
      )}

      {marketplaceCityId && (
        <FacilityMarketplace
          cityId={marketplaceCityId}
          onLease={leaseFacility}
          onClose={() => setMarketplaceCityId(null)} />
      )}

      {rehearse && (
        <Rehearsal brand={brand} d={d} inp={inputs} sel={sel}
          onClose={() => setRehearse(false)} onResult={r => onResult?.(r)}
          onOpenContent={onOpenContent}
          onRepair={(next, message) => {
            commit(next);
            setRehearse(false);
            setPlanFeedback(message);
          }} />
      )}

      {commissioning && (
        <Commissioning brand={brand} d={d} inp={inputs} sel={sel}
          doneLabel={commitResult?.next === 'BACK' ? 'RETURN TO HQ →' : 'TO OPENING NIGHT →'}
          onDone={() => {
            setCommissioning(false);
            if (commitResult?.next === 'BACK') onBack();
            else onLaunch?.();
          }} />
      )}
    </div>
  );
};

/* ============================================================
   STYLES
   ============================================================ */
/* Styles now live in presentation/screens/Buildout/Buildout.module.css */
