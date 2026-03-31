
import { Stock, Player, PortfolioItem } from '../types';

// --- INITIAL MARKET DATA ---
const INITIAL_STOCKS: Omit<Stock, 'priceHistory' | 'lastDividendPayoutWeek'>[] = [
    // --- TECH ---
    { id: 'stk_apple', symbol: 'AAPL', name: 'Apple Inc.', sector: 'TECH', price: 185.00, volatility: 0.02, dividendYield: 0.005, relatedBrandName: 'Apple', relatedStudioId: 'APPLE_TV' },
    { id: 'stk_amzn', symbol: 'AMZN', name: 'Amazon', sector: 'TECH', price: 145.00, volatility: 0.03, dividendYield: 0 },
    { id: 'stk_goog', symbol: 'GOOG', name: 'Alphabet', sector: 'TECH', price: 160.00, volatility: 0.025, dividendYield: 0 },
    
    // --- MEDIA / STUDIOS ---
    { id: 'stk_nflx', symbol: 'NFLX', name: 'Netflix', sector: 'MEDIA', price: 620.00, volatility: 0.05, dividendYield: 0, relatedStudioId: 'NETFLIX' },
    { id: 'stk_dis', symbol: 'DIS', name: 'Disney', sector: 'MEDIA', price: 110.00, volatility: 0.03, dividendYield: 0.01, relatedStudioId: 'DISNEY_PLUS' },
    { id: 'stk_wbd', symbol: 'WBD', name: 'Warner Bros. Discovery', sector: 'MEDIA', price: 12.50, volatility: 0.06, dividendYield: 0, relatedStudioId: 'WARNER_BROS' },
    { id: 'stk_para', symbol: 'PARA', name: 'Paramount Global', sector: 'MEDIA', price: 13.00, volatility: 0.06, dividendYield: 0.03, relatedStudioId: 'PARAMOUNT' },
    { id: 'stk_cmcsa', symbol: 'CMCSA', name: 'Comcast (Universal)', sector: 'MEDIA', price: 42.00, volatility: 0.02, dividendYield: 0.025, relatedStudioId: 'UNIVERSAL' },

    // --- BRANDS (Sponsorships) ---
    { id: 'stk_nke', symbol: 'NKE', name: 'Nike', sector: 'FASHION', price: 105.00, volatility: 0.02, dividendYield: 0.015, relatedBrandName: 'Nike' },
    { id: 'stk_ker', symbol: 'KER', name: 'Kering (Gucci)', sector: 'FASHION', price: 450.00, volatility: 0.04, dividendYield: 0.03, relatedBrandName: 'Gucci' },
    { id: 'stk_ko', symbol: 'KO', name: 'Coca-Cola', sector: 'BEVERAGE', price: 60.00, volatility: 0.01, dividendYield: 0.035, relatedBrandName: 'Coca-Cola' },
    { id: 'stk_pep', symbol: 'PEP', name: 'PepsiCo', sector: 'BEVERAGE', price: 168.00, volatility: 0.01, dividendYield: 0.03, relatedBrandName: 'Pepsi' },
    { id: 'stk_tsla', symbol: 'TSLA', name: 'Tesla', sector: 'AUTOMOTIVE', price: 175.00, volatility: 0.08, dividendYield: 0, relatedBrandName: 'Tesla' },
    { id: 'stk_tm', symbol: 'TM', name: 'Toyota', sector: 'AUTOMOTIVE', price: 230.00, volatility: 0.015, dividendYield: 0.025, relatedBrandName: 'Toyota' },
    { id: 'stk_race', symbol: 'RACE', name: 'Ferrari', sector: 'AUTOMOTIVE', price: 410.00, volatility: 0.03, dividendYield: 0.008, relatedBrandName: 'Ferrari' },
    
    // --- LUXURY ---
    { id: 'stk_lvmh', symbol: 'LVMH', name: 'LVMH', sector: 'FASHION', price: 850.00, volatility: 0.03, dividendYield: 0.015, relatedBrandName: 'Louis Vuitton' },
];

export const initializeStocks = (): Stock[] => {
    return INITIAL_STOCKS.map(s => ({
        ...s,
        priceHistory: Array(12).fill(s.price).map((p, i) => p * (1 + (Math.random() * 0.1 - 0.05))), // Fake history
        lastDividendPayoutWeek: 0
    }));
};

export interface MarketUpdateResult {
    stocks: Stock[];
    dividendsTotal: number;
    notifications: string[];
}

export const processStockMarket = (stocks: Stock[], week: number): MarketUpdateResult => {
    let dividendsTotal = 0;
    const notifications: string[] = [];
    const updatedStocks = stocks.map(stock => {
        let newPrice = stock.price;
        
        // 1. Random Walk Logic
        const volatility = stock.volatility;
        const trend = (Math.random() - 0.48); // Slight bias upwards (market grows long term)
        const changePercent = trend * volatility; // e.g. 0.02 * 0.05 = 0.001 (0.1%) to 5% swings
        
        newPrice = newPrice * (1 + changePercent);
        
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

        // 3. Update History
        const newHistory = [...stock.priceHistory, newPrice].slice(-20); // Keep last 20 weeks

        return {
            ...stock,
            price: Number(newPrice.toFixed(2)),
            priceHistory: newHistory,
            lastDividendPayoutWeek: lastPayout
        };
    });

    return {
        stocks: updatedStocks,
        dividendsTotal, // Handled in gameLoop via portfolio check
        notifications
    };
};

export const calculatePortfolioValue = (portfolio: PortfolioItem[], stocks: Stock[]): number => {
    return portfolio.reduce((total, item) => {
        const stock = stocks.find(s => s.id === item.stockId);
        return total + (item.shares * (stock?.price || 0));
    }, 0);
};

export const getDividendPayout = (portfolio: PortfolioItem[], stocks: Stock[], week: number): number => {
    let total = 0;
    portfolio.forEach(item => {
        const stock = stocks.find(s => s.id === item.stockId);
        if (stock && stock.dividendYield > 0 && stock.lastDividendPayoutWeek === week) {
            const quarterlyPerShare = (stock.price * stock.dividendYield) / 4;
            total += quarterlyPerShare * item.shares;
        }
    });
    return Math.floor(total);
};
