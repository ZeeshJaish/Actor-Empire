import { INITIAL_PLAYER } from '../types';
import {
    applyStockShareIssuance,
    getStockOutstandingShares,
    getStockPriceCeiling,
    initializeStocks,
    processStockMarket,
} from '../services/stockLogic';
import { getEntertainmentStockSnapshot } from '../services/entertainmentStockMarket';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const stocks = initializeStocks();

for (const stock of stocks) {
    assert(Number.isFinite(stock.outstandingShares) && (stock.outstandingShares || 0) > 0, `${stock.symbol} should have explicit issued/outstanding shares.`);
    assert(getStockOutstandingShares(stock) === stock.outstandingShares, `${stock.symbol} share math should use the stock's explicit share count.`);
}

const disney = stocks.find(stock => stock.id === 'stk_dis');
if (!disney) throw new Error('Disney stock should exist.');

const player = {
    ...INITIAL_PLAYER,
    stocks,
    portfolio: [{
        stockId: disney.id,
        shares: Math.floor(getStockOutstandingShares(disney) * 0.10),
        averageCost: disney.price,
        totalInvested: Math.floor(getStockOutstandingShares(disney) * 0.10) * disney.price,
    }],
};

const beforeSnapshot = getEntertainmentStockSnapshot(player, disney);
const issuance = applyStockShareIssuance(disney, {
    issuePercent: 10,
    week: 30,
    year: 41,
    reason: 'SLATE_FINANCING',
});
const afterSnapshot = getEntertainmentStockSnapshot(player, issuance.stock);

assert(issuance.action.type === 'SHARE_ISSUANCE', 'Corporate action should be a share issuance.');
assert(issuance.stock.outstandingShares === Math.round((disney.outstandingShares || 0) * 1.10), 'Share issuance should increase outstanding shares by the issue percent.');
assert(afterSnapshot.ownershipPercent < beforeSnapshot.ownershipPercent, 'Existing shareholders should be diluted after new shares are issued.');
assert(issuance.action.news.headline.includes('issues new shares'), 'Share issuance should create a clear news headline.');
assert(issuance.action.news.subtext?.includes('dilut'), 'Share issuance news should explain dilution.');
assert(issuance.action.notification.includes(disney.symbol), 'Share issuance should provide a stock ticker notification.');
assert(issuance.stock.price !== disney.price, 'Share issuance should reprice the stock from the new share structure.');
assert(issuance.stock.price <= getStockPriceCeiling(issuance.stock), 'Share issuance should keep repriced shares under the market cap ceiling.');

const originalRandom = Math.random;
let runawayStocks = stocks.map(stock => stock.id === disney.id
    ? { ...stock, price: 2.4e50, priceHistory: [stock.price, 5e20, 2.4e50] }
    : stock);
const runawayPlayer = {
    ...INITIAL_PLAYER,
    age: 21,
    currentWeek: 1,
    stocks: runawayStocks,
    portfolio: [],
    world: {
        ...INITIAL_PLAYER.world,
        projects: Array.from({ length: 8 }, (_, index) => ({
            id: `disney_hit_${index}`,
            title: `Disney Hit ${index}`,
            studioId: 'DISNEY_PLUS',
            year: 20 + index,
            weekReleased: 1,
            boxOffice: 1_000_000_000,
            quality: 92,
            reviews: 'BLOCKBUSTER',
        })) as any[],
    },
};
try {
    Math.random = () => 0.99;
    for (let week = 1; week <= 156; week += 1) {
        const result = processStockMarket(runawayStocks, week, runawayPlayer);
        runawayStocks = result.stocks;
    }
} finally {
    Math.random = originalRandom;
}
const processedDisney = runawayStocks.find(stock => stock.id === disney.id)!;
assert(Number.isFinite(processedDisney.price), 'Runaway media stock price should remain finite after repeated market updates.');
assert(processedDisney.price <= getStockPriceCeiling(processedDisney), 'Runaway media stock price should stay under the market cap ceiling.');
assert(processedDisney.priceHistory.every(price => Number.isFinite(price) && price <= getStockPriceCeiling(processedDisney)), 'Runaway media stock history should stay finite and capped.');

console.log('Stock share structure audit passed.');
