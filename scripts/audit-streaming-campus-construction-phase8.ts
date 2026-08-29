import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    INITIAL_PLAYER,
    createInitialOwnedStreamingPlatformState,
    type OwnedStreamingCampusProject,
    type Player,
} from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { STREAMING_FACILITY_CONTRACTS } from '../services/streamingFacilities';
import {
    STREAMING_CAMPUS_FLOW_LABELS,
    STREAMING_CAMPUS_STAGE_ORDER,
    approveStreamingCampusStage,
    completeDueStreamingCampusProjects,
    getStreamingCampusConstruction,
    openStreamingCampusFacility,
    startStreamingCampusExpansion,
    startStreamingCampusProject,
} from '../services/streamingCampusConstruction';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const atAbsoluteWeek = (player: Player, absoluteWeek: number): Player => ({
    ...player,
    age: Math.floor(absoluteWeek / 52) + 1,
    currentWeek: (absoluteWeek % 52) + 1,
});

const createFixture = (): Player => {
    const player = structuredClone(INITIAL_PLAYER) as Player;
    const initial = createInitialOwnedStreamingPlatformState('phase8-campus-player');
    const absoluteWeek = getAbsoluteWeek(48, 14);
    return {
        ...player,
        id: 'phase8-campus-player',
        age: 48,
        currentWeek: 14,
        ownedStreamingPlatform: {
            ...initial,
            lifecycle: 'ACTIVE',
            treasuryCash: 3_000_000_000,
            infrastructureStrategy: 'HYBRID',
            milestoneKeys: ['research-unlock:giga-campus'],
            researchPrograms: [{
                id: 'research-giga-campus',
                idempotencyKey: 'research:giga-campus',
                definitionId: 'giga-campus',
                title: 'Giga Campus',
                category: 'EXPERIMENTAL_TECHNOLOGY',
                stage: 'READY_TO_INSTALL',
                buildMode: 'HARDENED',
                ipStrategy: 'PATENT',
                researchCost: 35_000_000,
                patentCost: 24_000_000,
                installationCost: 0,
                weeklyOperatingCost: 0,
                licenseWeeklyCost: 0,
                staffRequired: 18,
                researchWeeks: 4,
                prototypeWeeks: 2,
                testWeeks: 2,
                installationWeeks: 0,
                startedAtAbsoluteWeek: absoluteWeek - 10,
                stageStartedAtAbsoluteWeek: absoluteWeek - 1,
                stageReadyAtAbsoluteWeek: absoluteWeek - 1,
                installationTargetType: 'CONSTRUCTION_PROGRAM',
                installationTargetId: null,
                installationTargetLabel: null,
                rivalInterestPercent: 24,
                completedAtAbsoluteWeek: null,
            }],
            infrastructureSetup: {
                capacityPackageId: 'GROWTH',
                rolloutPace: 'STANDARD',
                storageCapacityHours: 70_000,
                reliabilityTarget: 99.8,
                weeklyOperatingCost: 1_400_000,
                staffRequired: 22,
                capitalInvested: 90_000_000,
                technicalDebt: 3,
                networkPlacements: [{ cityId: 'MUMBAI', racks: 12, role: 'CORE_ORIGIN' }],
                facilities: [{
                    id: 'facility-mumbai-private', cityId: 'MUMBAI', type: 'PRIVATE_CAGE', installedRacks: 12, role: 'CORE_ORIGIN',
                    rackGroups: [
                        { id: 'rack-origin', name: 'Origin', rackCount: 7, duty: 'CONTENT_ORIGIN' },
                        { id: 'rack-platform', name: 'Platform', rackCount: 5, duty: 'PLATFORM_SERVICES' },
                    ],
                }],
                readyAtAbsoluteWeek: absoluteWeek - 8,
                revision: 1,
                committedAtAbsoluteWeek: absoluteWeek - 10,
                loadTest: {
                    configurationSignature: 'phase8-campus-load',
                    forecastLowConcurrentStreams: 800_000,
                    forecastLikelyConcurrentStreams: 1_400_000,
                    forecastHighConcurrentStreams: 2_100_000,
                    testedBurstCapacity: 4_000_000,
                    headroomPercent: 48,
                    status: 'PASS',
                    driverKeys: ['phase8'],
                    completedAtAbsoluteWeek: absoluteWeek - 9,
                },
            },
            capacity: { baselineConcurrentStreams: 2_000_000, burstConcurrentStreams: 4_000_000 },
        },
    };
};

