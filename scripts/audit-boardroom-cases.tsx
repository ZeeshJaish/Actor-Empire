/** #174 (plan §21.17): the Boardroom in every case, mounted as the HQ mounts it (the same services, the same props).
 *  - Before launch (the company founded, the network being built): the team waits for launch: no action, no card,
 *    no investor's call; every tab renders, TEAM saying the team starts on Opening Night, MONEY waiting for the
 *    launch, MARKETS with the bell locked;
 *  - private (the full test company): every tab renders, MONEY with the board review;
 *  - public (the same company listed): every tab renders, OWNERSHIP with the public's shares (one row, the float it
 *    bought) and no private term sheet (none stands, none can be signed), MARKETS with the quote. In every case the cap
 *    table adds up to 100%.
 *  Each tab: its own heading, and no "undefined", "NaN", "Infinity" or "[object Object]" where a word or number goes. */
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import {
    buildStreamingFullPlatformQa,
    commissionStreamingFullPlatformQa,
    prepareStreamingFullPlatformQa,
} from '../services/streamingFullPlatformQa';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import {
    STREAMING_PERFORMANCE_TIER_LABELS,
    STREAMING_STRATEGIC_IDENTITY_LABELS,
    getStreamingQuarterSeasonCycle,
} from '../services/streamingQuarterSeason';
import { getStreamingTeamView, runStreamingTeamWeek } from '../services/team/streamingTeam';
import { callStreamingInvestorRound, getStreamingOwnershipView, processStreamingInvestorRoundsWeek } from '../services/streamingInvestorOffers';
import { acceptStreamingCelebrityInvestment } from '../services/streamingLeadershipGovernance';
import { getStreamingListingDesk } from '../services/streamingListingDesk';
import { getStreamingPublicMarkets } from '../services/streamingPublicMarkets';
import { listStreamingCompanyForQa } from '../services/streamingListingQa';
import type { Brand } from '../components/streaming-transplant/StreamingBrandVisuals';
import { Boardroom, type BoardroomTab } from '../components/streaming-transplant/StreamingBoardroomExperience';
import type { BoardroomTeamActions } from '../components/streaming-transplant/BoardroomTeam';
import { createCanonicalBoardroomState } from '../components/streaming-transplant/createCanonicalStreamingPresentation';

const brand: Brand = {
    name: 'NORTHSTAR+', markId: 'NONE', customMark: null, hue: 212, sat: 72, identId: 'NONE', customIdent: null, promiseId: 'NONE',
    publicManifesto: '', layoutId: 'cinema', typeId: 'GROTESK', accentHue: 30, identMode: 'none', identLen: 2, ratingId: 'ALL',
    lockupId: 'WORDMARK', serverCity: null,
} as Brand;
const noop = () => undefined;
const ok = () => ({ ok: true });
const teamActions: BoardroomTeamActions = {
    setMode: noop, setLimits: noop, hire: ok, train: ok, dismiss: noop, approve: ok, decline: noop, change: noop, nameSuccessor: noop,
};
const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Boardroom Cases', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const pass = (label: string) => console.log(`✓ ${label}`);

/** the board review as the HQ reads it */
const reviewOf = (player: Player) => {
    const cycle = getStreamingQuarterSeasonCycle(player);
    const latest = cycle.seasonReviews.at(-1) || null;
    return {
        weeksUntilNext: cycle.weeksUntilSeasonReview,
        latest: latest ? {
            quarter: latest.cycleNumber,
            tier: STREAMING_PERFORMANCE_TIER_LABELS[latest.performanceTier],
            identity: STREAMING_STRATEGIC_IDENTITY_LABELS[latest.strategicIdentity],
            headline: latest.headline,
            verdict: latest.boardVerdict,
            hits: latest.hits,
            misses: latest.misses,
            subscribersNet: latest.subscriberNetMovement,
            revenue: latest.totalSubscriptionRevenue,
            cash: latest.totalCashContribution,
        } : null,
    };
};

