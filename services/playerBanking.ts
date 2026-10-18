import type { Player, PlayerLoan } from '../types';
import { retainBankTransactionHistory } from './bankTransactionHistory';
import { getAbsoluteWeek } from './legacyLogic';
import { createPlayerLoan, getAbsoluteBorrowingCeiling, getLoanApprovalOdds } from './loanLogic';

export interface BankingResult {
    success: boolean;
    player: Player;
    reason?: 'INVALID_AMOUNT' | 'INVALID_TERM' | 'CAPACITY_EXCEEDED' | 'LOAN_NOT_FOUND' | 'INSUFFICIENT_CASH';
    loan?: PlayerLoan;
    payment?: number;
    paidOff?: boolean;
}

/** Shared by the bank UI and full acquisition/repayment verification. Requotes current state. */
export const issuePersonalLoan = (player: Player, amount: number, termWeeks: number): BankingResult => {
    if (!Number.isSafeInteger(amount) || amount < 50_000) return { success: false, player, reason: 'INVALID_AMOUNT' };
    if (![12, 26, 52, 104].includes(termWeeks)) return { success: false, player, reason: 'INVALID_TERM' };
    if (amount > getAbsoluteBorrowingCeiling(player) || getLoanApprovalOdds(player, amount, termWeeks) <= 0) {
        return { success: false, player, reason: 'CAPACITY_EXCEEDED' };
    }
    const loan = createPlayerLoan(player, amount, termWeeks);
    // Multiple valid applications in one millisecond must still have distinct debt IDs.
    const existingIds = new Set((player.finance.loans || []).map(item => item.id));
    while (existingIds.has(loan.id)) loan.id += '_next';
    const credit = player.finance.credit || { successfulPayments: 0, missedPayments: 0, defaults: 0, totalBorrowed: 0, totalRepaid: 0 };
    return {
        success: true, loan,
        player: {
            ...player, money: player.money + amount,
            finance: {
                ...player.finance,
                loans: [...(player.finance.loans || []), loan],
                credit: { ...credit, totalBorrowed: (credit.totalBorrowed || 0) + amount, lastLoanAbsoluteWeek: getAbsoluteWeek(player.age, player.currentWeek) },
                history: retainBankTransactionHistory([{ id: `tx_loan_issue_${loan.id}`, week: player.currentWeek, year: player.age, amount, category: 'LOAN', cashFlowType: 'FINANCING', description: `${loan.lenderName} personal loan funded` }, ...player.finance.history]),
            },
            logs: [...player.logs, { week: player.currentWeek, year: player.age, type: 'neutral', message: `🏦 Approved $${amount.toLocaleString()} from ${loan.lenderName}. Weekly payment: $${loan.weeklyPayment.toLocaleString()} for ${termWeeks} weeks.` }],
        },
    };
};

/** Resolve the current loan by ID; a stale rendered balance cannot repay a paid loan twice. */
export const repayPersonalLoan = (player: Player, loanId: string, mode: 'SCHEDULED' | 'BALANCE'): BankingResult => {
    const loan = (player.finance.loans || []).find(item => item.id === loanId);
    if (!loan || loan.status === 'PAID' || !Number.isFinite(loan.principal) || loan.principal <= 0) return { success: false, player, reason: 'LOAN_NOT_FOUND' };
    const payment = mode === 'BALANCE' ? loan.principal : Math.min(loan.principal, Math.max(1, Math.floor(loan.weeklyPayment)));
    if (!Number.isFinite(payment) || payment <= 0) return { success: false, player, reason: 'INVALID_AMOUNT' };
    if (!Number.isFinite(player.money) || player.money < payment) return { success: false, player, reason: 'INSUFFICIENT_CASH' };
    const principal = Math.max(0, loan.principal - payment);
    const paidOff = principal <= 0;
    const credit = player.finance.credit || { successfulPayments: 0, missedPayments: 0, defaults: 0, totalBorrowed: 0, totalRepaid: 0 };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    // Paying down real debt is always allowed. Repeated clicks are not separate weeks of reliability.
    const creditIncrement = credit.lastManualPaymentAbsoluteWeek === absoluteWeek ? 0 : 1;
    const updatedLoan: PlayerLoan = { ...loan, principal, status: paidOff ? 'PAID' : loan.status, weeksRemaining: paidOff ? 0 : loan.weeksRemaining, successfulPayments: (loan.successfulPayments || 0) + creditIncrement };
    return {
        success: true, loan: updatedLoan, payment, paidOff,
        player: {
            ...player, money: player.money - payment,
            finance: {
                ...player.finance,
                loans: player.finance.loans.map(item => item.id === loan.id ? updatedLoan : item),
                credit: { ...credit, successfulPayments: (credit.successfulPayments || 0) + creditIncrement, totalRepaid: (credit.totalRepaid || 0) + payment, lastManualPaymentAbsoluteWeek: absoluteWeek },
                history: retainBankTransactionHistory([{ id: `tx_loan_manual_${loan.id}_${Date.now()}_${principal}`, week: player.currentWeek, year: player.age, amount: -payment, category: 'LOAN', cashFlowType: 'FINANCING', description: `${loan.lenderName} manual loan payment` }, ...player.finance.history]),
            },
            logs: [...player.logs, { week: player.currentWeek, year: player.age, type: paidOff ? 'positive' : 'neutral', message: paidOff ? `🏦 ${loan.lenderName} loan fully paid.` : `🏦 Paid $${payment.toLocaleString()} to ${loan.lenderName}.` }],
        },
    };
};
