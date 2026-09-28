import assert from 'node:assert/strict';
import {
  normalizeAndroidDeviceCapabilitySnapshot,
  readAndroidDeviceCapabilities,
  toDeviceCapabilityTelemetry,
} from '../services/nativeDeviceCapabilities';

const rawSnapshot = {
  schemaVersion: 1,
  apiLevel: 36,
  androidRelease: '16',
  isLowRamDevice: false,
  memoryClassMb: 256,
  largeMemoryClassMb: 512,
  totalMemoryMb: 8000,
  availableMemoryMb: 2000,
  lowMemory: false,
  memoryThresholdMb: 512,
  thermalStatus: 2,
  thermalHeadroom: 0.42,
  webViewVersion: '140.0.7339.51',
};

const normalized = normalizeAndroidDeviceCapabilitySnapshot(rawSnapshot, 1_234);
assert.deepEqual(normalized, {
  schemaVersion: 1,
  capturedAtEpochMs: 1_234,
  apiLevel: 36,
  androidRelease: '16',
  isLowRamDevice: false,
  memoryClassMb: 256,
  largeMemoryClassMb: 512,
  totalMemoryMb: 8000,
  availableMemoryMb: 2000,
  availableMemoryRatio: 0.25,
  lowMemory: false,
  memoryThresholdMb: 512,
  thermalStatus: 2,
  thermalStatusLabel: 'MODERATE',
  thermalHeadroom: 0.42,
  webViewVersion: '140.0.7339.51',
  webViewMajor: 140,
});

assert.equal(normalizeAndroidDeviceCapabilitySnapshot({ ...rawSnapshot, apiLevel: -1 }, 1_234), null);
assert.equal(normalizeAndroidDeviceCapabilitySnapshot({ ...rawSnapshot, totalMemoryMb: 'unknown' }, 1_234), null);

let nonAndroidPluginCalls = 0;
const nonAndroid = await readAndroidDeviceCapabilities({
  isAndroid: () => false,
  nowEpochMs: () => 5_000,
  getSnapshot: async () => {
    nonAndroidPluginCalls += 1;
    return rawSnapshot;
  },
});
assert.deepEqual(nonAndroid, { status: 'UNAVAILABLE', reason: 'NOT_ANDROID' });
assert.equal(nonAndroidPluginCalls, 0);

const available = await readAndroidDeviceCapabilities({
  isAndroid: () => true,
  nowEpochMs: () => 5_000,
  getSnapshot: async () => rawSnapshot,
});
assert.deepEqual(available, {
  status: 'AVAILABLE',
  snapshot: normalizeAndroidDeviceCapabilitySnapshot(rawSnapshot, 5_000),
});

const invalidPayload = await readAndroidDeviceCapabilities({
  isAndroid: () => true,
  nowEpochMs: () => 5_000,
  getSnapshot: async () => ({ apiLevel: 'bad' }),
});
assert.deepEqual(invalidPayload, { status: 'UNAVAILABLE', reason: 'INVALID_PAYLOAD' });

const pluginFailure = await readAndroidDeviceCapabilities({
  isAndroid: () => true,
  nowEpochMs: () => 5_000,
  getSnapshot: async () => {
    throw new Error('native bridge unavailable');
  },
});
assert.deepEqual(pluginFailure, { status: 'UNAVAILABLE', reason: 'PLUGIN_ERROR' });

assert.ok(normalized);
const telemetry = toDeviceCapabilityTelemetry(normalized);
assert.deepEqual(telemetry, {
  schema_version: 1,
  api_level: 36,
  low_ram: false,
  memory_class_mb: 256,
  large_memory_class_mb: 512,
  total_memory_mb: 8000,
  available_memory_pct: 25,
  low_memory: false,
  memory_threshold_mb: 512,
  thermal_status: 2,
  thermal_headroom_pct: 42,
  webview_major: 140,
});
assert.ok(Object.keys(telemetry).length <= 12, 'capability telemetry must leave room for shared Firebase context');
assert.ok(Object.values(telemetry).every((value) => value !== undefined));

console.log('native device capabilities phase 2 audit passed');
