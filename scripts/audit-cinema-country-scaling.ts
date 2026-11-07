import assert from 'node:assert/strict';
import {makeCinemaMarketFixture} from './fixtures/boxOfficeScenarios';
import {simulateCinemaWeek} from '../services/boxOffice/boxOfficeMarket';
import {simulateIssuedCinemaWeek} from './fixtures/issuedCinemaMarket';
const f=makeCinemaMarketFixture(),base=structuredClone(f);
f.countries=Array.from({length:24},(_,i)=>({...base.countries[0],id:'R'+i,population:4e6}));
f.cohorts=f.countries.flatMap(c=>Array.from({length:4},(_,i)=>({...structuredClone(base.cohorts[0]),id:c.id+':cohort-'+i,countryId:c.id})));
f.titles=Array.from({length:3},(_,i)=>({...structuredClone(base.titles[0]),id:'title-'+i,market:{...structuredClone(base.titles[0].market!),countryIds:f.countries.map(c=>c.id)},exposure:{...structuredClone(base.titles[0].exposure!),events:base.titles[0].exposure!.events.map(e=>({...e,id:e.id+i,titleId:'title-'+i}))}}));
f.supply={pools:f.countries.map(c=>({...structuredClone(base.supply!.pools[0]),id:c.id+':pool',countryId:c.id})),offers:f.countries.flatMap(c=>f.titles.map(t=>({poolId:c.id+':pool',titleId:t.id})))};
const expected=simulateIssuedCinemaWeek(f),ids=new Set(f.cohorts.map(c=>c.id)),original=Set.prototype.has;let checks=0;
let actual:ReturnType<typeof simulateCinemaWeek>;
try{Set.prototype.has=function(value){if(original.call(ids,value))checks++;return original.call(this,value)};actual=simulateCinemaWeek(f)}finally{Set.prototype.has=original}
assert.deepEqual(actual!,expected,'Whole market output, country signals, money, audience history and receipt identity must remain exact');
assert.ok(checks<=f.cohorts.length*f.titles.length*5,'Country audience reports should not scan every cell for every country; cohort membership checks='+checks);
console.log(JSON.stringify({passed:2,countries:f.countries.length,cohorts:f.cohorts.length,membershipChecks:checks,exactParity:true}));
