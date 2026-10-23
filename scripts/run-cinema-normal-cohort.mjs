import {build} from 'esbuild';
import {spawn,execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,existsSync,openSync,closeSync,unlinkSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {resolve,relative,dirname} from 'node:path';
const out=resolve(process.env.CAREER_OUTPUT||'/private/tmp/actor-normal-career-cohort-20261023');mkdirSync(out,{recursive:true});
const kind=process.env.CAREER_AUDIT_KIND||'normal';if(!['normal','phenomenon','mature'].includes(kind))throw Error('Unknown career audit kind');
const sourceRef=process.env.CAREER_SOURCE_REF;
const sourceDir=process.env.CAREER_SOURCE_DIR,overridesDir=process.env.CAREER_SOURCE_OVERRIDES_DIR;
const seeds=(process.env.CAREER_SEEDS||'0,1,2,3').split(',').map(Number),horizon=Number(process.env.CAREER_WEEKS||208),batch=Number(process.env.CAREER_BATCH_WEEKS||6);
const heap=Number(process.env.CAREER_HEAP_MB||1536);if(!Number.isInteger(heap)||heap<512||heap>1536)throw Error('Use a bounded 512–1536MB worker heap');
if(!seeds.every(Number.isSafeInteger)||!Number.isInteger(horizon)||horizon<1||!Number.isInteger(batch)||batch<1||batch>13)throw Error('Use valid seeds/horizon and batches of 1–13 weeks');
const lockPath='/private/tmp/actor-cinema-normal-cohort.lock';let lock;
try{lock=openSync(lockPath,'wx');writeFileSync(lock,String(process.pid))}catch(e){
 if(e.code!=='EEXIST')throw e;const pid=Number(readFileSync(lockPath,'utf8'));
 try{process.kill(pid,0);throw Error('A normal-cohort controller is still active')}catch(check){if(check.code!=='ESRCH')throw check}
 unlinkSync(lockPath);lock=openSync(lockPath,'wx');writeFileSync(lock,String(process.pid));
}
const bundle=out+'/normal-worker.mjs',digest=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
try{
 if(!existsSync(bundle)){
  const tracked=sourceRef?new Set(execFileSync('git',['ls-tree','-r','--name-only',sourceRef],{encoding:'utf8'}).trim().split('\n')):null;
  const cache=new Map();
  const readSource=p=>{
   if(cache.has(p))return cache.get(p);
   if(sourceRef&&!tracked.has(p)&&!p.startsWith('scripts/'))throw Error('Unpinned product dependency: '+p);
   const override=overridesDir&&resolve(overridesDir,p),frozenPath=sourceDir&&resolve(sourceDir,p);
   if(sourceDir&&!existsSync(frozenPath)&&!p.startsWith('scripts/'))throw Error('Unfrozen product dependency: '+p);
   const contents=override&&existsSync(override)?readFileSync(override,'utf8'):frozenPath&&existsSync(frozenPath)?readFileSync(frozenPath,'utf8'):
    sourceRef&&tracked.has(p)?execFileSync('git',['show',`${sourceRef}:${p}`],{encoding:'utf8',maxBuffer:16e6}):readFileSync(p,'utf8');cache.set(p,contents);return contents;
  };
  const frozen=new Map(['hooks/useGameActions.ts','App.tsx','scripts/audit-actor-career-flow.ts',...(kind==='mature'?['views/mobile/MobilePage.tsx','views/mobile/TeamApp.tsx','views/PressConferenceEvent.tsx','views/AwardNightFlow.tsx']:[])].map(p=>[p,readSource(p)]));
  const entry=kind==='mature'?'scripts/audit-cinema-mature-career.ts':kind==='normal'?'scripts/audit-cinema-normal-cohort.ts':'scripts/audit-cinema-phenomenon.ts';
  const built=await build({entryPoints:[entry],bundle:true,platform:'node',format:'esm',loader:{'.csv':'text','.css':'empty'},outfile:bundle,metafile:true,logLevel:'error',plugins:[{
   name:'freeze-audit-ui-sources',setup(api){api.onLoad({filter:/\.(tsx?|json|csv)$/},args=>{
    const p=relative(process.cwd(),args.path);if(p.startsWith('node_modules/')||p.startsWith('../'))return;
    const isHarness=/(actorCareerActions|cinemaNormalAppPolicy|cinemaMatureAppPolicy)\.ts$/.test(args.path);
    if(!sourceRef&&!sourceDir&&!(overridesDir&&existsSync(resolve(overridesDir,p)))&&!isHarness)return;
    let contents=readSource(p);for(const [p,text] of frozen){
     const pattern=`readFileSync('${p}', 'utf8')`,compact=`readFileSync('${p}','utf8')`;
     contents=contents.replace(pattern,JSON.stringify(text)).replace(compact,JSON.stringify(text));
    }
    return {contents,loader:args.path.endsWith('.tsx')?'tsx':args.path.endsWith('.json')?'json':args.path.endsWith('.csv')?'text':'ts',resolveDir:dirname(args.path)};
   })}
  }]});
  const files=[...new Set([...Object.keys(built.metafile.inputs).map(p=>p.split('?')[0]),...frozen.keys()])].filter(p=>existsSync(p)&&!p.includes('node_modules/'));
  writeFileSync(out+'/executable.json',JSON.stringify({sha256:digest(bundle),sourceHashes:Object.fromEntries(files.map(p=>[p,createHash('sha256').update(readSource(p)).digest('hex')])),horizon,batch,kind,sourceRef,sourceDir,overridesDir,policy:'Exact pinned actor-career App callbacks; module init seeded separately per career'},null,2));
 }
 const metadata=JSON.parse(readFileSync(out+'/executable.json','utf8'));if(metadata.sha256!==digest(bundle)||metadata.horizon!==horizon||(metadata.kind||'normal')!==kind||(metadata.sourceRef||'')!==(sourceRef||'')||(metadata.sourceDir||'')!==(sourceDir||'')||(metadata.overridesDir||'')!==(overridesDir||''))throw Error('Pinned source, kind, revision or horizon differs');
 if(process.env.CAREER_PIN_ONLY==='1'){console.log(JSON.stringify({pinned:metadata.sha256,out}));}
 else {
 let peak=0,stopReason=null;
 for(const seed of seeds)while(true){
  const reportFile=`${out}/career-${seed}.json`,prior=existsSync(reportFile)?JSON.parse(readFileSync(reportFile,'utf8')):null;
  if(prior&&prior.executable!==metadata.sha256)throw Error('Checkpoint/report executable differs');
  const observeThrough=Number(process.env.CAREER_OBSERVE_THROUGH||0);
  if(prior?.status==='CHECKPOINT_READY'&&observeThrough>0&&prior.weeks>=observeThrough){console.log(JSON.stringify({seed,retained:'OBSERVATION_COMPLETE',weeks:prior.weeks}));break}
  if(prior&&['HORIZON_COMPLETE','CAREER_ENDED','UNFUNDED','ATTAINMENT_REACHED','NATURALLY_CLOSED','OWNER_READY'].includes(prior.status)){console.log(JSON.stringify({seed,retained:prior.status,weeks:prior.weeks}));break}
  if(prior?.status==='FAILURE')throw Error('Retained failed evidence: '+prior.failure);
  const moduleSeed=(20261023+(kind==='phenomenon'?0:seed)*7919)>>>0;
  const bootstrap=`let state=${moduleSeed},tick=0;Math.random=()=>{let t=state+=0x6D2B79F5;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296};Date.now=()=>1800000000000+${seed}*10000000+tick++;await import(${JSON.stringify(pathToFileURL(bundle).href)});`;
  // Verify the guard is available before spawning a worker; a denied system probe
  // must never leave an unmonitored child running after the controller exits.
  const readSwap=()=>{const s=execFileSync('/usr/sbin/sysctl',['vm.swapusage'],{encoding:'utf8'}),m=s.match(/used = ([\d.]+)([MG])/);return m?Number(m[1])*(m[2]==='G'?1024:1):0};
  const initialSwap=readSwap();
  execFileSync('/bin/ps',['-axo','pid=,ppid=,rss='],{encoding:'utf8'});
  execFileSync('/usr/bin/memory_pressure',['-Q'],{encoding:'utf8'});
  const log=openSync(`${out}/career-${seed}.log`,'a');
  const child=spawn(process.execPath,[`--max-old-space-size=${heap}`,'--expose-gc','--input-type=module','--eval',bootstrap],{env:{...process.env,CAREER_OUTPUT:out,CAREER_SEED:String(seed),CAREER_WEEKS:String(horizon),CAREER_BATCH_WEEKS:String(batch)},stdio:['ignore',log,log],detached:true});
  const terminate=reason=>{if(stopReason)return;stopReason=reason;try{process.kill(-child.pid,'SIGTERM')}catch{}};
  const onStop=()=>terminate('Controller interrupted');process.once('SIGINT',onStop);process.once('SIGTERM',onStop);
  const timer=setInterval(()=>{try{
   const rows=execFileSync('/bin/ps',['-axo','pid=,ppid=,rss='],{encoding:'utf8'}).trim().split('\n').map(s=>s.trim().split(/\s+/).map(Number)),owned=new Set([child.pid]);
   for(let i=0;i<8;i++)for(const [pid,ppid] of rows)if(owned.has(ppid))owned.add(pid);
   const rss=rows.reduce((n,[pid,,r])=>n+(owned.has(pid)?r:0),0)/1024;peak=Math.max(peak,rss);
   if(rss>3072)terminate('Owned worker tree exceeded 3GiB');
   const m=execFileSync('/usr/bin/memory_pressure',['-Q'],{encoding:'utf8'}).match(/free percentage: (\d+)/);
   if(m&&Number(m[1])<15)terminate('System memory pressure');
   if(readSwap()-initialSwap>512)terminate('System swap growth exceeded 512MiB');
  }catch(e){terminate('Cannot enforce memory guard: '+e.message)}},1000);
  const result=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',(code,signal)=>resolve({code,signal}))});
  clearInterval(timer);closeSync(log);process.removeListener('SIGINT',onStop);process.removeListener('SIGTERM',onStop);
  const memory={peakOwnedWorkerTreeRssMiB:peak,stopReason,exitCode:result.code,signal:result.signal,heapMiB:heap,batchWeeks:batch,seed,at:new Date().toISOString()};
  writeFileSync(out+'/memory.json',JSON.stringify(memory,null,2));
  writeFileSync(out+'/memory-history.jsonl',JSON.stringify(memory)+'\n',{flag:'a'});
  if(stopReason||result.code!==0)throw Error(stopReason||`Career ${seed} exited ${result.code}, signal ${result.signal}; inspect its log`);
  const report=JSON.parse(readFileSync(reportFile,'utf8'));
  console.log(JSON.stringify({seed,status:report.status,weeks:report.weeks,cash:report.cash,grossB:report.grossB,films:report.summary.all.completed,small:report.summary.small.completed,own:report.summary.player.completed,peakMiB:Math.round(peak)}));
  if(report.status!=='CHECKPOINT_READY'||Number(process.env.CAREER_OBSERVE_THROUGH||0)>0&&report.weeks>=Number(process.env.CAREER_OBSERVE_THROUGH))break;
 }
 }
}finally{closeSync(lock);try{if(Number(readFileSync(lockPath,'utf8'))===process.pid)unlinkSync(lockPath)}catch{}}
