import { INITIAL_PLAYER } from '../types';
import {
    createShareholderVote,
    getShareholderInfluence,
    processShareholderVoting,
    resolveShareholderVote,
} from '../services/shareholderVoting';
import { getStockOutstandingShares, initializeStocks } from '../services/stockLogic';
import { getEntertainmentStockSnapshot } from '../services/entertainmentStockMarket';
import { getCompanyPosition } from '../services/companyPosition';
import { getStockTakeoverSnapshot } from '../services/stockTakeover';

const stocks = initializeStocks();
const stock = stocks.find(candidate => candidate.id === 'stk_dis');
if (!stock) throw new Error('Disney stock should exist.');

const outstanding = getStockOutstandingShares(stock);
const makePlayer = (ownershipPercent: number) => ({
    ...INITIAL_PLAYER,
    age: 31,
    currentWeek: 30,
    stocks,
    portfolio: [{
        stockId: stock.id,
        shares: Math.floor(outstanding * (ownershipPercent / 100)),
        averageCost: stock.price,
        totalInvested: Math.floor(outstanding * (ownershipPercent / 100)) * stock.price,
    }],
    shareholderVotes: [],
    inbox: [],
    news: [],
    logs: [],
});

if (getShareholderInfluence(9.99).level !== 'PASSIVE_INVESTOR') {
    throw new Error('Below 10% should remain passive.');
}
if (getShareholderInfluence(10).level !== 'SHAREHOLDER_VOTER') {
    throw new Error('10% should unlock shareholder voting.');
}
if (getShareholderInfluence(20).level !== 'STRATEGIC_INFLUENCE') {
    throw new Error('20% should unlock strategic influence.');
}
if (getShareholderInfluence(30).level !== 'BOARD_SEAT') {
    throw new Error('30% should unlock a board seat.');
}
if (getShareholderInfluence(51).level !== 'CONTROLLING_OWNER') {
    throw new Error('51% should unlock controlling ownership.');
}

const passive = processShareholderVoting(makePlayer(9));
if ((passive.shareholderVotes || []).length) {
    throw new Error('Passive investors should not receive shareholder ballots.');
}

const voter = makePlayer(12);
const vote = createShareholderVote(voter, stock, 'DIVIDEND_POLICY');
if (!vote || vote.status !== 'OPEN') {
    throw new Error('Eligible shareholder should receive an open vote.');
}
if (vote.playerVotingPower < 11.9 || vote.playerVotingPower > 12.1) {
    throw new Error(`Voting power should track ownership, received ${vote.playerVotingPower}.`);
}

const inflatedPosition = {
    ...makePlayer(0),
    portfolio: [{
        stockId: stock.id,
        shares: outstanding * 22_360_000,
        averageCost: stock.price,
        totalInvested: outstanding * 22_360_000 * stock.price,
    }],
};
const inflatedVote = createShareholderVote(inflatedPosition, stock, 'CAPITAL_RAISE');
if (!inflatedVote || inflatedVote.playerVotingPower !== 100) {
    throw new Error(`Inflated legacy holdings should clamp voting power to 100%, received ${inflatedVote?.playerVotingPower}.`);
}
const inflatedSnapshot = getEntertainmentStockSnapshot(inflatedPosition, stock);
if (inflatedSnapshot.ownershipPercent !== 100) {
    throw new Error(`Inflated legacy holdings should clamp stock snapshots to 100%, received ${inflatedSnapshot.ownershipPercent}.`);
}
const inflatedCompanyPosition = getCompanyPosition(inflatedPosition, {
    id: stock.relatedStudioId || 'DISNEY_PLUS',
    isPlayerOwned: false,
    valuation: stock.price * outstanding,
    acquisitionState: 'PUBLICLY_TRADED',
    ownershipStructure: 'public company',
});
if (inflatedCompanyPosition.stockPercent !== 100 || inflatedCompanyPosition.ownershipPercent !== 100) {
    throw new Error(`Inflated legacy holdings should clamp company position to 100%, received ${inflatedCompanyPosition.stockPercent}/${inflatedCompanyPosition.ownershipPercent}.`);
}
const inflatedTakeover = getStockTakeoverSnapshot(inflatedPosition, stock);
if (inflatedTakeover.ownershipPercent !== 100 || inflatedTakeover.effectiveControlPercent !== 100) {
    throw new Error(`Inflated legacy holdings should clamp takeover snapshot to 100%, received ${inflatedTakeover.ownershipPercent}/${inflatedTakeover.effectiveControlPercent}.`);
}

const withVote = {
    ...voter,
    shareholderVotes: [vote],
    inbox: [{
        id: `msg_${vote.id}`,
        sender: 'Shareholder Services',
        subject: 'Shareholder Ballot',
        text: 'Vote required.',
        type: 'SHAREHOLDER_VOTE' as const,
        data: { voteId: vote.id, stockId: vote.stockId },
        isRead: true,
        weekSent: vote.createdWeek,
        expiresIn: 4,
    }],
    pendingEvents: [],
};
const resolved = resolveShareholderVote(withVote, vote.id, 'FOR');
if (!resolved.success || resolved.vote?.status !== 'RESOLVED') {
    throw new Error('Casting a shareholder vote should resolve the ballot.');
}
if (!resolved.player.news.some(item => item.headline.includes('shareholders'))) {
    throw new Error('Resolved shareholder votes should publish company news.');
}
if (resolved.player.stocks.find(candidate => candidate.id === stock.id)!.price === stock.price) {
    throw new Error('Shareholder vote outcomes should affect stock price.');
}
if (resolved.player.inbox.some(message => message.data?.voteId === vote.id)) {
    throw new Error('Resolving a recovered inbox ballot should remove its stale message.');
}

const yearEndVoter = {
    ...makePlayer(12),
    age: 31,
    currentWeek: 50,
};
const yearEndVote = createShareholderVote(yearEndVoter, stock, 'SLATE_APPROVAL');
if (!yearEndVote || yearEndVote.dueWeek !== 2 || yearEndVote.dueYear !== 32) {
    throw new Error(`Year-end ballot due dates should wrap to Age 32 Week 2, received ${yearEndVote?.dueYear}/${yearEndVote?.dueWeek}.`);
}

const expiredVote = {
    ...vote,
    dueWeek: 34,
    dueYear: 31,
};
const expiredPlayer = processShareholderVoting({
    ...withVote,
    age: 31,
    currentWeek: 34,
    shareholderVotes: [expiredVote],
    pendingEvents: [{
        id: `event_${expiredVote.id}`,
        week: expiredVote.createdWeek,
        type: 'LIFE_EVENT' as const,
        title: 'Shareholder Decision',
        data: { voteId: expiredVote.id },
    }],
});
if (expiredPlayer.shareholderVotes[0]?.status !== 'EXPIRED') {
    throw new Error('A ballot should close when its four-week voting window ends.');
}
if (expiredPlayer.pendingEvents.some(event => event.data?.voteId === expiredVote.id)) {
    throw new Error('Expired ballots should remove stale decision popups.');
}
if (!expiredPlayer.inbox.find(message => message.data?.voteId === expiredVote.id)?.isExpired) {
    throw new Error('Expired ballots should leave a clear read-only inbox record.');
}

console.log('Shareholder voting audit passed.');