const migrated = normalizeOwnedStreamingPlatformState({ schemaVersion: 21 }, 'phase8-old-save');
assert(Array.isArray(migrated.campusProjects) && migrated.campusProjects.length === 0, 'Old saves should migrate with an empty campus project portfolio.');
assert(migrated.schemaVersion === 23, 'Phase 8 should preserve the canonical schema v23 migration target.');
assert(STREAMING_CAMPUS_FLOW_LABELS.length === 10, 'The player-facing campus flow should expose all ten gates.');
assert(STREAMING_CAMPUS_STAGE_ORDER.length === 7, 'Land and opening should frame seven accountable post-land construction stages.');
const ownedContract = STREAMING_FACILITY_CONTRACTS.find(item => item.type === 'OWNED_DATA_CENTRE')!;
assert(ownedContract.marketplaceVisible && !ownedContract.playerSelectable, 'Owned data centres should stay visible but impossible to auto-buy through the ordinary marketplace.');

let fixture = createFixture();
const initialFacilityCount = fixture.ownedStreamingPlatform.infrastructureSetup!.facilities!.length;
const initialTreasury = fixture.ownedStreamingPlatform.treasuryCash;
const constructionView = getStreamingCampusConstruction(fixture);
assert(constructionView.available && constructionView.researchReady && constructionView.cities.length > 5, 'Cleared research should expose the canonical city catalog.');
const city = constructionView.cities.find(item => item.id === 'MUMBAI') || constructionView.cities[0];
const started = startStreamingCampusProject(fixture, city.id, 'GIGA_CAMPUS');
assert(started.changed && started.project?.stage === 'PERMITS', 'Land purchase should create a persisted permit-stage project.');
fixture = started.player;
let project = started.project!;
assert(fixture.ownedStreamingPlatform.treasuryCash === initialTreasury - city.gigaLandCost, 'Starting construction should charge land only.');
assert(fixture.ownedStreamingPlatform.infrastructureSetup!.facilities!.length === initialFacilityCount, 'Buying land must not create a live facility.');
assert(!startStreamingCampusProject(fixture, city.id, 'OWNED_DATA_CENTRE').changed, 'Only one major campus construction project should run at a time.');

const stageOptions: Record<OwnedStreamingCampusProject['stage'], string> = {
    PERMITS: 'PERMIT_COMMUNITY',
    UTILITIES: 'UTILITY_HYPERSCALE',
    DESIGN: 'DESIGN_GIGA',
    SYSTEMS: 'SYSTEM_LIQUID',
    DATA_HALLS: 'HALL_THREE',
    RACK_INSTALLATION: 'RACK_BALANCED',
    COMMISSIONING: 'COMMISSION_FORENSIC',
};

