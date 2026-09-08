// @ts-nocheck - executable C5 optional player-participation fixture.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type IndustryMediaCampaign, type IndustryMediaFandom, type IndustryMediaStory, type Player } from '../types';
import {
    applyIndustryMediaCampaignParticipation,
    getIndustryMediaCampaignParticipationDraft,
    normalizeIndustryMediaWorld,
} from '../services/industryWorld';

const player = structuredClone(INITIAL_PLAYER) as Player;
player.id = 'empire_studios';
player.name = 'Empire Studios';
player.instagram.followers = 50_000;
player.instagram.fanLoyalty = 55;
player.instagram.controversy = 10;
const week = 2_520;
const story: IndustryMediaStory = {
    schemaVersion: 1, id: 'story_participation', subjectKey: 'project:night_signal', category: 'PROJECT_RELEASE',
    stage: 'CONFIRMED', importance: 'HIGH', primaryIndustryEventId: 'event_participation',
    industryEventIds: ['event_participation'], firstAbsoluteWeek: week - 2, lastAdvancedAbsoluteWeek: week - 1,
    headline: 'Night Signal prepares for release', detail: 'Empire Studios confirmed the Night Signal release campaign.',
    channelEligibility: ['INSTAGRAM', 'X'], publishedChannels: ['INSTAGRAM'], companyId: player.id,
    companyName: player.name, projectId: 'night_signal',
};
const fandom: IndustryMediaFandom = {
    schemaVersion: 1, id: 'fandom_participation', name: 'Night Signal Guard', handle: '@NightSignalGuard',
    bio: 'Fan-run.', primaryColor: '#7C3AED', secondaryColor: '#111827', avatar: 'data:image/svg+xml,local',
    motif: 'PROTECTIVE', subjectKey: story.subjectKey, subjectName: 'Night Signal', companyId: player.id,
    projectId: 'night_signal', archetype: 'PROTECTIVE', homeRegionId: 'GLOBAL', languageId: 'en', size: 40_000,
    loyalty: 70, activity: 72, coordination: 68, optimism: 60, volatility: 86,
    formedAbsoluteWeek: week - 10, lastActiveAbsoluteWeek: week - 1,
    friendlySubjectKeys: [], rivalSubjectKeys: [], recentCampaignIds: ['campaign_participation'],
};
const campaign: IndustryMediaCampaign = {
    schemaVersion: 1, id: 'campaign_participation', campaignKey: 'c5:participation', fandomId: fandom.id,
    industryEventId: 'event_participation', mediaStoryId: story.id, evidenceEventIds: ['event_participation'],
    subjectKey: story.subjectKey, type: 'DEFEND_SUBJECT', hashtag: '#StandWithNightSignal',
    headline: 'Fans rally around Night Signal', purpose: 'Support the project during public discussion.', context: story.detail,
    stage: 'RALLY', startedAbsoluteWeek: week - 1, lastAdvancedAbsoluteWeek: week - 1,
    nextEligibleAbsoluteWeek: week + 1, reach: 60_000, participation: 12_000, coordination: 68,
    sentiment: 20, heat: 78, performanceRoll: 0.8, playerRelated: true, moments: [],
};
player.world.industryMedia = normalizeIndustryMediaWorld({ stories: [story], fandoms: [fandom], campaigns: [campaign] });

const joinDraft = getIndustryMediaCampaignParticipationDraft(campaign, fandom, 'JOIN');
const thanksDraft = getIndustryMediaCampaignParticipationDraft(campaign, fandom, 'THANK');
assert.match(joinDraft.caption, /#StandWithNightSignal/);
assert.match(thanksDraft.caption, /thank/i);
assert.equal(joinDraft.postType, 'ANNOUNCEMENT');

const before = structuredClone(player);
const joined = applyIndustryMediaCampaignParticipation(player, campaign.id, 'JOIN', week);
assert.deepEqual(player, before, 'participation must not mutate its input');
const joinedCampaign = joined.world.industryMedia.campaigns.find(item => item.id === campaign.id);
assert.equal(joinedCampaign.playerParticipation.mode, 'JOIN');
assert.equal(joinedCampaign.playerParticipation.absoluteWeek, week);
assert.ok(joinedCampaign.playerParticipation.followerDelta >= 0 && joinedCampaign.playerParticipation.followerDelta <= 50_000);
assert.ok(joinedCampaign.playerParticipation.fanLoyaltyDelta >= 0 && joinedCampaign.playerParticipation.fanLoyaltyDelta <= 5);
assert.ok(joinedCampaign.playerParticipation.controversyDelta >= 0 && joinedCampaign.playerParticipation.controversyDelta <= 5);
assert.equal(joined.instagram.followers, before.instagram.followers + joinedCampaign.playerParticipation.followerDelta);
assert.equal(joined.instagram.fanLoyalty, before.instagram.fanLoyalty + joinedCampaign.playerParticipation.fanLoyaltyDelta);

const replay = applyIndustryMediaCampaignParticipation(joined, campaign.id, 'THANK', week);
assert.deepEqual(replay, joined, 'a campaign accepts only one player participation');

const closedPlayer = {
    ...before,
    world: { ...before.world, industryMedia: normalizeIndustryMediaWorld({
        ...before.world.industryMedia,
        campaigns: [{ ...campaign, stage: 'CLOSED', terminalAbsoluteWeek: week - 1 }],
    }) },
};
assert.deepEqual(applyIndustryMediaCampaignParticipation(closedPlayer, campaign.id, 'JOIN', week), closedPlayer);
assert.deepEqual(applyIndustryMediaCampaignParticipation(before, 'missing_campaign', 'JOIN', week), before);

for (const protectedKey of ['money', 'energy', 'stats', 'commitments', 'activeReleases', 'businesses', 'youtube']) {
    assert.deepEqual(joined[protectedKey], before[protectedKey], `${protectedKey} must remain isolated`);
}
assert.deepEqual(joined.world.projects, before.world.projects);
assert.deepEqual(joined.world.streamingRightsContracts, before.world.streamingRightsContracts);

console.log('Industry media C5 campaign participation audit passed.');
