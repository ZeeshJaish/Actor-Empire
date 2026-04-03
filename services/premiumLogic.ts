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

const ENERGY_BASELINE = 100;

export const PREMIUM_PRODUCTS: PremiumProduct[] = [
    { id: 'no_ads', title: 'No Ads', priceLabel: '$4.99', kind: 'non_consumable', category: 'ad_free', description: 'Removes forced ads, including the periodic ad and the post-greenlight ad.' },
    { id: 'energy_100', title: '100 Energy', priceLabel: '$0.99', kind: 'consumable', category: 'energy', description: 'Adds 100 bonus energy that carries over week to week until used.', amount: 100 },
    { id: 'energy_250', title: '250 Energy', priceLabel: '$1.99', kind: 'consumable', category: 'energy', description: 'Adds 250 bonus energy for longer play sessions.', amount: 250 },
    { id: 'energy_500', title: '500 Energy', priceLabel: '$3.99', kind: 'consumable', category: 'energy', description: 'A strong energy reserve for multi-week pushing.', amount: 500 },
    { id: 'energy_1000', title: '1000 Energy', priceLabel: '$6.99', kind: 'consumable', category: 'energy', description: 'Big reserve for heavy grinders and power sessions.', amount: 1000 },
    { id: 'cash_25000', title: '$25,000 Cash', priceLabel: '$0.99', kind: 'consumable', category: 'cash', description: 'Adds $25,000 in-game cash instantly.', amount: 25000 },
    { id: 'cash_75000', title: '$75,000 Cash', priceLabel: '$1.99', kind: 'consumable', category: 'cash', description: 'Adds $75,000 in-game cash instantly.', amount: 75000 },
    { id: 'cash_200000', title: '$200,000 Cash', priceLabel: '$3.99', kind: 'consumable', category: 'cash', description: 'Adds $200,000 in-game cash instantly.', amount: 200000 },
    { id: 'cash_500000', title: '$500,000 Cash', priceLabel: '$6.99', kind: 'consumable', category: 'cash', description: 'Adds $500,000 in-game cash instantly.', amount: 500000 },
    { id: 'cash_1250000', title: '$1,250,000 Cash', priceLabel: '$12.99', kind: 'consumable', category: 'cash', description: 'Adds $1,250,000 in-game cash instantly.', amount: 1250000 },
    { id: 'bundle_luxury_homes', title: 'Luxury Homes Collection', priceLabel: '$4.99', kind: 'non_consumable', category: 'collection', description: 'Unlocks the premium homes collection when the iOS catalog is wired to your asset store.' },
    { id: 'bundle_elite_vehicles', title: 'Elite Vehicles Collection', priceLabel: '$4.99', kind: 'non_consumable', category: 'collection', description: 'Unlocks premium vehicles and status rides.' },
    { id: 'bundle_sky_sea', title: 'Sky & Sea Collection', priceLabel: '$6.99', kind: 'non_consumable', category: 'collection', description: 'Unlocks prestige transport like yachts and jets.' },
    { id: 'bundle_ultimate_lifestyle', title: 'Ultimate Lifestyle Collection', priceLabel: '$12.99', kind: 'non_consumable', category: 'collection', description: 'Unlocks every premium collection entitlement in one bundle.' }
];

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
        case 'bundle_ultimate_lifestyle':
            ownedPurchases.push(productId);
            ['bundle_luxury_homes', 'bundle_elite_vehicles', 'bundle_sky_sea'].forEach(bundleId => {
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
