/* Production App entrypoint/StrictMode in a new browser context, synthetic slot1 only. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'/Users/zeesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=process.env.STOCK_APP_OUTPUT||'/private/tmp/stock-acquisition-actual-app';fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:448,height:956}}),page=await context.newPage(),errors=[],report={kind:'ACTUAL_APP_STRICTMODE_SYNTHETIC_VERIFIED_SLOT',steps:[],console:[]};
 page.setDefaultTimeout(25000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['warning','error'].includes(m.type()))report.console.push({type:m.type(),text:m.text().slice(0,400)})});
 const mark=name=>{report.stage=name;console.log('ACTUAL_APP_STAGE',name);fs.writeFileSync(path.join(out,'stage.txt'),name)};
 const button=name=>page.getByRole('button',{name,exact:true});
 const read=async label=>{const r=await page.evaluate(async()=>{const m=await import('/stockAcquisitionAppFixture.ts');return m.read()});const p=r.player,s={label,status:r.status,money:p.money,week:p.currentWeek,age:p.age,energy:p.energy.current,holdings:p.portfolio,businesses:p.businesses,cases:p.acquisition?.cases,flags:p.flags,pendingEvents:p.pendingEvents};report.steps.push(s);return s};
 const write=()=>fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({...report,errors},null,2));
 const waitSaved=async(predicate,label)=>{for(let n=0;n<60;n++){const r=await read(label);if(predicate(r))return r;await page.waitForTimeout(200)}throw new Error('Actual App autosave did not commit '+label)};
 const clearChoices=async()=>{for(let n=0;n<12;n++){
  const modal=page.locator('div.fixed.inset-0.z-\\[200\\]').first();if(!await modal.isVisible())return;
  const cont=modal.getByRole('button',{name:'Continue',exact:true}),skip=modal.getByText('Skip It',{exact:true}),focus=modal.getByText('Focus on Auditions',{exact:true}),vote=modal.getByRole('button',{name:/^Vote For/}).first(),donate=modal.getByText('Just Donate ($1k)',{exact:true});
  if(await cont.isVisible())await cont.click();else if(await skip.isVisible())await skip.click();else if(await focus.isVisible())await focus.click();else if(await vote.isVisible())await vote.click();else if(await donate.isVisible()){await donate.click();report.steps.push({label:'ordinary shelter event explicitly chose displayed$1k donation'});}else{let handled=false;for(const label of ['Save the Cash','Politely Decline','Stay Neutral','Ignore It','Observe from Afar','Attend the Press Event','Choose Privacy','Walk Away','Refuse','Make Time Immediately','Tell the Truth','Lock everything down','Keep it warm, but decline','Keep the walls up','Back off and reduce the heat','Keep the relationship separate','Cut off the side connection','End it cleanly now','Tell your current partner first','Block the number and move on']){const option=modal.getByText(label,{exact:true});if(await option.isVisible()){await option.click();report.steps.push({label:'ordinary non-ad event choice: '+label});handled=true;break;}}if(!handled)throw new Error('Unrecognized ordinary App event: '+await modal.innerText());}
  await page.waitForTimeout(200);
 }throw new Error('Unresolved App event loop')};
 const open=async()=>{await page.reload();await button('Start Career').click({timeout:120000});await page.getByText('Stock Actual App Buyer',{exact:true}).click();await button('Home').waitFor({timeout:120000});if(await button('Continue').isVisible())await button('Continue').click();const skip=page.getByRole('button',{name:/Skip Tutorial/i});if(await skip.isVisible())await skip.click()};
 try{
 mark('boot');await page.goto(process.env.STOCK_APP_URL||'http://127.0.0.1:5196/stockAcquisitionAppSmoke.html');
 await button('Start Career').waitFor({timeout:120000});await page.evaluate(async()=>{const m=await import('/stockAcquisitionAppFixture.ts');return m.seed()});mark('seeded, opening actual career');await open();mark('career loaded');const initial=await read('App loaded synthetic career through actual slot selection');
 mark('opening Stocks');await button('Mobile').click();await page.getByText('Stocks',{exact:true}).click();
 await page.getByText('Paramount Global',{exact:true}).first().click();
 await button('Target %').click();await page.locator('input[type=number]').fill('51');await button('Buy').click();const bought=await waitSaved(p=>p.holdings.length===1,'Actual App Stocks purchase saved');assert.equal(initial.money-bought.money,bought.holdings[0].totalInvested);
 if(process.env.STOCK_APP_INSPECT){console.log(await page.locator('body').innerText());report.status='INSPECT';return}
 mark('purchase saved, advancing actual App week');await page.getByRole('button',{name:'Back to stock market',exact:true}).click();await page.getByRole('button',{name:'Back to phone',exact:true}).click();await button('Home').click();await page.getByRole('button',{name:/Age Up Week/}).click();
 mark('awaiting control notice');for(let n=0;n<120;n++){
   if(await page.getByRole('button',{name:/Open Acquisition Desk/}).isVisible())break;
   if(n%5===0){const state=await read('waiting for actual App control event');fs.writeFileSync(path.join(out,'progress.json'),JSON.stringify({body:await page.locator('body').innerText(),state},null,2));}
   const ordinaryVote=page.getByRole('button',{name:/^Vote For/}).first();if(await ordinaryVote.isVisible()){await ordinaryVote.click();continue;}
   const modal=page.locator('div.fixed.inset-0.z-\\[200\\]').first();if(await modal.isVisible()){
    const cont=modal.getByRole('button',{name:'Continue',exact:true}),skip=modal.getByText('Skip It',{exact:true}),focus=modal.getByText('Focus on Auditions',{exact:true});
    if(await cont.isVisible())await cont.click();else if(await skip.isVisible())await skip.click();else if(await focus.isVisible())await focus.click();
   }
   await page.waitForTimeout(1000);
  }await page.getByRole('button',{name:/Open Acquisition Desk/}).waitFor({timeout:5000});await page.getByRole('button',{name:/Open Acquisition Desk/}).click();
 mark('control notice opened acquisition');await page.getByRole('dialog',{name:/acquisition deal room/}).waitFor();
 await page.getByRole('button',{name:/Run Due Diligence/}).click();await page.locator('.sa-sheet').getByRole('button').filter({hasText:/Personal Wealth/}).click();await page.getByRole('button',{name:/Open the War Room/}).click();await page.getByRole('button',{name:/File Majority Control Notice/}).click();await button('Review the Board Decision').click();await page.getByRole('button',{name:/Proceed to Closing/}).click();
 mark('closing documents');await page.locator('.sa-closing').waitFor();for(const b of await page.locator('.sa-closedoc').all())await b.click();await page.getByRole('button',{name:/Enter the Signing Room/}).click();for(let i=0;i<3;i++)await page.getByRole('button',{name:/Confirm Clause.*Next/}).click();
 const pre=await read('Actual App before final signature');await page.getByRole('button',{name:/Sign the Transfer/}).click();await page.locator('.sa-acquired').waitFor();const acquired=await waitSaved(p=>p.businesses.some(b=>b.id==='PARAMOUNT'),'Actual App acquired studio autosaved');assert.equal(acquired.money,pre.money);assert.deepEqual(acquired.holdings,pre.holdings);assert.equal(pre.energy-acquired.energy,25);
 mark('acquired, reload');await page.waitForTimeout(1000);await page.screenshot({path:path.join(out,'actual-app-acquired.png')});await open();const reloaded=await read('Actual App reload and slot navigation');assert.equal(reloaded.money,acquired.money);assert.deepEqual(reloaded.holdings,acquired.holdings);assert.equal(reloaded.energy,acquired.energy);assert.equal(reloaded.businesses.filter(b=>b.id==='PARAMOUNT').length,1);
 await button('Mobile').click();await page.getByText('Forbes',{exact:true}).click();await button('Studios').click();await page.getByText('Paramount Pictures',{exact:true}).first().waitFor();await page.screenshot({path:path.join(out,'actual-app-forbes-reload.png')});
 await page.getByRole('button',{name:'Back to phone',exact:true}).click();await button('Home').click();
 for(let i=0;i<3;i++){
  await clearChoices();mark('actual App next week '+i);const before=await read('before App next week '+i);await page.getByRole('button',{name:/Age Up Week/}).click();
  const next=await waitSaved(p=>p.week!==before.week,'actual App next week '+i+' verified');assert.deepEqual(next.holdings,acquired.holdings);assert.equal(next.businesses.filter(b=>b.id==='PARAMOUNT').length,1);assert.equal(next.pendingEvents.filter(e=>e.data?.relatedStudioId==='PARAMOUNT'&&e.data?.stockDecisionType==='TAKEOVER_CONTROL').length,0);
  const ordinaryVote=page.getByRole('button',{name:/^Vote For/}).first();if(await ordinaryVote.isVisible())await ordinaryVote.click();
 }
 await page.screenshot({path:path.join(out,'actual-app-three-weeks.png')});assert.deepEqual(errors,[]);report.status='PASSED';console.log('Actual App stock purchase, control notice navigation, acquisition, autosave and career reload passed.');
 }catch(e){report.status='FAILED';report.failure=String(e);report.body=(await page.locator('body').innerText()).slice(-10000);await page.screenshot({path:path.join(out,'failure.png')});throw e}finally{write();await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
