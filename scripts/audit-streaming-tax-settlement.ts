import assert from 'node:assert/strict';
import {balanceFixture} from './helpers/streamingBalanceFixture';
import {createPlatformAiFixture} from './helpers/platformAiFixture';
import {getAbsoluteWeek} from '../services/legacyLogic';
import {performStreamingPreventiveMaintenance} from '../services/streamingInfrastructureOperations';
import {finalizeStreamingMaintenanceTax} from '../services/streamingMarketTaxSettlement';
import {normalizeOwnedStreamingPlatformState} from '../services/ownedStreamingPlatform';
import {normalizePlatformAiState} from '../services/platformAi/platformAiState';
import {calculatePlatformAiWeeklyEconomy} from '../services/platformAi/platformAiEconomy';
import type {Player} from '../types';

let checks=0;
const failures:string[]=[];
const check=(name:string,fn:()=>void)=>{checks++;try{fn();console.log('PASS',name)}catch(error){failures.push(name);console.error('FAIL',name,error)}};
const {p:launched}=balanceFixture({id:'tax-settlement',core:'SUBSCRIPTION',catalog:6});
const maintenanceFixture=(funded=18_000_000):Player=>{
    const p=structuredClone(launched),s=p.ownedStreamingPlatform;
    const week=getAbsoluteWeek(p.age,p.currentWeek);
    s.treasuryCash=100_000_000;s.lastProcessedAbsoluteWeek=week;
    const facility=s.infrastructureSetup!.facilities[0];facility.installedRacks=10;
    facility.physical={...facility.physical!,maintenanceConditionPercent:60,lastMaintenanceAbsoluteWeek:week-20};
    s.weeklyHistory=[{absoluteWeek:week,operations:{headline:'Tax settlement fixture',subscriptionRevenue:100_000_000,
        marketPolicyCost:18_000_000,marketIncomeTax:18_000_000,marketRevenueLevy:0,totalCashCost:28_000_000,
        netCashContribution:72_000_000,accountingContribution:72_000_000,contentAmortization:0,additionalOperatingExpense:0,
        titlePerformance:[{projectId:'tax-title',title:'Tax Title',allocatedCashCost:28_000_000,cashContribution:72_000_000,accountingContribution:72_000_000}],
        marketTaxSettlement:{schemaVersion:1,revenueLevy:0,bands:[{preMaintenanceProfit:90_000_000,maintenanceShare:1,taxRate:.2}],remainingFundedPolicyCost:funded},
    }}] as any;
    return p;
};
check('manual maintenance reduces already-settled income tax and cash by its after-tax cost',()=>{
    const p=maintenanceFixture(),id=p.ownedStreamingPlatform.infrastructureSetup!.facilities[0].id;
    const result=performStreamingPreventiveMaintenance(p,id);assert.ok(result.changed);
    const s=result.player.ownedStreamingPlatform,ops=s.weeklyHistory[0].operations!;
    assert.equal(s.treasuryCash,99_680_000); // 400,000 maintenance less 80,000 tax relief
    assert.equal(ops.marketIncomeTax,17_920_000);assert.equal(ops.marketPolicyCost,17_920_000);
    assert.equal(ops.additionalOperatingExpense,400_000);assert.equal(ops.totalCashCost,27_920_000);
    assert.equal(ops.netCashContribution,72_080_000);assert.equal(ops.accountingContribution,72_080_000);
    assert.equal(ops.titlePerformance![0].allocatedCashCost,27_920_000);
    const replay=performStreamingPreventiveMaintenance(result.player,id);
    assert.equal(replay.changed,false);assert.equal(replay.player.ownedStreamingPlatform.treasuryCash,s.treasuryCash);
});
check('maintenance relief never refunds unfunded tax',()=>{
    const p=maintenanceFixture(20_000),id=p.ownedStreamingPlatform.infrastructureSetup!.facilities[0].id;
    const second=structuredClone(p.ownedStreamingPlatform.infrastructureSetup!.facilities[0]);second.id='second-tax-facility';
    p.ownedStreamingPlatform.infrastructureSetup!.facilities.push(second);
    const result=performStreamingPreventiveMaintenance(p,id);assert.ok(result.changed);
    assert.equal(result.player.ownedStreamingPlatform.treasuryCash,99_600_000);
    const settled=result.player.ownedStreamingPlatform.weeklyHistory[0].operations!;
    assert.equal(settled.marketIncomeTax,17_920_000);
    assert.equal(settled.netCashContribution,72_000_000); // revised liability still exceeds the $20k actually funded
    assert.equal(settled.accountingContribution,72_080_000); // all $80k ceases to be an incurred expense
    assert.equal(settled.totalCashCost,27_920_000);
    const reloaded=JSON.parse(JSON.stringify(result.player)) as Player;
    // Rates/market openings after earnings cannot rewrite the earned week's tax basis.
    reloaded.ownedStreamingPlatform.marketOperations=[];
    const next=performStreamingPreventiveMaintenance(reloaded,second.id);assert.ok(next.changed);
    assert.equal(next.player.ownedStreamingPlatform.treasuryCash,99_200_000);
    assert.equal(next.player.ownedStreamingPlatform.weeklyHistory[0].operations!.marketIncomeTax,17_840_000);
    assert.equal(next.player.ownedStreamingPlatform.weeklyHistory[0].operations!.marketTaxSettlement!.remainingFundedPolicyCost,20_000);
});
check('paid maintenance refunds only funded tax above the revised liability, including after reload',()=>{
    const p=maintenanceFixture(20_000),s=p.ownedStreamingPlatform,week=getAbsoluteWeek(p.age,p.currentWeek);
    // A paid $89.95m maintenance expense leaves $50k taxable at 20%: $10k liability.
    s.treasuryCash-=89_950_000;
    s.weeklyHistory[0].operations!.additionalOperatingExpense=89_950_000;
    s.eventLedger.push({id:'large-paid-maintenance',idempotencyKey:'large-paid-maintenance',absoluteWeek:week,
        type:'INFRASTRUCTURE_MAINTENANCE_COMPLETED',source:'PLAYER_ACTION',summary:'Paid maintenance',metadata:{cost:89_950_000}});
    const settled=finalizeStreamingMaintenanceTax(s,week);
    assert.equal(settled.treasuryCash,10_060_000);
    assert.equal(settled.weeklyHistory[0].operations!.marketPolicyCost,10_000);
    assert.equal(settled.weeklyHistory[0].operations!.marketTaxSettlement!.remainingFundedPolicyCost,10_000);
    const reloaded=normalizeOwnedStreamingPlatformState(JSON.parse(JSON.stringify(settled)),p.id);
    const replay=finalizeStreamingMaintenanceTax(reloaded,week);
    assert.equal(replay.treasuryCash,10_060_000);
    // Another $25k actually paid reduces liability by $5k, so just $5k more is refundable.
    replay.treasuryCash-=25_000;
    replay.weeklyHistory[0].operations!.additionalOperatingExpense!+=25_000;
    const next=finalizeStreamingMaintenanceTax(replay,week);
    assert.equal(next.treasuryCash,10_040_000);
    assert.equal(next.weeklyHistory[0].operations!.marketPolicyCost,5_000);
    assert.equal(next.weeklyHistory[0].operations!.marketTaxSettlement!.remainingFundedPolicyCost,5_000);
    assert.equal(finalizeStreamingMaintenanceTax(next,week).treasuryCash,next.treasuryCash);
});
check('legacy maintenance without tax payment proof receives no invented credit',()=>{
    const p=maintenanceFixture();delete p.ownedStreamingPlatform.weeklyHistory[0].operations!.marketTaxSettlement;
    const result=performStreamingPreventiveMaintenance(p,p.ownedStreamingPlatform.infrastructureSetup!.facilities[0].id);
    assert.ok(result.changed);assert.equal(result.player.ownedStreamingPlatform.treasuryCash,99_600_000);
});

