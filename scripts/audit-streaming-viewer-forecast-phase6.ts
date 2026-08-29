import { readFileSync } from 'node:fs';
import {
    INITIAL_PLAYER,
    type OwnedStreamingLaunchRehearsalSnapshot,
    type Player,
} from '../types';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import {
    commitStreamingInfrastructureSetup,
    createDefaultStreamingInfrastructureDraft,
    getStreamingInfrastructureForecast,
    runStreamingInfrastructureLoadTest,
    saveStreamingInfrastructureDraft,
} from '../services/streamingInfrastructure';
import {
    createDefaultStreamingFoundingDraft,
    incorporateOwnedStreamingPlatform,
    saveStreamingFoundingDraft,
} from '../services/streamingFounding';
import {
    createStreamingLaunchRehearsal,
    type StreamingLaunchRehearsalResult,
    type StreamingRehearsalFacilityInput,
    type StreamingRehearsalCountryInput,
} from '../services/streamingLaunchRehearsal';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const facilities: StreamingRehearsalFacilityInput[] = [
    {
        facilityId: 'LA-CAGE', cityId: 'LA', cityLabel: 'Los Angeles', regionId: 'N_AMERICA',
        steadyCapacity: 80_000, burstCapacity: 100_000, reliabilityPercent: 99.9,
        limitingFactor: 'NONE', physicalRepairActions: [],
    },
    {
        facilityId: 'NYC-CAGE', cityId: 'NYC', cityLabel: 'New York', regionId: 'N_AMERICA',
        steadyCapacity: 30_000, burstCapacity: 35_000, reliabilityPercent: 94,
        limitingFactor: 'MAINTENANCE',
        physicalRepairActions: [{ id: 'REPLACE_EQUIPMENT', label: 'Replace failing equipment', cost: 420_000 }],
    },
];
const countries: StreamingRehearsalCountryInput[] = [
    {
        marketId: 'US', country: 'United States', regionId: 'N_AMERICA', regionLabel: 'North America',
        demand: 100_000, latencyMs: 34, cacheHitPercent: 93, baseBufferingRiskPercent: 3,
        routeFacilityIds: ['LA-CAGE', 'NYC-CAGE'], servingCityLabels: ['Los Angeles', 'New York'],
        recommendedCityId: 'LA', localizationNote: 'English launch support is ready.',
        catalogueAvailableTitles: 8, catalogueTotalTitles: 10,
    },
    {
        marketId: 'CA', country: 'Canada', regionId: 'N_AMERICA', regionLabel: 'North America',
        demand: 60_000, latencyMs: 82, cacheHitPercent: 71, baseBufferingRiskPercent: 10,
        routeFacilityIds: ['NYC-CAGE'], servingCityLabels: ['New York'],
        recommendedCityId: 'TOR', localizationNote: 'French metadata remains incomplete.',
        catalogueAvailableTitles: 4, catalogueTotalTitles: 10,
    },
];

const result = createStreamingLaunchRehearsal({
    scenario: 'LIKELY', facilities, countries, rolloutRiskPercent: 12,
});
const repeated = createStreamingLaunchRehearsal({
    scenario: 'LIKELY', facilities: clone(facilities), countries: clone(countries), rolloutRiskPercent: 12,
});
assert(JSON.stringify(result) === JSON.stringify(repeated), 'The same launch inputs must always produce identical rehearsal evidence.');
assert(result.peakConcurrentStreams === 160_000, 'Country demand must add up to the visible opening-night peak.');
assert(result.facilities.reduce((sum, facility) => sum + facility.demand, 0) === result.peakConcurrentStreams, 'Traffic allocation must conserve every forecast stream.');
assert(result.facilities.find(facility => facility.facilityId === 'NYC-CAGE')?.verdict === 'BROKE', 'The weak New York facility must fail under its assigned demand.');
assert(result.countries.find(country => country.marketId === 'CA')?.verdict === 'BROKE', 'A country routed only through a failed facility must expose failed streams.');
assert(result.countries.find(country => country.marketId === 'US')?.outageResistance === 'REDUNDANT', 'A country with two serving cities must be reported as redundant.');
assert(result.regionalSinglePointFailures.includes('North America'), 'A country with one regional route must expose the regional single point of failure.');
assert(result.catalogueAvailabilityPercent === 65, 'Global catalogue availability must be weighted by country demand.');
assert(result.spareCapacityPercent < 0 && result.estimatedDowntimeMinutes > 0, 'An overloaded launch must disclose negative spare capacity and downtime risk.');
assert(result.warningSummary.includes('failed streams'), 'The verdict must explain the expected viewer consequence in plain language.');
['REPAIR_PHYSICAL', 'ADD_CAPACITY', 'ADD_REGIONAL_HUB', 'EXPAND_RIGHTS'].forEach(type => {
    assert(result.repairActions.some(action => action.type === type), `The failed rehearsal must offer a direct ${type} action.`);
});

