import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { createBusiness } from '../services/businessLogic';
import { getStudioOwnershipPercent } from '../services/studioOwnership';
import { getStudioSaleValuation, createStudioSaleDeck, getStudioSaleWindowState, acceptStudioSaleOffer, completeStudioSaleTransfer, processStudioSaleRoyalties } from '../services/studioSale';
import { acceptPrivateEquityExit, processPrivateEquityWeek } from '../services/privateEquityLogic';
import { getCompanyEquityBeneficialPercent } from '../services/companyPosition';
import { getStockOutstandingShares } from '../services/stockLogic';
import { getStudioSaleTreasuryLock, getStudioTreasuryWithdrawalQuote, performStudioTreasuryTransfer } from '../services/studioGroup';
import { buildForbesStudioProfile } from '../services/forbesStudioProfile';
import { submitOpeningOffer, resolveStudioAcquisitionResponses, getAcquisitionCase, completeAcquisitionTransaction, getFundingOptions } from '../services/studioAcquisition';

function fixture(): Player {
 const p = structuredClone(INITIAL_PLAYER); p.id='funded-equity-audit'; p.age=36;p.currentWeek=22;p.money=200_000_000;
 p.businesses=[];p.commitments=[];p.activeReleases=[];p.pastProjects=[];p.inbox=[];p.news=[];p.logs=[];p.portfolio=[];p.flags={};
 const hq=createBusiness('HQ','PRODUCTION_HOUSE','MAJOR_STUDIO',{} as any,'🎬',1,36);hq.id='hq';hq.balance=10_000_000;
 const source=createBusiness('Source','PRODUCTION_HOUSE','MAJOR_STUDIO',{} as any,'🎬',1,36);source.id='source';source.balance=800_000_000;source.stats.valuation=1_000_000_000;
 source.config.productionType='Acquired Studio';Object.assign(source.studioState!,{acquisitionOrigin:'STUDIO_ACQUISITION',acquiredYear:35,acquiredWeek:1,operatingModel:'CONTROLLED_SUBSIDIARY'});
 p.businesses=[hq,source];p.stockTakeovers=[{id:'control',acquiredBusinessId:source.id,relatedStudioId:source.id,ownershipPercent:52} as any];return p;
}
function purchase(p:Player, funding:any={source:'STUDIO',businessId:'source'}, id='target') {
 const profile=buildForbesStudioProfile({studio:{id,name:id,valuation:.05,cashReserve:18,reputation:70,recentHits:0,archetype:'PRESTIGE'},rank:1,worldProjects:[],universes:{}});
 const offered=submitOpeningOffer({player:p,profile,offerType:'AGGRESSIVE',offerAmount:55_000_000,funding});assert.ok(offered.success,offered.reason);
 let q=structuredClone(offered.player);q.currentWeek+=2;q=resolveStudioAcquisitionResponses(q);assert.equal(getAcquisitionCase(q,id)?.status,'ACCEPTED');
 const closed=completeAcquisitionTransaction({player:q,profile});assert.ok(closed.success,closed.reason);return closed.player;
}
let checks=0;function check(label:string,run:()=>void){try{run();checks++;console.log(`PASS ${label}`)}catch(error){console.error(`FAIL ${label}`);throw error}}
let p=purchase(fixture());let target=p.businesses.find(b=>b.id==='target')!;
check('Studio-funded full buyout preserves 52% beneficial ownership',()=>assert.equal(getStudioOwnershipPercent(p,target),52));
check('Funding debit preserves personal wallet',()=>{assert.equal(p.money,200_000_000);assert.equal(p.businesses.find(b=>b.id==='source')!.balance,745_000_000)});
check('Distribution is limited to beneficial ownership',()=>{const quote=getStudioTreasuryWithdrawalQuote(p,target);assert.equal(quote.ownershipPercent,52);assert.equal(quote.maxOwnerProceeds,Math.floor(quote.distributableCash*.52))});
check('Source sale includes its funded subsidiary',()=>assert.ok(getStudioSaleValuation(p,p.businesses.find(b=>b.id==='source')!).includedStudioIds.includes(target.id)));
check('Live source ownership updates descendant ownership',()=>{const q=structuredClone(p);q.stockTakeovers[0].ownershipPercent=75;assert.equal(getStudioOwnershipPercent(q,q.businesses.find(b=>b.id==='target')!),75)});
check('Personal acquisitions remain 100% owned',()=>{const q=purchase(fixture(),{source:'PERSONAL'},'personal');assert.equal(getStudioOwnershipPercent(q,q.businesses.find(b=>b.id==='personal')!),100)});
check('Legacy closing funding evidence preserves ownership after reload',()=>{const q=JSON.parse(JSON.stringify(p));delete q.businesses.find((b:any)=>b.id==='target').studioState.equityOwnerStudioId;delete q.businesses.find((b:any)=>b.id==='target').studioState.equityFunding;assert.equal(getStudioOwnershipPercent(q,q.businesses.find((b:any)=>b.id==='target')),52)});

