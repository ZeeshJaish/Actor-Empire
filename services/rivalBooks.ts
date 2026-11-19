/**
 * What a rival studio owes, read from its own books (18 Nov 2026, rival studio debt plan v2). This module has no runtime
 * imports, so the valuation engine, the stock market and the Bank can all read it without import cycles.
 */
import type { NPCStudioState, PlayerLoan } from '../types';

const finite = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
const liveLoans = (loans: PlayerLoan[] | undefined) => (loans || []).filter(loan => loan.status !== 'PAID' && finite(loan.principal) > 0);

/** Bills a rival has not paid: its cash below zero between its weekly books, in dollars. */
export const getRivalUnpaidBillsDollars = (studio?: Pick<NPCStudioState, 'cashReserve'> | null): number => {
    const cash = Number(studio?.cashReserve);
    return Number.isFinite(cash) && cash < 0 ? Math.round(-cash * 1_000_000) : 0;
};

/** A rival's Bank loans still owed, in dollars. */
export const getRivalLoanDebtDollars = (studio?: Pick<NPCStudioState, 'ai'> | null): number => (
    Math.round(liveLoans(studio?.ai?.finance?.loans).reduce((sum, loan) => sum + Math.max(0, finite(loan.principal)), 0))
);

/** A rival's debt on its books, in dollars: its Bank loans plus any balance it borrowed before it had a Bank. */
export const getRivalBooksDebtDollars = (studio?: Pick<NPCStudioState, 'ai'> | null): number => (
    Math.round(Math.max(0, finite(studio?.ai?.finance?.debtPrincipalMillions)) * 1_000_000) + getRivalLoanDebtDollars(studio)
);
