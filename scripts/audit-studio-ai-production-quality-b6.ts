// @ts-nocheck - executable audit fixture.
import assert from 'node:assert/strict';
import type { IndustryContentFingerprint, IndustryProductionCommitment, NPCStudioState } from '../types';
import { normalizeStudioAiState } from '../services/studioAi';
import { finalizeStudioAiProductionQuality } from '../services/studioAi/studioAiProductionQuality';

const studio = { id: 'quality', name: 'Quality', valuation: 20, reputation: 80, cashReserve: 300, recentHits: 2, archetype: 'PRESTIGE' } as NPCStudioState;
studio.ai = normalizeStudioAiState(studio, { absoluteWeek: 1400 });
const production = { id: 'quality_prod', canonicalProjectId: 'quality_project', title: 'Quality', projectType: 'MOVIE', genre: 'DRAMA', producerStudioId: studio.id, source: 'STUDIO_INDEPENDENT', status: 'DELIVERED', productionCalendar: { preProductionWeeks: 4, productionWeeks: 8, postProductionWeeks: 4, totalWeeks: 16, weeksCompleted: 16, startedAge: 26, startedWeek: 49, startedAbsoluteWeek: 1400 }, budgetMillions: 60, paidMillions: 60, talentBookingIds: [], writerSource: 'IN_HOUSE_TEAM', writerId: null, writerName: 'Writers', writerSkill: 80, createdAtAbsoluteWeek: 1400, updatedAtAbsoluteWeek: 1416, studioAiExecution: { schemaVersion: 1, source: 'STUDIO_INDEPENDENT', slateCommitmentId: 'slate', fingerprintId: 'fp', controllerAtLastProgression: 'AI', selectedReleaseMode: null, publicReleaseStrategy: null, talentSelected: true, talent: { leadActorId: 'a', leadActorName: 'Actor', directorId: 'd', directorName: 'Director', packageScore: 82, estimatedCostMillions: 8 }, finalQuality: null, result: null, problems: [], paidMilestoneIds: ['PRE_PRODUCTION_START', 'PRODUCTION_START', 'POST_PRODUCTION_START', 'DELIVERY'], processedKeys: [], lastProgressedAbsoluteWeek: 1416 } } as IndustryProductionCommitment;
const fingerprint = { id: 'fp', seed: 'fp_seed', ownerCompanyId: studio.id, ownerCompanyKind: 'PRODUCTION_STUDIO', format: 'MOVIE', primaryGenre: 'DRAMA', subgenre: 'Family', tone: 'Warm', theme: 'Legacy', setting: 'Delhi', period: 'Contemporary', targetAudience: 'MASS', originalLanguage: 'Hindi', priorityMarket: 'INDIA', commercialIntent: 75, prestigeIntent: 85, creativeRisk: 45, starPowerTarget: 70, releasePath: 'THEATRICAL_FIRST', sourceIntent: 'ORIGINAL', relationship: 'STANDALONE', budgetSuitability: { minimumMillions: 30, idealLowMillions: 50, idealHighMillions: 75, ambitiousMaximumMillions: 100 }, noveltySignature: 'family:legacy', noveltyScore: 80, createdAtAbsoluteWeek: 1390, decisionCycle: 1, lifecycle: 'COMMITTED' } as IndustryContentFingerprint;

const first = finalizeStudioAiProductionQuality({ studio, production, fingerprint, absoluteWeek: 1416 });
const replay = finalizeStudioAiProductionQuality({ studio, production, fingerprint, absoluteWeek: 1416 });
assert.deepEqual(first.production.studioAiExecution?.finalQuality, replay.production.studioAiExecution?.finalQuality);
assert.ok((first.production.studioAiExecution?.finalQuality?.creativeQuality || 0) > 0);
assert.equal(finalizeStudioAiProductionQuality({ studio, production: first.production, fingerprint, absoluteWeek: 1417 }).changed, false);

console.log('Studio AI B6 production quality audit passed.');
