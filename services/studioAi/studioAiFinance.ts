import { moveCinemaNpcCash } from '../boxOffice/boxOfficeSettlement';
import type {
    NPCStudioState,
    StudioAiCompanyStatus,
    StudioAiEventRecord,
    StudioAiLedgerEntry,
} from '../../types';
import { createDeterministicId } from '../deterministicRandom';
import { getLegacyStudioValuationFloor } from '../studioEcosystem';
import { boundListedStudioAppraisal } from '../stockValuation';
import {
    attachNormalizedStudioAiState,
    STUDIO_AI_EVENT_LIMIT,
    STUDIO_AI_LEDGER_LIMIT,
} from './studioAiState';
import {
    applyForStudioLoan,
    COMEBACK_EVENT,
    convertLegacyStudioDebt,
    getStudioBankCushionMillions,
    getStudioWeeklyLoanPaymentsMillions,
    hasRecentStudioLoan,
    repayStudioLoansEarly,
    serviceStudioLoansWeek,
    wasRefusedByBankLately,
} from './studioAiBank';

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
    TALENT_BACKEND: 5.5,
    TURNAROUND: 6,
    PROJECT_OUTCOME: 7,
    OPERATING_COST: 8,
    DEBT_SERVICE: 9,
    SHORTFALL_BORROWING: 10,
    OWNERSHIP_HANDOFF: 11,
};

/* 18 Nov 2026 (rival studio debt plan v2): a studio's condition follows its real money. That is its cash, plus what
   the Bank would still lend it while it is not yet living on loans, measured in weeks of its obligations (running
   costs and loan payments), and its record with the Bank. It used to follow only whether the week's catalogue income beat overhead, so a studio holding
   billions could be marked "restructuring". */
const deriveStatus = (
    previous: StudioAiCompanyStatus,
    cash: number,
    liquidityWeeks: number,
    missedThisWeek: boolean,
    hasDefault: boolean,
    statusAgeWeeks: number,
): StudioAiCompanyStatus => {
    if (previous === 'CLOSED' || previous === 'SOLD_MERGED') return previous;
    if (previous === 'RESTRUCTURING') {
        if (cash < 0 && statusAgeWeeks >= 104) return 'CLOSED';
        return liquidityWeeks >= 26 && !hasDefault && !missedThisWeek && statusAgeWeeks >= 8 ? 'ACTIVE' : 'RESTRUCTURING';
    }
    if (hasDefault) return 'RESTRUCTURING';
    if (previous === 'DISTRESSED') {
        if (statusAgeWeeks >= 26 && liquidityWeeks < 13) return 'RESTRUCTURING';
        return liquidityWeeks >= 26 && !missedThisWeek && cash >= 0 ? 'ACTIVE' : 'DISTRESSED';
    }
    if (cash < 0 || missedThisWeek || liquidityWeeks < 13) return 'DISTRESSED';
    if (previous === 'DORMANT') {
        return liquidityWeeks >= 26 ? 'ACTIVE' : previous;
    }
    return 'ACTIVE';
};

