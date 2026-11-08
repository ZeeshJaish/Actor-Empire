import { AdMob, InterstitialAdPluginEvents, MaxAdContentRating } from '@capacitor-community/admob';
import { RewardAdPluginEvents } from '@capacitor-community/admob';
import { AdType } from '../types';

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

export interface AdResult {
    success: boolean;
    reason?: 'NOT_COMPLETED' | 'UNAVAILABLE' | 'ERROR';
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

export const isRewardedType = (type: AdType) => type !== 'INTERSTITIAL';

const isNativeAds = () => Boolean(window.Capacitor?.isNativePlatform?.());
const adPlatform = (): 'ios' | 'android' => (window.Capacitor?.getPlatform?.() === 'ios' ? 'ios' : 'android');

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

export const initAds = async () => {
    if (!isNativeAds()) {
        if (window.adConfig) {
            window.adConfig({
                preloadAdBreaks: 'on',
                sound: 'on',
            });
        }
        return;
    }

    if (initialized) return;

    if (!AdMob?.initialize) {
        console.warn('AdMob plugin not found. Native ads are unavailable.');
        return;
    }

    await requestConsent();

    try {
        /* Ads must fit the store's age rating (Apple 2.5.18): the App Store lists
           the game 4+, Google Play lists it Teen. */
        await AdMob.initialize({
            maxAdContentRating: adPlatform() === 'ios' ? MaxAdContentRating.General : MaxAdContentRating.Teen,
        });
        initialized = true;
        console.log('AdMob initialized after consent');
        preloadInterstitial();
        preloadRewarded();
    } catch (err) {
        console.error('AdMob init failed:', err);
    }
};

/* ---- the interstitial, loaded ahead of time ----
   AdMob disallows an interstitial that opens late because it was not loaded,
   so one is prepared in the background and shown only when it is ready. */
type InterstitialState = 'IDLE' | 'LOADING' | 'READY' | 'SHOWING';
let interstitialState: InterstitialState = 'IDLE';
let lastLoadFailedAt = 0;
const LOAD_RETRY_MS = 45_000;
const SHOW_SAFETY_MS = 120_000;

export const preloadInterstitial = () => {
    if (!isNativeAds() || !initialized || !AdMob?.prepareInterstitial) return;
    if (interstitialState !== 'IDLE') return;
    if (Date.now() - lastLoadFailedAt < LOAD_RETRY_MS) return;
    interstitialState = 'LOADING';
    AdMob.prepareInterstitial({ adId: ADMOB_IDS[adPlatform()].interstitial })
        .then(() => { interstitialState = 'READY'; })
        .catch(error => {
            interstitialState = 'IDLE';
            lastLoadFailedAt = Date.now();
            console.warn('Interstitial preload failed:', error);
        });
};

/** In development and on the web there is nothing to preload: the break is simulated or handled by the web ad API. */
export const isInterstitialReady = (): boolean => (isNativeAds() ? interstitialState === 'READY' : true);

/** Shows the preloaded interstitial and resolves when it closes (true) or could not show (false). Never loads on demand. */
export const showPreloadedInterstitial = async (label = 'break'): Promise<boolean> => {
    if (!isNativeAds()) {
        if (typeof window.adBreak === 'function') {
            return new Promise(resolve => {
                window.adBreak({
                    type: 'next',
                    name: label,
                    adBreakDone: (placementInfo: any) => resolve(placementInfo?.breakStatus === 'viewed'),
                });
            });
        }
        console.log(`[DEV SIMULATION] Forced ad: ${label}`);
        return true;
    }
    if (interstitialState !== 'READY' || !AdMob?.showInterstitial) {
        preloadInterstitial();
        return false;
    }
    interstitialState = 'SHOWING';
    return new Promise<boolean>(resolve => {
        let settled = false;
        let handles: Array<{ remove: () => Promise<void> | void }> = [];
        const finish = (shown: boolean) => {
            if (settled) return;
            settled = true;
            handles.forEach(handle => { void handle.remove(); });
            interstitialState = 'IDLE';
            window.setTimeout(preloadInterstitial, 1500);
            resolve(shown);
        };
        Promise.all([
            AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => finish(true)),
            AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => finish(false)),
        ]).then(registered => {
            handles = registered;
            if (settled) { registered.forEach(handle => { void handle.remove(); }); return; }
            AdMob.showInterstitial().catch(() => finish(false));
        }).catch(() => finish(false));
        window.setTimeout(() => finish(true), SHOW_SAFETY_MS);
    });
};

