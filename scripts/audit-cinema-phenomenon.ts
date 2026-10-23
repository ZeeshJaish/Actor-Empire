import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {processGameWeek} from '../services/gameLoop';
import {getAbsoluteWeek} from '../services/legacyLogic';
import {NPC_DATABASE} from '../services/npcLogic';
import {resolveLifeEventFallback} from '../services/lifeEventFallback';
import {applyCrisisImpact} from '../services/productionService';
import {IMPROVEMENT_CATALOG} from '../services/lifestyleLogic';
import {LIFESTYLE_ACTIVITY_CATALOG,createDefaultLifestyleActivitySelections,resolveLifestyleActivity,getLifestyleActivityCooldownWeeks} from '../services/lifestyleActivities';
import {careerActionHarness} from './fixtures/actorCareerActions';
import {prepareVerifiedPlayerForPersistence} from '../services/savePreparation';
import {createSaveIntegrityManifest} from '../services/saveIntegrity';
import {saveVerifiedGameData,loadVerifiedGameData} from '../services/saveGenerations';
import {commitCinemaWeek} from '../services/boxOffice/boxOfficeLiveSettlement';
import {inspectCinemaSavedState} from '../services/boxOffice/boxOfficeMigration';
import {CinemaMemorySaveStore} from './fixtures/cinemaSaveStore';
import {cinemaAuditRandom,cinemaAuditClock,readCinemaAuditCheckpoint,writeCinemaAuditCheckpoint} from './fixtures/cinemaAuditCheckpoint';
import {makeBillionCareer,queueBillionFilm,BILLION_STUDIO_ID} from './fixtures/boxOfficeBillionCareer';
import type {Player} from '../types';
import type {CinemaWeekResult} from '../services/boxOffice/boxOfficeTypes';

