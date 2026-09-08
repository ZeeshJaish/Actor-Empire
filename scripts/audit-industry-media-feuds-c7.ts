// @ts-nocheck - executable C7 feud qualification and cooling fixture.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER } from '../types';
import { advanceIndustryMediaRelationships, describeIndustryMediaRelationship, normalizeIndustryMediaWorld } from '../services/industryWorld';

const player = structuredClone(INITIAL_PLAYER);
player.id = 'empire_studios';
player.name = 'Empire Studios';
player.world.industryMedia = normalizeIndustryMediaWorld(undefined);
const baseWeek = 3_000;
const hostile = (index) => ({
    id: `conflict_${index}`, personalityId: 'roxie_vale', subjectKey: 'company:empire_studios', subjectName: 'Empire Studios',
    absoluteWeek: baseWeek + index * 2, sentiment: -28, hostile: true, industryEventId: `event_conflict_${index}`, playerRelated: true,
});

const sameWeekPlayer = structuredClone(player);
const sameWeekConflicts = advanceIndustryMediaRelationships(sameWeekPlayer, baseWeek, { interactions: [
    { ...hostile(0), id: 'same_week_1', industryEventId: 'event_same_week_1' },
    { ...hostile(0), id: 'same_week_2', industryEventId: 'event_same_week_2' },
    { ...hostile(0), id: 'same_week_3', industryEventId: 'event_same_week_3' },
] });
assert.equal(sameWeekConflicts.relationships[0].feudState, 'NONE', 'several posts in one week cannot manufacture a feud');
assert.deepEqual(sameWeekConflicts.relationships[0].conflictAbsoluteWeeks, [baseWeek]);

const afterOne = advanceIndustryMediaRelationships(player, baseWeek, { interactions: [hostile(0)] });
assert.equal(afterOne.relationships[0].feudState, 'NONE');
const afterTwo = advanceIndustryMediaRelationships(afterOne.player, baseWeek + 2, { interactions: [hostile(1)] });
assert.equal(afterTwo.relationships[0].feudState, 'BUILDING');
const afterThree = advanceIndustryMediaRelationships(afterTwo.player, baseWeek + 4, { interactions: [hostile(2)] });
assert.equal(afterThree.relationships[0].feudState, 'ACTIVE');
assert.deepEqual(afterThree.relationships[0].conflictAbsoluteWeeks, [baseWeek, baseWeek + 2, baseWeek + 4]);
assert.match(describeIndustryMediaRelationship(afterThree.relationships[0]), /feud|hostile|rivalry/i);

const cooled = advanceIndustryMediaRelationships(afterThree.player, baseWeek + 18, { interactions: [] });
assert.equal(cooled.relationships[0].feudState, 'COOLING');
const reconciled = advanceIndustryMediaRelationships(cooled.player, baseWeek + 20, { interactions: [{
    id: 'reconciliation', personalityId: 'roxie_vale', subjectKey: 'company:empire_studios', subjectName: 'Empire Studios',
    absoluteWeek: baseWeek + 20, sentiment: 70, hostile: false, reconciliation: true, industryEventId: 'event_reconciliation', playerRelated: true,
}] });
assert.equal(reconciled.relationships[0].feudState, 'RESOLVED');
assert.ok(reconciled.relationships[0].landmarkInteractionIds.length <= 12);

console.log('Industry media C7 feuds audit passed.');
