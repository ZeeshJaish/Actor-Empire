import assert from 'node:assert/strict';
import type {
    IndustryProject,
    OwnedStreamingCatalogLicense,
    PlatformAiContentPlan,
    PlatformId,
    PlatformState,
    Player,
    WorldState,
} from '../types';
import { PLATFORM_AI_RUNTIME_SCHEMA_VERSION } from '../types';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { migratePlayerSave } from '../services/saveMigration';
import {
    buildPlatformContentCandidates,
    calculatePlatformAiValuationBillions,
    calculatePlatformAiWeeklyEconomy,
    normalizePlatformAiState,
    planPlatformAiLocalization,
    PLATFORM_AI_TURN_ORDER,
    processPlatformAiWorldTurn,
    progressPlatformAiRightsLifecycle,
    queuePlatformAiRightsRenewal,
    schedulePlatformStreamingWindow,
    settlePlatformAiEconomy,
} from '../services/platformAi';
import {
    filterPlatformAiRightsContractsByRenewalState,
    getPlatformAiRightsRenewalContractId,
    normalizePlatformAiPendingOneTimeObligations,
    normalizePlatformAiRightsRenewals,
} from '../services/platformAi/platformAiState';
import { getAbsoluteWeek } from '../services/legacyLogic';
import {
    createStreamingLicenseContract,
    isStreamingLicenseActiveAt,
    migrateStreamingRightsContractRegistry,
    millionsToFullCurrency,
} from '../services/streamingRightsCore';
import { createPlatformAiFixture } from './helpers/platformAiFixture';

const BASE_WEEK = getAbsoluteWeek(40, 12);
const EXPIRY_WEEK = BASE_WEEK + 4;
const RENEWAL_MG_MILLIONS = 12;

const makeProject = (id: string, studioId: IndustryProject['studioId'] = 'UNIVERSAL'): IndustryProject => ({
    id,
    title: `Lifecycle ${id}`,
    genre: 'DRAMA',
    mediaType: 'MOVIE',
    targetAudience: 'PG-13',
    studioId,
    budgetTier: 'MID',
    quality: 82,
    rating: 8.1,
    boxOffice: 180_000_000,
    year: 39,
    weekReleased: 20,
    leadActorId: `actor-${id}`,
    leadActorName: `Actor ${id}`,
    directorName: `Director ${id}`,
    reviews: 'A canonical lifecycle fixture.',
    releaseStrategy: 'THEATRICAL',
});

const makePlan = (
    platformId: PlatformId,
    id: string,
    projectId: string,
    contractId: string,
    status: PlatformAiContentPlan['status'] = 'RIGHTS_READY',
): PlatformAiContentPlan => ({
    id,
    platformId,
    controllerAtCommitment: 'AI',
    source: 'LICENSED_RELEASED_TITLE',
    status,
    title: `Plan ${id}`,
    projectType: 'MOVIE',
    genre: 'DRAMA',
    targetAudience: 'PG-13',
    sourceProjectIds: [projectId],
    rightsContractIds: [contractId],
    cataloguePackageId: null,
    commissionId: null,
    sourceStudioId: 'UNIVERSAL',
    streamingWindow: 'POST_THEATRICAL_WINDOW',
    localizationLevel: 'NONE',
    releaseCountryIds: ['US'],
    minimumGuaranteeMillions: RENEWAL_MG_MILLIONS,
    rightsCostMillions: RENEWAL_MG_MILLIONS,
    productionFundingMillions: 0,
    paidSpendMillions: RENEWAL_MG_MILLIONS,
    marketingReserveMillions: 0,
    contingencyMillions: 0,
    committedAtAbsoluteWeek: BASE_WEEK,
    rightsReadyAtAbsoluteWeek: BASE_WEEK,
    localizationReadyAtAbsoluteWeek: null,
    premiereAtAbsoluteWeek: null,
    releasePattern: null,
    releaseEntries: [],
    scheduledAtAbsoluteWeek: null,
    releasedAtAbsoluteWeek: null,
    industryProductionId: null,
    forecast: { strategic: 80, creative: 80, commercial: 80, prestige: 80, risk: 20 },
});

const makeContract = (input: {
    platformId: PlatformId;
    planId: string;
    project: IndustryProject;
    id?: string;
    startsAtAbsoluteWeek?: number;
    durationWeeks?: number;
    exclusivity?: OwnedStreamingCatalogLicense['exclusivity'];
    renewalOption?: boolean;
}): OwnedStreamingCatalogLicense => {
    const startsAtAbsoluteWeek = input.startsAtAbsoluteWeek ?? EXPIRY_WEEK - 8;
    return createStreamingLicenseContract({
    id: input.id || `contract-${input.platformId}-${input.project.id}`,
    sourceProject: input.project,
    buyerPlatformId: input.platformId,
    platformContentPlanId: input.planId,
    cataloguePackageId: null,
    contentSource: 'LICENSED_RELEASED_TITLE',
    licensorName: 'Lifecycle Licensor',
    territory: 'GLOBAL',
    countryIds: [],
    durationWeeks: input.durationWeeks ?? 8,
    exclusivity: input.exclusivity ?? 'NON_EXCLUSIVE',
    minimumGuarantee: millionsToFullCurrency(RENEWAL_MG_MILLIONS),
    platformRevenueShare: 70,
    signedAtAbsoluteWeek: Math.min(BASE_WEEK, startsAtAbsoluteWeek),
    startsAtAbsoluteWeek,
    origin: 'STUDIO_MARKET',
    sellerType: 'STUDIO',
    sellerPlatformId: null,
    windowType: 'SECOND_WINDOW',
    renewalOption: input.renewalOption ?? false,
    sublicensingAllowed: true,
    sequelRightsIncluded: false,
    changeOfControl: 'NOTICE',
    cancellationPenalty: millionsToFullCurrency(2),
    });
};

