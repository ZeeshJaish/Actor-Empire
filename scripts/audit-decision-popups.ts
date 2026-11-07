/**
 * #210: decisions as popups, on #75's system. At most 2 a week, counting incidents, most urgent first; small cards stay in
 * the tray; a chair gets only the board's and the chief executive's matters; an answer here is the page's own; a popup
 * whose decision has gone closes itself.
 */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type OwnedStreamingTeamCard, type Player, type ScheduledEvent } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { stepDownFromStreamingCompany } from '../services/streamingStepDown';
import { nameStreamingTeamSuccessor } from '../services/team/streamingTeam';
import { streamingTeamSeatHolders } from '../services/team/teamState';
import {
    STREAMING_DECISIONS_A_WEEK,
    answerStreamingDecisionEvent,
    getStreamingDecisionView,
    queueStreamingDecisionEvents,
    streamingDecisionEventData,
} from '../services/streamingDecisionEvent';

const started = Date.now();
const pass = (label: string) => console.log(`✓ ${label}`);
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
const week = (player: Player) => getAbsoluteWeek(player.age, player.currentWeek);
const later = (player: Player, weeks = 1): Player => {
    const total = player.currentWeek - 1 + weeks;
    return { ...player, age: player.age + Math.floor(total / 52), currentWeek: (total % 52) + 1 };
};

