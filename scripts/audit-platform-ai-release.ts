import assert from 'node:assert/strict';
import type {
    IndustryProject,
    OwnedStreamingCatalogLicense,
    PlatformAiContentPlan,
    PlatformAiContentSource,
    PlatformAiLocalizationJobStatus,
    PlatformAiLocalizationLevel,
    PlatformAiReleasePattern,
    PlatformAiResearchItem,
    PlatformAiStreamingPerformance,
    PlatformId,
    Player,
    WorldState,
} from '../types';
import {
    buildPlatformContentCandidates,
    calculatePlatformAiStreamingPerformance,
    getPlatformAiPresentationEvents,
    normalizePlatformAiState,
    PLATFORM_AI_FLOP_COMMERCIAL_SCORE,
    PLATFORM_AI_HIT_COMMERCIAL_SCORE,
    recordPlatformAiReleaseMemory,
    releasePlatformContentPlan,
    schedulePlatformStreamingWindow,
    updatePlatformAiMemory,
} from '../services/platformAi';
import { createStreamingLicenseContract } from '../services/streamingRightsCore';
import { createDeterministicId } from '../services/deterministicRandom';
import {
    getPlatformAiLocalizationJobId,
    getPlatformAiLocalizationObligationId,
    getPlatformAiLocalizationRequirements,
    quotePlatformAiLocalization,
} from '../services/platformAi/platformAiLocalizationCore';
import { getPlatformAiProductionEscrowFundingId } from '../services/platformAi/platformAiProductionEscrow';
import {
    getWorldAwardCategoryScore,
    isWorldProjectEligibleForAwardSeason,
} from '../services/awardLogic';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { createPlatformAiFixture } from './helpers/platformAiFixture';

const ABSOLUTE_WEEK = 2_080;
const PREMIERE_WEEK = ABSOLUTE_WEEK + 4;

const fixture = createPlatformAiFixture();

assert.equal(PLATFORM_AI_HIT_COMMERCIAL_SCORE, 85, 'Long-run HIT threshold must remain disclosed and auditable.');
assert.equal(PLATFORM_AI_FLOP_COMMERCIAL_SCORE, 74, 'Long-run FLOP threshold must remain disclosed and auditable.');

const project = (
    id: string,
    title: string,
    studioId: IndustryProject['studioId'],
    boxOffice: number,
    mediaType: IndustryProject['mediaType'] = 'MOVIE',
): IndustryProject => ({
    id,
    title,
    genre: 'DRAMA',
    mediaType,
    targetAudience: 'PG-13',
    studioId,
    budgetTier: 'MID',
    quality: 82,
    rating: 8.1,
    boxOffice,
    year: 40,
    weekReleased: 8,
    leadActorId: `${id}-actor`,
    leadActorName: `${title} Lead`,
    directorName: `${title} Director`,
    reviews: 'Strong reviews',
    releaseStrategy: boxOffice > 0 ? 'THEATRICAL' : 'STREAMING_ONLY',
});

const basePlan = (
    platformId: PlatformId,
    id: string,
    source: PlatformAiContentSource,
    sourceProjectIds: string[],
    rightsContractIds: string[],
    projectType: 'MOVIE' | 'SERIES' = 'MOVIE',
): PlatformAiContentPlan => ({
    id,
    platformId,
    controllerAtCommitment: 'AI',
    source,
    status: source === 'COMMISSIONED_ORIGINAL' ? 'DELIVERED' : 'RIGHTS_READY',
    title: source === 'COMMISSIONED_ORIGINAL' ? 'Signal House' : `Plan ${id}`,
    projectType,
    genre: 'DRAMA',
    targetAudience: 'PG-13',
    sourceProjectIds,
    rightsContractIds,
    cataloguePackageId: source === 'CATALOGUE_ACQUISITION' ? `${id}-package` : null,
    commissionId: source === 'COMMISSIONED_ORIGINAL' ? `${id}-commission` : null,
    sourceStudioId: source === 'COMMISSIONED_ORIGINAL' ? 'WARNER_BROS' : null,
    streamingWindow: source === 'COMMISSIONED_ORIGINAL'
        ? 'ORIGINAL_STREAMING_PREMIERE'
        : source === 'OWNED_STUDIO_TRANSFER'
            ? 'OWNED_STUDIO_STREAMING_WINDOW'
            : source === 'CATALOGUE_ACQUISITION'
                ? 'CATALOGUE_WINDOW'
                : 'POST_THEATRICAL_WINDOW',
    localizationLevel: 'DUBS_AND_SUBTITLES',
    releaseCountryIds: ['US'],
    minimumGuaranteeMillions: 10,
    rightsCostMillions: 10,
    productionFundingMillions: source === 'COMMISSIONED_ORIGINAL' ? 90 : 0,
    paidSpendMillions: source === 'COMMISSIONED_ORIGINAL' ? 90 : 10,
    marketingReserveMillions: 12,
    contingencyMillions: 0,
    committedAtAbsoluteWeek: ABSOLUTE_WEEK - 30,
    rightsReadyAtAbsoluteWeek: ABSOLUTE_WEEK - 1,
    localizationReadyAtAbsoluteWeek: null,
    premiereAtAbsoluteWeek: null,
    releasePattern: null,
    releaseEntries: [],
    scheduledAtAbsoluteWeek: null,
    releasedAtAbsoluteWeek: null,
    industryProductionId: source === 'COMMISSIONED_ORIGINAL' ? `${id}-production` : null,
    forecast: { strategic: 86, creative: 88, commercial: 84, prestige: 90, risk: 22 },
});

const contract = (
    id: string,
    platformId: PlatformId,
    planId: string,
    sourceProject: IndustryProject,
    source: PlatformAiContentSource,
    exclusivity: 'EXCLUSIVE' | 'NON_EXCLUSIVE' = 'NON_EXCLUSIVE',
): OwnedStreamingCatalogLicense => createStreamingLicenseContract({
    id,
    sourceProject,
    buyerPlatformId: platformId,
    platformContentPlanId: planId,
    cataloguePackageId: source === 'CATALOGUE_ACQUISITION' ? `${planId}-package` : null,
    contentSource: source,
    licensorName: sourceProject.studioId,
    territory: 'GLOBAL',
    countryIds: [],
    durationWeeks: 104,
    exclusivity,
    minimumGuarantee: 10_000_000,
    platformRevenueShare: 70,
    signedAtAbsoluteWeek: ABSOLUTE_WEEK - 2,
    startsAtAbsoluteWeek: ABSOLUTE_WEEK - 1,
    status: 'ACTIVE',
    origin: source === 'OWNED_STUDIO_TRANSFER' ? 'OWNED_STUDIO_TRANSFER' : source === 'CATALOGUE_ACQUISITION' ? 'CATALOGUE_ACQUISITION' : 'STUDIO_MARKET',
    sellerType: 'STUDIO',
    sellerPlatformId: null,
    windowType: source === 'OWNED_STUDIO_TRANSFER' ? 'PERMANENT' : 'SECOND_WINDOW',
    permanentPurchase: source === 'OWNED_STUDIO_TRANSFER',
    sublicensingAllowed: exclusivity === 'NON_EXCLUSIVE',
    renewalOption: true,
    sequelRightsIncluded: false,
    changeOfControl: 'NOTICE',
    cancellationPenalty: 2_000_000,
});

