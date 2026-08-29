import type {
    OwnedStreamingFacility,
    OwnedStreamingFacilityPhysicalState,
    OwnedStreamingNetworkPlacement,
    StreamingBackupPowerMode,
    StreamingCoolingMode,
    StreamingFacilityLeaseSnapshot,
    StreamingFacilityType,
    StreamingNetworkNodeRole,
} from '../types';
import {
    normalizeStreamingRackGroups,
    projectFacilityNetworkRole,
} from './streamingRackGroups';

export interface StreamingFacilityContract {
    type: StreamingFacilityType;
    name: string;
    shortName: string;
    description: string;
    capacityRacks: number;
    setupCost: number;
    weeklyLease: number;
    coolingKwPerRack: number;
    provisioningWeeks: number;
    playerSelectable: boolean;
    marketplaceVisible: boolean;
}

export const STREAMING_FACILITY_CONTRACTS: StreamingFacilityContract[] = [
    {
        type: 'CLOUD_ALLOCATION',
        name: 'Cloud allocation',
        shortName: 'Cloud block',
        description: 'Reserved streaming capacity inside a provider-operated cloud region.',
        capacityRacks: 4,
        setupCost: 70_000,
        weeklyLease: 62_000,
        coolingKwPerRack: 7,
        provisioningWeeks: 1,
        playerSelectable: true,
        marketplaceVisible: true,
    },
    {
        type: 'RENTED_CABINET',
        name: 'Rented cabinet',
        shortName: 'Cabinet',
        description: 'A lockable starter cabinet inside a shared data centre.',
        capacityRacks: 2,
        setupCost: 180_000,
        weeklyLease: 18_000,
        coolingKwPerRack: 11,
        provisioningWeeks: 1,
        playerSelectable: true,
        marketplaceVisible: true,
    },
    {
        type: 'PRIVATE_CAGE',
        name: 'Private cage',
        shortName: 'Cage',
        description: 'Your own secured cage with room for a small launch cluster.',
        capacityRacks: 8,
        setupCost: 620_000,
        weeklyLease: 54_000,
        coolingKwPerRack: 10,
        provisioningWeeks: 2,
        playerSelectable: true,
        marketplaceVisible: true,
    },
    {
        type: 'PRIVATE_SUITE',
        name: 'Private server suite',
        shortName: 'Suite',
        description: 'A dedicated room with stronger power, cooling and physical security.',
        capacityRacks: 16,
        setupCost: 1_650_000,
        weeklyLease: 126_000,
        coolingKwPerRack: 9,
        provisioningWeeks: 3,
        playerSelectable: true,
        marketplaceVisible: true,
    },
    {
        type: 'DEDICATED_DATA_HALL',
        name: 'Dedicated data hall',
        shortName: 'Data hall',
        description: 'A full hall reserved for your platform and its expansion.',
        capacityRacks: 32,
        setupCost: 4_800_000,
        weeklyLease: 310_000,
        coolingKwPerRack: 8,
        provisioningWeeks: 5,
        playerSelectable: true,
        marketplaceVisible: true,
    },
    {
        type: 'OWNED_DATA_CENTRE',
        name: 'Owned data centre',
        shortName: 'Owned campus',
        description: 'Buy land and construct a permanent campus after the required technology is researched.',
        capacityRacks: 96,
        setupCost: 38_000_000,
        weeklyLease: 180_000,
        coolingKwPerRack: 6,
        provisioningWeeks: 18,
        playerSelectable: false,
        marketplaceVisible: true,
    },
    {
        type: 'LEGACY_CAMPUS',
        name: 'Legacy commissioned campus',
        shortName: 'Legacy campus',
        description: 'An existing pre-facility save preserved without changing capacity or cost.',
        capacityRacks: 96,
        setupCost: 0,
        weeklyLease: 0,
        coolingKwPerRack: 10,
        provisioningWeeks: 0,
        playerSelectable: false,
        marketplaceVisible: false,
    },
];

export const getStreamingFacilityContract = (type: StreamingFacilityType): StreamingFacilityContract => (
    STREAMING_FACILITY_CONTRACTS.find(contract => contract.type === type)
    || STREAMING_FACILITY_CONTRACTS.find(contract => contract.type === 'RENTED_CABINET')!
);

