// @ts-nocheck - executable exactly-once response-resolution fixtures.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type IndustryMediaStory, type Player, type XPost } from '../types';
import {
    appendIndustryEventFacts,
    createIndustryEventFact,
    ensureIndustryMediaDiscussion,
    normalizeIndustryMediaWorld,
    processIndustryWorldWeek,
    resolveIndustryMediaResponses,
    submitIndustryMediaResponse,
} from '../services/industryWorld';

const player = structuredClone(INITIAL_PLAYER) as Player;
player.id = 'player_empire';
player.name = 'Empire Studios';
player.currentWeek = 18;
player.age = 30;
player.money = 777_000_000;
player.energy.current = 44;
player.stats.fame = 71;
player.stats.reputation = 60;
player.instagram.controversy = 20;
player.x.followers = 100_000;
player.team.publicist = {
    id: 'publicist_elite', name: 'Morgan Vale', type: 'PUBLICIST', tier: 'ELITE', weeklyCost: 1_000,
    description: '', perks: '',
};
const event = createIndustryEventFact({
    idempotencyKey: 'c3:resolution:project', absoluteWeek: 1_000, type: 'PROJECT_GREENLIT', importance: 'HIGH',
    companyId: player.id, companyName: player.name, projectId: 'project_c3',
    headline: 'Empire Studios greenlights Night Signal', detail: 'The production package is approved.',
    evidence: [{ kind: 'PROJECT', id: 'project_c3' }],
});
const story: IndustryMediaStory = {
    schemaVersion: 1, id: 'story_c3', subjectKey: 'project:project_c3', category: 'PROJECT_DEVELOPMENT',
    stage: 'CONFIRMED', importance: 'HIGH', primaryIndustryEventId: event.id, industryEventIds: [event.id],
    firstAbsoluteWeek: 1_000, lastAdvancedAbsoluteWeek: 1_000, headline: event.headline, detail: event.detail,
    channelEligibility: ['NEWS', 'X'], publishedChannels: ['X'], companyId: player.id, companyName: player.name,
    projectId: 'project_c3',
};
let media = normalizeIndustryMediaWorld({ stories: [story], eventStoryIndex: { [event.id]: story.id } });
const personality = media.personalities.find(item => item.signatureRole === 'ANTAGONIST')!;
const post: XPost = {
    id: `x_${event.id}`, authorId: personality.id, authorName: personality.name, authorHandle: personality.handle,
    authorAvatar: personality.avatar, content: `${event.headline} The scale still has to prove itself.`, timestamp: 1_000,
    likes: 4_000, retweets: 700, replies: 500, isPlayer: false, isLiked: false, isRetweeted: false,
    isVerified: true, industryEventId: event.id, mediaStoryId: story.id, mediaPersonalityId: personality.id,
};
const discussion = ensureIndustryMediaDiscussion({ state: media, story, event, post, player, absoluteWeek: 1_000 });
media = discussion.state;
player.world.industryEvents = appendIndustryEventFacts(undefined, [event]);
player.world.industryMedia = media;
player.x.feed = [discussion.post];
const submitted = submitIndustryMediaResponse({
    player, sourcePost: discussion.post, tone: 'ACKNOWLEDGE', format: 'STATEMENT', speaker: 'STUDIO', absoluteWeek: 1_001,
});
assert.equal(submitted.accepted, true);

const before = submitted.player;
const resolved = resolveIndustryMediaResponses(before, 1_002);
const response = resolved.player.world.industryMedia!.playerResponses[0];
assert.equal(resolved.resolvedResponseIds.length, 1);
assert.equal(response.status, 'RESOLVED');
assert.equal(response.resolvedAbsoluteWeek, 1_002);
assert.ok(['LANDED', 'MIXED', 'BACKFIRED', 'IGNORED'].includes(response.outcome!));
assert.ok(response.effects!.reputation >= -3 && response.effects!.reputation <= 3);
assert.ok(response.effects!.controversy >= -8 && response.effects!.controversy <= 10);
assert.ok(response.effects!.mediaStance >= -6 && response.effects!.mediaStance <= 6);
assert.ok(response.effects!.discussionHeat >= -25 && response.effects!.discussionHeat <= 30);
assert.equal(resolved.player.stats.reputation, Math.max(0, Math.min(100, before.stats.reputation + response.effects!.reputation)));
assert.equal(resolved.player.instagram.controversy, Math.max(0, Math.min(100, before.instagram.controversy + response.effects!.controversy)));
assert.equal(resolved.player.x.followers, Math.max(0, before.x.followers + response.effects!.followers));
assert.equal(resolved.player.money, before.money);
assert.equal(resolved.player.energy.current, before.energy.current);
assert.equal(resolved.player.stats.fame, before.stats.fame);
assert.equal(resolved.news.length, 1, 'a high-importance formal statement may receive one linked news follow-up');
assert.equal(resolved.news[0].industryEventId, event.id);
assert.equal(resolved.news[0].mediaStoryId, story.id);
assert.equal(resolved.news[0].mediaResponseId, response.id);
const resolvedDiscussion = resolved.player.world.industryMedia!.discussions[0];
assert.equal(resolvedDiscussion.status, 'RESOLVED');
assert.equal(resolvedDiscussion.turns.filter(turn => turn.kind === 'REACTION').length, 1);

const replay = resolveIndustryMediaResponses(resolved.player, 1_002);
assert.equal(replay.resolvedResponseIds.length, 0);
assert.equal(replay.news.length, 0);
assert.deepEqual(replay.player, resolved.player, 'same-week replay must not reroll or reapply response effects');

const coordinatorInput = structuredClone(before) as Player;
const coordinated = processIndustryWorldWeek(coordinatorInput, coordinatorInput.world, 1_002);
assert.equal(coordinated.processed, true);
assert.equal(coordinated.player.world.industryMedia!.playerResponses[0].status, 'RESOLVED',
    'the existing entered-week coordinator must resolve C3 responses');
assert.ok(coordinated.news.some(item => item.mediaResponseId === response.id));
const coordinatedReplay = processIndustryWorldWeek(coordinated.player, coordinated.world, 1_002);
assert.equal(coordinatedReplay.processed, false);
assert.deepEqual(coordinatedReplay.player, coordinated.player);

console.log('Industry media C3 resolution audit passed.');