check('Minority investment retains corporate holder and exits to company wallet',()=>{
 const q=fixture();const profile=buildForbesStudioProfile({studio:{id:'private_target',name:'Private Target',valuation:.05,cashReserve:18,reputation:70,recentHits:0,archetype:'PRESTIGE'},rank:1,worldProjects:[],universes:{}});
 const offered=submitOpeningOffer({player:q,profile,offerType:'MINORITY',offerAmount:25_000_000,minorityPercent:25,funding:{source:'STUDIO',businessId:'source'}});assert.ok(offered.success,offered.reason);
 let r=structuredClone(offered.player);r.currentWeek+=2;r=resolveStudioAcquisitionResponses(r);const acquisition=getAcquisitionCase(r,profile.id)!;acquisition.status='ACCEPTED';acquisition.sellerResponse={...acquisition.sellerResponse,agreedAmount:25_000_000} as any;
 const closed=completeAcquisitionTransaction({player:r,profile});assert.ok(closed.success,closed.reason);
 const position=closed.player.flags.companyEquityPositions[0];assert.equal(position.equityFunding?.[0]?.ownerStudioId,'source');assert.equal(position.equityFunding?.[0]?.percent,25);
});

check('Corporate minority exit proceeds return to the funding company, not personal cash',()=>{
 const q=fixture();q.flags.companyEquityPositions=[{studioId:'private',percent:25,investedAmount:10_000_000,equityFunding:[{ownerStudioId:'source',percent:25}],currentCompanyValuation:100_000_000,exit:{status:'OFFER_READY',percentForSale:25,offerExpiresAbsoluteWeek:99999,netProceeds:24_000_000}}];
 const result=acceptPrivateEquityExit({player:q,studioId:'private'});assert.ok(result.success,result.reason);assert.equal(result.player.money,q.money);assert.equal(result.player.businesses[1].balance,q.businesses[1].balance+24_000_000);assert.equal(result.player.flags.companyEquityPositions.length,0);
});
check('Mixed personal/corporate private exit preserves each wallet and remaining allocation',()=>{
 const q=fixture();q.flags.companyEquityPositions=[{studioId:'private',percent:40,investedAmount:40_000_000,equityFunding:[{ownerStudioId:'source',percent:25}],currentCompanyValuation:100_000_000,exit:{status:'OFFER_READY',percentForSale:20,offerExpiresAbsoluteWeek:99999,netProceeds:20_000_000}}];
 assert.equal(getCompanyEquityBeneficialPercent(q,q.flags.companyEquityPositions[0]),28);
 const result=acceptPrivateEquityExit({player:q,studioId:'private'});assert.ok(result.success,result.reason);assert.equal(result.player.money,q.money+7_500_000);assert.equal(result.player.businesses[1].balance,q.businesses[1].balance+12_500_000);assert.equal(result.player.flags.companyEquityPositions[0].equityFunding[0].percent,12.5);
});
check('Corporate quarterly dividends remain company capital',()=>{
 let paid=false;
 for(let index=0;index<40;index++){
  const q=fixture();const last=(q.age-1)*52+q.currentWeek-1-13;
  q.flags.companyEquityPositions=[{studioId:`private_${index}`,percent:25,investedAmount:25_000_000,equityFunding:[{ownerStudioId:'source',percent:25}],currentCompanyValuation:100_000_000,annualProfitEstimate:12_000_000,lastReviewAbsoluteWeek:last,acquiredYear:35,acquiredWeek:1}];
  const result=processPrivateEquityWeek(q);const distribution=result.player.businesses[1].balance-q.businesses[1].balance;
  if(distribution>0){paid=true;assert.equal(result.events.find(event=>event.type==='DISTRIBUTION')!.amount,0);assert.equal(result.player.money,q.money);break;}
 }
 assert.ok(paid,'fixture must exercise an actual board-approved dividend');
});
check('Live source listing blocks its subsidiary transfers and acquisition funding',()=>{
 const q=structuredClone(p);q.currentWeek=40;const source=q.businesses.find(b=>b.id==='source')!;const valuation=getStudioSaleValuation(q,source);
 const listed=createStudioSaleDeck(q,source.id,valuation.recommendedAsk,valuation.recommendedFloor);assert.ok(listed.success,listed.message);
 assert.ok(getStudioSaleTreasuryLock(listed.player,'target'));
 const moved=performStudioTreasuryTransfer({player:listed.player,studioId:'target',action:'WITHDRAW',counterparty:'PERSONAL',amount:1_000_000});assert.equal(moved.success,false);assert.equal(moved.reason,'LIVE_SALE_LISTING');
});
check('Source sale transfers funded children and corporate private stakes exactly once',()=>{
 const q=structuredClone(p);q.currentWeek=40;q.flags.companyEquityPositions=[{studioId:'private',percent:25,investedAmount:10_000_000,equityFunding:[{ownerStudioId:'source',percent:25}],currentCompanyValuation:100_000_000}];
 const source=q.businesses.find(b=>b.id==='source')!;const valuation=getStudioSaleValuation(q,source);
 const listed=createStudioSaleDeck(q,source.id,valuation.recommendedAsk,valuation.recommendedFloor);assert.ok(listed.success,listed.message);
 const offer=getStudioSaleWindowState(listed.player,listed.deck!).availableOffers[0];assert.ok(offer);
 const accepted=acceptStudioSaleOffer(listed.player,source.id,offer.id);assert.ok(accepted.success,accepted.message);
 const closed=completeStudioSaleTransfer(accepted.player,source.id);assert.ok(closed.success,closed.message);
 assert.ok(!closed.player.businesses.some(b=>['source','target'].includes(b.id)));assert.equal(closed.player.flags.companyEquityPositions.length,0);
 assert.ok(closed.player.businesses.some(b=>b.id==='hq'));
});
check('Corporate ownership cycles cannot create personal equity',()=>{
 const q=structuredClone(p);q.businesses.find(b=>b.id==='source')!.studioState!.equityOwnerStudioId='target';
 assert.equal(getStudioOwnershipPercent(q,q.businesses.find(b=>b.id==='target')!),0);
});
check('Legacy missing or ambiguous corporate evidence does not invent ownership links',()=>{
 const q=JSON.parse(JSON.stringify(p));const child=q.businesses.find((b:any)=>b.id==='target');delete child.studioState.equityOwnerStudioId;delete child.studioState.equityFunding;
 q.flags.studioAcquisitionCases.push({...q.flags.studioAcquisitionCases.find((entry:any)=>entry.studioId==='target'),id:'duplicate'});
 assert.equal(getStudioOwnershipPercent(q,child),100);
});


