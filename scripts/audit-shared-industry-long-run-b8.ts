import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { assertSharedIndustryB8Integrity, SHARED_INDUSTRY_B8_CHECKPOINTS } from './helpers/sharedIndustryB8Metrics';
import { evaluateSharedIndustryB8Experience } from './helpers/sharedIndustryB8Experience';
import { runSharedIndustryB8Scenario } from './helpers/sharedIndustryB8Runner';
import { SHARED_INDUSTRY_B8_SCENARIO_SEEDS } from './helpers/sharedIndustryB8Scenarios';
import type { SharedIndustryB8Regime } from './helpers/sharedIndustryB8Types';

const allRegimes: SharedIndustryB8Regime[] = ['BASELINE', 'LEAN', 'BOOM', 'CROWDED', 'ADVERSE'];
const requested = process.env.B8_LONG_REGIME as SharedIndustryB8Regime | undefined;
const regimes = requested && allRegimes.includes(requested) ? [requested] : allRegimes;
const horizonWeeks = Math.max(520, Math.round(Number(process.env.B8_LONG_WEEKS || 20_800)));
const skipResume = process.env.B8_LONG_SKIP_RESUME === '1';
const requestedResumeAtWeek = Math.round(Number(process.env.B8_LONG_RESUME_AT || 0));
const requestedResumeComparisonWeeks = Math.round(Number(process.env.B8_LONG_COMPARE_EVERY || 0));
const requestedResumeComparisonStart = Math.round(Number(process.env.B8_LONG_COMPARE_START || 0));
const compactSummary = process.env.B8_LONG_SUMMARY === '1';
const minimalReport = process.env.B8_LONG_MINIMAL_REPORT === '1';
const reportPath = process.env.B8_LONG_REPORT_PATH?.trim();
const recordValues = <T extends object>(record: T | null | undefined): Array<T[keyof T]> => (
    Object.values(record || {}) as Array<T[keyof T]>
);
const recordEntries = <T extends object>(record: T | null | undefined): Array<[string, T[keyof T]]> => (
    Object.entries(record || {}) as Array<[string, T[keyof T]]>
);
const checkpoints: number[] = SHARED_INDUSTRY_B8_CHECKPOINTS.filter(week => week <= horizonWeeks);
if (!checkpoints.includes(horizonWeeks)) checkpoints.push(horizonWeeks);
const results = [];

for (const regime of regimes) {
    const result = await runSharedIndustryB8Scenario({
        regime,
        seed: SHARED_INDUSTRY_B8_SCENARIO_SEEDS[regime],
        horizonWeeks,
        checkpointWeeks: checkpoints,
        resumeAtWeek: skipResume
            ? undefined
            : requestedResumeAtWeek > 0
                ? Math.min(horizonWeeks, requestedResumeAtWeek)
                : Math.floor(horizonWeeks / 2),
        ...(requestedResumeComparisonWeeks > 0 ? { resumeComparisonEveryWeeks: requestedResumeComparisonWeeks } : {}),
        ...(requestedResumeComparisonStart > 0 ? { resumeComparisonStartAfterWeeks: requestedResumeComparisonStart } : {}),
        persistenceEveryWeeks: 520,
        progressEveryWeeks: 520,
        onProgress: progress => console.log(
            `B8 ${regime} ${progress.absoluteWeek}/${progress.horizonWeeks} weeks · ${progress.elapsedMs}ms · ${progress.projectCount} projects · ${progress.productionCount} productions`,
        ),
    });
    assert.equal(result.processedWeeks, horizonWeeks);
    assert.equal(result.doubleProcessedWeeks, 0);
    if (!skipResume) assert.equal(
        result.resumeDigest,
        result.uninterruptedDigest,
        `resumed branch diverged at: ${result.resumeDifferencePaths.join(', ')}`,
    );
    assert.deepEqual(assertSharedIndustryB8Integrity(result.report), []);
    if (!result.report.experience) throw new Error(`${regime} did not produce experience metrics.`);
    results.push(result);
}

