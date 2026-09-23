import type { OwnedStreamingFacility, OwnedStreamingRegionNetworkPlan } from '../types';
import {
    deriveStreamingRegionalPlacement,
    projectStreamingCompatibilityRackDuties,
    reconstructStreamingRegionPlans,
} from '../services/streamingRegionalNetworkPlan';
import { deriveStreamingNetworkCoverage } from '../services/streamingNetworkCoverage';
import { deriveStreamingNetworkCapacity } from '../services/streamingNetworkCapacity';
import { deriveStreamingNetworkSignals } from '../services/streamingNetworkSignals';
import {
    deriveStreamingInfrastructureSignature,
    quoteStreamingNetworkPlan,
} from '../services/streamingNetworkQuote';
import { deriveStreamingConstructionSchedule } from '../services/streamingNetworkConstruction';

const assert: (condition: unknown, message: string) => void = (condition, message) => {
    if (!condition) throw new Error(message);
};

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

const input = {
    regionPlans: plans,
    openingCountryIds: ['US', 'CA', 'IN', 'JP'],
    existingFacilities: [] as OwnedStreamingFacility[],
    absoluteWeek: 22,
};
const first = deriveStreamingRegionalPlacement(input);
const second = deriveStreamingRegionalPlacement(input);
assert(JSON.stringify(first) === JSON.stringify(second), 'Regional placement must be deterministic for identical input.');
assert(first.facilities.some(facility => facility.cityId === 'NYC' || facility.cityId === 'LA' || facility.cityId === 'ASH'), 'Population-first North America placement must begin on major US ground.');
assert(first.facilities.some(facility => ['BOM', 'DEL', 'BLR', 'CHN'].includes(facility.cityId)), 'India data residency must place physical capacity inside India.');
assert(new Set(first.facilities.filter(facility => facility.cityId !== 'CLOUD').map(facility => facility.cityId)).size >= 4, 'Placement must prefer geographic breadth before stacking rooms.');
assert(
    first.facilities.every(facility => (
        !facility.rackGroups?.some(group => group.serverTier === 'TITAN')
        || (facility.lease?.rackPositions || 0) >= 8
    )),
    'Titans must never be placed in rooms smaller than eight rack positions.',
);
assert(
    projectStreamingCompatibilityRackDuties(first).every(group => group.rackCount > 0 && Boolean(group.serverTier)),
    'Every projected internal duty group must retain its visible server tier.',
);
const reconstructed = reconstructStreamingRegionPlans(first.facilities);
for (const plan of plans) {
    const roundTrip = reconstructed.find(candidate => candidate.regionId === plan.regionId);
    assert(Boolean(roundTrip), `Region ${plan.regionId} must survive placement round-trip.`);
    assert(JSON.stringify(roundTrip?.serverCounts) === JSON.stringify(plan.serverCounts), `Server counts for ${plan.regionId} must survive placement round-trip.`);
    assert(roundTrip?.cloudProvider === plan.cloudProvider && roundTrip.cloudCompute === plan.cloudCompute, `Cloud intent for ${plan.regionId} must survive placement round-trip.`);
}
const preserved = deriveStreamingRegionalPlacement({ ...input, existingFacilities: first.facilities });
assert(first.facilities.every(facility => preserved.facilities.some(candidate => candidate.id === facility.id && candidate.cityId === facility.cityId)), 'Existing facilities must never be silently relocated.');

const multiResidency = deriveStreamingRegionalPlacement({
    regionPlans: [{ regionId: 'ASIA', serverCounts: { SCOUT: 3, WORKHORSE: 2, TITAN: 1 }, cloudProvider: null, cloudCompute: 0 }],
    openingCountryIds: ['IN', 'CN', 'ID'],
    existingFacilities: [],
    absoluteWeek: 22,
});
assert(
    ['IN', 'CN', 'ID'].every(countryId => multiResidency.facilities.some(facility => (
        ['IN', 'CN', 'ID'].includes(countryId)
        && ({ IN: ['BOM', 'DEL', 'BLR', 'CHN'], CN: ['BEI', 'SHA', 'SZX', 'CTU'], ID: ['JKT', 'SUB', 'MKS', 'DPS'] } as Record<string, string[]>)[countryId]?.includes(facility.cityId)
    ))),
    'Every opening country with data-residency rules must receive in-country physical capacity when the plan has enough servers.',
);

