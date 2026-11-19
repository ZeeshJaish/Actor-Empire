import type { Business, NewsItem, Player, Transaction, XPost } from '../types';
import { retainBankTransactionHistory } from './bankTransactionHistory';
import { getPlayerLanguage, t } from './i18n';
import { getAbsoluteWeek } from './legacyLogic';
import { captureStudioEquityCashBasis } from './studioEquityCash';
import { BANK_LONGEST_TERM_WEEKS, getBankTerms, getOwnedStudioBorrowerProfile } from './studioBank';
import { calculateWeeklyLoanPayment } from './loanLogic';

/*
 * Acquisition debt: the loans a studio brings with it when the player buys or takes control of it.
 *
 * 18 Nov 2026 (rival studio debt plan v2, qa/2026-11-18-studio-debt/PLAN.md):
 * - A loan belongs to the studio that owes it. Its weekly payment comes from that studio's treasury, not from the
 *   owner's pocket.
 * - When the treasury is short, it is a missed payment under the Bank's rules (loanLogic / gameLoop): a late fee of
 *   1% of the original amount, interest added to the balance, and after 3 misses a default. Pressure falls on that
 *   studio only.
 * - The owner can still pay any loan down from personal cash.
 * - Loans signed before this keep the terms they were signed on: interest only, at the signed rate.
 * - A loan taken over in a new deal gets the Bank's terms for the studio that owes it: the Bank's lender and rate for
 *   that studio, on the Bank's longest term, paid down week by week.
 */
export type AcquisitionDebtStatus = 'ACTIVE' | 'PAID_OFF' | 'DEFAULTED';
export type AcquisitionDebtSource = 'NEGOTIATED_ACQUISITION' | 'STOCK_CONTROL_TRANSFER';
export type AcquisitionDebtTrackingOrigin = 'SIGNED' | 'RECONCILED';
export type AcquisitionDebtRepayment = 'INTEREST_ONLY' | 'AMORTIZING';

export interface AcquisitionDebtRepairRecord {
    version: 2;
    absoluteWeek: number;
    signedValuation: number;
    legitimateValuation: number;
    previousOriginalPrincipal: number;
    previousRemainingPrincipal: number;
    removedPrincipal: number;
    refundedInterest: number;
    refundedPrincipal: number;
}

export interface AcquisitionDebtEntry {
    id: string;
    studioId: string;
    studioName: string;
    originalPrincipal: number;
    remainingPrincipal: number;
    annualInterestRate: number;
    originatedWeek: number;
    originatedYear: number;
    source: AcquisitionDebtSource;
    status: AcquisitionDebtStatus;
    interestPaidToDate: number;
    missedServiceAmount: number;
    missedPayments: number;
    lastServicedWeekKey?: string;
    trackingOrigin?: AcquisitionDebtTrackingOrigin;
    closureReason?: 'ORPHANED_STUDIO_ASSET' | 'LEGACY_SAVE_BASELINE';
    /** The Bank's lender (Premier Capital or Citywide Credit). Loans signed before 18 Nov 2026 have none. */
    lenderName?: string;
    /** How the loan is paid. A loan without this was signed as interest only. */
    repayment?: AcquisitionDebtRepayment;
    /** The Bank's weekly payment for an amortizing loan (interest + principal). */
    weeklyPayment?: number;
    termWeeks?: number;
    weeksRemaining?: number;
    successfulPayments?: number;
    lateFeesCharged?: number;
    /** The 18 Nov 2026 correction of a formula debt that was inflated by the old runaway valuations. */
    repair?: AcquisitionDebtRepairRecord;
}

export interface AcquisitionDebtSummary {
    entries: AcquisitionDebtEntry[];
    totalOriginalPrincipal: number;
    totalRemainingPrincipal: number;
    /** What the owing studios pay this week: interest on interest-only loans, the Bank's payment on the others. */
    weeklyInterestDue: number;
    weightedAverageRate: number;
    pressureScore: number;
    highestRate: number;
    nextServiceLabel: string;
}

export interface AcquisitionDebtServiceResult {
    player: Player;
    summary: AcquisitionDebtSummary;
    servicedAmount: number;
    unpaidAmount: number;
    pressureNewsCreated: boolean;
}

