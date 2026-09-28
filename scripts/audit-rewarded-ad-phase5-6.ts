import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { INITIAL_PLAYER, type Player } from '../types';
import {
    beginPendingRewardAd,
    clearPendingRewardAd,
    getRecoverableRewardedAdReceipt,
    markPendingRewardAdReady,
    pausePendingRewardAdContinuation,
    readPendingRewardAd,
    recordPendingRewardAdStep,
    RewardedAdPersistenceError,
    setPendingRewardAdContinuationExpiry,
} from '../services/rewardedAdRecovery';
import { attachRewardedAdGrantProof, runRewardedAdGrantTransaction } from '../services/rewardedAdGrantTransaction';
import { restoreWellnessRewardAdState } from '../services/rewardedAdExperience';
import { subscribeRewardedAdDiagnostics, type RewardedAdDiagnostic } from '../services/rewardedAdDiagnostics';

const memory = new Map<string, string>();
(globalThis as any).localStorage = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value),
    removeItem: (key: string) => memory.delete(key),
};

const clonePlayer = (): Player => JSON.parse(JSON.stringify(INITIAL_PLAYER)) as Player;

clearPendingRewardAd();
const recoveryDiagnostics: RewardedAdDiagnostic[] = [];
const unsubscribeDiagnostics = subscribeRewardedAdDiagnostics(event => recoveryDiagnostics.push(event));

// Break caught: storyline entitlements can resume only in their original player, slot, placement, and context.
let lifeChoiceReceipt = beginPendingRewardAd({
    playerId: 'player-story',
    saveSlot: 1,
    type: 'REWARDED_BAILOUT',
    placement: 'LIFE_EVENT_OPTION',
    contextId: 'event-7:golden-option',
    stepsRequired: 1,
    nowMs: 100,
});
lifeChoiceReceipt = recordPendingRewardAdStep(lifeChoiceReceipt, {
    stepId: 'life-ad-1',
    stepNumber: 1,
    nowMs: 200,
});
lifeChoiceReceipt = markPendingRewardAdReady(lifeChoiceReceipt, 201);
assert.equal(getRecoverableRewardedAdReceipt({
    playerId: 'player-story',
    saveSlot: 1,
    placement: 'LIFE_EVENT_OPTION',
    contextId: 'event-7:golden-option',
    nowMs: 300,
})?.id, lifeChoiceReceipt.id);
assert.equal(getRecoverableRewardedAdReceipt({
    playerId: 'player-story',
    saveSlot: 1,
    placement: 'LIFE_EVENT_OPTION',
    contextId: 'event-7:different-option',
    nowMs: 300,
}), null);
const storyProof = attachRewardedAdGrantProof(clonePlayer(), lifeChoiceReceipt.id);
assert.equal(storyProof.flags.grantedRewardAdIds.includes(lifeChoiceReceipt.id), true);
assert.equal(
    attachRewardedAdGrantProof(storyProof, lifeChoiceReceipt.id).flags.grantedRewardAdIds
        .filter((id: string) => id === lifeChoiceReceipt.id).length,
    1,
);
clearPendingRewardAd(lifeChoiceReceipt.id);

// Break caught: a two-ad reward must be durable before the first ad starts.
let wellness = beginPendingRewardAd({
    playerId: 'player-a',
    saveSlot: 2,
    type: 'REWARDED_STATS',
    placement: 'STORE_REWARD',
    contextId: 'slot-2:wellness',
    stepsRequired: 2,
    nowMs: 1_000,
});
assert.equal(wellness.schemaVersion, 2);
assert.equal(wellness.status, 'IN_PROGRESS');
assert.equal(wellness.placement, 'STORE_REWARD');
assert.deepEqual(wellness.completedStepIds, []);
assert.equal(wellness.remainingStep, 1);
assert.equal(readPendingRewardAd(1_001)?.id, wellness.id);

