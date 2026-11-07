const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fixture=process.env.CINEMA_BROWSER_FIXTURE;assert.ok(fixture,'CINEMA_BROWSER_FIXTURE is required');const out=path.resolve(process.env.CINEMA_BROWSER_OUTPUT||'/tmp/cinema-earned-browser-'+Date.now());fs.mkdirSync(out,{recursive:true});
const facts=JSON.parse(fs.readFileSync(fixture+'.facts.json','utf8')),dist=path.resolve('dist');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.webp':'image/webp','.ico':'image/x-icon'};
const server=http.createServer((req,res)=>{let file=req.url==='/__cinema_qa_fixture.json'?fixture:path.join(dist,decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(file!==fixture&&!file.startsWith(dist+path.sep)){res.writeHead(403).end();return;}if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');if(!fs.existsSync(file))file=path.join(dist,'index.html');res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res)});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
const profile=fs.mkdtempSync('/private/tmp/actor-storage-app-profile-');
let context,page;const errors=[],observations={scope:'Actual production build, isolated persistent QA profile, retained earned save copy; no personal save storage',origin:'earned-owned-prefix',views:[]};
const openContext=async()=>{
 context=await chromium.launchPersistentContext(profile,{headless:true,args:['--js-flags=--max-old-space-size=768'],viewport:{width:390,height:844},reducedMotion:'reduce'});
 page=context.pages()[0]||await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',route=>{const u=route.request().url();return u.startsWith(url)||u.startsWith('data:')||u.startsWith('blob:')?route.continue():route.abort()});
};
const restartPage=async()=>{await context.close();await openContext();await page.goto(url,{waitUntil:'networkidle',timeout:60000});};
await openContext();
try{
 await page.goto(url,{waitUntil:'networkidle',timeout:60000});
 await page.evaluate(async()=>{const pack=await(await fetch('/__cinema_qa_fixture.json')).json();await new Promise((resolve,reject)=>{const open=indexedDB.open('ActorEmpireDB',1);open.onupgradeneeded=()=>{if(!open.result.objectStoreNames.contains('saves'))open.result.createObjectStore('saves')};open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result,tx=db.transaction('saves','readwrite'),store=tx.objectStore('saves'),key='actorEmpireSave_'+pack.slot;store.put(pack.player,key);store.put(pack.manifest,key+'__integrity');tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)}});localStorage.setItem('actorEmpireSeenWhatsNewVersion',pack.version);localStorage.setItem('actorEmpire.saveSummary.v1.actorEmpireSave_'+pack.slot,JSON.stringify({name:pack.player.name,age:pack.player.age,week:pack.player.currentWeek,fame:pack.player.stats.fame,totalPlayTimeMs:pack.player.totalPlayTimeMs||0,savedAt:Date.now()}));});
 await restartPage();await page.locator('#startBtn').click({timeout:60000});await page.locator('.slot-card').filter({hasText:facts.name}).click();await page.locator('[data-ui="actor-empire-home-overhaul"]').waitFor({timeout:60000});await page.screenshot({path:out+'/actual-career-home.png'});
 observations.views.push('Actual retained career loaded through normal start/slot UI');
 const readStored=()=>page.evaluate(()=>new Promise((resolve,reject)=>{const op=indexedDB.open('ActorEmpireDB',1);op.onsuccess=()=>{const db=op.result,tx=db.transaction('saves','readonly'),r=tx.objectStore('saves').get('actorEmpireSave_3'),manifest=tx.objectStore('saves').get('actorEmpireSave_3__integrity');tx.oncomplete=()=>{const p=r.result;resolve({cash:p.money,age:p.age,week:p.currentWeek,lastCinemaWeek:p.world.cinemaMarket?.lastProcessedAbsoluteWeek,gross:Object.fromEntries(Object.entries(p.world.cinemaMarket?.titles||{}).map(([id,t])=>[id,t.grossCents])),manifestDigest:manifest.result?.digest,careerRecordIds:(p.pastProjects||[]).map(x=>x.id),archiveContent:JSON.stringify(p.flags?.dynastyCareerArchives||{}),authoredPostIds:(p.instagram?.posts||[]).map(x=>x.id)});db.close()};tx.onerror=()=>reject(tx.error)}}));
 observations.loaded=await readStored();assert.equal(observations.loaded.cash,facts.cash);assert.equal(observations.loaded.age,facts.age);assert.equal(observations.loaded.week,facts.week);
 fs.writeFileSync(out+'/discovery-home.txt',await page.locator('body').innerText());
 if(await page.getByTitle('Skip event',{exact:true}).isVisible()){await page.getByTitle('Skip event',{exact:true}).click();await page.getByRole('button',{name:/Leave Party.*Save/}).click();observations.views.push('Existing optional award event skipped through its normal UI');}
 if(process.env.CINEMA_BROWSER_DISCOVER_ONLY!=='1'){
  observations.navigation=[];
  const nav=page.locator('nav[aria-label="Primary game navigation"]');
  fs.writeFileSync(out+'/navigation-discovery.json',JSON.stringify(await nav.getByRole('button').evaluateAll(buttons=>buttons.map(b=>({label:b.getAttribute('aria-label'),text:b.textContent}))),null,2));
  for(const name of ['Career','Lifestyle','Home','Career','Lifestyle','Home']){
   const button=nav.getByRole('button',{name,exact:true});await button.evaluate(el=>el.addEventListener('click',()=>{window.__qaTap={start:performance.now(),label:el.getAttribute('aria-label')};const target='actor-empire-'+el.getAttribute('aria-label').toLowerCase()+'-overhaul';const observe=()=>{if(!document.querySelector('[data-ui="'+target+'"]')){requestAnimationFrame(observe);return}requestAnimationFrame(()=>requestAnimationFrame(()=>{window.__qaTap.paintMs=performance.now()-window.__qaTap.start;window.__qaTap.text=document.body.innerText.slice(0,250)}))};requestAnimationFrame(observe)},{once:true}));
   await button.click();await page.waitForFunction(()=>window.__qaTap?.paintMs!==undefined);observations.navigation.push(await page.evaluate(()=>window.__qaTap));fs.writeFileSync(out+'/navigation-timing.json',JSON.stringify(observations.navigation,null,2));
  }
  await page.locator('nav[aria-label="Primary game navigation"] button[aria-label="Mobile"]').click();await page.waitForTimeout(300);fs.writeFileSync(out+'/discovery-phone.txt',await page.locator('body').innerText());await page.screenshot({path:out+'/actual-career-phone.png'});
  observations.views.push('Phone rendered');
  await page.getByText('BoxOffice',{exact:true}).click();fs.writeFileSync(out+'/discovery-box.txt',await page.locator('body').innerText());
  await page.getByRole('button',{name:new RegExp(facts.expected[0].name)}).click();
  const finance=page.getByRole('region',{name:'Cinema financial report'});await finance.waitFor();observations.financialReport=await finance.innerText();
  const fields={'Public theatrical gross':'publicGrossCents','Theatrical producer receipts':'theatricalProducerReceiptsCents','Collected project profit / loss':'netProfitCents','Production and paid release costs':'totalPaidCostsCents'};
  observations.financialValues={};for(const[label,key]of Object.entries(fields)){const rendered=await finance.getByText(label,{exact:true}).evaluate(el=>el.parentElement.querySelector('dd').textContent);const raw=rendered.replace(/[$,]/g,''),factor=raw.endsWith('B')?1e9:raw.endsWith('M')?1e6:raw.endsWith('k')?1e3:1;assert.ok(Math.abs(parseFloat(raw)*factor-facts.expected[0][key]/100)<=factor*(factor>=1e6?.051:.501)+1,label+' differs from settled source');observations.financialValues[label]=rendered;}
  await page.screenshot({path:out+'/actual-financial-report.png'});observations.views.push('Settled public gross, producer receipts, paid costs and collected profit match actual report source');
  await page.getByRole('button',{name:'Back to box office',exact:true}).click();await page.getByRole('button',{name:'Back to phone',exact:true}).click();
  await page.getByText('IMDb',{exact:true}).last().click();await page.getByRole('button',{name:/^credits$/i}).click();await page.getByText(facts.expected[0].name,{exact:true}).last().click();
  const audience=page.getByRole('region',{name:'Cinema audience insights'});await audience.waitFor();observations.audienceInsights=await audience.innerText();observations.views.push('Actual paid audience insights shown on IMDb credit');
  await page.setViewportSize({width:320,height:568});await page.screenshot({path:out+'/actual-imdb-audience-320.png'});observations.mobileWidth=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth}));assert.ok(observations.mobileWidth.document<=321,'Mobile document overflow');
  await page.getByRole('button',{name:'Back to credits',exact:true}).click();await page.getByRole('button',{name:'Back to phone',exact:true}).click();
  fs.writeFileSync(out+'/discovery-phone-final.txt',await page.locator('body').innerText());
  await page.setViewportSize({width:390,height:844});await page.locator('nav[aria-label="Primary game navigation"] button[aria-label="Home"]').click();
  const clearMedical=async()=>{for(let n=0;n<4;n++){if(await page.getByText('Treatment Needed',{exact:true}).isVisible()&&await page.getByRole('button',{name:'Later',exact:true}).isVisible()){await page.getByRole('button',{name:'Later',exact:true}).click();await page.waitForTimeout(100);}else break;}};
  const clearPrompts=async()=>{
   for(let attempt=0;attempt<12;attempt++){
    await clearMedical();
    const feedback=page.getByRole('button',{name:'Continue',exact:true});
    if(await feedback.isVisible()){await feedback.click();await page.waitForTimeout(150);continue;}
    const event=page.locator('div.fixed.inset-0').filter({has:page.getByText(/^select action$/i)}).first();
    if(!(await event.isVisible()))return;
    const buttons=event.getByRole('button').filter({hasNotText:/Watch Ad|PR Spin/i});
    const safe=buttons.filter({hasText:/Politely Decline|Stay Neutral|Decline|Reject|Refuse|Ignore|Keep Quiet|No Thanks|Walk Away/i});
    const choice=await safe.count()?safe.first():buttons.first();
    observations.eventChoices=observations.eventChoices||[];observations.eventChoices.push((await choice.innerText()).trim());
    await choice.click();await page.waitForTimeout(200);
   }
   throw Error('Too many normal event prompts in one test turn');
  };
  await page.evaluate(()=>{
   window.__saveInputTrace=[];window.__saveTimerTrace=[];window.__lastSaveInput=null;
   document.addEventListener('click',event=>{const button=event.target?.closest?.('button');if(button){window.__lastSaveInput={at:performance.now(),text:button.textContent.trim().slice(0,120)};window.__saveInputTrace.push(window.__lastSaveInput)}},true);
   const timer=window.setTimeout;window.setTimeout=function(handler,delay,...args){if(delay===750&&typeof handler==='function'){const source=window.__lastSaveInput;return timer.call(window,function(...values){window.__saveTimerTrace.push({at:performance.now(),source});return handler.apply(this,values)},delay,...args)}return timer.call(window,handler,delay,...args)};
  });
  await page.evaluate(()=>{window.__weekOptStorage=[];const put=IDBObjectStore.prototype.put,get=IDBObjectStore.prototype.get;IDBObjectStore.prototype.put=function(value,key){const at=performance.now(),request=put.call(this,value,key);if(this.name==='saves'&&typeof key==='string')window.__weekOptStorage.push({kind:'put',key,at,returnedAt:performance.now(),reason:value?.manifest?.reason,week:value?.player?.currentWeek??value?.currentWeek});return request};IDBObjectStore.prototype.get=function(key){const at=performance.now(),request=get.call(this,key);if(this.name==='saves'&&typeof key==='string')request.addEventListener('success',()=>window.__weekOptStorage.push({kind:'get',key,at,doneAt:performance.now()}));return request}});
  await page.evaluate(()=>{window.__weekOptStages=[];const write=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(typeof key==='string'&&key.startsWith('actorEmpire.weekProcessingDebug')){try{const r=JSON.parse(value);window.__weekOptStages.push({runId:r.run_id,status:r.status,stage:r.stage,elapsedMs:r.elapsed_ms,slowest:r.slowest_stage,slowestMs:r.slowest_stage_ms,timeline:r.stage_timeline,saveSizeMb:r.save_size_mb})}catch{}}return write.call(this,key,value)}});
  await clearPrompts();const beforeWeek=await readStored(),timings=[];let expectedWeek=beforeWeek.week;
  for(let i=0;i<Number(process.env.WEEK_OPT_BROWSER_WEEKS||5);i++){
   await clearPrompts();
   await page.waitForTimeout(600); // Honor the app's existing 500ms duplicate-input cooldown.
   const button=page.locator('[data-ui="actor-empire-home-overhaul"] [data-tutorial-id="home-next-week"]'),start=Date.now();
   if(i===0)await button.dblclick({delay:25});else await button.click();expectedWeek=expectedWeek%52+1;
   await page.waitForFunction(next=>document.querySelector('[data-ui="actor-empire-home-overhaul"] .ae-next')?.textContent.trim()==='W '+next,expectedWeek%52+1,{timeout:60000});
   await page.locator('[data-ui="actor-empire-home-overhaul"] [data-tutorial-id="home-next-week"]:not([disabled])').waitFor();
   timings.push(Date.now()-start);observations.weekTimingsMs=timings.slice();fs.writeFileSync(out+'/partial-journey.json',JSON.stringify(observations,null,2));const saved=await readStored();assert.equal(saved.week,expectedWeek);assert.equal(saved.lastCinemaWeek,beforeWeek.lastCinemaWeek+i+1);assert.ok(saved.manifestDigest);
   for(const[id,paid]of Object.entries(beforeWeek.gross))assert.ok(saved.gross[id]>=paid,'An existing paid title was rewritten');
  }
  observations.weekTimingsMs=timings;observations.successfulWeekTraces=await page.evaluate(()=>window.__weekOptStages);observations.successfulStorageOps=await page.evaluate(()=>window.__weekOptStorage);observations.autosaveAttribution=await page.evaluate(()=>({inputs:window.__saveInputTrace,timers:window.__saveTimerTrace}));fs.writeFileSync(out+'/successful-storage-ops.json',JSON.stringify(observations.successfulStorageOps,null,2));fs.writeFileSync(out+'/successful-week-stages.json',JSON.stringify(observations.successfulWeekTraces,null,2));fs.writeFileSync(out+'/week-timing.json',JSON.stringify(timings));observations.views.push('Actual UI weeks, including rapid double click, advance once each and persist the cinema week');
  await clearPrompts();await page.waitForTimeout(1500);const beforeReload=await readStored();await restartPage();await page.locator('#startBtn').click();await page.locator('.slot-card').filter({hasText:facts.name}).click();await page.locator('[data-ui="actor-empire-home-overhaul"]').waitFor({timeout:60000});const afterReload=await readStored();const{manifestDigest:beforeDigest,...beforeFacts}=beforeReload,{manifestDigest:afterDigest,...afterFacts}=afterReload;assert.ok(beforeDigest&&afterDigest);assert.deepEqual(afterFacts,beforeFacts);observations.reloadProtected={cash:afterReload.cash,week:afterReload.week,lastCinemaWeek:afterReload.lastCinemaWeek,manifestDigest:afterReload.manifestDigest};observations.views.push('Real browser restart with the same isolated profile preserves cash, paid title gross and processed week without paying again');await page.screenshot({path:out+'/actual-week-reloaded.png'});

  observations.faults=[];
  await clearPrompts();
  await page.waitForTimeout(650);const beforeFailure=await readStored();
  await page.evaluate(()=>{const put=IDBObjectStore.prototype.put;window.__qaOriginalPut=put;window.__qaFailureInjected=false;IDBObjectStore.prototype.put=function(value,key){if(typeof key==='string'&&key.endsWith('__candidate')&&!window.__qaFailureInjected){window.__qaFailureInjected=true;throw new DOMException('Controlled QA storage-full failure','QuotaExceededError')}return put.call(this,value,key)}});
  await page.locator('[data-ui="actor-empire-home-overhaul"] [data-tutorial-id="home-next-week"]').click();
  await page.getByRole('dialog',{name:/Week .* was not applied/}).waitFor({timeout:60000});assert.equal(await page.evaluate(()=>window.__qaFailureInjected),true);const afterFailure=await readStored();const {manifestDigest:beforeFailureDigest,...beforeFailureFacts}=beforeFailure,{manifestDigest:afterFailureDigest,...afterFailureFacts}=afterFailure;assert.ok(beforeFailureDigest&&afterFailureDigest);assert.deepEqual(afterFailureFacts,beforeFailureFacts,'Failed persistence must leave current cash, week and records unchanged; benign autosave manifest timestamps may differ');await page.screenshot({path:out+'/storage-failure-protected.png'});observations.faults.push('Injected real IndexedDB candidate quota failure: prior current week, cash, gross and user records unchanged; recovery UI shown');
  await page.evaluate(()=>{IDBObjectStore.prototype.put=window.__qaOriginalPut});await page.getByRole('button',{name:'Return to Menu',exact:true}).click();await restartPage();
  // Capture the verified previous generation, then corrupt only current in this disposable database.
  const previous=await page.evaluate(()=>new Promise((resolve,reject)=>{const op=indexedDB.open('ActorEmpireDB',1);op.onerror=()=>reject(op.error);op.onsuccess=()=>{const db=op.result,tx=db.transaction('saves','readwrite'),store=tx.objectStore('saves'),key='actorEmpireSave_3',old=store.get(key+'__previous'),current=store.get(key);current.onsuccess=()=>{const p=current.result;p.money+=1;store.put(p,key)};tx.oncomplete=()=>{const p=old.result.player;db.close();resolve({cash:p.money,week:p.currentWeek,archiveContent:JSON.stringify(p.flags?.dynastyCareerArchives||{}),lastCinemaWeek:p.world.cinemaMarket.lastProcessedAbsoluteWeek})};tx.onerror=()=>reject(tx.error)}}));
  await restartPage();await page.locator('#startBtn').click();await page.locator('.slot-card').filter({hasText:facts.name}).click();await page.getByRole('dialog',{name:'Safe backup found',exact:true}).waitFor();await page.screenshot({path:out+'/verified-backup-offered.png'});await page.getByRole('button',{name:'Recover Safe Save',exact:true}).click();await page.locator('[data-ui="actor-empire-home-overhaul"]').waitFor({timeout:60000});const recovered=await readStored();for(const[key,value]of Object.entries(previous))assert.deepEqual(recovered[key],value,'Recovery must restore the complete prior verified generation: '+key);observations.faults.push('Corrupted current generation: normal Safe backup found UI restores verified previous career, cash and paid week');observations.recovered={cash:recovered.cash,week:recovered.week,lastCinemaWeek:recovered.lastCinemaWeek};

 }
 assert.deepEqual(errors,[]);observations.errors=errors;observations.weekProcessingTrace=await page.evaluate(()=>Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('actorEmpire.weekProcessingDebug')).map(k=>[k,JSON.parse(localStorage.getItem(k))])));fs.writeFileSync(out+'/app-check.json',JSON.stringify(observations,null,2));console.log(JSON.stringify(observations));
}catch(e){fs.writeFileSync(out+'/failure.txt',String(e.stack)+'\n'+await page.locator('body').innerText().catch(()=>''));await page.screenshot({path:out+'/failure.png'}).catch(()=>{});throw e}finally{await context?.close().catch(()=>{});server.close();if(fs.existsSync(out+'/app-check.json'))fs.rmSync(profile,{recursive:true,force:true});else fs.writeFileSync(out+'/retained-test-profile.txt',profile)}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
