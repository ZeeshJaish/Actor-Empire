import { INITIAL_PLAYER, type OwnedStreamingPlatformState, type Player } from '../types';
import { createDeterministicRng } from '../services/deterministicRandom';
import {
    OWNED_STREAMING_CINEMATIC_QUEUE_LIMIT,
    OWNED_STREAMING_EVENT_LEDGER_LIMIT,
    OWNED_STREAMING_PLATFORM_SCHEMA_VERSION,
    OWNED_STREAMING_PROCESSED_WEEK_LIMIT,
    OWNED_STREAMING_WEEKLY_HISTORY_LIMIT,
    commitOwnedStreamingFoundationWeek,
    compactOwnedStreamingPlatformForPersistence,
    createOwnedStreamingPlatformState,
    normalizeOwnedStreamingPlatformState,
    queueOwnedStreamingCinematic,
} from '../services/ownedStreamingPlatform';
import { migratePlayerSave } from '../services/saveMigration';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { resolveStreamingAccess } from '../services/streamingAccessPolicy';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const legacyPlayer = clone(INITIAL_PLAYER) as any;
delete legacyPlayer.ownedStreamingPlatform;
legacyPlayer.id = 'legacy-streaming-founder';
const migrated = migratePlayerSave(legacyPlayer);

assert(
    migrated.ownedStreamingPlatform.schemaVersion === OWNED_STREAMING_PLATFORM_SCHEMA_VERSION,
    'Legacy saves should receive the current owned streaming schema.',
);
assert(
    migrated.ownedStreamingPlatform.simulationSeed === 'owned-streaming:legacy-streaming-founder',
    'Migration should create a stable player-specific simulation seed.',
);
assert(
    migrated.ownedStreamingPlatform.founderOwnershipPercent === 100,
    'The default foundation should preserve direct player ownership.',
);
assert(
    Object.keys(migrated.world.platforms).length === Object.keys(INITIAL_PLAYER.world.platforms).length,
    'Owned streaming must not add itself to the third-party title licensing platforms.',
);

const corrupt = normalizeOwnedStreamingPlatformState({
    lifecycle: 'BROKEN',
    founderOwnershipPercent: 900,
    infrastructureStrategy: 'MAGIC_SERVERS',
    capacity: { baselineConcurrentStreams: -10, burstConcurrentStreams: Number.POSITIVE_INFINITY },
    metrics: {
        subscribers: -100,
        churnRate: 50,
        engagementRate: -2,
        technologyHealth: 300,
    },
    weeklyHistory: Array.from({ length: 150 }, (_, absoluteWeek) => ({
        id: `snapshot_${absoluteWeek}`,
        absoluteWeek,
        subscribers: absoluteWeek,
        causeMarkers: ['test'],
    })),
    processedWeekKeys: Array.from({ length: 180 }, (_, week) => `week:${week}`),
}, 'repair-test');

assert(corrupt.lifecycle === 'LOCKED', 'Unknown lifecycle values should safely fall back to LOCKED.');
assert(corrupt.founderOwnershipPercent === 100, 'Founder ownership should stay within 0-100%.');
assert(corrupt.capacity.baselineConcurrentStreams === 0, 'Server capacity should never migrate below zero.');
assert(corrupt.metrics.subscribers === 0, 'Subscribers should never migrate below zero.');
assert(corrupt.metrics.churnRate === 1, 'Churn should use a normalized 0-1 rate.');
assert(corrupt.metrics.technologyHealth === 100, 'Technology health should use a 0-100 score.');
assert(corrupt.weeklyHistory.length === OWNED_STREAMING_WEEKLY_HISTORY_LIMIT, 'Migration should bound weekly history.');
assert(corrupt.processedWeekKeys.length === OWNED_STREAMING_PROCESSED_WEEK_LIMIT, 'Migration should bound processed week keys.');

