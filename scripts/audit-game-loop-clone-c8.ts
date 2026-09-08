import assert from 'node:assert/strict';
import { clonePlayerForWeekProcessing } from '../services/gameLoopClone';
import { buildLateGameWeekPerformanceFixture } from './fixtures/lateGameWeekPerformanceFixture';

const fixture = buildLateGameWeekPerformanceFixture();
const expected = JSON.parse(JSON.stringify(fixture));
const actual = clonePlayerForWeekProcessing(fixture);
assert.deepEqual(actual, expected, 'fast weekly clone must retain the exact JSON-clone contract');
assert.notEqual(actual, fixture);
assert.notEqual(actual.world, fixture.world);

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
