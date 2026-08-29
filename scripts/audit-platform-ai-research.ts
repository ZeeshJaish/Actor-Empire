import assert from 'node:assert/strict';
import type {
    PlatformAiCapabilities,
    PlatformAiContentPlan,
    PlatformAiResearchItem,
    PlatformId,
    WorldState,
} from '../types';
import { PLATFORM_AI_RUNTIME_SCHEMA_VERSION } from '../types';
import {
    STREAMING_RESEARCH_DEFINITIONS,
} from '../services/streamingResearchLifecycle';
import {
    STREAMING_TECHNOLOGY_DEFINITIONS,
    previewStreamingTechnologyProject,
} from '../services/streamingTechnologyCampus';
import {
    STREAMING_DAY_ONE_MARKETS,
    getStreamingCountryMarketProfile,
    getStreamingDayOneRegionIds,
    normalizeStreamingDayOneMarketIds,
} from '../services/streamingDayOneMarkets';
import { fullCurrencyToMillions, millionsToFullCurrency } from '../services/streamingRightsCore';
import { previewStreamingResearchProgram } from '../services/streamingResearchCore';
import {
    getStreamingMarketPolicySnapshot,
    getStreamingMarketWeeklyOperatingCost,
} from '../services/streamingMarketsCore';
import {
    choosePlatformMarketExpansion,
    commitPlatformMarketExpansion,
    getPlatformActiveCountryIds,
    progressPlatformMarketExpansion,
} from '../services/platformAi/platformAiMarkets';
import {
    clampPlatformContentPlanSupport,
    choosePlatformResearch,
    commitPlatformResearch,
    getPlatformResearchRecurringCostMillions,
    progressPlatformResearch,
    resolvePlatformLocalizationLevel,
} from '../services/platformAi/platformAiResearch';
import {
    normalizePlatformAiState,
    normalizeWorldPlatformAi,
} from '../services/platformAi/platformAiState';
import {
    buildPlatformContentCandidates,
    commitPlatformContentCandidate,
} from '../services/platformAi/platformAiContentSourcing';
import { createPlatformAiFixture } from './helpers/platformAiFixture';
import * as PlatformAi from '../services/platformAi';

const platformId: PlatformId = 'NETFLIX';
const absoluteWeek = 1_200;
const canonicalCountryIds = new Set(STREAMING_DAY_ONE_MARKETS.map(market => market.id));
const canonicalResearchIds = new Set(STREAMING_RESEARCH_DEFINITIONS.map(definition => definition.id));
const canonicalTechnologyIds = new Set(STREAMING_TECHNOLOGY_DEFINITIONS.map(definition => definition.id));

const zeroTechnologyLevels = (): PlatformAiCapabilities['technologyLevels'] => ({
    DELIVERY_CAPACITY: 0,
    PLAYBACK_QUALITY: 0,
    RELIABILITY: 0,
    DATA_RECOMMENDATIONS: 0,
    SECURITY: 0,
    CONTENT_OPERATIONS: 0,
    ADVERTISING_COMMERCE: 0,
    PRODUCT_EXPERIENCE: 0,
});

const createWorld = (): { player: ReturnType<typeof createPlatformAiFixture>; world: WorldState } => {
    const player = createPlatformAiFixture();
    const normalized = normalizeWorldPlatformAi(player, player.world, absoluteWeek);
    const platform = normalized.platforms![platformId];
    const world: WorldState = {
        ...normalized,
        platforms: {
            ...normalized.platforms!,
            [platformId]: {
                ...platform,
                cashReserve: 2_000,
                ai: {
                    ...platform.ai!,
                    status: 'ACTIVE',
                    capabilities: {
                        activeCountryIds: ['US'],
                        technologyLevels: zeroTechnologyLevels(),
                        subtitleCoveragePercent: 0,
                        dubCoveragePercent: 0,
                    },
                    researchQueue: [],
                    marketOperations: [],
                },
            },
        },
    };
    return { player, world };
};

const getPlatform = (world: WorldState) => world.platforms![platformId];
const getResearch = (world: WorldState, researchId: string): PlatformAiResearchItem => {
    const item = getPlatform(world).ai!.researchQueue.find(candidate => candidate.id === researchId);
    assert.ok(item, `Research item ${researchId} should exist.`);
    return item;
};

