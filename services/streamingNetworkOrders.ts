/**
 * #89, a live company's network changes by region (codex-handoff/plans/platform-tech-plan.md §17; Zeesh 2026-10-31:
 * "network ko tech jaisa naya banayenge … paisa aur time to lagega, energy se hum log fast run kar sakte hain … server
 * hatane mein refund … kam mile, wo region to region vary bhi kar sakta hai"). Platform › Network orders a region's
 * change itself: no Build wizard, and never the launch commission.
 *
 * - **An order** is one region's rooms after the change, drawn as Build draws them (by region; the cities are the
 *   placer's; built rooms kept), with what it adds or sells back by maker and by cloud company.
 * - **Its money moves when it is ordered:** hardware's price (a Workhorse rack's build cost × the maker's price) and a
 *   new room's deposit and setup; cloud has nothing up front (its weekly price starts in service); a rack sold back
 *   returns the region's resale rate of its price.
 * - **Its time is its slowest part:** cloud 1 week, Scout 2, Workhorse 3, Titan 5, and a city the network never used a
 *   week more; a sell-back alone, a week. Regions build side by side, one order a region at a time.
 * - **Energy brings a build forward** a week a step (10⚡ + 1⚡ for every 4 racks it adds), down to a week left.
 * - **The weekly close puts a due order into service:** the region's rooms and plan replaced and the network recounted
 *   (each maker's power), with its cost, reliability and staff.
 * - **Capacity counts each maker's power** (Scout 0.6, Workhorse 1, Titan 1.8); a revision counted before #89 is
 *   recounted once by the weekly close.
 */
import { gameWeekText } from './gameWeek';
import type {
    OwnedStreamingFacility,
    OwnedStreamingInfrastructureSetup,
    OwnedStreamingLedgerEntry,
    OwnedStreamingNetworkOrder,
    OwnedStreamingPlatformState,
    OwnedStreamingRackGroup,
    OwnedStreamingRegionNetworkPlan,
    Player,
    StreamingServerTier,
} from '../types';
import { createDeterministicId } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { spendPlayerEnergy } from './premiumLogic';
import { aggregateStreamingFacilities } from './streamingFacilities';
import { deriveStreamingNetworkSetupValues, getInfrastructureTechnologyFloor } from './streamingInfrastructure';
import { getStreamingServerSite } from './streamingServerSites';
import { streamingPlusLocks, streamingPlusNetworkBlock, streamingPlusRefusal, type StreamingPlusItem } from './streamingPlusPack';
import { STREAMING_RACK_BUILD_COST, STREAMING_SERVER_TIERS, STREAMING_SERVER_TIER_ORDER } from './streamingServerTiers';

/** Weeks to put each kind of capacity into service (cloud is rented, so it is the fastest) */
export const STREAMING_NETWORK_BUILD_WEEKS: Record<StreamingServerTier | 'CLOUD', number> = { CLOUD: 1, SCOUT: 2, WORKHORSE: 3, TITAN: 5 };
/** A room in a city the network has never used is leased and fitted out first */
export const STREAMING_NETWORK_NEW_CITY_WEEKS = 1;
/** What hardware sold back returns, by region: the share of its price a buyer there pays */
export const STREAMING_NETWORK_RESALE_RATE: Record<string, number> = {
    NORTH_AMERICA: .4,
    EUROPE: .4,
    ASIA: .35,
    OCEANIA: .3,
    SOUTH_AMERICA: .25,
    AFRICA: .2,
};
export const STREAMING_NETWORK_REGION_NAMES: Record<string, string> = {
    NORTH_AMERICA: 'North America',
    SOUTH_AMERICA: 'South America',
    EUROPE: 'Europe',
    ASIA: 'Asia',
    AFRICA: 'Africa',
    OCEANIA: 'Oceania',
};

export type StreamingNetworkOrderRefusal =
    | 'NOT_LIVE'
    | 'CHANGE_IN_PROGRESS'
    | 'REGION_BUSY'
    | 'WRONG_REGION'
    | 'NO_CHANGE'
    | 'INSUFFICIENT_TREASURY'
    | 'UNKNOWN_ORDER'
    | 'NOT_BUILDING'
    | 'AT_ONE_WEEK'
    | 'INSUFFICIENT_ENERGY'
    | 'STREAMING_PLUS';

