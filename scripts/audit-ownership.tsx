/** #172 → #186 (plan §22.4): OWNERSHIP and raising money, on the full test company.
 *  - a round the founder calls: ⚡5 / ⚡8 / ⚡10 for up to 5 / 10 / 20%; it needs a CFO; not once listed; one at a time;
 *    the next 13 weeks after the last; never under 51%; the founding offers no longer stand;
 *  - 3 weeks later 2–6 offers from the industry's investors, as many as our standing earns (growth, cash, reputation,
 *    playback, readiness), priced off the valuation engine × the investor's own factor, harsher on weak numbers; each
 *    stands 6 weeks;
 *  - signing issues new shares: every holder diluted, the founder included, the cap table still 100%; several within the
 *    round, up to its size; declining records it; a lapsed sheet cannot be signed;
 *  - the CFO brings the offers, and proposes a round when the runway is short;
 *  - OWNERSHIP renders Raise money (the five checks, the three rounds), the bankers' card and the term sheets. */
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type OwnedStreamingCelebrityInvestor, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import {
    callStreamingInvestorRound,
    getStreamingOpenInvestorOffers,
    getStreamingOwnershipView,
    getStreamingRoundStanding,
    processStreamingInvestorRoundsWeek,
    roomAboveControl,
} from '../services/streamingInvestorOffers';
import { STREAMING_CELEBRITY_INVESTOR_OFFERS, acceptStreamingCelebrityInvestment, declineStreamingCelebrityInvestment, getStreamingGovernanceWeeklyCost } from '../services/streamingLeadershipGovernance';
import { getStreamingEquityValuation } from '../services/streamingPublicMarkets';
import { getStreamingFinanceRoom } from '../services/streamingFinanceRoom';
import { getIndustryPeople } from '../services/industry/industryPeople';
import { streamingTeamSeatHolders } from '../services/team/teamState';
import { runInvestorOffers } from '../services/team/teamMoney';
import { BoardroomOwnership, type BoardroomOwnershipActions } from '../components/streaming-transplant/BoardroomOwnership';
import type { StreamingTeamJobContext } from '../services/team/teamJobs';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Owner Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
const weekOf = (player: Player) => getAbsoluteWeek(player.age, player.currentWeek);
const withEnergy = (player: Player, amount = 100): Player => ({ ...player, energy: { current: amount, max: Math.max(100, amount) }, flags: { ...player.flags, weeklyBaseEnergyRemaining: amount, bonusEnergyBank: 0 } });
const later = (player: Player, weeks: number): Player => {
    const total = player.currentWeek - 1 + weeks;
    return { ...player, age: player.age + Math.floor(total / 52), currentWeek: (total % 52) + 1 };
};
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const pass = (label: string) => console.log(`✓ ${label}`);
const money = (value: number) => `$${(value / 1e6).toFixed(0)}M`;
const actions: BoardroomOwnershipActions = { sign: () => ({ ok: true }), decline: () => undefined, callRound: () => ({ ok: true }), buyOut: () => ({ ok: true }), startBuyback: () => ({ ok: true }) };