// Starting and legacy country support is materialized once as canonical ACTIVE operations.
const migrationFixture = createPlatformAiFixture();
const migrationSource = migrationFixture.world.platforms![platformId];
const migrationCash = migrationSource.cashReserve;
const normalizedStartingPlatform = normalizePlatformAiState(migrationSource, migrationFixture.id, absoluteWeek);
const startingActiveCountryIds = normalizedStartingPlatform.ai!.capabilities.activeCountryIds;
assert.ok(startingActiveCountryIds.length > 0);
assert.equal(normalizedStartingPlatform.cashReserve, migrationCash);
assert.equal(normalizedStartingPlatform.ai!.decisionHistory.length, 0);
assert.equal(normalizedStartingPlatform.ai!.marketOperations.length, startingActiveCountryIds.length);
for (const countryId of startingActiveCountryIds) {
    const operation = normalizedStartingPlatform.ai!.marketOperations.find(item => item.countryId === countryId);
    const profile = getStreamingCountryMarketProfile(countryId)!;
    assert.ok(operation, `Starting market ${countryId} must have an operation.`);
    assert.equal(operation.status, 'ACTIVE');
    assert.equal(operation.source, 'PLATFORM_AI');
    assert.deepEqual(operation.countryProfile, profile);
    assert.deepEqual(operation.policySnapshot, getStreamingMarketPolicySnapshot(profile, absoluteWeek));
    assert.equal(operation.weeklyOperatingCost, getStreamingMarketWeeklyOperatingCost(profile));
}
assert.deepEqual(
    normalizePlatformAiState(normalizedStartingPlatform, migrationFixture.id, absoluteWeek),
    normalizedStartingPlatform,
);

const existingOperationPlatform = structuredClone(normalizedStartingPlatform) as any;
const existingUsOperation = existingOperationPlatform.ai.marketOperations.find((item: any) => item.countryId === 'US');
assert.ok(existingUsOperation);
existingUsOperation.id = 'existing-us-operation-wins';
existingOperationPlatform.ai.schemaVersion = 2;
existingOperationPlatform.ai.marketOperations.push({ ...existingUsOperation, id: 'duplicate-us-operation-loses' });
const normalizedExistingOperation = normalizePlatformAiState(existingOperationPlatform, migrationFixture.id, absoluteWeek);
const normalizedUsOperations = normalizedExistingOperation.ai!.marketOperations.filter(item => item.countryId === 'US');
assert.equal(normalizedUsOperations.length, 1);
assert.equal(normalizedUsOperations[0].id, 'existing-us-operation-wins');
assert.deepEqual(
    normalizedExistingOperation.ai!.capabilities.activeCountryIds,
    normalizeStreamingDayOneMarketIds(normalizedExistingOperation.ai!.marketOperations
        .filter(item => item.status === 'ACTIVE' && item.countryId)
        .map(item => item.countryId!)),
);

// Canonical capability and localization semantics.
const { player, world: initialWorld } = createWorld();
const getResearchCapacity = (PlatformAi as Record<string, unknown>).getPlatformAiResearchCapacity;
const chooseResearchPortfolio = (PlatformAi as Record<string, unknown>).choosePlatformResearchPortfolio;
assert.equal(typeof getResearchCapacity, 'function', 'Phase 4 must expose dynamic research capacity.');
assert.equal(typeof chooseResearchPortfolio, 'function', 'Phase 4 must expose portfolio research selection.');
const operatingProfile = PlatformAi.getPlatformAiOperatingProfile(platformId);
const moderateGlobalWorld = structuredClone(initialWorld);
moderateGlobalWorld.platforms![platformId].cashReserve = 1_000;
const regionalCapacity = (getResearchCapacity as Function)({
    player,
    world: moderateGlobalWorld,
    platformId,
    absoluteWeek,
    operatingProfileOverride: { ...operatingProfile, scale: 'REGIONAL', researchOrganizationLevel: 5 },
});
assert.equal(regionalCapacity.capacity, 1);
const matureCapacity = (getResearchCapacity as Function)({
    player,
    world: initialWorld,
    platformId: 'HULU',
    absoluteWeek,
});
assert.equal(matureCapacity.capacity, 2);
const globalCapacity = (getResearchCapacity as Function)({
    player,
    world: moderateGlobalWorld,
    platformId,
    absoluteWeek,
});
assert.equal(globalCapacity.capacity, 3);
const surplusGlobalWorld = structuredClone(initialWorld);
surplusGlobalWorld.platforms![platformId].cashReserve = 10_000;
const surplusCapacity = (getResearchCapacity as Function)({
    player,
    world: surplusGlobalWorld,
    platformId,
    absoluteWeek,
});
assert.equal(surplusCapacity.capacity, 4);
const distressedCapacityWorld = structuredClone(initialWorld);
distressedCapacityWorld.platforms![platformId].ai!.status = 'DISTRESSED';
const distressedCapacity = (getResearchCapacity as Function)({
    player,
    world: distressedCapacityWorld,
    platformId,
    absoluteWeek,
});
assert.equal(distressedCapacity.availableSlots, 0);
assert.equal(distressedCapacity.blockedReason, 'DISTRESSED');
const restrictedCapacityWorld = structuredClone(initialWorld);
restrictedCapacityWorld.platforms![platformId].ai!.spendingRestrictions = {
    source: 'EXTERNAL_RECAPITALIZATION',
    blocksNewBids: true,
    blocksNewGreenlights: true,
    blocksNewResearch: true,
    blocksExpansion: true,
    expiresAtAbsoluteWeek: absoluteWeek + 13,
};
const restrictedCapacity = (getResearchCapacity as Function)({
    player,
    world: restrictedCapacityWorld,
    platformId,
    absoluteWeek,
});
assert.equal(restrictedCapacity.availableSlots, 0, 'Funding covenants must prevent new research commitments.');
assert.equal(restrictedCapacity.blockedReason, 'DISTRESSED');
const expiredRestrictedCapacity = (getResearchCapacity as Function)({
    player,
    world: restrictedCapacityWorld,
    platformId,
    absoluteWeek: absoluteWeek + 13,
});
assert.ok(expiredRestrictedCapacity.availableSlots > 0, 'A healthy active platform must resume research after covenant expiry.');
const cashTightWorld = structuredClone(initialWorld);
cashTightWorld.platforms![platformId].cashReserve = 700;
const cashTightPortfolio = (chooseResearchPortfolio as Function)({
    player,
    world: cashTightWorld,
    platformId,
    absoluteWeek,
});
assert.ok(cashTightPortfolio.projectedCashAfter >= cashTightPortfolio.requiredReserveMillions);
assert.ok(cashTightPortfolio.choices.length < 4, 'One cash reserve cannot be reused to approve four projects.');
const hundredDecisionHistory = Array.from({ length: 100 }, (_, index) => ({
    id: `research-market-history-${index}`,
    absoluteWeek: index,
    type: 'AUDIT_HISTORY',
    summary: `Decision ${index}`,
    reason: 'Fixture',
    cashImpactMillions: 0,
}));
const capabilities = getPlatform(initialWorld).ai!.capabilities;
assert.deepEqual(normalizeStreamingDayOneMarketIds(capabilities.activeCountryIds), capabilities.activeCountryIds);
assert.equal(resolvePlatformLocalizationLevel({ ...capabilities, subtitleCoveragePercent: 0, dubCoveragePercent: 0 }), 'NONE');
assert.equal(resolvePlatformLocalizationLevel({ ...capabilities, subtitleCoveragePercent: 35, dubCoveragePercent: 0 }), 'SUBTITLES');
assert.equal(resolvePlatformLocalizationLevel({ ...capabilities, subtitleCoveragePercent: 35, dubCoveragePercent: 20 }), 'DUBS_AND_SUBTITLES');

