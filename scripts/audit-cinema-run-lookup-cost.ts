import assert from 'node:assert/strict';
import {makeCinemaMarketFixture} from './fixtures/boxOfficeScenarios';
import {simulateCinemaWeek} from '../services/boxOffice/boxOfficeMarket';
const input=makeCinemaMarketFixture('base',99);let titleReads=0;
const pool=input.supply!.pools[0];
input.supply!.pools=Array.from({length:50},(_,i)=>({...pool,id:`US:pool-${i}`}));
input.supply!.offers=input.supply!.pools.map(p=>({titleId:'film',poolId:p.id}));
const active={titleId:'film',poolId:'US:pool-0',quietWeeks:0,bookingCentsPerShow:17,lastBookedWeek:99,lastShows:1,lastAdmissions:1,closed:false};
const stale=Array.from({length:1000},(_,i)=>({get titleId(){titleReads++;return `archived-${i}`},poolId:`old-pool-${i}`,quietWeeks:3,lastBookedWeek:80,lastShows:0,lastAdmissions:0,closed:true}));
input.marketState!.runs=[active,...stale];
let runChecks=0;
const originalFind=Array.prototype.find,originalSome=Array.prototype.some;
const instrument=(original:any)=>function(this:any[],predicate:any,thisArg:any){return original.call(this,(value:any,index:number,array:any[])=>{if(value&&typeof value==='object'&&'quietWeeks' in value&&'poolId' in value)runChecks++;return predicate.call(thisArg,value,index,array)})};
Array.prototype.find=instrument(originalFind) as any;Array.prototype.some=instrument(originalSome) as any;
let result;
try{result=simulateCinemaWeek(input)}finally{Array.prototype.find=originalFind;Array.prototype.some=originalSome}

const clean=structuredClone(input);clean.marketState!.runs=[structuredClone(active)];
const expected=simulateCinemaWeek(clean);
assert.deepEqual(result.titles,expected.titles,'Archived runs must not change current tickets or receipts');
assert.deepEqual(result.costEvents,expected.costEvents,'First saved booking contract must retain its rate');
assert.ok(result.costEvents.some(c=>c.poolId==='US:pool-0'&&c.amountCents>0));
assert.equal(result.nextState.runs.filter(r=>r.titleId==='film'&&r.poolId==='US:pool-0').length,1);
// Copying and validating history is linear. Re-scanning 1000 old titles for
// each of 50 current offers is an avoidable late-save performance regression.
assert.ok(runChecks<10000,`Archived run searches must not repeat for every current offer; got ${runChecks}`);
const closed=makeCinemaMarketFixture('base',99);closed.marketState!.runs=[{...active,poolId:closed.supply!.pools[0].id,closed:true}];
assert.equal(simulateCinemaWeek(closed).titles[0].grossCents,0,'A closed local run cannot reopen or pay again');
console.log(JSON.stringify({status:'PASS',titleReads,runChecks,archived:1000,currentPools:50}));
