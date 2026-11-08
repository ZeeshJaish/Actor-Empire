/**
 * #169 (plan §21.13, §21.17): the Technology seat's jobs.
 *
 *   - CAPACITY: when the network's busiest hour passes the headroom floor (80% of capacity *(start)*), servers are
 *     ordered through Platform › Network's own order (`orderStreamingNetworkRegion`: paid up front, ready when the
 *     makers say). The region is the one with the most of your viewers for its servers; the room is the one there
 *     with free rack positions where more racks really add capacity (its power, cooling and fibre counted,
 *     `deriveStreamingNetworkCapacity`). Workhorses, the most streams for the money; a technology-first head puts
 *     Titans in a room that takes them. Enough to bring the busiest hour back near 65% (60% for a growth head, 70%
 *     for a margin head), sized down to the most-for-one-action limit. Every room there full: a card that opens
 *     Network, where a new room is yours to place.
 *   - INCIDENTS: an open incident of the platform's own that nobody answered (an outage, an app crash, a broken
 *     feature, slow streaming, a server incident). A small one is repaired with energy (25⚡ + $0.5M, fixed this week)
 *     when the energy allowance covers it, otherwise fixed with cash ($2M, 3 weeks), STATUS's own answers
 *     (`repairStreamingIncident`). A major one always asks. Leaks and trust incidents are Trust's (#171); one
 *     Assisted Management is handling is left to it.
 *
 * What the team did carries who did it: "Fixed by Marcus" on STATUS, "by Marcus" on a Network order.
 */
import { streamingPlusCityOpen, streamingPlusTierOrFallback } from '../streamingPlusPack';
import type {
    OwnedStreamingCrisis,
    OwnedStreamingFacility,
    OwnedStreamingInfrastructureIncident,
    OwnedStreamingPlatformState,
    Player,
    StreamingCrisisType,
    StreamingExecutiveStrategy,
    StreamingServerTier,
} from '../../types';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from '../ownedStreamingPlatform';
import { getStreamingDayOneMarket } from '../streamingDayOneMarkets';
import {
    getStreamingIncidentRepairOptions,
    repairStreamingIncident,
    streamingIncidentIsMajor,
    streamingIncidentSpeed,
    streamingIncidentWaitEndsAt,
} from '../streamingIncidentRepair';
import { deriveStreamingNetworkCapacity } from '../streamingNetworkCapacity';
import {
    STREAMING_NETWORK_BUILD_WEEKS,
    STREAMING_NETWORK_REGION_NAMES,
    isStreamingCloudFacility,
    orderStreamingNetworkRegion,
    streamingFacilityRacksByTier,
    streamingNetworkRackPrice,
    streamingNetworkRegionOf,
} from '../streamingNetworkOrders';
import { reconstructStreamingRegionPlans } from '../streamingRegionalNetworkPlan';
import { getStreamingServerSite } from '../streamingServerSites';
import { STREAMING_SERVER_TIERS } from '../streamingServerTiers';
import { CRISIS_KIND, INFRASTRUCTURE_KIND } from '../streamingStatusBoard';
import type { StreamingTeamExecutor, StreamingTeamJobContext, StreamingTeamJobRunner, StreamingTeamProposal } from './teamJobs';

/** the busiest hour's share of capacity that starts an order *(start)* */
export const STREAMING_TEAM_HEADROOM_FLOOR = 80;
/** where an order aims to bring the busiest hour back, by the executive's strategy */
const TARGET_LOAD: Partial<Record<StreamingExecutiveStrategy, number>> = { GROWTH_FIRST: 60, MARGIN_FIRST: 70 };
const MAX_RACKS = 12;

const money = (value: number) => (value >= 1e9 ? `$${(value / 1e9).toFixed(1)}B` : value >= 1e6 ? `$${(value / 1e6).toFixed(1).replace(/\.0$/, '')}M` : `$${Math.round(value / 1e3)}K`);
const first = (name: string) => name.split(' ')[0] || name;
const pct = (value: number) => `${Math.round(value * 100)}%`;
const streams = (value: number) => (value >= 1e6 ? `${(value / 1e6).toFixed(1).replace(/\.0$/, '')}M` : `${Math.round(value / 1e3)}K`);
const regionName = (regionId: string) => STREAMING_NETWORK_REGION_NAMES[regionId] || regionId;
const plural = (count: number, tier: StreamingServerTier) => `${count} ${STREAMING_SERVER_TIERS[tier].name}${count === 1 ? '' : 's'}`;

