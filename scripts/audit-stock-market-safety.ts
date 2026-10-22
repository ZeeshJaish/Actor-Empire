import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { createBusiness } from '../services/businessLogic';
import { executeStockTrade, initializeStocks, processStockMarket, getDividendPayout, getCorporateStockDividendReceipts, getStockPriceCeiling, getStockMarketCapCeiling, getStockOutstandingShares, markStockDividendsSettled } from '../services/stockLogic';
import { getStudioStockPerformanceMultiplier } from '../services/studioEcosystem';
import { getEntertainmentStockSnapshot } from '../services/entertainmentStockMarket';
import { splitStockReceipt } from '../services/stockCashOwnership';
import { formatMoney } from '../services/formatUtils';
const fixture = (): Player => { const p=structuredClone(INITIAL_PLAYER); p.id='stock-market-safety';p.age=18;p.currentWeek=1;p.money=1e6;p.stocks=initializeStocks();p.portfolio=[];p.businesses=[];if(p.world.studios?.PARAMOUNT){p.world.studios.PARAMOUNT.reputation=55;p.world.studios.PARAMOUNT.slateMomentum=50;}return p; };
const cases:Array<[string,()=>void]>=[];
cases.push(['SX cash cannot buy a share with a no-op debit',()=>{const p=fixture();p.money=10.6e21;const r=executeStockTrade(p,'stk_para',1);assert.equal(r.success,false);assert.equal(r.player,p);}]);
cases.push(['SX corporate treasury cannot consume a share on an unrepresentable sale credit',()=>{const p=fixture();const b=createBusiness('Owner','PRODUCTION_HOUSE','MAJOR_STUDIO',{} as any,'🎬',1,18);b.id='funder';b.balance=10.6e21;p.businesses=[b];p.portfolio=[{stockId:'stk_para',shares:100,averageCost:13,totalInvested:1300,equityFunding:[{ownerStudioId:b.id,shares:100}]}];const r=executeStockTrade(p,'stk_para',-1);assert.equal(r.success,false);assert.equal(r.player,p);}]);
cases.push(['unrepresentable historical basis cannot be silently consumed on a partial sale',()=>{const p=fixture();p.portfolio=[{stockId:'stk_para',shares:100,averageCost:1e21,totalInvested:1e23}];const r=executeStockTrade(p,'stk_para',-1);assert.equal(r.success,false);assert.equal(r.player,p);}]);
cases.push(['contradictory corporate share rights cannot silently become a personal trade',()=>{const p=fixture();p.portfolio=[{stockId:'stk_para',shares:100,averageCost:13,totalInvested:1300,equityFunding:[{ownerStudioId:'',shares:100}]}];const r=executeStockTrade(p,'stk_para',-50);assert.equal(r.success,false);assert.equal(r.player,p);}]);
cases.push(['large mixed holdings allocate receipts to the exact owners',()=>{const holding={stockId:'stk_apple',shares:41_821_327_579,equityFunding:[{ownerStudioId:'A',shares:25_478_951_970},{ownerStudioId:'B',shares:4_047_777_723}]};const r=splitStockReceipt(holding,holding.shares,3_351_846_456_294);assert.deepEqual(r.receipts.map(x=>x.proceeds),[985_372_936_282.44,2_042_057_003_317.43,324_416_516_694.13]);}]);
cases.push(['integer proceeds still preserve each owner\'s exact cent entitlement',()=>{const holding={stockId:'custom',shares:2,equityFunding:[{ownerStudioId:'corp',shares:1}]};assert.deepEqual(splitStockReceipt(holding,2,27).receipts.map(row=>row.proceeds),[13.5,13.5]);}]);
cases.push(['mixed dividend payment preserves the personal half dollar',()=>{const p=fixture();p.portfolio=[{stockId:'stk_para',shares:800,equityFunding:[{ownerStudioId:'corp',shares:400}]}];const s=p.stocks.find(s=>s.id==='stk_para')!;s.price=13.5;s.dividendYield=.01;s.lastDividendPayoutWeek=1;assert.equal(getDividendPayout(p.portfolio,p.stocks,1,p),13.5);assert.equal(getCorporateStockDividendReceipts(p,1)[0].amount,13.5);}]);
cases.push(['zero historical basis remains zero through partial disposal',()=>{const p=fixture();p.portfolio=[{stockId:'stk_para',shares:100,averageCost:0,totalInvested:0}];const r=executeStockTrade(p,'stk_para',-50);assert.equal(r.success,true);assert.equal(r.player.portfolio[0].shares,50);assert.equal(r.player.portfolio[0].averageCost,0);assert.equal(r.player.portfolio[0].totalInvested,0);}]);
cases.push(['legacy zero average cost cannot become an invented basis on purchase',()=>{const p=fixture();p.portfolio=[{stockId:'stk_para',shares:100,averageCost:0}];const r=executeStockTrade(p,'stk_para',1);assert.equal(r.success,true);assert.equal(r.player.portfolio[0].totalInvested,r.quote!.estimatedValue);}]);
cases.push(['purchase preserves an existing unknown historical basis',()=>{const p=fixture();p.portfolio=[{stockId:'stk_para',shares:100}];const r=executeStockTrade(p,'stk_para',1);assert.equal(r.success,true);assert.equal(r.player.portfolio[0].shares,101);assert.equal(r.player.portfolio[0].totalInvested,undefined);assert.equal(r.player.portfolio[0].averageCost,undefined);assert.equal(Math.round((p.money-r.player.money)*100),Math.round(r.quote!.estimatedValue*100));}]);
cases.push(['partial disposal preserves unknown historical basis and settles cash',()=>{const p=fixture();p.portfolio=[{stockId:'stk_para',shares:100}];const r=executeStockTrade(p,'stk_para',-50);assert.equal(r.success,true);assert.equal(r.player.portfolio[0].shares,50);assert.equal(r.player.portfolio[0].totalInvested,undefined);assert.equal(r.player.portfolio[0].averageCost,undefined);assert.equal(Math.round((r.player.money-p.money)*100),Math.round(r.quote!.estimatedValue*100));}]);
cases.push(['a new holding records only its actual purchase cost',()=>{const p=fixture();const r=executeStockTrade(p,'stk_para',10);assert.equal(r.success,true);assert.equal(r.player.portfolio[0].totalInvested,r.quote!.estimatedValue);assert.equal(r.player.portfolio[0].averageCost,r.quote!.estimatedValue/10);}]);
cases.push(['same absolute week cannot reprice stock twice',()=>{const p=fixture();const first=processStockMarket(p.stocks,1,p);const again=processStockMarket(first.stocks,1,p);assert.deepEqual(again.stocks,first.stocks);}]);
cases.push(['an inherited future market clock cannot freeze the heir market',()=>{const p=fixture();p.stocks=p.stocks.map(s=>({...s,lastMarketProcessedAbsoluteWeek:2100,lastDividendPayoutAbsoluteWeek:2094,lastDividendSettledAbsoluteWeek:2094,lastShareIssueAbsoluteWeek:2070}));const r=processStockMarket(p.stocks,1,p);assert.equal(r.stocks[0].lastMarketProcessedAbsoluteWeek,884);assert.equal(r.stocks[0].lastDividendPayoutAbsoluteWeek,878);assert.equal(getDividendPayout([],r.stocks,1,p),0);}]);
cases.push(['quarterly dividends continue across year boundaries without repeating a stale marker',()=>{const p=fixture();p.portfolio=[{stockId:'stk_para',shares:100,averageCost:13,totalInvested:1300}];let count=0;const orig=Math.random;Math.random=()=>.5;try{for(let i=1;i<=156;i++){p.age=18+Math.floor((i-1)/52);p.currentWeek=(i-1)%52+1;p.stocks=processStockMarket(p.stocks,p.currentWeek,p).stocks;if(getDividendPayout(p.portfolio,p.stocks,p.currentWeek,p)>0)count++;}}finally{Math.random=orig;}assert.equal(count,13);}]);
cases.push(['settled dividends cannot be offered again after reload in the same week',()=>{const p=fixture();p.currentWeek=12;p.portfolio=[{stockId:'stk_para',shares:100,averageCost:13,totalInvested:1300}];p.stocks=processStockMarket(p.stocks,12,p).stocks;assert.ok(getDividendPayout(p.portfolio,p.stocks,12,p)>0);const saved=JSON.parse(JSON.stringify(markStockDividendsSettled(p,12)));assert.equal(getDividendPayout(saved.portfolio,saved.stocks,12,saved),0);const retried={...saved,stocks:processStockMarket(saved.stocks,12,saved).stocks};assert.equal(getDividendPayout(retried.portfolio,retried.stocks,12,retried),0);}]);
cases.push(['old releases cannot keep moving stock decades later',()=>{const p=fixture();p.age=90;p.currentWeek=1;p.world.projects=[{id:'old-hit',studioId:'PARAMOUNT',year:18,weekReleased:1,budgetTier:'MID',quality:95,boxOffice:1e9,reviews:'HIT'}] as any;assert.equal(getStudioStockPerformanceMultiplier(p,p.stocks.find(s=>s.id==='stk_para')!),1);}]);
cases.push(['a new hit can move price but project pressure is bounded',()=>{const p=fixture();p.world.projects=[{id:'new-hit',studioId:'PARAMOUNT',year:18,weekReleased:1,budgetTier:'MID',quality:95,boxOffice:1e9,reviews:'HIT'}] as any;const m=getStudioStockPerformanceMultiplier(p,p.stocks.find(s=>s.id==='stk_para')!);assert.ok(m>1&&m<=1.01);}]);
cases.push(['cent rounding does not exceed a company market capitalization ceiling',()=>{for(const s of initializeStocks()){s.outstandingShares=getStockOutstandingShares(s)+1234567;assert.ok(getStockPriceCeiling(s)*getStockOutstandingShares(s)<=getStockMarketCapCeiling(s)+.01,s.id);}}]);
cases.push(['raw runaway stock values cannot leak through the market display selector',()=>{const p=fixture(),s=p.stocks.find(s=>s.id==='stk_para')!;s.price=10.6e21;p.portfolio=[{stockId:s.id,shares:100}];const snap=getEntertainmentStockSnapshot(p,s);assert.ok(snap.marketCap<=25.35e9);assert.ok(snap.positionValue<=3900);}]);
cases.push(['nonfinite money is unavailable rather than a fabricated quote',()=>{assert.equal(formatMoney(Infinity),'Unavailable');assert.equal(formatMoney(NaN),'Unavailable');}]);
let failures=0;for(const [name,test]of cases){try{test();console.log('PASS',name);}catch(e){failures++;console.error('FAIL',name,String(e));}}assert.equal(failures,0,`${failures}/${cases.length} stock market safety checks failed`);console.log(`Stock market safety audit passed (${cases.length} checks).`);