const normalizedPlatform = (player: Player, platformId: PlatformId, absoluteWeek = BASE_WEEK): PlatformState => {
    const platform = normalizePlatformAiState(
        structuredClone(player.world.platforms![platformId]),
        player.id,
        absoluteWeek,
    );
    platform.ai!.slate = [];
    platform.ai!.rightsContracts = [];
    platform.ai!.pendingOneTimeObligations = [];
    platform.ai!.rightsRenewals = [];
    platform.ai!.financeHistory = [];
    platform.ai!.decisionHistory = [];
    return platform;
};

const worldWith = (
    player: Player,
    platform: PlatformState,
    projects: IndustryProject[],
): WorldState => {
    const projectedWorld: WorldState = {
        ...structuredClone(player.world),
        streamingRightsContracts: {},
        projects,
        platforms: { ...structuredClone(player.world.platforms!), [platform.id]: platform },
    };
    return migrateStreamingRightsContractRegistry({ ...player, world: projectedWorld }).world;
};

// Exact expiry week is inclusive; transition occurs once the absolute week is greater.
const boundaryPlayer = createPlatformAiFixture();
const boundaryProject = makeProject('expiry-boundary');
const boundaryPlan = makePlan('NETFLIX', 'plan-expiry-boundary', boundaryProject.id, 'contract-expiry-boundary');
const boundaryContract = makeContract({
    platformId: 'NETFLIX',
    planId: boundaryPlan.id,
    project: boundaryProject,
    id: 'contract-expiry-boundary',
});
assert.equal(boundaryContract.expiresAtAbsoluteWeek, EXPIRY_WEEK);
assert.equal(isStreamingLicenseActiveAt(boundaryContract, EXPIRY_WEEK), true, 'The shared rights clock must include the exact expiry week.');
const boundaryPlatform = normalizedPlatform(boundaryPlayer, 'NETFLIX');
boundaryPlatform.ai!.slate = [boundaryPlan];
boundaryPlatform.ai!.rightsContracts = [boundaryContract];
const boundaryWorld = worldWith(boundaryPlayer, boundaryPlatform, [boundaryProject]);
const atBoundary = progressPlatformAiRightsLifecycle({
    player: boundaryPlayer,
    world: boundaryWorld,
    platformId: 'NETFLIX',
    absoluteWeek: EXPIRY_WEEK,
});
assert.equal(atBoundary.world.platforms!.NETFLIX.ai!.rightsContracts[0].status, 'ACTIVE');
const afterBoundary = progressPlatformAiRightsLifecycle({
    player: boundaryPlayer,
    world: atBoundary.world,
    platformId: 'NETFLIX',
    absoluteWeek: EXPIRY_WEEK + 1,
});
assert.equal(afterBoundary.world.platforms!.NETFLIX.ai!.rightsContracts[0].status, 'EXPIRED');
assert.deepEqual(
    progressPlatformAiRightsLifecycle({
        player: boundaryPlayer,
        world: afterBoundary.world,
        platformId: 'NETFLIX',
        absoluteWeek: EXPIRY_WEEK + 1,
    }).world,
    afterBoundary.world,
    'Expiry progression must be idempotent.',
);

// A stale ACTIVE record outside its canonical window must neither block sourcing nor create share or valuation power.
const expiredPlatform = structuredClone(afterBoundary.world.platforms!.NETFLIX);
expiredPlatform.ai!.slate = [];
const expiredWorld = { ...afterBoundary.world, platforms: { ...afterBoundary.world.platforms!, NETFLIX: expiredPlatform } };
assert.ok(
    buildPlatformContentCandidates({
        player: boundaryPlayer,
        world: expiredWorld,
        platformId: 'NETFLIX',
        absoluteWeek: EXPIRY_WEEK + 1,
    }).some(candidate => candidate.sourceProjectIds.includes(boundaryProject.id)),
    'An expired canonical title must become eligible for sourcing again.',
);
const staleActivePlatform = structuredClone(boundaryPlatform);
staleActivePlatform.ai!.slate = [{ ...boundaryPlan, status: 'RELEASED', releasedAtAbsoluteWeek: BASE_WEEK }];
staleActivePlatform.ai!.rightsContracts = [{ ...boundaryContract, status: 'ACTIVE' }];
staleActivePlatform.ai!.releaseMemory = [];
staleActivePlatform.ai!.standaloneValuationBillions = 0;
staleActivePlatform.valuation = 0;
const staleEconomy = calculatePlatformAiWeeklyEconomy({
    player: boundaryPlayer,
    platform: staleActivePlatform,
    absoluteWeek: EXPIRY_WEEK + 1,
});
assert.equal(staleEconomy.snapshot!.partnerRevenueShareCostMillions, 0, 'An out-of-window ACTIVE record must create zero partner share.');
const noRightsPlatform = structuredClone(staleActivePlatform);
noRightsPlatform.ai!.rightsContracts = [];
assert.equal(
    calculatePlatformAiValuationBillions({ player: boundaryPlayer, platform: staleActivePlatform, absoluteWeek: EXPIRY_WEEK + 1 }),
    calculatePlatformAiValuationBillions({ player: boundaryPlayer, platform: noRightsPlatform, absoluteWeek: EXPIRY_WEEK + 1 }),
    'An expired right must create zero standalone catalogue valuation.',
);

