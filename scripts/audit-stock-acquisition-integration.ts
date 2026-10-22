import assert from 'node:assert/strict';
import {INITIAL_PLAYER,type Player} from '../types';
import {initializeStocks,executeStockTrade,getStockOutstandingShares} from '../services/stockLogic';
import {getAcquisitionCase,runDueDiligence,completeAcquisitionTransaction,submitOpeningOffer,resolveStudioAcquisitionResponses} from '../services/studioAcquisition';
import {buildForbesStudioProfile} from '../services/forbesStudioProfile';
import {getAcquisitionDebtSummary} from '../services/acquisitionDebt';
import {getStudioOwnershipPercent} from '../services/studioOwnership';
import {ensureStudioEcosystem} from '../services/studioEcosystem';
import {migratePlayerSave} from '../services/saveMigration';
import {processGameWeek} from '../services/gameLoop';
import {attachNormalizedStudioAiState} from '../services/studioAi/studioAiState';
import {createBusiness} from '../services/businessLogic';
let checks=0;
const check=(name:string,fn:()=>void)=>{fn();checks++;console.log('PASS',name)};
const fixture=()=>{let p=structuredClone(INITIAL_PLAYER);Object.assign(p,{id:'stock-acquisition-integration',name:'Stock Integration Buyer',age:35,currentWeek:8,money:2e12,stocks:initializeStocks(),portfolio:[],businesses:[],pendingEvents:[]});p.world=ensureStudioEcosystem(p.world);return migratePlayerSave(p)};
for(const id of ['PARAMOUNT','WARNER_BROS','UNIVERSAL']){
 let p=fixture();const stock=p.stocks.find(s=>s.relatedStudioId===id)!;const n=getStockOutstandingShares(stock);const before=p.money;
 const below=executeStockTrade(p,stock.id,Math.floor(n*.49));assert.ok(below.success,below.reason);p=below.player;
 const majority=executeStockTrade(p,stock.id,Math.floor(n*.51)-p.portfolio[0].shares);assert.ok(majority.success,majority.reason);p=majority.player;
 check(id+' real purchases conserve basis and debit',()=>{assert.equal(p.portfolio[0].shares,Math.floor(n*.51));assert.ok(Math.abs((p.portfolio[0].totalInvested||0)-(before-p.money))<.01)});
 const profile=buildForbesStudioProfile({player:p,studio:p.world.studios![id],rank:1,worldProjects:p.world.projects,universes:p.world.universes});
 const diligent=runDueDiligence({player:p,profile,funding:{source:'PERSONAL'}});assert.ok(diligent.success,diligent.reason);p=diligent.player;
 const pre={money:p.money,holdings:JSON.stringify(p.portfolio)};const report=getAcquisitionCase(p,id)!.diligence!.report;
 const acquired=completeAcquisitionTransaction({player:p,profile});assert.ok(acquired.success,acquired.reason);p=acquired.player;
 check(id+' zero second share charge and matching signed liabilities',()=>{assert.equal(p.money,pre.money);assert.equal(JSON.stringify(p.portfolio),pre.holdings);assert.equal(getAcquisitionCase(p,id)!.closing!.finalPrice,0);assert.equal(getAcquisitionCase(p,id)!.closing!.verifiedDebt,report.verifiedDebt);assert.equal(getAcquisitionCase(p,id)!.closing!.hiddenLiabilities,report.hiddenLiabilities);assert.equal(p.businesses.filter(b=>b.id===id).length,1);assert.equal(getAcquisitionDebtSummary(p).entries.filter(e=>e.studioId===id).length,(report.verifiedDebt+report.hiddenLiabilities)>0?1:0)});
 p=migratePlayerSave(JSON.parse(JSON.stringify(p)));
 check(id+' actual migration reload retains rights',()=>{assert.equal(p.money,pre.money);assert.equal(JSON.stringify(p.portfolio),pre.holdings);assert.equal(getStudioOwnershipPercent(p,p.businesses.find(b=>b.id===id)!),51)});
 const dupe=completeAcquisitionTransaction({player:p,profile});check(id+' duplicate signing has no side effect',()=>{assert.equal(dupe.success,false);assert.equal(dupe.player,p)});
 if(id==='PARAMOUNT')for(let i=0;i<3;i++){console.log('Advancing actual week',p.age,p.currentWeek);const result=await processGameWeek(p);p=migratePlayerSave(JSON.parse(JSON.stringify(result.player)));check('Actual next week '+i+' retains acquisition without reminder',()=>{assert.equal(p.businesses.filter(b=>b.id===id).length,1);assert.equal(p.portfolio[0].shares,Math.floor(n*.51));assert.equal(getAcquisitionDebtSummary(p).entries.filter(e=>e.studioId===id).length,(report.verifiedDebt+report.hiddenLiabilities)>0?1:0);assert.equal((p.pendingEvents||[]).filter(e=>e.data?.relatedStudioId===id&&e.data?.stockDecisionType==='TAKEOVER_CONTROL').length,0)})}
}
{
 let p=fixture();const id='PARAMOUNT';const owner=createBusiness('Stock Funding House','PRODUCTION_HOUSE','MAJOR_STUDIO',{} as any,'🎬',1,35);owner.id='stock-funding-house';owner.balance=30e9;p.businesses=[owner];
 const profile=buildForbesStudioProfile({player:p,studio:p.world.studios![id],rank:1,worldProjects:p.world.projects,universes:p.world.universes});
 const offer=submitOpeningOffer({player:p,profile,offerType:'MINORITY',minorityPercent:50,offerAmount:Math.round(profile.valuation*.50*1.25/10000)*10000,funding:{source:'STUDIO',businessId:owner.id}});assert.ok(offer.success,offer.reason);p={...offer.player,currentWeek:9};p=resolveStudioAcquisitionResponses(p);assert.equal(getAcquisitionCase(p,id)!.status,'ACCEPTED');
 const before=p.money;const ownerBefore=p.businesses[0].balance;const closed=completeAcquisitionTransaction({player:p,profile});assert.ok(closed.success,closed.reason);p=closed.player;
 const signed=getAcquisitionCase(p,id)!;const holding=p.portfolio.find(h=>h.stockId==='stk_para')!;
 check('corporate public tender pays only accepted price from actual company',()=>{assert.equal(p.money,before);assert.equal(p.businesses.find(b=>b.id===owner.id)!.balance,ownerBefore-signed.closing!.finalPrice);assert.equal(holding.shares,325000000);assert.equal(holding.totalInvested,signed.closing!.finalPrice,'stock cost basis must equal actual accepted tender cash paid');assert.deepEqual(holding.equityFunding,[{ownerStudioId:owner.id,shares:325000000}]);assert.equal(getStudioOwnershipPercent(p,p.businesses.find(b=>b.id===id)!),50)});
 const reloaded=migratePlayerSave(JSON.parse(JSON.stringify(p)));
 check('corporate tender funding and beneficial ownership survive migration',()=>{assert.deepEqual(reloaded.portfolio,p.portfolio);assert.equal(reloaded.money,p.money);assert.equal(getStudioOwnershipPercent(reloaded,reloaded.businesses.find(b=>b.id===id)!),50)});
}
{
 let p=fixture();const id='PARAMOUNT';const company=attachNormalizedStudioAiState(p.world.studios![id],{absoluteWeek:(p.age-1)*52+p.currentWeek-1});company.ai!.finance.debtPrincipalMillions=500;p.world.studios![id]=company;
 const stock=p.stocks.find(s=>s.relatedStudioId===id)!;const purchased=executeStockTrade(p,stock.id,Math.floor(getStockOutstandingShares(stock)*.51));assert.ok(purchased.success,purchased.reason);p=purchased.player;
 const profile=buildForbesStudioProfile({player:p,studio:p.world.studios![id],rank:1,worldProjects:p.world.projects,universes:p.world.universes});const diligence=runDueDiligence({player:p,profile,funding:{source:'PERSONAL'}});assert.ok(diligence.success,diligence.reason);p=diligence.player;
 const before=p.money;const closed=completeAcquisitionTransaction({player:p,profile});assert.ok(closed.success,closed.reason);p=closed.player;
 check('Actual500M canonical company debt creates exactly one matching entry',()=>{assert.equal(p.money,before);assert.equal(getAcquisitionCase(p,id)!.closing!.verifiedDebt,500e6);assert.equal(getAcquisitionDebtSummary(p).entries.filter(e=>e.studioId===id).length,1)});
 const reloaded=migratePlayerSave(JSON.parse(JSON.stringify(p)));check('Actual500M debt and stock basis survive migration',()=>{assert.deepEqual(getAcquisitionDebtSummary(reloaded).entries,getAcquisitionDebtSummary(p).entries);assert.deepEqual(reloaded.portfolio,p.portfolio)});
}
console.log(`Stock purchase to acquisition integration passed (${checks} checks).`);
