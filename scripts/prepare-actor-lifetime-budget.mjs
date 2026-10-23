import {build} from 'esbuild';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
const digest=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
for(const route of ['free','boosted']){
 const base=`/tmp/ae-lifetime-ambitious-${route}`,out=`/tmp/ae-lifetime-budget-${route}`;if(existsSync(out+'/executable.json'))throw Error('Preserving existing test run: '+out);mkdirSync(out+'/'+route,{recursive:true});
 const frozen=new Map(['App.tsx','hooks/useGameActions.ts','views/mobile/TeamApp.tsx','views/mobile/MobilePage.tsx'].map(p=>[p,readFileSync(p,'utf8')]));
 const bundle=out+'/worker.mjs';
 const built=await build({entryPoints:['scripts/audit-actor-lifetime-budget.ts'],bundle:true,platform:'node',format:'esm',loader:{'.csv':'text'},outfile:bundle,metafile:true,logLevel:'error',plugins:[{name:'pin-real-callback-sources',setup(api){api.onLoad({filter:/(actorCareerActions|actorLifetimeActions)\.ts$/},args=>{let text=readFileSync(args.path,'utf8');for(const[p,s]of frozen)for(const sep of [',',', '])text=text.replace(`readFileSync('${p}'${sep}'utf8')`,JSON.stringify(s));return{contents:text,loader:'ts'}})}}]});
 const files=[...new Set([...Object.keys(built.metafile.inputs),...frozen.keys()])].filter(p=>existsSync(p)&&!p.includes('node_modules/'));
 const oldFile=base+`/${route}/career-0.json.gz`,original=readFileSync(oldFile),c=JSON.parse(gunzipSync(original));
 const oldHash=c.executable;c.executable=digest(bundle);
 // Only the audit executable identity changes; player, history, RNG, clock, purchases and cash are untouched.
 writeFileSync(out+`/${route}/career-0.json.gz`,gzipSync(JSON.stringify(c),{level:1}));
 writeFileSync(out+`/${route}/career-0-results.json`,JSON.stringify({status:'CHECKPOINT_READY',weeks:c.weeks,curve:c.curve,fame:c.player.stats.fame,cash:c.player.money,credits:c.credits}));
 writeFileSync(out+'/lineage.json',JSON.stringify({source:oldFile,sourceCheckpointSha256:digest(oldFile),originalExecutable:oldHash,newExecutable:c.executable,handoffWeek:c.weeks,playerHash:createHash('sha256').update(JSON.stringify(c.player)).digest('hex'),changes:['Audit executable identity only; continuation keeps current real player including negative balance. Uses actual fee cuts and at most one actual Bank bridge loan with repayment; no cash repair or reset.'],originalFinalOutcome:'Retained acting-only care route; prefix continues without player state edits'},null,2));
 writeFileSync(out+'/executable.json',JSON.stringify({sha256:digest(bundle),sourceHashes:Object.fromEntries(files.map(p=>[p,digest(p)])),horizon:2080,strategies:[route],seeds:[0],simulatedReceipts:true,realPurchases:false,prefixCheckpoint:oldFile,genreOverride:null},null,2));
}
