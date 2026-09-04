import assert from 'node:assert/strict';
import type {
    IndustryProject,
    PlatformAiContentPlan,
    PlatformAiDistressEpisode,
    PlatformAiExternalRecapitalization,
    PlatformId,
    PlatformState,
    Player,
    WorldState,
} from '../types';
import { PLATFORM_AI_RUNTIME_SCHEMA_VERSION } from '../types';
import {
    cancelPendingPlatformAiCatalogueDistressDealsForAcquisition,
    DISTRESS_STAGE_ORDER,
    progressPlatformAiDistressWorld,
} from '../services/platformAi/platformAiDistress';
import { settlePlatformAiEconomy } from '../services/platformAi/platformAiEconomy';
import {
    createStreamingLicenseContract,
    migrateStreamingRightsContractRegistry,
} from '../services/streamingRightsCore';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { migratePlayerSave } from '../services/saveMigration';
import { processPlatformAiWorldTurn } from '../services/platformAi/platformAiTurn';
import { settlePendingPlatformAiExternalCommitmentsForAcquisition } from '../services/platformAi/platformAiExternalCommitments';
import { getStreamingRivalMoveCostMillions } from '../services/streamingCompetitiveWorld';
import {
    appendPlatformAiExternalRecapitalizations,
    normalizePlatformAiState,
} from '../services/platformAi/platformAiState';
import { createPlatformAiFixture } from './helpers/platformAiFixture';
import {
    choosePlatformAiAdministrationOutcome,
    quotePlatformAiExternalRecapitalization,
} from '../services/platformAi/platformAiFinancing';

const START_WEEK = 3_000;
const closeTo = (actual: number, expected: number, message: string): void => {
    assert.ok(Math.abs(actual - expected) <= 0.000_001, `${message}: expected ${expected}, received ${actual}`);
};

const recapHistory = Array.from({ length: 16 }, (_, index): PlatformAiExternalRecapitalization => ({
    id: `recap-${index}`,
    idempotencyKey: `recap-${index}`,
    episodeId: `episode-${index}`,
    platformId: 'APPLE_TV',
    status: 'SETTLED',
    investorArchetype: 'MEDIA_GROUP',
    offeredMillions: 100 + index,
    settledMillions: 100 + index,
    arrearsReductionMillions: 0,
    debtReductionMillions: 100 + index,
    cashRemainderMillions: 0,
    dilutionPercent: 20,
    autonomyPenalty: 29.17,
    valuationConfidenceMultiplier: 0.8,
    offeredAtAbsoluteWeek: index,
    settledAtAbsoluteWeek: index,
    cooldownUntilAbsoluteWeek: index + 104,
    reason: 'Bounded recapitalization history audit.',
}));
const newestRecap: PlatformAiExternalRecapitalization = {
    ...recapHistory[0],
    id: 'recap-newest',
    idempotencyKey: 'recap-newest',
    episodeId: 'episode-newest',
    offeredAtAbsoluteWeek: 100,
    settledAtAbsoluteWeek: 100,
    cooldownUntilAbsoluteWeek: 204,
};
const boundedRecapHistory = appendPlatformAiExternalRecapitalizations(
    recapHistory,
    [newestRecap],
    'APPLE_TV',
);
assert.equal(boundedRecapHistory.length, 16, 'Runtime recapitalization writes must enforce the persistence history bound.');
assert.equal(boundedRecapHistory[0].id, 'recap-1', 'The oldest recapitalization must be evicted first.');
assert.equal(boundedRecapHistory.at(-1)?.id, newestRecap.id, 'The newest recapitalization must survive compaction.');
assert.equal(boundedRecapHistory.at(-1)?.autonomyPenalty, 29.17, 'Recapitalization terms must survive runtime compaction exactly.');

const withPlatform = (
    world: WorldState,
    platformId: PlatformId,
    transform: (platform: PlatformState) => PlatformState,
): WorldState => ({
    ...world,
    platforms: {
        ...world.platforms!,
        [platformId]: transform(world.platforms![platformId]),
    },
});

const distressedFixture = (): Player => {
    const fixture = createPlatformAiFixture();
    const normalized = normalizePlatformAiState(
        fixture.world.platforms!.NETFLIX,
        fixture.id,
        START_WEEK,
    );
    const world = withPlatform(fixture.world, 'NETFLIX', () => ({
        ...normalized,
        cashReserve: 5,
        ai: {
            ...normalized.ai!,
            status: 'DISTRESSED',
            debtMillions: 40,
            slate: normalized.ai!.slate.filter(plan => ['RELEASED', 'CANCELLED'].includes(plan.status)),
            decisionHistory: [],
            financeHistory: normalized.ai!.financeHistory.map(snapshot => ({
                ...snapshot,
                closingCashMillions: 5,
                closingDebtMillions: 40,
                lossRunwayWeeks: 1,
                runwayWeeks: 1,
            })),
        },
    }));
    return { ...fixture, world };
};

assert.deepEqual(
    DISTRESS_STAGE_ORDER,
    [
        'FREEZE_GREENLIGHTS',
        'PAUSE_RESEARCH',
        'HOLD_COMMISSION',
        'LICENSE_CATALOGUE',
        'WITHDRAW_REGION',
        'RESTRUCTURE',
        'PARENT_RESCUE',
        'EXTERNAL_RECAPITALIZATION',
        'BANKRUPTCY_ADMINISTRATION',
        'DORMANT',
    ],
    'The durable episode must execute the disclosed distress ladder in order.',
);

const fixture = distressedFixture();
const opened = progressPlatformAiDistressWorld({
    player: fixture,
    world: fixture.world,
    absoluteWeek: START_WEEK,
});
const openedEpisode = opened.world.platforms!.NETFLIX.ai!.distressEpisodes[0];
assert.equal(openedEpisode.status, 'ACTIVE');
assert.equal(openedEpisode.currentStageIndex, 1);
assert.deepEqual(
    openedEpisode.stageResults.map(result => [result.stage, result.outcome, result.enteredAtAbsoluteWeek]),
    [['FREEZE_GREENLIGHTS', 'APPLIED', START_WEEK]],
    'Opening a crisis must persist the first applied stage.',
);

const replay = progressPlatformAiDistressWorld({
    player: { ...fixture, world: opened.world },
    world: opened.world,
    absoluteWeek: START_WEEK,
});
assert.deepEqual(replay.world, opened.world, 'Replaying the same distress week must be an exact no-op.');

const serializationTrapWorld = opened.world as WorldState & { toJSON?: () => never };
Object.defineProperty(serializationTrapWorld, 'toJSON', {
    configurable: true,
    enumerable: false,
    value: () => { throw new Error('whole-world serialization is forbidden in weekly distress progression'); },
});
assert.doesNotThrow(() => progressPlatformAiDistressWorld({
    player: { ...fixture, world: serializationTrapWorld },
    world: serializationTrapWorld,
    absoluteWeek: START_WEEK,
}));
delete serializationTrapWorld.toJSON;

const historyTruncatedWorld = withPlatform(opened.world, 'NETFLIX', platform => ({
    ...platform,
    ai: { ...platform.ai!, decisionHistory: [] },
}));
const paused = progressPlatformAiDistressWorld({
    player: { ...fixture, world: historyTruncatedWorld },
    world: historyTruncatedWorld,
    absoluteWeek: START_WEEK + 1,
});
assert.deepEqual(
    paused.world.platforms!.NETFLIX.ai!.distressEpisodes[0].stageResults.map(result => result.stage),
    ['FREEZE_GREENLIGHTS', 'PAUSE_RESEARCH'],
    'Presentation-history truncation must not reset the authoritative ladder.',
);

const unavailableHold = progressPlatformAiDistressWorld({
    player: { ...fixture, world: paused.world },
    world: paused.world,
    absoluteWeek: START_WEEK + 2,
});
const heldEpisode = unavailableHold.world.platforms!.NETFLIX.ai!.distressEpisodes[0];
assert.equal(heldEpisode.stageResults.at(-1)?.stage, 'HOLD_COMMISSION');
assert.equal(heldEpisode.stageResults.at(-1)?.outcome, 'UNAVAILABLE');
assert.equal(
    heldEpisode.currentStageIndex,
    2,
    'An unavailable stage must remain authoritative until a later week advances it.',
);

const advanced = progressPlatformAiDistressWorld({
    player: { ...fixture, world: unavailableHold.world },
    world: unavailableHold.world,
    absoluteWeek: START_WEEK + 3,
});
assert.equal(advanced.world.platforms!.NETFLIX.ai!.distressEpisodes[0].currentStageIndex, 3);
assert.equal(
    advanced.world.platforms!.NETFLIX.ai!.distressEpisodes[0].stageResults.length,
    heldEpisode.stageResults.length,
    'Advancing an unavailable stage must not process another stage in the same week.',
);

