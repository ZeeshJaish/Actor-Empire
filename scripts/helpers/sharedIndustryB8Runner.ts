import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import type { Player } from '../../types';
import { processIndustryWorldWeek } from '../../services/industryWorld';
import { compactPlayerForPersistence } from '../../services/saveCompaction';
import { migratePlayerSave } from '../../services/saveMigration';
import { finalizeSharedIndustryB8Report, observeSharedIndustryB8Week } from './sharedIndustryB8Metrics';
import { buildSharedIndustryB8Scenario } from './sharedIndustryB8Scenarios';
import {
    createSharedIndustryB8ExperienceAccumulator,
    finalizeSharedIndustryB8Experience,
    observeSharedIndustryB8Experience,
} from './sharedIndustryB8Experience';
import type {
    SharedIndustryB8Regime,
    SharedIndustryB8Report,
    SharedIndustryB8Snapshot,
} from './sharedIndustryB8Types';

const MAX_TIMING_SAMPLES = 512;

export interface SharedIndustryB8RunOptions {
    regime: SharedIndustryB8Regime;
    seed: string;
    horizonWeeks: number;
    checkpointWeeks: readonly number[];
    resumeAtWeek?: number;
    resumeComparisonEveryWeeks?: number;
    resumeComparisonStartAfterWeeks?: number;
    persistenceEveryWeeks?: number;
    progressEveryWeeks?: number;
    onProgress?: (progress: SharedIndustryB8Progress) => void;
}

export interface SharedIndustryB8Progress {
    absoluteWeek: number;
    horizonWeeks: number;
    elapsedMs: number;
    projectCount: number;
    productionCount: number;
}

export interface SharedIndustryB8Runtime {
    totalMs: number;
    weekP50Ms: number;
    weekP95Ms: number;
    weekMaxMs: number;
    retainedTimingSamples: number;
}

export interface SharedIndustryB8RunResult {
    player: Player;
    report: SharedIndustryB8Report;
    checkpointDigests: Record<number, string>;
    checkpointSaveBytes: Record<number, number>;
    uninterruptedDigest: string;
    resumeDigest: string | null;
    resumeDifferencePaths: string[];
    processedWeeks: number;
    doubleProcessedWeeks: number;
    persistenceCompactions: number;
    progressEvents: SharedIndustryB8Progress[];
    runtime: SharedIndustryB8Runtime;
}

const withCalendar = (player: Player, absoluteWeek: number): Player => ({
    ...player,
    age: 18 + Math.floor((absoluteWeek - 1) / 52),
    currentWeek: ((absoluteWeek - 1) % 52) + 1,
});

const canonicalProjection = (player: Player) => {
    const compacted = compactPlayerForPersistence(player);
    return {
        world: compacted.world,
        news: compacted.news,
        xFeed: compacted.x.feed,
        instagramFeed: compacted.instagram.feed,
    };
};

const stableCanonicalValue = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(stableCanonicalValue);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableCanonicalValue(entry)]));
};

const canonicalDigest = (player: Player): string => createHash('sha256')
    .update(JSON.stringify(stableCanonicalValue(canonicalProjection(player))))
    .digest('hex');

const canonicalDifferencePaths = (
    left: unknown,
    right: unknown,
    path = 'player',
    output: string[] = [],
): string[] => {
    if (output.length >= 12 || Object.is(left, right)) return output;
    if (!left || !right || typeof left !== 'object' || typeof right !== 'object') {
        output.push(path);
        return output;
    }
    const leftRecord = left as Record<string, unknown>;
    const rightRecord = right as Record<string, unknown>;
    for (const key of [...new Set([...Object.keys(leftRecord), ...Object.keys(rightRecord)])].sort()) {
        canonicalDifferencePaths(leftRecord[key], rightRecord[key], `${path}.${key}`, output);
        if (output.length >= 12) break;
    }
    return output;
};

const platformPlanMigrationDifference = (leftPlayer: Player, rightPlayer: Player): unknown => {
    for (const platformId of Object.keys(leftPlayer.world.platforms || {}).sort()) {
        const leftPlatform = leftPlayer.world.platforms?.[platformId as keyof typeof leftPlayer.world.platforms];
        const rightPlatform = rightPlayer.world.platforms?.[platformId as keyof typeof rightPlayer.world.platforms];
        const rightPlans = new Map((rightPlatform?.ai?.slate || []).map(plan => [plan.id, plan]));
        for (const leftPlan of leftPlatform?.ai?.slate || []) {
            const rightPlan = rightPlans.get(leftPlan.id);
            if (!rightPlan) continue;
            if (JSON.stringify(stableCanonicalValue(leftPlan.localizationRequirements))
                === JSON.stringify(stableCanonicalValue(rightPlan.localizationRequirements))) continue;
            return {
                platformId,
                planId: leftPlan.id,
                status: leftPlan.status,
                localizationLevel: leftPlan.localizationLevel,
                leftReleaseCountryIds: leftPlan.releaseCountryIds,
                rightReleaseCountryIds: rightPlan.releaseCountryIds,
                leftRequirements: leftPlan.localizationRequirements,
                rightRequirements: rightPlan.localizationRequirements,
            };
        }
    }
    return null;
};