const operatingContentResearch = (
    researchDefinitionId: 'localization-exchange' | 'global-publishing-orchestrator',
    technologyDefinitionId: 'content_operations-2' | 'content_operations-3',
    targetLevel: 22 | 40,
): PlatformAiResearchItem => ({
    id: `release-audit-${researchDefinitionId}`,
    idempotencyKey: `platform-ai-research:release-audit:${researchDefinitionId}`,
    researchDefinitionId,
    technologyDefinitionId,
    branch: 'CONTENT_OPERATIONS',
    targetLevel,
    buildMode: 'BALANCED',
    stage: 'OPERATING',
    ipStrategy: 'PATENT',
    researchCostMillions: 1,
    ipCostMillions: 1,
    installationCostMillions: 1,
    researchWeeklyOperatingCostMillions: 0.1,
    licenseWeeklyCostMillions: 0,
    technologyWeeklyOperatingCostMillions: 0.1,
    researchWeeks: 1,
    prototypeWeeks: 1,
    testWeeks: 1,
    installationWeeks: 1,
    startedAtAbsoluteWeek: ABSOLUTE_WEEK - 20,
    stageStartedAtAbsoluteWeek: ABSOLUTE_WEEK - 5,
    stageReadyAtAbsoluteWeek: ABSOLUTE_WEEK - 4,
    completedAtAbsoluteWeek: ABSOLUTE_WEEK - 4,
    lastProcessedAbsoluteWeek: ABSOLUTE_WEEK - 4,
});

const installPlan = (
    player: Player,
    world: WorldState,
    platformId: PlatformId,
    plan: PlatformAiContentPlan,
    contracts: OwnedStreamingCatalogLicense[] = [],
): WorldState => {
    const platform = normalizePlatformAiState(world.platforms![platformId], player.id, ABSOLUTE_WEEK);
    platform.ai!.researchQueue = [
        operatingContentResearch('localization-exchange', 'content_operations-2', 22),
        operatingContentResearch('global-publishing-orchestrator', 'content_operations-3', 40),
    ];
    const researchBackedPlatform = normalizePlatformAiState({ ...platform, ai: { ...platform.ai!, schemaVersion: 4 as any } }, player.id, ABSOLUTE_WEEK);
    researchBackedPlatform.ai!.marketOperations = researchBackedPlatform.ai!.marketOperations.map(operation => ({
        ...operation,
        status: operation.countryId === 'US' || operation.countryId === 'JP' || operation.countryId === 'GB'
            ? 'ACTIVE'
            : operation.status,
    }));
    researchBackedPlatform.ai!.capabilities.activeCountryIds = researchBackedPlatform.ai!.marketOperations
        .filter(operation => operation.status === 'ACTIVE' && operation.countryId)
        .map(operation => operation.countryId!);
    researchBackedPlatform.ai!.slate = [
        ...researchBackedPlatform.ai!.slate.filter(item => item.id !== plan.id),
        plan,
    ];
    researchBackedPlatform.ai!.rightsContracts = [
        ...researchBackedPlatform.ai!.rightsContracts.filter(item => !contracts.some(candidate => candidate.id === item.id)),
        ...contracts,
    ];
    return {
        ...world,
        platforms: { ...world.platforms!, [platformId]: researchBackedPlatform },
    };
};

const installLocalizationJobs = (
    player: Player,
    sourceWorld: WorldState,
    platformId: PlatformId,
    planId: string,
    options: {
        projectIds?: string[];
        countryIds?: string[];
        level?: PlatformAiLocalizationLevel;
        status?: PlatformAiLocalizationJobStatus;
        readyAtByProjectId?: Record<string, number>;
    } = {},
): WorldState => {
    const nextWorld = structuredClone(sourceWorld);
    const platform = structuredClone(nextWorld.platforms![platformId]);
    const plan = platform.ai!.slate.find(item => item.id === planId)!;
    const production = plan.industryProductionId
        ? nextWorld.industryProductions?.[plan.industryProductionId]
        : null;
    const projectIds = options.projectIds || (plan.source === 'COMMISSIONED_ORIGINAL'
        ? production ? [production.canonicalProjectId] : []
        : plan.sourceProjectIds);
    const level = options.level || plan.localizationLevel;
    const status = options.status || 'READY';
    const jobs = projectIds.flatMap(projectId => {
        const sourceProject = nextWorld.projects.find(item => item.id === projectId);
        const requirements = getPlatformAiLocalizationRequirements(platform, plan, sourceProject);
        return requirements.map(requirement => {
        const countryIds = [...(options.countryIds || requirement.countryIds)].sort();
        const mode = options.level === 'SUBTITLES' ? 'SUBTITLE' as const : requirement.mode;
        const quote = quotePlatformAiLocalization({
            projectType: plan.projectType,
            mode,
            capabilityTier: requirement.capabilityTier as 1 | 2 | 3,
            countryIds,
            controller: 'PLAYER',
        });
        const readyAtAbsoluteWeek = options.readyAtByProjectId?.[projectId] ?? ABSOLUTE_WEEK;
        const startedAtAbsoluteWeek = status === 'WAITING_FOR_FUNDS'
            ? null
            : readyAtAbsoluteWeek - quote.leadWeeks;
        const createdAtAbsoluteWeek = startedAtAbsoluteWeek ?? ABSOLUTE_WEEK;
        const id = getPlatformAiLocalizationJobId({
            platformId, contentPlanId: planId, projectId,
            languageId: requirement.languageId, mode, countryIds,
            capabilityTier: requirement.capabilityTier as 1 | 2 | 3,
            controllerQuoteVersion: 0,
        });
        return {
            id,
            platformId,
            contentPlanId: planId,
            projectId,
            countryIds,
            level,
            languageId: requirement.languageId,
            mode,
            capabilityTierAtPlanning: requirement.capabilityTier as 1 | 2 | 3,
            qualityForecast: quote.qualityForecast,
            efficiencySnapshot: null,
            quoteVersion: 0 as const,
            legacyObligationId: null,
            contentOperationsLevelAtPlanning: 40,
            costMillions: quote.costMillions,
            leadWeeks: quote.leadWeeks,
            obligationId: getPlatformAiLocalizationObligationId(id),
            status,
            createdAtAbsoluteWeek,
            startedAtAbsoluteWeek,
            readyAtAbsoluteWeek: status === 'READY' ? readyAtAbsoluteWeek : null,
            cancelledAtAbsoluteWeek: null,
        };
        });
    });
    const projectIdSet = new Set(projectIds);
    platform.ai!.localizationJobs = [
        ...platform.ai!.localizationJobs.filter(job => (
            job.contentPlanId !== planId || !projectIdSet.has(job.projectId)
        )),
        ...jobs,
    ];
    const obligationIds = new Set(jobs.map(job => job.obligationId));
    platform.ai!.pendingOneTimeObligations = [
        ...platform.ai!.pendingOneTimeObligations.filter(item => !obligationIds.has(item.id)),
        ...jobs.filter(job => job.costMillions > 0).map(job => ({
            id: job.obligationId,
            category: 'LOCALIZATION' as const,
            amountMillions: job.costMillions,
            createdWeek: job.createdAtAbsoluteWeek,
            status: status === 'WAITING_FOR_FUNDS' ? 'HELD' as const : 'SETTLED' as const,
            settledWeek: status === 'WAITING_FOR_FUNDS' ? null : job.startedAtAbsoluteWeek,
        })),
    ];
    return {
        ...nextWorld,
        platforms: { ...nextWorld.platforms!, [platformId]: platform },
    };
};

const schedule = (
    player: Player,
    world: WorldState,
    platformId: PlatformId,
    planId: string,
    pattern?: PlatformAiReleasePattern,
) => schedulePlatformStreamingWindow({
    player,
    world: installLocalizationJobs(player, world, platformId, planId),
    platformId,
    planId,
    absoluteWeek: ABSOLUTE_WEEK,
    premiereAtAbsoluteWeek: PREMIERE_WEEK,
    localizationReadyAtAbsoluteWeek: PREMIERE_WEEK - 1,
    releasePattern: pattern,
});

