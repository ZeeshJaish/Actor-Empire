// @ts-nocheck - executable fixtures intentionally exercise malformed save boundaries.
import assert from 'node:assert/strict';
import {
    INDUSTRY_MEDIA_PUBLISHED_KEY_LIMIT,
    INDUSTRY_MEDIA_STORY_EVENT_LIMIT,
    INDUSTRY_MEDIA_STORY_LIMIT,
    normalizeIndustryMediaWorld,
} from '../services/industryWorld/industryMediaLedger';

const valid = {
    schemaVersion: 1,
    id: 'media_story_release_glass_horizon',
    subjectKey: 'project:project_glass_horizon',
    category: 'PROJECT_RELEASE',
    stage: 'CONFIRMED',
    importance: 'HIGH',
    primaryIndustryEventId: 'event_release',
    industryEventIds: ['event_release'],
    firstAbsoluteWeek: 701,
    lastAdvancedAbsoluteWeek: 701,
    nextEligiblePublicationWeek: 702,
    headline: 'Glass Horizon opens worldwide',
    detail: 'The saved theatrical plan reached audiences.',
    channelEligibility: ['NEWS', 'X'],
    publishedChannels: ['NEWS'],
    projectId: 'project_glass_horizon',
};

const normalized = normalizeIndustryMediaWorld({
    schemaVersion: 999,
    lastProcessedAbsoluteWeek: 701,
    stories: [valid, { ...valid }, null, { ...valid, id: '', industryEventIds: [] }],
    eventStoryIndex: { stale_event: 'missing_story' },
    publishedBeatKeys: ['beat:one', '', 'beat:one'],
});
assert.equal(normalized.schemaVersion, 1);
assert.equal(normalized.lastProcessedAbsoluteWeek, 701);
assert.equal(normalized.stories.length, 1, 'duplicate and malformed stories must not survive normalization');
assert.equal(normalized.eventStoryIndex.event_release, valid.id, 'event index must be rebuilt from retained stories');
assert.equal(normalized.eventStoryIndex.stale_event, undefined, 'stale index references must be discarded');
assert.deepEqual(normalized.publishedBeatKeys, ['beat:one']);

const many = Array.from({ length: INDUSTRY_MEDIA_STORY_LIMIT + 40 }, (_, index) => ({
    ...valid,
    id: `media_story_${index}`,
    subjectKey: `project:project_${index}`,
    primaryIndustryEventId: `event_${index}_0`,
    industryEventIds: Array.from(
        { length: INDUSTRY_MEDIA_STORY_EVENT_LIMIT + 8 },
        (_unused, eventIndex) => `event_${index}_${eventIndex}`,
    ),
    importance: index % 17 === 0 ? 'HIGH' : 'LOW',
    firstAbsoluteWeek: index,
    lastAdvancedAbsoluteWeek: index,
    headline: `Story ${index}`,
    detail: `Canonical development ${index}`,
}));
const bounded = normalizeIndustryMediaWorld({
    stories: many,
    publishedBeatKeys: Array.from(
        { length: INDUSTRY_MEDIA_PUBLISHED_KEY_LIMIT + 25 },
        (_unused, index) => `beat:${index}`,
    ),
});
assert.equal(bounded.stories.length, INDUSTRY_MEDIA_STORY_LIMIT);
assert.ok(
    bounded.stories.some(story => story.id === 'media_story_0'),
    'important history must survive story bounding',
);
assert.ok(
    bounded.stories.some(story => story.id === `media_story_${many.length - 1}`),
    'recent history must survive story bounding',
);
assert.ok(bounded.stories.every(story => story.industryEventIds.length <= INDUSTRY_MEDIA_STORY_EVENT_LIMIT));
assert.equal(bounded.publishedBeatKeys.length, INDUSTRY_MEDIA_PUBLISHED_KEY_LIMIT);
assert.equal(Object.keys(bounded.eventStoryIndex).length,
    bounded.stories.reduce((total, story) => total + story.industryEventIds.length, 0));

const replay = normalizeIndustryMediaWorld(bounded);
assert.deepEqual(replay, bounded, 'normalized media state must be idempotent across reloads');

console.log('Industry media C1 state audit passed.');