export const STREAMING_NETWORK_ORDER_MESSAGES: Record<StreamingNetworkOrderRefusal, string> = {
    STREAMING_PLUS: 'This is part of the Streaming+ Pack.',
    NOT_LIVE: 'The network is changed here once the service is live.',
    CHANGE_IN_PROGRESS: 'A network change from Build is still under way. It finishes first.',
    REGION_BUSY: 'This region is already building. One order a region at a time.',
    WRONG_REGION: 'Those rooms are not all in this region.',
    NO_CHANGE: 'Nothing changes.',
    INSUFFICIENT_TREASURY: 'The treasury cannot pay for this build.',
    UNKNOWN_ORDER: 'That order is no longer there.',
    NOT_BUILDING: 'That order is already in service.',
    AT_ONE_WEEK: 'It is a week away already.',
    INSUFFICIENT_ENERGY: 'Not enough energy left. More comes next week, or from the Store.',
};

const TIERS = STREAMING_SERVER_TIER_ORDER;
const zeroTiers = (): Record<StreamingServerTier, number> => ({ SCOUT: 0, WORKHORSE: 0, TITAN: 0 });

export const streamingNetworkRegionOf = (cityId: string): string | null => getStreamingServerSite(cityId)?.regionId || null;
export const isStreamingCloudFacility = (facility: OwnedStreamingFacility): boolean => (
    facility.type === 'CLOUD_ALLOCATION' || facility.lease?.tenure === 'CLOUD'
);
/** A room's hardware racks by maker (cloud has none); a room with no groups (old saves) holds Workhorses */
export const streamingFacilityRacksByTier = (facility: OwnedStreamingFacility): Record<StreamingServerTier, number> => {
    const counts = zeroTiers();
    if (isStreamingCloudFacility(facility)) return counts;
    const groups = facility.rackGroups || [];
    if (!groups.length) counts.WORKHORSE += Math.max(0, facility.installedRacks);
    for (const group of groups) counts[group.serverTier || 'WORKHORSE'] += Math.max(0, group.rackCount);
    return counts;
};
const cloudComputeOf = (facility: OwnedStreamingFacility): number => (isStreamingCloudFacility(facility) ? Math.max(0, facility.installedRacks) : 0);

/** A rack's price by its maker (the price Build charges) */
export const streamingNetworkRackPrice = (tier: StreamingServerTier): number => Math.round(STREAMING_RACK_BUILD_COST * STREAMING_SERVER_TIERS[tier].price);
export const streamingNetworkResaleRate = (regionId: string): number => STREAMING_NETWORK_RESALE_RATE[regionId] ?? .25;
/** Energy for one week off a build: 10⚡, and 1⚡ more for every 4 racks it adds */
export const streamingNetworkSpeedUpEnergy = (order: Pick<OwnedStreamingNetworkOrder, 'racksDelta'>): number => (
    10 + Math.ceil(TIERS.reduce((sum, tier) => sum + Math.max(0, order.racksDelta[tier] || 0), 0) / 4)
);

const isLive = (platform: OwnedStreamingPlatformState): boolean => Boolean(platform.launchCommit && platform.infrastructureSetup);
const busyRegion = (platform: OwnedStreamingPlatformState, regionId: string): boolean => (
    (platform.networkOrders || []).some(order => order.status === 'BUILDING' && order.regionId === regionId)
);
const regionFacilities = (setup: OwnedStreamingInfrastructureSetup, regionId: string): OwnedStreamingFacility[] => (
    (setup.facilities || []).filter(facility => streamingNetworkRegionOf(facility.cityId) === regionId)
);

export interface StreamingNetworkOrderPreview {
    ok: boolean;
    reason?: StreamingNetworkOrderRefusal;
    message: string;
    /** set when the change reaches a Streaming+ item without the pack: the screen opens the pack's sheet */
    streamingPlusItem?: StreamingPlusItem;
    regionId: string;
    /** net change by maker (added − sold) */
    racksDelta: Record<StreamingServerTier, number>;
    racksAdded: Record<StreamingServerTier, number>;
    racksSold: Record<StreamingServerTier, number>;
    cloudAdded: number;
    cloudDropped: number;
    newRoomIds: string[];
    newCityIds: string[];
    capitalCost: number;
    refund: number;
    buildWeeks: number;
    readyAtAbsoluteWeek: number;
}

