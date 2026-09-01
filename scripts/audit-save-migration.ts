import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { getStockOutstandingShares, getStockOwnershipPercent, getStockPriceCeiling } from '../services/stockLogic';
import { grantMigrationCarePackageIfEligible, MIGRATION_CARE_PACKAGE_CASH, MIGRATION_CARE_PACKAGE_ENERGY } from '../services/migrationCarePackage';
import { processAcquisitionDebtService } from '../services/acquisitionDebt';
import { normalizePlatformAiState } from '../services/platformAi/platformAiState';
import { createPlatformAiFixture } from './helpers/platformAiFixture';

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
assert(
    Array.isArray(fresh.world.platforms!.NETFLIX.ai!.externalRecapitalizations)
        && fresh.world.platforms!.NETFLIX.ai!.externalRecapitalizations.length === 0,
    'Fresh migration must preserve the canonical empty Platform AI recapitalization ledger.',
);
assert(
    fresh.world.platforms!.NETFLIX.ai!.administration === null,
    'Fresh migration must preserve the explicit empty Platform AI administration state.',
);

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

const legacyInflatedAwards = migratePlayerSave({
    ...INITIAL_PLAYER,
    awards: [
        {
            id: 'real_actor_win',
            name: 'The Oscars',
            type: 'OSCAR',
            year: 30,
            category: 'Best Actor',
            projectId: 'real_project',
            projectName: 'Real Project',
            outcome: 'WON',
        },
        {
            id: 'legacy_trailer_win',
            name: 'The Oscars',
            type: 'OSCAR',
            year: 30,
            category: 'Best Trailer',
            projectId: 'real_project',
            projectName: 'Real Project',
            outcome: 'WON',
        },
    ],
    scheduledEvents: [{
        id: 'legacy_award_event',
        week: 10,
        type: 'AWARD_CEREMONY',
        title: 'The Oscars',
        data: {
            awardDef: { type: 'OSCAR' },
            nominations: [
                { category: 'Best Actor', project: { id: 'real_project', name: 'Real Project' } },
                { category: 'Best Trailer', project: { id: 'real_project', name: 'Real Project' } },
            ],
            fullBallot: {
                'Best Actor': [],
                'Best Trailer': [],
            },
        },
    }],
    pendingEvent: {
        id: 'legacy_pending_award_event',
        week: 10,
        type: 'AWARD_CEREMONY',
        title: 'The Oscars',
        data: {
            awardDef: { type: 'OSCAR' },
            nominations: [{ category: 'Best Trailer', project: { id: 'real_project', name: 'Real Project' } }],
            fullBallot: { 'Best Trailer': [] },
        },
    },
} as any);
assert(
    legacyInflatedAwards.awards.length === 1 && legacyInflatedAwards.awards[0].category === 'Best Actor',
    'Migration should remove inflated campaign-only awards while preserving legitimate awards.'
);
assert(
    legacyInflatedAwards.scheduledEvents[0].data.nominations.length === 1
    && !legacyInflatedAwards.scheduledEvents[0].data.fullBallot['Best Trailer'],
    'Migration should clean legacy categories from scheduled ceremonies.'
);
assert(
    legacyInflatedAwards.pendingEvent === null,
    'Migration should dismiss an in-progress ceremony containing only removed legacy categories.'
);

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

const staleAcquisitionFinance = migratePlayerSave({
    ...INITIAL_PLAYER,
    id: 'stale_acquisition_finance',
    businesses: [{
        id: 'SEARCHLIGHT',
        name: 'Searchlight Pictures',
        type: 'PRODUCTION_HOUSE',
        subtype: 'MAJOR_STUDIO',
        logo: 'FILM',
        color: 'bg-amber-500',
        foundedWeek: 10,
        balance: 777_800_000,
        isActive: true,
        config: { quality: 'PREMIUM', pricing: 'MARKET', marketing: 'MEDIUM' },
        stats: {
            weeklyRevenue: 123_500_000,
            weeklyExpenses: 1_203_000_000,
            weeklyProfit: -1_079_500_000,
            lifetimeRevenue: 6_400_000_000,
            valuation: 4_200_000_000,
            brandHealth: 70,
            customerSatisfaction: 70,
            riskLevel: 40,
            hype: 60,
            studioMomentum: 60,
            investorConfidence: 60,
            locations: 1,
        },
        staff: [{ id: 'SEARCHLIGHT_staff_1', name: 'Transition Lead', role: 'Studio Management', skill: 80, salary: 7_000_000, morale: 75 }],
        products: [],
        hiringPool: [],
        lastHiringRefreshWeek: 10,
        history: [],
    }],
    flags: {
        studioAcquisitionCases: [{
            studioId: 'SEARCHLIGHT',
            studioName: 'Searchlight Pictures',
            status: 'ACQUIRED',
            closing: {
                acquiredBusinessId: 'SEARCHLIGHT',
                expectedAnnualIncome: 6_422_000_000,
                verifiedDebt: 42_000_000_000,
                hiddenLiabilities: 0,
            },
        }],
        acquisitionDebtLedger: [{
            id: 'paid_off_searchlight',
            studioId: 'SEARCHLIGHT',
            status: 'PAID_OFF',
            remainingPrincipal: 0,
        }],
    },
} as any);
const repairedStudio = staleAcquisitionFinance.businesses.find(business => business.id === 'SEARCHLIGHT')!;
assert(repairedStudio.stats.weeklyExpenses < 30_000_000, 'A settled acquisition must not keep historical liabilities as a weekly studio expense.');
assert(repairedStudio.stats.weeklyProfit > 90_000_000, 'Settled acquisition finance should restore the studio operating result.');
assert(repairedStudio.staff[0].salary < 2_000_000, 'Legacy acquired-studio staff salaries should be repaired to a revenue-based scale.');

