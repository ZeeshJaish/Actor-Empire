import assert from 'node:assert/strict';
import {
  assertCompleteArchiveTransferManifest,
  createSaveTransferV2RecordDescriptor,
  createSignedSaveTransferV2Manifest,
  verifySignedSaveTransferV2Manifest,
} from '../services/saveTransferV2';

const sha = 'A'.repeat(43);
const rootDigest = 'a'.repeat(64);
const slot = 'actorEmpireSave_1';
const save = createSaveTransferV2RecordDescriptor({
  id: 'save-slot-1', kind: 'SAVE', logicalKey: slot, byteLength: 100, sha256: sha,
  archiveRootDigest: rootDigest,
});
const root = createSaveTransferV2RecordDescriptor({
  id: 'archive-root-1', kind: 'ARCHIVE_ROOT', logicalKey: `${slot}__archiveRoot`,
  byteLength: 128, sha256: sha, archiveRootDigest: rootDigest,
});
const chunk = createSaveTransferV2RecordDescriptor({
  id: 'archive-chunk-1', kind: 'ARCHIVE_CHUNK', logicalKey: `${slot}__archive_chunk__${'b'.repeat(64)}`,
  byteLength: 200, sha256: sha,
});
const base = { appVersion: '1.0', createdAt: '2026-09-25T00:00:00.000Z', sourcePlatform: 'android' };
const signed = await createSignedSaveTransferV2Manifest({ ...base, records: [root, chunk, save] });
assert.equal(await verifySignedSaveTransferV2Manifest(signed), true);
assert.doesNotThrow(() => assertCompleteArchiveTransferManifest(signed));
await assert.rejects(createSignedSaveTransferV2Manifest({ ...base, records: [save, root, chunk] }), /order/i);
await assert.rejects(createSignedSaveTransferV2Manifest({ ...base, records: [save, chunk] }), /root/i);
await assert.rejects(createSignedSaveTransferV2Manifest({ ...base, records: [
  createSaveTransferV2RecordDescriptor({ id: 'legacy-save', kind: 'SAVE', logicalKey: slot, byteLength: 100, sha256: sha }),
  root,
] }), /root/i);
assert.throws(() => createSaveTransferV2RecordDescriptor({
  id: 'bad-chunk', kind: 'ARCHIVE_CHUNK', logicalKey: `${slot}__archive_chunk__bad`,
  byteLength: 100, sha256: sha,
}), /chunk/i);
assert.throws(() => createSaveTransferV2RecordDescriptor({
  id: 'oversize-chunk', kind: 'ARCHIVE_CHUNK', logicalKey: `${slot}__archive_chunk__${'b'.repeat(64)}`,
  byteLength: 320 * 1024 + 1, sha256: sha,
}), /limit/i);
assert.throws(() => createSaveTransferV2RecordDescriptor({
  id: 'unknown-kind', kind: 'UNSUPPORTED' as 'SAVE', logicalKey: slot, byteLength: 100, sha256: sha,
}), /kind/i);
await assert.rejects(createSignedSaveTransferV2Manifest({ ...base, records: [
  save, { ...root, encoding: 'BINARY' }, chunk,
] }), /encoding/i);
console.log('Career archive transfer contract audit passed.');