/* ---- the rewarded ad (AE-005) ----
   The plugin settles showRewardVideoAd() only when a reward is earned. Closing the ad early, or an ad that could not
   open, never settled it, so the game's "ad playing" overlay and the golden choices stayed locked until a restart
   (reward_ad_interrupted). The ad was also loaded only after the tap. Now:
   - one ad is loaded in the background (after start-up and after each ad), so a tap opens it at once;
   - a tap waits at most REWARDED_TAP_WAIT_MS for an ad that is not ready, then answers "no ad" and the game moves on;
     an ad that finishes loading later is kept for the next tap and is never shown on its own;
   - every show settles: when the ad closes (earned or not), when it fails to show, when it never opens, or at a long
     last guard;
   - a reward counts only when the SDK reports it earned (its Rewarded event or the show call's reward item). onEarned
     hears it at that moment, before the ad closes, so a restart can still pay what was earned.
   Google expires a loaded ad after an hour, so an older one is replaced. Only one rewarded ad is loaded at a time. */
type RewardedState = 'IDLE' | 'LOADING' | 'READY' | 'SHOWING';
let rewardedState: RewardedState = 'IDLE';
let rewardedLoad: Promise<boolean> | null = null;
let rewardedLoadedAt = 0;
let lastRewardedLoadFailedAt = 0;
const REWARDED_MAX_AGE_MS = 55 * 60_000;
const REWARDED_TAP_WAIT_MS = 8_000;
const REWARDED_OPEN_TIMEOUT_MS = 15_000;
const REWARDED_SHOW_SAFETY_MS = 180_000;

const isRewardedFresh = () => rewardedState === 'READY' && Date.now() - rewardedLoadedAt < REWARDED_MAX_AGE_MS;

const loadRewarded = (): Promise<boolean> => {
    if (!isNativeAds() || !initialized || !AdMob?.prepareRewardVideoAd) return Promise.resolve(false);
    if (isRewardedFresh()) return Promise.resolve(true);
    if (rewardedState === 'SHOWING') return Promise.resolve(false);
    if (rewardedLoad) return rewardedLoad;
    rewardedState = 'LOADING';
    const load: Promise<boolean> = AdMob.prepareRewardVideoAd({ adId: ADMOB_IDS[adPlatform()].rewarded })
        .then(() => {
            rewardedState = 'READY';
            rewardedLoadedAt = Date.now();
            return true;
        })
        .catch(error => {
            rewardedState = 'IDLE';
            lastRewardedLoadFailedAt = Date.now();
            console.warn('Rewarded ad load failed:', error);
            return false;
        })
        .finally(() => { if (rewardedLoad === load) rewardedLoad = null; });
    rewardedLoad = load;
    return load;
};

/** Keeps one rewarded ad loaded in the background. Never loads during a show, nor soon after a failed load. */
export const preloadRewarded = () => {
    if (!isNativeAds() || !initialized) return;
    if (rewardedState === 'LOADING' || rewardedState === 'SHOWING' || isRewardedFresh()) return;
    if (Date.now() - lastRewardedLoadFailedAt < LOAD_RETRY_MS) return;
    void loadRewarded();
};

const settleWithin = <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => new Promise<T>(resolve => {
    const timer = window.setTimeout(() => resolve(fallback), ms);
    promise.then(
        value => { window.clearTimeout(timer); resolve(value); },
        () => { window.clearTimeout(timer); resolve(fallback); },
    );
});

/** A tap's bounded wait for an ad that was not loaded yet: a second try only when the first failed early. */
const waitForRewarded = async (): Promise<boolean> => {
    if (isRewardedFresh()) return true;
    const startedAt = Date.now();
    for (let attempt = 0; attempt < 2; attempt += 1) {
        const left = REWARDED_TAP_WAIT_MS - (Date.now() - startedAt);
        if (left <= 0) break;
        if (await settleWithin(loadRewarded(), left, false)) return isRewardedFresh();
        // still loading when the wait ran out: it stays loading for the next tap and is not shown now
        if (rewardedState === 'LOADING') break;
        await new Promise(resolve => window.setTimeout(resolve, 600));
    }
    return false;
};

