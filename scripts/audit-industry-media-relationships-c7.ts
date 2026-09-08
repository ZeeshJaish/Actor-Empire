// @ts-nocheck - executable C7 relationship progression fixture.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER } from '../types';
import { advanceIndustryMediaRelationships, normalizeIndustryMediaWorld } from '../services/industryWorld';

const player = structuredClone(INITIAL_PLAYER);
player.id = 'empire_studios';
player.name = 'Empire Studios';
player.world.industryMedia = normalizeIndustryMediaWorld(undefined);
const week = 2_900;

const interaction = (id, absoluteWeek, sentiment, hostile = sentiment < 0) => ({
    id, personalityId: 'gideon_price', subjectKey: 'company:empire_studios', subjectName: 'Empire Studios',
    absoluteWeek, sentiment, hostile, industryEventId: `event_${id}`, playerRelated: true,
});

const first = advanceIndustryMediaRelationships(player, week, { interactions: [interaction('one', week, -8)] });
assert.equal(first.relationships.length, 1);
assert.equal(first.relationships[0].feudState, 'NONE', 'one hostile interaction is not a feud');
assert.ok(first.relationships[0].affinity <= -36, 'signature antagonist must stay inside its stance ceiling');

const duplicate = advanceIndustryMediaRelationships(first.player, week, { interactions: [interaction('one', week, -8)] });
assert.deepEqual(duplicate.player, first.player, 'same interaction must be exact-once');

const praise = advanceIndustryMediaRelationships(first.player, week + 1, { interactions: [interaction('praise', week + 1, 20, false)] });
assert.ok(praise.relationships[0].affinity <= -36, 'praise cannot erase an antagonist identity');
assert.ok(praise.relationships[0].respect > first.relationships[0].respect);
assert.ok(praise.relationships[0].landmarkInteractionIds.length <= 12);
assert.equal(
    praise.player.world.industryMedia.subjectStances.find(item => item.personalityId === 'gideon_price')?.affinity,
    praise.relationships[0].affinity,
    'C2 stance mirror must match the C7 relationship authority',
);

console.log('Industry media C7 relationships audit passed.');
