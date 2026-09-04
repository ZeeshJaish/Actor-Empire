import assert from 'node:assert/strict';
import {
    coolIndustryMomentum,
    createInitialIndustryIntelligenceState,
    deriveIndustryFatigue,
    INDUSTRY_INTELLIGENCE_LEARNING_LIMIT,
    INDUSTRY_INTELLIGENCE_PROCESSED_KEY_LIMIT,
    processIndustryIntelligenceShadowCompany,
    recordIndustryLearningOutcome,
    type IndustryIntelligenceContext,
} from '../services/industryIntelligence';

const absoluteWeek = 900;
const state = createInitialIndustryIntelligenceState('WARNER_BROS', 'PRODUCTION_STUDIO', 'learning_seed', absoluteWeek);
const hit = {
    evidenceId: 'release_hit_1',
    absoluteWeek,
    lane: 'RELEASE_REVIEW' as const,
    outcomeScore: 88,
    capability: 'MARKETING_DISCOVERY' as const,
    capabilityDelta: 8,
    momentumDelta: 16,
    repetitionDelta: 4,
    franchiseDelta: 2,
};

const learnedOnce = recordIndustryLearningOutcome(state, hit);
const learnedReplay = recordIndustryLearningOutcome(learnedOnce, hit);
assert.deepEqual(learnedReplay, learnedOnce, 'the same canonical evidence must never train twice');
assert.ok(learnedOnce.momentum > state.momentum);
assert.equal(learnedOnce.learning.samples.length, 1);
assert.equal(learnedOnce.learning.averageOutcomeByLane.RELEASE_REVIEW, 88);
assert.ok((learnedOnce.learning.capabilityProgress.MARKETING_DISCOVERY || 0) > 0);

const nearCeiling = structuredClone(state);
nearCeiling.learning.capabilityProgress.MARKETING_DISCOVERY = 95;
const ceilingGain = (recordIndustryLearningOutcome(nearCeiling, hit).learning.capabilityProgress.MARKETING_DISCOVERY || 0) - 95;
const earlyGain = (learnedOnce.learning.capabilityProgress.MARKETING_DISCOVERY || 0);
assert.ok(ceilingGain < earlyGain, 'capability growth must diminish near its ceiling');

const context: IndustryIntelligenceContext = {
    companyId: state.companyId, companyKind: state.companyKind, absoluteWeek: absoluteWeek + 12,
    seed: state.seed, controller: 'AI', status: 'ACTIVE',
    identity: { scale: 80, riskTolerance: 60, financialDiscipline: 70, creativePatience: 70, prestigeIntent: 75, commercialIntent: 65, franchiseAppetite: 40, growthIntent: 65, neutralMomentum: 50 },
    capabilities: { PRODUCTION: 80 },
    condition: { cashMillions: 500, debtMillions: 50, runwayWeeks: 60, capacityPressure: 85, momentum: 90, recentResultStrength: 75, audienceTrust: 70, catalogueNeed: 45, marketOpportunity: 55, financialPressure: 15, competitivePressure: 50, repetitionFatigue: 60, franchiseFatigue: 40, overextension: 90, spendingRestricted: false },
    learning: structuredClone(learnedOnce.learning),
    nextDueAbsoluteWeek: { ...learnedOnce.nextDueAbsoluteWeek },
    decisionCycleByLane: { ...learnedOnce.decisionCycleByLane },
    activeCommitmentIds: ['a', 'b', 'c'],
};
const cooled = coolIndustryMomentum({ ...learnedOnce, momentum: 90 }, context, absoluteWeek + 12);
assert.ok(cooled.momentum < 90 && cooled.momentum >= 50, 'momentum must cool toward the company neutral level');
const coordinated = processIndustryIntelligenceShadowCompany({
    context,
    state: { ...learnedOnce, momentum: 90 },
});
assert.ok(coordinated.state.momentum < 90, 'a due intelligence cycle must apply momentum cooling before its proposal');
const fatigue = deriveIndustryFatigue(context);
assert.ok(fatigue.total >= 60 && fatigue.overextension === 90);

let longRun = state;
for (let index = 0; index < 20_800; index += 1) {
    longRun = recordIndustryLearningOutcome(longRun, {
        ...hit,
        evidenceId: `long_${index}`,
        absoluteWeek: absoluteWeek + index,
        outcomeScore: index % 3 === 0 ? 78 : 32,
        momentumDelta: index % 3 === 0 ? 3 : -2,
    });
}
assert.ok(longRun.learning.samples.length <= INDUSTRY_INTELLIGENCE_LEARNING_LIMIT);
assert.ok(longRun.learning.processedEvidenceIds.length <= INDUSTRY_INTELLIGENCE_PROCESSED_KEY_LIMIT);
assert.ok(Number.isFinite(longRun.momentum) && longRun.momentum >= 0 && longRun.momentum <= 100);
assert.ok(Object.values(longRun.learning.capabilityProgress).every(value => Number.isFinite(value) && value >= 0 && value <= 100));

console.log('Industry Intelligence B2 learning audit passed.');
