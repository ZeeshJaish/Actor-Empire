import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    INITIAL_PLAYER,
    OWNED_STREAMING_PLATFORM_SCHEMA_VERSION,
    createInitialOwnedStreamingPlatformState,
    type OwnedStreamingRivalMove,
    type Player,
} from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { appointStreamingExternalExecutive } from '../services/streamingLeadershipGovernance';
import { normalizeWorldPlatformAi } from '../services/platformAi/platformAiState';
import { processOwnedStreamingPlatformWeek } from '../services/streamingWeeklyLoop';
import {
    STREAMING_REGION_DEFINITIONS,
    STREAMING_RIVAL_TEMPLATES,
    commitStreamingCompetitiveWorldWeek,
    getStreamingCompetitiveWeeklyEffects,
    getStreamingCompetitiveWorld,
    getStreamingRegionBlockers,
    respondToStreamingRivalMove,
    startStreamingRegionalLaunch,
} from '../services/streamingCompetitiveWorld';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const createFixture = (weeksLive = 8): Player => {
    const player = structuredClone(INITIAL_PLAYER) as Player;
    const initial = createInitialOwnedStreamingPlatformState('phase20-player');
    const absoluteWeek = getAbsoluteWeek(46, 20);
    return {
        ...player,
        id: 'phase20-player',
        name: 'Ari Vale',
        age: 46,
        currentWeek: 20,
        ownedStreamingPlatform: {
            ...initial,
            lifecycle: 'ACTIVE',
            identity: {
                name: 'Northstar+',
                slug: 'northstar-plus',
                primaryColor: '#f97316',
                secondaryColor: '#070912',
                logoKey: 'SIGNAL_RING',
                soundIdentKey: 'ASCENT',
                brandPromiseId: 'EVENT_HOUSE',
                foundedAtAbsoluteWeek: absoluteWeek - 80,
                publicManifesto: 'Northstar backs event television with dependable worldwide playback.',
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
                incorporatedAtAbsoluteWeek: absoluteWeek - 80,
            },
            launchCommit: {
                id: 'phase20-launch',
                idempotencyKey: 'phase20-launch',
                committedAtAbsoluteWeek: absoluteWeek - weeksLive,
                capacityPlan: 'STANDARD',
                capacityPlanCost: 0,
                readinessScore: 92,
                forecastLikelyConcurrentStreams: 2_000_000,
                forecastHighConcurrentStreams: 4_000_000,
                protectedPeakConcurrentStreams: 10_000_000,
                launchHeadroomPercent: 150,
                initialSubscribers: 2_000_000,
                openingDemandIndex: 78,
                playbackSuccessRate: 99.8,
                outcomeTier: 'SMOOTH_OPENING',
                openingTitleCount: 4,
                openingOriginalTitle: 'Signal Fire',
            },
            infrastructureStrategy: 'HYBRID',
            capacity: {
                baselineConcurrentStreams: 8_000_000,
                burstConcurrentStreams: 16_000_000,
            },
            technologyLevels: Object.fromEntries(
                Object.keys(initial.technologyLevels).map(key => [key, 40]),
            ) as typeof initial.technologyLevels,
            treasuryCash: 1_200_000_000,
            metrics: {
                ...initial.metrics,
                subscribers: 4_000_000,
                engagementRate: 0.72,
                technologyHealth: 96,
            },
        },
    };
};

assert(OWNED_STREAMING_PLATFORM_SCHEMA_VERSION === 25, 'The canonical foundation should advance owned streaming saves to schema v25.');
const migrated = normalizeOwnedStreamingPlatformState({ schemaVersion: 17 }, 'phase20-migration');
assert(migrated.schemaVersion === 25, 'Schema v17 streaming saves should migrate to the current schema.');
assert(migrated.competitiveWorld.rivals.length === 0 && migrated.competitiveWorld.awardSeasons.length === 0, 'Legacy saves should receive safe empty competitive collections.');
assert(Object.keys(STREAMING_RIVAL_TEMPLATES).length === 5, 'The competitive world should contain five named rival CEO templates.');
assert(STREAMING_REGION_DEFINITIONS.length === 7, 'The global map should contain the home market plus six expansion regions.');

