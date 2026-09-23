import type { OwnedStreamingFacility, OwnedStreamingRegionNetworkPlan } from '../types';
import { getStreamingServerSite } from './streamingServerSites';
import { getStreamingFacilityPhysicalUpgradeCost } from './streamingInfrastructurePhysical';
import {
    STREAMING_POWER_KW_PER_WORKHORSE,
    STREAMING_RACK_BUILD_COST,
    STREAMING_SERVER_TIERS,
} from './streamingServerTiers';

export const STREAMING_NETWORK_QUOTE_VERSION = 1;

export interface StreamingNetworkQuoteLine {
    regionId: string;
    rooms: number;
    cities: number;
    racks: number;
    compute: number;
    capex: number;
    deposits: number;
    setup: number;
    dueNow: number;
    weeklyCloud: number;
    weeklyRent: number;
    weeklyPower: number;
    weeklyWater: number;
    weeklyStaffing: number;
    weeklyMaintenance: number;
    weeklyTotal: number;
}

export interface StreamingNetworkQuoteTotals extends Omit<StreamingNetworkQuoteLine, 'regionId'> {
    runway: number;
}

export interface StreamingNetworkQuote {
    version: number;
    regions: readonly StreamingNetworkQuoteLine[];
    totals: Readonly<StreamingNetworkQuoteTotals>;
}

const rounded = (value: number): number => Math.max(0, Math.round(value));

const quoteLine = (regionId: string, facilities: readonly OwnedStreamingFacility[]): StreamingNetworkQuoteLine => {
    const physical = facilities.filter(facility => facility.type !== 'CLOUD_ALLOCATION' && facility.lease?.tenure !== 'CLOUD');
    const cloud = facilities.filter(facility => facility.type === 'CLOUD_ALLOCATION' || facility.lease?.tenure === 'CLOUD');
    const rackGroups = physical.flatMap(facility => facility.rackGroups || []);
    const allGroups = facilities.flatMap(facility => facility.rackGroups || []);
    const racks = rackGroups.reduce((sum, group) => sum + group.rackCount, 0);
    const compute = allGroups.reduce((sum, group) => sum + group.rackCount * STREAMING_SERVER_TIERS[group.serverTier || 'WORKHORSE'].compute, 0);
    const weightedDraw = allGroups.reduce((sum, group) => sum + group.rackCount * STREAMING_SERVER_TIERS[group.serverTier || 'WORKHORSE'].draw, 0);
    const rackCapex = rackGroups.reduce((sum, group) => (
        sum + group.rackCount * STREAMING_RACK_BUILD_COST * STREAMING_SERVER_TIERS[group.serverTier || 'WORKHORSE'].price
    ), 0);
    const propertyCapex = physical.reduce((sum, facility) => sum + (facility.lease?.purchasePrice || 0), 0);
    const upgradeCapex = facilities.reduce((sum, facility) => (
        sum + getStreamingFacilityPhysicalUpgradeCost(facility)
    ), 0);
    const capex = rounded(rackCapex + propertyCapex + upgradeCapex);
    const deposits = rounded(facilities.reduce((sum, facility) => sum + (facility.lease?.depositCost || 0), 0));
    const setup = rounded(facilities.reduce((sum, facility) => sum + (facility.lease?.setupCost || 0), 0));
    const weeklyCloud = rounded(cloud.reduce((sum, facility) => sum + (facility.lease?.weeklyRent || 0), 0));
    const weeklyRent = rounded(physical.reduce((sum, facility) => sum + (facility.lease?.weeklyRent || 0), 0));
    const weeklyPower = rounded(facilities.reduce((sum, facility) => {
        const draw = (facility.rackGroups || []).reduce((held, group) => held + group.rackCount * STREAMING_SERVER_TIERS[group.serverTier || 'WORKHORSE'].draw, 0);
        return sum + draw * STREAMING_POWER_KW_PER_WORKHORSE * 168 * (facility.lease?.electricityRatePerKwh || 0.14);
    }, 0));
    const weeklyWater = rounded(weightedDraw * 26 * 18);
    const weeklyStaffing = rounded(physical.length * 12_000 + racks * 3_500);
    const weeklyMaintenance = rounded(capex * 0.001);
    const dueNow = capex + deposits + setup;
    const weeklyTotal = weeklyCloud + weeklyRent + weeklyPower + weeklyWater + weeklyStaffing + weeklyMaintenance;
    return {
        regionId,
        rooms: facilities.length,
        cities: new Set(facilities.map(facility => facility.cityId)).size,
        racks,
        compute: Math.round(compute * 100) / 100,
        capex,
        deposits,
        setup,
        dueNow,
        weeklyCloud,
        weeklyRent,
        weeklyPower,
        weeklyWater,
        weeklyStaffing,
        weeklyMaintenance,
        weeklyTotal,
    };
};

