import {
    INITIAL_PLAYER,
    createInitialOwnedStreamingPlatformState,
    type IndustryProject,
    type PlatformAiContentPlan,
    type Player,
} from '../../types';
import { createBusiness } from '../../services/businessLogic';
import { getAbsoluteWeek } from '../../services/legacyLogic';
import { migratePlayerSave } from '../../services/saveMigration';
import { buildStreamingRightsPhase8QaFixture } from '../../services/streamingRightsQa';
import { buildSharedIndustryB8Scenario } from '../helpers/sharedIndustryB8Scenarios';
import { processIndustryWorldWeek } from '../../services/industryWorld';
import { buildDynastySuccessionState } from '../../services/dynastyCareer';

export const LATE_GAME_PERFORMANCE_STUDIO_ID = 'late-game-performance-studio';
export const LATE_GAME_WORLD_PROJECT_COUNT = 1_500;
export const LATE_GAME_PLATFORM_PLAN_COUNT = 2_000;
export const LATE_GAME_RIGHTS_CONTRACT_COUNT = 6_000;

const withDeterministicBusinessGeneration = <T>(create: () => T): T => {
    const originalRandom = Math.random;
    const originalNow = Date.now;
    let state = 0x82_49_15;
    Math.random = () => {
        state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
        return state / 0x1_0000_0000;
    };
    Date.now = () => 3_900_000_000_000;
    try {
        return create();
    } finally {
        Math.random = originalRandom;
        Date.now = originalNow;
    }
};

const buildWorldProject = (index: number, absoluteWeek: number): IndustryProject => ({
    id: `late-game-world-project-${String(index).padStart(4, '0')}`,
    title: `Archive Title ${String(index + 1).padStart(4, '0')}`,
    genre: (['DRAMA', 'ACTION', 'COMEDY', 'THRILLER', 'SCI_FI'] as const)[index % 5],
    originalLanguageId: index % 4 === 0 ? 'hindi' : 'english',
    mediaType: index % 7 === 0 ? 'SERIES' : 'MOVIE',
    targetAudience: index % 3 === 0 ? 'PG-13' : 'R',
    studioId: (['UNIVERSAL', 'WARNER_BROS', 'PARAMOUNT', 'LIONSGATE'] as const)[index % 4],
    budgetTier: (['LOW', 'MID', 'HIGH', 'BLOCKBUSTER'] as const)[index % 4],
    quality: 48 + (index * 17) % 49,
    rating: Number((5.1 + (index % 39) / 10).toFixed(1)),
    boxOffice: 8_000_000 + (index % 24) * 9_500_000,
    year: 53 + Math.floor(index / 52),
    weekReleased: (index % 52) + 1,
    leadActorId: `late-game-actor-${index % 80}`,
    leadActorName: `Archive Performer ${index % 80}`,
    directorId: `late-game-director-${index % 45}`,
    directorName: `Archive Director ${index % 45}`,
    reviews: 'A mature catalogue performance record.',
    releaseStrategy: index % 7 === 0 ? 'STREAMING_ONLY' : 'THEATRICAL',
    streamingWindows: [],
    streamingPerformance: index % 5 === 0 ? {
        calculatedAtAbsoluteWeek: Math.max(0, absoluteWeek - index % 520),
        outcome: index % 10 === 0 ? 'HIT' : 'SOLID',
        viewsMillions: 0.5 + (index % 80) / 10,
        subscriberImpactMillions: (index % 30) / 100,
        engagementIndexDelta: (index % 10) / 10,
        catalogueStrengthDelta: (index % 20) / 10,
        commercialScore: 50 + index % 45,
        prestigeScore: 48 + index % 48,
        localizationSupportMultiplier: 0.7 + (index % 30) / 100,
        seed: `late-game-performance-${index}`,
    } : undefined,
});

