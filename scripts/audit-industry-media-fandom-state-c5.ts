// @ts-nocheck - executable C5 fandom/campaign normalization fixture.
import assert from 'node:assert/strict';
import {
    INDUSTRY_MEDIA_CAMPAIGN_LIMIT,
    INDUSTRY_MEDIA_CAMPAIGN_MOMENT_LIMIT,
    INDUSTRY_MEDIA_FANDOM_LIMIT,
    INDUSTRY_MEDIA_FANDOM_PROCESSED_KEY_LIMIT,
    normalizeIndustryMediaWorld,
} from '../services/industryWorld';
import type { IndustryMediaStory } from '../types';

const story: IndustryMediaStory = {
    schemaVersion: 1,
    id: 'story_c5_state',
    subjectKey: 'project:night_signal',
    category: 'PROJECT_RELEASE',
    stage: 'CONFIRMED',
    importance: 'HIGH',
    primaryIndustryEventId: 'event_c5_state',
    industryEventIds: ['event_c5_state', 'event_c5_followup'],
    firstAbsoluteWeek: 2_000,
    lastAdvancedAbsoluteWeek: 2_001,
    headline: 'Night Signal sets its premiere',
    detail: 'Empire Studios confirmed the Night Signal premiere.',
    channelEligibility: ['NEWS', 'X', 'INSTAGRAM', 'YOUTUBE'],
    publishedChannels: ['NEWS'],
    companyId: 'player',
    companyName: 'Empire Studios',
    projectId: 'night_signal',
};

const fandom = (index: number) => ({
    schemaVersion: 1,
    id: `fandom_${index}`,
    name: `Signal Circle ${index}`,
    handle: `@signalcircle${index}`,
    bio: 'Fans following screen stories together.',
    primaryColor: index === 0 ? 'invalid' : '#7C3AED',
    secondaryColor: '#111827',
    avatar: 'data:image/svg+xml,local',
    motif: 'SIGNAL',
    subjectKey: index === 0 ? story.subjectKey : `project:subject_${index}`,
    subjectName: index === 0 ? 'Night Signal' : `Subject ${index}`,
    companyId: index === 0 ? 'player' : undefined,
    projectId: index === 0 ? 'night_signal' : `subject_${index}`,
    archetype: index === 0 ? 'NOT_REAL' : 'CREATIVE',
    homeRegionId: 'GLOBAL',
    languageId: 'en',
    size: index === 0 ? Number.NaN : 20_000 + index,
    loyalty: 140,
    activity: -20,
    coordination: 160,
    optimism: -5,
    volatility: 120,
    formedAbsoluteWeek: 2_000,
    lastActiveAbsoluteWeek: 2_001,
    friendlySubjectKeys: Array.from({ length: 12 }, (_, item) => `friend:${item}`),
    rivalSubjectKeys: Array.from({ length: 12 }, (_, item) => `rival:${item}`),
    recentCampaignIds: Array.from({ length: 20 }, (_, item) => `campaign_${item}`),
});

const campaign = (index: number) => ({
    schemaVersion: 1,
    id: `campaign_${index}`,
    campaignKey: `campaign-key-${index}`,
    fandomId: 'fandom_0',
    industryEventId: 'event_c5_state',
    mediaStoryId: story.id,
    evidenceEventIds: ['event_c5_state', 'event_c5_followup', 'missing_event'],
    subjectKey: story.subjectKey,
    type: index === 0 ? 'NOT_REAL' : 'COUNTDOWN',
    hashtag: index === 0 ? ' ###Enter the signal!!! ' : `Signal${index}`,
    headline: `Campaign ${index}`,
    purpose: 'Bring the Night Signal audience together.',
    context: story.detail,
    stage: index === 0 ? 'NOT_REAL' : index % 5 === 0 ? 'CLOSED' : 'RALLY',
    startedAbsoluteWeek: 2_000,
    lastAdvancedAbsoluteWeek: 2_001,
    nextEligibleAbsoluteWeek: 2_002,
    reach: -10,
    participation: Number.NaN,
    coordination: 130,
    sentiment: -140,
    heat: 160,
    performanceRoll: 3,
    outcome: index % 5 === 0 ? 'STRONG' : undefined,
    playerRelated: true,
    moments: Array.from({ length: 10 }, (_, momentIndex) => ({
        schemaVersion: 1,
        id: `moment_${index}_${momentIndex}`,
        campaignId: `campaign_${index}`,
        absoluteWeek: 2_000 + momentIndex,
        stage: 'RALLY',
        caption: `Moment ${momentIndex}`,
        reach: 1_000,
        participation: 500,
        sentiment: 20,
        heat: 40,
    })),
});

