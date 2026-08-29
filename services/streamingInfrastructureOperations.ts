import type {
    OwnedStreamingFacility,
    OwnedStreamingInfrastructureIncident,
    OwnedStreamingLedgerEntry,
    OwnedStreamingPlatformState,
    OwnedStreamingWeeklySnapshot,
    Player,
    StreamingCrisisCompensation,
    StreamingCrisisSeverity,
    StreamingInfrastructureIncidentType,
    StreamingInfrastructureInsuranceTier,
    StreamingInfrastructureResponseAction,
    StreamingMaintenanceCadence,
} from '../types';
import { createDeterministicId, createDeterministicRng } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import {
    compactOwnedStreamingPlatformForPersistence,
    normalizeOwnedStreamingPlatformState,
    queueOwnedStreamingCinematic,
} from './ownedStreamingPlatform';
import { aggregateStreamingFacilities, normalizeStreamingFacilityPhysical } from './streamingFacilities';
import { getStreamingFacilityNetworkSnapshot } from './streamingInfrastructure';
import {
    getStreamingFacilityPhysicalView,
    getStreamingNetworkPhysicalSummary,
} from './streamingInfrastructurePhysical';
import { getProductionLocation } from './productionLocations';

const clamp = (value: number, minimum = 0, maximum = 100): number => Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));
const roundMoney = (value: number): number => Math.max(0, Math.round(value / 1_000) * 1_000);
const severityMultiplier: Record<StreamingCrisisSeverity, number> = { MINOR: .7, SERIOUS: 1, MAJOR: 1.55, CRITICAL: 2.3 };
const maintenanceIntervals: Record<StreamingMaintenanceCadence, number> = { REACTIVE: 14, BALANCED: 8, PREVENTIVE: 4 };
const insurancePremiums: Record<StreamingInfrastructureInsuranceTier, number> = { NONE: 0, STANDARD: 240_000, PREMIUM: 640_000 };

const INCIDENT_COPY: Record<StreamingInfrastructureIncidentType, { title: string; detail: string }> = {
    POWER_FAILURE: { title: 'Facility power failed under live load', detail: 'Grid supply and local backup could not carry the full active workload.' },
    COOLING_INCIDENT: { title: 'Cooling control crossed the safe envelope', detail: 'Heat-removal capacity fell below the live rack workload and protective throttling began.' },
    FIBRE_CUT: { title: 'A carrier path was cut', detail: 'Committed fibre disappeared and traffic began searching for another route.' },
    TRAFFIC_SPIKE: { title: 'Audience traffic exceeded the operating plan', detail: 'A demand surge consumed spare capacity faster than the normal routing plan could react.' },
    REGIONAL_OUTAGE: { title: 'A regional infrastructure outage began', detail: 'A city-level dependency interrupted power or carrier access across the local facility.' },
    CYBERATTACK: { title: 'A cyberattack reached infrastructure controls', detail: 'Defensive systems isolated suspicious access while the operating team protected service continuity.' },
    DDOS_ATTACK: { title: 'A DDoS wave hit the delivery edge', detail: 'Hostile traffic saturated public endpoints and competed with legitimate viewers.' },
    RIVAL_SABOTAGE: { title: 'A rival-linked sabotage signal was verified', detail: 'A contractor or intermediary created a deliberate operational weakness without exposing a technical method.' },
};

export const STREAMING_INFRASTRUCTURE_RESPONSE_OPTIONS: Array<{
    id: StreamingInfrastructureResponseAction;
    title: string;
    detail: string;
    baseCost: number;
    recoveryWeeks: number;
}> = [
    { id: 'FAILOVER_BACKUP', title: 'Fail over to backup systems', detail: 'Use contracted backup power and redundant paths. Fast when the facility has real coverage.', baseCost: 1_800_000, recoveryWeeks: 3 },
    { id: 'REROUTE_TRAFFIC', title: 'Reroute traffic to another facility', detail: 'Move viewer traffic to a healthy commissioned site while repairs continue.', baseCost: 1_250_000, recoveryWeeks: 4 },
    { id: 'ISOLATE_AND_REPAIR', title: 'Isolate and repair the facility', detail: 'Protect the wider network and fund a deliberate engineering repair.', baseCost: 2_350_000, recoveryWeeks: 4 },
    { id: 'EMERGENCY_CAPACITY', title: 'Buy emergency capacity', detail: 'Purchase short-term carrier and cloud headroom for the fastest viewer recovery.', baseCost: 3_100_000, recoveryWeeks: 2 },
];

