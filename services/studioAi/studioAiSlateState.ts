import type {
    StudioAiSlateCommitment,
    StudioAiSlateSource,
    StudioAiSlateState,
    StudioAiSlateStatus,
} from '../../types';

export const STUDIO_AI_SLATE_SCHEMA_VERSION = 1 as const;
export const STUDIO_AI_SLATE_COMMITMENT_LIMIT = 24;
export const STUDIO_AI_SLATE_KEY_LIMIT = 64;

const ACTIVE_STATUSES = new Set<StudioAiSlateStatus>(['DEVELOPING', 'REWRITE', 'GREENLIT']);
const VALID_STATUSES = new Set<StudioAiSlateStatus>([
    'DEVELOPING', 'REWRITE', 'ON_HOLD', 'GREENLIT', 'HANDED_OFF', 'TURNAROUND', 'ABANDONED', 'CANCELLED',
]);
const finite = (value: unknown, fallback = 0): number => Number.isFinite(Number(value)) ? Number(value) : fallback;
const whole = (value: unknown, fallback = 0): number => Math.max(0, Math.round(finite(value, fallback)));
const money = (value: unknown, fallback = 0): number => Math.round(Math.max(0, finite(value, fallback)) * 1000) / 1000;
const keys = (value: unknown): string[] => Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === 'string' && Boolean(item)))].slice(-STUDIO_AI_SLATE_KEY_LIMIT)
    : [];

export const isStudioAiSlateActive = (status: StudioAiSlateStatus): boolean => ACTIVE_STATUSES.has(status);

export const createInitialStudioAiSlateState = (absoluteWeek: number): StudioAiSlateState => ({
    schemaVersion: STUDIO_AI_SLATE_SCHEMA_VERSION,
    activatedAtAbsoluteWeek: whole(absoluteWeek),
    legacyProjectOriginRetiredAtAbsoluteWeek: whole(absoluteWeek),
    commitments: [],
    processedProposalKeys: [],
    processedReviewKeys: [],
});

const normalizeCommitment = (value: unknown): StudioAiSlateCommitment | null => {
    if (!value || typeof value !== 'object') return null;
    const raw = value as Partial<StudioAiSlateCommitment>;
    if (!raw.id || !raw.proposalId || !raw.proposalKey || !raw.fingerprintId || !VALID_STATUSES.has(raw.status as StudioAiSlateStatus)) return null;
    const source: StudioAiSlateSource = raw.source === 'COMMISSION' ? 'COMMISSION' : 'INDEPENDENT';
    const status = raw.status as StudioAiSlateStatus;
    const scores = raw.scores ? {
        creative: whole(raw.scores.creative),
        commercial: whole(raw.scores.commercial),
        prestige: whole(raw.scores.prestige),
        execution: whole(raw.scores.execution),
        financialRisk: whole(raw.scores.financialRisk),
        greenlightConfidence: whole(raw.scores.greenlightConfidence),
    } : undefined;
    return {
        id: String(raw.id),
        proposalId: String(raw.proposalId),
        proposalKey: String(raw.proposalKey),
        fingerprintId: String(raw.fingerprintId),
        source,
        industryProductionId: raw.industryProductionId ? String(raw.industryProductionId) : undefined,
        commissioningPlatformId: raw.commissioningPlatformId,
        status,
        createdAtAbsoluteWeek: whole(raw.createdAtAbsoluteWeek),
        updatedAtAbsoluteWeek: whole(raw.updatedAtAbsoluteWeek),
        nextReviewAbsoluteWeek: raw.nextReviewAbsoluteWeek === null || raw.nextReviewAbsoluteWeek === undefined
            ? null
            : whole(raw.nextReviewAbsoluteWeek),
        developmentSpendMillions: money(raw.developmentSpendMillions),
        rewriteCount: whole(raw.rewriteCount),
        proposedBudgetMillions: money(raw.proposedBudgetMillions),
        proposalSnapshot: raw.proposalSnapshot ? {
            confidence: whole(raw.proposalSnapshot.confidence),
            affordabilityCeilingMillions: money(raw.proposalSnapshot.affordabilityCeilingMillions),
            score: {
                total: whole(raw.proposalSnapshot.score?.total),
                need: whole(raw.proposalSnapshot.score?.need),
                strategyFit: whole(raw.proposalSnapshot.score?.strategyFit),
                expectedUpside: whole(raw.proposalSnapshot.score?.expectedUpside),
                relationshipValue: whole(raw.proposalSnapshot.score?.relationshipValue),
                competitiveValue: whole(raw.proposalSnapshot.score?.competitiveValue),
                financialRisk: whole(raw.proposalSnapshot.score?.financialRisk),
                capacityPressure: whole(raw.proposalSnapshot.score?.capacityPressure),
                fatigue: whole(raw.proposalSnapshot.score?.fatigue),
                executionRisk: whole(raw.proposalSnapshot.score?.executionRisk),
            },
            uncertaintyKey: String(raw.proposalSnapshot.uncertaintyKey || raw.proposalKey),
        } : undefined,
        greenlightBudgetMillions: raw.greenlightBudgetMillions === undefined ? undefined : money(raw.greenlightBudgetMillions),
        greenlitAtAbsoluteWeek: raw.greenlitAtAbsoluteWeek === undefined ? undefined : whole(raw.greenlitAtAbsoluteWeek),
        scores,
        legacyReleaseConsumedAtAbsoluteWeek: raw.legacyReleaseConsumedAtAbsoluteWeek === undefined
            ? undefined
            : whole(raw.legacyReleaseConsumedAtAbsoluteWeek),
    };
};

export const normalizeStudioAiSlateState = (value: unknown, absoluteWeek: number): StudioAiSlateState => {
    if (!value || typeof value !== 'object') return createInitialStudioAiSlateState(absoluteWeek);
    const raw = value as Partial<StudioAiSlateState>;
    const commitments = (Array.isArray(raw.commitments) ? raw.commitments : [])
        .map(normalizeCommitment)
        .filter((item): item is StudioAiSlateCommitment => Boolean(item));
    const unique = [...new Map(commitments.map(item => [item.id, item])).values()];
    const active = unique.filter(item => isStudioAiSlateActive(item.status));
    const terminal = unique
        .filter(item => !isStudioAiSlateActive(item.status))
        .sort((left, right) => left.updatedAtAbsoluteWeek - right.updatedAtAbsoluteWeek || left.id.localeCompare(right.id))
        .slice(-Math.max(0, STUDIO_AI_SLATE_COMMITMENT_LIMIT - active.length));
    return {
        schemaVersion: STUDIO_AI_SLATE_SCHEMA_VERSION,
        activatedAtAbsoluteWeek: whole(raw.activatedAtAbsoluteWeek),
        legacyProjectOriginRetiredAtAbsoluteWeek: Number.isFinite(Number(raw.legacyProjectOriginRetiredAtAbsoluteWeek))
            ? whole(raw.legacyProjectOriginRetiredAtAbsoluteWeek)
            : whole(absoluteWeek),
        commitments: [...terminal, ...active]
            .sort((left, right) => left.createdAtAbsoluteWeek - right.createdAtAbsoluteWeek || left.id.localeCompare(right.id)),
        processedProposalKeys: keys(raw.processedProposalKeys),
        processedReviewKeys: keys(raw.processedReviewKeys),
    };
};

export const appendStudioAiSlateKey = (items: string[], key: string): string[] => (
    [...items.filter(item => item !== key), key].slice(-STUDIO_AI_SLATE_KEY_LIMIT)
);
