import React, { useEffect, useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import type { ActorSkills, Player } from '../types';
import { formatMoney } from '../services/formatUtils';
import type { PremiumProductId } from '../services/premiumLogic';
import { getPremiumCatalogProducts } from '../services/iapService';
import { ALL_GENRES, formatGenreLabel } from '../services/genreCatalog';
import { getPlayerLanguage, t } from '../services/i18n';
import { buildStoreUiModel } from '../services/storeUiAdapter';
import StoreScreen, { type StoreScreenCopy } from '../components/ui-overhaul/StoreScreen';

const PREMIUM_STORE_ENABLED = true;
const STORE_SKILLS: Array<keyof ActorSkills> = ['delivery', 'memorization', 'expression', 'improvisation', 'discipline', 'presence', 'charisma'];

interface StorePageProps {
    player: Player;
    onBack: () => void;
    onWatchAd: (type: 'REWARDED_CASH' | 'REWARDED_ENERGY' | 'REWARDED_STATS' | 'REWARDED_SKILL' | 'REWARDED_GENRE', data?: any) => void;
    onPremiumPurchase: (productId: PremiumProductId) => void;
    onRestorePurchases: () => void;
}

export const StorePage: React.FC<StorePageProps> = ({ player, onBack, onWatchAd, onPremiumPurchase, onRestorePurchases }) => {
    const [catalogPrices, setCatalogPrices] = useState<Partial<Record<PremiumProductId, string>>>({});
    const isIOSDevice = typeof navigator !== 'undefined' && (
        /iPad|iPhone|iPod/.test(navigator.userAgent)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
        || (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios')
    );
    const isAndroidDevice = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
    const showPremiumStore = PREMIUM_STORE_ENABLED && (isIOSDevice || isAndroidDevice || import.meta.env.DEV);
    const language = getPlayerLanguage(player);

    useEffect(() => {
        if (!showPremiumStore) return;
        getPremiumCatalogProducts().then(products => {
            if (products.length === 0) return;
            const nextPrices: Partial<Record<PremiumProductId, string>> = {};
            products.forEach(product => {
                nextPrices[product.premiumProductId] = product.priceLabel;
            });
            setCatalogPrices(nextPrices);
        });
    }, [showPremiumStore]);

    const model = useMemo(
        () => buildStoreUiModel(player, language, catalogPrices),
        [catalogPrices, language, player],
    );
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
        onBack={onBack}
        onWatchAd={onWatchAd}
        onBuy={onPremiumPurchase}
        onRestore={onRestorePurchases}
    />;
};
