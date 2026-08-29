import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type {
    IndustryProject,
    PlatformAiContentSource,
    PlatformId,
    Player,
    StudioId,
    WorldState,
} from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import {
    buildPlatformContentCandidates,
    commissionPlatformAiOriginal,
    commitPlatformContentCandidate,
    getPlatformAiTurnIdempotencyKey,
    PLATFORM_AI_PROFILES,
    processPlatformAiWorldTurn,
} from '../services/platformAi';
import { projectStreamingRivalsFromCanonicalWorld } from '../services/streamingCompetitiveWorld';
import { createPlatformAiFixture } from './helpers/platformAiFixture';

const PLATFORM_IDS: PlatformId[] = ['NETFLIX', 'APPLE_TV', 'DISNEY_PLUS', 'HULU', 'YOUTUBE'];
const START_WEEK = getAbsoluteWeek(40, 12);

assert.equal(
    getPlatformAiTurnIdempotencyKey('NETFLIX', START_WEEK),
    `platform-ai-turn:NETFLIX:${START_WEEK}`,
    'The weekly checkpoint must expose the stable platform/week idempotency key.',
);

const makeProject = (
    id: string,
    studioId: StudioId,
    genre: IndustryProject['genre'],
    mediaType: IndustryProject['mediaType'] = 'MOVIE',
): IndustryProject => ({
    id,
    title: `Canonical ${id}`,
    genre,
    mediaType,
    targetAudience: 'PG-13',
    studioId,
    budgetTier: 'MID',
    quality: 78,
    rating: 7.8,
    boxOffice: mediaType === 'MOVIE' ? 145_000_000 : 0,
    year: 39,
    weekReleased: 20,
    leadActorId: `actor-${id}`,
    leadActorName: `Actor ${id}`,
    directorName: `Director ${id}`,
    reviews: 'A stable canonical fixture.',
    releaseStrategy: mediaType === 'MOVIE' ? 'THEATRICAL' : 'STREAMING_ONLY',
});

const sourceProjects: IndustryProject[] = [
    makeProject('universal-1', 'UNIVERSAL', 'THRILLER'),
    makeProject('universal-2', 'UNIVERSAL', 'DRAMA'),
    makeProject('universal-3', 'UNIVERSAL', 'CRIME', 'SERIES'),
    makeProject('lionsgate-1', 'LIONSGATE', 'ACTION'),
    makeProject('lionsgate-2', 'LIONSGATE', 'COMEDY'),
    makeProject('lionsgate-3', 'LIONSGATE', 'MYSTERY'),
    makeProject('pixar-1', 'PIXAR', 'ANIMATION'),
];

const createFixture = (): Player => {
    const player = createPlatformAiFixture();
    player.world = {
        ...structuredClone(player.world),
        projects: structuredClone(sourceProjects),
    };
    return player;
};

// A completely fresh rival runtime must process the first canonical week once.
const weekZeroFixture = createFixture();
for (const platformId of PLATFORM_IDS) delete weekZeroFixture.world.platforms?.[platformId].ai;
const weekZeroBefore = structuredClone(weekZeroFixture.world);
const weekZero = processPlatformAiWorldTurn(weekZeroFixture, weekZeroFixture.world, 0);
assert.deepEqual(weekZeroFixture.world, weekZeroBefore, 'The week-zero turn must not mutate its input world.');
for (const platformId of PLATFORM_IDS) {
    const ai = weekZero.world.platforms?.[platformId].ai;
    assert.equal(ai?.lastProcessedAbsoluteWeek, 0, `${platformId} must process and checkpoint absolute week zero.`);
    assert.equal(ai?.financeHistory.at(-1)?.absoluteWeek, 0, `${platformId} must settle its week-zero economy.`);
    assert.equal(ai?.strategyCycle, 1, `${platformId} must run its first planning cycle in week zero.`);
    assert.equal(
        ai?.nextPlanningAbsoluteWeek,
        PLATFORM_AI_PROFILES[platformId].planningCadenceWeeks,
        `${platformId} must schedule its next profile cadence from week zero.`,
    );
    assert.ok(
        (ai?.marketOperations || []).every(operation => (
            operation.plannedAtAbsoluteWeek >= 0
            && (operation.activatedAtAbsoluteWeek ?? 0) >= 0
        )),
        `${platformId} must not leak the -1 checkpoint sentinel into canonical market dates.`,
    );
}
const repeatedWeekZero = processPlatformAiWorldTurn(weekZeroFixture, weekZero.world, 0);
assert.deepEqual(repeatedWeekZero.world, weekZero.world, 'Week zero must be idempotent after its first checkpoint.');
assert.deepEqual(repeatedWeekZero.news, [], 'Week-zero replay must emit no duplicate presentation news.');
assert.deepEqual(repeatedWeekZero.logs, [], 'Week-zero replay must emit no duplicate logs.');

