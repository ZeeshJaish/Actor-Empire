import type { IndustryProductionCommitment, PlatformAiProductionRecord, StudioId } from '../types';
import { normalizeProductionCalendar } from './productionCalendar';
import { normalizeStudioAiProductionRecord } from './studioAi/studioAiProductionState';

const STATUSES = new Set<IndustryProductionCommitment['status']>([
    'PLANNED',
    'PRE_PRODUCTION',
    'PRODUCTION',
    'POST_PRODUCTION',
    'DELIVERED',
    'AWAITING_RELEASE',
    'TURNAROUND',
    'RELEASED',
    'ON_HOLD',
    'CANCELLED',
]);

const safeNonNegative = (value: unknown): number => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
};
const roundMillions = (value: number): number => Math.round(Math.max(0, value) * 100) / 100;

const FAILURE_DECISIONS = new Set<PlatformAiProductionRecord['failureDecision']>([
    'NONE',
    'ADD_CONTINGENCY',
    'DELAY_RELEASE',
    'REPLACE_TALENT',
    'REDUCE_MARKETING',
    'SELL_OR_COPRODUCE',
    'CANCEL',
]);
const PAYMENT_MILESTONES = new Set<PlatformAiProductionRecord['paidMilestoneIds'][number]>([
    'COMMISSIONING',
    'PROGRESS_35',
    'PROGRESS_70',
    'DELIVERY',
]);
const FAILURE_RESPONSES = new Set<PlatformAiProductionRecord['failureResponse']>([
    'NONE',
    'PENDING',
    'CONTINGENCY_TRANSFERRED',
    'MARKETING_TRANSFERRED',
    'SCHEDULE_EXTENDED',
    'ON_HOLD',
]);

const nullableString = (value: unknown): string | null => (
    typeof value === 'string' && value.trim() ? value.trim() : null
);

const finiteNonNegative = (value: unknown): number | null => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
};

const finitePositive = (value: unknown): number | null => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

type LegacyPlatformAiProductionRecord = Partial<PlatformAiProductionRecord> & {
    id?: unknown;
    canonicalProjectId?: unknown;
    physicalProducerStudioId?: unknown;
    physicalProducerStudioName?: unknown;
    budgetMillions?: unknown;
    paidMillions?: unknown;
    elapsedWeeks?: unknown;
};

const normalizeAiExecution = (
    value: unknown,
    fallbackUpdatedAtAbsoluteWeek: number,
    maxAbsoluteWeek: number,
): PlatformAiProductionRecord | null => {
    if (!value || typeof value !== 'object') return null;
    const candidate = value as LegacyPlatformAiProductionRecord;
    const boundedRoll = (roll: unknown): number => Math.max(0, Math.min(1, safeNonNegative(roll)));
    const standardDurationWeeks = Math.max(1, Math.round(safeNonNegative(candidate.standardDurationWeeks) || 20));
    const effectiveDurationWeeks = Math.max(1, Math.round(safeNonNegative(candidate.effectiveDurationWeeks) || standardDurationWeeks));
    const failureDecision = candidate.failureDecision && FAILURE_DECISIONS.has(candidate.failureDecision)
        ? candidate.failureDecision
        : 'NONE';
    const failureResponse = candidate.failureResponse && FAILURE_RESPONSES.has(candidate.failureResponse)
        ? candidate.failureResponse
        : failureDecision === 'NONE' ? 'NONE' : 'PENDING';
    return {
        standardDurationWeeks,
        effectiveDurationWeeks,
        qualityForecast: Math.max(0, Math.min(100, safeNonNegative(candidate.qualityForecast))),
        executionRoll: boundedRoll(candidate.executionRoll),
        delayRoll: boundedRoll(candidate.delayRoll),
        overrunRoll: boundedRoll(candidate.overrunRoll),
        failureRoll: boundedRoll(candidate.failureRoll),
        delayWeeks: Math.max(0, Math.round(safeNonNegative(candidate.delayWeeks))),
        overrunMillions: safeNonNegative(candidate.overrunMillions),
        leadActorId: nullableString(candidate.leadActorId),
        leadActorName: nullableString(candidate.leadActorName),
        directorId: nullableString(candidate.directorId),
        directorName: nullableString(candidate.directorName),
        writerId: null,
        writerName: nullableString(candidate.writerName),
        finalQuality: candidate.finalQuality === null || candidate.finalQuality === undefined
            ? null
            : Math.max(1, Math.min(100, safeNonNegative(candidate.finalQuality))),
        failureDecision,
        failureResponse,
        failureResponseAmountMillions: safeNonNegative(candidate.failureResponseAmountMillions),
        failureResponseAppliedAtAbsoluteWeek: candidate.failureResponseAppliedAtAbsoluteWeek === null
            || candidate.failureResponseAppliedAtAbsoluteWeek === undefined
            ? null
            : Math.min(maxAbsoluteWeek, Math.max(0, Math.round(safeNonNegative(candidate.failureResponseAppliedAtAbsoluteWeek)))),
        paidMilestoneIds: [...new Set(Array.isArray(candidate.paidMilestoneIds)
            ? candidate.paidMilestoneIds.filter((milestone): milestone is PlatformAiProductionRecord['paidMilestoneIds'][number] => PAYMENT_MILESTONES.has(milestone))
            : [])],
        controllerAtLastProgression: candidate.controllerAtLastProgression === 'PLAYER' ? 'PLAYER' : 'AI',
        lastProgressedAbsoluteWeek: Math.min(maxAbsoluteWeek, Math.max(0, Math.round(
            finiteNonNegative(candidate.lastProgressedAbsoluteWeek) ?? fallbackUpdatedAtAbsoluteWeek,
        ))),
        holdReason: candidate.holdReason === 'INSUFFICIENT_CASH'
            || candidate.holdReason === 'SCHEDULE_CONFLICT'
            || candidate.holdReason === 'FAILURE_RESPONSE_UNAVAILABLE'
            ? candidate.holdReason
            : null,
    };
};

