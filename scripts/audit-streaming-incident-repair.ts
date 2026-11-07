/** Repair on STATUS, Phase 3 #50 (codex-handoff/plans/platform-tech-plan.md §7: "Energy repair
 *  (fast) 25⚡ + $0.5M / 50⚡ + $1.5M, fixed this week; Fix (cash only, slower on purpose) $2M,
 *  3 weeks / $6M, 5 weeks; Wait (no cash) 6 weeks of damage / 10 weeks of damage"). On the full
 *  test company, with incidents put into its save, it checks:
 *  - the options and their prices for a minor and a major incident, and the refusals (energy, cash,
 *    an incident already repairing, a service not live);
 *  - Repair now: resolved at once, the energy and cash spent, the site's checks passed, nothing
 *    charged at the next close;
 *  - Fix: repairing at about half the harm with no weekly recovery bill on top (A/B against a
 *    funded Incident Command response), resolved by the weekly close at its week;
 *  - Wait: recorded, still harmful, Assisted Management leaves it alone, and it runs its course
 *    6 or 10 weeks after it opened, as an unanswered one now does (an old save's crisis left open
 *    for months resolves at its next close);
 *  - the save keeps STATUS's answer; the board shows the options and the answers. */
import assert from 'node:assert/strict';
import {
    INITIAL_PLAYER, type OwnedStreamingCrisis, type OwnedStreamingInfrastructureIncident, type OwnedStreamingPlatformState, type Player,
} from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { commitStreamingCrisisSecurityWeek, getStreamingCrisisWeeklyEffects } from '../services/streamingCrisisSecurity';
import {
    commitStreamingInfrastructureOperationsWeek, getStreamingInfrastructureOperationsEffects, respondToStreamingInfrastructureIncident,
} from '../services/streamingInfrastructureOperations';
import { getStreamingIncidentRepairOptions, repairStreamingIncident } from '../services/streamingIncidentRepair';
import { getStreamingStatusBoard } from '../services/streamingStatusBoard';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Repair Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const withEnergy = (player: Player, energy: number): Player => ({
    ...player, energy: { ...player.energy, current: energy }, flags: { ...player.flags, weeklyBaseEnergyRemaining: energy, bonusEnergyBank: 0 },
});

