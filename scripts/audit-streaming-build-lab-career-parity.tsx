import assert from 'node:assert/strict';
import type {
  OwnedStreamingFacility,
  OwnedStreamingRegionNetworkPlan,
  StreamingServerTier,
} from '../types';
import {
  assertCanonicalBuildData,
  type BuildDraft,
  type RackGroup,
} from '../components/studio-finance/finance/build';
import {
  buildSelectionFromDraft,
} from '../components/streaming-transplant/StreamingBuildWizardExperience';
import type { BuildSel } from '../components/streaming-transplant/StreamingBuildoutExperience';
import { createCanonicalBuildData } from '../services/streamingCanonicalBuildData';
import { applyStreamingFacilityRepair } from '../services/streamingInfrastructurePhysical';

const facility: OwnedStreamingFacility = {
  id: 'FACILITY-LA-01',
  cityId: 'LA',
  type: 'PRIVATE_SUITE',
  installedRacks: 1,
  role: 'CORE_ORIGIN',
  rackGroups: [{
    id: 'FACILITY-LA-01-TITAN-ORIGIN',
    name: 'Titan origin',
    rackCount: 1,
    duty: 'CONTENT_ORIGIN',
    serverTier: 'TITAN',
  }],
  lease: {
    listingId: 'LA:PRIVATE_SUITE:01',
    providerName: 'Pacific Exchange',
    rackPositions: 24,
    depositCost: 3_000_000,
    setupCost: 2_000_000,
    weeklyRent: 180_000,
    electricityRatePerKwh: 0.18,
    taxRatePercent: 9.5,
    reliabilityPercent: 99.98,
    securityGrade: 'FORTIFIED',
    fibreGrade: 'GLOBAL_BACKBONE',
    contractWeeks: 104,
    provisioningWeeks: 8,
    expansionRackPositions: 12,
    tenure: 'RENTED',
    startedAtAbsoluteWeek: 22,
  },
};

const base: BuildSel = {
  placements: [{ cityId: 'LA', racks: 1, role: 'CORE_ORIGIN' }],
  facilities: [facility],
  arch: 'HYBRID',
  doctrine: 'STANDARD',
  campaign: 'NONE',
};

const tieredGroup: RackGroup & { tier: StreamingServerTier } = {
  id: 'FACILITY-LA-01-TITAN-ORIGIN',
  name: 'Titan origin',
  duty: 'ORIGIN',
  racks: 1,
  capacity: 117_000,
  tier: 'TITAN',
};

const draft = {
  facilities: [{
    id: facility.id,
    listingId: facility.lease!.listingId,
    cityId: facility.cityId,
    built: false,
    groups: [tieredGroup],
    power: { used: 20, contracted: 40 },
    cooling: { used: 18, available: 40 },
    bandwidth: { used: 2_000, available: 5_000 },
    condition: 1,
    uptime: .9998,
    backup: 'N+1 generators',
    backupCoverage: 1,
    energyPerWeek: 2,
    waterPerWeek: 1,
    opCost: 180_000,
    sustainability: 80,
    reputation: 90,
  }],
  architecture: 'HYBRID',
  ownedShare: .6,
  doctrine: 'STANDARD',
  campaignId: 'none',
  mode: 'HANDS',
  instructions: {
    priority: 'BALANCED',
    maxBudget: 100_000_000,
    risk: 'NORMAL',
    preferredCityIds: ['LA'],
    askAbove: 5_000_000,
  },
  repairIds: ['FACILITY-LA-01:UPGRADE_POWER'],
  rehearsal: null,
  override: false,
} satisfies BuildDraft;

