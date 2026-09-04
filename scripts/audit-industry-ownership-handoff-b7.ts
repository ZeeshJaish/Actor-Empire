// @ts-nocheck - executable acquisition boundary fixture.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { createDefaultStudioState } from '../services/businessLogic';
import { dematerializeStudioOwnership, materializeStudioOwnership } from '../services/industryWorld';
import { processStudioAiWeek } from '../services/studioAi';

const player = structuredClone(INITIAL_PLAYER) as Player;
player.age = 42;
player.currentWeek = 17;
const studioId = 'PARAMOUNT';
const business = {
    id: studioId,
    name: 'Paramount',
    type: 'PRODUCTION_HOUSE',
    subtype: 'MAJOR_STUDIO',
    logo: '🎬',
    color: 'bg-amber-500',
    foundedWeek: 1,
    balance: 1,
    isActive: true,
    config: { quality: 'PREMIUM', pricing: 'MARKET', marketing: 'MEDIUM', marketingBudget: {}, theme: 'LEGACY' },
    stats: { weeklyRevenue: 0, weeklyExpenses: 0, weeklyProfit: 0, lifetimeRevenue: 0, valuation: 1, brandHealth: 70, customerSatisfaction: 70, riskLevel: 20, hype: 50, locations: 1 },
    staff: [], products: [], hiringPool: [], lastHiringRefreshWeek: 1, history: [],
    studioState: createDefaultStudioState(player.currentWeek),
};
player.businesses = [business];
player.commitments = [];
player.world.studios = {
    [studioId]: {
        id: studioId,
        name: 'Paramount',
        valuation: 3.4,
        reputation: 82,
        cashReserve: 125,
        recentHits: 2,
        archetype: 'LEGACY',
        ai: {
            schemaVersion: 1,
            studioId,
            origin: 'ESTABLISHED',
            controller: 'AI',
            status: 'DISTRESSED',
            seed: 'paramount-seed',
            profile: { strategy: 'COMMERCIAL', launchClass: 'ESTABLISHED_MAJOR', riskTolerance: 55, budgetAppetite: 75, creativePatience: 62, franchiseDependence: 44, prestigeAmbition: 70, financialDiscipline: 65 },
            competence: { development: 80, creative: 78, finance: 70, production: 84, marketing: 82, distribution: 86, negotiation: 79, talentRelations: 75 },
            finance: { debtPrincipalMillions: 310, weeklyOperatingCostMillions: 8, committedSpendMillions: 50, runwayWeeks: 14, consecutiveLossWeeks: 5, restructuringStartedAtAbsoluteWeek: null },
            capacity: { developmentSlots: 5, productionSlots: 3, releaseSlotsPerQuarter: 2, committedDevelopmentSlots: 1, committedProductionSlots: 1 },
            ledger: [{ id: 'ledger_saved', absoluteWeek: 2_180, category: 'PRODUCTION', amountMillions: -12, balanceAfterMillions: 125, description: 'Saved milestone' }],
            decisions: [], events: [], migrationKeys: [], handoffKeys: [], lastProcessedAbsoluteWeek: 2_180,
            slate: { schemaVersion: 1, activatedAtAbsoluteWeek: 2_100, legacyProjectOriginRetiredAtAbsoluteWeek: 2_100, commitments: [], processedProposalKeys: [], processedReviewKeys: [] },
        },
    },
};
const productionId = 'industry_production_glass_harbour';
player.world.industryProductions = {
    [productionId]: {
        id: productionId,
        canonicalProjectId: 'project_glass_harbour',
        title: 'Glass Harbour',
        projectType: 'MOVIE',
        genre: 'DRAMA',
        producerStudioId: studioId,
        source: 'STUDIO_INDEPENDENT',
        status: 'PRODUCTION',
        productionCalendar: { preProductionWeeks: 4, productionWeeks: 10, postProductionWeeks: 6, totalWeeks: 20, focusWindowWeeks: 15, elapsedWeeks: 11, startedAbsoluteWeek: 2_170 },
        budgetMillions: 80,
        paidMillions: 30,
        talentBookingIds: ['booking_lead', 'booking_director'],
        writerSource: 'IN_HOUSE_TEAM', writerId: null, writerName: 'Paramount Story Department', writerSkill: 79,
        studioAiSlateCommitmentId: 'slate_glass', industryContentFingerprintId: 'fingerprint_glass',
        studioAiExecution: {
            schemaVersion: 1, source: 'STUDIO_INDEPENDENT', slateCommitmentId: 'slate_glass', fingerprintId: 'fingerprint_glass',
            controllerAtLastProgression: 'AI', selectedReleaseMode: null, publicReleaseStrategy: null,
            talentSelected: true,
            talent: { leadActorId: 'actor_1', leadActorName: 'Aisha Stone', directorId: 'director_1', directorName: 'Mira Cole', packageScore: 84, estimatedCostMillions: 14 },
            finalQuality: null, result: null,
            problems: [{ id: 'problem_delay', checkpoint: 'PRODUCTION_35', type: 'DELAY', severity: 58, occurredAtAbsoluteWeek: 2_178, delayWeeks: 2, overrunMillions: 0, qualityImpact: -2, response: 'SCHEDULE_EXTENSION', responseAppliedAtAbsoluteWeek: 2_178 }],
            processedKeys: ['b6-progress:2180'], lastProgressedAbsoluteWeek: 2_180,
        },
        universeId: undefined, createdAtAbsoluteWeek: 2_160, updatedAtAbsoluteWeek: 2_180,
    },
};

