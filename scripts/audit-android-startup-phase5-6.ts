import assert from 'node:assert/strict';
import {
  beginStartupAttempt,
  beginStartupRetry,
  completeStartupTask,
  createStartupState,
  failStartupTask,
  recoverStartupTask,
} from '../services/startupCoordinator';
import { createStartupExecutionLock } from '../services/startupExecutionLock';
import {
  createStartupBackgroundScheduler,
  type StartupIdleDeadline,
} from '../services/startupBackgroundPreparation';
import { advanceStartupFailureCount } from '../services/startupSafeMode';

let retryState = beginStartupAttempt(createStartupState());
const firstAttemptId = retryState.attemptId;
retryState = completeStartupTask(retryState, 'APP_CORE', firstAttemptId);
retryState = completeStartupTask(retryState, 'CRITICAL_ASSETS', firstAttemptId);
retryState = failStartupTask(
  retryState,
  'STORAGE',
  firstAttemptId,
  'Storage did not respond.',
  'STORAGE',
);

const storageRetry = beginStartupRetry(retryState);
assert.equal(storageRetry.attemptId, firstAttemptId + 1, 'a retry invalidates late work from the failed attempt');
assert.equal(storageRetry.progress, 25, 'retry preserves completed startup work');
assert.equal(storageRetry.tasks.APP_CORE.status, 'READY');
assert.equal(storageRetry.tasks.CRITICAL_ASSETS.status, 'READY');
assert.equal(storageRetry.tasks.STORAGE.status, 'RUNNING', 'only the failed task restarts');
assert.equal(storageRetry.tasks.SAVE_SUMMARIES.status, 'PENDING');
assert.equal(storageRetry.failure, null);

retryState = recoverStartupTask(storageRetry, 'STORAGE', storageRetry.attemptId);
assert.equal(retryState.tasks.STORAGE.status, 'RECOVERED');
assert.equal(retryState.progress, 50, 'recovered work contributes its real progress weight');
retryState = completeStartupTask(retryState, 'SAVE_SUMMARIES', retryState.attemptId);
retryState = completeStartupTask(retryState, 'HOME_SCREEN', retryState.attemptId);
retryState = completeStartupTask(retryState, 'FIRST_SCREEN', retryState.attemptId);
assert.equal(retryState.outcome, 'READY');
assert.equal(retryState.progress, 100);

assert.deepEqual(
  advanceStartupFailureCount(0, 'CRITICAL_ASSETS'),
  { count: 1, shouldArmSafeMode: false },
  'the first critical failure keeps normal visual quality and recovery behavior',
);
assert.deepEqual(
  advanceStartupFailureCount(1, 'CRITICAL_ASSETS'),
  { count: 2, shouldArmSafeMode: true },
  'a repeated critical asset failure automatically arms the lightweight boot path',
);
assert.deepEqual(
  advanceStartupFailureCount(4, 'STORAGE'),
  { count: 5, shouldArmSafeMode: false },
  'storage problems must never be mislabeled as a reason to change rendering mode',
);

const executionLock = createStartupExecutionLock();
const firstLease = executionLock.tryAcquire();
assert.ok(firstLease, 'the first startup execution acquires the lock');
assert.equal(executionLock.tryAcquire(), null, 'a rapid second tap cannot start concurrent startup work');
executionLock.release(Symbol('not-the-owner'));
assert.equal(executionLock.tryAcquire(), null, 'only the owning execution can release the lock');
executionLock.release(firstLease);
assert.ok(executionLock.tryAcquire(), 'the lock becomes available after the owner releases it');

const idleCallbacks = new Map<number, (deadline: StartupIdleDeadline) => void>();
let nextIdleId = 1;
const prepared: string[] = [];
const optionalErrors: string[] = [];
const scheduler = createStartupBackgroundScheduler({
  requestIdle: callback => {
    const id = nextIdleId++;
    idleCallbacks.set(id, callback);
    return id;
  },
  cancelIdle: id => { idleCallbacks.delete(Number(id)); },
  onTaskError: (taskId, error) => {
    optionalErrors.push(`${taskId}:${error instanceof Error ? error.message : String(error)}`);
  },
});

const runNextIdle = async () => {
  const entry = idleCallbacks.entries().next().value as [number, (deadline: StartupIdleDeadline) => void] | undefined;
  assert.ok(entry, 'an idle task should be scheduled');
  idleCallbacks.delete(entry[0]);
  entry[1]({ didTimeout: false, timeRemaining: () => 12 });
  await new Promise<void>(resolve => setTimeout(resolve, 0));
};

scheduler.enqueue([
  { id: 'creation', prepare: async () => { prepared.push('creation'); } },
  { id: 'career', prepare: async () => { prepared.push('career'); } },
]);
await runNextIdle();
assert.deepEqual(prepared, ['creation'], 'background preparation performs one bounded task per idle turn');
scheduler.cancelPending();
assert.equal(idleCallbacks.size, 0, 'player intent cancels queued low-priority preparation');
assert.deepEqual(prepared, ['creation']);

await scheduler.runNow({ id: 'career', prepare: async () => { prepared.push('career-now'); } });
assert.deepEqual(prepared, ['creation', 'career-now'], 'the requested screen can be promoted immediately');

scheduler.enqueue([
  { id: 'optional-failure', prepare: async () => { throw new Error('optional unavailable'); } },
  { id: 'social', prepare: async () => { prepared.push('social'); } },
]);
await runNextIdle();
await runNextIdle();
assert.deepEqual(optionalErrors, ['optional-failure:optional unavailable']);
assert.deepEqual(prepared, ['creation', 'career-now', 'social'], 'an optional preload failure never blocks later work');

scheduler.dispose();
assert.equal(idleCallbacks.size, 0);

console.log('Android startup phase 5-6 audit passed.');