// Cancelling an invalid scheduled window clears its capacity but retains source and project identity.
const capacityPlayer = createPlatformAiFixture();
const releaseWeek = EXPIRY_WEEK + 3;
const projects = [makeProject('capacity-expiring'), makeProject('capacity-occupying'), makeProject('capacity-ready')];
const capacityPlatform = normalizedPlatform(capacityPlayer, 'APPLE_TV');
capacityPlatform.ai!.capabilities.technologyLevels.CONTENT_OPERATIONS = 40;
capacityPlatform.ai!.capabilities.subtitleCoveragePercent = 71;
capacityPlatform.ai!.capabilities.dubCoveragePercent = 20;
const expiringPlan = makePlan('APPLE_TV', 'plan-capacity-expiring', projects[0].id, 'contract-capacity-expiring', 'SCHEDULED');
expiringPlan.premiereAtAbsoluteWeek = releaseWeek;
expiringPlan.scheduledAtAbsoluteWeek = BASE_WEEK;
expiringPlan.localizationReadyAtAbsoluteWeek = BASE_WEEK;
expiringPlan.releasePattern = 'MOVIE_SINGLE_PREMIERE';
expiringPlan.releaseEntries = [{
    id: 'entry-capacity-expiring', sourceProjectId: projects[0].id, canonicalProjectId: projects[0].id,
    rightsContractId: 'contract-capacity-expiring', premiereAtAbsoluteWeek: releaseWeek,
    localizationReadyAtAbsoluteWeek: BASE_WEEK, countryIds: ['US'], releasePattern: 'MOVIE_SINGLE_PREMIERE',
    installmentAbsoluteWeeks: [releaseWeek], status: 'SCHEDULED', releasedAtAbsoluteWeek: null, streamingWindowId: null,
}];
const occupyingPlan = makePlan('APPLE_TV', 'plan-capacity-occupying', projects[1].id, 'contract-capacity-occupying', 'SCHEDULED');
occupyingPlan.premiereAtAbsoluteWeek = releaseWeek;
occupyingPlan.scheduledAtAbsoluteWeek = BASE_WEEK;
occupyingPlan.localizationReadyAtAbsoluteWeek = BASE_WEEK;
occupyingPlan.releasePattern = 'MOVIE_SINGLE_PREMIERE';
occupyingPlan.releaseEntries = [{
    id: 'entry-capacity-occupying', sourceProjectId: projects[1].id, canonicalProjectId: projects[1].id,
    rightsContractId: 'contract-capacity-occupying', premiereAtAbsoluteWeek: releaseWeek,
    localizationReadyAtAbsoluteWeek: BASE_WEEK, countryIds: ['US'], releasePattern: 'MOVIE_SINGLE_PREMIERE',
    installmentAbsoluteWeeks: [releaseWeek], status: 'SCHEDULED', releasedAtAbsoluteWeek: null, streamingWindowId: null,
}];
const readyPlan = makePlan('APPLE_TV', 'plan-capacity-ready', projects[2].id, 'contract-capacity-ready');
readyPlan.localizationLevel = 'NONE';
readyPlan.releaseCountryIds = ['GB'];
const expiringCapacityContract = makeContract({
    platformId: 'APPLE_TV', planId: expiringPlan.id, project: projects[0], id: 'contract-capacity-expiring', renewalOption: false,
});
const occupyingContract = makeContract({
    platformId: 'APPLE_TV', planId: occupyingPlan.id, project: projects[1], id: 'contract-capacity-occupying',
    startsAtAbsoluteWeek: BASE_WEEK, durationWeeks: 52,
});
const readyContract = makeContract({
    platformId: 'APPLE_TV', planId: readyPlan.id, project: projects[2], id: 'contract-capacity-ready',
    startsAtAbsoluteWeek: BASE_WEEK, durationWeeks: 52,
});
capacityPlatform.ai!.slate = [expiringPlan, occupyingPlan, readyPlan];
capacityPlatform.ai!.rightsContracts = [expiringCapacityContract, occupyingContract, readyContract];
const capacityWorld = worldWith(capacityPlayer, capacityPlatform, projects);
const capacityProgressed = progressPlatformAiRightsLifecycle({
    player: capacityPlayer,
    world: capacityWorld,
    platformId: 'APPLE_TV',
    absoluteWeek: EXPIRY_WEEK,
});
const resetPlan = capacityProgressed.world.platforms!.APPLE_TV.ai!.slate.find(plan => plan.id === expiringPlan.id)!;
assert.equal(resetPlan.status, 'RIGHTS_READY');
assert.equal(resetPlan.premiereAtAbsoluteWeek, null);
assert.equal(resetPlan.scheduledAtAbsoluteWeek, null);
assert.deepEqual(resetPlan.releaseEntries, []);
assert.deepEqual(resetPlan.sourceProjectIds, expiringPlan.sourceProjectIds, 'Schedule cancellation must preserve canonical source identity.');
assert.deepEqual(resetPlan.rightsContractIds, expiringPlan.rightsContractIds, 'Schedule cancellation must preserve the rights-planning identity.');
const capacityLocalization = planPlatformAiLocalization({
    player: { ...capacityPlayer, world: capacityProgressed.world },
    world: capacityProgressed.world,
    platform: capacityProgressed.world.platforms!.APPLE_TV,
    absoluteWeek: EXPIRY_WEEK,
    contentPlanId: readyPlan.id,
    projectId: projects[2].id,
    countryIds: readyPlan.releaseCountryIds,
    level: readyPlan.localizationLevel,
});
assert.equal(
    capacityLocalization.changed,
    false,
    'NONE localization must remain a valid no-job release path instead of persisting fake readiness.',
);
const capacityReadyWorld: WorldState = {
    ...capacityProgressed.world,
    platforms: {
        ...capacityProgressed.world.platforms!,
        APPLE_TV: capacityLocalization.platform,
    },
};
const capacityScheduled = schedulePlatformStreamingWindow({
    player: capacityPlayer,
    world: capacityReadyWorld,
    platformId: 'APPLE_TV',
    planId: readyPlan.id,
    absoluteWeek: EXPIRY_WEEK,
    premiereAtAbsoluteWeek: releaseWeek,
    localizationReadyAtAbsoluteWeek: BASE_WEEK,
});
assert.equal(
    capacityScheduled.changed,
    true,
    `Clearing an invalid scheduled window must free release capacity (reason: ${capacityScheduled.reason || 'none'}).`,
);
const canonicalScopeWorld = structuredClone(capacityReadyWorld);
canonicalScopeWorld.streamingRightsContracts![readyContract.id] = {
    ...canonicalScopeWorld.streamingRightsContracts![readyContract.id],
    territory: 'DOMESTIC',
    countryIds: ['US'],
};
const canonicalScopeBlocked = schedulePlatformStreamingWindow({
    player: capacityPlayer,
    world: canonicalScopeWorld,
    platformId: 'APPLE_TV',
    planId: readyPlan.id,
    absoluteWeek: EXPIRY_WEEK,
    premiereAtAbsoluteWeek: releaseWeek,
    localizationReadyAtAbsoluteWeek: BASE_WEEK,
});
assert.equal(canonicalScopeBlocked.changed, false);
assert.equal(canonicalScopeBlocked.reason, 'RIGHTS_NOT_COVERED');

