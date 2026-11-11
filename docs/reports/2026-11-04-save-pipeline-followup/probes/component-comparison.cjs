const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root='/private/tmp/actor-save-round-20261104-Lm5LRx',cwd=process.cwd();
const {build,stop}=require(cwd+'/node_modules/esbuild');
const {chromium}=require('/Users/zeesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fixture='/private/tmp/actor-week-20261104-8kqvqhnz/career.json';
(async()=>{
 const entry=root+'/component-entry.ts';
 fs.writeFileSync(entry,`import '${cwd}/scripts/fixtures/saveBlocksBrowserFixture';
 import {prepareVerifiedPlayerForPersistence} from '${cwd}/services/savePreparation';
 import {verifySaveIntegrity as oldVerify} from 'frozen-integrity';
 import {buildCinemaAudienceSnapshot as oldAudience} from 'frozen-audience';
 import {buildCinemaAudienceSnapshot as audience} from '${cwd}/services/boxOffice/boxOfficeAudience';
 import {buildCinemaWeekInput as input} from '${cwd}/services/boxOffice/boxOfficeWeek';
 Object.assign((window as any).saveBlocksQA,{prepare:prepareVerifiedPlayerForPersistence,oldVerify,oldAudience,audience,input});`);
 await build({entryPoints:[entry],outfile:root+'/component.bundle.js',bundle:true,format:'esm',platform:'browser',loader:{'.csv':'text','.css':'empty'},define:{'import.meta.env':'{}'},logLevel:'error',plugins:[{name:'freeze-task-start-functions',setup(api){
  api.onResolve({filter:/^frozen-(integrity|audience|hash)$/},args=>({path:args.path,namespace:'task-start'}));
  api.onLoad({filter:/.*/,namespace:'task-start'},args=>{
   const relative=args.path==='frozen-integrity'?'services/saveIntegrity.ts':args.path==='frozen-hash'?'services/stableSaveHash.ts':'services/boxOffice/boxOfficeAudience.ts';
   let contents=fs.readFileSync(root+'/before/'+relative,'utf8');
   if(args.path==='frozen-integrity'){assert.ok(contents.includes("from './stableSaveHash'"));contents=contents.replace("from './stableSaveHash'","from 'frozen-hash'");}
   return {contents,loader:'ts',resolveDir:path.dirname(path.join(cwd,relative))};
  });
 }}]});stop();
 const server=http.createServer((req,res)=>{const file=req.url==='/career.json'?fixture:req.url==='/fixture.js'?root+'/component.bundle.js':null;res.setHeader('Content-Type',req.url==='/fixture.js'?'text/javascript':req.url==='/career.json'?'application/json':'text/html');if(file)fs.createReadStream(file).pipe(res);else res.end('<!doctype html><script type="module" src="/fixture.js"></script>');});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,args:['--js-flags=--max-old-space-size=768']});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>!!window.saveBlocksQA?.oldVerify);
  const data=await page.evaluate(async()=>{
   const q=window.saveBlocksQA,pack=await(await fetch('/career.json')).json(),prepared=q.prepare(pack.player,'AUTOSAVE');
   const p=prepared.player,manifest=prepared.manifest;
   const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))).map(v=>v.toString(16).padStart(2,'0')).join('');
   const playerBefore=await hash(p),rows=[];
   const median=values=>{const a=[...values].sort((a,b)=>a-b),i=a.length>>1;return a.length%2?a[i]:(a[i-1]+a[i])/2;};
   const summarize=name=>{const old=rows.filter(r=>r.name===name&&r.mode==='old').map(r=>r.ms),current=rows.filter(r=>r.name===name&&r.mode==='new').map(r=>r.ms);return {name,nPerMode:old.length,oldMedianMs:median(old),newMedianMs:median(current),changePercent:(median(current)/median(old)-1)*100,oldMinMs:Math.min(...old),oldMaxMs:Math.max(...old),newMinMs:Math.min(...current),newMaxMs:Math.max(...current)};};
   for(let i=-2;i<16;i++)for(const mode of i%2===0?['old','new']:['new','old']){
    const fn=mode==='old'?q.oldVerify:q.verify,t=performance.now(),result=fn(p,manifest),ms=performance.now()-t;
    if(!result.ok)throw Error(mode+' rejected identical signed player: '+JSON.stringify(result));
    if(i>=0)rows.push({name:'completeVerification',pair:i,mode,ms});
   }
   const cinema=q.input(p,p.world.cinemaMarket.lastProcessedAbsoluteWeek+1),inputBefore=await hash(cinema);
   let snapshotHash;
   for(let i=-2;i<10;i++)for(const mode of i%2===0?['old','new']:['new','old']){
    const fn=mode==='old'?q.oldAudience:q.audience,t=performance.now();let result=fn(cinema);const ms=performance.now()-t,digest=await hash(result);
    if(snapshotHash&&digest!==snapshotHash)throw Error('Complete audience snapshot changed');snapshotHash=digest;result=null;
    if(i>=0)rows.push({name:'audienceSnapshot',pair:i,mode,ms,digest});
   }
   if(await hash(p)!==playerBefore||await hash(cinema)!==inputBefore)throw Error('Read-only comparisons mutated source');
   return {scope:'Single browser, identical retained large player and cinema input, task-start/current functions in the same bundle, alternating balanced call order, 2 warm-up pairs excluded, no forced GC. CPU components only, not whole-app/device/earnings evidence.',summaries:['completeVerification','audienceSnapshot'].map(summarize),rows,playerSha256:playerBefore,cinemaInputSha256:inputBefore,snapshotSha256:snapshotHash,inputShape:{titles:cinema.titles.length,cohorts:cinema.cohorts.length,countries:cinema.countries.length},allVerificationsPassed:true,allFullSnapshotsIdentical:true,inputsUnchanged:true};
  });
  assert.deepEqual(errors,[]);fs.writeFileSync(root+'/component-comparison.json',JSON.stringify(data,null,2));console.log(JSON.stringify({...data,rows:undefined}));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
