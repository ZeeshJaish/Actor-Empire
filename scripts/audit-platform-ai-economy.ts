import assert from 'node:assert/strict';
import type {
    IndustryProject,
    PlatformAiResearchItem,
    PlatformAiDistressAction,
    PlatformAiPendingOneTimeObligation,
    PlatformId,
    PlatformState,
    Player,
    StudioId,
} from '../types';
import {
    calculateStreamingAdvertisingRevenueFullCurrency,
    calculateStreamingRunwayFromTrailingCosts,
    calculateStreamingStandaloneValuationFullCurrency,
    calculateStreamingSubscriptionRevenueFullCurrency,
} from '../services/streamingEconomyCore';
import {
    calculatePlatformAiRescueCapMillions,
    calculatePlatformAiValuationBillions,
    calculatePlatformAiWeeklyEconomy,
    getPlatformAiRunway,
    resolvePlatformAiDistress,
    settlePlatformAiEconomy,
} from '../services/platformAi/platformAiEconomy';
import {
    PLATFORM_AI_PROFILES,
    buildPlatformContentCandidates,
    choosePlatformContentCandidate,
    commitPlatformContentCandidate,
    normalizePlatformAiState,
    normalizeWorldPlatformAi,
} from '../services/platformAi';
import { fullCurrencyToMillions } from '../services/streamingRightsCore';
import { commitStreamingCompetitiveWorldWeek } from '../services/streamingCompetitiveWorld';
import { scoutStreamingAcquisitionTarget, valueStreamingAcquisitionTarget } from '../services/streamingAcquisitions';
import { createPlatformAiFixture } from './helpers/platformAiFixture';
import * as platformAiStateModule from '../services/platformAi/platformAiState';
import { createPlatformAiRecurringEfficiencySnapshot } from '../services/platformAi/platformAiEfficiency';

const ABSOLUTE_WEEK = 2_092;
const EPSILON = 0.000_001;

const closeTo = (actual: number, expected: number, message: string): void => {
    assert.ok(Math.abs(actual - expected) <= EPSILON, `${message}: expected ${expected}, received ${actual}`);
};

assert.deepEqual(
    createPlatformAiRecurringEfficiencySnapshot(100, 0.88, 'PLAYER'),
    {
        controller: 'PLAYER',
        policyVersion: 1,
        costMultiplier: 1,
        standardEligibleCostMillions: 100,
        appliedEligibleCostMillions: 100,
        savingMillions: 0,
    },
    'Player control must remove the recurring AI COGS advantage prospectively.',
);

const fixture = createPlatformAiFixture();

const normalizedPlatform = (platformId: PlatformId, player: Player = fixture): PlatformState => (
    normalizePlatformAiState(
        structuredClone(player.world.platforms![platformId]),
        player.id,
        ABSOLUTE_WEEK,
    )
);

const operatingResearch = (overrides: Partial<PlatformAiResearchItem> = {}): PlatformAiResearchItem => ({
    id: 'economy-research-operating',
    idempotencyKey: 'economy-research-operating',
    researchDefinitionId: 'adaptive-startup',
    technologyDefinitionId: 'playback-adaptive-startup',
    branch: 'PLAYBACK_QUALITY',
    targetLevel: 15,
    buildMode: 'BALANCED',
    stage: 'OPERATING',
    ipStrategy: 'LICENSE',
    researchCostMillions: 20,
    ipCostMillions: 4,
    installationCostMillions: 10,
    researchWeeklyOperatingCostMillions: 2,
    licenseWeeklyCostMillions: 0.5,
    researchWeeks: 4,
    prototypeWeeks: 3,
    testWeeks: 2,
    installationWeeks: 2,
    startedAtAbsoluteWeek: ABSOLUTE_WEEK - 20,
    stageStartedAtAbsoluteWeek: ABSOLUTE_WEEK - 10,
    stageReadyAtAbsoluteWeek: ABSOLUTE_WEEK - 8,
    completedAtAbsoluteWeek: ABSOLUTE_WEEK - 8,
    lastProcessedAbsoluteWeek: ABSOLUTE_WEEK - 1,
    ...overrides,
});

// Actor-neutral core: identical arithmetic works in full currency or millions.
closeTo(
    calculateStreamingSubscriptionRevenueFullCurrency({ subscribers: 10_000_000, monthlyArpu: 13, paidSubscriberShare: 1 }),
    10_000_000 * 13 / 4.33,
    'Subscription revenue should retain the player weekly-loop /4.33 semantics',
);
closeTo(
    calculateStreamingAdvertisingRevenueFullCurrency({ subscribers: 10_000_000, adSupportedShare: 0.4, weeklyAdRevenuePerSubscriber: 0.25 }),
    1_000_000,
    'Advertising revenue should return full currency',
);
assert.deepEqual(
    calculateStreamingRunwayFromTrailingCosts({ cash: 240, trailingWeeklyOperatingCost: 20, trailingWeeklyNetCashFlow: -10 }),
    { reserveCoverageWeeks: 12, lossRunwayWeeks: 24 },
);
assert.equal(
    calculateStreamingRunwayFromTrailingCosts({ cash: 240, trailingWeeklyOperatingCost: 20, trailingWeeklyNetCashFlow: 10 }).lossRunwayWeeks,
    null,
    'Profitable operations must not invent an arbitrary numeric loss runway.',
);

// YouTube only monetizes four percent of its audience as paid subscribers.
assert.equal(PLATFORM_AI_PROFILES.YOUTUBE.paidSubscriberShare, 0.04);
for (const platformId of ['NETFLIX', 'APPLE_TV', 'DISNEY_PLUS', 'HULU'] as const) {
    assert.equal(PLATFORM_AI_PROFILES[platformId].paidSubscriberShare, 1);
}
const youtube = normalizedPlatform('YOUTUBE');
const youtubeBeforeCalculation = structuredClone(youtube);
const youtubeEconomy = calculatePlatformAiWeeklyEconomy({
    player: fixture,
    platform: youtube,
    absoluteWeek: ABSOLUTE_WEEK + 1,
});
assert.deepEqual(youtube, youtubeBeforeCalculation, 'Economy calculation must not mutate its platform input');
assert.ok(youtubeEconomy.snapshot);
closeTo(
    youtubeEconomy.snapshot!.subscriptionRevenueMillions,
    youtube.subscribers * 0.04 * PLATFORM_AI_PROFILES.YOUTUBE.monthlyArpu / 4.33,
    'YouTube paid subscription revenue must use its four-percent paid share',
);

// Only active markets contribute operating cost and audience-weighted tax/levy.
const marketPlatform = normalizedPlatform('HULU');
assert.ok(marketPlatform.ai!.marketOperations.length >= 2);
const activeMarket = marketPlatform.ai!.marketOperations[0];
const inactiveMarket = marketPlatform.ai!.marketOperations[1];
marketPlatform.ai!.marketOperations = [
    { ...activeMarket, status: 'ACTIVE' },
    {
        ...inactiveMarket,
        status: 'SUSPENDED',
        weeklyOperatingCost: Number.MAX_SAFE_INTEGER,
        policySnapshot: inactiveMarket.policySnapshot
            ? { ...inactiveMarket.policySnapshot, effectiveTaxPercent: 100, streamingLevyPercent: 100 }
            : null,
    },
];
marketPlatform.ai!.capabilities.activeCountryIds = [activeMarket.countryId!];
marketPlatform.ai!.researchQueue = [
    operatingResearch(),
    operatingResearch({
        id: 'economy-research-in-progress',
        idempotencyKey: 'economy-research-in-progress',
        stage: 'RESEARCHING',
        researchWeeklyOperatingCostMillions: 500,
        licenseWeeklyCostMillions: 500,
    }),
];
const marketEconomy = calculatePlatformAiWeeklyEconomy({
    player: fixture,
    platform: marketPlatform,
    absoluteWeek: ABSOLUTE_WEEK + 1,
});
assert.ok(marketEconomy.snapshot);
const marketSnapshot = marketEconomy.snapshot!;
const normalizedMarketResearch = normalizePlatformAiState(
    marketPlatform,
    fixture.id,
    ABSOLUTE_WEEK + 1,
).ai!.researchQueue;
const exactOperatingResearchCost = normalizedMarketResearch
    .filter(item => item.stage === 'OPERATING')
    .reduce((sum, item) => sum + item.researchWeeklyOperatingCostMillions + item.licenseWeeklyCostMillions, 0);
const activeRate = (
    (activeMarket.policySnapshot?.effectiveTaxPercent || 0)
    + (activeMarket.policySnapshot?.streamingLevyPercent || 0)
) / 100;
closeTo(
    marketSnapshot.marketOperatingCostMillions,
    fullCurrencyToMillions(activeMarket.weeklyOperatingCost),
    'Only active market operating cost should recur',
);
closeTo(
    marketSnapshot.marketPolicyCostMillions,
    marketSnapshot.revenueMillions * activeRate,
    'Only active market tax and levy should apply',
);
closeTo(marketSnapshot.researchCostMillions, exactOperatingResearchCost, 'Only exact normalized operating research costs should recur');
assert.equal(marketSnapshot.contentCostMillions, 0, 'Already-paid rights and production commitments must not be charged again');
assert.equal(
    marketSnapshot.baseOperationsCostMillions,
    PLATFORM_AI_PROFILES.HULU.baseWeeklyOperationsMillions,
    'A canonical active-country operation must not also incur the legacy regional operating proxy',
);
const standardEligibleRecurringCost = marketSnapshot.deliveryCostMillions
    + marketSnapshot.baseOperationsCostMillions
    + marketSnapshot.marketOperatingCostMillions;
assert.ok(
    marketSnapshot.recurringEfficiency.costMultiplier >= 0.88
        && marketSnapshot.recurringEfficiency.costMultiplier <= 0.95,
    'AI recurring internal COGS must receive only the disclosed 5-12% efficiency advantage.',
);
closeTo(
    marketSnapshot.recurringEfficiency.standardEligibleCostMillions,
    standardEligibleRecurringCost,
    'The recurring efficiency base must include delivery, internal operations, and active-market operations only.',
);
closeTo(
    marketSnapshot.recurringEfficiency.appliedEligibleCostMillions,
    standardEligibleRecurringCost * marketSnapshot.recurringEfficiency.costMultiplier,
    'The saved multiplier must reconcile to the applied eligible COGS.',
);
assert.equal(
    marketSnapshot.marketPolicyCostMillions,
    marketSnapshot.revenueMillions * activeRate,
    'Taxes and levies must remain outside the AI efficiency discount.',
);

// Technology is a recurring operating expense only once it is in service.
const technologyOperatingPlatform = normalizedPlatform('NETFLIX');
technologyOperatingPlatform.ai!.marketOperations = [];
technologyOperatingPlatform.ai!.capabilities.activeCountryIds = [];
technologyOperatingPlatform.ai!.researchQueue = [operatingResearch({
    researchWeeklyOperatingCostMillions: 7.25,
    licenseWeeklyCostMillions: 1.75,
})];
const technologyOperatingSnapshot = calculatePlatformAiWeeklyEconomy({
    player: fixture,
    platform: technologyOperatingPlatform,
    absoluteWeek: ABSOLUTE_WEEK + 1,
}).snapshot!;
assert.equal(
    technologyOperatingSnapshot.researchCostMillions,
    9,
    'An operating technology must carry its exact research and licence operating cost',
);

