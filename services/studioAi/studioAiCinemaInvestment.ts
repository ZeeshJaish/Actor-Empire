import type {IndustryContentFingerprint,NPCStudioState,WorldState} from '../../types';
import {studioAiCinemaCountries,studioAiMarketingRate} from './studioAiCinemaRelease';
import {quoteCinemaSupply} from '../boxOffice/boxOfficeSupply';
import {CINEMA_PERSONA_GENRES} from '../boxOffice/boxOfficeAudience';
import {CINEMA_AUDIENCE_PROFILE as A,CINEMA_EXPOSURE_PROFILE as E,CINEMA_MARKET_TUNING_VERSION,CINEMA_SUPPLY_PROFILE as S} from '../boxOffice/boxOfficeProfiles';
import {normalizeStreamingLanguageId} from '../streamingLocalizationCapabilities';
import {WORLD_COUNTRY_DEFINITIONS_BY_ID} from '../worldEconomy/worldCountryRegistry';

const clamp=(n:number,lo=0,hi=1)=>Math.max(lo,Math.min(hi,Number.isFinite(n)?n:lo));
const money=(n:number)=>Math.max(0,Math.floor(n*1000)/1000);
const active=(status:string)=>!['RELEASED','CANCELLED'].includes(status);
export const studioCinemaCampaignRate=(f:IndustryContentFingerprint)=>studioAiMarketingRate(f.releasePath==='LIMITED_EVENT'?'LIMITED_THEATRICAL':'WIDE_THEATRICAL');

/** A planning reserve only. The canonical release transaction still owns the actual debit. */
export const pendingStudioCinemaCampaignMillions=(world:WorldState|undefined,studioId:string):number=>
 Object.values(world?.industryProductions||{}).filter(p=>p.producerStudioId===studioId&&p.source==='STUDIO_INDEPENDENT'&&p.projectType==='MOVIE'&&active(p.status))
 .reduce((n,p)=>n+p.budgetMillions*(p.studioAiExecution?.selectedReleaseMode&&p.studioAiExecution.selectedReleaseMode!=='HOLD'
  ?studioAiMarketingRate(p.studioAiExecution.selectedReleaseMode):.18),0);

export interface StudioCinemaInvestment {
 productionMillions:number;campaignMillions:number;expectedProducerReceiptsMillions:number;countryIds:string[];eligiblePeople:number;
}
/** Conservative underwriting, not a lifetime quote, payment or audience grant.
 * Missing legacy overlays stay unknown. Known zero resources cannot finance a new film.
 * Uses the effective opening-demand integral of the current interest decay,
 * with no assumed excellent word of mouth, repeat fans or unsigned streaming proceeds.
 */
