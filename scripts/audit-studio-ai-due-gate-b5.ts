import assert from 'node:assert/strict';
import { createInitialIndustryIntelligenceState } from '../services/industryIntelligence';
import { isStudioIntelligenceDue } from '../services/studioAi/studioAiDueGate';

const state = createInitialIndustryIntelligenceState('DUE_GATE', 'PRODUCTION_STUDIO', 'due_gate_seed', 100);
state.nextDueAbsoluteWeek = {
    CONTENT_STRATEGY: 120,
    PRODUCTION_REVIEW: 130,
    RELEASE_REVIEW: null,
    FINANCE_REVIEW: 140,
    MARKET_EXPANSION: 150,
    CAPABILITY_GROWTH: 160,
};
assert.equal(isStudioIntelligenceDue(state, 119), false);
assert.equal(isStudioIntelligenceDue(state, 120), true);
assert.equal(isStudioIntelligenceDue(state, 999), true);
assert.equal(isStudioIntelligenceDue(undefined, 100), true, 'missing legacy intelligence must enter normalization rather than being skipped');

console.log('Studio AI B5 due-lane gate audit passed.');
