
import { AdType } from '../types';

// ==========================================
// 🚨 PRODUCTION CONFIGURATION 🚨
// ==========================================
// 1. REPLACE THESE IDs WITH YOUR REAL ADMOB IDs FROM GOOGLE ADMOB CONSOLE
// 2. ENSURE @capacitor-community/admob IS INSTALLED
// ==========================================

const ADMOB_IDS = {
    android: {
        appId: 'ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX', // REPLACE WITH YOUR ANDROID APP ID
        interstitial: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', // REPLACE WITH YOUR ANDROID INTERSTITIAL ID
        rewarded: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX' // REPLACE WITH YOUR ANDROID REWARDED ID
    },
    ios: {
        appId: 'ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX', // REPLACE WITH YOUR IOS APP ID
        interstitial: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', // REPLACE WITH YOUR IOS INTERSTITIAL ID
        rewarded: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX' // REPLACE WITH YOUR IOS REWARDED ID
    }
};

// Toggle this to TRUE if you want to force test ads, FALSE for production
const IS_DEVELOPMENT = false; 

// Google's Official Test IDs (Used if IS_DEVELOPMENT is true)
const TEST_IDS = {
    android: {
        appId: 'ca-app-pub-3940256099942544~3347511713',
        interstitial: 'ca-app-pub-3940256099942544/1033173712',
        rewarded: 'ca-app-pub-3940256099942544/5224354917'
    },
    ios: {
        appId: 'ca-app-pub-3940256099942544~1458002511',
        interstitial: 'ca-app-pub-3940256099942544/4411468910',
        rewarded: 'ca-app-pub-3940256099942544/1712485313'
    }
};

export interface AdResult {
    success: boolean;
    rewardType?: string;
    amount?: number;
}

declare global {
    interface Window {
        Capacitor?: any;
        adBreak?: any;
        adConfig?: any;
        AdMob?: any; 
    }
}

let isAdMobInitialized = false;

// --- 1. INITIALIZATION ---
export const initAds = async () => {
    const isNative = window.Capacitor?.isNativePlatform();

    if (isNative) {
        console.log("📱 Native Platform Detected: Initializing AdMob...");
        try {
            // Access AdMob via global or Capacitor Plugins
            const AdMob = window.AdMob || (window as any).Capacitor?.Plugins?.AdMob;

            if (AdMob) {
                await AdMob.initialize({
                    requestTrackingAuthorization: true,
                    // testingDevices: ['YOUR_DEVICE_ID'], // Uncomment and add device ID for real ads in dev
                    initializeForTesting: IS_DEVELOPMENT, 
                });
                isAdMobInitialized = true;
                console.log("✅ AdMob Initialized (Native)");
            } else {
                console.warn("⚠️ AdMob Plugin not found. Run: npm install @capacitor-community/admob");
            }
        } catch (e) {
            console.error("❌ AdMob Init Error:", e);
        }
    } else {
        // Web H5 Setup (AdSense/GameDistribution)
        console.log("🌐 Web Platform: Using H5 fallback");
        if (window.adConfig) {
            window.adConfig({
                preloadAdBreaks: 'on',
                sound: 'on',
            });
        }
    }
};

// --- 2. SHOW AD LOGIC ---
export const showAd = async (type: AdType): Promise<AdResult> => {
    const isNative = window.Capacitor?.isNativePlatform();
    const isReward = type !== 'INTERSTITIAL';

    // === NATIVE MOBILE (ADMOB) ===
    if (isNative) {
        if (!isAdMobInitialized) await initAds();

        const AdMob = window.AdMob || (window as any).Capacitor?.Plugins?.AdMob;
        if (!AdMob) return { success: false };

        const platform = (window.Capacitor.getPlatform() === 'ios') ? 'ios' : 'android';
        // Use Test IDs if in development mode, otherwise use real IDs
        const ids = IS_DEVELOPMENT ? TEST_IDS[platform] : ADMOB_IDS[platform];

        try {
            if (isReward) {
                // REWARDED VIDEO
                await AdMob.prepareRewardVideoAd({
                    adId: ids.rewarded,
                    isTesting: IS_DEVELOPMENT
                });
                
                const rewardItem = await AdMob.showRewardVideoAd();
                console.log("💰 AdMob Reward Earned:", rewardItem);
                
                return { success: true, rewardType: type };
            } else {
                // INTERSTITIAL
                await AdMob.prepareInterstitial({
                    adId: ids.interstitial,
                    isTesting: IS_DEVELOPMENT
                });

                await AdMob.showInterstitial();
                return { success: true };
            }
        } catch (e) {
            console.error("❌ AdMob Show Error:", e);
            return { success: false };
        }
    }

    // === WEB FALLBACK (AdSense H5 / Simulation) ===
    if (typeof window.adBreak === 'function') {
        return new Promise((resolve) => {
            window.adBreak!({
                type: isReward ? 'reward' : 'next',
                name: type,
                beforeAd: () => console.log("Web Ad starting..."),
                afterAd: () => console.log("Web Ad finished."),
                adBreakDone: (placementInfo: any) => {
                    if (placementInfo.breakStatus === 'viewed') {
                        resolve({ success: true, rewardType: type });
                    } else {
                        resolve({ success: false });
                    }
                }
            });
        });
    } else {
        // DEV/LOCALHOST SIMULATION (No AdBlock)
        console.log(`[DEV SIMULATION] Showing ${type} Ad...`);
        return new Promise((resolve) => {
            setTimeout(() => {
                const success = true; 
                console.log(`[DEV SIMULATION] Ad Complete: ${success}`);
                resolve({ success, rewardType: type });
            }, 1000);
        });
    }
};
