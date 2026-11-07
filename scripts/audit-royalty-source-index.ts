import assert from 'node:assert/strict';
import {createC6QaCareer} from '../lab/c6QaCareer';
import {getAbsoluteWeek} from '../services/legacyLogic';
import {getWorldStreamingOffers} from '../services/worldEconomy/worldStreamingOffers';
import {createStreamingRightsContractFromLicense} from '../services/streamingRightsCore';
import {attachStreamingRoyaltyReceipts} from '../services/worldEconomy/worldStreamingRoyaltyAttribution';
import {attachIssuedStreamingRoyaltyReceipts} from './fixtures/issuedRoyaltyAttribution';
const player=createC6QaCareer(),week=getAbsoluteWeek(player.age,player.currentWeek);
const offers=getWorldStreamingOffers(player,week).offers.filter(o=>!o.isPlayer&&o.plans.some(p=>p.monthlyPrice>0)).slice(0,2).map(o=>({...o,activeCountryIds:['US','CA']}));assert.equal(offers.length,2);
const template=player.ownedStreamingPlatform.catalogLicenses[0];assert.ok(template);
player.world.streamingRightsContracts={};
for(const [i,offer]of offers.entries()){
 const id='indexed-royalty-'+i;const contract=createStreamingRightsContractFromLicense({guaranteeDisposition:'PAID',settledAtAbsoluteWeek:0,buyer:{type:'AI_PLATFORM',id:offer.platformId,name:offer.name,platformId:offer.platformId as any},license:{...template,id,platformContentPlanId:undefined,buyerPlatformId:offer.platformId as any,startsAtAbsoluteWeek:week-10,expiresAtAbsoluteWeek:week+20,windowType:'FIRST_WINDOW',permanentPurchase:false,accessGrant:{schemaVersion:1,modes:['SUBSCRIPTION','AD_SUPPORTED','RENTAL','PURCHASE'],earlyWindowWeeks:0,purchaseFulfillment:'PERPETUAL',source:'EXPLICIT'}}});player.world.streamingRightsContracts[id]=contract;
}
const countries:any={},customerCountries:any={};
for(const countryId of ['US','CA']){
 const rows=Object.fromEntries(offers.map(o=>[o.platformId,{totalHoursViewed:100,totalViewingAccounts:100,accessMix:{paidViewingAccounts:100,freeViewingAccounts:0,storeViewingAccounts:0,sharedViewingAccounts:0,piracyViewingAccounts:0},revenue:{advertisingRevenue:0,sponsorshipRevenue:0}}]));countries[countryId]={platformPerformance:rows,titlePerformance:[],revenue:{}};
 customerCountries[countryId]={countryId,platformSummaries:offers.map(o=>({platformId:o.platformId,monthlySubscriptionRevenue:433,planAllocations:[{planId:o.plans.find(p=>p.monthlyPrice>0)!.id,monthlySubscriptionRevenue:433,paidAccounts:100}],endingPaidAccounts:100,joins:1,reactivations:0}))};
}
player.world.worldStreamingCustomers={countries:customerCountries} as any;
const sources=Array.from({length:200},(_,i)=>{const offer=offers[i%offers.length];return{platformId:offer.platformId,countryId:i%4<2?'US':'CA',sourceKind:i%3===0?'STORE':i%3===1?'SUBSCRIPTION':'FREE_AD',planId:offer.plans.find(p=>p.monthlyPrice>0)!.id,grossReceipts:i%5?17:0}});
const state:any={lastProcessedAbsoluteWeek:week,platforms:Object.fromEntries(offers.map(o=>[o.platformId,{titlePerformance:[]} ])),countries,aiCatalogue:[],aiStoreEntitlements:Array.from({length:400},(_,i)=>({platformId:offers[i%offers.length].platformId,countryId:i%4<2?'US':'CA',titleId:template.sourceProjectId,kind:i%2?'RENTAL':'PURCHASE',households:3,purchasedAtAbsoluteWeek:week-1,expiresAtAbsoluteWeek:i%2?week+3:null})),royaltySourceReceipts:sources};
const expected=attachIssuedStreamingRoyaltyReceipts(player,structuredClone(state),offers);assert.ok(expected.royaltyReceipts!.length>0,'Exercise actual signed receipts');
let scans=0,entitlementReads=0;const measured=structuredClone(state);for(const row of measured.aiStoreEntitlements){const id=row.countryId;Object.defineProperty(row,'countryId',{enumerable:true,get(){entitlementReads++;return id}})}measured.royaltySourceReceipts=new Proxy(measured.royaltySourceReceipts,{get(target,key,receiver){if(key===Symbol.iterator)scans++;return Reflect.get(target,key,receiver)}});
const actual=attachStreamingRoyaltyReceipts(player,measured,offers);assert.deepEqual(actual,expected,'Every receipt ID, order, allocation and zero-source ordinal must match issued behavior');assert.equal(scans,1,'Collect source receipts once instead of rescanning the global list per platform/country');
assert.ok(entitlementReads<=state.aiStoreEntitlements.length*2,'Each entitlement should be assigned to its country once instead of rescanning global entitlements per ancillary source; reads='+entitlementReads);
const repeated=attachStreamingRoyaltyReceipts(player,structuredClone(state),offers);assert.deepEqual(repeated,expected,'A new invocation recomputes from fresh source');
console.log(JSON.stringify({passed:4,entitlementReads,sourceScans:scans,receiptCount:actual.royaltyReceipts!.length,exactParity:true}));
