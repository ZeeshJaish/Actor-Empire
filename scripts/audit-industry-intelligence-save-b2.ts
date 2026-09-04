import assert from 'node:assert/strict';
import { INITIAL_PLAYER } from '../types';
import {
    compareIndustryShadowDecision,
    createInitialIndustryIntelligenceState,
    INDUSTRY_INTELLIGENCE_COMPARISON_LIMIT,
    INDUSTRY_INTELLIGENCE_LEARNING_LIMIT,
    INDUSTRY_INTELLIGENCE_PROCESSED_KEY_LIMIT,
    INDUSTRY_INTELLIGENCE_PROPOSAL_LIMIT,
    processIndustryIntelligenceShadowCompany,
} from '../services/industryIntelligence';
import { ensureStudioEcosystem } from '../services/studioEcosystem';
import { attachNormalizedStudioAiState } from '../services/studioAi';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { createSaveIntegrityManifest } from '../services/saveIntegrity';

const absoluteWeek = 1_500;
const player = structuredClone(INITIAL_PLAYER);
player.age = 28;
player.currentWeek = 44;
player.world = ensureStudioEcosystem(player.world);
const studioId = 'WARNER_BROS';
player.world.studios![studioId] = attachNormalizedStudioAiState(player.world.studios![studioId], { absoluteWeek });

const initial = createInitialIndustryIntelligenceState(studioId, 'PRODUCTION_STUDIO', 'save_seed', absoluteWeek);
initial.nextDueAbsoluteWeek.FINANCE_REVIEW = absoluteWeek;
const context = {
    companyId: studioId, companyKind: 'PRODUCTION_STUDIO' as const, absoluteWeek,
    seed: initial.seed, controller: 'AI' as const, status: 'ACTIVE',
    identity: { scale: 90, riskTolerance: 60, financialDiscipline: 80, creativePatience: 70, prestigeIntent: 75, commercialIntent: 70, franchiseAppetite: 45, growthIntent: 65, neutralMomentum: 50 },
    capabilities: { FINANCE: 85 },
    condition: { cashMillions: 4_000, debtMillions: 400, runwayWeeks: 65, capacityPressure: 20, momentum: 50, recentResultStrength: 65, audienceTrust: 75, catalogueNeed: 45, marketOpportunity: 55, financialPressure: 15, competitivePressure: 50, repetitionFatigue: 5, franchiseFatigue: 3, overextension: 20, spendingRestricted: false },
    learning: structuredClone(initial.learning), nextDueAbsoluteWeek: { ...initial.nextDueAbsoluteWeek },
    decisionCycleByLane: { ...initial.decisionCycleByLane }, activeCommitmentIds: [],
};
const processed = processIndustryIntelligenceShadowCompany({ context, state: initial }).state;
const proposal = processed.proposals[0];
const compared = compareIndustryShadowDecision({
    state: processed,
    proposal,
    observation: { acted: true, eligible: true, actionFamily: 'MAINTAIN_BUDGET', exposureMillions: 2, absoluteWeek },
}).state;

const oversized = structuredClone(compared);
oversized.proposals = Array.from({ length: 100 }, (_, index) => ({ ...proposal, id: `proposal_${index}`, idempotencyKey: `proposal_${index}` }));
oversized.shadowComparisons = Array.from({ length: 100 }, (_, index) => ({
    ...compared.shadowComparisons[0], id: `comparison_${index}`, idempotencyKey: `comparison_${index}`,
}));
oversized.learning.samples = Array.from({ length: 100 }, (_, index) => ({
    id: `sample_${index}`, evidenceId: `evidence_${index}`, absoluteWeek: index,
    lane: 'RELEASE_REVIEW', outcomeScore: 50, capabilityDelta: 0, momentumDelta: 0,
}));
oversized.learning.processedEvidenceIds = Array.from({ length: 200 }, (_, index) => `evidence_${index}`);
oversized.processedKeys = Array.from({ length: 200 }, (_, index) => `key_${index}`);
player.world.studios![studioId].ai!.intelligence = oversized;

const compacted = compactPlayerForPersistence(player);
const compactedState = compacted.world.studios![studioId].ai!.intelligence!;
assert.ok(compactedState.proposals.length <= INDUSTRY_INTELLIGENCE_PROPOSAL_LIMIT);
assert.ok(compactedState.shadowComparisons.length <= INDUSTRY_INTELLIGENCE_COMPARISON_LIMIT);
assert.ok(compactedState.learning.samples.length <= INDUSTRY_INTELLIGENCE_LEARNING_LIMIT);
assert.ok(compactedState.learning.processedEvidenceIds.length <= INDUSTRY_INTELLIGENCE_PROCESSED_KEY_LIMIT);
assert.ok(compactedState.processedKeys.length <= INDUSTRY_INTELLIGENCE_PROCESSED_KEY_LIMIT);

const firstManifest = createSaveIntegrityManifest(compacted, 'MANUAL', 123, false);
assert.equal(typeof firstManifest.protected.industryIntelligenceState, 'string');
assert.ok(firstManifest.protected.industryIntelligenceState.length > 0);
const changed = structuredClone(compacted);
changed.world.studios![studioId].ai!.intelligence!.nextDueAbsoluteWeek.FINANCE_REVIEW! += 1;
const secondManifest = createSaveIntegrityManifest(changed, 'MANUAL', 123, false);
assert.notEqual(
    firstManifest.protected.industryIntelligenceState,
    secondManifest.protected.industryIntelligenceState,
    'due-lane changes must be protected by save integrity',
);

console.log('Industry Intelligence B2 save audit passed.');
