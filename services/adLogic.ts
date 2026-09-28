import { AdMob, RewardAdPluginEvents } from '@capacitor-community/admob';
import { AdType } from '../types';
import {
    runRewardedAdInitialization,
    runRewardedAdLifecycle,
    type RewardedAdFailureReason,
    type RewardedAdGateway,
    type RewardedAdLifecycleEvent,
    type RewardedAdResult,
    type RewardedAdStage,
    type RewardedAdLifecycleTransition,
} from './rewardedAdLifecycle';
import { createRewardedAdAvailabilityController } from './rewardedAdAvailability';
import {
    emitRewardedAdDiagnostic,
    type RewardedAdDiagnosticContext,
    type RewardedAdDiagnosticName,
} from './rewardedAdDiagnostics';

const ADMOB_IDS = {
    ios: {
        rewarded: 'ca-app-pub-1351550313263506/9092996465',
        interstitial: 'ca-app-pub-1351550313263506/1369584962',
    },
    android: {
        rewarded: 'ca-app-pub-1351550313263506/5572922698',
        interstitial: 'ca-app-pub-1351550313263506/9957935970',
    },
};

export interface AdResult extends RewardedAdResult {
    reason?: RewardedAdFailureReason;
    stage: RewardedAdStage;
}

declare global {
    interface Window {
        Capacitor?: {
            isNativePlatform?: () => boolean;
            getPlatform?: () => string;
            Plugins?: {
                Purchases?: any;
            };
        };
        adBreak?: any;
        adConfig?: any;
    }
}

let initialized = false;
let initializationPromise: Promise<boolean> | null = null;
let nativeRewardedAvailability: ReturnType<typeof createRewardedAdAvailabilityController> | null = null;
let nativeRewardedRefreshListenersPromise: Promise<void> | null = null;
let onlineRefreshListenerInstalled = false;
let optionalPreloadingSuspended = false;

/** Does not block an ad explicitly requested by a player. */
export const setOptionalRewardedAdPreloadingSuspended = (suspended: boolean): void => {
    optionalPreloadingSuspended = suspended;
};

export const isRewardedType = (type: AdType) => type !== 'INTERSTITIAL';

const requestConsent = async () => {
    if (!AdMob?.requestConsentInfo) return;

    try {
        const info = await AdMob.requestConsentInfo();
        console.log('Consent status:', info?.status);

        if (info?.isConsentFormAvailable && info?.status === 'REQUIRED' && AdMob.showConsentForm) {
            await AdMob.showConsentForm();
            console.log('AdMob consent form shown');
        }
    } catch (err) {
        console.error('AdMob consent error:', err);
    }
};

export const initAds = async (): Promise<boolean> => {
    const isNative = window.Capacitor?.isNativePlatform?.();

    if (!isNative) {
        if (window.adConfig) {
            window.adConfig({
                preloadAdBreaks: 'on',
                sound: 'on',
            });
        }
        return true;
    }

    if (initialized) return true;
    if (initializationPromise) return initializationPromise;

    if (!AdMob?.initialize) {
        console.warn('AdMob plugin not found. Native ads are unavailable.');
        return false;
    }

    initializationPromise = (async () => {
        await requestConsent();
        try {
            await AdMob.initialize();
            initialized = true;
            console.log('AdMob initialized after consent');
            return true;
        } catch (err) {
            console.error('AdMob init failed:', err);
            return false;
        }
    })();
    const result = await initializationPromise;
    if (!result) initializationPromise = null;
    return result;
};

const REWARDED_EVENT_NAMES: Record<RewardedAdLifecycleEvent, RewardAdPluginEvents> = {
    REWARDED: RewardAdPluginEvents.Rewarded,
    DISMISSED: RewardAdPluginEvents.Dismissed,
    FAILED_TO_LOAD: RewardAdPluginEvents.FailedToLoad,
    FAILED_TO_SHOW: RewardAdPluginEvents.FailedToShow,
    SHOWED: RewardAdPluginEvents.Showed,
};

const isOnline = (): boolean => (
    typeof navigator === 'undefined' || navigator.onLine !== false
);

