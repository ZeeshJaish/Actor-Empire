import type {
    OwnedStreamingRivalProfile,
    PlatformId,
    Player,
    WorldAudienceCountryState,
    WorldAudienceEconomyState,
    WorldAudienceParticipationBarrierId,
    WorldAudienceParticipationCountryState,
    WorldStreamingCompetitionCountryState,
    WorldStreamingCustomerCountryState,
    WorldStreamingCustomerReasonId,
    WorldStreamingPlanAllocation,
    WorldAudiencePersonaId,
} from '../types';
import { getAbsoluteWeek } from './legacyLogic';
import { normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import {
    STREAMING_DAY_ONE_MARKETS,
    STREAMING_DAY_ONE_REGION_LABELS,
    type StreamingDayOneMarket,
    type StreamingDayOneRegionId,
} from './streamingDayOneMarkets';
import { resolveStreamingPlatformBrandById } from './streamingPlatformBrandRegistry';
import { getWorldAudiencePersonaShares, normalizeWorldAudienceEconomyState } from './worldEconomy/worldAudienceCohorts';
import { normalizeWorldAudienceParticipationState } from './worldEconomy/worldAudienceParticipation';
import { normalizeWorldPopulationState } from './worldEconomy/worldPopulation';
import { normalizeWorldStreamingCompetitionState } from './worldEconomy/worldStreamingCompetition';

export type StreamingAudiencePlatformId = PlatformId | 'AMAZON_PRIME' | 'REGIONAL' | 'PLAYER';
export type StreamingAudiencePersonaId = WorldAudiencePersonaId;

export interface StreamingAudienceTrendPoint {
    label: string;
    absoluteWeek: number;
    population: number;
    streamingAdoptionPercent: number;
    activeViewers: number;
    payingHouseholds: number;
    paidSubscriptions: number;
}

export interface StreamingAudienceShareEntry {
    id: StreamingAudiencePlatformId;
    name: string;
    color: string;
    sharePercent: number;
}

export interface StreamingAudienceCountryView {
    id: string;
    country: string;
    regionId: StreamingDayOneRegionId;
    regionName: string;
    selectedForLaunch: boolean;
    estimatedPopulation: number;
    streamingAdoptionPercent: number;
    activeViewers: number;
    payingHouseholds: number;
    commercialHouseholds: number;
    nonParticipantHouseholds: number;
    averageMonthlyEntertainmentBudget: number;
    budgetPressureIndex: number;
    streamingReachableHouseholds: number;
    cinemaReachableHouseholds: number;
    streamingOnlyHouseholds: number;
    cinemaOnlyHouseholds: number;
    dualParticipantHouseholds: number;
    neitherHouseholds: number;
    topStreamingBarrier: string;
    topCinemaBarrier: string;
    paidSubscriptions: number;
    subscriptionsPerHousehold: number;
    annualGrowthPercent: number;
    weeklyWatchHours: number;
    churnPercent: number;
    switchingPercent: number;
    topPlatformName: string;
    topPlatformSharePercent: number;
    playerSharePercent: number;
    watchShare: StreamingAudienceShareEntry[];
    trend: Array<{ label: string; value: number }>;
    audienceReason: string;
    regionalServices: string[];
}

export interface StreamingAudiencePlatformView {
    id: StreamingAudiencePlatformId;
    name: string;
    shortName: string;
    color: string;
    subscribers: number;
    watchSharePercent: number;
    householdReachPercent: number;
    globalStrength: number;
    catalogStrength: number;
    valueStrength: number;
    technologyStrength: number;
    localStrength: number;
    momentum: 'RISING' | 'STEADY' | 'FALLING';
    strengthLine: string;
    audienceReason: string;
    weakSpot: string;
}

export interface StreamingAudiencePersonaView {
    id: StreamingAudiencePersonaId;
    name: string;
    sharePercent: number;
    activeViewers: number;
    weeklyHours: number;
    subscriptionsPerHousehold: number;
    switchSensitivity: 'LOW' | 'MEDIUM' | 'HIGH';
    color: string;
    need: string;
    leavesWhen: string;
    bestFitPlatform: string;
    averageMonthlyEntertainmentBudget: number;
}

export interface StreamingAudienceSwitchingView {
    joinedThisWeek: number;
    cancelledThisWeek: number;
    reactivatedThisWeek: number;
    switchedPlatformThisWeek: number;
    upgradedThisWeek: number;
    downgradedThisWeek: number;
    globalSwitchPool: number;
    playerChurnPercent: number;
    reasons: Array<{ id: string; label: string; sharePercent: number; detail: string }>;
}

export interface StreamingAudienceMarketView {
    generatedAtAbsoluteWeek: number;
    weeksSinceFounding: number;
    gameWorldNotice: string;
    globalPopulation: number;
    streamingAdoptionPercent: number;
    activeViewers: number;
    payingHouseholds: number;
    paidSubscriptions: number;
    subscriptionsPerHousehold: number;
    householdEconomy: {
        commercialHouseholds: number;
        nonParticipantHouseholds: number;
        nonParticipantPercent: number;
        averageMonthlyEntertainmentBudget: number;
        totalMonthlyEntertainmentBudget: number;
    };
    industryParticipation: {
        streamingReachableHouseholds: number;
        cinemaReachableHouseholds: number;
        streamingOnlyHouseholds: number;
        cinemaOnlyHouseholds: number;
        dualParticipantHouseholds: number;
        neitherHouseholds: number;
        totalMonthlyStreamingBudget: number;
        totalMonthlyCinemaBudget: number;
    };
    streamingCompetition: {
        subscribingHouseholds: number;
        unclaimedHouseholds: number;
        totalSubscriptions: number;
        totalMonthlySubscriptionSpend: number;
        playerHouseholds: number;
        playerPrimaryHouseholds: number;
        playerMonthlySubscriptionRevenue: number;
        playerEffectiveMonthlyPrice: number;
        playerPlanAllocations: WorldStreamingPlanAllocation[];
        playerOfferPresent: boolean;
        offerCount: number;
    };
    customerAccess: {
        available: boolean;
        paidAccounts: number;
        payingHouseholds: number;
        externalSharedHouseholds: number;
        sharedActiveViewers: number;
        piracyReach: number;
        accessLoadAccounts: number;
        monthlySubscriptionRevenue: number;
        upgrades: number;
        downgrades: number;
        switchIns: number;
        switchOuts: number;
        planAllocations: Array<{
            planId: string;
            planName: string;
            paidAccounts: number;
            effectiveMonthlyPrice: number;
            monthlySubscriptionRevenue: number;
        }>;
    };
    weeklyWatchHours: number;
    subscriberOverlap: {
        oneServicePercent: number;
        twoServicesPercent: number;
        threePlusPercent: number;
    };
    globalTrend: StreamingAudienceTrendPoint[];
    globalWatchShare: StreamingAudienceShareEntry[];
    countries: StreamingAudienceCountryView[];
    platforms: StreamingAudiencePlatformView[];
    personas: StreamingAudiencePersonaView[];
    switching: StreamingAudienceSwitchingView;
}

const clamp = (value: number, minimum: number, maximum: number): number => (
    Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
);
const round = (value: number): number => Math.round(value);
const round1 = (value: number): number => Math.round(value * 10) / 10;
const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);

