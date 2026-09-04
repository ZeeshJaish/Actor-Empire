// @ts-nocheck - executable audit fixture.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER } from '../types';
import type { IndustryContentFingerprint, IndustryProductionCommitment, NPCStudioState, StudioAiSlateCommitment, WorldState } from '../types';
import { normalizeStudioAiState } from '../services/studioAi';
import { executeStudioAiProductionWeek } from '../services/studioAi/studioAiProductionExecution';

const START = 1700;
const studio = { id: 'B6_LIVE', name: 'B6 Live', valuation: 20, reputation: 78, cashReserve: 500, recentHits: 2, archetype: 'COMMERCIAL' } as NPCStudioState;
studio.ai = normalizeStudioAiState(studio, { absoluteWeek: START });
studio.ai.finance.committedSpendMillions = 20;
const fingerprint = { id: 'live_fp', seed: 'live', ownerCompanyId: studio.id, ownerCompanyKind: 'PRODUCTION_STUDIO', format: 'MOVIE', primaryGenre: 'COMEDY', subgenre: 'Workplace', tone: 'Warm', theme: 'Ambition', setting: 'Mumbai', period: 'Now', targetAudience: 'MASS', originalLanguage: 'Hindi', priorityMarket: 'INDIA', commercialIntent: 85, prestigeIntent: 55, creativeRisk: 25, starPowerTarget: 70, releasePath: 'THEATRICAL_FIRST', sourceIntent: 'ORIGINAL', relationship: 'STANDALONE', budgetSuitability: { minimumMillions: 10, idealLowMillions: 15, idealHighMillions: 25, ambitiousMaximumMillions: 40 }, noveltySignature: 'live', noveltyScore: 78, createdAtAbsoluteWeek: START - 5, decisionCycle: 1, lifecycle: 'COMMITTED' } as IndustryContentFingerprint;
const slate = { id: 'live_slate', proposalId: 'p', proposalKey: 'pk', fingerprintId: fingerprint.id, source: 'INDEPENDENT', status: 'HANDED_OFF', industryProductionId: 'live_prod', createdAtAbsoluteWeek: START - 5, updatedAtAbsoluteWeek: START, nextReviewAbsoluteWeek: null, developmentSpendMillions: 1, rewriteCount: 0, proposedBudgetMillions: 20, greenlightBudgetMillions: 20, greenlitAtAbsoluteWeek: START, scores: { creative: 78, commercial: 84, prestige: 55, execution: 80, financialRisk: 30, greenlightConfidence: 82 } } as StudioAiSlateCommitment;
studio.ai.slate!.commitments = [slate];
studio.ai.intelligence!.content.selectedFingerprints = [fingerprint];
const production = { id: 'live_prod', canonicalProjectId: 'live_project', title: 'Friday Deadline', projectType: 'MOVIE', genre: 'COMEDY', producerStudioId: studio.id, source: 'STUDIO_INDEPENDENT', status: 'PLANNED', productionCalendar: { preProductionWeeks: 1, productionWeeks: 1, postProductionWeeks: 1, totalWeeks: 3, focusWindowWeeks: 2, elapsedWeeks: 0, startedAbsoluteWeek: START }, budgetMillions: 20, paidMillions: 0, talentBookingIds: [], writerSource: 'IN_HOUSE_TEAM', writerId: null, writerName: 'Writers', writerSkill: 78, studioAiSlateCommitmentId: slate.id, industryContentFingerprintId: fingerprint.id, createdAtAbsoluteWeek: START, updatedAtAbsoluteWeek: START, studioAiExecution: { schemaVersion: 1, source: 'STUDIO_INDEPENDENT', slateCommitmentId: slate.id, fingerprintId: fingerprint.id, controllerAtLastProgression: 'AI', selectedReleaseMode: null, publicReleaseStrategy: null, talentSelected: false, talent: null, finalQuality: null, result: null, problems: [], paidMilestoneIds: [], processedKeys: [], nextReviewAbsoluteWeek: START + 1, lastProgressedAbsoluteWeek: START } } as IndustryProductionCommitment;
let world = { ...INITIAL_PLAYER.world, projects: [], studios: { [studio.id]: studio }, industryProductions: { [production.id]: production }, talentBookings: [] } as WorldState;
let player = { ...structuredClone(INITIAL_PLAYER), id: 'b6_live_player', world };
for (let week = START + 1; week <= START + 12; week += 1) {
    const result = executeStudioAiProductionWeek({ player: { ...player, world }, world, absoluteWeek: week });
    world = result.world;
    player = { ...player, world };
}
assert.equal(world.industryProductions![production.id].status, 'RELEASED');
assert.equal(world.projects.filter(project => project.id === production.canonicalProjectId).length, 1);
assert.equal(world.industryProductions![production.id].paidMillions, 20);
assert.equal(world.talentBookings?.filter(row => row.projectId === production.canonicalProjectId && row.status === 'RELEASED').length, 2);
assert.equal(world.studios![studio.id].ai!.intelligence!.content.selectedFingerprints[0].lifecycle, 'MATERIALIZED');
assert.equal(world.studios![studio.id].ai!.intelligence!.content.selectedFingerprints[0].canonicalProjectId, production.canonicalProjectId);
const repeat = executeStudioAiProductionWeek({ player, world, absoluteWeek: START + 12 });
assert.deepEqual(repeat.world, world, 'same-week replay must be a no-op');

