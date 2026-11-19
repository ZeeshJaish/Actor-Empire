/**
 * Studios at the Bank (18 Nov 2026, rival studio debt plan v2: qa/2026-11-18-studio-debt/PLAN.md).
 *
 * The game keeps one loan market: the Bank in loanLogic.ts (see the BANK_SYSTEM_ONLY note in streamingFinancing.ts).
 * A studio borrows there under the player's rules: the same credit score, capacity, approval odds, rate, weekly
 * payment, late fee and default. Only the numbers are the company's own:
 * - its worth is the equity value from the valuation engine (the number Forbes and the stock market read);
 * - its money in and out comes from its own books;
 * - its reputation and its record with the Bank are its own.
 */
import type { Business, NPCStudioState, PlayerLoan } from '../types';
import {
    calculateWeeklyLoanPayment,
    getBankLenderName,
    getBorrowerCreditScore,
    getBorrowerLoanAnnualRate,
    type BorrowerCreditHistory,
    type BorrowerProfile,
} from './loanLogic';
import { valueWorldStudio } from './valuation/studioValuation';

/** The Bank's terms, in weeks (BankApp.tsx, playerBanking.ts). */
export const BANK_TERM_WEEKS = [12, 26, 52, 104] as const;
export const BANK_LONGEST_TERM_WEEKS = 104;

const finite = (value: unknown, fallback = 0) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);
const EMPTY_CREDIT: BorrowerCreditHistory = { successfulPayments: 0, missedPayments: 0, defaults: 0, totalBorrowed: 0 };

export const getStudioCreditHistory = (credit: Partial<BorrowerCreditHistory> | undefined): BorrowerCreditHistory => ({
    successfulPayments: Math.max(0, Math.round(finite(credit?.successfulPayments))),
    missedPayments: Math.max(0, Math.round(finite(credit?.missedPayments))),
    defaults: Math.max(0, Math.round(finite(credit?.defaults))),
    totalBorrowed: Math.max(0, finite(credit?.totalBorrowed)),
    ...(typeof credit?.lastLoanAbsoluteWeek === 'number' ? { lastLoanAbsoluteWeek: credit.lastLoanAbsoluteWeek } : {}),
});

const liveLoans = (loans: PlayerLoan[] | undefined) => (loans || []).filter(loan => loan.status !== 'PAID' && finite(loan.principal) > 0);

/** The last 26 weeks of a rival's books, per week, in dollars (the Bank reads 26 weeks for the player too). */
const rivalWeeklyCashFlow = (studio: NPCStudioState, absoluteWeek: number) => {
    const recent = (studio.ai?.ledger || []).filter(entry => entry.absoluteWeek > absoluteWeek - 26 && entry.absoluteWeek <= absoluteWeek);
    const weeksObserved = Math.max(8, Math.min(26, absoluteWeek + 1));
    const income = recent.filter(entry => entry.amountMillions > 0 && entry.category !== 'SHORTFALL_BORROWING')
        .reduce((sum, entry) => sum + entry.amountMillions, 0) * 1_000_000;
    const expenses = recent.filter(entry => entry.amountMillions < 0)
        .reduce((sum, entry) => sum - entry.amountMillions, 0) * 1_000_000;
    return { income: income / weeksObserved, expenses: expenses / weeksObserved, freeCashFlow: (income - expenses) / weeksObserved };
};

/** A rival studio as the Bank sees it. */
export const getRivalBorrowerProfile = (studio: NPCStudioState, absoluteWeek: number): BorrowerProfile => {
    const loans = liveLoans(studio.ai?.finance?.loans);
    const reputation = Math.max(0, Math.min(100, finite(studio.reputation, 50)));
    let netWorth = 0;
    try { netWorth = Math.max(0, finite(valueWorldStudio(studio, absoluteWeek).equityValue)); } catch { netWorth = 0; }
    return {
        netWorth,
        outstandingDebt: loans.reduce((sum, loan) => sum + Math.max(0, finite(loan.principal)), 0),
        weeklyDebtBurden: loans.filter(loan => loan.status === 'ACTIVE').reduce((sum, loan) => sum + Math.max(0, finite(loan.weeklyPayment)), 0),
        cashFlow: rivalWeeklyCashFlow(studio, absoluteWeek),
        reputation,
        fame: reputation,
        businessCount: 0,
        activeLoans: loans.filter(loan => loan.status === 'ACTIVE').length,
        credit: getStudioCreditHistory(studio.ai?.finance?.credit),
        absoluteWeek,
    };
};

/** A studio the player owns, as the Bank sees it (for a balance it takes over in a deal). */
export const getOwnedStudioBorrowerProfile = (
    business: Business,
    absoluteWeek: number,
    existingDebt = 0,
    existingWeeklyPayments = 0,
    credit?: Partial<BorrowerCreditHistory>,
): BorrowerProfile => ({
    netWorth: Math.max(0, finite(business.stats?.valuation)),
    outstandingDebt: Math.max(0, existingDebt),
    weeklyDebtBurden: Math.max(0, existingWeeklyPayments),
    cashFlow: {
        income: Math.max(0, finite(business.stats?.weeklyRevenue)),
        expenses: Math.max(0, finite(business.stats?.weeklyExpenses)),
        freeCashFlow: finite(business.stats?.weeklyProfit),
    },
    reputation: Math.max(0, Math.min(100, finite(business.stats?.brandHealth, 50))),
    fame: Math.max(0, Math.min(100, finite(business.stats?.hype, 50))),
    businessCount: 0,
    activeLoans: 0,
    credit: credit ? getStudioCreditHistory(credit) : EMPTY_CREDIT,
    absoluteWeek,
});

export interface BankTerms {
    lenderName: string;
    annualInterestRate: number;
    termWeeks: number;
    weeklyPayment: number;
}

/** The Bank's terms for an amount: its rate for this borrower, on the term asked (default: the Bank's longest). */
export const getBankTerms = (profile: BorrowerProfile, amount: number, termWeeks: number = BANK_LONGEST_TERM_WEEKS): BankTerms => {
    const annualInterestRate = getBorrowerLoanAnnualRate(profile, amount, termWeeks);
    return {
        lenderName: getBankLenderName(getBorrowerCreditScore(profile)),
        annualInterestRate,
        termWeeks,
        weeklyPayment: calculateWeeklyLoanPayment(amount, annualInterestRate, termWeeks),
    };
};

export { getRivalBooksDebtDollars, getRivalLoanDebtDollars, getRivalUnpaidBillsDollars } from './rivalBooks';
