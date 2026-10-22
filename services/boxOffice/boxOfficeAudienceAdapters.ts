import type { Player } from '../../types';
import { CINEMA_ROLE_WEIGHTS } from './boxOfficeProfiles';
import { readCinemaStreamingAlternatives } from './boxOfficeAlternativeAdapters';
import { getAbsoluteWeek } from '../legacyLogic';
import type { CinemaCreditedPerson, CinemaViewingEvidence, CinemaWeekInput } from './boxOfficeTypes';

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
    const history: CinemaViewingEvidence[]=[];
    const viewing=player.world.worldStreamingViewing;
    for (const country of Object.values(viewing?.countries || {})) for (const observed of country.titlePerformance) {
        if (observed.viewingAccounts<=0 || observed.estimatedViewers<=0) continue;
        const archived=player.pastProjects.find(p=>p.id===observed.projectId);
        const npc=player.world.projects.find(p=>p.id===observed.projectId);
        if (!archived && !npc) continue; // No title-name joins or invented universe lineage.
        const production=Object.values(player.world.industryProductions || {}).find(p=>p.canonicalProjectId===observed.projectId);
        const cast: CinemaCreditedPerson[]=archived ? (archived.castList || []).filter(p=>p.type!=='DIRECTOR').map(p=>({
            personId:p.isPlayer?'PLAYER_SELF':p.actorId || p.npcId || p.id,name:p.name,roleType:p.roleType || 'SUPPORTING',
            roleWeight:CINEMA_ROLE_WEIGHTS[p.roleType || 'SUPPORTING'],fame:0,isPlayer:!!p.isPlayer,characterIds:p.characterId?[p.characterId]:[],
        })) : npc?.leadActorId ? [{personId:npc.leadActorId,name:npc.leadActorName,roleType:'LEAD',roleWeight:1,fame:0,isPlayer:false,characterIds:[]}] : [];
        // WE6's accounts/estimated viewers are weekly events, not a lifetime unique-person ledger.
        // Half of the smaller observed count is an explicitly conservative catch-up estimate.
        const countryPeople=cohorts.filter(c=>c.countryId===country.countryId).reduce((n,c)=>n+c.people,0);
        const observedPeople=Math.min(countryPeople,Math.floor(Math.min(observed.viewingAccounts,observed.estimatedViewers)*.5));
        const measured=Object.values(viewing?.platforms || {}).flatMap(p=>p.titlePerformance).find(p=>p.projectId===observed.projectId);
        for (const cohort of cohorts.filter(c=>c.countryId===country.countryId)) {
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
    for(const [titleId,seen] of Object.entries(player.world.cinemaMarket?.streamingSeen||{})){
        const archived=player.pastProjects.find(p=>p.id===titleId),active=player.activeReleases.find(p=>p.id===titleId);
        const npc=player.world.projects.find(p=>p.id===titleId),details=active?.projectDetails;
        if(!archived&&!active&&!npc)continue;
        const cast: CinemaCreditedPerson[]=(details?.castList||archived?.castList||[]).filter(p=>p.type!=='DIRECTOR').map(p=>({personId:p.isPlayer?'PLAYER_SELF':p.actorId||p.npcId||p.id,
            name:p.name,roleType:p.roleType||'SUPPORTING',roleWeight:CINEMA_ROLE_WEIGHTS[p.roleType||'SUPPORTING'],fame:0,isPlayer:!!p.isPlayer,characterIds:p.characterId?[p.characterId]:[]}));
        if(!cast.length&&npc?.leadActorId)cast.push({personId:npc.leadActorId,name:npc.leadActorName,roleType:'LEAD',roleWeight:1,fame:0,isPlayer:false,characterIds:[]});
        for(const [countryId,accounts] of Object.entries(seen.countries)){
            const local=cohorts.filter(c=>c.countryId===countryId),population=local.reduce((n,c)=>n+c.people,0);
            for(const cohort of local){
                const count=Math.min(cohort.people,Math.floor(accounts*.5*cohort.people/Math.max(1,population)));if(!count)continue;
                const old=history.find(h=>h.titleId===titleId&&h.cohortId===cohort.id);
                if(old){old.people=Math.max(old.people,count);continue}
                history.push({id:`cinema-streaming:${titleId}:${cohort.id}`,titleId,ownerId:details?.studioId||archived?.studioId||npc!.studioId,cohortId:cohort.id,
                    people:count,satisfaction:Math.max(0,Math.min(100,(active?.imdbRating||archived?.rating||npc?.rating||6)*10)),absoluteWeek:seen.lastWeek,
                    cast,universeId:details?.universeId||archived?.universeId||npc?.universeId,source:'STREAMING_ESTIMATE'});
            }
        }
    }
    const week=player.world.worldPopulation?.lastProcessedAbsoluteWeek??getAbsoluteWeek(player.age,player.currentWeek);
    return {cohorts,countries,history:history.sort((a,b)=>a.id.localeCompare(b.id)),streamingAlternatives:options.includeStreamingAlternatives===false?[]:readCinemaStreamingAlternatives(player,week,cohorts)};
};
