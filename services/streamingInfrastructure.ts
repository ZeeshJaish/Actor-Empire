import type {
    OwnedStreamingInfrastructureSetupDraft,
    OwnedStreamingFacility,
    OwnedStreamingLedgerEntry,
    OwnedStreamingNetworkPlacement,
    OwnedStreamingPlatformState,
    Player,
    StreamingCapacityPackageId,
    StreamingInfrastructureRolloutPace,
    StreamingInfrastructureStrategy,
    StreamingLoadTestStatus,
    StreamingSubscriptionTierId,
} from '../types';
import {
    PRODUCTION_LOCATION_CATALOG,
    getProductionLocation,
    getStreamingDataCenterCost,
} from './productionLocations';
import { createDeterministicId } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import {
    compactOwnedStreamingPlatformForPersistence,
    normalizeOwnedStreamingPlatformState,
} from './ownedStreamingPlatform';
import {
    getStreamingReachConfigurationKey,
    resolveOwnedStreamingReach,
} from './streamingProgression';
import {
    getRecommendedStreamingCoreCityIds,
    getStreamingDayOneRegionIds,
    summarizeStreamingDayOneMarkets,
} from './streamingDayOneMarkets';
import {
    aggregateStreamingFacilities,
    getStreamingFacilityContract,
    getStreamingFacilitySetupCost,
    getStreamingFacilityWeeklyRent,
    migratePlacementsToStreamingFacilities,
    normalizeStreamingFacilityLease,
    normalizeStreamingFacilityPhysical,
} from './streamingFacilities';
import { normalizeStreamingInfrastructureManagementPolicy } from './streamingInfrastructureManagement';
import {
    getStreamingFacilityPhysicalView,
    getStreamingNetworkPhysicalSummary,
} from './streamingInfrastructurePhysical';
import {
    finalizeStreamingRackGroupMigrations,
    getStreamingRackDutyRule,
    getProjectedRackDuty,
    normalizeStreamingRackGroups,
    projectFacilityNetworkRole,
} from './streamingRackGroups';

type ConfigurableInfrastructureStrategy = Exclude<StreamingInfrastructureStrategy, 'UNDECIDED'>;
export const STREAMING_INFRASTRUCTURE_SIGNATURE_MODEL = 'streaming-infrastructure-v9-physical-envelope';

const NETWORK_ROLE_RULES = {
    CORE_ORIGIN: { capacity: 1, storage: 1, capex: 1, weekly: 1, label: 'Core origin' },
    REGIONAL_HUB: { capacity: 0.95, storage: 0.62, capex: 0.78, weekly: 0.84, label: 'Regional hub' },
    EDGE_CACHE: { capacity: 0.82, storage: 0.2, capex: 0.48, weekly: 0.62, label: 'Edge cache' },
} as const;
const NETWORK_RACK_BASELINE_STREAMS = 65_000;
const NETWORK_RACK_STORAGE_HOURS = 1_250;
const NETWORK_RACK_CAPEX = 3_750_000;
const NETWORK_RACK_WEEKLY = 90_000;

const sanitizeNetworkPlacements = (
    placements: OwnedStreamingNetworkPlacement[] | null | undefined,
): OwnedStreamingNetworkPlacement[] => {
    const validCities = new Set(PRODUCTION_LOCATION_CATALOG.map(item => item.id));
    const seen = new Set<string>();
    let hasCore = false;
    const sanitized = (placements || []).flatMap((item, index) => {
        const cityId = String(item?.cityId || '').trim().toUpperCase();
        if (!validCities.has(cityId) || seen.has(cityId)) return [];
        seen.add(cityId);
        let role = NETWORK_ROLE_RULES[item.role] ? item.role : index === 0 ? 'CORE_ORIGIN' : 'EDGE_CACHE';
        if (role === 'CORE_ORIGIN') {
            if (hasCore) role = 'REGIONAL_HUB';
            hasCore = true;
        }
        return [{
            cityId,
            racks: Math.max(1, Math.min(96, Math.round(Number(item.racks) || 1))),
            role,
        }];
    }).slice(0, PRODUCTION_LOCATION_CATALOG.length);
    if (sanitized.length && !sanitized.some(item => item.role === 'CORE_ORIGIN')) {
        sanitized[0] = { ...sanitized[0], role: 'CORE_ORIGIN' };
    }
    return sanitized;
};

const networkSignature = (placements: OwnedStreamingNetworkPlacement[]): string => (
    sanitizeNetworkPlacements(placements)
        .map(item => `${item.cityId}.${item.racks}.${item.role}`)
        .sort()
        .join(',') || 'NO-NODES'
);

const sanitizeFacilities = (
    facilities: OwnedStreamingFacility[] | null | undefined,
    fallbackPlacements: OwnedStreamingNetworkPlacement[],
): OwnedStreamingFacility[] => {
    const facilitiesMatchPlacements = Boolean(facilities?.length) && (
        fallbackPlacements.length === 0
        || networkSignature(aggregateStreamingFacilities(facilities)) === networkSignature(fallbackPlacements)
    );
    // Facilities are canonical in current saves. When a legacy caller edits
    // only networkPlacements, rebuild deterministic rooms from that topology
    // instead of silently forecasting the stale facility list.
    const source = facilitiesMatchPlacements
        ? facilities!
        : migratePlacementsToStreamingFacilities(fallbackPlacements);
    const seen = new Set<string>();
    return source.flatMap((facility, index) => {
        const contract = getStreamingFacilityContract(facility.type);
        const lease = normalizeStreamingFacilityLease(facility.lease, facility.type);
        const cityId = String(facility.cityId || '').trim().toUpperCase();
        const id = String(facility.id || `FACILITY-${cityId}-${index + 1}`).trim();
        if (!cityId || !id || seen.has(id)) return [];
        seen.add(id);
        const installedRacks = Math.max(1, Math.min(
            lease?.rackPositions || contract.capacityRacks,
            Math.round(facility.installedRacks || 1),
        ));
        const rackGroups = normalizeStreamingRackGroups(
            facility.rackGroups,
            id,
            installedRacks,
            facility.role,
        );
        return [{
            ...facility,
            id,
            cityId,
            lease,
            installedRacks,
            role: projectFacilityNetworkRole(rackGroups),
            rackGroups,
            physical: normalizeStreamingFacilityPhysical(facility.physical, facility.type, installedRacks, lease),
        }];
    });
};

