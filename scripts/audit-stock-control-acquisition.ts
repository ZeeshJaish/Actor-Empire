import { INITIAL_PLAYER, type Player } from '../types';
import {
    completeStockControlAcquisition,
    getAcquisitionCase,
    type AcquisitionCase,
} from '../services/studioAcquisition';
import { initializeStocks, getStockOutstandingShares } from '../services/stockLogic';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const stocks = initializeStocks();
const stock = stocks.find(candidate => candidate.id === 'stk_wbd');
const platformStock = stocks.find(candidate => candidate.id === 'stk_nflx');
if (!stock?.relatedStudioId) throw new Error('Warner stock should link to a studio profile.');
if (!platformStock?.relatedStudioId) throw new Error('Netflix stock should link to a platform profile.');

const outstandingShares = getStockOutstandingShares(stock);
const sharesForPercent = (percent: number) => Math.floor(outstandingShares * (percent / 100));

const profile: any = {
    id: stock.relatedStudioId,
    name: 'Warner Bros.',
    isPlayerOwned: false,
    acquisitionState: 'PUBLICLY_TRADED',
    valuation: 305_900_000_000,
    capital: 12_000_000_000,
    debt: 8_200_000_000,
    profitability: 6_400_000_000,
    reputation: 84,
    hits: 8,
    flops: 2,
    rightsCount: 28,
    franchiseCount: 7,
    universeCount: 4,
    facilities: ['Burbank Lot', 'Animation Campus'],
    keyTalent: [{ name: 'Studio Chair', role: 'Chairperson' }],
    catalog: [{ id: 'disney_catalog_1', title: 'Castle Saga', revenue: 1_800_000_000, outcome: 'HIT' }],
    rightsHighlights: ['Castle Saga'],
    ownershipStructure: 'Public company · Institutional shareholders',
    archetype: 'LEGACY',
};

const platformProfile: any = {
    ...profile,
    id: platformStock.relatedStudioId,
    name: 'Netflix',
    archetype: 'PLATFORM',
    valuation: 260_000_000_000,
};

const staleCounterCase: AcquisitionCase = {
    studioId: profile.id,
    studioName: profile.name,
    acquisitionState: 'PUBLICLY_TRADED',
    publicValuation: profile.valuation,
    approachedWeek: 7,
    approachedYear: 38,
    status: 'COUNTERED',
    offer: {
        type: 'FAIR',
        amount: 55_700_000_000,
        funding: { source: 'PERSONAL' },
        complianceRisk: 0,
        complianceBand: 'ROUTINE',
        submittedWeek: 7,
        submittedYear: 38,
        round: 1,
    },
    sellerResponse: {
        decision: 'COUNTERED',
        counterAmount: 60_200_000_000,
        round: 1,
        respondedWeek: 8,
        respondedYear: 38,
        summary: 'The board wants stronger terms.',
    },
};

const makePlayer = (ownershipPercent: number): Player => ({
    ...INITIAL_PLAYER,
    id: 'stock_control_acquisition_player',
    name: 'Control Buyer',
    age: 39,
    currentWeek: 44,
    money: 90_000_000_000,
    stocks,
    portfolio: [{
        stockId: stock.id,
        shares: sharesForPercent(ownershipPercent),
        averageCost: stock.price,
        totalInvested: sharesForPercent(ownershipPercent) * stock.price,
    }],
    flags: {
        ...INITIAL_PLAYER.flags,
        studioAcquisitionCases: [staleCounterCase],
    },
    businesses: [],
    pendingEvents: [{
        id: 'stock_control_event_stk_wbd',
        type: 'STOCK_CONTROL',
        title: 'You Control Disney+',
        description: 'Majority control ready.',
        week: 44,
        data: {
            stockDecisionType: 'TAKEOVER_CONTROL',
            stockId: stock.id,
            relatedStudioId: profile.id,
        },
    }],
    inbox: [],
    logs: [],
    news: [],
});

const minorityAttempt = completeStockControlAcquisition({
    player: makePlayer(30),
    profile,
});
assert(!minorityAttempt.success && minorityAttempt.reason === 'CONTROL_NOT_READY', 'Sub-50% stock ownership must not complete a control transfer.');

const platformAttempt = completeStockControlAcquisition({
    player: {
        ...makePlayer(52),
        portfolio: [{
            stockId: platformStock.id,
            shares: Math.floor(getStockOutstandingShares(platformStock) * 0.52),
            averageCost: platformStock.price,
            totalInvested: Math.floor(getStockOutstandingShares(platformStock) * 0.52) * platformStock.price,
        }],
    },
    profile: platformProfile,
});
assert(!platformAttempt.success && platformAttempt.reason === 'STREAMING_PLATFORM_RESERVED', 'Streaming platforms should not enter production-studio control transfer yet.');

const beforePlayer = makePlayer(52);
const result = completeStockControlAcquisition({
    player: beforePlayer,
    profile,
});

assert(result.success, 'Majority stock ownership should complete the control transfer.');
assert(result.player.money === beforePlayer.money, 'Stock-control acquisition must not charge the acquisition price again.');
assert(result.acquisitionCase?.status === 'ACQUIRED', 'Stock-control transfer should mark the acquisition case acquired.');
assert(result.acquisitionCase?.closing?.finalPrice === 0, 'Stock-control closing should have a zero additional price.');
assert(!result.acquisitionCase?.sellerResponse, 'Stock-control closing should clear stale seller counter data.');
assert(result.player.businesses.some(business => business.id === profile.id), 'Stock-control transfer should add the studio to owned businesses.');
assert(!result.player.pendingEvents?.some(event => event.data?.stockDecisionType === 'TAKEOVER_CONTROL' && event.data?.relatedStudioId === profile.id), 'Completed transfer should clear matching stock-control popup events.');

const savedCase = getAcquisitionCase(result.player, profile.id);
assert(savedCase?.closing?.finalPrice === 0, 'Persisted stock-control case should keep zero final price.');
assert(
    result.player.logs.some(log => /No additional acquisition price/i.test(log.message)),
    'Completion log should explicitly say no second acquisition price was charged.',
);

console.log('Stock control acquisition audit passed.');
