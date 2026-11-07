import assert from 'node:assert/strict';
import {simulateCinemaWeek} from '../services/boxOffice/boxOfficeMarket';
import {makeCinemaMarketFixture} from './fixtures/boxOfficeScenarios';
const reconcile=(globalThis as any).__cinemaPopulationProbe;
assert.equal(typeof reconcile,'function','Run with the test-only instrumented audit runner');
const freeze=(value:any):any=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const child of Object.values(value))freeze(child);}return value;};
const fixture=makeCinemaMarketFixture(),first=simulateCinemaWeek(fixture);
const input=freeze({...fixture,absoluteWeek:fixture.absoluteWeek+1,marketState:first.nextState});
const prior=JSON.stringify(input),next=simulateCinemaWeek(input);
assert.equal(JSON.stringify(input),prior,'A public simulation must preserve its entire frozen input');
next.nextState.titles[0].cells[0].awarePeople++;
if(next.nextState.affinities[0])next.nextState.affinities[0].people++;
assert.equal(JSON.stringify(input),prior,'A caller changing the detached proposal must not mutate its source');

const cell=(id:string,aware:number,count:number,repeat:number)=>({cohortId:id,awarePeople:aware,deferredPeople:20,seenBands:[{people:count,repeatAdmissions:repeat,satisfaction:80,lastViewedWeek:1}]});
const source:any=freeze({absoluteWeek:3,cohorts:[{id:'shrinking',people:100},{id:'growing',people:120},{id:'legacy',people:40}],
 marketState:{schemaVersion:1,tuningVersion:fixture.tuningVersion,lastProcessedAbsoluteWeek:2,cohortPopulations:{shrinking:200,growing:100},
  titles:[{titleId:'old',ownerId:'studio',cast:[],releaseWeek:1,appliedExposureIds:['paid'],cells:[cell('shrinking',180,150,10),cell('growing',80,50,6),cell('legacy',60,30,7),cell('missing',70,40,2)]}],
  affinities:[{cohortId:'shrinking',kind:'ACTOR',id:'favorite',people:80,strength:75,lastWeek:1},{cohortId:'growing',kind:'STUDIO',id:'brand',people:30,strength:80,lastWeek:1}],runs:[]}});
const expected=structuredClone(source);
Object.assign(expected.marketState.titles[0].cells[0],{awarePeople:90,deferredPeople:10,seenBands:[{people:75,repeatAdmissions:5,satisfaction:80,lastViewedWeek:1}]});
Object.assign(expected.marketState.titles[0].cells[2],{awarePeople:40,deferredPeople:13,seenBands:[{people:20,repeatAdmissions:4,satisfaction:80,lastViewedWeek:1}]});
expected.marketState.affinities[0].people=40;
const native=globalThis.structuredClone;let fullMarketCopies=0;
globalThis.structuredClone=((v:any,...args:any[])=>{if(v===source.marketState)fullMarketCopies++;return (native as any)(v,...args);}) as typeof native;
let result:any;try{result=reconcile(source);}finally{globalThis.structuredClone=native;}
assert.deepEqual(result,expected,'Population reductions, legacy inference, repeat counts, metadata and growing/missing cohorts retain exact values');
assert.equal(source.marketState.titles[0].cells[0].seenBands[0].people,150);
assert.equal(fullMarketCopies,0,'Population reconciliation must not deep-copy the entire historical market before constructing a detached proposal');
console.log(JSON.stringify({passed:6,sourceImmutable:true,proposalDetached:true,exactPopulationScaling:true,wholeMarketCopies:fullMarketCopies}));
