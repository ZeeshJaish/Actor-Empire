import {
  buildTotals,
  facilityRacks,
  moneyPlan,
  serviceForecast,
  type BuildData,
  type BuildDraft,
  type City,
  type Facility,
  type FacilityListing,
} from './build';

export type BuildNetworkClass = 'STARTER' | 'ESSENTIAL' | 'GROWTH' | 'PREMIERE';
export type BuildBudgetSuggestionId = 'MINIMUM' | 'RECOMMENDED' | 'PREMIERE_SAFE';
export type BuildPlanningFailureCode = 'MARKETS_REQUIRED' | 'NO_ELIGIBLE_FACILITY' | 'BUDGET_TOO_LOW';

export interface BuildBudgetSuggestion {
  id: BuildBudgetSuggestionId;
  label: string;
  amount: number;
  line: string;
  racks: number;
  cities: number;
}

export interface BuildTeamProposal {
  id: string;
  inputSignature: string;
  networkClass: BuildNetworkClass;
  draft: BuildDraft;
  cityIds: string[];
  rackDistribution: number[];
  networkBudget: number;
  buildCost: number;
  reserveCost: number;
  weeklyOperatingCost: number;
  buildWeeks: number;
  likelyDemand: number;
  highDemand: number;
  steadyCapacity: number;
  burstCapacity: number;
  allocation: number;
  unusedAllocation: number;
  projectedTreasury: number;
  requiresApproval: boolean;
  reasons: string[];
  warnings: string[];
  capacityBoundary?: BuildCapacityBoundary;
}

export interface BuildCapacityBoundary {
  type: 'FOOTPRINT_CEILING';
  label: string;
  regionIds: string[];
  regionNames: string[];
  openingMarketCount: number;
  eligibleCityCount: number;
  rackCeiling: number;
  researchLockedFacilityCount: number;
  expansionRegionCount: number;
}

export interface BuildPlanningFailure {
  ok: false;
  code: BuildPlanningFailureCode;
  message: string;
  minimumBudget?: number;
  alternatives: string[];
}

export type ExactTemplateResult =
  | { ok: true; draft: BuildDraft }
  | BuildPlanningFailure;

export type BuildTeamPlanningResult =
  | { ok: true; proposal: BuildTeamProposal }
  | BuildPlanningFailure;

/** Assisted plans range across the actual unlocked facility floor. Small
 * networks are quoted rack-by-rack; large floors use progressively wider
 * steps so a global game never evaluates hundreds of near-identical layouts. */
const assistedShapes = (data: BuildData) => {
  const cities = getBuildPlannerCities(data);
  const capacityByCity = cities.map(city => availableRackCapacityFor(data, city.id));
  const physicalRackLimit = capacityByCity.reduce((sum, racks) => sum + racks, 0);
  if (physicalRackLimit < 2) return [];

  const counts = new Set<number>([2, physicalRackLimit]);
  let racks = 2;
  while (racks < physicalRackLimit) {
    counts.add(racks);
    racks = racks < 18 ? racks + 1 : Math.max(racks + 1, Math.ceil(racks * 1.16));
  }

  const largestRoom = Math.max(1, ...capacityByCity);
  return [...counts]
    .filter(count => count <= physicalRackLimit)
    .sort((a, b) => a - b)
    .map(count => {
      const roomsNeeded = Math.max(1, Math.ceil(count / largestRoom));
      const spread = Math.max(roomsNeeded, Math.ceil(count / 3));
      return {
        racks: count,
        cities: Math.min(cities.length, count, spread),
      };
    });
};

const finiteMoney = (value: number): number => Math.max(0, Math.round(Number.isFinite(value) ? value : 0));

/** The team is authorized to draw infrastructure, not to absorb the launch
 * campaign. Legacy plans may not expose the split, so total remains the safe
 * fallback for old saves and fixtures. */
const buildAllocationCost = (plan: ReturnType<typeof moneyPlan>): number => (
  finiteMoney(plan.commissionNow ?? plan.total)
);

const cityRegionId = (data: BuildData, city: City): string | null => (
  data.countries.find(country => country.id === city.countryId)?.regionId || null
);