export interface AcquisitionDebtPaydownResult {
    success: boolean;
    player: Player;
    paidAmount: number;
    summary: AcquisitionDebtSummary;
    reason?: 'NO_ACTIVE_DEBT' | 'INVALID_AMOUNT' | 'INSUFFICIENT_CASH';
}

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const roundMoney = (value: number) => Math.max(0, Math.round((Number.isFinite(value) ? value : 0) / 1_000) * 1_000);
const weekKey = (player: Pick<Player, 'age' | 'currentWeek'>) => `${player.age}:${player.currentWeek}`;

const getRawLedger = (player: Pick<Player, 'flags'>): AcquisitionDebtEntry[] => (
    Array.isArray(player.flags?.acquisitionDebtLedger)
        ? player.flags.acquisitionDebtLedger.filter((entry: AcquisitionDebtEntry) => (
            typeof entry?.studioId === 'string'
            && Number.isFinite(entry?.remainingPrincipal)
        ))
        : []
);

const getStudioAssetById = (player: Partial<Pick<Player, 'businesses'>>, studioId: string) => (
    (player.businesses || []).find(business => business.type === 'PRODUCTION_HOUSE' && business.id === studioId)
);

/** The studio that pays a loan: the owing studio, or the studio it was fully merged into (that studio took on its debt). */
const getPayingStudioId = (businesses: Business[], studioId: string): string => {
    let current = studioId;
    for (let hop = 0; hop < 5; hop += 1) {
        const studio = businesses.find(business => business.type === 'PRODUCTION_HOUSE' && business.id === current);
        const mergedInto = studio?.studioState?.mergedIntoStudioId;
        if (!mergedInto || mergedInto === current) return current;
        current = mergedInto;
    }
    return current;
};

const getAcquisitionCaseStudioIds = (acquisitionCase: any): string[] => Array.from(new Set([
    acquisitionCase?.studioId,
    acquisitionCase?.closing?.acquiredBusinessId,
].filter(Boolean).map(String)));

const resolveLiveAcquisitionStudioId = (
    player: Partial<Pick<Player, 'businesses'>>,
    acquisitionCase: any,
): string | undefined => (
    getAcquisitionCaseStudioIds(acquisitionCase).find(studioId => Boolean(getStudioAssetById(player, studioId)))
);

const getAcquiredCases = (player: Pick<Player, 'flags'> & Partial<Pick<Player, 'businesses'>>) => {
    const cases = Array.isArray(player.flags?.studioAcquisitionCases)
        ? player.flags.studioAcquisitionCases.filter((entry: any) => entry?.status === 'ACQUIRED' && entry?.closing)
        : [];
    if (!Array.isArray(player.businesses)) return cases;
    return cases.filter((entry: any) => Boolean(resolveLiveAcquisitionStudioId(player, entry)));
};

const getCaseDebtPrincipal = (acquisitionCase: any) => roundMoney(
    Math.max(0, Number(acquisitionCase?.closing?.verifiedDebt || 0))
    + Math.max(0, Number(acquisitionCase?.closing?.hiddenLiabilities || 0)),
);

/** The rate loans were signed at before 18 Nov 2026 (kept for those loans, and for a case reconciled from history). */
const getDebtRate = (acquisitionCase: any, principal: number) => {
    const valuation = Math.max(1, Number(acquisitionCase?.publicValuation || acquisitionCase?.closing?.finalPrice || principal || 1));
    const leverage = principal / valuation;
    const baseRate = acquisitionCase?.closing?.finalPrice === 0 ? 0.0725 : 0.0825;
    return clamp(baseRate + (leverage * 0.08), 0.055, 0.145);
};

