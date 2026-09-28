import assert from 'node:assert/strict';
import {
    INITIAL_PLAYER,
    type LifeEvent,
    type LifeEventOption,
    type Player,
    type ScheduledEvent,
} from '../types';
import {
    createSafeLifeEventFallback,
    resolveLifeEventChoiceWithSafeFallback,
} from '../services/lifeEventSafeFallback';
import { commitLifeEventResolutionTransaction } from '../services/lifeEventResolutionTransaction';

const playerFixture = (id: string): Player => {
    const player = structuredClone(INITIAL_PLAYER) as Player;
    player.id = id;
    player.money = 8_000_000;
    player.stats.fame = 50;
    player.stats.reputation = 50;
    player.stats.happiness = 50;
    player.logs = [];
    player.pendingEvents = [];
    player.relationships = [{
        id: 'partner-1',
        npcId: 'npc-1',
        name: 'Alex',
        relation: 'Partner',
        closeness: 80,
        image: '',
        lastInteractionWeek: 0,
        age: 30,
        gender: 'NON_BINARY',
    }];
    return player;
};

const eventFixture = (id: string, lifeEvent: LifeEvent): ScheduledEvent => ({
    id,
    week: 1,
    type: 'LIFE_EVENT',
    title: lifeEvent.title,
    data: { lifeEvent },
});

const fallbackFor = (
    player: Player,
    option: LifeEventOption,
    suffix: string,
) => {
    const lifeEvent: LifeEvent = {
        id: `fallback-${suffix}`,
        type: 'LIFE',
        title: 'Fallback contract',
        description: 'Exercises the bounded recovery path.',
        options: [option],
    };
    const event = eventFixture(`fallback-event-${suffix}`, lifeEvent);
    return {
        event,
        result: createSafeLifeEventFallback(
            player,
            event,
            lifeEvent,
            option,
            0,
            'TEST_RESOLVER_FAILURE',
        ),
    };
};

// Explicit author intent is allowed, but even an oversized value is capped to one point.
const explicitPlayer = playerFixture('explicit-fallback-player');
const explicitBefore = structuredClone(explicitPlayer);
const explicit = fallbackFor(explicitPlayer, {
    id: 'TAKE_THE_STAGE',
    label: 'Take the stage',
    safeFallback: {
        statDeltas: { fame: 25 },
        log: 'You stayed composed and kept the moment moving.',
    },
}, 'explicit');
assert.equal(explicit.result.resolutionKind, 'SAFE_FALLBACK');
assert.equal(explicit.result.updatedPlayer.stats.fame, 51);
assert.equal(explicit.result.updatedPlayer.stats.reputation, 50);
assert.equal(explicit.result.fallbackReason, 'TEST_RESOLVER_FAILURE');
assert.equal(explicit.result.effects?.[0]?.labelKey, 'life.effect.fame');
assert.equal(explicit.result.effects?.[0]?.value, '+1');
assert.deepEqual(explicitPlayer, explicitBefore, 'Fallback resolution must not mutate the source player.');

// Approved structured preview metadata can preserve only direction, never the original magnitude.
const previewPlayer = playerFixture('preview-fallback-player');
const preview = fallbackFor(previewPlayer, {
    id: 'OWN_THE_MISTAKE',
    label: 'Own the mistake',
    previewEffects: [{
        label: 'Reputation',
        labelKey: 'life.effect.reputation',
        value: '-12',
        tone: 'negative',
    }],
}, 'preview');
assert.equal(preview.result.updatedPlayer.stats.reputation, 49);
assert.equal(preview.result.updatedPlayer.stats.fame, 50);
assert.equal(preview.result.effects?.[0]?.value, '-1');

// Player-facing English is never parsed: dangerous text without structured metadata becomes a no-op.
const textOnlyPlayer = playerFixture('text-only-fallback-player');
const textOnlyBefore = structuredClone(textOnlyPlayer);
const textOnly = fallbackFor(textOnlyPlayer, {
    id: 'PAY_AND_BREAK_UP',
    label: 'Pay $5M and break up with your partner',
    description: 'Transfer ownership of the studio and accept the lawsuit.',
}, 'text-only');
assert.equal(textOnly.result.resolutionKind, 'SAFE_FALLBACK');
assert.deepEqual(textOnly.result.updatedPlayer, textOnlyBefore);
assert.equal(textOnly.result.effects?.length, 0);