export interface StreamingNetworkOrderInput {
    regionId: string;
    /** the region's rooms after the change (every room of the region: built ones as they are, new ones added) */
    facilities: OwnedStreamingFacility[];
}

/**
 * What ordering this region's change would do, before anything moves: what it adds and sells back, its price, the
 * refund, its weeks, or why it cannot be ordered (its numbers still filled in where they can be).
 */
export const previewStreamingNetworkOrder = (player: Player, input: StreamingNetworkOrderInput): StreamingNetworkOrderPreview => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const { regionId } = input;
    const base: StreamingNetworkOrderPreview = {
        ok: false, message: '', regionId,
        racksDelta: zeroTiers(), racksAdded: zeroTiers(), racksSold: zeroTiers(), cloudAdded: 0, cloudDropped: 0,
        newRoomIds: [], newCityIds: [], capitalCost: 0, refund: 0, buildWeeks: 1, readyAtAbsoluteWeek: absoluteWeek + 1,
    };
    const refuse = (reason: StreamingNetworkOrderRefusal, preview = base): StreamingNetworkOrderPreview => ({
        ...preview, ok: false, reason, message: STREAMING_NETWORK_ORDER_MESSAGES[reason],
    });
    const setup = platform.infrastructureSetup;
    if (!setup || !isLive(platform)) return refuse('NOT_LIVE');
    if (platform.pendingInfrastructureSetup) return refuse('CHANGE_IN_PROGRESS');
    if (busyRegion(platform, regionId)) return refuse('REGION_BUSY');
    if (input.facilities.some(facility => streamingNetworkRegionOf(facility.cityId) !== regionId)) return refuse('WRONG_REGION');

    const current = regionFacilities(setup, regionId);
    const currentById = new Map(current.map(facility => [facility.id, facility]));
    const nextIds = new Set(input.facilities.map(facility => facility.id));
    const racksAdded = zeroTiers();
    const racksSold = zeroTiers();
    let cloudAdded = 0;
    let cloudDropped = 0;
    let roomCosts = 0;
    const newRoomIds: string[] = [];
    for (const facility of input.facilities) {
        const before = currentById.get(facility.id);
        const now = streamingFacilityRacksByTier(facility);
        const then = before ? streamingFacilityRacksByTier(before) : zeroTiers();
        for (const tier of TIERS) {
            const change = now[tier] - then[tier];
            if (change > 0) racksAdded[tier] += change;
            else racksSold[tier] -= change;
        }
        const cloudChange = cloudComputeOf(facility) - (before ? cloudComputeOf(before) : 0);
        if (cloudChange > 0) cloudAdded += cloudChange;
        else cloudDropped -= cloudChange;
        if (!before && !isStreamingCloudFacility(facility)) {
            newRoomIds.push(facility.id);
            roomCosts += (facility.lease?.depositCost || 0) + (facility.lease?.setupCost || 0);
        }
    }
    for (const facility of current) {
        if (nextIds.has(facility.id)) continue;
        const racks = streamingFacilityRacksByTier(facility);
        for (const tier of TIERS) racksSold[tier] += racks[tier];
        cloudDropped += cloudComputeOf(facility);
    }
    const usedCities = new Set((setup.facilities || []).map(facility => facility.cityId));
    const newCityIds = Array.from(new Set(input.facilities
        .filter(facility => newRoomIds.includes(facility.id) && !usedCities.has(facility.cityId))
        .map(facility => facility.cityId)));
    const racksDelta = Object.fromEntries(TIERS.map(tier => [tier, racksAdded[tier] - racksSold[tier]])) as Record<StreamingServerTier, number>;
    const capitalCost = Math.round(TIERS.reduce((sum, tier) => sum + racksAdded[tier] * streamingNetworkRackPrice(tier), 0) + roomCosts);
    const refund = Math.round(TIERS.reduce((sum, tier) => sum + racksSold[tier] * streamingNetworkRackPrice(tier), 0) * streamingNetworkResaleRate(regionId));
    const hardwareWeeks = Math.max(0, ...TIERS.filter(tier => racksAdded[tier] > 0).map(tier => STREAMING_NETWORK_BUILD_WEEKS[tier]));
    const buildWeeks = Math.max(1, hardwareWeeks, cloudAdded > 0 ? STREAMING_NETWORK_BUILD_WEEKS.CLOUD : 0)
        + (newCityIds.length > 0 && hardwareWeeks > 0 ? STREAMING_NETWORK_NEW_CITY_WEEKS : 0);
    const preview: StreamingNetworkOrderPreview = {
        ...base, racksDelta, racksAdded, racksSold, cloudAdded, cloudDropped, newRoomIds, newCityIds,
        capitalCost, refund, buildWeeks, readyAtAbsoluteWeek: absoluteWeek + buildWeeks,
    };
    const changed = TIERS.some(tier => racksAdded[tier] > 0 || racksSold[tier] > 0) || cloudAdded > 0 || cloudDropped > 0 || newRoomIds.length > 0;
    if (!changed) return refuse('NO_CHANGE', preview);
    /* Streaming+ (2026-11-08): a pack city, a Titan or Meridian Edge, added without the pack, is refused here, whoever asks */
    const packBlock = streamingPlusNetworkBlock(player, current, input.facilities, cityId => getStreamingServerSite(cityId)?.name || cityId);
    if (packBlock) return { ...refuse('STREAMING_PLUS', preview), message: packBlock.message, streamingPlusItem: packBlock.item };
    if (platform.treasuryCash + refund < capitalCost) return refuse('INSUFFICIENT_TREASURY', preview);
    return { ...preview, ok: true, message: describeStreamingNetworkChange(regionId, preview) };
};

