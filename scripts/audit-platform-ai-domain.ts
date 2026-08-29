import assert from 'node:assert/strict';
import { PLATFORM_AI_RUNTIME_SCHEMA_VERSION } from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import {
    PLATFORM_AI_PROFILES,
    buildPlatformContentCandidates,
    calculatePlatformAiWeeklyEconomy,
    getPlatformAiProductionDuration,
    normalizePlatformAiState,
    normalizeWorldPlatformAi,
    processPlatformAiWorldTurn,
    resolvePlatformController,
} from '../services/platformAi';
import { createPlatformAiFixture } from './helpers/platformAiFixture';

const fixture = createPlatformAiFixture();
const absoluteWeek = getAbsoluteWeek(fixture.age, fixture.currentWeek);
const legacyPlatformMetrics = Object.fromEntries(Object.entries(fixture.world.platforms || {}).map(([platformId, platform]) => [
    platformId,
    {
        cashReserve: platform.cashReserve,
        subscribers: platform.subscribers,
        valuation: platform.valuation,
        reputation: platform.reputation,
        recentHits: platform.recentHits,
    },
]));
const normalized = normalizeWorldPlatformAi(fixture, fixture.world, absoluteWeek);
const profiles = Object.values(PLATFORM_AI_PROFILES);

assert.equal(PLATFORM_AI_RUNTIME_SCHEMA_VERSION, 11, 'Phase 6 must advance the canonical Platform AI save schema.');
for (const platform of Object.values(normalized.platforms || {})) {
    assert.deepEqual(platform.ai?.regionalMemory, {});
    assert.deepEqual(platform.ai?.localizationMemory, {});
    assert.deepEqual(platform.ai?.talentPairMemory, {});
    assert.deepEqual(platform.ai?.releasePatternMemory, {});
    assert.deepEqual(platform.ai?.productionOutcomeMemory, {
        observedProductions: 0,
        deliveredProductions: 0,
        delayedProductions: 0,
        cancelledProductions: 0,
        averageDelayWeeks: 0,
        observedProductionIds: [],
    });
}

assert.equal(profiles.length, 5);
assert.ok(profiles.every(profile => Object.values(profile.competence).every(score => score >= 7 && score <= 10)));
for (const platformId of ['NETFLIX', 'APPLE_TV', 'DISNEY_PLUS', 'YOUTUBE'] as const) {
    assert.ok(
        PLATFORM_AI_PROFILES[platformId].maxConcurrentProductions >= 3
        && PLATFORM_AI_PROFILES[platformId].maxConcurrentProductions <= 6,
        `${platformId} should support 3–6 simultaneous productions.`,
    );
}
assert.ok(
    PLATFORM_AI_PROFILES.HULU.maxConcurrentProductions >= 1
    && PLATFORM_AI_PROFILES.HULU.maxConcurrentProductions <= 3,
    'HULU should support 1–3 simultaneous productions.',
);
assert.equal(getPlatformAiProductionDuration(20, 7, 'AI'), 18);
assert.equal(getPlatformAiProductionDuration(20, 10, 'AI'), 15);
assert.equal(getPlatformAiProductionDuration(20, 10, 'PLAYER'), 20);
assert.ok(Object.values(normalized.platforms || {}).every(platform => platform.ai?.lastProcessedAbsoluteWeek === absoluteWeek));
for (const [platformId, platform] of Object.entries(normalized.platforms || {})) {
    assert.deepEqual(
        {
            cashReserve: platform.cashReserve,
            subscribers: platform.subscribers,
            valuation: platform.valuation,
            reputation: platform.reputation,
            recentHits: platform.recentHits,
        },
        legacyPlatformMetrics[platformId],
        `${platformId} should preserve its legacy operating metrics during normalization.`,
    );
}
assert.deepEqual(normalizeWorldPlatformAi(fixture, normalized, absoluteWeek), normalized);

const legacyWorldWithoutPlatforms = structuredClone(fixture.world);
legacyWorldWithoutPlatforms.platforms = undefined;
const restoredLegacyWorld = normalizeWorldPlatformAi(fixture, legacyWorldWithoutPlatforms, absoluteWeek);
assert.equal(Object.keys(restoredLegacyWorld.platforms || {}).length, 5);
assert.ok(Object.values(restoredLegacyWorld.platforms || {}).every(platform => (
    platform.ai?.lastProcessedAbsoluteWeek === absoluteWeek
)));

