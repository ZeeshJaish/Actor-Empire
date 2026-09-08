// @ts-nocheck - executable C7 narrative copy and lineage fixture.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER } from '../types';
import {
    advanceIndustryMediaNarratives,
    appendIndustryEventFacts,
    createIndustryEventFact,
    getIndustryNarrativeContext,
    normalizeIndustryMediaWorld,
} from '../services/industryWorld';

const week = 2_800;
const event = createIndustryEventFact({
    idempotencyKey: 'c7:copy:award', absoluteWeek: week, type: 'AWARD_WON', importance: 'HIGH',
    companyId: 'empire_studios', companyName: 'Empire Studios', projectId: 'project_award', awardEventId: 'award_1',
    headline: 'Empire Studios wins the Grand Jury Prize',
    detail: 'The jury awarded Empire Studios the Grand Jury Prize for Northern Lights.',
    evidence: [{ kind: 'AWARD', id: 'award_1' }, { kind: 'PROJECT', id: 'project_award' }],
});
const story = {
    schemaVersion: 1, id: `story_${event.id}`, subjectKey: 'company:empire_studios', category: 'AWARDS', stage: 'RESOLVED',
    importance: 'HIGH', primaryIndustryEventId: event.id, industryEventIds: [event.id], firstAbsoluteWeek: week,
    lastAdvancedAbsoluteWeek: week, headline: event.headline, detail: event.detail,
    channelEligibility: ['NEWS', 'X', 'YOUTUBE'], publishedChannels: ['NEWS'],
    companyId: 'empire_studios', companyName: 'Empire Studios', projectId: 'project_award', awardEventId: 'award_1',
};
const player = structuredClone(INITIAL_PLAYER);
player.id = 'empire_studios';
player.name = 'Empire Studios';
player.world.industryEvents = appendIndustryEventFacts(undefined, [event]);
player.world.industryMedia = normalizeIndustryMediaWorld({ stories: [story] });

const result = advanceIndustryMediaNarratives(player, week);
const context = getIndustryNarrativeContext(result.player.world.industryMedia, 'company:empire_studios');
assert.ok(context);
assert.equal(context.theme, 'AWARDS_POWERHOUSE');
assert.match(context.headline, /Empire Studios/);
assert.match(context.summary, /Grand Jury Prize|award/i);
assert.ok(context.evidenceEventIds.includes(event.id));
assert.ok(!/always|never|guaranteed|undeniably/i.test(`${context.headline} ${context.summary}`));
assert.equal(getIndustryNarrativeContext(result.player.world.industryMedia, 'company:unknown'), undefined);

console.log('Industry media C7 narrative copy audit passed.');
