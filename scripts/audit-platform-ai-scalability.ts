import assert from 'node:assert/strict';
import type { IndustryProject, PlatformId, Player } from '../types';
import { processPlatformAiWorldTurn } from '../services/platformAi/platformAiTurn';
import {
    compactPlayerForPersistence,
    FULL_LOCAL_MIRROR_BUDGET_BYTES,
} from '../services/saveCompaction';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { getPlatformAiRightsMarketProjectUniverse } from '../services/platformAi/platformAiContentSourcing';
import {
    getPlatformAiNormalizationDiagnostics,
    normalizePlatformAiState,
    resetPlatformAiNormalizationDiagnostics,
} from '../services/platformAi/platformAiState';
import { createPlatformAiFixture } from './helpers/platformAiFixture';
import { processStreamingPlatformEcosystemTurn } from '../services/streamingPlatformEcosystemTurn';
import { normalizeWorldPlatformAi } from '../services/platformAi';
import { migratePlayerSave } from '../services/saveMigration';
import { normalizeStreamingPlatformEcosystem } from '../services/streamingPlatformEcosystem';

const player = createPlatformAiFixture();
const absoluteWeek = 1;

resetPlatformAiNormalizationDiagnostics();
const result = processPlatformAiWorldTurn(player, structuredClone(player.world), absoluteWeek);
const turnDiagnostics = getPlatformAiNormalizationDiagnostics();

assert.ok(
    turnDiagnostics.deepValidationCount <= 5,
    `One canonical five-platform turn may deeply validate at most once per platform; observed ${turnDiagnostics.deepValidationCount}.`,
);
assert.ok(
    turnDiagnostics.rebuildCount <= 5,
    `One canonical turn may rebuild at most once per platform; observed ${turnDiagnostics.rebuildCount}.`,
);

const serializedPlatform = JSON.parse(JSON.stringify(result.world.platforms!.NETFLIX));
serializedPlatform.ai.status = 'FORGED_STATUS';
resetPlatformAiNormalizationDiagnostics();
const repaired = normalizePlatformAiState(serializedPlatform, player.id, absoluteWeek + 1);
const boundaryDiagnostics = getPlatformAiNormalizationDiagnostics();

assert.equal(repaired.ai!.status, 'ACTIVE', 'Serialized save-boundary input must still receive full validation and repair.');
assert.equal(boundaryDiagnostics.deepValidationCount, 1, 'Save-boundary normalization must perform a deep validation.');
assert.equal(boundaryDiagnostics.rebuildCount, 1, 'Malformed save-boundary state must be rebuilt exactly once.');

const repairWeek = 50;
const futureDatedPlatform = structuredClone(result.world.platforms!.NETFLIX);
futureDatedPlatform.ai!.lastProcessedAbsoluteWeek = repairWeek + 500;
futureDatedPlatform.ai!.nextPlanningAbsoluteWeek = repairWeek + 500;
futureDatedPlatform.ai!.researchQueue = [{
    id: 'future-dated-research',
    idempotencyKey: 'platform-ai-research:future-dated-research',
    researchDefinitionId: 'localization-exchange',
    technologyDefinitionId: 'content_operations-2',
    branch: 'CONTENT_OPERATIONS',
    targetLevel: 22,
    buildMode: 'BALANCED',
    stage: 'RESEARCHING',
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
    startedAtAbsoluteWeek: repairWeek + 400,
    stageStartedAtAbsoluteWeek: repairWeek + 410,
    stageReadyAtAbsoluteWeek: repairWeek + 900,
    completedAtAbsoluteWeek: repairWeek + 950,
    lastProcessedAbsoluteWeek: repairWeek + 920,
}];
const repairedFutureDates = normalizePlatformAiState(futureDatedPlatform, player.id, repairWeek);
assert.equal(
    repairedFutureDates.ai!.lastProcessedAbsoluteWeek,
    repairWeek - 1,
    'A future checkpoint must repair to the prior week so the current turn cannot remain frozen.',
);
assert.equal(
    repairedFutureDates.ai!.nextPlanningAbsoluteWeek,
    repairWeek,
    'An implausibly future planning checkpoint must become due in the current week.',
);
assert.deepEqual(
    {
        startedAtAbsoluteWeek: repairedFutureDates.ai!.researchQueue[0]?.startedAtAbsoluteWeek,
        stageStartedAtAbsoluteWeek: repairedFutureDates.ai!.researchQueue[0]?.stageStartedAtAbsoluteWeek,
        stageReadyAtAbsoluteWeek: repairedFutureDates.ai!.researchQueue[0]?.stageReadyAtAbsoluteWeek,
        completedAtAbsoluteWeek: repairedFutureDates.ai!.researchQueue[0]?.completedAtAbsoluteWeek,
        lastProcessedAbsoluteWeek: repairedFutureDates.ai!.researchQueue[0]?.lastProcessedAbsoluteWeek,
    },
    {
        startedAtAbsoluteWeek: repairWeek,
        stageStartedAtAbsoluteWeek: repairWeek,
        stageReadyAtAbsoluteWeek: repairWeek + 2,
        completedAtAbsoluteWeek: null,
        lastProcessedAbsoluteWeek: repairWeek - 1,
    },
    'Future research timestamps must repair to a valid current schedule without an indefinite wait.',
);
const futureTurnWorld = structuredClone(result.world);
futureTurnWorld.platforms!.NETFLIX = futureDatedPlatform;
const resumedFutureTurn = processPlatformAiWorldTurn(
    { ...player, world: futureTurnWorld },
    futureTurnWorld,
    repairWeek,
);
assert.equal(
    resumedFutureTurn.world.platforms!.NETFLIX.ai!.lastProcessedAbsoluteWeek,
    repairWeek,
    'A platform repaired from a future checkpoint must process the current weekly turn.',
);

