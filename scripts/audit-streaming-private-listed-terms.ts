import assert from 'node:assert/strict';
import {contentMarketFixture} from './helpers/contentMarketFixture';
import {getContentMarketListings,getContentMarketAuctionAssignments,purchaseContentMarketListing,submitContentMarketPrivateOffer} from '../services/streamingContentMarket';
import {processStreamingPrivateOffersWeek,reviseStreamingRightsNegotiation,signStreamingRightsDeal} from '../services/streamingRightsMarketplace';
import {normalizeOwnedStreamingPlatformState} from '../services/ownedStreamingPlatform';
import {configureStreamingPricingOffer} from '../services/streamingCommercialOffers';
import {createStreamingLicenseContract,createStreamingRightsContractFromLicense,registerStreamingRightsContract} from '../services/streamingRightsCore';
import {getAbsoluteWeek} from '../services/legacyLogic';
const fixture=()=>{const p=contentMarketFixture();p.businesses=[];return p;};
const fixed=(p:ReturnType<typeof fixture>)=>{const a=getContentMarketAuctionAssignments(p);return getContentMarketListings(p).find(l=>!a.listingIds.has(l.id)&&l.title.id==='cm1-film-1')!;};
let checks=0;const failures:string[]=[];const check=(name:string,fn:()=>void)=>{checks++;try{fn();console.log('PASS',name);}catch(e){failures.push(name);console.error('FAIL',name,(e as Error).message);}};
check('advertised fixed terms are accepted through delayed negotiation and paid only at signature',()=>{
 const p=fixture(),l=fixed(p),cash=p.ownedStreamingPlatform.treasuryCash;
 const direct=purchaseContentMarketListing(p,l.id,l.signature);assert.ok(direct.changed,direct.detail);
 const sent=submitContentMarketPrivateOffer(p,l.id,{...l.terms,countryIds:l.countryIds});assert.ok(sent.changed,sent.detail);
 assert.equal(sent.player.ownedStreamingPlatform.treasuryCash,cash);
 assert.equal(signStreamingRightsDeal(sent.player,sent.negotiation!.id).changed,false);
 const due=sent.negotiation!.responseDueAbsoluteWeek!;
 const early=processStreamingPrivateOffersWeek(sent.player,due-1).player;
 assert.equal(early.ownedStreamingPlatform.rightsNegotiations[0].responseStatus,'AWAITING_RESPONSE');
 const replied=processStreamingPrivateOffersWeek(sent.player,due).player;
 const accepted=replied.ownedStreamingPlatform.rightsNegotiations.find(n=>n.id===sent.negotiation!.id)!;
 assert.equal(accepted.responseStatus,'SELLER_ACCEPTED');
 assert.equal(replied.ownedStreamingPlatform.treasuryCash,cash);
 const atReply={...replied,age:Math.floor(due/52)+1,currentWeek:due%52+1};
 const signed=signStreamingRightsDeal(atReply,accepted.id);assert.ok(signed.changed,signed.detail);
 assert.equal(signed.player.ownedStreamingPlatform.treasuryCash,cash-l.terms.minimumGuarantee);
 assert.equal(signStreamingRightsDeal(signed.player,accepted.id).changed,false);
});
check('listed-term proof survives normalized save reload',()=>{
 const p=fixture(),l=fixed(p);const sent=submitContentMarketPrivateOffer(p,l.id,{...l.terms,countryIds:l.countryIds});
 const reloaded=JSON.parse(JSON.stringify(sent.player));reloaded.ownedStreamingPlatform=normalizeOwnedStreamingPlatformState(reloaded.ownedStreamingPlatform,reloaded.id);
 const replied=processStreamingPrivateOffersWeek(reloaded,sent.negotiation!.responseDueAbsoluteWeek!).player;
 assert.equal(replied.ownedStreamingPlatform.rightsNegotiations[0].responseStatus,'SELLER_ACCEPTED');
});
check('listed platform trade keeps inherited viewer rights when buyer pricing differs',()=>{
 const p=fixture();p.pastProjects=[];p.world.projects=p.world.projects.slice(0,1);
 p.ownedStreamingPlatform.serviceConfiguration.pricing=configureStreamingPricingOffer(p.ownedStreamingPlatform.serviceConfiguration.pricing,{kind:'CORE',coreModel:'STORE'});
 const week=getAbsoluteWeek(p.age,p.currentWeek);
 const license=createStreamingLicenseContract({id:'listed-trade',sourceProject:p.world.projects[0],buyerPlatformId:'NETFLIX',platformContentPlanId:null,cataloguePackageId:null,
  licensorName:'Harbour',territory:'MULTI_REGION',durationWeeks:104,exclusivity:'NON_EXCLUSIVE',minimumGuarantee:1_000_000,platformRevenueShare:100,
  signedAtAbsoluteWeek:week-3,startsAtAbsoluteWeek:week-3,countryIds:['US','IN'],origin:'STUDIO_MARKET',sellerType:'STUDIO',sellerPlatformId:null,windowType:'FIRST_WINDOW',
  accessGrant:{schemaVersion:1,modes:['SUBSCRIPTION'],earlyWindowWeeks:0,purchaseFulfillment:'NONE',source:'EXPLICIT'}});
 const contract=createStreamingRightsContractFromLicense({license,seller:{type:'NPC_STUDIO',id:'seller-cm1',name:'Harbour',platformId:null},
  buyer:{type:'AI_PLATFORM',id:'NETFLIX',name:'Netflix',platformId:'NETFLIX'},guaranteeDisposition:'PAID',settledAtAbsoluteWeek:week-3});
 p.world.streamingRightsContracts=registerStreamingRightsContract({},contract).registry;
 const l=getContentMarketListings(p).find(l=>l.sourceLicenseId==='listed-trade')!;
 assert.ok(purchaseContentMarketListing(p,l.id,l.signature).changed);
 const sent=submitContentMarketPrivateOffer(p,l.id,{...l.terms,countryIds:l.countryIds});assert.ok(sent.changed,sent.detail);
 const reloaded=JSON.parse(JSON.stringify(sent.player));reloaded.ownedStreamingPlatform=normalizeOwnedStreamingPlatformState(reloaded.ownedStreamingPlatform,reloaded.id);
 const replied=processStreamingPrivateOffersWeek(reloaded,sent.negotiation!.responseDueAbsoluteWeek!).player;
 assert.equal(replied.ownedStreamingPlatform.rightsNegotiations[0].responseStatus,'SELLER_ACCEPTED');
 assert.deepEqual(replied.ownedStreamingPlatform.rightsNegotiations[0].accessGrant?.modes,['SUBSCRIPTION']);
 const due=sent.negotiation!.responseDueAbsoluteWeek!;
 const atReply={...replied,age:Math.floor(due/52)+1,currentWeek:due%52+1};
 assert.ok(signStreamingRightsDeal(atReply,sent.negotiation!.id).changed,'Unchanged inherited grant survives the review delay');
 const changedGrant=structuredClone(atReply);
 changedGrant.world.streamingRightsContracts['listed-trade'].accessGrant={schemaVersion:1,modes:['RENTAL'],earlyWindowWeeks:0,purchaseFulfillment:'NONE',source:'EXPLICIT'};
 const refused=signStreamingRightsDeal(changedGrant,sent.negotiation!.id);
 assert.equal(refused.changed,false,'Changed inherited mode grant must not silently replace the offered one');
 assert.equal(refused.player,changedGrant);

});
check('a lower revised offer cannot inherit the advertised-term acceptance',()=>{
 const p=fixture(),l=fixed(p);const sent=submitContentMarketPrivateOffer(p,l.id,{...l.terms,countryIds:l.countryIds});
 const revised=reviseStreamingRightsNegotiation(sent.player,sent.negotiation!.id,{...l.terms,countryIds:l.countryIds,minimumGuarantee:Math.round(l.rivalBidAmount*.63/100000)*100000});
 assert.ok(revised.changed,revised.detail);
 const replied=processStreamingPrivateOffersWeek(revised.player,revised.negotiation!.responseDueAbsoluteWeek!).player;
 assert.notEqual(replied.ownedStreamingPlatform.rightsNegotiations[0].responseStatus,'SELLER_ACCEPTED');
});
check('acceptance cannot bypass signing cash',()=>{
 const p=fixture(),l=fixed(p);const sent=submitContentMarketPrivateOffer(p,l.id,{...l.terms,countryIds:l.countryIds});
 const replied=processStreamingPrivateOffersWeek(sent.player,sent.negotiation!.responseDueAbsoluteWeek!).player;
 replied.ownedStreamingPlatform.treasuryCash=1;
 assert.equal(signStreamingRightsDeal(replied,sent.negotiation!.id).changed,false);
 assert.equal(replied.ownedStreamingPlatform.treasuryCash,1);
});
check('advertised acceptance still rechecks rights sold elsewhere during review',()=>{
 const p=fixture(),l=fixed(p);const sent=submitContentMarketPrivateOffer(p,l.id,{...l.terms,countryIds:l.countryIds});
 const direct=purchaseContentMarketListing(p,l.id,l.signature);assert.ok(direct.changed);
 const block=structuredClone(Object.values(direct.player.world.streamingRightsContracts)[0]);
 block.id='rights-sold-while-pending';block.exclusivity='EXCLUSIVE';
 block.buyer={type:'AI_PLATFORM',id:'NETFLIX',platformId:'NETFLIX',name:'Netflix'};
 sent.player.world.streamingRightsContracts={[block.id]:block};
 const replied=processStreamingPrivateOffersWeek(sent.player,sent.negotiation!.responseDueAbsoluteWeek!).player;
 assert.equal(replied.ownedStreamingPlatform.rightsNegotiations[0].responseStatus,'RIGHTS_SOLD');
 assert.equal(replied.ownedStreamingPlatform.treasuryCash,p.ownedStreamingPlatform.treasuryCash);
});
console.log(JSON.stringify({checks,failures}));if(failures.length)process.exitCode=1;
