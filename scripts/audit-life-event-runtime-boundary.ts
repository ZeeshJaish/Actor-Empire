import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { prepareVerifiedPlayerForPersistence } from '../services/savePreparation';

const source = structuredClone(INITIAL_PLAYER) as Player;
source.id = 'life-event-runtime-boundary-player';
source.money = 100_000;
source.stats.fame = 20;

const applyExactChoice = (current: Player) => ({
    updatedPlayer: {
        ...current,
        money: current.money - 3_750,
        stats: {
            ...current.stats,
            fame: current.stats.fame + 7,
        },
    },
    log: 'The exact life-event impact was applied.',
});

source.pendingEvents = [{
    id: 'life_event_runtime_boundary',
    type: 'LIFE_EVENT',
    week: source.currentWeek,
    title: 'Runtime boundary regression',
    data: {
        lifeEvent: {
            id: 'life_event_runtime_boundary',
            title: 'Runtime boundary regression',
            description: 'Verifies that saving cannot remove live choice behavior.',
            category: 'CAREER',
            options: [{
                id: 'pay_exact_cost',
                label: 'Pay the exact cost',
                description: 'Spend $3,750 and gain 7 fame.',
                impact: applyExactChoice,
            }],
        },
    },
}] as Player['pendingEvents'];

const prepared = prepareVerifiedPlayerForPersistence(source, 'PROCESS_WEEK');
const persistedImpact = prepared.persistedPlayer.pendingEvents?.[0]?.data?.lifeEvent?.options?.[0]?.impact;

assert.equal(
    typeof persistedImpact,
    'undefined',
    'The persistence snapshot must remain JSON-safe and must not retain executable callbacks.',
);
assert.doesNotThrow(
    () => JSON.stringify(prepared.persistedPlayer),
    'The persistence snapshot must remain serializable.',
);

const runtimePlayer = (prepared as typeof prepared & { runtimePlayer?: Player }).runtimePlayer;
assert(runtimePlayer, 'Save preparation must return a separate runtime player.');

const runtimeImpact = runtimePlayer.pendingEvents?.[0]?.data?.lifeEvent?.options?.[0]?.impact;
assert.equal(
    typeof runtimeImpact,
    'function',
    'The runtime player must retain the real life-event impact after preparing the save.',
);

const resolved = runtimeImpact!(runtimePlayer);
assert.equal(resolved.updatedPlayer.money, 96_250, 'The exact money impact must survive the save boundary.');
assert.equal(resolved.updatedPlayer.stats.fame, 27, 'The exact fame impact must survive the save boundary.');
assert.equal(resolved.log, 'The exact life-event impact was applied.');

console.log('Life-event runtime boundary audit passed.');
