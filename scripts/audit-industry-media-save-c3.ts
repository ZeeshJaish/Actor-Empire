// @ts-nocheck - executable C3 migration and compaction fixtures.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type IndustryMediaStory, type Player } from '../types';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { migratePlayerSave } from '../services/saveMigration';
import { appendIndustryEventFacts, createIndustryEventFact, normalizeIndustryMediaWorld } from '../services/industryWorld';

const event = createIndustryEventFact({
    idempotencyKey: 'c3:save', absoluteWeek: 1_200, type: 'PROJECT_RELEASED', importance: 'HIGH',
    companyId: 'player_c3', companyName: 'Empire Studios', projectId: 'project_c3_save',
    headline: 'Empire Studios releases Night Signal', detail: 'The completed project has been released.',
    evidence: [{ kind: 'PROJECT', id: 'project_c3_save' }],
});
const story: IndustryMediaStory = {
    schemaVersion: 1, id: 'story_c3_save', subjectKey: 'project:project_c3_save', category: 'PROJECT_RELEASE',
    stage: 'CONFIRMED', importance: 'HIGH', primaryIndustryEventId: event.id, industryEventIds: [event.id],
    firstAbsoluteWeek: 1_200, lastAdvancedAbsoluteWeek: 1_200, headline: event.headline, detail: event.detail,
    channelEligibility: ['NEWS', 'X'], publishedChannels: ['NEWS', 'X'], companyId: 'player_c3',
    companyName: 'Empire Studios', projectId: 'project_c3_save',
};
const legacyMedia = normalizeIndustryMediaWorld({ stories: [story], eventStoryIndex: { [event.id]: story.id } });
const legacy = structuredClone(INITIAL_PLAYER) as Player;
legacy.id = 'player_c3';
legacy.flags.saveMigrationVersion = 35;
legacy.world.industryEvents = appendIndustryEventFacts(undefined, [event]);
legacy.world.industryMedia = {
    ...legacyMedia,
    schemaVersion: 2,
    discussions: undefined,
    playerResponses: undefined,
    processedDiscussionKeys: undefined,
    processedResponseKeys: undefined,
};
legacy.x.feed = [{
    id: `x_${event.id}`, authorId: 'industry_desk', authorName: 'Industry Desk', authorHandle: '@industrydesk',
    authorAvatar: '', content: event.headline, timestamp: 12, likes: 100, retweets: 20, replies: 10,
    isPlayer: false, isLiked: false, isRetweeted: false, isVerified: true, industryEventId: event.id,
    mediaStoryId: story.id,
}];

const migrated = migratePlayerSave(legacy);
assert.equal(migrated.flags.saveMigrationVersion, 40);
assert.equal(migrated.world.industryMedia?.schemaVersion, 7);
assert.deepEqual(migrated.world.industryMedia?.discussions, []);
assert.deepEqual(migrated.world.industryMedia?.playerResponses, []);
assert.deepEqual(migrated.world.industryMedia?.processedDiscussionKeys, []);
assert.deepEqual(migrated.world.industryMedia?.processedResponseKeys, []);
assert.equal(migrated.x.feed.length, 1, 'migration must preserve C2-era X feed entries');
assert.equal(migrated.x.feed[0].mediaDiscussionId, undefined, 'migration must not invent historical discussions');

const malformed = structuredClone(migrated) as Player;
malformed.world.industryMedia!.discussions = [{
    schemaVersion: 1, id: 'orphan_discussion', industryEventId: event.id, mediaStoryId: 'missing_story',
    sourcePostId: 'x_missing', openedAbsoluteWeek: 1_200, lastActivityAbsoluteWeek: 1_200,
    responseClosesAbsoluteWeek: 1_202, status: 'OPEN', isPlayerRelated: true, heat: 50, turns: [],
}];
malformed.world.industryMedia!.playerResponses = [{
    schemaVersion: 1, id: 'orphan_response', discussionId: 'orphan_discussion', industryEventId: event.id,
    mediaStoryId: 'missing_story', sourcePostId: 'x_missing', publishedPostId: 'x_response', tone: 'CLARIFY',
    format: 'REPLY', speaker: 'PERSONAL', content: 'Response.', submittedAbsoluteWeek: 1_200,
    resolvesAbsoluteWeek: 1_201, status: 'PENDING',
}];
const compacted = compactPlayerForPersistence(malformed);
assert.deepEqual(compacted.world.industryMedia?.discussions, []);
assert.deepEqual(compacted.world.industryMedia?.playerResponses, []);
assert.equal(compacted.world.industryMedia?.stories.length, 1);
assert.equal(compacted.x.feed.length, 1);

console.log('Industry media C3 save audit passed.');
