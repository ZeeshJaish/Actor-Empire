import assert from 'node:assert/strict';
import {
    PLATFORM_INTELLIGENCE_OUTCOME_LIMIT,
    PLATFORM_INTELLIGENCE_PROCESSED_KEY_LIMIT,
    createInitialPlatformIntelligenceMigrationState,
    normalizePlatformIntelligenceMigrationState,
} from '../services/platformAi/platformIntelligenceMigration';
import {
    createInitialIndustryIntelligenceState,
    processIndustryIntelligenceShadowCompany,
} from '../services/industryIntelligence';
import type { IndustryIntelligenceContext } from '../services/industryIntelligence';

const initial = createInitialPlatformIntelligenceMigrationState(44);
assert.equal(initial.activatedAtAbsoluteWeek, 44);
assert.equal(initial.legacyPlanningRetiredAtAbsoluteWeek, 44);
assert.deepEqual(initial.processedProposalKeys, []);
assert.deepEqual(initial.outcomes, []);

const malformed = normalizePlatformIntelligenceMigrationState({
    schemaVersion: 99,
    activatedAtAbsoluteWeek: -4,
    legacyPlanningRetiredAtAbsoluteWeek: Number.NaN,
    processedProposalKeys: Array.from({ length: 90 }, (_, index) => `key_${index}`),
    outcomes: Array.from({ length: 50 }, (_, index) => ({
        id: `outcome_${index}`,
        proposalId: `proposal_${index}`,
        proposalKey: `key_${index}`,
        intentRoute: index % 2 ? 'COMMISSION_ORIGINAL' : 'HOLD',
        status: index % 2 ? 'EXECUTED' : 'HELD',
        absoluteWeek: index,
        reason: 'TEST',
        canonicalReferenceIds: [`ref_${index}`],
    })),
}, 50);
assert.equal(malformed.schemaVersion, 1);
assert.equal(malformed.activatedAtAbsoluteWeek, 0);
assert.equal(malformed.legacyPlanningRetiredAtAbsoluteWeek, 50);
assert.equal(malformed.processedProposalKeys.length, PLATFORM_INTELLIGENCE_PROCESSED_KEY_LIMIT);
assert.equal(malformed.outcomes.length, PLATFORM_INTELLIGENCE_OUTCOME_LIMIT);
assert.equal(new Set(malformed.processedProposalKeys).size, malformed.processedProposalKeys.length);

const intelligence = createInitialIndustryIntelligenceState('NETFLIX', 'STREAMING_PLATFORM', 'b4_state', 100);
intelligence.nextDueAbsoluteWeek = {
    CONTENT_STRATEGY: 100,
    PRODUCTION_REVIEW: 999,
    RELEASE_REVIEW: 999,
    FINANCE_REVIEW: 999,
    MARKET_EXPANSION: 999,
    CAPABILITY_GROWTH: 999,
};
const context: IndustryIntelligenceContext = {
    companyId: 'NETFLIX', companyKind: 'STREAMING_PLATFORM', absoluteWeek: 100, seed: 'b4_state', controller: 'AI', status: 'ACTIVE',
    identity: { scale: 90, riskTolerance: 75, financialDiscipline: 80, creativePatience: 78, prestigeIntent: 75, commercialIntent: 90, franchiseAppetite: 80, growthIntent: 84, neutralMomentum: 50 },
    capabilities: { DEVELOPMENT: 84, CREATIVE: 86, PRODUCTION: 82, FINANCE: 84, MARKETING_DISCOVERY: 90, DISTRIBUTION_MARKET: 88, NEGOTIATION: 84, TECHNOLOGY: 88, CATALOGUE: 50, LOCALIZATION: 80 },
    condition: { cashMillions: 8_000, debtMillions: 500, runwayWeeks: 180, capacityPressure: 15, momentum: 70, recentResultStrength: 78, audienceTrust: 82, catalogueNeed: 96, marketOpportunity: 84, financialPressure: 5, competitivePressure: 70, repetitionFatigue: 0, franchiseFatigue: 0, overextension: 10, spendingRestricted: false },
    learning: structuredClone(intelligence.learning), nextDueAbsoluteWeek: { ...intelligence.nextDueAbsoluteWeek }, decisionCycleByLane: { ...intelligence.decisionCycleByLane }, activeCommitmentIds: [],
};
const processed = processIndustryIntelligenceShadowCompany({ context, state: intelligence, globalRecentFingerprints: [] });
const proposal = processed.state.proposals.at(-1);
assert.equal(proposal?.actionFamily, 'DEVELOP_CONTENT');
assert.ok(proposal?.contentFingerprintId, 'B4 requires a stable proposal-to-fingerprint link');
assert.equal(processed.state.content.selectedFingerprints.at(-1)?.id, proposal?.contentFingerprintId);

console.log('Platform Intelligence B4 state audit passed.');
