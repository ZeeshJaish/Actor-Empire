import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Dispatch, SetStateAction } from 'react';
import * as BuildFinanceModule from '../components/studio-finance/finance/build';
import {
  buildTotals,
  moneyPlan,
  serviceForecast,
  type BuildData,
  type BuildDraft,
  type Facility,
} from '../components/studio-finance/finance/build';
import type { BuildTeamProposal } from '../components/studio-finance/finance/buildPlanner';
import * as StageSitesModule from '../components/studio-finance/components/build/StageSites';
import { StageSites } from '../components/studio-finance/components/build/StageSites';

const facility: Facility = {
  id: 'team-la-1', listingId: 'la-1', cityId: 'LA', built: false,
  groups: [{ id: 'main', name: 'Main library', duty: 'ORIGIN', racks: 2, capacity: 280_000 }],
  power: { used: 24, contracted: 48 }, cooling: { used: 22, available: 44 }, bandwidth: { used: 80, available: 180 },
  condition: .92, uptime: .999, backup: 'Diesel', backupCoverage: .7,
  energyPerWeek: 28, waterPerWeek: 52, opCost: 22_000, sustainability: 70, reputation: 74,
};

const europeFacility: Facility = {
  ...facility,
  id: 'team-paris-1',
  listingId: 'paris-1',
  cityId: 'PARIS',
  groups: [{ id: 'europe', name: 'Europe relay', duty: 'REGIONAL', racks: 2, capacity: 220_000 }],
};

const data = {
  company: { name: 'Empire+', week: 40, brandHex: '#6d4aff' },
  treasury: { available: 200_000_000, committedLaunch: 18_000_000 },
  hasExplicitOpeningMarkets: true,
  openingDemand: { low: 120_000, likely: 180_000, high: 240_000 },
  markets: [{ id: 'US', name: 'United States', code: 'US', coord: { lat: 34, lng: -118 }, demand: 180_000, catalogue: 1 }],
  regions: [
    { id: 'NORTH_AMERICA', name: 'North America', line: 'Opening region.' },
    { id: 'EUROPE', name: 'Europe', line: 'Regional relay.' },
  ],
  countries: [
    { id: 'country:US', regionId: 'NORTH_AMERICA', name: 'United States', code: 'US', shape: 'us', opening: true, note: 'Opening market.' },
    { id: 'country:FR', regionId: 'EUROPE', name: 'France', code: 'FR', shape: 'fr', opening: false, note: 'Relay market.' },
  ],
  cities: [
    { id: 'LA', name: 'Los Angeles', countryId: 'country:US', country: 'United States', code: 'US', coord: { lat: 34, lng: -118 }, plot: { x: 20, y: 50 }, recommended: true, note: 'Opening room.' },
    { id: 'PARIS', name: 'Paris', countryId: 'country:FR', country: 'France', code: 'FR', coord: { lat: 48.86, lng: 2.35 }, plot: { x: 55, y: 45 }, recommended: true, note: 'Regional room.' },
  ],
  listings: [{
    id: 'la-1', cityId: 'LA', provider: 'World Facilities', name: 'LA Exchange', type: 'Carrier room', description: 'Opening room.',
    rackPositions: 8, moveIn: 1_800_000, weeklyRent: 40_000, powerPrice: '$0.11/kWh', localTax: '4% local', uptime: .999,
    fibre: 'Carrier hotel', security: 'Vault', provisioningWeeks: 3, contractMonths: 12, expansion: 16, note: 'Ready.', availability: 'AVAILABLE',
  }],
  presets: [{ id: 'starter', name: 'Starter Rack', racks: 2, cities: 1, line: 'One room, one city.' }],
  campaigns: [{ id: 'none', name: 'Quiet open', cost: 0, line: 'No campaign.', multiplier: 1 }], spend: [],
  pricing: { model: 'Subscriptions', plans: 3, arpu: 13, reach: 180_000, problems: [] }, repairs: [],
  team: { priority: 'BALANCED', maxBudget: 24_000_000, risk: 'NORMAL', preferredCityIds: [], askAbove: 2_000_000 },
  existing: [], commissioned: false,
} as BuildData;

const draft: BuildDraft = {
  facilities: [facility], architecture: 'HYBRID', ownedShare: .6, doctrine: 'STANDARD', campaignId: 'none', mode: 'ASSISTED',
  instructions: { ...data.team }, repairIds: [], rehearsal: null, override: false, teamPlanApproved: false,
};

const proposal: BuildTeamProposal = {
  id: 'proposal-1', inputSignature: 'fixture', networkClass: 'ESSENTIAL', draft,
  cityIds: ['LA'], rackDistribution: [2], networkBudget: 18_000_000, buildCost: 16_000_000, reserveCost: 2_000_000,
  weeklyOperatingCost: 22_000, buildWeeks: 4, likelyDemand: 180_000, highDemand: 240_000,
  steadyCapacity: 280_000, burstCapacity: 80_000, allocation: 24_000_000, unusedAllocation: 6_000_000,
  projectedTreasury: 182_000_000, requiresApproval: false, reasons: ['Opening market supplied the audience map.'], warnings: [],
  capacityBoundary: {
    type: 'FOOTPRINT_CEILING', label: 'North America capacity ceiling',
    regionIds: ['NORTH_AMERICA'], regionNames: ['North America'], openingMarketCount: 1,
    eligibleCityCount: 1, rackCeiling: 2, researchLockedFacilityCount: 1, expansionRegionCount: 1,
  },
};

