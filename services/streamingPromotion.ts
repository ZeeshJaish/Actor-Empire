import type {
    OwnedStreamingGrowthAction,
    OwnedStreamingLedgerEntry,
    OwnedStreamingPlatformState,
    OwnedStreamingSlateEntry,
    Player,
    StreamingArtworkVariant,
    StreamingCampaignChannelId,
    StreamingHomepagePlacement,
    StreamingRecommendationObjective,
} from '../types';
import { createDeterministicId, createDeterministicRng } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import {
    compactOwnedStreamingPlatformForPersistence,
    normalizeOwnedStreamingPlatformState,
} from './ownedStreamingPlatform';
import { getOwnedStreamingProgramEntries } from './streamingOriginals';

export interface StreamingCampaignChannelDefinition {
    id: StreamingCampaignChannelId;
    label: string;
    kicker: string;
    description: string;
    cashCost: number;
    acquisitionRateDelta: number;
    targetWeightBoost: number;
    discoveryBias: [number, number, number, number];
}

export interface StreamingHomepagePlacementDefinition {
    id: StreamingHomepagePlacement;
    label: string;
    description: string;
    cashCost: number;
    acquisitionRateDelta: number;
    targetWeightBoost: number;
    homepageBias: number;
}

export interface StreamingRecommendationDefinition {
    id: StreamingRecommendationObjective;
    label: string;
    description: string;
    tradeoff: string;
    acquisitionRateDelta: number;
    churnRateDelta: number;
    engagementRateDelta: number;
    targetWeightBoost: number;
    longTailWeightBoost: number;
    recommendationBias: number;
}

export interface StreamingArtworkDefinition {
    id: StreamingArtworkVariant;
    label: string;
    description: string;
    signal: string;
}

export const STREAMING_CAMPAIGN_CHANNELS: StreamingCampaignChannelDefinition[] = [
    {
        id: 'TRAILER',
        label: 'Trailer Event',
        kicker: 'INTENT',
        description: 'Cut a high-conversion trailer package around the title’s clearest promise.',
        cashCost: 900_000,
        acquisitionRateDelta: 0.0019,
        targetWeightBoost: 0.16,
        discoveryBias: [3, 3, 5, 5],
    },
    {
        id: 'BILLBOARD',
        label: 'City Takeover',
        kicker: 'AWARENESS',
        description: 'Own high-traffic physical placements and turn curiosity into branded search.',
        cashCost: 1_600_000,
        acquisitionRateDelta: 0.0015,
        targetWeightBoost: 0.12,
        discoveryBias: [4, 0, 10, 2],
    },
    {
        id: 'SOCIAL',
        label: 'Social Pulse',
        kicker: 'VELOCITY',
        description: 'Launch shareable cuts, cast moments and audience conversation across social feeds.',
        cashCost: 650_000,
        acquisitionRateDelta: 0.0022,
        targetWeightBoost: 0.18,
        discoveryBias: [2, 4, 2, 12],
    },
    {
        id: 'REGIONAL',
        label: 'Regional Spotlight',
        kicker: 'RELEVANCE',
        description: 'Localize the message and concentrate reach where the title has the strongest fit.',
        cashCost: 1_150_000,
        acquisitionRateDelta: 0.0014,
        targetWeightBoost: 0.12,
        discoveryBias: [2, 2, 7, 5],
    },
];

export const STREAMING_HOMEPAGE_PLACEMENTS: StreamingHomepagePlacementDefinition[] = [
    {
        id: 'NONE',
        label: 'Organic position',
        description: 'Let the normal homepage system place the title from existing demand.',
        cashCost: 0,
        acquisitionRateDelta: 0,
        targetWeightBoost: 0,
        homepageBias: 0,
    },
    {
        id: 'HERO',
        label: 'Hero takeover',
        description: 'Give the title the first frame and the most concentrated homepage attention.',
        cashCost: 450_000,
        acquisitionRateDelta: 0.0011,
        targetWeightBoost: 0.38,
        homepageBias: 22,
    },
    {
        id: 'TOP_TEN',
        label: 'Top 10 rail',
        description: 'Keep the title visible beside the service’s strongest current performers.',
        cashCost: 180_000,
        acquisitionRateDelta: 0.0004,
        targetWeightBoost: 0.2,
        homepageBias: 11,
    },
    {
        id: 'GENRE_SPOTLIGHT',
        label: 'Genre spotlight',
        description: 'Position the title inside a high-intent collection with related next watches.',
        cashCost: 260_000,
        acquisitionRateDelta: 0.0003,
        targetWeightBoost: 0.24,
        homepageBias: 8,
    },
];

