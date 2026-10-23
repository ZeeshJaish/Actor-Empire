import {spawnSync,spawn} from 'node:child_process';
import {mkdirSync,mkdtempSync,readFileSync,writeFileSync,existsSync,readdirSync,renameSync,unlinkSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const out=process.env.ACTOR_CAREER_OUTPUT||mkdtempSync('/tmp/ae-actor-career-flow-');mkdirSync(out,{recursive:true});
const bundle=out+'/career-worker.mjs';
const candidate=out+'/career-worker-candidate.mjs';
const digest=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const build=spawnSync('./node_modules/.bin/esbuild',['scripts/audit-actor-career-flow.ts','--bundle','--platform=node','--format=esm','--loader:.csv=text','--outfile='+candidate],{stdio:'inherit'});if(build.status)process.exit(build.status);
if(existsSync(bundle)&&readdirSync(out).some(file=>/^career-\d+\.json\.gz$/.test(file))){
 if(digest(bundle)!==digest(candidate))throw Error('Source changed since this checkpoint. Keep its pinned executable and use a fresh ACTOR_CAREER_OUTPUT directory: '+out);
 unlinkSync(candidate);
}else renameSync(candidate,bundle);
const sourceFiles=['services/actorCareerBalance.ts','services/gameLoop.ts','services/roleLogic.ts','services/teamLogic.ts','services/saveMigration.ts','services/actorCareerArc.ts','hooks/useGameActions.ts','App.tsx','types.ts','views/mobile/MobilePage.tsx','views/lifestyle/business/greenlightProjectBuilder.ts'];
writeFileSync(out+'/executable.json',JSON.stringify({sha256:digest(bundle),sourceHashes:Object.fromEntries(sourceFiles.map(file=>[file,digest(file)])),kind:'Current-source ordinary paid actor career; sequential bounded workers'},null,2));
console.log('Career audit output: '+out);
const seeds=(process.env.ACTOR_CAREER_SEEDS||'0,1').split(',').map(Number);
let completeFlows=0;
for(const seed of seeds){
 const genre=seed%2?'COMEDY':'DRAMA';
 for(let n=0;n<80;n++){
  const bootstrap=`let state=${(1337+seed)>>>0},tick=0;Math.random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};Date.now=()=>1800000000000+tick++;await import(${JSON.stringify(pathToFileURL(bundle).href)});`;
  const code=await new Promise(resolve=>{const child=spawn(process.execPath,['--max-old-space-size=2048','--input-type=module','--eval',bootstrap],{env:{...process.env,ACTOR_CAREER_SEED:String(seed),ACTOR_CAREER_GENRE:genre,ACTOR_CAREER_WEEKS:process.env.ACTOR_CAREER_WEEKS||'78',ACTOR_CAREER_OUTPUT:out},stdio:'inherit'});child.on('exit',resolve)});
  const result=JSON.parse(readFileSync(`${out}/career-${seed}-results.json`,'utf8'));
  if(code||result.status==='FAILURE'){console.error(JSON.stringify({seed,status:result.status,failure:result.failure}));process.exit(1)}
  if(result.status!=='CHECKPOINT_READY'){console.log(JSON.stringify({seed,status:result.status,weeks:result.weeks,credits:result.credits.length,reloads:result.reloads,cash:result.cash}));
   if(result.status==='HORIZON_COMPLETE'&&result.credits.length&&['AUDITION','PRODUCTION','POST_PRODUCTION','AWAITING_RELEASE'].every(phase=>result.phases.includes(phase)))completeFlows++;
   break}
 }
}
if(Number(process.env.ACTOR_CAREER_WEEKS||78)>=78&&!completeFlows)throw Error('No seed completed the ordinary acting-to-release flow; inspect terminal reports before claiming verification.');