// Renewal persists a record and stable CONTRACTUAL obligation before the real economy can settle it.
const renewalPlayer = createPlatformAiFixture();
const renewalProject = makeProject('renewal-project');
const renewalPlan = makePlan('NETFLIX', 'plan-renewal', renewalProject.id, 'contract-renewal-old');
renewalPlan.localizationLevel = 'NONE';
renewalPlan.releaseCountryIds = ['GB'];
const renewalContract = makeContract({
    platformId: 'NETFLIX', planId: renewalPlan.id, project: renewalProject, id: 'contract-renewal-old', renewalOption: true,
});
const renewalPlatform = normalizedPlatform(renewalPlayer, 'NETFLIX');
renewalPlatform.ai!.capabilities.technologyLevels.CONTENT_OPERATIONS = 40;
renewalPlatform.ai!.capabilities.subtitleCoveragePercent = 71;
renewalPlatform.ai!.capabilities.dubCoveragePercent = 20;
renewalPlatform.ai!.slate = [renewalPlan];
renewalPlatform.ai!.rightsContracts = [renewalContract];
const renewalWorld = worldWith(renewalPlayer, renewalPlatform, [renewalProject]);
const queued = progressPlatformAiRightsLifecycle({
    player: renewalPlayer,
    world: renewalWorld,
    platformId: 'NETFLIX',
    absoluteWeek: EXPIRY_WEEK,
});
const renewalRecord = queued.world.platforms!.NETFLIX.ai!.rightsRenewals[0];
assert.ok(renewalRecord, 'The lifecycle must persist renewal intent before payment.');
assert.equal(renewalRecord.previousLicenseId, renewalContract.id);
assert.equal(renewalRecord.nextStartsAtAbsoluteWeek, EXPIRY_WEEK + 1);
assert.equal(renewalRecord.status, 'PENDING_PAYMENT');
const queuedObligation = queued.world.platforms!.NETFLIX.ai!.pendingOneTimeObligations.find(item => item.id === renewalRecord.obligationId)!;
assert.equal(queuedObligation.category, 'CONTRACTUAL');
assert.equal(queuedObligation.status, 'HELD');
assert.equal(queuedObligation.amountMillions, RENEWAL_MG_MILLIONS);
assert.equal(queued.world.platforms!.NETFLIX.ai!.rightsContracts.length, 1, 'No renewal licence may exist before settlement.');

const cashPoorWorld = structuredClone(queued.world);
cashPoorWorld.platforms!.NETFLIX.cashReserve = 0;
cashPoorWorld.platforms!.NETFLIX.subscribers = 0;
const cashPoorPlayer = { ...renewalPlayer, world: cashPoorWorld };
const cashPoorEconomy = settlePlatformAiEconomy({
    player: cashPoorPlayer,
    platform: cashPoorWorld.platforms!.NETFLIX,
    absoluteWeek: EXPIRY_WEEK,
});
assert.ok(cashPoorEconomy.snapshot!.debtIncurredMillions > 0, 'The existing economy must disclose mandatory shortfall debt.');
assert.ok(
    cashPoorEconomy.snapshot!.heldObligations.some(item => item.expenseClass === 'CONTRACTUAL' && item.amountMillions === RENEWAL_MG_MILLIONS),
    'An unfunded renewal guarantee must remain disclosed as a held contractual obligation.',
);
assert.equal(
    cashPoorEconomy.platform.ai!.pendingOneTimeObligations.find(item => item.id === renewalRecord.obligationId)?.status,
    'HELD',
);
assert.equal(cashPoorEconomy.platform.ai!.rightsContracts.length, 1, 'Insufficient cash must not activate renewal rights.');

