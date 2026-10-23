import { normalizeStreamingLanguageId } from '../streamingLocalizationCapabilities';
import { buildCinemaExposure } from './boxOfficeAwareness';
import { cinemaHomeChoice } from './boxOfficeAlternatives';
import { CINEMA_AUDIENCE_PROFILE as P, CINEMA_EXPOSURE_PROFILE } from './boxOfficeProfiles';
import type { CinemaChoiceRequest, CinemaTitleAudienceState, CinemaViewingEvidence, CinemaWeekInput } from './boxOfficeTypes';

const clamp = (n: number, lo = 0, hi = 1): number => Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : 0));
const fraction = (n: number): number => clamp(n / 100);
const people = (n: number): number => Math.floor(Math.max(0, n));
// Same persona preferences as WE6; no changes to streaming's calculations or audience wallets.
export const CINEMA_PERSONA_GENRES: Record<string, readonly string[]> = {
    FAMILY_HOUSEHOLDS: ['ANIMATION','ADVENTURE','COMEDY','FANTASY'], VALUE_SEEKERS: ['ACTION','COMEDY','CRIME','THRILLER'],
    FANDOM_LOYALISTS: ['SUPERHERO','SCI_FI','FANTASY','ACTION'], PRESTIGE_EXPLORERS: ['DRAMA','BIOPIC','DOCUMENTARY','MYSTERY'],
    LOCAL_FIRST: ['DRAMA','ROMANCE','COMEDY','CRIME'], HABIT_STREAMERS: ['MYSTERY','CRIME','COMEDY','DRAMA'],
};
const genres = CINEMA_PERSONA_GENRES;
const castUnique = <T extends {personId: string; roleWeight: number; characterIds:string[]}>(cast: readonly T[]): T[] => {
    const result = new Map<string,T>();
    for (const person of cast) {
        const old=result.get(person.personId),strongest=old && old.roleWeight>=person.roleWeight?old:person;
        result.set(person.personId,{...strongest,characterIds:[...new Set([...(old?.characterIds || []),...person.characterIds])].sort()});
    }
    return [...result.values()].sort((a,b)=>a.personId.localeCompare(b.personId));
};
const evidence = (input: CinemaWeekInput): CinemaViewingEvidence[] => {
    const rows = [...(input.history || [])];
    for (const title of input.marketState?.titles || []) for (const cell of title.cells) {
        const total = cell.seenBands.reduce((n,b)=>n+b.people,0);
        if (total) rows.push({id:`state:${title.titleId}:${cell.cohortId}`,titleId:title.titleId,ownerId:title.ownerId,cohortId:cell.cohortId,
            people:total,satisfaction:cell.seenBands.reduce((n,b)=>n+b.people*b.satisfaction,0)/total,
            absoluteWeek:Math.max(...cell.seenBands.map(b=>b.lastViewedWeek)),cast:title.cast,universeId:title.universeId,source:'THEATER'});
    }
    // State and read-only imported history can describe the same people. Use a conservative maximum,
    // never sum historical starts, subscriptions or duplicate credits into new individuals.
    const unique = new Map<string,CinemaViewingEvidence>();
    for (const row of rows.filter(r=>r.absoluteWeek < input.absoluteWeek).sort((a,b)=>a.id.localeCompare(b.id))) {
        const key = `${row.titleId}:${row.cohortId}`;
        if (!unique.has(key) || unique.get(key)!.people < row.people) unique.set(key,row);
    }
    return [...unique.values()];
};

