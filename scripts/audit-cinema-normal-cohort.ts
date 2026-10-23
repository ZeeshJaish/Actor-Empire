import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {INITIAL_PLAYER,type Player,type Genre} from '../types';
import {migratePlayerSave} from '../services/saveMigration';
import {processGameWeek} from '../services/gameLoop';
import {getAbsoluteWeek} from '../services/legacyLogic';
import {getActorTalent} from '../services/roleLogic';
import {NPC_DATABASE} from '../services/npcLogic';
import {prepareVerifiedPlayerForPersistence} from '../services/savePreparation';
import {createSaveIntegrityManifest} from '../services/saveIntegrity';
import {saveVerifiedGameData,loadVerifiedGameData} from '../services/saveGenerations';
import {commitCinemaWeek} from '../services/boxOffice/boxOfficeLiveSettlement';
import {inspectCinemaSavedState} from '../services/boxOffice/boxOfficeMigration';
import {CinemaMemorySaveStore} from './fixtures/cinemaSaveStore';
import {cinemaAuditRandom,cinemaAuditClock,readCinemaAuditCheckpoint,writeCinemaAuditCheckpoint} from './fixtures/cinemaAuditCheckpoint';
import {createNormalAppCareerPolicy} from './fixtures/cinemaNormalAppPolicy';
import {summarizeCareerFilms,type CareerFilmObservation} from './fixtures/cinemaCareerCohortMetrics';
import type {CinemaWeekResult} from '../services/boxOffice/boxOfficeTypes';

const seed=Number(process.env.CAREER_SEED||0),horizon=Number(process.env.CAREER_WEEKS||208),batch=Number(process.env.CAREER_BATCH_WEEKS||6);
const genre=(['DRAMA','COMEDY','ACTION','DRAMA'] as Genre[])[seed%4];
const out=process.env.CAREER_OUTPUT!;assert.ok(out);mkdirSync(out,{recursive:true});
const executable=createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex');
const checkpointFile=`${out}/career-${seed}.json.gz`,prior=readCinemaAuditCheckpoint<any>(checkpointFile);
if(prior){assert.equal(prior.executable,executable);assert.equal(prior.horizon,horizon);assert.equal(prior.genre,genre)}
// The game mutates this runtime catalogue when NPCs earn music income. A cold
// audit worker must resume those earned values instead of resetting founders'
// wealth between batches. This belongs to the audit checkpoint, not user saves.
if(Array.isArray(prior?.npcDatabase)){
    NPC_DATABASE.length=0;for(const npc of prior.npcDatabase)NPC_DATABASE.push(npc);
    delete prior.npcDatabase;
}
const rng=cinemaAuditRandom('normal-cinema-cohort:'+seed,prior?.randomCalls||0),clock=cinemaAuditClock(prior?.clockNext||1800000000000+seed*10000000);
Math.random=rng.next;Date.now=clock.now;
let player:Player=prior?.player||migratePlayerSave(structuredClone(INITIAL_PLAYER));
// The live candidate owns this world now. Keeping the checkpoint wrapper's old
// world alive after the first copy-on-write week needlessly retains a second save.
if(prior)delete prior.player;
if(!prior){assert.equal(player.money,2000);assert.equal(getActorTalent(player.stats.skills),0);assert.equal(player.businesses.length,0)}
let weeks=prior?.weeks||0,saves=prior?.saves||0,reloads=prior?.reloads||0,replays=prior?.replays||0;
let failedPromotionChecked=prior?.failedPromotionChecked||false,status='RUNNING',failure:string|undefined;
const actions:any[]=prior?.actions||[],phases=new Set<string>(prior?.phases||[]),signed=new Map<string,number>(prior?.signed||[]);
const ownIds=new Set<string>(prior?.ownIds||[]),metadata=new Map<string,any>(prior?.metadata||[]),weekly=new Map<string,any[]>(prior?.weekly||[]);
const policy=createNormalAppCareerPolicy(genre,seed,actions,signed,phases);
const store=new CinemaMemorySaveStore(),key='normal-cohort-'+seed;
let peakRssBytes=prior?.peakRssBytes||0;const started=performance.now();
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const protectedState=(p:Player)=>({cash:p.money,businesses:p.businesses.map(b=>[b.id,b.balance]),cinema:p.world.cinemaMarket,
    contracts:p.world.streamingRightsContracts,shares:p.portfolio,awards:p.awards,roles:p.commitments.map(c=>({id:c.id,pay:c.lumpSum,phase:c.projectPhase,
        cast:c.projectDetails?.castList?.map(m=>({id:m.id,actorId:m.actorId,npcId:m.npcId,role:m.role,roleType:m.roleType,salary:m.salary,characterId:m.characterId,recognition:m.cinemaRecognition})),
        launch:c.projectDetails?.offeredCinemaLaunch,marketing:c.projectDetails?.marketingBudgetSpent}))});
