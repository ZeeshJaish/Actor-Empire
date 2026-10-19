import assert from 'node:assert/strict';
import {balanceFixture} from './helpers/streamingBalanceFixture';
import {getWorldStreamingOffers} from '../services/worldEconomy/worldStreamingOffers';
import {allocateStreamingAudienceChoice} from '../services/worldEconomy/worldStreamingAudienceChoice';
import {getAbsoluteWeek} from '../services/legacyLogic';
import {normalizeWorldPopulationState} from '../services/worldEconomy/worldPopulation';
import {normalizeWorldAudienceEconomyState} from '../services/worldEconomy/worldAudienceCohorts';
import {normalizeWorldAudienceParticipationState} from '../services/worldEconomy/worldAudienceParticipation';
import type {WorldStreamingPlatformOffer} from '../types';
import * as commercial from '../services/worldEconomy/worldStreamingCommercialEconomy';
import {createWorldStreamingViewingState} from '../services/worldEconomy/worldStreamingViewing';
import {createStreamingCohortCommerce} from '../services/worldEconomy/worldStreamingHouseholdBudget';
import {forecastWorldStreamingLaunchPricing,forecastWorldStreamingBuildDemand} from '../services/worldEconomy/worldStreamingPricingForecast';
import {STREAMING_PRODUCT_DEFINITIONS} from '../services/streamingProductSuite';
import {processGameWeek} from '../services/gameLoop';
import type {OwnedStreamingProductLine} from '../types';
import {createWorldStreamingCustomerState} from '../services/worldEconomy/worldStreamingCustomers';
import * as customerEconomy from '../services/worldEconomy/worldStreamingCustomers';
import * as rightsEconomy from '../services/streamingEconomyCore';
import {createStreamingRightsContractFromLicense} from '../services/streamingRightsCore';
import {processOwnedStreamingPlatformWeek} from '../services/streamingWeeklyLoop';
import {calculatePlatformAiWeeklyEconomy,settlePlatformAiEconomy} from '../services/platformAi/platformAiEconomy';
import {normalizePlatformAiState} from '../services/platformAi/platformAiState';
import {progressPlatformAiDistressWorld} from '../services/platformAi/platformAiDistress';
import {progressPlatformAiRightsLifecycle} from '../services/platformAi/platformAiRightsLifecycle';
import {processWorldTurn} from '../services/worldLogic';
import {getOwnedStreamingProgramEntries} from '../services/streamingOriginals';
import {streamingTitleQuality,streamingTitleWeeksAvailable} from '../services/worldEconomy/worldStreamingContentValue';

let checks=0; const failures:string[]=[];
function check(name:string, fn:()=>void) { checks++;try {fn();console.log('PASS',name);}catch(e){failures.push(name);console.error('FAIL',name,e instanceof Error ? e.stack : String(e));} }
const {p}=balanceFixture({id:'shared-budget',core:'STORE',catalog:8,quality:95,price:2.99,buy:9.99});
const week=getAbsoluteWeek(p.age,p.currentWeek);
p.world.worldPopulation=normalizeWorldPopulationState(p.world.worldPopulation,week);
p.world.worldAudienceEconomy=normalizeWorldAudienceEconomyState(p.world.worldAudienceEconomy,p.world.worldPopulation,week);
p.world.worldAudienceParticipation=normalizeWorldAudienceParticipationState(p.world.worldAudienceParticipation,p.world.worldPopulation,p.world.worldAudienceEconomy,week);
const registry=getWorldStreamingOffers(p,week);
const template=registry.offers.find(row=>row.platformId==='PLAYER')!;
const country=p.world.worldAudienceEconomy!.countries.US;
const original=country.cohorts[0];
const cohort={...original,monthlyEntertainmentBudgetPerHousehold:40,entertainmentAppetiteIndex:70};
const part={...p.world.worldAudienceParticipation!.countries.US.cohorts.find(row=>row.cohortId===original.id)!,
    streamingOnlyHouseholds:10_000,dualParticipantHouseholds:0,totalMonthlyStreamingBudget:400_000};
