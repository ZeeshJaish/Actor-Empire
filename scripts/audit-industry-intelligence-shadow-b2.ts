import assert from 'node:assert/strict';
import type { IndustryIntelligenceContext } from '../services/industryIntelligence';
import {
    captureIndustryShadowBaseline,
    compareIndustryShadowDecision,
    createInitialIndustryIntelligenceState,
    INDUSTRY_INTELLIGENCE_COMPARISON_LIMIT,
    processIndustryIntelligenceShadowCompany,
} from '../services/industryIntelligence';

const absoluteWeek = 1_000;
const initial = createInitialIndustryIntelligenceState('NETFLIX', 'STREAMING_PLATFORM', 'shadow_seed', absoluteWeek);
initial.nextDueAbsoluteWeek.FINANCE_REVIEW = absoluteWeek;
const context: IndustryIntelligenceContext = {
    companyId: initial.companyId, companyKind: initial.companyKind, absoluteWeek,
    seed: initial.seed, controller: 'AI', status: 'ACTIVE',
    identity: { scale: 90, riskTolerance: 70, financialDiscipline: 82, creativePatience: 60, prestigeIntent: 70, commercialIntent: 90, franchiseAppetite: 60, growthIntent: 85, neutralMomentum: 50 },
    capabilities: { FINANCE: 85, TECHNOLOGY: 90, LOCALIZATION: 65 },
    condition: { cashMillions: 5_000, debtMillions: 500, runwayWeeks: 70, capacityPressure: 20, momentum: 55, recentResultStrength: 62, audienceTrust: 70, catalogueNeed: 45, marketOpportunity: 60, financialPressure: 12, competitivePressure: 55, repetitionFatigue: 5, franchiseFatigue: 3, overextension: 20, spendingRestricted: false },
    learning: structuredClone(initial.learning), nextDueAbsoluteWeek: { ...initial.nextDueAbsoluteWeek },
    decisionCycleByLane: { ...initial.decisionCycleByLane }, activeCommitmentIds: ['plan_one'],
};

const baseline = captureIndustryShadowBaseline(context);
assert.equal(Object.isFrozen(baseline), true);
assert.equal(baseline.cashMillions, 5_000);
assert.deepEqual(baseline.activeCommitmentIds, ['plan_one']);

const processed = processIndustryIntelligenceShadowCompany({ context, state: initial });
const proposal = processed.state.proposals.find(item => item.lane === 'FINANCE_REVIEW')!;
assert.ok(proposal);

const canonicalBefore = structuredClone(baseline);
const compared = compareIndustryShadowDecision({
    state: processed.state,
    proposal,
    observation: {
        acted: true,
        eligible: true,
        actionFamily: proposal.actionFamily === 'REDUCE_SPEND' ? 'MAINTAIN_BUDGET' : 'REDUCE_SPEND',
        exposureMillions: proposal.expectedExposureMillions,
        absoluteWeek,
    },
});
assert.equal(compared.changed, true);
assert.equal(compared.comparison?.divergence, 'ACTION_FAMILY_DIFFERENCE');
assert.deepEqual(baseline, canonicalBefore, 'comparison must not mutate its canonical input projection');

const replay = compareIndustryShadowDecision({
    state: compared.state,
    proposal,
    observation: { acted: true, eligible: true, actionFamily: 'ANYTHING', exposureMillions: 0, absoluteWeek },
});
assert.equal(replay.changed, false, 'the same company/lane/week comparison must be exact-once');

const withoutObservation = compareIndustryShadowDecision({
    state: processed.state,
    proposal: { ...proposal, id: `${proposal.id}_none`, idempotencyKey: `${proposal.idempotencyKey}_none` },
    observation: null,
});
assert.equal(withoutObservation.comparison?.divergence, 'NO_AUTHORITATIVE_OBSERVATION');

let boundedState = processed.state;
for (let index = 0; index < 100; index += 1) {
    const uniqueProposal = {
        ...proposal,
        id: `${proposal.id}_${index}`,
        idempotencyKey: `${proposal.idempotencyKey}_${index}`,
        absoluteWeek: absoluteWeek + index,
    };
    boundedState = compareIndustryShadowDecision({
        state: boundedState,
        proposal: uniqueProposal,
        observation: { acted: false, eligible: true, actionFamily: 'HOLD', exposureMillions: 0, absoluteWeek: absoluteWeek + index },
    }).state;
}
assert.ok(boundedState.shadowComparisons.length <= INDUSTRY_INTELLIGENCE_COMPARISON_LIMIT);

console.log('Industry Intelligence B2 shadow audit passed.');
