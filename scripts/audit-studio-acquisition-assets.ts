import { INITIAL_PLAYER, type Business, type Player, type Universe } from '../types';
import { createDefaultStudioState } from '../services/businessLogic';
import {
    buildPortfolioOwnedRights,
    buildStudioAcquisitionPortfolio,
    deriveAcquiredStudioFacilities,
    repairAcquiredStudioAssetPortfolios,
} from '../services/studioAcquisitionAssets';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const makeUniverse = (id: string, studioId: string, name: string): Universe => ({
    id,
    studioId,
    name,
    currentPhase: 'PHASE_1_ORIGINS',
    saga: 1,
    momentum: 50,
    brandPower: 60,
    marketShare: 0,
    color: '#7c3aed',
    roster: [],
    slate: [],
    weeksUntilNextPhase: 40,
});

const player: Player = {
    ...INITIAL_PLAYER,
    age: 36,
    currentWeek: 20,
    world: {
        ...INITIAL_PLAYER.world,
        universes: {
            X_CANON: makeUniverse('X_CANON', 'STUDIO_X', 'The X Canon'),
            Y_CANON: makeUniverse('Y_CANON', 'STUDIO_Y', 'The Y Canon'),
        },
    },
};

const profile: any = {
    id: 'STUDIO_X',
    name: 'Studio X',
    valuation: 4_000_000_000,
    reputation: 82,
    archetype: 'FRANCHISE_UNIVERSE',
    franchiseCount: 2,
    universeNames: ['The X Canon'],
    facilities: ['Volume Stage', 'VFX Pipeline', 'Studio Backlot'],
    facilitiesEstimated: false,
    assetDataSource: 'MIXED',
    rightsHighlights: ['X Origins'],
    catalog: [
        { id: 'x_1', title: 'X Origins', year: 32, week: 8, revenue: 620_000_000, quality: 84, outcome: 'HIT', genre: 'SCI_FI', universeId: 'X_CANON', source: 'WORLD_CATALOG' },
        { id: 'x_2', title: 'X Rising', year: 34, week: 18, revenue: 730_000_000, quality: 87, outcome: 'HIT', genre: 'SCI_FI', universeId: 'X_CANON', source: 'WORLD_CATALOG' },
        { id: 'x_3', title: 'Quiet Frontier', year: 35, week: 2, revenue: 180_000_000, quality: 72, outcome: 'SOLID', genre: 'DRAMA', source: 'WORLD_CATALOG' },
    ],
};

const portfolio = buildStudioAcquisitionPortfolio({ player, profile });
assert(portfolio.sourceStudioId === 'STUDIO_X', 'Portfolio must retain the acquired studio ID.');
assert(portfolio.universeIds.length === 1 && portfolio.universeIds[0] === 'X_CANON', 'Only Studio X universes may transfer into Studio X.');
assert(!portfolio.universeIds.includes('Y_CANON'), 'A rival studio universe must never leak into the acquisition portfolio.');
assert(portfolio.catalog.every(item => item.id.includes('STUDIO_X')), 'Every inherited catalog record must have a studio-scoped ID.');
assert(portfolio.franchises.length === 2, 'Named catalog evidence should materialize both declared Studio X franchise lanes.');
assert(portfolio.franchises.every(franchise => franchise.id.includes('STUDIO_X')), 'Every inherited franchise must have a studio-scoped ID.');

const rights = buildPortfolioOwnedRights({ portfolio, studioName: profile.name });
assert(rights.length === portfolio.catalog.length, 'Every inherited catalog title should become usable IP.');
assert(rights.every(right => right.status === 'ACTIVE' && right.purchasePrice === 0), 'Acquired catalog rights must arrive active without a second charge.');
assert(new Set(rights.map(right => right.id)).size === rights.length, 'Inherited rights must be deduplicated.');

const facilities = deriveAcquiredStudioFacilities({
    valuation: profile.valuation,
    reputation: profile.reputation,
    facilityLabels: profile.facilities,
    facilitiesEstimated: profile.facilitiesEstimated,
});
assert(facilities.departments.production >= 6, 'Major acquired facilities should not reset to a starter production department.');
assert(facilities.equipment.practicalEffects >= 5, 'A named backlot should influence practical-effects capability.');

const acquiredBusiness: Business = {
    id: 'STUDIO_X',
    name: 'Studio X',
    type: 'PRODUCTION_HOUSE',
    subtype: 'MAJOR_STUDIO',
    logo: 'studio-x',
    color: 'bg-amber-500',
    foundedWeek: player.currentWeek,
    balance: 900_000_000,
    isActive: true,
    config: {
        quality: 'PREMIUM',
        pricing: 'MARKET',
        marketing: 'MEDIUM',
        marketingBudget: { social: 0, influencer: 0, billboard: 0, tv: 0 },
        theme: profile.archetype,
        productionType: 'Acquired Studio',
        amenities: profile.facilities,
    },
    stats: {
        weeklyRevenue: 20_000_000,
        weeklyExpenses: 12_000_000,
        weeklyProfit: 8_000_000,
        lifetimeRevenue: 1_500_000_000,
        valuation: profile.valuation,
        brandHealth: profile.reputation,
        customerSatisfaction: 80,
        riskLevel: 20,
        hype: 70,
    },
    staff: [],
    products: [],
    hiringPool: [],
    lastHiringRefreshWeek: player.currentWeek,
    history: [],
    studioState: {
        ...createDefaultStudioState(player.currentWeek),
        acquisitionOrigin: 'STUDIO_ACQUISITION',
        acquiredWeek: player.currentWeek,
        acquiredYear: player.age,
        acquisitionPortfolio: portfolio,
        purchasedIPTitles: portfolio.catalog.map(item => item.title),
        ownedRights: rights.map((right, index) => index === 0 ? { ...right, projectsUsed: 1 } : right),
    },
};

const repairedOnce = repairAcquiredStudioAssetPortfolios({
    ...player,
    businesses: [acquiredBusiness],
});
const repairedTwice = repairAcquiredStudioAssetPortfolios(repairedOnce);
const repairedStudio = repairedTwice.businesses[0];
assert(repairedStudio.studioState?.ownedRights?.[0]?.projectsUsed === 1, 'Save repair must preserve prior IP usage and prevent free reuse.');
assert(JSON.stringify(repairedOnce) === JSON.stringify(repairedTwice), 'Acquisition asset migration must be idempotent.');
assert(repairedStudio.studioState?.ownedRights?.every(right => right.id.includes('STUDIO_X')), 'Studio X must not receive another studio’s rights.');

console.log('Studio acquisition asset audit passed.');