/* ── capacity ── */

const racksIn = (facility: OwnedStreamingFacility) => Object.values(streamingFacilityRacksByTier(facility)).reduce((sum, count) => sum + count, 0);
const steadyOf = (facility: OwnedStreamingFacility) => deriveStreamingNetworkCapacity({ facilities: [facility], forecastConcurrentStreams: 0 }).steadyStreams;

/** the room with `count` more racks of `tier` (added to its group of that maker, or a new group) */
export const streamingRoomWithRacks = (facility: OwnedStreamingFacility, tier: StreamingServerTier, count: number): OwnedStreamingFacility => {
    const groups = facility.rackGroups?.length
        ? facility.rackGroups
        : [{ id: `${facility.id}-workhorse`, name: 'Workhorse racks', rackCount: Math.max(0, facility.installedRacks), duty: 'CONTENT_ORIGIN' as const, serverTier: 'WORKHORSE' as const }];
    const same = groups.find(group => (group.serverTier || 'WORKHORSE') === tier && !group.migration);
    const rackGroups = same
        ? groups.map(group => (group === same ? { ...group, rackCount: group.rackCount + count } : group))
        : [...groups, { id: `${facility.id}-${tier.toLowerCase()}`, name: `${STREAMING_SERVER_TIERS[tier].name} racks`, rackCount: count, duty: groups[0]?.duty || 'CONTENT_ORIGIN', serverTier: tier }];
    return { ...facility, rackGroups, installedRacks: rackGroups.reduce((sum, group) => sum + group.rackCount, 0) };
};

interface CapacityRead {
    utilization: number;
    steady: number;
    regions: Array<{ regionId: string; viewers: number; steady: number; viewerShare: number; serverShare: number }>;
}

/** the busiest hour against capacity, and each region's viewers against its servers */
export const readStreamingCapacity = (player: Player, platform: OwnedStreamingPlatformState): CapacityRead | null => {
    const facilities = platform.infrastructureSetup?.facilities || [];
    const latest = platform.weeklyHistory.at(-1)?.operations;
    if (!facilities.length || !latest) return null;
    const capacity = deriveStreamingNetworkCapacity({ facilities, forecastConcurrentStreams: latest.peakLoadUnits ?? latest.peakConcurrentStreams ?? 0 });
    const steadyById = new Map(capacity.facilities.map(item => [item.facilityId, item.steadyStreams]));
    const regions = new Map<string, { viewers: number; steady: number }>();
    facilities.forEach(facility => {
        const regionId = streamingNetworkRegionOf(facility.cityId);
        if (!regionId) return;
        const row = regions.get(regionId) || { viewers: 0, steady: 0 };
        row.steady += steadyById.get(facility.id) || 0;
        regions.set(regionId, row);
    });
    Object.entries(player.world.worldStreamingViewing?.countries || {}).forEach(([countryId, country]) => {
        const viewers = Math.max(0, Number(country.platformPerformance?.PLAYER?.estimatedViewers) || 0);
        const regionId = getStreamingDayOneMarket(countryId)?.regionId;
        if (!viewers || !regionId) return;
        const row = regions.get(regionId) || { viewers: 0, steady: 0 };
        row.viewers += viewers;
        regions.set(regionId, row);
    });
    const viewers = [...regions.values()].reduce((sum, row) => sum + row.viewers, 0);
    return {
        utilization: Math.max(0, Number(latest.capacityUtilizationPercent) || 0),
        steady: capacity.steadyStreams,
        regions: [...regions.entries()].map(([regionId, row]) => ({
            regionId, ...row,
            viewerShare: viewers > 0 ? row.viewers / viewers : 0,
            serverShare: capacity.steadyStreams > 0 ? row.steady / capacity.steadyStreams : 0,
        })).sort((left, right) => (right.viewers / Math.max(1, right.steady)) - (left.viewers / Math.max(1, left.steady)) || left.regionId.localeCompare(right.regionId)),
    };
};

