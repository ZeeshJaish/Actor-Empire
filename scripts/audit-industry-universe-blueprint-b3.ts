import assert from 'node:assert/strict';
import { advanceIndustryUniverseBlueprint, createIndustryUniverseBlueprint, evaluateIndustryUniverseBlueprint } from '../services/industryIntelligence';
import type { IndustryContentFingerprint } from '../types';
import type { IndustryIntelligenceContext } from '../services/industryIntelligence';

const fingerprint: IndustryContentFingerprint = {
    id: 'fp_anchor', seed: 'anchor_seed', ownerCompanyId: 'STUDIO', ownerCompanyKind: 'PRODUCTION_STUDIO', format: 'MOVIE',
    primaryGenre: 'SUPERHERO', secondaryGenre: 'SCI_FI', subgenre: 'EPIC_QUEST', tone: 'EPIC', theme: 'LEGACY', setting: 'METROPOLIS',
    period: 'CONTEMPORARY', targetAudience: 'GLOBAL_FOUR_QUADRANT', originalLanguage: 'ENGLISH', priorityMarket: 'GLOBAL',
    commercialIntent: 90, prestigeIntent: 60, creativeRisk: 65, starPowerTarget: 80, releasePath: 'THEATRICAL_FIRST', sourceIntent: 'ORIGINAL',
    relationship: 'FOUND_UNIVERSE', budgetSuitability: { minimumMillions: 60, idealLowMillions: 100, idealHighMillions: 160, ambitiousMaximumMillions: 240 },
    noveltySignature: 'universe_anchor_signature', noveltyScore: 88, createdAtAbsoluteWeek: 500, decisionCycle: 4, lifecycle: 'SELECTED',
};

const context = (overrides: Partial<IndustryIntelligenceContext['condition']> = {}, seed = 'universe_seed_29'): IndustryIntelligenceContext => ({
    companyId: 'STUDIO', companyKind: 'PRODUCTION_STUDIO', absoluteWeek: 500, seed, controller: 'AI', status: 'ACTIVE',
    identity: { scale: 88, riskTolerance: 75, financialDiscipline: 70, creativePatience: 82, prestigeIntent: 65, commercialIntent: 88, franchiseAppetite: 95, growthIntent: 80, neutralMomentum: 50 },
    capabilities: { DEVELOPMENT: 88, CREATIVE: 90, PRODUCTION: 86, FINANCE: 78, MARKETING_DISCOVERY: 82 },
    condition: { cashMillions: 5_000, debtMillions: 200, runwayWeeks: 180, capacityPressure: 30, momentum: 72, recentResultStrength: 80, audienceTrust: 82, catalogueNeed: 65, marketOpportunity: 80, financialPressure: 10, competitivePressure: 60, repetitionFatigue: 5, franchiseFatigue: 4, overextension: 20, spendingRestricted: false, ...overrides },
    learning: { averageOutcomeByLane: {}, capabilityProgress: {}, repetitionFatigue: 5, franchiseFatigue: 4, samples: [], processedEvidenceIds: [] },
    nextDueAbsoluteWeek: { CONTENT_STRATEGY: 500, PRODUCTION_REVIEW: 505, RELEASE_REVIEW: 506, FINANCE_REVIEW: 504, MARKET_EXPANSION: null, CAPABILITY_GROWTH: 512 },
    decisionCycleByLane: { CONTENT_STRATEGY: 4, PRODUCTION_REVIEW: 3, RELEASE_REVIEW: 3, FINANCE_REVIEW: 6, MARKET_EXPANSION: 0, CAPABILITY_GROWTH: 2 }, activeCommitmentIds: [],
});

const blocked = evaluateIndustryUniverseBlueprint({ context: context({ runwayWeeks: 12, capacityPressure: 96 }), fingerprint, compatibleSuccessfulFingerprints: [], existingBlueprints: [] });
assert.equal(blocked.eligible, false);
assert.ok(blocked.reasonCodes.includes('INSUFFICIENT_RUNWAY'));

const planned = evaluateIndustryUniverseBlueprint({ context: context(), fingerprint, compatibleSuccessfulFingerprints: [], existingBlueprints: [] });
assert.deepEqual(evaluateIndustryUniverseBlueprint({ context: context(), fingerprint, compatibleSuccessfulFingerprints: [], existingBlueprints: [] }), planned);
assert.equal(planned.eligible, true, 'the hand-checked rare seed should clear a high-capability planned founding gate');
assert.equal(planned.mode, 'PLANNED');
const blueprint = createIndustryUniverseBlueprint({ evaluation: planned, context: context(), fingerprint });
assert.equal(blueprint.lifecycle, 'PLANNED');
assert.equal(blueprint.ownerCompanyId, 'STUDIO');

const compatible = [1, 2, 3].map(index => ({ ...fingerprint, id: `success_${index}`, noveltySignature: `compatible_${index}`, relationship: 'STANDALONE' as const }));
const emergentFingerprint = { ...fingerprint, id: 'emergent', relationship: 'STANDALONE' as const };
const emergent = evaluateIndustryUniverseBlueprint({ context: context({}, 'universe_seed_29'), fingerprint: emergentFingerprint, compatibleSuccessfulFingerprints: compatible, existingBlueprints: [] });
assert.equal(emergent.eligible, true);
assert.equal(emergent.mode, 'EMERGENT');

const prematureEvent = advanceIndustryUniverseBlueprint({ blueprint, absoluteWeek: 520, anchorOutcome: 70, establishedBranchCount: 1, audienceFamiliarity: 80, capacityPressure: 20, requestedEvent: true });
assert.equal(prematureEvent.eventEligible, false, 'one branch cannot support a crossover event');
const fatigued = advanceIndustryUniverseBlueprint({ blueprint: { ...blueprint, fatigue: 92 }, absoluteWeek: 530, anchorOutcome: 60, establishedBranchCount: 3, audienceFamiliarity: 85, capacityPressure: 30, requestedEvent: true });
assert.equal(fatigued.blueprint.lifecycle, 'PAUSED');
const failed = advanceIndustryUniverseBlueprint({ blueprint, absoluteWeek: 540, anchorOutcome: 20, establishedBranchCount: 0, audienceFamiliarity: 10, capacityPressure: 50, requestedEvent: false });
assert.equal(failed.blueprint.lifecycle, 'FAILED', 'a weak anchor must be allowed to kill the blueprint');

console.log('Industry Content B3 universe blueprint audit passed.');