const historyPlayer = createPlatformAiFixture();
const historyTurn = processPlatformAiWorldTurn(historyPlayer, structuredClone(historyPlayer.world), 1);
const historyPlatform = historyTurn.world.platforms!.NETFLIX;
const basePlan = historyPlatform.ai!.slate[0];
assert.ok(basePlan, 'The scalability fixture requires one canonical content plan.');

const terminalPlans = Array.from({ length: 140 }, (_, index) => ({
    ...structuredClone(basePlan),
    id: `terminal-plan-${String(index).padStart(3, '0')}`,
    title: `Terminal Plan ${index}`,
    status: 'CANCELLED' as const,
    sourceProjectIds: [],
    rightsContractIds: [],
    releaseEntries: [],
    committedAtAbsoluteWeek: index + 1,
    releasedAtAbsoluteWeek: null,
    industryProductionId: null,
}));
const pendingReferencedPlan = {
    ...structuredClone(basePlan),
    id: 'pending-referenced-terminal-plan',
    title: 'Pending Referenced Terminal Plan',
    status: 'CANCELLED' as const,
    sourceProjectIds: [],
    rightsContractIds: [],
    releaseEntries: [],
    committedAtAbsoluteWeek: 0,
    releasedAtAbsoluteWeek: null,
    industryProductionId: null,
};
const activePlan = {
    ...structuredClone(basePlan),
    id: 'active-scheduled-plan',
    title: 'Active Scheduled Plan',
    status: 'SCHEDULED' as const,
    sourceProjectIds: [],
    rightsContractIds: [],
    releaseEntries: [],
    committedAtAbsoluteWeek: 1,
    premiereAtAbsoluteWeek: 5000,
    releasedAtAbsoluteWeek: null,
    industryProductionId: null,
};

historyTurn.world.platforms!.NETFLIX = {
    ...historyPlatform,
    ai: {
        ...historyPlatform.ai!,
        slate: [...terminalPlans, pendingReferencedPlan, activePlan],
        pendingAudienceSettlements: [{
            id: 'pending-audience-reference',
            streamingWindowId: 'pending-window',
            projectId: 'pending-project',
            planId: pendingReferencedPlan.id,
            subscriberImpactMillions: 1,
            status: 'PENDING',
            createdAtAbsoluteWeek: 1,
            settledAtAbsoluteWeek: null,
        }],
        talentBookingRefs: ['terminal-booking-protected', 'active-booking'],
    },
};

