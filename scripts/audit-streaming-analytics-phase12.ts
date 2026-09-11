import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    INITIAL_PLAYER,
    OWNED_STREAMING_PLATFORM_SCHEMA_VERSION,
    createInitialOwnedStreamingPlatformState,
    type OwnedStreamingWeeklySnapshot,
    type Player,
} from '../types';
import { createDeterministicId } from '../services/deterministicRandom';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { getStreamingPlatformAnalytics } from '../services/streamingAnalytics';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const createFixture = (): Player => {
    const base = structuredClone(INITIAL_PLAYER) as Player;
    const initial = createInitialOwnedStreamingPlatformState('phase12-player');
    const launchWeek = getAbsoluteWeek(40, 1);
    let subscribers = 4_000_000;
    const weeklyHistory: OwnedStreamingWeeklySnapshot[] = Array.from({ length: 12 }, (_, index) => {
        const joinedSubscribers = 180_000 + index * 5_000;
        const reactivations = 10_000;
        const cancellations = index === 5 ? 245_000 : 85_000 + index * 2_000;
        const netSubscriberMovement = joinedSubscribers + reactivations - cancellations;
        subscribers += netSubscriberMovement;
        const absoluteWeek = launchWeek + index + 1;
        const pressureWeek = index === 5;
        return {
            id: `phase12-snapshot-${index}`,
            absoluteWeek,
            subscribers,
            netSubscriberMovement,
            churnRate: cancellations / Math.max(1, subscribers - netSubscriberMovement),
            engagementRate: 0.62 + index * 0.008,
            averageRevenuePerUser: 12.1 + index * 0.03,
            cashRunwayWeeks: 30 + index * 1.2,
            technologyHealth: pressureWeek ? 92 : 99.4,
            causeMarkers: index % 4 === 0 ? ['FRESH_RELEASE', 'SUBSCRIBER_GROWTH'] : ['CATALOG_WEEK'],
            operations: {
                programWeek: index + 2,
                releaseTitles: index === 0 ? ['Signal City'] : index === 8 ? ['Long Weekend'] : [],
                joinedSubscribers,
                cancellations,
                reactivations,
                subscriptionRevenue: 12_000_000 + index * 250_000,
                partnerRevenueShareCost: 900_000,
                infrastructureCost: 1_300_000,
                leadershipCost: 400_000,
                financingCost: 250_000,
                weeklyPlanCost: 650_000,
                totalCashCost: 3_500_000,
                netCashContribution: 8_500_000 + index * 250_000,
                contentAmortization: 600_000,
                accountingContribution: 7_900_000 + index * 250_000,
                peakConcurrentStreams: 1_000_000 + index * 55_000,
                capacityUtilizationPercent: pressureWeek ? 105 : 52 + index * 2.5,
                playbackSuccessRate: pressureWeek ? 97.9 : 99.7 - index * 0.01,
                appliedDecisionId: null,
                headline: pressureWeek ? 'Demand exposed the delivery stack.' : 'The audience strengthened.',
                summary: `${netSubscriberMovement >= 0 ? '+' : ''}${netSubscriberMovement.toLocaleString()} net members.`,
                nextWeekHook: 'Protect the next programming beat.',
                causalDrivers: [],
            },
        };
    });
    const eventLedger = weeklyHistory.map(snapshot => ({
        id: createDeterministicId('streaming_event', 'phase12-player', `owned-streaming-metrics:${snapshot.absoluteWeek}`),
        idempotencyKey: `owned-streaming-metrics:${snapshot.absoluteWeek}`,
        absoluteWeek: snapshot.absoluteWeek,
        type: 'METRICS_COMMITTED' as const,
        summary: snapshot.operations!.headline,
        source: 'WEEK_PROCESSOR' as const,
    }));
    return {
        ...base,
        id: 'phase12-player',
        age: 40,
        currentWeek: 13,
        ownedStreamingPlatform: {
            ...initial,
            lifecycle: 'ACTIVE',
            identity: {
                name: 'Northstar+',
                slug: 'northstar-plus',
                primaryColor: '#57d2ff',
                secondaryColor: '#07111f',
                logoKey: 'SIGNAL_RING',
                soundIdentKey: 'ASCENT',
                brandPromiseId: 'EVENT_HOUSE',
                foundedAtAbsoluteWeek: launchWeek - 12,
                publicManifesto: 'Event stories built for a worldwide audience.',
            },
            launchCommit: {
                id: 'phase12-launch',
                idempotencyKey: 'phase12-launch',
                committedAtAbsoluteWeek: launchWeek,
                capacityPlan: 'CLOUD_BURST',
                capacityPlanCost: 2_000_000,
                readinessScore: 92,
                forecastLikelyConcurrentStreams: 1_000_000,
                forecastHighConcurrentStreams: 1_500_000,
                protectedPeakConcurrentStreams: 3_200_000,
                launchHeadroomPercent: 110,
                initialSubscribers: 4_000_000,
                openingDemandIndex: 78,
                playbackSuccessRate: 99.7,
                outcomeTier: 'SMOOTH_OPENING',
                openingTitleCount: 3,
                openingOriginalTitle: 'Signal City',
            },
            launchSlate: {
                revision: 1,
                programmedAtAbsoluteWeek: launchWeek - 1,
                entries: [
                    {
                        id: 'signal-city',
                        projectId: 'signal-city-project',
                        title: 'Signal City',
                        source: 'ORIGINAL',
                        projectType: 'SERIES',
                        genre: 'DRAMA',
                        launchWeek: 2,
                        releasePattern: 'WEEKLY',
                        marketingPlan: 'EVENT',
                    },
                    {
                        id: 'long-weekend',
                        projectId: 'long-weekend-project',
                        title: 'Long Weekend',
                        source: 'OWNED_LIBRARY',
                        projectType: 'MOVIE',
                        genre: 'COMEDY',
                        launchWeek: 10,
                        releasePattern: 'SINGLE_PREMIERE',
                        marketingPlan: 'STANDARD',
                    },
                    {
                        id: 'next-window',
                        projectId: 'next-window-project',
                        title: 'The Next Window',
                        source: 'LICENSED_WINDOW',
                        projectType: 'MOVIE',
                        genre: 'THRILLER',
                        launchWeek: 16,
                        releasePattern: 'SINGLE_PREMIERE',
                        marketingPlan: 'STANDARD',
                    },
                ],
            },
            capacity: {
                baselineConcurrentStreams: 1_600_000,
                burstConcurrentStreams: 3_200_000,
            },
            weeklyHistory,
            eventLedger,
            metrics: {
                ...weeklyHistory.at(-1)!,
            },
            treasuryCash: 150_000_000,
        },
    };
};