const usableListingsFor = (data: BuildData, cityId: string): FacilityListing[] => (
  data.listings
    .filter(listing => listing.cityId === cityId && listing.availability !== 'RESEARCH')
    .sort((a, b) => (
      a.rackPositions - b.rackPositions
      || Number(a.availability === 'LIMITED') - Number(b.availability === 'LIMITED')
      || a.moveIn - b.moveIn
    ))
);

/** Select the smallest real room that can hold the requested drawing. */
const eligibleListingFor = (
  data: BuildData,
  cityId: string,
  requiredRacks = 1,
): FacilityListing | undefined => (
  usableListingsFor(data, cityId).find(listing => listing.rackPositions >= requiredRacks)
);

const availableRackCapacityFor = (data: BuildData, cityId: string): number => (
  usableListingsFor(data, cityId).reduce((largest, listing) => Math.max(largest, listing.rackPositions), 0)
);

export const getBuildPlannerCities = (data: BuildData): City[] => {
  const openingCountryIds = new Set(
    data.countries.filter(country => country.opening).map(country => country.id),
  );
  const openingRegionIds = new Set(
    data.countries.filter(country => country.opening).map(country => country.regionId),
  );
  const insideLaunch = data.cities.filter(city => (
    openingCountryIds.has(city.countryId)
    || Boolean(cityRegionId(data, city) && openingRegionIds.has(cityRegionId(data, city)!))
  ));
  const regionalAnchors = [...openingRegionIds].flatMap(regionId => {
    const inRegion = insideLaunch.filter(city => cityRegionId(data, city) === regionId);
    return inRegion.find(city => city.recommended && openingCountryIds.has(city.countryId))
      || inRegion.find(city => openingCountryIds.has(city.countryId))
      || inRegion.find(city => city.recommended)
      || inRegion[0]
      || [];
  });
  const preferred = data.team.preferredCityIds.flatMap(id => insideLaunch.find(city => city.id === id) || []);
  const ordered = [
    ...regionalAnchors,
    ...preferred,
    ...insideLaunch.filter(city => city.recommended),
    ...insideLaunch.filter(city => openingCountryIds.has(city.countryId)),
    ...insideLaunch,
  ];
  const seen = new Set<string>();
  return ordered.filter(city => {
    if (seen.has(city.id) || !eligibleListingFor(data, city.id)) return false;
    seen.add(city.id);
    return true;
  });
};

const facilityFor = (
  listing: FacilityListing,
  racks: number,
  index: number,
): Facility => {
  const duty = index <= 1 ? 'ORIGIN' : index === 2 ? 'REGIONAL' : 'EDGE';
  const capacityPerRack = duty === 'ORIGIN' ? 140_000 : duty === 'REGIONAL' ? 130_000 : 120_000;
  return {
    id: `team-${listing.id}-${index + 1}`,
    listingId: listing.id,
    cityId: listing.cityId,
    built: false,
    groups: [{
      id: `team-${listing.id}-${duty.toLowerCase()}`,
      name: duty === 'ORIGIN' ? (index === 0 ? 'Main library' : 'Mirror library')
        : duty === 'REGIONAL' ? 'Region relay' : 'Fast cache',
      duty,
      racks,
      capacity: racks * capacityPerRack,
    }],
    power: { used: racks * 12, contracted: Math.max(racks * 14, listing.rackPositions * 12) },
    cooling: { used: racks * 11, available: Math.max(racks * 13, listing.rackPositions * 11) },
    bandwidth: { used: racks * 40, available: Math.max(racks * 48, listing.rackPositions * 45) },
    condition: 0.92,
    uptime: listing.uptime,
    backup: listing.security === 'Vault' ? 'Diesel + flywheel' : 'Diesel',
    backupCoverage: listing.security === 'Vault' ? 1 : 0.7,
    energyPerWeek: racks * 14,
    waterPerWeek: racks * 26,
    opCost: listing.weeklyRent * 0.55,
    sustainability: listing.fibre === 'Carrier hotel' ? 72 : 66,
    reputation: listing.security === 'Vault' ? 78 : 70,
  };
};