const TABS: BoardroomTab[] = ['MONEY', 'TABLE', 'OWNERSHIP', 'MARKETS', 'DEALS'];
const render = (player: Player, tab: BoardroomTab) => text(renderToStaticMarkup(
    <Boardroom brand={brand} founderName={player.name} state={createCanonicalBoardroomState(player)} initialTab={tab} onBack={noop}
        onIssueEquity={noop} onFileIpo={noop} onOpenFinance={noop} onOpenOwnership={noop}
        mnaComingSoon boardReview={reviewOf(player)}
        team={getStreamingTeamView(player)} teamActions={teamActions}
        ownership={getStreamingOwnershipView(player)}
        ownershipActions={{ sign: ok, decline: noop, callRound: ok, buyOut: ok, startBuyback: ok }}
        listingDesk={getStreamingListingDesk(player)}
        listingActions={{ ringBell: ok, holdCall: ok, vote: ok, promise: ok, openRoom: noop }} />,
));

/** the cap table adds up: the founder, the investors and, once listed, the public */
const capTable = (label: string, player: Player) => {
    const holders = getStreamingOwnershipView(player).holders;
    const total = holders.reduce((sum, holder) => sum + holder.percent, 0);
    assert.ok(Math.abs(total - 100) < 0.5, `${label}: the cap table adds up to 100% (${total.toFixed(1)}%)`);
    return holders;
};

/** every tab renders, with its own heading and nothing broken in it */
const everyTab = (label: string, player: Player, words: Partial<Record<BoardroomTab, RegExp[]>>) => {
    const pages = Object.fromEntries(TABS.map(tab => [tab, render(player, tab)])) as Record<BoardroomTab, string>;
    const common: Record<BoardroomTab, RegExp[]> = {
        MONEY: [/TREASURY/],
        TABLE: [/Your team \d of 6 chairs filled/, /YOU · CHAIR/, /Cash floor · \d+ weeks of costs/],
        OWNERSHIP: [/Who owns NORTHSTAR\+/],
        MARKETS: [],
        DEALS: [/COMING IN A FUTURE UPDATE/],
    };
    TABS.forEach(tab => {
        const page = pages[tab];
        [...common[tab], ...(words[tab] || [])].forEach(pattern => assert.match(page, pattern, `${label} › ${tab} shows ${pattern}`));
        for (const broken of [/\bundefined\b/, /\bNaN\b/, /\bInfinity\b/, /\[object Object\]/]) {
            assert.doesNotMatch(page, broken, `${label} › ${tab}: nothing reads ${broken}`);
        }
    });
    return pages;
};