// Catalogue valuation only counts live third-party licences: owned, expired, and inactive records have no paid-rights value.
const activeRightsValuationPlatform = normalizedPlatform('NETFLIX');
const canonicalLicensedContract = {
    id: 'canonical-audit-right', sourceProjectId: 'canonical-audit-project', titleAtSigning: 'Audit Right',
    licensorName: 'Audit Studio', territory: 'GLOBAL' as const, durationWeeks: 104,
    exclusivity: 'NON_EXCLUSIVE' as const, minimumGuarantee: 10_000_000,
    platformRevenueShare: 70, licensorRevenueShare: 30, signedAtAbsoluteWeek: ABSOLUTE_WEEK,
    startsAtAbsoluteWeek: ABSOLUTE_WEEK, expiresAtAbsoluteWeek: ABSOLUTE_WEEK + 104,
    status: 'ACTIVE' as const,
};
activeRightsValuationPlatform.subscribers = 0;
activeRightsValuationPlatform.valuation = 0;
activeRightsValuationPlatform.ai!.standaloneValuationBillions = 0;
activeRightsValuationPlatform.ai!.releaseMemory = [];
activeRightsValuationPlatform.ai!.debtMillions = 0;
activeRightsValuationPlatform.ai!.financeHistory = [{
    ...marketSnapshot,
    revenueMillions: 0,
    operatingCostMillions: 0,
    operatingNetCashFlowMillions: 0,
    mandatoryCostAccruedMillions: 0,
    mandatoryCostMillions: 0,
    closingDebtMillions: 0,
}];
activeRightsValuationPlatform.ai!.rightsContracts = [
    { ...canonicalLicensedContract, id: 'active-third-party-right', status: 'ACTIVE', origin: 'STUDIO_MARKET', permanentPurchase: false },
    { ...canonicalLicensedContract, id: 'expired-third-party-right', status: 'EXPIRED', origin: 'STUDIO_MARKET', permanentPurchase: false },
    { ...canonicalLicensedContract, id: 'owned-transfer-right', status: 'ACTIVE', origin: 'OWNED_STUDIO_TRANSFER', permanentPurchase: true },
];
const activeRightsTechnologyScore = Object.values(activeRightsValuationPlatform.ai!.capabilities.technologyLevels)
    .reduce((sum, value) => sum + value, 0)
    / Object.values(activeRightsValuationPlatform.ai!.capabilities.technologyLevels).length;
const activeRightsOnlyValuation = calculateStreamingStandaloneValuationFullCurrency({
    trailingWeeklyRevenueFullCurrency: 0,
    trailingWeeklyOperatingCostFullCurrency: 0,
    subscribers: 0,
    catalogueScore: 1,
    technologyScore: activeRightsTechnologyScore,
    debtFullCurrency: 0,
    distressMultiplier: 1,
}) / 1_000_000_000 * 0.15;
closeTo(
    calculatePlatformAiValuationBillions({ player: fixture, platform: activeRightsValuationPlatform }),
    activeRightsOnlyValuation,
    'Only an active third-party licence should contribute one paid-rights share to standalone valuation',
);

// YouTube valuation uses its paid audience, not its entire ad-supported audience.
const youtubeValuationPlatform = normalizedPlatform('YOUTUBE');
youtubeValuationPlatform.valuation = 0;
youtubeValuationPlatform.ai!.standaloneValuationBillions = 0;
youtubeValuationPlatform.ai!.rightsContracts = [];
youtubeValuationPlatform.ai!.releaseMemory = [];
youtubeValuationPlatform.ai!.debtMillions = 0;
youtubeValuationPlatform.ai!.financeHistory = [youtubeEconomy.snapshot!];
const youtubeTechnologyScore = Object.values(youtubeValuationPlatform.ai!.capabilities.technologyLevels)
    .reduce((sum, value) => sum + value, 0)
    / Object.values(youtubeValuationPlatform.ai!.capabilities.technologyLevels).length;
const youtubePaidAudienceValuation = calculateStreamingStandaloneValuationFullCurrency({
    trailingWeeklyRevenueFullCurrency: youtubeEconomy.snapshot!.revenueMillions * 1_000_000,
    trailingWeeklyOperatingCostFullCurrency: youtubeEconomy.snapshot!.operatingCostMillions * 1_000_000,
    subscribers: youtubeValuationPlatform.subscribers * 1_000_000 * PLATFORM_AI_PROFILES.YOUTUBE.paidSubscriberShare,
    catalogueScore: 0,
    technologyScore: youtubeTechnologyScore,
    debtFullCurrency: 0,
    distressMultiplier: 1,
}) / 1_000_000_000 * 0.15;
closeTo(
    calculatePlatformAiValuationBillions({ player: fixture, platform: youtubeValuationPlatform }),
    youtubePaidAudienceValuation,
    'YouTube standalone valuation must use its paid subscriber share rather than its total audience',
);

// Only ACTIVE rivals may source or commit fresh content.
const inactiveSourcingPlatform = normalizedPlatform('HULU');
inactiveSourcingPlatform.ai!.status = 'DISTRESSED';
const inactiveSourcingWorld = {
    ...structuredClone(fixture.world),
    platforms: { ...fixture.world.platforms!, HULU: inactiveSourcingPlatform },
};
const inactiveSourcingInput = {
    player: fixture,
    world: inactiveSourcingWorld,
    platformId: 'HULU' as const,
    absoluteWeek: ABSOLUTE_WEEK + 1,
};
assert.deepEqual(
    buildPlatformContentCandidates(inactiveSourcingInput),
    [],
    'Distressed, restructuring, and dormant rivals must be blocked from sourcing new content',
);
const activeSourcingCandidate = buildPlatformContentCandidates({
    ...inactiveSourcingInput,
    world: structuredClone(fixture.world),
}).at(0);
assert.ok(activeSourcingCandidate);
assert.equal(
    commitPlatformContentCandidate({ ...inactiveSourcingInput, candidate: activeSourcingCandidate! }).changed,
    false,
    'A non-active rival must not commit a candidate even if it was scouted before distress',
);
closeTo(
    marketSnapshot.baseOperationsCostMillions,
    PLATFORM_AI_PROFILES.HULU.baseWeeklyOperationsMillions,
    'Canonical ACTIVE market operations replace the legacy regional overhead instead of adding it twice',
);
const legacyMarketPlatform = normalizedPlatform('HULU');
legacyMarketPlatform.ai!.marketOperations = [];
legacyMarketPlatform.ai!.capabilities.activeCountryIds = ['US'];
const legacyMarketSnapshot = calculatePlatformAiWeeklyEconomy({
    player: fixture,
    platform: legacyMarketPlatform,
    absoluteWeek: ABSOLUTE_WEEK + 1,
}).snapshot!;
closeTo(
    legacyMarketSnapshot.baseOperationsCostMillions,
    PLATFORM_AI_PROFILES.HULU.baseWeeklyOperationsMillions + PLATFORM_AI_PROFILES.HULU.regionWeeklyCostMillions,
    'Legacy regional overhead is used only when canonical market operations are absent',
);

// Technology installation operations are an independent recurring line and recur once only while OPERATING.
const technologyPlatform = normalizedPlatform('HULU');
technologyPlatform.ai!.marketOperations = [];
technologyPlatform.ai!.capabilities.activeCountryIds = [];
technologyPlatform.ai!.researchQueue = [
    operatingResearch({
        researchWeeklyOperatingCostMillions: 2,
        licenseWeeklyCostMillions: 0.5,
        technologyWeeklyOperatingCostMillions: 1.75,
    } as Partial<PlatformAiResearchItem>),
    operatingResearch({
        id: 'installing-tech',
        idempotencyKey: 'installing-tech',
        stage: 'INSTALLING',
        researchWeeklyOperatingCostMillions: 200,
        licenseWeeklyCostMillions: 50,
        technologyWeeklyOperatingCostMillions: 175,
    } as Partial<PlatformAiResearchItem>),
];
const technologySnapshot = calculatePlatformAiWeeklyEconomy({
    player: fixture,
    platform: technologyPlatform,
    absoluteWeek: ABSOLUTE_WEEK + 1,
}).snapshot!;
closeTo(technologySnapshot.researchCostMillions, 2.5, 'Operating research and licence costs recur exactly once');
closeTo(technologySnapshot.technologyCostMillions, 1.75, 'Operating technology cost recurs exactly once on its own line');

// Phase 2 rights gap: a licence pays its entire canonical guarantee exactly once.
const makeProject = (
    id: string,
    studioId: StudioId,
    title: string,
    genre: IndustryProject['genre'],
): IndustryProject => ({
    id,
    title,
    genre,
    mediaType: 'MOVIE',
    targetAudience: 'PG-13',
    studioId,
    budgetTier: 'MID',
    quality: 80,
    rating: 8,
    boxOffice: 180_000_000,
    year: 39,
    weekReleased: 30,
    leadActorId: `lead-${id}`,
    leadActorName: `Lead ${id}`,
    directorName: `Director ${id}`,
    reviews: 'Economy audit fixture.',
});
const rightsWorld = normalizeWorldPlatformAi(fixture, {
    ...structuredClone(fixture.world),
    projects: [
        makeProject('economy-rights-1', 'UNIVERSAL', 'Ledger One', 'THRILLER'),
        makeProject('economy-rights-2', 'UNIVERSAL', 'Ledger Two', 'DRAMA'),
        makeProject('economy-rights-3', 'UNIVERSAL', 'Ledger Three', 'CRIME'),
    ],
}, ABSOLUTE_WEEK);
const rightsInput = { player: fixture, world: rightsWorld, platformId: 'NETFLIX' as const, absoluteWeek: ABSOLUTE_WEEK };
const rightsCandidate = buildPlatformContentCandidates(rightsInput).find(candidate => candidate.source === 'LICENSED_RELEASED_TITLE');
assert.ok(rightsCandidate);
const rightsCashBefore = rightsWorld.platforms!.NETFLIX.cashReserve;
const rightsCommit = commitPlatformContentCandidate({ ...rightsInput, candidate: rightsCandidate! });
assert.equal(rightsCommit.changed, true);
assert.equal(rightsCandidate!.depositMillions, rightsCandidate!.rightsCostMillions, 'A rights commitment charge should be the full MG');
assert.equal(rightsCommit.plan!.paidSpendMillions, rightsCandidate!.rightsCostMillions);
assert.equal(
    rightsCommit.world.platforms!.NETFLIX.cashReserve,
    rightsCashBefore - rightsCandidate!.rightsCostMillions,
);
const repeatedRights = commitPlatformContentCandidate({
    ...rightsInput,
    world: rightsCommit.world,
    candidate: rightsCandidate!,
});
assert.equal(repeatedRights.changed, false);
assert.deepEqual(repeatedRights.world, rightsCommit.world, 'A repeated rights commitment must not pay the MG twice');
const originalCandidate = buildPlatformContentCandidates(rightsInput).find(candidate => candidate.source === 'COMMISSIONED_ORIGINAL');
assert.ok(originalCandidate);
assert.ok(originalCandidate!.depositMillions > 0 && originalCandidate!.depositMillions < originalCandidate!.productionBudgetMillions);

// Revenue share follows the player weekly-loop formula and only eligible active licensed contracts participate.
const rightsEconomyPlatform = structuredClone(rightsCommit.world.platforms!.NETFLIX);
rightsEconomyPlatform.subscribers = 100;
rightsEconomyPlatform.ai!.marketOperations = [];
rightsEconomyPlatform.ai!.capabilities.activeCountryIds = [];
rightsEconomyPlatform.ai!.researchQueue = [];
rightsEconomyPlatform.ai!.slate = rightsEconomyPlatform.ai!.slate.map(plan => ({ ...plan, status: 'RELEASED' as const }));
const activeContract = rightsEconomyPlatform.ai!.rightsContracts[0];
assert.ok(activeContract);
rightsEconomyPlatform.ai!.rightsContracts = [
    { ...activeContract, status: 'ACTIVE', startsAtAbsoluteWeek: ABSOLUTE_WEEK, expiresAtAbsoluteWeek: ABSOLUTE_WEEK + 20 },
    { ...activeContract, id: 'expired-share', status: 'EXPIRED', startsAtAbsoluteWeek: ABSOLUTE_WEEK - 20, expiresAtAbsoluteWeek: ABSOLUTE_WEEK },
    { ...activeContract, id: 'owned-share', status: 'ACTIVE', origin: 'OWNED_STUDIO_TRANSFER', startsAtAbsoluteWeek: ABSOLUTE_WEEK, expiresAtAbsoluteWeek: ABSOLUTE_WEEK + 20 },
];
const rightsEconomySnapshot = calculatePlatformAiWeeklyEconomy({
    player: fixture,
    platform: rightsEconomyPlatform,
    absoluteWeek: ABSOLUTE_WEEK + 1,
}).snapshot! as typeof marketSnapshot & { partnerRevenueShareCostMillions: number };
const eligiblePlanCount = Math.max(1, new Set(rightsEconomyPlatform.ai!.slate.flatMap(plan => plan.sourceProjectIds)).size);
const expectedRightsShare = rightsEconomySnapshot.subscriptionRevenueMillions
    * activeContract.licensorRevenueShare / 100
    * Math.min(0.45, 1 / eligiblePlanCount);
