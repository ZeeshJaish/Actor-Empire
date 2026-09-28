import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { autosaveDelayAfterPressure, createSaveOperationQueue } from '../services/saveOperationQueue';
import { checkpointNativeMemoryPressure } from '../services/nativeMemoryCheckpoint';
import { advanceAdaptivePerformance, createAdaptivePerformanceState } from '../services/adaptivePerformanceController';
import { resolvePerformanceCapabilities } from '../services/performanceCapabilities';
import { clearGeneratedAvatarCache, getGeneratedAvatarCacheSize, getGenderedAvatar } from '../services/npcAvatar';

let releaseFirst!: () => void;
const firstGate = new Promise<void>(resolve => { releaseFirst = resolve; });
const active: string[] = [];
const order: string[] = [];
const queue = createSaveOperationQueue();
assert.equal(autosaveDelayAfterPressure(800, 1_000, 31_000), 30_000);
assert.equal(autosaveDelayAfterPressure(800, 31_000, 31_000), 800);
const first = queue.run(async () => {
  active.push('first');
  await firstGate;
  active.pop();
  order.push('first');
});
const second = queue.run(async () => {
  assert.equal(active.length, 0, 'save preparation must not overlap');
  order.push('second');
});
await Promise.resolve();
assert.deepEqual(order, []);
releaseFirst();
await Promise.all([first, second]);
assert.deepEqual(order, ['first', 'second']);
await assert.rejects(queue.run(async () => { throw new Error('failed save'); }), /failed save/);
await queue.run(async () => { order.push('after failure'); });
assert.equal(order.at(-1), 'after failure');

let releaseBlocking!: () => void;
const blocking = new Promise<void>(resolve => { releaseBlocking = resolve; });
const blocker = queue.run(async () => { await blocking; });
const stale = queue.runLatest('slot:1', async () => { order.push('stale'); return 'stale'; }, () => 'superseded');
const latest = queue.runLatest('slot:1', async () => { order.push('latest'); return 'latest'; }, () => 'superseded');
assert.equal(await stale, 'superseded');
releaseBlocking();
await blocker;
assert.equal(await latest, 'latest');
assert.equal(order.includes('stale'), false);
let releasePressureBlock!: () => void;
const pressureBlock = new Promise<void>(resolve => { releasePressureBlock = resolve; });
const activeSave = queue.run(async () => { await pressureBlock; });
const queuedAutosave = queue.runLatest('slot:2', async () => { order.push('pressure autosave'); return 'written'; }, () => 'cancelled');
queue.cancelPendingOptional('slot:2');
assert.equal(await queuedAutosave, 'cancelled');
releasePressureBlock();
await activeSave;
assert.equal(order.includes('pressure autosave'), false);

let cancelled = 0;
let checkpointWrites = 0;
const ready = await checkpointNativeMemoryPressure({
  isPlaying: true,
  currentSlot: 2,
  isWeekProcessing: false,
  isSaveTransferActive: false,
  hasVerifiedCheckpoint: () => true,
  cancelPendingAutosave: () => { cancelled += 1; },
});
assert.deepEqual(ready, { status: 'READY', slot: 2 });
assert.equal(cancelled, 1);
assert.equal(checkpointWrites, 0);
const missing = await checkpointNativeMemoryPressure({
  isPlaying: true,
  currentSlot: 1,
  isWeekProcessing: false,
  hasVerifiedCheckpoint: () => false,
  cancelPendingAutosave: () => { cancelled += 1; },
});
assert.deepEqual(missing, { status: 'SKIPPED', reason: 'NO_VERIFIED_CHECKPOINT' });
assert.equal(cancelled, 2);

let ios = createAdaptivePerformanceState({
  preference: 'AUTOMATIC',
  platform: 'IOS',
  startupCalibration: null,
  automaticApplicationEnabled: false,
  nowMs: 0,
});
assert.equal(ios.appliedLevel, 'FULL');
assert.equal(ios.shadowMode, false);
for (let index = 1; index <= 3; index += 1) {
  ios = advanceAdaptivePerformance(ios, {
    kind: 'HEALTH_WINDOW', health: 'UNHEALTHY', nowMs: index, safeBoundary: true,
  }).state;
}
assert.equal(ios.appliedLevel, 'BALANCED');
ios = advanceAdaptivePerformance(ios, { kind: 'MEMORY_PRESSURE', nowMs: 4, safeBoundary: true }).state;
assert.equal(ios.appliedLevel, 'OPTIMIZED');
for (let index = 0; index < 6; index += 1) {
  ios = advanceAdaptivePerformance(ios, {
    kind: 'HEALTH_WINDOW', health: 'HEALTHY', nowMs: 124_005 + index, safeBoundary: true,
  }).state;
}
assert.equal(ios.appliedLevel, 'BALANCED');
assert.equal(resolvePerformanceCapabilities({ profile: 'OPTIMIZED', preserveImageQuality: true }).imageQualityBudget, 'FULL');
for (let index = 0; index < 120; index += 1) getGenderedAvatar('MALE', `pressure-test-${index}`);
assert(getGeneratedAvatarCacheSize() <= 96, 'generated image cache must be bounded');
clearGeneratedAvatarCache();
assert.equal(getGeneratedAvatarCacheSize(), 0);

const app = readFileSync('App.tsx', 'utf8');
assert.match(app, /saveOperationQueueRef\.current\.runLatest/);
assert.match(app, /hasVerifiedCheckpoint:/);
assert.match(app, /adaptivePerformancePlatform !== 'WEB'/);
assert.match(app, /preserveImageQuality: adaptivePerformancePlatform === 'IOS'/);
assert.match(app, /options\.reason === 'AUTOSAVE' && Date\.now\(\) < iosSaveCooldownUntilRef\.current/);
assert.match(app, /persistSlotSave\(currentSlot, player, \{ reason: 'AUTOSAVE' \}\)/);
assert.match(app, /decision\.reason === 'RUNTIME_RECOVERY' && decision\.to === 'FULL'/);
assert.match(app, /IOS_MEMORY_WARNING_AUTOSAVE_COOLDOWN_MS = 30_000/);
console.log('iOS save and pressure phase 5/6 audit passed');
