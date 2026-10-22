import assert from 'node:assert/strict';
import {createC6QaCareer} from '../lab/c6QaCareer';
import {getAbsoluteWeek} from '../services/legacyLogic';
import {createStreamingCatalogueReadContext} from '../services/streamingContentAvailability';
import {getWorldStreamingOffers} from '../services/worldEconomy/worldStreamingOffers';
import {createCinemaAlternativeAccess} from '../services/boxOffice/boxOfficeAlternativeAccess';
import {createAiTitleAccessResolver} from '../services/worldEconomy/worldStreamingAiCatalogue';
import {projectStreamingCommercialOffers} from '../services/streamingCommercialOffers';
const player=createC6QaCareer(),week=getAbsoluteWeek(player.age,player.currentWeek),platform=player.ownedStreamingPlatform;
platform.lifecycle='ACTIVE';platform.launchProgram.status='LAUNCHED';platform.marketOperations[0].status='ACTIVE';
platform.marketOperations.push({...platform.marketOperations[0],id:'ca',scopeId:'CA',countryId:'CA'});
platform.launchCommit={committedAtAbsoluteWeek:week-8} as any;
const context=createStreamingCatalogueReadContext(player),offer=getWorldStreamingOffers(player,week,context).offers.find(o=>o.isPlayer)!;
assert.ok(offer);let scans=0;
context.platform.weeklyHistory=new Proxy(context.platform.weeklyHistory,{get(target,key,receiver){if(key===Symbol.iterator)scans++;return Reflect.get(target,key,receiver)}});
const read=createCinemaAlternativeAccess(player,offer,week,context);
const us=read('US',{kind:'AD_SUPPORTED'}),firstScans=scans;
assert.ok(us.ids.size>0&&firstScans>0,'The fixture must exercise actual title age history');
const ca=read('CA',{kind:'AD_SUPPORTED'});
assert.deepEqual([...ca.ids],[...us.ids]);assert.equal(ca.strength,us.strength);
assert.equal(scans,firstScans,'Title age history must be scanned once per title in the current batch, not again per country');
assert.equal(read('US',{kind:'AD_SUPPORTED'}),us);
console.log('PASS alternative catalogue age is batched across countries and exact route results are reused');
// A vested store title must not scan unrelated titles' route permissions.
let unrelatedChecks=0;
const rival={...offer,isPlayer:false,platformId:'BATCH_AI',activeCountryIds:['US']};
const legacy=Array.from({length:100},(_,i)=>({platformId:rival.platformId,titleId:`batch-title-${i}`,title:'Batch title',contractId:`batch-contract-${i}`,
 countryIds:i?new Proxy(['US'],{get(target,key,receiver){if(key==='includes')unrelatedChecks++;return Reflect.get(target,key,receiver)}}):['US'],
 startsAtAbsoluteWeek:week-10,expiresAtAbsoluteWeek:week+100,accessGrant:{schemaVersion:1,modes:['SUBSCRIPTION'],earlyWindowWeeks:0,purchaseFulfillment:'NONE',source:'LEGACY_SNAPSHOT'}})) as any;
const resolver=createAiTitleAccessResolver(player,rival,legacy),plan=projectStreamingCommercialOffers(rival.commercialConfiguration).subscriptions[0];
assert.ok(plan);const route={kind:'SUBSCRIPTION',planId:plan.id} as const;
const all=resolver('US',week,route);assert.equal(all.length,100);unrelatedChecks=0;
const targeted=resolver('US',week,route,'batch-title-0');
assert.deepEqual(targeted.map(p=>p.titleId),['batch-title-0']);
assert.equal(unrelatedChecks,0,'A targeted entitlement query must not evaluate unrelated route permissions');
assert.deepEqual(targeted,all.filter(p=>p.titleId==='batch-title-0'));
console.log('PASS targeted AI route lookup preserves canonical permission and skips unrelated titles');
