import { INITIAL_PLAYER, type Business, type Message, type NewsItem, type Player, type PortfolioItem, type Relationship, type ScheduledEvent, type Stock, type StockTakeoverCase } from '../types';
import { ensureLifestyleActivityState } from './lifestyleActivities';
import { getAbsoluteWeek, inferStreamingStartWeekAbsolute } from './legacyLogic';
import { normalizeNewPlayerTutorialState } from './newPlayerTutorial';
import { createGlobalActorPackNPCs } from './npcLogic';
import {
    getStockOutstandingShares,
    getStockPriceCeiling,
    initializeStocks,
    normalizeStockPrice,
    normalizeStockPriceHistory,
} from './stockLogic';
import { normalizeCompanyEquityPositions } from './privateEquityLogic';
import { repairAcquiredStudioAssetPortfolios } from './studioAcquisitionAssets';
import {
    ABSOLUTE_THEATRICAL_WEEK_CAP,
    MAX_THEATRICAL_EXTENSION_WEEKS,
} from './theatricalRunLogic';
import { migrateLegacyCharacterIdentity } from './characterIdentityMigration';
import { mergeParentStudioTalentRosters } from './talentRoster';
import { normalizeBackgroundCastingPlan, normalizeLivingEnsembleState } from './livingEnsemble';
import { normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { normalizeIndustryProductions } from './industryProductions';
import { backfillActivePlayerCommitmentTalentBookings } from './talentBookings';
import { normalizeWorldPlatformAi } from './platformAi/platformAiState';
import { normalizePlatformAiPlayerCommissionOffers } from './platformAi/platformAiPlayerCommissions';
import {
    normalizePlatformAiCatalogueDistressDeals,
    reconcilePlatformAiCatalogueDistressDealsForMigration,
} from './platformAi/platformAiDistress';
import {
    normalizePlatformAiExternalCommitments,
    reconcilePlatformAiExternalCommitmentObligations,
} from './platformAi/platformAiExternalCommitments';
import { migrateStreamingRightsContractRegistry } from './streamingRightsCore';
import { normalizeStreamingBiddingSessionRegistry } from './streamingBidding';
import { normalizeStreamingRoyaltySettlementRegistry } from './streamingContractSettlement';
import { normalizeStreamingPlatformEcosystem } from './streamingPlatformEcosystem';
import {
    normalizeStreamingRightsCalendarState,
    normalizeStreamingRightsManagementState,
} from './streamingRightsCalendar';
import { reconstructSignedStreamingCataloguePackages } from './streamingCataloguePackages';

const SAVE_MIGRATION_VERSION = 28;
const RUNAWAY_STOCK_CASH_CEILING = 10_000_000_000_000;
const ACQUISITION_RIVAL_BID_MAX_ROUNDS = 3;

const clone = <T,>(value: T): T => value === undefined ? value : JSON.parse(JSON.stringify(value));
const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
const clampMoney = (value: number) => Math.max(0, Number.isFinite(value) ? value : 0);
const toArray = <T,>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];
const toMoneySeries = (value: unknown): number[] => toArray<unknown>(value)
    .map(amount => clampMoney(Number(amount)))
    .filter(amount => amount >= 0);
const toObjectSeries = <T,>(value: unknown): T[] => toArray<T>(value)
    .filter(item => item && typeof item === 'object');
const normalizeTheatricalExtensionHistory = (value: unknown) => toObjectSeries<any>(value)
    .map(item => ({
        reviewWeek: Math.max(1, Math.round(Number(item.reviewWeek || 1))),
        addedWeeks: Math.max(1, Math.min(2, Math.round(Number(item.addedWeeks || 1)))),
        reason: ['STRONG_HOLD', 'BREAKOUT_DEMAND', 'SLEEPER_MOMENTUM'].includes(String(item.reason))
            ? item.reason
            : 'STRONG_HOLD',
        weeklyGross: clampMoney(Number(item.weeklyGross || 0)),
        holdPercent: Math.max(0, Math.min(200, Math.round(Number(item.holdPercent || 0)))),
        marketDemand: Math.max(72, Math.min(136, Math.round(Number(item.marketDemand || 100)))),
    }))
    .filter((item, index, items) => items.findIndex(candidate => candidate.reviewWeek === item.reviewWeek) === index)
    .slice(-MAX_THEATRICAL_EXTENSION_WEEKS);

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

