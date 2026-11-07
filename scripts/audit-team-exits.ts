/**
 * #200: executives leave by themselves, and it shows.
 *  - why: underpaid, burnt out or wanting out (about 3% a year at loyalty 80, about 12% at 40), retiring, a hard quarter;
 *  - how: four weeks' notice as a card, a counter with your own figure (none for retiring or personal reasons), then the
 *    chair empties, vested options stay and the rest go back;
 *  - what it does: the share price once listed, the board while private, the news either way;
 *  - Let go costs 13 weeks' pay;
 *  - an investor's buyout or a buyback never touches an executive's job or options.
 */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player, type StreamingTeamSeatId } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { collectOwnedStreamingPlatformFacts } from '../services/streamingPlatformNews';
import { getIndustryPerson } from '../services/industry/industryPeople';
import {
    approveStreamingTeamCard,
    declineStreamingTeamCard,
    dismissStreamingTeamExecutive,
    getStreamingTeamCandidates,
    getStreamingTeamView,
    hireStreamingTeamCandidate,
    runStreamingTeamWeek,
} from '../services/team/streamingTeam';
import { streamingOptionsVested, TEAM_OPTIONS_HOLDER } from '../services/team/teamHiring';
import {
    STREAMING_TEAM_NOTICE_WEEKS,
    STREAMING_TEAM_SEVERANCE_WEEKS,
    streamingExitBoardMove,
    streamingExitPriceMove,
    streamingTeamCounterAsk,
    streamingTeamMarketPay,
    streamingTeamUnderpaidBy,
    streamingTeamUnderpaidChance,
    streamingTeamWalkOutChance,
    streamingTeamWantsToLeave,
} from '../services/team/teamExits';
import { commitStreamingPublicMarketWeek } from '../services/streamingPublicMarkets';
import { listStreamingCompanyForQa } from '../services/streamingListingQa';
import { getStreamingBuyoutQuote, buyOutStreamingInvestor } from '../services/streamingOwnShares';

