import { INITIAL_PLAYER } from '../types';
import {
    applyStockShareIssuance,
    getStockOutstandingShares,
    initializeStocks,
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

console.log('Stock share structure audit passed.');
