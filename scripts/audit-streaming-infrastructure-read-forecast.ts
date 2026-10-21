import { STREAMING_SERVER_SITES } from '../services/streamingServerSites';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import type { OwnedStreamingInfrastructureSetupDraft, OwnedStreamingLaunchRehearsalSnapshot, Player, StreamingLaunchMarketingForecastSnapshot } from '../types';
import * as infrastructure from '../services/streamingInfrastructure';
import { filedMarketFixture } from './helpers/streamingFiledMarketFixture';
import { migratePlacementsToStreamingFacilities } from '../services/streamingFacilities';
import { getStreamingOpeningCommissionQuote } from '../services/streamingOpeningProgramme';

const player = filedMarketFixture();
const base = infrastructure.createDefaultStreamingInfrastructureDraft(player);
const legacyRead = (value: Player, input: OwnedStreamingInfrastructureSetupDraft) => {
    const saved = infrastructure.saveStreamingInfrastructureDraft(value, input);
    const draft = saved.ownedStreamingPlatform.infrastructureSetupDraft || input;
    return infrastructure.getStreamingInfrastructureForecast(saved, draft);
};
type ReadForecast = typeof legacyRead;
// Exercise the current production sequence until the read-only API replaces it.
// Keeping this fallback makes removing that API reintroduce the workload failure.
const readForecast: ReadForecast = (infrastructure as typeof infrastructure & {
    getCanonicalStreamingInfrastructureDraftForecast?: ReadForecast;
}).getCanonicalStreamingInfrastructureDraftForecast || legacyRead;
const placements = [{ cityId: 'LA', racks: 3, role: 'CORE_ORIGIN' as const }, { cityId: 'TOR', racks: 2, role: 'REGIONAL_HUB' as const }];
const facilities = migratePlacementsToStreamingFacilities(placements);
const variants: Array<[string, OwnedStreamingInfrastructureSetupDraft]> = [
    ['empty drawing', base],
    ['legacy placements', { ...base, networkPlacements: placements, facilities: undefined, regionPlans: undefined }],
    ['facilities and rack groups', { ...base, networkPlacements: placements, facilities }],
    ['edited legacy placements with stale facilities', { ...base, networkPlacements: [{ ...placements[0], racks: 7 }], facilities }],
    ['rounded pricing and demand', { ...base, subscriptionPrices: { BASIC: 7.995, PREMIUM: 13.994, FAMILY: 18.995 },
        openingDemandForecast: { low: 100499.5, likely: 200500.5, high: 399499.5 } }],
    ['malformed legacy values', { ...base, currentStep: 12.9, strategy: 'LEGACY' as any, capacityPackageId: 'UNKNOWN' as any,
        subscriptionPrices: { BASIC: Number.NaN, PREMIUM: 1800.3, FAMILY: -50 },
        networkPlacements: [{ cityId: 'LA', racks: 500, role: 'CORE_ORIGIN' }, { cityId: 'LA', racks: 2, role: 'EDGE_CACHE' }, { cityId: 'UNKNOWN', racks: 8, role: 'REGIONAL_HUB' }],
        openingDemandForecast: { low: -60, likely: 199999.1, high: 500.1 } }],
    ['hands-on management', { ...base, facilities, networkPlacements: placements, managementPolicy: {
        mode: 'HANDS_ON', priority: 'PREMIUM', maximumBudget: 200000000.6, riskTolerance: 'HIGH',
        preferredCityIds: [' la ', 'LA'], requireApprovalForExpensiveChanges: false, approvalThreshold: 250000.6,
    } }],
    ...(['SAFE', 'STANDARD', 'RUSHED'] as const).map(pace => [`rollout ${pace}`, { ...base, rolloutPace: pace,
        networkPlacements: placements }] as [string, OwnedStreamingInfrastructureSetupDraft]),
];

const fullForecastHash = () => createHash('sha256').update(JSON.stringify(
    variants.map(([label, draft]) => [label, legacyRead(player, draft)]),
)).digest('hex');
if (process.argv.includes('--hash')) {
    console.log(fullForecastHash());
    process.exit(0);
}
test('public forecast math retains the complete checkpoint output across ten canonical draft variants', () => {
    assert.equal(fullForecastHash(), '68fc85bbf779122e22044a13dd2b3a15bc6f0271504011ecc8a4c97e7b6a3db6');
});

for (const [label, draft] of variants) test(`read-only ${label} matches the complete saved canonical forecast`, () => {
    const beforePlayer = structuredClone(player);
    const beforeDraft = structuredClone(draft);
    assert.deepEqual(readForecast(player, draft), legacyRead(player, draft));
    assert.deepEqual(player, beforePlayer, 'Forecast reads must not mutate the career');
    assert.deepEqual(draft, beforeDraft, 'Forecast reads must not mutate the working drawing');
});

test('save rounding is observable in the read-only result', () => {
    const forecast = readForecast(player, variants.find(([name]) => name === 'rounded pricing and demand')![1]);
    assert.equal(forecast.plannedArpu, 12.02);
    assert.deepEqual([forecast.forecastLowConcurrentStreams, forecast.forecastLikelyConcurrentStreams, forecast.forecastHighConcurrentStreams],
        [100000, 201000, 399000]);
    assert.equal(forecast.rolloutPace, 'STANDARD');
});

test('one read normalizes the live platform once instead of saving and compacting it', () => {
    let catalogueReads = 0;
    const observed = { ...player, ownedStreamingPlatform: { ...player.ownedStreamingPlatform } };
    Object.defineProperty(observed.ownedStreamingPlatform, 'catalogLicenses', { enumerable: true,
        get: () => { catalogueReads++; return player.ownedStreamingPlatform.catalogLicenses; } });
    const forecast = readForecast(observed, base);
    assert.ok(forecast.configurationSignature);
    assert.equal(catalogueReads, 1, 'A read must not normalize the entire career repeatedly just to obtain a signature');
});