export const getSmallestStreamingFacilityType = (racks: number): StreamingFacilityType => {
    const wanted = Math.max(1, Math.round(racks || 1));
    return STREAMING_FACILITY_CONTRACTS.find(contract => (
        contract.playerSelectable
        && contract.type !== 'CLOUD_ALLOCATION'
        && contract.capacityRacks >= wanted
    ))?.type || 'LEGACY_CAMPUS';
};

export const getStreamingFacilityCapacity = (facility: OwnedStreamingFacility): number => (
    Math.max(1, Math.round(facility.lease?.rackPositions || getStreamingFacilityContract(facility.type).capacityRacks))
);

export const getStreamingFacilitySetupCost = (facility: OwnedStreamingFacility): number => (
    facility.lease
        ? Math.max(0, facility.lease.depositCost + facility.lease.setupCost)
        : getStreamingFacilityContract(facility.type).setupCost
);

export const getStreamingFacilityWeeklyRent = (facility: OwnedStreamingFacility): number => (
    facility.lease?.weeklyRent ?? getStreamingFacilityContract(facility.type).weeklyLease
);

const finite = (value: unknown, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const physicalProfileFor = (type: StreamingFacilityType): {
    powerFactor: number;
    coolingFactor: number;
    backupPowerMode: StreamingBackupPowerMode;
    coolingMode: StreamingCoolingMode;
} => {
    if (type === 'CLOUD_ALLOCATION') return { powerFactor: 1.2, coolingFactor: 1.08, backupPowerMode: 'UPS', coolingMode: 'AIR' };
    if (type === 'RENTED_CABINET') return { powerFactor: 1.2, coolingFactor: 1.08, backupPowerMode: 'UPS', coolingMode: 'AIR' };
    if (type === 'PRIVATE_CAGE') return { powerFactor: 1.25, coolingFactor: 1.12, backupPowerMode: 'GENERATOR', coolingMode: 'AIR' };
    if (type === 'PRIVATE_SUITE') return { powerFactor: 1.3, coolingFactor: 1.16, backupPowerMode: 'N_PLUS_ONE', coolingMode: 'DIRECT_LIQUID' };
    if (type === 'DEDICATED_DATA_HALL') return { powerFactor: 1.36, coolingFactor: 1.2, backupPowerMode: 'N_PLUS_ONE', coolingMode: 'DIRECT_LIQUID' };
    return { powerFactor: 1.42, coolingFactor: 1.24, backupPowerMode: 'N_PLUS_ONE', coolingMode: 'IMMERSION' };
};

export const getDefaultStreamingFacilityPhysical = (
    type: StreamingFacilityType,
    installedRacks: number,
    lease?: StreamingFacilityLeaseSnapshot,
): OwnedStreamingFacilityPhysicalState => {
    const contract = getStreamingFacilityContract(type);
    const profile = physicalProfileFor(type);
    const capacityRacks = Math.max(1, Math.round(lease?.rackPositions || contract.capacityRacks));
    return {
        powerContractKw: Math.max(12, Math.round(capacityRacks * 12 * profile.powerFactor)),
        backupPowerKw: Math.max(8, Math.round(capacityRacks * 12 * (profile.backupPowerMode === 'N_PLUS_ONE' ? 1 : profile.backupPowerMode === 'GENERATOR' ? .72 : .4))),
        backupPowerMode: profile.backupPowerMode,
        coolingCapacityKw: Math.max(contract.coolingKwPerRack, Math.round(capacityRacks * contract.coolingKwPerRack * profile.coolingFactor)),
        coolingMode: profile.coolingMode,
        bandwidthMbps: Math.max(3_200, capacityRacks * 3_200),
        burstBandwidthMbps: Math.max(4_800, capacityRacks * 4_800),
        maintenanceConditionPercent: 96,
        lastMaintenanceAbsoluteWeek: 0,
        powerUpgradeCount: 0,
        coolingUpgradeCount: 0,
        bandwidthUpgradeCount: 0,
        equipmentReplacementCount: 0,
    };
};

export const normalizeStreamingFacilityPhysical = (
    value: unknown,
    type: StreamingFacilityType,
    installedRacks: number,
    lease?: StreamingFacilityLeaseSnapshot,
): OwnedStreamingFacilityPhysicalState => {
    const defaults = getDefaultStreamingFacilityPhysical(type, installedRacks, lease);
    const source = value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
    const backupPowerMode: StreamingBackupPowerMode = source.backupPowerMode === 'NONE'
        || source.backupPowerMode === 'UPS'
        || source.backupPowerMode === 'GENERATOR'
        || source.backupPowerMode === 'N_PLUS_ONE'
        ? source.backupPowerMode
        : defaults.backupPowerMode;
    const coolingMode: StreamingCoolingMode = source.coolingMode === 'AIR'
        || source.coolingMode === 'DIRECT_LIQUID'
        || source.coolingMode === 'IMMERSION'
        ? source.coolingMode
        : defaults.coolingMode;
    return {
        powerContractKw: Math.max(12, Math.min(50_000, Math.round(finite(source.powerContractKw, defaults.powerContractKw)))),
        backupPowerKw: Math.max(0, Math.min(50_000, Math.round(finite(source.backupPowerKw, defaults.backupPowerKw)))),
        backupPowerMode,
        coolingCapacityKw: Math.max(1, Math.min(50_000, Math.round(finite(source.coolingCapacityKw, defaults.coolingCapacityKw)))),
        coolingMode,
        bandwidthMbps: Math.max(100, Math.min(10_000_000, Math.round(finite(source.bandwidthMbps, defaults.bandwidthMbps)))),
        burstBandwidthMbps: Math.max(100, Math.min(10_000_000, Math.round(finite(source.burstBandwidthMbps, defaults.burstBandwidthMbps)))),
        maintenanceConditionPercent: Math.max(0, Math.min(100, Math.round(finite(source.maintenanceConditionPercent, defaults.maintenanceConditionPercent)))),
        lastMaintenanceAbsoluteWeek: Math.max(0, Math.round(finite(source.lastMaintenanceAbsoluteWeek, defaults.lastMaintenanceAbsoluteWeek))),
        powerUpgradeCount: Math.max(0, Math.min(1_000, Math.round(finite(
            source.powerUpgradeCount,
            Math.ceil(Math.max(0, finite(source.powerContractKw, defaults.powerContractKw) - defaults.powerContractKw) / 24),
        )))),
        coolingUpgradeCount: Math.max(0, Math.min(1_000, Math.round(finite(
            source.coolingUpgradeCount,
            Math.ceil(Math.max(0, finite(source.coolingCapacityKw, defaults.coolingCapacityKw) - defaults.coolingCapacityKw) / 24),
        )))),
        bandwidthUpgradeCount: Math.max(0, Math.min(1_000, Math.round(finite(
            source.bandwidthUpgradeCount,
            Math.ceil(Math.max(0, finite(source.bandwidthMbps, defaults.bandwidthMbps) - defaults.bandwidthMbps) / 2_400),
        )))),
        equipmentReplacementCount: Math.max(0, Math.min(1_000, Math.round(finite(
            source.equipmentReplacementCount,
            finite(source.maintenanceConditionPercent, defaults.maintenanceConditionPercent) >= 98
                && defaults.maintenanceConditionPercent < 98 ? 1 : 0,
        )))),
    };
};

export const normalizeStreamingFacilityLease = (
    value: unknown,
    type: StreamingFacilityType,
): StreamingFacilityLeaseSnapshot | undefined => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const source = value as Record<string, unknown>;
    const base = getStreamingFacilityContract(type);
    const listingId = String(source.listingId || '').trim().slice(0, 120);
    const providerName = String(source.providerName || '').trim().slice(0, 120);
    if (!listingId || !providerName) return undefined;
    const securityGrade = source.securityGrade === 'REINFORCED' || source.securityGrade === 'FORTIFIED'
        ? source.securityGrade : 'STANDARD';
    const fibreGrade = source.fibreGrade === 'CARRIER' || source.fibreGrade === 'GLOBAL_BACKBONE'
        ? source.fibreGrade : 'METRO';
    return {
        listingId,
        providerName,
        rackPositions: Math.max(1, Math.min(base.capacityRacks, Math.round(finite(source.rackPositions, base.capacityRacks)))),
        depositCost: Math.max(0, Math.round(finite(source.depositCost, 0))),
        setupCost: Math.max(0, Math.round(finite(source.setupCost, base.setupCost))),
        weeklyRent: Math.max(0, Math.round(finite(source.weeklyRent, base.weeklyLease))),
        electricityRatePerKwh: Math.max(0.01, Math.round(finite(source.electricityRatePerKwh, 0.14) * 100) / 100),
        taxRatePercent: Math.max(0, Math.min(45, Math.round(finite(source.taxRatePercent, 8) * 10) / 10)),
        reliabilityPercent: Math.max(95, Math.min(99.999, Math.round(finite(source.reliabilityPercent, 99.9) * 1_000) / 1_000)),
        securityGrade,
        fibreGrade,
        contractWeeks: Math.max(1, Math.min(520, Math.round(finite(source.contractWeeks, 52)))),
        provisioningWeeks: Math.max(0, Math.min(104, Math.round(finite(source.provisioningWeeks, base.provisioningWeeks)))),
        expansionRackPositions: Math.max(0, Math.min(96, Math.round(finite(source.expansionRackPositions, 0)))),
    };
};

