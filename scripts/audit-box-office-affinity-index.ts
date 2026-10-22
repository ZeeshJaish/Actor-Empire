import assert from 'node:assert/strict';
import {buildCinemaAudienceSnapshot} from '../services/boxOffice/boxOfficeAudience';
import {makeCinemaMarketFixture} from './fixtures/boxOfficeScenarios';

// Break caught: every cohort/cast member scanning every country's accumulated
// favorites turns an ordinary earned career into quadratic weekly work.
const input=makeCinemaMarketFixture('unearned-event'),base=input.cohorts[0];
input.cohorts=Array.from({length:200},(_,i)=>({...structuredClone(base),id:`cohort-${i}`}));
let inspected=0;
input.marketState!.affinities=input.cohorts.flatMap((c,i)=>Array.from({length:48},(_,j)=>({
    get cohortId(){inspected++;return c.id},
    kind:'ACTOR' as const,id:j===0?'actor-a':`unrelated-${j}`,people:300_000,strength:i===0?95:0,lastWeek:70,
})));
const first=buildCinemaAudienceSnapshot(input).choices.filter(c=>c.kind==='FIRST');
assert.ok(first.find(c=>c.cohortId==='cohort-0')!.attachment>.2);
assert.equal(first.find(c=>c.cohortId==='cohort-1')!.attachment,0,'A different cohort must not inherit the favorite');
assert.ok(inspected<300_000,`Bounded per-cohort work required: inspected ${inspected} affinity identities for 9,600 rows`);
console.log(`PASS scoped earned affinity lookup, ${inspected} identity reads for 9,600 rows / 200 cohorts`);
