import assert from 'node:assert/strict';
import { createCinemaViewingRouteLookup } from '../services/boxOffice/boxOfficeViewingRoutes';
let calls=0;
const lookup=createCinemaViewingRouteLookup((country,week,route)=>{calls++;return country==='US'&&week===100&&route.kind==='SUBSCRIPTION'&&route.planId==='paid'?[{titleId:'film',contractId:'one'},{titleId:'film',contractId:'shared'}]:[]});
for(let i=0;i<10000;i++)assert.equal(lookup.hasTitle('US',100,{kind:'SUBSCRIPTION',planId:'paid'},'film'),true);
assert.equal(calls,1,'Repeated catalogue membership must resolve the same immutable rights route once');
assert.equal(lookup.titles('US',100,{kind:'SUBSCRIPTION',planId:'paid'}).length,2,'Overlapping positions are preserved, not economically deduplicated');
assert.equal(lookup.hasTitle('IN',100,{kind:'SUBSCRIPTION',planId:'paid'},'film'),false);
assert.equal(lookup.hasTitle('US',101,{kind:'SUBSCRIPTION',planId:'paid'},'film'),false);
assert.equal(lookup.hasTitle('US',100,{kind:'SUBSCRIPTION',planId:'free'},'film'),false);
assert.equal(lookup.hasTitle('US',100,{kind:'RENTAL'},'film'),false);
assert.equal(calls,5);
assert.throws(()=>{(lookup.titles('US',100,{kind:'SUBSCRIPTION',planId:'paid'}) as any[]).push({titleId:'forged'})});
const changed=createCinemaViewingRouteLookup(()=>[]);assert.equal(changed.hasTitle('US',100,{kind:'SUBSCRIPTION',planId:'paid'},'film'),false,'A new world snapshot cannot inherit an old rights cache');
const stringify=JSON.stringify;JSON.stringify=(()=>{throw new Error('No serialization during legacy normalization')}) as typeof JSON.stringify;
try{const duringMigration=createCinemaViewingRouteLookup(()=>[{titleId:'retained'}]);assert.equal(duringMigration.hasTitle('US',100,{kind:'PURCHASE'},'retained'),true)}finally{JSON.stringify=stringify}
console.log('PASS 10,000 membership checks use one route evaluation; country/week/plan/mode/new-snapshot isolation and duplicate rights positions preserved');