for (const expectedStage of STREAMING_CAMPUS_STAGE_ORDER) {
    project = fixture.ownedStreamingPlatform.campusProjects.find(item => item.id === project.id)!;
    assert(project.stage === expectedStage && project.status === 'AWAITING_DECISION', `${expectedStage} should wait for an explicit CEO choice.`);
    const beforeApprovalTreasury = fixture.ownedStreamingPlatform.treasuryCash;
    const approved = approveStreamingCampusStage(fixture, project.id, stageOptions[expectedStage]);
    assert(approved.changed && approved.project?.status === 'IN_PROGRESS', `${expectedStage} should schedule construction after approval.`);
    fixture = approved.player;
    project = approved.project!;
    assert(fixture.ownedStreamingPlatform.treasuryCash < beforeApprovalTreasury, `${expectedStage} should charge its own separate capital order.`);
    assert(fixture.ownedStreamingPlatform.infrastructureSetup!.facilities!.length === initialFacilityCount, `${expectedStage} must not create operating capacity before opening.`);

    const beforeDue = completeDueStreamingCampusProjects(fixture.ownedStreamingPlatform, project.stageReadyAtAbsoluteWeek - 1);
    assert(beforeDue.completedStages.length === 0, `${expectedStage} should not complete before its game-week deadline.`);
    let dueWeek = project.stageReadyAtAbsoluteWeek;
    let completed = completeDueStreamingCampusProjects(fixture.ownedStreamingPlatform, dueWeek);
    fixture = atAbsoluteWeek({ ...fixture, ownedStreamingPlatform: completed.platform }, dueWeek);
    project = fixture.ownedStreamingPlatform.campusProjects.find(item => item.id === project.id)!;
    if (!completed.completedStages.length) {
        assert(project.status === 'DELAYED' && project.events.length > 0, `${expectedStage} should only miss completion when a persisted deterministic event delays it.`);
        dueWeek = project.stageReadyAtAbsoluteWeek;
        completed = completeDueStreamingCampusProjects(fixture.ownedStreamingPlatform, dueWeek);
        fixture = atAbsoluteWeek({ ...fixture, ownedStreamingPlatform: completed.platform }, dueWeek);
    }
    assert(completed.completedStages.length === 1, `${expectedStage} should advance exactly once after any deterministic delay.`);
}

project = fixture.ownedStreamingPlatform.campusProjects.find(item => item.id === project.id)!;
assert(project.status === 'READY_TO_OPEN', 'Commissioning completion should stop at an explicit opening decision.');
assert(project.installedRacks === 72 && project.rackCapacity === 96, 'The approved three-hall rack plan should persist physical installed and ceiling counts.');
assert(fixture.ownedStreamingPlatform.infrastructureSetup!.facilities!.length === initialFacilityCount, 'Commissioning readiness still must not create capacity.');

const beforeOpeningCost = fixture.ownedStreamingPlatform.infrastructureSetup!.weeklyOperatingCost;
const beforeOpeningCapacity = fixture.ownedStreamingPlatform.capacity.baselineConcurrentStreams;
const opened = openStreamingCampusFacility(fixture, project.id);
assert(opened.changed && opened.facility?.type === 'OWNED_DATA_CENTRE', 'Opening should create the canonical owned facility type.');
fixture = opened.player;
project = fixture.ownedStreamingPlatform.campusProjects.find(item => item.id === project.id)!;
const openedFacility = fixture.ownedStreamingPlatform.infrastructureSetup!.facilities!.find(item => item.id === project.facilityId)!;
assert(project.status === 'OPEN' && fixture.ownedStreamingPlatform.infrastructureSetup!.facilities!.length === initialFacilityCount + 1, 'Opening should connect exactly one facility to the existing network simulation.');
assert(openedFacility.rackGroups!.reduce((sum, group) => sum + group.rackCount, 0) === openedFacility.installedRacks, 'Opened rack groups should sum to the physical installed rack count.');
assert(new Set(openedFacility.rackGroups!.map(group => group.duty)).size >= 4, 'Balanced racks should carry distinct origin, cache, encoding and platform duties.');
assert(Boolean(openedFacility.physical) && fixture.ownedStreamingPlatform.infrastructureSetup!.physicalSummary!.energyKwhWeekly > 0, 'Opening should join the canonical physical power, cooling and bandwidth model.');
assert(fixture.ownedStreamingPlatform.infrastructureSetup!.weeklyOperatingCost > beforeOpeningCost, 'Opening should add the campus weekly operating cost.');
assert(fixture.ownedStreamingPlatform.capacity.baselineConcurrentStreams > beforeOpeningCapacity, 'Owned racks should increase the same canonical capacity used by weekly demand.');
assert(fixture.ownedStreamingPlatform.researchPrograms.find(item => item.definitionId === 'giga-campus')?.stage === 'OPERATING', 'Opening the exact construction target should move Giga research to OPERATING.');
assert(fixture.ownedStreamingPlatform.cinematicQueue.some(item => item.title.includes(project.name) && item.priority === 'MAJOR'), 'The first campus opening should queue a major cinematic milestone.');
assert(!openStreamingCampusFacility(fixture, project.id).changed, 'Opening must be idempotent.');

