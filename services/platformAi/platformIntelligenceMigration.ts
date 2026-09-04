import type {
    PlatformIntelligenceMigrationState,
    PlatformIntelligenceOutcome,
    PlatformIntelligenceOutcomeStatus,
    PlatformIntelligenceIntentRoute,
} from '../../types';

export const PLATFORM_INTELLIGENCE_MIGRATION_SCHEMA_VERSION = 1 as const;
export const PLATFORM_INTELLIGENCE_PROCESSED_KEY_LIMIT = 64;
export const PLATFORM_INTELLIGENCE_OUTCOME_LIMIT = 32;

const ROUTES = new Set<PlatformIntelligenceIntentRoute>([
    'COMMISSION_ORIGINAL', 'LICENSE_TITLE', 'ACQUIRE_CATALOGUE', 'TRANSFER_OWNED_TITLE',
    'RESEARCH_TECHNOLOGY', 'RESEARCH_LOCALIZATION', 'ENTER_MARKET',
    'LOCALIZE_COMMITTED_CONTENT', 'HOLD',
]);
const STATUSES = new Set<PlatformIntelligenceOutcomeStatus>(['EXECUTED', 'REJECTED', 'HELD']);
const record = (value: unknown): Record<string, unknown> => (
    value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
);
const wholeWeek = (value: unknown, fallback = 0): number => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : Math.max(0, Math.round(fallback));
};
const uniqueStrings = (value: unknown, limit: number): string[] => {
    const seen = new Set<string>();
    return (Array.isArray(value) ? value : []).flatMap(item => {
        if (typeof item !== 'string' || !item.trim() || seen.has(item.trim())) return [];
        seen.add(item.trim());
        return [item.trim()];
    }).slice(-limit);
};

export const createInitialPlatformIntelligenceMigrationState = (
    absoluteWeek: number,
): PlatformIntelligenceMigrationState => ({
    schemaVersion: PLATFORM_INTELLIGENCE_MIGRATION_SCHEMA_VERSION,
    activatedAtAbsoluteWeek: wholeWeek(absoluteWeek),
    legacyPlanningRetiredAtAbsoluteWeek: wholeWeek(absoluteWeek),
    processedProposalKeys: [],
    outcomes: [],
});

const normalizeOutcome = (value: unknown): PlatformIntelligenceOutcome | null => {
    const item = record(value);
    const id = typeof item.id === 'string' ? item.id.trim() : '';
    const proposalId = typeof item.proposalId === 'string' ? item.proposalId.trim() : '';
    const proposalKey = typeof item.proposalKey === 'string' ? item.proposalKey.trim() : '';
    const intentRoute = item.intentRoute as PlatformIntelligenceIntentRoute;
    const status = item.status as PlatformIntelligenceOutcomeStatus;
    if (!id || !proposalId || !proposalKey || !ROUTES.has(intentRoute) || !STATUSES.has(status)) return null;
    return {
        id, proposalId, proposalKey, intentRoute, status,
        absoluteWeek: wholeWeek(item.absoluteWeek),
        reason: typeof item.reason === 'string' && item.reason.trim() ? item.reason.trim() : 'UNSPECIFIED',
        canonicalReferenceIds: uniqueStrings(item.canonicalReferenceIds, 12),
    };
};

export const normalizePlatformIntelligenceMigrationState = (
    value: unknown,
    absoluteWeek: number,
): PlatformIntelligenceMigrationState => {
    const source = record(value);
    const outcomesById = new Map<string, PlatformIntelligenceOutcome>();
    for (const value of Array.isArray(source.outcomes) ? source.outcomes : []) {
        const outcome = normalizeOutcome(value);
        if (!outcome) continue;
        outcomesById.delete(outcome.id);
        outcomesById.set(outcome.id, outcome);
    }
    return {
        schemaVersion: PLATFORM_INTELLIGENCE_MIGRATION_SCHEMA_VERSION,
        activatedAtAbsoluteWeek: wholeWeek(source.activatedAtAbsoluteWeek, absoluteWeek),
        legacyPlanningRetiredAtAbsoluteWeek: wholeWeek(source.legacyPlanningRetiredAtAbsoluteWeek, absoluteWeek),
        processedProposalKeys: uniqueStrings(source.processedProposalKeys, PLATFORM_INTELLIGENCE_PROCESSED_KEY_LIMIT),
        outcomes: Array.from(outcomesById.values()).slice(-PLATFORM_INTELLIGENCE_OUTCOME_LIMIT),
    };
};

export const appendPlatformIntelligenceOutcome = (
    state: PlatformIntelligenceMigrationState,
    outcome: PlatformIntelligenceOutcome,
): PlatformIntelligenceMigrationState => normalizePlatformIntelligenceMigrationState({
    ...state,
    processedProposalKeys: [...state.processedProposalKeys, outcome.proposalKey],
    outcomes: [...state.outcomes.filter(item => item.id !== outcome.id), outcome],
}, state.activatedAtAbsoluteWeek);