closeTo(rightsEconomySnapshot.partnerRevenueShareCostMillions, expectedRightsShare, 'Only the eligible active licensed contract pays revenue share once');

// All sourcing entry points are frozen for any non-ACTIVE company status.
for (const status of ['DISTRESSED', 'RESTRUCTURING', 'DORMANT'] as const) {
    const frozenWorld = structuredClone(rightsWorld);
    frozenWorld.platforms!.NETFLIX.ai!.status = status;
    const frozenInput = { ...rightsInput, world: frozenWorld };
    assert.deepEqual(buildPlatformContentCandidates(frozenInput), [], `${status} companies cannot build sourcing options`);
    const frozenCommit = commitPlatformContentCandidate({ ...frozenInput, candidate: rightsCandidate! });
    assert.equal(frozenCommit.changed, false, `${status} companies cannot commit new content`);
    assert.deepEqual(frozenCommit.world, frozenWorld, `${status} sourcing commit is a deep-equal no-op`);
}

// Profitable settlement reconciles exactly and same-week processing is idempotent.
const profitable = normalizedPlatform('NETFLIX');
profitable.subscribers = 1_000;
profitable.cashReserve = 100_000;
profitable.ai!.marketOperations = [];
profitable.ai!.capabilities.activeCountryIds = [];
profitable.ai!.researchQueue = [];
profitable.ai!.financeHistory = [];
profitable.ai!.debtMillions = 100;
const profitableBeforeSettlement = structuredClone(profitable);
const profitableResult = settlePlatformAiEconomy({
    player: fixture,
    platform: profitable,
    absoluteWeek: ABSOLUTE_WEEK + 1,
});
assert.deepEqual(profitable, profitableBeforeSettlement, 'Settlement must return new state without mutating its input');
assert.ok(profitableResult.snapshot);
assert.equal(profitableResult.cashDeltaMillions, profitableResult.snapshot!.netCashFlowMillions);
closeTo(
    profitableResult.platform.cashReserve,
    profitable.cashReserve + profitableResult.cashDeltaMillions,
    'Cash delta must reconcile to closing cash',
);
closeTo(
    profitableResult.snapshot!.openingCashMillions
        + profitableResult.snapshot!.subscriptionRevenueMillions
        + profitableResult.snapshot!.advertisingRevenueMillions
        + profitableResult.snapshot!.verifiedContractIncomeMillions
        + profitableResult.snapshot!.rescueIncomeMillions
        - profitableResult.snapshot!.mandatoryCostMillions
        - profitableResult.snapshot!.settledObligationCostMillions
        - profitableResult.snapshot!.financingCostMillions
        - profitableResult.snapshot!.reserveAllocationMillions,
    profitableResult.snapshot!.closingCashMillions,
    'Weekly snapshot must reconcile every exact cash line item',
);
assert.ok(profitableResult.snapshot!.allocations.length >= 1);
assert.equal(profitableResult.snapshot!.allocations[0].type, 'DEBT_REDUCTION');
assert.ok(profitableResult.snapshot!.allocations.some(allocation => allocation.type === 'SHAREHOLDER_DISTRIBUTION'));
assert.ok(profitableResult.platform.cashReserve <= profitableResult.snapshot!.reserveTargetMillions * 1.25 + EPSILON);
const repeatedSettlement = settlePlatformAiEconomy({
    player: fixture,
    platform: profitableResult.platform,
    absoluteWeek: ABSOLUTE_WEEK + 1,
});
assert.equal(repeatedSettlement.changed, false);
assert.deepEqual(repeatedSettlement.platform, profitableResult.platform);

// Release audience impact settles at the next economy boundary and immediately feeds that week's economics.
const audienceSettlementPlatform = normalizedPlatform('HULU');
audienceSettlementPlatform.subscribers = 10;
audienceSettlementPlatform.cashReserve = 1_000;
audienceSettlementPlatform.ai!.financeHistory = [];
(audienceSettlementPlatform.ai as any).pendingAudienceSettlements = [
    {
        id: 'audience-settlement:window-hit:project-hit:plan-hit',
        streamingWindowId: 'window-hit',
        projectId: 'project-hit',
        planId: 'plan-hit',
        subscriberImpactMillions: 1.25,
        acquiredSubscribersMillions: 0.9,
        retainedSubscribersMillions: 0.5,
        churnedSubscribersMillions: 0.15,
        engagementIndexDelta: 3.5,
        catalogueStrengthDelta: 2.25,
        status: 'PENDING',
        createdAtAbsoluteWeek: ABSOLUTE_WEEK,
        settledAtAbsoluteWeek: null,
    },
    {
        id: 'audience-settlement:window-old:project-old:plan-old',
        streamingWindowId: 'window-old',
        projectId: 'project-old',
        planId: 'plan-old',
        subscriberImpactMillions: 9,
        status: 'SETTLED',
        createdAtAbsoluteWeek: ABSOLUTE_WEEK - 2,
        settledAtAbsoluteWeek: ABSOLUTE_WEEK - 1,
    },
    {
        id: 'audience-settlement:window-future:project-future:plan-future',
        streamingWindowId: 'window-future',
        projectId: 'project-future',
        planId: 'plan-future',
        subscriberImpactMillions: 20,
        status: 'PENDING',
        createdAtAbsoluteWeek: ABSOLUTE_WEEK + 2,
        settledAtAbsoluteWeek: null,
    },
];
const sameWeekAudienceSettlement = settlePlatformAiEconomy({
    player: fixture,
    platform: audienceSettlementPlatform,
    absoluteWeek: ABSOLUTE_WEEK,
});
assert.equal(sameWeekAudienceSettlement.platform.subscribers, 10, 'Audience impact created in week W must not settle during week W.');
assert.equal(
    (sameWeekAudienceSettlement.platform.ai as any).pendingAudienceSettlements.find((item: any) => item.id.includes('window-hit')).status,
    'PENDING',
    'The same-week economy snapshot must retain the current-week audience record as PENDING.',
);
assert.equal(
    (sameWeekAudienceSettlement.platform.ai as any).pendingAudienceSettlements.find((item: any) => item.id.includes('window-future')).status,
    'PENDING',
    'The same-week economy snapshot must preserve future audience records as PENDING.',
);
const sameWeekAudienceReplay = settlePlatformAiEconomy({
    player: fixture,
    platform: sameWeekAudienceSettlement.platform,
    absoluteWeek: ABSOLUTE_WEEK,
});
assert.deepEqual(
    sameWeekAudienceReplay.platform,
    sameWeekAudienceSettlement.platform,
    'Same-week economy replay must not hide or mutate the pending audience record.',
);
const audienceControlPlatform = structuredClone(sameWeekAudienceSettlement.platform);
(audienceControlPlatform.ai as any).pendingAudienceSettlements = (
    audienceControlPlatform.ai as any
).pendingAudienceSettlements.filter((item: any) => !item.id.includes('window-hit'));
const audienceControl = settlePlatformAiEconomy({
    player: fixture,
    platform: audienceControlPlatform,
    absoluteWeek: ABSOLUTE_WEEK + 1,
});
const audienceSettlement = settlePlatformAiEconomy({
    player: fixture,
    platform: sameWeekAudienceSettlement.platform,
    absoluteWeek: ABSOLUTE_WEEK + 1,
});
assert.equal(audienceSettlement.platform.subscribers, 11.25, 'Next-week economy must apply each pending subscriber impact exactly once.');
assert.deepEqual((audienceSettlement.platform.ai as any).audienceHealth, {
    engagementIndex: 53.5,
    catalogueStrengthIndex: 52.25,
    acquiredSubscribersMillions: 0.9,
    retainedSubscribersMillions: 0.5,
    churnedSubscribersMillions: 0.15,
});
assert.equal(
    (audienceSettlement.platform.ai as any).pendingAudienceSettlements.find((item: any) => item.id.includes('window-hit')).status,
    'SETTLED',
    'Applied audience settlement must persist as SETTLED.',
);
assert.equal(
    (audienceSettlement.platform.ai as any).pendingAudienceSettlements.find((item: any) => item.id.includes('window-future')).status,
    'PENDING',
    'Next-week economy must leave future audience records pending.',
);
assert.ok(audienceSettlement.snapshot!.subscriptionRevenueMillions > audienceControl.snapshot!.subscriptionRevenueMillions, 'Updated subscribers must feed same-week subscription revenue.');
assert.ok(audienceSettlement.snapshot!.deliveryCostMillions > audienceControl.snapshot!.deliveryCostMillions, 'Updated subscribers must feed same-week delivery cost.');
assert.ok(audienceSettlement.platform.valuation > audienceControl.platform.valuation, 'Updated subscribers must feed same-week valuation.');
const audienceReplay = settlePlatformAiEconomy({
    player: fixture,
    platform: audienceSettlement.platform,
    absoluteWeek: ABSOLUTE_WEEK + 1,
});
assert.equal(audienceReplay.platform.subscribers, 11.25, 'Same-week economy replay must not reapply a settled audience impact.');
assert.deepEqual((audienceReplay.platform.ai as any).audienceHealth, (audienceSettlement.platform.ai as any).audienceHealth);
assert.deepEqual(audienceReplay.platform, audienceSettlement.platform, 'Same-week economy replay must preserve the settled ledger byte-for-byte.');

const earmarkOrderPlatform = normalizedPlatform('APPLE_TV');
earmarkOrderPlatform.subscribers = 1_000;
earmarkOrderPlatform.cashReserve = 100_000;
earmarkOrderPlatform.ai!.marketOperations = [];
earmarkOrderPlatform.ai!.capabilities.activeCountryIds = [];
earmarkOrderPlatform.ai!.financeHistory = [];
const earmarkProduction = (id: string, budgetMillions: number) => ({
    id,
    canonicalProjectId: `${id}-project`,
    title: id,
    projectType: 'MOVIE' as const,
    genre: 'DRAMA' as const,
    producerStudioId: 'WARNER_BROS' as const,
    commissioningPlatformId: 'APPLE_TV' as const,
    status: 'PRODUCTION' as const,
    productionCalendar: { startAbsoluteWeek: ABSOLUTE_WEEK, plannedEndAbsoluteWeek: ABSOLUTE_WEEK + 10, currentMilestone: 'PRODUCTION', milestones: [] } as never,
    budgetMillions,
    paidMillions: 0,
    talentBookingIds: [],
    writerSource: 'IN_HOUSE_TEAM' as const,
    writerId: null,
    writerName: 'Earmark Audit Writer',
    writerSkill: 80,
    createdAtAbsoluteWeek: ABSOLUTE_WEEK,
    updatedAtAbsoluteWeek: ABSOLUTE_WEEK,
});
const alphaEarmarkProduction = earmarkProduction('alpha-earmark-production', 70);
const betaEarmarkProduction = earmarkProduction('beta-earmark-production', 110);
const earmarkPlayerA = structuredClone(fixture);
earmarkPlayerA.world.industryProductions = {
    [alphaEarmarkProduction.id]: alphaEarmarkProduction,
    [betaEarmarkProduction.id]: betaEarmarkProduction,
};
const earmarkPlayerB = structuredClone(fixture);
earmarkPlayerB.world.industryProductions = {
    [betaEarmarkProduction.id]: betaEarmarkProduction,
    [alphaEarmarkProduction.id]: alphaEarmarkProduction,
};
const earmarkOrderA = settlePlatformAiEconomy({ player: earmarkPlayerA, platform: structuredClone(earmarkOrderPlatform), absoluteWeek: ABSOLUTE_WEEK + 4 });
const earmarkOrderB = settlePlatformAiEconomy({ player: earmarkPlayerB, platform: structuredClone(earmarkOrderPlatform), absoluteWeek: ABSOLUTE_WEEK + 4 });
assert.deepEqual(earmarkOrderA, earmarkOrderB, 'Economy settlement must be independent of persisted industry-production insertion order.');

