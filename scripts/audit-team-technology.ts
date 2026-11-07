/** #169 (plan §21.17): the Technology seat's jobs on the full test company.
 *  - capacity: nothing while the busiest hour is under the 80% floor; past it, servers ordered through Network's own
 *    order in the region with the most viewers for its servers (Titans for Marcus, technology first), sized to the
 *    most-for-one-action limit; the order goes into service and adds real capacity; "by Marcus" on the order; a busy
 *    region waits; full rooms bring a card that opens Network;
 *  - incidents: a small one fixed with cash ($2M, 3 weeks) on no energy allowance, repaired with energy (25⚡ +
 *    $0.5M) when the allowance covers it; a major one always a card; a server incident too; leaks and trust
 *    incidents are not his; "Fixed by Marcus" on STATUS. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type OwnedStreamingCrisis, type OwnedStreamingInfrastructureIncident, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { streamingTeamSeatHolders } from '../services/team/teamState';
import { runStreamingTeamWeek, setStreamingTeamJobMode, setStreamingTeamLimits } from '../services/team/streamingTeam';
import { STREAMING_TEAM_HEADROOM_FLOOR, readStreamingCapacity, runCapacity, runIncidents } from '../services/team/teamTechnology';
import { completeDueStreamingNetworkOrders, streamingNetworkRegionOf } from '../services/streamingNetworkOrders';
import { deriveStreamingNetworkCapacity } from '../services/streamingNetworkCapacity';
import { getStreamingStatusBoard } from '../services/streamingStatusBoard';
import type { StreamingTeamJobContext } from '../services/team/teamJobs';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Team Technology', age: 15, currentWeek: 1 });
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
    const executive = streamingTeamSeatHolders(platform.leadership.appointments).holders.get('TECHNOLOGY')!;
    const seat = platform.leadership.team!.seats.find(item => item.seatId === 'TECHNOLOGY')!;
    return { player, platform, absoluteWeek: weekOf(player), seat, executive, moneyLeft: seat.weeklyMoney - seat.moneyUsed, energyLeft: Math.min(seat.weeklyEnergy - seat.energyUsed, player.energy.current) };
};
/* the build's own weekly close already ran the team this week; run it again as a fresh week's run, from an empty tray */
const rerun = (player: Player): Player => {
    const platform = platformOf(player);
    const team = platform.leadership.team!;
    return runStreamingTeamWeek({ ...player, ownedStreamingPlatform: { ...platform, leadership: { ...platform.leadership, team: {
        ...team, lastRunAbsoluteWeek: null, tray: team.tray.filter(card => card.seatId !== 'TECHNOLOGY'),
        seats: team.seats.map(seat => ({ ...seat, usageWeek: 0, moneyUsed: 0, energyUsed: 0, actionsUsed: 0 })),
    } } } });
};
const only = (player: Player, jobs: Partial<Record<'CAPACITY' | 'INCIDENTS', 'DO' | 'ASK' | 'OFF'>>): Player => {
    let next = player;
    (['CAPACITY', 'INCIDENTS'] as const).forEach(jobId => { next = setStreamingTeamJobMode(next, 'TECHNOLOGY', jobId, jobs[jobId] || 'OFF').player; });
    return next;
};
/* this week's busiest hour at `percent` of capacity */
const loaded = (player: Player, percent: number): Player => {
    const platform = platformOf(player);
    const history = platform.weeklyHistory.map((snapshot, index) => (index === platform.weeklyHistory.length - 1 && snapshot.operations
        ? { ...snapshot, operations: { ...snapshot.operations, capacityUtilizationPercent: percent } } : snapshot));
    return { ...player, ownedStreamingPlatform: { ...platform, weeklyHistory: history } };
};
const pass = (label: string) => console.log(`✓ ${label}`);