const makeDebtEntry = (
    acquisitionCase: any,
    studioIdOverride?: string,
    trackingOrigin: AcquisitionDebtTrackingOrigin = 'RECONCILED',
    player?: Pick<Player, 'age' | 'currentWeek'> & Partial<Pick<Player, 'businesses' | 'world'>>,
): AcquisitionDebtEntry | null => {
    const principal = getCaseDebtPrincipal(acquisitionCase);
    if (principal <= 0) return null;
    const studioId = String(studioIdOverride || acquisitionCase.studioId);
    const signedYear = Number(acquisitionCase.closing?.signedYear || acquisitionCase.approachedYear || 0);
    const signedWeek = Number(acquisitionCase.closing?.signedWeek || acquisitionCase.approachedWeek || 0);
    const source: AcquisitionDebtSource = acquisitionCase?.closing?.finalPrice === 0
        ? 'STOCK_CONTROL_TRANSFER'
        : 'NEGOTIATED_ACQUISITION';
    const base = {
        id: `acq_debt_${studioId}_${signedYear}_${signedWeek}`,
        studioId,
        studioName: String(acquisitionCase.studioName || studioId),
        originalPrincipal: principal,
        remainingPrincipal: principal,
        originatedWeek: signedWeek,
        originatedYear: signedYear,
        source,
        status: 'ACTIVE' as const,
        interestPaidToDate: 0,
        missedServiceAmount: 0,
        missedPayments: 0,
        trackingOrigin,
    };
    const studio = player ? getStudioAssetById(player, studioId) : undefined;
    if (trackingOrigin === 'SIGNED' && studio && player) {
        /* a new deal: the balance the studio brings is a Bank loan on the studio.
           - If the rival already had Bank loans, their terms carry over: the main lender, the rate they were taken at
             (principal-weighted), and the time they still had left.
           - Otherwise the Bank's terms for the studio now, on its longest term. */
        const rivalLoans = (player.world?.studios?.[String(acquisitionCase.studioId)]?.ai?.finance?.loans || [])
            .filter(loan => loan.status !== 'PAID' && loan.principal > 0);
        const owedOnLoans = rivalLoans.reduce((sum, loan) => sum + loan.principal, 0);
        if (owedOnLoans > 0) {
            const lead = [...rivalLoans].sort((a, b) => b.principal - a.principal)[0];
            const rate = rivalLoans.reduce((sum, loan) => sum + loan.annualInterestRate * loan.principal, 0) / owedOnLoans;
            const termWeeks = Math.max(12, ...rivalLoans.map(loan => loan.weeksRemaining || 0));
            return {
                ...base,
                annualInterestRate: rate,
                lenderName: lead.lenderName,
                repayment: 'AMORTIZING',
                weeklyPayment: calculateWeeklyLoanPayment(principal, rate, termWeeks),
                termWeeks,
                weeksRemaining: termWeeks,
                successfulPayments: 0,
                lateFeesCharged: 0,
            };
        }
        const terms = getBankTerms(getOwnedStudioBorrowerProfile(studio, getAbsoluteWeek(player.age, player.currentWeek)), principal, BANK_LONGEST_TERM_WEEKS);
        return {
            ...base,
            annualInterestRate: terms.annualInterestRate,
            lenderName: terms.lenderName,
            repayment: 'AMORTIZING',
            weeklyPayment: terms.weeklyPayment,
            termWeeks: terms.termWeeks,
            weeksRemaining: terms.termWeeks,
            successfulPayments: 0,
            lateFeesCharged: 0,
        };
    }
    return { ...base, annualInterestRate: getDebtRate(acquisitionCase, principal) };
};

const normalizeEntry = (entry: AcquisitionDebtEntry): AcquisitionDebtEntry => {
    const remainingPrincipal = roundMoney(entry.remainingPrincipal);
    return {
        ...entry,
        originalPrincipal: roundMoney(entry.originalPrincipal || remainingPrincipal),
        remainingPrincipal,
        annualInterestRate: clamp(Number(entry.annualInterestRate || 0.085), 0.035, 0.18),
        status: remainingPrincipal > 0 ? entry.status || 'ACTIVE' : 'PAID_OFF',
        interestPaidToDate: roundMoney(entry.interestPaidToDate || 0),
        missedServiceAmount: roundMoney(entry.missedServiceAmount || 0),
        missedPayments: Math.max(0, Math.round(entry.missedPayments || 0)),
        closureReason: entry.closureReason,
    };
};

const closeOrphanedDebtEntry = (entry: AcquisitionDebtEntry): AcquisitionDebtEntry => ({
    ...entry,
    remainingPrincipal: 0,
    status: 'PAID_OFF',
    missedServiceAmount: 0,
    missedPayments: 0,
    closureReason: 'ORPHANED_STUDIO_ASSET',
});