const buildReleasedPlan = (
    index: number,
    platformId: PlatformAiContentPlan['platformId'],
    absoluteWeek: number,
): PlatformAiContentPlan => {
    const projectId = `late-game-world-project-${String(index % LATE_GAME_WORLD_PROJECT_COUNT).padStart(4, '0')}`;
    const releaseWeek = Math.max(1, absoluteWeek - 1 - index % 520);
    return {
        id: `late-game-plan-${String(index).padStart(4, '0')}`,
        platformId,
        controllerAtCommitment: 'AI',
        source: 'LICENSED_RELEASED_TITLE',
        status: 'RELEASED',
        title: `Archive Title ${String(index % LATE_GAME_WORLD_PROJECT_COUNT + 1).padStart(4, '0')}`,
        projectType: index % 7 === 0 ? 'SERIES' : 'MOVIE',
        genre: (['DRAMA', 'ACTION', 'COMEDY', 'THRILLER', 'SCI_FI'] as const)[index % 5],
        targetAudience: index % 3 === 0 ? 'PG-13' : 'R',
        sourceProjectIds: [projectId],
        rightsContractIds: [],
        cataloguePackageId: null,
        commissionId: null,
        sourceStudioId: 'UNIVERSAL',
        streamingWindow: 'POST_THEATRICAL_WINDOW',
        localizationLevel: index % 3 === 0 ? 'DUBS_AND_SUBTITLES' : 'SUBTITLES',
        releaseCountryIds: index % 2 === 0 ? ['US', 'IN', 'GB'] : ['US', 'CA'],
        minimumGuaranteeMillions: 4 + index % 50,
        rightsCostMillions: 4 + index % 50,
        productionFundingMillions: 0,
        paidSpendMillions: 4 + index % 50,
        marketingReserveMillions: 0,
        contingencyMillions: 0,
        commissioningLifecycle: null,
        committedAtAbsoluteWeek: releaseWeek - 16,
        rightsReadyAtAbsoluteWeek: releaseWeek - 12,
        localizationReadyAtAbsoluteWeek: releaseWeek - 4,
        premiereAtAbsoluteWeek: releaseWeek,
        releasePattern: index % 7 === 0 ? 'SERIES_WEEKLY' : 'MOVIE_SINGLE_PREMIERE',
        releaseEntries: [],
        releaseReadiness: null,
        scheduledAtAbsoluteWeek: releaseWeek - 2,
        releasedAtAbsoluteWeek: releaseWeek,
        industryProductionId: null,
        forecast: { strategic: 65, creative: 62, commercial: 68, prestige: 58, risk: 32 },
    };
};

