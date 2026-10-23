import type { IndustryContentFingerprint, Player, ProjectDetails, StudioAiReleaseMode } from '../../types';
import { getAbsoluteWeek } from '../legacyLogic';
import { studioAiCinemaCountries, studioAiMarketingRate } from '../studioAi/studioAiCinemaRelease';
import { normalizeStudioAiState, STUDIO_AI_LEDGER_LIMIT } from '../studioAi/studioAiState';
import { WORLD_COUNTRY_DEFINITIONS } from '../worldEconomy/worldCountryRegistry';
import { commitCinemaReleaseExposure } from './boxOfficeExposureAdapters';
import { moveCinemaNpcCash } from './boxOfficeSettlement';
import { findCinemaBusiness } from './boxOfficeWeek';
import { readCinemaExposureRecord } from './boxOfficeAwareness';

/** One atomic premiere candidate. The ordinary processed-week save owns durability.
 * Only the producing NPC treasury funds this campaign; an actor's posts/pay are separate.
 * Historical premieres and pre-paid player campaigns never acquire a second charge.
 */
export const fundOfferedCinemaLaunch = (player:Player,project:ProjectDetails,titleId:string):{world:Player['world'];project:ProjectDetails} => {
    const unchanged={world:player.world,project};
    if(project.type!=='MOVIE'||project.releaseStrategy==='STREAMING_ONLY'
        ||findCinemaBusiness(player,project.studioId)||project.castPackageSource==='AUTHORED'
        ||player.activeReleases.some(r=>r.id===titleId)||player.pastProjects.some(r=>r.id===titleId)
        ||player.world.cinemaMarket?.titles[titleId]||player.world.projects.some(r=>r.id===titleId))return unchanged;
    const events=project.cinemaExposure?.events || [];
    // Repair only an unambiguous, not-yet-released NPC continuation copy.
    // Real child payments, explicit reserves and historical premieres stay protected.
    if(project.subtype==='SEQUEL'&&project.franchiseId&&project.franchiseId!==titleId
        &&project.offeredCinemaLaunch?.studioId===project.studioId&&project.offeredCinemaLaunch.campaignCostCents>0
        &&!(project.reservedMarketingBudget || 0)&&events.some(e=>e.kind==='PAID_CAMPAIGN'&&e.titleId!==titleId)
        &&!events.some(e=>e.kind==='PAID_CAMPAIGN'&&e.titleId===titleId)){
        project={...project,offeredCinemaLaunch:undefined,cinemaExposure:readCinemaExposureRecord(project,titleId),
            marketingBudgetSpent:undefined,totalCampaignSpend:undefined,marketingChannelAllocations:undefined};
    }
    if(project.offeredCinemaLaunch||(project.marketingBudgetSpent || 0)>0||(project.totalCampaignSpend || 0)>0||(project.reservedMarketingBudget || 0)>0
        ||project.cinemaExposure?.events.some(e=>e.kind==='PAID_CAMPAIGN'))return unchanged;
    const absoluteWeek=getAbsoluteWeek(player.age,player.currentWeek);
    const sourceStudio=player.world.studios?.[project.studioId];
    if(!sourceStudio)return unchanged;
    const studio={...sourceStudio,ai:sourceStudio.ai ?? normalizeStudioAiState(sourceStudio,{absoluteWeek})};
    if(studio.ai.controller!=='AI')return unchanged;
    const mode:StudioAiReleaseMode=project.releaseScale==='GLOBAL'?'WIDE_THEATRICAL':'LIMITED_THEATRICAL';
    const reserve=Math.max(0,studio.ai.finance.committedSpendMillions)+Math.max(0,studio.ai.finance.weeklyOperatingCostMillions)*4;
    const availableCents=Math.max(0,Math.floor((studio.cashReserve-reserve)*1e8));
    const desiredCents=Math.max(0,Math.round(project.estimatedBudget*studioAiMarketingRate(mode)*100));
    const paidCostCents=Math.min(availableCents,desiredCents);
    let next:ProjectDetails={...project,offeredCinemaLaunch:{version:1,absoluteWeek,studioId:studio.id,campaignCostCents:paidCostCents}};
    if(!project.releaseRegionIds?.length&&!project.releaseCountryIds?.length){
        const fingerprint={originalLanguage:project.originalLanguageId || 'english',priorityMarket:'GLOBAL'} as IndustryContentFingerprint;
        const countries=studioAiCinemaCountries(mode,fingerprint,player.world,paidCostCents/100);
        if(countries.length)next={...next,releaseCountryIds:countries,releaseRegionIds:[...new Set(WORLD_COUNTRY_DEFINITIONS.filter(c=>countries.includes(c.id)).map(c=>c.regionId))]};
    }
    if(!paidCostCents)return {world:player.world,project:next};
    next={...next,marketingBudgetSpent:paidCostCents/100,totalCampaignSpend:paidCostCents/100,marketingChannelAllocations:{SOCIAL_DIGITAL:paidCostCents/100}};
    next=commitCinemaReleaseExposure({player,project:next,titleId,absoluteWeek,allocations:next.marketingChannelAllocations!});
    const cash=moveCinemaNpcCash(studio.cashReserve,-paidCostCents/1e8);
    const updatedStudio={...studio,cashReserve:cash,ai:{...studio.ai,ledger:[...studio.ai.ledger,{
        id:`offered-cinema-campaign:${titleId}`,absoluteWeek,category:'RELEASE_MARKETING' as const,
        amountMillions:-paidCostCents/1e8,balanceAfterMillions:cash,description:`${project.title}: offered-film release campaign`,
    }].slice(-STUDIO_AI_LEDGER_LIMIT)}};
    return {world:{...player.world,studios:{...player.world.studios,[studio.id]:updatedStudio}},project:next};
};
