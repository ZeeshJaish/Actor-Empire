/** #187 (plan §22.7): your own shares, buybacks and buyouts, on the full test company.
 *  - private: an investor bought out at our value × their premium (1.05–1.25), from the treasury, never under the cash
 *    floor; their stake retired (every holder's % rises), their seat and their share of profit end;
 *  - listed, the Stocks app: our own shares bought from the public with your own money, the size moving the price;
 *    sold only after the 26-week lock-up, with a warning before going under 51%;
 *  - listed, OWNERSHIP: a buyback of 1–10% a year over 4 weeks at each week's close, from the treasury, held at the
 *    cash floor; the shares retired, so every holder's % rises;
 *  - the cap table always adds up to 100%, and the books show it. */
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type OwnedStreamingPlatformState, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { commitStreamingPublicMarketWeek, getStreamingEquityValuation } from '../services/streamingPublicMarkets';
import { listStreamingCompanyForQa } from '../services/streamingListingQa';
import { getStreamingOwnershipView } from '../services/streamingInvestorOffers';
import { getStreamingGovernanceWeeklyCost } from '../services/streamingLeadershipGovernance';
import { getStreamingFinanceRoom } from '../services/streamingFinanceRoom';
import { PUBLIC_FLOAT_HOLDER } from '../services/streamingBuybacks';
import { buyOutStreamingInvestor, getStreamingBuyoutQuote, quoteOwnShareTrade, startStreamingBuyback, streamingBuyoutChance, tradeOwnStreamingShares } from '../services/streamingOwnShares';
import { getStreamingTeamCashFloor } from '../services/team/teamState';
import { BoardroomOwnership, type BoardroomOwnershipActions } from '../components/streaming-transplant/BoardroomOwnership';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Own Shares Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
const withPlatform = (player: Player, change: (platform: OwnedStreamingPlatformState) => OwnedStreamingPlatformState): Player => ({ ...player, ownedStreamingPlatform: change(platformOf(player)) });
const later = (player: Player, weeks: number): Player => {
    const total = player.currentWeek - 1 + weeks;
    return { ...player, age: player.age + Math.floor(total / 52), currentWeek: (total % 52) + 1 };
};
const capTotal = (platform: OwnedStreamingPlatformState) => platform.founderOwnershipPercent + platform.finance.equityHolders.reduce((sum, holder) => sum + holder.ownershipPercent, 0);
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const pass = (label: string) => console.log(`✓ ${label}`);
const money = (value: number) => (Math.abs(value) >= 1e9 ? `$${(value / 1e9).toFixed(2)}B` : `$${(value / 1e6).toFixed(0)}M`);
const actions: BoardroomOwnershipActions = { sign: () => ({ ok: true }), decline: () => undefined, callRound: () => ({ ok: true }), buyOut: () => ({ ok: true }), startBuyback: () => ({ ok: true }) };