export interface StreamingInfrastructureIncidentResponsePreview {
    grossCost: number;
    compensationCost: number;
    insuranceRecovery: number;
    netCost: number;
    recoveryWeeks: number;
    restoredCapacityPercent: number;
}

export interface StreamingInfrastructureOperationsEffects {
    acquisitionRateDelta: number;
    churnRateDelta: number;
    engagementRateDelta: number;
    playbackDelta: number;
    capacityMultiplier: number;
    weeklyOperatingCost: number;
    activeIncident: OwnedStreamingInfrastructureIncident | null;
}

const eventLedger = (
    platform: OwnedStreamingPlatformState,
    absoluteWeek: number,
    type: OwnedStreamingLedgerEntry['type'],
    key: string,
    summary: string,
    source: OwnedStreamingLedgerEntry['source'],
    metadata: OwnedStreamingLedgerEntry['metadata'] = {},
): OwnedStreamingLedgerEntry => ({
    id: createDeterministicId('streaming_event', platform.simulationSeed, key),
    idempotencyKey: key,
    absoluteWeek,
    type,
    summary,
    source,
    metadata,
});

const replaceFacilities = (
    platform: OwnedStreamingPlatformState,
    facilities: OwnedStreamingFacility[],
): OwnedStreamingPlatformState => {
    const setup = platform.infrastructureSetup;
    if (!setup) return platform;
    const beforeFacilities = setup.facilities || [];
    const beforeNetwork = getStreamingFacilityNetworkSnapshot(platform, beforeFacilities);
    const afterNetwork = getStreamingFacilityNetworkSnapshot(platform, facilities);
    const beforePhysical = getStreamingNetworkPhysicalSummary(beforeFacilities);
    const afterPhysical = getStreamingNetworkPhysicalSummary(facilities);
    return {
        ...platform,
        capacity: {
            baselineConcurrentStreams: Math.max(0, platform.capacity.baselineConcurrentStreams + afterNetwork.baselineConcurrentStreams - beforeNetwork.baselineConcurrentStreams),
            burstConcurrentStreams: Math.max(0, platform.capacity.burstConcurrentStreams + afterNetwork.burstConcurrentStreams - beforeNetwork.burstConcurrentStreams),
        },
        infrastructureSetup: {
            ...setup,
            facilities,
            networkPlacements: aggregateStreamingFacilities(facilities),
            storageCapacityHours: Math.max(0, setup.storageCapacityHours + afterNetwork.storageCapacityHours - beforeNetwork.storageCapacityHours),
            reliabilityTarget: clamp(setup.reliabilityTarget + afterNetwork.reliabilityTarget - beforeNetwork.reliabilityTarget, 90, 99.999),
            staffRequired: Math.max(1, setup.staffRequired + afterNetwork.staffRequired - beforeNetwork.staffRequired),
            weeklyOperatingCost: Math.max(0, setup.weeklyOperatingCost + afterPhysical.weeklyOperatingCost - beforePhysical.weeklyOperatingCost),
            physicalSummary: {
                energyKwhWeekly: afterPhysical.energyKwhWeekly,
                waterLitresWeekly: afterPhysical.waterLitresWeekly,
                physicalWeeklyOperatingCost: afterPhysical.weeklyOperatingCost,
                sustainabilityScore: afterPhysical.sustainabilityScore,
                publicReputation: afterPhysical.publicReputation,
                reliabilityPercent: afterPhysical.reliabilityPercent,
                backupCoveragePercent: afterPhysical.backupCoveragePercent,
                limitingFactors: afterPhysical.limitingFactors,
            },
        },
    };
};

const facilityName = (facility: OwnedStreamingFacility): string => `${getProductionLocation(facility.cityId)?.name || facility.cityId} ${facility.type.toLowerCase().replaceAll('_', ' ')}`;

