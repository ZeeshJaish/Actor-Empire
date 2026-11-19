/**
 * Rival studios at the Bank (18 Nov 2026, rival studio debt plan v2: qa/2026-11-18-studio-debt/PLAN.md).
 *
 * A rival borrows, pays and fails under the player's Bank rules (loanLogic.ts and the weekly loan service in
 * gameLoop.ts), read through its own numbers (studioBank.ts):
 * - It asks for what is missing plus a quarter of its running costs. The Bank approves by its own approval odds for
 *   this studio; the roll is fixed per studio, week and reason, so a seeded run repeats.
 * - A loan is on the Bank's longest term (104 weeks), with the Bank's rate and weekly payment for this studio.
 * - A missed payment: a late fee of 1% of the original amount, the interest added to the balance, reputation −2.
 *   3 misses: default, reputation −8.
 * - Cash above a reserve of 26 weeks of obligations (plus committed spend) pays loans down early. The share depends
 *   on the studio's financial discipline (10–25% a week).
 * - A balance a studio owed before it had a Bank becomes a Bank loan on the Bank's terms. Nothing is forgiven.
 *
 * Cash here is in millions; the Bank works in dollars.
 */
import type { NPCStudioState, PlayerLoan, StudioAiBankEvent, StudioAiEventRecord, StudioAiLedgerEntry, StudioBankCreditHistory } from '../../types';
import { moveCinemaNpcCash } from '../boxOffice/boxOfficeSettlement';
import { createDeterministicId, createDeterministicRng } from '../deterministicRandom';
import { getBorrowerLoanApprovalOdds, getBorrowerSafeCapacity } from '../loanLogic';
import { BANK_LONGEST_TERM_WEEKS, getBankTerms, getRivalBorrowerProfile, getStudioCreditHistory } from '../studioBank';
import { STUDIO_AI_EVENT_LIMIT, STUDIO_AI_LEDGER_LIMIT } from './studioAiState';

const M = 1_000_000;
export const STUDIO_BANK_QUARTER_WEEKS = 13;
export const STUDIO_BANK_RESERVE_WEEKS = 26;

const finite = (value: unknown, fallback = 0) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);
const toCents = (dollars: number) => Math.round(dollars * 100) / 100;

const creditOf = (studio: NPCStudioState): StudioBankCreditHistory => ({
    ...getStudioCreditHistory(studio.ai?.finance?.credit),
    totalRepaid: Math.max(0, finite(studio.ai?.finance?.credit?.totalRepaid)),
});

const takenDate = (absoluteWeek: number) => ({ takenYear: Math.floor(absoluteWeek / 52) + 1, takenWeek: (absoluteWeek % 52) + 1 });

const loanInterest = (loan: PlayerLoan) => loan.principal * loan.annualInterestRate / 52;
const loanDue = (loan: PlayerLoan) => Math.min(Math.max(0, loan.weeklyPayment), loan.principal + loanInterest(loan));

export const getStudioBankLoans = (studio: NPCStudioState): PlayerLoan[] => studio.ai?.finance?.loans || [];

/** This week's loan payments, in millions. */
export const getStudioWeeklyLoanPaymentsMillions = (studio: NPCStudioState) => getStudioBankLoans(studio)
    .filter(loan => loan.status === 'ACTIVE' && loan.principal > 0)
    .reduce((sum, loan) => sum + loanDue(loan), 0) / M;

/** What the Bank would still lend this studio (its safe capacity after what it owes), in millions. */
export const getStudioBankHeadroomMillions = (studio: NPCStudioState, absoluteWeek: number) => (
    Math.max(0, getBorrowerSafeCapacity(getRivalBorrowerProfile(studio, absoluteWeek))) / M
);

/** The Bank's money a studio can count on, in millions: what it would still lend, times the Bank's own odds of saying
 *  yes to that amount on its longest term. A studio that has defaulted gets low odds, so it can count on little. */
export const getStudioBankCushionMillions = (studio: NPCStudioState, absoluteWeek: number) => {
    const profile = getRivalBorrowerProfile(studio, absoluteWeek);
    const capacity = Math.max(0, getBorrowerSafeCapacity(profile));
    if (!(capacity > 0)) return 0;
    return capacity * getBorrowerLoanApprovalOdds(profile, capacity, BANK_LONGEST_TERM_WEEKS) / M;
};