const weekOneAfterWeekZero = processPlatformAiWorldTurn(weekZeroFixture, weekZero.world, 1);
const weekZeroPresentations = new Set(weekZero.news.map(item => `${item.headline}\n${item.subtext}`));
assert.ok(
    weekOneAfterWeekZero.news.every(item => !weekZeroPresentations.has(`${item.headline}\n${item.subtext}`)),
    'A presentation event emitted in week zero must not be emitted again in a later week.',
);

const first = createFixture();
const playerStreamingBefore = structuredClone(first.ownedStreamingPlatform);
const deterministicA = processPlatformAiWorldTurn(first, structuredClone(first.world), START_WEEK);
const deterministicB = processPlatformAiWorldTurn(first, structuredClone(first.world), START_WEEK);
assert.deepEqual(deterministicA, deterministicB, 'Equal Platform AI turn inputs must produce equal world, news and logs.');
assert.deepEqual(first.ownedStreamingPlatform, playerStreamingBefore, 'The rival turn must not touch player-owned streaming state.');
for (const platformId of PLATFORM_IDS) {
    assert.equal(
        deterministicA.world.platforms?.[platformId].ai?.lastProcessedAbsoluteWeek,
        START_WEEK,
        `${platformId} must checkpoint its first real turn instead of being skipped by fresh normalization.`,
    );
}

const sameWeek = processPlatformAiWorldTurn(first, deterministicA.world, START_WEEK);
assert.deepEqual(sameWeek.world, deterministicA.world, 'Reprocessing the same week must be a state no-op.');
assert.deepEqual(sameWeek.news, [], 'Reprocessing the same week must not emit duplicate presentation news.');
assert.deepEqual(sameWeek.logs, [], 'Reprocessing the same week must not emit duplicate logs.');

const economyLookupWeek = START_WEEK + 1;
const economyLookupWorld = structuredClone(deterministicA.world);
for (const platformId of PLATFORM_IDS) {
    economyLookupWorld.platforms![platformId].ai!.lastProcessedAbsoluteWeek = platformId === 'APPLE_TV'
        ? economyLookupWeek - 1
        : economyLookupWeek;
}
economyLookupWorld.industryProductions = {
    ...(economyLookupWorld.industryProductions || {}),
    'turn-economy-lookup-production': {
        id: 'turn-economy-lookup-production',
        canonicalProjectId: 'turn-economy-lookup-project',
        title: 'Turn Economy Lookup',
        projectType: 'MOVIE',
        genre: 'DRAMA',
        producerStudioId: 'WARNER_BROS',
        commissioningPlatformId: 'APPLE_TV',
        status: 'PRODUCTION',
        productionCalendar: { startAbsoluteWeek: START_WEEK, plannedEndAbsoluteWeek: START_WEEK + 10, currentMilestone: 'PRODUCTION', milestones: [] } as never,
        budgetMillions: 120,
        paidMillions: 20,
        talentBookingIds: [],
        writerSource: 'IN_HOUSE_TEAM',
        writerId: null,
        writerName: 'Turn Audit Writer',
        writerSkill: 80,
        createdAtAbsoluteWeek: START_WEEK,
        updatedAtAbsoluteWeek: START_WEEK,
    },
};
const staleEconomyLookupPlayer = { ...first, world: first.world };
const synchronizedEconomyLookupPlayer = { ...first, world: economyLookupWorld };
const staleEconomyLookupTurn = processPlatformAiWorldTurn(
    staleEconomyLookupPlayer,
    structuredClone(economyLookupWorld),
    economyLookupWeek,
);
const synchronizedEconomyLookupTurn = processPlatformAiWorldTurn(
    synchronizedEconomyLookupPlayer,
    structuredClone(economyLookupWorld),
    economyLookupWeek,
);
assert.deepEqual(
    staleEconomyLookupTurn,
    synchronizedEconomyLookupTurn,
    'Economy lookup must use the current canonical turn world even when caller player.world is stale.',
);

let world = structuredClone(first.world) as WorldState;
for (let offset = 0; offset < 16; offset += 1) {
    world = processPlatformAiWorldTurn(first, world, START_WEEK + offset).world;
}
assert.ok(
    PLATFORM_IDS.some(platformId => (world.platforms?.[platformId].ai?.slate.length || 0) > 0),
    'At least one unacquired rival must build a slate over sixteen weeks.',
);
for (const platformId of PLATFORM_IDS) {
    const ai = world.platforms?.[platformId].ai;
    assert.equal(ai?.lastProcessedAbsoluteWeek, START_WEEK + 15, `${platformId} must reach the current checkpoint.`);
    assert.ok((ai?.decisionHistory.length || 0) <= 40, `${platformId} decision history must stay bounded.`);
    assert.ok((ai?.financeHistory.length || 0) <= 104, `${platformId} finance history must stay bounded.`);
    assert.ok((ai?.releaseMemory.length || 0) <= 12, `${platformId} release memory must stay bounded.`);
}

