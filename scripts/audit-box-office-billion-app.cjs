/* Real App + IndexedDB, in a disposable browser context. Never opens user saves. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const target=Number(process.env.CINEMA_BILLION_APP_TARGET_CENTS||100_000_000_000);
const out=process.env.CINEMA_BILLION_APP_OUTPUT||'/private/tmp/actor-billion-potential-20261022/app';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CINEMA_BROWSER_EXECUTABLE?{executablePath:process.env.CINEMA_BROWSER_EXECUTABLE}:{})}),context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>console.error('APP_BILLION renderer crashed'));page.setDefaultTimeout(30000);
 const report={kind:'ACTUAL_APP_FRESH_PREMIERE_TO_BILLION_INDEXEDDB',steps:[],weeks:[]};let fixtureServer;
 const mark=s=>{console.log('APP_BILLION',s);report.steps.push(s)};
 const read=()=>page.evaluate(async()=>{const {loadVerifiedGameData}=await import('/services/storage.ts');const r=await loadVerifiedGameData('actorEmpireSave_1');if(r.status!=='CURRENT')throw new Error('Unverified '+r.status);const p=r.player,m=p.world.cinemaMarket,t=m.titles['final-phenomenon'],release=p.activeReleases.find(t=>t.id==='final-phenomenon'),{getCinemaProjectFinance}=await import('/services/boxOffice/boxOfficeSettlement.ts');return {age:p.age,week:p.currentWeek,money:p.money,balance:p.businesses[0].balance,gross:t?.grossCents||0,receipts:t?.producerReceiptsCents||0,cinemaWeek:m.lastProcessedAbsoluteWeek,lastReceipt:m.weeks.at(-1).id,health:p.stats.health,isDead:!!p.flags.isDead,source:release&&{gross:release.totalGross,receipts:release.totalStudioReceipts,unrecorded:release.unrecordedTheatricalGross,booking:release.bookingCostPaid,finance:getCinemaProjectFinance(release)},paid:m.weeks.at(-1).titles.find(t=>t.titleId==='final-phenomenon')}});
 const clear=async()=>{for(let n=0;n<30;n++){
  const modal=page.locator('div.fixed.inset-0.z-\\[200\\]');
  if(await modal.count()&&await modal.first().isVisible()){
   const c=modal.getByRole('button',{name:'Continue',exact:true});if(await c.isVisible()){await c.click();continue}
   let chosen=false;for(const label of ['Walk Away','Skip It','Focus on Auditions','Keep Walking','Decline']){const choice=modal.getByRole('button',{name:label,exact:true});if(await choice.isVisible()){await choice.click();chosen=true;break}}
   if(!chosen){const free=modal.getByRole('button').filter({hasNotText:/watch ad|\$|scholarship|viral/i});assert.ok(await free.count());await free.first().click()}continue;
  }
  const medical=page.getByRole('dialog',{name:'Treatment Needed'});if(await medical.isVisible()){await medical.getByRole('button',{name:'Later',exact:true}).click();continue}
  const skip=page.getByRole('button',{name:/Skip Tutorial/i});if(await skip.isVisible()){await skip.click();continue}
  const intro=page.getByRole('button',{name:'Continue',exact:true});if(await intro.isVisible()){await intro.click();continue}return;
 }throw Error('Unresolved modal loop')};
 try{
  const file=process.env.CINEMA_BILLION_APP_FIXTURE;assert.ok(file&&fs.existsSync(file));
  // Stream the large authored save over loopback HTTP. Sending its base64 body
  // through CDP's fulfilRequest can exceed the protocol's message-size limit.
  fixtureServer=http.createServer((req,res)=>{if(req.url!=='/fixture'){res.writeHead(404);res.end();return}res.writeHead(200,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res)});
  await new Promise(resolve=>fixtureServer.listen(0,'127.0.0.1',resolve));
  const fixtureUrl=`http://127.0.0.1:${fixtureServer.address().port}/fixture`;
  await page.goto(process.env.CINEMA_BILLION_APP_URL||'http://127.0.0.1:5197',{timeout:90000});await page.waitForLoadState('networkidle');mark('seed isolated earned save');
  // The fixture is already prepared by the actual engine/save audit. Sign and
  // verify that exact player; avoid a second full migration clone during seeding.
  const name=await page.evaluate(async url=>{const {createSaveIntegrityManifest}=await import('/services/saveIntegrity.ts'),s=await import('/services/storage.ts');const p=await fetch(url).then(r=>r.json()),manifest=createSaveIntegrityManifest(p,'MIGRATION');await s.saveVerifiedGameData('actorEmpireSave_1',p,manifest);s.writeGameSaveSummary('actorEmpireSave_1',p);return p.name},fixtureUrl);
  const open=async()=>{await page.reload();await page.getByRole('button',{name:'Start Career',exact:true}).click({timeout:90000});await page.getByText(name,{exact:true}).click();await page.getByRole('button',{name:'Home',exact:true}).waitFor({timeout:90000});await page.waitForTimeout(500);await clear()};
  await open();report.before=await read();assert.equal(report.before.gross,0);assert.equal(report.before.isDead,false);
  let previous=report.before;
  for(let n=0;n<14&&previous.gross<target;n++){
   await page.getByRole('button',{name:'Home',exact:true}).click();await clear();mark('actual Age Up '+(n+1));
   const next=previous.week===52?{age:previous.age+1,week:1}:{age:previous.age,week:previous.week+1};
   await page.getByRole('button',{name:/Age Up Week/}).click();await page.waitForFunction(n=>document.body.innerText.includes('WEEK '+n.week+' / 52'),next,{timeout:180000});await page.waitForTimeout(600);await clear();
   const saved=await read();assert.equal(saved.age,next.age);assert.equal(saved.week,next.week);assert.equal(saved.isDead,false);
   assert.ok(saved.gross>previous.gross);assert.notEqual(saved.lastReceipt,previous.lastReceipt);
   assert.equal(saved.gross-previous.gross,saved.paid.grossCents);assert.equal(saved.receipts-previous.receipts,saved.paid.producerReceiptsCents);
   assert.equal(saved.paid.grossCents,saved.paid.producerReceiptsCents+saved.paid.exhibitorReceiptsCents+saved.paid.distributionDeductionsCents);
   assert.equal(saved.paid.costsCents,0,'A fresh standard revenue-share release has no producer show rental');
   report.weeks.push(saved);previous=saved;
   if(n===0){mark('opening reload retains exact paid facts');await open();assert.deepEqual(await read(),saved)}
  }
  report.after=previous;assert.ok(previous.gross>=target,'Fresh premiere must earn a billion through actual App Age Ups');
  mark('billion reload retains exact paid facts');await open();report.reload=await read();assert.deepEqual(report.reload,report.after);
  await page.getByRole('button',{name:'Mobile',exact:true}).click();await page.getByText('BoxOffice',{exact:true}).click();await page.getByRole('button',{name:/final-phenomenon/}).first().click();
  report.finance=await page.getByRole('region',{name:'Cinema financial report'}).innerText();const expectedReceipts=await page.evaluate(async cents=>{const {formatMoney}=await import('/services/formatUtils.ts');return formatMoney(cents/100)},previous.receipts);assert.equal(await page.getByRole('region',{name:'Cinema financial report'}).getByText('Theatrical producer receipts',{exact:true}).locator('..').locator('dd').innerText(),expectedReceipts,'Actual financial screen must show canonical paid receipts after reload');assert.equal(report.finance.includes('historical estimates'),false,'Fresh paid release must not invent a historical gap');await page.getByRole('region',{name:'Cinema financial report'}).evaluate(el=>{let f=el[Object.keys(el).find(k=>k.startsWith('__reactFiber'))];for(let n=0;f&&n<20;n++,f=f.return){if(f.memoizedProps?.source){const s=f.memoizedProps.source;return {id:s.id,totalGross:s.totalGross,gross:s.gross,receipts:s.totalStudioReceipts,unrecorded:s.unrecordedTheatricalGross,booking:s.bookingCostPaid}}}return null});await page.getByRole('region',{name:'Cinema financial report'}).scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'billion-finance.png')});
  await page.setViewportSize({width:320,height:568});report.viewport=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(report.viewport.scroll<=report.viewport.width);await page.screenshot({path:path.join(out,'billion-finance-320.png')});
  const financeRegion=page.getByRole('region',{name:'Cinema financial report'});
  for(const [label,cents] of [['Project profit before investor distributions',previous.source.finance.netProfitCents],['Studio profit after financing',previous.source.finance.studioProfitCents]]){
   const formatted=await page.evaluate(async cents=>{const {formatMoney}=await import('/services/formatUtils.ts');return formatMoney(cents/100)},cents);
   assert.equal(await financeRegion.getByText(label,{exact:true}).locator('..').locator('dd').innerText(),formatted);
  }
  assert.deepEqual(errors,[]);report.status='PASS';
 }catch(error){report.status='FAIL';report.error=String(error);try{report.body=(await page.locator('body').innerText({timeout:5000})).slice(-6000);await page.screenshot({path:path.join(out,'failure.png'),timeout:5000})}catch{}throw error}
 finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({...report,errors},null,2));await context.close().catch(()=>{});await browser.close().catch(()=>{});if(fixtureServer)await new Promise(resolve=>fixtureServer.close(resolve))}
})().catch(e=>{console.error(e);process.exitCode=1});
