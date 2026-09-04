import assert from 'node:assert/strict';
import { createInitialIndustryIntelligenceState } from '../services/industryIntelligence';
import { normalizeStudioAiState } from '../services/studioAi';
import { executeStudioAiSlateWeek } from '../services/studioAi/studioAiSlateExecution';
import type { IndustryContentFingerprint, IndustryIntelligenceProposal, NPCStudioState, Player, WorldState } from '../types';

const WEEK = 320;
const studio: NPCStudioState = {
    id: 'EXECUTION_STUDIO', name: 'Execution Studio', valuation: 18, reputation: 78,
    cashReserve: 720, recentHits: 2, archetype: 'COMMERCIAL',
};
studio.ai = normalizeStudioAiState(studio, { absoluteWeek: WEEK });
const fingerprint: IndustryContentFingerprint = {
    id: 'execution_fingerprint', seed: 'execution_fingerprint_seed', ownerCompanyId: studio.id, ownerCompanyKind: 'PRODUCTION_STUDIO',
    format: 'MOVIE', primaryGenre: 'THRILLER', subgenre: 'Tech thriller', tone: 'Tense', theme: 'Control', setting: 'Mumbai', period: 'Contemporary',
    targetAudience: 'MASS', originalLanguage: 'Hindi', priorityMarket: 'INDIA', commercialIntent: 82, prestigeIntent: 58, creativeRisk: 52, starPowerTarget: 70,
    releasePath: 'THEATRICAL_FIRST', sourceIntent: 'ORIGINAL', relationship: 'STANDALONE',
    budgetSuitability: { minimumMillions: 18, idealLowMillions: 35, idealHighMillions: 55, ambitiousMaximumMillions: 82 },
    noveltySignature: 'tech:thriller:mumbai', noveltyScore: 86, createdAtAbsoluteWeek: WEEK, decisionCycle: 1, lifecycle: 'SELECTED',
};
const proposal: IndustryIntelligenceProposal = {
    id: 'execution_proposal', idempotencyKey: 'execution_proposal_key', companyId: studio.id, companyKind: 'PRODUCTION_STUDIO',
    lane: 'CONTENT_STRATEGY', decisionCycle: 1, absoluteWeek: WEEK, actionFamily: 'DEVELOP_CONTENT', optionId: 'ORIGINAL',
    urgency: 78, confidence: 74, expectedExposureMillions: 50, affordabilityCeilingMillions: 75,
    score: { total: 80, need: 82, strategyFit: 80, expectedUpside: 76, relationshipValue: 50, competitiveValue: 66, financialRisk: 20, capacityPressure: 10, fatigue: 8, executionRisk: 18 },
    reasonCodes: ['STRATEGIC_NEED'], uncertaintyKey: 'execution_uncertainty', contentFingerprintId: fingerprint.id, status: 'SHADOW', nextReviewAbsoluteWeek: WEEK + 5,
};
studio.ai.intelligence = {
    ...createInitialIndustryIntelligenceState(studio.id, 'PRODUCTION_STUDIO', 'execution_seed', WEEK),
    proposals: [proposal],
    content: { selectedFingerprints: [fingerprint], universeBlueprints: [], recentNoveltySignatures: [fingerprint.noveltySignature], materializationKeys: [] },
};
const world = { projects: [], studios: { [studio.id]: studio }, industryProductions: {} } as unknown as WorldState;
const player = { id: 'execution_player', age: 30, currentWeek: 8, businesses: [], stockTakeovers: [], flags: {}, world } as unknown as Player;

const first = executeStudioAiSlateWeek({ player, world, studio, absoluteWeek: WEEK });
assert.equal(first.admittedCount, 1);
assert.equal(first.studio.ai?.slate?.commitments.length, 1);
assert.ok(first.studio.ai?.slate?.processedProposalKeys.includes(proposal.idempotencyKey));
assert.equal(first.studio.ai?.intelligence?.proposals[0].status, 'EXECUTED');
assert.equal(first.studio.ai?.intelligence?.content.selectedFingerprints[0].lifecycle, 'COMMITTED');
assert.ok(first.studio.cashReserve < studio.cashReserve, 'development must charge exact studio money');
assert.equal(world.projects.length, 0, 'B5 execution must not directly create a public project');

const replay = executeStudioAiSlateWeek({ player: { ...player, world: { ...world, studios: { [studio.id]: first.studio } } }, world, studio: first.studio, absoluteWeek: WEEK });
assert.equal(replay.admittedCount, 0);
assert.deepEqual(replay.studio, first.studio, 'same-week proposal replay must be byte-stable');

const dueStudio = structuredClone(first.studio);
dueStudio.ai!.slate!.commitments[0].nextReviewAbsoluteWeek = WEEK + 1;
const reviewWorld = { ...world, studios: { [studio.id]: dueStudio } };
const reviewed = executeStudioAiSlateWeek({ player: { ...player, world: reviewWorld }, world: reviewWorld, studio: dueStudio, absoluteWeek: WEEK + 1 });
assert.equal(reviewed.reviewedCount, 1);
assert.ok(reviewed.studio.ai?.slate?.processedReviewKeys.length);
assert.notEqual(reviewed.studio.ai?.slate?.commitments[0].status, 'DEVELOPING');

const playerOwned = structuredClone(studio);
playerOwned.ai!.controller = 'PLAYER';
const skipped = executeStudioAiSlateWeek({ player, world, studio: playerOwned, absoluteWeek: WEEK });
assert.deepEqual(skipped.studio, playerOwned);

console.log('Studio AI B5 slate execution audit passed.');