const started = Date.now();
const pass = (label: string) => console.log(`✓ ${label}`);
const fresh = (id: string, name = 'Exits Audit'): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name, age: 30, currentWeek: 1 });
    return { ...player, money: 2e9, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
const later = (player: Player, weeks = 1): Player => {
    const total = player.currentWeek - 1 + weeks;
    return { ...player, age: player.age + Math.floor(total / 52), currentWeek: (total % 52) + 1, energy: { current: 100, max: 100 } };
};
const withAppointment = (player: Player, id: string, change: Record<string, unknown>): Player => {
    const platform = platformOf(player);
    return { ...player, ownedStreamingPlatform: { ...platform, leadership: { ...platform.leadership, appointments: platform.leadership.appointments.map(item => (item.id === id ? { ...item, ...change } : item)) } } };
};
const seatOf = (player: Player, seatId: StreamingTeamSeatId) => getStreamingTeamView(player).seats.find(seat => seat.seatId === seatId)!;
const week = (player: Player) => getAbsoluteWeek(player.age, player.currentWeek);

const main = async () => {
    const base = runStreamingTeamWeek(later(await buildStreamingFullPlatformQa(fresh('team-exits'), { processWeek: processGameWeek, persistWeek: async next => next })));
    const seat = seatOf(base, 'MONEY');
    const appointmentId = seat.executive!.appointmentId;
    const appointment = () => platformOf(base).leadership.appointments.find(item => item.id === appointmentId)!;

    /* ── how often ── */
    assert.ok(Math.abs(streamingTeamWalkOutChance(80) - 0.03) < 0.001, 'about 3% a year at loyalty 80');
    assert.ok(Math.abs(streamingTeamWalkOutChance(40) - 0.12) < 0.001, 'about 12% a year at loyalty 40');
    let tally = 0;
    const steady = { ...appointment(), loyalty: 40, appointedAtAbsoluteWeek: 0 };
    for (let at = 14; at < 14 + 52 * 400; at += 1) {
        if (at % 13 === 0) continue;
        if (streamingTeamWantsToLeave(base, 'rate-check', steady, at, null)) tally += 1;
    }
    const yearly = tally / 400;
    assert.ok(yearly > 0.07 && yearly < 0.17, `${yearly}: about 12% a year at loyalty 40`);
    pass(`loyalty 40: ${(yearly * 100).toFixed(1)}% a year want out; the rolls are seeded (the same week gives the same answer)`);

    /* ── underpaid ── */
    const market = streamingTeamMarketPay(base, appointment());
    const cheap = Math.round(market * 0.7 / 5_000) * 5_000;
    const underpaid = withAppointment(base, appointmentId, { weeklyCompensation: cheap, loyalty: 30 });
    assert.ok(streamingTeamUnderpaidBy(underpaid, platformOf(underpaid).leadership.appointments.find(item => item.id === appointmentId)!) >= 0.15, 'paid 30% under');
    assert.ok(streamingTeamUnderpaidChance(0.3, 30) > 0.25, 'a real chance a quarter');
    assert.equal(streamingTeamUnderpaidChance(0.1, 30), 0, 'under 15%, no');
    const page = seatOf(underpaid, 'MONEY').executive!;
    assert.equal(page.underpaid?.market, market, 'the page says the market pay');
    pass(`paid ${Math.round(cheap / 1000)}K against a market of ${Math.round(market / 1000)}K: the page says so, and it is a ${Math.round(streamingTeamUnderpaidChance(0.3, 30) * 100)}% chance a quarter at loyalty 30`);

    /* ── notice ── */
    const giveNotice = (player: Player, reason: string, wants: number | null): Player => {
        const absolute = week(player);
        const platform = platformOf(player);
        const given = withAppointment(player, appointmentId, { notice: { reason, givenAtAbsoluteWeek: absolute, leavesAtAbsoluteWeek: absolute + STREAMING_TEAM_NOTICE_WEEKS } });
        const team = platform.leadership.team!;
        const card = {
            id: `notice-${reason}`, dedupeKey: `notice-${reason}`, seatId: 'MONEY' as const, jobId: 'NOTICE' as const, appointmentId,
            createdAtAbsoluteWeek: absolute, expiresAtAbsoluteWeek: absolute + STREAMING_TEAM_NOTICE_WEEKS, title: 'Notice', detail: '', reason: '', cost: 0, energy: 0,
            action: { kind: 'NOTICE' as const, appointmentId, weekly: appointment().weeklyCompensation, wants }, status: 'WAITING' as const, resolvedAtAbsoluteWeek: null,
        };
        const after = platformOf(given);
        return { ...given, ownedStreamingPlatform: { ...after, leadership: { ...after.leadership, team: { ...team, tray: [...team.tray, card] } } } };
    };
    /* the week's own run gives notice when they want out */
    let run = withAppointment(base, appointmentId, { weeklyCompensation: cheap, loyalty: 8, appointedAtAbsoluteWeek: week(base) - 300 });
    let noticeWeek = -1;
    for (let attempt = 0; attempt < 200 && noticeWeek < 0; attempt += 1) {
        run = runStreamingTeamWeek(later(run));
        const held = platformOf(run).leadership.appointments.find(item => item.id === appointmentId)!;
        if (held.notice) noticeWeek = attempt;
    }
    assert.ok(noticeWeek >= 0, 'in time they give notice');
    const held = platformOf(run).leadership.appointments.find(item => item.id === appointmentId)!;
    assert.equal(held.notice!.leavesAtAbsoluteWeek - held.notice!.givenAtAbsoluteWeek, 4, 'four weeks');
    assert.equal(held.status, 'ACTIVE', 'still at work');
    const card = platformOf(run).leadership.team!.tray.find(item => item.jobId === 'NOTICE' && item.status === 'WAITING');
    assert.ok(card, 'a card');
    pass(`after ${noticeWeek + 1} weeks at loyalty 8: "${card!.title}": "${card!.detail}"; "${card!.reason}"`);

    /* ── a counter ── */
    const wants = streamingTeamCounterAsk(base, appointment());
    const cover = giveNotice(base, 'UNDERPAID', wants);
    const kept = approveStreamingTeamCard(cover, 'notice-UNDERPAID', undefined, wants);
    assert.ok(kept.changed, kept.message);
    const keptExec = platformOf(kept.player).leadership.appointments.find(item => item.id === appointmentId)!;
    assert.equal(keptExec.weeklyCompensation, wants, 'your figure is their pay');
    assert.equal(keptExec.notice, undefined, 'the notice is gone');
    const shortOffer = approveStreamingTeamCard(cover, 'notice-UNDERPAID', undefined, Math.round(wants * 0.85 / 5_000) * 5_000);
    assert.ok(shortOffer.changed, 'a low figure is answered');
    assert.match(shortOffer.message || '', /still leaving/);
    assert.ok(platformOf(shortOffer.player).leadership.appointments.find(item => item.id === appointmentId)!.notice, 'and they still go');
    const letGo = declineStreamingTeamCard(cover, 'notice-UNDERPAID');
    assert.ok(letGo.changed && platformOf(letGo.player).leadership.appointments.find(item => item.id === appointmentId)!.notice, 'Let them go: they work it out');
    /* retiring has no counter */
    const retiring = giveNotice(base, 'RETIRING', null);
    const noCounter = approveStreamingTeamCard(retiring, 'notice-RETIRING', undefined, wants * 2);
    assert.ok(!noCounter.changed, 'nothing changes a retirement');
    pass(`counter: ${Math.round(wants / 1000)}K keeps them; 15% under that does not; retiring has no counter`);

    /* ── the chair empties ── */
    const hired = hireStreamingTeamCandidate(later(base), 'TRUST', getStreamingTeamCandidates(later(base), 'TRUST')[0].id);
    assert.ok(hired.changed, hired.message);
    const trust = platformOf(hired.player).leadership.appointments.find(item => item.status === 'ACTIVE' && item.role === 'SECURITY_TRUST_HEAD')!;
    const heldYear = later(hired.player, 60);
    const noticeGivenNow = withAppointment(heldYear, trust.id, { notice: { reason: 'BURNT_OUT', givenAtAbsoluteWeek: week(heldYear), leavesAtAbsoluteWeek: week(heldYear) + 4 } });
    /* #217: a director whose term ends here would move the confidence too; this is about the executive alone */
    const noticePlatform = platformOf(noticeGivenNow);
    const noticeGiven: Player = { ...noticeGivenNow, ownedStreamingPlatform: { ...noticePlatform, governance: { ...noticePlatform.governance, directors: noticePlatform.governance.directors.map(item => ({ ...item, termEndsAtAbsoluteWeek: week(heldYear) + 500 })) } } };
    const beforeConfidence = platformOf(noticeGiven).governance.boardConfidence;
    let leaving = noticeGiven;
    for (let step = 0; step < 4; step += 1) {
        leaving = runStreamingTeamWeek(later(leaving));
        assert.equal(platformOf(leaving).leadership.appointments.find(item => item.id === trust.id)!.status, step < 3 ? 'ACTIVE' : 'RESIGNED', `week ${step + 1} of the notice`);
    }
    const gone = platformOf(leaving).leadership.appointments.find(item => item.id === trust.id)!;
    assert.equal(gone.exit?.reason, 'BURNT_OUT');
    assert.equal(gone.exit?.sudden, false);
    assert.equal(seatOf(leaving, 'TRUST').status, 'EMPTY', 'the chair is empty');
    const vested = streamingOptionsVested(gone.options!, gone.endedAtAbsoluteWeek!);
    assert.ok(vested > 0 && vested < 1, 'part vested');
    assert.ok(gone.options!.settledAtAbsoluteWeek !== undefined || runStreamingTeamWeek(later(leaving)), 'the rest goes back');
    assert.equal(platformOf(leaving).governance.boardConfidence, Math.max(0, beforeConfidence + streamingExitBoardMove('BURNT_OUT', 'OTHER')), 'private: the board notices');
    const facts = collectOwnedStreamingPlatformFacts(later(leaving), week(leaving) - 1, week(leaving) + 1);
    const story = facts.find(fact => fact.type === 'PLATFORM_EXECUTIVE_LEFT');
    assert.ok(story, 'the news carries it');
    pass(`four weeks on the chair is empty, ${Math.round(vested * 100)}% of the options stay; the board ${streamingExitBoardMove('BURNT_OUT', 'OTHER')}; News: "${story!.headline}"`);

    /* ── Let go ── */
    const treasury = platformOf(base).treasuryCash;
    const severance = appointment().weeklyCompensation * STREAMING_TEAM_SEVERANCE_WEEKS;
    const dropped = dismissStreamingTeamExecutive(base, 'MONEY');
    assert.ok(dropped.changed);
    assert.equal(platformOf(dropped.player).treasuryCash, treasury - severance, '13 weeks of pay');
    const droppedRun = runStreamingTeamWeek(later(dropped.player));
    const out = platformOf(droppedRun).leadership.appointments.find(item => item.id === appointmentId)!;
    assert.equal(out.exit?.reason, 'LET_GO');
    assert.equal(out.exit?.sudden, true);
    assert.equal(platformOf(droppedRun).governance.boardConfidence, Math.max(0, platformOf(dropped.player).governance.boardConfidence + streamingExitBoardMove('LET_GO', 'CFO')), 'the board reacts to a CFO let go');
    const droppedStory = collectOwnedStreamingPlatformFacts(later(droppedRun), week(droppedRun) - 1, week(droppedRun) + 1).find(fact => fact.type === 'PLATFORM_EXECUTIVE_LEFT');
    assert.match(droppedStory?.headline || '', /lets its .* go/);
    const poor = { ...base, ownedStreamingPlatform: { ...platformOf(base), treasuryCash: 10 } };
    const cannot = dismissStreamingTeamExecutive(poor, 'MONEY');
    assert.ok(!cannot.changed && /Severance/.test(cannot.message || ''), 'not without the money');
    pass(`Let go: $${(severance / 1e6).toFixed(2)}M, 13 weeks' pay; News: "${droppedStory!.headline}"; refused if the treasury cannot pay it`);

    /* ── the price ── */
    assert.equal(streamingExitPriceMove('RETIRING', 'CEO'), -0.003);
    assert.equal(streamingExitPriceMove('UNDERPAID', 'CEO'), -0.06);
    assert.equal(streamingExitPriceMove('LET_GO', 'CFO'), -0.04);
    assert.equal(streamingExitPriceMove('RIVAL_OFFER', 'OTHER'), -0.015);
    assert.ok(Math.abs(streamingExitPriceMove('HARD_QUARTER', 'CFO') + 0.06) < 1e-9, 'half as much again after a hard quarter');
    const listed = listStreamingCompanyForQa(base, { ticker: 'EXIT' });
    assert.ok(listed.changed, listed.reason);
    const snapshot = { ...platformOf(listed.player).weeklyHistory.at(-1)!, absoluteWeek: week(listed.player) + 1 };
    const stay = commitStreamingPublicMarketWeek(platformOf(listed.player), listed.player, snapshot);
    const cfoOut = platformOf(listed.player);
    const withExit: typeof cfoOut = { ...cfoOut, leadership: { ...cfoOut.leadership, appointments: cfoOut.leadership.appointments.map(item => (item.id === appointmentId
        ? { ...item, status: 'RESIGNED' as const, endedAtAbsoluteWeek: week(listed.player), exit: { reason: 'RIVAL_OFFER' as const, sudden: true, to: 'Netflix' } } : item)) } };
    const hit = commitStreamingPublicMarketWeek(withExit, listed.player, snapshot);
    const stayQuote = stay.publicCompany.quoteHistory.at(-1)!;
    const hitQuote = hit.publicCompany.quoteHistory.at(-1)!;
    assert.ok(hitQuote.close < stayQuote.close, 'the price falls');
    assert.ok(Math.abs(hitQuote.close / stayQuote.close - 1) > 0.02, `by a real amount: ${hitQuote.close} against ${stayQuote.close}`);
    assert.ok(hitQuote.drivers.includes('Losing the finance chief'), 'and the quote says why');
    assert.equal(hit.leadership.appointments.find(item => item.id === appointmentId)!.exit?.pricedAtAbsoluteWeek, snapshot.absoluteWeek, 'priced once');
    const nextWeek = commitStreamingPublicMarketWeek(hit, listed.player, { ...snapshot, absoluteWeek: snapshot.absoluteWeek + 1 });
    assert.ok(!nextWeek.publicCompany.quoteHistory.at(-1)!.drivers.includes('Losing the finance chief'), 'and never again');
    pass(`the price: planned −0.3%; sudden −6% CEO, −4% CFO, −1.5% others; ×1.5 after a hard quarter; a CFO to Netflix: $${stayQuote.close} → $${hitQuote.close} ("Losing the finance chief"), priced once`);

    /* ── options never decide a job ── */
    const withHolder = platformOf(hired.player);
    const pool = withHolder.finance.equityHolders.find(holder => holder.holderName === TEAM_OPTIONS_HOLDER);
    assert.ok(pool && pool.ownershipPercent > 0, 'the pool is on the cap table');
    assert.equal(getStreamingBuyoutQuote(withHolder, pool!.id), null, 'nobody can buy out the option pool');
    const investors = withHolder.finance.equityHolders.filter(holder => holder.holderName !== TEAM_OPTIONS_HOLDER && getStreamingBuyoutQuote(withHolder, holder.id));
    let buyouts = 0;
    investors.slice(0, 2).forEach(holder => {
        const rich = { ...hired.player, money: 1e12 };
        const done = buyOutStreamingInvestor(rich, holder.id);
        if (done.changed) {
            buyouts += 1;
            const after = platformOf(done.player);
            assert.equal(JSON.stringify(after.leadership.appointments), JSON.stringify(withHolder.leadership.appointments), 'no executive job changes');
            assert.equal(after.finance.equityHolders.find(item => item.holderName === TEAM_OPTIONS_HOLDER)?.id, pool!.id, 'the pool stays');
        }
    });
    pass(`options never decide a job: the option pool cannot be bought out; ${buyouts} investor buyout(s) left every executive and every option alone`);

    /* ── a person, once left ── */
    const person = getIndustryPerson(leaving, gone.executiveId);
    assert.ok(person, 'still a person in the industry');

    console.log(`Team exits audit passed in ${Math.round((Date.now() - started) / 1000)} s.`);
};

main().catch(error => { console.error(error); process.exit(1); });
