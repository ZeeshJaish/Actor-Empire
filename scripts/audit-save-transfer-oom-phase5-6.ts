import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  SaveTransferCancelledError,
  createDelayedSaveTransferProgressPresenter,
  throwIfSaveTransferCancelled,
  type SaveTransferProgress,
} from '../services/saveTransferExperience';
import {
  SAVE_TRANSFER_STREAM_RAW_CHUNK_BYTES,
  readNativeSaveTransferV2Record,
  spoolNativeSaveTransferV2Record,
  streamBlobAsBoundedChunks,
  streamTextAsBoundedChunks,
} from '../services/saveTransferV2Stream';
import {
  createSaveTransferV2RecordDescriptor,
  createSignedSaveTransferV2Manifest,
  digestSaveTransferV2Bytes,
  verifySignedSaveTransferV2Manifest,
} from '../services/saveTransferV2';
import { SaveTransferSafetyError } from '../services/saveTransferSafety';

type TimerCallback = () => void;
const timerCallbacks = new Map<number, TimerCallback>();
let nextTimerId = 1;
const visibleProgress: Array<SaveTransferProgress | null> = [];
const presenter = createDelayedSaveTransferProgressPresenter({
  onChange: progress => visibleProgress.push(progress),
  delayMs: 1_000,
  timers: {
    setTimeout: callback => {
      const id = nextTimerId++;
      timerCallbacks.set(id, callback);
      return id;
    },
    clearTimeout: id => timerCallbacks.delete(id),
  },
});
presenter.update({
  direction: 'EXPORT',
  stage: 'PREPARING',
  message: 'Preparing save records...',
  cancelable: true,
});
assert.deepEqual(visibleProgress, [], 'fast transfers must not flash a progress surface');
timerCallbacks.get(1)?.();
assert.equal(visibleProgress.length, 1, 'slow transfers must reveal their latest real progress after the delay');
presenter.update({
  direction: 'EXPORT',
  stage: 'WRITING',
  message: 'Writing record 2 of 3...',
  processedRecords: 1,
  totalRecords: 3,
  cancelable: true,
});
assert.equal(visibleProgress.at(-1)?.processedRecords, 1);
presenter.finish();
assert.equal(visibleProgress.at(-1), null, 'completion must clear progress immediately');

const silentProgress: Array<SaveTransferProgress | null> = [];
const silentTimers = new Map<number, TimerCallback>();
const silentPresenter = createDelayedSaveTransferProgressPresenter({
  onChange: progress => silentProgress.push(progress),
  timers: {
    setTimeout: callback => {
      silentTimers.set(1, callback);
      return 1;
    },
    clearTimeout: id => silentTimers.delete(id),
  },
});
silentPresenter.update({ direction: 'IMPORT', stage: 'READING', message: 'Reading...', cancelable: true });
silentPresenter.finish();
silentTimers.get(1)?.();
assert.deepEqual(silentProgress, [], 'a completed fast transfer must stay silent even if its old timer fires');

const abortController = new AbortController();
abortController.abort();
assert.throws(
  () => throwIfSaveTransferCancelled(abortController.signal),
  SaveTransferCancelledError,
  'abort requests must use a recognizable non-failure error',
);

const stressSizes = [40 * 1024 * 1024, 100 * 1024 * 1024];
for (const byteLength of stressSizes) {
  let streamedBytes = 0;
  let largestChunk = 0;
  await streamTextAsBoundedChunks('x'.repeat(byteLength), chunk => {
    streamedBytes += chunk.byteLength;
    largestChunk = Math.max(largestChunk, chunk.byteLength);
  });
  assert.equal(streamedBytes, byteLength, `the ${byteLength} byte save fixture must stream completely`);
  assert.ok(largestChunk <= SAVE_TRANSFER_STREAM_RAW_CHUNK_BYTES, 'stress traffic must remain bridge-bounded');
}

