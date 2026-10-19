import assert from 'node:assert/strict';
import type {Genre} from '../types';
import {contentMarketFixture} from './helpers/contentMarketFixture';
import {advanceStreamingOpportunityMarket} from '../services/streamingOpportunityMarket';
import {getContentMarketListings,getContentMarketAuctionAssignments,purchaseContentMarketListing} from '../services/streamingContentMarket';
import {getStreamingBuyerAuctionLots,openStreamingBuyerAuction,placeStreamingBuyerAuctionBid,advanceStreamingBuyerAuction} from '../services/streamingBuyerAuctions';
import {refreshStreamingPaidScout} from '../services/paidMarketScouting';
import {configureStreamingPricingOffer} from '../services/streamingCommercialOffers';
import {getAbsoluteWeek} from '../services/legacyLogic';
import {normalizeStreamingPlatformEcosystem} from '../services/streamingPlatformEcosystem';

const fixture=()=>{
 const p=contentMarketFixture();p.businesses=[];p.pastProjects=[];p.currentWeek=10;
 p.ownedStreamingPlatform.treasuryCash=10_000_000_000;
 p.world.studios={'seller-cm1':{...Object.values(p.world.studios)[0],id:'seller-cm1',name:'Harbour Pictures'}} as any;
 p.world.projects=Array.from({length:48},(_,i)=>({...p.world.projects[0],id:`finite-title-${i}`,title:`Finite Film ${i+1}`,genre:(['DRAMA','ACTION','COMEDY','THRILLER'] as Genre[])[i%4],rating:6+i%20/10}));
 p.ownedStreamingPlatform.serviceConfiguration.pricing=configureStreamingPricingOffer(p.ownedStreamingPlatform.serviceConfiguration.pricing,{kind:'CORE',coreModel:'STORE'});
 return advanceStreamingOpportunityMarket(p);
};
let checks=0;const failures:string[]=[];
const check=(name:string,fn:()=>void)=>{checks++;try{fn();console.log('PASS',name);}catch(e){failures.push(name);console.error('FAIL',name,(e as Error).message);}};
const ids=(p:ReturnType<typeof fixture>)=>getContentMarketListings(p).map(l=>l.id);
const assignments=(p:ReturnType<typeof fixture>)=>{
 const a=getContentMarketAuctionAssignments(p);return [...a.listingIds,...a.collectionIds].sort();
};
check('cycle stores bounded discovery and immutable auction assignments',()=>{
 const p=fixture();const saved=(p.world.streamingOpportunityMarket as any).discovery;
 assert.ok(saved,'Missing persisted finite discovery snapshot');
 assert.deepEqual(saved.listingIds.slice().sort(),ids(p).sort());
 assert.equal(new Set(saved.listingIds).size,saved.listingIds.length);
 assert.deepEqual(advanceStreamingOpportunityMarket(p),p);
});
check('buying fixed rights removes one card without replenishing direct shelf',()=>{
 let p=fixture();const before=ids(p),a=getContentMarketAuctionAssignments(p);
 const listing=getContentMarketListings(p).find(l=>!a.listingIds.has(l.id))!;
 const result=purchaseContentMarketListing(p,listing.id,listing.signature);
 assert.ok(result.changed,result.detail);p=result.player;
 assert.equal(ids(p).length,before.length-1);
 assert.ok(ids(p).every(id=>before.includes(id)),'Purchase exposed a fresh listing in the same cycle');
 assert.deepEqual(ids(advanceStreamingOpportunityMarket(JSON.parse(JSON.stringify(p)))),ids(p));
 assert.equal(purchaseContentMarketListing(p,listing.id,listing.signature).changed,false);
});
check('opening or closing a room never promotes another title into its auction slot',()=>{
 const p=fixture();const before=assignments(p);const lot=getStreamingBuyerAuctionLots(p).find(l=>l.listingKind==='TITLE')!;
 let r=openStreamingBuyerAuction(p,lot.id,1_000_000);assert.ok(r.changed,r.detail);
 assert.ok(assignments(r.player).every(id=>before.includes(id)),'Opening promoted a replacement auction');
 r=placeStreamingBuyerAuctionBid(r.player,r.session!.id,{minimumGuarantee:Math.floor(lot.referenceValue*2.4/100000)*100000,licensorRevenueShare:0,marketingGuarantee:0,futureGreenlight:false},1_000_000);
 assert.ok(r.changed,r.detail);
 for(let t=1;t<101&&r.session?.status==='LIVE';t++)r=advanceStreamingBuyerAuction(r.player,r.session!.id,1,1_000_000+t*1000);
 assert.equal(r.session?.status,'WON');
 assert.equal(getAbsoluteWeek(r.player.age,r.player.currentWeek),getAbsoluteWeek(p.age,p.currentWeek));
 assert.ok(assignments(r.player).every(id=>before.includes(id)),'Sold room promoted a fresh auction');
 assert.ok(!getContentMarketListings(r.player).some(l=>l.id===lot.listingId));
 const cash=r.player.ownedStreamingPlatform.treasuryCash;
 const replay=advanceStreamingBuyerAuction(r.player,r.session!.id,100,2_000_000);
 assert.equal(replay.player.ownedStreamingPlatform.treasuryCash,cash);
});
check('all initially visible fixed cards can be exhausted with no replacement',()=>{
 let p=fixture();const a=getContentMarketAuctionAssignments(p);
 const fixed=getContentMarketListings(p).filter(l=>!a.listingIds.has(l.id));
 for(const listing of fixed){const current=getContentMarketListings(p).find(l=>l.id===listing.id)!;
  const result=purchaseContentMarketListing(p,current.id,current.signature);assert.ok(result.changed,result.detail);p=result.player;}
 assert.ok(getContentMarketListings(p).every(l=>a.listingIds.has(l.id)),'Exhausted fixed shelf refilled');
});
check('an unchanged funded title room settles after shelf rotation without becoming new public inventory',()=>{
 let p=contentMarketFixture();p.ownedStreamingPlatform.simulationSeed='0';p.businesses=[];p.pastProjects=[];p.currentWeek=10;
 p.world.projects=Array.from({length:48},(_,i)=>({...p.world.projects[0],id:`roll-${i}`,title:`Roll ${i}`,rating:7,genre:(['ACTION','DRAMA','COMEDY','HORROR'] as Genre[])[i%4]}));
 p.ownedStreamingPlatform.serviceConfiguration.pricing=configureStreamingPricingOffer(p.ownedStreamingPlatform.serviceConfiguration.pricing,{kind:'CORE',coreModel:'STORE'});
 const ecosystem=normalizeStreamingPlatformEcosystem(undefined,getAbsoluteWeek(p.age,p.currentWeek));
 Object.values(ecosystem.operators).forEach(operator=>operator.cashMillions=0);p.world.streamingPlatformEcosystem=ecosystem;
 p=advanceStreamingOpportunityMarket(p);
 const nextPublicIds=new Set(advanceStreamingOpportunityMarket({...p,currentWeek:p.currentWeek+3}).world.streamingOpportunityMarket!.discovery!.titleIds);
 const lot=getStreamingBuyerAuctionLots(p).find(l=>l.listingKind==='TITLE'&&!nextPublicIds.has(l.sourceProjectId))!;assert.ok(lot,'Fixture needs a title which naturally rotates off the public shelf');
 let r=openStreamingBuyerAuction(p,lot.id,1000);
 r=placeStreamingBuyerAuctionBid(r.player,r.session!.id,{minimumGuarantee:Math.round(lot.referenceValue*1.5/100000)*100000,licensorRevenueShare:0,marketingGuarantee:0,futureGreenlight:false},1001);
 assert.ok(r.changed,r.detail);let q={...r.player,currentWeek:p.currentWeek+3};q=advanceStreamingOpportunityMarket(q);
 assert.ok(!q.world.streamingOpportunityMarket!.discovery!.titleIds.includes(lot.sourceProjectId),'Old live source leaked into new public discovery');
 assert.ok(!getContentMarketListings(q).some(l=>l.id===lot.listingId),'Old room became new public inventory');
 const cash=q.ownedStreamingPlatform.treasuryCash;
 const close=advanceStreamingBuyerAuction(q,r.session!.id,75,80_000);
 assert.equal(close.session?.status,'WON',close.session?.resultReason||'Unchanged title room lost its settlement reference');
 assert.equal(close.player.ownedStreamingPlatform.treasuryCash,cash-r.session!.bids.find(b=>b.id===r.session!.playerBidId)!.minimumGuarantee);
 const empty=openStreamingBuyerAuction(p,lot.id,1000);
 const emptyRotated=advanceStreamingOpportunityMarket({...empty.player,currentWeek:p.currentWeek+3});
 const noSale=advanceStreamingBuyerAuction(emptyRotated,empty.session!.id,75,80_000);
 assert.equal(noSale.session?.status,'NO_SALE');
 assert.ok(!getContentMarketListings(noSale.player).some(l=>l.id===lot.listingId),'Unsold old room became a fixed-price offer in the next cycle');
});
check('new canonical release waits for rotation while paid scouting adds only paid private offers',()=>{
 const p=fixture(),before=ids(p),beforeAuctions=assignments(p),beforePublic=structuredClone(p.world.streamingOpportunityMarket!.offers);
 p.world.projects.push({...p.world.projects[0],id:'late-release',title:'Late Release',rating:10});
 assert.deepEqual(ids(p),before,'A new title changed this cycle shelf without refresh');
 const scouted=refreshStreamingPaidScout(p);assert.ok(scouted.changed,scouted.detail);
 assert.equal(scouted.player.ownedStreamingPlatform.treasuryCash,p.ownedStreamingPlatform.treasuryCash-450000);
 assert.deepEqual(ids(scouted.player),before);
 assert.deepEqual(assignments(scouted.player),beforeAuctions);
 assert.deepEqual(scouted.player.world.streamingOpportunityMarket!.offers,beforePublic);
 assert.equal(scouted.player.world.streamingOpportunityMarket!.scoutedOffers?.length,20);
 const next=structuredClone(p);next.currentWeek+=3;
 const rotated=advanceStreamingOpportunityMarket(next);
 assert.notDeepEqual(ids(rotated),before);
 assert.ok(ids(rotated).some(id=>id.includes('late-release')));
});
check('legacy same-cycle snapshot upgrades without changing deals or treasury',()=>{
 const p=fixture();delete (p.world.streamingOpportunityMarket as any).discovery;
 const contracts=JSON.stringify(p.world.streamingRightsContracts),cash=p.ownedStreamingPlatform.treasuryCash,offers=JSON.stringify(p.world.streamingOpportunityMarket!.offers);
 const upgraded=advanceStreamingOpportunityMarket(p);
 assert.ok((upgraded.world.streamingOpportunityMarket as any).discovery);
 assert.equal(JSON.stringify(upgraded.world.streamingRightsContracts),contracts);
 assert.equal(upgraded.ownedStreamingPlatform.treasuryCash,cash);
 assert.equal(JSON.stringify(upgraded.world.streamingOpportunityMarket!.offers),offers);
 assert.equal(JSON.stringify(advanceStreamingOpportunityMarket(JSON.parse(JSON.stringify(upgraded)))),JSON.stringify(upgraded));
});
console.log(JSON.stringify({checks,failures}));if(failures.length)process.exitCode=1;