const weeklyIntegrationFixture = createFixture();
const weeklyIntegrationWeek = getAbsoluteWeek(
    weeklyIntegrationFixture.age,
    weeklyIntegrationFixture.currentWeek,
);
weeklyIntegrationFixture.world = normalizeWorldPlatformAi(
    weeklyIntegrationFixture,
    weeklyIntegrationFixture.world,
    weeklyIntegrationWeek,
);
const weeklyIntegration = processOwnedStreamingPlatformWeek(weeklyIntegrationFixture);
assert(weeklyIntegration.processed, 'The Platform Wars integration fixture should process one owned-streaming week.');
const weeklyMove = weeklyIntegration.player.ownedStreamingPlatform.competitiveWorld.moves.at(-1);
assert(Boolean(weeklyMove), 'The boundary week should create one integrated rival move.');
const weeklyCommitments = weeklyIntegration.player.world.platforms?.[weeklyMove!.platformId].ai?.externalCommitments || [];
assert(
    weeklyCommitments.some(commitment => commitment.moveId === weeklyMove!.id),
    'The weekly-loop boundary must ingest each newly created rival move into canonical Platform AI commitments.',
);
const weeklyObligations = weeklyIntegration.player.world.platforms?.[weeklyMove!.platformId].ai?.pendingOneTimeObligations || [];
assert(
    weeklyObligations.some(obligation => obligation.id === `platform-war:${weeklyMove!.id}`),
    'The integrated rival move must persist one matching canonical obligation.',
);

let fixture = createFixture();
const absoluteWeek = getAbsoluteWeek(fixture.age, fixture.currentWeek);
let committed = commitStreamingCompetitiveWorldWeek(fixture.ownedStreamingPlatform, fixture, absoluteWeek);
fixture = { ...fixture, ownedStreamingPlatform: committed };
let world = getStreamingCompetitiveWorld(fixture);
assert(world.rivals.length === 5, 'The first competitive simulation should persist all five rivals.');
assert(world.rivals.every(rival => rival.ceoName && rival.ceoPersonality && rival.strategy), 'Every rival should have a named CEO, personality and strategy.');
assert(world.rivals.every(rival => rival.cashReserveMillions > 0 && rival.subscribersMillions > 0), 'Rivals should enter with real modeled cash and subscribers.');
assert(world.rivals.every(rival => rival.activeRegionIds.length > 0 && rival.baseMonthlyPrice > 0), 'Every rival should retain a real regional footprint and price position.');
assert(world.latestMoves.length === 1, 'A four-week boundary should create at most one rival move.');
const firstMove = world.latestMoves[0];
assert(Boolean(firstMove.strategyReason && firstMove.playerImpact && firstMove.battlefront), 'Every rival move should explain its cause, player impact and battlefront.');
assert(committed.competitiveWorld.weeklyRivalHistory.length === 5, 'Every processed live week should persist one subscriber movement snapshot per rival.');
assert(firstMove.rivalCashAfterMillions === firstMove.rivalCashBeforeMillions - firstMove.cashCostMillions, 'Rival cash disclosure must show the exact canonical move cost.');
const actingRival = world.rivals.find(rival => rival.platformId === firstMove.platformId)!;
assert(
    actingRival.cashReserveMillions === fixture.world.platforms?.[firstMove.platformId].cashReserve,
    'The projected rival cash is disclosure-only and must remain a projection of canonical world cash.',
);
assert(actingRival.cooldownUntilAbsoluteWeek > absoluteWeek, 'A rival move should create a real cooldown.');
assert(committed.cinematicQueue.filter(event => event.type === 'PLATFORM_WAR_DECLARATION').length === 1, 'The first funded move should queue one declaration cinematic.');
const committedAgain = commitStreamingCompetitiveWorldWeek(committed, fixture, absoluteWeek);
assert(committedAgain.competitiveWorld.moves.length === committed.competitiveWorld.moves.length, 'Reprocessing the same week must not create another rival move.');

