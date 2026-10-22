import { CINEMA_MARKET_TUNING_VERSION } from '../../services/boxOffice/boxOfficeProfiles';
import assert from 'node:assert/strict';
import { createWorldPopulationState } from '../../services/worldEconomy/worldPopulation';
import { createWorldAudienceEconomyState } from '../../services/worldEconomy/worldAudienceCohorts';
import { createWorldAudienceParticipationState } from '../../services/worldEconomy/worldAudienceParticipation';
import { readCinemaWorldAudience } from '../../services/boxOffice/boxOfficeAudienceAdapters';
import { normalizeCinemaTitle } from '../../services/boxOffice/boxOfficeInputs';
import { simulateCinemaWeek } from '../../services/boxOffice/boxOfficeMarket';
import { CINEMA_CHAINS } from '../../services/cinemaChains';
import type { CinemaWeekInput } from '../../services/boxOffice/boxOfficeTypes';
import { makeCinemaFixture, makeCinemaMarketFixture } from './boxOfficeScenarios';

/** Test-only entry: fresh authored world, canonical adapters, all owners, no save/load or real player. */
export const runCinemaWorldShadowAudit = (seed=41) => {
    const {player,project}=makeCinemaFixture(seed),absoluteWeek=1000;
    const pop=createWorldPopulationState(absoluteWeek),audience=createWorldAudienceEconomyState(pop,absoluteWeek);
    player.world.worldPopulation=pop;player.world.worldAudienceEconomy=audience;
    player.world.worldAudienceParticipation=createWorldAudienceParticipationState(pop,audience,absoluteWeek);
    const beforePlayer=structuredClone(player);
    const world=readCinemaWorldAudience(player);
    const countries=world.countries!.map(c=>c.id);
    const titles=(['PLAYER_STUDIO','ACCEPTED_ROLE','NPC_STUDIO'] as const).map((route,i)=>{
        const id=`world-film-${i}`,title=normalizeCinemaTitle({player,project,titleId:id,owner:{id:`studio-${i}`,route}});
        return {...title,exposure:{version:1 as const,attentionBasis:'PACKAGE' as const,attentionPotential:75,events:[{id:`world-press-${i}`,titleId:id,absoluteWeek:999,kind:'PROMOTION' as const,channel:'CONTROLLED_WORLD_PRESS',impressions:2_000_000_000}]},
            market:{...makeCinemaMarketFixture().titles[0].market!,universeId:undefined,languages:[project.originalLanguageId || 'english'],releaseWeek:absoluteWeek,countryIds:countries,chainIds:CINEMA_CHAINS.map(c=>c.id)}};
    });
    const input:CinemaWeekInput={...world,absoluteWeek,seed,tuningVersion:CINEMA_MARKET_TUNING_VERSION,knowledge:'OBSERVED',titles};
    const before=structuredClone(input),start=performance.now();
    const result=simulateCinemaWeek(input),elapsedMs=Math.round((performance.now()-start)*100)/100;
    assert.deepEqual(input,before,'shadow may not mutate its inputs');
    assert.deepEqual(player,beforePlayer,'canonical preparation and shadow may not mutate player, world or wallets');
    const diagnostics={countries:world.countries!.length,cohorts:world.cohorts.length,titleCount:titles.length,poolCount:result.supply.length,
        admissions:result.titles.reduce((n,t)=>n+t.firstAdmissions+t.repeatAdmissions,0),grossCents:result.titles.reduce((n,t)=>n+t.grossCents,0),elapsedMs};
    return {input,result,diagnostics};
};
