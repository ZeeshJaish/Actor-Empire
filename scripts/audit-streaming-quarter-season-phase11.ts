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
    OWNED_STREAMING_CYCLE_REVIEW_LIMIT,
    compactOwnedStreamingPlatformForPersistence,
    normalizeOwnedStreamingPlatformState,
} from '../services/ownedStreamingPlatform';
import { processOwnedStreamingPlatformWeek } from '../services/streamingWeeklyLoop';
import {
    acknowledgeStreamingCycleReview,
    getStreamingQuarterSeasonCycle,
} from '../services/streamingQuarterSeason';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const createFixture = (): Player => {
    const base = structuredClone(INITIAL_PLAYER) as Player;
    const initial = createInitialOwnedStreamingPlatformState('phase11-player');
    const launchWeek = getAbsoluteWeek(40, 1);
    return {
        ...base,
        id: 'phase11-player',
        age: 40,
        currentWeek: 1,
        ownedStreamingPlatform: {
            ...initial,
            lifecycle: 'ACTIVE',
            identity: {
                name: 'Northstar+',
                slug: 'northstar-plus',
                primaryColor: '#52c9ff',
                secondaryColor: '#07101f',
                logoKey: 'SIGNAL_RING',
                soundIdentKey: 'ASCENT',
                brandPromiseId: 'EVENT_HOUSE',
                foundedAtAbsoluteWeek: launchWeek - 10,
            },
            capacity: {
                baselineConcurrentStreams: 1_500_000,
                burstConcurrentStreams: 3_200_000,
            },
            infrastructureSetup: {
                capacityPackageId: 'GROWTH',
                rolloutPace: 'STANDARD',
                storageCapacityHours: 36_000,
                reliabilityTarget: 99.75,
                weeklyOperatingCost: 1_100_000,
                staffRequired: 12,
                capitalInvested: 32_000_000,
                technicalDebt: 3,
                readyAtAbsoluteWeek: launchWeek - 2,
                revision: 1,
                committedAtAbsoluteWeek: launchWeek - 6,
                loadTest: {
                    configurationSignature: 'phase11-load',
                    forecastLowConcurrentStreams: 600_000,
                    forecastLikelyConcurrentStreams: 950_000,
                    forecastHighConcurrentStreams: 1_400_000,
                    testedBurstCapacity: 3_200_000,
                    headroomPercent: 128,
                    status: 'PASS',
                    driverKeys: ['growth-stack'],
                    completedAtAbsoluteWeek: launchWeek - 2,
                },
            },
            launchSlate: {
                revision: 1,
                programmedAtAbsoluteWeek: launchWeek - 1,
                entries: [
                    {
                        id: 'quarter-original',
                        projectId: 'quarter-original-project',
                        title: 'City of Signals',
                        source: 'ORIGINAL',
                        projectType: 'SERIES',
                        genre: 'DRAMA',
                        launchWeek: 2,
                        releasePattern: 'WEEKLY',
                        marketingPlan: 'EVENT',
                    },
                    {
                        id: 'quarter-film',
                        projectId: 'quarter-film-project',
                        title: 'After Midnight',
                        source: 'OWNED_LIBRARY',
                        projectType: 'MOVIE',
                        genre: 'THRILLER',
                        launchWeek: 6,
                        releasePattern: 'SINGLE_PREMIERE',
                        marketingPlan: 'STANDARD',
                    },
                    {
                        id: 'quarter-return',
                        projectId: 'quarter-return-project',
                        title: 'The Long Weekend',
                        source: 'LICENSED_WINDOW',
                        projectType: 'MOVIE',
                        genre: 'COMEDY',
                        launchWeek: 10,
                        releasePattern: 'SINGLE_PREMIERE',
                        marketingPlan: 'STANDARD',
                    },
                ],
            },
            launchCommit: {
                id: 'phase11-launch',
                idempotencyKey: 'platform-launch:phase11',
                committedAtAbsoluteWeek: launchWeek,
                capacityPlan: 'CLOUD_BURST',
                capacityPlanCost: 2_000_000,
                readinessScore: 91,
                forecastLikelyConcurrentStreams: 950_000,
                forecastHighConcurrentStreams: 1_400_000,
                protectedPeakConcurrentStreams: 3_200_000,
                launchHeadroomPercent: 128,
                initialSubscribers: 4_000_000,
                openingDemandIndex: 76,
                playbackSuccessRate: 99.7,
                outcomeTier: 'SMOOTH_OPENING',
                openingTitleCount: 3,
                openingOriginalTitle: 'City of Signals',
            },
            catalogProjectIds: ['quarter-original-project', 'quarter-film-project', 'quarter-return-project'],
            metrics: {
                subscribers: 4_000_000,
                netSubscriberMovement: 4_000_000,
                churnRate: 0,
                engagementRate: 0,
                averageRevenuePerUser: 12,
                cashRunwayWeeks: 30,
                technologyHealth: 99.7,
            },
            treasuryCash: 75_000_000,
        },
    };
};

const migrated = normalizeOwnedStreamingPlatformState({ schemaVersion: 9 }, 'phase11-migration');
assert(OWNED_STREAMING_PLATFORM_SCHEMA_VERSION === 23, 'The canonical foundation should advance owned-streaming schema to v23.');
assert(migrated.schemaVersion === 23 && migrated.cycleReviews.length === 0, 'Older saves should migrate with a safe empty cycle-review history.');

let player = createFixture();
for (let week = 2; week <= 13; week += 1) {
    player = { ...player, currentWeek: week };
    const processed = processOwnedStreamingPlatformWeek(player);
    assert(processed.processed && processed.snapshot?.operations, `Operating week ${week - 1} should commit through the real weekly service.`);
    player = processed.player;
}