const negativeAudiencePlatform = normalizedPlatform('HULU');
negativeAudiencePlatform.subscribers = 0.2;
negativeAudiencePlatform.ai!.financeHistory = [];
(negativeAudiencePlatform.ai as any).pendingAudienceSettlements = [{
    id: 'audience-settlement:window-flop:project-flop:plan-flop',
    streamingWindowId: 'window-flop',
    projectId: 'project-flop',
    planId: 'plan-flop',
    subscriberImpactMillions: -1,
    status: 'PENDING',
    createdAtAbsoluteWeek: ABSOLUTE_WEEK,
    settledAtAbsoluteWeek: null,
}];
assert.equal(
    settlePlatformAiEconomy({ player: fixture, platform: negativeAudiencePlatform, absoluteWeek: ABSOLUTE_WEEK + 3 }).platform.subscribers,
    0,
    'Audience settlement must clamp subscriber totals nonnegative.',
);

// Approved future work is earmarked (not silently spent) before any shareholder distribution.
const reserved = normalizedPlatform('NETFLIX');
reserved.subscribers = 1_000;
reserved.cashReserve = 100_000;
reserved.ai!.marketOperations = [];
reserved.ai!.capabilities.activeCountryIds = [];
reserved.ai!.debtMillions = 10;
reserved.ai!.researchQueue = [operatingResearch({
    id: 'approved-future-research',
    idempotencyKey: 'approved-future-research',
    stage: 'AWAITING_IP',
    ipCostMillions: 11,
    installationCostMillions: 19,
})];
const reservePlayer = structuredClone(fixture);
reservePlayer.world.industryProductions = {
    'approved-production': {
        id: 'approved-production',
        canonicalProjectId: 'approved-project',
        title: 'Approved Future Film',
        projectType: 'MOVIE',
        genre: 'DRAMA',
        producerStudioId: 'UNIVERSAL',
        commissioningPlatformId: 'NETFLIX',
        platformContentPlanId: null,
        status: 'PRE_PRODUCTION',
        productionCalendar: { status: 'PRE_PRODUCTION', startedAtAbsoluteWeek: ABSOLUTE_WEEK, currentWeek: 0, totalWeeks: 20 } as any,
        budgetMillions: 100,
        paidMillions: 5,
        talentBookingIds: [],
        writerSource: 'IN_HOUSE_TEAM',
        writerId: null,
        writerName: 'Audit Writer',
        writerSkill: 80,
        aiExecution: {
            standardDurationWeeks: 20, effectiveDurationWeeks: 20, qualityForecast: 80,
            executionRoll: 0.5, delayRoll: 0.5, overrunRoll: 0.5, failureRoll: 0.5,
            delayWeeks: 0, overrunMillions: 8, leadActorId: null, leadActorName: null,
            directorId: null, directorName: null, writerId: null, writerName: null,
            finalQuality: null, failureDecision: 'NONE', failureResponse: 'NONE',
            failureResponseAmountMillions: 0, failureResponseAppliedAtAbsoluteWeek: null,
            paidMilestoneIds: ['COMMISSIONING'], controllerAtLastProgression: 'AI',
            lastProgressedAbsoluteWeek: ABSOLUTE_WEEK, holdReason: null,
        },
        createdAtAbsoluteWeek: ABSOLUTE_WEEK,
        updatedAtAbsoluteWeek: ABSOLUTE_WEEK,
    },
};
reservePlayer.world.platforms!.NETFLIX = reserved;
const reservedResult = settlePlatformAiEconomy({ player: reservePlayer, platform: reserved, absoluteWeek: ABSOLUTE_WEEK + 1 });
assert.equal(reservedResult.snapshot!.allocations[0]?.type, 'DEBT_REDUCTION');
assert.equal(reservedResult.snapshot!.allocations.find(item => item.type === 'APPROVED_CONTENT')?.amountMillions, 103, 'Unpaid production principal and overrun remain funded');
assert.equal(reservedResult.snapshot!.allocations.find(item => item.type === 'APPROVED_RESEARCH')?.amountMillions, 30, 'Unpaid IP and installation remain funded');
const shareholderDistribution = reservedResult.snapshot!.allocations.find(item => item.type === 'SHAREHOLDER_DISTRIBUTION')?.amountMillions || 0;
assert.ok(reservedResult.platform.cashReserve >= reservedResult.snapshot!.reserveTargetMillions * 1.25 + 133 - EPSILON || shareholderDistribution === 0);

// One-time contractual/discretionary/localization costs never borrow and return explicit ON_HOLD records.
const oneTimePlatform = normalizedPlatform('NETFLIX');
oneTimePlatform.subscribers = 0;
oneTimePlatform.cashReserve = 1;
oneTimePlatform.ai!.marketOperations = [];
oneTimePlatform.ai!.capabilities.activeCountryIds = [];
oneTimePlatform.ai!.debtMillions = 0;
const oneTimeResult = settlePlatformAiEconomy({
    player: fixture,
    platform: oneTimePlatform,
    absoluteWeek: ABSOLUTE_WEEK + 3,
    settledObligationCostMillions: 20,
    discretionaryCostMillions: 30,
    localizationCostMillions: 40,
});
assert.equal(oneTimeResult.snapshot!.heldObligations.reduce((sum, hold) => sum + hold.amountMillions, 0), 90);
assert.ok(oneTimeResult.snapshot!.heldObligations.every(hold => hold.status === 'ON_HOLD'));
assert.equal(oneTimeResult.platform.ai!.debtMillions, oneTimeResult.snapshot!.unfundedMandatoryCostMillions);
assert.equal(oneTimeResult.snapshot!.mandatoryCostAccruedMillions, oneTimeResult.snapshot!.operatingCostMillions);

// Economy records the short runway but leaves distress progression to the world resolver.
const weak = normalizedPlatform('HULU');
weak.subscribers = 1;
weak.cashReserve = 500;
weak.ai!.marketOperations = [];
weak.ai!.capabilities.activeCountryIds = [];
weak.ai!.financeHistory = [];
weak.ai!.debtMillions = 0;
const weakResult = settlePlatformAiEconomy({
    player: fixture,
    platform: weak,
    absoluteWeek: ABSOLUTE_WEEK + 1,
});
assert.ok(weakResult.snapshot?.lossRunwayWeeks !== null && weakResult.snapshot!.lossRunwayWeeks < 8);
assert.equal(weakResult.platform.ai!.debtMillions, 0);
assert.equal(weakResult.platform.ai!.status, 'ACTIVE');
assert.equal(weakResult.platform.ai!.decisionHistory.some(decision => decision.type === 'DISTRESS_RESPONSE'), false);

// Mandatory insolvency becomes exact debt; discretionary commitments stay held.
const insolvent = normalizedPlatform('NETFLIX');
insolvent.subscribers = 0;
insolvent.cashReserve = 7;
insolvent.ai!.marketOperations = [];
insolvent.ai!.capabilities.activeCountryIds = [];
insolvent.ai!.financeHistory = [];
insolvent.ai!.debtMillions = 3;
const insolventResult = settlePlatformAiEconomy({
    player: fixture,
    platform: insolvent,
    absoluteWeek: ABSOLUTE_WEEK + 2,
});
assert.ok(insolventResult.snapshot);
assert.equal(insolventResult.platform.cashReserve, 0);
closeTo(
    insolventResult.platform.ai!.debtMillions,
    3 + insolventResult.snapshot!.debtIncurredMillions,
    'Mandatory shortfall should become exact debt',
);
assert.ok(insolventResult.snapshot!.debtIncurredMillions > 0);
assert.equal(insolventResult.platform.ai!.status, 'DISTRESSED');
assert.equal(
    insolventResult.platform.ai!.decisionHistory.filter(decision => (
        decision.absoluteWeek === ABSOLUTE_WEEK + 2 && decision.type === 'DISTRESS_RESPONSE'
    )).length,
    0,
    'Economy must not run a parallel decision-history distress authority',
);
const firstDurableDistress = resolvePlatformAiDistress({
    player: fixture,
    platform: insolventResult.platform,
    absoluteWeek: ABSOLUTE_WEEK + 2,
});
assert.equal(firstDurableDistress.platform.ai!.distressEpisodes[0]?.stageResults[0]?.stage, 'FREEZE_GREENLIGHTS');
assert.deepEqual(
    resolvePlatformAiDistress({
        player: fixture,
        platform: firstDurableDistress.platform,
        absoluteWeek: ABSOLUTE_WEEK + 2,
    }).platform,
    firstDurableDistress.platform,
    'Durable distress resolution must be same-week idempotent',
);

// Runway fields have distinct meanings: gross reserve coverage versus loss runway.
const runway = getPlatformAiRunway({ player: fixture, platform: insolventResult.platform });
assert.equal(runway.reserveCoverageWeeks, 0);
assert.equal(runway.lossRunwayWeeks, 0);
assert.equal(runway.platform, insolventResult.platform);

// Rescue is bounded by profile, operating scale, target reserve, and a 104-week cooldown.
let rescueCandidate = normalizedPlatform('APPLE_TV');
rescueCandidate.cashReserve = 0;
rescueCandidate.ai!.debtMillions = 1_000;
rescueCandidate.ai!.status = 'RESTRUCTURING';
rescueCandidate.ai!.financeHistory = [{
    absoluteWeek: ABSOLUTE_WEEK - 1,
    openingCashMillions: 0,
    subscriptionRevenueMillions: 100,
    advertisingRevenueMillions: 0,
    verifiedContractIncomeMillions: 0,
    rescueIncomeMillions: 0,
    rescueDebtReductionMillions: 0,
    externalInvestmentIncomeMillions: 0,
    externalInvestmentDebtReductionMillions: 0,
    externalInvestmentArrearsReductionMillions: 0,
    revenueMillions: 100,
    deliveryCostMillions: 0,
    baseOperationsCostMillions: 100,
    marketOperatingCostMillions: 0,
    marketPolicyCostMillions: 0,
    partnerRevenueShareCostMillions: 0,
    administrationCostMillions: 0,
    recurringEfficiency: {
        controller: 'AI',
        policyVersion: 1,
        costMultiplier: 1,
        standardEligibleCostMillions: 0,
        appliedEligibleCostMillions: 0,
        savingMillions: 0,
    },
    contentCostMillions: 0,
    researchCostMillions: 0,
    technologyCostMillions: 0,
    localizationCostMillions: 0,
    contractualCostAccruedMillions: 0,
    contractualCostMillions: 0,
    localizationCostAccruedMillions: 0,
    discretionaryCostAccruedMillions: 0,
    discretionaryCostMillions: 0,
    heldObligations: [],
    mandatoryCostAccruedMillions: 100,
    mandatoryCostMillions: 100,
    settledObligationAccruedMillions: 0,
    settledObligationCostMillions: 0,
    financingCostAccruedMillions: 0,
    financingCostMillions: 0,
    unfundedMandatoryCostMillions: 0,
    unfundedSettledObligationCostMillions: 0,
    unfundedFinancingCostMillions: 0,
    operatingCostMillions: 100,
    operatingNetCashFlowMillions: 0,
    debtIncurredMillions: 0,
    reserveAllocationMillions: 0,
    allocations: [],
    netCashFlowMillions: 0,
    closingCashMillions: 0,
    closingDebtMillions: 1_000,
    reserveTargetMillions: 7_800,
    reserveCoverageWeeks: 0,
    lossRunwayWeeks: null,
    runwayWeeks: null,
}];
const precedingActions: PlatformAiDistressAction[] = [
    'FREEZE_GREENLIGHTS',
    'PAUSE_RESEARCH',
    'HOLD_COMMISSION',
    'LICENSE_CATALOGUE',
    'WITHDRAW_REGION',
    'RESTRUCTURE',
];
rescueCandidate.ai!.decisionHistory = precedingActions.map((action, index) => ({
    id: `distress-${action}`,
    absoluteWeek: ABSOLUTE_WEEK - precedingActions.length + index,
    type: 'DISTRESS_RESPONSE',
    summary: action,
    reason: action,
    cashImpactMillions: 0,
    action,
}));
const rescueCap = calculatePlatformAiRescueCapMillions({ player: fixture, platform: rescueCandidate });
assert.equal(rescueCap, 1_300, 'Rescue scale cap should be min(avg revenue × 13, avg mandatory cost × 13)');
assert.ok(rescueCap <= rescueCandidate.ai!.financeHistory[0].reserveTargetMillions * 0.5);

