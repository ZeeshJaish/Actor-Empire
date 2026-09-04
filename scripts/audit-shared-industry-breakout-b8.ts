import assert from 'node:assert/strict';
import { runSharedIndustryB8Scenario } from './helpers/sharedIndustryB8Runner';
import { SHARED_INDUSTRY_B8_SCENARIO_SEEDS } from './helpers/sharedIndustryB8Scenarios';

const result = await runSharedIndustryB8Scenario({
    regime: 'BOOM',
    seed: SHARED_INDUSTRY_B8_SCENARIO_SEEDS.BOOM,
    horizonWeeks: 520,
    checkpointWeeks: [520],
    progressEveryWeeks: 520,
});

assert.ok(
    (result.report.experience?.smallRegionalBreakouts || 0) >= 1,
    'the Boom fixture must demonstrate at least one small/regional challenger breakout without guaranteeing every entrant succeeds',
);

console.log('Shared Industry B8 challenger breakout audit passed.');
