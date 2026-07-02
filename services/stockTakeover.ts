import type {
    Business,
    BusinessStaff,
    NewsItem,
    Player,
    ScheduledEvent,
    Stock,
    StockTakeoverCase,
    StockTakeoverRoute,
} from '../types';
import { createDefaultStudioState } from './businessLogic';
import { getEntertainmentStockSnapshot } from './entertainmentStockMarket';
import { getStockOutstandingShares, getStockOwnershipPercent } from './stockLogic';
import { isStreamingPlatformStudio } from './studioClassification';

export interface StockTakeoverSnapshot {
    stockId: string;
    ownershipPercent: number;
    alliedSupportPercent: number;
    effectiveControlPercent: number;
    availableRoutes: StockTakeoverRoute[];
    activeCase?: StockTakeoverCase;
    canTransferControl: boolean;
    nextUnlockLabel: string;
}

export interface StockTakeoverResult {
    success: boolean;
    player: Player;
    case?: StockTakeoverCase;
    acquiredBusiness?: Business;
    reason?:
        | 'STOCK_NOT_FOUND'
        | 'NOT_ENTERTAINMENT_STUDIO'
        | 'ROUTE_LOCKED'
        | 'INSUFFICIENT_CASH'
        | 'ALREADY_CONTROLLED'
        | 'CONTROL_NOT_READY'
        | 'STREAMING_PLATFORM_RESERVED';
}

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const roundPercent = (value: number) => Math.round(value * 100) / 100;

const getMarketCap = (stock: Stock) => Math.max(0, stock.price || 0) * getStockOutstandingShares(stock);

const getHoldingShares = (player: Pick<Player, 'portfolio'>, stockId: string) => (
    Math.max(0, player.portfolio.find(item => item.stockId === stockId)?.shares || 0)
);

const getExistingTakeovers = (player: Pick<Player, 'stockTakeovers'>): StockTakeoverCase[] => (
    Array.isArray(player.stockTakeovers) ? player.stockTakeovers : []
);

const getActiveCase = (player: Pick<Player, 'stockTakeovers'>, stockId: string) => (
    getExistingTakeovers(player)
        .filter(entry => entry.stockId === stockId)
        .sort((a, b) => b.createdWeek - a.createdWeek)[0]
);

const getAvailableRoutes = (
    ownershipPercent: number,
    effectiveControlPercent: number,
    stock: Stock,
): StockTakeoverRoute[] => {
    if (!stock.relatedStudioId) return [];
    if (isStreamingPlatformStudio({ id: stock.relatedStudioId })) return [];
    const routes: StockTakeoverRoute[] = [];
    if (ownershipPercent >= 20) routes.push('SHAREHOLDER_ALLIANCE');
    if (ownershipPercent >= 30) routes.push('FRIENDLY_TAKEOVER', 'HOSTILE_TAKEOVER');
    if (ownershipPercent >= 51 || effectiveControlPercent >= 51) routes.push('CONTROL_TRANSFER');
    return routes;
};

const getNextUnlockLabel = (ownershipPercent: number, effectiveControlPercent: number) => {
    if (effectiveControlPercent >= 51) return 'Control Transfer ready';
    if (ownershipPercent < 20) return '20% unlocks Shareholder Alliance';
    if (ownershipPercent < 30) return '30% unlocks Friendly and Hostile Takeover';
    if (ownershipPercent < 51) return '51% effective control unlocks Control Transfer';
    return 'Control Transfer ready';
};