// Research selection and commitment must be backed by the player catalogues and exact previews.
const researchChoice = choosePlatformResearch({ player, world: initialWorld, platformId, absoluteWeek });
assert.ok(researchChoice);
assert.ok(canonicalResearchIds.has(researchChoice.researchDefinitionId));
assert.ok(canonicalTechnologyIds.has(researchChoice.technologyDefinitionId));
const researchDefinition = STREAMING_RESEARCH_DEFINITIONS.find(item => item.id === researchChoice.researchDefinitionId)!;
const technologyDefinition = STREAMING_TECHNOLOGY_DEFINITIONS.find(item => item.id === researchChoice.technologyDefinitionId)!;
const prerequisite = technologyDefinition.prerequisiteId
    ? STREAMING_TECHNOLOGY_DEFINITIONS.find(item => item.id === technologyDefinition.prerequisiteId)
    : null;
assert.ok(!prerequisite || capabilities.technologyLevels[technologyDefinition.branch] >= prerequisite.targetLevel);
const researchPreview = previewStreamingResearchProgram(researchDefinition, researchChoice.buildMode);
const technologyPreview = previewStreamingTechnologyProject(technologyDefinition, researchChoice.buildMode);
const cashBeforeResearch = getPlatform(initialWorld).cashReserve;
const committedResearch = commitPlatformResearch({ player, world: initialWorld, platformId, absoluteWeek, choice: researchChoice });
assert.equal(committedResearch.changed, true);
assert.ok(committedResearch.item);
assert.deepEqual(committedResearch.changedItems, [committedResearch.item]);
assert.equal(committedResearch.item.researchDefinitionId, researchDefinition.id);
assert.equal(committedResearch.item.technologyDefinitionId, technologyDefinition.id);
assert.equal(committedResearch.item.targetLevel, technologyDefinition.targetLevel);
assert.ok(
    committedResearch.item.researchCostMillions < fullCurrencyToMillions(researchPreview.researchCost),
    'AI research must receive only the persisted bounded profile efficiency.',
);
assert.equal(
    (committedResearch.item as any).efficiencySnapshot?.standardCostMillions,
    fullCurrencyToMillions(researchPreview.researchCost),
);
assert.ok(Math.abs(
    (committedResearch.item as any).efficiencySnapshot?.savingMillions
        - (fullCurrencyToMillions(researchPreview.researchCost) - committedResearch.item.researchCostMillions),
) < 0.000001);
assert.equal(committedResearch.item.researchWeeks, researchPreview.researchWeeks);
assert.equal(committedResearch.item.prototypeWeeks, researchPreview.prototypeWeeks);
assert.equal(committedResearch.item.testWeeks, researchPreview.testWeeks);
assert.equal(committedResearch.item.installationWeeks, technologyPreview.constructionWeeks);
const boundedResearchWorld = structuredClone(initialWorld);
boundedResearchWorld.platforms![platformId].ai!.decisionHistory = hundredDecisionHistory;
const boundedResearch = commitPlatformResearch({ player, world: boundedResearchWorld, platformId, absoluteWeek, choice: researchChoice });
assert.equal(boundedResearch.changed, true);
assert.equal(getPlatform(boundedResearch.world).ai!.decisionHistory.length, 40);
assert.equal(getPlatform(boundedResearch.world).ai!.decisionHistory[0].id, 'research-market-history-61');
assert.equal(getPlatform(boundedResearch.world).ai!.decisionHistory.at(-1)?.type, 'RESEARCH_COMMITTED');
assert.ok(committedResearch.item.installationCostMillions < fullCurrencyToMillions(technologyPreview.capitalCost));
assert.equal(
    (committedResearch.item as any).installationEfficiencySnapshot?.standardCostMillions,
    fullCurrencyToMillions(technologyPreview.capitalCost),
);
assert.equal(
    committedResearch.item.researchWeeklyOperatingCostMillions,
    fullCurrencyToMillions(researchDefinition.weeklyOperatingCost),
);
assert.equal(committedResearch.item.licenseWeeklyCostMillions, 0);
assert.equal(getPlatformResearchRecurringCostMillions(committedResearch.item), 0);
assert.equal(
    millionsToFullCurrency(committedResearch.item.installationCostMillions),
    Math.round(technologyPreview.capitalCost * (committedResearch.item as any).installationEfficiencySnapshot.costMultiplier),
);
assert.equal(getPlatform(committedResearch.world).cashReserve, cashBeforeResearch - committedResearch.item.researchCostMillions);
assert.equal(getPlatform(committedResearch.world).ai!.lastProcessedAbsoluteWeek, getPlatform(initialWorld).ai!.lastProcessedAbsoluteWeek);
const repeatedCommit = commitPlatformResearch({ player, world: committedResearch.world, platformId, absoluteWeek, choice: researchChoice });
assert.deepEqual(repeatedCommit.world, committedResearch.world);
assert.deepEqual(repeatedCommit.changedItems, []);

