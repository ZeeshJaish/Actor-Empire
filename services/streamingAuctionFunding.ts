import type { StreamingAuctionFutureFundingTerms, IndustryProductionCommitment, IndustryProject, OwnedStreamingOriginalCommission, OwnedStreamingRightsObligation, Player, ProjectFormat } from '../types';
import { createDeterministicId } from './deterministicRandom';
import { createProductionCalendar } from './productionCalendar';
import { upsertCanonicalIndustryProduction } from './industryProductions';
import { selectIndustryTalentPackage } from './industryTalentSelection';
import { reserveProjectTalentBookings, releaseProjectTalentBookings } from './talentBookings';
import { createStreamingLicenseContract, createStreamingRightsContractFromLicense, registerStreamingRightsContract } from './streamingRightsCore';
import { getAbsoluteWeek } from './legacyLogic';
import { resolveStreamingCatalogTitle } from './streamingCatalog';
import { resolveAuctionContinuation } from './streamingAuctionTerms';

export type AuctionFutureFundingTerms = StreamingAuctionFutureFundingTerms;

type FundingObligation = OwnedStreamingRightsObligation & {
 futureFunding?: AuctionFutureFundingTerms;
 sourceAuctionId?: string;
 fundingActivatedAtAbsoluteWeek?: number;
 fundedProductionIds?: string[];
};
export interface AuctionFundingActionResult { player: Player; changed: boolean; reason?: string }
const obligations = (p: Player) => p.ownedStreamingPlatform.rightsObligations as FundingObligation[];
const amount = (terms: AuctionFutureFundingTerms) => Math.round(terms.count * terms.budgetPerProject);
const valid = (terms?: AuctionFutureFundingTerms): terms is AuctionFutureFundingTerms => Boolean(terms
 && Number.isInteger(terms.count) && terms.count > 0 && terms.count <= 3
 && Number.isFinite(terms.budgetPerProject) && terms.budgetPerProject >= 100_000 && terms.budgetPerProject <= 2_000_000_000
 && terms.deadlineWeeks === 52
 && ['NEW_ORIGINAL','SEQUEL','NEXT_SEASON'].includes(terms.kind)
 && ['ANY','LIVE_ACTION','ANIMATED','ANIME'].includes(terms.format)
 && ['FIRM','OPTION'].includes(terms.commitment)
 && Number.isFinite(terms.platformRightsPercent) && terms.platformRightsPercent >= 1 && terms.platformRightsPercent <= 100);
const availableCash = (p: Player, ownId?: string) => p.ownedStreamingPlatform.treasuryCash
 - p.ownedStreamingPlatform.costCommitments.filter(c=>c.status==='COMMITTED' && c.sourceReferenceId!==ownId)
 .reduce((sum,c)=>sum+Math.max(0,c.committedAmount-c.paidAmount),0);

/** An option becomes a binding, cash-backed order only through explicit exercise. */
export const activateAuctionFutureFunding = (player: Player, sessionId: string): AuctionFundingActionResult => {
 const obligation = obligations(player).find(o=>o.sourceAuctionId===sessionId && o.type==='FUTURE_GREENLIGHT');
 if (!obligation || !valid(obligation.futureFunding)) return {player,changed:false,reason:'NOT_FOUND'};
 if (obligation.futureFunding.commitment!=='OPTION' || obligation.fundingActivatedAtAbsoluteWeek!==undefined)
  return {player,changed:false,reason:'ALREADY_ACTIVE'};
 const total=amount(obligation.futureFunding);
 if (availableCash(player)<total) return {player,changed:false,reason:'INSUFFICIENT_CASH'};
 const week=getAbsoluteWeek(player.age,player.currentWeek);
 const reservedPlayer: Player = {...player,ownedStreamingPlatform:{...player.ownedStreamingPlatform,
  rightsObligations:obligations(player).map(o=>o.id===obligation.id?{...o,fundingActivatedAtAbsoluteWeek:week,
   dueAtAbsoluteWeek:week+52,status:'PENDING',resolvedAtAbsoluteWeek:null}:o),
  costCommitments:[...player.ownedStreamingPlatform.costCommitments,{
   id:createDeterministicId('auction_future_reserve',obligation.id),idempotencyKey:`auction-future:${obligation.id}`,
   category:'CONTENT',label:`Future production: ${obligation.title}`,status:'COMMITTED',plannedAmount:total,
   committedAmount:total,paidAmount:0,weeklyAmount:0,createdAtAbsoluteWeek:week,
   committedAtAbsoluteWeek:week,paidAtAbsoluteWeek:null,sourceReferenceId:obligation.id,
  }],
 }};
 return {changed:true,player:processAuctionFutureFunding(reservedPlayer,week)};
};