// LIMITED backing applies an exact half scale cap; debt is included in need and cash cannot exceed 50% target.
const limitedCandidate = structuredClone(rescueCandidate);
limitedCandidate.id = 'HULU';
limitedCandidate.name = 'Hulu';
limitedCandidate.ai!.profileId = 'HULU';
limitedCandidate.ai!.debtMillions = 2_000;
limitedCandidate.ai!.decisionHistory = rescueCandidate.ai!.decisionHistory.filter(decision => decision.action !== 'LICENSE_CATALOGUE');
const limitedScaleCap = calculatePlatformAiRescueCapMillions({ player: fixture, platform: limitedCandidate });
assert.equal(limitedScaleCap, 650, 'LIMITED backing halves the exact 13-week operating scale cap');

// Restructuring/rescue progression is covered by the durable episode audit;
// this audit retains the shared bounded rescue-cap arithmetic.

// Valuation is standalone, deterministic, bounded, and smoothed 85/15.
const valuationPlatform = normalizedPlatform('DISNEY_PLUS');
valuationPlatform.ai!.standaloneValuationBillions = 80;
valuationPlatform.ai!.financeHistory = [marketSnapshot];
const rawStandalone = calculateStreamingStandaloneValuationFullCurrency({
    trailingWeeklyRevenueFullCurrency: marketSnapshot.revenueMillions * 1_000_000,
    trailingWeeklyOperatingCostFullCurrency: marketSnapshot.operatingCostMillions * 1_000_000,
    subscribers: valuationPlatform.subscribers * 1_000_000,
    catalogueScore: valuationPlatform.ai!.releaseMemory.length + valuationPlatform.ai!.rightsContracts.length,
    technologyScore: Object.values(valuationPlatform.ai!.capabilities.technologyLevels).reduce((sum, value) => sum + value, 0)
        / Object.values(valuationPlatform.ai!.capabilities.technologyLevels).length,
    debtFullCurrency: valuationPlatform.ai!.debtMillions * 1_000_000,
    distressMultiplier: 1,
}) / 1_000_000_000;
const smoothedValuation = calculatePlatformAiValuationBillions({ player: fixture, platform: valuationPlatform });
closeTo(smoothedValuation, 80 * 0.85 + rawStandalone * 0.15, 'Standalone valuation should use 85/15 smoothing');
const fundedValuationPlatform = structuredClone(valuationPlatform);
fundedValuationPlatform.ai!.externalRecapitalizations = [{
    id: 'funded-valuation-record',
    idempotencyKey: 'funded-valuation-record',
    episodeId: 'funded-valuation-episode',
    platformId: fundedValuationPlatform.id,
    status: 'SETTLED',
    investorArchetype: 'MEDIA_GROUP',
    offeredMillions: 500,
    settledMillions: 500,
    arrearsReductionMillions: 0,
    debtReductionMillions: 200,
    cashRemainderMillions: 300,
    dilutionPercent: 22,
    autonomyPenalty: 25,
    valuationConfidenceMultiplier: 0.8,
    offeredAtAbsoluteWeek: ABSOLUTE_WEEK - 1,
    settledAtAbsoluteWeek: ABSOLUTE_WEEK - 1,
    cooldownUntilAbsoluteWeek: ABSOLUTE_WEEK + 103,
    reason: 'Audit funding',
}];
assert.ok(
    calculatePlatformAiValuationBillions({ player: fixture, platform: fundedValuationPlatform, absoluteWeek: ABSOLUTE_WEEK })
        < smoothedValuation,
    'External recapitalization dilution and confidence must reduce the explainable standalone valuation.',
);
const administeredValuationPlatform = structuredClone(valuationPlatform);
administeredValuationPlatform.ai!.administration = {
    enteredAtAbsoluteWeek: ABSOLUTE_WEEK,
    episodeId: 'admin-valuation-episode',
    outcome: 'PENDING',
    resolvedAtAbsoluteWeek: null,
    referenceId: null,
};
assert.ok(
    calculatePlatformAiValuationBillions({ player: fixture, platform: administeredValuationPlatform, absoluteWeek: ABSOLUTE_WEEK })
        < smoothedValuation,
    'Bankruptcy administration must be visible in standalone valuation before a final outcome.',
);

const youtubePaidEquivalentPlatform = normalizedPlatform('YOUTUBE');
youtubePaidEquivalentPlatform.ai!.standaloneValuationBillions = 10;
youtubePaidEquivalentPlatform.ai!.financeHistory = [marketSnapshot];
const youtubeRawPaidEquivalent = calculateStreamingStandaloneValuationFullCurrency({
    trailingWeeklyRevenueFullCurrency: marketSnapshot.revenueMillions * 1_000_000,
    trailingWeeklyOperatingCostFullCurrency: marketSnapshot.operatingCostMillions * 1_000_000,
    subscribers: youtubePaidEquivalentPlatform.subscribers * 0.04 * 1_000_000,
    catalogueScore: youtubePaidEquivalentPlatform.ai!.releaseMemory.length + youtubePaidEquivalentPlatform.ai!.rightsContracts.length,
    technologyScore: Object.values(youtubePaidEquivalentPlatform.ai!.capabilities.technologyLevels).reduce((sum, value) => sum + value, 0)
        / Object.values(youtubePaidEquivalentPlatform.ai!.capabilities.technologyLevels).length,
    debtFullCurrency: youtubePaidEquivalentPlatform.ai!.debtMillions * 1_000_000,
    distressMultiplier: 1,
}) / 1_000_000_000;
closeTo(
    calculatePlatformAiValuationBillions({ player: fixture, platform: youtubePaidEquivalentPlatform }),
    10 * 0.85 + youtubeRawPaidEquivalent * 0.15,
    'YouTube subscriber valuation uses four-percent paid equivalents while advertising keeps the full audience',
);

const legacyHistoryPlatform = structuredClone(fixture.world.platforms!.HULU);
legacyHistoryPlatform.ai = {
    ...normalizedPlatform('HULU').ai!,
    decisionHistory: Array.from({ length: 100 }, (_, index) => ({
        id: `legacy-${index}`,
        absoluteWeek: index,
        type: 'LEGACY',
        summary: `Legacy ${index}`,
        reason: 'Audit',
        cashImpactMillions: 0,
    })),
};
const compactedHistory = normalizePlatformAiState(legacyHistoryPlatform, fixture.id, ABSOLUTE_WEEK);
assert.equal(compactedHistory.ai!.decisionHistory.length, 40, 'Legacy decision history normalizes from 100 to 40');

// Acquired platforms are a hard no-op before normalization or mutation.
const acquiredPlayer = structuredClone(fixture);
acquiredPlayer.ownedStreamingPlatform.corporateDevelopment.acquiredPlatformIds = ['NETFLIX'];
const acquiredPlatform = structuredClone(fixture.world.platforms!.NETFLIX);
const acquiredCalculate = calculatePlatformAiWeeklyEconomy({
    player: acquiredPlayer,
    platform: acquiredPlatform,
    absoluteWeek: ABSOLUTE_WEEK + 1,
});
assert.deepEqual(acquiredCalculate.platform, acquiredPlatform);
assert.equal(acquiredCalculate.snapshot, null);
assert.deepEqual(
    settlePlatformAiEconomy({ player: acquiredPlayer, platform: acquiredPlatform, absoluteWeek: ABSOLUTE_WEEK + 1 }).platform,
    acquiredPlatform,
);
assert.deepEqual(
    resolvePlatformAiDistress({ player: acquiredPlayer, platform: acquiredPlatform, absoluteWeek: ABSOLUTE_WEEK + 1 }).platform,
    acquiredPlatform,
);
assert.deepEqual(getPlatformAiRunway({ player: acquiredPlayer, platform: acquiredPlatform }).platform, acquiredPlatform);
assert.equal(calculatePlatformAiRescueCapMillions({ player: acquiredPlayer, platform: acquiredPlatform }), 0);
assert.equal(calculatePlatformAiValuationBillions({ player: acquiredPlayer, platform: acquiredPlatform }), acquiredPlatform.valuation);

// Acquisition underwriting prefers the persisted standalone history over the legacy display valuation.
let acquisitionPlayer = structuredClone(fixture);
acquisitionPlayer.ownedStreamingPlatform.lifecycle = 'ACTIVE';
acquisitionPlayer.ownedStreamingPlatform.treasuryCash = 500_000_000_000;
const acquisitionTarget = normalizedPlatform('HULU', acquisitionPlayer);
acquisitionTarget.valuation = 1_000;
acquisitionTarget.ai!.standaloneValuationBillions = 1;
acquisitionPlayer.world.platforms!.HULU = acquisitionTarget;
acquisitionPlayer.ownedStreamingPlatform = commitStreamingCompetitiveWorldWeek(
    acquisitionPlayer.ownedStreamingPlatform,
    acquisitionPlayer,
    ABSOLUTE_WEEK,
);
const scouted = scoutStreamingAcquisitionTarget(acquisitionPlayer, 'HULU');
assert.ok(scouted.changed && scouted.caseId);
const valued = valueStreamingAcquisitionTarget(scouted.player, scouted.caseId!);
assert.equal(valued.changed, true);
const valuedCase = valued.player.ownedStreamingPlatform.corporateDevelopment.acquisitionCases.find(item => item.id === scouted.caseId)!;
assert.ok(valuedCase.valuation);
assert.ok(
    valuedCase.valuation!.standaloneValue < 50_000_000_000,
    'Acquisition value should use the 1B standalone history instead of the stale 1T display value',
);

// Five-platform 10-year soak: finite state, bounded history, deterministic reserves.
for (const platformId of Object.keys(PLATFORM_AI_PROFILES) as PlatformId[]) {
    let platform = normalizedPlatform(platformId);
    for (let offset = 1; offset <= 520; offset += 1) {
        const result = settlePlatformAiEconomy({
            player: fixture,
            platform,
            absoluteWeek: ABSOLUTE_WEEK + offset,
        });
        platform = result.platform;
        assert.ok(Number.isFinite(platform.cashReserve) && platform.cashReserve >= 0, `${platformId} cash must remain finite and non-negative`);
        assert.ok(Number.isFinite(platform.ai!.debtMillions) && platform.ai!.debtMillions >= 0, `${platformId} debt must remain finite and non-negative`);
        assert.ok(Number.isFinite(platform.valuation) && platform.valuation >= 0, `${platformId} valuation must remain finite and non-negative`);
        assert.ok(Number.isFinite(platform.ai!.standaloneValuationBillions) && platform.ai!.standaloneValuationBillions >= 0);
        assert.ok(platform.ai!.financeHistory.length <= 104, `${platformId} finance history must remain bounded`);
        const snapshot = platform.ai!.financeHistory.at(-1);
        if (snapshot) {
            closeTo(
                snapshot.openingCashMillions
                    + snapshot.subscriptionRevenueMillions
                    + snapshot.advertisingRevenueMillions
                    + snapshot.verifiedContractIncomeMillions
                    + snapshot.rescueIncomeMillions
                    - snapshot.mandatoryCostMillions
                    - snapshot.settledObligationCostMillions
                    - snapshot.financingCostMillions
                    - snapshot.reserveAllocationMillions,
                snapshot.closingCashMillions,
                `${platformId} week ${snapshot.absoluteWeek} must reconcile every exact cash line item`,
            );
            for (const value of Object.values(snapshot)) {
                if (typeof value === 'number') assert.ok(Number.isFinite(value), `${platformId} snapshot numbers must remain finite`);
            }
        }
    }
}