const acquiredPlayer = structuredClone(first) as Player;
acquiredPlayer.ownedStreamingPlatform.corporateDevelopment.acquiredPlatformIds = ['NETFLIX'];
const acquiredBefore = structuredClone(world.platforms!.NETFLIX);
const continuedBefore = world.platforms!.HULU.ai!.lastProcessedAbsoluteWeek;
const acquiredTurn = processPlatformAiWorldTurn(acquiredPlayer, world, START_WEEK + 16);
assert.deepEqual(
    acquiredTurn.world.platforms!.NETFLIX,
    acquiredBefore,
    'A player-controlled acquired platform must remain byte-for-byte unchanged, including its checkpoint.',
);
assert.equal(
    acquiredTurn.world.platforms!.HULU.ai!.lastProcessedAbsoluteWeek,
    START_WEEK + 16,
    'An unacquired rival must continue while another platform is player-controlled.',
);
assert.ok(
    acquiredTurn.world.platforms!.HULU.ai!.lastProcessedAbsoluteWeek > continuedBefore,
    'The unacquired rival checkpoint must advance.',
);
assert.ok(!acquiredTurn.news.some(item => item.id.includes('NETFLIX')), 'An acquired platform must emit no AI news.');

// Exercise every Content Desk route and prove that the turn preserves canonical references.
let routeWorld = structuredClone(first.world) as WorldState;
const routePlans = new Map<PlatformAiContentSource, string>();
const commitRoute = (platformId: PlatformId, source: PlatformAiContentSource): void => {
    const candidate = buildPlatformContentCandidates({
        player: first,
        world: routeWorld,
        platformId,
        absoluteWeek: START_WEEK,
    }).find(item => item.source === source);
    assert.ok(candidate, `Expected a ${source} candidate in the canonical route fixture.`);
    const committed = commitPlatformContentCandidate({
        player: first,
        world: routeWorld,
        platformId,
        absoluteWeek: START_WEEK,
        candidate,
    });
    assert.equal(committed.changed, true, `${source} should commit in the route fixture.`);
    routeWorld = committed.world;
    routePlans.set(source, committed.plan!.id);
    if (source === 'COMMISSIONED_ORIGINAL') {
        const commissioned = commissionPlatformAiOriginal({
            player: first,
            world: routeWorld,
            platformId,
            planId: committed.plan!.id,
            absoluteWeek: START_WEEK,
        });
        assert.equal(commissioned.changed, true, 'The original route must create one producer-owned production commitment.');
        routeWorld = commissioned.world;
    }
};

commitRoute('NETFLIX', 'COMMISSIONED_ORIGINAL');
commitRoute('NETFLIX', 'LICENSED_RELEASED_TITLE');
commitRoute('NETFLIX', 'CATALOGUE_ACQUISITION');
commitRoute('DISNEY_PLUS', 'OWNED_STUDIO_TRANSFER');
routeWorld = processPlatformAiWorldTurn(first, routeWorld, START_WEEK + 1).world;

const canonicalProjectIds = new Set(routeWorld.projects.map(project => project.id));
for (const [source, planId] of routePlans) {
    const platformId = source === 'OWNED_STUDIO_TRANSFER' ? 'DISNEY_PLUS' : 'NETFLIX';
    const plan = routeWorld.platforms![platformId].ai!.slate.find(item => item.id === planId)!;
    assert.ok(plan, `${source} plan must remain in the canonical slate.`);
    if (source === 'COMMISSIONED_ORIGINAL') {
        assert.ok(plan.industryProductionId, 'An original must reference the producer-owned production registry.');
        assert.equal(
            routeWorld.industryProductions?.[plan.industryProductionId!]?.commissioningPlatformId,
            platformId,
            'The original production must retain its canonical commissioning platform.',
        );
    } else {
        assert.ok(plan.sourceProjectIds.length > 0, `${source} must reference at least one canonical project.`);
        assert.ok(plan.sourceProjectIds.every(projectId => canonicalProjectIds.has(projectId)), `${source} cannot clone source projects.`);
        assert.equal(plan.rightsContractIds.length, plan.sourceProjectIds.length, `${source} needs one bound contract per title.`);
        assert.ok(plan.rightsContractIds.every(contractId => (
            routeWorld.platforms![platformId].ai!.rightsContracts.some(contract => (
                contract.id === contractId
                && contract.buyerPlatformId === platformId
                && contract.platformContentPlanId === plan.id
                && plan.sourceProjectIds.includes(contract.sourceProjectId)
            ))
        )), `${source} contracts must remain bound to the platform, plan and canonical projects.`);
    }
}

