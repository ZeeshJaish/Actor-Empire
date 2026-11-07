// Controlled storage-only benchmark; this does not simulate box-office earnings.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {build,stop}=require('esbuild');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fixture=process.env.CINEMA_BROWSER_FIXTURE;assert.ok(fixture);const baseline=process.env.SAVE_STORAGE_BASELINE==='1';
const out=path.resolve(process.env.SAVE_STORAGE_OUTPUT||'output/playwright/save-storage-profile');fs.mkdirSync(out,{recursive:true});
(async()=>{
const plugins=baseline?[{name:'frozen-storage',setup(builder){builder.onLoad({filter:/\/services\/(storage|saveGenerations|stableSaveHash)\.ts$/},args=>({contents:fs.readFileSync('/private/tmp/actor-save-storage-20261030/before/services/'+path.basename(args.path),'utf8'),loader:'ts',resolveDir:path.dirname(args.path)}));}}]:[];
await build({entryPoints:['scripts/fixtures/saveBlocksBrowserFixture.ts'],bundle:true,platform:'browser',format:'esm',loader:{'.csv':'text','.css':'empty'},define:{'import.meta.env':'{}'},outfile:path.join(out,'fixture.bundle'),plugins,logLevel:'error'});stop();
const server=http.createServer((req,res)=>{if(req.url==='/career.json'){res.setHeader('Content-Type','application/json');fs.createReadStream(fixture).pipe(res);return;}
res.setHeader('Content-Type',req.url==='/fixture.js'?'text/javascript':'text/html');res.end(req.url==='/fixture.js'?fs.readFileSync(path.join(out,'fixture.bundle')):'<!doctype html><script type="module" src="/fixture.js"></script>');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,args:['--js-flags=--max-old-space-size=768']});
try{const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port+(process.env.SAVE_STORAGE_BLOCKS==='1'?'/?blocks=1':''));await page.waitForFunction(()=>!!window.saveBlocksQA);
const cpu=process.env.SAVE_STORAGE_CPU?await page.context().newCDPSession(page):null;if(cpu){await cpu.send('Profiler.enable');await cpu.send('Profiler.start');}
const result=await page.evaluate(async()=>{const q=window.saveBlocksQA,pack=await(await fetch('/career.json')).json(),p=pack.player,rows=[];
await q.rawWrite(q.key,p);await q.rawWrite(q.key+'__integrity',pack.manifest);
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))))).map(x=>x.toString(16).padStart(2,'0')).join('');
for(let i=0;i<3;i++){
 p.money+=10;const manifest=q.sign(p,'AUTOSAVE',1000+i),expected=await hash(p),start=performance.now();
 await q.saveVerifiedGameData(q.key,p,manifest);const writeMs=performance.now()-start;
 const readStart=performance.now(),loaded=await q.loadVerifiedGameData(q.key),readMs=performance.now()-readStart;
 if(loaded.status!=='CURRENT'||!q.verify(loaded.player,manifest).ok||await hash(loaded.player)!==expected)throw Error('Full retained career changed');
 rows.push({iteration:i,writeMs,readMs,playerJsonSha256:expected,manifestDigest:manifest.digest});
}
return {scope:'Retained large payload; controlled money +10 autosaves, storage only; no gameplay earnings claim',rows};
});if(cpu){const data=await cpu.send('Profiler.stop');fs.writeFileSync(path.join(out,'storage.cpuprofile'),JSON.stringify(data.profile));await cpu.detach();}result.mode=baseline?'baseline':process.env.SAVE_STORAGE_BLOCKS==='1'?'experimental-blocks':'production-fast-hash';fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