const twoResearchWorld = structuredClone(committedResearch.world);
const secondResearchItem = {
    ...committedResearch.item,
    id: `${committedResearch.item.id}:simultaneous`,
    idempotencyKey: `${committedResearch.item.idempotencyKey}:simultaneous`,
};
twoResearchWorld.platforms![platformId].ai!.researchQueue = [committedResearch.item, secondResearchItem];
const simultaneousResearchWeek = committedResearch.item.stageReadyAtAbsoluteWeek;
const simultaneousResearchProgress = progressPlatformResearch({
    player,
    world: twoResearchWorld,
    platformId,
    absoluteWeek: simultaneousResearchWeek,
});
assert.deepEqual(
    simultaneousResearchProgress.changedItems.map(item => item.id).sort(),
    [committedResearch.item.id, secondResearchItem.id].sort(),
);
assert.ok(simultaneousResearchProgress.changedItems.every(item => item.stage === 'PROTOTYPING'));

const tierTwoResearch = STREAMING_RESEARCH_DEFINITIONS.find(definition => {
    const technology = STREAMING_TECHNOLOGY_DEFINITIONS.find(item => item.id === definition.mappedTechnologyId);
    return Boolean(technology?.prerequisiteId);
})!;
const tierTwoTechnology = STREAMING_TECHNOLOGY_DEFINITIONS.find(item => item.id === tierTwoResearch.mappedTechnologyId)!;
const blockedTierTwo = commitPlatformResearch({
    player,
    world: initialWorld,
    platformId,
    absoluteWeek,
    choice: {
        researchDefinitionId: tierTwoResearch.id,
        technologyDefinitionId: tierTwoTechnology.id,
        buildMode: 'BALANCED',
        ipStrategy: 'PATENT',
        priority: 100,
    },
});
assert.equal(blockedTierTwo.reason, 'NO_CHOICE');
assert.deepEqual(blockedTierTwo.world, initialWorld);