export const rackDistribution = (racks: number, cities: number): number[] => {
  const safeCities = Math.max(1, Math.min(Math.round(cities), Math.round(racks)));
  const base = Math.floor(Math.max(1, Math.round(racks)) / safeCities);
  const remainder = Math.max(1, Math.round(racks)) % safeCities;
  return Array.from({ length: safeCities }, (_, index) => base + (index < remainder ? 1 : 0));
};

const templateFailure = (message: string): BuildPlanningFailure => ({
  ok: false,
  code: 'NO_ELIGIBLE_FACILITY',
  message,
  alternatives: ['Choose fewer cities', 'Research another facility', 'Select another opening market'],
});

export const createExactTemplateDraft = (
  data: BuildData,
  draft: BuildDraft,
  racks: number,
  cityCount: number,
): ExactTemplateResult => {
  if (data.hasExplicitOpeningMarkets === false || data.markets.length === 0) {
    return {
      ok: false,
      code: 'MARKETS_REQUIRED',
      message: 'Opening markets have not been chosen. Your team cannot size viewer demand.',
      alternatives: ['Choose opening markets'],
    };
  }
  const distribution = rackDistribution(racks, cityCount);
  const candidates = getBuildPlannerCities(data);
  const used = new Set<string>();
  const cities = distribution.flatMap(requiredRacks => {
    const city = candidates.find(candidate => (
      !used.has(candidate.id)
      && availableRackCapacityFor(data, candidate.id) >= requiredRacks
    ));
    if (!city) return [];
    used.add(city.id);
    return [city];
  });
  if (cities.length < cityCount) {
    return templateFailure(`${cityCount} eligible rooms with enough rack space are required, but only ${cities.length} can hold this layout inside the opening footprint.`);
  }
  const facilities = cities.flatMap((city, index) => {
    const listing = eligibleListingFor(data, city.id, distribution[index]);
    if (!listing || listing.rackPositions < distribution[index]) return [];
    return [facilityFor(listing, distribution[index], index)];
  });
  if (facilities.length < cityCount) return templateFailure('One or more selected facilities cannot hold the exact rack allocation.');
  return {
    ok: true,
    draft: {
      ...draft,
      facilities,
      rehearsal: null,
      teamPlanApproved: false,
    },
  };
};

export const openingNightDemand = (data: BuildData, services: ReturnType<typeof serviceForecast>) => {
  const likely = Math.max(0, finiteMoney(data.openingDemand?.likely ?? services.reduce((sum, service) => sum + service.peak, 0)));
  const high = Math.max(likely, finiteMoney(data.openingDemand?.high ?? likely * 1.55));
  return { likely, high };
};

const demandFor = (data: BuildData, draft: BuildDraft) => {
  const services = serviceForecast(data, draft);
  return { ...openingNightDemand(data, services), services };
};

const quoteShape = (data: BuildData, draft: BuildDraft, racks: number, cities: number) => {
  const result = createExactTemplateDraft(data, draft, racks, cities);
  if (!result.ok) return null;
  const totals = buildTotals(data, result.draft);
  const money = moneyPlan(data, result.draft);
  const reserve = money.lines.filter(line => line.id === 'reserve').reduce((sum, line) => sum + line.amount, 0);
  return { result, totals, money, reserve, buildAllocationCost: buildAllocationCost(money) };
};

export const classifyBuildNetwork = (data: BuildData, draft: BuildDraft): BuildNetworkClass => {
  const totals = buildTotals(data, draft);
  const { likely, high, services } = demandFor(data, draft);
  const allRouted = services.length > 0 && services.every(service => service.state !== 'NONE');
  const allHealthy = services.length > 0 && services.every(service => !['NONE', 'POOR', 'UNSTABLE'].includes(service.state));
  const facilityCapacities = draft.facilities.map(facility => (
    facility.groups.reduce((sum, group) => sum + group.capacity, 0)
  ));
  const largestFacility = Math.max(0, ...facilityCapacities);
  if (
    totals.cities >= 3
    && allHealthy
    && high <= totals.capacity + totals.burst
    && likely <= Math.max(0, totals.capacity - largestFacility)
  ) return 'PREMIERE';
  if (
    totals.cities >= 3
    && allRouted
    && totals.capacity >= likely * 1.25
    && totals.redundancy === 'REDUNDANT'
  ) return 'GROWTH';
  if (totals.cities >= 2 && allRouted && likely <= totals.capacity + totals.burst) return 'ESSENTIAL';
  return 'STARTER';
};