const reconcileEntryWithStudioAssets = (
    entry: AcquisitionDebtEntry,
    player: Pick<Player, 'flags'> & Partial<Pick<Player, 'businesses'>>,
): AcquisitionDebtEntry => {
    const normalized = normalizeEntry(entry);
    if (normalized.status === 'PAID_OFF' || normalized.remainingPrincipal <= 0) return normalized;
    if (!Array.isArray(player.businesses)) return normalized;
    const directStudio = getStudioAssetById(player, normalized.studioId);
    if (directStudio) return { ...normalized, studioName: directStudio.name || normalized.studioName };

    const matchingCase = getAcquiredCases(player).find((acquisitionCase: any) => (
        getAcquisitionCaseStudioIds(acquisitionCase).includes(normalized.studioId)
    ));
    const resolvedStudioId = matchingCase ? resolveLiveAcquisitionStudioId(player, matchingCase) : undefined;
    const resolvedStudio = resolvedStudioId ? getStudioAssetById(player, resolvedStudioId) : undefined;
    if (resolvedStudioId && resolvedStudio) {
        return {
            ...normalized,
            studioId: resolvedStudioId,
            studioName: resolvedStudio.name || normalized.studioName,
        };
    }

    return closeOrphanedDebtEntry(normalized);
};

export const getAcquisitionDebtLedger = (player: Pick<Player, 'flags'> & Partial<Pick<Player, 'businesses'>>): AcquisitionDebtEntry[] => (
    getRawLedger(player).map(normalizeEntry)
);

export const syncAcquisitionDebtLedger = (
    player: Player,
    trackingOrigin: AcquisitionDebtTrackingOrigin = 'RECONCILED',
): Player => {
    const ledger = getRawLedger(player).map(entry => reconcileEntryWithStudioAssets(entry, player));
    const existingStudioIds = new Set(ledger.map(entry => entry.studioId));
    const newEntries = getAcquiredCases(player)
        .map((acquisitionCase: any) => ({
            acquisitionCase,
            studioId: resolveLiveAcquisitionStudioId(player, acquisitionCase) || String(acquisitionCase.studioId),
        }))
        .filter(({ acquisitionCase, studioId }) => (
            !existingStudioIds.has(studioId)
            && !getAcquisitionCaseStudioIds(acquisitionCase).some(caseStudioId => existingStudioIds.has(caseStudioId))
        ))
        .map(({ acquisitionCase, studioId }) => makeDebtEntry(acquisitionCase, studioId, trackingOrigin, player))
        .filter((entry): entry is AcquisitionDebtEntry => Boolean(entry));

    const nextLedger = [...ledger, ...newEntries].map(normalizeEntry);
    if (!nextLedger.length && !player.flags?.acquisitionDebtLedger) return player;

    return {
        ...player,
        flags: {
            ...player.flags,
            acquisitionDebtLedger: nextLedger,
        },
    };
};

/** A loan the owing studio still has to pay (a defaulted loan is still owed, but the Bank no longer collects it weekly). */
const isOwed = (entry: AcquisitionDebtEntry) => entry.status !== 'PAID_OFF' && entry.remainingPrincipal > 0;

const weeklyInterestOf = (entry: AcquisitionDebtEntry) => roundMoney(entry.remainingPrincipal * entry.annualInterestRate / 52);

/** This week's payment: the interest on an interest-only loan, the Bank's payment on an amortizing one. */
export const getAcquisitionDebtWeeklyDue = (entry: AcquisitionDebtEntry) => weeklyDueOf(entry);
function weeklyDueOf(entry: AcquisitionDebtEntry) {
    if (entry.status !== 'ACTIVE' || entry.remainingPrincipal <= 0) return 0;
    if (entry.repayment === 'AMORTIZING' && Number(entry.weeklyPayment) > 0) {
        return roundMoney(Math.min(Number(entry.weeklyPayment), entry.remainingPrincipal + weeklyInterestOf(entry)));
    }
    return weeklyInterestOf(entry);
}

