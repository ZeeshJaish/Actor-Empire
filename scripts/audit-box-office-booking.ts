import assert from 'node:assert/strict';
import { quoteCinemaSupply } from '../services/boxOffice/boxOfficeSupply';
import { simulateCinemaWeek } from '../services/boxOffice/boxOfficeMarket';
import { createWorldPopulationState } from '../services/worldEconomy/worldPopulation';
import { CINEMA_CHAINS } from '../services/cinemaChains';
import { planCinemaBookings } from '../services/boxOffice/boxOfficeBooking';
import { rebaseCinemaSavedState } from '../services/boxOffice/boxOfficeClock';
import { makeCinemaMarketFixture } from './fixtures/boxOfficeScenarios';
import type { CinemaWeekInput } from '../services/boxOffice/boxOfficeTypes';

let passed=0, failed=0;
const test=(name:string,run:()=>void)=>{try{run();passed++;console.log(`PASS ${name}`)}catch(e){failed++;console.error(`FAIL ${name}: ${(e as Error).message}`)}};
const screens=(input:CinemaWeekInput)=>quoteCinemaSupply(input).pools.filter(p=>p.countryId==='US').map(p=>[p.id,p.screens]);

test('partial country inputs cannot inherit absent countries screens',()=>{
    const partial=makeCinemaMarketFixture();delete partial.supply;
    const full=structuredClone(partial),pop=createWorldPopulationState(100);
    full.countries=Object.values(pop.countries).map(c=>({id:c.id,regionId:c.regionId,population:c.population,cinemaAccess:c.cinemaAccessPercent,purchasingPower:90,inflation:10,languages:c.languages}));
    assert.deepEqual(screens(partial),screens(full));
});
test('standard distributor revenue-share exhibition does not charge producers per show',()=>{
 const f=makeCinemaMarketFixture();delete f.supply;
 const q=quoteCinemaSupply(f);
 assert.ok(q.pools.length>0);
 assert.ok(q.pools.every(p=>p.bookingCentsPerShow===0),'Standard exhibition is paid through the cinema share');
 const result=simulateCinemaWeek(f);
 assert.ok(result.exhibition!.some(e=>e.shows>0));
 assert.equal(result.costEvents.reduce((n,c)=>n+c.amountCents,0),0);
});
test('a booked paid-show agreement retains its price when the next supply quote changes',()=>{
 const f=makeCinemaMarketFixture();f.supply!.pools[0].bookingCentsPerShow=100;
 const first=simulateCinemaWeek(f);
 const next=structuredClone(f);next.absoluteWeek++;next.marketState=first.nextState;
 next.supply!.pools[0].bookingCentsPerShow=0;
 const second=simulateCinemaWeek(next),shows=second.exhibition!.filter(e=>e.shows>0).reduce((n,e)=>n+e.shows,0);
 assert.ok(shows>0);
 assert.equal(second.costEvents.reduce((n,c)=>n+c.amountCents,0),shows*100,'A live quote cannot erase a signed booking obligation');
});
test('existing physical screens do not move with weekly population access or seed',()=>{
    const a=makeCinemaMarketFixture();delete a.supply;
    a.countries=[...a.countries!,{...a.countries![0],id:'CA',population:500_000}];
    const b=structuredClone(a);b.seed=999;b.absoluteWeek+=17;b.countries=b.countries!.map(c=>({...c,population:c.id==='US'?9_000:900_000_000,cinemaAccess:c.id==='US'?3:98}));
    assert.deepEqual(screens(a),screens(b));
});
test('complete world preserves every existing chain regional screen total',()=>{
    const f=makeCinemaMarketFixture(),pop=createWorldPopulationState(100);
    f.countries=Object.values(pop.countries).map(c=>({id:c.id,regionId:c.regionId,population:c.population,cinemaAccess:c.cinemaAccessPercent,purchasingPower:90,inflation:10,languages:c.languages}));delete f.supply;
    const q=quoteCinemaSupply(f);
    for(const chain of CINEMA_CHAINS)for(const [region,terms] of Object.entries(chain.regionalTerms))
        assert.equal(q.pools.filter(p=>p.chainId===chain.id&&f.countries!.find(c=>c.id===p.countryId)!.regionId===region).reduce((n,p)=>n+p.screens,0),terms.screens);
});
test('automatic prices still respond to country economy independently of footprint',()=>{
    const f=makeCinemaMarketFixture();delete f.supply;const before=quoteCinemaSupply(f);
    f.countries=f.countries!.map(c=>({...c,purchasingPower:20}));const after=quoteCinemaSupply(f);
    assert.deepEqual(before.pools.map(p=>p.screens),after.pools.map(p=>p.screens));
    assert.ok(after.pools.every((p,i)=>p.ticketPriceCents<before.pools[i].ticketPriceCents));
});
test('repeated unviable exhibition ends without waiting for a tiny absolute ticket threshold',()=>{
    let f=makeCinemaMarketFixture();
    // This counterfactual operator has prohibitive marginal exhibition costs.
    // They are a booking signal, never a second producer debit.
    Object.assign(f.supply!.pools[0],{operatingCentsPerShow:1_000_000_000});
    let closed=false;
    for(let w=0;w<9;w++){
        const r=simulateCinemaWeek(f);closed=r.nextState.runs.every(run=>run.closed);
        assert.ok(r.costEvents.every(c=>c.category==='BOOKING_COST'));
        f={...f,absoluteWeek:f.absoluteWeek+1,marketState:r.nextState};
        if(closed)break;
    }
    assert.ok(closed,'continuing sold tickets alone do not justify unviable bookings');
});
test('opening shows use public package expectations instead of secret final delivery',()=>{
    const a=makeCinemaMarketFixture('earned-event'),b=structuredClone(a);
    a.titles[0].delivery.deliveredQuality=98;b.titles[0].delivery.deliveredQuality=5;
    a.titles[0].market!.payoff=98;b.titles[0].market!.payoff=5;
    assert.deepEqual(simulateCinemaWeek(a).exhibition,simulateCinemaWeek(b).exhibition);
});
test('booking observations are retained for renewal and have no owner preference',()=>{
    const f=makeCinemaMarketFixture(),r=simulateCinemaWeek(f),run=r.nextState.runs[0] as typeof r.nextState.runs[0]&{lastShows?:number;lastAdmissions?:number;lastBookedWeek?:number};
    assert.equal(run.lastShows,r.exhibition![0].shows);assert.equal(run.lastAdmissions,r.titles[0].firstAdmissions+r.titles[0].repeatAdmissions);assert.equal(run.lastBookedWeek,f.absoluteWeek);
    for(const route of ['ACCEPTED_ROLE','NPC_STUDIO'] as const){const other=structuredClone(f);other.titles[0].owner.route=route;assert.deepEqual(simulateCinemaWeek(other).exhibition,r.exhibition)}
});
test('a tiny residual audience cannot keep a full scheduled screen indefinitely',()=>{
    let f=makeCinemaMarketFixture('satisfied-repeat');f.titles[0].market!.releaseWeek=75;
    f.marketState!.titles[0].releaseWeek=75;
    f.marketState!.titles[0].cells[0].awarePeople=1_000;
    f.marketState!.titles[0].cells[0].seenBands[0].people=1_000;
    f.marketState!.titles[0].cells[0].discoveryContactsUsed=10_000;
    let closed=false;
    for(let w=0;w<8;w++){const r=simulateCinemaWeek(f);closed=r.nextState.runs.every(run=>run.closed);f={...f,absoluteWeek:f.absoluteWeek+1,marketState:r.nextState};if(closed)break}
    assert.ok(closed);
});
test('a previously weak run stays open when viable demand is denied screen time',()=>{
    const f=makeCinemaMarketFixture();f.titles[0].market!.releaseWeek=98;
    f.marketState!.runs=[{titleId:'film',poolId:f.supply!.pools[0].id,quietWeeks:2,closed:false}];
    f.supply!.pools[0].screens=1;f.supply!.pools[0].weeklyScreenMinutes=0;
    assert.equal(simulateCinemaWeek(f).nextState.runs[0].closed,false);
});
test('real screen-day packing retains each feasible minimum before expansion',()=>{
    const pool=makeCinemaMarketFixture().supply!.pools[0];pool.screens=1;pool.weeklyScreenMinutes=5040;
    for(const minutes of [145,265]){
        const r=planCinemaBookings(pool,['a','b'].map(id=>({id,demand:10_000,minutes,discovery:false})),13,100);
        assert.ok([...r.shows.values()].every(n=>n>=7));
    }
});
test('secret script accessibility cannot change an unviewed crossover opening',()=>{
    const a=makeCinemaMarketFixture('earned-event'),b=structuredClone(a);
    a.titles[0].market!.accessibility=95;b.titles[0].market!.accessibility=5;
    assert.deepEqual(simulateCinemaWeek(a).exhibition,simulateCinemaWeek(b).exhibition);
});
test('succession rebases booking observations while historical receipt identities stay frozen',()=>{
    const f=makeCinemaMarketFixture(),r=simulateCinemaWeek(f);
    const state={schemaVersion:1,clockEpoch:0,activationWeek:100,lastProcessedAbsoluteWeek:100,titles:{},market:r.nextState,weeks:[{id:'paid-original',absoluteWeek:100}]};
    const next=rebaseCinemaSavedState(state as never,-20);
    assert.equal(next.market.runs[0].lastBookedWeek,80);assert.deepEqual(next.weeks,state.weeks);
});
console.log(`Booking audit: ${passed} passed, ${failed} failed`);if(failed)process.exitCode=1;
