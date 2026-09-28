import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ActorEmpireLoadingScreen } from '../components/ActorEmpireIntro';
import {
  beginStartupAttempt,
  completeStartupTask,
  createStartupState,
  failStartupTask,
  startStartupTask,
} from '../services/startupCoordinator';
import {
  getStartupPresentation,
  type StartupPresentation,
} from '../services/startupPresentation';
import {
  prepareCriticalStartupAssets,
} from '../services/startupCriticalPackage';

const complete = (
  state: ReturnType<typeof createStartupState>,
  taskId: Parameters<typeof completeStartupTask>[1],
) => completeStartupTask(state, taskId, state.attemptId);

let state = beginStartupAttempt(createStartupState());
state = complete(state, 'APP_CORE');
assert.equal(state.progress, 10, 'the mounted app shell contributes only its real startup weight');

state = startStartupTask(state, 'CRITICAL_ASSETS', state.attemptId);
assert.equal(
  getStartupPresentation(state).status,
  'Checking game files…',
  'critical local assets have a truthful player-facing status',
);
state = complete(state, 'CRITICAL_ASSETS');
state = complete(state, 'STORAGE');
state = complete(state, 'SAVE_SUMMARIES');
state = complete(state, 'HOME_SCREEN');
state = complete(state, 'FIRST_SCREEN');
assert.equal(state.progress, 100);
assert.equal(state.outcome, 'READY');

const slowState = startStartupTask(
  beginStartupAttempt(createStartupState()),
  'STORAGE',
  1,
);
assert.equal(
  getStartupPresentation(slowState, { takingLonger: true }).supportingMessage,
  'Taking a moment. Your careers are safe.',
  'slow startup reassures the player without inventing progress',
);

let failedState = beginStartupAttempt(createStartupState());
failedState = failStartupTask(
  failedState,
  'CRITICAL_ASSETS',
  failedState.attemptId,
  'A required startup file could not be loaded.',
  'NETWORK',
);
const networkPresentation = getStartupPresentation(failedState);
assert.deepEqual(networkPresentation.failure, {
  title: 'Connection interrupted',
  message: 'A network issue interrupted startup. Retry now. If it continues, restart the game.',
  primaryActionLabel: 'Retry',
  secondaryActionLabel: 'Restart Game',
});

const renderFailure = (presentation: StartupPresentation) => renderToStaticMarkup(
  <ActorEmpireLoadingScreen
    progress={failedState.progress}
    status={presentation.status}
    supportingMessage={presentation.supportingMessage}
    errorTitle={presentation.failure?.title}
    error={presentation.failure?.message}
    primaryActionLabel={presentation.failure?.primaryActionLabel}
    secondaryActionLabel={presentation.failure?.secondaryActionLabel}
    onPrimaryAction={() => undefined}
    onSecondaryAction={() => undefined}
  />,
);

const networkMarkup = renderFailure(networkPresentation);
assert.match(networkMarkup, />Retry</, 'network recovery exposes Retry');
assert.match(networkMarkup, />Restart Game</, 'network recovery exposes Restart Game');
assert.doesNotMatch(networkMarkup, /Continue Offline/i, 'startup never offers an unsafe offline bypass');
assert.match(networkMarkup, /min-h-12/, 'both recovery actions use accessible mobile touch targets');

const retryingMarkup = renderToStaticMarkup(
  <ActorEmpireLoadingScreen
    progress={failedState.progress}
    status={networkPresentation.status}
    error={networkPresentation.failure?.message}
    primaryActionLabel="Retry"
    onPrimaryAction={() => undefined}
    isPrimaryActionBusy
  />,
);
assert.match(retryingMarkup, /disabled=""/, 'the retry button is disabled while the task-level retry owns the lock');
assert.match(retryingMarkup, />Retrying…</, 'the recovery card clearly reports an active retry');

let storageFailedState = beginStartupAttempt(createStartupState());
storageFailedState = failStartupTask(
  storageFailedState,
  'STORAGE',
  storageFailedState.attemptId,
  'IndexedDB did not respond.',
  'STORAGE',
);
const storagePresentation = getStartupPresentation(storageFailedState);
assert.equal(storagePresentation.failure?.title, 'Career storage did not respond');
assert.match(storagePresentation.failure?.message || '', /careers have not been changed/i);
assert.equal(storagePresentation.failure?.primaryActionLabel, 'Retry');
assert.equal(storagePresentation.failure?.secondaryActionLabel, 'Restart Game');

const run = async () => {
  const assetCalls: string[] = [];
  await prepareCriticalStartupAssets({
    loadImage: async path => { assetCalls.push(path); },
    loadFonts: async families => { assetCalls.push(...families); },
  });
  assert.deepEqual(
    assetCalls.sort(),
    ['/assets/actor-empire-intro.png', 'Anton', 'Archivo'].sort(),
    'the startup package verifies only the local assets needed for the branded shell',
  );

  await assert.rejects(
    prepareCriticalStartupAssets({
      loadImage: async () => { throw new Error('asset unavailable'); },
      loadFonts: async () => undefined,
    }),
    /asset unavailable/,
    'a missing critical asset stops startup instead of revealing a broken first screen',
  );

  await assert.rejects(
    prepareCriticalStartupAssets({
      loadImage: async () => new Promise<void>(() => undefined),
      loadFonts: async () => undefined,
      timeoutMs: 5,
    }),
    /timed out/i,
    'a stalled local asset check terminates instead of leaving the loading screen frozen',
  );

  console.log('Android startup phase 3-4 audit passed.');
};

void run();
