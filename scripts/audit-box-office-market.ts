import assert from 'node:assert/strict';
import { runCinemaWorldShadowAudit } from './fixtures/boxOfficeWorldShadow';
import { allocateCinemaResources, cinemaWeeklyWallet } from '../services/boxOffice/boxOfficeMath';
import { buildCinemaChoices } from '../services/boxOffice/boxOfficeAudience';
import { quoteCinemaSupply } from '../services/boxOffice/boxOfficeSupply';
import { simulateCinemaWeek } from '../services/boxOffice/boxOfficeMarket';
import { makeCinemaMarketFixture as fixture } from './fixtures/boxOfficeScenarios';
import type { CinemaWeekInput, CinemaWeekResult } from '../services/boxOffice/boxOfficeTypes';
let passed=0;
const test=(name:string,run:()=>void)=>{run();passed++;console.log(`PASS ${name}`)};
const admissions=(r:CinemaWeekResult)=>r.titles.reduce((n,t)=>n+t.firstAdmissions+t.repeatAdmissions,0);
const valid=(f:CinemaWeekInput,r:CinemaWeekResult)=>{
  const choices=buildCinemaChoices({...f,supply:f.supply || quoteCinemaSupply(f)});
  for(const choice of choices.filter(c=>c.kind!=='DEFER')){
    const sold=r.allocations.filter(a=>a.titleId===choice.titleId && a.cohortId===choice.cohortId && a.kind===choice.kind).reduce((n,a)=>n+a.admissions,0);
    assert.ok(sold<=choice.requestedAdmissions);assert.ok(sold<=(choice.kind==='FIRST'?choice.reachableUnseenPeople:choice.repeatEligiblePeople));
  }
  for(const c of r.cohorts){assert.ok(c.spentCents<=c.walletCents);assert.equal(c.unspentCents+c.spentCents,c.walletCents);assert.ok(c.usedMinutes<=c.leisureMinutes)}
  for(const p of r.supply){assert.ok(p.admissions<=p.seats);assert.ok(p.usedScreenMinutes<=p.availableScreenMinutes)}
  for(const t of r.titles){assert.equal(t.grossCents,t.producerReceiptsCents+t.exhibitorReceiptsCents+t.distributionDeductionsCents);assert.ok(Number.isSafeInteger(t.grossCents));
    const cells=r.nextState.titles.find(s=>s.titleId===t.titleId)!.cells;for(const c of cells)assert.ok(c.seenBands.reduce((n,b)=>n+b.people,0)<=f.cohorts.find(x=>x.id===c.cohortId)!.people)}
};
test('paid first tickets produce conserved gross and proposed history',()=>{const f=fixture(),r=simulateCinemaWeek(f);assert.ok(admissions(r)>0);assert.ok(r.titles[0].grossCents>0);valid(f,r)});
test('zero-exposure worldwide release produces zero sales',()=>{const f=fixture('no-exposure');const r=simulateCinemaWeek(f);assert.equal(admissions(r),0);assert.equal(r.titles[0].grossCents,0)});
test('extra nonbinding same-price screens do not create intent',()=>{const f=fixture(),base=simulateCinemaWeek(f);const wide=structuredClone(f);wide.supply!.pools.push({...wide.supply!.pools[0],id:'US:Z_CINEMAS:STANDARD',chainId:'Z_CINEMAS'});wide.supply!.offers.push({titleId:'film',poolId:'US:Z_CINEMAS:STANDARD'});wide.titles[0].market!.chainIds=['NOVA_CIRCUIT','Z_CINEMAS'];assert.equal(admissions(simulateCinemaWeek(wide)),admissions(base))});
test('scarce wallet limits the entire competing slate',()=>{const f=fixture();f.cohorts[0].market!.monthlyCinemaBudgetCents=20_000_000;const t=structuredClone(f.titles[0]);t.id='rival';t.owner={id:'npc',route:'NPC_STUDIO'};t.exposure!.events=t.exposure!.events.map(e=>({...e,id:'rival-press',titleId:'rival'}));f.titles=[...f.titles,t];f.supply!.offers.push({titleId:'rival',poolId:f.supply!.pools[0].id});const r=simulateCinemaWeek(f);valid(f,r);assert.ok(r.titles.every(t=>t.firstAdmissions>0));assert.ok(r.cohorts[0].spentCents<=4_615_385)});
test('shared screen capacity is not duplicated for each title',()=>{const f=fixture();f.supply!.pools[0].screens=1;f.supply!.pools[0].weeklyScreenMinutes=5040;const t=structuredClone(f.titles[0]);t.id='rival';t.exposure!.events=t.exposure!.events.map(e=>({...e,id:'rival-press',titleId:'rival'}));f.titles=[...f.titles,t];f.supply!.offers.push({titleId:'rival',poolId:f.supply!.pools[0].id});const r=simulateCinemaWeek(f);valid(f,r);assert.ok(admissions(r)<=34*180);assert.ok(r.titles.every(t=>t.firstAdmissions>0))});
test('repeat admissions pay for fresh seats and time without resetting unique viewers',()=>{const f=fixture('satisfied-repeat'),r=simulateCinemaWeek(f);assert.ok(r.titles[0].repeatAdmissions>0);assert.equal(r.nextState.titles[0].cells[0].seenBands.reduce((n,b)=>n+b.people,0),100_000+r.titles[0].firstAdmissions);assert.equal(r.cohorts[0].spentCents,admissions(r)*1000);valid(f,r)});
test('long runtime reduces admissions under binding physical capacity',()=>{const f=fixture();f.supply!.pools[0].screens=1;f.supply!.pools[0].weeklyScreenMinutes=5040;const before=admissions(simulateCinemaWeek(f));f.titles[0].market!.runtimeMinutes=240;assert.ok(admissions(simulateCinemaWeek(f))<before)});
test('shared leisure envelope limits first and repeats together',()=>{const f=fixture('satisfied-repeat');f.cohorts[0].market!.weeklyLeisureMinutes=1600;const r=simulateCinemaWeek(f);assert.ok(admissions(r)<=10);valid(f,r)});
test('no cinema allocation cannot borrow streaming money',()=>{const f=fixture();f.cohorts[0].market!.monthlyCinemaBudgetCents=0;assert.equal(admissions(simulateCinemaWeek(f)),0)});
test('cohort and title iteration cannot prefer an owner route',()=>{const f=fixture();const t=structuredClone(f.titles[0]);t.id='rival';t.owner={id:'npc',route:'NPC_STUDIO'};t.exposure!.events=t.exposure!.events.map(e=>({...e,id:'rival-press',titleId:'rival'}));f.titles=[...f.titles,t];f.supply!.offers.push({titleId:'rival',poolId:f.supply!.pools[0].id});const a=simulateCinemaWeek(f);const reordered={...f,titles:[...f.titles].reverse(),cohorts:[...f.cohorts].reverse(),supply:{pools:[...f.supply!.pools].reverse(),offers:[...f.supply!.offers].reverse()}};assert.deepEqual(simulateCinemaWeek(reordered),a)});
test('price and country supply come from economy and shared chain footprint',()=>{const f=fixture();delete f.supply;const q=quoteCinemaSupply(f);assert.ok(q.pools.length>0);assert.ok(q.pools.every(p=>p.ticketPriceCents>0));const before=q.pools.find(p=>p.chainId==='NOVA_CIRCUIT'&&p.format==='STANDARD')!.ticketPriceCents;f.countries![0].purchasingPower=20;assert.ok(quoteCinemaSupply(f).pools.find(p=>p.chainId==='NOVA_CIRCUIT'&&p.format==='STANDARD')!.ticketPriceCents<before)});
test('wide release pays wider launch costs without guaranteed sales',()=>{const f=fixture('no-exposure');delete f.supply;const narrow=simulateCinemaWeek(f);f.titles[0].market!.chainIds=['NOVA_CIRCUIT','Z_CINEMAS','EMPIRE_CINEMAS'];const wide=simulateCinemaWeek(f);assert.equal(admissions(wide),0);assert.ok(wide.costEvents.reduce((n,e)=>n+e.amountCents,0)>narrow.costEvents.reduce((n,e)=>n+e.amountCents,0))});
test('shadow simulation leaves its complete input untouched',()=>{const f=fixture(),before=structuredClone(f);const r=simulateCinemaWeek(f);assert.equal(r.mode,'SHADOW');assert.ok(r.inputFingerprint);assert.deepEqual(f,before)});
test('same week state cannot generate a second shadow payment proposal',()=>{const f=fixture(),r=simulateCinemaWeek(f);assert.throws(()=>simulateCinemaWeek({...f,marketState:r.nextState}),/week|already/i)});
test('replayed publicity cannot mint a second aware audience',()=>{const f=fixture(),a=simulateCinemaWeek(f);const next={...f,absoluteWeek:101,marketState:a.nextState};const b=simulateCinemaWeek(next);assert.ok(b.nextState.titles[0].cells[0].awarePeople<=a.nextState.titles[0].cells[0].awarePeople+admissions(a)*1.8);assert.ok(b.nextState.titles[0].appliedExposureIds.includes('press'))});
test('natural quiet runs end after bounded discovery grace',()=>{const f=fixture('no-exposure');for(let i=0;i<10;i++){const r=simulateCinemaWeek(f);f.marketState=r.nextState;f.absoluteWeek++}assert.ok(f.marketState!.runs.every(r=>r.closed));assert.equal(simulateCinemaWeek(f).costEvents.length,0)});
test('seeded owner routes obey the same population money time and seat invariants',()=>{for(let seed=1;seed<=30;seed++){const f=fixture(seed%2?'satisfied-repeat':'base',seed);f.titles[0].owner.route=['PLAYER_STUDIO','ACCEPTED_ROLE','NPC_STUDIO'][seed%3] as never;f.cohorts[0].market!.monthlyCinemaBudgetCents=seed*109_763;f.cohorts[0].market!.weeklyLeisureMinutes=seed*1091;f.supply!.pools[0].screens=1;f.supply!.pools[0].weeklyScreenMinutes=5040;valid(f,simulateCinemaWeek(f))}});
test('weekly cinema cents conserve twelve monthly envelopes over a year',()=>{let total=0;for(let week=0;week<52;week++)total+=cinemaWeeklyWallet(32101,week);assert.equal(total,385212)});
test('weak observed word of mouth reduces remaining first-time intent',()=>{
  const good=fixture('satisfied-repeat'),weak=fixture('weak-repeat');good.marketState!.titles[0].cells[0].lastDiscoveryWeek=100;weak.marketState!.titles[0].cells[0].lastDiscoveryWeek=100;good.marketState!.titles[0].cells[0].awarePeople=300000;weak.marketState!.titles[0].cells[0].awarePeople=300000;assert.ok(buildCinemaChoices(weak).find(r=>r.kind==='FIRST')!.requestedAdmissions<buildCinemaChoices(good).find(r=>r.kind==='FIRST')!.requestedAdmissions*.7);
});
test('sold-out interest remains deferred and agrees with title totals',()=>{
  const f=fixture();f.supply!.pools[0].screens=0;f.supply!.pools[0].weeklyScreenMinutes=0;
  const intent=buildCinemaChoices(f).find(r=>r.kind==='FIRST')!.interestedPeople,r=simulateCinemaWeek(f),cell=r.nextState.titles[0].cells[0];
  assert.ok(cell.deferredPeople>=intent);assert.equal(r.titles[0].deferredPeople,cell.deferredPeople);
});
test('all owner routes receive identical economic treatment',()=>{
  const f=fixture(),a=simulateCinemaWeek(f).titles[0];for(const route of ['ACCEPTED_ROLE','NPC_STUDIO'] as const){f.titles[0].owner.route=route;assert.deepEqual(simulateCinemaWeek(f).titles[0],a)}
});
test('duplicate IDs and invalid physical resources fail before allocation',()=>{
  const f=fixture();assert.throws(()=>simulateCinemaWeek({...f,titles:[...f.titles,...f.titles]}),/identity/);
  f.supply!.pools[0].weeklyScreenMinutes=-1;assert.throws(()=>simulateCinemaWeek(f),/Invalid/);
});
test('saturated seen population has no new first viewers',()=>{
  const f=fixture('satisfied-repeat');const cell=f.marketState!.titles[0].cells[0];cell.awarePeople=1_000_000;cell.seenBands[0].people=1_000_000;const r=simulateCinemaWeek(f);assert.equal(r.titles[0].firstAdmissions,0);assert.ok(r.titles[0].repeatAdmissions>0);valid(f,r);
});
test('idle budgets stay unspent rather than forcing purchases',()=>{const f=fixture('no-exposure'),r=simulateCinemaWeek(f);assert.equal(r.cohorts[0].unspentCents,r.cohorts[0].walletCents)});
test('unaffordable competing request cannot strand feasible funded demand',()=>{
  const got=allocateCinemaResources([{id:'cheap',wanted:1000,units:[1]},{id:'expensive',wanted:1,units:[1000000]}],[1000],1,100);
  assert.equal(got.get('cheap'),1000);assert.equal(got.get('expensive'),0);
});
test('physical denial cannot permanently close a film never given a show',()=>{
  const f=fixture();f.supply!.pools[0].screens=1;f.supply!.pools[0].weeklyScreenMinutes=145;
  f.titles=Array.from({length:8},(_,i)=>{const t=structuredClone(f.titles[0]);t.id=`film-${i}`;t.exposure!.events=t.exposure!.events.map(e=>({...e,id:`press-${i}`,titleId:t.id}));return t});
  f.supply!.offers=f.titles.map(t=>({titleId:t.id,poolId:f.supply!.pools[0].id}));
  for(let i=0;i<8;i++){const r=simulateCinemaWeek(f);assert.ok(r.nextState.runs.every(run=>!run.closed));f.marketState=r.nextState;f.absoluteWeek++}
});
test('archiving the same history is independent of state iteration order',()=>{
  const f=fixture('satisfied-repeat');f.absoluteWeek=300;f.titles=[];f.supply!.offers=[];
  const a=f.marketState!.titles[0],b=structuredClone(a);a.releaseWeek=1;a.titleId='old-a';a.cells[0].seenBands[0].satisfaction=100;b.releaseWeek=1;b.titleId='old-b';b.cells[0].seenBands[0].satisfaction=0;
  f.marketState!.titles=[a,b];f.marketState!.affinities=[{cohortId:'US:audience',kind:'ACTOR',id:'actor-a',people:100000,strength:25,lastWeek:90}];
  const result=simulateCinemaWeek(f);f.marketState!.titles.reverse();assert.deepEqual(simulateCinemaWeek(f),result);
});
test('inactive title deferred interest keeps decaying across omitted weeks',()=>{
  const f=fixture('satisfied-repeat'),title=structuredClone(f.titles[0]);f.marketState!.titles[0].cells[0].deferredPeople=100000;f.titles=[];f.supply!.offers=[];
  for(let i=0;i<10;i++){const r=simulateCinemaWeek(f);f.marketState=r.nextState;f.absoluteWeek++}
  f.titles=[title];const r=simulateCinemaWeek(f);assert.ok(r.nextState.titles[0].cells[0].deferredPeople<9000);
});
test('screen-denied intent releases wallet to another willing film',()=>{
  const f=fixture();f.cohorts[0].market!.monthlyCinemaBudgetCents=20000000;const t=structuredClone(f.titles[0]);t.id='other';t.market!.chainIds=['Z_CINEMAS'];t.exposure!.events=t.exposure!.events.map(e=>({...e,id:'other-press',titleId:'other'}));f.titles=[...f.titles,t];
  f.supply!.pools[0].screens=1;f.supply!.pools[0].weeklyScreenMinutes=145;f.supply!.pools.push({...f.supply!.pools[0],id:'US:Z_CINEMAS:STANDARD',chainId:'Z_CINEMAS',screens:1000,weeklyScreenMinutes:5040000});f.supply!.offers.push({titleId:'other',poolId:'US:Z_CINEMAS:STANDARD'});
  const r=simulateCinemaWeek(f);assert.ok(r.cohorts[0].unspentCents<1000);assert.ok(r.titles.find(t=>t.titleId==='other')!.firstAdmissions>4000);valid(f,r);
});
test('shrinking populations reconcile active audience without rewriting money',()=>{
  const f=fixture('satisfied-repeat');f.marketState!.titles[0].cells[0].awarePeople=1000000;f.marketState!.titles[0].cells[0].seenBands[0].people=1000000;
  const a=simulateCinemaWeek(f);f.marketState=a.nextState;f.absoluteWeek++;f.cohorts[0].people=999999;const b=simulateCinemaWeek(f);valid(f,b);assert.ok(b.nextState.titles[0].cells[0].seenBands.reduce((n,r)=>n+r.people,0)<=999999);
  assert.ok(a.titles[0].grossCents>0);assert.equal(a.titles[0].grossCents,a.titles[0].producerReceiptsCents+a.titles[0].exhibitorReceiptsCents+a.titles[0].distributionDeductionsCents);
});
test('full canonical world runs all owner routes in shadow with diagnostics',()=>{
  const {input,result,diagnostics}=runCinemaWorldShadowAudit();valid(input,result);assert.ok(result.titles.every(t=>t.firstAdmissions>0));
  console.log(`World shadow diagnostics: ${JSON.stringify(diagnostics)}`);
});
test('budget neither guarantees receipts nor sets a gross ceiling',()=>{
  const f=fixture();const before=simulateCinemaWeek(f).titles[0];f.titles[0].budgetCents=100;assert.deepEqual(simulateCinemaWeek(f).titles[0],before);assert.ok(before.grossCents>f.titles[0].budgetCents*100);
});
test('legacy population reconciliation uses one fixed cohort baseline for all titles',()=>{
  const f=fixture('satisfied-repeat'),high=f.marketState!.titles[0],low=structuredClone(high);high.cells[0].awarePeople=1000000;high.cells[0].seenBands[0].people=1000000;
  low.titleId='old-low';low.cells[0].awarePeople=100000;low.cells[0].seenBands[0].people=50000;f.cohorts[0].people=999999;f.marketState!.titles=[low,high];
  const a=simulateCinemaWeek(f);f.marketState!.titles.reverse();assert.deepEqual(simulateCinemaWeek(f),a);
});
test('title country receipts provide a complete conserved breakdown',()=>{
  const f=fixture(),r=simulateCinemaWeek(f);assert.ok(Array.isArray(r.titles[0].countries));assert.equal(r.titles[0].countries[0].countryId,'US');
  for(const t of r.titles)assert.equal(t.grossCents,t.countries.reduce((n,c)=>n+c.grossCents,0));
});
test('named scarce-access and narrow-wide fixtures preserve the access-intent boundary',()=>{
  assert.ok(admissions(simulateCinemaWeek(fixture('low-access-language')))<admissions(simulateCinemaWeek(fixture())));
  assert.equal(admissions(simulateCinemaWeek(fixture('narrow-unknown'))),admissions(simulateCinemaWeek(fixture('wide-unknown'))));
  assert.equal(admissions(simulateCinemaWeek(fixture('non-binding-capacity'))),admissions(simulateCinemaWeek(fixture())));
});
test('local poster discovery needs real other-film patrons and arrives next week',()=>{
  const f=fixture(),unknown=structuredClone(f.titles[0]);unknown.id='unknown';unknown.exposure!.events=[];f.titles=[...f.titles,unknown];f.supply!.offers.push({titleId:'unknown',poolId:f.supply!.pools[0].id});
  const first=simulateCinemaWeek(f);assert.equal(first.titles.find(t=>t.titleId==='unknown')!.firstAdmissions,0);
  const next=simulateCinemaWeek({...f,absoluteWeek:101,marketState:first.nextState});assert.ok(next.titles.find(t=>t.titleId==='unknown')!.firstAdmissions>0);
  const cell=next.nextState.titles.find(t=>t.titleId==='unknown')!.cells[0];assert.ok(cell.awarePeople<=first.titles.find(t=>t.titleId==='film')!.firstAdmissions*.025);
});
console.log(`Market audit: ${passed} groups passed`);
