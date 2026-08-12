import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    INITIAL_PLAYER,
    OWNED_STREAMING_PLATFORM_SCHEMA_VERSION,
    createInitialOwnedStreamingPlatformState,
    type OwnedStreamingTitleWeekPerformance,
    type Player,
} from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { getOwnedStreamingProgramEntries } from '../services/streamingOriginals';
import {
    authorizeStreamingOriginalRelease,
    commitStreamingOriginalLocalization,
    decideStreamingOriginalFuture,
    getStreamingOriginalsStudio,
} from '../services/streamingOriginalsBusiness';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const createTelemetry = (
    absoluteWeek: number,
    programWeek: number,
): OwnedStreamingTitleWeekPerformance => ({
    id: `telemetry-${absoluteWeek}`,
    projectId: 'original-project',
    title: 'Midnight Frequency',
    source: 'ORIGINAL',
    projectType: 'SERIES',
    genre: 'MYSTERY',
    absoluteWeek,
    programWeek,
    weeksAvailable: programWeek,
    viewingAccounts: 900_000 + programWeek * 80_000,
    hoursViewed: 1_050_000 + programWeek * 90_000,
    completionRate: 0.72,
    repeatViewingRate: 0.14,
    satisfactionScore: 82,
    discoveryMix: {
        homepagePercent: 32,
        recommendationsPercent: 38,
        searchPercent: 16,
        directPercent: 14,
    },
    attributedSubscriptionRevenue: 4_000_000,
    allocatedCashCost: 1_500_000,
    allocatedContentAmortization: 900_000,
    cashContribution: 2_500_000,
    accountingContribution: 1_600_000,
    playbackSuccessRate: 99.7,
});

const createFixture = (): Player => {
    const base = structuredClone(INITIAL_PLAYER) as Player;
    const initial = createInitialOwnedStreamingPlatformState('phase15-player');
    const absoluteWeek = getAbsoluteWeek(43, 20);
    const launchWeek = absoluteWeek - 8;
    return {
        ...base,
        id: 'phase15-player',
        age: 43,
        currentWeek: 20,
        commitments: [{
            id: 'original-project',
            name: 'Midnight Frequency',
            type: 'JOB',
            energyCost: 0,
            income: 0,
            payoutType: 'LUMPSUM',
            projectPhase: 'AWAITING_RELEASE',
            phaseWeeksLeft: 0,
            totalPhaseDuration: 0,
            projectDetails: {
                title: 'Midnight Frequency',
                sourceScriptId: 'original-script',
                type: 'SERIES',
                description: 'A signal from the dark.',
                studioId: 'producer-studio',
                subtype: 'STANDALONE',
                genre: 'MYSTERY',
                targetAudience: 'PG-13',
                budgetTier: 'MID',
                estimatedBudget: 45_000_000,
                visibleHype: 'MID',
                directorName: 'Mara Vale',
                visibleDirectorTier: 'Established',
                visibleScriptBuzz: 'Strong',
                visibleCastStrength: 'Strong',
                hiddenStats: {
                    scriptQuality: 75,
                    directorQuality: 76,
                    castingStrength: 74,
                    distributionPower: 70,
                    rawHype: 72,
                    qualityScore: 76,
                    prestigeBonus: 2,
                    ownedStreamingOriginal: true,
                    ownedStreamingCommissionId: 'original-commission',
                    platformProductionFundingApplied: 45_000_000,
                },
            },
        }],
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
                foundedAtAbsoluteWeek: launchWeek - 10,
            },
            foundingProfile: {
                incorporationModel: 'FIXED_V7',
                founderCashCharged: 85_000_000,
                setupCostsConsumed: 70_000_000,
                openingTreasuryCash: 15_000_000,
                outsideCapitalRaisedAtIncorporation: 0,
                debtPrincipalAtIncorporation: 0,
                founderOwnershipPercentAtIncorporation: 100,
                founderWasCeoAtIncorporation: true,
                incorporatedAtAbsoluteWeek: launchWeek - 10,
            },
            starterCatalog: {
                packageId: 'BROAD_APPEAL',
                ownedProjectIds: [],
                licensedProjectIds: [],
                establishedAtAbsoluteWeek: launchWeek - 8,
            },
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
                status: 'DELIVERED',
                commissionedAtAbsoluteWeek: launchWeek - 7,
                greenlitAtAbsoluteWeek: launchWeek - 6,
                strategy: 'WEEKLY_RETENTION',
                lineageId: 'original-commission',
                seasonNumber: 1,
                contract: {
                    platformRightsPercent: 85,
                    producerBackendPercent: 15,
                    exclusiveWindowWeeks: 24,
                    sequelRightsIncluded: true,
                },
                localization: null,
                releasePlan: null,
                lifecycleDecision: null,
            }],
            launchSlate: {
                revision: 1,
                programmedAtAbsoluteWeek: launchWeek - 1,
                entries: [{
                    id: 'opening-entry',
                    projectId: 'catalog-project',
                    title: 'Glass City',
                    source: 'OWNED_LIBRARY',
                    projectType: 'MOVIE',
                    genre: 'THRILLER',
                    launchWeek: 1,
                    releasePattern: 'SINGLE_PREMIERE',
                    marketingPlan: 'STANDARD',
                }],
            },
            launchCommit: {
                id: 'launch-commit',
                idempotencyKey: 'launch',
                committedAtAbsoluteWeek: launchWeek,
                capacityPlan: 'CLOUD_BURST',
                capacityPlanCost: 0,
                readinessScore: 92,
                forecastLikelyConcurrentStreams: 1_000_000,
                forecastHighConcurrentStreams: 1_400_000,
                protectedPeakConcurrentStreams: 2_000_000,
                launchHeadroomPercent: 42,
                initialSubscribers: 3_000_000,
                openingDemandIndex: 78,
                playbackSuccessRate: 99.7,
                outcomeTier: 'SMOOTH_OPENING',
                openingTitleCount: 1,
                openingOriginalTitle: '',
            },
            technologyLevels: {
                ...initial.technologyLevels,
                CONTENT_OPERATIONS: 20,
            },
            treasuryCash: 40_000_000,
            weeklyHistory: Array.from({ length: 4 }, (_, index) => ({
                id: `week-${index}`,
                absoluteWeek: absoluteWeek - 3 + index,
                subscribers: 3_000_000 + index * 50_000,
                netSubscriberMovement: 50_000,
                churnRate: 0.03,
                engagementRate: 0.61,
                averageRevenuePerUser: 12,
                cashRunwayWeeks: 24,
                technologyHealth: 99.7,
                causeMarkers: ['ORIGINAL'],
                operations: {
                    programWeek: 6 + index,
                    releaseTitles: [],
                    joinedSubscribers: 80_000,
                    cancellations: 30_000,
                    reactivations: 0,
                    subscriptionRevenue: 4_000_000,
                    partnerRevenueShareCost: 0,
                    infrastructureCost: 1_000_000,
                    leadershipCost: 0,
                    financingCost: 0,
                    weeklyPlanCost: 0,
                    totalCashCost: 1_500_000,
                    netCashContribution: 2_500_000,
                    contentAmortization: 900_000,
                    accountingContribution: 1_600_000,
                    peakConcurrentStreams: 700_000,
                    capacityUtilizationPercent: 35,
                    playbackSuccessRate: 99.7,
                    appliedDecisionId: null,
                    headline: 'Original carried the week.',
                    summary: 'Measured title week.',
                    nextWeekHook: 'Audience evidence continues.',
                    causalDrivers: [],
                    titlePerformance: [createTelemetry(absoluteWeek - 3 + index, 6 + index)],
                },
            })),
        },
    };
};

