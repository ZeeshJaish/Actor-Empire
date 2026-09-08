import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    INITIAL_PLAYER,
    OWNED_STREAMING_PLATFORM_SCHEMA_VERSION,
    createInitialOwnedStreamingPlatformState,
    type Player,
} from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import {
    completeDueStreamingTechnologyProjects,
    getStreamingTechnologyCampus,
    getStreamingTechnologyWeeklyCost,
    previewStreamingTechnologyProject,
    startStreamingTechnologyProject,
} from '../services/streamingTechnologyCampus';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const createFixture = (): Player => {
    const player = structuredClone(INITIAL_PLAYER) as Player;
    const initial = createInitialOwnedStreamingPlatformState('phase17-player');
    const absoluteWeek = getAbsoluteWeek(45, 20);
    return {
        ...player,
        id: 'phase17-player',
        age: 45,
        currentWeek: 20,
        ownedStreamingPlatform: {
            ...initial,
            lifecycle: 'ACTIVE',
            identity: {
                name: 'Northstar+',
                slug: 'northstar-plus',
                primaryColor: '#31d6e8',
                secondaryColor: '#060a0d',
                logoKey: 'SIGNAL_RING',
                soundIdentKey: 'ASCENT',
                brandPromiseId: 'EVENT_HOUSE',
                foundedAtAbsoluteWeek: absoluteWeek - 30,
                publicManifesto: 'Event stories built for a worldwide audience.',
            },
            infrastructureStrategy: 'HYBRID',
            infrastructureSetup: {
                capacityPackageId: 'GROWTH',
                networkPlacements: [],
                rolloutPace: 'STANDARD',
                storageCapacityHours: 40_000,
                reliabilityTarget: 99.8,
                weeklyOperatingCost: 1_300_000,
                staffRequired: 10,
                capitalInvested: 40_000_000,
                technicalDebt: 6,
                readyAtAbsoluteWeek: absoluteWeek - 12,
                revision: 1,
                committedAtAbsoluteWeek: absoluteWeek - 15,
                loadTest: {
                    configurationSignature: 'phase17-load',
                    forecastLowConcurrentStreams: 700_000,
                    forecastLikelyConcurrentStreams: 1_000_000,
                    forecastHighConcurrentStreams: 1_550_000,
                    testedBurstCapacity: 3_000_000,
                    headroomPercent: 94,
                    status: 'PASS',
                    driverKeys: ['national', 'original'],
                    completedAtAbsoluteWeek: absoluteWeek - 13,
                },
            },
            capacity: {
                baselineConcurrentStreams: 1_500_000,
                burstConcurrentStreams: 3_000_000,
            },
            technologyLevels: {
                ...initial.technologyLevels,
                DELIVERY_CAPACITY: 20,
                RELIABILITY: 18,
                PLAYBACK_QUALITY: 12,
                CONTENT_OPERATIONS: 10,
            },
            treasuryCash: 500_000_000,
        },
    };
};

assert(OWNED_STREAMING_PLATFORM_SCHEMA_VERSION === 23, 'The canonical foundation should preserve Technology Campus in schema v23.');
const migrated = normalizeOwnedStreamingPlatformState({ schemaVersion: 14 }, 'phase17-migration');
assert(migrated.schemaVersion === 23 && migrated.technologyProjects.length === 0, 'Schema v14 saves should migrate with an empty technology-project history.');

let fixture = createFixture();
let campus = getStreamingTechnologyCampus(fixture);
assert(campus.available, 'A live platform with a completed infrastructure build should open Technology Campus.');
assert(campus.facilities.length === 6, 'Technology Campus should expose the six operating facilities.');
assert(campus.availableEngineeringStaff === 24, 'Engineering capacity should derive from infrastructure staff when no CTO is appointed.');

const edgeFacility = campus.facilities.find(item => item.definition.id === 'DELIVERY_CAPACITY')!;
assert(edgeFacility.nodes[0].status === 'INSTALLED', 'Existing Phase 5 technology levels should count as installed campus foundations.');
const dataFacility = campus.facilities.find(item => item.definition.id === 'DATA_RECOMMENDATIONS')!;
assert(dataFacility.nodes[0].status === 'AVAILABLE', 'The founder should be able to approve a basic Tier 1 project without a CTO.');

const sprintPreview = previewStreamingTechnologyProject(dataFacility.nodes[0].definition, 'SPRINT');
const hardenedPreview = previewStreamingTechnologyProject(dataFacility.nodes[0].definition, 'HARDENED');
assert(sprintPreview.constructionWeeks < hardenedPreview.constructionWeeks, 'Sprint doctrine should finish sooner than Hardened doctrine.');
assert(sprintPreview.technicalDebtDelta > hardenedPreview.technicalDebtDelta, 'Faster construction should carry more technical debt.');

const treasuryBefore = fixture.ownedStreamingPlatform.treasuryCash;
const started = startStreamingTechnologyProject(fixture, dataFacility.nodes[0].definition.id, 'BALANCED');
assert(started.changed && started.project?.status === 'UNDER_CONSTRUCTION', 'An available blueprint should create a persisted construction project.');
fixture = started.player;
assert(fixture.ownedStreamingPlatform.treasuryCash === treasuryBefore - started.project!.capitalCost, 'Project capital should debit company treasury exactly once.');
assert(started.project!.staffRequired > 0 && started.project!.constructionWeeks > 0, 'Construction should persist its staff and game-week requirements.');
assert(started.project!.risk && started.project!.riskNote && Number.isFinite(started.project!.technicalDebtDelta), 'Construction should persist risk and technical debt.');

