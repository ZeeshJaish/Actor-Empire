// @ts-nocheck - executable audit fixture.
import assert from 'node:assert/strict';
import type { IndustryProductionCommitment, NPCStudioState } from '../types';
import { normalizeStudioAiState } from '../services/studioAi';
import { evaluateStudioAiProductionProblem } from '../services/studioAi/studioAiProductionProblems';

const studio: NPCStudioState = { id: 'B6_RISK', name: 'Risk House', valuation: 1, reputation: 20, cashReserve: 2, recentHits: 0, archetype: 'INDIE' };
studio.ai = normalizeStudioAiState(studio, { absoluteWeek: 1200 });
studio.ai.competence.production = 10;
const base = { id: 'risk', canonicalProjectId: 'risk_project', title: 'Risk', projectType: 'MOVIE', genre: 'DRAMA', producerStudioId: studio.id, source: 'STUDIO_INDEPENDENT', status: 'PRODUCTION', productionCalendar: { preProductionWeeks: 2, productionWeeks: 6, postProductionWeeks: 2, totalWeeks: 10, weeksCompleted: 3, startedAge: 23, startedWeek: 5, startedAbsoluteWeek: 1200 }, budgetMillions: 100, paidMillions: 45, talentBookingIds: [], writerSource: 'IN_HOUSE_TEAM', writerId: null, writerName: 'Writers', writerSkill: 20, createdAtAbsoluteWeek: 1200, updatedAtAbsoluteWeek: 1203, studioAiExecution: { schemaVersion: 1, source: 'STUDIO_INDEPENDENT', slateCommitmentId: 'slate', fingerprintId: 'fp', controllerAtLastProgression: 'AI', selectedReleaseMode: null, publicReleaseStrategy: null, talentSelected: true, talent: { leadActorId: 'a', leadActorName: 'Actor', directorId: 'd', directorName: 'Director', packageScore: 30, estimatedCostMillions: 10 }, finalQuality: null, result: null, problems: [], paidMilestoneIds: ['PRE_PRODUCTION_START', 'PRODUCTION_START'], processedKeys: [], lastProgressedAbsoluteWeek: 1202 } } as IndustryProductionCommitment;

const first = evaluateStudioAiProductionProblem({ studio, production: base, checkpoint: 'PRODUCTION_35', absoluteWeek: 1203 });
const replay = evaluateStudioAiProductionProblem({ studio, production: base, checkpoint: 'PRODUCTION_35', absoluteWeek: 1203 });
assert.deepEqual(first, replay);
assert.ok(first.problem, 'high-risk fixture must produce a problem');
assert.notEqual(first.problem?.response, 'NONE');
assert.notEqual(first.problem?.response, undefined);
assert.ok(!['REPLACE_TALENT'].includes(String(first.problem?.response)));
const repeatApplied = evaluateStudioAiProductionProblem({ studio: first.studio, production: first.production, checkpoint: 'PRODUCTION_35', absoluteWeek: 1203 });
assert.equal(repeatApplied.changed, false);
assert.equal(repeatApplied.production.studioAiExecution?.problems.length, 1);

console.log('Studio AI B6 production problems audit passed.');
