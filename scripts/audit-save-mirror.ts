import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { prepareLocalStorageMirror } from '../services/saveMirror';

const large = structuredClone(INITIAL_PLAYER) as Player;
large.world.streamingRightsContracts = Object.fromEntries(
    Array.from({ length: 1_501 }, (_, index) => [`contract-${index}`, { id: `contract-${index}` }]),
) as Player['world']['streamingRightsContracts'];
let largeSerializeCalls = 0;
const largePlan = prepareLocalStorageMirror(large, 600_000, () => {
    largeSerializeCalls += 1;
    return 'should-not-run';
});
assert.equal(largePlan.kind, 'METADATA_ONLY');
assert.equal(largeSerializeCalls, 0, 'Clearly oversized saves must skip full JSON serialization.');

let smallSerializeCalls = 0;
const smallPlan = prepareLocalStorageMirror(structuredClone(INITIAL_PLAYER) as Player, 600_000, value => {
    smallSerializeCalls += 1;
    return JSON.stringify(value);
});
assert.equal(smallPlan.kind, 'FULL');
assert.equal(smallSerializeCalls, 1);
assert.ok(smallPlan.kind === 'FULL' && smallPlan.serialized.length > 0);

const overBudgetPlan = prepareLocalStorageMirror(structuredClone(INITIAL_PLAYER) as Player, 5, () => 'too-large');
assert.equal(overBudgetPlan.kind, 'METADATA_ONLY');

console.log('Save mirror audit passed.');