if (process.argv.includes('--long')) {
    const rows: Array<Record<string, unknown>> = [];
    const previousRandom = Math.random;
    try {
        for (const years of [50, 100]) for (const mode of ['bull', 'bear', 'seeded', 'stale-hit'] as const) for (const seed of [17, 491]) {
            const p = fixture(); let state = seed; let payouts = 0; let minimum = Infinity, maximum = 0;
            Math.random = mode === 'bull' ? () => .999 : mode === 'bear' ? () => .001 : () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 2 ** 32);
            p.portfolio = [{stockId:'stk_para',shares:1_000_000,averageCost:13,totalInvested:13_000_000}];
            p.world.projects = mode === 'stale-hit' ? [{id:'stale',studioId:'PARAMOUNT',year:1,weekReleased:1,budgetTier:'MID',quality:95,boxOffice:1e9,reviews:'HIT'}] as any : [];
            for (let index = 0; index < years * 52; index++) {
                p.age = 18 + Math.floor(index / 52); p.currentWeek = index % 52 + 1;
                p.stocks = processStockMarket(p.stocks, p.currentWeek, p).stocks;
                for (const stock of p.stocks) {
                    assert.ok(Number.isFinite(stock.price) && stock.price > 0 && stock.price <= getStockPriceCeiling(stock), `${mode}:${index}:${stock.id}`);
                    assert.ok(stock.price * getStockOutstandingShares(stock) <= getStockMarketCapCeiling(stock) + .01, `cap:${stock.id}`);
                    assert.ok(stock.priceHistory.every(Number.isFinite)); minimum=Math.min(minimum,stock.price);maximum=Math.max(maximum,stock.price);
                }
                if (getDividendPayout(p.portfolio,p.stocks,p.currentWeek,p)>0) payouts++;
                const settled=markStockDividendsSettled(p,p.currentWeek);p.stocks=settled.stocks;
                if (index % 52 === 0) {
                    const retry=processStockMarket(p.stocks,p.currentWeek,p);
                    assert.deepEqual(retry.stocks,p.stocks);
                    assert.equal(getDividendPayout(p.portfolio,retry.stocks,p.currentWeek,p),0);
                }
            }
            assert.equal(payouts,Math.floor(years*52/12));
            rows.push({years,mode,seed,stocks:p.stocks.length,payouts,minimum,maximum});
        }
    } finally { Math.random=previousRandom; }
    console.log(JSON.stringify({longRunScenarios:rows},null,2));
}
