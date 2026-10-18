import assert from 'node:assert/strict';
import {balanceFixture} from './helpers/streamingBalanceFixture';
import {processGameWeek} from '../services/gameLoop';
import {getAbsoluteWeek} from '../services/legacyLogic';
import {calculateStreamingMarketOperatingCosts} from '../services/streamingMarkets';
import {allocateStreamingAudienceChoice} from '../services/worldEconomy/worldStreamingAudienceChoice';
import {getWorldStreamingOffers} from '../services/worldEconomy/worldStreamingOffers';
import {configureStreamingPricingOffer} from '../services/streamingCommercialOffers';
import {buildStreamingRightsRenewalOffer,classifyStreamingRightsRenewalControl,normalizeStreamingRightsManagementState,processStreamingRightsCalendarWeek,resolveStreamingRightsRenewal} from '../services/streamingRightsCalendar';
let checks=0;const failures:string[]=[];
const check=(name:string,fn:()=>void)=>{checks++;try{fn();console.log('PASS',name)}catch(e){failures.push(name);console.error('FAIL',name,e)}};
const {p:base}=balanceFixture({id:'model-profit',core:'SUBSCRIPTION',catalog:6,quality:95,price:7.99});
const platform=structuredClone(base.ownedStreamingPlatform);
platform.marketOperations=[{...platform.marketOperations[0],scope:'COUNTRY',countryId:'US',status:'ACTIVE',weeklyOperatingCost:100,
 countryProfile:{...platform.marketOperations[0].countryProfile!,audienceSize:1000},
 policySnapshot:{...platform.marketOperations[0].policySnapshot!,effectiveTaxPercent:20,streamingLevyPercent:2}}];
check('loss-making weeks pay a revenue levy but no income tax',()=>{
 const r=calculateStreamingMarketOperatingCosts(platform,1000,{deductibleOperatingCost:800,contentAmortization:500,countryRevenues:{US:1000}});
 assert.equal(r.marketPolicyCost,20);assert.equal(r.total,120);
});
check('profit tax deducts operating cost, content expense and the levy once',()=>{
 const r=calculateStreamingMarketOperatingCosts(platform,1000,{deductibleOperatingCost:100,contentAmortization:100,countryRevenues:{US:1000}});
 assert.equal(r.marketPolicyCost,156); // 20 levy +20% of (1000−100−100 market−100 content−20 levy)
});
check('maintenance lowers taxable profit without becoming another cash charge',()=>{
 const r=calculateStreamingMarketOperatingCosts(platform,1000,{deductibleOperatingCost:100,contentAmortization:100,additionalOperatingExpense:200,countryRevenues:{US:1000}});
 assert.equal(r.marketPolicyCost,116);
});
check('opening an empty low-tax market cannot move actual earned revenue',()=>{
 const p=structuredClone(platform);p.marketOperations.push({...p.marketOperations[0],id:'empty-market',countryId:'IN',countryProfile:{...p.marketOperations[0].countryProfile!,audienceSize:10000000},weeklyOperatingCost:0,policySnapshot:{...p.marketOperations[0].policySnapshot!,effectiveTaxPercent:0,streamingLevyPercent:0}});
 assert.equal(calculateStreamingMarketOperatingCosts(p,1000,{deductibleOperatingCost:100,contentAmortization:100,countryRevenues:{US:1000,IN:0}}).marketPolicyCost,156);
});
check('suspended markets cannot impose or shelter live charges',()=>{
 const p=structuredClone(platform);p.marketOperations[0].status='SUSPENDED';assert.equal(calculateStreamingMarketOperatingCosts(p,1000,{deductibleOperatingCost:0}).total,0);
});
const p=(await processGameWeek(base)).player;const week=getAbsoluteWeek(p.age,p.currentWeek);
const cohort={...p.world.worldAudienceEconomy!.countries.US.cohorts[0],monthlyEntertainmentBudgetPerHousehold:50,entertainmentAppetiteIndex:90};
const participation={...p.world.worldAudienceParticipation!.countries.US.cohorts.find(x=>x.cohortId===cohort.id)!,streamingOnlyHouseholds:10000,dualParticipantHouseholds:0,totalMonthlyStreamingBudget:500000,streamingEligibilityIndex:95,streamingInterestIndex:90};
const original=getWorldStreamingOffers(p,week).offers.find(x=>x.platformId==='PLAYER')!;
const free={...original,platformId:'FREE',activeCountryIds:['US'],maturityWeeks:104,catalogueStrengthIndex:90,catalogueStrengthByCountry:{US:90},marketingIndex:90,
 commercialConfiguration:configureStreamingPricingOffer(original.commercialConfiguration,{kind:'CORE' as const,coreModel:'ADVERTISING' as const}),plans:[]};