const racksBeforeExpansion = project.installedRacks;
const expansion = startStreamingCampusExpansion(fixture, project.id);
assert(expansion.changed, 'An open campus below its ceiling should allow another building expansion.');
fixture = expansion.player;
project = fixture.ownedStreamingPlatform.campusProjects.find(item => item.id === project.id)!;
assert(project.installedRacks === racksBeforeExpansion && project.expansionReadyAtAbsoluteWeek != null, 'Funding expansion should schedule it without granting racks immediately.');
const expansionEarly = completeDueStreamingCampusProjects(fixture.ownedStreamingPlatform, project.expansionReadyAtAbsoluteWeek! - 1);
assert(expansionEarly.openedExpansions.length === 0, 'Expansion capacity should not appear before its game-week deadline.');
const expansionDue = completeDueStreamingCampusProjects(fixture.ownedStreamingPlatform, project.expansionReadyAtAbsoluteWeek!);
assert(expansionDue.openedExpansions.length === 1 && expansionDue.openedExpansions[0].installedRacks === 104 && expansionDue.openedExpansions[0].hallCount === 4, 'A completed Giga expansion should add a real fourth building and commissioned racks.');
assert(expansionDue.platform.capacity.baselineConcurrentStreams > fixture.ownedStreamingPlatform.capacity.baselineConcurrentStreams, 'Expansion racks should increase canonical demand capacity only when the building opens.');

const serviceSource = readFileSync(resolve(process.cwd(), 'services/streamingCampusConstruction.ts'), 'utf8');
const componentSource = readFileSync(resolve(process.cwd(), 'components/StreamingCampusConstruction.tsx'), 'utf8');
const componentCss = readFileSync(resolve(process.cwd(), 'styles/streaming-campus-construction.css'), 'utf8');
const hqSource = readFileSync(resolve(process.cwd(), 'components/StreamingPlatformHQ.tsx'), 'utf8');
for (const eventType of ['PERMIT_DELAY', 'CONTRACTOR_OVERRUN', 'GRID_SHORTAGE', 'WATER_RESTRICTION', 'LOCAL_OPPOSITION', 'FIBRE_DISPUTE', 'COOLING_DEFECT', 'INDUSTRIAL_ESPIONAGE']) {
    assert(serviceSource.includes(eventType), `Phase 8 should model ${eventType}.`);
}
assert(componentSource.includes('STREAMING_CAMPUS_FLOW_LABELS') && componentSource.includes('Construction record'), 'The UI should show the full flow and persisted event history.');
assert(componentSource.includes('there are no real-world timers or paid skips'), 'Construction timing should be explained in simple game-week language.');
assert(componentCss.includes('@media (max-width: 520px)') && componentCss.includes('min-height: 44px'), 'The campus screen should preserve mobile layout and touch targets.');
assert(componentCss.includes(':focus-visible') && componentCss.includes('@media (prefers-reduced-motion: reduce)'), 'The campus screen should include keyboard focus and reduced-motion support.');
assert(hqSource.includes('showCampusConstruction') && hqSource.includes('research-unlock:giga-campus'), 'HQ should retain a direct launcher after the research handoff.');

console.log('Streaming campus construction Phase 8 audit passed.');
