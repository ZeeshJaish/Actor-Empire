import {build} from 'esbuild';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
const route=process.env.LIFETIME_ROUTE||'boosted';
const source=process.env.LIFETIME_EARNED_CHECKPOINT||`/tmp/ae-lifetime-care-${route}/${route}/earned-craft80.json.gz`;
const prefix=JSON.parse(gunzipSync(readFileSync(source))),horizon=prefix.weeks+52;
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
if(prefix.curve.at(-1).craft<80)throw Error('An actually earned craft80 checkpoint is required');
for(const mode of ['focused','neglect','overbooked']){
 const out=`/tmp/ae-lifetime-pressure-${route}-${mode}`;if(existsSync(out+'/executable.json'))throw Error('Preserving existing run '+out);mkdirSync(out+'/'+route,{recursive:true});
 const bundle=out+'/worker.mjs',frozen=new Map(['App.tsx','hooks/useGameActions.ts','views/mobile/TeamApp.tsx','views/mobile/MobilePage.tsx'].map(p=>[p,readFileSync(p,'utf8')]));
 const built=await build({entryPoints:['scripts/audit-actor-lifetime-pressure.ts'],bundle:true,platform:'node',format:'esm',loader:{'.csv':'text'},outfile:bundle,metafile:true,logLevel:'error',plugins:[{name:'pin-real-callback-sources',setup(api){api.onLoad({filter:/(actorCareerActions|actorLifetimeActions)\.ts$/},args=>{let text=readFileSync(args.path,'utf8');for(const[p,s]of frozen)for(const sep of[',',', '])text=text.replace(`readFileSync('${p}'${sep}'utf8')`,JSON.stringify(s));return{contents:text,loader:'ts'}})}}]});
 const files=[...new Set([...Object.keys(built.metafile.inputs),...frozen.keys()])].filter(p=>existsSync(p)&&!p.includes('node_modules/'));
 const checkpoint={...prefix,executable:hash(bundle),horizon};
 writeFileSync(out+`/${route}/career-0.json.gz`,gzipSync(JSON.stringify(checkpoint),{level:1}));
 writeFileSync(out+`/${route}/career-0-results.json`,JSON.stringify({status:'CHECKPOINT_READY',weeks:checkpoint.weeks,curve:checkpoint.curve,fame:checkpoint.player.stats.fame,cash:checkpoint.player.money,credits:checkpoint.credits}));
 writeFileSync(out+'/lineage.json',JSON.stringify({source,sourceCheckpointSha256:hash(source),handoffWeek:prefix.weeks,decisionMode:mode,horizon,playerHash:createHash('sha256').update(JSON.stringify(prefix.player)).digest('hex'),changes:['Only audit executable/horizon metadata; player, RNG, clock, purchases and signed projects unchanged']},null,2));
 writeFileSync(out+'/executable.json',JSON.stringify({sha256:hash(bundle),sourceHashes:Object.fromEntries(files.map(p=>[p,hash(p)])),horizon,strategies:[route],seeds:[0],simulatedReceipts:true,realPurchases:false,decisionMode:mode},null,2));
}
console.log(JSON.stringify({route,source,start:prefix.weeks,horizon}));
