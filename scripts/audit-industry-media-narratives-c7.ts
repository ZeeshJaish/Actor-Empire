// @ts-nocheck - executable C7 long-term narrative fixture.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER } from '../types';
import {
    advanceIndustryMediaNarratives,
    appendIndustryEventFacts,
    createIndustryEventFact,
    normalizeIndustryMediaWorld,
} from '../services/industryWorld';

const baseWeek = 2_700;
const facts = [
    ['greenlight', 'PROJECT_GREENLIT', baseWeek, 'Empire Studios greenlights an ambitious drama', 'Empire Studios committed to an unusually ambitious drama.'],
    ['overrun', 'PROJECT_OVERRUN', baseWeek + 2, 'The drama runs over budget', 'Production costs exceeded the approved plan.'],
    ['flop', 'PROJECT_FLOP', baseWeek + 5, 'The drama misses expectations', 'The released drama failed to meet commercial expectations.'],
    ['hit', 'PROJECT_HIT', baseWeek + 12, 'Empire Studios answers with a hit', 'The next Empire Studios drama became a commercial hit.'],
] as const;

const events = facts.map(([key, type, absoluteWeek, headline, detail]) => createIndustryEventFact({
    idempotencyKey: `c7:narrative:${key}`,
    absoluteWeek,
    type,
    importance: 'HIGH',
    companyId: 'empire_studios',
    companyName: 'Empire Studios',
    projectId: key === 'hit' ? 'project_recovery' : 'project_ambition',
    headline,
    detail,
    evidence: [{ kind: 'COMPANY', id: 'empire_studios' }],
}));

const stories = events.map(event => ({
    schemaVersion: 1,
    id: `story_${event.id}`,
    subjectKey: 'company:empire_studios',
    category: event.type === 'PROJECT_GREENLIT' ? 'PROJECT_DEVELOPMENT'
        : event.type === 'PROJECT_OVERRUN' ? 'PROJECT_PRODUCTION' : 'PROJECT_OUTCOME',
    stage: ['PROJECT_FLOP', 'PROJECT_HIT'].includes(event.type) ? 'RESOLVED' : 'CONFIRMED',
    importance: 'HIGH',
    primaryIndustryEventId: event.id,
    industryEventIds: [event.id],
    firstAbsoluteWeek: event.absoluteWeek,
    lastAdvancedAbsoluteWeek: event.absoluteWeek,
    headline: event.headline,
    detail: event.detail,
    channelEligibility: ['NEWS', 'X', 'YOUTUBE'],
    publishedChannels: ['NEWS'],
    companyId: 'empire_studios',
    companyName: 'Empire Studios',
}));

const player = structuredClone(INITIAL_PLAYER);
player.id = 'empire_studios';
player.name = 'Empire Studios';
player.world.industryEvents = appendIndustryEventFacts(undefined, events);
player.world.industryMedia = normalizeIndustryMediaWorld({ stories });

const first = advanceIndustryMediaNarratives(player, baseWeek);
const replay = advanceIndustryMediaNarratives(structuredClone(player), baseWeek);
assert.deepEqual(first.player.world.industryMedia.narratives, replay.player.world.industryMedia.narratives);
assert.ok(first.createdNarratives.length <= 1);
assert.equal(first.createdNarratives.length, 1);
assert.equal(first.player.world.industryMedia.narratives[0].theme, 'AMBITIOUS_RISK_TAKER');

const sameWeek = advanceIndustryMediaNarratives(first.player, baseWeek);
assert.equal(sameWeek.createdNarratives.length, 0);
assert.deepEqual(sameWeek.player, first.player, 'the same fact must not be consumed twice');

const overrun = advanceIndustryMediaNarratives(first.player, baseWeek + 2);
assert.equal(overrun.player.world.industryMedia.narratives.length, 1, 'new evidence should progress the existing subject narrative');
assert.ok(overrun.player.world.industryMedia.narratives[0].landmarks.some(item => item.industryEventIds.includes(events[1].id)));

const flop = advanceIndustryMediaNarratives(overrun.player, baseWeek + 5);
const recovery = advanceIndustryMediaNarratives(flop.player, baseWeek + 12);
const narrative = recovery.player.world.industryMedia.narratives[0];
assert.ok(narrative.supportingEvidence > 0);
assert.ok(narrative.contradictingEvidence > 0, 'later contrary evidence should remain distinct');
assert.ok(narrative.landmarks.length <= 8);
assert.ok(new Set(narrative.landmarks.flatMap(item => item.industryEventIds)).size >= 4);
assert.equal(recovery.retrospectiveNews.length, 1, 'eligible narrative progress should produce one retrospective media beat');
assert.equal(recovery.retrospectiveXPosts.length, 1);
assert.equal(recovery.retrospectiveNews[0].industryEventId, events[3].id);
assert.match(recovery.retrospectiveNews[0].subtext || '', /earlier|history|narrative/i);

const replayRetrospective = advanceIndustryMediaNarratives(recovery.player, baseWeek + 12);
assert.equal(replayRetrospective.retrospectiveNews.length, 0, 'retrospectives must be exact-once');

console.log('Industry media C7 narratives audit passed.');
