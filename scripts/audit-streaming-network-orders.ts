/**
 * #89 network orders (codex-handoff/plans/platform-tech-plan.md §17). On the "Full streaming company" test career:
 *  - capacity counts each maker's power: the same room as Titans carries well over its Workhorse load, as Scouts less;
 *  - a revision counted before #89 is recounted once, and only once, and the platform's capacity moves by the change;
 *  - a region's build (8 Titans more, Build's own regional placement): 8 × $8.25M plus its new rooms' deposit and setup,
 *    paid at once; Titan time (5 weeks, a week more in a city the network never used); the region busy meanwhile;
 *    energy (10⚡ + 2⚡) brings it forward a week a step down to a week left; when due it goes into service (a new
 *    revision, the rooms in the setup, capacity up), once;
 *  - a sell-back (2 racks): the region's resale rate of their price back at once, a week, capacity down when it lands;
 *  - two regions build side by side, and the weekly close puts a due order into service;
 *  - refusals: nothing changes, rooms from another region, a Build change under way, not live, not enough money.
 * (~60 s: it builds the test company first)
 */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type OwnedStreamingFacility, type Player, type StreamingServerTier } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { createCanonicalNetworkState } from '../components/streaming-transplant/createCanonicalStreamingPresentation';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { deriveStreamingNetworkSetupValues } from '../services/streamingInfrastructure';
import { deriveStreamingRegionalPlacement } from '../services/streamingRegionalNetworkPlan';
import {
    STREAMING_NETWORK_BUILD_WEEKS,
    completeDueStreamingNetworkOrders,
    orderStreamingNetworkRegion,
    previewStreamingNetworkOrder,
    recountStreamingNetworkCapacity,
    sellStreamingNetworkRacks,
    speedUpStreamingNetworkOrder,
    streamingFacilityRacksByTier,
    streamingNetworkRackPrice,
    streamingNetworkRegionOf,
    streamingNetworkResaleRate,
    streamingNetworkSpeedUpEnergy,
} from '../services/streamingNetworkOrders';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Network Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const withEnergy = (player: Player): Player => ({
    ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 },
});
/** the player moved to an absolute week (age and week of year) */
const atWeek = (player: Player, absoluteWeek: number): Player => ({ ...player, age: Math.floor(absoluteWeek / 52) + 1, currentWeek: (absoluteWeek % 52) + 1 });
const money = (value: number) => `$${(value / 1e6).toFixed(2)}M`;
const regionRooms = (facilities: OwnedStreamingFacility[], regionId: string) => facilities.filter(facility => streamingNetworkRegionOf(facility.cityId) === regionId);
const tierTotal = (facilities: OwnedStreamingFacility[], tier: StreamingServerTier) => facilities.reduce((sum, facility) => sum + streamingFacilityRacksByTier(facility)[tier], 0);

