import {spawn} from 'node:child_process';
import {readFileSync,openSync,closeSync} from 'node:fs';
const route=process.env.LIFETIME_ROUTE||'free';
for(const mode of ['neglect','overbooked']){
 const out=`/tmp/ae-lifetime-pressure-${route}-${mode}`,meta=JSON.parse(readFileSync(out+'/executable.json','utf8'));
 const log=openSync(out+'/runner.log','a');
 const child=spawn(process.execPath,['scripts/run-actor-lifetime.mjs'],{env:{...process.env,REWARD_OUTPUT:out,REWARD_STRATEGIES:route,LIFETIME_DECISIONS:mode,REWARD_WEEKS:String(meta.horizon),REWARD_BATCH:'6',REWARD_HEAP_MB:'2048'},stdio:['ignore',log,log]});
 const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve)});closeSync(log);if(code)throw Error(`${mode} failed; inspect ${out}/runner.log`);
 console.log(JSON.stringify({mode,status:JSON.parse(readFileSync(out+`/${route}/career-0-results.json`,'utf8')).status}));
}
