import {build} from 'esbuild';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
const variant=process.env.FUTURE_VARIANT||'baseline';
if(!/^[a-z0-9-]+$/.test(variant))throw Error('Invalid variant');
const seeds=[0,7,19],weeks=52;
const digest=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const base=`/tmp/ae-future-money-${variant}`;
if(existsSync(base))throw Error('Preserving existing evidence '+base);
mkdirSync(base,{recursive:true});
const frozen=new Map(['App.tsx','hooks/useGameActions.ts','views/mobile/TeamApp.tsx','views/mobile/MobilePage.tsx'].map(p=>[p,readFileSync(p,'utf8')]));
const bundle=base+'/worker.mjs';
const built=await build({entryPoints:['scripts/audit-actor-lifetime-maxed-slots.ts'],bundle:true,platform:'node',format:'esm',loader:{'.csv':'text'},outfile:bundle,metafile:true,logLevel:'error',plugins:[{name:'pin-real-callback-sources',setup(api){api.onLoad({filter:/(actorCareerActions|actorLifetimeActions)\.ts$/},args=>{let contents=readFileSync(args.path,'utf8');for(const[p,s]of frozen)for(const sep of[',',', '])contents=contents.replace(`readFileSync('${p}'${sep}'utf8')`,JSON.stringify(s));return{contents,loader:'ts'}})}}]});
const files=[...new Set([...Object.keys(built.metafile.inputs),...frozen.keys()])].filter(p=>existsSync(p)&&!p.includes('node_modules/'));
const sourceHashes=Object.fromEntries(files.map(p=>[p,digest(p)]));
for(const route of ['free','boosted']){
 const source=`/tmp/ae-lifetime-repaired-${route}/${route}/career-0.json.gz`;
 const raw=readFileSync(source),prefix=JSON.parse(gunzipSync(raw)),out=base+'/'+route;
 if(!prefix.legendWeek)throw Error('Expected naturally earned Legend fixture');
 mkdirSync(out+'/'+route,{recursive:true});writeFileSync(out+'/worker.mjs',readFileSync(bundle));writeFileSync(out+'/prefix.json.gz',raw);
 const horizon=prefix.weeks+weeks;
 for(const seed of seeds){
  const c={...prefix,executable:digest(bundle),horizon,randomCalls:0};
  writeFileSync(`${out}/${route}/career-${seed}.json.gz`,gzipSync(JSON.stringify(c),{level:1}));
  writeFileSync(`${out}/${route}/career-${seed}-results.json`,JSON.stringify({status:'CHECKPOINT_READY',weeks:c.weeks,curve:c.curve,fame:c.player.stats.fame,cash:c.player.money,credits:c.credits}));
 }
 writeFileSync(out+'/executable.json',JSON.stringify({sha256:digest(bundle),sourceHashes,horizon,strategies:[route],seeds},null,2));
 writeFileSync(out+'/lineage.json',JSON.stringify({variant,route,source,sourceCheckpointSha256:digest(source),playerHash:createHash('sha256').update(JSON.stringify(prefix.player)).digest('hex'),handoffWeek:prefix.weeks,horizon,seeds,comparisonWeeks:weeks,decisionMode:'overbooked',scope:'Conditional future-seed continuations of two earned fresh-origin careers, not independent fresh careers',auditChanges:['Pinned new executable/horizon','Reset future RNG call counter for each named future seed; player, cash, signed offers/contracts, clock and history unchanged'],realPurchases:false},null,2));
 console.log(JSON.stringify({variant,route,out,horizon,seeds}));
}
writeFileSync(base+'/source.json',JSON.stringify({variant,sourceHashes,sha256:digest(bundle)},null,2));
