/** #181 (plan §22.4): an executive's stats change what their work comes to.
 *  - skill: every job with money in it lands under or over budget by skill; rarely a great move (20% back) or a slip
 *    (15% more). A weak hire is rarely great but can be; a star rarely slips. Seeded: trying again changes nothing;
 *  - the money is booked once as a team result, so the treasury and the books agree;
 *  - a network order: a great move brings it forward a week, a slip pushes it back;
 *  - ambition: 80+ one more job a week, under 40 one fewer; 75+ ask for a raise every 26 weeks (yes: pay +8% and
 *    loyalty +5; no: loyalty −10);
 *  - ethics under 45: padded expenses some quarters (two weeks of pay);
 *  - loyalty under 45: a 25% chance of leaving after a quarter under pressure, one roll a review;
 *  - each executive's page says what their stats do. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type OwnedStreamingCycleReview, type OwnedStreamingExecutiveAppointment, type OwnedStreamingPlatformState, type Player, type StreamingTeamSeatId } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { getStreamingFinanceRoom } from '../services/streamingFinanceRoom';
import { STREAMING_TEAM_JOBS, streamingTeamSeatHolders } from '../services/team/teamState';
import {
    approveStreamingTeamCard,
    declineStreamingTeamCard,
    getStreamingTeamView,
    runStreamingTeamWeek,
    setStreamingTeamJobMode,
} from '../services/team/streamingTeam';
import { streamingTeamRaiseAnswerLoyalty, streamingTeamRaiseDue, streamingTeamRaiseAsk, streamingTeamPayAfterLevel,
    rollStreamingTeamOutcome,
    shiftStreamingTeamOrder,
    streamingTeamEthicsChance,
    streamingTeamGreatChance,
    streamingTeamLeavesAfterBadQuarter,
    streamingTeamOutcomeMoney,
    streamingTeamPaddedExpenses,
    streamingTeamSlipChance,
    streamingTeamStatMeaning,
} from '../services/team/teamOutcomes';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Team Outcomes', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
const weekOf = (player: Player) => getAbsoluteWeek(player.age, player.currentWeek);
const withEnergy = (player: Player, amount = 100): Player => ({ ...player, energy: { current: amount, max: Math.max(100, amount) }, flags: { ...player.flags, weeklyBaseEnergyRemaining: amount, bonusEnergyBank: 0 } });
/** the same career, some weeks later (only the week moves) */
const later = (player: Player, weeks: number): Player => {
    const total = player.currentWeek - 1 + weeks;
    return withEnergy({ ...player, age: player.age + Math.floor(total / 52), currentWeek: (total % 52) + 1 });
};
const withPlatform = (player: Player, change: (platform: OwnedStreamingPlatformState) => OwnedStreamingPlatformState): Player => (
    { ...player, ownedStreamingPlatform: change(platformOf(player)) }
);
const withExecutive = (player: Player, seatId: StreamingTeamSeatId, patch: Partial<OwnedStreamingExecutiveAppointment>): Player => withPlatform(player, platform => {
    const holder = streamingTeamSeatHolders(platform.leadership.appointments).holders.get(seatId)!;
    return { ...platform, leadership: { ...platform.leadership, appointments: platform.leadership.appointments.map(item => (item.id === holder.id ? { ...item, ...patch } : item)) } };
});
const holderOf = (player: Player, seatId: StreamingTeamSeatId) => streamingTeamSeatHolders(platformOf(player).leadership.appointments).holders.get(seatId);
/* the build's own weekly close already ran the team this week; run it again as a fresh run, from an empty tray */
const rerun = (player: Player): Player => withPlatform(player, platform => {
    const team = platform.leadership.team!;
    return { ...platform, leadership: { ...platform.leadership, team: {
        ...team, lastRunAbsoluteWeek: null, report: [], tray: [],
        seats: team.seats.map(seat => ({ ...seat, usageWeek: 0, moneyUsed: 0, energyUsed: 0, actionsUsed: 0 })),
    } } };
});
const allJobs = (player: Player, mode: 'DO' | 'ASK'): Player => {
    let next = player;
    for (const job of STREAMING_TEAM_JOBS) {
        const result = setStreamingTeamJobMode(next, job.seatId, job.id, mode);
        if (result.changed) next = result.player;
    }
    return next;
};
const rich = (player: Player): Player => withPlatform(player, platform => ({ ...platform, treasuryCash: 50_000_000_000 }));
const pass = (label: string) => console.log(`✓ ${label}`);
const millions = (value: number) => `$${(value / 1e6).toFixed(2)}M`;
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

