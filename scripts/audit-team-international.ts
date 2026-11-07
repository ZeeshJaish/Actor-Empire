/** #170 (plan §21.17): the International seat's jobs on the full test company.
 *  - languages: the set-up region with the most viewers no level reached gets its next level from the energy
 *    allowance, a step at a time (Subtitles first; Elena, global first, moves to Dubbing after the first); a level she
 *    reaches says "reached by Elena" on Localization; no allowance, a card; every set-up region covered, a card to set
 *    up the next region (its cash is the player's);
 *  - filings: a government's additional requirement answered (its payment and 5⚡), a rejected file filed again once
 *    its cooling period ends (5⚡); a file still cooling, or one the player did not open, is left alone. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type OwnedStreamingMarketOperation, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { streamingTeamSeatHolders } from '../services/team/teamState';
import { runStreamingTeamWeek, setStreamingTeamJobMode, setStreamingTeamLimits } from '../services/team/streamingTeam';
import { runFilings, runLanguages } from '../services/team/teamInternational';
import { getStreamingLocalizationDesk } from '../services/streamingLocalizationDesk';
import type { StreamingTeamJobContext } from '../services/team/teamJobs';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Team International', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
/* #181: whoever carries a job out lands it under or over budget, booked once as a team result (refund +, overrun −) */
const teamResultSince = (before: Player, after: Player) => {
    const seen = new Set(platformOf(before).eventLedger.map(entry => entry.id));
    return platformOf(after).eventLedger
        .filter(entry => entry.type === 'TEAM_RESULT' && !seen.has(entry.id) && !entry.idempotencyKey.startsWith('team-result:expenses:'))
        .reduce((sum, entry) => sum + Number(entry.metadata?.refund || 0) - Number(entry.metadata?.overrun || 0), 0);
};
const weekOf = (player: Player) => getAbsoluteWeek(player.age, player.currentWeek);
const withEnergy = (player: Player, amount: number): Player => ({
    ...player, energy: { current: amount, max: amount }, flags: { ...player.flags, weeklyBaseEnergyRemaining: amount, bonusEnergyBank: 0 },
});
const rich = (player: Player): Player => ({ ...player, ownedStreamingPlatform: { ...platformOf(player), treasuryCash: 50_000_000_000 } });
const contextOf = (player: Player): StreamingTeamJobContext => {
    const platform = platformOf(player);
    const executive = streamingTeamSeatHolders(platform.leadership.appointments).holders.get('INTERNATIONAL')!;
    const seat = platform.leadership.team!.seats.find(item => item.seatId === 'INTERNATIONAL')!;
    return { player, platform, absoluteWeek: weekOf(player), seat, executive, moneyLeft: seat.weeklyMoney, energyLeft: Math.min(seat.weeklyEnergy, player.energy.current) };
};
/* the build's own weekly close already ran the team this week; run it again as a fresh week's run, from an empty tray */
const rerun = (player: Player): Player => {
    const platform = platformOf(player);
    const team = platform.leadership.team!;
    return runStreamingTeamWeek({ ...player, ownedStreamingPlatform: { ...platform, leadership: { ...platform.leadership, team: {
        ...team, lastRunAbsoluteWeek: null, tray: team.tray.filter(card => card.seatId !== 'INTERNATIONAL'),
        seats: team.seats.map(seat => ({ ...seat, usageWeek: 0, moneyUsed: 0, energyUsed: 0, actionsUsed: 0 })),
    } } } });
};
const only = (player: Player, jobs: Partial<Record<'FILINGS' | 'LANGUAGES', 'DO' | 'ASK' | 'OFF'>>): Player => {
    let next = player;
    (['FILINGS', 'LANGUAGES'] as const).forEach(jobId => { next = setStreamingTeamJobMode(next, 'INTERNATIONAL', jobId, jobs[jobId] || 'OFF').player; });
    return next;
};
const regionOf = (player: Player, packageId: string) => getStreamingLocalizationDesk(player).regions.find(region => region.packageId === packageId)!;
const pass = (label: string) => console.log(`✓ ${label}`);

