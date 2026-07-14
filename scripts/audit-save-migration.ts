import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { getStockOutstandingShares, getStockOwnershipPercent, getStockPriceCeiling } from '../services/stockLogic';
import { grantMigrationCarePackageIfEligible, MIGRATION_CARE_PACKAGE_CASH, MIGRATION_CARE_PACKAGE_ENERGY } from '../services/migrationCarePackage';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const localStorageMock = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
    value: {
        getItem: (key: string) => localStorageMock.get(key) ?? null,
        setItem: (key: string, value: string) => localStorageMock.set(key, value),
        removeItem: (key: string) => localStorageMock.delete(key),
        clear: () => localStorageMock.clear(),
    },
});

const assertRuntimeSkeleton = (defaults: unknown, migrated: unknown, path = 'player') => {
    if (Array.isArray(defaults)) {
        assert(Array.isArray(migrated), `${path} should be an array after migration.`);
        return;
    }

    if (defaults && typeof defaults === 'object') {
        assert(migrated && typeof migrated === 'object' && !Array.isArray(migrated), `${path} should be an object after migration.`);
        Object.entries(defaults).forEach(([key, defaultValue]) => {
            assertRuntimeSkeleton(defaultValue, (migrated as Record<string, unknown>)[key], `${path}.${key}`);
        });
        return;
    }

    if (defaults === null) {
        assert(migrated === null || typeof migrated === 'string' || typeof migrated === 'object', `${path} should stay compatible with its nullable default.`);
        return;
    }

    assert(typeof migrated === typeof defaults, `${path} should keep ${typeof defaults} type after migration.`);
};

const fresh = migratePlayerSave({
    ...INITIAL_PLAYER,
    id: 'fresh_stock_bootstrap',
    currentWeek: 1,
    stocks: [],
    portfolio: [],
} as Player);

assert(fresh.stocks.length >= 10, 'Fresh/new games should start with a populated stock market in week 1.');
assert(fresh.stocks.some(stock => stock.sector === 'MEDIA' && stock.relatedStudioId), 'Fresh stock market should include entertainment/studio stocks immediately.');
assert(fresh.stocks.every(stock => (stock.priceHistory || []).length >= 12), 'Migrated stocks should have price history for week-1 UI charts.');
assert(fresh.stocks.every(stock => getStockOutstandingShares(stock) === stock.outstandingShares), 'Migrated stocks should have explicit outstanding shares.');

const legacyMessy = migratePlayerSave({
    ...INITIAL_PLAYER,
    id: 'legacy_phase_10_save',
    currentWeek: 64,
    stocks: [{
        id: 'stk_wbd',
        symbol: 'WBD',
        name: 'Warner Bros. Discovery',
        sector: 'MEDIA',
        price: -10,
        volatility: 8,
        dividendYield: -1,
        priceHistory: [],
        lastDividendPayoutWeek: -4,
        outstandingShares: -50,
        relatedStudioId: 'WARNER_BROS',
    } as any],
    portfolio: [
        { stockId: 'stk_wbd', shares: -200, averageCost: -5, totalInvested: -100 },
        { stockId: 'missing_stock', shares: 100, averageCost: 10, totalInvested: 1000 },
    ],
    shareholderVotes: [{ id: 'bad_vote', stockId: 'missing_stock' } as any],
    stockTakeovers: [{
        id: 'bad_takeover',
        stockId: 'stk_wbd',
        stockSymbol: 'WBD',
        companyName: 'Warner Bros. Discovery',
        route: 'CONTROL_TRANSFER',
        status: 'CONTROLLED',
        ownershipPercent: 180,
        alliedSupportPercent: -20,
        effectiveControlPercent: 220,
        supportScore: 200,
        rivalDefenceRisk: -5,
        cost: -1,
        summary: '',
        createdWeek: -2,
        createdYear: 0,
    } as any],
    pendingEvents: [
        { id: 'dup_event', week: 64, type: 'LIFE_EVENT', title: 'A', description: 'A', data: { stockDecisionType: 'SHAREHOLDER_VOTE', stockId: 'stk_wbd' } },
        { id: 'dup_event', week: 64, type: 'LIFE_EVENT', title: 'A', description: 'A', data: { stockDecisionType: 'SHAREHOLDER_VOTE', stockId: 'stk_wbd' } },
    ] as any,
    news: [
        { id: 'dup_news', headline: 'A', category: 'INDUSTRY', week: 1, year: 30, impactLevel: 'LOW' },
        { id: 'dup_news', headline: 'A', category: 'INDUSTRY', week: 1, year: 30, impactLevel: 'LOW' },
    ] as any,
    flags: {
        acquisitionDebtLedger: [{ id: 'bad_debt', remainingPrincipal: -100, originalPrincipal: -200, annualInterestRate: -1, status: 'ACTIVE' }],
        worldReactionState: { antiMonopolyPressure: 150, rivalRetaliationRisk: -25 },
        regulatorPressureState: { pressureScore: 140, acquisitionMoratoriumWeeksRemaining: -5 },
        rivalRetaliationState: { retaliationScore: 130, pressureShieldWeeksRemaining: -2 },
        acquisitionMarketPulseState: { processedCaseIds: 'bad' },
    },
} as any);