test('the read helper sees current canonical changes and does not retain an authorization cache', () => {
    const first = readForecast(player, base);
    const changed = { ...player, ownedStreamingPlatform: { ...player.ownedStreamingPlatform,
        technologyLevels: { ...player.ownedStreamingPlatform.technologyLevels, DELIVERY_CAPACITY: 75, RELIABILITY: 70 },
        capacity: { baselineConcurrentStreams: 6000000, burstConcurrentStreams: 10000000 } } };
    assert.deepEqual(readForecast(changed, base), legacyRead(changed, base));
    const input = { ...base, openingDemandForecast: { low: 1000000, likely: 2200000, high: 4400000 } };
    const next = readForecast(changed, input);
    assert.deepEqual(next, legacyRead(changed, input));
    assert.notEqual(next.configurationSignature, first.configurationSignature);
});

test('commissioned and legacy invalid-state careers keep the existing public forecast behavior', () => {
    const draft = variants[1][1];
    const tested = infrastructure.runStreamingInfrastructureLoadTest(player, draft);
    const committed = infrastructure.commitStreamingInfrastructureSetup(tested.player);
    assert.equal(committed.changed, true, JSON.stringify(committed.issues));
    const changed = { ...draft, networkPlacements: [{ ...placements[0], racks: 5 }], facilities: undefined };
    assert.deepEqual(readForecast(committed.player, changed), legacyRead(committed.player, changed));
    const locked = { ...player, ownedStreamingPlatform: { ...player.ownedStreamingPlatform, lifecycle: 'LOCKED' as const } };
    assert.deepEqual(readForecast(locked, base), legacyRead(locked, base));
});

test('a read never rebinds stale rehearsal evidence or clears the real commissioning gate', () => {
    const proof: OwnedStreamingLaunchRehearsalSnapshot = {
        configurationSignature: 'stale-rehearsal', scenario: 'LIKELY', verdict: 'HELD', peakConcurrentStreams: 200000,
        steadyCapacity: 250000, burstCapacity: 350000, peakLoadPercent: 80, spareCapacityPercent: 20,
        failedPercent: 0, estimatedDowntimeMinutes: 0, catalogueAvailabilityPercent: 100,
        regionalSinglePointFailures: [], warningSummary: 'Recorded older rehearsal', countries: [], facilities: [], completedAtAbsoluteWeek: 1259,
    };
    const draft = { ...base, networkPlacements: placements, lastLoadTestSignature: 'stale-load-test', lastLaunchRehearsal: proof };
    readForecast(player, draft);
    assert.equal(draft.lastLaunchRehearsal.configurationSignature, 'stale-rehearsal');
    assert.equal(draft.lastLoadTestSignature, 'stale-load-test');
    const validation = infrastructure.validateStreamingInfrastructureDraft(player, draft);
    assert.ok(validation.issues.some(issue => issue.code === 'LOAD_TEST_REQUIRED'));
    const committed = infrastructure.commitStreamingInfrastructureSetup(player, draft);
    assert.equal(committed.changed, false);
    assert.equal(committed.player.ownedStreamingPlatform.treasuryCash, player.ownedStreamingPlatform.treasuryCash);
    const marketing: StreamingLaunchMarketingForecastSnapshot = {
        id: 'no-marketing', version: 1, signature: 'zero-marketing', effectiveBudget: 0, organicAwareness: 0,
        likelyAwarenessLift: 0, baselineConcurrentStreams: 0, saturationPercent: 0, efficiencyStatus: 'ORGANIC',
        acquiredAccounts: { low: 0, likely: 0, high: 0 }, concurrentStreams: { low: 0, likely: 0, high: 0 },
        customerAcquisitionCost: null, confidenceScore: 0, confidence: 'LOW', countryForecasts: [], warnings: [],
    };
    const quote = getStreamingOpeningCommissionQuote(player, draft, marketing);
    assert.equal(quote.ready, false);
    assert.ok(quote.blockers.includes('The exact infrastructure configuration has not passed rehearsal.'));
});

test('large worldwide topology keeps exact rehearsal signatures through save normalization', () => {
 const placements=STREAMING_SERVER_SITES.slice(0,80).map(site=>({cityId:site.id,racks:1,role:'EDGE_CACHE' as const}));
 const draft={...base,networkPlacements:placements,facilities:undefined,regionPlans:undefined};
 const tested=infrastructure.runStreamingInfrastructureLoadTest(player,draft);
 assert.ok(tested.forecast.configurationSignature.length<=640,'A worldwide topology must fit the persisted signature field');
 assert.equal(tested.player.ownedStreamingPlatform.infrastructureSetupDraft?.lastLoadTestSignature,tested.forecast.configurationSignature);
 const normalized=tested.player.ownedStreamingPlatform.infrastructureSetupDraft!;
 const changed={...normalized,facilities:undefined,networkPlacements:normalized.networkPlacements.map((site,index)=>index===normalized.networkPlacements.length-1?{...site,racks:site.racks+1}:site)};
 assert.notEqual(infrastructure.getCanonicalStreamingInfrastructureDraftForecast(tested.player,changed).configurationSignature,tested.forecast.configurationSignature,'Changes at the end of the topology still invalidate evidence');
 assert.ok(infrastructure.validateStreamingInfrastructureDraft(tested.player,changed).issues.some(issue=>issue.code==='LOAD_TEST_REQUIRED'));
});
