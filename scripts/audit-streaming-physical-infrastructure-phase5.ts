import { readFileSync } from 'node:fs';
import { INITIAL_PLAYER, type OwnedStreamingFacility, type Player } from '../types';
import {
    migratePlacementsToStreamingFacilities,
} from '../services/streamingFacilities';
import {
    createStreamingFacilityFromListing,
    getStreamingFacilityMarketplace,
} from '../services/streamingFacilityMarketplace';
import {
    applyStreamingFacilityRepair,
    getStreamingFacilityPhysicalView,
    getStreamingFacilityPhysicalUpgradeCost,
} from '../services/streamingInfrastructurePhysical';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import {
    commitStreamingInfrastructureSetup,
    createDefaultStreamingInfrastructureDraft,
    getStreamingInfrastructureForecast,
    runStreamingInfrastructureLoadTest,
    saveStreamingInfrastructureDraft,
    validateStreamingInfrastructureDraft,
} from '../services/streamingInfrastructure';
import {
    createDefaultStreamingFoundingDraft,
    incorporateOwnedStreamingPlatform,
    saveStreamingFoundingDraft,
} from '../services/streamingFounding';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const createIncorporatedPlayer = (): Player => {
    const eligible: Player = {
        ...clone(INITIAL_PLAYER),
        id: 'phase5-physical-founder',
        name: 'Physical Founder',
        money: 900_000_000,
        ownedStreamingPlatform: {
            ...clone(INITIAL_PLAYER.ownedStreamingPlatform),
            lifecycle: 'ELIGIBLE',
            simulationSeed: 'owned-streaming:phase5-physical-founder',
            milestoneKeys: ['streaming-launch-clearance'],
        },
    };
    const drafted = saveStreamingFoundingDraft(eligible, {
        ...createDefaultStreamingFoundingDraft(100),
        currentStep: 2,
        name: 'Utility+',
        dayOneMarketIds: ['US', 'CA'],
        launchServerCityId: null,
    });
    const incorporated = incorporateOwnedStreamingPlatform(drafted);
    assert(incorporated.changed, 'The physical commissioning fixture must incorporate.');
    return {
        ...incorporated.player,
        ownedStreamingPlatform: {
            ...incorporated.player.ownedStreamingPlatform,
            treasuryCash: 100_000_000,
        },
    };
};

const listing = getStreamingFacilityMarketplace('LA').find(item => item.facilityType === 'PRIVATE_CAGE');
assert(listing, 'The physical Phase 5 fixture needs a private cage listing.');
const facility = createStreamingFacilityFromListing(listing!, [], 'CORE_ORIGIN', listing!.rackPositions);
const baseline = getStreamingFacilityPhysicalView(facility);
assert(baseline.powerUsedKw > 0 && baseline.coolingUsedKw > 0 && baseline.bandwidthUsedMbps > 0, 'A facility must expose all physical workloads.');
assert(baseline.energyKwhWeekly > 0 && baseline.waterLitresWeekly > 0, 'Energy and water consumption must be deterministic and visible.');
assert(baseline.weeklyOperatingCost > 0, 'Physical operations must add weekly operating cost.');
assert(baseline.sustainabilityScore >= 0 && baseline.sustainabilityScore <= 100, 'Sustainability must remain a bounded score.');
assert(baseline.publicReputation >= 0 && baseline.publicReputation <= 100, 'Public reputation must remain a bounded score.');

const constrained: OwnedStreamingFacility = {
    ...facility,
    physical: {
        ...baseline.state,
        powerContractKw: Math.max(12, Math.round(baseline.powerUsedKw * .55)),
        coolingCapacityKw: Math.max(1, Math.round(baseline.coolingUsedKw * .55)),
        bandwidthMbps: Math.max(100, Math.round(baseline.bandwidthUsedMbps * .55)),
        maintenanceConditionPercent: 72,
    },
};
const constrainedView = getStreamingFacilityPhysicalView(constrained);
assert(constrainedView.usableCapacityFactor < baseline.usableCapacityFactor, 'The lowest physical envelope must reduce usable capacity.');
assert(['POWER', 'COOLING', 'BANDWIDTH', 'MAINTENANCE'].includes(constrainedView.limitingFactor), 'A constrained facility must name its limiting system.');
assert(constrainedView.repairActions.length > 0, 'A constrained facility must expose repair actions.');

const repaired = applyStreamingFacilityRepair(constrained, constrainedView.repairActions[0].id, 42);
assert(repaired.cost > 0 && repaired.summary.length > 0, 'A repair must have a disclosed cost and explanation.');
assert(repaired.facility.physical?.lastMaintenanceAbsoluteWeek === 42, 'Repairs must record the game week.');
assert(getStreamingFacilityPhysicalUpgradeCost(repaired.facility) > 0, 'Repair upgrades must remain visible as draft capital.');

