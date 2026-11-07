/**
 * #201: the board of directors: 3-year terms, resigning in protest under 40 confidence, a nominee goes with the investor,
 * and Find a director on OWNERSHIP; the price, the board's confidence and the news react.
 * #217: four people every 4 weeks with their past; a term ends unless you renew it, and you are asked; removing a director.
 */
import { atTheTable } from './fixtures/atTheTable';
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { collectOwnedStreamingPlatformFacts } from '../services/streamingPlatformNews';
import { runStreamingTeamWeek } from '../services/team/streamingTeam';
import {
    STREAMING_BOARD_CANDIDATES,
    STREAMING_BOARD_FIND_ENERGY,
    STREAMING_BOARD_REMOVE_ENERGY,
    STREAMING_BOARD_RENEW_WEEKS,
    STREAMING_BOARD_SEATS,
    STREAMING_BOARD_SET_WEEKS,
    STREAMING_BOARD_TERM_WEEKS,
    appointStreamingBoardDirector,
    getStreamingBoardView,
    removeStreamingBoardDirector,
    renewStreamingBoardDirector,
    streamingBoardWeek,
    streamingDirectorExitPriceMove,
} from '../services/streamingBoard';
import { answerStreamingDecisionEvent, getStreamingDecisionView, queueStreamingDecisionEvents, streamingDecisionEventData } from '../services/streamingDecisionEvent';
import { getStreamingOwnershipView } from '../services/streamingInvestorOffers';
import { stepDownFromStreamingCompany } from '../services/streamingStepDown';
import { nameStreamingTeamSuccessor } from '../services/team/streamingTeam';
import { streamingTeamSeatHolders } from '../services/team/teamState';
import { commitStreamingPublicMarketWeek } from '../services/streamingPublicMarkets';
import { listStreamingCompanyForQa } from '../services/streamingListingQa';