const matureSlotDescriptors = await Promise.all([1, 2, 3].map(async slot => {
  const marker = new TextEncoder().encode(`mature-slot-${slot}`);
  return createSaveTransferV2RecordDescriptor({
    id: `save-slot-${slot}`,
    kind: 'SAVE',
    logicalKey: `actorEmpireSave_${slot}`,
    byteLength: 40 * 1024 * 1024,
    sha256: await digestSaveTransferV2Bytes(marker),
  });
}));
const matureSlotsManifest = await createSignedSaveTransferV2Manifest({
  appVersion: '1.0.25',
  createdAt: '2026-09-24T00:00:00.000Z',
  sourcePlatform: 'android',
  records: matureSlotDescriptors,
});
assert.equal(matureSlotsManifest.totals.saveRecords, 3);
assert.equal(matureSlotsManifest.totals.uncompressedBytes, 120 * 1024 * 1024);
assert.equal(await verifySignedSaveTransferV2Manifest(matureSlotsManifest), true, 'three mature slots must remain valid V2 input');

const v1TooLarge = new SaveTransferSafetyError('PAYLOAD_TOO_LARGE');
assert.match(v1TooLarge.message, /older V1 transfer/i);
assert.match(v1TooLarge.message, /export again/i);
assert.match(v1TooLarge.message, /careers are unchanged/i);

const mediaBytes = 32 * 1024 * 1024;
let streamedMediaBytes = 0;
await streamBlobAsBoundedChunks(new Blob([new Uint8Array(mediaBytes)]), chunk => {
  streamedMediaBytes += chunk.byteLength;
  assert.ok(chunk.byteLength <= SAVE_TRANSFER_STREAM_RAW_CHUNK_BYTES);
});
assert.equal(streamedMediaBytes, mediaBytes, 'maximum-media fixture must stream without a monolithic bridge payload');

const exportAbort = new AbortController();
let exportAppendCalls = 0;
await assert.rejects(
  spoolNativeSaveTransferV2Record({
    sessionId: 'cancel-export',
    recordId: 'save-slot-1',
    signal: exportAbort.signal,
    native: {
      beginExportRecord: async () => undefined,
      appendExportChunk: async options => {
        exportAppendCalls += 1;
        exportAbort.abort();
        return { acceptedBytes: Math.floor(options.dataBase64.length * 3 / 4) };
      },
      finishExportRecord: async () => ({ recordId: 'save-slot-1', byteLength: 8, sha256: 'unused' }),
    },
    write: sink => streamTextAsBoundedChunks('abcdefgh', sink, 4),
  }),
  SaveTransferCancelledError,
);
assert.equal(exportAppendCalls, 1, 'export cancellation must stop before the next bridge chunk');

const importBytes = new TextEncoder().encode('abcdefgh');
const importDescriptor = createSaveTransferV2RecordDescriptor({
  id: 'save-slot-1',
  kind: 'SAVE',
  logicalKey: 'actorEmpireSave_1',
  byteLength: importBytes.byteLength,
  sha256: await digestSaveTransferV2Bytes(importBytes),
});
const importAbort = new AbortController();
let importReadCalls = 0;
await assert.rejects(
  readNativeSaveTransferV2Record({
    sessionId: 'cancel-import',
    descriptor: importDescriptor,
    signal: importAbort.signal,
    native: {
      beginImportRecord: async () => ({ headerJson: JSON.stringify(importDescriptor), byteLength: importBytes.byteLength }),
      readImportRecordChunk: async () => {
        importReadCalls += 1;
        importAbort.abort();
        const chunk = importBytes.subarray(0, 4);
        const binary = String.fromCharCode(...chunk);
        return { dataBase64: btoa(binary), byteLength: chunk.byteLength, done: false };
      },
      finishImportRecord: async () => ({ byteLength: importBytes.byteLength, sha256: importDescriptor.sha256 }),
    },
    consume: async chunks => {
      for await (const _chunk of chunks) { /* drain until cancellation */ }
    },
  }),
  SaveTransferCancelledError,
);
assert.equal(importReadCalls, 1, 'import cancellation must stop before the next native read');

const progressOverlaySource = readFileSync('components/SaveTransferProgressOverlay.tsx', 'utf8');
assert.match(progressOverlaySource, /role="dialog"/);
assert.match(progressOverlaySource, /role="progressbar"/);
assert.match(progressOverlaySource, /aria-live="polite"/);
assert.match(progressOverlaySource, /min-h-12/);
assert.match(progressOverlaySource, /does not change graphics or gameplay quality/i);

console.log('Save transfer OOM Phase 5–6 audit passed.');
