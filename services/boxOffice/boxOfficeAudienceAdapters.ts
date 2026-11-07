import type { Player } from '../../types';
import { CINEMA_ROLE_WEIGHTS } from './boxOfficeProfiles';
import { readCinemaStreamingAlternatives } from './boxOfficeAlternativeAdapters';
import { getAbsoluteWeek } from '../legacyLogic';
import type { CinemaCreditedPerson, CinemaViewingEvidence, CinemaWeekInput } from './boxOfficeTypes';

/** Array.find semantics: duplicate IDs always retain the first observed entry. */
const firstIndex = <T>(items: readonly T[], key: (item: T) => string | undefined): Map<string | undefined,T> => {
    const index=new Map<string | undefined,T>();
    for(const item of items){if(item===null||item===undefined)continue;const id=key(item);if(!index.has(id))index.set(id,item)}
    return index;
};

/** Read-only boundary: participation owns wallet partitions and eligibility. Missing state stays unknown. */
export const readCinemaWorldAudience = (player: Player,options:{includeStreamingAlternatives?:boolean}={}): Pick<CinemaWeekInput,'cohorts'|'countries'|'history'|'streamingAlternatives'> => {
    const countries = Object.values(player.world.worldPopulation?.countries || {}).map(c=>({id:c.id,regionId:c.regionId,population:c.population,
        cinemaAccess:c.cinemaAccessPercent,purchasingPower:c.macro.purchasingPowerIndex,inflation:c.macro.inflationPressure,languages:[...c.languages]}));
    const cohorts = Object.values(player.world.worldAudienceEconomy?.countries || {}).flatMap(country=>country.cohorts.map(c=>{
        const overlay=player.world.worldAudienceParticipation?.countries[country.id]?.cohorts.find(p=>p.cohortId===c.id);
        const pop=player.world.worldPopulation?.countries[country.id];
        const eligible=Math.min(c.people,Math.floor((overlay ? overlay.cinemaOnlyHouseholds+overlay.dualParticipantHouseholds : 0)*c.people/Math.max(1,c.households)));
        return {id:`${country.id}:${c.id}`,countryId:country.id,people:c.people,market:{eligiblePeople:eligible,
            monthlyCinemaBudgetCents:(overlay?.totalMonthlyCinemaBudget || 0)*100,
            // Cinema leisure envelope; does not appropriate the separate streaming envelope.
            weeklyLeisureMinutes:eligible*(c.lifeStageId==='FAMILY'?150:c.lifeStageId==='ADULT'?180:240),
            interest:overlay?.cinemaInterestIndex || 0,priceSensitivity:c.priceSensitivityIndex,persona:c.primaryPersonaId,
            languages:[...(pop?.languages || [])],travelMinutes:Math.round(25+(100-(pop?.urbanPercent || 0))*.7)}};
    }));
    const cohortsByCountry=new Map<string,typeof cohorts>();
    for(const cohort of cohorts){const local=cohortsByCountry.get(cohort.countryId)||[];local.push(cohort);cohortsByCountry.set(cohort.countryId,local)}
    const peopleByCountry=new Map([...cohortsByCountry].map(([id,local])=>[id,local.reduce((n,c)=>n+c.people,0)]));
    const archivedById=firstIndex(player.pastProjects||[],p=>p.id),activeById=firstIndex(player.activeReleases||[],p=>p.id);
    const projectsById=firstIndex(player.world.projects||[],p=>p.id),productionsById=firstIndex(Object.values(player.world.industryProductions||{}),p=>p.canonicalProjectId);
    const history: CinemaViewingEvidence[]=[];
    const viewing=player.world.worldStreamingViewing;
    const measuredById=firstIndex(Object.values(viewing?.platforms||{}).flatMap(p=>p.titlePerformance),p=>p.projectId);
    for (const country of Object.values(viewing?.countries || {})) for (const observed of country.titlePerformance) {
        if (observed.viewingAccounts<=0 || observed.estimatedViewers<=0) continue;
        const archived=archivedById.get(observed.projectId);
        const npc=projectsById.get(observed.projectId);
        if (!archived && !npc) continue; // No title-name joins or invented universe lineage.
        const production=productionsById.get(observed.projectId);
        const cast: CinemaCreditedPerson[]=archived ? (archived.castList || []).filter(p=>p.type!=='DIRECTOR').map(p=>({
            personId:p.isPlayer?'PLAYER_SELF':p.actorId || p.npcId || p.id,name:p.name,roleType:p.roleType || 'SUPPORTING',
            roleWeight:CINEMA_ROLE_WEIGHTS[p.roleType || 'SUPPORTING'],fame:0,isPlayer:!!p.isPlayer,characterIds:p.characterId?[p.characterId]:[],
        })) : npc?.leadActorId ? [{personId:npc.leadActorId,name:npc.leadActorName,roleType:'LEAD',roleWeight:1,fame:0,isPlayer:false,characterIds:[]}] : [];
        // WE6's accounts/estimated viewers are weekly events, not a lifetime unique-person ledger.
        // Half of the smaller observed count is an explicitly conservative catch-up estimate.
        const countryPeople=peopleByCountry.get(country.countryId)||0;
        const observedPeople=Math.min(countryPeople,Math.floor(Math.min(observed.viewingAccounts,observed.estimatedViewers)*.5));
        const measured=measuredById.get(observed.projectId);
        for (const cohort of cohortsByCountry.get(country.countryId)||[]) {
            const count=Math.floor(observedPeople*cohort.people/Math.max(1,countryPeople));
            if (!count) continue;
            history.push({id:`we6:${viewing!.lastProcessedAbsoluteWeek}:${observed.projectId}:${cohort.id}`,titleId:observed.projectId,
                ownerId:archived?.studioId || npc!.studioId,cohortId:cohort.id,people:count,
                satisfaction:Math.max(0,Math.min(100,measured?.satisfactionScore ?? observed.completionRate*100)),
                absoluteWeek:viewing!.lastProcessedAbsoluteWeek,cast,universeId:archived?.universeId || npc?.universeId || production?.universeId,
                source:'STREAMING_ESTIMATE'});
        }
    }
    // New cinema-linked rival playback carries observed, conservative catch-up evidence too.
    // Maximum weekly homes are a lower bound; repeated starts and overlapping platforms are never summed as unique people.
    const historyByTitle=new Map<string,Map<string,CinemaViewingEvidence>>();
    for(const row of history){const local=historyByTitle.get(row.titleId)||new Map<string,CinemaViewingEvidence>();if(!local.has(row.cohortId))local.set(row.cohortId,row);historyByTitle.set(row.titleId,local)}
    for(const [titleId,seen] of Object.entries(player.world.cinemaMarket?.streamingSeen||{})){
        const archived=archivedById.get(titleId),active=activeById.get(titleId);
        const npc=projectsById.get(titleId),details=active?.projectDetails;
        if(!archived&&!active&&!npc)continue;
        const cast: CinemaCreditedPerson[]=(details?.castList||archived?.castList||[]).filter(p=>p.type!=='DIRECTOR').map(p=>({personId:p.isPlayer?'PLAYER_SELF':p.actorId||p.npcId||p.id,
            name:p.name,roleType:p.roleType||'SUPPORTING',roleWeight:CINEMA_ROLE_WEIGHTS[p.roleType||'SUPPORTING'],fame:0,isPlayer:!!p.isPlayer,characterIds:p.characterId?[p.characterId]:[]}));
        if(!cast.length&&npc?.leadActorId)cast.push({personId:npc.leadActorId,name:npc.leadActorName,roleType:'LEAD',roleWeight:1,fame:0,isPlayer:false,characterIds:[]});
        for(const [countryId,accounts] of Object.entries(seen.countries)){
            const local=cohortsByCountry.get(countryId)||[],population=peopleByCountry.get(countryId)||0;
            for(const cohort of local){
                const count=Math.min(cohort.people,Math.floor(accounts*.5*cohort.people/Math.max(1,population)));if(!count)continue;
                const old=historyByTitle.get(titleId)?.get(cohort.id);
                if(old){old.people=Math.max(old.people,count);continue}
                history.push({id:`cinema-streaming:${titleId}:${cohort.id}`,titleId,ownerId:details?.studioId||archived?.studioId||npc!.studioId,cohortId:cohort.id,
                    people:count,satisfaction:Math.max(0,Math.min(100,(active?.imdbRating||archived?.rating||npc?.rating||6)*10)),absoluteWeek:seen.lastWeek,
                    cast,universeId:details?.universeId||archived?.universeId||npc?.universeId,source:'STREAMING_ESTIMATE'});
                const titleHistory=historyByTitle.get(titleId)||new Map<string,CinemaViewingEvidence>();titleHistory.set(cohort.id,history[history.length-1]);historyByTitle.set(titleId,titleHistory);
            }
        }
    }
    const week=player.world.worldPopulation?.lastProcessedAbsoluteWeek??getAbsoluteWeek(player.age,player.currentWeek);
    return {cohorts,countries,history:history.sort((a,b)=>a.id.localeCompare(b.id)),streamingAlternatives:options.includeStreamingAlternatives===false?[]:readCinemaStreamingAlternatives(player,week,cohorts)};
};
