import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import StreamingBuyerAuctionRoom from '../components/StreamingBuyerAuctionRoom';
import { createStreamingLicenseContract } from '../services/streamingRightsCore';
import assert from 'node:assert/strict';
import { contentMarketFixture } from './helpers/contentMarketFixture';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeStreamingPlatformEcosystem } from '../services/streamingPlatformEcosystem';
import { configureStreamingPricingOffer } from '../services/streamingCommercialOffers';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { getStreamingBuyerAuctionLots, openStreamingBuyerAuction, placeStreamingBuyerAuctionBid, advanceStreamingBuyerAuction } from '../services/streamingBuyerAuctions';
import { resolveAuctionContinuation } from '../services/streamingAuctionTerms';
import { processAuctionFutureFunding } from '../services/streamingAuctionFunding';
const failures: string[]=[];
let checks=0;
const check=(name:string, fn:()=>void)=>{try{fn();checks++;console.log(`PASS ${name}`)}catch(e){failures.push(`${name}: ${String(e)}`);console.error(`FAIL ${name}: ${String(e)}`)}};
const fixture=(rivalCount=0)=>{
 const p=contentMarketFixture();
 p.world.studios['seller-cm1']={...Object.values(p.world.studios)[0],id:'seller-cm1' as any,name:'Fixture studio'};
 p.ownedStreamingPlatform.serviceConfiguration.pricing=configureStreamingPricingOffer(p.ownedStreamingPlatform.serviceConfiguration.pricing,{kind:'CORE',coreModel:'STORE'});
 const ecosystem=normalizeStreamingPlatformEcosystem(undefined,getAbsoluteWeek(p.age,p.currentWeek));
 Object.values(ecosystem.operators).forEach((o,i)=>{o.cashMillions=i<rivalCount?500_000:0;o.activeCountryIds=['US','IN'];});
 p.world.streamingPlatformEcosystem=ecosystem;
 return p;
};
for(const count of [0,1])check(`${count} funded rivals permit entry without fabricated rivals`,()=>{
 const p=fixture(count);const lot=getStreamingBuyerAuctionLots(p).find(l=>l.allowedTerms.futureGreenlightAllowed)!;
 const opened=openStreamingBuyerAuction(p,lot.id,1000);
 assert.ok(opened.changed,opened.detail);assert.equal(opened.session!.rivals.length,count);
 assert.equal(opened.session!.bids.filter(b=>!b.isPlayer).length,count?1:0);
 const reloaded=JSON.parse(JSON.stringify(opened.player));reloaded.ownedStreamingPlatform=normalizeOwnedStreamingPlatformState(reloaded.ownedStreamingPlatform,reloaded.id);
 const again=openStreamingBuyerAuction(reloaded,lot.id,9000);assert.equal(again.changed,false);assert.deepEqual(again.session,reloaded.ownedStreamingPlatform.buyerAuctionSessions[0],'entry cannot reroll saved room');
 const noOffer=advanceStreamingBuyerAuction(opened.player,opened.session!.id,75,80000);
 if(count===0){assert.equal(noOffer.session!.status,'NO_SALE');assert.equal(noOffer.player.ownedStreamingPlatform.treasuryCash,p.ownedStreamingPlatform.treasuryCash);}
});
check('lone buyer still needs seller reserve, winning cash settles once',()=>{
 const p=fixture();const lot=getStreamingBuyerAuctionLots(p).find(l=>l.allowedTerms.futureGreenlightAllowed)!;const room=openStreamingBuyerAuction(p,lot.id,1000);assert.ok(room.session);
 const terms={minimumGuarantee:lot.minimumGuarantee,licensorRevenueShare:0,marketingGuarantee:0,futureGreenlight:false};
 const low=placeStreamingBuyerAuctionBid(room.player,room.session!.id,terms,1001);assert.ok(low.changed,low.detail);
 const refused=advanceStreamingBuyerAuction(low.player,room.session!.id,75,80000);assert.equal(refused.session!.status,'NO_SALE');assert.equal(refused.player.ownedStreamingPlatform.treasuryCash,p.ownedStreamingPlatform.treasuryCash);
 const high=placeStreamingBuyerAuctionBid(room.player,room.session!.id,{...terms,minimumGuarantee:Math.round(lot.referenceValue*1.5/100_000)*100_000},1002);assert.ok(high.changed,high.detail);
 const won=advanceStreamingBuyerAuction(high.player,room.session!.id,75,80000);assert.equal(won.session!.status,'WON');
 const cash=won.player.ownedStreamingPlatform.treasuryCash;assert.ok(cash<p.ownedStreamingPlatform.treasuryCash);
 assert.equal(advanceStreamingBuyerAuction(JSON.parse(JSON.stringify(won.player)),room.session!.id,75,90000).player.ownedStreamingPlatform.treasuryCash,cash);
});
check('cash-backed manual offer can exceed reference estimate without bypassing funding',()=>{
 const p=fixture(0);const lot=getStreamingBuyerAuctionLots(p).find(l=>l.allowedTerms.futureGreenlightAllowed)!;const room=openStreamingBuyerAuction(p,lot.id,1000);
 const terms={minimumGuarantee:300_000_000,licensorRevenueShare:0,marketingGuarantee:0,futureGreenlight:false};
 assert.ok(terms.minimumGuarantee>lot.referenceValue*2.5);assert.ok(placeStreamingBuyerAuctionBid(room.player,room.session!.id,terms,1001).changed);
 assert.equal(placeStreamingBuyerAuctionBid(room.player,room.session!.id,{...terms,minimumGuarantee:600_000_000},1001).reason,'INSUFFICIENT_TREASURY');
});
check('new unrelated original funding rejected and continuation saved with canonical ordinal',()=>{
 const p=fixture(5);const sourceId=getStreamingBuyerAuctionLots(p).find(l=>l.allowedTerms.futureGreenlightAllowed)!.sourceProjectId;const source=p.world.projects.find(x=>x.id===sourceId) as any;source.title='Dark Garden of Glass 2';source.franchiseId='garden';source.installmentNumber=2;
 const lot=getStreamingBuyerAuctionLots(p).find(l=>l.sourceProjectId===source.id)!;assert.ok(lot);
 const room=openStreamingBuyerAuction(p,lot.id,1000);assert.ok(room.session);
 const future={kind:'NEW_ORIGINAL' as const,count:1,budgetPerProject:2_000_000,format:'LIVE_ACTION' as const,commitment:'FIRM' as const,deadlineWeeks:52,platformRightsPercent:100};
 const terms={minimumGuarantee:lot.minimumGuarantee,licensorRevenueShare:0,marketingGuarantee:0,futureGreenlight:true,futureFunding:future};
 assert.equal(placeStreamingBuyerAuctionBid(room.player,room.session!.id,terms,1001).changed,false,'No new unrelated-original promise');
 const continuation=placeStreamingBuyerAuctionBid(room.player,room.session!.id,{...terms,futureFunding:{...future,kind:'SEQUEL'}},1002);assert.ok(continuation.changed,continuation.detail);
 const saved=normalizeOwnedStreamingPlatformState(JSON.parse(JSON.stringify(continuation.player.ownedStreamingPlatform)),p.id);
 const funding=saved.buyerAuctionSessions[0].bids.at(-1)!.futureFunding as any;
 assert.equal(funding.parentProjectId,source.id);assert.equal(funding.firstInstallmentNumber,3);assert.equal(funding.lineageId,'garden');assert.equal(funding.baseTitle,'Dark Garden of Glass');
});
check('series promise follows canonical season and cannot redirect parent or ordinal',()=>{
 const p=fixture(5);p.world.projects.forEach(row=>{row.mediaType='SERIES';(row as any).seasonNumber=3;(row as any).franchiseId='series-lineage';row.title='Garden of Glass Season 3';});
 const lot=getStreamingBuyerAuctionLots(p).find(l=>l.allowedTerms.futureGreenlightAllowed)!;const room=openStreamingBuyerAuction(p,lot.id,1000);
 const future={kind:'NEXT_SEASON' as const,count:2,budgetPerProject:2_000_000,format:'ANIMATED' as const,commitment:'FIRM' as const,deadlineWeeks:52,platformRightsPercent:85,parentProjectId:'other-project',firstInstallmentNumber:99};
 const result=placeStreamingBuyerAuctionBid(room.player,room.session!.id,{minimumGuarantee:lot.minimumGuarantee,licensorRevenueShare:0,marketingGuarantee:0,futureGreenlight:true,futureFunding:future},1001);assert.ok(result.changed,result.detail);
 const saved=result.session!.bids.at(-1)!.futureFunding!;assert.equal(saved.parentProjectId,lot.sourceProjectId);assert.equal(saved.firstInstallmentNumber,4);assert.equal(saved.baseTitle,'Garden of Glass');
 assert.equal(placeStreamingBuyerAuctionBid(room.player,room.session!.id,{minimumGuarantee:lot.minimumGuarantee,licensorRevenueShare:0,marketingGuarantee:0,futureGreenlight:true,futureFunding:{...future,kind:'SEQUEL'}},1002).changed,false);
});
check('signed continuation delivers correct part number, legacy original survives',()=>{
 for(const kind of ['SEQUEL','NEXT_SEASON','NEW_ORIGINAL'] as const){const p=fixture();const parent=p.world.projects[0] as any;parent.title=kind==='NEXT_SEASON'?'Dark Garden of Glass Season 2':'Dark Garden of Glass 2';parent.installmentNumber=2;if(kind==='NEXT_SEASON'){parent.mediaType='SERIES';parent.seasonNumber=2;}
 const week=getAbsoluteWeek(p.age,p.currentWeek);const future={kind,count:1,budgetPerProject:2_000_000,format:'ANIMATED' as const,commitment:'FIRM' as const,deadlineWeeks:52,platformRightsPercent:85};
 p.ownedStreamingPlatform.rightsObligations=[{id:'promise',licenseId:'license',sourceProjectId:parent.id,title:parent.title,type:'FUTURE_GREENLIGHT',targetAmount:1,observedAmount:0,dueAtAbsoluteWeek:week+52,status:'PENDING',breachPenalty:0,successPayment:0,resolvedAtAbsoluteWeek:null,counterpartyId:'seller-cm1',createdAtAbsoluteWeek:week,sourceAuctionId:'auction',futureFunding:future}];
 p.ownedStreamingPlatform.costCommitments=[{id:'reserve',idempotencyKey:'reserve',category:'CONTENT',label:'fund',status:'COMMITTED',plannedAmount:2_000_000,committedAmount:2_000_000,paidAmount:0,weeklyAmount:0,createdAtAbsoluteWeek:week,committedAtAbsoluteWeek:week,paidAtAbsoluteWeek:null,sourceReferenceId:'promise'}];
 const started=processAuctionFutureFunding(p,week);assert.equal(started.ownedStreamingPlatform.treasuryCash,p.ownedStreamingPlatform.treasuryCash-2_000_000);
 const legacyInFlight=JSON.parse(JSON.stringify(started));delete legacyInFlight.ownedStreamingPlatform.rightsObligations[0].futureFunding.parentProjectId;delete legacyInFlight.ownedStreamingPlatform.rightsObligations[0].futureFunding.lineageId;delete legacyInFlight.ownedStreamingPlatform.rightsObligations[0].futureFunding.firstInstallmentNumber;delete legacyInFlight.ownedStreamingPlatform.rightsObligations[0].futureFunding.baseTitle;
 if(kind!=='NEW_ORIGINAL'){const legacyDelivered=processAuctionFutureFunding(legacyInFlight,week+52);const legacyProject=legacyDelivered.world.projects.find(x=>!p.world.projects.some(y=>y.id===x.id)) as any;assert.equal(legacyProject.installmentNumber,3,'Existing in-flight production retains numbered installment during migration');}
 if(kind!=='NEW_ORIGINAL')assert.equal(resolveAuctionContinuation(started,parent.id,parent.title,kind==='NEXT_SEASON'?'SERIES':'MOVIE').firstInstallmentNumber,4,'A second funded promise cannot commission the same numbered sequel again');
 const delivered=processAuctionFutureFunding(JSON.parse(JSON.stringify(started)),week+52);const project=delivered.world.projects.find(x=>x.id!==parent.id&&!p.world.projects.some(y=>y.id===x.id)) as any;assert.ok(project);
 if(kind!=='NEW_ORIGINAL'){assert.equal(project.title,kind==='NEXT_SEASON'?'Dark Garden of Glass Season 3':'Dark Garden of Glass 3');assert.equal(project.installmentNumber,3);assert.equal(project.parentProjectId,parent.id);}
 else {assert.match(project.title,/Fixture studio Original 1/);assert.equal(project.parentProjectId,undefined);}
 assert.equal(processAuctionFutureFunding(delivered,week+52).ownedStreamingPlatform.treasuryCash,delivered.ownedStreamingPlatform.treasuryCash);
 }
});
check('restricted title cannot offer rental backend',()=>{
 const p=fixture(5);const lot=getStreamingBuyerAuctionLots(p).find(l=>l.allowedTerms.futureGreenlightAllowed)!;
 const room=openStreamingBuyerAuction(p,lot.id,1000);assert.ok(room.session);
 const license=createStreamingLicenseContract({id:'restricted',sourceProject:{id:lot.sourceProjectId,title:lot.title,mediaType:lot.projectType,genre:lot.genre},buyerPlatformId:null,platformContentPlanId:null,cataloguePackageId:null,licensorName:lot.sellerName,territory:lot.territory,durationWeeks:104,exclusivity:'NON_EXCLUSIVE',minimumGuarantee:100,platformRevenueShare:100,signedAtAbsoluteWeek:1000,startsAtAbsoluteWeek:1000,
 accessGrant:{schemaVersion:1,modes:['SUBSCRIPTION'],earlyWindowWeeks:0,purchaseFulfillment:'NONE',source:'EXPLICIT'}} as any);
 room.player.ownedStreamingPlatform.catalogLicenses=[license];
 room.player.ownedStreamingPlatform.buyerAuctionSessions[0].lot.sourceLicenseId='restricted';
 const rejected=placeStreamingBuyerAuctionBid(room.player,room.session!.id,{minimumGuarantee:lot.minimumGuarantee,licensorRevenueShare:4,marketingGuarantee:0,futureGreenlight:false},1001);
 assert.equal(rejected.changed,false,'Rental-only service cannot promise backend on subscription-only title grant');assert.match(rejected.detail!,/matching title rights/);
});
check('subscription-only console clearly explains backend unavailable',()=>{
 const subscription=fixture(5);subscription.ownedStreamingPlatform.serviceConfiguration.pricing=configureStreamingPricingOffer(subscription.ownedStreamingPlatform.serviceConfiguration.pricing,{kind:'CORE',coreModel:'SUBSCRIPTION'} as any);
 const subLot=getStreamingBuyerAuctionLots(subscription).find(l=>l.allowedTerms.futureGreenlightAllowed)!;const subRoom=openStreamingBuyerAuction(subscription,subLot.id,1000);
 const html=renderToStaticMarkup(<StreamingBuyerAuctionRoom player={subRoom.player} session={subRoom.session!} onUpdatePlayer={()=>{}} onExit={()=>{}}/>);
 assert.match(html,/Backend unavailable/);assert.match(html,/advertising or rental/);
});
if(failures.length)throw new Error(`${failures.length} auction repair failures:\n${failures.join('\n')}`);
console.log(`${checks} auction repair checks passed.`);