async function main() {
    const started = performance.now();

    /* ── before launch: founded, the network being built, no Opening Night yet ── */
    let pre = commissionStreamingFullPlatformQa(prepareStreamingFullPlatformQa(fresh('cases-pre')));
    assert.equal(platformOf(pre).lifecycle, 'FOUNDING');
    assert.ok(!platformOf(pre).launchCommit, 'not launched');
    assert.equal(runStreamingTeamWeek(pre), pre, 'the team waits for launch');
    for (let index = 0; index < 2; index += 1) pre = (await processGameWeek(pre)).player;
    const preTeam = platformOf(pre).leadership.team;
    assert.ok(!preTeam || (preTeam.report.length === 0 && preTeam.tray.length === 0), 'two weeks of building: no action, no card');
    assert.equal((platformOf(pre).governance.investorOffers || []).length, 0, 'no investor calls before launch');
    const prePages = everyTab('before launch', pre, {
        MONEY: [/waiting for its launch/],
        TABLE: [/Before launch · Your team starts work on Opening Night\. Until then no one acts or asks\./],
        MARKETS: [/The road to the bell/, /Clear \d+ more steps? first/],
    });
    assert.doesNotMatch(prePages.MARKETS, /EMPIRE EXCHANGE · LISTED|MARKET VALUE/);
    capTable('before launch', pre);
    const preDesk = getStreamingListingDesk(pre);
    pass(`before launch: the team waited two weeks (no action, no card, no investor's call); MONEY, TEAM (${getStreamingTeamView(pre).totals.filled} of 6 chairs), OWNERSHIP, MARKETS (${preDesk.cleared} of 6 steps, the bell locked), M&A render`);

    /* ── private: the full test company ── */
    const player = await buildStreamingFullPlatformQa(fresh('cases'), { processWeek: processGameWeek, persistWeek: async next => next });
    assert.equal(platformOf(player).publicCompany.lifecycle === 'PUBLIC', false);
    const privatePages = everyTab('private', player, {
        MONEY: [/Board review/],
        MARKETS: [/The road to the bell/, /Your listing/, /RAISES/],
    });
    assert.doesNotMatch(privatePages.TABLE, /Before launch/, 'a live service has no before-launch line');
    capTable('private', player);
    pass(`private: MONEY, TEAM (${getStreamingTeamView(player).totals.filled} of 6 chairs), OWNERSHIP, MARKETS (${getStreamingListingDesk(player).cleared} of 6 steps), M&A render`);

    /* ── public: the same company listed ── */
    const ticker = getStreamingPublicMarkets(player).suggestedTicker;
    /* #189: through the listing's own commit (the old roadshow is gone) */
    const listed = listStreamingCompanyForQa(player, { ticker: ticker });
    assert.ok(listed.changed, listed.reason);
    const pub = (await processGameWeek(listed.player)).player;
    assert.equal(platformOf(pub).publicCompany.lifecycle, 'PUBLIC');
    const pubPages = everyTab('public', pub, {
        MONEY: [/Board review/],
        OWNERSHIP: [/Public shareholders/],
        MARKETS: [/EMPIRE EXCHANGE/, /MARKET VALUE/, /YOUR STAKE/],
    });
    assert.doesNotMatch(pubPages.MARKETS, /The road to the bell/);
    /* the shares the listing sold are the public's: one row, the float it bought, never an investor called "float" */
    const publicRows = capTable('public', pub).filter(holder => holder.kind === 'PUBLIC');
    assert.equal(publicRows.length, 1, 'one row for the public');
    assert.ok(Math.abs(publicRows[0].percent - 20) < 0.5, `the public holds the 20% it bought (${publicRows[0].percent}%)`);
    assert.doesNotMatch(pubPages.OWNERSHIP, /Public shareholder float/);
    /* after the bell no private term sheet stands or can be signed: new money comes from the market */
    /* #186: a round's offers on the table of the private company (called, three weeks later) */
    const offered = (() => {
        const called = callStreamingInvestorRound({ ...player, energy: { current: 100, max: 100 } }, 'SMALL');
        assert.ok(called.changed, called.message);
        const total = called.player.currentWeek - 1 + 3;
        return processStreamingInvestorRoundsWeek({ ...called.player, age: called.player.age + Math.floor(total / 52), currentWeek: (total % 52) + 1 });
    })();
    const standing = getStreamingOwnershipView(offered).offers;
    assert.ok(standing.length > 0, 'the private company had a term sheet on the table');
    assert.equal(getStreamingOwnershipView(pub).offers.length, 0, 'none after listing');
    assert.match(pubPages.OWNERSHIP, /You are listed: new money comes from the market, not term sheets\./);
    assert.equal(acceptStreamingCelebrityInvestment(pub, standing[0].id).changed, false, 'and it cannot be signed');
    const desk = getStreamingListingDesk(pub);
    pass(`public: ${desk.share!.ticker} at $${desk.share!.price.toFixed(2)}; MONEY, TEAM, OWNERSHIP (the public holds ${getStreamingOwnershipView(pub).holders.find(holder => holder.kind === 'PUBLIC')!.percent.toFixed(1)}%), MARKETS (the quote and your stake), M&A render`);

    console.log(`Boardroom cases audit passed in ${Math.round((performance.now() - started) / 1000)} s.`);
}

main().catch(error => { console.error(error); process.exit(1); });
