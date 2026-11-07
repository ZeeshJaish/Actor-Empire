/** #188 (plan §22.3 point 12): MARKETS is the one home for the stock, on the full test company.
 *  - Ring the bell starts the listing (25⚡) or resumes the one under way for nothing, from MARKETS;
 *  - the promise for the next report: three kinds, each showing the numbers it would set (the same the promise then
 *    sets), made on MARKETS; once made, its four targets and who set it;
 *  - the earlier reports and votes, newest first, folded under EARLIER (the latest keep their own card and line);
 *  - the register: you, investors and the team, and the public, adding up to the shares, following your own trades;
 *  - what a share is worth (the engine's value per share) on the line;
 *  - the old Public markets desk is gone: the HQ's chip and every door open MARKETS. */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type OwnedStreamingEarningsRecord, type OwnedStreamingPlatformState, type OwnedStreamingShareholderVote, type Player, type StreamingGuidanceTone } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { getStreamingEquityValuation, getStreamingPublicMarkets, issueStreamingPublicGuidance, previewStreamingGuidance } from '../services/streamingPublicMarkets';
import { listStreamingCompanyForQa } from '../services/streamingListingQa';
import { getStreamingListingDesk } from '../services/streamingListingDesk';
import { tradeOwnStreamingShares } from '../services/streamingOwnShares';
import { BoardroomMarkets, type BoardroomMarketsActions } from '../components/streaming-transplant/BoardroomMarkets';
import { beginStreamingListing } from '../components/StreamingListingHost';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Markets Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
const withPlatform = (player: Player, change: (platform: OwnedStreamingPlatformState) => OwnedStreamingPlatformState): Player => ({ ...player, ownedStreamingPlatform: change(platformOf(player)) });
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const pass = (label: string) => console.log(`✓ ${label}`);
const ok = () => ({ ok: true });
const actions: BoardroomMarketsActions = { ringBell: ok, holdCall: ok, vote: ok, promise: ok, openRoom: () => undefined };
const render = (player: Player) => text(renderToStaticMarkup(<BoardroomMarkets view={getStreamingListingDesk(player)} actions={actions} />));

