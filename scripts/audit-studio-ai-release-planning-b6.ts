// @ts-nocheck - executable audit fixture.
import assert from 'node:assert/strict';
import type { IndustryContentFingerprint, IndustryProductionCommitment, NPCStudioState, WorldState } from '../types';
import { normalizeStudioAiState } from '../services/studioAi';
import { planStudioAiProductionRelease } from '../services/studioAi/studioAiReleasePlanning';

const studio = { id: 'release', name: 'Release', valuation: 20, reputation: 75, cashReserve: 300, recentHits: 2, archetype: 'COMMERCIAL' } as NPCStudioState;
studio.ai = normalizeStudioAiState(studio, { absoluteWeek: 1500 });
const production = { id: 'release_prod', canonicalProjectId: 'release_project', title: 'Release', projectType: 'MOVIE', genre: 'DRAMA', producerStudioId: studio.id, source: 'STUDIO_INDEPENDENT', status: 'AWAITING_RELEASE', productionCalendar: { preProductionWeeks: 2, productionWeeks: 5, postProductionWeeks: 2, totalWeeks: 9, weeksCompleted: 9, startedAge: 28, startedWeek: 45, startedAbsoluteWeek: 1490 }, budgetMillions: 50, paidMillions: 50, talentBookingIds: [], writerSource: 'IN_HOUSE_TEAM', writerId: null, writerName: 'Writers', writerSkill: 70, createdAtAbsoluteWeek: 1490, updatedAtAbsoluteWeek: 1499, studioAiExecution: { schemaVersion: 1, source: 'STUDIO_INDEPENDENT', slateCommitmentId: 'slate', fingerprintId: 'fp', controllerAtLastProgression: 'AI', selectedReleaseMode: null, publicReleaseStrategy: null, talentSelected: true, talent: { leadActorId: 'a', leadActorName: 'Actor', directorId: 'd', directorName: 'Director', packageScore: 75, estimatedCostMillions: 7 }, finalQuality: { creativeQuality: 80, executionQuality: 78, commercialPotential: 85, prestigePotential: 82, downsideRisk: 25 }, result: null, problems: [], paidMilestoneIds: ['PRE_PRODUCTION_START', 'PRODUCTION_START', 'POST_PRODUCTION_START', 'DELIVERY'], processedKeys: [], lastProgressedAbsoluteWeek: 1499 } } as IndustryProductionCommitment;
const baseFingerprint = { id: 'fp', seed: 'fp', ownerCompanyId: studio.id, ownerCompanyKind: 'PRODUCTION_STUDIO', format: 'MOVIE', primaryGenre: 'DRAMA', subgenre: 'Drama', tone: 'Warm', theme: 'Legacy', setting: 'Delhi', period: 'Now', targetAudience: 'MASS', originalLanguage: 'Hindi', priorityMarket: 'INDIA', commercialIntent: 80, prestigeIntent: 80, creativeRisk: 30, starPowerTarget: 70, releasePath: 'THEATRICAL_FIRST', sourceIntent: 'ORIGINAL', relationship: 'STANDALONE', budgetSuitability: { minimumMillions: 20, idealLowMillions: 40, idealHighMillions: 60, ambitiousMaximumMillions: 80 }, noveltySignature: 'release', noveltyScore: 80, createdAtAbsoluteWeek: 1480, decisionCycle: 1, lifecycle: 'COMMITTED' } as IndustryContentFingerprint;
const world = { projects: [], studios: { [studio.id]: studio }, streamingRightsContracts: {} } as unknown as WorldState;

const theatrical = planStudioAiProductionRelease({ world, studio, production, fingerprint: baseFingerprint, absoluteWeek: 1500 });
assert.equal(theatrical.changed, true);
assert.equal(theatrical.mode, 'PRESTIGE_THEATRICAL');
assert.equal(theatrical.production.studioAiExecution?.publicReleaseStrategy, 'THEATRICAL');
const streaming = planStudioAiProductionRelease({ world, studio, production, fingerprint: { ...baseFingerprint, releasePath: 'STREAMING_FIRST' }, absoluteWeek: 1500 });
assert.equal(streaming.mode, 'HOLD');
assert.equal(streaming.blockedReason, 'MISSING_STREAMING_RIGHTS');
assert.deepEqual(planStudioAiProductionRelease({ world, studio, production: theatrical.production, fingerprint: baseFingerprint, absoluteWeek: 1501 }).production, theatrical.production);

console.log('Studio AI B6 release planning audit passed.');