const PARTICIPATION_BARRIER_LABELS: Record<WorldAudienceParticipationBarrierId, string> = {
    CONNECTIVITY: 'reliable connectivity',
    DEVICE_ACCESS: 'device access',
    PAYMENT_ACCESS: 'payment access',
    AFFORDABILITY: 'affordability',
    CINEMA_ACCESS: 'theatre availability',
    TRAVEL_ACCESS: 'travel access',
    LANGUAGE_ACCESS: 'language access',
    LEISURE_TIME: 'available leisure time',
    LOW_INTEREST: 'low category interest',
    NONE: 'no dominant barrier',
};

const PLATFORM_META: Record<StreamingAudiencePlatformId, {
    shortName: string;
    fallbackName?: string;
    fallbackColor?: string;
    catalog: number;
    value: number;
    technology: number;
    local: number;
    strengthLine: string;
    audienceReason: string;
    weakSpot: string;
}> = {
    NETFLIX: { shortName: 'NETFLIX', catalog: 94, value: 78, technology: 88, local: 84, strengthLine: 'Scale, constant discovery and a deep global catalogue.', audienceReason: 'There is nearly always something familiar or newly talked about.', weakSpot: 'Price pressure and hit-to-hit fatigue can make casual homes rotate out.' },
    DISNEY_PLUS: { shortName: 'DISNEY+', catalog: 87, value: 76, technology: 82, local: 58, strengthLine: 'Franchises and family loyalty create a powerful household moat.', audienceReason: 'Families keep it for trusted brands, children and event franchises.', weakSpot: 'A narrower adult catalogue can leave gaps between major releases.' },
    AMAZON_PRIME: { shortName: 'PRIME', catalog: 85, value: 96, technology: 87, local: 75, strengthLine: 'Bundle value keeps it inside households even between premieres.', audienceReason: 'Viewers see the service as part of a wider membership, not one bill.', weakSpot: 'A busy storefront can weaken discovery and premium identity.' },
    APPLE_TV: { shortName: 'APPLE TV+', catalog: 62, value: 72, technology: 96, local: 45, strengthLine: 'Premium technology and prestige originals punch above catalogue size.', audienceReason: 'Quality-focused viewers trust the polish and selective original slate.', weakSpot: 'A smaller library creates easy cancellation windows.' },
    HULU: { shortName: 'HULU', catalog: 77, value: 73, technology: 72, local: 40, strengthLine: 'Fast curation and television habit keep mature markets engaged.', audienceReason: 'Recent television and familiar comfort viewing make it habitual.', weakSpot: 'Its global footprint is far weaker than the largest services.' },
    YOUTUBE: { shortName: 'YOUTUBE', catalog: 68, value: 98, technology: 95, local: 96, strengthLine: 'Free reach, creators and live culture dominate daily attention.', audienceReason: 'It is free, personal, local and already part of everyday viewing.', weakSpot: 'Long-form premium identity and paid conversion remain inconsistent.' },
    REGIONAL: { fallbackName: 'Local & regional', fallbackColor: '#FFB020', shortName: 'LOCAL', catalog: 74, value: 84, technology: 62, local: 100, strengthLine: 'Language, broadcasters and local stars protect regional loyalty.', audienceReason: 'Local news, sport, drama and language feel made for the viewer.', weakSpot: 'Technology, capital and international catalogue depth vary widely.' },
    PLAYER: { fallbackName: 'Your platform', fallbackColor: '#8B5CF6', shortName: 'YOU', catalog: 20, value: 65, technology: 50, local: 35, strengthLine: 'Your promise, releases and operations decide what this becomes.', audienceReason: 'Early viewers are following the launch promise and opening slate.', weakSpot: 'A young service must prove it has a next watch after the first hit.' },
};