const commission = { ...production, id: 'commission', source: 'PLATFORM_COMMISSION', studioAiExecution: undefined, aiExecution: { lastProcessedAbsoluteWeek: START } } as unknown as IndustryProductionCommitment;
const commissionWorld = { ...world, industryProductions: { commission } };
assert.deepEqual(executeStudioAiProductionWeek({ player: { ...player, world: commissionWorld }, world: commissionWorld, absoluteWeek: START + 13 }).world.industryProductions!.commission, commission);
const playerStudio = structuredClone(studio);
playerStudio.ai!.controller = 'PLAYER';
const frozenWorld = { ...world, studios: { [studio.id]: playerStudio }, industryProductions: { [production.id]: { ...production, status: 'PRE_PRODUCTION' } } };
assert.deepEqual(executeStudioAiProductionWeek({ player: { ...player, world: frozenWorld }, world: frozenWorld, absoluteWeek: START + 13 }).world.industryProductions, frozenWorld.industryProductions);

const evictedStudio = structuredClone(studio);
evictedStudio.ai!.intelligence!.content.selectedFingerprints = [];
const evictedFingerprintProduction = structuredClone(production);
evictedFingerprintProduction.id = 'evicted_fingerprint_prod';
evictedFingerprintProduction.canonicalProjectId = 'evicted_fingerprint_project';
evictedFingerprintProduction.status = 'PLANNED';
evictedFingerprintProduction.productionCalendar.elapsedWeeks = 0;
evictedFingerprintProduction.studioAiExecution!.lastProgressedAbsoluteWeek = START;
evictedFingerprintProduction.studioAiExecution!.talentSelected = false;
evictedFingerprintProduction.studioAiExecution!.talent = null;
evictedFingerprintProduction.studioAiExecution!.fingerprintSnapshot = fingerprint;
const evictedWorld = {
    ...world,
    projects: [],
    studios: { [studio.id]: evictedStudio },
    industryProductions: { [evictedFingerprintProduction.id]: evictedFingerprintProduction },
    talentBookings: [],
};
const evictedProgress = executeStudioAiProductionWeek({
    player: { ...player, world: evictedWorld },
    world: evictedWorld,
    absoluteWeek: START + 1,
});
assert.equal(
    evictedProgress.world.industryProductions![evictedFingerprintProduction.id].studioAiExecution!.lastProgressedAbsoluteWeek,
    START + 1,
    'A handed-off production must keep progressing after its planning fingerprint leaves bounded intelligence history.',
);

