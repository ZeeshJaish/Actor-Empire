// @ts-nocheck - executable C4 saved-state, normalization, and bounds fixtures.
import assert from 'node:assert/strict';
import {
    INDUSTRY_MEDIA_CREATOR_CHANNEL_LIMIT,
    INDUSTRY_MEDIA_YOUTUBE_PROCESSED_KEY_LIMIT,
    INDUSTRY_MEDIA_YOUTUBE_VIDEO_LIMIT,
    normalizeIndustryMediaWorld,
} from '../services/industryWorld';
import type { IndustryMediaStory } from '../types';

const story: IndustryMediaStory = {
    schemaVersion: 1,
    id: 'story_c4_state',
    subjectKey: 'project:night_signal',
    category: 'FRANCHISE',
    stage: 'CONFIRMED',
    importance: 'HIGH',
    primaryIndustryEventId: 'event_c4_state',
    industryEventIds: ['event_c4_state', 'event_c4_followup'],
    firstAbsoluteWeek: 1_000,
    lastAdvancedAbsoluteWeek: 1_001,
    headline: 'Empire Studios opens the Night Signal universe',
    detail: 'The studio confirmed that Night Signal belongs to a connected universe.',
    channelEligibility: ['NEWS', 'X', 'YOUTUBE'],
    publishedChannels: ['NEWS', 'X'],
    companyId: 'player',
    companyName: 'Empire Studios',
    projectId: 'night_signal',
};

const base = normalizeIndustryMediaWorld({ stories: [story] });
const personality = base.personalities.find(item => item.role === 'THEORY_CREATOR');
assert.ok(personality, 'C2 must seed a theory creator for C4');

const video = (index: number) => ({
    schemaVersion: 1,
    id: `industry_video_${index.toString().padStart(3, '0')}`,
    publicationKey: `youtube:story_c4_state:${index}`,
    industryEventId: 'event_c4_state',
    mediaStoryId: story.id,
    evidenceEventIds: ['event_c4_state', 'event_c4_followup', 'event_c4_state'],
    personalityId: personality.id,
    institutionId: personality.institutionId,
    format: 'THEORY',
    claimMode: 'SPECULATION',
    title: `Night Signal Theory ${index}`,
    summary: 'A fact-grounded look at what the confirmed universe could mean.',
    confirmedFacts: story.detail,
    interpretation: 'Theory: this could establish another connected project.',
    thumbnail: {
        primaryColor: '#6D28D9',
        secondaryColor: '#111827',
        label: 'THEORY',
        motif: 'SIGNAL',
    },
    subjectKey: story.subjectKey,
    companyId: story.companyId,
    projectId: story.projectId,
    importance: story.importance,
    publishedAbsoluteWeek: 1_000 + index,
    lastPerformanceAbsoluteWeek: 1_000 + index,
    views: 25_000 + index,
    likes: 2_000,
    comments: Array.from({ length: 12 }, (_, commentIndex) => `Comment ${commentIndex}`),
    outcome: 'NORMAL',
    subscriberDelta: 250,
    estimatedRevenue: 1_250,
});

const channels = Array.from({ length: 90 }, (_, index) => ({
    schemaVersion: 1,
    id: `industry_creator_channel_${index.toString().padStart(3, '0')}`,
    personalityId: index === 0 ? personality.id : `personality_${index}`,
    subscribers: index === 0 ? Number.NaN : 10_000 + index,
    totalViews: 100_000 + index,
    credibility: 200,
    momentum: -20,
    sponsorAppeal: 140,
    estimatedLifetimeRevenue: 12_000,
    uploadCount: 5,
    hitCount: 2,
    flopCount: 1,
    lastUploadAbsoluteWeek: 1_000,
    recentVideoIds: ['missing_video', ...Array.from({ length: 30 }, (_, videoIndex) => `industry_video_${videoIndex.toString().padStart(3, '0')}`)],
}));

const normalized = normalizeIndustryMediaWorld({
    ...base,
    schemaVersion: 3,
    creatorChannels: channels,
    youtubeVideos: [
        ...Array.from({ length: 170 }, (_, index) => video(index)),
        { ...video(170), id: 'orphan_story', mediaStoryId: 'missing_story' },
        { ...video(171), id: 'orphan_event', industryEventId: 'missing_event' },
        { ...video(172), id: 'duplicate_video' },
        { ...video(172), id: 'duplicate_video', title: 'Duplicate must be removed' },
    ],
    processedYoutubeKeys: Array.from({ length: 700 }, (_, index) => `youtube_key_${index}`),
});

assert.equal(normalized.schemaVersion, 7);
assert.equal(normalized.youtubeVideos.length, INDUSTRY_MEDIA_YOUTUBE_VIDEO_LIMIT);
assert.ok(normalized.creatorChannels.length <= INDUSTRY_MEDIA_CREATOR_CHANNEL_LIMIT);
assert.ok(normalized.creatorChannels.every(item => normalized.personalities.some(personalityItem => personalityItem.id === item.personalityId)),
    'orphan creator channels must be removed');
assert.equal(normalized.processedYoutubeKeys.length, INDUSTRY_MEDIA_YOUTUBE_PROCESSED_KEY_LIMIT);
assert.equal(new Set(normalized.youtubeVideos.map(item => item.id)).size, normalized.youtubeVideos.length);
assert.ok(normalized.youtubeVideos.every(item => item.mediaStoryId === story.id));
assert.ok(normalized.youtubeVideos.every(item => story.industryEventIds.includes(item.industryEventId)));
assert.ok(normalized.youtubeVideos.every(item => item.evidenceEventIds.length <= 12));
assert.ok(normalized.youtubeVideos.every(item => item.comments.length <= 8));

const repaired = normalized.creatorChannels.find(item => item.personalityId === personality.id);
assert.ok(repaired);
assert.equal(repaired.subscribers, 0, 'non-finite counters must normalize safely');
assert.equal(repaired.credibility, 100);
assert.equal(repaired.momentum, 0);
assert.equal(repaired.sponsorAppeal, 100);
assert.ok(repaired.recentVideoIds.length <= 16);
assert.ok(repaired.recentVideoIds.every(id => normalized.youtubeVideos.some(videoItem => videoItem.id === id)));

console.log('Industry media C4 YouTube state audit passed.');