const roundTrip = buildSelectionFromDraft(draft, base, 22);
const retained = roundTrip.facilities?.[0];
assert.equal(retained?.rackGroups?.[0]?.serverTier, 'TITAN', 'Build draft conversion must preserve the selected server tier.');
assert.equal(retained?.lease?.providerName, 'Pacific Exchange', 'Build draft conversion must preserve the facility provider.');
assert.equal(retained?.lease?.tenure, 'RENTED', 'Build draft conversion must preserve the facility tenure.');
assert.equal(retained?.lease?.startedAtAbsoluteWeek, 22, 'Build draft conversion must preserve construction/contract timing.');
assert.equal(retained?.physical?.powerUpgradeCount, 1, 'Build draft conversion must retain selected repairs in canonical physical state.');
assert.equal(retained?.physical?.lastMaintenanceAbsoluteWeek, 22, 'Build draft conversion must timestamp repairs with the canonical game week.');
assert.equal(roundTrip.regionPlans?.[0]?.serverCounts.TITAN, 1, 'Build draft conversion must regenerate regional intent without losing machine tiers.');

const plans: OwnedStreamingRegionNetworkPlan[] = [
  {
    regionId: 'NORTH_AMERICA',
    serverCounts: { SCOUT: 8, WORKHORSE: 4, TITAN: 1 },
    cloudProvider: 'ATLAS',
    cloudCompute: 4,
  },
  {
    regionId: 'ASIA',
    serverCounts: { SCOUT: 4, WORKHORSE: 3, TITAN: 1 },
    cloudProvider: 'MERIDIAN',
    cloudCompute: 5,
  },
];

const shared = {
  regionPlans: plans,
  facilities: [] as OwnedStreamingFacility[],
  openingCountryIds: ['US', 'CA', 'IN', 'JP'],
  forecastConcurrentStreams: 500_000,
  absoluteWeek: 22,
  demandState: { likely: 500_000 },
  pricingState: { model: 'SUBS', plans: 3 },
};
const lab = createCanonicalBuildData({ ...shared, source: 'LAB' });
const career = createCanonicalBuildData({ ...shared, source: 'CAREER' });
const parityView = (value: ReturnType<typeof createCanonicalBuildData>) => ({
  regions: value.regionPlans,
  countries: value.coverage.countries,
  facilities: value.facilities,
  racks: value.quote.totals.racks,
  compute: value.quote.totals.compute,
  coverage: value.coverage,
  costs: value.quote,
  schedule: value.schedule,
  rehearsalSignature: value.signature,
});
assert.deepEqual(parityView(career), parityView(lab), 'Lab and career must consume one canonical Build derivation.');
assert.equal(career.quote.totals.racks, 21, 'Canonical parity must report physical racks, not cloud compute or city booleans.');
assert.equal(career.quote.totals.compute, 26.8, 'Canonical parity must retain tier-weighted and cloud compute.');
assert.equal(career.coverage.countries.length, 4, 'Canonical parity must report every opening country.');
assert.ok(career.schedule.weeks >= 4 && career.schedule.weeks <= 15, 'Canonical construction must stay inside the four-to-fifteen week rule.');
const repairedFacilities = career.facilities.map((item, index) => (
  index === 0 ? applyStreamingFacilityRepair(item, 'UPGRADE_POWER', 22).facility : item
));
const repairedCareer = createCanonicalBuildData({ ...shared, source: 'CAREER', facilities: repairedFacilities });
assert.equal(
  repairedCareer.quote.totals.dueNow - career.quote.totals.dueNow,
  1_200_000,
  'Canonical quote must charge the exact selected physical repair once.',
);
assert.throws(() => createCanonicalBuildData({
  source: 'CAREER',
  openingCountryIds: shared.openingCountryIds,
  forecastConcurrentStreams: shared.forecastConcurrentStreams,
  absoluteWeek: shared.absoluteWeek,
}), /canonical region plan or facilities/i, 'Career mode must not silently fall back to a second Build model.');
const emptyCareer = createCanonicalBuildData({ ...shared, source: 'CAREER', regionPlans: [], facilities: [], openingCountryIds: [] });
assert.deepEqual(emptyCareer.facilities, [], 'An explicit empty career drawing must stay empty before the player selects a market.');
assert.throws(
  () => assertCanonicalBuildData({ canonicalMode: 'CAREER' }),
  /canonical handlers/i,
  'A real career must throw when the canonical Build handlers are missing.',
);

console.log('Streaming Build lab/career canonical parity audit passed.');
