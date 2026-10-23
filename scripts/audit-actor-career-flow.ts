import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {INITIAL_PLAYER,type Player,type Genre} from '../types';
import {migratePlayerSave} from '../services/saveMigration';
import {processGameWeek} from '../services/gameLoop';
import {getAbsoluteWeek} from '../services/legacyLogic';
import {WORKSHOP_CATALOG,GENRE_TRAINING_CATALOG,IMPROVEMENT_CATALOG} from '../services/lifestyleLogic';
import {getActorCareerArc} from '../services/actorCareerArc';
import {getActorTalent,calculateGenreFit} from '../services/roleLogic';
import {applyCareerAuditionApplication,acceptCareerPartTimeJob} from '../services/careerApplicationActions';
import {careerActionHarness,enrollThroughApp,normalizeCareerCommitmentsThroughApp} from './fixtures/actorCareerActions';
import {resolveLifeEventFallback} from '../services/lifeEventFallback';
import {applyCrisisImpact} from '../services/productionService';
import {prepareVerifiedPlayerForPersistence} from '../services/savePreparation';
import {saveVerifiedGameData,loadVerifiedGameData} from '../services/saveGenerations';
import {CinemaMemorySaveStore} from './fixtures/cinemaSaveStore';
import {commitCinemaWeek} from '../services/boxOffice/boxOfficeLiveSettlement';
import {cinemaAuditRandom,cinemaAuditClock,readCinemaAuditCheckpoint,writeCinemaAuditCheckpoint} from './fixtures/cinemaAuditCheckpoint';
const seed=Number(process.env.ACTOR_CAREER_SEED||0),horizon=Number(process.env.ACTOR_CAREER_WEEKS||104),batch=Number(process.env.ACTOR_CAREER_BATCH||13);
const genre=(process.env.ACTOR_CAREER_GENRE||'DRAMA') as Genre;
const out=process.env.ACTOR_CAREER_OUTPUT||'/tmp/ae-actor-career-flow';mkdirSync(out,{recursive:true});
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const executable=createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex');
const checkpointFile=`${out}/career-${seed}.json.gz`,checkpoint=readCinemaAuditCheckpoint<any>(checkpointFile);
if(checkpoint){assert.equal(checkpoint.executable,executable);assert.equal(checkpoint.horizon,horizon);assert.equal(checkpoint.genre,genre)}
const rng=cinemaAuditRandom('actor-career-balance:'+seed,checkpoint?.randomCalls||0),clock=cinemaAuditClock(checkpoint?.clockNext||1800000000000);
Math.random=rng.next;Date.now=clock.now;
let player:Player=checkpoint?.player||migratePlayerSave(structuredClone(INITIAL_PLAYER));
if(!checkpoint){assert.equal(player.money,2000);assert.equal(getActorTalent(player.stats.skills),0);assert.equal(player.businesses.length,0)}
let weeks=checkpoint?.weeks||0,reloads=checkpoint?.reloads||0,saves=checkpoint?.saves||0,replays=checkpoint?.replays||0;
const actions:any[]=checkpoint?.actions||[],credits=new Set<string>(checkpoint?.credits||[]),signed=new Map<string,number>(checkpoint?.signed||[]),phases=new Set<string>(checkpoint?.phases||[]);
const curve:any[]=checkpoint?.curve||[];
const curvePoint=()=>({seed,weeks,cash:player.money,craft:getActorTalent(player.stats.skills),genre:player.stats.genreXP[genre],fame:player.stats.fame,reputation:player.stats.reputation,experience:player.stats.experience,health:player.stats.health,energy:player.energy.current,arc:getActorCareerArc(player).id,credits:credits.size,activePersonalRoles:player.commitments.filter(c=>c.type==='ACTING_GIG').length,phases:[...phases]});
if(!curve.length)curve.push(curvePoint());
const store=new CinemaMemorySaveStore(),key='career-'+seed;let status='RUNNING',failure:string|undefined;
const record=(type:string,before:Player,after:Player,projectId?:string)=>actions.push({week:weeks,type,cost:before.money-after.money,energy:before.energy.current-after.energy.current,projectId});
function ui(type:string,run:(h:ReturnType<typeof careerActionHarness>)=>Player,id?:string){const before=player;player=run(careerActionHarness(player));record(type,before,player,id)}
function chooseLife(){let n=0;while(player.pendingEvents.length){assert(n++<100);const event=player.pendingEvents[0],queue=player.pendingEvents;
 if(event.type==='LIFE_EVENT'&&event.data?.lifeEvent){const life=event.data.lifeEvent;const index=life.options.findIndex((o:any)=>!o.isGolden);assert(index>=0);const option=life.options[index];const result=typeof option.impact==='function'?option.impact(player):resolveLifeEventFallback(player,life,index,option);player=result.updatedPlayer;}
 else if(['PRODUCTION_CRISIS','DIRECTOR_DECISION'].includes(event.type)){const options=event.data.options||[];const index=options.findIndex((o:any)=>!o.isGolden&&!/\$|\.money\.label|pr\.label|cgi\.label/.test([o.label,o.labelKey].join(' ')));assert(index>=0);player=applyCrisisImpact(player,event,index).updatedPlayer;}
 else if(event.type==='SCANDAL'&&event.data?.lifeEvent){const life=event.data.lifeEvent,index=life.options.findIndex((o:any)=>!o.isGolden);const o=life.options[index];player=(typeof o.impact==='function'?o.impact(player):resolveLifeEventFallback(player,life,index,o)).updatedPlayer;}
 else throw Error('Unimplemented actual choice '+event.type);
 player.pendingEvents=queue.filter(e=>e.id!==event.id);
}}
function wellbeing(){for(const [condition,id] of [[player.stats.health<75||player.stats.body<55,'opt_jog'],[player.stats.happiness<65,'opt_meditate'],[player.stats.health<55&&player.money>500,'opt_checkup']] as const){if(!condition)continue;for(const [category,groups] of Object.entries(IMPROVEMENT_CATALOG)){const activity=groups.find(a=>a.options.some(o=>o.id===id)),option=activity?.options.find(o=>o.id===id);if(activity&&option)ui('wellbeing:'+id,h=>h.improve(category,activity.name,option));}}}
function policy(){chooseLife();wellbeing();
 if(!player.commitments.some(c=>c.type==='JOB'&&!c.projectPhase)){const job=player.weeklyOpportunities.jobs.filter(c=>c.energyCost<=30).sort((a,b)=>(b.income/Math.max(1,b.energyCost))-(a.income/Math.max(1,a.energyCost)))[0];if(job){const before=player;player=acceptCareerPartTimeJob(player,job);record('accept-paid-job',before,player)}}
 const acting=player.commitments.some(c=>c.type==='ACTING_GIG');
 if(!acting&&!player.commitments.some(c=>c.type==='COURSE')&&getActorTalent(player.stats.skills)<70){
  const candidates=WORKSHOP_CATALOG.filter(c=>c.skillGains&&c.energyCost<=35&&(c.upfrontCost||0)+500<=player.money)
   .map(c=>({c,score:Object.entries(c.skillGains!).reduce((n,[k,g])=>n+Math.max(0,65-(player.stats.skills as any)[k])*(Number(g)+2/(c.totalDuration||1)),0)/Math.max(1,c.upfrontCost||0)})).sort((a,b)=>b.score-a.score);
  const course=candidates[0]?.c;if(course&&player.energy.current>=course.energyCost){const before=player;player=enrollThroughApp(player,course);record('paid-course:'+course.id,before,player)}
 }
 const training=GENRE_TRAINING_CATALOG.find(g=>g.genre===genre)!;
 while(!acting&&player.energy.current>=40&&player.stats.genreXP[genre]<70&&player.money>=training.cost+100){ui('genre:'+genre,h=>h.improve('GENRE',genre,{id:'genre',label:training.label,energyCost:training.energy,moneyCost:training.cost,gains:{},risk:0,description:training.desc}));}
 if(!acting&&!player.applications.length&&player.energy.current>=25){const offer=player.weeklyOpportunities.auditions
  .filter(o=>!o.project.isFamous&&['MINOR','CAMEO','SUPPORTING'].includes(o.roleType)&&calculateGenreFit(player,o.project).fitScore>=20)
  .sort((a,b)=>calculateGenreFit(player,b.project).fitScore-calculateGenreFit(player,a.project).fitScore)[0];
  if(offer){const before=player;player=applyCareerAuditionApplication(player,offer,'career-app-'+seed+'-'+weeks);record('apply:'+offer.roleType,before,player,offer.id)}
 }
 for(const c of [...player.commitments]){
  if(c.type!=='ACTING_GIG')continue;
  signed.set(c.id,signed.get(c.id)??c.lumpSum??0);assert.equal(c.lumpSum||0,signed.get(c.id));phases.add(c.projectPhase||'');
  if(['AUDITION','PRE_PRODUCTION','PRODUCTION'].includes(c.projectPhase||'')){
   let attempts=0;while(player.energy.current>=(c.projectPhase==='PRE_PRODUCTION'?10:20)&&attempts++<20){const before=player;ui('project-rehearsal',h=>h.rehearse(c.id),c.id);if(player===before)break;}
  }
 }
}
async function reload(label:string,failPromotion=false){
 const protectedState=(p:Player)=>({money:p.money,skills:p.stats.skills,xp:p.stats.genreXP,portfolio:p.portfolio,businesses:p.businesses.map(b=>[b.id,b.balance]),contracts:p.world.streamingRightsContracts,commitments:p.commitments.map(c=>({id:c.id,type:c.type,lumpSum:c.lumpSum,income:c.income,energyCost:c.energyCost,phase:c.projectPhase,phaseWeeksLeft:c.phaseWeeksLeft,auditionPerformance:c.auditionPerformance,productionPerformance:c.productionPerformance,careerBalanceVersion:c.careerBalanceVersion,careerPerformanceFinalized:c.careerPerformanceFinalized,careerPreparationScore:c.careerPreparationScore,careerLearningActions:c.careerLearningActions,cast:c.projectDetails?.castList?.map(m=>({actorId:m.actorId,roleType:m.roleType,salary:m.salary}))})),awards:p.awards});
 const prepared=prepareVerifiedPlayerForPersistence(player,'PROCESS_WEEK');assert.deepEqual(prepared.comparison,{ok:true});
 if(failPromotion){store.failPromotion=true;await assert.rejects(()=>saveVerifiedGameData(store,key,prepared.player,prepared.manifest),/promotion/);store.failPromotion=false;const old=await loadVerifiedGameData(store,key);assert.equal(old.status,'CURRENT');}
 await saveVerifiedGameData(store,key,prepared.player,prepared.manifest);saves++;
 const loaded=await loadVerifiedGameData(store,key);assert.equal(loaded.status,'CURRENT');const before=protectedState(loaded.player!);
 player=migratePlayerSave(loaded.player!);assert.deepEqual(protectedState(player),before,label);
 const app=normalizeCareerCommitmentsThroughApp(player.commitments);for(let i=0;i<app.length;i++){assert.equal(app[i].careerBalanceVersion,player.commitments[i].careerBalanceVersion);assert.equal(app[i].careerPerformanceFinalized,player.commitments[i].careerPerformanceFinalized);assert.equal(app[i].careerPreparationScore,player.commitments[i].careerPreparationScore)}
 reloads++;
}
const start=weeks;
try{
 await reload('batch-start');
 while(weeks<horizon&&weeks-start<batch&&!player.flags.isDead){
  policy();let cinema:any;const result=await processGameWeek(player,{onCinemaResult:(r:any)=>cinema=r});player=result.player;weeks++;
  if(cinema){assert.equal(commitCinemaWeek(player,cinema).applied,false);replays++}
  for(const c of player.pastProjects)if(c.type==='ACTING_GIG'&&(c.castList||[]).some(m=>m.actorId==='PLAYER_SELF'||m.isPlayer))credits.add(c.id);
  if(weeks%13===0||weeks===horizon)await reload('week-'+weeks,weeks===13);
  if(weeks%4===0||weeks===horizon){const point=curvePoint();curve.push(point);console.log(JSON.stringify(point));}
  if(player.money<0){status='UNFUNDED';break}
 }
 if(status==='RUNNING')status=player.flags.isDead?'CAREER_ENDED':weeks>=horizon?'HORIZON_COMPLETE':'CHECKPOINT_READY';
}catch(e){status='FAILURE';failure=(e as Error).stack;process.exitCode=1}
writeCinemaAuditCheckpoint(checkpointFile,{executable,horizon,genre,player,weeks,reloads,saves,replays,actions,credits:[...credits],signed:[...signed],phases:[...phases],curve,randomCalls:rng.calls(),clockNext:clock.next()});
writeFileSync(`${out}/career-${seed}-results.json`,JSON.stringify({status,failure,seed,horizon,weeks,reloads,saves,replays,genre,cash:player.money,skills:player.stats.skills,genreXP:player.stats.genreXP,fame:player.stats.fame,reputation:player.stats.reputation,experience:player.stats.experience,arc:getActorCareerArc(player).id,curve,credits:[...credits],phases:[...phases],actions,signed:[...signed],peakRSS:process.resourceUsage().maxRSS*1024},null,2));
console.log(JSON.stringify({status,failure,seed,weeks,credits:credits.size,reloads}));
