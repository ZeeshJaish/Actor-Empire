import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {BuildWizard} from '../components/studio-finance/components/build/BuildWizard';
import {createLabBuildData,createLabDraft} from '../lab/buildLabData';
const data=createLabBuildData();
const markup=renderToStaticMarkup(<BuildWizard data={data} initialDraft={createLabDraft()} operations/>);
assert.ok(markup.includes('Network operations'),'Live manager must be distinct from the launch wizard');
assert.ok(markup.includes('Review revision'));
assert.ok(!markup.includes('Next ·'),'Operations must not replay the wizard sequence');
const review=renderToStaticMarkup(<BuildWizard data={data} initialDraft={createLabDraft()} operations initialStage="launch"/>);
assert.ok(review.includes('Apply network revision'));
assert.ok(!review.includes('Opening night'));
console.log('PASS focused Network/Test/Review shell without launch journey');
const {readFileSync}=require('node:fs');
const Launch=require('../components/StreamingDefineLaunchExperience').default;
const player=JSON.parse(readFileSync('/tmp/streaming-operations-live.json','utf8'));
for(const operation of ['PRICING','IDENTITY','STOREFRONT','MARKETS','CLEARANCE']) {
 const ui=renderToStaticMarkup(<Launch player={player} operation={operation} operationCountryId="IN" onUpdatePlayer={()=>{throw Error('Rendering cannot mutate the career');}} onClose={()=>{}} onOpenFinance={()=>{}} onOpenCatalogue={()=>{}} onOpenBuild={()=>{}} onOpenPricing={()=>{}} onOpenTechnology={()=>{}}/>);
 assert.ok(!ui.includes('aria-label="Launch steps"'));
 assert.ok(!ui.includes('Next ·'));
 if(operation==='PRICING'){assert.ok(ui.includes('Save changes'));assert.ok(!ui.includes('Autosaved as you edit'));}
 if(operation==='CLEARANCE'){
  assert.ok(ui.includes('All filed markets are cleared'));
  assert.ok((ui.match(/role="tab"/g)||[]).length<80,'Clearance mounts only the selected region, not 197 country tabs');
 }
}
console.log('PASS focused Pricing/Ident/Storefront/Markets/Clearance and bounded country controls');

const {captureNetworkBuildData}=require('./fixtures/networkSuggestionBuildData');
const {moneyPlan,infrastructureMoneyPlan}=require('../components/studio-finance/finance/build');
const captured=captureNetworkBuildData(player,undefined,undefined,{bridge:{isLive:true,operations:true,revisionQuote:()=>({dueNow:12345,weeklyCost:789,buildWeeks:3})}});
assert.equal(infrastructureMoneyPlan(moneyPlan(captured.data,captured.draft)).total,12345,'Review must quote the incremental canonical revision, not the whole network purchase');
assert.equal(captured.data.canonical.totals(captured.draft).weeklyCost,789);
assert.equal(captured.data.canonical.totals(captured.draft).weeks,3);
assert.equal(moneyPlan(captured.data,captured.draft).deferred,0,'Past opening marketing must not be reserved again in live Operations');
console.log('PASS canonical revision quote reaches totals and bill without re-reserving launch marketing');