const acquired = structuredClone(fixture);
acquired.ownedStreamingPlatform.corporateDevelopment.acquiredPlatformIds = ['NETFLIX'];
assert.equal(resolvePlatformController(acquired, 'NETFLIX'), 'PLAYER');
assert.equal(resolvePlatformController(acquired, 'HULU'), 'AI');

const handoffWorld = structuredClone(normalized);
const handoffNetflix = handoffWorld.platforms!.NETFLIX;
const handoffSubscribersBefore = handoffNetflix.subscribers;
handoffNetflix.ai!.pendingAudienceSettlements = [{
    id: 'phase-6-handoff-audience',
    streamingWindowId: 'phase-6-handoff-window',
    projectId: 'phase-6-handoff-project',
    planId: 'phase-6-handoff-plan',
    subscriberImpactMillions: 0.5,
    acquiredSubscribersMillions: 0.4,
    retainedSubscribersMillions: 0.2,
    churnedSubscribersMillions: 0.1,
    engagementIndexDelta: 2,
    catalogueStrengthDelta: 1.5,
    status: 'PENDING',
    createdAtAbsoluteWeek: absoluteWeek,
    settledAtAbsoluteWeek: null,
}];
const handedOffWorld = normalizeWorldPlatformAi(acquired, handoffWorld, absoluteWeek + 1);
assert.equal(handedOffWorld.platforms!.NETFLIX.subscribers, handoffSubscribersBefore + 0.5);
assert.equal(handedOffWorld.platforms!.NETFLIX.ai!.pendingAudienceSettlements[0].status, 'SETTLED');
assert.equal(handedOffWorld.platforms!.NETFLIX.ai!.audienceHealth.engagementIndex, 52);
assert.equal(handedOffWorld.platforms!.NETFLIX.ai!.audienceHealth.catalogueStrengthIndex, 51.5);
assert.deepEqual(
    normalizeWorldPlatformAi(acquired, handedOffWorld, absoluteWeek + 1),
    handedOffWorld,
    'Acquisition handoff audience settlement must be exactly once.',
);

const legacyAudienceWorld = structuredClone(normalized);
const legacyAudienceAi = legacyAudienceWorld.platforms!.NETFLIX.ai as any;
legacyAudienceAi.schemaVersion = 2;
legacyAudienceAi.pendingAudienceSettlements = [
    ...Array.from({ length: 8 }, (_, index) => ({
        id: `settled-audience-${index}`,
        streamingWindowId: `settled-window-${index}`,
        projectId: `settled-project-${index}`,
        planId: `settled-plan-${index}`,
        subscriberImpactMillions: 0.1,
        status: 'SETTLED',
        createdAtAbsoluteWeek: index,
        settledAtAbsoluteWeek: index + 1,
    })),
    ...Array.from({ length: 105 }, (_, index) => ({
        id: `pending-audience-${index}`,
        streamingWindowId: `pending-window-${index}`,
        projectId: `pending-project-${index}`,
        planId: `pending-plan-${index}`,
        subscriberImpactMillions: index ? -0.2 : 0.4,
        status: 'PENDING',
        createdAtAbsoluteWeek: 200 + index,
        settledAtAbsoluteWeek: null,
    })),
];
const normalizedAudienceAi = normalizeWorldPlatformAi(fixture, legacyAudienceWorld, absoluteWeek).platforms!.NETFLIX.ai as any;
assert.ok(Array.isArray(normalizedAudienceAi.pendingAudienceSettlements), 'Platform AI normalization must restore the audience settlement ledger.');
assert.equal(normalizedAudienceAi.pendingAudienceSettlements.length, 105, 'Every pending audience settlement must survive even when pending work exceeds the history limit.');
assert.equal(normalizedAudienceAi.pendingAudienceSettlements.filter((item: any) => item.status === 'PENDING').length, 105, 'Normalization must never drop pending audience settlements.');
assert.equal(normalizedAudienceAi.pendingAudienceSettlements.filter((item: any) => item.status === 'SETTLED').length, 0, 'Zero settled rows may survive when pending settlements leave zero history capacity.');

const canonicalPlatform = structuredClone(normalized.platforms!.NETFLIX) as any;
canonicalPlatform.ai.schemaVersion = PLATFORM_AI_RUNTIME_SCHEMA_VERSION;
const fastNormalizedPlatform = normalizePlatformAiState(canonicalPlatform, fixture.id, absoluteWeek);
assert.strictEqual(fastNormalizedPlatform, canonicalPlatform, 'A structurally valid current-schema state should use the guarded fast path.');