const coverage = deriveStreamingNetworkCoverage({
    facilities: first.facilities,
    openingCountryIds: input.openingCountryIds,
    fibreState: { generation: 0, level: 0 },
});
assert(coverage.countries.length === 4, 'Coverage must report every opening market.');
assert(coverage.countries.every(country => country.reachedShare >= 0 && country.reachedShare <= 1), 'Coverage shares must be normalized.');

const nyOnly = deriveStreamingRegionalPlacement({
    regionPlans: [{ regionId: 'NORTH_AMERICA', serverCounts: { SCOUT: 0, WORKHORSE: 1, TITAN: 0 }, cloudProvider: null, cloudCompute: 0 }],
    openingCountryIds: ['US', 'IN', 'AU'],
    existingFacilities: [],
    absoluteWeek: 1,
});
const nyCoverage = deriveStreamingNetworkCoverage({ facilities: nyOnly.facilities, openingCountryIds: ['US', 'IN', 'AU'] });
assert((nyCoverage.countries.find(country => country.countryId === 'IN')?.reachedShare || 0) < 0.2, 'One North American Workhorse must not make India fully reached.');
assert((nyCoverage.countries.find(country => country.countryId === 'AU')?.reachedShare || 0) < 0.2, 'One North American Workhorse must not make Australia fully reached.');

const capacity = deriveStreamingNetworkCapacity({ facilities: first.facilities, forecastConcurrentStreams: 500_000 });
assert(capacity.steadyStreams > 0 && capacity.burstStreams >= capacity.steadyStreams, 'Capacity must expose positive steady and burst ceilings.');
assert(capacity.headroomPercent === Math.round(((capacity.steadyStreams - 500_000) / 500_000) * 100), 'Capacity headroom must be derived from the same steady ceiling.');
const signals = deriveStreamingNetworkSignals(coverage, capacity);
assert(signals.marketSignals.length === coverage.countries.length, 'Signals must derive directly from canonical country coverage.');
assert(signals.capacity.status !== 'UNKNOWN', 'Signals must name the capacity condition.');

const quote = quoteStreamingNetworkPlan({ facilities: first.facilities, regionPlans: plans });
assert(Object.isFrozen(quote) && Object.isFrozen(quote.totals), 'The quote returned to every surface must be immutable.');
assert(quote.totals.dueNow === quote.totals.capex + quote.totals.deposits + quote.totals.setup, 'Due now must equal the exact frozen upfront components.');
assert(quote.totals.racks === 21 && quote.totals.compute > 21, 'Quote must distinguish physical racks from tier-weighted compute.');
assert(quote.regions.reduce((sum, region) => sum + region.dueNow, 0) === quote.totals.dueNow, 'Regional lines must add to the whole-plan due-now amount.');

const schedule = deriveStreamingConstructionSchedule({ facilities: first.facilities, absoluteWeek: 22 });
assert(schedule.weeks >= 4 && schedule.weeks <= 15 && schedule.readyAtAbsoluteWeek === 22 + schedule.weeks, 'Construction must scale within the canonical four-to-fifteen-week range.');
const signature = deriveStreamingInfrastructureSignature({ facilities: first.facilities, regionPlans: plans, quote });
assert(signature === deriveStreamingInfrastructureSignature({ facilities: first.facilities, regionPlans: plans, quote }), 'Infrastructure signatures must be deterministic.');
const changedSignature = deriveStreamingInfrastructureSignature({ facilities: first.facilities, regionPlans: [{ ...plans[0], cloudCompute: 9 }, plans[1]], quote });
assert(signature !== changedSignature, 'Infrastructure signatures must change when cloud intent changes.');

console.log('Streaming Phase 2 placement, coverage, capacity, quote and construction audits passed.');
