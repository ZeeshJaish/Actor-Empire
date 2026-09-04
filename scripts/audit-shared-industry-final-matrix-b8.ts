import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateSharedIndustryB8Experience } from './helpers/sharedIndustryB8Experience';
import type { SharedIndustryB8ExperienceMetrics, SharedIndustryB8Regime } from './helpers/sharedIndustryB8Types';

interface SharedIndustryB8CertificationSummary {
    regime: SharedIndustryB8Regime;
    horizonWeeks: number;
    experience?: SharedIndustryB8ExperienceMetrics;
    finalDigest: string;
}

const allRegimes: SharedIndustryB8Regime[] = ['BASELINE', 'LEAN', 'BOOM', 'CROWDED', 'ADVERSE'];
const reportPaths = (process.env.B8_MATRIX_REPORTS || '')
    .split(',')
    .map(path => path.trim())
    .filter(Boolean);
const expectedWeeks = Math.max(520, Math.round(Number(process.env.B8_MATRIX_WEEKS || 20_800)));

assert.equal(reportPaths.length, allRegimes.length, 'B8_MATRIX_REPORTS must contain exactly five report paths.');
const summaries = reportPaths.flatMap(path => (
    JSON.parse(readFileSync(path, 'utf8')) as SharedIndustryB8CertificationSummary[]
));
assert.equal(summaries.length, allRegimes.length, 'Each report path must contain exactly one scenario summary.');
assert.deepEqual(
    [...summaries.map(summary => summary.regime)].sort(),
    [...allRegimes].sort(),
    'The final matrix must contain every frozen B8 regime exactly once.',
);
for (const summary of summaries) {
    assert.equal(summary.horizonWeeks, expectedWeeks, `${summary.regime} did not reach the certification horizon.`);
    assert.ok(summary.experience, `${summary.regime} is missing experience metrics.`);
    assert.match(summary.finalDigest, /^[a-f0-9]{64}$/, `${summary.regime} is missing its canonical final digest.`);
}

const evaluation = evaluateSharedIndustryB8Experience(
    summaries.map(summary => summary.experience!),
);
assert.deepEqual(evaluation.violations, []);
console.log(JSON.stringify({
    horizonWeeks: expectedWeeks,
    healthy: evaluation.healthy,
    measurements: evaluation.measurements,
    finalDigests: Object.fromEntries(summaries.map(summary => [summary.regime, summary.finalDigest])),
}, null, 2));
console.log('Shared Industry B8 final five-regime certification matrix passed.');
