// @ts-nocheck - executable legacy and malformed-save fixtures.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { migratePlayerSave } from '../services/saveMigration';
import {
    appendIndustryEventFacts,
    createIndustryEventFact,
    projectIndustryEvents,
} from '../services/industryWorld';

const publishedEvent = createIndustryEventFact({
    idempotencyKey: 'c2:migration:already-published',
    absoluteWeek: 2_400,
    type: 'PROJECT_RELEASED',
    importance: 'HIGH',
    projectId: 'project_c2_published',
    headline: 'Empire Studios released a completed film',
    detail: 'The release was already covered before the save upgrade.',
    evidence: [{ kind: 'PROJECT', id: 'project_c2_published' }],
});

const legacy = structuredClone(INITIAL_PLAYER) as Player;
legacy.id = 'c2_legacy_player';
legacy.currentWeek = 24;
legacy.flags.saveMigrationVersion = 34;
legacy.news = [{
    id: 'legacy_news_c2',
    headline: publishedEvent.headline,
    subtext: publishedEvent.detail,
    category: 'TOP_STORY',
    week: 24,
    year: legacy.age,
    impactLevel: 'HIGH',
    industryEventId: publishedEvent.id,
    mediaStoryId: 'legacy_media_story_c2',
}];
legacy.x.feed = [{
    id: 'legacy_x_c2',
    authorId: 'industry_desk',
    authorName: 'Industry Desk',
    authorHandle: '@industrydesk',
    authorAvatar: '',
    content: publishedEvent.headline,
    timestamp: 24,
    likes: 1_000,
    retweets: 100,
    replies: 50,
    isPlayer: false,
    isLiked: false,
    isRetweeted: false,
    isVerified: true,
    industryEventId: publishedEvent.id,
    mediaStoryId: 'legacy_media_story_c2',
}];
legacy.instagram.feed = [];
legacy.world.industryEvents = appendIndustryEventFacts(undefined, [publishedEvent]);
legacy.world.industryEvents.publishedEventKeys = [
    `news:${publishedEvent.id}`,
    `x:${publishedEvent.id}`,
    `evaluated:${publishedEvent.id}`,
];
legacy.world.industryMedia = {
    schemaVersion: 1,
    lastProcessedAbsoluteWeek: 2_400,
    stories: [{
        schemaVersion: 1,
        id: 'legacy_media_story_c2',
        subjectKey: 'project:project_c2_published',
        category: 'PROJECT_RELEASE',
        stage: 'CONFIRMED',
        importance: 'HIGH',
        primaryIndustryEventId: publishedEvent.id,
        industryEventIds: [publishedEvent.id],
        firstAbsoluteWeek: 2_400,
        lastAdvancedAbsoluteWeek: 2_400,
        headline: publishedEvent.headline,
        detail: publishedEvent.detail,
        channelEligibility: ['NEWS', 'X'],
        publishedChannels: ['NEWS', 'X'],
        projectId: 'project_c2_published',
    }],
    eventStoryIndex: { [publishedEvent.id]: 'legacy_media_story_c2' },
    publishedBeatKeys: [
        `legacy_media_story_c2:NEWS:IMMEDIATE`,
        `legacy_media_story_c2:X:IMMEDIATE`,
    ],
};

const migrated = migratePlayerSave(legacy);
assert.equal(migrated.flags.saveMigrationVersion, 40);
assert.equal(migrated.world.industryMedia?.schemaVersion, 7);
assert.ok((migrated.world.industryMedia?.institutions.length || 0) >= 8);
assert.ok((migrated.world.industryMedia?.personalities.length || 0) >= 10);
assert.equal(migrated.news.length, 1, 'migration must preserve existing News feed entries');
assert.equal(migrated.x.feed.length, 1, 'migration must preserve existing X feed entries');

const noRepost = projectIndustryEvents(
    migrated,
    migrated.world.industryEvents,
    2_401,
    migrated.world.industryMedia,
);
assert.equal(noRepost.news.length + noRepost.xPosts.length + noRepost.instaPosts.length, 0,
    'C2 migration must not replay already-evaluated C1 coverage');

const malformed = structuredClone(migrated) as Player;
malformed.world.industryMedia!.storyAssignments = [{
    id: 'assignment_orphan',
    storyId: 'story_that_does_not_exist',
    industryEventId: 'event_that_does_not_exist',
    channel: 'NEWS',
    institutionId: malformed.world.industryMedia!.institutions[0].id,
    personalityId: malformed.world.industryMedia!.personalities[0].id,
    angle: 'FACT',
    assignedAbsoluteWeek: 2_400,
    lastUsedAbsoluteWeek: 2_400,
}];
malformed.world.industryMedia!.personalities[0].recentStoryIds = [
    'legacy_media_story_c2',
    'story_that_does_not_exist',
];

const compacted = compactPlayerForPersistence(malformed);
assert.deepEqual(compacted.world.industryMedia?.storyAssignments, [],
    'compaction must discard assignments whose canonical story or event was removed');
assert.deepEqual(compacted.world.industryMedia?.personalities[0].recentStoryIds, ['legacy_media_story_c2'],
    'compaction must discard stale recent-story references without erasing valid memory');
assert.equal(compacted.news.length, 1);
assert.equal(compacted.x.feed.length, 1);

console.log('Industry media C2 save audit passed.');