async function main() {
    const started = performance.now();
    let player = await buildStreamingFullPlatformQa(fresh('team-international'), { processWeek: processGameWeek, persistWeek: async next => next });
    player = rich(withEnergy(player, 100));
    const elena = streamingTeamSeatHolders(platformOf(player).leadership.appointments).holders.get('INTERNATIONAL')!;
    assert.equal(elena.preferredStrategy, 'GLOBAL_FIRST');
    pass(`the International seat: ${elena.nameAtAppointment}, global first, skill ${elena.skill}`);

    /* ── languages ── */
    const desk = getStreamingLocalizationDesk(player);
    const weakest = desk.regions.filter(region => region.open && region.untapped > 0).sort((left, right) => right.untapped - left.untapped)[0];
    assert.ok(weakest, 'a set-up region with viewers no level reached');
    const step = runLanguages(contextOf(player))[0];
    assert.ok(step && step.action.kind === 'LOCALIZATION_LEVEL' && step.action.regionId === weakest.packageId);
    const before = weakest.tracks.SUBTITLES.level;
    assert.equal(step.action.track, before === 0 ? 'SUBTITLES' : step.action.track);
    pass(`languages: "${step.title}" · ${step.detail} · ${step.reason}`);

    /* Do it inside the allowance (10⚡): the level is reached, "reached by Elena" */
    let doing = only(player, { LANGUAGES: 'DO' });
    const energy = doing.energy.current;
    doing = rerun(doing);
    const after = regionOf(doing, weakest.packageId);
    assert.equal(energy - doing.energy.current, step.energy);
    if (step.title.startsWith('Toward')) {
        assert.ok(after.tracks[step.action.track as 'SUBTITLES' | 'DUBBING'].tiers.find(tier => tier.state === 'NEXT')!.progress >= step.energy);
        pass(`Do it: ${step.energy}⚡ put toward it`);
    } else {
        assert.equal(after.tracks[step.action.track as 'SUBTITLES' | 'DUBBING'].level, step.action.level);
        assert.equal(after.since?.by, elena.nameAtAppointment);
        pass(`Do it: ${weakest.name} reaches ${step.action.track === 'SUBTITLES' ? 'Subtitles' : 'Dubbing'} level ${step.action.level} (⚡${step.energy}), "reached by ${elena.nameAtAppointment.split(' ')[0]}" on Localization`);
    }

    /* a global-first head moves to Dubbing after the first Subtitles level */
    const next = runLanguages(contextOf(doing))[0];
    if (next && next.action.kind === 'LOCALIZATION_LEVEL' && next.action.regionId === weakest.packageId && after.tracks.SUBTITLES.level === 1) {
        assert.equal(next.action.track, 'DUBBING');
        pass(`next for ${weakest.name}: "${next.title}" · ${next.detail}`);
    }

    /* a smaller allowance: a step of 5⚡; none: a card */
    const five = setStreamingTeamLimits(only(player, { LANGUAGES: 'DO' }), 'INTERNATIONAL', { weeklyEnergy: 5 }).player;
    const partial = runLanguages(contextOf(five))[0];
    assert.equal(partial.energy, 5, 'a step the allowance holds');
    pass(`5⚡ allowed: "${partial.title}" · ${partial.detail}`);
    const none = rerun(setStreamingTeamLimits(only(player, { LANGUAGES: 'DO' }), 'INTERNATIONAL', { weeklyEnergy: 0 }).player);
    const card = platformOf(none).leadership.team!.tray.find(item => item.jobId === 'LANGUAGES' && item.status === 'WAITING')!;
    assert.ok(card && card.reason.endsWith('It needs more energy than the allowance.'));
    pass('no energy allowed: a card ("It needs more energy than the allowance.")');

    /* every set-up region covered: a card to set up the next one, which opens Localization */
    const covered = (() => {
        const platform = platformOf(player);
        const regions = (platform.localizationOperations.regions || []).map(region => ({ ...region, subtitleLevel: 3 as const, dubbingLevel: 3 as const, subtitleProgress: 0, dubbingProgress: 0 }));
        return { ...player, ownedStreamingPlatform: { ...platform, localizationOperations: { ...platform.localizationOperations, regions } } };
    })();
    const setup = runLanguages(contextOf(covered))[0];
    assert.ok(setup && setup.askOnly && setup.action.kind === 'OPEN_ROOM' && setup.action.room === 'LOCALIZATION' && setup.title.startsWith('Set up '));
    pass(`every set-up region covered: a card, "${setup.title}" · ${setup.detail}`);

    /* ── filings ── */
    const week = weekOf(player);
    const ops = platformOf(player).marketOperations;
    const mx = ops.find(item => item.countryId === 'MX')!;
    const ca = ops.find(item => item.countryId === 'CA')!;
    const de = ops.find(item => item.countryId === 'DE')!;
    const legacy = ops.find(item => item.source !== 'PLAYER_ACTION' && item.clearance);
    const requirement: OwnedStreamingMarketOperation = { ...mx, status: 'AWAITING_FUNDING', clearance: { ...mx.clearance!, outcome: 'ADDITIONAL_REQUIREMENT', additionalPayment: 3_000_000, condition: 'A local data-protection officer.' } };
    const rejected: OwnedStreamingMarketOperation = { ...ca, status: 'SUSPENDED', suspendedAtAbsoluteWeek: week - 4, clearance: { ...ca.clearance!, outcome: 'TEMPORARILY_REJECTED', resumeAllowedAtAbsoluteWeek: week } };
    const cooling: OwnedStreamingMarketOperation = { ...de, status: 'SUSPENDED', suspendedAtAbsoluteWeek: week - 1, clearance: { ...de.clearance!, outcome: 'TEMPORARILY_REJECTED', resumeAllowedAtAbsoluteWeek: week + 3 } };
    const filed = (() => {
        const platform = platformOf(player);
        return { ...player, ownedStreamingPlatform: { ...platform, marketOperations: platform.marketOperations.map(item => (item.id === mx.id ? requirement : item.id === ca.id ? rejected : item.id === de.id ? cooling : item)) } };
    })();
    const proposals = runFilings(contextOf(filed));
    assert.equal(proposals.length, 2, 'the cooling file waits');
    const answer = proposals.find(item => item.action.kind === 'MARKET_FOLLOW_UP' && item.action.step === 'REQUIREMENT')!;
    const reapply = proposals.find(item => item.action.kind === 'MARKET_FOLLOW_UP' && item.action.step === 'REAPPLY')!;
    assert.ok(answer.title === "Answer Mexico's follow-up" && answer.cost === 3_000_000 && answer.energy === 5);
    assert.ok(reapply.title === 'Reapply in Canada' && reapply.cost === 0 && reapply.energy === 5);
    pass(`filings: "${answer.title}" · ${answer.detail} · ${answer.reason}`);
    pass(`filings: "${reapply.title}" · ${reapply.detail} · ${reapply.reason}`);
    if (legacy) assert.equal(runFilings(contextOf(filed)).some(item => (item.action as { operationId?: string }).operationId === legacy.id), false);

    let filing = only(filed, { FILINGS: 'DO' });
    const cash = platformOf(filing).treasuryCash;
    const energy2 = filing.energy.current;
    const beforeFiling = filing;
    filing = rerun(filing);
    const mxAfter = platformOf(filing).marketOperations.find(item => item.id === mx.id)!;
    const caAfter = platformOf(filing).marketOperations.find(item => item.id === ca.id)!;
    assert.ok(mxAfter.status !== 'AWAITING_FUNDING' && mxAfter.clearance!.outcome !== 'ADDITIONAL_REQUIREMENT');
    assert.equal(caAfter.status, 'CLEARANCE');
    assert.equal(cash - platformOf(filing).treasuryCash, 3_000_000 - teamResultSince(beforeFiling, filing));
    assert.equal(energy2 - filing.energy.current, 10);
    assert.equal(platformOf(filing).marketOperations.find(item => item.id === de.id)!.status, 'SUSPENDED');
    pass('Do it: Mexico\'s requirement answered ($3M, ⚡5), Canada back in review (⚡5); Germany still cooling');

    console.log(`Team International audit passed in ${Math.round((performance.now() - started) / 1000)} s.`);
}

main().catch(error => { console.error(error); process.exit(1); });
