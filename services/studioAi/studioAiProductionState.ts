import type {
    StudioAiCommercialResult,
    StudioAiFinalQuality,
    StudioAiProductionCheckpoint,
    StudioAiProductionMilestone,
    StudioAiProductionProblem,
    StudioAiProductionProblemType,
    StudioAiProductionRecord,
    StudioAiProductionRecovery,
    StudioAiProductionTalent,
    StudioAiReleaseMode,
} from '../../types';
import { normalizeIndustryContentFingerprint } from '../industryIntelligence/industryIntelligenceState';

export const STUDIO_AI_PRODUCTION_SCHEMA_VERSION = 1 as const;
export const STUDIO_AI_PRODUCTION_KEY_LIMIT = 64;
export const STUDIO_AI_PRODUCTION_PROBLEM_LIMIT = 3;

const CHECKPOINTS = new Set<StudioAiProductionCheckpoint>(['PRODUCTION_START', 'PRODUCTION_35', 'PRODUCTION_70', 'POST_PRODUCTION_START']);
const PROBLEM_TYPES = new Set<StudioAiProductionProblemType>(['DELAY', 'OVERRUN', 'QUALITY_LOSS', 'TALENT_ISSUE', 'FINANCING_HOLD', 'POST_PRODUCTION_DIFFICULTY']);
const RECOVERIES = new Set<StudioAiProductionRecovery>(['NONE', 'CONTINGENCY_SPEND', 'SCHEDULE_EXTENSION', 'SCOPE_REDUCTION', 'QUALITY_PROTECTION', 'RELEASE_DELAY', 'FINANCING_HOLD', 'TURNAROUND', 'CANCEL']);
const RELEASE_MODES = new Set<StudioAiReleaseMode>(['LIMITED_THEATRICAL', 'WIDE_THEATRICAL', 'EVENT_THEATRICAL', 'PRESTIGE_THEATRICAL', 'STREAMING_ONLY', 'THEATRICAL_THEN_STREAMING', 'HOLD', 'TURNAROUND']);
const MILESTONES = new Set<StudioAiProductionMilestone>(['PRE_PRODUCTION_START', 'PRODUCTION_START', 'POST_PRODUCTION_START', 'DELIVERY']);

const finite = (value: unknown, fallback = 0): number => Number.isFinite(Number(value)) ? Number(value) : fallback;
const whole = (value: unknown, fallback = 0): number => Math.max(0, Math.round(finite(value, fallback)));
const money = (value: unknown, fallback = 0): number => Math.round(Math.max(0, finite(value, fallback)) * 1000) / 1000;
const bounded = (value: unknown, fallback = 0): number => Math.max(0, Math.min(100, finite(value, fallback)));
const nullableWeek = (value: unknown, maxAbsoluteWeek: number): number | null => (
    value === null || value === undefined ? null : Math.min(maxAbsoluteWeek, whole(value))
);
const text = (value: unknown): string => typeof value === 'string' ? value.trim() : '';

const normalizeTalent = (value: unknown): StudioAiProductionTalent | null => {
    if (!value || typeof value !== 'object') return null;
    const raw = value as Partial<StudioAiProductionTalent>;
    const leadActorId = text(raw.leadActorId);
    const leadActorName = text(raw.leadActorName);
    const directorId = text(raw.directorId);
    const directorName = text(raw.directorName);
    if (!leadActorId || !leadActorName || !directorId || !directorName) return null;
    return {
        leadActorId,
        leadActorName,
        directorId,
        directorName,
        packageScore: bounded(raw.packageScore),
        estimatedCostMillions: money(raw.estimatedCostMillions),
    };
};

const normalizeQuality = (value: unknown): StudioAiFinalQuality | null => {
    if (!value || typeof value !== 'object') return null;
    const raw = value as Partial<StudioAiFinalQuality>;
    return {
        creativeQuality: bounded(raw.creativeQuality),
        executionQuality: bounded(raw.executionQuality),
        commercialPotential: bounded(raw.commercialPotential),
        prestigePotential: bounded(raw.prestigePotential),
        downsideRisk: bounded(raw.downsideRisk),
    };
};

const normalizeResult = (value: unknown, maxAbsoluteWeek: number): StudioAiCommercialResult | null => {
    if (!value || typeof value !== 'object') return null;
    const raw = value as Partial<StudioAiCommercialResult>;
    const outcome = raw.outcome === 'HIT' || raw.outcome === 'FLOP' ? raw.outcome : 'SOLID';
    return {
        releasedAtAbsoluteWeek: Math.min(maxAbsoluteWeek, whole(raw.releasedAtAbsoluteWeek)),
        theatricalGrossMillions: money(raw.theatricalGrossMillions),
        streamingValueMillions: money(raw.streamingValueMillions),
        studioReceiptsMillions: money(raw.studioReceiptsMillions),
        productionSpendMillions: money(raw.productionSpendMillions),
        marketingSpendMillions: money(raw.marketingSpendMillions),
        netResultMillions: Math.round(finite(raw.netResultMillions) * 1000) / 1000,
        rating: Math.max(1, Math.min(10, finite(raw.rating, 5))),
        outcome,
    };
};

