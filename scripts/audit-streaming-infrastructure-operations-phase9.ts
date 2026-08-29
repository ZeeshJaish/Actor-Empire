import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    INITIAL_PLAYER,
    createInitialOwnedStreamingPlatformState,
    type OwnedStreamingInfrastructureIncident,
    type OwnedStreamingWeeklySnapshot,
    type Player,
} from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { getStreamingFacilityPhysicalView } from '../services/streamingInfrastructurePhysical';
import {
    commitStreamingInfrastructureOperationsWeek,
    getStreamingInfrastructureIncidentResponsePreview,
    getStreamingInfrastructureOperations,
    getStreamingInfrastructureOperationsEffects,
    performStreamingPreventiveMaintenance,
    respondToStreamingInfrastructureIncident,
    updateStreamingInfrastructureOperationsPolicy,
} from '../services/streamingInfrastructureOperations';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const snapshot = (absoluteWeek: number): OwnedStreamingWeeklySnapshot => ({
    id: `phase9-week-${absoluteWeek}`,
    absoluteWeek,
    subscribers: 9_000_000,
    netSubscriberMovement: 0,
    churnRate: .022,
    engagementRate: .7,
    averageRevenuePerUser: 12,
    cashRunwayWeeks: 60,
    technologyHealth: 86,
    causeMarkers: ['PHASE_9_OPERATIONS'],
    operations: { capacityUtilizationPercent: 98 } as OwnedStreamingWeeklySnapshot['operations'],
});

const createFixture = (mode: 'ASSISTED' | 'HANDS_ON' = 'HANDS_ON'): Player => {
    const base = structuredClone(INITIAL_PLAYER) as Player;
    const initial = createInitialOwnedStreamingPlatformState('phase9-operations-player');
    const absoluteWeek = getAbsoluteWeek(50, 20);
    const platform = normalizeOwnedStreamingPlatformState({
        ...initial,
        lifecycle: 'ACTIVE',
        treasuryCash: 500_000_000,
        launchCommit: {
            id: 'phase9-launch', idempotencyKey: 'phase9-launch', committedAtAbsoluteWeek: absoluteWeek - 20,
            capacityPlan: 'CLOUD_BURST', capacityPlanCost: 0, readinessScore: 90,
            forecastLikelyConcurrentStreams: 1_200_000, forecastHighConcurrentStreams: 2_000_000,
            protectedPeakConcurrentStreams: 2_600_000, launchHeadroomPercent: 30,
            initialSubscribers: 2_000_000, openingDemandIndex: 80, playbackSuccessRate: 99.2,
            outcomeTier: 'SMOOTH_OPENING', openingTitleCount: 8, openingOriginalTitle: null,
        },
        capacity: { baselineConcurrentStreams: 2_000_000, burstConcurrentStreams: 4_000_000 },
        infrastructureSetup: {
            capacityPackageId: 'GROWTH', rolloutPace: 'STANDARD', storageCapacityHours: 50_000,
            reliabilityTarget: 99.8, weeklyOperatingCost: 2_400_000, staffRequired: 25,
            capitalInvested: 120_000_000, technicalDebt: 4,
            networkPlacements: [
                { cityId: 'LA', racks: 12, role: 'CORE_ORIGIN' },
                { cityId: 'MUMBAI', racks: 10, role: 'REGIONAL_HUB' },
            ],
            facilities: [
                {
                    id: 'phase9-la', cityId: 'LA', type: 'PRIVATE_CAGE', installedRacks: 12, role: 'CORE_ORIGIN',
                    rackGroups: [
                        { id: 'phase9-la-origin', name: 'Origin', rackCount: 7, duty: 'CONTENT_ORIGIN' },
                        { id: 'phase9-la-platform', name: 'Platform', rackCount: 5, duty: 'PLATFORM_SERVICES' },
                    ],
                },
                {
                    id: 'phase9-mumbai', cityId: 'MUMBAI', type: 'PRIVATE_CAGE', installedRacks: 10, role: 'REGIONAL_HUB',
                    rackGroups: [
                        { id: 'phase9-mumbai-cache', name: 'Cache', rackCount: 6, duty: 'REGIONAL_CACHE' },
                        { id: 'phase9-mumbai-live', name: 'Live', rackCount: 4, duty: 'LIVE_EVENT' },
                    ],
                },
            ],
            managementPolicy: {
                mode, priority: 'RELIABLE', maximumBudget: 25_000_000, riskTolerance: 'LOW',
                preferredCityIds: ['LA', 'MUMBAI'], requireApprovalForExpensiveChanges: false, approvalThreshold: 10_000_000,
            },
            readyAtAbsoluteWeek: absoluteWeek - 30, revision: 1, committedAtAbsoluteWeek: absoluteWeek - 30,
            loadTest: {
                configurationSignature: 'phase9-load', forecastLowConcurrentStreams: 800_000,
                forecastLikelyConcurrentStreams: 1_200_000, forecastHighConcurrentStreams: 2_000_000,
                testedBurstCapacity: 4_000_000, headroomPercent: 50, status: 'PASS', driverKeys: ['phase9'],
                completedAtAbsoluteWeek: absoluteWeek - 29,
            },
        },
        competitiveWorld: { ...initial.competitiveWorld, rivalryHeat: 72 },
    }, 'phase9-operations-player');
    return { ...base, id: 'phase9-operations-player', age: 50, currentWeek: 20, ownedStreamingPlatform: platform };
};

