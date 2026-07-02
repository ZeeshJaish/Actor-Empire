import { INITIAL_PLAYER } from '../types';
import {
    getStudioOperatingMandate,
    setStudioOperatingMandate,
    getSubsidiaryControlProfile,
} from '../services/studioGroup';
import type { Business, Player } from '../types';

const baseStudio: Business = {
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

const controlledStudio: Business = {
    ...baseStudio,
    id: 'controlled_studio',
    name: 'Artisan Pictures',
    balance: 80_000_000,
    config: {
        ...baseStudio.config,
        productionType: 'Acquired Studio',
    },
    studioState: {
        ...baseStudio.studioState!,
        acquisitionOrigin: 'STUDIO_ACQUISITION',
        acquiredWeek: 14,
        acquiredYear: 30,
        operatingModel: 'CONTROLLED_SUBSIDIARY',
    },
};

const independentStudio: Business = {
    ...controlledStudio,
    id: 'independent_studio',
    name: 'Velvet Pictures',
    studioState: {
        ...controlledStudio.studioState!,
        operatingModel: 'INDEPENDENT_LABEL',
    },
};

const mergedStudio: Business = {
    ...controlledStudio,
    id: 'merged_studio',
    name: 'Blue Harbor',
    studioState: {
        ...controlledStudio.studioState!,
        operatingModel: 'FULL_MERGER',
    },
};

const player: Player = {
    ...INITIAL_PLAYER,
    age: 31,
    currentWeek: 22,
    businesses: [baseStudio, controlledStudio, independentStudio, mergedStudio],
};

const group = await import('../services/studioGroup').then(module => module.getStudioGroup(player));
if (group.subsidiaries.some(studio => studio.id === mergedStudio.id)) {
    throw new Error('Full-merger studios should not remain in the active owned-studio roster.');
}
if (!group.mergedStudios.some(studio => studio.id === mergedStudio.id)) {
    throw new Error('Full-merger studios should move into the integrated-assets roster.');
}

const defaultMandate = getStudioOperatingMandate(controlledStudio);
if (defaultMandate.focus !== 'BALANCED_SLATE') {
    throw new Error('Controlled studios should default to a balanced slate mandate.');
}
if (defaultMandate.autoProduction !== 'BOARD_REVIEW') {
    throw new Error('Controlled studios should default to board-review autonomous production.');
}

const updated = setStudioOperatingMandate({
    player,
    studioId: controlledStudio.id,
    mandate: {
        focus: 'FRANCHISE_EXPANSION',
        budgetAppetite: 'PREMIUM',
        releasePace: 'STEADY',
        ipStrategy: 'OWNED_IP',
        talentPolicy: 'STAR_POWER',
        objective: 'COMMERCIAL_FIRST',
        creativeAppetite: 'BOLD',
        autoProduction: 'BOARD_REVIEW',
    },
});

if (!updated.success) {
    throw new Error('Could not save a mandate for a controlled subsidiary.');
}

const savedStudio = updated.player.businesses.find(business => business.id === controlledStudio.id);
if (savedStudio?.studioState?.operatingMandate?.focus !== 'FRANCHISE_EXPANSION') {
    throw new Error('The operating mandate focus was not persisted.');
}
if (savedStudio?.studioState?.operatingMandate?.updatedWeek !== 22) {
    throw new Error('The mandate update week was not recorded.');
}
if (savedStudio?.studioState?.operatingMandate?.updatedYear !== 31) {
    throw new Error('The mandate update year was not recorded.');
}

const controlledProfile = getSubsidiaryControlProfile(controlledStudio);
if (!controlledProfile.canDirectProduce || !controlledProfile.canSetMandate) {
    throw new Error('Controlled subsidiaries should allow direct production and mandates.');
}

const independentProfile = getSubsidiaryControlProfile(independentStudio);
if (independentProfile.canDirectProduce || !independentProfile.canAutoProduce) {
    throw new Error('Independent labels should auto-operate but not allow full direct production.');
}

const mergedProfile = getSubsidiaryControlProfile(mergedStudio);
if (mergedProfile.canSetMandate || mergedProfile.canAutoProduce) {
    throw new Error('Full mergers should not keep separate mandate/autonomous studio controls.');
}

const invalid = setStudioOperatingMandate({
    player,
    studioId: mergedStudio.id,
    mandate: {
        ...defaultMandate,
        focus: 'PRESTIGE_AWARDS',
    },
});
if (invalid.success || invalid.reason !== 'MERGED_STUDIO') {
    throw new Error('Merged studios should reject separate mandate updates.');
}

console.log('Studio mandate audit passed.');