const facilitySignature = (
    facilities: OwnedStreamingFacility[] | null | undefined,
    placements: OwnedStreamingNetworkPlacement[],
): string => {
    const canonical = sanitizeFacilities(facilities, placements)
        .map(facility => {
            const physical = normalizeStreamingFacilityPhysical(
                facility.physical,
                facility.type,
                facility.installedRacks,
                facility.lease,
            );
            return [
                facility.id,
                facility.cityId,
                facility.type,
                facility.installedRacks,
                facility.role,
                facility.lease?.listingId || 'LEGACY',
                (facility.rackGroups || []).map(group => `${group.id}:${group.rackCount}:${getProjectedRackDuty(group)}:${group.migration?.weeks || 0}`).sort().join('~'),
                physical.powerContractKw,
                physical.backupPowerKw,
                physical.backupPowerMode,
                physical.coolingCapacityKw,
                physical.coolingMode,
                physical.bandwidthMbps,
                physical.burstBandwidthMbps,
                physical.maintenanceConditionPercent,
                physical.powerUpgradeCount,
                physical.coolingUpgradeCount,
                physical.bandwidthUpgradeCount,
                physical.equipmentReplacementCount,
            ].join('.');
        })
        .sort()
        .join(',');
    // Signatures are persisted in old saves with a bounded text field. Hash the
    // canonical physical layout so even very large networks remain reload-safe.
    return createDeterministicId('streaming_facilities', canonical || 'NO-FACILITIES');
};

export const STREAMING_CAPACITY_PACKAGES: Array<{
    id: StreamingCapacityPackageId;
    title: string;
    shortLabel: string;
    description: string;
    baselineConcurrentStreams: number;
    burstConcurrentStreams: number;
    storageCapacityHours: number;
    reliabilityTarget: number;
    upfrontCost: number;
    weeklyOperatingCost: number;
    staffRequired: number;
    baseBuildWeeks: number;
}> = [
    {
        id: 'STARTER',
        title: 'Starter Rack',
        shortLabel: 'Regional opening',
        description: 'A lean first rack that turns the incorporated foundation into a focused regional service.',
        baselineConcurrentStreams: 120_000,
        burstConcurrentStreams: 420_000,
        storageCapacityHours: 2_500,
        reliabilityTarget: 99.7,
        upfrontCost: 7_500_000,
        weeklyOperatingCost: 180_000,
        staffRequired: 3,
        baseBuildWeeks: 3,
    },
    {
        id: 'ESSENTIAL',
        title: 'Essential Grid',
        shortLabel: 'Focused opening',
        description: 'A disciplined opening footprint with limited event-night margin.',
        baselineConcurrentStreams: 300_000,
        burstConcurrentStreams: 600_000,
        storageCapacityHours: 10_000,
        reliabilityTarget: 99.5,
        upfrontCost: 12_000_000,
        weeklyOperatingCost: 450_000,
        staffRequired: 6,
        baseBuildWeeks: 4,
    },
    {
        id: 'GROWTH',
        title: 'Growth Grid',
        shortLabel: 'National scale',
        description: 'Balanced launch capacity with room for a breakout premiere.',
        baselineConcurrentStreams: 1_500_000,
        burstConcurrentStreams: 3_000_000,
        storageCapacityHours: 40_000,
        reliabilityTarget: 99.8,
        upfrontCost: 40_000_000,
        weeklyOperatingCost: 1_300_000,
        staffRequired: 14,
        baseBuildWeeks: 6,
    },
    {
        id: 'PREMIERE',
        title: 'Premiere Grid',
        shortLabel: 'Global event scale',
        description: 'A large international footprint built to absorb major launch spikes.',
        baselineConcurrentStreams: 5_000_000,
        burstConcurrentStreams: 10_000_000,
        storageCapacityHours: 140_000,
        reliabilityTarget: 99.95,
        upfrontCost: 110_000_000,
        weeklyOperatingCost: 3_600_000,
        staffRequired: 30,
        baseBuildWeeks: 9,
    },
];

export const STREAMING_INFRASTRUCTURE_STRATEGIES: Array<{
    id: ConfigurableInfrastructureStrategy;
    title: string;
    description: string;
    strength: string;
    tradeoff: string;
}> = [
    {
        id: 'CLOUD_FIRST',
        title: 'Cloud-first',
        description: 'Rent elastic delivery and scale quickly around premieres.',
        strength: 'Strongest burst capacity • fastest construction',
        tradeoff: 'Highest weekly cost per viewing hour',
    },
    {
        id: 'OWNED_INFRASTRUCTURE',
        title: 'Owned network',
        description: 'Build the core delivery footprint and carry more fixed capacity.',
        strength: 'Lowest weekly operating cost at scale',
        tradeoff: 'Largest capital bill • slower construction',
    },
    {
        id: 'HYBRID',
        title: 'Hybrid network',
        description: 'Own normal traffic and rent temporary premiere bursts.',
        strength: 'Balanced capital, cost and event headroom',
        tradeoff: 'More operational coordination',
    },
];

export const STREAMING_ROLLOUT_PACES: Array<{
    id: StreamingInfrastructureRolloutPace;
    title: string;
    description: string;
    buildLabel: string;
    riskLabel: string;
    consequence: string;
}> = [
    {
        id: 'SAFE',
        title: 'Safe rollout',
        description: 'More rehearsal, redundancy and staged verification.',
        buildLabel: 'Slowest',
        riskLabel: 'Low execution risk',
        consequence: 'Higher setup cost • no starting technical debt',
    },
    {
        id: 'STANDARD',
        title: 'Standard rollout',
        description: 'A normal delivery schedule with balanced testing.',
        buildLabel: 'Balanced',
        riskLabel: 'Managed execution risk',
        consequence: 'Normal setup cost • light starting technical debt',
    },
    {
        id: 'RUSHED',
        title: 'Rushed rollout',
        description: 'Compress construction and accept unresolved engineering pressure.',
        buildLabel: 'Fastest',
        riskLabel: 'High execution risk',
        consequence: 'Rush premium • bugs, burnout and technical debt',
    },
];

export const STREAMING_SUBSCRIPTION_TIERS: Array<{
    id: StreamingSubscriptionTierId;
    title: string;
    audience: string;
    features: string[];
    minPrice: number;
    maxPrice: number;
    recommendedPrice: number;
    expectedMix: number;
}> = [
    {
        id: 'BASIC',
        title: 'Basic',
        audience: 'Solo and value viewers',
        features: ['HD viewing', '1 stream', '3 profiles'],
        minPrice: 3.99,
        maxPrice: 14.99,
        recommendedPrice: 7.99,
        expectedMix: 0.48,
    },
    {
        id: 'PREMIUM',
        title: 'Premium',
        audience: 'Quality-first viewers',
        features: ['4K + premium audio', '2 streams', 'Downloads'],
        minPrice: 7.99,
        maxPrice: 24.99,
        recommendedPrice: 13.99,
        expectedMix: 0.34,
    },
    {
        id: 'FAMILY',
        title: 'Family',
        audience: 'Multi-viewer households',
        features: ['4K viewing', '4 streams', '6 profiles + Kids'],
        minPrice: 11.99,
        maxPrice: 34.99,
        recommendedPrice: 18.99,
        expectedMix: 0.18,
    },
];

const STRATEGY_MODIFIERS: Record<ConfigurableInfrastructureStrategy, {
    baseline: number;
    burst: number;
    upfront: number;
    weekly: number;
    staff: number;
    build: number;
    reliability: number;
}> = {
    CLOUD_FIRST: {
        baseline: 1,
        burst: 1.4,
        upfront: 0.55,
        weekly: 1.5,
        staff: 0.7,
        build: 0.65,
        reliability: -0.05,
    },
    OWNED_INFRASTRUCTURE: {
        baseline: 1.1,
        burst: 0.8,
        upfront: 1.45,
        weekly: 0.65,
        staff: 1.3,
        build: 1.35,
        reliability: 0.03,
    },
    HYBRID: {
        baseline: 1,
        burst: 1.15,
        upfront: 1,
        weekly: 1,
        staff: 1,
        build: 1,
        reliability: 0,
    },
};

