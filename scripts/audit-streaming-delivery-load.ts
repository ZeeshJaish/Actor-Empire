/** Streaming delivery, Phase 2 #42 (codex-handoff/plans/platform-tech-plan.md §5). Checks:
 *  - load units: 1080p = 1 with §5's ratios (480p 0.4, 720p 0.64, 4K 2.4…), HDR, 12/16-bit
 *    colour and lossless sound on top; a plan's load from what it streams; the accounts' mix;
 *  - calibration: a service whose first week runs under load units has 1; a save that ran
 *    weeks before keeps its peak load (1 / its viewers' load × its Optimisation), fixed once;
 *  - the bandwidth bill: hours × $/HD-hour × picture × Optimisation × (1 + debt / 200), phased
 *    in over 8 weeks for a save from before Phase 2;
 *  - the weekly close on the developer test company: load units and utilization, the bill in
 *    the money out (Boardroom, Finance room), Optimisation measurably cutting both, debt
 *    raising the bill, an old save with no load jump and the bill phasing in;
 *  - the Delivery campus line points to Optimisation. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import {
    STREAMING_DELIVERY_COST_PER_HD_HOUR, STREAMING_DELIVERY_PHASE_IN_WEEKS, STREAMING_PICTURE_LOAD, normalizeStreamingDeliveryEconomics,
    resolveStreamingDeliveryLoad, resolveStreamingLoadCalibration, streamingAverageViewerLoad, streamingDeliveryPhaseIn, streamingPlanLoad,
} from '../services/streamingDeliveryLoad';
import {
    normalizeStreamingTechTreeState, resolveStreamingTechTree, streamingTechCostFactor, streamingTechLoadFactor,
} from '../services/streamingTechTreeCatalogue';
import { unlockStreamingTech } from '../services/streamingTechTree';
import { getStreamingTechDesk } from '../services/streamingTechDesk';
import { STREAMING_DELIVERY_MOVED_BLOCKER, getStreamingTechnologyCampus } from '../services/streamingTechnologyCampus';
import { getStreamingFinanceRoom } from '../services/streamingFinanceRoom';
import { createCanonicalBoardroomState, createCanonicalNetworkState } from '../components/streaming-transplant/createCanonicalStreamingPresentation';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Delivery Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const weekOf = (player: Player) => getAbsoluteWeek(player.age, player.currentWeek);
const ops = (player: Player) => player.ownedStreamingPlatform.weeklyHistory.at(-1)!.operations!;
const near = (actual: number, expected: number, tolerance: number, label: string) => (
    assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} vs ${expected}`)
);
const at = (techs: Record<string, number>) => normalizeStreamingTechTreeState({ schemaVersion: 2, techs: Object.fromEntries(Object.entries(techs)
    .map(([id, level]) => [id, { version: level, progress: 0, unlockedAtAbsoluteWeek: 5, versionReachedAtAbsoluteWeek: 5 }])) }, {});

async function main() {
    const started = performance.now();

    /* ── load units ── */
    const ratio = (id: string) => STREAMING_PICTURE_LOAD[id as keyof typeof STREAMING_PICTURE_LOAD]! / STREAMING_PICTURE_LOAD.PICTURE_480P!;
    assert.equal(STREAMING_PICTURE_LOAD.PICTURE_1080P, 1, 'A 1080p viewer is one unit: a stream as the game always counted it');
    assert.deepEqual(['PICTURE_720P', 'PICTURE_1080P', 'PICTURE_4K', 'PICTURE_8K', 'PICTURE_12K', 'PICTURE_16K', 'PICTURE_24K'].map(id => Math.round(ratio(id) * 10) / 10),
        [1.6, 2.5, 6, 14, 24, 36, 60], 'The ratios are §5\'s table (480p = 1)');
    const starters = at({});
    const hdTree = at({ PICTURE_720P: 1, PICTURE_1080P: 1 });
    const uhdTree = at({ PICTURE_720P: 1, PICTURE_1080P: 1, PICTURE_4K: 1, HDR_HDR: 1 });
    const studioTree = at({ PICTURE_720P: 1, PICTURE_1080P: 1, PICTURE_4K: 1, HDR_HDR: 1, HDR_PRO: 1, COLOUR_10BIT: 1, COLOUR_12BIT: 1, SOUND_51: 1, SOUND_71: 1, SOUND_SPATIAL: 1, SOUND_LOSSLESS: 1 });
    assert.deepEqual([streamingPlanLoad([], starters), streamingPlanLoad([], hdTree), streamingPlanLoad(['hd'], hdTree)],
        [.4, .64, 1], 'Without 720p a plan streams 480p, with it 720p; an HD plan streams 1080p');
    near(streamingPlanLoad(['uhd'], uhdTree), 2.64, 1e-9, '4K with HDR: 2.4 × 1.10');
    near(streamingPlanLoad(['uhd', 'spatial'], studioTree), 2.4 * (1 + .15 + .05 + .03), 1e-9, '4K with HDR Pro, 12-bit and lossless Spatial');
    const mixPlatform = { serviceConfiguration: { pricing: { plans: [
        { id: 'A', name: 'Basic', monthly: 7, featureIds: [], ads: false },
        { id: 'B', name: 'Premium', monthly: 20, featureIds: ['uhd'], ads: false },
    ] } }, techTree: uhdTree } as unknown as Parameters<typeof streamingAverageViewerLoad>[0];
    near(streamingAverageViewerLoad(mixPlatform, [{ planId: 'A', paidAccounts: 300 }, { planId: 'B', paidAccounts: 100 }]), (300 * .64 + 100 * 2.64) / 400, 1e-9, 'The accounts\' mix');
    near(streamingAverageViewerLoad(mixPlatform, []), (.64 + 2.64) / 2, 1e-9, 'No accounts yet: the plans\' plain average');
    assert.equal(resolveStreamingLoadCalibration({ lastProcessedAbsoluteWeek: null }, 2), 1, 'A service starting under load units has 1');
    near(resolveStreamingLoadCalibration({ lastProcessedAbsoluteWeek: 700, techTree: at({ OPT_HEVC: 1 }) }, 1.6), 1 / (1.6 * .85), 1e-9, 'An old save keeps its load: 1 / (load × Optimisation)');
    assert.equal(resolveStreamingLoadCalibration({ lastProcessedAbsoluteWeek: 700, deliveryEconomics: { schemaVersion: 1, loadCalibration: 1.25, calibratedAtAbsoluteWeek: 690 } }, 9), 1.25, 'Once fixed it stays');
    assert.deepEqual([0, 3, 7, 8, 30].map(offset => streamingDeliveryPhaseIn({ schemaVersion: 1, loadCalibration: 1, calibratedAtAbsoluteWeek: 100, costPhaseInFromWeek: 100 }, 100 + offset)),
        [1 / 8, 4 / 8, 1, 1, 1], 'The bill phases in over 8 weeks');
    assert.equal(streamingDeliveryPhaseIn({ schemaVersion: 1, loadCalibration: 1, calibratedAtAbsoluteWeek: 100 }, 100), 1, 'A new service pays it in full');
    const economics = normalizeStreamingDeliveryEconomics({ schemaVersion: 1, loadCalibration: 1.23456789, calibratedAtAbsoluteWeek: 700.4, costPhaseInFromWeek: 700 });
    assert.deepEqual(economics, { schemaVersion: 1, loadCalibration: 1.234568, calibratedAtAbsoluteWeek: 700, costPhaseInFromWeek: 700 });
    assert.deepEqual(normalizeStreamingDeliveryEconomics(economics), economics, 'Normalising is idempotent');
    assert.equal(normalizeStreamingDeliveryEconomics({ loadCalibration: 0 }), undefined, 'A broken record is dropped');
    console.log(`PASS units: 1080p = 1, §5's ratios, 4K HDR ${streamingPlanLoad(['uhd'], uhdTree).toFixed(2)}, calibration 1 for a new service and fixed once for an old save, the bill in eighths over ${STREAMING_DELIVERY_PHASE_IN_WEEKS} weeks`);

    /* ── the developer test company: a service whose weeks all ran under load units ── */
    const base = await buildStreamingFullPlatformQa(fresh('delivery-load-audit'), { processWeek: processGameWeek, persistWeek: async next => next });
    console.log(`test company built in ${Math.round((performance.now() - started) / 1000)} s`);
    const platform = normalizeOwnedStreamingPlatformState(base.ownedStreamingPlatform, base.id);
    assert.deepEqual([platform.deliveryEconomics?.loadCalibration, platform.deliveryEconomics?.costPhaseInFromWeek], [1, undefined], 'Its first close fixed calibration 1, with no phase-in');
    const last = ops(base);
    const load = resolveStreamingDeliveryLoad(platform, last.worldCustomerPlanAllocations || []);
    near(last.viewerLoad!, load.viewerLoad, 1e-4, 'The week\'s viewer load is the plan mix × Optimisation');
    near(load.loadFactor, .65, 1e-9, 'It owns AV1 (given from Delivery 45)');
    near(last.peakLoadUnits!, last.peakConcurrentStreams * last.viewerLoad!, last.peakConcurrentStreams * 1e-4 + 1, 'Peak load units = peak viewers × viewer load (stored to 4 decimals)');
    near(last.capacityUtilizationPercent, last.peakLoadUnits! / platform.capacity.burstConcurrentStreams * 100, 1.5, 'Utilization is load units against burst capacity');
    const expectedBill = last.worldViewingHours! * STREAMING_DELIVERY_COST_PER_HD_HOUR * load.averageViewerLoad * streamingTechCostFactor(resolveStreamingTechTree(platform))
        * (1 + 0 / 200);
    near(last.streamingDeliveryCost!, expectedBill, Math.max(2, expectedBill * .02), 'The bill: hours × $/HD-hour × picture × Optimisation (× debt)');
    assert.ok(last.streamingDeliveryCost! > 0 && last.totalCashCost >= last.streamingDeliveryCost!, 'It is in the week\'s money out');
    const boardroom = createCanonicalBoardroomState(base);
    assert.equal(boardroom.weeklyCosts.find(line => line.id === 'DELIVERY')?.amount, last.streamingDeliveryCost, 'The Boardroom lists Streaming delivery');
    assert.equal(Math.round(boardroom.weeklyCosts.reduce((sum, line) => sum + line.amount, 0)), last.totalCashCost, 'and its money out still adds up to the week\'s cost');
    const network = getStreamingFinanceRoom(base, 'ALL').expenseSlices.find(slice => slice.id === 'network');
    assert.ok(network && network.amount > 0, 'The Finance room\'s Network (servers and bandwidth) is there');
    assert.match(createCanonicalNetworkState(base).headroom, /HD streams free$/, 'Headroom is in HD streams');
    assert.equal(getStreamingTechDesk(base).deliveryCost, last.streamingDeliveryCost, 'The Tech tab knows the bill');
    console.log(`PASS test company: viewer load ${last.viewerLoad} (mix ${load.averageViewerLoad.toFixed(3)} × AV1 ${load.loadFactor}), peak ${last.peakLoadUnits!.toLocaleString()} units of ${last.peakConcurrentStreams.toLocaleString()} viewers, utilization ${last.capacityUtilizationPercent}%, bill $${last.streamingDeliveryCost!.toLocaleString()} on ${last.worldViewingHours!.toLocaleString()} hours`);

    /* ── Optimisation measurably cuts load and the bill ── */
    const richer = { ...base, ownedStreamingPlatform: { ...base.ownedStreamingPlatform, treasuryCash: Math.max(base.ownedStreamingPlatform.treasuryCash, 500_000_000) } };
    const optimised = unlockStreamingTech(richer, 'OPT_VVC');
    assert.ok(optimised.changed, `The next-gen codec unlocks: ${optimised.reason}`);
    const weekA = (await processGameWeek(richer)).player;
    const weekB = (await processGameWeek(optimised.player)).player;
    const a = ops(weekA);
    const b = ops(weekB);
    near(b.viewerLoad! / a.viewerLoad!, .45 / .65, .002, 'The next-gen codec: a viewer\'s load × 0.45 / 0.65');
    assert.ok(b.peakLoadUnits! < a.peakLoadUnits! && b.capacityUtilizationPercent < a.capacityUtilizationPercent, 'Peak load and utilization fall');
    near(b.streamingDeliveryCost! / a.streamingDeliveryCost!, (.45 / .65) * (b.worldViewingHours! / a.worldViewingHours!), .01, 'The bill falls by the same factor');
    console.log(`PASS optimisation: AV1 → next-gen codec, viewer load ${a.viewerLoad} → ${b.viewerLoad}, utilization ${a.capacityUtilizationPercent}% → ${b.capacityUtilizationPercent}%, bill $${a.streamingDeliveryCost!.toLocaleString()} → $${b.streamingDeliveryCost!.toLocaleString()} a week`);

    /* ── tech debt raises the bill ── */
    const indebted = { ...richer, ownedStreamingPlatform: { ...richer.ownedStreamingPlatform, techTree: { ...resolveStreamingTechTree(richer.ownedStreamingPlatform), debt: 40 } } };
    const weekDebt = ops((await processGameWeek(indebted)).player);
    const infraDebt = richer.ownedStreamingPlatform.infrastructureSetup?.technicalDebt || 0;
    near(weekDebt.streamingDeliveryCost! / a.streamingDeliveryCost!, (1 + (40 + infraDebt) / 200) / (1 + infraDebt / 200) * (weekDebt.worldViewingHours! / a.worldViewingHours!), .01, '40 debt: the bill × 1.2');
    console.log(`PASS debt: 40 tech debt raises the bill $${a.streamingDeliveryCost!.toLocaleString()} → $${weekDebt.streamingDeliveryCost!.toLocaleString()}`);

    /* ── a save from before Phase 2: no load jump, the bill phases in ── */
    const oldRoot = structuredClone(richer.ownedStreamingPlatform) as unknown as Record<string, any>;
    delete oldRoot.deliveryEconomics;
    const oldSave = { ...richer, ownedStreamingPlatform: oldRoot } as unknown as Player;
    const oldWeek1 = (await processGameWeek(oldSave)).player;
    const o1 = ops(oldWeek1);
    const oldEconomics = normalizeOwnedStreamingPlatformState(oldWeek1.ownedStreamingPlatform, oldWeek1.id).deliveryEconomics!;
    near(o1.viewerLoad!, 1, 1e-4, 'Its first close under load units: a viewer still counts as one stream');
    assert.equal(o1.peakLoadUnits, o1.peakConcurrentStreams, 'so its peak load is what it was');
    near(o1.capacityUtilizationPercent, o1.peakConcurrentStreams / richer.ownedStreamingPlatform.capacity.burstConcurrentStreams * 100, 1.5, 'and utilization is the old formula\'s');
    assert.equal(oldEconomics.costPhaseInFromWeek, weekOf(oldWeek1), 'The bill phases in from that week');
    near(oldEconomics.loadCalibration, 1 / (a.viewerLoad!), .002, 'Calibration = 1 / (its viewers\' load × its Optimisation)');
    near(o1.streamingDeliveryPhaseIn!, 1 / 8, 1e-9, 'Week 1 pays an eighth');
    near(o1.streamingDeliveryCost!, a.streamingDeliveryCost! / 8 * (o1.worldViewingHours! / a.worldViewingHours!), Math.max(2, a.streamingDeliveryCost! * .01), '…of the full bill');
    near(getStreamingTechDesk(oldWeek1).deliveryCost, o1.streamingDeliveryCost! * 8, 8, 'The Tech tab counts savings on the full bill, not the eighth');
    const o2 = ops((await processGameWeek(oldWeek1)).player);
    near(o2.streamingDeliveryPhaseIn!, 2 / 8, 1e-9, 'Week 2 pays two eighths');
    assert.equal(createCanonicalBoardroomState({ ...oldWeek1 }).weeklyCosts.find(line => line.id === 'DELIVERY')?.label, 'Streaming delivery · 1/8', 'The Boardroom says so');
    const loaded = migratePlayerSave(JSON.parse(JSON.stringify(oldSave)));
    assert.deepEqual([loaded.money, loaded.ownedStreamingPlatform.treasuryCash, loaded.currentWeek], [oldSave.money, richer.ownedStreamingPlatform.treasuryCash, oldSave.currentWeek], 'Loading an old save moves no money or time');
    assert.equal(normalizeOwnedStreamingPlatformState(loaded.ownedStreamingPlatform, loaded.id).deliveryEconomics, undefined, 'and fixes nothing: only a weekly close calibrates');
    console.log(`PASS old save: viewer load 1 at its first close (peak ${o1.peakLoadUnits!.toLocaleString()} = ${o1.peakConcurrentStreams.toLocaleString()} streams), calibration ${oldEconomics.loadCalibration}, bill $${o1.streamingDeliveryCost!.toLocaleString()} (1/8) then $${o2.streamingDeliveryCost!.toLocaleString()} (2/8)`);

    /* ── the Delivery campus line moved to Optimisation ── */
    const deliveryNodes = getStreamingTechnologyCampus(base).facilities.find(facility => facility.definition.id === 'DELIVERY_CAPACITY')!.nodes;
    assert.ok(deliveryNodes.filter(node => node.status !== 'INSTALLED' && node.status !== 'BUILDING').every(node => node.blockers.includes(STREAMING_DELIVERY_MOVED_BLOCKER)), 'Delivery nodes point to Optimisation');
    assert.ok(streamingTechLoadFactor(resolveStreamingTechTree(base.ownedStreamingPlatform)) < 1, 'and the codecs carry the load instead');
    console.log(`PASS campus: ${deliveryNodes.filter(node => node.status !== 'INSTALLED').length} unbuilt Delivery nodes point to Optimisation`);

    console.log(`done in ${Math.round((performance.now() - started) / 1000)} s`);
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