export const getStockTakeoverSnapshot = (
    player: Player,
    stock: Stock,
): StockTakeoverSnapshot => {
    const holdingShares = getHoldingShares(player, stock.id);
    const ownershipPercent = getStockOwnershipPercent(holdingShares, stock);
    const activeCase = getActiveCase(player, stock.id);
    const alliedSupportPercent = roundPercent(activeCase?.status === 'CONTROLLED' ? 0 : activeCase?.alliedSupportPercent || 0);
    const effectiveControlPercent = roundPercent(Math.min(100, ownershipPercent + alliedSupportPercent));
    const availableRoutes = getAvailableRoutes(ownershipPercent, effectiveControlPercent, stock);
    const reservedPlatform = isStreamingPlatformStudio({ id: stock.relatedStudioId });
    return {
        stockId: stock.id,
        ownershipPercent,
        alliedSupportPercent,
        effectiveControlPercent,
        availableRoutes,
        activeCase,
        canTransferControl: availableRoutes.includes('CONTROL_TRANSFER'),
        nextUnlockLabel: reservedPlatform ? 'Streaming Phase acquisition later' : getNextUnlockLabel(ownershipPercent, effectiveControlPercent),
    };
};

const getRouteCost = (route: StockTakeoverRoute, stock: Stock) => {
    const marketCap = getMarketCap(stock);
    if (route === 'SHAREHOLDER_ALLIANCE') return Math.round(marketCap * 0.002);
    if (route === 'FRIENDLY_TAKEOVER') return Math.round(marketCap * 0.004);
    if (route === 'HOSTILE_TAKEOVER') return Math.round(marketCap * 0.006);
    return Math.round(marketCap * 0.001);
};

const getSupportAndRisk = (
    player: Player,
    stock: Stock,
    route: StockTakeoverRoute,
    ownershipPercent: number,
) => {
    const snapshot = getEntertainmentStockSnapshot(player, stock);
    const reputation = Math.max(0, player.stats.reputation || 0);
    const baseSupport = ownershipPercent + (reputation * 0.08) + (snapshot.momentumScore * 0.08);
    const routeSupport = route === 'FRIENDLY_TAKEOVER'
        ? 16
        : route === 'SHAREHOLDER_ALLIANCE'
            ? 12
            : route === 'HOSTILE_TAKEOVER'
                ? 22
                : 0;
    const alliedSupport = route === 'SHAREHOLDER_ALLIANCE'
        ? clamp(9 + (reputation / 20) + (snapshot.hitRate / 20), 7, 18)
        : route === 'FRIENDLY_TAKEOVER'
            ? clamp(6 + (reputation / 24), 4, 14)
            : route === 'HOSTILE_TAKEOVER'
                ? clamp(10 + (ownershipPercent / 6), 8, 20)
                : 0;
    const rivalDefenceRisk = clamp(
        18
        + (stock.volatility * 420)
        + (route === 'HOSTILE_TAKEOVER' ? 28 : 0)
        + (snapshot.flops > snapshot.hits ? 8 : 0)
        - (ownershipPercent * 0.35)
        - (reputation * 0.08),
        5,
        88,
    );

    return {
        alliedSupport: roundPercent(alliedSupport),
        supportScore: Math.round(clamp(baseSupport + routeSupport, 0, 100)),
        rivalDefenceRisk: Math.round(rivalDefenceRisk),
    };
};

const createTakeoverNews = (
    player: Player,
    takeoverCase: StockTakeoverCase,
): NewsItem => ({
    id: `news_stock_takeover_${takeoverCase.id}`,
    headline: `${player.name} launches ${takeoverCase.companyName} takeover route`,
    subtext: takeoverCase.summary,
    category: 'INDUSTRY',
    week: player.currentWeek,
    year: player.age,
    impactLevel: takeoverCase.status === 'RIVAL_DEFENCE' || takeoverCase.status === 'CONTROLLED' ? 'HIGH' : 'MEDIUM',
});

const persistTakeoverCase = (player: Player, takeoverCase: StockTakeoverCase): Player => ({
    ...player,
    stockTakeovers: [
        takeoverCase,
        ...getExistingTakeovers(player).filter(entry => entry.id !== takeoverCase.id && entry.stockId !== takeoverCase.stockId),
    ].slice(0, 20),
});

