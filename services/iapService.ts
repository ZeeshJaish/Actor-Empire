import { Capacitor, registerPlugin } from '@capacitor/core';
import { getPremiumProduct, PremiumProductId } from './premiumLogic';

export const IOS_PRODUCT_IDS: Record<PremiumProductId, string> = {
    no_ads: 'com.zeeshapps.actorempire.noads',
    energy_100: 'com.zeeshapps.actorempire.energy100',
    energy_250: 'com.zeeshapps.actorempire.energy250',
    energy_500: 'com.zeeshapps.actorempire.energy500',
    energy_1000: 'com.zeeshapps.actorempire.energy1000',
    cash_25000: 'com.zeeshapps.actorempire.cash25000',
    cash_75000: 'com.zeeshapps.actorempire.cash75000',
    cash_200000: 'com.zeeshapps.actorempire.cash200000',
    cash_500000: 'com.zeeshapps.actorempire.cash500000',
    cash_1250000: 'com.zeeshapps.actorempire.cash1250000',
    bundle_luxury_homes: 'com.zeeshapps.actorempire.homesbundle',
    bundle_elite_vehicles: 'com.zeeshapps.actorempire.vehiclesbundle',
    bundle_sky_sea: 'com.zeeshapps.actorempire.skyseabundle',
    bundle_ultimate_lifestyle: 'com.zeeshapps.actorempire.ultimatelifestyle',
};

export const ANDROID_PRODUCT_IDS: Record<PremiumProductId, string> = {
    no_ads: 'no_ads',
    energy_100: 'energy_100',
    energy_250: 'energy_250',
    energy_500: 'energy_500',
    energy_1000: 'energy_1000',
    cash_25000: 'cash_25000',
    cash_75000: 'cash_75000',
    cash_200000: 'cash_200000',
    cash_500000: 'cash_500000',
    cash_1250000: 'cash_1250000',
    bundle_luxury_homes: 'bundle_luxury_homes',
    bundle_elite_vehicles: 'bundle_elite_vehicles',
    bundle_sky_sea: 'bundle_sky_sea',
    bundle_ultimate_lifestyle: 'bundle_ultimate_lifestyle',
};

interface PurchaseResult {
    success: boolean;
    cancelled?: boolean;
    message: string;
}

interface RestoreResult {
    success: boolean;
    restoredProductIds: PremiumProductId[];
    message: string;
}

interface NativeStoreProduct {
    productId: string;
    title: string;
    description: string;
    price: number;
    priceLabel: string;
    type: string;
}

interface AndroidPurchaseToken {
    productIds?: string[];
    purchaseToken?: string;
    orderId?: string;
    purchaseState?: number;
    acknowledged?: boolean;
}

interface PurchasesPlugin {
    getProducts(options: { productIds: string[] }): Promise<{ products?: NativeStoreProduct[] }>;
    purchaseProduct(options: { productId: string }): Promise<{ cancelled?: boolean; pending?: boolean; productId?: string; transactionId?: string }>;
    restorePurchases(): Promise<{ productIds?: string[] }>;
}

interface AndroidPurchasesPlugin {
    getProducts(options: { productIds: string[] }): Promise<{ products?: NativeStoreProduct[] }>;
    purchaseProduct(options: { productId: string }): Promise<{ cancelled?: boolean; purchases?: AndroidPurchaseToken[] }>;
    restorePurchases(): Promise<{ purchases?: AndroidPurchaseToken[] }>;
    acknowledgePurchase(options: { purchaseToken: string }): Promise<{ success?: boolean }>;
    consumePurchase(options: { purchaseToken: string }): Promise<{ success?: boolean }>;
}

export interface PremiumCatalogProduct {
    premiumProductId: PremiumProductId;
    storeProductId: string;
    title: string;
    description: string;
    priceLabel: string;
}

const isCapacitorIOS = () => {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
};

const isCapacitorAndroid = () => {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
};

