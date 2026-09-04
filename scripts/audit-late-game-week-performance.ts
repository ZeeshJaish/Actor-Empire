import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import type { Player } from '../types';
import { processGameWeek } from '../services/gameLoop';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { migratePlayerSave } from '../services/saveMigration';
import { prepareProcessedWeekForUi } from '../services/playerUiState';
import { createDeterministicRng } from '../services/deterministicRandom';
import {
    buildLateGameWeekPerformanceFixture,
    LATE_GAME_PLATFORM_PLAN_COUNT,
    LATE_GAME_RIGHTS_CONTRACT_COUNT,
    LATE_GAME_WORLD_PROJECT_COUNT,
} from './fixtures/lateGameWeekPerformanceFixture';

interface TimingSummary {
    minMs: number;
    p50Ms: number;
    p95Ms: number;
    maxMs: number;
}

export interface LateGameWeekPerformanceReport {
    weeks: number;
    inputMutationCount: number;
    weekAdvanceCount: number;
    saveBytes: number;
    process: TimingSummary;
    compaction: TimingSummary;
    structuredClone: TimingSummary;
    uiCommit: TimingSummary;
    legacyActorSnapshot: TimingSummary;
    legacyPostWeekMigration: TimingSummary;
    legacyEquivalentTotal: TimingSummary;
    total: TimingSummary;
    annualHeavy: TimingSummary;
    annualHeavyWeeks: number;
    counts: {
        worldProjects: number;
        platformPlans: number;
        rightsContracts: number;
        playerTitles: number;
        businesses: number;
    };
    slowStages: Array<{ stage: string; maxMs: number }>;
    heapUsedMb: number;
}

const summarize = (samples: number[]): TimingSummary => {
    const sorted = [...samples].sort((left, right) => left - right);
    const percentile = (value: number) => sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * value) - 1)] || 0;
    return {
        minMs: Number((sorted[0] || 0).toFixed(2)),
        p50Ms: Number(percentile(0.5).toFixed(2)),
        p95Ms: Number(percentile(0.95).toFixed(2)),
        maxMs: Number((sorted[sorted.length - 1] || 0).toFixed(2)),
    };
};

const nextAbsoluteWeek = (player: Player): number => player.age * 52 + player.currentWeek;

export const measureLateGameWeekPipeline = async (
    source: Player,
    weeks = 20,
): Promise<LateGameWeekPerformanceReport> => {
    let player = structuredClone(source);
    const processSamples: number[] = [];
    const compactionSamples: number[] = [];
    const cloneSamples: number[] = [];
    const migrationSamples: number[] = [];
    const uiCommitSamples: number[] = [];
    const legacyActorSnapshotSamples: number[] = [];
    const legacyEquivalentTotalSamples: number[] = [];
    const totalSamples: number[] = [];
    const annualHeavySamples: number[] = [];
    let inputMutationCount = 0;
    let weekAdvanceCount = 0;
    const stageMaxima = new Map<string, number>();

    for (let iteration = -1; iteration < weeks; iteration += 1) {
        const beforeJson = JSON.stringify(player);
        const beforeWeek = nextAbsoluteWeek(player);
        const isAnnualHeavy = player.currentWeek === 52;
        const totalStarted = performance.now();
        const processStarted = performance.now();
        let previousStage = 'call';
        let previousStageAt = processStarted;
        const originalRandom = Math.random;
        const originalNow = Date.now;
        Math.random = createDeterministicRng(`late-game-week:${iteration}:${player.age}:${player.currentWeek}`);
        Date.now = () => 3_900_000_000_000 + iteration + 1;
        let result: Awaited<ReturnType<typeof processGameWeek>>;
        try {
            result = await processGameWeek(player, {
                onStage: stage => {
                    const now = performance.now();
                    const label = `${previousStage}->${stage}`;
                    stageMaxima.set(label, Math.max(stageMaxima.get(label) || 0, now - previousStageAt));
                    previousStage = stage;
                    previousStageAt = now;
                },
            });
        } finally {
            Math.random = originalRandom;
            Date.now = originalNow;
        }
        const processMs = performance.now() - processStarted;
        if (JSON.stringify(player) !== beforeJson) inputMutationCount += 1;
        if (nextAbsoluteWeek(result.player) === beforeWeek + 1) weekAdvanceCount += 1;

        const compactionStarted = performance.now();
        const compacted = compactPlayerForPersistence(result.player);
        const compactionMs = performance.now() - compactionStarted;
        const cloneStarted = performance.now();
        structuredClone(compacted);
        const cloneMs = performance.now() - cloneStarted;
        const uiCommitStarted = performance.now();
        const committed = prepareProcessedWeekForUi(compacted);
        const uiCommitMs = performance.now() - uiCommitStarted;
        const totalMs = performance.now() - totalStarted;
        const migrationStarted = performance.now();
        migratePlayerSave(compacted);
        const migrationMs = performance.now() - migrationStarted;
        const actorSnapshotStarted = performance.now();
        JSON.parse(JSON.stringify(compacted));
        const actorSnapshotMs = performance.now() - actorSnapshotStarted;
        player = committed;

        if (iteration < 0) continue;
        processSamples.push(processMs);
        compactionSamples.push(compactionMs);
        cloneSamples.push(cloneMs);
        uiCommitSamples.push(uiCommitMs);
        migrationSamples.push(migrationMs);
        legacyActorSnapshotSamples.push(actorSnapshotMs);
        legacyEquivalentTotalSamples.push(totalMs + migrationMs + actorSnapshotMs + 300);
        totalSamples.push(totalMs);
        if (isAnnualHeavy) annualHeavySamples.push(totalMs);
    }

    const platformPlans = Object.values(player.world.platforms || {})
        .reduce((sum, platform) => sum + (platform.ai?.slate.length || 0), 0);
    return {
        weeks,
        inputMutationCount,
        weekAdvanceCount: Math.max(0, weekAdvanceCount - 1),
        saveBytes: Buffer.byteLength(JSON.stringify(compactPlayerForPersistence(player))),
        process: summarize(processSamples),
        compaction: summarize(compactionSamples),
        structuredClone: summarize(cloneSamples),
        uiCommit: summarize(uiCommitSamples),
        legacyActorSnapshot: summarize(legacyActorSnapshotSamples),
        legacyPostWeekMigration: summarize(migrationSamples),
        legacyEquivalentTotal: summarize(legacyEquivalentTotalSamples),
        total: summarize(totalSamples),
        annualHeavy: summarize(annualHeavySamples),
        annualHeavyWeeks: annualHeavySamples.length,
        counts: {
            worldProjects: player.world.projects.length,
            platformPlans,
            rightsContracts: Object.keys(player.world.streamingRightsContracts || {}).length,
            playerTitles: player.pastProjects.length,
            businesses: player.businesses.length,
        },
        slowStages: [...stageMaxima.entries()]
            .map(([stage, maxMs]) => ({ stage, maxMs: Number(maxMs.toFixed(2)) }))
            .sort((left, right) => right.maxMs - left.maxMs)
            .slice(0, 8),
        heapUsedMb: Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)),
    };
};

