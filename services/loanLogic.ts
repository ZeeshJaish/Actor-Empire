import { getStockHoldingAllocations } from './stockCashOwnership';
import { getStudioOwnershipPercent } from './studioOwnership';
import { isOperatingBankTransaction } from './bankTransactionHistory';
export { isOperatingBankTransaction } from './bankTransactionHistory';
import { Player, PlayerLoan } from '../types';
import { getAbsoluteWeek } from './legacyLogic';
import { isStockRetiredByMerger, normalizeStockPrice } from './stockLogic';
import {
    getPlayerBusinessEquityValue,
    isStockRepresentedByControlledStudio,
} from './studioGroupValuation';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const toFinite = (value: number, fallback = 0) => (Number.isFinite(value) ? value : fallback);

export const getOutstandingLoanBalance = (player: Player): number =>
    (player.finance?.loans || [])
        .filter(loan => loan.status !== 'PAID')
        .reduce((sum, loan) => sum + Math.max(0, toFinite(loan.principal)), 0);

export const getWeeklyDebtBurden = (player: Player): number =>
    (player.finance?.loans || [])
        .filter(loan => loan.status === 'ACTIVE')
        .reduce((sum, loan) => sum + Math.max(0, toFinite(loan.weeklyPayment)), 0);

export const getEstimatedNetWorth = (player: Player): number => {
    const cash = Math.max(0, toFinite(player.money));
    const assetValue = (player.customItems || []).reduce((sum, item) => sum + Math.max(0, toFinite((item as any).price)), 0);
    const portfolioValue = (player.portfolio || []).reduce((sum, holding) => {
        const stock = (player.stocks || []).find(s => s.id === holding.stockId);
        if (!stock || isStockRetiredByMerger(player, stock) || isStockRepresentedByControlledStudio(player, stock)) return sum;
        const allocations = getStockHoldingAllocations(holding);
        const beneficialShares = allocations.personalShares + allocations.corporate.reduce((shares, allocation) => {
            const owner = (player.businesses || []).find(business => business.id === allocation.ownerStudioId);
            return shares + (owner ? allocation.shares * getStudioOwnershipPercent(player, owner) / 100 : 0);
        }, 0);
        return sum + Math.max(0, normalizeStockPrice(stock, stock.price) * beneficialShares);
    }, 0);
    const businessValue = getPlayerBusinessEquityValue(player);
    return cash + assetValue + portfolioValue + businessValue;
};