const forcedFullPlatform = structuredClone(canonicalPlatform) as any;
forcedFullPlatform.ai.schemaVersion = 3;
const fullyNormalizedPlatform = normalizePlatformAiState(forcedFullPlatform, fixture.id, absoluteWeek);
assert.notStrictEqual(fullyNormalizedPlatform, forcedFullPlatform, 'Legacy v3 state must use full normalization.');
assert.deepEqual(fullyNormalizedPlatform, fastNormalizedPlatform, 'Full legacy normalization and guarded current-schema normalization must be equivalent.');

// Every collection admitted by the canonical fast path must validate its rows,
// not merely the outer array. Each mutation below must force full normalization.
const malformedRequiredCollectionRows: Array<{ field: string; row: unknown }> = [
    { field: 'researchQueue', row: null },
    { field: 'marketOperations', row: null },
    { field: 'slate', row: null },
    { field: 'rightsContracts', row: null },
    { field: 'talentBookingRefs', row: 42 },
    { field: 'releaseMemory', row: null },
    { field: 'financeHistory', row: null },
    { field: 'decisionHistory', row: null },
    { field: 'pendingOneTimeObligations', row: null },
    { field: 'localizationJobs', row: null },
    { field: 'rightsRenewals', row: null },
    { field: 'pendingAudienceSettlements', row: null },
];
const malformedRowsAcceptedByFastPath: string[] = [];
for (const { field, row } of malformedRequiredCollectionRows) {
    const malformedCollectionPlatform = structuredClone(canonicalPlatform) as any;
    malformedCollectionPlatform.ai[field] = [...malformedCollectionPlatform.ai[field], row];
    const repairedCollectionPlatform = normalizePlatformAiState(
        malformedCollectionPlatform,
        fixture.id,
        absoluteWeek,
    );
    if (repairedCollectionPlatform === malformedCollectionPlatform) {
        malformedRowsAcceptedByFastPath.push(field);
    }
}
assert.deepEqual(
    malformedRowsAcceptedByFastPath,
    [],
    'Canonical v4 fast-path collections must reject every malformed row.',
);

const malformedEveryCollectionPlatform = structuredClone(canonicalPlatform) as any;
for (const { field, row } of malformedRequiredCollectionRows) {
    malformedEveryCollectionPlatform.ai[field] = [...malformedEveryCollectionPlatform.ai[field], row];
}
malformedEveryCollectionPlatform.ai.lastProcessedAbsoluteWeek = absoluteWeek - 1;
const malformedEveryCollectionWorld = {
    ...normalized,
    platforms: {
        ...normalized.platforms!,
        NETFLIX: malformedEveryCollectionPlatform,
    },
};
const malformedEveryCollectionPlayer = { ...fixture, world: malformedEveryCollectionWorld };
assert.doesNotThrow(() => buildPlatformContentCandidates({
    player: malformedEveryCollectionPlayer,
    world: malformedEveryCollectionWorld,
    platformId: 'NETFLIX',
    absoluteWeek,
}), 'Malformed canonical collection rows must not crash sourcing.');
assert.doesNotThrow(() => calculatePlatformAiWeeklyEconomy({
    player: malformedEveryCollectionPlayer,
    platform: malformedEveryCollectionPlatform,
    absoluteWeek,
}), 'Malformed canonical collection rows must not crash economy calculation.');
assert.doesNotThrow(() => processPlatformAiWorldTurn(
    malformedEveryCollectionPlayer,
    malformedEveryCollectionWorld,
    absoluteWeek,
), 'Malformed canonical collection rows must not crash the weekly Platform AI turn.');