const fundedPlayer = { ...renewalPlayer, world: queued.world };
const settled = settlePlatformAiEconomy({
    player: fundedPlayer,
    platform: queued.world.platforms!.NETFLIX,
    absoluteWeek: EXPIRY_WEEK,
});
assert.equal(settled.platform.ai!.pendingOneTimeObligations.find(item => item.id === renewalRecord.obligationId)?.status, 'SETTLED');
assert.equal(
    settled.platform.ai!.rightsRenewals.find(item => item.id === renewalRecord.id)?.status,
    'PENDING_PAYMENT',
    'Economy records settlement evidence; only the rights lifecycle may promote payment status.',
);
assert.equal(
    (settled.platform.ai!.rightsRenewals.find(item => item.id === renewalRecord.id) as any)?.paymentSettledAtAbsoluteWeek,
    EXPIRY_WEEK,
    'A real HELD-to-SETTLED economy transition must leave explicit lifecycle evidence.',
);
assert.equal(settled.platform.ai!.rightsContracts.length, 1, 'Economy settlement alone must not create a rights contract.');
assert.deepEqual(
    settlePlatformAiEconomy({
        player: { ...renewalPlayer, world: { ...queued.world, platforms: { ...queued.world.platforms!, NETFLIX: settled.platform } } },
        platform: settled.platform,
        absoluteWeek: EXPIRY_WEEK,
    }).platform,
    settled.platform,
    'Replaying the settlement week must not pay the renewal guarantee twice.',
);
const settledWorld = {
    ...queued.world,
    platforms: { ...queued.world.platforms!, NETFLIX: settled.platform },
};
const activated = progressPlatformAiRightsLifecycle({
    player: { ...renewalPlayer, world: settledWorld },
    world: settledWorld,
    platformId: 'NETFLIX',
    absoluteWeek: EXPIRY_WEEK + 1,
});
const renewalContracts = activated.world.platforms!.NETFLIX.ai!.rightsContracts.filter(contract => contract.origin === 'RENEWAL');
assert.equal(renewalContracts.length, 1);
assert.equal(renewalContracts[0].startsAtAbsoluteWeek, EXPIRY_WEEK + 1);
assert.equal(renewalContracts[0].renewedFromLicenseId, renewalContract.id);
const canonicalRenewalContract = activated.world.streamingRightsContracts?.[renewalContracts[0].id];
assert.ok(canonicalRenewalContract, 'An activated Platform AI renewal should register one world-level canonical contract.');
assert.equal(canonicalRenewalContract?.settlement.guarantee, 'PAID');
assert.equal(canonicalRenewalContract?.buyer.platformId, 'NETFLIX');
assert.equal(isStreamingLicenseActiveAt(renewalContracts[0], EXPIRY_WEEK + 1), true);
assert.ok(renewalContracts[0].startsAtAbsoluteWeek > renewalContract.expiresAtAbsoluteWeek, 'Renewal windows must not overlap.');
assert.ok(
    activated.world.platforms!.NETFLIX.ai!.slate[0].rightsContractIds.includes(renewalContracts[0].id),
    'A renewed plan must become schedulable through the new canonical contract identity.',
);
assert.equal(activated.world.platforms!.NETFLIX.ai!.rightsRenewals[0].status, 'CONTRACTED');
const renewalLocalization = planPlatformAiLocalization({
    player: { ...renewalPlayer, world: activated.world },
    world: activated.world,
    platform: activated.world.platforms!.NETFLIX,
    absoluteWeek: EXPIRY_WEEK + 1,
    contentPlanId: renewalPlan.id,
    projectId: renewalProject.id,
    countryIds: renewalPlan.releaseCountryIds,
    level: renewalPlan.localizationLevel,
});
const renewalReadyWorld: WorldState = {
    ...activated.world,
    platforms: {
        ...activated.world.platforms!,
        NETFLIX: renewalLocalization.platform,
    },
};
assert.equal(
    schedulePlatformStreamingWindow({
        player: { ...renewalPlayer, world: renewalReadyWorld },
        world: renewalReadyWorld,
        platformId: 'NETFLIX',
        planId: renewalPlan.id,
        absoluteWeek: EXPIRY_WEEK + 1,
        premiereAtAbsoluteWeek: EXPIRY_WEEK + 2,
        localizationReadyAtAbsoluteWeek: BASE_WEEK,
    }).changed,
    true,
    'A paid non-overlapping renewal must make the preserved plan schedulable again.',
);
assert.deepEqual(
    progressPlatformAiRightsLifecycle({
        player: { ...renewalPlayer, world: activated.world },
        world: activated.world,
        platformId: 'NETFLIX',
        absoluteWeek: EXPIRY_WEEK + 1,
    }).world,
    activated.world,
    'Renewal activation replay must be exact-once.',
);
assert.equal(
    activated.world.platforms!.NETFLIX.ai!.pendingOneTimeObligations.filter(item => item.id === renewalRecord.obligationId).length,
    1,
    'Renewal replay must retain exactly one payment record.',
);

// Shared availability blocks an overlapping exclusive continuation before it can queue payment.
const conflictProjectionWorld = structuredClone(renewalWorld);
conflictProjectionWorld.streamingRightsContracts = {};
const conflictPlatform = normalizedPlatform(renewalPlayer, 'HULU');
const conflictContract = makeContract({
    platformId: 'HULU', planId: 'conflict-plan', project: renewalProject, id: 'conflict-contract',
    startsAtAbsoluteWeek: EXPIRY_WEEK + 1, durationWeeks: 40, exclusivity: 'EXCLUSIVE',
});
conflictPlatform.ai!.rightsContracts = [conflictContract];
conflictProjectionWorld.platforms!.HULU = conflictPlatform;
conflictProjectionWorld.platforms!.NETFLIX.ai!.rightsContracts[0].exclusivity = 'EXCLUSIVE';
const conflictWorld = migrateStreamingRightsContractRegistry({
    ...renewalPlayer,
    world: conflictProjectionWorld,
}).world;
const conflictingRenewal = queuePlatformAiRightsRenewal({
    player: { ...renewalPlayer, world: conflictWorld },
    world: conflictWorld,
    platformId: 'NETFLIX',
    licenseId: renewalContract.id,
    absoluteWeek: EXPIRY_WEEK,
});
assert.equal(conflictingRenewal.changed, false);
assert.equal(conflictingRenewal.reason, 'RIGHTS_CONFLICT');
assert.equal(conflictingRenewal.world.platforms!.NETFLIX.ai!.rightsRenewals.length, 0);
assert.equal(conflictingRenewal.world.platforms!.NETFLIX.ai!.pendingOneTimeObligations.length, 0);