const studioValuationMigrationDifference = (leftPlayer: Player, rightPlayer: Player): unknown => {
    for (const studioId of Object.keys(leftPlayer.world.studios || {}).sort()) {
        const leftStudio = leftPlayer.world.studios?.[studioId];
        const rightStudio = rightPlayer.world.studios?.[studioId];
        if (!rightStudio || Object.is(leftStudio?.valuation, rightStudio.valuation)) continue;
        return {
            studioId,
            leftValuation: leftStudio?.valuation,
            rightValuation: rightStudio.valuation,
            leftAiStatus: leftStudio?.ai?.status,
            rightAiStatus: rightStudio.ai?.status,
            leftCashReserve: leftStudio?.cashReserve,
            rightCashReserve: rightStudio.cashReserve,
        };
    }
    return null;
};

const restoreCanonicalSave = (player: Player): Player => migratePlayerSave(
    JSON.parse(JSON.stringify(compactPlayerForPersistence(player))) as Player,
);

const percentile = (values: number[], share: number): number => {
    if (!values.length) return 0;
    const ordered = [...values].sort((left, right) => left - right);
    return ordered[Math.min(ordered.length - 1, Math.max(0, Math.ceil(ordered.length * share) - 1))];
};

const rounded = (value: number): number => Number(value.toFixed(2));

const retainTiming = (samples: number[], value: number, absoluteWeek: number) => {
    if (samples.length < MAX_TIMING_SAMPLES) {
        samples.push(value);
        return;
    }
    samples[(absoluteWeek - 1) % MAX_TIMING_SAMPLES] = value;
};

const processCanonicalIndustryWeek = (
    player: Player,
    absoluteWeek: number,
): { player: Player; processed: boolean } => {
    const calendarPlayer = withCalendar(player, absoluteWeek);
    const result = processIndustryWorldWeek(calendarPlayer, calendarPlayer.world, absoluteWeek);
    return { player: result.player, processed: result.processed };
};

