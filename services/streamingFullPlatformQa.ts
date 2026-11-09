import { grantStreamingPlusForTesting } from './streamingPlusPack';
/** Explicit developer-menu action: a launched, operating streaming company with a
 * full catalogue, Originals, a hybrid offer, a leadership team, outside investors
 * and weeks of history, built through the game's own services so every screen
 * has real data to show. Never called by normal streaming progression.
 *
 * Shortcuts, all marked DEV QA in the event ledger: market clearances are
 * approved at once (as "Ready to Commission" does), the technology baseline is
 * raised so plan features can be offered, and Originals arrive as delivered
 * titles. Founder cash and energy shortfalls are granted through the real
 * founder-capital and energy-purchase paths. Everything else (licences,
 * filings, network, launch, hiring, investment, research, campaigns and every
 * week) goes through the services. */
import type {Genre,IndustryProject,OwnedStreamingLaunchRehearsalSnapshot,OwnedStreamingOriginalCommission,OwnedStreamingPricingConfiguration,Player,ProjectType} from '../types';
import {getAbsoluteWeek} from './legacyLogic';
import {STREAMING_WORLD_MARKETS,STREAMING_DAY_ONE_REGION_ORDER,STREAMING_DAY_ONE_REGION_LABELS,type StreamingDayOneRegionId} from './streamingDayOneMarkets';
import {quoteStreamingMarketFilingEnergy} from './streamingMarketFilingQuote';
import {saveStreamingMarketPlan,beginStreamingMarketClearance} from './streamingMarkets';
import {saveStreamingServiceIdent,saveStreamingStorefrontPlan,saveStreamingPricingPlan,checkpointStreamingLaunchBlueprint,getStreamingLaunchProgramView,getStreamingLaunchDefinitionSignature} from './streamingLaunchProgram';
import {configureStreamingPricingOffer} from './streamingCommercialOffers';
import {createDefaultStreamingInfrastructureDraft,getStreamingInfrastructureForecast,saveStreamingInfrastructureDraft,saveStreamingInfrastructureRehearsal} from './streamingInfrastructure';
import {createCanonicalBuildData,type StreamingCanonicalBuildData} from './streamingCanonicalBuildData';
import {getStreamingServerSite} from './streamingServerSites';
import {streamingEligibleMarketFacilities} from './streamingMarketRoute';
import {getStreamingFacilityPhysicalView} from './streamingInfrastructurePhysical';
import {createStreamingLaunchRehearsal} from './streamingLaunchRehearsal';
import {forecastWorldStreamingBuildDemand} from './worldEconomy/worldStreamingPricingForecast';
import {forecastStreamingLaunchMarketing} from './streamingLaunchMarketing';
import {getStreamingOpeningCatalogueView} from './streamingOpeningCatalogue';
import {commissionStreamingOpeningProgramme,getStreamingOpeningCommissionQuote,getStreamingOpeningProgrammeView} from './streamingOpeningProgramme';
import {createDefaultStreamingFoundingDraft,saveStreamingFoundingDraft,incorporateOwnedStreamingPlatform,STREAMING_INCORPORATION_ECONOMY} from './streamingFounding';
import {normalizeOwnedStreamingPlatformState} from './ownedStreamingPlatform';
import {contributeStreamingFounderCapital} from './streamingCompany';
import {prepareContentMarketDiscovery,getContentMarketCollections,getContentMarketListings,purchaseContentMarketCollection,isContentMarketAuctionListing,establishContentMarketCatalogue} from './streamingContentMarket';
import {openStreamingRightsNegotiation,signStreamingRightsDeal} from './streamingRightsMarketplace';
import {releaseSlateHoldOnNewLicences} from './streamingCatalog';
import {commitOwnedStreamingLaunch} from './streamingLaunch';
import {getStreamingBuildQaTargetWeek} from './streamingLaunchQa';
import {appointStreamingExternalExecutive,appointStreamingIndependentDirector,acceptStreamingCelebrityInvestment} from './streamingLeadershipGovernance';
import {lockStreamingWeeklyPlan} from './streamingWeeklyLoop';
import {lockStreamingGrowthAction} from './streamingPromotion';
import {getStreamingTechnologyCampus,startStreamingTechnologyProject} from './streamingTechnologyCampus';
import {contributeStreamingLocalizationEnergy,unlockStreamingLocalizationRegion} from './streamingLocalizationResearch';
import {grantPurchasedEnergy} from './premiumLogic';
import {grantStreamingTechTreeFromLevels,resolveStreamingTechTree} from './streamingTechTreeCatalogue';
import type {StreamingLocalizationTrack} from '../types';

const PREFIX='dev-streaming-full-qa';
/** Milestone key that marks a company this action built, so a later press can resume it. */
export const STREAMING_FULL_PLATFORM_QA_MARKER='dev-full-platform-qa';
export const STREAMING_FULL_PLATFORM_QA_LIVE_WEEKS=16;
const COMPANY_NAME='NORTHSTAR+';
/** Twenty-five markets across all six regions, biggest audiences first. Royalty receipts grow
 * with titles × markets × offers, so this footprint keeps the save near 30 MB. */