const seed=Number(process.env.CAREER_SEED||0),weak=seed===1,horizon=Number(process.env.CAREER_WEEKS||156),batch=Number(process.env.CAREER_BATCH_WEEKS||1);
assert.ok(seed===0||seed===1);
const out=process.env.CAREER_OUTPUT!;mkdirSync(out,{recursive:true});
const executable=createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),file=`${out}/career-${seed}.json.gz`,branchFile=out+'/earned-alive.json.gz';
const prior=readCinemaAuditCheckpoint<any>(file),branch=!prior&&weak?readCinemaAuditCheckpoint<any>(branchFile):undefined;
const resume=prior||branch;if(resume){assert.equal(resume.executable,executable);assert.equal(resume.horizon,horizon)}
if(weak&&!prior)assert.ok(branch,'Strong journey must first earn the shared alive universe checkpoint');
// Preserve already-earned runtime NPC wealth across cold worker batches, just
// as the normal-career audit does; no user-save or gameplay reward is changed.
if(Array.isArray(resume?.npcDatabase)){
    NPC_DATABASE.length=0;for(const npc of resume.npcDatabase)NPC_DATABASE.push(npc);
    delete resume.npcDatabase;
}
const rng=cinemaAuditRandom('phenomenon-matched-world',resume?.randomCalls||0),clock=cinemaAuditClock(resume?.clockNext||1800000000000);
Math.random=rng.next;Date.now=clock.now;
let player:Player=resume?.player||makeBillionCareer();assert.ok(prior||!player.flags.isDead,'No deceased source or resurrection can prove an active owner career');
if(resume)delete resume.player;
const filmId='cohort-phenomenon',campaign=350e6,budget=300e6;
let weeks=prior?.weeks||0,preWeeks=resume?.preWeeks||0,finalWeeks=prior?.finalWeeks||0,stage:string=prior?.stage||(branch?'FINAL':'PRECURSORS');
let queued=prior?.queued||false,precursors:any[]=resume?.precursors||[],saves=prior?.saves||0,reloads=prior?.reloads||0,replays=prior?.replays||0;
let failedPromotionChecked=prior?.failedPromotionChecked||false,status='RUNNING',failure:string|undefined,peakRssBytes=prior?.peakRssBytes||0;
let healthcareSpent=prior?.healthcareSpent||0;const healthcare:any[]=prior?.healthcare||[],weekly:any[]=prior?.weekly||[];
const store=new CinemaMemorySaveStore(),key='phenomenon-'+seed,started=performance.now();
const protect=(p:Player)=>JSON.stringify({money:p.money,businesses:p.businesses.map(b=>[b.id,b.balance]),cinema:p.world.cinemaMarket});
const care=()=>{
    while(player.pendingEvents.length){const event=player.pendingEvents[0],queue=player.pendingEvents;
        if(event.data?.lifeEvent){const life=event.data.lifeEvent,index=life.options.findIndex((o:any)=>!o.isGolden);assert.ok(index>=0);const option=life.options[index];player=(typeof option.impact==='function'?option.impact(player):resolveLifeEventFallback(player,life,index,option)).updatedPlayer;}
        else if(['PRODUCTION_CRISIS','DIRECTOR_DECISION'].includes(event.type)){const index=(event.data.options||[]).findIndex((o:any)=>!o.isGolden&&!/\$|\.money\.label|pr\.label|cgi\.label/.test([o.label,o.labelKey].join(' ')));assert.ok(index>=0);player=applyCrisisImpact(player,event,index).updatedPlayer;}
        else throw Error('Unhandled actual owner choice '+event.type);
        player.pendingEvents=queue.filter(e=>e.id!==event.id);
    }
    const conditions=player.activeHealthConditions||[];
    if((conditions.length||player.stats.health<65)&&getLifestyleActivityCooldownWeeks(player,'wellness_reset')===0){
        const activity=LIFESTYLE_ACTIVITY_CATALOG.find(a=>a.id==='wellness_reset')!,ids=conditions.map(c=>c.conditionId).join(' ');
        const selections={...createDefaultLifestyleActivitySelections(activity),wellnessProgramId:/pain|injury/.test(ids)?'injury_rehab':/flu|respiratory/.test(ids)?'flu_care':/burnout|anxiety|sleep/.test(ids)?'stress_burnout':'regular_checkup',
            wellnessProviderId:'private_doctor',wellnessFocusId:conditions.length?'advanced_treatment':'full_diagnosis',wellnessSupportId:'followup_visit'};
        const before=player.money,result=resolveLifestyleActivity(player,activity,selections);assert.ok(result.success,result.message);player=result.player;
        const spent=before-player.money;assert.ok(spent>0);healthcareSpent+=spent;healthcare.push({week:weeks,spent,conditions:conditions.map(c=>c.conditionId)});
    }
    for(const [condition,id] of [[player.stats.health<75||player.stats.body<55,'opt_jog'],[player.stats.happiness<65,'opt_meditate'],[player.stats.health<55,'opt_checkup']] as const){
        if(!condition)continue;for(const [category,activities] of Object.entries(IMPROVEMENT_CATALOG)){const activity=activities.find(a=>a.options.some(o=>o.id===id)),option=activity?.options.find(o=>o.id===id);if(activity&&option)player=careerActionHarness(player).improve(category,activity.name,option);}
    }
};
const persist=async(fault=false)=>{
    const ready=prepareVerifiedPlayerForPersistence(player,'PROCESS_WEEK');
    if(fault){const old=await loadVerifiedGameData(store,key);assert.equal(old.status,'CURRENT');const expected=protect(old.player!);store.failPromotion=true;await assert.rejects(()=>saveVerifiedGameData(store,key,ready.player,ready.manifest),/promotion/);store.failPromotion=false;const recovered=await loadVerifiedGameData(store,key);assert.equal(protect(recovered.player!),expected);failedPromotionChecked=true;}
    await saveVerifiedGameData(store,key,ready.player,ready.manifest);saves++;const loaded=await loadVerifiedGameData(store,key);assert.equal(loaded.status,'CURRENT');assert.equal(protect(loaded.player!),protect(ready.player));player=loaded.player!;reloads++;
};
const snapshot=()=>({executable,horizon,player,npcDatabase:NPC_DATABASE,preWeeks,finalWeeks,stage,queued,precursors,weeks,saves,reloads,replays,failedPromotionChecked,randomCalls:rng.calls(),clockNext:clock.next(),weekly,peakRssBytes,healthcareSpent,healthcare});
try{
    const next=clock.next();await saveVerifiedGameData(store,key,player,createSaveIntegrityManifest(player,'MIGRATION'));clock.restore(next);saves++;
    const start=weeks;
    while((stage==='PRECURSORS'||finalWeeks<horizon)&&weeks-start<batch&&!player.flags.isDead){
        if(stage==='PRECURSORS'&&preWeeks%26===0){const n=preWeeks/26;player=queueBillionFilm(player,{id:`precursor-${n}`,budget:100e6,campaign:30e6,quality:92,estimatedQuality:85,castIndices:[n*2,n*2+1],universe:true});}
        if(stage==='FINAL'&&!queued){
            assert.equal(precursors.length,4);assert.ok(precursors.every(p=>p.firstAdmissions>0));
            const cash=player.businesses.find(b=>b.id===BILLION_STUDIO_ID)!.balance;
            player=queueBillionFilm(player,{id:filmId,budget,campaign,quality:weak?25:100,estimatedQuality:90,genre:'FANTASY',castIndices:[0,1,2,3,4,5,6,7],universe:true,wide:true});
            assert.equal(Math.round((cash-player.businesses.find(b=>b.id===BILLION_STUDIO_ID)!.balance)*100),(budget+campaign)*100);queued=true;
        }
        care();const previous=getAbsoluteWeek(player.age,player.currentWeek);let result:CinemaWeekResult|undefined;
        player=(await processGameWeek(player,{onCinemaResult:r=>result=r})).player;weeks++;
        assert.equal(getAbsoluteWeek(player.age,player.currentWeek),previous+1);assert.deepEqual(inspectCinemaSavedState(player.world.cinemaMarket),[]);
        for(const t of result!.titles)assert.equal(t.grossCents,t.producerReceiptsCents+t.exhibitorReceiptsCents+t.distributionDeductionsCents);
        for(const c of result!.cohorts){assert.ok(c.spentCents<=c.walletCents);assert.ok(c.usedMinutes<=c.leisureMinutes)}
        for(const s of result!.supply){assert.ok(s.admissions<=s.seats);assert.ok(s.usedScreenMinutes<=s.availableScreenMinutes)}
        assert.equal(commitCinemaWeek(player,result!).applied,false);replays++;
        if(stage==='PRECURSORS'){
            preWeeks++;
            if(preWeeks%26===0){const t=player.world.cinemaMarket!.titles[`precursor-${preWeeks/26-1}`];assert.ok(t.firstAdmissions>0);precursors.push({id:t.titleId,grossCents:t.grossCents,firstAdmissions:t.firstAdmissions});}
            if(preWeeks===104){assert.ok(!player.flags.isDead);await persist(!failedPromotionChecked);stage='FINAL';writeCinemaAuditCheckpoint(branchFile,snapshot());}
        }else{
            finalWeeks++;const row=player.world.cinemaMarket!.weeks.at(-1)!.titles.find(t=>t.titleId===filmId)!;assert.ok(row);
            const paid=player.world.cinemaMarket!.titles[filmId];weekly.push({week:finalWeeks,grossCents:row.grossCents,totalGrossCents:paid.grossCents,closed:row.closed,slate:result!.titles.length});
            if(row.closed||paid.grossCents>=3e11)await persist(!failedPromotionChecked);
            if(row.closed)status='NATURALLY_CLOSED';else if(paid.grossCents>=3e11)status='ATTAINMENT_REACHED';
        }
        if(weeks%13===0&&!(preWeeks===104&&finalWeeks===0))await persist(!failedPromotionChecked);
        peakRssBytes=Math.max(peakRssBytes,process.memoryUsage().rss,process.resourceUsage().maxRSS*1024);
        if(weeks%4===0)console.log(JSON.stringify({seed,weeks,stage,finalWeeks,grossB:(player.world.cinemaMarket!.titles[filmId]?.grossCents||0)/1e11,peakMiB:Math.round(peakRssBytes/1048576)}));
        if(status!=='RUNNING')break;(globalThis as any).gc?.();
    }
    if(status==='RUNNING')status=player.flags.isDead?'CAREER_ENDED':stage==='FINAL'&&finalWeeks>=horizon?'HORIZON_COMPLETE':'CHECKPOINT_READY';
    writeCinemaAuditCheckpoint(file,snapshot());
}catch(e){status='FAILURE';failure=(e as Error).stack;process.exitCode=1;}
const t=player.world.cinemaMarket!.titles[filmId];
writeFileSync(`${out}/career-${seed}.json`,JSON.stringify({kind:'CONDITIONAL_ALIVE_EARNED_ADVANCED_OWNER',executable,seed,weak,horizon,status,failure,stage,precursors,budget,campaign,weeks,preWeeks,finalWeeks,saves,reloads,replays,failedPromotionChecked,peakRssBytes,healthcareSpent,healthcare,alive:!player.flags.isDead,
    grossB:(t?.grossCents||0)/1e11,profitCents:t?t.producerReceiptsCents-t.bookingCostCents-t.talentPaidCents-t.actorPaidCents-(budget+campaign)*100:null,
    grossCents:t?.grossCents,receiptsCents:t?.producerReceiptsCents,bookingCostCents:t?.bookingCostCents,talentPaidCents:t?.talentPaidCents,actorPaidCents:t?.actorPaidCents,
    firstAdmissions:t?.firstAdmissions,repeatAdmissions:t?.repeatAdmissions,qualityInput:weak?25:100,closed:t?.closed,censored:!t?.closed,weekly,summary:{all:{completed:t?.closed?1:0},small:{completed:0},player:{completed:0}},
    elapsedMs:Math.round(performance.now()-started),limitations:['Prepared advanced owner, not a fresh normal career; excluded from ordinary hit/rarity rates',
        'Capital and completed craft packages authored; four precursor audiences earned in actual earlier weeks while owner remains alive',
        'Weak finale forks the exact same alive earned checkpoint and RNG/clock state; it does not get different precursor successes',
        'Actual paid clinic service, Greenlight funding, paid campaign, real premiere, world competition, weekly settlement and verified persistence run unchanged',
        'Observation stops at $3B attainment without closing the theatrical run; profit is collected to date, not lifetime']},null,2));
console.log(JSON.stringify({seed,status,weeks,stage,finalWeeks,grossB:(t?.grossCents||0)/1e11,failure}));