// Phase 5 behavior regressions. Each expectation is hand-derived from the fixture values below.
const canonicalMarketPlatform = normalizedPlatform('HULU');
canonicalMarketPlatform.subscribers = 0;
canonicalMarketPlatform.cashReserve = 500;
canonicalMarketPlatform.ai!.financeHistory = [];
canonicalMarketPlatform.ai!.researchQueue = [];
canonicalMarketPlatform.ai!.marketOperations = [{
    ...activeMarket,
    id: 'economy-canonical-us',
    idempotencyKey: 'economy-canonical-us',
    scopeId: 'US',
    countryId: 'US',
    regionId: 'NORTH_AMERICA',
    status: 'ACTIVE',
}];
canonicalMarketPlatform.ai!.capabilities.activeCountryIds = ['US'];
const canonicalMarketSnapshot = calculatePlatformAiWeeklyEconomy({
    player: fixture,
    platform: canonicalMarketPlatform,
    absoluteWeek: ABSOLUTE_WEEK + 30,
}).snapshot!;
assert.equal(
    canonicalMarketSnapshot.baseOperationsCostMillions,
    70,
    'Canonical ACTIVE market operations must replace the region fallback instead of double-charging it.',
);
assert.equal(canonicalMarketSnapshot.marketOperatingCostMillions, 1.08, 'The canonical US weekly market operation must be charged exactly once.');

const fallbackRegionPlatform = normalizedPlatform('HULU');
fallbackRegionPlatform.subscribers = 0;
fallbackRegionPlatform.ai!.financeHistory = [];
fallbackRegionPlatform.ai!.researchQueue = [];
fallbackRegionPlatform.ai!.marketOperations = [];
fallbackRegionPlatform.ai!.capabilities.activeCountryIds = [];
(fallbackRegionPlatform.ai!.capabilities as unknown as { activeRegionIds: string[] }).activeRegionIds = ['NORTH_AMERICA', 'ASIA'];
const fallbackRegionSnapshot = calculatePlatformAiWeeklyEconomy({
    player: fixture,
    platform: fallbackRegionPlatform,
    absoluteWeek: ABSOLUTE_WEEK + 31,
}).snapshot!;
assert.equal(
    fallbackRegionSnapshot.baseOperationsCostMillions,
    73.6,
    'With zero canonical market operations, two legacy regions must use the 70M + 2 × 1.8M fallback.',
);

const baseRightsContract = rightsCommit.world.platforms!.NETFLIX.ai!.rightsContracts[0];
assert.ok(baseRightsContract, 'The real rights commitment must provide a contract fixture.');
const rightsSharePlatform = normalizedPlatform('HULU');
rightsSharePlatform.subscribers = 4.33;
rightsSharePlatform.cashReserve = 500;
rightsSharePlatform.ai!.financeHistory = [];
rightsSharePlatform.ai!.marketOperations = [];
rightsSharePlatform.ai!.capabilities.activeCountryIds = [];
rightsSharePlatform.ai!.researchQueue = [];
const licensedPlan = {
    ...rightsCommit.plan!,
    id: 'economy-share-licensed-plan',
    platformId: 'HULU' as const,
    status: 'RELEASED' as const,
    sourceProjectIds: ['economy-share-licensed'],
    rightsContractIds: ['economy-share-active'],
};
rightsSharePlatform.ai!.slate = [
    licensedPlan,
    ...['original-a', 'original-b', 'original-c'].map((id, index) => ({
        ...licensedPlan,
        id,
        source: 'COMMISSIONED_ORIGINAL' as const,
        sourceProjectIds: [`economy-share-original-${index}`],
        rightsContractIds: [],
    })),
    {
        ...licensedPlan,
        id: 'economy-share-catalogue',
        source: 'CATALOGUE_ACQUISITION' as const,
        sourceProjectIds: ['economy-share-catalogue-a', 'economy-share-catalogue-b'],
        rightsContractIds: ['economy-share-catalogue-a-contract', 'economy-share-catalogue-b-contract'],
    },
    {
        ...licensedPlan,
        id: 'economy-share-unreleased',
        status: 'CONTRACTED' as const,
        sourceProjectIds: ['economy-share-unreleased'],
        rightsContractIds: ['economy-share-unreleased-contract'],
    },
];
rightsSharePlatform.ai!.rightsContracts = [
    {
        ...baseRightsContract,
        id: 'economy-share-active',
        sourceProjectId: 'economy-share-licensed',
        buyerPlatformId: 'HULU',
        status: 'ACTIVE',
        origin: 'STUDIO_MARKET',
        startsAtAbsoluteWeek: ABSOLUTE_WEEK,
        expiresAtAbsoluteWeek: ABSOLUTE_WEEK + 100,
        platformRevenueShare: 70,
        licensorRevenueShare: 30,
    },
    {
        ...baseRightsContract,
        id: 'economy-share-duplicate',
        sourceProjectId: 'economy-share-licensed',
        buyerPlatformId: 'HULU',
        status: 'ACTIVE',
        origin: 'STUDIO_MARKET',
        startsAtAbsoluteWeek: ABSOLUTE_WEEK,
        expiresAtAbsoluteWeek: ABSOLUTE_WEEK + 100,
        platformRevenueShare: 10,
        licensorRevenueShare: 90,
    },
    {
        ...baseRightsContract,
        id: 'economy-share-inactive',
        sourceProjectId: 'economy-share-inactive',
        buyerPlatformId: 'HULU',
        status: 'TERMINATED',
        startsAtAbsoluteWeek: ABSOLUTE_WEEK,
        expiresAtAbsoluteWeek: ABSOLUTE_WEEK + 100,
        platformRevenueShare: 10,
        licensorRevenueShare: 90,
    },
    {
        ...baseRightsContract,
        id: 'economy-share-expired',
        sourceProjectId: 'economy-share-expired',
        buyerPlatformId: 'HULU',
        status: 'ACTIVE',
        startsAtAbsoluteWeek: ABSOLUTE_WEEK - 100,
        expiresAtAbsoluteWeek: ABSOLUTE_WEEK + 29,
        platformRevenueShare: 10,
        licensorRevenueShare: 90,
    },
    {
        ...baseRightsContract,
        id: 'economy-share-owned-original',
        sourceProjectId: 'economy-share-original-0',
        buyerPlatformId: 'HULU',
        status: 'ACTIVE',
        origin: 'OWNED_STUDIO_TRANSFER',
        permanentPurchase: true,
        startsAtAbsoluteWeek: ABSOLUTE_WEEK,
        expiresAtAbsoluteWeek: Number.MAX_SAFE_INTEGER,
        platformRevenueShare: 10,
        licensorRevenueShare: 90,
    },
    ...['a', 'b'].map(suffix => ({
        ...baseRightsContract,
        id: `economy-share-catalogue-${suffix}-contract`,
        sourceProjectId: `economy-share-catalogue-${suffix}`,
        buyerPlatformId: 'HULU' as const,
        status: 'ACTIVE' as const,
        origin: 'CATALOGUE_ACQUISITION' as const,
        permanentPurchase: true,
        startsAtAbsoluteWeek: ABSOLUTE_WEEK,
        expiresAtAbsoluteWeek: Number.MAX_SAFE_INTEGER,
        platformRevenueShare: 100,
        licensorRevenueShare: 0,
    })),
    {
        ...baseRightsContract,
        id: 'economy-share-unreleased-contract',
        sourceProjectId: 'economy-share-unreleased',
        buyerPlatformId: 'HULU',
        status: 'ACTIVE',
        origin: 'STUDIO_MARKET',
        startsAtAbsoluteWeek: ABSOLUTE_WEEK,
        expiresAtAbsoluteWeek: ABSOLUTE_WEEK + 100,
        platformRevenueShare: 10,
        licensorRevenueShare: 90,
    },
];
const rightsShareSnapshot = calculatePlatformAiWeeklyEconomy({
    player: fixture,
    platform: rightsSharePlatform,
    absoluteWeek: ABSOLUTE_WEEK + 30,
}).snapshot! as unknown as Record<string, unknown>;
assert.equal(
    rightsShareSnapshot.partnerRevenueShareCostMillions,
    0.6,
    'One released revenue-share licence among six released titles must pay 12M × 30% × 1/6; both catalogue projects count and the unreleased contract counts zero.',
);

const technologyCostPlatform = normalizedPlatform('HULU');
technologyCostPlatform.subscribers = 0;
technologyCostPlatform.ai!.financeHistory = [];
technologyCostPlatform.ai!.marketOperations = [];
technologyCostPlatform.ai!.capabilities.activeCountryIds = [];
technologyCostPlatform.ai!.researchQueue = [
    {
        ...operatingResearch(),
        technologyWeeklyOperatingCostMillions: 3,
    } as PlatformAiResearchItem,
    {
        ...operatingResearch({
            id: 'economy-technology-not-operating',
            idempotencyKey: 'economy-technology-not-operating',
            stage: 'INSTALLING',
            researchWeeklyOperatingCostMillions: 100,
            licenseWeeklyCostMillions: 100,
        }),
        technologyWeeklyOperatingCostMillions: 100,
    } as PlatformAiResearchItem,
];
const technologyCostSnapshot = calculatePlatformAiWeeklyEconomy({
    player: fixture,
    platform: technologyCostPlatform,
    absoluteWeek: ABSOLUTE_WEEK + 32,
}).snapshot! as unknown as Record<string, unknown>;
assert.equal(technologyCostSnapshot.researchCostMillions, 2.5, 'Operating research and licence recurring cost must total 2.5M once.');
assert.equal(technologyCostSnapshot.technologyCostMillions, 3, 'Only the OPERATING technology cost must persist and recur.');
assert.equal(technologyCostSnapshot.mandatoryCostAccruedMillions, 71.3, 'Hulu must pay 65.8M efficient internal COGS plus 2.5M research/licence and 3M technology exactly once.');

const earmarkPlatform = normalizedPlatform('HULU');
earmarkPlatform.subscribers = 0;
earmarkPlatform.cashReserve = 5_000;
earmarkPlatform.ai!.financeHistory = [];
earmarkPlatform.ai!.marketOperations = [];
earmarkPlatform.ai!.capabilities.activeCountryIds = [];
earmarkPlatform.ai!.debtMillions = 10;
earmarkPlatform.ai!.slate = [{
    ...licensedPlan,
    id: 'economy-approved-content',
    source: 'COMMISSIONED_ORIGINAL',
    status: 'GREENLIT',
    productionFundingMillions: 100,
    paidSpendMillions: 20,
    rightsCostMillions: 0,
    minimumGuaranteeMillions: 0,
    rightsContractIds: [],
}];
earmarkPlatform.ai!.researchQueue = [operatingResearch({
    id: 'economy-approved-research',
    idempotencyKey: 'economy-approved-research',
    stage: 'RESEARCHING',
    researchWeeklyOperatingCostMillions: 0,
    licenseWeeklyCostMillions: 0,
})];
const earmarkResult = settlePlatformAiEconomy({
    player: fixture,
    platform: earmarkPlatform,
    absoluteWeek: ABSOLUTE_WEEK + 33,
});
assert.deepEqual(
    earmarkResult.snapshot!.allocations.map(allocation => [allocation.type, allocation.amountMillions, allocation.referenceId]),
    [
        ['DEBT_REDUCTION', 10, null],
        ['APPROVED_CONTENT', 80, 'economy-approved-content'],
        ['APPROVED_RESEARCH', 14, 'economy-approved-research'],
        ['SHAREHOLDER_DISTRIBUTION', 1_622.44, null],
    ],
    'Debt must be paid first, then 80M content and 14M research earmarks protected, before true excess is distributed.',
);
assert.equal(earmarkResult.snapshot!.reserveAllocationMillions, 1_632.44, 'Only debt repayment and true distribution may leave cash.');
assert.equal(earmarkResult.snapshot!.closingCashMillions, 3_301.75, 'The 94M future milestone earmark must remain funded above the efficient 3,207.75M reserve ceiling.');
closeTo(
    earmarkResult.snapshot!.openingCashMillions
        + earmarkResult.snapshot!.subscriptionRevenueMillions
        + earmarkResult.snapshot!.advertisingRevenueMillions
        + earmarkResult.snapshot!.verifiedContractIncomeMillions
        + earmarkResult.snapshot!.rescueIncomeMillions
        - earmarkResult.snapshot!.mandatoryCostMillions
        - earmarkResult.snapshot!.settledObligationCostMillions
        - earmarkResult.snapshot!.financingCostMillions
        - earmarkResult.snapshot!.reserveAllocationMillions,
    3_301.75,
    'Earmarked closing cash must still reconcile exactly.',
);