assert(legacyMessy.stocks.length > 1, 'Old partial stock saves should be backfilled with the full stock market.');
assert(legacyMessy.stocks.every(stock => stock.price > 0 && stock.volatility >= 0 && stock.dividendYield >= 0), 'Stock values should be clamped to usable ranges.');
assert(legacyMessy.portfolio.every(position => position.shares >= 0 && legacyMessy.stocks.some(stock => stock.id === position.stockId)), 'Portfolio should remove invalid stock holdings and clamp shares.');
assert(legacyMessy.shareholderVotes.length === 0, 'Votes tied to missing stocks should be removed during migration.');
assert(legacyMessy.stockTakeovers[0].ownershipPercent <= 100 && legacyMessy.stockTakeovers[0].effectiveControlPercent <= 100, 'Takeover percentages should be clamped.');
assert(legacyMessy.pendingEvents?.length === 1, 'Duplicate pending events should be deduped.');
assert(legacyMessy.news.length === 1, 'Duplicate news items should be deduped.');
assert(legacyMessy.flags.acquisitionDebtLedger[0].remainingPrincipal === 0, 'Negative debt principal should be clamped.');
assert(legacyMessy.flags.worldReactionState.antiMonopolyPressure === 100, 'World pressure should be clamped.');
assert(legacyMessy.flags.regulatorPressureState.pressureScore === 100, 'Regulator pressure should be clamped.');
assert(Array.isArray(legacyMessy.flags.acquisitionMarketPulseState.processedCaseIds), 'Market pulse processed case ids should be normalized.');
assert(legacyMessy.flags.saveMigrationVersion >= 10, 'Migration should stamp the save migration version.');

const ownershipGlitch = migratePlayerSave({
    ...INITIAL_PLAYER,
    id: 'stock_ownership_glitch_save',
    money: 500,
    stocks: [{
        id: 'stk_apple',
        symbol: 'AAPL',
        name: 'Apple Inc.',
        sector: 'TECH',
        price: 185,
        outstandingShares: 1,
        volatility: 0.02,
        dividendYield: 0.005,
        priceHistory: [185],
        lastDividendPayoutWeek: 0,
    } as any],
    portfolio: [{ stockId: 'stk_apple', shares: 1, averageCost: 185, totalInvested: 185 }],
} as any);
const migratedApple = ownershipGlitch.stocks.find(stock => stock.id === 'stk_apple')!;
assert(getStockOutstandingShares(migratedApple) === 15_300_000_000, 'Migration should restore canonical Apple outstanding shares when old saves stored one share.');
assert(getStockOwnershipPercent(1, migratedApple) < 0.01, 'One Apple share must not migrate into full ownership.');

const runawayStockSave = migratePlayerSave({
    ...INITIAL_PLAYER,
    id: 'runaway_stock_price_save',
    money: 23_800_000_000_000_000_000,
    stocks: [{
        id: 'stk_dis',
        symbol: 'DIS',
        name: 'Disney',
        sector: 'MEDIA',
        price: 2.4e50,
        outstandingShares: 1,
        volatility: 0.03,
        dividendYield: 0.01,
        priceHistory: [110, 5e20, 2.4e50],
        lastDividendPayoutWeek: 0,
        relatedStudioId: 'DISNEY_PLUS',
    } as any],
    portfolio: [],
} as any);
const migratedDisney = runawayStockSave.stocks.find(stock => stock.id === 'stk_dis')!;
assert(migratedDisney.price <= getStockPriceCeiling(migratedDisney), 'Runaway Disney prices should be capped during migration.');
assert(migratedDisney.priceHistory.every(price => price <= getStockPriceCeiling(migratedDisney)), 'Runaway Disney price history should be capped during migration.');
assert(runawayStockSave.money === 10_000_000_000_000, 'Runaway stock cash should be capped during migration repair.');

const corruptImport = migratePlayerSave({
    id: null,
    name: null,
    age: '29',
    currentWeek: '17',
    money: '50000',
    settings: { language: 'xx', smoothMode: 'yes' },
    energy: { current: '42' },
    stats: {
        followers: 12345,
        skills: null,
        genreXP: { ACTION: 8 },
    },
    instagram: {
        followers: 1200,
    },
    x: {},
    youtube: {
        subscribers: 300,
    },
    dating: {
        preferences: {},
    },
    finance: {
        history: 'bad',
    },
    relationships: [
        { id: 'rel_mom', name: 'Mom', relation: 'Parent', closeness: '88', image: null, lastInteractionWeek: '3' },
        { id: 'bad_relation', name: null, relation: 'Alien', closeness: 200, image: null, lastInteractionWeek: -4 },
    ],
    team: {
        availableAgents: 'bad',
    },
    world: {
        universes: {
            MCU: { id: 'MCU', name: 'Marvel Cinematic Universe' },
        },
    },
    weeklyOpportunities: {
        auditions: 'bad',
    },
    awards: 'bad',
    scheduledEvents: 'bad',
    businesses: 'bad',
    activeSponsorships: 'bad',
    flags: {
        premiumPurchases: 'bad',
    },
} as any);