const Purchases = registerPlugin<PurchasesPlugin>('Purchases');
const AndroidPurchases = registerPlugin<AndroidPurchasesPlugin>('AndroidPurchases');

const isPurchasesPluginAvailable = () => {
    return Capacitor.isPluginAvailable('Purchases');
};

const getPurchasesPlugin = () => {
    return isPurchasesPluginAvailable() ? Purchases : null;
};

const getAndroidPurchasesPlugin = () => {
    return Capacitor.isPluginAvailable('AndroidPurchases') ? AndroidPurchases : null;
};

const getAndroidPurchaseForStoreProduct = (purchases: AndroidPurchaseToken[] | undefined, storeProductId: string) =>
    (purchases || []).find(purchase => purchase.productIds?.includes(storeProductId) && !!purchase.purchaseToken);

const finishAndroidPurchase = async (
    purchases: AndroidPurchasesPlugin,
    productId: PremiumProductId,
    purchase: AndroidPurchaseToken
) => {
    if (!purchase.purchaseToken) return;
    const product = getPremiumProduct(productId);
    try {
        if (product?.kind === 'consumable') {
            await purchases.consumePurchase({ purchaseToken: purchase.purchaseToken });
        } else if (!purchase.acknowledged) {
            await purchases.acknowledgePurchase({ purchaseToken: purchase.purchaseToken });
        }
    } catch (error) {
        console.warn('[IAP] Android purchase succeeded but Play finalization failed', error);
    }
};

export const getPremiumCatalogProducts = async (): Promise<PremiumCatalogProduct[]> => {
    if (import.meta.env.DEV) {
        return [];
    }

    const platformProductIds = isCapacitorAndroid() ? ANDROID_PRODUCT_IDS : IOS_PRODUCT_IDS;
    if (!isCapacitorIOS() && !isCapacitorAndroid()) {
        return [];
    }

    if (isCapacitorAndroid()) {
        try {
            const purchases = getAndroidPurchasesPlugin();
            if (!purchases?.getProducts) {
                return [];
            }
            const result = await purchases.getProducts({ productIds: Object.values(platformProductIds) });
            const products = result?.products || [];

            return Object.entries(platformProductIds).map(([premiumProductId, storeProductId]) => {
                const match = products.find(product => product.productId === storeProductId);
                return {
                    premiumProductId: premiumProductId as PremiumProductId,
                    storeProductId,
                    title: match?.title || '',
                    description: match?.description || '',
                    priceLabel: match?.priceLabel || ''
                };
            }).filter(product => !!product.priceLabel);
        } catch {
            return [];
        }
    }

    try {
        const purchases = getPurchasesPlugin();
        if (!purchases?.getProducts) {
            return [];
        }
        const result = await purchases.getProducts({ productIds: Object.values(platformProductIds) });
        const products = result?.products || [];

        return Object.entries(platformProductIds).map(([premiumProductId, storeProductId]) => {
            const match = products.find(product => product.productId === storeProductId);
            return {
                premiumProductId: premiumProductId as PremiumProductId,
                storeProductId,
                title: match?.title || '',
                description: match?.description || '',
                priceLabel: match?.priceLabel || ''
            };
        }).filter(product => !!product.priceLabel);
    } catch {
        return [];
    }
};

