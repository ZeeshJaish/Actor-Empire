import type { NewsItem, Player, WorldState, XPost } from '../../types';
import { processStreamingIndustryWorldWeek } from '../platformAi';
import { processStudioAiWeek } from '../studioAi';
import { normalizeIndustryEventLedger } from './industryEventLedger';
import { appendIndustryEventFacts } from './industryEventLedger';
import { collectIndustryEventFacts } from './industryEventCollectors';
import { projectIndustryEvents } from './industryPresentation';
import { getCanonicalScheduledRivals } from './publicIndustryProjection';
import { resolveIndustryMediaResponses } from './industryMediaResponses';
import { processIndustryMediaYoutube } from './industryMediaYoutube';
import { processIndustryMediaFandoms } from './industryMediaFandoms';
import { createIndustryMediaClaim } from './industryMediaClaims';
import { resolveIndustryMediaClaims } from './industryMediaClaimResolution';
import { publishIndustryMediaClaimBeats } from './industryMediaClaimPublication';
import { advanceIndustryMediaNarratives } from './industryMediaNarratives';
import { advanceIndustryMediaRelationships } from './industryMediaRelationships';
import { processStreamingUpcomingRightsWeek } from '../streamingUpcomingRights';

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
    const upcomingRights = processStreamingUpcomingRightsWeek(
        { ...player, world: studio.world },
        absoluteWeek,
    );
    executionOrder.push('PRESENTATION');
    const facts = collectIndustryEventFacts(world, upcomingRights.player.world, absoluteWeek);
    const collectedWorld: WorldState = {
        ...upcomingRights.player.world,
        industryEvents: appendIndustryEventFacts(upcomingRights.player.world.industryEvents, facts),
    };
    const presentation = projectIndustryEvents(
        { ...upcomingRights.player, world: collectedWorld },
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
    const presentedPlayer = { ...presentation.player, world: nextWorld };
    const claimResolution = resolveIndustryMediaClaims(presentedPlayer, absoluteWeek);
    const responseResolution = resolveIndustryMediaResponses(claimResolution.player, absoluteWeek);
    const youtube = processIndustryMediaYoutube(responseResolution.player, absoluteWeek);
    const fandoms = processIndustryMediaFandoms(youtube.player, absoluteWeek);
    const relationships = advanceIndustryMediaRelationships(fandoms.player, absoluteWeek);
    const narratives = advanceIndustryMediaNarratives(relationships.player, absoluteWeek);
    const claimCreation = createIndustryMediaClaim(narratives.player, absoluteWeek);
    const claimPublication = publishIndustryMediaClaimBeats(
        claimCreation.player,
        absoluteWeek,
        claimCreation.claim,
        claimResolution.resolvedClaims,
    );
    const resolvedWorld = claimPublication.player.world;
    return {
        player: claimPublication.player,
        world: resolvedWorld,
        news: [...presentation.news, ...responseResolution.news, ...narratives.retrospectiveNews, ...claimPublication.news],
        socialPosts: [...presentation.xPosts, ...youtube.xPosts, ...fandoms.xPosts, ...narratives.retrospectiveXPosts, ...claimPublication.xPosts],
        logs: [...streaming.logs, ...studio.logs],
        absoluteWeek,
        processed: true,
        executionOrder,
    };
};
