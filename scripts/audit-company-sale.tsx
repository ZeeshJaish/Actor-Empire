/** #190 (plan §22.4, §22.7 Q4): selling the company, on the full test company.
 *  - hire the bankers (⚡10); 4 weeks later 3–5 bids at our value × 1.10–1.45, from rival platforms, media groups,
 *    tech giants and private equity, the best first;
 *  - approval: yours at 51% or more; under it the board votes; once listed the shareholders vote on the tender;
 *  - closing in 3 weeks: you are paid your stake in cash; the company is SOLD (no more weeks, no ticker, no stake);
 *  - every bid turned down, or left to lapse: the board's confidence falls and the bankers wait 26 weeks;
 *  - two years after a sale, a new company: the founding starts again, the sold one kept on record. */
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type OwnedStreamingPlatformState, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { getStreamingEquityValuation, getStreamingOwnTicker } from '../services/streamingPublicMarkets';
import { getStreamingOwnershipView } from '../services/streamingInvestorOffers';
import { processOwnedStreamingPlatformWeek } from '../services/streamingWeeklyLoop';
import { listStreamingCompanyForQa } from '../services/streamingListingQa';
import {
    STREAMING_NEW_COMPANY_WEEKS, STREAMING_SALE_COOLDOWN_WEEKS, acceptStreamingSaleBid, getStreamingSaleApproval, getStreamingSaleView,
    hireStreamingSaleBankers, makeStreamingSaleBids, processStreamingCompanySaleWeek, rejectStreamingSaleBids, startNewStreamingCompany,
} from '../services/streamingCompanySale';
import { valueOwnedStreamingPlatform } from '../services/valuation/streamingValuation';
import { BoardroomOwnership, type BoardroomOwnershipActions } from '../components/streaming-transplant/BoardroomOwnership';
import StreamingSoldScreen from '../components/StreamingSoldScreen';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Sale Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
const withPlatform = (player: Player, change: (platform: OwnedStreamingPlatformState) => OwnedStreamingPlatformState): Player => ({ ...player, ownedStreamingPlatform: change(platformOf(player)) });
const later = (player: Player, weeks: number): Player => {
    const total = player.currentWeek - 1 + weeks;
    return { ...player, age: player.age + Math.floor(total / 52), currentWeek: (total % 52) + 1 };
};
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const pass = (label: string) => console.log(`✓ ${label}`);
const money = (value: number) => (value >= 1e9 ? `$${(value / 1e9).toFixed(2)}B` : `$${(value / 1e6).toFixed(0)}M`);
const ok = () => ({ ok: true });
const actions: BoardroomOwnershipActions = { sign: ok, decline: () => undefined, callRound: ok, buyOut: ok, startBuyback: ok, hireBankers: ok, acceptBid: ok, rejectBids: ok };
const ownership = (player: Player) => text(renderToStaticMarkup(<BoardroomOwnership view={getStreamingOwnershipView(player)} companyName="NORTHSTAR+" founderName={player.name} actions={actions} sale={getStreamingSaleView(player)} />));

