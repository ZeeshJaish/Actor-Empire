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
    STREAMING_PRODUCT_DEFINITIONS,
    completeDueStreamingProductDevelopments,
    getStreamingProductSuite,
    getStreamingProductWeeklyEffects,
    previewStreamingProductLaunch,
    setStreamingProductLinePaused,
    startStreamingProductDevelopment,
} from '../services/streamingProductSuite';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const createFixture = (): Player => {
    const player = structuredClone(INITIAL_PLAYER) as Player;
    const initial = createInitialOwnedStreamingPlatformState('phase18-player');
    const absoluteWeek = getAbsoluteWeek(45, 20);
    const catalogProjectIds = ['family-1', 'catalog-2', 'catalog-3'];
    return {
        ...player,
        id: 'phase18-player',
        age: 45,
        currentWeek: 20,
        businesses: [{
            id: 'phase18-studio',
            name: 'Northstar Pictures',
            type: 'PRODUCTION_HOUSE',
        } as Player['businesses'][number]],
        pastProjects: [
            { id: 'family-1', name: 'Orbit Kids', genre: 'ANIMATION', projectType: 'SERIES', studioId: 'phase18-studio' },
            { id: 'catalog-2', name: 'Night Signal', genre: 'THRILLER', projectType: 'MOVIE', studioId: 'phase18-studio' },
            { id: 'catalog-3', name: 'Open Roads', genre: 'DRAMA', projectType: 'MOVIE', studioId: 'phase18-studio' },
        ] as Player['pastProjects'],
        ownedStreamingPlatform: {
            ...initial,
            lifecycle: 'ACTIVE',
            identity: {
                name: 'Northstar+',
                slug: 'northstar-plus',
                primaryColor: '#6f4dff',
                secondaryColor: '#08080d',
                logoKey: 'SIGNAL_RING',
                soundIdentKey: 'ASCENT',
                brandPromiseId: 'EVENT_HOUSE',
                foundedAtAbsoluteWeek: absoluteWeek - 40,
            },
            infrastructureStrategy: 'HYBRID',
            infrastructureSetup: {
                capacityPackageId: 'GROWTH',
                rolloutPace: 'STANDARD',
                storageCapacityHours: 40_000,
                reliabilityTarget: 99.8,
                weeklyOperatingCost: 1_300_000,
                staffRequired: 10,
                capitalInvested: 40_000_000,
                technicalDebt: 6,
                readyAtAbsoluteWeek: absoluteWeek - 20,
                revision: 1,
                committedAtAbsoluteWeek: absoluteWeek - 24,
                loadTest: {
                    configurationSignature: 'phase18-load',
                    forecastLowConcurrentStreams: 700_000,
                    forecastLikelyConcurrentStreams: 1_000_000,
                    forecastHighConcurrentStreams: 1_550_000,
                    testedBurstCapacity: 3_000_000,
                    headroomPercent: 94,
                    status: 'PASS',
                    driverKeys: ['family', 'national'],
                    completedAtAbsoluteWeek: absoluteWeek - 21,
                },
            },
            capacity: {
                baselineConcurrentStreams: 1_500_000,
                burstConcurrentStreams: 3_000_000,
            },
            technologyLevels: {
                ...initial.technologyLevels,
                SECURITY: 10,
                CONTENT_OPERATIONS: 10,
                PRODUCT_EXPERIENCE: 6,
            },
            catalogProjectIds,
            researchPrograms: [{
                id: 'phase18-kids-research',
                idempotencyKey: 'research-program:kids-mode',
                definitionId: 'kids-mode',
                title: 'Kids Mode',
                category: 'PLATFORM_PRODUCTS',
                stage: 'READY_TO_INSTALL',
                buildMode: 'BALANCED',
                ipStrategy: 'PATENT',
                researchCost: 5_000_000,
                patentCost: 3_500_000,
                installationCost: 18_000_000,
                weeklyOperatingCost: 0,
                licenseWeeklyCost: 85_000,
                staffRequired: 6,
                researchWeeks: 2,
                prototypeWeeks: 1,
                testWeeks: 1,
                installationWeeks: 3,
                startedAtAbsoluteWeek: absoluteWeek - 8,
                stageStartedAtAbsoluteWeek: absoluteWeek - 1,
                stageReadyAtAbsoluteWeek: absoluteWeek - 1,
                installationTargetType: 'PRODUCT_LINE',
                installationTargetId: null,
                installationTargetLabel: null,
                rivalInterestPercent: 32,
                completedAtAbsoluteWeek: null,
            }],
            treasuryCash: 500_000_000,
        },
    };
};

