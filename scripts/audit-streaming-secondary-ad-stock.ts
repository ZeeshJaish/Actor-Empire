import assert from 'node:assert/strict';
import {balanceFixture} from './helpers/streamingBalanceFixture';
import {processGameWeek} from '../services/gameLoop';
import {getAbsoluteWeek} from '../services/legacyLogic';
import {configureStreamingPricingOffer} from '../services/streamingCommercialOffers';
import {getWorldStreamingOffers} from '../services/worldEconomy/worldStreamingOffers';
import {allocateStreamingAudienceChoice} from '../services/worldEconomy/worldStreamingAudienceChoice';
import {projectCountryChoices} from '../services/worldEconomy/worldStreamingViewing';
import type {Player, WorldStreamingCustomerState} from '../types';

// A hybrid service retains its old paid stock while desired demand moves to a
// rival. Counting desired free discovery without the live paid-stock cap would
// count the same platform households twice.
const {p:opening}=balanceFixture({id:'secondary-ad-stock',core:'SUBSCRIPTION',catalog:6,quality:95,price:7.99});
const p=(await processGameWeek(opening)).player;
const week=getAbsoluteWeek(p.age,p.currentWeek);
const cohort={...p.world.worldAudienceEconomy!.countries.US.cohorts[0],monthlyEntertainmentBudgetPerHousehold:50,entertainmentAppetiteIndex:90};
const participation={...p.world.worldAudienceParticipation!.countries.US.cohorts.find(row=>row.cohortId===cohort.id)!,
    streamingOnlyHouseholds:10000,dualParticipantHouseholds:0,totalMonthlyStreamingBudget:500000,
    streamingEligibilityIndex:95,streamingInterestIndex:90};
const original=getWorldStreamingOffers(p,week).offers.find(row=>row.platformId==='PLAYER')!;
const hybrid={...original,activeCountryIds:['US'],maturityWeeks:104,catalogueStrengthIndex:90,
    catalogueStrengthByCountry:{US:90},subscriptionCatalogueStrengthByCountry:{US:90},marketingIndex:90,
    commercialConfiguration:configureStreamingPricingOffer(original.commercialConfiguration,{kind:'TOGGLE',offer:'ADS',enabled:true})};
const rival={...original,platformId:'RIVAL',activeCountryIds:['US'],maturityWeeks:104,catalogueStrengthIndex:90,
    catalogueStrengthByCountry:{US:90},subscriptionCatalogueStrengthByCountry:{US:90},marketingIndex:90};
const offers=[hybrid,rival];
const choice=allocateStreamingAudienceChoice('US',cohort,participation,offers);
const primaryFree=choice.allocations.filter(row=>row.platformId==='PLAYER'&&row.kind==='FREE_AD').reduce((sum,row)=>sum+row.households,0);
const primaryNonpaid=choice.allocations.filter(row=>row.platformId==='PLAYER'&&row.kind!=='SUBSCRIPTION').reduce((sum,row)=>sum+row.households,0);
assert.ok(choice.freeAdOpportunities.some(row=>row.platformId==='PLAYER'&&row.households>20),'fixture must have complementary free-ad demand');
const prepared={...p,world:{...p.world,
    worldAudienceEconomy:{...p.world.worldAudienceEconomy!,countries:{US:{...p.world.worldAudienceEconomy!.countries.US,cohorts:[cohort]}}},
    worldAudienceParticipation:{...p.world.worldAudienceParticipation!,countries:{US:{...p.world.worldAudienceParticipation!.countries.US,cohorts:[participation]}}}}} as Player;
const registry={...getWorldStreamingOffers(p,week),offers,byCountry:{US:['PLAYER','RIVAL']}};
let checks=0;
for(const available of [0,20]){
    const paid=10000-primaryNonpaid-available;
    const customers={countries:{US:{cohorts:[{cohortId:cohort.id,planCells:[{
        platformId:'PLAYER',planId:hybrid.plans[0].id,paidAccounts:paid,monthlySubscriptionRevenue:paid*7.99,
    }]}]}}} as unknown as WorldStreamingCustomerState;
    const result=projectCountryChoices(prepared,week,registry,customers).US;
    assert.equal(result.platforms.PLAYER.freeAd,primaryFree+available,'viewing must use secondary households left after actual retained paid accounts');
    assert.equal(result.cohorts[cohort.id].PLAYER.freeAd,primaryFree+available,'cohort viewing must use the same capped secondary reach');
    assert.equal(result.storeSources.PLAYER.filter(row=>row.id.endsWith(':secondary-ad')).reduce((sum,row)=>sum+row.households,0),available);
    const budget=result.budgets[0].budget;
    assert.equal(budget.monthlyBudget,500000);
    assert.equal(budget.monthlySubscriptionSpend,paid*7.99);
    assert.ok(budget.weeklyDiscretionaryCents<=Math.floor((500000-paid*7.99)*100/4.33),'secondary attention cannot add discretionary budget');
    assert.ok(Object.values(budget.allocatedCents).reduce((sum,value)=>sum+value,0)<=budget.weeklyDiscretionaryCents);
    assert.equal(result.platforms.PLAYER.freeAd+paid,10000,'the hybrid cannot create extra households when its remaining attention capacity is full');
    checks++;
    console.log('PASS actual paid stock leaves',available,'complementary ad households');
}
console.log(JSON.stringify({checks,failures:[]}));
