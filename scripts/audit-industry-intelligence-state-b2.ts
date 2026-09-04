import assert from 'node:assert/strict';
import {
    INDUSTRY_INTELLIGENCE_LEARNING_LIMIT,
    INDUSTRY_INTELLIGENCE_PROCESSED_KEY_LIMIT,
    INDUSTRY_INTELLIGENCE_PROPOSAL_LIMIT,
    createInitialIndustryIntelligenceState,
    normalizeIndustryIntelligenceState,
} from '../services/industryIntelligence';
import { INDUSTRY_INTELLIGENCE_SCHEMA_VERSION } from '../types';
import { INITIAL_PLAYER } from '../types';
import { normalizeStudioAiState } from '../services/studioAi';
import { normalizePlatformAiState } from '../services/platformAi';

const first = createInitialIndustryIntelligenceState(
    'NETFLIX',
    'STREAMING_PLATFORM',
    'seed_netflix',
    1_390,
);
const second = createInitialIndustryIntelligenceState(
    'NETFLIX',
    'STREAMING_PLATFORM',
    'seed_netflix',
    1_390,
);

assert.deepEqual(first, second, 'the same company, seed and week must initialize identically');
assert.equal(first.schemaVersion, INDUSTRY_INTELLIGENCE_SCHEMA_VERSION);
assert.equal(first.companyId, 'NETFLIX');
assert.equal(first.companyKind, 'STREAMING_PLATFORM');
assert.ok(Object.values(first.nextDueAbsoluteWeek).every(value => value === null || Number.isInteger(value)));
assert.equal(first.nextDueAbsoluteWeek.MARKET_EXPANSION === null, false, 'streaming companies use market reviews');

const studio = createInitialIndustryIntelligenceState(
    'WARNER_BROS',
    'PRODUCTION_STUDIO',
    'seed_warners',
    1_390,
);
assert.equal(studio.nextDueAbsoluteWeek.MARKET_EXPANSION, null, 'production studios do not receive streaming market reviews');

const malformed = normalizeIndustryIntelligenceState({
    ...first,
    companyId: 'WRONG',
    companyKind: 'BROKEN',
    momentum: Number.NaN,
    nextDueAbsoluteWeek: {
        ...first.nextDueAbsoluteWeek,
        FINANCE_REVIEW: Number.POSITIVE_INFINITY,
    },
    learning: {
        ...first.learning,
        samples: Array.from({ length: 500 }, (_, index) => ({
            id: `sample_${index}`,
            evidenceId: `evidence_${index}`,
            absoluteWeek: index,
            lane: 'CONTENT_STRATEGY',
            outcomeScore: 50,
            capabilityDelta: 0,
            momentumDelta: 0,
        })),
    },
    proposals: Array.from({ length: 500 }, (_, index) => ({
        id: `proposal_${index}`,
        idempotencyKey: `proposal_${index}`,
        companyId: 'NETFLIX',
        companyKind: 'STREAMING_PLATFORM',
        lane: 'CONTENT_STRATEGY',
        decisionCycle: index,
        absoluteWeek: index,
        actionFamily: 'HOLD',
        optionId: 'HOLD',
        urgency: 0,
        confidence: 0,
        expectedExposureMillions: 0,
        affordabilityCeilingMillions: 0,
        score: { total: 0, need: 0, strategyFit: 0, expectedUpside: 0, relationshipValue: 0, competitiveValue: 0, financialRisk: 0, capacityPressure: 0, fatigue: 0, executionRisk: 0 },
        reasonCodes: ['NO_ELIGIBLE_OPTION'],
        uncertaintyKey: `uncertainty_${index}`,
        status: 'SHADOW',
        nextReviewAbsoluteWeek: index + 1,
    })),
    processedKeys: Array.from({ length: 500 }, (_, index) => `key_${index}`),
} as never, first);

assert.equal(malformed.companyId, 'NETFLIX', 'canonical fallback identity must win over malformed save identity');
assert.equal(malformed.companyKind, 'STREAMING_PLATFORM');
assert.ok(Number.isFinite(malformed.momentum));
assert.ok(Number.isInteger(malformed.nextDueAbsoluteWeek.FINANCE_REVIEW!));
assert.ok(malformed.learning.samples.length <= INDUSTRY_INTELLIGENCE_LEARNING_LIMIT);
assert.ok(malformed.proposals.length <= INDUSTRY_INTELLIGENCE_PROPOSAL_LIMIT);
assert.ok(malformed.processedKeys.length <= INDUSTRY_INTELLIGENCE_PROCESSED_KEY_LIMIT);

const replay = normalizeIndustryIntelligenceState(structuredClone(malformed), first);
assert.deepEqual(replay, malformed, 'normalized shared state must be stable on reload');

const studioRuntime = normalizeStudioAiState({
    id: 'WARNER_BROS',
    name: 'Warner Bros.',
    valuation: 70,
    reputation: 85,
    cashReserve: 8_000,
    recentHits: 3,
    archetype: 'LEGACY',
}, { absoluteWeek: 1_390 });
assert.equal(studioRuntime.intelligence?.companyId, 'WARNER_BROS');
assert.equal(studioRuntime.intelligence?.companyKind, 'PRODUCTION_STUDIO');

const netflix = normalizePlatformAiState(
    structuredClone(INITIAL_PLAYER.world.platforms!.NETFLIX),
    INITIAL_PLAYER.id,
    1_390,
);
assert.equal(netflix.ai?.intelligence?.companyId, 'NETFLIX');
assert.equal(netflix.ai?.intelligence?.companyKind, 'STREAMING_PLATFORM');

console.log('Industry Intelligence B2 state audit passed.');
