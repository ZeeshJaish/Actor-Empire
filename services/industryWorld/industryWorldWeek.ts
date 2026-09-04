import type { NewsItem, Player, WorldState, XPost } from '../../types';
import { processStreamingIndustryWorldWeek } from '../platformAi';
import { processStudioAiWeek } from '../studioAi';
import { normalizeIndustryEventLedger } from './industryEventLedger';
import { appendIndustryEventFacts } from './industryEventLedger';
import { collectIndustryEventFacts } from './industryEventCollectors';
import { projectIndustryEvents } from './industryPresentation';
import { getCanonicalScheduledRivals } from './publicIndustryProjection';

export type IndustryWorldExecutionStage =
    | 'PLATFORM_AI'
    | 'STREAMING_ECOSYSTEM'
    | 'STUDIO_AI'
    | 'PRESENTATION';

export interface IndustryWorldWeekResult {
    player: Player;
    world: WorldState;
    news: NewsItem[];
    socialPosts: XPost[];
    logs: string[];
    absoluteWeek: number;
    processed: boolean;
    executionOrder: IndustryWorldExecutionStage[];
}

/**
 * The single entered-week seam for compact rival-company simulation.
 * Domain services still own every mutation; this coordinator only establishes
 * deterministic order and a saved exactly-once checkpoint.
 */
export const processIndustryWorldWeek = (
    player: Player,
    world: WorldState,
    absoluteWeek: number,
): IndustryWorldWeekResult => {
    const ledger = normalizeIndustryEventLedger(world.industryEvents);
    if (ledger.lastProcessedAbsoluteWeek >= absoluteWeek) {
        return {
            player: { ...player, world },
            world,
            news: [],
            socialPosts: [],
            logs: [],
            absoluteWeek,
            processed: false,
            executionOrder: [],
        };
    }

    const executionOrder: IndustryWorldExecutionStage[] = ['PLATFORM_AI', 'STREAMING_ECOSYSTEM'];
    const streaming = processStreamingIndustryWorldWeek(player, world, absoluteWeek);
    executionOrder.push('STUDIO_AI');
    const studio = processStudioAiWeek(
        { ...player, world: streaming.world },
        streaming.world,
        absoluteWeek,
    );
    executionOrder.push('PRESENTATION');
    const facts = collectIndustryEventFacts(world, studio.world, absoluteWeek);
    const collectedWorld: WorldState = {
        ...studio.world,
        industryEvents: appendIndustryEventFacts(studio.world.industryEvents, facts),
    };
    const presentation = projectIndustryEvents(
        { ...player, world: collectedWorld },
        collectedWorld.industryEvents,
        absoluteWeek,
        collectedWorld.industryMedia,
    );
    const nextWorld: WorldState = {
        ...collectedWorld,
        upcomingRivals: getCanonicalScheduledRivals(collectedWorld, absoluteWeek, 12),
        industryEvents: {
            ...presentation.ledger,
            lastProcessedAbsoluteWeek: absoluteWeek,
        },
        industryMedia: presentation.mediaWorld,
    };
    const nextPlayer = { ...presentation.player, world: nextWorld };
    return {
        player: nextPlayer,
        world: nextWorld,
        news: presentation.news,
        socialPosts: presentation.xPosts,
        logs: [...streaming.logs, ...studio.logs],
        absoluteWeek,
        processed: true,
        executionOrder,
    };
};
