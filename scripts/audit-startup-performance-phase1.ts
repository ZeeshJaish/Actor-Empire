import assert from 'node:assert/strict';
import {
  createStartupPerformanceSummary,
  startStartupPerformanceMeasurement,
  toStartupPerformanceTelemetry,
} from '../services/startupPerformance';

const summary = createStartupPerformanceSummary({
  startupStartedAtMs: 0,
  samplingStartedAtMs: 100,
  completedAtMs: 260,
  frameTimestampsMs: [100, 116, 134, 174, 249],
  longTaskDurationsMs: [52.4, 80.2],
  runtimeHints: {
    logicalProcessors: 8,
    deviceMemoryGb: 4,
    jsHeapUsedBytes: 64 * 1024 * 1024,
    jsHeapTotalBytes: 96 * 1024 * 1024,
    jsHeapLimitBytes: 512 * 1024 * 1024,
  },
});

assert.deepEqual(summary, {
  schemaVersion: 1,
  startupDurationMs: 260,
  sampledDurationMs: 160,
  frameSampleCount: 4,
  frameP50Ms: 18,
  frameP95Ms: 75,
  longestFrameMs: 75,
  slowFrameCount: 2,
  playSlowFrameCount: 1,
  severeFrameCount: 0,
  slowFrameRatio: 0.5,
  playSlowFrameRatio: 0.25,
  longTaskCount: 2,
  longTaskTotalMs: 133,
  longestLongTaskMs: 80,
  visibilityInterrupted: false,
  logicalProcessors: 8,
  deviceMemoryGb: 4,
  jsHeapUsedMb: 64,
  jsHeapTotalMb: 96,
  jsHeapLimitMb: 512,
});

let currentTimeMs = 100;
let nextFrameId = 0;
let cancelledFrameId: number | null = null;
let observerDisconnected = false;
let visibilityObserverDisconnected = false;
let reportLongTask: ((durationMs: number) => void) | undefined;
let reportVisibilityInterruption: (() => void) | undefined;
const pendingFrames = new Map<number, (timestampMs: number) => void>();

const session = startStartupPerformanceMeasurement({
  startupStartedAtMs: 0,
  now: () => currentTimeMs,
  requestFrame: (callback) => {
    nextFrameId += 1;
    pendingFrames.set(nextFrameId, callback);
    return nextFrameId;
  },
  cancelFrame: (frameId) => {
    cancelledFrameId = frameId;
    pendingFrames.delete(frameId);
  },
  observeLongTasks: (callback) => {
    reportLongTask = callback;
    return {
      disconnect: () => {
        observerDisconnected = true;
      },
    };
  },
  observeVisibilityInterruption: (callback) => {
    reportVisibilityInterruption = callback;
    return {
      disconnect: () => {
        visibilityObserverDisconnected = true;
      },
    };
  },
  readRuntimeHints: () => ({ logicalProcessors: 6 }),
});

const runNextFrame = (timestampMs: number) => {
  const next = [...pendingFrames.entries()][0];
  assert.ok(next, 'expected a scheduled animation frame');
  pendingFrames.delete(next[0]);
  next[1](timestampMs);
};

runNextFrame(116);
runNextFrame(156);
reportLongTask?.(62);
reportVisibilityInterruption?.();
currentTimeMs = 200;

const measured = session.complete();
assert.equal(measured.startupDurationMs, 200);
assert.equal(measured.sampledDurationMs, 100);
assert.equal(measured.frameSampleCount, 1);
assert.equal(measured.slowFrameCount, 1);
assert.equal(measured.playSlowFrameCount, 0);
assert.equal(measured.longTaskCount, 1);
assert.equal(measured.visibilityInterrupted, true);
assert.equal(measured.logicalProcessors, 6);
assert.equal(cancelledFrameId, 3);
assert.equal(observerDisconnected, true);
assert.equal(visibilityObserverDisconnected, true);
assert.deepEqual(session.complete(), measured, 'completion must be idempotent');

const partialSummary = createStartupPerformanceSummary({
  startupStartedAtMs: 10,
  samplingStartedAtMs: 20,
  completedAtMs: 5,
  frameTimestampsMs: [Number.NaN, 100, 116],
  longTaskDurationsMs: [Number.NaN, -1, 51],
});
assert.equal(partialSummary.startupDurationMs, 0);
assert.equal(partialSummary.sampledDurationMs, 0);
assert.equal(partialSummary.frameSampleCount, 1);
assert.equal(partialSummary.frameP95Ms, 16);
assert.equal(partialSummary.longTaskCount, 1);
assert.equal(partialSummary.logicalProcessors, undefined);

const telemetry = toStartupPerformanceTelemetry(summary);
assert.deepEqual(telemetry, {
  schema_version: 1,
  startup_ms: 260,
  sampled_ms: 160,
  frame_samples: 4,
  frame_p95_ms: 75,
  severe_frames: 0,
  slow_frame_ratio_pct: 50,
  long_tasks: 2,
  long_task_total_ms: 133,
  visibility_interrupted: 0,
  heap_used_mb: 64,
});
assert.ok(Object.keys(telemetry).length <= 11, 'the payload must leave room for shared Firebase context');
assert.ok(Object.values(toStartupPerformanceTelemetry(partialSummary)).every((value) => value !== undefined));

console.log('startup performance phase 1 audit passed');