const region = STREAMING_REGION_DEFINITIONS.find(item => item.id === 'EUROPE')!;
assert(getStreamingRegionBlockers(fixture, region).length === 0, 'A globally qualified platform should be able to review Europe without a fake joint-venture gate.');
const treasuryBeforeRegion = fixture.ownedStreamingPlatform.treasuryCash;
const regionStart = startStreamingRegionalLaunch(fixture, 'EUROPE', 'LOCAL_PARTNERSHIP');
assert(regionStart.changed, 'A qualified founder should be able to commit a regional launch.');
fixture = regionStart.player;
const regionalRecord = fixture.ownedStreamingPlatform.competitiveWorld.regionalLaunches.find(item => item.regionId === 'EUROPE')!;
assert(regionalRecord.status === 'IN_PROGRESS', 'A regional launch should begin as a canonical game-week build.');
assert(fixture.ownedStreamingPlatform.treasuryCash === treasuryBeforeRegion - regionalRecord.capitalCost, 'Regional capital should debit company treasury exactly once.');
assert(!startStreamingRegionalLaunch(fixture, 'EUROPE', 'LOCAL_PARTNERSHIP').changed, 'The same territory must not charge twice.');
assert(!startStreamingRegionalLaunch(fixture, 'SOUTH_ASIA', 'LOCAL_PARTNERSHIP').changed, 'Only one regional launch may occupy localization at a time.');
committed = commitStreamingCompetitiveWorldWeek(
    fixture.ownedStreamingPlatform,
    fixture,
    regionalRecord.readyAtAbsoluteWeek,
);
assert(committed.competitiveWorld.regionalLaunches.find(item => item.regionId === 'EUROPE')?.status === 'ACTIVE', 'A due regional launch should enter live service.');
const regionEffects = getStreamingCompetitiveWeeklyEffects(committed, regionalRecord.readyAtAbsoluteWeek);
assert(regionEffects.weeklyOperatingCost === regionalRecord.weeklyOperatingCost, 'An active region should enter the weekly operating run rate.');
assert(regionEffects.peakLoadPercent === regionalRecord.peakLoadPercent && regionEffects.acquisitionRateDelta > 0, 'An active region should add both audience opportunity and server load.');

fixture = { ...fixture, ownedStreamingPlatform: committed };
const hired = appointStreamingExternalExecutive(fixture, 'marcus-vale');
assert(hired.changed, 'The audit fixture should be able to appoint a real executive for a poaching test.');
fixture = hired.player;
const executive = fixture.ownedStreamingPlatform.leadership.appointments.find(item => item.executiveId === 'marcus-vale')!;
const poach: OwnedStreamingRivalMove = {
    id: 'phase20-poach',
    idempotencyKey: 'rival-move:APPLE_TV:poach-audit',
    platformId: 'APPLE_TV',
    platformName: 'Apple TV+',
    ceoName: STREAMING_RIVAL_TEMPLATES.APPLE_TV.ceoName,
    type: 'EXECUTIVE_POACH',
    battlefront: 'TALENT',
    targetRegionId: null,
    targetTechnologyBranch: null,
    strategyReason: 'Apple TV+ is testing Northstar leadership retention.',
    playerImpact: 'The targeted executive may leave without a founder response.',
    rivalPriceBefore: null,
    rivalPriceAfter: null,
    title: `${STREAMING_RIVAL_TEMPLATES.APPLE_TV.ceoName} calls ${executive.nameAtAppointment}`,
    detail: 'A real executive received an outside mandate.',
    status: 'OPEN',
    cashCostMillions: 18,
    rivalCashBeforeMillions: 900,
    rivalCashAfterMillions: 882,
    createdAtAbsoluteWeek: absoluteWeek,
    pressureStartsAbsoluteWeek: absoluteWeek + 1,
    expiresAtAbsoluteWeek: absoluteWeek + 1,
    acquisitionRateDelta: 0,
    churnRateDelta: 0,
    prestigeDelta: -1,
    targetExecutiveId: executive.executiveId,
    targetExecutiveName: executive.nameAtAppointment,
    responseId: null,
    responseCost: 0,
    responseAtAbsoluteWeek: null,
    outcomeNote: 'One game week remains.',
};
fixture = {
    ...fixture,
    ownedStreamingPlatform: {
        ...fixture.ownedStreamingPlatform,
        competitiveWorld: {
            ...fixture.ownedStreamingPlatform.competitiveWorld,
            moves: [...fixture.ownedStreamingPlatform.competitiveWorld.moves, poach],
        },
    },
};
const treasuryBeforeResponse = fixture.ownedStreamingPlatform.treasuryCash;
const response = respondToStreamingRivalMove(fixture, poach.id, 'EXPAND_MANDATE');
assert(response.changed, 'A poaching move should expose executive-specific founder responses.');
fixture = response.player;
assert(fixture.ownedStreamingPlatform.treasuryCash === treasuryBeforeResponse - 2_000_000, 'The expanded-mandate response should debit its disclosed cost.');
assert(fixture.ownedStreamingPlatform.leadership.appointments.find(item => item.executiveId === executive.executiveId)?.status === 'ACTIVE', 'A defended executive should remain in the real leadership table.');
assert(!respondToStreamingRivalMove(fixture, poach.id, 'EXPAND_MANDATE').changed, 'The same rival response must not charge twice.');

