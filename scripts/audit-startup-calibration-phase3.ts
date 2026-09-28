import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type {
  AndroidDeviceCapabilityReadResult,
  AndroidDeviceCapabilitySnapshot,
} from '../services/nativeDeviceCapabilities';
import {
  createAndroidStartupCalibration,
  createStartupCalibrationCoordinator,
  toStartupCalibrationTelemetry,
} from '../services/startupCalibration';
import type { StartupPerformanceSummary } from '../services/startupPerformance';

const performance = (overrides: Partial<StartupPerformanceSummary> = {}): StartupPerformanceSummary => ({
  schemaVersion: 1,
  startupDurationMs: 8_600,
  sampledDurationMs: 8_000,
  frameSampleCount: 480,
  frameP50Ms: 17,
  frameP95Ms: 22,
  longestFrameMs: 45,
  slowFrameCount: 3,
  playSlowFrameCount: 0,
  severeFrameCount: 0,
  slowFrameRatio: 0.0063,
  playSlowFrameRatio: 0,
  longTaskCount: 0,
  longTaskTotalMs: 0,
  longestLongTaskMs: 0,
  visibilityInterrupted: false,
  ...overrides,
});

const snapshot = (
  overrides: Partial<AndroidDeviceCapabilitySnapshot> = {}
): AndroidDeviceCapabilitySnapshot => ({
  schemaVersion: 1,
  capturedAtEpochMs: 1_000,
  apiLevel: 36,
  androidRelease: '16',
  isLowRamDevice: false,
  memoryClassMb: 256,
  largeMemoryClassMb: 512,
  totalMemoryMb: 8_000,
  availableMemoryMb: 4_000,
  availableMemoryRatio: 0.5,
  lowMemory: false,
  memoryThresholdMb: 512,
  thermalStatus: 0,
  thermalStatusLabel: 'NONE',
  thermalHeadroom: 0.2,
  webViewVersion: '140.0.7339.51',
  webViewMajor: 140,
  ...overrides,
});

const available = (
  overrides: Partial<AndroidDeviceCapabilitySnapshot> = {}
): AndroidDeviceCapabilityReadResult => ({ status: 'AVAILABLE', snapshot: snapshot(overrides) });

const stable = createAndroidStartupCalibration(available(), performance());
assert.equal(stable.recommendation, 'KEEP_FULL_QUALITY');
assert.equal(stable.confidence, 'HIGH');
assert.equal(stable.primaryReason, 'STABLE_STARTUP');
assert.deepEqual(stable.evidence, []);

const lowRamButSmooth = createAndroidStartupCalibration(
  available({ isLowRamDevice: true, memoryClassMb: 96 }),
  performance()
);
assert.equal(lowRamButSmooth.recommendation, 'KEEP_FULL_QUALITY');
assert.equal(lowRamButSmooth.primaryReason, 'STABLE_DESPITE_DEVICE_CONSTRAINT');
assert.deepEqual(lowRamButSmooth.evidence, ['LOW_RAM']);

const framePressure = performance({
  frameP95Ms: 84,
  longestFrameMs: 140,
  slowFrameCount: 190,
  playSlowFrameCount: 150,
  severeFrameCount: 12,
  slowFrameRatio: 0.3958,
  playSlowFrameRatio: 0.3125,
});
const constrained = createAndroidStartupCalibration(
  available({ isLowRamDevice: true, memoryClassMb: 96 }),
  framePressure
);
assert.equal(constrained.recommendation, 'CONSIDER_OPTIMIZED');
assert.equal(constrained.confidence, 'HIGH');
assert.equal(constrained.primaryReason, 'LOW_RAM_WITH_RUNTIME_PRESSURE');
assert.deepEqual(constrained.evidence, ['FRAME_PRESSURE', 'LOW_RAM']);

const thermal = createAndroidStartupCalibration(
  available({ thermalStatus: 3, thermalStatusLabel: 'SEVERE', thermalHeadroom: 1.1 }),
  framePressure
);
assert.equal(thermal.recommendation, 'CONSIDER_OPTIMIZED');
assert.equal(thermal.primaryReason, 'THERMAL_WITH_RUNTIME_PRESSURE');
assert.deepEqual(thermal.evidence, ['FRAME_PRESSURE', 'THERMAL_PRESSURE']);

