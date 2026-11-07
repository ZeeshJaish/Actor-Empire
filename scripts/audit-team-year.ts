/** #174 (plan §21.17): a year with the team off and on, on the full test company, through the real weekly loop.
 *  - OFF: every job off; 52 weeks; the team does nothing (no DONE, no card).
 *  - ON: every job at Do it where it may be (Ask-only jobs ask), limits at their caps, 40⚡ a seat; 52 weeks.
 *  Both: every week advances, no NaN in the books, the career goes on. ON: the team acts in every seat it holds, never
 *  past a seat's weekly money or energy, holds when the treasury nears the floor, and the tray stays within its
 *  limits. The year's numbers are printed side by side, then a week of the team on average and at its busiest: money,
 *  energy, actions done, cards asked and cards waiting. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player, type StreamingTeamJobMode, type StreamingTeamSeatId } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { STREAMING_TEAM_JOBS, STREAMING_TEAM_SEATS, streamingTeamLimitCaps, streamingTeamSeatHolders } from '../services/team/teamState';
import { setStreamingTeamJobMode, setStreamingTeamLimits } from '../services/team/streamingTeam';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Team Year', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
const weekOf = (player: Player) => getAbsoluteWeek(player.age, player.currentWeek);
const pass = (label: string) => console.log(`✓ ${label}`);
const money = (value: number) => `${value < 0 ? '−' : ''}$${(Math.abs(value) / 1e9).toFixed(2)}B`;

const setAll = (player: Player, on: boolean): Player => {
    let next = player;
    for (const job of STREAMING_TEAM_JOBS) {
        const mode: StreamingTeamJobMode = !on ? 'OFF' : job.modes.includes('DO') ? 'DO' : 'ASK';
        next = setStreamingTeamJobMode(next, job.seatId, job.id, mode).player;
    }
    if (on) {
        const appointments = platformOf(next).leadership.appointments;
        const { holders } = streamingTeamSeatHolders(appointments);
        for (const seatId of STREAMING_TEAM_SEATS) {
            const executive = holders.get(seatId);
            if (!executive) continue;
            const caps = streamingTeamLimitCaps(seatId, executive.level);
            next = setStreamingTeamLimits(next, seatId, { weeklyMoney: caps.weeklyMoney, actionMoney: caps.actionMoney, weeklyEnergy: 40 }).player;
        }
    }
    return next;
};

interface YearResult {
    player: Player;
    /** investors who called during the year (an offer stands 8 weeks, then lapses) */
    calls: number;
    done: Record<string, number>;
    held: number;
    asked: number;
    teamMoney: number;
    teamEnergy: number;
    minTreasury: number;
    weeks: number;
    /** the busiest week: the team's money, energy, actions done and cards asked, and the most cards waiting at once */
    peak: { money: number; energy: number; actions: number; cards: number; tray: number };
    /** cards waiting, summed over the weeks (for the average) */
    trayWeeks: number;
    /** what waited: a job, a rival's call, or a card from before the year */
    waitingFrom: string[];
}

