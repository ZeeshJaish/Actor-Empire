import type {
    OwnedStreamingFacility,
    OwnedStreamingFacilityPhysicalState,
    StreamingRackDuty,
} from '../types';
import {
    getStreamingFacilityCapacity,
    getStreamingFacilityContract,
    normalizeStreamingFacilityPhysical,
} from './streamingFacilities';
import {
    getProjectedRackDuty,
    getStreamingRackDutyRule,
    normalizeStreamingRackGroups,
} from './streamingRackGroups';

export type StreamingFacilityRepairAction = 'UPGRADE_POWER' | 'IMPROVE_COOLING' | 'ADD_BANDWIDTH' | 'REPLACE_EQUIPMENT';

export interface StreamingFacilityPhysicalView {
    state: OwnedStreamingFacilityPhysicalState;
    rackSpaceUsed: number;
    rackSpaceAvailable: number;
    powerUsedKw: number;
    coolingUsedKw: number;
    bandwidthUsedMbps: number;
    /** Sustained workload available after power, cooling, fibre and condition. */
    steadyCapacityFactor: number;
    /** Premiere-night workload available when the burst fibre contract is used. */
    burstCapacityFactor: number;
    usableCapacityFactor: number;
    limitingFactor: 'RACK_SPACE' | 'POWER' | 'COOLING' | 'BANDWIDTH' | 'MAINTENANCE' | 'NONE';
    reliabilityPercent: number;
    backupCoveragePercent: number;
    energyKwhWeekly: number;
    waterLitresWeekly: number;
    weeklyElectricityCost: number;
    weeklyWaterCost: number;
    weeklyMaintenanceCost: number;
    weeklyOperatingCost: number;
    sustainabilityScore: number;
    publicReputation: number;
    repairActions: Array<{ id: StreamingFacilityRepairAction; label: string; cost: number; detail: string }>;
}

export interface StreamingNetworkPhysicalSummary {
    energyKwhWeekly: number;
    waterLitresWeekly: number;
    weeklyOperatingCost: number;
    upgradeCapitalCost: number;
    sustainabilityScore: number;
    publicReputation: number;
    reliabilityPercent: number;
    backupCoveragePercent: number;
    limitingFactors: string[];
}

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const roundMoney = (value: number): number => Math.max(0, Math.round(value / 1_000) * 1_000);

const dutyPowerMultiplier: Record<StreamingRackDuty, number> = {
    CONTENT_ORIGIN: 1.15,
    REGIONAL_CACHE: .96,
    LOCAL_EDGE: .82,
    ENCODING: 1.24,
    PLATFORM_SERVICES: .9,
    LIVE_EVENT: 1.36,
    SPECIALIZED: 1.28,
};

const dutyBandwidthMultiplier: Record<StreamingRackDuty, number> = {
    CONTENT_ORIGIN: 1.3,
    REGIONAL_CACHE: 1.08,
    LOCAL_EDGE: .92,
    ENCODING: .62,
    PLATFORM_SERVICES: .7,
    LIVE_EVENT: 1.5,
    SPECIALIZED: 1.22,
};

const coolingModeFactor: Record<OwnedStreamingFacilityPhysicalState['coolingMode'], number> = {
    AIR: 1,
    DIRECT_LIQUID: .84,
    IMMERSION: .68,
};

const backupReliabilityBonus: Record<OwnedStreamingFacilityPhysicalState['backupPowerMode'], number> = {
    NONE: 0,
    UPS: .05,
    GENERATOR: .14,
    N_PLUS_ONE: .26,
};

const dutyWorkload = (facility: OwnedStreamingFacility) => normalizeStreamingRackGroups(
    facility.rackGroups,
    facility.id,
    facility.installedRacks,
    facility.role,
);

