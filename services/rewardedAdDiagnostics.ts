import type { AdType } from '../types';
import type { RewardedAdPlacement } from './rewardedAdCoordinator';
import type { RewardedAdFailureReason, RewardedAdStage } from './rewardedAdLifecycle';

export type RewardedAdDiagnosticName =
    | 'reward_ad_requested'
    | 'reward_ad_loaded'
    | 'reward_ad_shown'
    | 'reward_ad_rewarded'
    | 'reward_ad_dismissed'
    | 'reward_ad_load_failed'
    | 'reward_ad_show_failed'
    | 'reward_ad_timeout'
    | 'reward_ad_preload_requested'
    | 'reward_ad_preload_retry'
    | 'reward_ad_preload_ready'
    | 'reward_ad_preload_failed'
    | 'reward_ad_resumed'
    | 'reward_ad_expired'
    | 'reward_ad_duplicate_rejected'
    | 'reward_ad_persisted';

export interface RewardedAdDiagnostic {
    name: RewardedAdDiagnosticName;
    requestId?: string;
    type?: AdType;
    placement?: RewardedAdPlacement;
    contextId?: string;
    stage?: RewardedAdStage;
    reason?: RewardedAdFailureReason | string;
    attempt?: number;
    elapsedMs?: number;
    completedSteps?: number;
    requiredSteps?: number;
    rewardSessionId?: string;
}

export interface RewardedAdDiagnosticContext {
    requestId: string;
    type: AdType;
    placement: RewardedAdPlacement;
    contextId?: string;
}

type RewardedAdDiagnosticListener = (event: RewardedAdDiagnostic) => void;

const listeners = new Set<RewardedAdDiagnosticListener>();

export const subscribeRewardedAdDiagnostics = (listener: RewardedAdDiagnosticListener): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

export const emitRewardedAdDiagnostic = (event: RewardedAdDiagnostic): void => {
    listeners.forEach(listener => {
        try {
            listener(event);
        } catch {
            // Diagnostics must never alter reward delivery.
        }
    });
};
