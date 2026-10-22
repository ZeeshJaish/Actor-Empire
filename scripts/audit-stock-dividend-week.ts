import assert from 'node:assert/strict';
import { INITIAL_PLAYER } from '../types';
import { initializeStocks, getDividendPayout } from '../services/stockLogic';
import { getStockMarketAbsoluteWeek } from '../services/stockMarketClock';
import { processGameWeek } from '../services/gameLoop';
import { createBusiness } from '../services/businessLogic';
import { migratePlayerSave } from '../services/saveMigration';

const p = structuredClone(INITIAL_PLAYER);
p.money = 1e6; p.age = 35; p.currentWeek = 12; p.stocks = initializeStocks(); p.world.projects = [];
const b = createBusiness('Funder', 'PRODUCTION_HOUSE', 'MAJOR_STUDIO', {} as any, '🎬', 1, 35);
b.id = 'funder'; b.balance = 1e6; p.businesses = [b];
p.stocks = p.stocks.map(s => ({ ...s, dividendYield: s.id === 'stk_nke' ? .02 : 0, volatility: 0 }));
p.portfolio = [{ stockId: 'stk_nke', shares: 2, averageCost: 105, totalInvested: 210, equityFunding: [{ ownerStudioId: b.id, shares: 1 }] }];
const originalRandom = Math.random;
Math.random = () => .5;
try {
    const result = await processGameWeek(migratePlayerSave(p));
    const stock = result.player.stocks.find(s => s.id === 'stk_nke')!;
    const personal = result.player.finance.history.filter(t => t.category === 'DIVIDEND' && t.description === 'Stock Dividends');
    assert.equal(personal.length, 1, 'actual weekly engine must credit the mixed personal half dollar');
    assert.equal(personal[0].amount, .5);
    const corporate = result.player.businesses.find(b => b.id === 'funder')!.studioState!.financeLedger.filter(l => l.type === 'INVESTMENT_RETURN');
    assert.equal(corporate.reduce((sum, tx) => sum + tx.amount, 0), .5);
    assert.equal(stock.lastDividendSettledAbsoluteWeek, getStockMarketAbsoluteWeek(35, 12), 'settle the source week, before the engine advances its clock');
    const reloaded = migratePlayerSave(JSON.parse(JSON.stringify(result.player)));
    assert.equal(getDividendPayout(reloaded.portfolio, reloaded.stocks, 12, { ...reloaded, age: 35 }), 0, 'settled reload cannot repay the paid source week');
    const next = await processGameWeek(reloaded);
    assert.equal(next.player.finance.history.filter(t => t.category === 'DIVIDEND' && t.description === 'Stock Dividends').length, 1);
    assert.equal(p.money, 1e6);
    console.log('Actual weekly mixed dividend cents, source clock, reload and next week passed');
} finally { Math.random = originalRandom; }
