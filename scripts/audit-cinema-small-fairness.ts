import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {simulateCinemaWeek} from '../services/boxOffice/boxOfficeMarket';
import {makeFullWorldFixture,FULL_WORLD_START} from './fixtures/boxOfficeFullWorld';
import {CINEMA_CHAINS} from '../services/cinemaChains';
const output=process.env.CINEMA_SMALL_OUTPUT||'/private/tmp/actor-cinema-closeout-20261023/small-fairness.json';
const hash=createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex');
const rows:any[]=[],seeds=[0,1,2],horizon=104;
const definitions=[...([30,65,90] as const).flatMap(quality=>[.05,.5,2].map(campaignM=>({name:`q${quality}-campaign${campaignM}`,quality,campaignM,wide:false,peak:false}))),
 {name:'q90-wide',quality:90,campaignM:.5,wide:true,peak:false},{name:'q90-peak',quality:90,campaignM:.5,wide:false,peak:true}];
const save=()=>writeFileSync(output,JSON.stringify({kind:'MATCHED_SMALL_FILM_AUDIENCE_COST_SENSITIVITY',executionCodeSha256:hash,seeds,horizon,rows,
 limitations:['Controlled no-star DRAMA packages, not population-wide hit rates','Budget views hold audience/craft/exposure fixed; higher budget creates no audience entitlement','Unfinished runs censored, never forcibly closed','Existing 197-country population, economy, rival slate and streaming alternatives; isolated kernel, not full weekly world evolution']},null,2));
for(const seed of seeds)for(const d of definitions){
 const fixture=makeFullWorldFixture(d.peak?'peak-release':'focused-small',seed),initial=fixture.input,title=initial.titles[0];
 title.delivery.deliveredQuality=d.quality;title.delivery.estimatedQuality=70;title.delivery.scriptQuality=d.quality;title.delivery.directorQuality=d.quality;title.delivery.castingStrength=d.quality;
 title.market!.payoff=d.quality;title.market!.accessibility=75;
 if(d.wide){title.market!.countryIds=initial.countries!.map(c=>c.id);title.market!.chainIds=CINEMA_CHAINS.map(c=>c.id)}
 const original=title.exposure!.events[0],noise=original.impressions/15e6;
 title.exposure!.events=[{...original,impressions:Math.round(d.campaignM*1e6*30*noise),paidCostCents:Math.round(d.campaignM*1e8)}];
 // Budget alone cannot buy audiences at fixed delivered craft, paid exposure and capacity.
 const opening=[2,10,25].map(budgetM=>simulateCinemaWeek({...initial,titles:[{...title,budgetCents:budgetM*1e8},...fixture.slate.filter(t=>t.market!.releaseWeek<=FULL_WORLD_START)]}));
 for(const r of opening.slice(1))assert.deepEqual(r.titles.find(t=>t.titleId==='film'),opening[0].titles.find(t=>t.titleId==='film'));
 let input=initial,gross=0,receipts=0,bookings=0,first=0,repeats=0,closed=false;const weekly:number[]=[],retired=new Set<string>();
 for(let w=0;w<horizon;w++){
  input={...input,absoluteWeek:FULL_WORLD_START+w,titles:[title,...fixture.slate.filter(t=>t.market!.releaseWeek<=FULL_WORLD_START+w&&!retired.has(t.id))]};
  const r=simulateCinemaWeek(input),paid=r.titles.find(t=>t.titleId==='film')!;
  for(const t of r.titles)assert.equal(t.grossCents,t.producerReceiptsCents+t.exhibitorReceiptsCents+t.distributionDeductionsCents);
  for(const c of r.cohorts){assert.ok(c.spentCents<=c.walletCents);assert.ok(c.usedMinutes<=c.leisureMinutes)}
  for(const s of r.supply){assert.ok(s.admissions<=s.seats);assert.ok(s.usedScreenMinutes<=s.availableScreenMinutes)}
  gross+=paid.grossCents;receipts+=paid.producerReceiptsCents;first+=paid.firstAdmissions;repeats+=paid.repeatAdmissions;
  bookings+=r.costEvents.filter(x=>x.titleId==='film').reduce((n,x)=>n+x.amountCents,0);weekly.push(paid.grossCents);
  for(const t of r.titles){const local=r.nextState.runs.filter(x=>x.titleId===t.titleId);if(local.length&&local.every(x=>x.closed))retired.add(t.titleId)}
  input={...input,marketState:r.nextState};closed=retired.has('film');if(closed)break;
 }
 let sum=0,week95:number|null=null;weekly.forEach((g,i)=>{sum+=g;if(week95===null&&gross>0&&sum>=gross*.95)week95=i+1});
 const row={seed,...d,grossCents:gross,receiptsCents:receipts,bookingCents:bookings,first,repeats,weeks:weekly.length,week95,censored:!closed,
  budgetViews:[2,10,25].map(budgetM=>({budgetM,profitCents:receipts-bookings-Math.round((budgetM+d.campaignM)*1e8)}))};
 rows.push(row);save();console.log(JSON.stringify({seed,name:d.name,grossM:gross/1e8,weeks:weekly.length,peakRssMiB:process.resourceUsage().maxRSS/1024}));
}
for(const seed of seeds){
 const select=(name:string)=>rows.find(r=>r.seed===seed&&r.name===name)!;
 const narrow=select('q90-campaign0.5'),wide=select('q90-wide');
 for(const key of ['grossCents','receiptsCents','first','repeats'])assert.equal(narrow[key],wide[key],`Unused worldwide access must not mint ${key}`);
 for(const campaign of [.05,.5,2])assert.ok(select(`q90-campaign${campaign}`).grossCents>select(`q30-campaign${campaign}`).grossCents,'Better matched delivery must improve paid result');
}
save();console.log('PASS matched small-film quality, marketing, budget and unused worldwide-access checks');