// Break caught: duplicate native reward callbacks cannot count one ad twice.
wellness = recordPendingRewardAdStep(wellness, {
    stepId: 'native-request-ad-1',
    stepNumber: 1,
    nowMs: 2_000,
});
const duplicateFirst = recordPendingRewardAdStep(wellness, {
    stepId: 'native-request-ad-1',
    stepNumber: 1,
    nowMs: 2_001,
});
assert.equal(duplicateFirst.completedSteps, 1);
assert.deepEqual(duplicateFirst.completedStepIds, ['native-request-ad-1']);
assert.equal(duplicateFirst.remainingStep, 2);
assert.equal(recoveryDiagnostics.some(event => event.name === 'reward_ad_duplicate_rejected'), true);

// Break caught: a forged/out-of-order callback cannot skip directly to 2/2.
const outOfOrder = recordPendingRewardAdStep(createFreshWellness(), {
    stepId: 'native-request-ad-2',
    stepNumber: 2,
    nowMs: 2_500,
});
assert.equal(outOfOrder.completedSteps, 0);
assert.equal(outOfOrder.remainingStep, 1);

// Break caught: the 1/2 continuation deadline must survive a process restart.
wellness = setPendingRewardAdContinuationExpiry(duplicateFirst, 302_001, 2_001);
const restoredHalfway = readPendingRewardAd(3_000);
assert.equal(restoredHalfway?.completedSteps, 1);
assert.equal(restoredHalfway?.remainingStep, 2);
assert.equal(restoredHalfway?.expiresAt, 302_001);
assert.deepEqual(restoreWellnessRewardAdState(restoredHalfway!, 3_000), {
    status: 'RETRY_AD_2',
    completedSteps: 1,
    sessionId: wellness.id,
    retryExpiresAt: 302_001,
});

// Break caught: terminating the app while retry Ad 2 is on screen must not lose 1/2.
const pausedHalfway = pausePendingRewardAdContinuation(restoredHalfway!, 102_001);
assert.equal(pausedHalfway.expiresAt, undefined);
assert.equal(pausedHalfway.continuationRemainingMs, 200_000);
assert.deepEqual(restoreWellnessRewardAdState(readPendingRewardAd(400_000)!, 400_000), {
    status: 'RETRY_AD_2',
    completedSteps: 1,
    sessionId: wellness.id,
    retryExpiresAt: 600_000,
});

// Resume the original absolute deadline for the expiry assertion below.
wellness = setPendingRewardAdContinuationExpiry(pausedHalfway, 302_001, 2_001);

// Break caught: an expired unfinished session cannot restore or grant later.
assert.equal(readPendingRewardAd(302_001), null);
assert.equal(recoveryDiagnostics.some(event => event.name === 'reward_ad_expired'), true);

// Recreate 2/2 for the verified-save transaction tests.
wellness = createFreshWellness();
wellness = recordPendingRewardAdStep(wellness, { stepId: 'ad-1', stepNumber: 1, nowMs: 4_000 });
wellness = recordPendingRewardAdStep(wellness, { stepId: 'ad-2', stepNumber: 2, nowMs: 5_000 });
wellness = markPendingRewardAdReady(wellness, 5_001);
assert.equal(wellness.status, 'READY_TO_GRANT');
assert.equal(wellness.remainingStep, null);

// Break caught: save failure must not mutate live player state or consume the earned reward.
const original = clonePlayer();
const originalHealth = original.stats.health;
let failedSaveAttempts = 0;
const failed = await runRewardedAdGrantTransaction({
    receipt: wellness,
    player: original,
    nowMs: 6_000,
    persist: async () => {
        failedSaveAttempts += 1;
        throw new Error('simulated verified-save failure');
    },
});
assert.equal(failed.status, 'SAVE_FAILED');
assert.equal(failed.player.stats.health, originalHealth);
assert.equal(readPendingRewardAd(6_001)?.status, 'READY_TO_GRANT');
assert.equal(readPendingRewardAd(6_001)?.grantAttempts, 1);
assert.equal(failedSaveAttempts, 1);

