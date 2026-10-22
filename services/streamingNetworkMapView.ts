import type { Player, StreamingNetworkNodeRole } from '../types';
import { getAbsoluteWeek } from './legacyLogic';
import { normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { getOwnedPlatformPackageCountryIds } from './streamingContentAvailability';
import { networkSignalSource, readNetworkSignals, type MarketSignalState } from './streamingNetworkSignals';
import { effectiveReachKm } from './streamingNetworkReach';
import { getStreamingServerSite } from './streamingServerSites';
import { STREAMING_WORLD_MARKETS } from './streamingDayOneMarkets';

/**
 * The Platform room's Network page in one read: where every room stands, how
 * far its field reaches, and how each market the service sells in is served.
 * The fields and the verdicts come from the reach model the Build map and the
 * status page already use (readNetworkSignals), so the three never disagree.
 * Load is a network-wide figure from the weekly loop: there is no per-city
 * load model, so no city is shown a load of its own.
 */
export interface StreamingNetworkMapSite {
    id: string;
    name: string;
    countryCode: string;
    lat: number;
    lng: number;
    racks: number;
    role: 'CORE ORIGIN' | 'REGIONAL HUB' | 'EDGE CACHE';
    /** Radius of the room's field, in km, as the reach model computes it. */
    reachKm: number;
    /** 1 carrier hotel · 2 regional hub · 3 emerging edge. */
    tier: 1 | 2 | 3;
}

export interface StreamingNetworkMapMarket {
    countryId: string;
    name: string;
    state: MarketSignalState;
    reached: number;
    served: number;
    /** The market's streaming audience, the weight the shares are averaged by. */
    audience: number;
}

export interface StreamingNetworkMapView {
    built: boolean;
    sites: StreamingNetworkMapSite[];
    markets: StreamingNetworkMapMarket[];
    /** Audience-weighted shares across the markets. */
    reached: number;
    served: number;
    revision: number | null;
    pending: { revision: number; weeksLeft: number } | null;
    peakStreams: number;
    capacityStreams: number;
    weeklyOperatingCost: number;
}

const ROLE_WORDS: Record<StreamingNetworkNodeRole, StreamingNetworkMapSite['role']> = {
    CORE_ORIGIN: 'CORE ORIGIN', REGIONAL_HUB: 'REGIONAL HUB', EDGE_CACHE: 'EDGE CACHE',
};
const ROLE_RANK: Record<StreamingNetworkNodeRole, number> = { CORE_ORIGIN: 0, REGIONAL_HUB: 1, EDGE_CACHE: 2 };

export const getStreamingNetworkMapView = (player: Player): StreamingNetworkMapView => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const setup = platform.infrastructureSetup;
    const facilities = setup?.facilities || [];
    /* one site per city: rooms in the same city add their racks, and the city
       wears its most important role */
    const byCity = new Map<string, { racks: number; role: StreamingNetworkNodeRole; listingId?: string }>();
    facilities.forEach(facility => {
        const current = byCity.get(facility.cityId);
        byCity.set(facility.cityId, {
            racks: (current?.racks || 0) + facility.installedRacks,
            role: current && ROLE_RANK[current.role] <= ROLE_RANK[facility.role] ? current.role : facility.role,
            listingId: current?.listingId || facility.lease?.listingId,
        });
    });
    const sites = [...byCity.entries()]
        .sort(([, left], [, right]) => ROLE_RANK[left.role] - ROLE_RANK[right.role] || right.racks - left.racks)
        .flatMap(([cityId, room]): StreamingNetworkMapSite[] => {
            const site = getStreamingServerSite(cityId);
            if (!site || room.racks <= 0) return [];
            const source = networkSignalSource({ cityId, racks: room.racks, listingId: room.listingId }, platform.fibre);
            return [{
                id: site.id,
                name: site.name,
                countryCode: site.countryCode,
                lat: site.latitude,
                lng: site.longitude,
                racks: room.racks,
                role: ROLE_WORDS[room.role],
                reachKm: source ? Math.max(0, effectiveReachKm(source, 0)) : 0,
                tier: site.tier,
            }];
        });
    const signals = readNetworkSignals(
        facilities.map(facility => ({ cityId: facility.cityId, racks: facility.installedRacks, listingId: facility.lease?.listingId })),
        getOwnedPlatformPackageCountryIds(platform),
        { fibre: platform.fibre, platformWeeks: Math.max(0, absoluteWeek - (platform.serviceStandardFromWeek ?? absoluteWeek)) },
    );
    const pending = platform.launchCommit ? platform.pendingInfrastructureSetup : null;
    const latest = platform.weeklyHistory.at(-1);
    return {
        built: facilities.length > 0,
        sites,
        markets: signals.markets.map(market => ({
            ...market,
            audience: STREAMING_WORLD_MARKETS.find(candidate => candidate.id === market.countryId)?.streamingAudience ?? 0,
        })),
        reached: signals.reached,
        served: signals.served,
        revision: setup?.revision ?? null,
        pending: pending ? { revision: pending.revision, weeksLeft: Math.max(0, pending.readyAtAbsoluteWeek - absoluteWeek) } : null,
        peakStreams: latest?.operations?.peakConcurrentStreams ?? 0,
        capacityStreams: platform.capacity.burstConcurrentStreams,
        weeklyOperatingCost: setup?.weeklyOperatingCost ?? 0,
    };
};