const renderSites = (currentDraft: BuildDraft, teamProposal: BuildTeamProposal | null) => renderToStaticMarkup(
  <StageSites
    data={data}
    draft={currentDraft}
    patch={() => undefined}
    totals={buildTotals(data, currentDraft)}
    plan={moneyPlan(data, currentDraft)}
    services={serviceForecast(data, currentDraft)}
    handlers={{}}
    managed={Boolean(currentDraft.teamPlanApproved)}
    teamProposal={teamProposal}
    setTeamProposal={(() => undefined) as Dispatch<SetStateAction<BuildTeamProposal | null>>}
  />,
);

const awaiting = renderSites(draft, null);
assert.doesNotMatch(awaiting, /What this allocation can build/);
assert.match(awaiting, /Engineering has not drawn a network yet/);
assert.match(awaiting, /Ask the team to prepare a plan/);

const ready = renderSites(draft, proposal);
const readyText = ready.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
assert.match(ready, /Team proposal ready/);
assert.match(ready, /Approve plan/);
assert.doesNotMatch(ready, /Ask the team to prepare a plan/);
assert.match(ready, /aria-label="Engineering proposal"/);
assert.match(readyText, /Engineering proposal/);
assert.match(readyText, /2 racks/);
assert.match(readyText, /1 site/);
assert.match(readyText, /4 weeks/);
assert.match(readyText, /Operating profile/);
assert.match(readyText, /North America capacity ceiling/);
assert.match(readyText, /Every currently eligible assisted-plan rack/);
assert.match(readyText, /6M remains unallocated/);
assert.match(ready, /Expand opening markets/);
assert.match(readyText, /owned-campus option needs infrastructure research/);
assert.doesNotMatch(ready, /bw-team-proposal-grid/);

const approved = renderSites({ ...draft, teamPlanApproved: true, teamPlanClass: 'ESSENTIAL' }, null);
assert.match(approved, /Team plan approved/);
assert.doesNotMatch(approved, /Ask the team to redraft/);
assert.doesNotMatch(approved, /Ask the team to prepare a plan/);

const manual = renderSites({ ...draft, facilities: [facility, europeFacility], mode: 'HANDS', teamPlanApproved: false }, null);
assert.doesNotMatch(manual, /Quick-start network/i);
assert.doesNotMatch(manual, /Starter Rack/);
assert.doesNotMatch(manual, /class="lw-regions"/);
assert.match(manual, /United States infrastructure map/);
assert.match(manual, /data-route-count="1"/);
assert.match(manual, /aria-label="North America, launch market, infrastructure live"/);
assert.match(manual, /aria-label="Europe, infrastructure live"/);
assert.match(manual, /aria-haspopup="dialog"/);

const getBuildControlHandoffConfirmation = (StageSitesModule as unknown as {
  getBuildControlHandoffConfirmation?: (draft: BuildDraft) => null | { title: string; body: string; confirmLabel: string };
}).getBuildControlHandoffConfirmation;
assert.equal(typeof getBuildControlHandoffConfirmation, 'function', 'Changing who controls an existing Build plan must be guarded.');
assert.equal(getBuildControlHandoffConfirmation!({ ...draft, facilities: [], mode: 'HANDS' }), null);
assert.deepEqual(getBuildControlHandoffConfirmation!({ ...draft, mode: 'HANDS' }), {
  title: 'Hand this layout to the team?',
  body: 'Your current rooms stay in place until you approve a replacement. A new team proposal can replace this layout.',
  confirmLabel: 'Hand to team',
});
assert.deepEqual(getBuildControlHandoffConfirmation!({ ...draft, teamPlanApproved: true }), {
  title: 'Take control of this team plan?',
  body: 'The approved rooms stay in place and become editable. Future changes will be yours to manage.',
  confirmLabel: 'Take control',
});

const groupFacilityLeases = (BuildFinanceModule as unknown as {
  groupFacilityLeases?: (
    buildData: BuildData,
    facilities: Facility[],
  ) => Array<{ listingId: string; count: number; racks: number; weeklyRent: number; facilities: Facility[] }>;
}).groupFacilityLeases;
assert.equal(typeof groupFacilityLeases, 'function', 'Repeated room contracts must be grouped for presentation without merging their physical records.');

const repeatedFacilities = [
  facility,
  { ...facility, id: 'team-la-2', groups: [{ ...facility.groups[0], id: 'main-2', racks: 1 }] },
  { ...facility, id: 'team-la-3', groups: [{ ...facility.groups[0], id: 'main-3', racks: 1 }] },
];
const grouped = groupFacilityLeases!(data, repeatedFacilities);
assert.equal(grouped.length, 1);
assert.equal(grouped[0].listingId, 'la-1');
assert.equal(grouped[0].count, 3);
assert.equal(grouped[0].racks, 4);
assert.equal(grouped[0].weeklyRent, 120_000);
assert.deepEqual(grouped[0].facilities.map(item => item.id), ['team-la-1', 'team-la-2', 'team-la-3']);

console.log('Streaming assisted Build state UI audit passed.');
