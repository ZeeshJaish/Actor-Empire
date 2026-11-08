import React, { useEffect, useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import type { ActorSkills, Player } from '../types';
import { formatMoney } from '../services/formatUtils';
import { hasNoAds, type PremiumProductId } from '../services/premiumLogic';
import { getPremiumCatalogProducts } from '../services/iapService';
import { ALL_GENRES, formatGenreLabel } from '../services/genreCatalog';
import { getPlayerLanguage, t } from '../services/i18n';
import { buildStoreUiModel } from '../services/storeUiAdapter';
import { rewardedCashAmount } from '../services/rewardedCash';
import { hasStreamingPlus } from '../services/streamingPlusPack';
import { openStreamingPlusSheet } from '../services/streamingPlusEvents';
import StoreScreen, { type StoreScreenCopy } from '../components/ui-overhaul/StoreScreen';

const PREMIUM_STORE_ENABLED = true;
const STORE_SKILLS: Array<keyof ActorSkills> = ['delivery', 'memorization', 'expression', 'improvisation', 'discipline', 'presence', 'charisma'];

interface StorePageProps {
    player: Player;
    onBack: () => void;
    onWatchAd: (type: 'REWARDED_CASH' | 'REWARDED_ENERGY' | 'REWARDED_STATS' | 'REWARDED_SKILL' | 'REWARDED_GENRE', data?: any) => void;
    onPremiumPurchase: (productId: PremiumProductId) => void | Promise<void>;
    onRestorePurchases: () => void | Promise<void>;
}

export const StorePage: React.FC<StorePageProps> = ({ player, onBack, onWatchAd, onPremiumPurchase, onRestorePurchases }) => {
    const [catalogPrices, setCatalogPrices] = useState<Partial<Record<PremiumProductId, string>>>({});
    const [catalogAmounts, setCatalogAmounts] = useState<Partial<Record<PremiumProductId, number>>>({});
    const isIOSDevice = typeof navigator !== 'undefined' && (
        /iPad|iPhone|iPod/.test(navigator.userAgent)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
        || (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios')
    );
    const isAndroidDevice = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
    const isNativeStore = Capacitor.isNativePlatform() && (Capacitor.getPlatform() === 'ios' || Capacitor.getPlatform() === 'android');
    const showPremiumStore = PREMIUM_STORE_ENABLED && (isIOSDevice || isAndroidDevice || import.meta.env.DEV);
    const language = getPlayerLanguage(player);

    useEffect(() => {
        if (!showPremiumStore) return;
        getPremiumCatalogProducts().then(products => {
            if (products.length === 0) return;
            const nextPrices: Partial<Record<PremiumProductId, string>> = {};
            const nextAmounts: Partial<Record<PremiumProductId, number>> = {};
            products.forEach(product => {
                nextPrices[product.premiumProductId] = product.priceLabel;
                if (typeof product.priceAmount === 'number') nextAmounts[product.premiumProductId] = product.priceAmount;
            });
            setCatalogPrices(nextPrices);
            setCatalogAmounts(nextAmounts);
        });
    }, [showPremiumStore]);

    /* On a phone only the store's own prices are shown (App Store 3.1.1, Play Payments); in development the list prices stand in */
    const model = useMemo(
        () => buildStoreUiModel(player, language, catalogPrices, { amounts: catalogAmounts, requireStorePrices: isNativeStore }),
        [catalogAmounts, catalogPrices, isNativeStore, language, player],
    );
    const rewardedCash = useMemo(() => rewardedCashAmount(player), [player]);
    const copy = useMemo<StoreScreenCopy>(() => ({
        premiumTab: t(language, 'store.premium.tab'),
        restore: t(language, 'store.premium.restorePurchases'),
        owned: t(language, 'store.premium.owned'),
        add: t(language, 'store.premium.add'),
        unlock: t(language, 'store.premium.unlock'),
        confirmTitle: t(language, 'store.premium.confirmPurchase'),
        confirmBuyPrefix: t(language, 'store.premium.confirmBuyPrefix'),
        chargePrefix: t(language, 'store.premium.appleChargePrefix'),
        chargeSuffix: t(language, 'store.premium.appleChargeSuffix'),
        rewardAfterConfirm: t(language, 'store.premium.rewardAfterConfirm'),
        cancel: t(language, 'store.premium.cancel'),
        continue: t(language, 'store.premium.continue'),
    }), [language]);
    const premiumNote = isIOSDevice
        ? t(language, 'store.premium.iosCatalog')
        : isAndroidDevice
            ? t(language, 'store.premium.androidCatalog')
            : t(language, 'store.premium.devCatalog');
    const storeName = isAndroidDevice ? 'Google Play' : isIOSDevice ? 'the App Store' : 'the store';
    const ownsStreamingPlus = hasStreamingPlus(player);
    return <StoreScreen
        money={formatMoney(player.money)}
        bonusBank={model.bonusBank}
        readyEnergy={model.readyEnergy}
        groups={model.groups}
        showPremium={showPremiumStore}
        premiumNote={premiumNote}
        skills={STORE_SKILLS}
        genres={ALL_GENRES}
        formatGenre={formatGenreLabel}
        copy={copy}
        rewardedCash={rewardedCash}
        noAdsOwner={hasNoAds(player)}
        streamingPlus={{ owned: ownsStreamingPlus, price: catalogPrices.streaming_plus || (isNativeStore ? null : '$7.99') }}
        onOpenStreamingPlus={() => openStreamingPlusSheet({ source: 'store-card' })}
        storeName={storeName}
        onBack={onBack}
        onWatchAd={onWatchAd}
        onBuy={onPremiumPurchase}
        onRestore={onRestorePurchases}
    />;
};