const staleRivalBidSave = migratePlayerSave({
    ...INITIAL_PLAYER,
    id: 'stale_rival_bid_save',
    flags: {
        studioAcquisitionCases: [{
            studioId: 'STALE_RIVAL',
            studioName: 'Stale Rival Studio',
            status: 'RIVAL_BID',
            offer: { amount: 150_000_000, round: 4 },
            sellerResponse: { decision: 'RIVAL_BID', round: 4, maxRounds: 3 },
        }],
    },
} as any);
const migratedStaleRival = staleRivalBidSave.flags.studioAcquisitionCases.find((item: any) => item.studioId === 'STALE_RIVAL');
assert(migratedStaleRival?.status === 'OFFER_SUBMITTED', 'Migration should release stale round-four acquisition cases for a final board decision.');
assert(migratedStaleRival?.offer?.round === 3, 'Migration should clamp stale acquisition rounds to the three-round maximum.');

const legacyImportedAcquisition = migratePlayerSave({
    ...INITIAL_PLAYER,
    id: 'legacy_imported_acquisition',
    money: 14_000_000,
    businesses: [{
        id: 'LEGACY_ACQUIRED_STUDIO',
        name: 'Legacy Acquired Studio',
        type: 'PRODUCTION_HOUSE',
        subtype: 'MAJOR_STUDIO',
        logo: 'FILM',
        color: 'bg-amber-500',
        foundedWeek: 10,
        balance: 300_000_000,
        isActive: true,
        config: { quality: 'PREMIUM', pricing: 'MARKET', marketing: 'MEDIUM' },
        stats: { weeklyRevenue: 30_000_000, weeklyExpenses: 18_000_000, weeklyProfit: 12_000_000, lifetimeRevenue: 900_000_000, valuation: 5_000_000_000, brandHealth: 70, customerSatisfaction: 70, riskLevel: 35, hype: 58, studioMomentum: 60, investorConfidence: 65, locations: 1 },
        staff: [], products: [], hiringPool: [], lastHiringRefreshWeek: 10, history: [],
    }],
    flags: {
        studioAcquisitionCases: [{
            studioId: 'LEGACY_ACQUIRED_STUDIO',
            studioName: 'Legacy Acquired Studio',
            status: 'ACQUIRED',
            closing: {
                acquiredBusinessId: 'LEGACY_ACQUIRED_STUDIO',
                signedWeek: 10,
                signedYear: 30,
                finalPrice: 0,
                verifiedDebt: 14_000_000_000,
                hiddenLiabilities: 2_000_000_000,
            },
        }],
    },
} as any);
assert(
    legacyImportedAcquisition.flags.acquisitionDebtLedger.some((entry: any) => (
        entry.studioId === 'LEGACY_ACQUIRED_STUDIO' && entry.status === 'PAID_OFF'
    )),
    'Legacy imported acquisitions without an existing debt ledger should receive a settled baseline marker.',
);
const legacyDebtWeek = processAcquisitionDebtService(legacyImportedAcquisition);
assert(legacyDebtWeek.servicedAmount === 0, 'Legacy imported acquisitions must not create a new weekly debt charge.');
assert(legacyDebtWeek.player.money === legacyImportedAcquisition.money, 'Legacy migration must preserve the player cash balance.');