assert(OWNED_STREAMING_PLATFORM_SCHEMA_VERSION === 23, 'The canonical foundation should preserve Product Lab in schema v23.');
const migrated = normalizeOwnedStreamingPlatformState({ schemaVersion: 15 }, 'phase18-migration');
assert(migrated.schemaVersion === 23 && migrated.productLines.length === 0, 'Schema v15 saves should migrate with a safe empty product portfolio.');
assert(STREAMING_PRODUCT_DEFINITIONS.length === 7, 'The product suite should expose exactly Core, Kids, Free, Live, Fan, Store and Interactive.');

let fixture = createFixture();
let suite = getStreamingProductSuite(fixture);
assert(suite.available, 'A live platform with infrastructure should open Product Lab.');
assert(suite.activeProductIds.length === 1 && suite.activeProductIds[0] === 'CORE', 'Core should be included without a second purchase or operating-cost record.');
const kids = suite.lines.find(line => line.definition.id === 'KIDS')!;
assert(kids.status === 'AVAILABLE' && kids.blockers.length === 0, 'A qualified family stack should make Kids available.');
const interactive = suite.lines.find(line => line.definition.id === 'INTERACTIVE')!;
assert(interactive.status === 'LOCKED' && interactive.blockers.some(blocker => blocker.includes('Live')), 'Interactive should communicate its real cross-product prerequisites.');

const validated = previewStreamingProductLaunch(kids.definition, 'VALIDATED');
const rushed = previewStreamingProductLaunch(kids.definition, 'FIRST_TO_MARKET');
assert(validated.developmentWeeks > rushed.developmentWeeks, 'Validated delivery should take more game weeks than first-to-market delivery.');
assert(validated.peakLoadPercent < rushed.peakLoadPercent && validated.risk === 'LOW', 'Validated delivery should lower opening load and preserve the calmer risk profile.');

const treasuryBefore = fixture.ownedStreamingPlatform.treasuryCash;
const started = startStreamingProductDevelopment(fixture, 'KIDS', 'BALANCED');
assert(started.changed && started.line?.status === 'UNDER_DEVELOPMENT', 'Approving Kids should create a persisted development record.');
fixture = started.player;
assert(fixture.ownedStreamingPlatform.treasuryCash === treasuryBefore - started.line!.capitalCost, 'Product capital should debit company treasury exactly once.');
assert(started.line!.staffRequired > 0 && started.line!.weeklyOperatingCost > 0 && started.line!.peakLoadPercent > 0, 'Development should persist staffing, operating cost and capacity load.');
assert(started.line!.strategicConsequence && started.line!.riskNote, 'Product approval should preserve risk and strategic consequence copy.');

const duplicate = startStreamingProductDevelopment(fixture, 'KIDS', 'BALANCED');
assert(!duplicate.changed, 'The same product line must not charge twice.');
const secondProject = startStreamingProductDevelopment(fixture, 'FREE', 'BALANCED');
assert(!secondProject.changed && secondProject.reason === 'PROJECT_ACTIVE', 'Only one product may occupy the development stage at a time.');

