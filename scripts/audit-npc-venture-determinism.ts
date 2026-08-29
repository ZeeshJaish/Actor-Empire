import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type NpcVentureState, type Player } from '../types';
import { processNpcVentures } from '../services/npcVentureLogic';

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
fixture.world.npcVentureLastProcessedAbsoluteWeek = absoluteWeek - 1;

const first = processNpcVentures(clone(fixture), clone(fixture.world));
const second = processNpcVentures(clone(fixture), clone(fixture.world));
assert.deepEqual(first, second, 'The same NPC venture save/week must produce byte-equivalent projects, outcomes, news and logs.');
assert.equal(first.world.npcVentures?.[venture.id].projectsReleased, 1);

const replayPlayer = clone(fixture);
replayPlayer.world = clone(first.world);
const replay = processNpcVentures(replayPlayer, replayPlayer.world);
assert.equal(replay.world.npcVentures?.[venture.id].projectsReleased, 1, 'The same absolute week must not create a second venture project.');
assert.deepEqual(replay.news, []);
assert.deepEqual(replay.logs, []);

console.log('NPC venture determinism audit passed.');