/** "Asia: +8 Titans, +4 cloud · sold 2 Scouts" */
export const describeStreamingNetworkChange = (
    regionId: string,
    change: Pick<StreamingNetworkOrderPreview, 'racksAdded' | 'racksSold' | 'cloudAdded' | 'cloudDropped'>,
): string => {
    const plural = (count: number, tier: StreamingServerTier) => `${count} ${STREAMING_SERVER_TIERS[tier].name}${count === 1 ? '' : 's'}`;
    const added = [
        ...TIERS.filter(tier => change.racksAdded[tier] > 0).map(tier => `+${plural(change.racksAdded[tier], tier)}`),
        ...(change.cloudAdded > 0 ? [`+${change.cloudAdded} cloud`] : []),
    ];
    const sold = [
        ...TIERS.filter(tier => change.racksSold[tier] > 0).map(tier => `sold ${plural(change.racksSold[tier], tier)}`),
        ...(change.cloudDropped > 0 ? [`−${change.cloudDropped} cloud`] : []),
    ];
    return `${STREAMING_NETWORK_REGION_NAMES[regionId] || regionId}: ${[...added, ...sold].join(', ') || 'rooms moved'}`;
};

export interface StreamingNetworkOrderResult {
    changed: boolean;
    reason?: StreamingNetworkOrderRefusal;
    message: string;
    player: Player;
    order?: OwnedStreamingNetworkOrder;
    preview?: StreamingNetworkOrderPreview;
}

/**
 * Orders a region's change: the treasury pays its price and gets any refund now, and the region changes when it is
 * ready. `regionPlan` is the region's plan after the change (its makers' counts, its cloud company and compute).
 */