assert(OWNED_STREAMING_PLATFORM_SCHEMA_VERSION === 22, 'Phase 24 should preserve the complete Originals pipeline in schema v22.');
const migrated = normalizeOwnedStreamingPlatformState({
    schemaVersion: 12,
    originalCommissions: [{
        id: 'legacy',
        scriptId: 'legacy-script',
        producerStudioId: 'legacy-studio',
        title: 'Legacy Original',
    }],
}, 'legacy-phase15');
assert(migrated.originalCommissions[0].localization === null, 'Legacy Originals should migrate without fabricated localization spend.');
assert(migrated.originalCommissions[0].releasePlan === null, 'Legacy Originals should migrate without a fabricated premiere authorization.');
assert(migrated.originalCommissions[0].contract?.platformRightsPercent === 85, 'Legacy Originals should receive safe contract defaults.');

const fixture = createFixture();
const beforeTreasury = fixture.ownedStreamingPlatform.treasuryCash;
const localized = commitStreamingOriginalLocalization(fixture, 'original-commission', 'GLOBAL');
assert(localized.changed, 'A delivered canonical Original should accept a supported localization package.');
assert(localized.player.ownedStreamingPlatform.treasuryCash === beforeTreasury - 7_500_000, 'Localization should charge company treasury exactly once.');
assert(localized.player.ownedStreamingPlatform.originalCommissions[0].localization?.readyAtAbsoluteWeek === getAbsoluteWeek(43, 20) + 3, 'Global localization should use game-week delivery.');
assert(!commitStreamingOriginalLocalization(localized.player, 'original-commission', 'GLOBAL').changed, 'Localization cannot be charged twice.');

const earlyRelease = authorizeStreamingOriginalRelease(localized.player, 'original-commission', {
    scope: 'GLOBAL',
    releasePattern: 'WEEKLY',
    marketingPlan: 'EVENT',
});
assert(!earlyRelease.changed && earlyRelease.reason === 'LOCALIZATION_IN_PROGRESS', 'Release should wait for the committed in-game localization delivery.');