const pressurePlatform = structuredClone(advanced.world.platforms!.NETFLIX) as any;
pressurePlatform.ai.schemaVersion = 8;
pressurePlatform.ai.distressEpisodes = [
    ...Array.from({ length: 12 }, (_, index) => ({
        id: `completed-${index}`,
        platformId: 'NETFLIX',
        status: 'RECOVERED',
        startedAtAbsoluteWeek: 100 + index,
        completedAtAbsoluteWeek: 200 + index,
        currentStageIndex: 8,
        lastAdvancedAtAbsoluteWeek: 200 + index,
        stageResults: [],
    })),
    {
        id: 'active-pressure',
        platformId: 'NETFLIX',
        status: 'ACTIVE',
        startedAtAbsoluteWeek: 500,
        completedAtAbsoluteWeek: null,
        currentStageIndex: 2,
        lastAdvancedAtAbsoluteWeek: 501,
        stageResults: [],
    },
];
const pressureNormalized = normalizePlatformAiState(pressurePlatform, fixture.id, 600);
assert.equal(
    pressureNormalized.ai!.schemaVersion,
    PLATFORM_AI_RUNTIME_SCHEMA_VERSION,
    'Phase 5 finance state must normalize to the current canonical Platform AI schema.',
);
assert.deepEqual(
    (pressureNormalized.ai as any).externalRecapitalizations,
    [],
    'Legacy saves must receive a canonical empty recapitalization ledger.',
);
assert.equal(
    (pressureNormalized.ai as any).administration,
    null,
    'Legacy saves must receive an explicit empty administration state.',
);
assert.equal(pressureNormalized.ai!.distressEpisodes.length, 9, 'All active and only the latest eight completed episodes survive.');
assert.ok(pressureNormalized.ai!.distressEpisodes.some(episode => episode.id === 'active-pressure'));
assert.equal(
    pressureNormalized.ai!.distressEpisodes.find(episode => episode.id === 'active-pressure')?.currentStageIndex,
    0,
    'A malformed saved index cannot skip fixed distress-ladder stages that have no contiguous result.',
);
assert.deepEqual(
    pressureNormalized.ai!.distressEpisodes.filter(episode => episode.status === 'RECOVERED').map(episode => episode.id),
    Array.from({ length: 8 }, (_, index) => `completed-${index + 4}`),
    'Completed episode retention must be chronological and bounded.',
);

const financingWeek = START_WEEK + 50;
const financingPlatform = normalizePlatformAiState(
    structuredClone(fixture.world.platforms!.APPLE_TV),
    fixture.id,
    financingWeek,
);
financingPlatform.cashReserve = 0;
financingPlatform.subscribers = 50;
financingPlatform.reputation = 80;
financingPlatform.ai!.status = 'RESTRUCTURING';
financingPlatform.ai!.debtMillions = 500;
financingPlatform.ai!.restructuringFailedAtAbsoluteWeek = financingWeek - 1;
financingPlatform.ai!.financeHistory = Array.from({ length: 13 }, (_, index) => ({
    ...settlePlatformAiEconomy({
        player: fixture,
        platform: normalizePlatformAiState(structuredClone(fixture.world.platforms!.APPLE_TV), fixture.id, financingWeek - 20),
        absoluteWeek: financingWeek - 20,
    }).snapshot!,
    absoluteWeek: financingWeek - 13 + index,
    revenueMillions: 100,
    mandatoryCostAccruedMillions: 120,
    mandatoryCostMillions: 120,
    operatingCostMillions: 120,
    operatingNetCashFlowMillions: -20,
    closingCashMillions: 0,
    closingDebtMillions: 500,
    lossRunwayWeeks: 0,
    runwayWeeks: 0,
}));
const financingEpisode: PlatformAiDistressEpisode = {
    id: 'external-financing-episode',
    platformId: 'APPLE_TV',
    status: 'ACTIVE',
    startedAtAbsoluteWeek: financingWeek - 10,
    completedAtAbsoluteWeek: null,
    currentStageIndex: 7,
    lastAdvancedAtAbsoluteWeek: financingWeek - 1,
    stageResults: [],
};
const viableFundingQuote = quotePlatformAiExternalRecapitalization({
    player: fixture,
    platform: financingPlatform,
    episode: financingEpisode,
    absoluteWeek: financingWeek,
    competitivePressure: 0.6,
});
assert.equal(viableFundingQuote.eligible, true, 'A valuable restructured AI platform may receive a bounded outside funding offer.');
assert.ok(viableFundingQuote.amountMillions > 0 && viableFundingQuote.amountMillions <= 2_060, 'Outside funding must remain within debt plus a bounded reserve need.');
assert.deepEqual(
    viableFundingQuote,
    quotePlatformAiExternalRecapitalization({
        player: structuredClone(fixture),
        platform: structuredClone(financingPlatform),
        episode: structuredClone(financingEpisode),
        absoluteWeek: financingWeek,
        competitivePressure: 0.6,
    }),
    'The outside funding quote must be deterministic for the same canonical input.',
);
const playerOwnedFinancingFixture = structuredClone(fixture);
playerOwnedFinancingFixture.ownedStreamingPlatform.corporateDevelopment.acquiredPlatformIds = ['APPLE_TV'];
assert.equal(quotePlatformAiExternalRecapitalization({
    player: playerOwnedFinancingFixture,
    platform: financingPlatform,
    episode: financingEpisode,
    absoluteWeek: financingWeek,
    competitivePressure: 1,
}).eligible, false, 'Player-owned platforms must never receive AI outside funding.');
const noNeedPlatform = structuredClone(financingPlatform);
noNeedPlatform.cashReserve = 20_000;
noNeedPlatform.ai!.debtMillions = 0;
assert.equal(quotePlatformAiExternalRecapitalization({
    player: fixture,
    platform: noNeedPlatform,
    episode: financingEpisode,
    absoluteWeek: financingWeek,
    competitivePressure: 1,
}).amountMillions, 0, 'A platform with no financing need must not receive an investment offer.');
const administrationOutcome = choosePlatformAiAdministrationOutcome({
    player: fixture,
    platform: financingPlatform,
    episode: financingEpisode,
    absoluteWeek: financingWeek,
});
assert.ok(
    ['ACQUISITION_AVAILABLE', 'REGIONAL_DOWNSIZE', 'DORMANT'].includes(administrationOutcome.outcome),
    'Administration must choose one disclosed persisted outcome.',
);

const completedStageResults = (
    stages: PlatformAiDistressEpisode['stageResults'][number]['stage'][],
    week: number,
): PlatformAiDistressEpisode['stageResults'] => stages.map((stage, index) => ({
    stage,
    outcome: stage === 'PARENT_RESCUE' || stage === 'EXTERNAL_RECAPITALIZATION' ? 'UNAVAILABLE' : 'APPLIED',
    enteredAtAbsoluteWeek: week - stages.length + index,
    resolvedAtAbsoluteWeek: week - stages.length + index,
    reason: `${stage} completed for the financing audit.`,
    referenceId: null,
}));

const fundingIntegrationPlatform = structuredClone(financingPlatform);
fundingIntegrationPlatform.ai!.financeHistory = fundingIntegrationPlatform.ai!.financeHistory.map(snapshot => ({
    ...snapshot,
    unfundedMandatoryCostMillions: 0,
    unfundedSettledObligationCostMillions: 0,
    unfundedFinancingCostMillions: 0,
}));
fundingIntegrationPlatform.ai!.distressEpisodes = [{
    ...financingEpisode,
    stageResults: completedStageResults(DISTRESS_STAGE_ORDER.slice(0, 7), financingWeek).map(result => (
        result.stage === 'PARENT_RESCUE'
            ? { ...result, enteredAtAbsoluteWeek: financingWeek - 2, resolvedAtAbsoluteWeek: financingWeek - 2 }
            : result
    )),
    currentStageIndex: 7,
}];
const fundingIntegrationWorld = withPlatform(fixture.world, 'APPLE_TV', () => fundingIntegrationPlatform);
const externallyFunded = progressPlatformAiDistressWorld({
    player: { ...fixture, world: fundingIntegrationWorld },
    world: fundingIntegrationWorld,
    absoluteWeek: financingWeek,
});
const externallyFundedPlatform = externallyFunded.world.platforms!.APPLE_TV;
const settledFunding = externallyFundedPlatform.ai!.externalRecapitalizations[0];
assert.equal(settledFunding?.status, 'SETTLED', 'An eligible outside funding offer must settle exactly once.');
closeTo(
    settledFunding.settledMillions,
    settledFunding.arrearsReductionMillions + settledFunding.debtReductionMillions + settledFunding.cashRemainderMillions,
    'Every externally funded dollar must have exactly one saved disposition.',
);
assert.equal(externallyFundedPlatform.ai!.distressEpisodes[0].status, 'MONITORING_RECAPITALIZATION');
assert.equal(externallyFundedPlatform.ai!.spendingRestrictions.source, 'EXTERNAL_RECAPITALIZATION');
assert.equal(externallyFundedPlatform.ai!.spendingRestrictions.blocksNewBids, true);
assert.deepEqual(
    progressPlatformAiDistressWorld({
        player: { ...fixture, world: externallyFunded.world },
        world: externallyFunded.world,
        absoluteWeek: financingWeek,
    }).world,
    externallyFunded.world,
    'Replaying the funding week must not duplicate proceeds or records.',
);