const MARKET_QUOTA:Record<StreamingDayOneRegionId,number>={NORTH_AMERICA:3,SOUTH_AMERICA:4,EUROPE:7,ASIA:6,AFRICA:3,OCEANIA:2};
/** Markets global streamers do not serve; with China in, three in four accounts were Chinese. */
const SKIPPED_MARKETS=new Set(['CN','RU','IR','KP','SY','CU']);
const CATALOGUE_TARGET=45;
/** setup titles left off the opening slate, so the Slate tab has something to schedule */
const SHELF_TITLES=3;
const ORIGINALS:ReadonlyArray<{title:string;genre:Genre;projectType:ProjectType;episodes:number;programWeek:number}>=[
 {title:'Northern Signal',genre:'THRILLER',projectType:'SERIES',episodes:8,programWeek:1},
 {title:'The Last Harbour',genre:'DRAMA',projectType:'MOVIE',episodes:1,programWeek:5},
 {title:'Paper Kingdoms',genre:'FANTASY',projectType:'SERIES',episodes:10,programWeek:10},
 {title:'Velvet Underground Railway',genre:'CRIME',projectType:'SERIES',episodes:6,programWeek:15},
 {title:'Midnight Atlas',genre:'SCI_FI',projectType:'MOVIE',episodes:1,programWeek:20},
 {title:'Second Sunrise',genre:'ROMANCE',projectType:'MOVIE',episodes:1,programWeek:26},
];
/* Ids that differ only in a last digit get neighbouring poster hues, so each Original is named by its title. */
const originalId=(playerId:string,spec:{title:string})=>`${PREFIX}:${playerId}:original:${spec.title.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`;
/** Raised so the offer can carry HD, 4K, spatial audio, downloads and four streams. */
// Security 45 (#54): the campus no longer builds Security, so the baseline gives the Trust and safety steps
// (Watermarking, Takedown network) its Zero-Trust node used to stand for, and recommendations do not outrun it.
const TECHNOLOGY_BASELINE={DELIVERY_CAPACITY:45,PLAYBACK_QUALITY:58,RELIABILITY:42,DATA_RECOMMENDATIONS:24,SECURITY:45,CONTENT_OPERATIONS:24,ADVERTISING_COMMERCE:34,PRODUCT_EXPERIENCE:30};
const EXECUTIVES=['rafael-silva','marcus-vale','nia-okafor','ava-chen','jonah-reed','leila-haddad','elena-volkov'];
const DIRECTORS=['director-meera-sen','director-thomas-adebayo'];
const INVESTORS=['investor-aarav-kapoor','investor-sofia-laurent'];
/** Localization by region, as a player would do it: set a region up, then a level every few weeks,
 * so the desk's weekly figures step up. The last two are left part-filled, for the energy buttons;
 * East Asia, Southeast Asia and Middle East & Africa stay unset, for the setup button. */
const LOCALIZATION_STEPS:ReadonlyArray<{week:number;packageId:string;track?:StreamingLocalizationTrack;energy?:number}>=[
 {week:1,packageId:'WESTERN_EUROPE_CORE'},
 {week:1,packageId:'WESTERN_EUROPE_CORE',track:'SUBTITLES'},
 {week:3,packageId:'LATIN_AMERICA_CORE'},
 {week:3,packageId:'WESTERN_EUROPE_CORE',track:'SUBTITLES'},
 {week:5,packageId:'LATIN_AMERICA_CORE',track:'SUBTITLES'},
 {week:7,packageId:'WESTERN_EUROPE_CORE',track:'DUBBING'},
 {week:7,packageId:'INDIA_CORE'},
 {week:9,packageId:'LATIN_AMERICA_CORE',track:'SUBTITLES'},
 {week:12,packageId:'LATIN_AMERICA_CORE',track:'DUBBING',energy:10},
 {week:13,packageId:'INDIA_CORE',track:'SUBTITLES',energy:5},
];
/** Weeks a licence signed at launch runs. 10 and 13 lapse during the run; 19 and 22 open their
 * renewal talks early enough for the delegated team to decide; the two 24s open in the last week,
 * so the player meets them undecided with Renew / Let it go; 30 sits on the runway; three never end. */
const LAUNCH_LICENCE_WINDOWS:ReadonlyArray<number|'PERMANENT'>=[10,13,19,22,24,24,30,'PERMANENT','PERMANENT','PERMANENT'];

export type StreamingFullPlatformQaStage='PREPARE'|'BUILD'|'LAUNCH'|'OPERATE'|'DONE'|'BLOCKED';
export interface StreamingFullPlatformQaState {stage:StreamingFullPlatformQaStage;reason?:string;liveWeeks:number}
export interface StreamingFullPlatformQaHooks {
 processWeek:(player:Player)=>Promise<{player:Player}>;
 persistWeek:(player:Player)=>Promise<Player>;
 onProgress?:(message:string)=>void;
 yieldToUi?:()=>Promise<void>;
}

/** Where a save stands. The launch check reads the Opening Programme; the menu uses its own raw-field test. */
export function getStreamingFullPlatformQaState(player:Player):StreamingFullPlatformQaState {
 const platform=player.ownedStreamingPlatform;
 const ours=(platform.milestoneKeys||[]).includes(STREAMING_FULL_PLATFORM_QA_MARKER);
 const week=getAbsoluteWeek(player.age,player.currentWeek);
 if(platform.launchCommit) {
  if(!ours) return {stage:'BLOCKED',reason:'This save’s platform is already live. Use a new career.',liveWeeks:0};
  const liveWeeks=Math.max(0,week-platform.launchCommit.committedAtAbsoluteWeek);
  return {stage:liveWeeks>=STREAMING_FULL_PLATFORM_QA_LIVE_WEEKS?'DONE':'OPERATE',liveWeeks};
 }
 if(platform.infrastructureSetup) {
  if(!ours) return {stage:'BLOCKED',reason:'This save already commissioned its own launch. Use a new career.',liveWeeks:0};
  const target=getStreamingBuildQaTargetWeek(player);
  return {stage:target!==null&&week>=target?'LAUNCH':'BUILD',liveWeeks:0};
 }
 if((platform.marketOperations||[]).length&&!ours) return {stage:'BLOCKED',reason:'This save already has a launch plan in progress. Use a new career.',liveWeeks:0};
 return {stage:'PREPARE',liveWeeks:0};
}

