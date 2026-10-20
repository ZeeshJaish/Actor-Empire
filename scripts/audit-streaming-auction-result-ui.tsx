import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {contentMarketFixture} from './helpers/contentMarketFixture';
import {getStreamingBuyerAuctionLots,openStreamingBuyerAuction} from '../services/streamingBuyerAuctions';
import StreamingBuyerAuctionRoom from '../components/StreamingBuyerAuctionRoom';
import type {StreamingBuyerAuctionSession} from '../types';
const player=contentMarketFixture();
const lot=getStreamingBuyerAuctionLots(player)[0];
const opened=openStreamingBuyerAuction(player,lot.id,1000);
assert.ok(opened.session);
const base=opened.session;
const bid={id:'result-winner',bidderId:base.playerBidderId,bidderName:'Empire+',isPlayer:true,
  minimumGuarantee:250_000_000,licensorRevenueShare:0,marketingGuarantee:0,futureGreenlight:false,
  productionFunding:0,sellerValue:250_000_000,guaranteedExposure:250_000_000,
  createdAtActiveSecond:1,status:'ACTIVE' as const};
let passed=0;const failures:string[]=[];
for(const status of ['NO_SALE','WON','LOST','INVALIDATED','WITHDRAWN'] as const){
  const sold=status==='WON'||status==='LOST';
  const winner={...bid,isPlayer:status==='WON',bidderName:status==='WON'?'Empire+':'Prime Video'};
  const session={...base,status,winnerBidId:sold?bid.id:null,bids:sold?[winner]:[],
    resultReason:status==='NO_SALE'?'The strongest contract did not meet the seller’s reserve. No rights or money moved.':null} as StreamingBuyerAuctionSession;
  try{
    const html=renderToStaticMarkup(<StreamingBuyerAuctionRoom player={opened.player} session={session} onUpdatePlayer={()=>{}} onExit={()=>{}}/>);
    assert.ok(html.includes(lot.title),'Every terminal outcome must identify the project, including no sale');
    assert.match(html,/<svg[^>]*viewBox="0 0 100 150"/,'Every result shows the actual title poster');
    if(sold){assert.match(html,/Upfront guarantee/);assert.match(html,/Rights term/);assert.match(html,new RegExp(status==='WON'?'Acquired':'Prime Video'));}
    else {assert.doesNotMatch(html,/>SOLD</);assert.doesNotMatch(html,/>—</,'No-sale screen must not show an empty price badge');}
    if(status==='INVALIDATED')assert.match(html,/Rights unavailable/);
    if(status==='WITHDRAWN')assert.match(html,/Offer withdrawn/);
    assert.match(html,/Return to the market/i);passed++;console.log(`PASS ${status} result`);
  }catch(error){failures.push(status);console.error(`FAIL ${status}: ${String(error)}`);}
}
try {
  const session={...base,status:'NO_SALE',winnerBidId:null,bids:[],lot:{...base.lot,
    listingKind:'CATALOGUE_PACKAGE',title:'MGM Collection',genre:'CATALOGUE',catalogueComponentIds:['one','two','three']}} as StreamingBuyerAuctionSession;
  const html=renderToStaticMarkup(<StreamingBuyerAuctionRoom player={opened.player} session={session} onUpdatePlayer={()=>{}} onExit={()=>{}}/>);
  assert.match(html,/Collection · 3 titles/,'Package results identify the collection and its contents');
  assert.doesNotMatch(html,/Film/,'A catalogue package is not a single film');
  passed++;console.log('PASS collection result identity');
}catch(error){failures.push('COLLECTION');console.error(`FAIL COLLECTION: ${String(error)}`);}
console.log(JSON.stringify({passed,failures}));if(failures.length)process.exitCode=1;