const administrationWeek = financingWeek + 20;
const administrationPlatform = normalizePlatformAiState(
    structuredClone(fixture.world.platforms!.NETFLIX),
    fixture.id,
    administrationWeek,
);
administrationPlatform.cashReserve = 0;
administrationPlatform.subscribers = 0;
administrationPlatform.reputation = 0;
administrationPlatform.valuation = 0;
administrationPlatform.ai!.status = 'RESTRUCTURING';
administrationPlatform.ai!.debtMillions = 5_000;
administrationPlatform.ai!.restructuringFailedAtAbsoluteWeek = administrationWeek - 2;
administrationPlatform.ai!.releaseMemory = [];
administrationPlatform.ai!.rightsContracts = [];
administrationPlatform.ai!.capabilities.technologyLevels = Object.fromEntries(
    Object.keys(administrationPlatform.ai!.capabilities.technologyLevels).map(key => [key, 0]),
) as typeof administrationPlatform.ai.capabilities.technologyLevels;
administrationPlatform.ai!.financeHistory = fundingIntegrationPlatform.ai!.financeHistory.map(snapshot => ({
    ...snapshot,
    revenueMillions: 0,
    operatingNetCashFlowMillions: -120,
    closingCashMillions: 0,
    closingDebtMillions: 5_000,
}));
administrationPlatform.ai!.distressEpisodes = [{
    id: 'bankruptcy-administration-episode',
    platformId: 'NETFLIX',
    status: 'ACTIVE',
    startedAtAbsoluteWeek: administrationWeek - 12,
    completedAtAbsoluteWeek: null,
    currentStageIndex: 8,
    lastAdvancedAtAbsoluteWeek: administrationWeek - 1,
    stageResults: completedStageResults(DISTRESS_STAGE_ORDER.slice(0, 8), administrationWeek).map(result => (
        result.stage === 'EXTERNAL_RECAPITALIZATION'
            ? { ...result, enteredAtAbsoluteWeek: administrationWeek - 2, resolvedAtAbsoluteWeek: administrationWeek - 2 }
            : result
    )),
}];
const administrationWorld = withPlatform(fixture.world, 'NETFLIX', () => administrationPlatform);
const enteredAdministration = progressPlatformAiDistressWorld({
    player: { ...fixture, world: administrationWorld },
    world: administrationWorld,
    absoluteWeek: administrationWeek,
});
const administeredPlatform = enteredAdministration.world.platforms!.NETFLIX;
assert.equal(administeredPlatform.ai!.administration?.outcome, 'PENDING');
assert.equal(administeredPlatform.ai!.spendingRestrictions.source, 'ADMINISTRATION');
assert.equal(administeredPlatform.ai!.spendingRestrictions.blocksNewGreenlights, true);
assert.equal(administeredPlatform.ai!.debtMillions, 5_000, 'Administration must preserve outstanding debt.');

const catalogueProject: IndustryProject = {
    id: 'distress-catalogue-project',
    title: 'The Last Harbour',
    genre: 'DRAMA',
    mediaType: 'MOVIE',
    targetAudience: 'PG-13',
    studioId: 'NETFLIX_STUDIOS',
    budgetTier: 'HIGH',
    quality: 88,
    rating: 8.3,
    boxOffice: 240_000_000,
    year: 39,
    weekReleased: 44,
    leadActorId: 'distress-lead',
    leadActorName: 'Avery Stone',
    directorId: 'distress-director',
    directorName: 'Mira Vale',
    reviews: 'A durable prestige success.',
};

const releasedOriginalPlan = (platform: PlatformState): PlatformAiContentPlan => ({
    id: 'distress-seller-plan',
    platformId: platform.id,
    controllerAtCommitment: 'AI',
    source: 'COMMISSIONED_ORIGINAL',
    status: 'RELEASED',
    title: catalogueProject.title,
    projectType: 'MOVIE',
    genre: catalogueProject.genre,
    targetAudience: 'PG-13',
    sourceProjectIds: [],
    rightsContractIds: [],
    cataloguePackageId: null,
    commissionId: 'distress-commission',
    sourceStudioId: catalogueProject.studioId,
    streamingWindow: 'ORIGINAL_STREAMING_PREMIERE',
    localizationLevel: 'DUBS_AND_SUBTITLES',
    releaseCountryIds: [...platform.ai!.capabilities.activeCountryIds],
    minimumGuaranteeMillions: 0,
    rightsCostMillions: 0,
    productionFundingMillions: 70,
    paidSpendMillions: 70,
    marketingReserveMillions: 7,
    contingencyMillions: 5.6,
    committedAtAbsoluteWeek: START_WEEK - 100,
    rightsReadyAtAbsoluteWeek: START_WEEK - 70,
    localizationReadyAtAbsoluteWeek: START_WEEK - 12,
    premiereAtAbsoluteWeek: START_WEEK - 10,
    releasePattern: 'MOVIE_SINGLE_PREMIERE',
    releaseEntries: [{
        id: 'distress-release-entry',
        sourceProjectId: null,
        canonicalProjectId: catalogueProject.id,
        rightsContractId: null,
        premiereAtAbsoluteWeek: START_WEEK - 10,
        localizationReadyAtAbsoluteWeek: START_WEEK - 12,
        countryIds: [...platform.ai!.capabilities.activeCountryIds],
        releasePattern: 'MOVIE_SINGLE_PREMIERE',
        installmentAbsoluteWeeks: [START_WEEK - 10],
        status: 'RELEASED',
        releasedAtAbsoluteWeek: START_WEEK - 10,
        streamingWindowId: 'distress-window',
    }],
    scheduledAtAbsoluteWeek: START_WEEK - 13,
    releasedAtAbsoluteWeek: START_WEEK - 10,
    industryProductionId: 'distress-production',
    forecast: { strategic: 80, creative: 88, commercial: 82, prestige: 90, risk: 12 },
});

const episodeAtCatalogueStage = (platformId: PlatformId, week: number): PlatformAiDistressEpisode => ({
    id: `catalogue-episode-${platformId}-${week}`,
    platformId,
    status: 'ACTIVE',
    startedAtAbsoluteWeek: week - 4,
    completedAtAbsoluteWeek: null,
    currentStageIndex: 3,
    lastAdvancedAtAbsoluteWeek: week - 1,
    stageResults: [
        { stage: 'FREEZE_GREENLIGHTS', outcome: 'APPLIED', enteredAtAbsoluteWeek: week - 4, resolvedAtAbsoluteWeek: week - 4, reason: 'Applied.', referenceId: null },
        { stage: 'PAUSE_RESEARCH', outcome: 'APPLIED', enteredAtAbsoluteWeek: week - 3, resolvedAtAbsoluteWeek: week - 3, reason: 'Applied.', referenceId: null },
        { stage: 'HOLD_COMMISSION', outcome: 'UNAVAILABLE', enteredAtAbsoluteWeek: week - 2, resolvedAtAbsoluteWeek: week - 2, reason: 'No commission.', referenceId: null },
    ],
});

const catalogueDealFixture = (week: number): Player => {
    const base = createPlatformAiFixture();
    let world: WorldState = {
        ...base.world,
        projects: [catalogueProject],
        platformAiCatalogueDistressDeals: [],
    };
    for (const platformId of Object.keys(world.platforms!) as PlatformId[]) {
        const normalized = normalizePlatformAiState(world.platforms![platformId], base.id, week);
        world = withPlatform(world, platformId, () => ({
            ...normalized,
            cashReserve: platformId === 'NETFLIX' ? 8 : 800,
            ai: {
                ...normalized.ai!,
                status: platformId === 'NETFLIX' ? 'DISTRESSED' : 'ACTIVE',
                debtMillions: platformId === 'NETFLIX' ? 55 : 0,
                slate: platformId === 'NETFLIX' ? [releasedOriginalPlan(normalized)] : [],
                rightsContracts: platformId === 'NETFLIX' ? [createStreamingLicenseContract({
                    id: 'distress-source-entitlement',
                    sourceProject: catalogueProject,
                    buyerPlatformId: 'NETFLIX',
                    platformContentPlanId: 'distress-seller-plan',
                    cataloguePackageId: null,
                    contentSource: 'LICENSED_RELEASED_TITLE',
                    licensorName: 'Archive Studio',
                    territory: 'DOMESTIC',
                    countryIds: ['JP'],
                    durationWeeks: 260,
                    exclusivity: 'NON_EXCLUSIVE',
                    minimumGuarantee: 12_000_000,
                    platformRevenueShare: 70,
                    signedAtAbsoluteWeek: week - 20,
                    startsAtAbsoluteWeek: week - 20,
                    status: 'ACTIVE',
                    origin: 'STUDIO_MARKET',
                    sellerType: 'STUDIO',
                    sellerPlatformId: null,
                    windowType: 'SECOND_WINDOW',
                    permanentPurchase: false,
                    renewalOption: true,
                    sublicensingAllowed: true,
                    sequelRightsIncluded: false,
                    changeOfControl: 'NOTICE',
                    cancellationPenalty: 0,
                })] : [],
                decisionHistory: [],
                distressEpisodes: platformId === 'NETFLIX' ? [episodeAtCatalogueStage(platformId, week)] : [],
            },
        }));
    }
    return migrateStreamingRightsContractRegistry({ ...base, world });
};