/** Exposes the proposed awareness state for the shadow allocator. Never persists or charges it. */
export const buildCinemaAudienceSnapshot = (input: CinemaWeekInput): {choices: CinemaChoiceRequest[]; titles: CinemaTitleAudienceState[]} => {
    const choices: CinemaChoiceRequest[] = [], states: CinemaTitleAudienceState[] = [], history = evidence(input);
    const alternativesByCohort=new Map<string,NonNullable<CinemaWeekInput['streamingAlternatives']>[number][]>();
    for(const a of input.streamingAlternatives||[]){const rows=alternativesByCohort.get(a.cohortId)||[];rows.push(a);alternativesByCohort.set(a.cohortId,rows)}
    const historyByCohort=new Map<string,CinemaViewingEvidence[]>();
    for(const h of history){const list=historyByCohort.get(h.cohortId)||[];list.push(h);historyByCohort.set(h.cohortId,list)}
    const affinitiesByCohort=new Map<string,NonNullable<CinemaWeekInput['marketState']>['affinities']>();
    for(const affinity of input.marketState?.affinities||[]){
        const local=affinitiesByCohort.get(affinity.cohortId)||[];local.push(affinity);affinitiesByCohort.set(affinity.cohortId,local);
    }
    const pools=new Map(input.supply?.pools.map(p=>[p.id,p]));
    for (const title of [...input.titles].sort((a,b)=>a.id.localeCompare(b.id))) {
        const facts = title.market;
        const prior = input.marketState?.titles.find(t=>t.titleId===title.id);
        const priorCells=new Map(prior?.cells.map(c=>[c.cohortId,c]));
        const titleOffers=(input.supply?.offers || []).filter(o=>o.titleId===title.id).map(o=>pools.get(o.poolId)!).filter(Boolean);
        const offersByCountry=new Map<string,typeof titleOffers>();
        for(const offer of titleOffers){const local=offersByCountry.get(offer.countryId)||[];local.push(offer);offersByCountry.set(offer.countryId,local)}
        const exposure = buildCinemaExposure({titleId:title.id,absoluteWeek:input.absoluteWeek,cast:castUnique(title.cast),
            studio:{releasedTitleCount:0,prestige:0},storyAttention:title.exposure?.storyAttention || 0,musicAttention:title.exposure?.musicAttention || 0,
            cohorts:input.cohorts.map(c=>({...c,priorAwarePeople:priorCells.get(c.id)?.awarePeople || 0})),
            events:title.exposure?.events || [],appliedEventIds:prior?.appliedExposureIds || []});
        const awarenessIndex=new Map(exposure.cohorts.map(c=>[c.cohortId,c.awarePeople]));
        const next: CinemaTitleAudienceState = {titleId:title.id,ownerId:title.owner.id,cast:structuredClone(castUnique(title.cast)),universeId:facts?.universeId,
            releaseWeek:facts?.releaseWeek ?? input.absoluteWeek,appliedExposureIds:exposure.appliedEventIds,cells:[]};
        for (const cohort of [...input.cohorts].sort((a,b)=>a.id.localeCompare(b.id))) {
            const old = priorCells.get(cohort.id);
            const seenBands = structuredClone(old?.seenBands || []);
            const seen = Math.min(cohort.people,seenBands.reduce((n,b)=>n+b.people,0));
            let aware = Math.min(cohort.people,Math.max(seen,awarenessIndex.get(cohort.id) || 0));
            const m = cohort.market;
            const localFit = facts && m ? facts.languages.some(l=>m.languages.map(normalizeStreamingLanguageId).includes(normalizeStreamingLanguageId(l))) ? 1 : .3 : 0;
            const eligible = m ? Math.min(cohort.people,m.eligiblePeople) : 0;
            const pending=old?.pendingLocalFootfall;
            const applyLocal=pending && pending.absoluteWeek<input.absoluteWeek && pending.absoluteWeek>(old?.lastAppliedLocalFootfallWeek ?? -1);
            const qualifiedLocal=applyLocal?Math.floor(pending.otherFilmAdmissions*CINEMA_EXPOSURE_PROFILE.localFootfallDiscovery):0;
            const localDiscovery=people((cohort.people-aware)*-Math.expm1(-qualifiedLocal/Math.max(1,cohort.people)));
            aware+=localDiscovery;
            const cell = {cohortId:cohort.id,awarePeople:aware,seenBands,deferredPeople:0,
                pendingLocalFootfall:applyLocal?undefined:structuredClone(pending),lastAppliedLocalFootfallWeek:applyLocal?pending.absoluteWeek:old?.lastAppliedLocalFootfallWeek,lastDiscoveryWeek:old?.lastDiscoveryWeek ?? -1,lastChoiceWeek:input.absoluteWeek,discoveryContactsUsed:old?.discoveryContactsUsed || 0};
            next.cells.push(cell);
            if (!facts || !m || facts.releaseWeek > input.absoluteWeek) continue;
            const own = historyByCohort.get(cohort.id)||[];
            // Word of mouth is delayed, exposure-backed and saturates net-new reachable contacts.
            const satisfied = seenBands.reduce((n,b)=>n+b.people*fraction(Math.max(0,b.satisfaction-55)/.45),0);
            const remainingContacts = Math.max(0,people(satisfied*P.contactRatePerSatisfiedViewer)-(old?.discoveryContactsUsed || 0));
            const contacts = old && old.lastDiscoveryWeek<input.absoluteWeek ? Math.min(remainingContacts,Math.ceil(remainingContacts*P.contactOverlap)) : 0;
            const discovery = people((cohort.people-aware)*-Math.expm1(-contacts*localFit/Math.max(1,cohort.people)));
            aware += discovery; cell.awarePeople=aware;
            if (contacts) {cell.lastDiscoveryWeek=input.absoluteWeek;cell.discoveryContactsUsed+=contacts}
            const matching = own.filter(h=>h.titleId!==title.id && h.universeId && h.universeId===facts.universeId);
            const cohortAffinities=affinitiesByCohort.get(cohort.id)||[];
            const compact=cohortAffinities.filter(a=>a.kind==='UNIVERSE' && a.id===facts.universeId);
            const familiarity = Math.max(0,...matching.map(h=>clamp(h.people/Math.max(1,cohort.people))*fraction(h.satisfaction)),
                ...compact.map(a=>clamp(a.people/Math.max(1,cohort.people))*fraction(a.strength)));
            // Overlapping fan segments use a maximum reach. Their affection follows ALL actual
            // delivered experiences, so repeated disappointment can erode a previous favorite.
            const attachmentFor = (kind:'ACTOR'|'STUDIO', id:string, currentWeight:number):number => {
                const experienced=own.flatMap(h=>{
                    const oldWeight=kind==='STUDIO' ? (h.ownerId===id?1:0) : Math.max(0,...h.cast.filter(c=>c.personId===id).map(c=>c.roleWeight));
                    return oldWeight>0 ? [{people:h.people,quality:h.satisfaction,weight:Math.min(currentWeight,oldWeight)}] : [];
                });
                for(const a of cohortAffinities) if(a.kind===kind && a.id===id)
                    experienced.push({people:a.people,quality:a.strength,weight:currentWeight});
                const weight=experienced.reduce((n,e)=>n+e.people*e.weight,0);
                const quality=weight ? experienced.reduce((n,e)=>n+e.people*e.weight*e.quality,0)/weight : 0;
                const reach=Math.max(0,...experienced.map(e=>e.people*e.weight));
                return clamp(reach/Math.max(1,cohort.people))*fraction(Math.max(0,quality-50)*2);
            };
            const attachment=clamp(Math.max(attachmentFor('STUDIO',title.owner.id,.35),...castUnique(title.cast).map(c=>attachmentFor('ACTOR',c.personId,c.roleWeight))));
            const returning = Math.max(.1,...matching.flatMap(h=>h.cast.flatMap(p=>{
                const character=p.characterIds.filter(id=>facts.returningCharacterIds?.includes(id));
                return castUnique(title.cast).filter(c=>c.characterIds.some(id=>character.includes(id))).map(c=>Math.min(c.roleWeight,p.roleWeight));
            })));
            // An unviewed film's final payoff is not public opening knowledge.
            const expectedPayoff=seen ? facts.payoff : title.delivery.estimatedQuality ?? 55;
            const buildup = familiarity * fraction(expectedPayoff) * returning;
            // Cadence fatigue applied once, after overlap; no precursor-count gate.
            const recent = matching.filter(h=>input.absoluteWeek-h.absoluteWeek < 8).length;
            const fatigue = 1/(1+Math.max(0,recent-1)*.1);
            const fit = (genres[m.persona]?.includes(title.genre) ? 1 : .7) * localFit;
            const quality = input.knowledge==='FORECAST' ? title.delivery.estimatedQuality ?? 55 : title.delivery.deliveredQuality ?? title.delivery.estimatedQuality ?? 55;
            const satisfaction = Math.round(clamp(fraction(quality)*.85 + fit*.15 - Math.max(0,(title.exposure?.attentionPotential || 0)-quality)/500)*100);
            const offers = offersByCountry.get(cohort.countryId)||[];
            const price = offers.length ? Math.min(...offers.map(p=>p.ticketPriceCents)) : 0;
            const accessible = facts.countryIds.includes(cohort.countryId) && offers.length>0;
            const minutes = Math.ceil(facts.runtimeMinutes+m.travelMinutes);
            const weeklyWallet = m.monthlyCinemaBudgetCents*12/52;
            const perPersonWallet = weeklyWallet/Math.max(1,eligible);
            const affordability = price>0 ? clamp(perPersonWallet/price,.03,1) : 0;
            const timeFit = clamp(m.weeklyLeisureMinutes/Math.max(1,eligible*minutes));
            // Language is a preference in utility, not a second loss of physical access.
            // Keeping it here too squared the foreign-language preference (30% -> 9%).
            const reachable = accessible ? people(Math.min(aware-seen,(cohort.people-seen)*eligible/Math.max(1,cohort.people))) : 0;
            const observedSatisfaction=seen ? seenBands.reduce((n,b)=>n+b.people*b.satisfaction,0)/seen/100 : 0;
            // Reviews inform the reached audience after a small real sample.
            // Requiring 3% of an entire country/persona to attend hid a weak
            // response from almost every remaining viewer in large markets.
            const responseConfidence=clamp(seen/Math.max(50,aware*.01));
            const feedback=seen ? 1+(.05+observedSatisfaction*1.2-1)*responseConfidence : 1;
            const utility = clamp(fraction(m.interest)*fit*(.65+.35*fraction(facts.urgency))
                *(1+Math.min(P.maxFavoriteLift,attachment*P.favoriteLift)+buildup*.5)*fatigue*feedback
                *(facts.universeId ? .65+.35*fraction(seen?facts.accessibility:title.delivery.estimatedQuality??55)+familiarity*.15 : 1));
            const home=cinemaHomeChoice({absoluteWeek:input.absoluteWeek,streamingAlternatives:alternativesByCohort.get(cohort.id)},cohort,title.genre,facts);
            const releaseAge = Math.max(0,input.absoluteWeek-facts.releaseWeek-P.openingInterestGraceWeeks);
            // A real recommendation can keep an already-aware viewer interested.
            // Final quality alone cannot buy staying power before anyone has watched.
            // Marketing/discovery cannot dilute an already earned review sample.
            // Scale the sample to the paying market, with bounded statistical needs.
            const holdConfidence=clamp(seen/Math.max(50,Math.min(1000,eligible*.01)));
            const excellentResponse=clamp((observedSatisfaction-.75)/.25)*holdConfidence;
            const firstHalfLife=P.firstInterestHalfLifeWeeks*(1+P.excellentResponseHold*excellentResponse**2*fraction(facts.urgency));
            const firstTiming = 2 ** (-releaseAge/firstHalfLife);
            const repeatTiming = 2 ** (-releaseAge/P.repeatInterestHalfLifeWeeks);
            // New recommendations carry fresh urgency; older unconverted awareness fades.
            const freshReach = Math.min(reachable,discovery+localDiscovery);
            const timedReach = (reachable-freshReach)*firstTiming+freshReach;
            // Existing fans notice a reached release more readily and plan a visit.
            // This is a subset of real awareness/eligibility, never an extra audience.
            // Conservatively subtract all current viewers before offering loyal first visits.
            const loyalUnseen=Math.max(0,cohort.people*Math.max(attachment,buildup)-seen);
            const noticed=1-(1-clamp(aware/Math.max(1,cohort.people)))**P.loyalAttentionOpportunities;
            const loyalAware=Math.min(Math.max(0,aware-seen),loyalUnseen*noticed);
            const loyalReach=timedReach*clamp(loyalAware/Math.max(1,aware-seen));
            const interest = people(utility*(timedReach*P.firstWeeklyIntent+loyalReach*(P.loyalWeeklyIntent-P.firstWeeklyIntent)));
            const buyShare = clamp(affordability**(.25+fraction(m.priceSensitivity)*.5)*timeFit*(1-home.share));
            const first = people(interest*buyShare);
            const repeatEligible = accessible ? people(seenBands.filter(b=>b.satisfaction>55).reduce((n,b)=>n+b.people,0)*eligible/Math.max(1,cohort.people)*localFit) : 0;
            const repeat = people(Math.min(repeatEligible,seenBands.reduce((n,b)=>n + b.people*fraction(Math.max(0,b.satisfaction-55)/.45)
                / (1+b.repeatAdmissions/Math.max(1,b.people)*Math.exp(-Math.max(0,input.absoluteWeek-b.lastViewedWeek)/P.recentRepeatHalfLifeWeeks)),0))
                *P.repeatWeeklyIntent*(.5+attachment*.5)*buyShare*repeatTiming);
            const common = {cohortId:cohort.id,titleId:title.id,utility,priceCents:price,minutesPerVisit:minutes,awarePeople:aware,
                reachableUnseenPeople:reachable,repeatEligiblePeople:repeatEligible,satisfaction,attachment,universeFamiliarity:familiarity,discoveryPeople:discovery,localDiscoveryPeople:localDiscovery};
            choices.push({...common,kind:'FIRST',requestedAdmissions:first,interestedPeople:interest,reasons:[]});
            choices.push({...common,kind:'REPEAT',requestedAdmissions:repeat,interestedPeople:repeatEligible,reasons:[]});
            const carried = (old?.deferredPeople || 0)*P.deferredRetentionPerWeek**Math.max(1,input.absoluteWeek-(old?.lastChoiceWeek ?? input.marketState?.lastProcessedAbsoluteWeek ?? input.absoluteWeek-1));
            const deferred = Math.min(Math.max(0,aware-seen-first),Math.max(interest-first,people(carried)));
            cell.deferredPeople=deferred;
            choices.push({...common,kind:'DEFER',requestedAdmissions:0,interestedPeople:deferred,reasons:[...(home.wait?['KNOWN_STREAMING_WINDOW']:[]),...(home.other?['RELEVANT_STREAMING_ALTERNATIVE']:[]),'AFFORDABILITY_TIME_OR_OUTSIDE_CHOICE']});
        }
        states.push(next);
    }
    return {choices, titles:states};
};
export const buildCinemaChoices = (input: CinemaWeekInput): CinemaChoiceRequest[] => buildCinemaAudienceSnapshot(input).choices;
