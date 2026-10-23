import assert from 'node:assert/strict';
import {makeCinemaFixture} from './fixtures/boxOfficeScenarios';
import {prepareCinemaAudienceWorld} from '../services/boxOffice/boxOfficeWeek';
import {normalizeStudioAiState} from '../services/studioAi/studioAiState';
import {admitStudioContentProposal} from '../services/studioAi/studioAiSlateAdmission';
import {reviewStudioSlateCommitment} from '../services/studioAi/studioAiGreenlight';
import {executeStudioAiSlateWeek} from '../services/studioAi/studioAiSlateExecution';
import {selectIndustryTalentPackage} from '../services/industryTalentSelection';
import {createProductionCalendar} from '../services/productionCalendar';
import {normalizeIndustryContentFingerprint} from '../services/industryIntelligence/industryIntelligenceState';
import {planStudioCinemaInvestment} from '../services/studioAi/studioAiCinemaInvestment';
import {packageStudioAiProductionTalent} from '../services/studioAi/studioAiProductionTalent';
import {getCanonicalIndustryTalentPool} from '../services/industryTalentSelection';
import type {IndustryContentFingerprint,IndustryIntelligenceProposal,NPCStudioState,WorldState} from '../types';
const week=200;
const studio:NPCStudioState={id:'MARKET_STUDIO',name:'Market Studio',valuation:45,reputation:84,cashReserve:2000,recentHits:3,archetype:'COMMERCIAL'};
studio.ai=normalizeStudioAiState(studio,{absoluteWeek:week});
const proposal:IndustryIntelligenceProposal={id:'market-p',idempotencyKey:'market-p-key',companyId:studio.id,companyKind:'PRODUCTION_STUDIO',lane:'CONTENT_STRATEGY',decisionCycle:2,absoluteWeek:194,actionFamily:'DEVELOP_CONTENT',optionId:'ORIGINAL',urgency:80,confidence:78,expectedExposureMillions:90,affordabilityCeilingMillions:1500,
 score:{total:84,need:82,strategyFit:88,expectedUpside:84,relationshipValue:55,competitiveValue:72,financialRisk:18,capacityPressure:12,fatigue:8,executionRisk:16},reasonCodes:['STRATEGIC_NEED'],uncertaintyKey:'market-u',status:'SHADOW',nextReviewAbsoluteWeek:202};
