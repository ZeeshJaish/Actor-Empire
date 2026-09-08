// @ts-nocheck - executable player-response contract fixtures.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type IndustryMediaStory, type Player, type XPost } from '../types';
import {
    appendIndustryEventFacts,
    createIndustryEventFact,
    ensureIndustryMediaDiscussion,
    getIndustryMediaResponseAdvice,
    getIndustryMediaResponseOpportunity,
    normalizeIndustryMediaWorld,
    submitIndustryMediaResponse,
} from '../services/industryWorld';

const player = structuredClone(INITIAL_PLAYER) as Player;
player.id = 'player_empire';
player.name = 'Empire Studios';
player.currentWeek = 17;
player.age = 30;
player.energy.current = 41;
player.stats.reputation = 62;
player.instagram.controversy = 19;
player.x.followers = 80_000;
player.team.publicist = {
    id: 'publicist_standard', name: 'Avery Cole', type: 'PUBLICIST', tier: 'STANDARD', weeklyCost: 1_000,
    description: '', perks: '',
};
const event = createIndustryEventFact({
    idempotencyKey: 'c3:response:greenlight', absoluteWeek: 900, type: 'PROJECT_GREENLIT', importance: 'HIGH',
    companyId: player.id, companyName: player.name, projectId: 'starfall',
    headline: 'Empire Studios greenlights Starfall', detail: 'The production package is approved.',
    evidence: [{ kind: 'PROJECT', id: 'starfall' }],
});
const story: IndustryMediaStory = {
    schemaVersion: 1, id: 'story_starfall', subjectKey: 'project:starfall', category: 'PROJECT_DEVELOPMENT',
    stage: 'CONFIRMED', importance: 'HIGH', primaryIndustryEventId: event.id, industryEventIds: [event.id],
    firstAbsoluteWeek: 900, lastAdvancedAbsoluteWeek: 900, headline: event.headline, detail: event.detail,
    channelEligibility: ['NEWS', 'X'], publishedChannels: ['X'], companyId: player.id, companyName: player.name,
    projectId: 'starfall',
};
let media = normalizeIndustryMediaWorld({ stories: [story], eventStoryIndex: { [event.id]: story.id } });
const source = media.personalities.find(item => item.signatureRole === 'ANTAGONIST')!;
const sourcePost: XPost = {
    id: `x_${event.id}`, authorId: source.id, authorName: source.name, authorHandle: source.handle,
    authorAvatar: source.avatar, content: `${event.headline} The decision still has to prove itself.`, timestamp: 900,
    likes: 2_000, retweets: 300, replies: 180, isPlayer: false, isLiked: false, isRetweeted: false,
    isVerified: true, industryEventId: event.id, mediaStoryId: story.id, mediaPersonalityId: source.id,
};
const created = ensureIndustryMediaDiscussion({ state: media, story, event, post: sourcePost, player, absoluteWeek: 900 });
media = created.state;
const linkedPost = created.post;
player.world.industryEvents = appendIndustryEventFacts(undefined, [event]);
player.world.industryMedia = media;
player.x.feed = [linkedPost];

const snapshot = structuredClone(player) as Player;
const opportunity = getIndustryMediaResponseOpportunity(player, linkedPost, 901);
assert.equal(opportunity.isEligible, true);
assert.deepEqual(opportunity.allowedFormats, ['REPLY', 'QUOTE', 'STATEMENT']);
assert.deepEqual(opportunity.allowedSpeakers, ['PERSONAL', 'STUDIO']);
assert.deepEqual(player, snapshot, 'inspecting or choosing silence must not mutate the player');

const advice = getIndustryMediaResponseAdvice(player, linkedPost, 901);
assert.equal(advice.publicistName, 'Avery Cole');
assert.ok(advice.recommendedTone);
assert.ok(advice.recommendedFormat);
assert.match(advice.summary, /recommends/i);

const submitted = submitIndustryMediaResponse({
    player, sourcePost: linkedPost, tone: 'CLARIFY', format: 'REPLY', speaker: 'STUDIO', absoluteWeek: 901,
});
assert.equal(submitted.accepted, true);
assert.equal(submitted.response?.status, 'PENDING');
assert.equal(submitted.response?.resolvesAbsoluteWeek, 902);
assert.equal(submitted.publishedPost?.replyToId, linkedPost.id);
assert.equal(submitted.publishedPost?.mediaDiscussionId, created.discussion.id);
assert.equal(submitted.publishedPost?.mediaResponseId, submitted.response?.id);
assert.equal(submitted.player.stats.reputation, player.stats.reputation, 'submission must not apply result early');
assert.equal(submitted.player.instagram.controversy, player.instagram.controversy);
assert.equal(submitted.player.x.followers, player.x.followers);
assert.equal(submitted.player.energy.current, player.energy.current, 'C3 media choices do not consume energy');
assert.equal(submitted.player.world.industryMedia?.playerResponses.length, 1);

const duplicate = submitIndustryMediaResponse({
    player: submitted.player, sourcePost: linkedPost, tone: 'CHALLENGE', format: 'QUOTE', speaker: 'PERSONAL', absoluteWeek: 901,
});
assert.equal(duplicate.accepted, false);
assert.equal(duplicate.reason, 'ALREADY_RESPONDED');
assert.deepEqual(duplicate.player, submitted.player);

const expired = getIndustryMediaResponseOpportunity(player, linkedPost, 903);
assert.equal(expired.isEligible, false);
assert.equal(expired.reason, 'WINDOW_CLOSED');

console.log('Industry media C3 response audit passed.');