export const purchasePremiumProduct = async (productId: PremiumProductId): Promise<PurchaseResult> => {
    if (import.meta.env.DEV) {
        return { success: true, message: 'Simulated premium purchase confirmed in development.' };
    }

    if (isCapacitorAndroid()) {
        const purchases = getAndroidPurchasesPlugin();
        if (!purchases?.purchaseProduct) {
            return { success: false, message: 'Purchases are not available in this Android build yet. Please update the app and try again.' };
        }

        try {
            const storeProductId = ANDROID_PRODUCT_IDS[productId];
            const result = await purchases.purchaseProduct({ productId: storeProductId });
            if (result?.cancelled) {
                return { success: false, cancelled: true, message: 'Purchase cancelled.' };
            }

            const purchase = getAndroidPurchaseForStoreProduct(result?.purchases, storeProductId);
            const purchaseToken = purchase?.purchaseToken;
            if (!purchaseToken) {
                return { success: false, message: 'Purchase did not return a verification token.' };
            }

            await finishAndroidPurchase(purchases, productId, purchase);
            return {
                success: true,
                message: 'Android purchase confirmed.'
            };
        } catch (error: any) {
            const message = String(error?.message || error || 'Purchase failed.');
            const cancelled = /cancel/i.test(message);
            return { success: false, cancelled, message: cancelled ? 'Purchase cancelled.' : message };
        }
    }

    if (!isCapacitorIOS()) {
        return { success: false, message: 'Premium purchases are only available on iOS.' };
    }

    const purchases = getPurchasesPlugin();
    if (!purchases?.purchaseProduct) {
        return { success: false, message: 'Purchases are not available in this build yet. Please update the app and try again.' };
    }

    try {
        const storeProductId = IOS_PRODUCT_IDS[productId];
        const result = await purchases.purchaseProduct({ productId: storeProductId });
        if (result?.cancelled) {
            return { success: false, cancelled: true, message: 'Purchase cancelled.' };
        }
        if (result?.pending) {
            return { success: false, message: 'Purchase is pending approval.' };
        }
        return { success: true, message: 'Purchase confirmed.' };
    } catch (error: any) {
        const message = String(error?.message || error || 'Purchase failed.');
        const cancelled = /cancel/i.test(message);
        return { success: false, cancelled, message: cancelled ? 'Purchase cancelled.' : message };
    }
};

export const restorePremiumPurchases = async (): Promise<RestoreResult> => {
    if (import.meta.env.DEV) {
        return { success: true, restoredProductIds: [], message: 'No dev purchases to restore.' };
    }

    if (isCapacitorAndroid()) {
        const purchases = getAndroidPurchasesPlugin();
        if (!purchases?.restorePurchases) {
            return { success: false, restoredProductIds: [], message: 'Purchases are not available in this Android build yet. Please update the app and try again.' };
        }

        try {
            const result = await purchases.restorePurchases();
            const restoredProductIds: PremiumProductId[] = [];
            for (const [premiumProductId, storeProductId] of Object.entries(ANDROID_PRODUCT_IDS)) {
                const purchase = getAndroidPurchaseForStoreProduct(result?.purchases, storeProductId);
                if (!purchase?.purchaseToken) continue;
                restoredProductIds.push(premiumProductId as PremiumProductId);
                await finishAndroidPurchase(purchases, premiumProductId as PremiumProductId, purchase);
            }

            return {
                success: restoredProductIds.length > 0,
                restoredProductIds,
                message: restoredProductIds.length > 0 ? 'Android purchases restored.' : 'No Android purchases found to restore.'
            };
        } catch (error: any) {
            return {
                success: false,
                restoredProductIds: [],
                message: String(error?.message || error || 'Restore failed.')
            };
        }
    }

    if (!isCapacitorIOS()) {
        return { success: false, restoredProductIds: [], message: 'Restore is only available on iOS.' };
    }

    const purchases = getPurchasesPlugin();
    if (!purchases?.restorePurchases) {
        return { success: false, restoredProductIds: [], message: 'Purchases are not available in this build yet. Please update the app and try again.' };
    }

    try {
        const result = await purchases.restorePurchases();
        const rawIds = result?.productIds || [];
        const restoredProductIds = Object.entries(IOS_PRODUCT_IDS)
            .filter(([, storeId]) => rawIds.includes(storeId))
            .map(([premiumId]) => premiumId as PremiumProductId);

        return {
            success: true,
            restoredProductIds,
            message: restoredProductIds.length > 0 ? 'Purchases restored.' : 'No previous purchases found.'
        };
    } catch (error: any) {
        return {
            success: false,
            restoredProductIds: [],
            message: String(error?.message || error || 'Restore failed.')
        };
    }
};
