import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createLabBuildData, createLabDraft } from '../lab/buildLabData';
import { buildTotals, moneyPlan, serviceForecast, fitsPlan, tiersOf, type BuildData } from '../components/studio-finance/finance/build';
import { forecastStreamingLaunchMarketing, getStreamingLaunchMarketingRecommendations, STREAMING_LAUNCH_MARKETING_CHANNELS, type StreamingLaunchMarketingInput } from '../services/streamingLaunchMarketing';
import { createNetworkSuggestion, validateNetworkSuggestion, parseNetworkLimit, type NetworkSuggestionRequest } from '../components/studio-finance/finance/networkSuggestions';
import { NetworkSuggestionSheet } from '../components/studio-finance/components/build/NetworkSuggestionSheet';
import { captureNetworkBuildData } from './fixtures/networkSuggestionBuildData';
import { filedMarketFixture } from './helpers/streamingFiledMarketFixture';
import { buildSelectionFromDraft } from '../components/streaming-transplant/StreamingBuildWizardExperience';
import { createDefaultStreamingInfrastructureDraft, saveStreamingInfrastructureDraft } from '../services/streamingInfrastructure';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { readFileSync } from 'node:fs';
import { WORLD_COUNTRY_DEFINITIONS } from '../services/worldEconomy/worldCountryRegistry';
import { placeRegion, emptySetup } from '../components/studio-finance/finance/placer';

