import assert from 'node:assert/strict';
import * as economics from '../services/streamingEconomyCore';
import {balanceFixture} from './helpers/streamingBalanceFixture';
import {processOwnedStreamingPlatformWeek} from '../services/streamingWeeklyLoop';
import {getAbsoluteWeek} from '../services/legacyLogic';
import {createStreamingRightsContractFromLicense} from '../services/streamingRightsCore';
import {processGameWeek} from '../services/gameLoop';
import type {Player} from '../types';
import {settlePlatformAiEconomy} from '../services/platformAi/platformAiEconomy';
import {normalizePlatformAiState} from '../services/platformAi/platformAiState';
import {progressPlatformAiDistressWorld} from '../services/platformAi/platformAiDistress';
import * as contractSettlement from '../services/streamingContractSettlement';
import {createDefaultStudioState} from '../services/businessLogic';
import {getTalentCareerProfile} from '../services/talentCareer';
import {attachStreamingRoyaltyReceipts} from '../services/worldEconomy/worldStreamingRoyaltyAttribution';
import {getWorldStreamingOffers} from '../services/worldEconomy/worldStreamingOffers';
import {configureStreamingPricingOffer} from '../services/streamingCommercialOffers';
import {evaluatePlayerStreamingTitleRoute} from '../services/streamingContentAvailability';
import {fundStreamingAncillaryRevenue} from '../services/worldEconomy/worldStreamingHouseholdBudget';

let checks=0;const failures:string[]=[];
function check(name:string,run:()=>void){checks++;try{run();console.log('PASS',name);}catch(error){failures.push(name);console.error('FAIL',name,error);}}
async function checkAsync(name:string,run:()=>Promise<void>){checks++;try{await run();console.log('PASS',name);}catch(error){failures.push(name);console.error('FAIL',name,error);}}
const allocate=(input:any)=>(economics as any).allocateStreamingSubscriptionReceipts(input);
const settle=(input:any)=>(economics as any).calculateStreamingSignedRoyaltyAllocations(input);
const signal=(id:string,n:number,contractId:string|null=id)=>({projectId:id,contractId,viewingAccounts:n,watchHours:n,
    subscriberAcquisition:n,subscriberRetention:n,advertisingRevenue:0,transactionalRevenue:0,taxesRefundsAndStorefrontFees:0});
const license={id:'A',sourceProjectId:'A',status:'ACTIVE',startsAtAbsoluteWeek:1,expiresAtAbsoluteWeek:100,
    licensorRevenueShare:20,minimumGuarantee:0,guaranteeRecoupment:'NON_RECOUPABLE',backendCap:null,
    cumulativeRoyaltyAccrued:0,cumulativeRoyaltyPaid:0};