historyTurn.world.industryProductions = Object.fromEntries([
    ...Array.from({ length: 140 }, (_, index) => [`terminal-production-${String(index).padStart(3, '0')}`, {
        id: `terminal-production-${String(index).padStart(3, '0')}`,
        canonicalProjectId: `terminal-production-project-${index}`,
        title: `Terminal Production ${index}`,
        projectType: 'MOVIE',
        genre: 'DRAMA',
        producerStudioId: 'WARNER_BROS',
        commissioningPlatformId: 'NETFLIX',
        status: 'DELIVERED',
        productionCalendar: { totalWeeks: 10, preProductionWeeks: 2, productionWeeks: 4, postProductionWeeks: 4, elapsedWeeks: 10 },
        budgetMillions: 10,
        paidMillions: 10,
        talentBookingIds: [],
        writerSource: 'IN_HOUSE_TEAM',
        writerId: null,
        writerName: 'History Writer',
        writerSkill: 70,
        createdAtAbsoluteWeek: index,
        updatedAtAbsoluteWeek: index,
    }]),
    ['active-production', {
        id: 'active-production',
        canonicalProjectId: 'active-production-project',
        title: 'Active Production',
        projectType: 'MOVIE',
        genre: 'DRAMA',
        producerStudioId: 'WARNER_BROS',
        commissioningPlatformId: 'NETFLIX',
        status: 'PRODUCTION',
        productionCalendar: { totalWeeks: 10, preProductionWeeks: 2, productionWeeks: 4, postProductionWeeks: 4, elapsedWeeks: 3 },
        budgetMillions: 10,
        paidMillions: 4,
        talentBookingIds: ['active-booking'],
        writerSource: 'IN_HOUSE_TEAM',
        writerId: null,
        writerName: 'Active Writer',
        writerSkill: 75,
        createdAtAbsoluteWeek: 1,
        updatedAtAbsoluteWeek: 1,
    }],
] as Array<[string, any]>);
historyTurn.world.talentBookings = [
    ...Array.from({ length: 240 }, (_, index) => ({
        id: index === 0 ? 'terminal-booking-protected' : `terminal-booking-${String(index).padStart(3, '0')}`,
        npcId: `history-npc-${index}`,
        role: 'ACTOR' as const,
        projectId: `history-booking-project-${index}`,
        projectOwner: 'INDUSTRY_PRODUCTION' as const,
        producerStudioId: 'WARNER_BROS' as const,
        commissioningPlatformId: 'NETFLIX' as const,
        startAbsoluteWeek: index,
        endAbsoluteWeek: index + 1,
        status: 'RELEASED' as const,
        releasedAtAbsoluteWeek: index + 2,
    })),
    {
        id: 'active-booking',
        npcId: 'active-history-npc',
        role: 'ACTOR',
        projectId: 'active-production-project',
        projectOwner: 'INDUSTRY_PRODUCTION',
        producerStudioId: 'WARNER_BROS',
        commissioningPlatformId: 'NETFLIX',
        startAbsoluteWeek: 1,
        endAbsoluteWeek: 5000,
        status: 'BOOKED',
    },
];
historyTurn.world.awardHistory = Array.from({ length: 140 }, (_, index) => ({
    year: index + 1,
    type: 'OSCAR' as const,
    winners: [{
        category: 'Best Picture',
        winnerName: `Winner ${index}`,
        projectName: `Award Project ${index}`,
        projectId: `award-project-${index}`,
        isPlayer: false,
    }],
}));

const compactedHistory = compactPlayerForPersistence({
    ...historyPlayer,
    age: 96,
    currentWeek: 1,
    world: historyTurn.world,
});
const compactedAi = compactedHistory.world.platforms!.NETFLIX.ai!;
assert.ok(compactedAi.slate.length <= 106, `Terminal slate history must be bounded; observed ${compactedAi.slate.length}.`);
assert.ok(compactedAi.slate.some(plan => plan.id === activePlan.id), 'Every active or scheduled plan must survive compaction.');
assert.ok(compactedAi.slate.some(plan => plan.id === pendingReferencedPlan.id), 'Pending settlement references must protect terminal plans.');
assert.ok(Object.keys(compactedHistory.world.industryProductions || {}).length <= 105, 'Terminal industry productions must be bounded.');
assert.ok(compactedHistory.world.industryProductions?.['active-production'], 'Every active industry production must survive compaction.');
assert.ok((compactedHistory.world.talentBookings || []).length <= 210, 'Terminal talent-booking history must be bounded.');
assert.ok(compactedHistory.world.talentBookings?.some(booking => booking.id === 'active-booking'), 'Every booked talent window must survive compaction.');
assert.ok(compactedHistory.world.talentBookings?.some(booking => booking.id === 'terminal-booking-protected'), 'Platform booking references must protect terminal bookings.');
assert.equal(compactedHistory.world.awardHistory.length, 104, 'Award history must retain the newest 104 canonical seasons.');
assert.deepEqual(
    compactPlayerForPersistence(compactedHistory).world,
    compactedHistory.world,
    'Persistence history compaction must be deterministic and idempotent.',
);