export const runCapacity: StreamingTeamJobRunner = (context) => {
    const { player, platform, executive, seat } = context;
    if (!platform.launchCommit || !platform.infrastructureSetup || platform.pendingInfrastructureSetup) return [];
    const read = readStreamingCapacity(player, platform);
    if (!read || read.utilization < STREAMING_TEAM_HEADROOM_FLOOR) return [];
    const region = read.regions.find(row => row.viewers > 0);
    if (!region) return [];
    const name = first(executive.nameAtAppointment);
    const busy = (platform.networkOrders || []).some(order => order.status === 'BUILDING' && order.regionId === region.regionId);
    if (busy) return [];
    const target = TARGET_LOAD[executive.preferredStrategy] ?? 65;
    const extra = Math.max(1, read.steady * (read.utilization / target - 1));
    const why = `Your busiest hour ran at ${Math.round(read.utilization)}% of capacity (the floor is ${STREAMING_TEAM_HEADROOM_FLOOR}%). ${regionName(region.regionId)} carries ${pct(region.viewerShare)} of your viewers on ${pct(region.serverShare)} of your servers.`;

    /* the rooms there with free positions where more racks add capacity, each with the order that fits */
    const sharp = executive.skill >= 80;
    const options = (platform.infrastructureSetup.facilities || [])
        /* Streaming+: the CTO grows no room in a pack city and buys no Titan without the pack */
        .filter(facility => streamingNetworkRegionOf(facility.cityId) === region.regionId && !isStreamingCloudFacility(facility)
            && streamingPlusCityOpen(player, facility.cityId))
        .flatMap(facility => {
            const positions = facility.lease?.rackPositions ?? 0;
            const free = Math.min(MAX_RACKS, positions - racksIn(facility));
            if (free <= 0) return [];
            const wanted: StreamingServerTier = executive.preferredStrategy === 'TECHNOLOGY_FIRST' && positions >= STREAMING_SERVER_TIERS.TITAN.minimumRoomPositions ? 'TITAN' : 'WORKHORSE';
            const tier: StreamingServerTier = streamingPlusTierOrFallback(player, wanted, 'WORKHORSE');
            const before = steadyOf(facility);
            const gainOf = (count: number) => steadyOf(streamingRoomWithRacks(facility, tier, count)) - before;
            let count = 1;
            while (count < free && gainOf(count) < extra) count += 1;
            while (count > 1 && count * streamingNetworkRackPrice(tier) > seat.actionMoney) count -= 1;
            const gain = gainOf(count);
            if (gain <= 0) return [];
            return [{ facility, tier, count, gain, cost: count * streamingNetworkRackPrice(tier) }];
        })
        .sort((left, right) => (sharp ? right.gain / right.cost - left.gain / left.cost : right.gain - left.gain) || left.facility.id.localeCompare(right.facility.id));
    const pick = options[0];
    if (!pick) {
        return [{
            jobId: 'CAPACITY',
            dedupeKey: `capacity-room:${region.regionId}`,
            title: `${regionName(region.regionId)} needs a new room`,
            detail: `Busiest hour ${Math.round(read.utilization)}% · every room there is full`,
            reason: `${why} A new room is yours to place on Network.`,
            cost: 0,
            energy: 0,
            action: { kind: 'OPEN_ROOM', room: 'NETWORK' },
            askOnly: true,
            priority: 25,
        }];
    }
    const city = getStreamingServerSite(pick.facility.cityId)?.name || pick.facility.cityId;
    /* what it does to the busiest hour, and what getting back to the target would take */
    const after = read.utilization * read.steady / Math.max(1, read.steady + pick.gain);
    const perRack = pick.gain / pick.count;
    const short = Math.max(0, extra - pick.gain);
    const rest = short > perRack * 0.5
        ? ` Getting back to ${target}% takes about ${Math.ceil(short / Math.max(1, perRack))} more ${STREAMING_SERVER_TIERS[pick.tier].name}s: a bigger order or new rooms on Network.`
        : '';
    return [{
        jobId: 'CAPACITY',
        dedupeKey: `capacity:${region.regionId}`,
        title: `Add ${plural(pick.count, pick.tier)} in ${regionName(region.regionId)}`,
        detail: `${city} · +${streams(pick.gain)} streams · busiest hour ${Math.round(read.utilization)}% → ${after.toFixed(1).replace(/\.0$/, '')}% · ready in ${STREAMING_NETWORK_BUILD_WEEKS[pick.tier]} weeks`,
        reason: `${why} ${name}'s pick: ${pick.tier === 'TITAN' ? 'Titans, the most streams a rack' : 'Workhorses, the most streams for the money'}${sharp ? ', in the room where they add the most for the price' : ''}.${rest}`,
        cost: pick.cost,
        energy: 0,
        action: { kind: 'NETWORK_ORDER', input: { regionId: region.regionId, facilityId: pick.facility.id, tier: pick.tier, racks: pick.count } },
        priority: 28,
    }];
};

