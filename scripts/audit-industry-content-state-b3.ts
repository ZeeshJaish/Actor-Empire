import assert from 'node:assert/strict';
import {
    INDUSTRY_CONTENT_BLUEPRINT_LIMIT,
    INDUSTRY_CONTENT_FINGERPRINT_LIMIT,
    INDUSTRY_CONTENT_MATERIALIZATION_KEY_LIMIT,
    INDUSTRY_CONTENT_NOVELTY_SIGNATURE_LIMIT,
    createInitialIndustryContentState,
    createInitialIndustryIntelligenceState,
    normalizeIndustryContentState,
    normalizeIndustryIntelligenceState,
} from '../services/industryIntelligence';
import type { IndustryContentFingerprint, IndustryUniverseBlueprint, Universe } from '../types';

const fingerprint = (index: number): IndustryContentFingerprint => ({
    id: `fingerprint_${index}`,
    seed: `seed_${index}`,
    ownerCompanyId: 'NETFLIX',
    ownerCompanyKind: 'STREAMING_PLATFORM',
    format: 'MOVIE',
    primaryGenre: 'DRAMA',
    secondaryGenre: 'THRILLER',
    subgenre: 'CONSPIRACY',
    tone: 'TENSE',
    theme: 'LOYALTY',
    setting: 'METROPOLIS',
    period: 'CONTEMPORARY',
    targetAudience: 'ADULT_MAINSTREAM',
    originalLanguage: 'ENGLISH',
    priorityMarket: 'NORTH_AMERICA',
    commercialIntent: 70,
    prestigeIntent: 55,
    creativeRisk: 45,
    starPowerTarget: 60,
    releasePath: 'STREAMING_FIRST',
    sourceIntent: 'ORIGINAL',
    relationship: 'STANDALONE',
    budgetSuitability: { minimumMillions: 20, idealLowMillions: 35, idealHighMillions: 60, ambitiousMaximumMillions: 90 },
    noveltySignature: `signature_${index}`,
    noveltyScore: 72,
    createdAtAbsoluteWeek: index,
    decisionCycle: index,
    lifecycle: 'SELECTED',
});

const blueprint = (index: number): IndustryUniverseBlueprint => ({
    id: `blueprint_${index}`,
    seed: `blueprint_seed_${index}`,
    ownerCompanyId: 'NETFLIX',
    ownerCompanyKind: 'STREAMING_PLATFORM',
    anchorFingerprintId: `fingerprint_${index}`,
    coreWorldSignature: `world_${index}`,
    creativePillars: ['LEGACY', 'CONFLICT'],
    supportedFormats: ['MOVIE'],
    branchFamilies: ['CORE'],
    currentSagaLabel: 'Origins',
    currentPhaseLabel: 'Foundation',
    plannedCadenceWeeks: 52,
    financialScale: 60,
    crossoverPotential: 40,
    confidence: 55,
    momentum: 50,
    fatigue: 0,
    lifecycle: 'PLANNED',
    createdAtAbsoluteWeek: index,
    updatedAtAbsoluteWeek: index,
});

const empty = createInitialIndustryContentState();
assert.deepEqual(empty, {
    selectedFingerprints: [],
    universeBlueprints: [],
    recentNoveltySignatures: [],
    materializationKeys: [],
});

