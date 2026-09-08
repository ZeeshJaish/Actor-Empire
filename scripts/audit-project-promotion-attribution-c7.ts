// @ts-nocheck - executable C7 project-promotion attribution fixture.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER } from '../types';
import { applyProjectPromotionAttribution, getEligiblePromotionProjects } from '../services/projectPromotionAttribution';
import { normalizeIndustryMediaWorld } from '../services/industryWorld';

const player = structuredClone(INITIAL_PLAYER);
player.age = 30;
player.currentWeek = 10;
player.money = 999_000_000;
player.energy.current = 65;
player.world.industryMedia = normalizeIndustryMediaWorld(undefined);
player.commitments = [
    { id: 'active_a', name: 'Northern Lights', type: 'ACTING_GIG', energyCost: 10, income: 0, payoutType: 'LUMPSUM', projectPhase: 'POST_PRODUCTION', promotionalBuzz: 4 },
    { id: 'active_b', name: 'Ashfall', type: 'DIRECTOR_GIG', energyCost: 10, income: 0, payoutType: 'LUMPSUM', projectPhase: 'PRODUCTION', promotionalBuzz: 1 },
    { id: 'job', name: 'Day Job', type: 'JOB', energyCost: 10, income: 0, payoutType: 'WEEKLY' },
];
assert.deepEqual(getEligiblePromotionProjects(player).map(item => item.id), ['active_a', 'active_b']);

const beforeMoney = player.money;
const beforeEnergy = player.energy.current;
const first = applyProjectPromotionAttribution(player, {
    projectId: 'active_a', publicationId: 'x_post_1', channel: 'X', promotionType: 'PROJECT_PROMO',
    absoluteWeek: 1570, reach: 150_000, engagement: 12_000,
});
assert.ok(first.appliedBuzzDelta > 0);
assert.equal(first.player.commitments.find(item => item.id === 'active_a').promotionalBuzz, 4 + first.appliedBuzzDelta);
assert.equal(first.player.commitments.find(item => item.id === 'active_b').promotionalBuzz, 1);
assert.equal(first.player.money, beforeMoney);
assert.equal(first.player.energy.current, beforeEnergy);

const replay = applyProjectPromotionAttribution(first.player, {
    projectId: 'active_a', publicationId: 'x_post_1', channel: 'X', promotionType: 'PROJECT_PROMO',
    absoluteWeek: 1570, reach: 150_000, engagement: 12_000,
});
assert.equal(replay.appliedBuzzDelta, 0);
assert.deepEqual(replay.player, first.player);

const second = applyProjectPromotionAttribution(first.player, {
    projectId: 'active_a', publicationId: 'x_post_2', channel: 'X', promotionType: 'PROJECT_PROMO',
    absoluteWeek: 1571, reach: 150_000, engagement: 12_000,
});
assert.ok(second.attribution.fatigueMultiplier < first.attribution.fatigueMultiplier);
assert.ok(second.appliedBuzzDelta <= first.appliedBuzzDelta);

const projectless = applyProjectPromotionAttribution(second.player, {
    projectId: '', publicationId: 'lifestyle_post', channel: 'INSTAGRAM', promotionType: 'REEL', absoluteWeek: 1571,
});
assert.equal(projectless.appliedBuzzDelta, 0);
assert.deepEqual(projectless.player, second.player);

const badPress = applyProjectPromotionAttribution(projectless.player, {
    projectId: 'active_b', publicationId: 'press_bad_1', channel: 'PRESS', promotionType: 'INTERVIEW',
    absoluteWeek: 1572, baseBuzzDelta: -5,
});
assert.ok(badPress.appliedBuzzDelta < 0, 'a press appearance that lands badly must reduce project buzz');
assert.equal(
    badPress.player.commitments.find(item => item.id === 'active_b').promotionalBuzz,
    1 + badPress.appliedBuzzDelta,
);
assert.ok(Math.abs(badPress.appliedBuzzDelta) <= 5, 'a publicist may mitigate damage but must not reverse it');

console.log('C7 project promotion attribution audit passed.');