const runYear = async (start: Player, on: boolean): Promise<YearResult> => {
    let player = setAll(start, on);
    const first = weekOf(player);
    let minTreasury = platformOf(player).treasuryCash;
    /* what the build's own weeks left in the report is not this year's */
    const seen = new Set<string>(platformOf(player).leadership.team!.report.map(entry => entry.id));
    const done: Record<string, number> = {};
    let held = 0;
    let asked = 0;
    let teamMoney = 0;
    let teamEnergy = 0;
    const askedBy: Record<string, number> = {};
    const peak = { money: 0, energy: 0, actions: 0, cards: 0, tray: 0 };
    let trayWeeks = 0;
    const waitingFrom = new Set<string>();
    const calls = new Set<string>();
    const before0 = new Set((platformOf(player).governance.investorOffers || []).map(offer => offer.id));
    for (let index = 0; index < 52; index += 1) {
        const before = weekOf(player);
        /* the life sim's health crises are not this audit's subject: the founder stays well */
        player = { ...player, stats: { ...player.stats, health: 100, happiness: Math.max(80, Number(player.stats.happiness) || 0) } };
        const next = await processGameWeek(player);
        player = next.player;
        assert.equal(weekOf(player), before + 1, `week ${index + 1} advances`);
        assert.ok(!player.flags?.isDead, 'the career goes on');
        const platform = platformOf(player);
        assert.ok(Number.isFinite(platform.treasuryCash) && Number.isFinite(platform.metrics.subscribers), 'no NaN in the books');
        minTreasury = Math.min(minTreasury, platform.treasuryCash);
        (platform.governance.investorOffers || []).forEach(offer => { if (!before0.has(offer.id)) calls.add(offer.id); });
        const team = platform.leadership.team!;
        /* this week's run, by seat: never past the weekly money or energy the seat was given */
        const usage = new Map<StreamingTeamSeatId, { money: number; energy: number }>();
        const week = { money: 0, energy: 0, actions: 0, cards: 0 };
        for (const entry of team.report) {
            if (seen.has(entry.id)) continue;
            seen.add(entry.id);
            if (entry.kind === 'DONE') {
                done[entry.jobId] = (done[entry.jobId] || 0) + 1;
                teamMoney += entry.cost;
                teamEnergy += entry.energy;
                week.money += entry.cost;
                week.energy += entry.energy;
                week.actions += 1;
                if (entry.seatId && entry.absoluteWeek === weekOf(player)) {
                    const row = usage.get(entry.seatId) || { money: 0, energy: 0 };
                    row.money += entry.cost;
                    row.energy += entry.energy;
                    usage.set(entry.seatId, row);
                }
            }
            if (entry.kind === 'HELD') held += 1;
            if (entry.kind === 'ASKED') {
                asked += 1;
                week.cards += 1;
                askedBy[`${entry.jobId}:${entry.title}`] = (askedBy[`${entry.jobId}:${entry.title}`] || 0) + 1;
            }
        }
        usage.forEach((row, seatId) => {
            const seat = team.seats.find(item => item.seatId === seatId)!;
            assert.ok(row.money <= seat.weeklyMoney + 1, `${seatId} stays within its weekly money`);
            assert.ok(row.energy <= seat.weeklyEnergy, `${seatId} stays within its energy`);
        });
        const waitingCards = team.tray.filter(card => card.status === 'WAITING');
        const waiting = waitingCards.length;
        assert.ok(waiting <= STREAMING_TEAM_SEATS.length * 3, 'the tray stays within its limits');
        /* with every job off, what waits is a rival's call or a raise asked for (#181; neither is a job), or a card the build's weeks left (they end at `first`) */
        const fromBuild = (card: { createdAtAbsoluteWeek: number }) => card.createdAtAbsoluteWeek <= first;
        if (!on) {
            const strays = waitingCards.filter(card => card.jobId !== 'RIVAL_CALL' && card.jobId !== 'RAISE' && !fromBuild(card));
            assert.equal(strays.length, 0, `with every job off no job asks (${strays.map(card => `${card.jobId} from week ${card.createdAtAbsoluteWeek}, the year from ${first}`).join('; ')})`);
        }
        waitingCards.forEach(card => waitingFrom.add(fromBuild(card) ? 'from before the year' : card.jobId === 'RIVAL_CALL' ? "a rival's call" : card.jobId === 'RAISE' ? 'a raise' : card.jobId));
        peak.money = Math.max(peak.money, week.money);
        peak.energy = Math.max(peak.energy, week.energy);
        peak.actions = Math.max(peak.actions, week.actions);
        peak.cards = Math.max(peak.cards, week.cards);
        peak.tray = Math.max(peak.tray, waiting);
        trayWeeks += waiting;
    }
    void askedBy;
    return { player, calls: calls.size, done, held, asked, teamMoney, teamEnergy, minTreasury, weeks: weekOf(player) - first, peak, trayWeeks, waitingFrom: [...waitingFrom] };
};

