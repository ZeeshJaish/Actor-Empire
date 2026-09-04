import {
    STUDIO_AI_RUNTIME_SCHEMA_VERSION,
    type NPCStudioState,
    type StudioAiCapacityState,
    type StudioAiCompanyStatus,
    type StudioAiCompetence,
    type StudioAiController,
    type StudioAiDecisionRecord,
    type StudioAiEventRecord,
    type StudioAiLedgerEntry,
    type StudioAiRuntimeState,
} from '../../types';
import { createDeterministicId } from '../deterministicRandom';
import {
    createInitialIndustryIntelligenceState,
    normalizeIndustryIntelligenceState,
} from '../industryIntelligence/industryIntelligenceState';
import { getStudioAiProfileSeed } from './studioAiProfiles';
import { isStudioAiSlateActive, normalizeStudioAiSlateState } from './studioAiSlateState';

export const STUDIO_AI_SCHEMA_VERSION = STUDIO_AI_RUNTIME_SCHEMA_VERSION;
export const STUDIO_AI_LEDGER_LIMIT = 104;
export const STUDIO_AI_EVENT_LIMIT = 48;
export const STUDIO_AI_DECISION_LIMIT = 48;

const finite = (value: unknown, fallback = 0): number => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
};
const nonNegative = (value: unknown, fallback = 0): number => Math.max(0, finite(value, fallback));
const bounded = (value: unknown, fallback = 50): number => Math.max(1, Math.min(100, Math.round(finite(value, fallback))));
const whole = (value: unknown, fallback = 0): number => Math.max(0, Math.round(finite(value, fallback)));
const ids = (value: unknown): string[] => Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === 'string' && Boolean(item)))].slice(-104)
    : [];

const status = (value: unknown, fallback: StudioAiCompanyStatus): StudioAiCompanyStatus => (
    ['ACTIVE', 'DISTRESSED', 'RESTRUCTURING', 'DORMANT', 'SOLD_MERGED', 'CLOSED'].includes(String(value))
        ? value as StudioAiCompanyStatus
        : fallback
);
const controller = (value: unknown): StudioAiController => value === 'PLAYER' ? 'PLAYER' : 'AI';
const ledgerOrder: Record<StudioAiLedgerEntry['category'], number> = {
    CATALOGUE_OPERATIONS: 0,
    DEVELOPMENT: 1,
    REWRITE: 2,
    PRODUCTION: 3,
    RELEASE_MARKETING: 4,
    RIGHTS_INCOME: 5,
    TURNAROUND: 6,
    PROJECT_OUTCOME: 7,
    OPERATING_COST: 8,
    DEBT_SERVICE: 9,
    SHORTFALL_BORROWING: 10,
    OWNERSHIP_HANDOFF: 11,
};

const normalizeLedger = (value: unknown): StudioAiLedgerEntry[] => (Array.isArray(value) ? value : [])
    .flatMap((raw, index) => {
        if (!raw || typeof raw !== 'object') return [];
        const item = raw as Partial<StudioAiLedgerEntry>;
        if (!item.id || !item.category || !Number.isFinite(Number(item.amountMillions))) return [];
        return [{
            id: String(item.id),
            absoluteWeek: whole(item.absoluteWeek),
            category: item.category,
            amountMillions: finite(item.amountMillions),
            balanceAfterMillions: finite(item.balanceAfterMillions),
            description: String(item.description || `Studio transaction ${index + 1}`),
        }];
    })
    .sort((left, right) => left.absoluteWeek - right.absoluteWeek
        || (ledgerOrder[left.category] ?? 99) - (ledgerOrder[right.category] ?? 99)
        || left.id.localeCompare(right.id))
    .slice(-STUDIO_AI_LEDGER_LIMIT);

const normalizeEvents = (value: unknown): StudioAiEventRecord[] => (Array.isArray(value) ? value : [])
    .filter((item): item is StudioAiEventRecord => Boolean(item && typeof item.id === 'string' && typeof item.type === 'string'))
    .slice(-STUDIO_AI_EVENT_LIMIT);
const normalizeDecisions = (value: unknown): StudioAiDecisionRecord[] => (Array.isArray(value) ? value : [])
    .filter((item): item is StudioAiDecisionRecord => Boolean(item && typeof item.id === 'string' && typeof item.type === 'string'))
    .slice(-STUDIO_AI_DECISION_LIMIT);

export interface NormalizeStudioAiContext {
    absoluteWeek: number;
    controller?: StudioAiController;
    status?: StudioAiCompanyStatus;
}

