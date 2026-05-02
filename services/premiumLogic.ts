import { Player } from '../types';

export type PremiumProductId =
    | 'no_ads'
    | 'energy_100'
    | 'energy_250'
    | 'energy_500'
    | 'energy_1000'
    | 'cash_25000'
    | 'cash_75000'
    | 'cash_200000'
    | 'cash_500000'
    | 'cash_1250000'
    | 'bundle_luxury_homes'
    | 'bundle_elite_vehicles'
    | 'bundle_sky_sea'
    | 'bundle_ultimate_lifestyle';

export interface PremiumProduct {
    id: PremiumProductId;
    title: string;
    priceLabel: string;
    kind: 'consumable' | 'non_consumable';
    category: 'ad_free' | 'energy' | 'cash' | 'collection';
    description: string;
    amount?: number;
}

export interface PremiumCollectionGate {
    productId: PremiumProductId;
    title: string;
    teaser: string;
}

const ENERGY_BASELINE = 100;

export const PREMIUM_PRODUCTS: PremiumProduct[] = [
    { id: 'no_ads', title: 'No Ads', priceLabel: '$4.99', kind: 'non_consumable', category: 'ad_free', description: 'Removes forced ads, including the periodic ad and the post-greenlight ad.' },
    { id: 'energy_100', title: '100 Energy', priceLabel: '$0.99', kind: 'consumable', category: 'energy', description: 'Adds 100 bonus energy that carries over week to week until used.', amount: 100 },
    { id: 'energy_250', title: '250 Energy', priceLabel: '$1.99', kind: 'consumable', category: 'energy', description: 'Adds 250 bonus energy for longer play sessions.', amount: 250 },
    { id: 'energy_500', title: '500 Energy', priceLabel: '$3.99', kind: 'consumable', category: 'energy', description: 'A strong energy reserve for multi-week pushing.', amount: 500 },
    { id: 'energy_1000', title: '1000 Energy', priceLabel: '$6.99', kind: 'consumable', category: 'energy', description: 'Big reserve for heavy grinders and power sessions.', amount: 1000 },
    { id: 'cash_25000', title: 'Starter Funding Pack', priceLabel: '$0.99', kind: 'consumable', category: 'cash', description: 'Includes 25,000 in-game funds instantly.', amount: 25000 },
    { id: 'cash_75000', title: 'Breakout Funding Pack', priceLabel: '$1.99', kind: 'consumable', category: 'cash', description: 'Includes 75,000 in-game funds instantly.', amount: 75000 },
    { id: 'cash_200000', title: 'Studio Booster Pack', priceLabel: '$3.99', kind: 'consumable', category: 'cash', description: 'Includes 200,000 in-game funds instantly.', amount: 200000 },
    { id: 'cash_500000', title: 'Empire Growth Pack', priceLabel: '$6.99', kind: 'consumable', category: 'cash', description: 'Includes 500,000 in-game funds instantly.', amount: 500000 },
    { id: 'cash_1250000', title: 'Legacy Vault Pack', priceLabel: '$12.99', kind: 'consumable', category: 'cash', description: 'Includes 1,250,000 in-game funds instantly.', amount: 1250000 },
    { id: 'bundle_luxury_homes', title: 'Luxury Homes Collection', priceLabel: '$4.99', kind: 'non_consumable', category: 'collection', description: 'Unlocks a wider celebrity property ladder, from villas and penthouses to island-tier estates.' },
    { id: 'bundle_elite_vehicles', title: 'Elite Vehicles Collection', priceLabel: '$4.99', kind: 'non_consumable', category: 'collection', description: 'Unlocks an elite garage of hypercars, status SUVs, and premium bikes.' },
    { id: 'bundle_sky_sea', title: 'Sky & Sea Collection', priceLabel: '$6.99', kind: 'non_consumable', category: 'collection', description: 'Unlocks a full prestige transport lane across yachts, watercraft, and private aviation.' },
    { id: 'bundle_ultimate_lifestyle', title: 'Ultimate Lifestyle Collection', priceLabel: '$12.99', kind: 'non_consumable', category: 'collection', description: 'Unlocks every premium collection plus the ultra-luxury fashion and accessories vault.' }
];

