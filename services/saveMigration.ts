import { INITIAL_PLAYER, type Message, type NewsItem, type Player, type PortfolioItem, type Relationship, type ScheduledEvent, type Stock, type StockTakeoverCase } from '../types';
import { ensureLifestyleActivityState } from './lifestyleActivities';
import { normalizeNewPlayerTutorialState } from './newPlayerTutorial';
import { createGlobalActorPackNPCs } from './npcLogic';
import {
    getStockOutstandingShares,
    getStockPriceCeiling,
    initializeStocks,
    normalizeStockPrice,
    normalizeStockPriceHistory,
} from './stockLogic';

const SAVE_MIGRATION_VERSION = 15;
const RUNAWAY_STOCK_CASH_CEILING = 10_000_000_000_000;

const clone = <T,>(value: T): T => value === undefined ? value : JSON.parse(JSON.stringify(value));
const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
const clampMoney = (value: number) => Math.max(0, Number.isFinite(value) ? value : 0);
const toArray = <T,>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];
const toMoneySeries = (value: unknown): number[] => toArray<unknown>(value)
    .map(amount => clampMoney(Number(amount)))
    .filter(amount => amount >= 0);
const toObjectSeries = <T,>(value: unknown): T[] => toArray<T>(value)
    .filter(item => item && typeof item === 'object');

type MigratedAwardLike = {
    type?: string;
    year?: number;
    category?: string;
    projectId?: string;
    outcome?: 'WON' | 'NOMINATED';
};

type MigratedAwardHistoryEntry = {
    type?: string;
    year?: number;
    winners?: Array<{
        category?: string;
        projectName?: string;
        isPlayer?: boolean;
    }>;
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
);

const mergeDefaults = <T,>(defaults: T, incoming: unknown): T => {
    if (incoming === undefined || incoming === null) return clone(defaults);

    if (Array.isArray(defaults)) {
        return (Array.isArray(incoming) ? clone(incoming) : clone(defaults)) as T;
    }

    if (isPlainRecord(defaults)) {
        if (!isPlainRecord(incoming)) return clone(defaults);
        const merged: Record<string, unknown> = {};
        Object.entries(defaults).forEach(([key, defaultValue]) => {
            merged[key] = mergeDefaults(defaultValue, incoming[key]);
        });
        Object.entries(incoming).forEach(([key, value]) => {
            if (!(key in merged)) merged[key] = clone(value);
        });
        return merged as T;
    }

    if (typeof defaults === 'number') {
        const numericValue = Number(incoming);
        return (Number.isFinite(numericValue) ? numericValue : defaults) as T;
    }

    if (typeof defaults === 'string') {
        return (typeof incoming === 'string' ? incoming : defaults) as T;
    }

    if (typeof defaults === 'boolean') {
        return (typeof incoming === 'boolean' ? incoming : defaults) as T;
    }

    return clone(incoming) as T;
};

const readTimingNumber = (...values: unknown[]): number | undefined => {
    for (const value of values) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
};

const timingFromAbsoluteWeek = (absoluteWeek: number) => ({
    releaseYear: Math.floor(Math.max(0, Math.floor(absoluteWeek)) / 52) + 1,
    releaseWeek: (Math.max(0, Math.floor(absoluteWeek)) % 52) + 1
});

const migratePastProjectReleaseTiming = (project: any) => {
    const hiddenStats = project?.hiddenStats || {};
    let releasedAtAbsoluteWeek = readTimingNumber(project?.releasedAtAbsoluteWeek, hiddenStats.releasedAtAbsoluteWeek);
    let releaseYear = readTimingNumber(project?.releaseYear, project?.year, hiddenStats.releaseYear);
    let releaseWeek = readTimingNumber(project?.releaseWeek, hiddenStats.releaseWeek);

    if (releasedAtAbsoluteWeek !== undefined) {
        const absoluteTiming = timingFromAbsoluteWeek(releasedAtAbsoluteWeek);
        releaseYear = releaseYear ?? absoluteTiming.releaseYear;
        releaseWeek = releaseWeek ?? absoluteTiming.releaseWeek;
    }

    return {
        releaseYear: Math.max(1, Math.round(releaseYear || 18)),
        releaseWeek: releaseWeek !== undefined && releaseWeek >= 1 && releaseWeek <= 52
            ? Math.round(releaseWeek)
            : undefined,
        releasedAtAbsoluteWeek: releasedAtAbsoluteWeek !== undefined
            ? Math.max(0, Math.round(releasedAtAbsoluteWeek))
            : undefined
    };
};

const shouldReplaceMigratedAward = (existing: MigratedAwardLike, candidate: MigratedAwardLike): boolean => {
    const existingYear = Math.max(1, Math.round(Number(existing.year || 0)));
    const candidateYear = Math.max(1, Math.round(Number(candidate.year || 0)));
    if (candidateYear < existingYear) return true;
    if (candidateYear > existingYear) return false;
    return existing.outcome !== 'WON' && candidate.outcome === 'WON';
};

