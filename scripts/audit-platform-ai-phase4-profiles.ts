import assert from 'node:assert/strict';
import type { PlatformId } from '../types';
import * as PlatformAi from '../services/platformAi';
import { STREAMING_DAY_ONE_MARKETS } from '../services/streamingDayOneMarkets';
import { STREAMING_RESEARCH_DEFINITIONS } from '../services/streamingResearchLifecycle';
import { createPlatformAiFixture } from './helpers/platformAiFixture';

const platformIds: PlatformId[] = ['NETFLIX', 'APPLE_TV', 'DISNEY_PLUS', 'HULU', 'YOUTUBE'];
const countryIds = new Set(STREAMING_DAY_ONE_MARKETS.map(market => market.id));
const researchIds = new Set(STREAMING_RESEARCH_DEFINITIONS.map(definition => definition.id));
const getOperatingProfile = (PlatformAi as Record<string, unknown>).getPlatformAiOperatingProfile;
const createEfficiencySnapshot = (PlatformAi as Record<string, unknown>).createPlatformAiEfficiencySnapshot;

assert.equal(
    typeof getOperatingProfile,
    'function',
    'Phase 4 must expose one canonical operating-profile resolver.',
);

for (const platformId of platformIds) {
    const profile = (getOperatingProfile as (id: PlatformId) => any)(platformId);
    assert.equal(profile.platformId, platformId);
    assert.ok(['REGIONAL', 'GROWTH', 'MATURE', 'GLOBAL'].includes(profile.scale));
    assert.ok(profile.version >= 1);
    assert.ok(profile.homeCountryIds.length > 0);
    assert.ok(profile.startingCountryIds.length >= profile.homeCountryIds.length);
    assert.ok(profile.homeCountryIds.every((id: string) => profile.startingCountryIds.includes(id)));
    assert.ok(profile.startingCountryIds.every((id: string) => countryIds.has(id)));
    assert.ok(profile.historicalResearchDefinitionIds.length > 0);
    assert.ok(profile.historicalResearchDefinitionIds.every((id: string) => researchIds.has(id)));
    assert.ok(profile.startingLanguageCapabilities.length > 0);
    assert.ok(profile.startingLanguageCapabilities.every((capability: any) => (
        typeof capability.languageId === 'string'
        && capability.languageId === capability.languageId.toLowerCase()
        && capability.subtitleLevel >= 0
        && capability.subtitleLevel <= 3
        && capability.dubbingLevel >= 0
        && capability.dubbingLevel <= 3
    )));
    assert.ok(profile.researchOrganizationLevel >= 1 && profile.researchOrganizationLevel <= 10);
    assert.ok(profile.expansionAmbition >= 0 && profile.expansionAmbition <= 1);
    assert.ok(profile.localizationAmbition >= 0 && profile.localizationAmbition <= 1);
    assert.ok(profile.efficiency.researchCostMultiplier >= 0.8 && profile.efficiency.researchCostMultiplier <= 0.95);
    assert.ok(profile.efficiency.installationCostMultiplier >= 0.8 && profile.efficiency.installationCostMultiplier <= 0.95);
    assert.ok(profile.efficiency.marketEntryCostMultiplier >= 0.8 && profile.efficiency.marketEntryCostMultiplier <= 0.95);
    assert.ok(profile.efficiency.localizationCostMultiplier >= 0.8 && profile.efficiency.localizationCostMultiplier <= 0.95);
    assert.ok(profile.efficiency.leadTimeMultiplier >= 0.85 && profile.efficiency.leadTimeMultiplier <= 1);
    assert.ok(profile.efficiency.localizationThroughputMultiplier >= 1 && profile.efficiency.localizationThroughputMultiplier <= 1.2);
}

const netflix = (getOperatingProfile as (id: PlatformId) => any)('NETFLIX');
assert.ok(netflix.startingCountryIds.includes('US'));
assert.ok(netflix.startingCountryIds.includes('IN'));
assert.ok(netflix.startingCountryIds.includes('JP'));
assert.equal(netflix.scale, 'GLOBAL');
assert.equal(typeof createEfficiencySnapshot, 'function', 'Phase 4 must expose auditable efficiency quotes.');
const clampedEfficiency = (createEfficiencySnapshot as Function)(
    100,
    20,
    {
        ...netflix.efficiency,
        researchCostMultiplier: 0.1,
        leadTimeMultiplier: 0.1,
    },
    'RESEARCH',
);
assert.equal(clampedEfficiency.appliedCostMillions, 80);
assert.equal(clampedEfficiency.appliedLeadWeeks, 17);

