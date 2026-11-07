/** #164 (plan §21.13, §21.17): "Your team", the core.
 *  - an older save gets six seats, every job at Ask me, the old mandate's limits; normalising twice changes nothing;
 *  - the first run moves on the roles without a seat (the COO beside an International head, the Advertising head) and
 *    stops their salaries, once;
 *  - hiring takes 15⚡ and fills an empty seat only; training takes cash, 10⚡ and weeks, then a level;
 *  - a rival's call on an executive is a card; Match charges the package and raises loyalty; No lets them go;
 *  - the run: Do it inside the limits is done (the same executor, energy measured), Ask me is a card, over a limit or
 *    below the cash floor is a card with its reason, never more actions than the level, one card per target, cards
 *    expire after two weeks, Approve runs it, the same week twice does nothing. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type OwnedStreamingRivalMove, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { normalizeStreamingTeamState, streamingTeamSeatHolders, STREAMING_TEAM_SEATS } from '../services/team/teamState';
import {
    approveStreamingTeamCard,
    declineStreamingTeamCard,
    getStreamingTeamCandidates,
    getStreamingTeamView,
    hireStreamingTeamCandidate,
    runStreamingTeamWeek,
    setStreamingTeamJobMode,
    setStreamingTeamLimits,
    trainStreamingTeamExecutive,
} from '../services/team/streamingTeam';
import { STREAMING_TEAM_EXECUTORS, STREAMING_TEAM_RUNNERS } from '../services/team/teamJobs';
import { completeDueStreamingExecutiveDevelopment } from '../services/streamingLeadershipGovernance';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Team Audit', age: 15, currentWeek: 1 });
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
const teamOf = (player: Player) => platformOf(player).leadership.team!;
const withEnergy = (player: Player, amount: number): Player => ({
    ...player, energy: { current: amount, max: amount }, flags: { ...player.flags, weeklyBaseEnergyRemaining: amount, bonusEnergyBank: 0 },
});
const nextWeek = (player: Player, weeks = 1): Player => {
    let week = player.currentWeek + weeks; let age = player.age;
    while (week > 52) { week -= 52; age += 1; }
    return { ...player, currentWeek: week, age };
};
const pass = (label: string) => console.log(`✓ ${label}`);

async function main() {
    const started = performance.now();
    let player = await buildStreamingFullPlatformQa(fresh('team-audit'), { processWeek: processGameWeek, persistWeek: async next => next });
    player = withEnergy(player, 100);
    console.log(`test company built in ${Math.round((performance.now() - started) / 1000)} s (week ${getAbsoluteWeek(player.age, player.currentWeek)})`);

    /* ── the saved shape ── */
    const team = teamOf(player);
    assert.equal(team.seats.length, 6);
    assert.deepEqual(team.seats.map(seat => seat.seatId), STREAMING_TEAM_SEATS);
    team.seats.forEach(seat => Object.values(seat.jobs).forEach(mode => assert.equal(mode, 'ASK')));
    const delegation = platformOf(player).leadership.delegation;
    assert.equal(team.seats.find(seat => seat.seatId === 'MARKETING')!.weeklyMoney, delegation.weeklyCampaignLimit);
    assert.equal(team.seats.find(seat => seat.seatId === 'CONTENT')!.actionMoney, delegation.maximumRightsBid);
    const twice = normalizeStreamingTeamState(normalizeStreamingTeamState(team, delegation), delegation);
    assert.deepEqual(twice, normalizeStreamingTeamState(team, delegation));
    assert.deepEqual(normalizeStreamingTeamState(undefined, delegation).tray, []);
    pass('six seats, every job at Ask me, the mandate\'s limits; normalising is idempotent');

    /* ── the reorganisation ── */
    /* the build's own weekly closes already ran the team once; put the company back as it was before the team */
    {
        const platform = platformOf(player);
        const reorganized = platform.leadership.appointments.filter(item => item.status === 'RESIGNED' && ['COO', 'ADVERTISING_HEAD'].includes(item.role));
        assert.equal(reorganized.length, 2, 'the weekly close already reorganised the team');
        player = { ...player, ownedStreamingPlatform: { ...platform, leadership: {
            ...platform.leadership,
            appointments: platform.leadership.appointments.map(item => (reorganized.includes(item) ? { ...item, status: 'ACTIVE' as const, endedAtAbsoluteWeek: null } : item)),
            team: { ...platform.leadership.team!, reorganizedAtAbsoluteWeek: null, lastRunAbsoluteWeek: null, report: [] },
        } } };
    }
    const { holders, leftovers } = streamingTeamSeatHolders(platformOf(player).leadership.appointments);
    assert.equal(holders.get('INTERNATIONAL')!.role, 'INTERNATIONAL_HEAD');
    const leftoverRoles = leftovers.map(item => item.role).sort();
    assert.deepEqual(leftoverRoles, ['ADVERTISING_HEAD', 'COO']);
    assert.equal(getStreamingTeamView(player).leftovers.length, 2);
    const salaryBefore = platformOf(player).leadership.appointments.filter(item => item.status === 'ACTIVE').reduce((sum, item) => sum + item.weeklyCompensation, 0);
    const cashBefore = platformOf(player).treasuryCash;
    player = runStreamingTeamWeek(player);
    const after = platformOf(player);
    assert.equal(after.treasuryCash, cashBefore, 'the reorganisation moves no money');
    assert.equal(after.leadership.appointments.filter(item => item.status === 'ACTIVE').length, 5);
    const salaryAfter = after.leadership.appointments.filter(item => item.status === 'ACTIVE').reduce((sum, item) => sum + item.weeklyCompensation, 0);
    assert.equal(salaryBefore - salaryAfter, leftovers.reduce((sum, item) => sum + item.weeklyCompensation, 0));
    assert.equal(teamOf(player).report.filter(entry => entry.title.endsWith('moved on')).length, 2);
    assert.notEqual(teamOf(player).reorganizedAtAbsoluteWeek, null);
    assert.equal(getStreamingTeamView(player).leftovers.length, 0);
    const again = runStreamingTeamWeek(player);
    assert.equal(teamOf(again).report.length, teamOf(player).report.length, 'the same week twice does nothing');
    pass(`the COO and the Advertising head moved on once; ${salaryBefore - salaryAfter} a week in salaries stopped`);

    /* ── hiring ── */
    const candidates = getStreamingTeamCandidates(player, 'TRUST');
    assert.equal(candidates.length, 3);
    candidates.forEach(candidate => assert.equal(candidate.roleLabel, 'Security & Trust Head'));
    const filled = hireStreamingTeamCandidate(player, 'MARKETING', getStreamingTeamCandidates(player, 'MARKETING')[0]?.id || 'tomas-varga');
    assert.equal(filled.changed, false);
    const broke = hireStreamingTeamCandidate(withEnergy(player, 10), 'TRUST', candidates[0].id);
    assert.equal(broke.reason, 'ENERGY');
    const hired = hireStreamingTeamCandidate(player, 'TRUST', candidates[0].id);
    assert.equal(hired.changed, true);
    assert.equal(hired.player.energy.current, player.energy.current - 15);
    assert.equal(streamingTeamSeatHolders(platformOf(hired.player).leadership.appointments).holders.get('TRUST')!.executiveId, candidates[0].id);
    player = hired.player;
    pass(`hired ${candidates[0].name} for Trust for 15⚡; a filled seat and an empty energy bar refuse`);

    /* ── training ── */
    const cto = streamingTeamSeatHolders(platformOf(player).leadership.appointments).holders.get('TECHNOLOGY')!;
    const cash0 = platformOf(player).treasuryCash;
    const trained = trainStreamingTeamExecutive(player, 'TECHNOLOGY');
    assert.equal(trained.changed, true);
    const program = platformOf(trained.player).leadership.developmentPrograms.find(item => item.executiveId === cto.executiveId && item.track === 'LEVEL_UP')!;
    assert.ok(program);
    assert.equal(cash0 - platformOf(trained.player).treasuryCash, program.capitalCost);
    assert.equal(trained.player.energy.current, player.energy.current - 10);
    assert.equal(trainStreamingTeamExecutive(trained.player, 'TECHNOLOGY').reason, 'TRAINING');
    const completed = completeDueStreamingExecutiveDevelopment(platformOf(trained.player), program.readyAtAbsoluteWeek);
    assert.equal(completed.platform.leadership.appointments.find(item => item.id === cto.id)!.level, cto.level + 1);
    player = trained.player;
    pass(`training: ${program.capitalCost} and 10⚡, ${program.developmentWeeks} weeks, then level ${cto.level + 1}`);

    /* ── a rival's call ── */
    const jonah = streamingTeamSeatHolders(platformOf(player).leadership.appointments).holders.get('MARKETING')!;
    const week = getAbsoluteWeek(player.age, player.currentWeek);
    const call = (id: string): OwnedStreamingRivalMove => ({
        id, idempotencyKey: id, platformId: 'NETFLIX', platformName: 'Netflix', ceoName: 'Rival CEO', type: 'EXECUTIVE_POACH',
        battlefront: 'TALENT' as OwnedStreamingRivalMove['battlefront'], targetRegionId: null, targetTechnologyBranch: null,
        strategyReason: 'audit', playerImpact: 'audit', rivalPriceBefore: null, rivalPriceAfter: null,
        title: 'Rival CEO calls Jonah', detail: 'audit', status: 'OPEN', pricingVersion: 2,
        cashCostMillions: 18, rivalCashBeforeMillions: 1000, rivalCashAfterMillions: 982,
        createdAtAbsoluteWeek: week + 1, pressureStartsAbsoluteWeek: week + 1, expiresAtAbsoluteWeek: week + 2,
        acquisitionRateDelta: 0, churnRateDelta: 0, prestigeDelta: 0,
        targetExecutiveId: jonah.executiveId, targetExecutiveName: jonah.nameAtAppointment,
        responseId: null, responseCost: 0, responseAtAbsoluteWeek: null, outcomeNote: '',
    });
    const withCall = (source: Player, id: string): Player => {
        const platform = platformOf(source);
        return { ...source, ownedStreamingPlatform: { ...platform, competitiveWorld: { ...platform.competitiveWorld, moves: [...platform.competitiveWorld.moves, call(id)] } } };
    };
    let called = runStreamingTeamWeek(withCall(nextWeek(player), 'audit-poach-1'));
    const card = teamOf(called).tray.find(item => item.jobId === 'RIVAL_CALL')!;
    assert.ok(card, 'a rival call is a card');
    assert.match(card.title, /Netflix called Jonah Reed/);
    const cash1 = platformOf(called).treasuryCash;
    const matched = approveStreamingTeamCard(called, card.id, 'MATCH_PACKAGE');
    assert.equal(matched.changed, true);
    const jonahAfter = platformOf(matched.player).leadership.appointments.find(item => item.id === jonah.id)!;
    assert.equal(jonahAfter.loyalty, Math.min(100, jonah.loyalty + 10));
    assert.ok(cash1 - platformOf(matched.player).treasuryCash >= 3_000_000);
    assert.equal(teamOf(matched.player).tray.find(item => item.id === card.id)!.status, 'APPROVED');
    called = runStreamingTeamWeek(withCall(nextWeek(matched.player), 'audit-poach-2'));
    const card2 = teamOf(called).tray.find(item => item.jobId === 'RIVAL_CALL' && item.status === 'WAITING')!;
    const letGo = declineStreamingTeamCard(called, card2.id);
    assert.equal(letGo.changed, true);
    assert.equal(platformOf(letGo.player).leadership.appointments.find(item => item.id === jonah.id)!.status, 'RESIGNED');
    pass('a rival call is a card: Match charged the package and raised loyalty; No let him go');
    player = matched.player;

    /* ── the run, with a test job ── */
    let executed = 0;
    STREAMING_TEAM_EXECUTORS.GUIDANCE = (source) => {
        executed += 1;
        const platform = platformOf(source);
        const next: Player = { ...source, energy: { ...source.energy, current: source.energy.current - 5 } };
        return { player: { ...next, ownedStreamingPlatform: { ...platform, treasuryCash: platform.treasuryCash - 4_000_000 } }, changed: true };
    };
    let proposals = [
        { key: 'a', cost: 4_000_000, energy: 5 },
        { key: 'b', cost: 4_000_000, energy: 5 },
        { key: 'c', cost: 4_000_000, energy: 5 },
    ];
    STREAMING_TEAM_RUNNERS.PREMIERE_PUSH = () => proposals.map((item, index) => ({
        jobId: 'PREMIERE_PUSH' as const, dedupeKey: `audit:${item.key}`, title: `Audit push ${item.key}`, detail: 'audit', reason: 'audit reason',
        cost: item.cost, energy: item.energy, action: { kind: 'GUIDANCE' as const, posture: 'BALANCED' }, priority: 10 - index,
    }));
    player = setStreamingTeamLimits(player, 'MARKETING', { weeklyMoney: 50_000_000, actionMoney: 10_000_000, weeklyEnergy: 10 }).player;
    /* only the test job: Marketing's own brand and results jobs (#167) are switched off for this part */
    player = setStreamingTeamJobMode(player, 'MARKETING', 'BRAND_CAMPAIGN', 'OFF').player;
    player = setStreamingTeamJobMode(player, 'MARKETING', 'CAMPAIGN_RESULTS', 'OFF').player;
    assert.equal(setStreamingTeamJobMode(player, 'MARKETING', 'PREMIERE_PUSH', 'DO').changed, true);
    assert.equal(setStreamingTeamJobMode(player, 'CONTENT', 'ORIGINAL_PITCH', 'DO').reason, 'BAD_MODE');
    player = setStreamingTeamJobMode(player, 'MARKETING', 'PREMIERE_PUSH', 'DO').player;
    const level = streamingTeamSeatHolders(platformOf(player).leadership.appointments).holders.get('MARKETING')!.level;
    /* #181: ambition 80+ takes on one more job a week (audit:team-outcomes); here only the level's two count */
    const marketingId = streamingTeamSeatHolders(platformOf(player).leadership.appointments).holders.get('MARKETING')!.id;
    player = { ...player, ownedStreamingPlatform: { ...platformOf(player), leadership: { ...platformOf(player).leadership,
        appointments: platformOf(player).leadership.appointments.map(item => (item.id === marketingId ? { ...item, ambition: 60 } : item)) } } };
    player = withEnergy(nextWeek(player), 100);
    /* a rich treasury, so the cash floor stays out of this part */
    player = { ...player, ownedStreamingPlatform: { ...platformOf(player), treasuryCash: 20_000_000_000 } };
    const cash2 = platformOf(player).treasuryCash;
    const beforePush = player;
    player = runStreamingTeamWeek(player);
    const pushResult = teamResultSince(beforePush, player);
    /* level 2: two actions; the energy allowance (10) covers two pushes, so both are done; the third waits for next week */
    assert.equal(level, 2);
    assert.equal(executed, 2);
    assert.equal(cash2 - platformOf(player).treasuryCash, 8_000_000 - pushResult);
    const seat = teamOf(player).seats.find(item => item.seatId === 'MARKETING')!;
    assert.equal(seat.actionsUsed, 2);
    assert.equal(seat.energyUsed, 10);
    assert.equal(seat.moneyUsed, 8_000_000 - pushResult);
    assert.equal(teamOf(player).report.filter(entry => entry.kind === 'DONE' && entry.title.startsWith('Audit push')).length, 2);
    pass('Do it inside the limits: two actions at level 2, $8M and 10⚡ measured');

    /* over the energy allowance → a card with its reason; Ask me → a card; one card per target */
    proposals = [{ key: 'd', cost: 4_000_000, energy: 15 }, { key: 'e', cost: 20_000_000, energy: 0 }];
    player = withEnergy(nextWeek(player), 100);
    player = runStreamingTeamWeek(player);
    const cards = teamOf(player).tray.filter(item => item.status === 'WAITING' && item.dedupeKey.startsWith('audit:'));
    assert.equal(cards.length, 2);
    assert.match(cards.find(item => item.dedupeKey === 'audit:d')!.reason, /energy/);
    assert.match(cards.find(item => item.dedupeKey === 'audit:e')!.reason, /limits/);
    player = withEnergy(nextWeek(player), 100);
    player = runStreamingTeamWeek(player);
    assert.equal(teamOf(player).tray.filter(item => item.status === 'WAITING' && item.dedupeKey === 'audit:d').length, 1, 'one card per target');
    pass('over the energy or money limit: a card with its reason, once');

    /* the cash floor holds a Do-it action */
    proposals = [{ key: 'f', cost: 1_000_000, energy: 0 }];
    const platformF = platformOf(player);
    const poor: Player = { ...player, ownedStreamingPlatform: { ...platformF, treasuryCash: 2_000_000 } };
    const held = runStreamingTeamWeek(withEnergy(nextWeek(poor), 100));
    assert.ok(teamOf(held).report.some(entry => entry.kind === 'HELD' && entry.title === 'Audit push f'));
    pass('the cash floor holds an action as a card');

    /* Approve runs the executor; cards expire after two weeks */
    const waiting = teamOf(player).tray.find(item => item.dedupeKey === 'audit:e' && item.status === 'WAITING')!;
    const before = executed;
    const approved = approveStreamingTeamCard(player, waiting.id);
    assert.equal(approved.changed, true);
    assert.equal(executed, before + 1);
    assert.equal(teamOf(approved.player).tray.find(item => item.id === waiting.id)!.status, 'APPROVED');
    proposals = [];
    let later = runStreamingTeamWeek(withEnergy(nextWeek(approved.player, 3), 100));
    assert.equal(teamOf(later).tray.find(item => item.dedupeKey === 'audit:d')!.status, 'EXPIRED');
    pass('Approve runs it; a card expires after two weeks');

    /* Ask me: a card, nothing done */
    later = setStreamingTeamJobMode(later, 'MARKETING', 'PREMIERE_PUSH', 'ASK').player;
    proposals = [{ key: 'g', cost: 1_000_000, energy: 0 }];
    const executedBefore = executed;
    later = runStreamingTeamWeek(withEnergy(nextWeek(later), 100));
    assert.equal(executed, executedBefore);
    assert.ok(teamOf(later).tray.some(item => item.dedupeKey === 'audit:g' && item.status === 'WAITING'));
    pass('Ask me: a card, nothing done');

    delete STREAMING_TEAM_RUNNERS.PREMIERE_PUSH;
    delete STREAMING_TEAM_EXECUTORS.GUIDANCE;
    console.log(`Streaming team core audit passed in ${Math.round((performance.now() - started) / 1000)} s.`);
}

main().catch(error => { console.error(error); process.exit(1); });