assert(OWNED_STREAMING_PLATFORM_SCHEMA_VERSION === 25, 'The canonical foundation should advance the owned-streaming schema to v24.');

const player = createFixture();
const before = JSON.stringify(player.ownedStreamingPlatform);
const analytics = getStreamingPlatformAnalytics(player, 12);
assert(JSON.stringify(player.ownedStreamingPlatform) === before, 'Opening analytics must never mutate platform simulation state.');
assert(analytics.available && analytics.availableWeeks === 12, 'A mature platform should expose a twelve-week analytics window.');
assert(analytics.subscriberTimeline.length === 12 && analytics.churnTimeline.length === 12, 'Subscriber and churn charts should use canonical weekly history.');
assert(analytics.engagementTimeline.length === 12 && analytics.revenueTimeline.length === 12, 'Engagement and revenue charts should share the same committed weekly axis.');
assert(analytics.waterfall?.reconciled, 'Subscriber joins, returns and cancellations must reconcile exactly to closing audience.');
assert(
    analytics.waterfall?.startingSubscribers
        + analytics.waterfall!.joinedSubscribers
        + analytics.waterfall!.reactivations
        - analytics.waterfall!.cancellations
        === analytics.waterfall?.endingSubscribers,
    'The visible subscriber waterfall should be arithmetically auditable.',
);
assert(
    analytics.cohorts.reduce((total, cohort) => total + cohort.remainingSubscribers, 0)
        === analytics.waterfall?.endingSubscribers,
    'Derived retention cohorts should reconcile exactly to current subscribers.',
);
assert(analytics.reconciliation.status === 'RECONCILED', 'Canonical weekly and metric-ledger facts should produce a fully reconciled analytics status.');
assert(analytics.totals.revenue - analytics.totals.cashCost === analytics.totals.cashContribution, 'Cash contribution should equal subscription revenue less cash costs.');
assert(analytics.totals.cashContribution - analytics.totals.contentAmortization === analytics.totals.accountingContribution, 'Accounting contribution should equal cash contribution less content amortization.');
assert(analytics.incidents.some(incident => incident.severity === 'MAJOR'), 'A recorded overload week should appear in operational incident history.');
assert(analytics.capacityForecast.length === 4 && analytics.capacityForecast.every(point => point.isForecast), 'Capacity forecast should expose four clearly marked forecast points.');
assert(analytics.contentGaps.length === 12 && analytics.contentGaps.some(cell => cell.status === 'GAP'), 'The content-gap heatmap should cover the next twelve programming weeks.');
assert(analytics.marketShare.some(entry => entry.isPlayer), 'Modeled world share should include the player platform.');
assert(Math.abs(analytics.marketShare.reduce((total, entry) => total + entry.sharePercent, 0) - 100) < 0.1, 'World share percentages should reconcile to approximately one hundred percent after display rounding.');
assert(analytics.unmeasured.length >= 3 && analytics.unmeasured.every(item => item.reason.length > 30), 'Unavailable segmentation should explain why it is unknown instead of showing zero.');
assert(analytics.ceoPulse.length === 5 && analytics.ceoPulse.every(signal => signal.action.length > 15), 'CEO Pulse should turn each major analytical domain into an actionable conclusion.');