const withIncident = (player: Player, id = 'phase9-incident'): Player => {
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const incident: OwnedStreamingInfrastructureIncident = {
        id, idempotencyKey: `${id}:key`, type: 'FIBRE_CUT', severity: 'MAJOR', stage: 'DETECTED',
        title: 'Carrier path cut under live load', detail: 'The network lost a committed route.',
        cause: 'The LA carrier path failed while both sites were serving customers.', facilityId: 'phase9-la', cityId: 'LA',
        detectedAtAbsoluteWeek: absoluteWeek, affectedSubscribers: 420_000, capacityLossPercent: 36, conditionLossPercent: 8,
        responseAction: null, rerouteFacilityId: null, compensation: null, insuranceClaimed: false,
        responseCost: 0, insuranceRecovery: 0, recoveryReadyAtAbsoluteWeek: null, resolvedAtAbsoluteWeek: null,
        assistedHandled: false, publicReaction: 'Public questions are rising.', subscriberReaction: 'Playback is degraded.', outcomeNote: null,
    };
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    return {
        ...player,
        ownedStreamingPlatform: {
            ...platform,
            crisisSecurity: {
                ...platform.crisisSecurity,
                infrastructureOperations: { ...platform.crisisSecurity.infrastructureOperations, lastProcessedAbsoluteWeek: null, incidents: [incident] },
            },
        },
    };
};

const migrated = normalizeOwnedStreamingPlatformState({ schemaVersion: 8 }, 'phase9-old-save');
assert(migrated.crisisSecurity.infrastructureOperations.maintenanceCadence === 'BALANCED', 'Old saves should receive balanced maintenance safely.');
assert(migrated.crisisSecurity.infrastructureOperations.insuranceTier === 'NONE', 'Old saves should not acquire a surprise insurance premium.');
assert(migrated.crisisSecurity.infrastructureOperations.incidents.length === 0, 'Old saves should start without fabricated facility incidents.');

