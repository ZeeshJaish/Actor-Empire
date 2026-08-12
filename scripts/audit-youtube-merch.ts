import { INITIAL_PLAYER, type Player } from '../types';
import {
    calculateYoutubeMerchQuote,
    getYoutubeMerchDropFailure,
    resolveYoutubeMerchDrop,
    YOUTUBE_MERCH_TIERS,
} from '../services/youtubeLogic';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const makePlayer = (overrides: Partial<Player> = {}): Player => {
    const base = clone(INITIAL_PLAYER);
    return {
        ...base,
        age: 31,
        currentWeek: 20,
        money: 1_000_000,
        energy: { current: 100, max: 100 },
        flags: {
            ...base.flags,
            weeklyBaseEnergyRemaining: 100,
            bonusEnergyBank: 0,
            weeklyEnergySpendLog: [],
        },
        youtube: {
            ...base.youtube,
            subscribers: 1_000_000,
            audienceTrust: 80,
            fanMood: 80,
            controversy: 0,
            lastMerchDropWeek: 0,
            creatorIdentity: 'LIFESTYLE_ICON',
        },
        finance: {
            ...base.finance,
            history: [],
        },
        logs: [],
        ...overrides,
    };
};

const player = makePlayer();
const quote = calculateYoutubeMerchQuote(player, 'BASIC', () => 0.5);
if (quote.grossRevenue <= quote.productionCost || quote.netProfit !== quote.grossRevenue - quote.productionCost) {
    throw new Error('Merch quote should expose gross, production cost, and exact net profit.');
}

const resolved = resolveYoutubeMerchDrop(player, 'BASIC', () => 0.5, 'en');
if (!resolved.success || !resolved.quote) {
    throw new Error(`Eligible merch drop should settle, received ${resolved.reason}.`);
}
if (resolved.player.money !== player.money + resolved.quote.netProfit) {
    throw new Error('Merch net profit should be credited to player cash exactly once.');
}
if (resolved.player.youtube.lifetimeEarnings !== player.youtube.lifetimeEarnings + resolved.quote.netProfit) {
    throw new Error('Profitable merch should increase creator lifetime earnings by net profit.');
}
if (resolved.player.youtube.lastMerchOutcome?.netProfit !== resolved.quote.netProfit) {
    throw new Error('The full merch outcome should persist for the result UI and imported saves.');
}
const merchLedger = resolved.player.finance.history.filter(transaction => transaction.id.includes('youtube_merch'));
if (merchLedger.length !== 2) {
    throw new Error(`Merch settlement should create sales and production ledger entries, received ${merchLedger.length}.`);
}
if (merchLedger.reduce((sum, transaction) => sum + transaction.amount, 0) !== resolved.quote.netProfit) {
    throw new Error('Merch ledger entries should reconcile exactly to the cash movement.');
}
if (!merchLedger.some(transaction => transaction.category === 'BUSINESS' && transaction.amount === resolved.quote!.grossRevenue)) {
    throw new Error('Gross merch sales should appear as business income.');
}
if (!merchLedger.some(transaction => transaction.category === 'EXPENSE' && transaction.amount === -resolved.quote!.productionCost)) {
    throw new Error('Merch production cost should appear as an expense.');
}
if (resolved.player.energy.current !== player.energy.current - YOUTUBE_MERCH_TIERS.BASIC.energy) {
    throw new Error('Merch settlement should charge the configured energy once.');
}

const duplicate = resolveYoutubeMerchDrop(resolved.player, 'BASIC', () => 0.5, 'en');
if (duplicate.success || duplicate.reason !== 'COOLDOWN' || duplicate.player.money !== resolved.player.money) {
    throw new Error('A second same-week merch action must be rejected without changing cash.');
}

const lowDemandPlayer = makePlayer({
    youtube: {
        ...makePlayer().youtube,
        subscribers: 100,
        audienceTrust: 35,
        fanMood: 20,
        controversy: 90,
        creatorIdentity: 'ACTOR_VLOGGER',
    },
});
const loss = resolveYoutubeMerchDrop(lowDemandPlayer, 'BASIC', () => 0, 'en');
if (!loss.success || !loss.quote || loss.quote.result !== 'UNDERPERFORMED' || loss.quote.netProfit >= 0) {
    throw new Error('Low-demand merch should be able to underperform with a visible net loss.');
}
if (loss.player.money !== lowDemandPlayer.money + loss.quote.netProfit) {
    throw new Error('An underperforming drop should charge only its real net loss.');
}
if (loss.player.youtube.lifetimeEarnings !== lowDemandPlayer.youtube.lifetimeEarnings) {
    throw new Error('A merch loss must not inflate creator lifetime earnings.');
}

const yearBoundaryPlayer = makePlayer({
    age: 32,
    currentWeek: 4,
    youtube: {
        ...makePlayer().youtube,
        lastMerchDropWeek: 31 * 52 + 50,
    },
});
if (getYoutubeMerchDropFailure(yearBoundaryPlayer, 'BASIC') === 'COOLDOWN') {
    throw new Error('Merch cooldown should unlock correctly across the 52-week year boundary.');
}

console.log('YouTube merch economics audit passed.');
