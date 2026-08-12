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
    getStreamingPromotionCenter,
    lockStreamingGrowthAction,
    previewStreamingGrowthAction,
    type StreamingGrowthDraft,
} from '../services/streamingPromotion';
import { processOwnedStreamingPlatformWeek } from '../services/streamingWeeklyLoop';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const createFixture = (): Player => {
    const base = structuredClone(INITIAL_PLAYER) as Player;
    const initial = createInitialOwnedStreamingPlatformState('phase14-player');
    const launchWeek = getAbsoluteWeek(43, 8);
    return {
        ...base,
        id: 'phase14-player',
        age: 43,
        currentWeek: 8,
        ownedStreamingPlatform: {
            ...initial,
            lifecycle: 'ACTIVE',
            identity: {
                name: 'Northstar+',
                slug: 'northstar-plus',
                primaryColor: '#6de4ff',
                secondaryColor: '#090f1e',
                logoKey: 'SIGNAL_RING',
                soundIdentKey: 'ASCENT',
                brandPromiseId: 'EVENT_HOUSE',
                foundedAtAbsoluteWeek: launchWeek - 12,
            },
            infrastructureStrategy: 'HYBRID',
            infrastructureSetup: {
                capacityPackageId: 'GROWTH',
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
                    configurationSignature: 'phase14-load',
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
                DATA_RECOMMENDATIONS: 24,
                CONTENT_OPERATIONS: 10,
                PRODUCT_EXPERIENCE: 8,
            },
            catalogProjectIds: ['midnight-frequency', 'glass-city'],
            originalCommissions: [{
                id: 'original-commission',
                scriptId: 'original-script',
                canonicalProjectId: 'midnight-frequency',
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
                        id: 'slate-midnight',
                        projectId: 'midnight-frequency',
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
                openingTitleCount: 2,
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

const draft: StreamingGrowthDraft = {
    projectId: 'midnight-frequency',
    channels: ['SOCIAL', 'BILLBOARD'],
    homepagePlacement: 'HERO',
    recommendationObjective: 'BREAKOUT',
    explorationPercent: 18,
    artworkVariants: ['FACE_FORWARD', 'MYSTERY_HOOK'],
};

assert(OWNED_STREAMING_PLATFORM_SCHEMA_VERSION === 22, 'Phase 24 should retain Phase 14 growth actions in owned-streaming schema v22.');
const migrated = normalizeOwnedStreamingPlatformState({ schemaVersion: 11 }, 'phase14-migration');
assert(migrated.schemaVersion === 22 && migrated.growthActions.length === 0, 'Older saves should migrate without fabricating growth actions.');

const player = createFixture();
const beforePreview = JSON.stringify(player.ownedStreamingPlatform);
const preview = previewStreamingGrowthAction(player, draft);
assert(JSON.stringify(player.ownedStreamingPlatform) === beforePreview, 'Previewing a growth action must not mutate simulation state.');
assert(preview.cashCost === 2_940_000, 'Channel, placement and artwork costs should reconcile to the visible campaign total.');
assert(preview.hasMeaningfulChange && preview.estimatedAttributedJoinsHigh > preview.estimatedAttributedJoinsLow, 'A meaningful action should expose a range, not a guaranteed subscriber grant.');
assert(preview.targetWeightBoost > 0 && preview.targetDiscoveryBias.homepage > 0 && preview.targetDiscoveryBias.direct > 0, 'The preview should expose title and discovery modifiers.');

const treasuryBefore = player.ownedStreamingPlatform.treasuryCash;
const subscribersBefore = player.ownedStreamingPlatform.metrics.subscribers;
const locked = lockStreamingGrowthAction(player, draft);
assert(locked.changed && locked.action?.status === 'LOCKED', 'A live platform should lock one next-week growth action.');
assert(locked.player.ownedStreamingPlatform.treasuryCash === treasuryBefore, 'Locking an action should not charge campaign cash early.');
assert(locked.player.ownedStreamingPlatform.metrics.subscribers === subscribersBefore, 'The action screen must never inject subscribers.');
assert(locked.player.ownedStreamingPlatform.eventLedger.some(entry => entry.type === 'GROWTH_ACTION_LOCKED'), 'Locking should create an auditable player-action ledger fact.');
assert(!lockStreamingGrowthAction(locked.player, draft).changed, 'Only one growth action may be locked for a target week.');
assert(getStreamingPromotionCenter(locked.player).lockedAction?.projectId === draft.projectId, 'The war room should restore the canonical locked action.');

const baselineInput: Player = { ...createFixture(), currentWeek: 9 };
const promotedInput: Player = { ...locked.player, currentWeek: 9 };
const baseline = processOwnedStreamingPlatformWeek(structuredClone(baselineInput) as Player);
const promotedA = processOwnedStreamingPlatformWeek(structuredClone(promotedInput) as Player);
const promotedB = processOwnedStreamingPlatformWeek(structuredClone(promotedInput) as Player);
assert(baseline.processed && promotedA.processed, 'The baseline and promoted week should both use the normal weekly processor.');
assert(JSON.stringify(promotedA.snapshot) === JSON.stringify(promotedB.snapshot), 'Campaign and recommendation results must be deterministic for identical inputs.');

const baselineOperations = baseline.snapshot!.operations!;
const promotedOperations = promotedA.snapshot!.operations!;
assert(promotedOperations.growthPlanCost === preview.cashCost, 'The committed week should charge the exact locked growth cost.');
assert(promotedOperations.totalCashCost - baselineOperations.totalCashCost === preview.cashCost, 'Campaign spend should reconcile inside platform operating cash cost.');
assert(promotedOperations.joinedSubscribers > baselineOperations.joinedSubscribers, 'This strong action should modify acquisition inside the normal simulation.');
assert(promotedOperations.appliedGrowthActionId === locked.action?.id, 'The weekly result should retain the exact applied action id.');

const applied = promotedA.player.ownedStreamingPlatform.growthActions[0];
assert(applied.status === 'APPLIED' && applied.outcome, 'The weekly processor should close the locked action with attribution.');
assert(
    applied.outcome!.attributedJoins === promotedOperations.joinedSubscribers - baselineOperations.joinedSubscribers,
    'Attributed joins should equal the deterministic promoted-versus-baseline difference.',
);
const promotedTitle = promotedOperations.titlePerformance!.find(title => title.projectId === draft.projectId)!;
const baselineTitle = baselineOperations.titlePerformance!.find(title => title.projectId === draft.projectId)!;
assert(
    applied.outcome!.attributedViewingAccounts === promotedTitle.viewingAccounts - baselineTitle.viewingAccounts,
    `Attributed viewing should equal the title result against the identical organic counterfactual (${applied.outcome!.attributedViewingAccounts} recorded vs ${promotedTitle.viewingAccounts - baselineTitle.viewingAccounts} observed).`,
);
assert(applied.outcome!.artworkWinner !== null && applied.outcome!.artworkWinnerLiftPercent! > 0, 'An armed artwork test should commit a deterministic winner and measured lift.');
assert(promotedTitle.discoveryMix.homepagePercent > baselineTitle.discoveryMix.homepagePercent, 'A hero placement should visibly increase homepage discovery share.');
assert(
    Object.values(promotedTitle.discoveryMix).reduce((total, value) => total + value, 0) === 100,
    'The promoted title discovery mix should still reconcile to one hundred percent.',
);
assert(promotedA.player.ownedStreamingPlatform.eventLedger.some(entry => entry.type === 'GROWTH_ACTION_APPLIED'), 'A completed action should create a week-processor attribution fact.');
assert(!processOwnedStreamingPlatformWeek(promotedA.player).processed, 'Reopening the same week must never charge or attribute the action twice.');

const serviceSource = readFileSync(resolve(process.cwd(), 'services/streamingPromotion.ts'), 'utf8');
const weeklySource = readFileSync(resolve(process.cwd(), 'services/streamingWeeklyLoop.ts'), 'utf8');
const componentSource = readFileSync(resolve(process.cwd(), 'components/StreamingPromotionWarRoom.tsx'), 'utf8');
const hqSource = readFileSync(resolve(process.cwd(), 'components/StreamingPlatformHQ.tsx'), 'utf8');
const dossierSource = readFileSync(resolve(process.cwd(), 'components/StreamingTitleDossier.tsx'), 'utf8');
const styleSource = readFileSync(resolve(process.cwd(), 'styles/streaming-promotion.css'), 'utf8');

assert(!serviceSource.includes('Math.random') && !weeklySource.includes('Math.random'), 'Growth outcomes must never use uncontrolled randomness.');
[
    'VIEWER HOME CONTROL WALL',
    'PAID REACH MIX',
    'RECOMMENDATION MANDATE',
    'DISCOVERY TRADEOFF',
    'ARTWORK EXPERIMENT',
    'OBSERVED DISCOVERY MIX',
    'No direct subscriber grants',
].forEach(fragment => assert(componentSource.includes(fragment), `Phase 14 experience should include ${fragment}.`));
['TRAILER', 'BILLBOARD', 'SOCIAL', 'REGIONAL'].forEach(channel => assert(serviceSource.includes(`'${channel}'`), `Phase 14 should include the ${channel} channel.`));
assert(hqSource.includes('<StreamingPromotionWarRoom') && hqSource.includes('Enter Growth War Room'), 'The live Market Room should expose the complete growth experience.');
assert(dossierSource.includes('Open Growth War Room'), 'Title discovery analysis should deep-link into the matching growth action.');
assert(styleSource.includes('@media (min-width: 720px)') && styleSource.includes('@media (min-width: 1080px)'), 'The war room should scale deliberately across mobile, tablet and desktop.');
assert(styleSource.includes('@media (prefers-reduced-motion: reduce)'), 'War-room motion should respect reduced-motion preferences.');

console.log('Streaming Promotion, Marketing and Recommendations Phase 14 audit passed.');
