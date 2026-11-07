/**
 * #205: control follows shares.
 *  - Selling under 51%: the price dips, the board marks it, and it is news.
 *  - No shares and no office: you are out, the closed screen, and a new company 2 years later; never two at once.
 *  - Private, after stepping down: Sell your stake, through bankers, at your % of the value × 0.85–1.0.
 *  - Under 51% as chief executive: under 40 confidence for 13 weeks, the board moves you to chair.
 */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { collectOwnedStreamingPlatformFacts } from '../services/streamingPlatformNews';
import { listStreamingCompanyForQa } from '../services/streamingListingQa';
import { getStreamingEquityValuation } from '../services/streamingPublicMarkets';
import { OWN_SHARES_LOCKUP_WEEKS, quoteOwnShareTrade, tradeOwnStreamingShares } from '../services/streamingOwnShares';
import { getStreamingNewCompanyWait, startNewStreamingCompany } from '../services/streamingCompanySale';
import { stepDownFromStreamingCompany, streamingChiefExecutive } from '../services/streamingStepDown';
import { nameStreamingTeamSuccessor, runStreamingTeamWeek } from '../services/team/streamingTeam';
import { streamingTeamSeatHolders } from '../services/team/teamState';
import {
    STREAMING_BOARD_PATIENCE_WEEKS,
    STREAMING_LOST_CONTROL_BOARD,
    acceptStreamingStakeOffer,
    declineStreamingStakeOffer,
    getStreamingStakeView,
    hireStreamingStakeBankers,
    processStreamingStakeSaleWeek,
} from '../services/streamingControl';