const ROLLOUT_MODIFIERS: Record<StreamingInfrastructureRolloutPace, {
    upfront: number;
    build: number;
    reliability: number;
    technicalDebt: number;
}> = {
    SAFE: { upfront: 1.1, build: 1.25, reliability: 0.03, technicalDebt: 0 },
    STANDARD: { upfront: 1, build: 1, reliability: 0, technicalDebt: 4 },
    RUSHED: { upfront: 1.15, build: 0.55, reliability: -0.15, technicalDebt: 14 },
};

const roundMoney = (value: number): number => Math.max(0, Math.round(value / 10_000) * 10_000);
const roundCapacity = (value: number): number => Math.max(0, Math.round(value / 1_000) * 1_000);
const roundPrice = (value: number): number => Math.round(value * 100) / 100;
const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export interface StreamingInfrastructureForecast {
    configurationSignature: string;
    reachConfigurationKey: string;
    reachLevel: 0 | 1 | 2 | 3 | 4;
    reachLabel: string;
    reachDescription: string;
    reachLimitingFactors: string[];
    strategy: ConfigurableInfrastructureStrategy;
    capacityPackageId: StreamingCapacityPackageId;
    rolloutPace: StreamingInfrastructureRolloutPace;
    baselineConcurrentStreams: number;
    burstConcurrentStreams: number;
    storageCapacityHours: number;
    reliabilityTarget: number;
    upfrontCost: number;
    transactionCost: number;
    weeklyOperatingCost: number;
    physicalWeeklyOperatingCost: number;
    physicalUpgradeCapitalCost: number;
    energyKwhWeekly: number;
    waterLitresWeekly: number;
    sustainabilityScore: number;
    publicReputation: number;
    physicalReliabilityPercent: number;
    backupCoveragePercent: number;
    physicalLimitingFactors: string[];
    staffRequired: number;
    buildWeeks: number;
    technicalDebt: number;
    forecastLowConcurrentStreams: number;
    forecastLikelyConcurrentStreams: number;
    forecastHighConcurrentStreams: number;
    headroomPercent: number;
    loadTestStatus: StreamingLoadTestStatus;
    loadTestSummary: string;
    demandDrivers: Array<{ label: string; detail: string }>;
    plannedArpu: number;
    pricingPressurePercent: number;
    pricingPressureLabel: 'VALUE-LED' | 'BALANCED' | 'PREMIUM';
}

export interface StreamingInfrastructureValidationIssue {
    step: number;
    code: 'PRICE_RANGE' | 'PRICE_ORDER' | 'LOAD_TEST_REQUIRED' | 'INSUFFICIENT_TREASURY' | 'INVALID_STATE';
    message: string;
}

export const getStreamingInfrastructureSignature = (
    draft: Pick<OwnedStreamingInfrastructureSetupDraft, 'strategy' | 'capacityPackageId' | 'rolloutPace' | 'networkPlacements' | 'facilities'>,
    reachConfigurationKey = 'reach-model-v1:LEVEL_0',
    demandRange: { low: number; likely: number; high: number } = {
        low: 130_000,
        likely: 200_000,
        high: 320_000,
    },
): string => [
    STREAMING_INFRASTRUCTURE_SIGNATURE_MODEL,
    reachConfigurationKey,
    roundCapacity(demandRange.low),
    roundCapacity(demandRange.likely),
    roundCapacity(demandRange.high),
    draft.strategy,
    draft.capacityPackageId,
    draft.rolloutPace,
    networkSignature(draft.networkPlacements),
    facilitySignature(draft.facilities, draft.networkPlacements),
].join(':');

/**
 * The founding journey chooses markets, never machines. This is the single
 * deterministic hand-off from those markets into Network Build: it proposes a
 * useful opening topology without committing, purchasing or duplicating any
 * infrastructure decision.
 */
export const getSuggestedStreamingNetworkPlacements = (
    marketIds: string[],
    audienceMultiplier = 1,
): OwnedStreamingNetworkPlacement[] => {
    const summary = summarizeStreamingDayOneMarkets(marketIds);
    const regionCount = getStreamingDayOneRegionIds(marketIds).length;
    const cityIds = getRecommendedStreamingCoreCityIds(marketIds, 6);
    const likelyOpeningDemand = summary.streamingAudience * 0.00018 * Math.max(0.25, audienceMultiplier || 1);
    const targetRacks = clamp(
        Math.ceil((likelyOpeningDemand * 1.25) / NETWORK_RACK_BASELINE_STREAMS),
        2,
        10,
    );
    const wantedCities = Math.min(
        cityIds.length,
        Math.max(1, Math.min(regionCount || 1, Math.max(regionCount > 1 ? 2 : 1, Math.ceil(targetRacks / 3)))),
    );
    const placements: OwnedStreamingNetworkPlacement[] = cityIds
        .slice(0, wantedCities)
        .map((cityId, index) => ({
            cityId,
            racks: 1,
            role: index === 0 ? 'CORE_ORIGIN' : 'REGIONAL_HUB',
        }));
    let racksLeft = targetRacks - placements.length;
    let cursor = 0;
    while (racksLeft > 0 && placements.length) {
        placements[cursor % placements.length].racks += 1;
        cursor += 1;
        racksLeft -= 1;
    }
    return sanitizeNetworkPlacements(placements);
};