export const getStreamingFacilityPhysicalView = (
    facility: OwnedStreamingFacility,
    electricityRatePerKwh = facility.lease?.electricityRatePerKwh ?? .14,
): StreamingFacilityPhysicalView => {
    const state = normalizeStreamingFacilityPhysical(
        facility.physical,
        facility.type,
        facility.installedRacks,
        facility.lease,
    );
    const contract = getStreamingFacilityContract(facility.type);
    const groups = dutyWorkload(facility);
    const powerUsedKw = groups.reduce((sum, group) => sum + group.rackCount * 12 * dutyPowerMultiplier[getProjectedRackDuty(group)], 0);
    const coolingUsedKw = groups.reduce((sum, group) => sum + group.rackCount * contract.coolingKwPerRack, 0);
    const bandwidthUsedMbps = groups.reduce((sum, group) => sum + group.rackCount * 2_000 * dutyBandwidthMultiplier[getProjectedRackDuty(group)], 0);
    const capacityRacks = getStreamingFacilityCapacity(facility);
    const steadyRatios = [
        // Installed racks already define the logical workload capacity. Rack
        // space becomes a hard stop when the room is full (the UI then offers
        // another lease); it must not make a one-rack room look like it can
        // only serve one-eighth of that rack's workload.
        { key: 'RACK_SPACE' as const, value: capacityRacks / Math.max(1, facility.installedRacks) },
        { key: 'POWER' as const, value: state.powerContractKw / Math.max(1, powerUsedKw) },
        { key: 'COOLING' as const, value: state.coolingCapacityKw / Math.max(1, coolingUsedKw) },
        { key: 'BANDWIDTH' as const, value: state.bandwidthMbps / Math.max(1, bandwidthUsedMbps) },
    ];
    const burstRatios = steadyRatios.map(item => item.key === 'BANDWIDTH'
        ? { ...item, value: state.burstBandwidthMbps / Math.max(1, bandwidthUsedMbps) }
        : item);
    const lowest = steadyRatios.reduce((winner, item) => item.value < winner.value ? item : winner, steadyRatios[0]);
    const burstLowest = burstRatios.reduce((winner, item) => item.value < winner.value ? item : winner, burstRatios[0]);
    // Healthy facilities deliver the envelope they advertise. Condition only
    // becomes a capacity constraint once it drops below the 90% service bar.
    const conditionFactor = clamp(state.maintenanceConditionPercent / 90, .7, 1);
    const steadyCapacityFactor = clamp(Math.min(1, lowest.value) * conditionFactor, 0, 1);
    const burstCapacityFactor = clamp(Math.min(1, burstLowest.value) * conditionFactor, 0, 1);
    const conditionPenalty = Math.max(0, 92 - state.maintenanceConditionPercent) * .018;
    const overloadPenalty = Math.max(0, 1 - Math.min(1, lowest.value)) * 1.9;
    // Legacy/canonical city contracts historically modelled 99.62% before
    // architecture and distribution bonuses. Preserve that baseline while
    // letting explicit marketplace leases carry their own advertised SLA.
    const baseReliability = facility.lease?.reliabilityPercent ?? 99.62;
    const backupCoveragePercent = Math.round(clamp(
        state.backupPowerKw / Math.max(1, powerUsedKw),
        0,
        1,
    ) * 1_000) / 10;
    const reliabilityPercent = Math.round(clamp(
        baseReliability
            + backupReliabilityBonus[state.backupPowerMode] * (backupCoveragePercent / 100)
            - conditionPenalty
            - overloadPenalty,
        90,
        99.999,
    ) * 1_000) / 1_000;
    const energyKwhWeekly = Math.round(powerUsedKw * 168 * coolingModeFactor[state.coolingMode]);
    const waterLitresWeekly = Math.round(energyKwhWeekly * (state.coolingMode === 'AIR' ? 1.1 : state.coolingMode === 'DIRECT_LIQUID' ? .62 : .28));
    const weeklyElectricityCost = roundMoney(energyKwhWeekly * electricityRatePerKwh);
    const weeklyWaterCost = roundMoney(waterLitresWeekly * .0018);
    const weeklyMaintenanceCost = roundMoney(
        facility.installedRacks * 7_500
        + (100 - state.maintenanceConditionPercent) * 2_800
        + (state.backupPowerMode === 'N_PLUS_ONE' ? 18_000 : state.backupPowerMode === 'GENERATOR' ? 11_000 : 5_000),
    );
    const weeklyOperatingCost = weeklyElectricityCost + weeklyWaterCost + weeklyMaintenanceCost;
    const sustainabilityScore = Math.round(clamp(
        100 - energyKwhWeekly / Math.max(1, facility.installedRacks * 1_050)
            - waterLitresWeekly / Math.max(1, facility.installedRacks * 2_400)
            + (state.coolingMode === 'IMMERSION' ? 12 : state.coolingMode === 'DIRECT_LIQUID' ? 6 : 0),
        0,
        100,
    ));
    const publicReputation = Math.round(clamp(reliabilityPercent * .7 + sustainabilityScore * .3, 0, 100));
    const repairActions: StreamingFacilityPhysicalView['repairActions'] = [];
    if (lowest.key === 'POWER' || state.powerContractKw < powerUsedKw * 1.2) {
        repairActions.push({ id: 'UPGRADE_POWER', label: 'Upgrade Power', cost: 1_200_000, detail: '+24kW contracted grid capacity and stronger backup reserve.' });
    }
    if (lowest.key === 'COOLING' || state.coolingCapacityKw < coolingUsedKw * 1.2) {
        repairActions.push({ id: 'IMPROVE_COOLING', label: 'Improve Cooling', cost: 1_050_000, detail: '+24kW heat-removal capacity and lower thermal pressure.' });
    }
    if (lowest.key === 'BANDWIDTH' || state.bandwidthMbps < bandwidthUsedMbps * 1.2) {
        repairActions.push({ id: 'ADD_BANDWIDTH', label: 'Add Bandwidth', cost: 900_000, detail: '+2,400Mbps committed fibre and +3,000Mbps burst.' });
    }
    if (state.maintenanceConditionPercent < 86 || lowest.value < .75) {
        repairActions.push({ id: 'REPLACE_EQUIPMENT', label: 'Replace Failing Equipment', cost: 650_000, detail: 'Restore condition to 98% and remove the maintenance penalty.' });
    }
    return {
        state,
        rackSpaceUsed: facility.installedRacks,
        rackSpaceAvailable: capacityRacks,
        powerUsedKw: Math.round(powerUsedKw * 10) / 10,
        coolingUsedKw: Math.round(coolingUsedKw * 10) / 10,
        bandwidthUsedMbps: Math.round(bandwidthUsedMbps),
        steadyCapacityFactor: Math.round(steadyCapacityFactor * 10_000) / 10_000,
        burstCapacityFactor: Math.round(burstCapacityFactor * 10_000) / 10_000,
        usableCapacityFactor: Math.round(steadyCapacityFactor * 1000) / 10,
        limitingFactor: lowest.value < .999 ? lowest.key : state.maintenanceConditionPercent < 86 ? 'MAINTENANCE' : 'NONE',
        reliabilityPercent,
        backupCoveragePercent,
        energyKwhWeekly,
        waterLitresWeekly,
        weeklyElectricityCost,
        weeklyWaterCost,
        weeklyMaintenanceCost,
        weeklyOperatingCost,
        sustainabilityScore,
        publicReputation,
        repairActions,
    };
};

