import assert from 'node:assert/strict';

import {
  SaveTransferSafetyError,
  assertLegacyAndroidBridgeSafety,
  createSaveTransferOperationLock,
  evaluateLegacyAndroidBridgeSafety,
  measureSaveTransferFootprint,
  toSaveTransferSafetyTelemetry,
} from '../services/saveTransferSafety';
import {
  SAVE_TRANSFER_V2_MAGIC,
  createSaveTransferV2RecordDescriptor,
  createSignedSaveTransferV2Manifest,
  detectSaveTransferFormat,
  digestSaveTransferV2Bytes,
  serializeSaveTransferV2ManifestEnvelope,
  serializeSaveTransferV2RecordHeader,
  verifySignedSaveTransferV2Manifest,
} from '../services/saveTransferV2';
import { exportMediaTransferRecords, summarizeMediaTransferInventory } from '../services/mediaStorage';

const MIB = 1024 * 1024;

const footprint = measureSaveTransferFootprint({
  saveRecordBytes: [1_024, 2_048],
  localStorageRecordBytes: [512],
  mediaRecordBytes: [3, 4],
});
assert.deepEqual(footprint, {
  saveBytes: 3_072,
  saveCount: 2,
  localStorageBytes: 512,
  localStorageCount: 1,
  mediaBytes: 7,
  mediaBase64Bytes: 12,
  mediaCount: 2,
  largestRecordBytes: 2_048,
  projectedArchiveBytes: 70_412,
});

const allowed = evaluateLegacyAndroidBridgeSafety(footprint, {
  memoryClassMb: 256,
  availableMemoryMb: 128,
  lowMemory: false,
});
assert.equal(allowed.allowed, true);
assert.equal(allowed.reason, 'WITHIN_BUDGET');
assert.equal(allowed.maxPayloadBytes, Math.floor(256 * MIB * 0.025));

const oversized = measureSaveTransferFootprint({
  saveRecordBytes: [2 * MIB],
  localStorageRecordBytes: [],
  mediaRecordBytes: [20 * MIB],
});
const blocked = evaluateLegacyAndroidBridgeSafety(oversized, {
  memoryClassMb: 256,
  availableMemoryMb: 100,
  lowMemory: false,
});
assert.equal(blocked.allowed, false);
assert.equal(blocked.reason, 'PAYLOAD_TOO_LARGE');
assert.ok(blocked.projectedPeakBytes > blocked.projectedPeakBudgetBytes);
assert.throws(
  () => assertLegacyAndroidBridgeSafety(blocked),
  (error: unknown) => error instanceof SaveTransferSafetyError && error.code === 'LEGACY_BRIDGE_BLOCKED',
);

const pressured = evaluateLegacyAndroidBridgeSafety(footprint, {
  memoryClassMb: 512,
  availableMemoryMb: 300,
  lowMemory: true,
});
assert.equal(pressured.allowed, false);
assert.equal(pressured.reason, 'MEMORY_PRESSURE');

const telemetry = toSaveTransferSafetyTelemetry({
  direction: 'EXPORT',
  stage: 'MEASURED',
  footprint,
  decision: allowed,
  memoryClassMb: 256,
});
assert.deepEqual(Object.keys(telemetry).sort(), [
  'allowed', 'archive_size_bucket', 'direction', 'failure_reason', 'largest_record_bucket',
  'local_storage_count', 'media_count', 'media_size_bucket', 'memory_class_bucket',
  'projected_peak_bucket', 'save_count', 'save_size_bucket', 'stage',
].sort());
assert.equal(telemetry.save_size_bucket, 'under_1_mib');
assert.equal(telemetry.media_size_bucket, 'under_1_mib');
assert.ok(!JSON.stringify(telemetry).match(/player|content|filename|media_id|save_key/i));

const lock = createSaveTransferOperationLock();
const exportLease = lock.tryAcquire('EXPORT');
assert.ok(exportLease, 'the first transfer must acquire the lock');
assert.equal(lock.tryAcquire('IMPORT'), null, 'a second transfer must not overlap');
assert.equal(lock.release({ operation: 'EXPORT', token: 'stale-token' }), false, 'a stale lease must not release an active transfer');
assert.equal(lock.isActive(), true);
assert.equal(lock.release(exportLease!), true);
assert.equal(lock.isActive(), false);
const importLease = lock.tryAcquire('IMPORT');
assert.ok(importLease, 'the lock must be reusable after release');
assert.equal(lock.release(importLease!), true);

