import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type NPCStudioState } from '../types';
import {
    adaptPlatformIntelligenceContext,
    adaptStudioIntelligenceContext,
} from '../services/industryIntelligence';
import { attachNormalizedStudioAiState } from '../services/studioAi';
import { normalizePlatformAiState } from '../services/platformAi';

const absoluteWeek = 1_390;
const player = structuredClone(INITIAL_PLAYER);
const major: NPCStudioState = attachNormalizedStudioAiState({
    id: 'WARNER_BROS', name: 'Warner Bros.', valuation: 75, reputation: 87,
    cashReserve: 8_500, recentHits: 4, archetype: 'LEGACY',
}, { absoluteWeek });
const regional: NPCStudioState = attachNormalizedStudioAiState({
    id: 'REGIONAL_FIXTURE', name: 'Regional Fixture', valuation: 0.18, reputation: 42,
    cashReserve: 24, recentHits: 0, archetype: 'EMERGENT',
}, { absoluteWeek });
regional.ai!.finance = {
    ...regional.ai!.finance,
    debtPrincipalMillions: 100,
    weeklyOperatingCostMillions: 5,
    runwayWeeks: 4.8,
    consecutiveLossWeeks: 6,
};

const majorBefore = structuredClone(major);
const majorContext = adaptStudioIntelligenceContext(player, major, absoluteWeek);
const regionalContext = adaptStudioIntelligenceContext(player, regional, absoluteWeek);
assert.deepEqual(major, majorBefore, 'studio adaptation must not mutate canonical state');
assert.equal(majorContext.companyId, major.id);
assert.equal(majorContext.companyKind, 'PRODUCTION_STUDIO');
assert.equal(majorContext.controller, 'AI');
assert.ok((majorContext.capabilities.PRODUCTION || 0) > (regionalContext.capabilities.PRODUCTION || 0));
assert.ok(majorContext.condition.capacityPressure >= 0 && majorContext.condition.capacityPressure <= 100);
assert.ok(majorContext.condition.financialPressure < regionalContext.condition.financialPressure);
assert.equal(Object.isFrozen(majorContext), true);
assert.equal(Object.isFrozen(majorContext.condition), true);

const netflix = normalizePlatformAiState(
    structuredClone(INITIAL_PLAYER.world.platforms!.NETFLIX),
    player.id,
    absoluteWeek,
);
const netflixBefore = structuredClone(netflix);
const platformContext = adaptPlatformIntelligenceContext(player, netflix, absoluteWeek);
assert.deepEqual(netflix, netflixBefore, 'platform adaptation must not mutate canonical state');
assert.equal(platformContext.companyKind, 'STREAMING_PLATFORM');
assert.equal(platformContext.controller, 'AI');
assert.ok((platformContext.capabilities.LOCALIZATION || 0) >= 0);
assert.ok((platformContext.capabilities.TECHNOLOGY || 0) > 0);
assert.ok(Number.isFinite(platformContext.condition.catalogueNeed));
assert.ok(Number.isFinite(platformContext.condition.marketOpportunity));
assert.equal(Object.isFrozen(platformContext), true);
assert.equal(Object.isFrozen(platformContext.activeCommitmentIds), true);

const acquiredPlayer = structuredClone(player);
acquiredPlayer.ownedStreamingPlatform.corporateDevelopment.acquiredPlatformIds = ['NETFLIX'];
const acquiredContext = adaptPlatformIntelligenceContext(acquiredPlayer, netflix, absoluteWeek);
assert.equal(acquiredContext.controller, 'PLAYER', 'an acquired platform must be identified before intelligence decisions');

const ownedStudioPlayer = structuredClone(player);
ownedStudioPlayer.businesses.push({ id: major.id, type: 'PRODUCTION_HOUSE' } as never);
const ownedStudioContext = adaptStudioIntelligenceContext(ownedStudioPlayer, major, absoluteWeek);
assert.equal(ownedStudioContext.controller, 'PLAYER');

console.log('Industry Intelligence B2 adapter audit passed.');
