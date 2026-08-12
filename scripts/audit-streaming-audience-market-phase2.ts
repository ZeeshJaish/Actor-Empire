import { INITIAL_PLAYER, createInitialOwnedStreamingPlatformState, type Player } from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { getStreamingAudienceMarket } from '../services/streamingAudienceMarket';
import { createCanonicalAudienceState } from '../components/streaming-transplant/createCanonicalStreamingPresentation';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const player = structuredClone(INITIAL_PLAYER) as Player;
const absoluteWeek = getAbsoluteWeek(36, 24);
const initial = createInitialOwnedStreamingPlatformState('audience-phase2');
const fixture: Player = {
    ...player,
    id: 'audience-phase2',
    age: 36,
    currentWeek: 24,
    ownedStreamingPlatform: {
        ...initial,
        lifecycle: 'ACTIVE',
        identity: {
            name: 'Northstar+',
            slug: 'northstar-plus',
            primaryColor: '#7c5cff',
            secondaryColor: '#090b14',
            logoKey: 'SIGNAL_RING',
            soundIdentKey: 'ASCENT',
            brandPromiseId: 'EVERYONES_SCREEN',
            publicManifesto: 'One screen. Every generation.',
            dayOneMarketIds: ['US', 'CA', 'MX', 'GB'],
            launchServerCityId: null,
            foundedAtAbsoluteWeek: absoluteWeek - 26,
        },
        launchCommit: {
            id: 'audience-launch',
            idempotencyKey: 'audience-launch',
            committedAtAbsoluteWeek: absoluteWeek - 10,
            capacityPlan: 'STANDARD',
            capacityPlanCost: 0,
            readinessScore: 84,
            forecastLikelyConcurrentStreams: 900_000,
            forecastHighConcurrentStreams: 1_400_000,
            protectedPeakConcurrentStreams: 2_000_000,
            launchHeadroomPercent: 42,
            initialSubscribers: 820_000,
            openingDemandIndex: 76,
            playbackSuccessRate: 99.4,
            outcomeTier: 'SMOOTH_OPENING',
            openingTitleCount: 8,
            openingOriginalTitle: 'Midnight Signal',
        },
        metrics: {
            ...initial.metrics,
            subscribers: 1_240_000,
            netSubscriberMovement: 28_400,
            churnRate: .023,
            engagementRate: .67,
            averageRevenuePerUser: 9.4,
            technologyHealth: 88,
        },
        weeklyHistory: [{
            id: 'audience-week',
            absoluteWeek,
            subscribers: 1_240_000,
            netSubscriberMovement: 28_400,
            churnRate: .023,
            engagementRate: .67,
            averageRevenuePerUser: 9.4,
            cashRunwayWeeks: 20,
            technologyHealth: 88,
            causeMarkers: ['fixture'],
            operations: {
                programWeek: 10,
                releaseTitles: [],
                joinedSubscribers: 64_000,
                cancellations: 31_000,
                reactivations: 5_400,
                subscriptionRevenue: 0,
                partnerRevenueShareCost: 0,
                infrastructureCost: 0,
                leadershipCost: 0,
                financingCost: 0,
                weeklyPlanCost: 0,
                totalCashCost: 0,
                netCashContribution: 0,
                contentAmortization: 0,
                accountingContribution: 0,
                peakConcurrentStreams: 0,
                capacityUtilizationPercent: 0,
                playbackSuccessRate: 99.4,
                appliedDecisionId: null,
                headline: 'Audience fixture',
                summary: 'Audience fixture',
                nextWeekHook: 'Audience fixture',
                causalDrivers: [],
            },
        }],
    },
};

const before = JSON.stringify(fixture);
const first = getStreamingAudienceMarket(fixture);
const second = getStreamingAudienceMarket(fixture);
const audienceDesk = createCanonicalAudienceState(fixture);

assert(JSON.stringify(first) === JSON.stringify(second), 'Living Audience must be deterministic when the canonical save has not changed.');
assert(JSON.stringify(fixture) === before, 'Reading Market Command must never mutate the player or owned platform save.');
assert(first.globalPopulation > 8_000_000_000, 'The global simulation should model the whole game-world population.');
assert(first.streamingAdoptionPercent > 30 && first.streamingAdoptionPercent < 90, 'Streaming adoption should remain a meaningful percentage, not a raw subscriber count.');
assert(first.activeViewers > first.payingHouseholds, 'Active viewers should exceed paying households.');
assert(first.paidSubscriptions > first.payingHouseholds, 'Multiple subscriptions per household must be represented.');
assert(first.subscriptionsPerHousehold > 1, 'Average paid subscriptions per household must be above one.');
assert(Math.abs(
    first.subscriberOverlap.oneServicePercent
    + first.subscriberOverlap.twoServicesPercent
    + first.subscriberOverlap.threePlusPercent
    - 100
) < .01, 'Subscriber-overlap groups must resolve to 100%.');
assert(first.globalTrend.length === 26, 'The global graph should expose 52 weeks as 26 two-week points.');
assert(first.countries.length >= 24, 'Every Phase 1 country market should feed Market Command.');
assert(first.countries.find(country => country.id === 'US')?.selectedForLaunch, 'Phase 1 opening markets must remain marked in Phase 2.');
assert(!first.countries.find(country => country.id === 'JP')?.selectedForLaunch, 'Unselected countries must remain rival markets, not silently open.');
assert(first.countries.every(country => Math.abs(country.watchShare.reduce((total, item) => total + item.sharePercent, 0) - 100) < .11), 'Every country watch-time board must resolve to 100%.');
assert(Math.abs(first.globalWatchShare.reduce((total, item) => total + item.sharePercent, 0) - 100) < .11, 'Global watch-time share must resolve to 100%.');
assert(first.platforms.some(platform => platform.id === 'AMAZON_PRIME'), 'Prime Video-style bundle strength must exist in the rival market.');
assert(first.platforms.some(platform => platform.id === 'REGIONAL'), 'Regional services and broadcasters must have a modeled market position.');
assert(first.platforms.some(platform => platform.id === 'PLAYER'), 'The player platform must appear on the same canonical rival board.');
assert(first.personas.length === 6 && first.personas.reduce((total, persona) => total + persona.sharePercent, 0) === 100, 'Audience personas must cover the full active-viewer market.');
assert(first.switching.joinedThisWeek === 64_000 && first.switching.cancelledThisWeek === 31_000, 'Market Command must read weekly joins and cancellations from the canonical CEO loop.');
assert(first.switching.reactivatedThisWeek === 5_400, 'Market Command must read canonical reactivations rather than estimating over saved operations.');
assert(first.switching.reasons.reduce((total, reason) => total + reason.sharePercent, 0) === 100, 'Platform-switching reasons must resolve to 100%.');
assert(audienceDesk.live, 'The ZIP Audience desk adapter must open its live analytics state for a launched platform.');
assert(audienceDesk.regions.length === 2, 'The ZIP Audience desk must aggregate the selected Day-One countries into canonical launch regions.');
assert(audienceDesk.regions.every(region => region.rivals.length > 0), 'Audience territory cards must read leading rivals from the living market.');

console.log('Streaming Phase 2 Living Audience and Rival Market audit passed.');
