import { strict as assert } from 'node:assert';
import { ActiveRelease, Business, Player } from '../types';
import { resolveRareHollywoodChaos } from '../services/rareHollywoodChaos';

const makeRelease = (overrides: Partial<ActiveRelease> = {}): ActiveRelease => ({
    id: 'chaos_project',
    name: 'Neon Crown',
    type: 'MOVIE',
    roleType: 'LEAD',
    projectDetails: {
        title: 'Neon Crown',
        type: 'MOVIE',
        description: 'A troubled legacy property.',
        studioId: 'CHEAT_STUDIO',
        subtype: 'SEQUEL',
        genre: 'ACTION',
        budgetTier: 'HIGH',
        estimatedBudget: 120_000_000,
        visibleHype: 'HIGH',
        hiddenStats: {
            scriptQuality: 70,
            directorQuality: 72,
            castingStrength: 74,
            distributionPower: 68,
            rawHype: 78,
            qualityScore: 71,
            prestigeBonus: 2
        },
        directorName: 'Avery Stone',
        visibleDirectorTier: 'Established',
        visibleScriptBuzz: 'Strong',
        visibleCastStrength: 'Recognizable',
        franchiseId: 'neon_crown_franchise',
        installmentNumber: 2
    },
    distributionPhase: 'THEATRICAL',
    weekNum: 5,
    weeklyGross: [34_000_000, 18_000_000, 9_000_000],
    totalGross: 145_000_000,
    budget: 120_000_000,
    status: 'RUNNING',
    imdbRating: 6.7,
    productionPerformance: 70,
    ...overrides
});

const makeStudio = (overrides: Partial<Business> = {}): Business => ({
    id: 'CHEAT_STUDIO',
    name: 'Empire Test Studios',
    type: 'PRODUCTION_HOUSE',
    subtype: 'MAJOR_STUDIO',
    logo: '🎬',
    color: '#111827',
    foundedWeek: 1,
    balance: 500_000_000,
    isActive: true,
    config: {
        quality: 'PREMIUM',
        pricing: 'MARKET',
        marketing: 'HIGH'
    },
    stats: {
        weeklyRevenue: 0,
        weeklyExpenses: 0,
        weeklyProfit: 0,
        lifetimeRevenue: 0,
        valuation: 600_000_000,
        brandHealth: 70,
        customerSatisfaction: 70,
        riskLevel: 30,
        hype: 65,
        studioMomentum: 55,
        investorConfidence: 55,
        recentHitStreak: 0,
        recentFlopStreak: 0,
        recentReleaseOutcomes: [],
        processedReleaseOutcomeIds: []
    },
    staff: [],
    products: [],
    hiringPool: [],
    lastHiringRefreshWeek: 1,
    history: [],
    studioState: {
        scripts: [],
        concepts: [],
        writers: [],
        ipMarket: [],
        lastMarketRefreshWeek: 1,
        lastWriterRefreshWeek: 1,
        lockedStreamingFunds: []
    },
    ...overrides
});

const makePlayer = (studio = makeStudio()): Player => ({
    id: 'player',
    name: 'QA Player',
    age: 30,
    currentWeek: 22,
    businesses: [studio],
    world: {
        platforms: {
            NETFLIX: { id: 'NETFLIX', name: 'Netflix', subscribers: 260, valuation: 260, reputation: 80, cashReserve: 5000, recentHits: 0, color: 'text-red-600', churnRate: 'FAST' },
            APPLE_TV: { id: 'APPLE_TV', name: 'Apple TV+', subscribers: 45, valuation: 2900, reputation: 95, cashReserve: 20000, recentHits: 0, color: 'text-zinc-400', churnRate: 'SLOW' },
            DISNEY_PLUS: { id: 'DISNEY_PLUS', name: 'Disney+', subscribers: 150, valuation: 180, reputation: 85, cashReserve: 8000, recentHits: 0, color: 'text-blue-500', churnRate: 'SLOW' },
            HULU: { id: 'HULU', name: 'Hulu', subscribers: 48, valuation: 27, reputation: 75, cashReserve: 2000, recentHits: 0, color: 'text-emerald-500', churnRate: 'MEDIUM' },
            YOUTUBE: { id: 'YOUTUBE', name: 'YouTube', subscribers: 2500, valuation: 1800, reputation: 60, cashReserve: 15000, recentHits: 0, color: 'text-red-500', churnRate: 'FAST' }
        }
    }
} as Player);

const flopSequel = resolveRareHollywoodChaos({
    release: makeRelease(),
    player: makePlayer(),
    isPlayerProduction: true,
    forcedKind: 'FLOP_SEQUEL_GAMBLE',
    random: () => 0
});

assert.equal(flopSequel?.kind, 'FLOP_SEQUEL_GAMBLE');
assert.equal(flopSequel?.futurePotentialPatch.isSequelGreenlit, true);
assert.match(flopSequel?.news.headline || '', /doubles down|sequel/i);