/** How hard one studio's loans press on that studio: its own treasury and results, its own missed payments. */
const getStudioDebtPressure = (studio: Business | undefined, entries: AcquisitionDebtEntry[]) => {
    const owed = entries.reduce((sum, entry) => sum + entry.remainingPrincipal, 0);
    const due = entries.reduce((sum, entry) => sum + weeklyDueOf(entry), 0);
    const treasury = Math.max(0, studio?.balance || 0);
    const weeklyProfit = Math.max(0, studio?.stats?.weeklyProfit || 0);
    const leveragePressure = (owed / Math.max(1, treasury)) * 16;
    const paymentPressure = due > 0 ? (due / Math.max(1, weeklyProfit + (treasury * 0.004))) * 22 : 0;
    const missedPressure = entries.reduce((sum, entry) => sum + Math.min(22, entry.missedPayments * 6), 0);
    const defaultPressure = entries.some(entry => entry.status === 'DEFAULTED') ? 40 : 0;
    return Math.round(clamp(leveragePressure + paymentPressure + missedPressure + defaultPressure));
};

const getPressureByStudio = (player: Player, entries: AcquisitionDebtEntry[]) => {
    const byStudio = new Map<string, AcquisitionDebtEntry[]>();
    entries.forEach(entry => {
        const payerId = getPayingStudioId(player.businesses || [], entry.studioId);
        byStudio.set(payerId, [...(byStudio.get(payerId) || []), entry]);
    });
    return new Map(Array.from(byStudio.entries()).map(([studioId, studioEntries]) => [
        studioId,
        getStudioDebtPressure(getStudioAssetById(player, studioId), studioEntries),
    ]));
};

/** How hard one studio's own loans press on it (0–100). */
export const getAcquisitionDebtPressureForStudio = (player: Player, studioId: string): number => {
    const payerId = getPayingStudioId(player.businesses || [], studioId);
    const entries = getAcquisitionDebtLedger(syncAcquisitionDebtLedger(player))
        .filter(entry => isOwed(entry) && getPayingStudioId(player.businesses || [], entry.studioId) === payerId);
    return entries.length ? getStudioDebtPressure(getStudioAssetById(player, payerId), entries) : 0;
};

export const getAcquisitionDebtSummary = (player: Player): AcquisitionDebtSummary => {
    const entries = getAcquisitionDebtLedger(syncAcquisitionDebtLedger(player)).filter(isOwed);
    const totalOriginalPrincipal = roundMoney(entries.reduce((sum, entry) => sum + entry.originalPrincipal, 0));
    const totalRemainingPrincipal = roundMoney(entries.reduce((sum, entry) => sum + entry.remainingPrincipal, 0));
    const weeklyInterestDue = roundMoney(entries.reduce((sum, entry) => sum + weeklyDueOf(entry), 0));
    const weightedAverageRate = totalRemainingPrincipal > 0
        ? entries.reduce((sum, entry) => sum + (entry.annualInterestRate * entry.remainingPrincipal), 0) / totalRemainingPrincipal
        : 0;
    const pressures = Array.from(getPressureByStudio(player, entries).values());

    return {
        entries,
        totalOriginalPrincipal,
        totalRemainingPrincipal,
        weeklyInterestDue,
        weightedAverageRate,
        /* the hardest-pressed studio: one studio's loans do not press on the others */
        pressureScore: pressures.length ? Math.max(...pressures) : 0,
        highestRate: entries.reduce((max, entry) => Math.max(max, entry.annualInterestRate), 0),
        nextServiceLabel: entries.some(entry => entry.status === 'ACTIVE') ? 'Next weekly tick' : 'No service due',
    };
};

const addTransaction = (player: Player, amount: number, description: string, cashFlowType: Transaction['cashFlowType']): Player => {
    const safeAmount = Math.trunc(amount);
    if (safeAmount === 0) return player;
    const transaction: Transaction = {
        id: `tx_acq_debt_${Date.now()}_${Math.random()}`,
        week: player.currentWeek,
        year: player.age,
        amount: safeAmount,
        category: safeAmount > 0 ? 'LOAN' : 'EXPENSE',
        cashFlowType,
        description,
    };
    return {
        ...player,
        finance: {
            ...player.finance,
            history: retainBankTransactionHistory([transaction, ...(player.finance?.history || [])]),
        },
    };
};

const makeDebtNews = (player: Player, pressure: number): NewsItem => {
    const language = getPlayerLanguage(player);
    return {
        id: `news_acq_debt_pressure_${player.age}_${player.currentWeek}`,
        headline: t(language, 'services.acquisitionDebt.news.headline', { name: player.name }),
        subtext: t(language, 'services.acquisitionDebt.news.subtext', { pressure: Math.round(pressure).toString() }),
        category: 'INDUSTRY',
        week: player.currentWeek,
        year: player.age,
        impactLevel: pressure >= 70 ? 'HIGH' : 'MEDIUM',
    };
};