const normalizeIndustryProduction = (value: unknown, maxAbsoluteWeek: number): IndustryProductionCommitment | null => {
    if (!value || typeof value !== 'object') return null;
    const candidate = value as Partial<IndustryProductionCommitment>;
    const legacyExecution = candidate.aiExecution as LegacyPlatformAiProductionRecord | undefined;
    const id = nullableString(candidate.id) || nullableString(legacyExecution?.id) || '';
    const canonicalProjectId = nullableString(candidate.canonicalProjectId)
        || nullableString(legacyExecution?.canonicalProjectId)
        || '';
    const title = typeof candidate.title === 'string' ? candidate.title.trim() : '';
    const producerStudioId = nullableString(candidate.producerStudioId)
        || nullableString(legacyExecution?.physicalProducerStudioId)
        || '';
    const canonicalElapsed = finiteNonNegative(candidate.productionCalendar?.elapsedWeeks);
    const legacyElapsed = finiteNonNegative(legacyExecution?.elapsedWeeks);
    const productionCalendar = normalizeProductionCalendar({
        ...(candidate.productionCalendar || {}),
        elapsedWeeks: canonicalElapsed ?? legacyElapsed ?? 0,
    });
    if (!id || !canonicalProjectId || !title || !producerStudioId || !candidate.projectType || !candidate.genre || !productionCalendar) return null;
    const createdAtAbsoluteWeek = Math.min(maxAbsoluteWeek, Math.max(0, Math.round(safeNonNegative(candidate.createdAtAbsoluteWeek))));
    const updatedAtAbsoluteWeek = Math.min(maxAbsoluteWeek, Math.max(createdAtAbsoluteWeek, Math.round(safeNonNegative(candidate.updatedAtAbsoluteWeek))));
    const budgetMillions = finitePositive(candidate.budgetMillions)
        ?? finitePositive(legacyExecution?.budgetMillions)
        ?? 0;
    const canonicalPaid = finiteNonNegative(candidate.paidMillions);
    const legacyPaid = finiteNonNegative(legacyExecution?.paidMillions);
    const paidMillions = Math.min(
        budgetMillions,
        canonicalPaid !== null && canonicalPaid <= budgetMillions
            ? canonicalPaid
            : legacyPaid !== null && legacyPaid <= budgetMillions
                ? legacyPaid
                : 0,
    );
    const normalizedExecution = normalizeAiExecution(candidate.aiExecution, updatedAtAbsoluteWeek, maxAbsoluteWeek);
    const normalizedStudioExecution = normalizeStudioAiProductionRecord(candidate.studioAiExecution, maxAbsoluteWeek);
    const paidMilestoneIds = normalizedExecution ? normalizedExecution.paidMilestoneIds.filter(milestone => {
        if (budgetMillions <= 0) return false;
        const commissioningPaid = roundMillions(budgetMillions * 0.05);
        const progress35Paid = roundMillions(commissioningPaid + roundMillions(budgetMillions * 0.30));
        const progress70Paid = roundMillions(progress35Paid + roundMillions(budgetMillions * 0.30));
        if (milestone === 'COMMISSIONING') return paidMillions + 1e-9 >= commissioningPaid;
        if (milestone === 'PROGRESS_35') return paidMillions + 1e-9 >= progress35Paid;
        if (milestone === 'PROGRESS_70') return paidMillions + 1e-9 >= progress70Paid;
        return paidMillions + 1e-9 >= roundMillions(budgetMillions);
    }) : [];
    const aiExecution = normalizedExecution ? { ...normalizedExecution, paidMilestoneIds } : null;
    const candidateStatus = candidate.status && STATUSES.has(candidate.status) ? candidate.status : 'PLANNED';
    const status = ['DELIVERED', 'AWAITING_RELEASE', 'RELEASED'].includes(candidateStatus) && paidMillions + 1e-9 < budgetMillions
        ? 'POST_PRODUCTION'
        : candidateStatus;
    const source = candidate.source === 'STUDIO_INDEPENDENT' && normalizedStudioExecution
        ? 'STUDIO_INDEPENDENT'
        : 'PLATFORM_COMMISSION';
    const boundedProductionCalendar = productionCalendar.startedAbsoluteWeek === undefined
        ? productionCalendar
        : {
            ...productionCalendar,
            startedAbsoluteWeek: Math.min(
                maxAbsoluteWeek,
                Math.max(0, Math.round(productionCalendar.startedAbsoluteWeek)),
            ),
        };
    return {
        id,
        canonicalProjectId,
        title,
        projectType: candidate.projectType,
        genre: candidate.genre,
        producerStudioId: producerStudioId as StudioId,
        ...(candidate.commissioningPlatformId ? { commissioningPlatformId: candidate.commissioningPlatformId } : {}),
        ...(candidate.platformContentPlanId ? { platformContentPlanId: candidate.platformContentPlanId } : {}),
        source,
        status,
        productionCalendar: boundedProductionCalendar,
        budgetMillions,
        paidMillions,
        talentBookingIds: [...new Set(Array.isArray(candidate.talentBookingIds)
            ? candidate.talentBookingIds.filter((talentId): talentId is string => typeof talentId === 'string' && Boolean(talentId.trim()))
            : [])].sort(),
        writerSource: 'IN_HOUSE_TEAM',
        writerId: null,
        writerName: typeof candidate.writerName === 'string' && candidate.writerName.trim()
            ? candidate.writerName.trim()
            : `${producerStudioId} Story Department`,
        writerSkill: Math.max(0, Math.min(100, safeNonNegative(candidate.writerSkill))),
        ...(aiExecution ? { aiExecution } : {}),
        ...(normalizedStudioExecution ? { studioAiExecution: normalizedStudioExecution } : {}),
        ...(candidate.studioAiSlateCommitmentId || normalizedStudioExecution?.slateCommitmentId
            ? { studioAiSlateCommitmentId: String(candidate.studioAiSlateCommitmentId || normalizedStudioExecution?.slateCommitmentId) }
            : {}),
        ...(candidate.industryContentFingerprintId || normalizedStudioExecution?.fingerprintId
            ? { industryContentFingerprintId: String(candidate.industryContentFingerprintId || normalizedStudioExecution?.fingerprintId) }
            : {}),
        ...(candidate.universeId ? { universeId: candidate.universeId } : {}),
        createdAtAbsoluteWeek,
        updatedAtAbsoluteWeek,
    };
};

