import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {INITIAL_PLAYER,type Player,type Genre} from '../types';
import {migratePlayerSave} from '../services/saveMigration';
import {processGameWeek} from '../services/gameLoop';
import {getAbsoluteWeek} from '../services/legacyLogic';
import {WORKSHOP_CATALOG,GENRE_TRAINING_CATALOG,IMPROVEMENT_CATALOG} from '../services/lifestyleLogic';
import {applyPremiumPurchase, type PremiumProductId} from '../services/premiumLogic';
import {AGENT_CATALOG,PUBLICIST_CATALOG} from '../services/teamLogic';
import {lifetimeAccept,lifetimeHire,lifetimePost} from './fixtures/actorLifetimeActions';
import {buildCareerUiModel} from '../services/careerUiAdapter';
import {getCareerEvidence} from '../services/actorCareerBalance';
import {getActorCareerArc} from '../services/actorCareerArc';
import {getActorTalent,calculateGenreFit,ROLE_DEFINITIONS} from '../services/roleLogic';
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
const strategy=process.env.REWARD_STRATEGY||'entry';
const genre=(process.env.ACTOR_CAREER_GENRE||'DRAMA') as Genre;
const out=process.env.ACTOR_CAREER_OUTPUT||'/tmp/ae-actor-career-flow';mkdirSync(out,{recursive:true});
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const executable=createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex');
const checkpointFile=`${out}/career-${seed}.json.gz`,checkpoint=readCinemaAuditCheckpoint<any>(checkpointFile);
if(checkpoint){assert.equal(checkpoint.executable,executable);assert.equal(checkpoint.horizon,horizon);assert.equal(checkpoint.genre,genre);assert.equal(checkpoint.strategy,strategy)}
const rng=cinemaAuditRandom('actor-career-balance:'+seed,checkpoint?.randomCalls||0),clock=cinemaAuditClock(checkpoint?.clockNext||1800000000000);
Math.random=rng.next;Date.now=clock.now;
let player:Player=checkpoint?.player||migratePlayerSave(structuredClone(INITIAL_PLAYER));
if(!checkpoint){assert.equal(player.money,2000);assert.equal(getActorTalent(player.stats.skills),0);assert.equal(player.businesses.length,0)}
let weeks=checkpoint?.weeks||0,reloads=checkpoint?.reloads||0,saves=checkpoint?.saves||0,replays=checkpoint?.replays||0;
const actions:any[]=checkpoint?.actions||[],credits=new Set<string>(checkpoint?.credits||[]),signed=new Map<string,number>(checkpoint?.signed||[]),phases=new Set<string>(checkpoint?.phases||[]);
const curve:any[]=checkpoint?.curve||[];
const earnings:any[]=checkpoint?.earnings||[];
const curvePoint=()=>({seed,weeks,age:player.age,skills:{...player.stats.skills},maxGenre:Math.max(...Object.values(player.stats.genreXP)),careerEvidence:getCareerEvidence(player),awardsWon:player.awards.filter(a=>a.outcome==='WON').length,agent:player.team.agent?.id,publicist:player.team.publicist?.id,cash:player.money,craft:getActorTalent(player.stats.skills),genre:player.stats.genreXP[genre],fame:player.stats.fame,reputation:player.stats.reputation,experience:player.stats.experience,health:player.stats.health,energy:player.energy.current,arc:getActorCareerArc(player).id,credits:credits.size,releasedCredits:getCareerEvidence(player).credits,cumulativeSalary:earnings.filter(t=>t.description.startsWith('Salary: ')).reduce((sum,t)=>sum+t.amount,0),cumulativeCommission:earnings.filter(t=>t.description.startsWith('Agent Commission')).reduce((sum,t)=>sum-t.amount,0),followers:player.stats.followers,paidMovieIncome:player.finance.history.filter(t=>t.description.startsWith('Salary: ')).reduce((sum,t)=>sum+t.amount,0),purchasedCash:actions.filter(a=>a.type.startsWith('simulated-purchase:cash_')).reduce((sum,a)=>sum-a.cost,0),bonusEnergyBank:player.flags.bonusEnergyBank,activePersonalRoles:player.commitments.filter(c=>c.type==='ACTING_GIG').length,phases:[...phases]});
if(!curve.length)curve.push(curvePoint());
const store=new CinemaMemorySaveStore(),key='career-'+seed;let status='RUNNING',failure:string|undefined;
let legendWeek:number|undefined=checkpoint?.legendWeek;
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
// Audit decision policy: uses visible offers/skills and real callbacks. No stat/project grants.
function policy(){chooseLife();wellbeing();
 if(weeks===0&&strategy==='boosted')for(const product of ['cash_75000','energy_500'] as PremiumProductId[]){const before=({money:player.money,energy:{...player.energy}} as Player);applyPremiumPurchase(player,product);record('simulated-purchase:'+product,before,player)}
 // Spend earned cash on support only with a full year's fee + living/training reserve.
 if(!player.flags.teamChangeLocked){
  const pub=(player.team.availablePublicists||[]).filter(m=>m.weeklyCost*104+10000<player.money).at(-1);
  if(pub&&pub.id!==player.team.publicist?.id&&pub.weeklyCost>(player.team.publicist?.weeklyCost||0)){const before=({money:player.money,energy:{...player.energy}} as Player);player=lifetimeHire(player,'member',pub);record('hire-publicist:'+pub.id,before,player)}
  else {const agent=(player.team.availableAgents||[]).filter(a=>a.annualFee*3+30000<player.money).sort((a,b)=>b.annualFee-a.annualFee)[0];
   if(agent&&agent.annualFee>(player.team.agent?.annualFee||0)){const before=({money:player.money,energy:{...player.energy}} as Player);player=lifetimeHire(player,'agent',agent);record('hire-agent:'+agent.id,before,player)}}
 }
 if(!player.commitments.some(c=>c.type==='JOB'&&!c.projectPhase)){
  const job=player.weeklyOpportunities.jobs.filter(c=>c.energyCost<=30).sort((a,b)=>b.income/Math.max(1,b.energyCost)-a.income/Math.max(1,a.energyCost))[0];if(job){const before=player;player=acceptCareerPartTimeJob(player,job);record('accept-paid-job',before,player)}
 }
 // One personal shoot at a time, but post-production does not block the next application.
 const busy=player.commitments.some(c=>c.type==='ACTING_GIG'&&['AUDITION','PRE_PRODUCTION','PRODUCTION','SCHEDULED'].includes(c.projectPhase||''));
 const craft=getActorTalent(player.stats.skills);
 const score=(o:any)=>{const fit=calculateGenreFit(player,o.project);if(fit.isMismatch&&ROLE_DEFINITIONS[o.roleType].difficulty>20)return -1;
  if(o.project.isFamous&&ROLE_DEFINITIONS[o.roleType].difficulty>30&&player.stats.fame<40)return -1;
  // Visible craft/genre/preparation estimate, without sampling audition success or peeking future RNG.
  const expected=38+craft*.3+fit.fitScore*.3+(fit.fitScore>=85?8:fit.fitScore>=65?5:fit.fitScore>=40?2:0)-(o.project.isFamous?20:0)+5;
  if(expected<50+ROLE_DEFINITIONS[o.roleType].difficulty*.5)return -1;
  return fit.fitScore+Math.log10(1+o.estimatedIncome)*6+({MINOR:0,CAMEO:1,SUPPORTING:5,ENSEMBLE:7,LEAD:10}[o.roleType]||0);
 };
 if(!busy&&!player.applications.length){
  const message=player.inbox.filter(m=>!m.isExpired&&['OFFER_ROLE','OFFER_NEGOTIATION','OFFER_AUDITION'].includes(m.type))
   .map(m=>({m,o:m.type==='OFFER_NEGOTIATION'?m.data?.opportunity:m.data})).filter(x=>x.o?.project&&score(x.o)>=0).sort((a,b)=>score(b.o)-score(a.o))[0];
  if(message){const before=({money:player.money,energy:{...player.energy}} as Player);player=lifetimeAccept(player,message.m);record('accept-inbox:'+message.m.type,before,player,message.m.id)}
  else if(player.energy.current>=25){const offer=player.weeklyOpportunities.auditions.filter(o=>score(o)>=0).sort((a,b)=>score(b)-score(a))[0];
   if(offer){const before=player;player=applyCareerAuditionApplication(player,offer,'lifetime-'+seed+'-'+weeks);record('apply:'+offer.roleType,before,player,offer.id)}}
 }
 for(const c of [...player.commitments]){
  if(c.type!=='ACTING_GIG')continue;signed.set(c.id,signed.get(c.id)??c.lumpSum??0);assert.equal(c.lumpSum||0,signed.get(c.id));phases.add(c.projectPhase||'');
  if(['AUDITION','PRE_PRODUCTION','PRODUCTION'].includes(c.projectPhase||'')){let attempts=0;while(player.energy.current>=(c.projectPhase==='PRE_PRODUCTION'?10:20)&&attempts++<20){const action=buildCareerUiModel(player).projects.find(p=>p.id===c.id)?.primaryAction;if(!action||action.disabled)break;const before=player;ui('project-rehearsal',h=>h.rehearse(c.id),c.id);if(player===before)break;}}
 }
 // Courses continue through mastery; choose weakest acting skills within the actual cash budget.
 if(!player.commitments.some(c=>c.type==='COURSE')){
  const candidates=WORKSHOP_CATALOG.filter(c=>c.skillGains&&(c.upfrontCost||0)+2000<player.money)
   .map(c=>({c,score:Object.entries(c.skillGains!).reduce((n,[k,g])=>n+Math.max(0,100-(player.stats.skills as any)[k])*(Number(g)+2/Math.max(1,c.totalDuration||1)),0)/Math.sqrt(Math.max(1,c.upfrontCost||0))/Math.max(1,c.energyCost)}))
   .filter(x=>x.score>.001).sort((a,b)=>b.score-a.score);
  const course=candidates[0]?.c;if(course&&player.energy.current>=course.energyCost+10){const before=player;player=enrollThroughApp(player,course);record('paid-course:'+course.id,before,player)}
 }
 // Build weak genre lanes with spare energy after career actions, not before applications.
 const focused=player.stats.genreXP[genre]<65?genre:undefined;
 const training=GENRE_TRAINING_CATALOG.filter(g=>(!focused||g.genre===focused)&&player.stats.genreXP[g.genre]<95&&player.money>=g.cost+1500).sort((a,b)=>player.stats.genreXP[a.genre]-player.stats.genreXP[b.genre])[0];
 if(training&&player.energy.current>=Math.max(30,training.energy))ui('genre:'+training.genre,h=>h.improve('GENRE',training.genre,{id:'genre',label:training.label,energyCost:training.energy,moneyCost:training.cost,gains:{},risk:0,description:training.desc}));
 if(player.energy.current>=15){const before=({money:player.money,energy:{...player.energy}} as Player);player=lifetimePost(player,'SELFIE');record('instagram:SELFIE',before,player);}
}
async function reload(label:string,failPromotion=false){
 const protectedState=(p:Player)=>({money:p.money,skills:p.stats.skills,xp:p.stats.genreXP,portfolio:p.portfolio,businesses:p.businesses.map(b=>[b.id,b.balance]),contracts:p.world.streamingRightsContracts,commitments:p.commitments.map(c=>({id:c.id,type:c.type,lumpSum:c.lumpSum,income:c.income,energyCost:c.energyCost,phase:c.projectPhase,phaseWeeksLeft:c.phaseWeeksLeft,auditionPerformance:c.auditionPerformance,productionPerformance:c.productionPerformance,careerBalanceVersion:c.careerBalanceVersion,careerPerformanceFinalized:c.careerPerformanceFinalized,careerPreparationScore:c.careerPreparationScore,careerLearningActions:c.careerLearningActions,careerRewardPacingVersion:c.careerRewardPacingVersion,careerLearningWeek:c.careerLearningWeek,careerLearningActionsThisWeek:c.careerLearningActionsThisWeek,cast:c.projectDetails?.castList?.map(m=>({actorId:m.actorId,roleType:m.roleType,salary:m.salary}))})),awards:p.awards});
 const prepared=prepareVerifiedPlayerForPersistence(player,'PROCESS_WEEK');assert.deepEqual(prepared.comparison,{ok:true});
 if(failPromotion){store.failPromotion=true;await assert.rejects(()=>saveVerifiedGameData(store,key,prepared.player,prepared.manifest),/promotion/);store.failPromotion=false;const old=await loadVerifiedGameData(store,key);assert.equal(old.status,'CURRENT');}
 await saveVerifiedGameData(store,key,prepared.player,prepared.manifest);saves++;
 const loaded=await loadVerifiedGameData(store,key);assert.equal(loaded.status,'CURRENT');const before=protectedState(loaded.player!);
 player=migratePlayerSave(loaded.player!);assert.deepEqual(protectedState(player),before,label);
 const app=normalizeCareerCommitmentsThroughApp(player.commitments);for(let i=0;i<app.length;i++){assert.equal(app[i].careerBalanceVersion,player.commitments[i].careerBalanceVersion);assert.equal(app[i].careerPerformanceFinalized,player.commitments[i].careerPerformanceFinalized);assert.equal(app[i].careerPreparationScore,player.commitments[i].careerPreparationScore);assert.equal(app[i].careerRewardPacingVersion,player.commitments[i].careerRewardPacingVersion);assert.equal(app[i].careerLearningWeek,player.commitments[i].careerLearningWeek);assert.equal(app[i].careerLearningActionsThisWeek,player.commitments[i].careerLearningActionsThisWeek)}
 reloads++;
}
const start=weeks;
try{
 await reload('batch-start');
 while(weeks<horizon&&weeks-start<batch&&!player.flags.isDead){
  policy();const priorTransactions=new Set(player.finance.history.map(t=>t.id));let cinema:any;const result=await processGameWeek(player,{onCinemaResult:(r:any)=>cinema=r});player=result.player;weeks++;earnings.push(...player.finance.history.filter(t=>!priorTransactions.has(t.id)&&t.category==='SALARY'||!priorTransactions.has(t.id)&&t.description.startsWith('Agent Commission')));
  if(cinema){assert.equal(commitCinemaWeek(player,cinema).applied,false);replays++}
  for(const c of player.pastProjects)if(c.type==='ACTING_GIG'&&(c.castList||[]).some(m=>m.actorId==='PLAYER_SELF'||m.isPlayer))credits.add(c.id);
  if(weeks%13===0||weeks===horizon)await reload('week-'+weeks,weeks===13);
  {const point=curvePoint();curve.push(point);if(weeks%13===0)console.log(JSON.stringify(point));if(point.arc==='INDUSTRY_LEGEND'&&legendWeek===undefined)legendWeek=weeks;}
  if(legendWeek!==undefined&&weeks>=legendWeek+104){status='LEGEND_PLUS_TWO_YEARS';break;}
  if(player.money<0){status='UNFUNDED';break}
 }
 if(status==='RUNNING')status=player.flags.isDead?'CAREER_ENDED':weeks>=horizon?'HORIZON_COMPLETE':'CHECKPOINT_READY';
}catch(e){status='FAILURE';failure=(e as Error).stack;process.exitCode=1}
writeCinemaAuditCheckpoint(checkpointFile,{executable,horizon,genre,strategy,player,weeks,legendWeek,reloads,saves,replays,earnings,actions,credits:[...credits],signed:[...signed],phases:[...phases],curve,randomCalls:rng.calls(),clockNext:clock.next()});
writeFileSync(`${out}/career-${seed}-results.json`,JSON.stringify({status,failure,strategy,seed,horizon,weeks,legendWeek,reloads,saves,replays,earnings,genre,cash:player.money,skills:player.stats.skills,energy:player.energy,bonusEnergyBank:player.flags.bonusEnergyBank,genreXP:player.stats.genreXP,fame:player.stats.fame,reputation:player.stats.reputation,experience:player.stats.experience,arc:getActorCareerArc(player).id,curve,credits:[...credits],phases:[...phases],actions,signed:[...signed],peakRSS:process.resourceUsage().maxRSS*1024},null,2));
console.log(JSON.stringify({status,failure,seed,weeks,credits:credits.size,reloads}));
