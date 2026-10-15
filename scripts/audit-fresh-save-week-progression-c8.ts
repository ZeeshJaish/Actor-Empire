import assert from 'node:assert/strict';
import { processGameWeek } from '../services/gameLoop';
import { prepareVerifiedPlayerForPersistence } from '../services/savePreparation';
import { migratePlayerSave } from '../services/saveMigration';
import { processRivalRetaliation } from '../services/rivalRetaliation';
import { processTalentInstability } from '../services/talentInstability';
import { processWorldReactions } from '../services/worldReactions';
import { INITIAL_PLAYER, type Player } from '../types';

const absoluteWeek = (player: Player) => (player.age * 52) + player.currentWeek;

const createDeterministicRandom = (seed = 0x00c8f00d) => {
    let state = seed >>> 0;
    return () => {
        state = ((state * 1664525) + 1013904223) >>> 0;
        return state / 0x1_0000_0000;
    };
};

let player = migratePlayerSave(structuredClone(INITIAL_PLAYER));
player = {
    ...player,
    id: 'c8_fresh_save_player',
    name: 'Fresh Save Audit',
    age: 15,
    currentWeek: 1,
    businesses: [],
    logs: [],
};

const startingAbsoluteWeek = absoluteWeek(player);
const noAcquisitionActivityPlayer = processTalentInstability(processRivalRetaliation(processWorldReactions(player)));
const noAcquisitionActivityLogs = noAcquisitionActivityPlayer.logs.filter(log => (
    /Talent Instability: .*across 0 studios/i.test(log.message)
    || /Rival Retaliation: 0% pressure, 0 defensive alliance/i.test(log.message)
    || /World Reaction: 0% scrutiny, 0% rival risk, 0% employee risk/i.test(log.message)
));
assert.deepEqual(
    noAcquisitionActivityLogs,
    [],
    'idle acquisition systems must stay out of a new player live feed',
);
const originalRandom = Math.random;
const originalNow = Date.now;
Math.random = createDeterministicRandom();
Date.now = () => 4_100_000_000_000 + absoluteWeek(player);

try {
    for (let index = 0; index < 12; index += 1) {
        const beforeWeek = absoluteWeek(player);
        const result = await processGameWeek(player);
        assert.equal(
            absoluteWeek(result.player),
            beforeWeek + 1,
            `fresh save must advance exactly once on audit week ${index + 1}`,
        );
        const prepared = prepareVerifiedPlayerForPersistence(result.player, 'AUTOSAVE');
        assert.deepEqual(
            prepared.comparison,
            { ok: true },
            `fresh save persistence must preserve protected state on audit week ${index + 1}`,
        );
        player = prepared.player;
    }
} finally {
    Math.random = originalRandom;
    Date.now = originalNow;
}

assert.equal(absoluteWeek(player), startingAbsoluteWeek + 12);
const irrelevantAcquisitionLogs = player.logs.filter(log => (
    /Talent Instability: .*across 0 studios/i.test(log.message)
    || /Rival Retaliation: 0% pressure, 0 defensive alliance/i.test(log.message)
    || /World Reaction: 0% scrutiny, 0% rival risk, 0% employee risk/i.test(log.message)
));
assert.deepEqual(
    irrelevantAcquisitionLogs,
    [],
    'a player with no studio acquisition activity must not receive zero-value acquisition-system logs',
);

console.log('C8 fresh-save weekly progression and persistence audit passed.');