async function main() {
    const started = performance.now();
    let player = await buildStreamingFullPlatformQa(fresh('own-shares'), { processWeek: processGameWeek, persistWeek: async next => next });
    player = { ...player, energy: { current: 100, max: 100 }, money: 20_000_000_000 };

    /* ── private: buying an investor out ── */
    const sofia = platformOf(player).finance.equityHolders.find(holder => holder.holderName === 'Sofia Laurent')!;
    assert.ok(sofia, 'the test company has Sofia Laurent on its cap table');
    const rich = withPlatform(player, platform => ({ ...platform, treasuryCash: 30_000_000_000 }));
    const quote = getStreamingBuyoutQuote(platformOf(rich), sofia.id)!;
    const worth = getStreamingEquityValuation(platformOf(rich));
    assert.ok(quote.premium >= 1.05 && quote.premium <= 1.25, 'their premium');
    assert.ok(Math.abs(quote.price - worth * sofia.ownershipPercent / 100 * quote.premium) < 1_000_000, 'our value × their stake × their premium');
    const poor = withPlatform(player, platform => ({ ...platform, treasuryCash: getStreamingTeamCashFloor(platform).amount + 1_000_000 }));
    assert.equal(getStreamingBuyoutQuote(platformOf(poor), sofia.id)!.blocked, 'It would take the treasury under the cash floor');
    const costBefore = getStreamingGovernanceWeeklyCost(platformOf(rich), 100_000_000);
    const before = platformOf(rich);
    const bought = buyOutStreamingInvestor(rich, sofia.id);
    assert.ok(bought.changed, bought.message);
    const after = platformOf(bought.player);
    assert.ok(!after.finance.equityHolders.some(holder => holder.id === sofia.id), 'their stake is retired');
    assert.ok(Math.abs(after.founderOwnershipPercent - before.founderOwnershipPercent * 100 / (100 - sofia.ownershipPercent)) < 0.01, 'your % rises');
    assert.ok(Math.abs(capTotal(after) - 100) < 0.05, 'the cap table adds up');
    assert.equal(before.treasuryCash - after.treasuryCash, quote.price);
    assert.ok(after.governance.celebrityInvestors.some(item => item.name === 'Sofia Laurent' && item.status === 'BOUGHT_OUT'));
    assert.ok(!after.governance.directors.some(item => item.status === 'ACTIVE' && item.name.startsWith('Sofia Laurent')), 'her seat ends');
    assert.ok(getStreamingGovernanceWeeklyCost(after, 100_000_000) < costBefore, 'her share of profit ends');
    assert.ok(getStreamingFinanceRoom(bought.player, 'ALL').ledger.some(entry => entry.label === 'Shares bought back' && entry.cashDelta === -quote.price), 'in the books');
    pass(`bought out Sofia Laurent's ${sofia.ownershipPercent.toFixed(2)}% for ${money(quote.price)} (${Math.round((quote.premium - 1) * 100)}% over our value): you ${before.founderOwnershipPercent.toFixed(2)}% → ${after.founderOwnershipPercent.toFixed(2)}%, her seat and profit share end, the cap table at ${capTotal(after).toFixed(2)}%`);
    /* #202: at your own price */
    const more = buyOutStreamingInvestor(rich, sofia.id, quote.price + 100_000_000);
    assert.ok(more.changed && platformOf(more.player).treasuryCash === platformOf(rich).treasuryCash - quote.price - 100_000_000, 'above their price: yes, and you pay it');
    assert.ok(!platformOf(more.player).finance.equityHolders.some(holder => holder.id === sofia.id), 'and the stake is retired');
    assert.equal(streamingBuyoutChance(quote.price, quote.price), 1);
    assert.equal(streamingBuyoutChance(quote.price * 0.75, quote.price), 0);
    const insulted = buyOutStreamingInvestor(rich, sofia.id, Math.round(quote.price * 0.7));
    assert.ok(insulted.changed && /said no/.test(insulted.message || ''), 'far under: a no');
    assert.ok(platformOf(insulted.player).finance.equityHolders.some(holder => holder.id === sofia.id), 'they still hold it');
    assert.equal(platformOf(insulted.player).treasuryCash, platformOf(rich).treasuryCash, 'and nothing was paid');
    assert.match(getStreamingBuyoutQuote(platformOf(insulted.player), sofia.id)!.blocked || '', /Said no: ask again in 13 weeks/, 'and you wait');
    pass(`your own price: over ${money(quote.price)} is a yes at what you offered; 30% under it is a no, and 13 weeks before asking again`);
    const privateHtml = text(renderToStaticMarkup(<BoardroomOwnership view={getStreamingOwnershipView(rich)} companyName="NORTHSTAR+" founderName={player.name} actions={actions} />));
    assert.ok(privateHtml.includes('Buy out for'), 'OWNERSHIP offers it on the row');

    /* ── listed ── */
    /* #189: through the listing's own commit (the old roadshow is gone) */
    const listed = listStreamingCompanyForQa(player, { ticker: 'OWNS' });
    assert.ok(listed.changed, listed.reason);
    player = { ...listed.player, money: 20_000_000_000 };
    assert.equal(getStreamingBuyoutQuote(platformOf(player), platformOf(player).finance.equityHolders.find(holder => holder.holderName === 'Aarav Kapoor')!.id)!.blocked, 'Listed: buy back shares instead');

    /* your own shares: buying from the public */
    const floatBefore = platformOf(player).finance.equityHolders.find(holder => holder.holderName === PUBLIC_FLOAT_HOLDER)!.ownershipPercent;
    const priceBefore = platformOf(player).publicCompany.quoteHistory.at(-1)!.close;
    const buy = quoteOwnShareTrade(player, 'BUY', 1)!;
    assert.ok(buy.pricePerShare > priceBefore, 'the size moves the price');
    const bought1 = tradeOwnStreamingShares(player, 'BUY', 1);
    assert.ok(bought1.changed, bought1.message);
    const owned = platformOf(bought1.player);
    assert.ok(Math.abs(owned.founderOwnershipPercent - (platformOf(player).founderOwnershipPercent + 1)) < 0.01, 'your stake grows');
    assert.ok(Math.abs(owned.finance.equityHolders.find(holder => holder.holderName === PUBLIC_FLOAT_HOLDER)!.ownershipPercent - (floatBefore - 1)) < 0.001, 'the public\'s shrinks');
    assert.equal(player.money - bought1.player.money, buy.total, 'with your own money');
    assert.ok(owned.publicCompany.quoteHistory.at(-1)!.close > priceBefore, 'the price moved up');
    assert.ok(Math.abs(capTotal(owned) - 100) < 0.05);
    pass(`bought 1% of our own company: ${buy.shares.toLocaleString()} shares at ${buy.pricePerShare.toFixed(2)} (price ${priceBefore.toFixed(2)}): ${money(buy.total)} of your own money; you ${platformOf(player).founderOwnershipPercent.toFixed(2)}% → ${owned.founderOwnershipPercent.toFixed(2)}%`);

    /* selling: after the lock-up, with a warning under 51% */
    assert.match(quoteOwnShareTrade(bought1.player, 'SELL', 1)!.blocked || '', /^Locked up for \d+ more weeks?$/);
    const unlocked = later(bought1.player, 26);
    const sell = quoteOwnShareTrade(unlocked, 'SELL', 1)!;
    assert.equal(sell.blocked, null);
    const sold = tradeOwnStreamingShares(unlocked, 'SELL', 1);
    assert.ok(sold.changed && sold.player.money - unlocked.money === sell.total, 'the money is yours');
    const edge = withPlatform(unlocked, platform => ({ ...platform, founderOwnershipPercent: 51.5,
        finance: { ...platform.finance, equityHolders: platform.finance.equityHolders.map(holder => (holder.holderName === PUBLIC_FLOAT_HOLDER ? { ...holder, ownershipPercent: holder.ownershipPercent + platform.founderOwnershipPercent - 51.5 } : holder)) } }));
    assert.match(quoteOwnShareTrade(edge, 'SELL', 1)!.warning || '', /lose control/);
    pass(`selling is locked up for 26 weeks, then ${money(sell.total)} for 1%; at 51.5% a sale warns "${quoteOwnShareTrade(edge, 'SELL', 1)!.warning}"`);

    /* ── buybacks ── */
    let company = withPlatform(player, platform => ({ ...platform, treasuryCash: 40_000_000_000 }));
    const start = startStreamingBuyback(company, 5);
    assert.ok(start.changed, start.message);
    assert.equal(startStreamingBuyback(start.player, 2).changed, false, 'one at a time');
    company = start.player;
    let platform = platformOf(company);
    const shares0 = platform.publicCompany.listing!.sharesOutstanding;
    const founder0 = platform.founderOwnershipPercent;
    const treasury0 = platform.treasuryCash;
    const snapshot = platform.weeklyHistory.at(-1)!;
    const week0 = platform.publicCompany.quoteHistory.at(-1)!.absoluteWeek + 1;
    for (let step = 0; step < 4; step += 1) platform = commitStreamingPublicMarketWeek(platform, company, { ...snapshot, absoluteWeek: week0 + step });
    const program = platform.publicCompany.buybacks!.at(-1)!;
    assert.equal(program.status, 'DONE');
    assert.ok(Math.abs(program.boughtPercent - 5) < 1e-6);
    assert.ok(Math.abs(platform.publicCompany.listing!.sharesOutstanding - shares0 * 0.95) <= 4, 'exactly 5% of the shares it started with, retired');
    assert.ok(Math.abs(platform.founderOwnershipPercent - founder0 / 0.95) < 0.02, 'every holder\'s % rises to fill the gap');
    assert.ok(Math.abs(capTotal(platform) - 100) < 0.05);
    assert.equal(treasury0 - platform.treasuryCash, program.spent, 'paid from the treasury');
    assert.ok(platform.publicCompany.quoteHistory.slice(-4).every(quote => quote.drivers.includes('The company buying back shares')));
    const after5 = { ...company, ownedStreamingPlatform: platform };
    assert.equal(startStreamingBuyback(after5, 6).message, 'Up to 5% this year.', 'within the year\'s 10%');
    pass(`a 5% buyback over 4 weeks: ${money(program.spent)} from the treasury, shares ${shares0.toLocaleString()} → ${platform.publicCompany.listing!.sharesOutstanding.toLocaleString()}, you ${founder0.toFixed(2)}% → ${platform.founderOwnershipPercent.toFixed(2)}%; 5% left this year`);

    /* held at the cash floor */
    let tight = withPlatform(start.player, next => ({ ...next, treasuryCash: getStreamingTeamCashFloor(next).amount + 1_000_000 }));
    const tightPlatform = commitStreamingPublicMarketWeek(platformOf(tight), tight, { ...snapshot, absoluteWeek: week0 });
    assert.equal(tightPlatform.publicCompany.buybacks!.at(-1)!.status, 'HELD');
    tight = { ...tight, ownedStreamingPlatform: tightPlatform };
    const listedHtml = text(renderToStaticMarkup(<BoardroomOwnership view={getStreamingOwnershipView(tight)} companyName="NORTHSTAR+" founderName={player.name} actions={actions} />));
    assert.ok(listedHtml.includes('Buy back shares') && listedHtml.includes('stopped at the cash floor'));
    pass('a buyback that would cross the cash floor is held there, and OWNERSHIP says so');

    console.log(`\nown shares audit passed in ${((performance.now() - started) / 1000).toFixed(1)}s`);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