interface AudiencePlatformPresentation {
    name: string;
    color: string;
}

const getAudiencePlatformPresentation = (
    id: StreamingAudiencePlatformId,
    playerPresentation?: AudiencePlatformPresentation,
): AudiencePlatformPresentation => {
    if (id === 'PLAYER' && playerPresentation) return playerPresentation;
    const meta = PLATFORM_META[id];
    if (id === 'PLAYER' || id === 'REGIONAL') {
        return {
            name: meta.fallbackName || 'Streaming platform',
            color: meta.fallbackColor || '#858B96',
        };
    }
    const brand = resolveStreamingPlatformBrandById(id);
    return { name: brand.displayName, color: brand.primaryColor };
};

const REGION_ADOPTION: Record<StreamingDayOneRegionId, number> = {
    NORTH_AMERICA: 73,
    SOUTH_AMERICA: 61,
    EUROPE: 68,
    AFRICA: 32,
    ASIA: 48,
    OCEANIA: 76,
};

const REGIONAL_SERVICES: Record<StreamingDayOneRegionId, string[]> = {
    NORTH_AMERICA: ['Cable & broadcast apps', 'Sports networks', 'Studio bundles'],
    SOUTH_AMERICA: ['Local broadcasters', 'Football services', 'Telenovela libraries'],
    EUROPE: ['Public broadcasters', 'Sky-style bundles', 'National catch-up apps'],
    AFRICA: ['Mobile-first services', 'Local film platforms', 'Broadcaster apps'],
    ASIA: ['Regional super-apps', 'Anime & drama services', 'National broadcasters'],
    OCEANIA: ['Broadcaster catch-up', 'Sports bundles', 'Local premium services'],
};

const normaliseShares = (entries: StreamingAudienceShareEntry[]): StreamingAudienceShareEntry[] => {
    const total = Math.max(0.01, sum(entries.map(item => item.sharePercent)));
    const normalised = entries.map(item => ({ ...item, sharePercent: round1(item.sharePercent / total * 100) }));
    const difference = round1(100 - sum(normalised.map(item => item.sharePercent)));
    const largestIndex = normalised.reduce((best, item, index, all) => item.sharePercent > all[best].sharePercent ? index : best, 0);
    normalised[largestIndex] = {
        ...normalised[largestIndex],
        sharePercent: round1(normalised[largestIndex].sharePercent + difference),
    };
    return normalised.sort((left, right) => right.sharePercent - left.sharePercent);
};

const getRivalProfile = (rivals: OwnedStreamingRivalProfile[], id: StreamingAudiencePlatformId) => (
    rivals.find(rival => rival.platformId === id)
);

const getCountryAudienceReason = (market: StreamingDayOneMarket): string => {
    if (market.growth === 'FAST') return `Fast growth is driven by ${market.languages[0]} discovery, mobile viewing and new paying homes.`;
    if (market.competition === 'FIERCE') return 'Most homes already know several services, so watch time moves before subscriptions do.';
    if (market.languages.length > 1) return `Households move between global hits and ${market.languages.join(' / ')} viewing.`;
    return 'A stable streaming habit rewards a dependable catalogue and clear local value.';
};

const getCountryShares = (
    market: StreamingDayOneMarket,
    selectedForLaunch: boolean,
    playerSubscribers: number,
    playerPresentation: AudiencePlatformPresentation,
): StreamingAudienceShareEntry[] => {
    const playerShare = selectedForLaunch
        ? clamp(0.35 + Math.log10(Math.max(1, playerSubscribers + 1)) * 0.28, 0.35, 8.5)
        : 0;
    const known = market.rivals.map(rival => {
        const id = rival.id as StreamingAudiencePlatformId;
        const presentation = getAudiencePlatformPresentation(id);
        return {
            id,
            name: presentation.name,
            color: presentation.color,
            sharePercent: rival.watchSharePercent,
        };
    });
    const residual = Math.max(8, 100 - sum(known.map(item => item.sharePercent)) - playerShare);
    const regional = getAudiencePlatformPresentation('REGIONAL');
    return normaliseShares([
        ...known,
        { id: 'REGIONAL', name: regional.name, color: regional.color, sharePercent: residual },
        ...(playerShare > 0 ? [{ id: 'PLAYER' as const, name: playerPresentation.name, color: playerPresentation.color, sharePercent: playerShare }] : []),
    ]);
};

