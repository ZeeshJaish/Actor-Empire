
import { Stock, Player, PortfolioItem, NewsItem } from '../types';
import { STUDIO_CATALOG } from './studioLogic';
import { valueWorldStudio } from './valuation/studioValuation';
import { nextSharePrice } from './valuation/sharePrice';
import { creditCorporateStockReceipt, getRecordedStockBasis, getStockHoldingAllocations, splitStockReceipt } from './stockCashOwnership';
import { getStudioSaleTreasuryLock } from './studioGroup';
import { roundStockCash, settleStockCash } from './stockSettlement';
import { getStockMarketAbsoluteWeek, stockLegacyMarkerAbsoluteWeek } from './stockMarketClock';
import { canCreditCorporateStockReceipt } from './stockCashOwnership';
import { createEarningsNews, describeEarningsReport, getCompanyProfile, getEarningsFairValue, initStockEarnings, isValidEarningsState, reportStockQuarter, type StockEarningsReport, type StockWithEarnings } from './stockEarnings';

const KNOWN_OUTSTANDING_SHARES: Record<string, number> = {
    stk_apple: 15_300_000_000,
    stk_amzn: 10_400_000_000,
    stk_goog: 12_300_000_000,
    stk_nflx: 430_000_000,
    stk_dis: 1_820_000_000,
    stk_wbd: 2_450_000_000,
    stk_para: 650_000_000,
    stk_cmcsa: 3_900_000_000,
    stk_nke: 1_500_000_000,
    stk_ker: 123_000_000,
    stk_ko: 4_320_000_000,
    stk_pep: 1_370_000_000,
    stk_tsla: 3_200_000_000,
    stk_tm: 1_350_000_000,
    stk_race: 185_000_000,
    stk_lvmh: 502_000_000,
};

const KNOWN_REFERENCE_PRICES: Record<string, number> = {
    stk_apple: 185,
    stk_amzn: 145,
    stk_goog: 160,
    stk_nflx: 620,
    stk_dis: 110,
    stk_wbd: 12.5,
    stk_para: 13,
    stk_cmcsa: 42,
    stk_nke: 105,
    stk_ker: 450,
    stk_ko: 60,
    stk_pep: 168,
    stk_tsla: 175,
    stk_tm: 230,
    stk_race: 410,
    stk_lvmh: 850,
};

const MARKET_CAP_CEILING_BY_SECTOR: Record<Stock['sector'], number> = {
    TECH: 5_000_000_000_000,
    MEDIA: 750_000_000_000,
    FASHION: 650_000_000_000,
    BEVERAGE: 750_000_000_000,
    AUTOMOTIVE: 1_000_000_000_000,
};

const REFERENCE_MARKET_CAP_BY_SECTOR: Record<Stock['sector'], number> = {
    TECH: 250_000_000_000,
    MEDIA: 40_000_000_000,
    FASHION: 50_000_000_000,
    BEVERAGE: 80_000_000_000,
    AUTOMOTIVE: 150_000_000_000,
};

const MARKET_CAP_GROWTH_MULTIPLE_BY_SECTOR: Record<Stock['sector'], number> = {
    TECH: 2,
    MEDIA: 3,
    FASHION: 3,
    BEVERAGE: 3,
    AUTOMOTIVE: 3,
};

const MAX_WEEKLY_PRICE_MOVE = 0.18;
/** quarterly dividends, like real ones */
const DIVIDEND_EVERY_WEEKS = 13;

/* Stocks fix (players bought whole companies, and their own buying inflated the price for good). An order walks the
   book, so it fills on average halfway along its full impact, but the market keeps only this share of that move: the
   rest is absorbed, and the weekly pull towards the company's value does the remainder. */
const TRADE_IMPACT_RETAINED = 0.25;
/** Holdouts want more for each further share of a company you already largely own, like a takeover premium: 0.5 x
 *  ownership^2, averaged over the shares bought. A few percent costs nothing extra; a whole company about 17%; its last
 *  half about 29%. */
const STAKE_PREMIUM_SCALE = 0.5;
export const getStakePremium = (fromFraction: number, toFraction: number) => {
    const from = Math.max(0, Math.min(1, fromFraction));
    const to = Math.max(0, Math.min(1, toFraction));
    if (!(to > from)) return 0;
    return STAKE_PREMIUM_SCALE * (from * from + from * to + to * to) / 3;
};

/* AE-023: the hard ceiling held a grown company's price at one exact number, so its line went flat. The value a price
   is pulled towards now bends below the ceiling instead: unchanged up to 70% of it, then approaching 95% of it ever
   more slowly. Noise, momentum and the sector's mood keep the price moving around that value, so the line keeps
   moving, and the ceiling itself stays a safety net that only a rare spike touches. */
export const softenFairValueUnderCeiling = (fair: number, ceiling: number) => {
    const knee = ceiling * 0.7;
    const top = ceiling * 0.95;
    if (!(fair > knee) || !(top > knee)) return fair;
    return knee + (top - knee) * (1 - Math.exp(-(fair - knee) / (top - knee)));
};
const MIN_UNKNOWN_OUTSTANDING_SHARES = 250_000_000;
const MAX_UNKNOWN_OUTSTANDING_SHARES_RANGE = 1_750_000_000;

