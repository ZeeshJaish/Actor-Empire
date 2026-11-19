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
    type PlayerLoan,
    type StudioBankCreditHistory,
} from '../../types';
import { createDeterministicId } from '../deterministicRandom';
import {
    createInitialIndustryIntelligenceState,
    normalizeIndustryIntelligenceState,
} from '../industryIntelligence/industryIntelligenceState';
import { getStudioAiProfileSeed } from './studioAiProfiles';
import { isStudioAiSlateActive, normalizeStudioAiSlateState } from './studioAiSlateState';
import { normalizeStudioAiLessons } from './studioAiLearning';

export const STUDIO_AI_SCHEMA_VERSION = STUDIO_AI_RUNTIME_SCHEMA_VERSION;
export const STUDIO_AI_LEDGER_LIMIT = 160;
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
    TALENT_BACKEND: 5.5,
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

const finiteOr = (value: unknown, fallback = 0) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);
/* loans keep their Bank terms; a paid loan is dropped once it is a year old, so the record stays small */
const normalizeStudioBankLoans = (value: unknown): PlayerLoan[] => (Array.isArray(value) ? value : [])
    .filter((loan: any) => loan && typeof loan.id === 'string')
    .map((loan: any): PlayerLoan => ({
        id: loan.id,
        lenderName: String(loan.lenderName || 'Citywide Credit'),
        principal: Math.max(0, finiteOr(loan.principal)),
        originalPrincipal: Math.max(0, finiteOr(loan.originalPrincipal, finiteOr(loan.principal))),
        annualInterestRate: Math.max(0, Math.min(0.5, finiteOr(loan.annualInterestRate, 0.12))),
        weeklyPayment: Math.max(0, finiteOr(loan.weeklyPayment)),
        termWeeks: Math.max(1, Math.round(finiteOr(loan.termWeeks, 104))),
        weeksRemaining: Math.max(0, Math.round(finiteOr(loan.weeksRemaining))),
        takenWeek: Math.round(finiteOr(loan.takenWeek)),
        takenYear: Math.round(finiteOr(loan.takenYear)),
        takenAbsoluteWeek: Math.round(finiteOr(loan.takenAbsoluteWeek)),
        missedPayments: Math.max(0, Math.round(finiteOr(loan.missedPayments))),
        successfulPayments: Math.max(0, Math.round(finiteOr(loan.successfulPayments))),
        status: loan.status === 'PAID' || loan.status === 'DEFAULTED' ? loan.status : 'ACTIVE',
    }))
    .slice(-12);
const normalizeStudioBankCredit = (value: any): StudioBankCreditHistory => ({
    successfulPayments: Math.max(0, Math.round(finiteOr(value?.successfulPayments))),
    missedPayments: Math.max(0, Math.round(finiteOr(value?.missedPayments))),
    defaults: Math.max(0, Math.round(finiteOr(value?.defaults))),
    totalBorrowed: Math.max(0, finiteOr(value?.totalBorrowed)),
    totalRepaid: Math.max(0, finiteOr(value?.totalRepaid)),
    ...(typeof value?.lastLoanAbsoluteWeek === 'number' ? { lastLoanAbsoluteWeek: value.lastLoanAbsoluteWeek } : {}),
});

export interface NormalizeStudioAiContext {
    absoluteWeek: number;
    controller?: StudioAiController;
    status?: StudioAiCompanyStatus;
}

/** Exact intelligence projection without rebuilding unrelated slate/finance history. */
export const readNormalizedStudioAiIntelligence = (
    studio: NPCStudioState,
    context: NormalizeStudioAiContext,
) => {
    const raw = studio.ai as Partial<StudioAiRuntimeState> | undefined;
    return normalizeIndustryIntelligenceState(raw?.intelligence, createInitialIndustryIntelligenceState(
        studio.id,
        'PRODUCTION_STUDIO',
        String(raw?.seed || createDeterministicId('studio_ai_seed', studio.id)),
        context.absoluteWeek,
    ));
};

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
        /* 18 Nov 2026: the studio's Bank loans and its record with the Bank (studioAiBank.ts) */
        /* kept exactly when present (even empty), so normalizing a processed studio changes nothing */
        ...(Array.isArray(raw?.finance?.loans) ? { loans: normalizeStudioBankLoans(raw!.finance!.loans) } : {}),
        ...(raw?.finance?.credit ? { credit: normalizeStudioBankCredit(raw.finance.credit) } : {}),
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
        intelligence: readNormalizedStudioAiIntelligence(studio, context),
        slate,
        /* 18 Nov 2026 (rival learning): its finished cinema runs, forecast against what came back; kept only when present */
        ...(Array.isArray(raw?.lessons) ? { lessons: normalizeStudioAiLessons(raw!.lessons) } : {}),
    };
};

export const attachNormalizedStudioAiState = (
    studio: NPCStudioState,
    context: NormalizeStudioAiContext,
): NPCStudioState => ({
    ...studio,
    /* 18 Nov 2026 (debt plan v2): cash below zero is a bill the studio still owes. It is kept, not reset to zero,
       which used to forgive it every week. */
    cashReserve: finite(studio.cashReserve, 0),
    valuation: nonNegative(studio.valuation, 0.01),
    reputation: Math.max(0, Math.min(100, finite(studio.reputation, 50))),
    ai: normalizeStudioAiState(studio, context),
});
