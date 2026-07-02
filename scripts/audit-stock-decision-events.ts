import { INITIAL_PLAYER, Player } from '../types';
import { processShareholderVoting } from '../services/shareholderVoting';
import { processStockTakeoverEvents } from '../services/stockTakeover';
import { getStockOutstandingShares, initializeStocks } from '../services/stockLogic';

const stocks = initializeStocks();
const stock = stocks.find(candidate => candidate.id === 'stk_wbd');
if (!stock) throw new Error('Warner stock should exist for stock decision event audit.');

const outstanding = getStockOutstandingShares(stock);
const makePlayer = (ownershipPercent: number): Player => ({
    ...INITIAL_PLAYER,
    id: 'stock_event_player',
    name: 'Stock Event Player',
    age: 39,
    currentWeek: 44,
    money: 5_000_000_000,
    stocks,
    portfolio: [{
        stockId: stock.id,
        shares: Math.floor(outstanding * (ownershipPercent / 100)),
        averageCost: stock.price,
        totalInvested: Math.floor(outstanding * (ownershipPercent / 100)) * stock.price,
    }],
    shareholderVotes: [],
    stockTakeovers: [],
    pendingEvents: [],
    businesses: [],
    news: [],
    inbox: [],
    logs: [],
});

const withVoteEvent = processShareholderVoting(makePlayer(12));
const shareholderEvent = withVoteEvent.pendingEvents?.find(event => event.data?.stockDecisionType === 'SHAREHOLDER_VOTE');
if (!shareholderEvent) {
    throw new Error('Shareholder voting should create a popup decision event.');
}
if (shareholderEvent.type !== 'LIFE_EVENT') {
    throw new Error('Stock decisions should use the existing LifeEvent popup renderer.');
}
if (shareholderEvent.data.lifeEvent.options.length !== 3) {
    throw new Error('Shareholder popup should expose two normal choices plus one golden option.');
}
if (!shareholderEvent.data.lifeEvent.options[2].isGolden) {
    throw new Error('Third shareholder popup option should be golden.');
}

const voteResult = shareholderEvent.data.lifeEvent.options[0].impact(withVoteEvent);
if (!voteResult.updatedPlayer.shareholderVotes.some(vote => vote.status === 'RESOLVED')) {
    throw new Error('Shareholder popup option should resolve the vote.');
}

const withControlEvent = processStockTakeoverEvents(makePlayer(52));
const takeoverEvent = withControlEvent.pendingEvents?.find(event => event.data?.stockDecisionType === 'TAKEOVER_CONTROL');
if (!takeoverEvent) {
    throw new Error('Majority ownership should create a takeover control popup event.');
}
if (takeoverEvent.type !== 'STOCK_CONTROL') {
    throw new Error('Majority control should use the dedicated stock control event renderer.');
}
if (takeoverEvent.data.lifeEvent) {
    throw new Error('Majority control should not be wrapped in the generic LifeEvent popup.');
}
if (String(JSON.stringify(takeoverEvent)).includes('GOLDEN_BOARD_TRANSITION') || String(JSON.stringify(takeoverEvent)).includes('Clean Board Transition')) {
    throw new Error('Majority control should not include a golden/ad safe option.');
}
if (takeoverEvent.data.relatedStudioId !== stock.relatedStudioId) {
    throw new Error('Majority control event should carry the related studio id for acquisition desk routing.');
}

console.log('Stock decision events audit passed.');
