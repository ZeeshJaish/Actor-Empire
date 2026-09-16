import assert from 'node:assert/strict';
import type { BuildData, BuildDraft, FacilityListing } from '../components/studio-finance/finance/build';
import {
  createBuildTeamProposal,
  createExactTemplateDraft,
  getBuildBudgetSuggestions,
} from '../components/studio-finance/finance/buildPlanner';
import * as buildPlanner from '../components/studio-finance/finance/buildPlanner';
import { buildTotals, moneyPlan, serviceForecast } from '../components/studio-finance/finance/build';

const listing = (id: string, cityId: string, moveIn: number, rackPositions = 16): FacilityListing => ({
  id,
  cityId,
  provider: 'World Facilities',
  name: `${cityId} Exchange`,
  type: 'Carrier room',
  description: 'An unlocked carrier-connected room.',
  rackPositions,
  moveIn,
  weeklyRent: 40_000,
  powerPrice: '$0.11/kWh',
  localTax: '4% local',
  uptime: 0.999,
  fibre: 'Carrier hotel',
  security: 'Vault',
  provisioningWeeks: 3,
  contractMonths: 12,
  expansion: 16,
  note: 'Ready for an opening network.',
  availability: 'AVAILABLE',
});

const data: BuildData = {
  company: { name: 'Empire+', week: 40, brandHex: '#6d4aff' },
  treasury: { available: 200_000_000, committedLaunch: 18_000_000 },
  hasExplicitOpeningMarkets: true,
  markets: [
    { id: 'US', name: 'United States', code: 'US', coord: { lat: 34, lng: -118 }, demand: 260_000, catalogue: 1 },
    { id: 'GB', name: 'United Kingdom', code: 'GB', coord: { lat: 51, lng: 0 }, demand: 90_000, catalogue: 1 },
  ],
  regions: [
    { id: 'NORTH_AMERICA', name: 'North America', line: 'Large opening market.' },
    { id: 'EUROPE', name: 'Europe', line: 'Dense opening market.' },
  ],
  countries: [
    { id: 'country:US', regionId: 'NORTH_AMERICA', name: 'United States', code: 'US', shape: 'us', opening: true, note: 'Opening market.' },
    { id: 'country:GB', regionId: 'EUROPE', name: 'United Kingdom', code: 'GB', shape: 'uk', opening: true, note: 'Opening market.' },
    { id: 'country:JP', regionId: 'ASIA', name: 'Japan', code: 'JP', shape: 'jp', opening: false, note: 'Not selected.' },
  ],
  cities: [
    { id: 'LA', name: 'Los Angeles', countryId: 'country:US', country: 'United States', code: 'US', coord: { lat: 34, lng: -118 }, plot: { x: 20, y: 50 }, recommended: true, note: 'Recommended.' },
    { id: 'NYC', name: 'New York', countryId: 'country:US', country: 'United States', code: 'US', coord: { lat: 40, lng: -74 }, plot: { x: 75, y: 42 }, recommended: true, note: 'Recommended.' },
    { id: 'ATL', name: 'Atlanta', countryId: 'country:US', country: 'United States', code: 'US', coord: { lat: 33, lng: -84 }, plot: { x: 60, y: 64 }, recommended: false, note: 'Eligible resilience city.' },
    { id: 'LDN', name: 'London', countryId: 'country:GB', country: 'United Kingdom', code: 'GB', coord: { lat: 51, lng: 0 }, plot: { x: 50, y: 50 }, recommended: true, note: 'Recommended.' },
    { id: 'TOK', name: 'Tokyo', countryId: 'country:JP', country: 'Japan', code: 'JP', coord: { lat: 35, lng: 139 }, plot: { x: 50, y: 50 }, recommended: true, note: 'Outside the launch.' },
  ],
  listings: [
    listing('la-1', 'LA', 1_800_000),
    listing('nyc-1', 'NYC', 2_000_000),
    listing('atl-1', 'ATL', 1_400_000),
    listing('ldn-1', 'LDN', 2_300_000),
    listing('tok-1', 'TOK', 1_000_000),
  ],
  presets: [
    { id: 'starter', name: 'Starter Rack', racks: 2, cities: 1, line: 'One room, one city' },
    { id: 'essential', name: 'Essential Grid', racks: 4, cities: 2, line: 'Two cities, one spare' },
    { id: 'growth', name: 'Growth Network', racks: 7, cities: 3, line: 'Three cities, real spare' },
    { id: 'premiere', name: 'Premiere Network', racks: 10, cities: 4, line: 'Built for opening night' },
  ],
  campaigns: [{ id: 'none', name: 'Quiet open', cost: 0, line: 'No paid campaign.', multiplier: 1 }],
  spend: [],
  pricing: { model: 'Subscriptions', plans: 3, arpu: 13, reach: 350_000, problems: [] },
  repairs: [],
  team: {
    priority: 'BALANCED',
    maxBudget: 60_000_000,
    risk: 'NORMAL',
    preferredCityIds: [],
    askAbove: 2_000_000,
  },
  existing: [],
  commissioned: false,
};

