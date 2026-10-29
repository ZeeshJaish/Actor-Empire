const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.CREATOR_PLAYWRIGHT_MODULE||'playwright');
const out=path.resolve('output/playwright/creator-economy');
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'index.html'),'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Creator economy QA</title></head><body style="margin:0;background:#050505"><div id="root"></div><script type="module" src="./main.tsx"></script></body></html>');
fs.writeFileSync(path.join(out,'main.tsx'),"import '../../../scripts/fixtures/creatorEconomyBrowserFixture';\n");

async function main(){
 const browser=await chromium.launch({headless:true});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 const url=process.env.CREATOR_QA_URL||'http://127.0.0.1:5211/output/playwright/creator-economy/';
 await page.goto(url);await page.waitForFunction(()=>!!window.creatorQA);await page.evaluate(()=>window.creatorQA.reset());
 for(let i=0;i<6;i++){
  await page.locator('button:has(svg.lucide-plus)').first().click();await page.getByPlaceholder('Enter a catchy title...').fill('Creator QA '+i);
  if(i===5)await page.getByRole('button',{name:/Project Teaser/i}).click();
  await page.getByRole('button',{name:'Publish Video',exact:true}).click();await page.waitForFunction(n=>window.creatorQA.player().youtube.videos.length===n,i+1);
 }
 const uploads=await page.evaluate(()=>window.creatorQA.player());assert.equal(uploads.youtube.audienceTrust,63);assert.equal(uploads.youtube.fanMood,63);assert.equal(uploads.energy.current,5);assert.equal(uploads.money,1e6);assert.equal(uploads.youtube.videos[0].type,'TRAILER');assert.ok(uploads.youtube.videos.every(v=>v.views>0));assert.equal(uploads.youtube.totalChannelViews,305000+uploads.youtube.videos.reduce((n,v)=>n+v.views,0));
 await page.screenshot({path:path.join(out,'uploads-390.png')});
 await page.reload();await page.waitForFunction(()=>!!window.creatorQA);const reloaded=await page.evaluate(()=>window.creatorQA.player());assert.deepEqual(reloaded.youtube,JSON.parse(JSON.stringify(uploads.youtube)));assert.deepEqual(reloaded.creatorEconomy,uploads.creatorEconomy);
 await page.locator('button:has(svg.lucide-plus)').first().click();await page.getByPlaceholder('Enter a catchy title...').fill('Blocked without energy');assert.equal(await page.getByRole('button',{name:'Publish Video',exact:true}).isDisabled(),true);
 await page.evaluate(()=>{const p=window.creatorQA.player();p.energy.current=0;p.flags.weeklyBaseEnergyRemaining=0;p.flags.bonusEnergyBank=0;window.creatorQA.set(p);window.creatorQA.app('X')});
 await page.getByRole('button',{name:'Compose post',exact:true}).click();await page.locator('textarea').fill('Cannot farm stats at zero energy');assert.equal(await page.getByRole('button',{name:'Post to X',exact:true}).isDisabled(),true);assert.equal((await page.evaluate(()=>window.creatorQA.player())).x.posts.length,uploads.x.posts.length);
 await page.screenshot({path:path.join(out,'x-zero-energy-390.png')});
 // Exercise old accepted terms through the actual fulfilment button, not a fresh quote.
 await page.evaluate(()=>{const p=window.creatorQA.player();p.energy.current=100;p.flags.weeklyBaseEnergyRemaining=100;p.youtube.activeBrandDeals=[{id:'saved-contract',brandName:'Saved Contract QA',category:'TECH',description:'Previously accepted terms',payout:2900000000,requiredType:'VLOG',energyCost:16,bonusViews:1000000,penalty:50000,expiresInWeeks:12}];window.creatorQA.set(p);window.creatorQA.app('YOUTUBE')});
 await page.getByRole('button',{name:'Studio',exact:true}).click();await page.getByRole('button',{name:/^Offers/}).click();await page.getByRole('button',{name:'Publish Integration',exact:true}).click();await page.waitForFunction(()=>window.creatorQA.player().youtube.activeBrandDeals.length===0);
 const signed=await page.evaluate(()=>window.creatorQA.player());const paid=signed.money-uploads.money;assert.ok(paid>=2900000000*.7&&paid<=2900000000*1.18);assert.equal(signed.youtube.videos.length,7);assert.equal(signed.energy.current,84);
 await page.reload();await page.waitForFunction(()=>!!window.creatorQA);assert.equal((await page.evaluate(()=>window.creatorQA.player())).money,signed.money);assert.equal((await page.evaluate(()=>window.creatorQA.player())).youtube.activeBrandDeals.length,0);
 await page.getByRole('button',{name:'Studio',exact:true}).click();await page.getByRole('button',{name:/^Money/}).click();
 const beforeLive=await page.evaluate(()=>window.creatorQA.player());await page.getByRole('button',{name:/Go Live/}).click();await page.waitForFunction(()=>window.creatorQA.player().youtube.lastLivestreamWeek>0);
 const afterLive=await page.evaluate(()=>window.creatorQA.player());assert.ok(afterLive.money>=beforeLive.money);assert.ok(afterLive.youtube.totalChannelViews>beforeLive.youtube.totalChannelViews);assert.equal(afterLive.energy.current,beforeLive.energy.current-18);assert.equal(await page.getByRole('button',{name:/Go Live/}).isDisabled(),true);
 await page.getByRole('button',{name:/^Basic Merch/}).click();await page.waitForFunction(()=>!!window.creatorQA.player().youtube.lastMerchOutcome);
 const afterMerch=await page.evaluate(()=>window.creatorQA.player());assert.equal(afterMerch.money,afterLive.money+afterMerch.youtube.lastMerchOutcome.netProfit);assert.equal(afterMerch.energy.current,afterLive.energy.current-14);assert.equal(await page.getByRole('button',{name:/^Basic Merch/}).isDisabled(),true);
 await page.getByRole('button',{name:'Enable Memberships',exact:true}).click();await page.waitForFunction(()=>window.creatorQA.player().youtube.membershipsActive);assert.equal((await page.evaluate(()=>window.creatorQA.player())).money,afterMerch.money,'Membership activation cannot mint upfront money');
 await page.screenshot({path:path.join(out,'money-390.png')});
 await page.setViewportSize({width:320,height:740});await page.screenshot({path:path.join(out,'money-320.png')});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({status:'PASS',uploads:{count:6,trust:uploads.youtube.audienceTrust,mood:uploads.youtube.fanMood,energy:uploads.energy.current,subscribers:uploads.youtube.subscribers,totalViews:uploads.youtube.totalChannelViews},signedContractPayout:paid,zeroEnergyPostsBlocked:true,liveAndMerchSettlement:true,membershipActivation:true,reloadRetainsLedger:true,pageErrors:errors},null,2));console.log('Creator UI: six uploads, initial trailer views, stat caps, zero-energy guards, legacy signed payout, live, merch, memberships, reload and 320/390px passed.');
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1});