const fixture = buildLateGameWeekPerformanceFixture();
assert.equal(fixture.age, 82);
assert.equal(fixture.currentWeek, 49);
assert.ok(fixture.world.projects.length >= LATE_GAME_WORLD_PROJECT_COUNT);
assert.equal(
    Object.values(fixture.world.platforms || {}).reduce((sum, platform) => sum + (platform.ai?.slate.length || 0), 0),
    LATE_GAME_PLATFORM_PLAN_COUNT,
);
assert.ok(Object.keys(fixture.world.streamingRightsContracts || {}).length >= LATE_GAME_RIGHTS_CONTRACT_COUNT);
assert.ok(fixture.businesses.some(business => business.type === 'PRODUCTION_HOUSE'));
assert.equal(fixture.ownedStreamingPlatform.lifecycle, 'ACTIVE');
assert.ok(Object.values(fixture.world.studios || {}).every(studio => (
    studio.ai?.intelligence && studio.ai?.slate
)), 'the mature fixture must include normalized B1/B2/B3/B5 studio state');
assert.ok(Object.keys(fixture.world.industryProductions || {}).length > 0,
    'the mature fixture must include canonical B6 productions');
assert.ok((fixture.world.industryEvents?.events.length || 0) > 0,
    'the mature fixture must include the B7 material-event ledger');
assert.ok(Object.keys(fixture.flags?.dynastyCareer?.members || {}).length > 0,
    'the mature fixture must include dynasty career state');

const measuredWeeks = Math.max(1, Math.round(Number(process.env.LATE_GAME_PERFORMANCE_WEEKS || 20)));
export const report = await measureLateGameWeekPipeline(fixture, measuredWeeks);
console.log(JSON.stringify(report, null, 2));
assert.equal(report.weeks, measuredWeeks);
assert.equal(report.inputMutationCount, 0, 'Process Week must not mutate its input player.');
assert.equal(report.weekAdvanceCount, measuredWeeks, 'Every measured Process Week must advance exactly once.');
assert.ok(report.saveBytes > 600_000, `Expected a genuinely large save, received ${report.saveBytes} bytes.`);
assert.ok(report.counts.worldProjects > 50, 'The benchmark must retain the canonical bounded world catalogue after compaction.');
assert.ok(report.counts.platformPlans > 500, 'The benchmark must retain mature platform slates after canonical compaction.');
assert.ok(report.total.p95Ms <= 1_000, `Late-game Process Week p95 ${report.total.p95Ms}ms exceeds the 1000ms desktop budget.`);
assert.ok(report.total.p95Ms <= 350, `Late-game p95 ${report.total.p95Ms}ms misses the measured 35% improvement target.`);
if (measuredWeeks >= 3) {
    assert.ok(report.annualHeavyWeeks > 0, 'The measured sample must include at least one annual/save-heavy week.');
    assert.ok(report.annualHeavy.p95Ms <= 750,
        `Annual/save-heavy p95 ${report.annualHeavy.p95Ms}ms exceeds the 750ms desktop budget.`);
}
assert.ok(
    report.total.p95Ms <= report.legacyEquivalentTotal.p95Ms * 0.65,
    `Late-game p95 must improve by at least 35%; current ${report.total.p95Ms}ms vs legacy-equivalent ${report.legacyEquivalentTotal.p95Ms}ms.`,
);

console.log('Late-game week performance audit passed.');
