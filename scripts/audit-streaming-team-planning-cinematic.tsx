import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import type { BuildData, Facility } from '../components/studio-finance/finance/build';
import type { BuildTeamProposal } from '../components/studio-finance/finance/buildPlanner';
import { TeamPlanningStage } from '../components/studio-finance/components/build/TeamPlanningCinematic';

const facility: Facility = {
  id: 'team-la-1',
  listingId: 'la-1',
  cityId: 'LA',
  built: false,
  groups: [{ id: 'main', name: 'Main library', duty: 'ORIGIN', racks: 2, capacity: 280_000 }],
  power: { used: 24, contracted: 48 },
  cooling: { used: 22, available: 44 },
  bandwidth: { used: 80, available: 180 },
  condition: 0.92,
  uptime: 0.999,
  backup: 'Diesel',
  backupCoverage: 0.7,
  energyPerWeek: 28,
  waterPerWeek: 52,
  opCost: 22_000,
  sustainability: 70,
  reputation: 74,
};

const secondFacility: Facility = {
  ...facility,
  id: 'team-nyc-1',
  listingId: 'nyc-1',
  cityId: 'NYC',
  groups: [{ id: 'relay', name: 'Region relay', duty: 'REGIONAL', racks: 1, capacity: 130_000 }],
};

const data = {
  company: { name: 'Empire+', week: 40, brandHex: '#6d4aff' },
  treasury: { available: 200_000_000, committedLaunch: 18_000_000 },
  hasExplicitOpeningMarkets: true,
  openingDemand: { low: 120_000, likely: 180_000, high: 240_000 },
  markets: [{ id: 'US', name: 'United States', code: 'US', coord: { lat: 34, lng: -118 }, demand: 180_000, catalogue: 1 }],
  regions: [{ id: 'NORTH_AMERICA', name: 'North America', line: 'Opening region.' }],
  countries: [
    { id: 'country:US', regionId: 'NORTH_AMERICA', name: 'United States', code: 'US', shape: 'us', opening: true, note: 'Opening market.' },
    { id: 'country:CA', regionId: 'NORTH_AMERICA', name: 'Canada', code: 'CA', shape: 'ca', opening: true, note: 'Opening market without a committed room.' },
  ],
  cities: [
    { id: 'LA', name: 'Los Angeles', countryId: 'country:US', country: 'United States', code: 'US', coord: { lat: 34, lng: -118 }, plot: { x: 20, y: 50 }, recommended: true, note: 'Opening room.' },
    { id: 'NYC', name: 'New York', countryId: 'country:US', country: 'United States', code: 'US', coord: { lat: 40, lng: -74 }, plot: { x: 75, y: 42 }, recommended: true, note: 'Resilience room.' },
    { id: 'TOR', name: 'Toronto', countryId: 'country:CA', country: 'Canada', code: 'CA', coord: { lat: 43.65, lng: -79.38 }, plot: { x: 68, y: 34 }, recommended: true, note: 'Not included in this proposal.' },
  ],
  listings: [{
    id: 'la-1', cityId: 'LA', provider: 'World Facilities', name: 'LA Exchange', type: 'Carrier room', description: 'Opening room.',
    rackPositions: 8, moveIn: 1_800_000, weeklyRent: 40_000, powerPrice: '$0.11/kWh', localTax: '4% local', uptime: 0.999,
    fibre: 'Carrier hotel', security: 'Vault', provisioningWeeks: 3, contractMonths: 12, expansion: 16, note: 'Ready.', availability: 'AVAILABLE',
  }, {
    id: 'nyc-1', cityId: 'NYC', provider: 'World Facilities', name: 'NYC Exchange', type: 'Carrier room', description: 'Resilience room.',
    rackPositions: 8, moveIn: 1_900_000, weeklyRent: 42_000, powerPrice: '$0.12/kWh', localTax: '4% local', uptime: 0.999,
    fibre: 'Carrier hotel', security: 'Vault', provisioningWeeks: 3, contractMonths: 12, expansion: 16, note: 'Ready.', availability: 'AVAILABLE',
  }],
  presets: [],
  campaigns: [{ id: 'none', name: 'Quiet open', cost: 0, line: 'No campaign.', multiplier: 1 }],
  spend: [],
  pricing: { model: 'Subscriptions', plans: 3, arpu: 13, reach: 180_000, problems: [] },
  repairs: [],
  team: { priority: 'BALANCED', maxBudget: 24_000_000, risk: 'NORMAL', preferredCityIds: [], askAbove: 2_000_000 },
  existing: [],
  commissioned: false,
} as BuildData;

const proposal: BuildTeamProposal = {
  id: 'proposal-1',
  inputSignature: 'fixture',
  networkClass: 'ESSENTIAL',
  draft: {
    facilities: [facility, secondFacility],
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
  },
  cityIds: ['LA', 'NYC'],
  rackDistribution: [2, 1],
  networkBudget: 18_000_000,
  buildCost: 16_000_000,
  reserveCost: 2_000_000,
  weeklyOperatingCost: 22_000,
  buildWeeks: 4,
  likelyDemand: 180_000,
  highDemand: 240_000,
  steadyCapacity: 280_000,
  burstCapacity: 80_000,
  allocation: 24_000_000,
  unusedAllocation: 6_000_000,
  projectedTreasury: 182_000_000,
  requiresApproval: false,
  reasons: [],
  warnings: [],
};

const stage = (beat: number) => renderToStaticMarkup(
  <TeamPlanningStage data={data} proposal={proposal} beat={beat} />,
);

const mapping = stage(0);
assert.match(mapping, /bw-team-cine-map/);
assert.match(mapping, /Opening demand/);
assert.match(mapping, /United States/);
assert.match(mapping, /irm-cinematic/);
assert.doesNotMatch(mapping, /Toronto/);
assert.doesNotMatch(mapping, /role="button"/);

const placement = stage(1);
assert.match(placement, /bw-team-cine-route/);
assert.match(placement, /Los Angeles/);
assert.match(placement, /Route 01/);
assert.match(placement, /region-map-location-route/);
assert.match(placement, /data-route-count="1"/);
assert.match(placement, /irm-cinematic/);
assert.doesNotMatch(placement, /role="button"/);

const racking = stage(2);
assert.match(racking, /bw-team-cine-racks/);
assert.match(racking, /2 racks/);
assert.match(racking, /Room 01 of 02/);

const allocation = stage(3);
assert.match(allocation, /bw-team-cine-allocation/);
assert.match(allocation, /Within authority/);
assert.match(allocation, /\$24M/);
assert.match(allocation, /\$18M/);

const rehearsal = stage(4);
assert.match(rehearsal, /bw-team-cine-rehearsal/);
assert.match(rehearsal, /Likely load/);
assert.match(rehearsal, /High load/);
assert.match(rehearsal, /Capacity/);

const ready = stage(5);
assert.match(ready, /bw-team-cine-blueprint/);
assert.match(ready, /Engineering sign-off/);
assert.match(ready, /3 racks/);
assert.match(ready, /2 sites/);
assert.match(ready, /\$18M/);
assert.match(ready, /4 wk/);

console.log('Streaming team-planning cinematic rendered audit passed.');