assert(player.ownedStreamingPlatform.weeklyHistory.length === 12, 'Twelve post-launch weeks should remain in canonical weekly history.');
const beats = player.ownedStreamingPlatform.cycleReviews.filter(review => review.kind === 'FOUR_WEEK_BEAT');
const seasons = player.ownedStreamingPlatform.cycleReviews.filter(review => review.kind === 'TWELVE_WEEK_REVIEW');
assert(beats.length === 3, 'Weeks 4, 8 and 12 should each create one four-week progress beat.');
assert(seasons.length === 1, 'Week 12 should create one complete season review.');
assert(beats.every(review => review.weeksIncluded === 4), 'Every progress beat should reconcile exactly four committed weekly snapshots.');
assert(seasons[0].weeksIncluded === 12, 'The season review should reconcile exactly twelve committed weekly snapshots.');
assert(
    seasons[0].subscriberNetMovement === seasons[0].subscriberEnd - seasons[0].subscriberStart,
    'Season subscriber movement must reconcile to its opening and closing audience.',
);
assert(seasons[0].hits.length >= 2 && seasons[0].misses.length >= 2, 'The board record should preserve concrete wins and warnings.');
assert(seasons[0].rivalMovement.signal.includes('market signal'), 'Phase 11 rival movement must be clearly scoped as a market signal.');

const seasonFact = player.ownedStreamingPlatform.eventLedger.find(entry => entry.id === seasons[0].ledgerFactId);
const boardScene = player.ownedStreamingPlatform.cinematicQueue.find(event => event.type === 'BOARD_REVIEW');
assert(seasonFact?.type === 'SEASON_REVIEW_COMMITTED', 'Board presentation must follow a committed season ledger fact.');
assert(boardScene?.status === 'QUEUED' && boardScene.factIds.includes(seasons[0].ledgerFactId), 'The board cinematic should reference the committed season result.');

const duplicate = processOwnedStreamingPlatformWeek(player);
assert(!duplicate.processed, 'Reprocessing season week 12 must not create duplicate reviews.');
assert(duplicate.player.ownedStreamingPlatform.cycleReviews.length === 4, 'Idempotent replay should retain only three beats and one season review.');
assert(duplicate.player.ownedStreamingPlatform.cinematicQueue.filter(event => event.type === 'BOARD_REVIEW').length === 1, 'Idempotent replay should retain one board scene.');

const cycleView = getStreamingQuarterSeasonCycle(player);
assert(cycleView.weekInSeason === 12 && cycleView.pendingBoardReview?.id === seasons[0].id, 'HQ should surface the completed season and its pending board review.');
assert(cycleView.audiencePulse.length === 12, 'The season room should expose a compact twelve-week audience pulse.');
const acknowledged = acknowledgeStreamingCycleReview(player, seasons[0].id);
assert(
    acknowledged.ownedStreamingPlatform.cycleReviews.find(review => review.id === seasons[0].id)?.acknowledgedAtAbsoluteWeek !== null,
    'Review acknowledgement should persist without deleting the committed result.',
);

const oversized = compactOwnedStreamingPlatformForPersistence({
    ...player.ownedStreamingPlatform,
    cycleReviews: Array.from({ length: 75 }, (_, index) => ({
        ...beats[0],
        id: `cycle-${index}`,
        idempotencyKey: `cycle:${index}`,
        ledgerFactId: `fact-${index}`,
        cycleNumber: index + 1,
        startAbsoluteWeek: index * 4,
        endAbsoluteWeek: index * 4 + 3,
    })),
}, 'phase11-player');
assert(oversized.cycleReviews.length === OWNED_STREAMING_CYCLE_REVIEW_LIMIT, 'Cycle history should remain bounded for mobile saves.');

const serviceSource = readFileSync(resolve(process.cwd(), 'services/streamingQuarterSeason.ts'), 'utf8');
const weeklySource = readFileSync(resolve(process.cwd(), 'services/streamingWeeklyLoop.ts'), 'utf8');
const componentSource = readFileSync(resolve(process.cwd(), 'components/StreamingQuarterSeasonCycle.tsx'), 'utf8');
const hqSource = readFileSync(resolve(process.cwd(), 'components/StreamingPlatformHQ.tsx'), 'utf8');
const styleSource = readFileSync(resolve(process.cwd(), 'styles/streaming-quarter-season.css'), 'utf8');

assert(!serviceSource.includes('Math.random'), 'Cycle and board facts must never use uncontrolled randomness.');
assert(weeklySource.includes('commitStreamingQuarterSeasonCycle('), 'The existing exactly-once weekly commit should own Phase 11 progression.');
[
    'PHASE 11 • QUARTER & SEASON CYCLE',
    'AUDIENCE PULSE',
    'Turn weeks into a company story.',
    'SEASON {review.cycleNumber} • BOARD SESSION',
    'WHAT THE QUARTER PROVED',
    'THE NEXT MANDATE',
    'market signal',
].forEach(fragment => assert(componentSource.includes(fragment) || serviceSource.includes(fragment), `Phase 11 experience should include ${fragment}.`));
assert(hqSource.includes('<StreamingQuarterSeasonCycle'), 'Platform HQ should expose the quarter and season room after launch.');
assert(styleSource.includes('@media (min-width: 620px)'), 'The season room should deliberately enhance larger displays.');
assert(styleSource.includes('@media (prefers-reduced-motion: reduce)'), 'Boardroom motion should respect reduced-motion preferences.');

console.log('Streaming quarter and season cycle Phase 11 audit passed.');
