import type {
    OwnedStreamingFacility,
    StreamingFacilityFibreGrade,
    StreamingFacilityLeaseSnapshot,
    StreamingFacilitySecurityGrade,
    StreamingFacilityType,
    StreamingNetworkNodeRole,
} from '../types';
import {
    getProductionLocation,
    getStreamingDataCenterCost,
    type ProductionLocationContinentId,
} from './productionLocations';
import {
    createStreamingFacilityId,
    getStreamingFacilityContract,
    normalizeStreamingFacilityPhysical,
    STREAMING_FACILITY_CONTRACTS,
} from './streamingFacilities';
import { normalizeStreamingRackGroups } from './streamingRackGroups';

export type StreamingFacilityListingStatus = 'OPEN' | 'LIMITED' | 'RESEARCH_REQUIRED';

export interface StreamingFacilityMarketplaceListing extends StreamingFacilityLeaseSnapshot {
    cityId: string;
    facilityType: StreamingFacilityType;
    facilityName: string;
    shortName: string;
    description: string;
    status: StreamingFacilityListingStatus;
    marketNote: string;
}

const PROVIDERS: Record<ProductionLocationContinentId, string[]> = {
    NA: ['Northstar Colocation', 'Atlas Compute', 'MetroGrid Exchange'],
    SA: ['Andes Fibre House', 'SurGrid Digital', 'Aurora Colocation'],
    EU: ['Continental IX', 'Crown Fibre Works', 'Northline Compute'],
    AS: ['Pacific Relay', 'Zenith Data Exchange', 'Lotus Compute'],
    AF: ['Horizon Fibre House', 'Equator Compute', 'Sahara Exchange'],
    OC: ['Southern Cross Compute', 'Harbour IX', 'Pacific Vault'],
};

const TAX_BY_CONTINENT: Record<ProductionLocationContinentId, number> = {
    NA: 8.4,
    SA: 11.2,
    EU: 14.8,
    AS: 10.6,
    AF: 9.1,
    OC: 12.4,
};

const TYPE_ORDER: StreamingFacilityType[] = [
    'CLOUD_ALLOCATION',
    'RENTED_CABINET',
    'PRIVATE_CAGE',
    'PRIVATE_SUITE',
    'DEDICATED_DATA_HALL',
    'OWNED_DATA_CENTRE',
];

const hash = (value: string): number => {
    let out = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        out ^= value.charCodeAt(index);
        out = Math.imul(out, 16777619);
    }
    return out >>> 0;
};

const roundMoney = (value: number): number => Math.max(0, Math.round(value / 1_000) * 1_000);

const securityFor = (type: StreamingFacilityType): StreamingFacilitySecurityGrade => (
    type === 'RENTED_CABINET' || type === 'CLOUD_ALLOCATION'
        ? 'STANDARD'
        : type === 'PRIVATE_CAGE' || type === 'PRIVATE_SUITE'
            ? 'REINFORCED'
            : 'FORTIFIED'
);

const fibreFor = (type: StreamingFacilityType, quality: number): StreamingFacilityFibreGrade => (
    type === 'DEDICATED_DATA_HALL' || type === 'OWNED_DATA_CENTRE' || quality >= 9
        ? 'GLOBAL_BACKBONE'
        : type === 'PRIVATE_CAGE' || type === 'PRIVATE_SUITE' || quality >= 7
            ? 'CARRIER'
            : 'METRO'
);

const rackPositionsFor = (type: StreamingFacilityType, variation: number): number => {
    const capacity = getStreamingFacilityContract(type).capacityRacks;
    if (type === 'PRIVATE_CAGE') return variation > 0.55 ? 8 : 6;
    if (type === 'PRIVATE_SUITE') return variation > 0.5 ? 16 : 12;
    if (type === 'DEDICATED_DATA_HALL') return variation > 0.5 ? 32 : 24;
    if (type === 'OWNED_DATA_CENTRE') return variation > 0.5 ? 96 : 72;
    return capacity;
};