const loadNativeRewardedAd = async (adId: string): Promise<unknown> => {
    let rejectFailure!: (reason?: unknown) => void;
    const failure = new Promise<never>((_resolve, reject) => {
        rejectFailure = reject;
    });
    const failureHandle = await AdMob.addListener(
        RewardAdPluginEvents.FailedToLoad,
        error => rejectFailure(error),
    );
    try {
        return await Promise.race([
            AdMob.prepareRewardVideoAd({ adId }),
            failure,
        ]);
    } finally {
        await failureHandle.remove();
    }
};

const getNativeRewardedAvailability = (adId: string) => {
    if (nativeRewardedAvailability) return nativeRewardedAvailability;
    nativeRewardedAvailability = createRewardedAdAvailabilityController({
        load: () => loadNativeRewardedAd(adId),
        isOnline,
        onStateChange: snapshot => {
            let name: RewardedAdDiagnosticName | null = null;
            if (snapshot.status === 'LOADING') {
                name = snapshot.attempts === 1 ? 'reward_ad_preload_requested' : 'reward_ad_preload_retry';
            } else if (snapshot.status === 'READY') {
                name = 'reward_ad_preload_ready';
            } else if (snapshot.status === 'OFFLINE' || snapshot.status === 'UNAVAILABLE') {
                name = 'reward_ad_preload_failed';
            }
            if (name) {
                emitRewardedAdDiagnostic({
                    name,
                    attempt: snapshot.attempts,
                    reason: snapshot.lastFailureReason,
                });
            }
        },
    });
    return nativeRewardedAvailability;
};

const createNativeRewardedGateway = (adId: string): RewardedAdGateway => ({
    prepare: async () => {
        const result = await getNativeRewardedAvailability(adId).preload();
        if (!result.ready) throw { reason: result.reason || 'UNAVAILABLE' };
        return { adUnitId: adId };
    },
    show: () => {
        const consumed = getNativeRewardedAvailability(adId).consumeReady();
        if (!consumed.consumed) throw { reason: consumed.reason || 'UNAVAILABLE' };
        return AdMob.showRewardVideoAd();
    },
    addListener: async (event, callback) => {
        const handle = await AdMob.addListener(
            REWARDED_EVENT_NAMES[event] as RewardAdPluginEvents.Rewarded,
            callback as (payload: never) => void,
        );
        return { remove: () => handle.remove() };
    },
});

const getRewardedAdId = () => {
    const platform = (window.Capacitor?.getPlatform?.() === 'ios' ? 'ios' : 'android') as 'ios' | 'android';
    return ADMOB_IDS[platform].rewarded;
};

export const preloadRewardedAd = async (): Promise<boolean> => {
    if (!window.Capacitor?.isNativePlatform?.()) return true;
    if (!await initAds()) return false;
    return (await getNativeRewardedAvailability(getRewardedAdId()).preload()).ready;
};

const installNativeRewardedRefreshListeners = async (): Promise<void> => {
    if (nativeRewardedRefreshListenersPromise) return nativeRewardedRefreshListenersPromise;
    nativeRewardedRefreshListenersPromise = (async () => {
        const refresh = () => {
            if (optionalPreloadingSuspended) return;
            const availability = getNativeRewardedAvailability(getRewardedAdId());
            void availability.refreshAfterDismissal();
        };
        await Promise.all([
            AdMob.addListener(RewardAdPluginEvents.Dismissed, refresh),
            AdMob.addListener(RewardAdPluginEvents.FailedToShow, refresh),
        ]);
        if (!onlineRefreshListenerInstalled && typeof window !== 'undefined') {
            onlineRefreshListenerInstalled = true;
            window.addEventListener('online', () => {
                if (!optionalPreloadingSuspended) void preloadRewardedAd();
            });
        }
    })().catch(error => {
        nativeRewardedRefreshListenersPromise = null;
        throw error;
    });
    return nativeRewardedRefreshListenersPromise;
};

export const startRewardedAdPreloading = async (): Promise<boolean> => {
    if (optionalPreloadingSuspended) return false;
    if (!window.Capacitor?.isNativePlatform?.()) return initAds();
    if (!await initAds()) return false;
    if (optionalPreloadingSuspended) return false;
    await installNativeRewardedRefreshListeners();
    if (optionalPreloadingSuspended) return false;
    return preloadRewardedAd();
};

