import { spendPlayerEnergy } from '../services/premiumLogic';
import assert from 'node:assert/strict';
import { prepareOrdinaryCinemaWeek,type CareerAction } from './fixtures/ordinaryCinemaCareer';
import { mkdirSync,writeFileSync } from 'node:fs';
import { LONG_SAVE_CASES,makeCinemaLongSave } from './fixtures/boxOfficeLongRun';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { calculateProductionGain } from '../services/roleLogic';
import { prepareVerifiedPlayerForPersistence } from '../services/savePreparation';
import { CinemaMemorySaveStore } from './fixtures/cinemaSaveStore';
import { saveVerifiedGameData,loadVerifiedGameData } from '../services/saveGenerations';
import { inspectCinemaSavedState,migrateCinemaState } from '../services/boxOffice/boxOfficeMigration';
import { CINEMA_MARKET_TUNING_VERSION } from '../services/boxOffice/boxOfficeProfiles';
import { commitCinemaReleaseExposure } from '../services/boxOffice/boxOfficeExposureAdapters';
import { buildCinemaWeekInput,processCinemaMarketWeek } from '../services/boxOffice/boxOfficeWeek';
import { simulateCinemaWeek } from '../services/boxOffice/boxOfficeMarket';
import { commitCinemaWeek } from '../services/boxOffice/boxOfficeLiveSettlement';
import { createDeterministicRng } from '../services/deterministicRandom';
const starterStyle=process.env.CINEMA_STARTER_STYLE||'sustainable';assert.ok(['sustainable','overwork'].includes(starterStyle));
const output:any[]=[];const saveReport=()=>writeFileSync(process.env.CINEMA_LONG_SAVE_OUTPUT||'/private/tmp/actor-cinema-long-save.json',JSON.stringify({kind:'ACTUAL_GAME_WEEK_AND_VERIFIED_SAVE_COORDINATOR',weeks:output.reduce((n,r)=>n+r.weeks,0),saves:output},null,2)+'\n');
// An existing v1 save upgrades future tuning without rewriting any paid facts or money.
{const p=makeCinemaLongSave('legacy-active');p.world.cinemaMarket!.tuningVersion=1;p.world.cinemaMarket!.market.tuningVersion=1;const old=structuredClone(p),m=migrateCinemaState(p,getAbsoluteWeek(p.age,p.currentWeek));assert.equal(m.player.world.cinemaMarket!.tuningVersion,CINEMA_MARKET_TUNING_VERSION);assert.equal(m.player.money,p.money);assert.deepEqual(m.player.world.cinemaMarket!.titles,p.world.cinemaMarket!.titles);assert.deepEqual(m.player.world.cinemaMarket!.weeks,p.world.cinemaMarket!.weeks);assert.deepEqual(p,old);const future=structuredClone(p);future.world.cinemaMarket!.tuningVersion=99;assert.equal(migrateCinemaState(future,getAbsoluteWeek(p.age,p.currentWeek)).status,'REJECTED');console.log('PASS tuning 1 migration preserves money/history and future tuning is rejected')}
for(const name of LONG_SAVE_CASES.filter(n=>(!process.env.CINEMA_LONG_CASE||process.env.CINEMA_LONG_CASE===n)&&(!process.env.CINEMA_LONG_CASES||process.env.CINEMA_LONG_CASES.split(',').includes(n)))){
 const weeks=Number(process.env.CINEMA_LONG_WEEKS||(name==='ordinary-starter'?208:26));let executedWeeks=0;
 console.log('START '+name);
 Math.random=createDeterministicRng('long-save:'+name);let player=makeCinemaLongSave(name,starterStyle);const campaigns:{absoluteWeek:number;cashBefore:number;spent:number;cashAfter:number}[]=[];const actions:CareerAction[]=[],ordinaryTitleIds=new Set<string>(),phasesSaved=new Set<string>();const startingMoney=player.money;const store=new CinemaMemorySaveStore();let sawOpening=false,sawRepeat=false,sawExit=false,sawStreaming=false,sawProduction=false,crashRetried=false,reloads=0;const checkpoints:any[]=[];
 let prepared=prepareVerifiedPlayerForPersistence(player,'MIGRATION');await saveVerifiedGameData(store,name,prepared.player,prepared.manifest);player=prepared.player;
 if(name==='ordinary-starter')player.commitments=player.commitments.filter(c=>c.type!=='ACTING_GIG');
 const initialLegacy=player.world.cinemaMarket!.titles['long-film']?.legacyGrossCents;
 for(let i=0;i<weeks;i++){
  if(name==='ordinary-starter'){assert.ok(!player.flags.isDead,'A dead headless player is not a valid ordinary career journey');if(starterStyle==='sustainable')assert.ok(player.money>=0,'Cash-funded career observation has entered an unfunded deficit')}
  if(name==='ordinary-starter'){
   player=prepareOrdinaryCinemaWeek(player,actions);
   for(const c of player.commitments)if(c.projectDetails){ordinaryTitleIds.add(c.id);sawProduction||=c.projectPhase==='PRODUCTION';
    const phase=c.projectPhase||'UNKNOWN';if(process.env.CINEMA_LONG_CHECKPOINT_DIR&&!phasesSaved.has(phase)){mkdirSync(process.env.CINEMA_LONG_CHECKPOINT_DIR,{recursive:true});writeFileSync(process.env.CINEMA_LONG_CHECKPOINT_DIR+'/'+phase+'.json',JSON.stringify(player));phasesSaved.add(phase)}
   }
  }else for(const c of player.commitments)if(c.projectPhase==='PRODUCTION'){sawProduction=true;if(player.energy.current>=20){c.productionPerformance=Math.min(100,(c.productionPerformance||0)+calculateProductionGain(player,c.roleType||'MINOR',c.productionPerformance||0,false));spendPlayerEnergy(player,20,'Career rehearsal')}}
  const ready=player.commitments.find(c=>c.projectDetails&&['POST_PRODUCTION','AWAITING_RELEASE'].includes(c.projectPhase||''));
  if(ready&&name!=='ordinary-starter'){
   const d=ready.projectDetails!;const spend=d.marketingBudgetSpent||0;const business=player.businesses.find(b=>b.id===d.studioId)!;assert.ok(business.balance>=spend);business.balance-=spend;
   const project=commitCinemaReleaseExposure({player,project:d,titleId:ready.id,absoluteWeek:getAbsoluteWeek(player.age,player.currentWeek),allocations:d.marketingChannelAllocations||{}});
   player.activeReleases.push({id:ready.id,name:ready.name,type:'MOVIE',roleType:'LEAD',projectDetails:project,weekNum:1,weeklyGross:[],totalGross:0,budget:d.estimatedBudget,status:'RUNNING',productionPerformance:ready.productionPerformance,imdbRating:8,distributionPhase:'THEATRICAL',releasedAtAbsoluteWeek:getAbsoluteWeek(player.age,player.currentWeek)+1,sequelDecisionMade:true});player.commitments=player.commitments.filter(c=>c.id!==ready.id);
  }
  if(i%13===0)console.log('PROGRESS '+name+' '+i+'/'+weeks,JSON.stringify({cash:player.money,energy:player.energy.current,phases:player.commitments.filter(c=>c.projectDetails).map(c=>c.projectPhase),campaignPaid:campaigns.reduce((n,c)=>n+c.spent,0)}));
  const before=structuredClone(player),week=getAbsoluteWeek(player.age,player.currentWeek),r=await processGameWeek(player);assert.deepEqual(player,before);assert.equal(getAbsoluteWeek(r.player.age,r.player.currentWeek),week+1);assert.deepEqual(inspectCinemaSavedState(r.player.world.cinemaMarket),[]);
  if(name==='ordinary-starter'){assert.ok(!r.player.flags.isDead,'Ordinary career must survive the actual weekly health outcome');if(starterStyle==='sustainable')assert.ok(r.player.money>=0,'Ordinary career funding failed before a cash-funded release')}
  const state=r.player.world.cinemaMarket!,rows=state.weeks.at(-1)!.titles;const relevant=rows.filter(t=>t.titleId==='long-film'||ordinaryTitleIds.has(t.titleId));
  for(const t of rows){assert.equal(t.grossCents,t.producerReceiptsCents+t.exhibitorReceiptsCents+t.distributionDeductionsCents);assert.ok(t.actorPaidCents+t.investorPaidCents+t.talentPaidCents<=t.producerReceiptsCents+(t.soundtrackReceiptsCents||0))}
  assert.ok(state.weeks.length<=52);assert.equal(new Set(state.weeks.map(w=>w.id)).size,state.weeks.length);
  const opened=!sawOpening&&relevant.some(t=>t.firstAdmissions>0),repeated=!sawRepeat&&relevant.some(t=>t.repeatAdmissions>0),exited=!sawExit&&relevant.some(t=>t.closed),streamed=!sawStreaming&&r.player.activeReleases.some(t=>t.streamingContractId&&(t.id==='long-film'||ordinaryTitleIds.has(t.id)));
  sawOpening||=opened;sawRepeat||=repeated;sawExit||=exited;sawStreaming||=streamed;
  try{prepared=prepareVerifiedPlayerForPersistence(r.player,'PROCESS_WEEK')}catch(error){console.error('SAVE_PREP_FAILURE',name,i);writeFileSync('/private/tmp/actor-phase6-save-failure.json',JSON.stringify(r.player));throw error}
  if(!crashRetried&&(opened||i===10)){
   store.failPromotion=true;await assert.rejects(()=>saveVerifiedGameData(store,name,prepared.player,prepared.manifest),/promotion/);const old=await loadVerifiedGameData(store,name);assert.equal(old.status,'CURRENT');assert.equal(getAbsoluteWeek(old.player!.age,old.player!.currentWeek),week);store.failPromotion=false;crashRetried=true;
  }
  await saveVerifiedGameData(store,name,prepared.player,prepared.manifest);
  if(opened||repeated||exited||streamed||i%13===0){const loaded=await loadVerifiedGameData(store,name);assert.equal(loaded.status,'CURRENT');player=JSON.parse(JSON.stringify(loaded.player));assert.deepEqual(player.world.cinemaMarket,JSON.parse(JSON.stringify(prepared.player.world.cinemaMarket)));reloads++;checkpoints.push({week:week+1,opening:opened,repeat:repeated,exit:exited,streaming:streamed});
   if(opened){const input=buildCinemaWeekInput(before,week+1),result=simulateCinemaWeek(input);const paid=processCinemaMarketWeek(before,week+1).player,replay=commitCinemaWeek(JSON.parse(JSON.stringify(paid)),result);assert.equal(replay.applied,false);assert.deepEqual(replay.player,JSON.parse(JSON.stringify(paid)))}
  }else player=prepared.player;
  executedWeeks++;if(initialLegacy!==undefined)assert.equal(player.world.cinemaMarket!.titles['long-film'].legacyGrossCents,initialLegacy);
  if(name==='ordinary-starter'&&process.env.CINEMA_LONG_STOP_AT_OPENING!=='0'&&sawOpening)break;
 }
 if(name==='ordinary-starter'&&process.env.CINEMA_LONG_CHECKPOINT_DIR)writeFileSync(process.env.CINEMA_LONG_CHECKPOINT_DIR+'/FINAL.json',JSON.stringify(player));
 assert.ok(crashRetried&&reloads>=Math.floor(executedWeeks/13));if(!['ordinary-starter','late-handoff'].includes(name))assert.ok(sawOpening,'Prepared film should reach paid opening');
 if(name==='ordinary-starter')writeFileSync('/private/tmp/actor-phase6-starter-debug.json',JSON.stringify({sawProduction,sawOpening,money:player.money,skills:player.stats.skills,campaigns,actions,executedWeeks,commitments:player.commitments,logs:player.logs,projectFacts:player.world.cinemaMarket!.titles}));
 if(name==='ordinary-starter'){assert.ok(sawProduction&&sawOpening,'Starter must actually complete production and paid release');if(starterStyle==='sustainable'){assert.ok(actions.some(a=>a.action==='Career Instagram promotion'),'Actor must actually promote the film using the available Career action');assert.ok(actions.some(a=>a.action.startsWith('Apply current audition')),'Actor must pass actual application screening');assert.ok(actions.every(a=>a.cashAfter>=0),'Catalogue actions must stay funded');assert.ok(player.money>=0,'Ordinary strategy must finish without an unfunded cash deficit')}}
 if(name==='late-handoff')assert.ok(sawExit&&sawStreaming,'Late playable film must actually exit and sign a streaming handoff');
 const row={name,actions,ordinaryTitleIds:[...ordinaryTitleIds],starterStyle:name==='ordinary-starter'?starterStyle:undefined,campaigns,evidence:name==='ordinary-starter'?'INITIAL_PLAYER $2000; current jobs fund catalogue genre training and wellbeing; current audition applications spend 25 energy and pass the real shortlist; 20-energy practice with actual job overwork; Career organic promotion; studio controls its cash marketing; no grants or casting override':'AUTHORED_EXISTING_SAVE',horizonWeeks:weeks,weeks:executedWeeks,startingMoney,endingMoney:player.money,endingHealth:player.stats.health,endingBody:player.stats.body,endingMood:player.stats.happiness,sawProduction,sawOpening,sawRepeat,sawExit,sawStreaming,crashRetried,reloads,checkpoints,saveBytes:Buffer.byteLength(JSON.stringify(player)),retainedCinemaWeeks:player.world.cinemaMarket!.weeks.length,titleFacts:player.world.cinemaMarket!.titles};output.push(row);saveReport();console.log('PASS long save '+name+': '+JSON.stringify({weeks:executedWeeks,sawProduction,sawOpening,sawRepeat,sawExit,sawStreaming,reloads}));
}
saveReport();
