import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type LifeEvent, type Player, type ScheduledEvent } from '../types';
import { prepareVerifiedPlayerForPersistence } from '../services/savePreparation';
import { resolveLifeEventChoice } from '../services/lifeEventResolver';

const source = structuredClone(INITIAL_PLAYER) as Player;
source.id = 'life-event-serialization-player';
source.money = 50_000;
source.stats.fame = 10;

const lifeEvent: LifeEvent = {
    id: 'serialization_contract_event',
    type: 'LIFE',
    title: 'Serializable choice contract',
    description: 'Exercises exact and deterministic life-event outcomes.',
    category: 'QA',
    options: [
        {
            label: 'Take the exact deal',
            labelKey: 'qa.lifeEvent.exactDeal',
            impact: player => {
                player.money -= 4_250;
                player.stats.fame += 6;
                return {
                    updatedPlayer: player,
                    log: 'The exact deal was applied.',
                    effects: [{ label: 'Cash', value: '-$4,250', tone: 'negative' }],
                };
            },
        },
        {
            label: 'Take the deterministic risk',
            labelKey: 'qa.lifeEvent.deterministicRisk',
            impact: player => {
                const fameGain = Math.random() < 0.5 ? 3 : 11;
                player.stats.fame += fameGain;
                return {
                    updatedPlayer: player,
                    log: `Deterministic fame gain: ${fameGain}`,
                };
            },
        },
    ],
};
const scheduledEvent: ScheduledEvent = {
    id: 'scheduled_serialization_contract_event',
    week: source.currentWeek,
    type: 'LIFE_EVENT',
    title: lifeEvent.title,
    data: { lifeEvent },
};
source.pendingEvents = [scheduledEvent];

const prepared = prepareVerifiedPlayerForPersistence(source, 'PROCESS_WEEK');
const runtimeEvent = prepared.runtimePlayer.pendingEvents![0];
const persistedEvent = prepared.persistedPlayer.pendingEvents![0];
const runtimeOptions = runtimeEvent.data.lifeEvent.options;
const persistedOptions = persistedEvent.data.lifeEvent.options;

assert.equal(runtimeEvent.data.lifeEvent.eventSchemaVersion, 1);
assert.equal(persistedEvent.data.lifeEvent.eventSchemaVersion, 1);
assert.equal(runtimeOptions.length, 2);
assert.equal(typeof runtimeOptions[0].impact, 'function', 'The compatibility callback must remain in memory.');
assert.equal(typeof persistedOptions[0].impact, 'undefined', 'The callback must never enter the save.');
assert.match(persistedOptions[0].id, /^option_/);
assert.equal(persistedOptions[0].impactId, 'MATERIALIZED_PATCH_V1');
assert.equal(typeof persistedOptions[0].resolutionSeed, 'string');
assert(Array.isArray(persistedOptions[0].impactPayload?.patches));
assert(
    JSON.stringify(persistedOptions[0].impactPayload).length < 5_000,
    'A small choice must persist a bounded patch rather than a duplicate player snapshot.',
);
assert(
    persistedOptions[0].impactPayload?.patches.every((patch: { path: Array<string | number> }) => patch.path[0] !== 'pendingEvents'),
    'A choice payload must not embed or replace the pending-event queue.',
);

const reloadedPlayer = JSON.parse(JSON.stringify(prepared.persistedPlayer)) as Player;
const reloadedEvent = reloadedPlayer.pendingEvents![0];
const reloadedLifeEvent = reloadedEvent.data.lifeEvent as LifeEvent;
const exactResult = resolveLifeEventChoice(
    reloadedPlayer,
    reloadedEvent,
    reloadedLifeEvent,
    reloadedLifeEvent.options[0],
    0,
);
assert(exactResult, 'A serialized option must resolve after JSON save/reload.');
assert.equal(exactResult.updatedPlayer.money, 45_750);
assert.equal(exactResult.updatedPlayer.stats.fame, 16);
assert.equal(exactResult.log, 'The exact deal was applied.');
assert.deepEqual(exactResult.effects, [{ label: 'Cash', value: '-$4,250', tone: 'negative' }]);

const randomOption = reloadedLifeEvent.options[1];
const firstRandomResult = resolveLifeEventChoice(
    JSON.parse(JSON.stringify(prepared.persistedPlayer)) as Player,
    reloadedEvent,
    reloadedLifeEvent,
    randomOption,
    1,
);
const secondRandomResult = resolveLifeEventChoice(
    JSON.parse(JSON.stringify(prepared.persistedPlayer)) as Player,
    reloadedEvent,
    reloadedLifeEvent,
    randomOption,
    1,
);
assert(firstRandomResult && secondRandomResult);
assert.equal(firstRandomResult.updatedPlayer.stats.fame, secondRandomResult.updatedPlayer.stats.fame);
assert.equal(firstRandomResult.log, secondRandomResult.log);
assert([13, 21].includes(firstRandomResult.updatedPlayer.stats.fame));

console.log('Life-event serialization and reload audit passed.');