const readyPlayer: Player = {
    ...localized.player,
    currentWeek: 23,
};
const released = authorizeStreamingOriginalRelease(readyPlayer, 'original-commission', {
    scope: 'GLOBAL',
    releasePattern: 'WEEKLY',
    marketingPlan: 'EVENT',
});
assert(released.changed, 'A delivered and localized Original should authorize its platform premiere.');
const releasePlan = released.player.ownedStreamingPlatform.originalCommissions[0].releasePlan;
assert(releasePlan?.scope === 'GLOBAL' && releasePlan.releasePattern === 'WEEKLY', 'Release scope and rhythm should persist on the commission.');
const releaseCommitment = released.player.commitments.find(item => item.id === 'original-project');
assert(releaseCommitment?.projectDetails?.releaseStrategy === 'STREAMING_ONLY' && releaseCommitment.phaseWeeksLeft === 1, 'Release authorization should hand the existing project to the canonical release processor.');
assert(released.player.ownedStreamingPlatform.treasuryCash === localized.player.ownedStreamingPlatform.treasuryCash, 'Release authorization should not invent a second content charge.');
assert(getOwnedStreamingProgramEntries(released.player).some(entry => entry.projectId === 'original-project'), 'The authorized Original should enter the shared program calendar by reference.');
assert(!authorizeStreamingOriginalRelease(released.player, 'original-commission', {
    scope: 'GLOBAL',
    releasePattern: 'WEEKLY',
    marketingPlan: 'EVENT',
}).changed, 'Premiere authorization must be idempotent.');

const releasedWithCanonicalResult: Player = {
    ...released.player,
    commitments: [],
    activeReleases: [{
        id: 'original-project',
        name: 'Midnight Frequency',
        type: 'SERIES',
        roleType: 'LEAD',
        projectDetails: fixture.commitments[0].projectDetails!,
        weekNum: 1,
        weeklyGross: [],
        totalGross: 0,
        budget: 45_000_000,
        status: 'FINISHED',
        imdbRating: 8.2,
        productionPerformance: 80,
        distributionPhase: 'STREAMING',
    }],
};
const studioRecord = getStreamingOriginalsStudio(releasedWithCanonicalResult)[0];
assert(studioRecord.decisionReady && studioRecord.measuredWeeks === 4, 'Four canonical title weeks should unlock the future decision room.');
const renewed = decideStreamingOriginalFuture(releasedWithCanonicalResult, 'original-commission', 'RENEW');
assert(renewed.changed && renewed.opensPitchRoom, 'Renewal should open another real commission brief.');
assert(renewed.player.ownedStreamingPlatform.originalCommissionDraft?.parentCommissionId === 'original-commission', 'The renewal draft should preserve canonical lineage.');
assert(renewed.player.ownedStreamingPlatform.originalCommissionDraft?.seasonNumber === 2, 'The renewal draft should advance the season number.');
assert(renewed.player.ownedStreamingPlatform.originalCommissions.length === 1, 'A lifecycle decision must not fabricate a second produced title.');
assert(!decideStreamingOriginalFuture(renewed.player, 'original-commission', 'RENEW').changed, 'The same title decision must not be committed twice.');

const serviceSource = readFileSync(resolve(process.cwd(), 'services/streamingOriginalsBusiness.ts'), 'utf8');
const weeklySource = readFileSync(resolve(process.cwd(), 'services/streamingWeeklyLoop.ts'), 'utf8');
const gameLoopSource = readFileSync(resolve(process.cwd(), 'services/gameLoop.ts'), 'utf8');
const componentSource = readFileSync(resolve(process.cwd(), 'components/StreamingOriginalsStudio.tsx'), 'utf8');
const hqSource = readFileSync(resolve(process.cwd(), 'components/StreamingPlatformHQ.tsx'), 'utf8');
const styleSource = readFileSync(resolve(process.cwd(), 'styles/streaming-originals-studio.css'), 'utf8');
assert(serviceSource.includes('commitStreamingOriginalLocalization') && serviceSource.includes('authorizeStreamingOriginalRelease') && serviceSource.includes('decideStreamingOriginalFuture'), 'Phase 15 should expose all three post-production decisions.');
assert(weeklySource.includes('getOwnedStreamingProgramEntries({'), 'Later Original releases should feed the existing exactly-once weekly processor through normalized platform state.');
assert(gameLoopSource.includes('isOwnedPlatformOriginal'), 'The canonical release path should not mislabel an owned Original as a rival-platform acquisition.');
assert(componentSource.includes('FUTURE DECISION ROOM') && componentSource.includes('LOCALIZATION BAY') && componentSource.includes('RELEASE CONTROL'), 'The Originals Studio should present the full pipeline as a game space.');
assert(hqSource.includes('StreamingOriginalsStudio'), 'Content Room should open the complete Originals Studio.');
assert(styleSource.includes('@media (max-width: 430px)') && styleSource.includes('prefers-reduced-motion'), 'The Phase 15 visual system should cover mobile and reduced motion.');

console.log('Streaming Originals business Phase 15 audit passed.');