export const getStreamingInfrastructureIncidentResponsePreview = (
    platform: OwnedStreamingPlatformState,
    incident: OwnedStreamingInfrastructureIncident,
    action: StreamingInfrastructureResponseAction,
    compensation: StreamingCrisisCompensation,
    claimInsurance: boolean,
): StreamingInfrastructureIncidentResponsePreview => {
    const definition = STREAMING_INFRASTRUCTURE_RESPONSE_OPTIONS.find(item => item.id === action)!;
    const multiplier = severityMultiplier[incident.severity];
    const compensationCost = compensation === 'FULL'
        ? Math.max(1_200_000, incident.affectedSubscribers * 9)
        : compensation === 'TARGETED' ? Math.max(400_000, incident.affectedSubscribers * 3) : 0;
    const grossCost = roundMoney(definition.baseCost * multiplier + compensationCost);
    const tier = platform.crisisSecurity.infrastructureOperations.insuranceTier;
    const coverage = !claimInsurance || tier === 'NONE' ? 0 : tier === 'PREMIUM' ? .65 : .35;
    const deductible = tier === 'PREMIUM' ? 250_000 : 500_000;
    const insuranceRecovery = coverage ? roundMoney(Math.max(0, grossCost * coverage - deductible)) : 0;
    const actionRestore = action === 'EMERGENCY_CAPACITY' ? 88 : action === 'REROUTE_TRAFFIC' ? 72 : action === 'FAILOVER_BACKUP' ? 65 : 42;
    return {
        grossCost,
        compensationCost: roundMoney(compensationCost),
        insuranceRecovery,
        netCost: Math.max(0, grossCost - insuranceRecovery),
        recoveryWeeks: Math.max(1, Math.round(definition.recoveryWeeks + (incident.severity === 'CRITICAL' ? 1 : 0) - (platform.technologyLevels.RELIABILITY >= 20 ? 1 : 0))),
        restoredCapacityPercent: actionRestore,
    };
};

const lockResponse = (
    platformValue: OwnedStreamingPlatformState,
    incidentId: string,
    absoluteWeek: number,
    action: StreamingInfrastructureResponseAction,
    rerouteFacilityId: string | null,
    compensation: StreamingCrisisCompensation,
    claimInsurance: boolean,
    assistedHandled: boolean,
): { platform: OwnedStreamingPlatformState; changed: boolean; reason: string } => {
    const platform = normalizeOwnedStreamingPlatformState(platformValue);
    const operations = platform.crisisSecurity.infrastructureOperations;
    const incident = operations.incidents.find(item => item.id === incidentId && item.stage === 'DETECTED');
    if (!incident) return { platform, changed: false, reason: 'That infrastructure incident no longer needs a first response.' };
    const facilities = platform.infrastructureSetup?.facilities || [];
    const target = rerouteFacilityId ? facilities.find(item => item.id === rerouteFacilityId && item.id !== incident.facilityId) : null;
    if (action === 'REROUTE_TRAFFIC' && !target) return { platform, changed: false, reason: 'Choose another commissioned facility as the emergency route.' };
    const preview = getStreamingInfrastructureIncidentResponsePreview(platform, incident, action, compensation, claimInsurance);
    if (platform.treasuryCash < preview.netCost) return { platform, changed: false, reason: 'The platform treasury cannot fund this emergency package.' };
    const trustDelta = compensation === 'FULL' ? 5 : compensation === 'TARGETED' ? 2 : -3;
    const key = `${incident.idempotencyKey}:response`;
    const entry = eventLedger(platform, absoluteWeek, 'INFRASTRUCTURE_RESPONSE_LOCKED', key, `${action.toLowerCase().replaceAll('_', ' ')} was funded for ${incident.title}.`, assistedHandled ? 'SYSTEM' : 'PLAYER_ACTION', { incidentId, action, rerouteFacilityId, compensation, claimInsurance, netCost: preview.netCost });
    const changedIncident: OwnedStreamingInfrastructureIncident = {
        ...incident,
        stage: 'RECOVERING',
        responseAction: action,
        rerouteFacilityId: action === 'REROUTE_TRAFFIC' ? target!.id : null,
        compensation,
        insuranceClaimed: claimInsurance && operations.insuranceTier !== 'NONE',
        responseCost: preview.grossCost,
        insuranceRecovery: preview.insuranceRecovery,
        recoveryReadyAtAbsoluteWeek: absoluteWeek + preview.recoveryWeeks,
        assistedHandled,
        publicReaction: compensation === 'NONE' ? 'The public response hardened after the company declined viewer compensation.' : 'The funded service response stabilized public reaction.',
        subscriberReaction: compensation === 'FULL' ? 'Members welcomed a full service credit.' : compensation === 'TARGETED' ? 'Affected members received a targeted credit.' : 'Affected members absorbed the interruption without a credit.',
        outcomeNote: `${preview.restoredCapacityPercent}% of incident capacity pressure is mitigated while engineering recovery continues.`,
    };
    return {
        changed: true,
        reason: assistedHandled ? 'Assisted Management funded the policy-approved emergency response.' : 'The infrastructure incident entered funded recovery.',
        platform: {
            ...platform,
            treasuryCash: platform.treasuryCash - preview.netCost,
            crisisSecurity: {
                ...platform.crisisSecurity,
                publicTrust: clamp(platform.crisisSecurity.publicTrust + trustDelta),
                securityPressure: clamp(platform.crisisSecurity.securityPressure + (incident.type === 'CYBERATTACK' || incident.type === 'DDOS_ATTACK' ? 4 : 0)),
                infrastructureOperations: {
                    ...operations,
                    incidents: operations.incidents.map(item => item.id === incident.id ? changedIncident : item),
                    totalCompensationPaid: operations.totalCompensationPaid + preview.compensationCost,
                    totalInsuranceRecovered: operations.totalInsuranceRecovered + preview.insuranceRecovery,
                    assistedResponseCount: operations.assistedResponseCount + (assistedHandled ? 1 : 0),
                },
            },
            eventLedger: [...platform.eventLedger, entry],
        },
    };
};

