import assert from 'node:assert/strict';

import {
  SAVE_TRANSFER_STREAM_RAW_CHUNK_BYTES,
  assertSaveTransferV2RecordMatch,
  bridgeBase64ToBytes,
  bytesToBridgeBase64,
  decodeBoundedUtf8Chunks,
  readNativeSaveTransferV2Record,
  remapTransferMediaReferences,
  spoolNativeSaveTransferV2Record,
  streamBlobAsBoundedChunks,
  streamJsonAsBoundedChunks,
  streamTextAsBoundedChunks,
} from '../services/saveTransferV2Stream';
import { createSaveTransferV2RecordDescriptor, digestSaveTransferV2Bytes } from '../services/saveTransferV2';

const largeFixture = {
  name: 'Aditi 🎬',
  nested: Array.from({ length: 4_000 }, (_, index) => ({
    index,
    label: `release-${index}`,
    values: [index, null, true, false],
  })),
  omitted: undefined,
  customOmitted: { toJSON: () => undefined },
  exportedDate: new Date('2026-09-24T00:00:00.000Z'),
};

const jsonChunks: Uint8Array[] = [];
await streamJsonAsBoundedChunks(largeFixture, chunk => {
  assert.ok(chunk.byteLength > 0);
  assert.ok(chunk.byteLength <= SAVE_TRANSFER_STREAM_RAW_CHUNK_BYTES);
  jsonChunks.push(chunk);
}, 1024);
const streamedJson = new TextDecoder().decode(
  Uint8Array.from(jsonChunks.flatMap(chunk => Array.from(chunk))),
);
assert.equal(streamedJson, JSON.stringify(largeFixture), 'streamed JSON must be byte-equivalent to JSON.stringify');
assert.ok(jsonChunks.length > 1, 'large JSON must be split into bounded chunks');

const unicodeText = '🎬汉字—Actor Empire—'.repeat(2_000);
const textChunks: Uint8Array[] = [];
await streamTextAsBoundedChunks(unicodeText, chunk => {
  assert.ok(chunk.byteLength <= 257, 'UTF-8 text chunks must respect the requested raw-byte ceiling');
  textChunks.push(chunk);
}, 257);
assert.equal(new TextDecoder().decode(Uint8Array.from(textChunks.flatMap(chunk => Array.from(chunk)))), unicodeText);

const binary = Uint8Array.from({ length: 9_001 }, (_, index) => index % 251);
const blobChunks: Uint8Array[] = [];
await streamBlobAsBoundedChunks(new Blob([binary]), chunk => {
  assert.ok(chunk.byteLength <= 511);
  blobChunks.push(chunk);
}, 511);
assert.deepEqual(Uint8Array.from(blobChunks.flatMap(chunk => Array.from(chunk))), binary);

const encoded = bytesToBridgeBase64(binary.subarray(0, 511));
assert.ok(encoded.length <= 684, '511 raw bytes must stay inside the expected base64 envelope');
assert.deepEqual(bridgeBase64ToBytes(encoded, 511), binary.subarray(0, 511));
assert.throws(
  () => bridgeBase64ToBytes(bytesToBridgeBase64(binary.subarray(0, 512)), 511),
  /chunk limit/i,
  'oversized native chunks must be rejected before allocation grows',
);

const nativeRecordBytes = new TextEncoder().encode('{"name":"Maya"}');
const nativeRecordDescriptor = createSaveTransferV2RecordDescriptor({
  id: 'save-slot-native',
  kind: 'SAVE',
  logicalKey: 'actorEmpireSave_2',
  byteLength: nativeRecordBytes.byteLength,
  sha256: await digestSaveTransferV2Bytes(nativeRecordBytes),
});
const exportCalls: string[] = [];
const exportedChunks: Uint8Array[] = [];
const spooled = await spoolNativeSaveTransferV2Record({
  sessionId: 'export-session',
  recordId: nativeRecordDescriptor.id,
  native: {
    beginExportRecord: async () => { exportCalls.push('begin'); },
    appendExportChunk: async options => {
      exportCalls.push('append');
      const bytes = bridgeBase64ToBytes(options.dataBase64);
      exportedChunks.push(bytes);
      return { acceptedBytes: bytes.byteLength };
    },
    finishExportRecord: async () => {
      exportCalls.push('finish');
      return {
        recordId: nativeRecordDescriptor.id,
        byteLength: nativeRecordBytes.byteLength,
        sha256: nativeRecordDescriptor.sha256,
      };
    },
  },
  write: sink => streamTextAsBoundedChunks(new TextDecoder().decode(nativeRecordBytes), sink, 4),
});
assert.deepEqual(exportCalls, ['begin', 'append', 'append', 'append', 'append', 'finish']);
assert.equal(spooled.sha256, nativeRecordDescriptor.sha256);
assert.deepEqual(Uint8Array.from(exportedChunks.flatMap(chunk => Array.from(chunk))), nativeRecordBytes);