export const createDefaultStreamingInfrastructureDraft = (
    player: Player,
): OwnedStreamingInfrastructureSetupDraft => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const current = platform.infrastructureSetup;
    const capacityPackageId: StreamingCapacityPackageId = current?.capacityPackageId || 'STARTER';
    const strategy: ConfigurableInfrastructureStrategy = platform.infrastructureStrategy === 'UNDECIDED'
        ? 'HYBRID'
        : platform.infrastructureStrategy;
    const rolloutPace = current?.rolloutPace || 'STANDARD';
    const racks = capacityPackageId === 'STARTER' ? 2
        : capacityPackageId === 'ESSENTIAL' ? 4
            : capacityPackageId === 'GROWTH' ? 7 : 10;
    const canonicalOpeningMarketIds = platform.marketOperations
        .filter(operation => operation.entryKind === 'OPENING' && operation.countryId && operation.status !== 'EXITED')
        .map(operation => operation.countryId!);
    const dayOneMarketIds = canonicalOpeningMarketIds.length
        ? canonicalOpeningMarketIds
        : platform.identity?.dayOneMarketIds || [];
    const suggestedPlacements = getSuggestedStreamingNetworkPlacements(dayOneMarketIds);
    const suggestedCityId = suggestedPlacements[0]?.cityId;
    const launchCityId = current?.networkPlacements?.[0]?.cityId
        || platform.identity?.launchServerCityId
        || suggestedCityId
        || 'LA';
    return {
        currentStep: 0,
        strategy,
        capacityPackageId,
        rolloutPace,
        subscriptionPrices: { ...platform.subscriptionPrices },
        networkPlacements: current?.networkPlacements?.length
            ? current.networkPlacements.map(item => ({ ...item }))
            : dayOneMarketIds.length
                ? suggestedPlacements
                : [{ cityId: launchCityId, racks, role: 'CORE_ORIGIN' }],
        facilities: current?.facilities?.map(facility => ({
            ...facility,
            lease: facility.lease ? { ...facility.lease } : undefined,
            rackGroups: facility.rackGroups?.map(group => ({
                ...group,
                migration: group.migration ? { ...group.migration } : undefined,
            })),
        })),
        managementPolicy: normalizeStreamingInfrastructureManagementPolicy(current?.managementPolicy),
        lastLoadTestSignature: current?.loadTest.configurationSignature || null,
        lastLaunchRehearsal: current?.loadTest.launchRehearsal
            ? {
                ...current.loadTest.launchRehearsal,
                regionalSinglePointFailures: [...current.loadTest.launchRehearsal.regionalSinglePointFailures],
                countries: current.loadTest.launchRehearsal.countries.map(country => ({ ...country })),
                facilities: current.loadTest.launchRehearsal.facilities.map(facility => ({ ...facility })),
            }
            : undefined,
        updatedAtAbsoluteWeek: getAbsoluteWeek(player.age, player.currentWeek),
    };
};

const getConfigurationValues = (
    draft: OwnedStreamingInfrastructureSetupDraft,
): Omit<StreamingInfrastructureForecast,
    | 'configurationSignature'
    | 'reachConfigurationKey'
    | 'reachLevel'
    | 'reachLabel'
    | 'reachDescription'
    | 'reachLimitingFactors'
    | 'transactionCost'
    | 'forecastLowConcurrentStreams'
    | 'forecastLikelyConcurrentStreams'
    | 'forecastHighConcurrentStreams'
    | 'headroomPercent'
    | 'loadTestStatus'
    | 'loadTestSummary'
    | 'demandDrivers'
    | 'plannedArpu'
    | 'pricingPressurePercent'
    | 'pricingPressureLabel'
> => {
    const capacityPackage = STREAMING_CAPACITY_PACKAGES.find(item => item.id === draft.capacityPackageId)
        || STREAMING_CAPACITY_PACKAGES[0];
    const strategy = STRATEGY_MODIFIERS[draft.strategy];
    const rollout = ROLLOUT_MODIFIERS[draft.rolloutPace];
    const facilities = sanitizeFacilities(draft.facilities, draft.networkPlacements);
    const network = facilities.length
        ? sanitizeNetworkPlacements(aggregateStreamingFacilities(facilities))
        : sanitizeNetworkPlacements(draft.networkPlacements);
    if (network.length) {
        const dutyGroups = facilities.flatMap(facility => normalizeStreamingRackGroups(
            facility.rackGroups,
            facility.id,
            facility.installedRacks,
            facility.role,
        ).map(group => {
            const rule = getStreamingRackDutyRule(getProjectedRackDuty(group));
            const migrationMultiplier = 1 - (group.migration?.pressurePercent || 0) / 100;
            return { facility, group, rule, migrationMultiplier };
        }));
        const physicalViews = new Map(facilities.map(facility => [
            facility.id,
            getStreamingFacilityPhysicalView(facility, facility.lease?.electricityRatePerKwh),
        ]));
        const physicalSummary = getStreamingNetworkPhysicalSummary(facilities);
        const rackCount = dutyGroups.length
            ? dutyGroups.reduce((sum, item) => sum + item.group.rackCount, 0)
            : network.reduce((sum, item) => sum + item.racks, 0);
        const baseCapacity = dutyGroups.length
            ? dutyGroups.reduce((sum, item) => (
                sum + item.group.rackCount * NETWORK_RACK_BASELINE_STREAMS
                    * item.rule.capacityMultiplier * item.migrationMultiplier
                    * (physicalViews.get(item.facility.id)?.steadyCapacityFactor ?? 1)
            ), 0)
            : network.reduce((sum, item) => (
                sum + item.racks * NETWORK_RACK_BASELINE_STREAMS * NETWORK_ROLE_RULES[item.role].capacity
            ), 0);
        const burstBaseCapacity = dutyGroups.length
            ? dutyGroups.reduce((sum, item) => (
                sum + item.group.rackCount * NETWORK_RACK_BASELINE_STREAMS
                    * item.rule.capacityMultiplier * item.migrationMultiplier
                    * (physicalViews.get(item.facility.id)?.burstCapacityFactor ?? 1)
            ), 0)
            : baseCapacity;
        const baselineConcurrentStreams = roundCapacity(baseCapacity * strategy.baseline);
        const burstMultiplier = draft.strategy === 'CLOUD_FIRST' ? 1.45
            : draft.strategy === 'HYBRID' ? 1.2 : 1;
        const cityCost = (cityId: string) => {
            const city = getProductionLocation(cityId);
            return city ? getStreamingDataCenterCost(city) / 10_000_000 : 1;
        };
        const facilitySetup = facilities.reduce((sum, facility) => (
            sum + getStreamingFacilitySetupCost(facility) * (facility.lease ? 1 : cityCost(facility.cityId))
        ), 0);
        const facilityWeekly = facilities.reduce((sum, facility) => (
            sum + getStreamingFacilityWeeklyRent(facility) * (facility.lease ? 1 : cityCost(facility.cityId))
        ), 0);
        const rackCapex = dutyGroups.length
            ? dutyGroups.reduce((sum, item) => sum + item.group.rackCount * NETWORK_RACK_CAPEX
                * cityCost(item.facility.cityId) * item.rule.capexMultiplier, 0)
            : network.reduce((sum, item) => (
                sum + item.racks * NETWORK_RACK_CAPEX * cityCost(item.cityId) * NETWORK_ROLE_RULES[item.role].capex
            ), 0);
        const rackWeekly = dutyGroups.length
            ? dutyGroups.reduce((sum, item) => sum + item.group.rackCount * NETWORK_RACK_WEEKLY
                * cityCost(item.facility.cityId) * item.rule.weeklyMultiplier, 0)
            : network.reduce((sum, item) => (
                sum + item.racks * NETWORK_RACK_WEEKLY * cityCost(item.cityId) * NETWORK_ROLE_RULES[item.role].weekly
            ), 0);
        const upfrontCost = roundMoney(
            (rackCapex + facilitySetup) * strategy.upfront * rollout.upfront
            + physicalSummary.upgradeCapitalCost,
        );
        const weeklyOperatingCost = roundMoney(
            (rackWeekly + facilityWeekly) * strategy.weekly
            + physicalSummary.weeklyOperatingCost,
        );
        const distributionBonus = Math.min(0.24, Math.max(0, network.length - 1) * 0.04);
        const biggestCampus = network.reduce((max, item) => Math.max(max, item.racks), 0);
        return {
            strategy: draft.strategy,
            capacityPackageId: draft.capacityPackageId,
            rolloutPace: draft.rolloutPace,
            baselineConcurrentStreams,
            burstConcurrentStreams: roundCapacity(burstBaseCapacity * strategy.baseline * burstMultiplier),
            storageCapacityHours: Math.round(dutyGroups.length
                ? dutyGroups.reduce((sum, item) => sum + item.group.rackCount * NETWORK_RACK_STORAGE_HOURS
                    * Math.max(.16, item.rule.cacheScore / 100), 0)
                : network.reduce((sum, item) => (
                    sum + item.racks * NETWORK_RACK_STORAGE_HOURS * NETWORK_ROLE_RULES[item.role].storage
                ), 0)),
            reliabilityTarget: Math.round(clamp(
                physicalSummary.reliabilityPercent + strategy.reliability + rollout.reliability + distributionBonus,
                90,
                99.999,
            ) * 1_000) / 1_000,
            upfrontCost,
            weeklyOperatingCost,
            physicalWeeklyOperatingCost: physicalSummary.weeklyOperatingCost,
            physicalUpgradeCapitalCost: physicalSummary.upgradeCapitalCost,
            energyKwhWeekly: physicalSummary.energyKwhWeekly,
            waterLitresWeekly: physicalSummary.waterLitresWeekly,
            sustainabilityScore: physicalSummary.sustainabilityScore,
            publicReputation: physicalSummary.publicReputation,
            physicalReliabilityPercent: physicalSummary.reliabilityPercent,
            backupCoveragePercent: physicalSummary.backupCoveragePercent,
            physicalLimitingFactors: physicalSummary.limitingFactors,
            staffRequired: Math.max(2, Math.ceil(rackCount * 1.15 + network.length * 1.5)),
            buildWeeks: Math.max(1, Math.ceil((2 + biggestCampus * 0.28
                + Math.max(0, network.length - 1) * 0.7
                + facilities.reduce((max, facility) => Math.max(max, getStreamingFacilityContract(facility.type).provisioningWeeks), 0) * .35
                + dutyGroups.reduce((max, item) => Math.max(max, item.group.migration?.weeks || 0), 0)
            ) * strategy.build * rollout.build)),
            technicalDebt: rollout.technicalDebt,
        };
    }
    return {
        strategy: draft.strategy,
        capacityPackageId: draft.capacityPackageId,
        rolloutPace: draft.rolloutPace,
        baselineConcurrentStreams: roundCapacity(capacityPackage.baselineConcurrentStreams * strategy.baseline),
        burstConcurrentStreams: roundCapacity(capacityPackage.burstConcurrentStreams * strategy.burst),
        storageCapacityHours: Math.round(capacityPackage.storageCapacityHours),
        reliabilityTarget: Math.round(clamp(
            capacityPackage.reliabilityTarget + strategy.reliability + rollout.reliability,
            98,
            99.999,
        ) * 1_000) / 1_000,
        upfrontCost: roundMoney(capacityPackage.upfrontCost * strategy.upfront * rollout.upfront),
        weeklyOperatingCost: roundMoney(capacityPackage.weeklyOperatingCost * strategy.weekly),
        physicalWeeklyOperatingCost: 0,
        physicalUpgradeCapitalCost: 0,
        energyKwhWeekly: 0,
        waterLitresWeekly: 0,
        sustainabilityScore: 100,
        publicReputation: 100,
        physicalReliabilityPercent: 99.5,
        backupCoveragePercent: 0,
        physicalLimitingFactors: [],
        staffRequired: Math.max(1, Math.ceil(capacityPackage.staffRequired * strategy.staff)),
        buildWeeks: Math.max(1, Math.ceil(capacityPackage.baseBuildWeeks * strategy.build * rollout.build)),
        technicalDebt: rollout.technicalDebt,
    };
};

