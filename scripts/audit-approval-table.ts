/**
 * #228–#231: the table. Where someone else must say yes, the action opens a count: seats on a board, or holders by percent.
 * Each seat's vote follows confidence, the size of the ask and that person; the same week gives the same answer; one call can
 * move someone close; a no holds for 4 weeks; at 51% or more there is no vote.
 */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { streamingApprovalGate } from '../services/streamingApproval';
import {
    applyStreamingApprovalCall,
    callStreamingSeat,
    getStreamingApprovalMeeting,
    settleStreamingApproval,
    streamingApprovalCount,
} from '../services/streamingApprovalMeeting';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { payStreamingFounderBonus, setStreamingFounderSalary, streamingCeoMarketPay, takeStreamingMoneyOut } from '../services/streamingYourMoney';
import { atTheTable } from './fixtures/atTheTable';

const pass = (label: string) => console.log(`✓ ${label}`);
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
const withPlatform = (player: Player, change: (platform: ReturnType<typeof platformOf>) => ReturnType<typeof platformOf>): Player => ({ ...player, ownedStreamingPlatform: change(platformOf(player)) });
const later = (player: Player, weeks: number): Player => {
    const total = player.currentWeek - 1 + weeks;
    return { ...player, age: player.age + Math.floor(total / 52), currentWeek: (total % 52) + 1 };
};
const director = (id: string, name: string, overrides: Record<string, unknown> = {}) => ({
    id, candidateId: id, name, seatType: 'INDEPENDENT', status: 'ACTIVE', preferredStrategy: 'BALANCED', independence: 50, founderRelationship: 50,
    weeklyCompensation: 50_000, appointedAtAbsoluteWeek: 1, endedAtAbsoluteWeek: null, linkedInvestorId: null, ...overrides,
});

