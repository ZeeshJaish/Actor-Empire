import React, { useEffect, useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import type { ActorSkills, Player } from '../types';
import { formatMoney } from '../services/formatUtils';
import type { PremiumProductId } from '../services/premiumLogic';
import { getPremiumCatalogProducts } from '../services/iapService';
import { ALL_GENRES, formatGenreLabel } from '../services/genreCatalog';
import { getPlayerLanguage, t } from '../services/i18n';
import { buildStoreUiModel } from '../services/storeUiAdapter';
import type { WellnessRewardAdState } from '../services/rewardedAdExperience';
import StoreScreen, { type StoreScreenCopy, type WellnessAdUiState } from '../components/ui-overhaul/StoreScreen';

const PREMIUM_STORE_ENABLED = true;
const STORE_SKILLS: Array<keyof ActorSkills> = ['delivery', 'memorization', 'expression', 'improvisation', 'discipline', 'presence', 'charisma'];

interface StorePageProps {
    player: Player;
    onBack: () => void;
    onWatchAd: (type: 'REWARDED_CASH' | 'REWARDED_ENERGY' | 'REWARDED_STATS' | 'REWARDED_SKILL' | 'REWARDED_GENRE', data?: any) => void;
    wellnessRewardAd: WellnessRewardAdState;
    wellnessAdNowMs: number;
    onPremiumPurchase: (productId: PremiumProductId) => void;
    onRestorePurchases: () => void;
}

export const StorePage: React.FC<StorePageProps> = ({ player, onBack, onWatchAd, wellnessRewardAd, wellnessAdNowMs, onPremiumPurchase, onRestorePurchases }) => {
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
        wellnessAdOne: t(language, 'store.wellness.adOne'),
        wellnessAdTwo: t(language, 'store.wellness.adTwo'),
    }), [language]);
    const wellnessAd = useMemo<WellnessAdUiState>(() => {
        const retrySeconds = wellnessRewardAd.retryExpiresAt === undefined
            ? 0
            : Math.max(0, Math.ceil((wellnessRewardAd.retryExpiresAt - wellnessAdNowMs) / 1_000));
        const retryTime = `${Math.floor(retrySeconds / 60)}:${String(retrySeconds % 60).padStart(2, '0')}`;
        const isShowingFirst = wellnessRewardAd.status === 'SHOWING_AD_1';
        const isShowingSecond = wellnessRewardAd.status === 'SHOWING_AD_2';
        const isCompleted = wellnessRewardAd.status === 'COMPLETED';

        let actionLabel = t(language, 'store.wellness.watchFirst');
        let statusLabel = t(language, 'store.wellness.adsRequired');
        if (isShowingFirst) {
            actionLabel = t(language, 'store.wellness.loadingFirst');
            statusLabel = t(language, 'store.wellness.loadingStatus');
        } else if (wellnessRewardAd.status === 'RETRY_AD_1') {
            actionLabel = t(language, 'store.wellness.retryFirst');
            statusLabel = t(language, 'store.wellness.firstNotCompleted');
        } else if (wellnessRewardAd.status === 'AWAITING_AD_2') {
            actionLabel = t(language, 'store.wellness.watchSecond');
            statusLabel = t(language, 'store.wellness.firstComplete');
        } else if (isShowingSecond) {
            actionLabel = t(language, 'store.wellness.loadingSecond');
            statusLabel = t(language, 'store.wellness.firstComplete');
        } else if (wellnessRewardAd.status === 'RETRY_AD_2') {
            actionLabel = t(language, 'store.wellness.retrySecond', { time: retryTime });
            statusLabel = t(language, 'store.wellness.firstSaved', { time: retryTime });
        } else if (isCompleted) {
            actionLabel = t(language, 'store.wellness.completedAction');
            statusLabel = t(language, 'store.wellness.completedStatus');
        }

        return {
            completedSteps: wellnessRewardAd.completedSteps,
            actionLabel,
            statusLabel,
            disabled: isShowingFirst || isShowingSecond || isCompleted,
        };
    }, [language, wellnessAdNowMs, wellnessRewardAd]);
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
        wellnessAd={wellnessAd}
        onBack={onBack}
        onWatchAd={onWatchAd}
        onBuy={onPremiumPurchase}
        onRestore={onRestorePurchases}
    />;
};
