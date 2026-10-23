import assert from 'node:assert/strict';
import {makeCinemaMarketFixture} from './fixtures/boxOfficeScenarios';
import {buildCinemaAudienceSnapshot} from '../services/boxOffice/boxOfficeAudience';
const input=makeCinemaMarketFixture('base',73);let countryReads=0;
const base=input.supply!.pools[0];
const pools=Array.from({length:50},(_,i)=>({...base,id:`pool-${i}`,ticketPriceCents:i%2?900:1200,get countryId(){countryReads++;return i%2?'CA':'US'}}));
input.supply={...input.supply!,pools,offers:pools.map(p=>({titleId:'film',poolId:p.id}))};
input.titles[0].market!.countryIds=['US','CA'];
input.cohorts=Array.from({length:100},(_,i)=>({...input.cohorts[0],id:`cohort-${i}`,countryId:i%2?'CA':'US'}));
const result=buildCinemaAudienceSnapshot(input);
assert.ok(result.choices.length>0);
for(const choice of result.choices){const country=input.cohorts.find(c=>c.id===choice.cohortId)!.countryId;assert.equal(choice.priceCents,country==='US'?1200:900,'A cheaper foreign pool must not change the local ticket price')}
assert.ok(countryReads<=500,`Static country supply should scale with pools plus cohorts, not scan all pools per cohort; reads=${countryReads}`);
console.log(JSON.stringify({status:'PASS',cohorts:100,pools:50,countryReads,choices:result.choices.length}));