const bankEvent = (studio: NPCStudioState, absoluteWeek: number, bank: StudioAiBankEvent, salt = ''): StudioAiEventRecord => ({
    id: createDeterministicId('studio_ai_bank', studio.id, absoluteWeek, bank.kind, salt),
    absoluteWeek,
    type: 'BANK',
    summary: `${studio.name}: ${bank.kind} ${Math.round(bank.amountDollars).toLocaleString('en-US')} with ${bank.lenderName}`,
    bank,
});

/** After a refusal the studio waits this long before asking the Bank again for the same kind of money. */
export const STUDIO_BANK_REAPPLY_WEEKS = 4;

/** Did the Bank refuse this studio money of this kind in the last 4 weeks (this week included)? While that answer
 *  stands the studio does not ask again, and what the Bank would lend is not a cushion it can count on. */
export const wasRefusedByBankLately = (
    studio: NPCStudioState,
    absoluteWeek: number,
    reason: 'BILLS' | 'PRODUCTION',
    extraEvents: StudioAiEventRecord[] = [],
) => [...(studio.ai?.events || []), ...extraEvents].some(event => event.type === 'BANK' && event.bank?.kind === 'REJECTED'
    && event.bank.reason === reason && event.absoluteWeek <= absoluteWeek && event.absoluteWeek >= absoluteWeek - STUDIO_BANK_REAPPLY_WEEKS);

const withLedger = (entries: StudioAiLedgerEntry[], add: StudioAiLedgerEntry[]) => [...entries, ...add].slice(-STUDIO_AI_LEDGER_LIMIT);
const withEvents = (events: StudioAiEventRecord[], add: StudioAiEventRecord[]) => [...events, ...add].slice(-STUDIO_AI_EVENT_LIMIT);

export interface StudioLoanApplication {
    studio: NPCStudioState;
    approved: boolean;
    amountMillions: number;
    event: StudioAiEventRecord;
}

/** Ask the Bank for what is missing plus a quarter of running costs. Approval follows the Bank's odds for this studio. */
export const applyForStudioLoan = (
    studio: NPCStudioState,
    missingMillions: number,
    absoluteWeek: number,
    reason: 'BILLS' | 'PRODUCTION',
    projectTitle?: string,
): StudioLoanApplication => {
    const weeklyCost = Math.max(0, finite(studio.ai?.finance?.weeklyOperatingCostMillions));
    const amount = Math.max(10_000, Math.round((Math.max(0, missingMillions) + weeklyCost * STUDIO_BANK_QUARTER_WEEKS) * M / 10_000) * 10_000);
    const profile = getRivalBorrowerProfile(studio, absoluteWeek);
    const terms = getBankTerms(profile, amount, BANK_LONGEST_TERM_WEEKS);
    const odds = getBorrowerLoanApprovalOdds(profile, amount, BANK_LONGEST_TERM_WEEKS);
    const roll = createDeterministicRng(`studio-bank:${studio.id}:${absoluteWeek}:${reason}:${projectTitle || ''}`)();
    const salt = `${reason}:${projectTitle || ''}`;
    if (!(roll < odds)) {
        return {
            studio,
            approved: false,
            amountMillions: amount / M,
            event: bankEvent(studio, absoluteWeek, { kind: 'REJECTED', amountDollars: amount, lenderName: terms.lenderName, reason, ...(projectTitle ? { projectTitle } : {}) }, salt),
        };
    }
    const loan: PlayerLoan = {
        id: createDeterministicId('studio_loan', studio.id, absoluteWeek, salt),
        lenderName: terms.lenderName,
        principal: amount,
        originalPrincipal: amount,
        annualInterestRate: terms.annualInterestRate,
        weeklyPayment: terms.weeklyPayment,
        termWeeks: terms.termWeeks,
        weeksRemaining: terms.termWeeks,
        ...takenDate(absoluteWeek),
        takenAbsoluteWeek: absoluteWeek,
        missedPayments: 0,
        successfulPayments: 0,
        status: 'ACTIVE',
    };
    const cashReserve = moveCinemaNpcCash(studio.cashReserve, amount / M);
    const credit = creditOf(studio);
    const event = bankEvent(studio, absoluteWeek, { kind: 'TAKEN', amountDollars: amount, lenderName: terms.lenderName, reason, ...(projectTitle ? { projectTitle } : {}) }, salt);
    return {
        approved: true,
        amountMillions: amount / M,
        event,
        studio: {
            ...studio,
            cashReserve,
            ai: {
                ...studio.ai!,
                finance: {
                    ...studio.ai!.finance,
                    loans: [...getStudioBankLoans(studio), loan],
                    credit: { ...credit, totalBorrowed: credit.totalBorrowed + amount, lastLoanAbsoluteWeek: absoluteWeek },
                },
                ledger: withLedger(studio.ai!.ledger, [{
                    id: createDeterministicId('studio_ai_ledger', studio.id, absoluteWeek, 'BANK_LOAN', salt),
                    absoluteWeek,
                    category: 'SHORTFALL_BORROWING',
                    amountMillions: amount / M,
                    balanceAfterMillions: cashReserve,
                    description: `Loan from ${terms.lenderName}${projectTitle ? ` for ${projectTitle}` : ''}`,
                }]),
                events: withEvents(studio.ai!.events, [event]),
            },
        },
    };
};