// A localization quote is bound to its exact launch scope. Scheduling must not
// silently shrink countries after the job is planned.
const restrictedPlayer = createFixture();
let restrictedWorld = structuredClone(restrictedPlayer.world) as WorldState;
const restrictedCandidate = buildPlatformContentCandidates({
    player: restrictedPlayer,
    world: restrictedWorld,
    platformId: 'HULU',
    absoluteWeek: START_WEEK,
}).find(candidate => candidate.source === 'LICENSED_RELEASED_TITLE');
assert.ok(restrictedCandidate, 'The restricted-territory fixture needs a licensable released title.');
const restrictedCommit = commitPlatformContentCandidate({
    player: restrictedPlayer,
    world: restrictedWorld,
    platformId: 'HULU',
    absoluteWeek: START_WEEK,
    candidate: restrictedCandidate,
});
assert.equal(restrictedCommit.changed, true, 'The restricted-territory fixture must commit its source plan.');
restrictedWorld = restrictedCommit.world;
const restrictedPlatform = restrictedWorld.platforms!.HULU;
const restrictedPlan = restrictedPlatform.ai!.slate.find(plan => plan.id === restrictedCommit.plan!.id)!;
const restrictedContract = restrictedPlatform.ai!.rightsContracts.find(contract => (
    contract.id === restrictedPlan.rightsContractIds[0]
))!;
restrictedPlan.localizationLevel = 'SUBTITLES';
restrictedPlan.localizationReadyAtAbsoluteWeek = null;
restrictedPlan.releaseCountryIds = ['US', 'JP'];
restrictedContract.territory = 'DOMESTIC';
restrictedContract.countryIds = ['US'];
const restrictedTurnWeek = START_WEEK + 1;
const restrictedTurn = processPlatformAiWorldTurn(
    restrictedPlayer,
    restrictedWorld,
    restrictedTurnWeek,
);
const scheduledRestrictedPlan = restrictedTurn.world.platforms!.HULU.ai!.slate
    .find(plan => plan.id === restrictedPlan.id)!;
assert.equal(scheduledRestrictedPlan.status, 'RIGHTS_READY', 'A partially covered exact scope must remain unscheduled.');
assert.deepEqual(scheduledRestrictedPlan.releaseCountryIds, ['US', 'JP'], 'Scheduling must never mutate a quoted localization scope.');

// NONE is an optional unlocalized release path: it creates no fabricated asset
// and can schedule in the same turn. Replaying that week remains idempotent.
const immediatePlayer = createFixture();
let immediateWorld = structuredClone(immediatePlayer.world) as WorldState;
const immediateCandidate = buildPlatformContentCandidates({
    player: immediatePlayer,
    world: immediateWorld,
    platformId: 'NETFLIX',
    absoluteWeek: START_WEEK,
}).find(candidate => candidate.source === 'LICENSED_RELEASED_TITLE');
assert.ok(immediateCandidate);
const immediateCommit = commitPlatformContentCandidate({
    player: immediatePlayer,
    world: immediateWorld,
    platformId: 'NETFLIX',
    absoluteWeek: START_WEEK,
    candidate: immediateCandidate,
});
immediateWorld = immediateCommit.world;
const immediatePlan = immediateWorld.platforms!.NETFLIX.ai!.slate.find(plan => plan.id === immediateCommit.plan!.id)!;
immediatePlan.localizationLevel = 'NONE';
immediatePlan.releaseCountryIds = ['GB'];
const immediateWeek = START_WEEK + 1;
const immediateTurn = processPlatformAiWorldTurn(immediatePlayer, immediateWorld, immediateWeek);
const immediatePlatform = immediateTurn.world.platforms!.NETFLIX;
const immediateScheduled = immediatePlatform.ai!.slate.find(plan => plan.id === immediatePlan.id)!;
const immediateJobs = immediatePlatform.ai!.localizationJobs.filter(job => job.contentPlanId === immediatePlan.id);
assert.equal(immediateScheduled.status, 'SCHEDULED', 'An optional unlocalized release may schedule without fabricating an asset.');
assert.ok(
    Number.isFinite((immediateScheduled.releaseReadiness as any)?.selectionScore),
    'An AI-scheduled plan must persist its strategic premiere score.',
);
assert.ok(
    ((immediateScheduled.releaseReadiness as any)?.selectionReasons || []).length > 0,
    'An AI-scheduled plan must persist readable strategic premiere reasons.',
);
assert.equal(immediateJobs.length, 0, 'NONE must never create a fake READY localization job.');
const repeatedImmediate = processPlatformAiWorldTurn(immediatePlayer, immediateTurn.world, immediateWeek);
assert.deepEqual(repeatedImmediate.world, immediateTurn.world, 'Same-week replay must not duplicate localization jobs.');

