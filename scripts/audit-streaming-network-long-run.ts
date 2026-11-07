/**
 * #94 the Network page's balance over a long career (codex-handoff/plans/platform-tech-plan.md §17.8). On the "Full
 * streaming company" test career, 104 weeks of the weekly close with the network changed as a player would:
 *  - every 13 weeks a region (in turn) orders 4 more Workhorses (Build's own regional placement), and the first one is
 *    brought forward a week with energy;
 *  - every 26 weeks a region sells 2 of its Titans back;
 *  - every order goes into service on its week, once; what it adds raises capacity and what it sells lowers it;
 *  - nothing turns NaN (treasury, capacity, the week's costs), the peak load stays under capacity, and the saved
 *    orders stay bounded (a year of finished ones, #93).
 * It prints what the network cost over the two years: money up front, refunds, energy, capacity and the weekly bill
 * from start to end, the peak load's range, and the weekly close's time. (~3–5 min: it builds the test company first)
 */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type OwnedStreamingFacility, type Player, type StreamingServerTier } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { deriveStreamingRegionalPlacement } from '../services/streamingRegionalNetworkPlan';
import {
    orderStreamingNetworkRegion,
    previewStreamingNetworkOrder,
    sellStreamingNetworkRacks,
    speedUpStreamingNetworkOrder,
    streamingFacilityRacksByTier,
    streamingNetworkRegionOf,
} from '../services/streamingNetworkOrders';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Network Long Run', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const withEnergy = (player: Player): Player => ({
    ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 },
});
const money = (value: number) => `$${(value / 1e6).toFixed(1)}M`;
const regionRooms = (facilities: OwnedStreamingFacility[], regionId: string) => facilities.filter(facility => streamingNetworkRegionOf(facility.cityId) === regionId);
const tierTotal = (facilities: OwnedStreamingFacility[], tier: StreamingServerTier) => facilities.reduce((sum, facility) => sum + streamingFacilityRacksByTier(facility)[tier], 0);
const finite = (value: unknown, what: string) => assert.ok(typeof value === 'number' && Number.isFinite(value), `${what} is a number (${value})`);

