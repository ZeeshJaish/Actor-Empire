import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { buildSelectionFromDraft } from '../components/streaming-transplant/StreamingBuildWizardExperience';
import { createDefaultStreamingInfrastructureDraft, saveStreamingInfrastructureDraft } from '../services/streamingInfrastructure';
import { captureNetworkBuildData } from './fixtures/networkSuggestionBuildData';
import { filedMarketFixture } from './helpers/streamingFiledMarketFixture';
import { createNetworkSuggestion } from '../components/studio-finance/finance/networkSuggestions';
import { serviceForecast } from '../components/studio-finance/finance/build';
import { streamingRehearsalPlayback } from '../services/streamingRehearsalPresentation';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { BuildWizard } from '../components/studio-finance/components/build/BuildWizard';
import type { Player } from '../types';

async function run() {
 const source = process.argv[2];
 const player: Player = source ? JSON.parse(readFileSync(source,'utf8')) : filedMarketFixture();
 const before = JSON.stringify(player);
 const {data,draft} = captureNetworkBuildData(player);
 const start = performance.now();
 const generated = await createNetworkSuggestion(data,draft,{mode:'BALANCED',upfrontLimit:5_000_000_000,replaceUnbuilt:true});
 assert.equal(generated.status,'READY');
 if(generated.status!=='READY') throw Error('No plan');
 const generationMs=performance.now()-start;
 const chosen = generated.proposal.draft;
 const serviceStart = performance.now();
 const projectedRooms = data.canonical!.facilities!(chosen);
 assert.strictEqual(data.canonical!.facilities!(chosen), projectedRooms, 'Repeated gate and map reads reuse the room projection');
 const clearedRooms = data.canonical!.facilities!({...chosen, facilities: []});
 assert.equal(clearedRooms.length, 0, 'A changed room drawing must not reuse stale projections');
 const services = serviceForecast(data,chosen);
 const likely = data.canonical!.runRehearsal!(chosen,'LIKELY');
 for (const country of likely.countries) {
   const service = services.find(service=>service.marketId===country.marketId)!;
   assert.equal(service.startupMs,country.startupTimeMs??0,'Test and rehearsal startup must agree');
   if(country.failedPercent>0 || country.outageResistance==='UNSERVED') assert.notEqual(service.state,'READY',country.country+' must not show operational with failed streams');
   if(country.outageResistance==='UNSERVED') assert.equal(service.coveredPeak,0);
   assert.equal(country.latencyMs,service.networkLatencyMs,'Rehearsal receives raw route latency, not the already-calculated startup time');
 }
 const quiet=data.canonical!.runRehearsal!(chosen,'QUIET');
 const surge=data.canonical!.runRehearsal!(chosen,'SURGE');
 assert.ok(quiet.peakConcurrentStreams<=likely.peakConcurrentStreams);
 assert.ok(surge.peakConcurrentStreams>=likely.peakConcurrentStreams);
 const readsMs=performance.now()-serviceStart;
 const quoteBefore=JSON.stringify(data.canonical!.quote!(chosen));
 for(let n=0;n<10;n++) data.canonical!.runRehearsal!(chosen,'SURGE');
 assert.equal(JSON.stringify(data.canonical!.quote!(chosen)),quoteBefore);
 const launch = renderToStaticMarkup(<BuildWizard data={data} initialDraft={chosen} initialStage="launch"/>);
 assert.ok((launch.match(/bw-agreement-region/g)||[]).length<=6,'Agreement starts with at most six regional groups');
 assert.equal(JSON.stringify(player),before,'Projection and render never alter the source save or licences');
 if(process.argv[3]) {
   const selection=buildSelectionFromDraft(chosen,{placements:[],facilities:[],arch:'HYBRID',doctrine:'STANDARD',campaign:'NONE'},0,{},'CAREER');
   const saved=saveStreamingInfrastructureDraft(player,{...createDefaultStreamingInfrastructureDraft(player),networkPlacements:selection.placements,regionPlans:selection.regionPlans,facilities:selection.facilities});
   writeFileSync(process.argv[3],JSON.stringify(saved));
 }
 console.log(JSON.stringify({titles:player.ownedStreamingPlatform.catalogLicenses.length,countries:services.length,generationMs:+generationMs.toFixed(1),scenarioReadMs:+readsMs.toFixed(1),likely:likely.peakConcurrentStreams,surge:surge.peakConcurrentStreams,unavailable:likely.countries.filter(c=>streamingRehearsalPlayback(c)==='DOWN').length,degraded:likely.countries.filter(c=>streamingRehearsalPlayback(c)==='BUFFERING').length}));
}
run().catch(error=>{console.error(error);process.exitCode=1});