const request: NetworkSuggestionRequest = { mode: 'BALANCED', upfrontLimit: 500_000_000, weeklyLimit: 10_000_000, replaceUnbuilt: false };
async function main() {
 const data = createLabBuildData(['US', 'IN']);
 const draft = createLabDraft();
 const before = JSON.stringify({data,draft});
 for (const value of ['', '1.1', '-1', 'NaN', '1e6', '9007199254740992']) assert.equal(parseNetworkLimit(value), null);
 assert.equal(parseNetworkLimit('500000000'), 500000000);
 for (const value of [NaN, Infinity, -1, .5, Number.MAX_SAFE_INTEGER + 1]) {
  assert.equal((await createNetworkSuggestion(data, draft, {...request, upfrontLimit:value})).status, 'INVALID');
  assert.equal((await createNetworkSuggestion(data, draft, {...request, weeklyLimit:value})).status, 'INVALID');
 }
 assert.equal((await createNetworkSuggestion({...data,hasExplicitOpeningMarkets:false},draft,request)).status,'INVALID');
 assert.equal((await createNetworkSuggestion(createLabBuildData([]),draft,request)).status,'INVALID');
 assert.equal((await createNetworkSuggestion({...data,canonicalMode:'CAREER'},draft,request)).status,'INVALID');
 const start = performance.now();
 const result = await createNetworkSuggestion(data,draft,request);
 assert.equal(result.status,'READY');
 if (result.status !== 'READY') throw Error('No proposal');
 const p = result.proposal;
 assert.ok(p.draft.facilities.length > 0);
 assert.ok(p.upfront <= request.upfrontLimit && p.weekly <= request.weeklyLimit);
 assert.deepEqual(p.services,serviceForecast(data,p.draft));
 assert.deepEqual(p.services.map(s=>s.code).sort(),['IN','US']);
 for (const room of p.draft.facilities) {
  assert.ok(['IN','US'].includes(data.cities.find(c=>c.id===room.cityId)!.code));
  if (room.tenure !== 'CLOUD') assert.ok(fitsPlan(data.listings.find(l=>l.id===room.listingId)!,tiersOf(room)));
 }
 const validationStart = performance.now();
 assert.equal(validateNetworkSuggestion(data,draft,request,p).ok,true);
 console.log(`US+IN generation=${(validationStart-start).toFixed(1)}ms validation=${(performance.now()-validationStart).toFixed(1)}ms candidates=${p.evaluatedCandidates}`);
 for (const [changedData,changedDraft,changedRequest] of [
  [{...data,treasury:{...data.treasury,available:1}},draft,request],
  [createLabBuildData(['US']),draft,request],
  [data,{...draft,doctrine:'SPRINT' as const},request],
  [data,draft,{...request,mode:'PREMIUM' as const}],
  [data,draft,{...request,upfrontLimit:2}],
 ] as const) assert.equal(validateNetworkSuggestion(changedData,changedDraft,changedRequest,p).ok,false);
 const again=await createNetworkSuggestion(data,draft,request);
 assert.equal(again.status,'READY');
 if(again.status==='READY') assert.deepEqual(again.proposal,p);
 assert.equal(JSON.stringify({data,draft}),before);
 const tiny=await createNetworkSuggestion(data,draft,{...request,upfrontLimit:1,weeklyLimit:1});
 assert.equal(tiny.status,'READY');
 if(tiny.status==='READY') {assert.equal(tiny.proposal.complete,false);assert.equal(tiny.proposal.draft.facilities.length,0);}
 const impossible=await createNetworkSuggestion({...data,listings:[]},draft,request);
 assert.equal(impossible.status,'READY');
 if(impossible.status==='READY') {assert.equal(impossible.proposal.complete,false);assert.ok(impossible.proposal.warnings.length);}
 const controller=new AbortController();
 const cancelled=await createNetworkSuggestion(data,draft,request,{signal:controller.signal,onProgress:()=>controller.abort()});
 assert.equal(cancelled.status,'CANCELLED');
 const completedControl=new AbortController();
 const completed=await createNetworkSuggestion(data,draft,request,{signal:completedControl.signal});
 assert.equal(completed.status,'READY');
 completedControl.abort();
 if(completed.status==='READY') assert.equal(validateNetworkSuggestion(data,draft,request,completed.proposal).ok,false,'Cancellation invalidates even a completed unapplied result');
 const original = placeRegion(data,draft,'ASIA',{...emptySetup(),servers:{SCOUT:2,WORKHORSE:0,TITAN:0}}).draft;
 const retained=await createNetworkSuggestion(data,original,request);
 assert.equal(retained.status,'READY');
 if(retained.status==='READY') for(const room of original.facilities) assert.deepEqual(retained.proposal.draft.facilities.find(r=>r.id===room.id),room);
 const existing = {...original.facilities[0],built:false};
 const replaced=await createNetworkSuggestion({...data,existing:[existing]},original,{...request,replaceUnbuilt:true});
 assert.equal(replaced.status,'READY');
 if(replaced.status==='READY') assert.deepEqual(replaced.proposal.draft.facilities.find(r=>r.id===existing.id),existing);
 // A second suggestion must add beside rooms whose IDs came from the first.
 const second = await createNetworkSuggestion(data,p.draft,{...request,upfrontLimit:700_000_000,weeklyLimit:20_000_000});
 assert.equal(second.status,'READY');
 if(second.status==='READY') {
   for(const room of p.draft.facilities) assert.deepEqual(second.proposal.draft.facilities.find(r=>r.id===room.id),room);
   assert.ok(second.proposal.draft.facilities.length > p.draft.facilities.length || second.proposal.complete, 'Fill gaps can add beside an earlier suggestion');
 }
 const unavailable = createLabBuildData(['IN']);
 unavailable.listings = unavailable.listings.map(l => ({...l,availability:'RESEARCH' as const}));
 const locked=await createNetworkSuggestion(unavailable,draft,request);
 assert.equal(locked.status,'READY');
 if(locked.status==='READY') assert.equal(locked.proposal.draft.facilities.length,0);
 const residency=createLabBuildData(['IN']);
 residency.listings=residency.listings.filter(listing => residency.cities.find(city=>city.id===listing.cityId)?.code==='CN');
 const noLocalSite=await createNetworkSuggestion(residency,draft,request);
 assert.equal(noLocalSite.status,'READY');
 if(noLocalSite.status==='READY') {assert.equal(noLocalSite.proposal.draft.facilities.length,0);assert.equal(noLocalSite.proposal.fullCoverage,false);}
 const brazil=createLabBuildData(['BR']);
 brazil.listings=brazil.listings.filter(listing=>listing.tenures?.includes('CLOUD'));
 const providerCase=await createNetworkSuggestion(brazil,draft,request);
 assert.equal(providerCase.status,'READY');
 if(providerCase.status==='READY') assert.ok(providerCase.proposal.draft.facilities.every(room=>room.provider!=='NORTHWIND'));
 const deferred={...data,treasury:{available:100,committedLaunch:100}};
 const deferredCase=await createNetworkSuggestion(deferred,draft,request);
 assert.equal(deferredCase.status,'READY');
 if(deferredCase.status==='READY') assert.equal(deferredCase.proposal.upfront,0);
 for(const mode of ['BUDGET','PREMIUM'] as const) {
  const preset=await createNetworkSuggestion(data,draft,{...request,mode});
  assert.equal(preset.status,'READY');
  if(preset.status==='READY') {assert.equal(preset.proposal.targetMultiplier,mode==='BUDGET'?1:1.5);assert.ok(preset.proposal.upfront<=request.upfrontLimit && preset.proposal.weekly<=request.weeklyLimit);}
 }
 const builtOutside=placeRegion(createLabBuildData(['CN']),draft,'ASIA',{...emptySetup(),servers:{SCOUT:2,WORKHORSE:0,TITAN:0}}).draft.facilities.map(r=>({...r,built:true}));
 const outsideDraft={...draft,facilities:builtOutside};
 const outside=await createNetworkSuggestion(data,outsideDraft,{...request,replaceUnbuilt:true});
 assert.equal(outside.status,'READY');
 if(outside.status==='READY') for(const room of builtOutside) assert.deepEqual(outside.proposal.draft.facilities.find(r=>r.id===room.id),room);
 const html=renderToStaticMarkup(<NetworkSuggestionSheet data={data} draft={draft} onApply={()=>{throw Error('render applied');}} onClose={()=>{}}/>);
 assert.match(html,/Suggest network/); assert.match(html,/Fill remaining gaps/);assert.match(html,/Generate/);assert.match(html,/aria-modal="true"/);
 assert.equal(buildTotals(data,draft).racks,0);
 const player=filedMarketFixture(['US','IN']);
 // Real CAREER accounting: paid setup/catalogue/originals must not reserve current cash again.
 const modest=structuredClone(player);
 modest.ownedStreamingPlatform.treasuryCash=100_000_000;
 const modestBefore=JSON.stringify(modest);
 const settled={defineLaunchPaid:[{id:'setup',label:'Paid setup',amount:20_000_000}],catalogueSpend:120_000_000,originalsSpend:10_000_000};
 const paid=captureNetworkBuildData(modest,['US','IN'],undefined,{settled});
 const paidMoney=moneyPlan(paid.data,paid.draft);
 assert.equal(paid.data.treasury.committedLaunch,150_000_000);
 assert.equal(paidMoney.lines.filter(line=>line.timing==='SETTLED').reduce((sum,line)=>sum+line.amount,0),150_000_000);
 assert.equal(paidMoney.deferred,0);
 const zeroRequest={...request,upfrontLimit:0,weeklyLimit:0};
 const zeroPaid=await createNetworkSuggestion(paid.data,paid.draft,zeroRequest);
 assert.equal(zeroPaid.status,'READY','Settled CAREER spend above current cash must allow a zero-upfront plan');
 if(zeroPaid.status==='READY') assert.equal(validateNetworkSuggestion(paid.data,paid.draft,zeroRequest,zeroPaid.proposal).ok,true);
 const fundedDraft=placeRegion(paid.data,paid.draft,'NORTH_AMERICA',{...emptySetup(),servers:{SCOUT:1,WORKHORSE:0,TITAN:0}}).draft;
 assert.ok(moneyPlan(paid.data,fundedDraft).commissionNow!>0 && moneyPlan(paid.data,fundedDraft).commissionNow!<=100_000_000,'Real owned server quote fits current cash');
 const affordablePaid=await createNetworkSuggestion(paid.data,fundedDraft,request);
 assert.equal(affordablePaid.status,'READY');
 if(affordablePaid.status!=='READY') throw Error('No affordable paid-spend proposal');
 assert.ok(affordablePaid.proposal.upfront>0 && affordablePaid.proposal.upfront<=100_000_000,'Current cash remains available for actual infrastructure');
 assert.equal(validateNetworkSuggestion(paid.data,fundedDraft,request,affordablePaid.proposal).ok,true);
 const marketingInput:StreamingLaunchMarketingInput={platformKey:'network-money-qa',absoluteWeek:100,buildWeeks:8,
  availableTreasury:100_000_000,protectedOperatingCash:0,hasSellablePlan:true,hasFlagshipOriginal:false,
  pricingRevision:1,catalogueRevision:1,localizationRevision:1,competitionRevision:1,countries:[]};
 function marketing(budgetCeiling:number):NonNullable<BuildData['marketing']> {
  const draft:NonNullable<BuildData['marketing']>['draft']={schemaVersion:1,objective:'PLATFORM_INTRODUCTION',timeline:'BALANCED',
   budgetCeiling,allocationMode:'AUTO',countryWeights:{},channelAllocations:{SOCIAL_DIGITAL:1},updatedAtAbsoluteWeek:100,revision:1};
  return {draft,forecast:forecastStreamingLaunchMarketing(marketingInput,draft),recommendations:getStreamingLaunchMarketingRecommendations(marketingInput),
   channels:STREAMING_LAUNCH_MARKETING_CHANNELS.map(channel=>({...channel,available:true}))};
 }
 const reserved=captureNetworkBuildData(modest,['US','IN'],undefined,{settled,marketing:marketing(100_000_000)});
 assert.equal(moneyPlan(reserved.data,reserved.draft).deferred,100_000_000);
 const unpaid=await createNetworkSuggestion(reserved.data,reserved.draft,request);
 assert.equal(unpaid.status,'READY','An unpaid campaign equal to cash permits only zero upfront');
 if(unpaid.status==='READY') {
  assert.equal(unpaid.proposal.upfront,0,'Unpaid campaign must leave no cash for infrastructure');
  assert.equal(validateNetworkSuggestion(reserved.data,reserved.draft,request,unpaid.proposal).ok,true);
 }
 assert.equal((await createNetworkSuggestion(reserved.data,fundedDraft,request)).status,'INVALID','Unpaid campaign plus retained unbuilt infrastructure exceeds current cash');
 const overReserved=captureNetworkBuildData(modest,['US','IN'],undefined,{settled,marketing:marketing(100_000_001)});
 assert.equal((await createNetworkSuggestion(overReserved.data,overReserved.draft,request)).status,'INVALID','Unpaid campaign above cash rejects even zero upfront');
 assert.equal(validateNetworkSuggestion(reserved.data,fundedDraft,request,affordablePaid.proposal).ok,false,'Changed campaign invalidates prior Apply');
 // Fresh canonical money can change behind an otherwise unchanged input identity.
 // Use another actual CAREER bridge, not a fabricated MoneyPlan, to exercise the final funds gate.
 const originalMoney=paid.data.canonical!.money;
 paid.data.canonical!.money=reserved.data.canonical!.money;
 const currentFunds=validateNetworkSuggestion(paid.data,fundedDraft,request,affordablePaid.proposal);
 assert.equal(currentFunds.ok,false);
 if(currentFunds.ok===false) assert.match(currentFunds.message,/available funds/,'Apply rechecks unpaid obligations against current funds');
 paid.data.canonical!.money=originalMoney;
 assert.equal(JSON.stringify(modest),modestBefore,'Money regressions must not change cash or rights');
 console.log('CAREER settled $150M / cash $100M: zero and funded plans pass; unpaid $100M/$100M+1 and current-money Apply gates PASS');
 const canonical=captureNetworkBuildData(player,['US','IN']);
 const careerBefore=JSON.stringify(player);
 const single=captureNetworkBuildData(player,['IN']);
 let mixedCandidates=0;
 const originalQuote=single.data.canonical!.quote!;
 single.data.canonical!.quote = candidate => { if(candidate.facilities.some(r=>r.tenure==='CLOUD') && candidate.facilities.some(r=>r.tenure!=='CLOUD')) mixedCandidates+=1; return originalQuote(candidate); };
 await createNetworkSuggestion(single.data,single.draft,request);
 assert.ok(mixedCandidates>0,'Bounded alternatives include fresh mixed server/cloud candidates');
 const career=await createNetworkSuggestion(canonical.data,canonical.draft,request);
 assert.equal(career.status,'READY');
 if(career.status==='READY') {
  const accepted=validateNetworkSuggestion(canonical.data,canonical.draft,request,career.proposal);
  assert.equal(accepted.ok,true);
  if(!accepted.ok) throw Error('Apply failed');
  const applied={...canonical.draft,...accepted.patch};
  const sel=buildSelectionFromDraft(applied,{placements:[],facilities:[],arch:'HYBRID',doctrine:'STANDARD',campaign:'NONE'},getAbsoluteWeek(player.age,player.currentWeek));
  const save=saveStreamingInfrastructureDraft(player,{...createDefaultStreamingInfrastructureDraft(player),facilities:sel.facilities,networkPlacements:sel.placements,regionPlans:sel.regionPlans,lastLaunchRehearsal:undefined});
  const normalized=normalizeOwnedStreamingPlatformState(JSON.parse(JSON.stringify(save.ownedStreamingPlatform)),save.id);
  const savedDraft=normalized.infrastructureSetupDraft!;
  assert.equal(normalized.treasuryCash,player.ownedStreamingPlatform.treasuryCash);
  assert.deepEqual(normalized.catalogLicenses,normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform,player.id).catalogLicenses);
  assert.equal(savedDraft.facilities?.length,applied.facilities.length);
  const reopened=captureNetworkBuildData({...save,ownedStreamingPlatform:normalized},['US','IN'],{...sel,facilities:savedDraft.facilities,placements:savedDraft.networkPlacements,regionPlans:savedDraft.regionPlans});
  assert.deepEqual(reopened.data.canonical!.quote!(reopened.draft).totals,career.proposal.quote!.totals);
  assert.deepEqual(serviceForecast(reopened.data,reopened.draft),career.proposal.services);
 }
 assert.equal(JSON.stringify(player),careerBefore);
 if(process.argv.includes('--scale')) {
  const pinned=JSON.parse(readFileSync('/tmp/network-suggestion-5000-player.json','utf8'));
  for(const codes of [['US','IN'],WORLD_COUNTRY_DEFINITIONS.map(country=>country.id)]) {
   const captured=captureNetworkBuildData(pinned,codes);
   const start=performance.now();let last=start,maxSlice=0;
   const result=await createNetworkSuggestion(captured.data,captured.draft,request,{onProgress:()=>{const now=performance.now();maxSlice=Math.max(maxSlice,now-last);last=now;}});
   const generated=performance.now()-start;
   assert.equal(result.status,'READY');
   if(result.status==='READY') {
    const a=performance.now();assert.equal(validateNetworkSuggestion(captured.data,captured.draft,request,result.proposal).ok,true);
    console.log(`Canonical 5000 titles / ${codes.length} markets: generation=${generated.toFixed(1)}ms apply=${(performance.now()-a).toFixed(1)}ms longest work slice=${maxSlice.toFixed(1)}ms candidates=${result.proposal.evaluatedCandidates}`);
   }
  }
 }
 console.log('Network suggestions: planner, hard limits, current-input apply, preservation, cancellation, deterministic output and sheet render PASS');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