const player=createPlatformAiFixture(),week=2092;
const rival=normalizePlatformAiState(structuredClone(player.world.platforms!.HULU),player.id,week);
const market=rival.ai!.marketOperations.find(x=>x.countryId==='US'&&x.countryProfile&&x.policySnapshot)!;
rival.ai!.marketOperations=[{...market,status:'ACTIVE',weeklyOperatingCost:0,policySnapshot:{...market.policySnapshot!,effectiveTaxPercent:20,streamingLevyPercent:0}}];
rival.ai!.rightsContracts=[];rival.ai!.slate=[];
const license={id:'tax-paid-license',sourceProjectId:'tax-paid-film',titleAtSigning:'Paid Film',licensorName:'Audit Studio',
    territory:'GLOBAL',durationWeeks:10,exclusivity:'NON_EXCLUSIVE',minimumGuarantee:10_000_000,platformRevenueShare:100,licensorRevenueShare:0,
    signedAtAbsoluteWeek:week,startsAtAbsoluteWeek:week,expiresAtAbsoluteWeek:week+10,status:'ACTIVE',origin:'STUDIO_MARKET',
    buyerPlatformId:'HULU',buyer:{type:'AI_PLATFORM',id:'HULU',name:'Hulu',platformId:'HULU'},productionFunding:0,
    settlement:{guarantee:'PAID',paymentKey:'tax-paid-license',settledAtAbsoluteWeek:week}} as any;