const blockedSourcingWorld = structuredClone(rightsWorld);
blockedSourcingWorld.platforms!.NETFLIX.ai!.status = 'RESTRUCTURING';
assert.deepEqual(
    buildPlatformContentCandidates({ player: fixture, world: blockedSourcingWorld, platformId: 'NETFLIX', absoluteWeek: ABSOLUTE_WEEK + 34 }),
    [],
    'Content candidate building must stop unless the company status is ACTIVE.',
);
assert.equal(
    choosePlatformContentCandidate({
        player: fixture,
        platformId: 'NETFLIX',
        absoluteWeek: ABSOLUTE_WEEK + 34,
        strategyCycle: 1,
        strategySkill: 9,
        candidates: [rightsCandidate!],
        platform: blockedSourcingWorld.platforms!.NETFLIX,
    } as Parameters<typeof choosePlatformContentCandidate>[0]),
    null,
    'Content choice must stop unless the company status is ACTIVE.',
);
const blockedCommit = commitPlatformContentCandidate({
    player: fixture,
    world: blockedSourcingWorld,
    platformId: 'NETFLIX',
    absoluteWeek: ABSOLUTE_WEEK + 34,
    candidate: rightsCandidate!,
});
assert.equal(blockedCommit.changed, false, 'A non-ACTIVE company must not commit content.');
assert.equal(blockedCommit.reason, 'PLATFORM_NOT_ACTIVE');

const covenantBlockedSourcingWorld = structuredClone(rightsWorld);
covenantBlockedSourcingWorld.platforms!.NETFLIX.ai!.spendingRestrictions = {
    source: 'EXTERNAL_RECAPITALIZATION',
    blocksNewBids: true,
    blocksNewGreenlights: true,
    blocksNewResearch: true,
    blocksExpansion: true,
    expiresAtAbsoluteWeek: ABSOLUTE_WEEK + 50,
};
assert.deepEqual(
    buildPlatformContentCandidates({
        player: fixture,
        world: covenantBlockedSourcingWorld,
        platformId: 'NETFLIX',
        absoluteWeek: ABSOLUTE_WEEK + 34,
    }),
    [],
    'Funding covenants must block fresh content sourcing while preserving already committed projects.',
);
assert.equal(
    choosePlatformContentCandidate({
        player: fixture,
        platformId: 'NETFLIX',
        absoluteWeek: ABSOLUTE_WEEK + 34,
        strategyCycle: 1,
        strategySkill: 9,
        candidates: [rightsCandidate!],
        platform: covenantBlockedSourcingWorld.platforms!.NETFLIX,
    }),
    null,
    'Funding covenants must block a new greenlight choice.',
);
assert.equal(commitPlatformContentCandidate({
    player: fixture,
    world: covenantBlockedSourcingWorld,
    platformId: 'NETFLIX',
    absoluteWeek: ABSOLUTE_WEEK + 34,
    candidate: rightsCandidate!,
}).changed, false, 'Funding covenants must block direct content commits.');

const healthyRecoveryPlatform = normalizedPlatform('APPLE_TV');
healthyRecoveryPlatform.subscribers = 1_000;
healthyRecoveryPlatform.cashReserve = 10_000;
healthyRecoveryPlatform.ai!.status = 'RESTRUCTURING';
healthyRecoveryPlatform.ai!.debtMillions = 0;
healthyRecoveryPlatform.ai!.financeHistory = [];
healthyRecoveryPlatform.ai!.marketOperations = [];
healthyRecoveryPlatform.ai!.capabilities.activeCountryIds = [];
healthyRecoveryPlatform.ai!.researchQueue = [];
healthyRecoveryPlatform.ai!.decisionHistory = [{
    id: 'economy-health-restructure',
    absoluteWeek: ABSOLUTE_WEEK,
    type: 'DISTRESS_RESPONSE',
    action: 'RESTRUCTURE',
    summary: 'RESTRUCTURE',
    reason: 'Fixture entered restructuring.',
    cashImpactMillions: 0,
}];
let healthyRecoveryResult = healthyRecoveryPlatform;
for (let week = 1; week <= 4; week += 1) {
    healthyRecoveryResult = settlePlatformAiEconomy({
        player: fixture,
        platform: healthyRecoveryResult,
        absoluteWeek: ABSOLUTE_WEEK + 40 + week,
    }).platform;
    assert.equal(
        healthyRecoveryResult.ai!.healthyOperatingWeeks,
        week === 4 ? 0 : week,
        `A distinct healthy week may increment recovery exactly once (week ${week}).`,
    );
    assert.equal(
        healthyRecoveryResult.ai!.status,
        week === 4 ? 'ACTIVE' : 'RESTRUCTURING',
        'Recovery must require four distinct settled weeks.',
    );
}
assert.equal(healthyRecoveryResult.ai!.status, 'ACTIVE', 'Four sustained healthy weeks must recover a restructuring platform to ACTIVE.');

const rescueFormulaPlatform = (platformId: PlatformId, cashReserve: number, debtMillions: number): PlatformState => {
    const platform = normalizedPlatform(platformId);
    platform.cashReserve = cashReserve;
    platform.ai!.status = 'RESTRUCTURING';
    platform.ai!.debtMillions = debtMillions;
    platform.ai!.financeHistory = [{
        ...rescueCandidate.ai!.financeHistory[0],
        closingCashMillions: cashReserve,
        closingDebtMillions: debtMillions,
    }];
    platform.ai!.decisionHistory = precedingActions.map((action, index) => ({
        id: `economy-formula-${platformId}-${action}`,
        absoluteWeek: ABSOLUTE_WEEK - 10 + index,
        type: 'DISTRESS_RESPONSE',
        action,
        summary: action,
        reason: action,
        cashImpactMillions: 0,
    }));
    return platform;
};
assert.equal(calculatePlatformAiRescueCapMillions({ player: fixture, platform: rescueFormulaPlatform('HULU', 0, 100) }), 650, 'LIMITED backing must apply 0.5 × the 1,300M operating-scale cap.');
assert.equal(calculatePlatformAiRescueCapMillions({ player: fixture, platform: rescueFormulaPlatform('APPLE_TV', 0, 100) }), 1_300, 'STRONG backing must apply the full 1,300M operating-scale cap.');
assert.equal(calculatePlatformAiRescueCapMillions({ player: fixture, platform: rescueFormulaPlatform('NETFLIX', 0, 100) }), 0, 'NONE backing must always produce a zero rescue.');
const debtNeedRescue = rescueFormulaPlatform('APPLE_TV', 3_890, 100);
assert.equal(calculatePlatformAiRescueCapMillions({ player: fixture, platform: debtNeedRescue }), 110, 'Rescue need must include 100M debt plus the 10M shortfall to 50% of target reserve.');
const cooldownRescue = rescueFormulaPlatform('APPLE_TV', 0, 100);
cooldownRescue.ai!.lastRescueAbsoluteWeek = ABSOLUTE_WEEK - 103;
assert.equal(calculatePlatformAiRescueCapMillions({ player: fixture, platform: cooldownRescue }), 0, 'A rescue inside the 104-week cooldown must have zero eligibility.');

const fakeLicencePlatform = normalizedPlatform('NETFLIX');
fakeLicencePlatform.ai!.status = 'DISTRESSED';
fakeLicencePlatform.ai!.debtMillions = 100;
fakeLicencePlatform.ai!.marketOperations = [];
fakeLicencePlatform.ai!.capabilities.activeCountryIds = [];
fakeLicencePlatform.ai!.slate = [];
fakeLicencePlatform.ai!.rightsContracts = [baseRightsContract];
fakeLicencePlatform.ai!.decisionHistory = precedingActions.slice(0, 3).map((action, index) => ({
    id: `economy-real-action-${action}`,
    absoluteWeek: ABSOLUTE_WEEK - 10 + index,
    type: 'DISTRESS_RESPONSE',
    action,
    summary: action,
    reason: action,
    cashImpactMillions: 0,
}));
const fakeLicenceResult = resolvePlatformAiDistress({ player: fixture, platform: fakeLicencePlatform, absoluteWeek: ABSOLUTE_WEEK + 60 });
assert.notEqual(fakeLicenceResult.action, 'LICENSE_CATALOGUE', 'Distress must not record a catalogue licence without a persisted real deal.');

const expenseClassPlatform = normalizedPlatform('HULU');
expenseClassPlatform.subscribers = 0;
expenseClassPlatform.cashReserve = 0;
expenseClassPlatform.ai!.debtMillions = 0;
expenseClassPlatform.ai!.financeHistory = [];
expenseClassPlatform.ai!.marketOperations = [];
expenseClassPlatform.ai!.capabilities.activeCountryIds = [];
expenseClassPlatform.ai!.researchQueue = [];
const expenseClassResult = settlePlatformAiEconomy({
    player: fixture,
    platform: expenseClassPlatform,
    absoluteWeek: ABSOLUTE_WEEK + 70,
    settledObligationCostMillions: 20,
    localizationCostMillions: 30,
    discretionaryCostMillions: 10,
} as Parameters<typeof settlePlatformAiEconomy>[0]);
assert.equal(expenseClassResult.snapshot!.operatingCostMillions, 65.8, 'One-time contractual, localization, and discretionary costs must not enter the efficient trailing operating reserve.');
assert.equal(expenseClassResult.snapshot!.debtIncurredMillions, 65.8, 'Only the exact efficient recurring mandatory shortfall may create debt.');
assert.deepEqual(
    (expenseClassResult.snapshot! as unknown as Record<string, unknown>).heldObligations,
    [
        { expenseClass: 'CONTRACTUAL', amountMillions: 20, status: 'ON_HOLD' },
        { expenseClass: 'LOCALIZATION', amountMillions: 30, status: 'ON_HOLD' },
        { expenseClass: 'DISCRETIONARY', amountMillions: 10, status: 'ON_HOLD' },
    ],
    'Every unfunded one-time expense must persist as ON_HOLD without becoming debt.',
);

const youtubeExactValuationPlatform = normalizedPlatform('YOUTUBE');
youtubeExactValuationPlatform.subscribers = 100;
youtubeExactValuationPlatform.valuation = 0;
youtubeExactValuationPlatform.ai!.standaloneValuationBillions = 10;
youtubeExactValuationPlatform.ai!.debtMillions = 0;
youtubeExactValuationPlatform.ai!.releaseMemory = [];
youtubeExactValuationPlatform.ai!.rightsContracts = [];
youtubeExactValuationPlatform.ai!.capabilities.technologyLevels = Object.fromEntries(
    Object.keys(youtubeExactValuationPlatform.ai!.capabilities.technologyLevels).map(key => [key, 0]),
) as typeof youtubeExactValuationPlatform.ai.capabilities.technologyLevels;
youtubeExactValuationPlatform.ai!.financeHistory = [{
    ...rescueCandidate.ai!.financeHistory[0],
    subscriptionRevenueMillions: 50,
    advertisingRevenueMillions: 50,
    revenueMillions: 100,
    mandatoryCostAccruedMillions: 50,
    mandatoryCostMillions: 50,
    operatingCostMillions: 50,
    operatingNetCashFlowMillions: 50,
}];
assert.equal(
    calculatePlatformAiValuationBillions({ player: fixture, platform: youtubeExactValuationPlatform }),
    10.561,
    'YouTube valuation must smooth 85% of 10B with 15% of 13.74B, using only 4M paid subscribers.',
);
const youtubeFullAudienceEconomy = calculatePlatformAiWeeklyEconomy({
    player: fixture,
    platform: { ...youtubeExactValuationPlatform, subscribers: 10 },
    absoluteWeek: ABSOLUTE_WEEK + 71,
}).snapshot!;
assert.equal(youtubeFullAudienceEconomy.advertisingRevenueMillions, 4.576, 'YouTube ads must monetize the full 10M audience: 10 × 88% × 0.52 = 4.576M.');

