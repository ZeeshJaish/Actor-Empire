// @ts-nocheck - executable C7 entered-week ordering fixture.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER } from '../types';
import { appendIndustryEventFacts, createIndustryEventFact, normalizeIndustryMediaWorld, processIndustryWorldWeek } from '../services/industryWorld';

const week = 3_100;
const player = structuredClone(INITIAL_PLAYER);
player.id = 'empire_studios';
player.name = 'Empire Studios';
player.world.platforms = {};
player.world.studios = {};
player.world.projects = [];
player.world.industryProductions = {};
const event = createIndustryEventFact({
    idempotencyKey: 'c7:week:award', absoluteWeek: week, type: 'AWARD_WON', importance: 'HIGH',
    companyId: player.id, companyName: player.name, projectId: 'project_week', awardEventId: 'award_week',
    headline: 'Empire Studios wins the Grand Jury Prize', detail: 'The jury awarded Empire Studios the Grand Jury Prize.',
    evidence: [{ kind: 'AWARD', id: 'award_week' }],
});
const story = {
    schemaVersion: 1, id: `story_${event.id}`, subjectKey: 'company:empire_studios', category: 'AWARDS', stage: 'RESOLVED',
    importance: 'HIGH', primaryIndustryEventId: event.id, industryEventIds: [event.id], firstAbsoluteWeek: week,
    lastAdvancedAbsoluteWeek: week, headline: event.headline, detail: event.detail,
    channelEligibility: ['NEWS', 'X', 'YOUTUBE'], publishedChannels: ['NEWS'], companyId: player.id, companyName: player.name,
};
player.world.industryEvents = appendIndustryEventFacts(undefined, [event]);
player.world.industryMedia = normalizeIndustryMediaWorld({ stories: [story] });

const once = processIndustryWorldWeek(player, player.world, week);
assert.ok(once.player.world.industryMedia.narratives.some(item => item.theme === 'AWARDS_POWERHOUSE'));
assert.ok(once.player.world.industryMedia.processedC7Keys.includes(`narrative:event:${event.id}`));
const replay = processIndustryWorldWeek(once.player, once.world, week);
assert.equal(replay.processed, false);
assert.deepEqual(replay.player, once.player);

console.log('Industry media C7 entered-week audit passed.');
