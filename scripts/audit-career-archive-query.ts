import assert from 'node:assert/strict';
import { createArchiveChunk, createArchiveRoot } from '../services/careerArchive';
import { readCareerArchivePage, stageCareerArchiveChunks } from '../services/careerArchiveStore';

const records = new Map<string, unknown>();
const store = {
  read: async (key: string) => records.get(key) ?? null,
  write: async (key: string, value: unknown) => { records.set(key, structuredClone(value)); },
};
const slot = 'actorEmpireSave_1';
const first = await createArchiveChunk('X_POST', [{ id: 'a', value: { text: 'first' } }, { id: 'b', value: { text: 'second' } }]);
const second = await createArchiveChunk('X_POST', [{ id: 'c', value: { text: 'third' } }]);
await stageCareerArchiveChunks(store, slot, [first, second]);
const root = await createArchiveRoot(slot, 'player-1', [
  { id: second.id, domain: second.domain, digest: second.digest, recordCount: 1, sequence: 1 },
  { id: first.id, domain: first.domain, digest: first.digest, recordCount: 2, sequence: 0 },
]);
const page1 = await readCareerArchivePage(store, root, 'X_POST', 2);
assert.deepEqual(page1.records.map(record => record.id), ['a', 'b']);
assert.ok(page1.next);
const page2 = await readCareerArchivePage(store, root, 'X_POST', 2, page1.next);
assert.deepEqual(page2.records.map(record => record.id), ['c']);
assert.equal(page2.next, null);
assert.deepEqual((await readCareerArchivePage(store, root, 'YOUTUBE_VIDEO', 2)).records, []);
await assert.rejects(readCareerArchivePage(store, root, 'X_POST', 2, { ...page1.next!, rootDigest: '0'.repeat(64) }), /cursor/i);
records.delete(`${slot}__archive_chunk__${second.digest}`);
await assert.rejects(readCareerArchivePage(store, root, 'X_POST', 3), /missing|corrupt/i);
console.log('Career archive query audit passed.');
