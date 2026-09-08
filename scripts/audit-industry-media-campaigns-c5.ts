// @ts-nocheck - executable C5 multi-week campaign lifecycle fixture.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type IndustryMediaFandom, type IndustryMediaStory, type Player } from '../types';
import {
    appendIndustryEventFacts,
    calculateIndustryMediaCampaignOutcome,
    createIndustryEventFact,
    normalizeIndustryMediaWorld,
    processIndustryMediaFandoms,
} from '../services/industryWorld';

const player = structuredClone(INITIAL_PLAYER) as Player;
player.id = 'empire_studios';
player.name = 'Empire Studios';
player.age = 46;
player.currentWeek = 8;
const week = 2_400;
const event = createIndustryEventFact({
    idempotencyKey: 'c5:campaign:release', absoluteWeek: week, type: 'PROJECT_RELEASE_PLANNED', importance: 'HIGH',
    companyId: player.id, companyName: player.name, projectId: 'night_signal',
    headline: 'Night Signal confirms its premiere week',
    detail: 'Empire Studios confirmed the Night Signal premiere for audiences.',
    evidence: [{ kind: 'PROJECT', id: 'night_signal' }],
});
const story: IndustryMediaStory = {
    schemaVersion: 1, id: 'story_c5_campaign', subjectKey: 'project:night_signal', category: 'PROJECT_RELEASE',
    stage: 'CONFIRMED', importance: 'HIGH', primaryIndustryEventId: event.id, industryEventIds: [event.id],
    firstAbsoluteWeek: week, lastAdvancedAbsoluteWeek: week, headline: event.headline, detail: event.detail,
    channelEligibility: ['NEWS', 'X', 'INSTAGRAM', 'YOUTUBE'], publishedChannels: ['NEWS'],
    companyId: player.id, companyName: player.name, projectId: 'night_signal',
};
const fandom: IndustryMediaFandom = {
    schemaVersion: 1, id: 'fandom_night_signal', name: 'Night Signal Premiere Club', handle: '@NightSignal2400',
    bio: 'Fan-run, not official.', primaryColor: '#7C3AED', secondaryColor: '#111827',
    avatar: 'data:image/svg+xml,local', motif: 'EVENT', subjectKey: story.subjectKey, subjectName: 'Night Signal',
    companyId: player.id, projectId: 'night_signal', archetype: 'EVENT', homeRegionId: 'GLOBAL', languageId: 'en',
    size: 25_000, loyalty: 75, activity: 80, coordination: 78, optimism: 70, volatility: 28,
    formedAbsoluteWeek: week - 4, lastActiveAbsoluteWeek: week - 1,
    friendlySubjectKeys: [], rivalSubjectKeys: [], recentCampaignIds: [],
};
player.world.industryEvents = appendIndustryEventFacts(undefined, [event]);
player.world.industryMedia = normalizeIndustryMediaWorld({ stories: [story], fandoms: [fandom] });
const protectedBefore = {
    money: player.money, energy: structuredClone(player.energy), stats: structuredClone(player.stats),
    projects: structuredClone(player.world.projects), youtube: structuredClone(player.youtube),
};

const spark = processIndustryMediaFandoms(player, week);
assert.equal(spark.startedCampaigns.length, 1);
assert.equal(spark.player.world.industryMedia.campaigns.length, 1);
assert.equal(spark.player.world.industryMedia.campaigns[0].stage, 'SPARK');
assert.equal(spark.instaPosts.length, 1);
assert.equal(spark.instaPosts[0].campaignId, spark.startedCampaigns[0].id);
assert.equal(spark.instaPosts[0].fandomId, fandom.id);
assert.equal(spark.instaPosts[0].industryEventId, event.id);
assert.equal(spark.instaPosts[0].mediaStoryId, story.id);

const replay = processIndustryMediaFandoms(spark.player, week);
assert.equal(replay.startedCampaigns.length, 0);
assert.equal(replay.advancedCampaigns.length, 0);
assert.equal(replay.instaPosts.length, 0);
assert.deepEqual(replay.player, spark.player);

const rally = processIndustryMediaFandoms(spark.player, week + 1);
assert.equal(rally.advancedCampaigns[0].stage, 'RALLY');
assert.equal(rally.instaPosts.length, 1);
const peak = processIndustryMediaFandoms(rally.player, week + 2);
assert.equal(peak.advancedCampaigns[0].stage, 'PEAK');
assert.ok(peak.advancedCampaigns[0].outcome);
const aftermath = processIndustryMediaFandoms(peak.player, week + 3);
assert.equal(aftermath.advancedCampaigns[0].stage, 'AFTERMATH');
const closed = processIndustryMediaFandoms(aftermath.player, week + 4);
assert.equal(closed.advancedCampaigns[0].stage, 'CLOSED');
assert.equal(closed.instaPosts.length, 0, 'closing is recorded without flooding another post');
assert.deepEqual({
    money: closed.player.money, energy: closed.player.energy, stats: closed.player.stats,
    projects: closed.player.world.projects, youtube: closed.player.youtube,
}, protectedBefore);

const outcomeBase = { fandom, importance: 'HIGH' as const, performanceRoll: 0.99, creatorLift: 20 };
assert.equal(calculateIndustryMediaCampaignOutcome(outcomeBase), 'BREAKOUT');
assert.equal(calculateIndustryMediaCampaignOutcome({
    ...outcomeBase,
    fandom: { ...fandom, activity: 20, loyalty: 20, coordination: 15, volatility: 20 },
    importance: 'MEDIUM', performanceRoll: 0.05, creatorLift: 0,
}), 'FIZZLED');
assert.equal(calculateIndustryMediaCampaignOutcome({
    ...outcomeBase,
    fandom: { ...fandom, volatility: 95 }, performanceRoll: 0.95,
}), 'MESSY');

console.log('Industry media C5 campaign lifecycle audit passed.');
