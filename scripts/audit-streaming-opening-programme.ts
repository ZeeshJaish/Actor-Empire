import assert from 'node:assert/strict';

import {
    createInitialOwnedStreamingPlatformState,
    type Player,
    INITIAL_PLAYER,
} from '../types';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { createStreamingCountryMarketOperation, startStreamingMarketOperation } from '../services/streamingMarketsCore';
import { getStreamingOpeningMarketDecisionState } from '../services/streamingLaunchProgram';
import {
    appendStreamingOpeningProgrammeTransitions,
    getStreamingOpeningProgrammeView,
} from '../services/streamingOpeningProgramme';
import { getAbsoluteWeek } from '../services/legacyLogic';

const playerId = 'opening-programme-audit';
const initial = createInitialOwnedStreamingPlatformState(playerId);

const legacy = normalizeOwnedStreamingPlatformState({
    ...initial,
    openingProgrammeCommission: undefined,
}, playerId);
assert.equal(legacy.openingProgrammeCommission, null, 'Legacy saves must safely default to no commission marker.');

const normalized = normalizeOwnedStreamingPlatformState({
    ...initial,
    openingProgrammeCommission: {
        id: 'opening-programme:empire-plus:2100',
        idempotencyKey: 'opening-programme:empire-plus:definition-a:infra-a',
        committedAtAbsoluteWeek: 2100,
        launchDefinitionSignature: 'definition-a',
        infrastructureConfigurationSignature: 'infra-a',
        rehearsalSignature: 'infra-a',
        openingCountryIds: ['us', 'CA', 'US'],
        marketingForecastSignature: 'marketing-a',
        revision: 1,
    },
}, playerId);
assert.deepEqual(normalized.openingProgrammeCommission?.openingCountryIds, ['CA', 'US']);
assert.equal(normalized.openingProgrammeCommission?.committedAtAbsoluteWeek, 2100);

const basePlayer: Player = {
    ...structuredClone(INITIAL_PLAYER),
    id: playerId,
    ownedStreamingPlatform: initial,
};
assert.equal(basePlayer.ownedStreamingPlatform.openingProgrammeCommission, null);

const plannedOperation = createStreamingCountryMarketOperation({
    seed: initial.simulationSeed,
    countryId: 'US',
    entryKind: 'OPENING',
    absoluteWeek: 2100,
    source: 'PLAYER_ACTION',
})!;
const withOperation = (operation: typeof plannedOperation): Player => ({
    ...basePlayer,
    ownedStreamingPlatform: { ...initial, marketOperations: [operation] },
});
assert.equal(getStreamingOpeningMarketDecisionState(withOperation(plannedOperation)).readyToCommission, true);
const reviewOperation = startStreamingMarketOperation(plannedOperation, 2100);
assert.equal(getStreamingOpeningMarketDecisionState(withOperation(reviewOperation)).readyToCommission, true);
assert.equal(getStreamingOpeningMarketDecisionState(withOperation(reviewOperation)).reviewComplete, false);
const actionOperation = {
    ...reviewOperation,
    clearance: { ...reviewOperation.clearance!, outcome: 'ADDITIONAL_REQUIREMENT' as const },
};
assert.equal(getStreamingOpeningMarketDecisionState(withOperation(actionOperation)).readyToCommission, false);

const absoluteWeek = getAbsoluteWeek(basePlayer.age, basePlayer.currentWeek);
const legacyCommissionedPlayer: Player = {
    ...basePlayer,
    ownedStreamingPlatform: {
        ...initial,
        lifecycle: 'FOUNDING',
        identity: {
            name: 'Audit+', slug: 'audit-plus', primaryColor: '#5b36ff', secondaryColor: '#101014',
            logoKey: 'FRAME_PLAY', soundIdentKey: 'PULSE', brandPromiseId: 'BALANCED',
            foundedAtAbsoluteWeek: absoluteWeek, publicManifesto: 'A durable opening programme.',
        },
        marketOperations: [{
            ...reviewOperation,
            approvalReadyAtAbsoluteWeek: absoluteWeek + 3,
        }],
        infrastructureSetup: {
            capacityPackageId: 'STARTER',
            networkPlacements: [{ cityId: 'LA', racks: 2, role: 'CORE_ORIGIN' }],
            facilities: [],
            rolloutPace: 'STANDARD', storageCapacityHours: 10_000, reliabilityTarget: 99.5,
            weeklyOperatingCost: 200_000, staffRequired: 4, capitalInvested: 12_000_000,
            technicalDebt: 0, readyAtAbsoluteWeek: absoluteWeek + 5, revision: 1,
            committedAtAbsoluteWeek: absoluteWeek,
            loadTest: {
                configurationSignature: 'legacy-infra-signature', forecastLowConcurrentStreams: 10_000,
                forecastLikelyConcurrentStreams: 20_000, forecastHighConcurrentStreams: 30_000,
                testedBurstCapacity: 50_000, headroomPercent: 40, status: 'PASS', driverKeys: [],
                completedAtAbsoluteWeek: absoluteWeek,
            },
        },
    },
};
const reopened = structuredClone(legacyCommissionedPlayer) as Player;
const migratedView = getStreamingOpeningProgrammeView(reopened);
assert.equal(migratedView.commissioned, true, 'A reopened legacy commission must derive the programme without charging again.');
assert.equal(migratedView.state, 'EXECUTING');
assert.equal(migratedView.controllingWorkstreamId, 'INFRASTRUCTURE');
assert.equal(migratedView.remainingWeeks, 5);

const clearedPlayer: Player = {
    ...reopened,
    ownedStreamingPlatform: {
        ...reopened.ownedStreamingPlatform,
        marketOperations: reopened.ownedStreamingPlatform.marketOperations.map(operation => ({
            ...operation,
            status: 'READY' as const,
            clearance: operation.clearance ? { ...operation.clearance, outcome: 'APPROVED' as const } : null,
        })),
    },
};
const transitioned = appendStreamingOpeningProgrammeTransitions(reopened, clearedPlayer);
const clearanceEvents = transitioned.ownedStreamingPlatform.eventLedger.filter(entry => (
    entry.metadata?.workstreamId === 'CLEARANCES' && entry.metadata?.status === 'READY'
));
assert.equal(clearanceEvents.length, 1, 'A clearance transition must create one durable programme event.');
const repeatedTransition = appendStreamingOpeningProgrammeTransitions(reopened, transitioned);
assert.equal(
    repeatedTransition.ownedStreamingPlatform.eventLedger.filter(entry => entry.idempotencyKey === clearanceEvents[0].idempotencyKey).length,
    1,
    'Reprocessing the same programme transition must not duplicate its ledger event.',
);

console.log('Streaming Opening Programme domain audit passed.');
