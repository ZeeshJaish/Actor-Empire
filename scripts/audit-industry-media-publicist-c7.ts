// @ts-nocheck - executable C7 automatic publicist modifier fixture.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER } from '../types';
import { applyPublicistMediaModifier, normalizeIndustryMediaWorld } from '../services/industryWorld';

const player = structuredClone(INITIAL_PLAYER);
player.team.publicist = {
    id: 'publicist_elite', name: 'Mira Shaw', type: 'PUBLICIST', tier: 'ELITE', weeklyCost: 1_000_000,
    description: 'Elite publicist', perks: 'Strong media protection',
};
player.world.industryMedia = normalizeIndustryMediaWorld(undefined);
const input = {
    key: 'response:r1', absoluteWeek: 44, importance: 'HIGH', sourceId: 'r1', outcomeLabel: 'BACKFIRED',
    rawEffects: { reputation: -3, controversy: 10, followers: -1000, projectBuzz: 0, mediaStance: -4, discussionHeat: 18, relationshipTension: 8, narrativeMomentum: -6 },
};
const result = applyPublicistMediaModifier(player, input);
assert.equal(result.appliedEffects.reputation, -2);
assert.ok(result.appliedEffects.controversy >= 0 && result.appliedEffects.controversy < 10);
assert.ok(result.appliedEffects.followers <= 0 && result.appliedEffects.followers > -1000);
assert.equal(result.outcomeChanged, false);
assert.ok(result.intervention);
assert.equal(result.player.world.industryMedia.prInterventions.length, 1);

const replay = applyPublicistMediaModifier(result.player, input);
assert.deepEqual(replay.player, result.player);
assert.deepEqual(replay.appliedEffects, result.appliedEffects, 'replay must return the saved applied effects');

const positive = applyPublicistMediaModifier(result.player, {
    key: 'positive:p1', absoluteWeek: 45, importance: 'MEDIUM',
    rawEffects: { reputation: 5, controversy: -3, followers: 1000, projectBuzz: 4, mediaStance: 2, discussionHeat: -4, relationshipTension: -2, narrativeMomentum: 5 },
});
assert.ok(positive.appliedEffects.reputation > 5);
assert.ok(positive.appliedEffects.projectBuzz > 4);
assert.ok(positive.appliedEffects.controversy <= -3, 'beneficial damage reduction is allowed to amplify but not reverse');

console.log('Industry media C7 publicist audit passed.');
