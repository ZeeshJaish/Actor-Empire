import { INITIAL_PLAYER } from '../types';
import {
    calculateStockTradeQuote,
    executeStockTrade,
    getDividendPayout,
    getSharesForCashOrder,
    getStockOutstandingShares,
    initializeStocks,
} from '../services/stockLogic';

const stocks = initializeStocks();
const stock = stocks.find(candidate => candidate.id === 'stk_dis');

if (!stock) throw new Error('Disney stock should exist for minority-stake audit.');

const player = {
    ...INITIAL_PLAYER,
    money: 5_000_000_000,
    stocks,
    portfolio: [],
};

const quote = calculateStockTradeQuote(player, stock, 1_000_000);
const expectedOwnership = (1_000_000 / getStockOutstandingShares(stock)) * 100;

if (Math.abs(quote.resultingOwnershipPercent - expectedOwnership) > 0.0001) {
    throw new Error('Trade quote should preview resulting ownership percentage.');
}
if (quote.priceImpactPercent <= 0) {
    throw new Error('Large stock purchases should create positive price impact.');
}
if (quote.projectedPrice <= stock.price) {
    throw new Error('Large purchase quote should preview a higher execution price.');
}

const cashBudget = 250_000_000;
const cashOrderShares = getSharesForCashOrder(player, stock, cashBudget);
const cashOrderQuote = calculateStockTradeQuote(player, stock, cashOrderShares);
if (cashOrderQuote.estimatedValue > cashBudget) {
    throw new Error('Cash-based order should not exceed the chosen cash budget after market impact.');
}
const nextCashQuote = calculateStockTradeQuote(player, stock, cashOrderShares + 1);
if (nextCashQuote.estimatedValue <= cashBudget) {
    throw new Error('Cash-based order should buy the maximum affordable whole-share quantity.');
}

const purchased = executeStockTrade(player, stock.id, 1_000_000);
if (!purchased.success) {
    throw new Error(`Minority stake purchase should succeed: ${purchased.reason || 'unknown'}.`);
}

const holding = purchased.player.portfolio.find(position => position.stockId === stock.id);
if (!holding || holding.shares !== 1_000_000) {
    throw new Error('Stock purchase should create the requested holding.');
}
if (!holding.totalInvested || !holding.averageCost) {
    throw new Error('Stock purchase should persist cost basis and invested value.');
}
if (purchased.player.stocks.find(candidate => candidate.id === stock.id)!.price <= stock.price) {
    throw new Error('Executed large purchase should affect the live stock price.');
}

const secondQuote = calculateStockTradeQuote(purchased.player, stock, 500_000);
const secondPurchase = executeStockTrade(purchased.player, stock.id, 500_000);
const updatedHolding = secondPurchase.player.portfolio.find(position => position.stockId === stock.id);

if (!secondPurchase.success || !updatedHolding || updatedHolding.shares !== 1_500_000) {
    throw new Error('Repeated purchases should accumulate shares.');
}
if (!updatedHolding.averageCost || updatedHolding.averageCost <= 0) {
    throw new Error('Repeated purchases should maintain weighted average cost.');
}
if (secondQuote.resultingOwnershipPercent <= quote.resultingOwnershipPercent) {
    throw new Error('Additional purchases should increase ownership.');
}

const sold = executeStockTrade(secondPurchase.player, stock.id, -250_000);
const soldHolding = sold.player.portfolio.find(position => position.stockId === stock.id);
if (!sold.success || !soldHolding || soldHolding.shares !== 1_250_000) {
    throw new Error('Selling should reduce the existing minority position.');
}
if ((soldHolding.totalInvested || 0) >= (updatedHolding.totalInvested || 0)) {
    throw new Error('Selling should reduce remaining invested cost basis.');
}

const dividendStock = {
    ...stock,
    lastDividendPayoutWeek: 12,
    dividendYield: 0.04,
};
const dividendPortfolio = [{ stockId: stock.id, shares: 1_000_000 }];
const profitablePlayer = {
    ...player,
    world: {
        ...player.world,
        projects: [{
            id: 'dividend_hit',
            title: 'Dividend Hit',
            studioId: stock.relatedStudioId,
            year: 31,
            weekReleased: 11,
            reviews: 'BLOCKBUSTER',
            quality: 88,
            boxOffice: 900_000_000,
        } as any],
    },
};
const strugglingPlayer = {
    ...player,
    world: {
        ...player.world,
        projects: [{
            id: 'dividend_flop',
            title: 'Dividend Flop',
            studioId: stock.relatedStudioId,
            year: 31,
            weekReleased: 11,
            reviews: 'FLOP',
            quality: 42,
            boxOffice: 25_000_000,
        } as any],
    },
};
const strongDividend = getDividendPayout(dividendPortfolio, [dividendStock], 12, profitablePlayer);
const weakDividend = getDividendPayout(dividendPortfolio, [dividendStock], 12, strugglingPlayer);
if (strongDividend <= weakDividend) {
    throw new Error('Profitable studio performance should produce a stronger dividend than a flop period.');
}

console.log('Minority stakes audit passed.');