const emitLifecycleDiagnostic = (
    context: RewardedAdDiagnosticContext | undefined,
    transition: RewardedAdLifecycleTransition,
) => {
    if (!context) return;
    let name: RewardedAdDiagnosticName | null = null;
    if (transition.state === 'READY') name = 'reward_ad_loaded';
    else if (transition.state === 'SHOWN') name = 'reward_ad_shown';
    else if (transition.state === 'REWARDED') name = 'reward_ad_rewarded';
    else if (transition.state === 'DISMISSED') name = 'reward_ad_dismissed';
    else if (transition.state === 'TIMED_OUT') name = 'reward_ad_timeout';
    else if (transition.state === 'FAILED') {
        name = transition.stage === 'LOAD' ? 'reward_ad_load_failed' : 'reward_ad_show_failed';
    }
    if (!name) return;
    emitRewardedAdDiagnostic({
        name,
        ...context,
        stage: transition.stage,
        reason: transition.reason,
    });
};

const showNativeRewardedAd = async (
    adId: string,
    diagnosticContext?: RewardedAdDiagnosticContext,
): Promise<AdResult> => {
    const result = await runRewardedAdLifecycle(createNativeRewardedGateway(adId), {
        onTransition: transition => emitLifecycleDiagnostic(diagnosticContext, transition),
    });
    if (result.reason === 'SHOW_FAILED') {
        void getNativeRewardedAvailability(adId).refreshAfterDismissal();
    }
    return { ...result, diagnosticsEmitted: Boolean(diagnosticContext) };
};

export const showAd = async (
    type: AdType,
    diagnosticContext?: RewardedAdDiagnosticContext,
): Promise<AdResult> => {
    const isNative = window.Capacitor?.isNativePlatform?.();
    const wantsReward = isRewardedType(type);

    if (isNative) {
        const adsReady = await runRewardedAdInitialization(initAds);
        if (!adsReady) return { success: false, reason: 'INIT_FAILED', stage: 'INIT' };

        if (!AdMob) return { success: false, reason: 'UNAVAILABLE', stage: 'INIT' };

        const platform = (window.Capacitor?.getPlatform?.() === 'ios' ? 'ios' : 'android') as 'ios' | 'android';
        const ids = ADMOB_IDS[platform];

        try {
            if (!wantsReward) {
                await AdMob.prepareInterstitial({
                    adId: ids.interstitial,
                });
                await AdMob.showInterstitial();
                return { success: true, stage: 'SHOW' };
            }
            await installNativeRewardedRefreshListeners();
            return showNativeRewardedAd(ids.rewarded, diagnosticContext);
        } catch (err) {
            console.error('Ad failed:', err);
            return { success: false, reason: 'ERROR', stage: 'SHOW' };
        }
    }

    if (typeof window.adBreak === 'function') {
        return new Promise(resolve => {
            let settled = false;
            const finish = (result: AdResult) => {
                if (settled) return;
                settled = true;
                clearTimeout(timeoutId);
                resolve(result);
            };
            const timeoutId = setTimeout(
                () => finish({ success: false, reason: 'SHOW_TIMEOUT', stage: 'SHOW' }),
                120_000,
            );
            window.adBreak({
                type: wantsReward ? 'reward' : 'next',
                name: type,
                beforeAd: () => console.log('Web ad starting...'),
                afterAd: () => console.log('Web ad finished.'),
                adBreakDone: (placementInfo: any) => {
                    finish({
                        success: placementInfo?.breakStatus === 'viewed',
                        reason: placementInfo?.breakStatus === 'viewed' ? undefined : 'USER_DISMISSED',
                        stage: placementInfo?.breakStatus === 'viewed' ? 'REWARD' : 'SHOW',
                    });
                },
            });
        });
    }

    console.log(`[DEV SIMULATION] Showing ${type} ad...`);
    return new Promise(resolve => {
        setTimeout(() => resolve({ success: true, stage: wantsReward ? 'REWARD' : 'SHOW' }), 1000);
    });
};