const economy=(p:Player,atWeek=week,platform=rival)=>calculatePlatformAiWeeklyEconomy({player:p,platform,absoluteWeek:atWeek}).snapshot!;
const baseline=economy(player);
const licensedPlayer=structuredClone(player);licensedPlayer.world.streamingRightsContracts[license.id]=license;
check('paid AI license amortization reduces profit tax without a second content cash debit',()=>{
    const taxed=economy(licensedPlayer);
    assert.equal(Math.round((baseline.marketPolicyCostMillions-taxed.marketPolicyCostMillions)*1_000_000),240_000); // normalized US income tax: 24%
    assert.equal(taxed.contentCostMillions,0);
    assert.equal(Math.round((baseline.operatingCostMillions-taxed.operatingCostMillions)*1_000_000),240_000);
});
check('unpaid, internal and expired AI rights supply no content tax subsidy',()=>{
    for(const guarantee of ['PENDING','INTERNAL']){
        const p=structuredClone(licensedPlayer);p.world.streamingRightsContracts[license.id].settlement.guarantee=guarantee as any;
        assert.equal(economy(p).marketPolicyCostMillions,baseline.marketPolicyCostMillions);
    }
    assert.equal(economy(licensedPlayer,week+10).marketPolicyCostMillions,economy(player,week+10).marketPolicyCostMillions);
});
check('paid AI original production has a finite noncash tax life',()=>{
    const original=structuredClone(rival);
    original.ai!.slate=[{id:'tax-original-plan',platformId:'HULU',controllerAtCommitment:'AI',source:'COMMISSIONED_ORIGINAL',status:'RELEASED',title:'Tax Original',
        projectType:'MOVIE',genre:'DRAMA',targetAudience:'PG-13',sourceProjectIds:['tax-original-film'],rightsContractIds:[],cataloguePackageId:null,commissionId:null,
        sourceStudioId:null,streamingWindow:'ORIGINAL_STREAMING_PREMIERE',localizationLevel:'NONE',releaseCountryIds:[market.countryId!],minimumGuaranteeMillions:0,
        rightsCostMillions:0,productionFundingMillions:104,paidSpendMillions:104,marketingReserveMillions:0,contingencyMillions:0,committedAtAbsoluteWeek:week-20,
        rightsReadyAtAbsoluteWeek:week-10,localizationReadyAtAbsoluteWeek:week-2,premiereAtAbsoluteWeek:week,releasePattern:null,releaseEntries:[],scheduledAtAbsoluteWeek:week-1,
        releasedAtAbsoluteWeek:week,industryProductionId:'tax-original-production',forecast:{strategic:80,creative:80,commercial:80,prestige:80,risk:10}}];
    const p=structuredClone(player);p.world.industryProductions['tax-original-production']={id:'tax-original-production',canonicalProjectId:'tax-original-film',
        commissioningPlatformId:'HULU',platformContentPlanId:'tax-original-plan',status:'DELIVERED',budgetMillions:104,paidMillions:104} as any;
    const taxed=economy(p,week,original);
    assert.equal(Math.round((baseline.marketPolicyCostMillions-taxed.marketPolicyCostMillions)*1_000_000),240_000);
    assert.equal(taxed.contentCostMillions,0);
    assert.equal(economy(p,week+104,original).marketPolicyCostMillions,economy(player,week+104).marketPolicyCostMillions);
    p.world.industryProductions['tax-original-production'].paidMillions=0;
    assert.equal(economy(p,week,original).marketPolicyCostMillions,baseline.marketPolicyCostMillions);
});
console.log(JSON.stringify({checks,failures}));if(failures.length)process.exitCode=1;
