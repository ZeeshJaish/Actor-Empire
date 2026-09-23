import {
    createInitialOwnedStreamingPlatformState,
    type OwnedStreamingRegionNetworkPlan,
} from '../types';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { normalizeStreamingRegionPlans } from '../services/streamingCanonicalState';

const assert: (condition: unknown, message: string) => void = (condition, message) => {
    if (!condition) throw new Error(message);
};

const clone = <T,>(value: T): T => structuredClone(value);

const explicitPlans: unknown[] = [
    {
        regionId: 'ASIA',
        serverCounts: { SCOUT: 3, WORKHORSE: 2, TITAN: 1 },
        cloudProvider: 'MERIDIAN',
        cloudCompute: 9.8,
    },
    {
        regionId: 'NORTH_AMERICA',
        serverCounts: { SCOUT: 2, WORKHORSE: 1, TITAN: 0 },
        cloudProvider: 'ATLAS',
        cloudCompute: 4,
    },
    {
        regionId: 'NORTH_AMERICA',
        serverCounts: { SCOUT: 1, WORKHORSE: 4, TITAN: 1 },
        cloudProvider: 'NORTHWIND',
        cloudCompute: 3,
    },
    {
        regionId: 'EUROPE',
        serverCounts: { SCOUT: 0, WORKHORSE: 5, TITAN: 2 },
        cloudProvider: 'NORTHWIND',
        cloudCompute: 6,
    },
    {
        regionId: 'MOON',
        serverCounts: { SCOUT: 999, WORKHORSE: 999, TITAN: 999 },
        cloudProvider: 'ATLAS',
        cloudCompute: 999,
    },
];

const normalizedPlans = normalizeStreamingRegionPlans(explicitPlans);
assert(
    normalizedPlans.map(plan => plan.regionId).join(',') === 'NORTH_AMERICA,EUROPE,ASIA',
    'Region plans must reject unknown regions and follow the canonical world-map order.',
);
assert(
    normalizedPlans[0]?.serverCounts.SCOUT === 3
        && normalizedPlans[0]?.serverCounts.WORKHORSE === 5
        && normalizedPlans[0]?.serverCounts.TITAN === 1,
    'Duplicate region rows must merge every server tier without losing intent.',
);
assert(normalizedPlans[0]?.cloudProvider === 'ATLAS', 'The first valid provider must win duplicate-row normalization deterministically.');
assert(normalizedPlans[0]?.cloudCompute === 7, 'Duplicate region rows must merge cloud compute.');
assert(normalizedPlans[2]?.cloudProvider === 'MERIDIAN', 'Every valid cloud provider must survive normalization.');
assert(normalizedPlans[2]?.cloudCompute === 10, 'Cloud compute must normalize to a non-negative finite integer.');
assert(
    JSON.stringify(normalizeStreamingRegionPlans(normalizedPlans)) === JSON.stringify(normalizedPlans),
    'Direct regional-plan normalization must be idempotent.',
);

const legacy = clone(createInitialOwnedStreamingPlatformState('regional-plan-migration')) as any;
legacy.treasuryCash = 123_456_789;
legacy.infrastructureSetupDraft = {
    currentStep: 2,
    strategy: 'HYBRID',
    capacityPackageId: 'GROWTH',
    rolloutPace: 'STANDARD',
    subscriptionPrices: { BASIC: 7.99, PREMIUM: 12.99, FAMILY: 17.99 },
    networkPlacements: [
        { cityId: 'LA', racks: 3, role: 'CORE_ORIGIN' },
        { cityId: 'NYC', racks: 2, role: 'REGIONAL_HUB' },
        { cityId: 'TOK', racks: 4, role: 'EDGE_CACHE' },
    ],
    facilities: [
        {
            id: 'LA-CLOUD',
            cityId: 'LA',
            type: 'CLOUD_ALLOCATION',
            installedRacks: 3,
            role: 'CORE_ORIGIN',
            rackGroups: [{ id: 'LA-GROUP', name: 'Origin', rackCount: 3, duty: 'CONTENT_ORIGIN' }],
        },
        {
            id: 'NYC-CABINET',
            cityId: 'NYC',
            type: 'RENTED_CABINET',
            installedRacks: 2,
            role: 'REGIONAL_HUB',
            rackGroups: [
                { id: 'NYC-SCOUT', name: 'Scout relay', rackCount: 1, duty: 'REGIONAL_CACHE', serverTier: 'SCOUT' },
                { id: 'NYC-TITAN', name: 'Titan relay', rackCount: 1, duty: 'LIVE_EVENT', serverTier: 'TITAN' },
            ],
        },
        {
            id: 'TOK-CABINET',
            cityId: 'TOK',
            type: 'PRIVATE_CAGE',
            installedRacks: 4,
            role: 'EDGE_CACHE',
            rackGroups: [{ id: 'TOK-GROUP', name: 'Edge', rackCount: 4, duty: 'LOCAL_EDGE' }],
        },
    ],
    lastLoadTestSignature: null,
    updatedAtAbsoluteWeek: 41,
};
legacy.infrastructureSetup = {
    capacityPackageId: 'GROWTH',
    rolloutPace: 'STANDARD',
    storageCapacityHours: 50_000,
    reliabilityTarget: 99.9,
    weeklyOperatingCost: 400_000,
    staffRequired: 8,
    capitalInvested: 20_000_000,
    technicalDebt: 0,
    networkPlacements: [{ cityId: 'PAR', racks: 2, role: 'CORE_ORIGIN' }],
    facilities: [{
        id: 'PAR-CABINET',
        cityId: 'PAR',
        type: 'RENTED_CABINET',
        installedRacks: 2,
        role: 'CORE_ORIGIN',
        rackGroups: [{ id: 'PAR-GROUP', name: 'Origin', rackCount: 2, duty: 'CONTENT_ORIGIN', serverTier: 'TITAN' }],
    }],
    regionPlans: explicitPlans,
    readyAtAbsoluteWeek: 56,
    revision: 2,
    committedAtAbsoluteWeek: 41,
    loadTest: {
        configurationSignature: 'regional-plan-test',
        forecastLowConcurrentStreams: 1,
        forecastLikelyConcurrentStreams: 2,
        forecastHighConcurrentStreams: 3,
        testedBurstCapacity: 4,
        headroomPercent: 50,
        status: 'PASS',
        driverKeys: [],
        completedAtAbsoluteWeek: 41,
    },
};

