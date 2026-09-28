import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    beginWellnessAdAttempt,
    classifyRewardedAdFailure,
    createWellnessRewardAdState,
    expireWellnessRewardAdState,
    settleWellnessAdAttempt,
    WELLNESS_AD_CONTINUATION_WINDOW_MS,
} from '../services/rewardedAdExperience';

const rewarded = { success: true as const, stage: 'REWARD' as const };
const failedToShow = { success: false as const, reason: 'SHOW_FAILED' as const, stage: 'SHOW' as const };

// Phase 3: closing an ad is not presented as a technical fault, and neither outcome grants a courtesy reward.
assert.equal(classifyRewardedAdFailure('USER_DISMISSED'), 'DISMISSED');
assert.equal(classifyRewardedAdFailure('BUSY'), 'BUSY');
assert.equal(classifyRewardedAdFailure('LOAD_FAILED'), 'TECHNICAL');
assert.equal(classifyRewardedAdFailure('SHOW_TIMEOUT'), 'TECHNICAL');
assert.equal(classifyRewardedAdFailure(undefined), 'TECHNICAL');

// Phase 4: the Wellness reward starts at 0/2 and each player tap starts at most one ad.
const idle = createWellnessRewardAdState();
const firstAttempt = beginWellnessAdAttempt(idle, 1_000, () => 'session-1', () => 'attempt-1');
assert.equal(firstAttempt.step, 1);
assert.equal(firstAttempt.state.status, 'SHOWING_AD_1');
assert.equal(firstAttempt.state.completedSteps, 0);

// An overlapping tap cannot create a second ad or a second Wellness session.
const blockedOverlap = beginWellnessAdAttempt(firstAttempt.state, 1_001, () => 'session-2', () => 'attempt-2');
assert.equal(blockedOverlap.step, null);
assert.equal(blockedOverlap.state.sessionId, 'session-1');
assert.equal(blockedOverlap.state.attemptId, 'attempt-1');

// Completing ad one preserves 1/2 but does not complete or grant the Wellness reward.
const afterFirst = settleWellnessAdAttempt(firstAttempt.state, 'attempt-1', rewarded, 2_000);
assert.equal(afterFirst.status, 'AWAITING_AD_2');
assert.equal(afterFirst.completedSteps, 1);
assert.equal(afterFirst.retryExpiresAt, undefined);

// Ad two requires another explicit player action; it is never auto-started.
const secondAttempt = beginWellnessAdAttempt(afterFirst, 2_100, () => 'unused-session', () => 'attempt-2');
assert.equal(secondAttempt.step, 2);
assert.equal(secondAttempt.state.status, 'SHOWING_AD_2');
assert.equal(secondAttempt.state.sessionId, 'session-1');

// If ad two fails, keep 1/2 and open exactly a five-minute continuation window.
const afterSecondFailure = settleWellnessAdAttempt(secondAttempt.state, 'attempt-2', failedToShow, 3_000);
assert.equal(afterSecondFailure.status, 'RETRY_AD_2');
assert.equal(afterSecondFailure.completedSteps, 1);
assert.equal(afterSecondFailure.retryExpiresAt, 3_000 + WELLNESS_AD_CONTINUATION_WINDOW_MS);

// Retrying inside the window shows only ad two, never another pair.
const secondRetry = beginWellnessAdAttempt(
    afterSecondFailure,
    3_000 + WELLNESS_AD_CONTINUATION_WINDOW_MS - 1,
    () => 'unused-session-2',
    () => 'attempt-3',
);
assert.equal(secondRetry.step, 2);
assert.equal(secondRetry.state.completedSteps, 1);
assert.equal(secondRetry.state.sessionId, 'session-1');
assert.equal(secondRetry.state.pausedRetryWindowMs, 1);

// A duplicate or stale native callback cannot advance the session.
const staleCallback = settleWellnessAdAttempt(secondRetry.state, 'attempt-2', rewarded, 4_000);
assert.deepEqual(staleCallback, secondRetry.state);

// Only the successful second ad reaches 2/2.
const completed = settleWellnessAdAttempt(secondRetry.state, 'attempt-3', rewarded, 5_000);
assert.equal(completed.status, 'COMPLETED');
assert.equal(completed.completedSteps, 2);

// A failed retry pauses the original window while showing and does not create a fresh five minutes.
const retryWithTimeLeft = beginWellnessAdAttempt(
    afterSecondFailure,
    3_000 + 120_000,
    () => 'unused-session-3',
    () => 'attempt-retry-window',
);
assert.equal(retryWithTimeLeft.state.pausedRetryWindowMs, 180_000);
const failedRetry = settleWellnessAdAttempt(
    retryWithTimeLeft.state,
    'attempt-retry-window',
    failedToShow,
    3_000 + 240_000,
);
assert.equal(failedRetry.retryExpiresAt, 3_000 + 240_000 + 180_000);

// Failing ad one stays at 0/2 and retries ad one.
const fresh = beginWellnessAdAttempt(createWellnessRewardAdState(), 10_000, () => 'session-2', () => 'attempt-4');
const failedFirst = settleWellnessAdAttempt(fresh.state, 'attempt-4', failedToShow, 11_000);
assert.equal(failedFirst.status, 'RETRY_AD_1');
assert.equal(failedFirst.completedSteps, 0);
assert.equal(beginWellnessAdAttempt(failedFirst, 12_000, () => 'unused', () => 'attempt-5').step, 1);

// Once the second-ad continuation window expires, the old 1/2 cannot be resumed.
const expired = expireWellnessRewardAdState(
    afterSecondFailure,
    3_000 + WELLNESS_AD_CONTINUATION_WINDOW_MS,
);
assert.equal(expired.status, 'IDLE');
assert.equal(expired.completedSteps, 0);
assert.equal(expired.sessionId, undefined);
assert.equal(beginWellnessAdAttempt(expired, 999_999, () => 'session-3', () => 'attempt-6').step, 1);

// Integration guardrails: every placement must expose retry feedback and Wellness must not auto-loop ads.
const appSource = readFileSync('App.tsx', 'utf8');
const storeSource = readFileSync('components/ui-overhaul/StoreScreen.tsx', 'utf8');
const lifeEventSource = readFileSync('components/LifeEventModal.tsx', 'utf8');
const productionCrisisSource = readFileSync('components/ProductionCrisisModal.tsx', 'utf8');
assert.match(appSource, /beginWellnessAdAttempt\(\{[\s\S]*?\.\.\.activeWellnessState,[\s\S]*?sessionId: pendingReceipt\.id,[\s\S]*?\}, nowMs\)/);
assert.match(appSource, /settleWellnessAdAttempt\(attempt\.state, attemptId, result, Date\.now\(\)\)/);
assert.doesNotMatch(appSource, /setTimeout\(resolve, 1500\)/);
assert.match(storeSource, /wellnessAd\.completedSteps >= 1/);
assert.match(storeSource, /onWatchAd\('REWARDED_STATS'\)/);
assert.match(storeSource, /wellnessAd\.actionLabel/);
assert.match(lifeEventSource, /setResolveError\(getRewardedAdError\(result\.reason\)\)/);
assert.match(productionCrisisSource, /setResolveError\(getRewardedAdError\(result\.reason\)\)/);

console.log('Rewarded-ad Phase 3 single-ad recovery and Phase 4 Wellness session audit passed.');
