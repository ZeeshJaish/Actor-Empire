import assert from 'node:assert/strict';
import { splitRealizedCinemaGross, summarizeCinemaFinance, getCinemaProjectFinance, dollarsToCinemaCents, npcMillionsToCinemaCents } from '../services/boxOffice/boxOfficeSettlement';
const tests:Array<[string,()=>void]>=[];const test=(name:string,run:()=>void)=>tests.push([name,run]);
test('integer cents split odd amounts exactly',()=>{
 const result=splitRealizedCinemaGross({grossCents:10001,exhibitorBasisPoints:4700,distributionBasisPoints:500});
 assert.deepEqual(result,{grossCents:10001,exhibitorReceiptsCents:4700,distributionDeductionsCents:500,producerReceiptsCents:4801});
});
test('safe-integer large gross does not overflow share multiplication',()=>{
 const r=splitRealizedCinemaGross({grossCents:Number.MAX_SAFE_INTEGER,exhibitorBasisPoints:4700,distributionBasisPoints:500});
 assert.equal(r.producerReceiptsCents+r.exhibitorReceiptsCents+r.distributionDeductionsCents,Number.MAX_SAFE_INTEGER);
 assert.ok(Object.values(r).every(Number.isSafeInteger));
});
test('invalid money/shares cannot enter the ledger',()=>{
 assert.throws(()=>splitRealizedCinemaGross({grossCents:-1,exhibitorBasisPoints:4700,distributionBasisPoints:500}));
 assert.throws(()=>splitRealizedCinemaGross({grossCents:100,exhibitorBasisPoints:8000,distributionBasisPoints:3000}));
 assert.throws(()=>dollarsToCinemaCents(Infinity));
});
test('player dollars and NPC millions have distinct exact adapters',()=>{
 assert.equal(dollarsToCinemaCents(25.25),2525);assert.equal(npcMillionsToCinemaCents(2.5),250_000_000);
});
test('ledger deduplicates actual cost events and separates gross from profit',()=>{
 const result=summarizeCinemaFinance({titleId:'film',entries:[
 {id:'gross',category:'THEATRICAL_GROSS',amountCents:23000},
 {id:'theater',category:'PRODUCER_RECEIPTS',amountCents:11500},
 {id:'production',category:'PRODUCTION_COST',amountCents:10000},
 {id:'marketing',category:'MARKETING_COST',amountCents:3000},
 {id:'marketing',category:'MARKETING_COST',amountCents:3000},
 {id:'booking',category:'BOOKING_COST',amountCents:500},
 {id:'stream',category:'STREAMING_RECEIPTS',amountCents:1000},
 {id:'music',category:'SOUNDTRACK_RECEIPTS',amountCents:100},
 {id:'investor',category:'INVESTOR_PAYOUT',amountCents:200},
 {id:'backend',category:'TALENT_BACKEND',amountCents:100},
 {id:'actor',category:'ACTOR_PAY',amountCents:2000},
 ]});
 assert.equal(result.publicGrossCents,23000);assert.equal(result.totalPaidCostsCents,13500);
 assert.equal(result.producerReceiptsCents,12600);assert.equal(result.netStudioReceiptsCents,12300);
 assert.equal(result.netProfitCents,-1000,'Project profit excludes investor ownership distributions');assert.equal(result.actorEarningsCents,2000);
});
test('conflicting duplicate events are rejected instead of overwritten',()=>{
 assert.throws(()=>summarizeCinemaFinance({titleId:'film',entries:[
 {id:'campaign',category:'MARKETING_COST',amountCents:100},
 {id:'campaign',category:'MARKETING_COST',amountCents:200},
 ]}));
});
test('hybrid producer receipts add media without counting actor earnings',()=>{
 const f=getCinemaProjectFinance({id:'film',budget:100,gross:230,totalStudioReceipts:115,streamingRevenue:50,soundtrackRevenue:10,earnings:999999,
 marketingBudgetSpent:30,totalCampaignSpend:30});
 assert.equal(f.producerReceiptsCents,17500);assert.equal(f.totalPaidCostsCents,13000);
 assert.equal(f.receiptsEstimated,false);assert.equal(f.studioReturnPercent,45/130*100);
});
test('a recorded zero receipt remains zero, with later streaming added',()=>{
 const f=getCinemaProjectFinance({id:'film',budget:100,gross:230,totalStudioReceipts:0,streamingRevenue:50});
 assert.equal(f.producerReceiptsCents,5000);assert.equal(f.receiptsEstimated,false);
});
test('legacy receipts are explicitly estimated and quotes are not paid costs',()=>{
 const f=getCinemaProjectFinance({id:'legacy',budget:100,gross:230,earnings:9000,bookingCost:999999});
 assert.equal(f.producerReceiptsCents,11500);assert.equal(f.receiptsEstimated,true);assert.equal(f.totalPaidCostsCents,10000);
});
test('combined signed profit cannot overflow safe integer cents',()=>{
 assert.throws(()=>summarizeCinemaFinance({titleId:'unsafe',entries:[
 {id:'production',category:'PRODUCTION_COST',amountCents:Number.MAX_SAFE_INTEGER},
 {id:'backend',category:'TALENT_BACKEND',amountCents:Number.MAX_SAFE_INTEGER},
 ]}));
});
test('funded production does not hide the studios paid marketing exposure',()=>{
 const f=getCinemaProjectFinance({id:'funded',budget:100,platformProductionFunding:100,studioCashAtRisk:0,marketingBudgetSpent:10});
 assert.equal(f.studioReturnPercent,-100);
 const free=getCinemaProjectFinance({id:'funded',budget:100,platformProductionFunding:100,studioCashAtRisk:0});
 assert.equal(free.studioReturnPercent,null);
});
test('unknown ledger categories are rejected rather than losing money silently',()=>{
 assert.throws(()=>summarizeCinemaFinance({titleId:'bad',entries:[{id:'bad',category:'UNKNOWN' as never,amountCents:100}]}));
});
test('a half-investor financed break-even film reports zero project and studio profit',()=>{
 const source={id:'financed',budget:100e6,totalStudioReceipts:100e6,studioCashAtRisk:50e6,
  investorPlan:{totalRaised:50e6},investorPayouts:{lifetimeInvestorPayout:50e6,weeklyInvestorPayouts:[50e6]}};
 const before=JSON.stringify(source),f=getCinemaProjectFinance(source as Parameters<typeof getCinemaProjectFinance>[0]);
 assert.equal(f.netProfitCents,0);assert.equal((f as any).studioProfitCents,0);
 assert.equal((f as any).studioCashAtRiskCents,50e8);assert.equal(f.studioReturnPercent,0);
 assert.equal(JSON.stringify(source),before,'Presenting financing never settles cash');
});
test('project and studio profit remain different when investors finance a profitable film',()=>{
 const f=getCinemaProjectFinance({budget:100e6,totalStudioReceipts:200e6,studioCashAtRisk:50e6,
  investorPayouts:{lifetimeInvestorPayout:100e6,weeklyInvestorPayouts:[100e6]}});
 assert.equal(f.netProfitCents,100e8);assert.equal((f as any).studioProfitCents,50e8);
 assert.equal(f.studioReturnPercent,100);
});
test('applied platform production cover is recognized once without inventing spendable studio receipts',()=>{
 const f=getCinemaProjectFinance({budget:100,platformProductionFunding:100,studioCashAtRisk:0,marketingBudgetSpent:10});
 assert.equal(f.netProfitCents,-1000);assert.equal((f as any).studioProfitCents,-1000);
 assert.equal(f.producerReceiptsCents,0);assert.equal(f.studioReturnPercent,-100);
});
let failures=0;for(const[name,run]of tests){try{run();console.log('PASS',name)}catch(error){failures++;console.error('FAIL',name,error instanceof Error?error.message:error)}}
assert.equal(failures,0,`${failures} finance contract regressions`);
