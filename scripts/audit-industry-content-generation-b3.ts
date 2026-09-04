import assert from 'node:assert/strict';
import { generateIndustryContentCandidates } from '../services/industryIntelligence';
import type { IndustryIntelligenceContext } from '../services/industryIntelligence';

const context = (seed: string): IndustryIntelligenceContext => ({
    companyId: 'EMPIRE_STREAM', companyKind: 'STREAMING_PLATFORM', absoluteWeek: 420, seed,
    controller: 'AI', status: 'ACTIVE',
    identity: { scale: 70, riskTolerance: 62, financialDiscipline: 65, creativePatience: 58, prestigeIntent: 54, commercialIntent: 72, franchiseAppetite: 68, growthIntent: 75, neutralMomentum: 50 },
    capabilities: { DEVELOPMENT: 67, CREATIVE: 72, PRODUCTION: 64, FINANCE: 70, MARKETING_DISCOVERY: 74, DISTRIBUTION_MARKET: 69, NEGOTIATION: 62 },
    condition: { cashMillions: 2_500, debtMillions: 200, runwayWeeks: 130, capacityPressure: 35, momentum: 61, recentResultStrength: 58, audienceTrust: 65, catalogueNeed: 72, marketOpportunity: 68, financialPressure: 18, competitivePressure: 63, repetitionFatigue: 12, franchiseFatigue: 8, overextension: 30, spendingRestricted: false },
    learning: { averageOutcomeByLane: {}, capabilityProgress: {}, repetitionFatigue: 12, franchiseFatigue: 8, samples: [], processedEvidenceIds: [] },
    nextDueAbsoluteWeek: { CONTENT_STRATEGY: 420, PRODUCTION_REVIEW: 425, RELEASE_REVIEW: 426, FINANCE_REVIEW: 424, MARKET_EXPANSION: 430, CAPABILITY_GROWTH: 432 },
    decisionCycleByLane: { CONTENT_STRATEGY: 7, PRODUCTION_REVIEW: 4, RELEASE_REVIEW: 4, FINANCE_REVIEW: 8, MARKET_EXPANSION: 2, CAPABILITY_GROWTH: 2 },
    activeCommitmentIds: [],
});

const input = { context: context('empire_seed'), proposalId: 'proposal_420', affordabilityCeilingMillions: 180 };
const before = structuredClone(input);
const first = generateIndustryContentCandidates(input);
const replay = generateIndustryContentCandidates(structuredClone(input));

assert.equal(first.length, 6, 'each content decision evaluates exactly six ephemeral candidates');
assert.deepEqual(replay, first, 'same saved inputs must replay byte-identically');
assert.deepEqual(input, before, 'candidate generation must not mutate its input');
assert.equal(new Set(first.map(item => item.id)).size, 6, 'candidate IDs must be unique');
assert.equal(new Set(first.map(item => item.noveltySignature)).size, 6, 'candidate signatures must be unique within a pool');
assert.ok(first.every(item => item.ownerCompanyId === 'EMPIRE_STREAM' && item.ownerCompanyKind === 'STREAMING_PLATFORM'));
assert.ok(first.every(item => item.subgenre && item.tone && item.theme && item.setting && item.period));
assert.ok(first.every(item => item.targetAudience && item.originalLanguage && item.priorityMarket));
assert.ok(first.every(item => ['MOVIE', 'SERIES', 'LIMITED_SERIES'].includes(item.format)));
assert.ok(first.every(item => item.budgetSuitability.minimumMillions > 0));
assert.notDeepEqual(
    generateIndustryContentCandidates({ ...input, context: context('different_seed') }),
    first,
    'different company seeds must produce a different candidate pool',
);

console.log('Industry Content B3 generation audit passed.');
