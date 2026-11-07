import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import type {Player} from '../types';
import {performStudioTreasuryTransfer} from '../services/studioGroup';
import {PHASE_ONE_ENERGY_COSTS} from '../services/energyCosts';
import {processGameWeek} from '../services/gameLoop';
import {migratePlayerSave} from '../services/saveMigration';
import {NPC_DATABASE} from '../services/npcLogic';
import {getAbsoluteWeek} from '../services/legacyLogic';
import {getActorTalent} from '../services/roleLogic';
import {resolveLifeEventFallback} from '../services/lifeEventFallback';
import {applyCrisisImpact} from '../services/productionService';
import {LIFESTYLE_ACTIVITY_CATALOG,createDefaultLifestyleActivitySelections,buildLifestyleActivityQuote,resolveLifestyleActivity,getLifestyleActivityCooldownWeeks} from '../services/lifestyleActivities';
import {IMPROVEMENT_CATALOG} from '../services/lifestyleLogic';
import {careerActionHarness} from './fixtures/actorCareerActions';
import {matureCareerUi} from './fixtures/cinemaMatureAppPolicy';
import {commitCinemaWeek} from '../services/boxOffice/boxOfficeLiveSettlement';
import {inspectCinemaSavedState} from '../services/boxOffice/boxOfficeMigration';
import {getCinemaProjectFinance} from '../services/boxOffice/boxOfficeSettlement';
import {prepareVerifiedPlayerForPersistence} from '../services/savePreparation';
import {saveVerifiedGameData,loadVerifiedGameData} from '../services/saveGenerations';
import {CinemaFileSaveStore} from './fixtures/cinemaFileSaveStore';
import {cinemaAuditRandom,cinemaAuditClock,readCinemaAuditCheckpoint,writeCinemaAuditCheckpoint} from './fixtures/cinemaAuditCheckpoint';
import {foundEarnedStudio,developRealConcept,greenlightRealPackage,releaseRealPackage,developActualSequel,ownedUiSourceHashes} from './fixtures/cinemaOwnedStudioActions';
import type {CinemaWeekResult} from '../services/boxOffice/boxOfficeTypes';

