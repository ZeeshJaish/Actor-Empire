import type { WorldPopulationCountryState } from '../../types';

const clamp = (value: number, low: number, high: number): number =>
    Math.min(high, Math.max(low, Number.isFinite(value) ? value : low));
const whole = (value: number): number => Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
const round2 = (value: number): number => Math.round(value * 100) / 100;

export interface StreamingAdMarketInput {
    countryId: string;
    absoluteWeek: number;
    eligibleHours: number;
    minutesPerHour: number;
    /** Legacy save field; intentionally ignored by automatic market clearing. */
    targetCpm?: number;
    advertiserDemandBudget: number;
    marketReferenceCpm: number;
    audienceQualityIndex: number;
    brandSafetyIndex: number;
}

export interface StreamingAdMarketSupply {
    platformId: string;
    eligibleHours: number;
    minutesPerHour: number;
    audienceQualityIndex: number;
    brandSafetyIndex: number;
}

export interface StreamingAdMarketPoolInput {
    countryId: string;
    absoluteWeek: number;
    advertiserDemandBudget: number;
    marketReferenceCpm: number;
    suppliers: StreamingAdMarketSupply[];
}

export interface StreamingAdMarketPoolOutcome {
    byPlatform: Record<string, StreamingAdMarketOutcome>;
    totalRevenue: number;
    unspentDemandBudget: number;
}

export interface StreamingAdMarketOutcome {
    availableImpressions: number;
    filledImpressions: number;
    fillRate: number;
    realizedCpm: number;
    revenue: number;
    unspentDemandBudget: number;
}

const marketVariation = (countryId: string, absoluteWeek: number): number => {
    let hash = 2166136261;
    const key = `${countryId.toUpperCase()}:${Math.floor(clamp(absoluteWeek, 0, 100_000))}`;
    for (let index = 0; index < key.length; index += 1) {
        hash ^= key.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return .94 + (hash >>> 0) / 0xffffffff * .12;
};

/** Clear one finite country-week demand pool across every supplied platform.
    All shares are calculated from sorted inputs before any revenue is settled,
    so player/AI iteration order and historical target CPM cannot affect cash. */
export const clearStreamingAdMarket = (input: StreamingAdMarketPoolInput): StreamingAdMarketPoolOutcome => {
    const budget = whole(clamp(input.advertiserDemandBudget, 0, 1_000_000_000_000));
    const reference = clamp(input.marketReferenceCpm, .01, 100)
        * marketVariation(input.countryId, input.absoluteWeek);
    const supplies = [...input.suppliers].sort((left, right) => left.platformId.localeCompare(right.platformId))
        .map(supply => {
            const hours = clamp(supply.eligibleHours, 0, 1_000_000_000);
            const minutes = clamp(supply.minutesPerHour, 0, 30);
            const tolerance = clamp(1 - Math.max(0, minutes - 6) * .05, .25, 1);
            const inventory = whole(hours * minutes * 2 * tolerance);
            const quality = clamp(.65 + clamp(supply.audienceQualityIndex, 0, 100) / 250
                + clamp(supply.brandSafetyIndex, 0, 100) / 500, .65, 1.25);
            return { platformId: supply.platformId, inventory, quality,
                weight: inventory * quality };
        });
    const totalWeight = supplies.reduce((sum, supply) => sum + supply.weight, 0);
    const nominalCost = supplies.reduce((sum, supply) => sum
        + supply.inventory * reference * supply.quality / 1_000, 0);
    const demandPressure = nominalCost > 0 ? budget / nominalCost : 0;
    // Demand scarcity reduces the price as well as fill; excess demand lifts
    // the rate modestly. Country conditions and platform quality remain real.
    const priceFactor = clamp(.78 + .23 * Math.sqrt(Math.max(0, demandPressure)), .68, 1.22);
    const byPlatform: Record<string, StreamingAdMarketOutcome> = {};
    let totalRevenue = 0;
    supplies.forEach(supply => {
        const share = totalWeight > 0 ? whole(budget * supply.weight / totalWeight) : 0;
        const rate = round2(clamp(reference * supply.quality * priceFactor, .01, 125));
        const filled = budget && share && supply.inventory
            ? Math.min(supply.inventory, whole(share * 1_000 / rate)) : 0;
        const revenue = Math.min(share, whole(filled * rate / 1_000));
        totalRevenue += revenue;
        byPlatform[supply.platformId] = {
            availableImpressions: supply.inventory,
            filledImpressions: filled,
            fillRate: supply.inventory ? round2(filled / supply.inventory) : 0,
            realizedCpm: filled ? rate : 0,
            revenue,
            unspentDemandBudget: share - revenue,
        };
    });
    return { byPlatform, totalRevenue, unspentDemandBudget: budget - totalRevenue };
};

/** Single-platform compatibility wrapper for fixed-input callers. Live and
    launch flows pass all country suppliers to clearStreamingAdMarket. */
export const resolveStreamingAdMarket = (input: StreamingAdMarketInput): StreamingAdMarketOutcome => (
    clearStreamingAdMarket({ countryId: input.countryId, absoluteWeek: input.absoluteWeek,
        advertiserDemandBudget: input.advertiserDemandBudget,
        marketReferenceCpm: input.marketReferenceCpm,
        suppliers: [{ platformId: 'SINGLE', eligibleHours: input.eligibleHours,
            minutesPerHour: input.minutesPerHour, audienceQualityIndex: input.audienceQualityIndex,
            brandSafetyIndex: input.brandSafetyIndex }],
    }).byPlatform.SINGLE
);

/** Country demand belongs to the world, not the publisher's CPM input. */
export const getStreamingCountryAdMarket = (
    country: WorldPopulationCountryState,
    absoluteWeek: number,
    reachableHouseholds: number,
): { advertiserDemandBudget: number; marketReferenceCpm: number } => {
    const development = { LOW: .38, EMERGING: .65, DEVELOPED: 1, ADVANCED: 1.25 }[country.developmentProfile];
    // The world macro indices are relative game indices, not CPM percentages.
    const purchasing = clamp(.85 + country.macro.purchasingPowerIndex / 500, .85, 1.15);
    const confidence = clamp(.9 + country.macro.consumerConfidence / 1_000, .9, 1.1);
    const budget = whole(clamp(reachableHouseholds, 0, 1_000_000_000) * 2.5
        * development * purchasing * confidence * marketVariation(country.id, absoluteWeek));
    const reference = round2(clamp(18 * development * purchasing * confidence, 3, 32));
    return { advertiserDemandBudget: budget, marketReferenceCpm: reference };
};