const started = Date.now();
const pass = (label: string) => console.log(`✓ ${label}`);
const fresh = (id: string, name = 'Board Audit'): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name, age: 30, currentWeek: 1 });
    return { ...player, money: 2e9, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
const later = (player: Player, weeks = 1): Player => {
    const total = player.currentWeek - 1 + weeks;
    return { ...player, age: player.age + Math.floor(total / 52), currentWeek: (total % 52) + 1, energy: { current: 100, max: 100 } };
};
const week = (player: Player) => getAbsoluteWeek(player.age, player.currentWeek);

const main = async () => {
    const base = await buildStreamingFullPlatformQa(fresh('board-audit'), { processWeek: processGameWeek, persistWeek: async next => next });
    const start = getStreamingBoardView(base);

    /* ── who sits ── */
    assert.equal(start.candidates.length, STREAMING_BOARD_CANDIDATES, 'four people at a time');
    start.candidates.forEach(person => {
        assert.ok(person.name && person.line && person.weekly >= 10_000, `${person.name}: a whole line`);
        assert.ok(person.career.jobs.length >= 2, `${person.name}: a past`);
        assert.ok(person.adds >= 3, `${person.name}: what they bring`);
        assert.ok(!start.directors.some(director => director.name === person.name), 'not someone already seated');
    });
    /* they rotate: another set a few weeks on, and the same set within its weeks */
    const nextSet = getStreamingBoardView(later(base, STREAMING_BOARD_SET_WEEKS)).candidates.map(person => person.id);
    assert.notDeepEqual(nextSet, start.candidates.map(person => person.id), 'a new set');
    const sameWeeks = start.nextInWeeks > 1 ? getStreamingBoardView(later(base, 1)).candidates.map(person => person.id) : start.candidates.map(person => person.id);
    assert.deepEqual(sameWeeks, start.candidates.map(person => person.id), 'the same people until then');
    assert.ok(start.about.length === 2 && /advises|decides/.test(start.about[0]), 'it says what the board does at your stake');
    pass(`four people: ${start.candidates.map(person => `${person.name} ($${Math.round(person.weekly / 1000)}K a week, +${person.adds})`).join(', ')}; ${start.directors.length} sit today, ${start.seatsLeft} seats free; new ones in ${start.nextInWeeks} weeks`);

    /* ── finding one ── */
    const person = start.candidates[0];
    const tired = appointStreamingBoardDirector({ ...base, energy: { current: 2, max: 100 } }, person.id);
    assert.ok(!tired.changed && /⚡/.test(tired.message || ''), 'it takes energy');
    const taken = appointStreamingBoardDirector(base, person.id);
    assert.ok(taken.changed, taken.message);
    assert.equal(taken.player.energy.current, base.energy.current - STREAMING_BOARD_FIND_ENERGY);
    const seated = platformOf(taken.player).governance.directors.find(item => item.candidateId === person.id)!;
    assert.equal(seated.termEndsAtAbsoluteWeek! - seated.appointedAtAbsoluteWeek, STREAMING_BOARD_TERM_WEEKS, 'three years');
    assert.ok(platformOf(taken.player).governance.boardConfidence > platformOf(base).governance.boardConfidence, 'a real seat adds to confidence');
    const view = getStreamingBoardView(taken.player);
    assert.ok(view.directors.some(director => director.name === person.name && director.weeksLeft === STREAMING_BOARD_TERM_WEEKS), 'the section shows them, and their term');
    assert.ok(!view.candidates.some(candidate => candidate.id === person.id), 'no longer on offer');
    /* the seats fill */
    let full = taken.player;
    for (let index = 0; index < STREAMING_BOARD_SEATS + 2; index += 1) {
        const next = getStreamingBoardView(full).candidates[0];
        if (!next) break;
        const result = appointStreamingBoardDirector({ ...full, energy: { current: 100, max: 100 } }, next.id);
        if (!result.changed) { assert.match(result.message || '', /seats are taken/); break; }
        full = result.player;
    }
    assert.equal(getStreamingBoardView(full).seatsLeft, 0, 'all seats taken');
    pass(`Find a director: ⚡${STREAMING_BOARD_FIND_ENERGY}, a 3-year term, ${STREAMING_BOARD_SEATS} independent seats in all`);

    /* ── a term ends, unless you renew it ── */
    const atEnd = week(taken.player) + STREAMING_BOARD_TERM_WEEKS;
    const noAnswer = streamingBoardWeek(platformOf(taken.player), atEnd).platform.governance.directors.find(item => item.candidateId === person.id)!;
    assert.equal(noAnswer.status, 'DEPARTED', 'no answer: they go');
    assert.equal(noAnswer.exit?.reason, 'TERM', 'and it says why');
    const seatedId = seated.id;
    assert.equal(renewStreamingBoardDirector(taken.player, seatedId).changed, false, 'not while the term has years left');
    const asked = later(taken.player, STREAMING_BOARD_TERM_WEEKS - STREAMING_BOARD_RENEW_WEEKS);
    assert.ok(getStreamingBoardView(asked).directors.find(item => item.id === seatedId)!.renew?.allowed, 'the sheet asks 13 weeks before');
    assert.ok(getStreamingBoardView(asked).termEnding, 'and the row on OWNERSHIP says so');
    const queued = queueStreamingDecisionEvents({ ...asked, pendingEvents: [] }, week(asked));
    const termEvent = (queued.pendingEvents || []).map(event => streamingDecisionEventData(event)).find(data => data?.kind === 'TERM_ENDING');
    assert.ok(termEvent, 'and so does a popup');
    const termView = getStreamingDecisionView(queued, termEvent!)!;
    assert.match(termView.title, /term ends in 13 weeks/);
    assert.deepEqual(termView.answers.map(item => item.id), ['RENEW', 'LET_END']);
    assert.equal(answerStreamingDecisionEvent(queued, termEvent!, 'LET_END').changed, true, 'letting it end is an answer too');
    const renewed = answerStreamingDecisionEvent(queued, termEvent!, 'RENEW');
    assert.ok(renewed.changed, renewed.message);
    const after3 = platformOf(renewed.player).governance.directors.find(item => item.id === seatedId)!;
    assert.equal(after3.termEndsAtAbsoluteWeek, atEnd + STREAMING_BOARD_TERM_WEEKS, 'three more years, from the end of this term');
    assert.equal(getStreamingDecisionView(renewed.player, termEvent!), null, 'answered, the popup closes');
    assert.equal(streamingBoardWeek(platformOf(renewed.player), atEnd).platform.governance.directors.find(item => item.id === seatedId)!.status, 'ACTIVE', 'and they stay');
    /* under 40 they will not */
    const low = (() => { const now = platformOf(asked); return { ...asked, ownedStreamingPlatform: { ...now, governance: { ...now.governance, boardConfidence: 35 } } }; })();
    assert.match(renewStreamingBoardDirector(low, seatedId).message || '', /will not stay/);
    assert.equal(getStreamingBoardView(low).directors.find(item => item.id === seatedId)!.renew?.allowed, false);
    /* off the board, it is not yours to ask: the board keeps its own if it can */
    const holder = streamingTeamSeatHolders(platformOf(taken.player).leadership.appointments).holders.get('MONEY')!;
    const offBoard = stepDownFromStreamingCompany(nameStreamingTeamSuccessor(taken.player, 'EXECUTIVE', holder.executiveId).player, 'LEAVE_BOARD').player;
    const results = Array.from({ length: 80 }, (_, index) => {
        const platform = platformOf(offBoard);
        const tried = streamingBoardWeek({ ...platform, simulationSeed: `term-${index}`, governance: { ...platform.governance, boardConfidence: 70 } }, atEnd);
        return tried.platform.governance.directors.find(item => item.candidateId === person.id)!;
    });
    const stayed = results.filter(item => item.status === 'ACTIVE');
    assert.ok(stayed.length > 20 && stayed.length < 70, `off the board, some stay (${stayed.length})`);
    assert.equal(getStreamingBoardView(later(offBoard, STREAMING_BOARD_TERM_WEEKS - STREAMING_BOARD_RENEW_WEEKS)).directors.find(item => item.id === seatedId)!.renew, null, 'and you are not asked');
    pass(`a term: asked at ${STREAMING_BOARD_RENEW_WEEKS} weeks, on the sheet and in a popup; renewed, three more years; no answer, they go; under 40 they will not stay; off the board ${stayed.length} of 80 stay by themselves`);

    /* ── removing one ── */
    const directorNow = getStreamingBoardView(taken.player).directors.find(item => item.id === seatedId)!;
    assert.ok(directorNow.remove.allowed, directorNow.remove.line);
    assert.equal(directorNow.remove.cost, seated.weeklyCompensation * 13, '13 weeks of their fee');
    const nominee = getStreamingBoardView(taken.player).directors.find(item => item.seat === "Investor's seat");
    if (nominee) {
        assert.equal(nominee.remove.allowed, false);
        assert.match(removeStreamingBoardDirector(taken.player, nominee.id).message || '', /buy them out/);
    }
    assert.ok(/⚡/.test(removeStreamingBoardDirector({ ...taken.player, energy: { current: 1, max: 100 } }, seatedId).message || ''), 'it takes energy');
    const under = (() => { const now = platformOf(taken.player); return { ...taken.player, ownedStreamingPlatform: { ...now, founderOwnershipPercent: 40, governance: { ...now.governance, boardConfidence: 5 } } }; })();
    assert.ok(removeStreamingBoardDirector(under, seatedId).vote, 'under 51%, it goes to a vote');
    const underAgreed = (() => { const now = platformOf(under); return { ...under, ownedStreamingPlatform: { ...now, governance: { ...now.governance, boardConfidence: 100 } } }; })();
    const agreedAtTable = atTheTable(underAgreed, removeStreamingBoardDirector(underAgreed, seatedId), next => removeStreamingBoardDirector(next, seatedId));
    assert.ok(agreedAtTable.carried && agreedAtTable.done?.changed, 'a board that trusts you agrees');
    const beforeRemove = platformOf(taken.player);
    const removed = removeStreamingBoardDirector(taken.player, seatedId);
    assert.ok(removed.changed, removed.message);
    const afterRemove = platformOf(removed.player);
    assert.equal(afterRemove.treasuryCash, beforeRemove.treasuryCash - seated.weeklyCompensation * 13);
    assert.equal(afterRemove.governance.boardConfidence, beforeRemove.governance.boardConfidence - 4, 'the others mind');
    assert.equal(removed.player.energy.current, taken.player.energy.current - STREAMING_BOARD_REMOVE_ENERGY);
    const gone = afterRemove.governance.directors.find(item => item.id === seatedId)!;
    assert.equal(gone.exit?.reason, 'REMOVED');
    assert.ok(!getStreamingBoardView(removed.player).candidates.some(candidate => candidate.id === person.id), 'and they do not come back');
    assert.ok(getStreamingBoardView(removed.player).seatsLeft > getStreamingBoardView(taken.player).seatsLeft, 'a seat is free again');
    assert.equal(afterRemove.eventLedger.at(-1)!.type, 'BOARD_DIRECTOR_REMOVED');
    const removedFacts = collectOwnedStreamingPlatformFacts(removed.player, week(removed.player) - 1, week(removed.player) + 1);
    assert.ok(removedFacts.some(fact => /removes .* from its board/.test(fact.headline)), 'the news carries it');
    const noPopup = queueStreamingDecisionEvents({ ...removed.player, pendingEvents: [] }, week(removed.player));
    assert.ok(!(noPopup.pendingEvents || []).some(event => streamingDecisionEventData(event)?.kind === 'DIRECTOR_LEFT'), 'one you removed yourself needs no telling');
    const reloaded = migratePlayerSave(JSON.parse(JSON.stringify(removed.player)));
    assert.equal(platformOf(reloaded).governance.directors.find(item => item.id === seatedId)!.exit?.reason, 'REMOVED', 'a reload keeps why');
    assert.ok(getStreamingOwnershipView(removed.player).board, 'OWNERSHIP still shows the board');
    pass(`removing one: 13 weeks of their fee, ⚡${STREAMING_BOARD_REMOVE_ENERGY}, confidence −4, the news; yours at 51%, else the board's from 60; an investor's seat only by buying them out`);

    /* ── in protest ── */
    let shaken = { ...platformOf(taken.player), governance: { ...platformOf(taken.player).governance, boardConfidence: 30 } };
    let protestAt = -1;
    for (let at = 0; at < 200 && protestAt < 0; at += 1) {
        const tried = streamingBoardWeek(shaken, week(taken.player) + at);
        if (tried.platform.governance.directors.some(item => item.exit?.reason === 'PROTEST')) {
            protestAt = at;
            shaken = tried.platform;
            assert.ok(tried.notes.some(note => /in protest/.test(note.title)), 'the minutes say so');
            assert.ok(tried.platform.governance.boardConfidence < 30, 'private: confidence falls further');
        }
    }
    assert.ok(protestAt >= 0, 'in time one resigns');
    const calm = streamingBoardWeek({ ...shaken, governance: { ...shaken.governance, boardConfidence: 70 } }, week(taken.player) + 1);
    assert.ok(!calm.notes.some(note => /protest/.test(note.title)), 'not above 40');
    const protestPlayer: Player = { ...taken.player, ownedStreamingPlatform: shaken };
    const leftAt = shaken.governance.directors.find(item => item.exit?.reason === 'PROTEST')!.endedAtAbsoluteWeek!;
    const facts = collectOwnedStreamingPlatformFacts(protestPlayer, leftAt - 1, leftAt + 1);
    assert.ok(facts.some(fact => fact.type === 'PLATFORM_EXECUTIVE_LEFT' && /in protest/.test(fact.headline)), 'the news carries it');
    pass(`under 40: a director resigned in protest after ${protestAt + 1} weeks; the minutes and the news say so`);

    /* ── the price ── */
    assert.equal(streamingDirectorExitPriceMove('TERM'), -0.005);
    assert.equal(streamingDirectorExitPriceMove('PROTEST'), -0.03);
    assert.equal(streamingDirectorExitPriceMove('REMOVED'), -0.015);
    const listed = listStreamingCompanyForQa(taken.player, { ticker: 'BORD' });
    assert.ok(listed.changed, listed.reason);
    const snapshot = { ...platformOf(listed.player).weeklyHistory.at(-1)!, absoluteWeek: week(listed.player) + 1 };
    const quiet = commitStreamingPublicMarketWeek(platformOf(listed.player), listed.player, snapshot);
    const now = platformOf(listed.player);
    const protest: typeof now = { ...now, governance: { ...now.governance, directors: now.governance.directors.map(item => (item.candidateId === person.id
        ? { ...item, status: 'DEPARTED' as const, endedAtAbsoluteWeek: week(listed.player), exit: { reason: 'PROTEST' as const } } : item)) } };
    const hit = commitStreamingPublicMarketWeek(protest, listed.player, snapshot);
    const before = quiet.publicCompany.quoteHistory.at(-1)!;
    const after = hit.publicCompany.quoteHistory.at(-1)!;
    assert.ok(after.close < before.close, 'the price falls');
    assert.ok(after.drivers.includes('A director resigning in protest'), 'and the quote says why');
    assert.equal(hit.governance.directors.find(item => item.candidateId === person.id)!.exit?.pricedAtAbsoluteWeek, snapshot.absoluteWeek, 'priced once');
    const removedListed = removeStreamingBoardDirector({ ...listed.player, energy: { current: 100, max: 100 } }, getStreamingBoardView(listed.player).directors.find(item => item.name === person.name)!.id);
    assert.ok(removedListed.changed, removedListed.message);
    const removedHit = commitStreamingPublicMarketWeek(platformOf(removedListed.player), removedListed.player, snapshot).publicCompany.quoteHistory.at(-1)!;
    assert.ok(removedHit.close < before.close, 'removing one costs the price too');
    assert.ok(removedHit.drivers.includes('A director removed from the board'), 'and the quote says why');
    pass(`the price: a term −0.5%, removed −1.5% ($${before.close} → $${removedHit.close}), in protest −3% ($${before.close} → $${after.close}), once`);

    /* ── the week's run reaches it ── */
    const ran = runStreamingTeamWeek(later(taken.player));
    assert.ok(platformOf(ran).governance.directors.every(item => item.status !== 'ACTIVE' || item.seatType !== 'INDEPENDENT' || item.termEndsAtAbsoluteWeek !== undefined), 'every independent has a term');
    pass('the week\'s run gives older directors a term of their own');

    console.log(`Streaming board audit passed in ${Math.round((Date.now() - started) / 1000)} s.`);
};

main().catch(error => { console.error(error); process.exit(1); });
