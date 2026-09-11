import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    INITIAL_PLAYER,
    OWNED_STREAMING_PLATFORM_SCHEMA_VERSION,
    createInitialOwnedStreamingPlatformState,
    type Player,
} from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import {
    acknowledgeStreamingWeeklyReport,
    getStreamingWeeklyCeoLoop,
    lockStreamingWeeklyPlan,
    processOwnedStreamingPlatformWeek,
} from '../services/streamingWeeklyLoop';
import {
    OWNED_STREAMING_WEEKLY_DECISION_LIMIT,
    compactOwnedStreamingPlatformForPersistence,
    normalizeOwnedStreamingPlatformState,
} from '../services/ownedStreamingPlatform';
import { getStreamingLaunchAftermath } from '../services/streamingAftermath';
import { processGameWeek } from '../services/gameLoop';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const createFixture = (): Player => {
    const base = structuredClone(INITIAL_PLAYER) as Player;
    const initial = createInitialOwnedStreamingPlatformState('phase10-player');
    const launchWeek = getAbsoluteWeek(43, 8);
    return {
        ...base,
        id: 'phase10-player',
        name: 'Weekly Founder',
        age: 43,
        currentWeek: 8,
        ownedStreamingPlatform: {
            ...initial,
            lifecycle: 'ACTIVE',
            identity: {
                name: 'Northstar+',
                slug: 'northstar-plus',
                primaryColor: '#4ec8ff',
                secondaryColor: '#0b1424',
                logoKey: 'SIGNAL_RING',
                soundIdentKey: 'ASCENT',
                brandPromiseId: 'EVENT_HOUSE',
                foundedAtAbsoluteWeek: launchWeek - 12,
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
                staffRequired: 14,
                capitalInvested: 40_000_000,
                technicalDebt: 4,
                readyAtAbsoluteWeek: launchWeek - 2,
                revision: 1,
                committedAtAbsoluteWeek: launchWeek - 8,
                loadTest: {
                    configurationSignature: 'phase10-load',
                    forecastLowConcurrentStreams: 700_000,
                    forecastLikelyConcurrentStreams: 1_000_000,
                    forecastHighConcurrentStreams: 1_550_000,
                    testedBurstCapacity: 3_000_000,
                    headroomPercent: 94,
                    status: 'PASS',
                    driverKeys: ['national', 'original'],
                    completedAtAbsoluteWeek: launchWeek - 3,
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
                PRODUCT_EXPERIENCE: 8,
            },
            starterCatalog: {
                packageId: 'BROAD_APPEAL',
                ownedProjectIds: ['glass-city', 'after-hours'],
                licensedProjectIds: ['licensed-window'],
                establishedAtAbsoluteWeek: launchWeek - 7,
            },
            catalogProjectIds: ['original-project', 'glass-city', 'after-hours', 'licensed-window'],
            catalogLicenses: [{
                id: 'license-window',
                sourceProjectId: 'licensed-window',
                titleAtSigning: 'Signal Coast',
                licensorName: 'Harbor Pictures',
                territory: 'MULTI_REGION',
                durationWeeks: 52,
                exclusivity: 'EXCLUSIVE',
                minimumGuarantee: 8_000_000,
                platformRevenueShare: 72,
                licensorRevenueShare: 28,
                signedAtAbsoluteWeek: launchWeek - 7,
                startsAtAbsoluteWeek: launchWeek,
                expiresAtAbsoluteWeek: launchWeek + 51,
                status: 'ACTIVE',
            }],
            originalCommissions: [{
                id: 'original-commission',
                scriptId: 'original-script',
                canonicalProjectId: 'original-project',
                title: 'Midnight Frequency',
                gapId: 'SERIES_RETENTION',
                projectType: 'SERIES',
                genre: 'MYSTERY',
                episodes: 8,
                producerStudioId: 'producer-studio',
                producerStudioName: 'Northstar Studios',
                commissionedByPlatformName: 'Northstar+',
                productionBudgetCap: 50_000_000,
                productionFundingApplied: 45_000_000,
                status: 'RELEASED',
                commissionedAtAbsoluteWeek: launchWeek - 9,
                greenlitAtAbsoluteWeek: launchWeek - 8,
            }],
            launchSlate: {
                revision: 1,
                programmedAtAbsoluteWeek: launchWeek - 2,
                entries: [
                    {
                        id: 'slate-original',
                        projectId: 'original-project',
                        title: 'Midnight Frequency',
                        source: 'ORIGINAL',
                        projectType: 'SERIES',
                        genre: 'MYSTERY',
                        launchWeek: 1,
                        releasePattern: 'WEEKLY',
                        marketingPlan: 'EVENT',
                    },
                    {
                        id: 'slate-glass',
                        projectId: 'glass-city',
                        title: 'Glass City',
                        source: 'OWNED_LIBRARY',
                        projectType: 'MOVIE',
                        genre: 'THRILLER',
                        launchWeek: 2,
                        releasePattern: 'SINGLE_PREMIERE',
                        marketingPlan: 'STANDARD',
                    },
                    {
                        id: 'slate-after',
                        projectId: 'after-hours',
                        title: 'After Hours',
                        source: 'OWNED_LIBRARY',
                        projectType: 'MOVIE',
                        genre: 'COMEDY',
                        launchWeek: 5,
                        releasePattern: 'SINGLE_PREMIERE',
                        marketingPlan: 'STANDARD',
                    },
                ],
            },
            launchCommit: {
                id: 'launch-commit',
                idempotencyKey: 'platform-launch:northstar-plus',
                committedAtAbsoluteWeek: launchWeek,
                capacityPlan: 'CLOUD_BURST',
                capacityPlanCost: 2_600_000,
                readinessScore: 93,
                forecastLikelyConcurrentStreams: 1_200_000,
                forecastHighConcurrentStreams: 1_850_000,
                protectedPeakConcurrentStreams: 5_250_000,
                launchHeadroomPercent: 184,
                initialSubscribers: 4_164_000,
                openingDemandIndex: 78,
                playbackSuccessRate: 99.67,
                outcomeTier: 'SMOOTH_OPENING',
                openingTitleCount: 4,
                openingOriginalTitle: 'Midnight Frequency',
            },
            subscriptionPrices: {
                BASIC: 7.99,
                PREMIUM: 13.99,
                FAMILY: 18.99,
            },
            metrics: {
                subscribers: 4_164_000,
                netSubscriberMovement: 4_164_000,
                churnRate: 0,
                engagementRate: 0,
                averageRevenuePerUser: 12.16,
                cashRunwayWeeks: 24,
                technologyHealth: 99.67,
            },
            treasuryCash: 86_000_000,
            milestoneKeys: ['platform-launch-ready', 'platform-launched'],
        },
    };
};

const migrated = normalizeOwnedStreamingPlatformState({ schemaVersion: 8 }, 'phase10-migration');
assert(OWNED_STREAMING_PLATFORM_SCHEMA_VERSION === 25, 'Phase 10 records should survive the owned-streaming schema v25 migration.');
assert(migrated.weeklyDecisions.length === 0, 'Older saves should migrate with an empty weekly decision history.');
assert(migrated.lastAcknowledgedWeeklyReportAbsoluteWeek === null, 'Older saves should not fabricate an acknowledged report.');

const launchNight = createFixture();
const launchBrief = getStreamingWeeklyCeoLoop(launchNight);
assert(launchBrief.available && !launchBrief.latestSnapshot, 'Launch night should expose a first CEO Brief without fake weekly results.');
assert(launchBrief.planOptions.length === 3, 'The CEO Brief should offer three meaningful weekly plans.');
assert(launchBrief.urgent.title.length > 10 && launchBrief.opportunity.title.length > 10 && launchBrief.upcoming.title.length > 10, 'The brief should contain one issue, opportunity and upcoming event.');
assert(!processOwnedStreamingPlatformWeek(launchNight).processed, 'Launch night itself must not fabricate a full completed week.');

const treasuryBeforeLock = launchNight.ownedStreamingPlatform.treasuryCash;
const locked = lockStreamingWeeklyPlan(launchNight, 'RETENTION_SPOTLIGHT');
assert(locked.changed, 'A live founder should be able to lock the next weekly plan.');
assert(locked.player.ownedStreamingPlatform.treasuryCash === treasuryBeforeLock, 'Locking a plan should preview cost without charging treasury early.');
assert(locked.player.ownedStreamingPlatform.weeklyDecisions[0]?.status === 'LOCKED', 'The selected plan should persist as locked.');
assert(!lockStreamingWeeklyPlan(locked.player, 'AUDIENCE_PUSH').changed, 'Only one weekly plan may be locked for a target week.');

const advanced: Player = {
    ...locked.player,
    currentWeek: 9,
};
const deterministicA = processOwnedStreamingPlatformWeek(structuredClone(advanced) as Player);
const deterministicB = processOwnedStreamingPlatformWeek(structuredClone(advanced) as Player);
const realGameWeek = await processGameWeek(structuredClone(locked.player) as Player);
assert(deterministicA.processed && deterministicA.snapshot?.operations, 'The first post-launch game week should commit a complete streaming result.');
assert(JSON.stringify(deterministicA.snapshot) === JSON.stringify(deterministicB.snapshot), 'Identical weekly inputs must produce identical seeded results.');
assert(realGameWeek.player.currentWeek === 9, 'The real game loop should advance the Actor Empire calendar.');
assert(
    realGameWeek.player.ownedStreamingPlatform.weeklyHistory[0]?.operations?.worldCompetitionTargetSubscribers === undefined,
    'A legacy platform with no country offer should retain the weekly fallback instead of being driven toward zero subscribers.',
);
assert(
    realGameWeek.player.ownedStreamingPlatform.weeklyHistory[0]?.operations?.marketPolicyCost
        === deterministicA.snapshot?.operations?.marketPolicyCost,
    'Persistence must retain the exact country tax and levy cost.',
);
assert(
    realGameWeek.player.ownedStreamingPlatform.weeklyHistory[0]?.operations?.marketOperatingCost
        === deterministicA.snapshot?.operations?.marketOperatingCost,
    'Persistence must retain the exact local market operating cost.',
);

const result = deterministicA.snapshot!;
const operations = result.operations!;
assert(result.absoluteWeek === getAbsoluteWeek(43, 9), 'The snapshot should use the real absolute game week.');
assert(result.netSubscriberMovement === operations.joinedSubscribers + operations.reactivations - operations.cancellations, 'The subscriber waterfall must reconcile exactly.');
assert(
    deterministicA.player.ownedStreamingPlatform.treasuryCash
        === treasuryBeforeLock + operations.subscriptionRevenue - operations.totalCashCost,
    'Platform treasury should reconcile subscription cash and operating costs exactly once.',
);
assert(operations.weeklyPlanCost === 650_000, 'The locked retention plan should charge its declared cost when processed.');
assert(deterministicA.player.ownedStreamingPlatform.weeklyDecisions[0]?.status === 'APPLIED', 'The weekly processor should close the locked plan.');
assert(deterministicA.player.ownedStreamingPlatform.eventLedger.some(entry => entry.type === 'METRICS_COMMITTED'), 'The completed result needs a metrics ledger fact.');
assert(deterministicA.player.ownedStreamingPlatform.milestoneKeys.includes('weekly-ceo-loop-started'), 'The first processed week should record the Phase 10 milestone.');
assert(operations.causalDrivers.length >= 4 && operations.causalDrivers.every(driver => driver.detail.length > 30), 'Weekly results should explain their important drivers.');
assert(operations.nextWeekHook.length > 20, 'Every weekly result should end with a concrete next-week hook.');

const repeated = processOwnedStreamingPlatformWeek(deterministicA.player);
assert(!repeated.processed, 'Reprocessing the same absolute week must be idempotent.');
assert(repeated.player.ownedStreamingPlatform.treasuryCash === deterministicA.player.ownedStreamingPlatform.treasuryCash, 'A duplicate weekly attempt must not move treasury again.');
assert(repeated.player.ownedStreamingPlatform.weeklyHistory.length === 1, 'A duplicate weekly attempt must not append another snapshot.');

const reportView = getStreamingWeeklyCeoLoop(deterministicA.player);
assert(reportView.hasUnreviewedResult, 'A newly processed result should open as unreviewed.');
const acknowledged = acknowledgeStreamingWeeklyReport(deterministicA.player, result.absoluteWeek);
assert(!getStreamingWeeklyCeoLoop(acknowledged).hasUnreviewedResult, 'Acknowledging a report should persist without deleting it.');
const aftermath = getStreamingLaunchAftermath(deterministicA.player);
assert(aftermath.reports.find(report => report.id === 'CHURN')?.status === 'AVAILABLE', 'The real Phase 10 snapshot should mature the Phase 9 churn report.');

const autopilotWeek: Player = {
    ...createFixture(),
    currentWeek: 9,
};
const autopilot = processOwnedStreamingPlatformWeek(autopilotWeek);
assert(autopilot.processed && autopilot.snapshot?.operations?.weeklyPlanCost === 0, 'Skipping a plan should use balanced autopilot without punishment or fake spend.');
assert(autopilot.snapshot?.causeMarkers.includes('BALANCED_AUTOPILOT'), 'Autopilot should remain visible in the weekly causes.');

const oversized = compactOwnedStreamingPlatformForPersistence({
    ...deterministicA.player.ownedStreamingPlatform,
    weeklyDecisions: Array.from({ length: 180 }, (_, index) => ({
        id: `decision-${index}`,
        idempotencyKey: `weekly-plan:${index + 1}`,
        planId: 'RETENTION_SPOTLIGHT',
        label: 'Retention spotlight',
        selectedAtAbsoluteWeek: index,
        targetAbsoluteWeek: index + 1,
        cashCost: 650_000,
        status: 'APPLIED',
        appliedAtAbsoluteWeek: index + 1,
        outcomeNote: 'Stored result.',
    })),
}, 'phase10-player');
assert(oversized.weeklyDecisions.length === OWNED_STREAMING_WEEKLY_DECISION_LIMIT, 'Weekly decision history should stay bounded for mobile saves.');

const serviceSource = readFileSync(resolve(process.cwd(), 'services/streamingWeeklyLoop.ts'), 'utf8');
const gameLoopSource = readFileSync(resolve(process.cwd(), 'services/gameLoop.ts'), 'utf8');
const componentSource = readFileSync(resolve(process.cwd(), 'components/StreamingWeeklyCeoLoop.tsx'), 'utf8');
const hqSource = readFileSync(resolve(process.cwd(), 'components/StreamingPlatformHQ.tsx'), 'utf8');
const entrySource = readFileSync(resolve(process.cwd(), 'components/StreamingLockedScreen.tsx'), 'utf8');
const lifestyleSource = readFileSync(resolve(process.cwd(), 'views/LifestylePage.tsx'), 'utf8');
const appSource = readFileSync(resolve(process.cwd(), 'App.tsx'), 'utf8');
const styleSource = readFileSync(resolve(process.cwd(), 'styles/streaming-weekly-loop.css'), 'utf8');

assert(!serviceSource.includes('Math.random'), 'Owned-platform weekly outcomes must never use uncontrolled randomness.');
assert(serviceSource.includes('createDeterministicRng'), 'The weekly simulation should use the shared seeded RNG.');
assert(gameLoopSource.includes('processOwnedStreamingPlatformWeek(nextPlayer)'), 'The real game-week processor should own Phase 10 execution.');
assert(gameLoopSource.includes("emitLoopStage('owned_streaming_start')"), 'Streaming week processing should appear in crash diagnostics.');
[
    'PHASE 10 • WEEKLY CEO LOOP',
    'The week has a story.',
    'AUDIENCE MOVEMENT',
    'PLATFORM CONTRIBUTION',
    'WHY IT HAPPENED',
    'NEXT-WEEK HOOK',
    'ONE-WEEK MANDATE',
    'Return to game and advance week',
].forEach(fragment => assert(componentSource.includes(fragment), `Phase 10 UI should include ${fragment}.`));
assert(hqSource.includes('<StreamingWeeklyCeoLoop'), 'Platform HQ should expose the complete weekly CEO loop after launch.');
assert(hqSource.includes('onReturnToGame={onReturnToGame || onBack}'), 'The weekly transition should prefer a direct route back to the real game.');
assert(entrySource.includes('onReturnToGame={onReturnToGame}'), 'The streaming entry should preserve the return-to-game callback.');
assert(lifestyleSource.includes('onReturnToGame={onReturnHome'), 'Lifestyle should bridge the streaming CTA back to the main game.');
assert(appSource.includes('onReturnHome={() => setActivePage(Page.HOME)}'), 'The weekly CTA should land on the real Home screen and its Next Week button.');
assert(styleSource.includes('@media (min-width: 620px)'), 'The weekly loop should deliberately enhance larger layouts.');
assert(styleSource.includes('@media (prefers-reduced-motion: reduce)'), 'Weekly transitions should respect reduced-motion preferences.');

console.log('Streaming complete weekly CEO loop Phase 10 audit passed.');