export const respondToStreamingInfrastructureIncident = (
    player: Player,
    incidentId: string,
    action: StreamingInfrastructureResponseAction,
    rerouteFacilityId: string | null,
    compensation: StreamingCrisisCompensation,
    claimInsurance: boolean,
): { changed: boolean; player: Player; reason: string } => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const result = lockResponse(platform, incidentId, getAbsoluteWeek(player.age, player.currentWeek), action, rerouteFacilityId, compensation, claimInsurance, false);
    return { changed: result.changed, player: result.changed ? { ...player, ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence(result.platform, player.id) } : player, reason: result.reason };
};

export const updateStreamingInfrastructureOperationsPolicy = (
    player: Player,
    maintenanceCadence: StreamingMaintenanceCadence,
    insuranceTier: StreamingInfrastructureInsuranceTier,
): { changed: boolean; player: Player; reason: string } => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const operations = platform.crisisSecurity.infrastructureOperations;
    if (operations.maintenanceCadence === maintenanceCadence && operations.insuranceTier === insuranceTier) return { changed: false, player, reason: 'That operations policy is already active.' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const key = `infrastructure-operations-policy:${absoluteWeek}:${maintenanceCadence}:${insuranceTier}`;
    const entry = eventLedger(platform, absoluteWeek, 'INFRASTRUCTURE_OPERATIONS_POLICY_UPDATED', key, `Infrastructure operations changed to ${maintenanceCadence.toLowerCase()} maintenance with ${insuranceTier.toLowerCase()} insurance.`, 'PLAYER_ACTION', { maintenanceCadence, insuranceTier, weeklyPremium: insurancePremiums[insuranceTier] });
    const changed = {
        ...platform,
        crisisSecurity: { ...platform.crisisSecurity, infrastructureOperations: { ...operations, maintenanceCadence, insuranceTier } },
        eventLedger: [...platform.eventLedger, entry],
    };
    return { changed: true, player: { ...player, ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence(changed, player.id) }, reason: 'Live Operations policy updated.' };
};

const maintenanceCost = (facility: OwnedStreamingFacility): number => roundMoney(180_000 + facility.installedRacks * 22_000);

