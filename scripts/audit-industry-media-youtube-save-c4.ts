// @ts-nocheck - executable C4 migration, round-trip, and orphan-cleanup fixtures.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type IndustryMediaStory, type Player } from '../types';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { migratePlayerSave } from '../services/saveMigration';
import {
    appendIndustryEventFacts,
    createIndustryEventFact,
    normalizeIndustryMediaWorld,
    processIndustryMediaYoutube,
} from '../services/industryWorld';

const blankLegacy = structuredClone(INITIAL_PLAYER) as Player;
blankLegacy.flags.saveMigrationVersion = 36;
blankLegacy.world.industryMedia = undefined;
const blankMigrated = migratePlayerSave(blankLegacy);
assert.equal(blankMigrated.flags.saveMigrationVersion, 40);

const player = structuredClone(INITIAL_PLAYER) as Player;
player.id = 'c4_save_player';
player.age = 44;
player.currentWeek = 7;
player.flags.saveMigrationVersion = 36;
const absoluteWeek = player.age * 52 + player.currentWeek;
const event = createIndustryEventFact({
    idempotencyKey: 'c4:save', absoluteWeek, type: 'PROJECT_RELEASED', importance: 'HIGH',
    companyId: player.id, companyName: 'Empire Studios', projectId: 'c4_save_project',
    headline: 'Empire Studios releases Archive Signal',
    detail: 'The completed Archive Signal project has been released.',
    evidence: [{ kind: 'PROJECT', id: 'c4_save_project' }],
});
const story: IndustryMediaStory = {
    schemaVersion: 1, id: 'story_c4_save', subjectKey: 'project:c4_save_project', category: 'PROJECT_RELEASE',
    stage: 'CONFIRMED', importance: 'HIGH', primaryIndustryEventId: event.id, industryEventIds: [event.id],
    firstAbsoluteWeek: absoluteWeek, lastAdvancedAbsoluteWeek: absoluteWeek, headline: event.headline,
    detail: event.detail, channelEligibility: ['YOUTUBE'], publishedChannels: [], companyId: player.id,
    companyName: 'Empire Studios', projectId: 'c4_save_project',
};
player.world.industryEvents = appendIndustryEventFacts(undefined, [event]);
player.world.industryMedia = normalizeIndustryMediaWorld({ stories: [story] });
const published = processIndustryMediaYoutube(player, absoluteWeek).player;
const migrated = migratePlayerSave(published);
assert.equal(migrated.flags.saveMigrationVersion, 40);
assert.equal(migrated.world.industryMedia?.schemaVersion, 7);
assert.equal(migrated.world.industryMedia?.youtubeVideos.length, 1);
assert.equal(migrated.world.industryMedia?.creatorChannels.length, 1);
assert.equal(migrated.world.industryMedia?.processedYoutubeKeys.length, 1);
assert.deepEqual(migratePlayerSave(structuredClone(migrated)).world.industryMedia, migrated.world.industryMedia,
    'schema-5 saves must round-trip exactly');

const malformed = structuredClone(migrated) as Player;
malformed.world.industryMedia!.youtubeVideos.push({
    ...malformed.world.industryMedia!.youtubeVideos[0],
    id: 'orphan_c4_video',
    publicationKey: 'youtube:orphan',
    mediaStoryId: 'missing_story',
});
malformed.world.industryMedia!.creatorChannels[0].recentVideoIds.push('orphan_c4_video', 'missing_video');
const compacted = compactPlayerForPersistence(malformed);
assert.equal(compacted.world.industryMedia?.youtubeVideos.length, 1);
assert.deepEqual(
    compacted.world.industryMedia?.creatorChannels[0].recentVideoIds,
    [compacted.world.industryMedia?.youtubeVideos[0].id],
);

const c3Legacy = structuredClone(INITIAL_PLAYER) as Player;
c3Legacy.flags.saveMigrationVersion = 36;
c3Legacy.world.industryEvents = appendIndustryEventFacts(undefined, [event]);
c3Legacy.world.industryMedia = {
    ...normalizeIndustryMediaWorld({ stories: [story] }),
    schemaVersion: 3,
    creatorChannels: undefined,
    youtubeVideos: undefined,
    processedYoutubeKeys: undefined,
};
const c3Migrated = migratePlayerSave(c3Legacy);
assert.equal(c3Migrated.world.industryMedia?.schemaVersion, 7);
assert.deepEqual(c3Migrated.world.industryMedia?.creatorChannels, []);
assert.deepEqual(c3Migrated.world.industryMedia?.youtubeVideos, []);
assert.deepEqual(c3Migrated.world.industryMedia?.processedYoutubeKeys, []);

console.log('Industry media C4 YouTube save audit passed.');
