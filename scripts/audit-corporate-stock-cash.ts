import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { createBusiness } from '../services/businessLogic';
import { getStockHoldingAllocations, splitStockReceipt } from '../services/stockCashOwnership';
import { createStudioSaleDeck, getStudioSaleValuation } from '../services/studioSale';
import { executeStockTrade, getDividendPayout, initializeStocks } from '../services/stockLogic';

const fixture = (): Player => {
    const p = structuredClone(INITIAL_PLAYER);
    p.id = 'corporate-stock-audit'; p.age = 36; p.currentWeek = 12; p.money = 1_000_000;
    const owner = createBusiness('Funding Studio', 'PRODUCTION_HOUSE', 'MAJOR_STUDIO', {} as any, '🎬', 1, 36);
    owner.id = 'corporate-owner'; owner.balance = 800_000;
    p.businesses = [owner]; p.flags = {}; p.stocks = initializeStocks(); p.finance.history = [];
    p.portfolio = [{ stockId: 'stk_apple', shares: 100, averageCost: 100, totalInvested: 10_000,
        equityFunding: [{ ownerStudioId: owner.id, shares: 100 }] }];
    return p;
};
const cases: Array<[string, () => void]> = [];
cases.push(['company-funded stock sale returns proceeds to company, not personal wallet', () => {
    const p = fixture(); const sold = executeStockTrade(p, 'stk_apple', -100);
    assert.ok(sold.success, sold.reason);
    assert.equal(sold.player.money, p.money);
    assert.equal(sold.player.businesses[0].balance - p.businesses[0].balance, sold.quote!.estimatedValue);
    assert.equal(sold.player.portfolio.length, 0);
}]);
cases.push(['personal purchases preserve existing corporate funding allocation', () => {
    const p = fixture(); const bought = executeStockTrade(p, 'stk_apple', 10);
    assert.ok(bought.success, bought.reason);
    assert.deepEqual(bought.player.portfolio[0].equityFunding, p.portfolio[0].equityFunding);
    assert.equal(bought.player.portfolio[0].shares, 110);
}]);
cases.push(['corporate dividends are excluded from direct personal dividend payout', () => {
    const p = fixture(); const stock = p.stocks.find(s => s.id === 'stk_apple')!;
    stock.lastDividendPayoutWeek = 12; stock.dividendYield = .04;
    assert.equal(getDividendPayout(p.portfolio, p.stocks, 12, p), 0);
}]);
cases.push(['mixed stock sale allocates proceeds and remaining share ownership', () => {
    const p = fixture(); p.portfolio[0].shares = 200;
    const sold = executeStockTrade(p, 'stk_apple', -100);
    assert.ok(sold.success, sold.reason);
    const company = sold.player.businesses[0].balance - p.businesses[0].balance;
    const personal = sold.player.money - p.money;
    assert.equal(company + personal, sold.quote!.estimatedValue);
    assert.ok(Math.abs(company - personal) <= 1);
    assert.equal(sold.player.portfolio[0].equityFunding![0].shares, 50);
}]);
cases.push(['unknown corporate holder cannot cash out through personal wallet', () => {
    const p = fixture(); p.portfolio[0].equityFunding![0].ownerStudioId='missing';
    const result = executeStockTrade(p,'stk_apple',-100); assert.equal(result.success,false); assert.equal(result.reason,'OWNER_NOT_FOUND'); assert.equal(result.player,p);
}]);
cases.push(['live studio listing locks disposal of included corporate shares', () => {
    const p = fixture(); p.currentWeek=30;
    const value=getStudioSaleValuation(p,p.businesses[0]);
    const listed=createStudioSaleDeck(p,p.businesses[0].id,value.recommendedAsk,value.recommendedFloor);assert.ok(listed.success,listed.message);
    const result=executeStockTrade(listed.player,'stk_apple',-100);assert.equal(result.success,false);assert.equal(result.reason,'LIVE_SALE_LISTING');
}]);
cases.push(['untagged legacy personal shares still sell entirely to personal wallet', () => {
    const p=fixture(); delete p.portfolio[0].equityFunding;const result=executeStockTrade(p,'stk_apple',-100);assert.ok(result.success,result.reason);
    assert.equal(result.player.money-p.money,result.quote!.estimatedValue);assert.equal(result.player.businesses[0].balance,p.businesses[0].balance);
}]);
cases.push(['small mixed share splits conserve cash shares and each ownership bucket', () => {
    for(let shares=1;shares<=21;shares++) for(let corporate=0;corporate<=shares;corporate++) for(let sold=1;sold<=shares;sold++) {
        const holding={stockId:'rounding',shares,equityFunding:[{ownerStudioId:'company',shares:corporate}]};
        const result=splitStockReceipt(holding,sold,119*sold+1);assert.equal(result.receipts.reduce((n,row)=>n+row.soldShares,0),sold);assert.equal(result.receipts.reduce((n,row)=>n+row.proceeds,0),119*sold+1);
        assert.equal((result.remainingFunding[0]?.shares||0)+(result.receipts.find(row=>row.ownerStudioId)?.soldShares||0),corporate);
        assert.equal(getStockHoldingAllocations({...holding,shares:shares-sold,equityFunding:result.remainingFunding}).personalShares+(result.receipts.find(row=>!row.ownerStudioId)?.soldShares||0),shares-corporate);
    }
}]);
let failures = 0;
for (const [name, check] of cases) {
    try { check(); console.log('PASS', name); } catch (error) { failures++; console.error('FAIL', name, String(error)); }
}
assert.equal(failures, 0, `${failures}/${cases.length} corporate stock cash checks failed`);
console.log(`Corporate stock cash audit passed (${cases.length} checks).`);
