import assert from 'node:assert/strict';
import { clonePlayerForWeekProcessing } from '../services/gameLoopClone';
import { buildLateGameWeekPerformanceFixture } from './fixtures/lateGameWeekPerformanceFixture';
import {
    getPlatformAiNormalizationDiagnostics,
    markPlatformAiStateCanonicalForTurn,
    normalizePlatformAiState,
    resetPlatformAiNormalizationDiagnostics,
} from '../services/platformAi/platformAiState';
import { normalizeStreamingRightsContractRegistry } from '../services/streamingRightsCore';
import { processStreamingRightsCalendarWeek } from '../services/streamingRightsCalendar';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { getAbsoluteWeek } from '../services/legacyLogic';

const fixture = buildLateGameWeekPerformanceFixture();
const expected = JSON.parse(JSON.stringify(fixture));
const actual = clonePlayerForWeekProcessing(fixture);
assert.deepEqual(actual, expected, 'fast weekly clone must retain the exact JSON-clone contract');
assert.notEqual(actual, fixture);
assert.notEqual(actual.world, fixture.world);

const absoluteWeek = getAbsoluteWeek(fixture.age, fixture.currentWeek);
const sourcePlatform = fixture.world.platforms!.NETFLIX;
markPlatformAiStateCanonicalForTurn(sourcePlatform, fixture.id, absoluteWeek);
const trustedClone = clonePlayerForWeekProcessing(fixture);
resetPlatformAiNormalizationDiagnostics();
normalizePlatformAiState(trustedClone.world.platforms!.NETFLIX, fixture.id, absoluteWeek + 1);
const normalization = getPlatformAiNormalizationDiagnostics();
assert.equal(
    normalization.deepValidationCount,
    0,
    'the controlled weekly clone must preserve the canonical marker and avoid revalidating mature platform history',
);
assert.equal(normalization.turnCacheHitCount, 1);

const shareSource = structuredClone(fixture);
shareSource.world.streamingRightsContracts = normalizeStreamingRightsContractRegistry(
    shareSource.world.streamingRightsContracts,
);
const canonicalRightsClone = clonePlayerForWeekProcessing(shareSource);
assert.deepEqual(
    shareSource.world.streamingRightsContracts,
    JSON.parse(JSON.stringify(shareSource.world.streamingRightsContracts)),
    'canonical rights registries must already satisfy the persisted JSON contract before structural sharing',
);
assert.equal(
    canonicalRightsClone.world.streamingRightsContracts,
    shareSource.world.streamingRightsContracts,
    'the controlled weekly clone must structurally share the canonical rights registry',
);
const compactedShareSource = compactPlayerForPersistence(shareSource);
assert.equal(
    compactedShareSource.world.streamingRightsContracts,
    shareSource.world.streamingRightsContracts,
    'compaction must preserve a canonical rights registry when every contract remains live',
);

const canonicalCompactionSource = structuredClone(fixture);
for (const platform of Object.values(canonicalCompactionSource.world.platforms || {})) {
    if (platform.ai) markPlatformAiStateCanonicalForTurn(platform, canonicalCompactionSource.id, absoluteWeek);
}
resetPlatformAiNormalizationDiagnostics();
compactPlayerForPersistence(canonicalCompactionSource);
assert.equal(
    getPlatformAiNormalizationDiagnostics().deepValidationCount,
    0,
    'save compaction must reuse the validated current-week platform state instead of rescanning mature histories',
);

const calendarPlayer = structuredClone(fixture);
const contract = Object.values(calendarPlayer.world.streamingRightsContracts!)[0];
const expiringContract = {
    ...contract,
    id: 'clone-c8-expiring-contract',
    idempotencyKey: 'clone-c8-expiring-contract',
    rootContractId: 'clone-c8-expiring-contract',
    status: 'ACTIVE' as const,
    permanentPurchase: false,
    windowType: 'EXCLUSIVE' as const,
    durationWeeks: 1,
    startsAtAbsoluteWeek: absoluteWeek - 2,
    expiresAtAbsoluteWeek: absoluteWeek - 1,
};
calendarPlayer.world.streamingRightsContracts = normalizeStreamingRightsContractRegistry({
    [expiringContract.id]: expiringContract,
});
calendarPlayer.world.streamingRightsCalendar = undefined;
const inputRegistry = calendarPlayer.world.streamingRightsContracts;
const calendarResult = processStreamingRightsCalendarWeek(calendarPlayer, absoluteWeek);
assert.equal(
    inputRegistry[expiringContract.id].status,
    'ACTIVE',
    'calendar expiry must never mutate a structurally shared input registry',
);
assert.equal(calendarResult.player.world.streamingRightsContracts![expiringContract.id].status, 'EXPIRED');
assert.notEqual(calendarResult.player.world.streamingRightsContracts, inputRegistry);

const special = {
    keep: 3,
    omitUndefined: undefined,
    omitFunction: () => 'no',
    array: [1, undefined, () => 'no', Number.NaN, Number.POSITIVE_INFINITY],
    nested: { keep: true, omit: undefined },
    date: new Date('2026-09-06T00:00:00.000Z'),
};
assert.deepEqual(
    clonePlayerForWeekProcessing(special as never),
    JSON.parse(JSON.stringify(special)),
    'fast weekly clone must match JSON semantics for omitted object values and null array slots',
);

console.log('C8 game-loop clone compatibility audit passed.');