// Same-week progress is idempotent. Research reaches READY_TO_INSTALL without granting technology.
const researchId = committedResearch.item.id;
const sameResearchWeek = progressPlatformResearch({ player, world: committedResearch.world, platformId, absoluteWeek });
assert.deepEqual(sameResearchWeek.world, committedResearch.world);
let researchWorld = committedResearch.world;
let researchWeek = absoluteWeek;
for (let guard = 0; guard < 12 && getResearch(researchWorld, researchId).stage !== 'READY_TO_INSTALL'; guard += 1) {
    const item = getResearch(researchWorld, researchId);
    researchWeek = Math.max(researchWeek + 1, item.stageReadyAtAbsoluteWeek);
    const progressed = progressPlatformResearch({ player, world: researchWorld, platformId, absoluteWeek: researchWeek });
    assert.equal(progressed.changed, true);
    const repeated = progressPlatformResearch({ player, world: progressed.world, platformId, absoluteWeek: researchWeek });
    assert.deepEqual(repeated.world, progressed.world);
    researchWorld = progressed.world;
}
assert.equal(getResearch(researchWorld, researchId).stage, 'READY_TO_INSTALL');
assert.equal(getPlatform(researchWorld).ai!.capabilities.technologyLevels[technologyDefinition.branch], 0);

// Installation is separately funded and exact target benefit appears only when it is operating.
researchWeek += 1;
const installing = progressPlatformResearch({ player, world: researchWorld, platformId, absoluteWeek: researchWeek });
assert.equal(getResearch(installing.world, researchId).stage, 'INSTALLING');
assert.equal(getPlatform(installing.world).ai!.capabilities.technologyLevels[technologyDefinition.branch], 0);
const installationReadyWeek = getResearch(installing.world, researchId).stageReadyAtAbsoluteWeek;
const distressedInstallationWorld = structuredClone(installing.world);
distressedInstallationWorld.platforms![platformId].ai!.status = 'DISTRESSED';
const completedWhileDistressed = progressPlatformResearch({
    player,
    world: distressedInstallationWorld,
    platformId,
    absoluteWeek: installationReadyWeek,
});
assert.equal(getResearch(completedWhileDistressed.world, researchId).stage, 'OPERATING');
assert.equal(
    getPlatform(completedWhileDistressed.world).ai!.capabilities.technologyLevels[technologyDefinition.branch],
    technologyDefinition.targetLevel,
);
const operating = progressPlatformResearch({ player, world: installing.world, platformId, absoluteWeek: installationReadyWeek });
assert.equal(getResearch(operating.world, researchId).stage, 'OPERATING');
assert.equal(
    getPlatform(operating.world).ai!.capabilities.technologyLevels[technologyDefinition.branch],
    technologyDefinition.targetLevel,
);
assert.equal(
    getPlatformResearchRecurringCostMillions(getResearch(operating.world, researchId)),
    fullCurrencyToMillions(researchDefinition.weeklyOperatingCost),
);
assert.ok(getPlatform(operating.world).ai!.researchQueue.every(item => canonicalResearchIds.has(item.researchDefinitionId)));
assert.ok(getPlatform(operating.world).ai!.researchQueue.every(item => canonicalTechnologyIds.has(item.technologyDefinitionId)));

const licensedResearch = commitPlatformResearch({
    player,
    world: initialWorld,
    platformId,
    absoluteWeek,
    choice: { ...researchChoice, ipStrategy: 'LICENSE' },
});
assert.ok(licensedResearch.item);
assert.equal(
    licensedResearch.item.researchWeeklyOperatingCostMillions,
    fullCurrencyToMillions(researchDefinition.weeklyOperatingCost),
);
assert.equal(
    licensedResearch.item.licenseWeeklyCostMillions,
    fullCurrencyToMillions(researchDefinition.licenseWeeklyCost),
);

const fullQueueWorld = structuredClone(committedResearch.world);
const fullQueueCapacity = (getResearchCapacity as Function)({
    player,
    world: fullQueueWorld,
    platformId,
    absoluteWeek: absoluteWeek + 1,
}).capacity;
fullQueueWorld.platforms![platformId].ai!.researchQueue = Array.from(
    { length: fullQueueCapacity },
    (_, index) => ({
        ...committedResearch.item,
        id: `${committedResearch.item.id}:active:${index}`,
        idempotencyKey: `${committedResearch.item.idempotencyKey}:active:${index}`,
    }),
);
assert.equal(choosePlatformResearch({ player, world: fullQueueWorld, platformId, absoluteWeek: absoluteWeek + 1 }), null);
const distressedWorld = structuredClone(initialWorld);
distressedWorld.platforms![platformId].ai!.status = 'DISTRESSED';
assert.equal(choosePlatformResearch({ player, world: distressedWorld, platformId, absoluteWeek: absoluteWeek + 1 }), null);
assert.equal(commitPlatformResearch({ player, world: distressedWorld, platformId, absoluteWeek: absoluteWeek + 1 }).reason, 'DISTRESSED');

