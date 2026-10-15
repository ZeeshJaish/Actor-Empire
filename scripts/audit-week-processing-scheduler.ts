import assert from 'node:assert/strict';
import { yieldForWeekProcessingPaint } from '../services/weekProcessingScheduler';

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

console.log('Week processing scheduler audit passed.');