/** A balance the studio owed before it had a Bank becomes a Bank loan on the Bank's terms for it. */
export const convertLegacyStudioDebt = (studio: NPCStudioState, absoluteWeek: number): NPCStudioState => {
    const legacyMillions = Math.max(0, finite(studio.ai?.finance?.debtPrincipalMillions));
    if (!studio.ai || !(legacyMillions > 0)) return studio;
    const amount = Math.round(legacyMillions * M);
    const terms = getBankTerms(getRivalBorrowerProfile({ ...studio, ai: { ...studio.ai, finance: { ...studio.ai.finance, debtPrincipalMillions: 0 } } }, absoluteWeek), amount, BANK_LONGEST_TERM_WEEKS);
    const loan: PlayerLoan = {
        id: createDeterministicId('studio_loan_legacy', studio.id, absoluteWeek),
        lenderName: terms.lenderName,
        principal: amount,
        originalPrincipal: amount,
        annualInterestRate: terms.annualInterestRate,
        weeklyPayment: terms.weeklyPayment,
        termWeeks: terms.termWeeks,
        weeksRemaining: terms.termWeeks,
        ...takenDate(absoluteWeek),
        takenAbsoluteWeek: absoluteWeek,
        missedPayments: 0,
        successfulPayments: 0,
        status: 'ACTIVE',
    };
    const credit = creditOf(studio);
    return {
        ...studio,
        ai: {
            ...studio.ai,
            finance: {
                ...studio.ai.finance,
                debtPrincipalMillions: 0,
                loans: [...getStudioBankLoans(studio), loan],
                credit: { ...credit, totalBorrowed: credit.totalBorrowed + amount },
            },
        },
    };
};

export interface StudioLoanWeek {
    loans: PlayerLoan[];
    credit: StudioBankCreditHistory;
    balanceMillions: number;
    paidMillions: number;
    missed: boolean;
    reputationDelta: number;
    events: StudioAiEventRecord[];
}

/** The week's loan payments from the studio's cash, under the Bank's rules (as gameLoop does for the player). */
export const serviceStudioLoansWeek = (studio: NPCStudioState, balanceMillions: number, absoluteWeek: number): StudioLoanWeek => {
    let balance = balanceMillions;
    let paid = 0;
    let missed = false;
    let reputationDelta = 0;
    const credit = creditOf(studio);
    const events: StudioAiEventRecord[] = [];
    const loans = getStudioBankLoans(studio).map(loan => {
        if (loan.status !== 'ACTIVE' || !(loan.principal > 0)) return loan;
        const interest = loanInterest(loan);
        const due = loanDue(loan);
        if (balance * M + 0.005 >= due) {
            balance = moveCinemaNpcCash(balance, -due / M);
            paid += due / M;
            credit.successfulPayments += 1;
            credit.totalRepaid = (credit.totalRepaid || 0) + due;
            const principal = toCents(Math.max(0, loan.principal - Math.max(0, due - interest)));
            const weeksRemaining = Math.max(0, loan.weeksRemaining - 1);
            if (principal <= 0.5 || weeksRemaining === 0) {
                events.push(bankEvent(studio, absoluteWeek, { kind: 'PAID_OFF', amountDollars: loan.originalPrincipal, lenderName: loan.lenderName, early: false }, loan.id));
                return { ...loan, principal: 0, weeksRemaining: 0, successfulPayments: loan.successfulPayments + 1, status: 'PAID' as const };
            }
            return { ...loan, principal, weeksRemaining, successfulPayments: loan.successfulPayments + 1 };
        }
        /* the Bank's rule for a missed payment */
        const lateFee = Math.max(1000, Math.round(loan.originalPrincipal * 0.01));
        const missedPayments = loan.missedPayments + 1;
        missed = true;
        credit.missedPayments += 1;
        reputationDelta -= 2;
        if (missedPayments >= 3) {
            credit.defaults += 1;
            reputationDelta -= 8;
            events.push(bankEvent(studio, absoluteWeek, { kind: 'DEFAULTED', amountDollars: loan.principal, lenderName: loan.lenderName }, loan.id));
            return { ...loan, principal: toCents(loan.principal + interest + lateFee), missedPayments, status: 'DEFAULTED' as const };
        }
        if (missedPayments === 1) events.push(bankEvent(studio, absoluteWeek, { kind: 'MISSED', amountDollars: due, lenderName: loan.lenderName }, loan.id));
        return { ...loan, principal: toCents(loan.principal + interest + lateFee), missedPayments };
    });
    return { loans, credit, balanceMillions: balance, paidMillions: paid, missed, reputationDelta, events };
};