const buildStockControlledStudio = (
    player: Player,
    stock: Stock,
): Business => {
    const studioId = stock.relatedStudioId || stock.id;
    const worldStudio = player.world.studios?.[studioId];
    const valuation = Math.max(100_000_000, (worldStudio?.valuation || (getMarketCap(stock) / 1_000_000_000)) * 1_000_000_000);
    const cashReserve = Math.max(10_000_000, (worldStudio?.cashReserve || 500) * 1_000_000);
    const reputation = Math.round(clamp(worldStudio?.reputation || 70, 0, 100));
    const weeklyRevenue = Math.round(valuation * 0.018 / 52);
    const weeklyExpenses = Math.round(weeklyRevenue * 0.72);
    const staff: BusinessStaff[] = [
        {
            id: `${studioId}_stock_takeover_chair`,
            name: 'Transition Chair',
            role: 'Board Integration',
            skill: clamp(reputation + 5, 55, 96),
            salary: 900_000,
            morale: 68,
        },
        {
            id: `${studioId}_stock_takeover_strategy`,
            name: 'Studio Strategy Lead',
            role: 'Corporate Strategy',
            skill: clamp(reputation, 50, 94),
            salary: 750_000,
            morale: 65,
        },
    ];
    const studioState = createDefaultStudioState(player.currentWeek);

    return {
        id: studioId,
        name: worldStudio?.name || stock.name,
        type: 'PRODUCTION_HOUSE',
        subtype: valuation >= 1_000_000_000 ? 'MAJOR_STUDIO' : 'INDIE_STUDIO',
        logo: 'STK',
        color: 'bg-sky-500',
        foundedWeek: player.currentWeek,
        balance: cashReserve,
        isActive: true,
        config: {
            quality: reputation >= 82 ? 'LUXURY' : reputation >= 66 ? 'PREMIUM' : 'STANDARD',
            pricing: 'MARKET',
            marketing: 'MEDIUM',
            marketingBudget: { social: 0, influencer: 0, billboard: 0, tv: 0 },
            theme: worldStudio?.archetype || 'Public Studio',
            productionType: 'Acquired Studio',
            amenities: ['Public market control', 'Shareholder board mandate'],
        },
        stats: {
            weeklyRevenue,
            weeklyExpenses,
            weeklyProfit: weeklyRevenue - weeklyExpenses,
            lifetimeRevenue: 0,
            valuation,
            brandHealth: reputation,
            customerSatisfaction: clamp(reputation - 4, 35, 96),
            riskLevel: clamp(Math.round(stock.volatility * 900), 10, 80),
            hype: clamp(45 + (worldStudio?.recentHits || 0) * 5, 10, 100),
            studioMomentum: clamp(50 + (worldStudio?.recentHits || 0) * 4, 10, 100),
            investorConfidence: clamp(58 + reputation / 4, 20, 100),
            recentHitStreak: worldStudio?.recentHits || 0,
            recentFlopStreak: 0,
            recentReleaseOutcomes: [],
            processedReleaseOutcomeIds: [],
            locations: 1,
        },
        staff,
        products: [],
        hiringPool: [],
        lastHiringRefreshWeek: player.currentWeek,
        history: [{ week: player.currentWeek, profit: weeklyRevenue - weeklyExpenses }],
        studioState: {
            ...studioState,
            acquisitionOrigin: 'STUDIO_ACQUISITION',
            acquiredWeek: player.currentWeek,
            acquiredYear: player.age,
            operatingModel: 'CONTROLLED_SUBSIDIARY',
            operatingModelChangedWeek: player.currentWeek,
            operatingModelChangedYear: player.age,
            financeLedger: [{
                id: `stock_takeover_control_${studioId}_${player.age}_${player.currentWeek}`,
                week: player.currentWeek,
                year: player.age,
                amount: cashReserve,
                type: 'ACQUISITION_MERGER',
                label: `${stock.name} control transferred through public shares`,
            }],
        },
    };
};