const PREMIUM_ASSET_COLLECTIONS: Record<string, PremiumProductId> = {
    prop_hollywood_hills_home: 'bundle_luxury_homes',
    prop_beverly_hills_mansion: 'bundle_luxury_homes',
    prop_manhattan_penthouse: 'bundle_luxury_homes',
    prop_miami_beachfront: 'bundle_luxury_homes',
    prop_aspen_chalet: 'bundle_luxury_homes',
    prop_malibu_beach_house: 'bundle_luxury_homes',
    prop_the_one: 'bundle_luxury_homes',
    prop_paris_eiffel: 'bundle_luxury_homes',
    prop_dubai_palm: 'bundle_luxury_homes',
    prop_tokyo_shibuya: 'bundle_luxury_homes',
    prop_nyc_billionaire: 'bundle_luxury_homes',
    prop_chateau_france: 'bundle_luxury_homes',
    prop_london_townhouse: 'bundle_luxury_homes',
    prop_dubai_royal: 'bundle_luxury_homes',
    prop_private_island: 'bundle_luxury_homes',
    prop_monaco_penthouse: 'bundle_luxury_homes',
    veh_car_porsche911: 'bundle_elite_vehicles',
    veh_car_teslas: 'bundle_elite_vehicles',
    veh_car_gwagon: 'bundle_elite_vehicles',
    veh_car_ferrari488: 'bundle_elite_vehicles',
    veh_car_bugatti: 'bundle_elite_vehicles',
    veh_car_koenigsegg: 'bundle_elite_vehicles',
    veh_car_vintage_ferrari: 'bundle_elite_vehicles',
    veh_car_pagani: 'bundle_elite_vehicles',
    veh_car_rr_cullinan: 'bundle_elite_vehicles',
    veh_bike_ducati: 'bundle_elite_vehicles',
    veh_bike_arch: 'bundle_elite_vehicles',
    veh_boat_jetski: 'bundle_sky_sea',
    veh_boat_mastercraft: 'bundle_sky_sea',
    veh_boat_yacht: 'bundle_sky_sea',
    veh_boat_superyacht: 'bundle_sky_sea',
    veh_plane_cessna: 'bundle_sky_sea',
    veh_plane_cirrus: 'bundle_sky_sea',
    veh_plane_gulfstream: 'bundle_sky_sea',
    veh_plane_bbj: 'bundle_sky_sea',
    cloth_outfit_marilyn: 'bundle_ultimate_lifestyle',
    cloth_outfit_mj_jacket: 'bundle_ultimate_lifestyle',
    cloth_shoe_mags: 'bundle_ultimate_lifestyle',
    cloth_acc_rolex: 'bundle_ultimate_lifestyle',
    cloth_acc_ap: 'bundle_ultimate_lifestyle',
    cloth_acc_richard_mille: 'bundle_ultimate_lifestyle',
    cloth_acc_patek: 'bundle_ultimate_lifestyle',
    cloth_acc_jacob: 'bundle_ultimate_lifestyle',
    cloth_acc_vintage_rolex: 'bundle_ultimate_lifestyle',
    cloth_acc_birkin: 'bundle_ultimate_lifestyle',
    cloth_acc_chanel_flap: 'bundle_ultimate_lifestyle',
    cloth_acc_goyard: 'bundle_ultimate_lifestyle',
    cloth_acc_cartier: 'bundle_ultimate_lifestyle',
    cloth_acc_diamond_ring: 'bundle_ultimate_lifestyle',
    cloth_acc_crown: 'bundle_ultimate_lifestyle',
    cloth_acc_harry_winston: 'bundle_ultimate_lifestyle',
    cloth_acc_bulgari: 'bundle_ultimate_lifestyle',
    cloth_acc_cartier_glasses: 'bundle_ultimate_lifestyle',
    cloth_acc_jacques: 'bundle_ultimate_lifestyle',
    cloth_acc_chrome: 'bundle_ultimate_lifestyle',
};

const PREMIUM_COLLECTION_COPY: Record<PremiumProductId, PremiumCollectionGate> = {
    no_ads: { productId: 'no_ads', title: 'No Ads', teaser: 'Remove forced ads permanently.' },
    energy_100: { productId: 'energy_100', title: '100 Energy', teaser: 'Add a small premium energy refill.' },
    energy_250: { productId: 'energy_250', title: '250 Energy', teaser: 'Add a medium premium energy refill.' },
    energy_500: { productId: 'energy_500', title: '500 Energy', teaser: 'Add a strong premium energy refill.' },
    energy_1000: { productId: 'energy_1000', title: '1000 Energy', teaser: 'Add a huge premium energy refill.' },
    cash_25000: { productId: 'cash_25000', title: 'Starter Funding Pack', teaser: 'Includes 25,000 in-game funds.' },
    cash_75000: { productId: 'cash_75000', title: 'Breakout Funding Pack', teaser: 'Includes 75,000 in-game funds.' },
    cash_200000: { productId: 'cash_200000', title: 'Studio Booster Pack', teaser: 'Includes 200,000 in-game funds.' },
    cash_500000: { productId: 'cash_500000', title: 'Empire Growth Pack', teaser: 'Includes 500,000 in-game funds.' },
    cash_1250000: { productId: 'cash_1250000', title: 'Legacy Vault Pack', teaser: 'Includes 1,250,000 in-game funds.' },
    bundle_luxury_homes: { productId: 'bundle_luxury_homes', title: 'Luxury Homes Collection', teaser: 'Unlock a fuller celebrity property empire: villas, penthouses, ski homes, beachfront addresses, and island-tier estates.' },
    bundle_elite_vehicles: { productId: 'bundle_elite_vehicles', title: 'Elite Vehicles Collection', teaser: 'Unlock a complete elite garage with hypercars, prestige SUVs, and premium bikes inside the normal market.' },
    bundle_sky_sea: { productId: 'bundle_sky_sea', title: 'Sky & Sea Collection', teaser: 'Unlock the full prestige transport fantasy across jet skis, yachts, and private aviation.' },
    bundle_ultimate_lifestyle: { productId: 'bundle_ultimate_lifestyle', title: 'Ultimate Lifestyle Collection', teaser: 'Unlock every premium collection plus the ultra-luxury vault of icon fashion, rare watches, jewelry, and trophy accessories.' },
};