// Paid localization is quoted once, settled once, and cannot schedule until its
// persisted job reaches the disclosed due week.
const paidPlayer = createFixture();
let paidWorld = structuredClone(paidPlayer.world) as WorldState;
const paidCandidate = buildPlatformContentCandidates({
    player: paidPlayer,
    world: paidWorld,
    platformId: 'HULU',
    absoluteWeek: START_WEEK,
}).find(candidate => candidate.source === 'LICENSED_RELEASED_TITLE');
assert.ok(paidCandidate);
const paidCommit = commitPlatformContentCandidate({
    player: paidPlayer,
    world: paidWorld,
    platformId: 'HULU',
    absoluteWeek: START_WEEK,
    candidate: paidCandidate,
});
paidWorld = paidCommit.world;
const paidPlatform = paidWorld.platforms!.HULU;
paidPlatform.ai!.researchQueue.push({
    id: 'turn-localization-research',
    idempotencyKey: 'platform-ai-research:turn-localization-research',
    researchDefinitionId: 'localization-exchange',
    technologyDefinitionId: 'content_operations-2',
    branch: 'CONTENT_OPERATIONS',
    targetLevel: 22,
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
    startedAtAbsoluteWeek: START_WEEK - 10,
    stageStartedAtAbsoluteWeek: START_WEEK - 5,
    stageReadyAtAbsoluteWeek: START_WEEK - 4,
    completedAtAbsoluteWeek: START_WEEK - 4,
    lastProcessedAbsoluteWeek: START_WEEK - 4,
});
const paidPlan = paidPlatform.ai!.slate.find(plan => plan.id === paidCommit.plan!.id)!;
const paidContract = paidPlatform.ai!.rightsContracts.find(contract => paidPlan.rightsContractIds.includes(contract.id))!;
paidPlan.localizationLevel = 'SUBTITLES';
paidPlan.releaseCountryIds = ['US'];
const paidStartWeek = START_WEEK + 1;
let paidTurn = processPlatformAiWorldTurn(paidPlayer, paidWorld, paidStartWeek);
let paidResultPlatform = paidTurn.world.platforms!.HULU;
let paidJobs = paidResultPlatform.ai!.localizationJobs.filter(job => job.contentPlanId === paidPlan.id);
assert.equal(paidJobs.length, 1, 'Paid localization must create exactly one job for one canonical title.');
assert.equal(paidJobs[0].status, 'IN_PROGRESS', 'Economy settlement must start the funded job in the same weekly turn.');
assert.equal(paidResultPlatform.ai!.slate.find(plan => plan.id === paidPlan.id)!.status, 'RIGHTS_READY');
const paidObligations = paidResultPlatform.ai!.pendingOneTimeObligations.filter(item => item.id === paidJobs[0].obligationId);
assert.equal(paidObligations.length, 1, 'Paid localization must own one exact-once obligation.');
assert.equal(paidObligations[0].status, 'SETTLED');
const paidReadyWeek = paidJobs[0].startedAtAbsoluteWeek! + paidJobs[0].leadWeeks;
for (let week = paidStartWeek + 1; week <= paidReadyWeek; week += 1) {
    paidTurn = processPlatformAiWorldTurn(paidPlayer, paidTurn.world, week);
}
paidResultPlatform = paidTurn.world.platforms!.HULU;
paidJobs = paidResultPlatform.ai!.localizationJobs.filter(job => job.contentPlanId === paidPlan.id);
const paidScheduled = paidResultPlatform.ai!.slate.find(plan => plan.id === paidPlan.id)!;
assert.equal(paidJobs.length, 1, 'Weekly progression must not duplicate the funded job.');
assert.equal(paidJobs[0].status, 'READY');
assert.equal(paidScheduled.status, 'SCHEDULED', 'The plan may schedule only when its persisted job becomes READY.');
assert.equal(paidScheduled.localizationReadyAtAbsoluteWeek, paidReadyWeek);
assert.equal(paidScheduled.releaseEntries.length, paidPlan.sourceProjectIds.length);
assert.ok(paidScheduled.releaseEntries.length > 0, 'The paid fixture must expose one canonical release entry.');