const performance = (seed: string, outcome: PlatformAiStreamingPerformance['outcome']): PlatformAiStreamingPerformance => ({
    calculatedAtAbsoluteWeek: PREMIERE_WEEK,
    viewsMillions: outcome === 'HIT' ? 42 : outcome === 'FLOP' ? 2 : 12,
    subscriberImpactMillions: outcome === 'HIT' ? 1.2 : outcome === 'FLOP' ? -0.1 : 0.2,
    engagementIndexDelta: outcome === 'HIT' ? 7 : outcome === 'FLOP' ? -3 : 2,
    commercialScore: outcome === 'HIT' ? 92 : outcome === 'FLOP' ? 28 : 65,
    prestigeScore: outcome === 'HIT' ? 88 : outcome === 'FLOP' ? 35 : 68,
    localizationSupportMultiplier: 1,
    outcome,
    seed,
});

let world = structuredClone(fixture.world) as WorldState;
const licensed = project('licensed-title', 'Licensed Title', 'LIONSGATE', 225_000_000);
const ownedTransfer = project('owned-transfer', 'Owned Transfer', 'PIXAR', 310_000_000);
const catalogueOne = project('catalogue-one', 'Catalogue One', 'MGM', 140_000_000);
const catalogueTwo = project('catalogue-two', 'Catalogue Two', 'UNIVERSAL', 175_000_000, 'SERIES');
world.projects = [licensed, ownedTransfer, catalogueOne, catalogueTwo];

// Canonical date math: a project released this exact week is already a released-title candidate.
const currentAbsoluteWeek = getAbsoluteWeek(fixture.age, fixture.currentWeek);
const currentWeekProject = project('current-week-title', 'Current Week Title', 'LIONSGATE', 90_000_000);
currentWeekProject.year = fixture.age;
currentWeekProject.weekReleased = fixture.currentWeek;
const sourcingWorld = structuredClone(world);
sourcingWorld.projects = [currentWeekProject];
const sourcingCandidates = buildPlatformContentCandidates({
    player: fixture,
    world: sourcingWorld,
    platformId: 'NETFLIX',
    absoluteWeek: currentAbsoluteWeek,
});
assert.ok(
    sourcingCandidates.some(candidate => candidate.sourceProjectIds.includes(currentWeekProject.id)),
    'Canonical release-week math must not hide a title released in the current week.',
);

// Rejection matrix: readiness, future date, rights, country, localization, and volume capacity.
const notReadyPlan = { ...basePlan('NETFLIX', 'not-ready', 'COMMISSIONED_ORIGINAL', [], []), status: 'IN_PRODUCTION' as const };
world = installPlan(fixture, world, 'NETFLIX', notReadyPlan);
assert.equal(schedule(fixture, world, 'NETFLIX', notReadyPlan.id).reason, 'CONTENT_NOT_READY');
assert.equal(schedulePlatformStreamingWindow({
    player: fixture,
    world,
    platformId: 'NETFLIX',
    planId: notReadyPlan.id,
    absoluteWeek: ABSOLUTE_WEEK,
    premiereAtAbsoluteWeek: ABSOLUTE_WEEK,
}).reason, 'PREMIERE_NOT_FUTURE');

const expiredContract = contract('expired-right', 'HULU', 'expired-plan', licensed, 'LICENSED_RELEASED_TITLE');
expiredContract.expiresAtAbsoluteWeek = PREMIERE_WEEK - 1;
const expiredPlan = basePlan('HULU', 'expired-plan', 'LICENSED_RELEASED_TITLE', [licensed.id], [expiredContract.id]);
world = installPlan(fixture, world, 'HULU', expiredPlan, [expiredContract]);
assert.equal(schedule(fixture, world, 'HULU', expiredPlan.id).reason, 'RIGHTS_NOT_ACTIVE');

const inactiveCountryContract = contract('inactive-country-right', 'HULU', 'inactive-country-plan', licensed, 'LICENSED_RELEASED_TITLE');
const inactiveCountryPlan = {
    ...basePlan('HULU', 'inactive-country-plan', 'LICENSED_RELEASED_TITLE', [licensed.id], [inactiveCountryContract.id]),
    releaseCountryIds: ['DE'],
};
world = installPlan(fixture, world, 'HULU', inactiveCountryPlan, [inactiveCountryContract]);
assert.equal(schedule(fixture, world, 'HULU', inactiveCountryPlan.id).reason, 'COUNTRY_NOT_ACTIVE');

const noneContract = contract('none-localization-right', 'HULU', 'none-localization-plan', licensed, 'LICENSED_RELEASED_TITLE');
const nonePlan = {
    ...basePlan('HULU', 'none-localization-plan', 'LICENSED_RELEASED_TITLE', [licensed.id], [noneContract.id]),
    localizationLevel: 'NONE' as const,
    releaseCountryIds: ['JP'],
};
world = installPlan(fixture, world, 'HULU', nonePlan, [noneContract]);
assert.equal(
    schedule(fixture, world, 'HULU', nonePlan.id).changed,
    true,
    'Country access is separate from comprehension: an optional unlocalized title may release with a later performance penalty.',
);

const localizationGateContract = contract(
    'localization-gate-right',
    'HULU',
    'localization-gate-plan',
    licensed,
    'LICENSED_RELEASED_TITLE',
);
const localizationGatePlan = basePlan(
    'HULU',
    'localization-gate-plan',
    'LICENSED_RELEASED_TITLE',
    [licensed.id],
    [localizationGateContract.id],
);
const localizationGateWorld = installPlan(
    fixture,
    world,
    'HULU',
    localizationGatePlan,
    [localizationGateContract],
);
const directLocalizationSchedule = (candidateWorld: WorldState) => schedulePlatformStreamingWindow({
    player: fixture,
    world: candidateWorld,
    platformId: 'HULU',
    planId: localizationGatePlan.id,
    absoluteWeek: ABSOLUTE_WEEK,
    premiereAtAbsoluteWeek: PREMIERE_WEEK,
    localizationReadyAtAbsoluteWeek: ABSOLUTE_WEEK - 20,
});
assert.equal(
    directLocalizationSchedule(localizationGateWorld).reason,
    'LOCALIZATION_NOT_READY',
    'Caller-fabricated localization readiness must not bypass the persisted READY-job gate.',
);
assert.equal(
    directLocalizationSchedule(installLocalizationJobs(
        fixture,
        localizationGateWorld,
        'HULU',
        localizationGatePlan.id,
        { status: 'WAITING_FOR_FUNDS' },
    )).reason,
    'LOCALIZATION_NOT_READY',
    'An unpaid localization job must not schedule.',
);
assert.equal(
    directLocalizationSchedule(installLocalizationJobs(
        fixture,
        localizationGateWorld,
        'HULU',
        localizationGatePlan.id,
        { status: 'IN_PROGRESS' },
    )).reason,
    'LOCALIZATION_NOT_READY',
    'An in-progress localization job must not schedule.',
);
assert.equal(
    directLocalizationSchedule(installLocalizationJobs(
        fixture,
        localizationGateWorld,
        'HULU',
        localizationGatePlan.id,
        { countryIds: ['JP'] },
    )).reason,
    'LOCALIZATION_NOT_READY',
    'A READY job for the wrong country scope must not schedule.',
);
assert.equal(
    directLocalizationSchedule(installLocalizationJobs(
        fixture,
        localizationGateWorld,
        'HULU',
        localizationGatePlan.id,
        { level: 'SUBTITLES' },
    )).reason,
    'LOCALIZATION_NOT_READY',
    'A READY job for the wrong localization level must not schedule.',
);
assert.equal(
    directLocalizationSchedule(installLocalizationJobs(
        fixture,
        localizationGateWorld,
        'HULU',
        localizationGatePlan.id,
        { projectIds: ['wrong-project'] },
    )).reason,
    'LOCALIZATION_NOT_READY',
    'A READY job for the wrong canonical project must not schedule.',
);
assert.equal(
    directLocalizationSchedule(installLocalizationJobs(
        fixture,
        localizationGateWorld,
        'HULU',
        localizationGatePlan.id,
        { readyAtByProjectId: { [licensed.id]: ABSOLUTE_WEEK + 1 } },
    )).reason,
    'LOCALIZATION_NOT_READY',
    'A future READY week must not schedule early even when the premiere is later.',
);
const exactReadySchedule = directLocalizationSchedule(installLocalizationJobs(
    fixture,
    localizationGateWorld,
    'HULU',
    localizationGatePlan.id,
));
assert.equal(exactReadySchedule.changed, true, 'An exact READY localization job must schedule.');
assert.equal(
    exactReadySchedule.plan?.localizationReadyAtAbsoluteWeek,
    ABSOLUTE_WEEK,
    'Scheduling must persist the actual localization job readiness week.',
);

