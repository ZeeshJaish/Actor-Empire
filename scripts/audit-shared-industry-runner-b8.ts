import assert from 'node:assert/strict';
import { runSharedIndustryB8Scenario } from './helpers/sharedIndustryB8Runner';

const options = {
    regime: 'BASELINE' as const,
    seed: 'runner-01',
    horizonWeeks: 104,
    checkpointWeeks: [52, 104],
    resumeAtWeek: 52,
    persistenceEveryWeeks: 26,
};
const first = await runSharedIndustryB8Scenario(options);
const replay = await runSharedIndustryB8Scenario(options);

assert.deepEqual(replay.checkpointDigests, first.checkpointDigests);
assert.equal(first.report.horizonWeeks, 104);
assert.deepEqual(first.report.checkpoints.map(item => item.absoluteWeek), [52, 104]);
assert.equal(first.resumeDigest, first.uninterruptedDigest);
assert.equal(first.doubleProcessedWeeks, 0);
assert.equal(first.processedWeeks, 104);
assert.equal(first.persistenceCompactions, 4, 'Persistence cadence should compact once per due week, including overlapping checkpoints.');
assert.equal(first.progressEvents.length, 2);
assert.deepEqual(first.progressEvents.map(item => item.absoluteWeek), [52, 104]);
assert.deepEqual(Object.keys(first.checkpointSaveBytes).map(Number), [52, 104]);
assert.ok(first.checkpointSaveBytes[104] > 0);
assert.ok(first.runtime.totalMs > 0);
assert.ok(first.runtime.weekMaxMs >= first.runtime.weekP50Ms);

console.log('Shared Industry B8 runner audit passed.');