// Weekly orchestration queues before economy, settles in the same week, and keeps stable platform order.
assert.deepEqual(PLATFORM_AI_TURN_ORDER, ['NETFLIX', 'APPLE_TV', 'DISNEY_PLUS', 'HULU', 'YOUTUBE']);
const turnWorld = structuredClone(renewalWorld);
for (const platformId of PLATFORM_AI_TURN_ORDER) {
    const platform = normalizedPlatform(renewalPlayer, platformId, EXPIRY_WEEK);
    platform.ai!.lastProcessedAbsoluteWeek = platformId === 'NETFLIX' ? EXPIRY_WEEK - 1 : EXPIRY_WEEK;
    turnWorld.platforms![platformId] = platformId === 'NETFLIX' ? turnWorld.platforms!.NETFLIX : platform;
}
turnWorld.platforms!.NETFLIX.ai!.lastProcessedAbsoluteWeek = EXPIRY_WEEK - 1;
const turnPlayer = { ...renewalPlayer, world: turnWorld };
const turnResult = processPlatformAiWorldTurn(turnPlayer, turnWorld, EXPIRY_WEEK);
const turnRenewal = turnResult.world.platforms!.NETFLIX.ai!.rightsRenewals[0];
assert.ok(turnRenewal);
assert.equal(turnResult.world.platforms!.NETFLIX.ai!.pendingOneTimeObligations.find(item => item.id === turnRenewal.obligationId)?.status, 'SETTLED');
assert.equal(turnResult.world.platforms!.NETFLIX.ai!.rightsContracts.filter(contract => contract.origin === 'RENEWAL').length, 0);

// Acquired/player-controlled platforms are strict no-ops before normalization.
const acquiredPlayer = structuredClone(renewalPlayer);
acquiredPlayer.ownedStreamingPlatform.corporateDevelopment.acquiredPlatformIds = ['NETFLIX'];
const acquiredBefore = structuredClone(renewalWorld);
assert.deepEqual(
    progressPlatformAiRightsLifecycle({
        player: acquiredPlayer,
        world: renewalWorld,
        platformId: 'NETFLIX',
        absoluteWeek: EXPIRY_WEEK + 1,
    }).world,
    acquiredBefore,
);
assert.deepEqual(
    queuePlatformAiRightsRenewal({
        player: acquiredPlayer,
        world: renewalWorld,
        platformId: 'NETFLIX',
        licenseId: renewalContract.id,
        absoluteWeek: EXPIRY_WEEK,
    }).world,
    acquiredBefore,
);

// Malformed v3/v4 renewal state and associated obligations repair and compact without throwing.
const malformed = structuredClone(renewalPlayer) as Player;
const malformedPlatform = normalizedPlatform(malformed, 'NETFLIX');
malformedPlatform.ai!.rightsContracts = [renewalContract];
(malformedPlatform.ai as any).schemaVersion = 3;
(malformedPlatform.ai as any).rightsRenewals = [
    { ...renewalRecord, id: 'wrong-id', obligationId: 'wrong-obligation', status: 'nonsense' },
    { ...renewalRecord, status: 'PENDING_PAYMENT' },
    null,
    { previousLicenseId: '', nextStartsAtAbsoluteWeek: Number.NaN },
];
(malformedPlatform.ai as any).pendingOneTimeObligations = [
    queuedObligation,
    { ...queuedObligation, id: 'platform_ai_rights_renewal_obligation_orphan' },
    { id: '', category: 'CONTRACTUAL', amountMillions: Number.NaN, createdWeek: -10, status: 'HELD', settledWeek: null },
];
malformed.world.platforms!.NETFLIX = malformedPlatform;
const compactedMalformed = assert.doesNotThrow(() => compactPlayerForPersistence(malformed));
void compactedMalformed;
const migratedMalformed = assert.doesNotThrow(() => migratePlayerSave(compactPlayerForPersistence(malformed)));
void migratedMalformed;
const repaired = migratePlayerSave(compactPlayerForPersistence(malformed));
const repairedAi = repaired.world.platforms!.NETFLIX.ai!;
assert.equal(repairedAi.schemaVersion, PLATFORM_AI_RUNTIME_SCHEMA_VERSION);
assert.equal(repairedAi.rightsRenewals.length, 1);
assert.equal(repairedAi.rightsRenewals[0].id, renewalRecord.id);
assert.equal(repairedAi.rightsRenewals[0].obligationId, renewalRecord.obligationId);
assert.equal(repairedAi.pendingOneTimeObligations.filter(item => item.id === renewalRecord.obligationId).length, 1);
assert.equal(repairedAi.pendingOneTimeObligations.some(item => item.id.includes('orphan')), false);
const malformedV4 = structuredClone(malformed) as Player;
(malformedV4.world.platforms!.NETFLIX.ai as any).schemaVersion = 4;
const repairedV4 = assert.doesNotThrow(() => migratePlayerSave(compactPlayerForPersistence(malformedV4)));
void repairedV4;
const repairedV4Ai = migratePlayerSave(compactPlayerForPersistence(malformedV4)).world.platforms!.NETFLIX.ai!;
assert.equal(repairedV4Ai.rightsRenewals.length, 1);
assert.equal(repairedV4Ai.rightsRenewals[0].id, renewalRecord.id);
assert.equal(repairedV4Ai.pendingOneTimeObligations.filter(item => item.id === renewalRecord.obligationId).length, 1);

