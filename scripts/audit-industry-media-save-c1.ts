// @ts-nocheck - executable migration and malformed-save fixtures.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { migratePlayerSave } from '../services/saveMigration';
import {
    INDUSTRY_MEDIA_PUBLISHED_KEY_LIMIT,
    INDUSTRY_MEDIA_STORY_LIMIT,
} from '../services/industryWorld/industryMediaLedger';
import {
    appendIndustryEventFacts,
    createIndustryEventFact,
    projectIndustryEvents,
} from '../services/industryWorld';

const legacy = structuredClone(INITIAL_PLAYER) as Player;
legacy.id = 'c1_legacy_player';
legacy.flags.saveMigrationVersion = 33;
delete legacy.world.industryMedia;
const migrated = migratePlayerSave(legacy);
assert.equal(migrated.flags.saveMigrationVersion, 34);
assert.equal(migrated.world.industryMedia?.schemaVersion, 1);
assert.deepEqual(migrated.world.industryMedia?.stories, []);

const publishedEvent = createIndustryEventFact({
    idempotencyKey: 'c1:migration:already-published',
    absoluteWeek: 1_200,
    type: 'PROJECT_RELEASED',
    importance: 'HIGH',
    projectId: 'project_already_published',
    headline: 'An older release was already covered',
    detail: 'This fact existed before C1 and its B7 publication was already evaluated.',
    evidence: [{ kind: 'PROJECT', id: 'project_already_published' }],
});
legacy.world.industryEvents = appendIndustryEventFacts(undefined, [publishedEvent]);
legacy.world.industryEvents.publishedEventKeys = [
    `news:${publishedEvent.id}`,
    `x:${publishedEvent.id}`,
    `evaluated:${publishedEvent.id}`,
];
const migratedPublished = migratePlayerSave(legacy);
const noRepost = projectIndustryEvents(
    migratedPublished,
    migratedPublished.world.industryEvents,
    1_300,
    migratedPublished.world.industryMedia,
);
assert.equal(noRepost.news.length + noRepost.xPosts.length + noRepost.instaPosts.length, 0,
    'migration must not repost already evaluated B7 coverage');

const oversized = structuredClone(INITIAL_PLAYER) as Player;
oversized.id = 'c1_oversized_player';
const canonicalSaveEvents = Array.from(
    { length: INDUSTRY_MEDIA_STORY_LIMIT + 60 },
    (_unused, index) => createIndustryEventFact({
        idempotencyKey: `c1:save:event:${index}`,
        absoluteWeek: index,
        type: 'PROJECT_RELEASED',
        importance: index % 19 === 0 ? 'HIGH' : 'MEDIUM',
        projectId: `save_project_${index}`,
        headline: `Saved media story ${index}`,
        detail: `Canonical saved development ${index}`,
        evidence: [{ kind: 'PROJECT', id: `save_project_${index}` }],
    }),
);
oversized.world.industryEvents = appendIndustryEventFacts(undefined, canonicalSaveEvents);
oversized.world.industryMedia = {
    schemaVersion: 999,
    lastProcessedAbsoluteWeek: 9_999,
    stories: canonicalSaveEvents.map((event, index) => ({
        schemaVersion: 1,
        id: `media_story_save_${index}`,
        subjectKey: `project:save_project_${index}`,
        category: 'PROJECT_RELEASE',
        stage: index % 5 === 0 ? 'RESOLVED' : 'CONFIRMED',
        importance: index % 19 === 0 ? 'HIGH' : 'MEDIUM',
        primaryIndustryEventId: event.id,
        industryEventIds: [event.id],
        firstAbsoluteWeek: index,
        lastAdvancedAbsoluteWeek: index,
        headline: `Saved media story ${index}`,
        detail: `Canonical saved development ${index}`,
        channelEligibility: ['NEWS', 'X'],
        publishedChannels: ['NEWS'],
        projectId: `save_project_${index}`,
    })).concat([{
        schemaVersion: 1,
        id: 'media_story_ghost',
        subjectKey: 'project:ghost_project',
        category: 'PROJECT_RELEASE',
        stage: 'CONFIRMED',
        importance: 'HIGH',
        primaryIndustryEventId: 'missing_canonical_event',
        industryEventIds: ['missing_canonical_event'],
        firstAbsoluteWeek: 10_000,
        lastAdvancedAbsoluteWeek: 10_000,
        headline: 'This story has no canonical event',
        detail: 'Compaction must remove this invalid reference.',
        channelEligibility: ['NEWS', 'X'],
        publishedChannels: [],
        projectId: 'ghost_project',
    }]),
    eventStoryIndex: { corrupt: 'missing_story' },
    publishedBeatKeys: Array.from(
        { length: INDUSTRY_MEDIA_PUBLISHED_KEY_LIMIT + 80 },
        (_unused, index) => `save_beat_${index}`,
    ),
};
const compacted = compactPlayerForPersistence(oversized);
assert.equal(compacted.world.industryMedia?.schemaVersion, 1);
assert.equal(compacted.world.industryMedia?.stories.length, INDUSTRY_MEDIA_STORY_LIMIT);
assert.equal(compacted.world.industryMedia?.publishedBeatKeys.length, INDUSTRY_MEDIA_PUBLISHED_KEY_LIMIT);
assert.equal(new Set(compacted.world.industryMedia?.stories.map(story => story.id)).size,
    compacted.world.industryMedia?.stories.length);
assert.equal(compacted.world.industryMedia?.stories.some(story => story.id === 'media_story_ghost'), false,
    'compaction must discard stories with no retained canonical evidence');
assert.equal(compacted.world.industryMedia?.eventStoryIndex.corrupt, undefined);
const retainedCanonicalEventIds = new Set(
    compacted.world.industryEvents?.events.map(event => event.id) || [],
);
assert.ok(compacted.world.industryMedia?.stories.every(story => (
    story.industryEventIds.every(eventId => retainedCanonicalEventIds.has(eventId))
)), 'every compacted story reference must resolve in the retained canonical ledger');

console.log('Industry media C1 save audit passed.');