const singleCountry: StreamingRehearsalCountryInput = {
    ...countries[0], demand: 45_000, routeFacilityIds: ['LA-CAGE'], servingCityLabels: ['Los Angeles'],
    catalogueAvailableTitles: 10,
};
const stable = createStreamingLaunchRehearsal({
    scenario: 'QUIET', countries: [singleCountry], facilities: [facilities[0]], rolloutRiskPercent: 0,
});
const unreliable = createStreamingLaunchRehearsal({
    scenario: 'QUIET', countries: [{ ...singleCountry, cacheHitPercent: 55 }],
    facilities: [{ ...facilities[0], reliabilityPercent: 95 }], rolloutRiskPercent: 0,
});
assert((unreliable.countries[0].startupTimeMs || 0) > (stable.countries[0].startupTimeMs || 0), 'Facility reliability must visibly affect startup time.');
assert(unreliable.countries[0].bufferingRiskPercent > stable.countries[0].bufferingRiskPercent, 'Reliability and cache misses must visibly affect buffering risk.');

const noCatalogue = createStreamingLaunchRehearsal({
    scenario: 'QUIET', facilities: [facilities[0]],
    countries: [{ ...singleCountry, catalogueAvailableTitles: 0, catalogueTotalTitles: 0 }],
    rolloutRiskPercent: 0,
});
assert(noCatalogue.catalogueAvailabilityPercent === 0, 'An empty opening catalogue must not be disguised as complete availability.');
assert(noCatalogue.repairActions.some(action => action.type === 'EXPAND_RIGHTS' && action.detail.includes('No opening title')), 'An empty catalogue must lead to a useful Content-desk repair action.');

const createIncorporatedPlayer = (): Player => {
    const eligible: Player = {
        ...clone(INITIAL_PLAYER),
        id: 'phase6-viewer-forecast-founder',
        name: 'Rehearsal Founder',
        money: 900_000_000,
        ownedStreamingPlatform: {
            ...clone(INITIAL_PLAYER.ownedStreamingPlatform),
            lifecycle: 'ELIGIBLE',
            simulationSeed: 'owned-streaming:phase6-viewer-forecast-founder',
            milestoneKeys: ['streaming-launch-clearance'],
        },
    };
    const drafted = saveStreamingFoundingDraft(eligible, {
        ...createDefaultStreamingFoundingDraft(100),
        currentStep: 2,
        name: 'Signal+',
        dayOneMarketIds: ['US', 'CA'],
        launchServerCityId: null,
    });
    const incorporated = incorporateOwnedStreamingPlatform(drafted);
    assert(incorporated.changed, 'The Phase 6 fixture must incorporate.');
    return {
        ...incorporated.player,
        ownedStreamingPlatform: { ...incorporated.player.ownedStreamingPlatform, treasuryCash: 100_000_000 },
    };
};

const toSnapshot = (
    rehearsal: StreamingLaunchRehearsalResult,
    configurationSignature: string,
): OwnedStreamingLaunchRehearsalSnapshot => ({
    configurationSignature,
    scenario: rehearsal.scenario,
    verdict: rehearsal.verdict,
    peakConcurrentStreams: rehearsal.peakConcurrentStreams,
    steadyCapacity: rehearsal.steadyCapacity,
    burstCapacity: rehearsal.burstCapacity,
    peakLoadPercent: rehearsal.peakLoadPercent,
    spareCapacityPercent: rehearsal.spareCapacityPercent,
    failedPercent: rehearsal.failedPercent,
    estimatedDowntimeMinutes: rehearsal.estimatedDowntimeMinutes,
    catalogueAvailabilityPercent: rehearsal.catalogueAvailabilityPercent,
    regionalSinglePointFailures: [...rehearsal.regionalSinglePointFailures],
    warningSummary: rehearsal.warningSummary,
    countries: rehearsal.countries.map(country => ({
        marketId: country.marketId, country: country.country, demand: country.demand,
        startupTimeMs: country.startupTimeMs, bufferingRiskPercent: country.bufferingRiskPercent,
        catalogueAvailabilityPercent: country.catalogueAvailabilityPercent,
        outageResistance: country.outageResistance, verdict: country.verdict,
        failedPercent: country.failedPercent, viewerConsequence: country.viewerConsequence,
    })),
    facilities: rehearsal.facilities.map(facility => ({
        facilityId: facility.facilityId, cityId: facility.cityId, demand: facility.demand,
        loadPercent: facility.loadPercent, state: facility.state, verdict: facility.verdict,
        failedPercent: facility.failedPercent, limitingFactor: facility.limitingFactor,
    })),
    completedAtAbsoluteWeek: 42,
});