/** Reuses the founding network model so later owned-campus racks change the same canonical capacity. */
export const getStreamingFacilityNetworkSnapshot = (
    platform: OwnedStreamingPlatformState,
    facilities: OwnedStreamingFacility[],
): Pick<StreamingInfrastructureForecast, 'baselineConcurrentStreams' | 'burstConcurrentStreams' | 'storageCapacityHours' | 'reliabilityTarget' | 'staffRequired'> => {
    const setup = platform.infrastructureSetup;
    if (!setup) return {
        baselineConcurrentStreams: platform.capacity.baselineConcurrentStreams,
        burstConcurrentStreams: platform.capacity.burstConcurrentStreams,
        storageCapacityHours: 0,
        reliabilityTarget: 99,
        staffRequired: 0,
    };
    const configuration = getConfigurationValues({
        currentStep: 0,
        strategy: platform.infrastructureStrategy === 'UNDECIDED' ? 'HYBRID' : platform.infrastructureStrategy,
        capacityPackageId: setup.capacityPackageId,
        rolloutPace: setup.rolloutPace,
        subscriptionPrices: platform.subscriptionPrices,
        networkPlacements: aggregateStreamingFacilities(facilities),
        facilities,
        managementPolicy: setup.managementPolicy,
        lastLoadTestSignature: setup.loadTest.configurationSignature,
        lastLaunchRehearsal: setup.loadTest.launchRehearsal,
        updatedAtAbsoluteWeek: setup.committedAtAbsoluteWeek,
    });
    return {
        baselineConcurrentStreams: configuration.baselineConcurrentStreams,
        burstConcurrentStreams: configuration.burstConcurrentStreams,
        storageCapacityHours: configuration.storageCapacityHours,
        reliabilityTarget: configuration.reliabilityTarget,
        staffRequired: configuration.staffRequired,
    };
};

const getInfrastructureTechnologyFloor = (
    baselineConcurrentStreams: number,
    reliabilityTarget: number,
): { delivery: number; reliability: number } => ({
    delivery: baselineConcurrentStreams >= 5_000_000
        ? 38
        : baselineConcurrentStreams >= 3_000_000
            ? 30
            : baselineConcurrentStreams >= 1_000_000
                ? 20
                : 6,
    reliability: reliabilityTarget >= 99.9
        ? 34
        : reliabilityTarget >= 99.7
            ? 22
            : 10,
});