const technologyFixture = createFixture();
const technologyWeek = getAbsoluteWeek(technologyFixture.age, technologyFixture.currentWeek);
technologyFixture.ownedStreamingPlatform.technologyLevels = {
    ...Object.fromEntries(Object.keys(technologyFixture.ownedStreamingPlatform.technologyLevels).map(branch => [branch, 0])),
    PLAYBACK_QUALITY: 100,
} as typeof technologyFixture.ownedStreamingPlatform.technologyLevels;
let technologyPlatform = commitStreamingCompetitiveWorldWeek(
    technologyFixture.ownedStreamingPlatform,
    technologyFixture,
    technologyWeek - 1,
);
technologyPlatform = {
    ...technologyPlatform,
    competitiveWorld: {
        ...technologyPlatform.competitiveWorld,
        rivals: technologyPlatform.competitiveWorld.rivals.map(rival => ({
            ...rival,
            cooldownUntilAbsoluteWeek: rival.platformId === 'HULU' ? 0 : technologyWeek + 100,
        })),
    },
};
const technologyCommitted = commitStreamingCompetitiveWorldWeek(technologyPlatform, technologyFixture, technologyWeek);
const technologyMove = technologyCommitted.competitiveWorld.moves.at(-1)!;
assert(technologyMove.type === 'TECH_COPY', 'A dominant real technology lead must make TECH_COPY win candidate scoring.');
assert(technologyMove.targetTechnologyBranch === 'PLAYBACK_QUALITY', 'TECH_COPY must resolve the strongest canonical technology branch.');
assert(technologyMove.cashCostMillions === 58, 'TECH_COPY must expose its real 58M rival cost.');
assert(technologyMove.rivalCashBeforeMillions - technologyMove.rivalCashAfterMillions === 58, 'TECH_COPY must debit its disclosed cost exactly once.');
assert(technologyMove.strategyReason.includes('playback quality'), 'TECH_COPY scoring must explain the canonical branch that made it competitive.');