export const normalizeIndustryProductions = (
    value: unknown,
    maxAbsoluteWeek = Number.MAX_SAFE_INTEGER,
): Record<string, IndustryProductionCommitment> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.values(value as Record<string, unknown>)
        .map(production => normalizeIndustryProduction(production, maxAbsoluteWeek))
        .filter((production): production is IndustryProductionCommitment => Boolean(production))
        .sort((left, right) => left.id.localeCompare(right.id))
        .reduce<Record<string, IndustryProductionCommitment>>((registry, production) => {
            registry[production.id] = production;
            return registry;
        }, {});
};

export const getIndustryProduction = (
    registry: Record<string, IndustryProductionCommitment> | undefined,
    productionId: string,
    maxAbsoluteWeek = Number.MAX_SAFE_INTEGER,
): IndustryProductionCommitment | null => {
    const direct = registry?.[productionId];
    // Canonical registries are keyed by the production id. Normalize just the
    // requested record on this overwhelmingly common path; retain the full
    // legacy repair path for old saves whose registry keys do not match ids.
    if (direct?.id === productionId) {
        return normalizeIndustryProduction(direct, maxAbsoluteWeek);
    }
    return normalizeIndustryProductions(registry, maxAbsoluteWeek)[productionId] || null;
};

export const upsertIndustryProduction = (
    registry: Record<string, IndustryProductionCommitment> | undefined,
    production: IndustryProductionCommitment,
): Record<string, IndustryProductionCommitment> => {
    const normalizedRegistry = normalizeIndustryProductions(registry);
    const normalizedProduction = normalizeIndustryProduction(production, Number.MAX_SAFE_INTEGER);
    if (!normalizedProduction) return normalizedRegistry;
    return Object.fromEntries(Object.entries({
        ...normalizedRegistry,
        [normalizedProduction.id]: normalizedProduction,
    }).sort(([left], [right]) => left.localeCompare(right)));
};

/**
 * Fast update for registries that have already crossed the save/runtime
 * normalization boundary. The changed record is still normalized in full;
 * unrelated canonical records are retained by reference instead of being
 * reparsed for every production milestone in the same week.
 */
export const upsertCanonicalIndustryProduction = (
    registry: Record<string, IndustryProductionCommitment> | undefined,
    production: IndustryProductionCommitment,
): Record<string, IndustryProductionCommitment> => {
    const normalizedProduction = normalizeIndustryProduction(production, Number.MAX_SAFE_INTEGER);
    if (!normalizedProduction) return registry || {};
    return Object.fromEntries(Object.entries({
        ...(registry || {}),
        [normalizedProduction.id]: normalizedProduction,
    }).sort(([left], [right]) => left.localeCompare(right)));
};

export const removeIndustryProduction = (
    registry: Record<string, IndustryProductionCommitment> | undefined,
    productionId: string,
): Record<string, IndustryProductionCommitment> => {
    const next = normalizeIndustryProductions(registry);
    delete next[productionId];
    return next;
};