const makeDebtPost = (player: Player, pressure: number): XPost => {
    const language = getPlayerLanguage(player);
    return {
        id: `x_acq_debt_pressure_${player.age}_${player.currentWeek}`,
        authorId: 'market_desk',
        authorName: 'Market Desk',
        authorHandle: '@marketdesk',
        authorAvatar: '📊',
        content: t(language, 'services.acquisitionDebt.post.content', { name: player.name }),
        timestamp: Date.now(),
        likes: 900 + (pressure * 38),
        retweets: 150 + (pressure * 9),
        replies: 80 + (pressure * 5),
        isPlayer: false,
        isLiked: false,
        isRetweeted: false,
        isVerified: true,
        postType: 'GENERAL',
        sentiment: pressure >= 70 ? 'MESSY' : 'INDUSTRY',
    };
};

/** The pressure of a studio's loans lowers that studio's investor confidence and raises its risk (no other studio). */
const applyInvestorDebtPressure = (player: Player, pressureByStudio: Map<string, number>): Player => ({
    ...player,
    businesses: (player.businesses || []).map(business => {
        const pressure = business.type === 'PRODUCTION_HOUSE' ? pressureByStudio.get(business.id) || 0 : 0;
        if (pressure < 35) return business;
        const confidenceHit = pressure >= 70 ? 4 : pressure >= 52 ? 2 : 1;
        return {
            ...business,
            stats: {
                ...business.stats,
                investorConfidence: clamp((business.stats?.investorConfidence ?? 55) - confidenceHit),
                riskLevel: clamp((business.stats?.riskLevel ?? 30) + Math.ceil(confidenceHit * 1.5)),
            },
        };
    }),
});

const pushLog = (player: Player, message: string, type: 'positive' | 'negative' | 'neutral'): Player => ({
    ...player,
    logs: [...(player.logs || []), { week: player.currentWeek, year: player.age, message, type }],
});

