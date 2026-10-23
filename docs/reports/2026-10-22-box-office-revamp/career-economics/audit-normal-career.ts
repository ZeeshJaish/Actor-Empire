import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {makeCinemaLongSave} from '../../../../scripts/fixtures/boxOfficeLongRun';
import {prepareOrdinaryCinemaWeek,type CareerAction} from '../../../../scripts/fixtures/ordinaryCinemaCareer';
import {processGameWeek} from '../../../../services/gameLoop';
import {getAbsoluteWeek} from '../../../../services/legacyLogic';
import {prepareVerifiedPlayerForPersistence} from '../../../../services/savePreparation';
import {CinemaMemorySaveStore} from '../../../../scripts/fixtures/cinemaSaveStore';
import {saveVerifiedGameData,loadVerifiedGameData} from '../../../../services/saveGenerations';
import {migratePlayerSave} from '../../../../services/saveMigration';
import {inspectCinemaSavedState} from '../../../../services/boxOffice/boxOfficeMigration';
import {commitCinemaWeek} from '../../../../services/boxOffice/boxOfficeLiveSettlement';
import {createSaveIntegrityManifest} from '../../../../services/saveIntegrity';
import {cinemaAuditRandom,cinemaAuditClock,readCinemaAuditCheckpoint,writeCinemaAuditCheckpoint} from '../../../../scripts/fixtures/cinemaAuditCheckpoint';
import type {CinemaWeekResult} from '../../../../services/boxOffice/boxOfficeTypes';
import type {Player} from '../../../../types';
const seed=Number(process.env.CAREER_SEED||0),horizon=Number(process.env.CAREER_WEEKS||208);
const out=process.env.CAREER_OUTPUT||'/private/tmp/actor-cinema-career-economics-20261023';mkdirSync(out,{recursive:true});
const executionCodeSha256=createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex');
const checkpointPath=`${out}/career-${seed}-checkpoint.json.gz`,batchWeeks=Number(process.env.CAREER_BATCH_WEEKS||13);
assert.ok(Number.isInteger(batchWeeks)&&batchWeeks>0&&batchWeeks%13===0);
const checkpoint=process.env.CAREER_RESUME==='0'?undefined:readCinemaAuditCheckpoint<any>(checkpointPath);
if(checkpoint){assert.equal(checkpoint.executionCodeSha256,executionCodeSha256,'Checkpoint source differs');assert.equal(checkpoint.seed,seed);assert.equal(checkpoint.horizon,horizon)}
const rng=cinemaAuditRandom(`ordinary-career-economics:${seed}`,checkpoint?.randomCalls||0),clock=cinemaAuditClock(checkpoint?.clockNext);
Math.random=rng.next;Date.now=clock.now;
let player:Player=checkpoint?.player??makeCinemaLongSave('ordinary-starter');if(!checkpoint)assert.equal(player.money,2000);
const store=new CinemaMemorySaveStore(),key=`ordinary:${seed}`,actions:CareerAction[]=checkpoint?.actions||[],ownIds=new Set<string>(checkpoint?.ownIds||[]);
const metadata=new Map<string,any>(checkpoint?.metadata||[]),ownWeekly=new Map<string,any[]>(checkpoint?.ownWeekly||[]);
let saves=checkpoint?.saves||0,reloads=checkpoint?.reloads||0,replays=checkpoint?.replays||0,executedWeeks=checkpoint?.executedWeeks||0,
 resumeBootstrapWrites=checkpoint?.resumeBootstrapWrites||0,failedPromotionChecked=checkpoint?.failedPromotionChecked||false,status='RUNNING',failure:string|undefined;
