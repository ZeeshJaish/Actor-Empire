import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
const base=process.argv[2]||'/private/tmp/actor-billion-potential-20261022';
const world=JSON.parse(readFileSync(join(base,'final-world.json'),'utf8'));
const cases=['focused-small','wide-small','weak-small','sleeper','unknown-worldwide','strong-stars','earned-event','unearned-event','weak-event','peak-release'];
assert.equal(world.rows.length,cases.length*world.seeds,'Final selected matrix must be complete');
assert.equal(new Set(world.rows.map(r=>`${r.name}:${r.seed}`)).size,world.rows.length);
let checks=0;
const verify=(label,ok)=>{assert.ok(ok,label);checks++};
for(let seed=0;seed<world.seeds;seed++){
  const row=name=>{const r=world.rows.find(r=>r.name===name&&r.seed===seed);assert.ok(r);return r};
  const small=row('focused-small'),wide=row('wide-small');
  verify('Unused worldwide access cannot create first intent',row('unknown-worldwide').grossCents===0);
  verify('Same awareness with nonbinding extra access cannot mint tickets',wide.grossCents===small.grossCents&&wide.profitCents<small.profitCents);
  verify('Delivered response matters for the same small campaign',small.grossCents>row('weak-small').grossCents);
  verify('Earned universe audience matters',row('earned-event').grossCents>row('unearned-event').grossCents);
  verify('Unknown final quality cannot improve an unviewed opening',row('earned-event').openingCents===row('weak-event').openingCents);
  verify('An expensive weak event can still lose money',row('weak-event').profitCents<0);
  verify('Binding competition reduces the same opening',row('peak-release').openingCents<small.openingCents);
  verify('Excellent craft does not guarantee low-exposure recoupment',row('sleeper').grossCents>row('sleeper').openingCents&&row('sleeper').profitCents<0);
  for(const r of cases.map(row)){
    assert.equal(r.countries,197);assert.ok(r.cohorts>2000);assert.equal(r.censored,false);
    assert.equal(r.weekly.reduce((n,x)=>n+x,0),r.grossCents);
    assert.equal(r.profitCents,r.receiptsCents-r.bookingCents-r.campaignCents-r.budgetCents);
  }
}
const actual=[];
for(const folder of ['final-phenomenon','final-paired','final-small']){
  const report=JSON.parse(readFileSync(join(base,folder,'results-0.json'),'utf8'));
  for(const row of report.rows){
    const player=JSON.parse(readFileSync(join(base,folder,`${row.name}-final-0.json`),'utf8'));
    const facts=player.world.cinemaMarket.titles[row.film.id];
    assert.equal(row.allClosed,true);assert.equal(facts.closed,true);assert.equal(facts.legacyGrossCents,0);
    assert.equal(row.weekly.reduce((n,r)=>n+r.grossCents,0),facts.grossCents);
    assert.equal(facts.grossCents,facts.producerReceiptsCents+facts.exhibitorReceiptsCents+facts.distributionDeductionsCents);
    assert.equal(row.profitCents,facts.producerReceiptsCents-facts.bookingCostCents-(row.film.budget+row.film.campaign)*100);
    if(row.film.id==='final-phenomenon')verify('Actual earned exceptional film can organically gross multiple billions',facts.grossCents>=200_000_000_000);
    else if(row.name==='earned')verify('Actual strong crossover can organically gross one billion',facts.grossCents>=100_000_000_000);
    if(row.name==='weak')verify('Actual weak expensive event remains financially risky',row.profitCents<0);
    actual.push({name:row.name,titleId:row.film.id,grossM:facts.grossCents/1e8,profitM:row.profitCents/1e8,weeks:row.runWeeks,week95:row.week95});
  }
}
assert.equal(actual.length,5,'Require exceptional/strong/weak/focused-small/wide-small actual routes');
console.log(JSON.stringify({status:'PASS',pairedTendencies:checks,controlledRuns:world.rows.length,actual},null,2));