export const executeStockTakeoverAction = (
    player: Player,
    stockId: string,
    route: StockTakeoverRoute,
    options: { golden?: boolean } = {},
): StockTakeoverResult => {
    const stock = player.stocks.find(candidate => candidate.id === stockId);
    if (!stock) return { success: false, player, reason: 'STOCK_NOT_FOUND' };
    if (!stock.relatedStudioId || stock.sector !== 'MEDIA') {
        return { success: false, player, reason: 'NOT_ENTERTAINMENT_STUDIO' };
    }
    if (isStreamingPlatformStudio({ id: stock.relatedStudioId })) {
        return { success: false, player, reason: 'STREAMING_PLATFORM_RESERVED' };
    }
    if (player.businesses.some(business => business.id === stock.relatedStudioId)) {
        return { success: false, player, reason: 'ALREADY_CONTROLLED' };
    }

    const snapshot = getStockTakeoverSnapshot(player, stock);
    if (!snapshot.availableRoutes.includes(route)) {
        return { success: false, player, reason: route === 'CONTROL_TRANSFER' ? 'CONTROL_NOT_READY' : 'ROUTE_LOCKED' };
    }

    const cost = options.golden ? Math.round(getRouteCost(route, stock) * 0.35) : getRouteCost(route, stock);
    if (player.money < cost) return { success: false, player, reason: 'INSUFFICIENT_CASH' };

    if (route === 'CONTROL_TRANSFER') {
        const acquiredBusiness = buildStockControlledStudio(player, stock);
        const controlledCase: StockTakeoverCase = {
            id: `takeover_${stock.id}_control_${player.age}_${player.currentWeek}`,
            stockId: stock.id,
            stockSymbol: stock.symbol,
            companyName: stock.name,
            relatedStudioId: stock.relatedStudioId,
            route,
            status: 'CONTROLLED',
            ownershipPercent: snapshot.ownershipPercent,
            alliedSupportPercent: snapshot.alliedSupportPercent,
            effectiveControlPercent: snapshot.effectiveControlPercent,
            supportScore: 100,
            rivalDefenceRisk: 0,
            cost,
            summary: options.golden
                ? `${stock.name} control transferred through a clean advisor-led board transition.`
                : `${stock.name} control transferred into your studio group through public-market ownership.`,
            createdWeek: player.currentWeek,
            createdYear: player.age,
            resolvedWeek: player.currentWeek,
            resolvedYear: player.age,
            acquiredBusinessId: acquiredBusiness.id,
        };
        const withCase = persistTakeoverCase({
            ...player,
            money: player.money - cost,
            businesses: [...player.businesses, acquiredBusiness],
        }, controlledCase);
        const newsItem = createTakeoverNews(player, controlledCase);
        return {
            success: true,
            case: controlledCase,
            acquiredBusiness,
            player: {
                ...withCase,
                news: [newsItem, ...(withCase.news || [])].slice(0, 80),
                logs: [{
                    week: player.currentWeek,
                    year: player.age,
                    message: options.golden
                        ? `Golden Control Transfer: ${stock.name} joined your studio group through a cleaner board process.`
                        : `Control Transfer: ${stock.name} is now part of your studio group.`,
                    type: 'positive' as const,
                }, ...(withCase.logs || [])].slice(0, 50),
            },
        };
    }

    const routeMath = getSupportAndRisk(player, stock, route, snapshot.ownershipPercent);
    const alliedSupportPercent = roundPercent(Math.max(snapshot.alliedSupportPercent, routeMath.alliedSupport));
    const effectiveControlPercent = roundPercent(Math.min(100, snapshot.ownershipPercent + alliedSupportPercent));
    const status = route === 'HOSTILE_TAKEOVER' && routeMath.rivalDefenceRisk >= 45
        ? 'RIVAL_DEFENCE'
        : effectiveControlPercent >= 51
            ? 'READY_FOR_CONTROL'
            : 'ACTIVE';
    const takeoverCase: StockTakeoverCase = {
        id: `takeover_${stock.id}_${route.toLowerCase()}_${player.age}_${player.currentWeek}`,
        stockId: stock.id,
        stockSymbol: stock.symbol,
        companyName: stock.name,
        relatedStudioId: stock.relatedStudioId,
        route,
        status,
        ownershipPercent: snapshot.ownershipPercent,
        alliedSupportPercent,
        effectiveControlPercent,
        supportScore: routeMath.supportScore,
        rivalDefenceRisk: routeMath.rivalDefenceRisk,
        cost,
        summary: status === 'RIVAL_DEFENCE'
            ? `${stock.name}'s board and rival holders are mounting a Rival Defence against your pressure campaign.`
            : effectiveControlPercent >= 51
                ? `${stock.name} shareholder support is ready for a Control Transfer.`
                : `${stock.name} takeover pressure is active with ${effectiveControlPercent.toFixed(2)}% effective support.`,
        createdWeek: player.currentWeek,
        createdYear: player.age,
    };
    const priceImpact = route === 'HOSTILE_TAKEOVER'
        ? 0.045
        : route === 'FRIENDLY_TAKEOVER'
            ? 0.022
            : 0.012;
    const withCase = persistTakeoverCase({
        ...player,
        money: player.money - cost,
        stocks: player.stocks.map(candidate => candidate.id === stock.id
            ? {
                ...candidate,
                price: Number(Math.max(0.01, candidate.price * (1 + priceImpact)).toFixed(2)),
                priceHistory: [...candidate.priceHistory, Math.max(0.01, candidate.price * (1 + priceImpact))].slice(-20),
            }
            : candidate),
    }, takeoverCase);
    const newsItem = createTakeoverNews(player, takeoverCase);

    return {
        success: true,
        case: takeoverCase,
        player: {
            ...withCase,
            news: [newsItem, ...(withCase.news || [])].slice(0, 80),
            logs: [{
                week: player.currentWeek,
                year: player.age,
                message: `${route.replaceAll('_', ' ')}: ${takeoverCase.summary}`,
                type: status === 'RIVAL_DEFENCE' ? 'neutral' as const : 'positive' as const,
            }, ...(withCase.logs || [])].slice(0, 50),
        },
    };
};