export const orderStreamingNetworkRegion = (
    player: Player,
    input: StreamingNetworkOrderInput & { regionPlan: OwnedStreamingRegionNetworkPlan },
): StreamingNetworkOrderResult => {
    const preview = previewStreamingNetworkOrder(player, input);
    if (!preview.ok) return { changed: false, reason: preview.reason, message: preview.message, player, preview };
    if (preview.cloudAdded > 0 && input.regionPlan.cloudProvider
        && streamingPlusLocks(player, { kind: 'CLOUD', id: input.regionPlan.cloudProvider })) {
        return { changed: false, reason: 'STREAMING_PLUS', message: streamingPlusRefusal('Meridian Edge cloud'), player, preview: { ...preview, ok: false, streamingPlusItem: { kind: 'CLOUD', id: input.regionPlan.cloudProvider } } };
    }
    if (input.regionPlan.regionId !== input.regionId) {
        return { changed: false, reason: 'WRONG_REGION', message: STREAMING_NETWORK_ORDER_MESSAGES.WRONG_REGION, player, preview };
    }
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const key = `network-order:${input.regionId}:${absoluteWeek}:${(platform.networkOrders || []).length}`;
    const order: OwnedStreamingNetworkOrder = {
        id: createDeterministicId('streaming_network_order', platform.simulationSeed, key),
        idempotencyKey: key,
        regionId: input.regionId,
        status: 'BUILDING',
        facilities: structuredClone(input.facilities),
        regionPlan: structuredClone(input.regionPlan),
        racksDelta: preview.racksDelta,
        cloudDelta: preview.cloudAdded - preview.cloudDropped,
        newCityIds: preview.newCityIds,
        capitalCost: preview.capitalCost,
        refund: preview.refund,
        buildWeeks: preview.buildWeeks,
        orderedAtAbsoluteWeek: absoluteWeek,
        readyAtAbsoluteWeek: preview.readyAtAbsoluteWeek,
        energySpent: 0,
        weeksCut: 0,
        completedAtAbsoluteWeek: null,
    };
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, `${key}:ordered`),
        idempotencyKey: `${key}:ordered`,
        absoluteWeek,
        type: 'INFRASTRUCTURE_COMMITTED',
        summary: `Network order: ${preview.message}, ready ${gameWeekText(preview.readyAtAbsoluteWeek, absoluteWeek)}.`,
        source: 'PLAYER_ACTION',
        metadata: {
            kind: 'NETWORK_ORDER',
            regionId: input.regionId,
            transactionCost: preview.capitalCost,
            refund: preview.refund,
            readyAtAbsoluteWeek: preview.readyAtAbsoluteWeek,
        },
    };
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        treasuryCash: platform.treasuryCash - preview.capitalCost + preview.refund,
        networkOrders: [...(platform.networkOrders || []), order],
        eventLedger: [...platform.eventLedger, ledger],
    }, player.id);
    return { changed: true, message: preview.message, player: { ...player, ownedStreamingPlatform: nextPlatform }, order, preview };
};

/** One week off a build in progress, for its energy (down to a week left) */
export const speedUpStreamingNetworkOrder = (player: Player, orderId: string): StreamingNetworkOrderResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const refuse = (reason: StreamingNetworkOrderRefusal): StreamingNetworkOrderResult => ({
        changed: false, reason, message: STREAMING_NETWORK_ORDER_MESSAGES[reason], player,
    });
    const order = (platform.networkOrders || []).find(item => item.id === orderId);
    if (!order) return refuse('UNKNOWN_ORDER');
    if (order.status !== 'BUILDING') return refuse('NOT_BUILDING');
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    if (order.readyAtAbsoluteWeek - absoluteWeek <= 1) return refuse('AT_ONE_WEEK');
    const energy = streamingNetworkSpeedUpEnergy(order);
    if (Math.max(0, Math.floor(Number(player.energy?.current) || 0)) < energy) return refuse('INSUFFICIENT_ENERGY');
    const next: OwnedStreamingNetworkOrder = {
        ...order,
        readyAtAbsoluteWeek: order.readyAtAbsoluteWeek - 1,
        energySpent: order.energySpent + energy,
        weeksCut: order.weeksCut + 1,
    };
    const nextPlayer: Player = {
        ...player,
        energy: { ...player.energy },
        flags: { ...player.flags },
        ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
            ...platform,
            networkOrders: (platform.networkOrders || []).map(item => (item.id === orderId ? next : item)),
        }, player.id),
    };
    spendPlayerEnergy(nextPlayer, energy, `Network: ${STREAMING_NETWORK_REGION_NAMES[order.regionId] || order.regionId} build sped up`);
    return { changed: true, message: `Ready ${gameWeekText(next.readyAtAbsoluteWeek, absoluteWeek)}.`, player: nextPlayer, order: next };
};

