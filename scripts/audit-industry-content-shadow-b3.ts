import assert from 'node:assert/strict';
import {
    createInitialIndustryIntelligenceState,
    collectIndustryContentGlobalRecent,
    processIndustryContentShadowSelection,
    processIndustryIntelligenceShadowCompany,
} from '../services/industryIntelligence';
import type { IndustryIntelligenceContext } from '../services/industryIntelligence';
import type { IndustryIntelligenceProposal } from '../types';

const baseState = createInitialIndustryIntelligenceState('STUDIO', 'PRODUCTION_STUDIO', 'shadow_seed', 100);
baseState.nextDueAbsoluteWeek = { CONTENT_STRATEGY: 100, PRODUCTION_REVIEW: 999, RELEASE_REVIEW: 999, FINANCE_REVIEW: 999, MARKET_EXPANSION: null, CAPABILITY_GROWTH: 999 };
const context = (controller: 'AI' | 'PLAYER' = 'AI', status = 'ACTIVE'): IndustryIntelligenceContext => ({
    companyId: 'STUDIO', companyKind: 'PRODUCTION_STUDIO', absoluteWeek: 100, seed: 'shadow_seed', controller, status,
    identity: { scale: 75, riskTolerance: 65, financialDiscipline: 70, creativePatience: 70, prestigeIntent: 65, commercialIntent: 75, franchiseAppetite: 78, growthIntent: 70, neutralMomentum: 50 },
    capabilities: { DEVELOPMENT: 80, CREATIVE: 82, PRODUCTION: 78, FINANCE: 74, MARKETING_DISCOVERY: 72 },
    condition: { cashMillions: 2_000, debtMillions: 100, runwayWeeks: 160, capacityPressure: 20, momentum: 65, recentResultStrength: 70, audienceTrust: 72, catalogueNeed: 95, marketOpportunity: 85, financialPressure: 8, competitivePressure: 65, repetitionFatigue: 0, franchiseFatigue: 0, overextension: 15, spendingRestricted: false },
    learning: { averageOutcomeByLane: {}, capabilityProgress: {}, repetitionFatigue: 0, franchiseFatigue: 0, samples: [], processedEvidenceIds: [] },
    nextDueAbsoluteWeek: { ...baseState.nextDueAbsoluteWeek }, decisionCycleByLane: { ...baseState.decisionCycleByLane }, activeCommitmentIds: [],
});

const canonicalProjection = { cash: 2_000, projects: [], rights: [], universes: [] };
const canonicalBefore = structuredClone(canonicalProjection);
const processed = processIndustryIntelligenceShadowCompany({ context: context(), state: structuredClone(baseState), globalRecentFingerprints: [] });
assert.equal(processed.changed, true);
assert.equal(processed.dueLanes.length, 1);
assert.equal(processed.state.proposals.at(-1)?.actionFamily, 'DEVELOP_CONTENT');
assert.equal(processed.state.content.selectedFingerprints.length, 1, 'one due development proposal persists one winner');
assert.equal(processed.state.content.recentNoveltySignatures.length, 1);
assert.deepEqual(canonicalProjection, canonicalBefore, 'shadow content cannot touch canonical game state');

const replay = processIndustryIntelligenceShadowCompany({ context: context(), state: structuredClone(processed.state), globalRecentFingerprints: [] });
assert.equal(replay.changed, false, 'same due decision must be idempotent');
assert.deepEqual(replay.state.content, processed.state.content);

const player = processIndustryIntelligenceShadowCompany({ context: context('PLAYER'), state: structuredClone(baseState), globalRecentFingerprints: [] });
assert.equal(player.changed, false);
assert.equal(player.state.content.selectedFingerprints.length, 0);
const terminal = processIndustryIntelligenceShadowCompany({ context: context('AI', 'CLOSED'), state: structuredClone(baseState), globalRecentFingerprints: [] });
assert.equal(terminal.changed, false);

const holdProposal: IndustryIntelligenceProposal = {
    id: 'hold', idempotencyKey: 'hold', companyId: 'STUDIO', companyKind: 'PRODUCTION_STUDIO', lane: 'CONTENT_STRATEGY', decisionCycle: 0,
    absoluteWeek: 100, actionFamily: 'HOLD', optionId: 'HOLD', urgency: 0, confidence: 0, expectedExposureMillions: 0, affordabilityCeilingMillions: 100,
    score: { total: 0, need: 0, strategyFit: 0, expectedUpside: 0, relationshipValue: 0, competitiveValue: 0, financialRisk: 0, capacityPressure: 0, fatigue: 0, executionRisk: 0 },
    reasonCodes: ['NO_ELIGIBLE_OPTION'], uncertaintyKey: 'hold', status: 'SHADOW', nextReviewAbsoluteWeek: 110,
};
const held = processIndustryContentShadowSelection({ context: context(), state: structuredClone(baseState), proposal: holdProposal, globalRecentFingerprints: [] });
assert.equal(held.changed, false);
assert.equal(held.state.content.selectedFingerprints.length, 0);

const rivalFingerprint = processed.state.content.selectedFingerprints[0];
const global = collectIndustryContentGlobalRecent({
    studios: {
        STUDIO: { id: 'STUDIO', name: 'Studio', valuation: 1, reputation: 1, cashReserve: 1, recentHits: 0, ai: { intelligence: processed.state } } as never,
        RIVAL: { id: 'RIVAL', name: 'Rival', valuation: 1, reputation: 1, cashReserve: 1, recentHits: 0, ai: { intelligence: { ...processed.state, companyId: 'RIVAL', content: { ...processed.state.content, selectedFingerprints: [{ ...rivalFingerprint, id: 'rival_fp', ownerCompanyId: 'RIVAL', createdAtAbsoluteWeek: 101 }] } } } } as never,
    },
} as never, 'STUDIO');
assert.deepEqual(global.map(item => item.id), ['rival_fp'], 'global context is recent, bounded and excludes the current company');

console.log('Industry Content B3 shadow audit passed.');