// Market expansion uses real country dossiers, exact entry cost, staged clearance, and same-week guards.
assert.equal(
    choosePlatformMarketExpansion({ player, world: restrictedCapacityWorld, platformId, absoluteWeek }),
    null,
    'Funding covenants must prevent a new market expansion decision.',
);
assert.equal(
    commitPlatformMarketExpansion({ player, world: restrictedCapacityWorld, platformId, absoluteWeek }).changed,
    false,
    'Funding covenants must prevent direct market-expansion commits.',
);
const marketChoice = choosePlatformMarketExpansion({ player, world: initialWorld, platformId, absoluteWeek });
assert.ok(marketChoice);
assert.ok(canonicalCountryIds.has(marketChoice.countryId));
const marketProfile = getStreamingCountryMarketProfile(marketChoice.countryId)!;
const cashBeforeMarket = getPlatform(initialWorld).cashReserve;
const committedMarket = commitPlatformMarketExpansion({ player, world: initialWorld, platformId, absoluteWeek, countryId: marketChoice.countryId });
assert.equal(committedMarket.changed, true);
assert.ok(committedMarket.operation);
assert.deepEqual(committedMarket.changedOperations, [committedMarket.operation]);
assert.deepEqual(committedMarket.operation.countryProfile, marketProfile);
assert.ok(committedMarket.operation.plannedCosts.total < marketProfile.entryCosts.total);
assert.equal(
    (committedMarket.operation as any).platformAiEfficiencySnapshot?.standardCostMillions,
    fullCurrencyToMillions(marketProfile.entryCosts.total),
);
assert.equal(
    getPlatform(committedMarket.world).cashReserve,
    cashBeforeMarket - fullCurrencyToMillions(committedMarket.operation.plannedCosts.total),
);
assert.equal(
    millionsToFullCurrency(fullCurrencyToMillions(committedMarket.operation.plannedCosts.total)),
    committedMarket.operation.plannedCosts.total,
);
assert.equal(getPlatform(committedMarket.world).ai!.lastProcessedAbsoluteWeek, getPlatform(initialWorld).ai!.lastProcessedAbsoluteWeek);
assert.notEqual(committedMarket.operation.status, 'ACTIVE');
const partnershipMarket = commitPlatformMarketExpansion({
    player,
    world: initialWorld,
    platformId,
    absoluteWeek,
    countryId: 'FR',
});
assert.equal(partnershipMarket.changed, true);
assert.ok((partnershipMarket.operation as any).platformAiPartnership);
assert.ok((partnershipMarket.operation as any).platformAiPartnership.weeklyPremium > 0);
const boundedMarketWorld = structuredClone(initialWorld);
boundedMarketWorld.platforms![platformId].ai!.decisionHistory = hundredDecisionHistory;
const boundedMarket = commitPlatformMarketExpansion({ player, world: boundedMarketWorld, platformId, absoluteWeek, countryId: marketChoice.countryId });
assert.equal(boundedMarket.changed, true);
assert.equal(getPlatform(boundedMarket.world).ai!.decisionHistory.length, 40);
assert.equal(getPlatform(boundedMarket.world).ai!.decisionHistory[0].id, 'research-market-history-61');
assert.equal(getPlatform(boundedMarket.world).ai!.decisionHistory.at(-1)?.type, 'MARKET_EXPANSION_COMMITTED');
const repeatedMarketCommit = commitPlatformMarketExpansion({ player, world: committedMarket.world, platformId, absoluteWeek, countryId: marketChoice.countryId });
assert.deepEqual(repeatedMarketCommit.world, committedMarket.world);
assert.deepEqual(repeatedMarketCommit.changedOperations, []);
const sameMarketWeek = progressPlatformMarketExpansion({ player, world: committedMarket.world, platformId, absoluteWeek });
assert.deepEqual(sameMarketWeek.world, committedMarket.world);

const secondMarketChoice = choosePlatformMarketExpansion({
    player,
    world: committedMarket.world,
    platformId,
    absoluteWeek,
});
assert.ok(secondMarketChoice);
const secondCommittedMarket = commitPlatformMarketExpansion({
    player,
    world: committedMarket.world,
    platformId,
    absoluteWeek,
    countryId: secondMarketChoice.countryId,
});
assert.equal(secondCommittedMarket.changed, true);
const simultaneousMarketProgress = progressPlatformMarketExpansion({
    player,
    world: secondCommittedMarket.world,
    platformId,
    absoluteWeek: absoluteWeek + 1,
});
assert.equal(simultaneousMarketProgress.changedOperations.length, 2);
assert.deepEqual(
    simultaneousMarketProgress.changedOperations.map(operation => operation.countryId).sort(),
    [marketChoice.countryId, secondMarketChoice.countryId].sort(),
);