const previouslyChargedImportedAcquisition = migratePlayerSave({
    ...legacyImportedAcquisition,
    money: 0,
    finance: {
        ...legacyImportedAcquisition.finance,
        history: [{
            id: 'tx_acq_debt_legacy_recovery',
            week: legacyImportedAcquisition.currentWeek,
            year: legacyImportedAcquisition.age,
            amount: -14_000_000,
            category: 'EXPENSE',
            description: 'Acquisition Debt Interest',
        }, ...legacyImportedAcquisition.finance.history],
    },
    flags: {
        ...legacyImportedAcquisition.flags,
        saveTransferImportedAt: '2026-07-24T00:00:00.000Z',
        acquisitionDebtLegacyBaselineVersion: undefined,
        acquisitionDebtLedger: [{
            id: 'acq_debt_legacy_acquired_studio_30_10',
            studioId: 'LEGACY_ACQUIRED_STUDIO',
            studioName: 'Legacy Acquired Studio',
            originalPrincipal: 16_000_000_000,
            remainingPrincipal: 16_000_000_000,
            annualInterestRate: 0.08,
            originatedWeek: 10,
            originatedYear: 30,
            source: 'STOCK_CONTROL_TRANSFER',
            status: 'ACTIVE',
            interestPaidToDate: 14_000_000,
            missedServiceAmount: 0,
            missedPayments: 0,
        }],
    },
} as any);
assert(previouslyChargedImportedAcquisition.money === 14_000_000, 'The migration should restore the most recent incorrect legacy debt charge.');
assert(
    !previouslyChargedImportedAcquisition.finance.history.some((transaction: any) => transaction.id === 'tx_acq_debt_legacy_recovery'),
    'The reversed legacy debt charge must be removed from finance history.',
);
assert(
    previouslyChargedImportedAcquisition.flags.acquisitionDebtLedger[0].status === 'PAID_OFF',
    'An imported legacy debt ledger without a signing marker must be settled during recovery.',
);

const legacyContinuationSave = migratePlayerSave({
    ...INITIAL_PLAYER,
    id: 'legacy_continuation_save',
    businesses: [{
        id: 'LEGACY_STUDIO',
        name: 'Legacy Studio',
        type: 'PRODUCTION_HOUSE',
        subtype: 'INDEPENDENT',
        logo: 'FILM',
        color: 'bg-amber-500',
        foundedWeek: 1,
        balance: 100_000_000,
        isActive: true,
        config: { quality: 'PREMIUM', pricing: 'MARKET', marketing: 'MEDIUM' },
        stats: { weeklyRevenue: 0, weeklyExpenses: 0, weeklyProfit: 0, lifetimeRevenue: 0, valuation: 100_000_000, brandHealth: 70, customerSatisfaction: 70, riskLevel: 20, hype: 50, studioMomentum: 50, investorConfidence: 50, locations: 1 },
        staff: [],
        products: [],
        hiringPool: [],
        lastHiringRefreshWeek: 1,
        history: [],
        studioState: {
            scripts: [{ id: 'legacy_sequel', title: 'Legacy Sequel', status: 'IN_DEVELOPMENT', sourceMaterial: 'SEQUEL', quality: 88 }],
        },
    }],
} as any);
const migratedContinuation = legacyContinuationSave.businesses[0].studioState?.scripts?.find((script: any) => script.id === 'legacy_sequel');
assert(migratedContinuation?.assignedSkill === 88, 'Legacy continuation scripts should retain their selected writer quality after migration.');
assert(migratedContinuation?.baseQuality === 88, 'Legacy continuation scripts should receive a durable completion baseline after migration.');

const legacySeriesArchive = migratePlayerSave({
    ...INITIAL_PLAYER,
    id: 'legacy_series_archive',
    pastProjects: [{
        id: 'legacy_series_1',
        name: 'Signal Room',
        type: 'ACTING_GIG',
        year: 28,
        futurePotential: { seriesStatus: 'RUNNING' },
        episodeRatings: [{ season: 1, episodes: [{ episode: 1, rating: 8.6 }, { episode: 2, rating: 8.9 }] }],
    }],
} as any);
assert(legacySeriesArchive.pastProjects[0].projectType === 'SERIES', 'Legacy archive entries with episode evidence must stay classified as series.');
assert(legacySeriesArchive.pastProjects[0].episodeRatings?.length === 1, 'Series migration must preserve the existing episode scorecard.');

