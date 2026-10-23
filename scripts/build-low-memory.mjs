import {spawn,execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
// This project needs more than a 1536MB build heap. Keep the production build
// bounded and solitary, with the same minification and Vite configuration.
const child=spawn(process.execPath,['--max-old-space-size=2048',fileURLToPath(new URL('../node_modules/vite/bin/vite.js',import.meta.url)),'build',...process.argv.slice(2)],
 {stdio:'inherit',detached:process.platform!=='win32',env:{...process.env,GOMAXPROCS:'2',GOMEMLIMIT:'512MiB'}});
let stopped,peakKiB=0,checking=false;
const readSwap=()=>{if(process.platform!=='darwin')return 0;const text=execFileSync('/usr/sbin/sysctl',['vm.swapusage'],{encoding:'utf8'}),m=text.match(/used = ([\d.]+)([MG])/);return m?Number(m[1])*(m[2]==='G'?1024:1):0};
const initialSwap=readSwap();
const stop=reason=>{if(stopped)return;stopped=reason;try{if(process.platform==='win32')child.kill('SIGTERM');else process.kill(-child.pid,'SIGTERM')}catch{}};
const check=()=>{
 if(checking||process.platform==='win32')return;checking=true;
 try{
  const rows=execFileSync('/bin/ps',['-axo','pid=,ppid=,rss='],{encoding:'utf8'}).trim().split('\n').map(s=>s.trim().split(/\s+/).map(Number)),owned=new Set([child.pid]);
  for(let n=0;n<8;n++)for(const [pid,parent] of rows)if(owned.has(parent))owned.add(pid);
  const rss=rows.reduce((n,[pid,,rss])=>n+(owned.has(pid)?rss:0),0);peakKiB=Math.max(peakKiB,rss);
  if(rss>3*1024*1024)stop('Owned process tree exceeded 3GiB RSS');
  if(process.platform==='darwin'){
   const free=execFileSync('/usr/bin/memory_pressure',['-Q'],{encoding:'utf8'}).match(/free percentage: (\d+)/);
   if(free&&Number(free[1])<15)stop('System memory pressure threshold');
   if(readSwap()-initialSwap>512)stop('System swap grew over 512MiB');
  }
 }catch(error){stop('Cannot enforce memory guard: '+error.message)}finally{checking=false}
};
const timer=setInterval(check,1000);process.once('SIGINT',()=>stop('Interrupted'));process.once('SIGTERM',()=>stop('Terminated'));
child.once('error',error=>{clearInterval(timer);console.error(error);process.exitCode=1});
child.once('close',(code,signal)=>{clearInterval(timer);const result={exitCode:code,signal,heapMB:2048,peakOwnedTreeRssMiB:Math.round(peakKiB/102.4)/10,stopReason:stopped||null,systemGuard:process.platform};
 console.log('Bounded build:',JSON.stringify(result));if(process.env.LOW_MEMORY_BUILD_REPORT)writeFileSync(process.env.LOW_MEMORY_BUILD_REPORT,JSON.stringify(result,null,2));process.exitCode=code===0&&!stopped?0:1});