// Break caught: retrying persistence grants without replaying either ad.
let persistedCandidate: Player | null = null;
const retried = await runRewardedAdGrantTransaction({
    receipt: readPendingRewardAd(6_001)!,
    player: original,
    nowMs: 7_000,
    persist: async candidate => {
        persistedCandidate = candidate;
        return candidate;
    },
});
assert.equal(retried.status, 'GRANTED');
assert.equal(retried.player.stats.health >= 90, true);
assert.equal(retried.player.stats.happiness >= 90, true);
assert.equal(retried.player.flags.grantedRewardAdIds.includes(wellness.id), true);
assert.equal(persistedCandidate?.flags.grantedRewardAdIds.includes(wellness.id), true);
assert.equal(readPendingRewardAd(7_001)?.status, 'GRANTED');

// Break caught: a crash after verified save but before receipt cleanup cannot apply the reward twice.
const replayReady = {
    ...readPendingRewardAd(7_001)!,
    status: 'READY_TO_GRANT' as const,
};
let duplicatePersistCalls = 0;
const deduplicated = await runRewardedAdGrantTransaction({
    receipt: replayReady,
    player: retried.player,
    nowMs: 8_000,
    persist: async candidate => {
        duplicatePersistCalls += 1;
        return candidate;
    },
});
assert.equal(deduplicated.status, 'ALREADY_GRANTED');
assert.equal(deduplicated.player.stats.health, retried.player.stats.health);
assert.equal(duplicatePersistCalls, 0);
assert.equal(readPendingRewardAd(8_001)?.status, 'GRANTED');

// Break caught: if durable metadata storage fails after a rewarded callback,
// the verified-save path still receives the advanced in-memory receipt.
clearPendingRewardAd();
const storageFailureReceipt = createFreshWellness();
const originalSetItem = (globalThis as any).localStorage.setItem;
(globalThis as any).localStorage.setItem = () => { throw new Error('quota'); };
let persistenceError: RewardedAdPersistenceError | null = null;
try {
    recordPendingRewardAdStep(storageFailureReceipt, {
        stepId: 'earned-despite-storage-failure',
        stepNumber: 1,
        nowMs: 8_500,
    });
} catch (error) {
    persistenceError = error as RewardedAdPersistenceError;
}
(globalThis as any).localStorage.setItem = originalSetItem;
assert.equal(persistenceError instanceof RewardedAdPersistenceError, true);
assert.equal(persistenceError?.receipt?.completedSteps, 1);
assert.deepEqual(persistenceError?.receipt?.completedStepIds, ['earned-despite-storage-failure']);

clearPendingRewardAd();
assert.equal(readPendingRewardAd(9_000), null);
unsubscribeDiagnostics();

// Integration guardrails: storyline entitlements must be saved by their own
// transaction and must never fall through to the cash-bailout grant handler.
const appSource = readFileSync('App.tsx', 'utf8');
const lifeEventSource = readFileSync('components/LifeEventModal.tsx', 'utf8');
const productionCrisisSource = readFileSync('components/ProductionCrisisModal.tsx', 'utf8');
assert.match(appSource, /pendingReceipt\.placement === 'LIFE_EVENT_OPTION'/);
assert.match(appSource, /pendingReceipt\.placement === 'PRODUCTION_CRISIS_OPTION'/);
assert.match(appSource, /attachRewardedAdGrantProof\(choice\.updatedPlayer, choice\.rewardReceiptId\)/);
assert.match(appSource, /resolveProductionCrisisTransactionally/);
assert.match(lifeEventSource, /getRecoverableRewardedAdReceipt/);
assert.match(lifeEventSource, /rewardReceiptId: feedback\.rewardReceiptId/);
assert.match(lifeEventSource, /markPendingRewardAdVerifiedSave/);
assert.match(productionCrisisSource, /getRecoverableRewardedAdReceipt/);
assert.match(productionCrisisSource, /await onChoice\(choiceIndex, receipt\?\.id\)/);
assert.match(productionCrisisSource, /markPendingRewardAdVerifiedSave/);

console.log('Rewarded-ad Phase 5 durable session and Phase 6 verified grant audit passed.');

function createFreshWellness() {
    clearPendingRewardAd();
    return beginPendingRewardAd({
        playerId: 'player-a',
        saveSlot: 2,
        type: 'REWARDED_STATS',
        placement: 'STORE_REWARD',
        contextId: 'slot-2:wellness',
        stepsRequired: 2,
        nowMs: 3_000,
    });
}