const draftForInstructions = (draft: BuildDraft): BuildDraft => ({
  ...draft,
  architecture: draft.instructions.priority === 'CASH' ? 'CLOUD'
    : draft.instructions.priority === 'PREMIUM' ? 'METAL' : 'HYBRID',
  ownedShare: draft.instructions.priority === 'CASH' ? 0.15
    : draft.instructions.priority === 'PREMIUM' ? 1 : 0.6,
  doctrine: draft.instructions.risk === 'CAREFUL' ? 'HARDENED'
    : draft.instructions.risk === 'FAST' ? 'SPRINT' : 'STANDARD',
  mode: 'ASSISTED',
});

const assistedCandidateQuotes = (data: BuildData, draft: BuildDraft) => {
  const instructedDraft = draftForInstructions(draft);
  return assistedShapes(data).flatMap(shape => {
    const quote = quoteShape(data, instructedDraft, shape.racks, shape.cities);
    return quote ? [{ ...shape, ...quote }] : [];
  });
};

export const getBuildBudgetSuggestions = (data: BuildData, draft: BuildDraft): BuildBudgetSuggestion[] => {
  const allCandidates = assistedCandidateQuotes(data, draft);
  const candidates = allCandidates.filter(candidate => candidate.buildAllocationCost <= draft.instructions.maxBudget);
  if (!candidates.length) return [];
  const viable = (candidate: (typeof allCandidates)[number]) => {
    const demand = demandFor(data, candidate.result.draft);
    return demand.services.length > 0
      && demand.services.every(service => service.state !== 'NONE')
      && candidate.totals.capacity + candidate.totals.burst >= demand.likely;
  };
  const demandSafe = (candidate: (typeof allCandidates)[number]) => {
    const demand = demandFor(data, candidate.result.draft);
    const openingRegions = new Set(
      data.countries.filter(country => country.opening).map(country => country.regionId),
    ).size;
    return viable(candidate)
      && demand.services.every(service => !['NONE', 'POOR', 'UNSTABLE'].includes(service.state))
      && candidate.totals.cities >= Math.max(1, openingRegions)
      && candidate.totals.capacity >= demand.likely * 1.25;
  };
  const viableCandidates = candidates.filter(viable);
  if (!viableCandidates.length) return [];
  const minimum = viableCandidates[0];
  const idealRecommended = allCandidates.find(demandSafe);
  const recommended = idealRecommended && idealRecommended.buildAllocationCost <= draft.instructions.maxBudget
    ? idealRecommended
    : viableCandidates[viableCandidates.length - 1];
  const resilience = viableCandidates[viableCandidates.length - 1];
  const physicalCeiling = allCandidates[allCandidates.length - 1];
  const reachedPhysicalCeiling = resilience.racks === physicalCeiling.racks
    && resilience.cities === physicalCeiling.cities;
  const rows = [
    { id: 'MINIMUM' as const, label: 'Minimum viable', candidate: minimum, line: 'The least expensive valid opening network.' },
    { id: 'RECOMMENDED' as const, label: 'Recommended', candidate: recommended, line: 'Demand coverage balanced against this allocation.' },
    {
      id: 'PREMIERE_SAFE' as const,
      label: reachedPhysicalCeiling ? 'Facility ceiling' : 'Allocation ceiling',
      candidate: resilience,
      line: reachedPhysicalCeiling
        ? 'Every currently eligible rack position is in this plan.'
        : 'The strongest network this allocation can authorize.',
    },
  ];
  let floor = 0;
  return rows.map(row => {
    const amount = Math.max(floor, row.candidate.buildAllocationCost);
    floor = amount;
    return {
      id: row.id,
      label: row.label,
      amount,
      line: row.line,
      racks: row.candidate.racks,
      cities: row.candidate.cities,
    };
  });
};