const capacityPlan = basePlan('APPLE_TV', 'capacity-plan', 'LICENSED_RELEASED_TITLE', [licensed.id], ['capacity-right']);
capacityPlan.localizationLevel = 'NONE';
const capacityContract = contract('capacity-right', 'APPLE_TV', capacityPlan.id, licensed, 'LICENSED_RELEASED_TITLE');
world = installPlan(fixture, world, 'APPLE_TV', capacityPlan, [capacityContract]);
const apple = normalizePlatformAiState(world.platforms!.APPLE_TV, fixture.id, ABSOLUTE_WEEK);
apple.ai!.slate.push(...Array.from({ length: 2 }, (_, index) => ({
    ...basePlan('APPLE_TV', `capacity-existing-${index}`, 'LICENSED_RELEASED_TITLE', [licensed.id], []),
    status: 'SCHEDULED' as const,
    premiereAtAbsoluteWeek: PREMIERE_WEEK,
    releasePattern: 'MOVIE_SINGLE_PREMIERE' as const,
    releaseEntries: [{
        id: `capacity-entry-${index}`,
        sourceProjectId: licensed.id,
        canonicalProjectId: licensed.id,
        rightsContractId: null,
        premiereAtAbsoluteWeek: PREMIERE_WEEK,
        localizationReadyAtAbsoluteWeek: PREMIERE_WEEK - 1,
        countryIds: ['US'],
        releasePattern: 'MOVIE_SINGLE_PREMIERE' as const,
        installmentAbsoluteWeeks: [PREMIERE_WEEK],
        status: 'SCHEDULED' as const,
        releasedAtAbsoluteWeek: null,
        streamingWindowId: null,
    }],
})));
world = { ...world, platforms: { ...world.platforms!, APPLE_TV: apple } };
assert.equal(schedule(fixture, world, 'APPLE_TV', capacityPlan.id).reason, 'RELEASE_CAPACITY_EXCEEDED');
const appleAfterCapacityCheck = normalizePlatformAiState(world.platforms!.APPLE_TV, fixture.id, ABSOLUTE_WEEK);
appleAfterCapacityCheck.ai!.slate = appleAfterCapacityCheck.ai!.slate.filter(plan => !plan.id.startsWith('capacity-existing-'));
world = { ...world, platforms: { ...world.platforms!, APPLE_TV: appleAfterCapacityCheck } };

// Four canonical routes.
const originalPlan = basePlan('NETFLIX', 'original-plan', 'COMMISSIONED_ORIGINAL', [], [], 'SERIES');
originalPlan.localizationLevel = 'SUBTITLES';
const originalCanonicalProjectId = createDeterministicId('platform_ai_project', 'NETFLIX', originalPlan.id);
(originalPlan as unknown as Record<string, any>).productionEscrow = {
    status: 'FUNDED',
    fundingId: getPlatformAiProductionEscrowFundingId('NETFLIX', originalPlan.id),
    marketingCampaignMillions: 12,
    marketingBalanceMillions: 12,
    contingencyBalanceMillions: 0,
    fundedAtAbsoluteWeek: ABSOLUTE_WEEK - 20,
    settledAtAbsoluteWeek: null,
    settlementReason: null,
};
world = installPlan(fixture, world, 'NETFLIX', originalPlan);
world.industryProductions = {
    ...(world.industryProductions || {}),
    [originalPlan.industryProductionId!]: {
        id: originalPlan.industryProductionId!,
        canonicalProjectId: originalCanonicalProjectId,
        title: originalPlan.title,
        projectType: 'SERIES',
        genre: 'DRAMA',
        producerStudioId: 'WARNER_BROS',
        commissioningPlatformId: 'NETFLIX',
        platformContentPlanId: originalPlan.id,
        status: 'DELIVERED',
        productionCalendar: { totalWeeks: 15, elapsedWeeks: 15 } as never,
        budgetMillions: 90,
        paidMillions: 90,
        talentBookingIds: [],
        writerSource: 'IN_HOUSE_TEAM',
        writerId: null,
        writerName: 'Warner Story Department',
        writerSkill: 91,
        aiExecution: {
            standardDurationWeeks: 20,
            effectiveDurationWeeks: 15,
            qualityForecast: 88,
            executionRoll: 0.8,
            delayRoll: 0.2,
            overrunRoll: 0.2,
            failureRoll: 0.9,
            delayWeeks: 0,
            overrunMillions: 0,
            leadActorId: 'original-actor',
            leadActorName: 'Original Actor',
            directorId: 'original-director',
            directorName: 'Original Director',
            writerId: null,
            writerName: 'Warner Story Department',
            finalQuality: 91,
            failureDecision: 'NONE',
            failureResponse: 'NONE',
            failureResponseAmountMillions: 0,
            failureResponseAppliedAtAbsoluteWeek: null,
            paidMilestoneIds: ['COMMISSIONING', 'PROGRESS_35', 'PROGRESS_70', 'DELIVERY'],
            controllerAtLastProgression: 'AI',
            lastProgressedAbsoluteWeek: ABSOLUTE_WEEK - 1,
            holdReason: null,
        },
        createdAtAbsoluteWeek: ABSOLUTE_WEEK - 20,
        updatedAtAbsoluteWeek: ABSOLUTE_WEEK - 1,
    },
};
const scheduledOriginal = schedule(fixture, world, 'NETFLIX', originalPlan.id, 'SERIES_WEEKLY');
assert.equal(scheduledOriginal.changed, true, `Original scheduling failed: ${scheduledOriginal.reason}`);
assert.equal(scheduledOriginal.plan?.releaseEntries.length, 1);
assert.equal(scheduledOriginal.plan?.releaseEntries[0].installmentAbsoluteWeeks.length, 8);
const originalReadiness = (scheduledOriginal.plan as any)?.releaseReadiness;
assert.ok(originalReadiness, 'A scheduled plan must persist a release-readiness passport.');
assert.equal(originalReadiness.ready, true);
assert.deepEqual(originalReadiness.blockers, []);
assert.deepEqual(originalReadiness.canonicalProjectIds, [originalCanonicalProjectId]);
assert.equal(originalReadiness.latestRequiredAbsoluteWeek, PREMIERE_WEEK + 7);
assert.equal(originalReadiness.evaluatedAtAbsoluteWeek, ABSOLUTE_WEEK);
const repeatedSchedule = schedule(fixture, scheduledOriginal.world, 'NETFLIX', originalPlan.id, 'SERIES_WEEKLY');
assert.equal(repeatedSchedule.changed, false);
assert.deepEqual(repeatedSchedule.world, scheduledOriginal.world);