const projectRetentionPlayer = structuredClone(compactedHistory);
projectRetentionPlayer.age = 96;
projectRetentionPlayer.currentWeek = 1;
const projectRetentionWeek = getAbsoluteWeek(projectRetentionPlayer.age, projectRetentionPlayer.currentWeek);
const makeHistoryProject = (index: number): IndustryProject => ({
    id: `retention-project-${String(index).padStart(4, '0')}`,
    title: `Retention Project ${index}`,
    genre: 'DRAMA',
    mediaType: 'MOVIE',
    targetAudience: 'PG-13',
    studioId: 'UNIVERSAL',
    budgetTier: 'MID',
    quality: 50 + index % 40,
    rating: 5 + index % 4,
    boxOffice: 10_000_000 + index,
    year: 18 + Math.floor(index / 52),
    weekReleased: index % 52 + 1,
    leadActorId: `retention-lead-${index}`,
    leadActorName: `Retention Lead ${index}`,
    directorName: `Retention Director ${index}`,
    reviews: 'Historical rights-market fixture.',
    streamingWindows: [{
        id: `expired-retention-window-${index}`,
        platformId: 'HULU',
        platformContentPlanId: `expired-retention-plan-${index}`,
        rightsContractId: null,
        contentSource: 'LICENSED_RELEASED_TITLE',
        platformRelationship: 'LICENSEE',
        countryIds: [],
        startsAtAbsoluteWeek: projectRetentionWeek - 20,
        expiresAtAbsoluteWeek: projectRetentionWeek - 10,
        exclusivity: 'NON_EXCLUSIVE',
        localizationLevel: 'NONE',
        releasePattern: 'MOVIE_SINGLE_PREMIERE',
        installmentAbsoluteWeeks: [projectRetentionWeek - 20],
        performance: {
            calculatedAtAbsoluteWeek: projectRetentionWeek - 20,
            viewsMillions: 1,
            subscriberImpactMillions: 0,
            engagementIndexDelta: 0,
            commercialScore: 70,
            prestigeScore: 60,
            localizationSupportMultiplier: 1,
            outcome: 'SOLID',
            seed: `retention-window-${index}`,
        },
    }],
});
const retentionProjects = Array.from({ length: 950 }, (_, index) => makeHistoryProject(index));
const expiredOnlyProjectId = retentionProjects[0].id;
const liveWindowProjectId = retentionProjects[1].id;
const activeRightsProjectId = retentionProjects[2].id;
const activeSlateProjectId = retentionProjects[3].id;
const activeProductionProjectId = retentionProjects[4].id;
const awardLinkedProjectId = retentionProjects[5].id;
retentionProjects[1].streamingWindows!.push({
    ...structuredClone(retentionProjects[1].streamingWindows![0]),
    id: 'live-retention-window',
    platformContentPlanId: 'live-retention-plan',
    startsAtAbsoluteWeek: projectRetentionWeek - 1,
    expiresAtAbsoluteWeek: projectRetentionWeek + 12,
});
projectRetentionPlayer.world.projects = retentionProjects;
const retainedPlatform = projectRetentionPlayer.world.platforms!.NETFLIX;
const retainedAi = retainedPlatform.ai!;
const activeRetentionPlan = {
    ...structuredClone(retainedAi.slate.find(plan => plan.status === 'SCHEDULED') || retainedAi.slate[0]),
    id: 'active-retention-plan',
    title: 'Active Retention Plan',
    status: 'SCHEDULED' as const,
    source: 'LICENSED_RELEASED_TITLE' as const,
    sourceProjectIds: [activeSlateProjectId],
    rightsContractIds: [],
    releaseEntries: [],
    industryProductionId: null,
    premiereAtAbsoluteWeek: projectRetentionWeek + 8,
    releasedAtAbsoluteWeek: null,
};
assert.ok(activeRetentionPlan.forecast, 'The project-retention fixture requires a canonical content-plan base.');
retainedAi.slate = [...retainedAi.slate, activeRetentionPlan];
retainedAi.rightsContracts = [...retainedAi.rightsContracts, {
    id: 'active-retention-rights',
    sourceProjectId: activeRightsProjectId,
    titleAtSigning: 'Active Retention Rights',
    projectType: 'MOVIE',
    genre: 'DRAMA',
    licensorName: 'Universal',
    territory: 'GLOBAL',
    durationWeeks: 104,
    exclusivity: 'NON_EXCLUSIVE',
    minimumGuarantee: 10_000_000,
    platformRevenueShare: 70,
    licensorRevenueShare: 30,
    signedAtAbsoluteWeek: projectRetentionWeek - 1,
    startsAtAbsoluteWeek: projectRetentionWeek - 1,
    expiresAtAbsoluteWeek: projectRetentionWeek + 103,
    status: 'ACTIVE',
    origin: 'STUDIO_MARKET',
    buyerPlatformId: 'NETFLIX',
    platformContentPlanId: null,
}];
projectRetentionPlayer.world.industryProductions = {
    'active-retention-production': {
        id: 'active-retention-production',
        canonicalProjectId: activeProductionProjectId,
        title: 'Active Retention Production',
        projectType: 'MOVIE',
        genre: 'DRAMA',
        producerStudioId: 'WARNER_BROS',
        commissioningPlatformId: 'NETFLIX',
        status: 'PRODUCTION',
        productionCalendar: { totalWeeks: 10, preProductionWeeks: 2, productionWeeks: 4, postProductionWeeks: 4, focusWindowWeeks: 1, elapsedWeeks: 3 },
        budgetMillions: 10,
        paidMillions: 4,
        talentBookingIds: [],
        writerSource: 'IN_HOUSE_TEAM',
        writerId: null,
        writerName: 'Retention Writer',
        writerSkill: 75,
        createdAtAbsoluteWeek: projectRetentionWeek - 3,
        updatedAtAbsoluteWeek: projectRetentionWeek,
    },
};
projectRetentionPlayer.world.awardHistory = [{
    year: 95,
    type: 'OSCAR',
    winners: [{
        category: 'Best Picture',
        winnerName: 'Retention Winner',
        projectName: 'Award-linked Retention Project',
        projectId: awardLinkedProjectId,
        isPlayer: false,
    }],
}];
const expectedMarketUniverseIds = new Set(
    getPlatformAiRightsMarketProjectUniverse(retentionProjects, projectRetentionWeek).map(project => project.id),
);
const compactedProjectHistory = compactPlayerForPersistence(projectRetentionPlayer);
const compactedProjectIds = new Set(compactedProjectHistory.world.projects.map(project => project.id));
assert.ok(
    compactedProjectHistory.world.projects.length <= 900,
    `World-project persistence must remain bounded at 900; observed ${compactedProjectHistory.world.projects.length}.`,
);
for (const projectId of [
    liveWindowProjectId,
    activeRightsProjectId,
    activeSlateProjectId,
    activeProductionProjectId,
    awardLinkedProjectId,
]) {
    assert.ok(compactedProjectIds.has(projectId), `Live/material project ${projectId} must survive persistence compaction.`);
}
for (const projectId of expectedMarketUniverseIds) {
    assert.ok(compactedProjectIds.has(projectId), `Rights-market project ${projectId} must survive persistence compaction.`);
}
assert.equal(compactedProjectIds.has(expiredOnlyProjectId), false, 'Expired unreferenced window history must not protect a project forever.');
assert.ok(compactedProjectIds.has(retentionProjects.at(-1)!.id), 'The newest unreferenced market project must survive compaction.');
assert.ok(
    Buffer.byteLength(JSON.stringify(compactedProjectHistory), 'utf8') <= FULL_LOCAL_MIRROR_BUDGET_BYTES,
    'The realistic 950-project save must remain within the full local-mirror byte budget.',
);
assert.deepEqual(
    compactPlayerForPersistence(compactedProjectHistory).world.projects,
    compactedProjectHistory.world.projects,
    'World-project persistence compaction must be deterministic and idempotent.',
);

