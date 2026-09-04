import assert from 'node:assert/strict';
import { createInitialIndustryIntelligenceState } from '../services/industryIntelligence';
import { normalizeStudioAiState } from '../services/studioAi';
import {
    admitStudioContentProposal,
    applyStudioAiDevelopmentTransaction,
} from '../services/studioAi/studioAiSlateAdmission';
import type { IndustryContentFingerprint, IndustryIntelligenceProposal, NPCStudioState } from '../types';

const studio: NPCStudioState = {
    id: 'ADMISSION_STUDIO', name: 'Admission Studio', valuation: 8, reputation: 72,
    cashReserve: 260, recentHits: 1, archetype: 'PRESTIGE',
};
studio.ai = normalizeStudioAiState(studio, { absoluteWeek: 100 });
const intelligence = createInitialIndustryIntelligenceState(studio.id, 'PRODUCTION_STUDIO', 'admission_seed', 100);
const proposal: IndustryIntelligenceProposal = {
    id: 'proposal_1', idempotencyKey: 'proposal_key_1', companyId: studio.id, companyKind: 'PRODUCTION_STUDIO',
    lane: 'CONTENT_STRATEGY', decisionCycle: 1, absoluteWeek: 100, actionFamily: 'DEVELOP_CONTENT', optionId: 'ORIGINAL',
    urgency: 76, confidence: 70, expectedExposureMillions: 60, affordabilityCeilingMillions: 90,
    score: { total: 78, need: 80, strategyFit: 77, expectedUpside: 75, relationshipValue: 40, competitiveValue: 60, financialRisk: 20, capacityPressure: 10, fatigue: 10, executionRisk: 24 },
    reasonCodes: ['STRATEGIC_NEED'], uncertaintyKey: 'uncertainty_1', status: 'SHADOW', nextReviewAbsoluteWeek: 110,
};
const fingerprint: IndustryContentFingerprint = {
    id: 'fingerprint_1', seed: 'fingerprint_seed', ownerCompanyId: studio.id, ownerCompanyKind: 'PRODUCTION_STUDIO',
    format: 'MOVIE', primaryGenre: 'DRAMA', subgenre: 'Political drama', tone: 'Tense', theme: 'Power', setting: 'Capital city', period: 'Contemporary',
    targetAudience: 'ADULTS', originalLanguage: 'English', priorityMarket: 'USA', commercialIntent: 65, prestigeIntent: 82,
    creativeRisk: 54, starPowerTarget: 62, releasePath: 'THEATRICAL_FIRST', sourceIntent: 'ORIGINAL', relationship: 'STANDALONE',
    budgetSuitability: { minimumMillions: 20, idealLowMillions: 45, idealHighMillions: 70, ambitiousMaximumMillions: 105 },
    noveltySignature: 'political:drama', noveltyScore: 88, createdAtAbsoluteWeek: 100, decisionCycle: 1, lifecycle: 'SELECTED',
};
studio.ai.intelligence = { ...intelligence, content: { ...intelligence.content, selectedFingerprints: [fingerprint] } };

const admitted = admitStudioContentProposal({ studio, proposal, fingerprint, absoluteWeek: 100 });
assert.equal(admitted.accepted, true);
assert.equal(admitted.commitment?.fingerprintId, fingerprint.id);
assert.equal(admitted.commitment?.status, 'DEVELOPING');
assert.ok((admitted.commitment?.developmentSpendMillions || 0) > 0);
assert.ok((admitted.commitment?.developmentSpendMillions || 0) <= proposal.affordabilityCeilingMillions);
assert.ok((admitted.commitment?.proposedBudgetMillions || 0) >= fingerprint.budgetSuitability.minimumMillions);
assert.ok((admitted.commitment?.proposedBudgetMillions || 0) <= fingerprint.budgetSuitability.ambitiousMaximumMillions);

const spent = applyStudioAiDevelopmentTransaction(studio, admitted.transaction!);
const replayed = applyStudioAiDevelopmentTransaction(spent, admitted.transaction!);
assert.equal(spent.cashReserve, studio.cashReserve - admitted.transaction!.amountMillions);
assert.equal(replayed.cashReserve, spent.cashReserve, 'replaying one development transaction must not charge twice');
assert.equal(replayed.ai?.ledger.filter(item => item.id === admitted.transaction!.id).length, 1);

assert.equal(admitStudioContentProposal({ studio: { ...studio, ai: { ...studio.ai!, controller: 'PLAYER' } }, proposal, fingerprint, absoluteWeek: 100 }).reason, 'PLAYER_CONTROLLED');
assert.equal(admitStudioContentProposal({ studio: { ...studio, ai: { ...studio.ai!, status: 'CLOSED' } }, proposal, fingerprint, absoluteWeek: 100 }).reason, 'STUDIO_UNAVAILABLE');
assert.equal(admitStudioContentProposal({ studio, proposal, fingerprint: { ...fingerprint, ownerCompanyId: 'OTHER' }, absoluteWeek: 100 }).reason, 'FINGERPRINT_OWNERSHIP');
assert.equal(admitStudioContentProposal({ studio, proposal, fingerprint: { ...fingerprint, sourceIntent: 'ACQUIRED_IP' }, absoluteWeek: 100 }).reason, 'MISSING_SOURCE_RIGHT');

const occupied = structuredClone(studio);
occupied.ai!.slate!.commitments = Array.from({ length: occupied.ai!.capacity.developmentSlots }, (_, index) => ({
    ...admitted.commitment!, id: `occupied_${index}`, proposalId: `occupied_proposal_${index}`, proposalKey: `occupied_key_${index}`, fingerprintId: `occupied_fingerprint_${index}`,
}));
assert.equal(admitStudioContentProposal({ studio: occupied, proposal, fingerprint, absoluteWeek: 100 }).reason, 'NO_DEVELOPMENT_CAPACITY');

const duplicate = structuredClone(studio);
duplicate.ai!.slate!.commitments = [admitted.commitment!];
assert.equal(admitStudioContentProposal({ studio: duplicate, proposal, fingerprint, absoluteWeek: 100 }).reason, 'DUPLICATE_COMMITMENT');

console.log('Studio AI B5 slate admission audit passed.');