const beforeReady = completeDueStreamingProductDevelopments(
    fixture.ownedStreamingPlatform,
    started.line!.readyAtAbsoluteWeek - 1,
);
assert(beforeReady.launchedLines.length === 0, 'A product must not launch before its canonical game week.');
const completed = completeDueStreamingProductDevelopments(
    fixture.ownedStreamingPlatform,
    started.line!.readyAtAbsoluteWeek,
);
assert(completed.launchedLines.length === 1 && completed.launchedLines[0].status === 'ACTIVE', 'A due product should enter live operation in the weekly processor.');
assert(completed.ledgerEntries.length === 1 && completed.ledgerEntries[0].type === 'PRODUCT_LAUNCHED', 'Product launch should create one auditable ledger fact.');
const effects = getStreamingProductWeeklyEffects(completed.platform);
assert(effects.activeProductIds.includes('KIDS'), 'An active product should enter the public product set.');
assert(effects.weeklyOperatingCost === started.line!.weeklyOperatingCost, 'An active product should enter the weekly operating run rate.');
assert(effects.churnRateDelta < 0 && effects.engagementRateDelta > 0, 'Kids should create its designed retention and engagement consequences.');

const completedAgain = completeDueStreamingProductDevelopments({
    ...completed.platform,
    eventLedger: [...completed.platform.eventLedger, ...completed.ledgerEntries],
}, started.line!.readyAtAbsoluteWeek + 1);
assert(completedAgain.launchedLines.length === 0 && completedAgain.ledgerEntries.length === 0, 'A launched product must never apply twice.');

const postLaunchPlayer: Player = {
    ...fixture,
    currentWeek: fixture.currentWeek + started.line!.developmentWeeks + 1,
    ownedStreamingPlatform: {
        ...completed.platform,
        eventLedger: [...completed.platform.eventLedger, ...completed.ledgerEntries],
    },
};
const paused = setStreamingProductLinePaused(postLaunchPlayer, 'KIDS', true);
assert(paused.changed && paused.line?.status === 'PAUSED', 'A live product should be pausable from operations.');
const pausedEffects = getStreamingProductWeeklyEffects(paused.player.ownedStreamingPlatform);
assert(!pausedEffects.activeProductIds.includes('KIDS') && pausedEffects.weeklyOperatingCost === 0, 'A paused product should leave both Viewer Mode and the weekly run rate.');
const sameWeekResume = setStreamingProductLinePaused(paused.player, 'KIDS', false);
assert(!sameWeekResume.changed && sameWeekResume.reason === 'SAME_WEEK', 'Pause and resume should not be exploitable in the same game week.');

const component = readFileSync(resolve(process.cwd(), 'components/StreamingProductLab.tsx'), 'utf8');
const styles = readFileSync(resolve(process.cwd(), 'styles/streaming-product-lab.css'), 'utf8');
const hq = readFileSync(resolve(process.cwd(), 'components/StreamingPlatformHQ.tsx'), 'utf8');
const viewer = readFileSync(resolve(process.cwd(), 'components/StreamingViewerMode.tsx'), 'utf8');
const weeklyLoop = readFileSync(resolve(process.cwd(), 'services/streamingWeeklyLoop.ts'), 'utf8');
assert(component.includes('One platform. Seven reasons to return.') && component.includes('PUBLIC PRODUCT PORTFOLIO'), 'Product Lab should present the suite as a cinematic operating campus.');
assert(component.includes('VALIDATED') && component.includes('FIRST_TO_MARKET'), 'Product approval should expose delivery strategy instead of a cosmetic unlock button.');
assert(component.includes('no real-world timers or paid skips'), 'Product development should use canonical game weeks without monetized skips.');
assert(styles.includes('@media (max-width: 640px)') && styles.includes('prefers-reduced-motion'), 'Product Lab should include explicit mobile and motion-safe treatment.');
/* Reached from the NETWORK division's PRODUCTS chip and the Network Desk's
   product toggle. */
assert(
    hq.includes('showProductLab')
    && hq.includes("chip === 'PRODUCTS'")
    && hq.includes('onToggleProduct={() => setShowProductLab(true)}'),
    'The Product Lab must be reachable from the Network division and the Network Desk.',
);
assert(viewer.includes('stream-viewer-product-dock') && viewer.includes('productSuite.activeProductIds'), 'Viewer Mode should expose only genuinely active product lines.');
assert(weeklyLoop.includes('completeDueStreamingProductDevelopments') && weeklyLoop.includes('productSuiteCost') && weeklyLoop.includes('productRevenue'), 'The canonical weekly processor should launch products and apply their costs and revenue.');

console.log('✓ Streaming Product Suite Phase 18 audit passed');