const ledger=(player:Player,key:string,summary:string,metadata:Record<string,unknown>={}):Player=>{
 const platform=player.ownedStreamingPlatform;
 if(platform.eventLedger.some(row=>row.idempotencyKey===key)) return player;
 const week=getAbsoluteWeek(player.age,player.currentWeek);
 return {...player,ownedStreamingPlatform:{...platform,eventLedger:[...platform.eventLedger,{id:key,idempotencyKey:key,absoluteWeek:week,type:'MILESTONE_REACHED',source:'PLAYER_ACTION',summary:`DEV QA: ${summary}`,metadata:{devQa:true,...metadata}}]}};
};

/** Energy lives in the weekly base and the bonus bank (`energy` only mirrors them), so a
 * shortfall is granted the way an energy purchase is, never by writing `energy.current`. */
const ensureEnergy=(player:Player,needed:number):Player=>{
 const next={...player,flags:{...player.flags},energy:{...player.energy}};
 grantPurchasedEnergy(next,0);
 grantPurchasedEnergy(next,Math.max(0,Math.ceil(needed-next.energy.current)));
 return next;
};

/** Founder capital through the real service; the founder's personal cash is topped up first. */
const fund=(player:Player,amount:number,key:string):Player=>{
 if(amount<=0) return player;
 const topped={...player,money:player.money+amount};
 const result=contributeStreamingFounderCapital(topped,amount,key);
 if(!result.changed) throw Error(`Founder capital was refused: ${result.reason}.`);
 return result.player;
};

const chooseMarkets=()=>STREAMING_DAY_ONE_REGION_ORDER.flatMap(regionId=>STREAMING_WORLD_MARKETS
 .filter(market=>market.regionId===regionId&&!SKIPPED_MARKETS.has(market.id)).sort((a,b)=>b.streamingAudience-a.streamingAudience||a.id.localeCompare(b.id))
 .slice(0,MARKET_QUOTA[regionId]));

const regionPlans=(counts:Partial<Record<StreamingDayOneRegionId,number>>)=>STREAMING_DAY_ONE_REGION_ORDER
 .filter(regionId=>(counts[regionId]||0)>0)
 .map(regionId=>({regionId,serverCounts:{SCOUT:0,WORKHORSE:0,TITAN:counts[regionId]||0},cloudProvider:'MERIDIAN' as const,cloudCompute:0}));

type Markets=ReturnType<typeof chooseMarkets>;
type Demand={likely:number;byMarket:Record<string,number>};