const showLoadedRewarded = (onEarned?: () => void): Promise<AdResult> => new Promise<AdResult>(resolve => {
    rewardedState = 'SHOWING';
    let settled = false;
    let opened = false;
    let earned = false;
    let handles: Array<{ remove: () => Promise<void> | void }> = [];
    const timers: number[] = [];
    // The ad covering the app counts as opened: Android can pause the page behind it.
    const onVisibility = () => { if (document.visibilityState === 'hidden') opened = true; };
    const finish = (result: AdResult) => {
        if (settled) return;
        settled = true;
        timers.forEach(timer => window.clearTimeout(timer));
        handles.forEach(handle => { void handle.remove(); });
        document.removeEventListener('visibilitychange', onVisibility);
        rewardedState = 'IDLE';
        window.setTimeout(preloadRewarded, 1500);
        resolve(result);
    };
    const markEarned = () => {
        if (earned) return;
        earned = true;
        try { onEarned?.(); } catch (error) { console.warn('Could not note the earned reward:', error); }
    };
    const afterClose = (): AdResult => (earned ? { success: true } : { success: false, reason: 'NOT_COMPLETED' });
    const afterFailure = (): AdResult => (earned ? { success: true } : { success: false, reason: 'ERROR' });
    document.addEventListener('visibilitychange', onVisibility);
    Promise.all([
        AdMob.addListener(RewardAdPluginEvents.Showed, () => { opened = true; }),
        AdMob.addListener(RewardAdPluginEvents.Rewarded, () => markEarned()),
        AdMob.addListener(RewardAdPluginEvents.Dismissed, () => finish(afterClose())),
        AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => finish(afterFailure())),
    ]).then(registered => {
        handles = registered;
        if (settled) { registered.forEach(handle => { void handle.remove(); }); return; }
        AdMob.showRewardVideoAd()
            .then(reward => { if (reward) markEarned(); })
            .catch(error => {
                console.warn('Rewarded ad could not show:', error);
                finish(afterFailure());
            });
        timers.push(window.setTimeout(() => {
            if (!opened && !earned && document.visibilityState === 'visible') finish({ success: false, reason: 'ERROR' });
        }, REWARDED_OPEN_TIMEOUT_MS));
        timers.push(window.setTimeout(() => finish(afterClose()), REWARDED_SHOW_SAFETY_MS));
    }).catch(() => finish({ success: false, reason: 'ERROR' }));
});

export interface ShowAdOptions {
    /** Rewarded ads: called once, when the SDK reports the reward as earned (before the ad closes). */
    onEarned?: () => void;
}

export const showAd = async (type: AdType, options: ShowAdOptions = {}): Promise<AdResult> => {
    const wantsReward = isRewardedType(type);

    if (!wantsReward) {
        const shown = await showPreloadedInterstitial(type);
        return shown ? { success: true } : { success: false, reason: 'UNAVAILABLE' };
    }

    if (isNativeAds()) {
        await initAds();

        if (!AdMob || !initialized) return { success: false, reason: 'UNAVAILABLE' };
        // one ad at a time: a second request while an ad is up gets "no ad", never a second locked show
        if (rewardedState === 'SHOWING') return { success: false, reason: 'UNAVAILABLE' };

        try {
            if (!(await waitForRewarded())) return { success: false, reason: 'UNAVAILABLE' };
            return await showLoadedRewarded(options.onEarned);
        } catch (err) {
            console.error('Ad failed:', err);
            return { success: false, reason: 'ERROR' };
        }
    }

    if (typeof window.adBreak === 'function') {
        return new Promise(resolve => {
            window.adBreak({
                type: 'reward',
                name: type,
                beforeAd: () => console.log('Web ad starting...'),
                afterAd: () => console.log('Web ad finished.'),
                adBreakDone: (placementInfo: any) => {
                    resolve({
                        success: placementInfo?.breakStatus === 'viewed',
                        reason: placementInfo?.breakStatus === 'viewed' ? undefined : 'NOT_COMPLETED',
                    });
                },
            });
        });
    }

    console.log(`[DEV SIMULATION] Showing ${type} ad...`);
    return new Promise(resolve => {
        setTimeout(() => resolve({ success: true }), 1000);
    });
};
