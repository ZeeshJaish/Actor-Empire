import assert from 'node:assert/strict';
import {
  createStartupDiagnosticsRecorder,
  type StartupDiagnosticEvent,
} from '../services/startupDiagnostics';

let nowMs = 1_000;
const nativeEvents: StartupDiagnosticEvent[] = [];
const analyticsEvents: StartupDiagnosticEvent[] = [];
const recorder = createStartupDiagnosticsRecorder({
  startedAtMs: 900,
  nowMs: () => nowMs,
  isOnline: () => false,
  notifyNative: async event => { nativeEvents.push(event); },
  maxBufferedEvents: 3,
});

recorder.setContext({
  appVersion: '1.0.25',
  androidVersion: '15',
  webViewVersion: '140.0.0.0',
  memoryClassMb: 256,
  rendererRestartCount: 2,
  playerSave: { cash: 99_000_000 },
} as never);

const first = recorder.record('bundle_started', {
  failedTask: 'APP_CORE',
  failureCode: 'none',
});
assert.deepEqual(first, {
  checkpoint: 'bundle_started',
  occurredAtMs: 1_000,
  durationMs: 100,
  online: false,
  appVersion: '1.0.25',
  androidVersion: '15',
  webViewVersion: '140.0.0.0',
  memoryClassMb: 256,
  rendererRestartCount: 2,
  failedTask: 'APP_CORE',
  failureCode: 'none',
});
assert.equal('playerSave' in first, false, 'save contents must never enter startup diagnostics');

const stopSink = recorder.installSink(event => { analyticsEvents.push(event); });
assert.equal(analyticsEvents.length, 1, 'installing telemetry replays bounded pre-analytics checkpoints');

nowMs = 1_100;
recorder.record('react_started');
nowMs = 1_200;
recorder.record('storage_started');
nowMs = 1_300;
recorder.record('storage_ready');

assert.deepEqual(
  recorder.getBufferedEvents().map(event => event.checkpoint),
  ['react_started', 'storage_started', 'storage_ready'],
  'the diagnostic buffer must remain bounded and retain the newest checkpoints',
);
assert.equal(nativeEvents.length, 4, 'every JavaScript checkpoint is forwarded to native recovery');
assert.equal(analyticsEvents.length, 4, 'the installed sink receives live checkpoints after replay');

stopSink();
nowMs = 1_400;
recorder.record('first_screen_ready');
assert.equal(analyticsEvents.length, 4, 'uninstalled analytics sinks receive no later events');

console.log('Android startup phase 7-9 diagnostics audit passed.');
