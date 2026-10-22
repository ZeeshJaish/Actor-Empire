const {chromium}=require('/Users/zeesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
(async()=>{const b=await chromium.launch({headless:true});const results=[];
const scenarios=[['PARAMOUNT',51,'draft'],['PARAMOUNT',100,'draft'],['WARNER_BROS',51,'draft'],['UNIVERSAL',51,'draft'],['PARAMOUNT',50,'draft'],['PARAMOUNT',51,'none'],['PARAMOUNT',100,'none'],['PARAMOUNT',51,'accepted'],['PARAMOUNT',51,'countered'],['PARAMOUNT',51,'rejected'],['ARTISAN_PICTURES',0,'accepted']];
for(const [studio,pct,mode] of scenarios){const p=await b.newPage({viewport:{width:448,height:956}});const errors=[];p.on('pageerror',e=>errors.push(e.message));const row={studio,pct,mode,steps:[],errors};
await p.goto(`http://127.0.0.1:5189/?studio=${studio}&pct=${pct}&case=${mode}`);await p.getByRole('dialog',{name:/acquisition deal room/}).waitFor();
const snap=async(label)=>{await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));row.steps.push(await p.evaluate(label=>({label,scene:document.querySelector('.sa-scene')?.className,status:window.__analysis.case?.status||'NO_CASE',presentation:window.__analysis.case?.presentation,money:window.__analysis.player.money,businesses:window.__analysis.player.businesses.map(x=>x.id),shares:window.__analysis.player.portfolio[0]?.shares}),label));};
const openWar=async()=>{const btn=p.getByRole('button',{name:/Open the War Room|Bid Blind/});if(await btn.count())await btn.click();};
const openResponse=async()=>{await openWar();const file=p.getByRole('button',{name:/File Majority Control Notice/});if(await file.count())await file.click();const breaking=p.locator('.sa-breaking button');if(await breaking.count())await breaking.click();};
await snap('initial');await openResponse();await snap('after first decision reveal');
if(await p.locator('.sa-dossier').count()){await openResponse();await snap('after second decision reveal');}
const closing=p.getByRole('button',{name:/Proceed to Closing/});if(await closing.count()){await closing.click();await snap('after Proceed to Closing');}
if(studio==='PARAMOUNT'&&pct===51&&mode==='draft'){await p.waitForTimeout(2600);await p.screenshot({path:'/private/tmp/ae-paramount-analysis/reproduced-loop.png'});}
if(await p.locator('.sa-closing').count()){
row.closingText=await p.locator('.sa-closing').innerText();for(const doc of await p.locator('.sa-closedoc').all())await doc.click();await p.getByRole('button',{name:/Enter the Signing Room/}).click();await snap('entered signing');
for(let i=0;i<3;i++)await p.getByRole('button',{name:/Confirm Clause.*Next/}).click();console.log('SIGNING PAGE',await p.locator('.sa-signing').innerText());await p.getByRole('button',{name:/Sign the Transfer/}).click();await p.locator('.sa-acquired').waitFor({timeout:10000});await snap('after final signature');
if(studio==='PARAMOUNT'&&mode==='none'){await p.screenshot({path:`/private/tmp/ae-paramount-analysis/working-no-case-${pct}.png`});}
}
results.push(row);fs.writeFileSync('/private/tmp/ae-paramount-analysis/browser-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(row));await p.close();}
fs.writeFileSync('/private/tmp/ae-paramount-analysis/browser-results.json',JSON.stringify(results,null,2));await b.close();})().catch(e=>{console.error(e);process.exit(1)});