const projectionWeek = START_WEEK + 24;
const projectionPlayer = { ...first, world: structuredClone(acquiredTurn.world) } as Player;
const projectionPlatform = projectionPlayer.world.platforms!.HULU;
const projectionAi = projectionPlatform.ai!;
const validProjectionPlan = structuredClone(paidScheduled);
validProjectionPlan.id = 'projection-valid-plan';
validProjectionPlan.status = 'RELEASED';
validProjectionPlan.releaseEntries = [{
    ...structuredClone(paidScheduled.releaseEntries[0]),
    id: 'projection-valid-entry',
    status: 'RELEASED',
    releasedAtAbsoluteWeek: projectionWeek - 4,
    premiereAtAbsoluteWeek: projectionWeek - 4,
    streamingWindowId: 'projection-valid-window',
}];
validProjectionPlan.premiereAtAbsoluteWeek = projectionWeek - 4;
validProjectionPlan.releasedAtAbsoluteWeek = projectionWeek - 4;
const validProjectionProjectId = validProjectionPlan.releaseEntries[0].canonicalProjectId;
const validProjectionContract = {
    ...structuredClone(paidContract),
    id: validProjectionPlan.releaseEntries[0].rightsContractId!,
    sourceProjectId: validProjectionProjectId,
    buyerPlatformId: 'HULU' as const,
    platformContentPlanId: validProjectionPlan.id,
    status: 'ACTIVE' as const,
    startsAtAbsoluteWeek: projectionWeek - 20,
    expiresAtAbsoluteWeek: projectionWeek + 10,
};
projectionAi.rightsContracts.push(validProjectionContract);
const validProjectionProject = projectionPlayer.world.projects.find(project => project.id === validProjectionProjectId)!;
assert.ok(validProjectionProject, `Projection fixture must contain canonical project ${validProjectionProjectId}.`);
validProjectionProject.streamingWindows = [{
    id: 'projection-valid-window',
    platformId: 'HULU',
    platformContentPlanId: validProjectionPlan.id,
    rightsContractId: validProjectionPlan.releaseEntries[0].rightsContractId,
    contentSource: validProjectionPlan.source,
    platformRelationship: 'LICENSEE',
    countryIds: ['US'],
    startsAtAbsoluteWeek: projectionWeek - 4,
    expiresAtAbsoluteWeek: projectionWeek + 10,
    exclusivity: 'NON_EXCLUSIVE',
    localizationLevel: 'SUBTITLES',
    releasePattern: validProjectionPlan.releaseEntries[0].releasePattern,
    installmentAbsoluteWeeks: [projectionWeek - 4],
    performance: {
        calculatedAtAbsoluteWeek: projectionWeek - 4,
        viewsMillions: 12,
        subscriberImpactMillions: 0.2,
        engagementIndexDelta: 1,
        commercialScore: 80,
        prestigeScore: 72,
        localizationSupportMultiplier: 1,
        outcome: 'HIT',
        seed: 'projection-valid-performance',
    },
}];
const expiredProjectionPlan = structuredClone(validProjectionPlan);
expiredProjectionPlan.id = 'projection-expired-plan';
expiredProjectionPlan.releaseEntries = [{
    ...structuredClone(validProjectionPlan.releaseEntries[0]),
    id: 'projection-expired-entry',
    streamingWindowId: 'projection-expired-window',
    canonicalProjectId: 'universal-2',
    sourceProjectId: 'universal-2',
    rightsContractId: 'projection-stale-expired-contract',
}];
projectionAi.rightsContracts.push({
    ...structuredClone(validProjectionContract),
    id: 'projection-stale-expired-contract',
    sourceProjectId: 'universal-2',
    platformContentPlanId: expiredProjectionPlan.id,
    status: 'ACTIVE',
    startsAtAbsoluteWeek: projectionWeek - 30,
    expiresAtAbsoluteWeek: projectionWeek - 1,
});
const expiredProjectionProject = projectionPlayer.world.projects.find(project => project.id === 'universal-2')!;
expiredProjectionProject.streamingWindows = [{
    ...structuredClone(validProjectionProject.streamingWindows[0]),
    id: 'projection-expired-window',
    platformContentPlanId: expiredProjectionPlan.id,
    startsAtAbsoluteWeek: projectionWeek - 20,
    expiresAtAbsoluteWeek: projectionWeek - 1,
}];
const unreleasedProjectionPlan = structuredClone(validProjectionPlan);
unreleasedProjectionPlan.id = 'projection-unreleased-plan';
unreleasedProjectionPlan.status = 'RIGHTS_READY';
unreleasedProjectionPlan.releaseEntries = [];
unreleasedProjectionPlan.premiereAtAbsoluteWeek = null;
unreleasedProjectionPlan.releasedAtAbsoluteWeek = null;
projectionAi.slate = [validProjectionPlan, expiredProjectionPlan, unreleasedProjectionPlan];
projectionAi.rightsContracts.push({
    ...structuredClone(projectionAi.rightsContracts[0]),
    id: 'projection-stale-active-contract',
    sourceProjectId: 'universal-3',
    platformContentPlanId: unreleasedProjectionPlan.id,
    status: 'ACTIVE',
    startsAtAbsoluteWeek: projectionWeek - 30,
    expiresAtAbsoluteWeek: projectionWeek - 1,
});
projectionAi.releaseMemory = [{
    projectId: validProjectionProjectId,
    releasedAtAbsoluteWeek: projectionWeek - 4,
    genre: validProjectionProject.genre,
    targetAudience: validProjectionProject.targetAudience,
    leadActorId: validProjectionProject.leadActorId,
    directorId: validProjectionProject.directorId || null,
    quality: validProjectionProject.quality,
    commercialScore: 80,
    prestigeScore: 72,
    subscriberImpactMillions: 0.2,
    outcome: 'HIT',
    awardWins: 0,
    observedAwardKeys: [],
}];
const projectionInputBefore = structuredClone(projectionPlayer);
const existingProjectionRivals = structuredClone(projectStreamingRivalsFromCanonicalWorld(first, [], projectionWeek));
const existingProjectionBefore = structuredClone(existingProjectionRivals);
const projectedRivals = projectStreamingRivalsFromCanonicalWorld(projectionPlayer, existingProjectionRivals, projectionWeek);
assert.deepEqual(projectionPlayer, projectionInputBefore, 'Rival projection must not mutate canonical player or world state.');
assert.deepEqual(existingProjectionRivals, existingProjectionBefore, 'Rival projection must not mutate prior rival projections.');
for (const rival of projectedRivals) {
    const canonical = projectionPlayer.world.platforms![rival.platformId];
    assert.equal(rival.cashReserveMillions, canonical.cashReserve, `${rival.platformId} cash must be a canonical projection.`);
    assert.equal(rival.subscribersMillions, canonical.subscribers, `${rival.platformId} subscribers must be a canonical projection.`);
    assert.equal(rival.standaloneValuationBillions, canonical.ai!.standaloneValuationBillions, `${rival.platformId} valuation must be canonical.`);
    const technologyLevels = Object.values(canonical.ai!.capabilities.technologyLevels);
    const expectedTechnology = Math.round(Math.max(0, Math.min(100,
        canonical.ai!.competence.technology * 7
        + (technologyLevels.reduce((sum, value) => sum + value, 0) / technologyLevels.length) * 0.4,
    )));
    assert.equal(rival.technology, expectedTechnology, `${rival.platformId} technology must be a canonical projection.`);
    const expectedRegions = new Set(['HOME_MARKET']);
    for (const countryId of canonical.ai!.capabilities.activeCountryIds) {
        if (['US', 'CA', 'MX'].includes(countryId)) expectedRegions.add('NORTH_AMERICA');
        else if (['BR', 'AR', 'CO'].includes(countryId)) expectedRegions.add('LATIN_AMERICA');
        else if (['GB', 'DE', 'FR', 'ES', 'IT'].includes(countryId)) expectedRegions.add('EUROPE');
        else if (['ZA', 'NG'].includes(countryId)) expectedRegions.add('MIDDLE_EAST_AFRICA');
        else if (countryId === 'IN') expectedRegions.add('SOUTH_ASIA');
        else if (['JP', 'KR', 'AU'].includes(countryId)) expectedRegions.add('EAST_ASIA');
    }
    assert.deepEqual(new Set(rival.activeRegionIds), expectedRegions, `${rival.platformId} regions must be a canonical projection.`);
    const averagePrestige = canonical.ai!.releaseMemory.length
        ? canonical.ai!.releaseMemory.reduce((sum, memory) => sum + memory.prestigeScore, 0) / canonical.ai!.releaseMemory.length
        : null;
    const expectedPrestige = Math.round(Math.max(0, Math.min(100,
        averagePrestige == null ? canonical.reputation : canonical.reputation * 0.7 + averagePrestige * 0.3,
    )));
    assert.equal(rival.prestige, expectedPrestige, `${rival.platformId} prestige must be a canonical projection.`);
}
const projectedHulu = projectedRivals.find(rival => rival.platformId === 'HULU')!;
assert.equal(
    projectedHulu.catalogPower,
    Math.round(Math.max(0, Math.min(100, 20 + 1 * 4 + 80 * 0.45))),
    'Catalogue power must count only released canonical windows valid at the observed week.',
);
projectedHulu.activeRegionIds.push('HOME_MARKET');
projectedHulu.preferredGenres.push('projection-only-genre');
projectedHulu.copiedTechnologyBranches.push('PLAYBACK_QUALITY');
projectedHulu.memory.respect = -999;
assert.deepEqual(projectionPlayer, projectionInputBefore, 'Mutating a projection must not write back into canonical state.');
assert.deepEqual(existingProjectionRivals, existingProjectionBefore, 'Projection output must not retain mutable references to prior rival snapshots.');

