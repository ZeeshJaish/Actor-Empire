import type { CinemaExposureCohort, CinemaTitleMarketFacts, CinemaWeekInput } from './boxOfficeTypes';

const fraction=(n:number)=>Math.max(0,Math.min(1,Number.isFinite(n)?n/100:0));

/** Best reachable alternative, rather than summing overlapping subscriptions into new people. */
export const cinemaHomeChoice=(input:Pick<CinemaWeekInput,'absoluteWeek'|'streamingAlternatives'>,cohort:CinemaExposureCohort,genre:string,facts:CinemaTitleMarketFacts)=>{
    const rows=(input.streamingAlternatives||[]).filter(a=>a.countryId===cohort.countryId&&a.cohortId===cohort.id&&a.evidenceWeek<input.absoluteWeek&&a.catalogueStrength>0);
    const eligible=cohort.market?.eligiblePeople||0;
    let other=0,wait=0;
    const windows=facts.streamingWindows||(facts.streamingWindow?[facts.streamingWindow]:[]);
    for(const a of rows){
        const reach=Math.min(1,a.accessiblePeople/Math.max(1,eligible));
        const quality=fraction(a.catalogueStrength)*fraction(a.serviceQuality)*(.5+.5*fraction(a.localization));
        const fit=a.preferredGenres.includes(genre as typeof a.preferredGenres[number])?1:.35;
        other=Math.max(other,reach*quality*fit*(.6+.4*fraction(a.freshness))*.55*(1-fraction(facts.urgency)*.7));
        if(windows.some(w=>w.publiclyKnown&&w.platformId===a.platformId&&w.countryIds.includes(cohort.countryId)&&w.absoluteWeek-input.absoluteWeek<=8))
            wait=Math.max(wait,reach*.6*(1-fraction(facts.urgency)*.65));
    }
    return {share:Math.max(other,wait),other,wait};
};
