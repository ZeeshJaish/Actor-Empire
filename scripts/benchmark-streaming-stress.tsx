import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {streamingCatalogueStressFixture} from './helpers/streamingCatalogueStressFixture';
import {normalizeOwnedStreamingPlatformState,OWNED_STREAMING_CATALOG_DRAFT_REFERENCE_LIMIT} from '../services/ownedStreamingPlatform';
import {migratePlayerSave} from '../services/saveMigration';
import {getStreamingOpeningCatalogueView} from '../services/streamingOpeningCatalogue';
import {advanceStreamingBuyerAuction} from '../services/streamingBuyerAuctions';
import HQ from '../components/StreamingPlatformHQ';
import Define from '../components/StreamingDefineLaunchExperience';
import Room from '../components/StreamingBuyerAuctionRoom';
const start=performance.now();
const fixturePath=process.argv.find(arg=>arg.startsWith('--fixture='))?.slice('--fixture='.length);
const prepared=fixturePath ? (()=>{
    const player=JSON.parse(readFileSync(fixturePath,'utf8')) as ReturnType<typeof streamingCatalogueStressFixture>['player'];
    const session=player.ownedStreamingPlatform.buyerAuctionSessions.find(row=>row.status==='LIVE');
    if(!session)throw new Error('The supplied stress fixture needs its reserved live auction.');
    return {player,session};
})() : streamingCatalogueStressFixture();
const {player,session}=prepared;
const count=(p:typeof player)=>({references:p.ownedStreamingPlatform.catalogProjectIds.length,
    licenses:p.ownedStreamingPlatform.catalogLicenses.length,
    distinctTitles:new Set(p.ownedStreamingPlatform.catalogLicenses.map(l=>l.sourceProjectId)).size,
    canonicalContracts:Object.keys(p.world.streamingRightsContracts||{}).length});
const normalized={...player,ownedStreamingPlatform:normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform,player.id)};
const migrated=migratePlayerSave(JSON.parse(JSON.stringify(player)));
const coverage=getStreamingOpeningCatalogueView(player);
const tick=advanceStreamingBuyerAuction(player,session.id,1,2000);
const noUpdate=()=>{};
const measure=(read:()=>unknown)=>{read();const samples=Array.from({length:3},()=>{const t=performance.now();read();return +(performance.now()-t).toFixed(2)}).sort((a,b)=>a-b);
return {medianMs:samples[1],minMs:samples[0],maxMs:samples[2],samples}};
const lost=(left:string[],right:string[])=>{const set=new Set(right);return left.filter(id=>!set.has(id)).length};
const diagnostics={requested:1040,countries:player.ownedStreamingPlatform.marketOperations.length,fixtureConstructionMs:+(performance.now()-start).toFixed(1),
    planningDraftReferenceLimit:OWNED_STREAMING_CATALOG_DRAFT_REFERENCE_LIMIT,input:count(player),normalized:count(normalized),migrated:count(migrated),afterAuctionTick:count(tick.player),
    normalizedLostReferences:lost(player.ownedStreamingPlatform.catalogProjectIds,normalized.ownedStreamingPlatform.catalogProjectIds),
    normalizedLostLicenseIds:lost(player.ownedStreamingPlatform.catalogLicenses.map(l=>l.id),normalized.ownedStreamingPlatform.catalogLicenses.map(l=>l.id)),
    opening:{titles:coverage.titles.length,available:coverage.titles.filter(t=>t.available).length,rightsReadyCountries:coverage.rightsReadyCountryCount},
    inputSerializedBytes:Buffer.byteLength(JSON.stringify(player))};
writeFileSync('/tmp/streaming-stress-1040-player.json',JSON.stringify(player));
console.log(JSON.stringify({phase:'fixture',...diagnostics}));
const hq=(value=player,room=false)=>renderToStaticMarkup(<HQ player={value} onUpdatePlayer={noUpdate} onTrustedMarketUpdate={noUpdate} onBack={noUpdate} initialContentMarketOfferId={room?session.id:undefined}/>);
const measurements={hq:measure(()=>hq()),hqWithRoom:measure(()=>hq(player,true)),hqWithRoomAfterTick:measure(()=>hq(tick.player,true)),
    isolatedRoom:measure(()=>renderToStaticMarkup(<Room player={player} session={session} onUpdatePlayer={noUpdate} onExit={noUpdate}/>)),
    wizard:measure(()=>renderToStaticMarkup(<Define player={player} onUpdatePlayer={noUpdate} onClose={noUpdate} onOpenFinance={noUpdate} onOpenCatalogue={noUpdate} onOpenBuild={noUpdate} onOpenPricing={noUpdate} onOpenTechnology={noUpdate}/>))};
const result={diagnostics,measurements,memoryMiB:Object.fromEntries(Object.entries(process.memoryUsage()).map(([key,n])=>[key,+(n/1024/1024).toFixed(1)]))};
writeFileSync('/tmp/streaming-stress-1040-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify({phase:'measurements',...result}));