const normalizeProblem = (value: unknown, maxAbsoluteWeek: number): StudioAiProductionProblem | null => {
    if (!value || typeof value !== 'object') return null;
    const raw = value as Partial<StudioAiProductionProblem>;
    const id = text(raw.id);
    if (!id || !raw.checkpoint || !CHECKPOINTS.has(raw.checkpoint) || !raw.type || !PROBLEM_TYPES.has(raw.type)) return null;
    return {
        id,
        checkpoint: raw.checkpoint,
        type: raw.type,
        severity: bounded(raw.severity),
        occurredAtAbsoluteWeek: Math.min(maxAbsoluteWeek, whole(raw.occurredAtAbsoluteWeek)),
        delayWeeks: whole(raw.delayWeeks),
        overrunMillions: money(raw.overrunMillions),
        qualityImpact: Math.max(-100, Math.min(100, finite(raw.qualityImpact))),
        response: raw.response && RECOVERIES.has(raw.response) ? raw.response : 'NONE',
        responseAppliedAtAbsoluteWeek: nullableWeek(raw.responseAppliedAtAbsoluteWeek, maxAbsoluteWeek),
    };
};

export const appendStudioAiProductionKey = (keys: readonly string[], key: string): string[] => (
    [...keys.filter(item => item !== key), key].slice(-STUDIO_AI_PRODUCTION_KEY_LIMIT)
);

export const normalizeStudioAiProductionRecord = (
    value: unknown,
    maxAbsoluteWeek = Number.MAX_SAFE_INTEGER,
): StudioAiProductionRecord | null => {
    if (!value || typeof value !== 'object') return null;
    const raw = value as Partial<StudioAiProductionRecord> & { source?: unknown };
    const slateCommitmentId = text(raw.slateCommitmentId);
    const fingerprintId = text(raw.fingerprintId);
    if (raw.source !== 'STUDIO_INDEPENDENT' || !slateCommitmentId || !fingerprintId) return null;
    const talent = normalizeTalent(raw.talent);
    const processedKeys = Array.isArray(raw.processedKeys)
        ? [...new Set(raw.processedKeys.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())))]
            .slice(-STUDIO_AI_PRODUCTION_KEY_LIMIT)
        : [];
    const problems = (Array.isArray(raw.problems) ? raw.problems : [])
        .map(problem => normalizeProblem(problem, maxAbsoluteWeek))
        .filter((problem): problem is StudioAiProductionProblem => Boolean(problem));
    const uniqueProblems = [...new Map(problems.map(problem => [problem.id, problem])).values()]
        .sort((left, right) => left.occurredAtAbsoluteWeek - right.occurredAtAbsoluteWeek || left.id.localeCompare(right.id))
        .slice(-STUDIO_AI_PRODUCTION_PROBLEM_LIMIT);
    const fingerprintSnapshot = normalizeIndustryContentFingerprint(raw.fingerprintSnapshot);
    return {
        schemaVersion: STUDIO_AI_PRODUCTION_SCHEMA_VERSION,
        source: 'STUDIO_INDEPENDENT',
        slateCommitmentId,
        fingerprintId,
        ...(fingerprintSnapshot?.id === fingerprintId ? { fingerprintSnapshot } : {}),
        ...(text(raw.originalProducerStudioId) ? { originalProducerStudioId: text(raw.originalProducerStudioId) } : {}),
        controllerAtLastProgression: raw.controllerAtLastProgression === 'PLAYER' ? 'PLAYER' : 'AI',
        selectedReleaseMode: raw.selectedReleaseMode && RELEASE_MODES.has(raw.selectedReleaseMode) ? raw.selectedReleaseMode : null,
        publicReleaseStrategy: raw.publicReleaseStrategy === 'THEATRICAL' || raw.publicReleaseStrategy === 'STREAMING_ONLY'
            ? raw.publicReleaseStrategy
            : null,
        ...(raw.releasePlannedAtAbsoluteWeek === undefined ? {} : { releasePlannedAtAbsoluteWeek: Math.min(maxAbsoluteWeek, whole(raw.releasePlannedAtAbsoluteWeek)) }),
        ...(raw.plannedReleaseAbsoluteWeek === undefined ? {} : { plannedReleaseAbsoluteWeek: whole(raw.plannedReleaseAbsoluteWeek) }),
        ...(raw.releaseBlockedReason ? { releaseBlockedReason: raw.releaseBlockedReason } : {}),
        talentSelected: Boolean(raw.talentSelected && talent),
        talent,
        finalQuality: normalizeQuality(raw.finalQuality),
        result: normalizeResult(raw.result, maxAbsoluteWeek),
        problems: uniqueProblems,
        paidMilestoneIds: [...new Set((Array.isArray(raw.paidMilestoneIds) ? raw.paidMilestoneIds : [])
            .filter((milestone): milestone is StudioAiProductionMilestone => MILESTONES.has(milestone)))],
        processedKeys,
        ...(raw.holdStartedAtAbsoluteWeek === undefined ? {} : { holdStartedAtAbsoluteWeek: nullableWeek(raw.holdStartedAtAbsoluteWeek, maxAbsoluteWeek) }),
        ...(raw.nextReviewAbsoluteWeek === undefined ? {} : { nextReviewAbsoluteWeek: nullableWeek(raw.nextReviewAbsoluteWeek, Number.MAX_SAFE_INTEGER) }),
        lastProgressedAbsoluteWeek: Math.min(maxAbsoluteWeek, whole(raw.lastProgressedAbsoluteWeek)),
    };
};

export const isStudioAiIndependentProduction = (value: unknown): value is StudioAiProductionRecord => (
    normalizeStudioAiProductionRecord(value) !== null
);
