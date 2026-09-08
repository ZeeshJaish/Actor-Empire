// @ts-nocheck - executable deterministic discussion fixtures.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type IndustryMediaStory, type Player, type XPost } from '../types';
import {
    createIndustryEventFact,
    ensureIndustryMediaDiscussion,
    normalizeIndustryMediaWorld,
} from '../services/industryWorld';

const player = structuredClone(INITIAL_PLAYER) as Player;
player.id = 'player_empire';
player.name = 'Empire Studios';
const event = createIndustryEventFact({
    idempotencyKey: 'c3:discussion:greenlight',
    absoluteWeek: 900,
    type: 'PROJECT_GREENLIT',
    importance: 'HIGH',
    companyId: player.id,
    companyName: player.name,
    projectId: 'project_starfall',
    headline: 'Empire Studios greenlights Starfall',
    detail: 'The science-fiction production package is approved.',
    evidence: [{ kind: 'PROJECT', id: 'project_starfall' }],
});
const story: IndustryMediaStory = {
    schemaVersion: 1,
    id: 'media_story_starfall',
    subjectKey: 'project:project_starfall',
    category: 'PROJECT_DEVELOPMENT',
    stage: 'CONFIRMED',
    importance: 'HIGH',
    primaryIndustryEventId: event.id,
    industryEventIds: [event.id],
    firstAbsoluteWeek: 900,
    lastAdvancedAbsoluteWeek: 900,
    headline: event.headline,
    detail: event.detail,
    channelEligibility: ['NEWS', 'X'],
    publishedChannels: ['X'],
    companyId: player.id,
    companyName: player.name,
    projectId: 'project_starfall',
};
const base = normalizeIndustryMediaWorld({
    stories: [story],
    eventStoryIndex: { [event.id]: story.id },
});
const source = base.personalities.find(item => item.signatureRole === 'ANTAGONIST')!;
const sourcePost: XPost = {
    id: `x_${event.id}`,
    authorId: source.id,
    authorName: source.name,
    authorHandle: source.handle,
    authorAvatar: source.avatar,
    content: `${event.headline} The scale will still have to prove itself.`,
    timestamp: 900,
    likes: 2_000,
    retweets: 300,
    replies: 180,
    isPlayer: false,
    isLiked: false,
    isRetweeted: false,
    isVerified: true,
    industryEventId: event.id,
    mediaStoryId: story.id,
    mediaPersonalityId: source.id,
};

const first = ensureIndustryMediaDiscussion({ state: base, story, event, post: sourcePost, player, absoluteWeek: 900 });
const replay = ensureIndustryMediaDiscussion({ state: first.state, story, event, post: sourcePost, player, absoluteWeek: 900 });

assert.equal(first.state.schemaVersion, 7);
assert.equal(first.state.discussions.length, 1);
assert.equal(first.discussion.id, replay.discussion.id);
assert.deepEqual(replay.state, first.state, 'same source post must not grow or reroll a discussion');
assert.equal(first.post.mediaDiscussionId, first.discussion.id);
assert.equal(first.discussion.industryEventId, event.id);
assert.equal(first.discussion.mediaStoryId, story.id);
assert.equal(first.discussion.sourcePostId, sourcePost.id);
assert.equal(first.discussion.isPlayerRelated, true);
assert.equal(first.discussion.responseClosesAbsoluteWeek, 902);
assert.ok(first.discussion.turns.length >= 2);
assert.ok(first.discussion.turns.length <= 8);
assert.equal(first.discussion.turns[0].mediaPersonalityId, source.id);
assert.ok(first.discussion.turns.every(turn => turn.industryEventId === event.id && turn.mediaStoryId === story.id));
assert.ok(first.discussion.turns.every(turn => !/\$999M|inside source|confirmed crossover/i.test(turn.content)));
assert.ok(new Set(first.discussion.turns.map(turn => turn.mediaPersonalityId).filter(Boolean)).size >= 2);

const normalizedMalformed = normalizeIndustryMediaWorld({
    ...first.state,
    discussions: [
        ...first.state.discussions,
        { ...first.discussion, id: 'orphan', mediaStoryId: 'missing_story' },
    ],
});
assert.equal(normalizedMalformed.discussions.length, 1, 'orphan discussions must not survive normalization');

console.log('Industry media C3 discussion audit passed.');