const store:WorldStreamingPlatformOffer={...template,activeCountryIds:['US']} as WorldStreamingPlatformOffer;
const paidTemplate=registry.offers.find(row=>row.platformId!=='PLAYER' && row.plans.length)!;
const rival:WorldStreamingPlatformOffer={...paidTemplate,activeCountryIds:['US'],catalogueStrengthIndex:95,
    subscriptionCatalogueStrengthByCountry:{US:95},plans:paidTemplate.plans.map(plan=>({...plan,monthlyPrice:8,monthlyBillingPrice:8,annualBillingMonthlyPrice:8}))};
const choice=allocateStreamingAudienceChoice('US',cohort,part,[store,rival]);
check('rival subscribers retain a separately counted public rental opportunity',()=>{
    const opportunities=choice.storeOpportunities || [];
    assert.ok(choice.primarySubscriptions>0);
    assert.ok(opportunities.some((row:any)=>row.platformId==='PLAYER' && row.households>0));
});
check('secondary rental opportunities never create primary households',()=>assert.equal(
    choice.primarySubscriptions+choice.freeAdHouseholds+choice.storeHouseholds+choice.outsideHouseholds,10_000));
const monthlyValue=(appetite:number)=>allocateStreamingAudienceChoice('US',
    {...cohort,entertainmentAppetiteIndex:appetite},part,[store,{...rival,plans:rival.plans.map(plan=>({...plan,monthlyPrice:29.99,monthlyBillingPrice:29.99,annualBillingMonthlyPrice:29.99}))}]).primarySubscriptions;
const occasional=monthlyValue(10),frequent=monthlyValue(95);
check('monthly bundle value responds materially to expected viewing use',()=>assert.ok(frequent>occasional*1.5,`${occasional} vs ${frequent}`));
check('budget-capped tenure reconciles to gross replacement joins and cancellations',()=>{
    const replacements=(customerEconomy as any).streamingCustomerReplacementCount(100,87,11);
    assert.equal(replacements,11);
    assert.equal(100+replacements-87,24);
});
const empty={...store,platformId:'EMPTY',catalogueStrengthIndex:0,catalogueStrengthByCountry:{US:0},storeCatalogueStrengthByCountry:{US:0},
    commercialConfiguration:{...store.commercialConfiguration,rentals:{...store.commercialConfiguration.rentals,rent:.01}}};
