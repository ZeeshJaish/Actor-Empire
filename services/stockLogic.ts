
import { Stock, Player, PortfolioItem, NewsItem } from '../types';
import { getStudioStockPerformanceMultiplier } from './studioEcosystem';

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
    MEDIA: 1_500_000_000_000,
    FASHION: 1_000_000_000_000,
    BEVERAGE: 750_000_000_000,
    AUTOMOTIVE: 1_200_000_000_000,
};

const MAX_WEEKLY_PRICE_MOVE = 0.18;
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

export const getStockOutstandingShares = (stock: Pick<Stock, 'id' | 'outstandingShares'>): number => {
    const explicitShares = Number(stock.outstandingShares);
    const knownShares = KNOWN_OUTSTANDING_SHARES[stock.id];

    if (knownShares) {
        if (Number.isFinite(explicitShares) && explicitShares >= knownShares) {
            return Math.round(explicitShares);
        }
        return knownShares;
    }

    if (Number.isFinite(explicitShares) && explicitShares >= MIN_UNKNOWN_OUTSTANDING_SHARES) {
        return Math.round(explicitShares);
    }

    return getGeneratedOutstandingShares(stock.id);
};

const getStockReferencePrice = (stock: Pick<Stock, 'id'> & Partial<Pick<Stock, 'price'>>): number => {
    const reference = KNOWN_REFERENCE_PRICES[stock.id];
    if (reference) return reference;
    const current = Number(stock.price);
    return Number.isFinite(current) && current > 0 ? current : 100;
};

export const getStockPriceCeiling = (
    stock: Pick<Stock, 'id' | 'outstandingShares'> & Partial<Pick<Stock, 'sector' | 'price'>>,
): number => {
    const outstandingShares = getStockOutstandingShares(stock);
    const referencePrice = getStockReferencePrice(stock);
    const sectorCap = stock.sector ? MARKET_CAP_CEILING_BY_SECTOR[stock.sector] : undefined;
    const sectorPriceCeiling = sectorCap ? sectorCap / outstandingShares : referencePrice * 8;
    return roundPrice(Math.max(referencePrice * 6, sectorPriceCeiling, 10));
};