const protectedMoveSave = createPlatformAiFixture();
const protectedMoveAbsoluteWeek = (protectedMoveSave.age - 1) * 52 + protectedMoveSave.currentWeek;
const protectedMoveId = 'migration-protected-old-rival-move';
const migrationRivalMove = (id: string, createdAtAbsoluteWeek: number) => ({
    id,
    idempotencyKey: `rival-move:NETFLIX:${id}`,
    platformId: 'NETFLIX' as const,
    platformName: 'Netflix',
    ceoName: 'Mara Voss',
    type: 'COUNTER_PROGRAM' as const,
    battlefront: 'CONTENT' as const,
    targetRegionId: null,
    targetTechnologyBranch: null,
    strategyReason: 'Canonical migration audit move.',
    playerImpact: 'Canonical migration audit pressure.',
    rivalPriceBefore: null,
    rivalPriceAfter: null,
    title: 'Canonical migration audit move',
    detail: 'The market action already executed.',
    status: 'OPEN' as const,
    pricingVersion: 1,
    cashCostMillions: 38,
    rivalCashBeforeMillions: 1_000,
    rivalCashAfterMillions: 962,
    createdAtAbsoluteWeek,
    pressureStartsAbsoluteWeek: createdAtAbsoluteWeek + 1,
    expiresAtAbsoluteWeek: createdAtAbsoluteWeek + 4,
    acquisitionRateDelta: -0.003,
    churnRateDelta: 0.001,
    prestigeDelta: 0,
    targetExecutiveId: null,
    targetExecutiveName: null,
    responseId: null,
    responseCost: 0,
    responseAtAbsoluteWeek: null,
    outcomeNote: 'The market action is active.',
});
protectedMoveSave.ownedStreamingPlatform!.competitiveWorld.moves = Array.from({ length: 81 }, (_, index) => (
    migrationRivalMove(
        index === 0 ? protectedMoveId : `migration-recent-rival-move-${index}`,
        protectedMoveAbsoluteWeek - 100 + index,
    )
));
const protectedMovePlatform = normalizePlatformAiState(
    structuredClone(protectedMoveSave.world.platforms!.NETFLIX),
    protectedMoveSave.id,
    protectedMoveAbsoluteWeek,
);
protectedMovePlatform.ai!.externalCommitments = [{
    id: `platform-war:${protectedMoveId}`,
    moveId: protectedMoveId,
    obligationId: `platform-war:${protectedMoveId}`,
    platformId: 'NETFLIX',
    moveType: 'COUNTER_PROGRAM',
    pricingVersion: 1,
    outcome: 'SUCCESS',
    costMillions: 38,
    createdAtAbsoluteWeek: protectedMoveAbsoluteWeek - 100,
    status: 'PENDING_PAYMENT',
    settledAtAbsoluteWeek: null,
}];
protectedMovePlatform.ai!.pendingOneTimeObligations = [{
    id: `platform-war:${protectedMoveId}`,
    category: 'DISCRETIONARY',
    amountMillions: 38,
    createdWeek: protectedMoveAbsoluteWeek - 100,
    status: 'HELD',
    settledWeek: null,
}];
protectedMoveSave.world.platforms!.NETFLIX = protectedMovePlatform;
const protectedMoveMigrated = migratePlayerSave(protectedMoveSave);
assert(
    protectedMoveMigrated.ownedStreamingPlatform!.competitiveWorld.moves.some(move => move.id === protectedMoveId),
    'Migration must preserve an old rival move referenced by a raw Platform AI external commitment.',
);
assert(
    protectedMoveMigrated.world.platforms!.NETFLIX.ai!.externalCommitments.some(commitment => (
        commitment.moveId === protectedMoveId && commitment.status === 'PENDING_PAYMENT'
    )),
    'Migration must preserve a valid pending commitment whose authoritative move is older than normal history.',
);