const queueWeek = START_WEEK + 20;
const catalogueFixture = catalogueDealFixture(queueWeek);
const sellerCashBeforeQueue = catalogueFixture.world.platforms!.NETFLIX.cashReserve;
const queued = progressPlatformAiDistressWorld({
    player: catalogueFixture,
    world: catalogueFixture.world,
    absoluteWeek: queueWeek,
});
assert.equal(queued.world.platformAiCatalogueDistressDeals?.length, 1, 'The catalogue stage must queue one world-level deal.');
const queuedDeal = queued.world.platformAiCatalogueDistressDeals![0];
const queuedBuyer = queued.world.platforms![queuedDeal.buyerPlatformId];
assert.equal(queuedDeal.status, 'PENDING_PAYMENT');
assert.equal(queuedDeal.durationWeeks, queuedDeal.sellerEntitlementExpiresAtAbsoluteWeek - queuedDeal.startsAtAbsoluteWeek);
assert.equal(queuedDeal.expiresAtAbsoluteWeek, queuedDeal.sellerEntitlementExpiresAtAbsoluteWeek);
assert.equal(queuedDeal.sourceContractId, 'distress-source-entitlement');
assert.equal(queuedDeal.windowType, 'SECOND_WINDOW');
assert.deepEqual(queuedDeal.countryIds, ['JP'], 'A distress transfer must preserve the seller entitlement exactly.');
assert.equal(queued.world.platforms!.NETFLIX.cashReserve, sellerCashBeforeQueue, 'Queueing may not credit the seller.');
assert.equal(queuedBuyer.cashReserve, catalogueFixture.world.platforms![queuedDeal.buyerPlatformId].cashReserve, 'Queueing may not charge the buyer.');
assert.equal(queuedBuyer.ai!.rightsContracts.length, 0, 'Queueing may not grant rights before payment.');
assert.equal(queuedBuyer.ai!.slate.length, 0, 'Queueing may not create a usable plan before payment.');
assert.deepEqual(
    queuedBuyer.ai!.pendingOneTimeObligations.find(item => item.id === queuedDeal.buyerObligationId),
    {
        id: queuedDeal.buyerObligationId,
        category: 'CONTRACTUAL',
        amountMillions: queuedDeal.priceMillions,
        createdWeek: queueWeek,
        status: 'HELD',
        settledWeek: null,
    },
    'The queued deal must own one canonical held contractual obligation.',
);

const settlementWeek = queueWeek + 1;
const buyerEconomy = settlePlatformAiEconomy({
    player: { ...catalogueFixture, world: queued.world },
    platform: queuedBuyer,
    absoluteWeek: settlementWeek,
});
assert.equal(buyerEconomy.snapshot?.contractualCostMillions, queuedDeal.priceMillions, 'The buyer economy must deduct the exact licence price.');
let settlementWorld = withPlatform(queued.world, queuedDeal.buyerPlatformId, () => buyerEconomy.platform);
const sellerEconomy = settlePlatformAiEconomy({
    player: { ...catalogueFixture, world: settlementWorld },
    platform: settlementWorld.platforms!.NETFLIX,
    absoluteWeek: settlementWeek,
});
settlementWorld = withPlatform(settlementWorld, 'NETFLIX', () => sellerEconomy.platform);
const sellerCashBeforeReceipt = sellerEconomy.platform.cashReserve;
const transferred = progressPlatformAiDistressWorld({
    player: { ...catalogueFixture, world: settlementWorld },
    world: settlementWorld,
    absoluteWeek: settlementWeek,
});
const transferredDeal = transferred.world.platformAiCatalogueDistressDeals![0];
const transferredBuyer = transferred.world.platforms![queuedDeal.buyerPlatformId];
const transferredSeller = transferred.world.platforms!.NETFLIX;
assert.equal(transferredDeal.status, 'TRANSFERRED');
closeTo(transferredSeller.cashReserve - sellerCashBeforeReceipt, queuedDeal.priceMillions, 'Seller receipt must equal the buyer contractual deduction.');
assert.equal(transferredBuyer.ai!.rightsContracts.filter(item => item.id === queuedDeal.buyerContractId).length, 1);
assert.equal(transferredBuyer.ai!.rightsContracts.find(item => item.id === queuedDeal.buyerContractId)?.exclusivity, 'NON_EXCLUSIVE');
assert.equal(transferredBuyer.ai!.rightsContracts.find(item => item.id === queuedDeal.buyerContractId)?.expiresAtAbsoluteWeek, queuedDeal.expiresAtAbsoluteWeek);
assert.equal(
    transferred.world.streamingRightsContracts?.['distress-source-entitlement']?.status,
    'TRANSFERRED_OUT',
    'The distressed seller must lose the transferred Japan licence.',
);
const distressTransaction = Object.values(transferred.world.streamingRightsTransactions || {}).find(transaction => (
    transaction.sourceContractId === 'distress-source-entitlement'
));
assert.equal(distressTransaction?.kind, 'LICENSE_TRANSFER');
assert.equal(distressTransaction?.sellerReceipt, queuedDeal.priceMillions * 1_000_000);
assert.equal(distressTransaction?.originalOwner.name, 'Archive Studio');
assert.equal(distressTransaction?.originalOwnerParticipation, 0);
assert.equal(
    transferred.world.streamingRightsContracts?.[queuedDeal.buyerContractId]?.buyer.platformId,
    queuedDeal.buyerPlatformId,
    'A settled distress catalogue trade must register its canonical streaming contract.',
);
assert.equal(transferredBuyer.ai!.slate.filter(item => item.id === queuedDeal.buyerPlanId && item.status === 'RIGHTS_READY').length, 1);
assert.equal(
    transferredSeller.ai!.financeHistory.find(item => item.absoluteWeek === settlementWeek)?.verifiedContractIncomeMillions,
    (sellerEconomy.snapshot?.verifiedContractIncomeMillions || 0) + queuedDeal.priceMillions,
    'The seller finance snapshot must record verified contract income.',
);
const transferReplay = progressPlatformAiDistressWorld({
    player: { ...catalogueFixture, world: transferred.world },
    world: transferred.world,
    absoluteWeek: settlementWeek,
});
assert.deepEqual(transferReplay.world, transferred.world, 'Transferred cash, contract and plan must be replay-safe.');

const royaltyWeek = settlementWeek + 8;
let royaltyWorld = withPlatform(transferred.world, queuedDeal.buyerPlatformId, platform => ({
    ...platform,
    ai: {
        ...platform.ai!,
        slate: platform.ai!.slate.map(plan => plan.id === queuedDeal.buyerPlanId
            ? { ...plan, status: 'RELEASED' as const }
            : plan),
    },
}));
const royaltyBuyerEconomy = settlePlatformAiEconomy({
    player: { ...catalogueFixture, world: royaltyWorld },
    platform: royaltyWorld.platforms![queuedDeal.buyerPlatformId],
    absoluteWeek: royaltyWeek,
});
assert.ok((royaltyBuyerEconomy.snapshot?.partnerRevenueShareCostMillions || 0) > 0, 'The active platform-trade licence must incur recurring share.');
const immutableRoyaltyAllocations = (royaltyBuyerEconomy.snapshot as any)?.platformTradeRoyaltyAllocations || [];
assert.deepEqual(immutableRoyaltyAllocations, [], 'The reseller must not receive the original studio backend after selling the licence.');
royaltyWorld = withPlatform(royaltyWorld, queuedDeal.buyerPlatformId, () => royaltyBuyerEconomy.platform);
const royaltyRoundTrip = migratePlayerSave({
    ...catalogueFixture,
    age: Math.floor(royaltyWeek / 52) + 1,
    currentWeek: (royaltyWeek % 52) + 1,
    world: royaltyWorld,
});
royaltyWorld = royaltyRoundTrip.world;
assert.ok(
    !royaltyWorld.platforms![queuedDeal.buyerPlatformId].ai!.decisionHistory.some(decision => (
        decision.absoluteWeek === royaltyWeek
        && decision.type === 'PLATFORM_TRADE_ROYALTY_ALLOCATION'
    )),
    'The buyer must not fabricate a reseller royalty allocation after reload.',
);
royaltyWorld = withPlatform(royaltyWorld, queuedDeal.buyerPlatformId, platform => ({
    ...platform,
    ai: {
        ...platform.ai!,
        slate: [
            ...platform.ai!.slate,
            ...Array.from({ length: 3 }, (_, index) => ({
                ...platform.ai!.slate[0],
                id: `post-settlement-release-${index}`,
                sourceProjectIds: [`post-settlement-project-${index}`],
                rightsContractIds: [],
                status: 'RELEASED' as const,
            })),
        ],
    },
}));
const royaltySellerEconomy = settlePlatformAiEconomy({
    player: { ...catalogueFixture, world: royaltyWorld },
    platform: royaltyWorld.platforms!.NETFLIX,
    absoluteWeek: royaltyWeek,
});
royaltyWorld = withPlatform(royaltyWorld, 'NETFLIX', () => royaltySellerEconomy.platform);
royaltyWorld = withPlatform(royaltyWorld, 'NETFLIX', platform => ({
    ...platform,
    ai: {
        ...platform.ai!,
        status: 'ACTIVE',
        debtMillions: 0,
        financeHistory: platform.ai!.financeHistory.map(snapshot => snapshot.absoluteWeek === royaltyWeek
            ? { ...snapshot, debtIncurredMillions: 0, lossRunwayWeeks: 100, runwayWeeks: 100 }
            : snapshot),
        distressEpisodes: platform.ai!.distressEpisodes.map(episode => ({
            ...episode,
            status: 'RECOVERED' as const,
            completedAtAbsoluteWeek: episode.completedAtAbsoluteWeek ?? royaltyWeek - 1,
            lastAdvancedAtAbsoluteWeek: Math.min(episode.lastAdvancedAtAbsoluteWeek, royaltyWeek - 1),
        })),
    },
}));
const sellerBeforeRoyalty = royaltyWorld.platforms!.NETFLIX.cashReserve;
const royaltySettled = progressPlatformAiDistressWorld({
    player: { ...catalogueFixture, world: royaltyWorld },
    world: royaltyWorld,
    absoluteWeek: royaltyWeek,
});
closeTo(
    royaltySettled.world.platforms!.NETFLIX.cashReserve - sellerBeforeRoyalty,
    0,
    'The former holder receives no recurring royalty after the full transfer.',
);
assert.deepEqual(
    progressPlatformAiDistressWorld({
        player: { ...catalogueFixture, world: royaltySettled.world },
        world: royaltySettled.world,
        absoluteWeek: royaltyWeek,
    }).world,
    royaltySettled.world,
    'Recurring platform-trade share settlement must be same-week replay safe.',
);