const forgedOriginalEntryWorld = structuredClone(scheduledOriginal.world);
const forgedOriginalEntryPlan = forgedOriginalEntryWorld.platforms!.NETFLIX.ai!.slate.find(plan => plan.id === originalPlan.id)!;
forgedOriginalEntryPlan.releaseEntries[0].canonicalProjectId = licensed.id;
const rejectedForgedOriginalEntry = releasePlatformContentPlan({
    player: fixture,
    world: forgedOriginalEntryWorld,
    platformId: 'NETFLIX',
    planId: originalPlan.id,
    absoluteWeek: PREMIERE_WEEK,
    performanceByProjectId: { [licensed.id]: performance('forged-original-entry', 'HIT') },
});
assert.equal(rejectedForgedOriginalEntry.changed, false);
assert.equal(rejectedForgedOriginalEntry.reason, 'SOURCE_IDENTITY_CONFLICT', 'An original entry must remain bound to its production canonical project.');

// A canonical-ID collision must never relabel or erase a legitimate theatrical project.
const originalCollisionWorld = structuredClone(scheduledOriginal.world);
const theatricalCollision = project(
    originalCanonicalProjectId,
    'Existing Theatrical Feature',
    'UNIVERSAL',
    480_000_000,
);
theatricalCollision.physicalProducerStudioId = 'UNIVERSAL';
originalCollisionWorld.projects.push(theatricalCollision);
const originalCollisionBefore = structuredClone(originalCollisionWorld);
const rejectedOriginalCollision = releasePlatformContentPlan({
    player: fixture,
    world: originalCollisionWorld,
    platformId: 'NETFLIX',
    planId: originalPlan.id,
    absoluteWeek: PREMIERE_WEEK,
    performanceByProjectId: { [originalCanonicalProjectId]: performance('collision-performance', 'HIT') },
});
assert.equal(rejectedOriginalCollision.changed, false);
assert.equal(rejectedOriginalCollision.reason, 'SOURCE_IDENTITY_CONFLICT');
assert.deepEqual(rejectedOriginalCollision.world, originalCollisionBefore);

const originalCash = scheduledOriginal.world.platforms!.NETFLIX.cashReserve;
const originalSubscribers = scheduledOriginal.world.platforms!.NETFLIX.subscribers;
const releasedOriginal = releasePlatformContentPlan({
    player: fixture,
    world: scheduledOriginal.world,
    platformId: 'NETFLIX',
    planId: originalPlan.id,
    absoluteWeek: PREMIERE_WEEK,
    performanceByProjectId: { [originalCanonicalProjectId]: performance('original-performance', 'HIT') },
});
assert.equal(releasedOriginal.changed, true);
const originalProject = releasedOriginal.world.projects.find(item => item.id === originalCanonicalProjectId)!;
assert.equal(originalProject.releaseStrategy, 'STREAMING_ONLY');
assert.equal(originalProject.boxOffice, 0);
assert.equal(originalProject.physicalProducerStudioId, 'WARNER_BROS');
assert.equal(originalProject.streamingWindows?.length, 1);
assert.equal(originalProject.streamingWindows?.[0].platformRelationship, 'ORIGINAL_COMMISSIONER');
assert.equal(originalProject.streamingWindows?.[0].releasePattern, 'SERIES_WEEKLY');
assert.ok(originalProject.awardProfile);
assert.ok(getWorldAwardCategoryScore(originalProject, 'Best Drama Series') > 0);
assert.equal(isWorldProjectEligibleForAwardSeason(originalProject, 'EMMY', originalProject.year), true);
assert.equal(releasedOriginal.world.platforms!.NETFLIX.cashReserve, originalCash, 'Release must not settle cash.');
assert.equal(releasedOriginal.world.platforms!.NETFLIX.subscribers, originalSubscribers, 'Release must not settle subscribers.');
const releasedOriginalPlan = releasedOriginal.world.platforms!.NETFLIX.ai!.slate.find(plan => plan.id === originalPlan.id)!;
assert.equal(originalProject.awardProfile?.campaign, 81, 'The canonical funded campaign must contribute to award scoring before settlement.');
assert.equal(releasedOriginalPlan.marketingReserveMillions, 0, 'Release must consume the funded marketing escrow once.');
assert.equal((releasedOriginalPlan as unknown as Record<string, any>).productionEscrow?.status, 'SETTLED');
assert.equal((releasedOriginalPlan as unknown as Record<string, any>).productionEscrow?.settlementReason, 'RELEASED');
assert.equal(releasedOriginal.world.projects.filter(item => item.id === originalProject.id).length, 1);
const originalAudienceSettlements = (releasedOriginal.world.platforms!.NETFLIX.ai as any).pendingAudienceSettlements;
assert.equal(originalAudienceSettlements?.length, 1, 'Release must queue one persisted audience settlement.');
assert.deepEqual(
    {
        streamingWindowId: originalAudienceSettlements[0].streamingWindowId,
        projectId: originalAudienceSettlements[0].projectId,
        planId: originalAudienceSettlements[0].planId,
        subscriberImpactMillions: originalAudienceSettlements[0].subscriberImpactMillions,
        status: originalAudienceSettlements[0].status,
    },
    {
        streamingWindowId: originalProject.streamingWindows![0].id,
        projectId: originalProject.id,
        planId: originalPlan.id,
        subscriberImpactMillions: 1.2,
        status: 'PENDING',
    },
    'Queued audience settlement must be keyed to the canonical window, project, and plan.',
);
const repeatedRelease = releasePlatformContentPlan({
    player: fixture,
    world: releasedOriginal.world,
    platformId: 'NETFLIX',
    planId: originalPlan.id,
    absoluteWeek: PREMIERE_WEEK,
    performanceByProjectId: { [originalCanonicalProjectId]: performance('original-performance', 'HIT') },
});
assert.equal(repeatedRelease.changed, false);
assert.deepEqual(repeatedRelease.world, releasedOriginal.world);
assert.equal((repeatedRelease.world.platforms!.NETFLIX.ai as any).pendingAudienceSettlements.length, 1, 'Release replay must not queue a duplicate audience settlement.');
world = releasedOriginal.world;

const licensedContract = contract('licensed-right', 'HULU', 'licensed-plan', licensed, 'LICENSED_RELEASED_TITLE');
const licensedPlan = basePlan('HULU', 'licensed-plan', 'LICENSED_RELEASED_TITLE', [licensed.id], [licensedContract.id]);
world = installPlan(fixture, world, 'HULU', licensedPlan, [licensedContract]);
const licensedScheduled = schedule(fixture, world, 'HULU', licensedPlan.id);
assert.equal(licensedScheduled.changed, true);

const scheduledWithoutReadyProof = structuredClone(licensedScheduled.world);
scheduledWithoutReadyProof.platforms!.HULU.ai!.localizationJobs = [];
const rejectedMissingReadyProof = releasePlatformContentPlan({
    player: fixture,
    world: scheduledWithoutReadyProof,
    platformId: 'HULU',
    planId: licensedPlan.id,
    absoluteWeek: PREMIERE_WEEK,
    performanceByProjectId: { [licensed.id]: performance('missing-ready-proof', 'SOLID') },
});
assert.equal(rejectedMissingReadyProof.changed, false);
assert.equal(rejectedMissingReadyProof.reason, 'LOCALIZATION_NOT_READY', 'A persisted schedule cannot replace canonical READY-job proof.');

