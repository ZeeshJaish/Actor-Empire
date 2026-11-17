import type { CinemaExposureCohort, CinemaTitleMarketFacts, CinemaWeekInput } from './boxOfficeTypes';

const fraction=(n:number)=>Math.max(0,Math.min(1,Number.isFinite(n)?n/100:0));

/* 16 Nov (B7 follow-up; Zeesh: a film can be in cinemas and on streaming at the same time, as in the real world): once a
   film streams in a country, some of the people there who would still have gone to see it watch it at home instead.
   In the real world a film's cinema takings fall hard once it reaches homes, but it keeps playing, and a big film
   keeps more of its audience: people want a spectacle, a hyped event or their franchise on the big screen. So how
   many stay home follows the film's big-screen pull (worked out per audience in boxOfficeAudience): 70% with no pull,
   20% at the most, about half for an ordinary drama, about a third for a well-loved spectacle franchise. A country
   it does not stream in is untouched (an Asian market where it opened late, say). The run still ends by its floor or
   its window (boxOfficeLiveSettlement). The alternatives below only count where the engine has a service to compare;
   many careers have none, so this rule stands on its own. */
export const CINEMA_AT_HOME_MOST=.7;
export const CINEMA_AT_HOME_LEAST=.2;
export const cinemaAtHomeShare=(bigScreenPull:number)=>CINEMA_AT_HOME_MOST-(CINEMA_AT_HOME_MOST-CINEMA_AT_HOME_LEAST)*Math.max(0,Math.min(1,bigScreenPull));

/** Best reachable alternative, rather than summing overlapping subscriptions into new people. */
export const cinemaHomeChoice=(input:Pick<CinemaWeekInput,'absoluteWeek'|'streamingAlternatives'>,cohort:CinemaExposureCohort,genre:string,facts:CinemaTitleMarketFacts,bigScreenPull=.35)=>{
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
    const atHome=windows.some(w=>w.countryIds.includes(cohort.countryId)&&w.absoluteWeek<=input.absoluteWeek)?cinemaAtHomeShare(bigScreenPull):0;
    wait=Math.max(wait,atHome);
    return {share:Math.max(other,wait),other,wait};
};
