import assert from 'node:assert/strict';
import { runSharedIndustryB8Scenario } from './helpers/sharedIndustryB8Runner';

const result = await runSharedIndustryB8Scenario({
    regime: 'BASELINE',
    seed: 'b8-parity-25-year',
    horizonWeeks: 1_404,
    checkpointWeeks: [1_300, 1_404],
    resumeAtWeek: 1_300,
    progressEveryWeeks: 260,
});

assert.equal(result.processedWeeks, 1_404);
assert.equal(result.doubleProcessedWeeks, 0);
assert.equal(result.resumeDigest, result.uninterruptedDigest);
assert.equal(result.report.integrity.missingCheckpoints, 0);
assert.equal(result.report.integrity.duplicateProjectIds, 0);
assert.equal(result.report.integrity.duplicateProductionIds, 0);
assert.equal(result.report.integrity.danglingProjectReferences, 0);
assert.ok(Object.keys(result.player.world.streamingRightsContracts || {}).length > 0,
    'the parity save must exercise canonical streaming-rights records');

console.log('Shared Industry B8 25-year save/resume parity audit passed.');
