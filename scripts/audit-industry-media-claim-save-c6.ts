// @ts-nocheck - executable C6 migration, round-trip, reconciliation, and retention fixtures.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type IndustryMediaClaim, type IndustryMediaStory, type Player } from '../types';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { migratePlayerSave } from '../services/saveMigration';
import { appendIndustryEventFacts, createIndustryEventFact, normalizeIndustryMediaWorld } from '../services/industryWorld';

const legacy = structuredClone(INITIAL_PLAYER) as Player;
legacy.flags.saveMigrationVersion = 38;
legacy.world.industryMedia = undefined;
const migratedLegacy = migratePlayerSave(legacy);
assert.equal(migratedLegacy.flags.saveMigrationVersion, 40);
assert.equal(migratedLegacy.world.industryMedia.schemaVersion, 7);
assert.deepEqual(migratedLegacy.world.industryMedia.claims, []);
assert.deepEqual(migratedLegacy.world.industryMedia.sourceRecords, []);
assert.deepEqual(migratedLegacy.world.industryMedia.processedClaimKeys, []);

const event = createIndustryEventFact({
    idempotencyKey: 'c6:save:event', absoluteWeek: 2_900, type: 'PROJECT_GREENLIT', importance: 'HIGH',
    companyId: 'empire_studios', companyName: 'Empire Studios', projectId: 'night_signal',
    headline: 'Night Signal is greenlit', detail: 'The film entered development.',
    evidence: [{ kind: 'PROJECT', id: 'night_signal' }],
});
const story: IndustryMediaStory = {
    schemaVersion: 1, id: 'story_c6_save', subjectKey: 'project:night_signal', category: 'PROJECT_DEVELOPMENT',
    stage: 'CONFIRMED', importance: 'HIGH', primaryIndustryEventId: event.id, industryEventIds: [event.id],
    firstAbsoluteWeek: 2_900, lastAdvancedAbsoluteWeek: 2_900, headline: event.headline, detail: event.detail,
    channelEligibility: ['NEWS', 'X', 'YOUTUBE'], publishedChannels: ['X'], companyId: 'empire_studios',
    companyName: 'Empire Studios', projectId: 'night_signal',
};
const claim: IndustryMediaClaim = {
    schemaVersion: 1, id: 'claim_c6_save', claimKey: 'c6:save:claim', kind: 'RUMOUR', status: 'OPEN',
    category: 'CASTING', confidence: 'CREDIBLE_CHATTER', subjectKey: story.subjectKey, subjectName: 'Night Signal',
    anchorIndustryEventId: event.id, anchorStoryId: story.id, evidenceEventIds: [event.id],
    institutionId: 'screenline_trade', personalityId: 'mara_voss', publicationChannel: 'X', importance: 'HIGH',
    headline: 'Industry chatter: Night Signal', summary: 'A lead may be circling. The report remains unconfirmed.',
    knownEvidence: 'Confirmed context: the project is greenlit.',
    target: { expectedEventTypes: ['PROJECT_CAST'], projectId: 'night_signal', talentId: 'talent_priya' },
    createdAbsoluteWeek: 2_900, earliestResolutionAbsoluteWeek: 2_901, expiryAbsoluteWeek: 2_912,
    lastEvaluatedAbsoluteWeek: 2_900, playerRelated: true,
};
const player = structuredClone(INITIAL_PLAYER) as Player;
player.flags.saveMigrationVersion = 38;
player.world.industryEvents = appendIndustryEventFacts(undefined, [event]);
player.world.industryMedia = normalizeIndustryMediaWorld({
    stories: [story], claims: [claim], processedClaimKeys: [claim.claimKey],
});
const migrated = migratePlayerSave(player);
assert.equal(migrated.flags.saveMigrationVersion, 40);
assert.equal(migrated.world.industryMedia.claims.length, 1);
assert.deepEqual(migratePlayerSave(structuredClone(migrated)).world.industryMedia, migrated.world.industryMedia);

const malformed = structuredClone(migrated) as Player;
malformed.world.industryMedia.claims.push({
    ...claim, id: 'orphan_claim', claimKey: 'c6:orphan', anchorStoryId: 'missing_story',
    anchorIndustryEventId: 'missing_event', evidenceEventIds: ['missing_event'],
});
malformed.world.industryMedia.claims.push({
    ...claim, id: 'orphan_event_claim', claimKey: 'c6:orphan-event', anchorIndustryEventId: 'missing_event',
    evidenceEventIds: ['missing_event'],
});
const reconciled = migratePlayerSave(malformed);
assert.deepEqual(reconciled.world.industryMedia.claims.map(item => item.id), [claim.id]);

const oversized = structuredClone(migrated) as Player;
oversized.world.industryMedia.claims = Array.from({ length: 230 }, (_, index) => ({
    ...claim,
    id: `claim_history_${index}`,
    claimKey: `c6:history:${index}`,
    status: index < 4 ? 'OPEN' : 'CONFIRMED',
    playerRelated: index % 3 === 0,
    createdAbsoluteWeek: 2_000 + index,
    earliestResolutionAbsoluteWeek: 2_001 + index,
    expiryAbsoluteWeek: 2_012 + index,
    lastEvaluatedAbsoluteWeek: 2_000 + index,
    ...(index < 4 ? { resolution: undefined } : {
        resolution: { status: 'CONFIRMED', absoluteWeek: 2_002 + index, eventIds: [event.id], explanation: 'Confirmed.', sourceReliabilityDelta: 2 },
    }),
}));
const compacted = compactPlayerForPersistence(oversized);
assert.ok(compacted.world.industryMedia.claims.length <= 192);
assert.equal(compacted.world.industryMedia.claims.filter(item => item.status === 'OPEN').length, 4);
assert.ok(compacted.world.industryMedia.claims.some(item => item.playerRelated && item.status !== 'OPEN'));

console.log('Industry media C6 claim save audit passed.');