const incorporated = createIncorporatedPlayer();
const canonicalDraft = createDefaultStreamingInfrastructureDraft(incorporated);
const canonicalFacilities = canonicalDraft.facilities?.length
    ? canonicalDraft.facilities
    : migratePlacementsToStreamingFacilities(canonicalDraft.networkPlacements);
const canonicalFacility = canonicalFacilities[0];
assert(canonicalFacility, 'Canonical infrastructure must materialize a physical facility.');
const healthyForecast = getStreamingInfrastructureForecast(incorporated, canonicalDraft);
const canonicalView = getStreamingFacilityPhysicalView(canonicalFacility!);
const bandwidthConstrainedFacility: OwnedStreamingFacility = {
    ...canonicalFacility!,
    physical: {
        ...canonicalView.state,
        bandwidthMbps: Math.max(100, Math.round(canonicalView.bandwidthUsedMbps * .45)),
        burstBandwidthMbps: Math.max(100, Math.round(canonicalView.bandwidthUsedMbps * .55)),
    },
};
const constrainedDraft = {
    ...canonicalDraft,
    facilities: [bandwidthConstrainedFacility, ...canonicalFacilities.slice(1)],
};
const constrainedForecast = getStreamingInfrastructureForecast(incorporated, constrainedDraft);
assert(constrainedForecast.baselineConcurrentStreams < healthyForecast.baselineConcurrentStreams, 'Canonical steady capacity must obey the physical floor.');
assert(constrainedForecast.burstConcurrentStreams < healthyForecast.burstConcurrentStreams, 'Canonical burst capacity must obey the burst fibre contract.');
assert(constrainedForecast.physicalLimitingFactors.some(item => item.includes('BANDWIDTH')), 'Canonical explanations must name the constrained facility system.');
assert(constrainedForecast.physicalWeeklyOperatingCost > 0 && constrainedForecast.energyKwhWeekly > 0, 'Canonical weekly economics must include physical utilities.');
assert(constrainedForecast.configurationSignature !== healthyForecast.configurationSignature, 'Physical edits must invalidate the exact load-test signature.');

const bandwidthRepair = applyStreamingFacilityRepair(bandwidthConstrainedFacility, 'ADD_BANDWIDTH', 42);
const repairedDraft = {
    ...constrainedDraft,
    facilities: [bandwidthRepair.facility, ...(constrainedDraft.facilities || []).slice(1)],
};
const repairedForecast = getStreamingInfrastructureForecast(incorporated, repairedDraft);
assert(repairedForecast.baselineConcurrentStreams > constrainedForecast.baselineConcurrentStreams, 'A bandwidth repair must restore canonical steady capacity.');
assert(repairedForecast.physicalUpgradeCapitalCost === bandwidthRepair.cost, 'Canonical capital must disclose the exact drafted repair cost.');
assert(repairedForecast.configurationSignature !== constrainedForecast.configurationSignature, 'A repair must require a new load test.');

const savedRepair = saveStreamingInfrastructureDraft(incorporated, repairedDraft);
assert(validateStreamingInfrastructureDraft(savedRepair).issues.some(issue => issue.code === 'LOAD_TEST_REQUIRED'), 'A repaired drawing must not reuse an earlier rehearsal.');
const testedRepair = runStreamingInfrastructureLoadTest(savedRepair);
const committedRepair = commitStreamingInfrastructureSetup(testedRepair.player);
assert(committedRepair.changed, 'A tested physical repair drawing must commission atomically.');
assert(committedRepair.player.ownedStreamingPlatform.infrastructureSetup?.physicalSummary, 'Commissioning must freeze the physical utility summary.');
assert(
    committedRepair.player.ownedStreamingPlatform.infrastructureSetup?.physicalSummary?.reliabilityPercent
        === committedRepair.forecast.physicalReliabilityPercent,
    'The commissioned physical summary must not disguise architecture bonuses as facility reliability.',
);
assert(
    committedRepair.player.ownedStreamingPlatform.infrastructureSetup?.weeklyOperatingCost === committedRepair.forecast.weeklyOperatingCost,
    'The weekly loop must receive the same physical operating cost disclosed by commissioning.',
);
assert(
    committedRepair.player.ownedStreamingPlatform.treasuryCash
        === testedRepair.player.ownedStreamingPlatform.treasuryCash - committedRepair.forecast.transactionCost,
    'Physical capital must move only from company treasury at commissioning.',
);