export const getStreamingInfrastructureForecast = (
    player: Player,
    inputDraft?: OwnedStreamingInfrastructureSetupDraft | null,
): StreamingInfrastructureForecast => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const draft = inputDraft || platform.infrastructureSetupDraft || createDefaultStreamingInfrastructureDraft(player);
    const configuration = getConfigurationValues(draft);
    const technologyFloor = getInfrastructureTechnologyFloor(
        configuration.baselineConcurrentStreams,
        configuration.reliabilityTarget,
    );
    const reach = resolveOwnedStreamingReach({
        ...platform,
        capacity: {
            baselineConcurrentStreams: configuration.baselineConcurrentStreams,
            burstConcurrentStreams: configuration.burstConcurrentStreams,
        },
        technologyLevels: {
            ...platform.technologyLevels,
            DELIVERY_CAPACITY: Math.max(
                platform.technologyLevels.DELIVERY_CAPACITY,
                technologyFloor.delivery,
            ),
            RELIABILITY: Math.max(
                platform.technologyLevels.RELIABILITY,
                technologyFloor.reliability,
            ),
        },
    });
    const reachConfigurationKey = getStreamingReachConfigurationKey(reach);
    const rehearsalDemand = draft.openingDemandForecast;
    const demandRange = rehearsalDemand
        && rehearsalDemand.low >= 0
        && rehearsalDemand.likely >= rehearsalDemand.low
        && rehearsalDemand.high >= rehearsalDemand.likely
        ? rehearsalDemand
        : reach.demandRange;
    const forecastLowConcurrentStreams = roundCapacity(demandRange.low);
    const forecastLikelyConcurrentStreams = roundCapacity(demandRange.likely);
    const forecastHighConcurrentStreams = roundCapacity(demandRange.high);
    const headroomPercent = forecastHighConcurrentStreams > 0
        ? Math.round(((configuration.burstConcurrentStreams - forecastHighConcurrentStreams) / forecastHighConcurrentStreams) * 1_000) / 10
        : 100;
    const loadTestStatus: StreamingLoadTestStatus = headroomPercent < 0
        ? 'FAIL'
        : headroomPercent < 25 || configuration.reliabilityTarget < 99.7
            ? 'CONDITIONAL'
            : 'PASS';
    const loadTestSummary = loadTestStatus === 'PASS'
        ? 'The modeled high-demand case clears with launch-night headroom.'
        : loadTestStatus === 'CONDITIONAL'
            ? 'The likely case clears, but a strong premiere could consume the safety margin.'
            : 'The modeled high-demand case exceeds burst capacity.';
    const plannedArpu = roundPrice(STREAMING_SUBSCRIPTION_TIERS.reduce(
        (sum, tier) => sum + draft.subscriptionPrices[tier.id] * tier.expectedMix,
        0,
    ));
    const recommendedArpu = STREAMING_SUBSCRIPTION_TIERS.reduce(
        (sum, tier) => sum + tier.recommendedPrice * tier.expectedMix,
        0,
    );
    const pricingPressurePercent = Math.round(((plannedArpu / recommendedArpu) - 1) * 100);
    const pricingPressureLabel = pricingPressurePercent <= -8
        ? 'VALUE-LED'
        : pricingPressurePercent >= 10
            ? 'PREMIUM'
            : 'BALANCED';
    const existing = platform.infrastructureSetup;
    const sameInfrastructure = Boolean(
        existing
        && platform.infrastructureStrategy === draft.strategy
        && existing.capacityPackageId === draft.capacityPackageId
        && existing.rolloutPace === draft.rolloutPace
        && networkSignature(existing.networkPlacements) === networkSignature(draft.networkPlacements)
        && facilitySignature(existing.facilities, existing.networkPlacements)
            === facilitySignature(draft.facilities, draft.networkPlacements)
    );
    const currentConfiguration = existing ? getConfigurationValues({
        ...draft,
        strategy: platform.infrastructureStrategy === 'UNDECIDED' ? draft.strategy : platform.infrastructureStrategy,
        capacityPackageId: existing.capacityPackageId,
        rolloutPace: existing.rolloutPace,
        networkPlacements: existing.networkPlacements,
        facilities: existing.facilities,
    }) : null;
    const transactionCost = !existing
        ? configuration.upfrontCost
        : sameInfrastructure
            ? 0
            : roundMoney(Math.max(
                configuration.upfrontCost - (currentConfiguration?.upfrontCost || 0),
                configuration.upfrontCost * 0.12,
            ));

    return {
        configurationSignature: getStreamingInfrastructureSignature(
            draft,
            reachConfigurationKey,
            demandRange,
        ),
        reachConfigurationKey,
        reachLevel: reach.level,
        reachLabel: reach.label,
        reachDescription: reach.description,
        reachLimitingFactors: [...reach.limitingFactors],
        ...configuration,
        transactionCost,
        forecastLowConcurrentStreams,
        forecastLikelyConcurrentStreams,
        forecastHighConcurrentStreams,
        headroomPercent,
        loadTestStatus,
        loadTestSummary,
        demandDrivers: [
            {
                label: rehearsalDemand ? 'Day-One market demand' : reach.label,
                detail: rehearsalDemand
                    ? `The selected opening countries and launch campaign create a modeled range of ${forecastLowConcurrentStreams.toLocaleString()}–${forecastHighConcurrentStreams.toLocaleString()} simultaneous viewers.`
                    : `${reach.description} The modeled range is ${forecastLowConcurrentStreams.toLocaleString()}–${forecastHighConcurrentStreams.toLocaleString()} simultaneous viewers.`,
            },
            {
                label: 'Current operating evidence',
                detail: reach.evidence.length > 0
                    ? reach.evidence.join(' • ')
                    : 'The platform is using the incorporated foundation footprint.',
            },
            {
                label: reach.limitingFactors.length > 0 ? 'Next reach threshold' : 'Reach ceiling cleared',
                detail: reach.limitingFactors[0]
                    || 'The current stack has cleared all modeled reach thresholds.',
            },
            {
                label: 'Burst architecture',
                detail: `${STREAMING_INFRASTRUCTURE_STRATEGIES.find(item => item.id === draft.strategy)?.title || 'Selected architecture'} supplies ${configuration.burstConcurrentStreams.toLocaleString()} modeled peak streams.`,
            },
            {
                label: configuration.physicalLimitingFactors.length ? 'Physical constraint' : 'Physical envelope',
                detail: configuration.physicalLimitingFactors.length
                    ? `${configuration.physicalLimitingFactors.join(' • ')}. The forecast is already reduced to the capacity the utilities can actually support.`
                    : `Power, cooling and fibre clear the planned workload with ${configuration.backupCoveragePercent}% backup-power coverage.`,
            },
            {
                label: `${sanitizeNetworkPlacements(draft.networkPlacements).length} network ${sanitizeNetworkPlacements(draft.networkPlacements).length === 1 ? 'city' : 'cities'}`,
                detail: sanitizeNetworkPlacements(draft.networkPlacements).map(item => {
                    const city = getProductionLocation(item.cityId);
                    return `${city?.name || item.cityId} · ${NETWORK_ROLE_RULES[item.role].label} · ${item.racks} racks`;
                }).join(' • '),
            },
        ],
        plannedArpu,
        pricingPressurePercent,
        pricingPressureLabel,
    };
};

