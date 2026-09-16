import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const bundlePath = process.argv[2];
if (!bundlePath) throw new Error('Compiled late-game performance audit path is required.');

const reports = [];
for (let run = 1; run <= 3; run += 1) {
    const result = spawnSync(process.execPath, ['--expose-gc', bundlePath], {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: { ...process.env, LATE_GAME_PERFORMANCE_WORKER: '1' },
    });
    if (result.status !== 0) {
        process.stdout.write(result.stdout || '');
        process.stderr.write(result.stderr || '');
        process.exit(result.status || 1);
    }
    const line = (result.stdout || '').split('\n')
        .find(candidate => candidate.startsWith('LATE_GAME_PERFORMANCE_REPORT='));
    if (!line) throw new Error(`Performance worker ${run} did not return a report.`);
    reports.push(JSON.parse(line.slice('LATE_GAME_PERFORMANCE_REPORT='.length)));
}

const p95Runs = reports.map(report => report.total.p95Ms).sort((left, right) => left - right);
const medianP95Ms = p95Runs[1];
const medianReport = reports.find(report => report.total.p95Ms === medianP95Ms) || reports[1];
const legacyMedianP95Ms = [...reports]
    .map(report => report.legacyEquivalentTotal.p95Ms)
    .sort((left, right) => left - right)[1];

console.log(JSON.stringify({
    evidenceClass: 'three-isolated-process-median',
    runs: reports.length,
    p95RunsMs: p95Runs,
    p95RangeMs: [p95Runs[0], p95Runs[p95Runs.length - 1]],
    medianP95Ms,
    medianLegacyEquivalentP95Ms: legacyMedianP95Ms,
    representative: medianReport,
}, null, 2));

assert.ok(medianP95Ms <= 350, `Median late-game p95 ${medianP95Ms}ms exceeds the 350ms desktop budget.`);
assert.ok(reports.every(report => report.total.p95Ms <= 1_000), 'Every isolated run must remain below the 1000ms safety ceiling.');
assert.ok(
    medianP95Ms <= legacyMedianP95Ms * .65,
    `Median late-game p95 must improve by at least 35%; current ${medianP95Ms}ms vs ${legacyMedianP95Ms}ms legacy-equivalent.`,
);

console.log('Late-game week performance audit passed across three isolated runs.');