let livePlayer:Player;
await checkAsync('live subscription expense pays each signed percentage rather than a 45-percent catalogue estimate',async()=>{
    const {p}=balanceFixture({id:'signed-subscription',core:'SUBSCRIPTION',catalog:8,quality:95,price:7.99});
    p.ownedStreamingPlatform.catalogLicenses.forEach((row,i)=>{
        const contract=createStreamingRightsContractFromLicense({guaranteeDisposition:'PAID',settledAtAbsoluteWeek:0,buyer:{type:'PLAYER_PLATFORM',id:'PLAYER',name:'Player platform',platformId:null},license:{...row,platformRevenueShare:i%2?60:80,licensorRevenueShare:i%2?40:20,
            origin:'STUDIO_MARKET',permanentPurchase:false,windowType:'FIRST_WINDOW',expiresAtAbsoluteWeek:getAbsoluteWeek(p.age,p.currentWeek)+104,
            accessGrant:{schemaVersion:1,modes:['SUBSCRIPTION'],earlyWindowWeeks:0,purchaseFulfillment:'NONE',source:'EXPLICIT'}}});
        p.world.streamingRightsContracts={...p.world.streamingRightsContracts,[row.id]:contract};
    });
    const next=(await processGameWeek(p)).player;
    livePlayer=next;
    const operations=next.ownedStreamingPlatform.weeklyHistory.at(-1)!.operations!;
    const titles=operations.titlePerformance!;
    const expected=titles.reduce((sum,title)=>{
        const contract=p.world.streamingRightsContracts?.[p.ownedStreamingPlatform.catalogLicenses.find(row=>row.sourceProjectId===title.projectId)?.id || ''];
        return sum+(contract?Math.round(title.attributedSubscriptionRevenue*contract.licensorRevenueShare/100):0);
    },0);
    assert.ok(expected>0);assert.equal(operations.partnerRevenueShareCost,expected,JSON.stringify({
        receipts:next.world.worldStreamingViewing?.royaltyReceipts?.filter(row=>row.platformId==='PLAYER').slice(0,2),
        license:next.world.streamingRightsContracts?.[p.ownedStreamingPlatform.catalogLicenses[0].id]}));
});
check('one subscription pool includes owned zero-backend titles and is not paid once per license',()=>{
    const rows=allocate({weeklySubscriptionRevenueFullCurrency:1000,titles:[signal('A',60),signal('B',30),signal('OWN',10,null)]});
    assert.deepEqual(rows.map((r:any)=>[r.projectId,r.attributedSubscriptionRevenue]),[['A',600],['B',300],['OWN',100]]);
});
check('no actual contribution cannot manufacture an equal royalty allocation',()=>{
    assert.deepEqual(allocate({weeklySubscriptionRevenueFullCurrency:1000,titles:[signal('A',0),signal('B',0)]}),[]);
});
check('duplicate title projections cannot double a project contribution',()=>{
    const rows=allocate({weeklySubscriptionRevenueFullCurrency:1000,titles:[signal('A',1),signal('A',1),signal('B',1)]});
    assert.equal(rows.filter((r:any)=>r.projectId==='A').length,1);
    assert.deepEqual(rows.map((r:any)=>r.attributedSubscriptionRevenue),[500,500]);
});
check('multiple signed percentages apply to their own attributed receipts',()=>{
    const rows=settle({licenses:[license,{...license,id:'B',sourceProjectId:'B',licensorRevenueShare:40}],
        receipts:[{receiptId:'A-sub',contractId:'A',grossReceipts:600},{receiptId:'B-sub',contractId:'B',grossReceipts:300}],absoluteWeek:10});
    assert.deepEqual(rows.map((r:any)=>r.royaltyPayable),[120,120]);
});
check('subscription and store share one recoupable advance and one backend cap',()=>{
    const rows=settle({licenses:[{...license,guaranteeRecoupment:'RECOUPABLE',minimumGuarantee:100,backendCap:50}],
        receipts:[{receiptId:'sub',contractId:'A',grossReceipts:600},{receiptId:'store',contractId:'A',grossReceipts:400}],absoluteWeek:10});
    assert.equal(rows.length,1);assert.equal(rows[0].grossRoyaltyAccrued,200);assert.equal(rows[0].royaltyPayable,50);
    assert.equal(rows[0].cumulativeRoyaltyAccrued,200);assert.equal(rows[0].cumulativeRoyaltyPaid,50);
});
check('non-recouppable guarantee is not silently used as a royalty waiver',()=>{
    const rows=settle({licenses:[{...license,minimumGuarantee:1000}],receipts:[{receiptId:'sub',contractId:'A',grossReceipts:100}],absoluteWeek:10});
    assert.equal(rows[0].royaltyPayable,20);
});
check('duplicate receipt IDs cannot charge or accrue twice',()=>{
    const receipt={receiptId:'same',contractId:'A',grossReceipts:100};
    const rows=settle({licenses:[license],receipts:[receipt,receipt],absoluteWeek:10});assert.equal(rows[0].royaltyPayable,20);
});
check('receipt-week high-water survives replay even without statement history',()=>{
    const rows=settle({licenses:[{...license,lastRoyaltyReceiptAbsoluteWeek:10,cumulativeRoyaltyAccrued:20,cumulativeRoyaltyPaid:20}],
        receipts:[{receiptId:'replayed',contractId:'A',grossReceipts:100}],absoluteWeek:10});assert.deepEqual(rows,[]);
});
check('the next earned week uses cumulative caps and advances after reload',()=>{
    const rows=settle({licenses:[JSON.parse(JSON.stringify({...license,backendCap:30,lastRoyaltyReceiptAbsoluteWeek:10,
        cumulativeRoyaltyAccrued:20,cumulativeRoyaltyPaid:20}))],receipts:[{receiptId:'next',contractId:'A',grossReceipts:100}],absoluteWeek:11});
    assert.equal(rows[0].royaltyPayable,10);assert.equal(rows[0].cumulativeRoyaltyPaid,30);
});
check('expired, future and internal contracts do not acquire current royalties',()=>{
    for(const patch of [{expiresAtAbsoluteWeek:10},{startsAtAbsoluteWeek:11},{origin:'OWNED_STUDIO_TRANSFER'},{permanentPurchase:true}])
        assert.deepEqual(settle({licenses:[{...license,...patch}],receipts:[{receiptId:'invalid',contractId:'A',grossReceipts:100}],absoluteWeek:10}),[]);
});
check('a stale WE6 receipt cannot be relabeled and charged as another owned week',()=>{
    const p=JSON.parse(JSON.stringify(livePlayer)) as Player;p.currentWeek+=1;
    const result=processOwnedStreamingPlatformWeek(p);assert.ok(result.processed);
    assert.equal(result.snapshot!.operations!.partnerRevenueShareCost,0);
});
check('ancillary funding retains paid-plan versus free-ad source provenance',()=>{
    const pricing=livePlayer.ownedStreamingPlatform.serviceConfiguration.pricing;
    const sources=(['SUBSCRIPTION','FREE_AD'] as const).map(kind=>({id:kind,cohortId:'test',platformId:'PLAYER',kind,
        planId:kind==='SUBSCRIPTION'?'BASIC':null,households:10,remainingMonthlyBudget:100,
        wallet:{remainingCents:10000},platformWallet:{remainingCents:10000}}));
    const commercial:any={premiumTransactions:10,premiumRevenue:100,dayPassTransactions:0,dayPassRevenue:0,meteredHours:0,meteredAccounts:0,meteredRevenue:0,
        patronAccounts:0,patronRevenue:0,rentalRevenue:0,purchaseRevenue:0,advertisingRevenue:0,sponsorshipRevenue:0,totalIncrementalRevenue:100,commercialOperatingCost:0};
    const funding=fundStreamingAncillaryRevenue(commercial,{...pricing,premium:{...pricing.premium,price:10}},sources) as any;
    assert.deepEqual(funding.map((row:any)=>[row.sourceKind,row.planId,row.grossReceipts]),[['SUBSCRIPTION','BASIC',50],['FREE_AD',null,50]]);
});
check('ancillary receipts honor their originating subscription or free-ad contract',()=>{
    const p=JSON.parse(JSON.stringify(livePlayer)) as Player;const state=p.world.worldStreamingViewing!;const week=state.lastProcessedAbsoluteWeek;
    p.ownedStreamingPlatform.serviceConfiguration.pricing=configureStreamingPricingOffer(p.ownedStreamingPlatform.serviceConfiguration.pricing,{kind:'TOGGLE',offer:'ADS',enabled:true});
    p.ownedStreamingPlatform.serviceConfiguration.pricing.streams.push('premium');
    const first=p.ownedStreamingPlatform.catalogLicenses[0];const id=first.sourceProjectId;
    const contracts=(['AD_SUPPORTED','SUBSCRIPTION'] as const).map((mode,index)=>createStreamingRightsContractFromLicense({
        guaranteeDisposition:'PAID',settledAtAbsoluteWeek:0,buyer:{type:'PLAYER_PLATFORM',id:'PLAYER',name:'Owned',platformId:null},
        license:{...first,id:'mode-'+index,buyerPlatformId:null,platformRevenueShare:index?40:80,origin:'STUDIO_MARKET',permanentPurchase:false,
            windowType:'FIRST_WINDOW',lastRoyaltyReceiptAbsoluteWeek:undefined,accessGrant:{schemaVersion:1,modes:[mode],earlyWindowWeeks:0,purchaseFulfillment:'NONE',source:'EXPLICIT'}}}));
    p.ownedStreamingPlatform.catalogLicenses=contracts;p.world.streamingRightsContracts=Object.fromEntries(contracts.map(row=>[row.id,row]));
    const title=state.platforms.PLAYER.titlePerformance.find(row=>row.projectId===id)!;
    const row=title.countryPerformance.find(row=>row.countryId==='US')!;row.accessMix.freeViewingAccounts=10;
    row.revenue.totalIncrementalRevenue=200;row.revenue.premiumRevenue=200;row.revenue.rentalRevenue=0;row.revenue.purchaseRevenue=0;
    (state as any).royaltySourceReceipts=[{platformId:'PLAYER',countryId:'US',projectId:id,sourceKind:'SUBSCRIPTION',planId:'BASIC',grossReceipts:100},
        {platformId:'PLAYER',countryId:'US',projectId:id,sourceKind:'FREE_AD',planId:null,grossReceipts:100}];
    assert.equal(evaluatePlayerStreamingTitleRoute(p,id,'US',week,{kind:'AD_SUPPORTED'}).allowed,true,'fixture has legal free-ad access');
    assert.equal(evaluatePlayerStreamingTitleRoute(p,id,'US',week,{kind:'SUBSCRIPTION',planId:'BASIC'}).allowed,true,'fixture has legal BASIC access');
    const attributed=attachStreamingRoyaltyReceipts(p,state,getWorldStreamingOffers(p,week).offers);
    const receipts=attributed.royaltyReceipts!.filter(row=>row.platformId==='PLAYER' && row.projectId===id && row.kind==='NON_STORE');
    assert.equal(receipts.filter(row=>row.contractId==='mode-0').reduce((sum,row)=>sum+row.grossReceipts,0),100);
    assert.equal(receipts.filter(row=>row.contractId==='mode-1').reduce((sum,row)=>sum+row.grossReceipts,0),100);
});
await checkAsync('live pure-ad engine closes real title advertising at the signed rate',async()=>{
    const {p}=balanceFixture({id:'signed-pure-ad',core:'ADVERTISING',catalog:8,quality:95,price:4});
    for(const row of p.ownedStreamingPlatform.catalogLicenses){
        const contract=createStreamingRightsContractFromLicense({guaranteeDisposition:'PAID',settledAtAbsoluteWeek:0,
            buyer:{type:'PLAYER_PLATFORM',id:'PLAYER',name:'Owned',platformId:null},license:{...row,origin:'STUDIO_MARKET',
                permanentPurchase:false,windowType:'FIRST_WINDOW',platformRevenueShare:80,licensorRevenueShare:20,
                accessGrant:{schemaVersion:1,modes:['AD_SUPPORTED'],earlyWindowWeeks:0,purchaseFulfillment:'NONE',source:'EXPLICIT'}}});
        p.world.streamingRightsContracts={...p.world.streamingRightsContracts,[contract.id]:contract};
    }
    const next=(await processGameWeek(p)).player;const view=next.world.worldStreamingViewing!.platforms.PLAYER;
    const ids=new Set(p.ownedStreamingPlatform.catalogLicenses.map(row=>row.sourceProjectId));
    const expected=view.titlePerformance.filter(row=>ids.has(row.projectId)).reduce((sum,row)=>sum+Math.round(row.revenue.advertisingRevenue*.2),0);
    assert.ok(expected>0,'test delivers paid advertising');
    assert.equal(next.ownedStreamingPlatform.weeklyHistory.at(-1)!.operations!.partnerRevenueShareCost,expected);
});
check('a pure ad service owes signed ad backend without subscription customer rows',()=>{
    const p=JSON.parse(JSON.stringify(livePlayer)) as Player;const state=p.world.worldStreamingViewing!;const week=state.lastProcessedAbsoluteWeek;
    p.ownedStreamingPlatform.serviceConfiguration.pricing=configureStreamingPricingOffer(p.ownedStreamingPlatform.serviceConfiguration.pricing,{kind:'CORE',coreModel:'ADVERTISING'});
    const first=p.ownedStreamingPlatform.catalogLicenses[0];const id=first.sourceProjectId;
    const contract=createStreamingRightsContractFromLicense({guaranteeDisposition:'PAID',settledAtAbsoluteWeek:0,
        buyer:{type:'PLAYER_PLATFORM',id:'PLAYER',name:'Owned',platformId:null},license:{...first,id:'pure-ads',permanentPurchase:false,
            windowType:'FIRST_WINDOW',platformRevenueShare:80,licensorRevenueShare:20,lastRoyaltyReceiptAbsoluteWeek:undefined,
            cumulativeRoyaltyAccrued:0,cumulativeRoyaltyPaid:0,
            accessGrant:{schemaVersion:1,modes:['AD_SUPPORTED'],purchaseFulfillment:'NONE',earlyWindowWeeks:0,source:'EXPLICIT'}}});
    p.ownedStreamingPlatform.catalogLicenses=[contract];p.world.streamingRightsContracts={[contract.id]:contract};
    const title=state.platforms.PLAYER.titlePerformance.find(row=>row.projectId===id)!;
    state.platforms.PLAYER.titlePerformance=[title];const row=title.countryPerformance.find(row=>row.countryId==='US')!;
    row.accessMix.freeViewingAccounts=10;row.accessMix.paidViewingAccounts=0;row.revenue.advertisingRevenue=1000;row.revenue.sponsorshipRevenue=0;
    title.countryPerformance=[row];state.royaltySourceReceipts=[];
    for(const country of Object.values(p.world.worldStreamingCustomers!.countries))country.platformSummaries=country.platformSummaries.filter(row=>row.platformId!=='PLAYER');
    const attributed=attachStreamingRoyaltyReceipts(p,state,getWorldStreamingOffers(p,week).offers);
    const receipts=attributed.royaltyReceipts!.filter(row=>row.platformId==='PLAYER' && row.contractId===contract.id);
    assert.equal(receipts.reduce((sum,row)=>sum+row.grossReceipts,0),1000);
    assert.equal(settle({licenses:[contract],receipts,absoluteWeek:week})[0].royaltyPayable,200);
});
check('retained purchase entitlement funds ancillary backend without a new store sale',()=>{
    const p=JSON.parse(JSON.stringify(livePlayer)) as Player;const state=p.world.worldStreamingViewing!;const week=state.lastProcessedAbsoluteWeek;
    p.ownedStreamingPlatform.serviceConfiguration.pricing=configureStreamingPricingOffer(p.ownedStreamingPlatform.serviceConfiguration.pricing,{kind:'TOGGLE',offer:'STORE',enabled:true});
    const first=p.ownedStreamingPlatform.catalogLicenses[0];const id=first.sourceProjectId;
    const contract=createStreamingRightsContractFromLicense({guaranteeDisposition:'PAID',settledAtAbsoluteWeek:0,
        buyer:{type:'PLAYER_PLATFORM',id:'PLAYER',name:'Owned',platformId:null},license:{...first,id:'retained-store',permanentPurchase:false,
            windowType:'FIRST_WINDOW',platformRevenueShare:80,licensorRevenueShare:20,lastRoyaltyReceiptAbsoluteWeek:undefined,
            cumulativeRoyaltyAccrued:0,cumulativeRoyaltyPaid:0,
            accessGrant:{schemaVersion:1,modes:['PURCHASE'],purchaseFulfillment:'PERPETUAL',earlyWindowWeeks:0,source:'EXPLICIT'}}});
    p.ownedStreamingPlatform.catalogLicenses=[contract];p.world.streamingRightsContracts={[contract.id]:contract};
    const row=state.platforms.PLAYER.titlePerformance.find(row=>row.projectId===id)!.countryPerformance.find(row=>row.countryId==='US')!;
    row.accessMix.storeViewingAccounts=10;
    p.world.worldStreamingAudienceChoice!.entitlements=[{transactionId:'old-purchase',platformId:'PLAYER',countryId:'US',titleId:id,
        kind:'PURCHASE',households:10,purchasedAtAbsoluteWeek:week-1,expiresAtAbsoluteWeek:null}];
    for(const country of Object.values(p.world.worldStreamingCustomers!.countries))country.platformSummaries=country.platformSummaries.filter(row=>row.platformId!=='PLAYER');
    state.commercialTransactions=[];state.royaltySourceReceipts=[{platformId:'PLAYER',countryId:'US',projectId:id,sourceKind:'STORE',planId:null,grossReceipts:100}];
    const attributed=attachStreamingRoyaltyReceipts(p,state,getWorldStreamingOffers(p,week).offers);
    const receipts=attributed.royaltyReceipts!.filter(row=>row.platformId==='PLAYER' && row.contractId===contract.id && row.kind==='NON_STORE');
    assert.equal(receipts.reduce((sum,row)=>sum+row.grossReceipts,0),100);
    assert.equal(settle({licenses:[contract],receipts,absoluteWeek:week})[0].royaltyPayable,20);
});
await checkAsync('owned-platform royalty expenses credit the genuine platform seller',async()=>{
    const {p}=balanceFixture({id:'owned-seller',core:'SUBSCRIPTION',catalog:8,quality:95,price:7.99});
    const license=p.ownedStreamingPlatform.catalogLicenses[0];
    const contract=createStreamingRightsContractFromLicense({guaranteeDisposition:'PAID',settledAtAbsoluteWeek:0,
        buyer:{type:'PLAYER_PLATFORM',id:'PLAYER',name:'Owned',platformId:null},seller:{type:'AI_PLATFORM',id:'NETFLIX',name:'Netflix',platformId:'NETFLIX'},
        license:{...license,buyerPlatformId:null,origin:'PLATFORM_TRADE',sellerType:'PLATFORM',sellerPlatformId:'NETFLIX',windowType:'FIRST_WINDOW',
            permanentPurchase:false,platformRevenueShare:80,licensorRevenueShare:20,accessGrant:{schemaVersion:1,modes:['SUBSCRIPTION'],earlyWindowWeeks:0,purchaseFulfillment:'NONE',source:'EXPLICIT'}}});
    p.world.streamingRightsContracts={[contract.id]:contract};
    const next=(await processGameWeek(p)).player;const week=getAbsoluteWeek(next.age,next.currentWeek);
    const statement=next.ownedStreamingPlatform.weeklyHistory.at(-1)!.operations!.contractRoyaltyStatements!.find(row=>row.contractId===contract.id)!;
    assert.ok(statement.royaltyPayable>0);
    assert.equal(next.world.platforms!.NETFLIX.ai!.royaltySellerPaidThrough?.[JSON.stringify(['PLAYER',contract.id])],week);
    assert.ok(next.world.platforms!.NETFLIX.ai!.financeHistory.at(-1)!.verifiedContractIncomeMillions>=statement.royaltyPayable/1e6);
});
check('AI subscription and store consume the same signed cap and recoupable advance',()=>{
    const p=JSON.parse(JSON.stringify(livePlayer)) as Player;const state=p.world.worldStreamingViewing!;const week=state.lastProcessedAbsoluteWeek;
    const ai=p.world.platforms!.HULU;ai.ai!.financeHistory=[];ai.ai!.rightsContracts=[];
    const contract=createStreamingRightsContractFromLicense({guaranteeDisposition:'PAID',settledAtAbsoluteWeek:0,buyer:{type:'AI_PLATFORM',id:'HULU',name:'Hulu',platformId:'HULU'},
        license:{...p.ownedStreamingPlatform.catalogLicenses[0],id:'ai-combined',origin:'PLATFORM_TRADE',sellerType:'PLATFORM',sellerPlatformId:'NETFLIX',
            lastRoyaltyReceiptAbsoluteWeek:undefined,cumulativeRoyaltyAccrued:0,cumulativeRoyaltyPaid:0,
            platformRevenueShare:80,licensorRevenueShare:20,permanentPurchase:false,windowType:'FIRST_WINDOW',expiresAtAbsoluteWeek:week+104},
        guaranteeRecoupment:'RECOUPABLE',backendCap:50});
    contract.minimumGuarantee=100;p.world.streamingRightsContracts={[contract.id]:contract};
    state.royaltyReceipts=[{receiptId:'ai-sub-500',platformId:'HULU',countryId:'US',projectId:contract.sourceProjectId,
        contractId:contract.id,kind:'SUBSCRIPTION',grossReceipts:500}];
    state.aiStoreTransactions=[{transactionId:'ai-store-500',platformId:'HULU',countryId:'US',titleId:contract.sourceProjectId,
        contractId:contract.id,kind:'RENTAL',households:100,revenue:500,purchasedAtAbsoluteWeek:week}];
    state.platforms.HULU.revenue.rentalRevenue=500;
    const first=settlePlatformAiEconomy({player:p,platform:ai,absoluteWeek:week});
    assert.equal(Math.round(first.snapshot!.partnerRevenueShareCostMillions*1e6),50);
    const saved=normalizePlatformAiState(JSON.parse(JSON.stringify(first.platform)),p.id,week+1);
    saved.ai!.financeHistory=[];
    const replay=settlePlatformAiEconomy({player:p,platform:saved,absoluteWeek:week+1});
    assert.equal(Math.round(replay.snapshot!.partnerRevenueShareCostMillions*1e6),0,'old earned week cannot be paid after history pruning');
    p.world.platforms!.HULU=first.platform;
    const seller=p.world.platforms!.NETFLIX;seller.cashReserve=1000;seller.ai!.financeHistory=[];seller.ai!.decisionHistory=[];
    const paid=progressPlatformAiDistressWorld({player:p,world:p.world,absoluteWeek:week}).world;
    assert.equal(Math.round((paid.platforms!.NETFLIX.cashReserve-1000)*1e6),50);
    paid.platforms!.NETFLIX.ai!.decisionHistory=[];
    const replayed=progressPlatformAiDistressWorld({player:{...p,world:paid},world:paid,absoluteWeek:week}).world;
    assert.equal(replayed.platforms!.NETFLIX.cashReserve,paid.platforms!.NETFLIX.cashReserve,'seller credit survives decision-history pruning');
});
check('a receipt earned before transfer remains payable without restoring new playback rights',()=>{
    const p=JSON.parse(JSON.stringify(livePlayer)) as Player;const state=p.world.worldStreamingViewing!;const earned=state.lastProcessedAbsoluteWeek;
    const ai=p.world.platforms!.HULU;ai.ai!.financeHistory=[];ai.ai!.rightsContracts=[];
    const contract=createStreamingRightsContractFromLicense({guaranteeDisposition:'PAID',settledAtAbsoluteWeek:0,
        buyer:{type:'AI_PLATFORM',id:'HULU',name:'Hulu',platformId:'HULU'},
        license:{...p.ownedStreamingPlatform.catalogLicenses[0],id:'earned-before-transfer',permanentPurchase:false,
            windowType:'FIRST_WINDOW',platformRevenueShare:80,licensorRevenueShare:20,status:'TRANSFERRED_OUT',
            lastRoyaltyReceiptAbsoluteWeek:undefined,
            cumulativeRoyaltyAccrued:0,cumulativeRoyaltyPaid:0}});
    contract.transferredAtAbsoluteWeek=earned+1;
    p.world.streamingRightsContracts={[contract.id]:contract};state.aiStoreTransactions=[];
    state.royaltyReceipts=[{receiptId:'pre-transfer',platformId:'HULU',countryId:'US',projectId:contract.sourceProjectId,
        contractId:contract.id,kind:'SUBSCRIPTION',grossReceipts:1000}];
    const result=settlePlatformAiEconomy({player:p,platform:ai,absoluteWeek:earned+1});
    assert.equal(Math.round(result.snapshot!.partnerRevenueShareCostMillions*1e6),200);
    assert.equal(p.world.streamingRightsContracts[contract.id].status,'TRANSFERRED_OUT');
    state.lastProcessedAbsoluteWeek=earned+1;
    const denied=settlePlatformAiEconomy({player:p,platform:ai,absoluteWeek:earned+2});
    assert.equal(denied.snapshot!.partnerRevenueShareCostMillions,0,'new receipts cannot earn after transfer');
});
check('signed buyer identity prevents a stale projection billing a second platform',()=>{
    const p=JSON.parse(JSON.stringify(livePlayer)) as Player;const state=p.world.worldStreamingViewing!;const week=state.lastProcessedAbsoluteWeek;
    const contract=createStreamingRightsContractFromLicense({guaranteeDisposition:'PAID',settledAtAbsoluteWeek:0,
        buyer:{type:'AI_PLATFORM',id:'HULU',name:'Hulu',platformId:'HULU'},license:{...p.ownedStreamingPlatform.catalogLicenses[0],
            id:'canonical-buyer',permanentPurchase:false,windowType:'FIRST_WINDOW',platformRevenueShare:80,licensorRevenueShare:20,
            lastRoyaltyReceiptAbsoluteWeek:undefined,cumulativeRoyaltyAccrued:0,cumulativeRoyaltyPaid:0}});
    contract.buyerPlatformId='NETFLIX';p.world.streamingRightsContracts={[contract.id]:contract};
    state.aiStoreTransactions=[];state.royaltyReceipts=[{receiptId:'wrong-buyer',platformId:'NETFLIX',countryId:'US',
        projectId:contract.sourceProjectId,contractId:contract.id,kind:'SUBSCRIPTION',grossReceipts:1000}];
    const ai=p.world.platforms!.NETFLIX;ai.ai!.financeHistory=[];ai.ai!.rightsContracts=[contract];
    assert.equal(settlePlatformAiEconomy({player:p,platform:ai,absoluteWeek:week}).snapshot!.partnerRevenueShareCostMillions,0);
});
check('subscription contribution respects country rights and conserves each billing pool',()=>{
    const p=JSON.parse(JSON.stringify(livePlayer)) as Player;const state=p.world.worldStreamingViewing!;const week=state.lastProcessedAbsoluteWeek;
    const id=p.ownedStreamingPlatform.catalogLicenses[0].sourceProjectId;
    p.ownedStreamingPlatform.catalogLicenses=p.ownedStreamingPlatform.catalogLicenses.map(row=>row.sourceProjectId===id?{...row,territory:'MULTI_REGION',countryIds:['IN']}:row);
    for(const contract of Object.values(p.world.streamingRightsContracts || {}))if(contract.sourceProjectId===id){contract.territory='MULTI_REGION';contract.countryIds=['IN'];}
    const result=attachStreamingRoyaltyReceipts(p,state,getWorldStreamingOffers(p,week).offers);
    assert.equal(result.royaltyReceipts!.filter(row=>row.platformId==='PLAYER' && row.countryId==='US' && row.projectId===id).length,0);
    const billing=Object.values(p.world.worldStreamingCustomers!.countries).reduce((sum,country)=>sum+
        (country.platformSummaries.find(row=>row.platformId==='PLAYER')?.monthlySubscriptionRevenue || 0),0);
    const attributed=result.royaltyReceipts!.filter(row=>row.platformId==='PLAYER' && row.kind==='SUBSCRIPTION').reduce((sum,row)=>sum+row.grossReceipts,0);
    assert.equal(attributed,Math.round(billing/4.33));
});
check('the explicitly signed buyer cannot inherit another platform identifier from a license projection',()=>{
    const contract=createStreamingRightsContractFromLicense({guaranteeDisposition:'PAID',settledAtAbsoluteWeek:0,buyer:{type:'AI_PLATFORM',id:'HULU',name:'Hulu',platformId:'HULU'},
        license:{...livePlayer.ownedStreamingPlatform.catalogLicenses[0],buyerPlatformId:'NETFLIX'}});
    assert.equal(contract.buyerPlatformId,'HULU');
});
for(const archiveKind of ['CURRENT','LEGACY','LEGACY_FALLBACK'])check(`two paid AI contracts credit ${archiveKind} archived studio and investor/talent once`,()=>{
    const p=JSON.parse(JSON.stringify(livePlayer)) as Player;const state=p.world.worldStreamingViewing!;const week=state.lastProcessedAbsoluteWeek;
    p.businesses=[{id:'signed-studio',name:'Signed Studio',type:'PRODUCTION_HOUSE',balance:1000,
        stats:{weeklyRevenue:0,weeklyExpenses:0,weeklyProfit:0,lifetimeRevenue:0,valuation:0},studioState:createDefaultStudioState(p.currentWeek)} as any];
    p.activeReleases=[];p.pastProjects=[{id:'archived-signed-film',name:'Archived Signed Film',streamingRoyaltyRevenue:0,streamingRevenue:0,
        studioId:'signed-studio',investorPlan:{investorEquityPercent:20,commitments:[]},talentParticipation:{schemaVersion:1,processedReceiptKeys:[],
            contracts:[{contractId:'talent-writer',role:'WRITER',roleId:'writer',talentId:'signed-writer',talentName:'Signed Writer',upfrontFee:0,
                backendPoints:2,receiptsBasis:'STUDIO_COLLECTED_TITLE_RECEIPTS'}]}} as any];
    p.world.streamingRightsContracts={};state.aiStoreTransactions=[];state.royaltyReceipts=[];
    for(const [index,id] of (['HULU','NETFLIX'] as const).entries()){
        const contract=createStreamingRightsContractFromLicense({guaranteeDisposition:'PAID',settledAtAbsoluteWeek:0,buyer:{type:'AI_PLATFORM',id,name:id,platformId:id},
            seller:{type:'PLAYER_STUDIO',id:'signed-studio',name:'Signed Studio',platformId:null},license:{...p.ownedStreamingPlatform.catalogLicenses[0],
                id:'studio-'+id,sourceProjectId:'archived-signed-film',buyerPlatformId:id,origin:'STUDIO_MARKET',sellerType:'STUDIO',sellerPlatformId:null,
                platformRevenueShare:80,licensorRevenueShare:20,windowType:'FIRST_WINDOW',permanentPurchase:false,
                lastRoyaltyReceiptAbsoluteWeek:undefined,cumulativeRoyaltyAccrued:0,cumulativeRoyaltyPaid:0,minimumGuarantee:0}});
        p.world.streamingRightsContracts[contract.id]=contract;
        state.royaltyReceipts.push({receiptId:'studio-sub-'+id,platformId:id,countryId:'US',projectId:contract.sourceProjectId,
            contractId:contract.id,kind:'SUBSCRIPTION',grossReceipts:5000*(index+1)});
        const ai=p.world.platforms![id];ai.ai!.financeHistory=[];ai.ai!.rightsContracts=[];
        p.world.platforms![id]=settlePlatformAiEconomy({player:p,platform:ai,absoluteWeek:week}).platform;
        const paid=p.world.platforms![id].ai!.royaltyAccruals![contract.id];
        p.world.streamingRightsContracts[contract.id]={...contract,cumulativeRoyaltyAccrued:paid.accrued,cumulativeRoyaltyPaid:paid.paid,
            lastRoyaltyReceiptAbsoluteWeek:paid.lastReceiptAbsoluteWeek};
    }
    if(archiveKind==='LEGACY'){p.flags={...p.flags,legacyCareerArchive:{pastProjects:p.pastProjects}};p.pastProjects=[];}
    if(archiveKind==='LEGACY_FALLBACK'){p.flags={...p.flags,legacyStudioProjects:p.pastProjects};p.pastProjects=[];}
    const collect=(contractSettlement as any).collectStreamingStudioRoyaltyReceipts;
    const next=collect(p,week) as Player;
    assert.equal(next.businesses[0].stats.weeklyRevenue,3000);
    assert.equal(next.businesses[0].balance,3352,'3000 gross less600 investor less48 talent');
    const archived=archiveKind==='CURRENT'?next.pastProjects[0]:archiveKind==='LEGACY'?next.flags.legacyCareerArchive.pastProjects[0]:next.flags.legacyStudioProjects[0];
    assert.equal(archived.streamingRoyaltyRevenue,3000);
    assert.equal(archived.investorPayouts?.lifetimeInvestorPayout,600);
    assert.equal(getTalentCareerProfile(next.world,'signed-writer')?.income,48);
    next.world.streamingRoyaltySettlements={};next.businesses[0].studioState!.financeLedger=[];
    const replay=collect(JSON.parse(JSON.stringify(next)),week) as Player;
    assert.equal(replay.businesses[0].balance,3352);
    assert.equal(getTalentCareerProfile(replay.world,'signed-writer')?.income,48);
});
console.log(JSON.stringify({checks,failures}));if(failures.length)process.exitCode=1;
