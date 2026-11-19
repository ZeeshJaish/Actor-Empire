import type { BoxOfficeRegionId, IndustryContentFingerprint, IndustryProductionCommitment, StudioAiReleaseMode, WorldState } from '../../types';
import { BOX_OFFICE_REGIONS } from '../cinemaChains';
import { WORLD_COUNTRY_DEFINITIONS } from '../worldEconomy/worldCountryRegistry';
import { normalizeStreamingLanguageId } from '../streamingLocalizationCapabilities';

export const studioAiMarketingRate = (mode:StudioAiReleaseMode):number => mode==='EVENT_THEATRICAL'?.25:
    mode==='WIDE_THEATRICAL'?.18:mode==='THEATRICAL_THEN_STREAMING'?.16:mode==='PRESTIGE_THEATRICAL'?.12:.08;

/** A fallback changes the outlet, not the delivered package's intended market size. */
export const studioAiTheatricalMode = (production:IndustryProductionCommitment,fingerprint:IndustryContentFingerprint):StudioAiReleaseMode => {
    const quality=production.studioAiExecution!.finalQuality!;
    if(fingerprint.releasePath==='LIMITED_EVENT')return 'LIMITED_THEATRICAL';
    if(quality.prestigePotential>=80&&quality.commercialPotential<90)return 'PRESTIGE_THEATRICAL';
    if(quality.commercialPotential>=82 || production.projectType==='MOVIE'&&production.budgetMillions>=40&&quality.commercialPotential>=55)return 'WIDE_THEATRICAL';
    return 'LIMITED_THEATRICAL';
};

/** Region choices are access and campaign destinations; they create no demand or translation. */
export const studioAiCinemaRegions = (mode:StudioAiReleaseMode,fingerprint?:IndustryContentFingerprint):BoxOfficeRegionId[] => {
    if(mode==='WIDE_THEATRICAL'||mode==='EVENT_THEATRICAL'||mode==='THEATRICAL_THEN_STREAMING')return BOX_OFFICE_REGIONS.map(r=>r.id);
    const regionByMarket:Record<string,BoxOfficeRegionId>={NORTH_AMERICA:'NORTH_AMERICA',INDIA:'ASIA',EAST_ASIA:'ASIA',
        LATIN_AMERICA:'SOUTH_AMERICA',EUROPE:'EUROPE',MIDDLE_EAST:'ASIA',AFRICA:'AFRICA'};
    const languageRegion:Record<string,BoxOfficeRegionId>={HINDI:'ASIA',TAMIL:'ASIA',TELUGU:'ASIA',KOREAN:'ASIA',JAPANESE:'ASIA',
        SPANISH:'SOUTH_AMERICA',PORTUGUESE:'SOUTH_AMERICA',FRENCH:'EUROPE',GERMAN:'EUROPE'};
    const language=normalizeStreamingLanguageId(fingerprint?.originalLanguage || 'english');
    const compatible=WORLD_COUNTRY_DEFINITIONS.filter(c=>c.languages.some(l=>normalizeStreamingLanguageId(l)===language));
    if(compatible.length)return [...new Set(compatible.map(c=>c.regionId))].sort() as BoxOfficeRegionId[];
    return [regionByMarket[fingerprint?.priorityMarket||'']||languageRegion[fingerprint?.originalLanguage||'']||'NORTH_AMERICA'];
};

export interface StudioAiRankedCinemaCountry { id: string; eligible: number; score: number }
const WIDE_RELEASE_MODES = new Set<StudioAiReleaseMode>(['WIDE_THEATRICAL','EVENT_THEATRICAL','THEATRICAL_THEN_STREAMING']);

/** A cheap release-planning estimate, never a replacement for paid weekly demand.
 * No translation is assumed. Priority is a preference only within language-compatible markets.
 * Sparse legacy worlds use registry access assumptions; no population/save state is rewritten.
 * Speed (18 Nov 2026): the countries are ranked once, and a plan that tries several budgets ranks once for all of
 * them (studioAiCinemaInvestment.ts). Each country's competing cinema titles are counted in one pass over the
 * titles instead of one pass per country; a wide release takes every compatible country and needs no ranking.
 * The countries chosen are exactly the same.
 */
