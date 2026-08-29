import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    INITIAL_PLAYER,
    createInitialOwnedStreamingPlatformState,
    type OwnedStreamingCampusProject,
    type OwnedStreamingFacility,
    type OwnedStreamingInfrastructureIncident,
    type OwnedStreamingPlatformState,
    type OwnedStreamingWeeklySnapshot,
    type Player,
    type StreamingFacilityType,
    type StreamingInfrastructureProgressionTier,
} from '../types';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import {
    STREAMING_INFRASTRUCTURE_PROGRESSION_STAGES,
    commitStreamingInfrastructureProgressionWeek,
    getStreamingInfrastructureChronicle,
    resolveStreamingInfrastructureProgressionTier,
} from '../services/streamingInfrastructureProgression';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const makeSnapshot = (absoluteWeek: number): OwnedStreamingWeeklySnapshot => ({
    id: `phase10-week-${absoluteWeek}`,
    absoluteWeek,
    subscribers: 8_400_000,
    netSubscriberMovement: 75_000,
    churnRate: .021,
    engagementRate: .74,
    averageRevenuePerUser: 12.4,
    cashRunwayWeeks: 48,
    technologyHealth: 96,
    causeMarkers: ['PHASE_10_FINALE'],
    operations: {
        playbackSuccessRate: 99.91,
        capacityUtilizationPercent: 68,
        peakConcurrentStreams: 2_720_000,
    } as OwnedStreamingWeeklySnapshot['operations'],
});

const makeFacility = (type: StreamingFacilityType, racks = 28): OwnedStreamingFacility => ({
    id: `phase10-${type.toLowerCase()}`,
    cityId: 'MUMBAI',
    type,
    installedRacks: racks,
    role: 'CORE_ORIGIN',
    rackGroups: [
        { id: 'phase10-origin', name: 'Origin', rackCount: Math.ceil(racks / 2), duty: 'CONTENT_ORIGIN' },
        { id: 'phase10-platform', name: 'Platform', rackCount: Math.floor(racks / 2), duty: 'PLATFORM_SERVICES' },
    ],
});

const makeFixture = (): Player => {
    const base = structuredClone(INITIAL_PLAYER) as Player;
    const initial = createInitialOwnedStreamingPlatformState('phase10-finale-player');
    const platform = normalizeOwnedStreamingPlatformState({
        ...initial,
        lifecycle: 'ACTIVE',
        treasuryCash: 900_000_000,
        launchCommit: {
            id: 'phase10-launch', idempotencyKey: 'phase10-launch', committedAtAbsoluteWeek: 2_000,
            capacityPlan: 'CLOUD_BURST', capacityPlanCost: 0, readinessScore: 94,
            forecastLikelyConcurrentStreams: 1_800_000, forecastHighConcurrentStreams: 3_100_000,
            protectedPeakConcurrentStreams: 4_000_000, launchHeadroomPercent: 29,
            initialSubscribers: 4_000_000, openingDemandIndex: 86, playbackSuccessRate: 99.7,
            outcomeTier: 'SMOOTH_OPENING', openingTitleCount: 10, openingOriginalTitle: 'Signal City',
        },
        capacity: { baselineConcurrentStreams: 3_000_000, burstConcurrentStreams: 4_000_000 },
        infrastructureSetup: {
            capacityPackageId: 'GROWTH', rolloutPace: 'STANDARD', storageCapacityHours: 80_000,
            reliabilityTarget: 99.8, weeklyOperatingCost: 3_200_000, staffRequired: 34,
            capitalInvested: 180_000_000, technicalDebt: 2,
            networkPlacements: [{ cityId: 'MUMBAI', racks: 28, role: 'CORE_ORIGIN' }],
            facilities: [makeFacility('PRIVATE_CAGE')],
            readyAtAbsoluteWeek: 1_990, revision: 1, committedAtAbsoluteWeek: 1_985,
            loadTest: {
                configurationSignature: 'phase10-load', forecastLowConcurrentStreams: 1_000_000,
                forecastLikelyConcurrentStreams: 1_800_000, forecastHighConcurrentStreams: 3_100_000,
                testedBurstCapacity: 4_000_000, headroomPercent: 29, status: 'PASS',
                driverKeys: ['phase10'], completedAtAbsoluteWeek: 1_999,
            },
        },
    }, 'phase10-finale-player');
    return { ...base, id: 'phase10-finale-player', age: 41, currentWeek: 1, ownedStreamingPlatform: platform };
};