export const validateStreamingInfrastructureDraft = (
    player: Player,
    inputDraft?: OwnedStreamingInfrastructureSetupDraft | null,
): { valid: boolean; issues: StreamingInfrastructureValidationIssue[]; forecast: StreamingInfrastructureForecast } => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const draft = inputDraft || platform.infrastructureSetupDraft || createDefaultStreamingInfrastructureDraft(player);
    const forecast = getStreamingInfrastructureForecast(player, draft);
    const issues: StreamingInfrastructureValidationIssue[] = [];
    const sameInfrastructure = Boolean(
        platform.infrastructureSetup
        && platform.infrastructureStrategy === draft.strategy
        && platform.infrastructureSetup.capacityPackageId === draft.capacityPackageId
        && platform.infrastructureSetup.rolloutPace === draft.rolloutPace
        && networkSignature(platform.infrastructureSetup.networkPlacements) === networkSignature(draft.networkPlacements)
        && facilitySignature(platform.infrastructureSetup.facilities, platform.infrastructureSetup.networkPlacements)
            === facilitySignature(draft.facilities, draft.networkPlacements)
    );
    if (!['FOUNDING', 'ACTIVE'].includes(platform.lifecycle) || !platform.identity || !platform.foundingProfile) {
        issues.push({ step: 0, code: 'INVALID_STATE', message: 'Infrastructure setup is available after incorporation.' });
    }
    STREAMING_SUBSCRIPTION_TIERS.forEach(tier => {
        const price = draft.subscriptionPrices[tier.id];
        if (!Number.isFinite(price) || price < tier.minPrice || price > tier.maxPrice) {
            issues.push({
                step: 3,
                code: 'PRICE_RANGE',
                message: `${tier.title} must be priced between $${tier.minPrice.toFixed(2)} and $${tier.maxPrice.toFixed(2)}.`,
            });
        }
    });
    if (
        draft.subscriptionPrices.PREMIUM < draft.subscriptionPrices.BASIC + 2
        || draft.subscriptionPrices.FAMILY < draft.subscriptionPrices.PREMIUM + 3
    ) {
        issues.push({
            step: 3,
            code: 'PRICE_ORDER',
            message: 'Keep at least $2 between Basic and Premium, and $3 between Premium and Family.',
        });
    }
    if (!sameInfrastructure && draft.lastLoadTestSignature !== forecast.configurationSignature) {
        issues.push({
            step: 2,
            code: 'LOAD_TEST_REQUIRED',
            message: 'Run the load test for this exact infrastructure and rollout configuration.',
        });
    }
    if (platform.treasuryCash < forecast.transactionCost) {
        issues.push({
            step: 4,
            code: 'INSUFFICIENT_TREASURY',
            message: `Company treasury needs ${forecast.transactionCost.toLocaleString()} for this setup.`,
        });
    }
    return { valid: issues.length === 0, issues, forecast };
};

export const saveStreamingInfrastructureDraft = (
    player: Player,
    inputDraft: OwnedStreamingInfrastructureSetupDraft,
): Player => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (!['FOUNDING', 'ACTIVE'].includes(platform.lifecycle) || !platform.identity || !platform.foundingProfile) return player;
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const defaults = createDefaultStreamingInfrastructureDraft(player);
    const draft: OwnedStreamingInfrastructureSetupDraft = {
        currentStep: Math.max(0, Math.min(4, Math.round(Number(inputDraft.currentStep) || 0))),
        strategy: ['CLOUD_FIRST', 'OWNED_INFRASTRUCTURE', 'HYBRID'].includes(inputDraft.strategy)
            ? inputDraft.strategy
            : defaults.strategy,
        capacityPackageId: STREAMING_CAPACITY_PACKAGES.some(item => item.id === inputDraft.capacityPackageId)
            ? inputDraft.capacityPackageId
            : defaults.capacityPackageId,
        rolloutPace: STREAMING_ROLLOUT_PACES.some(item => item.id === inputDraft.rolloutPace)
            ? inputDraft.rolloutPace
            : defaults.rolloutPace,
        subscriptionPrices: Object.fromEntries(STREAMING_SUBSCRIPTION_TIERS.map(tier => [
            tier.id,
            roundPrice(Number(inputDraft.subscriptionPrices[tier.id])),
        ])) as Record<StreamingSubscriptionTierId, number>,
        networkPlacements: sanitizeNetworkPlacements(inputDraft.networkPlacements),
        facilities: sanitizeFacilities(inputDraft.facilities, inputDraft.networkPlacements),
        managementPolicy: normalizeStreamingInfrastructureManagementPolicy(inputDraft.managementPolicy),
        openingDemandForecast: inputDraft.openingDemandForecast
            ? {
                low: roundCapacity(Number(inputDraft.openingDemandForecast.low) || 0),
                likely: roundCapacity(Number(inputDraft.openingDemandForecast.likely) || 0),
                high: roundCapacity(Number(inputDraft.openingDemandForecast.high) || 0),
            }
            : undefined,
        lastLoadTestSignature: inputDraft.lastLoadTestSignature || null,
        lastLaunchRehearsal: inputDraft.lastLaunchRehearsal
            ? {
                ...inputDraft.lastLaunchRehearsal,
                regionalSinglePointFailures: [...inputDraft.lastLaunchRehearsal.regionalSinglePointFailures],
                countries: inputDraft.lastLaunchRehearsal.countries.map(country => ({ ...country })),
                facilities: inputDraft.lastLaunchRehearsal.facilities.map(facility => ({ ...facility })),
            }
            : undefined,
        updatedAtAbsoluteWeek: absoluteWeek,
    };
    return {
        ...player,
        ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
            ...platform,
            infrastructureSetupDraft: draft,
        }, player.id),
    };
};

export const runStreamingInfrastructureLoadTest = (
    player: Player,
    inputDraft?: OwnedStreamingInfrastructureSetupDraft | null,
): { changed: boolean; player: Player; forecast: StreamingInfrastructureForecast } => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const draft = inputDraft || platform.infrastructureSetupDraft || createDefaultStreamingInfrastructureDraft(player);
    const forecast = getStreamingInfrastructureForecast(player, draft);
    if (!['FOUNDING', 'ACTIVE'].includes(platform.lifecycle)) return { changed: false, player, forecast };
    if (draft.lastLoadTestSignature === forecast.configurationSignature) return { changed: false, player, forecast };
    const savedPlayer = saveStreamingInfrastructureDraft(player, {
        ...draft,
        lastLoadTestSignature: forecast.configurationSignature,
    });
    // Saving normalizes legacy facilities into explicit rack groups. Re-read
    // that canonical draft so the persisted signature and the returned
    // rehearsal can never disagree after migration.
    const normalizedDraft = savedPlayer.ownedStreamingPlatform.infrastructureSetupDraft || draft;
    const normalizedForecast = getStreamingInfrastructureForecast(savedPlayer, normalizedDraft);
    const canonicalPlayer = normalizedForecast.configurationSignature === normalizedDraft.lastLoadTestSignature
        ? savedPlayer
        : saveStreamingInfrastructureDraft(savedPlayer, {
            ...normalizedDraft,
            lastLoadTestSignature: normalizedForecast.configurationSignature,
        });
    return {
        changed: true,
        player: canonicalPlayer,
        forecast: normalizedForecast,
    };
};

export interface CommitStreamingInfrastructureResult {
    changed: boolean;
    reason: 'COMMITTED' | 'ALREADY_CONFIGURED' | 'INVALID_DRAFT' | 'INSUFFICIENT_TREASURY';
    player: Player;
    issues: StreamingInfrastructureValidationIssue[];
    forecast: StreamingInfrastructureForecast;
}