const draft: BuildDraft = {
  facilities: [],
  architecture: 'HYBRID',
  ownedShare: 0.6,
  doctrine: 'STANDARD',
  campaignId: 'none',
  mode: 'ASSISTED',
  instructions: { ...data.team },
  repairIds: [],
  rehearsal: null,
  override: false,
  teamPlanApproved: false,
};

const growth = createExactTemplateDraft(data, draft, 7, 3);
if (!growth.ok) throw new Error('Growth allocation failed unexpectedly.');
assert.equal(growth.ok, true);
assert.deepEqual(growth.draft.facilities.map(facility => facility.groups.reduce((sum, group) => sum + group.racks, 0)), [3, 2, 2]);
assert.equal(growth.draft.facilities.reduce((sum, facility) => sum + facility.groups.reduce((rackSum, group) => rackSum + group.racks, 0), 0), 7);

const premiere = createExactTemplateDraft(data, draft, 10, 4);
if (!premiere.ok) throw new Error('Premiere allocation failed unexpectedly.');
assert.equal(premiere.ok, true);
assert.deepEqual(premiere.draft.facilities.map(facility => facility.groups.reduce((sum, group) => sum + group.racks, 0)), [3, 3, 2, 2]);
assert.ok(premiere.draft.facilities.every(facility => facility.cityId !== 'TOK'), 'Templates must never enter an unselected region.');

const suggestions = getBuildBudgetSuggestions(data, draft);
assert.deepEqual(suggestions.map(item => item.id), ['MINIMUM', 'RECOMMENDED', 'PREMIERE_SAFE']);
assert.ok(suggestions[0].amount <= suggestions[1].amount);
assert.ok(suggestions[1].amount <= suggestions[2].amount);
assert.ok(suggestions.every(item => item.amount <= draft.instructions.maxBudget));

const largeBudgetDraft: BuildDraft = {
  ...draft,
  instructions: { ...draft.instructions, maxBudget: 1_000_000_000 },
};
const largeBudgetSuggestions = getBuildBudgetSuggestions(data, largeBudgetDraft);
assert.ok(
  largeBudgetSuggestions.at(-1)!.racks > suggestions.at(-1)!.racks,
  'A materially larger allocation must unlock a materially larger resilience option.',
);
assert.ok(
  largeBudgetSuggestions.at(-1)!.cities >= suggestions.at(-1)!.cities,
  'A larger allocation must not reduce the available footprint.',
);
assert.equal(
  largeBudgetSuggestions.at(-1)!.label,
  'Facility ceiling',
  'Once money is no longer the constraint, the UI must name the physical facility ceiling.',
);

const selectBudgetSuggestion = (buildPlanner as unknown as {
  selectBuildBudgetSuggestion?: (
    currentData: BuildData,
    currentDraft: BuildDraft,
    suggestion: (typeof largeBudgetSuggestions)[number],
  ) => ReturnType<typeof createExactTemplateDraft>;
}).selectBuildBudgetSuggestion;
assert.equal(
  typeof selectBudgetSuggestion,
  'function',
  'Budget recommendation cards need a canonical selection operation.',
);
const selectedCeiling = selectBudgetSuggestion!(data, largeBudgetDraft, largeBudgetSuggestions.at(-1)!);
if (!selectedCeiling.ok) throw new Error('The facility-ceiling recommendation should be selectable.');
const selectedCeilingTotals = buildTotals(data, selectedCeiling.draft);
assert.equal(selectedCeilingTotals.racks, largeBudgetSuggestions.at(-1)!.racks);
assert.equal(selectedCeilingTotals.cities, largeBudgetSuggestions.at(-1)!.cities);
assert.equal(
  moneyPlan(data, selectedCeiling.draft).total,
  largeBudgetSuggestions.at(-1)!.amount,
  'Selecting a recommendation must apply the exact ownership and risk assumptions used to quote its card.',
);
assert.equal(selectedCeiling.draft.instructions.maxBudget, largeBudgetDraft.instructions.maxBudget);
assert.equal(selectedCeiling.draft.mode, 'ASSISTED');
assert.equal(selectedCeiling.draft.teamPlanApproved, false);

const premiumSelectionDraft: BuildDraft = {
  ...largeBudgetDraft,
  instructions: { ...largeBudgetDraft.instructions, priority: 'PREMIUM' },
};
const premiumSelectionSuggestions = getBuildBudgetSuggestions(data, premiumSelectionDraft);
const selectedPremiumCeiling = selectBudgetSuggestion!(data, premiumSelectionDraft, premiumSelectionSuggestions.at(-1)!);
if (!selectedPremiumCeiling.ok) throw new Error('The premium facility-ceiling recommendation should be selectable.');
assert.equal(
  moneyPlan(data, selectedPremiumCeiling.draft).total,
  premiumSelectionSuggestions.at(-1)!.amount,
  'Selecting a recommendation must apply the exact ownership and risk assumptions used to quote its card.',
);