// Phase 5 adverse replay: 260 weekly decisions must survive a JSON save/migration boundary exactly.
const phase5PlatformIds: PlatformId[] = ['NETFLIX', 'APPLE_TV', 'DISNEY_PLUS', 'HULU', 'YOUTUBE'];
const phase5StartWeek = 2_200;
const setPlayerDate = (subject: Player, absoluteWeek: number): Player => ({
    ...subject,
    age: Math.floor(absoluteWeek / 52) + 1,
    currentWeek: absoluteWeek % 52 + 1,
});
const createAdversePhase5Fixture = (): Player => {
    let subject = createPlatformAiFixture();
    subject = setPlayerDate(subject, phase5StartWeek - 1);
    subject.world = normalizeWorldPlatformAi(subject, subject.world, phase5StartWeek - 1);
    const distressSeeds: Partial<Record<PlatformId, { cash: number; debt: number; subscribers: number; valuation: number }>> = {
        NETFLIX: { cash: 0, debt: 6_000, subscribers: 0, valuation: 0 },
        APPLE_TV: { cash: 15, debt: 3_500, subscribers: 35, valuation: 900 },
        HULU: { cash: 0, debt: 1_200, subscribers: 2, valuation: 12 },
    };
    for (const platformId of phase5PlatformIds) {
        const platform = subject.world.platforms![platformId];
        const seed = distressSeeds[platformId];
        platform.ai!.lastProcessedAbsoluteWeek = phase5StartWeek - 1;
        platform.ai!.nextPlanningAbsoluteWeek = phase5StartWeek;
        if (!seed) continue;
        platform.cashReserve = seed.cash;
        platform.subscribers = seed.subscribers;
        platform.valuation = seed.valuation;
        platform.ai!.status = 'ACTIVE';
        platform.ai!.debtMillions = seed.debt;
        platform.ai!.standaloneValuationBillions = seed.valuation;
    }
    subject.world.streamingPlatformEcosystem = normalizeStreamingPlatformEcosystem(
        subject.world.streamingPlatformEcosystem,
        phase5StartWeek - 1,
    );
    subject.world.streamingPlatformEcosystem.lastProcessedAbsoluteWeek = phase5StartWeek - 1;
    return subject;
};
const runPhase5Weeks = (source: Player, startAbsoluteWeek: number, count: number): Player => {
    let subject = structuredClone(source);
    for (let offset = 0; offset < count; offset += 1) {
        const absoluteWeek = startAbsoluteWeek + offset;
        subject = setPlayerDate(subject, absoluteWeek);
        const platformTurn = processPlatformAiWorldTurn(subject, subject.world, absoluteWeek);
        subject = { ...subject, world: platformTurn.world };
        const ecosystemTurn = processStreamingPlatformEcosystemTurn(subject, subject.world, absoluteWeek);
        subject = { ...subject, world: ecosystemTurn.world };
    }
    return subject;
};
const canonicalPhase5Projection = (subject: Player) => ({
    platforms: Object.fromEntries(phase5PlatformIds.map(platformId => {
        const platform = subject.world.platforms![platformId];
        const ai = platform.ai!;
        return [platformId, {
            cashReserve: platform.cashReserve,
            subscribers: platform.subscribers,
            valuation: platform.valuation,
            status: ai.status,
            debtMillions: ai.debtMillions,
            financeHistory: ai.financeHistory,
            spendingRestrictions: ai.spendingRestrictions,
            rescues: { last: ai.lastRescueAbsoluteWeek, count: ai.rescueCount },
            externalRecapitalizations: ai.externalRecapitalizations,
            administration: ai.administration,
            distressEpisodes: ai.distressEpisodes,
            slateIds: ai.slate.map(plan => plan.id).sort(),
            rightsContractIds: ai.rightsContracts.map(contract => contract.id).sort(),
        }];
    })),
    catalogueDistressDeals: subject.world.platformAiCatalogueDistressDeals,
    ecosystem: {
        operators: subject.world.streamingPlatformEcosystem!.operators,
        markets: subject.world.streamingPlatformEcosystem!.markets,
        eventIds: subject.world.streamingPlatformEcosystem!.eventHistory.map(event => event.id),
        launchSequence: subject.world.streamingPlatformEcosystem!.launchSequence,
    },
});
const adverseSeed = createAdversePhase5Fixture();
const uninterruptedPhase5 = runPhase5Weeks(adverseSeed, phase5StartWeek, 260);
const firstHalfPhase5 = runPhase5Weeks(adverseSeed, phase5StartWeek, 130);
const resumedSeedPhase5 = migratePlayerSave(JSON.parse(JSON.stringify(firstHalfPhase5)));
const resumedPhase5 = runPhase5Weeks(resumedSeedPhase5, phase5StartWeek + 130, 130);
const uninterruptedProjection = canonicalPhase5Projection(uninterruptedPhase5);
const resumedProjection = canonicalPhase5Projection(resumedPhase5);
assert.deepEqual(
    resumedProjection,
    uninterruptedProjection,
    'A 260-week Phase 5 run must be identical after a JSON save/migration boundary at week 130.',
);
const assertFiniteProjection = (value: unknown, path = 'phase5'): void => {
    if (typeof value === 'number') {
        assert.ok(Number.isFinite(value), `${path} must remain finite.`);
        return;
    }
    if (Array.isArray(value)) {
        value.forEach((item, index) => assertFiniteProjection(item, `${path}[${index}]`));
        return;
    }
    if (value && typeof value === 'object') {
        Object.entries(value).forEach(([key, item]) => assertFiniteProjection(item, `${path}.${key}`));
    }
};
assertFiniteProjection(uninterruptedProjection);
let distressedPlatformCount = 0;
let externallyFundedPlatformCount = 0;
for (const platformId of phase5PlatformIds) {
    const ai = uninterruptedPhase5.world.platforms![platformId].ai!;
    if (ai.distressEpisodes.length > 0) distressedPlatformCount += 1;
    if (ai.externalRecapitalizations.some(record => record.status === 'SETTLED')) externallyFundedPlatformCount += 1;
    assert.equal(new Set(ai.financeHistory.map(snapshot => snapshot.absoluteWeek)).size, ai.financeHistory.length, `${platformId} cannot duplicate finance weeks.`);
    assert.equal(new Set(ai.externalRecapitalizations.map(record => record.id)).size, ai.externalRecapitalizations.length, `${platformId} cannot duplicate financing IDs.`);
    assert.equal(new Set(ai.slate.map(plan => plan.id)).size, ai.slate.length, `${platformId} cannot clone content plans.`);
    assert.equal(new Set(ai.rightsContracts.map(contract => contract.id)).size, ai.rightsContracts.length, `${platformId} cannot clone rights contracts.`);
    for (const snapshot of ai.financeHistory) {
        assert.equal(snapshot.recurringEfficiency.controller, 'AI');
        assert.ok(snapshot.recurringEfficiency.costMultiplier >= 0.88 && snapshot.recurringEfficiency.costMultiplier <= 0.95);
    }
    if (ai.administration) {
        assert.ok(Array.isArray(ai.slate) && Array.isArray(ai.rightsContracts), `${platformId} administration must preserve canonical assets.`);
    }
}
assert.ok(distressedPlatformCount >= 1, 'At least one adverse seed must enter the durable distress system.');
assert.ok(externallyFundedPlatformCount < distressedPlatformCount, 'Distress cannot imply automatic external funding for every platform.');
const ecosystem = uninterruptedPhase5.world.streamingPlatformEcosystem!;
assert.ok(Object.values(ecosystem.operators).filter(operator => operator.kind === 'DYNAMIC_FICTIONAL' && operator.lifecycle !== 'CLOSED').length < 24);
assert.ok(ecosystem.eventHistory.length <= 120);
for (const market of Object.values(ecosystem.markets)) {
    const total = market.shares.reduce((sum, share) => sum + share.sharePercent, 0) + market.othersSharePercent;
    assert.equal(Math.round(total * 100), 10_000, `${market.countryId} shares must remain normalized after 260 weeks.`);
}

console.log('Platform AI scalability audit passed.');
