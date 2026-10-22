/* Actual IndexedDB regression: an atomic promotion between read transactions. Authored isolated context only. */
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const browser=await chromium.launch({headless:true}),context=await browser.newContext(),page=await context.newPage();
try{await page.goto(process.env.CINEMA_APP_URL||'http://127.0.0.1:5197');const result=await page.evaluate(async()=>{
 const s=await import('/services/storage.ts'),i=await import('/services/saveIntegrity.ts'),{INITIAL_PLAYER}=await import('/types.ts');
 const key='atomic-snapshot-authored',p=structuredClone(INITIAL_PLAYER);p.id=key;p.name='Atomic snapshot audit';
 await s.saveVerifiedGameData(key,p,i.createSaveIntegrityManifest(p,'MIGRATION'));
 const old={...p,money:p.money+100};await s.saveVerifiedGameData(key,old,i.createSaveIntegrityManifest(old,'AUTOSAVE'));
 const next={...old,money:old.money+100},manifest=i.createSaveIntegrityManifest(next,'AUTOSAVE');
 const transact=IDBDatabase.prototype.transaction;let fired=false,promoted;
 IDBDatabase.prototype.transaction=function(...args){
  const tx=transact.apply(this,args);
  if(args[1]==='readonly'&&!fired){fired=true;tx.addEventListener('complete',()=>{
   const change=transact.call(this,'saves','readwrite'),store=change.objectStore('saves');
   store.put(next,key);store.put(manifest,key+'__integrity');
   promoted=new Promise((resolve,reject)=>{change.oncomplete=resolve;change.onerror=reject;change.onabort=reject});
  },{once:true})}
  return tx;
 };
 let first;try{first=await s.loadVerifiedGameData(key)}finally{IDBDatabase.prototype.transaction=transact}
 if(!fired)throw new Error('Race trigger was not exercised');await promoted;
 const second=await s.loadVerifiedGameData(key);
 const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('ActorEmpireDB',1);request.onsuccess=()=>resolve(request.result);request.onerror=reject});
 await new Promise((resolve,reject)=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put({...next,money:next.money+1},key);tx.oncomplete=resolve;tx.onerror=reject});db.close();
 const damaged=await s.loadVerifiedGameData(key);
 return {first:{status:first.status,money:first.player?.money,violations:first.violations},second:{status:second.status,money:second.player?.money},damaged:{status:damaged.status,violations:damaged.violations},oldMoney:old.money,nextMoney:next.money};
});assert.equal(result.first.status,'CURRENT');assert.equal(result.first.money,result.oldMoney);assert.equal(result.second.status,'CURRENT');assert.equal(result.second.money,result.nextMoney);assert.equal(result.damaged.status,'RECOVERY_AVAILABLE');assert.ok(result.damaged.violations.length>0);
if(process.env.CINEMA_SAVE_SNAPSHOT_OUTPUT)fs.writeFileSync(process.env.CINEMA_SAVE_SNAPSHOT_OUTPUT,JSON.stringify(result,null,2));console.log('PASS actual IndexedDB atomic snapshot, concurrent promotion and true-damage recovery',JSON.stringify(result));
}finally{await context.close();await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
