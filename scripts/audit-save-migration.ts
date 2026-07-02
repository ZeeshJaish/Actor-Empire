import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { getStockOutstandingShares } from '../services/stockLogic';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
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

console.log('Save migration audit passed.');