export const planStudioCinemaInvestment=(input:{world?:WorldState;studio:NPCStudioState;fingerprint:IndustryContentFingerprint;
 absoluteWeek:number;targetMillions:number;minimumMillions:number}):StudioCinemaInvestment|undefined=>{
 const {world,studio,fingerprint:f,absoluteWeek}=input;
 if(f.format!=='MOVIE'||!world?.worldPopulation||!world.worldAudienceEconomy||!world.worldAudienceParticipation)return;
 const language=normalizeStreamingLanguageId(f.originalLanguage),rate=studioCinemaCampaignRate(f);
 const mode=f.releasePath==='LIMITED_EVENT'?'LIMITED_THEATRICAL':'WIDE_THEATRICAL';
 const countries=Object.values(world.worldPopulation.countries).map(c=>({id:c.id,regionId:c.regionId,population:c.population,cinemaAccess:c.cinemaAccessPercent,purchasingPower:c.macro.purchasingPowerIndex,inflation:c.macro.inflationPressure,languages:c.languages}));
 const supply=quoteCinemaSupply({absoluteWeek,seed:0,tuningVersion:CINEMA_MARKET_TUNING_VERSION,knowledge:'FORECAST',titles:[],cohorts:[],countries});
 const countryFacts=new Map(countries.map(c=>[c.id,c]));
 const price=new Map<string,{ticket:number;receipt:number;weeklySeats:number}>();
 for(const c of countries){
  const pools=supply.pools.filter(p=>p.countryId===c.id&&p.format==='STANDARD'),screens=pools.reduce((n,p)=>n+p.screens,0);
  if(!screens)continue;
  price.set(c.id,{ticket:pools.reduce((n,p)=>n+p.ticketPriceCents*p.screens,0)/screens/100,
   receipt:pools.reduce((n,p)=>n+p.ticketPriceCents*(1-(p.exhibitorBasisPoints+p.distributionBasisPoints)/10000)*p.screens,0)/screens/100,
   weeklySeats:pools.reduce((n,p)=>n+p.weeklyScreenMinutes/(120+S.turnaroundMinutes)*p.seatsPerShow,0)});
 }
 const competitors=new Map<string,{countryIds?:string[];language:string;genre:string;weight:number}>();
 const add=(id:string,row:{countryIds?:string[];language:string;genre:string;weight:number})=>{competitors.set(id,row)};
 for(const p of world.projects||[])if(p.mediaType!=='SERIES'&&p.releaseStrategy==='THEATRICAL'&&p.cinema?.settlementBasis==='UNSETTLED_WEEKLY'&&!world.cinemaMarket?.titles[p.id]?.closed)
  add(p.id,{countryIds:p.releaseCountryIds,language:normalizeStreamingLanguageId(p.originalLanguageId||'english'),genre:p.genre,weight:1});
 for(const p of Object.values(world.industryProductions||{}))if(p.projectType==='MOVIE'&&active(p.status)&&p.studioAiExecution?.publicReleaseStrategy!=='STREAMING_ONLY'&&!competitors.has(p.canonicalProjectId)){
  const fp=p.studioAiExecution?.fingerprintSnapshot;
  if(fp)add(p.canonicalProjectId,{language:normalizeStreamingLanguageId(fp.originalLanguage),genre:p.genre,weight:['ON_HOLD','TURNAROUND'].includes(p.status)?.1:.5});
 }
 const familiarityByCohort=new Map<string,number>();
 if(f.canonicalUniverseId)for(const a of world.cinemaMarket?.market.affinities||[])
  if(a.kind==='UNIVERSE'&&a.id===f.canonicalUniverseId)familiarityByCohort.set(a.cohortId,Math.max(familiarityByCohort.get(a.cohortId)||0,a.people*clamp(a.strength/100)));
 const openingOpportunities=A.openingInterestGraceWeeks+1+1/(2**(1/A.firstInterestHalfLifeWeeks)-1);
 // A casting target is not a signed star. Discount its recognition for availability/attachment risk.
 const expectedRecognition=Math.pow(clamp(f.starPowerTarget/100),1.4)*E.legacyRecognitionCeiling*.5*E.announcementRecognitionReach;
 const underwritingShare=clamp(.65+(studio.ai?.profile.riskTolerance??50)*.003-(studio.ai?.profile.financialDiscipline??50)*.001,.55,.92);
 // A forecast is uncertain, not a requirement that every film already looks like a winner.
 // Small creative bets may use a limited share of uncommitted treasury. Existing production,
 // campaign and operating obligations remain protected; this does not debit or grant money.
 const profile=studio.ai?.profile,finance=studio.ai?.finance;
 const protectedCash=(finance?.weeklyOperatingCostMillions||0)*(8+(profile?.financialDiscipline??50)/8);
 const availableCash=Math.max(0,studio.cashReserve-protectedCash-(finance?.committedSpendMillions||0)
  -pendingStudioCinemaCampaignMillions(world,studio.id));
 const creativeRiskAllowance=availableCash*(.001+clamp((profile?.riskTolerance??50)/100)*.003);
 const estimate=(productionMillions:number):StudioCinemaInvestment=>{
  const campaignMillions=productionMillions*rate,ids=studioAiCinemaCountries(mode,f,world,campaignMillions*1e6);
  const totalPeople=ids.reduce((n,id)=>n+(world.worldAudienceEconomy!.countries[id]?.cohorts.reduce((s,c)=>s+c.people,0)||0),0);
  const impressions=campaignMillions*1e6*E.qualifiedImpressionsPerDollar;
  const awareness=totalPeople?1-Math.exp(-impressions/totalPeople-expectedRecognition):0;
  let receipts=0,eligiblePeople=0;
  for(const id of ids){
   const country=world.worldAudienceEconomy!.countries[id],participation=world.worldAudienceParticipation!.countries[id],terms=price.get(id),pop=countryFacts.get(id);
   if(!country||!participation||!terms||!pop)continue;
   const primary=normalizeStreamingLanguageId(WORLD_COUNTRY_DEFINITIONS_BY_ID[id]?.languages[0]||'');
   const languageFit=primary===language?1:.35;
   const rivals=[...competitors.values()].reduce((n,p)=>n+((p.countryIds?p.countryIds.includes(id):p.language===language)?p.weight*(p.genre===f.primaryGenre?1:.5):0),0);
   const competition=1+rivals*.18;
   let countryVisits=0,wallet=0;
   for(const c of country.cohorts){
    const p=participation.cohorts.find(p=>p.cohortId===c.id);if(!p)continue;
    const eligible=Math.min(c.people,Math.floor((p.cinemaOnlyHouseholds+p.dualParticipantHouseholds)*c.people/Math.max(1,c.households)));
    eligiblePeople+=eligible;
    const weeklyWallet=p.totalMonthlyCinemaBudget*12/52;
    const affordability=clamp(weeklyWallet/Math.max(1,eligible)/terms.ticket);
    const fit=(CINEMA_PERSONA_GENRES[c.primaryPersonaId]?.includes(f.primaryGenre)?1:.7)*languageFit;
    const familiarity=clamp((familiarityByCohort.get(`${id}:${c.id}`)||0)/Math.max(1,c.people));
    const utility=clamp(p.cinemaInterestIndex/100)*fit*.82*(1+familiarity*.5);
    countryVisits+=Math.min(eligible,eligible*awareness*A.firstWeeklyIntent*openingOpportunities*utility*affordability**(.25+clamp(c.priceSensitivityIndex/100)*.5))/competition;
    wallet+=weeklyWallet*openingOpportunities;
   }
   const visits=Math.min(countryVisits,wallet/terms.ticket,terms.weeklySeats*openingOpportunities*S.targetOccupancy/competition);
   receipts+=visits*terms.receipt;
  }
  return {productionMillions:money(productionMillions),campaignMillions:money(campaignMillions),expectedProducerReceiptsMillions:money(receipts/1e6),countryIds:ids,eligiblePeople};
 };
 const target=Math.max(0,input.targetMillions),minimum=Math.max(0,input.minimumMillions);
 // Fit an actually viable scope; never make an effects-heavy package cheap by rewriting its curve.
 for(const budget of [...new Set([1,.85,.7,.55,.4,.25].map(r=>Math.max(minimum,money(target*r))).concat(minimum))]){
  if(budget>target||budget<=0)continue;
  const quote=estimate(budget);
  // Existing backend can consume four percent; keep development/uncertainty and campaign room.
  const cost=budget*(1+rate)+Math.max(.25,budget*.04);
  const supportedReceipts=quote.expectedProducerReceiptsMillions*.96*underwritingShare;
  const boundedRisk=quote.eligiblePeople>0&&quote.expectedProducerReceiptsMillions>=cost*.35
   &&cost-supportedReceipts<=creativeRiskAllowance;
  if(cost<=supportedReceipts||boundedRisk)return quote;
 }
 return {...estimate(0),productionMillions:0,campaignMillions:0};
};