/** Turn a budget-card choice into the same canonical facility drawing used by
 * the rest of the Build Wizard. The authorization remains a ceiling; selecting
 * a smaller topology never rewrites or spends the player's allocation. */
export const selectBuildBudgetSuggestion = (
  data: BuildData,
  draft: BuildDraft,
  suggestion: BuildBudgetSuggestion,
): ExactTemplateResult => {
  const instructedDraft = draftForInstructions({
    ...draft,
    mode: 'ASSISTED',
    teamPlanApproved: false,
    teamPlanClass: undefined,
  });
  const selected = createExactTemplateDraft(
    data,
    instructedDraft,
    suggestion.racks,
    suggestion.cities,
  );
  if (!selected.ok) return selected;
  return {
    ok: true,
    draft: {
      ...selected.draft,
      mode: 'ASSISTED',
      teamPlanApproved: false,
      teamPlanClass: undefined,
    },
  };
};

const planInputSignature = (data: BuildData, draft: BuildDraft): string => JSON.stringify({
  week: data.company.week,
  markets: data.markets.map(market => [market.id, market.demand]),
  demand: data.openingDemand,
  treasury: data.treasury.available,
  instructions: draft.instructions,
});

export const createBuildTeamProposal = (data: BuildData, draft: BuildDraft): BuildTeamPlanningResult => {
  if (data.hasExplicitOpeningMarkets === false || data.markets.length === 0) {
    return {
      ok: false,
      code: 'MARKETS_REQUIRED',
      message: 'Opening markets have not been chosen. Your team cannot size viewer demand.',
      alternatives: ['Choose opening markets'],
    };
  }
  const candidates = assistedCandidateQuotes(data, draft);
  if (!candidates.length) {
    return {
      ok: false,
      code: 'NO_ELIGIBLE_FACILITY',
      message: 'No eligible facility footprint can be assembled inside the selected launch regions.',
      alternatives: ['Research another facility', 'Change the opening footprint', 'Use Hands-On scouting'],
    };
  }
  const adjustedCandidates = candidates.map(candidate => {
    const adjustedDraft = draftForInstructions(candidate.result.draft);
    const totals = buildTotals(data, adjustedDraft);
    const money = moneyPlan(data, adjustedDraft);
    return { ...candidate, adjustedDraft, totals, money };
  });
  const { likely, high } = demandFor(data, draft);
  const openingRegions = new Set(
    data.countries.filter(country => country.opening).map(country => country.regionId),
  ).size;
  const credible = adjustedCandidates.filter(candidate => {
    const services = serviceForecast(data, candidate.adjustedDraft);
    const viable = services.length > 0
      && services.every(service => service.state !== 'NONE')
      && candidate.totals.capacity + candidate.totals.burst >= likely;
    if (!viable) return false;
    if (draft.instructions.priority === 'CASH') return true;
    const healthy = services.every(service => !['NONE', 'POOR', 'UNSTABLE'].includes(service.state));
    if (draft.instructions.priority === 'BALANCED') {
      return healthy
        && candidate.totals.cities >= Math.max(1, openingRegions)
        && candidate.totals.capacity >= likely * 1.25;
    }
    return healthy && candidate.totals.capacity + candidate.totals.burst >= high;
  });
  if (!credible.length) {
    return {
      ok: false,
      code: 'NO_ELIGIBLE_FACILITY',
      message: 'The unlocked facility ceiling cannot serve forecast opening demand.',
      alternatives: ['Research a larger facility', 'Reduce opening markets', 'Use Hands-On scouting'],
    };
  }
  const withinBudget = credible.filter(candidate => buildAllocationCost(candidate.money) <= draft.instructions.maxBudget);
  if (!withinBudget.length) {
    const minimumBudget = Math.min(...credible.map(candidate => buildAllocationCost(candidate.money)));
    return {
      ok: false,
      code: 'BUDGET_TOO_LOW',
      message: 'The Build allocation does not cover a credible network.',
      minimumBudget,
      alternatives: ['Raise the Build allocation', 'Reduce opening markets', 'Add platform capital'],
    };
  }
  const pool = withinBudget;
  const chosen = draft.instructions.priority === 'CASH'
    ? pool[0]
    : draft.instructions.priority === 'BALANCED'
      ? pool[0]
      : pool[pool.length - 1];
  const physicalCeiling = adjustedCandidates.at(-1)!;
  const reachedPhysicalCeiling = chosen.racks === physicalCeiling.racks
    && chosen.cities === physicalCeiling.cities;
  const openingRegionIds = [...new Set(
    data.countries.filter(country => country.opening).map(country => country.regionId),
  )].sort();
  const regionNames = openingRegionIds.map(id => data.regions.find(region => region.id === id)?.name || id);
  const eligibleCities = getBuildPlannerCities(data);
  const eligibleCityIds = new Set(eligibleCities.map(city => city.id));
  const researchLockedFacilityCount = data.listings.filter(listing => (
    eligibleCityIds.has(listing.cityId) && listing.availability === 'RESEARCH'
  )).length;
  const expansionRegionCount = data.regions.filter(region => (
    !openingRegionIds.includes(region.id)
    && data.countries.some(country => country.regionId === region.id)
    && data.cities.some(city => data.countries.some(country => (
      country.id === city.countryId && country.regionId === region.id
    )))
  )).length;
  const nextDraft = chosen.adjustedDraft;
  const totals = buildTotals(data, nextDraft);
  const money = moneyPlan(data, nextDraft);
  const networkBudget = buildAllocationCost(money);
  const { services } = demandFor(data, nextDraft);
  const reserve = money.lines.filter(line => line.id === 'reserve').reduce((sum, line) => sum + line.amount, 0);
  const inputSignature = planInputSignature(data, draft);
  const networkClass = classifyBuildNetwork(data, nextDraft);
  const cityIds = nextDraft.facilities.map(facility => facility.cityId);
  const distribution = nextDraft.facilities.map(facilityRacks);
  const warnings = [
    ...(services.some(service => service.state !== 'READY') ? ['At least one opening market remains close to a delivery limit.'] : []),
    ...(networkBudget > data.treasury.available ? ['The company needs more capital before commissioning.'] : []),
  ];
  return {
    ok: true,
    proposal: {
      id: `TEAM-${data.company.week}-${networkClass}-${cityIds.join('-')}`,
      inputSignature,
      networkClass,
      draft: nextDraft,
      cityIds,
      rackDistribution: distribution,
      networkBudget,
      buildCost: totals.buildCost,
      reserveCost: reserve,
      weeklyOperatingCost: totals.weeklyCost,
      buildWeeks: totals.weeks,
      likelyDemand: likely,
      highDemand: high,
      steadyCapacity: totals.capacity,
      burstCapacity: totals.burst,
      allocation: draft.instructions.maxBudget,
      unusedAllocation: Math.max(0, draft.instructions.maxBudget - networkBudget),
      projectedTreasury: Math.max(0, data.treasury.available - networkBudget),
      requiresApproval: draft.instructions.askAbove > 0 && networkBudget >= draft.instructions.askAbove,
      reasons: [
        `${draft.instructions.priority === 'CASH' ? 'Cash preservation' : draft.instructions.priority === 'ONLINE' ? 'Reliability' : draft.instructions.priority === 'PREMIUM' ? 'Premium ownership' : 'Balanced cost and resilience'} shaped the footprint.`,
        `${data.markets.length} opening ${data.markets.length === 1 ? 'market' : 'markets'} supplied the audience map.`,
        `${cityIds.length} eligible ${cityIds.length === 1 ? 'city was' : 'cities were'} selected inside the launch footprint.`,
      ],
      warnings,
      capacityBoundary: reachedPhysicalCeiling ? {
        type: 'FOOTPRINT_CEILING',
        label: regionNames.length === 1
          ? `${regionNames[0]} capacity ceiling`
          : 'Opening footprint capacity ceiling',
        regionIds: openingRegionIds,
        regionNames,
        openingMarketCount: data.markets.length,
        eligibleCityCount: eligibleCities.length,
        rackCeiling: physicalCeiling.racks,
        researchLockedFacilityCount,
        expansionRegionCount,
      } : undefined,
    },
  };
};