const northAmericaOnlyData: BuildData = {
  ...data,
  markets: data.markets.filter(market => market.id === 'US'),
  countries: data.countries.map(country => ({
    ...country,
    opening: country.code === 'US',
  })),
};
const northAmericaCeiling = createBuildTeamProposal(northAmericaOnlyData, premiumSelectionDraft);
if (!northAmericaCeiling.ok) throw new Error('The North America ceiling proposal failed unexpectedly.');
assert.deepEqual(northAmericaCeiling.proposal.capacityBoundary, {
  type: 'FOOTPRINT_CEILING',
  label: 'North America capacity ceiling',
  regionIds: ['NORTH_AMERICA'],
  regionNames: ['North America'],
  openingMarketCount: 1,
  eligibleCityCount: 3,
  rackCeiling: 48,
  researchLockedFacilityCount: 0,
  expansionRegionCount: 1,
});
assert.ok(northAmericaCeiling.proposal.unusedAllocation > 0, 'The team must preserve budget above the selected footprint ceiling.');
assert.ok(northAmericaCeiling.proposal.networkBudget < premiumSelectionDraft.instructions.maxBudget);

const tieredListingsData: BuildData = {
  ...data,
  listings: data.cities
    .filter(city => city.id !== 'TOK')
    .flatMap(city => [
      listing(`${city.id}-cabinet`, city.id, 700_000, 2),
      listing(`${city.id}-suite`, city.id, 4_000_000, 24),
    ]),
};
const tieredLargeBudgetDraft: BuildDraft = {
  ...draft,
  instructions: { ...draft.instructions, maxBudget: 1_000_000_000 },
};
const tieredSuggestions = getBuildBudgetSuggestions(tieredListingsData, tieredLargeBudgetDraft);
assert.ok(
  tieredSuggestions.at(-1)!.racks > 8,
  'A large allocation must see larger eligible rooms instead of treating the first small listing in each city as the physical ceiling.',
);

const thirtyRackDrawing = createExactTemplateDraft(tieredListingsData, tieredLargeBudgetDraft, 30, 3);
if (!thirtyRackDrawing.ok) throw new Error('A larger eligible suite should support the requested dynamic rack drawing.');
assert.equal(thirtyRackDrawing.draft.facilities.reduce((sum, facility) => (
  sum + facility.groups.reduce((rackSum, group) => rackSum + group.racks, 0)
), 0), 30);
assert.ok(
  thirtyRackDrawing.draft.facilities.every(facility => facility.listingId.endsWith('-suite')),
  'Each city must choose the smallest real listing that can hold its assigned rack count.',
);

const demandFitBudgetDraft: BuildDraft = {
  ...draft,
  instructions: { ...draft.instructions, maxBudget: 80_000_000 },
};
const demandFitSuggestions = getBuildBudgetSuggestions(tieredListingsData, demandFitBudgetDraft);
assert.equal(
  tieredSuggestions.find(item => item.id === 'RECOMMENDED')!.racks,
  demandFitSuggestions.find(item => item.id === 'RECOMMENDED')!.racks,
  'Once the demand-safe topology is affordable, extra authorization must expand the ceiling rather than silently inflate the recommended plan.',
);
const balancedTieredProposal = createBuildTeamProposal(tieredListingsData, tieredLargeBudgetDraft);
if (!balancedTieredProposal.ok) throw new Error('The balanced tiered proposal failed unexpectedly.');
assert.equal(
  balancedTieredProposal.proposal.rackDistribution.reduce((sum, racks) => sum + racks, 0),
  tieredSuggestions.find(item => item.id === 'RECOMMENDED')!.racks,
  'A balanced team must build the demand-safe recommendation instead of spending toward an arbitrary budget percentile.',
);

const highDemandData: BuildData = {
  ...tieredListingsData,
  openingDemand: { low: 2_100_000, likely: 3_000_000, high: 4_500_000 },
};
const affordableButUndersizedDraft: BuildDraft = {
  ...draft,
  instructions: { ...draft.instructions, maxBudget: 15_000_000 },
};
assert.deepEqual(
  getBuildBudgetSuggestions(highDemandData, affordableButUndersizedDraft),
  [],
  'An affordable room must not be presented as minimum viable when it cannot serve forecast demand.',
);
const affordableButUndersizedProposal = createBuildTeamProposal(highDemandData, affordableButUndersizedDraft);
assert.equal(affordableButUndersizedProposal.ok, false);
if (affordableButUndersizedProposal.ok) throw new Error('An undersized assisted proposal must not be approved.');
assert.equal(affordableButUndersizedProposal.code, 'BUDGET_TOO_LOW');
assert.ok(
  (affordableButUndersizedProposal.minimumBudget || 0) > affordableButUndersizedDraft.instructions.maxBudget,
  'The planner must expose the actual demand-capable budget floor.',
);

