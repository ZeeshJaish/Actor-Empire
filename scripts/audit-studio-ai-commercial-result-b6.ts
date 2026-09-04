// @ts-nocheck - executable audit fixture.
import assert from 'node:assert/strict';
import type { IndustryProductionCommitment, NPCStudioState, WorldState } from '../types';
import { normalizeStudioAiState } from '../services/studioAi';
import { releaseStudioAiProduction } from '../services/studioAi/studioAiCommercialResult';

const WEEK = 1600;
const studio = { id: 'commercial', name: 'Commercial House', valuation: 20, reputation: 78, cashReserve: 200, recentHits: 2, archetype: 'COMMERCIAL' } as NPCStudioState;
studio.ai = normalizeStudioAiState(studio, { absoluteWeek: WEEK });
const execution = { schemaVersion: 1, source: 'STUDIO_INDEPENDENT', slateCommitmentId: 'slate', fingerprintId: 'fp', controllerAtLastProgression: 'AI', selectedReleaseMode: 'WIDE_THEATRICAL', publicReleaseStrategy: 'THEATRICAL', releasePlannedAtAbsoluteWeek: WEEK - 2, plannedReleaseAbsoluteWeek: WEEK, releaseBlockedReason: 'NONE', talentSelected: true, talent: { leadActorId: 'a', leadActorName: 'Actor', directorId: 'd', directorName: 'Director', packageScore: 82, estimatedCostMillions: 8 }, finalQuality: { creativeQuality: 82, executionQuality: 79, commercialPotential: 88, prestigePotential: 76, downsideRisk: 24 }, result: null, problems: [], paidMilestoneIds: ['PRE_PRODUCTION_START', 'PRODUCTION_START', 'POST_PRODUCTION_START', 'DELIVERY'], processedKeys: [], lastProgressedAbsoluteWeek: WEEK - 1 } as const;
const production = { id: 'commercial_prod', canonicalProjectId: 'commercial_project', title: 'The Last Signal', projectType: 'MOVIE', genre: 'THRILLER', producerStudioId: studio.id, source: 'STUDIO_INDEPENDENT', status: 'AWAITING_RELEASE', productionCalendar: { preProductionWeeks: 4, productionWeeks: 8, postProductionWeeks: 4, totalWeeks: 16, weeksCompleted: 16, startedAge: 30, startedWeek: 20, startedAbsoluteWeek: WEEK - 18 }, budgetMillions: 60, paidMillions: 60, talentBookingIds: [], writerSource: 'IN_HOUSE_TEAM', writerId: null, writerName: 'Writers', writerSkill: 78, createdAtAbsoluteWeek: WEEK - 18, updatedAtAbsoluteWeek: WEEK - 1, studioAiSlateCommitmentId: 'slate', industryContentFingerprintId: 'fp', studioAiExecution: execution } as IndustryProductionCommitment;
const world = { projects: [], studios: { [studio.id]: studio }, industryProductions: { [production.id]: production }, talentBookings: [] } as unknown as WorldState;
const first = releaseStudioAiProduction({ world, studio, production, absoluteWeek: WEEK });
assert.equal(first.changed, true);
assert.equal(first.production.status, 'RELEASED');
assert.equal(first.world.projects.filter(row => row.id === production.canonicalProjectId).length, 1);
assert.ok((first.project?.boxOffice || 0) > 0);
assert.equal(first.production.studioAiExecution?.result?.productionSpendMillions, 60);
assert.equal(first.studio.ai!.ledger.filter(row => ['RELEASE_MARKETING', 'RIGHTS_INCOME'].includes(row.category)).length, 2);
const replay = releaseStudioAiProduction({ world: first.world, studio: first.studio, production: first.production, absoluteWeek: WEEK });
assert.equal(replay.changed, false);
assert.equal(replay.world.projects.filter(row => row.id === production.canonicalProjectId).length, 1);

const streamingProduction = structuredClone(production);
streamingProduction.id = 'stream_prod';
streamingProduction.canonicalProjectId = 'stream_project';
streamingProduction.studioAiExecution!.selectedReleaseMode = 'STREAMING_ONLY';
streamingProduction.studioAiExecution!.publicReleaseStrategy = 'STREAMING_ONLY';
const streamWorld = { ...world, industryProductions: { [streamingProduction.id]: streamingProduction }, streamingRightsContracts: { right: { id: 'right', sourceProjectId: streamingProduction.canonicalProjectId, buyerPlatformId: 'NETFLIX', status: 'ACTIVE', startsAtAbsoluteWeek: WEEK - 1, expiresAtAbsoluteWeek: WEEK + 50, exclusivity: 'EXCLUSIVE', platformContentPlanId: null, countryIds: ['IN'], territory: 'SELECTED_COUNTRIES' } } } as unknown as WorldState;
const streaming = releaseStudioAiProduction({ world: streamWorld, studio, production: streamingProduction, absoluteWeek: WEEK });
assert.equal(streaming.project?.boxOffice, 0);
assert.ok((streaming.project?.streamingWindows?.length || 0) > 0);

console.log('Studio AI B6 commercial result audit passed.');
