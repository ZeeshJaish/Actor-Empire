import { AdMob, InterstitialAdPluginEvents, MaxAdContentRating } from '@capacitor-community/admob';
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

export const showAd = async (type: AdType): Promise<AdResult> => {
    const wantsReward = isRewardedType(type);

    if (!wantsReward) {
        const shown = await showPreloadedInterstitial(type);
        return shown ? { success: true } : { success: false, reason: 'UNAVAILABLE' };
    }

    if (isNativeAds()) {
        await initAds();

        if (!AdMob) return { success: false, reason: 'UNAVAILABLE' };

        const ids = ADMOB_IDS[adPlatform()];

        try {
            for (let attempt = 0; attempt < 2; attempt += 1) {
                try {
                    await AdMob.prepareRewardVideoAd({
                        adId: ids.rewarded,
                    });

                    const reward = await AdMob.showRewardVideoAd();
                    if (reward) return { success: true };
                    return { success: false, reason: 'NOT_COMPLETED' };
                } catch (error) {
                    if (attempt === 1) {
                        console.error('Rewarded ad failed:', error);
                        return { success: false, reason: 'ERROR' };
                    }
                    await new Promise(resolve => setTimeout(resolve, 600));
                }
            }

            return { success: false, reason: 'UNAVAILABLE' };
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