const cultSeries = makeRelease({
    id: 'cult_series',
    name: 'Midnight Borough',
    type: 'SERIES',
    totalGross: 0,
    budget: 42_000_000,
    imdbRating: 8.5,
    productionPerformance: 82,
    streamingRevenue: 15_000_000,
    streaming: {
        platformId: 'HULU',
        weekOnPlatform: 8,
        totalViews: 24_000_000,
        weeklyViews: [5_000_000, 4_700_000, 4_400_000, 4_200_000],
        isLeaving: false
    },
    projectDetails: {
        ...makeRelease().projectDetails,
        title: 'Midnight Borough',
        type: 'SERIES',
        subtype: 'STANDALONE',
        genre: 'DRAMA',
        franchiseId: undefined,
        installmentNumber: 1,
        hiddenStats: {
            ...makeRelease().projectDetails.hiddenStats,
            platformId: 'HULU',
            rawHype: 68
        }
    }
});

const revival = resolveRareHollywoodChaos({
    release: cultSeries,
    player: makePlayer(),
    isPlayerProduction: false,
    forcedKind: 'CANCELLED_SHOW_REVIVAL',
    random: () => 0
});

assert.equal(revival?.kind, 'CANCELLED_SHOW_REVIVAL');
assert.equal(revival?.futurePotentialPatch.isRenewed, true);
assert.notEqual(revival?.platformId, 'HULU', 'A revival should move to a different platform when possible.');

const moonshotSeries = makeRelease({
    ...cultSeries,
    id: 'moonshot_series',
    name: 'Last Light District',
    budget: 110_000_000,
    imdbRating: 6.4,
    productionPerformance: 66,
    streamingRevenue: 24_000_000,
    streaming: {
        platformId: 'NETFLIX',
        weekOnPlatform: 6,
        totalViews: 11_000_000,
        weeklyViews: [4_000_000, 2_600_000, 1_800_000, 1_400_000],
        isLeaving: false
    },
    projectDetails: {
        ...cultSeries.projectDetails,
        title: 'Last Light District',
        hiddenStats: {
            ...cultSeries.projectDetails.hiddenStats,
            platformId: 'NETFLIX',
            rawHype: 76
        }
    }
});

const moonshot = resolveRareHollywoodChaos({
    release: moonshotSeries,
    player: makePlayer(),
    isPlayerProduction: true,
    forcedKind: 'PLATFORM_MOONSHOT',
    random: () => 0.5
});

assert.equal(moonshot?.kind, 'PLATFORM_MOONSHOT');
assert.equal(moonshot?.funding?.tier, 'RISKY_BET');
assert.ok((moonshot?.funding?.amount || 0) > 0);
assert.ok((moonshot?.funding?.amount || 0) <= moonshotSeries.budget * 1.05, 'A moonshot must still have a hard anti-exploit cap.');

const reboot = resolveRareHollywoodChaos({
    release: makeRelease({
        id: 'reboot_project',
        totalGross: 75_000_000,
        imdbRating: 5.7,
        productionPerformance: 54
    }),
    player: makePlayer(),
    isPlayerProduction: false,
    forcedKind: 'STUDIO_REBOOT_GAMBLE',
    random: () => 0
});

assert.equal(reboot?.kind, 'STUDIO_REBOOT_GAMBLE');
assert.equal(reboot?.continuationSubtype, 'REBOOT');
assert.equal(reboot?.futurePotentialPatch.isSequelGreenlit, true);

const ordinaryFlop = makeRelease({
    id: 'ordinary_flop',
    projectDetails: {
        ...makeRelease().projectDetails,
        subtype: 'STANDALONE',
        franchiseId: undefined,
        installmentNumber: 1,
        isFamous: false,
        hiddenStats: {
            ...makeRelease().projectDetails.hiddenStats,
            rawHype: 42
        }
    },
    totalGross: 40_000_000,
    imdbRating: 4.8,
    productionPerformance: 42
});

assert.equal(
    resolveRareHollywoodChaos({
        release: ordinaryFlop,
        player: makePlayer(),
        isPlayerProduction: false,
        random: () => 0
    }),
    null,
    'An ordinary weak flop should not be rescued by the chaos layer.'
);

const alreadyResolved = makeRelease({
    projectDetails: {
        ...makeRelease().projectDetails,
        hiddenStats: {
            ...makeRelease().projectDetails.hiddenStats,
            rareChaosResolved: true,
            rareChaosKind: 'FLOP_SEQUEL_GAMBLE'
        }
    }
});

assert.equal(
    resolveRareHollywoodChaos({
        release: alreadyResolved,
        player: makePlayer(),
        isPlayerProduction: true,
        forcedKind: 'FLOP_SEQUEL_GAMBLE',
        random: () => 0
    }),
    null,
    'A project must never receive a second chaos opportunity.'
);

const coldStudio = makeStudio({
    stats: {
        ...makeStudio().stats,
        recentFlopStreak: 4
    }
});
const normalChanceProject = makeRelease();

assert.equal(
    resolveRareHollywoodChaos({
        release: normalChanceProject,
        player: makePlayer(coldStudio),
        isPlayerProduction: true,
        random: () => 0.02
    }),
    null,
    'A recent flop streak should suppress repeat high-risk bets.'
);

console.log('Rare Hollywood chaos audit passed.');