const performMaintenance = (
    platformValue: OwnedStreamingPlatformState,
    facilityId: string,
    absoluteWeek: number,
    source: 'PLAYER_ACTION' | 'SYSTEM',
): { platform: OwnedStreamingPlatformState; changed: boolean; reason: string; cost: number } => {
    let platform = normalizeOwnedStreamingPlatformState(platformValue);
    const facilities = platform.infrastructureSetup?.facilities || [];
    const facility = facilities.find(item => item.id === facilityId);
    if (!facility) return { platform, changed: false, reason: 'That commissioned facility is unavailable.', cost: 0 };
    const cost = maintenanceCost(facility);
    if (platform.treasuryCash < cost) return { platform, changed: false, reason: 'The platform treasury cannot fund this maintenance window.', cost };
    const physical = normalizeStreamingFacilityPhysical(facility.physical, facility.type, facility.installedRacks, facility.lease);
    if (physical.maintenanceConditionPercent >= 98 && absoluteWeek - physical.lastMaintenanceAbsoluteWeek < 2) return { platform, changed: false, reason: 'This facility is already inside its healthy maintenance window.', cost };
    const maintained = { ...facility, physical: { ...physical, maintenanceConditionPercent: Math.min(100, physical.maintenanceConditionPercent + 18), lastMaintenanceAbsoluteWeek: absoluteWeek } };
    platform = replaceFacilities(platform, facilities.map(item => item.id === facility.id ? maintained : item));
    const operations = platform.crisisSecurity.infrastructureOperations;
    const key = `infrastructure-maintenance:${facility.id}:${absoluteWeek}`;
    const entry = eventLedger(platform, absoluteWeek, 'INFRASTRUCTURE_MAINTENANCE_COMPLETED', key, `${facilityName(facility)} completed preventive maintenance.`, source, { facilityId, cost, conditionAfter: maintained.physical!.maintenanceConditionPercent });
    platform = {
        ...platform,
        treasuryCash: platform.treasuryCash - cost,
        crisisSecurity: { ...platform.crisisSecurity, infrastructureOperations: { ...operations, totalMaintenanceSpend: operations.totalMaintenanceSpend + cost } },
        eventLedger: [...platform.eventLedger, entry],
    };
    return { platform, changed: true, reason: 'Preventive maintenance completed and facility condition improved.', cost };
};

export const performStreamingPreventiveMaintenance = (
    player: Player,
    facilityId: string,
): { changed: boolean; player: Player; reason: string } => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const result = performMaintenance(platform, facilityId, getAbsoluteWeek(player.age, player.currentWeek), 'PLAYER_ACTION');
    return { changed: result.changed, player: result.changed ? { ...player, ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence(result.platform, player.id) } : player, reason: result.reason };
};

export const getStreamingInfrastructureOperationsEffects = (
    value: OwnedStreamingPlatformState,
): StreamingInfrastructureOperationsEffects => {
    const platform = normalizeOwnedStreamingPlatformState(value);
    const operations = platform.crisisSecurity.infrastructureOperations;
    const activeIncident = [...operations.incidents].reverse().find(item => item.stage !== 'RESOLVED') || null;
    const premium = insurancePremiums[operations.insuranceTier];
    if (!activeIncident) return { acquisitionRateDelta: 0, churnRateDelta: 0, engagementRateDelta: 0, playbackDelta: 0, capacityMultiplier: 1, weeklyOperatingCost: premium, activeIncident: null };
    const severity = severityMultiplier[activeIncident.severity];
    const recovering = activeIncident.stage === 'RECOVERING';
    const mitigation = !recovering ? 0 : activeIncident.responseAction === 'EMERGENCY_CAPACITY' ? .88 : activeIncident.responseAction === 'REROUTE_TRAFFIC' ? .72 : activeIncident.responseAction === 'FAILOVER_BACKUP' ? .65 : .42;
    const remainingLoss = activeIncident.capacityLossPercent * (1 - mitigation);
    const pressure = recovering ? .48 : 1;
    return {
        acquisitionRateDelta: -.0028 * severity * pressure,
        churnRateDelta: .0042 * severity * pressure,
        engagementRateDelta: -.008 * severity * pressure,
        playbackDelta: -1.4 * severity * pressure,
        capacityMultiplier: clamp(1 - remainingLoss / 100, .35, 1),
        weeklyOperatingCost: premium + (recovering ? roundMoney(320_000 * severity) : 0),
        activeIncident,
    };
};

const severityFor = (risk: number): StreamingCrisisSeverity => risk >= .68 ? 'CRITICAL' : risk >= .5 ? 'MAJOR' : risk >= .32 ? 'SERIOUS' : 'MINOR';

const incidentTypeFor = (
    platform: OwnedStreamingPlatformState,
    facility: OwnedStreamingFacility,
    snapshot: OwnedStreamingWeeklySnapshot,
    rng: () => number,
): StreamingInfrastructureIncidentType => {
    const view = getStreamingFacilityPhysicalView(facility);
    if ((snapshot.operations?.capacityUtilizationPercent || 0) >= 97) return 'TRAFFIC_SPIKE';
    if (view.state.backupPowerMode === 'NONE' || view.backupCoveragePercent < 35) return 'POWER_FAILURE';
    if (view.limitingFactor === 'COOLING') return 'COOLING_INCIDENT';
    if (view.limitingFactor === 'BANDWIDTH') return 'FIBRE_CUT';
    if (platform.competitiveWorld.rivalryHeat >= 65 && rng() < .34) return 'RIVAL_SABOTAGE';
    if (platform.technologyLevels.SECURITY < 12) return rng() < .52 ? 'DDOS_ATTACK' : 'CYBERATTACK';
    return rng() < .55 ? 'REGIONAL_OUTAGE' : 'FIBRE_CUT';
};