/** Stable city listings. Chosen terms are copied onto the facility save. */
export const getStreamingFacilityMarketplace = (cityId: string): StreamingFacilityMarketplaceListing[] => {
    const city = getProductionLocation(cityId);
    if (!city) return [];
    const cityCost = getStreamingDataCenterCost(city) / 10_000_000;
    const providers = PROVIDERS[city.continentId];
    return TYPE_ORDER.flatMap((type, index) => {
        const base = STREAMING_FACILITY_CONTRACTS.find(contract => contract.type === type);
        if (!base?.marketplaceVisible) return [];
        const fingerprint = hash(`${city.id}.${type}.market-v1`);
        const variation = (fingerprint % 1_000) / 1_000;
        const providerName = providers[(fingerprint + index) % providers.length];
        const rackPositions = rackPositionsFor(type, variation);
        const status: StreamingFacilityListingStatus = type === 'OWNED_DATA_CENTRE'
            ? 'RESEARCH_REQUIRED'
            : variation > 0.78 ? 'LIMITED' : 'OPEN';
        const priceNoise = 0.93 + variation * 0.14;
        const weeklyRent = roundMoney(base.weeklyLease * cityCost * priceNoise);
        const setupCost = roundMoney(base.setupCost * cityCost * (0.92 + variation * 0.16));
        const depositWeeks = type === 'CLOUD_ALLOCATION' ? 2 : type === 'RENTED_CABINET' ? 4 : 8;
        const securityGrade = securityFor(type);
        const fibreGrade = fibreFor(type, city.quality);
        const reliabilityBase = 99.72 + city.quality * 0.022
            + (fibreGrade === 'GLOBAL_BACKBONE' ? 0.035 : fibreGrade === 'CARRIER' ? 0.015 : 0);
        return [{
            listingId: `LEASE-${city.id}-${type}-V1`,
            cityId: city.id,
            facilityType: type,
            facilityName: base.name,
            shortName: base.shortName,
            description: base.description,
            providerName,
            rackPositions,
            depositCost: roundMoney(weeklyRent * depositWeeks),
            setupCost,
            weeklyRent,
            electricityRatePerKwh: Math.round((0.07 + cityCost * 0.055 + (fingerprint % 9) / 100) * 100) / 100,
            taxRatePercent: Math.round((TAX_BY_CONTINENT[city.continentId] + (fingerprint % 25) / 10) * 10) / 10,
            reliabilityPercent: Math.min(99.999, Math.round(reliabilityBase * 1_000) / 1_000),
            securityGrade,
            fibreGrade,
            contractWeeks: type === 'CLOUD_ALLOCATION' ? 13 : type === 'RENTED_CABINET' ? 26 : type === 'PRIVATE_CAGE' ? 52 : 104,
            provisioningWeeks: Math.max(0, base.provisioningWeeks + (status === 'LIMITED' ? 1 : 0)),
            expansionRackPositions: type === 'OWNED_DATA_CENTRE'
                ? 96
                : Math.max(0, Math.round((base.capacityRacks * (0.25 + variation * 0.75)) / 2) * 2),
            status,
            marketNote: status === 'RESEARCH_REQUIRED'
                ? 'Land, cooling and campus construction technology required.'
                : status === 'LIMITED'
                    ? 'Last suitable space in this building; provisioning takes longer.'
                    : city.quality >= 8
                        ? 'Strong grid and fibre access for a dependable opening.'
                        : 'Lower entry cost, with more operational attention required.',
        }];
    });
};

export const getRecommendedStreamingFacilityListing = (
    cityId: string,
    minimumRacks = 1,
    preferCloud = false,
): StreamingFacilityMarketplaceListing | null => {
    const listings = getStreamingFacilityMarketplace(cityId).filter(listing => (
        listing.status !== 'RESEARCH_REQUIRED' && listing.rackPositions >= minimumRacks
    ));
    if (preferCloud) {
        const cloud = listings.find(listing => listing.facilityType === 'CLOUD_ALLOCATION');
        if (cloud) return cloud;
    }
    return listings.find(listing => listing.facilityType !== 'CLOUD_ALLOCATION') || listings[0] || null;
};

export const createStreamingFacilityFromListing = (
    listing: StreamingFacilityMarketplaceListing,
    existingFacilities: OwnedStreamingFacility[],
    role: StreamingNetworkNodeRole,
    installedRacks = 1,
): OwnedStreamingFacility => {
    const usedIds = new Set(existingFacilities.map(facility => facility.id));
    let ordinal = existingFacilities.filter(facility => facility.cityId === listing.cityId).length + 1;
    let id = createStreamingFacilityId(listing.cityId, ordinal);
    while (usedIds.has(id)) {
        ordinal += 1;
        id = createStreamingFacilityId(listing.cityId, ordinal);
    }
    const lease: StreamingFacilityLeaseSnapshot = {
        listingId: listing.listingId,
        providerName: listing.providerName,
        rackPositions: listing.rackPositions,
        depositCost: listing.depositCost,
        setupCost: listing.setupCost,
        weeklyRent: listing.weeklyRent,
        electricityRatePerKwh: listing.electricityRatePerKwh,
        taxRatePercent: listing.taxRatePercent,
        reliabilityPercent: listing.reliabilityPercent,
        securityGrade: listing.securityGrade,
        fibreGrade: listing.fibreGrade,
        contractWeeks: listing.contractWeeks,
        provisioningWeeks: listing.provisioningWeeks,
        expansionRackPositions: listing.expansionRackPositions,
    };
    const safeInstalledRacks = Math.max(1, Math.min(listing.rackPositions, Math.round(installedRacks)));
    return {
        id,
        cityId: listing.cityId,
        type: listing.facilityType,
        installedRacks: safeInstalledRacks,
        role,
        rackGroups: normalizeStreamingRackGroups(undefined, id, safeInstalledRacks, role),
        lease,
        physical: normalizeStreamingFacilityPhysical(undefined, listing.facilityType, safeInstalledRacks, lease),
    };
};