assert.deepEqual(
  summarizeMediaTransferInventory([{ size: 5 }, { size: 7 }, { size: Number.NaN }]),
  { count: 3, totalBytes: 12, largestRecordBytes: 7, recordBytes: [5, 7, 0] },
  'media inventory must expose only bounded size facts before any base64 encoding',
);

let observedMediaInventory: ReturnType<typeof summarizeMediaTransferInventory> | null = null;
const exportedMedia = await exportMediaTransferRecords(
  { beforeEncoding: inventory => { observedMediaInventory = inventory; } },
  {
    loadRecords: async () => [{
      id: 'private-media-id',
      kind: 'instagram_post',
      mimeType: 'image/webp',
      size: 3,
      createdAt: 1,
      blob: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/webp' }),
    }],
  },
);
assert.deepEqual(observedMediaInventory, {
  count: 1,
  totalBytes: 3,
  largestRecordBytes: 3,
  recordBytes: [3],
});
assert.equal(exportedMedia[0].dataBase64, 'AQID');

const knownDigest = await digestSaveTransferV2Bytes(new TextEncoder().encode('abc'));
assert.equal(knownDigest, 'ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0');

const saveRecord = createSaveTransferV2RecordDescriptor({
  id: 'save-slot-1',
  kind: 'SAVE',
  logicalKey: 'actorEmpireSave_1',
  byteLength: 3,
  sha256: knownDigest,
});
const mediaBytes = new Uint8Array([0, 1, 2, 3]);
const mediaRecord = createSaveTransferV2RecordDescriptor({
  id: 'media-1',
  kind: 'MEDIA',
  logicalKey: 'media-1',
  mimeType: 'image/webp',
  mediaKind: 'other',
  createdAt: 1,
  byteLength: mediaBytes.byteLength,
  sha256: await digestSaveTransferV2Bytes(mediaBytes),
});
const localRecord = createSaveTransferV2RecordDescriptor({
  id: 'local-settings',
  kind: 'LOCAL_STORAGE',
  logicalKey: 'actorEmpireSettings',
  byteLength: 2,
  sha256: await digestSaveTransferV2Bytes(new Uint8Array([123, 125])),
});

const manifest = await createSignedSaveTransferV2Manifest({
  appVersion: '1.0.25',
  createdAt: '2026-09-24T00:00:00.000Z',
  sourcePlatform: 'android',
  records: [saveRecord, mediaRecord, localRecord],
});
assert.equal(manifest.format, 'actor-empire-save-transfer');
assert.equal(manifest.formatVersion, 2);
assert.equal(manifest.totals.records, 3);
assert.equal(manifest.totals.saveRecords, 1);
assert.equal(manifest.totals.mediaRecords, 1);
assert.equal(manifest.totals.uncompressedBytes, 9);
assert.equal(manifest.compatibility.importsLegacyV1, true);
assert.equal(await verifySignedSaveTransferV2Manifest(manifest), true);
assert.ok(!JSON.stringify(manifest).includes('abc'), 'the manifest must contain descriptors, not record payloads');

const tamperedManifest = {
  ...manifest,
  totals: { ...manifest.totals, uncompressedBytes: 10 },
};
assert.equal(await verifySignedSaveTransferV2Manifest(tamperedManifest), false);

const envelope = serializeSaveTransferV2ManifestEnvelope(manifest);
assert.ok(envelope.startsWith(`${SAVE_TRANSFER_V2_MAGIC}\n`));
const mediaHeader = serializeSaveTransferV2RecordHeader(mediaRecord);
assert.ok(mediaHeader.startsWith('RECORD\n'));
assert.ok(mediaHeader.endsWith(`\n${mediaRecord.byteLength}\n`));
assert.ok(!mediaHeader.includes('AQID'), 'record framing must describe raw bytes without base64 embedding them');
assert.equal(detectSaveTransferFormat(envelope), 2);
assert.equal(detectSaveTransferFormat(JSON.stringify({ format: 'actor-empire-save-transfer', formatVersion: 1 })), 1);
assert.equal(detectSaveTransferFormat('{"format":"something-else"}'), null);

await assert.rejects(
  createSignedSaveTransferV2Manifest({
    appVersion: '1.0.25',
    createdAt: '2026-09-24T00:00:00.000Z',
    sourcePlatform: 'android',
    records: [saveRecord, { ...saveRecord }],
  }),
  /duplicate/i,
);

console.log('Save transfer OOM Phase 1–2 audit passed.');