const hulu = (getOperatingProfile as (id: PlatformId) => any)('HULU');
assert.ok(hulu.startingCountryIds.length < netflix.startingCountryIds.length);
assert.notEqual(hulu.scale, 'GLOBAL');

assert.deepEqual(
    (getOperatingProfile as (id: PlatformId) => any)('NETFLIX'),
    (getOperatingProfile as (id: PlatformId) => any)('NETFLIX'),
    'Operating profile lookup must be deterministic and immutable-by-convention.',
);

const absoluteWeek = 1_200;
const fixture = createPlatformAiFixture();
const freshNetflix = fixture.world.platforms!.NETFLIX;
const preservedCash = freshNetflix.cashReserve;
const normalizedFreshNetflix = PlatformAi.normalizePlatformAiState(
    freshNetflix,
    fixture.id,
    absoluteWeek,
);
const freshRuntime = normalizedFreshNetflix.ai! as unknown as Record<string, any>;

assert.equal(
    freshRuntime.operatingProfileVersion,
    netflix.version,
    'A fresh platform runtime must record which mature operating profile was materialized.',
);
assert.ok(
    netflix.historicalResearchDefinitionIds.every((researchDefinitionId: string) => (
        normalizedFreshNetflix.ai!.researchQueue.some(item => (
            item.researchDefinitionId === researchDefinitionId && item.stage === 'OPERATING'
        ))
    )),
    'Mature historical research must exist as canonical operating runtime items.',
);
assert.ok(
    freshRuntime.languageCapabilities.some((capability: any) => (
        capability.languageId === 'english'
        && capability.subtitleLevel >= 1
        && capability.dubbingLevel >= 1
    )),
    'Mature platform language capabilities must be materialized in canonical runtime state.',
);
assert.equal(
    normalizedFreshNetflix.cashReserve,
    preservedCash,
    'Historical profile migration must not retroactively charge platform cash.',
);
assert.deepEqual(
    PlatformAi.normalizePlatformAiState(normalizedFreshNetflix, fixture.id, absoluteWeek),
    normalizedFreshNetflix,
    'Profile materialization must be idempotent across reload normalization.',
);

const customizedNetflix = structuredClone(normalizedFreshNetflix);
customizedNetflix.ai!.marketOperations = customizedNetflix.ai!.marketOperations
    .filter(operation => operation.countryId === 'US');
customizedNetflix.ai!.capabilities.activeCountryIds = ['US'];
const savedEnglishCapability = (customizedNetflix.ai! as unknown as Record<string, any>)
    .languageCapabilities.find((capability: any) => capability.languageId === 'english');
savedEnglishCapability.subtitleLevel = 2;
savedEnglishCapability.dubbingLevel = 1;
savedEnglishCapability.source = 'PLAYER_HANDOFF';
savedEnglishCapability.sourceReferenceId = 'audit-player-handoff';
const normalizedCustomizedNetflix = PlatformAi.normalizePlatformAiState(
    customizedNetflix,
    fixture.id,
    absoluteWeek,
);
assert.deepEqual(
    normalizedCustomizedNetflix.ai!.capabilities.activeCountryIds,
    ['US'],
    'Current-profile saves must preserve their canonical country footprint instead of restoring defaults.',
);
assert.deepEqual(
    (normalizedCustomizedNetflix.ai! as unknown as Record<string, any>).languageCapabilities
        .find((capability: any) => capability.languageId === 'english'),
    savedEnglishCapability,
    'Canonical saved language progression must win over profile defaults.',
);

