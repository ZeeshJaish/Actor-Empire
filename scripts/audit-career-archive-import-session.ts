import assert from 'node:assert/strict';
import { createArchiveChunk, createArchiveRoot } from '../services/careerArchive';
import { createCareerArchiveImportSession } from '../services/careerArchiveTransfer';
import { createSaveTransferV2RecordDescriptor } from '../services/saveTransferV2';

const slot = 'actorEmpireSave_1';
const chunk = await createArchiveChunk('X_POST', [{ id: 'post-1', value: { text: 'kept' } }]);
const root = await createArchiveRoot(slot, 'player-1', [{
  id: chunk.id, domain: chunk.domain, digest: chunk.digest, recordCount: 1, sequence: 0,
}]);
const sha = 'A'.repeat(43);
const rootDescriptor = createSaveTransferV2RecordDescriptor({
  id: 'root-1', kind: 'ARCHIVE_ROOT', logicalKey: `${slot}__archiveRoot`,
  archiveRootDigest: root.digest, byteLength: 100, sha256: sha,
});
const chunkDescriptor = createSaveTransferV2RecordDescriptor({
  id: 'chunk-1', kind: 'ARCHIVE_CHUNK', logicalKey: `${slot}__archive_chunk__${chunk.digest}`,
  byteLength: 100, sha256: sha,
});
const saveDescriptor = createSaveTransferV2RecordDescriptor({
  id: 'save-1', kind: 'SAVE', logicalKey: slot,
  archiveRootDigest: root.digest, byteLength: 100, sha256: sha,
});
const values = new Map<string, unknown>();
const store = {
  read: async (key: string) => values.get(key) ?? null,
  write: async (key: string, value: unknown) => { values.set(key, structuredClone(value)); },
};
const session = createCareerArchiveImportSession([rootDescriptor, chunkDescriptor, saveDescriptor], store);
await session.acceptRoot(rootDescriptor, JSON.stringify(root));
await assert.rejects(session.rootForSave(saveDescriptor), /chunk|incomplete/i);
await session.acceptChunk(chunkDescriptor, JSON.stringify(chunk));
assert.equal((await session.rootForSave(saveDescriptor))?.digest, root.digest);
session.verifyComplete();
const broken = createCareerArchiveImportSession([rootDescriptor, chunkDescriptor, saveDescriptor], store);
await broken.acceptRoot(rootDescriptor, JSON.stringify(root));
await assert.rejects(broken.acceptChunk(chunkDescriptor, JSON.stringify({ ...chunk, records: [] })), /corrupt/i);
assert.throws(() => broken.verifyComplete(), /incomplete/i);

const secondChunk = await createArchiveChunk('INSTAGRAM_POST', [{ id: 'ig-1', value: { caption: 'kept' } }]);
const secondRoot = await createArchiveRoot(slot, 'player-1', [
  root.chunks[0],
  { id: secondChunk.id, domain: secondChunk.domain, digest: secondChunk.digest, recordCount: 1, sequence: 0 },
]);
const secondRootDescriptor = createSaveTransferV2RecordDescriptor({
  id: 'root-multi', kind: 'ARCHIVE_ROOT', logicalKey: `${slot}__archiveRoot`,
  archiveRootDigest: secondRoot.digest, byteLength: 100, sha256: sha,
});
const secondChunkDescriptor = createSaveTransferV2RecordDescriptor({
  id: 'chunk-2', kind: 'ARCHIVE_CHUNK', logicalKey: `${slot}__archive_chunk__${secondChunk.digest}`,
  byteLength: 100, sha256: sha,
});
const secondSaveDescriptor = createSaveTransferV2RecordDescriptor({
  id: 'save-multi', kind: 'SAVE', logicalKey: slot,
  archiveRootDigest: secondRoot.digest, byteLength: 100, sha256: sha,
});
const multi = createCareerArchiveImportSession([
  secondRootDescriptor, chunkDescriptor, secondChunkDescriptor, secondSaveDescriptor,
], store);
await multi.acceptRoot(secondRootDescriptor, JSON.stringify(secondRoot));
await multi.acceptChunk(chunkDescriptor, JSON.stringify(chunk));
await assert.rejects(multi.rootForSave(secondSaveDescriptor), /incomplete/i,
  'the hot save must not promote after only one of two signed chunks is staged');
await assert.rejects(multi.acceptChunk(secondChunkDescriptor, JSON.stringify({ ...secondChunk, records: [] })), /corrupt/i);
await assert.rejects(multi.rootForSave(secondSaveDescriptor), /incomplete/i);
await multi.acceptChunk(secondChunkDescriptor, JSON.stringify(secondChunk));
assert.equal((await multi.rootForSave(secondSaveDescriptor))?.digest, secondRoot.digest);
multi.verifyComplete();
await assert.rejects(multi.acceptChunk(secondChunkDescriptor, JSON.stringify(secondChunk)), /duplicated/i);

const otherSlot = 'actorEmpireSave_2';
const otherRoot = await createArchiveRoot(otherSlot, 'player-2', []);
const otherRootDescriptor = createSaveTransferV2RecordDescriptor({
  id: 'root-other', kind: 'ARCHIVE_ROOT', logicalKey: `${otherSlot}__archiveRoot`,
  archiveRootDigest: otherRoot.digest, byteLength: 100, sha256: sha,
});
const otherSaveDescriptor = createSaveTransferV2RecordDescriptor({
  id: 'save-other', kind: 'SAVE', logicalKey: otherSlot,
  archiveRootDigest: otherRoot.digest, byteLength: 100, sha256: sha,
});
const twoSlots = createCareerArchiveImportSession([
  secondRootDescriptor, chunkDescriptor, secondChunkDescriptor, secondSaveDescriptor,
  otherRootDescriptor, otherSaveDescriptor,
], store);
await twoSlots.acceptRoot(secondRootDescriptor, JSON.stringify(secondRoot));
await twoSlots.acceptRoot(otherRootDescriptor, JSON.stringify(otherRoot));
await twoSlots.acceptChunk(chunkDescriptor, JSON.stringify(chunk));
await twoSlots.acceptChunk(secondChunkDescriptor, JSON.stringify(secondChunk));
assert.equal((await twoSlots.rootForSave(secondSaveDescriptor))?.digest, secondRoot.digest);
assert.equal((await twoSlots.rootForSave(otherSaveDescriptor))?.digest, otherRoot.digest);
twoSlots.verifyComplete();
console.log('Career archive import session audit passed.');