let player = createFixture();
const start = getStreamingInfrastructureOperations(player);
assert(start.available && start.facilities.length === 2, 'Live Operations should use the commissioned canonical facility fleet.');
const week = start.absoluteWeek + 1;
const beforeCondition = start.facilities[0].view.state.maintenanceConditionPercent;
const worn = commitStreamingInfrastructureOperationsWeek(player.ownedStreamingPlatform, player, snapshot(week));
const afterCondition = getStreamingFacilityPhysicalView(worn.infrastructureSetup!.facilities![0]).state.maintenanceConditionPercent;
assert(afterCondition < beforeCondition, 'Every committed game week should deterministically deteriorate physical facility condition.');
const repeated = commitStreamingInfrastructureOperationsWeek(worn, player, snapshot(week));
assert(getStreamingFacilityPhysicalView(repeated.infrastructureSetup!.facilities![0]).state.maintenanceConditionPercent === afterCondition, 'The same game week must not apply facility wear twice.');

player = { ...player, ownedStreamingPlatform: worn };
const treasuryBeforeMaintenance = player.ownedStreamingPlatform.treasuryCash;
const maintenance = performStreamingPreventiveMaintenance(player, 'phase9-la');
assert(maintenance.changed, 'Hands-On Management should allow a direct maintenance window.');
player = maintenance.player;
assert(player.ownedStreamingPlatform.treasuryCash < treasuryBeforeMaintenance, 'Maintenance must charge the company treasury.');
assert(getStreamingFacilityPhysicalView(player.ownedStreamingPlatform.infrastructureSetup!.facilities![0]).state.maintenanceConditionPercent > afterCondition, 'Maintenance should restore condition in the same physical model.');
assert(player.ownedStreamingPlatform.eventLedger.some(item => item.type === 'INFRASTRUCTURE_MAINTENANCE_COMPLETED'), 'Maintenance should leave an auditable company fact.');

const policy = updateStreamingInfrastructureOperationsPolicy(player, 'PREVENTIVE', 'PREMIUM');
assert(policy.changed, 'Maintenance cadence and insurance should be explicit player policy.');
player = policy.player;
assert(getStreamingInfrastructureOperationsEffects(player.ownedStreamingPlatform).weeklyOperatingCost === 640_000, 'Premium insurance should enter canonical weekly operating cost.');

player = withIncident(player);
const incident = player.ownedStreamingPlatform.crisisSecurity.infrastructureOperations.incidents[0];
const preview = getStreamingInfrastructureIncidentResponsePreview(player.ownedStreamingPlatform, incident, 'REROUTE_TRAFFIC', 'FULL', true);
assert(preview.insuranceRecovery > 0 && preview.netCost < preview.grossCost, 'The response preview should explain insurance recovery and net treasury cost.');
assert(!respondToStreamingInfrastructureIncident(player, incident.id, 'REROUTE_TRAFFIC', null, 'FULL', true).changed, 'Emergency rerouting must name another commissioned facility.');
const treasuryBeforeResponse = player.ownedStreamingPlatform.treasuryCash;
const response = respondToStreamingInfrastructureIncident(player, incident.id, 'REROUTE_TRAFFIC', 'phase9-mumbai', 'FULL', true);
assert(response.changed, 'Hands-On Management should fund a direct emergency response.');
player = response.player;
const recovering = player.ownedStreamingPlatform.crisisSecurity.infrastructureOperations.incidents[0];
assert(recovering.stage === 'RECOVERING' && recovering.rerouteFacilityId === 'phase9-mumbai', 'Rerouting should persist the exact destination and recovery stage.');
assert(player.ownedStreamingPlatform.treasuryCash === treasuryBeforeResponse - preview.netCost, 'The treasury should move by the disclosed net cost exactly once.');
assert(recovering.publicReaction.length > 0 && recovering.subscriberReaction.length > 0, 'A response should persist public and subscriber reaction.');
const effects = getStreamingInfrastructureOperationsEffects(player.ownedStreamingPlatform);
assert(effects.capacityMultiplier < 1 && effects.capacityMultiplier > .64 && effects.churnRateDelta > 0, 'A funded reroute should mitigate, not erase, capacity and audience consequences.');
const recoveredPlatform = commitStreamingInfrastructureOperationsWeek(player.ownedStreamingPlatform, player, snapshot(recovering.recoveryReadyAtAbsoluteWeek!));
const recoveryStage = recoveredPlatform.crisisSecurity.infrastructureOperations.incidents.find(item => item.id === incident.id)?.stage;
assert(recoveryStage === 'RESOLVED', `Recovery should finish only at its deterministic verification week (received ${recoveryStage || 'missing'}, ready ${recovering.recoveryReadyAtAbsoluteWeek}, committed ${recoveredPlatform.crisisSecurity.infrastructureOperations.lastProcessedAbsoluteWeek}, lifecycle ${recoveredPlatform.lifecycle}, facilities ${recoveredPlatform.infrastructureSetup?.facilities?.length || 0}).`);

