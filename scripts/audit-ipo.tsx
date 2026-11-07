/** #173 (plan §21.17): the IPO in this update, on the full test company.
 *  - MARKETS before listing: the six gates with the room that clears each, "Your listing" (15/20/25% float), the bell;
 *  - Ring the bell takes 25⚡ to start a listing; a listing under way resumes for nothing; too little energy says so;
 *  - after listing: the price, your stake's value; an earnings call (10⚡) on a fresh report, once, moves the next
 *    quote; a vote cast by the founder settles it (Executive pay passed: salaries +5%); a vote left past its week is
 *    decided by the public at the weekly close and moves the next quote and the board's confidence;
 *  - a missed quarter brings no activist and no hostile bid (they come back with M&A);
 *  - MARKETS renders both ways. */
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type OwnedStreamingEarningsRecord, type OwnedStreamingShareholderVote, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import {
    STREAMING_ACTIVISM_ENABLED,
    castStreamingShareholderVote,
    commitStreamingPublicMarketWeek,
    getStreamingPublicMarkets,
    holdStreamingEarningsCall,
    startStreamingCinematicIpoJourney,
} from '../services/streamingPublicMarkets';
import { listStreamingCompanyForQa } from '../services/streamingListingQa';
import { getStreamingListingDesk } from '../services/streamingListingDesk';
import { BoardroomMarkets, type BoardroomMarketsActions } from '../components/streaming-transplant/BoardroomMarkets';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'IPO Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
const weekOf = (player: Player) => getAbsoluteWeek(player.age, player.currentWeek);
const withEnergy = (player: Player, amount: number): Player => ({
    ...player, energy: { current: amount, max: Math.max(100, amount) }, flags: { ...player.flags, weeklyBaseEnergyRemaining: amount, bonusEnergyBank: 0 },
});
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const pass = (label: string) => console.log(`✓ ${label}`);
const noop = () => ({ ok: true });
const actions: BoardroomMarketsActions = { ringBell: noop, holdCall: noop, vote: noop, promise: noop, openRoom: () => undefined };

