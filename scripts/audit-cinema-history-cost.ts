import assert from 'node:assert/strict';
import {compactCinemaMarketState} from '../services/boxOffice/boxOfficeHistory';
import {CINEMA_AUDIENCE_PROFILE} from '../services/boxOffice/boxOfficeProfiles';
import type {CinemaMarketState} from '../services/boxOffice/boxOfficeTypes';

const state:CinemaMarketState={schemaVersion:1,tuningVersion:5,lastProcessedAbsoluteWeek:10,runs:[],
  affinities:Array.from({length:200},(_,i)=>Array.from({length:48},(_,j)=>({cohortId:`c${i}`,kind:'ACTOR' as const,
    id:j?'other-'+j:'favorite',people:20,strength:20,lastWeek:4}))).flat(),
  titles:[{titleId:'retiring',ownerId:'studio',universeId:'universe',releaseWeek:1,appliedExposureIds:[],
    cast:[{personId:'favorite',name:'Favorite',roleType:'SUPPORTING',isPlayer:false,characterIds:[],fame:50,roleWeight:.5},
      {personId:'favorite',name:'Favorite',roleType:'LEAD',isPlayer:false,characterIds:[],fame:50,roleWeight:1}],
    cells:[{cohortId:'c0',awarePeople:100,deferredPeople:0,lastDiscoveryWeek:1,
      seenBands:[{people:50,satisfaction:80,repeatAdmissions:0,lastViewedWeek:9}]}]}]};
// Old saves can contain duplicate identities: the first row receives updates,
// while the existing recency/cap ordering still decides which summaries survive.
state.affinities.push({cohortId:'c0',kind:'ACTOR',id:'favorite',people:999,strength:99,lastWeek:99});
const original=structuredClone(state),find=Array.prototype.find,filter=Array.prototype.filter;
let inspections=0,result:CinemaMarketState;
for(const [name,method] of [['find',find],['filter',filter]] as const){
  (Array.prototype as any)[name]=function(predicate:any,thisArg:any){
    const affinity=this.length&&this[0]&&'cohortId' in Object(this[0])&&'strength' in Object(this[0]);
    return (method as any).call(this,affinity?function(...args:any[]){inspections++;return predicate.apply(thisArg,args)}:predicate,thisArg);
  };
}
try{result=compactCinemaMarketState(state,new Set())}finally{Array.prototype.find=find;Array.prototype.filter=filter}
assert.deepEqual(state,original,'Compaction must not mutate the paid/input state');
assert.equal(result!.titles.length,0);
const local=result!.affinities.filter(a=>a.cohortId==='c0');
assert.deepEqual(local.filter(a=>a.kind==='ACTOR'&&a.id==='favorite').map(a=>a.strength).sort((a,b)=>a-b),[50,99]);
assert.equal(local.find(a=>a.kind==='STUDIO')?.people,50);
assert.equal(local.find(a=>a.kind==='UNIVERSE')?.strength,80);
assert.equal(local.length,CINEMA_AUDIENCE_PROFILE.maxAffinityEntriesPerCohort);
assert.equal(result!.affinities.find(a=>a.cohortId==='c1'&&a.id==='favorite')?.strength,20,'Favorites cannot leak between cohorts');
assert.ok(inspections<50_000,`History compaction must avoid a full affinity scan per cohort/credit; inspections=${inspections}`);
console.log(JSON.stringify({status:'PASS',cohorts:200,affinities:state.affinities.length,inspections}));
