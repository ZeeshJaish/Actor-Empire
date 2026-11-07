/** #185 (plan §22.4): share prices for every company.
 *  - each week a price moves 15% of the way to what a share is worth, plus momentum, the sector's mood, the week's
 *    events and noise seeded by the career, the company and the week (the same week moves the same way);
 *  - the world's tickers: a studio's ticker follows its studio's value (its hits and flops reach the price through it),
 *    the others grow with their sector; nothing runs away to its cap any more;
 *  - dividends carry on past the first year, and a company can issue shares again a year later (absolute weeks);
 *  - our listed company: pulled to the valuation engine's value per share; without guidance the market expects the
 *    trend, so a quarter that only stays in the black is not a free BEAT;
 *  - our ticker shows in the Stocks app once listed. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type NPCStudioState, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { STUDIO_CATALOG } from '../services/studioLogic';
import { getStockFairValue, initializeStocks, processStockMarket } from '../services/stockLogic';
import { nextSharePrice } from '../services/valuation/sharePrice';
import {
    commitStreamingPublicMarketWeek,
    getStreamingEquityValuation,
    getStreamingOwnTicker,
    scoreStreamingQuarter,
} from '../services/streamingPublicMarkets';
import { listStreamingCompanyForQa } from '../services/streamingListingQa';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Share Prices', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
const nextWeek = (player: Player): Player => (player.currentWeek >= 52 ? { ...player, age: player.age + 1, currentWeek: 1 } : { ...player, currentWeek: player.currentWeek + 1 });
const pass = (label: string) => console.log(`✓ ${label}`);

async function main() {
    const started = performance.now();

    /* ── one week's step ── */
    const up = nextSharePrice({ previous: 100, fair: 200, lastMove: 0, sector: 'MEDIA', absoluteWeek: 800, volatility: 0.02, seed: 'audit' });
    assert.ok(Math.abs(up.pull - 0.15) < 1e-9, 'a share worth twice its price: 15% of the gap');
    assert.ok(up.move > 0.11 && up.move <= 0.18, `the week's move (${(up.move * 100).toFixed(1)}%)`);
    assert.deepEqual(nextSharePrice({ previous: 100, fair: 200, lastMove: 0, sector: 'MEDIA', absoluteWeek: 800, volatility: 0.02, seed: 'audit' }), up, 'seeded');
    const still = nextSharePrice({ previous: 100, fair: 100, lastMove: 0, sector: 'MEDIA', absoluteWeek: 800, volatility: 0.02, seed: 'audit' });
    assert.ok(Math.abs(still.move) < 0.025, 'at its value it barely moves');
    let price = 300;
    let last = 0;
    for (let week = 0; week < 40; week += 1) {
        const step = nextSharePrice({ previous: price, fair: 100, lastMove: last, sector: 'TECH', absoluteWeek: 900 + week, volatility: 0.02, seed: 'audit' });
        price = step.price;
        last = step.move;
    }
    assert.ok(price > 85 && price < 118, `three times its value comes back to it within 40 weeks (${price.toFixed(1)})`);
    pass(`a week's step: twice the value → +${(up.move * 100).toFixed(1)}% (15% of the gap), at the value ±${(Math.abs(still.move) * 100).toFixed(1)}%; $300 against $100 of value → $${price.toFixed(0)} after 40 weeks`);

    /* ── the world's tickers: three years ── */
    const runMarket = (seedPlayer: Player, weeks: number) => {
        let player = seedPlayer;
        const payouts = new Map<string, number>();
        const issues = new Map<string, number>();
        for (let week = 0; week < weeks; week += 1) {
            const before = new Map(player.stocks.map(stock => [stock.id, stock.lastDividendPayoutWeek]));
            const update = processStockMarket(player.stocks, player.currentWeek, player);
            update.stocks.forEach(stock => { if (stock.lastDividendPayoutWeek !== before.get(stock.id)) payouts.set(stock.id, (payouts.get(stock.id) || 0) + 1); });
            update.corporateActions.forEach(action => issues.set(action.stockId, (issues.get(action.stockId) || 0) + 1));
            player = nextWeek({ ...player, stocks: update.stocks });
        }
        return { player, payouts, issues };
    };
    const worldStudios: Record<string, NPCStudioState> = {};
    (['WARNER_BROS', 'PARAMOUNT', 'UNIVERSAL', 'NETFLIX', 'DISNEY_PLUS', 'APPLE_TV'] as const).forEach(id => {
        const catalogue = STUDIO_CATALOG[id];
        worldStudios[id] = { id, name: catalogue.name, valuation: catalogue.valuation, reputation: 70, cashReserve: 0, recentHits: 0, archetype: catalogue.archetype };
    });
    const market = { ...fresh('share-prices'), stocks: initializeStocks() };
    market.world = { ...market.world, studios: { ...(market.world.studios || {}), ...worldStudios } };
    const three = runMarket(market, 156);
    const again = runMarket(market, 156);
    assert.deepEqual(three.player.stocks.map(stock => stock.price), again.player.stocks.map(stock => stock.price), 'the same career, the same prices');
    const ko = three.payouts.get('stk_ko') || 0;
    assert.ok(ko >= 12, `Coca-Cola paid ${ko} dividends in three years (every 12 weeks, not only in the first year)`);
    const repeated = [...three.issues.entries()].filter(([, count]) => count >= 2);
    assert.ok(repeated.length >= 1, 'a company issued shares again a year later');
    const week = getAbsoluteWeek(three.player.age, three.player.currentWeek);
    const bands = three.player.stocks.map(stock => {
        const { fair } = getStockFairValue(stock, three.player, week);
        assert.ok(stock.price > fair * 0.6 && stock.price < fair * 1.6, `${stock.symbol} stays near its value ($${stock.price.toFixed(2)} vs $${fair.toFixed(2)})`);
        return `${stock.symbol} $${stock.price.toFixed(0)} (value $${fair.toFixed(0)})`;
    });
    pass(`three years of the world's tickers, seeded: ${bands.join(', ')}; Coca-Cola paid ${ko} dividends; ${repeated.map(([id, count]) => `${id} issued ${count}×`).join(', ')}`);

    /* a studio's ticker follows its studio */
    const wbd = three.player.stocks.find(stock => stock.id === 'stk_wbd')!;
    const hot = { ...three.player, world: { ...three.player.world, studios: { ...three.player.world.studios!, WARNER_BROS: { ...three.player.world.studios!.WARNER_BROS, projectsReleased: 8, hits: 7, flops: 0 } } } };
    const cold = { ...three.player, world: { ...three.player.world, studios: { ...three.player.world.studios!, WARNER_BROS: { ...three.player.world.studios!.WARNER_BROS, projectsReleased: 8, hits: 0, flops: 7 } } } };
    const hotFair = getStockFairValue(wbd, hot, week).fair;
    const coldFair = getStockFairValue(wbd, cold, week).fair;
    assert.ok(hotFair > coldFair * 1.1, 'a run of hits is worth more to WBD than a run of flops');
    pass(`WBD follows Warner Bros.: on 7 hits a share is worth $${hotFair.toFixed(2)}, on 7 flops $${coldFair.toFixed(2)}`);

    /* ── our company, listed ── */
    let player = await buildStreamingFullPlatformQa(fresh('share-prices-ours'), { processWeek: processGameWeek, persistWeek: async next => next });
    player = { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
    assert.equal(getStreamingOwnTicker(player), null, 'no ticker before listing');
    /* #189: through the listing's own commit (the old roadshow is gone) */
    const listed = listStreamingCompanyForQa(player, { ticker: 'AUDT' });
    assert.ok(listed.changed, listed.reason);
    player = listed.player;
    const own = getStreamingOwnTicker(player)!;
    const listing = platformOf(player).publicCompany.listing!;
    assert.equal(own.symbol, 'AUDT');
    assert.equal(own.closes[0], listing.offerPrice);
    assert.ok(Math.abs(own.valuePerShare - getStreamingEquityValuation(platformOf(player)) / listing.sharesOutstanding) < 1e-6, 'value per share by the engine');
    pass(`our ticker in the Stocks app: ${own.symbol} at $${own.price.toFixed(2)}, worth $${own.valuePerShare.toFixed(2)} a share by its numbers, your ${own.founderPercent.toFixed(1)}%`);

    /* priced at three times its value: it comes back */
    let platform = platformOf(player);
    const fair = getStreamingEquityValuation(platform) / listing.sharesOutstanding;
    const quotes = platform.publicCompany.quoteHistory;
    platform = { ...platform, publicCompany: { ...platform.publicCompany, quoteHistory: [...quotes.slice(0, -1), { ...quotes.at(-1)!, close: Math.round(fair * 300) / 100 }] } };
    const snapshot = platform.weeklyHistory.at(-1)!;
    const firstWeek = quotes.at(-1)!.absoluteWeek + 1;
    let drivers: string[] = [];
    for (let step = 0; step < 30; step += 1) {
        platform = commitStreamingPublicMarketWeek(platform, player, { ...snapshot, absoluteWeek: firstWeek + step });
        if (step === 0) drivers = platform.publicCompany.quoteHistory.at(-1)!.drivers;
    }
    const close = platform.publicCompany.quoteHistory.at(-1)!.close;
    const fairNow = getStreamingEquityValuation(platform) / listing.sharesOutstanding;
    assert.ok(drivers.includes('Priced above its value'), 'the quote says why');
    assert.ok(close < fairNow * 1.3, `three times its value comes back in 30 weeks ($${close.toFixed(2)} vs $${fairNow.toFixed(2)})`);
    pass(`our share at three times its value ($${(fair * 3).toFixed(2)}) falls to $${close.toFixed(2)} in 30 weeks (value $${fairNow.toFixed(2)}); the quote read "${drivers.join(', ')}"`);

    /* the free BEAT is gone */
    const reviews = platform.cycleReviews.filter(item => item.kind === 'TWELVE_WEEK_REVIEW');
    const previous = reviews.at(-1)!;
    const flat = { ...previous, id: 'audit-flat', cycleNumber: previous.cycleNumber + 1, subscriberStart: previous.subscriberEnd, subscriberEnd: previous.subscriberEnd,
        totalSubscriptionRevenue: previous.totalSubscriptionRevenue, totalCashContribution: Math.max(1, Math.round(previous.totalCashContribution * 0.5)) };
    const flatPlatform = { ...platform, cycleReviews: [...platform.cycleReviews, flat], publicCompany: { ...platform.publicCompany, guidance: [] } };
    const flatScore = scoreStreamingQuarter(flatPlatform, flat);
    assert.notEqual(flatScore.outcome, 'BEAT', `a flat quarter in the black is not a BEAT (score ${flatScore.score})`);
    const strong = { ...flat, id: 'audit-strong', subscriberEnd: Math.round(flat.subscriberStart * 1.3), totalSubscriptionRevenue: Math.round(previous.totalSubscriptionRevenue * 1.4), totalCashContribution: Math.abs(previous.totalCashContribution) * 2 + 1 };
    const strongScore = scoreStreamingQuarter({ ...flatPlatform, cycleReviews: [...platform.cycleReviews, strong] }, strong);
    assert.equal(strongScore.outcome, 'BEAT', `a quarter well past the trend is a BEAT (score ${strongScore.score})`);
    pass(`without guidance the market expects the trend: a flat quarter in the black is ${flatScore.outcome} (${flatScore.score}), one well past it ${strongScore.outcome} (${strongScore.score})`);

    console.log(`\nshare prices audit passed in ${((performance.now() - started) / 1000).toFixed(1)}s`);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