const normalized = normalizeIndustryMediaWorld({
    schemaVersion: 4,
    stories: [story],
    fandoms: Array.from({ length: 110 }, (_, index) => fandom(index)),
    campaigns: [
        ...Array.from({ length: 170 }, (_, index) => campaign(index)),
        { ...campaign(170), id: 'orphan_fandom', fandomId: 'missing_fandom' },
        { ...campaign(171), id: 'orphan_story', mediaStoryId: 'missing_story' },
        { ...campaign(172), id: 'orphan_event', industryEventId: 'missing_event' },
        { ...campaign(1), id: 'duplicate_key' },
    ],
    processedFandomKeys: Array.from({ length: 700 }, (_, index) => `processed_${index}`),
});

assert.equal(normalized.schemaVersion, 7);
assert.equal(normalized.fandoms.length, INDUSTRY_MEDIA_FANDOM_LIMIT);
assert.equal(normalized.campaigns.length, INDUSTRY_MEDIA_CAMPAIGN_LIMIT);
assert.equal(normalized.processedFandomKeys.length, INDUSTRY_MEDIA_FANDOM_PROCESSED_KEY_LIMIT);
assert.equal(new Set(normalized.fandoms.map(item => item.id)).size, normalized.fandoms.length);
assert.equal(new Set(normalized.campaigns.map(item => item.campaignKey)).size, normalized.campaigns.length);
assert.ok(normalized.campaigns.every(item => normalized.fandoms.some(fandomItem => fandomItem.id === item.fandomId)));
assert.ok(normalized.campaigns.every(item => item.mediaStoryId === story.id));
assert.ok(normalized.campaigns.every(item => story.industryEventIds.includes(item.industryEventId)));
assert.ok(normalized.campaigns.every(item => item.moments.length <= INDUSTRY_MEDIA_CAMPAIGN_MOMENT_LIMIT));

const repairedFandom = normalized.fandoms.find(item => item.id === 'fandom_0');
assert.ok(repairedFandom);
assert.equal(repairedFandom.archetype, 'CREATIVE');
assert.equal(repairedFandom.primaryColor, '#7C3AED');
assert.equal(repairedFandom.size, 0);
assert.equal(repairedFandom.loyalty, 100);
assert.equal(repairedFandom.activity, 0);
assert.equal(repairedFandom.friendlySubjectKeys.length, 8);
assert.ok(repairedFandom.recentCampaignIds.length <= 12);
assert.ok(repairedFandom.recentCampaignIds.every(id => normalized.campaigns.some(item => item.id === id)));

const repairedCampaign = normalized.campaigns.find(item => item.id === 'campaign_0');
assert.ok(repairedCampaign);
assert.equal(repairedCampaign.type, 'COUNTDOWN');
assert.equal(repairedCampaign.stage, 'SPARK');
assert.equal(repairedCampaign.hashtag, '#EnterTheSignal');
assert.equal(repairedCampaign.reach, 0);
assert.equal(repairedCampaign.participation, 0);
assert.equal(repairedCampaign.coordination, 100);
assert.equal(repairedCampaign.sentiment, -100);
assert.equal(repairedCampaign.heat, 100);
assert.equal(repairedCampaign.performanceRoll, 1);

console.log('Industry media C5 fandom state audit passed.');