const normalized = normalizeIndustryContentState({
    selectedFingerprints: Array.from({ length: 80 }, (_, index) => fingerprint(index)),
    universeBlueprints: Array.from({ length: 20 }, (_, index) => blueprint(index)),
    recentNoveltySignatures: Array.from({ length: 100 }, (_, index) => `signature_${index}`),
    materializationKeys: Array.from({ length: 120 }, (_, index) => `materialization_${index}`),
});
assert.equal(normalized.selectedFingerprints.length, INDUSTRY_CONTENT_FINGERPRINT_LIMIT);
assert.equal(normalized.universeBlueprints.length, INDUSTRY_CONTENT_BLUEPRINT_LIMIT);
assert.equal(normalized.recentNoveltySignatures.length, INDUSTRY_CONTENT_NOVELTY_SIGNATURE_LIMIT);
assert.equal(normalized.materializationKeys.length, INDUSTRY_CONTENT_MATERIALIZATION_KEY_LIMIT);
assert.equal(normalized.selectedFingerprints.at(-1)?.id, 'fingerprint_79', 'normalization retains the newest selections');
const inFlightPreserved = normalizeIndustryContentState({
    selectedFingerprints: [
        { ...fingerprint(0), lifecycle: 'COMMITTED' as const },
        ...Array.from({ length: INDUSTRY_CONTENT_FINGERPRINT_LIMIT }, (_, index) => ({
            ...fingerprint(index + 1),
            lifecycle: 'MATERIALIZED' as const,
        })),
    ],
}).selectedFingerprints;
assert.equal(inFlightPreserved.length, INDUSTRY_CONTENT_FINGERPRINT_LIMIT);
assert.ok(
    inFlightPreserved.some(item => item.id === 'fingerprint_0'),
    'bounded content history must preserve an in-flight fingerprint before completed history',
);
assert.ok(
    !inFlightPreserved.some(item => item.id === 'fingerprint_1'),
    'the oldest terminal fingerprint is the first record compacted',
);
const committedOutranksSelections = normalizeIndustryContentState({
    selectedFingerprints: [
        { ...fingerprint(0), lifecycle: 'COMMITTED' as const },
        ...Array.from({ length: INDUSTRY_CONTENT_FINGERPRINT_LIMIT }, (_, index) => ({
            ...fingerprint(index + 1),
            lifecycle: 'SELECTED' as const,
        })),
    ],
}).selectedFingerprints;
assert.ok(
    committedOutranksSelections.some(item => item.id === 'fingerprint_0'),
    'execution-bound fingerprints must outrank speculative selections when all slots are in flight',
);
assert.ok(
    !committedOutranksSelections.some(item => item.id === 'fingerprint_1'),
    'the oldest speculative selection is compacted before a committed project definition',
);
const repairedBudget = normalizeIndustryContentState({
    selectedFingerprints: [fingerprint(1)].map(item => ({ ...item, budgetSuitability: { minimumMillions: 30, idealLowMillions: 10, idealHighMillions: 5, ambitiousMaximumMillions: 1 } })),
}).selectedFingerprints[0].budgetSuitability;
assert.ok(repairedBudget.minimumMillions < repairedBudget.idealLowMillions);
assert.ok(repairedBudget.idealLowMillions <= repairedBudget.idealHighMillions);
assert.ok(repairedBudget.idealHighMillions < repairedBudget.ambitiousMaximumMillions);

const fallback = createInitialIndustryIntelligenceState('NETFLIX', 'STREAMING_PLATFORM', 'seed', 100);
const migrated = normalizeIndustryIntelligenceState({ ...fallback, content: undefined }, fallback);
assert.deepEqual(migrated.content, empty, 'legacy B2 state receives empty B3 memory');
const replay = normalizeIndustryIntelligenceState(structuredClone({ ...migrated, content: normalized }), fallback);
assert.deepEqual(replay.content, normalized, 'valid B3 state must round-trip without rerolling');

const canonicalUniverseCompatibility: Universe = {
    id: 'UNIVERSE_TEST',
    name: 'Test Universe',
    studioId: 'NETFLIX',
    ownerCompanyId: 'NETFLIX',
    ownerCompanyKind: 'STREAMING_PLATFORM',
    blueprintId: 'blueprint_1',
    originFingerprintId: 'fingerprint_1',
    currentPhase: 'PHASE_1_ORIGINS',
    saga: 1,
    momentum: 50,
    brandPower: 50,
    marketShare: 0,
    color: '#111111',
    roster: [],
    slate: [],
    weeksUntilNextPhase: 20,
};
assert.equal(canonicalUniverseCompatibility.studioId, 'NETFLIX');
assert.equal(canonicalUniverseCompatibility.ownerCompanyKind, 'STREAMING_PLATFORM');

console.log('Industry Content B3 state audit passed.');
