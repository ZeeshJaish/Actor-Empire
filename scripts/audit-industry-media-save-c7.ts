// @ts-nocheck - executable C7 save migration and reconciliation fixture.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { normalizeIndustryMediaWorld } from '../services/industryWorld';

const base = normalizeIndustryMediaWorld(undefined);
const personality = base.personalities.find(item => item.id === 'gideon_price');
const raw = structuredClone(INITIAL_PLAYER);
raw.flags.saveMigrationVersion = 39;
raw.world.industryMedia = {
    ...base,
    schemaVersion: 6,
    narratives: [], mediaRelationships: [], prInterventions: [], promotionAttributions: [], processedC7Keys: [],
};
const migrated = migratePlayerSave(raw);
assert.equal(migrated.flags.saveMigrationVersion, 40);
assert.equal(migrated.world.industryMedia.schemaVersion, 7);
assert.deepEqual(migrated.world.industryMedia.narratives, []);
assert.deepEqual(migrated.world.industryMedia.mediaRelationships, []);
assert.ok(migrated.world.industryMedia.personalities.some(item => item.id === personality.id));

const malformed = structuredClone(raw);
malformed.world.industryMedia.narratives = [{ id: '', narrativeKey: '', subjectKey: '', landmarks: [] }];
malformed.world.industryMedia.prInterventions = [{ id: '', interventionKey: '' }];
const repaired = migratePlayerSave(malformed);
assert.deepEqual(repaired.world.industryMedia.narratives, []);
assert.deepEqual(repaired.world.industryMedia.prInterventions, []);

console.log('Industry media C7 save migration audit passed.');
