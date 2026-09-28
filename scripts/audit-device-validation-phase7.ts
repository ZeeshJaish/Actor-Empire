import assert from 'node:assert/strict';
import {
    collectDueDeviceValidationCheckpoints,
    createDeviceValidationSession,
    recordDeviceValidationDecision,
    recordDeviceValidationHealthWindow,
    recordDeviceValidationNativeSnapshot,
    setDeviceValidationSessionActive,
    toDeviceValidationTelemetry,
} from '../services/deviceValidation';

const MINUTE = 60_000;

let healthy = createDeviceValidationSession({
    platform: 'IOS',
    preference: 'AUTOMATIC',
    initialAppliedLevel: 'FULL',
    nowMs: 0,
});
healthy = recordDeviceValidationHealthWindow(healthy, {
    health: 'HEALTHY', reason: 'STABLE', frameSampleCount: 480,
    frameP95Ms: 16.7, slowFrameRatio: 0.01, longTaskBlockedRatio: 0,
}, 10 * MINUTE);
healthy = setDeviceValidationSessionActive(healthy, false, 10 * MINUTE);
healthy = setDeviceValidationSessionActive(healthy, true, 25 * MINUTE);

let result = collectDueDeviceValidationCheckpoints(healthy, 44 * MINUTE);
assert.equal(result.summaries.length, 0, 'background time must not count toward a long-session checkpoint');
result = collectDueDeviceValidationCheckpoints(result.state, 45 * MINUTE);
assert.equal(result.summaries.length, 1);
assert.equal(result.summaries[0].checkpointMinutes, 30);
assert.equal(result.summaries[0].activeDurationMinutes, 30);
assert.equal(result.summaries[0].fullQualityMaintained, true);
assert.equal(result.summaries[0].status, 'HEALTHY');

const repeated = collectDueDeviceValidationCheckpoints(result.state, 46 * MINUTE);
assert.equal(repeated.summaries.length, 0, 'a checkpoint must emit once per session');

let pressured = createDeviceValidationSession({
    platform: 'ANDROID',
    preference: 'AUTOMATIC',
    initialAppliedLevel: 'FULL',
    nowMs: 0,
});
pressured = recordDeviceValidationHealthWindow(pressured, {
    health: 'UNHEALTHY', reason: 'MAIN_THREAD_PRESSURE', frameSampleCount: 300,
    frameP95Ms: 74.2, slowFrameRatio: 0.31, longTaskBlockedRatio: 0.22,
}, 5 * MINUTE);
pressured = recordDeviceValidationNativeSnapshot(pressured, {
    schemaVersion: 1, capturedAtEpochMs: 5 * MINUTE, apiLevel: 30,
    androidRelease: '11', isLowRamDevice: true, memoryClassMb: 192,
    largeMemoryClassMb: 256, totalMemoryMb: 2048, availableMemoryMb: 180,
    availableMemoryRatio: 0.0879, lowMemory: true, memoryThresholdMb: 160,
    thermalStatus: 4, thermalStatusLabel: 'CRITICAL', webViewVersion: '140.0.0', webViewMajor: 140,
}, 6 * MINUTE);
pressured = recordDeviceValidationDecision(pressured, {
    type: 'APPLIED', from: 'FULL', to: 'BALANCED', reason: 'RUNTIME_PRESSURE', shadowMode: false,
}, 7 * MINUTE);
const pressureResult = collectDueDeviceValidationCheckpoints(pressured, 60 * MINUTE);
assert.deepEqual(pressureResult.summaries.map(summary => summary.checkpointMinutes), [30, 60]);
assert.equal(pressureResult.summaries[1].status, 'PRESSURE_OBSERVED');
assert.equal(pressureResult.summaries[1].fullQualityMaintained, false);
assert.equal(pressureResult.summaries[1].profileChangeCount, 1);
assert.equal(pressureResult.summaries[1].minimumAvailableMemoryPercent, 9);
assert.equal(pressureResult.summaries[1].maximumThermalStatus, 4);

const telemetry = toDeviceValidationTelemetry(pressureResult.summaries[1]);
assert.deepEqual(Object.keys(telemetry).sort(), [
    'active_minutes', 'checkpoint_minutes', 'current_level', 'frame_p95_max_ms',
    'full_quality_maintained', 'healthy_windows', 'ignored_windows', 'initial_level',
    'long_task_ratio_max_pct', 'low_memory_observations', 'max_thermal_status',
    'min_available_memory_pct', 'platform', 'preference', 'profile_changes',
    'slow_frame_ratio_max_pct', 'status', 'unhealthy_windows',
].sort(), 'telemetry must stay bounded and contain no device or player identifiers');

console.log('Adaptive performance Phase 7 device-validation audit passed.');