const buildCountry = (
    market: StreamingDayOneMarket,
    selectedMarketIds: Set<string>,
    playerSubscribers: number,
    weeksSinceFounding: number,
    playerPresentation: AudiencePlatformPresentation,
    canonicalPopulation?: number,
    canonicalAudience?: WorldAudienceCountryState,
    canonicalParticipation?: WorldAudienceParticipationCountryState,
    canonicalCompetition?: WorldStreamingCompetitionCountryState,
    canonicalCustomers?: WorldStreamingCustomerCountryState,
): StreamingAudienceCountryView => {
    const selectedForLaunch = selectedMarketIds.has(market.id);
    const adoption = clamp(
        REGION_ADOPTION[market.regionId]
        + (market.growth === 'FAST' ? -6 : market.growth === 'MATURE' ? 5 : 0)
        + Math.min(4, weeksSinceFounding / 104),
        22,
        88,
    );
    const estimatedPopulation = canonicalPopulation && canonicalPopulation > 0
        ? round(canonicalPopulation)
        : round(market.streamingAudience / (adoption / 100));
    const activeViewers = round(estimatedPopulation * adoption / 100);
    const estimatedSubscriptionsPerHousehold = round1(clamp(1.38 + adoption / 100 * 0.9 + (market.competition === 'FIERCE' ? 0.18 : 0), 1.3, 2.55));
    const estimatedPayingHouseholds = Math.min(
        canonicalAudience?.commercialHouseholds ?? Number.MAX_SAFE_INTEGER,
        round(activeViewers / (1.88 + adoption / 100 * 0.35)),
    );
    const payingHouseholds = canonicalCustomers?.payingHouseholds
        ?? canonicalCompetition?.subscribingHouseholds
        ?? estimatedPayingHouseholds;
    const paidSubscriptions = canonicalCustomers?.endingPaidAccounts
        ?? canonicalCompetition?.totalSubscriptions
        ?? round(payingHouseholds * estimatedSubscriptionsPerHousehold);
    const subscriptionsPerHousehold = round1(paidSubscriptions / Math.max(1, payingHouseholds));
    const watchShare = getCountryShares(market, selectedForLaunch, playerSubscribers, playerPresentation);
    const top = watchShare[0];
    const playerShare = watchShare.find(item => item.id === 'PLAYER')?.sharePercent || 0;
    const baseChurn = market.competition === 'FIERCE' ? 2.9 : market.competition === 'BUSY' ? 2.4 : 1.9;
    const annualFactor = 1 + market.annualGrowthPercent / 100;
    const trend = Array.from({ length: 12 }, (_, index) => {
        const monthsBack = 11 - index;
        return {
            label: `M${index + 1}`,
            value: round(market.streamingAudience / Math.pow(annualFactor, monthsBack / 12)),
        };
    });
    return {
        id: market.id,
        country: market.country,
        regionId: market.regionId,
        regionName: STREAMING_DAY_ONE_REGION_LABELS[market.regionId],
        selectedForLaunch,
        estimatedPopulation,
        streamingAdoptionPercent: round1(adoption),
        activeViewers,
        payingHouseholds,
        commercialHouseholds: canonicalAudience?.commercialHouseholds ?? payingHouseholds,
        nonParticipantHouseholds: canonicalAudience?.nonParticipantHouseholds ?? 0,
        averageMonthlyEntertainmentBudget: canonicalAudience?.averageMonthlyEntertainmentBudget ?? 0,
        budgetPressureIndex: canonicalAudience?.budgetPressureIndex ?? 0,
        streamingReachableHouseholds: canonicalParticipation?.streamingReachableHouseholds ?? 0,
        cinemaReachableHouseholds: canonicalParticipation?.cinemaReachableHouseholds ?? 0,
        streamingOnlyHouseholds: canonicalParticipation?.streamingOnlyHouseholds ?? 0,
        cinemaOnlyHouseholds: canonicalParticipation?.cinemaOnlyHouseholds ?? 0,
        dualParticipantHouseholds: canonicalParticipation?.dualParticipantHouseholds ?? 0,
        neitherHouseholds: canonicalParticipation?.neitherHouseholds ?? 0,
        topStreamingBarrier: PARTICIPATION_BARRIER_LABELS[canonicalParticipation?.topStreamingBarrierId ?? 'NONE'],
        topCinemaBarrier: PARTICIPATION_BARRIER_LABELS[canonicalParticipation?.topCinemaBarrierId ?? 'NONE'],
        paidSubscriptions,
        subscriptionsPerHousehold,
        annualGrowthPercent: market.annualGrowthPercent,
        weeklyWatchHours: round(activeViewers * (7.4 + adoption / 17)),
        churnPercent: round1(baseChurn),
        switchingPercent: round1(baseChurn * (market.competition === 'FIERCE' ? 1.65 : 1.35)),
        topPlatformName: top.name,
        topPlatformSharePercent: top.sharePercent,
        playerSharePercent: playerShare,
        watchShare,
        trend,
        audienceReason: getCountryAudienceReason(market),
        regionalServices: REGIONAL_SERVICES[market.regionId],
    };
};

const buildGlobalShare = (countries: StreamingAudienceCountryView[]): StreamingAudienceShareEntry[] => {
    const weighted = new Map<StreamingAudiencePlatformId, { name: string; color: string; hours: number }>();
    countries.forEach(country => country.watchShare.forEach(platform => {
        const current = weighted.get(platform.id) || { name: platform.name, color: platform.color, hours: 0 };
        current.hours += country.weeklyWatchHours * platform.sharePercent / 100;
        weighted.set(platform.id, current);
    }));
    const totalHours = Math.max(1, sum(Array.from(weighted.values()).map(item => item.hours)));
    return normaliseShares(Array.from(weighted.entries()).map(([id, item]) => ({
        id,
        name: item.name,
        color: item.color,
        sharePercent: item.hours / totalHours * 100,
    })));
};