const incorporated = createIncorporatedPlayer();
const draft = createDefaultStreamingInfrastructureDraft(incorporated);
const signature = getStreamingInfrastructureForecast(incorporated, draft).configurationSignature;
const snapshot = toSnapshot(result, signature);
const saved = saveStreamingInfrastructureDraft(incorporated, { ...draft, lastLaunchRehearsal: snapshot });
assert(saved.ownedStreamingPlatform.infrastructureSetupDraft?.lastLaunchRehearsal?.warningSummary === result.warningSummary, 'Country rehearsal evidence must survive draft persistence.');
const tested = runStreamingInfrastructureLoadTest(saved);
const committed = commitStreamingInfrastructureSetup(tested.player);
assert(committed.changed, 'A tested Phase 6 drawing must commission normally.');
assert(committed.player.ownedStreamingPlatform.infrastructureSetup?.loadTest.launchRehearsal?.countries.length === 2, 'Commissioning must freeze country-level launch evidence into the canonical load test.');

const legacy = normalizeOwnedStreamingPlatformState({
    schemaVersion: 1,
    infrastructureSetupDraft: {
        strategy: 'HYBRID', capacityPackageId: 'STARTER', rolloutPace: 'STANDARD',
        subscriptionPrices: { BASIC: 7.99, PREMIUM: 13.99, FAMILY: 18.99 },
        networkPlacements: [{ cityId: 'LA', racks: 2, role: 'CORE_ORIGIN' }],
        lastLoadTestSignature: null, updatedAtAbsoluteWeek: 1,
    },
}, 'phase6-legacy');
assert(legacy.infrastructureSetupDraft && !legacy.infrastructureSetupDraft.lastLaunchRehearsal, 'Old saves without a country rehearsal must remain valid.');
const normalizedEvidence = normalizeOwnedStreamingPlatformState({
    ...legacy,
    infrastructureSetupDraft: {
        ...legacy.infrastructureSetupDraft,
        lastLaunchRehearsal: { ...snapshot, failedPercent: 999, spareCapacityPercent: -999 },
    },
}, 'phase6-evidence-normalization');
assert(normalizedEvidence.infrastructureSetupDraft?.lastLaunchRehearsal?.failedPercent === 100, 'Migrated rehearsal failure percentages must be clamped safely.');
assert(normalizedEvidence.infrastructureSetupDraft?.lastLaunchRehearsal?.spareCapacityPercent === -100, 'Migrated negative spare capacity must preserve a bounded warning.');

const engineSource = readFileSync('services/streamingLaunchRehearsal.ts', 'utf8');
const buildSource = readFileSync('components/streaming-transplant/StreamingBuildoutExperience.tsx', 'utf8');
const hqSource = readFileSync('components/StreamingPlatformHQ.tsx', 'utf8');
const styleSource = readFileSync('components/streaming-transplant/presentation/screens/Buildout/Buildout.module.css', 'utf8');
assert(!engineSource.includes('Math.random'), 'The canonical launch rehearsal must never use random outcomes.');
['AUDIENCE', 'ROUTE', 'STRESS', 'VIEWERS', 'DECISION', 'warningSummary', 'REPAIR THE PLAN', 'FOUNDER OVERRIDE AVAILABLE'].forEach(fragment => {
    assert(buildSource.includes(fragment), `The Phase 6 command sequence must expose ${fragment}.`);
});
assert(hqSource.includes('LEGACY MARKET FALLBACK') && hqSource.includes('getStreamingDayOneMarketsForRegion'), 'Pre-Day-One-Market saves must receive deterministic country evidence.');
assert(styleSource.includes('.rhsequence') && styleSource.includes('overflow-x:auto') && styleSource.includes('prefers-reduced-motion'), 'The rehearsal sequence must retain narrow-mobile and reduced-motion support.');

console.log('EMPIRE+ Phase 6 viewer forecast and launch rehearsal audit passed.');