/** Platform › Network's own order, for the room as it stands now; the order keeps who placed it */
export const executeNetworkOrder: StreamingTeamExecutor = (player, action, context) => {
    if (action.kind !== 'NETWORK_ORDER') return { player, changed: false };
    const input = action.input as { regionId?: string; facilityId?: string; tier?: StreamingServerTier; racks?: number };
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const facilities = (platform.infrastructureSetup?.facilities || []).filter(facility => streamingNetworkRegionOf(facility.cityId) === input.regionId);
    const room = facilities.find(facility => facility.id === input.facilityId);
    const tier = input.tier && STREAMING_SERVER_TIERS[input.tier] ? input.tier : 'WORKHORSE';
    const racks = Math.max(1, Math.round(Number(input.racks) || 1));
    if (!room || !input.regionId) return { player, changed: false, reason: 'That room is no longer on the network.' };
    if ((room.lease?.rackPositions ?? 0) - racksIn(room) < racks) return { player, changed: false, reason: 'That room has no free positions now.' };
    const after = facilities.map(facility => (facility.id === room.id ? streamingRoomWithRacks(facility, tier, racks) : facility));
    const regionPlan = reconstructStreamingRegionPlans(after).find(plan => plan.regionId === input.regionId)
        || { regionId: input.regionId, serverCounts: { SCOUT: 0, WORKHORSE: 0, TITAN: 0 }, cloudProvider: null, cloudCompute: 0 };
    const result = orderStreamingNetworkRegion(player, { regionId: input.regionId, facilities: after, regionPlan });
    if (!result.changed || !result.order) return { player, changed: false, reason: result.message };
    const ordered = normalizeOwnedStreamingPlatformState(result.player.ownedStreamingPlatform, result.player.id);
    const orderId = result.order.id;
    return {
        changed: true,
        player: {
            ...result.player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...ordered,
                networkOrders: (ordered.networkOrders || []).map(order => (order.id === orderId ? { ...order, orderedBy: { name: context.executiveName, seatId: 'TECHNOLOGY' } } : order)),
            }, result.player.id),
        },
    };
};

/* ── incidents ── */

/** the platform's own incidents: Technology's; leaks and trust incidents are Trust's (#171) */
export const STREAMING_TECH_CRISIS_TYPES = new Set<StreamingCrisisType>(['PLATFORM_OUTAGE', 'APP_CRASH', 'FEATURE_BROKEN', 'SLOW_STREAMING']);

type OpenIncident = { source: 'CRISIS'; item: OwnedStreamingCrisis; kind: string } | { source: 'INFRASTRUCTURE'; item: OwnedStreamingInfrastructureIncident; kind: string };

/** open incidents nobody answered, for a job: its crisis types, and server incidents when `servers` */
export const openStreamingIncidents = (platform: OwnedStreamingPlatformState, types: ReadonlySet<StreamingCrisisType>, servers: boolean): OpenIncident[] => [
    ...platform.crisisSecurity.crises
        .filter(item => types.has(item.type) && item.stage === 'DETECTED' && !item.statusRepair)
        .map(item => ({ source: 'CRISIS' as const, item, kind: CRISIS_KIND[item.type] })),
    ...(servers ? platform.crisisSecurity.infrastructureOperations.incidents
        .filter(item => item.stage === 'DETECTED' && !item.statusRepair && !item.assistedHandled)
        .map(item => ({ source: 'INFRASTRUCTURE' as const, item, kind: INFRASTRUCTURE_KIND[item.type] })) : []),
];

/**
 * An incident's proposal: a small one repaired with energy when the allowance covers it, else fixed with cash; a major
 * one always a card (its lean: energy when the player has it, else the fix). `words` names the answers (a leak's are
 * takedowns).
 */
