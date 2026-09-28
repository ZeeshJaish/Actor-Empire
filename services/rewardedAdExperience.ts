import type { RewardedAdFailureReason, RewardedAdResult } from './rewardedAdLifecycle';
import type { PendingRewardAdReceipt } from './rewardedAdRecovery';

export const WELLNESS_AD_CONTINUATION_WINDOW_MS = 5 * 60 * 1000;

export type RewardedAdFailureKind = 'DISMISSED' | 'BUSY' | 'OFFLINE' | 'NO_FILL' | 'TECHNICAL';

export type WellnessRewardAdStatus =
    | 'IDLE'
    | 'SHOWING_AD_1'
    | 'AWAITING_AD_2'
    | 'SHOWING_AD_2'
    | 'RETRY_AD_1'
    | 'RETRY_AD_2'
    | 'COMPLETED';

export interface WellnessRewardAdState {
    status: WellnessRewardAdStatus;
    completedSteps: 0 | 1 | 2;
    sessionId?: string;
    attemptId?: string;
    lastFailureReason?: RewardedAdFailureReason;
    retryExpiresAt?: number;
    pausedRetryWindowMs?: number;
}

export interface WellnessAdAttemptStart {
    state: WellnessRewardAdState;
    step: 1 | 2 | null;
}

const createId = (prefix: string): string => (
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`
);

export const classifyRewardedAdFailure = (
    reason?: RewardedAdFailureReason,
): RewardedAdFailureKind => {
    if (reason === 'USER_DISMISSED') return 'DISMISSED';
    if (reason === 'BUSY') return 'BUSY';
    if (reason === 'OFFLINE') return 'OFFLINE';
    if (reason === 'NO_FILL') return 'NO_FILL';
    return 'TECHNICAL';
};

export const createWellnessRewardAdState = (): WellnessRewardAdState => ({
    status: 'IDLE',
    completedSteps: 0,
});

export const restoreWellnessRewardAdState = (
    receipt: PendingRewardAdReceipt,
    nowMs: number,
): WellnessRewardAdState => {
    if (receipt.type !== 'REWARDED_STATS' || receipt.stepsRequired !== 2) {
        return createWellnessRewardAdState();
    }
    if (receipt.status !== 'IN_PROGRESS' || receipt.completedSteps >= 2) {
        return {
            status: 'COMPLETED',
            completedSteps: 2,
            sessionId: receipt.id,
        };
    }
    if (receipt.completedSteps !== 1) return createWellnessRewardAdState();
    if (receipt.expiresAt !== undefined && nowMs >= receipt.expiresAt) {
        return createWellnessRewardAdState();
    }
    const retryExpiresAt = receipt.expiresAt ?? (
        receipt.continuationRemainingMs === undefined
            ? undefined
            : nowMs + receipt.continuationRemainingMs
    );
    return {
        status: retryExpiresAt === undefined ? 'AWAITING_AD_2' : 'RETRY_AD_2',
        completedSteps: 1,
        sessionId: receipt.id,
        retryExpiresAt,
    };
};

export const expireWellnessRewardAdState = (
    state: WellnessRewardAdState,
    nowMs: number,
): WellnessRewardAdState => {
    if (
        state.status === 'RETRY_AD_2'
        && state.retryExpiresAt !== undefined
        && nowMs >= state.retryExpiresAt
    ) {
        return createWellnessRewardAdState();
    }
    return state;
};

export const beginWellnessAdAttempt = (
    currentState: WellnessRewardAdState,
    nowMs: number,
    sessionIdFactory: () => string = () => createId('wellness_session'),
    attemptIdFactory: () => string = () => createId('wellness_attempt'),
): WellnessAdAttemptStart => {
    const state = expireWellnessRewardAdState(currentState, nowMs);
    if (state.status === 'SHOWING_AD_1' || state.status === 'SHOWING_AD_2' || state.status === 'COMPLETED') {
        return { state, step: null };
    }

    const step: 1 | 2 = state.completedSteps === 1 ? 2 : 1;
    const pausedRetryWindowMs = step === 2 && state.retryExpiresAt !== undefined
        ? Math.max(0, state.retryExpiresAt - nowMs)
        : undefined;
    return {
        step,
        state: {
            status: step === 1 ? 'SHOWING_AD_1' : 'SHOWING_AD_2',
            completedSteps: step === 1 ? 0 : 1,
            sessionId: state.sessionId || sessionIdFactory(),
            attemptId: attemptIdFactory(),
            pausedRetryWindowMs,
        },
    };
};

export const settleWellnessAdAttempt = (
    state: WellnessRewardAdState,
    attemptId: string,
    result: RewardedAdResult,
    nowMs: number,
): WellnessRewardAdState => {
    if (!state.attemptId || state.attemptId !== attemptId) return state;

    if (state.status === 'SHOWING_AD_1') {
        if (result.success) {
            return {
                status: 'AWAITING_AD_2',
                completedSteps: 1,
                sessionId: state.sessionId,
            };
        }
        return {
            status: 'RETRY_AD_1',
            completedSteps: 0,
            sessionId: state.sessionId,
            lastFailureReason: result.reason || 'ERROR',
        };
    }

    if (state.status === 'SHOWING_AD_2') {
        if (result.success) {
            return {
                status: 'COMPLETED',
                completedSteps: 2,
                sessionId: state.sessionId,
            };
        }
        return {
            status: 'RETRY_AD_2',
            completedSteps: 1,
            sessionId: state.sessionId,
            lastFailureReason: result.reason || 'ERROR',
            retryExpiresAt: nowMs + (state.pausedRetryWindowMs ?? WELLNESS_AD_CONTINUATION_WINDOW_MS),
        };
    }

    return state;
};