const malformedV3Platform = structuredClone(canonicalPlatform) as any;
malformedV3Platform.ai.schemaVersion = 3;
malformedV3Platform.ai.lastProcessedAbsoluteWeek = 'not-a-week';
malformedV3Platform.ai.capabilities.technologyLevels.DELIVERY_CAPACITY = Number.POSITIVE_INFINITY;
malformedV3Platform.ai.capabilities.subtitleCoveragePercent = -25;
malformedV3Platform.ai.financeHistory = null;
malformedV3Platform.ai.pendingAudienceSettlements = [{
    id: 'valid-pending-v3',
    streamingWindowId: 'window-v3',
    projectId: 'project-v3',
    planId: 'plan-v3',
    subscriberImpactMillions: 0.25,
    status: 'PENDING',
    createdAtAbsoluteWeek: 300,
    settledAtAbsoluteWeek: null,
}, {
    id: '',
    streamingWindowId: 'malformed-window-v3',
    projectId: 'malformed-project-v3',
    planId: 'malformed-plan-v3',
    subscriberImpactMillions: Number.NaN,
    status: 'SETTLED',
    createdAtAbsoluteWeek: -5,
    settledAtAbsoluteWeek: -10,
}];
const repairedV3Platform = normalizePlatformAiState(malformedV3Platform, fixture.id, absoluteWeek);
assert.equal(repairedV3Platform.ai!.schemaVersion, PLATFORM_AI_RUNTIME_SCHEMA_VERSION, 'Legacy v3 state must migrate to the current canonical schema.');
assert.equal(repairedV3Platform.ai!.lastProcessedAbsoluteWeek, absoluteWeek, 'Malformed v3 week fields must receive a safe finite fallback.');
assert.ok(repairedV3Platform.ai!.capabilities.technologyLevels.DELIVERY_CAPACITY >= 0 && repairedV3Platform.ai!.capabilities.technologyLevels.DELIVERY_CAPACITY <= 75, 'Malformed v3 technology must normalize into the supported range.');
assert.ok(repairedV3Platform.ai!.capabilities.subtitleCoveragePercent >= 0, 'Malformed v3 capability percentages must normalize safely.');
assert.deepEqual(repairedV3Platform.ai!.financeHistory, [], 'Missing required v3 arrays must normalize to arrays.');
assert.deepEqual(repairedV3Platform.ai!.pendingAudienceSettlements.map(item => item.id), ['valid-pending-v3'], 'Malformed v3 settlement rows must be rejected without dropping valid pending work.');

const malformedV4Platform = structuredClone(canonicalPlatform) as any;
malformedV4Platform.ai.schemaVersion = 4;
malformedV4Platform.ai.capabilities.technologyLevels.SECURITY = 999;
malformedV4Platform.ai.capabilities.dubCoveragePercent = -5;
malformedV4Platform.ai.researchQueue = null;
malformedV4Platform.ai.rightsContracts = undefined;
malformedV4Platform.ai.decisionHistory = {};
malformedV4Platform.ai.debtMillions = 'not-a-number';
malformedV4Platform.ai.pendingAudienceSettlements = [{
    id: 'pending-v4-with-stale-settled-week',
    streamingWindowId: 'window-v4',
    projectId: 'project-v4',
    planId: 'plan-v4',
    subscriberImpactMillions: -0.2,
    status: 'PENDING',
    createdAtAbsoluteWeek: 400,
    settledAtAbsoluteWeek: 401,
}];
const repairedV4Platform = normalizePlatformAiState(malformedV4Platform, fixture.id, absoluteWeek);
assert.notStrictEqual(repairedV4Platform, malformedV4Platform, 'Malformed v4 state must be rejected by the guarded fast path.');
assert.equal(repairedV4Platform.ai!.schemaVersion, PLATFORM_AI_RUNTIME_SCHEMA_VERSION, 'Malformed v4 state must migrate to the current canonical schema after repair.');
assert.ok(repairedV4Platform.ai!.capabilities.technologyLevels.SECURITY >= 0 && repairedV4Platform.ai!.capabilities.technologyLevels.SECURITY <= 75, 'Malformed v4 technology must normalize into the supported range.');
assert.ok(repairedV4Platform.ai!.capabilities.dubCoveragePercent >= 0, 'Malformed v4 capability percentages must normalize safely.');
assert.ok(repairedV4Platform.ai!.researchQueue.length > 0, 'Malformed legacy research must be repaired with the mature historical baseline.');
assert.deepEqual(repairedV4Platform.ai!.rightsContracts, [], 'Missing v4 rights references must normalize without implementing a rights lifecycle.');
assert.deepEqual(repairedV4Platform.ai!.decisionHistory, [], 'Malformed v4 decision history must normalize safely.');
assert.equal(repairedV4Platform.ai!.debtMillions, 0, 'Malformed v4 numeric fields must normalize to safe finite values.');
assert.equal(repairedV4Platform.ai!.pendingAudienceSettlements[0]?.settledAtAbsoluteWeek, null, 'Pending v4 settlements must not retain a settled week.');

console.log('Platform AI domain audit passed.');
