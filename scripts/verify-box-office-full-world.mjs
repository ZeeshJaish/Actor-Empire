/** Verify paired tendencies in the saved full-world report; never impose hit-rate quotas. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const report=JSON.parse(readFileSync(process.argv[2]||'/private/tmp/actor-distributor-booking-20261022/full-world-current.json','utf8'));
const names=['unknown-local','unknown-worldwide','focused-small','wide-small','weak-small','sleeper','local-language','weak-stars','strong-stars','earned-event','unearned-event','weak-event','quiet-release','honest-campaign','misleading-campaign','no-home-access','early-streaming','recession','peak-release'];
assert.equal(report.kind,'CANONICAL_FULL_WORLD_CONTROLLED_SLATE');
assert.equal(report.rows.length,names.length*report.seeds,'Incomplete matrix cannot establish paired tendencies');
assert.equal(new Set(report.rows.map(r=>`${r.name}:${r.seed}`)).size,report.rows.length);
let checks=0;const verify=(name,condition)=>{assert.ok(condition,name);checks++};
for(let seed=0;seed<report.seeds;seed++){
 const row=name=>{const r=report.rows.find(r=>r.name===name&&r.seed===seed);assert.ok(r,`Missing ${name}:${seed}`);return r};
 const small=row('focused-small'),wide=row('wide-small');
 verify('Unknown worldwide access creates no paid audience',row('unknown-worldwide').grossCents===0&&row('unknown-local').grossCents===0);
 verify('Unused wider footprint is not free',row('unknown-worldwide').bookingCents>row('unknown-local').bookingCents);
 verify('Nonbinding extra access does not generate intent',wide.grossCents===small.grossCents&&wide.profitCents<small.profitCents);
 verify('Delivered response matters with the same campaign',small.grossCents>row('weak-small').grossCents&&row('strong-stars').grossCents>row('weak-stars').grossCents);
 verify('Earned universe viewing helps the event',row('earned-event').grossCents>row('unearned-event').grossCents);
 verify('Private final quality cannot change an unviewed opening',row('earned-event').openingCents===row('weak-event').openingCents);
 verify('A weak expensive event can lose real money',row('weak-event').profitCents<0);
 verify('Misleading expectations do not improve delivered satisfaction',row('honest-campaign').grossCents>=row('misleading-campaign').grossCents);
 verify('Relevant local home alternatives matter once',row('no-home-access').grossCents>=small.grossCents&&row('early-streaming').grossCents<=small.grossCents);
 verify('Scarcer household funding cannot force more spend',row('recession').grossCents<=small.grossCents);
 // Later real rival patrons can discover the focal film's booked local poster.
 // That delayed exposure is intentional; opening demand has no such evidence.
 verify('Removing competitors cannot reduce the identical public opening',row('quiet-release').openingCents>=small.openingCents);
 verify('A binding full-world peak slate reduces the same small film opening',row('peak-release').openingCents<small.openingCents);
 verify('Low-exposure strong film can grow through actual patrons',row('sleeper').grossCents>row('sleeper').openingCents);
 for(const r of names.map(row)){
  assert.equal(r.countries,197);assert.ok(r.cohorts>2000);assert.ok(Number.isSafeInteger(r.grossCents));
  assert.equal(r.weekly.reduce((n,x)=>n+x,0),r.grossCents);
  assert.equal(r.profitCents,r.receiptsCents-r.bookingCents-r.campaignCents-r.budgetCents);
  if(r.censored)assert.equal(r.weeks,report.horizon);
 }
}
console.log(`Full-world paired verification: ${checks} tendencies passed across ${report.rows.length} conditional runs; no hit-rate quotas.`);
