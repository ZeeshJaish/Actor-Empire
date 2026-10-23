import type { BoxOfficeRegionId, IndustryContentFingerprint, IndustryProductionCommitment, StudioAiReleaseMode } from '../../types';
import { BOX_OFFICE_REGIONS } from '../cinemaChains';

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
    return [regionByMarket[fingerprint?.priorityMarket||'']||languageRegion[fingerprint?.originalLanguage||'']||'NORTH_AMERICA'];
};