export const createStreamingFacilityId = (cityId: string, ordinal = 1): string => (
    `FACILITY-${String(cityId || 'CITY').trim().toUpperCase()}-${String(ordinal).padStart(2, '0')}`
);

/** Deterministic upgrade path for saves created before explicit facilities. */
export const migratePlacementsToStreamingFacilities = (
    placements: OwnedStreamingNetworkPlacement[] | null | undefined,
): OwnedStreamingFacility[] => (placements || []).map((placement, index) => {
    const id = createStreamingFacilityId(placement.cityId, index + 1);
    const installedRacks = Math.max(1, Math.min(96, Math.round(placement.racks || 1)));
    const lease = undefined;
    return {
        id,
        cityId: placement.cityId,
        type: getSmallestStreamingFacilityType(placement.racks),
        installedRacks,
        role: placement.role,
        rackGroups: normalizeStreamingRackGroups(undefined, id, installedRacks, placement.role),
        physical: getDefaultStreamingFacilityPhysical(getSmallestStreamingFacilityType(placement.racks), installedRacks, lease),
    };
});

/** Compatibility projection used by the existing deterministic simulations. */
export const aggregateStreamingFacilities = (
    facilities: OwnedStreamingFacility[] | null | undefined,
): OwnedStreamingNetworkPlacement[] => {
    const byCity = new Map<string, OwnedStreamingNetworkPlacement>();
    for (const facility of facilities || []) {
        const groups = normalizeStreamingRackGroups(
            facility.rackGroups,
            facility.id,
            facility.installedRacks,
            facility.role,
        );
        const projectedRole = projectFacilityNetworkRole(groups);
        const existing = byCity.get(facility.cityId);
        if (!existing) {
            byCity.set(facility.cityId, {
                cityId: facility.cityId,
                racks: facility.installedRacks,
                role: projectedRole,
            });
            continue;
        }
        existing.racks += facility.installedRacks;
        if (projectedRole === 'CORE_ORIGIN') existing.role = 'CORE_ORIGIN';
        else if (projectedRole === 'REGIONAL_HUB' && existing.role === 'EDGE_CACHE') existing.role = 'REGIONAL_HUB';
    }
    const placements = Array.from(byCity.values());
    if (placements.length && !placements.some(placement => placement.role === 'CORE_ORIGIN')) {
        placements[0] = { ...placements[0], role: 'CORE_ORIGIN' };
    }
    return placements;
};

export const normalizeStreamingFacilityRole = (
    role: unknown,
    fallback: StreamingNetworkNodeRole,
): StreamingNetworkNodeRole => (
    role === 'CORE_ORIGIN' || role === 'REGIONAL_HUB' || role === 'EDGE_CACHE'
        ? role
        : fallback
);