const collect=()=>{
    const sources=new Map([...player.pastProjects,...player.activeReleases].map((r:any)=>[r.id,r]));
    const productions=new Map(Object.values(player.world.industryProductions||{}).map(p=>[p.canonicalProjectId,p]));
    const projects=new Map(player.world.projects.map(p=>[p.id,p]));
    for(const paid of Object.values(player.world.cinemaMarket!.titles)){
        if(metadata.has(paid.titleId))continue;
        const r:any=sources.get(paid.titleId),d=r?.projectDetails||r,project=projects.get(paid.titleId),production=productions.get(paid.titleId);
        const commercial=production?.studioAiExecution?.result;
        const budget=r?.budget??d?.estimatedBudget??(commercial?commercial.productionSpendMillions*1e6:undefined);
        const campaign=d?.marketingBudgetSpent??r?.marketingBudgetSpent??(commercial?commercial.marketingSpendMillions*1e6:undefined);
        const events=(d?.cinemaExposure?.events||project?.cinemaExposure?.events||[]).filter((e:any)=>e.kind==='PAID_CAMPAIGN');
        const paidCampaign=[...new Map<string,any>(events.map((e:any)=>[e.id,e])).values()].reduce((n:number,e:any)=>n+(e.paidCostCents||0),0);
        metadata.set(paid.titleId,{id:paid.titleId,name:r?.name||project?.title||paid.titleId,genre:d?.genre||project?.genre,
            quality:d?.hiddenStats?.qualityScore??r?.projectQuality??project?.quality,universeId:d?.universeId||project?.universeId,
            budgetCents:Number.isFinite(budget)?Math.round(budget*100):null,
            campaignCents:Number.isFinite(campaign)?Math.max(Math.round(campaign*100),paidCampaign):paidCampaign||null,
            activationWeek:paid.activationWeek,source:r?'PLAYER_CREDIT':'WORLD_NPC'});
    }
};
const films=():CareerFilmObservation[]=>Object.values(player.world.cinemaMarket!.titles).filter(t=>t.basis==='UNSETTLED_WEEKLY'&&t.legacyGrossCents===0).map(t=>({
    ...metadata.get(t.titleId),id:t.titleId,owner:t.ownerId,ownCredit:ownIds.has(t.titleId),closed:t.closed,
    grossCents:t.grossCents,receiptsCents:t.producerReceiptsCents,bookingCents:t.bookingCostCents,talentPaidCents:t.talentPaidCents,
    actorPaidCents:t.actorPaidCents,investorPaidCents:t.investorPaidCents,lastSettledWeek:t.lastSettledWeek,
    first:t.firstAdmissions,repeats:t.repeatAdmissions,weekly:weekly.get(t.titleId),budgetCents:metadata.get(t.titleId)?.budgetCents??null,
    campaignCents:metadata.get(t.titleId)?.campaignCents??null,
}));
const report=()=>{
    collect();const observed=films(),summary=summarizeCareerFilms(observed);
    writeFileSync(`${out}/career-${seed}.json`,JSON.stringify({kind:'ACTUAL_NORMAL_CAREER_COHORT',executable,seed,genre,horizon,status,failure,
        weeks,saves,reloads,replays,failedPromotionChecked,phases:[...phases],ownIds:[...ownIds],cash:player.money,alive:!player.flags.isDead,
        skill:getActorTalent(player.stats.skills),health:player.stats.health,peakRssBytes,elapsedMs:(prior?.elapsedMs||0)+Math.round(performance.now()-started),
        summary,films:observed,actions,limitations:['Fresh $2000 actor; exact current App action callbacks; no grants',
            'Fixed sustainable actor policy, not every player strategy; some credits may be series/streaming',
            'Only completed cinema titles with known production/campaign costs enter hit/loss denominators',
            'Shared studio identities can recur across careers; pooled film observations are not independent population probabilities',
            'Theatrical result excludes future media and investor ownership distributions; recorded backend is a cost']},null,2));
};
const persist=async(fault=false)=>{
    const prepared=prepareVerifiedPlayerForPersistence(player,'PROCESS_WEEK');
    if(fault){
        const old=await loadVerifiedGameData(store,key);assert.equal(old.status,'CURRENT');const expected=hash(protectedState(old.player!));
        store.failPromotion=true;await assert.rejects(()=>saveVerifiedGameData(store,key,prepared.player,prepared.manifest),/promotion/);store.failPromotion=false;
        const recovered=await loadVerifiedGameData(store,key);assert.equal(recovered.status,'CURRENT');assert.equal(hash(protectedState(recovered.player!)),expected);failedPromotionChecked=true;
    }
    await saveVerifiedGameData(store,key,prepared.player,prepared.manifest);saves++;
    const loaded=await loadVerifiedGameData(store,key);assert.equal(loaded.status,'CURRENT');
    const expected=hash(protectedState(loaded.player!));player=migratePlayerSave(loaded.player!);assert.equal(hash(protectedState(player)),expected);
    // A legacy generated co-star may receive missing AUTO story defaults. Existing story identities must still survive.
    for(const c of loaded.player!.commitments)for(const member of c.projectDetails?.castList||[]){
        const next=player.commitments.find(n=>n.id===c.id)?.projectDetails?.castList?.find(n=>n.id===member.id);
        for(const key of ['storyFunction','storyRole','abilityType','nature','identitySource'] as const)
            if(member[key]!==undefined)assert.deepEqual(next?.[key],member[key]);
    }
    reloads++;
};
try{
    // Re-create the in-memory test store, preserving the checkpoint's simulation clock.
    const next=clock.next();await saveVerifiedGameData(store,key,player,createSaveIntegrityManifest(player,'MIGRATION'));clock.restore(next);saves++;
    const start=weeks;
    while(weeks<horizon&&weeks-start<batch&&!player.flags.isDead){
        player=policy(player,weeks);
        for(const c of player.commitments)if(c.projectDetails?.type==='MOVIE')ownIds.add(c.id);
        const before=getAbsoluteWeek(player.age,player.currentWeek);let result:CinemaWeekResult|undefined;
        player=(await processGameWeek(player,{onCinemaResult:r=>result=r})).player;weeks++;
        assert.ok(result);assert.equal(getAbsoluteWeek(player.age,player.currentWeek),before+1);
        assert.deepEqual(inspectCinemaSavedState(player.world.cinemaMarket),[]);
        for(const c of result.cohorts){assert.ok(c.spentCents<=c.walletCents);assert.ok(c.usedMinutes<=c.leisureMinutes)}
        for(const s of result.supply){assert.ok(s.admissions<=s.seats);assert.ok(s.usedScreenMinutes<=s.availableScreenMinutes)}
        const rows=player.world.cinemaMarket!.weeks.at(-1)!.titles;
        for(const t of rows){
            assert.equal(t.grossCents,t.producerReceiptsCents+t.exhibitorReceiptsCents+t.distributionDeductionsCents);
            assert.ok(t.actorPaidCents+t.investorPaidCents+t.talentPaidCents<=t.producerReceiptsCents+(t.soundtrackReceiptsCents||0));
            const w=weekly.get(t.titleId)||[];w.push({week:weeks,grossCents:t.grossCents,closed:t.closed});weekly.set(t.titleId,w);
        }
        assert.equal(commitCinemaWeek(player,result).applied,false);replays++;
        const playerEvent=rows.some(t=>ownIds.has(t.titleId)&&(t.closed||!metadata.has(t.titleId)));
        if(weeks%13===0||playerEvent||weeks===horizon)await persist(!failedPromotionChecked&&weeks>=13);
        collect();peakRssBytes=Math.max(peakRssBytes,process.memoryUsage().rss,process.resourceUsage().maxRSS*1024);
        if(weeks%4===0)console.log(JSON.stringify({seed,weeks,cash:player.money,own:ownIds.size,titles:metadata.size,peakMiB:Math.round(peakRssBytes/1048576)}));
        if(player.money<0){status='UNFUNDED';break}
        (globalThis as any).gc?.();
    }
    if(status==='RUNNING')status=player.flags.isDead?'CAREER_ENDED':weeks>=horizon?'HORIZON_COMPLETE':'CHECKPOINT_READY';
    writeCinemaAuditCheckpoint(checkpointFile,{executable,horizon,genre,player,npcDatabase:NPC_DATABASE,weeks,saves,reloads,replays,failedPromotionChecked,actions,
        ownIds:[...ownIds],metadata:[...metadata],weekly:[...weekly],signed:[...signed],phases:[...phases],randomCalls:rng.calls(),clockNext:clock.next(),
        peakRssBytes,elapsedMs:(prior?.elapsedMs||0)+Math.round(performance.now()-started)});
}catch(e){status='FAILURE';failure=(e as Error).stack;process.exitCode=1;}
report();console.log(JSON.stringify({seed,status,weeks,own:ownIds.size,cash:player.money,failure}));
