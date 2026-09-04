import assert from 'node:assert/strict';
import { normalizeStudioAiState } from '../services/studioAi';
import { adoptStudioIndustryCommissions } from '../services/studioAi/studioAiCommissionBridge';
import type { IndustryProductionCommitment, NPCStudioState, WorldState } from '../types';

const WEEK = 500;
const studio: NPCStudioState = {
    id: 'COMMISSION_STUDIO', name: 'Commission Studio', valuation: 12, reputation: 76,
    cashReserve: 340, recentHits: 1, archetype: 'GENRE',
};
studio.ai = normalizeStudioAiState(studio, { absoluteWeek: WEEK });
const production: IndustryProductionCommitment = {
    id: 'industry_commission_1', canonicalProjectId: 'canonical_commission_1', title: 'Signal Night', projectType: 'MOVIE', genre: 'THRILLER',
    producerStudioId: studio.id, commissioningPlatformId: 'NETFLIX', platformContentPlanId: 'plan_commission_1', status: 'PRE_PRODUCTION',
    productionCalendar: { totalWeeks: 20, elapsedWeeks: 0, preProductionWeeks: 4, productionWeeks: 10, postProductionWeeks: 6, focusWindowWeeks: 15, startedAbsoluteWeek: WEEK },
    budgetMillions: 85, paidMillions: 4.25, talentBookingIds: [], writerSource: 'IN_HOUSE_TEAM', writerId: null,
    writerName: 'Commission Studio Story Department', writerSkill: 70, createdAtAbsoluteWeek: WEEK, updatedAtAbsoluteWeek: WEEK,
};
const world = { studios: { [studio.id]: studio }, industryProductions: { [production.id]: production }, platforms: {} } as unknown as WorldState;

const adopted = adoptStudioIndustryCommissions({ world, studio, absoluteWeek: WEEK });
assert.equal(adopted.adoptedCount, 1);
assert.equal(adopted.studio.cashReserve, studio.cashReserve, 'commission adoption must not charge independent development spending');
assert.equal(adopted.studio.ai?.slate?.commitments[0].source, 'COMMISSION');
assert.equal(adopted.studio.ai?.slate?.commitments[0].status, 'HANDED_OFF');
assert.equal(adopted.studio.ai?.slate?.commitments[0].industryProductionId, production.id);
assert.equal(adopted.studio.ai?.slate?.commitments[0].greenlightBudgetMillions, production.budgetMillions);
assert.ok(adopted.studio.ai?.slate?.commitments[0].legacyReleaseConsumedAtAbsoluteWeek !== undefined, 'canonical commission production must not be released again by the legacy bridge');

const replay = adoptStudioIndustryCommissions({ world, studio: adopted.studio, absoluteWeek: WEEK });
assert.equal(replay.adoptedCount, 0);
assert.deepEqual(replay.studio, adopted.studio);

const playerOwned = structuredClone(studio);
playerOwned.ai!.controller = 'PLAYER';
assert.equal(adoptStudioIndustryCommissions({ world, studio: playerOwned, absoluteWeek: WEEK }).adoptedCount, 0);

console.log('Studio AI B5 commission bridge audit passed.');
