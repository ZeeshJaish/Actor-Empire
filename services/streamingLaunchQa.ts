/** Explicit developer-menu actions. Never called by normal streaming progression. */
import type {IndustryProject, OwnedStreamingCatalogLicense, OwnedStreamingLaunchRehearsalSnapshot, Player} from '../types';
import {getAbsoluteWeek} from './legacyLogic';
import {STREAMING_WORLD_MARKETS,STREAMING_DAY_ONE_REGION_ORDER,STREAMING_DAY_ONE_REGION_LABELS} from './streamingDayOneMarkets';
import {quoteStreamingMarketFilingEnergy} from './streamingMarketFilingQuote';
import {saveStreamingMarketPlan,beginStreamingMarketClearance} from './streamingMarkets';
import {saveStreamingServiceIdent,saveStreamingStorefrontPlan,saveStreamingPricingPlan,checkpointStreamingLaunchBlueprint,getStreamingLaunchProgramView} from './streamingLaunchProgram';
import {configureStreamingPricingOffer} from './streamingCommercialOffers';
import {createDefaultStreamingInfrastructureDraft,getStreamingInfrastructureForecast,saveStreamingInfrastructureDraft,saveStreamingInfrastructureRehearsal} from './streamingInfrastructure';
import {createCanonicalBuildData} from './streamingCanonicalBuildData';
import {getStreamingServerSite} from './streamingServerSites';
import {streamingEligibleMarketFacilities} from './streamingMarketRoute';
import {getStreamingFacilityPhysicalView} from './streamingInfrastructurePhysical';
import {createStreamingLaunchRehearsal} from './streamingLaunchRehearsal';
import {forecastWorldStreamingBuildDemand} from './worldEconomy/worldStreamingPricingForecast';
import {forecastStreamingLaunchMarketing} from './streamingLaunchMarketing';
import {getStreamingOpeningCatalogueView} from './streamingOpeningCatalogue';
import {getStreamingOpeningProgrammeView} from './streamingOpeningProgramme';
import {createDefaultStreamingFoundingDraft,saveStreamingFoundingDraft,incorporateOwnedStreamingPlatform,STREAMING_INCORPORATION_ECONOMY} from './streamingFounding';
import {normalizeOwnedStreamingPlatformState} from './ownedStreamingPlatform';

const PREFIX='dev-streaming-launch-qa';
const MIN_TREASURY=100_000_000_000;