const isLegacyInflatedMusicAwardCategory = (awardType: string, category: string): boolean => (
    /soundtrack|trailer|music video/i.test(category)
    || (awardType === 'BAFTA' && /original song/i.test(category))
);

const sanitizeMigratedAwardEvent = <T extends ScheduledEvent>(event: T): T => {
    if (event.type !== 'AWARD_CEREMONY') return event;
    const awardType = String(event.data?.awardDef?.type || '');
    const nominations = toObjectSeries<any>(event.data?.nominations)
        .filter(nomination => !isLegacyInflatedMusicAwardCategory(awardType, String(nomination.category || '')));
    const sourceBallot = event.data?.fullBallot && typeof event.data.fullBallot === 'object'
        ? event.data.fullBallot
        : {};
    const fullBallot = Object.fromEntries(
        Object.entries(sourceBallot)
            .filter(([category]) => !isLegacyInflatedMusicAwardCategory(awardType, category))
            .map(([category, entries]) => [
                category,
                toObjectSeries<any>(entries)
                    .filter(nomination => !isLegacyInflatedMusicAwardCategory(
                        awardType,
                        String(nomination.category || category)
                    ))
            ])
    );
    return {
        ...event,
        data: {
            ...event.data,
            nominations,
            fullBallot
        }
    };
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
    awards
    .filter(award => !isLegacyInflatedMusicAwardCategory(String(award.type || ''), String(award.category || '')))
    .forEach(award => {
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
                if (isLegacyInflatedMusicAwardCategory(
                    String(entry.type || ''),
                    String(winner.category || '')
                )) {
                    droppedWinnerKeys.add(`${index}::${winnerIndex}`);
                    return;
                }
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

const migratePortfolio = (
    portfolio: Partial<PortfolioItem>[] | undefined,
    stocks: Stock[],
    rawStocks: Partial<Stock>[] | undefined,
): PortfolioItem[] => {
    const stockIds = new Set(stocks.map(stock => stock.id));
    const rawStockById = new Map(toArray<Partial<Stock>>(rawStocks).map(stock => [String(stock.id || ''), stock]));
    return dedupeByKey(toArray<Partial<PortfolioItem>>(portfolio)
        .filter(position => stockIds.has(String(position.stockId || '')))
        .map(position => {
            const stock = stocks.find(candidate => candidate.id === position.stockId);
            const outstandingShares = stock ? getStockOutstandingShares(stock) : 0;
            const rawStock = rawStockById.get(String(position.stockId || ''));
            const rawOutstandingShares = Math.max(0, Number(rawStock?.outstandingShares || 0));
            const rawShares = Math.max(0, Math.floor(Number(position.shares || 0)));
            const repairedOwnershipShares = rawOutstandingShares > outstandingShares && rawOutstandingShares > 0
                ? Math.round(Math.min(1, rawShares / rawOutstandingShares) * outstandingShares)
                : rawShares;
            const shares = Math.min(outstandingShares, repairedOwnershipShares);
            const rawAverageCost = Math.max(0, Number(position.averageCost || stock?.price || 0));
            const averageCost = stock ? Math.min(rawAverageCost, getStockPriceCeiling(stock)) : rawAverageCost;
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
    if (next.backgroundCastingPlan && typeof next.backgroundCastingPlan === 'object') {
        next.backgroundCastingPlan = normalizeBackgroundCastingPlan(next.backgroundCastingPlan, {
            title: next.title,
            genre: next.genre,
            projectType: next.type,
            episodes: next.episodes,
            castShape: next.storyCompass?.castShape,
            budget: next.estimatedBudget,
        });
    }
    return next;
};

const migrateActiveRelease = (release: any, playerAge: number, currentWeek: number): any => {
    const next = release && typeof release === 'object' ? { ...release } : {};
    next.weekNum = Math.max(1, Math.round(Number(next.weekNum || 1)));
    next.weeklyGross = toMoneySeries(next.weeklyGross);
    next.totalGross = clampMoney(Number(next.totalGross || next.weeklyGross.reduce((sum: number, value: number) => sum + value, 0)));
    next.weeklyStudioReceipts = toMoneySeries(next.weeklyStudioReceipts);
    next.totalStudioReceipts = clampMoney(Number(next.totalStudioReceipts || next.weeklyStudioReceipts.reduce((sum: number, value: number) => sum + value, 0)));
    next.weeklyExhibitorReceipts = toMoneySeries(next.weeklyExhibitorReceipts);
    next.totalExhibitorReceipts = clampMoney(Number(next.totalExhibitorReceipts || next.weeklyExhibitorReceipts.reduce((sum: number, value: number) => sum + value, 0)));
    next.weeklyDistributionBreakdowns = toObjectSeries(next.weeklyDistributionBreakdowns);
    next.maxTheatricalWeeks = Math.max(1, Math.min(
        ABSOLUTE_THEATRICAL_WEEK_CAP,
        Math.round(Number(next.maxTheatricalWeeks || 12))
    ));
    next.baseTheatricalWeeks = Math.max(1, Math.min(
        next.maxTheatricalWeeks,
        Math.round(Number(next.baseTheatricalWeeks || next.maxTheatricalWeeks))
    ));
    next.theatricalExtensionWeeks = Math.max(0, Math.min(
        MAX_THEATRICAL_EXTENSION_WEEKS,
        Math.round(Number(next.theatricalExtensionWeeks || (next.maxTheatricalWeeks - next.baseTheatricalWeeks)))
    ));
    next.theatricalExtensionHistory = normalizeTheatricalExtensionHistory(next.theatricalExtensionHistory);
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
            startWeekAbsolute: inferStreamingStartWeekAbsolute(next.streaming, playerAge, currentWeek),
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

const inferMigratedPastProjectType = (project: any): 'MOVIE' | 'SERIES' => {
    const candidates = [
        project?.projectType,
        project?.projectDetails?.type,
        project?.mediaType,
        project?.formatType,
        project?.type,
    ].map(value => String(value || '').trim().toUpperCase());
    if (candidates.some(value => value === 'SERIES' || value === 'TV' || value === 'SHOW')) return 'SERIES';
    const seriesStatus = String(project?.futurePotential?.seriesStatus || '').trim().toUpperCase();
    if (seriesStatus && seriesStatus !== 'N/A') return 'SERIES';
    if (Array.isArray(project?.episodeRatings) && project.episodeRatings.length > 0) return 'SERIES';
    if (Array.isArray(project?.projectDetails?.episodeRatings) && project.projectDetails.episodeRatings.length > 0) return 'SERIES';
    return 'MOVIE';
};

const migratePastProject = (project: any, index: number): any => {
    const next = project && typeof project === 'object' ? { ...project } : {};
    const releaseTiming = migratePastProjectReleaseTiming(next);
    const inferredProjectType = inferMigratedPastProjectType(next);
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
    next.projectType = next.episodeRatings.length > 0 ? 'SERIES' : inferredProjectType;
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
    next.baseTheatricalWeeks = next.baseTheatricalWeeks === undefined
        ? undefined
        : Math.max(1, Math.min(ABSOLUTE_THEATRICAL_WEEK_CAP, Math.round(Number(next.baseTheatricalWeeks || 1))));
    next.theatricalExtensionWeeks = Math.max(0, Math.min(
        MAX_THEATRICAL_EXTENSION_WEEKS,
        Math.round(Number(next.theatricalExtensionWeeks || 0))
    ));
    next.theatricalExtensionHistory = normalizeTheatricalExtensionHistory(next.theatricalExtensionHistory);
    next.awards = sanitizeMigratedAwardRecords(toObjectSeries<MigratedAwardLike>(next.awards));
    if (next.backgroundCastingPlan && typeof next.backgroundCastingPlan === 'object') {
        next.backgroundCastingPlan = normalizeBackgroundCastingPlan(next.backgroundCastingPlan, {
            projectId: next.id,
            title: next.name,
            genre: next.genre,
            projectType: next.projectType,
            budget: next.budget,
        });
    }
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
    nextFlags.livingEnsembleState = normalizeLivingEnsembleState(nextFlags.livingEnsembleState);
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
    let legacyImportedDebtRepaired = false;
    let acquisitionDebtLedger = toArray<any>(nextFlags.acquisitionDebtLedger).map((entry, index) => ({
        ...entry,
        id: String(entry?.id || `debt_${index}`),
        studioId: String(entry?.studioId || 'UNKNOWN_STUDIO'),
        studioName: String(entry?.studioName || 'Unknown Studio'),
        originalPrincipal: clampMoney(Number(entry?.originalPrincipal || 0)),
        remainingPrincipal: clampMoney(Number(entry?.remainingPrincipal || 0)),
        annualInterestRate: Math.max(0, Math.min(0.5, Number(entry?.annualInterestRate || 0))),
        status: entry?.status === 'PAID_OFF' || entry?.status === 'DEFAULTED' ? entry.status : 'ACTIVE',
    }));
    const importedLegacyDebtNeedsRepair = Boolean(nextFlags.saveTransferImportedAt)
        && nextFlags.acquisitionDebtLegacyBaselineVersion !== 1;
    if (importedLegacyDebtNeedsRepair) {
        const acquiredStudioIds = new Set(
            toArray<any>(nextFlags.studioAcquisitionCases)
                .filter(acquisitionCase => acquisitionCase?.status === 'ACQUIRED' && acquisitionCase?.closing)
                .flatMap(acquisitionCase => [acquisitionCase.studioId, acquisitionCase.closing?.acquiredBusinessId])
                .filter(Boolean)
                .map(String),
        );
        acquisitionDebtLedger = acquisitionDebtLedger.map(entry => {
            if (
                entry.trackingOrigin === 'SIGNED'
                || !acquiredStudioIds.has(String(entry.studioId))
                || entry.status === 'PAID_OFF'
            ) return entry;
            legacyImportedDebtRepaired = true;
            return {
                ...entry,
                originalPrincipal: 0,
                remainingPrincipal: 0,
                annualInterestRate: 0,
                interestPaidToDate: 0,
                missedServiceAmount: 0,
                missedPayments: 0,
                status: 'PAID_OFF',
                closureReason: 'LEGACY_SAVE_BASELINE',
            };
        });
    }
    // Acquisition debt was added after some players had already bought studios.
    // Do not reconstruct a brand-new payable debt balance from those historical
    // closing records: the old save has no reliable way to tell whether the
    // liabilities were settled before export. A paid-off ledger marker prevents
    // the weekly loop from silently charging an imported legacy save.
    const ledgerStudioIds = new Set(acquisitionDebtLedger.map(entry => String(entry.studioId)));
    const legacyDebtBaselines = toArray<any>(nextFlags.studioAcquisitionCases).flatMap((acquisitionCase, index) => {
        if (acquisitionCase?.status !== 'ACQUIRED' || !acquisitionCase?.closing) return [];
        const candidateStudioIds = [
            acquisitionCase.studioId,
            acquisitionCase.closing.acquiredBusinessId,
        ].filter(Boolean).map(String);
        if (candidateStudioIds.some(studioId => ledgerStudioIds.has(studioId))) return [];

        const liveStudioId = candidateStudioIds.find(studioId => player.businesses.some(business => (
            business.type === 'PRODUCTION_HOUSE' && business.id === studioId
        )));
        if (!liveStudioId) return [];

        ledgerStudioIds.add(liveStudioId);
        return [{
            id: `legacy_acquisition_debt_settled_${liveStudioId}_${index}`,
            studioId: liveStudioId,
            studioName: String(acquisitionCase.studioName || liveStudioId),
            originalPrincipal: 0,
            remainingPrincipal: 0,
            annualInterestRate: 0,
            originatedWeek: Math.max(0, Math.round(Number(acquisitionCase.closing.signedWeek || 0))),
            originatedYear: Math.max(0, Math.round(Number(acquisitionCase.closing.signedYear || 0))),
            source: acquisitionCase.closing.finalPrice === 0 ? 'STOCK_CONTROL_TRANSFER' : 'NEGOTIATED_ACQUISITION',
            status: 'PAID_OFF',
            interestPaidToDate: 0,
            missedServiceAmount: 0,
            missedPayments: 0,
            closureReason: 'LEGACY_SAVE_BASELINE',
        }];
    });
    nextFlags.acquisitionDebtLedger = [...acquisitionDebtLedger, ...legacyDebtBaselines];
    if (legacyDebtBaselines.length > 0 || legacyImportedDebtRepaired) {
        nextFlags.acquisitionDebtLegacyBaselineVersion = 1;
        if (legacyImportedDebtRepaired) {
            nextFlags.acquisitionDebtLegacyRefundWeekKey = `${player.age}:${player.currentWeek}`;
        }
    }
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
    nextFlags.studioAcquisitionCases = toArray<any>(nextFlags.studioAcquisitionCases).map(acquisitionCase => {
        const responseRound = Math.max(1, Math.round(Number(
            acquisitionCase?.sellerResponse?.round
            || acquisitionCase?.offer?.round
            || 1,
        )));
        if (acquisitionCase?.status !== 'RIVAL_BID' || responseRound <= ACQUISITION_RIVAL_BID_MAX_ROUNDS || !acquisitionCase?.offer) {
            return acquisitionCase;
        }
        // Saved Round 4 / 3 auctions must receive the final board response on
        // the next processed week instead of trapping the player in a bid loop.
        return {
            ...acquisitionCase,
            status: 'OFFER_SUBMITTED',
            offer: {
                ...acquisitionCase.offer,
                round: ACQUISITION_RIVAL_BID_MAX_ROUNDS,
            },
            sellerResponse: undefined,
        };
    });
    nextFlags.companyEquityPositions = normalizeCompanyEquityPositions({
        ...player,
        flags: nextFlags,
    }).slice(0, 40);
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

const acquiredStudioStaffSalary = (weeklyRevenue: number, index: number): number => {
    const scaleAllowance = Math.min(1_200_000, Math.max(0, weeklyRevenue) * 0.006);
    return Math.round(650_000 + scaleAllowance + (index * 75_000));
};

// Older acquisition saves treated historical deal liabilities as weekly operating
// expenses. Repair only that clearly stale state; legitimate loss-making studios
// and player-hired staff remain untouched.
const repairAcquiredStudioFinance = (player: Player): Player => {
    const activeDebtStudioIds = new Set(
        toArray<any>(player.flags?.acquisitionDebtLedger)
            .filter(entry => entry?.status === 'ACTIVE' && Number(entry?.remainingPrincipal || 0) > 0)
            .map(entry => String(entry.studioId || '')),
    );
    const acquiredCases = new Map<string, any>();
    toArray<any>(player.flags?.studioAcquisitionCases).forEach(acquisitionCase => {
        if (acquisitionCase?.status !== 'ACQUIRED' || !acquisitionCase?.closing) return;
        acquiredCases.set(String(acquisitionCase.studioId || ''), acquisitionCase);
        acquiredCases.set(String(acquisitionCase.closing.acquiredBusinessId || ''), acquisitionCase);
    });

    let repaired = false;
    const businesses = player.businesses.map((business): Business => {
        const acquisitionCase = acquiredCases.get(business.id);
        if (!acquisitionCase || business.type !== 'PRODUCTION_HOUSE') return business;

        const expectedWeeklyRevenue = Math.max(0, Number(acquisitionCase.closing.expectedAnnualIncome || 0) / 52);
        const weeklyRevenue = Math.max(0, Number(business.stats?.weeklyRevenue || 0));
        const weeklyRevenueBasis = Math.max(weeklyRevenue, expectedWeeklyRevenue);
        let staffChanged = false;
        const staff = (business.staff || []).map((member, index) => {
            if (!String(member.id || '').startsWith(`${business.id}_staff_`)) return member;
            const salary = acquiredStudioStaffSalary(weeklyRevenueBasis, index);
            if (Number(member.salary || 0) === salary) return member;
            staffChanged = true;
            return { ...member, salary };
        });
        const staffCosts = staff.reduce((total, member) => total + Math.max(0, Number(member.salary || 0)), 0);
        const normalExpenseFloor = Math.round(Math.max(
            staffCosts,
            Math.max(1, Number(business.stats?.locations || 1)) * 200_000,
            weeklyRevenueBasis * 0.18,
        ));
        const currentExpenses = Math.max(0, Number(business.stats?.weeklyExpenses || 0));
        const hasActiveDebt = activeDebtStudioIds.has(business.id);
        const staleDebtExpense = !hasActiveDebt
            && currentExpenses > Math.max(normalExpenseFloor * 4, weeklyRevenueBasis * 1.25);

        if (!staffChanged && !staleDebtExpense) return business;
        repaired = true;
        const weeklyExpenses = staleDebtExpense ? normalExpenseFloor : currentExpenses;
        return {
            ...business,
            staff,
            stats: {
                ...business.stats,
                weeklyExpenses,
                weeklyProfit: Math.round(weeklyRevenue - weeklyExpenses),
            },
        };
    });

    return repaired ? { ...player, businesses } : player;
};

// Continuation commissioning used to store only writerId. Market writers and
// the Original Creator are display-only entries, so their ID cannot be looked
// up later in studioState.writers and the completed script fell back to 50.
const repairInDevelopmentContinuationScripts = (player: Player): Player => {
    let repaired = false;
    const businesses = player.businesses.map((business): Business => {
        const scripts = business.studioState?.scripts;
        if (!Array.isArray(scripts)) return business;
        let scriptsChanged = false;
        const repairedScripts = scripts.map(script => {
            if (
                script.status !== 'IN_DEVELOPMENT'
                || !['SEQUEL', 'SPINOFF'].includes(String(script.sourceMaterial || ''))
            ) {
                return script;
            }
            const displayedQuality = Number(script.quality);
            const knownWriterSkill = Number(script.assignedSkill);
            const stableWriterSkill = Number.isFinite(knownWriterSkill)
                ? Math.max(10, Math.min(100, Math.round(knownWriterSkill)))
                : Number.isFinite(displayedQuality) && displayedQuality > 0
                    ? Math.max(10, Math.min(100, Math.round(displayedQuality)))
                    : 50;
            const knownBaseline = Number(script.baseQuality);
            const stableBaseline = Number.isFinite(knownBaseline) && knownBaseline > 0
                ? Math.max(10, Math.min(100, Math.round(knownBaseline)))
                : stableWriterSkill;
            if (script.assignedSkill === stableWriterSkill && script.baseQuality === stableBaseline) return script;
            scriptsChanged = true;
            return {
                ...script,
                assignedSkill: stableWriterSkill,
                baseQuality: stableBaseline,
            };
        });
        if (!scriptsChanged) return business;
        repaired = true;
        return {
            ...business,
            studioState: {
                ...business.studioState!,
                scripts: repairedScripts,
            },
        };
    });
    return repaired ? { ...player, businesses } : player;
};

const reverseLegacyImportedAcquisitionDebtCharge = (player: Player): Player => {
    const refundWeekKey = player.flags?.acquisitionDebtLegacyRefundWeekKey;
    if (
        typeof refundWeekKey !== 'string'
        || player.flags?.acquisitionDebtLegacyRefundApplied === true
        || refundWeekKey !== `${player.age}:${player.currentWeek}`
    ) return player;

    const reversedTransactionIds = new Set(
        toArray<any>(player.finance?.history)
            .filter(transaction => (
                typeof transaction?.id === 'string'
                && transaction.id.startsWith('tx_acq_debt_')
                && transaction.week === player.currentWeek
                && transaction.year === player.age
            ))
            .map(transaction => transaction.id),
    );
    const refundAmount = toArray<any>(player.finance?.history)
        .filter(transaction => reversedTransactionIds.has(transaction.id))
        .reduce((sum, transaction) => sum + Math.max(0, -Number(transaction.amount || 0)), 0);
    const nextFlags = {
        ...player.flags,
        acquisitionDebtLegacyRefundApplied: true,
    };
    if (refundAmount <= 0) {
        return { ...player, flags: nextFlags };
    }

    return {
        ...player,
        money: Math.max(0, Number(player.money || 0)) + refundAmount,
        finance: {
            ...player.finance,
            history: toArray<any>(player.finance?.history).filter(transaction => !reversedTransactionIds.has(transaction.id)),
        },
        flags: nextFlags,
        logs: [{
            week: player.currentWeek,
            year: player.age,
            message: 'Your imported studio history was updated. A legacy debt charge was reversed and your cash was restored.',
            type: 'positive' as const,
        }, ...toArray<any>(player.logs)].slice(0, 50),
    };
};

export const migratePlayerSave = (input: Partial<Player> | Player): Player => {
    const base: Player = mergeDefaults(INITIAL_PLAYER, input);
    const protectedPlatformAiExternalMoveIds = new Set<string>();
    Object.values(base.world?.platforms || {}).forEach(platform => {
        toArray<{ moveId?: unknown }>(platform?.ai?.externalCommitments).forEach(commitment => {
            const moveId = typeof commitment?.moveId === 'string' ? commitment.moveId.trim() : '';
            if (moveId) protectedPlatformAiExternalMoveIds.add(moveId);
        });
    });
    const migratedAge = Math.max(1, Math.round(Number(base.age || INITIAL_PLAYER.age)));
    const migratedCurrentWeek = Math.min(52, Math.max(1, Math.round(Number(base.currentWeek || INITIAL_PLAYER.currentWeek))));
    const stocks = migrateStocksForSave(base.stocks as Partial<Stock>[] | undefined);
    const repairRunawayStockCash = hasRunawayStockValues(base.stocks as Partial<Stock>[] | undefined, stocks);
    const migratedPendingEvent = base.pendingEvent
        ? sanitizeMigratedAwardEvent(base.pendingEvent)
        : null;
    const playerWithStocks: Player = {
        ...base,
        id: String(base.id || INITIAL_PLAYER.id),
        name: typeof base.name === 'string' && base.name.trim() ? base.name : INITIAL_PLAYER.name,
        age: migratedAge,
        totalPlayTimeMs: Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.round(Number(base.totalPlayTimeMs || 0)))),
        currentWeek: migratedCurrentWeek,
        money: normalizeMigratedCash(base.money, repairRunawayStockCash),
        world: {
            ...base.world,
            platformAiCatalogueDistressDeals: normalizePlatformAiCatalogueDistressDeals(
                base.world?.platformAiCatalogueDistressDeals,
            ),
            awardHistory: sanitizeMigratedAwardHistory(toObjectSeries<MigratedAwardHistoryEntry>(base.world?.awardHistory)) as any,
            talentBookings: backfillActivePlayerCommitmentTalentBookings(
                base.world?.talentBookings,
                base.commitments,
            ),
            industryProductions: normalizeIndustryProductions(
                base.world?.industryProductions,
                getAbsoluteWeek(base.age, base.currentWeek),
            ),
            platformAiPlayerCommissionOffers: normalizePlatformAiPlayerCommissionOffers(
                base.world?.platformAiPlayerCommissionOffers,
                getAbsoluteWeek(base.age, base.currentWeek),
            ),
        },
        stocks,
        portfolio: migratePortfolio(
            base.portfolio as Partial<PortfolioItem>[] | undefined,
            stocks,
            base.stocks as Partial<Stock>[] | undefined,
        ),
        shareholderVotes: toArray<any>(base.shareholderVotes).filter(vote => stocks.some(stock => stock.id === vote?.stockId)).slice(0, 24),
        stockTakeovers: migrateTakeovers(base.stockTakeovers as Partial<StockTakeoverCase>[] | undefined, stocks, base),
        ownedStreamingPlatform: normalizeOwnedStreamingPlatformState(
            base.ownedStreamingPlatform,
            String(base.id || INITIAL_PLAYER.id),
            protectedPlatformAiExternalMoveIds,
        ),
        activeReleases: toObjectSeries<any>(base.activeReleases).map(release => (
            migrateActiveRelease(release, migratedAge, migratedCurrentWeek)
        )),
        awards: sanitizeMigratedAwardRecords(toObjectSeries<MigratedAwardLike>(base.awards)) as any,
        scheduledEvents: toObjectSeries<ScheduledEvent>(base.scheduledEvents)
            .map(sanitizeMigratedAwardEvent),
        pendingEvent: migratedPendingEvent?.type === 'AWARD_CEREMONY'
            && !toObjectSeries<any>(migratedPendingEvent.data?.nominations).length
                ? null
                : migratedPendingEvent,
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
    const platformAiAbsoluteWeek = getAbsoluteWeek(playerWithStocks.age, playerWithStocks.currentWeek);
    const normalizedPlatformAiWorld = normalizeWorldPlatformAi(
        playerWithStocks,
        playerWithStocks.world,
        platformAiAbsoluteWeek,
    );
    const authoritativeRivalMoves = Array.isArray(playerWithStocks.ownedStreamingPlatform?.competitiveWorld?.moves)
        ? playerWithStocks.ownedStreamingPlatform!.competitiveWorld.moves
        : [];
    const acquiredPlatformIds = new Set(
        playerWithStocks.ownedStreamingPlatform?.corporateDevelopment?.acquiredPlatformIds || [],
    );
    const externallyValidatedPlatforms = normalizedPlatformAiWorld.platforms
        ? Object.fromEntries(Object.entries(normalizedPlatformAiWorld.platforms).map(([platformId, platform]) => {
            if (!platform.ai || acquiredPlatformIds.has(platform.id)) return [platformId, platform];
            const externalCommitments = normalizePlatformAiExternalCommitments(
                platform.ai.externalCommitments,
                platform.id,
                platform.ai.pendingOneTimeObligations,
                authoritativeRivalMoves,
                platformAiAbsoluteWeek,
            );
            return [platformId, {
                ...platform,
                ai: {
                    ...platform.ai,
                    externalCommitments,
                    pendingOneTimeObligations: reconcilePlatformAiExternalCommitmentObligations(
                        platform.ai.pendingOneTimeObligations,
                        externalCommitments,
                    ),
                },
            }];
        })) as typeof normalizedPlatformAiWorld.platforms
        : normalizedPlatformAiWorld.platforms;
    const playerWithNormalizedPlatformAiWorld = reconcilePlatformAiCatalogueDistressDealsForMigration(
        playerWithStocks,
        { ...normalizedPlatformAiWorld, platforms: externallyValidatedPlatforms },
        platformAiAbsoluteWeek,
    );
    const playerWithNormalizedPlatformAi: Player = {
        ...playerWithStocks,
        world: {
            ...playerWithNormalizedPlatformAiWorld,
            streamingPlatformEcosystem: normalizeStreamingPlatformEcosystem(
                playerWithNormalizedPlatformAiWorld.streamingPlatformEcosystem,
                platformAiAbsoluteWeek,
            ),
            streamingBiddingSessions: normalizeStreamingBiddingSessionRegistry(
                playerWithNormalizedPlatformAiWorld.streamingBiddingSessions,
            ),
            streamingRoyaltySettlements: normalizeStreamingRoyaltySettlementRegistry(
                playerWithNormalizedPlatformAiWorld.streamingRoyaltySettlements,
            ),
        },
    };
    const playerWithStreamingContracts = migrateStreamingRightsContractRegistry(playerWithNormalizedPlatformAi);
    const playerWithStreamingRightsCalendar: Player = {
        ...playerWithStreamingContracts,
        streamingRightsManagement: normalizeStreamingRightsManagementState(
            playerWithStreamingContracts.streamingRightsManagement,
        ),
        world: {
            ...playerWithStreamingContracts.world,
            streamingCataloguePackages: reconstructSignedStreamingCataloguePackages(
                playerWithStreamingContracts.world.streamingCataloguePackages,
                playerWithStreamingContracts.world.streamingRightsContracts,
            ),
            streamingCataloguePackageDigests: Array.isArray(playerWithStreamingContracts.world.streamingCataloguePackageDigests)
                ? playerWithStreamingContracts.world.streamingCataloguePackageDigests.slice(0, 52)
                : [],
            streamingCataloguePackagesLastProcessedWeek: Number.isFinite(Number(playerWithStreamingContracts.world.streamingCataloguePackagesLastProcessedWeek))
                ? Math.round(Number(playerWithStreamingContracts.world.streamingCataloguePackagesLastProcessedWeek))
                : -1,
            streamingRightsCalendar: normalizeStreamingRightsCalendarState(
                playerWithStreamingContracts.world.streamingRightsCalendar,
            ),
        },
    };
    const migratedPlayer = {
        ...playerWithStreamingRightsCalendar,
        flags: migrateFlags(base.flags, playerWithStreamingRightsCalendar),
    };
    const repairedPlayer = migrateLegacyCharacterIdentity(reverseLegacyImportedAcquisitionDebtCharge(
        repairAcquiredStudioAssetPortfolios(
            repairInDevelopmentContinuationScripts(repairAcquiredStudioFinance(migratedPlayer)),
        ),
    ));
    const productionHouses = repairedPlayer.businesses.filter(business => business.type === 'PRODUCTION_HOUSE');
    const parentStudio = productionHouses.find(business => (
        business.studioState?.acquisitionOrigin !== 'STUDIO_ACQUISITION'
        && business.config?.productionType !== 'Acquired Studio'
    )) || productionHouses[0];

    if (!parentStudio) return repairedPlayer;

    const reconciledRoster = mergeParentStudioTalentRosters(
        parentStudio.id,
        repairedPlayer.studio?.talentRoster as any,
        parentStudio.studioState?.talentRoster as any,
    );

    return {
        ...repairedPlayer,
        studio: {
            ...repairedPlayer.studio,
            talentRoster: reconciledRoster,
        },
        businesses: repairedPlayer.businesses.map(business => (
            business.id === parentStudio.id
                ? {
                    ...business,
                    studioState: business.studioState
                        ? { ...business.studioState, talentRoster: reconciledRoster }
                        : business.studioState,
                }
                : business
        )),
    };
};