export const processAcquisitionDebtService = (player: Player): AcquisitionDebtServiceResult => {
    let nextPlayer = syncAcquisitionDebtLedger(player);
    const language = getPlayerLanguage(nextPlayer);
    let summary = getAcquisitionDebtSummary(nextPlayer);
    const currentWeekKey = weekKey(nextPlayer);
    if (!summary.entries.length || nextPlayer.flags?.acquisitionDebtLastServicedWeekKey === currentWeekKey) {
        return { player: nextPlayer, summary, servicedAmount: 0, unpaidAmount: 0, pressureNewsCreated: false };
    }

    /* each owing studio pays its own loans from its own treasury, highest rate first */
    let businesses = [...(nextPlayer.businesses || [])];
    let servicedAmount = 0;
    let unpaidAmount = 0;
    const events: Array<{ message: string; type: 'positive' | 'negative' | 'neutral' }> = [];
    const order = getAcquisitionDebtLedger(nextPlayer)
        .map((entry, index) => ({ entry, index }))
        .sort((a, b) => b.entry.annualInterestRate - a.entry.annualInterestRate);
    const updated = getAcquisitionDebtLedger(nextPlayer);
    order.forEach(({ entry, index }) => {
        if (entry.status !== 'ACTIVE' || entry.remainingPrincipal <= 0) return;
        const due = weeklyDueOf(entry);
        if (due <= 0) return;
        const interest = weeklyInterestOf(entry);
        const payerId = getPayingStudioId(businesses, entry.studioId);
        const studioIndex = businesses.findIndex(business => business.type === 'PRODUCTION_HOUSE' && business.id === payerId);
        const studio = studioIndex >= 0 ? businesses[studioIndex] : undefined;
        const lender = entry.lenderName || t(language, 'services.acquisitionDebt.lender.signed');
        if (studio && Math.max(0, studio.balance || 0) >= due) {
            businesses[studioIndex] = { ...captureStudioEquityCashBasis(studio), balance: studio.balance - due };
            servicedAmount += due;
            if (entry.repayment === 'AMORTIZING') {
                const principal = roundMoney(Math.max(0, entry.remainingPrincipal - Math.max(0, due - interest)));
                const weeksRemaining = Math.max(0, Number(entry.weeksRemaining ?? entry.termWeeks ?? 0) - 1);
                const paidOff = principal <= 0 || weeksRemaining === 0;
                updated[index] = {
                    ...entry,
                    remainingPrincipal: paidOff ? 0 : principal,
                    weeksRemaining: paidOff ? 0 : weeksRemaining,
                    interestPaidToDate: roundMoney(entry.interestPaidToDate + Math.min(due, interest)),
                    successfulPayments: (entry.successfulPayments || 0) + 1,
                    status: paidOff ? 'PAID_OFF' : 'ACTIVE',
                    lastServicedWeekKey: currentWeekKey,
                };
                if (paidOff) events.push({ message: t(language, 'services.acquisitionDebt.log.paidOff', { studio: studio.name, lender }), type: 'positive' });
            } else {
                updated[index] = {
                    ...entry,
                    interestPaidToDate: roundMoney(entry.interestPaidToDate + due),
                    successfulPayments: (entry.successfulPayments || 0) + 1,
                    lastServicedWeekKey: currentWeekKey,
                };
            }
            return;
        }
        /* the Bank's rule for a missed payment: a late fee of 1% of the original amount, and the interest added to the balance */
        const lateFee = roundMoney(Math.max(1_000, entry.originalPrincipal * 0.01));
        const missedPayments = entry.missedPayments + 1;
        const defaulted = missedPayments >= 3;
        unpaidAmount += due;
        updated[index] = {
            ...entry,
            remainingPrincipal: roundMoney(entry.remainingPrincipal + interest + lateFee),
            missedServiceAmount: roundMoney(entry.missedServiceAmount + due),
            missedPayments,
            lateFeesCharged: roundMoney((entry.lateFeesCharged || 0) + lateFee),
            status: defaulted ? 'DEFAULTED' : 'ACTIVE',
            lastServicedWeekKey: currentWeekKey,
        };
        const studioName = studio?.name || entry.studioName;
        events.push(defaulted
            ? { message: t(language, 'services.acquisitionDebt.log.defaulted', { studio: studioName, lender }), type: 'negative' }
            : { message: t(language, 'services.acquisitionDebt.log.missed', { amount: due.toLocaleString(), studio: studioName, lender }), type: 'negative' });
    });

    nextPlayer = {
        ...nextPlayer,
        businesses,
        flags: {
            ...nextPlayer.flags,
            acquisitionDebtLedger: updated,
            acquisitionDebtLastServicedWeekKey: currentWeekKey,
        },
    };

    summary = getAcquisitionDebtSummary(nextPlayer);
    const pressureByStudio = getPressureByStudio(nextPlayer, summary.entries);
    nextPlayer = applyInvestorDebtPressure(nextPlayer, pressureByStudio);

    const shouldCreatePressureNews = (
        summary.pressureScore >= 45
        && (nextPlayer.flags?.acquisitionDebtLastPressureNewsWeek !== nextPlayer.currentWeek)
    ) || unpaidAmount > 0;
    if (shouldCreatePressureNews) {
        const news = makeDebtNews(nextPlayer, summary.pressureScore);
        nextPlayer = {
            ...nextPlayer,
            news: [news, ...(nextPlayer.news || []).filter(item => item.id !== news.id)].slice(0, 80),
            x: {
                ...nextPlayer.x,
                feed: [makeDebtPost(nextPlayer, summary.pressureScore), ...(nextPlayer.x?.feed || [])].slice(0, 80),
            },
            flags: {
                ...nextPlayer.flags,
                acquisitionDebtLastPressureNewsWeek: nextPlayer.currentWeek,
            },
        };
    }

    if (servicedAmount > 0) {
        nextPlayer = pushLog(nextPlayer, t(language, 'services.acquisitionDebt.log.serviced', { amount: servicedAmount.toLocaleString() }), 'neutral');
    }
    events.forEach(event => { nextPlayer = pushLog(nextPlayer, event.message, event.type); });

    return {
        player: nextPlayer,
        summary,
        servicedAmount: roundMoney(servicedAmount),
        unpaidAmount: roundMoney(unpaidAmount),
        pressureNewsCreated: shouldCreatePressureNews,
    };
};