const migrated = normalizeOwnedStreamingPlatformState({
    schemaVersion: 3,
    infrastructureSetupDraft: {
        strategy: 'HYBRID', capacityPackageId: 'STARTER', rolloutPace: 'STANDARD',
        subscriptionPrices: { BASIC: 7.99, PREMIUM: 13.99, FAMILY: 18.99 },
        networkPlacements: [{ cityId: 'LA', racks: 2, role: 'CORE_ORIGIN' }],
        facilities: [{ id: 'LEGACY-LA', cityId: 'LA', type: 'RENTED_CABINET', installedRacks: 1, role: 'CORE_ORIGIN' }],
        lastLoadTestSignature: null, updatedAtAbsoluteWeek: 1,
    },
}, 'phase5-physical-migration');
assert(migrated.infrastructureSetupDraft?.facilities?.[0]?.physical, 'Legacy facility saves must receive physical defaults.');
assert(migrated.infrastructureSetupDraft?.facilities?.[0]?.physical?.powerUpgradeCount === 0, 'Legacy saves must receive zero-cost upgrade counters.');
const explicitModes = normalizeOwnedStreamingPlatformState({
    ...migrated,
    infrastructureSetupDraft: {
        ...migrated.infrastructureSetupDraft!,
        facilities: migrated.infrastructureSetupDraft!.facilities!.map(item => ({
            ...item,
            physical: { ...item.physical!, backupPowerMode: 'NONE' as const, coolingMode: 'AIR' as const },
        })),
    },
}, 'phase5-explicit-physical-modes');
assert(explicitModes.infrastructureSetupDraft?.facilities?.[0]?.physical?.backupPowerMode === 'NONE', 'Explicit no-backup contracts must survive normalization.');
assert(explicitModes.infrastructureSetupDraft?.facilities?.[0]?.physical?.coolingMode === 'AIR', 'Explicit air cooling must survive normalization.');

/**
 * The Build UI is no longer one file. The physical-infrastructure redesign
 * extracted the per-facility room (gauges, the limiting-supply flag and the
 * repair attached to it) into StreamingFacilityRoom.tsx, and the network map
 * into StreamingBuildNetworkMap.tsx. The player-facing contract below is
 * unchanged; it is simply composed from three modules now, so the audit reads
 * the composed surface rather than the one file it used to all live in.
 */
const buildSource = [
    'components/streaming-transplant/StreamingBuildoutExperience.tsx',
    'components/streaming-transplant/StreamingFacilityRoom.tsx',
    'components/streaming-transplant/StreamingBuildNetworkMap.tsx',
].map(path => readFileSync(path, 'utf8')).join('\n');
const physicalSource = readFileSync('services/streamingInfrastructurePhysical.ts', 'utf8');
const styleSource = readFileSync('components/streaming-transplant/presentation/screens/Buildout/Buildout.module.css', 'utf8');
['PHYSICAL LIMITS', 'Physical infrastructure', 'LEASE ANOTHER CAGE', 'MOVE RACK GROUP', 'team-monitored · you approve'].forEach(fragment => {
    assert(buildSource.includes(fragment), `Build UI must expose ${fragment}.`);
});

/**
 * Water and energy were two of eight abstract cells in a grid the redesign
 * removed. They still have to be surfaced — they are the environmental cost of
 * the estate — so this asserts the fact is shown, not the exact wording.
 */
assert(
    /water\s*\/\s*week/i.test(buildSource) && /energy\s*\/\s*week/i.test(buildSource),
    'Build UI must still surface the weekly water and energy draw.',
);

/**
 * The point of the redesign: each supply is shown against its own contract, and
 * the room names which one is the ceiling. Asserting the mechanism keeps this
 * meaningful after the next copy change.
 */
assert(
    buildSource.includes('powerUsedKw') && buildSource.includes('coolingUsedKw')
    && buildSource.includes('bandwidthUsedMbps') && buildSource.includes('limitingFactor'),
    'Each facility must show its supplies against contract and name the limiting one.',
);
['powerContractKw', 'coolingCapacityKw', 'bandwidthMbps', 'maintenanceConditionPercent', 'sustainabilityScore', 'publicReputation', 'Upgrade Power', 'Improve Cooling', 'Add Bandwidth', 'Replace Failing Equipment', 'steadyCapacityFactor', 'burstCapacityFactor'].forEach(fragment => {
    assert(physicalSource.includes(fragment), `Physical model must include ${fragment}.`);
});
assert(styleSource.includes('.physicalpanel') && styleSource.includes('safe-area-inset-bottom'), 'Physical panel must use the mobile build surface and safe-area styling.');

console.log('EMPIRE+ Phase 5 physical infrastructure audit passed.');