export const STREAMING_RECOMMENDATION_OBJECTIVES: StreamingRecommendationDefinition[] = [
    {
        id: 'BALANCED',
        label: 'Balanced service',
        description: 'Protect immediate conversion while keeping a healthy spread of the catalog visible.',
        tradeoff: 'No sharp advantage; no sharp blind spot.',
        acquisitionRateDelta: 0,
        churnRateDelta: 0,
        engagementRateDelta: 0,
        targetWeightBoost: 0,
        longTailWeightBoost: 0,
        recommendationBias: 0,
    },
    {
        id: 'RETENTION',
        label: 'Next-watch depth',
        description: 'Prefer titles most likely to create a satisfying second and third session.',
        tradeoff: 'Slower trend chasing in exchange for stronger habit.',
        acquisitionRateDelta: 0.0002,
        churnRateDelta: -0.0014,
        engagementRateDelta: 0.014,
        targetWeightBoost: 0.06,
        longTailWeightBoost: 0.05,
        recommendationBias: 12,
    },
    {
        id: 'CATALOG_DISCOVERY',
        label: 'Catalog discovery',
        description: 'Explore deeper shelves and give underexposed titles a fairer chance to find viewers.',
        tradeoff: 'More discovery and depth, slightly less immediate conversion.',
        acquisitionRateDelta: -0.0003,
        churnRateDelta: -0.0005,
        engagementRateDelta: 0.01,
        targetWeightBoost: 0,
        longTailWeightBoost: 0.22,
        recommendationBias: 18,
    },
    {
        id: 'BREAKOUT',
        label: 'Breakout velocity',
        description: 'Concentrate recommendations around the title most likely to become the week’s event.',
        tradeoff: 'Higher acquisition ceiling, narrower catalog exposure and more churn risk.',
        acquisitionRateDelta: 0.0015,
        churnRateDelta: 0.0007,
        engagementRateDelta: 0.002,
        targetWeightBoost: 0.28,
        longTailWeightBoost: -0.04,
        recommendationBias: 9,
    },
];

export const STREAMING_ARTWORK_VARIANTS: StreamingArtworkDefinition[] = [
    {
        id: 'FACE_FORWARD',
        label: 'Face Forward',
        description: 'Lead with character emotion and recognizable talent.',
        signal: 'Human stakes',
    },
    {
        id: 'WORLD_BUILDING',
        label: 'World Building',
        description: 'Sell scale, setting and the world viewers can enter.',
        signal: 'Spectacle',
    },
    {
        id: 'MYSTERY_HOOK',
        label: 'Mystery Hook',
        description: 'Hold information back and turn one striking clue into curiosity.',
        signal: 'Intrigue',
    },
];

export interface StreamingGrowthDraft {
    projectId: string;
    channels: StreamingCampaignChannelId[];
    homepagePlacement: StreamingHomepagePlacement;
    recommendationObjective: StreamingRecommendationObjective;
    explorationPercent: number;
    artworkVariants: StreamingArtworkVariant[];
}

export interface StreamingGrowthEffects {
    acquisitionRateDelta: number;
    churnRateDelta: number;
    engagementRateDelta: number;
    targetWeightBoost: number;
    longTailWeightBoost: number;
    targetDiscoveryBias: {
        homepage: number;
        recommendations: number;
        search: number;
        direct: number;
    };
}

export interface StreamingGrowthPreview extends StreamingGrowthEffects {
    cashCost: number;
    reachScore: number;
    estimatedAttributedJoinsLow: number;
    estimatedAttributedJoinsHigh: number;
    confidenceLabel: 'MODELED' | 'STRONG MODEL';
    hasMeaningfulChange: boolean;
    warnings: string[];
}

const clamp = (value: number, minimum: number, maximum: number): number => (
    Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
);

const unique = <T extends string>(values: T[]): T[] => Array.from(new Set(values));