assertRuntimeSkeleton(INITIAL_PLAYER, corruptImport);
assert(corruptImport.name === INITIAL_PLAYER.name, 'Invalid imported player name should fall back safely.');
assert(corruptImport.age === 29 && corruptImport.currentWeek === 17, 'Numeric strings from old saves should migrate to numbers.');
assert(corruptImport.money === 50000, 'Numeric money strings should migrate to numbers.');
assert(Array.isArray(corruptImport.instagram.posts) && Array.isArray(corruptImport.instagram.feed), 'Imported social state should always have post/feed arrays.');
assert(corruptImport.instagram.followers === 1200, 'Imported Instagram progress should be preserved while filling missing fields.');
assert(Array.isArray(corruptImport.youtube.videos) && Array.isArray(corruptImport.youtube.activeBrandDeals), 'Imported YouTube state should always have required arrays.');
assert(corruptImport.youtube.subscribers === 300, 'Imported YouTube progress should be preserved while filling missing fields.');
assert(Array.isArray(corruptImport.finance.history) && Array.isArray(corruptImport.finance.yearly) && Array.isArray(corruptImport.finance.loans), 'Imported finance state should always have required arrays.');
assert(corruptImport.finance.credit && typeof corruptImport.finance.credit.successfulPayments === 'number', 'Imported finance state should always have credit history.');
assert(corruptImport.relationships[0].image === INITIAL_PLAYER.relationships[0].image, 'Broken parent image should be repaired during migration.');
assert(corruptImport.relationships[1].relation === INITIAL_PLAYER.relationships[1].relation, 'Invalid relationship roles should be repaired during migration.');
assert(corruptImport.relationships[1].closeness === 100, 'Relationship closeness should be clamped.');
assert(Array.isArray(corruptImport.weeklyOpportunities.auditions) && Array.isArray(corruptImport.weeklyOpportunities.jobs), 'Weekly opportunities should be safe arrays after import.');
assert(Array.isArray(corruptImport.awards) && Array.isArray(corruptImport.businesses), 'Awards and businesses should be safe arrays after import.');

localStorage.clear();
const legacyRewardTarget = migratePlayerSave({
    ...INITIAL_PLAYER,
    id: 'legacy_reward_target',
    currentWeek: 8,
    money: 7500,
    logs: [
        ...INITIAL_PLAYER.logs,
        { week: 2, year: 18, message: 'Booked first audition.', type: 'positive' },
    ],
    flags: { saveMigrationVersion: 13 },
} as any);
const rewardResult = grantMigrationCarePackageIfEligible(legacyRewardTarget, {
    source: 'indexeddb-slot',
    allowLegacyVersionFallback: true,
});
assert(rewardResult.granted, 'Legacy migrated progress save should receive the care package once.');
assert(rewardResult.player.money === 7500 + MIGRATION_CARE_PACKAGE_CASH, 'Care package should add migration cash.');
assert(rewardResult.player.flags.bonusEnergyBank === MIGRATION_CARE_PACKAGE_ENERGY, 'Care package should add bonus energy bank.');
assert(rewardResult.player.energy.current >= MIGRATION_CARE_PACKAGE_ENERGY, 'Care package energy should sync to visible energy.');

const repeatReward = grantMigrationCarePackageIfEligible(rewardResult.player, {
    source: 'indexeddb-slot',
    allowLegacyVersionFallback: true,
});
assert(!repeatReward.granted, 'Care package should not repeat on the same migrated save.');
assert(repeatReward.player.money === 7500 + MIGRATION_CARE_PACKAGE_CASH, 'Repeat care package attempt should not add more cash.');

localStorage.clear();
const freshNewSave = migratePlayerSave(INITIAL_PLAYER);
const freshReward = grantMigrationCarePackageIfEligible(freshNewSave, {
    source: 'indexeddb-slot',
    allowLegacyVersionFallback: true,
});
assert(!freshReward.granted, 'Fresh new saves should not receive the migration care package.');

localStorage.clear();
const importedSave = migratePlayerSave({
    ...INITIAL_PLAYER,
    id: 'imported_reward_target',
    currentWeek: 12,
    flags: { migrationCarePackageEligible: true },
} as any);
const importedReward = grantMigrationCarePackageIfEligible(importedSave, {
    source: 'save-transfer-import',
    sourceFingerprint: 'signed-import-fingerprint',
});
assert(importedReward.granted, 'Signed imported saves should receive the care package.');
const secondImportedSave = migratePlayerSave({
    ...INITIAL_PLAYER,
    id: 'second_imported_reward_target',
    currentWeek: 12,
    flags: { migrationCarePackageEligible: true },
} as any);
const secondImportedReward = grantMigrationCarePackageIfEligible(secondImportedSave, {
    source: 'save-transfer-import',
    sourceFingerprint: 'second-signed-import-fingerprint',
});
assert(!secondImportedReward.granted, 'Device ledger should prevent care package farming across multiple imported saves.');

console.log('Save migration audit passed.');