let importOffset = 0;
let committedPayload: Uint8Array | null = null;
await readNativeSaveTransferV2Record({
  sessionId: 'import-session',
  descriptor: nativeRecordDescriptor,
  native: {
    beginImportRecord: async () => ({
      headerJson: JSON.stringify(nativeRecordDescriptor),
      byteLength: nativeRecordDescriptor.byteLength,
    }),
    readImportRecordChunk: async () => {
      if (importOffset >= nativeRecordBytes.byteLength) return { dataBase64: '', byteLength: 0, done: true };
      const bytes = nativeRecordBytes.subarray(importOffset, importOffset + 3);
      importOffset += bytes.byteLength;
      return { dataBase64: bytesToBridgeBase64(bytes), byteLength: bytes.byteLength, done: false };
    },
    finishImportRecord: async () => ({
      byteLength: nativeRecordDescriptor.byteLength,
      sha256: nativeRecordDescriptor.sha256,
    }),
  },
  consume: async chunks => {
    const received: number[] = [];
    for await (const chunk of chunks) received.push(...chunk);
    committedPayload = Uint8Array.from(received);
  },
});
assert.deepEqual(committedPayload, nativeRecordBytes);

let corruptConsumerFinished = false;
let corruptOffset = 0;
await assert.rejects(
  readNativeSaveTransferV2Record({
    sessionId: 'corrupt-session',
    descriptor: nativeRecordDescriptor,
    native: {
      beginImportRecord: async () => ({ headerJson: JSON.stringify(nativeRecordDescriptor), byteLength: nativeRecordDescriptor.byteLength }),
      readImportRecordChunk: async () => {
        if (corruptOffset >= nativeRecordBytes.byteLength) return { dataBase64: '', byteLength: 0, done: true };
        const bytes = nativeRecordBytes.subarray(corruptOffset, corruptOffset + 3);
        corruptOffset += bytes.byteLength;
        return { dataBase64: bytesToBridgeBase64(bytes), byteLength: bytes.byteLength, done: false };
      },
      finishImportRecord: async () => ({ byteLength: nativeRecordDescriptor.byteLength, sha256: 'A'.repeat(43) }),
    },
    consume: async chunks => {
      for await (const _chunk of chunks) { /* drain */ }
      corruptConsumerFinished = true;
    },
  }),
  /signed manifest/i,
);
assert.equal(corruptConsumerFinished, true, 'payload consumers may stage data, but digest failure must reject before promotion');

const remappedSave = remapTransferMediaReferences({
  posterMediaId: 'poster-old',
  nested: [{ contentMediaId: 'social-old' }, 'poster-old'],
  untouched: 'ordinary-title',
}, new Map([
  ['poster-old', 'ae_import_poster'],
  ['social-old', 'ae_import_social'],
]));
assert.deepEqual(remappedSave, {
  posterMediaId: 'ae_import_poster',
  nested: [{ contentMediaId: 'ae_import_social' }, 'ae_import_poster'],
  untouched: 'ordinary-title',
});

const descriptor = createSaveTransferV2RecordDescriptor({
  id: 'save-slot-1',
  kind: 'SAVE',
  logicalKey: 'actorEmpireSave_1',
  byteLength: binary.byteLength,
  sha256: await digestSaveTransferV2Bytes(binary),
});

const mediaDescriptor = createSaveTransferV2RecordDescriptor({
  id: 'media-1',
  kind: 'MEDIA',
  logicalKey: 'poster-42',
  mimeType: 'image/webp',
  mediaKind: 'production_poster',
  createdAt: 1_725_000_000_000,
  width: 1080,
  height: 1350,
  byteLength: 4,
  sha256: await digestSaveTransferV2Bytes(new Uint8Array([1, 2, 3, 4])),
});
assert.deepEqual(mediaDescriptor.media, {
  kind: 'production_poster',
  createdAt: 1_725_000_000_000,
  width: 1080,
  height: 1350,
});
assertSaveTransferV2RecordMatch({ ...descriptor }, descriptor);
assert.throws(
  () => assertSaveTransferV2RecordMatch({ ...descriptor, byteLength: descriptor.byteLength - 1 }, descriptor),
  /signed manifest/i,
);
assert.throws(
  () => assertSaveTransferV2RecordMatch({ ...descriptor, sha256: 'A'.repeat(43) }, descriptor),
  /signed manifest/i,
);

await assert.rejects(
  decodeBoundedUtf8Chunks(
    [bytesToBridgeBase64(new TextEncoder().encode('1234')), bytesToBridgeBase64(new TextEncoder().encode('56'))],
    5,
  ),
  /declared byte limit/i,
  'manifest and record collectors must reject actual bytes beyond the signed declaration',
);

console.log('Save transfer OOM Phase 3–4 audit passed.');
