import fs from 'node:fs';import {spawn} from 'node:child_process';import assert from 'node:assert/strict';
const root='/private/tmp/actor-save-round-20261104-Lm5LRx',report='docs/reports/2026-11-04-save-pipeline-followup/checks';
const jobs=['old','new','new','old'];const rows=[];
for(let i=0;i<jobs.length;i++){
 const mode=jobs[i],name='same-host-'+i+'-'+mode,out='output/playwright/2026-11-04-save-'+name;
 const code=await new Promise((resolve,reject)=>{const p=spawn(process.execPath,['--max-old-space-size=128',root+'/admit.mjs',name,'128','scripts/audit-week-latency-soak.cjs'],{env:{...process.env,SAFE_START_FREE:'50',PLAYWRIGHT_MODULE:'/Users/zeesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright',CINEMA_BROWSER_FIXTURE:'/private/tmp/actor-week-20261104-8kqvqhnz/career.json',SOAK_DIST:mode==='old'?'/private/tmp/actor-week-safe-20261104-Tuk8Zk/final-dist':root+'/final-dist',CINEMA_BROWSER_OUTPUT:out,SOAK_MINUTES:'0',SOAK_MIN_WEEKS:'10',SOAK_CYCLE_MS:'1000',SOAK_BROWSER_HEAP_MIB:'768',SOAK_BROWSER_CHANNEL:'chromium'},stdio:'inherit'});p.once('error',reject);p.once('close',resolve)});
 rows.push({name,mode,code,out});fs.writeFileSync(report+'/same-host-ab-runs.json',JSON.stringify(rows,null,2));assert.equal(code,0,name);
}
const stats=xs=>{const x=[...xs].sort((a,b)=>a-b),n=x.length;return {n,medianMs:n%2?x[(n-1)/2]:(x[n/2-1]+x[n/2])/2,p95Ms:x[Math.ceil(.95*n)-1],minMs:x[0],maxMs:x[n-1],under3:x.filter(t=>t<3000).length};};
const result={order:jobs,scope:'Same-host ABBA built-app samples,10 weeks per run, identical signed initial fixture, normal unseeded UI/events, no forced GC; not field/device evidence',rows:[]};
for(const mode of ['old','new']){const weeks=rows.filter(r=>r.mode===mode).flatMap(r=>JSON.parse(fs.readFileSync(r.out+'/results.json')).weeks);const durations=weeks.map(w=>w.interaction.commandToClickMs+w.interaction.tapToPaintMs);result.rows.push({mode,...stats(durations),wall:stats(weeks.map(w=>w.ms)),weeks:weeks.map(w=>({week:w.count,ms:w.ms,interaction:w.interaction,stage:w.stage}))});}
fs.writeFileSync(report+'/same-host-ab.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result.rows.map(({weeks,...r})=>r)));
