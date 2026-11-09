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
import { collectOwnedStreamingPlatformFacts } from '../streamingPlatformNews';
import { collectStreamingChartFacts } from '../streamingChartNews';
import { collectRivalTechFacts } from '../streamingRivalNews';
import { collectStreamingValueFacts } from '../streamingValueNews';
import { collectStreamingCampaignNews } from '../campaigns/streamingCampaignNews';

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

type IndustryWorldWeekDiagnostics = { onPhase?: (name: string, elapsedMs: number) => void };

/* Round 5 (2026-11-09): the week's steps as a generator that stops after the rival platforms and after the studios.
   The plain call below runs it straight through; the week loop runs the same steps with a browser frame at each
   stop, so a late career's ~300 ms block (about 1.2 s on a slow phone) becomes three of about 100 ms. Each frame
   costs about 50 ms on a slow phone, so there are only two stops. Same steps, same order, same data. */
function* industryWorldWeekSteps(
    player: Player,
    world: WorldState,
    absoluteWeek: number,
    diagnostics?: IndustryWorldWeekDiagnostics,
): Generator<void, IndustryWorldWeekResult, void> {
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
    let phaseStarted = performance.now();
    const streaming = processStreamingIndustryWorldWeek(player, world, absoluteWeek);
    diagnostics?.onPhase?.('industry_platforms_ms', performance.now() - phaseStarted);
    yield;
    phaseStarted = performance.now();
    executionOrder.push('STUDIO_AI');
    const studio = processStudioAiWeek(
        { ...player, world: streaming.world },
        streaming.world,
        absoluteWeek,
    );
    diagnostics?.onPhase?.('industry_studios_ms', performance.now() - phaseStarted);
    yield;
    phaseStarted = performance.now();
    const upcomingRights = processStreamingUpcomingRightsWeek(
        { ...player, world: studio.world },
        absoluteWeek,
    );
    diagnostics?.onPhase?.('industry_upcoming_rights_ms', performance.now() - phaseStarted);
    phaseStarted = performance.now();
    executionOrder.push('PRESENTATION');
    /* the player's campaigns: their big nights, famous screens and big results (#149), and the fans' buzz */
    const campaignNews = collectStreamingCampaignNews(player, ledger.lastProcessedAbsoluteWeek, absoluteWeek);
    const facts = [
        ...collectIndustryEventFacts(world, upcomingRights.player.world, absoluteWeek),
        /* the player's own service since the last pass (Phase 5, #66) */
        ...collectOwnedStreamingPlatformFacts(player, ledger.lastProcessedAbsoluteWeek, absoluteWeek),
        /* rivals' tech steps and how their picture compares (#70) */
        ...collectRivalTechFacts(player, upcomingRights.player.world, ledger.lastProcessedAbsoluteWeek, absoluteWeek),
        /* the player's value against the global rivals: praise or criticism, at most one a week (#117) */
        ...collectStreamingValueFacts(upcomingRights.player, absoluteWeek),
        /* the weekly Top 10's notable weeks (#143) */
        ...collectStreamingChartFacts(player, ledger.lastProcessedAbsoluteWeek, absoluteWeek),
        ...campaignNews.facts,
    ];
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
    diagnostics?.onPhase?.('industry_media_ms', performance.now() - phaseStarted);
    const resolvedWorld = claimPublication.player.world;
    /* the fans' posts go straight to the feed, as the fandoms' do; #161: and the street photos to Instagram */
    const seen = new Set<string>();
    const posted = campaignNews.buzz.length ? {
        ...claimPublication.player,
        x: {
            ...claimPublication.player.x,
            feed: [...campaignNews.buzz, ...(claimPublication.player.x?.feed || [])]
                .filter(post => (seen.has(post.id) ? false : (seen.add(post.id), true))).slice(0, 80),
        },
    } : claimPublication.player;
    const snapped = new Set<string>();
    const buzzed = campaignNews.insta.length ? {
        ...posted,
        instagram: {
            ...posted.instagram,
            feed: [...campaignNews.insta, ...(posted.instagram?.feed || [])]
                .filter(post => (snapped.has(post.id) ? false : (snapped.add(post.id), true))).slice(0, 50),
        },
    } : posted;
    return {
        player: buzzed,
        world: resolvedWorld,
        news: [...presentation.news, ...responseResolution.news, ...narratives.retrospectiveNews, ...claimPublication.news],
        socialPosts: [...presentation.xPosts, ...youtube.xPosts, ...fandoms.xPosts, ...narratives.retrospectiveXPosts, ...claimPublication.xPosts, ...campaignNews.buzz],
        logs: [...streaming.logs, ...studio.logs],
        absoluteWeek,
        processed: true,
        executionOrder,
    };
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
    diagnostics?: IndustryWorldWeekDiagnostics,
): IndustryWorldWeekResult => {
    const steps = industryWorldWeekSteps(player, world, absoluteWeek, diagnostics);
    let step = steps.next();
    while (!step.done) step = steps.next();
    return step.value;
};

/** The same week, with `pause` awaited between its phases (the week loop passes its frame yield). */
export const processIndustryWorldWeekInSteps = async (
    player: Player,
    world: WorldState,
    absoluteWeek: number,
    diagnostics: IndustryWorldWeekDiagnostics | undefined,
    pause: () => Promise<void>,
): Promise<IndustryWorldWeekResult> => {
    const steps = industryWorldWeekSteps(player, world, absoluteWeek, diagnostics);
    let step = steps.next();
    while (!step.done) {
        await pause();
        step = steps.next();
    }
    return step.value;
};