export interface StudioEarlyRepayment {
    loans: PlayerLoan[];
    /** the credit record with this repayment counted in totalRepaid */
    credit: StudioBankCreditHistory;
    balanceMillions: number;
    repaidMillions: number;
    events: StudioAiEventRecord[];
}

/** Cash above the reserve pays loans down early (a defaulted one first, then the highest rate); the share follows the studio's discipline. */
export const repayStudioLoansEarly = (
    studio: NPCStudioState,
    loans: PlayerLoan[],
    balanceMillions: number,
    weeklyObligationsMillions: number,
    absoluteWeek: number,
): StudioEarlyRepayment => {
    const reserve = STUDIO_BANK_RESERVE_WEEKS * Math.max(0, weeklyObligationsMillions) + Math.max(0, finite(studio.ai?.finance?.committedSpendMillions));
    const discipline = Math.max(0, Math.min(100, finite(studio.ai?.profile?.financialDiscipline, 50)));
    let budget = Math.max(0, balanceMillions - reserve) * (0.1 + discipline / 100 * 0.15) * M;
    const owed = (loan: PlayerLoan) => (loan.status === 'ACTIVE' || loan.status === 'DEFAULTED') && loan.principal > 0;
    const credit = creditOf(studio);
    if (!(budget > 0) || !loans.some(owed)) return { loans, credit, balanceMillions, repaidMillions: 0, events: [] };
    const events: StudioAiEventRecord[] = [];
    let repaid = 0;
    /* a defaulted loan is cleared first (it is what keeps a studio in restructuring), then the highest rate */
    const order = loans.map((loan, index) => ({ loan, index }))
        .filter(({ loan }) => owed(loan))
        .sort((a, b) => Number(b.loan.status === 'DEFAULTED') - Number(a.loan.status === 'DEFAULTED') || b.loan.annualInterestRate - a.loan.annualInterestRate);
    const next = [...loans];
    for (const { loan, index } of order) {
        if (budget <= 0) break;
        const pay = Math.min(budget, loan.principal);
        budget -= pay;
        repaid += pay;
        const principal = toCents(loan.principal - pay);
        if (principal <= 0.5) {
            next[index] = { ...loan, principal: 0, weeksRemaining: 0, status: 'PAID' };
            events.push(bankEvent(studio, absoluteWeek, { kind: 'PAID_OFF', amountDollars: loan.originalPrincipal, lenderName: loan.lenderName, early: loan.weeksRemaining > 1 }, loan.id));
        } else {
            /* the Bank keeps the weekly payment; a smaller balance just clears sooner */
            next[index] = { ...loan, principal };
        }
    }
    credit.totalRepaid = toCents((credit.totalRepaid || 0) + repaid);
    return { loans: next, credit, balanceMillions: moveCinemaNpcCash(balanceMillions, -repaid / M), repaidMillions: repaid / M, events };
};

/** Did this studio borrow within the last two years (a later recovery is a comeback on borrowed money)? */
export const hasRecentStudioLoan = (studio: NPCStudioState, absoluteWeek: number) => (
    getStudioBankLoans(studio).some(loan => absoluteWeek - loan.takenAbsoluteWeek <= 104)
);

export const COMEBACK_EVENT = (studio: NPCStudioState, absoluteWeek: number): StudioAiEventRecord => {
    const lender = getStudioBankLoans(studio).slice(-1)[0]?.lenderName || 'Citywide Credit';
    return bankEvent(studio, absoluteWeek, { kind: 'COMEBACK', amountDollars: getStudioBankLoans(studio).reduce((sum, loan) => sum + loan.originalPrincipal, 0), lenderName: lender }, 'comeback');
};