const strategyOf = (platform: OwnedStreamingPlatformState, setup: OwnedStreamingInfrastructureSetup) => (
    setup.strategy || (platform.infrastructureStrategy !== 'UNDECIDED' ? platform.infrastructureStrategy : 'HYBRID')
);

/** The setup with these rooms and plans in service: the network recounted (each maker's power), a new revision */
const setupWith = (
    platform: OwnedStreamingPlatformState,
    setup: OwnedStreamingInfrastructureSetup,
    facilities: OwnedStreamingFacility[],
    regionPlans: OwnedStreamingRegionNetworkPlan[],
    absoluteWeek: number,
    capital: number,
): OwnedStreamingInfrastructureSetup => {
    const values = deriveStreamingNetworkSetupValues(setup, strategyOf(platform, setup), facilities, regionPlans);
    return {
        ...setup,
        storageCapacityHours: values.storageCapacityHours,
        reliabilityTarget: values.reliabilityTarget,
        weeklyOperatingCost: values.weeklyOperatingCost,
        staffRequired: values.staffRequired,
        capitalInvested: setup.capitalInvested + capital,
        networkPlacements: aggregateStreamingFacilities(facilities),
        regionPlans,
        facilities,
        physicalSummary: {
            energyKwhWeekly: values.energyKwhWeekly,
            waterLitresWeekly: values.waterLitresWeekly,
            physicalWeeklyOperatingCost: values.physicalWeeklyOperatingCost,
            sustainabilityScore: values.sustainabilityScore,
            publicReputation: values.publicReputation,
            reliabilityPercent: values.physicalReliabilityPercent,
            backupCoveragePercent: values.backupCoveragePercent,
            limitingFactors: [...values.physicalLimitingFactors],
        },
        baselineConcurrentStreams: values.baselineConcurrentStreams,
        burstConcurrentStreams: values.burstConcurrentStreams,
        readyAtAbsoluteWeek: absoluteWeek,
        revision: setup.revision + 1,
        committedAtAbsoluteWeek: absoluteWeek,
        capacityModel: 'TIERED',
    };
};

/** The platform's capacity moved by what the setup's own capacity moved (other capacity it has stays) */
const capacityAfter = (
    platform: OwnedStreamingPlatformState,
    before: OwnedStreamingInfrastructureSetup,
    after: OwnedStreamingInfrastructureSetup,
): OwnedStreamingPlatformState['capacity'] => {
    const move = (key: 'baselineConcurrentStreams' | 'burstConcurrentStreams') => Math.max(0, Math.round(
        platform.capacity[key] + (after[key] ?? platform.capacity[key]) - (before[key] ?? platform.capacity[key]),
    ));
    return { baselineConcurrentStreams: move('baselineConcurrentStreams'), burstConcurrentStreams: move('burstConcurrentStreams') };
};

export interface StreamingNetworkWeekResult {
    changed: boolean;
    player: Player;
    completed: OwnedStreamingNetworkOrder[];
}

