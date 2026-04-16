import { Business, Player, PlayerLoan } from '../types';
import { getAbsoluteWeek } from './legacyLogic';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const toFinite = (value: number, fallback = 0) => (Number.isFinite(value) ? value : fallback);

const getBusinessValuation = (business: Business) => {
    const baseBalance = toFinite(business.balance);
    const statsValuation = toFinite(business.stats?.valuation);
    return Math.max(baseBalance, statsValuation);
};

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
        return sum + (stock ? Math.max(0, toFinite(stock.price) * toFinite(holding.shares)) : 0);
    }, 0);
    const businessValue = (player.businesses || []).reduce((sum, business) => sum + getBusinessValuation(business), 0);
    return cash + assetValue + portfolioValue + businessValue;
};

export const getAverageWeeklyCashFlow = (player: Player, lookbackWeeks = 26) => {
    const currentAbsoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const recentTransactions = (player.finance?.history || []).filter(tx => {
        const absoluteWeek = getAbsoluteWeek(tx.year, tx.week);
        return currentAbsoluteWeek - absoluteWeek < lookbackWeeks;
    });

    const weeksObserved = Math.max(8, Math.min(lookbackWeeks, currentAbsoluteWeek + 1));
    const income = recentTransactions.filter(tx => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0);
    const expenses = recentTransactions.filter(tx => tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    return {
        income: income / weeksObserved,
        expenses: expenses / weeksObserved,
        freeCashFlow: (income - expenses) / weeksObserved
    };
};

export const getCreditScore = (player: Player): number => {
    const netWorth = getEstimatedNetWorth(player);
    const outstandingDebt = getOutstandingLoanBalance(player);
    const weeklyDebt = getWeeklyDebtBurden(player);
    const cashFlow = getAverageWeeklyCashFlow(player);
    const credit = player.finance?.credit;

    const debtRatio = outstandingDebt > 0 ? outstandingDebt / Math.max(1, netWorth) : 0;
    const burdenRatio = weeklyDebt > 0 ? weeklyDebt / Math.max(25000, cashFlow.income) : 0;
    const profitabilityRatio = clamp(cashFlow.freeCashFlow / 200000, -1, 2);

    let score = 520;
    score += clamp(player.stats.reputation * 1.2, 0, 110);
    score += clamp(player.stats.fame * 0.45, 0, 50);
    score += clamp(Math.log10(Math.max(1000, netWorth)) * 42 - 120, 0, 120);
    score += clamp(profitabilityRatio * 65, -40, 90);
    score += clamp((player.businesses?.length || 0) * 10, 0, 40);
    score += clamp((credit?.successfulPayments || 0) * 4, 0, 70);
    score -= clamp((credit?.missedPayments || 0) * 24, 0, 180);
    score -= clamp((credit?.defaults || 0) * 120, 0, 240);
    score -= clamp(debtRatio * 520, 0, 260);
    score -= clamp(burdenRatio * 210, 0, 220);

    return Math.round(clamp(score, 300, 850));
};

export const getCreditTier = (score: number): 'Elite' | 'Strong' | 'Fair' | 'Risky' | 'Distressed' => {
    if (score >= 790) return 'Elite';
    if (score >= 710) return 'Strong';
    if (score >= 640) return 'Fair';
    if (score >= 560) return 'Risky';
    return 'Distressed';
};

export const getSafeBorrowingCapacity = (player: Player): number => {
    const netWorth = getEstimatedNetWorth(player);
    const outstandingDebt = getOutstandingLoanBalance(player);
    const cashFlow = getAverageWeeklyCashFlow(player);
    const score = getCreditScore(player);
    const creditMultiplier = clamp((score - 300) / 550, 0, 1);

    const incomeDriven = Math.max(150000, Math.max(0, cashFlow.freeCashFlow) * (32 + creditMultiplier * 26));
    const wealthDriven = Math.max(0, netWorth * (0.025 + creditMultiplier * 0.055));
    const fameDriven = (player.stats.fame * 18000) + (player.stats.reputation * 12000);
    const businessDriven = (player.businesses?.length || 0) * 350000;

    const grossCapacity = incomeDriven + wealthDriven + fameDriven + businessDriven;
    const absoluteCap = Math.max(500000, (netWorth * 0.16) + (Math.max(0, cashFlow.income) * 42));
    const debtPenalty = outstandingDebt * 1.1;

    return Math.max(0, Math.floor(Math.min(grossCapacity, absoluteCap) - debtPenalty));
};

export const getAbsoluteBorrowingCeiling = (player: Player): number => {
    const safeCapacity = getSafeBorrowingCapacity(player);
    const netWorth = getEstimatedNetWorth(player);
    const score = getCreditScore(player);
    const floor = score >= 640 ? 500000 : score >= 560 ? 200000 : 0;
    return Math.max(floor, Math.floor(Math.min(safeCapacity * 1.45, netWorth * 0.22 + safeCapacity * 0.35)));
};

const getRecentBorrowPressure = (player: Player) => {
    const lastLoanAbsoluteWeek = player.finance?.credit?.lastLoanAbsoluteWeek;
    if (typeof lastLoanAbsoluteWeek !== 'number') return 0;
    const currentAbsoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const weeksSinceLastLoan = currentAbsoluteWeek - lastLoanAbsoluteWeek;
    if (weeksSinceLastLoan <= 4) return 1;
    if (weeksSinceLastLoan <= 8) return 0.6;
    if (weeksSinceLastLoan <= 16) return 0.25;
    return 0;
};

const getRepeatDebtPressure = (player: Player) => {
    const activeLoans = (player.finance?.loans || []).filter(loan => loan.status === 'ACTIVE').length;
    const defaults = player.finance?.credit?.defaults || 0;
    const missedPayments = player.finance?.credit?.missedPayments || 0;
    return {
        activeLoans,
        repeatPressure: activeLoans > 1 ? (activeLoans - 1) * 0.18 : 0,
        distressPressure: defaults * 0.25 + Math.min(0.18, missedPayments * 0.03)
    };
};

export const getLoanAnnualRate = (player: Player, requestedAmount: number, termWeeks: number): number => {
    const score = getCreditScore(player);
    const safeCapacity = Math.max(1, getSafeBorrowingCapacity(player));
    const stressRatio = requestedAmount / safeCapacity;
    const termPenalty = termWeeks >= 104 ? 1.6 : termWeeks >= 52 ? 0.9 : termWeeks >= 26 ? 0.25 : 0;
    const recentBorrowPressure = getRecentBorrowPressure(player);
    const { activeLoans, repeatPressure, distressPressure } = getRepeatDebtPressure(player);
    const isFirstLoan = activeLoans === 0 && (player.finance?.credit?.totalBorrowed || 0) === 0;

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

export const calculateWeeklyLoanPayment = (amount: number, annualRate: number, termWeeks: number): number => {
    const principal = Math.max(0, Math.floor(amount));
    const weeks = Math.max(1, Math.floor(termWeeks));
    const weeklyRate = annualRate / 52;

    if (weeklyRate <= 0) return Math.ceil(principal / weeks);

    const factor = Math.pow(1 + weeklyRate, weeks);
    return Math.ceil((principal * weeklyRate * factor) / (factor - 1));
};

export const getLoanApprovalOdds = (player: Player, requestedAmount: number, termWeeks: number): number => {
    const safeCapacity = Math.max(1, getSafeBorrowingCapacity(player));
    const absoluteCap = getAbsoluteBorrowingCeiling(player);
    if (requestedAmount > absoluteCap) return 0;

    const score = getCreditScore(player);
    const burdenRatio = getWeeklyDebtBurden(player) / Math.max(25000, getAverageWeeklyCashFlow(player).income);
    const requestedRatio = requestedAmount / safeCapacity;
    const recentBorrowPressure = getRecentBorrowPressure(player);
    const { activeLoans, repeatPressure, distressPressure } = getRepeatDebtPressure(player);
    const isFirstLoan = activeLoans === 0 && (player.finance?.credit?.totalBorrowed || 0) === 0;

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
        lenderName: getCreditTier(getCreditScore(player)) === 'Elite' ? 'Premier Capital' : 'Citywide Credit',
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