const stableShareHash = (value: string) => Array.from(value).reduce(
    (hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0,
    2166136261,
);

const clampFinite = (value: number, min: number, max: number) => (
    Math.max(min, Math.min(max, Number.isFinite(value) ? value : min))
);

const roundPrice = (value: number) => Number(Math.max(0.01, value).toFixed(2));

const getGeneratedOutstandingShares = (stockId: string) => (
    MIN_UNKNOWN_OUTSTANDING_SHARES + (stableShareHash(stockId) % MAX_UNKNOWN_OUTSTANDING_SHARES_RANGE)
);

const getStockBaseOutstandingShares = (stock: Pick<Stock, 'id'>): number => (
    KNOWN_OUTSTANDING_SHARES[stock.id] || getGeneratedOutstandingShares(stock.id)
);

export const getStockMaximumOutstandingShares = (stock: Pick<Stock, 'id'>): number => (
    Math.round(getStockBaseOutstandingShares(stock) * 3)
);

export const getStockOutstandingShares = (stock: Pick<Stock, 'id' | 'outstandingShares'>): number => {
    const explicitShares = Number(stock.outstandingShares);
    const baseShares = getStockBaseOutstandingShares(stock);
    const maximumShares = getStockMaximumOutstandingShares(stock);
    if (!Number.isFinite(explicitShares)) return baseShares;
    if (!KNOWN_OUTSTANDING_SHARES[stock.id] && Number.isSafeInteger(explicitShares) && explicitShares > 0) return explicitShares;
    return Math.round(clampFinite(explicitShares, baseShares, maximumShares));
};

export const getStockReferencePrice = (stock: Pick<Stock, 'id'> & Partial<Pick<Stock, 'sector' | 'price'>>): number => {
    const reference = KNOWN_REFERENCE_PRICES[stock.id];
    if (reference) return reference;
    const baseShares = getStockBaseOutstandingShares(stock);
    const referenceMarketCap = stock.sector
        ? REFERENCE_MARKET_CAP_BY_SECTOR[stock.sector]
        : 75_000_000_000;
    return roundPrice(Math.max(1, referenceMarketCap / baseShares));
};

export const getStockMarketCapCeiling = (
    stock: Pick<Stock, 'id'> & Partial<Pick<Stock, 'sector' | 'price'>>,
): number => {
    const baseShares = getStockBaseOutstandingShares(stock);
    const referenceMarketCap = baseShares * getStockReferencePrice(stock);
    const sector = stock.sector;
    const growthMultiple = sector ? MARKET_CAP_GROWTH_MULTIPLE_BY_SECTOR[sector] : 3;
    const sectorCeiling = sector ? MARKET_CAP_CEILING_BY_SECTOR[sector] : 750_000_000_000;
    return Math.min(sectorCeiling, referenceMarketCap * growthMultiple);
};

export const getStockPriceCeiling = (
    stock: Pick<Stock, 'id' | 'outstandingShares'> & Partial<Pick<Stock, 'sector' | 'price'>>,
): number => {
    const outstandingShares = getStockOutstandingShares(stock);
    return Math.max(0.01, Math.floor(getStockMarketCapCeiling(stock) / outstandingShares * 100) / 100);
};

export const normalizeStockPrice = (
    stock: Pick<Stock, 'id' | 'outstandingShares'> & Partial<Pick<Stock, 'sector' | 'price'>>,
    price: number,
): number => {
    const referencePrice = getStockReferencePrice(stock);
    const ceiling = getStockPriceCeiling(stock);
    const floor = Math.min(ceiling, Math.max(0.01, referencePrice * 0.04));
    const safePrice = Number.isFinite(price) && price > 0 ? price : referencePrice;
    return roundPrice(clampFinite(safePrice, floor, ceiling));
};

export const isRunawayStockPrice = (
    stock: Pick<Stock, 'id' | 'outstandingShares'> & Partial<Pick<Stock, 'sector' | 'price'>>,
    price: number,
): boolean => (
    !Number.isFinite(price)
    || price <= 0
    || price > getStockPriceCeiling(stock) * 1.5
);

export const normalizeStockPriceHistory = (
    stock: Pick<Stock, 'id' | 'outstandingShares'> & Partial<Pick<Stock, 'sector' | 'price' | 'priceHistory'>>,
): number[] => {
    const currentPrice = normalizeStockPrice(stock, Number(stock.price));
    const history = (stock.priceHistory || [])
        .map(value => normalizeStockPrice(stock, Number(value)))
        .filter(value => Number.isFinite(value) && value > 0)
        .slice(-20);
    return history.length ? history : Array(12).fill(currentPrice);
};

export const getMergedStudioIds = (player?: Pick<Player, 'businesses'>): Set<string> => new Set(
    (player?.businesses || [])
        .filter(business => business.type === 'PRODUCTION_HOUSE' && business.studioState?.operatingModel === 'FULL_MERGER')
        .map(business => business.id),
);

export const isStockRetiredByMerger = (
    player: Pick<Player, 'businesses'> | undefined,
    stock: Pick<Stock, 'relatedStudioId'>,
): boolean => Boolean(stock.relatedStudioId && getMergedStudioIds(player).has(stock.relatedStudioId));

export const getSoldStudioIds = (player?: Pick<Player, 'flags'>): Set<string> => new Set(
    Object.keys((player?.flags?.soldStudioIds || {}) as Record<string, unknown>),
);

export const isStockRetiredBySale = (
    player: Pick<Player, 'flags'> | undefined,
    stock: Pick<Stock, 'relatedStudioId'>,
): boolean => Boolean(stock.relatedStudioId && getSoldStudioIds(player).has(stock.relatedStudioId));

export const getTradableStocks = <T extends Pick<Stock, 'relatedStudioId'>>(
    stocks: T[],
    player?: Pick<Player, 'businesses' | 'flags'>,
): T[] => stocks.filter(stock => !isStockRetiredByMerger(player, stock) && !isStockRetiredBySale(player, stock));

export interface StockTradeQuote {
    shares: number;
    direction: 'BUY' | 'SELL';
    currentOwnershipPercent: number;
    resultingOwnershipPercent: number;
    currentPrice: number;
    projectedPrice: number;
    priceImpactPercent: number;
    estimatedValue: number;
}

export interface StockTradeResult {
    success: boolean;
    player: Player;
    quote?: StockTradeQuote;
    reason?: 'STOCK_NOT_FOUND' | 'INVALID_AMOUNT' | 'INSUFFICIENT_CASH' | 'INSUFFICIENT_SHARES' | 'OWNER_NOT_FOUND' | 'LIVE_SALE_LISTING' | 'CONTROL_LOCKED' | 'UNREPRESENTABLE_AMOUNT' | 'INVALID_SHARE_REGISTER';
}

export type StockShareIssueReason =
    | 'SLATE_FINANCING'
    | 'ACQUISITION_FUNDING'
    | 'DEBT_REDUCTION'
    | 'GENERAL_CAPITAL';

export interface StockCorporateAction {
    type: 'SHARE_ISSUANCE';
    stockId: string;
    stockSymbol: string;
    companyName: string;
    week: number;
    year: number;
    reason: StockShareIssueReason;
    issuePercent: number;
    dilutionPercent: number;
    sharesIssued: number;
    oldOutstandingShares: number;
    newOutstandingShares: number;
    capitalRaised: number;
    oldPrice: number;
    newPrice: number;
    news: NewsItem;
    notification: string;
}

export interface StockShareIssuanceResult {
    stock: Stock;
    action: StockCorporateAction;
}

const roundOwnershipPercent = (value: number) => Math.round(value * 1_000_000) / 1_000_000;

const roundMoney = (value: number) => Math.max(0, Math.round(value));

export const getStockOwnershipPercent = (
    shares: number,
    stock: Pick<Stock, 'id' | 'outstandingShares'>,
): number => {
    const outstandingShares = getStockOutstandingShares(stock);
    const safeShares = Math.max(0, Math.floor(Number.isFinite(shares) ? shares : 0));
    return Math.min(100, roundOwnershipPercent((safeShares / outstandingShares) * 100));
};

export const getAvailableStockShares = (
    player: Pick<Player, 'portfolio'>,
    stock: Pick<Stock, 'id' | 'outstandingShares'>,
): number => {
    const currentShares = Math.max(0, player.portfolio.find(item => item.stockId === stock.id)?.shares || 0);
    return Math.max(0, getStockOutstandingShares(stock) - currentShares);
};

const getShareIssueReasonLabel = (reason: StockShareIssueReason) => {
    switch (reason) {
        case 'SLATE_FINANCING': return 'new productions and studio slate spending';
        case 'ACQUISITION_FUNDING': return 'acquisition funding';
        case 'DEBT_REDUCTION': return 'balance-sheet repair';
        case 'GENERAL_CAPITAL':
        default:
            return 'general corporate capital';
    }
};

export const applyStockShareIssuance = (
    stock: Stock,
    input: {
        issuePercent: number;
        week: number;
        year: number;
        reason: StockShareIssueReason;
    },
): StockShareIssuanceResult => {
    const oldOutstandingShares = getStockOutstandingShares(stock);
    const issuePercent = Math.max(0.1, Math.min(25, input.issuePercent));
    const remainingIssuanceRoom = Math.max(0, getStockMaximumOutstandingShares(stock) - oldOutstandingShares);
    const sharesIssued = Math.min(remainingIssuanceRoom, Math.max(1, Math.round(oldOutstandingShares * (issuePercent / 100))));
    const newOutstandingShares = oldOutstandingShares + sharesIssued;
    const oldPrice = normalizeStockPrice(stock, stock.price);
    const issueDiscount = 0.03 + ((stableShareHash(`${stock.id}:${input.week}:${input.reason}`) % 5) / 100);
    const issuePrice = normalizeStockPrice(stock, oldPrice * (1 - issueDiscount));
    const capitalRaised = roundMoney(sharesIssued * issuePrice);
    const oldMarketCap = oldOutstandingShares * oldPrice;
    const newMarketCap = oldMarketCap + (capitalRaised * 0.55);
    const newPrice = normalizeStockPrice(
        { ...stock, outstandingShares: newOutstandingShares },
        newMarketCap / newOutstandingShares,
    );
    const dilutionPercent = roundOwnershipPercent((1 - (oldOutstandingShares / newOutstandingShares)) * 100);
    const reasonLabel = getShareIssueReasonLabel(input.reason);
    const news: NewsItem = {
        id: `news_stock_issue_${stock.id}_${input.week}`,
        headline: `${stock.name} issues new shares`,
        subtext: `${stock.symbol} is issuing ${sharesIssued.toLocaleString()} new shares for ${reasonLabel}. Existing holders are diluted by about ${dilutionPercent.toFixed(2)}%, while the company raises ${formatCompactCapital(capitalRaised)} in fresh capital.`,
        category: 'INDUSTRY',
        week: input.week,
        year: input.year,
        impactLevel: issuePercent >= 8 ? 'HIGH' : 'MEDIUM',
    };
    const action: StockCorporateAction = {
        type: 'SHARE_ISSUANCE',
        stockId: stock.id,
        stockSymbol: stock.symbol,
        companyName: stock.name,
        week: input.week,
        year: input.year,
        reason: input.reason,
        issuePercent,
        dilutionPercent,
        sharesIssued,
        oldOutstandingShares,
        newOutstandingShares,
        capitalRaised,
        oldPrice,
        newPrice,
        news,
        notification: `${stock.symbol} issued ${sharesIssued.toLocaleString()} new shares; ownership percentages were diluted.`,
    };

    return {
        action,
        stock: {
            ...stock,
            outstandingShares: newOutstandingShares,
            price: newPrice,
            priceHistory: [...normalizeStockPriceHistory(stock), newPrice].slice(-20),
            lastShareIssueWeek: input.week,
        },
    };
};

const formatCompactCapital = (amount: number) => {
    if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
    return `$${Math.round(amount).toLocaleString()}`;
};

export const calculateStockTradeQuote = (
    player: Pick<Player, 'portfolio'>,
    stock: Stock,
    signedShares: number,
): StockTradeQuote => {
    const direction = signedShares >= 0 ? 'BUY' : 'SELL';
    const requestedShares = Math.max(0, Math.floor(Math.abs(signedShares)));
    const outstandingShares = getStockOutstandingShares(stock);
    const currentShares = Math.max(0, player.portfolio.find(item => item.stockId === stock.id)?.shares || 0);
    const currentPrice = normalizeStockPrice(stock, stock.price);
    const shares = direction === 'BUY'
        ? Math.min(requestedShares, Math.max(0, outstandingShares - currentShares))
        : Math.min(requestedShares, currentShares);
    const resultingShares = direction === 'BUY'
        ? currentShares + shares
        : Math.max(0, currentShares - shares);
    const ownershipDelta = shares / outstandingShares;
    const liquidityImpact = Math.min(0.12, ownershipDelta * 0.85);
    // the fill averages half the full impact; the market keeps TRADE_IMPACT_RETAINED of it (see above)
    const fullImpactPrice = normalizeStockPrice(stock, currentPrice * (1 + liquidityImpact * (direction === 'BUY' ? 1 : -1)));
    const executionPrice = (currentPrice + fullImpactPrice) / 2;
    const projectedPrice = normalizeStockPrice(stock, currentPrice + (fullImpactPrice - currentPrice) * TRADE_IMPACT_RETAINED);
    const priceImpactPercent = currentPrice > 0 ? (projectedPrice / currentPrice - 1) * 100 : 0;
    const stakePremium = direction === 'BUY'
        ? getStakePremium(currentShares / outstandingShares, resultingShares / outstandingShares)
        : 0;
    const estimatedValue = roundStockCash(shares * executionPrice * (1 + stakePremium));

    return {
        shares,
        direction,
        currentOwnershipPercent: getStockOwnershipPercent(currentShares, stock),
        resultingOwnershipPercent: getStockOwnershipPercent(resultingShares, stock),
        currentPrice,
        projectedPrice,
        priceImpactPercent,
        estimatedValue,
    };
};

export const getSharesForCashOrder = (
    player: Pick<Player, 'portfolio'>,
    stock: Stock,
    cashBudget: number,
) => {
    const budget = Math.max(0, cashBudget);
    const currentPrice = normalizeStockPrice(stock, stock.price);
    if (budget < currentPrice) return 0;
    const maxBuyableShares = getAvailableStockShares(player, stock);
    if (maxBuyableShares <= 0) return 0;

    let low = 0;
    let high = Math.min(maxBuyableShares, Math.max(1, Math.floor(budget / currentPrice)));
    while (calculateStockTradeQuote(player, stock, high).estimatedValue <= budget) {
        if (high >= maxBuyableShares) return maxBuyableShares;
        low = high;
        high = Math.min(maxBuyableShares, high * 2);
    }

    while (low + 1 < high) {
        const middle = Math.floor((low + high) / 2);
        if (calculateStockTradeQuote(player, stock, middle).estimatedValue <= budget) {
            low = middle;
        } else {
            high = middle;
        }
    }
    return low;
};

/** #237 (plan §25.4 Q4): once you control a company, your shares are the company. They paid for it: selling them on the market kept the
 * studio and took the money back (4.97B on WBD). The way out is selling the studio, which settles the shares (services/studioSale.ts). */
export const isStockLockedByControl = (player: Pick<Player, 'businesses'>, stock: Pick<Stock, 'relatedStudioId'>) => (
    Boolean(stock.relatedStudioId) && (player.businesses || []).some(business => business.id === stock.relatedStudioId)
);

export const executeStockTrade = (
    player: Player,
    stockId: string,
    signedShares: number,
): StockTradeResult => {
    const stock = player.stocks.find(candidate => candidate.id === stockId);
    if (!stock) return { success: false, player, reason: 'STOCK_NOT_FOUND' };
    const relevantHoldings = player.portfolio.filter(item => item.stockId === stockId);
    const invalidFunding = relevantHoldings.some(item => {
        if (item.equityFunding === undefined) return false;
        if (!Array.isArray(item.equityFunding)) return true;
        let allocated = 0;
        for (const row of item.equityFunding) {
            if (!row || typeof row.ownerStudioId !== 'string' || !row.ownerStudioId.trim()
                || !Number.isSafeInteger(row.shares) || row.shares < 0) return true;
            allocated += row.shares;
            if (!Number.isSafeInteger(allocated) || allocated > item.shares) return true;
        }
        return false;
    });
    if ((stock.outstandingShares !== undefined && (!Number.isSafeInteger(stock.outstandingShares) || Number(stock.outstandingShares) <= 0
        || Number(stock.outstandingShares) !== getStockOutstandingShares(stock)
        || getStockOutstandingShares(stock) * .01 > getStockMarketCapCeiling(stock)))
        || relevantHoldings.length > 1 || invalidFunding
        || relevantHoldings.some(item => !Number.isSafeInteger(item.shares) || item.shares < 0 || item.shares > getStockOutstandingShares(stock))) {
        return { success: false, player, reason: 'INVALID_SHARE_REGISTER' };
    }
    const requestedShares = Math.floor(Math.abs(signedShares));
    if (!Number.isSafeInteger(requestedShares) || requestedShares <= 0) return { success: false, player, reason: 'INVALID_AMOUNT' };

    const quote = calculateStockTradeQuote(player, stock, signedShares);
    const shares = quote.shares;
    if (shares <= 0) return { success: false, player, quote, reason: 'INVALID_AMOUNT' };
    const holding = player.portfolio.find(item => item.stockId === stockId);

    if (quote.direction === 'BUY') {
        if (player.money < quote.estimatedValue) return { success: false, player, quote, reason: 'INSUFFICIENT_CASH' };
        const settlement = settleStockCash(player.money, -quote.estimatedValue);
        if (!settlement.success) return { success: false, player, quote, reason: 'UNREPRESENTABLE_AMOUNT' };
        const existingShares = holding?.shares || 0;
        const existingInvested = getRecordedStockBasis(holding);
        let totalInvested: number | undefined;
        if (existingInvested !== undefined) {
            const basisSettlement = settleStockCash(existingInvested, quote.estimatedValue);
            if (!basisSettlement.success) return { success: false, player, quote, reason: 'UNREPRESENTABLE_AMOUNT' };
            totalInvested = basisSettlement.balance;
        }
        const nextShares = existingShares + shares;
        const nextHolding: PortfolioItem = {
            ...holding,
            stockId,
            shares: nextShares,
            totalInvested,
            averageCost: totalInvested === undefined ? undefined : totalInvested / nextShares,
        };
        const portfolio = holding
            ? player.portfolio.map(item => item.stockId === stockId ? nextHolding : item)
            : [...player.portfolio, nextHolding];
        return {
            success: true,
            quote,
            player: {
                ...player,
                money: settlement.balance,
                stocks: player.stocks.map(candidate => candidate.id === stockId
                    ? {
                        ...candidate,
                        price: Number(quote.projectedPrice.toFixed(2)),
                        priceHistory: [...normalizeStockPriceHistory(candidate), quote.projectedPrice].slice(-20),
                    }
                    : candidate),
                portfolio,
                logs: [
                    ...(player.logs || []),
                    {
                        week: player.currentWeek,
                        year: player.age,
                        message: `Bought ${shares.toLocaleString()} shares of ${stock.symbol}.`,
                        type: 'neutral',
                    },
                ],
            },
        };
    }

    if (!holding || holding.shares < shares) return { success: false, player, quote, reason: 'INSUFFICIENT_SHARES' };
    if (isStockLockedByControl(player, stock)) return { success: false, player, quote, reason: 'CONTROL_LOCKED' };
    const split = splitStockReceipt(holding, shares, quote.estimatedValue);
    const corporateReceipts = split.receipts.filter(row => row.ownerStudioId && row.soldShares > 0);
    if (corporateReceipts.some(row => !player.businesses.some(business => business.id === row.ownerStudioId && business.type === 'PRODUCTION_HOUSE'))) {
        return { success: false, player, quote, reason: 'OWNER_NOT_FOUND' };
    }
    if (corporateReceipts.some(row => getStudioSaleTreasuryLock(player, row.ownerStudioId))) {
        return { success: false, player, quote, reason: 'LIVE_SALE_LISTING' };
    }
    const personalProceeds = split.receipts.find(row => !row.ownerStudioId)?.proceeds || 0;
    const settlement = settleStockCash(player.money, personalProceeds);
    if (!settlement.success || corporateReceipts.some(row => !canCreditCorporateStockReceipt(player, row.ownerStudioId, row.proceeds, 'SALE'))) {
        return { success: false, player, quote, reason: 'UNREPRESENTABLE_AMOUNT' };
    }
    const nextShares = holding.shares - shares;
    const previousInvested = getRecordedStockBasis(holding);
    // The recorded total is authoritative, including a valid zero-cost holding.
    // Release its proportional basis rather than inventing one from today's quote.
    let remainingInvested: number | undefined;
    if (previousInvested !== undefined) {
        const disposedBasis = roundStockCash(previousInvested * (shares / holding.shares));
        const basisSettlement = nextShares > 0 ? settleStockCash(previousInvested, -disposedBasis) : { success: true as const, balance: 0 };
        if (!basisSettlement.success) return { success: false, player, quote, reason: 'UNREPRESENTABLE_AMOUNT' };
        remainingInvested = Math.max(0, basisSettlement.balance);
    }
    const portfolio = nextShares === 0
        ? player.portfolio.filter(item => item.stockId !== stockId)
        : player.portfolio.map(item => item.stockId === stockId
            ? {
                ...item,
                shares: nextShares,
                totalInvested: remainingInvested,
                averageCost: remainingInvested === undefined ? undefined : remainingInvested / nextShares,
                equityFunding: split.remainingFunding,
            }
            : item);

    let creditedPlayer = player;
    for (const receipt of corporateReceipts) creditedPlayer = creditCorporateStockReceipt(creditedPlayer, receipt.ownerStudioId, receipt.proceeds, 'SALE', stockId);
    return {
        success: true,
        quote,
        player: {
            ...creditedPlayer,
            money: settlement.balance,
            stocks: player.stocks.map(candidate => candidate.id === stockId
                ? {
                    ...candidate,
                    price: Number(quote.projectedPrice.toFixed(2)),
                    priceHistory: [...normalizeStockPriceHistory(candidate), quote.projectedPrice].slice(-20),
                }
                : candidate),
            portfolio,
            logs: [
                ...(player.logs || []),
                {
                    week: player.currentWeek,
                    year: player.age,
                    message: `Sold ${shares.toLocaleString()} shares of ${stock.symbol}.`,
                    type: 'neutral',
                },
            ],
        },
    };
};

// --- INITIAL MARKET DATA ---
const INITIAL_STOCKS: Omit<Stock, 'priceHistory' | 'lastDividendPayoutWeek'>[] = [
    // --- TECH ---
    { id: 'stk_apple', symbol: 'AAPL', name: 'Apple Inc.', sector: 'TECH', price: 185.00, outstandingShares: 15_300_000_000, publicFloatPercent: 99, volatility: 0.02, dividendYield: 0.005, relatedBrandName: 'Apple', relatedStudioId: 'APPLE_TV' },
    { id: 'stk_amzn', symbol: 'AMZN', name: 'Amazon', sector: 'TECH', price: 145.00, outstandingShares: 10_400_000_000, publicFloatPercent: 91, volatility: 0.03, dividendYield: 0 },
    { id: 'stk_goog', symbol: 'GOOG', name: 'Alphabet', sector: 'TECH', price: 160.00, outstandingShares: 12_300_000_000, publicFloatPercent: 86, volatility: 0.025, dividendYield: 0 },
    
    // --- MEDIA / STUDIOS ---
    { id: 'stk_nflx', symbol: 'NFLX', name: 'Netflix', sector: 'MEDIA', price: 620.00, outstandingShares: 430_000_000, publicFloatPercent: 98, volatility: 0.05, dividendYield: 0, relatedStudioId: 'NETFLIX' },
    { id: 'stk_dis', symbol: 'DIS', name: 'Disney', sector: 'MEDIA', price: 110.00, outstandingShares: 1_820_000_000, publicFloatPercent: 92, volatility: 0.03, dividendYield: 0.01, relatedStudioId: 'DISNEY_PLUS' },
    { id: 'stk_wbd', symbol: 'WBD', name: 'Warner Bros. Discovery', sector: 'MEDIA', price: 12.50, outstandingShares: 2_450_000_000, publicFloatPercent: 94, volatility: 0.06, dividendYield: 0, relatedStudioId: 'WARNER_BROS' },
    { id: 'stk_para', symbol: 'PARA', name: 'Paramount Global', sector: 'MEDIA', price: 13.00, outstandingShares: 650_000_000, publicFloatPercent: 88, volatility: 0.06, dividendYield: 0.03, relatedStudioId: 'PARAMOUNT' },
    { id: 'stk_cmcsa', symbol: 'CMCSA', name: 'Comcast (Universal)', sector: 'MEDIA', price: 42.00, outstandingShares: 3_900_000_000, publicFloatPercent: 83, volatility: 0.02, dividendYield: 0.025, relatedStudioId: 'UNIVERSAL' },

    // --- BRANDS (Sponsorships) ---
    { id: 'stk_nke', symbol: 'NKE', name: 'Nike', sector: 'FASHION', price: 105.00, outstandingShares: 1_500_000_000, publicFloatPercent: 84, volatility: 0.02, dividendYield: 0.015, relatedBrandName: 'Nike' },
    { id: 'stk_ker', symbol: 'KER', name: 'Kering (Gucci)', sector: 'FASHION', price: 450.00, outstandingShares: 123_000_000, publicFloatPercent: 58, volatility: 0.04, dividendYield: 0.03, relatedBrandName: 'Gucci' },
    { id: 'stk_ko', symbol: 'KO', name: 'Coca-Cola', sector: 'BEVERAGE', price: 60.00, outstandingShares: 4_320_000_000, publicFloatPercent: 91, volatility: 0.01, dividendYield: 0.035, relatedBrandName: 'Coca-Cola' },
    { id: 'stk_pep', symbol: 'PEP', name: 'PepsiCo', sector: 'BEVERAGE', price: 168.00, outstandingShares: 1_370_000_000, publicFloatPercent: 93, volatility: 0.01, dividendYield: 0.03, relatedBrandName: 'Pepsi' },
    { id: 'stk_tsla', symbol: 'TSLA', name: 'Tesla', sector: 'AUTOMOTIVE', price: 175.00, outstandingShares: 3_200_000_000, publicFloatPercent: 86, volatility: 0.08, dividendYield: 0, relatedBrandName: 'Tesla' },
    { id: 'stk_tm', symbol: 'TM', name: 'Toyota', sector: 'AUTOMOTIVE', price: 230.00, outstandingShares: 1_350_000_000, publicFloatPercent: 77, volatility: 0.015, dividendYield: 0.025, relatedBrandName: 'Toyota' },
    { id: 'stk_race', symbol: 'RACE', name: 'Ferrari', sector: 'AUTOMOTIVE', price: 410.00, outstandingShares: 185_000_000, publicFloatPercent: 72, volatility: 0.03, dividendYield: 0.008, relatedBrandName: 'Ferrari' },
    
    // --- LUXURY ---
    { id: 'stk_lvmh', symbol: 'LVMH', name: 'LVMH', sector: 'FASHION', price: 850.00, outstandingShares: 502_000_000, publicFloatPercent: 51, volatility: 0.03, dividendYield: 0.015, relatedBrandName: 'Louis Vuitton' },
];

/** Deterministic metadata lookup for valuation policy; never generates market history. */
export const getInitialStockForStudio = (studioId: string): Stock | undefined => {
    const metadata = INITIAL_STOCKS.find(stock => stock.relatedStudioId === studioId);
    return metadata ? { ...metadata, priceHistory: [], lastDividendPayoutWeek: 0 } : undefined;
};

export const initializeStocks = (): Stock[] => {
    return INITIAL_STOCKS.map(s => ({
        ...s,
        outstandingShares: getStockOutstandingShares(s),
        price: normalizeStockPrice(s, s.price),
        priceHistory: Array(12)
            .fill(s.price)
            .map(p => normalizeStockPrice(s, p * (1 + (Math.random() * 0.1 - 0.05)))), // Fake history
        lastDividendPayoutWeek: 0
    }));
};

export interface MarketUpdateResult {
    stocks: Stock[];
    dividendsTotal: number;
    notifications: string[];
    news: NewsItem[];
    corporateActions: StockCorporateAction[];
    /** this week's quarterly results (services/stockEarnings.ts) */
    earningsReports: Array<{ stockId: string; stockSymbol: string; verdict: StockEarningsReport['verdict']; notification: string }>;
}

const getAutomaticShareIssueReason = (stock: Stock): StockShareIssueReason => {
    if (stock.sector === 'MEDIA') return 'SLATE_FINANCING';
    if (stock.volatility >= 0.05) return 'DEBT_REDUCTION';
    return 'GENERAL_CAPITAL';
};

const shouldIssueSharesThisWeek = (stock: Stock, absoluteWeek: number, lastIssue: number) => {
    if (getStockOutstandingShares(stock) >= getStockMaximumOutstandingShares(stock)) return false;
    if (absoluteWeek - lastIssue < 52) return false;
    const cadence = 52 + (stableShareHash(`${stock.id}:cadence`) % 53);
    const targetWeek = stableShareHash(`${stock.id}:issue-week`) % cadence;
    return absoluteWeek % cadence === targetWeek;
};

/* #185: a sector's long-run growth, for the tickers that are not one of the game's studios */
const SECTOR_GROWTH: Record<Stock['sector'], number> = { TECH: 0.08, MEDIA: 0.04, FASHION: 0.05, BEVERAGE: 0.04, AUTOMOTIVE: 0.03 };

/**
 * #185: what a share is worth. A studio's ticker follows its studio's value (the valuation engine: its standing, books,
 * record, slate, cash and debt) from its starting price at the studio's standing; the others grow with their sector
 * from their starting price. Measured from an anchor kept on the stock, so a price that ran away is pulled back.
 */
export const getStockFairValue = (
    stock: Stock,
    player: Pick<Player, 'world'> | undefined,
    absoluteWeek: number,
): { fair: number; anchor: NonNullable<Stock['fairAnchor']> } => {
    const start = INITIAL_STOCKS.find(item => item.id === stock.id);
    const catalogue = stock.relatedStudioId ? STUDIO_CATALOG[stock.relatedStudioId as keyof typeof STUDIO_CATALOG] : undefined;
    const anchor = stock.fairAnchor ?? {
        week: absoluteWeek,
        price: start?.price ?? stock.price,
        value: catalogue ? valueWorldStudio({ id: catalogue.id, valuation: catalogue.valuation }, absoluteWeek).equityValue : 0,
        shares: start?.outstandingShares ?? getStockOutstandingShares(stock),
    };
    /* new shares since the anchor dilute what each one is worth */
    const dilution = (anchor.shares || getStockOutstandingShares(stock)) / Math.max(1, getStockOutstandingShares(stock));
    const studio = stock.relatedStudioId ? player?.world.studios?.[stock.relatedStudioId] : undefined;
    if (studio && anchor.value > 0) return { fair: anchor.price * valueWorldStudio(studio, absoluteWeek).equityValue / anchor.value * dilution, anchor };
    return { fair: anchor.price * Math.exp((SECTOR_GROWTH[stock.sector] ?? 0.04) * (absoluteWeek - anchor.week) / 52) * dilution, anchor };
};

export const processStockMarket = (
    stocks: Stock[],
    week: number,
    player?: Pick<Player, 'age' | 'world' | 'businesses' | 'flags'> & { id?: string } & Partial<Pick<Player, 'portfolio' | 'activeSponsorships' | 'stats' | 'name'>>,
): MarketUpdateResult => {
    const notifications: string[] = [], news: NewsItem[] = [];
    const corporateActions: StockCorporateAction[] = [];
    const earningsReports: MarketUpdateResult['earningsReports'] = [];
    const age = player?.age || 1;
    const absoluteWeek = getStockMarketAbsoluteWeek(age, week);
    const updatedStocks = stocks.map(originalStock => {
        // An heir can restart the actor-age clock while retaining the parent's securities.
        // Translate intervals from the last known market date; never replay old payouts.
        let stock = originalStock;
        if (Number.isSafeInteger(stock.lastMarketProcessedAbsoluteWeek) && stock.lastMarketProcessedAbsoluteWeek! > absoluteWeek) {
            const offset = stock.lastMarketProcessedAbsoluteWeek! - absoluteWeek;
            const rebase = (value?: number) => value === undefined ? undefined : value - offset;
            stock = { ...stock, lastMarketProcessedAbsoluteWeek: absoluteWeek - 1,
                lastDividendPayoutAbsoluteWeek: rebase(stock.lastDividendPayoutAbsoluteWeek),
                lastDividendSettledAbsoluteWeek: rebase(stock.lastDividendSettledAbsoluteWeek),
                lastShareIssueAbsoluteWeek: rebase(stock.lastShareIssueAbsoluteWeek) };
        }
        if (stock.lastMarketProcessedAbsoluteWeek !== undefined && stock.lastMarketProcessedAbsoluteWeek >= absoluteWeek) return stock;
        const normalizedPrice = normalizeStockPrice(stock, stock.price);
        const normalizedHistory = normalizeStockPriceHistory(stock);
        if (isStockRetiredByMerger(player, stock) || isStockRetiredBySale(player, stock)) {
            return { ...stock, lastMarketProcessedAbsoluteWeek: absoluteWeek,
                outstandingShares: getStockOutstandingShares(stock), price: normalizedPrice, priceHistory: normalizedHistory };
        }
        /* #185: the price moves towards what the company is worth (15% of the gap a week), with momentum, the sector's
           mood and noise seeded by the career, the company and the week. Stocks fix (2026-11-08): what a company is worth
           now comes from its quarterly results and the parts of it that live in the game's world (services/stockEarnings.ts).
           The #185 value only seeds a stock's first week on that model, so no saved price jumps. */
        const shares = getStockOutstandingShares(stock);
        let earnings = (stock as StockWithEarnings).earnings;
        let fairAnchor = stock.fairAnchor;
        if (!isValidEarningsState(earnings)) {
            const valued = getStockFairValue(stock, player, absoluteWeek);
            fairAnchor = valued.anchor;
            earnings = initStockEarnings(stock, player, absoluteWeek, valued.fair, shares);
        }
        let report: StockEarningsReport | undefined;
        if (absoluteWeek >= earnings.nextResultsAbsoluteWeek) {
            const reported = reportStockQuarter(stock, earnings, player, absoluteWeek, `${player?.id || 'market'}`);
            earnings = reported.state;
            report = reported.report;
        }
        const fair = getEarningsFairValue(stock, earnings, player, absoluteWeek, shares);
        const lastMove = normalizedHistory.length >= 2 ? normalizedHistory.at(-1)! / Math.max(0.01, normalizedHistory.at(-2)!) - 1 : 0;
        const step = nextSharePrice({
            previous: normalizedPrice,
            fair: softenFairValueUnderCeiling(fair, getStockPriceCeiling(stock)),
            lastMove,
            sector: stock.sector,
            absoluteWeek,
            events: report?.priceReaction || 0,
            volatility: stock.volatility,
            seed: `${player?.id || 'market'}:${stock.id}`,
        });
        let newPrice = normalizeStockPrice(stock, normalizedPrice * clampFinite(step.price / normalizedPrice, 1 - MAX_WEEKLY_PRICE_MOVE, 1 + MAX_WEEKLY_PRICE_MOVE));
        let lastPayoutAbsolute = stock.lastDividendPayoutAbsoluteWeek
            ?? stockLegacyMarkerAbsoluteWeek(age, week, stock.lastDividendPayoutWeek);
        let lastPayout = stock.lastDividendPayoutWeek || 0;
        /* Stocks fix: dividends are quarterly, every 13 weeks (it was 12 weeks at a quarter of the year's dividend each, 8%
           over the stated yield), and the price drops by the dividend on its payout week, as on a real ex-dividend day, so
           buying the week before and selling the week after earns nothing. */
        if (stock.dividendYield > 0 && absoluteWeek - lastPayoutAbsolute >= DIVIDEND_EVERY_WEEKS) {
            lastPayoutAbsolute = absoluteWeek;
            lastPayout = week;
            const dividendShare = Math.min(0.1, stock.dividendYield * getStudioDividendMultiplier(player as Player | undefined, stock) / 4);
            newPrice = normalizeStockPrice(stock, newPrice * (1 - dividendShare));
        }
        const lastIssue = stock.lastShareIssueAbsoluteWeek
            ?? (stock.lastShareIssueWeek ? stockLegacyMarkerAbsoluteWeek(age, week, stock.lastShareIssueWeek) : getStockMarketAbsoluteWeek(age, 1) - 1);
        const nextStock: StockWithEarnings = { ...stock, outstandingShares: shares, price: newPrice,
            priceHistory: [...normalizedHistory, newPrice].slice(-20), lastDividendPayoutWeek: lastPayout,
            lastDividendPayoutAbsoluteWeek: lastPayoutAbsolute, lastMarketProcessedAbsoluteWeek: absoluteWeek,
            lastShareIssueAbsoluteWeek: lastIssue, fairAnchor, earnings };
        if (report) {
            const playerName = player?.name;
            const described = describeEarningsReport(stock, report, playerName);
            earningsReports.push({ stockId: stock.id, stockSymbol: stock.symbol, verdict: report.verdict,
                notification: `${stock.symbol}: ${described.headline}. ${described.detail}` });
            // in the news when it matters: a company the player holds, or a result far from expectations
            const held = Boolean(player?.portfolio?.some(item => item.stockId === stock.id && item.shares > 0));
            if (held || Math.abs(report.surprise) > getCompanyProfile(stock).spread) news.push(createEarningsNews(stock, report, week, age, playerName));
        }
        if (shouldIssueSharesThisWeek(nextStock, absoluteWeek, lastIssue)) {
            const issuePercent = 2 + (stableShareHash(`${nextStock.id}:${absoluteWeek}:issue-percent`) % 5);
            const issuance = applyStockShareIssuance(nextStock, { issuePercent, week, year: age, reason: getAutomaticShareIssueReason(nextStock) });
            corporateActions.push(issuance.action); news.push(issuance.action.news); notifications.push(issuance.action.notification);
            return { ...issuance.stock, lastShareIssueAbsoluteWeek: absoluteWeek };
        }
        return nextStock;
    });
    return { stocks: updatedStocks, dividendsTotal: 0, notifications, news, corporateActions, earningsReports };
};

/** Call only after both personal and corporate dividend receipts have settled successfully. */
export const markStockDividendsSettled = (player: Player, week: number, age = player.age): Player => {
    const absoluteWeek = getStockMarketAbsoluteWeek(age, week);
    return { ...player, stocks: player.stocks.map(stock => stock.lastDividendPayoutAbsoluteWeek === absoluteWeek
        ? { ...stock, lastDividendSettledAbsoluteWeek: absoluteWeek } : stock) };
};

const hasDividendDue = (stock: Stock, week: number, player?: Pick<Player, 'age'>): boolean => {
    if (stock.lastDividendPayoutAbsoluteWeek !== undefined) {
        const absoluteWeek = player ? getStockMarketAbsoluteWeek(player.age, week) : stock.lastMarketProcessedAbsoluteWeek;
        return stock.lastDividendPayoutAbsoluteWeek === absoluteWeek && stock.lastDividendSettledAbsoluteWeek !== absoluteWeek;
    }
    return stock.lastDividendPayoutWeek === week;
};

export const calculatePortfolioValue = (portfolio: PortfolioItem[], stocks: Stock[]): number => {
    return portfolio.reduce((total, item) => {
        const stock = stocks.find(s => s.id === item.stockId);
        if (!stock) return total;
        const shares = Math.min(
            getStockOutstandingShares(stock),
            Math.max(0, Math.floor(Number.isFinite(item.shares) ? item.shares : 0)),
        );
        return total + (shares * normalizeStockPrice(stock, stock.price));
    }, 0);
};

const getStudioDividendMultiplier = (player: Player | undefined, stock: Stock) => {
    if (!player || !stock.relatedStudioId) return 1;
    const venture = player.world.npcVentures?.[stock.relatedStudioId];
    const ventureProfit = venture?.history?.slice(-4).reduce((sum, entry) => sum + (entry.profit || 0), 0);
    if (typeof ventureProfit === 'number' && venture?.history?.length) {
        return Math.max(0.4, Math.min(1.6, 1 + (ventureProfit / 500_000_000)));
    }

    const recentProjects = (player.world.projects || [])
        .filter(project => project.studioId === stock.relatedStudioId)
        .sort((a, b) => (b.year - a.year) || (b.weekReleased - a.weekReleased))
        .slice(0, 4);
    if (!recentProjects.length) return 1;
    const performanceScore = recentProjects.reduce((score, project) => {
        const outcome = (project.reviews || '').toUpperCase();
        if (outcome.includes('BLOCKBUSTER') || outcome.includes('HIT') || outcome.includes('SUCCESS')) return score + 0.12;
        if (outcome.includes('FLOP') || outcome.includes('BOMB') || outcome.includes('DISASTER')) return score - 0.18;
        return score;
    }, 0);
    return Math.max(0.4, Math.min(1.6, 1 + performanceScore));
};

export const getEstimatedAnnualDividend = (
    player: Player,
    stock: Stock,
    shares: number,
) => Math.floor(
    Math.max(0, shares)
    * normalizeStockPrice(stock, stock.price)
    * Math.max(0, stock.dividendYield)
    * getStudioDividendMultiplier(player, stock),
);

export const getDividendPayout = (
    portfolio: PortfolioItem[],
    stocks: Stock[],
    week: number,
    player?: Player,
): number => {
    let total = 0;
    let mixedPersonalTotal = 0;
    portfolio.forEach(item => {
        const stock = stocks.find(s => s.id === item.stockId);
        if (stock && player && (isStockRetiredByMerger(player, stock) || isStockRetiredBySale(player, stock))) return;
        if (stock && stock.dividendYield > 0 && hasDividendDue(stock, week, player)) {
            const gross = player
                ? getEstimatedAnnualDividend(player, stock, item.shares) / 4
                : ((normalizeStockPrice(stock, stock.price) * stock.dividendYield * item.shares) / 4);
            const allocations = getStockHoldingAllocations(item);
            if (allocations.corporate.length) {
                /* 2026-11-11 (1.0.27 hotfix): a split that cannot be made pays the personal part by share count */
                try {
                    mixedPersonalTotal += splitStockReceipt(item, item.shares, Math.floor(gross)).receipts.find(row => !row.ownerStudioId)?.proceeds || 0;
                } catch {
                    if (item.shares > 0 && Number.isFinite(gross)) total += gross * (allocations.personalShares / item.shares);
                }
            } else total += gross;
        }
    });
    return roundStockCash(Math.floor(total) + mixedPersonalTotal);
};

export const getCorporateStockDividendReceipts = (player: Player, week: number): Array<{ ownerStudioId: string; stockId: string; amount: number }> => {
    const receipts: Array<{ ownerStudioId: string; stockId: string; amount: number }> = [];
    for (const item of player.portfolio) {
        const stock = player.stocks.find(candidate => candidate.id === item.stockId);
        if (!stock || stock.dividendYield <= 0 || !hasDividendDue(stock, week, player)
            || isStockRetiredByMerger(player, stock) || isStockRetiredBySale(player, stock)) continue;
        /* 2026-11-11 (1.0.27 hotfix): a holding with no company shares has no company receipt (same result as
           before, without the split), and a split that cannot be made skips that one receipt instead of the week */
        if (!getStockHoldingAllocations(item).corporate.length) continue;
        const amount = Math.floor(getEstimatedAnnualDividend(player, stock, item.shares) / 4);
        let split: ReturnType<typeof splitStockReceipt>;
        try { split = splitStockReceipt(item, item.shares, amount); } catch { continue; }
        for (const row of split.receipts) if (row.ownerStudioId && row.proceeds > 0) receipts.push({ ownerStudioId: row.ownerStudioId, stockId: stock.id, amount: row.proceeds });
    }
    return receipts;
};
