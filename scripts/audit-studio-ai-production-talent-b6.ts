// @ts-nocheck - executable audit fixture.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER } from '../types';
import type { IndustryProductionCommitment, NPCStudioState, WorldState } from '../types';
import { normalizeStudioAiState } from '../services/studioAi';
import { packageStudioAiProductionTalent } from '../services/studioAi/studioAiProductionTalent';

const WEEK = 900;
const studio: NPCStudioState = {
    id: 'B6_TALENT_STUDIO', name: 'B6 Talent Studio', valuation: 20, reputation: 78,
    cashReserve: 600, recentHits: 2, archetype: 'PRESTIGE',
};
studio.ai = normalizeStudioAiState(studio, { absoluteWeek: WEEK });
const production: IndustryProductionCommitment = {
    id: 'b6_talent_production', canonicalProjectId: 'b6_talent_project', title: 'A Silent Empire',
    projectType: 'MOVIE', genre: 'DRAMA', producerStudioId: studio.id, source: 'STUDIO_INDEPENDENT', status: 'PLANNED',
    productionCalendar: { preProductionWeeks: 4, productionWeeks: 9, postProductionWeeks: 5, totalWeeks: 18, weeksCompleted: 0, startedAge: 18, startedWeek: 17, startedAbsoluteWeek: WEEK },
    budgetMillions: 55, paidMillions: 0, talentBookingIds: [], writerSource: 'IN_HOUSE_TEAM', writerId: null,
    writerName: `${studio.name} Story Department`, writerSkill: 78, studioAiSlateCommitmentId: 'b6_talent_slate',
    industryContentFingerprintId: 'b6_talent_fingerprint', createdAtAbsoluteWeek: WEEK, updatedAtAbsoluteWeek: WEEK,
    studioAiExecution: {
        schemaVersion: 1, source: 'STUDIO_INDEPENDENT', slateCommitmentId: 'b6_talent_slate', fingerprintId: 'b6_talent_fingerprint',
        controllerAtLastProgression: 'AI', selectedReleaseMode: null, publicReleaseStrategy: null, talentSelected: false,
        talent: null, finalQuality: null, result: null, problems: [], paidMilestoneIds: [], processedKeys: [],
        nextReviewAbsoluteWeek: WEEK + 1, lastProgressedAbsoluteWeek: WEEK,
    },
};
const world = { ...INITIAL_PLAYER.world, projects: [], studios: { [studio.id]: studio }, talentBookings: [], industryProductions: { [production.id]: production } } as WorldState;
const player = { ...structuredClone(INITIAL_PLAYER), id: 'b6_talent_player', world };

const first = packageStudioAiProductionTalent({ player, world, studio, production, absoluteWeek: WEEK + 1 });
assert.equal(first.changed, true);
assert.equal(first.production.studioAiExecution?.talentSelected, true);
assert.ok(first.production.studioAiExecution?.talent?.leadActorId);
assert.ok(first.production.studioAiExecution?.talent?.directorId);
assert.equal(first.world.talentBookings?.filter(row => row.projectId === production.canonicalProjectId).length, 2);
assert.equal(first.production.talentBookingIds.length, 2);

const replay = packageStudioAiProductionTalent({ player: { ...player, world: first.world }, world: first.world, studio, production: first.production, absoluteWeek: WEEK + 1 });
assert.equal(replay.changed, false);
assert.deepEqual(replay.production.studioAiExecution?.talent, first.production.studioAiExecution?.talent);
assert.deepEqual(replay.world.talentBookings, first.world.talentBookings);

const playerStudio = structuredClone(studio);
playerStudio.ai!.controller = 'PLAYER';
const skipped = packageStudioAiProductionTalent({ player, world, studio: playerStudio, production, absoluteWeek: WEEK + 1 });
assert.equal(skipped.changed, false);
assert.equal(skipped.production.studioAiExecution?.talentSelected, false);

console.log('Studio AI B6 production talent audit passed.');
