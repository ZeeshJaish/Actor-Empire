// @ts-nocheck - executable audit fixture.
import assert from 'node:assert/strict';
import { normalizeStudioAiState } from '../services/studioAi';
import { handoffStudioAiGreenlights } from '../services/studioAi/studioAiProductionHandoff';
import { processStudioAiWeek } from '../services/studioAi/studioAiWeek';
import type { IndustryContentFingerprint, NPCStudioState, Player, StudioAiSlateCommitment, WorldState } from '../types';

const WEEK = 700;
const studio: NPCStudioState = {
    id: 'B6_HANDOFF_STUDIO', name: 'B6 Handoff Studio', valuation: 12, reputation: 76,
    cashReserve: 550, recentHits: 2, archetype: 'COMMERCIAL',
};
studio.ai = normalizeStudioAiState(studio, { absoluteWeek: WEEK });
const fingerprint: IndustryContentFingerprint = {
    id: 'b6_handoff_fingerprint', seed: 'b6_handoff_seed', ownerCompanyId: studio.id, ownerCompanyKind: 'PRODUCTION_STUDIO',
    format: 'MOVIE', primaryGenre: 'THRILLER', subgenre: 'Conspiracy thriller', tone: 'Tense', theme: 'Trust', setting: 'Mumbai', period: 'Contemporary',
    targetAudience: 'MASS', originalLanguage: 'Hindi', priorityMarket: 'INDIA', commercialIntent: 82, prestigeIntent: 55, creativeRisk: 48, starPowerTarget: 72,
    releasePath: 'THEATRICAL_FIRST', sourceIntent: 'ORIGINAL', relationship: 'STANDALONE',
    budgetSuitability: { minimumMillions: 20, idealLowMillions: 40, idealHighMillions: 60, ambitiousMaximumMillions: 90 },
    noveltySignature: 'conspiracy:thriller:mumbai', noveltyScore: 84, createdAtAbsoluteWeek: WEEK - 10, decisionCycle: 2, lifecycle: 'COMMITTED',
};
const greenlight: StudioAiSlateCommitment = {
    id: 'b6_greenlight', proposalId: 'b6_proposal', proposalKey: 'b6_proposal_key', fingerprintId: fingerprint.id,
    source: 'INDEPENDENT', status: 'GREENLIT', createdAtAbsoluteWeek: WEEK - 10, updatedAtAbsoluteWeek: WEEK - 2,
    nextReviewAbsoluteWeek: null, developmentSpendMillions: 2.5, rewriteCount: 0, proposedBudgetMillions: 55,
    greenlightBudgetMillions: 58, greenlitAtAbsoluteWeek: WEEK - 2,
};
studio.ai.slate!.commitments = [greenlight];
studio.ai.intelligence!.content.selectedFingerprints = [fingerprint];
studio.ai.finance.committedSpendMillions = 58;
const world = { projects: [], studios: { [studio.id]: studio }, industryProductions: {} } as unknown as WorldState;
const player = { id: 'b6_handoff_player', age: 30, currentWeek: 25, businesses: [], stockTakeovers: [], flags: {}, world } as unknown as Player;

const first = handoffStudioAiGreenlights({ player, world, studio, absoluteWeek: WEEK });
assert.equal(first.createdCount, 1);
assert.equal(Object.keys(first.world.industryProductions || {}).length, 1);
assert.equal(first.world.projects.length, 0, 'handoff must not create a public release');
const handedOff = first.studio.ai!.slate!.commitments[0];
assert.equal(handedOff.status, 'HANDED_OFF');
assert.ok(handedOff.industryProductionId);
const production = first.world.industryProductions![handedOff.industryProductionId!];
assert.equal(production.source, 'STUDIO_INDEPENDENT');
assert.equal(production.studioAiSlateCommitmentId, greenlight.id);
assert.equal(production.industryContentFingerprintId, fingerprint.id);
assert.equal(production.budgetMillions, 58);
assert.equal(production.paidMillions, 0);
assert.equal(production.status, 'PLANNED');
assert.equal(production.studioAiExecution?.slateCommitmentId, greenlight.id);
assert.equal(first.studio.ai!.finance.committedSpendMillions, 58, 'handoff transfers rather than releases the budget reservation');

const repeat = handoffStudioAiGreenlights({ player, world: first.world, studio: first.studio, absoluteWeek: WEEK });
assert.equal(repeat.createdCount, 0);
assert.deepEqual(repeat.world.industryProductions, first.world.industryProductions);
assert.equal(repeat.studio.ai!.slate!.commitments[0].industryProductionId, production.id);

const playerControlled = structuredClone(studio);
playerControlled.ai!.controller = 'PLAYER';
const skipped = handoffStudioAiGreenlights({ player, world, studio: playerControlled, absoluteWeek: WEEK });
assert.equal(skipped.createdCount, 0);
assert.equal(Object.keys(skipped.world.industryProductions || {}).length, 0);

const missingFingerprint = structuredClone(studio);
missingFingerprint.ai!.intelligence!.content.selectedFingerprints = [];
const failed = handoffStudioAiGreenlights({ player, world, studio: missingFingerprint, absoluteWeek: WEEK });
assert.equal(failed.createdCount, 0);
assert.equal(failed.studio.ai!.slate!.commitments[0].status, 'GREENLIT', 'failed handoff remains retryable');

const liveStudio = structuredClone(studio);
liveStudio.ai!.intelligence!.nextDueAbsoluteWeek = WEEK + 20;
const liveWorld = { projects: [], studios: { [liveStudio.id]: liveStudio }, industryProductions: {} } as unknown as WorldState;
const livePlayer = { ...player, world: liveWorld } as Player;
const live = processStudioAiWeek(livePlayer, liveWorld, WEEK);
assert.equal(Object.keys(live.world.industryProductions || {}).length, 1, 'weekly coordinator must invoke canonical handoff');
assert.equal(live.world.studios![liveStudio.id].ai!.slate!.commitments[0].status, 'HANDED_OFF');

console.log('Studio AI B6 production handoff audit passed.');