async function main() {
    const started = performance.now();
    let player = await buildStreamingFullPlatformQa(fresh('markets-home'), { processWeek: processGameWeek, persistWeek: async next => next });
    player = { ...player, energy: { current: 100, max: 100 }, money: 20_000_000_000 };
    assert.ok(getStreamingPublicMarkets(player).canStartRoadshow, 'the test company can list');

    /* ── Ring the bell: from MARKETS, straight into the listing ── */
    const bell = beginStreamingListing(player);
    assert.ok(bell.ok, bell.message);
    assert.equal(player.energy.current - bell.player.energy.current, 25);
    assert.equal(platformOf(bell.player).publicCompany.ipoJourney?.status, 'ACTIVE');
    const again = beginStreamingListing(bell.player);
    assert.ok(again.ok && again.player === bell.player, 'a listing under way resumes for nothing');
    const tired = beginStreamingListing({ ...player, energy: { current: 10, max: 100 } });
    assert.equal(tired.ok, false);
    assert.equal(tired.message, 'Ringing the bell takes 25 energy.');
    pass('Ring the bell starts the listing for ⚡25, resumes it for nothing, and says why not without the energy');

    /* ── listed ── */
    /* #189: through the listing's own commit (the old roadshow is gone) */
    const listed = listStreamingCompanyForQa(player, { ticker: 'MKTS' });
    assert.ok(listed.changed, listed.reason);
    player = { ...listed.player, money: 20_000_000_000, energy: { current: 100, max: 100 } };

    /* what a share is worth, on the line */
    let desk = getStreamingListingDesk(player);
    const platform = platformOf(player);
    assert.ok(Math.abs(desk.share!.valuePerShare - getStreamingEquityValuation(platform) / platform.publicCompany.listing!.sharesOutstanding) < 1e-6);
    let html = render(player);
    assert.ok(html.includes(`a share is worth $${desk.share!.valuePerShare.toFixed(2)}`), 'the line names the value');
    assert.ok(!html.includes('Public markets'), 'no door to the old desk');

    /* ── the promise: three kinds, each with the numbers it would set ── */
    assert.equal(desk.guidance, null);
    assert.deepEqual(desk.guidanceOptions.map(option => option.tone), ['CONSERVATIVE', 'BALANCED', 'AMBITIOUS']);
    for (const option of desk.guidanceOptions) {
        const preview = previewStreamingGuidance(platform, option.tone);
        assert.equal(option.subscriberTarget, preview.subscriberTarget);
        assert.equal(option.revenueTarget, preview.revenueTarget);
    }
    assert.ok(desk.guidanceOptions[0].subscriberTarget < desk.guidanceOptions[1].subscriberTarget && desk.guidanceOptions[1].subscriberTarget < desk.guidanceOptions[2].subscriberTarget);
    for (const words of ['The next report', 'Choose a promise', 'Conservative', 'Balanced', 'Ambitious', 'members', 'plan revenue']) assert.ok(html.includes(words), `MARKETS shows "${words}"`);
    const tone: StreamingGuidanceTone = 'BALANCED';
    const promised = issueStreamingPublicGuidance(player, tone);
    assert.ok(promised.changed, promised.reason);
    const made = getStreamingListingDesk(promised.player);
    assert.equal(made.guidance!.tone, tone);
    assert.equal(made.guidance!.subscriberTarget, desk.guidanceOptions[1].subscriberTarget, 'the promise sets what its tile showed');
    assert.equal(made.guidance!.revenueTarget, desk.guidanceOptions[1].revenueTarget);
    assert.equal(made.guidanceOptions.length, 0);
    assert.equal(issueStreamingPublicGuidance(promised.player, 'AMBITIOUS').changed, false, 'one promise a report');
    const madeHtml = render(promised.player);
    for (const words of ['YOUR PROMISE · BALANCED', 'MEMBERS', 'PLAN REVENUE', 'NET CASH', 'PLAYBACK', 'Set by you']) assert.ok(madeHtml.includes(words), `the promise shows "${words}"`);
    pass(`the promise: Conservative ${(desk.guidanceOptions[0].subscriberTarget / 1e6).toFixed(2)}M / Balanced ${(desk.guidanceOptions[1].subscriberTarget / 1e6).toFixed(2)}M / Ambitious ${(desk.guidanceOptions[2].subscriberTarget / 1e6).toFixed(2)}M members; Balanced made on MARKETS sets exactly what its tile showed; the report ${made.nextReportInWeeks} weeks away`);
    player = promised.player;

    /* ── the register ── */
    const registerOf = (next: Player) => getStreamingListingDesk(next).register!;
    let register = registerOf(player);
    const sharesNow = platformOf(player).publicCompany.listing!.sharesOutstanding;
    const othersShares = sharesNow - register.founderShares - register.publicShares;
    assert.equal(register.sharesOutstanding, sharesNow);
    assert.ok(othersShares >= 0 && Math.abs(othersShares / sharesNow * 100 - register.othersPercent) < 0.1, 'the three parts add up');
    assert.equal(register.publicPercent, Math.round(platformOf(player).finance.equityHolders.find(holder => holder.holderName === 'Public shareholder float')!.ownershipPercent * 10) / 10);
    const trade = tradeOwnStreamingShares(player, 'BUY', 1);
    assert.ok(trade.changed, trade.message);
    const after = registerOf(trade.player);
    assert.ok(Math.abs(after.publicPercent - (register.publicPercent - 1)) < 0.06 && after.founderShares - register.founderShares === Math.round(sharesNow / 100), 'your 1% moves from the public to you');
    assert.equal(platformOf(player).publicCompany.listing!.publicShares - platformOf(trade.player).publicCompany.listing!.publicShares, Math.round(sharesNow / 100), "the listing's public shares follow the trade");
    html = render(player);
    for (const words of ['The register', 'You', 'Investors and the team', 'The public', 'Buy back shares · Ownership', 'Stocks app']) assert.ok(html.includes(words), `the register shows "${words}"`);
    pass(`the register: ${(sharesNow / 1e6).toFixed(1)}M shares, you ${(register.founderShares / 1e6).toFixed(1)}M, investors and the team ${(othersShares / 1e6).toFixed(1)}M, the public ${(register.publicShares / 1e6).toFixed(1)}M (${register.publicPercent}%); your 1% bought moves the public to ${after.publicPercent}%`);

    /* ── earlier reports and votes ── */
    const week = getAbsoluteWeek(player.age, player.currentWeek);
    const report = (cycle: number, outcome: OwnedStreamingEarningsRecord['outcome'], move: number): OwnedStreamingEarningsRecord => ({
        id: `audit-report-${cycle}`, cycleNumber: cycle, reportedAtAbsoluteWeek: week - (4 - cycle) * 12, guidanceId: null, outcome, score: 70,
        subscriberActual: 1, revenueActual: 1, cashContributionActual: 1, playbackActual: 99, stockReactionPercent: move, headline: `Quarter ${cycle} ${outcome.toLowerCase()}.`,
    });
    const vote = (cycle: number, status: OwnedStreamingShareholderVote['status']): OwnedStreamingShareholderVote => ({
        id: `audit-vote-${cycle}`, cycleNumber: cycle, type: 'EXECUTIVE_PAY', title: `Executive pay ${cycle}`, summary: 'Public holders vote on executive pay.',
        status, createdAtAbsoluteWeek: week - (4 - cycle) * 12, dueAtAbsoluteWeek: week - (4 - cycle) * 12 + 3, institutionalSupport: 55, founderVote: 'FOR', finalSupport: 61, consequence: null,
    });
    const storied = withPlatform(player, next => ({ ...next, publicCompany: { ...next.publicCompany,
        earnings: [...next.publicCompany.earnings, report(1, 'BEAT', 4.2), report(2, 'MISS', -6.1), report(3, 'MIXED', 0.4)],
        shareholderVotes: [...next.publicCompany.shareholderVotes, vote(1, 'APPROVED'), vote(2, 'REJECTED'), vote(3, 'APPROVED')] } }));
    desk = getStreamingListingDesk(storied);
    assert.equal(desk.report!.cycleNumber, 3, 'the latest keeps its card');
    assert.deepEqual(desk.history.map(item => item.cycleNumber), [2, 1], 'the earlier ones, newest first');
    assert.equal(desk.lastVote!.title, 'Executive pay 3');
    assert.deepEqual(desk.pastVotes.map(item => `${item.title} ${item.passed ? 'passed' : 'failed'}`), ['Executive pay 2 failed', 'Executive pay 1 passed']);
    const storiedHtml = render(storied);
    assert.ok(storiedHtml.includes('Earlier') && storiedHtml.includes('2 reports · 2 votes'), 'folded under EARLIER');
    assert.ok(!storiedHtml.includes('Quarter 2 miss.'), 'folded until opened');
    pass('earlier reports and votes: the latest keep their card and line, the rest fold under "Earlier · 2 reports · 2 votes", newest first');

    /* ── the old desk is gone; every door opens MARKETS ── */
    const hq = readFileSync(resolve(process.cwd(), 'components/StreamingPlatformHQ.tsx'), 'utf8');
    assert.ok(!existsSync(resolve(process.cwd(), 'components/StreamingPublicMarkets.tsx')) && !existsSync(resolve(process.cwd(), 'styles/streaming-public-markets.css')));
    assert.ok(!hq.includes('StreamingPublicMarkets') && !hq.includes('setShowPublicMarkets'));
    for (const door of ["if (chip === 'MARKETS') return openBoardroom('MARKETS')", "if (room === 'IPO') return openBoardroom('MARKETS')", "onFileIpo={() => openBoardroom('MARKETS')}", "{ id: 'MARKETS', label: 'MARKETS' }"]) assert.ok(hq.includes(door), door);
    pass("the Public markets desk is gone: the HQ's MARKETS chip, the IPO card and Studio Finance's doors open MARKETS; Ring the bell opens the listing");

    console.log(`\nmarkets home audit passed in ${((performance.now() - started) / 1000).toFixed(1)}s`);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
