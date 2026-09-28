import assert from 'node:assert/strict';

import { chooseIOSRendererRecoverySlot, createIOSLongSessionCheckpoint, isIOSRendererRecoveryLoadVerified, normalizeIOSLongSessionNativeState, tryIOSRendererRecoveryOpen } from '../services/iosLongSessionDiagnostics';

assert.equal(createIOSLongSessionCheckpoint({ checkpoint: 'startup_ready' }).checkpoint, 'startup_ready',
  'the native overlay must receive a signal only after the app shell reaches its ready boundary');

const terminated = normalizeIOSLongSessionNativeState({
  available: true,
  reportPending: true,
  reportId: 'report-1',
  previousTerminationKind: 'WEB_CONTENT_TERMINATED',
  previousSessionSaveSlot: 2,
});
assert.equal(chooseIOSRendererRecoverySlot(terminated, { 1: false, 2: true, 3: false }), 2,
  'renderer recovery should reopen the recorded slot only when startup found its save');
assert.equal(chooseIOSRendererRecoverySlot(terminated, { 1: true, 2: false, 3: false }), null,
  'a missing recorded slot must not silently open another career');
assert.equal(chooseIOSRendererRecoverySlot({ ...terminated, reportPending: false }, { 2: true }), null,
  'an ordinary launch must not auto-open a career');
assert.equal(chooseIOSRendererRecoverySlot({ ...terminated, previousSessionSaveSlot: 8 }, { 2: true, 8: true }), null,
  'out-of-range native slot data must not select a career');
assert.equal(normalizeIOSLongSessionNativeState({
  available: true,
  reportPending: true,
  reportId: 'report-2',
  previousTerminationKind: 'WEB_CONTENT_TERMINATED',
  previousSessionSaveSlot: 8,
}).previousSessionSaveSlot, undefined,
  'normalization must reject an invalid slot instead of clamping it onto another career');
assert.equal(chooseIOSRendererRecoverySlot({ ...terminated, previousTerminationKind: 'BACKGROUND_TERMINATED' }, { 2: true }), null,
  'a normal background termination must leave the usual start menu flow');
assert.equal(isIOSRendererRecoveryLoadVerified('CURRENT'), true);
assert.equal(isIOSRendererRecoveryLoadVerified('LEGACY_UNVERIFIED'), false);
assert.equal(isIOSRendererRecoveryLoadVerified('RECOVERY_AVAILABLE'), false);
assert.equal(isIOSRendererRecoveryLoadVerified('UNRECOVERABLE'), false);
const openError = new Error('startup preparation failed');
assert.deepEqual(await tryIOSRendererRecoveryOpen(2, async () => { throw openError; }),
  { ok: false, error: openError }, 'a failed reopen must settle without an unhandled rejection');
let openedSlot: number | null = null;
assert.deepEqual(await tryIOSRendererRecoveryOpen(2, async slot => { openedSlot = slot; }), { ok: true });
assert.equal(openedSlot, 2);

console.log('iOS renderer recovery phase 7 decision audit passed.');