// Unresolved payment work is never compacted away, even beyond the settled-history budget.
const overflowObligations = normalizePlatformAiPendingOneTimeObligations([
    ...Array.from({ length: 7 }, (_, index) => ({
        id: `settled-renewal-obligation-${index}`,
        category: 'CONTRACTUAL',
        amountMillions: 1,
        createdWeek: BASE_WEEK - 2,
        status: 'SETTLED',
        settledWeek: BASE_WEEK - 1,
    })),
    ...Array.from({ length: 105 }, (_, index) => ({
        id: `held-renewal-obligation-${index}`,
        category: 'CONTRACTUAL',
        amountMillions: 1,
        createdWeek: BASE_WEEK,
        status: 'HELD',
        settledWeek: null,
    })),
]);
assert.equal(overflowObligations.filter(item => item.status === 'HELD').length, 105, 'Every unresolved contractual obligation must survive compaction.');
assert.equal(overflowObligations.filter(item => item.status === 'SETTLED').length, 0, 'Settled obligation history must retain zero rows when unresolved work exhausts its capacity.');

const overflowContracts = Array.from({ length: 105 }, (_, index) => makeContract({
    platformId: 'NETFLIX',
    planId: `overflow-plan-${index}`,
    project: renewalProject,
    id: `overflow-contract-${index}`,
    renewalOption: true,
}));
const overflowRenewals = normalizePlatformAiRightsRenewals(
    overflowContracts.map(contract => ({
        previousLicenseId: contract.id,
        sourceProjectId: contract.sourceProjectId,
        platformContentPlanId: contract.platformContentPlanId,
        durationWeeks: contract.durationWeeks,
        minimumGuaranteeMillions: RENEWAL_MG_MILLIONS,
        status: 'PENDING_PAYMENT',
        createdAtAbsoluteWeek: EXPIRY_WEEK,
    })),
    'NETFLIX',
    overflowContracts,
);
assert.equal(overflowRenewals.length, 105, 'Every unresolved renewal record must survive compaction.');

// Active paid/contracted renewals are live canonical state and must never share
// the bounded capacity reserved for inactive historical renewal rows.
const activeRenewalCount = 105;
const historicalRenewalCount = 117;
const scalabilityPreviousContracts: OwnedStreamingCatalogLicense[] = [];
const scalabilityRenewalContracts: OwnedStreamingCatalogLicense[] = [];
const scalabilityRenewalRows: Array<Record<string, unknown>> = [];
for (let index = 0; index < activeRenewalCount + historicalRenewalCount; index += 1) {
    const project = makeProject(`renewal-scale-${index}`);
    const previous = makeContract({
        platformId: 'NETFLIX',
        planId: `renewal-scale-plan-${index}`,
        project,
        id: `renewal-scale-previous-${index}`,
        renewalOption: true,
    });
    const nextStartsAtAbsoluteWeek = previous.expiresAtAbsoluteWeek + 1;
    const renewalLicenseId = getPlatformAiRightsRenewalContractId(previous.id, nextStartsAtAbsoluteWeek);
    const isActive = index < activeRenewalCount;
    const renewalContract: OwnedStreamingCatalogLicense = {
        ...previous,
        id: renewalLicenseId,
        signedAtAbsoluteWeek: nextStartsAtAbsoluteWeek,
        startsAtAbsoluteWeek: nextStartsAtAbsoluteWeek,
        expiresAtAbsoluteWeek: nextStartsAtAbsoluteWeek + previous.durationWeeks - 1,
        status: isActive ? 'ACTIVE' : 'EXPIRED',
        origin: 'RENEWAL',
        renewedFromLicenseId: previous.id,
    };
    scalabilityPreviousContracts.push(previous);
    scalabilityRenewalContracts.push(renewalContract);
    scalabilityRenewalRows.push({
        previousLicenseId: previous.id,
        sourceProjectId: previous.sourceProjectId,
        platformContentPlanId: previous.platformContentPlanId,
        durationWeeks: previous.durationWeeks,
        minimumGuaranteeMillions: RENEWAL_MG_MILLIONS,
        status: 'CONTRACTED',
        paymentSettledAtAbsoluteWeek: nextStartsAtAbsoluteWeek,
        createdAtAbsoluteWeek: previous.expiresAtAbsoluteWeek,
        activatedAtAbsoluteWeek: nextStartsAtAbsoluteWeek,
    });
}
const scalabilityRightsContracts = [
    ...scalabilityPreviousContracts,
    ...scalabilityRenewalContracts,
];
const normalizedScalabilityRenewals = normalizePlatformAiRightsRenewals(
    scalabilityRenewalRows,
    'NETFLIX',
    scalabilityRightsContracts,
);
const activeRenewalLicenseIds = new Set(
    scalabilityRenewalContracts
        .filter(contract => contract.status === 'ACTIVE')
        .map(contract => contract.id),
);
assert.equal(
    normalizedScalabilityRenewals.filter(record => (
        record.renewalLicenseId !== null && activeRenewalLicenseIds.has(record.renewalLicenseId)
    )).length,
    activeRenewalCount,
    'Every active paid/contracted renewal must survive normalization beyond the historical cap.',
);
assert.equal(
    normalizedScalabilityRenewals.filter(record => (
        record.renewalLicenseId !== null && !activeRenewalLicenseIds.has(record.renewalLicenseId)
    )).length,
    104,
    'Inactive historical renewal rows must retain exactly the bounded history capacity.',
);
const filteredScalabilityContracts = filterPlatformAiRightsContractsByRenewalState(
    scalabilityRightsContracts,
    normalizedScalabilityRenewals,
);
const filteredScalabilityContractIds = new Set(filteredScalabilityContracts.map(contract => contract.id));
assert(
    [...activeRenewalLicenseIds].every(contractId => filteredScalabilityContractIds.has(contractId)),
    'Every active renewal contract must survive renewal-state filtering beyond the historical cap.',
);

