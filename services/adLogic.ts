import { AdMob } from '@capacitor-community/admob';
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

    if (!AdMob?.initialize) {
        console.warn('AdMob plugin not found. Native ads are unavailable.');
        return;
    }

    await requestConsent();

    try {
        await AdMob.initialize();
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

        if (!AdMob) return { success: false, reason: 'UNAVAILABLE' };

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
                type: wantsReward ? 'reward' : 'next',
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
