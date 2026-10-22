import type { Player, ProjectDetails } from '../../types';
import { getAbsoluteWeek } from '../legacyLogic';
import { buildCinemaKnownInputs, commitCinemaReleaseExposure } from './boxOfficeExposureAdapters';
import { readCinemaWorldAudience } from './boxOfficeAudienceAdapters';
import { migrateCinemaState } from './boxOfficeMigration';
import { buildCinemaWeekInput, cinemaIndustryProjectDetails, normalizeLiveTitle, prepareCinemaAudienceWorld } from './boxOfficeWeek';
import { forecastCinemaWeek } from './boxOfficeForecast';
/** Private hypothetical release. Uses current public competition; never persists campaign, migration or audience changes. */
export const forecastCinemaProject=(player:Player,project:ProjectDetails,titleId:string,releaseWeek?:number)=>{
    if(project.releaseRegionIds && project.releaseRegionIds.length===0)throw new Error('Select at least one cinema region before calculating.');
    const now=getAbsoluteWeek(player.age,player.currentWeek);
    const migrated=migrateCinemaState(player,now);
    if(migrated.status==='REJECTED')throw new Error('This save needs a compatible cinema version.');
    const week=Math.max(releaseWeek||now+1,(migrated.player.world.cinemaMarket?.lastProcessedAbsoluteWeek||now)+1);
    const prepared=prepareCinemaAudienceWorld(migrated.player,week),world=readCinemaWorldAudience(prepared);
    const input=buildCinemaWeekInput(prepared,week);
    // A draft is not yet a live candidate, but its forecast still faces the same home alternatives.
    input.streamingAlternatives=world.streamingAlternatives;
    // Draft campaign is an explicit hypothetical, using exactly the confirmation adapter and costs.
    const draft=commitCinemaReleaseExposure({player:prepared,project,titleId,absoluteWeek:now,allocations:project.marketingChannelAllocations||{}});
    const title=normalizeLiveTitle(prepared,titleId,draft,week,'PLAYER_STUDIO',world);
    input.titles=[...input.titles.filter(t=>t.id!==titleId),title];
    const known={cohorts:input.cohorts,titles:input.titles.map(t=>{
        const source=t.id===titleId?draft:prepared.activeReleases.find(r=>r.id===t.id)?.projectDetails
            || (()=>{const p=prepared.world.projects.find(p=>p.id===t.id);return p?cinemaIndustryProjectDetails(prepared,p):draft})();
        const visible=buildCinemaKnownInputs(prepared,source,t.id).titles[0];
        // Live payoff uses delivered quality; forecast payoff/accessibility use only visible estimates.
        return {...visible,market:t.market?{...t.market,payoff:visible.delivery.estimatedQuality||55,accessibility:visible.delivery.scriptQuality}:undefined};
    })};
    return forecastCinemaWeek(input,known);
};