export const buildLateGameWeekPerformanceFixture = (): Player => {
    let player = migratePlayerSave(structuredClone(INITIAL_PLAYER) as Player);
    player = {
        ...player,
        id: 'late-game-week-performance-player',
        name: 'Empire Founder',
        age: 82,
        currentWeek: 49,
        money: 4_500_000_000,
    };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    let sharedIndustry = buildSharedIndustryB8Scenario('CROWDED', 'late-game-performance');
    sharedIndustry = {
        ...sharedIndustry,
        id: player.id,
        age: player.age,
        currentWeek: player.currentWeek,
    };
    for (let week = absoluteWeek - 104; week < absoluteWeek; week += 1) {
        sharedIndustry = processIndustryWorldWeek(
            sharedIndustry,
            sharedIndustry.world,
            week,
        ).player;
    }
    player = {
        ...player,
        news: sharedIndustry.news,
        x: sharedIndustry.x,
        instagram: sharedIndustry.instagram,
        world: {
            ...player.world,
            studios: sharedIndustry.world.studios,
            platforms: sharedIndustry.world.platforms,
            industryProductions: sharedIndustry.world.industryProductions,
            industryEvents: sharedIndustry.world.industryEvents,
            talentBookings: sharedIndustry.world.talentBookings,
        },
    };
    const dynasty = buildDynastySuccessionState({
        player,
        parentActor: {
            id: 'late-game-former-lead',
            name: 'Asha Empire',
            avatar: '',
            gender: 'FEMALE',
        } as never,
        archive: {
            parent: { id: 'late-game-former-lead', name: 'Asha Empire' },
            pastProjects: player.pastProjects.slice(0, 12),
            activeReleases: player.activeReleases.slice(0, 6),
            awards: player.awards.slice(0, 24),
        },
        sourceAbsoluteWeek: absoluteWeek - 520,
        targetAbsoluteWeek: absoluteWeek - 260,
        isDeceased: false,
    });
    player.flags = {
        ...(player.flags || {}),
        dynastyCareer: dynasty.state,
        dynastyCareerArchives: dynasty.archives,
    };
    const studio = withDeterministicBusinessGeneration(() => createBusiness(
        'Empire Studios',
        'PRODUCTION_HOUSE',
        'MAJOR_STUDIO',
        { quality: 'PREMIUM', pricing: 'MARKET', marketing: 'MEDIUM' },
        '🎬',
        player.currentWeek,
    ));
    studio.id = LATE_GAME_PERFORMANCE_STUDIO_ID;
    studio.balance = 900_000_000;
    studio.stats.valuation = 3_500_000_000;
    player.businesses = [studio];
    player = buildStreamingRightsPhase8QaFixture(player, LATE_GAME_PERFORMANCE_STUDIO_ID);

    const ownedStreaming = createInitialOwnedStreamingPlatformState(player.id);
    player.ownedStreamingPlatform = {
        ...ownedStreaming,
        lifecycle: 'ACTIVE',
        identity: {
            name: 'Empire Stream',
            slug: 'empire-stream',
            primaryColor: '#d4af37',
            secondaryColor: '#11131a',
            logoKey: 'SPOTLIGHT',
            soundIdentKey: 'PREMIERE',
            brandPromiseId: 'EVENT_HOUSE',
            publicManifesto: 'Stories built for the biggest screen and every screen.',
            dayOneMarketIds: ['US', 'IN', 'GB'],
            launchServerCityId: null,
            foundedAtAbsoluteWeek: absoluteWeek - 520,
        },
        metrics: {
            ...ownedStreaming.metrics,
            subscribers: 42_000_000,
            netSubscriberMovement: 85_000,
            churnRate: 0.027,
            engagementRate: 0.71,
            averageRevenuePerUser: 10.8,
            technologyHealth: 94,
        },
        treasuryCash: 1_800_000_000,
        catalogProjectIds: player.pastProjects.slice(0, 40).map(project => project.id),
    };

    player.world.projects = [...Array.from(
        { length: LATE_GAME_WORLD_PROJECT_COUNT },
        (_, index) => buildWorldProject(index, absoluteWeek),
    ), ...sharedIndustry.world.projects];

    const platforms = { ...(player.world.platforms || {}) } as NonNullable<Player['world']['platforms']>;
    const platformIds = Object.keys(platforms) as Array<keyof typeof platforms>;
    const plansByPlatform = new Map<string, PlatformAiContentPlan[]>();
    for (let index = 0; index < LATE_GAME_PLATFORM_PLAN_COUNT; index += 1) {
        const platformId = platformIds[index % platformIds.length];
        const list = plansByPlatform.get(platformId) || [];
        list.push(buildReleasedPlan(index, platformId, absoluteWeek));
        plansByPlatform.set(platformId, list);
    }
    for (const platformId of platformIds) {
        const platform = platforms[platformId];
        if (!platform?.ai) continue;
        platforms[platformId] = {
            ...platform,
            ai: {
                ...platform.ai,
                lastProcessedAbsoluteWeek: absoluteWeek - 1,
                nextPlanningAbsoluteWeek: absoluteWeek + 104,
                slate: plansByPlatform.get(platformId) || [],
            },
        };
    }
    player.world.platforms = platforms;

    const contractTemplates = Object.values(player.world.streamingRightsContracts || {});
    if (contractTemplates.length === 0) throw new Error('Late-game fixture requires canonical A8 rights contracts.');
    player.world.streamingRightsContracts = Object.fromEntries(Array.from(
        { length: LATE_GAME_RIGHTS_CONTRACT_COUNT },
        (_, index) => {
            const template = structuredClone(contractTemplates[index % contractTemplates.length]);
            const id = `late-game-rights-contract-${String(index).padStart(5, '0')}`;
            const projectId = `late-game-world-project-${String(index % LATE_GAME_WORLD_PROJECT_COUNT).padStart(4, '0')}`;
            return [id, {
                ...template,
                id,
                idempotencyKey: `late-game-rights-idempotency-${String(index).padStart(5, '0')}`,
                sourceProjectId: projectId,
                title: `Archive Title ${String(index % LATE_GAME_WORLD_PROJECT_COUNT + 1).padStart(4, '0')}`,
                status: 'ACTIVE',
                startsAtAbsoluteWeek: absoluteWeek - 52 - index % 104,
                durationWeeks: 520,
                expiresAtAbsoluteWeek: absoluteWeek + 260 + index % 260,
                rootContractId: id,
                parentContractId: null,
                rightsTransactionId: null,
                transferredToContractId: null,
                transferredAtAbsoluteWeek: null,
            }];
        },
    ));
    player.world.streamingRightsTransactions = {};

    return migratePlayerSave(player);
};