const buildGlobalTrend = (
    absoluteWeek: number,
    weeksSinceFounding: number,
    currentPopulation: number,
    currentAdoption: number,
    subscriptionsPerHousehold: number,
): StreamingAudienceTrendPoint[] => Array.from({ length: 26 }, (_, index) => {
    const weeksBack = (25 - index) * 2;
    const historicalWeek = Math.max(0, weeksSinceFounding - weeksBack);
    const population = currentPopulation / Math.pow(1.0085, weeksBack / 52);
    const adoption = clamp(currentAdoption - weeksBack / 52 * 1.65, 20, currentAdoption);
    const activeViewers = population * adoption / 100;
    const payingHouseholds = activeViewers / (2.42 - adoption / 235);
    return {
        label: `WK ${Math.max(0, absoluteWeek - weeksBack)}`,
        absoluteWeek: Math.max(0, absoluteWeek - weeksBack),
        population: round(population),
        streamingAdoptionPercent: round1(adoption),
        activeViewers: round(activeViewers),
        payingHouseholds: round(payingHouseholds),
        paidSubscriptions: round(payingHouseholds * clamp(subscriptionsPerHousehold - (weeksSinceFounding - historicalWeek) / 260, 1.25, subscriptionsPerHousehold)),
    };
});

const buildPersonas = (
    activeViewers: number,
    audienceEconomy: WorldAudienceEconomyState,
): StreamingAudiencePersonaView[] => {
    const definitions: Array<Omit<StreamingAudiencePersonaView, 'activeViewers' | 'averageMonthlyEntertainmentBudget'>> = [
        { id: 'FAMILY_HOUSEHOLDS', name: 'Family households', sharePercent: 23, weeklyHours: 14.8, subscriptionsPerHousehold: 2.3, switchSensitivity: 'MEDIUM', color: resolveStreamingPlatformBrandById('DISNEY_PLUS').primaryColor, need: 'Safe profiles, familiar brands and something for every age.', leavesWhen: 'The children outgrow the catalogue or price rises without new family hits.', bestFitPlatform: 'Disney+' },
        { id: 'VALUE_SEEKERS', name: 'Value seekers', sharePercent: 19, weeklyHours: 10.4, subscriptionsPerHousehold: 1.5, switchSensitivity: 'HIGH', color: resolveStreamingPlatformBrandById('AMAZON_PRIME').primaryColor, need: 'A clear price, bundle value and enough popular entertainment.', leavesWhen: 'A rival bundle is cheaper or the service goes quiet for a month.', bestFitPlatform: 'Prime Video' },
        { id: 'FANDOM_LOYALISTS', name: 'Fandom loyalists', sharePercent: 16, weeklyHours: 17.1, subscriptionsPerHousehold: 2.1, switchSensitivity: 'LOW', color: '#ff4d7d', need: 'Universes, weekly conversation and a reason to stay between chapters.', leavesWhen: 'A franchise stalls or loses the characters they follow.', bestFitPlatform: 'Disney+' },
        { id: 'PRESTIGE_EXPLORERS', name: 'Prestige explorers', sharePercent: 12, weeklyHours: 8.8, subscriptionsPerHousehold: 2.4, switchSensitivity: 'HIGH', color: resolveStreamingPlatformBrandById('APPLE_TV').primaryColor, need: 'Acclaimed originals, bold creators and a premium experience.', leavesWhen: 'They finish the one title they joined for.', bestFitPlatform: 'Apple TV+' },
        { id: 'LOCAL_FIRST', name: 'Local-first viewers', sharePercent: 17, weeklyHours: 13.6, subscriptionsPerHousehold: 1.7, switchSensitivity: 'MEDIUM', color: '#ffb020', need: 'Their language, local stars, sport and culturally precise discovery.', leavesWhen: 'The home page feels imported or localization is careless.', bestFitPlatform: 'Local & regional' },
        { id: 'HABIT_STREAMERS', name: 'Habit streamers', sharePercent: 13, weeklyHours: 21.2, subscriptionsPerHousehold: 2.7, switchSensitivity: 'LOW', color: resolveStreamingPlatformBrandById('NETFLIX').primaryColor, need: 'A constant next watch and recommendations that reduce effort.', leavesWhen: 'Discovery becomes repetitive or playback trust breaks.', bestFitPlatform: 'Netflix' },
    ];
    const canonicalShares = getWorldAudiencePersonaShares(audienceEconomy);
    return definitions.map(item => {
        const canonical = canonicalShares.find(entry => entry.id === item.id);
        const sharePercent = canonical?.sharePercent ?? item.sharePercent;
        return {
            ...item,
            sharePercent,
            activeViewers: round(activeViewers * sharePercent / 100),
            averageMonthlyEntertainmentBudget: canonical?.averageMonthlyEntertainmentBudget ?? 0,
        };
    });
};

