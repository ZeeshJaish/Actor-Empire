import { registerPlugin } from '@capacitor/core';
import { PremiumProductId } from './premiumLogic';

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

interface PurchasesPlugin {
    getProducts(options: { productIds: string[] }): Promise<{ products?: NativeStoreProduct[] }>;
    purchaseProduct(options: { productId: string }): Promise<{ cancelled?: boolean; pending?: boolean; productId?: string; transactionId?: string }>;
    restorePurchases(): Promise<{ productIds?: string[] }>;
}

export interface PremiumCatalogProduct {
    premiumProductId: PremiumProductId;
    storeProductId: string;
    title: string;
    description: string;
    priceLabel: string;
}

const isCapacitorIOS = () => {
    return window.Capacitor?.isNativePlatform?.() && window.Capacitor?.getPlatform?.() === 'ios';
};

const Purchases = registerPlugin<PurchasesPlugin>('Purchases');
const getPurchasesPlugin = () => Purchases;

export const getPremiumCatalogProducts = async (): Promise<PremiumCatalogProduct[]> => {
    if (import.meta.env.DEV || !isCapacitorIOS()) {
        return [];
    }

    try {
        const purchases = getPurchasesPlugin();
        const result = await purchases.getProducts({ productIds: Object.values(IOS_PRODUCT_IDS) });
        const products = result?.products || [];

        return Object.entries(IOS_PRODUCT_IDS).map(([premiumProductId, storeProductId]) => {
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

    if (!isCapacitorIOS()) {
        return { success: false, message: 'Premium purchases are only available on iOS.' };
    }

    const purchases = getPurchasesPlugin();
    if (!purchases?.purchaseProduct) {
        return { success: false, message: 'Capacitor purchase plugin is not configured yet.' };
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

    if (!isCapacitorIOS()) {
        return { success: false, restoredProductIds: [], message: 'Restore is only available on iOS.' };
    }

    const purchases = getPurchasesPlugin();
    if (!purchases?.restorePurchases) {
        return { success: false, restoredProductIds: [], message: 'Capacitor purchase plugin is not configured yet.' };
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
