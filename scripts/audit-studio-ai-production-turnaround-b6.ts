// @ts-nocheck - executable audit fixture.
import assert from 'node:assert/strict';
import type { IndustryProductionCommitment, NPCStudioState, WorldState } from '../types';
import { normalizeStudioAiState } from '../services/studioAi';
import { settleStudioAiProductionTurnaround } from '../services/studioAi/studioAiProductionTurnaround';

const WEEK = 1300;
const makeStudio = (id: string, cash: number): NPCStudioState => {
    const studio = { id, name: id, valuation: 10, reputation: 70, cashReserve: cash, recentHits: 1, archetype: 'COMMERCIAL' } as NPCStudioState;
    studio.ai = normalizeStudioAiState(studio, { absoluteWeek: WEEK });
    return studio;
};
const seller = makeStudio('seller', 10);
seller.ai!.finance.committedSpendMillions = 55;
const buyer = makeStudio('buyer', 300);
const production = { id: 'turnaround', canonicalProjectId: 'turn_project', title: 'Turn', projectType: 'MOVIE', genre: 'DRAMA', producerStudioId: seller.id, source: 'STUDIO_INDEPENDENT', status: 'TURNAROUND', productionCalendar: { preProductionWeeks: 4, productionWeeks: 8, postProductionWeeks: 4, totalWeeks: 16, weeksCompleted: 5, startedAge: 25, startedWeek: 1, startedAbsoluteWeek: WEEK - 5 }, budgetMillions: 80, paidMillions: 25, talentBookingIds: [], writerSource: 'IN_HOUSE_TEAM', writerId: null, writerName: 'Writers', writerSkill: 70, createdAtAbsoluteWeek: WEEK - 5, updatedAtAbsoluteWeek: WEEK, studioAiExecution: { schemaVersion: 1, source: 'STUDIO_INDEPENDENT', slateCommitmentId: 'slate', fingerprintId: 'fp', originalProducerStudioId: seller.id, controllerAtLastProgression: 'AI', selectedReleaseMode: 'TURNAROUND', publicReleaseStrategy: null, talentSelected: false, talent: null, finalQuality: null, result: null, problems: [], paidMilestoneIds: ['PRE_PRODUCTION_START'], processedKeys: [], lastProgressedAbsoluteWeek: WEEK - 1 } } as IndustryProductionCommitment;
const world = { projects: [], studios: { seller, buyer }, industryProductions: { [production.id]: production }, talentBookings: [] } as unknown as WorldState;
const first = settleStudioAiProductionTurnaround({ world, production, seller, buyer, absoluteWeek: WEEK });
assert.equal(first.changed, true);
assert.equal(first.production.producerStudioId, buyer.id);
assert.equal(first.production.id, production.id);
assert.equal(first.seller.cashReserve, 29.25);
assert.equal(first.buyer.cashReserve, 280.75);
assert.equal(first.seller.ai!.finance.committedSpendMillions, 0);
assert.equal(first.buyer.ai!.finance.committedSpendMillions, 55);
const replay = settleStudioAiProductionTurnaround({ world: first.world, production: first.production, seller: first.seller, buyer: first.buyer, absoluteWeek: WEEK });
assert.equal(replay.changed, false);
assert.equal(replay.buyer.cashReserve, first.buyer.cashReserve);

console.log('Studio AI B6 turnaround audit passed.');