const buildPlatformViews = (
    player: Player,
    countries: StreamingAudienceCountryView[],
    globalWatchShare: StreamingAudienceShareEntry[],
    payingHouseholds: number,
): StreamingAudiencePlatformView[] => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const rivals = platform.competitiveWorld.rivals;
    const platformIds: StreamingAudiencePlatformId[] = ['NETFLIX', 'DISNEY_PLUS', 'AMAZON_PRIME', 'YOUTUBE', 'APPLE_TV', 'HULU', 'REGIONAL', 'PLAYER'];
    const worldSubscribers = player.world.platforms;
    return platformIds.map(id => {
        const meta = PLATFORM_META[id];
        const presentation = getAudiencePlatformPresentation(id, {
            name: platform.identity?.name || PLATFORM_META.PLAYER.fallbackName || 'Your platform',
            color: platform.identity?.primaryColor || PLATFORM_META.PLAYER.fallbackColor || '#8B5CF6',
        });
        const rival = getRivalProfile(rivals, id);
        const world = id === 'AMAZON_PRIME' || id === 'REGIONAL' || id === 'PLAYER'
            ? null
            : worldSubscribers?.[id as PlatformId];
        const subscribers = id === 'PLAYER'
            ? platform.metrics.subscribers
            : id === 'AMAZON_PRIME'
                ? 215_000_000
                : id === 'REGIONAL'
                    ? round(payingHouseholds * 0.44)
                    : round((rival?.subscribersMillions ?? world?.subscribers ?? 1) * 1_000_000);
        const share = globalWatchShare.find(item => item.id === id)?.sharePercent || 0;
        const catalog = id === 'PLAYER' ? clamp(18 + platform.catalogProjectIds.length * 3 + platform.originalCommissions.length * 5, 18, 100) : rival?.catalogPower ?? meta.catalog;
        const technology = id === 'PLAYER' ? clamp(platform.metrics.technologyHealth || 45, 25, 100) : rival?.technology ?? meta.technology;
        const local = id === 'PLAYER' ? clamp(25 + countries.filter(item => item.selectedForLaunch).length * 4, 25, 92) : meta.local;
        const globalStrength = round(clamp(share * 2 + catalog * .24 + meta.value * .2 + technology * .18 + local * .12, 0, 100));
        const previousShare = platform.competitiveWorld.marketShareHistory.at(-2)?.entries.find(item => item.id === id)?.sharePercent;
        const latestShare = platform.competitiveWorld.marketShareHistory.at(-1)?.entries.find(item => item.id === id)?.sharePercent;
        const momentum = previousShare !== undefined && latestShare !== undefined
            ? latestShare > previousShare + .15 ? 'RISING' as const : latestShare < previousShare - .15 ? 'FALLING' as const : 'STEADY' as const
            : id === 'PLAYER' && platform.metrics.netSubscriberMovement > 0 ? 'RISING' as const : 'STEADY' as const;
        return {
            id,
            name: presentation.name,
            shortName: id === 'PLAYER' ? 'YOU' : meta.shortName,
            color: presentation.color,
            subscribers,
            watchSharePercent: share,
            householdReachPercent: round1(clamp(subscribers / Math.max(1, payingHouseholds) * 100, 0, 100)),
            globalStrength,
            catalogStrength: round(catalog),
            valueStrength: id === 'PLAYER' ? round(clamp(62 + platform.metrics.averageRevenuePerUser * .8, 45, 90)) : meta.value,
            technologyStrength: round(technology),
            localStrength: round(local),
            momentum,
            strengthLine: meta.strengthLine,
            audienceReason: meta.audienceReason,
            weakSpot: meta.weakSpot,
        };
    }).sort((left, right) => right.watchSharePercent - left.watchSharePercent);
};