async function main() {
    const started = performance.now();

    /* ── the odds, by skill: a weak hire is rarely great, but sometimes; a star rarely slips ── */
    const odds = (skill: number) => {
        let great = 0;
        let slip = 0;
        const rolls = 20_000;
        for (let index = 0; index < rolls; index += 1) {
            const outcome = rollStreamingTeamOutcome('audit-seed', 'audit-exec', `job-${index}`, skill);
            if (outcome === 'GREAT') great += 1;
            if (outcome === 'SLIP') slip += 1;
        }
        return { great: great / rolls, slip: slip / rolls };
    };
    const weak = odds(30);
    const star = odds(90);
    assert.ok(Math.abs(weak.great - streamingTeamGreatChance(30)) < 0.006 && Math.abs(star.slip - streamingTeamSlipChance(90)) < 0.006, 'the rolls follow the stated odds');
    assert.ok(weak.great > 0.015 && weak.great < 0.05, 'a weak hire is rarely great, but sometimes');
    assert.ok(star.great > weak.great * 2, 'a star has a great move more than twice as often');
    assert.ok(weak.slip > star.slip * 3, 'a weak hire slips more than three times as often');
    assert.equal(rollStreamingTeamOutcome('audit-seed', 'audit-exec', 'job-7', 55), rollStreamingTeamOutcome('audit-seed', 'audit-exec', 'job-7', 55), 'seeded: trying again changes nothing');
    pass(`odds: skill 30 great ${percent(weak.great)}, slip ${percent(weak.slip)}; skill 90 great ${percent(star.great)}, slip ${percent(star.slip)} (20,000 rolls each)`);

    /* ── the money ── */
    assert.equal(streamingTeamOutcomeMoney('PLAN', 80, 10_000_000).delta, 600_000, 'skill 80: 6% under budget');
    assert.equal(streamingTeamOutcomeMoney('PLAN', 30, 10_000_000).delta, -400_000, 'skill 30: 4% over budget');
    assert.equal(streamingTeamOutcomeMoney('PLAN', 50, 10_000_000).delta, 0, 'skill 50: on budget');
    assert.equal(streamingTeamOutcomeMoney('GREAT', 30, 10_000_000).delta, 2_000_000, 'a great move: 20% back');
    assert.equal(streamingTeamOutcomeMoney('SLIP', 90, 10_000_000).delta, -1_500_000, 'a slip: 15% more');
    pass('on a $10M job: skill 80 +$0.6M back, skill 50 on budget, skill 30 $0.4M more; a great move $2M back, a slip $1.5M more');

    /* ── what the stats mean, in words ── */
    const meaning = streamingTeamStatMeaning({ skill: 80, loyalty: 61, ambition: 85, ethics: 30 });
    assert.equal(meaning.skill, 'Jobs 6% under budget · great move 7% · slip 3%');
    assert.equal(meaning.ambition, 'One more job a week · asks for a raise every 6 months');
    assert.equal(meaning.ethics, 'May pad expenses: about 7% a quarter');
    assert.equal(meaning.loyalty, 'Stays through a hard quarter');
    const weakHire = streamingTeamStatMeaning({ skill: 30, loyalty: 30, ambition: 35, ethics: 85 });
    assert.equal(weakHire.skill, 'Jobs 4% over budget · great move 3% · slip 9%');
    assert.equal(weakHire.ambition, 'One job fewer a week · a yearly review');
    assert.equal(weakHire.ethics, 'Clean books');
    assert.equal(weakHire.loyalty, 'May quit after a hard quarter: 1 in 4');
    pass(`their page: "${meaning.skill}" / "${meaning.loyalty}" / "${meaning.ambition}" / "${meaning.ethics}"`);

    /* ── a network order moves with the outcome ── */
    const orderPlatform = {
        networkOrders: [
            { id: 'order-a', orderedAtAbsoluteWeek: 500, readyAtAbsoluteWeek: 504, orderedBy: { name: 'Ada Stone', seatId: 'TECHNOLOGY' } },
            { id: 'order-b', orderedAtAbsoluteWeek: 500, readyAtAbsoluteWeek: 504 },
        ],
    } as unknown as OwnedStreamingPlatformState;
    const readyOf = (platform: OwnedStreamingPlatformState, id: string) => platform.networkOrders!.find(order => order.id === id)!.readyAtAbsoluteWeek;
    assert.equal(readyOf(shiftStreamingTeamOrder(orderPlatform, 'Ada Stone', 500, 'GREAT'), 'order-a'), 503, 'a great move: a week early');
    assert.equal(readyOf(shiftStreamingTeamOrder(orderPlatform, 'Ada Stone', 500, 'SLIP'), 'order-a'), 505, 'a slip: a week late');
    assert.equal(shiftStreamingTeamOrder(orderPlatform, 'Ada Stone', 500, 'PLAN'), orderPlatform, 'to plan: unchanged');
    assert.equal(readyOf(shiftStreamingTeamOrder(orderPlatform, 'Ada Stone', 500, 'SLIP'), 'order-b'), 504, 'only their own order moves');
    pass('a network order: a great move ready week 503 instead of 504, a slip week 505; to plan, unchanged');

    /* ── the test company: every job Do it, a fresh run ── */
    let base = withEnergy(await buildStreamingFullPlatformQa(fresh('team-outcomes'), { processWeek: processGameWeek, persistWeek: async next => next }));
    base = rich(base);
    const week = weekOf(base);
    /* eight weeks of the team's own runs, every job Do it */
    let doing = runStreamingTeamWeek(rerun(allJobs(base, 'DO')));
    const done: NonNullable<OwnedStreamingPlatformState['leadership']['team']>['report'] = [];
    for (let step = 0; step < 8; step += 1) {
        if (step > 0) doing = runStreamingTeamWeek(later(doing, 1));
        const at = weekOf(doing);
        done.push(...platformOf(doing).leadership.team!.report.filter(entry => entry.kind === 'DONE' && entry.absoluteWeek === at));
    }
    const withMoney = done.filter(entry => entry.outcome);
    assert.ok(withMoney.length >= 2, `jobs with money in them settle (${withMoney.length} of ${done.length})`);
    withMoney.forEach(entry => assert.match(entry.detail, /under budget|over budget|On budget|A great move|A slip/, `${entry.title}: the minutes say how it went`));
    done.filter(entry => !entry.outcome).forEach(entry => assert.equal(entry.cost, 0, `${entry.title}: a job without an outcome spent nothing`));
    const results = platformOf(doing).eventLedger.filter(entry => entry.type === 'TEAM_RESULT' && entry.absoluteWeek >= week && !entry.idempotencyKey.startsWith('team-result:expenses:'));
    assert.ok(results.length >= 1 && results.length <= withMoney.length, 'each settled job booked once');
    const room = getStreamingFinanceRoom(doing, 'ALL').ledger.filter(entry => entry.label === 'Team came in under budget' || entry.label === 'Team went over budget');
    assert.ok(room.length >= results.length, 'the books show each one');
    const net = results.reduce((sum, entry) => sum + Number(entry.metadata?.refund || 0) - Number(entry.metadata?.overrun || 0), 0);
    pass(`8 weeks of every job Do it: ${withMoney.length} of ${done.length} jobs had money and settled (${withMoney.map(entry => `${entry.title.slice(0, 26)}: ${entry.outcome}`).join('; ')}); ${results.length} team results in the books, net ${millions(net)}`);

    /* ── approving a card settles the same way ── */
    const asking = runStreamingTeamWeek(rerun(allJobs(base, 'ASK')));
    const card = platformOf(asking).leadership.team!.tray.find(item => item.status === 'WAITING' && item.cost > 0 && item.jobId !== 'RIVAL_CALL');
    assert.ok(card, 'a card with a price waits');
    const approved = approveStreamingTeamCard(asking, card!.id);
    assert.ok(approved.changed, 'approved');
    const entry = platformOf(approved.player).leadership.team!.report.find(item => item.kind === 'APPROVED' && item.title === card!.title)!;
    assert.ok(entry.outcome, 'the approved job has an outcome');
    assert.match(entry.detail, /^Approved by you\. /, 'the minutes say approved, and how it went');
    const again = approveStreamingTeamCard(approved.player, card!.id);
    assert.ok(!again.changed, 'a card is approved once');
    pass(`approved "${card!.title}" (${millions(card!.cost)}): ${entry.outcome}, "${entry.detail}"`);

    /* ── ambition: jobs a week ── */
    const seatId: StreamingTeamSeatId = 'MARKETING';
    const level = holderOf(base, seatId)!.level;
    const perWeek = (player: Player) => getStreamingTeamView(player).seats.find(seat => seat.seatId === seatId)!.usage.actionsPerWeek;
    const keen = perWeek(withExecutive(base, seatId, { ambition: 85 }));
    const settled = perWeek(withExecutive(base, seatId, { ambition: 60 }));
    const content = perWeek(withExecutive(base, seatId, { ambition: 35 }));
    assert.equal(keen, settled + 1, 'ambition 85: one more job a week');
    assert.equal(content, Math.max(1, settled - 1), 'ambition 35: one fewer');
    pass(`ambition (level ${level}): 85 → ${keen} jobs a week, 60 → ${settled}, 35 → ${content}`);

    /* ── a raise: due every 26 weeks at our table for ambition 75+ ── */
    const pay = holderOf(base, seatId)!.weeklyCompensation;
    const loyalty = holderOf(base, seatId)!.loyalty;
    const due = runStreamingTeamWeek(rerun(withExecutive(base, seatId, { ambition: 80, appointedAtAbsoluteWeek: week - 26 })));
    const raise = platformOf(due).leadership.team!.tray.find(item => item.jobId === 'RAISE' && item.status === 'WAITING');
    assert.ok(raise && raise.action.kind === 'RAISE', 'a raise card waits');
    const asked = raise!.action.kind === 'RAISE' ? raise!.action.weekly : 0;
    assert.equal(asked, Math.round(pay * 1.08 / 5_000) * 5_000, '+8%');
    assert.equal(raise!.cost, 0);
    const notDue = runStreamingTeamWeek(rerun(withExecutive(base, seatId, { ambition: 60, appointedAtAbsoluteWeek: week - 26 })));
    assert.ok(!platformOf(notDue).leadership.team!.tray.some(item => item.jobId === 'RAISE'), 'ambition 60 does not ask');
    /* #197: your own figure: less than asked costs loyalty by the gap, the pay follows what you gave */
    const half = Math.round(((pay + asked) / 2) / 5_000) * 5_000;
    const partly = approveStreamingTeamCard(due, raise!.id, undefined, half);
    assert.equal(holderOf(partly.player, seatId)!.weeklyCompensation, half, 'the pay follows your figure');
    assert.ok(holderOf(partly.player, seatId)!.loyalty < loyalty, `less than asked costs loyalty (${loyalty} → ${holderOf(partly.player, seatId)!.loyalty})`);
    assert.equal(streamingTeamRaiseAnswerLoyalty(1_100, 1_000, 1_000), -10);
    assert.equal(streamingTeamRaiseAnswerLoyalty(1_100, 1_000, 1_100), 5);
    assert.ok(streamingTeamRaiseAnswerLoyalty(1_100, 1_000, 1_150) > 5, 'more than asked buys more');
    /* #197: everyone has a yearly review, 3–8% by ambition and results */
    assert.equal(streamingTeamRaiseDue({ ambition: 60, appointedAtAbsoluteWeek: 100 } as OwnedStreamingExecutiveAppointment, 152), 1);
    assert.equal(streamingTeamRaiseDue({ ambition: 60, appointedAtAbsoluteWeek: 100 } as OwnedStreamingExecutiveAppointment, 126), null);
    assert.equal(streamingTeamRaiseAsk({ ambition: 90, performance: 50 }), 8);
    const review = streamingTeamRaiseAsk({ ambition: 60, performance: 60 });
    assert.ok(review >= 3 && review <= 8, `a review asks 3–8% (${review}%)`);
    /* #197: a level up pays 15% more */
    assert.equal(streamingTeamPayAfterLevel(190_000), 220_000);
    pass(`your figure: ${millions(half)} a week costs loyalty ${loyalty} → ${holderOf(partly.player, seatId)!.loyalty}; a yearly review asks ${review}%; level up $190K → $220K`);
    const gave = approveStreamingTeamCard(due, raise!.id);
    assert.ok(gave.changed);
    assert.equal(holderOf(gave.player, seatId)!.weeklyCompensation, asked, 'their pay follows');
    assert.equal(holderOf(gave.player, seatId)!.loyalty, Math.min(100, loyalty + 5), 'a yes: loyalty +5');
    const refused = declineStreamingTeamCard(due, raise!.id);
    assert.equal(holderOf(refused.player, seatId)!.loyalty, Math.max(0, loyalty - 10), 'a no: loyalty −10');
    assert.ok(platformOf(refused.player).leadership.team!.report.some(item => item.kind === 'DECLINED' && /loyalty fell by 10/.test(item.detail)));
    const rerunDue = runStreamingTeamWeek(withPlatform(due, platform => ({ ...platform, leadership: { ...platform.leadership, team: { ...platform.leadership.team!, lastRunAbsoluteWeek: null } } })));
    assert.equal(platformOf(rerunDue).leadership.team!.tray.filter(item => item.jobId === 'RAISE').length, 1, 'asked once a period');
    pass(`a raise after 26 weeks (ambition 80): ${millions(pay)} → ${millions(asked)} a week; yes: loyalty ${loyalty} → ${holderOf(gave.player, seatId)!.loyalty}; no: ${holderOf(refused.player, seatId)!.loyalty}`);

    /* ── ethics: padded expenses some quarters ── */
    const probe = holderOf(base, seatId)!;
    const quarters = 2_000;
    let padded = 0;
    for (let index = 1; index <= quarters; index += 1) {
        if (streamingTeamPaddedExpenses('audit-seed', { ...probe, ethics: 20, appointedAtAbsoluteWeek: 0 }, index * 13) > 0) padded += 1;
    }
    assert.ok(Math.abs(padded / quarters - streamingTeamEthicsChance(20)) < 0.02, `ethics 20 pads about ${percent(streamingTeamEthicsChance(20))} of quarters`);
    assert.equal(streamingTeamPaddedExpenses('audit-seed', { ...probe, ethics: 60, appointedAtAbsoluteWeek: 0 }, 13), 0, 'ethics 60 never');
    const seed = platformOf(base).simulationSeed;
    let hit = -1;
    for (let offset = 1; offset < 400 && hit < 0; offset += 1) {
        if (streamingTeamPaddedExpenses(seed, { ...probe, ethics: 20, appointedAtAbsoluteWeek: week + offset - 13 }, week + offset) > 0) hit = offset;
    }
    assert.ok(hit > 0, 'a quarter where it happens');
    const careless = runStreamingTeamWeek(withExecutive(later(base, hit), seatId, { ethics: 20, appointedAtAbsoluteWeek: week + hit - 13 }));
    const expense = platformOf(careless).eventLedger.find(item => item.idempotencyKey === `team-result:expenses:${probe.id}:${week + hit}`);
    assert.ok(expense && expense.metadata?.overrun === probe.weeklyCompensation * 2, 'two weeks of pay, booked');
    assert.ok(platformOf(careless).leadership.team!.report.some(item => item.kind === 'NOTE' && item.outcome === 'SLIP' && /padded their expenses/.test(item.title)), 'the minutes say so');
    assert.ok(getStreamingFinanceRoom(careless, 'ALL').ledger.some(item => item.label === 'Team went over budget' && item.cashDelta === -probe.weeklyCompensation * 2), 'the books show it');
    pass(`ethics 20: padded ${percent(padded / quarters)} of ${quarters} quarters (ethics 60: never); on the test company ${millions(probe.weeklyCompensation * 2)} in week ${week + hit}, in the minutes and the books`);

    /* ── loyalty: a quarter under pressure ── */
    const lastReview = platformOf(base).cycleReviews.at(-1);
    assert.ok(lastReview, 'the test company has a review to copy');
    let reviewId = '';
    for (let index = 0; index < 200 && !reviewId; index += 1) {
        if (streamingTeamLeavesAfterBadQuarter(seed, { ...probe, loyalty: 30 }, `audit-review-${index}`)) reviewId = `audit-review-${index}`;
    }
    const pressured = (player: Player, tier: OwnedStreamingCycleReview['performanceTier']) => withPlatform(player, platform => ({
        ...platform,
        cycleReviews: [...platform.cycleReviews, { ...lastReview!, id: reviewId, kind: 'TWELVE_WEEK_REVIEW' as const, performanceTier: tier, endAbsoluteWeek: week - 1 }],
    }));
    const left = runStreamingTeamWeek(rerun(pressured(withExecutive(base, seatId, { loyalty: 30 }), 'UNDER_PRESSURE')));
    /* #200: they give four weeks' notice first */
    assert.equal(platformOf(left).leadership.appointments.find(item => item.id === probe.id)!.notice?.reason, 'HARD_QUARTER', 'loyalty 30: they give notice');
    assert.ok(platformOf(left).leadership.team!.report.some(item => /has given notice/.test(item.title)), 'the minutes say so');
    assert.ok(platformOf(left).leadership.team!.tray.some(card => card.jobId === 'NOTICE' && card.status === 'WAITING'), 'a card to answer');
    const stayed = runStreamingTeamWeek(rerun(pressured(withExecutive(base, seatId, { loyalty: 60 }), 'UNDER_PRESSURE')));
    assert.equal(holderOf(stayed, seatId)?.id, probe.id, 'loyalty 60: they stay');
    const calm = runStreamingTeamWeek(rerun(pressured(withExecutive(base, seatId, { loyalty: 30 }), 'STEADY')));
    assert.equal(holderOf(calm, seatId)?.id, probe.id, 'a steady quarter: they stay');
    let leavers = 0;
    for (let index = 0; index < 2_000; index += 1) if (streamingTeamLeavesAfterBadQuarter(seed, { ...probe, loyalty: 30 }, `rate-${index}`)) leavers += 1;
    assert.ok(Math.abs(leavers / 2_000 - 0.25) < 0.03, 'about a quarter of the time');
    pass(`a quarter under pressure: loyalty 30 leaves ${percent(leavers / 2_000)} of the time (notice here, a card and the minutes); loyalty 60 or a steady quarter, they stay`);

    /* ── their page ── */
    const view = getStreamingTeamView(withExecutive(base, seatId, { skill: 80, loyalty: 61, ambition: 85, ethics: 30 })).seats.find(seat => seat.seatId === seatId)!;
    assert.deepEqual(view.executive!.meaning, meaning, 'the page reads the same words');
    pass('the executive page reads what their stats do');

    console.log(`\nteam outcomes audit passed in ${((performance.now() - started) / 1000).toFixed(1)}s`);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