// A save cannot forge payment by claiming PAYMENT_SETTLED without a settled economy obligation.
const forgedPaymentPlatform = structuredClone(renewalPlatform);
forgedPaymentPlatform.ai!.rightsContracts = [renewalContract];
forgedPaymentPlatform.ai!.rightsRenewals = [{ ...renewalRecord, status: 'PAYMENT_SETTLED' }];
forgedPaymentPlatform.ai!.pendingOneTimeObligations = [];
const repairedForgedPayment = normalizePlatformAiState(forgedPaymentPlatform, renewalPlayer.id, EXPIRY_WEEK + 1);
assert.equal(repairedForgedPayment.ai!.rightsRenewals[0].status, 'PENDING_PAYMENT', 'A renewal may become paid only from a settled economy obligation.');
assert.equal(repairedForgedPayment.ai!.pendingOneTimeObligations[0].status, 'HELD');
const forgedPaymentWorld = worldWith(renewalPlayer, repairedForgedPayment, [renewalProject]);
const forgedPaymentSave = compactPlayerForPersistence({ ...renewalPlayer, world: worldWith(renewalPlayer, forgedPaymentPlatform, [renewalProject]) });
assert.equal(forgedPaymentSave.world.platforms!.NETFLIX.ai!.rightsRenewals[0].status, 'PENDING_PAYMENT', 'Save compaction must downgrade an unproven payment claim before persistence.');
const forgedPaymentProgressed = progressPlatformAiRightsLifecycle({
    player: { ...renewalPlayer, world: forgedPaymentWorld },
    world: forgedPaymentWorld,
    platformId: 'NETFLIX',
    absoluteWeek: EXPIRY_WEEK + 1,
});
assert.equal(forgedPaymentProgressed.world.platforms!.NETFLIX.ai!.rightsContracts.filter(contract => contract.origin === 'RENEWAL').length, 0, 'Forged settlement state must never activate a renewal contract.');

// A matching deterministic contract is not proof that the renewal was paid.
const forgedRenewalContractId = getPlatformAiRightsRenewalContractId(
    renewalContract.id,
    renewalRecord.nextStartsAtAbsoluteWeek,
);
const forgedRenewalContract: OwnedStreamingCatalogLicense = {
    ...renewalContract,
    id: forgedRenewalContractId,
    signedAtAbsoluteWeek: EXPIRY_WEEK + 1,
    startsAtAbsoluteWeek: renewalRecord.nextStartsAtAbsoluteWeek,
    expiresAtAbsoluteWeek: renewalRecord.nextStartsAtAbsoluteWeek + renewalRecord.durationWeeks,
    status: 'ACTIVE',
    origin: 'RENEWAL',
    renewedFromLicenseId: renewalContract.id,
};
const forgedContractPlatform = structuredClone(renewalPlatform);
forgedContractPlatform.ai!.rightsContracts = [renewalContract, forgedRenewalContract];
forgedContractPlatform.ai!.rightsRenewals = [{ ...renewalRecord, status: 'PENDING_PAYMENT' }];
forgedContractPlatform.ai!.pendingOneTimeObligations = [queuedObligation];
const repairedForgedContract = normalizePlatformAiState(
    forgedContractPlatform,
    renewalPlayer.id,
    EXPIRY_WEEK + 1,
);
assert.equal(
    repairedForgedContract.ai!.rightsRenewals[0].status,
    'PENDING_PAYMENT',
    'A pre-existing deterministic renewal contract must not promote a pending renewal.',
);
assert.equal(
    repairedForgedContract.ai!.rightsContracts.some(contract => contract.id === forgedRenewalContractId),
    false,
    'An unbacked renewal contract must not survive canonical normalization.',
);

// A persisted SETTLED obligation row alone is not trusted settlement evidence.
const forgedObligationPlatform = structuredClone(renewalPlatform);
forgedObligationPlatform.ai!.rightsContracts = [renewalContract];
forgedObligationPlatform.ai!.rightsRenewals = [{ ...renewalRecord, status: 'PENDING_PAYMENT' }];
forgedObligationPlatform.ai!.pendingOneTimeObligations = [{
    ...queuedObligation,
    status: 'SETTLED',
    settledWeek: EXPIRY_WEEK,
}];
const repairedForgedObligation = normalizePlatformAiState(
    forgedObligationPlatform,
    renewalPlayer.id,
    EXPIRY_WEEK + 1,
);
assert.equal(
    repairedForgedObligation.ai!.rightsRenewals[0].status,
    'PENDING_PAYMENT',
    'A loaded settled obligation must not promote a pending renewal.',
);
assert.equal(
    repairedForgedObligation.ai!.pendingOneTimeObligations[0].status,
    'HELD',
    'An unproven loaded settlement must return to the economy queue.',
);
assert.equal(
    (repairedForgedObligation.ai!.rightsRenewals[0] as any).paymentSettledAtAbsoluteWeek ?? null,
    null,
    'Normalization must not synthesize trusted settlement transition metadata.',
);

console.log('Platform AI rights lifecycle audit passed.');