const paid={...original,platformId:'PAID',activeCountryIds:['US'],maturityWeeks:104,catalogueStrengthIndex:90,catalogueStrengthByCountry:{US:90},subscriptionCatalogueStrengthByCountry:{US:90},marketingIndex:90};
const choice=allocateStreamingAudienceChoice('US',cohort,participation,[paid,free]);
check('subscription households can discover a separate public free-ad service',()=>{
 assert.ok(choice.primarySubscriptions>0);assert.ok(choice.freeAdOpportunities.some(x=>x.platformId==='FREE'&&x.households>0));
});
check('secondary ad discovery is bounded, deterministic and preserves primary people and wallets',()=>{
 const many=Array.from({length:20},(_,i)=>({...free,platformId:'FREE-'+i}));
 const x=allocateStreamingAudienceChoice('US',cohort,participation,[paid,...many]);
 assert.ok(x.freeAdOpportunities.reduce((sum,x)=>sum+x.households,0)<=x.primarySubscriptions);
 assert.equal(x.primarySubscriptions+x.freeAdHouseholds+x.storeHouseholds+x.outsideHouseholds,x.reachableHouseholds);
 assert.ok(x.paidMonthlySpend<=x.paidMonthlyBudget+.02);
 assert.deepEqual(allocateStreamingAudienceChoice('US',cohort,participation,[...many.reverse(),paid]).freeAdOpportunities,x.freeAdOpportunities);
});
check('no title value or inactive country means no secondary ad demand',()=>{
 const empty={...free,catalogueStrengthIndex:0,catalogueStrengthByCountry:{US:0}};
 assert.equal(allocateStreamingAudienceChoice('US',cohort,participation,[paid,empty]).freeAdOpportunities.length,0);
 assert.equal(allocateStreamingAudienceChoice('US',cohort,participation,[paid,{...free,activeCountryIds:['IN']}]).freeAdOpportunities.length,0);
});
check('empty catalogue creates no new subscription or free-ad choices',()=>{
 const emptyPaid={...paid,catalogueStrengthIndex:0,catalogueStrengthByCountry:{US:0},subscriptionCatalogueStrengthByCountry:{US:0}};
 const emptyFree={...free,catalogueStrengthIndex:0,catalogueStrengthByCountry:{US:0}};
 const x=allocateStreamingAudienceChoice('US',cohort,participation,[emptyPaid,emptyFree]);
 assert.equal(x.allocations.length,0);assert.equal(x.primarySubscriptions,0);assert.equal(x.freeAdHouseholds,0);
});
check('popularity and a large treasury cannot automatically renew a loss-making player title',()=>{
 const c=Object.values(p.world.streamingRightsContracts).find(x=>x.buyer.type==='PLAYER_PLATFORM')!;
 const player=JSON.parse(JSON.stringify(p));player.ownedStreamingPlatform.treasuryCash=3000000000;
 player.ownedStreamingPlatform.weeklyHistory=Array.from({length:13},(_,i)=>({absoluteWeek:week-i,operations:{titlePerformance:[{projectId:c.sourceProjectId,viewingAccounts:1000000,hoursViewed:2000000,attributedSubscriptionRevenue:100000,cashContribution:-200000,allocatedCashCost:300000}],additionalOperatingExpense:0}})) as any;
 const offer=buildStreamingRightsRenewalOffer(player,c,week);assert.equal(offer.offerDisposition,'OFFERED');
 const m=normalizeStreamingRightsManagementState({...player.streamingRightsManagement,controlMode:'STRATEGY',policy:{...player.streamingRightsManagement.policy,maximumAutomaticGuarantee:1000000000,maximumAutomaticDurationWeeks:260,protectFranchises:false,protectGlobalExclusives:false}});
 const decision=classifyStreamingRightsRenewalControl(player,c,offer,m);
 assert.ok(decision.requiresApproval);assert.ok(decision.protectionReasons.includes('RETURN_NOT_SUPPORTED'));
});
check('saved delegated offers recheck cash returns at settlement; manual decisions remain possible',()=>{
 const c=Object.values(p.world.streamingRightsContracts).find(x=>x.buyer.type==='PLAYER_PLATFORM')!;
 const player=JSON.parse(JSON.stringify(p));player.ownedStreamingPlatform.treasuryCash=3000000000;
 player.ownedStreamingPlatform.weeklyHistory=[];
 const finite={...c,permanentPurchase:false,windowType:'FIRST_WINDOW' as const,durationWeeks:32,expiresAtAbsoluteWeek:week+20,signedAtAbsoluteWeek:week-12,startsAtAbsoluteWeek:week-12};
 player.world.streamingRightsContracts[c.id]=finite;
 player.ownedStreamingPlatform.catalogLicenses=player.ownedStreamingPlatform.catalogLicenses.map(x=>x.id===c.id?{...x,permanentPurchase:false,windowType:'FIRST_WINDOW',expiresAtAbsoluteWeek:finite.expiresAtAbsoluteWeek}:x);
 const at=finite.expiresAtAbsoluteWeek-7;
 const opened=processStreamingRightsCalendarWeek(player,at).player;
 const item=Object.values(opened.world.streamingRightsCalendar!.renewalCases).find(x=>x.sourceContractId===c.id)!;
 assert.ok(item.proposedEconomics);
 Object.assign(item,{status:'OFFER_AVAILABLE',outcome:'PENDING',delegatedReason:'Previously saved delegation',protectionReasons:[]});
 const before=opened.ownedStreamingPlatform.treasuryCash;
 const result=resolveStreamingRightsRenewal(opened,{caseId:item.id,action:'ACCEPT_RENEWAL',absoluteWeek:at,delegated:true});
 assert.equal(result.reason,'RETURN_NOT_SUPPORTED');
 assert.equal(result.player.ownedStreamingPlatform.treasuryCash,before);
 assert.equal(result.player.world.streamingRightsCalendar!.renewalCases[item.id].status,'ACTION_REQUIRED');
 const manual=resolveStreamingRightsRenewal(result.player,{caseId:item.id,action:'ACCEPT_RENEWAL',absoluteWeek:at});
 assert.equal(manual.reason,'RENEWED');
 const replay=resolveStreamingRightsRenewal(manual.player,{caseId:item.id,action:'ACCEPT_RENEWAL',absoluteWeek:at});
 assert.equal(replay.reason,'ALREADY_RESOLVED');assert.equal(replay.player.ownedStreamingPlatform.treasuryCash,manual.player.ownedStreamingPlatform.treasuryCash);
});
console.log(JSON.stringify({checks,failures}));if(failures.length)process.exitCode=1;