let assisted = withIncident(createFixture('ASSISTED'), 'phase9-assisted');
const assistedWeek = getAbsoluteWeek(assisted.age, assisted.currentWeek) + 1;
assisted = { ...assisted, ownedStreamingPlatform: commitStreamingInfrastructureOperationsWeek(assisted.ownedStreamingPlatform, assisted, snapshot(assistedWeek)) };
const assistedIncident = assisted.ownedStreamingPlatform.crisisSecurity.infrastructureOperations.incidents.find(item => item.id === 'phase9-assisted')!;
assert(assistedIncident.stage === 'RECOVERING' && assistedIncident.assistedHandled, 'Assisted Management should execute a policy-approved response inside its budget threshold.');
assert(assisted.ownedStreamingPlatform.crisisSecurity.infrastructureOperations.assistedResponseCount === 1, 'Assisted responses should be visibly counted.');

let handsOn = withIncident(createFixture('HANDS_ON'), 'phase9-hands-on');
const handsOnWeek = getAbsoluteWeek(handsOn.age, handsOn.currentWeek) + 1;
handsOn = { ...handsOn, ownedStreamingPlatform: commitStreamingInfrastructureOperationsWeek(handsOn.ownedStreamingPlatform, handsOn, snapshot(handsOnWeek)) };
assert(handsOn.ownedStreamingPlatform.crisisSecurity.infrastructureOperations.incidents.find(item => item.id === 'phase9-hands-on')?.stage === 'DETECTED', 'Hands-On Management should preserve the direct emergency decision for the player.');

const serviceSource = readFileSync(resolve(process.cwd(), 'services/streamingInfrastructureOperations.ts'), 'utf8');
const weeklySource = readFileSync(resolve(process.cwd(), 'services/streamingWeeklyLoop.ts'), 'utf8');
const commandSource = readFileSync(resolve(process.cwd(), 'components/StreamingIncidentCommand.tsx'), 'utf8');
const styleSource = readFileSync(resolve(process.cwd(), 'styles/streaming-infrastructure-operations.css'), 'utf8');
for (const eventType of ['POWER_FAILURE', 'COOLING_INCIDENT', 'FIBRE_CUT', 'TRAFFIC_SPIKE', 'REGIONAL_OUTAGE', 'CYBERATTACK', 'DDOS_ATTACK', 'RIVAL_SABOTAGE']) {
    assert(serviceSource.includes(eventType), `Phase 9 should model ${eventType}.`);
}
for (const surface of ['Emergency traffic command', 'PUBLIC REACTION', 'SUBSCRIBER REACTION', 'Maintenance windows', 'Assisted Management', 'Hands-On Management', 'Insurance recovery']) {
    assert(commandSource.includes(surface), `Incident Command should expose ${surface}.`);
}
assert(weeklySource.includes('getStreamingInfrastructureOperationsEffects') && weeklySource.includes('commitStreamingInfrastructureOperationsWeek'), 'Live infrastructure must feed the existing canonical weekly loop.');
assert(styleSource.includes('min-height: 44px') && styleSource.includes(':focus-visible') && styleSource.includes('@media (max-width: 420px)') && styleSource.includes('prefers-reduced-motion'), 'Live Operations should preserve mobile touch, keyboard and motion accessibility.');

console.log('EMPIRE+ Live Infrastructure Operations Phase 9 audit passed.');