const main = async () => {
    const seed = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'table', name: 'Table Founder', age: 40, currentWeek: 1 });
    const fresh = { ...seed, energy: { current: 100, max: 100 }, flags: { ...seed.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
    const built: Player = await buildStreamingFullPlatformQa(fresh, { processWeek: processGameWeek, persistWeek: async next => next });
    const board = [director('d1', 'Meera Sen'), director('d2', 'Thomas Adebayo', { preferredStrategy: 'GROWTH_FIRST' }), director('d3', 'Lucia Reyes', { preferredStrategy: 'MARGIN_FIRST' })];
    const minorityAt = (confidence: number) => withPlatform(built, platform => ({ ...platform, founderOwnershipPercent: 40, treasuryCash: 5_000_000_000, governance: { ...platform.governance, boardConfidence: confidence, directors: board as never, approvals: [] } }));
    const ASK = 200_000_000;

    /* ── at 51% or more there is no vote ── */
    const yours = withPlatform(built, platform => ({ ...platform, founderOwnershipPercent: 80, treasuryCash: 5_000_000_000 }));
    const straight = takeStreamingMoneyOut(yours, 1_000_000);
    assert.ok(straight.changed && !straight.vote, straight.message);
    pass('at 51% or more it is yours: no table');

    /* ── under it, a table: seats, the CFO first on money, a vote per person ── */
    const middling = minorityAt(62);
    const asked = takeStreamingMoneyOut(middling, ASK);
    assert.ok(!asked.changed && asked.vote, 'under 51% it asks');
    assert.equal(platformOf(asked.player).treasuryCash, platformOf(middling).treasuryCash, 'asking moves nothing');
    const meeting = getStreamingApprovalMeeting(middling, asked.vote!.ask, asked.vote!.context);
    assert.equal(meeting.mode, 'BOARD');
    assert.equal(meeting.seats.length, 4, 'you and the three directors');
    assert.equal(meeting.carriesOn, 3);
    assert.equal(meeting.seats[0].who, 'You');
    assert.equal(meeting.seats[0].callable, false, 'you do not lobby yourself');
    assert.ok(meeting.speaker && /CHIEF FINANCIAL/.test(meeting.speaker.role), 'the CFO reads it first');
    assert.ok(meeting.seats.slice(1).every(seat => seat.reason.length > 0), 'each says why');
    pass(`a seat each: ${meeting.seats.map(seat => `${seat.who} ${seat.forShare ? 'for' : 'against'}`).join(', ')}; ${meeting.speaker!.name}: ${meeting.speaker!.chip}`);

    /* ── the same week, the same answer ── */
    const again = getStreamingApprovalMeeting(middling, asked.vote!.ask, asked.vote!.context);
    assert.deepEqual(again.seats.map(seat => seat.lean), meeting.seats.map(seat => seat.lean), 'seeded by week and motion');
    const nextWeek = getStreamingApprovalMeeting(later(middling, 1), asked.vote!.ask, asked.vote!.context);
    assert.notDeepEqual(nextWeek.seats.map(seat => seat.lean), meeting.seats.map(seat => seat.lean), 'another week, other minds');
    pass('the same week gives the same answer; another week can differ');

    /* ── confidence, and the size of the ask, carry it ── */
    const small = (confidence: number, amount: number) => {
        const player = minorityAt(confidence);
        const result = takeStreamingMoneyOut(player, amount);
        return atTheTable(player, result, next => takeStreamingMoneyOut(next, amount));
    };
    assert.ok(small(100, 1_000_000).carried, 'a trusted founder, a small ask');
    assert.ok(!small(5, 1_000_000).carried, 'an unhappy board');
    const treasury = platformOf(minorityAt(62)).treasuryCash;
    const huge = minorityAt(70);
    const hugeAsk = Math.round(treasury * 0.4 * 0.4);
    const hugeMeeting = getStreamingApprovalMeeting(huge, takeStreamingMoneyOut(huge, hugeAsk).vote!.ask, takeStreamingMoneyOut(huge, hugeAsk).vote!.context);
    const smallMeeting = getStreamingApprovalMeeting(huge, takeStreamingMoneyOut(huge, 1_000_000).vote!.ask, takeStreamingMoneyOut(huge, 1_000_000).vote!.context);
    assert.ok(hugeMeeting.seats[1].lean < smallMeeting.seats[1].lean, 'a bigger ask leans them away');
    pass('confidence 100 carries a small ask, confidence 5 does not; a bigger ask leans them away');

    /* ── carried: the action runs, once ── */
    const carried = small(100, 1_000_000);
    assert.ok(carried.done?.changed, carried.done?.message);
    assert.ok(platformOf(carried.done!.player).treasuryCash < platformOf(minorityAt(100)).treasuryCash, 'the money left only after the count');
    const week = getAbsoluteWeek(carried.done!.player.age, carried.done!.player.currentWeek);
    assert.equal(streamingApprovalGate(platformOf(carried.done!.player), { kind: 'MONEY_OUT', amount: 1_000_000 }, week).state, 'BLOCKED', 'a yes is used once; it has met this week');
    assert.match(takeStreamingMoneyOut(carried.done!.player, 1_000_000).message, /already met/);
    assert.equal(streamingApprovalGate(platformOf(later(carried.done!.player, 1)), { kind: 'MONEY_OUT', amount: 1_000_000 }, week + 1).state, 'ASK');
    pass('carried: the money leaves after the count; the yes is used once; next week it can ask again');

    /* ── a no holds for 4 weeks, and costs a little confidence ── */
    const refused = small(5, 1_000_000);
    assert.ok(!refused.carried);
    assert.equal(platformOf(refused.player).governance.boardConfidence, 3, 'losing a vote shows');
    assert.equal(platformOf(refused.player).treasuryCash, platformOf(minorityAt(5)).treasuryCash, 'nothing moved');
    assert.match(takeStreamingMoneyOut(refused.player, 2_000_000).message, /said no.*4 weeks/, 'any amount');
    assert.match(takeStreamingMoneyOut(later(refused.player, 3), 1_000_000).message, /1 week/);
    assert.ok(takeStreamingMoneyOut(later(refused.player, 4), 1_000_000).vote, 'after 4 weeks it hears it again');
    pass('not carried: nothing moves, confidence −2, and it will not hear it again for 4 weeks');

    /* ── one call ── */
    const seat = { ...meeting.seats[1], lean: -3, forShare: 0, relationship: 80, independence: 50, strategy: 'BALANCED' };
    assert.ok(callStreamingSeat(seat, 'LOYALTY').seat.lean > 0, 'a friend close to yes');
    assert.match(callStreamingSeat(seat, 'LOYALTY').reply, /I will vote for it/);
    assert.match(callStreamingSeat({ ...seat, lean: -40 }, 'LOYALTY').reply, /does not change my vote/, 'a hard no stays');
    assert.match(callStreamingSeat({ ...seat, lean: 5, forShare: 1 }, 'NUMBERS').reply, /already had me/, 'a wasted call');
    const needsOne = { ...meeting, seats: [meeting.seats[0], { ...seat, id: 'a' }, { ...seat, id: 'b', lean: 4, forShare: 1 }, { ...seat, id: 'c', lean: -30 }] };
    assert.equal(streamingApprovalCount(needsOne, needsOne.seats).carried, false, 'two of four: not enough');
    const { seats: moved } = applyStreamingApprovalCall(needsOne, { seatId: 'a', argumentId: 'LOYALTY' });
    assert.equal(streamingApprovalCount(needsOne, moved).carried, true, 'the call turned it');
    assert.equal(settleStreamingApproval(middling, needsOne, { seatId: 'a', argumentId: 'LOYALTY' }).carried, true);
    pass('one call moves someone close, never a hard no; a call on a yes is wasted; it can turn the count');

    /* ── salary and bonus: inside the limit nobody votes ── */
    const market = streamingCeoMarketPay(platformOf(minorityAt(62)));
    assert.ok(setStreamingFounderSalary(minorityAt(62), market).changed, 'up to the market is agreed');
    assert.ok(setStreamingFounderSalary(minorityAt(62), market * 2).vote, 'more goes to the board');
    assert.ok(payStreamingFounderBonus(minorityAt(62), 1_000_000_000).vote, 'a big bonus too');
    pass('salary and bonus: agreed up to the limit; more goes to the table');

    /* ── no real board: the holders are counted ── */
    const thin = withPlatform(minorityAt(62), platform => ({ ...platform, governance: { ...platform.governance, directors: [] } }));
    const thinResult = takeStreamingMoneyOut(thin, 1_000_000);
    const thinMeeting = getStreamingApprovalMeeting(thin, thinResult.vote!.ask, thinResult.vote!.context);
    assert.equal(thinMeeting.mode, 'HOLDERS');
    assert.ok(thinMeeting.seats.some(item => item.who === 'You' && item.weight === 40));
    pass(`with no real board the holders are counted by percent: ${thinMeeting.seats.map(item => `${item.who} ${item.role}`).join(', ')}`);

    /* ── the record survives a save ── */
    const stored = platformOf(JSON.parse(JSON.stringify(refused.player)));
    assert.equal(stored.governance.approvals?.length, 1);
    assert.deepEqual(stored.governance.approvals, platformOf({ ...refused.player, ownedStreamingPlatform: stored }).governance.approvals, 'normalising twice changes nothing');
    assert.match(takeStreamingMoneyOut({ ...refused.player, ownedStreamingPlatform: stored }, 1_000_000).message, /said no/, 'and the wait holds after a reload');
    pass('the record survives a reload, and the wait with it');
};

main().then(() => console.log('approval-table audit passed')).catch(error => { console.error(error); process.exit(1); });