const out=process.env.CAREER_OUTPUT!;assert.ok(out);mkdirSync(out,{recursive:true});
if(existsSync(out+'/executable.json')){const pinned=JSON.parse(readFileSync(out+'/executable.json','utf8'));for(const[file,sha]of Object.entries(ownedUiSourceHashes))assert.equal(sha,pinned.sourceHashes[file],'Pinned UI source must round-trip exactly: '+file);}
const origin=process.env.CAREER_ORIGIN_CHECKPOINT!;assert.ok(origin);
const originSha=createHash('sha256').update(readFileSync(origin)).digest('hex');
const originMetaFile=origin.replace(/career-\d+\.json\.gz$/,'executable.json');
const freshCurrentOrigin=existsSync(originMetaFile)&&JSON.parse(readFileSync(originMetaFile,'utf8')).kind==='normal-ui';
const executable=createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex');
const checkpoint=out+'/career-0.json.gz',prior=readCinemaAuditCheckpoint<any>(checkpoint);
const parentFile=process.env.OWNED_SEQUEL_PARENT_CHECKPOINT;
const parent=!prior&&parentFile?readCinemaAuditCheckpoint<any>(parentFile):undefined;
if(parent){assert.equal(parent.originSha,originSha);assert.ok(parent.films?.length===2&&parent.films.every((f:any)=>f.paid?.closed));const meta=JSON.parse(readFileSync(parentFile!.replace(/career-0\.json\.gz$/,'executable.json'),'utf8'));assert.equal(parent.executable,meta.sha256);}
const seed=prior||parent||readCinemaAuditCheckpoint<any>(origin);assert.ok(seed);
const parentSha=parentFile?createHash('sha256').update(readFileSync(parentFile)).digest('hex'):undefined;
const packageStyle=process.env.OWNED_PACKAGE_STYLE||'STANDARD';assert.ok(['STANDARD','EPIC','WEAK_WIDE','SMALL_WIDE','STARTER_SMALL'].includes(packageStyle));
if(prior)assert.equal(prior.packageStyle||'STANDARD',packageStyle);
const predecessorId=['WEAK_WIDE','SMALL_WIDE'].includes(packageStyle)?undefined:prior?.predecessorId||parent?.films.find((f:any)=>f.scale==='GLOBAL')?.id;
if(prior)assert.equal(prior.parentSha,parentSha);
const horizon=Number(process.env.CAREER_WEEKS||208),batch=Number(process.env.CAREER_BATCH_WEEKS||6);
if(prior){assert.equal(prior.executable,executable);assert.equal(prior.originSha,originSha);assert.deepEqual(prior.ownedUiSourceHashes,ownedUiSourceHashes);assert.equal(prior.horizon,horizon);}
if(seed.npcDatabase){NPC_DATABASE.length=0;NPC_DATABASE.push(...seed.npcDatabase);delete seed.npcDatabase;}
const rng=cinemaAuditRandom('normal-cinema-cohort:0',seed.randomCalls||0),clock=cinemaAuditClock(seed.clockNext);Math.random=rng.next;Date.now=clock.now;
let p:Player=seed.player;delete seed.player;
const protectedPaid=(v:Player)=>JSON.stringify({cash:v.money,cinema:v.world.cinemaMarket,rights:v.world.streamingRightsContracts,sponsors:v.activeSponsorships,businesses:v.businesses.map(b=>[b.id,b.balance])});
if(!prior){const before=protectedPaid(p);p=migratePlayerSave(p);assert.equal(protectedPaid(p),before,'Migration preserves earned cash, paid history and signed terms');assert.ok(!p.flags.isDead&&p.money>50e6);}
let weeks=prior?.weeks||0,studioId=prior?.studioId||(['WEAK_WIDE','SMALL_WIDE'].includes(packageStyle)?'':parent?.studioId)||'',status='CHECKPOINT_READY';
const actions:any[]=prior?.actions||[],films:any[]=prior?.films||[],trace:any[]=prior?.trace||[];
let saves=prior?.saves||0,reloads=prior?.reloads||0,replays=prior?.replays||0,failedPromotionChecked=prior?.failedPromotionChecked||false;
const generationDir=mkdtempSync(out+'/verified-generations-'),store=new CinemaFileSaveStore(generationDir),key='owned-studio';
const persist=async(fault=false)=>{const ready=prepareVerifiedPlayerForPersistence(p,'PROCESS_WEEK');
 if(fault){const old=await loadVerifiedGameData(store,key);assert.equal(old.status,'CURRENT');const expected=protectedPaid(old.player!);store.failPromotion=true;await assert.rejects(()=>saveVerifiedGameData(store,key,ready.player,ready.manifest),/promotion/);store.failPromotion=false;assert.equal(protectedPaid((await loadVerifiedGameData(store,key)).player!),expected);failedPromotionChecked=true;}
 await saveVerifiedGameData(store,key,ready.player,ready.manifest);saves++;const loaded=await loadVerifiedGameData(store,key);assert.equal(loaded.status,'CURRENT');assert.equal(protectedPaid(loaded.player!),protectedPaid(ready.player));p=loaded.player!;reloads++;
};
const personalReserve=()=>Math.ceil(((p.team.agent?.annualFee||0)+(p.team.manager?.annualFee||0))*1.15+1_000_000);
const care=()=>{
 // Real owner decisions can rebalance earned liquid cash while the film is in production.
 // Keep a personal living buffer; use the existing treasury validation and ledger.
 if(packageStyle==='STARTER_SMALL'&&studioId){
  const business=p.businesses.find(b=>b.id===studioId)!;
  if(business.balance<500_000&&p.money>1_000_000){
   const amount=Math.floor(Math.min(1_000_000-business.balance,p.money-1_000_000));
   const before=p.money+business.balance;const moved=performStudioTreasuryTransfer({player:p,studioId,action:'INJECT',counterparty:'PERSONAL',amount});assert.ok(moved.success,moved.reason);p=moved.player;
   assert.equal(Math.round((p.money+p.businesses.find(b=>b.id===studioId)!.balance)*100),Math.round(before*100));actions.push({week:weeks,action:'actual-working-capital-injection',amount});
  }
 }
 if(packageStyle==='STARTER_SMALL'&&studioId&&p.money<personalReserve()&&(films.some(f=>f.releasedWeek!==undefined)||p.money<500_000)){
  const business=p.businesses.find(b=>b.id===studioId)!;
  const amount=Math.floor(Math.min(Math.max(0,business.balance-1_000_000),personalReserve()-p.money));
  if(amount>0){const before=p.money+business.balance;const moved=performStudioTreasuryTransfer({player:p,studioId,action:'WITHDRAW',counterparty:'PERSONAL',amount});assert.ok(moved.success,moved.reason);p=moved.player;assert.equal(Math.round((p.money+p.businesses.find(b=>b.id===studioId)!.balance)*100),Math.round(before*100));actions.push({week:weeks,action:'actual-owner-distribution',amount});}
 }

 while(p.pendingEvents.length){const event=p.pendingEvents[0],queue=p.pendingEvents;let choice=0;
  if(event.data?.lifeEvent){const life=event.data.lifeEvent;choice=life.options.findIndex((o:any)=>!o.isGolden);assert.ok(choice>=0);const o=life.options[choice];p=(typeof o.impact==='function'?o.impact(p):resolveLifeEventFallback(p,life,choice,o)).updatedPlayer;}
  else if(['PRODUCTION_CRISIS','DIRECTOR_DECISION'].includes(event.type)){choice=(event.data.options||[]).findIndex((o:any)=>!o.isGolden&&!/\$|\.money\.label|pr\.label|cgi\.label/.test([o.label,o.labelKey].join(' ')));assert.ok(choice>=0);p=applyCrisisImpact(p,event,choice).updatedPlayer;}
  else throw Error('Unhandled actual owner decision '+event.type);
  p.pendingEvents=queue.filter(e=>e.id!==event.id);actions.push({week:weeks,action:'actual-choice',type:event.type,choice});
 }
 const conditions=p.activeHealthConditions||[];
 if((conditions.length||p.stats.health<65)&&getLifestyleActivityCooldownWeeks(p,'wellness_reset')===0){
  const clinic=LIFESTYLE_ACTIVITY_CATALOG.find(a=>a.id==='wellness_reset')!,ids=conditions.map(c=>c.conditionId).join(' ');
  const choices={...createDefaultLifestyleActivitySelections(clinic),wellnessProviderId:'private_doctor',wellnessProgramId:/pain|injury|fracture/.test(ids)?'injury_rehab':/flu|respiratory/.test(ids)?'flu_care':/burnout|anxiety|sleep/.test(ids)?'stress_burnout':'regular_checkup',wellnessFocusId:conditions.length?'advanced_treatment':'full_diagnosis',wellnessSupportId:'followup_visit'};
  const quote=buildLifestyleActivityQuote(clinic,choices,p);if(p.money>=quote.totalCost+1000){const treated=resolveLifestyleActivity(p,clinic,choices);assert.ok(treated.success,treated.message);actions.push({week:weeks,action:'paid-healthcare',cost:p.money-treated.player.money});p=treated.player;}
 }
 for(const [condition,id]of [[p.stats.health<78,'opt_checkup'],[p.stats.body<60,'opt_jog'],[p.stats.happiness<70,'opt_meditate']]as const){if(!condition)continue;
  for(const[category,groups]of Object.entries(IMPROVEMENT_CATALOG)){const activity=groups.find(g=>g.options.some(o=>o.id===id)),option=activity?.options.find(o=>o.id===id);if(activity&&option&&p.money>=option.moneyCost&&p.energy.current>=option.energyCost)p=careerActionHarness(p).improve(category,activity.name,option);}
 }
 for(const sponsor of [...p.activeSponsorships]){const remaining=sponsor.requirements.totalRequired-sponsor.requirements.progress,due=Math.min(remaining,Math.ceil(remaining/Math.max(1,sponsor.durationWeeks)));
  for(let i=0;i<due&&p.energy.current>=sponsor.requirements.energyCost+40;i++)p=matureCareerUi(p).perform(sponsor.id);
 }
};
const snapshot=()=>({executable,originSha,parentSha,predecessorId,packageStyle,ownedUiSourceHashes,horizon,weeks,studioId,player:p,npcDatabase:NPC_DATABASE,randomCalls:rng.calls(),clockNext:clock.next(),actions,films,trace,saves,reloads,replays,failedPromotionChecked});
let failure:string|undefined;
try{
 await persist();
 if(!studioId){const proposedTransfer=Math.min(['WEAK_WIDE','SMALL_WIDE'].includes(packageStyle)?100_000_000:1_300_000_000,Math.floor((p.money-50e6)*.7));const fundedTransfer=packageStyle==='STARTER_SMALL'?Math.min(proposedTransfer,Math.max(0,Math.floor(p.money-50e6-personalReserve()))):proposedTransfer;const launched=foundEarnedStudio(p,fundedTransfer,['WEAK_WIDE','SMALL_WIDE'].includes(packageStyle)?{name:'Lantern Stories',specialty:'FINANCE'}:{});p=launched.player;studioId=launched.studioId;const{player,...facts}=launched;actions.push({week:weeks,action:'paid-incorporation-and-treasury-transfer',...facts});}
 const start=weeks;
 while(weeks<horizon&&weeks-start<batch&&!p.flags.isDead){
  care();
  if(!films.length){const created=predecessorId?developActualSequel(p,studioId,predecessorId):developRealConcept(p,studioId,packageStyle==='WEAK_WIDE'?'Quiet Lantern':packageStyle==='SMALL_WIDE'?'Open Lantern':'The Local Picture','DRAMA',packageStyle==='WEAK_WIDE');p=created.player;const{player,...facts}=created;films.push({scale:packageStyle==='SMALL_WIDE'?'SMALL_WIDE':packageStyle==='WEAK_WIDE'?'WEAK_WIDE':packageStyle==='EPIC'?'EPIC':predecessorId?'GLOBAL':'SMALL',...facts});actions.push({week:weeks,action:'paid-concept-development',...facts});}
  const first=films[0];
  if(!['WEAK_WIDE','SMALL_WIDE','STARTER_SMALL'].includes(packageStyle)&&!predecessorId&&first?.id&&p.world.cinemaMarket?.titles[first.id]?.closed&&films.length===1){const created=developRealConcept(p,studioId,'The Last Atlas','FANTASY');p=created.player;const{player,...facts}=created;films.push({scale:'GLOBAL',...facts});actions.push({week:weeks,action:'paid-concept-development',...facts});}
  for(const film of films){
   const script=p.businesses.find(b=>b.id===studioId)!.studioState!.scripts.find(s=>s.id===film.scriptId);
   if(!film.id&&script?.status==='READY'&&p.energy.current>=PHASE_ONE_ENERGY_COSTS.GREENLIGHT_OWNED_PROJECT){const built=await greenlightRealPackage(p,studioId,film.scriptId,film.scale);p=built.player;if(built.waiting){if(weeks%3===0)actions.push({week:weeks,action:'wait-for-current-listings',reason:built.waiting});continue;}film.id=built.id;film.quote=built.quote;film.greenlitWeek=weeks;actions.push({week:weeks,action:'actual-greenlight',id:film.id,quote:built.quote});}
   const c=p.commitments.find(c=>c.id===film.id);
   if(c?.projectPhase==='AWAITING_RELEASE'&&!film.releasedWeek&&p.energy.current>=15){const released=releaseRealPackage(p,studioId,film.id,film.scale!=='SMALL');p=released.player;film.releasedWeek=weeks;film.campaignSpent=released.campaignSpent;actions.push({week:weeks,action:'actual-release',id:film.id,campaignSpent:released.campaignSpent});}
  }
  if(process.env.OWNED_DRY_RUN==='1'){status='DRY_ACTIONS_VERIFIED';break;}
  const before=getAbsoluteWeek(p.age,p.currentWeek);let result:CinemaWeekResult|undefined;
  p=(await processGameWeek(p,{onCinemaResult:r=>result=r})).player;weeks++;assert.equal(getAbsoluteWeek(p.age,p.currentWeek),before+1);assert.ok(result);assert.deepEqual(inspectCinemaSavedState(p.world.cinemaMarket),[]);
  for(const title of result.titles)assert.equal(title.grossCents,title.producerReceiptsCents+title.exhibitorReceiptsCents+title.distributionDeductionsCents);
  for(const row of result.supply){assert.ok(row.admissions<=row.seats);assert.ok(row.usedScreenMinutes<=row.availableScreenMinutes);}
  const paid=protectedPaid(p);assert.equal(commitCinemaWeek(p,result).applied,false);assert.equal(protectedPaid(p),paid);replays++;
  if(packageStyle==='STARTER_SMALL'){assert.ok(p.money>=0,'The starter policy cannot claim affordability while personal cash is negative');assert.ok(p.businesses.find(b=>b.id===studioId)!.balance>=0,'The starter studio must stay funded');}
  for(const film of films){const paid=p.world.cinemaMarket?.titles[film.id];if(!paid)continue;film.paid=paid;const source=p.activeReleases.find(r=>r.id===film.id)||p.pastProjects.find(r=>r.id===film.id);if(source)film.finance=getCinemaProjectFinance(source);}
  if(weeks%13===0)trace.push({week:weeks,cash:p.money,studioBalance:p.businesses.find(b=>b.id===studioId)!.balance,craft:getActorTalent(p.stats.skills),health:p.stats.health,films:films.map(f=>({id:f.id,scale:f.scale,grossCents:f.paid?.grossCents,closed:f.paid?.closed}))});
  if(weeks%13===0)await persist(weeks>=26&&!failedPromotionChecked);
  if(process.env.CAREER_STAGE_CHECKPOINTS==='1')for(const film of films){
   const script=p.businesses.find(b=>b.id===studioId)?.studioState?.scripts.find(s=>s.id===film.scriptId);
   const phase=p.commitments.find(c=>c.id===film.id)?.projectPhase;
   const milestone=!film.id&&script?.status==='READY'?'ready-script':phase==='AWAITING_RELEASE'&&!film.releasedWeek?'awaiting-release':undefined;
   if(milestone){const file=out+'/milestone-'+milestone+'.json.gz';if(!existsSync(file))writeCinemaAuditCheckpoint(file,snapshot());}
  }
  if(films.length===(predecessorId||['WEAK_WIDE','SMALL_WIDE','STARTER_SMALL'].includes(packageStyle)?1:2)&&films.every(f=>p.world.cinemaMarket?.titles[f.id]?.closed)){status='NATURALLY_CLOSED';break;}
  (globalThis as any).gc?.();
 }
 if(p.flags.isDead)status='CAREER_ENDED';else if(weeks>=horizon)status='HORIZON_COMPLETE';
 await persist();writeCinemaAuditCheckpoint(checkpoint,snapshot());
}catch(e){status='FAILURE';failure=e instanceof Error?e.stack:String(e);}
finally{rmSync(generationDir,{recursive:true,force:true});}
const report={status,failure,executable,originSha,parentSha,predecessorId,packageStyle,ownedUiSourceHashes,weeks,horizon,studioId,cash:p.money,studioBalance:p.businesses.find(b=>b.id===studioId)?.balance,
 method:freshCurrentOrigin?'Current-source fresh UI-gated actor career into paid owned production; no manual grants or authored completed films. This is one strategy, not a rarity estimate.':'Retained UI-valid earned actor career; actual paid owned studio and developed scripts. Historical cash includes pre-calibration sponsorships. Not a fresh career affordability or rarity estimate.',
 freshCurrentOrigin,manualCapitalGrants:0,authoredCompletedPackages:0,
 films,actions,trace,saves,reloads,replays,failedPromotionChecked,resource:{rssMiB:process.memoryUsage().rss/1024/1024}};
writeFileSync(out+'/career-0.json',JSON.stringify(report,null,2));console.log(JSON.stringify({status,failure,weeks,films:films.map(f=>({scale:f.scale,scriptId:f.scriptId,id:f.id,grossCents:f.paid?.grossCents,closed:f.paid?.closed}))}));
if(status==='FAILURE')process.exitCode=1;