export const proposeStreamingIncidentAnswer = (
    context: StreamingTeamJobContext,
    jobId: 'INCIDENTS' | 'LEAKS' | 'TRUST_INCIDENTS',
    open: OpenIncident,
    words: { now: string; fix: string; nowPick: string; fixPick: string } = { now: 'Repair', fix: 'Fix', nowPick: 'the all-hands repair', fixPick: 'the cash fix' },
): StreamingTeamProposal | null => {
    const { player, platform, absoluteWeek, executive } = context;
    const { item } = open;
    const speed = streamingIncidentSpeed(platform, item);
    const playerEnergy = Math.max(0, player.energy?.current ?? 0);
    const options = getStreamingIncidentRepairOptions(item, absoluteWeek, playerEnergy, platform.treasuryCash, speed);
    const now = options.find(option => option.path === 'ENERGY');
    const fix = options.find(option => option.path === 'FIX');
    if (!now || !fix) return null;
    const major = streamingIncidentIsMajor(item.severity);
    const left = Math.max(1, streamingIncidentWaitEndsAt(item, speed) - absoluteWeek);
    const hit = item.affectedSubscribers > 0 ? ` It hits ${streams(item.affectedSubscribers)} viewers;` : '';
    const runs = `${hit} left alone it runs ${left} more week${left === 1 ? '' : 's'}.`;
    const useEnergy = major ? now.available : now.available && context.energyLeft >= now.energy;
    const option = useEnergy ? now : fix;
    if (!option.available) return null;
    const name = first(executive.nameAtAppointment);
    return {
        jobId,
        dedupeKey: `incident:${open.source}:${item.id}`,
        title: useEnergy ? `${words.now} now: ${item.title}` : `${words.fix}: ${item.title}`,
        detail: `${item.severity.charAt(0)}${item.severity.slice(1).toLowerCase()} ${open.kind.toLowerCase()} · ${useEnergy ? `fixed this week, ${now.energy}⚡ + ${money(now.cash)}` : `${money(fix.cash)}, ready in ${fix.weeks} weeks`}`,
        reason: major
            ? `A major incident.${runs} ${name} asks first on a major one.`
            : `${runs.trim()} ${useEnergy ? `${name}'s pick: ${words.nowPick}, inside the energy you allowed.` : `${name}'s pick: ${words.fixPick}${context.energyLeft < now.energy ? ` (the energy allowance does not cover ${words.nowPick} now)` : ''}.`}`,
        cost: option.cash,
        energy: option.energy,
        action: { kind: 'INCIDENT_REPAIR', source: open.source, incidentId: item.id, option: useEnergy ? 'ENERGY' : 'FIX' },
        askOnly: major,
        priority: major ? 60 : 50,
    };
};

export const runIncidents: StreamingTeamJobRunner = (context) => openStreamingIncidents(context.platform, STREAMING_TECH_CRISIS_TYPES, true)
    .flatMap(open => {
        const proposal = proposeStreamingIncidentAnswer(context, 'INCIDENTS', open);
        return proposal ? [proposal] : [];
    });

/** STATUS's own answer; the incident keeps who answered it ("Fixed by Marcus") */
export const executeIncidentRepair: StreamingTeamExecutor = (player, action, context) => {
    if (action.kind !== 'INCIDENT_REPAIR') return { player, changed: false };
    const result = repairStreamingIncident(player, action.source, action.incidentId, action.option);
    if (!result.changed) return { player, changed: false, reason: result.message };
    const platform = normalizeOwnedStreamingPlatformState(result.player.ownedStreamingPlatform, result.player.id);
    const by = context.executiveName;
    const crises = platform.crisisSecurity.crises.map(item => (item.id === action.incidentId && item.statusRepair ? { ...item, statusRepair: { ...item.statusRepair, by } } : item));
    const operations = platform.crisisSecurity.infrastructureOperations;
    const incidents = operations.incidents.map(item => (item.id === action.incidentId && item.statusRepair ? { ...item, statusRepair: { ...item.statusRepair, by } } : item));
    return {
        changed: true,
        player: {
            ...result.player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                crisisSecurity: { ...platform.crisisSecurity, crises, infrastructureOperations: { ...operations, incidents } },
            }, result.player.id),
        },
    };
};
