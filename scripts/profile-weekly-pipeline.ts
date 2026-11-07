/** A retained actual large-career copy, one entered week; no personal storage. */
import assert from 'node:assert/strict';
import {Session} from 'node:inspector';
const cpu=process.env.WEEK_OPT_CPU ? new Session():null;const post=(method:string,args:any={})=>new Promise<any>((resolve,reject)=>cpu!.post(method,args,(error,result)=>error?reject(error):resolve(result)));
import {writeFileSync,readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {cinemaLegacyIntegrityHash} from './fixtures/cinemaSaveStore';
import {readCinemaAuditCheckpoint,cinemaAuditRandom,cinemaAuditClock} from './fixtures/cinemaAuditCheckpoint';
import {NPC_DATABASE} from '../services/npcLogic';
import {processGameWeek} from '../services/gameLoop';
import {prepareVerifiedPlayerForPersistence} from '../services/savePreparation';
import {saveVerifiedGameData,loadVerifiedGameData} from '../services/saveGenerations';
import {CinemaFileSaveStore} from './fixtures/cinemaFileSaveStore';
const path=process.env.LATE_SAVE_CHECKPOINT||'cinema-verification.local/owned-studio-20261029/earned-owned-prefix/career-0.json.gz';
const saved=readCinemaAuditCheckpoint<any>(path);if(saved.npcDatabase){NPC_DATABASE.length=0;NPC_DATABASE.push(...saved.npcDatabase);delete saved.npcDatabase}const p=saved.player;delete saved.player;
const rng=cinemaAuditRandom('normal-cinema-cohort:0',saved.randomCalls||0),clock=cinemaAuditClock(saved.clockNext);Math.random=rng.next;Date.now=clock.now;
const sourcePlayerSha256=createHash('sha256').update(JSON.stringify(p)).digest('hex');
(globalThis as any).gc?.();
if(cpu){cpu.connect();await post('Profiler.enable');await post('Profiler.setSamplingInterval',{interval:1000});await post('Profiler.start');}
const stages:any[]=[];let last=performance.now();const started=last;
const result=await processGameWeek(p,{onStage:(name,context)=>{const now=performance.now();stages.push({name,ms:now-last,context});last=now}});const loopMs=performance.now()-started;
if(cpu){const data=await post('Profiler.stop');writeFileSync(process.env.WEEK_OPT_CPU!,JSON.stringify(data.profile));cpu.disconnect();}
assert.equal(createHash('sha256').update(JSON.stringify(p)).digest('hex'),sourcePlayerSha256,'A completed owned week must preserve the complete durable prior player');
const wholePlayerJsonSha256=createHash('sha256').update(JSON.stringify(result.player)).digest('hex');
const summary=(v:any)=>({money:v.money,age:v.age,week:v.currentWeek,stats:v.stats,businesses:v.businesses.map((b:any)=>[b.id,b.balance]),
 cinema:Object.values(v.world.cinemaMarket.titles).map((t:any)=>[t.titleId,t.grossCents,t.producerReceiptsCents,t.actorPaidCents,t.investorPaidCents,t.lastSettledWeek,t.closed]),
 rights:v.world.streamingRightsContracts,shares:v.portfolio,sponsors:v.activeSponsorships});
const hash=(v:any)=>cinemaLegacyIntegrityHash(JSON.parse(JSON.stringify(v)));const paidFacts=hash(summary(result.player));
if(process.env.LATE_SAVE_LOOP_ONLY==='1'){const output={sourceHashes:(globalThis as any).__lateSaveSourceHashes||{},kind:'LOOP_ONLY_PROFILE_NOT_SAVE_CERTIFICATION',mode:process.env.LATE_SAVE_MODE,inputSha256:createHash('sha256').update(readFileSync(path)).digest('hex'),loopMs,financialDigest:paidFacts,wholePlayerJsonSha256,stages,personalSaveStorageAccessed:false};writeFileSync(process.env.LATE_SAVE_OUTPUT!,JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify({loopMs,financialDigest:paidFacts,wholePlayerJsonSha256,phases:stages.find(s=>s.name==='streaming_industry_done')?.context}));process.exit(0)}
const prepStarted=performance.now(),prepared=prepareVerifiedPlayerForPersistence(result.player,'PROCESS_WEEK'),prepareMs=performance.now()-prepStarted;if(hash(summary(prepared.player))!==paidFacts){
 const differences:any[]=[];const diff=(a:any,b:any,path='')=>{if(differences.length>=8||a===b)return;if(a&&b&&typeof a==='object'&&typeof b==='object'){for(const k of new Set([...Object.keys(a),...Object.keys(b)]))diff(a[k],b[k],path+'.'+k)}else differences.push({path,before:a,after:b})};diff(summary(result.player),summary(prepared.player));console.log(JSON.stringify({preparationDifferences:differences}));
}assert.equal(hash(summary(prepared.player)),paidFacts);
const dir=mkdtempSync('/private/tmp/late-save-profile-'),store=new CinemaFileSaveStore(dir);let writeMs=0,readMs=0;
try{const start=performance.now();await saveVerifiedGameData(store,'career',prepared.player,prepared.manifest);writeMs=performance.now()-start;const readStarted=performance.now(),loaded=await loadVerifiedGameData(store,'career');readMs=performance.now()-readStarted;assert.equal(loaded.status,'CURRENT');assert.equal(hash(summary(loaded.player)),paidFacts)}finally{rmSync(dir,{recursive:true,force:true})}
const output={randomCalls:rng.calls(),clockNext:clock.next(),preparedPlayerJsonSha256:createHash('sha256').update(JSON.stringify(prepared.player)).digest('hex'),kind:'RETAINED_ACTUAL_LARGE_SAVE_ONE_WEEK_PROFILE',mode:process.env.LATE_SAVE_MODE||'current',personalSaveStorageAccessed:false,inputSha256:createHash('sha256').update(readFileSync(path)).digest('hex'),loopMs,prepareMs,writeMs,readMs,financialDigest:paidFacts,wholePlayerJsonSha256,stages,sourceHashes:(globalThis as any).__lateSaveSourceHashes||{}};
writeFileSync(process.env.LATE_SAVE_OUTPUT!,JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify({loopMs,prepareMs,writeMs,readMs,financialDigest:paidFacts,wholePlayerJsonSha256,phases:stages.find(s=>s.name==='streaming_industry_done')?.context}));