const rngA = createDeterministicRng('empire-plus:week:42');
const rngB = createDeterministicRng('empire-plus:week:42');
assert(
    JSON.stringify([rngA(), rngA(), rngA()]) === JSON.stringify([rngB(), rngB(), rngB()]),
    'The same simulation seed should always produce the same random sequence.',
);

const activeFoundation: OwnedStreamingPlatformState = {
    ...createOwnedStreamingPlatformState('weekly-test'),
    lifecycle: 'ACTIVE',
    metrics: {
        subscribers: 125_000,
        netSubscriberMovement: 12_500,
        churnRate: 0.041,
        engagementRate: 0.72,
        averageRevenuePerUser: 9.5,
        cashRunwayWeeks: 38,
        technologyHealth: 91,
    },
};
const committedOnce = commitOwnedStreamingFoundationWeek(activeFoundation, {
    absoluteWeek: 812,
    causeMarkers: ['Launch week'],
});
const committedTwice = commitOwnedStreamingFoundationWeek(committedOnce, {
    absoluteWeek: 812,
    causeMarkers: ['A duplicate call must not replace history'],
});

assert(committedOnce.weeklyHistory.length === 1, 'An active platform should record one weekly snapshot.');
assert(committedTwice.weeklyHistory.length === 1, 'Repeated processing of the same week must be idempotent.');
assert(committedTwice.eventLedger.length === 1, 'Repeated processing must not duplicate ledger facts.');
assert(
    JSON.stringify(committedOnce) === JSON.stringify(committedTwice),
    'A repeated weekly checkpoint should return the same normalized state.',
);

const checkpointFactId = committedOnce.eventLedger[0].id;
const withScene = queueOwnedStreamingCinematic(committedOnce, {
    idempotencyKey: 'launch-night:812',
    type: 'LAUNCH_NIGHT',
    priority: 'MAJOR',
    availableAtAbsoluteWeek: 812,
    title: 'EMPIRE+ Launch Night',
    factIds: [checkpointFactId],
});
const duplicateScene = queueOwnedStreamingCinematic(withScene, {
    idempotencyKey: 'launch-night:812',
    type: 'LAUNCH_NIGHT',
    priority: 'MAJOR',
    availableAtAbsoluteWeek: 812,
    title: 'Duplicate',
    factIds: [checkpointFactId],
});
const missingFactScene = queueOwnedStreamingCinematic(withScene, {
    idempotencyKey: 'invented-scene:812',
    type: 'BREAKOUT_HIT',
    priority: 'IMPORTANT',
    availableAtAbsoluteWeek: 812,
    title: 'Invented result',
    factIds: ['missing-fact'],
});

assert(withScene.cinematicQueue.length === 1, 'A cinematic should be queued from a committed simulation fact.');
assert(duplicateScene.cinematicQueue.length === 1, 'Cinematic idempotency keys should prevent duplicate scenes.');
assert(missingFactScene.cinematicQueue.length === 1, 'Cinematics without committed facts should be rejected.');
assert(!JSON.stringify(withScene).includes('function'), 'The cinematic queue should remain serializable plain data.');

const oversized = compactOwnedStreamingPlatformForPersistence({
    ...withScene,
    weeklyHistory: Array.from({ length: 180 }, (_, absoluteWeek) => ({
        ...activeFoundation.metrics,
        id: `history_${absoluteWeek}`,
        absoluteWeek,
        causeMarkers: [],
    })),
    eventLedger: Array.from({ length: 400 }, (_, absoluteWeek) => ({
        id: `event_${absoluteWeek}`,
        idempotencyKey: `event-key:${absoluteWeek}`,
        absoluteWeek,
        type: 'WEEK_CHECKPOINT',
        summary: `Week ${absoluteWeek}`,
        source: 'WEEK_PROCESSOR',
    })),
    cinematicQueue: Array.from({ length: 40 }, (_, index) => ({
        id: `scene_${index}`,
        idempotencyKey: `scene-key:${index}`,
        type: 'MILESTONE',
        status: 'QUEUED',
        priority: 'STANDARD',
        availableAtAbsoluteWeek: index,
        title: `Scene ${index}`,
        factIds: [`event_${399 - index}`],
    })),
});
assert(oversized.weeklyHistory.length === OWNED_STREAMING_WEEKLY_HISTORY_LIMIT, 'Persistence should cap weekly graph history.');
assert(oversized.eventLedger.length <= OWNED_STREAMING_EVENT_LEDGER_LIMIT, 'Persistence should cap the simulation ledger.');
assert(oversized.cinematicQueue.length <= OWNED_STREAMING_CINEMATIC_QUEUE_LIMIT, 'Persistence should cap cinematic events.');