export const getStreamingNetworkPhysicalSummary = (
    facilities: OwnedStreamingFacility[],
): StreamingNetworkPhysicalSummary => {
    const views = facilities.map(facility => ({
        facility,
        view: getStreamingFacilityPhysicalView(facility, facility.lease?.electricityRatePerKwh),
    }));
    const totalRacks = views.reduce((sum, item) => sum + item.facility.installedRacks, 0);
    const weighted = (read: (view: StreamingFacilityPhysicalView) => number, fallback: number) => totalRacks > 0
        ? views.reduce((sum, item) => sum + read(item.view) * item.facility.installedRacks, 0) / totalRacks
        : fallback;
    return {
        energyKwhWeekly: views.reduce((sum, item) => sum + item.view.energyKwhWeekly, 0),
        waterLitresWeekly: views.reduce((sum, item) => sum + item.view.waterLitresWeekly, 0),
        weeklyOperatingCost: views.reduce((sum, item) => sum + item.view.weeklyOperatingCost, 0),
        upgradeCapitalCost: facilities.reduce((sum, facility) => sum + getStreamingFacilityPhysicalUpgradeCost(facility), 0),
        sustainabilityScore: Math.round(weighted(view => view.sustainabilityScore, 100)),
        publicReputation: Math.round(weighted(view => view.publicReputation, 100)),
        reliabilityPercent: Math.round(weighted(view => view.reliabilityPercent, 99.5) * 1_000) / 1_000,
        backupCoveragePercent: Math.round(weighted(view => view.backupCoveragePercent, 0) * 10) / 10,
        limitingFactors: Array.from(new Set(views
            .filter(item => item.view.limitingFactor !== 'NONE')
            .map(item => `${item.facility.cityId}: ${item.view.limitingFactor.replace('_', ' ')}`))),
    };
};