const fingerprint:IndustryContentFingerprint={id:'market-f',seed:'market-f-seed',ownerCompanyId:studio.id,ownerCompanyKind:'PRODUCTION_STUDIO',format:'MOVIE',primaryGenre:'DRAMA',subgenre:'CHARACTER_STUDY',tone:'GROUNDED',theme:'LOYALTY',setting:'SMALL_TOWN',period:'CONTEMPORARY',targetAudience:'ADULT_MAINSTREAM',originalLanguage:'ENGLISH',priorityMarket:'NORTH_AMERICA',commercialIntent:80,prestigeIntent:60,creativeRisk:45,starPowerTarget:75,releasePath:'THEATRICAL_FIRST',sourceIntent:'ORIGINAL',relationship:'STANDALONE',budgetSuitability:{minimumMillions:1,idealLowMillions:30,idealHighMillions:60,ambitiousMaximumMillions:100},noveltySignature:'market-drama',noveltyScore:84,createdAtAbsoluteWeek:194,decisionCycle:2,lifecycle:'SELECTED'};
const full=prepareCinemaAudienceWorld(makeCinemaFixture(901).player,week).world;
const market=(scale=1,wallet=1):WorldState=>{
 const w=structuredClone(full);w.projects=[];w.industryProductions={};
 for(const [id,country] of Object.entries(w.worldAudienceEconomy!.countries)){
  if(id!=='US'){delete w.worldAudienceEconomy!.countries[id];delete w.worldAudienceParticipation!.countries[id];delete w.worldPopulation!.countries[id];continue}
  w.worldPopulation!.countries[id].population=Math.floor(w.worldPopulation!.countries[id].population*scale);
  for(const c of country.cohorts){c.people=Math.floor(c.people*scale);c.households=Math.floor(c.households*scale)}
  for(const c of w.worldAudienceParticipation!.countries[id].cohorts){c.cinemaOnlyHouseholds=Math.floor(c.cinemaOnlyHouseholds*scale);c.dualParticipantHouseholds=Math.floor(c.dualParticipantHouseholds*scale);c.totalMonthlyCinemaBudget=Math.floor(c.totalMonthlyCinemaBudget*scale*wallet)}
 }
 return w;
};
const admit=(world:WorldState|undefined,fp=fingerprint)=>admitStudioContentProposal({studio,proposal,fingerprint:fp,absoluteWeek:week,world} as Parameters<typeof admitStudioContentProposal>[0]);
let failures=0,passed=0;
const test=(name:string,fn:()=>void)=>{try{fn();passed++;console.log('PASS',name)}catch(e){failures++;console.error('FAIL',name,(e as Error).message)}};
test('known zero cinema participation rejects a costly movie despite rich studio cash',()=>{
 const w=market();for(const c of w.worldAudienceParticipation!.countries.US.cohorts){c.cinemaOnlyHouseholds=0;c.dualParticipantHouseholds=0;c.totalMonthlyCinemaBudget=0}
 const before=JSON.stringify(w),r=admit(w);assert.equal(r.accepted,false,'No paying cinema audience must not authorize a new production');assert.equal(r.transaction,undefined);assert.equal(JSON.stringify(w),before);
});
test('a tiny poor reachable market cannot inherit the rich global investment size',()=>{
 const rich=admit(market()),poor=admit(market(.001,.05));assert.ok(rich.accepted);assert.ok(!poor.accepted||(poor.commitment!.proposedBudgetMillions<rich.commitment!.proposedBudgetMillions));
});
test('household cinema spending constrains investment independently of studio wealth',()=>{
 const regular=admit(market()),poor=admit(market(1,.00001));assert.ok(regular.accepted);assert.ok(!poor.accepted||poor.commitment!.proposedBudgetMillions<regular.commitment!.proposedBudgetMillions);
});
test('competition visible before greenlight reduces the supported production size',()=>{
 const clear=market(),crowded=market();crowded.projects=Array.from({length:60},(_,i)=>({id:'rival-'+i,title:'Rival',mediaType:'MOVIE',genre:'DRAMA',studioId:'OTHER',releaseStrategy:'THEATRICAL',releaseCountryIds:['US'],originalLanguageId:'english',cinema:{schemaVersion:1,settlementBasis:'UNSETTLED_WEEKLY',activationWeek:week-1}} as any));
 const a=admit(clear),b=admit(crowded);assert.ok(a.accepted);assert.ok(!b.accepted||b.commitment!.proposedBudgetMillions<a.commitment!.proposedBudgetMillions);
});
test('greenlight rechecks market deterioration before reserving production cash',()=>{
 const a=admit(market());assert.ok(a.accepted);const c={...a.commitment!,nextReviewAbsoluteWeek:week};const w=market();for(const p of w.worldAudienceParticipation!.countries.US.cohorts)p.totalMonthlyCinemaBudget=0;
 const r=reviewStudioSlateCommitment({studio,commitment:c,fingerprint,proposal,absoluteWeek:week,world:w} as Parameters<typeof reviewStudioSlateCommitment>[0]);assert.notEqual(r.commitment.status,'GREENLIT');
});
test('already greenlit budgets and missing legacy market data retain prior terms',()=>{
 const legacy=admit(undefined);assert.ok(legacy.accepted);const c={...legacy.commitment!,status:'GREENLIT' as const,greenlightBudgetMillions:77,nextReviewAbsoluteWeek:null};
 const r=reviewStudioSlateCommitment({studio,commitment:c,fingerprint,proposal,absoluteWeek:week,world:market(.001,0)} as Parameters<typeof reviewStudioSlateCommitment>[0]);assert.deepEqual(r.commitment,c);
});
test('series and player-controlled plans retain their independent rules',()=>{
 const series=admit(market(1,0),{...fingerprint,format:'SERIES'});assert.ok(series.accepted);
 const r=admitStudioContentProposal({studio:{...studio,ai:{...studio.ai!,controller:'PLAYER'}},proposal,fingerprint,absoluteWeek:week,world:market()} as Parameters<typeof admitStudioContentProposal>[0]);assert.equal(r.reason,'PLAYER_CONTROLLED');
});
test('a supported large market may still finance over $300M without a fixed budget cap',()=>{
 const r=admit(market(20,2),{...fingerprint,budgetSuitability:{minimumMillions:50,idealLowMillions:350,idealHighMillions:500,ambitiousMaximumMillions:1000}});assert.ok(r.accepted);assert.ok(r.commitment!.proposedBudgetMillions>300);
});
test('the actual studio slate forwards the world and charges no development fee for zero demand',()=>{
 const run=(w:WorldState)=>{
  const s=structuredClone(studio);s.ai!.intelligence!.proposals=[{...proposal,absoluteWeek:week,contentFingerprintId:fingerprint.id}];
  s.ai!.intelligence!.content.selectedFingerprints=[fingerprint];
  return executeStudioAiSlateWeek({player:{...makeCinemaFixture(902).player,world:w},world:w,studio:s,absoluteWeek:week});
 };
 assert.equal(run(market()).admittedCount,1);
 const w=market();for(const c of w.worldAudienceParticipation!.countries.US.cohorts){c.cinemaOnlyHouseholds=0;c.dualParticipantHouseholds=0;c.totalMonthlyCinemaBudget=0}
 const r=run(w);assert.equal(r.admittedCount,0);assert.equal(r.rejectedCount,1);assert.equal(r.studio.cashReserve,2000);
});
test('unreleased movies retain campaign cash before admitting another production',()=>{
 const w=market();w.industryProductions={older:{id:'older',canonicalProjectId:'older-film',producerStudioId:studio.id,source:'STUDIO_INDEPENDENT',projectType:'MOVIE',status:'AWAITING_RELEASE',budgetMillions:1000,paidMillions:1000} as any};
 const before=JSON.stringify(w),r=admitStudioContentProposal({studio:{...studio,cashReserve:120},proposal,fingerprint,absoluteWeek:week,world:w});
 assert.equal(r.accepted,false);assert.equal(r.transaction,undefined);assert.equal(JSON.stringify(w),before);
});
test('unavailable original-language cinema access cannot inherit an English market',()=>{
 const r=admit(market(),{...fingerprint,originalLanguage:'GERMAN'});assert.equal(r.accepted,false);
});
test('a viable local standalone can develop a smaller cast scope instead of disappearing',()=>{
 const fp={...fingerprint,originalLanguage:'GERMAN',budgetSuitability:{minimumMillions:30,idealLowMillions:60,idealHighMillions:90,ambitiousMaximumMillions:140}};
 const r=admit(full,fp);assert.ok(r.accepted,'A smaller viable local story should remain an investment path');
 const scoped=(r as typeof r&{fingerprint?:IndustryContentFingerprint}).fingerprint!;
 assert.ok(scoped&&scoped.starPowerTarget<fp.starPowerTarget);assert.ok(r.commitment!.proposedBudgetMillions>=scoped.budgetSuitability.minimumMillions);
 assert.ok(r.commitment!.proposedBudgetMillions<30,'Rescope the unsigned package, not an already committed production');
});
test('a modest casting target selects a cheaper fame tier instead of always taking an icon',()=>{
 const input={player:makeCinemaFixture(903).player,companyId:studio.id,canonicalProjectId:'casting-plan',genre:'DRAMA' as const,productionCalendar:createProductionCalendar({preProductionWeeks:1,productionWeeks:4,postProductionWeeks:2,age:20,week:1}),companyTalentSkill:80,budgetMillions:10,seedNamespace:'market-casting'};
 const low=selectIndustryTalentPackage({...input,starPowerTarget:20} as Parameters<typeof selectIndustryTalentPackage>[0])!;
 const high=selectIndustryTalentPackage({...input,starPowerTarget:95} as Parameters<typeof selectIndustryTalentPackage>[0])!;
 assert.ok(low.leadActor.stats.fame<high.leadActor.stats.fame,'Small packages must not silently inherit the same icon cast');
});
test('the new private cast scope survives canonical normalization without marking legacy fingerprints',()=>{
 const fp={...fingerprint,originalLanguage:'GERMAN',budgetSuitability:{minimumMillions:30,idealLowMillions:60,idealHighMillions:90,ambitiousMaximumMillions:140}};
 const result=admit(full,fp),scoped=(result as typeof result&{fingerprint?:IndustryContentFingerprint}).fingerprint!;
 assert.equal((normalizeIndustryContentFingerprint(JSON.parse(JSON.stringify(scoped))) as any)?.cinemaScopeVersion,1);
 assert.equal((normalizeIndustryContentFingerprint(fingerprint) as any)?.cinemaScopeVersion,undefined);
});
test('limited cash may fund a viable smaller standalone without paying for the oversized pitch',()=>{
 const fp={...fingerprint,originalLanguage:'GERMAN',budgetSuitability:{minimumMillions:30,idealLowMillions:60,idealHighMillions:90,ambitiousMaximumMillions:140}};
 const r=admitStudioContentProposal({studio:{...studio,cashReserve:40},proposal,fingerprint:fp,absoluteWeek:week,world:full});
 assert.ok(r.accepted);assert.ok(r.commitment!.proposedBudgetMillions<15);assert.ok(r.transaction!.amountMillions<1);
});
test('a rich studio can finance a bounded small creative risk without requiring a predicted winner',()=>{
 const r=planStudioCinemaInvestment({world:market(1,.3),studio,fingerprint:{...fingerprint,starPowerTarget:20},absoluteWeek:week,targetMillions:10,minimumMillions:10})!;
 assert.equal(r.productionMillions,10,'An uncertain but reached market can support a small treasury-funded experiment');
});
test('creative risk uses profile and free cash rather than bypassing existing obligations',()=>{
 const quote=(s:NPCStudioState)=>planStudioCinemaInvestment({world:market(1,.3),studio:s,fingerprint:{...fingerprint,starPowerTarget:20},absoluteWeek:week,targetMillions:10,minimumMillions:10})!;
 assert.equal(quote({...studio,ai:{...studio.ai!,profile:{...studio.ai!.profile,riskTolerance:0}}}).productionMillions,0);
 assert.equal(quote({...studio,ai:{...studio.ai!,finance:{...studio.ai!.finance,committedSpendMillions:1900}}}).productionMillions,0);
});
test('actual rescaled production books a modest cast and never renegotiates selected talent',()=>{
 const player=makeCinemaFixture(904).player;
 const production:any={id:'market-cast-production',canonicalProjectId:'market-cast-film',projectType:'MOVIE',genre:'DRAMA',producerStudioId:studio.id,source:'STUDIO_INDEPENDENT',status:'PLANNED',budgetMillions:10,paidMillions:0,talentBookingIds:[],
  productionCalendar:createProductionCalendar({preProductionWeeks:1,productionWeeks:4,postProductionWeeks:2,age:20,week:1}),
  studioAiExecution:{talentSelected:false,processedKeys:[],fingerprintSnapshot:{...fingerprint,cinemaScopeVersion:1,starPowerTarget:20}}};
 const world={...player.world,industryProductions:{[production.id]:production},talentBookings:[]};
 const low=packageStudioAiProductionTalent({player,world,studio,production,absoluteWeek:week});
 const high=packageStudioAiProductionTalent({player,world,studio,production:{...production,studioAiExecution:{...production.studioAiExecution,fingerprintSnapshot:{...fingerprint,cinemaScopeVersion:1,starPowerTarget:95}}},absoluteWeek:week});
 const pool=new Map(getCanonicalIndustryTalentPool(player).map(a=>[a.id,a]));
 assert.ok(pool.get(low.production.studioAiExecution!.talent!.leadActorId)!.stats.fame<pool.get(high.production.studioAiExecution!.talent!.leadActorId)!.stats.fame);
 const replay=packageStudioAiProductionTalent({player,world:low.world,studio,production:low.production,absoluteWeek:week+1});
 assert.equal(replay.changed,false);assert.deepEqual(replay.production,low.production);assert.equal(replay.world,low.world);
});
test('a newly admitted viable original package also persists its cast target before any contract',()=>{
 const low={...fingerprint,starPowerTarget:35,budgetSuitability:{minimumMillions:1,idealLowMillions:4,idealHighMillions:6,ambitiousMaximumMillions:12}};
 const r=admit(market(),low);assert.ok(r.accepted);assert.equal(r.fingerprint!.starPowerTarget,35,'An already viable scope does not need rescaling');
 assert.equal(r.fingerprint!.cinemaScopeVersion,1,'New unsigned originals must not silently get the legacy default icon cast');
});
console.log(JSON.stringify({passed,failures}));assert.equal(failures,0);
