import assert from 'node:assert/strict';
import { INITIAL_PLAYER } from '../types';
import { compactIndustryIntelligenceState, createInitialIndustryIntelligenceState, normalizeIndustryIntelligenceState } from '../services/industryIntelligence';
import { compareProtectedSaveState } from '../services/saveIntegrity';
import { normalizePlatformAiState } from '../services/platformAi';
import { compactPlayerForPersistence } from '../services/saveCompaction';

const fallback = createInitialIndustryIntelligenceState('NETFLIX', 'STREAMING_PLATFORM', 'save_seed', 300);
const malformed = normalizeIndustryIntelligenceState({
    ...fallback,
    content: {
        selectedFingerprints: Array.from({ length: 100 }, (_, index) => ({
            id: `fp_${index}`, seed: `seed_${index}`, ownerCompanyId: 'NETFLIX', ownerCompanyKind: 'STREAMING_PLATFORM', format: 'MOVIE',
            primaryGenre: 'DRAMA', subgenre: 'CHARACTER_STUDY', tone: 'GROUNDED', theme: 'IDENTITY', setting: 'METROPOLIS', period: 'CONTEMPORARY',
            targetAudience: 'ADULT_MAINSTREAM', originalLanguage: 'ENGLISH', priorityMarket: 'GLOBAL', commercialIntent: 50, prestigeIntent: 50,
            creativeRisk: 50, starPowerTarget: 50, releasePath: 'STREAMING_FIRST', sourceIntent: 'PLATFORM_ORIGINAL', relationship: 'STANDALONE',
            budgetSuitability: { minimumMillions: 10, idealLowMillions: 20, idealHighMillions: 30, ambitiousMaximumMillions: 50 },
            noveltySignature: `signature_${index}`, noveltyScore: 60, createdAtAbsoluteWeek: index, decisionCycle: index, lifecycle: 'SELECTED',
        })),
        universeBlueprints: [], recentNoveltySignatures: Array.from({ length: 100 }, (_, index) => `signature_${index}`),
        materializationKeys: Array.from({ length: 100 }, (_, index) => `key_${index}`),
    },
}, fallback);
const compacted = compactIndustryIntelligenceState(malformed);
assert.equal(compacted.content.selectedFingerprints.length, 24);
assert.equal(compacted.content.recentNoveltySignatures.length, 48);
assert.equal(compacted.content.materializationKeys.length, 64);
assert.deepEqual(compactIndustryIntelligenceState(structuredClone(compacted)), compacted, 'compaction must be stable across repeated saves');

const before = structuredClone(INITIAL_PLAYER);
before.world.platforms!.NETFLIX = normalizePlatformAiState(before.world.platforms!.NETFLIX, before.id, 300);
before.world.platforms!.NETFLIX.ai!.intelligence = structuredClone(fallback);
const after = structuredClone(before);
after.world.platforms!.NETFLIX.ai!.intelligence!.content.recentNoveltySignatures.push('material_change');
const comparison = compareProtectedSaveState(before, after);
assert.equal(comparison.ok, false, 'B3 memory mutation must be detected by save-integrity protection');
assert.ok(comparison.violations.includes('industry intelligence state changed'));

const freshGeneratedContentPlayer = structuredClone(INITIAL_PLAYER);
freshGeneratedContentPlayer.world.platforms!.NETFLIX = normalizePlatformAiState(
    freshGeneratedContentPlayer.world.platforms!.NETFLIX,
    freshGeneratedContentPlayer.id,
    300,
);
const generatedState = structuredClone(compacted);
const generatedFingerprint = generatedState.content.selectedFingerprints[0] as typeof generatedState.content.selectedFingerprints[number] & Record<string, unknown>;
delete generatedFingerprint.sourceRightId;
delete generatedFingerprint.relatedFingerprintId;
delete generatedFingerprint.universeBlueprintId;
delete generatedFingerprint.canonicalProjectId;
delete generatedFingerprint.canonicalUniverseId;
freshGeneratedContentPlayer.world.platforms!.NETFLIX.ai!.intelligence = generatedState;
const freshGeneratedContentSaveComparison = compareProtectedSaveState(
    freshGeneratedContentPlayer,
    compactPlayerForPersistence(freshGeneratedContentPlayer),
);
assert.deepEqual(
    freshGeneratedContentSaveComparison,
    { ok: true },
    'A newly generated content fingerprint must survive first persistence without optional-key shape drift',
);

console.log('Industry Content B3 save audit passed.');