async function main() {
    const started = performance.now();
    let player = await buildStreamingFullPlatformQa(fresh('ipo'), { processWeek: processGameWeek, persistWeek: async next => next });
    player = withEnergy(player, 100);

    /* ── before listing ── */
    const desk = getStreamingListingDesk(player);
    assert.equal(desk.listed, false);
    assert.equal(desk.gates.length, 6);
    assert.deepEqual(desk.gates.map(gate => gate.room), ['MONEY', 'TEAM', 'OWNERSHIP', 'AUDIENCE', 'STATUS', 'MONEY']);
    /* #189: MARKETS shows what 10–30% would raise; the float itself is chosen in the listing's ask */
    assert.deepEqual([desk.range.low.percent, desk.range.high.percent], [10, 30]);
    assert.ok(desk.range.low.raise > 0 && desk.range.high.raise > desk.range.low.raise && desk.range.high.keep < desk.range.low.keep && desk.range.low.keep < desk.founderPercent);
    pass(`the road to the bell: ${desk.cleared} of 6 cleared (${desk.gates.map(gate => `${gate.passed ? '✓' : '○'} ${gate.label} → ${gate.room}`).join(', ')}); selling 10–30% raises $${(desk.range.low.raise / 1e9).toFixed(1)}–${(desk.range.high.raise / 1e9).toFixed(1)}B, you keep ${desk.range.high.keep}–${desk.range.low.keep}%`);
    const before = text(renderToStaticMarkup(<BoardroomMarkets view={desk} actions={actions} />));
    for (const words of ['The road to the bell', 'MUST', 'Your listing', 'RAISES', 'YOU KEEP', 'you choose the ticker', 'Ring the bell', '⚡25', 'Money ›', 'Team ›']) assert.ok(before.includes(words), `MARKETS shows "${words}"`);
    pass('MARKETS before listing renders the rail, the plate, what a 10–30% float would raise, and the bell');

    /* ── ringing the bell ── */
    assert.ok(getStreamingPublicMarkets(player).canStartRoadshow, 'the test company can list');
    const ticker = desk.ticker;
    const tired = startStreamingCinematicIpoJourney(withEnergy(player, 10), { ticker, ask: desk.valuation, shares: 20_000_000 });
    assert.ok(!tired.changed && /25 energy/.test(tired.reason || ''));
    const rung = startStreamingCinematicIpoJourney(player, { ticker, ask: desk.valuation, shares: 20_000_000 });
    assert.ok(rung.changed);
    assert.equal(player.energy.current - rung.player.energy.current, 25);
    assert.equal(platformOf(rung.player).publicCompany.ipoJourney?.status, 'ACTIVE');
    const again = startStreamingCinematicIpoJourney(rung.player, { ticker, ask: desk.valuation, shares: 20_000_000 });
    assert.ok(!again.changed && again.player.energy.current === rung.player.energy.current, 'resuming costs nothing');
    assert.equal(getStreamingListingDesk(rung.player).resume, true);
    pass('Ring the bell: ⚡25 starts the listing (refused at 10⚡); a listing under way resumes for nothing');

    /* ── listed ── */
    /* #189: through the listing's own commit (the old roadshow is gone) */
    const listed = listStreamingCompanyForQa(player, { ticker: ticker });
    assert.ok(listed.changed, listed.reason);
    player = withEnergy(listed.player, 100);
    let after = getStreamingListingDesk(player);
    assert.ok(after.listed && after.share && after.share.stakeValue === Math.round(after.share.marketCap * after.share.stakePercent / 100));
    pass(`listed: ${after.share!.ticker} at $${after.share!.price.toFixed(2)}, worth $${(after.share!.marketCap / 1e9).toFixed(1)}B; your ${after.share!.stakePercent.toFixed(1)}% is $${(after.share!.stakeValue / 1e9).toFixed(1)}B`);

    /* ── a report and a vote ── */
    const week = weekOf(player);
    const report: OwnedStreamingEarningsRecord = {
        id: 'audit-report', cycleNumber: 9, reportedAtAbsoluteWeek: week, guidanceId: null, outcome: 'MISS', score: 80,
        subscriberActual: 1, revenueActual: 1, cashContributionActual: 1, playbackActual: 98, stockReactionPercent: -3.3, headline: 'The quarter missed its public promise.',
    };
    const pay: OwnedStreamingShareholderVote = {
        id: 'audit-pay', cycleNumber: 9, type: 'EXECUTIVE_PAY', title: 'Executive compensation resolution', summary: 'Public holders vote on executive pay.',
        status: 'OPEN', createdAtAbsoluteWeek: week, dueAtAbsoluteWeek: week + 3, institutionalSupport: 40, founderVote: null, finalSupport: null, consequence: null,
    };
    const review: OwnedStreamingShareholderVote = { ...pay, id: 'audit-review', type: 'STRATEGIC_REVIEW', title: 'Strategic performance review', institutionalSupport: 62, dueAtAbsoluteWeek: week - 1 };
    player = (() => {
        const platform = platformOf(player);
        return { ...player, ownedStreamingPlatform: { ...platform, publicCompany: { ...platform.publicCompany, earnings: [...platform.publicCompany.earnings, report], shareholderVotes: [...platform.publicCompany.shareholderVotes, pay, review] } } };
    })();

    /* the earnings call: once, on a fresh report, 10⚡ */
    const call = holdStreamingEarningsCall(player);
    assert.ok(call.changed);
    assert.equal(player.energy.current - call.player.energy.current, 10);
    const called = platformOf(call.player).publicCompany.earnings.find(item => item.id === 'audit-report')!;
    assert.ok(called.callHeldAtAbsoluteWeek === week && (called.callEffectPercent || 0) > 0);
    assert.equal(holdStreamingEarningsCall(call.player).changed, false, 'once');
    const late = { ...player, currentWeek: player.currentWeek + 3 > 52 ? player.currentWeek + 3 - 52 : player.currentWeek + 3, age: player.currentWeek + 3 > 52 ? player.age + 1 : player.age };
    assert.equal(holdStreamingEarningsCall(late).changed, false, 'too late after two weeks');
    pass(`earnings call on a miss: ⚡10, softens it by ${called.callEffectPercent}% at the next quote; once, and only within two weeks`);
    player = call.player;

    /* the founder's vote: Executive pay passes with the founder's stake; salaries +5% */
    const salaries = platformOf(player).leadership.appointments.filter(item => item.status === 'ACTIVE').map(item => item.weeklyCompensation);
    const voted = castStreamingShareholderVote(player, 'audit-pay', 'FOR');
    assert.ok(voted.changed);
    const settled = platformOf(voted.player).publicCompany.shareholderVotes.find(item => item.id === 'audit-pay')!;
    assert.equal(settled.status, platformOf(player).founderOwnershipPercent + (100 - platformOf(player).founderOwnershipPercent) * 0.4 >= 50 ? 'APPROVED' : 'REJECTED');
    assert.equal(settled.decidedBy, 'FOUNDER');
    if (settled.status === 'APPROVED') {
        const raised = platformOf(voted.player).leadership.appointments.filter(item => item.status === 'ACTIVE').map(item => item.weeklyCompensation);
        assert.ok(raised.every((value, index) => value === Math.round(salaries[index] * 1.05)));
    }
    pass(`the founder votes for Executive pay: ${settled.status.toLowerCase()} with ${settled.finalSupport}% (${settled.consequence})`);
    player = voted.player;

    /* the weekly close: the overdue review is decided by the public; results reach the quote */
    const snapshot = { ...platformOf(player).weeklyHistory.at(-1)!, absoluteWeek: week + 1 };
    const board = platformOf(player).governance.boardConfidence;
    const closed = commitStreamingPublicMarketWeek(platformOf(player), player, snapshot);
    const publicVote = closed.publicCompany.shareholderVotes.find(item => item.id === 'audit-review')!;
    assert.equal(publicVote.decidedBy, 'PUBLIC');
    assert.equal(publicVote.status, 'APPROVED', '62% of the public for');
    assert.ok(closed.governance.boardConfidence !== board);
    const quote = closed.publicCompany.quoteHistory.at(-1)!;
    assert.equal(quote.absoluteWeek, week + 1);
    assert.ok(quote.drivers.includes('The earnings call') || quote.drivers.includes('A shareholder vote'));
    assert.ok(closed.publicCompany.shareholderVotes.filter(item => item.status !== 'OPEN' && typeof item.priceEffectPercent === 'number').every(item => item.priceAppliedAtAbsoluteWeek === week + 1));
    assert.equal(closed.publicCompany.earnings.find(item => item.id === 'audit-report')!.callAppliedAtAbsoluteWeek, week + 1);
    pass(`the weekly close: "${publicVote.title}" left past its week, the public decided (${publicVote.finalSupport}%, approved); board confidence ${board} → ${closed.governance.boardConfidence}; the quote reads "${quote.drivers.join(', ')}"`);

    /* a missed quarter: no activist, no hostile bid */
    assert.equal(STREAMING_ACTIVISM_ENABLED, false);
    const reviews = platformOf(player).cycleReviews.filter(item => item.kind === 'TWELVE_WEEK_REVIEW');
    const last = reviews.at(-1)!;
    const missed = { ...last, id: 'audit-missed', cycleNumber: last.cycleNumber + 7, endAbsoluteWeek: week + 2, subscriberEnd: Math.round(last.subscriberStart * 0.5), totalSubscriptionRevenue: 1, totalCashContribution: -1_000_000_000 };
    const withMiss = { ...closed, cycleReviews: [...closed.cycleReviews, missed] };
    const missWeek = commitStreamingPublicMarketWeek(withMiss, player, { ...snapshot, absoluteWeek: week + 2 });
    const earnings = missWeek.publicCompany.earnings.at(-1)!;
    assert.equal(earnings.outcome, 'MISS');
    assert.equal(missWeek.publicCompany.activistCampaigns.filter(item => item.status === 'ACTIVE').length, closed.publicCompany.activistCampaigns.filter(item => item.status === 'ACTIVE').length);
    assert.equal(missWeek.publicCompany.hostileTakeovers.length, closed.publicCompany.hostileTakeovers.length);
    pass('a missed quarter (score ' + Math.round(earnings.score) + ') brings a report and a vote, but no activist and no hostile bid until M&A');

    /* MARKETS after listing */
    after = getStreamingListingDesk({ ...player, ownedStreamingPlatform: missWeek });
    const listedHtml = text(renderToStaticMarkup(<BoardroomMarkets view={after} actions={actions} />));
    for (const words of ['EMPIRE EXCHANGE', 'MARKET VALUE', 'YOUR STAKE', 'REPORT', 'SHAREHOLDER VOTE', 'Vote for', 'Vote against', 'the public decides', 'The next report', 'The register', 'Earlier']) assert.ok(listedHtml.includes(words), `MARKETS shows "${words}"`);
    assert.ok(!listedHtml.includes('Public markets'), '#188: the old desk is gone');
    pass('MARKETS after listing renders the quote, your stake, the report, the ballot and the last result');

    console.log(`IPO audit passed in ${Math.round((performance.now() - started) / 1000)} s.`);
}

main().catch(error => { console.error(error); process.exit(1); });