const futureDealSave = createPlatformAiFixture();
const futureDealAbsoluteWeek = (futureDealSave.age - 1) * 52 + (futureDealSave.currentWeek - 1);
const futureDealCreatedWeek = futureDealAbsoluteWeek + 10;
const futureDealId = 'future-pending-catalogue-deal';
const futureDealEpisodeId = 'future-pending-catalogue-episode';
const futureDealObligationId = 'future-pending-catalogue-obligation';
const futureDealSeller = normalizePlatformAiState(
    structuredClone(futureDealSave.world.platforms!.NETFLIX),
    futureDealSave.id,
    futureDealAbsoluteWeek,
);
futureDealSeller.ai!.status = 'DISTRESSED';
futureDealSeller.ai!.distressEpisodes = [{
    id: futureDealEpisodeId,
    platformId: 'NETFLIX',
    status: 'ACTIVE',
    startedAtAbsoluteWeek: futureDealAbsoluteWeek - 3,
    completedAtAbsoluteWeek: null,
    currentStageIndex: 3,
    lastAdvancedAtAbsoluteWeek: futureDealAbsoluteWeek,
    stageResults: [
        { stage: 'FREEZE_GREENLIGHTS', outcome: 'APPLIED', enteredAtAbsoluteWeek: futureDealAbsoluteWeek - 3, resolvedAtAbsoluteWeek: futureDealAbsoluteWeek - 3, reason: 'Applied.', referenceId: null },
        { stage: 'PAUSE_RESEARCH', outcome: 'APPLIED', enteredAtAbsoluteWeek: futureDealAbsoluteWeek - 2, resolvedAtAbsoluteWeek: futureDealAbsoluteWeek - 2, reason: 'Applied.', referenceId: null },
        { stage: 'HOLD_COMMISSION', outcome: 'UNAVAILABLE', enteredAtAbsoluteWeek: futureDealAbsoluteWeek - 1, resolvedAtAbsoluteWeek: futureDealAbsoluteWeek - 1, reason: 'Unavailable.', referenceId: null },
        { stage: 'LICENSE_CATALOGUE', outcome: 'PENDING', enteredAtAbsoluteWeek: futureDealAbsoluteWeek, resolvedAtAbsoluteWeek: null, reason: 'Pending.', referenceId: futureDealId },
    ],
}];
const futureDealBuyer = normalizePlatformAiState(
    structuredClone(futureDealSave.world.platforms!.APPLE_TV),
    futureDealSave.id,
    futureDealAbsoluteWeek,
);
futureDealBuyer.ai!.pendingOneTimeObligations = [{
    id: futureDealObligationId,
    category: 'CONTRACTUAL',
    amountMillions: 10,
    createdWeek: futureDealCreatedWeek,
    status: 'HELD',
    settledWeek: null,
}];
futureDealSave.world.platforms!.NETFLIX = futureDealSeller;
futureDealSave.world.platforms!.APPLE_TV = futureDealBuyer;
futureDealSave.world.platformAiCatalogueDistressDeals = [{
    id: futureDealId,
    episodeId: futureDealEpisodeId,
    sellerPlatformId: 'NETFLIX',
    buyerPlatformId: 'APPLE_TV',
    sourceProjectId: 'future-project',
    sellerEntitlementId: 'future-entitlement',
    sourceContractId: null,
    sellerEntitlementExpiresAtAbsoluteWeek: futureDealCreatedWeek + 200,
    territory: 'DOMESTIC',
    countryIds: ['US'],
    windowType: 'FIRST_WINDOW',
    priceMillions: 10,
    buyerObligationId: futureDealObligationId,
    buyerPlanId: 'future-plan',
    buyerContractId: 'future-contract',
    durationWeeks: 104,
    startsAtAbsoluteWeek: futureDealCreatedWeek + 1,
    expiresAtAbsoluteWeek: futureDealCreatedWeek + 105,
    status: 'PENDING_PAYMENT',
    paymentDisposition: 'HELD',
    createdAtAbsoluteWeek: futureDealCreatedWeek,
    paymentSettledAtAbsoluteWeek: null,
    refundedAtAbsoluteWeek: null,
    refundedAmountMillions: 0,
    transferredAtAbsoluteWeek: null,
    cancelledAtAbsoluteWeek: null,
    cancellationReason: null,
}];
const futureDealMigrated = migratePlayerSave(futureDealSave);
const cancelledFutureDeal = futureDealMigrated.world.platformAiCatalogueDistressDeals!
    .find(deal => deal.id === futureDealId)!;
assert(
    cancelledFutureDeal?.status === 'CANCELLED',
    'Save migration must cancel a pending catalogue deal created after the current absolute week.',
);
assert(
    cancelledFutureDeal.paymentDisposition === 'VOIDED' && cancelledFutureDeal.refundedAmountMillions === 0,
    'A future held deal must be voided without creating a migration refund.',
);
assert(
    !futureDealMigrated.world.platforms!.APPLE_TV.ai!.pendingOneTimeObligations
        .some(obligation => obligation.id === futureDealObligationId),
    'Migration must remove the voided held obligation so distress cannot remain frozen.',
);
assert(
    futureDealMigrated.world.platforms!.NETFLIX.ai!.distressEpisodes[0].stageResults
        .find(result => result.referenceId === futureDealId)?.outcome === 'UNAVAILABLE',
    'Migration must resolve the pending seller stage when it cancels an impossible deal.',
);

console.log('Save migration audit passed.');
