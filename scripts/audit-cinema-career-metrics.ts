import assert from 'node:assert/strict';
import {summarizeCareerFilms,type CareerFilmObservation} from './fixtures/cinemaCareerCohortMetrics';
const film=(id:string,extra:Partial<CareerFilmObservation>={}):CareerFilmObservation=>({id,closed:true,ownCredit:false,budgetCents:10000,campaignCents:1000,bookingCents:0,talentPaidCents:0,actorPaidCents:0,investorPaidCents:0,grossCents:30000,receiptsCents:17000,...extra});
const r=summarizeCareerFilms([film('hit'),film('hit'),film('small-loss',{receiptsCents:10800,investorPaidCents:5000}),
 film('backend-loss',{receiptsCents:12000,talentPaidCents:4000,ownCredit:true}),film('unknown',{budgetCents:null}),film('open-billion',{closed:false,grossCents:250_000_000_000})]);
assert.equal(r.released,5);assert.equal(r.completed,4);assert.equal(r.unknownCompleted,1);assert.equal(r.open,1);
assert.deepEqual(r.all,{completed:3,recouped:1,hits:1,profits:0,nearBreakEven:1,losses:1,exactDeficits:2});
assert.equal(r.rows.find(f=>f.id==='small-loss')!.theatricalProfitCents,-200,'Investor ownership distributions cannot be subtracted from project profit again');
assert.equal(r.rows.find(f=>f.id==='backend-loss')!.theatricalProfitCents,-3000,'Signed backend is a real project expense');
assert.equal(r.player.losses,1);assert.equal(r.billionAttainment[1].allReleased,1);assert.equal(r.billionAttainment[1].completed,0);
assert.equal(r.billionAttainment[2].allReleased,0);
const surplus=summarizeCareerFilms([film('small-surplus',{receiptsCents:11200})]);
assert.equal(surplus.all.recouped,1);assert.equal(surplus.all.nearBreakEven,1);assert.equal(surplus.all.exactDeficits,0);
assert.equal(surplus.all.profits,0,'Near-break-even surplus is a recovered film, not a second profit category');
console.log('PASS reporting denominators, title deduplication, near-break-even, signed backend, financing and censored billion attainment');