check('Source sale transfers only corporate stock shares and preserves personal shares/cost basis',()=>{
 const q=structuredClone(p);q.currentWeek=40;
 q.stocks=[{id:'investment',symbol:'INV',name:'Investment',price:1_000_000,outstandingShares:1_000_000,sector:'MEDIA',volatility:.02,dividendYield:0} as any];
 q.portfolio=[{stockId:'investment',shares:100,averageCost:800_000,totalInvested:80_000_000,equityFunding:[{ownerStudioId:'source',shares:60},{ownerStudioId:'hq',shares:20}]}];
 const source=q.businesses.find(b=>b.id==='source')!;const valuation=getStudioSaleValuation(q,source);
 const listed=createStudioSaleDeck(q,source.id,valuation.recommendedAsk,valuation.recommendedFloor);assert.ok(listed.success,listed.message);
 const offer=getStudioSaleWindowState(listed.player,listed.deck!).availableOffers[0];
 const accepted=acceptStudioSaleOffer(listed.player,source.id,offer.id);assert.ok(accepted.success,accepted.message);
 const closed=completeStudioSaleTransfer(accepted.player,source.id);assert.ok(closed.success,closed.message);
 assert.equal(closed.player.portfolio[0].shares,40);assert.equal(closed.player.portfolio[0].totalInvested,32_000_000);assert.deepEqual(closed.player.portfolio[0].equityFunding,[{ownerStudioId:'hq',shares:20}]);
});
check('Acquisition funding cannot drain a live listed holding company',()=>{
 const q=structuredClone(p);q.currentWeek=40;const source=q.businesses.find(b=>b.id==='source')!;const value=getStudioSaleValuation(q,source);
 const listed=createStudioSaleDeck(q,source.id,value.recommendedAsk,value.recommendedFloor);assert.ok(listed.success,listed.message);
 const profile=buildForbesStudioProfile({studio:{id:'other',name:'Other',valuation:.05,cashReserve:18,reputation:70,recentHits:0,archetype:'PRESTIGE'},rank:1,worldProjects:[],universes:{}});
 for(const id of ['source','target']) { const funding=getFundingOptions({player:listed.player,profile,amount:1_000_000,expenseType:'OFFER'}).find(option=>option.businessId===id)!;assert.equal(funding.affordable,false);assert.match(funding.unavailableReason!,/sale listing/i) }
});