const sanitizeMigratedAwardRecords = <T extends MigratedAwardLike>(awards: T[] = []): T[] => {
    const byProject = new Map<string, T>();
    awards.forEach(award => {
        const key = `${award.type || 'UNKNOWN'}::${award.category || 'UNKNOWN'}::${award.projectId || 'UNKNOWN'}`;
        const existing = byProject.get(key);
        if (!existing || shouldReplaceMigratedAward(existing, award)) byProject.set(key, award);
    });

    const bySeason = new Map<string, T[]>();
    Array.from(byProject.values()).forEach(award => {
        const key = `${award.type || 'UNKNOWN'}::${Math.max(1, Math.round(Number(award.year || 0)))}::${award.category || 'UNKNOWN'}`;
        if (!bySeason.has(key)) bySeason.set(key, []);
        bySeason.get(key)!.push(award);
    });

    return Array.from(bySeason.values()).flatMap(categoryAwards => {
        const wins = categoryAwards.filter(award => award.outcome === 'WON');
        if (wins.length <= 1) return categoryAwards;
        const keepWon = wins.sort((a, b) => String(a.projectId || '').localeCompare(String(b.projectId || '')))[0];
        return categoryAwards.map(award => award === keepWon ? award : { ...award, outcome: 'NOMINATED' as const });
    });
};

const sanitizeMigratedAwardHistory = <T extends MigratedAwardHistoryEntry>(entries: T[] = []): T[] => {
    const seenPlayerWinners = new Set<string>();
    const droppedWinnerKeys = new Set<string>();
    entries
        .map((entry, index) => ({ entry, index }))
        .sort((a, b) => (Number(a.entry.year || 0) - Number(b.entry.year || 0)) || (a.index - b.index))
        .forEach(({ entry, index }) => {
            toObjectSeries<NonNullable<MigratedAwardHistoryEntry['winners']>[number]>(entry.winners).forEach((winner, winnerIndex) => {
                if (!winner.isPlayer) return;
                const winnerKey = `${entry.type || 'UNKNOWN'}::${winner.category || 'UNKNOWN'}::${winner.projectName || 'UNKNOWN'}`;
                if (seenPlayerWinners.has(winnerKey)) {
                    droppedWinnerKeys.add(`${index}::${winnerIndex}`);
                    return;
                }
                seenPlayerWinners.add(winnerKey);
            });
        });

    return entries.map((entry, index) => ({
        ...entry,
        winners: toObjectSeries<NonNullable<MigratedAwardHistoryEntry['winners']>[number]>(entry.winners)
            .filter((_, winnerIndex) => !droppedWinnerKeys.has(`${index}::${winnerIndex}`))
    }));
};

const normalizeEpisodeRatings = (value: unknown) => toObjectSeries<any>(value)
    .map((season, index) => {
        const episodes = toObjectSeries<any>(season.episodes)
            .map((episode, episodeIndex) => ({
                episode: Math.max(1, Math.round(Number(episode.episode || episodeIndex + 1))),
                rating: Math.round(clamp(Number(episode.rating || 0), 1, 10) * 10) / 10,
            }))
            .slice(0, 24);
        const averageRating = episodes.length
            ? Math.round((episodes.reduce((sum, item) => sum + item.rating, 0) / episodes.length) * 10) / 10
            : 0;
        const verdict = ['AWESOME', 'GREAT', 'GOOD', 'REGULAR', 'BAD', 'GARBAGE'].includes(String(season.verdict))
            ? season.verdict
            : averageRating >= 9.2 ? 'AWESOME' : averageRating >= 8.2 ? 'GREAT' : averageRating >= 7 ? 'GOOD' : averageRating >= 5.8 ? 'REGULAR' : averageRating >= 4.5 ? 'BAD' : 'GARBAGE';
        return {
            season: Math.max(1, Math.round(Number(season.season || index + 1))),
            episodes,
            averageRating,
            verdict,
        };
    })
    .filter(season => season.episodes.length > 0)
    .slice(0, 20);

const normalizeSoundtrackBreakdown = (value: any) => {
    const base = value && typeof value === 'object' ? value : {};
    const albumRevenue = clampMoney(Number(base.albumRevenue || 0));
    const leadSingleRevenue = clampMoney(Number(base.leadSingleRevenue || 0));
    const musicVideoRevenue = clampMoney(Number(base.musicVideoRevenue || 0));
    const streamingBuzzRevenue = clampMoney(Number(base.streamingBuzzRevenue || 0));
    const viralSongRevenue = clampMoney(Number(base.viralSongRevenue || 0));
    return {
        albumRevenue,
        leadSingleRevenue,
        musicVideoRevenue,
        streamingBuzzRevenue,
        viralSongRevenue,
        totalRevenue: clampMoney(Number(base.totalRevenue || albumRevenue + leadSingleRevenue + musicVideoRevenue + streamingBuzzRevenue + viralSongRevenue))
    };
};

const VALID_TAKEOVER_STATUS = new Set(['ACTIVE', 'READY_FOR_CONTROL', 'RIVAL_DEFENCE', 'CONTROLLED', 'FAILED']);
const VALID_TAKEOVER_ROUTE = new Set(['FRIENDLY_TAKEOVER', 'SHAREHOLDER_ALLIANCE', 'HOSTILE_TAKEOVER', 'CONTROL_TRANSFER']);
const VALID_RELATIONS = new Set(['Parent', 'Friend', 'Partner', 'Spouse', 'Ex-Partner', 'Ex-Spouse', 'Child', 'Pet', 'Connection', 'Agent', 'Director', 'Manager', 'Colleague', 'Networking', 'Deceased Parent', 'Sibling']);