/** The weekly close: every order due goes into service, oldest first (idempotent: a done order is never applied twice) */
export const completeDueStreamingNetworkOrders = (player: Player): StreamingNetworkWeekResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const setup = platform.infrastructureSetup;
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const due = (platform.networkOrders || [])
        .filter(order => order.status === 'BUILDING' && order.readyAtAbsoluteWeek <= absoluteWeek)
        .sort((a, b) => a.readyAtAbsoluteWeek - b.readyAtAbsoluteWeek || a.id.localeCompare(b.id));
    if (!setup || !due.length) return { changed: false, player, completed: [] };
    let facilities = setup.facilities || [];
    let regionPlans = setup.regionPlans || [];
    for (const order of due) {
        facilities = [...facilities.filter(facility => streamingNetworkRegionOf(facility.cityId) !== order.regionId), ...order.facilities];
        regionPlans = [...regionPlans.filter(plan => plan.regionId !== order.regionId), order.regionPlan]
            .sort((a, b) => a.regionId.localeCompare(b.regionId));
    }
    const nextSetup = setupWith(platform, setup, facilities, regionPlans, absoluteWeek, due.reduce((sum, order) => sum + order.capitalCost, 0));
    const capacity = capacityAfter(platform, setup, nextSetup);
    const floor = getInfrastructureTechnologyFloor(capacity.baselineConcurrentStreams, nextSetup.reliabilityTarget);
    const completed = due.map(order => ({ ...order, status: 'DONE' as const, facilities: [], completedAtAbsoluteWeek: absoluteWeek }));
    const ledger: OwnedStreamingLedgerEntry[] = completed
        .filter(order => !platform.eventLedger.some(entry => entry.idempotencyKey === `${order.idempotencyKey}:online`))
        .map(order => ({
            id: createDeterministicId('streaming_event', platform.simulationSeed, `${order.idempotencyKey}:online`),
            idempotencyKey: `${order.idempotencyKey}:online`,
            absoluteWeek,
            type: 'MILESTONE_REACHED' as const,
            summary: `Network online: ${describeStreamingNetworkChange(order.regionId, {
                racksAdded: Object.fromEntries(TIERS.map(tier => [tier, Math.max(0, order.racksDelta[tier])])) as Record<StreamingServerTier, number>,
                racksSold: Object.fromEntries(TIERS.map(tier => [tier, Math.max(0, -order.racksDelta[tier])])) as Record<StreamingServerTier, number>,
                cloudAdded: Math.max(0, order.cloudDelta),
                cloudDropped: Math.max(0, -order.cloudDelta),
            })}.`,
            source: 'WEEK_PROCESSOR' as const,
            metadata: { kind: 'NETWORK_ORDER_ONLINE', regionId: order.regionId, revision: nextSetup.revision },
        }));
    const doneIds = new Set(completed.map(order => order.id));
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        infrastructureSetup: nextSetup,
        capacity,
        technologyLevels: {
            ...platform.technologyLevels,
            DELIVERY_CAPACITY: Math.max(platform.technologyLevels.DELIVERY_CAPACITY, floor.delivery),
            RELIABILITY: Math.max(platform.technologyLevels.RELIABILITY, floor.reliability),
        },
        networkOrders: [
            ...(platform.networkOrders || []).filter(order => !doneIds.has(order.id)),
            ...completed,
        ],
        eventLedger: [...platform.eventLedger, ...ledger],
    }, player.id);
    return { changed: true, player: { ...player, ownedStreamingPlatform: nextPlatform }, completed };
};

/**
 * Once per revision counted before #89: the network recounted with each maker's power (a Titan carried a Workhorse's
 * load, and a Scout too). The platform's capacity moves by what the setup's own moved.
 */
export const recountStreamingNetworkCapacity = (player: Player): { changed: boolean; player: Player } => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const setup = platform.infrastructureSetup;
    if (!setup || setup.capacityModel === 'TIERED') return { changed: false, player };
    const facilities = setup.facilities || [];
    const values = facilities.length
        ? deriveStreamingNetworkSetupValues(setup, strategyOf(platform, setup), facilities, setup.regionPlans || [])
        : null;
    const nextSetup: OwnedStreamingInfrastructureSetup = values && setup.baselineConcurrentStreams !== undefined
        ? {
            ...setup,
            baselineConcurrentStreams: values.baselineConcurrentStreams,
            burstConcurrentStreams: values.burstConcurrentStreams,
            capacityModel: 'TIERED',
        }
        : { ...setup, capacityModel: 'TIERED' };
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        infrastructureSetup: nextSetup,
        capacity: capacityAfter(platform, setup, nextSetup),
    }, player.id);
    return { changed: true, player: { ...player, ownedStreamingPlatform: nextPlatform } };
};

/* ── what the Network page draws a sell-back with (#90) ── */

const roleOf = (groups: OwnedStreamingRackGroup[]): OwnedStreamingFacility['role'] => (
    groups.some(group => group.duty === 'CONTENT_ORIGIN') ? 'CORE_ORIGIN' : 'REGIONAL_HUB'
);
const withGroups = (facility: OwnedStreamingFacility, groups: OwnedStreamingRackGroup[]): OwnedStreamingFacility | null => {
    const kept = groups.filter(group => group.rackCount > 0);
    const installedRacks = kept.reduce((sum, group) => sum + group.rackCount, 0);
    if (installedRacks <= 0) return null;
    return { ...facility, rackGroups: kept, installedRacks, role: isStreamingCloudFacility(facility) ? facility.role : roleOf(kept) };
};