check('an empty cheap store cannot change subscription value or reserve audience money',()=>{
    const plain=allocateStreamingAudienceChoice('US',cohort,part,[rival]);
    const added=allocateStreamingAudienceChoice('US',cohort,part,[rival,empty]);
    assert.equal(added.primarySubscriptions,plain.primarySubscriptions);
    const ledger=createStreamingCohortCommerce({countryId:'US',cohort,participation:part,choice:added,offers:[rival,empty]});
    assert.equal(ledger.budget.allocatedCents.EMPTY || 0,0);
});
check('all platforms split one remaining weekly budget after all subscriptions',()=>{
    const budget=commercial.createStreamingHouseholdBudget({monthlyBudget:2000,monthlySubscriptionSpend:1200,
        platformWeights:[{platformId:'A',weight:3},{platformId:'B',weight:2}]});
    assert.equal(budget.weeklyDiscretionaryCents,18475);
    assert.equal(budget.wallets.A.remainingCents+budget.wallets.B.remainingCents,18475);
    const a=commercial.spendStreamingStoreWallet(budget.wallets.A,1000,2.99);
    const b=commercial.spendStreamingStoreWallet(budget.wallets.B,1000,2.99);
    assert.ok((a+b)*299<=18475);
});
check('an exhausted subscription budget cannot fund rental on another service',()=>{
    const budget=commercial.createStreamingHouseholdBudget({monthlyBudget:100,monthlySubscriptionSpend:105,
        platformWeights:[{platformId:'PLAYER',weight:1}]});
    assert.equal(commercial.spendStreamingStoreWallet(budget.wallets.PLAYER,100,1),0);
});
for(const obligation of [NaN,Infinity,-1]) check(`invalid obligation ${obligation} cannot reopen a spending wallet`,()=>{
    const budget=commercial.createStreamingHouseholdBudget({monthlyBudget:100,monthlySubscriptionSpend:obligation,
        platformWeights:[{platformId:'PLAYER',weight:1}]});
    assert.equal(budget.weeklyDiscretionaryCents,0);
});
const viewing=createWorldStreamingViewingState(p,week);
check('capacity forecast counts the same secondary store reach as its country projections',()=>{
    const pricing=p.ownedStreamingPlatform.serviceConfiguration.pricing;
    const forecast=forecastWorldStreamingLaunchPricing(p,pricing,['US']);
    const build=forecastWorldStreamingBuildDemand(p,pricing,['US']);
    assert.ok((forecast.secondaryStoreOpportunities || 0)>0);
    assert.equal(build.forecastAccounts,forecast.subscribers+forecast.freeAdHouseholds+forecast.storeHouseholds+(forecast.secondaryStoreOpportunities || 0));
    assert.equal(Object.values(build.byMarket).reduce((sum,value)=>sum+value,0),build.likely);
});
check('live viewing exposes conserved country/cohort spending evidence',()=>{
    const budgets=viewing.householdBudgets;
    assert.ok(budgets?.length>0);
    for(const row of budgets) {
        assert.ok(row.spentCents<=row.weeklyDiscretionaryCents);
        assert.ok(row.weeklyDiscretionaryCents<=Math.floor(Math.max(0,row.monthlyBudget-row.monthlySubscriptionSpend)*100/4.33));
    }
});
check('a legacy subscriber seed cannot exceed real participating household budgets',()=>{
    const {p:seeded}=balanceFixture({id:'legacy-budget',core:'SUBSCRIPTION',catalog:8,quality:95,price:7.99});
    seeded.ownedStreamingPlatform.metrics.subscribers=1_000_000_000;
    const state=createWorldStreamingCustomerState(seeded,week);
    const budget=p.world.worldAudienceParticipation!.countries.US.totalMonthlyStreamingBudget;
    assert.ok(state.countries.US.monthlySubscriptionRevenue<=budget);
});
check('live receipts from every consumer product are funded by the same ledger',()=>{
    const consumer=Object.values(viewing.platforms).reduce((sum,row)=>sum+row.revenue.rentalRevenue
        +row.revenue.purchaseRevenue+row.revenue.premiumRevenue+row.revenue.dayPassRevenue
        +(row.revenue.oneHourPassRevenue || 0)+row.revenue.meteredRevenue+row.revenue.patronRevenue,0);
    const spent=(viewing.householdBudgets || []).reduce((sum:number,row:any)=>sum+row.spentCents,0);
    assert.ok(consumer*100<=spent,`${consumer*100} receipts cents vs ${spent} funded cents`);
});
for(const price of [.004,3.334]) check(`fractional price ${price} cannot earn more cash than the wallet debit`,()=>{
    const {p:priced}=balanceFixture({id:'fractional-price',core:'STORE',catalog:8,quality:95,price,buy:price});
    const state=createWorldStreamingViewingState(priced,getAbsoluteWeek(priced.age,priced.currentWeek));
    const receipts=state.platforms.PLAYER.revenue.rentalRevenue+state.platforms.PLAYER.revenue.purchaseRevenue;
    const funded=(state.householdBudgets || []).reduce((sum,row)=>sum+(row.spentByPlatformCents.PLAYER || 0),0);
    assert.ok(receipts*100<=funded,`${receipts*100} vs ${funded}`);
});
const royaltyPlayer=structuredClone(p);
royaltyPlayer.ownedStreamingPlatform.catalogLicenses.forEach(license=>{
    license.licensorRevenueShare=28;license.platformRevenueShare=72;
    license.permanentPurchase=false;license.origin='STUDIO_MARKET';
    license.windowType='FIRST_WINDOW';license.expiresAtAbsoluteWeek=week+104;
});
const storeWeek=(await processGameWeek(royaltyPlayer)).player;
check('live licensed title facts survive ordinary old-world history pruning',()=>{
    const archived=structuredClone(royaltyPlayer);
    const title={...archived.world.projects[0],year:archived.age-10,quality:95};
    archived.world.projects=[...Array.from({length:30},(_,i)=>({...title,id:'unlicensed-history-'+i})),title];
    const advanced=processWorldTurn(archived).world;
    assert.ok(advanced.projects.some(project=>project.id===title.id));
    assert.equal(streamingTitleQuality({...archived,world:advanced},title.id),95);
    const full=structuredClone(archived);
    full.world.projects=[...Array.from({length:350},(_,i)=>({...title,id:'recent-unlicensed-'+i,year:full.age})),title];
    const retained=processWorldTurn(full).world.projects;
    assert.equal(retained.length,320);
    assert.equal(retained.at(-1)!.id,title.id,'retention preserves record order and protects beyond the ordinary cap');
    archived.ownedStreamingPlatform.catalogLicenses.forEach(license=>license.status='EXPIRED');
    archived.world.streamingRightsContracts={};
    const released=processWorldTurn(archived).world;
    assert.ok(!released.projects.some(project=>project.id===title.id),'expired rights must not pin old history forever');
});
check('a newly licensed title after week12 retains its real premiere age without resetting an existing title',()=>{
    const late=structuredClone(royaltyPlayer);
    const launch=late.ownedStreamingPlatform.launchCommit!.committedAtAbsoluteWeek;
    const absolute=launch+104;
    late.age=Math.floor(absolute/52)+1;late.currentWeek=absolute%52+1;
    late.ownedStreamingPlatform.catalogLicenses.forEach(license=>{license.startsAtAbsoluteWeek=absolute;license.expiresAtAbsoluteWeek=absolute+104;});
    late.ownedStreamingPlatform.catalogLicenses.unshift({...late.ownedStreamingPlatform.catalogLicenses[0],
        id:'future-sibling-window',startsAtAbsoluteWeek:absolute+50,expiresAtAbsoluteWeek:absolute+154});
    const entry=getOwnedStreamingProgramEntries(late).find(row=>row.source==='LICENSED_WINDOW')!;
    assert.equal(entry.launchWeek,105);
    assert.equal(streamingTitleWeeksAvailable(late,entry,absolute),1);
    late.ownedStreamingPlatform.weeklyHistory=[{absoluteWeek:absolute-1,operations:{titlePerformance:[{projectId:entry.projectId,weeksAvailable:90}]}} as any];
    assert.equal(streamingTitleWeeksAvailable(late,entry,absolute),91,'a renewal/date edit does not mint a second premiere');
});
check('direct licensed store receipts pay the full signed backend without a catalogue discount',()=>{
    const cost=(rightsEconomy as any).calculateStreamingStoreRevenueShareFullCurrency?.({
        licenses:royaltyPlayer.ownedStreamingPlatform.catalogLicenses,
        receipts:[{contractId:p.ownedStreamingPlatform.catalogLicenses[0].id,grossReceipts:100}],absoluteWeek:week});
    assert.equal(cost,28);
});
check('live licensed rental backend reconciles to the full signed transaction share',()=>{
    const state=storeWeek.world.worldStreamingViewing!.platforms.PLAYER;
    const share=storeWeek.ownedStreamingPlatform.catalogLicenses[0].licensorRevenueShare/100;
    const gross=state.revenue.rentalRevenue+state.revenue.purchaseRevenue;
    assert.ok(gross>0);
    assert.equal(storeWeek.ownedStreamingPlatform.weeklyHistory.at(-1)!.operations!.partnerRevenueShareCost,
        state.titlePerformance.filter(title => storeWeek.ownedStreamingPlatform.catalogLicenses.some(license => license.sourceProjectId === title.projectId))
            .reduce((sum,title)=>sum+Math.round((title.revenue.rentalRevenue+title.revenue.purchaseRevenue)*share),0));
});
check('store royalties preserve recoupment, backend caps and exempt buyouts',()=>{
    const license=royaltyPlayer.ownedStreamingPlatform.catalogLicenses[0];
    const cost=(patch:object)=>rightsEconomy.calculateStreamingStoreRevenueShareFullCurrency({
        licenses:[{...license,...patch}],receipts:[{contractId:license.id,grossReceipts:100}],absoluteWeek:week});
    assert.equal(cost({guaranteeRecoupment:'RECOUPABLE',minimumGuarantee:100,cumulativeRoyaltyAccrued:80}),8);
    assert.equal(cost({backendCap:30,cumulativeRoyaltyPaid:25}),5);
    assert.equal(cost({permanentPurchase:true}),0);
    assert.equal(cost({origin:'OWNED_STUDIO_TRANSFER'}),0);
    assert.equal(cost({status:'TERMINATED'}),0);
});
const cappedPlayer=structuredClone(royaltyPlayer);
cappedPlayer.world.streamingRightsContracts=Object.fromEntries(cappedPlayer.ownedStreamingPlatform.catalogLicenses.map(license=>{
    const contract=createStreamingRightsContractFromLicense({license,
        buyer:{type:'PLAYER_PLATFORM',id:cappedPlayer.ownedStreamingPlatform.identity!.slug,name:'Budget QA',platformId:null},
        guaranteeDisposition:'PAID',settledAtAbsoluteWeek:week,backendCap:30});
    return [contract.id,contract];
}));
const cappedWeek=(await processGameWeek(cappedPlayer)).player;
const cappedNext=(await processGameWeek(cappedWeek)).player;
check('canonical store backend caps persist across weeks without replaying payments',()=>{
    assert.equal(cappedWeek.ownedStreamingPlatform.weeklyHistory.at(-1)!.operations!.partnerRevenueShareCost,240);
    assert.equal(cappedNext.ownedStreamingPlatform.weeklyHistory.at(-1)!.operations!.partnerRevenueShareCost,0);
    assert.ok(cappedPlayer.ownedStreamingPlatform.catalogLicenses.every(license=>
        cappedNext.world.streamingRightsContracts![license.id].cumulativeRoyaltyPaid===30));
    const replay=processOwnedStreamingPlatformWeek(cappedNext);
    assert.equal(replay.processed,false);
    assert.equal(replay.player.ownedStreamingPlatform.treasuryCash,cappedNext.ownedStreamingPlatform.treasuryCash);
});
check('a rival pays the same licensed store backend and records platform seller credit',()=>{
    // A processed career may carry a transient life-event callback. This proof
    // consumes serialized economy state, just as the save/reload path does.
    const rivalPlayer=JSON.parse(JSON.stringify(storeWeek)) as typeof storeWeek;
    const ai=rivalPlayer.world.platforms!.HULU;
    ai.ai!.financeHistory=ai.ai!.financeHistory.filter(row=>row.absoluteWeek<rivalPlayer.world.worldStreamingViewing!.lastProcessedAbsoluteWeek);
    const license={...royaltyPlayer.ownedStreamingPlatform.catalogLicenses[0],
        id:'shared-rival-license',origin:'PLATFORM_TRADE' as const,buyerPlatformId:'HULU',sellerType:'PLATFORM' as const,sellerPlatformId:'NETFLIX'};
    ai.ai!.rightsContracts=[license];
    const state=rivalPlayer.world.worldStreamingViewing!;
    const before=calculatePlatformAiWeeklyEconomy({player:rivalPlayer,platform:ai,absoluteWeek:state.lastProcessedAbsoluteWeek});
    state.aiStoreTransactions=[{transactionId:'shared-rival-royalty',platformId:'HULU',countryId:'US',
        titleId:license.sourceProjectId,contractId:license.id,kind:'RENTAL',households:10,revenue:100,
        purchasedAtAbsoluteWeek:state.lastProcessedAbsoluteWeek}];
    state.platforms.HULU.revenue.rentalRevenue+=100;
    const after=calculatePlatformAiWeeklyEconomy({player:rivalPlayer,platform:ai,absoluteWeek:state.lastProcessedAbsoluteWeek});
    assert.equal(Math.round((after.snapshot!.partnerRevenueShareCostMillions-before.snapshot!.partnerRevenueShareCostMillions)*1e6),28);
    const trade=after.snapshot!.platformTradeRoyaltyAllocations!.find(row=>row.contractId===license.id)!;
    const oldTrade=before.snapshot!.platformTradeRoyaltyAllocations?.find(row=>row.contractId===license.id)?.amountMillions || 0;
    assert.equal(Math.round((trade.amountMillions-oldTrade)*1e6),28);
    const contract=createStreamingRightsContractFromLicense({license,buyer:{type:'AI_PLATFORM',id:'HULU',name:'Hulu',platformId:'HULU'},
        guaranteeDisposition:'PAID',settledAtAbsoluteWeek:week,backendCap:30});
    rivalPlayer.world.streamingRightsContracts![contract.id]=contract;
    ai.ai!.rightsContracts=[];
    const canonicalOnly=calculatePlatformAiWeeklyEconomy({player:rivalPlayer,platform:ai,absoluteWeek:state.lastProcessedAbsoluteWeek});
    assert.equal(Math.round(canonicalOnly.snapshot!.partnerRevenueShareCostMillions*1e6),28,
        'A valid canonical contract must pay backend without a redundant local projection');
    let settled=settlePlatformAiEconomy({player:rivalPlayer,platform:ai,absoluteWeek:state.lastProcessedAbsoluteWeek});
    assert.equal(settled.platform.ai!.financeHistory.at(-1)!.storeRoyaltyAccruals!.find(row=>row.contractId===contract.id)!.paid,28);
    const replay=settlePlatformAiEconomy({player:rivalPlayer,platform:settled.platform,absoluteWeek:state.lastProcessedAbsoluteWeek});
    assert.equal(replay.changed,false);
    assert.equal(replay.platform.cashReserve,settled.platform.cashReserve);
    rivalPlayer.world.platforms!.HULU=settled.platform;
    const seller=rivalPlayer.world.platforms!.NETFLIX;
    seller.cashReserve=1000;seller.ai!.status='ACTIVE';seller.ai!.debtMillions=0;
    seller.ai!.financeHistory=[];seller.ai!.distressEpisodes=[];
    const paidWorld=progressPlatformAiDistressWorld({player:rivalPlayer,world:rivalPlayer.world,absoluteWeek:state.lastProcessedAbsoluteWeek}).world;
    assert.equal(Math.round((paidWorld.platforms!.NETFLIX.cashReserve-seller.cashReserve)*1e6),28,
        'A canonical-only trade must credit actual seller cash from verified buyer expense');
    const replayWorld=progressPlatformAiDistressWorld({player:{...rivalPlayer,world:paidWorld},world:paidWorld,
        absoluteWeek:state.lastProcessedAbsoluteWeek}).world;
    assert.equal(replayWorld.platforms!.NETFLIX.cashReserve,paidWorld.platforms!.NETFLIX.cashReserve);
    const reloaded=normalizePlatformAiState(JSON.parse(JSON.stringify(settled.platform)),rivalPlayer.id,state.lastProcessedAbsoluteWeek+1);
    state.lastProcessedAbsoluteWeek++;
    settled=settlePlatformAiEconomy({player:rivalPlayer,platform:reloaded,absoluteWeek:state.lastProcessedAbsoluteWeek});
    assert.equal(settled.platform.ai!.financeHistory.at(-1)!.storeRoyaltyAccruals!.find(row=>row.contractId===contract.id)!.paid,30);
});
check('store-only operating capacity includes delivered rental viewing',()=>{
    assert.ok(storeWeek.world.worldStreamingViewing!.platforms.PLAYER.totalViewingAccounts>100);
    assert.ok(storeWeek.ownedStreamingPlatform.weeklyHistory.at(-1)!.operations!.peakConcurrentStreams>1);
});
check('earned historical store royalties survive later rights expiry without granting new access',()=>{
    const historical=JSON.parse(JSON.stringify(storeWeek)) as typeof storeWeek;
    const state=historical.world.worldStreamingViewing!;
    const receiptWeek=state.lastProcessedAbsoluteWeek;
    const license={...royaltyPlayer.ownedStreamingPlatform.catalogLicenses[0],id:'historical-store-royalty',
        buyerPlatformId:'HULU',expiresAtAbsoluteWeek:receiptWeek+6};
    const contract=createStreamingRightsContractFromLicense({license,
        buyer:{type:'AI_PLATFORM',id:'HULU',name:'Hulu',platformId:'HULU'},guaranteeDisposition:'PAID',settledAtAbsoluteWeek:week});
    historical.world.streamingRightsContracts![contract.id]=contract;
    historical.world.platforms!.HULU.ai!.rightsContracts=[license];
    historical.world.platforms!.HULU.ai!.financeHistory=[];
    state.aiStoreTransactions=[{transactionId:'historical-store-sale',platformId:'HULU',countryId:'US',
        titleId:license.sourceProjectId,contractId:license.id,kind:'RENTAL',households:10,revenue:100,purchasedAtAbsoluteWeek:receiptWeek}];
    state.platforms.HULU.revenue.rentalRevenue=100;state.platforms.HULU.revenue.purchaseRevenue=0;
    const current=receiptWeek+7;
    const expired=progressPlatformAiRightsLifecycle({player:historical,world:historical.world,platformId:'HULU',absoluteWeek:current});
    assert.equal(expired.world.streamingRightsContracts![license.id].status,'EXPIRED');
    const economy=calculatePlatformAiWeeklyEconomy({player:{...historical,world:expired.world},platform:expired.world.platforms!.HULU,absoluteWeek:current});
    assert.equal(Math.round(economy.snapshot!.partnerRevenueShareCostMillions*1e6),28);
});
for(const id of ['FAN','STORE','INTERACTIVE','FREE'] as const) {
    const {p:product}=balanceFixture({id:'product-budget',core:'SUBSCRIPTION',catalog:8,quality:95,price:7.99});
    const definition=STREAMING_PRODUCT_DEFINITIONS.find(row=>row.id===id)!;
    product.ownedStreamingPlatform.productLines=[{...definition,id:'product-budget-'+id,lineId:id,
        idempotencyKey:'product-budget-'+id,status:'ACTIVE',launchMode:'BALANCED',capitalCost:definition.baseCapitalCost,
        weeklyOperatingCost:definition.baseWeeklyOperatingCost,developmentWeeks:definition.baseDevelopmentWeeks,
        startedAtAbsoluteWeek:week-10,readyAtAbsoluteWeek:week-1,launchedAtAbsoluteWeek:week-1,lastStatusChangedAtAbsoluteWeek:week-1} as OwnedStreamingProductLine];
    const advanced=(await processGameWeek(product)).player;
    const op=advanced.ownedStreamingPlatform.weeklyHistory.at(-1)!.operations!;
    const state=advanced.world.worldStreamingViewing!;
    check(`${id} product income must be funded once and reconcile to the actual company week`,()=>{
        assert.equal(op.productRevenue,state.householdProductRevenue || 0);
        if(id==='FREE') assert.equal(op.productRevenue,0,'advertising is paid by the finite ad market, not a second per-subscriber credit');
        else assert.ok((op.productRevenue || 0)>0);
    });
}
console.log(JSON.stringify({checks,failures,occasional,frequent}));
if(failures.length)process.exitCode=1;
