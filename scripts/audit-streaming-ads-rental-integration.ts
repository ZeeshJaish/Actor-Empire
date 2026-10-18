import {evaluateStreamingRightsCompliance} from '../services/streamingRightsMarketplace';
import {settleStreamingRightsTransfer} from '../services/streamingRightsTransactions';
import {settlePlatformAiEconomy} from '../services/platformAi/platformAiEconomy';
import {normalizePlatformAiState} from '../services/platformAi/platformAiState';
import {progressPlatformAiDistressWorld} from '../services/platformAi/platformAiDistress';
import {configureStreamingPricingOffer} from '../services/streamingCommercialOffers';
import assert from 'node:assert/strict';
import {balanceFixture} from './helpers/streamingBalanceFixture';
import {processGameWeek} from '../services/gameLoop';
import {getAbsoluteWeek} from '../services/legacyLogic';
import {createStreamingRightsContractFromLicense,normalizeStreamingRightsContractRegistry,registerProductionStreamingRightsContract} from '../services/streamingRightsCore';
import {createStreamingBiddingSession,advanceStreamingBiddingSession} from '../services/streamingBidding';
import {getStreamingBuyerBackendCapability,streamingBackendCapability,validateNewStreamingBackendTerms} from '../services/streamingBackendPolicy';
import {calculateStreamingBuyerAuctionSellerValue} from '../services/streamingBuyerAuctions';
import {settleStreamingContractRoyaltyForPlayer} from '../services/streamingContractSettlement';
import {getWorldStreamingOffers} from '../services/worldEconomy/worldStreamingOffers';
import {buildReleaseStreamingBidderMarket} from '../services/releaseStreamingAuction';
import {createStreamingRightsAccessGrantForOffer} from '../services/streamingRightsAccessGrant';
import {normalizeOwnedStreamingPlatformState} from '../services/ownedStreamingPlatform';
import type {Player} from '../types';
let checks=0;const failures:string[]=[];
const check=async(name:string,fn:()=>void|Promise<void>)=>{checks++;try{await fn();console.log('PASS',name)}catch(e){failures.push(name);console.error('FAIL',name,e)}};
const fixture=(core:'SUBSCRIPTION'|'ADVERTISING'|'STORE')=>{
 const {p}=balanceFixture({id:'new-'+core,core,catalog:8,quality:95,price:core==='SUBSCRIPTION'?7.99:core==='STORE'?2.99:4});
 p.ownedStreamingPlatform.catalogLicenses=p.ownedStreamingPlatform.catalogLicenses.map(row=>({...row,backendBasis:'ADS_RENTAL_RECEIPTS',platformRevenueShare:90,licensorRevenueShare:10,permanentPurchase:false,windowType:'FIRST_WINDOW',
  accessGrant:createStreamingRightsAccessGrantForOffer(p.ownedStreamingPlatform.serviceConfiguration.pricing.streams,false)}));
 p.world.streamingRightsContracts=Object.fromEntries(p.ownedStreamingPlatform.catalogLicenses.map(license=>[license.id,createStreamingRightsContractFromLicense({license,buyer:{type:'PLAYER_PLATFORM',id:'PLAYER',name:'Player',platformId:null},guaranteeDisposition:'PAID',settledAtAbsoluteWeek:license.signedAtAbsoluteWeek})]));
 return p;
};
for(const core of ['SUBSCRIPTION','ADVERTISING','STORE'] as const) await check('actual '+core+' close pays only exact eligible receipts',async()=>{
 let p=fixture(core);p=(await processGameWeek(p)).player;
 const v=p.world.worldStreamingViewing!;const op=p.ownedStreamingPlatform.weeklyHistory.at(-1)!.operations!;
 let expected=0;
 for(const license of p.ownedStreamingPlatform.catalogLicenses){
  const ads=(v.royaltyReceipts || []).filter(row=>row.platformId==='PLAYER'&&row.contractId===license.id&&row.sourceKind==='ADVERTISING').reduce((sum,row)=>sum+row.grossReceipts,0);
  const rent=op.titlePerformance?.find(row=>row.projectId===license.sourceProjectId)?.rentalRevenue || 0;
  expected+=Math.round((ads+rent)*.1);
 }
 assert.equal(op.partnerRevenueShareCost,expected);
 if(core==='SUBSCRIPTION')assert.equal(expected,0);else assert.ok(expected>0,JSON.stringify(op));
 console.log('ACTUAL',core,JSON.stringify({revenue:op.subscriptionRevenue+(op.worldViewingIncrementalRevenue || 0),royalty:op.partnerRevenueShareCost,profit:op.accountingContribution}));
});
await check('new backend cannot use synthetic view/profit attribution',()=>{
 const p=fixture('STORE');const c=Object.values(p.world.streamingRightsContracts)[0];
 const result=settleStreamingContractRoyaltyForPlayer(p,{contractId:c.id,absoluteWeek:getAbsoluteWeek(p.age,p.currentWeek),attribution:{projectId:c.sourceProjectId,contributionWeight:1,attributedSubscriptionRevenue:1000000,attributedAdvertisingRevenue:2000000,attributedTransactionalRevenue:3000000,allowedDeductions:0,adjustedGrossReceipts:6000000}});
 assert.equal(result.royaltyPaid,0);assert.equal(result.changed,false);
});
await check('cash fee and percentage reject zero, tiny and nonfinite promises',()=>{
 const capability={advertising:true,rental:true,eligibleRevenueFraction:1};
 for(const [fee,pct] of [[0,10],[1,90],[100000,90],[NaN,10],[Infinity,10],[1000000,NaN],[1000000,-1]])
  assert.ok(validateNewStreamingBackendTerms({minimumGuarantee:fee,licensorRevenueShare:pct,referenceFee:1000000,capability}));
 assert.equal(validateNewStreamingBackendTerms({minimumGuarantee:620000,licensorRevenueShare:10,referenceFee:1000000,capability}),null);
});
await check('rights grant and running model are both required',()=>{
 const p=fixture('STORE');const pricing=p.ownedStreamingPlatform.serviceConfiguration.pricing;
 assert.equal(streamingBackendCapability(pricing,{schemaVersion:1,modes:['SUBSCRIPTION'],earlyWindowWeeks:0,purchaseFulfillment:'NONE',source:'EXPLICIT'}).rental,false);
 assert.equal(getStreamingBuyerBackendCapability(fixture('SUBSCRIPTION'),null,2040).eligibleRevenueFraction,0);
 assert.equal(validateNewStreamingBackendTerms({minimumGuarantee:1000000,licensorRevenueShare:10,capability:{advertising:false,rental:false,eligibleRevenueFraction:0}})?.includes('enabled'),true);
});
await check('zero-backend unsigned draft survives normalization',()=>{
 const p=fixture('SUBSCRIPTION');p.ownedStreamingPlatform.catalogSetupDraft={currentStep:2,selectedOwnedProjectIds:[],packageId:'CURATED_PREMIERE',opportunityProjectId:null,territory:'GLOBAL',durationWeeks:104,exclusivity:'NON_EXCLUSIVE',minimumGuarantee:1000000,platformRevenueShare:100,negotiationStatus:'BUILDING',counterMinimumGuarantee:1000000,counterPlatformRevenueShare:100,negotiationRound:1,updatedAtAbsoluteWeek:2040};
 const draft=normalizeOwnedStreamingPlatformState(p.ownedStreamingPlatform,p.id).catalogSetupDraft!;
 assert.equal(draft.platformRevenueShare,100);assert.equal(draft.counterPlatformRevenueShare,100);
});
await check('ads and rental switching stops future payables without resetting balances',async()=>{
 let p=fixture('STORE');p=(await processGameWeek(p)).player;
 const before=new Map(p.ownedStreamingPlatform.catalogLicenses.map(row=>[row.id,p.world.streamingRightsContracts[row.id].cumulativeRoyaltyPaid]));
 p.ownedStreamingPlatform.serviceConfiguration.pricing=configureStreamingPricingOffer(p.ownedStreamingPlatform.serviceConfiguration.pricing,{kind:'CORE',coreModel:'SUBSCRIPTION'});
 for(let i=0;i<3;i++){p=(await processGameWeek(p)).player;assert.deepEqual(p.ownedStreamingPlatform.serviceConfiguration.pricing.streams,['subs'])}
 assert.equal(p.ownedStreamingPlatform.weeklyHistory.at(-1)!.operations!.partnerRevenueShareCost,0);
 for(const [id,paid] of before)assert.equal(p.world.streamingRightsContracts[id].cumulativeRoyaltyPaid,paid);
 p.ownedStreamingPlatform.serviceConfiguration.pricing=configureStreamingPricingOffer(p.ownedStreamingPlatform.serviceConfiguration.pricing,{kind:'CORE',coreModel:'STORE'});p=(await processGameWeek(p)).player;
 assert.ok(p.ownedStreamingPlatform.weeklyHistory.at(-1)!.operations!.partnerRevenueShareCost>0);
 for(const [id,paid] of before)assert.ok(p.world.streamingRightsContracts[id].cumulativeRoyaltyPaid>=paid);
});
await check('AI bidder capability matches actual world commercial offer',()=>{
 const p=fixture('STORE'),week=getAbsoluteWeek(p.age,p.currentWeek);
 const market=buildReleaseStreamingBidderMarket(p,{projectId:'distribution-new',title:'New Film',genre:'DRAMA',packageScore:90,absoluteWeek:week});assert.ok(market.length>=2);
 const offers=getWorldStreamingOffers(p,week).offers;
 for(const bidder of market){const offer=offers.find(row=>row.platformId===bidder.id);assert.ok(offer);const cap=getStreamingBuyerBackendCapability(p,bidder.id,week);assert.equal(bidder.eligibleBackendRevenueFraction,cap.eligibleRevenueFraction)}
});
await check('all generated subscription-only offers remain cash only over repeated rounds',()=>{
 for(let seed=0;seed<30;seed++){
 let room=createStreamingBiddingSession({projectId:'pure-'+seed,title:'Pure',sellerStudioId:'s',sellerStudioName:'Studio',absoluteWeek:2000,projectType:'MOVIE',genre:'DRAMA',projectBudget:30000000,packageScore:95,platforms:['A','B'].map(id=>({id,name:id,color:'#ffffff',cashAvailable:500000000,baseBid:30000000,acquisitionCeiling:100000000,qualityPreference:50,relationshipMultiplier:1,backendPreference:.8,eligibleBackendRevenueFraction:0}))});
 for(let i=0;i<30;i++){room=advanceStreamingBiddingSession(room,1);assert.ok(room.offers.every(row=>row.licensorRevenueShare===0&&row.expectedRoyaltyCost===0))}
 }
});
await check('auction gives no contingent value to an ineligible buyer',()=>{
 const lot:any={referenceValue:100000000,sellerPriorities:{cash:1,backend:1,marketing:1,futureGreenlight:1}};
 const terms:any={minimumGuarantee:62000000,licensorRevenueShare:10};
 assert.equal(calculateStreamingBuyerAuctionSellerValue(lot,terms),62000000);
 assert.equal(calculateStreamingBuyerAuctionSellerValue(lot,terms,1,.25),64500000);
});
await check('AI buyer pays exactly ads plus rent and the seller collects once after modes close',async()=>{
 let p=(await processGameWeek(fixture('STORE'))).player;const state=p.world.worldStreamingViewing!,week=state.lastProcessedAbsoluteWeek;
 const ai=p.world.platforms!.HULU;ai.ai!.financeHistory=[];ai.ai!.rightsContracts=[];
 const contract=createStreamingRightsContractFromLicense({guaranteeDisposition:'PAID',settledAtAbsoluteWeek:week-1,
  buyer:{type:'AI_PLATFORM',id:'HULU',name:'Hulu',platformId:'HULU'},
  license:{...p.ownedStreamingPlatform.catalogLicenses[0],id:'ai-new-actual',backendBasis:'ADS_RENTAL_RECEIPTS',origin:'PLATFORM_TRADE',sellerType:'PLATFORM',sellerPlatformId:'NETFLIX',minimumGuarantee:1000000,
   lastRoyaltyReceiptAbsoluteWeek:undefined,cumulativeRoyaltyAccrued:0,cumulativeRoyaltyPaid:0,platformRevenueShare:90,licensorRevenueShare:10,expiresAtAbsoluteWeek:week+104}});
 p.world.streamingRightsContracts={[contract.id]:contract};
 state.royaltyReceipts=([['SUBSCRIPTION',9000],['ADVERTISING',1000],['SPONSORSHIP',4000],['ANCILLARY',5000]] as const).map(([sourceKind,grossReceipts])=>({receiptId:sourceKind,platformId:'HULU',countryId:'US',projectId:contract.sourceProjectId,contractId:contract.id,kind:sourceKind==='SUBSCRIPTION'?'SUBSCRIPTION':'NON_STORE',sourceKind,grossReceipts}));
 state.aiStoreTransactions=(['RENTAL','PURCHASE'] as const).map((kind,index)=>({transactionId:kind,platformId:'HULU',countryId:'US',titleId:contract.sourceProjectId,contractId:contract.id,kind,households:100,revenue:index?3000:2000,purchasedAtAbsoluteWeek:week}));
 state.platforms.HULU.revenue.rentalRevenue=2000;state.platforms.HULU.revenue.purchaseRevenue=3000;
 const first=settlePlatformAiEconomy({player:p,platform:ai,absoluteWeek:week});
 assert.equal(Math.round(first.snapshot!.partnerRevenueShareCostMillions*1e6),300);
 const saved=normalizePlatformAiState(JSON.parse(JSON.stringify(first.platform)),p.id,week+1);saved.ai!.financeHistory=[];
 assert.equal(settlePlatformAiEconomy({player:p,platform:saved,absoluteWeek:week+1}).snapshot!.partnerRevenueShareCostMillions,0);
 p.world.platforms!.HULU=first.platform;const seller=p.world.platforms!.NETFLIX;seller.cashReserve=1000;seller.ai!.financeHistory=[];seller.ai!.decisionHistory=[];
 const paid=progressPlatformAiDistressWorld({player:p,world:p.world,absoluteWeek:week}).world;
 assert.equal(Math.round((paid.platforms!.NETFLIX.cashReserve-1000)*1e6),300);
 paid.platforms!.NETFLIX.ai!.decisionHistory=[];
 assert.equal(progressPlatformAiDistressWorld({player:{...p,world:paid},world:paid,absoluteWeek:week}).world.platforms!.NETFLIX.cashReserve,paid.platforms!.NETFLIX.cashReserve);
});
await check('suspended buyer markets cannot support backend promises',()=>{
 const p=fixture('STORE');p.ownedStreamingPlatform.marketOperations.forEach(row=>row.status='SUSPENDED');
 const cap=getStreamingBuyerBackendCapability(p,null,getAbsoluteWeek(p.age,p.currentWeek));assert.equal(cap.rental,false);assert.equal(cap.advertising,false);
});
await check('funded premiere reuses paid funding without a second upfront charge',()=>{
 const p=fixture('SUBSCRIPTION');p.commitments=[{id:'funded-child',name:'Funded Child',type:'MOVIE',projectDetails:{estimatedBudget:3000000,hiddenStats:{platformProductionFundingApplied:2000000,nextSeasonFundingPlatformId:'HULU'}}} as any];
 const input={sourceProjectId:'funded-child',title:'Funded Child',projectType:'MOVIE' as const,sellerStudioId:'studio',sellerStudioName:'Studio',buyerPlatformId:'HULU',minimumGuarantee:0,platformRevenueShare:100,fundedPremiereContinuation:true,signedAtAbsoluteWeek:2040,startsAtAbsoluteWeek:2041,durationWeeks:52};
 const before=JSON.stringify(p.world.platforms);const result=registerProductionStreamingRightsContract(p,input);
 assert.ok(result.contract);assert.equal(result.contract.minimumGuarantee,0);assert.equal(result.contract.licensorRevenueShare,0);assert.equal(JSON.stringify(result.player.world.platforms),before);
 assert.equal(registerProductionStreamingRightsContract(result.player,input).changed,false);
 assert.equal(registerProductionStreamingRightsContract(p,{...input,sourceProjectId:'unfunded-child'}).contract,null);
});
await check('paid-tier advertising counts while its membership fee stays analytics only',async()=>{
 let p=fixture('SUBSCRIPTION');let pricing=configureStreamingPricingOffer(p.ownedStreamingPlatform.serviceConfiguration.pricing,{kind:'TOGGLE',offer:'ADS',enabled:true});
 pricing.commercialOffers!.freeAdAccess=false;pricing.plans.forEach(plan=>{plan.ads=true;plan.featureIds=plan.featureIds.filter(id=>id!=='noads')});p.ownedStreamingPlatform.serviceConfiguration.pricing=pricing;
 p=(await processGameWeek(p)).player;const op=p.ownedStreamingPlatform.weeklyHistory.at(-1)!.operations!;
 const receipts=p.world.worldStreamingViewing!.royaltyReceipts!.filter(row=>row.platformId==='PLAYER');
 assert.ok(receipts.some(row=>row.sourceKind==='SUBSCRIPTION'&&row.grossReceipts>0));
 assert.ok(receipts.some(row=>row.sourceKind==='ADVERTISING'&&row.planId&&row.grossReceipts>0));
 const adsByContract=new Map<string,number>();for(const row of receipts.filter(row=>row.sourceKind==='ADVERTISING'&&row.contractId))adsByContract.set(row.contractId!,(adsByContract.get(row.contractId!)||0)+row.grossReceipts);
 assert.equal(op.partnerRevenueShareCost,[...adsByContract.values()].reduce((sum,gross)=>sum+Math.round(gross*.1),0));
});
await check('paid legacy bonus survives local history pruning before its first resale',async()=>{
 let p=(await processGameWeek(fixture('STORE'))).player;
 const license=p.ownedStreamingPlatform.catalogLicenses[0],id=license.id;
 const week=getAbsoluteWeek(p.age,p.currentWeek);
 const pending={id:'durable-paid-bonus',licenseId:id,sourceProjectId:license.sourceProjectId,title:license.titleAtSigning,
  type:'VIEWERSHIP_THRESHOLD' as const,targetAmount:1,observedAmount:0,dueAtAbsoluteWeek:week+20,status:'PENDING' as const,breachPenalty:0,successPayment:12345,resolvedAtAbsoluteWeek:null};
 p.ownedStreamingPlatform.rightsObligations=[pending];
 p.world.streamingRightsContracts[id]={...p.world.streamingRightsContracts[id],viewershipBonusThreshold:1,viewershipBonusAmount:12345,transferredObligationStates:[pending]};
 p=(await processGameWeek(p)).player;
 assert.equal(p.ownedStreamingPlatform.weeklyHistory.at(-1)!.operations!.rightsComplianceCost,12345);
 assert.equal(p.world.streamingRightsContracts[id].transferredObligationStates![0].status,'SATISFIED');
 p.ownedStreamingPlatform.rightsObligations=[];p.ownedStreamingPlatform.eventLedger=[];
 const original=p.world.streamingRightsContracts[id];
 const sold=settleStreamingRightsTransfer(p,{sourceContractId:id,seller:original.buyer,
  buyer:{type:'AI_PLATFORM',id:'HULU',name:'Hulu',platformId:'HULU'},price:1000000,absoluteWeek:week+2,idempotencyKey:'pruned-paid-out',controllerAtCommitment:{seller:'PLAYER',buyer:'AI'}});
 assert.ok(sold.changed);if(!sold.changed)return;
 const restored=JSON.parse(JSON.stringify(sold.player));
 const bought=settleStreamingRightsTransfer(restored,{sourceContractId:sold.successorContract.id,seller:sold.successorContract.buyer,
  buyer:original.buyer,price:1000000,absoluteWeek:week+3,idempotencyKey:'pruned-paid-back',controllerAtCommitment:{seller:'AI',buyer:'PLAYER'}});
 assert.ok(bought.changed);
 assert.equal(evaluateStreamingRightsCompliance(bought.player.ownedStreamingPlatform,week+3).complianceCost,0);
 assert.equal(bought.player.ownedStreamingPlatform.rightsObligations.find(row=>row.id===pending.id)!.status,'SATISFIED');
});
console.log(JSON.stringify({checks,failures}));if(failures.length)process.exitCode=1;