const getTargetProgramWeek = (platform: OwnedStreamingPlatformState, targetAbsoluteWeek: number): number => (
    platform.launchCommit
        ? Math.max(1, targetAbsoluteWeek - platform.launchCommit.committedAtAbsoluteWeek + 1)
        : 0
);

const getEligibleTitles = (
    player: Player,
    targetAbsoluteWeek: number,
): OwnedStreamingSlateEntry[] => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const targetProgramWeek = getTargetProgramWeek(platform, targetAbsoluteWeek);
    return getOwnedStreamingProgramEntries(player).filter(entry => entry.launchWeek <= targetProgramWeek);
};

export const getStreamingGrowthEffects = (
    platform: OwnedStreamingPlatformState,
    action: Pick<
        OwnedStreamingGrowthAction,
        'channels' | 'homepagePlacement' | 'recommendationObjective' | 'explorationPercent' | 'artworkVariants'
    >,
): StreamingGrowthEffects => {
    const channels = unique(action.channels)
        .flatMap(channelId => STREAMING_CAMPAIGN_CHANNELS.filter(channel => channel.id === channelId));
    const placement = STREAMING_HOMEPAGE_PLACEMENTS.find(item => item.id === action.homepagePlacement)
        || STREAMING_HOMEPAGE_PLACEMENTS[0];
    const recommendation = STREAMING_RECOMMENDATION_OBJECTIVES.find(item => item.id === action.recommendationObjective)
        || STREAMING_RECOMMENDATION_OBJECTIVES[0];
    const exploration = clamp(action.explorationPercent, 10, 45);
    const explorationOffset = exploration - 25;
    const dataLevel = clamp(platform.technologyLevels.DATA_RECOMMENDATIONS, 0, 100);
    const recommendationMultiplier = 0.82 + dataLevel / 250;
    const channelDiscovery = channels.reduce(
        (totals, channel) => totals.map((value, index) => value + channel.discoveryBias[index]) as [number, number, number, number],
        [0, 0, 0, 0] as [number, number, number, number],
    );
    return {
        acquisitionRateDelta: channels.reduce((total, channel) => total + channel.acquisitionRateDelta, 0)
            + placement.acquisitionRateDelta
            + recommendation.acquisitionRateDelta * recommendationMultiplier
            - explorationOffset * 0.00003
            + (action.artworkVariants.length === 2 ? 0.0004 : 0),
        churnRateDelta: recommendation.churnRateDelta * recommendationMultiplier
            - Math.max(0, explorationOffset) * 0.00002,
        engagementRateDelta: recommendation.engagementRateDelta * recommendationMultiplier
            + Math.max(0, explorationOffset) * 0.00035,
        targetWeightBoost: Math.max(
            0,
            channels.reduce((total, channel) => total + channel.targetWeightBoost, 0)
                + placement.targetWeightBoost
                + recommendation.targetWeightBoost
                - Math.max(0, explorationOffset) * 0.004
                + (action.artworkVariants.length === 2 ? 0.08 : 0),
        ),
        longTailWeightBoost: recommendation.longTailWeightBoost
            + explorationOffset * 0.008,
        targetDiscoveryBias: {
            homepage: channelDiscovery[0] + placement.homepageBias,
            recommendations: channelDiscovery[1]
                + recommendation.recommendationBias * recommendationMultiplier
                + Math.max(0, explorationOffset) * 0.45,
            search: channelDiscovery[2],
            direct: channelDiscovery[3],
        },
    };
};

