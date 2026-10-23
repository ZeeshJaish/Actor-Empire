import {build} from 'esbuild';
import {spawn} from 'node:child_process';
import {mkdirSync,existsSync,readFileSync,writeFileSync,openSync,closeSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const out=resolve(process.env.REWARD_OUTPUT||'/tmp/ae-reward-pacing-baseline');mkdirSync(out,{recursive:true});
const strategies=(process.env.REWARD_STRATEGIES||'entry,balanced,cash,energy,combined,team').split(',');
const seeds=(process.env.REWARD_SEEDS||'0,1').split(',').map(Number);
const horizon=Number(process.env.REWARD_WEEKS||104),batch=Number(process.env.REWARD_BATCH||8);
const bundle=out+'/worker.mjs',digest=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
if(!existsSync(bundle)){
 const frozen=new Map(['App.tsx','hooks/useGameActions.ts','views/mobile/TeamApp.tsx'].map(p=>[p,readFileSync(p,'utf8')]));
 const built=await build({entryPoints:[process.env.REWARD_ENTRY||'scripts/audit-actor-reward-curve.ts'],bundle:true,platform:'node',format:'esm',loader:{'.csv':'text'},outfile:bundle,metafile:true,logLevel:'error',plugins:[{
 name:'pin-real-callback-sources',setup(api){api.onLoad({filter:/(actorCareerActions|actorRewardScenarioActions)\.ts$/},args=>{
 let text=readFileSync(args.path,'utf8');for(const [p,s] of frozen)for(const sep of [',',', '])text=text.replace(`readFileSync('${p}'${sep}'utf8')`,JSON.stringify(s));return {contents:text,loader:'ts'};
 })}
 }]});
 const files=[...new Set([...Object.keys(built.metafile.inputs),...frozen.keys()])].filter(p=>existsSync(p)&&!p.includes('node_modules/'));
 writeFileSync(out+'/executable.json',JSON.stringify({sha256:digest(bundle),sourceHashes:Object.fromEntries(files.map(p=>[p,digest(p)])),horizon,strategies,seeds,simulatedReceipts:true,realPurchases:false,teamCash:process.env.REWARD_TEAM_CASH||'cash_75000',genreOverride:process.env.REWARD_GENRE||null},null,2));
}
const meta=JSON.parse(readFileSync(out+'/executable.json','utf8'));if(meta.sha256!==digest(bundle)||meta.horizon!==horizon)throw Error('Pinned executable/horizon mismatch');
for(const strategy of strategies)for(const seed of seeds){
 const dir=out+'/'+strategy;mkdirSync(dir,{recursive:true});
 for(let turn=0;turn<Math.ceil(horizon/batch)+2;turn++){
  const f=`${dir}/career-${seed}-results.json`,prior=existsSync(f)?JSON.parse(readFileSync(f,'utf8')):null;
  if(prior&&prior.status!=='CHECKPOINT_READY'){if(prior.status==='FAILURE')throw Error(prior.failure);break}
  const init=(1337+seed)>>>0;
  const boot=`let state=${init},tick=0;Math.random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};Date.now=()=>1800000000000+tick++;await import(${JSON.stringify(pathToFileURL(bundle).href)});`;
  const log=openSync(`${dir}/career-${seed}.log`,'a');
  const child=spawn(process.execPath,['--max-old-space-size=1024','--input-type=module','--eval',boot],{env:{...process.env,REWARD_STRATEGY:strategy,ACTOR_CAREER_SEED:String(seed),ACTOR_CAREER_GENRE:process.env.REWARD_GENRE||(seed%2?'COMEDY':'DRAMA'),ACTOR_CAREER_OUTPUT:dir,ACTOR_CAREER_WEEKS:String(horizon),ACTOR_CAREER_BATCH:String(batch)},stdio:['ignore',log,log]});
  const code=await new Promise((res,rej)=>{child.on('error',rej);child.on('exit',res)});closeSync(log);
  if(code)throw Error(`${strategy}/${seed} failed: ${readFileSync(`${dir}/career-${seed}.log`,'utf8').slice(-2500)}`);
  const r=JSON.parse(readFileSync(f,'utf8'));console.log(JSON.stringify({strategy,seed,status:r.status,weeks:r.weeks,craft:r.curve.at(-1).craft,fame:r.fame,cash:r.cash,credits:r.credits.length,peakMiB:Math.round(r.peakRSS/1048576)}));
  if(r.status!=='CHECKPOINT_READY')break;
 }
}