(async () => {
    const started = performance.now();
    let player = withEnergy(await buildStreamingFullPlatformQa(fresh('network-long-run'), { processWeek: processGameWeek, persistWeek: async next => next }));
    const first = player.ownedStreamingPlatform;
    assert.ok(first.launchCommit && first.infrastructureSetup, 'the test company is live');
    const startCapacity = first.capacity.burstConcurrentStreams;
    const startWeekly = first.infrastructureSetup.weeklyOperatingCost;
    const startTreasury = first.treasuryCash;
    const regions = Array.from(new Set((first.infrastructureSetup.facilities || []).map(facility => streamingNetworkRegionOf(facility.cityId)).filter(Boolean))) as string[];
    let paid = 0;
    let refunded = 0;
    let energy = 0;
    let ordersPlaced = 0;
    let sellBacks = 0;
    let spedUp = false;
    const loads: number[] = [];
    const weekMs: number[] = [];
    const expected = new Map<string, { readyAt: number; direction: 1 | -1; capacityBefore: number }>();

    for (let week = 1; week <= 104; week += 1) {
        const platform = player.ownedStreamingPlatform;
        const setup = platform.infrastructureSetup!;
        const facilities = setup.facilities || [];
        const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
        const busy = new Set((platform.networkOrders || []).filter(order => order.status === 'BUILDING').map(order => order.regionId));

        /* every 13 weeks a region in turn grows by 4 Workhorses (not in the last 8, so each can land before the end) */
        if (week % 13 === 0 && week <= 96) {
            const regionId = regions[(week / 13 - 1) % regions.length];
            if (!busy.has(regionId)) {
                const plan = (setup.regionPlans || []).find(item => item.regionId === regionId)
                    || { regionId, serverCounts: { SCOUT: 0, WORKHORSE: 0, TITAN: 0 }, cloudProvider: null, cloudCompute: 0 };
                const nextPlan = { ...plan, serverCounts: { ...plan.serverCounts, WORKHORSE: tierTotal(regionRooms(facilities, regionId), 'WORKHORSE') + 4 } };
                const placed = deriveStreamingRegionalPlacement({ regionPlans: [nextPlan], openingCountryIds: [], existingFacilities: facilities, absoluteWeek });
                const rooms = regionRooms(placed.facilities, regionId);
                const preview = previewStreamingNetworkOrder(player, { regionId, facilities: rooms });
                if (preview.ok) {
                    const result = orderStreamingNetworkRegion(player, { regionId, facilities: rooms, regionPlan: nextPlan });
                    assert.ok(result.changed && result.order, result.message);
                    player = result.player;
                    paid += preview.capitalCost;
                    ordersPlaced += 1;
                    expected.set(result.order.id, { readyAt: result.order.readyAtAbsoluteWeek, direction: 1, capacityBefore: platform.capacity.burstConcurrentStreams });
                    if (!spedUp && result.order.readyAtAbsoluteWeek - absoluteWeek > 1) {
                        const fast = speedUpStreamingNetworkOrder(withEnergy(player), result.order.id);
                        assert.ok(fast.changed, fast.message);
                        const sped = fast.player.ownedStreamingPlatform.networkOrders!.find(order => order.id === result.order!.id)!;
                        assert.equal(sped.readyAtAbsoluteWeek, result.order.readyAtAbsoluteWeek - 1, 'a week sooner');
                        energy += sped.energySpent;
                        expected.set(sped.id, { ...expected.get(sped.id)!, readyAt: sped.readyAtAbsoluteWeek });
                        player = fast.player;
                        spedUp = true;
                    }
                }
            }
        }
        /* every 26 weeks a region sells 2 Titans back (not in the last 8) */
        if (week % 26 === 0 && week <= 96) {
            const regionId = regions.find(id => !busy.has(id) && !(player.ownedStreamingPlatform.networkOrders || []).some(order => order.status === 'BUILDING' && order.regionId === id)
                && tierTotal(regionRooms(facilities, id), 'TITAN') >= 2);
            if (regionId) {
                const rooms = regionRooms(sellStreamingNetworkRacks(facilities, regionId, 'TITAN', 2), regionId);
                const plan = (setup.regionPlans || []).find(item => item.regionId === regionId)
                    || { regionId, serverCounts: { SCOUT: 0, WORKHORSE: 0, TITAN: 0 }, cloudProvider: null, cloudCompute: 0 };
                const nextPlan = { ...plan, serverCounts: { ...plan.serverCounts, TITAN: Math.max(0, tierTotal(regionRooms(facilities, regionId), 'TITAN') - 2) } };
                const preview = previewStreamingNetworkOrder(player, { regionId, facilities: rooms });
                assert.ok(preview.ok, preview.message);
                const result = orderStreamingNetworkRegion(player, { regionId, facilities: rooms, regionPlan: nextPlan });
                assert.ok(result.changed && result.order, result.message);
                player = result.player;
                refunded += preview.refund;
                sellBacks += 1;
                expected.set(result.order.id, { readyAt: result.order.readyAtAbsoluteWeek, direction: -1, capacityBefore: player.ownedStreamingPlatform.capacity.burstConcurrentStreams });
            }
        }

        const timer = performance.now();
        player = withEnergy((await processGameWeek(withEnergy(player))).player);
        weekMs.push(performance.now() - timer);

        const now = player.ownedStreamingPlatform;
        const latest = now.weeklyHistory.at(-1)?.operations;
        finite(now.treasuryCash, `week ${week} treasury`);
        finite(now.capacity.burstConcurrentStreams, `week ${week} capacity`);
        finite(now.infrastructureSetup?.weeklyOperatingCost, `week ${week} weekly network cost`);
        if (latest) {
            finite(latest.capacityUtilizationPercent, `week ${week} peak load`);
            loads.push(latest.capacityUtilizationPercent);
            assert.ok(latest.capacityUtilizationPercent < 100, `week ${week}: the peak load stays under capacity (${latest.capacityUtilizationPercent}%)`);
        }
        /* every order due by now went into service, once, and moved capacity its way */
        const orders = now.networkOrders || [];
        const closed = getAbsoluteWeek(player.age, player.currentWeek);
        for (const [id, want] of expected) {
            const order = orders.find(item => item.id === id);
            if (!order || order.status !== 'DONE') {
                assert.ok(want.readyAt > closed - 1, `order ${id} went into service by week ${want.readyAt} (now ${closed})`);
                continue;
            }
            const moved = now.capacity.burstConcurrentStreams - want.capacityBefore;
            assert.ok(want.direction > 0 ? moved > 0 : moved < 0 || orders.some(other => other.id !== id && other.status === 'DONE' && other.completedAtAbsoluteWeek === order.completedAtAbsoluteWeek),
                `order ${id} moved capacity ${want.direction > 0 ? 'up' : 'down'} (${moved})`);
            expected.delete(id);
        }
        assert.ok(orders.filter(order => order.status === 'DONE').length <= 60, 'finished orders kept within 60');
    }

    const end = player.ownedStreamingPlatform;
    assert.equal(expected.size, 0, 'every order went into service');
    assert.ok(ordersPlaced >= 6 && sellBacks >= 2 && spedUp, `the career ordered (${ordersPlaced}), sold back (${sellBacks}) and sped up`);
    const average = weekMs.reduce((sum, ms) => sum + ms, 0) / weekMs.length;
    console.log(`PASS two years: ${ordersPlaced} builds (+4 Workhorses each) for ${money(paid)}, ${sellBacks} sell-backs for ${money(refunded)} back, ${energy}⚡ on one speed-up`);
    console.log(`PASS network: capacity ${(startCapacity / 1e6).toFixed(1)}M → ${(end.capacity.burstConcurrentStreams / 1e6).toFixed(1)}M, weekly bill ${money(startWeekly)} → ${money(end.infrastructureSetup!.weeklyOperatingCost)}, peak load ${Math.min(...loads)}–${Math.max(...loads)}%`);
    console.log(`PASS company: treasury ${money(startTreasury)} → ${money(end.treasuryCash)}; ${end.networkOrders?.length ?? 0} orders kept; the weekly close ${Math.round(average)} ms on average (${Math.round(Math.max(...weekMs))} ms at most)`);
    console.log(`done in ${Math.round((performance.now() - started) / 1000)} s`);
})().catch(error => { console.error(error); process.exit(1); });