export const previewStreamingGrowthAction = (
    player: Player,
    draft: StreamingGrowthDraft,
): StreamingGrowthPreview => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const channels = unique(draft.channels)
        .flatMap(channelId => STREAMING_CAMPAIGN_CHANNELS.filter(channel => channel.id === channelId));
    const placement = STREAMING_HOMEPAGE_PLACEMENTS.find(item => item.id === draft.homepagePlacement)
        || STREAMING_HOMEPAGE_PLACEMENTS[0];
    const artworkTest = unique(draft.artworkVariants).length === 2;
    const cashCost = channels.reduce((total, channel) => total + channel.cashCost, 0)
        + placement.cashCost
        + (artworkTest ? 240_000 : 0);
    const effects = getStreamingGrowthEffects(platform, {
        ...draft,
        channels: channels.map(channel => channel.id),
        artworkVariants: artworkTest ? unique(draft.artworkVariants).slice(0, 2) : [],
    });
    const subscribers = Math.max(0, platform.metrics.subscribers || platform.launchCommit?.initialSubscribers || 0);
    const expectedAttributedJoins = Math.max(0, Math.round(subscribers * Math.max(0, effects.acquisitionRateDelta)));
    const hasMeaningfulChange = channels.length > 0
        || placement.id !== 'NONE'
        || draft.recommendationObjective !== 'BALANCED'
        || Math.round(draft.explorationPercent) !== 25
        || artworkTest;
    const warnings: string[] = [];
    if (draft.recommendationObjective === 'BREAKOUT' && draft.explorationPercent < 20) {
        warnings.push('Breakout concentration with low exploration can make the catalog feel narrow.');
    }
    if (channels.length >= 3 && platform.capacity.burstConcurrentStreams > 0) {
        warnings.push('A broad campaign can create a larger peak; confirm the network still has headroom.');
    }
    if (draft.recommendationObjective === 'CATALOG_DISCOVERY' && placement.id === 'HERO') {
        warnings.push('Hero concentration competes with the catalog-discovery objective.');
    }
    if (!channels.length && placement.id === 'NONE' && !artworkTest) {
        warnings.push('This is an algorithm-only action. It can reshape discovery without creating paid reach.');
    }
    return {
        ...effects,
        cashCost,
        reachScore: Math.round(clamp(
            22
                + channels.length * 14
                + placement.targetWeightBoost * 38
                + Math.max(0, effects.acquisitionRateDelta) * 2_500
                + (artworkTest ? 6 : 0),
            0,
            100,
        )),
        estimatedAttributedJoinsLow: Math.round(expectedAttributedJoins * 0.72),
        estimatedAttributedJoinsHigh: Math.round(expectedAttributedJoins * 1.24),
        confidenceLabel: platform.technologyLevels.DATA_RECOMMENDATIONS >= 20 ? 'STRONG MODEL' : 'MODELED',
        hasMeaningfulChange,
        warnings,
    };
};

export interface StreamingPromotionCenter {
    targetAbsoluteWeek: number;
    targetProgramWeek: number;
    eligibleTitles: OwnedStreamingSlateEntry[];
    lockedAction: OwnedStreamingGrowthAction | null;
    appliedActions: OwnedStreamingGrowthAction[];
}

export const getStreamingPromotionCenter = (player: Player): StreamingPromotionCenter => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const targetAbsoluteWeek = getAbsoluteWeek(player.age, player.currentWeek) + 1;
    return {
        targetAbsoluteWeek,
        targetProgramWeek: getTargetProgramWeek(platform, targetAbsoluteWeek),
        eligibleTitles: getEligibleTitles(player, targetAbsoluteWeek),
        lockedAction: platform.growthActions.find(action => (
            action.targetAbsoluteWeek === targetAbsoluteWeek && action.status === 'LOCKED'
        )) || null,
        appliedActions: platform.growthActions
            .filter(action => action.status === 'APPLIED')
            .sort((left, right) => right.targetAbsoluteWeek - left.targetAbsoluteWeek),
    };
};