export const normalizeStockPrice = (
    stock: Pick<Stock, 'id' | 'outstandingShares'> & Partial<Pick<Stock, 'sector' | 'price'>>,
    price: number,
): number => {
    const referencePrice = getStockReferencePrice(stock);
    const floor = Math.max(0.01, referencePrice * 0.04);
    const ceiling = getStockPriceCeiling(stock);
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
    reason?: 'STOCK_NOT_FOUND' | 'INVALID_AMOUNT' | 'INSUFFICIENT_CASH' | 'INSUFFICIENT_SHARES';
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
    const sharesIssued = Math.max(1, Math.round(oldOutstandingShares * (issuePercent / 100)));
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
    const priceImpactPercent = liquidityImpact * 100 * (direction === 'BUY' ? 1 : -1);
    const projectedPrice = normalizeStockPrice(stock, currentPrice * (1 + (priceImpactPercent / 100)));
    const estimatedValue = shares * ((currentPrice + projectedPrice) / 2);

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

export const executeStockTrade = (
    player: Player,
    stockId: string,
    signedShares: number,
): StockTradeResult => {
    const stock = player.stocks.find(candidate => candidate.id === stockId);
    if (!stock) return { success: false, player, reason: 'STOCK_NOT_FOUND' };
    const requestedShares = Math.floor(Math.abs(signedShares));
    if (!Number.isFinite(requestedShares) || requestedShares <= 0) return { success: false, player, reason: 'INVALID_AMOUNT' };

    const quote = calculateStockTradeQuote(player, stock, signedShares);
    const shares = quote.shares;
    if (shares <= 0) return { success: false, player, quote, reason: 'INVALID_AMOUNT' };
    const holding = player.portfolio.find(item => item.stockId === stockId);

    if (quote.direction === 'BUY') {
        if (player.money < quote.estimatedValue) return { success: false, player, quote, reason: 'INSUFFICIENT_CASH' };
        const existingShares = holding?.shares || 0;
        const existingInvested = holding?.totalInvested ?? (existingShares * (holding?.averageCost || quote.currentPrice));
        const totalInvested = existingInvested + quote.estimatedValue;
        const nextShares = existingShares + shares;
        const nextHolding: PortfolioItem = {
            stockId,
            shares: nextShares,
            totalInvested,
            averageCost: totalInvested / nextShares,
        };
        const portfolio = holding
            ? player.portfolio.map(item => item.stockId === stockId ? nextHolding : item)
            : [...player.portfolio, nextHolding];
        return {
            success: true,
            quote,
            player: {
                ...player,
                money: player.money - quote.estimatedValue,
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
    const averageCost = holding.averageCost || quote.currentPrice;
    const nextShares = holding.shares - shares;
    const remainingInvested = Math.max(0, (holding.totalInvested ?? (holding.shares * averageCost)) - (averageCost * shares));
    const portfolio = nextShares === 0
        ? player.portfolio.filter(item => item.stockId !== stockId)
        : player.portfolio.map(item => item.stockId === stockId
            ? {
                ...item,
                shares: nextShares,
                totalInvested: remainingInvested,
                averageCost,
            }
            : item);

    return {
        success: true,
        quote,
        player: {
            ...player,
            money: player.money + quote.estimatedValue,
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
}

const getAutomaticShareIssueReason = (stock: Stock): StockShareIssueReason => {
    if (stock.sector === 'MEDIA') return 'SLATE_FINANCING';
    if (stock.volatility >= 0.05) return 'DEBT_REDUCTION';
    return 'GENERAL_CAPITAL';
};

const shouldIssueSharesThisWeek = (stock: Stock, week: number) => {
    if (week < 12) return false;
    if (stock.lastShareIssueWeek && week - stock.lastShareIssueWeek < 52) return false;
    const cadence = 52 + (stableShareHash(`${stock.id}:cadence`) % 53);
    const targetWeek = stableShareHash(`${stock.id}:issue-week`) % cadence;
    return week % cadence === targetWeek;
};

export const processStockMarket = (
    stocks: Stock[],
    week: number,
    player?: Pick<Player, 'age' | 'world' | 'businesses' | 'flags'>,
): MarketUpdateResult => {
    let dividendsTotal = 0;
    const notifications: string[] = [];
    const news: NewsItem[] = [];
    const corporateActions: StockCorporateAction[] = [];
    const updatedStocks = stocks.map(stock => {
        const normalizedPrice = normalizeStockPrice(stock, stock.price);
        const normalizedHistory = normalizeStockPriceHistory(stock);
        if (isStockRetiredByMerger(player, stock) || isStockRetiredBySale(player, stock)) {
            return {
                ...stock,
                outstandingShares: getStockOutstandingShares(stock),
                price: normalizedPrice,
                priceHistory: normalizedHistory,
            };
        }
        let newPrice = normalizedPrice;
        
        // 1. Random Walk Logic
        const volatility = stock.volatility;
        const trend = (Math.random() - 0.48); // Slight bias upwards (market grows long term)
        const changePercent = trend * volatility; // e.g. 0.02 * 0.05 = 0.001 (0.1%) to 5% swings
        
        const rawMultiplier = (1 + changePercent) * getStudioStockPerformanceMultiplier(player, stock);
        const boundedMultiplier = clampFinite(rawMultiplier, 1 - MAX_WEEKLY_PRICE_MOVE, 1 + MAX_WEEKLY_PRICE_MOVE);
        newPrice = normalizeStockPrice(stock, newPrice * boundedMultiplier);
        
        // 2. Dividend Logic (Quarterly - Every 12 weeks approx)
        let lastPayout = stock.lastDividendPayoutWeek || 0;
        if (stock.dividendYield > 0 && (week - lastPayout >= 12)) {
            // Payout is approximately (Price * Yield) / 4 (Quarterly)
            // But simplify: Yield is annual %
            const quarterlyYield = stock.dividendYield / 4;
            // Note: Actual cash addition happens if player owns shares, handled in gameLoop
            // Here we just mark it
            lastPayout = week;
            // In a real simulation, price drops by dividend amount, but we skip that for "fun" factor
        }

        const nextStock: Stock = {
            ...stock,
            outstandingShares: getStockOutstandingShares(stock),
            price: newPrice,
            priceHistory: [...normalizedHistory, newPrice].slice(-20),
            lastDividendPayoutWeek: lastPayout
        };

        if (shouldIssueSharesThisWeek(nextStock, week)) {
            const issuePercent = 2 + (stableShareHash(`${nextStock.id}:${week}:issue-percent`) % 5);
            const issuance = applyStockShareIssuance(nextStock, {
                issuePercent,
                week,
                year: player?.age || 0,
                reason: getAutomaticShareIssueReason(nextStock),
            });
            corporateActions.push(issuance.action);
            news.push(issuance.action.news);
            notifications.push(issuance.action.notification);
            return issuance.stock;
        }

        return nextStock;
    });

    return {
        stocks: updatedStocks,
        dividendsTotal, // Handled in gameLoop via portfolio check
        notifications,
        news,
        corporateActions,
    };
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
    portfolio.forEach(item => {
        const stock = stocks.find(s => s.id === item.stockId);
        if (stock && player && (isStockRetiredByMerger(player, stock) || isStockRetiredBySale(player, stock))) return;
        if (stock && stock.dividendYield > 0 && stock.lastDividendPayoutWeek === week) {
            total += player
                ? getEstimatedAnnualDividend(player, stock, item.shares) / 4
                : ((normalizeStockPrice(stock, stock.price) * stock.dividendYield * item.shares) / 4);
        }
    });
    return Math.floor(total);
};
