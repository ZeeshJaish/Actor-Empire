import {build} from 'esbuild';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';

const route=process.env.LIFETIME_ROUTE;
const source=process.env.LIFETIME_EARNED_CHECKPOINT;
if(!['free','boosted'].includes(route)||!source)throw Error('Select a route and its immutable earned checkpoint');
const out=`/tmp/ae-lifetime-current-smoke-${route}`;
if(existsSync(out+'/executable.json'))throw Error('Preserving existing run '+out);
mkdirSync(out+'/'+route,{recursive:true});
const digest=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const frozen=new Map(['App.tsx','hooks/useGameActions.ts','views/mobile/TeamApp.tsx','views/mobile/MobilePage.tsx'].map(p=>[p,readFileSync(p,'utf8')]));
const bundle=out+'/worker.mjs';
const built=await build({entryPoints:['scripts/audit-actor-lifetime-repaired.ts'],bundle:true,platform:'node',format:'esm',loader:{'.csv':'text'},outfile:bundle,metafile:true,logLevel:'error',plugins:[{name:'pin-real-callback-sources',setup(api){api.onLoad({filter:/(actorCareerActions|actorLifetimeActions)\.ts$/},args=>{
 let text=readFileSync(args.path,'utf8');for(const[p,s]of frozen)for(const sep of[',',', '])text=text.replace(`readFileSync('${p}'${sep}'utf8')`,JSON.stringify(s));return{contents:text,loader:'ts'};
})}}]});
const files=[...new Set([...Object.keys(built.metafile.inputs),...frozen.keys()])].filter(p=>existsSync(p)&&!p.includes('node_modules/'));
const raw=readFileSync(source),c=JSON.parse(gunzipSync(raw)),oldExecutable=c.executable;
if(!c.legendWeek)throw Error('Expected an actually earned Legend checkpoint');
const followup=route==='free'?131:118;
writeFileSync(out+'/prefix.json.gz',raw);
c.executable=digest(bundle);c.horizon=2080;
writeFileSync(out+`/${route}/career-0.json.gz`,gzipSync(JSON.stringify(c),{level:1}));
writeFileSync(out+`/${route}/career-0-results.json`,JSON.stringify({status:'CHECKPOINT_READY',weeks:c.weeks,curve:c.curve,fame:c.player.stats.fame,cash:c.player.money,credits:c.credits}));
writeFileSync(out+'/lineage.json',JSON.stringify({source,sourceCheckpointSha256:digest(out+'/prefix.json.gz'),preservedSource:out+'/prefix.json.gz',originalExecutable:oldExecutable,newExecutable:c.executable,handoffWeek:c.weeks,legendFollowupWeeks:followup,playerHash:createHash('sha256').update(JSON.stringify(c.player)).digest('hex'),changes:['Only executable identity and audit stopping metadata. Exact earned player/RNG/clock, signed cash/loans/contracts and previous performances preserved. New executable fixes installment-specific campaign ownership and legacy awareness reads. No gameplay rebalancing or historical money repair.'],originalFinalOutcome:route==='free'?'Retained first completion through599; extend13 weeks on repaired source':'Exact pre-fault replay restored729 from immutable681; original733 failure and equal-curve RED replay retained'},null,2));
writeFileSync(out+'/executable.json',JSON.stringify({sha256:digest(bundle),sourceHashes:Object.fromEntries(files.map(p=>[p,digest(p)])),horizon:2080,strategies:[route],seeds:[0],simulatedReceipts:true,realPurchases:false,legendFollowupWeeks:followup},null,2));
console.log(JSON.stringify({route,start:c.weeks,target:c.legendWeek+followup,source}));
