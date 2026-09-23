import type {
    BoxOfficeRegionId,
    OwnedStreamingFacility,
    OwnedStreamingNetworkPlacement,
    OwnedStreamingRackGroup,
    OwnedStreamingRegionNetworkPlan,
    StreamingNetworkNodeRole,
    StreamingRackDuty,
    StreamingServerTier,
} from '../types';
import { aggregateStreamingFacilities, getDefaultStreamingFacilityPhysical } from './streamingFacilities';
import { getStreamingCloudProvider, streamingCloudProviderServes } from './streamingCloudProviders';
import { STREAMING_SERVER_SITES, getStreamingServerSite, hasDataResidencyRule } from './streamingServerSites';
import { getOfferedTenures, getStreamingSitePlaces, listingIdForPlace, type StreamingSitePlace } from './streamingSitePlaces';
import { STREAMING_SERVER_TIERS, STREAMING_SERVER_TIER_ORDER } from './streamingServerTiers';
import { WORLD_COUNTRY_DEFINITIONS_BY_ID } from './worldEconomy/worldCountryRegistry';

export interface StreamingRegionalPlacementInput {
    regionPlans: OwnedStreamingRegionNetworkPlan[];
    openingCountryIds: string[];
    existingFacilities: OwnedStreamingFacility[];
    absoluteWeek: number;
}

export interface StreamingRegionalPlacementWarning {
    regionId: string;
    code: string;
    message: string;
}

export interface StreamingRegionalPlacementResult {
    facilities: OwnedStreamingFacility[];
    placements: OwnedStreamingNetworkPlacement[];
    warnings: StreamingRegionalPlacementWarning[];
}

const DUTIES: ReadonlyArray<{ duty: StreamingRackDuty; share: number; role: StreamingNetworkNodeRole }> = [
    { duty: 'CONTENT_ORIGIN', share: 0.2, role: 'CORE_ORIGIN' },
    { duty: 'REGIONAL_CACHE', share: 0.24, role: 'REGIONAL_HUB' },
    { duty: 'LOCAL_EDGE', share: 0.24, role: 'EDGE_CACHE' },
    { duty: 'ENCODING', share: 0.12, role: 'CORE_ORIGIN' },
    { duty: 'PLATFORM_SERVICES', share: 0.12, role: 'REGIONAL_HUB' },
    { duty: 'LIVE_EVENT', share: 0.08, role: 'REGIONAL_HUB' },
];

const roundMoney = (value: number): number => Math.max(0, Math.round(value / 1_000) * 1_000);

const allocateDuties = (
    facilityId: string,
    tier: StreamingServerTier,
    racks: number,
): OwnedStreamingRackGroup[] => {
    const count = Math.max(0, Math.round(racks));
    if (!count) return [];
    const rows = DUTIES.map((entry, index) => ({
        ...entry,
        index,
        count: Math.floor(count * entry.share),
        remainder: count * entry.share - Math.floor(count * entry.share),
    }));
    let remaining = count - rows.reduce((sum, row) => sum + row.count, 0);
    [...rows].sort((a, b) => b.remainder - a.remainder || a.index - b.index).forEach(row => {
        if (remaining > 0) {
            row.count += 1;
            remaining -= 1;
        }
    });
    return rows.filter(row => row.count > 0).map(row => ({
        id: `${facilityId}-${tier}-${row.duty}`,
        name: `${STREAMING_SERVER_TIERS[tier].name} ${row.duty.toLowerCase().replace(/_/g, ' ')}`,
        rackCount: row.count,
        duty: row.duty,
        serverTier: tier,
    }));
};

const openingCountryRank = (countryId: string, opening: Set<string>): number => {
    if (!opening.has(countryId)) return 0;
    const population = WORLD_COUNTRY_DEFINITIONS_BY_ID[countryId]?.baselinePopulation || 0;
    return 1_000_000_000_000 + population;
};

const physicalPlacesFor = (cityId: string, tier: StreamingServerTier): StreamingSitePlace[] => {
    const minimum = STREAMING_SERVER_TIERS[tier].minimumRoomPositions;
    return getStreamingSitePlaces(cityId)
        .filter(place => place.archetype !== 'CLOUD'
            && place.rackPositions >= minimum
            && getOfferedTenures(place).some(tenure => tenure === 'RENTED' || tenure === 'OWNED'))
        .sort((a, b) => a.rackPositions - b.rackPositions || a.id.localeCompare(b.id));
};