const activeMarketsBeforeWithdrawal = transferredSeller.ai!.marketOperations.filter(operation => operation.status === 'ACTIVE').length;
const withdrew = progressPlatformAiDistressWorld({
    player: { ...catalogueFixture, world: transferred.world },
    world: transferred.world,
    absoluteWeek: settlementWeek + 1,
});
const withdrawnSeller = withdrew.world.platforms!.NETFLIX;
assert.equal(withdrawnSeller.ai!.distressEpisodes.at(-1)?.stageResults.at(-1)?.stage, 'WITHDRAW_REGION');
assert.equal(withdrawnSeller.ai!.distressEpisodes.at(-1)?.stageResults.at(-1)?.outcome, 'APPLIED');
assert.equal(
    withdrawnSeller.ai!.marketOperations.filter(operation => operation.status === 'ACTIVE').length,
    activeMarketsBeforeWithdrawal - 1,
    'The region stage must suspend exactly one weak active market when available.',
);
const withdrawnActiveCountryIds = new Set(withdrawnSeller.ai!.capabilities.activeCountryIds);
assert.ok(
    withdrawnSeller.ai!.slate
        .filter(plan => !['RELEASED', 'CANCELLED', 'SOLD'].includes(plan.status))
        .every(plan => plan.releaseCountryIds.every(countryId => withdrawnActiveCountryIds.has(countryId))),
    'Withdrawing from a market must repair every live unreleased plan before the weekly world is persisted.',
);
const restructuredWorld = progressPlatformAiDistressWorld({
    player: { ...catalogueFixture, world: withdrew.world },
    world: withdrew.world,
    absoluteWeek: settlementWeek + 2,
}).world;
assert.equal(restructuredWorld.platforms!.NETFLIX.ai!.status, 'RESTRUCTURING');
assert.equal(restructuredWorld.platforms!.NETFLIX.ai!.distressEpisodes.at(-1)?.status, 'MONITORING_RESTRUCTURE');
const monitoringWorld = progressPlatformAiDistressWorld({
    player: { ...catalogueFixture, world: restructuredWorld },
    world: restructuredWorld,
    absoluteWeek: settlementWeek + 3,
}).world;
assert.deepEqual(monitoringWorld, restructuredWorld, 'Parent rescue must wait for a persisted restructuring failure.');
const failedRestructureWorld = withPlatform(monitoringWorld, 'NETFLIX', platform => ({
    ...platform,
    subscribers: 0,
    valuation: 0,
    reputation: 0,
    ai: {
        ...platform.ai!,
        restructuringFailedAtAbsoluteWeek: settlementWeek + 4,
        releaseMemory: [],
        rightsContracts: [],
        capabilities: {
            ...platform.ai!.capabilities,
            technologyLevels: Object.fromEntries(
                Object.keys(platform.ai!.capabilities.technologyLevels).map(key => [key, 0]),
            ) as typeof platform.ai.capabilities.technologyLevels,
        },
    },
}));
const unavailableRescueWorld = progressPlatformAiDistressWorld({
    player: { ...catalogueFixture, world: failedRestructureWorld },
    world: failedRestructureWorld,
    absoluteWeek: settlementWeek + 4,
}).world;
assert.equal(unavailableRescueWorld.platforms!.NETFLIX.ai!.distressEpisodes.at(-1)?.stageResults.at(-1)?.stage, 'PARENT_RESCUE');
assert.equal(unavailableRescueWorld.platforms!.NETFLIX.ai!.distressEpisodes.at(-1)?.stageResults.at(-1)?.outcome, 'UNAVAILABLE');
const advancedPastRescue = progressPlatformAiDistressWorld({
    player: { ...catalogueFixture, world: unavailableRescueWorld },
    world: unavailableRescueWorld,
    absoluteWeek: settlementWeek + 5,
}).world;
const unavailableExternalFunding = progressPlatformAiDistressWorld({
    player: { ...catalogueFixture, world: advancedPastRescue },
    world: advancedPastRescue,
    absoluteWeek: settlementWeek + 6,
}).world;
assert.equal(unavailableExternalFunding.platforms!.NETFLIX.ai!.distressEpisodes.at(-1)?.stageResults.at(-1)?.stage, 'EXTERNAL_RECAPITALIZATION');
assert.equal(unavailableExternalFunding.platforms!.NETFLIX.ai!.distressEpisodes.at(-1)?.stageResults.at(-1)?.outcome, 'UNAVAILABLE');
const advancedPastExternalFunding = progressPlatformAiDistressWorld({
    player: { ...catalogueFixture, world: unavailableExternalFunding },
    world: unavailableExternalFunding,
    absoluteWeek: settlementWeek + 7,
}).world;
const unavailableAdministration = progressPlatformAiDistressWorld({
    player: { ...catalogueFixture, world: advancedPastExternalFunding },
    world: advancedPastExternalFunding,
    absoluteWeek: settlementWeek + 8,
}).world;
assert.equal(unavailableAdministration.platforms!.NETFLIX.ai!.distressEpisodes.at(-1)?.stageResults.at(-1)?.stage, 'BANKRUPTCY_ADMINISTRATION');
assert.equal(unavailableAdministration.platforms!.NETFLIX.ai!.distressEpisodes.at(-1)?.stageResults.at(-1)?.outcome, 'APPLIED');
assert.equal(unavailableAdministration.platforms!.NETFLIX.ai!.administration?.outcome, 'PENDING');
const dormantWorld = progressPlatformAiDistressWorld({
    player: { ...catalogueFixture, world: unavailableAdministration },
    world: unavailableAdministration,
    absoluteWeek: settlementWeek + 9,
}).world;
assert.equal(dormantWorld.platforms!.NETFLIX.ai!.status, 'DORMANT');
assert.equal(dormantWorld.platforms!.NETFLIX.ai!.distressEpisodes.at(-1)?.status, 'DORMANT');
assert.equal(dormantWorld.platforms!.NETFLIX.ai!.distressEpisodes.at(-1)?.completedAtAbsoluteWeek, settlementWeek + 9);
assert.notEqual(dormantWorld.platforms!.NETFLIX.ai!.administration?.outcome, 'PENDING', 'Administration must persist a deterministic final disposition.');
assert.equal(dormantWorld.platforms!.NETFLIX.ai!.administration?.resolvedAtAbsoluteWeek, settlementWeek + 9);

