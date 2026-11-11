import fs from'node:fs';import{spawn}from'node:child_process';import assert from'node:assert/strict';
const root='/private/tmp/actor-save-round-20261104-Lm5LRx',report='docs/reports/2026-11-04-save-pipeline-followup/checks',rows=[];
const common={SAFE_START_FREE:'50',PLAYWRIGHT_MODULE:'/Users/zeesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'};
async function run(name,script,env={},guard=true){const args=guard?[root+'/admit.mjs',name,'128',script]:[script];const code=await new Promise((resolve,reject)=>{const p=spawn(process.execPath,['--max-old-space-size=128',...args],{env:{...process.env,...common,...env},stdio:'inherit'});p.once('error',reject);p.once('close',resolve)});rows.push({name,code});fs.writeFileSync(report+'/browser-checks.json',JSON.stringify(rows,null,2));assert.equal(code,0,name);}
await run('save-browser-safety',root+'/safety-final.mjs');
await run('same-host-abba',root+'/ab-browser.mjs',{},false);
const base={CINEMA_BROWSER_FIXTURE:'/private/tmp/actor-week-20261104-8kqvqhnz/career.json',SOAK_MINUTES:'0',SOAK_CYCLE_MS:'1000',SOAK_BROWSER_CHANNEL:'chromium'};
await run('continuous-40','scripts/audit-week-latency-soak.cjs',{...base,SOAK_DIST:root+'/final-dist',CINEMA_BROWSER_OUTPUT:'output/playwright/2026-11-04-save-continuous-40',SOAK_MIN_WEEKS:'40',SOAK_BROWSER_HEAP_MIB:'768'});
for(const mode of ['old','new'])await run('matched-legacy-'+mode,'scripts/audit-week-latency-soak.cjs',{...base,SOAK_DIST:mode==='old'?'/private/tmp/actor-week-safe-20261104-Tuk8Zk/final-dist':root+'/final-dist',CINEMA_BROWSER_OUTPUT:'output/playwright/2026-11-04-save-matched-legacy-'+mode,SOAK_MIN_WEEKS:'3',SOAK_BROWSER_HEAP_MIB:'512',SOAK_LEGACY_CAPABILITIES:'1',SOAK_CPU_SLOWDOWN:'2'});
