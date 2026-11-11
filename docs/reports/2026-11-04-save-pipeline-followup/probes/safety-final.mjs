import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,openSync,closeSync,cpSync,mkdtempSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const root='/private/tmp/actor-save-round-20261104-Lm5LRx',report='docs/reports/2026-11-04-save-pipeline-followup/checks';
const profile=readFileSync('output/playwright/2026-11-04-safe-followup-hour-final/test-profile.txt','utf8').trim();
const playwright='/Users/zeesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
const rows=[];
async function run(name,heap,script,args=[],env={}) {
 const log=openSync(report+'/'+name+'.log','w'),start=Date.now();
 const code=await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,['--max-old-space-size='+heap,'--expose-gc',script,...args],{env:{...process.env,PLAYWRIGHT_MODULE:playwright,...env},stdio:['ignore',log,log]});
  child.once('error',reject);child.once('close',resolve);
 });
 closeSync(log);rows.push({name,code,ms:Date.now()-start});
 writeFileSync(report+'/safety.json',JSON.stringify(rows,null,2));console.log(JSON.stringify(rows.at(-1)));assert.equal(code,0,name);
}
await run('legacy-api-unit',1024,root+'/profile.mjs',['scripts/audit-runtime-compatibility.ts'],{LEGACY_APIS:'1',PROBE_LABEL:'legacy-api-final'});
await run('atomic-chromium',128,'scripts/audit-atomic-save-browser.cjs',[],{SAVE_ATOMIC_OUTPUT:'output/playwright/2026-11-04-save-pipeline-atomic-chromium'});
mkdirSync('/private/tmp/actor-save-path-20261030/swift-cache',{recursive:true});
await run('atomic-webkit',128,'scripts/audit-atomic-save-browser.cjs',[],{SAVE_ATOMIC_ENGINE:'system-webkit',SAVE_ATOMIC_OUTPUT:'output/playwright/2026-11-04-save-pipeline-atomic-webkit'});
await run('update-roundtrip',128,'scripts/audit-save-update-compatibility.cjs',[],{
 SAVE_UPDATE_SOURCE_PROFILE:profile,SAVE_UPDATE_OLD_DIST:'/private/tmp/actor-week-20261104-8kqvqhnz/final-dist',SAVE_UPDATE_NEW_DIST:root+'/final-dist',SAVE_UPDATE_OUTPUT:'output/playwright/2026-11-04-save-pipeline-update'
});
const recovery=mkdtempSync('/private/tmp/actor-week-soak-profile-recovery-');cpSync(profile,recovery,{recursive:true});
await run('recovery-app',128,'scripts/audit-save-storage-recovery.cjs',[],{
 SAVE_STORAGE_TEST_PROFILE:recovery,SAVE_RECOVERY_DIST:root+'/final-dist',CINEMA_BROWSER_FIXTURE:'/private/tmp/actor-week-20261104-8kqvqhnz/career.json',CINEMA_BROWSER_OUTPUT:'output/playwright/2026-11-04-save-pipeline-recovery'
});
