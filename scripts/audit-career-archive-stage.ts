import assert from 'node:assert/strict';
import { createArchiveChunk, createArchiveRoot } from '../services/careerArchive';
import {
  archiveChunkStorageKey,
  readVerifiedCareerArchiveChunk,
  stageCareerArchiveChunks,
  verifyCareerArchiveRootChunks,
} from '../services/careerArchiveStore';

const records = new Map<string, unknown>();
const store = {
  read: async (key: string) => records.get(key) ?? null,
  write: async (key: string, value: unknown) => { records.set(key, structuredClone(value)); },
};

const slot = 'actorEmpireSave_1';
const chunk = await createArchiveChunk('X_POST', [{ id: 'post-1', value: { text: 'first' } }]);
const root = await createArchiveRoot(slot, 'player-1', [
  { id: chunk.id, domain: chunk.domain, digest: chunk.digest, recordCount: 1, sequence: 0 },
]);
assert.equal(await verifyCareerArchiveRootChunks(store, root), false, 'missing chunk must fail completeness');
await stageCareerArchiveChunks(store, slot, [chunk]);
assert.equal(await verifyCareerArchiveRootChunks(store, root), true);
assert.deepEqual((await readVerifiedCareerArchiveChunk(store, root, root.chunks[0])).records[0].value, { text: 'first' });
const key = archiveChunkStorageKey(slot, chunk);
assert.equal(records.has(key), true);
const firstStored = records.get(key);
await stageCareerArchiveChunks(store, slot, [chunk]);
assert.deepEqual(records.get(key), firstStored, 'same chunk is idempotent');

const corrupted = structuredClone(chunk);
corrupted.records[0].value = { text: 'tampered' };
records.set(key, corrupted);
await assert.rejects(stageCareerArchiveChunks(store, slot, [chunk]), /collision|corrupt/i);
assert.equal(await verifyCareerArchiveRootChunks(store, root), false);
await assert.rejects(readVerifiedCareerArchiveChunk(store, root, root.chunks[0]), /corrupt|missing/i);
assert.deepEqual(records.get(key), corrupted, 'stage must not overwrite corrupted existing data');

const other = await createArchiveChunk('X_POST', [{ id: 'post-2', value: { text: 'second' } }]);
const failedStore = {
  read: store.read,
  write: async (_key: string, _value: unknown) => { throw new Error('quota exceeded'); },
};
const oldCurrent = { id: 'player-1', currentWeek: 10 };
records.set(slot, oldCurrent);
await assert.rejects(stageCareerArchiveChunks(failedStore, slot, [other]), /quota exceeded/);
assert.deepEqual(records.get(slot), oldCurrent, 'failed stage must leave current save untouched');

console.log('Career archive stage audit passed.');