const proposal = createBuildTeamProposal(data, draft);
if (!proposal.ok) throw new Error('Assisted proposal failed unexpectedly.');
assert.equal(proposal.ok, true);
assert.ok(proposal.proposal.networkBudget <= draft.instructions.maxBudget);
assert.ok(proposal.proposal.draft.facilities.every(facility => facility.cityId !== 'TOK'));

const largeBudgetProposal = createBuildTeamProposal(data, largeBudgetDraft);
if (!largeBudgetProposal.ok) throw new Error('Large assisted proposal failed unexpectedly.');
assert.equal(
  largeBudgetProposal.proposal.rackDistribution.reduce((sum, racks) => sum + racks, 0),
  largeBudgetSuggestions.find(item => item.id === 'RECOMMENDED')!.racks,
  'Balanced planning must select the demand-safe recommendation even when the allocation is much larger.',
);
assert.ok(largeBudgetProposal.proposal.networkBudget <= largeBudgetDraft.instructions.maxBudget);
assert.ok(largeBudgetProposal.proposal.unusedAllocation > 0, 'The team must expose unspent allocation instead of burning it blindly.');

const premiumDraft: BuildDraft = {
  ...largeBudgetDraft,
  instructions: { ...largeBudgetDraft.instructions, priority: 'PREMIUM' },
};
const premiumSuggestions = getBuildBudgetSuggestions(data, premiumDraft);
const premiumProposal = createBuildTeamProposal(data, premiumDraft);
if (!premiumProposal.ok) throw new Error('Premium assisted proposal failed unexpectedly.');
assert.equal(
  premiumProposal.proposal.rackDistribution.reduce((sum, racks) => sum + racks, 0),
  premiumSuggestions.at(-1)!.racks,
  'Premium planning must select the high-resilience preview topology.',
);
assert.equal(
  premiumProposal.proposal.networkBudget,
  premiumSuggestions.at(-1)!.amount,
  'The preview must include the ownership and risk instructions used by the final proposal.',
);

const noMarkets = createBuildTeamProposal({ ...data, hasExplicitOpeningMarkets: false, markets: [] }, draft);
assert.equal(noMarkets.ok, false);
if (noMarkets.ok) throw new Error('Missing markets should block assisted planning.');
assert.equal(noMarkets.code, 'MARKETS_REQUIRED');

const tooLow = createBuildTeamProposal(data, {
  ...draft,
  instructions: { ...draft.instructions, maxBudget: 500_000 },
});
assert.equal(tooLow.ok, false);
if (tooLow.ok) throw new Error('A plan below the minimum budget must fail.');
assert.equal(tooLow.code, 'BUDGET_TOO_LOW');
assert.equal(tooLow.message, 'The Build allocation does not cover a credible network.');

const marketingCeiling = 197_000_000_000;
const dataWithSeparateMarketing: BuildData = {
  ...data,
  canonical: {
    totals: currentDraft => buildTotals(data, currentDraft),
    services: currentDraft => serviceForecast(data, currentDraft),
    money: currentDraft => {
      const infrastructure = moneyPlan(data, currentDraft);
      return {
        ...infrastructure,
        lines: [
          ...infrastructure.lines,
          { id: 'campaign', label: 'Launch marketing ceiling', amount: marketingCeiling, timing: 'OPENING_NIGHT' },
        ],
        total: infrastructure.total + marketingCeiling,
        commissionNow: infrastructure.total,
        deferred: marketingCeiling,
        headroom: 0,
        shortfall: Math.max(0, infrastructure.total + marketingCeiling - data.treasury.available),
      };
    },
    signature: () => 'separate-marketing',
    rehearse: () => ({}) as never,
  },
};
const separatedSuggestions = getBuildBudgetSuggestions(dataWithSeparateMarketing, draft);
assert.ok(separatedSuggestions.length > 0, 'A marketing ceiling must not erase affordable infrastructure suggestions.');
assert.ok(separatedSuggestions.every(item => item.amount < marketingCeiling));
const separatedProposal = createBuildTeamProposal(dataWithSeparateMarketing, draft);
assert.equal(separatedProposal.ok, true, 'The team must compare Build allocation with infrastructure cost only.');
if (!separatedProposal.ok) throw new Error('Marketing-isolated proposal failed unexpectedly.');
assert.ok(separatedProposal.proposal.networkBudget <= draft.instructions.maxBudget);

console.log('Streaming assisted Build planner audit passed.');
