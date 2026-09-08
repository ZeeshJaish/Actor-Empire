// @ts-nocheck - executable C4 YouTube feed-adapter and stability fixture.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type IndustryMediaStory, type Player } from '../types';
import { generateYoutubeFeed, getWeeksSinceYoutubeUpload } from '../services/youtubeLogic';
import {
    appendIndustryEventFacts,
    createIndustryEventFact,
    normalizeIndustryMediaWorld,
    processIndustryMediaYoutube,
} from '../services/industryWorld';

const player = structuredClone(INITIAL_PLAYER) as Player;
player.id = 'c4_feed_player';
player.age = 38;
player.currentWeek = 9;
player.youtube.videos = [{
    id: 'player_video_feed', title: 'My Set Diary', type: 'VLOG', thumbnailColor: 'bg-indigo-500',
    views: 12_000, likes: 900, earnings: 100, weekUploaded: 8, yearUploaded: 38, isPlayer: true,
    authorName: 'Empire Creator', qualityScore: 70, weeklyHistory: [], comments: [],
}];
const absoluteWeek = (player.age - 1) * 52 + (player.currentWeek - 1);
const event = createIndustryEventFact({
    idempotencyKey: 'c4:feed', absoluteWeek, type: 'FRANCHISE_DECISION', importance: 'HIGH',
    companyId: player.id, companyName: 'Empire Studios', projectId: 'feed_project',
    headline: 'Empire Studios confirms Feed Project universe plans',
    detail: 'The project is now confirmed as part of a connected universe.',
    evidence: [{ kind: 'PROJECT', id: 'feed_project' }],
});
const story: IndustryMediaStory = {
    schemaVersion: 1, id: 'story_c4_feed', subjectKey: 'project:feed_project', category: 'FRANCHISE',
    stage: 'CONFIRMED', importance: 'HIGH', primaryIndustryEventId: event.id, industryEventIds: [event.id],
    firstAbsoluteWeek: absoluteWeek, lastAdvancedAbsoluteWeek: absoluteWeek, headline: event.headline,
    detail: event.detail, channelEligibility: ['YOUTUBE'], publishedChannels: [], companyId: player.id,
    companyName: 'Empire Studios', projectId: 'feed_project',
};
player.world.industryEvents = appendIndustryEventFacts(undefined, [event]);
player.world.industryMedia = normalizeIndustryMediaWorld({ stories: [story] });
const published = processIndustryMediaYoutube(player, absoluteWeek).player;

const first = generateYoutubeFeed(published);
for (let index = 0; index < 30; index += 1) Math.random();
const replay = generateYoutubeFeed(structuredClone(published));
assert.deepEqual(replay, first, 'the same save and week must produce the same feed');
assert.equal(first.filter(video => video.id === 'player_video_feed').length, 1);

const industryVideo = first.find(video => video.industryContext);
assert.ok(industryVideo, 'saved C4 videos must appear in the existing Home feed');
assert.equal(industryVideo.industryContext.videoId, published.world.industryMedia?.youtubeVideos[0].id);
assert.equal(industryVideo.industryContext.format, 'THEORY');
assert.equal(industryVideo.industryContext.claimMode, 'SPECULATION');
assert.match(industryVideo.industryContext.interpretation || '', /theory|could|may|possibly/i);
assert.ok(industryVideo.industryContext.creatorSubscribers > 0);
assert.ok(industryVideo.industryContext.creatorAvatar.startsWith('data:image/svg+xml'));
assert.equal(
    getWeeksSinceYoutubeUpload(
        published.age,
        published.currentWeek,
        industryVideo.weekUploaded,
        industryVideo.yearUploaded,
    ),
    0,
    'a video published this entered week must display as a current-week upload',
);

const generic = first.filter(video => video.id.startsWith('yt_feed_'));
assert.equal(generic.length, 10);
assert.ok(generic.every(video => !/\d{13}/.test(video.id)), 'generic IDs must not contain wall-clock timestamps');
assert.equal(new Set(first.map(video => video.id)).size, first.length);

console.log('Industry media C4 YouTube feed audit passed.');