const withFacilityType = (platform: OwnedStreamingPlatformState, type: StreamingFacilityType): OwnedStreamingPlatformState => ({
    ...platform,
    infrastructureSetup: {
        ...platform.infrastructureSetup!,
        facilities: [makeFacility(type)],
    },
});

const gigaProject: OwnedStreamingCampusProject = {
    id: 'phase10-giga', idempotencyKey: 'phase10-giga', name: 'Mumbai Giga Campus', cityId: 'MUMBAI',
    scale: 'GIGA_CAMPUS', status: 'OPEN', stage: 'COMMISSIONING', currentStageOptionId: 'COMMISSION_FORENSIC',
    campusDesignId: 'DESIGN_GIGA', utilitiesPackageId: 'UTILITY_HYPERSCALE', systemsPackageId: 'SYSTEM_LIQUID',
    rackPackageId: 'RACK_BALANCED', hallCount: 3, rackCapacity: 96, installedRacks: 72,
    landCost: 200_000_000, capitalCommitted: 1_100_000_000, weeklyOperatingCost: 9_000_000,
    staffRequired: 100, startedAtAbsoluteWeek: 1_900, stageStartedAtAbsoluteWeek: 1_990,
    stageReadyAtAbsoluteWeek: 1_999, openedAtAbsoluteWeek: 2_000, facilityId: 'phase10-owned_data_centre',
    events: [], expansionCount: 0, expansionReadyAtAbsoluteWeek: null,
};

const migrated = normalizeOwnedStreamingPlatformState({ schemaVersion: 4 }, 'phase10-old-save');
assert(migrated.crisisSecurity.infrastructureOperations.reliabilityStreakWeeks === 0, 'Old saves should receive a safe reliability streak default.');
assert(migrated.crisisSecurity.infrastructureOperations.lastProgressionTier === 'RENTED_CABINET', 'Old saves should enter the physical progression at the non-destructive base tier.');
assert(migrated.crisisSecurity.infrastructureOperations.performanceHistory.length === 0, 'Migration must not fabricate historic performance.');
assert(migrated.crisisSecurity.infrastructureOperations.awards.length === 0, 'Migration must not fabricate infrastructure awards.');

const fixture = makeFixture();
const tierCases: Array<[StreamingFacilityType, StreamingInfrastructureProgressionTier]> = [
    ['RENTED_CABINET', 'RENTED_CABINET'],
    ['PRIVATE_CAGE', 'PRIVATE_CAGE'],
    ['DEDICATED_DATA_HALL', 'DEDICATED_HALL'],
    ['OWNED_DATA_CENTRE', 'OWNED_DATA_CENTRE'],
];
for (const [facilityType, expectedTier] of tierCases) {
    assert(resolveStreamingInfrastructureProgressionTier(withFacilityType(fixture.ownedStreamingPlatform, facilityType)) === expectedTier, `${facilityType} should resolve to ${expectedTier} without transforming the facility.`);
}
const globalPlatform = { ...withFacilityType(fixture.ownedStreamingPlatform, 'OWNED_DATA_CENTRE'), campusProjects: [gigaProject] };
assert(resolveStreamingInfrastructureProgressionTier(globalPlatform) === 'GLOBAL_HYPERSCALE_CAMPUS', 'Only an open Giga Campus should reach the global hyperscale tier.');
assert(STREAMING_INFRASTRUCTURE_PROGRESSION_STAGES.map(stage => stage.label).join('|') === 'Rented Cabinet|Private Cage|Dedicated Hall|Owned Data Centre|Global Hyperscale Campus', 'The final five-tier physical progression must remain explicit and ordered.');

