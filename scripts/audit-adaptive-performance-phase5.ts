import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  PERFORMANCE_NOTICE_VERSION,
  normalizePerformanceSettings,
} from '../services/performancePreferences';
import {
  advanceAdaptivePerformance,
  createAdaptivePerformanceState,
} from '../services/adaptivePerformanceController';
import {
  classifyRuntimePerformanceWindow,
  startRuntimePerformanceMonitor,
} from '../services/runtimePerformanceMonitor';
import { resolvePerformanceCapabilities } from '../services/performanceCapabilities';

const defaults = normalizePerformanceSettings(undefined, false);
assert.deepEqual(defaults, {
  schemaVersion: 1,
  preference: 'AUTOMATIC',
  noticeVersion: 0,
});
assert.equal(normalizePerformanceSettings(undefined, true).preference, 'PERFORMANCE');
assert.equal(normalizePerformanceSettings({ preference: 'BROKEN' }, false).preference, 'AUTOMATIC');
assert.deepEqual(normalizePerformanceSettings({
  schemaVersion: 1,
  preference: 'CINEMATIC',
  noticeVersion: PERFORMANCE_NOTICE_VERSION,
}, true), {
  schemaVersion: 1,
  preference: 'CINEMATIC',
  noticeVersion: PERFORMANCE_NOTICE_VERSION,
});

const balanced = resolvePerformanceCapabilities({ profile: 'BALANCED' });
assert.equal(balanced.profile, 'BALANCED');
assert.equal(balanced.blur, 'REDUCED');
assert.equal(balanced.backgroundMotion, 'REDUCED');
assert.equal(balanced.offscreenMounting, 'UNMOUNT_INACTIVE');

const startupCalibration = {
  recommendation: 'CONSIDER_OPTIMIZED' as const,
  confidence: 'HIGH' as const,
};
const shadow = createAdaptivePerformanceState({
  preference: 'AUTOMATIC',
  platform: 'ANDROID',
  startupCalibration,
  automaticApplicationEnabled: false,
  nowMs: 0,
});
assert.equal(shadow.recommendedLevel, 'BALANCED');
assert.equal(shadow.appliedLevel, 'FULL');
assert.equal(shadow.shadowMode, true);

let live = createAdaptivePerformanceState({
  preference: 'AUTOMATIC',
  platform: 'ANDROID',
  startupCalibration: null,
  automaticApplicationEnabled: true,
  nowMs: 0,
});
assert.equal(live.appliedLevel, 'FULL');
live = advanceAdaptivePerformance(live, { kind: 'HEALTH_WINDOW', health: 'UNHEALTHY', nowMs: 1, safeBoundary: true }).state;
live = advanceAdaptivePerformance(live, { kind: 'HEALTH_WINDOW', health: 'UNHEALTHY', nowMs: 2, safeBoundary: true }).state;
live = advanceAdaptivePerformance(live, { kind: 'HEALTH_WINDOW', health: 'UNHEALTHY', nowMs: 3, safeBoundary: true }).state;
assert.equal(live.recommendedLevel, 'BALANCED');
assert.equal(live.appliedLevel, 'BALANCED');

// Cooldown plus an unsafe flow must defer the next downgrade.
live = advanceAdaptivePerformance(live, { kind: 'HEALTH_WINDOW', health: 'UNHEALTHY', nowMs: 4, safeBoundary: false }).state;
live = advanceAdaptivePerformance(live, { kind: 'HEALTH_WINDOW', health: 'UNHEALTHY', nowMs: 5, safeBoundary: false }).state;
live = advanceAdaptivePerformance(live, { kind: 'HEALTH_WINDOW', health: 'UNHEALTHY', nowMs: 6, safeBoundary: false }).state;
assert.equal(live.recommendedLevel, 'OPTIMIZED');
assert.equal(live.appliedLevel, 'BALANCED');
assert.equal(live.pendingLevel, 'OPTIMIZED');
live = advanceAdaptivePerformance(live, { kind: 'SAFE_BOUNDARY', nowMs: 120_004 }).state;
assert.equal(live.appliedLevel, 'OPTIMIZED');
assert.equal(live.pendingLevel, null);

// Recovery takes six healthy windows and only one level.
for (let index = 0; index < 6; index += 1) {
  live = advanceAdaptivePerformance(live, {
    kind: 'HEALTH_WINDOW',
    health: 'HEALTHY',
    nowMs: 240_010 + index,
    safeBoundary: true,
  }).state;
}
assert.equal(live.appliedLevel, 'BALANCED');

