import type { AdType } from '../types';
import { showAd, type AdResult } from './adLogic';
import {
    emitRewardedAdDiagnostic,
    type RewardedAdDiagnosticContext,
    type RewardedAdDiagnosticName,
} from './rewardedAdDiagnostics';

export type RewardedAdType = Exclude<AdType, 'INTERSTITIAL'>;
export type RewardedAdPlacement =
    | 'STORE_REWARD'
    | 'DEBT_BAILOUT'
    | 'LIFE_EVENT_OPTION'
    | 'PRODUCTION_CRISIS_OPTION';

export interface RewardedAdRequest {
    type: RewardedAdType;
    placement: RewardedAdPlacement;
    contextId?: string;
}

export interface CoordinatedRewardedAdResult extends AdResult {
    requestId: string;
    placement: RewardedAdPlacement;
}

export interface ActiveRewardedAdRequest {
    requestId: string;
    type: RewardedAdType;
    placement: RewardedAdPlacement;
    contextId?: string;
}

type RewardedAdRunner = (type: AdType, context?: RewardedAdDiagnosticContext) => Promise<AdResult>;

const createRequestId = (): string => (
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `reward_request_${Date.now()}_${Math.random().toString(36).slice(2)}`
);

export const createRewardedAdCoordinator = (runner: RewardedAdRunner = showAd) => {
    let active: ActiveRewardedAdRequest | null = null;

    const request = async (input: RewardedAdRequest): Promise<CoordinatedRewardedAdResult> => {
        if (active) {
            return {
                success: false,
                reason: 'BUSY',
                stage: 'COORDINATOR',
                requestId: active.requestId,
                placement: input.placement,
            };
        }

        const current: ActiveRewardedAdRequest = {
            requestId: createRequestId(),
            type: input.type,
            placement: input.placement,
            contextId: input.contextId,
        };
        active = current;
        const diagnosticContext: RewardedAdDiagnosticContext = { ...current };
        emitRewardedAdDiagnostic({
            name: 'reward_ad_requested',
            ...diagnosticContext,
        });
        try {
            const result = await runner(input.type, diagnosticContext);
            if (!result.diagnosticsEmitted) {
                let name: RewardedAdDiagnosticName;
                if (result.success) name = 'reward_ad_rewarded';
                else if (result.reason === 'USER_DISMISSED') name = 'reward_ad_dismissed';
                else if (result.reason === 'LOAD_TIMEOUT' || result.reason === 'SHOW_TIMEOUT') name = 'reward_ad_timeout';
                else name = result.stage === 'LOAD' ? 'reward_ad_load_failed' : 'reward_ad_show_failed';
                emitRewardedAdDiagnostic({
                    name,
                    ...diagnosticContext,
                    stage: result.stage,
                    reason: result.reason,
                });
            }
            return { ...result, requestId: current.requestId, placement: current.placement };
        } catch {
            emitRewardedAdDiagnostic({
                name: 'reward_ad_show_failed',
                ...diagnosticContext,
                stage: 'COORDINATOR',
                reason: 'ERROR',
            });
            return {
                success: false,
                reason: 'ERROR',
                stage: 'COORDINATOR',
                requestId: current.requestId,
                placement: current.placement,
            };
        } finally {
            if (active?.requestId === current.requestId) active = null;
        }
    };

    return {
        request,
        getActiveRequest: (): ActiveRewardedAdRequest | null => active ? { ...active } : null,
    };
};

const rewardedAdCoordinator = createRewardedAdCoordinator();

export const requestRewardedAd = (request: RewardedAdRequest) => rewardedAdCoordinator.request(request);
export const getActiveRewardedAdRequest = () => rewardedAdCoordinator.getActiveRequest();
