// @ts-nocheck - executable C5 entered-week, lineage, and exactly-once fixture.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type IndustryMediaFandom, type IndustryMediaStory, type Player } from '../types';
import {
    appendIndustryEventFacts,
    createIndustryEventFact,
    normalizeIndustryMediaWorld,
    processIndustryWorldWeek,
} from '../services/industryWorld';

const player = structuredClone(INITIAL_PLAYER) as Player;
player.id = 'empire_studios';
player.name = 'Empire Studios';
player.world.platforms = {};
player.world.studios = {};
player.world.projects = [];
player.world.industryProductions = {};
const absoluteWeek = 2_200;
const event = createIndustryEventFact({
    idempotencyKey: 'c5:week:project-release', absoluteWeek, type: 'PROJECT_RELEASE_PLANNED', importance: 'HIGH',
    companyId: player.id, companyName: player.name, projectId: 'night_signal',
    headline: 'Empire Studios dates Night Signal',
    detail: 'The studio confirmed its biggest mystery release of the year.',
    evidence: [{ kind: 'PROJECT', id: 'night_signal' }],
});
const story: IndustryMediaStory = {
    schemaVersion: 1, id: 'story_c5_week', subjectKey: 'project:night_signal', category: 'PROJECT_RELEASE',
    stage: 'CONFIRMED', importance: 'HIGH', primaryIndustryEventId: event.id, industryEventIds: [event.id],
    firstAbsoluteWeek: absoluteWeek, lastAdvancedAbsoluteWeek: absoluteWeek, headline: event.headline,
    detail: event.detail, channelEligibility: ['NEWS', 'X', 'INSTAGRAM'], publishedChannels: [],
    companyId: player.id, companyName: player.name, projectId: 'night_signal',
};
const fandom: IndustryMediaFandom = {
    schemaVersion: 1, id: 'fandom_c5_week', name: 'Night Signal Guard', handle: '@NightSignalGuard',
    bio: 'Fan-run.', primaryColor: '#7C3AED', secondaryColor: '#111827', avatar: 'data:image/svg+xml,local',
    motif: 'PROTECTIVE', subjectKey: story.subjectKey, subjectName: 'Night Signal', companyId: player.id,
    projectId: 'night_signal', archetype: 'PROTECTIVE', homeRegionId: 'GLOBAL', languageId: 'en',
    size: 40_000, loyalty: 72, activity: 76, coordination: 68, optimism: 65, volatility: 42,
    formedAbsoluteWeek: absoluteWeek - 20, lastActiveAbsoluteWeek: absoluteWeek - 1,
    friendlySubjectKeys: [], rivalSubjectKeys: [], recentCampaignIds: [],
};
player.world.industryEvents = appendIndustryEventFacts(undefined, [event]);
player.world.industryMedia = normalizeIndustryMediaWorld({ stories: [story], fandoms: [fandom] });
const youtubeBefore = structuredClone(player.youtube);

const once = processIndustryWorldWeek(player, player.world, absoluteWeek);
assert.equal(once.processed, true);
assert.equal(once.player.world.industryMedia.campaigns.length, 1);
const campaign = once.player.world.industryMedia.campaigns[0];
assert.equal(campaign.fandomId, fandom.id);
assert.equal(campaign.industryEventId, event.id);
assert.equal(campaign.mediaStoryId, story.id);
assert.equal(campaign.playerRelated, true);
const instagramEcho = once.player.instagram.feed.find(post => post.campaignId === campaign.id);
assert.ok(instagramEcho, 'campaign start must appear once in the saved Instagram feed');
assert.equal(instagramEcho.fandomId, fandom.id);
assert.equal(instagramEcho.industryEventId, event.id);
assert.ok(once.socialPosts.every(post => !post.campaignId || post.industryEventId === event.id));
assert.deepEqual(once.player.youtube, youtubeBefore, 'C5 must not mutate the player YouTube channel');

const replay = processIndustryWorldWeek(once.player, once.world, absoluteWeek);
assert.equal(replay.processed, false);
assert.deepEqual(replay.player, once.player);
assert.equal(replay.socialPosts.length, 0);

console.log('Industry media C5 fandom entered-week audit passed.');