export const applyStreamingFacilityRepair = (
    facility: OwnedStreamingFacility,
    action: StreamingFacilityRepairAction,
    absoluteWeek: number,
): { facility: OwnedStreamingFacility; cost: number; summary: string } => {
    const current = normalizeStreamingFacilityPhysical(facility.physical, facility.type, facility.installedRacks, facility.lease);
    const next: OwnedStreamingFacilityPhysicalState = { ...current, lastMaintenanceAbsoluteWeek: Math.max(0, absoluteWeek) };
    let cost = 0;
    let summary = '';
    if (action === 'UPGRADE_POWER') {
        next.powerContractKw += 24;
        next.backupPowerKw += 12;
        next.backupPowerMode = next.backupPowerMode === 'NONE' ? 'UPS' : next.backupPowerMode;
        next.powerUpgradeCount += 1;
        cost = 1_200_000;
        summary = 'Power contract expanded by 24kW with a larger backup reserve.';
    } else if (action === 'IMPROVE_COOLING') {
        next.coolingCapacityKw += 24;
        next.coolingMode = next.coolingMode === 'AIR' ? 'DIRECT_LIQUID' : 'IMMERSION';
        next.coolingUpgradeCount += 1;
        cost = 1_050_000;
        summary = 'Cooling upgraded with 24kW more heat-removal capacity.';
    } else if (action === 'ADD_BANDWIDTH') {
        next.bandwidthMbps += 2_400;
        next.burstBandwidthMbps += 3_000;
        next.bandwidthUpgradeCount += 1;
        cost = 900_000;
        summary = 'Fibre contract expanded with committed and burst bandwidth.';
    } else {
        next.maintenanceConditionPercent = 98;
        next.equipmentReplacementCount += 1;
        cost = 650_000;
        summary = 'Failing equipment replaced; maintenance condition restored to 98%.';
    }
    return { facility: { ...facility, physical: next }, cost, summary };
};

export const getStreamingFacilityPhysicalUpgradeCost = (facility: OwnedStreamingFacility): number => {
    const current = normalizeStreamingFacilityPhysical(facility.physical, facility.type, facility.installedRacks, facility.lease);
    return current.powerUpgradeCount * 1_200_000
        + current.coolingUpgradeCount * 1_050_000
        + current.bandwidthUpgradeCount * 900_000
        + current.equipmentReplacementCount * 650_000;
};
