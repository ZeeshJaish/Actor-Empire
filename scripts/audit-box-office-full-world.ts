import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { simulateCinemaWeek } from '../services/boxOffice/boxOfficeMarket';
import { CINEMA_AUDIENCE_PROFILE, CINEMA_MARKET_TUNING_VERSION } from '../services/boxOffice/boxOfficeProfiles';
import { quoteCinemaSupply } from '../services/boxOffice/boxOfficeSupply';
import { FULL_WORLD_CASES, FULL_WORLD_START, makeFullWorldFixture, type FullWorldCase } from './fixtures/boxOfficeFullWorld';
import type { CinemaWeekInput } from '../services/boxOffice/boxOfficeTypes';

const selected=process.env.CINEMA_FULL_CASES?.split(',') as FullWorldCase[]|undefined;
const executionCodeSha256=createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex');
const cases=selected||FULL_WORLD_CASES,seeds=Number(process.env.CINEMA_FULL_SEEDS||4),horizon=Number(process.env.CINEMA_FULL_HORIZON||104);
const out=process.env.CINEMA_FULL_OUTPUT||'/private/tmp/actor-distributor-booking-20261022/full-world.json';
const previous=process.env.CINEMA_FULL_RESUME==='1'&&existsSync(out)?JSON.parse(readFileSync(out,'utf8')):undefined;
if(previous){assert.equal(previous.executionCodeSha256,executionCodeSha256,'Cannot mix results from different executable source');assert.equal(previous.tuningVersion,CINEMA_MARKET_TUNING_VERSION);assert.deepEqual(previous.audienceProfile,CINEMA_AUDIENCE_PROFILE,'Cannot resume a report generated with different audience behavior');assert.equal(previous.seeds,seeds);assert.equal(previous.horizon,horizon);assert.equal(previous.kind,'CANONICAL_FULL_WORLD_CONTROLLED_SLATE')}
const rows:any[]=previous?.rows||[];
const quantiles=(xs:number[])=>{xs.sort((a,b)=>a-b);return {p10:xs[Math.floor((xs.length-1)*.1)],median:xs[Math.floor(xs.length/2)],p90:xs[Math.ceil((xs.length-1)*.9)]}};
const save=()=>writeFileSync(out,JSON.stringify({kind:'CANONICAL_FULL_WORLD_CONTROLLED_SLATE',executionCodeSha256,tuningVersion:CINEMA_MARKET_TUNING_VERSION,audienceProfile:CINEMA_AUDIENCE_PROFILE,seeds,horizon,rows,
    distributions:cases.filter(name=>rows.some(r=>r.name===name)).map(name=>({name,runs:rows.filter(r=>r.name===name).length,profitable:rows.filter(r=>r.name===name&&r.profitCents>0).length,censored:rows.filter(r=>r.name===name&&r.censored).length,
        metrics:Object.fromEntries(['grossCents','receiptsCents','profitCents','first','repeats','weeks','week95','openingCents','bookingCents'].map(k=>[k,quantiles(rows.filter(r=>r.name===name).map(r=>r[k]))]))})),
    limitations:['Conditional seeded films and authored NPC rotation, not player-wide hit probabilities','Canonical 197 countries and mixed cohorts; prior actual platform offers/customers/playback projected read-only','No forced maximum run; horizon survivors are censored','Platform resources/economy held at the controlled world baseline during each run; full engine/save progression is verified separately']},null,2));
