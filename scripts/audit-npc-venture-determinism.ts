import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type NpcVentureState, type Player } from '../types';
import { processNpcVentures } from '../services/npcVentureLogic';
import { normalizeStudioAiState } from '../services/studioAi';

const clone = <T>(value: T): T => structuredClone(value);
const fixture = clone(INITIAL_PLAYER) as Player;
const absoluteWeek = fixture.age * 52 + fixture.currentWeek;
const venture: NpcVentureState = {
    id: 'npc_venture_determinism_fixture', name: 'Determinism Pictures',
    ownerNpcId: 'determinism_founder', ownerName: 'Determinism Founder',
    archetype: 'COMMERCIAL_STUDIO', status: 'ACTIVE', valuation: 0.4, cashReserve: 180,
    hype: 70, reputation: 72, creativeQuality: 76, risk: 45,
    foundedWeek: Math.max(1, fixture.currentWeek - 20), foundedYear: fixture.age,
    lastProjectWeek: 0, nextProjectWeek: fixture.currentWeek,
    projectsReleased: 0, hits: 0, flops: 0, history: [],
};
fixture.world.npcVentures = { [venture.id]: venture };
const canonicalStudio = {
    id: venture.id,
    name: venture.name,
    valuation: venture.valuation,
    reputation: venture.reputation,
    cashReserve: venture.cashReserve,
    recentHits: 0,
    archetype: venture.archetype,
    isNpcVenture: true,
};
const canonicalAi = normalizeStudioAiState(canonicalStudio, { absoluteWeek });
canonicalAi.finance.committedSpendMillions = 48;
canonicalAi.slate!.commitments = [{
    id: 'determinism_greenlight',
    proposalId: 'determinism_proposal',
    proposalKey: 'determinism_proposal_key',
    fingerprintId: 'determinism_fingerprint',
    source: 'INDEPENDENT',
    status: 'GREENLIT',
    createdAtAbsoluteWeek: absoluteWeek - 6,
    updatedAtAbsoluteWeek: absoluteWeek - 2,
    nextReviewAbsoluteWeek: null,
    developmentSpendMillions: 2,
    rewriteCount: 0,
    proposedBudgetMillions: 45,
    greenlightBudgetMillions: 48,
    greenlitAtAbsoluteWeek: absoluteWeek - 2,
}];
fixture.world.studios = { ...fixture.world.studios, [venture.id]: { ...canonicalStudio, ai: canonicalAi } };
fixture.world.npcVentureLastProcessedAbsoluteWeek = absoluteWeek - 1;

const first = processNpcVentures(clone(fixture), clone(fixture.world));
const second = processNpcVentures(clone(fixture), clone(fixture.world));
assert.deepEqual(first, second, 'The same NPC venture save/week must produce byte-equivalent projects, outcomes, news and logs.');
assert.equal(first.world.npcVentures?.[venture.id].projectsReleased, 0);
assert.equal(first.world.projects.length, 0, 'The legacy venture projection must not fabricate an instant release.');
assert.equal(first.world.studios?.[venture.id].ai?.slate?.commitments[0].status, 'GREENLIT', 'B6 weekly production owns the handoff.');

const replayPlayer = clone(fixture);
replayPlayer.world = clone(first.world);
const replay = processNpcVentures(replayPlayer, replayPlayer.world);
assert.equal(replay.world.npcVentures?.[venture.id].projectsReleased, 0, 'The same absolute week must remain release-free in the legacy projection.');
assert.deepEqual(replay.news, []);
assert.deepEqual(replay.logs, []);

console.log('NPC venture determinism audit passed.');