const dedupeByKey = <T,>(items: T[], getKey: (item: T, index: number) => string): T[] => {
    const seen = new Set<string>();
    return items.filter((item, index) => {
        const key = getKey(item, index);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

const normalizeStock = (stock: Partial<Stock>, fallback?: Stock): Stock => {
    const base = fallback || stock;
    const id = String(stock.id || base.id || 'stock_unknown');
    const volatility = Math.max(0, Math.min(0.2, Number(stock.volatility ?? base.volatility ?? 0.02)));
    const dividendYield = Math.max(0, Math.min(0.2, Number(stock.dividendYield ?? base.dividendYield ?? 0)));
    const normalized: Stock = {
        ...(base as Stock),
        ...(stock as Stock),
        id,
        symbol: String(stock.symbol || base.symbol || id.toUpperCase()),
        name: String(stock.name || base.name || stock.symbol || id),
        sector: (stock.sector || base.sector || 'TECH') as Stock['sector'],
        price: 0.01,
        volatility,
        dividendYield,
        outstandingShares: Math.max(1, Math.round(Number(stock.outstandingShares || 0))),
        priceHistory: [],
        lastDividendPayoutWeek: Math.max(0, Math.round(Number(stock.lastDividendPayoutWeek || 0))),
        publicFloatPercent: stock.publicFloatPercent === undefined && base.publicFloatPercent === undefined
            ? undefined
            : clamp(Number(stock.publicFloatPercent ?? base.publicFloatPercent), 1, 100),
        relatedBrandName: stock.relatedBrandName || base.relatedBrandName,
        relatedStudioId: stock.relatedStudioId || base.relatedStudioId,
        lastShareIssueWeek: stock.lastShareIssueWeek === undefined ? base.lastShareIssueWeek : Math.max(0, Math.round(Number(stock.lastShareIssueWeek || 0))),
    };
    normalized.outstandingShares = getStockOutstandingShares(normalized);
    normalized.price = normalizeStockPrice(normalized, Number(stock.price ?? base.price ?? 1));
    normalized.priceHistory = normalizeStockPriceHistory({
        ...normalized,
        priceHistory: toArray<number>(stock.priceHistory).length
            ? toArray<number>(stock.priceHistory)
            : toArray<number>(base.priceHistory),
    });
    return normalized;
};

export const migrateStocksForSave = (stocks: Partial<Stock>[] | undefined): Stock[] => {
    const defaults = initializeStocks();
    const byId = new Map(defaults.map(stock => [stock.id, stock]));
    const migrated = toArray<Partial<Stock>>(stocks).map(stock => normalizeStock(stock, byId.get(String(stock.id || ''))));
    const existingIds = new Set(migrated.map(stock => stock.id));
    defaults.forEach(stock => {
        if (!existingIds.has(stock.id)) migrated.push(stock);
    });
    return dedupeByKey(migrated, stock => stock.id);
};

const migratePortfolio = (portfolio: Partial<PortfolioItem>[] | undefined, stocks: Stock[]): PortfolioItem[] => {
    const stockIds = new Set(stocks.map(stock => stock.id));
    return dedupeByKey(toArray<Partial<PortfolioItem>>(portfolio)
        .filter(position => stockIds.has(String(position.stockId || '')))
        .map(position => {
            const stock = stocks.find(candidate => candidate.id === position.stockId);
            const outstandingShares = stock ? getStockOutstandingShares(stock) : 0;
            const shares = Math.min(outstandingShares, Math.max(0, Math.floor(Number(position.shares || 0))));
            const averageCost = Math.max(0, Number(position.averageCost || stock?.price || 0));
            const rawTotalInvested = Math.max(0, Number(position.totalInvested ?? (shares * averageCost)));
            const totalInvested = Math.min(rawTotalInvested, shares * Math.max(averageCost, stock?.price || 0));
            return {
                stockId: String(position.stockId),
                shares,
                averageCost,
                totalInvested,
            };
        })
        .filter(position => position.shares > 0), position => position.stockId);
};

const migrateTakeovers = (takeovers: Partial<StockTakeoverCase>[] | undefined, stocks: Stock[], player: Player): StockTakeoverCase[] => {
    const stockById = new Map(stocks.map(stock => [stock.id, stock]));
    return dedupeByKey(toArray<Partial<StockTakeoverCase>>(takeovers)
        .filter(takeover => stockById.has(String(takeover.stockId || '')))
        .map((takeover, index) => {
            const stock = stockById.get(String(takeover.stockId))!;
            const ownershipPercent = clamp(Number(takeover.ownershipPercent || 0));
            const alliedSupportPercent = clamp(Number(takeover.alliedSupportPercent || 0));
            const effectiveControlPercent = clamp(Number(takeover.effectiveControlPercent ?? (ownershipPercent + alliedSupportPercent)));
            return {
                id: String(takeover.id || `takeover_${stock.id}_${index}`),
                stockId: stock.id,
                stockSymbol: String(takeover.stockSymbol || stock.symbol),
                companyName: String(takeover.companyName || stock.name),
                relatedStudioId: takeover.relatedStudioId || stock.relatedStudioId,
                route: VALID_TAKEOVER_ROUTE.has(String(takeover.route)) ? takeover.route as StockTakeoverCase['route'] : 'CONTROL_TRANSFER',
                status: VALID_TAKEOVER_STATUS.has(String(takeover.status)) ? takeover.status as StockTakeoverCase['status'] : 'ACTIVE',
                ownershipPercent,
                alliedSupportPercent,
                effectiveControlPercent,
                supportScore: clamp(Number(takeover.supportScore || effectiveControlPercent)),
                rivalDefenceRisk: clamp(Number(takeover.rivalDefenceRisk || 0)),
                cost: clampMoney(Number(takeover.cost || 0)),
                summary: String(takeover.summary || `${stock.name} stock control route migrated safely.`),
                createdWeek: Math.max(1, Math.round(Number(takeover.createdWeek || player.currentWeek || 1))),
                createdYear: Math.max(1, Math.round(Number(takeover.createdYear || player.age || 18))),
                resolvedWeek: takeover.resolvedWeek === undefined ? undefined : Math.max(1, Math.round(Number(takeover.resolvedWeek || player.currentWeek || 1))),
                resolvedYear: takeover.resolvedYear === undefined ? undefined : Math.max(1, Math.round(Number(takeover.resolvedYear || player.age || 18))),
                acquiredBusinessId: takeover.acquiredBusinessId,
            };
        }), takeover => takeover.id)
        .slice(0, 20);
};

const hasRunawayStockValues = (rawStocks: Partial<Stock>[] | undefined, migratedStocks: Stock[]): boolean => {
    const stockById = new Map(migratedStocks.map(stock => [stock.id, stock]));
    return toArray<Partial<Stock>>(rawStocks).some(stock => {
        if (stock.price === undefined) return false;
        const migrated = stockById.get(String(stock.id || ''));
        if (!migrated) return false;
        const rawPrice = Number(stock.price);
        return !Number.isFinite(rawPrice) || rawPrice > getStockPriceCeiling(migrated) * 1.5;
    });
};

const normalizeMigratedCash = (money: unknown, repairRunawayStockCash: boolean): number => {
    const safeMoney = Number.isFinite(Number(money)) ? Math.max(0, Number(money)) : INITIAL_PLAYER.money;
    return repairRunawayStockCash ? Math.min(safeMoney, RUNAWAY_STOCK_CASH_CEILING) : safeMoney;
};

const migrateProjectDetails = (details: any) => {
    const next = details && typeof details === 'object' ? { ...details } : {};
    next.hiddenStats = next.hiddenStats && typeof next.hiddenStats === 'object' ? { ...next.hiddenStats } : {};
    next.castList = toObjectSeries(next.castList);
    next.reviews = toObjectSeries(next.reviews);
    next.episodeRatings = normalizeEpisodeRatings(next.episodeRatings);
    next.selectedLocations = toArray<any>(next.selectedLocations);
    next.releaseRegionIds = toArray<string>(next.releaseRegionIds).map(String);
    next.releaseChainSelections = next.releaseChainSelections && typeof next.releaseChainSelections === 'object' ? next.releaseChainSelections : {};
    next.reservedMarketingBudget = clampMoney(Number(next.reservedMarketingBudget || 0));
    next.marketingBudgetSpent = clampMoney(Number(next.marketingBudgetSpent || 0));
    next.marketingBudgetRemaining = clampMoney(Number(next.marketingBudgetRemaining || 0));
    next.returnedMarketingBudget = clampMoney(Number(next.returnedMarketingBudget || 0));
    next.totalCampaignSpend = clampMoney(Number(next.totalCampaignSpend || 0));
    next.marketingChannelAllocations = next.marketingChannelAllocations && typeof next.marketingChannelAllocations === 'object' ? next.marketingChannelAllocations : undefined;
    next.campaignFitSnapshot = next.campaignFitSnapshot && typeof next.campaignFitSnapshot === 'object' ? next.campaignFitSnapshot : undefined;
    next.campaignForecastSnapshot = next.campaignForecastSnapshot && typeof next.campaignForecastSnapshot === 'object' ? next.campaignForecastSnapshot : undefined;
    next.campaignRealitySnapshot = next.campaignRealitySnapshot && typeof next.campaignRealitySnapshot === 'object' ? next.campaignRealitySnapshot : undefined;
    next.audienceReception = next.audienceReception && typeof next.audienceReception === 'object' ? next.audienceReception : undefined;
    return next;
};

const migrateActiveRelease = (release: any): any => {
    const next = release && typeof release === 'object' ? { ...release } : {};
    next.weekNum = Math.max(1, Math.round(Number(next.weekNum || 1)));
    next.weeklyGross = toMoneySeries(next.weeklyGross);
    next.totalGross = clampMoney(Number(next.totalGross || next.weeklyGross.reduce((sum: number, value: number) => sum + value, 0)));
    next.weeklyStudioReceipts = toMoneySeries(next.weeklyStudioReceipts);
    next.totalStudioReceipts = clampMoney(Number(next.totalStudioReceipts || next.weeklyStudioReceipts.reduce((sum: number, value: number) => sum + value, 0)));
    next.weeklyExhibitorReceipts = toMoneySeries(next.weeklyExhibitorReceipts);
    next.totalExhibitorReceipts = clampMoney(Number(next.totalExhibitorReceipts || next.weeklyExhibitorReceipts.reduce((sum: number, value: number) => sum + value, 0)));
    next.weeklyDistributionBreakdowns = toObjectSeries(next.weeklyDistributionBreakdowns);
    next.budget = clampMoney(Number(next.budget || 0));
    next.productionPerformance = clamp(Number(next.productionPerformance ?? 50));
    next.promotionalBuzz = clamp(Number(next.promotionalBuzz || 0));
    next.streamingRevenue = clampMoney(Number(next.streamingRevenue || 0));
    next.weeklyStreamingBreakdowns = toObjectSeries(next.weeklyStreamingBreakdowns);
    next.soundtrackRevenue = clampMoney(Number(next.soundtrackRevenue || 0));
    next.weeklySoundtrackRevenue = toMoneySeries(next.weeklySoundtrackRevenue);
    next.soundtrackRevenueBreakdown = normalizeSoundtrackBreakdown(next.soundtrackRevenueBreakdown);
    next.weeklySoundtrackBreakdowns = toObjectSeries(next.weeklySoundtrackBreakdowns).map(normalizeSoundtrackBreakdown);
    next.generatedNewsKeys = toArray<string>(next.generatedNewsKeys).map(String);
    next.projectDetails = migrateProjectDetails(next.projectDetails);
    next.audienceReception = next.audienceReception && typeof next.audienceReception === 'object'
        ? next.audienceReception
        : next.projectDetails?.audienceReception;
    next.streaming = next.streaming && typeof next.streaming === 'object'
        ? {
            ...next.streaming,
            weekOnPlatform: Math.max(1, Math.round(Number(next.streaming.weekOnPlatform || 1))),
            totalViews: clampMoney(Number(next.streaming.totalViews || 0)),
            weeklyViews: toMoneySeries(next.streaming.weeklyViews),
            isLeaving: Boolean(next.streaming.isLeaving),
        }
        : next.streaming;
    next.bids = toObjectSeries(next.bids).map((bid: any) => ({
        ...bid,
        upfront: clampMoney(Number(bid?.upfront || 0)),
        fundingAmount: bid?.fundingAmount === undefined ? undefined : clampMoney(Number(bid.fundingAmount || 0)),
        royalty: clamp(Number(bid?.royalty || 0), 0, 100),
        duration: Math.max(1, Math.round(Number(bid?.duration || 52))),
    }));
    return next;
};

const migratePastProject = (project: any, index: number): any => {
    const next = project && typeof project === 'object' ? { ...project } : {};
    const releaseTiming = migratePastProjectReleaseTiming(next);
    next.id = String(next.id || `past_project_${index}`);
    next.name = String(next.name || 'Untitled Project');
    next.type = 'ACTING_GIG';
    next.year = releaseTiming.releaseYear;
    next.releaseYear = releaseTiming.releaseYear;
    if (releaseTiming.releaseWeek !== undefined) next.releaseWeek = releaseTiming.releaseWeek;
    if (releaseTiming.releasedAtAbsoluteWeek !== undefined) next.releasedAtAbsoluteWeek = releaseTiming.releasedAtAbsoluteWeek;
    next.earnings = clampMoney(Number(next.earnings || 0));
    next.rating = clamp(Number(next.rating || next.imdbRating || 0), 0, 10);
    next.reception = String(next.reception || 'FINISHED');
    next.projectQuality = clamp(Number(next.projectQuality ?? 50));
    next.boxOfficeResult = String(next.boxOfficeResult || `$${(clampMoney(Number(next.gross || 0)) / 1000000).toFixed(1)}M`);
    next.futurePotential = next.futurePotential && typeof next.futurePotential === 'object'
        ? next.futurePotential
        : {
            sequelChance: 0,
            franchiseChance: 0,
            rebootChance: 0,
            renewalChance: 0,
            isFranchiseStarter: false,
            isSequelGreenlit: false,
            isRenewed: false,
            seriesStatus: 'N/A',
        };
    next.totalViews = clampMoney(Number(next.totalViews || 0));
    next.weeklyViews = toMoneySeries(next.weeklyViews);
    next.streamingRevenue = clampMoney(Number(next.streamingRevenue || 0));
    next.weeklyStreamingBreakdowns = toObjectSeries(next.weeklyStreamingBreakdowns);
    next.soundtrackRevenue = clampMoney(Number(next.soundtrackRevenue || 0));
    next.weeklySoundtrackRevenue = toMoneySeries(next.weeklySoundtrackRevenue);
    next.soundtrackRevenueBreakdown = normalizeSoundtrackBreakdown(next.soundtrackRevenueBreakdown);
    next.weeklySoundtrackBreakdowns = toObjectSeries(next.weeklySoundtrackBreakdowns).map(normalizeSoundtrackBreakdown);
    next.castList = toObjectSeries(next.castList);
    next.reviews = toObjectSeries(next.reviews);
    next.episodeRatings = normalizeEpisodeRatings(next.episodeRatings);
    next.campaignRealitySnapshot = next.campaignRealitySnapshot && typeof next.campaignRealitySnapshot === 'object' ? next.campaignRealitySnapshot : undefined;
    next.campaignFitSnapshot = next.campaignFitSnapshot && typeof next.campaignFitSnapshot === 'object' ? next.campaignFitSnapshot : undefined;
    next.campaignForecastSnapshot = next.campaignForecastSnapshot && typeof next.campaignForecastSnapshot === 'object' ? next.campaignForecastSnapshot : undefined;
    next.audienceReception = next.audienceReception && typeof next.audienceReception === 'object' ? next.audienceReception : undefined;
    next.marketingChannelAllocations = next.marketingChannelAllocations && typeof next.marketingChannelAllocations === 'object' ? next.marketingChannelAllocations : undefined;
    next.reservedMarketingBudget = clampMoney(Number(next.reservedMarketingBudget || 0));
    next.marketingBudgetSpent = clampMoney(Number(next.marketingBudgetSpent || 0));
    next.marketingBudgetRemaining = clampMoney(Number(next.marketingBudgetRemaining || 0));
    next.returnedMarketingBudget = clampMoney(Number(next.returnedMarketingBudget || 0));
    next.totalCampaignSpend = clampMoney(Number(next.totalCampaignSpend || 0));
    next.budget = clampMoney(Number(next.budget || 0));
    next.gross = clampMoney(Number(next.gross || 0));
    next.weeklyGross = toMoneySeries(next.weeklyGross);
    next.weeklyStudioReceipts = toMoneySeries(next.weeklyStudioReceipts);
    next.totalStudioReceipts = clampMoney(Number(next.totalStudioReceipts || next.weeklyStudioReceipts.reduce((sum: number, value: number) => sum + value, 0)));
    next.weeklyExhibitorReceipts = toMoneySeries(next.weeklyExhibitorReceipts);
    next.totalExhibitorReceipts = clampMoney(Number(next.totalExhibitorReceipts || next.weeklyExhibitorReceipts.reduce((sum: number, value: number) => sum + value, 0)));
    next.weeklyDistributionBreakdowns = toObjectSeries(next.weeklyDistributionBreakdowns);
    next.releaseRegionIds = toArray<string>(next.releaseRegionIds).map(String);
    next.releaseChainSelections = next.releaseChainSelections && typeof next.releaseChainSelections === 'object' ? next.releaseChainSelections : {};
    next.boxOfficeArchiveVersion = Math.max(1, Math.round(Number(next.boxOfficeArchiveVersion || 1)));
    next.awards = sanitizeMigratedAwardRecords(toObjectSeries<MigratedAwardLike>(next.awards));
    return next;
};

const migratePhaseState = (state: any, defaults: Record<string, any>) => {
    const next = { ...defaults, ...(state && typeof state === 'object' ? state : {}) };
    Object.keys(next).forEach(key => {
        if (typeof next[key] === 'number') {
            const isWeekKey = /week|weeks/i.test(key);
            next[key] = isWeekKey ? Math.max(0, Math.round(Number(next[key]) || 0)) : clamp(Number(next[key]));
        }
    });
    return next;
};

const migrateFlags = (flags: any, player: Player) => {
    const nextFlags = flags && typeof flags === 'object' ? { ...flags } : {};
    const previousSaveMigrationVersion = Number(nextFlags.saveMigrationVersion || 0);
    nextFlags.worldReactionState = migratePhaseState(nextFlags.worldReactionState, {
        lastProcessedWeek: 0,
        controlledStudioCount: 0,
        controlledMajorStudioCount: 0,
        antiMonopolyPressure: 0,
        rivalRetaliationRisk: 0,
        employeeDepartureRisk: 0,
        investorConfidence: 0,
        acquisitionDebtPressure: 0,
        valuationPressure: 0,
        franchiseValuePressure: 0,
    });
    nextFlags.regulatorPressureState = migratePhaseState(nextFlags.regulatorPressureState, {
        lastProcessedWeek: 0,
        pressureScore: 0,
        status: 'CLEAR',
        controlledStudioCount: 0,
        controlledMajorStudioCount: 0,
        controlledTakeoverCount: 0,
        acquisitionMoratoriumWeeksRemaining: 0,
        conductAgreementWeeksRemaining: 0,
        acquisitionCostMultiplier: 1,
        investorConfidencePenalty: 0,
        reviewCount: 0,
        finesPaidToDate: 0,
    });
    nextFlags.rivalRetaliationState = migratePhaseState(nextFlags.rivalRetaliationState, {
        lastProcessedWeek: 0,
        retaliationScore: 0,
        activeCounterBidCount: 0,
        negativePressHeat: 0,
        dealChallengeWeeksRemaining: 0,
        defensiveAllianceCount: 0,
        pressureShieldWeeksRemaining: 0,
        actions: [],
    });
    nextFlags.acquisitionMarketPulseState = {
        lastProcessedWeek: Math.max(0, Math.round(Number(nextFlags.acquisitionMarketPulseState?.lastProcessedWeek || 0))),
        marketMood: nextFlags.acquisitionMarketPulseState?.marketMood || 'CONFIDENT',
        acquisitionStoryCount: Math.max(0, Math.round(Number(nextFlags.acquisitionMarketPulseState?.acquisitionStoryCount || 0))),
        fanSentiment: Math.max(-100, Math.min(100, Number(nextFlags.acquisitionMarketPulseState?.fanSentiment || 0))),
        investorConfidenceDelta: Math.max(-100, Math.min(100, Number(nextFlags.acquisitionMarketPulseState?.investorConfidenceDelta || 0))),
        franchiseValueDelta: Math.max(-100, Math.min(100, Number(nextFlags.acquisitionMarketPulseState?.franchiseValueDelta || 0))),
        processedCaseIds: toArray<string>(nextFlags.acquisitionMarketPulseState?.processedCaseIds).map(String),
        lastHeadlineIds: toArray<string>(nextFlags.acquisitionMarketPulseState?.lastHeadlineIds).map(String),
    };
    nextFlags.acquisitionDebtLedger = toArray<any>(nextFlags.acquisitionDebtLedger).map((entry, index) => ({
        ...entry,
        id: String(entry?.id || `debt_${index}`),
        studioId: String(entry?.studioId || 'UNKNOWN_STUDIO'),
        studioName: String(entry?.studioName || 'Unknown Studio'),
        originalPrincipal: clampMoney(Number(entry?.originalPrincipal || 0)),
        remainingPrincipal: clampMoney(Number(entry?.remainingPrincipal || 0)),
        annualInterestRate: Math.max(0, Math.min(0.5, Number(entry?.annualInterestRate || 0))),
        status: entry?.status === 'PAID_OFF' || entry?.status === 'DEFAULTED' ? entry.status : 'ACTIVE',
    }));
    const enabledGlobalActorPacks = toArray<string>(nextFlags.enabledGlobalActorPacks).map(String);
    if (enabledGlobalActorPacks.length > 0) {
        const existingExtraNPCs = toObjectSeries<any>(nextFlags.extraNPCs);
        const existingKeys = new Set([
            ...existingExtraNPCs.map(npc => String(npc.id || '')),
            ...existingExtraNPCs.map(npc => String(npc.name || '')),
        ]);
        const packNPCs = enabledGlobalActorPacks.flatMap(packId => createGlobalActorPackNPCs(packId));
        const missingPackNPCs = packNPCs.filter(npc => {
            const id = String(npc.id || '');
            const name = String(npc.name || '');
            if (existingKeys.has(id) || existingKeys.has(name)) return false;
            existingKeys.add(id);
            existingKeys.add(name);
            return true;
        });
        nextFlags.enabledGlobalActorPacks = enabledGlobalActorPacks;
        nextFlags.extraNPCs = [...existingExtraNPCs, ...missingPackNPCs];
    }
    if (!Array.isArray(nextFlags.studioAcquisitionCases)) nextFlags.studioAcquisitionCases = [];
    if (!nextFlags.stockTakeoverEventDismissals || typeof nextFlags.stockTakeoverEventDismissals !== 'object') nextFlags.stockTakeoverEventDismissals = {};
    const tutorialState = normalizeNewPlayerTutorialState(nextFlags.newPlayerTutorial);
    if (tutorialState) nextFlags.newPlayerTutorial = tutorialState;
    if (previousSaveMigrationVersion > 0 && previousSaveMigrationVersion !== SAVE_MIGRATION_VERSION) {
        nextFlags.previousSaveMigrationVersion = previousSaveMigrationVersion;
    }
    nextFlags.saveMigrationVersion = SAVE_MIGRATION_VERSION;
    nextFlags.saveMigratedAtWeek = Math.max(1, Math.round(Number(player.currentWeek || 1)));
    return nextFlags;
};

const dedupePendingEvents = (events: ScheduledEvent[] | undefined): ScheduledEvent[] => (
    dedupeByKey(toArray<ScheduledEvent>(events), (event, index) => {
        const data = event?.data || {};
        return String(event?.id || `${event?.type || 'EVENT'}:${data.stockDecisionType || data.regulatorPressureEventType || data.rivalRetaliationEventType || data.talentInstabilityEventType || data.worldReactionEventType || data.stockId || index}`);
    }).slice(0, 12)
);

const dedupeNews = (news: NewsItem[] | undefined): NewsItem[] => (
    dedupeByKey(toArray<NewsItem>(news), (item, index) => String(item?.id || `${item?.headline || 'news'}:${item?.week || 0}:${index}`)).slice(0, 80)
);

const shouldRemoveEpisodeRatingsReportMessage = (message: Message): boolean => (
    message.data?.kind === 'EPISODE_RATINGS_REPORT'
    || (message.sender === 'Studio Analytics' && String(message.subject || '').startsWith('Episode Scorecard:'))
);

const migrateInbox = (inbox: Message[] | undefined): Message[] => (
    toObjectSeries<Message>(inbox)
        .filter(message => !shouldRemoveEpisodeRatingsReportMessage(message))
        .slice(0, 120)
);

const normalizeRelationship = (relationship: any, index: number): Relationship => {
    const fallback = INITIAL_PLAYER.relationships.find(item => item.id === relationship?.id)
        || INITIAL_PLAYER.relationships[index]
        || INITIAL_PLAYER.relationships[0];
    const next = mergeDefaults(fallback, relationship) as Relationship;
    next.id = String(next.id || fallback.id || `rel_${index}`);
    next.name = String(next.name || fallback.name || 'Connection');
    next.relation = VALID_RELATIONS.has(String(next.relation))
        ? next.relation
        : fallback.relation;
    next.closeness = clamp(Number(next.closeness ?? fallback.closeness));
    next.image = typeof next.image === 'string' && next.image.trim()
        ? next.image
        : fallback.image;
    next.lastInteractionWeek = Math.max(0, Math.round(Number(next.lastInteractionWeek || 0)));
    if (next.lastInteractionAbsolute !== undefined) {
        next.lastInteractionAbsolute = Math.max(0, Math.round(Number(next.lastInteractionAbsolute || 0)));
    }
    if (next.age !== undefined) {
        next.age = Math.max(0, Math.round(Number(next.age || 0)));
    }
    if (next.birthWeekAbsolute !== undefined) {
        next.birthWeekAbsolute = Math.max(0, Math.round(Number(next.birthWeekAbsolute || 0)));
    }
    return next;
};

export const migratePlayerSave = (input: Partial<Player> | Player): Player => {
    const base: Player = mergeDefaults(INITIAL_PLAYER, input);
    const stocks = migrateStocksForSave(base.stocks as Partial<Stock>[] | undefined);
    const repairRunawayStockCash = hasRunawayStockValues(base.stocks as Partial<Stock>[] | undefined, stocks);
    const playerWithStocks: Player = {
        ...base,
        id: String(base.id || INITIAL_PLAYER.id),
        name: typeof base.name === 'string' && base.name.trim() ? base.name : INITIAL_PLAYER.name,
        age: Math.max(1, Math.round(Number(base.age || INITIAL_PLAYER.age))),
        currentWeek: Math.max(1, Math.round(Number(base.currentWeek || INITIAL_PLAYER.currentWeek))),
        money: normalizeMigratedCash(base.money, repairRunawayStockCash),
        world: {
            ...base.world,
            awardHistory: sanitizeMigratedAwardHistory(toObjectSeries<MigratedAwardHistoryEntry>(base.world?.awardHistory)) as any,
        },
        stocks,
        portfolio: migratePortfolio(base.portfolio as Partial<PortfolioItem>[] | undefined, stocks),
        shareholderVotes: toArray<any>(base.shareholderVotes).filter(vote => stocks.some(stock => stock.id === vote?.stockId)).slice(0, 24),
        stockTakeovers: migrateTakeovers(base.stockTakeovers as Partial<StockTakeoverCase>[] | undefined, stocks, base),
        activeReleases: toObjectSeries<any>(base.activeReleases).map(migrateActiveRelease),
        awards: sanitizeMigratedAwardRecords(toObjectSeries<MigratedAwardLike>(base.awards)) as any,
        pastProjects: dedupeByKey(
            toObjectSeries<any>(base.pastProjects).map(migratePastProject),
            project => project.id
        ),
        pendingEvents: dedupePendingEvents(base.pendingEvents),
        news: dedupeNews(base.news),
        inbox: migrateInbox(base.inbox),
        relationships: toObjectSeries<any>(base.relationships).length > 0
            ? toObjectSeries<any>(base.relationships).map(normalizeRelationship)
            : clone(INITIAL_PLAYER.relationships),
        logs: toArray<any>(base.logs).slice(0, 50),
        assetStates: toArray<any>(base.assetStates)
            .filter((state) => typeof state?.assetId === 'string')
            .map((state) => ({
                assetId: state.assetId,
                condition: Math.max(0, Math.min(100, Math.round(Number(state.condition ?? 100)))),
                currentValue: Math.max(0, Math.round(Number(state.currentValue || 0))),
                valueTrend: Number.isFinite(Number(state.valueTrend)) ? Number(state.valueTrend) : 0,
                marketCycle: typeof state.marketCycle === 'string' ? state.marketCycle : undefined,
                neighborhoodTier: typeof state.neighborhoodTier === 'string' ? state.neighborhoodTier : undefined,
                rentDemand: Math.max(0, Math.min(100, Math.round(Number(state.rentDemand || 0)))),
                vacancyChance: Math.max(0, Math.min(1, Number(state.vacancyChance || 0))),
                vacancyWeeks: Math.max(0, Math.round(Number(state.vacancyWeeks || 0))),
                rentalListed: Boolean(state.rentalListed),
                weeklyRent: Math.max(0, Math.round(Number(state.weeklyRent || 0))),
                lifetimeRevenue: Math.max(0, Math.round(Number(state.lifetimeRevenue || 0))),
                listedWeek: Math.max(0, Math.round(Number(state.listedWeek || 0))),
                lastMaintainedWeek: Math.max(0, Math.round(Number(state.lastMaintainedWeek || 0))),
            })),
        activeVehicleId: typeof base.activeVehicleId === 'string' ? base.activeVehicleId : null,
        lifestyleActivities: ensureLifestyleActivityState(base.lifestyleActivities),
        activeHealthConditions: toArray<any>(base.activeHealthConditions).slice(0, 6),
    };
    return {
        ...playerWithStocks,
        flags: migrateFlags(base.flags, playerWithStocks),
    };
};
