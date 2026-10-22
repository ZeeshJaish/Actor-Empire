import assert from 'node:assert/strict';
import { frozenStockSchema3 } from './fixtures/stockSaveSchema3';
import { INITIAL_PLAYER, type Player } from '../types';
import { createBusiness } from '../services/businessLogic';
import { initializeStocks } from '../services/stockLogic';
import { migratePlayerSave } from '../services/saveMigration';
import { createSaveIntegrityManifest, verifySaveIntegrity } from '../services/saveIntegrity';

const fixture = (): Player => {
    const p = structuredClone(INITIAL_PLAYER);
    p.id = 'stock-save-safety'; p.name = 'Safety Buyer'; p.age = 40; p.currentWeek = 10; p.money = 25e12;
    p.stocks = initializeStocks(); p.portfolio = [];
    const owner = createBusiness('Funding Studio', 'PRODUCTION_HOUSE', 'MAJOR_STUDIO', {} as any, '🎬', 1, 40);
    owner.id = 'funding-co'; owner.balance = 800_000; p.businesses = [owner];
    return p;
};
const tests: Array<[string, () => void]> = [];
tests.push(['unheld abnormal quote cannot debit unrelated wallet cash', () => {
    const p = fixture(); p.stocks.find(s => s.id === 'stk_para')!.price = 10.6e21;
    const result = migratePlayerSave(p);
    assert.equal(result.money, 25e12);
    assert.equal(p.stocks.find(s => s.id === 'stk_para')!.price, 10.6e21, 'source snapshot is not mutated');
}]);
tests.push(['normal quote reload preserves high historical cost and corporate rights', () => {
    const p = fixture(); p.portfolio = [{ stockId: 'stk_para', shares: 100, averageCost: 10_000,
        totalInvested: 1_000_000, equityFunding: [{ ownerStudioId: 'funding-co', shares: 60 }] }];
    const loaded = migratePlayerSave(p);
    assert.deepEqual(loaded.portfolio, p.portfolio);
    assert.equal(loaded.businesses[0].balance, 800_000);
    const twice = migratePlayerSave(JSON.parse(JSON.stringify(loaded)));
    assert.deepEqual(twice.portfolio, p.portfolio);
    assert.equal(twice.money, p.money);
}]);
tests.push(['explicit zero average cost and zero invested basis are preserved', () => {
    const p=fixture();p.portfolio=[{stockId:'stk_para',shares:100,averageCost:0,totalInvested:0}];
    assert.deepEqual(migratePlayerSave(p).portfolio,p.portfolio);
}]);
tests.push(['abnormal quote repair retains its original and is idempotent', () => {
    const p=fixture();p.stocks.find(s=>s.id==='stk_para')!.price=10.6e21;
    const once=migratePlayerSave(p);const provenance=once.flags.stockQuoteRepairs;
    assert.ok(provenance?.stk_para);assert.equal(provenance.stk_para.originalPrice,'1.06e+22');
    const twice=migratePlayerSave(JSON.parse(JSON.stringify(once)));
    assert.deepEqual(twice.flags.stockQuoteRepairs,provenance);
}]);
tests.push(['unsafe supply never silently rescales shares or rewrites basis', () => {
    const p=fixture();p.stocks.find(s=>s.id==='stk_para')!.outstandingShares=1e24;
    p.portfolio=[{stockId:'stk_para',shares:5.1e23,averageCost:13,totalInvested:6.63e24}];
    assert.throws(()=>migratePlayerSave(p),(e:any)=>e.name==='StockSaveRecoveryError'&&e.rawStockState.portfolio[0].shares===5.1e23);
    assert.equal(p.portfolio[0].shares,5.1e23);
}]);
tests.push(['duplicate holdings and contradictory owner allocations require recoverable review', () => {
    for(const kind of ['duplicate','allocation'] as const){
        const p=fixture();p.portfolio=[{stockId:'stk_para',shares:100,averageCost:13,totalInvested:1300}];
        if(kind==='duplicate')p.portfolio.push({...p.portfolio[0]});
        else p.portfolio[0].equityFunding=[{ownerStudioId:'funding-co',shares:101}];
        assert.throws(()=>migratePlayerSave(p),(e:any)=>e.name==='StockSaveRecoveryError'&&e.issues.length>0);
    }
}]);
tests.push(['new integrity signature rejects disappearing company-funded rights', () => {
    const p=fixture();p.portfolio=[{stockId:'stk_para',shares:100,averageCost:13,totalInvested:1300,equityFunding:[{ownerStudioId:'funding-co',shares:60}]}];
    const manifest=createSaveIntegrityManifest(p,'AUTOSAVE');
    const altered=structuredClone(p);delete altered.portfolio[0].equityFunding;
    assert.equal(verifySaveIntegrity(altered,manifest).ok,false);
}]);
tests.push(['new integrity signature rejects altered quote-repair provenance', () => {
    const p=fixture();p.flags.stockQuoteRepairs={stk_para:{version:1,originalPrice:'1.06e+22',repairedPrice:39}};
    const manifest=createSaveIntegrityManifest(p,'MIGRATION');
    const altered=structuredClone(p);altered.flags.stockQuoteRepairs.stk_para.originalPrice='39';
    assert.equal(verifySaveIntegrity(altered,manifest).ok,false);
}]);
tests.push(['finite SX cash survives migration and nonfinite cash requires recovery', () => {
 const p=fixture();p.money=10.6e21;assert.equal(migratePlayerSave(p).money,p.money);
 p.money=Infinity;assert.throws(()=>migratePlayerSave(p),(e:any)=>e.name==='StockSaveRecoveryError');
}]);
tests.push(['shipped schema3 signature still verifies its exact historical projection', () => {
 const p=structuredClone(frozenStockSchema3.player) as unknown as Player;
 const old=structuredClone(frozenStockSchema3.manifest) as any;
 assert.equal(old.digest,'c96109bd11f0a3d4');
 assert.equal(verifySaveIntegrity(p,old).ok,true);
 p.money-=1;assert.equal(verifySaveIntegrity(p,old).ok,false);
}]);
tests.push(['missing historical cost remains unknown instead of inventing the current quote', () => {
 const p=fixture();p.portfolio=[{stockId:'stk_para',shares:100}];
 const h=migratePlayerSave(p).portfolio[0];assert.equal(h.averageCost,undefined);assert.equal(h.totalInvested,undefined);
}]);
tests.push(['malformed positive register containers request explicit recovery', () => {
 for(const malformed of [{stk_para:{shares:100}},[null]]){
  const p=fixture();p.portfolio=malformed as any;
  assert.throws(()=>migratePlayerSave(p),(e:any)=>e.name==='StockSaveRecoveryError');
 }
}]);
tests.push(['nonfinite corporate rights cannot verify as a healthy signed generation', () => {
 const p=fixture();p.portfolio=[{stockId:'stk_para',shares:100,averageCost:13,totalInvested:1300,equityFunding:[{ownerStudioId:'funding-co',shares:NaN}]}];
 assert.equal(verifySaveIntegrity(p,createSaveIntegrityManifest(p,'AUTOSAVE')).ok,false);
}]);
tests.push(['safe-integer supply still requires recovery when no cent quote fits the company cap', () => {
 const p=fixture();const source=p.stocks.find(s=>s.id==='stk_para')!;
 p.stocks=[{...source,id:'legacy-import',outstandingShares:1e15,price:1,priceHistory:[1]}];
 p.portfolio=[{stockId:'legacy-import',shares:5e14,averageCost:0,totalInvested:0}];
 assert.throws(()=>migratePlayerSave(p),(error:any)=>error.name==='StockSaveRecoveryError'
   && error.issues.some((issue:any)=>issue.stockId==='legacy-import'&&issue.code==='UNSAFE_SUPPLY')
   && error.rawStockState.portfolio[0].shares===5e14
   && error.rawStockState.stocks[0].outstandingShares===1e15);
 assert.equal(p.portfolio[0].shares,5e14);assert.equal(p.money,25e12);
}]);
tests.push(['valid custom registry keeps its explicit supported supply and holding units', () => {
 const p=fixture();const source=p.stocks.find(s=>s.id==='stk_para')!;
 p.stocks=[{...source,id:'legacy-supported',outstandingShares:1000,price:1,priceHistory:[1]}];
 p.portfolio=[{stockId:'legacy-supported',shares:500,averageCost:0,totalInvested:0}];
 const loaded=migratePlayerSave(p);
 assert.equal(loaded.stocks.find(s=>s.id==='legacy-supported')!.outstandingShares,1000);
 assert.deepEqual(loaded.portfolio,p.portfolio);assert.equal(loaded.money,p.money);
}]);
let failed=0;
for(const [name,test] of tests){try{test();console.log(`PASS ${name}`)}catch(e){failed++;console.error(`FAIL ${name}: ${(e as Error).message}`)}}
if(failed)throw new Error(`${failed}/${tests.length} stock save safety checks failed`);
console.log(`Stock save safety audit passed: ${tests.length} checks.`);
