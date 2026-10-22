import assert from 'node:assert/strict';
import type { Commitment } from '../types';
import { makeCinemaFixture } from './fixtures/boxOfficeScenarios';
import { createBusiness } from '../services/businessLogic';
import { prepareGreenlightFunding } from '../views/lifestyle/business/greenlightProjectBuilder';
import { getAbsoluteWeek, buildLegacyStudioInheritance } from '../services/legacyLogic';
import { applyProjectPromotionAttribution, getEligiblePromotionProjects } from '../services/projectPromotionAttribution';
import { normalizeIndustryMediaWorld } from '../services/industryWorld';
import { commitCinemaAnnouncement, commitCinemaReleaseExposure, buildCinemaAwarenessSnapshot, prepareCinemaPackageExposure } from '../services/boxOffice/boxOfficeExposureAdapters';
import { createWorldPopulationState } from '../services/worldEconomy/worldPopulation';
import { createWorldAudienceEconomyState } from '../services/worldEconomy/worldAudienceCohorts';
import { migratePlayerSave } from '../services/saveMigration';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { processGameWeek } from '../services/gameLoop';
const tests:Array<[string,()=>void|Promise<void>]> = [];const test=(name:string,run:()=>void|Promise<void>)=>tests.push([name,run]);
const f=makeCinemaFixture(102);const week=getAbsoluteWeek(f.player.age,f.player.currentWeek);
f.player.world.worldPopulation=createWorldPopulationState(week);
f.player.world.worldAudienceEconomy=createWorldAudienceEconomyState(f.player.world.worldPopulation,week);
f.project.castPackageSource='AUTHORED';f.project.castList=[{id:'lead',actorId:'PLAYER_SELF',name:f.player.name,role:'Lead',roleType:'LEAD',type:'ACTOR',isPlayer:true,image:''}];
f.project.hiddenStats.estimatedQualityScore=70;
const studio=createBusiness('Exposure Fixture','PRODUCTION_HOUSE','MAJOR_STUDIO',{quality:'STANDARD',pricing:'MARKET',marketing:'LOW'},'🎬',20);
studio.balance=1e9;f.player.businesses=[studio];f.project.studioId=studio.id as typeof f.project.studioId;
f.project.cinemaExposure=prepareCinemaPackageExposure({player:f.player,project:f.project,titleId:'film',storyAttention:40,musicAttention:0});
test('private package and world-aware forecast create no public exposure or save mutation',()=>{
 const before=JSON.stringify(f);const snapshot=buildCinemaAwarenessSnapshot(f.player,f.project,'film');
 assert.equal(snapshot.awarePeople,0);assert.equal(snapshot.audienceStateAvailable,true);
 assert.equal(snapshot.forecastInput.knowledge,'FORECAST');assert.equal(snapshot.forecastInput.titles[0].delivery.deliveredQuality,undefined);
 const changed=structuredClone(f.project);changed.hiddenStats.qualityScore=1;changed.hiddenStats.scriptQuality=1;
 assert.deepEqual(buildCinemaAwarenessSnapshot(f.player,changed,'film'),snapshot);assert.equal(JSON.stringify(f),before);
});
test('actual Greenlight funding emits one dated announcement with frozen recognition',()=>{
 const commitment={id:'film',name:'Film',projectDetails:f.project} as Commitment;
 const prepared=prepareGreenlightFunding({player:f.player,studio,studioCashRequirement:100e6,newCommitment:commitment,
 finalInvestorRaised:0,greenlightPackageBudget:100e6,isCreatingNewUniverse:false,normalizedWorldUniverses:{},newUniverseName:'',randomUniverseColor:'#000'});
 const details=prepared.fundedCommitment.projectDetails!;assert.equal(details.cinemaExposure!.events.length,1);
 assert.equal(details.cinemaExposure!.events[0].absoluteWeek,week);
 const first=buildCinemaAwarenessSnapshot(f.player,details,'film');assert.ok(first.awarePeople>0);
 const famous=structuredClone(f.player);famous.stats.fame=100;
 assert.equal(buildCinemaAwarenessSnapshot(famous,details,'film').awarePeople,first.awarePeople);
 assert.deepEqual(commitCinemaAnnouncement(famous,details,'film',week+1),details);
 assert.equal(f.project.cinemaExposure!.events.length,0);
});
test('inherited studio careers retain conservative recognition without duplicating archived titles',()=>{
 const player=structuredClone(f.player);player.stats.fame=0;
 const project={...f.project,castList:[]};
 const history={id:'studio-history',title:'Prior film',studioId:studio.id,gross:100e6,rating:8} as never;
 player.pastProjects=[history];
 const original=commitCinemaAnnouncement(player,project,'film',week).cinemaExposure!.events[0].recognitionShare;
 assert.ok(original!>0);
 player.pastProjects=[];player.flags.legacyStudioProjects=[history];
 const inherited=commitCinemaAnnouncement(player,project,'film',week).cinemaExposure!.events[0].recognitionShare;
 assert.equal(inherited,original);
 player.pastProjects=[history];
 assert.equal(commitCinemaAnnouncement(player,project,'film',week).cinemaExposure!.events[0].recognitionShare,original);
});
test('actual succession rebases public-source dates for live commitments and releases without reannouncing',()=>{
 const parent=structuredClone(f.player);
 const publicDetails=commitCinemaAnnouncement(parent,f.project,'film',week);
 const activeDetails=commitCinemaAnnouncement(parent,f.project,'live-film',week);
 parent.commitments=[{id:'film',name:'Film',type:'JOB',projectPhase:'PRODUCTION',projectDetails:publicDetails} as Commitment];
 parent.activeReleases=[{id:'live-film',name:'Live Film',projectDetails:activeDetails,totalGross:1000,weeklyGross:[1000],budget:100e6} as never];
 const source=JSON.stringify(parent);const inherited=buildLegacyStudioInheritance(parent,{isDeceased:false,heirAge:18,heirWeek:20});
 const child={...parent,age:18,currentWeek:20,stats:{...parent.stats,fame:0},commitments:inherited.commitments,
  activeReleases:inherited.activeReleases,businesses:inherited.businesses,world:inherited.world || parent.world,flags:{...parent.flags,...inherited.flags}};
 for(const [id,before,after] of [['film',publicDetails,child.commitments[0].projectDetails!],['live-film',activeDetails,child.activeReleases[0].projectDetails]] as const){
  assert.equal(after.cinemaExposure!.events[0].absoluteWeek,getAbsoluteWeek(18,20));
  assert.equal(after.cinemaExposure!.events[0].id,before.cinemaExposure!.events[0].id);
  assert.equal(buildCinemaAwarenessSnapshot(child,after,id).awarePeople,buildCinemaAwarenessSnapshot(parent,before,id).awarePeople);
  assert.equal(commitCinemaAnnouncement(child,after,id,getAbsoluteWeek(18,20)).cinemaExposure!.events.length,1);
 }
 assert.equal(JSON.stringify(parent),source);
});
test('paid campaign exposure requires recorded committed marketing cost',()=>{
 assert.throws(()=>commitCinemaReleaseExposure({player:f.player,project:{...f.project,marketingBudgetSpent:0},titleId:'film',absoluteWeek:week,
 allocations:{TRAILER_LAUNCH:1e6}}),'A proposal without a paid spend record cannot create paid impressions');
});
test('release campaign records exact spend once and selected countries limit its paid reach',()=>{
 const project={...f.project,releaseRegionIds:['NORTH_AMERICA' as const],marketingBudgetSpent:1e6};
 const released=commitCinemaReleaseExposure({player:f.player,project,titleId:'film',absoluteWeek:week,allocations:{TRAILER_LAUNCH:1e6}});
 const paid=released.cinemaExposure!.events.filter(e=>e.kind==='PAID_CAMPAIGN');assert.equal(paid.length,1);assert.equal(paid[0].paidCostCents,100e6);
 assert.equal(paid[0].impressionsEstimated,true,'Spend is recorded; impressions from candidate CPM remain estimated');
 assert.ok(paid[0].countryIds!.includes('US'));assert.ok(!paid[0].countryIds!.includes('IN'));
 assert.deepEqual(commitCinemaReleaseExposure({player:f.player,project:JSON.parse(JSON.stringify(released)),titleId:'film',absoluteWeek:week+1,
 allocations:{TRAILER_LAUNCH:1e6}}),released);
 const wide={...f.project,releaseRegionIds:['NORTH_AMERICA' as const,'ASIA' as const],marketingBudgetSpent:0};
 const a=commitCinemaReleaseExposure({player:f.player,project:{...wide,releaseRegionIds:['NORTH_AMERICA']},titleId:'film',absoluteWeek:week,allocations:{}});
 const b=commitCinemaReleaseExposure({player:f.player,project:wide,titleId:'film',absoluteWeek:week,allocations:{}});
 assert.deepEqual(buildCinemaAwarenessSnapshot(f.player,a,'film'),buildCinemaAwarenessSnapshot(f.player,b,'film'));
});
test('real career publication records exposure once without paying again or leaking to another title',()=>{
 const player=structuredClone(f.player);player.world.industryMedia=normalizeIndustryMediaWorld(undefined);
 player.commitments=[{id:'film',name:'Film',type:'ACTING_GIG',projectPhase:'PRODUCTION',projectDetails:f.project} as Commitment,
 {id:'other',name:'Other',type:'ACTING_GIG',projectPhase:'PRODUCTION',projectDetails:{...f.project,title:'Other'}} as Commitment];
 const before=JSON.stringify(player);const input={projectId:'film',publicationId:'publication-1',channel:'X' as const,promotionType:'PROJECT_PROMO' as const,
 absoluteWeek:week,reach:150_000,engagement:10_000};
 const first=applyProjectPromotionAttribution(player,input);const record=first.player.commitments[0].projectDetails!.cinemaExposure!;
 assert.equal(record.events.length,1);assert.equal(record.events[0].kind,'PROMOTION');assert.ok(record.events[0].impressions>0);
 assert.equal(first.player.commitments[1].projectDetails!.cinemaExposure!.events.length,0);
 assert.equal(first.player.money,player.money);assert.deepEqual(first.player.energy,player.energy);assert.equal(JSON.stringify(player),before);
 assert.deepEqual(applyProjectPromotionAttribution(first.player,input).player,first.player);
 const reloaded=migratePlayerSave(JSON.parse(JSON.stringify(first.player)));
 assert.deepEqual(reloaded.commitments.find(c=>c.id==='film')!.projectDetails!.cinemaExposure,record);
 reloaded.world.industryMedia=normalizeIndustryMediaWorld(undefined);
 assert.deepEqual(applyProjectPromotionAttribution(reloaded,input).player,reloaded,'Project source IDs protect replay even after media attribution compaction');
});
test('real release, persistence and completed archive preserve public-source identities',async()=>{
 const player=structuredClone(f.player);player.money=1e9;player.activeReleases=[];player.pendingEvents=[];player.scheduledEvents=[];
 const details=commitCinemaAnnouncement(player,f.project,'handoff-film',week);
 const sources=JSON.stringify(details.cinemaExposure);
 player.commitments=[{id:'handoff-film',name:details.title,type:'ACTING_GIG',roleType:'LEAD',energyCost:0,income:0,payoutType:'LUMPSUM',lumpSum:0,
 projectDetails:details,projectPhase:'AWAITING_RELEASE',phaseWeeksLeft:0,totalPhaseDuration:0,productionPerformance:75,auditionPerformance:75} as Commitment];
 const input=JSON.stringify(player);const advanced=await processGameWeek(player);
 assert.equal(JSON.stringify(player),input);
 const release=advanced.player.activeReleases.find(r=>r.id==='handoff-film')!;assert.ok(release);
 assert.equal(JSON.stringify(release.projectDetails.cinemaExposure),sources);
 const reloaded=migratePlayerSave(JSON.parse(JSON.stringify(compactPlayerForPersistence(advanced.player))));
 const ending=reloaded.activeReleases.find(r=>r.id==='handoff-film')!;
 assert.equal(JSON.stringify(ending.projectDetails.cinemaExposure),sources);
 ending.distributionPhase='STREAMING';ending.streamingRuns=[];
 ending.streaming={platformId:'NETFLIX',weekOnPlatform:52,totalViews:100,weeklyViews:[100],isLeaving:true};
 const finished=await processGameWeek(reloaded);const archived=finished.player.pastProjects.find(p=>p.id==='handoff-film')!;
 assert.ok(archived);assert.equal(JSON.stringify(archived.cinemaExposure),sources);
});
test('studio-owned films use the same actual career-promotion source path',()=>{
 const player=structuredClone(f.player);player.world.industryMedia=normalizeIndustryMediaWorld(undefined);
 player.commitments=[{id:'film',name:'Film',type:'JOB',projectPhase:'PRODUCTION',projectDetails:f.project} as Commitment];
 assert.ok(getEligiblePromotionProjects(player).some(c=>c.id==='film'));
 const r=applyProjectPromotionAttribution(player,{projectId:'film',publicationId:'owned-promo',channel:'X',promotionType:'PROJECT_PROMO',absoluteWeek:week,reach:1000});
 assert.equal(r.player.commitments[0].projectDetails!.cinemaExposure!.events.length,1);
});
test('series keep their existing release and promotion behavior',()=>{
 const series={...f.project,type:'SERIES' as const};
 assert.equal(commitCinemaReleaseExposure({player:f.player,project:series,titleId:'series',absoluteWeek:week,allocations:{TRAILER_LAUNCH:1e6}}),series);
});
let failures=0;for(const[name,run]of tests){try{await run();console.log('PASS',name)}catch(e){failures++;console.error('FAIL',name,e instanceof Error?e.message:e)}}
assert.equal(failures,0,`${failures} cinema exposure integration regressions`);
