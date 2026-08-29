import type { Player } from '../types';
import type {
    FinanceEvent,
    MarketFinance,
    PeriodCut,
    RevenueSource,
    StudioFinanceData,
    TitleFinance,
    Transaction,
    TxCategory,
    TxLane,
    WeekPoint,
} from '../components/studio-finance/finance/types';
import { getAbsoluteWeek } from './legacyLogic';
import { normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import {
    getStreamingFinanceRoom,
    type StreamingFinanceLedgerCategory,
    type StreamingFinanceLedgerEntry,
    type StreamingFinanceRoomModel,
} from './streamingFinanceRoom';
import { getStreamingPublicMarkets } from './streamingPublicMarkets';
import { resolveStreamingCatalogTitle } from './streamingCatalog';

export type StudioFinanceInitialTab = 'snapshot' | 'performance' | 'ledger' | 'capital';

const ledgerCategory = (entry: StreamingFinanceLedgerEntry): TxCategory => {
    if (entry.category === 'REVENUE') return 'subscription';
    if (entry.category === 'CONTENT') return 'production';
    if (entry.category === 'NETWORK') return 'infrastructure';
    if (entry.category === 'PEOPLE') return 'payroll';
    if (entry.category === 'PRODUCT') return 'distribution';
    if (entry.category === 'GROWTH') return 'marketing';
    if (entry.category === 'CAPITAL') {
        if (/equity|invest/i.test(entry.label)) return 'investor';
        if (/loan|debt|facility/i.test(entry.label)) return 'debt';
        return 'founder';
    }
    if (entry.category === 'FORMATION') return 'founder';
    return 'tax';
};

const ledgerLane = (entry: StreamingFinanceLedgerEntry): TxLane => {
    if (entry.source === 'CAPITAL' || entry.source === 'FORMATION') return 'CAPITAL';
    if (entry.cashDelta > 0) return 'INCOME';
    if (entry.cashDelta < 0) return 'EXPENSE';
    return 'OPERATIONS';
};

const departmentLabel = (category: StreamingFinanceLedgerCategory): string => ({
    FORMATION: 'Formation',
    CAPITAL: 'Capital',
    REVENUE: 'Revenue',
    CONTENT: 'Content',
    NETWORK: 'Network',
    PEOPLE: 'People',
    PRODUCT: 'Product',
    GROWTH: 'Growth',
    RISK: 'Risk',
    CORPORATE: 'Corporate',
    ADJUSTMENT: 'Adjustment',
}[category]);

const transactionsFrom = (model: StreamingFinanceRoomModel): Transaction[] => {
    const settlementRank: Record<StreamingFinanceLedgerEntry['source'], number> = {
        FORMATION: 0,
        CAPITAL: 1,
        OPERATIONS: 2,
        DECISION: 3,
        HISTORY: 4,
    };
    const entries = [...model.ledger].sort((left, right) => (
        left.absoluteWeek - right.absoluteWeek
        || settlementRank[left.source] - settlementRank[right.source]
        || left.id.localeCompare(right.id)
    ));
    const movement = entries.reduce((sum, entry) => sum + (entry.affectsTreasury ? entry.cashDelta : 0), 0);
    let balance = Math.max(0, model.treasuryCash - movement);

    return entries.map((entry) => {
        if (entry.affectsTreasury) balance = Math.max(0, balance + entry.cashDelta);
        return {
            id: entry.id,
            week: entry.absoluteWeek,
            date: `W${entry.absoluteWeek}`,
            name: entry.label,
            category: ledgerCategory(entry),
            lane: ledgerLane(entry),
            amount: entry.affectsTreasury ? entry.cashDelta : 0,
            balanceAfter: balance,
            department: departmentLabel(entry.category),
            reason: entry.detail,
        };
    });
};

const weekPointsFrom = (
    model: StreamingFinanceRoomModel,
    player: Player,
): WeekPoint[] => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const capitalByWeek = new Map<number, number>();
    platform.finance.capitalActions.forEach((action) => {
        capitalByWeek.set(action.absoluteWeek, (capitalByWeek.get(action.absoluteWeek) || 0) + action.treasuryDelta);
    });
    let closingCash = model.treasuryCash;
    const points: WeekPoint[] = [];
    for (let index = model.cashflow.length - 1; index >= 0; index -= 1) {
        const point = model.cashflow[index];
        points.unshift({
            week: point.absoluteWeek,
            label: `W${point.absoluteWeek}`,
            revenue: point.revenue,
            expense: point.outflow,
            closingCash,
        });
        closingCash = Math.max(0, closingCash - point.net - (capitalByWeek.get(point.absoluteWeek) || 0));
    }
    return points;
};

const titleFormat = (player: Player, projectId: string, genre: string): TitleFinance['format'] => {
    const project = resolveStreamingCatalogTitle(player, projectId);
    if (/documentary|doc/i.test(genre)) return 'DOC';
    return project?.projectType === 'SERIES' ? 'SERIES' : 'FILM';
};

