import type { StreamingNetworkCapacity } from './streamingNetworkCapacity';
import type { StreamingNetworkCoverage, StreamingCoverageGrade } from './streamingNetworkCoverage';
import { audiencePlaces } from './worldPopulationClusters';
import { getStreamingServerSite } from './streamingServerSites';
import { getPlaceByListingId } from './streamingSitePlaces';
import { expectedStandard, fibreMultiplier, type StreamingFibreState } from './streamingFibreLadder';
import { reachStrength, type ReachSource } from './streamingNetworkReach';
import { getCountryPosition } from './worldEconomy/worldCountryGeography';
import { STREAMING_WORLD_MARKETS } from './streamingDayOneMarkets';

export interface StreamingMarketSignal {
    countryId: string;
    coverage: StreamingCoverageGrade;
    reachedShare: number;
    state: 'READY' | 'WATCH' | 'DARK';
}

export interface StreamingNetworkSignals {
    marketSignals: StreamingMarketSignal[];
    capacity: {
        status: 'READY' | 'TIGHT' | 'OVERLOADED' | 'UNKNOWN';
        headroomPercent: number;
        limiting: string[];
    };
    summary: 'READY' | 'WATCH' | 'BLOCKED';
}

export const deriveStreamingNetworkSignals = (
    coverage: StreamingNetworkCoverage,
    capacity: StreamingNetworkCapacity,
): StreamingNetworkSignals => {
    const marketSignals = coverage.countries.map(country => ({
        countryId: country.countryId,
        coverage: country.grade,
        reachedShare: country.reachedShare,
        state: country.grade === 'SERVED' ? 'READY' as const : country.grade === 'THIN' ? 'WATCH' as const : 'DARK' as const,
    }));
    const status = capacity.forecastConcurrentStreams <= 0 ? 'UNKNOWN' as const
        : capacity.headroomPercent >= 20 ? 'READY' as const
            : capacity.headroomPercent >= 0 ? 'TIGHT' as const : 'OVERLOADED' as const;
    const summary = status === 'OVERLOADED' || marketSignals.some(signal => signal.state === 'DARK')
        ? 'BLOCKED' as const
        : status === 'TIGHT' || marketSignals.some(signal => signal.state === 'WATCH')
            ? 'WATCH' as const : 'READY' as const;
    return { marketSignals, capacity: { status, headroomPercent: capacity.headroomPercent, limiting: capacity.limiting }, summary };
};

/** Minimal room projection used by the live status desk. Build itself remains
 * on the richer canonical coverage/capacity model above. */
export interface NetworkSignalSource {
    cityId: string;
    racks: number;
    listingId?: string;
}

export type MarketSignalState = 'SERVED' | 'THIN' | 'DARK';

export interface MarketSignal {
    countryId: string;
    name: string;
    reached: number;
    served: number;
    state: MarketSignalState;
}

export interface NetworkSignals {
    reached: number;
    served: number;
    markets: MarketSignal[];
    thin: MarketSignal[];
    dark: MarketSignal[];
    standard: number;
}

const statusSourceFor = (room: NetworkSignalSource, fibre: number): ReachSource | null => {
    const site = getStreamingServerSite(room.cityId);
    if (!site || room.racks <= 0) return null;
    const place = room.listingId ? getPlaceByListingId(room.listingId) : undefined;
    return {
        cityId: site.id,
        lat: site.latitude,
        lng: site.longitude,
        racks: room.racks,
        capacity: Number.POSITIVE_INFINITY,
        spread: 1,
        transit: place?.transit ?? site.transit,
        fibre,
    };
};

/**
 * Read the player-facing geography signals from the same reach geometry used
 * by the network map. Capacity remains a separate operational signal: this
 * answers where the installed rooms reach and whether that reach meets the
 * service standard for the platform's age.
 */
export function readNetworkSignals(
    rooms: readonly NetworkSignalSource[],
    countryIds: readonly string[],
    options: { fibre?: StreamingFibreState | null; platformWeeks?: number } = {},
): NetworkSignals {
    const fibre = fibreMultiplier(options.fibre);
    const standard = expectedStandard(options.platformWeeks ?? 0);
    const sources = rooms
        .map(room => statusSourceFor(room, fibre))
        .filter((source): source is ReachSource => Boolean(source));
    if (countryIds.length === 0) return { reached: 0, served: 0, markets: [], thin: [], dark: [], standard };

    const weighted = countryIds.map(rawId => {
        const countryId = String(rawId || '').trim().toUpperCase();
        const market = STREAMING_WORLD_MARKETS.find(candidate => candidate.id === countryId);
        const position = getCountryPosition(countryId);
        const places = audiencePlaces(countryId, position ? { lat: position.latitude, lng: position.longitude } : undefined);
        let reached = 0;
        let served = 0;
        for (const place of places) {
            const strength = sources.reduce((best, source) => Math.max(best, reachStrength(
                source,
                { lat: place.lat, lng: place.lng, demand: 0, countryCode: countryId },
                0,
            )), 0);
            if (strength > 0) reached += place.share;
            if (strength >= standard) served += place.share;
        }
        reached = Math.min(1, reached);
        served = Math.min(1, served);
        return {
            countryId,
            name: market?.country ?? countryId,
            reached,
            served,
            state: served >= .5 ? 'SERVED' as const : reached > 0 ? 'THIN' as const : 'DARK' as const,
            weight: Math.max(1, market?.streamingAudience ?? 1),
        };
    });
    const totalWeight = weighted.reduce((sum, market) => sum + market.weight, 0) || 1;
    const strip = ({ weight: _weight, ...market }: typeof weighted[number]): MarketSignal => market;
    return {
        reached: weighted.reduce((sum, market) => sum + market.reached * market.weight, 0) / totalWeight,
        served: weighted.reduce((sum, market) => sum + market.served * market.weight, 0) / totalWeight,
        markets: weighted.map(strip),
        thin: weighted.filter(market => market.state === 'THIN').map(strip),
        dark: weighted.filter(market => market.state === 'DARK').map(strip),
        standard,
    };
}