const getOwnedPurchases = (player: Player): PremiumProductId[] => {
    if (!Array.isArray(player.flags?.premiumPurchases)) {
        player.flags.premiumPurchases = [];
    }
    return player.flags.premiumPurchases as PremiumProductId[];
};

const getUnlockedCollections = (player: Player): string[] => {
    if (!Array.isArray(player.flags?.premiumCollections)) {
        player.flags.premiumCollections = [];
    }
    return player.flags.premiumCollections as string[];
};

const ensureEnergyState = (player: Player) => {
    if (typeof player.flags?.weeklyBaseEnergyRemaining !== 'number') {
        player.flags.weeklyBaseEnergyRemaining = Math.max(0, Math.min(ENERGY_BASELINE, player.energy.current));
    }
    if (typeof player.flags?.bonusEnergyBank !== 'number') {
        player.flags.bonusEnergyBank = Math.max(0, player.energy.current - player.flags.weeklyBaseEnergyRemaining);
    }
    syncEnergyDisplay(player);
};

export const syncEnergyDisplay = (player: Player) => {
    const weeklyBase = Math.max(0, player.flags?.weeklyBaseEnergyRemaining || 0);
    const bonusBank = Math.max(0, player.flags?.bonusEnergyBank || 0);
    player.energy.current = weeklyBase + bonusBank;
    player.energy.max = weeklyBase + bonusBank;
};

export const resetWeeklyEnergy = (player: Player) => {
    player.flags.weeklyBaseEnergyRemaining = ENERGY_BASELINE;
    player.flags.bonusEnergyBank = Math.max(0, player.flags?.bonusEnergyBank || 0);
    syncEnergyDisplay(player);
};

const getCommitmentEnergyDrain = (player: Pick<Player, 'commitments'>): number => {
    return player.commitments.reduce((sum, commitment) => {
        if (commitment.type === 'ACTING_GIG') return sum;
        return sum + Math.max(0, commitment.energyCost || 0);
    }, 0);
};

export const syncWeeklyEnergyForCommitments = (player: Player, previousCommitments = player.commitments) => {
    ensureEnergyState(player);

    const previousDrain = getCommitmentEnergyDrain({ commitments: previousCommitments } as Pick<Player, 'commitments'>);
    const currentDrain = getCommitmentEnergyDrain(player);
    const previousCap = Math.max(0, ENERGY_BASELINE - previousDrain);
    const nextCap = Math.max(0, ENERGY_BASELINE - currentDrain);
    const currentBase = Math.max(0, player.flags.weeklyBaseEnergyRemaining || 0);
    const spentFromPreviousCap = Math.max(0, previousCap - currentBase);

    player.flags.weeklyBaseEnergyRemaining = Math.max(0, nextCap - spentFromPreviousCap);
    syncEnergyDisplay(player);
};

export const spendPlayerEnergy = (player: Player, amount: number) => {
    ensureEnergyState(player);

    let remainingCost = Math.max(0, amount);
    const weeklyBase = Math.max(0, player.flags.weeklyBaseEnergyRemaining || 0);
    const bonusBank = Math.max(0, player.flags.bonusEnergyBank || 0);

    const baseSpent = Math.min(weeklyBase, remainingCost);
    remainingCost -= baseSpent;

    const bonusSpent = Math.min(bonusBank, remainingCost);

    player.flags.weeklyBaseEnergyRemaining = weeklyBase - baseSpent;
    player.flags.bonusEnergyBank = bonusBank - bonusSpent;
    syncEnergyDisplay(player);
};