const rescueWeek = settlementWeek + 20;
const rescueWorld = withPlatform(catalogueFixture.world, 'APPLE_TV', source => {
    const platform = normalizePlatformAiState(source, catalogueFixture.id, rescueWeek);
    const rescueSnapshot = {
        ...sellerEconomy.snapshot!,
        absoluteWeek: rescueWeek,
        openingCashMillions: 0,
        revenueMillions: 100,
        mandatoryCostAccruedMillions: 100,
        mandatoryCostMillions: 100,
        operatingCostMillions: 100,
        operatingNetCashFlowMillions: 0,
        closingCashMillions: 0,
        closingDebtMillions: 100,
        rescueIncomeMillions: 0,
        rescueDebtReductionMillions: 0,
    };
    return {
        ...platform,
        cashReserve: 0,
        ai: {
            ...platform.ai!,
            status: 'RESTRUCTURING',
            debtMillions: 100,
            financeHistory: [rescueSnapshot],
            restructuringStartedAtAbsoluteWeek: rescueWeek - 2,
            restructuringFailedAtAbsoluteWeek: rescueWeek - 1,
            lastRescueAbsoluteWeek: null,
            distressEpisodes: [{
                id: 'apple-rescue-episode',
                platformId: 'APPLE_TV',
                status: 'MONITORING_RESTRUCTURE',
                startedAtAbsoluteWeek: rescueWeek - 7,
                completedAtAbsoluteWeek: null,
                currentStageIndex: 6,
                lastAdvancedAtAbsoluteWeek: rescueWeek - 1,
                stageResults: DISTRESS_STAGE_ORDER.slice(0, 6).map((stage, index) => ({
                    stage,
                    outcome: 'APPLIED' as const,
                    enteredAtAbsoluteWeek: rescueWeek - 7 + index,
                    resolvedAtAbsoluteWeek: rescueWeek - 7 + index,
                    reason: `Prepared ${stage}.`,
                    referenceId: null,
                })),
            }],
        },
    };
});
const rescuedWorld = progressPlatformAiDistressWorld({
    player: { ...catalogueFixture, world: rescueWorld },
    world: rescueWorld,
    absoluteWeek: rescueWeek,
}).world;
const rescuedApple = rescuedWorld.platforms!.APPLE_TV;
assert.equal(rescuedApple.ai!.distressEpisodes.at(-1)?.stageResults.at(-1)?.stage, 'PARENT_RESCUE');
assert.equal(rescuedApple.ai!.distressEpisodes.at(-1)?.stageResults.at(-1)?.outcome, 'APPLIED');
assert.equal(rescuedApple.ai!.distressEpisodes.at(-1)?.status, 'MONITORING_RESCUE');
assert.equal(rescuedApple.ai!.debtMillions, 0, 'Parent rescue must repay debt first.');
assert.equal(rescuedApple.cashReserve, 1_200, 'Only the rescue remainder may become cash.');
assert.equal(rescuedApple.ai!.financeHistory.at(-1)?.rescueIncomeMillions, 1_300);
assert.equal(rescuedApple.ai!.financeHistory.at(-1)?.rescueDebtReductionMillions, 100);

const timeoutFixture = catalogueDealFixture(queueWeek + 100);
const timeoutQueued = progressPlatformAiDistressWorld({ player: timeoutFixture, world: timeoutFixture.world, absoluteWeek: queueWeek + 100 });
const timeoutDeal = timeoutQueued.world.platformAiCatalogueDistressDeals![0];
const timedOut = progressPlatformAiDistressWorld({
    player: { ...timeoutFixture, world: timeoutQueued.world },
    world: timeoutQueued.world,
    absoluteWeek: timeoutDeal.createdAtAbsoluteWeek + 4,
});
assert.equal(timedOut.world.platformAiCatalogueDistressDeals![0].status, 'CANCELLED');
assert.equal(
    timedOut.world.platforms![timeoutDeal.buyerPlatformId].ai!.pendingOneTimeObligations.some(item => item.id === timeoutDeal.buyerObligationId),
    false,
    'A four-week unpaid deal must cancel and remove its held obligation without debt.',
);

const acquiredSellerFixture = catalogueDealFixture(queueWeek + 150);
const acquiredSellerPlayer: Player = {
    ...acquiredSellerFixture,
    ownedStreamingPlatform: {
        ...acquiredSellerFixture.ownedStreamingPlatform!,
        corporateDevelopment: {
            ...acquiredSellerFixture.ownedStreamingPlatform!.corporateDevelopment,
            acquiredPlatformIds: [
                ...acquiredSellerFixture.ownedStreamingPlatform!.corporateDevelopment.acquiredPlatformIds,
                'NETFLIX',
            ],
        },
    },
};
const acquiredSellerQueueAttempt = progressPlatformAiDistressWorld({
    player: acquiredSellerPlayer,
    world: acquiredSellerPlayer.world,
    absoluteWeek: queueWeek + 150,
});
assert.equal(
    acquiredSellerQueueAttempt.world.platformAiCatalogueDistressDeals?.length || 0,
    0,
    'A player-controlled seller must never auto-queue a catalogue sale.',
);

const recoveredSellerWorld = withPlatform(timeoutQueued.world, 'NETFLIX', platform => ({
    ...platform,
    ai: {
        ...platform.ai!,
        status: 'ACTIVE',
        debtMillions: 0,
        financeHistory: [],
        distressEpisodes: platform.ai!.distressEpisodes.map(episode => episode.id === timeoutDeal.episodeId
            ? {
                ...episode,
                status: 'RECOVERED' as const,
                completedAtAbsoluteWeek: timeoutDeal.createdAtAbsoluteWeek + 1,
                lastAdvancedAtAbsoluteWeek: timeoutDeal.createdAtAbsoluteWeek + 1,
            }
            : episode),
    },
}));
const recoveredSellerCancelled = progressPlatformAiDistressWorld({
    player: { ...timeoutFixture, world: recoveredSellerWorld },
    world: recoveredSellerWorld,
    absoluteWeek: timeoutDeal.createdAtAbsoluteWeek + 1,
});
assert.equal(
    recoveredSellerCancelled.world.platformAiCatalogueDistressDeals![0].status,
    'CANCELLED',
    'A pending sale must cancel as soon as its seller episode is recovered or completed.',
);

const tamperedWorld = structuredClone(timeoutQueued.world);
tamperedWorld.platformAiCatalogueDistressDeals![0].priceMillions += 1;
const rejectedTamper = progressPlatformAiDistressWorld({
    player: { ...timeoutFixture, world: tamperedWorld },
    world: tamperedWorld,
    absoluteWeek: timeoutDeal.createdAtAbsoluteWeek + 1,
});
assert.equal(rejectedTamper.world.platformAiCatalogueDistressDeals![0].status, 'CANCELLED', 'A tampered canonical price must be rejected.');

const conflictFixture = catalogueDealFixture(queueWeek + 200);
const conflictQueued = progressPlatformAiDistressWorld({
    player: conflictFixture,
    world: conflictFixture.world,
    absoluteWeek: queueWeek + 200,
});
const conflictDeal = conflictQueued.world.platformAiCatalogueDistressDeals![0];
const conflictSettlementWeek = conflictDeal.createdAtAbsoluteWeek + 1;
const conflictBuyerEconomy = settlePlatformAiEconomy({
    player: { ...conflictFixture, world: conflictQueued.world },
    platform: conflictQueued.world.platforms![conflictDeal.buyerPlatformId],
    absoluteWeek: conflictSettlementWeek,
});
let conflictWorld = withPlatform(conflictQueued.world, conflictDeal.buyerPlatformId, () => conflictBuyerEconomy.platform);
const blockerId = (Object.keys(conflictWorld.platforms!) as PlatformId[])
    .find(platformId => platformId !== conflictDeal.buyerPlatformId && platformId !== conflictDeal.sellerPlatformId)!;
conflictWorld = withPlatform(conflictWorld, blockerId, platform => ({
    ...platform,
    ai: {
        ...platform.ai!,
        rightsContracts: [...platform.ai!.rightsContracts, createStreamingLicenseContract({
            id: 'post-queue-exclusive-conflict',
            sourceProject: catalogueProject,
            buyerPlatformId: blockerId,
            platformContentPlanId: null,
            cataloguePackageId: null,
            contentSource: 'LICENSED_RELEASED_TITLE',
            licensorName: 'Conflicting Rights Holder',
            territory: 'GLOBAL',
            durationWeeks: 104,
            exclusivity: 'EXCLUSIVE',
            minimumGuarantee: 20_000_000,
            platformRevenueShare: 70,
            signedAtAbsoluteWeek: conflictSettlementWeek,
            startsAtAbsoluteWeek: conflictSettlementWeek,
            status: 'ACTIVE',
            origin: 'STUDIO_MARKET',
            sellerType: 'STUDIO',
            sellerPlatformId: null,
            windowType: 'SECOND_WINDOW',
            permanentPurchase: false,
            sublicensingAllowed: false,
        })],
    },
}));
conflictWorld = migrateStreamingRightsContractRegistry({ ...conflictFixture, world: conflictWorld }).world;
const buyerCashAfterConflictPayment = conflictWorld.platforms![conflictDeal.buyerPlatformId].cashReserve;
const sellerCashBeforeRejectedTransfer = conflictWorld.platforms![conflictDeal.sellerPlatformId].cashReserve;
const conflictRejected = progressPlatformAiDistressWorld({
    player: { ...conflictFixture, world: conflictWorld },
    world: conflictWorld,
    absoluteWeek: conflictSettlementWeek,
});
assert.equal(conflictRejected.world.platformAiCatalogueDistressDeals![0].status, 'CANCELLED');
closeTo(
    conflictRejected.world.platforms![conflictDeal.buyerPlatformId].cashReserve - buyerCashAfterConflictPayment,
    conflictDeal.priceMillions,
    'A post-queue conflict must refund exactly the newly settled payment.',
);
assert.equal(
    conflictRejected.world.platforms![conflictDeal.sellerPlatformId].cashReserve,
    sellerCashBeforeRejectedTransfer,
    'A rejected transfer may not credit the seller.',
);