const main = async () => {
    const seed = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'decisions', name: 'Popup Founder', age: 40, currentWeek: 1 });
    let base = await buildStreamingFullPlatformQa({ ...seed, energy: { current: 100, max: 100 }, flags: { ...seed.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } }, { processWeek: processGameWeek, persistWeek: async next => next });
    base = { ...base, energy: { current: 100, max: 100 }, pendingEvents: [], money: 1e9 };
    const platform = platformOf(base);
    const team = platform.leadership.team!;
    const money = streamingTeamSeatHolders(platform.leadership.appointments).holders.get('MONEY')!;
    const absolute = week(base);
    const card = (id: string, action: OwnedStreamingTeamCard['action'], jobId: OwnedStreamingTeamCard['jobId'], cost = 0): OwnedStreamingTeamCard => ({
        id, dedupeKey: id, seatId: 'MONEY', jobId, appointmentId: money.id, createdAtAbsoluteWeek: absolute, expiresAtAbsoluteWeek: absolute + 4,
        title: id, detail: `${id} detail`, reason: `${id} reason`, cost, energy: 0, action, status: 'WAITING', resolvedAtAbsoluteWeek: null,
    });
    const withCards = (player: Player, cards: OwnedStreamingTeamCard[]): Player => {
        const now = platformOf(player);
        return { ...player, ownedStreamingPlatform: { ...now, leadership: { ...now.leadership, team: { ...now.leadership.team!, tray: cards } } } };
    };
    const limit = team.seats.find(seat => seat.seatId === 'MARKETING')!.actionMoney;
    assert.ok(limit > 0, 'a seat with a money limit');
    const notice = card('notice', { kind: 'NOTICE', appointmentId: money.id, weekly: 200_000, wants: 260_000 }, 'NOTICE');
    const raise = card('raise', { kind: 'RAISE', appointmentId: money.id, percent: 5, weekly: 210_000 }, 'RAISE');
    const small = { ...card('small', { kind: 'TITLE_LICENSE', listingId: 'x', price: 1 }, 'OFFERS', Math.max(1, limit - 1)), seatId: 'MARKETING' as const };
    const big = { ...card('big', { kind: 'TITLE_LICENSE', listingId: 'x', price: 1 }, 'OFFERS', limit + 1), seatId: 'MARKETING' as const };
    await Promise.resolve();

    /* ── what comes up, and how many ── */
    const events = (player: Player) => (player.pendingEvents || []).filter(event => event.type === 'STREAMING_DECISION');
    const queued = queueStreamingDecisionEvents(withCards(base, [raise, small, big, notice]), absolute);
    assert.equal(events(queued).length, STREAMING_DECISIONS_A_WEEK, 'at most 2 a week');
    assert.deepEqual(events(queued).map(event => streamingDecisionEventData(event)!.kind), ['NOTICE', 'RAISE'], 'most urgent first');
    assert.ok(!events(queued).some(event => streamingDecisionEventData(event)!.cardId === 'small'), 'small cards stay in the tray');
    const onlySmall = queueStreamingDecisionEvents(withCards(base, [small]), absolute);
    assert.equal(events(onlySmall).length, 0, 'a small card alone: no popup');
    const onlyBig = queueStreamingDecisionEvents(withCards(base, [big]), absolute);
    assert.equal(streamingDecisionEventData(events(onlyBig)[0])!.kind, 'BIG_CARD', 'over its limit: a popup');
    /* incidents count */
    const incident: ScheduledEvent = { id: 'incident', week: base.currentWeek, type: 'STREAMING_INCIDENT', title: 'An incident' };
    const withIncident = queueStreamingDecisionEvents({ ...withCards(base, [raise, notice]), pendingEvents: [incident] }, absolute);
    assert.equal(events(withIncident).length, 1, 'an incident takes one of the 2');
    /* once */
    const twice = queueStreamingDecisionEvents(queued, absolute);
    assert.equal(events(twice).length, events(queued).length, 'never twice');
    pass(`at most ${STREAMING_DECISIONS_A_WEEK} a week, counting incidents, most urgent first; a card under its $${(limit / 1e6).toFixed(1)}M limit stays in the tray`);

    /* ── the answers are the page's own ── */
    const noticeData = streamingDecisionEventData(events(queued)[0])!;
    const noticeView = getStreamingDecisionView(queued, noticeData)!;
    assert.equal(noticeView.kicker, 'Notice');
    assert.ok(noticeView.answers.some(item => item.id === 'COUNTER') && noticeView.answers.some(item => item.id === 'LET_GO'));
    assert.equal(noticeView.figure?.asked, 260_000);
    assert.equal(noticeView.door.room, 'TEAM');
    const withNotice = (() => {
        const now = platformOf(queued);
        return { ...queued, ownedStreamingPlatform: { ...now, leadership: { ...now.leadership, appointments: now.leadership.appointments.map(item => (item.id === money.id ? { ...item, notice: { reason: 'UNDERPAID' as const, givenAtAbsoluteWeek: absolute, leavesAtAbsoluteWeek: absolute + 4 } } : item)) } } };
    })();
    const countered = answerStreamingDecisionEvent(withNotice, noticeData, 'COUNTER', 260_000);
    assert.ok(countered.changed, countered.message);
    const kept = platformOf(countered.player).leadership.appointments.find(item => item.id === money.id)!;
    assert.equal(kept.weeklyCompensation, 260_000, 'the same counter as the tray');
    assert.equal(kept.notice, undefined);
    /* answered: the popup has gone */
    assert.equal(getStreamingDecisionView(countered.player, noticeData), null, 'a decision that has gone closes itself');
    const raiseData = streamingDecisionEventData(events(queued)[1])!;
    const raiseView = getStreamingDecisionView(queued, raiseData)!;
    assert.deepEqual(raiseView.answers.map(item => item.id), ['GIVE', 'FIGURE', 'NO']);
    const refused = answerStreamingDecisionEvent(queued, raiseData, 'NO');
    assert.ok(refused.changed, 'a no');
    assert.equal(platformOf(refused.player).leadership.appointments.find(item => item.id === money.id)!.loyalty, money.loyalty - 10, 'the same no as the tray');
    /* expired */
    assert.equal(getStreamingDecisionView(later(queued, 5), raiseData), null, 'past its week it has gone');
    pass('answers here are the tray\'s own: a counter sets the pay, a no costs loyalty; answered or expired, the popup closes itself');

    /* ── the rest ── */
    const named = nameStreamingTeamSuccessor(base, 'EXECUTIVE', money.executiveId).player;
    const chair = stepDownFromStreamingCompany(named, 'EXECUTIVE_CHAIR').player;
    const chairRaise = queueStreamingDecisionEvents(withCards(chair, [{ ...raise, appointmentId: 'someone' }, { ...big, appointmentId: 'someone' }]), absolute);
    assert.equal(events(chairRaise).length, 0, 'a chair is not asked about raises or spending');
    const chairNotice = queueStreamingDecisionEvents(withCards(chair, [notice, { ...notice, id: 'other', appointmentId: 'someone' }]), absolute);
    assert.equal(events(chairNotice).length, 1, 'only the chief executive\'s own notice');
    assert.equal(streamingDecisionEventData(events(chairNotice)[0])!.cardId, 'notice');
    /* the board */
    const moved = (() => {
        const now = platformOf(chair);
        return { ...chair, ownedStreamingPlatform: { ...now, eventLedger: [...now.eventLedger, { id: 'x', idempotencyKey: 'x', absoluteWeek: absolute, type: 'FOUNDER_ROLE_CHANGED' as const, summary: 'moved', source: 'PLAYER_ACTION' as const, metadata: { kind: 'BOARD_MOVED' } }] } };
    })();
    const movedQueue = queueStreamingDecisionEvents(moved, absolute);
    const movedData = streamingDecisionEventData(events(movedQueue)[0])!;
    assert.equal(movedData.kind, 'BOARD_MOVED');
    const movedView = getStreamingDecisionView(movedQueue, movedData)!;
    assert.match(movedView.title, /moved you to chair/);
    assert.ok(movedView.answers.some(item => item.id === 'ACCEPT'));
    const acceptance = answerStreamingDecisionEvent(movedQueue, movedData, 'ACCEPT');
    assert.ok(acceptance.changed, 'it closes');
    pass('a chair gets only the board\'s and the chief executive\'s matters: "' + movedView.title + '"');

    /* ── through the week itself ── */
    const stepped = await processGameWeek(withCards(base, []));
    const forWeek = (stepped.player.pendingEvents || []).filter(event => event.type === 'STREAMING_DECISION' || event.type === 'STREAMING_INCIDENT');
    assert.ok(forWeek.filter(event => event.type === 'STREAMING_DECISION').length <= STREAMING_DECISIONS_A_WEEK, 'the week queues them');
    pass(`the weekly close queues them after the team has run (${forWeek.length} this week)`);

    console.log(`Decision popups audit passed in ${Math.round((Date.now() - started) / 1000)} s.`);
};

main().catch(error => { console.error(error); process.exit(1); });
