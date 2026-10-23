import assert from 'node:assert/strict';
import fs from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url)),input=resolve(process.env.ECONOMICS_OUTPUT||'/private/tmp/actor-fair-cinema-fixes-20261023');
const files=['full-world.json','full-world-weak.json','full-world-peak.json'];
const sources=files.map(file=>({file,report:JSON.parse(fs.readFileSync(join(input,file),'utf8'))}));
const equivalence=JSON.parse(fs.readFileSync(join(input,'kernel-equivalence.json'),'utf8'));
assert.equal(equivalence.normalizedExecutablesIdentical,true);
const cases=['focused-small','wide-small','unknown-worldwide','sleeper','weak-small','strong-stars','earned-event','unearned-event','weak-event','peak-release'];
const rows=sources.flatMap(({file,report})=>{assert.equal(report.tuningVersion,5);assert.equal(report.seeds,4);assert.equal(report.horizon,156);assert.ok([equivalence.testedBundleSha256,equivalence.finalBundleSha256].includes(report.executionCodeSha256));return report.rows.filter(r=>cases.includes(r.name)).map(r=>({...r,source:file,executionCodeSha256:report.executionCodeSha256}))});
assert.equal(rows.length,40);assert.equal(new Set(rows.map(r=>r.name+':'+r.seed)).size,40);
for(const name of cases)for(let seed=0;seed<4;seed++)assert.ok(rows.some(r=>r.name===name&&r.seed===seed));
for(const row of rows){assert.equal(row.countries,197);assert.ok(row.cohorts>2000);assert.equal(row.profitCents,row.receiptsCents-row.budgetCents-row.campaignCents-row.bookingCents)}
for(let seed=0;seed<4;seed++){
 const a=rows.find(r=>r.name==='focused-small'&&r.seed===seed),b=rows.find(r=>r.name==='wide-small'&&r.seed===seed);
 for(const k of ['grossCents','receiptsCents','profitCents','first','repeats'])assert.equal(a[k],b[k],`Unused worldwide access changes ${k}`);
 assert.equal(rows.find(r=>r.name==='unknown-worldwide'&&r.seed===seed).grossCents,0);
 assert.ok(rows.find(r=>r.name==='earned-event'&&r.seed===seed).grossCents>rows.find(r=>r.name==='weak-event'&&r.seed===seed).grossCents);
}
const extent=(rs,k)=>({min:Math.min(...rs.map(r=>r[k])),max:Math.max(...rs.map(r=>r[k]))});
const distributions=cases.map(name=>{const rs=rows.filter(r=>r.name===name);return {name,runs:rs.length,censored:rs.filter(r=>r.censored).length,recouped:rs.filter(r=>!r.censored&&r.profitCents>=0).length,...Object.fromEntries(['grossCents','receiptsCents','profitCents','weeks','week95'].map(k=>[k,extent(rs,k)]))}});
const report={kind:'FORTY_SHARDED_CANONICAL_FULL_WORLD_CONTROLS',tuningVersion:5,sourceFiles:files,kernelEquivalence:equivalence,rows,distributions,totalFocalTitleWeeks:rows.reduce((n,r)=>n+r.weeks,0),limitations:sources[0].report.limitations.concat(['Shards ran with overlapping desktop work; timing values are observations, not a comparative or native performance benchmark','Normalized executable comparison is exact except optional legacy quote validation; final NPC generation is tested separately in corrected-source normal careers'])};
fs.mkdirSync(join(here,'evidence'),{recursive:true});fs.writeFileSync(join(here,'evidence/full-world.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({runs:rows.length,censored:rows.filter(r=>r.censored).length,totalFocalTitleWeeks:report.totalFocalTitleWeeks,distributions},null,2));