export const normalizeStudioAiState = (
    studio: NPCStudioState,
    context: NormalizeStudioAiContext,
): StudioAiRuntimeState => {
    const seed = getStudioAiProfileSeed(studio);
    const raw = studio.ai as Partial<StudioAiRuntimeState> | undefined;
    const weeklyOperatingCostMillions = nonNegative(raw?.finance?.weeklyOperatingCostMillions, seed.weeklyOperatingCostMillions);
    const cash = nonNegative(studio.cashReserve);
    const finance = {
        debtPrincipalMillions: nonNegative(raw?.finance?.debtPrincipalMillions),
        weeklyOperatingCostMillions,
        committedSpendMillions: nonNegative(raw?.finance?.committedSpendMillions),
        runwayWeeks: Math.round(cash / Math.max(0.01, weeklyOperatingCostMillions) * 100) / 100,
        consecutiveLossWeeks: whole(raw?.finance?.consecutiveLossWeeks),
        restructuringStartedAtAbsoluteWeek: raw?.finance?.restructuringStartedAtAbsoluteWeek === null || raw?.finance?.restructuringStartedAtAbsoluteWeek === undefined
            ? null
            : whole(raw.finance.restructuringStartedAtAbsoluteWeek),
    };
    const competence: StudioAiCompetence = Object.fromEntries(
        Object.entries(seed.competence).map(([key, fallback]) => [key, bounded(raw?.competence?.[key as keyof StudioAiCompetence], fallback)]),
    ) as unknown as StudioAiCompetence;
    const capacity: StudioAiCapacityState = {
        developmentSlots: Math.max(1, whole(raw?.capacity?.developmentSlots, seed.capacity.developmentSlots)),
        productionSlots: Math.max(1, whole(raw?.capacity?.productionSlots, seed.capacity.productionSlots)),
        releaseSlotsPerQuarter: Math.max(1, whole(raw?.capacity?.releaseSlotsPerQuarter, seed.capacity.releaseSlotsPerQuarter)),
        committedDevelopmentSlots: whole(raw?.capacity?.committedDevelopmentSlots),
        committedProductionSlots: whole(raw?.capacity?.committedProductionSlots),
    };
    const fallbackStatus: StudioAiCompanyStatus = context.status || (studio.isNpcVenture && studio.ai?.status === 'CLOSED' ? 'CLOSED' : 'ACTIVE');
    const slate = normalizeStudioAiSlateState(raw?.slate, context.absoluteWeek);
    const committedDevelopmentSlots = slate.commitments.filter(item => ['DEVELOPING', 'REWRITE'].includes(item.status)).length;
    const committedProductionSlots = slate.commitments.filter(item => item.status === 'GREENLIT' && isStudioAiSlateActive(item.status)).length;
    const intelligenceFallback = createInitialIndustryIntelligenceState(
        studio.id,
        'PRODUCTION_STUDIO',
        String(raw?.seed || createDeterministicId('studio_ai_seed', studio.id)),
        context.absoluteWeek,
    );
    return {
        schemaVersion: STUDIO_AI_SCHEMA_VERSION,
        studioId: studio.id,
        origin: raw?.origin || seed.origin,
        controller: context.controller || controller(raw?.controller),
        status: status(context.status || raw?.status, fallbackStatus),
        seed: String(raw?.seed || createDeterministicId('studio_ai_seed', studio.id)),
        profile: {
            strategy: raw?.profile?.strategy || seed.profile.strategy,
            launchClass: raw?.profile?.launchClass || seed.profile.launchClass,
            riskTolerance: bounded(raw?.profile?.riskTolerance, seed.profile.riskTolerance),
            budgetAppetite: bounded(raw?.profile?.budgetAppetite, seed.profile.budgetAppetite),
            creativePatience: bounded(raw?.profile?.creativePatience, seed.profile.creativePatience),
            franchiseDependence: bounded(raw?.profile?.franchiseDependence, seed.profile.franchiseDependence),
            prestigeAmbition: bounded(raw?.profile?.prestigeAmbition, seed.profile.prestigeAmbition),
            financialDiscipline: bounded(raw?.profile?.financialDiscipline, seed.profile.financialDiscipline),
        },
        competence,
        finance,
        capacity: {
            ...capacity,
            committedDevelopmentSlots,
            committedProductionSlots,
        },
        ledger: normalizeLedger(raw?.ledger),
        decisions: normalizeDecisions(raw?.decisions),
        events: normalizeEvents(raw?.events),
        legacyVenture: raw?.legacyVenture ? {
            ...raw.legacyVenture,
            history: Array.isArray(raw.legacyVenture.history)
                ? raw.legacyVenture.history.map(entry => ({ ...entry })).slice(0, 24)
                : [],
        } : undefined,
        migrationKeys: ids(raw?.migrationKeys),
        handoffKeys: ids(raw?.handoffKeys),
        lastProcessedAbsoluteWeek: raw?.lastProcessedAbsoluteWeek === undefined
            ? Math.max(0, whole(context.absoluteWeek) - 1)
            : whole(raw.lastProcessedAbsoluteWeek),
        intelligence: normalizeIndustryIntelligenceState(raw?.intelligence, intelligenceFallback),
        slate,
    };
};

export const attachNormalizedStudioAiState = (
    studio: NPCStudioState,
    context: NormalizeStudioAiContext,
): NPCStudioState => ({
    ...studio,
    cashReserve: nonNegative(studio.cashReserve),
    valuation: nonNegative(studio.valuation, 0.01),
    reputation: Math.max(0, Math.min(100, finite(studio.reputation, 50))),
    ai: normalizeStudioAiState(studio, context),
});