const rehearse=(build:StreamingCanonicalBuildData,markets:Markets,demand:Demand,catalogue:ReturnType<typeof getStreamingOpeningCatalogueView>)=>createStreamingLaunchRehearsal({scenario:'LIKELY',rolloutRiskPercent:0,countries:markets.map(market=>{
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

/** Smallest Titan drawing that serves every market and holds its rehearsal: start at sixteen
 * racks per market and add eight to any region whose markets are thin or break. */
const sizeNetwork=(player:Player,markets:Markets,demand:Demand,catalogue?:ReturnType<typeof getStreamingOpeningCatalogueView>):StreamingCanonicalBuildData=>{
 const countryIds=markets.map(market=>market.id);
 const week=getAbsoluteWeek(player.age,player.currentWeek);
 const counts:Partial<Record<StreamingDayOneRegionId,number>>={};
 markets.forEach(market=>{counts[market.regionId]=(counts[market.regionId]||0)+16;});
 for(let attempt=0;attempt<24;attempt++) {
  const build=createCanonicalBuildData({source:'CAREER',regionPlans:regionPlans(counts),facilities:[],openingCountryIds:countryIds,forecastConcurrentStreams:demand.likely,absoluteWeek:week,fibreState:player.ownedStreamingPlatform.fibre});
  const failing=new Set(build.coverage.countries.filter(row=>row.grade!=='SERVED').map(row=>row.countryId));
  if(catalogue) rehearse(build,markets,demand,catalogue).countries.filter(row=>row.verdict==='BROKE').forEach(row=>failing.add(row.marketId));
  if(!failing.size) return build;
  new Set(markets.filter(market=>failing.has(market.id)).map(market=>market.regionId)).forEach(regionId=>{counts[regionId]=(counts[regionId]||0)+8;});
 }
 throw Error('The test network could not serve every market. No changes were saved.');
};

const marketingForecast=(player:Player,markets:ReturnType<typeof chooseMarkets>,demand:ReturnType<typeof forecastWorldStreamingBuildDemand>,buildWeeks:number,protectedOperatingCash:number)=>{
 const platform=player.ownedStreamingPlatform;
 const week=getAbsoluteWeek(player.age,player.currentWeek);
 return forecastStreamingLaunchMarketing({platformKey:platform.identity!.slug,absoluteWeek:week,buildWeeks,availableTreasury:platform.treasuryCash,protectedOperatingCash,hasSellablePlan:true,hasFlagshipOriginal:true,pricingRevision:platform.serviceConfiguration.revision,catalogueRevision:platform.catalogLicenses.length,localizationRevision:platform.localizationOperations.titleLanguageAssets.length,competitionRevision:0,countries:markets.map(market=>({countryId:market.id,countryName:market.country,reachableHouseholds:Math.max(1,Math.round(market.streamingAudience/2.4)),baseConcurrentStreams:demand.byMarket[market.id]||0,conversionHeadroom:.5,mediaCostIndex:1,purchasingPowerIndex:1,consumerConfidence:.65,internetAccess:.72,localizationCoverage:1,catalogueCoverage:1,competitionPressure:0,priorAwareness:.03}))},platform.launchMarketingDraft!);
};

/** A hybrid offer: three ad-free plans, a free tier with ads, rentals and ad-free passes. An
 * ad-supported paid plan roughly doubles the weekly royalty receipts, so ads live in the free tier. */
const hybridPricing=(current:OwnedStreamingPricingConfiguration):OwnedStreamingPricingConfiguration=>{
 let pricing=configureStreamingPricingOffer(current,{kind:'CORE',coreModel:'SUBSCRIPTION'});
 pricing=configureStreamingPricingOffer(pricing,{kind:'TOGGLE',offer:'ADS',enabled:true});
 pricing=configureStreamingPricingOffer(pricing,{kind:'TOGGLE',offer:'STORE',enabled:true});
 pricing={...pricing,annualDiscount:15,introOffer:0,ads:{...pricing.ads,minutesPerHour:4},rentals:{rent:3.99,buy:14.99,windowWeeks:4},plans:[
  // Ids follow the launch ladder (BASIC < PREMIUM < FAMILY) that Build still mirrors and validates.
  // Every plan carries the full catalogue; without it Standard drew no accounts at all.
  {id:'BASIC',name:'Basic',monthly:6.99,featureIds:['noads','catalogue'],ads:false},
  {id:'PREMIUM',name:'Standard',monthly:12.99,featureIds:['noads','catalogue','hd','streams2','downloads'],ads:false},
  {id:'FAMILY',name:'Premium',monthly:19.99,featureIds:['noads','catalogue','uhd','spatial','streams4','downloads','early'],ads:false},
 ]};
 pricing=configureStreamingPricingOffer(pricing,{kind:'BENEFIT',offer:'PLAN',planId:'FAMILY',premiumAccess:true,earlyAccessWeeks:2});
 pricing=configureStreamingPricingOffer(pricing,{kind:'PASS',duration:'ONE_HOUR',price:.99});
 pricing=configureStreamingPricingOffer(pricing,{kind:'PASS',duration:'DAY',price:2.99});
 return configureStreamingPricingOffer(pricing,{kind:'STORE_ELIGIBILITY',scope:'PUBLIC',planIds:[]});
};

/** Signs one Content Market listing on the given window, through negotiation and signature. */
const signListing=(player:Player,listingId:string,window:number|'PERMANENT'):Player|null=>{
 const listing=getContentMarketListings(player).find(row=>row.id===listingId);
 if(!listing||listing.unavailableReason||isContentMarketAuctionListing(player,listingId)) return null;
 const permanent=window==='PERMANENT';
 const terms={...listing.terms,durationWeeks:permanent?520:window,windowType:permanent?'PERMANENT' as const:listing.terms.windowType,
  minimumGuarantee:Math.round(listing.terms.minimumGuarantee*(permanent?2.4:.7)),platformRevenueShare:permanent?100:listing.terms.platformRevenueShare};
 const opened=openStreamingRightsNegotiation(player,listingId,terms);
 if(!opened.changed||!opened.negotiation) return null;
 const ready={...opened.player,ownedStreamingPlatform:{...opened.player.ownedStreamingPlatform,rightsNegotiations:opened.player.ownedStreamingPlatform.rightsNegotiations
  .map(row=>row.id===opened.negotiation!.id?{...row,status:'READY_TO_SIGN' as const}:row)}};
 const signed=signStreamingRightsDeal(ready,opened.negotiation.id);
 return signed.changed?establishContentMarketCatalogue(signed.player):null;
};

const signLaunchLicences=(source:Player):{player:Player;signed:number}=>{
 let player=prepareContentMarketDiscovery(source);
 const listings=getContentMarketListings(player).filter(row=>!row.unavailableReason&&!isContentMarketAuctionListing(player,row.id))
  .sort((a,b)=>(b.title.quality||0)-(a.title.quality||0));
 let signed=0;
 for(const window of LAUNCH_LICENCE_WINDOWS) {
  while(listings.length) {
   const next=signListing(player,listings.shift()!.id,window);
   if(next) {player=next;signed++;break;}
  }
 }
 return {player,signed};
};

/** Detached and atomic: a refusal anywhere throws before anything is published. */
export function prepareStreamingFullPlatformQa(source:Player):Player {
 const state=getStreamingFullPlatformQaState(source);
 if(state.stage!=='PREPARE') throw Error(state.reason||'This company is past preparation.');
 let player=grantStreamingPlusForTesting(structuredClone(source));
 let platform=normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform,player.id);
 const week=getAbsoluteWeek(player.age,player.currentWeek);
 if(!platform.identity||!platform.foundingProfile) {
  player={...player,money:Math.max(player.money,STREAMING_INCORPORATION_ECONOMY.cashRequired),stats:{...player.stats,fame:Math.max(80,player.stats.fame),reputation:Math.max(80,player.stats.reputation)},
   ownedStreamingPlatform:{...platform,lifecycle:'ELIGIBLE',milestoneKeys:[...new Set([...platform.milestoneKeys,'streaming-launch-clearance'])]}};
  const founded=incorporateOwnedStreamingPlatform(saveStreamingFoundingDraft(player,{...createDefaultStreamingFoundingDraft(week),currentStep:2,name:COMPANY_NAME,primaryColor:'#2F7BFF',secondaryColor:'#0B1220'}));
  if(!founded.changed) throw Error(`The test company could not be registered: ${founded.reason}.`);
  player=founded.player;
  platform=player.ownedStreamingPlatform;
  /* The catalogue below is signed for a subscription offer, as it always was: since Phase 2 a new
     service starts with "Basic with ads", and licences signed while ads are on carry ad-supported
     windows, which put far more titles on the free tier and grow the save's royalty receipts past
     the phone budget (entry #44). Ads join with the full test offer at pricing. */
  platform={...platform,serviceConfiguration:{...platform.serviceConfiguration,pricing:{...platform.serviceConfiguration.pricing,streams:['subs'],plans:[
   {id:'BASIC',name:'Essential',monthly:7.99,featureIds:[],ads:false},
   {id:'PREMIUM',name:'Standard',monthly:12.99,featureIds:[],ads:false},
   {id:'FAMILY',name:'Premiere',monthly:17.99,featureIds:[],ads:false},
  ]}}};
  player={...player,ownedStreamingPlatform:platform};
 }
 player={...player,ownedStreamingPlatform:{...platform,milestoneKeys:[...new Set([...platform.milestoneKeys,STREAMING_FULL_PLATFORM_QA_MARKER])],
  technologyLevels:Object.fromEntries(Object.entries(platform.technologyLevels).map(([id,level])=>[id,Math.max(level,TECHNOLOGY_BASELINE[id as keyof typeof TECHNOLOGY_BASELINE]||0)])) as typeof platform.technologyLevels,
  // the tech tree owns what the baseline stands for: Playback 58 (1080p, 4K, HDR, 10-bit, up to Spatial 3D), Delivery 45
  // (HEVC, AV1) and Reliability 42 (Auto-scaling, Redundancy), so the test plans keep their features
  techTree:grantStreamingTechTreeFromLevels(resolveStreamingTechTree(platform),TECHNOLOGY_BASELINE,week)}};
 player=ledger(player,`${PREFIX}:technology:${week}`,'technology baseline raised for the test offer.',{levels:TECHNOLOGY_BASELINE});
 // Capital for the catalogue and filings first; the launch top-up follows the real quotes.
 player=fund(player,7_500_000_000,`${PREFIX}:capital:catalogue:${week}`);

 const markets=chooseMarkets();
 const countryIds=markets.map(market=>market.id);
 player=ensureEnergy(player,quoteStreamingMarketFilingEnergy(countryIds));
 player=saveStreamingMarketPlan(player,countryIds).player;
 const filed=beginStreamingMarketClearance(player,countryIds);
 if(filed.reason==='INSUFFICIENT_TREASURY'||filed.reason==='INSUFFICIENT_ENERGY') throw Error(`Market filings could not be funded: ${filed.reason}.`);
 player=filed.player;
 platform=player.ownedStreamingPlatform;
 player={...player,ownedStreamingPlatform:{...platform,marketOperations:platform.marketOperations.map(operation=>operation.entryKind==='OPENING'&&operation.status!=='EXITED'?{
  ...operation,status:'READY',approvalReadyAtAbsoluteWeek:week,infrastructureReadyAtAbsoluteWeek:week,
  clearance:operation.clearance?{...operation.clearance,outcome:'APPROVED',progressPercent:100,remainingWeeks:0,stage:'FINAL_APPROVAL'}:null,
 }:operation)}};
 player=ledger(player,`${PREFIX}:clearance:${week}`,`${countryIds.length} opening markets approved at once.`,{countryIds});

 // Originals: delivered titles of the platform's own, premiering through the first half-year.
 platform=player.ownedStreamingPlatform;
 const originals=ORIGINALS.map(spec=>({spec,projectId:originalId(player.id,spec)}));
 const projects:IndustryProject[]=originals.map(({spec,projectId},index)=>({id:projectId,title:spec.title,genre:spec.genre,mediaType:spec.projectType,studioId:'DEV_QA_STUDIO',budgetTier:index%2?'HIGH':'MID',quality:78+index*3,rating:7.4+index*.2,boxOffice:0,year:player.age,weekReleased:player.currentWeek,leadActorId:player.id,leadActorName:player.name,directorName:'Northstar Studios',reviews:'Developer test Original.'}));
 const commissions:OwnedStreamingOriginalCommission[]=originals.map(({spec,projectId},index)=>({id:`${projectId}:commission`,scriptId:`${projectId}:script`,canonicalProjectId:projectId,title:spec.title,gapId:'SERIES_RETENTION',projectType:spec.projectType,genre:spec.genre,episodes:spec.episodes,producerStudioId:'DEV_QA_STUDIO',producerStudioName:'Northstar Studios',commissionedByPlatformName:platform.identity!.name,productionBudgetCap:0,productionFundingApplied:0,status:index===0?'RELEASED':'DELIVERED',commissionedAtAbsoluteWeek:week,greenlitAtAbsoluteWeek:week}));
 player={...player,world:{...player.world,projects:[...player.world.projects,...projects.filter(project=>!player.world.projects.some(row=>row.id===project.id))]},ownedStreamingPlatform:{...platform,
  originalCommissions:[...platform.originalCommissions.filter(row=>!commissions.some(item=>item.id===row.id)),...commissions],
  catalogProjectIds:[...new Set([...platform.catalogProjectIds,...originals.map(row=>row.projectId)])]}};
 player=ledger(player,`${PREFIX}:originals:${week}`,`${originals.length} Originals delivered for the slate.`);

 // The catalogue: Content Market collections, signed through the real service (10 energy each).
 player=prepareContentMarketDiscovery(player);
 for(const collection of getContentMarketCollections(player)) {
  if(player.ownedStreamingPlatform.catalogLicenses.length>=CATALOGUE_TARGET) break;
  const bought=purchaseContentMarketCollection(ensureEnergy(player,10),collection.id,collection.signature);
  if(bought.changed) player=bought.player;
 }
 if(player.ownedStreamingPlatform.catalogLicenses.length<20) throw Error('The Content Market offered too few collections this cycle. No changes were saved.');

 // Opening slate: the flagship Original plus the two strongest licensed titles.
 platform=player.ownedStreamingPlatform;
 const strongest=platform.catalogLicenses.filter(row=>row.status==='ACTIVE').slice(0,2);
 player={...player,ownedStreamingPlatform:{...platform,launchSlate:{revision:(platform.launchSlate?.revision||0)+1,programmedAtAbsoluteWeek:week,entries:[
  {id:`${originals[0].projectId}:slate`,projectId:originals[0].projectId,title:ORIGINALS[0].title,source:'ORIGINAL',projectType:ORIGINALS[0].projectType,genre:ORIGINALS[0].genre,launchWeek:1,releasePattern:'FULL_SEASON',marketingPlan:'EVENT'},
  ...strongest.map((license,index)=>({id:`${license.id}:slate`,projectId:license.sourceProjectId,title:license.titleAtSigning,source:'LICENSED_WINDOW' as const,projectType:license.projectType||'MOVIE',genre:license.genre||'DRAMA',launchWeek:index+1,releasePattern:'SINGLE_PREMIERE' as const,marketingPlan:'STANDARD' as const})),
 ]},launchMarketingDraft:platform.launchMarketingDraft?{...platform.launchMarketingDraft,budgetCeiling:60_000_000,revision:platform.launchMarketingDraft.revision+1,updatedAtAbsoluteWeek:week}:platform.launchMarketingDraft}};

 // The shelves: three setup titles left off the opening slate, the way a career keeps titles
 // it has not programmed yet, so the Slate tab has something to schedule. A setup (STARTER)
 // licence is streamed only once the slate gives it a week; the rest of the catalogue goes
 // live at its rights start. Long windows, one series and two films.
 platform=player.ownedStreamingPlatform;
 const programmed=new Set(platform.launchSlate!.entries.map(row=>row.projectId));
 const free=platform.catalogLicenses.filter(row=>row.status==='ACTIVE'&&row.origin==='CATALOGUE_ACQUISITION'&&!programmed.has(row.sourceProjectId)
  &&row.windowType!=='PERMANENT'&&!row.permanentPurchase&&row.expiresAtAbsoluteWeek>week+STREAMING_FULL_PLATFORM_QA_LIVE_WEEKS+60);
 const shelf=new Set([...free.filter(row=>row.projectType==='SERIES').slice(0,1),...free.filter(row=>row.projectType!=='SERIES')].slice(0,SHELF_TITLES).map(row=>row.id));
 player={...player,ownedStreamingPlatform:{...platform,catalogLicenses:platform.catalogLicenses.map(row=>shelf.has(row.id)?{...row,origin:'STARTER' as const}:row)}};

 platform=player.ownedStreamingPlatform;
 player=saveStreamingServiceIdent(player,{soundIdentKey:platform.serviceConfiguration.soundIdentKey||'PULSE',identPackageId:platform.serviceConfiguration.identPackageId||'STANDARD',customIdentAudio:platform.serviceConfiguration.customIdentAudio}).player;
 player=saveStreamingStorefrontPlan(player,{storefrontLayoutId:platform.serviceConfiguration.storefrontLayoutId||'CINEMA'}).player;
 const priced=saveStreamingPricingPlan(player,hybridPricing(player.ownedStreamingPlatform.serviceConfiguration.pricing));
 if(!priced.changed&&priced.reason!=='SAVED') throw Error(`The test offer was refused: ${priced.reason}.`);
 player=priced.player;

 // Network: sized to serve every market, then rehearsed against the campaign's demand.
 const worldDemand=forecastWorldStreamingBuildDemand(player,player.ownedStreamingPlatform.serviceConfiguration.pricing,countryIds);
 const catalogue=getStreamingOpeningCatalogueView(player);
 const first=sizeNetwork(player,markets,{likely:Math.max(1,worldDemand.likely),byMarket:worldDemand.byMarket});
 const organic=marketingForecast(player,markets,worldDemand,first.schedule.weeks,first.quote.totals.weeklyTotal*12);
 const demand={...organic.concurrentStreams,byMarket:Object.fromEntries(organic.countryForecasts.map(row=>[row.countryId,row.likelyConcurrentStreams]))};
 let build=sizeNetwork(player,markets,demand,catalogue);
 player=saveStreamingInfrastructureDraft(player,{...createDefaultStreamingInfrastructureDraft(player),currentStep:4,strategy:'HYBRID',capacityPackageId:'PREMIERE',regionPlans:build.regionPlans,facilities:build.facilities,networkPlacements:build.placements,openingDemandForecast:demand,lastLoadTestSignature:null,lastLaunchRehearsal:undefined});
 const draft=player.ownedStreamingPlatform.infrastructureSetupDraft!;
 build=createCanonicalBuildData({source:'CAREER',regionPlans:draft.regionPlans,facilities:draft.facilities,openingCountryIds:countryIds,forecastConcurrentStreams:demand.likely,absoluteWeek:week,fibreState:player.ownedStreamingPlatform.fibre});
 const forecast=getStreamingInfrastructureForecast(player,draft);
 const rehearsal=rehearse(build,markets,demand,catalogue);
 if(rehearsal.verdict==='BROKE') throw Error(`The test network did not pass its rehearsal: ${rehearsal.countries.filter(row=>row.verdict==='BROKE').map(row=>row.marketId).join(', ')}. No changes were saved.`);
 const evidence:OwnedStreamingLaunchRehearsalSnapshot={...rehearsal,configurationSignature:forecast.configurationSignature,warningSummary:rehearsal.warningSummary,completedAtAbsoluteWeek:week};
 player=saveStreamingInfrastructureRehearsal(player,draft,evidence);
 player=checkpointStreamingLaunchBlueprint(player).player;

 // Launch capital: the real commission bill plus twenty weeks of running costs and a reserve.
 const quote=getStreamingOpeningCommissionQuote(player,player.ownedStreamingPlatform.infrastructureSetupDraft!,marketingForecast(player,markets,worldDemand,build.schedule.weeks,build.quote.totals.weeklyTotal*12));
 const need=quote.totalCashRequired+build.quote.totals.weeklyTotal*20+1_500_000_000-player.ownedStreamingPlatform.treasuryCash;
 player=fund(player,Math.ceil(Math.max(0,need)/100_000_000)*100_000_000,`${PREFIX}:capital:launch:${week}`);
 player=checkpointStreamingLaunchBlueprint(player).player;
 const missing=getStreamingLaunchProgramView(player).milestones.filter(row=>['DEFINE_LAUNCH','BUILD_PLATFORM'].includes(row.trackId)&&row.id!=='COMMISSIONING'&&!row.complete);
 if(missing.length) throw Error(`Preparation incomplete: ${missing.map(row=>row.label).join(', ')}. No changes were saved.`);
 return player;
}

/** The real Opening Programme commission, against the same campaign forecast the launch uses. */
export function commissionStreamingFullPlatformQa(player:Player):Player {
 player=grantStreamingPlusForTesting(player);
 const platform=player.ownedStreamingPlatform;
 const draft=platform.infrastructureSetupDraft;
 if(!draft) throw Error('The test network drawing is missing. No changes were saved.');
 const countryIds=platform.marketOperations.filter(row=>row.entryKind==='OPENING'&&row.status!=='EXITED').map(row=>row.countryId!).filter(Boolean);
 const markets=STREAMING_WORLD_MARKETS.filter(market=>countryIds.includes(market.id));
 const worldDemand=forecastWorldStreamingBuildDemand(player,platform.serviceConfiguration.pricing,countryIds);
 const forecast=getStreamingInfrastructureForecast(player,draft);
 const committed=commissionStreamingOpeningProgramme(player,{infrastructureDraft:draft,
  marketingForecast:marketingForecast(player,markets,worldDemand,forecast.buildWeeks,forecast.weeklyOperatingCost*12),
  openingCountryIds:countryIds,expectedLaunchDefinitionSignature:getStreamingLaunchDefinitionSignature(player)});
 if(!committed.changed) throw Error(committed.message);
 return committed.player;
}

/** Decisions a real operator makes in the first months; each is skipped quietly when a gate says no. */
const operateWeek=(source:Player,liveWeek:number):Player=>{
 let player=source;
 const week=getAbsoluteWeek(player.age,player.currentWeek);
 const apply=(result:{player:Player;changed:boolean})=>{if(result.changed) player=result.player;return result.changed;};
 if(liveWeek===0) {
  EXECUTIVES.forEach(id=>apply(appointStreamingExternalExecutive(player,id)));
  DIRECTORS.forEach(id=>apply(appointStreamingIndependentDirector(player,id)));
  /* #186: the founding offers no longer stand in the game; the full test company still signs two of them */
  INVESTORS.forEach(id=>apply(acceptStreamingCelebrityInvestment(player,id,{founding:true})));
  const licences=signLaunchLicences(player);
  /* the test company's own history: what it signed in its first live week went on the service, as if the Slate had
     programmed it (a player's purchase now waits on the shelves for the Slate) */
  player=releaseSlateHoldOnNewLicences(player,licences.player);
  player=ledger(player,`${PREFIX}:licences:${week}`,`${licences.signed} licences signed on short and permanent windows.`);
 }
 const plan=liveWeek===0?'AUDIENCE_PUSH':liveWeek===6?'RETENTION_SPOTLIGHT':liveWeek===11?'RELIABILITY_GUARD':null;
 if(plan) apply(lockStreamingWeeklyPlan(player,plan));
 if(liveWeek%3===0) {
  // Campaigns go to titles already on the service: the flagship first, then last week's leaders.
  const platform=player.ownedStreamingPlatform;
  const leaders=(platform.weeklyHistory.at(-1)?.operations.titlePerformance||[]).map(row=>row.projectId);
  const projectIds=[...new Set([originalId(player.id,ORIGINALS[0]),...leaders])];
  const campaign=liveWeek%6===0;
  for(const projectId of projectIds.slice((liveWeek/3)%Math.max(1,projectIds.length))) {
   if(apply(lockStreamingGrowthAction(player,{projectId,channels:campaign?['TRAILER','SOCIAL','BILLBOARD']:['SOCIAL','REGIONAL'],homepagePlacement:campaign?'HERO':'TOP_TEN',
    recommendationObjective:campaign?'BREAKOUT':'RETENTION',explorationPercent:25,artworkVariants:campaign?['FACE_FORWARD','MYSTERY_HOOK']:[]}))) break;
  }
 }
 // Localization by region through the Content Desk's own actions; energy is granted like a purchase.
 for(const step of LOCALIZATION_STEPS.filter(row=>row.week===liveWeek)) {
  if(!step.track) {apply(unlockStreamingLocalizationRegion(player,step.packageId));continue;}
  player=ensureEnergy(player,step.energy ?? 40);
  apply(contributeStreamingLocalizationEnergy(player,step.packageId,step.track,step.energy ?? 'FILL'));
 }
 // One engineering project at a time: the cheapest node the campus offers.
 const campus=getStreamingTechnologyCampus(player);
 if(campus.available&&!campus.activeProject) {
  const next=campus.facilities.flatMap(facility=>facility.nodes).filter(node=>node.status==='AVAILABLE')
   .sort((a,b)=>a.definition.targetLevel-b.definition.targetLevel||a.definition.id.localeCompare(b.definition.id))[0];
  if(next) apply(startStreamingTechnologyProject(player,next.definition.id,'BALANCED'));
 }
 return player;
};

/** Delivered Originals get premiere weeks on the live calendar, so the slate runs past the test. */
const scheduleOriginals=(player:Player):Player=>{
 const platform=player.ownedStreamingPlatform;
 const launchWeek=platform.launchCommit?.committedAtAbsoluteWeek;
 if(launchWeek===undefined) return player;
 const specs=new Map(ORIGINALS.map(spec=>[`${originalId(player.id,spec)}:commission`,spec]));
 return ledger({...player,ownedStreamingPlatform:{...platform,originalCommissions:platform.originalCommissions.map(row=>{
  const spec=specs.get(row.id);
  if(!spec||spec.programWeek===1||row.releasePlan) return row;
  return {...row,releasePlan:{scope:'GLOBAL',releasePattern:spec.projectType==='SERIES'?'WEEKLY':'SINGLE_PREMIERE',marketingPlan:spec.programWeek%2?'STANDARD':'EVENT',
   premiereAtAbsoluteWeek:launchWeek+spec.programWeek-1,authorizedAtAbsoluteWeek:launchWeek}};
 })}},`${PREFIX}:premieres:${launchWeek}`,'Original premieres scheduled.');
};

/** Runs every remaining stage, saving after preparation, each processed week and the launch. */
export async function buildStreamingFullPlatformQa(source:Player,hooks:StreamingFullPlatformQaHooks):Promise<Player> {
 let player=grantStreamingPlusForTesting(source);
 const say=(message:string)=>hooks.onProgress?.(message);
 const advance=async(label:string)=>{
  if(player.flags?.isDead) throw Error('The career ended. Completed weeks were saved.');
  await hooks.yieldToUi?.();
  const before=getAbsoluteWeek(player.age,player.currentWeek);
  const next=await hooks.processWeek(player);
  if(getAbsoluteWeek(next.player.age,next.player.currentWeek)!==before+1) throw Error('Weekly processing did not advance exactly one week. Stopped.');
  player=await hooks.persistWeek(next.player);
  say(label);
 };
 let state=getStreamingFullPlatformQaState(player);
 if(state.stage==='BLOCKED') throw Error(state.reason);
 if(state.stage==='PREPARE') {
  say('Founding the company, signing the catalogue and drawing the network…');
  await hooks.yieldToUi?.();
  player=commissionStreamingFullPlatformQa(prepareStreamingFullPlatformQa(player));
  player=await hooks.persistWeek(player);
  state=getStreamingFullPlatformQaState(player);
 }
 if(state.stage==='BUILD') {
  const target=getStreamingBuildQaTargetWeek(player);
  if(target===null) throw Error('The Opening Programme is not commissioned.');
  const start=getAbsoluteWeek(player.age,player.currentWeek);
  for(let done=1;getAbsoluteWeek(player.age,player.currentWeek)<target;done++) await advance(`Building the network: week ${done} of ${target-start}.`);
  state=getStreamingFullPlatformQaState(player);
 }
 if(state.stage==='LAUNCH') {
  const launched=commitOwnedStreamingLaunch(player,'STANDARD');
  if(!launched.changed) throw Error(`Opening Night was refused: ${launched.reason}.`);
  player=await hooks.persistWeek(scheduleOriginals(launched.player));
  say('Opening Night is done. Running the service…');
  state=getStreamingFullPlatformQaState(player);
 }
 while(state.stage==='OPERATE') {
  player=operateWeek(player,state.liveWeeks);
  await advance(`Running the service: week ${state.liveWeeks+1} of ${STREAMING_FULL_PLATFORM_QA_LIVE_WEEKS}.`);
  state=getStreamingFullPlatformQaState(player);
 }
 return player;
}