(async () => {
    const started = performance.now();
    const built = withEnergy(await buildStreamingFullPlatformQa(fresh('network-orders-audit'), { processWeek: processGameWeek, persistWeek: async next => next }));
    const platform = built.ownedStreamingPlatform;
    const setup = platform.infrastructureSetup!;
    assert.ok(setup && platform.launchCommit, 'the test company is live');
    const strategy = setup.strategy || 'HYBRID';
    const facilities = setup.facilities || [];
    const regions = Array.from(new Set(facilities.map(facility => streamingNetworkRegionOf(facility.cityId)).filter(Boolean))) as string[];
    assert.ok(regions.length >= 2, `rooms in two regions or more (${regions.join(', ')})`);
    const absoluteWeek = getAbsoluteWeek(built.age, built.currentWeek);

    /* ── capacity counts each maker's power ── */
    const hardware = facilities.find(facility => streamingFacilityRacksByTier(facility).WORKHORSE + streamingFacilityRacksByTier(facility).TITAN + streamingFacilityRacksByTier(facility).SCOUT >= 8)!;
    const as = (tier: StreamingServerTier) => ({ ...hardware, rackGroups: (hardware.rackGroups || []).map(group => ({ ...group, serverTier: tier })) });
    const capacityAs = (tier: StreamingServerTier) => deriveStreamingNetworkSetupValues(setup, strategy, [as(tier)], []).baselineConcurrentStreams;
    const [scout, workhorse, titan] = (['SCOUT', 'WORKHORSE', 'TITAN'] as const).map(capacityAs);
    assert.ok(titan > workhorse * 1.3 && scout < workhorse * .8, `Titans ${titan}, Workhorses ${workhorse}, Scouts ${scout} in the same room`);
    console.log(`PASS makers: one room of ${hardware.installedRacks} racks carries ${workhorse.toLocaleString()} as Workhorses, ${titan.toLocaleString()} as Titans (×${(titan / workhorse).toFixed(2)}), ${scout.toLocaleString()} as Scouts (×${(scout / workhorse).toFixed(2)})`);

    /* ── a revision counted before #89 is recounted once ── */
    const asWorkhorses = facilities.map(facility => ({ ...facility, rackGroups: (facility.rackGroups || []).map(group => ({ ...group, serverTier: 'WORKHORSE' as const })) }));
    const oldCount = deriveStreamingNetworkSetupValues(setup, strategy, asWorkhorses, setup.regionPlans || []);
    const newCount = deriveStreamingNetworkSetupValues(setup, strategy, facilities, setup.regionPlans || []);
    const old = structuredClone(built);
    const oldSetup = old.ownedStreamingPlatform.infrastructureSetup!;
    delete oldSetup.capacityModel;
    oldSetup.baselineConcurrentStreams = oldCount.baselineConcurrentStreams;
    oldSetup.burstConcurrentStreams = oldCount.burstConcurrentStreams;
    old.ownedStreamingPlatform.capacity = { baselineConcurrentStreams: oldCount.baselineConcurrentStreams + 1_000, burstConcurrentStreams: oldCount.burstConcurrentStreams + 2_000 };
    const recount = recountStreamingNetworkCapacity(old);
    const recounted = recount.player.ownedStreamingPlatform;
    assert.ok(recount.changed && recounted.infrastructureSetup?.capacityModel === 'TIERED', 'recounted and marked');
    assert.equal(recounted.infrastructureSetup?.baselineConcurrentStreams, newCount.baselineConcurrentStreams, 'the setup counts its makers');
    assert.equal(recounted.capacity.baselineConcurrentStreams, newCount.baselineConcurrentStreams + 1_000, 'the platform moves by the change (its other capacity kept)');
    assert.equal(recountStreamingNetworkCapacity(recount.player).changed, false, 'only once');
    console.log(`PASS recount: ${oldCount.baselineConcurrentStreams.toLocaleString()} → ${newCount.baselineConcurrentStreams.toLocaleString()} (each maker counted), once`);

    /* ── a region's build: 8 Titans more ── */
    const regionId = regions[0];
    const currentPlan = (setup.regionPlans || []).find(plan => plan.regionId === regionId)
        || { regionId, serverCounts: { SCOUT: 0, WORKHORSE: 0, TITAN: 0 }, cloudProvider: null, cloudCompute: 0 };
    const nextPlan = { ...currentPlan, serverCounts: { ...currentPlan.serverCounts, TITAN: tierTotal(regionRooms(facilities, regionId), 'TITAN') + 8 } };
    const placed = deriveStreamingRegionalPlacement({ regionPlans: [nextPlan], openingCountryIds: [], existingFacilities: facilities, absoluteWeek });
    const nextRooms = regionRooms(placed.facilities, regionId);
    const preview = previewStreamingNetworkOrder(built, { regionId, facilities: nextRooms });
    assert.ok(preview.ok, preview.message);
    assert.deepEqual(preview.racksAdded, { SCOUT: 0, WORKHORSE: 0, TITAN: 8 });
    const roomCosts = nextRooms.filter(room => preview.newRoomIds.includes(room.id)).reduce((sum, room) => sum + (room.lease?.depositCost || 0) + (room.lease?.setupCost || 0), 0);
    assert.equal(preview.capitalCost, 8 * streamingNetworkRackPrice('TITAN') + roomCosts, 'Titans at their price plus the new rooms');
    assert.equal(streamingNetworkRackPrice('TITAN'), 8_250_000);
    assert.equal(preview.buildWeeks, STREAMING_NETWORK_BUILD_WEEKS.TITAN + (preview.newCityIds.length ? 1 : 0), `Titan time${preview.newCityIds.length ? ' and a new city' : ''}`);
    const treasury = platform.treasuryCash;
    const ordered = orderStreamingNetworkRegion(built, { regionId, facilities: nextRooms, regionPlan: nextPlan });
    assert.ok(ordered.changed && ordered.order, ordered.message);
    let player = ordered.player;
    assert.equal(player.ownedStreamingPlatform.treasuryCash, treasury - preview.capitalCost, 'paid at once');
    assert.equal(previewStreamingNetworkOrder(player, { regionId, facilities: nextRooms }).reason, 'REGION_BUSY', 'one order a region at a time');
    console.log(`PASS build: ${preview.message} for ${money(preview.capitalCost)} (${preview.newRoomIds.length} new room${preview.newRoomIds.length === 1 ? '' : 's'}), ready in ${preview.buildWeeks} weeks`);

    /* energy brings it forward */
    const order = ordered.order!;
    const step = streamingNetworkSpeedUpEnergy(order);
    assert.equal(step, 12, '10⚡ + 1⚡ for every 4 racks');
    let cut = 0;
    for (;;) {
        const energyBefore = player.energy.current;
        const sped = speedUpStreamingNetworkOrder(player, order.id);
        if (!sped.changed) {
            assert.equal(sped.reason, 'AT_ONE_WEEK', sped.message);
            break;
        }
        assert.equal(energyBefore - sped.player.energy.current, step, 'its energy taken');
        player = sped.player;
        cut += 1;
    }
    const sped = player.ownedStreamingPlatform.networkOrders!.find(item => item.id === order.id)!;
    assert.equal(cut, preview.buildWeeks - 1, 'down to a week left');
    assert.equal(sped.readyAtAbsoluteWeek, absoluteWeek + 1);
    console.log(`PASS speed-up: ${cut} weeks cut for ${cut * step}⚡ (${step}⚡ a week), ready next week`);

    /* it goes into service when due, once */
    const before = player.ownedStreamingPlatform;
    assert.equal(completeDueStreamingNetworkOrders(player).changed, false, 'not before its week');
    const landed = completeDueStreamingNetworkOrders(atWeek(player, sped.readyAtAbsoluteWeek));
    const after = landed.player.ownedStreamingPlatform;
    assert.equal(landed.completed.length, 1);
    assert.equal(after.infrastructureSetup?.revision, before.infrastructureSetup!.revision + 1, 'a new revision');
    assert.equal(tierTotal(regionRooms(after.infrastructureSetup!.facilities || [], regionId), 'TITAN'), nextPlan.serverCounts.TITAN, 'the Titans in the setup');
    assert.ok(after.capacity.baselineConcurrentStreams > before.capacity.baselineConcurrentStreams, 'more capacity');
    assert.equal(after.networkOrders!.find(item => item.id === order.id)?.status, 'DONE');
    assert.equal(completeDueStreamingNetworkOrders(landed.player).changed, false, 'never twice');
    console.log(`PASS in service: revision ${after.infrastructureSetup?.revision}, capacity ${before.capacity.baselineConcurrentStreams.toLocaleString()} → ${after.capacity.baselineConcurrentStreams.toLocaleString()}, weekly cost ${money(before.infrastructureSetup!.weeklyOperatingCost)} → ${money(after.infrastructureSetup!.weeklyOperatingCost)}`);

    /* ── a sell-back ── */
    const sellRegion = regions.find(id => (['WORKHORSE', 'TITAN', 'SCOUT'] as const).some(tier => tierTotal(regionRooms(facilities, id), tier) >= 2) && id !== regionId) || regions[1];
    const sellTier = (['WORKHORSE', 'TITAN', 'SCOUT'] as const).find(tier => tierTotal(regionRooms(facilities, sellRegion), tier) >= 2)!;
    const sold = regionRooms(sellStreamingNetworkRacks(facilities, sellRegion, sellTier, 2), sellRegion);
    assert.equal(tierTotal(sold, sellTier), tierTotal(regionRooms(facilities, sellRegion), sellTier) - 2, 'two racks fewer');
    const sale = previewStreamingNetworkOrder(built, { regionId: sellRegion, facilities: sold });
    assert.ok(sale.ok, sale.message);
    assert.equal(sale.racksSold[sellTier], 2);
    assert.equal(sale.refund, Math.round(2 * streamingNetworkRackPrice(sellTier) * streamingNetworkResaleRate(sellRegion)), 'the region\'s resale rate of their price');
    assert.deepEqual([sale.capitalCost, sale.buildWeeks], [0, 1]);
    const selling = orderStreamingNetworkRegion(built, { regionId: sellRegion, facilities: sold, regionPlan: { ...((setup.regionPlans || []).find(plan => plan.regionId === sellRegion) || { regionId: sellRegion, serverCounts: { SCOUT: 0, WORKHORSE: 0, TITAN: 0 }, cloudProvider: null, cloudCompute: 0 }), regionId: sellRegion } });
    assert.ok(selling.changed);
    assert.equal(selling.player.ownedStreamingPlatform.treasuryCash, treasury + sale.refund, 'the refund at once');
    const soldBack = completeDueStreamingNetworkOrders(atWeek(selling.player, absoluteWeek + 1)).player.ownedStreamingPlatform;
    assert.ok(soldBack.capacity.baselineConcurrentStreams < platform.capacity.baselineConcurrentStreams, 'capacity down when it lands');
    console.log(`PASS sell-back: 2 ${sellTier} in ${sellRegion} return ${money(sale.refund)} (${Math.round(streamingNetworkResaleRate(sellRegion) * 100)}% of ${money(2 * streamingNetworkRackPrice(sellTier))}), in a week; capacity ${platform.capacity.baselineConcurrentStreams.toLocaleString()} → ${soldBack.capacity.baselineConcurrentStreams.toLocaleString()}`);

    /* ── two regions side by side, and the weekly close ── */
    const both = orderStreamingNetworkRegion(ordered.player, { regionId: sellRegion, facilities: sold, regionPlan: { regionId: sellRegion, serverCounts: { SCOUT: 0, WORKHORSE: 0, TITAN: 0 }, cloudProvider: null, cloudCompute: 0 } });
    assert.ok(both.changed, both.message);
    assert.equal(both.player.ownedStreamingPlatform.networkOrders!.filter(item => item.status === 'BUILDING').length, 2, 'two regions building at once');
    const week = (await processGameWeek(withEnergy(both.player))).player;
    const weekly = week.ownedStreamingPlatform.networkOrders!;
    assert.equal(weekly.find(item => item.regionId === sellRegion && item.capitalCost === 0)?.status, 'DONE', 'the weekly close put the sell-back into service');
    assert.equal(weekly.find(item => item.id === order.id)?.status, 'BUILDING', 'the Titans still building');
    /* #92: the Platform room's BUILDING strip counts them, as the desk does */
    assert.deepEqual([createCanonicalNetworkState(both.player).networkBuilding, createCanonicalNetworkState(week).networkBuilding], [2, 1],
        'the room\'s BUILDING: two regions, then one a week on');
    console.log('PASS side by side: two regions building at once (the room\'s BUILDING 2); the weekly close put the due one into service, not the other (BUILDING 1)');

    /* ── refusals ── */
    assert.equal(previewStreamingNetworkOrder(built, { regionId, facilities: regionRooms(facilities, regionId) }).reason, 'NO_CHANGE');
    assert.equal(previewStreamingNetworkOrder(built, { regionId: sellRegion, facilities: nextRooms }).reason, 'WRONG_REGION');
    const pending = structuredClone(built);
    pending.ownedStreamingPlatform.pendingInfrastructureSetup = structuredClone(setup);
    assert.equal(previewStreamingNetworkOrder(pending, { regionId, facilities: nextRooms }).reason, 'CHANGE_IN_PROGRESS');
    const unlaunched = structuredClone(built);
    unlaunched.ownedStreamingPlatform.launchCommit = null;
    assert.equal(previewStreamingNetworkOrder(unlaunched, { regionId, facilities: nextRooms }).reason, 'NOT_LIVE');
    const broke = structuredClone(built);
    broke.ownedStreamingPlatform.treasuryCash = 0;
    const poor = previewStreamingNetworkOrder(broke, { regionId, facilities: nextRooms });
    assert.ok(poor.reason === 'INSUFFICIENT_TREASURY' && poor.capitalCost === preview.capitalCost, 'refused, its price still shown');
    console.log('PASS refusals: nothing changes, another region\'s rooms, a Build change under way, not live, not enough money');

    /* ── #93: a year of finished orders kept (the desk's "paid up front this year"), at least the last 12, at most 60 ── */
    const finished = weekly.find(item => item.status === 'DONE')!;
    const newest = finished.orderedAtAbsoluteWeek + 100;
    const many = Array.from({ length: 70 }, (_, index) => ({
        ...finished, id: `audit-year-${index}`, idempotencyKey: `audit-year-${index}`, orderedAtAbsoluteWeek: newest - 69 + index,
        readyAtAbsoluteWeek: newest - 68 + index, completedAtAbsoluteWeek: newest - 68 + index,
    }));
    const kept = normalizeOwnedStreamingPlatformState({ ...week.ownedStreamingPlatform, networkOrders: many }, week.id).networkOrders!;
    assert.equal(kept.length, 53, 'the 53 ordered within 52 weeks of the newest');
    assert.ok(kept.every(item => item.orderedAtAbsoluteWeek >= newest - 52), 'none older than a year before the newest');
    const few = normalizeOwnedStreamingPlatformState({ ...week.ownedStreamingPlatform, networkOrders: many.map((item, index) => ({ ...item, orderedAtAbsoluteWeek: index * 10 })) }, week.id).networkOrders!;
    assert.equal(few.length, 12, 'orders spread over years: the last 12 still kept');
    console.log(`PASS a year kept: ${kept.length} of 70 finished orders (those within 52 weeks of the newest), and the last 12 when they are older`);

    console.log(`done in ${Math.round((performance.now() - started) / 1000)} s`);
})().catch(error => { console.error(error); process.exit(1); });