check('Direct corporate-child sale proceeds stay in the corporate owner wallet',()=>{
 const q=structuredClone(p);q.currentWeek=40;const target=q.businesses.find(b=>b.id==='target')!;const value=getStudioSaleValuation(q,target);
 const listed=createStudioSaleDeck(q,target.id,value.recommendedAsk,value.recommendedFloor);assert.ok(listed.success,listed.message);
 const offer=getStudioSaleWindowState(listed.player,listed.deck!).availableOffers[0];const accepted=acceptStudioSaleOffer(listed.player,target.id,offer.id);assert.ok(accepted.success,accepted.message);
 const closed=completeStudioSaleTransfer(accepted.player,target.id);assert.ok(closed.success,closed.message);
 assert.equal(closed.player.money,q.money);assert.ok(closed.player.businesses.find(b=>b.id==='source')!.balance>q.businesses.find(b=>b.id==='source')!.balance);
 assert.ok(!closed.player.businesses.some(b=>b.id==='target'));
});


check('Mixed corporate stock/private control compounds both tranches',()=>{
 const q=structuredClone(p);const target=q.businesses.find(b=>b.id==='target')!;
 q.stocks=[{id:'target-stock',relatedStudioId:'target',outstandingShares:1_250_000_000,price:100} as any];const total=getStockOutstandingShares(q.stocks[0]);
 q.portfolio=[{stockId:'target-stock',shares:total*.3,equityFunding:[{ownerStudioId:'source',shares:total*.3}]}];
 q.flags.companyEquityPositions=[{studioId:'target',percent:25,investedAmount:25_000,equityFunding:[{ownerStudioId:'source',percent:25}]}];
 q.stockTakeovers.push({id:'target-control',acquiredBusinessId:'target',relatedStudioId:'target',stockId:'target-stock',ownershipPercent:55} as any);
 assert.ok(Math.abs(getStudioOwnershipPercent(q,target)-28.6)<.000001);
});
check('Corporate subsidiary royalties return to source and deduplicate across reload',()=>{
 const q=structuredClone(p);q.currentWeek=40;const target=q.businesses.find(b=>b.id==='target')!;const value=getStudioSaleValuation(q,target);
 const listed=createStudioSaleDeck(q,target.id,value.recommendedAsk,value.recommendedFloor);assert.ok(listed.success,listed.message);
 const selected=listed.deck!.offers.find(offer=>offer.royaltyPercent>0)!;assert.ok(selected);
 const ready=structuredClone(listed.player);ready.currentWeek=selected.availableWeek;ready.age=selected.availableYear;
 const accepted=acceptStudioSaleOffer(ready,target.id,selected.id);assert.ok(accepted.success,accepted.message);
 const closed=completeStudioSaleTransfer(accepted.player,target.id);assert.ok(closed.success,closed.message);
 const before=JSON.parse(JSON.stringify(closed.player));before.currentWeek+=1;
 const processed=processStudioSaleRoyalties(before);assert.equal(processed.money,before.money);assert.ok(processed.businesses.find(b=>b.id==='source')!.balance>before.businesses.find((b:any)=>b.id==='source').balance);
 const repeated=processStudioSaleRoyalties(JSON.parse(JSON.stringify(processed)));assert.equal(repeated.businesses.find(b=>b.id==='source')!.balance,processed.businesses.find(b=>b.id==='source')!.balance);
});
check('Underwater bundled debt cannot mint corporate receipts beyond buyer cash',()=>{
 const q=structuredClone(p);q.currentWeek=40;q.stockTakeovers=[];
 const source=q.businesses.find(b=>b.id==='source')!;const child=q.businesses.find(b=>b.id==='target')!;
 source.balance=0;source.studioState!.equityOwnerStudioId='hq';child.balance=500_000_000;
 q.flags.acquisitionDebtLedger=[{id:'debt',studioId:'source',studioName:'Source',originalPrincipal:200_000_000,remainingPrincipal:200_000_000,annualInterestRate:.1,originatedWeek:1,originatedYear:35,source:'NEGOTIATED_ACQUISITION',status:'ACTIVE',interestPaidToDate:0,missedServiceAmount:0,missedPayments:0,trackingOrigin:'SIGNED'}];
 const value=getStudioSaleValuation(q,source);const listed=createStudioSaleDeck(q,source.id,value.recommendedAsk,value.recommendedFloor);assert.ok(listed.success,listed.message);
 const offer=getStudioSaleWindowState(listed.player,listed.deck!).availableOffers[0];const receipts=(offer.corporateCashAtClose || []).reduce((sum,receipt)=>sum+receipt.amount,offer.cashAtClose);
 assert.ok(receipts<=offer.companyCashAtClose!,`${receipts} exceeds company cash ${offer.companyCashAtClose}`);
 const accepted=acceptStudioSaleOffer(listed.player,source.id,offer.id);assert.ok(accepted.success,accepted.message);
 const closed=completeStudioSaleTransfer(accepted.player,source.id);assert.ok(closed.success,closed.message);
 assert.ok(closed.player.businesses.find(b=>b.id==='hq')!.balance-q.businesses.find(b=>b.id==='hq')!.balance<=offer.companyCashAtClose!);
});


check('Controlled private positions are not counted twice as source sale assets',()=>{
 const q=structuredClone(p);q.currentWeek=40;
 const source=q.businesses.find(b=>b.id==='source')!;
 const before=getStudioSaleValuation(q,source).includedStudios.find(part=>part.id==='source')!.estimatedValue;
 q.flags.companyEquityPositions=[{studioId:'target',percent:25,investedAmount:25_000_000,currentCompanyValuation:100_000_000,equityFunding:[{ownerStudioId:'source',percent:25}]}];
 const after=getStudioSaleValuation(q,source).includedStudios.find(part=>part.id==='source')!.estimatedValue;assert.equal(after,before);
});
console.log(`Studio-funded equity checks: ${checks}`);