// Scheduled entry countries are immutable entitlements and must be revalidated at release.
const retainedInactiveCountryWorld = structuredClone(licensedScheduled.world);
const retainedInactiveCountryPlan = retainedInactiveCountryWorld.platforms!.HULU.ai!.slate
    .find(item => item.id === licensedPlan.id)!;
retainedInactiveCountryPlan.releaseCountryIds = ['US'];
retainedInactiveCountryPlan.releaseEntries[0].countryIds = ['DE'];
const rejectedInactiveEntryCountry = releasePlatformContentPlan({
    player: fixture,
    world: retainedInactiveCountryWorld,
    platformId: 'HULU',
    planId: licensedPlan.id,
    absoluteWeek: PREMIERE_WEEK,
    performanceByProjectId: { [licensed.id]: performance('inactive-entry-country', 'SOLID') },
});
assert.equal(rejectedInactiveEntryCountry.changed, false);
assert.equal(rejectedInactiveEntryCountry.reason, 'COUNTRY_NOT_ACTIVE');

const retainedUnlocalizedCountryWorld = structuredClone(licensedScheduled.world);
const retainedUnlocalizedCountryPlan = retainedUnlocalizedCountryWorld.platforms!.HULU.ai!.slate
    .find(item => item.id === licensedPlan.id)!;
retainedUnlocalizedCountryPlan.localizationLevel = 'NONE';
retainedUnlocalizedCountryPlan.releaseCountryIds = ['GB'];
retainedUnlocalizedCountryPlan.releaseEntries[0].countryIds = ['JP'];
const allowedUnlocalizedEntryCountry = releasePlatformContentPlan({
    player: fixture,
    world: retainedUnlocalizedCountryWorld,
    platformId: 'HULU',
    planId: licensedPlan.id,
    absoluteWeek: PREMIERE_WEEK,
    performanceByProjectId: { [licensed.id]: performance('unlocalized-entry-country', 'SOLID') },
});
assert.equal(allowedUnlocalizedEntryCountry.changed, true, 'An unlocalized but active-country release remains allowed.');

const expectMalformedContractRejected = (
    label: string,
    mutate: (plan: PlatformAiContentPlan, contractRecord: OwnedStreamingCatalogLicense) => void,
): void => {
    const malformedWorld = structuredClone(licensedScheduled.world);
    const malformedPlan = malformedWorld.platforms!.HULU.ai!.slate.find(item => item.id === licensedPlan.id)!;
    const malformedContract = malformedWorld.platforms!.HULU.ai!.rightsContracts
        .find(item => item.id === licensedContract.id)!;
    mutate(malformedPlan, malformedContract);
    const before = structuredClone(malformedWorld);
    const result = releasePlatformContentPlan({
        player: fixture,
        world: malformedWorld,
        platformId: 'HULU',
        planId: licensedPlan.id,
        absoluteWeek: PREMIERE_WEEK,
        performanceByProjectId: { [licensed.id]: performance(`malformed-${label}`, 'SOLID') },
    });
    assert.equal(result.changed, false, label);
    assert.equal(result.reason, 'RIGHTS_BINDING_INVALID', label);
    assert.deepEqual(result.world, before, label);
};

expectMalformedContractRejected('cross-title source', (_plan, contractRecord) => {
    contractRecord.sourceProjectId = catalogueOne.id;
});
expectMalformedContractRejected('cross-platform buyer', (_plan, contractRecord) => {
    contractRecord.buyerPlatformId = 'NETFLIX';
});
expectMalformedContractRejected('mismatched plan binding', (_plan, contractRecord) => {
    contractRecord.platformContentPlanId = 'another-plan';
});
expectMalformedContractRejected('contract absent from plan', (plan) => {
    plan.rightsContractIds = [];
});

const licensedBefore = licensedScheduled.world.projects.find(item => item.id === licensed.id)!;
const licensedReleased = releasePlatformContentPlan({
    player: fixture,
    world: licensedScheduled.world,
    platformId: 'HULU',
    planId: licensedPlan.id,
    absoluteWeek: PREMIERE_WEEK,
    performanceByProjectId: { [licensed.id]: performance('licensed-performance', 'SOLID') },
});
const licensedAfter = licensedReleased.world.projects.find(item => item.id === licensed.id)!;
assert.equal(licensedReleased.world.projects.filter(item => item.id === licensed.id).length, 1);
assert.equal(licensedAfter.boxOffice, licensedBefore.boxOffice);
assert.equal(licensedAfter.releaseStrategy, 'THEATRICAL');
assert.equal(licensedAfter.streamingWindows?.at(-1)?.platformRelationship, 'LICENSEE');
world = licensedReleased.world;

const ownedContract = contract('owned-right', 'DISNEY_PLUS', 'owned-plan', ownedTransfer, 'OWNED_STUDIO_TRANSFER');
const ownedPlan = basePlan('DISNEY_PLUS', 'owned-plan', 'OWNED_STUDIO_TRANSFER', [ownedTransfer.id], [ownedContract.id]);
world = installPlan(fixture, world, 'DISNEY_PLUS', ownedPlan, [ownedContract]);
const ownedScheduled = schedule(fixture, world, 'DISNEY_PLUS', ownedPlan.id);
assert.equal(ownedScheduled.changed, true);
const ownedReleased = releasePlatformContentPlan({
    player: fixture,
    world: ownedScheduled.world,
    platformId: 'DISNEY_PLUS',
    planId: ownedPlan.id,
    absoluteWeek: PREMIERE_WEEK,
    performanceByProjectId: { [ownedTransfer.id]: performance('owned-performance', 'SOLID') },
});
assert.equal(ownedReleased.world.projects.find(item => item.id === ownedTransfer.id)?.streamingWindows?.[0].platformRelationship, 'OWNED_STUDIO');
world = ownedReleased.world;

