// @ts-nocheck - executable C5 migration, round-trip, and orphan-cleanup fixtures.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type IndustryMediaCampaign, type IndustryMediaFandom, type IndustryMediaStory, type Player } from '../types';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { migratePlayerSave } from '../services/saveMigration';
import { appendIndustryEventFacts, createIndustryEventFact, normalizeIndustryMediaWorld } from '../services/industryWorld';

const blankLegacy = structuredClone(INITIAL_PLAYER) as Player;
blankLegacy.flags.saveMigrationVersion = 37;
blankLegacy.world.industryMedia = undefined;
const blankMigrated = migratePlayerSave(blankLegacy);
assert.equal(blankMigrated.flags.saveMigrationVersion, 40);
assert.equal(blankMigrated.world.industryMedia.schemaVersion, 7);
assert.deepEqual(blankMigrated.world.industryMedia.fandoms, []);
assert.deepEqual(blankMigrated.world.industryMedia.campaigns, []);

const story: IndustryMediaStory = {
    schemaVersion: 1, id: 'story_c5_save', subjectKey: 'project:night_signal', category: 'PROJECT_RELEASE',
    stage: 'CONFIRMED', importance: 'HIGH', primaryIndustryEventId: 'event_c5_save', industryEventIds: ['event_c5_save'],
    firstAbsoluteWeek: 2_200, lastAdvancedAbsoluteWeek: 2_200, headline: 'Night Signal arrives', detail: 'A release is confirmed.',
    channelEligibility: ['INSTAGRAM'], publishedChannels: ['INSTAGRAM'], companyId: 'empire_studios', projectId: 'night_signal',
};
const fandom: IndustryMediaFandom = {
    schemaVersion: 1, id: 'fandom_c5_save', name: 'Night Signal Guard', handle: '@NightSignalGuard', bio: 'Fan-run.',
    primaryColor: '#7C3AED', secondaryColor: '#111827', avatar: 'data:image/svg+xml,local', motif: 'PROTECTIVE',
    subjectKey: story.subjectKey, subjectName: 'Night Signal', companyId: 'empire_studios', projectId: 'night_signal',
    archetype: 'PROTECTIVE', homeRegionId: 'GLOBAL', languageId: 'en', size: 40_000, loyalty: 70, activity: 72,
    coordination: 68, optimism: 62, volatility: 45, formedAbsoluteWeek: 2_180, lastActiveAbsoluteWeek: 2_200,
    friendlySubjectKeys: [], rivalSubjectKeys: [], recentCampaignIds: ['campaign_c5_save'],
};
const campaign: IndustryMediaCampaign = {
    schemaVersion: 1, id: 'campaign_c5_save', campaignKey: 'c5:save', fandomId: fandom.id,
    industryEventId: 'event_c5_save', mediaStoryId: story.id, evidenceEventIds: ['event_c5_save'], subjectKey: story.subjectKey,
    type: 'COUNTDOWN', hashtag: '#NightSignalWeek', headline: 'The countdown begins', purpose: 'Bring fans together.',
    context: story.detail, stage: 'RALLY', startedAbsoluteWeek: 2_200, lastAdvancedAbsoluteWeek: 2_201,
    nextEligibleAbsoluteWeek: 2_202, reach: 80_000, participation: 12_000, coordination: 68, sentiment: 20, heat: 70,
    performanceRoll: 0.7, playerRelated: true, moments: [],
};
const event = createIndustryEventFact({
    idempotencyKey: 'c5:save:event', absoluteWeek: 2_200, type: 'PROJECT_RELEASE_PLANNED', importance: 'HIGH',
    companyId: 'empire_studios', companyName: 'Empire Studios', projectId: 'night_signal',
    headline: story.headline, detail: story.detail, evidence: [{ kind: 'PROJECT', id: 'night_signal' }],
});
story.primaryIndustryEventId = event.id;
story.industryEventIds = [event.id];
campaign.industryEventId = event.id;
campaign.evidenceEventIds = [event.id];
const player = structuredClone(INITIAL_PLAYER) as Player;
player.flags.saveMigrationVersion = 37;
player.world.industryEvents = appendIndustryEventFacts(undefined, [event]);
player.world.industryMedia = normalizeIndustryMediaWorld({ stories: [story], fandoms: [fandom], campaigns: [campaign] });
const migrated = migratePlayerSave(player);
assert.equal(migrated.flags.saveMigrationVersion, 40);
assert.equal(migrated.world.industryMedia.schemaVersion, 7);
assert.equal(migrated.world.industryMedia.fandoms.length, 1);
assert.equal(migrated.world.industryMedia.campaigns.length, 1);
assert.deepEqual(migratePlayerSave(structuredClone(migrated)).world.industryMedia, migrated.world.industryMedia);

const malformed = structuredClone(migrated) as Player;
malformed.world.industryMedia.campaigns.push({ ...campaign, id: 'orphan_campaign', campaignKey: 'orphan', fandomId: 'missing_fandom' });
malformed.world.industryMedia.fandoms[0].recentCampaignIds.push('orphan_campaign', 'missing_campaign');
const compacted = compactPlayerForPersistence(malformed);
assert.equal(compacted.world.industryMedia.campaigns.length, 1);
assert.deepEqual(compacted.world.industryMedia.fandoms[0].recentCampaignIds, [campaign.id]);

const c4Legacy = structuredClone(INITIAL_PLAYER) as Player;
c4Legacy.flags.saveMigrationVersion = 37;
c4Legacy.world.industryEvents = appendIndustryEventFacts(undefined, [event]);
c4Legacy.world.industryMedia = {
    ...normalizeIndustryMediaWorld({ stories: [story] }), schemaVersion: 4,
    fandoms: undefined, campaigns: undefined, processedFandomKeys: undefined,
};
const c4Migrated = migratePlayerSave(c4Legacy);
assert.equal(c4Migrated.world.industryMedia.schemaVersion, 7);
assert.deepEqual(c4Migrated.world.industryMedia.fandoms, []);
assert.deepEqual(c4Migrated.world.industryMedia.campaigns, []);
assert.deepEqual(c4Migrated.world.industryMedia.processedFandomKeys, []);

console.log('Industry media C5 fandom save audit passed.');
