// @ts-nocheck - executable C7 publicist capacity and priority fixture.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER } from '../types';
import { applyPublicistMediaBatch, getPublicistWeekSummary, normalizeIndustryMediaWorld } from '../services/industryWorld';

const player = structuredClone(INITIAL_PLAYER);
player.team.publicist = {
    id: 'publicist_standard', name: 'Arjun Hale', type: 'PUBLICIST', tier: 'STANDARD', weeklyCost: 250_000,
    description: 'Standard publicist', perks: 'Media support',
};
player.world.industryMedia = normalizeIndustryMediaWorld(undefined);
const vector = { reputation: -2, controversy: 8, followers: -500, projectBuzz: 0, mediaStance: -2, discussionHeat: 12, relationshipTension: 3, narrativeMomentum: -2 };
const batch = applyPublicistMediaBatch(player, [
    { key: 'low', absoluteWeek: 50, importance: 'LOW', rawEffects: vector },
    { key: 'high', absoluteWeek: 50, importance: 'HIGH', rawEffects: vector },
    { key: 'medium', absoluteWeek: 50, importance: 'MEDIUM', rawEffects: vector },
]);
assert.equal(batch.results.filter(item => item.intervention).length, 2, 'standard publicist has two interventions per week');
assert.ok(batch.results.find(item => item.key === 'high')?.intervention);
assert.ok(batch.results.find(item => item.key === 'medium')?.intervention);
assert.equal(batch.results.find(item => item.key === 'low')?.intervention, undefined);
const summary = getPublicistWeekSummary(batch.player, 50);
assert.equal(summary.interventionsUsed, 2);
assert.equal(summary.capacity, 2);
assert.match(summary.summary, /Arjun Hale|publicist/i);

const nextWeek = applyPublicistMediaBatch(batch.player, [{ key: 'next', absoluteWeek: 51, importance: 'LOW', rawEffects: vector }]);
assert.ok(nextWeek.results[0].intervention, 'capacity resets; it is never banked or carried');

const noPublicist = structuredClone(INITIAL_PLAYER);
noPublicist.world.industryMedia = normalizeIndustryMediaWorld(undefined);
const untouched = applyPublicistMediaBatch(noPublicist, [{ key: 'none', absoluteWeek: 50, importance: 'HIGH', rawEffects: vector }]);
assert.deepEqual(untouched.results[0].appliedEffects, vector);
assert.equal(untouched.results[0].intervention, undefined);

console.log('Industry media C7 publicist capacity audit passed.');