let player = fixture;
let committed = commitStreamingInfrastructureProgressionWeek(player.ownedStreamingPlatform, player, makeSnapshot(2_001));
assert(committed.crisisSecurity.infrastructureOperations.performanceHistory.length === 1, 'The finale should persist the first weekly physical-performance point.');
assert(committed.crisisSecurity.infrastructureOperations.performanceHistory[0].energyKwhWeekly > 0, 'Performance history should disclose physical energy use.');
assert(committed.crisisSecurity.infrastructureOperations.performanceHistory[0].weeklyOperatingCost === 3_200_000, 'Performance history should preserve the canonical commissioned weekly cost.');
assert(committed.cinematicQueue.some(event => event.type === 'SERVER_HALL_EVOLUTION'), 'Crossing from the base tier to a private cage should queue a server-hall evolution scene.');
assert(commitStreamingInfrastructureProgressionWeek(committed, player, makeSnapshot(2_001)).crisisSecurity.infrastructureOperations.performanceHistory.length === 1, 'The weekly finale processor must be idempotent.');

player = { ...player, ownedStreamingPlatform: committed };
for (let week = 2_002; week <= 2_106; week += 1) {
    committed = commitStreamingInfrastructureProgressionWeek(player.ownedStreamingPlatform, player, makeSnapshot(week));
    player = { ...player, ownedStreamingPlatform: committed };
}
const operations = committed.crisisSecurity.infrastructureOperations;
assert(operations.performanceHistory.length === 104 && operations.performanceHistory[0].absoluteWeek === 2_003, 'The save should retain a bounded two-year weekly chart history.');
assert(operations.awards.filter(award => award.category === 'RELIABILITY_LEADERSHIP').length === 1, 'Sustained reliability should earn its evidence-backed award exactly once.');
assert(committed.cinematicQueue.some(event => event.type === 'GLOBAL_RELIABILITY_MILESTONE'), 'The reliability award should create a replayable global milestone scene.');

const recoveryWeek = 2_107;
const recoveredIncident: OwnedStreamingInfrastructureIncident = {
    id: 'phase10-recovery', idempotencyKey: 'phase10-recovery', type: 'REGIONAL_OUTAGE', severity: 'MAJOR', stage: 'RESOLVED',
    title: 'Mumbai regional outage', detail: 'The route was restored.', cause: 'Carrier and cooling pressure overlapped.',
    facilityId: 'phase10-private_cage', cityId: 'MUMBAI', detectedAtAbsoluteWeek: recoveryWeek - 1,
    affectedSubscribers: 500_000, capacityLossPercent: 25, conditionLossPercent: 4, responseAction: 'REROUTE_TRAFFIC',
    rerouteFacilityId: null, compensation: 'TARGETED', insuranceClaimed: false, responseCost: 4_000_000,
    insuranceRecovery: 0, recoveryReadyAtAbsoluteWeek: recoveryWeek, resolvedAtAbsoluteWeek: recoveryWeek,
    assistedHandled: false, publicReaction: 'The audience saw recovery.', subscriberReaction: 'Playback returned.', outcomeNote: 'Verification passed.',
};
player = {
    ...player,
    ownedStreamingPlatform: {
        ...committed,
        crisisSecurity: {
            ...committed.crisisSecurity,
            infrastructureOperations: { ...operations, incidents: [recoveredIncident] },
        },
    },
};
committed = commitStreamingInfrastructureProgressionWeek(player.ownedStreamingPlatform, player, makeSnapshot(recoveryWeek));
assert(committed.crisisSecurity.infrastructureOperations.awards.some(award => award.category === 'RECOVERY_EXCELLENCE'), 'A verified major recovery should earn the recovery citation from persisted incident evidence.');
assert(committed.cinematicQueue.some(event => event.type === 'INFRASTRUCTURE_AWARDS'), 'Infrastructure distinctions should enter the cinematic archive.');

