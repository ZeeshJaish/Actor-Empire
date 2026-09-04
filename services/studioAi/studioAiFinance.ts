import type {
    NPCStudioState,
    StudioAiCompanyStatus,
    StudioAiLedgerEntry,
} from '../../types';
import { createDeterministicId } from '../deterministicRandom';
import { getLegacyStudioValuationFloor } from '../studioEcosystem';
import {
    attachNormalizedStudioAiState,
    STUDIO_AI_EVENT_LIMIT,
    STUDIO_AI_LEDGER_LIMIT,
} from './studioAiState';

export interface StudioAiWeeklyFinanceInput {
    operatingRevenueMillions?: number;
    projectOutcomeMillions?: number;
}

const money = (value: number) => Math.round(value * 1000) / 1000;
const weeks = (value: number) => Math.round(value * 100) / 100;
const safe = (value: unknown, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
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

const deriveStatus = (
    previous: StudioAiCompanyStatus,
    cash: number,
    runwayWeeks: number,
    consecutiveLossWeeks: number,
    statusAgeWeeks: number,
): StudioAiCompanyStatus => {
    if (previous === 'CLOSED' || previous === 'SOLD_MERGED') return previous;
    if (previous === 'RESTRUCTURING') {
        if (cash <= 0 && consecutiveLossWeeks >= 104) return 'CLOSED';
        return runwayWeeks >= 26 && consecutiveLossWeeks === 0 && statusAgeWeeks >= 8 ? 'ACTIVE' : 'RESTRUCTURING';
    }
    if (previous === 'DISTRESSED') {
        if (runwayWeeks < 4 || consecutiveLossWeeks >= 52) return 'RESTRUCTURING';
        return runwayWeeks >= 26 && consecutiveLossWeeks === 0 ? 'ACTIVE' : 'DISTRESSED';
    }
    if (cash <= 0 || runwayWeeks < 8 || consecutiveLossWeeks >= 26) return 'DISTRESSED';
    if (previous === 'DORMANT') {
        return runwayWeeks >= 26 && consecutiveLossWeeks === 0 ? 'ACTIVE' : previous;
    }
    return 'ACTIVE';
};

export const processStudioAiFinanceWeek = (
    studio: NPCStudioState,
    absoluteWeek: number,
    input: StudioAiWeeklyFinanceInput = {},
): NPCStudioState => {
    const normalized = attachNormalizedStudioAiState(studio, { absoluteWeek });
    const runtime = normalized.ai!;
    if (runtime.controller === 'PLAYER' || runtime.status === 'CLOSED' || runtime.status === 'SOLD_MERGED') return normalized;
    if (runtime.lastProcessedAbsoluteWeek >= absoluteWeek) return normalized;

    const baseOperatingCost = money(Math.max(0, runtime.finance.weeklyOperatingCostMillions));
    // A restructuring is an operating programme, not a permanent label. The
    // catalogue still earns against the studio's established base while the
    // company explicitly cuts corporate overhead. No cash is injected here.
    const operatingCost = money(baseOperatingCost * (runtime.status === 'RESTRUCTURING' ? 0.72 : 1));
    const defaultRevenue = baseOperatingCost * (
        0.82
        + normalized.reputation / 240
        + Math.min(4, normalized.recentHits) * 0.055
        + runtime.competence.distribution / 900
    );
    const revenue = money(Math.max(0, safe(input.operatingRevenueMillions, defaultRevenue)));
    const projectOutcome = money(safe(input.projectOutcomeMillions));
    const debtService = money(Math.max(0, runtime.finance.debtPrincipalMillions) * 0.08 / 52);
    let balance = money(Math.max(0, normalized.cashReserve));
    const entries: StudioAiLedgerEntry[] = [];
    const addEntry = (category: StudioAiLedgerEntry['category'], amount: number, description: string) => {
        if (amount === 0) return;
        balance = money(balance + amount);
        entries.push({
            id: createDeterministicId('studio_ai_ledger', normalized.id, absoluteWeek, category),
            absoluteWeek,
            category,
            amountMillions: amount,
            balanceAfterMillions: balance,
            description,
        });
    };
    addEntry('CATALOGUE_OPERATIONS', revenue, 'Catalogue and operating income');
    addEntry('PROJECT_OUTCOME', projectOutcome, 'Settled project outcome');
    addEntry('OPERATING_COST', -operatingCost, 'Corporate and active-slate overhead');
    addEntry('DEBT_SERVICE', -debtService, 'Scheduled debt service');
    const shortfallBorrowing = balance < 0 ? money(-balance) : 0;
    addEntry('SHORTFALL_BORROWING', shortfallBorrowing, 'Shortfall borrowing added to company debt');

    const net = money(revenue + projectOutcome - operatingCost - debtService);
    const cash = money(Math.max(0, balance));
    const consecutiveLossWeeks = net < 0 ? runtime.finance.consecutiveLossWeeks + 1 : 0;
    const runwayWeeks = weeks(cash / Math.max(0.01, operatingCost + debtService));
    const latestStatusChangeWeek = runtime.events
        .filter(event => event.type === 'STATUS_CHANGED' && event.absoluteWeek <= absoluteWeek)
        .reduce((latest, event) => Math.max(latest, event.absoluteWeek), -1);
    const statusAgeWeeks = latestStatusChangeWeek >= 0
        ? Math.max(0, absoluteWeek - latestStatusChangeWeek)
        : Number.MAX_SAFE_INTEGER;
    const nextStatus = deriveStatus(runtime.status, cash, runwayWeeks, consecutiveLossWeeks, statusAgeWeeks);
    const statusChanged = nextStatus !== runtime.status;
    const valuationPressure = Math.max(-0.012, Math.min(0.008, net / Math.max(20, normalized.cashReserve + operatingCost * 26) * 0.08));
    const valuation = money(Math.max(
        getLegacyStudioValuationFloor(normalized.id),
        normalized.valuation * (1 + valuationPressure),
    ));

    return {
        ...normalized,
        cashReserve: cash,
        valuation,
        ai: {
            ...runtime,
            status: nextStatus,
            finance: {
                ...runtime.finance,
                debtPrincipalMillions: money(runtime.finance.debtPrincipalMillions + shortfallBorrowing),
                runwayWeeks,
                consecutiveLossWeeks,
            },
            ledger: [...runtime.ledger, ...entries]
                .sort((left, right) => left.absoluteWeek - right.absoluteWeek
                    || (ledgerOrder[left.category] ?? 99) - (ledgerOrder[right.category] ?? 99)
                    || left.id.localeCompare(right.id))
                .slice(-STUDIO_AI_LEDGER_LIMIT),
            events: statusChanged ? [...runtime.events, {
                id: createDeterministicId('studio_ai_status', normalized.id, absoluteWeek, nextStatus),
                absoluteWeek,
                type: 'STATUS_CHANGED' as const,
                summary: `${normalized.name}'s operating condition changed after sustained financial results.`,
            }].slice(-STUDIO_AI_EVENT_LIMIT) : runtime.events,
            lastProcessedAbsoluteWeek: absoluteWeek,
        },
    };
};
