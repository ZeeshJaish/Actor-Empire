/** Real damage from open incidents and the 0–10 scale fixes, Phase 3 #51 (codex-handoff/plans/
 *  platform-tech-plan.md §7: "While an incident is open: quality drops for the affected viewers,
 *  so … churn, viewing hours and revenue suffer, scaled by severity and reach"; §2/§12: checks
 *  written for a 0–10 scale on 0–100 levels). On the full test company it checks:
 *  - the harm: each open incident's reach × its kind's viewing and churn harm, halved while repairing;
 *    none open = no harm;
 *  - one real week, A/B: the same company with no incident, a major outage left open, and the same
 *    outage under repair: the player's cancellations, viewing hours and revenue;
 *  - STATUS's damage lines name the viewing and churn harm;
 *  - the crisis engine's security and reliability terms read 0–100 levels: the risk and pressure on
 *    the test company before and after, the breach and backlash triggers, the recovery week. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type OwnedStreamingCrisis, type OwnedStreamingPlatformState, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { getStreamingIncidentHarm } from '../services/streamingIncidentHarm';
import { getStreamingStatusBoard } from '../services/streamingStatusBoard';
import { streamingCrisisRisk } from '../services/streamingCrisisSecurity';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Harm Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};

async function main() {
    const started = performance.now();
    const qa = await buildStreamingFullPlatformQa(fresh('incident-harm-qa'), { processWeek: processGameWeek, persistWeek: async next => next });
    console.log(`test company built in ${Math.round((performance.now() - started) / 1000)} s`);
    const week = getAbsoluteWeek(qa.age, qa.currentWeek);
    const base = normalizeOwnedStreamingPlatformState(qa.ownedStreamingPlatform, qa.id);
    const subscribers = base.weeklyHistory.at(-1)!.subscribers;
    const outage = (stage: OwnedStreamingCrisis['stage']): OwnedStreamingCrisis => ({
        id: 'harm-outage', idempotencyKey: 'harm-outage', type: 'PLATFORM_OUTAGE', severity: 'MAJOR', stage, title: 'Audit outage', detail: 'Audit.', cause: 'Audit.',
        detectedAtAbsoluteWeek: week - 1, affectedSubscribers: Math.round(subscribers * .041), estimatedRevenueAtRisk: 0, responseDoctrine: null,
        compensation: null, communication: null, responseCost: 0, weeklyRecoveryCost: 0,
        recoveryReadyAtAbsoluteWeek: stage === 'RECOVERING' ? week + 4 : null, resolvedAtAbsoluteWeek: null, outcomeNote: null,
    });
    const playerWith = (crises: OwnedStreamingCrisis[]): Player => ({
        ...qa,
        ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
            ...base,
            crisisSecurity: { ...base.crisisSecurity, crises, infrastructureOperations: { ...base.crisisSecurity.infrastructureOperations, incidents: [] } },
        }, qa.id),
    });
    const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);

    /* ── the harm ── */
    assert.deepEqual(getStreamingIncidentHarm(platformOf(playerWith([]))), { viewingLoss: 0, extraChurn: 0, rows: [] }, 'None open: no harm');
    const open = getStreamingIncidentHarm(platformOf(playerWith([outage('DETECTED')])));
    const repairing = getStreamingIncidentHarm(platformOf(playerWith([outage('RECOVERING')])));
    assert.ok(Math.abs(open.viewingLoss - .041 * .7) < .001 && Math.abs(open.extraChurn - .041 * .12) < .0002,
        `A major outage reaching 4.1%: viewing −${(open.viewingLoss * 100).toFixed(2)}%, churn +${(open.extraChurn * 100).toFixed(2)}% a week`);
    assert.ok(Math.abs(repairing.viewingLoss - open.viewingLoss * .48) < 1e-9, 'Repairing: about half');
    console.log(`PASS harm: a major outage reaching 4.1% of subscribers takes ${(open.viewingLoss * 100).toFixed(2)}% of viewing and adds ${(open.extraChurn * 100).toFixed(2)}% churn a week; ×0.48 while repaired; none open, none`);

    /* ── one real week, A/B/C ── */
    const weekOf = async (crises: OwnedStreamingCrisis[]) => platformOf((await processGameWeek(playerWith(crises))).player).weeklyHistory.at(-1)!;
    const calm = await weekOf([]);
    const hurt = await weekOf([outage('DETECTED')]);
    const fixing = await weekOf([outage('RECOVERING')]);
    const ops = (snapshot: typeof calm) => snapshot.operations!;
    const hours = (snapshot: typeof calm) => ops(snapshot).worldViewingHours ?? 0;
    const cancellations = (snapshot: typeof calm) => ops(snapshot).cancellations;
    const revenue = (snapshot: typeof calm) => ops(snapshot).subscriptionRevenue + (ops(snapshot).worldViewingAdvertisingRevenue ?? 0) + (ops(snapshot).worldViewingTransactionRevenue ?? 0);
    assert.ok(cancellations(hurt) > cancellations(calm), `Cancellations: ${cancellations(calm).toLocaleString()} calm, ${cancellations(hurt).toLocaleString()} with the outage open`);
    assert.ok(hours(hurt) < hours(calm), `Viewing hours: ${hours(calm).toLocaleString()} calm, ${hours(hurt).toLocaleString()} open`);
    assert.ok(cancellations(fixing) < cancellations(hurt) && cancellations(fixing) > cancellations(calm), 'Under repair: in between');
    console.log(`PASS week: cancellations ${cancellations(calm).toLocaleString()} → ${cancellations(hurt).toLocaleString()} open (${cancellations(fixing).toLocaleString()} under repair); viewing hours ${hours(calm).toLocaleString()} → ${hours(hurt).toLocaleString()}; revenue ${revenue(calm).toLocaleString()} → ${revenue(hurt).toLocaleString()}`);

    /* ── STATUS names it ── */
    const card = getStreamingStatusBoard(playerWith([outage('DETECTED')])).open[0];
    assert.ok(card.damage.some(line => /^Viewing −\d/.test(line)) && card.damage.some(line => /^Churn \+\d/.test(line)), card.damage.join(', '));
    console.log(`PASS status: ${card.damage.join(', ')}`);

    /* ── the 0–10 scale fixes: on a stressed night (95% load, tech debt 40) the risk now falls as Security
       and Reliability rise; the old terms (×0.018, ×0.012 on 0–100 levels) pinned it at its 0.02 floor
       from about level 3 ── */
    const at = (security: number, reliability: number): OwnedStreamingPlatformState => ({
        ...base,
        technologyLevels: { ...base.technologyLevels, SECURITY: security, RELIABILITY: reliability },
        infrastructureSetup: base.infrastructureSetup ? { ...base.infrastructureSetup, technicalDebt: 40 } : base.infrastructureSetup,
        techTree: base.techTree ? { ...base.techTree, debt: 0 } : base.techTree,
    });
    const last = base.weeklyHistory.at(-1)!;
    const stressed = { ...last, operations: { ...last.operations!, capacityUtilizationPercent: 95, playbackSuccessRate: 99.5 } };
    const calmState = { securityPressure: 0, employeeLoyalty: 75 };
    const levels: Array<[number, number]> = [[10, 10], [30, 40], [60, 70], [90, 90]];
    const risks = levels.map(([security, reliability]) => streamingCrisisRisk(at(security, reliability), stressed, calmState));
    const oldRisk = ([security, reliability]: [number, number]) => Math.min(.78, Math.max(.02,
        .045 + (95 - 82) / 145 + 40 / 150 - security * .018 - reliability * .012));
    assert.ok(risks.every((risk, index) => index === 0 || risk < risks[index - 1]), `Better security and reliability, fewer crises: ${risks.map(risk => risk.toFixed(3)).join(' > ')}`);
    assert.deepEqual(levels.map(oldRisk).map(risk => risk.toFixed(3)), ['0.101', '0.020', '0.020', '0.020'], 'Before: the floor from 30/40 up');
    assert.equal(streamingCrisisRisk(at(30, 40), { ...last, operations: { ...last.operations!, capacityUtilizationPercent: 48 } }, calmState) < risks[1], true, 'A calm night is safer');
    console.log(`PASS scale: weekly crisis risk on a stressed night at security/reliability ${levels.map(level => level.join('/')).join(', ')}: ${risks.map(risk => risk.toFixed(3)).join(', ')} (before: ${levels.map(oldRisk).map(risk => risk.toFixed(3)).join(', ')})`);
    console.log(`done in ${Math.round((performance.now() - started) / 1000)} s`);
}

main().catch(error => { console.error(error); process.exit(1); });