const audienceTurnWeek = START_WEEK + 80;
const audienceTurnPlayer = createFixture();
const audienceTurnWorld = structuredClone(deterministicA.world);
for (const platformId of PLATFORM_IDS) {
    audienceTurnWorld.platforms![platformId].ai!.lastProcessedAbsoluteWeek = platformId === 'NETFLIX'
        ? audienceTurnWeek - 1
        : audienceTurnWeek;
}
audienceTurnWorld.platforms!.NETFLIX.subscribers = 25;
audienceTurnWorld.platforms!.NETFLIX.ai!.financeHistory = [];
(audienceTurnWorld.platforms!.NETFLIX.ai as any).pendingAudienceSettlements = [{
    id: 'audience-settlement:turn-window:turn-project:turn-plan',
    streamingWindowId: 'turn-window',
    projectId: 'turn-project',
    planId: 'turn-plan',
    subscriberImpactMillions: 0.5,
    status: 'PENDING',
    createdAtAbsoluteWeek: audienceTurnWeek - 1,
    settledAtAbsoluteWeek: null,
}];
audienceTurnPlayer.world = audienceTurnWorld;
const audienceTurn = processPlatformAiWorldTurn(audienceTurnPlayer, audienceTurnWorld, audienceTurnWeek);
assert.equal(audienceTurn.world.platforms!.NETFLIX.subscribers, 25.5, 'Weekly Platform AI turn must settle prior release audience impact before downstream work.');
assert.equal((audienceTurn.world.platforms!.NETFLIX.ai as any).pendingAudienceSettlements[0].status, 'SETTLED');
const audienceTurnReplay = processPlatformAiWorldTurn(
    { ...audienceTurnPlayer, world: audienceTurn.world },
    audienceTurn.world,
    audienceTurnWeek,
);
assert.equal(audienceTurnReplay.world.platforms!.NETFLIX.subscribers, 25.5, 'Weekly turn replay must never double-apply audience impact.');