const handoffPlatformId = 'HULU' as const;
const handoffPlatform = PlatformAi.normalizePlatformAiState(
    fixture.world.platforms![handoffPlatformId], fixture.id, absoluteWeek,
);
const researchWorld = {
    ...fixture.world,
    platforms: { ...fixture.world.platforms!, [handoffPlatformId]: handoffPlatform },
};
const choice = PlatformAi.choosePlatformResearch({
    player: fixture, world: researchWorld, platformId: handoffPlatformId, absoluteWeek,
});
assert.ok(choice, 'The acquisition fixture needs one affordable future research commitment.');
const committed = PlatformAi.commitPlatformResearch({
    player: fixture, world: researchWorld, platformId: handoffPlatformId, absoluteWeek, choice,
});
assert.equal(committed.changed, true);
const beforeAcquisition = committed.world.platforms![handoffPlatformId];
beforeAcquisition.ai!.spendingRestrictions = {
    source: 'EXTERNAL_RECAPITALIZATION',
    blocksNewBids: true,
    blocksNewGreenlights: true,
    blocksNewResearch: true,
    blocksExpansion: true,
    expiresAtAbsoluteWeek: absoluteWeek + 20,
};
const acquiredPlayer = structuredClone(fixture);
acquiredPlayer.ownedStreamingPlatform.corporateDevelopment.acquiredPlatformIds = [handoffPlatformId];
const acquiredWorld = PlatformAi.normalizeWorldPlatformAi(acquiredPlayer, committed.world, absoluteWeek + 1);
const afterAcquisition = acquiredWorld.platforms![handoffPlatformId];
const beforeResearch = beforeAcquisition.ai!.researchQueue.find(item => item.id === committed.item!.id)!;
const recalculatedResearch = afterAcquisition.ai!.researchQueue.find(item => item.id === committed.item!.id)!;
assert.deepEqual(afterAcquisition.ai!.capabilities.activeCountryIds, beforeAcquisition.ai!.capabilities.activeCountryIds);
assert.deepEqual(afterAcquisition.ai!.languageCapabilities, beforeAcquisition.ai!.languageCapabilities);
assert.equal(afterAcquisition.ai!.playerAcquisitionHandoffAtAbsoluteWeek, absoluteWeek + 1);
assert.equal(afterAcquisition.ai!.spendingRestrictions.source, 'NONE', 'Player acquisition must remove AI-only financing restrictions prospectively.');
assert.equal(afterAcquisition.ai!.spendingRestrictions.blocksNewBids, false);
assert.equal(recalculatedResearch.researchCostMillions, beforeResearch.researchCostMillions, 'Paid research remains paid at its frozen AI quote.');
assert.ok(recalculatedResearch.installationCostMillions >= beforeResearch.installationCostMillions, 'Unpaid installation reverts to the player-standard quote.');
assert.ok(recalculatedResearch.stageReadyAtAbsoluteWeek >= beforeResearch.stageReadyAtAbsoluteWeek, 'Acquisition cannot preserve an unpaid AI speed advantage.');
assert.deepEqual(
    PlatformAi.normalizeWorldPlatformAi(acquiredPlayer, acquiredWorld, absoluteWeek + 2).platforms![handoffPlatformId].ai!.researchQueue,
    afterAcquisition.ai!.researchQueue,
    'The acquisition conversion is idempotent and never restarts completed progress.',
);
assert.equal(PlatformAi.commitPlatformResearch({
    player: acquiredPlayer, world: acquiredWorld, platformId: handoffPlatformId, absoluteWeek: absoluteWeek + 2, choice,
}).reason, 'PLAYER_CONTROLLED');
assert.equal(PlatformAi.commitPlatformMarketExpansion({
    player: acquiredPlayer, world: acquiredWorld, platformId: handoffPlatformId, absoluteWeek: absoluteWeek + 2,
}).reason, 'PLAYER_CONTROLLED');
assert.equal(PlatformAi.planPlatformAiLocalization({
    player: acquiredPlayer,
    world: acquiredWorld,
    platform: afterAcquisition,
    absoluteWeek: absoluteWeek + 2,
    contentPlanId: 'none', projectId: 'none', countryIds: ['US'],
}).reason, 'PLAYER_CONTROLLED');

const qaPlayer = PlatformAi.buildPlatformAiPhase4QaFixture(fixture, absoluteWeek);
const qaSnapshot = PlatformAi.getPlatformAiPhase4QaSnapshot(qaPlayer, absoluteWeek);
assert.ok(qaSnapshot.activeResearchPrograms >= 3);
assert.ok(qaSnapshot.researchCapacity >= 3 && qaSnapshot.researchCapacity <= 4);
assert.ok(qaSnapshot.activeCountries > 0);
assert.ok(qaSnapshot.subtitleOnlyLanguages.length > 0);
assert.ok(qaSnapshot.dubbingLanguages.length > 0);
assert.ok(qaSnapshot.waitingLocalizationJobs >= 1);
assert.ok(qaSnapshot.readyLocalizationJobs >= 1);
assert.ok(qaSnapshot.comprehension.localizedReach > qaSnapshot.comprehension.unlocalizedReach);

console.log('Platform AI Phase 4 operating-profile audit passed.');
