import assert from 'node:assert/strict';

import {
  createIOSLongSessionCheckpoint,
  getIOSLongSessionPlayerCounts,
  normalizeIOSLongSessionNativeState,
  toIOSLongSessionTelemetry,
} from '../services/iosLongSessionDiagnostics';

const checkpoint = createIOSLongSessionCheckpoint({
  checkpoint: 'week_verified',
  occurredAtMs: 4_200_000_000_123.9,
  age: 27.8,
  week: 53,
  saveSlot: 2,
  screen: `HOME-${'x'.repeat(140)}`,
  runtimeBytes: 26_721_695.7,
  persistedBytes: 23_176_686.2,
  worldProjects: 236.8,
  rightsContracts: 102.2,
  platformPlans: 180.9,
  industryEvents: 520.1,
  ignoredSaveContent: 'must never cross the native diagnostics bridge',
} as never);

assert.deepEqual(checkpoint, {
  checkpoint: 'week_verified',
  occurredAtMs: 4_200_000_000_123,
  age: 27,
  week: 52,
  saveSlot: 2,
  screen: `HOME-${'x'.repeat(75)}`,
  runtimeBytes: 26_721_695,
  persistedBytes: 23_176_686,
  worldProjects: 236,
  rightsContracts: 102,
  platformPlans: 180,
  industryEvents: 520,
});
assert.equal('ignoredSaveContent' in checkpoint, false, 'save content must never enter native diagnostics');

assert.deepEqual(getIOSLongSessionPlayerCounts({
  world: {
    projects: [{}, {}],
    streamingRightsContracts: { one: {}, two: {}, three: {} },
    platforms: {
      A: { ai: { slate: [{}, {}] } },
      B: { ai: { slate: [{}] } },
    },
    industryEvents: { events: [{}, {}, {}, {}] },
  },
} as never), {
  worldProjects: 2,
  rightsContracts: 3,
  platformPlans: 3,
  industryEvents: 4,
});

const state = normalizeIOSLongSessionNativeState({
  available: true,
  sessionId: `session-${'a'.repeat(120)}`,
  reportId: `report-${'b'.repeat(120)}`,
  reportPending: true,
  previousTerminationKind: 'WEB_CONTENT_TERMINATED',
  launchCount: 4.9,
  memoryWarningCount: 3.7,
  rendererTerminationCount: 2.8,
  previousSessionAge: 27.9,
  previousSessionWeek: 0,
  previousSessionScreen: `STREAMING-${'c'.repeat(120)}`,
  previousRuntimeBytes: 26_721_695.8,
  previousPersistedBytes: 23_176_686.8,
  previousAppVersion: '1.0.25',
  previousBuildNumber: '21',
  previousDeviceModel: 'iPhone',
  previousOSVersion: 'iOS 26.0',
});

assert.equal(state.sessionId.length, 80);
assert.equal(state.reportId?.length, 80);
assert.equal(state.previousTerminationKind, 'WEB_CONTENT_TERMINATED');
assert.equal(state.launchCount, 4);
assert.equal(state.memoryWarningCount, 3);
assert.equal(state.rendererTerminationCount, 2);
assert.equal(state.previousSessionAge, 27);
assert.equal(state.previousSessionWeek, 1);
assert.equal(state.previousSessionScreen?.length, 80);

assert.deepEqual(toIOSLongSessionTelemetry(state), {
  report_id: state.reportId,
  termination_kind: 'web_content_terminated',
  launch_count: 4,
  memory_warning_count: 3,
  renderer_termination_count: 2,
  previous_age: 27,
  previous_week: 1,
  previous_screen: state.previousSessionScreen,
  runtime_size_mb: 26.7,
  persisted_size_mb: 23.2,
  previous_app_version: '1.0.25',
  previous_build_number: '21',
  device_model: 'iPhone',
  os_version: 'iOS 26.0',
});

const unavailable = normalizeIOSLongSessionNativeState(null);
assert.deepEqual(unavailable, {
  available: false,
  reportPending: false,
  launchCount: 0,
  memoryWarningCount: 0,
  rendererTerminationCount: 0,
});

console.log('iOS long-session phase 1-2 diagnostics audit passed.');