export const rankStudioAiCinemaCountries = (mode:StudioAiReleaseMode,fingerprint?:IndustryContentFingerprint,
    world?:WorldState):StudioAiRankedCinemaCountry[] => {
    const language=normalizeStreamingLanguageId(fingerprint?.originalLanguage || 'english');
    const regions=studioAiCinemaRegions(mode,fingerprint);
    const compatible=WORLD_COUNTRY_DEFINITIONS.filter(c=>regions.includes(c.regionId)
        &&c.languages.some(l=>normalizeStreamingLanguageId(l)===language));
    if(WIDE_RELEASE_MODES.has(mode))return compatible.map(c=>({id:c.id,eligible:0,score:0}));
    const priority=fingerprint?.priorityMarket;
    const preferred=(id:string,region:string)=>priority==='GLOBAL'||priority===region
        ||priority==='INDIA'&&id==='IN'||priority==='EAST_ASIA'&&['JP','KR','CN','TW'].includes(id)
        ||priority==='LATIN_AMERICA'&&(region==='SOUTH_AMERICA'||id==='MX')
        ||priority==='MIDDLE_EAST'&&['AE','SA','QA','KW','BH','OM','JO','LB'].includes(id);
    /* titles still in cinemas, counted once per country they play in: by their countries, or else by their regions */
    const byCountry=new Map<string,number>(),byRegion=new Map<string,number>();
    for(const p of world?.projects || []){
        if(p.mediaType==='SERIES'||p.releaseStrategy!=='THEATRICAL'||p.cinema?.settlementBasis!=='UNSETTLED_WEEKLY'||world?.cinemaMarket?.titles[p.id]?.closed)continue;
        if(p.releaseCountryIds){for(const id of new Set(p.releaseCountryIds))byCountry.set(id,(byCountry.get(id)||0)+1);}
        else if(p.releaseRegionIds){for(const region of new Set(p.releaseRegionIds))byRegion.set(region,(byRegion.get(region)||0)+1);}
    }
    return compatible.map(c=>{
        const pop=world?.worldPopulation?.countries[c.id],aud=world?.worldAudienceEconomy?.countries[c.id];
        const participants=world?.worldAudienceParticipation?.countries[c.id];
        const reachable=participants?participants.cohorts.reduce((n,p)=>n+p.cinemaOnlyHouseholds+p.dualParticipantHouseholds,0)*2
            :(aud?.commercialPopulation ?? pop?.population ?? c.baselinePopulation)*(pop?.cinemaAccessPercent ?? 50)/100;
        // Country language lists include secondary languages. They do not mean
        // every household is equally likely to choose that language in cinemas.
        const languageFit=normalizeStreamingLanguageId(c.languages[0])===language?1:.35;
        const eligible=reachable*languageFit;
        const purchasing=Math.max(.1,(pop?.macro.purchasingPowerIndex ?? ({ADVANCED:95,DEVELOPED:65,EMERGING:35,LOW:15}[c.developmentProfile]))/100);
        const competition=(byCountry.get(c.id)||0)+(byRegion.get(c.regionId)||0);
        return {id:c.id,eligible,score:eligible*purchasing*(preferred(c.id,c.regionId)?1.2:1)/(1+competition*.12)};
    }).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
};

/** The countries a campaign of this size reaches, from a ranking made by rankStudioAiCinemaCountries. */
export const selectStudioAiCinemaCountries = (ranked:readonly StudioAiRankedCinemaCountry[],mode:StudioAiReleaseMode,campaignDollars=0):string[] => {
    if(!ranked.length)return [];
    if(WIDE_RELEASE_MODES.has(mode))return ranked.map(c=>c.id).sort();
    // Concentrate a limited campaign rather than dilute it over an entire continent.
    const targetPeople=Math.max(1,campaignDollars*30*2),selected:string[]=[];
    let people=0;
    for(const c of ranked){selected.push(c.id);people+=c.eligible;if(people>=targetPeople)break;}
    return selected.sort();
};

export const studioAiCinemaCountries = (mode:StudioAiReleaseMode,fingerprint?:IndustryContentFingerprint,
    world?:WorldState,campaignDollars=0):string[] =>
    selectStudioAiCinemaCountries(rankStudioAiCinemaCountries(mode,fingerprint,world),mode,campaignDollars);