const streamingStudio = structuredClone(studio);
const streamingFingerprint = { ...fingerprint, id: 'streaming_fp', releasePath: 'STREAMING_FIRST' as const };
streamingStudio.ai!.intelligence!.content.selectedFingerprints = [streamingFingerprint];
const streamingProduction = structuredClone(production);
streamingProduction.id = 'streaming_first_prod';
streamingProduction.canonicalProjectId = 'streaming_first_project';
streamingProduction.status = 'PLANNED';
streamingProduction.paidMillions = 0;
streamingProduction.productionCalendar.elapsedWeeks = 0;
streamingProduction.studioAiExecution!.fingerprintId = streamingFingerprint.id;
streamingProduction.studioAiExecution!.fingerprintSnapshot = streamingFingerprint;
streamingProduction.studioAiExecution!.lastProgressedAbsoluteWeek = START;
streamingProduction.studioAiExecution!.talentSelected = false;
streamingProduction.studioAiExecution!.talent = null;
streamingProduction.studioAiExecution!.finalQuality = null;
streamingProduction.studioAiExecution!.result = null;
streamingProduction.studioAiExecution!.selectedReleaseMode = null;
streamingProduction.studioAiExecution!.publicReleaseStrategy = null;
streamingProduction.studioAiExecution!.processedKeys = [];
streamingProduction.studioAiExecution!.paidMilestoneIds = [];
let streamingWorld = {
    ...world,
    projects: [],
    studios: { [streamingStudio.id]: streamingStudio },
    industryProductions: { [streamingProduction.id]: streamingProduction },
    streamingRightsContracts: {},
    talentBookings: [],
};
for (let week = START + 1; week <= START + 30; week += 1) {
    streamingWorld = executeStudioAiProductionWeek({ player: { ...player, world: streamingWorld }, world: streamingWorld, absoluteWeek: week }).world;
}
assert.equal(
    streamingWorld.industryProductions![streamingProduction.id].status,
    'RELEASED',
    'A streaming-first independent production must eventually use a theatrical market fallback when no platform buys its rights.',
);
assert.equal(streamingWorld.industryProductions![streamingProduction.id].studioAiExecution!.selectedReleaseMode, 'LIMITED_THEATRICAL');

const brokeStudio = structuredClone(studio);
brokeStudio.id = 'B6_BROKE';
brokeStudio.name = 'B6 Broke';
brokeStudio.cashReserve = 0;
brokeStudio.ai!.studioId = brokeStudio.id;
brokeStudio.ai!.finance.committedSpendMillions = 100;
brokeStudio.ai!.intelligence!.content.selectedFingerprints = [{ ...fingerprint, ownerCompanyId: brokeStudio.id }];
const doomed = structuredClone(production);
doomed.id = 'doomed_prod';
doomed.canonicalProjectId = 'doomed_project';
doomed.producerStudioId = brokeStudio.id;
doomed.budgetMillions = 100;
doomed.paidMillions = 0;
doomed.status = 'PLANNED';
doomed.productionCalendar.elapsedWeeks = 0;
doomed.studioAiExecution!.lastProgressedAbsoluteWeek = START;
doomed.studioAiExecution!.talentSelected = false;
doomed.studioAiExecution!.talent = null;
doomed.studioAiExecution!.processedKeys = [];
doomed.studioAiExecution!.problems = [];
let doomedWorld = { ...world, projects: [], studios: { [brokeStudio.id]: brokeStudio }, industryProductions: { [doomed.id]: doomed }, talentBookings: [] };
for (let week = START + 1; week <= START + 40; week += 1) {
    doomedWorld = executeStudioAiProductionWeek({ player: { ...player, world: doomedWorld }, world: doomedWorld, absoluteWeek: week }).world;
}
assert.equal(doomedWorld.industryProductions![doomed.id].status, 'CANCELLED', 'an unfunded production with no valid buyer must eventually fail');

console.log('Studio AI B6 live production audit passed.');