// Unsupported signals and malformed numeric values are ignored instead of widening the mutation surface.
const unsafePlayer = playerFixture('unsafe-fallback-player');
const unsafeBefore = structuredClone(unsafePlayer);
const unsafe = fallbackFor(unsafePlayer, {
    id: 'UNSAFE_METADATA',
    label: 'Unsafe metadata',
    previewEffects: [
        { label: 'Money', labelKey: 'life.effect.money', value: '+5000000' },
        { label: 'Fame', labelKey: 'life.effect.fame', value: 'NaN' },
    ],
}, 'unsafe');
assert.deepEqual(unsafe.result.updatedPlayer, unsafeBefore);
assert.equal(unsafe.result.effects?.length, 0);

// The production failover wrapper must convert a thrown primary resolver into a usable result.
const thrownPlayer = playerFixture('thrown-resolver-player');
const thrownOption: LifeEventOption = {
    id: 'KEEP_GOING',
    label: 'Keep going',
    previewEffects: [{
        label: 'Happiness',
        labelKey: 'life.effect.happiness',
        value: '+50',
    }],
};
const thrownLifeEvent: LifeEvent = {
    id: 'thrown-resolver-event',
    type: 'LIFE',
    title: 'Resolver failure',
    description: 'The primary resolver throws.',
    options: [thrownOption],
};
const thrownEvent = eventFixture('thrown-resolver-scheduled-event', thrownLifeEvent);
const recovered = resolveLifeEventChoiceWithSafeFallback(
    thrownPlayer,
    thrownEvent,
    thrownLifeEvent,
    thrownOption,
    0,
    candidate => {
        candidate.money = 1;
        candidate.stats.fame = 99;
        candidate.relationships = [];
        throw new RangeError('broken payload');
    },
);
assert.equal(recovered.result.resolutionKind, 'SAFE_FALLBACK');
assert.equal(recovered.result.updatedPlayer.stats.happiness, 51);
assert.equal(recovered.result.updatedPlayer.stats.fame, 50);
assert.equal(recovered.result.updatedPlayer.money, 8_000_000);
assert.equal(recovered.result.updatedPlayer.relationships.length, 1);
assert.equal(thrownPlayer.money, 8_000_000, 'A failed primary resolver must not mutate its source player.');
assert.equal(thrownPlayer.stats.fame, 50);
assert.equal(thrownPlayer.relationships.length, 1);
assert.equal(recovered.primaryError instanceof RangeError, true);

// A fallback outcome uses the same exactly-once transaction and is removed only after persistence.
const transactionPlayer = playerFixture('fallback-transaction-player');
const transactionOption: LifeEventOption = {
    id: 'STAY_CALM',
    label: 'Stay calm',
    safeFallback: { statDeltas: { happiness: -7 } },
};
const transaction = fallbackFor(transactionPlayer, transactionOption, 'transaction');
transactionPlayer.pendingEvents = [transaction.event];
const transactionalResult = createSafeLifeEventFallback(
    transactionPlayer,
    transaction.event,
    transaction.event.data.lifeEvent,
    transactionOption,
    0,
    'TEST_TRANSACTION_FAILURE',
);
let persistCalls = 0;
const committed = await commitLifeEventResolutionTransaction({
    sourcePlayer: transactionPlayer,
    proposedPlayer: transactionalResult.updatedPlayer,
    event: transaction.event,
    optionId: 'STAY_CALM',
    resolutionKind: transactionalResult.resolutionKind!,
    log: transactionalResult.log,
    persist: async candidate => {
        persistCalls += 1;
        return structuredClone(candidate);
    },
});
assert.equal(persistCalls, 1);
assert.equal(committed.player.stats.happiness, 49);
assert.equal(committed.player.pendingEvents?.length, 0);
assert.equal(committed.receipt.resolutionKind, 'SAFE_FALLBACK');

// If saving fails, the original queued event and original state remain intact for a safe retry.
const failedPlayer = playerFixture('fallback-save-failure-player');
const failed = fallbackFor(failedPlayer, transactionOption, 'save-failure');
failedPlayer.pendingEvents = [failed.event];
const failedResult = createSafeLifeEventFallback(
    failedPlayer,
    failed.event,
    failed.event.data.lifeEvent,
    transactionOption,
    0,
    'TEST_SAVE_FAILURE',
);
await assert.rejects(
    commitLifeEventResolutionTransaction({
        sourcePlayer: failedPlayer,
        proposedPlayer: failedResult.updatedPlayer,
        event: failed.event,
        optionId: 'STAY_CALM',
        resolutionKind: failedResult.resolutionKind!,
        log: failedResult.log,
        persist: async () => { throw new Error('save unavailable'); },
    }),
    /save unavailable/,
);
assert.equal(failedPlayer.stats.happiness, 50);
assert.equal(failedPlayer.pendingEvents?.length, 1);
assert.equal(failedPlayer.flags.lifeEventResolutionReceipts, undefined);

console.log('Life-event automatic safe fallback audit passed.');