export const restoreWeeklyEnergy = (player: Player, amount: number) => {
    ensureEnergyState(player);
    player.flags.weeklyBaseEnergyRemaining = Math.min(
        ENERGY_BASELINE,
        Math.max(0, player.flags.weeklyBaseEnergyRemaining || 0) + Math.max(0, amount)
    );
    syncEnergyDisplay(player);
};

export const grantPurchasedEnergy = (player: Player, amount: number) => {
    ensureEnergyState(player);
    player.flags.bonusEnergyBank = Math.max(0, player.flags.bonusEnergyBank || 0) + Math.max(0, amount);
    syncEnergyDisplay(player);
};

export const hasNoAds = (player: Player): boolean => getOwnedPurchases(player).includes('no_ads');

export const hasPremiumProduct = (player: Player, productId: PremiumProductId): boolean =>
    getOwnedPurchases(player).includes(productId);

export const getPremiumProduct = (productId: PremiumProductId): PremiumProduct | undefined =>
    PREMIUM_PRODUCTS.find(item => item.id === productId);

export const getRequiredPremiumProductForAsset = (assetId: string): PremiumProductId | null =>
    PREMIUM_ASSET_COLLECTIONS[assetId] || null;

export const getPremiumCollectionGateForAsset = (assetId: string): PremiumCollectionGate | null => {
    const productId = getRequiredPremiumProductForAsset(assetId);
    return productId ? PREMIUM_COLLECTION_COPY[productId] : null;
};

export const hasPremiumAccessForAsset = (player: Player, assetId: string): boolean => {
    const requiredProduct = getRequiredPremiumProductForAsset(assetId);
    if (!requiredProduct) return true;
    return hasPremiumProduct(player, requiredProduct);
};

export const getOwnedPremiumAssetsForCollection = (player: Player, productId: PremiumProductId): string[] =>
    (player.assets || []).filter(assetId => PREMIUM_ASSET_COLLECTIONS[assetId] === productId);

export const hasOwnedPremiumAssetInCollection = (player: Player, productId: PremiumProductId): boolean =>
    getOwnedPremiumAssetsForCollection(player, productId).length > 0;

export const getOwnedPremiumCollectionStatus = (player: Player) => ({
    homes: hasOwnedPremiumAssetInCollection(player, 'bundle_luxury_homes'),
    vehicles: hasOwnedPremiumAssetInCollection(player, 'bundle_elite_vehicles'),
    skySea: hasOwnedPremiumAssetInCollection(player, 'bundle_sky_sea'),
    lifestyle: hasOwnedPremiumAssetInCollection(player, 'bundle_ultimate_lifestyle'),
});

export const applyPremiumPurchase = (player: Player, productId: PremiumProductId): string => {
    const ownedPurchases = getOwnedPurchases(player);
    const unlockedCollections = getUnlockedCollections(player);
    const product = PREMIUM_PRODUCTS.find(item => item.id === productId);

    if (!product) {
        return 'Unknown purchase.';
    }

    if (product.kind === 'non_consumable' && ownedPurchases.includes(productId)) {
        return `${product.title} is already unlocked.`;
    }

    switch (productId) {
        case 'no_ads':
            ownedPurchases.push(productId);
            return 'Ads removed permanently.';
        case 'energy_100':
        case 'energy_250':
        case 'energy_500':
        case 'energy_1000':
            grantPurchasedEnergy(player, product.amount || 0);
            return `+${product.amount} bonus energy added.`;
        case 'cash_25000':
        case 'cash_75000':
        case 'cash_200000':
        case 'cash_500000':
        case 'cash_1250000':
            player.money += product.amount || 0;
            return `+${(product.amount || 0).toLocaleString()} cash added.`;
        case 'bundle_luxury_homes':
        case 'bundle_elite_vehicles':
        case 'bundle_sky_sea':
            ownedPurchases.push(productId);
            if (!unlockedCollections.includes(productId)) {
                unlockedCollections.push(productId);
            }
            return `${product.title} unlocked permanently.`;
        case 'bundle_ultimate_lifestyle':
            ownedPurchases.push(productId);
            ['bundle_luxury_homes', 'bundle_elite_vehicles', 'bundle_sky_sea', 'bundle_ultimate_lifestyle'].forEach(bundleId => {
                if (!ownedPurchases.includes(bundleId as PremiumProductId)) {
                    ownedPurchases.push(bundleId as PremiumProductId);
                }
                if (!unlockedCollections.includes(bundleId)) {
                    unlockedCollections.push(bundleId);
                }
            });
            return 'All premium collections unlocked permanently.';
        default:
            return 'Purchase applied.';
    }
};