export const runSharedIndustryB8Scenario = async (
    options: SharedIndustryB8RunOptions,
): Promise<SharedIndustryB8RunResult> => {
    const horizonWeeks = Math.max(1, Math.round(options.horizonWeeks));
    const checkpoints = [...new Set(options.checkpointWeeks
        .map(value => Math.round(value))
        .filter(value => value > 0 && value <= horizonWeeks))].sort((left, right) => left - right);
    const checkpointSet = new Set(checkpoints);
    const resumeAtWeek = options.resumeAtWeek === undefined
        ? null
        : Math.max(1, Math.min(horizonWeeks, Math.round(options.resumeAtWeek)));
    const progressEveryWeeks = Math.max(1, Math.round(options.progressEveryWeeks || 52));
    const persistenceEveryWeeks = options.persistenceEveryWeeks === undefined
        ? null
        : Math.max(1, Math.round(options.persistenceEveryWeeks));
    const resumeComparisonEveryWeeks = options.resumeComparisonEveryWeeks === undefined
        ? persistenceEveryWeeks
        : Math.max(1, Math.round(options.resumeComparisonEveryWeeks));
    const resumeComparisonStartAfterWeeks = Math.max(0, Math.round(options.resumeComparisonStartAfterWeeks || 0));
    const startedAt = performance.now();
    const timingSamples: number[] = [];
    const checkpointSnapshots: SharedIndustryB8Snapshot[] = [];
    const checkpointDigests: Record<number, string> = {};
    const checkpointSaveBytes: Record<number, number> = {};
    const progressEvents: SharedIndustryB8Progress[] = [];
    let player = buildSharedIndustryB8Scenario(options.regime, options.seed);
    const experience = createSharedIndustryB8ExperienceAccumulator(options.regime, options.seed);
    let resumePlayer: Player | null = null;
    let previousSnapshot: SharedIndustryB8Snapshot | undefined;
    let processedWeeks = 0;
    let doubleProcessedWeeks = 0;
    let persistenceCompactions = 0;
    let weekMaxMs = 0;

    for (let absoluteWeek = 1; absoluteWeek <= horizonWeeks; absoluteWeek += 1) {
        const weekStartedAt = performance.now();
        const primary = processCanonicalIndustryWeek(player, absoluteWeek);
        player = primary.player;
        if (primary.processed) processedWeeks += 1;
        else doubleProcessedWeeks += 1;
        observeSharedIndustryB8Experience(experience, player, absoluteWeek);

        if (resumePlayer) {
            const resumed = processCanonicalIndustryWeek(resumePlayer, absoluteWeek);
            if (!resumed.processed) throw new Error(`B8 resumed branch failed to process absolute week ${absoluteWeek}`);
            resumePlayer = resumed.player;
        }

        const isCheckpointWeek = checkpointSet.has(absoluteWeek);
        if (isCheckpointWeek) {
            const currentSnapshot = observeSharedIndustryB8Week(previousSnapshot, player, absoluteWeek);
            previousSnapshot = currentSnapshot;
            checkpointSnapshots.push(currentSnapshot);
        }

        const persistenceDue = persistenceEveryWeeks !== null && absoluteWeek % persistenceEveryWeeks === 0;
        if (isCheckpointWeek || persistenceDue || resumeAtWeek === absoluteWeek) {
            player = compactPlayerForPersistence(player);
            if (resumePlayer) resumePlayer = compactPlayerForPersistence(resumePlayer);
            persistenceCompactions += 1;
        }

        const resumeComparisonDue = resumeComparisonEveryWeeks !== null
            && absoluteWeek - (resumeAtWeek ?? absoluteWeek) >= resumeComparisonStartAfterWeeks
            && absoluteWeek > (resumeAtWeek ?? absoluteWeek)
            && (absoluteWeek - (resumeAtWeek ?? absoluteWeek)) % resumeComparisonEveryWeeks === 0;
        if (resumePlayer && resumeAtWeek !== null && absoluteWeek > resumeAtWeek && (isCheckpointWeek || persistenceDue || resumeComparisonDue)) {
            const primaryDigest = canonicalDigest(player);
            const restoredBranchDigest = canonicalDigest(resumePlayer);
            if (primaryDigest !== restoredBranchDigest) {
                throw new Error(
                    `B8 resumed branch diverged by week ${absoluteWeek}: ${canonicalDifferencePaths(canonicalProjection(player), canonicalProjection(resumePlayer)).join(', ')}`,
                );
            }
        }

        if (isCheckpointWeek) {
            checkpointDigests[absoluteWeek] = canonicalDigest(player);
            checkpointSaveBytes[absoluteWeek] = Buffer.byteLength(JSON.stringify(player));
        }

        if (resumeAtWeek === absoluteWeek) {
            resumePlayer = restoreCanonicalSave(player);
            const savedDigest = canonicalDigest(player);
            const restoredDigest = canonicalDigest(resumePlayer);
            if (savedDigest !== restoredDigest) {
                const planDifference = platformPlanMigrationDifference(player, resumePlayer);
                const studioValuationDifference = studioValuationMigrationDifference(player, resumePlayer);
                throw new Error(`B8 save migration diverged at week ${absoluteWeek}: ${canonicalDifferencePaths(canonicalProjection(player), canonicalProjection(resumePlayer)).join(', ')}${planDifference ? `\nPlatform plan diagnostic: ${JSON.stringify(planDifference)}` : ''}${studioValuationDifference ? `\nStudio valuation diagnostic: ${JSON.stringify(studioValuationDifference)}` : ''}`);
            }
            const runtimeDifferencePaths = canonicalDifferencePaths(player.world, resumePlayer.world, 'player.world');
            if (runtimeDifferencePaths.length) {
                throw new Error(`B8 save migration restored a different runtime shape at week ${absoluteWeek}: ${runtimeDifferencePaths.join(', ')}`);
            }
        }

        const weekMs = performance.now() - weekStartedAt;
        weekMaxMs = Math.max(weekMaxMs, weekMs);
        retainTiming(timingSamples, weekMs, absoluteWeek);
        if (absoluteWeek % progressEveryWeeks === 0 || absoluteWeek === horizonWeeks) {
            const progress: SharedIndustryB8Progress = {
                absoluteWeek,
                horizonWeeks,
                elapsedMs: rounded(performance.now() - startedAt),
                projectCount: player.world.projects.length,
                productionCount: Object.keys(player.world.industryProductions || {}).length,
            };
            progressEvents.push(progress);
            options.onProgress?.(progress);
        }
    }

    const uninterruptedDigest = canonicalDigest(player);
    const resumeDigest = resumePlayer ? canonicalDigest(resumePlayer) : null;
    const resumeDifferencePaths = resumePlayer && resumeDigest !== uninterruptedDigest
        ? canonicalDifferencePaths(canonicalProjection(player), canonicalProjection(resumePlayer))
        : [];
    const report = finalizeSharedIndustryB8Report({
        regime: options.regime,
        seed: options.seed,
        snapshots: checkpointSnapshots,
        expectedCheckpoints: checkpoints,
    });
    report.experience = finalizeSharedIndustryB8Experience(experience, player, horizonWeeks);
    return {
        player,
        report,
        checkpointDigests,
        checkpointSaveBytes,
        uninterruptedDigest,
        resumeDigest,
        resumeDifferencePaths,
        processedWeeks,
        doubleProcessedWeeks,
        persistenceCompactions,
        progressEvents,
        runtime: {
            totalMs: rounded(performance.now() - startedAt),
            weekP50Ms: rounded(percentile(timingSamples, 0.5)),
            weekP95Ms: rounded(percentile(timingSamples, 0.95)),
            weekMaxMs: rounded(weekMaxMs),
            retainedTimingSamples: timingSamples.length,
        },
    };
};
