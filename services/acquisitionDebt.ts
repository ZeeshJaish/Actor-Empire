import type { NewsItem, Player, Transaction, XPost } from '../types';
import { getPlayerLanguage, t } from './i18n';

export type AcquisitionDebtStatus = 'ACTIVE' | 'PAID_OFF';
export type AcquisitionDebtSource = 'NEGOTIATED_ACQUISITION' | 'STOCK_CONTROL_TRANSFER';

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
    closureReason?: 'ORPHANED_STUDIO_ASSET';
}

export interface AcquisitionDebtSummary {
    entries: AcquisitionDebtEntry[];
    totalOriginalPrincipal: number;
    totalRemainingPrincipal: number;
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

const getDebtRate = (acquisitionCase: any, principal: number) => {
    const valuation = Math.max(1, Number(acquisitionCase?.publicValuation || acquisitionCase?.closing?.finalPrice || principal || 1));
    const leverage = principal / valuation;
    const baseRate = acquisitionCase?.closing?.finalPrice === 0 ? 0.0725 : 0.0825;
    return clamp(baseRate + (leverage * 0.08), 0.055, 0.145);
};

const makeDebtEntry = (acquisitionCase: any, studioIdOverride?: string): AcquisitionDebtEntry | null => {
    const principal = getCaseDebtPrincipal(acquisitionCase);
    if (principal <= 0) return null;
    const studioId = String(studioIdOverride || acquisitionCase.studioId);
    const signedYear = Number(acquisitionCase.closing?.signedYear || acquisitionCase.approachedYear || 0);
    const signedWeek = Number(acquisitionCase.closing?.signedWeek || acquisitionCase.approachedWeek || 0);
    const source: AcquisitionDebtSource = acquisitionCase?.closing?.finalPrice === 0
        ? 'STOCK_CONTROL_TRANSFER'
        : 'NEGOTIATED_ACQUISITION';
    return {
        id: `acq_debt_${studioId}_${signedYear}_${signedWeek}`,
        studioId,
        studioName: String(acquisitionCase.studioName || studioId),
        originalPrincipal: principal,
        remainingPrincipal: principal,
        annualInterestRate: getDebtRate(acquisitionCase, principal),
        originatedWeek: signedWeek,
        originatedYear: signedYear,
        source,
        status: 'ACTIVE',
        interestPaidToDate: 0,
        missedServiceAmount: 0,
        missedPayments: 0,
    };
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
    if (normalized.status !== 'ACTIVE' || normalized.remainingPrincipal <= 0) return normalized;
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

export const syncAcquisitionDebtLedger = (player: Player): Player => {
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
        .map(({ acquisitionCase, studioId }) => makeDebtEntry(acquisitionCase, studioId))
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

export const getAcquisitionDebtSummary = (player: Player): AcquisitionDebtSummary => {
    const entries = getAcquisitionDebtLedger(syncAcquisitionDebtLedger(player))
        .filter(entry => entry.status === 'ACTIVE' && entry.remainingPrincipal > 0);
    const totalOriginalPrincipal = roundMoney(entries.reduce((sum, entry) => sum + entry.originalPrincipal, 0));
    const totalRemainingPrincipal = roundMoney(entries.reduce((sum, entry) => sum + entry.remainingPrincipal, 0));
    const weeklyInterestDue = roundMoney(entries.reduce((sum, entry) => sum + (entry.remainingPrincipal * entry.annualInterestRate / 52), 0));
    const weightedAverageRate = totalRemainingPrincipal > 0
        ? entries.reduce((sum, entry) => sum + (entry.annualInterestRate * entry.remainingPrincipal), 0) / totalRemainingPrincipal
        : 0;
    const groupCash = (player.businesses || []).reduce((sum, business) => sum + Math.max(0, business.balance || 0), 0);
    const groupWeeklyProfit = (player.businesses || []).reduce((sum, business) => sum + Math.max(0, business.stats?.weeklyProfit || 0), 0);
    const liquidityBase = Math.max(1, Math.max(0, player.money || 0) + groupCash);
    const leveragePressure = (totalRemainingPrincipal / liquidityBase) * 16;
    const interestPressure = weeklyInterestDue > 0 ? (weeklyInterestDue / Math.max(1, groupWeeklyProfit + (player.money * 0.004))) * 22 : 0;
    const missedPressure = entries.reduce((sum, entry) => sum + Math.min(22, entry.missedPayments * 6), 0);

    return {
        entries,
        totalOriginalPrincipal,
        totalRemainingPrincipal,
        weeklyInterestDue,
        weightedAverageRate,
        pressureScore: Math.round(clamp(leveragePressure + interestPressure + missedPressure)),
        highestRate: entries.reduce((max, entry) => Math.max(max, entry.annualInterestRate), 0),
        nextServiceLabel: entries.length ? 'Next weekly tick' : 'No service due',
    };
};

const addTransaction = (player: Player, amount: number, description: string): Player => {
    const safeAmount = Math.trunc(amount);
    if (safeAmount === 0) return player;
    const transaction: Transaction = {
        id: `tx_acq_debt_${Date.now()}_${Math.random()}`,
        week: player.currentWeek,
        year: player.age,
        amount: safeAmount,
        category: 'EXPENSE',
        description,
    };
    return {
        ...player,
        finance: {
            ...player.finance,
            history: [transaction, ...(player.finance?.history || [])].slice(0, 200),
        },
    };
};

const makeDebtNews = (player: Player, summary: AcquisitionDebtSummary): NewsItem => {
    const language = getPlayerLanguage(player);
    return {
        id: `news_acq_debt_pressure_${player.age}_${player.currentWeek}`,
        headline: t(language, 'services.acquisitionDebt.news.headline', { name: player.name }),
        subtext: t(language, 'services.acquisitionDebt.news.subtext', { pressure: Math.round(summary.pressureScore).toString() }),
        category: 'INDUSTRY',
        week: player.currentWeek,
        year: player.age,
        impactLevel: summary.pressureScore >= 70 ? 'HIGH' : 'MEDIUM',
    };
};

const makeDebtPost = (player: Player, summary: AcquisitionDebtSummary): XPost => {
    const language = getPlayerLanguage(player);
    return {
        id: `x_acq_debt_pressure_${player.age}_${player.currentWeek}`,
        authorId: 'market_desk',
        authorName: 'Market Desk',
        authorHandle: '@marketdesk',
        authorAvatar: '📊',
        content: t(language, 'services.acquisitionDebt.post.content', { name: player.name }),
        timestamp: Date.now(),
        likes: 900 + (summary.pressureScore * 38),
        retweets: 150 + (summary.pressureScore * 9),
        replies: 80 + (summary.pressureScore * 5),
        isPlayer: false,
        isLiked: false,
        isRetweeted: false,
        isVerified: true,
        postType: 'GENERAL',
        sentiment: summary.pressureScore >= 70 ? 'MESSY' : 'INDUSTRY',
    };
};

const applyInvestorDebtPressure = (player: Player, pressure: number): Player => {
    if (pressure < 35) return player;
    const confidenceHit = pressure >= 70 ? 4 : pressure >= 52 ? 2 : 1;
    return {
        ...player,
        businesses: (player.businesses || []).map(business => business.type === 'PRODUCTION_HOUSE'
            ? {
                ...business,
                stats: {
                    ...business.stats,
                    investorConfidence: clamp((business.stats?.investorConfidence ?? 55) - confidenceHit),
                    riskLevel: clamp((business.stats?.riskLevel ?? 30) + Math.ceil(confidenceHit * 1.5)),
                },
            }
            : business),
    };
};

export const processAcquisitionDebtService = (player: Player): AcquisitionDebtServiceResult => {
    let nextPlayer = syncAcquisitionDebtLedger(player);
    const language = getPlayerLanguage(nextPlayer);
    let summary = getAcquisitionDebtSummary(nextPlayer);
    const currentWeekKey = weekKey(nextPlayer);
    if (summary.weeklyInterestDue <= 0 || nextPlayer.flags?.acquisitionDebtLastServicedWeekKey === currentWeekKey) {
        return { player: nextPlayer, summary, servicedAmount: 0, unpaidAmount: 0, pressureNewsCreated: false };
    }

    const due = summary.weeklyInterestDue;
    const servicedAmount = Math.min(Math.max(0, nextPlayer.money || 0), due);
    const unpaidAmount = roundMoney(Math.max(0, due - servicedAmount));
    const paidRatio = due > 0 ? servicedAmount / due : 0;
    const updatedLedger = getAcquisitionDebtLedger(nextPlayer).map(entry => {
        if (entry.status !== 'ACTIVE' || entry.remainingPrincipal <= 0) return entry;
        const entryDue = roundMoney(entry.remainingPrincipal * entry.annualInterestRate / 52);
        const entryPaid = roundMoney(Math.min(entryDue, entryDue * paidRatio));
        const entryUnpaid = roundMoney(Math.max(0, entryDue - entryPaid));
        return {
            ...entry,
            interestPaidToDate: roundMoney(entry.interestPaidToDate + entryPaid),
            missedServiceAmount: roundMoney(entry.missedServiceAmount + entryUnpaid),
            missedPayments: entryUnpaid > 0 ? entry.missedPayments + 1 : entry.missedPayments,
            lastServicedWeekKey: currentWeekKey,
        };
    });

    nextPlayer = {
        ...nextPlayer,
        money: Math.max(0, Math.trunc((nextPlayer.money || 0) - servicedAmount)),
        flags: {
            ...nextPlayer.flags,
            acquisitionDebtLedger: updatedLedger,
            acquisitionDebtLastServicedWeekKey: currentWeekKey,
        },
    };
    if (servicedAmount > 0) {
        nextPlayer = addTransaction(nextPlayer, -servicedAmount, t(language, 'services.acquisitionDebt.transaction.interest'));
    }

    summary = getAcquisitionDebtSummary(nextPlayer);
    nextPlayer = applyInvestorDebtPressure(nextPlayer, summary.pressureScore + (unpaidAmount > 0 ? 20 : 0));

    const shouldCreatePressureNews = (
        summary.pressureScore >= 45
        && (nextPlayer.flags?.acquisitionDebtLastPressureNewsWeek !== nextPlayer.currentWeek)
    ) || unpaidAmount > 0;
    if (shouldCreatePressureNews) {
        const news = makeDebtNews(nextPlayer, summary);
        nextPlayer = {
            ...nextPlayer,
            news: [news, ...(nextPlayer.news || []).filter(item => item.id !== news.id)].slice(0, 80),
            x: {
                ...nextPlayer.x,
                feed: [makeDebtPost(nextPlayer, summary), ...(nextPlayer.x?.feed || [])].slice(0, 80),
            },
            flags: {
                ...nextPlayer.flags,
                acquisitionDebtLastPressureNewsWeek: nextPlayer.currentWeek,
            },
        };
    }

    nextPlayer = {
        ...nextPlayer,
        logs: [{
            week: nextPlayer.currentWeek,
            year: nextPlayer.age,
            message: unpaidAmount > 0
                ? t(language, 'services.acquisitionDebt.log.missed', { amount: unpaidAmount.toLocaleString() })
                : t(language, 'services.acquisitionDebt.log.serviced', { amount: servicedAmount.toLocaleString() }),
            type: unpaidAmount > 0 ? 'negative' as const : 'neutral' as const,
        }, ...(nextPlayer.logs || [])].slice(0, 80),
    };

    return {
        player: nextPlayer,
        summary,
        servicedAmount: roundMoney(servicedAmount),
        unpaidAmount,
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
            status: remainingPrincipal > 0 ? 'ACTIVE' as const : 'PAID_OFF' as const,
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
    nextPlayer = addTransaction(nextPlayer, -paidAmount, t(language, 'services.acquisitionDebt.transaction.paydown'));
    nextPlayer = {
        ...nextPlayer,
        logs: [{
            week: nextPlayer.currentWeek,
            year: nextPlayer.age,
            message: t(language, 'services.acquisitionDebt.log.paidDown', { amount: paidAmount.toLocaleString() }),
            type: 'positive' as const,
        }, ...(nextPlayer.logs || [])].slice(0, 80),
    };

    return {
        success: true,
        player: nextPlayer,
        paidAmount,
        summary: getAcquisitionDebtSummary(nextPlayer),
    };
};