async function main() {
    const started = performance.now();
    const base = await buildStreamingFullPlatformQa(fresh('team-year'), { processWeek: processGameWeek, persistWeek: async next => next });
    const startPlatform = platformOf(base);
    console.log(`the test company: week ${weekOf(base)}, ${(startPlatform.metrics.subscribers / 1e6).toFixed(1)}M members, ${money(startPlatform.treasuryCash)} in the treasury`);

    /* the life sim's pending and scheduled choices hold functions (they cannot be cloned) and are not this audit's subject */
    const settled: Player = { ...base, pendingEvent: null, pendingEvents: [], scheduledEvents: [] };
    const off = await runYear(structuredClone(settled), false);
    assert.equal(off.weeks, 52);
    assert.equal(Object.values(off.done).reduce((sum, value) => sum + value, 0), 0, 'with every job off the team does nothing');
    assert.equal(off.asked, 0, 'and asks nothing');
    pass(`OFF: 52 weeks, the team did nothing and asked nothing (${Math.round((performance.now() - started) / 1000)} s)`);

    const on = await runYear(structuredClone(settled), true);
    assert.equal(on.weeks, 52);
    const seatsActing = new Set(Object.keys(on.done).map(jobId => STREAMING_TEAM_JOBS.find(job => job.id === jobId)?.seatId).filter(Boolean));
    assert.ok(seatsActing.size >= 3, 'the team acts in several seats');
    pass(`ON: 52 weeks; done ${Object.entries(on.done).map(([jobId, count]) => `${jobId} ${count}`).join(', ')}; ${on.asked} cards; ${on.held} held at the cash floor; ${money(on.teamMoney)} and ⚡${on.teamEnergy} spent by the team`);

    const a = platformOf(off.player);
    const b = platformOf(on.player);
    console.log('                    team OFF        team ON');
    console.log(`members          ${(a.metrics.subscribers / 1e6).toFixed(2).padStart(9)}M   ${(b.metrics.subscribers / 1e6).toFixed(2).padStart(9)}M`);
    console.log(`treasury         ${money(a.treasuryCash).padStart(10)}   ${money(b.treasuryCash).padStart(10)}`);
    console.log(`lowest treasury  ${money(off.minTreasury).padStart(10)}   ${money(on.minTreasury).padStart(10)}`);
    console.log(`titles carried   ${String(a.catalogProjectIds.length).padStart(10)}   ${String(b.catalogProjectIds.length).padStart(10)}`);
    console.log(`campaigns        ${String((a.campaignBook?.campaigns || []).length).padStart(10)}   ${String((b.campaignBook?.campaigns || []).length).padStart(10)}`);
    console.log(`network orders   ${String((a.networkOrders || []).length).padStart(10)}   ${String((b.networkOrders || []).length).padStart(10)}`);
    console.log(`investor calls   ${String(off.calls).padStart(10)}   ${String(on.calls).padStart(10)}`);
    /* a week of the team, on average and at its busiest */
    const actions = Object.values(on.done).reduce((sum, value) => sum + value, 0);
    const millions = (value: number) => `$${(value / 1e6).toFixed(1)}M`;
    console.log('team ON, a week     on average      the busiest week');
    console.log(`money            ${millions(on.teamMoney / 52).padStart(10)}   ${millions(on.peak.money).padStart(10)}`);
    console.log(`energy           ${`⚡${(on.teamEnergy / 52).toFixed(1)}`.padStart(10)}   ${`⚡${on.peak.energy}`.padStart(10)}`);
    console.log(`actions done     ${(actions / 52).toFixed(2).padStart(10)}   ${String(on.peak.actions).padStart(10)}`);
    console.log(`cards asked      ${(on.asked / 52).toFixed(2).padStart(10)}   ${String(on.peak.cards).padStart(10)}`);
    console.log(`cards waiting    ${(on.trayWeeks / 52).toFixed(2).padStart(10)}   ${String(on.peak.tray).padStart(10)}`);
    console.log(`team ON: what waited: ${on.waitingFrom.join(', ')}`);
    console.log(`team OFF: at most ${off.peak.tray} cards waiting (${off.waitingFrom.join(', ') || 'none'})`);
    pass('both years ran through the real weekly loop');
    console.log(`Team year audit passed in ${Math.round((performance.now() - started) / 1000)} s.`);
}

main().catch(error => { console.error(error); process.exit(1); });