async function main() {
    const started = performance.now();
    const qa = withEnergy(await buildStreamingFullPlatformQa(fresh('incident-repair-qa'), { processWeek: processGameWeek, persistWeek: async next => next }), 100);
    console.log(`test company built in ${Math.round((performance.now() - started) / 1000)} s`);
    const week = getAbsoluteWeek(qa.age, qa.currentWeek);
    const base = normalizeOwnedStreamingPlatformState(qa.ownedStreamingPlatform, qa.id);
    const site = base.infrastructureSetup!.facilities![0];
    const crisis = (id: string, severity: OwnedStreamingCrisis['severity'], detected = week - 1): OwnedStreamingCrisis => ({
        id, idempotencyKey: id, type: 'PLATFORM_OUTAGE', severity, stage: 'DETECTED', title: `Audit outage ${id}`, detail: 'Audit.', cause: 'Audit.',
        detectedAtAbsoluteWeek: detected, affectedSubscribers: 300_000, estimatedRevenueAtRisk: 0, responseDoctrine: null, compensation: null,
        communication: null, responseCost: 0, weeklyRecoveryCost: 650_000, recoveryReadyAtAbsoluteWeek: null, resolvedAtAbsoluteWeek: null, outcomeNote: null,
    });
    const spike = (id: string, severity: OwnedStreamingInfrastructureIncident['severity'], detected = week - 1): OwnedStreamingInfrastructureIncident => ({
        id, idempotencyKey: id, type: 'TRAFFIC_SPIKE', severity, stage: 'DETECTED', title: `Audit spike ${id}`, detail: 'Audit.', cause: 'Audit.',
        facilityId: site.id, cityId: site.cityId, detectedAtAbsoluteWeek: detected, affectedSubscribers: 640_000, capacityLossPercent: 34,
        conditionLossPercent: 6, responseAction: null, rerouteFacilityId: null, compensation: null, insuranceClaimed: false, responseCost: 0,
        insuranceRecovery: 0, recoveryReadyAtAbsoluteWeek: null, resolvedAtAbsoluteWeek: null, assistedHandled: false, publicReaction: '',
        subscriberReaction: '', outcomeNote: null,
    });
    const playerWith = (crises: OwnedStreamingCrisis[], incidents: OwnedStreamingInfrastructureIncident[], patch: Partial<OwnedStreamingPlatformState> = {}, energy = 100): Player => withEnergy({
        ...qa,
        ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
            ...base,
            ...patch,
            crisisSecurity: { ...base.crisisSecurity, crises, infrastructureOperations: { ...base.crisisSecurity.infrastructureOperations, incidents } },
        }, qa.id),
    }, energy);
    const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);

    /* ── the options and the refusals ── */
    const priced = (severity: OwnedStreamingCrisis['severity'], energy: number, cash: number) => getStreamingIncidentRepairOptions(crisis('x', severity), week, energy, cash)
        .map(option => `${option.path} ${option.energy}e ${option.cash / 1e6}M ${option.weeks}w${option.available ? '' : ` (${option.refusal})`}`);
    assert.deepEqual(priced('SERIOUS', 100, 1e9), ['ENERGY 25e 0.5M 0w', 'FIX 0e 2M 3w', 'WAIT 0e 0M 5w'], 'Minor: 25 energy + $0.5M now, $2M and 3 weeks, or 6 weeks from when it opened (5 left)');
    assert.deepEqual(priced('CRITICAL', 100, 1e9), ['ENERGY 50e 1.5M 0w', 'FIX 0e 6M 5w', 'WAIT 0e 0M 9w'], 'Major: 50 energy + $1.5M, $6M and 5 weeks, or 10 weeks');
    assert.deepEqual(priced('MAJOR', 20, 3e6), ['ENERGY 50e 1.5M 0w (Needs 50 energy; you have 20.)', 'FIX 0e 6M 5w (Needs $6M; the treasury has $3M.)', 'WAIT 0e 0M 9w'],
        'Short of energy or cash: refused, with what is missing');
    const empty = repairStreamingIncident(playerWith([crisis('dry', 'SERIOUS')], [], {}, 0), 'CRISIS', 'dry', 'ENERGY');
    assert.deepEqual([empty.changed, empty.refusal, empty.message], [false, 'NO_ENERGY', 'Out of energy for now. It refills next week, or get more in the Store.']);
    const broke = repairStreamingIncident(playerWith([crisis('broke', 'SERIOUS')], [], { treasuryCash: 1_000_000 }), 'CRISIS', 'broke', 'FIX');
    assert.deepEqual([broke.changed, broke.refusal], [false, 'NO_CASH']);
    const notLive = repairStreamingIncident(playerWith([crisis('dark', 'SERIOUS')], [], { lifecycle: 'LOCKED' }), 'CRISIS', 'dark', 'ENERGY');
    assert.deepEqual([notLive.changed, notLive.refusal], [false, 'NOT_LIVE']);
    console.log('PASS options: minor 25⚡ + $0.5M / $2M, 3 weeks / 6 weeks; major 50⚡ + $1.5M / $6M, 5 weeks / 10 weeks; refused without energy, cash or a live service');

    /* ── Repair now ── */
    const crisisPlayer = playerWith([crisis('now', 'SERIOUS')], []);
    const repairedCrisis = repairStreamingIncident(crisisPlayer, 'CRISIS', 'now', 'ENERGY');
    assert.ok(repairedCrisis.changed, repairedCrisis.message);
    const afterCrisis = platformOf(repairedCrisis.player);
    const repaired = afterCrisis.crisisSecurity.crises.find(item => item.id === 'now')!;
    assert.deepEqual([repaired.stage, repaired.resolvedAtAbsoluteWeek, repaired.statusRepair?.path, repaired.statusRepair?.energy], ['RESOLVED', week, 'ENERGY', 25]);
    assert.equal(platformOf(crisisPlayer).treasuryCash - afterCrisis.treasuryCash, 500_000, '$0.5M spent');
    assert.equal(repairedCrisis.player.energy.current, 75, '25 energy spent');
    assert.equal(afterCrisis.crisisSecurity.publicTrust, Math.min(100, platformOf(crisisPlayer).crisisSecurity.publicTrust + 3), 'A verified recovery\'s trust');
    assert.equal(getStreamingCrisisWeeklyEffects(afterCrisis).activeCrisis, null, 'Nothing charged at the next close');
    assert.equal(repairStreamingIncident(repairedCrisis.player, 'CRISIS', 'now', 'FIX').refusal, 'NOT_OPEN', 'A repaired incident cannot be repaired again');
    const serverPlayer = playerWith([], [spike('now-server', 'MAJOR')]);
    const conditionBefore = platformOf(serverPlayer).infrastructureSetup!.facilities!.find(item => item.id === site.id)!.physical!.maintenanceConditionPercent;
    const repairedServer = repairStreamingIncident(serverPlayer, 'INFRASTRUCTURE', 'now-server', 'ENERGY');
    const afterServer = platformOf(repairedServer.player);
    assert.equal(afterServer.crisisSecurity.infrastructureOperations.incidents.find(item => item.id === 'now-server')!.stage, 'RESOLVED');
    assert.equal(afterServer.infrastructureSetup!.facilities!.find(item => item.id === site.id)!.physical!.maintenanceConditionPercent, Math.min(96, conditionBefore + 14),
        'The site\'s checks pass, as a verified recovery\'s do');
    assert.deepEqual([platformOf(serverPlayer).treasuryCash - afterServer.treasuryCash, repairedServer.player.energy.current], [1_500_000, 50]);
    assert.equal(getStreamingInfrastructureOperationsEffects(afterServer).activeIncident, null);
    console.log(`PASS repair now: resolved at once; a minor crisis 25⚡ + $0.5M, a major server incident 50⚡ + $1.5M and the site back to ${Math.min(96, conditionBefore + 14).toFixed(0)}% condition; nothing charged after`);

    /* ── Fix ── */
    const fixed = repairStreamingIncident(playerWith([], [spike('fix-server', 'MAJOR')]), 'INFRASTRUCTURE', 'fix-server', 'FIX');
    const fixedPlatform = platformOf(fixed.player);
    const fixedIncident = fixedPlatform.crisisSecurity.infrastructureOperations.incidents.find(item => item.id === 'fix-server')!;
    assert.deepEqual([fixedIncident.stage, fixedIncident.recoveryReadyAtAbsoluteWeek, fixedIncident.responseCost, fixed.player.energy.current], ['RECOVERING', week + 5, 6_000_000, 100]);
    const commandResponse = respondToStreamingInfrastructureIncident(playerWith([], [spike('command-server', 'MAJOR')]), 'command-server', 'ISOLATE_AND_REPAIR', null, 'NONE', false);
    assert.ok(commandResponse.changed, commandResponse.reason);
    const fixCost = getStreamingInfrastructureOperationsEffects(fixedPlatform);
    const commandCost = getStreamingInfrastructureOperationsEffects(platformOf(commandResponse.player));
    assert.equal(commandCost.weeklyOperatingCost - fixCost.weeklyOperatingCost, 496_000,
        'A STATUS fix is priced all in: no $320K × 1.55 weekly recovery bill, which Incident Command\'s response still carries');
    assert.deepEqual([fixCost.playbackDelta.toFixed(2), Math.round((1 - fixCost.capacityMultiplier) * 100)], [(-1.4 * 1.55 * .48).toFixed(2), 20],
        'While fixing: about half the harm, and 42% of the lost capacity back');
    const fixedCrisis = repairStreamingIncident(playerWith([crisis('fix', 'SERIOUS')], []), 'CRISIS', 'fix', 'FIX');
    const fixedCrisisPlatform = platformOf(fixedCrisis.player);
    assert.deepEqual([fixedCrisisPlatform.crisisSecurity.crises[0].stage, getStreamingCrisisWeeklyEffects(fixedCrisisPlatform).weeklyRecoveryCost], ['RECOVERING', 0],
        'A crisis fix carries no weekly recovery cost either');
    const snapshot = (absoluteWeek: number) => ({ ...fixedCrisisPlatform.weeklyHistory.at(-1)!, absoluteWeek });
    const crisisAtReady = commitStreamingCrisisSecurityWeek(fixedCrisisPlatform, fixedCrisis.player, snapshot(week + 3));
    const doneCrisis = crisisAtReady.crisisSecurity.crises.find(item => item.id === 'fix')!;
    assert.deepEqual([doneCrisis.stage, doneCrisis.resolvedAtAbsoluteWeek], ['RESOLVED', week + 3]);
    assert.match(doneCrisis.outcomeNote!, /^Repaired by the \$2M fix, 3 weeks after it was funded\.$/);
    const serverAtReady = commitStreamingInfrastructureOperationsWeek(fixedPlatform, fixed.player, { ...fixedPlatform.weeklyHistory.at(-1)!, absoluteWeek: week + 5 });
    assert.equal(normalizeOwnedStreamingPlatformState(serverAtReady).crisisSecurity.infrastructureOperations.incidents.find(item => item.id === 'fix-server')!.stage, 'RESOLVED');
    console.log('PASS fix: $6M, 5 weeks for a major server incident, $2M, 3 weeks for a minor crisis; about half the harm meanwhile, no weekly recovery bill; resolved at the close of its week');

    /* ── Wait, and the unanswered ── */
    const waited = repairStreamingIncident(playerWith([crisis('wait', 'SERIOUS', week - 2)], []), 'CRISIS', 'wait', 'WAIT');
    const waitedPlatform = platformOf(waited.player);
    const waitedCrisis = waitedPlatform.crisisSecurity.crises[0];
    assert.deepEqual([waitedCrisis.stage, waitedCrisis.statusRepair?.path, waitedPlatform.treasuryCash, waited.player.energy.current],
        ['DETECTED', 'WAIT', platformOf(playerWith([], [])).treasuryCash, 100], 'Recorded, free, still open');
    assert.equal(getStreamingCrisisWeeklyEffects(waitedPlatform).playbackDelta, -2.2, 'Still at full harm');
    assert.deepEqual(getStreamingIncidentRepairOptions(waitedCrisis, week, 100, 1e9).map(option => option.path), ['ENERGY', 'FIX'], 'Waiting can still be cut short');
    const waitSnapshot = (absoluteWeek: number) => ({ ...waitedPlatform.weeklyHistory.at(-1)!, absoluteWeek });
    assert.equal(commitStreamingCrisisSecurityWeek(waitedPlatform, waited.player, waitSnapshot(week + 3)).crisisSecurity.crises.find(item => item.id === 'wait')!.stage, 'DETECTED',
        'Week 5 of 6: still running');
    const ranOut = commitStreamingCrisisSecurityWeek(waitedPlatform, waited.player, waitSnapshot(week + 4)).crisisSecurity;
    const ranOutCrisis = ranOut.crises.find(item => item.id === 'wait')!;
    assert.deepEqual([ranOutCrisis.stage, ranOutCrisis.resolvedAtAbsoluteWeek], ['RESOLVED', week + 4], 'Six weeks after it opened, it has run its course');
    assert.match(ranOutCrisis.outcomeNote!, /ran its course after 6 weeks/);
    /* an old save's crisis, left open for months, resolves at its next close */
    const old = playerWith([crisis('ancient', 'MINOR', week - 40)], []);
    const oldPlatform = platformOf(old);
    const closed = commitStreamingCrisisSecurityWeek(oldPlatform, old, { ...oldPlatform.weeklyHistory.at(-1)!, absoluteWeek: week + 1 });
    assert.equal(closed.crisisSecurity.crises.find(item => item.id === 'ancient')!.stage, 'RESOLVED', 'An unanswered crisis no longer stays open for ever');
    /* a server incident waited out: Assisted Management leaves it alone, and it ends on time */
    const waitedServer = repairStreamingIncident(playerWith([], [spike('wait-server', 'MINOR', week - 2)]), 'INFRASTRUCTURE', 'wait-server', 'WAIT');
    const waitedServerPlatform = platformOf(waitedServer.player);
    const assisted = { ...waitedServerPlatform, infrastructureSetup: { ...waitedServerPlatform.infrastructureSetup!, managementPolicy: {
        ...waitedServerPlatform.infrastructureSetup!.managementPolicy!, mode: 'ASSISTED' as const, maximumBudget: 1e10, requireApprovalForExpensiveChanges: false,
    } } };
    const nextWeek = normalizeOwnedStreamingPlatformState(commitStreamingInfrastructureOperationsWeek(assisted, waitedServer.player, { ...assisted.weeklyHistory.at(-1)!, absoluteWeek: week + 1 }));
    assert.equal(nextWeek.crisisSecurity.infrastructureOperations.incidents.find(item => item.id === 'wait-server')!.stage, 'DETECTED', 'Assisted Management does not pay for what the player chose to wait out');
    const unansweredAssisted = { ...assisted, crisisSecurity: { ...assisted.crisisSecurity, infrastructureOperations: { ...assisted.crisisSecurity.infrastructureOperations,
        incidents: [spike('assist-me', 'MINOR', week - 2)] } } };
    const assistedWeek = normalizeOwnedStreamingPlatformState(commitStreamingInfrastructureOperationsWeek(unansweredAssisted, waitedServer.player, { ...assisted.weeklyHistory.at(-1)!, absoluteWeek: week + 1 }));
    assert.equal(assistedWeek.crisisSecurity.infrastructureOperations.incidents.find(item => item.id === 'assist-me')!.stage, 'RECOVERING', 'It still answers an unanswered one');
    const serverRanOut = normalizeOwnedStreamingPlatformState(commitStreamingInfrastructureOperationsWeek(waitedServerPlatform, waitedServer.player, { ...waitedServerPlatform.weeklyHistory.at(-1)!, absoluteWeek: week + 4 }));
    assert.equal(serverRanOut.crisisSecurity.infrastructureOperations.incidents.find(item => item.id === 'wait-server')!.stage, 'RESOLVED', 'A minor server incident runs 6 weeks');
    console.log('PASS wait: free and recorded, still at full harm, can be cut short; runs its course 6 weeks after it opened; an old save\'s months-open crisis resolves at its next close; Assisted Management leaves a waited-out incident alone');

    /* ── one real week, A/B: the same major outage repaired with energy, or left open ── */
    const live = playerWith([crisis('week', 'MAJOR')], []);
    const repairedLive = repairStreamingIncident(live, 'CRISIS', 'week', 'ENERGY');
    const repairedWeek = platformOf((await processGameWeek(repairedLive.player)).player);
    const openWeek = platformOf((await processGameWeek(live)).player);
    assert.equal(repairedWeek.crisisSecurity.crises.find(item => item.id === 'week')!.stage, 'RESOLVED');
    assert.equal(openWeek.crisisSecurity.crises.find(item => item.id === 'week')!.stage, 'DETECTED', 'Left open, it is still open after the week');
    const playback = (platform: OwnedStreamingPlatformState) => platform.weeklyHistory.at(-1)!.operations!.playbackSuccessRate;
    assert.ok(playback(repairedWeek) - playback(openWeek) >= 1, `Playback: repaired ${playback(repairedWeek)}%, left open ${playback(openWeek)}% (a major outage takes 2.2 × 1.65)`);
    assert.ok(repairedWeek.metrics.technologyHealth - openWeek.metrics.technologyHealth >= 3.5,
        `Tech health: repaired ${repairedWeek.metrics.technologyHealth.toFixed(1)}, left open ${openWeek.metrics.technologyHealth.toFixed(1)} (the close takes 3.5 for a major incident, and playback feeds it)`);
    console.log(`PASS week: the same major outage, repaired with energy or left open: playback ${playback(repairedWeek)}% vs ${playback(openWeek)}%, tech health ${repairedWeek.metrics.technologyHealth.toFixed(1)} vs ${openWeek.metrics.technologyHealth.toFixed(1)}`);

    /* ── the save and the board ── */
    assert.deepEqual(normalizeOwnedStreamingPlatformState(JSON.parse(JSON.stringify(waited.player.ownedStreamingPlatform))).crisisSecurity.crises[0].statusRepair,
        { path: 'WAIT', atAbsoluteWeek: week, cash: 0, energy: 0 }, 'The save keeps STATUS\'s answer');
    const board = getStreamingStatusBoard(withEnergy(playerWith([crisis('board', 'SERIOUS')], [spike('board-server', 'MAJOR')]), 30));
    const serverCard = board.open.find(item => item.id === 'board-server')!;
    assert.deepEqual(serverCard.repairs!.map(option => [option.path, option.available]), [['ENERGY', false], ['FIX', true], ['WAIT', true]],
        'On the board: 30 energy is short of a major repair');
    const waitingBoard = getStreamingStatusBoard(waited.player).open.find(item => item.id === 'wait')!;
    assert.deepEqual([waitingBoard.repairPath, waitingBoard.weeksToRunItsCourse, waitingBoard.repairs!.map(option => option.path)], ['WAIT', 4, ['ENERGY', 'FIX']]);
    console.log('PASS save and board: the answer is kept; each open incident carries its options and its weeks to run');
    console.log(`done in ${Math.round((performance.now() - started) / 1000)} s`);
}

main().catch(error => { console.error(error); process.exit(1); });