const malformedSettlementWorld = structuredClone(conflictWorld);
const malformedSettlementBuyer = malformedSettlementWorld.platforms![conflictDeal.buyerPlatformId];
malformedSettlementBuyer.ai!.pendingOneTimeObligations = malformedSettlementBuyer.ai!.pendingOneTimeObligations.map(obligation => (
    obligation.id === conflictDeal.buyerObligationId
        ? { ...obligation, amountMillions: conflictDeal.priceMillions + 1_000 }
        : obligation
));
const malformedBuyerCashBeforeCancellation = malformedSettlementBuyer.cashReserve;
const malformedSettlementCancelled = progressPlatformAiDistressWorld({
    player: { ...conflictFixture, world: malformedSettlementWorld },
    world: malformedSettlementWorld,
    absoluteWeek: conflictSettlementWeek,
});
const malformedCancelledDeal = malformedSettlementCancelled.world.platformAiCatalogueDistressDeals![0] as any;
assert.equal(malformedCancelledDeal.status, 'CANCELLED');
assert.equal(
    malformedSettlementCancelled.world.platforms![conflictDeal.buyerPlatformId].cashReserve,
    malformedBuyerCashBeforeCancellation,
    'Malformed settlement evidence must never mint a buyer refund.',
);
assert.equal(malformedCancelledDeal.paymentDisposition, 'INVALID_EVIDENCE');
assert.equal(malformedCancelledDeal.refundedAtAbsoluteWeek, null);
assert.deepEqual(
    progressPlatformAiDistressWorld({
        player: { ...conflictFixture, world: malformedSettlementCancelled.world },
        world: malformedSettlementCancelled.world,
        absoluteWeek: conflictSettlementWeek,
    }).world,
    malformedSettlementCancelled.world,
    'Invalid-evidence cancellation must remain replay-safe.',
);

const expiringFixture = catalogueDealFixture(queueWeek + 300);
let expiringWorld = withPlatform(expiringFixture.world, 'NETFLIX', platform => ({
    ...platform,
    ai: {
        ...platform.ai!,
        slate: [],
        rightsContracts: platform.ai!.rightsContracts.map(contract => ({
            ...contract,
            durationWeeks: 60,
            expiresAtAbsoluteWeek: queueWeek + 340,
        })),
    },
}));
expiringWorld = {
    ...expiringWorld,
    streamingRightsContracts: {
        ...expiringWorld.streamingRightsContracts,
        'distress-source-entitlement': {
            ...expiringWorld.streamingRightsContracts!['distress-source-entitlement'],
            durationWeeks: 60,
            expiresAtAbsoluteWeek: queueWeek + 340,
        },
    },
};
const expiringRejected = progressPlatformAiDistressWorld({
    player: { ...expiringFixture, world: expiringWorld },
    world: expiringWorld,
    absoluteWeek: queueWeek + 300,
});
assert.equal(expiringRejected.world.platformAiCatalogueDistressDeals?.length, 1, 'A short remaining licence may be sold without inventing a longer term.');
assert.equal(
    expiringRejected.world.platformAiCatalogueDistressDeals?.[0].expiresAtAbsoluteWeek,
    queueWeek + 340,
);

const disallowedFixture = catalogueDealFixture(queueWeek + 325);
const disallowedWorld: WorldState = {
    ...disallowedFixture.world,
    platforms: {
        ...disallowedFixture.world.platforms!,
        NETFLIX: {
            ...disallowedFixture.world.platforms!.NETFLIX,
            ai: {
                ...disallowedFixture.world.platforms!.NETFLIX.ai!,
                slate: [],
            },
        },
    },
    streamingRightsContracts: {
        ...disallowedFixture.world.streamingRightsContracts,
        'distress-source-entitlement': {
            ...disallowedFixture.world.streamingRightsContracts!['distress-source-entitlement'],
            sublicensingAllowed: false,
        },
    },
};
const disallowedResult = progressPlatformAiDistressWorld({
    player: { ...disallowedFixture, world: disallowedWorld },
    world: disallowedWorld,
    absoluteWeek: queueWeek + 325,
});
assert.equal(disallowedResult.world.platformAiCatalogueDistressDeals?.length || 0, 1);
assert.equal(
    disallowedResult.world.platformAiCatalogueDistressDeals?.[0].sourceContractId,
    'distress-source-entitlement',
    'A full transfer remains valid even when the source contract forbids sublicensing.',
);

const acquisitionCancelled = cancelPendingPlatformAiCatalogueDistressDealsForAcquisition({
    player: { ...timeoutFixture, world: timeoutQueued.world },
    world: timeoutQueued.world,
    platformId: timeoutDeal.buyerPlatformId,
    absoluteWeek: timeoutDeal.createdAtAbsoluteWeek + 1,
});
assert.equal(acquisitionCancelled.platformAiCatalogueDistressDeals![0].status, 'CANCELLED');
assert.equal(
    acquisitionCancelled.platforms![timeoutDeal.buyerPlatformId].ai!.pendingOneTimeObligations.some(item => item.id === timeoutDeal.buyerObligationId),
    false,
    'Acquisition handoff must cancel the pending deal before player control begins.',
);

const delayedRefundFixture = catalogueDealFixture(queueWeek + 350);
const delayedRefundQueued = progressPlatformAiDistressWorld({
    player: delayedRefundFixture,
    world: delayedRefundFixture.world,
    absoluteWeek: queueWeek + 350,
});
const delayedRefundDeal = delayedRefundQueued.world.platformAiCatalogueDistressDeals![0];
const delayedRefundBuyerEconomy = settlePlatformAiEconomy({
    player: { ...delayedRefundFixture, world: delayedRefundQueued.world },
    platform: delayedRefundQueued.world.platforms![delayedRefundDeal.buyerPlatformId],
    absoluteWeek: queueWeek + 351,
});
let delayedRefundWorld = withPlatform(
    delayedRefundQueued.world,
    delayedRefundDeal.buyerPlatformId,
    () => delayedRefundBuyerEconomy.platform,
);
delayedRefundWorld = structuredClone(delayedRefundWorld);
const paidBuyerCash = delayedRefundWorld.platforms![delayedRefundDeal.buyerPlatformId].cashReserve;
const jointlyTamperedRefundWorld = structuredClone(delayedRefundWorld);
const jointlyTamperedDeal = jointlyTamperedRefundWorld.platformAiCatalogueDistressDeals![0];
jointlyTamperedDeal.priceMillions += 1_000;
jointlyTamperedRefundWorld.platforms![delayedRefundDeal.buyerPlatformId].ai!.pendingOneTimeObligations =
    jointlyTamperedRefundWorld.platforms![delayedRefundDeal.buyerPlatformId].ai!.pendingOneTimeObligations
        .map(obligation => obligation.id === delayedRefundDeal.buyerObligationId
            ? { ...obligation, amountMillions: jointlyTamperedDeal.priceMillions }
            : obligation);
const jointlyTamperedRefund = cancelPendingPlatformAiCatalogueDistressDealsForAcquisition({
    player: { ...delayedRefundFixture, world: jointlyTamperedRefundWorld },
    world: jointlyTamperedRefundWorld,
    platformId: delayedRefundDeal.sellerPlatformId,
    absoluteWeek: queueWeek + 352,
});
assert.equal(
    jointlyTamperedRefund.platforms![delayedRefundDeal.buyerPlatformId].cashReserve,
    paidBuyerCash,
    'Acquisition cancellation must not refund jointly tampered deal and obligation amounts.',
);
assert.equal(
    jointlyTamperedRefund.platformAiCatalogueDistressDeals![0].paymentDisposition,
    'INVALID_EVIDENCE',
    'Jointly tampered refund evidence must be durably rejected.',
);
const delayedRefunded = cancelPendingPlatformAiCatalogueDistressDealsForAcquisition({
    player: { ...delayedRefundFixture, world: delayedRefundWorld },
    world: delayedRefundWorld,
    platformId: delayedRefundDeal.sellerPlatformId,
    absoluteWeek: queueWeek + 352,
});
closeTo(
    delayedRefunded.platforms![delayedRefundDeal.buyerPlatformId].cashReserve - paidBuyerCash,
    delayedRefundDeal.priceMillions,
    'A delayed, save-loaded acquisition cancellation must refund the previously settled buyer exactly.',
);
assert.equal(delayedRefunded.platformAiCatalogueDistressDeals![0].paymentSettledAtAbsoluteWeek, queueWeek + 351);
assert.deepEqual(
    cancelPendingPlatformAiCatalogueDistressDealsForAcquisition({
        player: { ...delayedRefundFixture, world: delayedRefunded },
        world: delayedRefunded,
        platformId: delayedRefundDeal.sellerPlatformId,
        absoluteWeek: queueWeek + 352,
    }),
    delayedRefunded,
    'Persisted cancellation evidence must make delayed refunds exact-once.',
);

const acquiredAfterPaymentPlayer: Player = {
    ...delayedRefundFixture,
    world: delayedRefundWorld,
    ownedStreamingPlatform: {
        ...delayedRefundFixture.ownedStreamingPlatform!,
        corporateDevelopment: {
            ...delayedRefundFixture.ownedStreamingPlatform!.corporateDevelopment,
            acquiredPlatformIds: [
                ...delayedRefundFixture.ownedStreamingPlatform!.corporateDevelopment.acquiredPlatformIds,
                delayedRefundDeal.sellerPlatformId,
            ],
        },
    },
};
const acquiredSellerTransferBlocked = progressPlatformAiDistressWorld({
    player: acquiredAfterPaymentPlayer,
    world: delayedRefundWorld,
    absoluteWeek: queueWeek + 352,
});
assert.equal(
    acquiredSellerTransferBlocked.world.platformAiCatalogueDistressDeals![0].status,
    'CANCELLED',
    'A seller acquired after queueing must never auto-transfer its pending catalogue deal.',
);
closeTo(
    acquiredSellerTransferBlocked.world.platforms![delayedRefundDeal.buyerPlatformId].cashReserve - paidBuyerCash,
    delayedRefundDeal.priceMillions,
    'Blocking an acquired seller transfer must refund the already-settled buyer exactly.',
);
assert.equal(
    acquiredSellerTransferBlocked.world.platforms![delayedRefundDeal.buyerPlatformId].ai!.rightsContracts
        .some(contract => contract.id === delayedRefundDeal.buyerContractId),
    false,
    'An acquired seller cancellation must not grant catalogue rights.',
);