const beforeTreasury = legacy.treasuryCash;
const beforeDraftCities = legacy.infrastructureSetupDraft.facilities.map((facility: any) => facility.cityId).join(',');
const beforeCommissionedCity = legacy.infrastructureSetup.facilities[0].cityId;
const beforeReadyWeek = legacy.infrastructureSetup.readyAtAbsoluteWeek;
const normalized = normalizeOwnedStreamingPlatformState(legacy, 'regional-plan-migration');
const draft = normalized.infrastructureSetupDraft;
const commissioned = normalized.infrastructureSetup;

assert(draft?.facilities?.[0]?.rackGroups?.[0]?.serverTier === 'WORKHORSE', 'A legacy untyped rack group must migrate to Workhorse.');
assert(draft?.facilities?.[1]?.rackGroups?.[0]?.serverTier === 'SCOUT', 'Scout identity must survive save normalization.');
assert(draft?.facilities?.[1]?.rackGroups?.[1]?.serverTier === 'TITAN', 'Titan identity must survive save normalization.');
assert(draft?.regionPlans?.find(plan => plan.regionId === 'NORTH_AMERICA')?.cloudProvider === 'ATLAS', 'Legacy cloud capacity must migrate to the Standard Atlas provider.');
assert(draft?.regionPlans?.find(plan => plan.regionId === 'NORTH_AMERICA')?.cloudCompute === 3, 'Legacy cloud compute must derive from its stored compatibility racks.');
assert(commissioned?.regionPlans?.[0]?.cloudProvider === 'ATLAS', 'Commissioned provider identity must survive reload.');
assert(commissioned?.regionPlans?.[1]?.cloudProvider === 'NORTHWIND', 'Northwind provider identity must survive reload.');
assert(commissioned?.regionPlans?.[2]?.cloudProvider === 'MERIDIAN', 'All commissioned provider choices must survive reload.');
assert(normalized.treasuryCash === beforeTreasury, 'Save migration must not change treasury.');
assert(draft?.updatedAtAbsoluteWeek === 41, 'Save migration must not advance the draft calendar.');
assert(commissioned?.readyAtAbsoluteWeek === beforeReadyWeek, 'Save migration must not change construction timing.');
assert(draft?.facilities?.map(facility => facility.cityId).join(',') === beforeDraftCities, 'Save migration must not relocate draft facilities.');
assert(commissioned?.facilities?.[0]?.cityId === beforeCommissionedCity, 'Save migration must not relocate commissioned facilities.');

const normalizedAgain = normalizeOwnedStreamingPlatformState(normalized, 'regional-plan-migration');
assert(JSON.stringify(normalizedAgain) === JSON.stringify(normalized), 'Whole-platform regional-plan migration must be idempotent.');

const typedRoundTrip: OwnedStreamingRegionNetworkPlan[] = normalizedPlans;
assert(typedRoundTrip.length === 3, 'The canonical regional-plan type must remain usable by callers.');

console.log('Streaming regional plan migration audit passed.');