export const commitStreamingInfrastructureOperationsWeek = (
    value: OwnedStreamingPlatformState,
    player: Player,
    snapshot: OwnedStreamingWeeklySnapshot,
): OwnedStreamingPlatformState => {
    let platform = normalizeOwnedStreamingPlatformState(value, player.id);
    let operations = platform.crisisSecurity.infrastructureOperations;
    if (operations.lastProcessedAbsoluteWeek !== null && operations.lastProcessedAbsoluteWeek >= snapshot.absoluteWeek) return platform;
    let facilities = platform.infrastructureSetup?.facilities || [];
    if (!facilities.length || platform.lifecycle !== 'ACTIVE' || !platform.launchCommit) return {
        ...platform,
        crisisSecurity: { ...platform.crisisSecurity, infrastructureOperations: { ...operations, lastProcessedAbsoluteWeek: snapshot.absoluteWeek } },
    };
    const ledger: OwnedStreamingLedgerEntry[] = [];

    const dueRecovery = operations.incidents.find(item => item.stage === 'RECOVERING' && item.recoveryReadyAtAbsoluteWeek !== null && item.recoveryReadyAtAbsoluteWeek <= snapshot.absoluteWeek);
    if (dueRecovery) {
        facilities = facilities.map(facility => {
            if (facility.id !== dueRecovery.facilityId) return facility;
            const physical = normalizeStreamingFacilityPhysical(facility.physical, facility.type, facility.installedRacks, facility.lease);
            return { ...facility, physical: { ...physical, maintenanceConditionPercent: Math.min(96, physical.maintenanceConditionPercent + 14), lastMaintenanceAbsoluteWeek: snapshot.absoluteWeek } };
        });
        platform = replaceFacilities(platform, facilities);
        operations = platform.crisisSecurity.infrastructureOperations;
        const recovered = { ...dueRecovery, stage: 'RESOLVED' as const, resolvedAtAbsoluteWeek: snapshot.absoluteWeek, outcomeNote: 'Facility checks passed, emergency routing was released and normal service ownership resumed.' };
        operations = { ...operations, incidents: operations.incidents.map(item => item.id === recovered.id ? recovered : item) };
        platform = {
            ...platform,
            crisisSecurity: { ...platform.crisisSecurity, infrastructureOperations: operations },
        };
        ledger.push(eventLedger(platform, snapshot.absoluteWeek, 'INFRASTRUCTURE_INCIDENT_RECOVERED', `${recovered.idempotencyKey}:recovered`, `${recovered.title} reached verified recovery.`, 'WEEK_PROCESSOR', { incidentId: recovered.id, facilityId: recovered.facilityId }));
    }

    const cadence = operations.maintenanceCadence;
    const loadPressure = Math.max(0, (snapshot.operations?.capacityUtilizationPercent || 0) - 72) / 65;
    facilities = facilities.map(facility => {
        const physical = normalizeStreamingFacilityPhysical(facility.physical, facility.type, facility.installedRacks, facility.lease);
        const rng = createDeterministicRng(`${platform.simulationSeed}:facility-wear:${snapshot.absoluteWeek}:${facility.id}`);
        const agePressure = Math.max(0, snapshot.absoluteWeek - physical.lastMaintenanceAbsoluteWeek - maintenanceIntervals[cadence]) * .08;
        const wear = clamp(.35 + loadPressure + agePressure + rng() * .45 - (cadence === 'PREVENTIVE' ? .22 : cadence === 'REACTIVE' ? 0 : .1), .2, 3.2);
        return { ...facility, physical: { ...physical, maintenanceConditionPercent: clamp(physical.maintenanceConditionPercent - wear, 45, 100) } };
    });
    platform = replaceFacilities(platform, facilities);
    operations = platform.crisisSecurity.infrastructureOperations;

    const management = platform.infrastructureSetup!.managementPolicy;
    if (management?.mode === 'ASSISTED') {
        for (const facility of facilities) {
            const physical = normalizeStreamingFacilityPhysical(facility.physical, facility.type, facility.installedRacks, facility.lease);
            const overdue = snapshot.absoluteWeek - physical.lastMaintenanceAbsoluteWeek >= maintenanceIntervals[cadence];
            const cost = maintenanceCost(facility);
            const requiresApproval = management.requireApprovalForExpensiveChanges && cost > management.approvalThreshold;
            if (!overdue || cost > management.maximumBudget || requiresApproval) continue;
            const maintained = performMaintenance(platform, facility.id, snapshot.absoluteWeek, 'SYSTEM');
            if (maintained.changed) {
                platform = maintained.platform;
                facilities = platform.infrastructureSetup?.facilities || facilities;
                operations = platform.crisisSecurity.infrastructureOperations;
            }
        }
    }

    const unresolvedGeneralCrisis = platform.crisisSecurity.crises.some(item => item.stage !== 'RESOLVED');
    const unresolvedIncident = operations.incidents.some(item => item.stage !== 'RESOLVED');
    const lastIncidentWeek = operations.incidents.at(-1)?.detectedAtAbsoluteWeek ?? -100;
    const weakest = [...facilities].sort((left, right) => getStreamingFacilityPhysicalView(left).state.maintenanceConditionPercent - getStreamingFacilityPhysicalView(right).state.maintenanceConditionPercent)[0];
    const weakestView = getStreamingFacilityPhysicalView(weakest);
    const risk = clamp(
        .035
        + Math.max(0, 88 - weakestView.state.maintenanceConditionPercent) / 130
        + Math.max(0, (snapshot.operations?.capacityUtilizationPercent || 0) - 82) / 170
        + Math.max(0, 55 - weakestView.backupCoveragePercent) / 420
        + platform.crisisSecurity.securityPressure / 700
        + platform.competitiveWorld.rivalryHeat / 1200
        - platform.technologyLevels.RELIABILITY / 420
        - platform.technologyLevels.SECURITY / 520,
        .02,
        .72,
    );
    const rng = createDeterministicRng(`${platform.simulationSeed}:infrastructure-operations:${snapshot.absoluteWeek}`);
    let detected: OwnedStreamingInfrastructureIncident | null = null;
    if (!unresolvedGeneralCrisis && !unresolvedIncident && snapshot.absoluteWeek - lastIncidentWeek >= 5 && rng() < risk) {
        const type = incidentTypeFor(platform, weakest, snapshot, rng);
        const severity = severityFor(risk + rng() * .2);
        const multiplier = severityMultiplier[severity];
        const copy = INCIDENT_COPY[type];
        const key = `infrastructure-incident:${snapshot.absoluteWeek}:${weakest.id}:${type}`;
        detected = {
            id: createDeterministicId('streaming_infrastructure_incident', platform.simulationSeed, key), idempotencyKey: key, type, severity, stage: 'DETECTED',
            title: copy.title, detail: copy.detail,
            cause: `${facilityName(weakest)} entered the week at ${weakestView.state.maintenanceConditionPercent.toFixed(0)}% condition with ${weakestView.backupCoveragePercent.toFixed(0)}% backup coverage.`,
            facilityId: weakest.id, cityId: weakest.cityId, detectedAtAbsoluteWeek: snapshot.absoluteWeek,
            affectedSubscribers: Math.round(snapshot.subscribers * clamp(.018 * multiplier, .006, .28)),
            capacityLossPercent: clamp(12 * multiplier + rng() * 12, 8, 58), conditionLossPercent: clamp(4 * multiplier + rng() * 5, 3, 18),
            responseAction: null, rerouteFacilityId: null, compensation: null, insuranceClaimed: false, responseCost: 0, insuranceRecovery: 0,
            recoveryReadyAtAbsoluteWeek: null, resolvedAtAbsoluteWeek: null, assistedHandled: false,
            publicReaction: 'The interruption is visible and the public is waiting for a credible operating response.',
            subscriberReaction: 'Affected viewers are encountering degraded playback or temporary unavailability.', outcomeNote: null,
        };
        facilities = facilities.map(facility => facility.id !== weakest.id ? facility : {
            ...facility,
            physical: { ...normalizeStreamingFacilityPhysical(facility.physical, facility.type, facility.installedRacks, facility.lease), maintenanceConditionPercent: clamp(weakestView.state.maintenanceConditionPercent - detected!.conditionLossPercent, 35, 100) },
        });
        platform = replaceFacilities(platform, facilities);
        operations = platform.crisisSecurity.infrastructureOperations;
        operations = { ...operations, incidents: [...operations.incidents, detected] };
        ledger.push(eventLedger(platform, snapshot.absoluteWeek, 'INFRASTRUCTURE_INCIDENT_DETECTED', key, `${copy.title} at ${facilityName(weakest)}.`, 'WEEK_PROCESSOR', { incidentId: detected.id, type, severity, facilityId: weakest.id, affectedSubscribers: detected.affectedSubscribers }));
    }

    platform = {
        ...platform,
        crisisSecurity: { ...platform.crisisSecurity, infrastructureOperations: { ...operations, lastProcessedAbsoluteWeek: snapshot.absoluteWeek } },
        eventLedger: [...platform.eventLedger, ...ledger],
    };

    const assistedIncident = detected || [...platform.crisisSecurity.infrastructureOperations.incidents]
        .reverse()
        .find(item => item.stage === 'DETECTED') || null;
    if (assistedIncident && management?.mode === 'ASSISTED') {
        const alternatives = facilities.filter(item => item.id !== assistedIncident.facilityId);
        const action: StreamingInfrastructureResponseAction = alternatives.length && management.priority !== 'ECONOMY' ? 'REROUTE_TRAFFIC' : management.priority === 'PREMIUM' || management.priority === 'RELIABLE' ? 'EMERGENCY_CAPACITY' : platform.leadership.delegation.incidentPolicy === 'CONTAIN_FIRST' ? 'ISOLATE_AND_REPAIR' : 'FAILOVER_BACKUP';
        const compensation: StreamingCrisisCompensation = platform.leadership.delegation.incidentPolicy === 'TRANSPARENT_FIRST' ? 'FULL' : 'TARGETED';
        const claim = operations.insuranceTier !== 'NONE';
        const preview = getStreamingInfrastructureIncidentResponsePreview(platform, assistedIncident, action, compensation, claim);
        const requiresApproval = management.requireApprovalForExpensiveChanges && preview.netCost > management.approvalThreshold;
        if (preview.netCost <= management.maximumBudget && !requiresApproval) {
            const response = lockResponse(platform, assistedIncident.id, snapshot.absoluteWeek, action, alternatives[0]?.id || null, compensation, claim, true);
            if (response.changed) platform = response.platform;
        }
    }

    const fact = detected ? platform.eventLedger.find(item => item.idempotencyKey === detected!.idempotencyKey) : null;
    if (detected && fact) {
        platform = queueOwnedStreamingCinematic(platform, { idempotencyKey: `${detected.idempotencyKey}:scene`, type: 'PLATFORM_OUTAGE', priority: detected.severity === 'CRITICAL' ? 'MAJOR' : 'IMPORTANT', availableAtAbsoluteWeek: snapshot.absoluteWeek, title: detected.title, factIds: [fact.id] });
    }
    return compactOwnedStreamingPlatformForPersistence(platform, player.id);
};