let deferredOneStep = createAdaptivePerformanceState({
  preference: 'AUTOMATIC',
  platform: 'ANDROID',
  startupCalibration: null,
  automaticApplicationEnabled: true,
  nowMs: 0,
});
for (let index = 0; index < 6; index += 1) {
  deferredOneStep = advanceAdaptivePerformance(deferredOneStep, {
    kind: 'HEALTH_WINDOW',
    health: 'UNHEALTHY',
    nowMs: index + 1,
    safeBoundary: false,
  }).state;
}
assert.equal(deferredOneStep.recommendedLevel, 'BALANCED');
assert.equal(deferredOneStep.pendingLevel, 'BALANCED');

let emergency = createAdaptivePerformanceState({
  preference: 'AUTOMATIC',
  platform: 'ANDROID',
  startupCalibration: null,
  automaticApplicationEnabled: true,
  nowMs: 0,
});
emergency = advanceAdaptivePerformance(emergency, { kind: 'MEMORY_PRESSURE', nowMs: 10, safeBoundary: false }).state;
assert.equal(emergency.recommendedLevel, 'OPTIMIZED');
assert.equal(emergency.appliedLevel, 'FULL');
assert.equal(emergency.pendingLevel, 'OPTIMIZED');
emergency = advanceAdaptivePerformance(emergency, { kind: 'SAFE_BOUNDARY', nowMs: 11 }).state;
assert.equal(emergency.appliedLevel, 'OPTIMIZED');

const cinematic = advanceAdaptivePerformance(emergency, {
  kind: 'PREFERENCE_CHANGED',
  preference: 'CINEMATIC',
  nowMs: 12,
}).state;
assert.equal(cinematic.appliedLevel, 'FULL');
assert.equal(cinematic.recommendedLevel, 'FULL');

const ios = createAdaptivePerformanceState({
  preference: 'AUTOMATIC',
  platform: 'IOS',
  startupCalibration,
  automaticApplicationEnabled: true,
  nowMs: 0,
});
assert.equal(ios.appliedLevel, 'FULL');
assert.equal(ios.recommendedLevel, 'FULL');

assert.equal(classifyRuntimePerformanceWindow({
  eligible: false,
  frameDurationsMs: [16, 16, 16],
  longTaskDurationsMs: [],
  sampledDurationMs: 8_000,
}).health, 'IGNORED');
assert.equal(classifyRuntimePerformanceWindow({
  eligible: true,
  frameDurationsMs: Array.from({ length: 180 }, () => 16),
  longTaskDurationsMs: [],
  sampledDurationMs: 8_000,
}).health, 'HEALTHY');
assert.equal(classifyRuntimePerformanceWindow({
  eligible: true,
  frameDurationsMs: Array.from({ length: 180 }, (_, index) => index < 60 ? 70 : 16),
  longTaskDurationsMs: [350, 200],
  sampledDurationMs: 8_000,
}).health, 'UNHEALTHY');

const timers = new Map<number, () => void>();
const clearedTimers: number[] = [];
const cancelledFrames: number[] = [];
let timerId = 0;
let disconnected = false;
const monitor = startRuntimePerformanceMonitor({
  isEligible: () => true,
  onWindow: () => undefined,
  dependencies: {
    requestFrame: () => 71,
    cancelFrame: id => cancelledFrames.push(id),
    setTimer: callback => {
      timerId += 1;
      timers.set(timerId, callback);
      return timerId;
    },
    clearTimer: id => clearedTimers.push(id),
    now: () => 100,
    createLongTaskObserver: () => ({ disconnect: () => { disconnected = true; } }),
  },
});
assert.equal(timers.size, 1);
timers.get(1)?.();
monitor.stop();
assert(cancelledFrames.includes(71));
assert(clearedTimers.includes(1));
assert(clearedTimers.includes(2));
assert.equal(disconnected, true);

const appSource = readFileSync('App.tsx', 'utf8');
const settingsSource = readFileSync('views/SettingsPage.tsx', 'utf8');
const noticeSource = readFileSync('components/PerformanceOptimizedNotice.tsx', 'utf8');
assert.match(appSource, /VITE_ADAPTIVE_PERFORMANCE_APPLY/);
assert.match(appSource, /kind: 'SAFE_BOUNDARY'/);
assert.match(appSource, /kind: 'MEMORY_PRESSURE'/);
assert.match(settingsSource, /role="radiogroup"/);
assert.match(settingsSource, /'AUTOMATIC'/);
assert.match(settingsSource, /'CINEMATIC'/);
assert.match(settingsSource, /'PERFORMANCE'/);
assert.match(noticeSource, /aria-live="polite"/);
for (const locale of ['en', 'pt-BR', 'fr', 'es', 'de', 'tr']) {
  const localeSource = readFileSync(`services/localization/locales/${locale}.ts`, 'utf8');
  assert.match(localeSource, /settings\.performanceMode\.automatic/);
  assert.match(localeSource, /settings\.performanceNotice\.message/);
}

console.log('adaptive performance phase 5 audit passed');