const started = Date.now();
const pass = (label: string) => console.log(`✓ ${label}`);
const fresh = (id: string, name = 'Control Audit'): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name, age: 45, currentWeek: 1 });
    return { ...player, money: 2e9, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
const later = (player: Player, weeks = 1): Player => {
    const total = player.currentWeek - 1 + weeks;
    return { ...player, age: player.age + Math.floor(total / 52), currentWeek: (total % 52) + 1 };
};
const week = (player: Player) => getAbsoluteWeek(player.age, player.currentWeek);
const withPlatform = (player: Player, change: (platform: ReturnType<typeof platformOf>) => ReturnType<typeof platformOf>): Player => ({ ...player, ownedStreamingPlatform: change(platformOf(player)) });
const moneyWords = (value: number) => `$${(value / 1e6).toFixed(0)}M`;

const main = async () => {
    const base = await buildStreamingFullPlatformQa(fresh('control-audit'), { processWeek: processGameWeek, persistWeek: async next => next });
    const holder = streamingTeamSeatHolders(platformOf(base).leadership.appointments).holders.get('MONEY')!;
    const named = nameStreamingTeamSuccessor(base, 'EXECUTIVE', holder.executiveId).player;

    /* ── selling under 51% ── */
    const listed = listStreamingCompanyForQa(base, { ticker: 'CTRL' });
    assert.ok(listed.changed, listed.reason);
    const unlocked = later({ ...listed.player, money: 0 }, OWN_SHARES_LOCKUP_WEEKS + 1);
    const holding = platformOf(unlocked).founderOwnershipPercent;
    const toSell = Math.round((holding - 50) * 100) / 100;
    const quote = quoteOwnShareTrade(unlocked, 'SELL', toSell)!;
    assert.match(quote.warning || '', /lose control/, 'it warns first');
    const small = tradeOwnStreamingShares(unlocked, 'SELL', 1);
    const plain = platformOf(small.player).publicCompany.quoteHistory.at(-1)!.close;
    const sold = tradeOwnStreamingShares(unlocked, 'SELL', toSell);
    assert.ok(sold.changed, sold.message);
    const after = platformOf(sold.player);
    assert.equal(after.governance.boardConfidence, Math.max(0, platformOf(unlocked).governance.boardConfidence - STREAMING_LOST_CONTROL_BOARD), 'the board marks it');
    assert.ok(after.publicCompany.quoteHistory.at(-1)!.close < quote.priceAfter, 'the price dips past the trade itself');
    const facts = collectOwnedStreamingPlatformFacts(sold.player, week(sold.player) - 1, week(sold.player) + 1);
    assert.ok(facts.some(fact => /gives up control/.test(fact.headline)), 'it is news');
    const noCross = platformOf(small.player).governance.boardConfidence;
    assert.equal(noCross, platformOf(unlocked).governance.boardConfidence, 'a sale that stays over 51% does not');
    assert.ok(plain > 0);
    pass(`selling ${toSell}% to fall under 51%: the board −${STREAMING_LOST_CONTROL_BOARD}, the price past the trade's own $${quote.priceAfter.toFixed(2)} to $${after.publicCompany.quoteHistory.at(-1)!.close}, and the news`);

    /* ── no shares and no office ── */
    const downListed = stepDownFromStreamingCompany(nameStreamingTeamSuccessor(unlocked, 'EXECUTIVE', holder.executiveId).player, 'LEAVE_BOARD');
    assert.ok(downListed.changed, downListed.message);
    const holdingAll = platformOf(downListed.player).founderOwnershipPercent;
    const last = quoteOwnShareTrade(downListed.player, 'SELL', holdingAll)!;
    assert.match(last.warning || '', /out of the company/, 'the warning says so before the trade');
    const out = tradeOwnStreamingShares(downListed.player, 'SELL', holdingAll);
    assert.ok(out.changed, out.message);
    assert.equal(platformOf(out.player).lifecycle, 'SOLD', 'the closed screen');
    assert.ok(platformOf(out.player).governance.departure?.proceeds === last.total, 'with what the shares brought');
    assert.equal(out.player.money, downListed.player.money + last.total);
    assert.equal(getStreamingNewCompanyWait(out.player), 104, 'two years');
    assert.ok(!startNewStreamingCompany(out.player).changed, 'not yet');
    const twoYears = later(out.player, 104);
    assert.equal(getStreamingNewCompanyWait(twoYears), 0);
    const again = startNewStreamingCompany(twoYears);
    assert.ok(again.changed, again.message);
    assert.equal(platformOf(again.player).lifecycle, 'ELIGIBLE', 'a new founding');
    assert.equal(again.player.soldStreamingCompanies?.at(-1)?.buyerName, 'You sold out and left');
    /* still a chair with no shares: not out */
    const downChair = stepDownFromStreamingCompany(nameStreamingTeamSuccessor(unlocked, 'EXECUTIVE', holder.executiveId).player, 'EXECUTIVE_CHAIR');
    const chairOut = tradeOwnStreamingShares(downChair.player, 'SELL', platformOf(downChair.player).founderOwnershipPercent);
    assert.equal(platformOf(chairOut.player).lifecycle, 'ACTIVE', 'a chair with no shares still has an office');
    const leaving = stepDownFromStreamingCompany(nameStreamingTeamSuccessor(withPlatform(unlocked, platform => ({ ...platform, founderOwnershipPercent: 0 })), 'EXECUTIVE', holder.executiveId).player, 'LEAVE_BOARD');
    assert.equal(platformOf(leaving.player).lifecycle, 'SOLD', 'no shares, then leaving the board: out');
    pass(`no shares and no office: out for $${(last.total / 1e9).toFixed(2)}B, the closed screen, a new company after 104 weeks; a chair with no shares stays`);

    /* ── never two at once ── */
    assert.equal(getStreamingNewCompanyWait(base), null, 'running one: no wait to count, no second');
    assert.ok(!startNewStreamingCompany(base).changed, 'and no second');
    assert.ok(!startNewStreamingCompany(downChair.player).changed, 'a seat or shares: no');
    pass('never two services: while you hold shares or a seat, no');

    /* ── Sell your stake ── */
    assert.equal(getStreamingStakeView(named), null, 'not while you run it');
    const down = stepDownFromStreamingCompany(named, 'EXECUTIVE_CHAIR');
    assert.ok(down.changed, down.message);
    const stakeView = getStreamingStakeView(down.player)!;
    assert.equal(stakeView.status, 'IDLE');
    const percentOf = stakeView.founderPercent;
    const tired = hireStreamingStakeBankers({ ...down.player, energy: { current: 1, max: 100 } }, 10);
    assert.ok(!tired.changed && /⚡10/.test(tired.message), 'it takes energy');
    const called = hireStreamingStakeBankers(down.player, 10);
    assert.ok(called.changed, called.message);
    assert.equal(getStreamingStakeView(called.player)!.status, 'BANKERS');
    let waiting = called.player;
    for (let step = 0; step < 4; step += 1) waiting = processStreamingStakeSaleWeek(later(waiting));
    const offer = getStreamingStakeView(waiting)!;
    assert.equal(offer.status, 'OFFER');
    const worth = getStreamingEquityValuation(platformOf(waiting)) * 0.1;
    assert.ok(offer.price! >= worth * 0.84 && offer.price! <= worth * 1.01, `${moneyWords(offer.price!)} against ${moneyWords(worth)}`);
    assert.ok(offer.buyerName, 'a named buyer');
    const taken = acceptStreamingStakeOffer(waiting);
    assert.ok(taken.changed, taken.message);
    const heldAfter = platformOf(taken.player);
    assert.ok(Math.abs(heldAfter.founderOwnershipPercent - (percentOf - 10)) < 0.02, 'your % falls by what you sold');
    assert.ok(heldAfter.finance.equityHolders.some(item => item.holderName === offer.buyerName && Math.abs(item.ownershipPercent - 10) < 0.02), 'the buyer holds it');
    assert.equal(taken.player.money, waiting.money + offer.price!, 'the money is yours');
    const declined = declineStreamingStakeOffer(waiting);
    assert.equal(getStreamingStakeView(declined.player)!.status, 'WAIT', 'turning it down: a wait');
    let lapsed = waiting;
    for (let step = 0; step < 5; step += 1) lapsed = processStreamingStakeSaleWeek(later(lapsed));
    assert.equal(platformOf(lapsed).governance.stakeSale?.status, 'DECLINED', 'an offer left alone lapses');
    /* selling it all, off the board: out */
    const offBoard = stepDownFromStreamingCompany(named, 'LEAVE_BOARD');
    const allIn = hireStreamingStakeBankers(offBoard.player, 100);
    let allOffer = allIn.player;
    for (let step = 0; step < 4; step += 1) allOffer = processStreamingStakeSaleWeek(later(allOffer));
    assert.ok(getStreamingStakeView(allOffer)!.endsIt, 'it warns');
    const allGone = acceptStreamingStakeOffer(allOffer);
    assert.equal(platformOf(allGone.player).lifecycle, 'SOLD', 'out');
    pass(`Sell your stake: 10% brought ${moneyWords(offer.price!)} from ${offer.buyerName}, against ${moneyWords(worth)} of value; all of it off the board puts you out`);

    /* ── the board's patience ── */
    let shaky = withPlatform(named, platform => ({ ...platform, founderOwnershipPercent: 40, governance: { ...platform.governance, boardConfidence: 30 } }));
    let warned = false;
    let movedAfter = -1;
    for (let step = 1; step <= STREAMING_BOARD_PATIENCE_WEEKS + 2 && movedAfter < 0; step += 1) {
        shaky = runStreamingTeamWeek(later(shaky));
        shaky = withPlatform(shaky, platform => ({ ...platform, governance: { ...platform.governance, boardConfidence: 30 } }));
        if (platformOf(shaky).leadership.team!.tray.some(card => /losing patience/.test(card.title))) warned = true;
        if (platformOf(shaky).leadership.currentCeo.holderType === 'EXECUTIVE') movedAfter = step;
    }
    assert.ok(warned, 'it warns first');
    assert.ok(movedAfter > 0 && movedAfter <= STREAMING_BOARD_PATIENCE_WEEKS + 1, `moved after ${movedAfter} weeks`);
    assert.equal(platformOf(shaky).legacy.founderOfficeRole, 'EXECUTIVE_CHAIR');
    assert.equal(streamingChiefExecutive(platformOf(shaky))?.name, holder.nameAtAppointment, 'your named successor');
    const movedNews = collectOwnedStreamingPlatformFacts(shaky, week(shaky) - 2, week(shaky) + 1);
    assert.ok(movedNews.some(fact => /moves .* founder aside/.test(fact.headline)), 'it is news');
    /* at 51% or more, it cannot */
    let safe = withPlatform(named, platform => ({ ...platform, founderOwnershipPercent: 60, governance: { ...platform.governance, boardConfidence: 30 } }));
    for (let step = 0; step < STREAMING_BOARD_PATIENCE_WEEKS + 2; step += 1) {
        safe = runStreamingTeamWeek(later(safe));
        safe = withPlatform(safe, platform => ({ ...platform, governance: { ...platform.governance, boardConfidence: 30 } }));
    }
    assert.equal(platformOf(safe).leadership.currentCeo.holderType, 'FOUNDER', 'at 51% it is yours');
    /* confidence back: the count stops */
    let recovered = withPlatform(named, platform => ({ ...platform, founderOwnershipPercent: 40, governance: { ...platform.governance, boardConfidence: 30 } }));
    for (let step = 0; step < 6; step += 1) recovered = runStreamingTeamWeek(later(recovered));
    recovered = withPlatform(recovered, platform => ({ ...platform, governance: { ...platform.governance, boardConfidence: 60 } }));
    recovered = runStreamingTeamWeek(later(recovered));
    assert.equal(platformOf(recovered).governance.boardLowSinceAbsoluteWeek ?? null, null, 'it starts again');
    pass(`under 51%, at 30 confidence: warned, then moved to chair after ${movedAfter} weeks; at 60% it cannot; confidence back, the count stops`);

    console.log(`Control follows shares audit passed in ${Math.round((Date.now() - started) / 1000)} s.`);
};

main().catch(error => { console.error(error); process.exit(1); });
