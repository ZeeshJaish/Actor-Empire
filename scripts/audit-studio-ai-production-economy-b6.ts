// @ts-nocheck - executable audit fixture.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER } from '../types';
import type { IndustryProductionCommitment, NPCStudioState } from '../types';
import { normalizeStudioAiState } from '../services/studioAi';
import { applyStudioAiProductionMilestone, getStudioAiProductionMilestones } from '../services/studioAi/studioAiProductionEconomy';

const WEEK = 1000;
const studio: NPCStudioState = { id: 'B6_ECONOMY', name: 'B6 Economy', valuation: 20, reputation: 70, cashReserve: 500, recentHits: 1, archetype: 'COMMERCIAL' };
studio.ai = normalizeStudioAiState(studio, { absoluteWeek: WEEK });
studio.ai.finance.committedSpendMillions = 101.03;
const production: IndustryProductionCommitment = {
    id: 'b6_economy_prod', canonicalProjectId: 'b6_economy_project', title: 'Cost Ledger', projectType: 'MOVIE', genre: 'DRAMA',
    producerStudioId: studio.id, source: 'STUDIO_INDEPENDENT', status: 'PRE_PRODUCTION',
    productionCalendar: { preProductionWeeks: 4, productionWeeks: 8, postProductionWeeks: 4, totalWeeks: 16, weeksCompleted: 0, startedAge: 20, startedWeek: 13, startedAbsoluteWeek: WEEK },
    budgetMillions: 101.03, paidMillions: 0, talentBookingIds: [], writerSource: 'IN_HOUSE_TEAM', writerId: null,
    writerName: 'Writers', writerSkill: 70, createdAtAbsoluteWeek: WEEK, updatedAtAbsoluteWeek: WEEK,
    studioAiExecution: { schemaVersion: 1, source: 'STUDIO_INDEPENDENT', slateCommitmentId: 'slate', fingerprintId: 'fp', controllerAtLastProgression: 'AI', selectedReleaseMode: null, publicReleaseStrategy: null, talentSelected: false, talent: null, finalQuality: null, result: null, problems: [], paidMilestoneIds: [], processedKeys: [], lastProgressedAbsoluteWeek: WEEK },
};

let state = { studio, production };
const milestones = getStudioAiProductionMilestones(production.budgetMillions);
assert.deepEqual(milestones.map(row => row.amountMillions), [15.155, 30.309, 30.309, 25.257]);
milestones.forEach((milestone, index) => {
    state = applyStudioAiProductionMilestone({ ...state, milestone: milestone.id, absoluteWeek: WEEK + index + 1 });
});
assert.equal(state.production.paidMillions, 101.03);
assert.equal(state.studio.cashReserve, 398.97);
assert.equal(state.studio.ai!.finance.committedSpendMillions, 0);
assert.equal(state.studio.ai!.ledger.filter(row => row.category === 'PRODUCTION').length, 4);
const replay = applyStudioAiProductionMilestone({ ...state, milestone: 'DELIVERY', absoluteWeek: WEEK + 10 });
assert.equal(replay.studio.cashReserve, state.studio.cashReserve);
assert.equal(replay.production.paidMillions, state.production.paidMillions);

/* 18 Nov 2026 (debt plan v2): short of cash for a production bill, a studio asks the Bank before it pauses the film.
   With good credit the Bank lends and the film goes on; with a record of defaults it says no and the film is held. */
const poorStudio = structuredClone(studio);
poorStudio.cashReserve = 1;
const funded = applyStudioAiProductionMilestone({ studio: poorStudio, production, milestone: 'PRE_PRODUCTION_START', absoluteWeek: WEEK + 1 });
const fundedLoan = (funded.studio.ai!.finance.loans || [])[0];
assert.ok(fundedLoan && fundedLoan.principal > 0 && fundedLoan.status === 'ACTIVE', 'a creditworthy studio short of cash borrows from the Bank');
assert.notEqual(funded.production.status, 'ON_HOLD', 'a funded production goes on');
assert.ok(funded.production.paidMillions > 0);
assert.ok(funded.studio.ai!.events.some(event => event.type === 'BANK' && event.bank?.kind === 'TAKEN' && event.bank.reason === 'PRODUCTION'));
assert.ok(Math.abs(funded.studio.cashReserve - (1 + fundedLoan.principal / 1_000_000 - funded.production.paidMillions)) < 0.01, 'cash reconciles: own cash + loan - the bill');

const defaulter = structuredClone(poorStudio);
defaulter.ai!.finance.credit = { successfulPayments: 0, missedPayments: 6, defaults: 3, totalBorrowed: 50_000_000 };
const held = applyStudioAiProductionMilestone({ studio: defaulter, production, milestone: 'PRE_PRODUCTION_START', absoluteWeek: WEEK + 1 });
assert.equal(held.production.status, 'ON_HOLD');
assert.equal(held.production.paidMillions, 0);
assert.equal(held.studio.cashReserve, 1);
assert.equal(held.production.studioAiExecution?.problems[0]?.type, 'FINANCING_HOLD');
assert.ok(held.studio.ai!.events.some(event => event.type === 'BANK' && event.bank?.kind === 'REJECTED'), 'the refusal is on record');

void INITIAL_PLAYER;
console.log('Studio AI B6 production economy audit passed.');
