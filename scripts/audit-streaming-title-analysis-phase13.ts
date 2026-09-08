import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    INITIAL_PLAYER,
    OWNED_STREAMING_PLATFORM_SCHEMA_VERSION,
    createInitialOwnedStreamingPlatformState,
    type Player,
} from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { processOwnedStreamingPlatformWeek } from '../services/streamingWeeklyLoop';
import { getStreamingTitleAnalytics, type StreamingTitleDossierTab } from '../services/streamingTitleAnalytics';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);

const createFixture = (): Player => {
    const base = structuredClone(INITIAL_PLAYER) as Player;
    const initial = createInitialOwnedStreamingPlatformState('phase13-player');
    const launchWeek = getAbsoluteWeek(43, 8);
    return {
        ...base,
        id: 'phase13-player',
        name: 'Dossier Founder',
        age: 43,
        currentWeek: 8,
        ownedStreamingPlatform: {
            ...initial,
            lifecycle: 'ACTIVE',
            identity: {
                name: 'Northstar+',
                slug: 'northstar-plus',
                primaryColor: '#68ddff',
                secondaryColor: '#09101e',
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
                technicalDebt: 3,
                readyAtAbsoluteWeek: launchWeek - 2,
                revision: 1,
                committedAtAbsoluteWeek: launchWeek - 8,
                loadTest: {
                    configurationSignature: 'phase13-load',
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
            catalogProjectIds: ['original-project', 'glass-city', 'after-hours'],
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
                openingTitleCount: 3,
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

assert(OWNED_STREAMING_PLATFORM_SCHEMA_VERSION === 23, 'The canonical foundation should retain Phase 13 title telemetry in schema v23.');

const preTelemetry = getStreamingTitleAnalytics(createFixture(), 'original-project');
assert(preTelemetry.selected?.measuredWeeks === 0, 'A live title without committed title telemetry should remain unmeasured.');
assert(preTelemetry.selected?.totalViewingAccounts === null && preTelemetry.selected?.cashContribution === null, 'Unknown historic title facts must remain null instead of becoming zero.');
assert(Object.values(preTelemetry.selected!.reports).every(report => report.status === 'NOT_MEASURED'), 'Every dossier tab should explain that a pre-telemetry title was not measured.');

const firstWeekInput: Player = { ...createFixture(), currentWeek: 9 };
const deterministicA = processOwnedStreamingPlatformWeek(structuredClone(firstWeekInput) as Player);
const deterministicB = processOwnedStreamingPlatformWeek(structuredClone(firstWeekInput) as Player);
assert(deterministicA.processed && deterministicA.snapshot?.operations?.titlePerformance?.length === 2, 'The first operating week should commit title facts only for titles already available.');
assert(JSON.stringify(deterministicA.snapshot?.operations?.titlePerformance) === JSON.stringify(deterministicB.snapshot?.operations?.titlePerformance), 'Identical title inputs must produce identical seeded title telemetry.');

let livePlayer = deterministicA.player;
const processedSnapshots = [deterministicA.snapshot!];
for (const currentWeek of [10, 11, 12]) {
    const result = processOwnedStreamingPlatformWeek({ ...livePlayer, currentWeek });
    assert(result.processed && result.snapshot?.operations?.titlePerformance?.length, `Game week ${currentWeek} should commit title telemetry.`);
    livePlayer = result.player;
    processedSnapshots.push(result.snapshot!);
}

processedSnapshots.forEach(snapshot => {
    const operations = snapshot.operations!;
    const titles = operations.titlePerformance!;
    assert(sum(titles.map(title => title.attributedSubscriptionRevenue)) === operations.subscriptionRevenue, 'Per-title revenue attribution must reconcile to the platform week.');
    assert(sum(titles.map(title => title.allocatedCashCost)) === operations.totalCashCost, 'Per-title cash costs must reconcile to the platform week.');
    assert(sum(titles.map(title => title.allocatedContentAmortization)) === operations.contentAmortization, 'Per-title content amortization must reconcile to the platform week.');
    assert(sum(titles.map(title => title.cashContribution)) === operations.netCashContribution, 'Per-title cash contribution must reconcile to the platform week.');
    assert(sum(titles.map(title => title.accountingContribution)) === operations.accountingContribution, 'Per-title accounting contribution must reconcile to the platform week.');
    titles.forEach(title => {
        const discoveryTotal = title.discoveryMix.homepagePercent
            + title.discoveryMix.recommendationsPercent
            + title.discoveryMix.searchPercent
            + title.discoveryMix.directPercent;
        assert(discoveryTotal === 100, 'Every title discovery mix should reconcile to exactly one hundred percent.');
        assert(title.viewingAccounts >= 0 && title.hoursViewed >= 0, 'Title audience facts should remain valid non-negative measurements.');
    });
});

const firstWeekDossier = getStreamingTitleAnalytics(deterministicA.player, 'original-project').selected!;
assert(firstWeekDossier.reports.OVERVIEW.status === 'AVAILABLE', 'Overview should mature after one measured title week.');
assert(firstWeekDossier.reports.AUDIENCE.status === 'AVAILABLE' && firstWeekDossier.reports.TECHNICAL.status === 'AVAILABLE', 'Audience and technical reports should mature after one measured week.');
assert(firstWeekDossier.reports.ENGAGEMENT.status === 'COLLECTING' && firstWeekDossier.reports.DISCOVERY.status === 'COLLECTING', 'Engagement and discovery should wait for two measured weeks.');
assert(firstWeekDossier.reports.FINANCIALS.status === 'COLLECTING' && firstWeekDossier.reports.FUTURE.status === 'COLLECTING', 'Decision-grade financial and future reports should wait for four measured weeks.');

const matureDossier = getStreamingTitleAnalytics(livePlayer, 'original-project').selected!;
const dossierTabs: StreamingTitleDossierTab[] = ['OVERVIEW', 'AUDIENCE', 'ENGAGEMENT', 'DISCOVERY', 'FINANCIALS', 'TECHNICAL', 'FUTURE'];
assert(matureDossier.measuredWeeks === 4, 'The opening Original should accumulate four canonical title weeks.');
assert(dossierTabs.every(tab => matureDossier.reports[tab].status === 'AVAILABLE'), 'All seven dossier tabs should mature after four measured weeks.');
assert(matureDossier.discoveryMix !== null && matureDossier.futureOutlook !== null && matureDossier.nextQuestion !== null, 'A mature dossier should expose discovery and future decision insight.');
assert(matureDossier.totalViewingAccounts! > 0 && matureDossier.totalHoursViewed! > 0, 'A measured live title should expose real audience depth.');

const serviceSource = readFileSync(resolve(process.cwd(), 'services/streamingTitleAnalytics.ts'), 'utf8');
const weeklySource = readFileSync(resolve(process.cwd(), 'services/streamingWeeklyLoop.ts'), 'utf8');
const componentSource = readFileSync(resolve(process.cwd(), 'components/StreamingTitleDossier.tsx'), 'utf8');
const analyticsSource = readFileSync(resolve(process.cwd(), 'components/StreamingAnalyticsCenter.tsx'), 'utf8');
const hqSource = readFileSync(resolve(process.cwd(), 'components/StreamingPlatformHQ.tsx'), 'utf8');
const styleSource = readFileSync(resolve(process.cwd(), 'styles/streaming-title-dossier.css'), 'utf8');

assert(!serviceSource.includes('Math.random') && !weeklySource.includes('Math.random'), 'Title telemetry and dossiers must never use uncontrolled randomness.');
dossierTabs.forEach(tab => assert(componentSource.includes(`'${tab}'`), `The dossier should expose the ${tab} tab.`));
[
    'Unknown is not zero',
    'REPORT MATURING',
    'PERFORMANCE STORY',
    'DISCOVERY ATTRIBUTION',
    'CASH VIEW',
    'PLAYBACK QUALITY',
    'DECISION OUTLOOK',
].forEach(fragment => assert(componentSource.includes(fragment), `Phase 13 experience should include ${fragment}.`));
assert(componentSource.includes('Phase 14') && componentSource.includes('Renewals'), 'The dossier should preserve later-phase control boundaries.');
assert(analyticsSource.includes('Open the complete title dossiers'), 'The Phase 12 content analytics area should lead into detailed title intelligence.');
assert(hqSource.includes('<StreamingTitleDossier') && hqSource.includes('View Title Dossiers'), 'Live HQ should expose title dossiers from the Content Room.');
assert(styleSource.includes('@media (min-width: 760px)') && styleSource.includes('@media (min-width: 1050px)'), 'Title dossiers should deliberately scale across mobile, tablet and desktop.');
assert(styleSource.includes('@media (prefers-reduced-motion: reduce)'), 'Dossier motion should respect reduced-motion preferences.');

console.log('Streaming Detailed Title Analysis Phase 13 audit passed.');