let marketWorld = committedMarket.world;
let sawInfrastructure = false;
let marketWeek = absoluteWeek;
for (let guard = 0; guard < 40 && !getPlatformActiveCountryIds(marketWorld, platformId).includes(marketChoice.countryId); guard += 1) {
    marketWeek += 1;
    const progressed = progressPlatformMarketExpansion({ player, world: marketWorld, platformId, absoluteWeek: marketWeek });
    const operation = getPlatform(progressed.world).ai!.marketOperations.find(item => item.countryId === marketChoice.countryId)!;
    sawInfrastructure ||= operation.status === 'INFRASTRUCTURE_PREPARATION' || operation.status === 'READY';
    if (operation.status === 'ACTIVE') assert.equal(sawInfrastructure, true);
    const repeated = progressPlatformMarketExpansion({ player, world: progressed.world, platformId, absoluteWeek: marketWeek });
    assert.deepEqual(repeated.world, progressed.world);
    marketWorld = progressed.world;
}
assert.equal(sawInfrastructure, true);
assert.ok(getPlatformActiveCountryIds(marketWorld, platformId).includes(marketChoice.countryId));
assert.ok(getPlatform(marketWorld).ai!.capabilities.activeCountryIds.every(id => canonicalCountryIds.has(id)));
assert.ok(getStreamingDayOneRegionIds(getPlatformActiveCountryIds(marketWorld, platformId)).length > 0);

// Plans are clamped to country and localization support.
const unsupportedPlan = {
    id: 'support-clamp-audit',
    localizationLevel: 'DUBS_AND_SUBTITLES',
    releaseCountryIds: ['US', 'ZZ'],
} as PlatformAiContentPlan;
const clampedPlan = clampPlatformContentPlanSupport(unsupportedPlan, {
    ...capabilities,
    activeCountryIds: ['US'],
    subtitleCoveragePercent: 35,
    dubCoveragePercent: 0,
});
assert.deepEqual(clampedPlan.releaseCountryIds, ['US']);
assert.equal(clampedPlan.localizationLevel, 'SUBTITLES');

// Content commitment must save support from the normalized operation authority, never stale raw capabilities.
const staleSupportWorld = structuredClone(initialWorld) as any;
const staleSupportPlatform = staleSupportWorld.platforms[platformId];
const existingCanadaOperation = structuredClone(normalizedStartingPlatform.ai!.marketOperations.find(item => item.countryId === 'CA'));
assert.ok(existingCanadaOperation);
staleSupportPlatform.ai.schemaVersion = 2;
staleSupportPlatform.ai.capabilities.activeCountryIds = ['US', 'ZZ'];
staleSupportPlatform.ai.capabilities.subtitleCoveragePercent = 0;
staleSupportPlatform.ai.capabilities.dubCoveragePercent = 0;
staleSupportPlatform.ai.marketOperations = [existingCanadaOperation];
staleSupportPlatform.ai.slate = [];
const normalizedSupportPlatform = normalizePlatformAiState(staleSupportPlatform, player.id, absoluteWeek);
assert.deepEqual(normalizedSupportPlatform.ai!.capabilities.activeCountryIds, ['CA', 'US']);
const normalizedSupportCandidates = buildPlatformContentCandidates({
    player,
    world: staleSupportWorld,
    platformId,
    absoluteWeek,
});
const normalizedSupportOriginal = normalizedSupportCandidates.find(candidate => candidate.source === 'COMMISSIONED_ORIGINAL');
assert.ok(normalizedSupportOriginal);
const normalizedSupportCommit = commitPlatformContentCandidate({
    player,
    world: staleSupportWorld,
    platformId,
    absoluteWeek,
    candidate: normalizedSupportOriginal,
});
assert.equal(normalizedSupportCommit.changed, true);
assert.ok(normalizedSupportCommit.plan);
assert.deepEqual(normalizedSupportCommit.plan.releaseCountryIds, normalizedSupportPlatform.ai!.capabilities.activeCountryIds);
assert.equal(normalizedSupportCommit.plan.localizationLevel, 'NONE');
assert.deepEqual(
    normalizedSupportCommit.world.platforms![platformId].ai!.slate.at(-1),
    normalizedSupportCommit.plan,
);

// Acquired platforms are immutable to all Phase 4 AI entry points.
const acquiredPlayer = structuredClone(player);
acquiredPlayer.ownedStreamingPlatform.corporateDevelopment.acquiredPlatformIds = [platformId];
assert.equal(choosePlatformResearch({ player: acquiredPlayer, world: initialWorld, platformId, absoluteWeek }), null);
assert.equal(choosePlatformMarketExpansion({ player: acquiredPlayer, world: initialWorld, platformId, absoluteWeek }), null);
assert.deepEqual(
    commitPlatformResearch({ player: acquiredPlayer, world: initialWorld, platformId, absoluteWeek, choice: researchChoice }).world,
    initialWorld,
);
assert.deepEqual(
    progressPlatformResearch({ player: acquiredPlayer, world: committedResearch.world, platformId, absoluteWeek: researchWeek }).world,
    committedResearch.world,
);
assert.deepEqual(
    commitPlatformMarketExpansion({ player: acquiredPlayer, world: initialWorld, platformId, absoluteWeek, countryId: marketChoice.countryId }).world,
    initialWorld,
);
assert.deepEqual(
    progressPlatformMarketExpansion({ player: acquiredPlayer, world: committedMarket.world, platformId, absoluteWeek: marketWeek }).world,
    committedMarket.world,
);