export const payDownAcquisitionDebt = (player: Player, amount: number, studioId?: string): AcquisitionDebtPaydownResult => {
    let nextPlayer = syncAcquisitionDebtLedger(player);
    const summary = getAcquisitionDebtSummary(nextPlayer);
    const requestedAmount = roundMoney(amount);
    if (!summary.entries.length || summary.totalRemainingPrincipal <= 0) {
        return { success: false, player: nextPlayer, paidAmount: 0, summary, reason: 'NO_ACTIVE_DEBT' };
    }
    if (requestedAmount <= 0) {
        return { success: false, player: nextPlayer, paidAmount: 0, summary, reason: 'INVALID_AMOUNT' };
    }
    if ((nextPlayer.money || 0) < requestedAmount) {
        return { success: false, player: nextPlayer, paidAmount: 0, summary, reason: 'INSUFFICIENT_CASH' };
    }

    const payableEntries = studioId
        ? summary.entries.filter(entry => entry.studioId === studioId)
        : summary.entries;
    const payablePrincipal = roundMoney(payableEntries.reduce((sum, entry) => sum + entry.remainingPrincipal, 0));
    if (!payableEntries.length || payablePrincipal <= 0) {
        return { success: false, player: nextPlayer, paidAmount: 0, summary, reason: 'NO_ACTIVE_DEBT' };
    }

    let remainingPaydown = Math.min(requestedAmount, payablePrincipal);
    const sortedIds = [...payableEntries]
        .sort((a, b) => {
            return b.annualInterestRate - a.annualInterestRate;
        })
        .map(entry => entry.id);
    const nextLedger = getAcquisitionDebtLedger(nextPlayer).map(entry => {
        if (!sortedIds.includes(entry.id) || remainingPaydown <= 0) return entry;
        const payAmount = Math.min(entry.remainingPrincipal, remainingPaydown);
        remainingPaydown = roundMoney(remainingPaydown - payAmount);
        const remainingPrincipal = roundMoney(entry.remainingPrincipal - payAmount);
        return {
            ...entry,
            remainingPrincipal,
            /* paying a defaulted loan down keeps it defaulted until it is cleared */
            status: remainingPrincipal > 0 ? entry.status : 'PAID_OFF' as const,
            ...(remainingPrincipal > 0 ? {} : { weeksRemaining: 0 }),
        };
    });
    const paidAmount = roundMoney(Math.min(requestedAmount, payablePrincipal));

    nextPlayer = {
        ...nextPlayer,
        money: Math.max(0, Math.trunc((nextPlayer.money || 0) - paidAmount)),
        flags: {
            ...nextPlayer.flags,
            acquisitionDebtLedger: nextLedger,
        },
    };
    const language = getPlayerLanguage(nextPlayer);
    nextPlayer = addTransaction(nextPlayer, -paidAmount, t(language, 'services.acquisitionDebt.transaction.paydown'), 'FINANCING');
    nextPlayer = pushLog(nextPlayer, t(language, 'services.acquisitionDebt.log.paidDown', { amount: paidAmount.toLocaleString() }), 'positive');

    return {
        success: true,
        player: nextPlayer,
        paidAmount,
        summary: getAcquisitionDebtSummary(nextPlayer),
    };
};

/** Records a refund to the player's own cash (the 18 Nov 2026 loan correction uses it). */
export const creditAcquisitionDebtRefund = (player: Player, amount: number, description: string): Player => {
    const refund = Math.max(0, Math.trunc(amount));
    if (!refund) return player;
    return addTransaction({ ...player, money: Math.max(0, Math.trunc(player.money || 0)) + refund }, refund, description, 'FINANCING');
};

/** After a signing, the rival's own Bank loans now live on the player's ledger: clear them from its world record so
    nothing counts them twice (18 Nov 2026, debt plan v2). */
export const moveSignedRivalLoansToLedger = (player: Player, studioId: string): Player => {
    const record = player.world?.studios?.[studioId];
    if (!record?.ai?.finance || (!(record.ai.finance.loans || []).length && !(record.ai.finance.debtPrincipalMillions > 0))) return player;
    return {
        ...player,
        world: {
            ...player.world,
            studios: {
                ...player.world.studios,
                [studioId]: { ...record, ai: { ...record.ai, finance: { ...record.ai.finance, loans: [], debtPrincipalMillions: 0 } } },
            },
        },
    };
};