export const getAverageWeeklyCashFlow = (player: Player, lookbackWeeks = 26) => {
    const currentAbsoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const windowWeeks = Number.isFinite(lookbackWeeks) ? Math.max(1, Math.floor(lookbackWeeks)) : 26;
    const recentTransactions = (player.finance?.history || []).filter(tx => {
        if (!Number.isFinite(tx.year) || !Number.isFinite(tx.week) || !isOperatingBankTransaction(tx)) return false;
        const weeksAgo = currentAbsoluteWeek - getAbsoluteWeek(tx.year, tx.week);
        return weeksAgo >= 0 && weeksAgo < windowWeeks;
    });

    const weeksObserved = Math.max(8, Math.min(windowWeeks, currentAbsoluteWeek + 1));
    const income = recentTransactions.filter(tx => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0);
    const expenses = recentTransactions.filter(tx => tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    return {
        income: income / weeksObserved,
        expenses: expenses / weeksObserved,
        freeCashFlow: (income - expenses) / weeksObserved
    };
};

/* 18 Nov 2026: the Bank's rules read a borrower profile, so the player and a company (a rival studio, or a studio the
   player owns) borrow under the same rules. The game keeps one loan market (see the BANK_SYSTEM_ONLY note in
   streamingFinancing.ts), and this is it. The player's profile is built exactly as before, so every number the player
   sees is unchanged (qa/2026-11-18-studio-debt, bank parity check). */
export interface BorrowerCreditHistory {
    successfulPayments: number;
    missedPayments: number;
    defaults: number;
    totalBorrowed: number;
    lastLoanAbsoluteWeek?: number;
}

export interface BorrowerProfile {
    netWorth: number;
    outstandingDebt: number;
    weeklyDebtBurden: number;
    cashFlow: { income: number; expenses: number; freeCashFlow: number };
    reputation: number;
    fame: number;
    businessCount: number;
    activeLoans: number;
    credit: BorrowerCreditHistory;
    absoluteWeek: number;
}

export const getPlayerBorrowerProfile = (player: Player): BorrowerProfile => {
    const credit = player.finance?.credit;
    return {
        netWorth: getEstimatedNetWorth(player),
        outstandingDebt: getOutstandingLoanBalance(player),
        weeklyDebtBurden: getWeeklyDebtBurden(player),
        cashFlow: getAverageWeeklyCashFlow(player),
        reputation: player.stats.reputation,
        fame: player.stats.fame,
        businessCount: player.businesses?.length || 0,
        activeLoans: (player.finance?.loans || []).filter(loan => loan.status === 'ACTIVE').length,
        credit: {
            successfulPayments: credit?.successfulPayments || 0,
            missedPayments: credit?.missedPayments || 0,
            defaults: credit?.defaults || 0,
            totalBorrowed: credit?.totalBorrowed || 0,
            lastLoanAbsoluteWeek: credit?.lastLoanAbsoluteWeek,
        },
        absoluteWeek: getAbsoluteWeek(player.age, player.currentWeek),
    };
};

export const getBorrowerCreditScore = (profile: BorrowerProfile): number => {
    const debtRatio = profile.outstandingDebt > 0 ? profile.outstandingDebt / Math.max(1, profile.netWorth) : 0;
    const burdenRatio = profile.weeklyDebtBurden > 0 ? profile.weeklyDebtBurden / Math.max(25000, profile.cashFlow.income) : 0;
    const profitabilityRatio = clamp(profile.cashFlow.freeCashFlow / 200000, -1, 2);

    let score = 520;
    score += clamp(profile.reputation * 1.2, 0, 110);
    score += clamp(profile.fame * 0.45, 0, 50);
    score += clamp(Math.log10(Math.max(1000, profile.netWorth)) * 42 - 120, 0, 120);
    score += clamp(profitabilityRatio * 65, -40, 90);
    score += clamp(profile.businessCount * 10, 0, 40);
    score += clamp(profile.credit.successfulPayments * 4, 0, 70);
    score -= clamp(profile.credit.missedPayments * 24, 0, 180);
    score -= clamp(profile.credit.defaults * 120, 0, 240);
    score -= clamp(debtRatio * 520, 0, 260);
    score -= clamp(burdenRatio * 210, 0, 220);

    return Math.round(clamp(score, 300, 850));
};

export const getCreditScore = (player: Player): number => getBorrowerCreditScore(getPlayerBorrowerProfile(player));

export const getCreditTier = (score: number): 'Elite' | 'Strong' | 'Fair' | 'Risky' | 'Distressed' => {
    if (score >= 790) return 'Elite';
    if (score >= 710) return 'Strong';
    if (score >= 640) return 'Fair';
    if (score >= 560) return 'Risky';
    return 'Distressed';
};

/** The Bank's two lenders: Premier Capital for Elite credit, Citywide Credit for everyone else. */
export const getBankLenderName = (score: number): string => (getCreditTier(score) === 'Elite' ? 'Premier Capital' : 'Citywide Credit');

export const getBorrowerSafeCapacity = (profile: BorrowerProfile): number => {
    const score = getBorrowerCreditScore(profile);
    const creditMultiplier = clamp((score - 300) / 550, 0, 1);

    const incomeDriven = Math.max(150000, Math.max(0, profile.cashFlow.freeCashFlow) * (32 + creditMultiplier * 26));
    const wealthDriven = Math.max(0, profile.netWorth * (0.025 + creditMultiplier * 0.055));
    const fameDriven = (profile.fame * 18000) + (profile.reputation * 12000);
    const businessDriven = profile.businessCount * 350000;

    const grossCapacity = incomeDriven + wealthDriven + fameDriven + businessDriven;
    const absoluteCap = Math.max(500000, (profile.netWorth * 0.16) + (Math.max(0, profile.cashFlow.income) * 42));
    const debtPenalty = profile.outstandingDebt * 1.1;

    return Math.max(0, Math.floor(Math.min(grossCapacity, absoluteCap) - debtPenalty));
};

export const getSafeBorrowingCapacity = (player: Player): number => getBorrowerSafeCapacity(getPlayerBorrowerProfile(player));

export const getBorrowerBorrowingCeiling = (profile: BorrowerProfile): number => {
    const safeCapacity = getBorrowerSafeCapacity(profile);
    const score = getBorrowerCreditScore(profile);
    const floor = score >= 640 ? 500000 : score >= 560 ? 200000 : 0;
    return Math.max(floor, Math.floor(Math.min(safeCapacity * 1.45, profile.netWorth * 0.22 + safeCapacity * 0.35)));
};

export const getAbsoluteBorrowingCeiling = (player: Player): number => getBorrowerBorrowingCeiling(getPlayerBorrowerProfile(player));

const getRecentBorrowPressure = (profile: BorrowerProfile) => {
    const lastLoanAbsoluteWeek = profile.credit.lastLoanAbsoluteWeek;
    if (typeof lastLoanAbsoluteWeek !== 'number') return 0;
    const weeksSinceLastLoan = profile.absoluteWeek - lastLoanAbsoluteWeek;
    if (weeksSinceLastLoan <= 4) return 1;
    if (weeksSinceLastLoan <= 8) return 0.6;
    if (weeksSinceLastLoan <= 16) return 0.25;
    return 0;
};

const getRepeatDebtPressure = (profile: BorrowerProfile) => ({
    activeLoans: profile.activeLoans,
    repeatPressure: profile.activeLoans > 1 ? (profile.activeLoans - 1) * 0.18 : 0,
    distressPressure: profile.credit.defaults * 0.25 + Math.min(0.18, profile.credit.missedPayments * 0.03),
});

export const getBorrowerLoanAnnualRate = (profile: BorrowerProfile, requestedAmount: number, termWeeks: number): number => {
    const score = getBorrowerCreditScore(profile);
    const safeCapacity = Math.max(1, getBorrowerSafeCapacity(profile));
    const stressRatio = requestedAmount / safeCapacity;
    const termPenalty = termWeeks >= 104 ? 1.6 : termWeeks >= 52 ? 0.9 : termWeeks >= 26 ? 0.25 : 0;
    const recentBorrowPressure = getRecentBorrowPressure(profile);
    const { activeLoans, repeatPressure, distressPressure } = getRepeatDebtPressure(profile);
    const isFirstLoan = activeLoans === 0 && profile.credit.totalBorrowed === 0;

    let rate = 0.24;
    rate -= clamp((score - 300) / 550, 0, 1) * 0.15;
    rate += clamp((stressRatio - 0.6) * 0.12, 0, 0.12);
    rate += termPenalty / 100;
    rate += recentBorrowPressure * 0.05;
    rate += repeatPressure;
    rate += distressPressure;
    if (isFirstLoan && requestedAmount <= safeCapacity * 0.75) rate -= 0.018;

    return Number(clamp(rate, 0.055, 0.31).toFixed(4));
};

export const getLoanAnnualRate = (player: Player, requestedAmount: number, termWeeks: number): number => (
    getBorrowerLoanAnnualRate(getPlayerBorrowerProfile(player), requestedAmount, termWeeks)
);

export const calculateWeeklyLoanPayment = (amount: number, annualRate: number, termWeeks: number): number => {
    const principal = Math.max(0, Math.floor(amount));
    const weeks = Math.max(1, Math.floor(termWeeks));
    const weeklyRate = annualRate / 52;

    if (weeklyRate <= 0) return Math.ceil(principal / weeks);

    const factor = Math.pow(1 + weeklyRate, weeks);
    return Math.ceil((principal * weeklyRate * factor) / (factor - 1));
};

export const getBorrowerLoanApprovalOdds = (profile: BorrowerProfile, requestedAmount: number, termWeeks: number): number => {
    const safeCapacity = Math.max(1, getBorrowerSafeCapacity(profile));
    const absoluteCap = getBorrowerBorrowingCeiling(profile);
    if (requestedAmount > absoluteCap) return 0;

    const score = getBorrowerCreditScore(profile);
    const burdenRatio = profile.weeklyDebtBurden / Math.max(25000, profile.cashFlow.income);
    const requestedRatio = requestedAmount / safeCapacity;
    const recentBorrowPressure = getRecentBorrowPressure(profile);
    const { activeLoans, repeatPressure, distressPressure } = getRepeatDebtPressure(profile);
    const isFirstLoan = activeLoans === 0 && profile.credit.totalBorrowed === 0;

    let odds = 0.4 + clamp((score - 520) / 420, -0.2, 0.45);
    odds -= clamp((requestedRatio - 0.85) * 0.55, 0, 0.6);
    odds -= clamp(burdenRatio * 0.6, 0, 0.4);
    odds -= termWeeks >= 104 ? 0.05 : 0;
    odds -= recentBorrowPressure * 0.12;
    odds -= repeatPressure;
    odds -= distressPressure;
    if (isFirstLoan && requestedAmount <= safeCapacity * 0.75) odds += 0.14;
    if (requestedAmount <= 50000) odds += 0.08;

    return clamp(odds, 0, 0.98);
};

export const getLoanApprovalOdds = (player: Player, requestedAmount: number, termWeeks: number): number => (
    getBorrowerLoanApprovalOdds(getPlayerBorrowerProfile(player), requestedAmount, termWeeks)
);

export const getLoanDecisionLabel = (odds: number): string => {
    if (odds >= 0.85) return 'Very Likely';
    if (odds >= 0.68) return 'Likely';
    if (odds >= 0.48) return 'Borderline';
    if (odds > 0) return 'Unlikely';
    return 'Declined';
};

export const createPlayerLoan = (player: Player, requestedAmount: number, termWeeks: number): PlayerLoan => {
    const annualInterestRate = getLoanAnnualRate(player, requestedAmount, termWeeks);
    const weeklyPayment = calculateWeeklyLoanPayment(requestedAmount, annualInterestRate, termWeeks);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);

    return {
        id: `loan_${absoluteWeek}_${Date.now()}`,
        lenderName: getBankLenderName(getCreditScore(player)),
        principal: Math.floor(requestedAmount),
        originalPrincipal: Math.floor(requestedAmount),
        annualInterestRate,
        weeklyPayment,
        termWeeks,
        weeksRemaining: termWeeks,
        takenWeek: player.currentWeek,
        takenYear: player.age,
        takenAbsoluteWeek: absoluteWeek,
        missedPayments: 0,
        successfulPayments: 0,
        status: 'ACTIVE'
    };
};