const started=performance.now();
const elapsed=()=>Math.round((checkpoint?.elapsedMs||0)+performance.now()-started);
let peakRssBytes=checkpoint?.peakRssBytes||0;
const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const collect=()=>{
 const sources=new Map([...player.pastProjects,...player.activeReleases].map((r:any)=>[r.id,r]));
 const productions=new Map(Object.values(player.world.industryProductions||{}).map((p:any)=>[p.canonicalProjectId,p]));
 const projects=new Map(player.world.projects.map(p=>[p.id,p]));
 for(const paid of Object.values(player.world.cinemaMarket!.titles)){
  if(metadata.has(paid.titleId))continue;
  const r:any=sources.get(paid.titleId),prod:any=productions.get(paid.titleId),project:any=projects.get(paid.titleId),d=r?.projectDetails||r;
  const commercial=prod?.studioAiExecution?.result;
  const budget=r?.budget??d?.estimatedBudget??commercial?.productionSpendMillions*1e6;
  const campaign=d?.marketingBudgetSpent??r?.marketingBudgetSpent??commercial?.marketingSpendMillions*1e6;
  const paidEvents=(d?.cinemaExposure?.events||project?.cinemaExposure?.events||[]).filter((e:any)=>e.kind==='PAID_CAMPAIGN');
  const campaignFromEvents=[...new Map<string,any>(paidEvents.map((e:any)=>[e.id,e])).values()].reduce((n:number,e:any)=>n+(e.paidCostCents||0),0);
  metadata.set(paid.titleId,{id:paid.titleId,name:r?.name||project?.title||paid.titleId,genre:d?.genre||project?.genre,
   budgetCents:Number.isFinite(budget)?Math.round(budget*100):null,
   campaignCents:Number.isFinite(campaign)?Math.max(Math.round(campaign*100),campaignFromEvents):campaignFromEvents||null,
   quality:d?.hiddenStats?.qualityScore??project?.quality,universeId:d?.universeId||project?.universeId,
   source:r?'PLAYER_CREDIT':'WORLD_NPC',activationWeek:paid.activationWeek});
 }
};
const report=()=>{
 const serializedPlayer=JSON.stringify(player);
 const films=Object.values(player.world.cinemaMarket!.titles).filter(t=>t.basis==='UNSETTLED_WEEKLY'&&t.legacyGrossCents===0).map(t=>{
  const m=metadata.get(t.titleId)||{},costKnown=m.budgetCents!==null&&m.budgetCents!==undefined&&m.campaignCents!==null&&m.campaignCents!==undefined;
  const profit=costKnown?t.producerReceiptsCents-m.budgetCents-m.campaignCents-t.bookingCostCents-t.talentPaidCents-t.actorPaidCents:null;
  return {...m,ownCredit:ownIds.has(t.titleId),owner:t.ownerId,closed:t.closed,grossCents:t.grossCents,receiptsCents:t.producerReceiptsCents,
   bookingCents:t.bookingCostCents,investorPaidCents:t.investorPaidCents,talentPaidCents:t.talentPaidCents,actorPaidCents:t.actorPaidCents,
   first:t.firstAdmissions,repeats:t.repeatAdmissions,productionCampaignBookingKnown:costKnown,theatricalProjectProfitBeforeFinancingCents:profit,
   producerNetAfterSignedSharesCents:t.producerReceiptsCents-t.bookingCostCents-t.talentPaidCents-t.actorPaidCents-t.investorPaidCents,
   weekly:ownWeekly.get(t.titleId)};
 });
 const row={kind:'NORMAL_INITIAL_PLAYER_CAREER_CURRENT_ACTION_POLICY',executionCodeSha256,seed,horizon,status,failure,executedWeeks,saves,reloads,replays,failedPromotionChecked,resumeBootstrapWrites,
  startingMoney:2000,endingMoney:player.money,alive:!player.flags.isDead,health:player.stats.health,age:player.age,week:player.currentWeek,
  ownTitleIds:[...ownIds],ownPaidFilms:films.filter(f=>f.ownCredit),films,actions:actions.length,actionLog:actions,
  elapsedMs:elapsed(),saveBytes:serializedPlayer.length,playerSha256:createHash('sha256').update(serializedPlayer).digest('hex'),peakRssBytes,
  limits:['One existing sustainable DRAMA/minor-role action policy; not all player strategies','No authored cash, skill, cast, delivered craft or audience grants',
   'Actual game loop each week, verified persistence at paid opening/closure or every 13 weeks; not full UI per week',
   'Open runs are censored and excluded from lifetime hit/flop denominators','Project theatrical result excludes future streaming/home media and investor ownership distributions']};
 writeFileSync(`${out}/career-${seed}.json`,JSON.stringify(row,null,2));
};
try{
 if(checkpoint){
  const next=clock.next();await saveVerifiedGameData(store,key,player,createSaveIntegrityManifest(player,'MIGRATION'));clock.restore(next);
  saves++;resumeBootstrapWrites++;
 }else{const pre=prepareVerifiedPlayerForPersistence(player,'MIGRATION');await saveVerifiedGameData(store,key,pre.player,pre.manifest);player=pre.player;saves++}
 const batchStart=executedWeeks;
 for(let i=executedWeeks;i<horizon;i++){
  if(player.flags.isDead){status='CAREER_ENDED_DEATH';break}
  player=prepareOrdinaryCinemaWeek(player,actions);assert.ok(player.money>=0,'Ordinary policy must fund its actions');
  for(const c of player.commitments)if(c.projectDetails?.type==='MOVIE')ownIds.add(c.id);
  const priorClock=getAbsoluteWeek(player.age,player.currentWeek);let cinema:CinemaWeekResult|undefined;
  const r=await processGameWeek(player,{onCinemaResult:x=>cinema=x});assert.ok(cinema);
  assert.equal(getAbsoluteWeek(r.player.age,r.player.currentWeek),priorClock+1);assert.deepEqual(inspectCinemaSavedState(r.player.world.cinemaMarket),[]);
  for(const c of cinema.cohorts){assert.ok(c.spentCents<=c.walletCents);assert.ok(c.usedMinutes<=c.leisureMinutes)}
  for(const s of cinema.supply){assert.ok(s.admissions<=s.seats);assert.ok(s.usedScreenMinutes<=s.availableScreenMinutes)}
  for(const t of r.player.world.cinemaMarket!.weeks.at(-1)!.titles){
   assert.equal(t.grossCents,t.producerReceiptsCents+t.exhibitorReceiptsCents+t.distributionDeductionsCents);
   assert.ok(t.actorPaidCents+t.investorPaidCents+t.talentPaidCents<=t.producerReceiptsCents+(t.soundtrackReceiptsCents||0));
   if(ownIds.has(t.titleId)){const rows=ownWeekly.get(t.titleId)||[];rows.push({absoluteWeek:priorClock+1,grossCents:t.grossCents,closed:t.closed});ownWeekly.set(t.titleId,rows)}
  }
  assert.equal(commitCinemaWeek(r.player,cinema).applied,false);replays++;
  const paidOwn=r.player.world.cinemaMarket!.weeks.at(-1)!.titles.filter(t=>ownIds.has(t.titleId));
  const event=paidOwn.some(t=>t.closed||!metadata.has(t.titleId));
  player=r.player;executedWeeks++;
  // Keep the same save/migration schedule whether this worker stops or continues.
  if(event||i%13===0||executedWeeks%13===0||i===horizon-1||player.flags.isDead){
   const prepared=prepareVerifiedPlayerForPersistence(player,'PROCESS_WEEK');
   if(!failedPromotionChecked&&i>=10){
    const before=await loadVerifiedGameData(store,key);assert.equal(before.status,'CURRENT');const frozen=hash({money:before.player!.money,businesses:before.player!.businesses,cinema:before.player!.world.cinemaMarket});
    store.failPromotion=true;await assert.rejects(()=>saveVerifiedGameData(store,key,prepared.player,prepared.manifest),/promotion/);store.failPromotion=false;
    const after=await loadVerifiedGameData(store,key);assert.equal(after.status,'CURRENT');assert.equal(hash({money:after.player!.money,businesses:after.player!.businesses,cinema:after.player!.world.cinemaMarket}),frozen);failedPromotionChecked=true;
   }
   await saveVerifiedGameData(store,key,prepared.player,prepared.manifest);saves++;
   const loaded=await loadVerifiedGameData(store,key);assert.equal(loaded.status,'CURRENT');
   const protectedBefore=hash({money:loaded.player!.money,businesses:loaded.player!.businesses,cinema:loaded.player!.world.cinemaMarket});
   player=migratePlayerSave(loaded.player!);
   // Migration may normalize company metadata; actual cash and cinema paid facts are protected.
   assert.equal(player.money,loaded.player!.money);assert.deepEqual(player.world.cinemaMarket,loaded.player!.world.cinemaMarket);
   assert.deepEqual(player.businesses.map(b=>[b.id,b.balance]),loaded.player!.businesses.map(b=>[b.id,b.balance]));reloads++;
  }
  collect();
  peakRssBytes=Math.max(peakRssBytes,process.memoryUsage().rss,process.resourceUsage().maxRSS*1024);
  if(i%13===0||event){report();console.log(JSON.stringify({seed,week:executedWeeks,cash:player.money,health:player.stats.health,films:metadata.size,ownPaid:[...ownWeekly.keys()]}))}
  if(player.money<0){status='CAREER_UNFUNDED';break}
  if(executedWeeks-batchStart>=batchWeeks&&executedWeeks<horizon){
   writeCinemaAuditCheckpoint(checkpointPath,{executionCodeSha256,seed,horizon,player,actions,ownIds:[...ownIds],metadata:[...metadata],ownWeekly:[...ownWeekly],
    saves,reloads,replays,executedWeeks,resumeBootstrapWrites,failedPromotionChecked,randomCalls:rng.calls(),clockNext:clock.next(),elapsedMs:elapsed(),peakRssBytes});
   status='CHECKPOINT_READY';break;
  }
 }
 if(status==='RUNNING')status=player.flags.isDead?'CAREER_ENDED_DEATH':'HORIZON_COMPLETE';
}catch(e){status='AUDIT_OR_POLICY_FAILURE';failure=e instanceof Error?e.stack:String(e);process.exitCode=1;}
finally{collect();report();console.log(JSON.stringify({seed,status,weeks:executedWeeks,ownPaid:ownWeekly.size,elapsedMs:Math.round(performance.now()-started)}))}