const createTakeoverControlEvent = (stock: Stock, snapshot: StockTakeoverSnapshot, player: Player): ScheduledEvent => ({
    id: `event_stock_control_${stock.id}_${player.age}_${player.currentWeek}`,
    week: player.currentWeek,
    type: 'STOCK_CONTROL',
    title: `Majority Control: ${stock.symbol}`,
    description: `Your ${snapshot.effectiveControlPercent.toFixed(2)}% effective control gives you the power to open the acquisition process.`,
    data: {
        stockDecisionType: 'TAKEOVER_CONTROL',
        stockId: stock.id,
        relatedStudioId: stock.relatedStudioId,
        stockSymbol: stock.symbol,
        companyName: stock.name,
        ownershipPercent: snapshot.ownershipPercent,
        alliedSupportPercent: snapshot.alliedSupportPercent,
        effectiveControlPercent: snapshot.effectiveControlPercent,
        routeLabel: 'Public-market control transfer',
        primaryActionLabel: 'Open Acquisition Desk',
    },
});

export const processStockTakeoverEvents = (player: Player): Player => {
    const pendingEvents = Array.isArray(player.pendingEvents) ? player.pendingEvents : [];
    const dismissed = (player.flags || {}).stockTakeoverEventDismissals || {};
    let nextPendingEvents = pendingEvents;

    player.stocks
        .filter(stock => stock.sector === 'MEDIA' && Boolean(stock.relatedStudioId))
        .forEach(stock => {
            if (!stock.relatedStudioId) return;
            if (player.businesses.some(business => business.id === stock.relatedStudioId)) return;
            if (dismissed[stock.id]) return;
            if (nextPendingEvents.some(event => event.data?.stockDecisionType === 'TAKEOVER_CONTROL' && event.data?.stockId === stock.id)) return;
            const snapshot = getStockTakeoverSnapshot(player, stock);
            if (!snapshot.canTransferControl) return;
            nextPendingEvents = [...nextPendingEvents, createTakeoverControlEvent(stock, snapshot, player)].slice(0, 12);
        });

    return nextPendingEvents === pendingEvents
        ? player
        : {
            ...player,
            pendingEvents: nextPendingEvents,
        };
};
