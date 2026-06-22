import { INITIAL_PLAYER } from '../types';
import {
    getStudioGroup,
    setSubsidiaryOperatingModel,
} from '../services/studioGroup';
import type { Business, Player } from '../types';

const parentStudio: Business = {
    id: 'parent_studio',
    name: 'Empire Pictures',
    type: 'PRODUCTION_HOUSE',
    subtype: 'INDIE_STUDIO',
    logo: '🎬',
    color: 'bg-amber-500',
    foundedWeek: 1,
    balance: 125_000_000,
    isActive: true,
    config: {
        quality: 'PREMIUM',
        pricing: 'MARKET',
        marketing: 'MEDIUM',
        marketingBudget: { social: 0, influencer: 0, billboard: 0, tv: 0 },
        theme: 'PLAYER STUDIO',
        productionType: 'Original Studio',
        amenities: [],
    },
    stats: {
        weeklyRevenue: 4_000_000,
        weeklyExpenses: 2_000_000,
        weeklyProfit: 2_000_000,
        lifetimeRevenue: 500_000_000,
        valuation: 900_000_000,
        brandHealth: 82,
        customerSatisfaction: 80,
        riskLevel: 22,
        hype: 76,
    },
    staff: [],
    products: [],
    hiringPool: [],
    lastHiringRefreshWeek: 1,
    history: [],
    studioState: {
        scripts: [],
        concepts: [],
        writers: [],
        ipMarket: [],
        lastMarketRefreshWeek: 1,
        lastWriterRefreshWeek: 1,
    },
};

const acquiredStudio: Business = {
    ...parentStudio,
    id: 'acquired_studio',
    name: 'Artisan Pictures',
    balance: 80_000_000,
    config: {
        ...parentStudio.config,
        productionType: 'Acquired Studio',
    },
    studioState: {
        ...parentStudio.studioState!,
        acquisitionOrigin: 'STUDIO_ACQUISITION',
        acquiredWeek: 14,
        acquiredYear: 30,
    },
};

const player: Player = {
    ...INITIAL_PLAYER,
    businesses: [parentStudio, acquiredStudio],
};

const group = getStudioGroup(player);
if (group.parentStudio?.id !== parentStudio.id) {
    throw new Error('Studio Group did not identify the original production house.');
}
if (group.subsidiaries.length !== 1 || group.subsidiaries[0].id !== acquiredStudio.id) {
    throw new Error('Studio Group did not identify the acquired production house.');
}

const configured = setSubsidiaryOperatingModel({
    player,
    studioId: acquiredStudio.id,
    model: 'CONTROLLED_SUBSIDIARY',
});
if (!configured.success) {
    throw new Error('Could not configure an acquired studio operating model.');
}
const configuredStudio = configured.player.businesses.find(business => business.id === acquiredStudio.id);
if (configuredStudio?.studioState?.operatingModel !== 'CONTROLLED_SUBSIDIARY') {
    throw new Error('The operating model was not persisted on the acquired studio.');
}
if (configuredStudio?.studioState?.operatingModelChangedWeek !== player.currentWeek) {
    throw new Error('The operating model change week was not recorded.');
}

const invalid = setSubsidiaryOperatingModel({
    player,
    studioId: parentStudio.id,
    model: 'FULL_MERGER',
});
if (invalid.success || invalid.reason !== 'NOT_ACQUIRED_STUDIO') {
    throw new Error('The original studio incorrectly accepted a subsidiary operating model.');
}

console.log('Studio Group audit passed.');