for(const name of cases)for(let seed=0;seed<seeds;seed++){
    if(rows.some(row=>row.name===name&&row.seed===seed))continue;
    const fixture=makeFullWorldFixture(name,seed),original=fixture.input;
    assert.equal(original.countries!.length,197);assert.ok(original.cohorts.length>2_000);
    let input: CinemaWeekInput=original,grossCents=0,receiptsCents=0,bookingCents=0,first=0,repeats=0,openingCents=0,weeks=0,closed=false,offeredWeeks=0;
    const weekly:number[]=[],timings:number[]=[],retired=new Set<string>();
    const bookingEvidence:Array<{week:number;shows:number;bookedPools:number;commercialPools:number;quietPools:number;seats:number;admissions:number;occupancy:number}>=[];
    const seatsByPool=process.env.CINEMA_FULL_BOOKING_EVIDENCE==='1'?new Map(quoteCinemaSupply(original).pools.map(p=>[p.id,p.seatsPerShow])):undefined;
    for(let w=0;w<horizon;w++){
        input={...input,absoluteWeek:FULL_WORLD_START+w,titles:[original.titles[0],...fixture.slate.filter(t=>t.market!.releaseWeek<=FULL_WORLD_START+w&&!retired.has(t.id))]};
        if(process.env.CINEMA_FULL_PROGRESS&&w%5===0)console.log('WORLD_PROGRESS',name,seed,w,input.titles.length);
        const start=performance.now(),r=simulateCinemaWeek(input);timings.push(performance.now()-start);
        for(const t of r.titles)assert.equal(t.grossCents,t.producerReceiptsCents+t.exhibitorReceiptsCents+t.distributionDeductionsCents);
        for(const c of r.cohorts){assert.ok(c.spentCents<=c.walletCents);assert.ok(c.usedMinutes<=c.leisureMinutes)}
        for(const p of r.supply){assert.ok(p.admissions<=p.seats);assert.ok(p.usedScreenMinutes<=p.availableScreenMinutes)}
        const focal=r.titles.find(t=>t.titleId==='film')!;
        if(seatsByPool){
            const booked=r.exhibition!.filter(e=>e.titleId==='film'&&e.shows>0),runs=new Map(r.nextState.runs.filter(run=>run.titleId==='film').map(run=>[run.poolId,run]));
            const seats=booked.reduce((n,e)=>n+e.shows*seatsByPool.get(e.poolId)!,0),admissions=focal.firstAdmissions+focal.repeatAdmissions;
            bookingEvidence.push({week:w+1,shows:booked.reduce((n,e)=>n+e.shows,0),bookedPools:booked.length,
                commercialPools:booked.filter(e=>runs.get(e.poolId)!.quietWeeks===0).length,quietPools:booked.filter(e=>runs.get(e.poolId)!.quietWeeks>0).length,
                seats,admissions,occupancy:seats?admissions/seats:0});
        }
        grossCents+=focal.grossCents;receiptsCents+=focal.producerReceiptsCents;first+=focal.firstAdmissions;repeats+=focal.repeatAdmissions;
        bookingCents+=r.costEvents.filter(c=>c.titleId==='film').reduce((n,c)=>n+c.amountCents,0);
        if(!w)openingCents=focal.grossCents;
        weekly.push(focal.grossCents);weeks++;
        const runs=r.nextState.runs.filter(t=>t.titleId==='film');closed=runs.length>0&&runs.every(t=>t.closed);
        if(r.exhibition!.some(e=>e.titleId==='film'&&e.shows>0))offeredWeeks++;
        for(const t of r.titles){const local=r.nextState.runs.filter(run=>run.titleId===t.titleId);if(local.length&&local.every(run=>run.closed))retired.add(t.titleId)}
        input={...input,marketState:r.nextState};
        if(closed)break;
    }
    const campaignCents=(original.titles[0].exposure?.events||[]).reduce((n,e)=>n+(e.paidCostCents||0),0);
    let accumulated=0,week95=0;for(const [i,amount] of weekly.entries()){accumulated+=amount;if(grossCents>0&&accumulated>=grossCents*.95){week95=i+1;break}}
    const localRuns=input.marketState!.runs.filter(r=>r.titleId==='film');
    const row={name,seed,countries:197,cohorts:original.cohorts.length,homeAlternatives:original.streamingAlternatives?.length||0,budgetCents:original.titles[0].budgetCents,campaignCents,grossCents,receiptsCents,bookingCents,profitCents:receiptsCents-bookingCents-campaignCents-original.titles[0].budgetCents,first,repeats,openingCents,weeks,week95,offeredWeeks,censored:!closed,weekly,localRunWeeks:quantiles(localRuns.map(r=>(r.lastBookedWeek??input.absoluteWeek)-FULL_WORLD_START+1)),weekMs:quantiles(timings),...(seatsByPool?{bookingEvidence}:{})};
    rows.push(row);save();console.log(JSON.stringify({name,seed,grossM:Math.round(grossCents/1e6)/100,profitM:Math.round(row.profitCents/1e6)/100,weeks,week95,censored:!closed,homeAlternatives:row.homeAlternatives,medianWeekMs:row.weekMs.median}));
}
save();console.log(`Full-world calibration: ${rows.length} runs, ${rows.reduce((n,r)=>n+r.weeks,0)} focal title-weeks; ${out}`);