// BRIEF originals are retried by the weekly turn and reach a bounded deposit refund.
const retryPlayer = createFixture();
let retryWorld = structuredClone(retryPlayer.world);
retryWorld = processPlatformAiWorldTurn(retryPlayer, retryWorld, START_WEEK).world;
const retryCandidate = buildPlatformContentCandidates({
    player: { ...retryPlayer, world: retryWorld },
    world: retryWorld,
    platformId: 'HULU',
    absoluteWeek: START_WEEK + 1,
}).find(candidate => candidate.source === 'COMMISSIONED_ORIGINAL');
assert.ok(retryCandidate);
const retryCommit = commitPlatformContentCandidate({
    player: { ...retryPlayer, world: retryWorld },
    world: retryWorld,
    platformId: 'HULU',
    absoluteWeek: START_WEEK + 1,
    candidate: retryCandidate!,
});
assert.equal(retryCommit.changed, true);
retryWorld = retryCommit.world;
const retryPlanId = retryCommit.plan!.id;
const retryDeposit = retryCommit.plan!.paidSpendMillions;
for (let offset = 1; offset <= 6; offset += 1) {
    const week = START_WEEK + offset;
    for (const platformId of PLATFORM_IDS) retryWorld.platforms![platformId].ai!.lastProcessedAbsoluteWeek = platformId === 'HULU' ? week - 1 : week;
    retryWorld.platforms!.HULU.ai!.nextPlanningAbsoluteWeek = week + 100;
    retryWorld.platforms!.HULU.cashReserve = 0;
    retryWorld = processPlatformAiWorldTurn({ ...retryPlayer, world: retryWorld }, retryWorld, week).world;
}
const retriedPlan = retryWorld.platforms!.HULU.ai!.slate.find(plan => plan.id === retryPlanId)!;
const commissioningLifecycle = (retriedPlan as unknown as Record<string, any>).commissioningLifecycle;
assert.equal(retriedPlan.status, 'CANCELLED', 'A repeatedly uncommissionable brief must stop consuming slate capacity.');
assert.equal(commissioningLifecycle?.status, 'CANCELLED');
assert.ok(commissioningLifecycle?.attemptCount >= 2, 'The weekly turn must retry a pending brief before cancelling it.');
assert.equal(typeof commissioningLifecycle?.depositRefundedAtAbsoluteWeek, 'number');
const commissioningCancellationDecisions = retryWorld.platforms!.HULU.ai!.decisionHistory.filter(decision => decision.type === 'COMMISSIONING_CANCELLED');
assert.equal(commissioningCancellationDecisions.length, 1, 'The bounded retry lifecycle must refund the deposit once.');
assert.equal(commissioningCancellationDecisions[0].cashImpactMillions, retryDeposit);

const worldSource = readFileSync(resolve(process.cwd(), 'services/worldLogic.ts'), 'utf8');
assert.ok(
    !worldSource.includes('platform.cashReserve += Math.floor(platform.subscribers * 0.1)'),
    'The old unconditional rival cash injection must be removed.',
);
const competitiveSource = readFileSync(resolve(process.cwd(), 'services/streamingCompetitiveWorld.ts'), 'utf8');
assert.ok(!competitiveSource.includes('weeklyCashGeneration'), 'The shadow rival economy must not generate free weekly cash.');
assert.ok(!competitiveSource.includes('subscriberDrift'), 'The shadow rival economy must not generate independent subscribers.');
assert.ok(!competitiveSource.includes('worldPlatform?.cashReserve || 1_000'), 'Legacy projection must not invent a rival cash floor.');
const turnSource = readFileSync(resolve(process.cwd(), 'services/platformAi/platformAiTurn.ts'), 'utf8');
assert.ok(!turnSource.includes('Math.random'), 'The Platform AI turn must contain no uncontrolled randomness.');
assert.ok(
    turnSource.includes("!['DELIVERED', 'CANCELLED'].includes(production.status)"),
    'The weekly turn must not re-progress terminal productions throughout a long-running save.',
);
assert.ok(!competitiveSource.includes('Math.random'), 'The canonical rival projection path must contain no uncontrolled randomness.');

console.log('Platform AI turn audit passed.');