async function main() {
    const started = performance.now();
    let player = await buildStreamingFullPlatformQa(fresh('team-technology'), { processWeek: processGameWeek, persistWeek: async next => next });
    player = rich(withEnergy(player, 100));
    const marcus = streamingTeamSeatHolders(platformOf(player).leadership.appointments).holders.get('TECHNOLOGY')!;
    assert.equal(marcus.preferredStrategy, 'TECHNOLOGY_FIRST');
    pass(`the Technology seat: ${marcus.nameAtAppointment}, technology first, skill ${marcus.skill}`);

    /* ── capacity ── */
    const read = readStreamingCapacity(player, platformOf(player))!;
    assert.ok(read && read.utilization < STREAMING_TEAM_HEADROOM_FLOOR);
    assert.equal(runCapacity(contextOf(player)).length, 0);
    pass(`busiest hour at ${Math.round(read.utilization)}% of capacity: nothing to order (the floor is ${STREAMING_TEAM_HEADROOM_FLOOR}%)`);

    /* past the floor: the region with the most viewers for its servers; a room there with free positions */
    const hot = loaded(player, 88);
    const hotRead = readStreamingCapacity(hot, platformOf(hot))!;
    const region = hotRead.regions.find(row => row.viewers > 0)!;
    const facilities = platformOf(hot).infrastructureSetup!.facilities!;
    const racksOf = (facility: typeof facilities[number]) => (facility.rackGroups || []).reduce((sum, group) => sum + group.rackCount, 0) || facility.installedRacks;
    /* every room there has free positions to spare (the build fills them): a room of twelve positions holds what it holds now */
    const roomy = (player_: Player): Player => {
        const platform = platformOf(player_);
        const setup = platform.infrastructureSetup!;
        return { ...player_, ownedStreamingPlatform: { ...platform, infrastructureSetup: { ...setup, facilities: setup.facilities!.map(facility => (
            streamingNetworkRegionOf(facility.cityId) === region.regionId && facility.lease && facility.type !== 'CLOUD_ALLOCATION'
                ? { ...facility, lease: { ...facility.lease, rackPositions: Math.max(facility.lease.rackPositions, racksOf(facility) + 6) } } : facility)) } } };
    };
    const spacious = roomy(hot);
    const order = runCapacity(contextOf(spacious))[0];
    assert.ok(order && order.action.kind === 'NETWORK_ORDER');
    const input = order.action.input as { regionId: string; facilityId: string; tier: string; racks: number };
    assert.equal(input.regionId, region.regionId);
    assert.equal(input.tier, 'TITAN');
    assert.ok(order.cost <= contextOf(spacious).seat.actionMoney, 'sized to the most-for-one-action limit');
    pass(`at 88%: "${order.title}" · ${order.detail} · $${(order.cost / 1e6).toFixed(2)}M · ${order.reason}`);

    /* Do it: Network's own order, paid up front, "by Marcus", and it adds real capacity once in service */
    let doing = only(spacious, { CAPACITY: 'DO' });
    const cash = platformOf(doing).treasuryCash;
    const beforeOrder = doing;
    doing = rerun(doing);
    const orderResult = teamResultSince(beforeOrder, doing);
    const placed = (platformOf(doing).networkOrders || []).find(item => item.status === 'BUILDING' && item.regionId === region.regionId)!;
    assert.ok(placed, 'the order is building');
    assert.equal(placed.orderedBy?.name, marcus.nameAtAppointment);
    assert.equal(cash - platformOf(doing).treasuryCash, placed.capitalCost - orderResult);
    assert.equal(placed.capitalCost, order.cost);
    const report = platformOf(doing).leadership.team!.report.find(item => item.kind === 'DONE' && item.jobId === 'CAPACITY')!;
    assert.ok(report && report.cost === placed.capitalCost - orderResult);
    assert.equal(runCapacity(contextOf(doing)).length, 0, 'a busy region waits for its order');
    const regionSteady = (player_: Player) => deriveStreamingNetworkCapacity({
        facilities: (platformOf(player_).infrastructureSetup!.facilities || []).filter(facility => streamingNetworkRegionOf(facility.cityId) === region.regionId),
        forecastConcurrentStreams: 0,
    }).steadyStreams;
    const before = regionSteady(doing);
    const ready = completeDueStreamingNetworkOrders({ ...doing, currentWeek: doing.currentWeek + placed.buildWeeks }).player;
    const after = regionSteady(ready);
    assert.ok(after > before, 'more capacity in service');
    pass(`Do it: ordered through Network ($${(placed.capitalCost / 1e6).toFixed(2)}M, ready in ${placed.buildWeeks} weeks, "by ${marcus.nameAtAppointment.split(' ')[0]}"); in service, ${region.regionId} goes from ${Math.round(before / 1e3)}K to ${Math.round(after / 1e3)}K streams`);

    /* a higher limit: more racks, up to the room's free positions */
    const racksOf_ = (proposal: typeof order) => (proposal.action as unknown as { input: { racks: number } }).input.racks;
    const wide = setStreamingTeamLimits(spacious, 'TECHNOLOGY', { weeklyMoney: 60_000_000, actionMoney: 40_000_000 }).player;
    const more = runCapacity(contextOf(wide))[0];
    assert.ok(racksOf_(more) > racksOf_(order) && more.cost <= 40_000_000);
    pass(`a $40M limit: "${more.title}" · ${more.detail}, $${(more.cost / 1e6).toFixed(2)}M`);

    /* every room there full: a card that opens Network, where a new room is the player's */
    const packed = (() => {
        const platform = platformOf(hot);
        const setup = platform.infrastructureSetup!;
        return { ...hot, ownedStreamingPlatform: { ...platform, infrastructureSetup: { ...setup, facilities: setup.facilities!.map(facility => (
            streamingNetworkRegionOf(facility.cityId) === region.regionId && facility.lease ? { ...facility, lease: { ...facility.lease, rackPositions: racksOf(facility) } } : facility)) } } };
    })();
    const fullCard = runCapacity(contextOf(packed))[0];
    assert.ok(fullCard.askOnly && fullCard.action.kind === 'OPEN_ROOM' && fullCard.action.room === 'NETWORK');
    pass(`rooms full: a card, "${fullCard.title}" · ${fullCard.detail}`);

    /* ── incidents ── */
    const week = weekOf(player);
    const template = platformOf(player).crisisSecurity.crises[0];
    const crisis = (id: string, type: OwnedStreamingCrisis['type'], severity: OwnedStreamingCrisis['severity']): OwnedStreamingCrisis => ({
        ...template, id, idempotencyKey: id, type, severity, stage: 'DETECTED', title: type === 'APP_CRASH' ? 'The TV app keeps crashing' : type === 'SLOW_STREAMING' ? 'Streams stall at night' : 'Leak',
        detectedAtAbsoluteWeek: week, resolvedAtAbsoluteWeek: null, recoveryReadyAtAbsoluteWeek: null, responseCost: 0, weeklyRecoveryCost: 0, outcomeNote: null,
        affectedSubscribers: 240_000, statusRepair: undefined,
    });
    const withCrises = (player_: Player, crises: OwnedStreamingCrisis[]): Player => {
        const platform = platformOf(player_);
        return { ...player_, ownedStreamingPlatform: { ...platform, crisisSecurity: { ...platform.crisisSecurity, crises: [...platform.crisisSecurity.crises.filter(item => item.stage !== 'DETECTED'), ...crises] } } };
    };
    const small = withCrises(player, [crisis('audit-crash', 'APP_CRASH', 'MINOR'), crisis('audit-leak', 'CONTENT_LEAK', 'MINOR'), crisis('audit-breach', 'ACCOUNT_BREACH', 'SERIOUS')]);
    const answers = runIncidents(contextOf(small));
    assert.equal(answers.length, 1, 'leaks and trust incidents are not his');
    const fix = answers[0];
    assert.ok(fix.title === 'Fix: The TV app keeps crashing' && fix.cost === 2_000_000 && fix.energy === 0 && !fix.askOnly);
    pass(`a small incident on no energy allowance: "${fix.title}" · ${fix.detail} · ${fix.reason}`);

    let fixing = only(small, { INCIDENTS: 'DO' });
    const cash2 = platformOf(fixing).treasuryCash;
    const beforeFix = fixing;
    fixing = rerun(fixing);
    const fixed = platformOf(fixing).crisisSecurity.crises.find(item => item.id === 'audit-crash')!;
    assert.equal(fixed.stage, 'RECOVERING');
    assert.equal(fixed.statusRepair?.path, 'FIX');
    assert.equal(fixed.statusRepair?.by, marcus.nameAtAppointment);
    assert.equal(cash2 - platformOf(fixing).treasuryCash, 2_000_000 - teamResultSince(beforeFix, fixing));
    const shown = getStreamingStatusBoard(fixing).open.find(item => item.id === 'audit-crash')!;
    assert.equal(shown.repairedBy, marcus.nameAtAppointment);
    pass('Do it: STATUS\'s own $2M fix, repairing for 3 weeks, "Fix ordered by Marcus" on STATUS');

    /* the energy allowance covers a repair: fixed this week, 25⚡ + $0.5M */
    let repairing = setStreamingTeamLimits(only(small, { INCIDENTS: 'DO' }), 'TECHNOLOGY', { weeklyEnergy: 30 }).player;
    const now = runIncidents(contextOf(repairing))[0];
    assert.ok(now.title === 'Repair now: The TV app keeps crashing' && now.energy === 25 && now.cost === 500_000);
    const energy = repairing.energy.current;
    repairing = rerun(repairing);
    const repaired = platformOf(repairing).crisisSecurity.crises.find(item => item.id === 'audit-crash')!;
    assert.equal(repaired.stage, 'RESOLVED');
    assert.equal(energy - repairing.energy.current, 25);
    const history = getStreamingStatusBoard(repairing).history.find(item => item.id === 'audit-crash')!;
    assert.equal(history.repairedBy, marcus.nameAtAppointment);
    pass(`30⚡ allowed: "${now.title}" · ${now.detail}; resolved this week, ⚡25 spent, "Fixed by Marcus" in STATUS's history`);

    /* a major one: always a card */
    const major = only(withCrises(player, [crisis('audit-slow', 'SLOW_STREAMING', 'MAJOR')]), { INCIDENTS: 'DO' });
    const majorProposal = runIncidents(contextOf(major))[0];
    assert.ok(majorProposal.askOnly && /asks first on a major one/.test(majorProposal.reason));
    const majorRun = rerun(major);
    assert.equal(platformOf(majorRun).crisisSecurity.crises.find(item => item.id === 'audit-slow')!.stage, 'DETECTED');
    assert.ok(platformOf(majorRun).leadership.team!.tray.some(card => card.dedupeKey === 'incident:CRISIS:audit-slow' && card.status === 'WAITING'));
    pass(`a major incident: a card even at Do it, "${majorProposal.title}" · ${majorProposal.detail}`);

    /* a server incident nobody answered: his too */
    const facility = platformOf(player).infrastructureSetup!.facilities![0];
    const server: OwnedStreamingInfrastructureIncident = {
        id: 'audit-power', idempotencyKey: 'audit-power', type: 'POWER_FAILURE', severity: 'SERIOUS', stage: 'DETECTED', title: `Power failure in ${facility.cityId}`,
        detail: 'A feed tripped.', cause: 'Grid', facilityId: facility.id, cityId: facility.cityId, detectedAtAbsoluteWeek: week, affectedSubscribers: 90_000,
        capacityLossPercent: 20, conditionLossPercent: 4, responseAction: null, rerouteFacilityId: null, compensation: null, insuranceClaimed: false,
        responseCost: 0, insuranceRecovery: 0, recoveryReadyAtAbsoluteWeek: null, resolvedAtAbsoluteWeek: null, assistedHandled: false,
        publicReaction: '', subscriberReaction: '', outcomeNote: null,
    };
    const withServer = (() => {
        const platform = platformOf(player);
        const operations = platform.crisisSecurity.infrastructureOperations;
        return only({ ...withCrises(player, []), ownedStreamingPlatform: { ...platformOf(withCrises(player, [])), crisisSecurity: { ...platformOf(withCrises(player, [])).crisisSecurity, infrastructureOperations: { ...operations, incidents: [...operations.incidents, server] } } } }, { INCIDENTS: 'DO' });
    })();
    const serverProposal = runIncidents(contextOf(withServer))[0];
    assert.ok(serverProposal && serverProposal.action.kind === 'INCIDENT_REPAIR' && serverProposal.action.source === 'INFRASTRUCTURE');
    const serverRun = rerun(withServer);
    const serverAfter = platformOf(serverRun).crisisSecurity.infrastructureOperations.incidents.find(item => item.id === 'audit-power')!;
    assert.ok(serverAfter.stage !== 'DETECTED' && serverAfter.statusRepair?.by === marcus.nameAtAppointment);
    pass(`a server incident: "${serverProposal.title}", answered and marked by ${marcus.nameAtAppointment.split(' ')[0]}`);

    console.log(`Team Technology audit passed in ${Math.round((performance.now() - started) / 1000)} s.`);
}

main().catch(error => { console.error(error); process.exit(1); });
