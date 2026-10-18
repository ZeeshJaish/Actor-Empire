import assert from 'node:assert/strict';
import {getStreamingCountryAdMarket} from '../services/worldEconomy/worldStreamingAdMarket';
import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {createC6QaCareer} from '../lab/c6QaCareer';
import {configureStreamingPricingOffer} from '../services/streamingCommercialOffers';
import {getStreamingLaunchDefinitionSignature} from '../services/streamingLaunchProgram';
import {commitOwnedStreamingLaunch} from '../services/streamingLaunch';
import {processGameWeek} from '../services/gameLoop';
import {getStreamingFinanceRoom} from '../services/streamingFinanceRoom';
import {migratePlacementsToStreamingFacilities} from '../services/streamingFacilities';
import {getStreamingFacilityNetworkSnapshot} from '../services/streamingInfrastructure';
import {quoteStreamingNetworkPlan} from '../services/streamingNetworkQuote';
import {getStreamingLicenseQuote} from '../services/streamingCatalog';
import {createStreamingLicenseContract} from '../services/streamingRightsCore';
import {createStreamingRightsAccessGrantForOffer} from '../services/streamingRightsAccessGrant';
import {getAbsoluteWeek} from '../services/legacyLogic';
import {STREAMING_INCORPORATION_ECONOMY} from '../services/streamingEconomy';
import type {Player} from '../types';
type Core='SUBSCRIPTION'|'ADVERTISING'|'STORE';
type Config={id:string;replace?:boolean;window?:'FIRST_WINDOW'|'SECOND_WINDOW';racks?:number;core:Core;catalog:number;price?:number;buy?:number;quality?:number;seed?:number;weeks?:number;mg?:number;annual?:number;intro?:number;genres?:number;shock?:'REMOVE'|'HIKE'|'REFRESH'|'REPLACE_HIT'|'CLEARANCE'|'OUTAGE';};
const mode=process.argv[2]||'after';
let rng=191018;Math.random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
Date.now=()=>1792320000000;
const output=(process.env.STREAMING_BALANCE_OUTPUT || '/tmp/streaming-model-payback')+'/'+mode+(process.argv[3]?'.'+process.argv[3]:'')+'.json';
mkdirSync(dirname(output),{recursive:true});
const rows:any[]=[];const checks:any[]=[];
function check(name:string,fn:()=>void){try{fn();checks.push({name,status:'PASS'});}catch(e){checks.push({name,status:'FAIL',error:String(e)});}}
function fixture(c:Config){
 const p=createC6QaCareer();const s=p.ownedStreamingPlatform;const seed=c.seed||0;
 if(seed)s.simulationSeed='economy-balance-'+seed;
 const template=JSON.parse(JSON.stringify(s.catalogLicenses[0]));
 const project=JSON.parse(JSON.stringify(p.world.projects[0]));
 s.catalogProjectIds=[];s.catalogLicenses=[];p.world.projects=[];
 const licensedSlate=s.launchSlate!.entries.find(x=>x.source==='LICENSED_WINDOW')!;
 s.launchSlate!.entries=s.launchSlate!.entries.filter(x=>x.source==='ORIGINAL');
 for(let i=0;i<c.catalog;i++){
  const id='balance-title-'+i;const title='Balance Film '+i;const genre=['ACTION','DRAMA','COMEDY','ROMANCE','THRILLER','MYSTERY','HORROR','SCI_FI','ADVENTURE','SUPERHERO','MUSICAL','BIOPIC','SPORTS','ANIMATION','FANTASY','CRIME','DOCUMENTARY'][i%(c.genres || 17)];
  p.world.projects.push({...project,id,title,genre,quality:c.quality??80,rating:(c.quality??80)/10,boxOffice:(c.quality??80)>=90?300_000_000:10_000_000} as any);
  s.catalogProjectIds.push(id);s.catalogLicenses.push({...template,genre,id:'balance-license-'+i,sourceProjectId:id,sourceProjectTitle:title,titleAtSigning:title,minimumGuarantee:c.mg??1_000_000});
  s.launchSlate!.entries.push({...licensedSlate,id:'balance-slate-'+i,projectId:id,title,genre} as any);
 }
 s.starterCatalog={...s.starterCatalog!,ownedProjectIds:[],licensedProjectIds:[...s.catalogProjectIds]};
 s.serviceConfiguration.pricing=configureStreamingPricingOffer(s.serviceConfiguration.pricing,{kind:'CORE',coreModel:c.core});
 const pricing=s.serviceConfiguration.pricing;
 if(c.core==='SUBSCRIPTION')pricing.plans.forEach(x=>{x.monthly=c.price??7.99;});
 if(c.core==='ADVERTISING')pricing.ads.minutesPerHour=c.price??4;
 if(c.core==='STORE')pricing.rentals={...pricing.rentals,rent:c.price??5.99,buy:c.buy??19.99};
 if(c.annual!==undefined)pricing.annualDiscount=c.annual;
 if(c.intro!==undefined)pricing.introOffer=c.intro;
 const week=getAbsoluteWeek(p.age,p.currentWeek);
 const quoteRows:any[]=[];
 s.catalogLicenses=s.catalogLicenses.map(license=>{
  const project=p.world.projects.find(row=>row.id===license.sourceProjectId)!;
  const title={id:project.id,title:project.title,projectType:'MOVIE' as const,genre:project.genre,
   rating:(c.quality??80)/10,quality:c.quality??80,reach:50,prestige:50,budgetTier:'LOW' as const,
   releaseYear:p.age-(c.window==='SECOND_WINDOW'?2:0),gross:10_000_000,studioId:'qa-external-seller',studioName:'QA External Studio',source:'EXTERNAL_MARKET' as const};
  // Matched low-budget movie economics. Quality varies independently of production scale.
  Object.assign(project,{budgetTier:'LOW',boxOffice:10_000_000,year:p.age-(c.window==='SECOND_WINDOW'?2:0),yearReleased:p.age-(c.window==='SECOND_WINDOW'?2:0)});
  const quote=getStreamingLicenseQuote(title,'DOMESTIC',104,'NON_EXCLUSIVE',3,c.window || 'FIRST_WINDOW',p.age);
  quoteRows.push({titleId:project.id,quality:c.quality??80,quote,window:c.window || 'FIRST_WINDOW',durationWeeks:104});
  return createStreamingLicenseContract({id:license.id,sourceProject:{id:project.id,title:project.title,mediaType:'MOVIE',genre:project.genre},
   buyerPlatformId:null,platformContentPlanId:null,cataloguePackageId:null,licensorName:'QA External Studio',
   territory:'DOMESTIC',countryIds:['US'],durationWeeks:104,exclusivity:'NON_EXCLUSIVE',minimumGuarantee:quote.suggestedGuarantee,
   backendBasis:'ADS_RENTAL_RECEIPTS',platformRevenueShare:c.core==='SUBSCRIPTION'?100:90,signedAtAbsoluteWeek:week,startsAtAbsoluteWeek:week,
   origin:'STUDIO_MARKET',sellerType:'STUDIO',sellerPlatformId:null,windowType:c.window || 'FIRST_WINDOW',
   accessGrant:createStreamingRightsAccessGrantForOffer(pricing.streams,false)});
 });
 const rightsCash=s.catalogLicenses.reduce((sum,license)=>sum+license.minimumGuarantee,0);
 s.originalCommissions.forEach(commission=>{commission.productionBudgetCap=5_000_000;commission.productionFundingApplied=5_000_000;});
 s.treasuryCash=3_000_000_000-rightsCash-5_000_000;
 let networkQuote:any=null;
 if(c.racks){
  const facilities=migratePlacementsToStreamingFacilities(['NYC','LA','CHI'].map(cityId=>({cityId,racks:c.racks!,role:'CORE_ORIGIN' as const})));
  networkQuote=quoteStreamingNetworkPlan({facilities,regionPlans:[]}).totals;
  const capacity=getStreamingFacilityNetworkSnapshot(s,facilities);
  Object.assign(s.infrastructureSetup!,capacity,{facilities,networkPlacements:[],weeklyOperatingCost:networkQuote.weeklyTotal,capitalInvested:networkQuote.dueNow});
  s.capacity={baselineConcurrentStreams:capacity.baselineConcurrentStreams,burstConcurrentStreams:capacity.burstConcurrentStreams};
  s.infrastructureSetup!.loadTest.testedBurstCapacity=capacity.burstConcurrentStreams;
  s.treasuryCash=3_000_000_000-rightsCash-networkQuote.dueNow-5_000_000;
 }

 const foundationCash=STREAMING_INCORPORATION_ECONOMY.setupCostsConsumed;
 if(s.foundingProfile)s.foundingProfile={...s.foundingProfile,incorporationModel:'FIXED_V8_ZERO_TREASURY',setupCostsConsumed:foundationCash,openingTreasuryCash:0}; s.treasuryCash-=foundationCash;
 s.launchProgram.lastBlueprintSignature=getStreamingLaunchDefinitionSignature(p);
 const launch=commitOwnedStreamingLaunch(p,'STANDARD');assert.ok(launch.changed,'Launch '+c.id+' '+launch.reason);
 return {p:launch.player,opening:launch.launchCommit!.initialSubscribers,rightsCash,networkQuote,quoteRows,foundationCash};
}
function mutate(p:Player,c:Config,n:number){
 const s=p.ownedStreamingPlatform;
 if(n===14&&c.shock==='REMOVE'){s.catalogProjectIds=[];s.catalogLicenses=[];s.starterCatalog=null;s.originalCommissions=[];s.launchSlate!.entries=[];}
 if(n===14&&c.shock==='HIKE')s.serviceConfiguration.pricing.plans.forEach(x=>x.monthly=79);
 if(n===14&&c.shock==='CLEARANCE')s.marketOperations.forEach(x=>x.status='SUSPENDED');
 if(n===14&&c.shock==='OUTAGE')s.capacity={baselineConcurrentStreams:100,burstConcurrentStreams:200};
 if(c.shock==='REFRESH'&&n%4===0){
  // Replace one old title, keeping breadth, genre, rights cost and price fixed.
  const id=s.catalogProjectIds[0];const title=p.world.projects.find(x=>x.id===id) as any;
  title.quality=95;title.rating=9.5;title.boxOffice=300_000_000;title.weekReleased=p.currentWeek;
  const entry=s.launchSlate!.entries.find(x=>x.projectId===id)!;entry.launchWeek=n;
 }
 if(c.shock==='REPLACE_HIT'&&n===14){for(const title of p.world.projects as any[]){title.quality=95;title.rating=9.5;title.boxOffice=300_000_000;}}
}
async function run(c:Config){
 let {p,opening,rightsCash,networkQuote,quoteRows,foundationCash}=fixture(c);let replacementRightsCash=0;const replacementTemplates=structuredClone(p.world.projects);const replacementSlate=structuredClone(p.ownedStreamingPlatform.launchSlate!.entries.find(row=>row.source==='LICENSED_WINDOW')!);const startTreasury=p.ownedStreamingPlatform.treasuryCash;const weeks=c.weeks??26;const weekly:any[]=[];
 for(let n=1;n<=weeks;n++){
  mutate(p,c,n);const cashBefore=p.ownedStreamingPlatform.treasuryCash;
  if(n===105 && (c as any).replace){

   p.ownedStreamingPlatform.launchSlate!.entries=p.ownedStreamingPlatform.launchSlate!.entries.filter(row=>row.source==='ORIGINAL');
   const s=p.ownedStreamingPlatform,oldIds=replacementTemplates.map(row=>row.id),nextWeek=getAbsoluteWeek(p.age,p.currentWeek)+1;
   for(const [index,oldId] of oldIds.entries()) {
    const project=structuredClone(replacementTemplates[index]);
    const id='cycle-two-title-'+index;project.id=id;project.title='Second Cycle Film '+index;project.year=p.age-2;
    const title={id,title:project.title,projectType:'MOVIE' as const,genre:project.genre,rating:9.5,quality:95,reach:50,prestige:50,
     budgetTier:'LOW' as const,releaseYear:p.age-2,gross:10_000_000,studioId:'qa-external-seller',studioName:'QA External Studio',source:'EXTERNAL_MARKET' as const};
    const quote=getStreamingLicenseQuote(title,'DOMESTIC',104,'NON_EXCLUSIVE',3,'SECOND_WINDOW',p.age);
    const license=createStreamingLicenseContract({id:id+'-license',sourceProject:{id,title:project.title,mediaType:'MOVIE',genre:project.genre},
     buyerPlatformId:null,platformContentPlanId:null,cataloguePackageId:null,licensorName:'QA External Studio',territory:'DOMESTIC',countryIds:['US'],durationWeeks:104,
     exclusivity:'NON_EXCLUSIVE',minimumGuarantee:quote.suggestedGuarantee,backendBasis:'ADS_RENTAL_RECEIPTS',platformRevenueShare:c.core==='SUBSCRIPTION'?100:90,
     signedAtAbsoluteWeek:nextWeek,startsAtAbsoluteWeek:nextWeek,origin:'STUDIO_MARKET',sellerType:'STUDIO',sellerPlatformId:null,
     windowType:'SECOND_WINDOW',accessGrant:createStreamingRightsAccessGrantForOffer(s.serviceConfiguration.pricing.streams,false)});
    p.world.projects.push(project);s.catalogLicenses.push(license);s.treasuryCash-=quote.suggestedGuarantee;replacementRightsCash+=quote.suggestedGuarantee;
    const entry={...replacementSlate};s.launchSlate!.entries.push(entry);
    Object.assign(entry,{id:id+'-slate',projectId:id,title:project.title,genre:project.genre,launchWeek:n});
    s.catalogProjectIds[index]=id;
    quoteRows.push({titleId:id,quality:95,quote,window:'SECOND_WINDOW',durationWeeks:104,replacementWeek:n});
   }
   s.starterCatalog!.licensedProjectIds=[...s.catalogProjectIds];
  }

  p=(await processGameWeek(p)).player;const s=p.ownedStreamingPlatform;const op=s.weeklyHistory.at(-1)!.operations!;
  const customers=p.world.worldStreamingCustomers!.global;const viewing=p.world.worldStreamingViewing?.platforms.PLAYER;
  const revenue=op.subscriptionRevenue+(op.productRevenue||0)+(op.worldViewingIncrementalRevenue||0);
  const row={costBreakdown:Object.fromEntries(Object.entries(op).filter(([key,v])=>typeof v==='number'&&/Cost|Expense|Revenue|Amortization/.test(key))),rights:s.catalogLicenses.map(x=>({id:x.id,projectId:x.sourceProjectId,fee:x.minimumGuarantee,status:x.status,starts:x.startsAtAbsoluteWeek,expires:x.expiresAtAbsoluteWeek,renewedFrom:x.renewedFromLicenseId})),events:s.eventLedger.filter(x=>x.absoluteWeek===getAbsoluteWeek(p.age,p.currentWeek)).map(x=>({type:x.type,metadata:x.metadata})),week:n,paid:s.metrics.subscribers,startPaid:customers.playerStartingPaidAccounts,joins:customers.playerJoins,reactivations:customers.playerReactivations,cancels:customers.playerCancellations,churn:s.metrics.churnRate,viewing:viewing?.totalViewingAccounts||0,hours:viewing?.totalHoursViewed||0,monthly:customers.playerMonthlySubscriptionRevenue,subscription:op.subscriptionRevenue,ads:viewing?.revenue.advertisingRevenue||0,adImpressions:viewing?.revenue.advertisingImpressions||0,rentals:viewing?.revenue.rentalTransactions||0,purchases:viewing?.revenue.purchaseTransactions||0,rentalRevenue:viewing?.revenue.rentalRevenue||0,purchaseRevenue:viewing?.revenue.purchaseRevenue||0,revenue,partnerRoyalties:op.partnerRevenueShareCost,opCost:op.totalCashCost,opNet:op.netCashContribution,accountingNet:op.accountingContribution,amortization:op.contentAmortization,additionalOperatingExpense:op.additionalOperatingExpense||0,contentBasis:s.contentAccounting?.assets.reduce((sum,asset)=>sum+asset.costBasis,0)||0,contentRecognized:s.contentAccounting?.assets.reduce((sum,asset)=>sum+asset.recognizedCost,0)||0,treasury:s.treasuryCash,treasuryDelta:s.treasuryCash-cashBefore,nonOperatingDelta:s.treasuryCash-cashBefore-op.netCashContribution,playback:op.playbackSuccessRate,capacityUtilization:op.capacityUtilizationPercent,accessLoad:customers.playerAccessLoadAccounts,reachable:p.world.worldAudienceParticipation?.countries.US?.streamingReachableHouseholds||0,monthlyEffective:s.serviceConfiguration.pricing.plans[0]?.monthly||0,adMinutes:s.serviceConfiguration.pricing.ads.minutesPerHour};
  weekly.push(row);if(n%26===0)console.log(JSON.stringify({progress:c.id,week:n,revenue:row.revenue,treasury:row.treasury}));
  check(c.id+' W'+n,()=>{
   for(const v of Object.values(row))if(typeof v==='number')assert.ok(Number.isFinite(v));
   assert.ok(row.paid>=0&&row.revenue>=0&&row.opCost>=0&&row.treasury>0,'Finite funded operating case');
   assert.equal(row.paid,customers.playerEndingPaidAccounts);
   assert.equal(row.paid,row.startPaid+row.joins+row.reactivations-row.cancels);
   assert.equal(row.opNet,row.revenue-row.opCost);
   assert.equal(row.accountingNet,row.revenue-row.opCost-row.amortization);assert.ok((s.contentAccounting?.assets || []).every(asset=>asset.recognizedCost>=0&&asset.recognizedCost<=asset.costBasis),'content cost cannot exceed paid basis');
   if(c.core!=='SUBSCRIPTION'){assert.equal(row.paid,0);assert.equal(row.subscription,0);}
   const point=getStreamingFinanceRoom(p,'ALL').cashflow.at(-1)!;assert.equal(point.revenue,revenue);assert.equal(point.net,row.opNet-(op.additionalOperatingExpense||0));assert.equal(point.accountingContribution,row.accountingNet-(op.additionalOperatingExpense||0));assert.equal(point.incurredOperatingCost,row.opCost+(op.additionalOperatingExpense||0));
   const state=p.world.worldStreamingViewing!;
   assert.ok(Object.keys(state.countries).length>0,'ad budget checks require actual country results');
   for(const [countryId,country] of Object.entries(state.countries)) {
     const population=p.world.worldPopulation!.countries[countryId];
     const reachable=p.world.worldAudienceParticipation!.countries[countryId].streamingReachableHouseholds;
     const budget=getStreamingCountryAdMarket(population,getAbsoluteWeek(p.age,p.currentWeek),reachable).advertiserDemandBudget;
     const actual=Object.values(country.platformPerformance || {}).reduce((sum,row)=>sum+row.revenue.advertisingRevenue,0);
     assert.ok(actual<=budget,'all player/AI ads share the finite country demand budget');
   }
   const expectedBackend=s.catalogLicenses.reduce((sum,license)=>{
    const ads=(state.royaltyReceipts || []).filter(row=>row.platformId==='PLAYER'&&row.contractId===license.id&&row.sourceKind==='ADVERTISING').reduce((total,row)=>total+row.grossReceipts,0);
    const rent=(viewing?.titlePerformance || []).find(row=>row.projectId===license.sourceProjectId)?.revenue.rentalRevenue || 0;
    return sum+Math.round((ads+rent)*license.licensorRevenueShare/100);
   },0);
   assert.equal(op.partnerRevenueShareCost,expectedBackend,'new backend exact ads+rental');
   for(const country of Object.values(p.world.worldStreamingCustomers!.countries)) {
    const tenure=new Map<string,number>();
    country.cohorts.flatMap(cohort=>cohort.planCells).forEach(cell=>tenure.set(cell.platformId,(tenure.get(cell.platformId)||0)+cell.tenureNewAccounts));
    for(const platform of country.platformSummaries)assert.equal(tenure.get(platform.platformId)||0,platform.joins+platform.reactivations,'gross incoming customers equal saved new tenure');
   }

   let spent=0;
   for(const budget of state.householdBudgets || []) {
    assert.ok(budget.spentCents<=budget.weeklyDiscretionaryCents,'shared discretionary budget');
    assert.ok(budget.monthlySubscriptionSpend<=budget.monthlyBudget+.02,'all subscriptions fit the monthly budget');
    assert.ok(budget.weeklyDiscretionaryCents<=Math.floor(Math.max(0,budget.monthlyBudget-budget.monthlySubscriptionSpend)*100/4.33),'residual weekly envelope');
    spent+=budget.spentCents;
   }
   const consumers=Object.values(state.platforms).reduce((sum,x)=>sum+x.revenue.rentalRevenue+x.revenue.purchaseRevenue+x.revenue.premiumRevenue+x.revenue.dayPassRevenue+(x.revenue.oneHourPassRevenue || 0)+x.revenue.meteredRevenue+x.revenue.patronRevenue,0)+(state.householdProductRevenue || 0);
   assert.ok(consumers*100<=spent,'all player/AI consumer receipts must be funded');

  });
 }
 const tail=weekly.slice(-4);const sum=(key:string)=>weekly.reduce((t,x)=>t+x[key],0);const avg=(key:string)=>tail.reduce((t,x)=>t+x[key],0)/tail.length;
 const result={firstCashPaybackWeek:weekly.find(x=>x.treasury>=3_000_000_000)?.week??null,financeProfit:sum('accountingNet')-sum('additionalOperatingExpense'),netCashAfterAllInvestment:p.ownedStreamingPlatform.treasuryCash-3_000_000_000,config:c,opening,rightsCash,networkQuote,quoteRows,foundationCash,replacementRightsCash,originalCash:5_000_000,startTreasury,endTreasury:p.ownedStreamingPlatform.treasuryCash,final:weekly.at(-1),summary:{totalRevenue:sum('revenue'),totalOpNet:sum('opNet'),totalAccountingNet:sum('accountingNet'),totalNonOperating:sum('nonOperatingDelta'),totalCashDelta:sum('treasuryDelta'),cashAfterRights:sum('treasuryDelta')-rightsCash,cashAfterRightsAndNetwork:sum('treasuryDelta')-rightsCash-(networkQuote?.dueNow||0)-5_000_000,totalJoins:sum('joins'),totalCancellations:sum('cancels'),zeroCancelWeeks:weekly.filter(x=>x.cancels===0).length,profitableWeeks:weekly.filter(x=>x.opNet>0).length,firstProfitWeek:weekly.find(x=>x.opNet>0)?.week??null,tailRevenue:avg('revenue'),tailOpNet:avg('opNet'),tailCashDelta:avg('treasuryDelta'),tailAccountingNet:avg('accountingNet'),tailChurn:avg('churn'),tailPlayback:avg('playback')},weekly};
 rows.push(result);writeFileSync(output,JSON.stringify({mode,checks,rows},null,2));console.log(JSON.stringify({id:c.id,opening,paid:result.final.paid,revenue:Math.round(result.summary.tailRevenue),opNet:Math.round(result.summary.tailOpNet),cashAfterRights:result.summary.cashAfterRights,cancels:result.summary.totalCancellations,playback:result.summary.tailPlayback}));
}
const configs:Config[]=[
  {
    "id": "SUB-104",
    "core": "SUBSCRIPTION",
    "catalog": 12,
    "price": 7.99,
    "quality": 95,
    "weeks": 104,
    "racks": 3,
    "genres": 17,
    "window": "FIRST_WINDOW"
  },
  {
    "id": "ADS-104",
    "core": "ADVERTISING",
    "catalog": 12,
    "price": 4,
    "quality": 95,
    "weeks": 104,
    "racks": 3,
    "genres": 17,
    "window": "FIRST_WINDOW"
  },
  {
    "id": "SUB-15",
    "core": "SUBSCRIPTION",
    "catalog": 12,
    "price": 14.99,
    "quality": 95,
    "weeks": 104,
    "racks": 3,
    "genres": 17,
    "window": "FIRST_WINDOW"
  },
  {
    "id": "SUB-6",
    "core": "SUBSCRIPTION",
    "catalog": 6,
    "price": 14.99,
    "quality": 95,
    "weeks": 212,
    "racks": 3,
    "genres": 17,
    "window": "FIRST_WINDOW"
  },
  {
    "id": "ADS-6",
    "core": "ADVERTISING",
    "catalog": 6,
    "price": 6,
    "quality": 95,
    "weeks": 212,
    "racks": 3,
    "genres": 17,
    "window": "SECOND_WINDOW"
  },
  {
    "id": "SUB-LOW",
    "core": "SUBSCRIPTION",
    "catalog": 6,
    "price": 14.99,
    "quality": 50,
    "weeks": 52,
    "racks": 3,
    "genres": 17,
    "window": "FIRST_WINDOW"
  },
  {
    "id": "RENT-6",
    "core": "STORE",
    "catalog": 6,
    "price": 2.99,
    "quality": 95,
    "weeks": 104,
    "racks": 3,
    "genres": 17,
    "window": "SECOND_WINDOW"
  },
  {
    "id": "SUB-VALUE",
    "core": "SUBSCRIPTION",
    "catalog": 12,
    "price": 4.99,
    "quality": 95,
    "weeks": 212,
    "racks": 3,
    "genres": 17,
    "window": "FIRST_WINDOW"
  },
  {
    "id": "ADS-REFRESH",
    "core": "ADVERTISING",
    "catalog": 6,
    "price": 6,
    "quality": 95,
    "weeks": 212,
    "racks": 3,
    "genres": 17,
    "window": "SECOND_WINDOW",
    "replace": true
  },
  {
    "id": "ADS-REFRESH-260",
    "core": "ADVERTISING",
    "catalog": 6,
    "price": 6,
    "quality": 95,
    "weeks": 260,
    "racks": 3,
    "genres": 17,
    "window": "SECOND_WINDOW",
    "replace": true
  }
];
const selected=configs.filter(c=>!process.argv[3]||c.id===process.argv[3]);
assert.ok(selected.length>0,'Unknown balance scenario: '+process.argv[3]);
for(const c of selected)await run(c);
writeFileSync(output,JSON.stringify({mode,checks,rows},null,2));if(checks.some(x=>x.status==='FAIL'))process.exitCode=1;