const fourWeek = getStreamingPlatformAnalytics(player, 4);
assert(fourWeek.availableWeeks === 4 && fourWeek.subscriberTimeline[0].absoluteWeek === analytics.subscriberTimeline[8].absoluteWeek, 'Changing range should select a smaller canonical window without rerolling facts.');
const deterministic = getStreamingPlatformAnalytics(structuredClone(player) as Player, 12);
assert(JSON.stringify(deterministic) === JSON.stringify(analytics), 'Identical platform facts should always produce identical analytics.');

const preLaunch: Player = {
    ...structuredClone(INITIAL_PLAYER) as Player,
    id: 'phase12-prelaunch',
    ownedStreamingPlatform: createInitialOwnedStreamingPlatformState('phase12-prelaunch'),
};
const pending = getStreamingPlatformAnalytics(preLaunch, 12);
assert(!pending.available && pending.subscriberTimeline.length === 0, 'Pre-launch analytics should remain pending rather than inventing a zero-valued trend.');
assert(pending.totals.averageChurnRate === null && pending.playerMarketSharePercent === null, 'Unknown pre-launch metrics should remain null.');

const serviceSource = readFileSync(resolve(process.cwd(), 'services/streamingAnalytics.ts'), 'utf8');
const graphSource = readFileSync(resolve(process.cwd(), 'components/streaming-analytics/StreamingGraphSystem.tsx'), 'utf8');
const componentSource = readFileSync(resolve(process.cwd(), 'components/StreamingAnalyticsCenter.tsx'), 'utf8');
const hqSource = readFileSync(resolve(process.cwd(), 'components/StreamingPlatformHQ.tsx'), 'utf8');
const styleSource = readFileSync(resolve(process.cwd(), 'styles/streaming-analytics.css'), 'utf8');

assert(!serviceSource.includes('Math.random'), 'Analytics, cohort allocation and forecasts must never use uncontrolled randomness.');
[
    'CEO PULSE',
    'ANALYST MODE',
    'SUBSCRIBER TIMELINE',
    'RETENTION COHORTS',
    'CASH VS ACCOUNTING',
    'CAPACITY & FORECAST',
    'INCIDENT HISTORY',
    'TWELVE-WEEK CONTENT HEATMAP',
    'Unknown is not zero',
].forEach(fragment => assert(componentSource.includes(fragment), `Phase 12 experience should include ${fragment}.`));
assert(graphSource.includes('StreamingLineGraph') && graphSource.includes('StreamingWaterfallGraph') && graphSource.includes('StreamingMarketRing'), 'Phase 12 should provide one shared accessible graph system.');
assert(hqSource.includes('<StreamingAnalyticsCenter') && hqSource.includes('Enter Analytics Center'), 'Live Platform HQ should expose the complete Analytics Center.');
assert(styleSource.includes('@media (min-width: 620px)') && styleSource.includes('@media (min-width: 1024px)'), 'Analytics should deliberately scale across tablet and desktop layouts.');
assert(styleSource.includes('@media (prefers-reduced-motion: reduce)'), 'Analytics motion should respect reduced-motion preferences.');

console.log('Streaming Platform Analytics Center Phase 12 audit passed.');
