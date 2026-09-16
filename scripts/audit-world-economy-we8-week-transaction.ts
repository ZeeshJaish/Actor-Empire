import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player, type WorldEconomyValidationResult } from '../types';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { migratePlayerSave } from '../services/saveMigration';
import { WorldEconomyIntegrityError } from '../services/worldEconomy/worldEconomyIntegrity';

const makePlayer = (id: string): Player => {
    const player = structuredClone(INITIAL_PLAYER) as Player;
    player.id = id;
    player.age = 28;
    player.currentWeek = 11;
    return migratePlayerSave(player);
};

const valid: WorldEconomyValidationResult = { status: 'VALID', violations: [] };
const repairable: WorldEconomyValidationResult = {
    status: 'REBUILD_DERIVED',
    violations: [{ code: 'WE7_PAID_ACCOUNTS_MISMATCH', system: 'WE7', severity: 'DERIVED' }],
};
const protectedFailure: WorldEconomyValidationResult = {
    status: 'ABORT_PROTECTED',
    violations: [{ code: 'PLAYER_MONEY_NON_FINITE', system: 'WEEK', severity: 'PROTECTED' }],
};

const baseline = makePlayer('we8-week-valid');
const baselineJson = JSON.stringify(baseline);
let validCalls = 0;
const validResult = await processGameWeek(baseline, {
    validateWorldEconomy: () => {
        validCalls += 1;
        return valid;
    },
});
assert.equal(validCalls, 1, 'a valid candidate is checked exactly once');
assert.equal(getAbsoluteWeek(validResult.player.age, validResult.player.currentWeek), getAbsoluteWeek(baseline.age, baseline.currentWeek) + 1);
assert.equal(JSON.stringify(baseline), baselineJson, 'week processing never mutates its authoritative input');

const repairPlayer = makePlayer('we8-week-repair');
let repairValidationCalls = 0;
let repairCalls = 0;
const repairStages: string[] = [];
const repairedResult = await processGameWeek(repairPlayer, {
    onStage: stage => repairStages.push(stage),
    validateWorldEconomy: () => (++repairValidationCalls === 1 ? repairable : valid),
    repairWorldEconomy: candidate => {
        repairCalls += 1;
        return candidate;
    },
});
assert.equal(repairValidationCalls, 2, 'a repaired candidate receives one final validation');
assert.equal(repairCalls, 1, 'derived state is rebuilt at most once');
assert.equal(getAbsoluteWeek(repairedResult.player.age, repairedResult.player.currentWeek), getAbsoluteWeek(repairPlayer.age, repairPlayer.currentWeek) + 1);
assert.ok(repairStages.includes('world_integrity_start'));
assert.ok(repairStages.includes('world_integrity_repair'));
assert.ok(repairStages.includes('world_integrity_done'));

const protectedPlayer = makePlayer('we8-week-protected');
const protectedJson = JSON.stringify(protectedPlayer);
await assert.rejects(
    () => processGameWeek(protectedPlayer, { validateWorldEconomy: () => protectedFailure }),
    error => error instanceof WorldEconomyIntegrityError && error.codes.includes('PLAYER_MONEY_NON_FINITE'),
);
assert.equal(JSON.stringify(protectedPlayer), protectedJson, 'a rejected candidate cannot alter the current save');
assert.equal(getAbsoluteWeek(protectedPlayer.age, protectedPlayer.currentWeek), getAbsoluteWeek(JSON.parse(protectedJson).age, JSON.parse(protectedJson).currentWeek));

console.log('World economy WE8 atomic week transaction audit passed.');