const first = materializeStudioOwnership(player, studioId, 2_181);
assert.equal(first.changed, true);
assert.equal(first.business.balance, 125_000_000, 'canonical private cash replaces public acquisition estimate');
assert.equal(first.business.stats.valuation, 3_400_000_000);
assert.equal(first.business.studioState.industryHandoffSnapshot.ai.finance.debtPrincipalMillions, 310);
assert.equal(first.inheritedCommitments.length, 1);
const inherited = first.inheritedCommitments[0];
assert.equal(inherited.id, 'player_handoff_project_glass_harbour');
assert.equal(inherited.projectPhase, 'PRODUCTION');
assert.equal(inherited.productionCalendar.elapsedWeeks, 11);
assert.equal(inherited.phaseWeeksLeft, 3);
assert.equal(inherited.upfrontCost, 80_000_000);
assert.equal(inherited.projectDetails.estimatedBudget, 80_000_000);
assert.equal(inherited.projectDetails.industryProductionId, productionId);
assert.equal(inherited.projectDetails.inheritedPaidMillions, 30);
assert.deepEqual(inherited.projectDetails.inheritedProblemIds, ['problem_delay']);
assert.equal(first.world.studios[studioId].ai.controller, 'PLAYER');
assert.equal(first.world.industryProductions[productionId].playerHandoff.playerCommitmentId, inherited.id);

const replay = materializeStudioOwnership(first.player, studioId, 2_181);
assert.equal(replay.changed, false);
assert.deepEqual(replay.player, first.player, 'same acquisition boundary must be idempotent');

const afterAiAttempt = processStudioAiWeek(first.player, first.world, 2_182);
assert.equal(afterAiAttempt.world.industryProductions[productionId].productionCalendar.elapsedWeeks, 11,
    'player-controlled production must not receive another rival-AI week');

const progressedPlayer = structuredClone(first.player);
progressedPlayer.commitments = progressedPlayer.commitments.map(commitment => commitment.id === inherited.id
    ? {
        ...commitment,
        phaseWeeksLeft: 1,
        productionCalendar: { ...commitment.productionCalendar, elapsedWeeks: 13 },
    }
    : commitment);
const sold = dematerializeStudioOwnership(progressedPlayer, studioId, 2_183);
assert.equal(sold.changed, true);
assert.equal(sold.player.commitments.some(commitment => commitment.id === inherited.id), false);
assert.equal(sold.world.industryProductions[productionId].productionCalendar.elapsedWeeks, 13);
assert.equal(sold.world.industryProductions[productionId].studioAiExecution.controllerAtLastProgression, 'AI');
assert.equal(sold.world.industryProductions[productionId].studioAiExecution.lastProgressedAbsoluteWeek, 2_183);
assert.equal(sold.world.industryProductions[productionId].playerHandoff.dematerializedAtAbsoluteWeek, 2_183);
assert.equal(sold.world.studios[studioId].ai.controller, 'AI');
const soldReplay = dematerializeStudioOwnership(sold.player, studioId, 2_183);
assert.equal(soldReplay.changed, false);
assert.deepEqual(soldReplay.player, sold.player);

console.log('Industry world B7 ownership handoff audit passed.');