const freezeQuote = (quote: StreamingNetworkQuote): StreamingNetworkQuote => {
    quote.regions.forEach(Object.freeze);
    Object.freeze(quote.regions);
    Object.freeze(quote.totals);
    return Object.freeze(quote);
};

export const quoteStreamingNetworkPlan = (input: {
    facilities: readonly OwnedStreamingFacility[];
    regionPlans: readonly OwnedStreamingRegionNetworkPlan[];
}): StreamingNetworkQuote => {
    const regionIds = Array.from(new Set([
        ...input.regionPlans.map(plan => plan.regionId),
        ...input.facilities.map(facility => getStreamingServerSite(facility.cityId)?.regionId).filter(Boolean) as string[],
    ])).sort();
    const regions = regionIds.map(regionId => quoteLine(regionId, input.facilities.filter(facility => (
        getStreamingServerSite(facility.cityId)?.regionId === regionId
    ))));
    const totalsBase = regions.reduce((total, region) => {
        for (const key of ['rooms', 'racks', 'compute', 'capex', 'deposits', 'setup', 'dueNow', 'weeklyCloud', 'weeklyRent', 'weeklyPower', 'weeklyWater', 'weeklyStaffing', 'weeklyMaintenance', 'weeklyTotal'] as const) {
            total[key] += region[key];
        }
        return total;
    }, {
        rooms: 0, racks: 0, compute: 0, capex: 0, deposits: 0, setup: 0, dueNow: 0,
        weeklyCloud: 0, weeklyRent: 0, weeklyPower: 0, weeklyWater: 0,
        weeklyStaffing: 0, weeklyMaintenance: 0, weeklyTotal: 0,
    });
    const totals: StreamingNetworkQuoteTotals = {
        ...totalsBase,
        compute: Math.round(totalsBase.compute * 100) / 100,
        cities: new Set(input.facilities.map(facility => facility.cityId)).size,
        runway: totalsBase.weeklyTotal * 13,
    };
    return freezeQuote({ version: STREAMING_NETWORK_QUOTE_VERSION, regions, totals });
};

const stable = (value: unknown): string => {
    if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
    if (value && typeof value === 'object') {
        return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, held]) => `${JSON.stringify(key)}:${stable(held)}`).join(',')}}`;
    }
    return JSON.stringify(value);
};

const hash = (value: string): string => {
    let out = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        out ^= value.charCodeAt(index);
        out = Math.imul(out, 16777619);
    }
    return (out >>> 0).toString(16).padStart(8, '0');
};

export const deriveStreamingInfrastructureSignature = (input: {
    facilities: readonly OwnedStreamingFacility[];
    regionPlans: readonly OwnedStreamingRegionNetworkPlan[];
    quote?: StreamingNetworkQuote;
    demandState?: unknown;
    pricingState?: unknown;
    fibreState?: unknown;
    repairs?: unknown;
}): string => hash(stable({
    version: STREAMING_NETWORK_QUOTE_VERSION,
    regionPlans: input.regionPlans,
    facilities: input.facilities.map(facility => ({
        id: facility.id,
        cityId: facility.cityId,
        type: facility.type,
        racks: facility.installedRacks,
        groups: facility.rackGroups,
        lease: facility.lease,
        physical: facility.physical,
    })),
    quote: input.quote?.totals,
    demandState: input.demandState,
    pricingState: input.pricingState,
    fibreState: input.fibreState,
    repairs: input.repairs,
}));