// Recovery counts processed weeks, never repeated calls for the same week.
const distinctRecoveryPlatform = normalizedPlatform('APPLE_TV');
distinctRecoveryPlatform.subscribers = 1_000;
distinctRecoveryPlatform.cashReserve = 10_000;
distinctRecoveryPlatform.ai!.status = 'RESTRUCTURING';
distinctRecoveryPlatform.ai!.debtMillions = 0;
distinctRecoveryPlatform.ai!.financeHistory = [];
distinctRecoveryPlatform.ai!.marketOperations = [];
distinctRecoveryPlatform.ai!.capabilities.activeCountryIds = [];
distinctRecoveryPlatform.ai!.researchQueue = [];
distinctRecoveryPlatform.ai!.decisionHistory = [];
const distinctRecoveryWeekOne = settlePlatformAiEconomy({ player: fixture, platform: distinctRecoveryPlatform, absoluteWeek: ABSOLUTE_WEEK + 76 });
const repeatedRecoveryWeek = settlePlatformAiEconomy({ player: fixture, platform: distinctRecoveryWeekOne.platform, absoluteWeek: ABSOLUTE_WEEK + 76 });
assert.equal(repeatedRecoveryWeek.platform.ai!.healthyOperatingWeeks, 1);
assert.deepEqual(repeatedRecoveryWeek.platform, distinctRecoveryWeekOne.platform, 'A repeated processed week must not increment recovery.');
const distinctRecoveryWeekTwo = settlePlatformAiEconomy({ player: fixture, platform: repeatedRecoveryWeek.platform, absoluteWeek: ABSOLUTE_WEEK + 77 });
assert.equal(distinctRecoveryWeekTwo.platform.ai!.healthyOperatingWeeks, 2, 'The next distinct healthy week increments recovery once.');

// Rights share counts every released catalogue project, but never pre-release plans.
const releasedRightsPlatform = normalizedPlatform('HULU');
releasedRightsPlatform.subscribers = 4.33;
releasedRightsPlatform.ai!.financeHistory = [];
releasedRightsPlatform.ai!.marketOperations = [];
releasedRightsPlatform.ai!.capabilities.activeCountryIds = [];
releasedRightsPlatform.ai!.researchQueue = [];
releasedRightsPlatform.ai!.slate = [
    { ...licensedPlan, id: 'released-catalogue', status: 'RELEASED', source: 'CATALOGUE_ACQUISITION', sourceProjectIds: ['released-a', 'released-b'] },
    { ...licensedPlan, id: 'released-original', status: 'RELEASED', source: 'COMMISSIONED_ORIGINAL', sourceProjectIds: ['released-original'] },
    { ...licensedPlan, id: 'pre-release-right', status: 'RIGHTS_READY', sourceProjectIds: ['pre-release'] },
];
releasedRightsPlatform.ai!.rightsContracts = [
    { ...baseRightsContract, id: 'released-a-contract', sourceProjectId: 'released-a', buyerPlatformId: 'HULU', status: 'ACTIVE', startsAtAbsoluteWeek: ABSOLUTE_WEEK, expiresAtAbsoluteWeek: ABSOLUTE_WEEK + 200, licensorRevenueShare: 30, platformRevenueShare: 70 },
    { ...baseRightsContract, id: 'released-b-contract', sourceProjectId: 'released-b', buyerPlatformId: 'HULU', status: 'ACTIVE', startsAtAbsoluteWeek: ABSOLUTE_WEEK, expiresAtAbsoluteWeek: ABSOLUTE_WEEK + 200, licensorRevenueShare: 30, platformRevenueShare: 70 },
    { ...baseRightsContract, id: 'pre-release-contract', sourceProjectId: 'pre-release', buyerPlatformId: 'HULU', status: 'ACTIVE', startsAtAbsoluteWeek: ABSOLUTE_WEEK, expiresAtAbsoluteWeek: ABSOLUTE_WEEK + 200, licensorRevenueShare: 90, platformRevenueShare: 10 },
];
const releasedRightsSnapshot = calculatePlatformAiWeeklyEconomy({
    player: fixture,
    platform: releasedRightsPlatform,
    absoluteWeek: ABSOLUTE_WEEK + 78,
}).snapshot!;
assert.equal(releasedRightsSnapshot.subscriptionRevenueMillions, 12);
assert.equal(releasedRightsSnapshot.partnerRevenueShareCostMillions, 1.62, 'Two licensed projects across a three-project released catalogue pay 12M × 30% × 45%.');

// One-time obligations persist with stable IDs, settle once when cash arrives, and never create debt.
const pendingPlatform = normalizedPlatform('HULU');
pendingPlatform.subscribers = 0;
pendingPlatform.cashReserve = 0;
pendingPlatform.ai!.financeHistory = [];
pendingPlatform.ai!.marketOperations = [];
pendingPlatform.ai!.capabilities.activeCountryIds = [];
pendingPlatform.ai!.researchQueue = [];
const pendingWeekOne = settlePlatformAiEconomy({
    player: fixture,
    platform: pendingPlatform,
    absoluteWeek: ABSOLUTE_WEEK + 79,
    settledObligationCostMillions: 20,
    localizationCostMillions: 30,
    discretionaryCostMillions: 10,
});
const pendingWeekOneQueue = (pendingWeekOne.platform.ai! as unknown as { pendingOneTimeObligations: Array<Record<string, unknown>> }).pendingOneTimeObligations;
assert.equal(pendingWeekOneQueue.length, 3);
assert.deepEqual(pendingWeekOneQueue.map(item => [item.category, item.amountMillions, item.createdWeek, item.status]), [
    ['CONTRACTUAL', 20, ABSOLUTE_WEEK + 79, 'HELD'],
    ['LOCALIZATION', 30, ABSOLUTE_WEEK + 79, 'HELD'],
    ['DISCRETIONARY', 10, ABSOLUTE_WEEK + 79, 'HELD'],
]);
assert.equal(new Set(pendingWeekOneQueue.map(item => item.id)).size, 3, 'Each queued obligation has a stable distinct ID.');
assert.equal(pendingWeekOne.snapshot!.debtIncurredMillions, 65.8, 'Only efficient recurring operations create debt.');
const pendingHeldAgain = settlePlatformAiEconomy({ player: fixture, platform: pendingWeekOne.platform, absoluteWeek: ABSOLUTE_WEEK + 80 });
assert.deepEqual(
    (pendingHeldAgain.platform.ai! as unknown as { pendingOneTimeObligations: unknown[] }).pendingOneTimeObligations,
    pendingWeekOneQueue,
    'Unfunded obligations remain held without duplicate enqueue.',
);
const fundedPendingPlatform = { ...pendingHeldAgain.platform, cashReserve: 1_000 };
const pendingSettled = settlePlatformAiEconomy({ player: fixture, platform: fundedPendingPlatform, absoluteWeek: ABSOLUTE_WEEK + 81 });
const settledQueue = (pendingSettled.platform.ai! as unknown as { pendingOneTimeObligations: Array<Record<string, unknown>> }).pendingOneTimeObligations;
assert.ok(settledQueue.every(item => item.status === 'SETTLED'));
assert.equal(pendingSettled.snapshot!.settledObligationCostMillions, 60);
assert.equal(pendingSettled.snapshot!.debtIncurredMillions, 0, 'Settling queued one-time expenses cannot create new debt.');
const pendingNoReplay = settlePlatformAiEconomy({ player: fixture, platform: pendingSettled.platform, absoluteWeek: ABSOLUTE_WEEK + 82 });
assert.equal(pendingNoReplay.snapshot!.settledObligationCostMillions, 0, 'Settled obligations never replay.');
const obligationArchivePlatform = normalizedPlatform('HULU');
obligationArchivePlatform.ai!.pendingOneTimeObligations = [
    ...Array.from({ length: 120 }, (_, index) => ({
        id: `archived-obligation-${index}`,
        category: 'CONTRACTUAL' as const,
        amountMillions: 1,
        createdWeek: index,
        status: 'SETTLED' as const,
        settledWeek: index + 1,
    })),
    { id: 'still-held-obligation', category: 'LOCALIZATION' as const, amountMillions: 5, createdWeek: 1, status: 'HELD' as const, settledWeek: null },
] satisfies PlatformAiPendingOneTimeObligation[];
const normalizedObligationArchive = normalizePlatformAiState(obligationArchivePlatform, fixture.id, ABSOLUTE_WEEK + 83);
const normalizedObligations = (normalizedObligationArchive.ai! as unknown as { pendingOneTimeObligations: Array<Record<string, unknown>> }).pendingOneTimeObligations;
assert.equal(normalizedObligations.length, 104, 'Pending obligation history is bounded.');
assert.ok(normalizedObligations.some(item => item.id === 'still-held-obligation'), 'Normalization never archives an unsettled obligation.');
assert.equal(normalizedObligations.at(-1)?.id, 'archived-obligation-119', 'The newest settled obligation remains in the bounded archive.');

// Every decision writer shares one bounded append contract: dedupe, newest 40, stable order.
const appendPlatformAiDecisions = (platformAiStateModule as unknown as {
    appendPlatformAiDecisions?: (history: PlatformState['ai'] extends infer _ ? any[] : never, decisions: any[]) => any[];
}).appendPlatformAiDecisions;
assert.equal(typeof appendPlatformAiDecisions, 'function', 'Platform AI must export one shared bounded decision append helper.');
const hundredDecisions = Array.from({ length: 100 }, (_, index) => ({
    id: `bounded-decision-${index}`,
    absoluteWeek: index,
    type: 'BOUNDED_AUDIT',
    summary: `Decision ${index}`,
    reason: 'Fixture',
    cashImpactMillions: 0,
}));
const boundedDecisions = appendPlatformAiDecisions!(hundredDecisions, [{
    id: 'bounded-decision-new', absoluteWeek: 100, type: 'BOUNDED_AUDIT', summary: 'New', reason: 'Fixture', cashImpactMillions: 0,
}]);
assert.equal(boundedDecisions.length, 40);
assert.equal(boundedDecisions[0].id, 'bounded-decision-61');
assert.equal(boundedDecisions.at(-1)?.id, 'bounded-decision-new');

const legacyDecisionPlatform = normalizedPlatform('HULU');
legacyDecisionPlatform.ai!.decisionHistory = Array.from({ length: 100 }, (_, index) => ({
    id: `economy-legacy-decision-${index}`,
    absoluteWeek: index,
    type: 'LEGACY_DECISION',
    summary: `Legacy ${index}`,
    reason: 'Legacy fixture.',
    cashImpactMillions: 0,
}));
const normalizedLegacyDecisionPlatform = normalizePlatformAiState(legacyDecisionPlatform, fixture.id, ABSOLUTE_WEEK + 80);
assert.equal(normalizedLegacyDecisionPlatform.ai!.decisionHistory.length, 40, 'A legacy 100-record decision history must normalize to 40.');
assert.equal(normalizedLegacyDecisionPlatform.ai!.decisionHistory[0].id, 'economy-legacy-decision-60');
const appendedDecisionPlatform = settlePlatformAiEconomy({
    player: fixture,
    platform: normalizedLegacyDecisionPlatform,
    absoluteWeek: ABSOLUTE_WEEK + 81,
}).platform;
assert.equal(appendedDecisionPlatform.ai!.decisionHistory.length, 40, 'Appending new economy decisions must retain the newest 40 records.');

console.log('Platform AI sustainable economy audit passed.');
