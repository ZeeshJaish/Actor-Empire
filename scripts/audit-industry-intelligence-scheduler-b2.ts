import assert from 'node:assert/strict';
import type { IndustryIntelligenceContext } from '../services/industryIntelligence';
import {
    createInitialIndustryIntelligenceState,
    getDueIndustryDecisionLanes,
    processIndustryIntelligenceShadowCompany,
} from '../services/industryIntelligence';

const absoluteWeek = 500;
const state = createInitialIndustryIntelligenceState('NETFLIX', 'STREAMING_PLATFORM', 'schedule_seed', absoluteWeek);
state.nextDueAbsoluteWeek = {
    CONTENT_STRATEGY: absoluteWeek + 3,
    PRODUCTION_REVIEW: absoluteWeek + 2,
    RELEASE_REVIEW: absoluteWeek + 4,
    FINANCE_REVIEW: absoluteWeek,
    MARKET_EXPANSION: absoluteWeek + 8,
    CAPABILITY_GROWTH: absoluteWeek + 7,
};

const context: IndustryIntelligenceContext = {
    companyId: state.companyId,
    companyKind: state.companyKind,
    absoluteWeek,
    seed: state.seed,
    controller: 'AI',
    status: 'ACTIVE',
    identity: {
        scale: 90, riskTolerance: 70, financialDiscipline: 80, creativePatience: 60,
        prestigeIntent: 70, commercialIntent: 90, franchiseAppetite: 60, growthIntent: 85,
        neutralMomentum: 50,
    },
    capabilities: { FINANCE: 80 },
    condition: {
        cashMillions: 8_000, debtMillions: 1_000, runwayWeeks: 70, capacityPressure: 20,
        momentum: 50, recentResultStrength: 60, audienceTrust: 70, catalogueNeed: 40,
        marketOpportunity: 55, financialPressure: 10, competitivePressure: 50,
        repetitionFatigue: 0, franchiseFatigue: 0, overextension: 20, spendingRestricted: false,
    },
    learning: structuredClone(state.learning),
    nextDueAbsoluteWeek: { ...state.nextDueAbsoluteWeek },
    decisionCycleByLane: { ...state.decisionCycleByLane },
    activeCommitmentIds: [],
};

assert.deepEqual(getDueIndustryDecisionLanes(context), ['FINANCE_REVIEW']);

const first = processIndustryIntelligenceShadowCompany({ context, state });
assert.equal(first.changed, true);
assert.deepEqual(first.dueLanes, ['FINANCE_REVIEW']);
assert.equal(first.state.decisionCycleByLane.FINANCE_REVIEW, 1);
assert.ok((first.state.nextDueAbsoluteWeek.FINANCE_REVIEW || 0) > absoluteWeek);
assert.ok(first.state.processedKeys.includes(`STREAMING_PLATFORM:NETFLIX:FINANCE_REVIEW:${absoluteWeek}`));

const replayContext = { ...context, nextDueAbsoluteWeek: { ...first.state.nextDueAbsoluteWeek } };
const replay = processIndustryIntelligenceShadowCompany({ context: replayContext, state: first.state });
assert.equal(replay.changed, false, 'same-week replay must be a no-op');
assert.deepEqual(replay.state, first.state);

const playerResult = processIndustryIntelligenceShadowCompany({
    context: { ...context, controller: 'PLAYER' },
    state,
});
assert.equal(playerResult.changed, false, 'player-controlled companies must be skipped before due evaluation');
assert.deepEqual(playerResult.state, state);

const terminalResult = processIndustryIntelligenceShadowCompany({
    context: { ...context, status: 'CLOSED' },
    state,
});
assert.equal(terminalResult.changed, false, 'terminal companies must not advance decision schedules');

const notDueState = structuredClone(state);
notDueState.nextDueAbsoluteWeek.FINANCE_REVIEW = absoluteWeek + 1;
const notDue = processIndustryIntelligenceShadowCompany({
    context: { ...context, nextDueAbsoluteWeek: { ...notDueState.nextDueAbsoluteWeek } },
    state: notDueState,
});
assert.equal(notDue.changed, false);
assert.deepEqual(notDue.dueLanes, []);

console.log('Industry Intelligence B2 scheduler audit passed.');
