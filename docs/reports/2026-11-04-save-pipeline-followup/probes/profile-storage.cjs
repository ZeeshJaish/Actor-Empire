const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root='/private/tmp/actor-save-round-20261104-Lm5LRx',cwd=process.cwd(),{build,stop}=require(cwd+'/node_modules/esbuild'),{chromium}=require('/Users/zeesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const before=process.env.PROBE_BEFORE==='1',label=process.env.PROBE_LABEL||'storage-baseline';
const fixture='/private/tmp/actor-week-20261104-8kqvqhnz/career.json';
const prefix='const __time=(name,run)=>{const t=performance.now();try{return run()}finally{const bag=(globalThis.__saveWork||={}),m=(bag[name]||={count:0,ms:0});m.count++;m.ms+=performance.now()-t;}};\n';
(async()=>{
 const entry=root+'/storage-entry.ts';fs.writeFileSync(entry,`import '${cwd}/scripts/fixtures/saveBlocksBrowserFixture';import {prepareVerifiedPlayerForPersistence} from '${cwd}/services/savePreparation';(window as any).saveBlocksQA.prepare=prepareVerifiedPlayerForPersistence;`);
 await build({entryPoints:[entry],outfile:root+'/'+label+'.bundle.js',bundle:true,format:'esm',platform:'browser',loader:{'.csv':'text','.css':'empty'},define:{'import.meta.env':'{}'},logLevel:'error',plugins:[{name:'save-cost-probes',setup(api){api.onLoad({filter:/\/services\/.*\.ts$/},args=>{
 const rel=path.relative(cwd,args.path),file=before&&fs.existsSync(root+'/before/'+rel)?root+'/before/'+rel:args.path;let text=fs.readFileSync(file,'utf8'),names=[];if(process.env.PROBE_SLIM==='1'&&rel==='services/saveIntegrity.ts')text=text.replace('const canonical = compactIndustryIntelligenceState(state!);',fs.readFileSync(root+'/slim-snippet.txt','utf8'));
 if(rel==='services/saveIntegrity.ts')names=['userCareerRecordsState','studioCompanyState','industryIntelligenceState','worldEconomyState','createProtectedState','verifySaveIntegrity','createCheckedSaveIntegrityManifest'];
 if(rel==='services/stableSaveHash.ts')names=['stableSaveHash'];
 if(rel==='services/saveCompaction.ts')names=['compactPlayerForPersistence'];
 if(rel==='services/worldEconomy/worldEconomyIntegrity.ts')names=['validateWorldEconomyCandidate'];
 if(!names.length)return {contents:text,loader:'ts',resolveDir:path.dirname(args.path)};
 let suffix='';for(const name of names){const exported=text.includes('export const '+name+' =')||text.includes('export const '+name+'=');const re=new RegExp('(?:export )?const '+name+'\\s*=');assert.ok(re.test(text),name);text=text.replace(re,'const '+name+'Impl =');suffix+=`\n${exported?'export ':''}const ${name}=(...args:any[])=>__time('${name}',()=>(${name}Impl as any)(...args));`;}
 return {contents:prefix+text+suffix,loader:'ts',resolveDir:path.dirname(args.path)};
 });}}]});stop();
 const server=http.createServer((req,res)=>{const file=req.url==='/career.json'?fixture:req.url==='/fixture.js'?root+'/'+label+'.bundle.js':null;res.setHeader('Content-Type',req.url==='/fixture.js'?'text/javascript':req.url==='/career.json'?'application/json':'text/html');if(file)fs.createReadStream(file).pipe(res);else res.end('<!doctype html><script type="module" src="/fixture.js"></script>');});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,args:['--js-flags=--max-old-space-size=768']});
 try{const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>!!window.saveBlocksQA);
 const cpu=await page.context().newCDPSession(page);await cpu.send('Profiler.enable');await cpu.send('Profiler.start');
 const data=await page.evaluate(async()=>{
 const q=window.saveBlocksQA,pack=await(await fetch('/career.json')).json();let p=pack.player;await q.rawWrite(q.key,p);await q.rawWrite(q.key+'__integrity',pack.manifest);
 const metrics=()=>JSON.parse(JSON.stringify(globalThis.__saveWork||{})),reset=()=>{globalThis.__saveWork={};};
 const add=(name,ms)=>{const bag=globalThis.__saveWork,m=bag[name]||={count:0,ms:0};m.count++;m.ms+=ms;};
 const result=Object.getOwnPropertyDescriptor(IDBRequest.prototype,'result');Object.defineProperty(IDBRequest.prototype,'result',{...result,get(){const s=performance.now();try{return result.get.call(this)}finally{add('deserialize',performance.now()-s)}}});
 const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value,key){const s=performance.now();try{return put.call(this,value,key)}finally{add('put:'+key,performance.now()-s)}};
 const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))).map(v=>v.toString(16).padStart(2,'0')).join('');
 const rows=[];for(let i=0;i<3;i++){p.money+=10;reset();const s=performance.now(),prepared=q.prepare(p,'AUTOSAVE'),prepare={ms:performance.now()-s,metrics:metrics()};p=prepared.player;const expected=await hash(p);reset();const w=performance.now();await q.saveVerifiedGameData(q.key,p,prepared.manifest);const write={ms:performance.now()-w,metrics:metrics()};reset();const l=performance.now(),loaded=await q.loadVerifiedGameData(q.key),load={ms:performance.now()-l,metrics:metrics()};if(loaded.status!=='CURRENT'||await hash(loaded.player)!==expected)throw Error('Complete player changed');rows.push({iteration:i,prepare,write,load});}
 return {scope:'Instrumented actual IndexedDB/preparation of retained large save; controlled +10 dollars, not gameplay earnings or app latency',rows};
 });const profile=await cpu.send('Profiler.stop');fs.writeFileSync(root+'/'+label+'.cpuprofile',JSON.stringify(profile.profile));assert.deepEqual(errors,[]);fs.writeFileSync(root+'/'+label+'.json',JSON.stringify(data,null,2));console.log(JSON.stringify(data.rows.map(r=>({iteration:r.iteration,prepareMs:r.prepare.ms,writeMs:r.write.ms,loadMs:r.load.ms,prepare:r.prepare.metrics,write:r.write.metrics}))));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