export const getStreamingInfrastructureOperations = (player: Player) => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const operations = platform.crisisSecurity.infrastructureOperations;
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const facilities = (platform.infrastructureSetup?.facilities || []).map(facility => {
        const view = getStreamingFacilityPhysicalView(facility);
        const nextMaintenanceWeek = view.state.lastMaintenanceAbsoluteWeek + maintenanceIntervals[operations.maintenanceCadence];
        return { facility, name: facilityName(facility), view, nextMaintenanceWeek, overdue: absoluteWeek >= nextMaintenanceWeek, maintenanceCost: maintenanceCost(facility) };
    });
    const averageCondition = facilities.length ? facilities.reduce((sum, item) => sum + item.view.state.maintenanceConditionPercent, 0) / facilities.length : 100;
    return {
        available: platform.lifecycle === 'ACTIVE' && Boolean(platform.launchCommit) && facilities.length > 0,
        absoluteWeek,
        managementMode: platform.infrastructureSetup?.managementPolicy?.mode || 'ASSISTED',
        operations,
        activeIncident: [...operations.incidents].reverse().find(item => item.stage !== 'RESOLVED') || null,
        facilities,
        averageCondition,
        weeklyInsurancePremium: insurancePremiums[operations.insuranceTier],
        recentIncidents: [...operations.incidents].reverse().slice(0, 10),
        rivalCopySignals: platform.competitiveWorld.rivals.reduce((sum, rival) => sum + rival.copiedTechnologyBranches.length, 0),
    };
};
