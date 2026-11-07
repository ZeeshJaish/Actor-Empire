/**
 * #204: while someone else runs the company.
 *  - The rule: who runs it, and the line on every room; as chair you may come back, replace them, sell or list (yours at
 *    51%, else the board's from 60); off the board only come back.
 *  - The chief executive really runs it: Ask-only jobs become theirs, no card comes to you, your energy is not spent, an
 *    empty chair is filled within 3 weeks, and raises and notices are answered for you.
 *  - If they quit: at 51% you run it again and a card says so; under it the board picks.
 */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { getStreamingChairRule } from '../services/streamingChair';
import { replaceStreamingCeo, returnAsStreamingCeo, stepDownFromStreamingCompany, STREAMING_HANDOVER_GAP_WEEKS, streamingChiefExecutive } from '../services/streamingStepDown';
import { dismissStreamingTeamExecutive, getStreamingTeamView, nameStreamingTeamSuccessor, runStreamingTeamWeek } from '../services/team/streamingTeam';
import { streamingTeamSeatHolders } from '../services/team/teamState';

const started = Date.now();
const pass = (label: string) => console.log(`✓ ${label}`);
const fresh = (id: string, name = 'Chair Audit'): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name, age: 45, currentWeek: 1 });
    return { ...player, money: 2e9, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
const later = (player: Player, weeks = 1): Player => {
    const total = player.currentWeek - 1 + weeks;
    return { ...player, age: player.age + Math.floor(total / 52), currentWeek: (total % 52) + 1 };
};
const withPlatform = (player: Player, change: (platform: ReturnType<typeof platformOf>) => ReturnType<typeof platformOf>): Player => ({ ...player, ownedStreamingPlatform: change(platformOf(player)) });

const main = async () => {
    const base = await buildStreamingFullPlatformQa(fresh('chair-audit'), { processWeek: processGameWeek, persistWeek: async next => next });
    assert.equal(getStreamingChairRule(base), null, 'you run it: no rule');
    const holder = streamingTeamSeatHolders(platformOf(base).leadership.appointments).holders.get('MONEY')!;
    const named = nameStreamingTeamSuccessor(base, 'EXECUTIVE', holder.executiveId);
    assert.ok(named.changed);

    /* ── chair ── */
    const down = stepDownFromStreamingCompany(named.player, 'EXECUTIVE_CHAIR');
    assert.ok(down.changed, down.message);
    const rule = getStreamingChairRule(down.player)!;
    assert.match(rule.line, /runs NORTHSTAR\+ · You chair the board/);
    assert.match(rule.subtitle, /RUNS THIS · YOU CHAIR$/, 'the small line under a room title');
    assert.ok(rule.chair);
    assert.match(rule.note, /runs this now/);
    const emeritusStart = stepDownFromStreamingCompany(named.player, 'LEAVE_BOARD');
    const offBoard = getStreamingChairRule(emeritusStart.player)!;
    assert.match(offBoard.line, /You left the board/);
    assert.match(offBoard.subtitle, /YOU LEFT THE BOARD$/);
    assert.ok(!offBoard.chair);
    pass(`the line on every room: "${rule.line}"; a tap: "${rule.note}"`);

    /* ── they run it, on none of your energy ── */
    const energyBefore = down.player.energy.current;
    let run = runStreamingTeamWeek(later(down.player));
    assert.equal(run.energy.current, energyBefore, 'your energy is not spent');
    const trayAfter = platformOf(run).leadership.team!.tray.filter(card => card.status === 'WAITING').length;
    let done = 0;
    for (let week = 0; week < 6; week += 1) {
        run = runStreamingTeamWeek(later(run));
        done += platformOf(run).leadership.team!.report.filter(entry => entry.kind === 'DONE').length;
    }
    assert.equal(run.energy.current, energyBefore, 'six weeks on, still not spent');
    assert.ok(done > 0, 'they do the jobs');
    const waiting = platformOf(run).leadership.team!.tray.filter(card => card.status === 'WAITING');
    assert.ok(waiting.length <= trayAfter, `nothing piles up: ${waiting.length} waiting`);
    assert.ok(waiting.every(card => card.appointmentId === streamingTeamSeatHolders(platformOf(run).leadership.appointments).holders.get('MONEY')?.id || card.action.kind === 'NOTICE' || card.status !== 'WAITING' || card.createdAtAbsoluteWeek < platformOf(down.player).leadership.currentCeo.sinceAbsoluteWeek + 1), 'only their own matters come to you');
    pass(`six weeks under the chief executive: ${done} jobs in the minutes, none of your energy, ${waiting.length} waiting for you`);

    /* ── an empty chair ── */
    assert.ok(!streamingTeamSeatHolders(platformOf(down.player).leadership.appointments).holders.has('TRUST'), 'Trust starts empty');
    let filled = down.player;
    let filledAfter = -1;
    for (let week = 1; week <= 4 && filledAfter < 0; week += 1) {
        filled = runStreamingTeamWeek(later(filled));
        if (streamingTeamSeatHolders(platformOf(filled).leadership.appointments).holders.has('TRUST')) filledAfter = week;
    }
    assert.ok(filledAfter > 0 && filledAfter <= 3, `filled in ${filledAfter} weeks`);
    assert.equal(filled.energy.current, energyBefore, 'and that spent none of your energy either');
    pass(`an empty chair: filled in ${filledAfter} week(s), by the chief executive`);

    /* ── replacing them ── */
    const soon = replaceStreamingCeo(down.player, 'EXECUTIVE', streamingTeamSeatHolders(platformOf(down.player).leadership.appointments).holders.get('CONTENT')!.executiveId);
    assert.ok(!soon.changed && /handover/.test(soon.message || ''), 'one handover at a time');
    const wait = later(down.player, STREAMING_HANDOVER_GAP_WEEKS);
    const content = streamingTeamSeatHolders(platformOf(wait).leadership.appointments).holders.get('CONTENT')!;
    const replaced = replaceStreamingCeo(wait, 'EXECUTIVE', content.executiveId);
    assert.ok(replaced.changed, replaced.message);
    assert.equal(streamingChiefExecutive(platformOf(replaced.player))?.name, content.nameAtAppointment);
    assert.equal(platformOf(replaced.player).leadership.appointments.find(item => item.id === holder.id)?.status, 'ACTIVE', 'the old one goes back to their chair');
    const low = withPlatform(wait, platform => ({ ...platform, founderOwnershipPercent: 40, governance: { ...platform.governance, boardConfidence: 45 } }));
    const refused = replaceStreamingCeo(low, 'EXECUTIVE', content.executiveId);
    assert.ok(!refused.changed && refused.vote, 'under 51%, it goes to a board vote');
    const offBoardReplace = replaceStreamingCeo(later(emeritusStart.player, STREAMING_HANDOVER_GAP_WEEKS), 'EXECUTIVE', content.executiveId);
    assert.ok(!offBoardReplace.changed && /Off the board/.test(offBoardReplace.message || ''), 'off the board you cannot');
    pass(`replacing them: ${content.nameAtAppointment} takes over, the old one back in their chair; under 51% at 45 confidence the board says no; off the board you cannot`);

    /* ── off the board ── */
    const off = getStreamingTeamView(runStreamingTeamWeek(later(emeritusStart.player)));
    assert.equal(off.tray.length, 0, 'no tray');
    assert.equal(off.report.length, 0, 'no minutes');
    pass('off the board: no tray and no minutes; the rooms are read-only');

    /* ── if they quit ── */
    const quitting = withPlatform(later(down.player), platform => ({ ...platform, leadership: { ...platform.leadership, appointments: platform.leadership.appointments.map(item => (item.id === holder.id
        ? { ...item, notice: { reason: 'BURNT_OUT' as const, givenAtAbsoluteWeek: 0, leavesAtAbsoluteWeek: 0 } } : item)) } }));
    const gone = runStreamingTeamWeek(quitting);
    const after = platformOf(gone);
    assert.equal(after.leadership.currentCeo.holderType, 'FOUNDER', 'at 51% or more you run it again');
    assert.equal(after.legacy.founderOfficeRole, 'FOUNDER_CEO');
    assert.equal(after.leadership.appointments.find(item => item.id === holder.id)?.exit?.wasCeo, true, 'the market reads a chief executive leaving');
    assert.ok(after.leadership.team!.tray.some(card => card.status === 'WAITING' && /you run the company again/.test(card.title)), 'a card says so');
    assert.equal(getStreamingChairRule(gone), null);
    const lowHold = withPlatform(quitting, platform => ({ ...platform, founderOwnershipPercent: 40 }));
    const picked = platformOf(runStreamingTeamWeek(lowHold));
    assert.equal(picked.leadership.currentCeo.holderType, 'EXECUTIVE', 'under 51% the board picks');
    assert.notEqual(picked.leadership.currentCeo.executiveId, holder.executiveId);
    pass(`if they quit: at 51% you run it again, with a card ("${after.leadership.team!.tray.find(card => /run the company again/.test(card.title))!.title}"); under it the board picks ${streamingChiefExecutive(picked)?.name}`);

    /* ── back ── */
    const back = returnAsStreamingCeo(later(down.player, STREAMING_HANDOVER_GAP_WEEKS));
    assert.ok(back.changed, back.message);
    assert.equal(getStreamingChairRule(back.player), null, 'the rooms are yours again');
    void dismissStreamingTeamExecutive;
    pass('coming back: the rooms are yours again');

    console.log(`Chair mode audit passed in ${Math.round((Date.now() - started) / 1000)} s.`);
};

main().catch(error => { console.error(error); process.exit(1); });