async function main() {
    const started = performance.now();
    let player = await buildStreamingFullPlatformQa(fresh('company-sale'), { processWeek: processGameWeek, persistWeek: async next => next });
    player = { ...player, energy: { current: 100, max: 100 }, money: 1_000_000 };
    assert.ok(ownership(player).includes('Sell the company') && ownership(player).includes('Hire bankers'), 'OWNERSHIP offers the sale');

    /* ── the bankers ── */
    assert.equal(hireStreamingSaleBankers({ ...player, energy: { current: 5, max: 100 } }).message, 'Hiring the bankers takes ⚡10.');
    const hired = hireStreamingSaleBankers(player);
    assert.ok(hired.changed, hired.message);
    assert.equal(player.energy.current - hired.player.energy.current, 10);
    assert.equal(hireStreamingSaleBankers(hired.player).changed, false, 'one sale at a time');
    assert.ok(ownership(hired.player).includes('THE BANKERS ARE CALLING BUYERS'));
    pass('the bankers: ⚡10, refused without the energy, one sale at a time');

    /* ── the bids, 4 weeks later ── */
    assert.equal(platformOf(processStreamingCompanySaleWeek(later(hired.player, 3))).governance.sale!.status, 'BANKERS', 'not before the 4 weeks');
    const bidding = processStreamingCompanySaleWeek(later(hired.player, 4));
    const sale = platformOf(bidding).governance.sale!;
    const worth = getStreamingEquityValuation(platformOf(bidding));
    const business = valueOwnedStreamingPlatform(platformOf(bidding)).enterpriseValue;
    assert.equal(sale.status, 'BIDS');
    assert.ok(sale.bids.length >= 3 && sale.bids.length <= 5, `${sale.bids.length} bids`);
    for (const bid of sale.bids) {
        /* #192: the premium is on the business; the cash comes at face */
        const onBusiness = (bid.price - (worth - business)) / business;
        assert.ok(onBusiness >= 1.1 - 0.01 && onBusiness <= 1.45 + 0.01, `premium on the business ${onBusiness.toFixed(3)}`);
        assert.ok(bid.premium > 1 && Math.abs(bid.price - worth * bid.premium) <= worth * 0.006, 'the premium shown is over our whole value');
    }
    /* cash parked in the company before a sale is bought at face: no premium on it */
    const parked = withPlatform(bidding, platform => ({ ...platform, treasuryCash: platform.treasuryCash + 1_000_000_000 }));
    const parkedBids = makeStreamingSaleBids(parked, platformOf(parked), sale, 0);
    assert.ok(Math.abs(parkedBids[0].price - sale.bids[0].price - 1_000_000_000) <= 10_000_000, `$1B more cash adds $1B, not more (${money(parkedBids[0].price - sale.bids[0].price)})`);
    assert.ok(sale.bids.every((bid, index) => index === 0 || bid.price <= sale.bids[index - 1].price), 'the best first');
    assert.ok(new Set(sale.bids.map(bid => bid.buyerKind)).size >= 3, 'from different kinds of buyer');
    const html = ownership(bidding);
    for (const words of ['over our value', 'You get', 'Accept this bid', 'Turn them all down', 'The bids stand']) assert.ok(html.includes(words), `the bids show "${words}"`);
    pass(`4 weeks later, ${sale.bids.length} bids on our value of ${money(worth)}: ${sale.bids.map(bid => `${bid.buyerName} (${bid.buyerKind.toLowerCase()}) ${money(bid.price)} ×${bid.premium}`).join(', ')}`);

    /* ── approval ── */
    const top = sale.bids[0];
    assert.deepEqual(getStreamingSaleApproval(platformOf(bidding), top), { by: 'YOURS', support: 100 });
    const minority = withPlatform(bidding, platform => ({ ...platform, founderOwnershipPercent: 40, governance: { ...platform.governance, boardConfidence: 20 } }));
    const board = getStreamingSaleApproval(platformOf(minority), { ...top, premium: 1.1 });
    assert.equal(board.by, 'BOARD');
    assert.ok(board.support < 50, 'a thin premium and an unhappy board vote it down');
    const votedDown = acceptStreamingSaleBid(withPlatform(minority, platform => ({ ...platform, governance: { ...platform.governance, sale: { ...platform.governance.sale!, bids: platform.governance.sale!.bids.map(bid => ({ ...bid, premium: 1.1 })) } } })), top.id);
    assert.match(votedDown.message, /^The board voted it down/);
    assert.equal(platformOf(votedDown.player).governance.sale!.bids.find(bid => bid.id === top.id)!.status, 'VOTED_DOWN');
    const listed = listStreamingCompanyForQa(player, { ticker: 'SELL' });
    assert.ok(listed.changed, listed.reason);
    assert.equal(getStreamingSaleApproval(platformOf(listed.player), top).by, 'SHAREHOLDERS');
    pass(`approval: yours at ${platformOf(bidding).founderOwnershipPercent.toFixed(1)}%; under 51% the board votes (${board.support}% for a thin premium: voted down); listed, the shareholders vote on the tender`);

    /* ── accept, close, be paid ── */
    const accepted = acceptStreamingSaleBid(bidding, top.id);
    assert.ok(accepted.changed, accepted.message);
    assert.equal(platformOf(accepted.player).governance.sale!.status, 'CLOSING');
    assert.ok(ownership(accepted.player).includes('CLOSING'));
    assert.equal(platformOf(processStreamingCompanySaleWeek(later(accepted.player, 2))).lifecycle, 'ACTIVE', 'not before the 3 weeks');
    const founderPercent = platformOf(accepted.player).founderOwnershipPercent;
    const sold = processStreamingCompanySaleWeek(later(accepted.player, 3));
    const soldPlatform = platformOf(sold);
    const cash = Math.round(top.price * founderPercent / 100);
    assert.equal(soldPlatform.lifecycle, 'SOLD');
    assert.equal(sold.money - accepted.player.money, cash, 'your stake, in cash');
    assert.equal(soldPlatform.founderOwnershipPercent, 0, 'no stake left: Forbes counts none');
    assert.ok(soldPlatform.finance.capitalActions.some(action => action.type === 'COMPANY_SALE' && action.personalCashDelta === cash));
    assert.equal(processOwnedStreamingPlatformWeek(later(sold, 1)).processed, false, 'no more weeks');
    assert.equal(getStreamingSaleView(sold), null);
    const soldScreen = text(renderToStaticMarkup(<StreamingSoldScreen player={sold} onBack={() => undefined} />));
    for (const words of ['SOLD', 'YOUR STAKE', 'A NEW COMPANY', `in ${STREAMING_NEW_COMPANY_WEEKS} weeks`, top.buyerName]) assert.ok(soldScreen.includes(words), `the sold screen shows "${words}"`);
    pass(`${top.buyerName} buys it for ${money(top.price)}: 3 weeks of closing, then ${money(cash)} in cash for your ${founderPercent.toFixed(1)}%; SOLD, no more weeks, no stake`);

    /* the listed company's ticker goes with it */
    const listedTop = { ...top, price: Math.round(getStreamingEquityValuation(platformOf(listed.player)) * 1.4) };
    const listedSale = withPlatform(listed.player, platform => ({ ...platform, governance: { ...platform.governance, sale: { ...sale, status: 'CLOSING', acceptedBidId: listedTop.id, closesAtAbsoluteWeek: 0, bids: [listedTop] } } }));
    assert.ok(getStreamingOwnTicker(listedSale));
    assert.equal(getStreamingOwnTicker(processStreamingCompanySaleWeek(listedSale)), null, 'no ticker once sold');
    pass('a listed company sold: its ticker leaves the Stocks app');

    /* ── turned down, or lapsed: 26 weeks ── */
    const confidence = platformOf(bidding).governance.boardConfidence;
    const turned = rejectStreamingSaleBids(bidding);
    assert.ok(turned.changed);
    assert.equal(platformOf(turned.player).governance.boardConfidence, confidence - 6);
    assert.match(hireStreamingSaleBankers(later(turned.player, 10)).message, /^After the last bids were turned down, the bankers can be called again in 16 weeks/);
    assert.ok(hireStreamingSaleBankers({ ...later(turned.player, STREAMING_SALE_COOLDOWN_WEEKS), energy: { current: 100, max: 100 } }).changed, 'again after 26 weeks');
    const lapsed = processStreamingCompanySaleWeek(later(bidding, 4));
    assert.equal(platformOf(lapsed).governance.sale!.status, 'REJECTED', 'unanswered bids lapse');
    pass(`every bid turned down: board confidence ${confidence} → ${confidence - 6}, the bankers wait 26 weeks; unanswered bids lapse after 4`);

    /* ── a new company, two years later ── */
    assert.match(startNewStreamingCompany(later(sold, 50)).message, /^A new company can be founded in 54 weeks/);
    const again = startNewStreamingCompany(later(sold, STREAMING_NEW_COMPANY_WEEKS));
    assert.ok(again.changed, again.message);
    assert.equal(platformOf(again.player).lifecycle, 'ELIGIBLE');
    assert.equal(again.player.soldStreamingCompanies!.at(-1)!.buyerName, top.buyerName);
    assert.equal(migratePlayerSave(structuredClone(again.player)).soldStreamingCompanies?.length, 1, 'kept through a save');
    pass(`two years after the sale the founding starts again (ELIGIBLE), ${again.player.soldStreamingCompanies!.at(-1)!.name} kept on record`);

    console.log(`\ncompany sale audit passed in ${((performance.now() - started) / 1000).toFixed(1)}s`);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