/** Own-funded orders use canonical production calendars, not the NPC platform's private AI slate. */
export const processAuctionFutureFunding = (input: Player, absoluteWeek: number): Player => {
 let player=input;
 for(const source of obligations(input)) {
  if(!source.sourceAuctionId || source.type!=='FUTURE_GREENLIGHT' || !valid(source.futureFunding))continue;
  const terms=source.futureFunding;
  if(source.status==='SATISFIED' && source.observedAmount>=terms.count)continue;
  if(terms.commitment==='OPTION' && source.fundingActivatedAtAbsoluteWeek===undefined)continue;
  if(source.status==='BREACHED' || absoluteWeek>source.dueAtAbsoluteWeek) {
   const messageId=createDeterministicId('auction_funding_failed',source.id);
   const alreadyNotified=player.inbox.some(message=>message.id===messageId);
   const stranded=player.ownedStreamingPlatform.costCommitments.some(c=>c.sourceReferenceId===source.id && c.status==='COMMITTED');
   if(source.status==='BREACHED' && alreadyNotified && !stranded)continue;
   let failedWorld=player.world;
   const unfinishedProjectIds=new Set<string>();
   for (const productionId of source.fundedProductionIds || []) {
    const production=failedWorld.industryProductions?.[productionId];
    if (!production || failedWorld.projects.some(project=>project.id===production.canonicalProjectId)) continue;
    unfinishedProjectIds.add(production.canonicalProjectId);
    failedWorld={...failedWorld,
     talentBookings:releaseProjectTalentBookings(failedWorld.talentBookings,production.canonicalProjectId,absoluteWeek),
     industryProductions:upsertCanonicalIndustryProduction(failedWorld.industryProductions,{...production,status:'CANCELLED',updatedAtAbsoluteWeek:absoluteWeek}),
    };
   }
   player={...player,world:failedWorld,inbox:alreadyNotified?player.inbox:[{
    id:messageId,sender:'Streaming Business Affairs',subject:'Future production deadline missed',
    text:`${source.title}: the contracted future productions were not delivered by the deadline. Unspent reserved funding was released. Production funding already spent was not refunded.`,
    type:'SYSTEM',isRead:false,weekSent:player.currentWeek,
   },...player.inbox],ownedStreamingPlatform:{...player.ownedStreamingPlatform,
    originalCommissions:player.ownedStreamingPlatform.originalCommissions.filter(commission=>!commission.canonicalProjectId || !unfinishedProjectIds.has(commission.canonicalProjectId)),
    costCommitments:player.ownedStreamingPlatform.costCommitments.map(c=>c.sourceReferenceId===source.id && c.status==='COMMITTED'?{...c,status:'CANCELLED'}:c),
    rightsObligations:obligations(player).map(o=>o.id===source.id?{...o,status:'BREACHED',resolvedAtAbsoluteWeek:o.resolvedAtAbsoluteWeek??absoluteWeek}:o),
   }};
   continue;
  }
  let obligation=obligations(player).find(o=>o.id===source.id)!;
  const producerId=obligation.counterpartyId;
  const studio=producerId?player.world.studios?.[producerId]:null;
  const parent=player.world.projects.find(p=>p.id===obligation.sourceProjectId);
  const catalogueParent=resolveStreamingCatalogTitle(player,obligation.sourceProjectId);
  if(!studio || !producerId || !catalogueParent)continue;
  if(terms.kind==='SEQUEL' && catalogueParent.projectType!=='MOVIE' || terms.kind==='NEXT_SEASON' && catalogueParent.projectType!=='SERIES')continue;
  const firstFunded = obligation.fundedProductionIds?.[0] ? player.world.industryProductions?.[obligation.fundedProductionIds[0]] : null;
  const firstCommission = firstFunded ? player.ownedStreamingPlatform.originalCommissions.find(row => row.canonicalProjectId === firstFunded.canonicalProjectId) : null;
  const savedOrdinal = terms.kind==='NEXT_SEASON' ? firstCommission?.seasonNumber : Number(firstFunded?.title.match(/\s+(\d+)$/)?.[1]);
  const continuation = terms.kind==='NEW_ORIGINAL' ? null : {
   ...resolveAuctionContinuation(player,obligation.sourceProjectId,catalogueParent.title,catalogueParent.projectType),
   ...terms,
   // Older in-flight orders already assigned their installments when production began.
   // Do not advance their numbering merely because their own commissions now exist.
   ...(!terms.firstInstallmentNumber && firstFunded && Number.isSafeInteger(savedOrdinal) && Number(savedOrdinal)>1
    ? {firstInstallmentNumber:Number(savedOrdinal)}:{}),
  };
  const started=obligation.fundingActivatedAtAbsoluteWeek ?? Math.max(0,Number(obligation.createdAtAbsoluteWeek ?? absoluteWeek));
  if(absoluteWeek<started)continue;
  if(!obligation.fundedProductionIds?.length) {
   const reserve=player.ownedStreamingPlatform.costCommitments.find(c=>c.sourceReferenceId===obligation.id && c.status==='COMMITTED');
   if(!reserve || reserve.committedAmount-reserve.paidAmount<amount(terms) || availableCash(player,obligation.id)<amount(terms))continue;
   let world=player.world;
   const ids:string[]=[];
   for(let index=0;index<terms.count;index++) {
    const id=createDeterministicId('auction_funded_production',obligation.id,index);
    const projectId=createDeterministicId('auction_funded_project',obligation.id,index);
    const duration=terms.deadlineWeeks;
    const calendar={...createProductionCalendar({preProductionWeeks:10,productionWeeks:26,postProductionWeeks:16}),startedAbsoluteWeek:absoluteWeek};
    const talent=selectIndustryTalentPackage({player:{...player,world},companyId:producerId,canonicalProjectId:projectId,
     genre:catalogueParent.genre as any,productionCalendar:calendar,bookings:world.talentBookings,companyTalentSkill:65,
     budgetMillions:terms.budgetPerProject/1_000_000,seedNamespace:obligation.id});
    if(!talent)break;
    const booking=reserveProjectTalentBookings({bookings:world.talentBookings,projectId,projectOwner:'INDUSTRY_PRODUCTION',
     producerStudioId:producerId,productionCalendar:calendar,actorIds:[talent.leadActor.id],directorIds:[talent.director.id],allowOverlaps:true});
    const isSeries=terms.kind==='NEXT_SEASON' || (terms.kind==='NEW_ORIGINAL' && catalogueParent.projectType==='SERIES');
    const title=terms.kind==='NEW_ORIGINAL'?`${studio.name} Original ${index+1}`
     :`${continuation!.baseTitle}${isSeries?' Season':''} ${continuation!.firstInstallmentNumber!+index}`;
    const production:IndustryProductionCommitment={id,canonicalProjectId:projectId,title,projectType:isSeries?'SERIES':'MOVIE',
     genre:catalogueParent.genre as any,producerStudioId:producerId,source:'PLATFORM_COMMISSION',status:'PRE_PRODUCTION',
     productionCalendar:calendar,budgetMillions:terms.budgetPerProject/1_000_000,paidMillions:0,talentBookingIds:booking.bookingIds,
     writerSource:'IN_HOUSE_TEAM',writerId:null,writerName:`${studio.name} Story Department`,writerSkill:65,
     ...(terms.kind!=='NEW_ORIGINAL'&&parent?.universeId?{universeId:parent.universeId}:{}),createdAtAbsoluteWeek:absoluteWeek,updatedAtAbsoluteWeek:absoluteWeek,
     aiExecution:{standardDurationWeeks:duration,effectiveDurationWeeks:duration,qualityForecast:talent.packageScore,
      executionRoll:0.5,delayRoll:0.5,overrunRoll:0.5,failureRoll:0.5,delayWeeks:0,overrunMillions:0,
      leadActorId:talent.leadActor.id,leadActorName:talent.leadActor.name,directorId:talent.director.id,directorName:talent.director.name,
      writerId:null,writerName:`${studio.name} Story Department`,finalQuality:null,failureDecision:'NONE',failureResponse:'NONE',
      failureResponseAmountMillions:0,failureResponseAppliedAtAbsoluteWeek:null,paidMilestoneIds:[],controllerAtLastProgression:'AI',lastProgressedAbsoluteWeek:absoluteWeek,holdReason:null},
    };
    world={...world,talentBookings:booking.bookings,industryProductions:upsertCanonicalIndustryProduction(world.industryProductions,production)};
    ids.push(id);
   }
   // Talent/canonical creation and escrow spending form one immutable action.
   if(ids.length!==terms.count)continue;
   obligation={...obligation,...(continuation ? {futureFunding:{...terms,...continuation}}:{}),fundingActivatedAtAbsoluteWeek:started,fundedProductionIds:ids};
   player={...player,world,ownedStreamingPlatform:{...player.ownedStreamingPlatform,
    treasuryCash:player.ownedStreamingPlatform.treasuryCash-amount(terms),
    originalCommissions:[...player.ownedStreamingPlatform.originalCommissions,...ids.map((id,index):OwnedStreamingOriginalCommission=>{
     const production=world.industryProductions![id];
     const parentCommission=player.ownedStreamingPlatform.originalCommissions.find(c=>c.canonicalProjectId===obligation.sourceProjectId);
     return {id:createDeterministicId('auction_original',obligation.id,index),scriptId:createDeterministicId('auction_script',obligation.id,index),
      canonicalProjectId:production.canonicalProjectId,title:production.title,gapId:production.projectType==='SERIES'?'SERIES_RETENTION':'BROAD_AUDIENCE',
      projectType:production.projectType,genre:production.genre,episodes:production.projectType==='SERIES'?8:1,
      producerStudioId:producerId,producerStudioName:studio.name,commissionedByPlatformName:player.ownedStreamingPlatform.identity?.name||'Your platform',
      productionBudgetCap:terms.budgetPerProject,productionFundingApplied:terms.budgetPerProject,status:'IN_PRODUCTION',
      commissionedAtAbsoluteWeek:started,greenlitAtAbsoluteWeek:absoluteWeek,
      parentCommissionId:terms.kind!=='NEW_ORIGINAL'?parentCommission?.id||null:null,
      lineageId:terms.kind!=='NEW_ORIGINAL'?continuation!.lineageId:production.canonicalProjectId,
      seasonNumber:terms.kind==='NEXT_SEASON'?continuation!.firstInstallmentNumber!+index:1,
      contract:{platformRightsPercent:terms.platformRightsPercent,producerBackendPercent:100-terms.platformRightsPercent,exclusiveWindowWeeks:104,sequelRightsIncluded:false},
      releasePlan:null,localization:null,lifecycleDecision:null};
    })],
    costCommitments:player.ownedStreamingPlatform.costCommitments.map(c=>c.id===reserve.id?{...c,status:'PAID',paidAmount:amount(terms),paidAtAbsoluteWeek:absoluteWeek}:c),
    rightsObligations:obligations(player).map(o=>o.id===obligation.id?obligation:o),
   }};
  }
  let delivered=0;
  for(const productionId of obligation.fundedProductionIds||[]) {
   let production=player.world.industryProductions?.[productionId];if(!production)continue;
   if(player.world.projects.some(p=>p.id===production!.canonicalProjectId)){delivered++;continue;}
   const duration=production.productionCalendar.totalWeeks;
   const elapsed=Math.min(duration,Math.max(0,absoluteWeek-(production.productionCalendar.startedAbsoluteWeek??production.createdAtAbsoluteWeek)));
   if(absoluteWeek<production.updatedAtAbsoluteWeek)continue;
   production={...production,status:elapsed>=duration?'DELIVERED':elapsed>=36?'POST_PRODUCTION':elapsed>=10?'PRODUCTION':'PRE_PRODUCTION',
    productionCalendar:{...production.productionCalendar,elapsedWeeks:elapsed},paidMillions:production.budgetMillions*elapsed/duration,
    updatedAtAbsoluteWeek:absoluteWeek,aiExecution:{...production.aiExecution!,lastProgressedAbsoluteWeek:absoluteWeek}};
   player={...player,world:{...player.world,industryProductions:upsertCanonicalIndustryProduction(player.world.industryProductions,production)}};
   if(elapsed<duration)continue;
   const execution=production.aiExecution!;
   const ordinal=(obligation.fundedProductionIds||[]).indexOf(productionId);
   const format:ProjectFormat=terms.format==='ANY'?'LIVE_ACTION':terms.format;
   const project:IndustryProject & {format:ProjectFormat;parentProjectId?:string;seasonNumber?:number;installmentNumber?:number;franchiseId?:string}={
    id:production.canonicalProjectId,title:production.title,genre:production.genre,mediaType:production.projectType,
    studioId:producerId,physicalProducerStudioId:producerId,budgetTier:production.budgetMillions>=150?'BLOCKBUSTER':production.budgetMillions>=80?'HIGH':production.budgetMillions>=30?'MID':'LOW',
    quality:Math.round(execution.qualityForecast),rating:Math.round((4+execution.qualityForecast/20)*10)/10,boxOffice:0,
    year:Math.floor(absoluteWeek/52)+1,weekReleased:absoluteWeek%52+1,leadActorId:execution.leadActorId!,leadActorName:execution.leadActorName!,
    directorId:execution.directorId!,directorName:execution.directorName!,writerName:production.writerName,reviews:'Platform-funded original production',
    releaseStrategy:'STREAMING_ONLY',format,...(terms.kind!=='NEW_ORIGINAL'?{parentProjectId:continuation!.parentProjectId,franchiseId:continuation!.lineageId,installmentNumber:continuation!.firstInstallmentNumber!+ordinal}:{}),
    ...(production.universeId?{universeId:production.universeId}:{}),...(terms.kind==='NEXT_SEASON'?{seasonNumber:continuation!.firstInstallmentNumber!+ordinal}:{}),
   };
   // Production ownership participation is a distinct, fully funded producer obligation,
   // never an optional licensing backend inferred from this title's purchase offer.
   const license=createStreamingLicenseContract({royaltyPurpose:'PRODUCER_PARTICIPATION',backendBasis:'ADJUSTED_GROSS_RECEIPTS',id:createDeterministicId('auction_funded_license',production.id),sourceProject:project,
    buyerPlatformId:null,platformContentPlanId:production.id,cataloguePackageId:null,licensorName:studio.name,territory:'GLOBAL',
    durationWeeks:104,exclusivity:'EXCLUSIVE',minimumGuarantee:0,platformRevenueShare:terms.platformRightsPercent,
    signedAtAbsoluteWeek:started,startsAtAbsoluteWeek:absoluteWeek,origin:'STUDIO_MARKET',sellerType:'STUDIO',sellerPlatformId:null,
    windowType:'FIRST_WINDOW',contentSource:'COMMISSIONED_ORIGINAL'});
   const contract=createStreamingRightsContractFromLicense({license,seller:{type:'NPC_STUDIO',id:producerId,name:studio.name,platformId:null},
    buyer:{type:'PLAYER_PLATFORM',id:player.ownedStreamingPlatform.identity?.slug||`player-platform:${player.id}`,name:player.ownedStreamingPlatform.identity?.name||'Your platform',platformId:null},
    guaranteeDisposition:'PAID',settledAtAbsoluteWeek:absoluteWeek,productionFunding:terms.budgetPerProject,biddingSessionId:source.sourceAuctionId});
   const registered=registerStreamingRightsContract(player.world.streamingRightsContracts,contract);
   player={...player,world:{...player.world,projects:[...player.world.projects,project],streamingRightsContracts:registered.registry,
    talentBookings:releaseProjectTalentBookings(player.world.talentBookings,project.id,absoluteWeek)},ownedStreamingPlatform:{...player.ownedStreamingPlatform,
    originalCommissions:player.ownedStreamingPlatform.originalCommissions.map(c=>c.canonicalProjectId===project.id?{...c,status:'RELEASED',
     releasePlan:{scope:'GLOBAL',releasePattern:project.mediaType==='SERIES'?'FULL_SEASON':'SINGLE_PREMIERE',marketingPlan:'LEAN',premiereAtAbsoluteWeek:absoluteWeek,authorizedAtAbsoluteWeek:absoluteWeek}}:c),
    catalogLicenses:[...player.ownedStreamingPlatform.catalogLicenses,license],catalogProjectIds:[...new Set([...player.ownedStreamingPlatform.catalogProjectIds,project.id])],
   }};
   delivered++;
  }
  player={...player,ownedStreamingPlatform:{...player.ownedStreamingPlatform,rightsObligations:obligations(player).map(o=>o.id===obligation.id?{
   ...o,observedAmount:delivered,status:delivered>=terms.count?'SATISFIED':'ON_TRACK',resolvedAtAbsoluteWeek:delivered>=terms.count?absoluteWeek:null,
  }:o)}};
 }
 return player;
};
