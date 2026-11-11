import {spawn,execFileSync} from 'node:child_process';
import {openSync,closeSync,writeFileSync,readFileSync,unlinkSync,existsSync} from 'node:fs';
const [label,heapText,script,...args]=process.argv.slice(2),heap=Number(heapText);
const rssLimit=Number(process.env.AE_BUILD_RSS_MIB||2560);if(![2560,3072].includes(rssLimit))throw Error('Unsupported memory bound');
const root='/private/tmp/actor-save-round-20261104-Lm5LRx',lockPath=root+'/worker.lock';
if(!label||!script||heap<128||heap>2048)throw Error('Bounded arguments required');
let lock;try{lock=openSync(lockPath,'wx');writeFileSync(lock,String(process.pid));}catch(error){
 if(error.code!=='EEXIST')throw error;const pid=Number(readFileSync(lockPath,'utf8'));let alive=true;
 try{process.kill(pid,0);}catch(e){if(e.code==='ESRCH')alive=false;else throw e;}
 if(alive)throw Error('This task already has a worker');unlinkSync(lockPath);lock=openSync(lockPath,'wx');writeFileSync(lock,String(process.pid));
}
const swap=()=>{const m=execFileSync('/usr/sbin/sysctl',['vm.swapusage'],{encoding:'utf8'}).match(/used = ([\d.]+)([MG])/);return m?Number(m[1])*(m[2]==='G'?1024:1):0;};
let child,timer,stopReason=null,peak=0,growth=0,warning=false,peakProcesses='';
const log=openSync(root+'/'+label+'.log','w'),start=Date.now();
const stop=reason=>{if(stopReason)return;stopReason=reason;try{process.kill(-child.pid,'SIGTERM');}catch{}};
try{
 const initial=swap();execFileSync('/bin/ps',['-axo','pid=,ppid=,rss=']);
 const freeNow=()=>Number(execFileSync('/usr/bin/memory_pressure',['-Q'],{encoding:'utf8'}).match(/free percentage: (\d+)/)?.[1]||0);
 if(freeNow()<30)throw Error('Not enough starting memory headroom');
 child=spawn(process.execPath,[`--max-old-space-size=${heap}`,'--expose-gc',script,...args],{env:{...process.env,GOMAXPROCS:process.env.GOMAXPROCS||'2',GOMEMLIMIT:process.env.GOMEMLIMIT||'256MiB'},stdio:['ignore',log,log],detached:true});
 process.once('SIGTERM',()=>stop('Terminated'));process.once('SIGINT',()=>stop('Interrupted'));
 timer=setInterval(()=>{try{
  const rows=execFileSync('/bin/ps',['-axo','pid=,ppid=,rss='],{encoding:'utf8'}).trim().split('\n').map(s=>s.trim().split(/\s+/).map(Number)),owned=new Set([child.pid]);
  for(let i=0;i<10;i++)for(const [pid,parent]of rows)if(owned.has(parent))owned.add(pid);
  const rss=rows.reduce((n,[pid,,kb])=>n+(owned.has(pid)?kb:0),0)/1024;
  if(rss>peak){peak=rss;peakProcesses=execFileSync('/bin/ps',['-o','pid=,ppid=,rss=,comm=','-p',[...owned].join(',')],{encoding:'utf8'}).trim();}
  growth=Math.max(growth,swap()-initial);const free=freeNow();if(growth>512)warning=true;
  if(rss>rssLimit)stop('Own tree exceeded '+rssLimit+' MiB');else if(free<20)stop('Global free memory below 20 percent');else if(warning&&free<30)stop('Shared swap growth with free memory below 30 percent');
 }catch(error){stop('Cannot enforce guard: '+error.message);}},1000);
 const result=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',(code,signal)=>resolve({code,signal}));});
 clearInterval(timer);const report={label,heapMiB:heap,rssLimitMiB:rssLimit,peakOwnedTreeRssMiB:peak,peakGlobalSwapGrowthMiB:growth,swapWarning:warning,stopReason,exitCode:result.code,signal:result.signal,elapsedMs:Date.now()-start,peakProcesses};
 writeFileSync(root+'/'+label+'-resource.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,peakProcesses:undefined}));process.exitCode=result.code===0&&!stopReason?0:1;
}finally{clearInterval(timer);closeSync(log);closeSync(lock);if(existsSync(lockPath))unlinkSync(lockPath);}