const cataloguePlan = basePlan('APPLE_TV', 'catalogue-plan', 'CATALOGUE_ACQUISITION', [catalogueOne.id, catalogueTwo.id], ['catalogue-right-one', 'catalogue-right-two']);
cataloguePlan.localizationLevel = 'SUBTITLES';
const catalogueContracts = [
    contract('catalogue-right-one', 'APPLE_TV', cataloguePlan.id, catalogueOne, 'CATALOGUE_ACQUISITION'),
    contract('catalogue-right-two', 'APPLE_TV', cataloguePlan.id, catalogueTwo, 'CATALOGUE_ACQUISITION'),
];
world = installPlan(fixture, world, 'APPLE_TV', cataloguePlan, catalogueContracts);
const partialCatalogueLocalizationWorld = installLocalizationJobs(
    fixture,
    world,
    'APPLE_TV',
    cataloguePlan.id,
    { projectIds: [catalogueOne.id] },
);
assert.equal(
    schedulePlatformStreamingWindow({
        player: fixture,
        world: partialCatalogueLocalizationWorld,
        platformId: 'APPLE_TV',
        planId: cataloguePlan.id,
        absoluteWeek: ABSOLUTE_WEEK,
        premiereAtAbsoluteWeek: PREMIERE_WEEK,
    }).reason,
    'LOCALIZATION_NOT_READY',
    'A package plan must wait until every canonical source project has a matching READY job.',
);
const readyCatalogueLocalizationWorld = installLocalizationJobs(
    fixture,
    world,
    'APPLE_TV',
    cataloguePlan.id,
    {
        readyAtByProjectId: {
            [catalogueOne.id]: ABSOLUTE_WEEK - 1,
            [catalogueTwo.id]: ABSOLUTE_WEEK,
        },
    },
);
const directlyScheduledCatalogue = schedulePlatformStreamingWindow({
    player: fixture,
    world: readyCatalogueLocalizationWorld,
    platformId: 'APPLE_TV',
    planId: cataloguePlan.id,
    absoluteWeek: ABSOLUTE_WEEK,
    premiereAtAbsoluteWeek: PREMIERE_WEEK,
    releasePattern: 'SERIES_WEEKLY',
});
assert.equal(directlyScheduledCatalogue.changed, true, `A package with every exact READY job must schedule (${directlyScheduledCatalogue.reason}).`);
assert.equal(
    directlyScheduledCatalogue.plan?.localizationReadyAtAbsoluteWeek,
    ABSOLUTE_WEEK,
    'Package readiness must use the actual maximum READY week across canonical projects.',
);
const catalogueScheduled = schedule(fixture, world, 'APPLE_TV', cataloguePlan.id, 'SERIES_WEEKLY');
assert.equal(catalogueScheduled.plan?.releaseEntries.length, 2);
const catalogueMovieEntry = catalogueScheduled.plan?.releaseEntries.find(entry => entry.canonicalProjectId === catalogueOne.id)!;
const catalogueSeriesEntry = catalogueScheduled.plan?.releaseEntries.find(entry => entry.canonicalProjectId === catalogueTwo.id)!;
assert.equal(catalogueMovieEntry.releasePattern, 'MOVIE_SINGLE_PREMIERE');
assert.deepEqual(catalogueMovieEntry.installmentAbsoluteWeeks, [PREMIERE_WEEK]);
assert.equal(catalogueSeriesEntry.releasePattern, 'SERIES_WEEKLY');
assert.deepEqual(catalogueSeriesEntry.installmentAbsoluteWeeks, Array.from({ length: 8 }, (_, index) => PREMIERE_WEEK + index));
const catalogueReleased = releasePlatformContentPlan({
    player: fixture,
    world: catalogueScheduled.world,
    platformId: 'APPLE_TV',
    planId: cataloguePlan.id,
    absoluteWeek: PREMIERE_WEEK,
    performanceByProjectId: {
        [catalogueOne.id]: performance('catalogue-one-performance', 'SOLID'),
        [catalogueTwo.id]: performance('catalogue-two-performance', 'HIT'),
    },
});
const catalogueReleasedPlan = catalogueReleased.world.platforms!.APPLE_TV.ai!.slate
    .find(item => item.id === cataloguePlan.id)!;
const catalogueSettlementIds = (catalogueReleased.world.platforms!.APPLE_TV.ai as any).pendingAudienceSettlements
    .map((settlement: any) => settlement.id);
const catalogueWindowIds = catalogueReleasedPlan.releaseEntries.map(entry => entry.streamingWindowId);
assert.equal(catalogueSettlementIds.length, 2, 'A two-entry catalogue release must queue exactly two audience settlements.');
assert.equal(new Set(catalogueSettlementIds).size, 2, 'Multi-entry audience settlement IDs must be unique.');
assert.equal(new Set(catalogueWindowIds).size, 2, 'Multi-entry streaming window IDs must be unique.');
for (const entry of catalogueReleasedPlan.releaseEntries) {
    const matchingSettlements = (catalogueReleased.world.platforms!.APPLE_TV.ai as any).pendingAudienceSettlements
        .filter((settlement: any) => (
            settlement.streamingWindowId === entry.streamingWindowId
            && settlement.projectId === entry.canonicalProjectId
            && settlement.planId === cataloguePlan.id
        ));
    assert.equal(matchingSettlements.length, 1, `Release entry ${entry.id} must own exactly one deterministic audience settlement.`);
}
const deterministicCatalogueRelease = releasePlatformContentPlan({
    player: fixture,
    world: catalogueScheduled.world,
    platformId: 'APPLE_TV',
    planId: cataloguePlan.id,
    absoluteWeek: PREMIERE_WEEK,
    performanceByProjectId: {
        [catalogueOne.id]: performance('catalogue-one-performance', 'SOLID'),
        [catalogueTwo.id]: performance('catalogue-two-performance', 'HIT'),
    },
});
assert.deepEqual(
    (deterministicCatalogueRelease.world.platforms!.APPLE_TV.ai as any).pendingAudienceSettlements.map((settlement: any) => settlement.id),
    catalogueSettlementIds,
    'Equivalent multi-entry releases must reproduce the same deterministic settlement IDs.',
);
const replayedCatalogueRelease = releasePlatformContentPlan({
    player: fixture,
    world: catalogueReleased.world,
    platformId: 'APPLE_TV',
    planId: cataloguePlan.id,
    absoluteWeek: PREMIERE_WEEK,
    performanceByProjectId: {
        [catalogueOne.id]: performance('catalogue-one-performance', 'SOLID'),
        [catalogueTwo.id]: performance('catalogue-two-performance', 'HIT'),
    },
});
assert.equal(replayedCatalogueRelease.changed, false, 'Replaying a released multi-entry plan must be idempotent.');
assert.deepEqual(
    (replayedCatalogueRelease.world.platforms!.APPLE_TV.ai as any).pendingAudienceSettlements.map((settlement: any) => settlement.id),
    catalogueSettlementIds,
    'Replaying a released multi-entry plan must not duplicate its settlements.',
);
assert.equal(catalogueReleased.world.projects.filter(item => item.id === catalogueOne.id).length, 1);
assert.equal(catalogueReleased.world.projects.filter(item => item.id === catalogueTwo.id).length, 1);
assert.equal(catalogueReleased.world.projects.some(item => item.id === cataloguePlan.cataloguePackageId), false);
assert.equal(catalogueReleased.world.projects.find(item => item.id === catalogueOne.id)?.streamingWindows?.length, 1);
assert.equal(catalogueReleased.world.projects.find(item => item.id === catalogueTwo.id)?.streamingWindows?.length, 1);

// Non-exclusive windows coexist on one canonical title.
const secondWindowPlan = basePlan('APPLE_TV', 'second-window-plan', 'LICENSED_RELEASED_TITLE', [licensed.id], ['second-window-right']);
const secondWindowContract = contract('second-window-right', 'APPLE_TV', secondWindowPlan.id, licensed, 'LICENSED_RELEASED_TITLE');
world = installPlan(fixture, catalogueReleased.world, 'APPLE_TV', secondWindowPlan, [secondWindowContract]);
const secondWindowScheduled = schedulePlatformStreamingWindow({
    player: fixture,
    world: installLocalizationJobs(fixture, world, 'APPLE_TV', secondWindowPlan.id),
    platformId: 'APPLE_TV',
    planId: secondWindowPlan.id,
    absoluteWeek: ABSOLUTE_WEEK,
    premiereAtAbsoluteWeek: PREMIERE_WEEK + 1,
    localizationReadyAtAbsoluteWeek: PREMIERE_WEEK,
});
const secondWindowReleased = releasePlatformContentPlan({
    player: fixture,
    world: secondWindowScheduled.world,
    platformId: 'APPLE_TV',
    planId: secondWindowPlan.id,
    absoluteWeek: PREMIERE_WEEK + 1,
    performanceByProjectId: { [licensed.id]: performance('second-window-performance', 'SOLID') },
});
const licensedWindows = secondWindowReleased.world.projects.find(item => item.id === licensed.id)?.streamingWindows || [];
assert.deepEqual(new Set(licensedWindows.map(window => window.platformId)), new Set(['HULU', 'APPLE_TV']));
const multiWindowSettlements = (secondWindowReleased.world.platforms!.APPLE_TV.ai as any).pendingAudienceSettlements;
assert.equal(multiWindowSettlements.length, 3, 'Two catalogue entries plus a later title window must queue exactly three settlements.');
assert.equal(new Set(multiWindowSettlements.map((settlement: any) => settlement.id)).size, 3, 'Multiple release windows must never share a settlement ID.');
assert.equal(new Set(multiWindowSettlements.map((settlement: any) => settlement.streamingWindowId)).size, 3, 'Each settled release identity must point to one unique streaming window.');
const replayedSecondWindow = releasePlatformContentPlan({
    player: fixture,
    world: secondWindowReleased.world,
    platformId: 'APPLE_TV',
    planId: secondWindowPlan.id,
    absoluteWeek: PREMIERE_WEEK + 1,
    performanceByProjectId: { [licensed.id]: performance('second-window-performance', 'SOLID') },
});
assert.equal(replayedSecondWindow.changed, false, 'Replaying a later window release must be idempotent.');
assert.equal(
    (replayedSecondWindow.world.platforms!.APPLE_TV.ai as any).pendingAudienceSettlements.length,
    3,
    'Replaying a later window release must not duplicate any multi-window settlement.',
);