let awardsFixture = createFixture(52);
const awardsWeek = getAbsoluteWeek(awardsFixture.age, awardsFixture.currentWeek);
const snapshots = Array.from({ length: 52 }, (_, index) => ({
    id: `award-week-${index + 1}`,
    absoluteWeek: awardsWeek - 51 + index,
    subscribers: 3_000_000 + index * 25_000,
    netSubscriberMovement: 25_000,
    churnRate: 0.018,
    engagementRate: 0.74,
    averageRevenuePerUser: 12,
    cashRunwayWeeks: 40,
    technologyHealth: 96,
    causeMarkers: [],
    operations: {
        programWeek: index + 1,
        releaseTitles: index % 6 === 0 ? ['Signal Fire'] : [],
        joinedSubscribers: 40_000,
        cancellations: 15_000,
        reactivations: 0,
        subscriptionRevenue: 10_000_000,
        partnerRevenueShareCost: 0,
        infrastructureCost: 1_000_000,
        leadershipCost: 0,
        financingCost: 0,
        weeklyPlanCost: 0,
        totalCashCost: 3_000_000,
        netCashContribution: 7_000_000,
        contentAmortization: 500_000,
        accountingContribution: 6_500_000,
        peakConcurrentStreams: 1_000_000,
        capacityUtilizationPercent: 20,
        playbackSuccessRate: 99.8,
        appliedDecisionId: null,
        headline: 'Signal Fire held the service.',
        summary: 'Canonical annual evidence.',
        nextWeekHook: 'Keep operating.',
        causalDrivers: [],
        titlePerformance: index % 6 === 0 ? [{
            id: `signal-fire-${index}`,
            projectId: 'signal-fire',
            title: 'Signal Fire',
            source: 'ORIGINAL' as const,
            projectType: 'SERIES' as const,
            genre: 'DRAMA',
            absoluteWeek: awardsWeek - 51 + index,
            programWeek: index + 1,
            weeksAvailable: index + 1,
            viewingAccounts: 2_000_000,
            hoursViewed: 3_000_000,
            completionRate: 0.82,
            repeatViewingRate: 0.16,
            satisfactionScore: 92,
            discoveryMix: { homepagePercent: 30, recommendationsPercent: 40, searchPercent: 15, directPercent: 15 },
            attributedSubscriptionRevenue: 5_000_000,
            allocatedCashCost: 1_000_000,
            allocatedContentAmortization: 500_000,
            cashContribution: 4_000_000,
            accountingContribution: 3_500_000,
            playbackSuccessRate: 99.8,
        }] : [],
    },
}));
awardsFixture = {
    ...awardsFixture,
    ownedStreamingPlatform: {
        ...awardsFixture.ownedStreamingPlatform,
        weeklyHistory: snapshots,
        metrics: { ...awardsFixture.ownedStreamingPlatform.metrics, subscribers: snapshots.at(-1)!.subscribers },
    },
};
const awardsCommitted = commitStreamingCompetitiveWorldWeek(
    awardsFixture.ownedStreamingPlatform,
    awardsFixture,
    awardsWeek,
);
const awardSeason = awardsCommitted.competitiveWorld.awardSeasons[0];
assert(awardSeason?.results.length === 5, 'The annual jury should resolve all five award categories.');
assert(awardSeason.results.every(result => result.nominees.length === 3 && result.nominees.every(nominee => nominee.evidence)), 'Every award should retain a top-three evidence-backed nominee list.');
assert(awardsCommitted.cinematicQueue.filter(event => event.type === 'STREAMING_AWARDS_CEREMONY').length === 1, 'A resolved award season should queue one fact-backed ceremony.');
assert(commitStreamingCompetitiveWorldWeek(awardsCommitted, awardsFixture, awardsWeek).competitiveWorld.awardSeasons.length === 1, 'The same annual season must never resolve twice.');
const share = awardsCommitted.competitiveWorld.marketShareHistory.at(-1)!;
assert(Math.abs(share.entries.reduce((sum, entry) => sum + entry.sharePercent, 0) - 100) < 0.1, 'Canonical market-share entries should reconcile to 100%.');

const component = readFileSync(resolve(process.cwd(), 'components/StreamingPlatformWars.tsx'), 'utf8');
const styles = readFileSync(resolve(process.cwd(), 'styles/streaming-platform-wars-v2.css'), 'utf8');
const hq = readFileSync(resolve(process.cwd(), 'components/StreamingPlatformHQ.tsx'), 'utf8');
const analytics = readFileSync(resolve(process.cwd(), 'services/streamingAnalytics.ts'), 'utf8');
const weekly = readFileSync(resolve(process.cwd(), 'services/streamingWeeklyLoop.ts'), 'utf8');
assert(component.includes('PLATFORM WAR') && component.includes('CEO INTELLIGENCE') && component.includes('GLOBAL FOOTPRINT'), 'The playable surface should include the war room, persistent CEO dossiers and global map.');
assert(component.includes('TECHNOLOGY') && component.includes('onOpenTechnology'), 'Technology-copy and sabotage pressure should route into the canonical Technology Campus.');
assert(component.includes('There is no spend button') && !component.includes('Buy award'), 'Awards must explicitly remain evidence-only and unpurchasable.');
assert(component.includes('fictional characters') && component.includes('Rivals cannot create actions without enough cash'), 'The UI should disclose fictional CEO identity and resource fairness.');
assert(styles.includes('@media (max-width: 600px)') && styles.includes('prefers-reduced-motion'), 'Platform Wars should include explicit mobile and reduced-motion treatment.');
assert(hq.includes('showPlatformWars') && hq.includes('StreamingPlatformWars'), 'Market HQ should launch the complete Platform Wars suite.');
assert(analytics.includes('competitiveWorld.marketShareHistory'), 'Analytics should consume the same canonical market-share record.');
assert(weekly.includes('getStreamingCompetitiveWeeklyEffects') && weekly.includes('competitiveOperationsCost'), 'The canonical weekly loop should reconcile rivalry and regional operating consequences.');
assert(!component.includes('Acquire platform') && !component.includes('IPO') && !component.includes('server hack'), 'Phase 20 must not leak M&A, IPO or shadow-operations phases.');

console.log('✓ Streaming Rivals, Global Expansion and Awards Phase 20 audit passed');