export function prepareStreamingCommissionQa(source:Player):Player {
 if(source.ownedStreamingPlatform.launchCommit || source.ownedStreamingPlatform.infrastructureSetup)
  throw Error('This company is already commissioned. Use Fast-forward commissioned build, or use a pre-launch test save.');
 // Work on a detached candidate. A failed gate never leaks half-prepared state.
 let player=structuredClone(source);
 let platform=normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform,player.id);
 const week=getAbsoluteWeek(player.age,player.currentWeek);
 if(!platform.identity || !platform.foundingProfile) {
  player={...player,money:Math.max(player.money,STREAMING_INCORPORATION_ECONOMY.cashRequired),stats:{...player.stats,fame:Math.max(80,player.stats.fame),reputation:Math.max(80,player.stats.reputation)},ownedStreamingPlatform:{...platform,lifecycle:'ELIGIBLE',milestoneKeys:[...new Set([...platform.milestoneKeys,'streaming-launch-clearance'])]}};
  const founded=incorporateOwnedStreamingPlatform(saveStreamingFoundingDraft(player,{...createDefaultStreamingFoundingDraft(week),currentStep:2,name:'Streaming QA+'}));
  if(!founded.changed) throw Error(`QA company could not be registered: ${founded.reason}.`);
  player=founded.player;
  platform=player.ownedStreamingPlatform;
 }
 const grant=Math.max(0,MIN_TREASURY-platform.treasuryCash);
 const grantKey=`${PREFIX}:capital:${week}`;
 player={...player,energy:{...player.energy,current:Math.max(100,player.energy.current)},ownedStreamingPlatform:{...platform,treasuryCash:platform.treasuryCash+grant,
  eventLedger:grant>0?[...platform.eventLedger,{id:grantKey,idempotencyKey:grantKey,absoluteWeek:week,type:'MILESTONE_REACHED',source:'PLAYER_ACTION',summary:`DEV QA: granted $${grant.toLocaleString()} test treasury.`,metadata:{devQa:true,amount:grant}}]:platform.eventLedger}};
 const countryIds=STREAMING_WORLD_MARKETS.map(market=>market.id);
 player={...player,energy:{...player.energy,current:Math.max(player.energy.current,100+quoteStreamingMarketFilingEnergy(countryIds))}};
 player=saveStreamingMarketPlan(player,countryIds).player;
 const filed=beginStreamingMarketClearance(player,countryIds);
 if(filed.reason==='INSUFFICIENT_TREASURY'||filed.reason==='INSUFFICIENT_ENERGY') throw Error(`QA market filing could not be funded: ${filed.reason}, needs ${filed.amount} cash / ${filed.energyCost} energy.`);
 player=filed.player;
 platform=player.ownedStreamingPlatform;
 player={...player,ownedStreamingPlatform:{...platform,marketOperations:platform.marketOperations.map(operation=>operation.entryKind==='OPENING'&&operation.status!=='EXITED'?{
  ...operation,status:'READY',approvalReadyAtAbsoluteWeek:week,infrastructureReadyAtAbsoluteWeek:week,
  clearance:operation.clearance?{...operation.clearance,outcome:'APPROVED',progressPercent:100,remainingWeeks:0,stage:'FINAL_APPROVAL'}:null,
 }:operation)}};
 // QA rights are additive and identified; never expand or rewrite a real contract.
 platform=player.ownedStreamingPlatform;
 const titles=['QA · Opening Signal','QA · Midnight Relay','QA · World Premiere'];
 const ids=titles.map((_,i)=>`${PREFIX}:${player.id}:title:${i}`);
 const projects:IndustryProject[]=titles.map((title,i)=>({id:ids[i],title,genre:'DRAMA',mediaType:'MOVIE',studioId:'DEV_QA_STUDIO',budgetTier:'MID',quality:85,rating:8.1,boxOffice:0,year:player.age,weekReleased:player.currentWeek,leadActorId:player.id,leadActorName:player.name,directorName:'QA director',reviews:'Developer test content.'}));
 const licenses:OwnedStreamingCatalogLicense[]=titles.map((title,i)=>({id:`${ids[i]}:license`,sourceProjectId:ids[i],titleAtSigning:title,projectType:'MOVIE',genre:'DRAMA',licensorName:'Developer QA catalogue',territory:'GLOBAL',durationWeeks:520,exclusivity:'NON_EXCLUSIVE',minimumGuarantee:0,platformRevenueShare:100,licensorRevenueShare:0,signedAtAbsoluteWeek:week,startsAtAbsoluteWeek:week,expiresAtAbsoluteWeek:week+520,status:'ACTIVE',origin:'STARTER',accessGrant:{schemaVersion:1,modes:['SUBSCRIPTION'],earlyWindowWeeks:0,purchaseFulfillment:'NONE',source:'EXPLICIT'}}));
 const originalId=`${PREFIX}:${player.id}:original`;
 player={...player,world:{...player.world,projects:[...player.world.projects,...projects.filter(project=>!player.world.projects.some(row=>row.id===project.id))]},ownedStreamingPlatform:{...platform,
  catalogLicenses:[...platform.catalogLicenses,...licenses.filter(license=>!platform.catalogLicenses.some(row=>row.id===license.id))],
  catalogProjectIds:[...new Set([...platform.catalogProjectIds,...ids])],
  starterCatalog:platform.starterCatalog?{...platform.starterCatalog,licensedProjectIds:[...new Set([...platform.starterCatalog.licensedProjectIds,...ids])]}:{packageId:'BROAD_APPEAL',ownedProjectIds:[],licensedProjectIds:ids,establishedAtAbsoluteWeek:week},
  originalCommissions:platform.originalCommissions.some(row=>row.id===originalId)?platform.originalCommissions:[...platform.originalCommissions,{id:originalId,scriptId:`${originalId}:script`,canonicalProjectId:ids[0],title:titles[0],gapId:'SERIES_RETENTION',projectType:'MOVIE',genre:'DRAMA',episodes:1,producerStudioId:'DEV_QA_STUDIO',producerStudioName:'Developer QA studio',commissionedByPlatformName:platform.identity!.name,productionBudgetCap:0,productionFundingApplied:0,status:'RELEASED',commissionedAtAbsoluteWeek:week,greenlitAtAbsoluteWeek:week}],
  launchSlate:platform.launchSlate?.entries[0]?.projectId===ids[0]?platform.launchSlate:{revision:(platform.launchSlate?.revision||0)+1,programmedAtAbsoluteWeek:week,entries:ids.map((id,i)=>({id:`${id}:slate`,projectId:id,title:titles[i],source:i===0?'ORIGINAL':'LICENSED_WINDOW',projectType:'MOVIE',genre:'DRAMA',launchWeek:i+1,releasePattern:'SINGLE_PREMIERE',marketingPlan:'STANDARD'}))},
  launchMarketingDraft:platform.launchMarketingDraft?{...platform.launchMarketingDraft,budgetCeiling:0,revision:platform.launchMarketingDraft.revision+1,updatedAtAbsoluteWeek:week}:platform.launchMarketingDraft,
 }};
 player=saveStreamingServiceIdent(player,{soundIdentKey:platform.serviceConfiguration.soundIdentKey||'PULSE',identPackageId:platform.serviceConfiguration.identPackageId||'STANDARD',customIdentAudio:platform.serviceConfiguration.customIdentAudio}).player;
 player=saveStreamingStorefrontPlan(player,{storefrontLayoutId:platform.serviceConfiguration.storefrontLayoutId||'CINEMA'}).player;
 const pricing=configureStreamingPricingOffer(player.ownedStreamingPlatform.serviceConfiguration.pricing,{kind:'CORE',coreModel:'SUBSCRIPTION'});
 player=saveStreamingPricingPlan(player,{...pricing,streams:['subs'],plans:pricing.plans.length?pricing.plans:[{id:'BASIC',name:'Essential',monthly:9.99,featureIds:['catalogue'],ads:false}]}).player;
 // Preserve existing localization records. Add only bounded QA-title assets;
 // global localization quality remains a real warning, not forged readiness.
 platform=player.ownedStreamingPlatform;
 const languages=[...new Set(platform.marketOperations.flatMap(row=>row.countryProfile?.languageDistribution.map(item=>item.language)||[]))];
 const assets=[...platform.localizationOperations.titleLanguageAssets];
 const assetKeys=new Set(assets.map(asset=>`${asset.titleId}:${asset.languageId}`));
 for(const titleId of ids) for(const languageId of languages) {
  const key=`${titleId}:${languageId}`;
  if(assets.length<320&&!assetKeys.has(key)) assets.push({id:`${PREFIX}:locale:${key}`,titleId,languageId,subtitleReady:true,dubReady:true,readyAtAbsoluteWeek:week});
 }
 player={...player,ownedStreamingPlatform:{...platform,localizationOperations:{...platform.localizationOperations,titleLanguageAssets:assets}}};
 const worldDemand=forecastWorldStreamingBuildDemand(player,player.ownedStreamingPlatform.serviceConfiguration.pricing,countryIds);
 let build=createCanonicalBuildData({source:'CAREER',regionPlans:STREAMING_DAY_ONE_REGION_ORDER.map(regionId=>({regionId,serverCounts:{SCOUT:0,WORKHORSE:0,TITAN:regionId==='ASIA'?1024:128},cloudProvider:'MERIDIAN',cloudCompute:regionId==='OCEANIA'?512:128})),facilities:[],openingCountryIds:countryIds,forecastConcurrentStreams:worldDemand.likely,absoluteWeek:week,fibreState:player.ownedStreamingPlatform.fibre});
 // HQ folds the launch campaign into Build's low/likely/high demand, even
 // for an organic launch. Record evidence against that same demand range.
 const organic=forecastStreamingLaunchMarketing({platformKey:player.ownedStreamingPlatform.identity!.slug,absoluteWeek:week,buildWeeks:build.schedule.weeks,availableTreasury:player.ownedStreamingPlatform.treasuryCash,protectedOperatingCash:build.quote.totals.weeklyTotal*12,hasSellablePlan:true,hasFlagshipOriginal:true,pricingRevision:player.ownedStreamingPlatform.serviceConfiguration.revision,catalogueRevision:player.ownedStreamingPlatform.catalogLicenses.length,localizationRevision:player.ownedStreamingPlatform.localizationOperations.titleLanguageAssets.length,competitionRevision:0,countries:STREAMING_WORLD_MARKETS.map(market=>({countryId:market.id,countryName:market.country,reachableHouseholds:Math.max(1,Math.round(market.streamingAudience/2.4)),baseConcurrentStreams:worldDemand.byMarket[market.id]||0,conversionHeadroom:.5,mediaCostIndex:1,purchasingPowerIndex:1,consumerConfidence:.65,internetAccess:.72,localizationCoverage:1,catalogueCoverage:1,competitionPressure:0,priorAwareness:.03}))},player.ownedStreamingPlatform.launchMarketingDraft!);
 const demand={...organic.concurrentStreams,byMarket:Object.fromEntries(organic.countryForecasts.map(row=>[row.countryId,row.likelyConcurrentStreams]))};
 const uncovered=build.coverage.countries.filter(row=>row.grade!=='SERVED');
 if(uncovered.length) throw Error(`QA network needs coverage in ${uncovered.map(row=>row.countryId).join(', ')}.`);
 player=saveStreamingInfrastructureDraft(player,{...createDefaultStreamingInfrastructureDraft(player),currentStep:4,strategy:'HYBRID',capacityPackageId:'PREMIERE',regionPlans:build.regionPlans,facilities:build.facilities,networkPlacements:build.placements,openingDemandForecast:demand,lastLoadTestSignature:null,lastLaunchRehearsal:undefined});
 const draft=player.ownedStreamingPlatform.infrastructureSetupDraft!;
 build=createCanonicalBuildData({source:'CAREER',regionPlans:draft.regionPlans,facilities:draft.facilities,openingCountryIds:countryIds,forecastConcurrentStreams:demand.likely,absoluteWeek:week,fibreState:player.ownedStreamingPlatform.fibre});
 const forecast=getStreamingInfrastructureForecast(player,draft);
 const catalogue=getStreamingOpeningCatalogueView(player);
 const rehearsal=createStreamingLaunchRehearsal({scenario:'LIKELY',rolloutRiskPercent:0,countries:STREAMING_WORLD_MARKETS.map(market=>{
  const reach=build.coverage.countries.find(row=>row.countryId===market.id)!;
  const routes=streamingEligibleMarketFacilities(build.facilities,market.id,market.regionId,reach.reachedShare);
  const coverage=catalogue.countries.find(row=>row.countryId===market.id);
  return {marketId:market.id,country:market.country,regionId:market.regionId,regionLabel:STREAMING_DAY_ONE_REGION_LABELS[market.regionId],demand:demand.byMarket[market.id]||0,latencyMs:routes.length?Math.round(20+(1-reach.reachedShare)*160):null,cacheHitPercent:Math.round(reach.reachedShare*100),baseBufferingRiskPercent:routes.length?2:100,routeFacilityIds:routes.map(row=>row.id),reachableShare:reach.reachedShare,servingCityLabels:routes.map(row=>getStreamingServerSite(row.cityId)?.name||row.cityId),recommendedCityId:market.recommendedCityId,localizationNote:market.localizationNote,catalogueAvailableTitles:coverage?.rightsCoveredTitles||0,catalogueTotalTitles:catalogue.titles.length};
 }),facilities:build.facilities.map(facility=>{
  const capacity=build.capacity.facilities.find(row=>row.facilityId===facility.id)!;
  const physical=getStreamingFacilityPhysicalView(facility,facility.lease?.electricityRatePerKwh);
  const site=getStreamingServerSite(facility.cityId)!;
  return {facilityId:facility.id,cityId:facility.cityId,cityLabel:site.name,regionId:site.regionId,steadyCapacity:capacity.steadyStreams,burstCapacity:capacity.burstStreams,reliabilityPercent:physical.reliabilityPercent,limitingFactor:capacity.limiting,physicalRepairActions:physical.repairActions};
 })});
 if(rehearsal.verdict==='BROKE') throw Error(`QA network did not pass: ${rehearsal.countries.filter(row=>row.verdict==='BROKE').map(row=>`${row.marketId} ${row.failedPercent}%`).join(', ')}. No changes were saved.`);
 const evidence:OwnedStreamingLaunchRehearsalSnapshot={...rehearsal,configurationSignature:forecast.configurationSignature,warningSummary:rehearsal.warningSummary,completedAtAbsoluteWeek:week};
 player=saveStreamingInfrastructureRehearsal(player,draft,evidence);
 player=checkpointStreamingLaunchBlueprint(player).player;
 const missing=getStreamingLaunchProgramView(player).milestones.filter(row=>['DEFINE_LAUNCH','BUILD_PLATFORM'].includes(row.trackId)&&row.id!=='COMMISSIONING'&&!row.complete);
 if(missing.length) throw Error(`QA preparation incomplete: ${missing.map(row=>row.label).join(', ')}. No changes were saved.`);
 return player;
}