/**
 * The region's rooms with `racks` of a maker sold back: taken from the room holding the most of that maker first (it
 * keeps the most behind, so the region's reach changes least), its biggest workloads first; an emptied room closes.
 */
export const sellStreamingNetworkRacks = (
    facilities: OwnedStreamingFacility[],
    regionId: string,
    tier: StreamingServerTier,
    racks: number,
): OwnedStreamingFacility[] => {
    let remaining = Math.max(0, Math.round(racks));
    const next = facilities.map(facility => structuredClone(facility));
    while (remaining > 0) {
        const room = next
            .filter(facility => streamingNetworkRegionOf(facility.cityId) === regionId && !isStreamingCloudFacility(facility))
            .map(facility => ({ facility, held: streamingFacilityRacksByTier(facility)[tier] }))
            .filter(item => item.held > 0)
            .sort((a, b) => b.held - a.held || b.facility.id.localeCompare(a.facility.id))[0];
        if (!room) break;
        const groups = (room.facility.rackGroups?.length
            ? room.facility.rackGroups
            : [{ id: `${room.facility.id}-WORKHORSE-CONTENT_ORIGIN`, name: 'Workhorse content origin', rackCount: room.facility.installedRacks, duty: 'CONTENT_ORIGIN' as const, serverTier: 'WORKHORSE' as const }])
            .map(group => ({ ...group }));
        const take = Math.min(remaining, room.held);
        let left = take;
        groups
            .filter(group => (group.serverTier || 'WORKHORSE') === tier)
            .sort((a, b) => b.rackCount - a.rackCount || a.id.localeCompare(b.id))
            .forEach(group => {
                const cut = Math.min(left, group.rackCount);
                group.rackCount -= cut;
                left -= cut;
            });
        const index = next.indexOf(room.facility);
        const updated = withGroups(room.facility, groups);
        if (updated) next[index] = updated;
        else next.splice(index, 1);
        remaining -= take;
    }
    return next;
};

/** The region's cloud rooms brought down to `compute` (rooms emptied close); adding cloud is drawn by Build's placer */
export const dropStreamingNetworkCloud = (
    facilities: OwnedStreamingFacility[],
    regionId: string,
    compute: number,
): OwnedStreamingFacility[] => {
    let excess = facilities
        .filter(facility => streamingNetworkRegionOf(facility.cityId) === regionId)
        .reduce((sum, facility) => sum + cloudComputeOf(facility), 0) - Math.max(0, Math.round(compute));
    const next: OwnedStreamingFacility[] = [];
    for (const facility of [...facilities].reverse()) {
        if (excess > 0 && streamingNetworkRegionOf(facility.cityId) === regionId && isStreamingCloudFacility(facility)) {
            const cut = Math.min(excess, facility.installedRacks);
            excess -= cut;
            const share = (facility.installedRacks - cut) / Math.max(1, facility.installedRacks);
            let left = cut;
            const groups = (facility.rackGroups || []).map(group => ({ ...group }))
                .sort((a, b) => b.rackCount - a.rackCount || a.id.localeCompare(b.id));
            groups.forEach(group => {
                const take = Math.min(left, group.rackCount);
                group.rackCount -= take;
                left -= take;
            });
            const updated = withGroups(facility, groups.length ? groups : [{ id: `${facility.id}-WORKHORSE-REGIONAL_CACHE`, name: 'Cloud regional cache', rackCount: facility.installedRacks - cut, duty: 'REGIONAL_CACHE', serverTier: 'WORKHORSE' }]);
            if (updated) {
                next.unshift(updated.lease ? { ...updated, lease: { ...updated.lease, weeklyRent: Math.round(updated.lease.weeklyRent * share) } } : updated);
            }
            continue;
        }
        next.unshift(facility);
    }
    return next;
};
