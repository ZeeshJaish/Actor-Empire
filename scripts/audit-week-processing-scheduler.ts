import assert from 'node:assert/strict';
import {
    createCooperativeTaskController,
    yieldForWeekProcessingPaint,
} from '../services/weekProcessingScheduler';

const events: string[] = [];
const pending = yieldForWeekProcessingPaint(callback => {
    events.push('frame-scheduled');
    callback(0);
});
events.push('caller-returned');
await pending;
events.push('processing-started');

assert.deepEqual(events, ['frame-scheduled', 'caller-returned', 'processing-started']);

const stalledStartedAt = performance.now();
await yieldForWeekProcessingPaint(
    () => undefined,
    { fallbackMs: 8 },
);
assert(
    performance.now() - stalledStartedAt < 250,
    'A browser frame callback that never arrives must not permanently block week processing.',
);

await yieldForWeekProcessingPaint(
    () => { throw new Error('frame scheduler unavailable'); },
    { fallbackMs: 8 },
);

let nowMs = 100;
let yieldCount = 0;
const controller = createCooperativeTaskController({
    budgetMs: 32,
    now: () => nowMs,
    yieldTask: async () => {
        yieldCount += 1;
        nowMs += 1;
    },
});

nowMs = 120;
assert.equal(await controller.checkpoint(), false, 'short work should stay in the current task');
assert.equal(yieldCount, 0);

nowMs = 133;
assert.equal(await controller.checkpoint(), true, 'work beyond the budget should yield');
assert.equal(yieldCount, 1);

nowMs = 150;
assert.equal(await controller.checkpoint(), false, 'the budget should restart after yielding');

nowMs = 190;
controller.reset();
nowMs = 210;
assert.equal(await controller.checkpoint(), false, 'reset should begin a fresh work budget');

console.log('Week processing scheduler audit passed.');
