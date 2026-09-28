import assert from 'node:assert/strict';
import {
  beginStartupAttempt,
  completeStartupTask,
  createStartupState,
  failStartupTask,
  startStartupTask,
  timeoutStartupTask,
} from '../services/startupCoordinator';

let state = beginStartupAttempt(createStartupState());
const firstAttempt = state.attemptId;

assert.equal(state.progress, 0, 'a new attempt starts at zero real progress');
assert.equal(state.outcome, 'RUNNING');

state = completeStartupTask(state, 'APP_CORE', firstAttempt);
assert.equal(state.progress, 10, 'app mount contributes its declared weight');

state = completeStartupTask(state, 'CRITICAL_ASSETS', firstAttempt);
assert.equal(state.progress, 25, 'critical assets contribute only after they are verified');

state = startStartupTask(state, 'STORAGE', firstAttempt);
assert.equal(state.progress, 25, 'starting work does not fabricate progress');
state = completeStartupTask(state, 'STORAGE', firstAttempt);
assert.equal(state.progress, 50);
state = completeStartupTask(state, 'SAVE_SUMMARIES', firstAttempt);
assert.equal(state.progress, 70);
state = completeStartupTask(state, 'HOME_SCREEN', firstAttempt);
assert.equal(state.progress, 90);
state = completeStartupTask(state, 'FIRST_SCREEN', firstAttempt);
assert.equal(state.progress, 100);
assert.equal(state.outcome, 'READY');

const completedState = state;
state = startStartupTask(state, 'STORAGE', firstAttempt);
assert.deepEqual(state, completedState, 'terminal ready state cannot regress');

state = beginStartupAttempt(state);
const retryAttempt = state.attemptId;
state = completeStartupTask(state, 'APP_CORE', retryAttempt);
state = failStartupTask(state, 'STORAGE', retryAttempt, 'Storage could not be opened.');
assert.equal(state.outcome, 'FAILED');
assert.equal(state.failure?.taskId, 'STORAGE');
assert.equal(state.progress, 10, 'failure does not pretend the failed task completed');

const failedState = state;
state = completeStartupTask(state, 'STORAGE', firstAttempt);
assert.deepEqual(state, failedState, 'late results from an old attempt are ignored');

state = beginStartupAttempt(state);
const timeoutAttempt = state.attemptId;
state = completeStartupTask(state, 'APP_CORE', timeoutAttempt);
state = timeoutStartupTask(state, 'STORAGE', timeoutAttempt, 'Storage took too long.');
assert.equal(state.outcome, 'TIMED_OUT');
assert.equal(state.tasks.STORAGE.status, 'TIMED_OUT');

console.log('Android startup phase 1-2 coordinator audit passed.');