if (regimes.length === allRegimes.length) {
    const evaluation = evaluateSharedIndustryB8Experience(results.map(result => result.report.experience!));
    assert.deepEqual(evaluation.violations, []);
}

const certificationSummaries = results.map(result => ({
    regime: result.report.regime,
    horizonWeeks: result.report.horizonWeeks,
    experience: result.report.experience,
    checkpointSaveBytes: result.checkpointSaveBytes,
    runtime: result.runtime,
    registryCounts: {
        projects: result.player.world.projects.length,
        productions: Object.keys(result.player.world.industryProductions || {}).length,
        rightsContracts: Object.keys(result.player.world.streamingRightsContracts || {}).length,
        industryEvents: result.player.world.industryEvents?.events.length || 0,
        ecosystemOperators: Object.keys(result.player.world.streamingPlatformEcosystem?.operators || {}).length,
        closedEcosystemOperators: recordValues(result.player.world.streamingPlatformEcosystem?.operators)
            .filter(operator => operator.lifecycle === 'CLOSED').length,
    },
    finalDigest: result.uninterruptedDigest,
}));
const summaries = minimalReport ? certificationSummaries : results.map(result => ({
    regime: result.report.regime,
    horizonWeeks: result.report.horizonWeeks,
    experience: result.report.experience,
    checkpointSaveBytes: result.checkpointSaveBytes,
    runtime: result.runtime,
    registryCounts: {
        projects: result.player.world.projects.length,
        productions: Object.keys(result.player.world.industryProductions || {}).length,
        rightsContracts: Object.keys(result.player.world.streamingRightsContracts || {}).length,
        industryEvents: result.player.world.industryEvents?.events.length || 0,
        ecosystemOperators: Object.keys(result.player.world.streamingPlatformEcosystem?.operators || {}).length,
        closedEcosystemOperators: recordValues(result.player.world.streamingPlatformEcosystem?.operators)
            .filter(operator => operator.lifecycle === 'CLOSED').length,
    },
    rightsLifecycle: {
        expiredByHorizon: recordValues(result.player.world.streamingRightsContracts)
            .filter(contract => contract.expiresAtAbsoluteWeek < result.report.horizonWeeks).length,
        permanent: recordValues(result.player.world.streamingRightsContracts)
            .filter(contract => contract.permanentPurchase || contract.expiresAtAbsoluteWeek >= Number.MAX_SAFE_INTEGER).length,
        byStatus: recordValues(result.player.world.streamingRightsContracts).reduce<Record<string, number>>((counts, contract) => {
            counts[contract.status] = (counts[contract.status] || 0) + 1;
            return counts;
        }, {}),
    },
    platformCollections: Object.fromEntries(recordEntries(result.player.world.platforms).map(([platformId, platform]) => [platformId, {
        slate: platform.ai?.slate.length || 0,
        slateByStatus: (platform.ai?.slate || []).reduce((counts: Record<string, number>, plan: { status: string }) => {
            counts[plan.status] = (counts[plan.status] || 0) + 1;
            return counts;
        }, {} as Record<string, number>),
        rightsContracts: platform.ai?.rightsContracts.length || 0,
        expiredRightsByHorizon: (platform.ai?.rightsContracts || [])
            .filter(contract => contract.expiresAtAbsoluteWeek < result.report.horizonWeeks).length,
        localizationJobs: platform.ai?.localizationJobs.length || 0,
        renewals: platform.ai?.rightsRenewals.length || 0,
    }])),
    studioCollections: {
        byStatus: recordValues(result.player.world.studios).reduce<Record<string, number>>((counts, studio) => {
            const status = studio.ai?.status || 'ACTIVE';
            counts[status] = (counts[status] || 0) + 1;
            return counts;
        }, {}),
        slateByStatus: recordValues(result.player.world.studios)
            .flatMap(studio => studio.ai?.slate?.commitments || [])
            .reduce<Record<string, number>>((counts, commitment) => {
                counts[commitment.status] = (counts[commitment.status] || 0) + 1;
                return counts;
            }, {}),
        activeProductions: recordValues(result.player.world.industryProductions)
            .filter(production => !['RELEASED', 'CANCELLED'].includes(production.status)).length,
        productionsByStatus: recordValues(result.player.world.industryProductions)
            .reduce<Record<string, number>>((counts, production) => {
                counts[production.status] = (counts[production.status] || 0) + 1;
                return counts;
            }, {}),
        deliveredDiagnostics: recordValues(result.player.world.industryProductions)
            .filter(production => production.status === 'DELIVERED')
            .reduce((counts, production) => {
                const execution = production.studioAiExecution;
                counts.total += 1;
                if (execution?.finalQuality) counts.withFinalQuality += 1;
                if (execution?.talent) counts.withTalent += 1;
                if (execution?.fingerprintSnapshot) counts.withFingerprintSnapshot += 1;
                if (execution?.paidMilestoneIds?.includes('DELIVERY')) counts.withDeliveryMilestone += 1;
                if (result.player.world.projects.some(project => project.id === production.canonicalProjectId)) counts.withCanonicalProject += 1;
                if (production.productionCalendar.elapsedWeeks >= production.productionCalendar.totalWeeks) counts.calendarComplete += 1;
                counts.oldestProgressAgeWeeks = Math.max(
                    counts.oldestProgressAgeWeeks,
                    result.report.horizonWeeks - (execution?.lastProgressedAbsoluteWeek || result.report.horizonWeeks),
                );
                return counts;
            }, {
                total: 0,
                withFinalQuality: 0,
                withTalent: 0,
                withFingerprintSnapshot: 0,
                withDeliveryMilestone: 0,
                withCanonicalProject: 0,
                calendarComplete: 0,
                oldestProgressAgeWeeks: 0,
            }),
        cash: {
            zeroOrLess: recordValues(result.player.world.studios).filter(studio => studio.cashReserve <= 0).length,
            underOneMillion: recordValues(result.player.world.studios).filter(studio => studio.cashReserve < 1).length,
            min: Math.min(...recordValues(result.player.world.studios).map(studio => studio.cashReserve)),
            max: Math.max(...recordValues(result.player.world.studios).map(studio => studio.cashReserve)),
        },
        oldestHoldWeeks: Math.max(0, ...recordValues(result.player.world.industryProductions)
            .filter(production => production.status === 'ON_HOLD')
            .map(production => result.report.horizonWeeks - (production.studioAiExecution?.holdStartedAtAbsoluteWeek || result.report.horizonWeeks))),
    },
    largestWorldSections: Object.entries(result.player.world)
        .map(([key, value]) => [key, Buffer.byteLength(JSON.stringify(value) ?? '')] as const)
        .sort((left, right) => right[1] - left[1])
        .slice(0, 12),
    finalDigest: result.uninterruptedDigest,
}));
if (reportPath) writeFileSync(reportPath, `${JSON.stringify(summaries, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(minimalReport ? certificationSummaries : compactSummary ? (summaries as any[]).map(summary => ({
    regime: summary.regime,
    horizonWeeks: summary.horizonWeeks,
    experience: summary.experience,
    checkpointSaveBytes: summary.checkpointSaveBytes,
    runtime: summary.runtime,
    registryCounts: summary.registryCounts,
    rightsLifecycle: summary.rightsLifecycle,
    studioCollections: {
        byStatus: summary.studioCollections.byStatus,
        activeProductions: summary.studioCollections.activeProductions,
        productionsByStatus: summary.studioCollections.productionsByStatus,
        oldestHoldWeeks: summary.studioCollections.oldestHoldWeeks,
    },
    finalDigest: summary.finalDigest,
})) : summaries, null, 2));
console.log(`Shared Industry B8 ${horizonWeeks}-week long-run audit passed.`);
