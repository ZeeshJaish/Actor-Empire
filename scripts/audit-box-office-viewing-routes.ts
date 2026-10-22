import assert from 'node:assert/strict';
import { createCinemaViewingRouteLookup } from '../services/boxOffice/boxOfficeViewingRoutes';
import { INITIAL_PLAYER } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { createWorldStreamingViewingState } from '../services/worldEconomy/worldStreamingViewing';
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

// Historical fallback must be indexed within the immutable weekly read batch.
// Rebuilding all saved title facts for each country/title grows with the archive.
{
 const player=migratePlayerSave(structuredClone(INITIAL_PLAYER));
 let archiveScans=0;
 const projects=player.world.projects,each=projects.forEach;
 Object.defineProperty(projects,'forEach',{value:function(...args:Parameters<typeof each>){archiveScans++;return each.apply(this,args)}});
 const before=JSON.stringify(player);
 const state=createWorldStreamingViewingState(player,getAbsoluteWeek(player.age,player.currentWeek)+1);
 assert.ok(Object.keys(state.platforms).length>0,'Exercise real rival viewing and attribution');
 assert.equal(JSON.stringify(player),before,'A weekly read batch cannot mutate its source');
 assert.ok(archiveScans<=100,`Historical archive rebuilt ${archiveScans} times in one viewing close`);
 console.log('PASS immutable viewing batch bounds historical archive scans:',archiveScans);
}
