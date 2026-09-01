import type { NewsItem, Player, WorldState } from '../../types';
import { processStreamingPlatformEcosystemTurn } from '../streamingPlatformEcosystemTurn';
import { processPlatformAiWorldTurn } from './platformAiTurn';

export interface StreamingIndustryWeeklyTurnResult {
    world: WorldState;
    news: NewsItem[];
    logs: string[];
    absoluteWeek: number;
}

/**
 * Thin orchestration seam for the rival streaming industry. Domain services
 * remain responsible for every financial, production, rights, and audience
 * mutation; this function only gives them one explicit entered game week.
 */
export const processStreamingIndustryWorldWeek = (
    player: Player,
    world: WorldState,
    absoluteWeek: number,
): StreamingIndustryWeeklyTurnResult => {
    const playerAtInputWorld: Player = { ...player, world };
    const platformAi = processPlatformAiWorldTurn(playerAtInputWorld, world, absoluteWeek);
    const playerAtPlatformWorld: Player = { ...player, world: platformAi.world };
    const ecosystem = processStreamingPlatformEcosystemTurn(
        playerAtPlatformWorld,
        platformAi.world,
        absoluteWeek,
    );

    return {
        world: ecosystem.world,
        news: [...platformAi.news, ...ecosystem.news],
        logs: [...platformAi.logs, ...ecosystem.logs],
        absoluteWeek,
    };
};