export const lockStreamingGrowthAction = (
    player: Player,
    draft: StreamingGrowthDraft,
): {
    player: Player;
    changed: boolean;
    reason?: 'NOT_LIVE' | 'NO_ELIGIBLE_TITLE' | 'ALREADY_LOCKED' | 'INSUFFICIENT_TREASURY' | 'NO_MEANINGFUL_CHANGE';
    action?: OwnedStreamingGrowthAction;
} => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (platform.lifecycle !== 'ACTIVE' || !platform.launchCommit) return { player, changed: false, reason: 'NOT_LIVE' };
    const selectedAtAbsoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const targetAbsoluteWeek = selectedAtAbsoluteWeek + 1;
    if (platform.growthActions.some(action => action.targetAbsoluteWeek === targetAbsoluteWeek)) {
        return { player, changed: false, reason: 'ALREADY_LOCKED' };
    }
    const eligibleTitle = getEligibleTitles(player, targetAbsoluteWeek)
        .find(entry => entry.projectId === draft.projectId);
    if (!eligibleTitle) return { player, changed: false, reason: 'NO_ELIGIBLE_TITLE' };
    const preview = previewStreamingGrowthAction(player, draft);
    if (!preview.hasMeaningfulChange) return { player, changed: false, reason: 'NO_MEANINGFUL_CHANGE' };
    if (preview.cashCost > platform.treasuryCash) return { player, changed: false, reason: 'INSUFFICIENT_TREASURY' };
    const channels = unique(draft.channels)
        .filter(channel => STREAMING_CAMPAIGN_CHANNELS.some(definition => definition.id === channel));
    const artworkVariants = unique(draft.artworkVariants)
        .filter(variant => STREAMING_ARTWORK_VARIANTS.some(definition => definition.id === variant))
        .slice(0, 2);
    const idempotencyKey = `growth-action:${targetAbsoluteWeek}`;
    const action: OwnedStreamingGrowthAction = {
        id: createDeterministicId('streaming_growth', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        projectId: eligibleTitle.projectId,
        title: eligibleTitle.title,
        selectedAtAbsoluteWeek,
        targetAbsoluteWeek,
        channels,
        homepagePlacement: STREAMING_HOMEPAGE_PLACEMENTS.some(item => item.id === draft.homepagePlacement)
            ? draft.homepagePlacement
            : 'NONE',
        recommendationObjective: STREAMING_RECOMMENDATION_OBJECTIVES.some(item => item.id === draft.recommendationObjective)
            ? draft.recommendationObjective
            : 'BALANCED',
        explorationPercent: Math.round(clamp(draft.explorationPercent, 10, 45)),
        artworkVariants: artworkVariants.length === 2 ? artworkVariants : [],
        cashCost: preview.cashCost,
        status: 'LOCKED',
        appliedAtAbsoluteWeek: null,
        outcome: null,
    };
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        absoluteWeek: selectedAtAbsoluteWeek,
        type: 'GROWTH_ACTION_LOCKED',
        summary: `${eligibleTitle.title} growth action locked for the next platform week.`,
        source: 'PLAYER_ACTION',
        metadata: {
            projectId: eligibleTitle.projectId,
            targetAbsoluteWeek,
            cashCost: action.cashCost,
            channelCount: action.channels.length,
            recommendationObjective: action.recommendationObjective,
        },
    };
    return {
        player: {
            ...player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                growthActions: [...platform.growthActions, action],
                eventLedger: [...platform.eventLedger, ledger],
                milestoneKeys: platform.milestoneKeys.includes('growth-war-room-opened')
                    ? platform.milestoneKeys
                    : [...platform.milestoneKeys, 'growth-war-room-opened'],
            }, player.id),
        },
        changed: true,
        action,
    };
};

const artworkFit = (variant: StreamingArtworkVariant, entry: OwnedStreamingSlateEntry): number => {
    if (variant === 'MYSTERY_HOOK') {
        return ['MYSTERY', 'THRILLER', 'HORROR', 'CRIME'].includes(entry.genre) ? 12 : 4;
    }
    if (variant === 'WORLD_BUILDING') {
        return ['SCI_FI', 'FANTASY', 'ADVENTURE', 'SUPERHERO', 'ANIMATION'].includes(entry.genre)
            ? 12
            : entry.source === 'ORIGINAL' ? 7 : 3;
    }
    return ['DRAMA', 'ROMANCE', 'COMEDY', 'BIOPIC'].includes(entry.genre)
        ? 11
        : entry.projectType === 'SERIES' ? 7 : 5;
};

export const resolveStreamingArtworkTest = (
    platform: OwnedStreamingPlatformState,
    action: OwnedStreamingGrowthAction,
    entry: OwnedStreamingSlateEntry,
    absoluteWeek: number,
): { winner: StreamingArtworkVariant | null; liftPercent: number | null } => {
    if (action.artworkVariants.length !== 2) return { winner: null, liftPercent: null };
    const rng = createDeterministicRng(`${platform.simulationSeed}:artwork:${action.id}:${absoluteWeek}`);
    const scored = action.artworkVariants.map(variant => ({
        variant,
        score: artworkFit(variant, entry) + rng() * 9,
    })).sort((left, right) => right.score - left.score);
    return {
        winner: scored[0].variant,
        liftPercent: Math.round(clamp(1.4 + (scored[0].score - scored[1].score) * 0.32 + rng() * 1.5, 1.2, 5.8) * 10) / 10,
    };
};
