import { AdType } from '../types';

const ADMOB_IDS = {
    ios: {
        rewarded: 'ca-app-pub-1351550313263506/9092996465',
        interstitial: 'ca-app-pub-1351550313263506/1369584962',
    },
    android: {
        rewarded: 'ca-app-pub-1351550313263506/5856820425',
        interstitial: 'ca-app-pub-1351550313263506/1162896946',
    },
};

export interface AdResult {
    success: boolean;
}

declare global {
    interface Window {
        Capacitor?: {
            isNativePlatform?: () => boolean;
            getPlatform?: () => string;
            Plugins?: {
                AdMob?: any;
            };
        };
        AdMob?: any;
        adBreak?: any;
        adConfig?: any;
    }
}

let initialized = false;

const getAdMob = () => window.AdMob || window.Capacitor?.Plugins?.AdMob;
const isRewardedType = (type: AdType) => type !== 'INTERSTITIAL';

const requestConsent = async () => {
    const AdMob = getAdMob();
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
    const isNative = window.Capacitor?.isNativePlatform?.();

    if (!isNative) {
        if (window.adConfig) {
            window.adConfig({
                preloadAdBreaks: 'on',
                sound: 'on',
            });
        }
        return;
    }

    if (initialized) return;

    const AdMob = getAdMob();
    if (!AdMob?.initialize) {
        console.warn('AdMob plugin not found. Native ads are unavailable.');
        return;
    }

    await requestConsent();

    try {
        await AdMob.initialize({
            requestTrackingAuthorization: true,
        });
        initialized = true;
        console.log('AdMob initialized after consent');
    } catch (err) {
        console.error('AdMob init failed:', err);
    }
};

export const showAd = async (type: AdType): Promise<AdResult> => {
    const isNative = window.Capacitor?.isNativePlatform?.();
    const wantsReward = isRewardedType(type);

    if (isNative) {
        await initAds();

        const AdMob = getAdMob();
        if (!AdMob) return { success: false };

        const platform = (window.Capacitor?.getPlatform?.() === 'ios' ? 'ios' : 'android') as 'ios' | 'android';
        const ids = ADMOB_IDS[platform];

        try {
            if (!wantsReward) {
                await AdMob.prepareInterstitial({
                    adId: ids.interstitial,
                });
                await AdMob.showInterstitial();
                return { success: true };
            }

            await AdMob.prepareRewardVideoAd({
                adId: ids.rewarded,
            });

            const reward = await AdMob.showRewardVideoAd();
            if (!reward) return { success: false };

            return { success: true };
        } catch (err) {
            console.error('Ad failed:', err);
            return { success: false };
        }
    }

    if (typeof window.adBreak === 'function') {
        return new Promise(resolve => {
            window.adBreak({
                type: wantsReward ? 'reward' : 'next',
                name: type,
                beforeAd: () => console.log('Web ad starting...'),
                afterAd: () => console.log('Web ad finished.'),
                adBreakDone: (placementInfo: any) => {
                    resolve({ success: placementInfo?.breakStatus === 'viewed' });
                },
            });
        });
    }

    console.log(`[DEV SIMULATION] Showing ${type} ad...`);
    return new Promise(resolve => {
        setTimeout(() => resolve({ success: true }), 1000);
    });
};