// Legacy parallel capability/region saves migrate without charging, replay, or lost planning history.
const legacyPlatform = structuredClone(getPlatform(committedResearch.world)) as any;
const preservedCash = legacyPlatform.cashReserve;
legacyPlatform.ai.schemaVersion = 1;
legacyPlatform.ai.capabilities = {
    activeRegionIds: ['NORTH_AMERICA', 'EUROPE', 'MIDDLE_EAST_AND_AFRICA'],
    subtitleCoverageLevel: 7,
    dubbingCoverageLevel: 4,
    playbackLevel: 5,
    deliveryLevel: 6,
    recommendationLevel: 7,
    contentOperationsLevel: 5,
    localizationLevel: 5,
    securityLevel: 4,
    reliabilityLevel: 6,
};
legacyPlatform.ai.marketOperations = undefined;
legacyPlatform.ai.slate = [{ ...normalizedSupportCommit.plan!, releaseRegionIds: ['EUROPE'], releaseCountryIds: undefined }];
legacyPlatform.ai.researchQueue = legacyPlatform.ai.researchQueue.map((item: any) => {
    const {
        researchWeeklyOperatingCostMillions: _researchWeeklyOperatingCostMillions,
        licenseWeeklyCostMillions: _licenseWeeklyCostMillions,
        ...legacyItem
    } = item;
    void _researchWeeklyOperatingCostMillions;
    void _licenseWeeklyCostMillions;
    return { ...legacyItem, ipStrategy: 'LICENSE', weeklyOperatingCostMillions: 999 };
});
const migratedOnce = normalizePlatformAiState(legacyPlatform, player.id, absoluteWeek);
const migratedTwice = normalizePlatformAiState(migratedOnce, player.id, absoluteWeek);
assert.deepEqual(migratedTwice, migratedOnce);
assert.equal(migratedOnce.cashReserve, preservedCash);
assert.equal(migratedOnce.ai!.schemaVersion, PLATFORM_AI_RUNTIME_SCHEMA_VERSION);
assert.equal(migratedOnce.ai!.slate.length, 1);
assert.equal(migratedOnce.ai!.decisionHistory.length, legacyPlatform.ai.decisionHistory.length);
assert.ok(migratedOnce.ai!.capabilities.activeCountryIds.every(id => canonicalCountryIds.has(id)));
assert.deepEqual(normalizeStreamingDayOneMarketIds(migratedOnce.ai!.capabilities.activeCountryIds), migratedOnce.ai!.capabilities.activeCountryIds);
assert.deepEqual(
    migratedOnce.ai!.capabilities.activeCountryIds,
    normalizeStreamingDayOneMarketIds(migratedOnce.ai!.marketOperations
        .filter(operation => operation.status === 'ACTIVE' && operation.countryId)
        .map(operation => operation.countryId!)),
);
assert.ok(migratedOnce.ai!.marketOperations.every(operation => operation.source === 'PLATFORM_AI'));
assert.equal('releaseRegionIds' in migratedOnce.ai!.slate[0], false);
assert.ok(migratedOnce.ai!.slate[0].releaseCountryIds.every(countryId => getStreamingCountryMarketProfile(countryId)?.regionId === 'EUROPE'));
const migratedResearchItem = migratedOnce.ai!.researchQueue[0];
assert.ok(migratedResearchItem);
const migratedResearchDefinition = STREAMING_RESEARCH_DEFINITIONS.find(item => item.id === migratedResearchItem.researchDefinitionId)!;
assert.equal(
    migratedResearchItem.researchWeeklyOperatingCostMillions,
    fullCurrencyToMillions(migratedResearchDefinition.weeklyOperatingCost),
);
assert.equal(
    migratedResearchItem.licenseWeeklyCostMillions,
    fullCurrencyToMillions(migratedResearchDefinition.licenseWeeklyCost),
);
assert.equal('weeklyOperatingCostMillions' in migratedResearchItem, false);

const intentionallyEmpty = structuredClone(normalizedStartingPlatform);
intentionallyEmpty.ai!.capabilities.activeCountryIds = [];
assert.deepEqual(
    normalizePlatformAiState(intentionallyEmpty, player.id, absoluteWeek).ai!.capabilities.activeCountryIds,
    startingActiveCountryIds,
);

console.log('Platform AI research and market audit passed.');