export const processStudioAiFinanceWeek = (
    studio: NPCStudioState,
    absoluteWeek: number,
    input: StudioAiWeeklyFinanceInput = {},
): NPCStudioState => {
    let normalized = attachNormalizedStudioAiState(boundListedStudioAppraisal(studio, studio.valuation, absoluteWeek), { absoluteWeek });
    const runtime = normalized.ai!;
    if (runtime.controller === 'PLAYER' || runtime.status === 'CLOSED' || runtime.status === 'SOLD_MERGED') return normalized;
    if (runtime.lastProcessedAbsoluteWeek >= absoluteWeek) return normalized;

    /* a balance owed before the studio had a Bank becomes a Bank loan (nothing is forgiven) */
    normalized = convertLegacyStudioDebt(normalized, absoluteWeek);

    const baseOperatingCost = money(Math.max(0, normalized.ai!.finance.weeklyOperatingCostMillions));
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
    /* cash below zero is a bill the studio still owes: it is carried into the week, not reset to zero */
    let balance = Number.isFinite(normalized.cashReserve) ? normalized.cashReserve : 0;
    const entries: StudioAiLedgerEntry[] = [];
    const addEntry = (category: StudioAiLedgerEntry['category'], amount: number, description: string, salt = '') => {
        if (amount === 0) return;
        balance = moveCinemaNpcCash(balance,amount);
        entries.push({
            id: createDeterministicId('studio_ai_ledger', normalized.id, absoluteWeek, category, salt),
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

    /* the week's loan payments, under the Bank's rules */
    const service = serviceStudioLoansWeek(normalized, balance, absoluteWeek);
    if (service.paidMillions > 0) {
        balance = service.balanceMillions;
        entries.push({
            id: createDeterministicId('studio_ai_ledger', normalized.id, absoluteWeek, 'DEBT_SERVICE'),
            absoluteWeek,
            category: 'DEBT_SERVICE',
            amountMillions: -money(service.paidMillions),
            balanceAfterMillions: balance,
            description: 'Bank loan payments',
        });
    }
    const bankEvents: StudioAiEventRecord[] = [...service.events];
    let working: NPCStudioState = {
        ...normalized,
        cashReserve: balance,
        reputation: Math.max(0, Math.min(100, normalized.reputation + service.reputationDelta)),
        ai: {
            ...normalized.ai!,
            /* a studio that has never been to the Bank keeps no loan record (saves stay small) */
            finance: {
                ...normalized.ai!.finance,
                ...(service.loans.length || normalized.ai!.finance.loans ? { loans: service.loans } : {}),
                ...(service.loans.length || normalized.ai!.finance.credit ? { credit: service.credit } : {}),
            },
            ledger: [...normalized.ai!.ledger, ...entries].slice(-STUDIO_AI_LEDGER_LIMIT),
        },
    };

    /* short of cash after the week's bills: the studio asks the Bank (after a refusal it waits 4 weeks before asking again) */
    if (balance < 0 && !wasRefusedByBankLately(working, absoluteWeek, 'BILLS')) {
        const application = applyForStudioLoan(working, -balance, absoluteWeek, 'BILLS');
        if (application.approved) working = application.studio;
        else bankEvents.push(application.event);
        balance = working.cashReserve;
    }

    /* cash above the reserve pays loans down early */
    const operatingObligations = operatingCost + getStudioWeeklyLoanPaymentsMillions(working);
    const early = repayStudioLoansEarly(working, working.ai!.finance.loans || [], balance, operatingObligations, absoluteWeek);
    if (early.repaidMillions > 0) {
        balance = early.balanceMillions;
        bankEvents.push(...early.events);
        working = {
            ...working,
            cashReserve: balance,
            ai: {
                ...working.ai!,
                finance: { ...working.ai!.finance, loans: early.loans, credit: early.credit },
                ledger: [...working.ai!.ledger, {
                    id: createDeterministicId('studio_ai_ledger', normalized.id, absoluteWeek, 'DEBT_SERVICE', 'early'),
                    absoluteWeek,
                    category: 'DEBT_SERVICE' as const,
                    amountMillions: -money(early.repaidMillions),
                    balanceAfterMillions: balance,
                    description: 'Early loan repayment',
                }].slice(-STUDIO_AI_LEDGER_LIMIT),
            },
        };
    }

    const net = money(revenue + projectOutcome - operatingCost - service.paidMillions);
    const cash = balance;
    const consecutiveLossWeeks = net < 0 ? runtime.finance.consecutiveLossWeeks + 1 : 0;
    const obligations = operatingCost + getStudioWeeklyLoanPaymentsMillions(working);
    const runwayWeeks = weeks(Math.max(0, cash) / Math.max(0.01, obligations));
    /* the Bank's money counts as a cushion only for a studio not yet living on loans (once it is borrowing, only its
       own cash keeps it safe), and only as far as the Bank is likely to say yes (its own odds for this studio) */
    const livingOnLoans = (working.ai!.finance.loans || []).some(loan => (loan.status === 'ACTIVE' || loan.status === 'DEFAULTED') && loan.principal > 0);
    /* the Bank's figure (a full valuation of the studio) is worked out only when it can change the status: every
       threshold below is 26 weeks or less, so a studio whose own cash already covers 26 weeks gets the same answer */
    const cashWeeks = cash / Math.max(0.01, obligations);
    const liquidityWeeks = cashWeeks >= 26 || livingOnLoans
        ? cashWeeks
        : (cash + getStudioBankCushionMillions(working, absoluteWeek)) / Math.max(0.01, obligations);
    const hasDefault = (working.ai!.finance.loans || []).some(loan => loan.status === 'DEFAULTED' && loan.principal > 0);
    const latestStatusChangeWeek = runtime.events
        .filter(event => event.type === 'STATUS_CHANGED' && event.absoluteWeek <= absoluteWeek)
        .reduce((latest, event) => Math.max(latest, event.absoluteWeek), -1);
    const statusAgeWeeks = latestStatusChangeWeek >= 0
        ? Math.max(0, absoluteWeek - latestStatusChangeWeek)
        : Number.MAX_SAFE_INTEGER;
    const nextStatus = deriveStatus(runtime.status, cash, liquidityWeeks, service.missed, hasDefault, statusAgeWeeks);
    const statusChanged = nextStatus !== runtime.status;
    const valuationPressure = Math.max(-0.012, Math.min(0.008, net / Math.max(20, normalized.cashReserve + operatingCost * 26) * 0.08));
    const valuation = money(Math.max(
        getLegacyStudioValuationFloor(normalized.id),
        normalized.valuation * (1 + valuationPressure),
    ));
    const statusEvents: StudioAiEventRecord[] = statusChanged ? [{
        id: createDeterministicId('studio_ai_status', normalized.id, absoluteWeek, nextStatus),
        absoluteWeek,
        type: 'STATUS_CHANGED' as const,
        summary: `${normalized.name}'s operating condition changed after sustained financial results.`,
    }] : [];
    /* a recovery on borrowed money is a comeback */
    const comeback = statusChanged && nextStatus === 'ACTIVE' && (runtime.status === 'DISTRESSED' || runtime.status === 'RESTRUCTURING')
        && hasRecentStudioLoan(working, absoluteWeek)
        ? [COMEBACK_EVENT(working, absoluteWeek)] : [];

    return {
        ...boundListedStudioAppraisal({ ...working, valuation: normalized.valuation }, valuation, absoluteWeek),
        cashReserve: cash,
        ai: {
            ...working.ai!,
            status: nextStatus,
            finance: {
                ...working.ai!.finance,
                debtPrincipalMillions: 0,
                runwayWeeks,
                consecutiveLossWeeks,
            },
            ledger: [...working.ai!.ledger]
                .sort((left, right) => left.absoluteWeek - right.absoluteWeek
                    || (ledgerOrder[left.category] ?? 99) - (ledgerOrder[right.category] ?? 99)
                    || left.id.localeCompare(right.id))
                .slice(-STUDIO_AI_LEDGER_LIMIT),
            events: [...working.ai!.events, ...bankEvents, ...statusEvents, ...comeback].slice(-STUDIO_AI_EVENT_LIMIT),
            lastProcessedAbsoluteWeek: absoluteWeek,
        },
    };
};
