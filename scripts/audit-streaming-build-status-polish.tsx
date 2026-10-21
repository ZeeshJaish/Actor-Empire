import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {BuildWizard} from '../components/studio-finance/components/build/BuildWizard';
import {regionalStatusSegments} from '../components/studio-finance/finance/regionalStatus';
import {createLabBuildData, createLabDraft} from '../lab/buildLabData';
import {gates, limitingFactor, takeListing, buildTotals, moneyPlan, serviceForecast, rehearse, signatureOf, type Facility} from '../components/studio-finance/finance/build';
const data=createLabBuildData();
const draft=createLabDraft();
const room=takeListing(data.listings[0]);
assert.ok(room, 'Lab needs one room');
const full={...room,power:{used:10,contracted:10},cooling:{used:10,available:10},bandwidth:{used:10,available:10},condition:1};
assert.equal(limitingFactor(data,full),'NONE','A room exactly within its resource contract is full, not short');
for(const resource of ['power','cooling','bandwidth'] as const){
 const over={...full,[resource]:{...full[resource],used:11}};
 assert.notEqual(limitingFactor(data,over),'NONE',resource+' overflow must stay blocked');
}
const stale={...full,power:{used:100,contracted:10}};
const bridge={totals:(d: typeof draft)=>buildTotals(data,d),money:(d: typeof draft)=>moneyPlan(data,d),services:(d: typeof draft)=>serviceForecast(data,d),signature:()=>"fixture",rehearse:()=>{throw Error('Unused')}};
const canonicalData={...data,canonical:{...bridge,facilities:()=>[full]}};
assert.equal(gates(canonicalData,{...draft,facilities:[stale]}).find(g=>g.id==='physical')?.ok,true,'Commission uses the same provider resource projection as the forecast');
const expanded: Facility={...stale,physicalConstraint:'NONE'};
assert.equal(limitingFactor(data,expanded),'NONE','Provider-supported expanded contracts override base-listing estimates');
assert.equal(limitingFactor(data,{...full,physicalConstraint:'POWER'}),'POWER','Canonical physical constraints remain authoritative');
const constrainedData={...data,canonical:{...bridge,facilities:()=>[stale]}};
assert.equal(gates(constrainedData,{...draft,facilities:[full]}).find(g=>g.id==='physical')?.ok,false,'A real projected constraint cannot be bypassed by healthy draft estimates');
console.log('PASS room contract boundaries and canonical commissioning checks');
for (let total=1;total<=197;total++) for(let bad=0;bad<=total;bad++) {
 const states = Array.from({length:total},(_,i)=>i<bad?'NONE' as const:'READY' as const);
 const bars=regionalStatusSegments(states);
 assert.equal(bars.length,14);
 if(bad) assert.ok(bars.includes('bad'),'Nonzero outage must stay visible');
 if(bad===0) assert.ok(bars.every(t=>t==='good'));
 if(bad===total) assert.ok(bars.every(t=>t==='bad'));
}
const mixed=regionalStatusSegments([...Array(44).fill('READY'),'WATCH','NONE']);
assert.equal(mixed.filter(t=>t==='bad').length,1);
assert.equal(mixed.filter(t=>t==='warn').length,1);
assert.equal(regionalStatusSegments([...Array(38).fill('READY'),...Array(8).fill('NONE')]).filter(t=>t==='bad').length,2);
assert.deepEqual(regionalStatusSegments([]),[]);
console.log('PASS 14-segment regional summaries, proportions and small-outage visibility');


const evidence={...rehearse(data,draft,'LIKELY'),signature:signatureOf(data,draft),verdict:'BROKE' as const,failedPct:0,countries:[
 {name:'Tiny market',code:'US',demand:1,failedPct:100,state:'UNSTABLE' as const},
 {name:'Large market',code:'IN',demand:100_000,failedPct:0,state:'READY' as const},
]};
const markup=renderToStaticMarkup(<BuildWizard data={data} initialDraft={{...draft,rehearsal:evidence}} initialStage="test"/>);
assert.ok(markup.includes('&lt;0.1% of viewers could not watch.'),'A tiny real failure must not be rounded to zero in the UI');
console.log('PASS small-market failures remain visible in the aggregate summary');