const mainThreadPressure = createAndroidStartupCalibration(
  available({ lowMemory: true, availableMemoryMb: 350, availableMemoryRatio: 0.0438 }),
  performance({ longTaskCount: 4, longTaskTotalMs: 1_800, longestLongTaskMs: 700 })
);
assert.equal(mainThreadPressure.recommendation, 'CONSIDER_OPTIMIZED');
assert.equal(mainThreadPressure.primaryReason, 'MEMORY_WITH_RUNTIME_PRESSURE');
assert.deepEqual(mainThreadPressure.evidence, ['MAIN_THREAD_PRESSURE', 'MEMORY_PRESSURE']);

const interrupted = createAndroidStartupCalibration(available(), performance({ visibilityInterrupted: true }));
assert.equal(interrupted.recommendation, 'OBSERVE_MORE');
assert.equal(interrupted.confidence, 'LOW');
assert.equal(interrupted.primaryReason, 'VISIBILITY_INTERRUPTED');

const insufficient = createAndroidStartupCalibration(available(), performance({ frameSampleCount: 60 }));
assert.equal(insufficient.recommendation, 'OBSERVE_MORE');
assert.equal(insufficient.primaryReason, 'INSUFFICIENT_FRAME_SAMPLES');

const bridgeUnavailable = createAndroidStartupCalibration(
  { status: 'UNAVAILABLE', reason: 'PLUGIN_ERROR' },
  framePressure
);
assert.equal(bridgeUnavailable.recommendation, 'OBSERVE_MORE');
assert.equal(bridgeUnavailable.primaryReason, 'NATIVE_CAPABILITY_UNAVAILABLE');
assert.deepEqual(bridgeUnavailable.evidence, ['FRAME_PRESSURE']);

const telemetry = toStartupCalibrationTelemetry(constrained);
assert.deepEqual(telemetry, {
  schema_version: 1,
  recommendation: 'CONSIDER_OPTIMIZED',
  confidence: 'HIGH',
  primary_reason: 'LOW_RAM_WITH_RUNTIME_PRESSURE',
  evidence: 'FRAME_PRESSURE|LOW_RAM',
  native_available: true,
  frame_samples: 480,
  frame_p95_ms: 84,
  slow_50_ratio_pct: 31.25,
  long_task_ratio_pct: 0,
  visibility_interrupted: false,
});
assert.ok(Object.keys(telemetry).length <= 11, 'calibration telemetry must leave Firebase context room');

let completions = 0;
let coordinatedRecommendation = '';
const coordinator = createStartupCalibrationCoordinator((result) => {
  completions += 1;
  coordinatedRecommendation = result.recommendation;
});
coordinator.submitPerformance(performance());
assert.equal(completions, 0, 'calibration waits for the native result');
coordinator.submitDeviceCapabilities(available());
assert.equal(completions, 1);
assert.equal(coordinatedRecommendation, 'KEEP_FULL_QUALITY');
coordinator.submitPerformance(framePressure);
coordinator.submitDeviceCapabilities(available({ isLowRamDevice: true }));
assert.equal(completions, 1, 'calibration completes once even if producers report again');

let reverseOrderCompletions = 0;
const reverseOrder = createStartupCalibrationCoordinator(() => {
  reverseOrderCompletions += 1;
});
reverseOrder.submitDeviceCapabilities(available());
reverseOrder.submitPerformance(performance());
assert.equal(reverseOrderCompletions, 1, 'producer order must not matter');

let nonAndroidCompletions = 0;
const nonAndroid = createStartupCalibrationCoordinator(() => {
  nonAndroidCompletions += 1;
});
nonAndroid.submitDeviceCapabilities({ status: 'UNAVAILABLE', reason: 'NOT_ANDROID' });
nonAndroid.submitPerformance(performance());
assert.equal(nonAndroidCompletions, 0, 'Phase 3 remains Android-only');

const appSource = readFileSync('App.tsx', 'utf8');
assert.match(appSource, /createStartupCalibrationCoordinator/);
assert.match(appSource, /startup_calibration_result/);
assert.match(appSource, /startup_calibration:complete/);
assert.match(appSource, /startup_calibration_recommendation/);

const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
  scripts?: Record<string, string>;
};
assert.ok(packageJson.scripts?.['audit:startup-calibration-phase3']);

console.log('startup calibration phase 3 audit passed');
