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

/** A cheap release-planning estimate, never a replacement for paid weekly demand.
 * No translation is assumed. Priority is a preference only within language-compatible markets.
 * Sparse legacy worlds use registry access assumptions; no population/save state is rewritten.
 */
export const studioAiCinemaCountries = (mode:StudioAiReleaseMode,fingerprint?:IndustryContentFingerprint,
    world?:WorldState,campaignDollars=0):string[] => {
    const language=normalizeStreamingLanguageId(fingerprint?.originalLanguage || 'english');
    const regions=studioAiCinemaRegions(mode,fingerprint);
    const priority=fingerprint?.priorityMarket;
    const preferred=(id:string,region:string)=>priority==='GLOBAL'||priority===region
        ||priority==='INDIA'&&id==='IN'||priority==='EAST_ASIA'&&['JP','KR','CN','TW'].includes(id)
        ||priority==='LATIN_AMERICA'&&(region==='SOUTH_AMERICA'||id==='MX')
        ||priority==='MIDDLE_EAST'&&['AE','SA','QA','KW','BH','OM','JO','LB'].includes(id);
    const ranked=WORLD_COUNTRY_DEFINITIONS.filter(c=>regions.includes(c.regionId)
        &&c.languages.some(l=>normalizeStreamingLanguageId(l)===language)).map(c=>{
        const pop=world?.worldPopulation?.countries[c.id],aud=world?.worldAudienceEconomy?.countries[c.id];
        const participants=world?.worldAudienceParticipation?.countries[c.id];
        const reachable=participants?participants.cohorts.reduce((n,p)=>n+p.cinemaOnlyHouseholds+p.dualParticipantHouseholds,0)*2
            :(aud?.commercialPopulation ?? pop?.population ?? c.baselinePopulation)*(pop?.cinemaAccessPercent ?? 50)/100;
        // Country language lists include secondary languages. They do not mean
        // every household is equally likely to choose that language in cinemas.
        const languageFit=normalizeStreamingLanguageId(c.languages[0])===language?1:.35;
        const eligible=reachable*languageFit;
        const purchasing=Math.max(.1,(pop?.macro.purchasingPowerIndex ?? ({ADVANCED:95,DEVELOPED:65,EMERGING:35,LOW:15}[c.developmentProfile]))/100);
        const competition=(world?.projects || []).filter(p=>p.mediaType!=='SERIES'&&p.releaseStrategy==='THEATRICAL'
            &&p.cinema?.settlementBasis==='UNSETTLED_WEEKLY'&&!world?.cinemaMarket?.titles[p.id]?.closed
            &&(p.releaseCountryIds?.includes(c.id)||!p.releaseCountryIds&&p.releaseRegionIds?.includes(c.regionId))).length;
        return {id:c.id,eligible,score:eligible*purchasing*(preferred(c.id,c.regionId)?1.2:1)/(1+competition*.12)};
    }).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
    if(!ranked.length)return [];
    if(['WIDE_THEATRICAL','EVENT_THEATRICAL','THEATRICAL_THEN_STREAMING'].includes(mode))return ranked.map(c=>c.id).sort();
    // Concentrate a limited campaign rather than dilute it over an entire continent.
    const targetPeople=Math.max(1,campaignDollars*30*2),selected:string[]=[];
    let people=0;
    for(const c of ranked){selected.push(c.id);people+=c.eligible;if(people>=targetPeople)break;}
    return selected.sort();
};
