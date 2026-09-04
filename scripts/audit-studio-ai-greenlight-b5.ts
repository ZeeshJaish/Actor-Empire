import assert from 'node:assert/strict';
import { normalizeStudioAiState } from '../services/studioAi';
import { reviewStudioSlateCommitment } from '../services/studioAi/studioAiGreenlight';
import type { IndustryContentFingerprint, IndustryIntelligenceProposal, NPCStudioState, StudioAiSlateCommitment } from '../types';

const studio: NPCStudioState = {
    id: 'GREENLIGHT_STUDIO', name: 'Greenlight Studio', valuation: 45, reputation: 84,
    cashReserve: 1_800, recentHits: 3, archetype: 'COMMERCIAL',
};
studio.ai = normalizeStudioAiState(studio, { absoluteWeek: 200 });
const proposal: IndustryIntelligenceProposal = {
    id: 'proposal_gl', idempotencyKey: 'proposal_gl_key', companyId: studio.id, companyKind: 'PRODUCTION_STUDIO',
    lane: 'CONTENT_STRATEGY', decisionCycle: 2, absoluteWeek: 194, actionFamily: 'DEVELOP_CONTENT', optionId: 'ORIGINAL',
    urgency: 80, confidence: 78, expectedExposureMillions: 90, affordabilityCeilingMillions: 180,
    score: { total: 84, need: 82, strategyFit: 88, expectedUpside: 84, relationshipValue: 55, competitiveValue: 72, financialRisk: 18, capacityPressure: 12, fatigue: 8, executionRisk: 16 },
    reasonCodes: ['STRATEGIC_NEED'], uncertaintyKey: 'gl_uncertainty', status: 'SHADOW', nextReviewAbsoluteWeek: 202,
};
const fingerprint: IndustryContentFingerprint = {
    id: 'fingerprint_gl', seed: 'fingerprint_gl_seed', ownerCompanyId: studio.id, ownerCompanyKind: 'PRODUCTION_STUDIO',
    format: 'MOVIE', primaryGenre: 'ACTION', secondaryGenre: 'DRAMA', subgenre: 'Conspiracy thriller', tone: 'Urgent', theme: 'Loyalty', setting: 'Global', period: 'Contemporary',
    targetAudience: 'MASS', originalLanguage: 'English', priorityMarket: 'USA', commercialIntent: 88, prestigeIntent: 62, creativeRisk: 48, starPowerTarget: 78,
    releasePath: 'THEATRICAL_FIRST', sourceIntent: 'ORIGINAL', relationship: 'STANDALONE',
    budgetSuitability: { minimumMillions: 55, idealLowMillions: 90, idealHighMillions: 130, ambitiousMaximumMillions: 180 },
    noveltySignature: 'action:conspiracy', noveltyScore: 84, createdAtAbsoluteWeek: 194, decisionCycle: 2, lifecycle: 'SELECTED',
};
const commitment: StudioAiSlateCommitment = {
    id: 'commitment_gl', proposalId: proposal.id, proposalKey: proposal.idempotencyKey, fingerprintId: fingerprint.id,
    source: 'INDEPENDENT', status: 'DEVELOPING', createdAtAbsoluteWeek: 194, updatedAtAbsoluteWeek: 194,
    nextReviewAbsoluteWeek: 200, developmentSpendMillions: 4.2, rewriteCount: 0, proposedBudgetMillions: 112,
};

const early = reviewStudioSlateCommitment({ studio, commitment, fingerprint, proposal, absoluteWeek: 199 });
assert.equal(early.reviewed, false);
assert.equal(early.reason, 'NOT_DUE');

const first = reviewStudioSlateCommitment({ studio, commitment, fingerprint, proposal, absoluteWeek: 200 });
const replay = reviewStudioSlateCommitment({ studio: structuredClone(studio), commitment: structuredClone(commitment), fingerprint: structuredClone(fingerprint), proposal: structuredClone(proposal), absoluteWeek: 200 });
assert.deepEqual(first, replay, 'the same saved review inputs must resolve identically');
assert.equal(first.reviewed, true);
assert.ok(first.commitment.scores);
assert.ok(['GREENLIT', 'REWRITE', 'ON_HOLD', 'TURNAROUND', 'ABANDONED'].includes(first.commitment.status));
if (first.commitment.status === 'GREENLIT') {
    assert.ok((first.commitment.greenlightBudgetMillions || 0) >= fingerprint.budgetSuitability.minimumMillions);
    assert.ok((first.commitment.greenlightBudgetMillions || 0) <= proposal.affordabilityCeilingMillions);
    assert.equal(first.commitment.nextReviewAbsoluteWeek, null);
}

const congested = structuredClone(studio);
congested.ai!.slate!.commitments = Array.from({ length: congested.ai!.capacity.productionSlots }, (_, index) => ({
    ...commitment, id: `greenlit_${index}`, proposalId: `p_${index}`, proposalKey: `pk_${index}`, fingerprintId: `f_${index}`,
    status: 'GREENLIT', greenlightBudgetMillions: 80, greenlitAtAbsoluteWeek: 190, nextReviewAbsoluteWeek: null,
}));
const held = reviewStudioSlateCommitment({ studio: congested, commitment, fingerprint, proposal, absoluteWeek: 200 });
assert.equal(held.commitment.status, 'ON_HOLD', 'full production capacity must prevent another greenlight');

const weakStudio = structuredClone(studio);
weakStudio.cashReserve = 8;
weakStudio.reputation = 22;
weakStudio.ai = {
    ...weakStudio.ai!,
    competence: { development: 18, creative: 20, finance: 20, production: 18, marketing: 18, distribution: 20, negotiation: 20, talentRelations: 20 },
    finance: { ...weakStudio.ai!.finance, runwayWeeks: 4 },
};
const weak = reviewStudioSlateCommitment({
    studio: weakStudio,
    commitment: { ...commitment, proposedBudgetMillions: 150 },
    fingerprint: { ...fingerprint, noveltyScore: 34 },
    proposal: { ...proposal, score: { ...proposal.score, total: 36, strategyFit: 30, expectedUpside: 34, financialRisk: 88, executionRisk: 82 } },
    absoluteWeek: 200,
});
assert.notEqual(weak.commitment.status, 'GREENLIT', 'weak, overextended finances must not receive a greenlight floor');

const rewritten = reviewStudioSlateCommitment({
    studio,
    commitment: { ...commitment, rewriteCount: 2 },
    fingerprint: { ...fingerprint, noveltyScore: 55, creativeRisk: 80 },
    proposal: { ...proposal, score: { ...proposal.score, total: 52, strategyFit: 54, expectedUpside: 50, financialRisk: 45, executionRisk: 48 } },
    absoluteWeek: 200,
});
assert.notEqual(rewritten.commitment.status, 'REWRITE', 'rewrite count must be bounded');

console.log('Studio AI B5 greenlight audit passed.');
