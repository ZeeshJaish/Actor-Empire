/**
 * B9 (2026-11-16): how a region's steady capacity is shared on opening night, for the career Build's forecast.
 *
 * It was the region's steady streams ÷ the region's WHOLE demand, applied to each market's covered share. So viewers
 * the network cannot reach still took their slice of the racks: "1M carried" read 748.7K served while the map was
 * green, and a region with four times the racks its reachable viewers need still showed some of them unserved.
 *
 * Now, in two passes per region:
 *  1. a market whose viewers must be served in the country (data residency) takes its own country's rooms first;
 *  2. every other market shares what is left of the region, over the viewers the network reaches.
 * Served then comes to min(carried, reachable), which is what the weekly game does when it plays the night
 * (worldStreamingViewing: reachable demand against capacity).
 */
export interface StreamingCapacityShareMarket {
    id: string;
    regionId: string;
    /** opening-night demand × the share of the country inside the standard */
    reachableDemand: number;
    /** its viewers may only use rooms inside the country */
    residency: boolean;
}

export interface StreamingCapacityShare {
    /** 0–1: the part of the reachable viewers the racks can carry */
    share: number;
    /** the viewers it reaches want more than the capacity it can use */
    overloaded: boolean;
}

export const streamingRegionCountryKey = (regionId: string, countryCode: string): string => `${regionId}|${countryCode}`;

export const shareStreamingCapacity = (input: {
    markets: readonly StreamingCapacityShareMarket[];
    /** steady streams of every room in the region */
    steadyByRegion: ReadonlyMap<string, number>;
    /** steady streams of the rooms in one country of a region (streamingRegionCountryKey) */
    steadyByRegionCountry: ReadonlyMap<string, number>;
}): Map<string, StreamingCapacityShare> => {
    const result = new Map<string, StreamingCapacityShare>();
    const want = (market: StreamingCapacityShareMarket): number => (
        Number.isFinite(market.reachableDemand) ? Math.max(0, market.reachableDemand) : 0
    );
    for (const regionId of new Set(input.markets.map(market => market.regionId))) {
        const markets = input.markets.filter(market => market.regionId === regionId);
        let pool = Math.max(0, input.steadyByRegion.get(regionId) || 0);
        /* 1. residency markets on their own country's rooms */
        for (const market of markets.filter(item => item.residency)) {
            const own = Math.max(0, input.steadyByRegionCountry.get(streamingRegionCountryKey(regionId, market.id)) || 0);
            const needed = want(market);
            const used = Math.min(own, needed);
            pool = Math.max(0, pool - used);
            result.set(market.id, { share: needed > 0 ? used / needed : own > 0 ? 1 : 0, overloaded: needed > own });
        }
        /* 2. the rest share what is left, over the viewers the network reaches */
        const rest = markets.filter(item => !item.residency);
        const needed = rest.reduce((sum, market) => sum + want(market), 0);
        const share = needed > 0 ? Math.min(1, pool / needed) : pool > 0 ? 1 : 0;
        for (const market of rest) result.set(market.id, { share, overloaded: needed > pool });
    }
    return result;
};
