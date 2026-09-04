import assert from 'node:assert/strict';
import type { IndustryIntelligenceContext } from '../services/industryIntelligence';
import {
    createInitialIndustryIntelligenceState,
    createIndustryForecast,
    evaluateIndustryDecisionOptions,
    processIndustryIntelligenceShadowCompany,
    type IndustryDecisionOption,
} from '../services/industryIntelligence';

const makeContext = (financeCompetence: number, absoluteWeek = 800): IndustryIntelligenceContext => {
    const state = createInitialIndustryIntelligenceState('NETFLIX', 'STREAMING_PLATFORM', 'decision_seed', absoluteWeek);
    state.nextDueAbsoluteWeek.CAPABILITY_GROWTH = absoluteWeek;
    return {
        companyId: state.companyId,
        companyKind: state.companyKind,
        absoluteWeek,
        seed: state.seed,
        controller: 'AI',
        status: 'ACTIVE',
        identity: {
            scale: 90, riskTolerance: 70, financialDiscipline: 80, creativePatience: 65,
            prestigeIntent: 70, commercialIntent: 88, franchiseAppetite: 55, growthIntent: 85,
            neutralMomentum: 50,
        },
        capabilities: { FINANCE: financeCompetence, TECHNOLOGY: financeCompetence, LOCALIZATION: 35 },
        condition: {
            cashMillions: 1_000, debtMillions: 100, runwayWeeks: 60, capacityPressure: 15,
            momentum: 55, recentResultStrength: 60, audienceTrust: 65, catalogueNeed: 55,
            marketOpportunity: 72, financialPressure: 15, competitivePressure: 70,
            repetitionFatigue: 5, franchiseFatigue: 4, overextension: 10, spendingRestricted: false,
        },
        learning: structuredClone(state.learning),
        nextDueAbsoluteWeek: { ...state.nextDueAbsoluteWeek },
        decisionCycleByLane: { ...state.decisionCycleByLane },
        activeCommitmentIds: [],
    };
};

const affordable: IndustryDecisionOption = {
    optionId: 'localization_upgrade', actionFamily: 'RESEARCH_LOCALIZATION', expectedExposureMillions: 50,
    requiresCapacity: true, requiredCapability: null, hardBlockReasonCodes: [],
    need: 82, strategyFit: 70, expectedUpside: 74, relationshipValue: 0, competitiveValue: 65,
    financialRisk: 12, executionRisk: 18, fatigue: 5,
};
const unaffordable: IndustryDecisionOption = {
    ...affordable,
    optionId: 'moonshot', actionFamily: 'RESEARCH_TECHNOLOGY', expectedExposureMillions: 900,
    expectedUpside: 100,
};

const context = makeContext(80);
const result = evaluateIndustryDecisionOptions(context, 'CAPABILITY_GROWTH', [unaffordable, affordable]);
assert.equal(result.selected?.optionId, affordable.optionId, 'hard affordability must beat a larger upside score');
assert.ok(result.rejected.some(item => item.optionId === unaffordable.optionId && item.reasonCodes.includes('INSUFFICIENT_RUNWAY')));
assert.ok(Number.isFinite(result.selected!.score.total));
assert.ok(result.selected!.reasonCodes.includes('CAPABILITY_GAP'));

const restricted = evaluateIndustryDecisionOptions(
    { ...context, condition: { ...context.condition, spendingRestricted: true } },
    'CAPABILITY_GROWTH',
    [affordable],
);
assert.equal(restricted.selected, null);
assert.ok(restricted.rejected[0].reasonCodes.includes('SPENDING_RESTRICTED'));

const tieA = { ...affordable, optionId: 'a' };
const tieB = { ...affordable, optionId: 'b' };
assert.equal(
    evaluateIndustryDecisionOptions(context, 'CAPABILITY_GROWTH', [tieA, tieB]).selected?.optionId,
    evaluateIndustryDecisionOptions(context, 'CAPABILITY_GROWTH', [tieB, tieA]).selected?.optionId,
    'tie resolution must not depend on input ordering',
);

const highErrors: number[] = [];
const lowErrors: number[] = [];
for (let index = 0; index < 400; index += 1) {
    highErrors.push(createIndustryForecast(makeContext(92, 800 + index), 'CAPABILITY_GROWTH', 'upgrade').error);
    lowErrors.push(createIndustryForecast(makeContext(20, 800 + index), 'CAPABILITY_GROWTH', 'upgrade').error);
}
const deviation = (values: number[]) => Math.sqrt(values.reduce((sum, value) => sum + value ** 2, 0) / values.length);
assert.ok(deviation(highErrors) < deviation(lowErrors), 'competence must narrow forecast error');
assert.ok(highErrors.some(value => value < 0) && highErrors.some(value => value > 0), 'strong companies must retain two-sided uncertainty');

const dueState = createInitialIndustryIntelligenceState('NETFLIX', 'STREAMING_PLATFORM', 'decision_seed', 800);
dueState.nextDueAbsoluteWeek = { ...context.nextDueAbsoluteWeek, CAPABILITY_GROWTH: 800 };
const processed = processIndustryIntelligenceShadowCompany({
    context: { ...context, nextDueAbsoluteWeek: { ...dueState.nextDueAbsoluteWeek } },
    state: dueState,
});
assert.equal(processed.state.proposals.length, 1, 'a due lane must persist one proposal or hold');
assert.equal(processed.state.proposals[0].status, 'SHADOW');
assert.ok(processed.state.proposals[0].reasonCodes.length > 0);

console.log('Industry Intelligence B2 decision audit passed.');
