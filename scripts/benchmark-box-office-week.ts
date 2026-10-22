import { rebaseCinemaSavedState } from '../services/boxOffice/boxOfficeClock';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import assert from 'node:assert/strict';
import { INITIAL_PLAYER,type Player } from '../types';
import { buildLateGameWeekPerformanceFixture } from './fixtures/lateGameWeekPerformanceFixture';
import { processGameWeek } from '../services/gameLoop';
import { createDeterministicRng } from '../services/deterministicRandom';
import { migratePlayerSave } from '../services/saveMigration';
import { prepareVerifiedPlayerForPersistence } from '../services/savePreparation';
import { prepareProcessedWeekForUi } from '../services/playerUiState';
import { saveVerifiedGameData } from '../services/saveGenerations';
import { CinemaMemorySaveStore } from './fixtures/cinemaSaveStore';
import { buildCinemaWeekInput } from '../services/boxOffice/boxOfficeWeek';
import { simulateCinemaWeek } from '../services/boxOffice/boxOfficeMarket';
export const summarizeCinemaTiming=(samples:number[])=>{const a=[...samples].sort((x,y)=>x-y),q=(p:number)=>a[Math.max(0,Math.min(a.length-1,Math.ceil(a.length*p)-1))]||0;return {n:a.length,minMs:q(0),p50Ms:q(.5),p95Ms:q(.95),maxMs:q(1)}};
const dir=process.env.CINEMA_BENCH_FIXTURES||'/private/tmp/actor-phase6-benchmark-fixtures';
if(process.argv.includes('--write-fixtures')){
 mkdirSync(dir,{recursive:true});Math.random=createDeterministicRng('cinema-bench-fixtures');Date.now=()=>1800000000000;
 const early=migratePlayerSave(structuredClone(INITIAL_PLAYER)),late=buildLateGameWeekPerformanceFixture();
 if(late.world.cinemaMarket)late.world.cinemaMarket=rebaseCinemaSavedState(late.world.cinemaMarket,getAbsoluteWeek(late.age,late.currentWeek)-late.world.cinemaMarket.lastProcessedAbsoluteWeek);
 for(const [name,p] of Object.entries({early,late}))writeFileSync(join(dir,name+'.json'),JSON.stringify(p));console.log('Wrote fixed early/late fixtures');
}else if(process.argv.includes('--align-fixtures')){
 const late=JSON.parse(readFileSync(join(dir,'late.json'),'utf8')) as Player;const state=late.world.cinemaMarket!;late.world.cinemaMarket=rebaseCinemaSavedState(state,getAbsoluteWeek(late.age,late.currentWeek)-state.lastProcessedAbsoluteWeek);writeFileSync(join(dir,'late.json'),JSON.stringify(late));console.log('Aligned authored late fixture to its actual career clock');
}else{
 const rows:any[]=[];
 for(const name of (process.env.CINEMA_BENCH_NAMES||'early,late').split(',')){
  assert.ok(['early','late'].includes(name),'Choose a known fixed benchmark fixture');
  let player=JSON.parse(readFileSync(join(dir,name+'.json'),'utf8')) as Player;const store=new CinemaMemorySaveStore();const measures:Record<string,number[]>={compute:[],prepare:[],persistence:[],uiCommit:[],total:[],market:[]};const stages:Record<string,number>={};let allocations=0;const heapBefore=process.memoryUsage().heapUsed;let error:string|undefined;
  for(let i=-1;i<Number(process.env.CINEMA_BENCH_WEEKS||16);i++){
   Math.random=createDeterministicRng(`cinema-bench:${name}:${i}`);Date.now=()=>1800000000000+i+1;
   try{
    const start=performance.now();let stageAt=start,stageName='start';
    const result=await processGameWeek(player,{onCinemaResult:r=>{allocations+=r.allocations.length},onStage:s=>{const now=performance.now();stages[stageName+' → '+s]=Math.max(stages[stageName+' → '+s]||0,now-stageAt);stageAt=now;stageName=s}});const compute=performance.now()-start;
    const prepAt=performance.now(),prepared=prepareVerifiedPlayerForPersistence(result.player,'PROCESS_WEEK'),prepare=performance.now()-prepAt;
    const persistAt=performance.now();await saveVerifiedGameData(store,'benchmark',prepared.player,prepared.manifest);const persistence=performance.now()-persistAt;
    const uiAt=performance.now();player=prepareProcessedWeekForUi(prepared.player);const uiCommit=performance.now()-uiAt,total=performance.now()-start;
    const marketAt=performance.now();simulateCinemaWeek(buildCinemaWeekInput(player,getAbsoluteWeek(player.age,player.currentWeek)+1));const market=performance.now()-marketAt;
    console.log('BENCH_PROGRESS',name,i,Math.round(total));
    if(i>=0)for(const [k,v] of Object.entries({compute,prepare,persistence,uiCommit,total,market}))measures[k].push(v);
   }catch(e){error=String(e);break}
  }
  const serialized=JSON.stringify(player);
  // Compare gameplay and paid facts while allowing only the new cast fallback metadata. Outside timing.
  const comparableStateSha256=createHash('sha256').update(JSON.stringify(player,(key,value)=>['cinemaRecognition','cinemaCast'].includes(key)?undefined:value)).digest('hex');
  rows.push({name,comparableStateSha256,finalStateSha256:createHash('sha256').update(serialized).digest('hex'),metrics:Object.fromEntries(Object.entries(measures).map(([k,s])=>[k,summarizeCinemaTiming(s)])),error,saveBytes:Buffer.byteLength(serialized),heapBefore,heapAfter:process.memoryUsage().heapUsed,allocationRows:allocations,slowStages:Object.entries(stages).sort((a,b)=>b[1]-a[1]).slice(0,8),cinemaWeeks:player.world.cinemaMarket?.weeks.length,counts:{projects:player.world.projects.length,rights:Object.keys(player.world.streamingRightsContracts||{}).length}});
 }
 const report={kind:'DESKTOP_NODE_FULL_WEEK_WITH_VERIFIED_MEMORY_STORE',node:process.version,platform:process.platform,arch:process.arch,rows,limitations:['Total excludes React paint, IndexedDB and native bridge; browser measured separately','Retained heap measurements are not cumulative allocation volume','Each row reports its actual sample count; compare repeated paired trials','Fixed input JSON generated by baseline, never from a real user save']};
 writeFileSync(process.env.CINEMA_BENCH_OUTPUT||'/private/tmp/actor-cinema-benchmark.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(rows.map(r=>({name:r.name,total:r.metrics.total,error:r.error})),null,2));assert.ok(rows.every(r=>!r.error),'Benchmark pipeline failed; preserve baseline error instead of skipping persistence');
}