// Localization support is explicit and affects deterministic performance without mutating settlements.
const subsPerformancePlan = {
    ...basePlan('HULU', 'subs-performance-plan', 'LICENSED_RELEASED_TITLE', [licensed.id], ['subs-performance-right']),
    localizationLevel: 'SUBTITLES' as const,
    releaseCountryIds: ['JP'],
};
const dubsPerformancePlan = {
    ...basePlan('HULU', 'dubs-performance-plan', 'LICENSED_RELEASED_TITLE', [licensed.id], ['dubs-performance-right']),
    localizationLevel: 'DUBS_AND_SUBTITLES' as const,
    releaseCountryIds: ['JP'],
};
const subsPerformanceWorld = installLocalizationJobs(
    fixture,
    installPlan(fixture, secondWindowReleased.world, 'HULU', subsPerformancePlan, [
        contract('subs-performance-right', 'HULU', subsPerformancePlan.id, licensed, 'LICENSED_RELEASED_TITLE'),
    ]),
    'HULU', subsPerformancePlan.id,
);
const dubsPerformanceWorld = installLocalizationJobs(
    fixture,
    installPlan(fixture, secondWindowReleased.world, 'HULU', dubsPerformancePlan, [
        contract('dubs-performance-right', 'HULU', dubsPerformancePlan.id, licensed, 'LICENSED_RELEASED_TITLE'),
    ]),
    'HULU', dubsPerformancePlan.id,
);
const subsPerformance = calculatePlatformAiStreamingPerformance({
    player: fixture,
    world: subsPerformanceWorld,
    platformId: 'HULU',
    plan: subsPerformancePlan,
    project: licensed,
    absoluteWeek: PREMIERE_WEEK,
});
const dubsPerformance = calculatePlatformAiStreamingPerformance({
    player: fixture,
    world: dubsPerformanceWorld,
    platformId: 'HULU',
    plan: dubsPerformancePlan,
    project: licensed,
    absoluteWeek: PREMIERE_WEEK,
});
assert.ok(subsPerformance.localizationSupportMultiplier < dubsPerformance.localizationSupportMultiplier);
assert.ok(subsPerformance.viewsMillions < dubsPerformance.viewsMillions);

// Current awards history can carry stable project identity back into bounded memory.
let awardWorld = structuredClone(secondWindowReleased.world);
awardWorld.awardHistory.push({
    year: originalProject.year,
    type: 'EMMY',
    winners: [{
        category: 'Best Drama Series',
        winnerName: 'Original Actor',
        projectName: originalProject.title,
        projectId: originalProject.id,
        isPlayer: false,
    }],
});
const awardUpdate = updatePlatformAiMemory({
    player: fixture,
    world: awardWorld,
    platformId: 'NETFLIX',
    absoluteWeek: PREMIERE_WEEK + 12,
});
assert.equal(awardUpdate.world.platforms!.NETFLIX.ai!.releaseMemory.find(item => item.projectId === originalProject.id)?.awardWins, 1);

// Newest 12 memories, max 0.05 learning per release, max 0.5 total drift, and max 20-point belief shift.
let memoryWorld = awardUpdate.world;
let previousDelta = memoryWorld.platforms!.NETFLIX.ai!.effectiveCompetenceDelta;
let previousGenreScore = memoryWorld.platforms!.NETFLIX.ai!.genreMemory.DRAMA?.averageCommercialScore ?? 50;
for (let index = 0; index < 20; index += 1) {
    const memoryProject = project(`memory-${index}`, `Memory ${index}`, 'WARNER_BROS', 0);
    const recorded = recordPlatformAiReleaseMemory({
        player: fixture,
        world: memoryWorld,
        platformId: 'NETFLIX',
        project: memoryProject,
        performance: performance(`memory-performance-${index}`, index % 3 === 0 ? 'FLOP' : 'HIT'),
        absoluteWeek: PREMIERE_WEEK + index + 1,
    });
    const nextAi = recorded.world.platforms!.NETFLIX.ai!;
    assert.ok(Math.abs(nextAi.effectiveCompetenceDelta - previousDelta) <= 0.050_001);
    const nextGenreScore = nextAi.genreMemory.DRAMA?.averageCommercialScore ?? previousGenreScore;
    assert.ok(Math.abs(nextGenreScore - previousGenreScore) <= 20.000_001);
    previousDelta = nextAi.effectiveCompetenceDelta;
    previousGenreScore = nextGenreScore;
    memoryWorld = recorded.world;
}
assert.equal(memoryWorld.platforms!.NETFLIX.ai!.releaseMemory.length, 12);
assert.ok(Math.abs(memoryWorld.platforms!.NETFLIX.ai!.effectiveCompetenceDelta) <= 0.5);
assert.ok(memoryWorld.platforms!.NETFLIX.ai!.decisionHistory.length <= 40);

// Player acquisition disables all AI release and memory actions.
const acquiredPlayer = structuredClone(fixture);
acquiredPlayer.ownedStreamingPlatform.corporateDevelopment.acquiredPlatformIds = ['NETFLIX'];
const acquiredSchedule = schedulePlatformStreamingWindow({
    player: acquiredPlayer,
    world: memoryWorld,
    platformId: 'NETFLIX',
    planId: originalPlan.id,
    absoluteWeek: ABSOLUTE_WEEK,
    premiereAtAbsoluteWeek: PREMIERE_WEEK + 50,
});
assert.equal(acquiredSchedule.changed, false);
assert.equal(acquiredSchedule.reason, 'PLAYER_CONTROLLED');
const acquiredMemory = updatePlatformAiMemory({
    player: acquiredPlayer,
    world: memoryWorld,
    platformId: 'NETFLIX',
    absoluteWeek: PREMIERE_WEEK + 50,
});
assert.equal(acquiredMemory.changed, false);
assert.deepEqual(acquiredMemory.world, memoryWorld);

// Presentation events exclude routine bookkeeping and expose all required explanation fields.
const presentationPlatform = structuredClone(memoryWorld.platforms!.NETFLIX);
presentationPlatform.ai!.decisionHistory = [
    ...presentationPlatform.ai!.decisionHistory,
    { id: 'routine', absoluteWeek: PREMIERE_WEEK, type: 'ROUTINE_PAYMENT', summary: 'Routine', reason: 'Routine', cashImpactMillions: -1 },
    { id: 'major', absoluteWeek: PREMIERE_WEEK, type: 'MAJOR_RELEASE', summary: 'Major release', reason: 'Tentpole', cashImpactMillions: -12 },
];
const events = getPlatformAiPresentationEvents(presentationPlatform);
assert.equal(events.some(event => event.id === 'routine'), false);
assert.equal(events.some(event => event.id === 'major'), true);
assert.ok(events.every(event => event.summary && event.reason && event.timing && event.playerConsequence && Number.isFinite(event.cashImpactMillions)));

console.log('Platform AI release audit passed.');
