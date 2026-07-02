import { INITIAL_PLAYER } from '../types';
import {
    executeStockTakeoverAction,
    getStockTakeoverSnapshot,
} from '../services/stockTakeover';
import { getStockOutstandingShares, initializeStocks } from '../services/stockLogic';

const stocks = initializeStocks();
const stock = stocks.find(candidate => candidate.id === 'stk_wbd');
const platformStock = stocks.find(candidate => candidate.id === 'stk_nflx');
if (!stock) throw new Error('Warner stock should exist for stock takeover audit.');
if (!platformStock) throw new Error('Netflix stock should exist for platform takeover audit.');

const outstanding = getStockOutstandingShares(stock);
const makePlayer = (ownershipPercent: number) => ({
    ...INITIAL_PLAYER,
    id: 'takeover_player',
    name: 'Takeover Player',
    age: 38,
    currentWeek: 42,
    money: 5_000_000_000,
    stocks,
    portfolio: [{
        stockId: stock.id,
        shares: Math.floor(outstanding * (ownershipPercent / 100)),
        averageCost: stock.price,
        totalInvested: Math.floor(outstanding * (ownershipPercent / 100)) * stock.price,
    }],
    stockTakeovers: [],
    businesses: [],
    news: [],
    inbox: [],
    logs: [],
});

const passive = getStockTakeoverSnapshot(makePlayer(19), stock);
if (passive.availableRoutes.includes('SHAREHOLDER_ALLIANCE')) {
    throw new Error('Shareholder alliance should require at least 20% ownership.');
}

const strategic = getStockTakeoverSnapshot(makePlayer(21), stock);
if (!strategic.availableRoutes.includes('SHAREHOLDER_ALLIANCE')) {
    throw new Error('20% ownership should unlock shareholder alliance.');
}
if (strategic.availableRoutes.includes('HOSTILE_TAKEOVER')) {
    throw new Error('Hostile takeover should require at least 30% ownership.');
}

const boardSeat = getStockTakeoverSnapshot(makePlayer(31), stock);
if (!boardSeat.availableRoutes.includes('FRIENDLY_TAKEOVER') || !boardSeat.availableRoutes.includes('HOSTILE_TAKEOVER')) {
    throw new Error('30% ownership should unlock friendly and hostile takeover routes.');
}

const alliance = executeStockTakeoverAction(makePlayer(22), stock.id, 'SHAREHOLDER_ALLIANCE');
if (!alliance.success || !alliance.case || alliance.case.alliedSupportPercent <= 0) {
    throw new Error(`Shareholder alliance should create allied support: ${alliance.reason || 'unknown'}.`);
}
if (alliance.player.money >= makePlayer(22).money) {
    throw new Error('Shareholder alliance should cost money.');
}

const hostile = executeStockTakeoverAction(makePlayer(34), stock.id, 'HOSTILE_TAKEOVER');
if (!hostile.success || !hostile.case) {
    throw new Error(`Hostile takeover should create a takeover case: ${hostile.reason || 'unknown'}.`);
}
if (!['RIVAL_DEFENCE', 'ACTIVE', 'READY_FOR_CONTROL'].includes(hostile.case.status)) {
    throw new Error(`Hostile route should model active pressure or rival defence, received ${hostile.case.status}.`);
}
if (!hostile.player.news.some(item => item.headline.toLowerCase().includes('takeover'))) {
    throw new Error('Takeover actions should publish market news.');
}

const controller = executeStockTakeoverAction(makePlayer(52), stock.id, 'CONTROL_TRANSFER');
if (!controller.success || !controller.acquiredBusiness) {
    throw new Error(`51% ownership should allow control transfer: ${controller.reason || 'unknown'}.`);
}
if (!controller.player.businesses.some(business => business.id === stock.relatedStudioId && business.studioState?.acquisitionOrigin === 'STUDIO_ACQUISITION')) {
    throw new Error('Control transfer should create an acquired studio business.');
}
if (!controller.player.stockTakeovers.some(entry => entry.status === 'CONTROLLED')) {
    throw new Error('Control transfer should mark the takeover case controlled.');
}

const platformOutstanding = getStockOutstandingShares(platformStock);
const platformPlayer = {
    ...makePlayer(52),
    portfolio: [{
        stockId: platformStock.id,
        shares: Math.floor(platformOutstanding * 0.52),
        averageCost: platformStock.price,
        totalInvested: Math.floor(platformOutstanding * 0.52) * platformStock.price,
    }],
};
const platformSnapshot = getStockTakeoverSnapshot(platformPlayer, platformStock);
if (platformSnapshot.canTransferControl || platformSnapshot.availableRoutes.includes('CONTROL_TRANSFER')) {
    throw new Error('Streaming platform stocks should not unlock production-studio control transfer.');
}
const platformController = executeStockTakeoverAction(platformPlayer, platformStock.id, 'CONTROL_TRANSFER');
if (platformController.success || platformController.reason !== 'STREAMING_PLATFORM_RESERVED') {
    throw new Error(`Streaming platform control transfer should be reserved for the streaming phase: ${platformController.reason || 'success'}.`);
}

console.log('Stock takeovers audit passed.');