export function getStreamingBuildQaTargetWeek(player:Player):number|null {
 const platform=player.ownedStreamingPlatform;
 if(!platform.infrastructureSetup || platform.launchCommit) return null;
 const programme=getStreamingOpeningProgrammeView(player);
 if(!programme.commissioned) return null;
 return Math.max(platform.infrastructureSetup.readyAtAbsoluteWeek,platform.launchMarketingPlan?.endsAtAbsoluteWeek||0,programme.earliestOpeningAbsoluteWeek||0);
}

export async function advanceStreamingCommissionQa(source:Player, hooks:{
 processWeek:(player:Player)=>Promise<{player:Player}>;
 persistWeek:(player:Player)=>Promise<Player>;
 onProgress?:(completed:number,total:number)=>void;
 yieldToUi?:()=>Promise<void>;
}):Promise<Player> {
 const target=getStreamingBuildQaTargetWeek(source);
 if(target===null) throw Error('Commission the opening programme first. Opening Night will remain manual.');
 const start=getAbsoluteWeek(source.age,source.currentWeek);
 const total=Math.max(0,target-start);
 if(total>52) throw Error('This test action supports at most 52 weeks. Check the commissioned completion date.');
 let player=source;
 for(let completed=0;completed<total;completed++) {
  if(player.flags?.isDead) throw Error('Fast-forward stopped because the career ended. Completed weeks were saved.');
  await hooks.yieldToUi?.();
  const before=getAbsoluteWeek(player.age,player.currentWeek);
  const next=await hooks.processWeek(player);
  if(getAbsoluteWeek(next.player.age,next.player.currentWeek)!==before+1) throw Error('Weekly processing did not advance exactly one week. Fast-forward stopped.');
  // Publication belongs to persistWeek and must happen only after a durable save.
  player=await hooks.persistWeek(next.player);
  hooks.onProgress?.(completed+1,total);
 }
 return player;
}