const duplicate = startStreamingTechnologyProject(fixture, dataFacility.nodes[0].definition.id, 'BALANCED');
assert(!duplicate.changed, 'The same technology order must not charge twice.');
const secondProject = startStreamingTechnologyProject(fixture, 'security-1', 'BALANCED');
assert(!secondProject.changed && secondProject.reason === 'PROJECT_ACTIVE', 'Only one campus construction project should use the build bay at a time.');

const beforeReady = completeDueStreamingTechnologyProjects(
    fixture.ownedStreamingPlatform,
    started.project!.readyAtAbsoluteWeek - 1,
);
assert(beforeReady.completedProjects.length === 0, 'A project must not complete before its canonical game week.');
const baselineBefore = fixture.ownedStreamingPlatform.capacity.baselineConcurrentStreams;
const completed = completeDueStreamingTechnologyProjects(
    fixture.ownedStreamingPlatform,
    started.project!.readyAtAbsoluteWeek,
);
assert(completed.completedProjects.length === 1, 'A due project should complete in the canonical weekly processor.');
assert(completed.platform.technologyLevels.DATA_RECOMMENDATIONS === 10, 'Completion should advance the real technology branch.');
assert(completed.platform.capacity.baselineConcurrentStreams === baselineBefore, 'A data project should not fabricate delivery capacity.');
assert(getStreamingTechnologyWeeklyCost(completed.platform) === started.project!.weeklyOperatingCostDelta, 'Completed projects should enter the weekly operating run rate.');
assert(completed.ledgerEntries.length === 1 && completed.ledgerEntries[0].type === 'TECHNOLOGY_PROJECT_COMPLETED', 'Completion should create one auditable ledger fact.');

const completedAgain = completeDueStreamingTechnologyProjects({
    ...completed.platform,
    eventLedger: [...completed.platform.eventLedger, ...completed.ledgerEntries],
}, started.project!.readyAtAbsoluteWeek + 1);
assert(completedAgain.completedProjects.length === 0 && completedAgain.ledgerEntries.length === 0, 'A completed project must never apply benefits or ledger events twice.');

const frontierFixture: Player = {
    ...createFixture(),
    ownedStreamingPlatform: {
        ...createFixture().ownedStreamingPlatform,
        technologyLevels: {
            ...createFixture().ownedStreamingPlatform.technologyLevels,
            DATA_RECOMMENDATIONS: 24,
        },
    },
};
campus = getStreamingTechnologyCampus(frontierFixture);
const frontier = campus.facilities.find(item => item.definition.id === 'DATA_RECOMMENDATIONS')!.nextNode!;
assert(frontier.definition.tier === 3 && frontier.status === 'LOCKED', 'Tier 3 frontier research should remain locked without a CTO.');
assert(frontier.blockers.some(blocker => blocker.includes('CTO')), 'The frontier lock should name the missing CTO capability.');

const foundingFixture: Player = {
    ...createFixture(),
    ownedStreamingPlatform: { ...createFixture().ownedStreamingPlatform, lifecycle: 'FOUNDING' },
};
assert(!getStreamingTechnologyCampus(foundingFixture).available, 'Campus construction should wait until weekly live operations can advance it.');

const component = readFileSync(resolve(process.cwd(), 'components/StreamingTechnologyCampus.tsx'), 'utf8');
const styles = readFileSync(resolve(process.cwd(), 'styles/streaming-technology-campus.css'), 'utf8');
const hq = readFileSync(resolve(process.cwd(), 'components/StreamingPlatformHQ.tsx'), 'utf8');
const weeklyLoop = readFileSync(resolve(process.cwd(), 'services/streamingWeeklyLoop.ts'), 'utf8');
assert(component.includes('Build the systems viewers never see—but always feel.'), 'Technology Campus should open with a cinematic engineering thesis.');
assert(component.includes('Six facilities. One operating platform.') && component.includes('CONSTRUCTION DOCTRINE'), 'The UI should expose physical facilities and construction strategy.');
assert(component.includes('There are no real-world timers and no paid skips.'), 'The construction bay should explain the game-week timing contract.');
assert(styles.includes('@media (max-width: 640px)') && styles.includes('prefers-reduced-motion'), 'Technology Campus should include explicit mobile and motion-safe treatment.');
/* Reached from the NETWORK division's TECH chip and the Network Desk's build
   actions since the cinematic transplant; the old 'Enter Technology Campus'
   button belonged to a render path that is no longer mounted. */
assert(
    hq.includes('showTechnologyCampus')
    && hq.includes("chip === 'TECH'")
    && hq.includes('onBuild={() => setShowTechnologyCampus(true)}'),
    'The playable campus must be reachable from the Network division and the Network Desk.',
);
assert(weeklyLoop.includes('technologyCampusCost') && weeklyLoop.includes('completeDueStreamingTechnologyProjects'), 'The canonical weekly loop should complete projects and charge their run rate.');

console.log('EMPIRE+ Phase 17 Technology Campus audit passed.');
