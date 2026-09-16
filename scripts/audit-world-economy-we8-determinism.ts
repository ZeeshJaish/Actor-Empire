import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { migratePlayerSave } from '../services/saveMigration';
import {
    createWeekScopedRng,
    createWeekSimulationSeed,
    getCanonicalWorldEconomyDigest,
} from '../services/weekProcessingDeterminism';

const makePlayer = (): Player => {
    const player = structuredClone(INITIAL_PLAYER) as Player;
    player.id = 'we8-determinism';
    player.age = 31;
    player.currentWeek = 20;
    return migratePlayerSave(player);
};

const source = makePlayer();
const targetWeek = getAbsoluteWeek(source.age, source.currentWeek) + 1;
const seed = createWeekSimulationSeed(source, targetWeek);
assert.equal(seed, createWeekSimulationSeed(JSON.parse(JSON.stringify(source)), targetWeek), 'save/reload keeps the same week seed');
assert.deepEqual(
    Array.from({ length: 8 }, () => createWeekScopedRng(seed, 'WE8')()),
    Array.from({ length: 8 }, () => createWeekScopedRng(seed, 'WE8')()),
    'same seed and scope replay exactly',
);
assert.notEqual(createWeekScopedRng(seed, 'WE7')(), createWeekScopedRng(seed, 'WE8')(), 'scopes are isolated');

const originalRandom = Math.random;
const originalNow = Date.now;
const runWithEnvironment = async (randomValue: number, nowValue: number, player = source): Promise<Player> => {
    Math.random = () => randomValue;
    Date.now = () => nowValue;
    try {
        return (await processGameWeek(player)).player;
    } finally {
        Math.random = originalRandom;
        Date.now = originalNow;
    }
};

const first = await runWithEnvironment(0.11, 1_700_000_000_000);
const second = await runWithEnvironment(0.89, 2_000_000_000_000, JSON.parse(JSON.stringify(source)));
assert.deepEqual(
    getCanonicalWorldEconomyDigest(first),
    getCanonicalWorldEconomyDigest(second),
    'WE1-WE7 outcomes do not depend on wall clock or ambient randomness',
);

const failedInput = JSON.parse(JSON.stringify(source)) as Player;
const failedJson = JSON.stringify(failedInput);
await assert.rejects(() => processGameWeek(failedInput, {
    validateWorldEconomy: () => ({
        status: 'ABORT_PROTECTED',
        violations: [{ code: 'INJECTED_FAILURE', system: 'WEEK', severity: 'PROTECTED' }],
    }),
}));
assert.equal(JSON.stringify(failedInput), failedJson, 'injected pre-return failure leaves the retry source unchanged');
const retried = await runWithEnvironment(0.42, 2_100_000_000_000, failedInput);
const direct = await runWithEnvironment(0.73, 2_200_000_000_000, JSON.parse(failedJson));
assert.deepEqual(getCanonicalWorldEconomyDigest(retried), getCanonicalWorldEconomyDigest(direct), 'failed-then-retried WE state equals a direct replay');

console.log('World economy WE8 deterministic retry and reload audit passed.');
