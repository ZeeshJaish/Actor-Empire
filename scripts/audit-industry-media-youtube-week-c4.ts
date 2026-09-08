// @ts-nocheck - executable C4 entered-week and cross-platform lineage fixture.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type IndustryMediaStory, type Player } from '../types';
import {
    appendIndustryEventFacts,
    createIndustryEventFact,
    normalizeIndustryMediaWorld,
    processIndustryWorldWeek,
} from '../services/industryWorld';

const player = structuredClone(INITIAL_PLAYER) as Player;
player.id = 'c4_week_player';
player.name = 'Empire Studios';
player.age = 42;
player.currentWeek = 5;
player.world.platforms = {};
player.world.studios = {};
player.world.projects = [];
player.world.industryProductions = {};

const absoluteWeek = 2_189;
const event = createIndustryEventFact({
    idempotencyKey: 'c4:week:franchise', absoluteWeek, type: 'FRANCHISE_DECISION', importance: 'HIGH',
    companyId: player.id, companyName: player.name, projectId: 'echo_project',
    headline: 'Empire Studios confirms a connected Echo Project story',
    detail: 'The studio confirmed the project is part of its connected screen universe.',
    evidence: [{ kind: 'PROJECT', id: 'echo_project' }],
});
const story: IndustryMediaStory = {
    schemaVersion: 1, id: 'story_c4_week', subjectKey: 'project:echo_project', category: 'FRANCHISE',
    stage: 'CONFIRMED', importance: 'HIGH', primaryIndustryEventId: event.id, industryEventIds: [event.id],
    firstAbsoluteWeek: absoluteWeek, lastAdvancedAbsoluteWeek: absoluteWeek, headline: event.headline,
    detail: event.detail, channelEligibility: ['NEWS', 'X', 'INSTAGRAM', 'YOUTUBE'], publishedChannels: [],
    companyId: player.id, companyName: player.name, projectId: 'echo_project',
};
player.world.industryEvents = appendIndustryEventFacts(undefined, [event]);
player.world.industryMedia = normalizeIndustryMediaWorld({ stories: [story] });
const playerYoutubeBefore = structuredClone(player.youtube);

const once = processIndustryWorldWeek(player, player.world, absoluteWeek);
assert.equal(once.processed, true);
assert.equal(once.player.world.industryMedia?.youtubeVideos.length, 1);
const video = once.player.world.industryMedia.youtubeVideos[0];
const xEcho = once.player.x.feed.find(post => post.industryYoutubeVideoId === video.id);
assert.ok(xEcho, 'a new creator video must have one saved X promotional echo');
assert.equal(xEcho.industryEventId, event.id);
assert.equal(xEcho.mediaStoryId, story.id);
assert.equal(xEcho.mediaPersonalityId, video.personalityId);
assert.ok(once.socialPosts.some(post => post.industryYoutubeVideoId === video.id));
assert.deepEqual(once.player.youtube, playerYoutubeBefore);

const replay = processIndustryWorldWeek(once.player, once.world, absoluteWeek);
assert.equal(replay.processed, false);
assert.deepEqual(replay.player, once.player);
assert.equal(replay.socialPosts.length, 0);

console.log('Industry media C4 YouTube entered-week audit passed.');