player = { ...player, ownedStreamingPlatform: committed };
const chronicle = getStreamingInfrastructureChronicle(player);
assert(chronicle.available && chronicle.history.length === 104, 'The HQ Chronicle should read the persisted bounded history.');
assert(chronicle.causalExplanations.length === 4, 'Performance charts should explain condition, capacity, energy and economy causally.');
assert(chronicle.balance.weeklyCost === 3_200_000 && chronicle.balance.energyPerRack > 0, 'The balance screen should expose canonical economy and physical energy values.');

const serviceSource = readFileSync(resolve(process.cwd(), 'services/streamingInfrastructureProgression.ts'), 'utf8');
const weeklySource = readFileSync(resolve(process.cwd(), 'services/streamingWeeklyLoop.ts'), 'utf8');
const researchSource = readFileSync(resolve(process.cwd(), 'services/streamingResearchLifecycle.ts'), 'utf8');
const campusSource = readFileSync(resolve(process.cwd(), 'services/streamingCampusConstruction.ts'), 'utf8');
const componentSource = readFileSync(resolve(process.cwd(), 'components/StreamingInfrastructureChronicle.tsx'), 'utf8');
const styleSource = readFileSync(resolve(process.cwd(), 'styles/streaming-infrastructure-chronicle.css'), 'utf8');
const hqSource = readFileSync(resolve(process.cwd(), 'components/StreamingPlatformHQ.tsx'), 'utf8');
for (const scene of ['FACILITY_OPENING', 'SERVER_HALL_EVOLUTION', 'GIGA_CAMPUS_CONSTRUCTION', 'INFRASTRUCTURE_RECOVERY', 'PATENT_ANNOUNCEMENT', 'RIVAL_ESPIONAGE_STORY', 'INFRASTRUCTURE_AWARDS', 'GLOBAL_RELIABILITY_MILESTONE']) {
    assert(serviceSource.includes(scene) || researchSource.includes(scene) || campusSource.includes(scene), `Phase 10 should orchestrate ${scene}.`);
}
for (const surface of ['Evolution', 'Performance', 'Cinema', 'Balance', 'CAUSAL EXPLANATIONS', 'FINAL BALANCE CONTRACT']) {
    assert(componentSource.includes(surface), `The Infrastructure Chronicle should expose ${surface}.`);
}
assert(weeklySource.includes('commitStreamingInfrastructureProgressionWeek'), 'Progression must commit through the canonical weekly loop.');
assert(researchSource.includes("type: 'PATENT_ANNOUNCEMENT'") && researchSource.includes("stage: 'READY_TO_INSTALL'"), 'Patent cinema must preserve research and installation as separate decisions.');
assert(campusSource.includes("type: 'FACILITY_OPENING'"), 'Opening a constructed campus should queue the dedicated facility-opening scene.');
/* The Chronicle is now opened from the Network Desk, gated on availability,
   rather than by a standalone button in the retired Tech room. */
assert(
    hqSource.includes('showInfrastructureChronicle')
    && hqSource.includes('onOpenChronicle')
    && hqSource.includes('infrastructureChronicle.available'),
    'The finale Chronicle must be reachable, and only once it is available.',
);
assert(styleSource.includes('min-height: 44px') && styleSource.includes(':focus-visible') && styleSource.includes('safe-area-inset') && styleSource.includes('@media(max-width:600px)') && styleSource.includes('prefers-reduced-motion'), 'The finale should include mobile touch, safe-area, keyboard and reduced-motion accessibility.');

console.log('EMPIRE+ Cinematics, Progression and Final Balancing Phase 10 audit passed.');