export const commitStreamingInfrastructureSetup = (
    player: Player,
    inputDraft?: OwnedStreamingInfrastructureSetupDraft | null,
): CommitStreamingInfrastructureResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const draft = inputDraft || platform.infrastructureSetupDraft || createDefaultStreamingInfrastructureDraft(player);
    const samePrices = STREAMING_SUBSCRIPTION_TIERS.every(tier => (
        platform.subscriptionPrices[tier.id] === draft.subscriptionPrices[tier.id]
    ));
    const sameInfrastructure = Boolean(
        platform.infrastructureSetup
        && platform.infrastructureStrategy === draft.strategy
        && platform.infrastructureSetup.capacityPackageId === draft.capacityPackageId
        && platform.infrastructureSetup.rolloutPace === draft.rolloutPace
        && networkSignature(platform.infrastructureSetup.networkPlacements) === networkSignature(draft.networkPlacements)
        && facilitySignature(platform.infrastructureSetup.facilities, platform.infrastructureSetup.networkPlacements)
            === facilitySignature(draft.facilities, draft.networkPlacements)
    );
    const currentForecast = getStreamingInfrastructureForecast(player, draft);
    const sameRehearsal = Boolean(
        platform.infrastructureSetup
        && platform.infrastructureSetup.loadTest.configurationSignature === currentForecast.configurationSignature
    );
    if (sameInfrastructure && samePrices && sameRehearsal) {
        const forecast = currentForecast;
        return { changed: false, reason: 'ALREADY_CONFIGURED', player, issues: [], forecast };
    }
    const validation = validateStreamingInfrastructureDraft(player, draft);
    const { forecast } = validation;
    if (!validation.valid) {
        return {
            changed: false,
            reason: validation.issues.some(issue => issue.code === 'INSUFFICIENT_TREASURY')
                ? 'INSUFFICIENT_TREASURY'
                : 'INVALID_DRAFT',
            player,
            issues: validation.issues,
            forecast,
        };
    }
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const existingSetup = platform.infrastructureSetup;
    const readyAtAbsoluteWeek = sameInfrastructure && existingSetup
        ? existingSetup.readyAtAbsoluteWeek
        : absoluteWeek + forecast.buildWeeks;
    const loadTest = sameInfrastructure && existingSetup && sameRehearsal
        ? existingSetup.loadTest
        : {
            configurationSignature: forecast.configurationSignature,
            forecastLowConcurrentStreams: forecast.forecastLowConcurrentStreams,
            forecastLikelyConcurrentStreams: forecast.forecastLikelyConcurrentStreams,
            forecastHighConcurrentStreams: forecast.forecastHighConcurrentStreams,
            testedBurstCapacity: forecast.burstConcurrentStreams,
            headroomPercent: forecast.headroomPercent,
            status: forecast.loadTestStatus,
            driverKeys: forecast.demandDrivers.map(driver => driver.label),
            launchRehearsal: draft.lastLaunchRehearsal?.configurationSignature === forecast.configurationSignature
                ? draft.lastLaunchRehearsal
                : undefined,
            completedAtAbsoluteWeek: absoluteWeek,
        };
    const revision = (existingSetup?.revision || 0) + 1;
    const ledgerKey = [
        'infrastructure',
        platform.identity?.slug || player.id,
        revision,
        forecast.configurationSignature,
        draft.subscriptionPrices.BASIC,
        draft.subscriptionPrices.PREMIUM,
        draft.subscriptionPrices.FAMILY,
    ].join(':');
    const ledgerEntry: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, ledgerKey),
        idempotencyKey: ledgerKey,
        absoluteWeek,
        type: 'INFRASTRUCTURE_COMMITTED',
        summary: revision === 1
            ? `${platform.identity?.name || 'EMPIRE+'} launch infrastructure and subscription plans approved.`
            : `${platform.identity?.name || 'EMPIRE+'} infrastructure change order ${revision} approved.`,
        source: 'PLAYER_ACTION',
        metadata: {
            strategy: draft.strategy,
            capacityPackageId: draft.capacityPackageId,
            rolloutPace: draft.rolloutPace,
            transactionCost: forecast.transactionCost,
            weeklyOperatingCost: forecast.weeklyOperatingCost,
            readyAtAbsoluteWeek,
            loadTestStatus: forecast.loadTestStatus,
        },
    };
    const technologyFloor = getInfrastructureTechnologyFloor(
        forecast.baselineConcurrentStreams,
        forecast.reliabilityTarget,
    );
    const committedFacilities = sanitizeFacilities(draft.facilities, draft.networkPlacements)
        .map(finalizeStreamingRackGroupMigrations);
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        infrastructureStrategy: draft.strategy,
        infrastructureSetupDraft: null,
        infrastructureSetup: {
            capacityPackageId: draft.capacityPackageId,
            rolloutPace: draft.rolloutPace,
            storageCapacityHours: forecast.storageCapacityHours,
            reliabilityTarget: forecast.reliabilityTarget,
            weeklyOperatingCost: forecast.weeklyOperatingCost,
            staffRequired: forecast.staffRequired,
            capitalInvested: (existingSetup?.capitalInvested || 0) + forecast.transactionCost,
            technicalDebt: sameInfrastructure && existingSetup
                ? existingSetup.technicalDebt
                : (existingSetup?.technicalDebt || 0) + forecast.technicalDebt,
            networkPlacements: aggregateStreamingFacilities(committedFacilities),
            facilities: committedFacilities,
            managementPolicy: normalizeStreamingInfrastructureManagementPolicy(draft.managementPolicy),
            physicalSummary: {
                energyKwhWeekly: forecast.energyKwhWeekly,
                waterLitresWeekly: forecast.waterLitresWeekly,
                physicalWeeklyOperatingCost: forecast.physicalWeeklyOperatingCost,
                sustainabilityScore: forecast.sustainabilityScore,
                publicReputation: forecast.publicReputation,
                reliabilityPercent: forecast.physicalReliabilityPercent,
                backupCoveragePercent: forecast.backupCoveragePercent,
                limitingFactors: [...forecast.physicalLimitingFactors],
            },
            readyAtAbsoluteWeek,
            revision,
            committedAtAbsoluteWeek: absoluteWeek,
            loadTest,
        },
        subscriptionPrices: { ...draft.subscriptionPrices },
        capacity: {
            baselineConcurrentStreams: forecast.baselineConcurrentStreams,
            burstConcurrentStreams: forecast.burstConcurrentStreams,
        },
        technologyLevels: {
            ...platform.technologyLevels,
            DELIVERY_CAPACITY: Math.max(platform.technologyLevels.DELIVERY_CAPACITY, technologyFloor.delivery),
            RELIABILITY: Math.max(platform.technologyLevels.RELIABILITY, technologyFloor.reliability),
        },
        treasuryCash: platform.treasuryCash - forecast.transactionCost,
        milestoneKeys: Array.from(new Set([
            ...platform.milestoneKeys,
            'infrastructure-and-plans-configured',
        ])),
        eventLedger: [...platform.eventLedger, ledgerEntry],
    }, player.id);
    return {
        changed: true,
        reason: 'COMMITTED',
        issues: [],
        forecast,
        player: {
            ...player,
            ownedStreamingPlatform: nextPlatform,
        },
    };
};