const preservedQueuedFact = compactOwnedStreamingPlatformForPersistence({
    ...activeFoundation,
    eventLedger: Array.from({ length: 400 }, (_, absoluteWeek) => ({
        id: `old-event_${absoluteWeek}`,
        idempotencyKey: `old-event-key:${absoluteWeek}`,
        absoluteWeek,
        type: 'WEEK_CHECKPOINT',
        summary: `Week ${absoluteWeek}`,
        source: 'WEEK_PROCESSOR',
    })),
    cinematicQueue: [{
        id: 'legacy_scene',
        idempotencyKey: 'legacy-scene',
        type: 'MILESTONE',
        status: 'QUEUED',
        priority: 'MAJOR',
        availableAtAbsoluteWeek: 400,
        title: 'A queued legacy moment',
        factIds: ['old-event_0'],
    }],
});
assert(
    preservedQueuedFact.eventLedger.some(entry => entry.id === 'old-event_0')
        && preservedQueuedFact.cinematicQueue.length === 1,
    'Compaction should retain an older fact while a queued cinematic still references it.',
);

const playerForCompaction: Player = {
    ...clone(INITIAL_PLAYER),
    id: 'compaction-test',
    ownedStreamingPlatform: oversized,
};
const compactedPlayer = compactPlayerForPersistence(playerForCompaction);
assert(
    compactedPlayer.ownedStreamingPlatform.weeklyHistory.length <= OWNED_STREAMING_WEEKLY_HISTORY_LIMIT,
    'Central player persistence should compact the owned platform state.',
);

const freeAccess = resolveStreamingAccess({
    commercialPolicy: 'DEVELOPMENT_FREE',
    eligibilityStatus: 'ELIGIBLE',
    entitlementStatus: 'MISSING',
    platformLifecycle: 'ELIGIBLE',
});
const paidAccess = resolveStreamingAccess({
    commercialPolicy: 'REQUIRES_CORE_ENTITLEMENT',
    eligibilityStatus: 'ELIGIBLE',
    entitlementStatus: 'MISSING',
    platformLifecycle: 'ELIGIBLE',
});
const pendingAccess = resolveStreamingAccess({
    commercialPolicy: 'REQUIRES_CORE_ENTITLEMENT',
    eligibilityStatus: 'ELIGIBLE',
    entitlementStatus: 'PENDING',
    platformLifecycle: 'ELIGIBLE',
});
const careerLocked = resolveStreamingAccess({
    commercialPolicy: 'DEVELOPMENT_FREE',
    eligibilityStatus: 'LOCKED',
    entitlementStatus: 'GRANTED',
    platformLifecycle: 'LOCKED',
});

assert(freeAccess.canBeginFounding && !freeAccess.shouldOfferPurchase, 'Development mode should allow free founding.');
assert(!paidAccess.canEnter && paidAccess.shouldOfferPurchase, 'A future paid policy should request only the core entitlement.');
assert(pendingAccess.viewState === 'CHECKING_ACCESS', 'Pending entitlement checks need an explicit loading state.');
assert(careerLocked.viewState === 'CAREER_LOCKED' && !careerLocked.shouldOfferPurchase, 'Payment must not bypass career requirements.');
assert(activeFoundation.capacity.baselineConcurrentStreams === 0, 'Access resolution must not grant server capacity.');

console.log('Owned streaming Phase 1 foundation audit passed.');
