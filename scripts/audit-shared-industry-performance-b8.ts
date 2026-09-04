import assert from 'node:assert/strict';
import { report } from './audit-late-game-week-performance';

assert.ok(report.total.p95Ms <= 500,
    `mature complete-path p95 ${report.total.p95Ms}ms exceeds the 500ms desktop budget`);
assert.ok(report.annualHeavy.p95Ms <= 750,
    `annual/save-heavy p95 ${report.annualHeavy.p95Ms}ms exceeds the 750ms desktop budget`);
assert.ok(report.total.p95Ms * 4 <= 2_000,
    `four-times mature mobile proxy ${report.total.p95Ms * 4}ms exceeds 2000ms`);
assert.ok(report.annualHeavy.p95Ms * 4 <= 3_000,
    `four-times annual mobile proxy ${report.annualHeavy.p95Ms * 4}ms exceeds 3000ms`);
assert.equal(report.inputMutationCount, 0);
assert.equal(report.weekAdvanceCount, report.weeks);

console.log('Shared Industry B8 mature Process Week performance audit passed.');