const leaseFor = (place: StreamingSitePlace, absoluteWeek: number) => {
    const site = getStreamingServerSite(place.cityId)!;
    const weeklyRent = roundMoney(site.costIndex * 0.006 + place.rackPositions * 5_000);
    return {
        listingId: listingIdForPlace(place),
        providerName: `${site.name} Network Estate`,
        rackPositions: place.rackPositions,
        depositCost: roundMoney(weeklyRent * 8),
        setupCost: roundMoney(site.costIndex * 0.08 + place.rackPositions * 60_000),
        weeklyRent,
        electricityRatePerKwh: Math.round((place.powerPricePerKwh / 100) * 1000) / 1000,
        taxRatePercent: 8,
        reliabilityPercent: place.uptime,
        securityGrade: place.security,
        fibreGrade: place.fibre,
        contractWeeks: 104,
        provisioningWeeks: place.archetype === 'CAMPUS' ? 15 : place.archetype === 'INDUSTRIAL_SHED' ? 8 : 4,
        expansionRackPositions: place.expansionRackPositions,
        tenure: getOfferedTenures(place).includes('RENTED') ? 'RENTED' as const : 'OWNED' as const,
        startedAtAbsoluteWeek: absoluteWeek,
    };
};

const regionForFacility = (facility: OwnedStreamingFacility): string | null => (
    getStreamingServerSite(facility.cityId)?.regionId || null
);

export const reconstructStreamingRegionPlans = (
    facilities: readonly OwnedStreamingFacility[],
): OwnedStreamingRegionNetworkPlan[] => {
    const rows = new Map<string, OwnedStreamingRegionNetworkPlan>();
    for (const facility of facilities) {
        const regionId = regionForFacility(facility);
        if (!regionId) continue;
        const row = rows.get(regionId) || {
            regionId,
            serverCounts: { SCOUT: 0, WORKHORSE: 0, TITAN: 0 },
            cloudProvider: null,
            cloudCompute: 0,
        };
        if (facility.type === 'CLOUD_ALLOCATION' || facility.lease?.tenure === 'CLOUD') {
            row.cloudProvider = facility.lease?.cloudProvider || 'ATLAS';
            row.cloudCompute += facility.installedRacks;
        } else {
            const groups = facility.rackGroups || [];
            for (const group of groups) {
                const tier = group.serverTier || 'WORKHORSE';
                row.serverCounts[tier] += group.rackCount;
            }
            if (groups.length === 0) row.serverCounts.WORKHORSE += facility.installedRacks;
        }
        rows.set(regionId, row);
    }
    return Array.from(rows.values()).sort((a, b) => a.regionId.localeCompare(b.regionId));
};

const facilityOrdinal = (facilities: readonly OwnedStreamingFacility[], cityId: string): number => (
    facilities.filter(facility => facility.cityId === cityId).length + 1
);