const liabilityCost = getStreamingRivalMoveCostMillions('EXECUTIVE_POACH');
const liabilityPlatform = structuredClone(timeoutQueued.world.platforms!.APPLE_TV);
liabilityPlatform.cashReserve = Math.max(0, liabilityCost - 3);
liabilityPlatform.ai!.debtMillions = 2;
liabilityPlatform.ai!.externalCommitments = [{
    id: 'platform-war:acquisition-liability-move',
    moveId: 'acquisition-liability-move',
    obligationId: 'platform-war:acquisition-liability-move',
        platformId: 'APPLE_TV',
        moveType: 'EXECUTIVE_POACH',
        pricingVersion: 1,
        outcome: 'SUCCESS',
    costMillions: liabilityCost,
    createdAtAbsoluteWeek: queueWeek,
    status: 'PENDING_PAYMENT',
    settledAtAbsoluteWeek: null,
}];
liabilityPlatform.ai!.pendingOneTimeObligations = [{
    id: 'platform-war:acquisition-liability-move',
    category: 'DISCRETIONARY',
    amountMillions: liabilityCost,
    createdWeek: queueWeek,
    status: 'HELD',
    settledWeek: null,
}];
const liabilityAuthoritativeMoves = [{
    id: 'acquisition-liability-move',
    platformId: 'APPLE_TV',
    type: 'EXECUTIVE_POACH',
    status: 'OPEN',
    pricingVersion: 1,
    createdAtAbsoluteWeek: queueWeek,
}] as any;
const liabilitySettled = settlePendingPlatformAiExternalCommitmentsForAcquisition(
    liabilityPlatform,
    queueWeek + 1,
    liabilityAuthoritativeMoves,
);
assert.equal(liabilitySettled.cashReserve, 0);
assert.equal(liabilitySettled.ai!.debtMillions, 5, 'Only the uncovered Platform Wars liability must carry into acquired debt.');
assert.equal(liabilitySettled.ai!.externalCommitments[0].status, 'SETTLED');
assert.equal(liabilitySettled.ai!.pendingOneTimeObligations[0].status, 'SETTLED');
assert.deepEqual(
    settlePendingPlatformAiExternalCommitmentsForAcquisition(
        liabilitySettled,
        queueWeek + 1,
        liabilityAuthoritativeMoves,
    ),
    liabilitySettled,
    'Acquisition liability settlement must be exact-once.',
);

const recoveringWorld = withPlatform(opened.world, 'NETFLIX', platform => ({
    ...platform,
    ai: { ...platform.ai!, status: 'ACTIVE', debtMillions: 0, financeHistory: [] },
}));
const recovered = progressPlatformAiDistressWorld({
    player: { ...fixture, world: recoveringWorld },
    world: recoveringWorld,
    absoluteWeek: START_WEEK + 10,
});
const recoveredEpisode = recovered.world.platforms!.NETFLIX.ai!.distressEpisodes.at(-1)!;
assert.equal(recoveredEpisode.status, 'RECOVERED');
const secondCrisisWorld = withPlatform(recovered.world, 'NETFLIX', platform => ({
    ...platform,
    ai: { ...platform.ai!, status: 'DISTRESSED', debtMillions: 10 },
}));
const secondCrisis = progressPlatformAiDistressWorld({
    player: { ...fixture, world: secondCrisisWorld },
    world: secondCrisisWorld,
    absoluteWeek: START_WEEK + 11,
});
const activeSecondEpisode = secondCrisis.world.platforms!.NETFLIX.ai!.distressEpisodes.find(item => item.status === 'ACTIVE')!;
assert.notEqual(activeSecondEpisode.id, recoveredEpisode.id, 'A later crisis must receive a new deterministic episode identity.');

const legacy = structuredClone(catalogueFixture.world.platforms!.NETFLIX) as any;
legacy.ai.schemaVersion = 7;
delete legacy.ai.distressEpisodes;
const migrated = normalizePlatformAiState(legacy, catalogueFixture.id, queueWeek);
assert.equal(migrated.ai!.schemaVersion, PLATFORM_AI_RUNTIME_SCHEMA_VERSION);
assert.equal(migrated.ai!.distressEpisodes.length, 1, 'Legacy distress must start one conservative fresh episode.');
assert.equal(catalogueFixture.world.platformAiCatalogueDistressDeals?.length, 0, 'Runtime migration may not synthesize historical deals or payments.');

const malformedMigrated = migratePlayerSave({
    ...catalogueFixture,
    world: {
        ...catalogueFixture.world,
        platformAiCatalogueDistressDeals: [{
            id: 'malformed-migrated-deal',
            status: 'PENDING_PAYMENT',
            sellerPlatformId: 'NETFLIX',
            buyerPlatformId: 'APPLE_TV',
            priceMillions: Number.NaN,
        } as any],
    },
});
assert.deepEqual(
    malformedMigrated.world.platformAiCatalogueDistressDeals,
    [],
    'Save migration must canonicalize and reject malformed world-level distress deals.',
);

const settlementAuthority = catalogueDealFixture(queueWeek + 400);
const authoritySeller = settlementAuthority.world.platforms!.NETFLIX;
const authoritySettled = settlePlatformAiEconomy({
    player: settlementAuthority,
    platform: authoritySeller,
    absoluteWeek: queueWeek + 400,
});
assert.equal(
    authoritySettled.platform.ai!.distressEpisodes[0].stageResults.length,
    authoritySeller.ai!.distressEpisodes[0].stageResults.length,
    'Economy settlement must not independently advance the world-level distress ladder.',
);
assert.equal(
    authoritySettled.platform.ai!.decisionHistory.filter(decision => (
        decision.type === 'DISTRESS_RESPONSE' && decision.absoluteWeek === queueWeek + 400
    )).length,
    0,
    'Economy settlement must not run a parallel decision-history distress authority.',
);

const turnFixture = distressedFixture();
const turnWorld = withPlatform(turnFixture.world, 'NETFLIX', platform => ({
    ...platform,
    ai: {
        ...platform.ai!,
        lastProcessedAbsoluteWeek: START_WEEK - 1,
        distressEpisodes: [],
        decisionHistory: [],
    },
}));
const turnResult = processPlatformAiWorldTurn(
    { ...turnFixture, world: turnWorld },
    turnWorld,
    START_WEEK,
);
assert.equal(
    turnResult.world.platforms!.NETFLIX.ai!.distressEpisodes[0]?.stageResults[0]?.stage,
    'FREEZE_GREENLIGHTS',
    'The canonical weekly turn must run the world-level distress resolver after platform economies.',
);

const pressurePendingProject: IndustryProject = { ...catalogueProject, id: 'pending-pressure-project', title: 'Preserved Pending Asset' };
const pressureDeals = [
    ...Array.from({ length: 110 }, (_, index) => ({
        ...transferredDeal,
        id: `terminal-pressure-${index}`,
        buyerObligationId: `terminal-pressure-obligation-${index}`,
        buyerPlanId: `terminal-pressure-plan-${index}`,
        buyerContractId: `terminal-pressure-contract-${index}`,
        status: 'CANCELLED' as const,
        transferredAtAbsoluteWeek: null,
        cancelledAtAbsoluteWeek: 5_000 + index,
        cancellationReason: 'History pressure.',
    })),
    {
        ...queuedDeal,
        id: 'pending-pressure-deal',
        sourceProjectId: pressurePendingProject.id,
        buyerObligationId: 'pending-pressure-obligation',
        buyerPlanId: 'pending-pressure-plan',
        buyerContractId: 'pending-pressure-contract',
        status: 'PENDING_PAYMENT' as const,
        createdAtAbsoluteWeek: 6_000,
    },
];
const pressureProjects = Array.from({ length: 930 }, (_, index) => ({
    ...catalogueProject,
    id: `pressure-project-${index}`,
    title: `Pressure Project ${index}`,
}));
const compactSource: Player = {
    ...catalogueFixture,
    world: {
        ...transferred.world,
        projects: [...pressureProjects, pressurePendingProject],
        platformAiCatalogueDistressDeals: pressureDeals,
    },
};
const compacted = compactPlayerForPersistence(compactSource);
assert.equal(compacted.world.platformAiCatalogueDistressDeals?.length, 105, 'Compaction must retain all pending and latest 104 terminal deals.');
assert.ok(compacted.world.platformAiCatalogueDistressDeals?.some(deal => deal.id === 'pending-pressure-deal'));
assert.ok(compacted.world.projects.some(project => project.id === pressurePendingProject.id), 'A pending deal source project must survive the global project cap.');

console.log('Platform AI durable distress episode audit passed.');
