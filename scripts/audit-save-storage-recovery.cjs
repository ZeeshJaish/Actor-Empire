const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fixture=process.env.CINEMA_BROWSER_FIXTURE;assert.ok(fixture,'CINEMA_BROWSER_FIXTURE is required');const out=path.resolve(process.env.CINEMA_BROWSER_OUTPUT||'/tmp/cinema-earned-browser-'+Date.now());fs.mkdirSync(out,{recursive:true});
const facts=JSON.parse(fs.readFileSync(fixture+'.facts.json','utf8')),dist=path.resolve(process.env.SAVE_RECOVERY_DIST||'dist');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.webp':'image/webp','.ico':'image/x-icon'};
const server=http.createServer((req,res)=>{let file=req.url==='/__cinema_qa_fixture.json'?fixture:path.join(dist,decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(file!==fixture&&!file.startsWith(dist+path.sep)){res.writeHead(403).end();return;}if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');if(!fs.existsSync(file))file=path.join(dist,'index.html');res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res)});

(async()=>{
 const profile=path.resolve(process.env.SAVE_STORAGE_TEST_PROFILE||'');assert.ok(['/private/tmp/actor-storage-app-profile-','/private/tmp/actor-week-soak-profile-'].some(prefix=>profile.startsWith(prefix)),'Only an isolated QA profile is permitted');
 const origins=fs.readdirSync(path.join(profile,'Default/IndexedDB'));const match=origins.map(x=>x.match(/^http_127\.0\.0\.1_(\d+)\.indexeddb\.leveldb$/)).find(Boolean);assert.ok(match,'QA database origin missing');
 await new Promise(r=>server.listen(Number(match[1]),'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 const errors=[],observations={scope:'Final built app, retained large QA career, including the completed normal-session profile, fresh process for fault/recovery phase',eventChoices:[],faults:[]};let context,page;
 const open=async()=>{context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,args:['--js-flags=--max-old-space-size=768'],viewport:{width:390,height:844},reducedMotion:'reduce'});page=context.pages()[0]||await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));await context.route('**/*',route=>{const u=route.request().url();return u.startsWith(url)||u.startsWith('data:')||u.startsWith('blob:')?route.continue():route.abort()});await page.goto(url,{waitUntil:'networkidle',timeout:60000});};
 const restart=async()=>{await context.close();await open();};
 const enter=async()=>{await page.locator('#startBtn').click();await page.locator('.slot-card').filter({hasText:facts.name}).click();await page.locator('[data-ui="actor-empire-home-overhaul"]').waitFor({timeout:60000});};
 try{
 await open();
  const readStored=()=>page.evaluate(()=>new Promise((resolve,reject)=>{const op=indexedDB.open('ActorEmpireDB',1);op.onsuccess=()=>{const db=op.result,tx=db.transaction('saves','readonly'),r=tx.objectStore('saves').get('actorEmpireSave_3'),manifest=tx.objectStore('saves').get('actorEmpireSave_3__integrity');tx.oncomplete=()=>{const p=r.result;resolve({cash:p.money,age:p.age,week:p.currentWeek,lastCinemaWeek:p.world.cinemaMarket?.lastProcessedAbsoluteWeek,gross:Object.fromEntries(Object.entries(p.world.cinemaMarket?.titles||{}).map(([id,t])=>[id,t.grossCents])),settlementMoney:{external:p.world.cinemaMarket?.externalProducerBalancesCents||{},titles:Object.fromEntries(Object.entries(p.world.cinemaMarket?.titles||{}).map(([id,t])=>[id,{producerReceiptsCents:t.producerReceiptsCents,bookingCostCents:t.bookingCostCents,investorPaidCents:t.investorPaidCents,talentPaidCents:t.talentPaidCents,actorPaidCents:t.actorPaidCents}]))},manifestDigest:manifest.result?.digest,careerRecordIds:(p.pastProjects||[]).map(x=>x.id),archiveContent:JSON.stringify(p.flags?.dynastyCareerArchives||{}),authoredPostIds:(p.instagram?.posts||[]).map(x=>x.id),treasuries:{businesses:Object.fromEntries((p.businesses||[]).map(b=>[b.id,b.balance])),npc:Object.fromEntries(Object.entries(p.world.studios||{}).map(([id,v])=>[id,v.cashReserve])),ownedStreaming:manifest.result?.protected?.ownedStreamingTreasury},talentIncome:Object.fromEntries(Object.entries(p.world.talentCareer?.profiles||{}).map(([id,v])=>[id,{income:v.income,backendIncome:v.backendIncome}]))});db.close()};tx.onerror=()=>reject(tx.error)}}));
const installObserver = async () => page.evaluate(() => {
    window.__soakPending = 0; window.__soakLastWrite = 0; window.__soakWeek = null;
    const transaction = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (...args) {
        const tx = transaction.apply(this, args);
        if (this.name === 'ActorEmpireDB' && args[1] === 'readwrite') {
            window.__soakPending++;
            const done = () => { window.__soakPending--; window.__soakLastWrite = performance.now(); };
            tx.addEventListener('complete', done, { once: true }); tx.addEventListener('abort', done, { once: true });
        }
        return tx;
    };
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
        if (typeof key === 'string' && key.startsWith('actorEmpire.weekProcessingDebug')) {
            try { const r = JSON.parse(value); if (r.stage === 'success') window.__soakWeek = { elapsedMs: r.elapsed_ms, timeline: r.stage_timeline }; } catch {}
        }
        return set.call(this, key, value);
    };
});
const settle = async () => { await page.waitForTimeout(1100); await page.waitForFunction(() => window.__soakPending === 0 && performance.now() - window.__soakLastWrite > 300, undefined, { timeout: 60000 }); };
await installObserver();const beforeEntry=await readStored();await enter();await settle();const afterEntry=await readStored();const {manifestDigest:_beforeEntryDigest,...beforeEntryFacts}=beforeEntry,{manifestDigest:_afterEntryDigest,...afterEntryFacts}=afterEntry;assert.deepEqual(afterEntryFacts,beforeEntryFacts,'Actual process restart must preserve studio, NPC, streaming and actor money without replay');observations.restartTreasuryParity=true;
const exposedButton = async locator => {
    for (let n = 0; n < await locator.count(); n++) {
        const button = locator.nth(n);
        if (await button.isVisible() && await button.evaluate(el => {
            const r = el.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            return hit === el || el.contains(hit);
        })) return button;
    }
    return null;
};
const clearPrompts = async () => {
    for (let i = 0; i < 16; i++) {
        // Visible medical/awards prompts can sit beneath a newer story. Use the
        // actual exposed button, without force clicks or changing modal state.
        const feedback = await exposedButton(page.getByRole('button', { name: 'Continue', exact: true }));
        if (feedback) { await feedback.click(); await page.waitForTimeout(150); continue; }
        const event = page.locator('div.fixed.inset-0').filter({ has: page.getByText(/^select action$/i) }).first();
        const buttons = event.getByRole('button').filter({ hasNotText: /Watch Ad|PR Spin/i });
        const safe = buttons.filter({ hasText: /Politely Decline|Stay Neutral|Decline|Reject|Refuse|Ignore|Keep Quiet|No Thanks|Walk Away|Observe from Afar/i });
        const choice = await exposedButton(safe) || await exposedButton(buttons);
        if (choice) { observations.eventChoices.push((await choice.innerText()).trim()); await choice.click(); await page.waitForTimeout(200); continue; }
        const skip = await exposedButton(page.getByTitle('Skip event', { exact: true }));
        if (skip) {
            await skip.click(); await page.getByRole('button', { name: /Leave Party.*Save/ }).click();
            observations.eventChoices.push('Skip optional awards event through its normal save button'); continue;
        }
        const later = await exposedButton(page.getByRole('button', { name: 'Later', exact: true }));
        if (await page.getByText('Treatment Needed', { exact: true }).isVisible() && later) {
            await later.click(); continue;
        }
        return;
    }
    throw Error('Normal event sequence did not settle');
};

 observations.resumed=await readStored();await clearPrompts();await page.waitForTimeout(2000);const before=await readStored();
 // Construct the exception before the payload-bearing callback. This retains
 // the real QuotaExceededError boundary without capturing a huge candidate in
 // the fault-injection exception's creation stack.
 await page.evaluate(()=>{const put=IDBObjectStore.prototype.put,error=new DOMException('Controlled QA storage-full failure','QuotaExceededError');window.__qaOriginalPut=put;window.__qaFailureInjected=false;IDBObjectStore.prototype.put=function(value,key){if(typeof key==='string'&&(key==='actorEmpireSave_3'||key.endsWith('__candidate'))&&!window.__qaFailureInjected){window.__qaFailureInjected=true;window.__qaFailureBoundary=key;throw error}return put.call(this,value,key)}});
 await page.locator('[data-ui="actor-empire-home-overhaul"] [data-tutorial-id="home-next-week"]').click();await page.getByRole('dialog',{name:/Week .* was not applied/}).waitFor({timeout:60000});assert.equal(await page.evaluate(()=>window.__qaFailureInjected),true);
 const after=await readStored(),{manifestDigest:beforeDigest,...a}=before,{manifestDigest:afterDigest,...b}=after;assert.ok(beforeDigest&&afterDigest);assert.deepEqual(b,a);observations.quotaFailureBoundary=await page.evaluate(()=>window.__qaFailureBoundary);observations.faults.push('Large-career real verified-save quota failure preserves committed cash, week, gross, records and archive content');await page.screenshot({path:out+'/large-quota-protected.png'});
 await page.evaluate(()=>{IDBObjectStore.prototype.put=window.__qaOriginalPut});await page.getByRole('button',{name:'Return to Menu',exact:true}).click();await restart();
 const previous=await page.evaluate(()=>new Promise((resolve,reject)=>{const op=indexedDB.open('ActorEmpireDB',1);op.onerror=()=>reject(op.error);op.onsuccess=()=>{const db=op.result,tx=db.transaction('saves','readwrite'),store=tx.objectStore('saves'),key='actorEmpireSave_3',old=store.get(key+'__previous'),current=store.get(key);current.onsuccess=()=>{const p=current.result;p.money+=1;store.put(p,key)};tx.oncomplete=()=>{const p=old.result.player;db.close();resolve({cash:p.money,age:p.age,week:p.currentWeek,gross:Object.fromEntries(Object.entries(p.world.cinemaMarket?.titles||{}).map(([id,t])=>[id,t.grossCents])),careerRecordIds:(p.pastProjects||[]).map(x=>x.id),authoredPostIds:(p.instagram?.posts||[]).map(x=>x.id),settlementMoney:{external:p.world.cinemaMarket?.externalProducerBalancesCents||{},titles:Object.fromEntries(Object.entries(p.world.cinemaMarket?.titles||{}).map(([id,t])=>[id,{producerReceiptsCents:t.producerReceiptsCents,bookingCostCents:t.bookingCostCents,investorPaidCents:t.investorPaidCents,talentPaidCents:t.talentPaidCents,actorPaidCents:t.actorPaidCents}]))},archiveContent:JSON.stringify(p.flags?.dynastyCareerArchives||{}),lastCinemaWeek:p.world.cinemaMarket.lastProcessedAbsoluteWeek,treasuries:{businesses:Object.fromEntries((p.businesses||[]).map(b=>[b.id,b.balance])),npc:Object.fromEntries(Object.entries(p.world.studios||{}).map(([id,v])=>[id,v.cashReserve])),ownedStreaming:old.result.manifest?.protected?.ownedStreamingTreasury},talentIncome:Object.fromEntries(Object.entries(p.world.talentCareer?.profiles||{}).map(([id,v])=>[id,{income:v.income,backendIncome:v.backendIncome}]))})};tx.onerror=()=>reject(tx.error)}}));
 await restart();await installObserver();await page.locator('#startBtn').click();await page.locator('.slot-card').filter({hasText:facts.name}).click();await page.getByRole('dialog',{name:'Safe backup found',exact:true}).waitFor();await page.screenshot({path:out+'/large-backup-offered.png'});await page.getByRole('button',{name:'Recover Safe Save',exact:true}).click();await page.locator('[data-ui="actor-empire-home-overhaul"]').waitFor({timeout:60000});await settle();const recovered=await readStored();for(const[k,v]of Object.entries(previous))assert.deepEqual(recovered[k],v,k);observations.faults.push('Large-career corrupted current is rejected and verified previous generation recovers through normal UI');observations.recovered={cash:recovered.cash,week:recovered.week,lastCinemaWeek:recovered.lastCinemaWeek};assert.deepEqual(errors,[]);observations.errors=errors;fs.writeFileSync(out+'/app-check.json',JSON.stringify(observations,null,2));console.log(JSON.stringify(observations));
 }catch(error){fs.writeFileSync(out+'/failure.txt',String(error.stack)+'\n'+await page.locator('body').innerText().catch(()=>''));throw error;}finally{await context?.close().catch(()=>{});server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