export const deriveStreamingRegionalPlacement = (
    input: StreamingRegionalPlacementInput,
): StreamingRegionalPlacementResult => {
    const facilities = input.existingFacilities.map(facility => structuredClone(facility));
    const warnings: StreamingRegionalPlacementWarning[] = [];
    const opening = new Set(input.openingCountryIds.map(id => id.trim().toUpperCase()));
    const existing = reconstructStreamingRegionPlans(facilities);

    for (const plan of input.regionPlans) {
        const regionId = plan.regionId as BoxOfficeRegionId;
        const held = existing.find(row => row.regionId === regionId);
        const regionSites = STREAMING_SERVER_SITES
            .filter(site => site.regionId === regionId)
            .sort((a, b) => openingCountryRank(b.countryCode, opening) - openingCountryRank(a.countryCode, opening)
                || b.transit - a.transit || a.id.localeCompare(b.id));
        if (!regionSites.length) {
            warnings.push({ regionId, code: 'NO_SITE', message: `No server sites exist in ${regionId}.` });
            continue;
        }

        const residencyCountries = Array.from(opening).filter(countryId => (
            hasDataResidencyRule(countryId)
            && WORLD_COUNTRY_DEFINITIONS_BY_ID[countryId]?.regionId === regionId
        ));
        const unservedResidencySites = residencyCountries
            .filter(countryId => !facilities.some(facility => getStreamingServerSite(facility.cityId)?.countryCode === countryId))
            .map(countryId => regionSites.find(site => site.countryCode === countryId))
            .filter(Boolean) as typeof regionSites;
        const siteSequence = [
            ...unservedResidencySites,
            ...regionSites.filter(site => !unservedResidencySites.some(required => required.id === site.id)),
        ];

        let siteCursor = 0;
        for (const tier of [...STREAMING_SERVER_TIER_ORDER].reverse()) {
            let remaining = Math.max(0, Math.round(plan.serverCounts[tier] - (held?.serverCounts[tier] || 0)));
            while (remaining > 0) {
                const site = siteSequence[siteCursor % siteSequence.length];
                siteCursor += 1;
                const place = physicalPlacesFor(site.id, tier)[0];
                if (!place) {
                    warnings.push({ regionId, code: 'NO_ROOM', message: `${site.name} has no room suitable for ${tier}.` });
                    if (siteCursor > siteSequence.length * 2) break;
                    continue;
                }
                const racks = Math.min(remaining, place.rackPositions);
                const ordinal = facilityOrdinal(facilities, site.id);
                const id = `FACILITY-${site.id}-${String(ordinal).padStart(2, '0')}`;
                const rackGroups = allocateDuties(id, tier, racks);
                const role = rackGroups.some(group => group.duty === 'CONTENT_ORIGIN') ? 'CORE_ORIGIN' : 'REGIONAL_HUB';
                const lease = leaseFor(place, input.absoluteWeek);
                facilities.push({
                    id,
                    cityId: site.id,
                    type: place.legacyType,
                    installedRacks: racks,
                    role,
                    rackGroups,
                    lease,
                    physical: getDefaultStreamingFacilityPhysical(place.legacyType, racks, lease),
                });
                remaining -= racks;
            }
        }

        for (const countryId of residencyCountries) {
            if (!facilities.some(facility => getStreamingServerSite(facility.cityId)?.countryCode === countryId)) {
                warnings.push({
                    regionId,
                    code: 'RESIDENCY_UNSERVED',
                    message: `${countryId} requires in-country capacity, but this plan has not placed any.`,
                });
            }
        }

        const requestedCloud = Math.max(0, Math.round(plan.cloudCompute));
        const heldCloud = held?.cloudCompute || 0;
        if (requestedCloud > heldCloud && plan.cloudProvider) {
            const provider = getStreamingCloudProvider(plan.cloudProvider);
            if (!provider || !streamingCloudProviderServes(provider, regionId)) {
                warnings.push({ regionId, code: 'PROVIDER_UNAVAILABLE', message: `${plan.cloudProvider} does not sell in ${regionId}.` });
            } else {
                const site = regionSites[0];
                const cloudPlace = getStreamingSitePlaces(site.id).find(place => place.archetype === 'CLOUD');
                const normalCeiling = Math.max(1, Math.floor((cloudPlace?.rackPositions || 1) * provider.ceilingMultiplier));
                const compute = requestedCloud - heldCloud;
                const ordinal = facilityOrdinal(facilities, site.id);
                const id = `FACILITY-${site.id}-${String(ordinal).padStart(2, '0')}`;
                const weeklyRent = roundMoney(compute * 150_000 * provider.rateMultiplier);
                const lease = {
                    listingId: cloudPlace ? listingIdForPlace(cloudPlace) : `LEASE-${site.id}-CLOUD_ALLOCATION-V1`,
                    providerName: provider.name,
                    rackPositions: Math.max(compute, normalCeiling),
                    depositCost: roundMoney(weeklyRent * 2),
                    setupCost: 70_000,
                    weeklyRent,
                    electricityRatePerKwh: site.powerPricePerKwh / 100,
                    taxRatePercent: 8,
                    reliabilityPercent: 99.95,
                    securityGrade: 'STANDARD' as const,
                    fibreGrade: 'CARRIER' as const,
                    contractWeeks: 13,
                    provisioningWeeks: 1,
                    expansionRackPositions: 0,
                    tenure: 'CLOUD' as const,
                    cloudProvider: provider.id,
                    cloudExtendedCompute: Math.max(0, requestedCloud - normalCeiling),
                    startedAtAbsoluteWeek: input.absoluteWeek,
                };
                facilities.push({
                    id,
                    cityId: site.id,
                    type: 'CLOUD_ALLOCATION',
                    installedRacks: compute,
                    role: 'REGIONAL_HUB',
                    rackGroups: allocateDuties(id, 'WORKHORSE', compute),
                    lease,
                    physical: getDefaultStreamingFacilityPhysical('CLOUD_ALLOCATION', compute, lease),
                });
                if (requestedCloud > normalCeiling) {
                    warnings.push({ regionId, code: 'EXTENDED_CLOUD', message: `${requestedCloud - normalCeiling} compute is billed above ${provider.name}'s normal ceiling.` });
                }
            }
        }
    }

    return { facilities, placements: aggregateStreamingFacilities(facilities), warnings };
};

export const projectStreamingCompatibilityPlacements = (
    result: StreamingRegionalPlacementResult,
): OwnedStreamingNetworkPlacement[] => result.placements.map(placement => ({ ...placement }));

export const projectStreamingCompatibilityRackDuties = (
    result: StreamingRegionalPlacementResult,
): OwnedStreamingRackGroup[] => result.facilities.flatMap(facility => facility.rackGroups || []);