async function main() {
    const started = performance.now();
    let player = withEnergy(await buildStreamingFullPlatformQa(fresh('ownership'), { processWeek: processGameWeek, persistWeek: async next => next }));
    const base = player;

    /* ── no one calls on their own; the founding offers no longer stand ── */
    const founding = new Set(STREAMING_CELEBRITY_INVESTOR_OFFERS.map(item => item.id));
    assert.ok(!getStreamingOpenInvestorOffers(platformOf(player), weekOf(player)).some(item => founding.has(item.id)), 'the founding offers no longer stand');
    assert.equal(acceptStreamingCelebrityInvestment(player, 'investor-dante-cole').reason, 'NOT_FOUND', 'and cannot be signed');
    const quiet = processStreamingInvestorRoundsWeek(later(player, 1));
    assert.equal((platformOf(quiet).governance.investorOffers || []).length, (platformOf(player).governance.investorOffers || []).length, 'no investor calls on their own');
    pass('the founding offers no longer stand and no one calls on their own: rounds are called');

    /* ── calling a round ── */
    const noCfo: Player = (() => {
        const platform = platformOf(player);
        return { ...player, ownedStreamingPlatform: { ...platform, leadership: { ...platform.leadership, appointments: platform.leadership.appointments.filter(item => item.role !== 'CFO') } } };
    })();
    assert.equal(callStreamingInvestorRound(noCfo, 'GROWTH').reason, 'CFO');
    assert.equal(callStreamingInvestorRound(withEnergy(player, 5), 'GROWTH').reason, 'ENERGY');
    const listedPlayer: Player = { ...player, ownedStreamingPlatform: { ...platformOf(player), publicCompany: { ...platformOf(player).publicCompany, lifecycle: 'PUBLIC' } } };
    assert.equal(callStreamingInvestorRound(listedPlayer, 'GROWTH').reason, 'LISTED');
    /* #202: a round of your own size: its band sets the energy */
    for (const [ask, energy] of [[3, 5], [5, 5], [7.5, 8], [10, 8], [15, 10]] as const) {
        const tried = callStreamingInvestorRound(player, ask);
        assert.ok(tried.changed, tried.message);
        assert.equal(player.energy.current - tried.player.energy.current, energy, `${ask}%: ⚡${energy}`);
        assert.equal(platformOf(tried.player).governance.investorRound?.upToPercent, Math.min(ask, 100 - 51 / (platformOf(player).founderOwnershipPercent / 100)) === ask ? ask : platformOf(tried.player).governance.investorRound?.upToPercent, 'the size you chose');
    }
    const tooBig = callStreamingInvestorRound(player, 50);
    assert.ok(tooBig.changed && platformOf(tooBig.player).governance.investorRound!.upToPercent <= 20, 'never over 20%');
    const tiny = callStreamingInvestorRound(player, 0.2);
    assert.ok(tiny.changed && platformOf(tiny.player).governance.investorRound!.upToPercent >= 1, 'never under 1%');
    const called = callStreamingInvestorRound(player, 'GROWTH');
    assert.ok(called.changed, called.message);
    assert.equal(player.energy.current - called.player.energy.current, 8, '⚡8');
    const round = platformOf(called.player).governance.investorRound!;
    assert.equal(round.offersAtAbsoluteWeek, weekOf(player) + 3);
    assert.equal(round.upToPercent, Math.min(10, roomAboveControl(platformOf(player).founderOwnershipPercent)));
    assert.equal(callStreamingInvestorRound(withEnergy(called.player), 'SMALL').reason, 'RUNNING', 'one at a time');
    player = called.player;
    pass(`a growth round called: ⚡8, up to ${round.upToPercent}%, offers in 3 weeks; refused without a CFO, without the energy, once listed, or with one under way`);

    /* ── the offers, three weeks later ── */
    const early = processStreamingInvestorRoundsWeek(later(player, 2));
    assert.equal(getStreamingOpenInvestorOffers(platformOf(early), weekOf(early)).length, 0, 'none before the third week');
    player = withEnergy(processStreamingInvestorRoundsWeek(later(player, 3)));
    const standing = getStreamingRoundStanding(platformOf(player));
    const offers = getStreamingOpenInvestorOffers(platformOf(player), weekOf(player));
    assert.equal(offers.length, 2 + Math.round(4 * standing.score / 5), `as many offers as the standing earns (${standing.score} of 5)`);
    const investors = new Set(getIndustryPeople(player).filter(person => person.kind === 'INVESTOR').map(person => person.name));
    const worth = getStreamingEquityValuation(platformOf(player));
    offers.forEach(offer => {
        assert.ok(investors.has(offer.name), `${offer.name} is one of the industry's investors`);
        assert.equal(offer.roundId, round.id);
        assert.equal(offer.expiresAtAbsoluteWeek, weekOf(player) + 6, 'stands 6 weeks');
        assert.ok(offer.ownershipPercent <= round.upToPercent && offer.ownershipPercent >= 1);
        const implied = offer.investedCapital / (offer.ownershipPercent / 100);
        assert.ok(implied > worth * 0.6 && implied < worth * 1.1, `${offer.name} prices us near our worth (${money(implied)} vs ${money(worth)})`);
    });
    pass(`3 weeks later: ${offers.length} offers (standing ${standing.score}/5: ${standing.checks.map(check => `${check.passed ? '✓' : '✗'} ${check.label}`).join(', ')}): ${offers.map(offer => `${offer.name} ${money(offer.investedCapital)} for ${offer.ownershipPercent}%`).join('; ')}`);

    /* weak numbers: fewer offers, and harsher */
    const weak: Player = (() => {
        const platform = platformOf(called.player);
        const history = platform.weeklyHistory.map((item, index, all) => ({ ...item, subscribers: Math.round(item.subscribers * (1 + (all.length - index) * 0.01)),
            operations: item.operations ? { ...item.operations, netCashContribution: -50_000_000, playbackSuccessRate: 95 } : item.operations }));
        return { ...called.player, ownedStreamingPlatform: { ...platform, weeklyHistory: history,
            competitiveWorld: { ...platform.competitiveWorld, globalPrestige: 10 }, crisisSecurity: { ...platform.crisisSecurity, publicTrust: 40 } } };
    })();
    const weakStanding = getStreamingRoundStanding(platformOf(weak));
    const weakOffers = getStreamingOpenInvestorOffers(platformOf(processStreamingInvestorRoundsWeek(later(weak, 3))), weekOf(later(weak, 3)));
    assert.ok(weakStanding.score < standing.score && weakOffers.length < offers.length, `weak numbers, fewer offers (${weakOffers.length} at ${weakStanding.score}/5)`);
    const same = weakOffers.find(item => offers.some(offer => offer.name === item.name));
    if (same) {
        const strong = offers.find(offer => offer.name === same.name)!;
        assert.ok(same.investedCapital / same.ownershipPercent < strong.investedCapital / strong.ownershipPercent, 'and harsher');
    }
    pass(`weak numbers (${weakStanding.score}/5): ${weakOffers.length} offers${same ? `, ${same.name} pays less a point` : ''}`);

    /* ── everyone sees them: OWNERSHIP, the CFO, the Finance room ── */
    const offer = [...offers].sort((left, right) => left.ownershipPercent - right.ownershipPercent)[0];
    const view = getStreamingOwnershipView(player);
    const sheet = view.offers.find(item => item.id === offer.id)!;
    assert.ok(sheet && sheet.canSign && sheet.standsWeeks === 6 && /By our numbers/.test(sheet.read));
    assert.equal(view.round.status, 'OPEN');
    const rafael = streamingTeamSeatHolders(platformOf(player).leadership.appointments).holders.get('MONEY')!;
    const seat = platformOf(player).leadership.team!.seats.find(item => item.seatId === 'MONEY')!;
    const context: StreamingTeamJobContext = { player, platform: platformOf(player), absoluteWeek: weekOf(player), seat, executive: rafael, moneyLeft: 0, energyLeft: 0 };
    assert.ok(runInvestorOffers(context).some(item => item.dedupeKey === `offer:${offer.id}`));
    assert.ok(getStreamingFinanceRoom(player).investorOffers.some(item => item.id === offer.id));
    pass(`the term sheets are on OWNERSHIP ("${sheet.read.slice(0, 60)}…"), in the CFO's tray job and in the Finance room`);

    /* ── signing: new shares, every holder diluted ── */
    const before = platformOf(player);
    const costBefore = getStreamingGovernanceWeeklyCost(before, 100_000_000);
    const signed = acceptStreamingCelebrityInvestment(player, offer.id);
    assert.ok(signed.changed, signed.reason);
    const after = platformOf(signed.player);
    const keep = 1 - offer.ownershipPercent / 100;
    assert.equal(after.treasuryCash - before.treasuryCash, offer.investedCapital);
    assert.ok(Math.abs(after.founderOwnershipPercent - before.founderOwnershipPercent * keep) < 0.01, 'the founder diluted');
    before.finance.equityHolders.forEach(holder => {
        const now = after.finance.equityHolders.find(item => item.id === holder.id)!;
        assert.ok(Math.abs(now.ownershipPercent - holder.ownershipPercent * keep) < 0.001, `${holder.holderName} diluted too`);
    });
    const total = after.founderOwnershipPercent + after.finance.equityHolders.reduce((sum, holder) => sum + holder.ownershipPercent, 0);
    assert.ok(Math.abs(total - 100) < 0.05, `the cap table still adds up (${total.toFixed(3)}%)`);
    assert.equal(after.governance.investorRound!.soldPercent, offer.ownershipPercent);
    assert.ok(getStreamingGovernanceWeeklyCost(after, 100_000_000) >= costBefore);
    const holder = getStreamingOwnershipView(signed.player).holders.find(item => item.name === offer.name)!;
    assert.ok(holder && holder.percent === offer.ownershipPercent && holder.invested === offer.investedCapital);
    pass(`signed ${offer.name}: ${money(offer.investedCapital)} in the treasury; new shares: you ${before.founderOwnershipPercent.toFixed(2)}% → ${after.founderOwnershipPercent.toFixed(2)}%, every holder × ${keep.toFixed(3)}, the cap table at ${total.toFixed(2)}%`);

    /* several in a round, up to its size */
    let rolling = signed.player;
    let sold = offer.ownershipPercent;
    let refusedFull = false;
    for (const other of offers.filter(item => item.id !== offer.id)) {
        const result = acceptStreamingCelebrityInvestment(rolling, other.id);
        if (result.changed) { rolling = result.player; sold += other.ownershipPercent; continue; }
        if (result.reason === 'ROUND_FULL') { refusedFull = true; assert.ok(sold + other.ownershipPercent > round.upToPercent, 'refused only past the round\'s size'); }
    }
    assert.ok(platformOf(rolling).governance.investorRound!.soldPercent <= round.upToPercent + 1e-9, 'never more than the round may sell');
    pass(`signed ${(Math.round(sold * 10) / 10)}% of the round's ${round.upToPercent}%${refusedFull ? '; the next one was refused: the round was full' : ''}`);

    /* ── declining, a lapsed sheet, and the next round ── */
    const second = offers.find(item => item.id !== offer.id)!;
    const declined = declineStreamingCelebrityInvestment(signed.player, second.id);
    assert.ok(declined.changed && platformOf(declined.player).governance.celebrityInvestors.some(item => item.candidateId === second.id && item.status === 'DECLINED'));
    const lapsed = later(signed.player, 7);
    assert.equal(getStreamingOpenInvestorOffers(platformOf(lapsed), weekOf(lapsed)).length, 0, 'lapsed after 6 weeks');
    const third = offers.find(item => item.id !== offer.id && item.id !== second.id);
    if (third) assert.equal(acceptStreamingCelebrityInvestment(lapsed, third.id).reason, 'NOT_FOUND');
    assert.equal(callStreamingInvestorRound(withEnergy(lapsed), 'SMALL').reason, 'GAP', 'the next round waits');
    const next = callStreamingInvestorRound(withEnergy(later(signed.player, 13 - 3)), 'SMALL');
    assert.ok(next.changed, next.message);
    pass(`declined ${second.name}; the sheets lapse after 6 weeks; the next round can be called 13 weeks after the last`);

    /* the CFO proposes a round when the runway is short */
    const short: Player = (() => {
        const platform = platformOf(base);
        /* costs run $40M a week over revenue */
        const history = platform.weeklyHistory.map(item => (item.operations ? { ...item, operations: { ...item.operations,
            totalCashCost: item.operations.subscriptionRevenue + (item.operations.productRevenue || 0) + (item.operations.worldViewingIncrementalRevenue || 0) + 40_000_000,
            netCashContribution: -40_000_000, accountingContribution: -40_000_000 } } : item));
        return { ...base, ownedStreamingPlatform: { ...platform, treasuryCash: 400_000_000, weeklyHistory: history } };
    })();
    const shortContext: StreamingTeamJobContext = { player: short, platform: platformOf(short), absoluteWeek: weekOf(short), seat, executive: rafael, moneyLeft: 0, energyLeft: 0 };
    const proposal = runInvestorOffers(shortContext).find(item => item.title === 'Call a growth round');
    assert.ok(proposal && proposal.action.kind === 'OPEN_ROOM' && proposal.action.focusId === 'raise', 'the CFO proposes a round');
    pass(`short of runway, the CFO proposes it: "${proposal!.detail}"`);

    /* ── every signed investor stays on record ── */
    const many: OwnedStreamingCelebrityInvestor[] = Array.from({ length: 20 }, (_, index) => ({
        id: `audit-${index}`, candidateId: `audit-${index}`, name: `Audit ${index}`, status: index < 8 ? 'ACCEPTED' : 'DECLINED',
        investedCapital: 1_000_000, ownershipPercent: 1, boardSeatGranted: false, profitParticipationPercent: 0.5, influenceDemand: '', decisionAtAbsoluteWeek: 1,
    }));
    const kept = normalizeOwnedStreamingPlatformState({ ...platformOf(player), governance: { ...platformOf(player).governance, celebrityInvestors: many } }, player.id);
    assert.equal(kept.governance.celebrityInvestors.filter(item => item.status === 'ACCEPTED').length, 8);
    pass('eight signed investors and twelve declines: all eight signed stay on record (their profit share is paid weekly)');

    /* ── OWNERSHIP on screen ── */
    const html = text(renderToStaticMarkup(
        <BoardroomOwnership view={getStreamingOwnershipView(player)} companyName="NORTHSTAR+" founderName={player.name} actions={actions} />,
    ));
    /* #179: the founder and investors who are people have portraits; firms keep their initials */
    const raw = renderToStaticMarkup(<BoardroomOwnership view={getStreamingOwnershipView(player)} companyName="NORTHSTAR+" founderName={player.name} actions={actions} />);
    assert.ok((raw.match(/<img /g) || []).length >= 1, 'portraits on the cap table');
    assert.ok(getStreamingOwnershipView(player).holders.find(holder => holder.kind === 'YOU')?.gender === player.gender, "the founder's own picture");
    for (const words of ['Who owns NORTHSTAR+', '51% · control', 'Raise money', 'GROWTH ROUND', 'offers on the table below', 'On the table', 'TERM SHEET', 'Investment', 'Values you at', 'Board seat', 'Share of profit', 'You keep', 'Sign', 'Decline', `${offer.name}`]) {
        assert.ok(html.includes(words), `OWNERSHIP shows "${words}"`);
    }
    /* #175: your own money and the bank are in Studio Finance, not on OWNERSHIP */
    assert.ok(!html.includes('Your bank') && !html.includes('Put money in'), 'no bank card on OWNERSHIP');
    const noCfoOpen: Player = (() => {
        const platform = platformOf(player);
        return { ...player, ownedStreamingPlatform: { ...platform, leadership: { ...platform.leadership, appointments: platform.leadership.appointments.filter(item => item.role !== 'CFO') } } };
    })();
    assert.ok(getStreamingOwnershipView(noCfoOpen).offers.every(item => !item.canSign && item.blocked === 'Signing needs a CFO at the table.'));
    /* before any round: the five checks and the three rounds */
    const fresh186 = text(renderToStaticMarkup(<BoardroomOwnership view={getStreamingOwnershipView(base)} companyName="NORTHSTAR+" founderName={base.name} actions={actions} />));
    for (const words of ['Raise money', 'Members growing', 'Ready for a listing', '% of the company', 'Dollars', 'UP TO', 'RAISES ABOUT', 'YOU KEEP', 'Call the round', '⚡5', 'Call a round above']) {
        assert.ok(fresh186.includes(words), `Raise money shows "${words}"`);
    }
    const running = text(renderToStaticMarkup(<BoardroomOwnership view={getStreamingOwnershipView(called.player)} companyName="NORTHSTAR+" founderName={base.name} actions={actions} />));
    assert.ok(running.includes('Your bankers are calling'), 'the bankers\' card while it runs');
    pass('OWNERSHIP renders Raise money (the checks, a round of your own size), the bankers\' card, the cap table and the term sheets; without a CFO each sheet says why it cannot be signed');

    console.log(`Ownership audit passed in ${Math.round((performance.now() - started) / 1000)} s.`);
}

main().catch(error => { console.error(error); process.exit(1); });