export const getStreamingAudienceMarket = (player: Player): StreamingAudienceMarketView => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const foundedAt = platform.identity?.foundedAtAbsoluteWeek ?? absoluteWeek;
    const weeksSinceFounding = Math.max(0, absoluteWeek - foundedAt);
    const selectedMarketIds = new Set(platform.identity?.dayOneMarketIds || platform.foundingDraft?.dayOneMarketIds || []);
    const playerPresentation = getAudiencePlatformPresentation('PLAYER', {
        name: platform.identity?.name || PLATFORM_META.PLAYER.fallbackName || 'Your platform',
        color: platform.identity?.primaryColor || PLATFORM_META.PLAYER.fallbackColor || '#8B5CF6',
    });
    const worldPopulation = normalizeWorldPopulationState(player.world?.worldPopulation, absoluteWeek);
    const worldAudienceEconomy = normalizeWorldAudienceEconomyState(
        player.world?.worldAudienceEconomy,
        worldPopulation,
        absoluteWeek,
    );
    const worldAudienceParticipation = normalizeWorldAudienceParticipationState(
        player.world?.worldAudienceParticipation,
        worldPopulation,
        worldAudienceEconomy,
        absoluteWeek,
    );
    const worldStreamingCompetition = normalizeWorldStreamingCompetitionState(
        player.world?.worldStreamingCompetition,
        {
            ...player,
            world: {
                ...player.world,
                worldPopulation,
                worldAudienceEconomy,
                worldAudienceParticipation,
            },
        },
        absoluteWeek,
    );
    const worldStreamingCustomers = player.world?.worldStreamingCustomers?.lastProcessedAbsoluteWeek === absoluteWeek
        ? player.world.worldStreamingCustomers
        : null;
    const countries = STREAMING_DAY_ONE_MARKETS.map(market => buildCountry(
        market,
        selectedMarketIds,
        platform.metrics.subscribers,
        weeksSinceFounding,
        playerPresentation,
        worldPopulation.countries[market.id]?.population,
        worldAudienceEconomy.countries[market.id],
        worldAudienceParticipation.countries[market.id],
        worldStreamingCompetition.countries[market.id],
        worldStreamingCustomers?.countries[market.id],
    ));
    const population = worldPopulation.global.population;
    const adoption = round1(clamp(48.6 + weeksSinceFounding / 52 * 1.65, 35, 78));
    const activeViewers = worldStreamingCustomers
        ? worldStreamingCustomers.global.activeViewers
            + worldStreamingCustomers.global.sharedActiveViewers
            + worldStreamingCustomers.global.piracyReach
        : round(population * adoption / 100);
    const payingHouseholds = worldStreamingCustomers?.global.payingHouseholds
        ?? worldStreamingCompetition.global.subscribingHouseholds;
    const paidSubscriptions = worldStreamingCustomers?.global.endingPaidAccounts
        ?? worldStreamingCompetition.global.totalSubscriptions;
    const subscriptionsPerHousehold = round1(paidSubscriptions / Math.max(1, payingHouseholds));
    const weeklyWatchHours = round(activeViewers * (10.2 + adoption / 15));
    const threePlus = round1(clamp((subscriptionsPerHousehold - 1.55) * 29, 7, 30));
    const two = round1(clamp(35 + (subscriptionsPerHousehold - 1.8) * 18, 30, 48));
    const one = round1(100 - two - threePlus);
    const globalWatchShare = buildGlobalShare(countries);
    const latest = platform.weeklyHistory.at(-1);
    const operations = latest?.operations;
    const playerChurnPercent = round1((latest?.churnRate ?? platform.metrics.churnRate) * 100);
    const cancelled = operations?.cancellations ?? round(platform.metrics.subscribers * (platform.metrics.churnRate || .02));
    const joined = operations?.joinedSubscribers ?? Math.max(0, platform.metrics.netSubscriberMovement + cancelled);
    const reactivated = operations?.reactivations ?? round(cancelled * .12);
    const switched = operations?.worldCustomerSwitchIns ?? round((joined + cancelled) * .46);
    const reasonLabels: Record<WorldStreamingCustomerReasonId, { label: string; detail: string }> = {
        PRICE: { label: 'Price & affordability', detail: 'The plan no longer fits the household budget or a rival offers clearer value.' },
        PLAN_VALUE: { label: 'Plan value', detail: 'Features, screens and the chosen tier changed the value of staying.' },
        CATALOGUE: { label: 'Catalogue depth', detail: 'The household could not see enough reasons to keep this service.' },
        RELEASE: { label: 'New release', detail: 'A new premiere brought lapsed or new households into the service.' },
        LOCALIZATION: { label: 'Local fit', detail: 'Language and cultural access changed which service felt useful.' },
        RELIABILITY: { label: 'Playback trust', detail: 'Reliability and access quality changed the household decision.' },
        MARKETING: { label: 'Discovery', detail: 'Promotion made the service or its next watch more visible.' },
        COMPETITOR: { label: 'Platform switch', detail: 'A competing service won the household slot this week.' },
        PROMO_EXPIRY: { label: 'Offer expired', detail: 'The introductory value ended and the household reconsidered the bill.' },
        ROTATION: { label: 'Subscription rotation', detail: 'The household rotated a secondary service after finishing its current watch.' },
        ECONOMY: { label: 'Household economy', detail: 'Changes in disposable entertainment budget reduced paid access.' },
        SHARING_POLICY: { label: 'Sharing policy', detail: 'Account-access rules changed the balance between reach and retention.' },
        PIRACY_ACCESS: { label: 'Piracy access', detail: 'Affordability or access gaps pushed viewing outside paid services.' },
        OTHER: { label: 'Other pressure', detail: 'Several smaller factors combined to change the household decision.' },
    };
    const playerMovementReasons = worldStreamingCustomers
        ? worldStreamingCustomers.recentMovements.filter(movement => (
            movement.absoluteWeek === absoluteWeek
            && (movement.sourcePlatformId === 'PLAYER' || movement.destinationPlatformId === 'PLAYER')
        ))
        : [];
    const reasonTotals = new Map<WorldStreamingCustomerReasonId, number>();
    playerMovementReasons.forEach(movement => reasonTotals.set(
        movement.reasonId,
        (reasonTotals.get(movement.reasonId) || 0) + movement.households,
    ));
    const reasonTotal = Math.max(1, [...reasonTotals.values()].reduce((total, value) => total + value, 0));
    const canonicalReasons = [...reasonTotals.entries()]
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .slice(0, 5)
        .map(([id, households]) => ({
            id,
            label: reasonLabels[id].label,
            sharePercent: round1(households / reasonTotal * 100),
            detail: reasonLabels[id].detail,
        }));
    const switchingReasons = canonicalReasons.length ? canonicalReasons : [
        { id: 'PRICE', label: 'Price & bundles', sharePercent: 31, detail: 'Homes rotate toward a cheaper plan or a bundle they already pay for.' },
        { id: 'NEXT_WATCH', label: 'Nothing next', sharePercent: 27, detail: 'A viewer finishes the title they joined for and cannot see the next reason to stay.' },
        { id: 'RIVAL_HIT', label: 'Rival premiere', sharePercent: 19, detail: 'A major release shifts watch time first, then the household subscription.' },
        { id: 'LOCAL_FIT', label: 'Local fit', sharePercent: 13, detail: 'Language, payment, sport or local storytelling feels stronger elsewhere.' },
        { id: 'TRUST', label: 'Playback & trust', sharePercent: 10, detail: 'Buffering, outages or weak account trust turn frustration into cancellation.' },
    ];
    return {
        generatedAtAbsoluteWeek: absoluteWeek,
        weeksSinceFounding,
        gameWorldNotice: 'A stable game-world simulation. It changes with game weeks and platform decisions, not live real-world data.',
        globalPopulation: population,
        streamingAdoptionPercent: adoption,
        activeViewers,
        payingHouseholds,
        paidSubscriptions,
        subscriptionsPerHousehold,
        householdEconomy: {
            commercialHouseholds: worldAudienceEconomy.global.commercialHouseholds,
            nonParticipantHouseholds: worldAudienceEconomy.global.nonParticipantHouseholds,
            nonParticipantPercent: round1(
                worldAudienceEconomy.global.nonParticipantHouseholds
                / Math.max(1, worldAudienceEconomy.global.households)
                * 100,
            ),
            averageMonthlyEntertainmentBudget: worldAudienceEconomy.global.averageMonthlyEntertainmentBudget,
            totalMonthlyEntertainmentBudget: worldAudienceEconomy.global.totalMonthlyEntertainmentBudget,
        },
        industryParticipation: {
            streamingReachableHouseholds: worldAudienceParticipation.global.streamingReachableHouseholds,
            cinemaReachableHouseholds: worldAudienceParticipation.global.cinemaReachableHouseholds,
            streamingOnlyHouseholds: worldAudienceParticipation.global.streamingOnlyHouseholds,
            cinemaOnlyHouseholds: worldAudienceParticipation.global.cinemaOnlyHouseholds,
            dualParticipantHouseholds: worldAudienceParticipation.global.dualParticipantHouseholds,
            neitherHouseholds: worldAudienceParticipation.global.neitherHouseholds,
            totalMonthlyStreamingBudget: worldAudienceParticipation.global.totalMonthlyStreamingBudget,
            totalMonthlyCinemaBudget: worldAudienceParticipation.global.totalMonthlyCinemaBudget,
        },
        streamingCompetition: {
            subscribingHouseholds: worldStreamingCompetition.global.subscribingHouseholds,
            unclaimedHouseholds: worldStreamingCompetition.global.unclaimedHouseholds,
            totalSubscriptions: worldStreamingCompetition.global.totalSubscriptions,
            totalMonthlySubscriptionSpend: worldStreamingCompetition.global.totalMonthlySubscriptionSpend,
            playerHouseholds: worldStreamingCompetition.global.playerHouseholds,
            playerPrimaryHouseholds: worldStreamingCompetition.global.playerPrimaryHouseholds,
            playerMonthlySubscriptionRevenue: worldStreamingCompetition.global.playerMonthlySubscriptionRevenue,
            playerEffectiveMonthlyPrice: round1(
                worldStreamingCompetition.global.playerMonthlySubscriptionRevenue
                / Math.max(1, worldStreamingCompetition.global.playerHouseholds),
            ),
            playerPlanAllocations: worldStreamingCompetition.global.playerPlanAllocations.map(row => ({ ...row })),
            playerOfferPresent: worldStreamingCompetition.global.playerOfferPresent,
            offerCount: worldStreamingCompetition.global.offerCount,
        },
        customerAccess: {
            available: Boolean(worldStreamingCustomers),
            paidAccounts: worldStreamingCustomers?.global.playerEndingPaidAccounts ?? platform.metrics.subscribers,
            payingHouseholds: worldStreamingCustomers?.global.playerPayingHouseholds ?? platform.metrics.subscribers,
            externalSharedHouseholds: worldStreamingCustomers?.global.playerExternalSharedHouseholds ?? 0,
            sharedActiveViewers: worldStreamingCustomers?.global.playerSharedActiveViewers ?? 0,
            piracyReach: worldStreamingCustomers?.global.playerPiracyReach ?? 0,
            accessLoadAccounts: worldStreamingCustomers?.global.playerAccessLoadAccounts ?? platform.metrics.subscribers,
            monthlySubscriptionRevenue: worldStreamingCustomers?.global.playerMonthlySubscriptionRevenue ?? 0,
            upgrades: worldStreamingCustomers?.global.playerUpgrades ?? 0,
            downgrades: worldStreamingCustomers?.global.playerDowngrades ?? 0,
            switchIns: worldStreamingCustomers?.global.playerSwitchIns ?? 0,
            switchOuts: worldStreamingCustomers?.global.playerSwitchOuts ?? 0,
            planAllocations: worldStreamingCustomers?.global.playerPlanAllocations.map(row => ({ ...row })) ?? [],
        },
        weeklyWatchHours,
        subscriberOverlap: { oneServicePercent: one, twoServicesPercent: two, threePlusPercent: threePlus },
        globalTrend: buildGlobalTrend(absoluteWeek, weeksSinceFounding, population, adoption, subscriptionsPerHousehold),
        globalWatchShare,
        countries,
        platforms: buildPlatformViews(player, countries, globalWatchShare, payingHouseholds),
        personas: buildPersonas(activeViewers, worldAudienceEconomy),
        switching: {
            joinedThisWeek: joined,
            cancelledThisWeek: cancelled,
            reactivatedThisWeek: reactivated,
            switchedPlatformThisWeek: switched,
            upgradedThisWeek: operations?.worldCustomerUpgrades ?? 0,
            downgradedThisWeek: operations?.worldCustomerDowngrades ?? 0,
            globalSwitchPool: round(payingHouseholds * .021),
            playerChurnPercent,
            reasons: switchingReasons,
        },
    };
};