const titlesFrom = (model: StreamingFinanceRoomModel, player: Player): TitleFinance[] => (
    model.titlePerformance.map((title) => ({
        id: title.projectId,
        name: title.title,
        format: titleFormat(player, title.projectId, title.genre),
        releasedLabel: `${title.source.replaceAll('_', ' ')} · ${title.genre}`,
        posterSeed: title.projectId,
        subscriptionValue: title.revenue,
        advertising: 0,
        licensing: 0,
        productionCost: title.cost,
        marketingCost: 0,
        infrastructureCost: 0,
        trend: model.revenueChangePercent ?? 0,
    }))
);

const sourcesFrom = (model: StreamingFinanceRoomModel): RevenueSource[] => (
    model.revenueSlices.map((source) => ({ id: source.id, name: source.label, amount: source.amount }))
);

const cutFrom = (model: StreamingFinanceRoomModel, player: Player): PeriodCut => ({
    titles: titlesFrom(model, player),
    sources: sourcesFrom(model),
    // The simulation currently records consolidated revenue. Do not fabricate
    // territory economics until the ledger records regional settlement data.
    markets: [] as MarketFinance[],
});

const eventKind = (entry: StreamingFinanceLedgerEntry): FinanceEvent['kind'] => {
    if (entry.category === 'CAPITAL' || entry.category === 'FORMATION') return 'capital';
    if (entry.category === 'NETWORK' || entry.category === 'PRODUCT') return 'build';
    if (entry.category === 'RISK') return 'risk';
    if (entry.category === 'REVENUE') return 'record';
    return 'launch';
};

export const getStreamingStudioFinanceData = (player: Player, brandHex?: string): StudioFinanceData => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const models = {
        four: getStreamingFinanceRoom(player, 4),
        quarter: getStreamingFinanceRoom(player, 13),
        year: getStreamingFinanceRoom(player, 52),
        all: getStreamingFinanceRoom(player, 'ALL'),
    };
    const markets = getStreamingPublicMarkets(player);
    const foundedAt = platform.identity?.foundedAtAbsoluteWeek ?? absoluteWeek;
    const founderYear = Math.max(1, Math.floor(Math.max(0, absoluteWeek - foundedAt) / 52) + 1);
    const acceptedIds = new Set(platform.governance.celebrityInvestors.map((item) => item.candidateId));
    const offer = models.quarter.investorOffers.find((item) => (
        !item.accepted
        && !acceptedIds.has(item.id)
        && platform.founderOwnershipPercent - item.ownershipPercent >= 51
    ));
    const activeLoans = platform.finance.loans.filter((loan) => loan.status !== 'REPAID');
    const latestOperations = platform.weeklyHistory.at(-1)?.operations;
    const investors = platform.finance.equityHolders.map((holder) => ({
        label: holder.holderName,
        pct: holder.ownershipPercent,
        kind: 'investor' as const,
    }));
    const publicFloat = platform.publicCompany.listing
        ? Math.max(0, 100 - platform.founderOwnershipPercent - investors.reduce((sum, item) => sum + item.pct, 0))
        : 0;
    const ownership: StudioFinanceData['capital']['ownership'] = [
        { label: 'Founder', pct: platform.founderOwnershipPercent, kind: 'founder' },
        ...investors,
        ...(publicFloat > 0 ? [{ label: 'Public float', pct: publicFloat, kind: 'public' as const }] : []),
    ];

    return {
        company: {
            name: platform.identity?.name || 'EMPIRE+',
            year: founderYear,
            week: absoluteWeek,
            brandHex,
        },
        cash: models.all.treasuryCash,
        weeks: weekPointsFrom(models.all, player),
        events: models.all.ledger
            .filter((entry) => entry.source !== 'OPERATIONS')
            .slice(0, 24)
            .map((entry) => ({ week: entry.absoluteWeek, kind: eventKind(entry), label: entry.label })),
        transactions: transactionsFrom(models.all),
        ...cutFrom(models.all, player),
        windows: {
            '4W': cutFrom(models.four, player),
            QUARTER: cutFrom(models.quarter, player),
            YEAR: cutFrom(models.year, player),
        },
        capital: {
            founderPersonalCash: models.all.personalCash,
            ownership,
            valuation: markets.valuation,
            debt: {
                outstanding: models.all.companyDebt,
                weeklyPayment: latestOperations?.financingCost
                    ?? activeLoans.reduce((sum, loan) => sum + Math.round(loan.outstandingPrincipal * loan.weeklyInterestRate), 0),
                facilities: activeLoans.length,
            },
            cfoHired: models.all.hasCfo,
            equityOffer: offer ? {
                id: offer.id,
                investor: offer.name,
                amount: offer.investedCapital,
                valuation: markets.valuation,
                dilutionPct: offer.ownershipPercent,
                controlRights: offer.boardSeat ? 'Board seat' : 'Limited rights',
                weeklyObligation: 0,
                conditions: [offer.influenceDemand, offer.caution, `${offer.profitParticipationPercent}% profit participation`],
            } : null,
            ipo: {
                unlocked: markets.canStartRoadshow || markets.lifecycle !== 'PRIVATE',
                requirements: markets.readiness.map((item) => ({
                    label: item.label,
                    met: item.passed,
                    detail: item.passed ? item.value : item.requirement,
                })),
            },
        },
        whatChanged: {
            '4W': models.four.nextAction.detail,
            QUARTER: models.quarter.nextAction.detail,
            YEAR: models.year.nextAction.detail,
            ALL: models.all.nextAction.detail,
        },
    };
};
