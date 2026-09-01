import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import {
    INITIAL_PLAYER,
    type AwardHistoryEntry,
    type Genre,
    type IndustryProject,
    type NewsItem,
    type PlatformAiCompanyStatus,
    type PlatformAiFinanceSnapshot,
    type PlatformAiStreamingPerformance,
    type PlatformId,
    type Player,
    type StudioId,
    type WorldState,
} from '../types';
import {
    PLATFORM_AI_PROFILES,
    PLATFORM_AI_TURN_ORDER,
    normalizePlatformAiState,
    selectPlatformAiTalent,
} from '../services/platformAi';
import { createDeterministicRng } from '../services/deterministicRandom';
import {
    AWARD_CALENDAR,
    resolveCanonicalAwardSeason,
    sanitizeAwardHistoryEntries,
} from '../services/awardLogic';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { migratePlayerSave } from '../services/saveMigration';
import {
    countPhase8EcosystemEvents,
    processPlatformAiPhase8StreamingWeek,
} from './helpers/platformAiPhase8Harness';

const CANONICAL_HORIZON_WEEKS = 2_600;
const MAX_STRESS_HORIZON_WEEKS = 20_800;
const REQUESTED_HORIZON_WEEKS = Number(process.env.PLATFORM_AI_LONG_RUN_HORIZON_WEEKS || CANONICAL_HORIZON_WEEKS);
const HORIZON_WEEKS = Number.isFinite(REQUESTED_HORIZON_WEEKS) && REQUESTED_HORIZON_WEEKS > 0
    ? Math.min(MAX_STRESS_HORIZON_WEEKS, Math.round(REQUESTED_HORIZON_WEEKS))
    : CANONICAL_HORIZON_WEEKS;
const MIDPOINT_WEEK = HORIZON_WEEKS > CANONICAL_HORIZON_WEEKS
    ? Math.floor(HORIZON_WEEKS / 2)
    : 1_300;
const RESUME_PARITY_START_WEEK = 104;
const RESUME_PARITY_WEEKS = 104;
const CHECKPOINT_WEEKS = new Set(
    [520, 1_300, CANONICAL_HORIZON_WEEKS, MIDPOINT_WEEK, HORIZON_WEEKS]
        .filter(week => week <= HORIZON_WEEKS),
);
const EPSILON = 0.011;
const MIN_RELEASE_SAMPLE = 250;
const FINANCE_HISTORY_LIMIT = 104;
const DECISION_HISTORY_LIMIT = 40;
const RELEASE_MEMORY_LIMIT = 12;
const BACK_CATALOGUE_TITLES = 650;
const HORIZON_PROJECT_INTERVAL_WEEKS = 4;
const PROGRESS_INTERVAL_WEEKS = Math.max(1, Math.round(Number(process.env.PLATFORM_AI_LONG_RUN_PROGRESS_INTERVAL || 100)));
const SKIP_PREFLIGHT = process.env.PLATFORM_AI_LONG_RUN_SKIP_PREFLIGHT === '1';
const TRACE_PERFORMANCE = process.env.PLATFORM_AI_LONG_RUN_TRACE_PERFORMANCE === '1';
const MAX_FIXTURE_RUNTIME_MS = Number(process.env.PLATFORM_AI_LONG_RUN_MAX_FIXTURE_RUNTIME_MS || 0);
const RUN_INLINE = process.env.PLATFORM_AI_LONG_RUN_INLINE === '1';
const REQUESTED_CONCURRENCY = Number(process.env.PLATFORM_AI_LONG_RUN_CONCURRENCY || 2);
const FIXTURE_CONCURRENCY = Number.isFinite(REQUESTED_CONCURRENCY) && REQUESTED_CONCURRENCY > 0
    ? Math.max(1, Math.min(4, Math.round(REQUESTED_CONCURRENCY)))
    : 2;

type FixtureRegime = 'BASELINE' | 'LEAN' | 'ADVERSE';
type ReleaseOutcome = PlatformAiStreamingPerformance['outcome'];

interface FixtureSpec {
    seed: number;
    regime: FixtureRegime;
}

interface PlatformTotals {
    platformId: PlatformId;
    releases: number;
    hits: number;
    solidResults: number;
    flops: number;
    distressWeeks: number;
    dormantWeeks: number;
    distressEpisodes: number;
    rescueEpisodes: number;
    rescues: number;
    activeWeeks: number;
    maxConcurrentProductions: number;
    duplicateCanonicalProjects: number;
    directTheatricalViolations: number;
    awardWins: number;
    commercialYearWins: number;
    awardYearWins: number;
    outcomeScore: number;
    learnedCastingChanges: number;
    cancelledProjects: number;
    completedResearchPrograms: number;
    marketExits: number;
}

interface DeterministicPlatformReport extends PlatformTotals {
    finalCashMillions: number;
    finalDebtMillions: number;
    finalValuationBillions: number;
    finalSubscribersMillions: number;
    finalResearchLevel: number;
    finalActiveMarkets: number;
    finalStatus: PlatformAiCompanyStatus;
}

interface IndustryTotals {
    newsEvents: number;
    duplicateNewsEvents: number;
    newsDateViolations: number;
    maxNewsHistory: number;
    ecosystemLaunches: number;
    ecosystemPromotions: number;
    ecosystemDistressEvents: number;
    ecosystemRecoveries: number;
    ecosystemClosures: number;
    maxActiveGeneratedOperators: number;
    maxSaveBytes: number;
}

interface CheckpointReport {
    week: number;
    platforms: DeterministicPlatformReport[];
}

interface FixtureDeterministicReport {
    seed: number;
    regime: FixtureRegime;
    checkpoints: CheckpointReport[];
    final: DeterministicPlatformReport[];
    commercialYearWinners: Array<{ year: number; platformId: PlatformId }>;
    awardYearWinners: Array<{ year: number; platformId: PlatformId }>;
    commercialScores: Record<PlatformId, number[]>;
    industry: IndustryTotals;
}

interface FixtureReport extends FixtureDeterministicReport {
    runtimeMs: number;
}

interface ObserverState {
    fixtureSeed: number;
    totals: Record<PlatformId, PlatformTotals>;
    seenWindowIds: Record<PlatformId, Record<string, true>>;
    openDistressEpisode: Record<PlatformId, boolean>;
    rescuedCurrentEpisode: Record<PlatformId, boolean>;
    commercialByYear: Record<string, Partial<Record<PlatformId, number>>>;
    awardsByYear: Record<string, Partial<Record<PlatformId, number>>>;
    observedAwardKeys: string[];
    checkpoints: CheckpointReport[];
    commercialScores: Record<PlatformId, number[]>;
    industry: IndustryTotals;
    seenNewsIds: Record<string, true>;
    seenEcosystemEventIds: Record<string, true>;
}

interface SimulationBranch {
    player: Player;
    world: WorldState;
    observer: ObserverState;
}

const ALL_FIXTURES: FixtureSpec[] = [
    ...Array.from({ length: 8 }, (_, index) => ({ seed: index + 1, regime: 'BASELINE' as const })),
    { seed: 101, regime: 'LEAN' },
    { seed: 102, regime: 'LEAN' },
    { seed: 201, regime: 'ADVERSE' },
    { seed: 202, regime: 'ADVERSE' },
];
const REQUESTED_SEED = Number(process.env.PLATFORM_AI_LONG_RUN_SEED || 0);
const FIXTURES = Number.isFinite(REQUESTED_SEED) && REQUESTED_SEED > 0
    ? ALL_FIXTURES.filter(spec => spec.seed === REQUESTED_SEED)
    : ALL_FIXTURES;
assert.ok(FIXTURES.length > 0, `No Platform AI long-run fixture exists for seed ${REQUESTED_SEED}`);

const GENRES: Genre[] = [
    'ACTION', 'ADVENTURE', 'ANIMATION', 'COMEDY', 'CRIME', 'DOCUMENTARY',
    'DRAMA', 'FANTASY', 'HORROR', 'MUSICAL', 'SCI_FI', 'SPORTS', 'SUPERHERO', 'THRILLER',
];
const PRODUCER_STUDIOS: StudioId[] = [
    'PARAMOUNT', 'HBO', 'WARNER_BROS', 'UNIVERSAL', 'ARTISAN_PICTURES',
    'SONY_PICTURES', 'LIONSGATE', 'MGM', 'DREAMWORKS', 'SEARCHLIGHT',
];

const round = (value: number, precision = 100): number => Math.round(value * precision) / precision;
const closeTo = (actual: number, expected: number, message: string): void => {
    assert.ok(Math.abs(actual - expected) <= EPSILON, `${message}: expected ${expected}, received ${actual}`);
};
const firstDifference = (left: unknown, right: unknown, path = 'world'): string | null => {
    if (left === right) return null;
    if (!left || !right || typeof left !== 'object' || typeof right !== 'object') {
        return `${path}: ${JSON.stringify(left)} !== ${JSON.stringify(right)}`;
    }
    const leftRecord = left as Record<string, unknown>;
    const rightRecord = right as Record<string, unknown>;
    const keys = [...new Set([...Object.keys(leftRecord), ...Object.keys(rightRecord)])].sort();
    for (const key of keys) {
        const difference = firstDifference(leftRecord[key], rightRecord[key], `${path}.${key}`);
        if (difference) return difference;
    }
    return null;
};

const blankTotals = (platformId: PlatformId): PlatformTotals => ({
    platformId,
    releases: 0,
    hits: 0,
    solidResults: 0,
    flops: 0,
    distressWeeks: 0,
    dormantWeeks: 0,
    distressEpisodes: 0,
    rescueEpisodes: 0,
    rescues: 0,
    activeWeeks: 0,
    maxConcurrentProductions: 0,
    duplicateCanonicalProjects: 0,
    directTheatricalViolations: 0,
    awardWins: 0,
    commercialYearWins: 0,
    awardYearWins: 0,
    outcomeScore: 0,
    learnedCastingChanges: 0,
    cancelledProjects: 0,
    completedResearchPrograms: 0,
    marketExits: 0,
});

const blankIndustryTotals = (): IndustryTotals => ({
    newsEvents: 0,
    duplicateNewsEvents: 0,
    newsDateViolations: 0,
    maxNewsHistory: 0,
    ecosystemLaunches: 0,
    ecosystemPromotions: 0,
    ecosystemDistressEvents: 0,
    ecosystemRecoveries: 0,
    ecosystemClosures: 0,
    maxActiveGeneratedOperators: 0,
    maxSaveBytes: 0,
});

const createObserver = (fixtureSeed: number): ObserverState => ({
    fixtureSeed,
    totals: Object.fromEntries(PLATFORM_AI_TURN_ORDER.map(platformId => [platformId, blankTotals(platformId)])) as Record<PlatformId, PlatformTotals>,
    seenWindowIds: Object.fromEntries(PLATFORM_AI_TURN_ORDER.map(platformId => [platformId, {}])) as Record<PlatformId, Record<string, true>>,
    openDistressEpisode: Object.fromEntries(PLATFORM_AI_TURN_ORDER.map(platformId => [platformId, false])) as Record<PlatformId, boolean>,
    rescuedCurrentEpisode: Object.fromEntries(PLATFORM_AI_TURN_ORDER.map(platformId => [platformId, false])) as Record<PlatformId, boolean>,
    commercialByYear: {},
    awardsByYear: {},
    observedAwardKeys: [],
    checkpoints: [],
    commercialScores: Object.fromEntries(PLATFORM_AI_TURN_ORDER.map(platformId => [platformId, []])) as Record<PlatformId, number[]>,
    industry: blankIndustryTotals(),
    seenNewsIds: {},
    seenEcosystemEventIds: {},
});

const projectAt = (seed: number, index: number, releasedAtAbsoluteWeek: number): IndustryProject => {
    const rng = createDeterministicRng(`platform-ai-long-run-project:${seed}:${index}`);
    const studioId = PRODUCER_STUDIOS[index % PRODUCER_STUDIOS.length];
    const genre = GENRES[Math.floor(rng() * GENRES.length)] || 'DRAMA';
    const quality = round(8 + rng() * 90);
    const year = Math.floor(Math.max(0, releasedAtAbsoluteWeek) / 52) + 1;
    const weekReleased = Math.max(0, releasedAtAbsoluteWeek) % 52 + 1;
    return {
        id: `platform-ai-long-run-${seed}-project-${index}`,
        title: `Long Run ${seed}-${index}`,
        genre,
        mediaType: index % 5 === 0 ? 'SERIES' : 'MOVIE',
        targetAudience: index % 7 === 0 ? 'R' : index % 4 === 0 ? 'PG' : 'PG-13',
        studioId,
        budgetTier: quality >= 82 ? 'HIGH' : quality >= 55 ? 'MID' : 'LOW',
        quality,
        rating: round(3.5 + quality * 0.065, 10),
        boxOffice: round((8 + rng() * 520) * 1_000_000),
        year,
        weekReleased,
        leadActorId: `long-run-actor-${seed}-${index % 180}`,
        leadActorName: `Long Run Actor ${index % 180}`,
        directorId: `long-run-director-${seed}-${index % 90}`,
        directorName: `Long Run Director ${index % 90}`,
        reviews: quality >= 75 ? 'Strong reviews' : quality >= 45 ? 'Mixed reviews' : 'Weak reviews',
        releaseStrategy: 'THEATRICAL',
    };
};

const createProjectPool = (seed: number): IndustryProject[] => {
    const projects: IndustryProject[] = [];
    for (let index = 0; index < BACK_CATALOGUE_TITLES; index += 1) {
        projects.push(projectAt(seed, index, 0));
    }
    return projects;
};

const clearAcquisitions = (player: Player): Player => ({
    ...player,
    ownedStreamingPlatform: player.ownedStreamingPlatform ? {
        ...player.ownedStreamingPlatform,
        corporateDevelopment: player.ownedStreamingPlatform.corporateDevelopment ? {
            ...player.ownedStreamingPlatform.corporateDevelopment,
            acquiredPlatformIds: [],
        } : player.ownedStreamingPlatform.corporateDevelopment,
    } : player.ownedStreamingPlatform,
});

const regimePlatform = (
    player: Player,
    platformId: PlatformId,
    regime: FixtureRegime,
    seed: number,
) => {
    const source = structuredClone(player.world.platforms![platformId]);
    const normalized = normalizePlatformAiState(source, player.id, 0);
    const leanCashMultiplier = regime === 'LEAN' ? 0.28 : 1;
    const adverseTarget = platformId === 'NETFLIX' || (seed % 2 === 0 && platformId === 'HULU');
    const adverseCash = adverseTarget ? (platformId === 'NETFLIX' ? 5 : 2) : normalized.cashReserve * 0.18;
    const adverseSubscribers = adverseTarget ? (platformId === 'NETFLIX' ? 7 : 1.5) : normalized.subscribers * 0.72;
    return {
        ...normalized,
        cashReserve: regime === 'ADVERSE' ? adverseCash : round(normalized.cashReserve * leanCashMultiplier),
        subscribers: regime === 'ADVERSE' ? adverseSubscribers : normalized.subscribers,
        recentHits: 0,
        ai: {
            ...normalized.ai!,
            lastProcessedAbsoluteWeek: -1,
            nextPlanningAbsoluteWeek: 0,
            strategyCycle: 0,
            status: 'ACTIVE' as const,
            researchQueue: [],
            slate: [],
            rightsContracts: [],
            talentBookingRefs: [],
            releaseMemory: [],
            genreMemory: {},
            audienceMemory: {},
            financeHistory: [],
            decisionHistory: [],
            pendingOneTimeObligations: [],
            pendingAudienceSettlements: [],
            debtMillions: regime === 'ADVERSE' && adverseTarget ? (platformId === 'NETFLIX' ? 4_000 : 900) : 0,
            lastRescueAbsoluteWeek: null,
            rescueCount: 0,
            healthyOperatingWeeks: 0,
            restructuringStartedAtAbsoluteWeek: null,
            restructuringFailedAtAbsoluteWeek: null,
            restructuringInterestRateMultiplier: 1,
            outstandingApprovedContentMillions: 0,
            outstandingApprovedResearchMillions: 0,
        },
    };
};

const createFixture = (spec: FixtureSpec): SimulationBranch => {
    const source = structuredClone(INITIAL_PLAYER) as Player;
    let player = clearAcquisitions({
        ...source,
        id: `platform-ai-long-run-${spec.regime.toLowerCase()}-${spec.seed}`,
        currentWeek: 1,
        age: 40,
    });
    const world: WorldState = {
        ...structuredClone(source.world),
        projects: createProjectPool(spec.seed),
        awardHistory: [],
        upcomingRivals: [],
        talentBookings: [],
        industryProductions: {},
        platforms: Object.fromEntries(PLATFORM_AI_TURN_ORDER.map(platformId => [
            platformId,
            regimePlatform({ ...player, world: source.world }, platformId, spec.regime, spec.seed),
        ])) as NonNullable<WorldState['platforms']>,
    };
    player = { ...player, world };
    const persistedPlayer = migratePlayerSave(JSON.parse(JSON.stringify(compactPlayerForPersistence(player))));
    return { player: persistedPlayer, world: persistedPlayer.world, observer: createObserver(spec.seed) };
};

const outcomePoints = (outcome: ReleaseOutcome): number => outcome === 'HIT' ? 3 : outcome === 'SOLID' ? 2 : 1;

const assertFinanceSnapshot = (
    snapshot: PlatformAiFinanceSnapshot,
    openingDebtMillions: number,
    platformId: PlatformId,
    absoluteWeek: number,
): void => {
    const prefix = `${platformId} week ${absoluteWeek}`;
    const expectedClosingCash = round(
        snapshot.openingCashMillions
        + snapshot.revenueMillions
        + snapshot.rescueIncomeMillions
        - snapshot.rescueDebtReductionMillions
        + snapshot.externalInvestmentIncomeMillions
        - snapshot.externalInvestmentArrearsReductionMillions
        - snapshot.externalInvestmentDebtReductionMillions
        - snapshot.mandatoryCostMillions
        - snapshot.financingCostMillions
        - snapshot.settledObligationCostMillions
        - snapshot.reserveAllocationMillions,
    );
    closeTo(snapshot.closingCashMillions, Math.max(0, expectedClosingCash), `${prefix} cash reconciliation`);
    closeTo(snapshot.netCashFlowMillions, snapshot.closingCashMillions - snapshot.openingCashMillions, `${prefix} net cash flow`);
    closeTo(
        snapshot.debtIncurredMillions,
        snapshot.unfundedMandatoryCostMillions + snapshot.unfundedFinancingCostMillions,
        `${prefix} mandatory shortfall-to-debt`,
    );
    const debtReduction = snapshot.allocations
        .filter(allocation => allocation.type === 'DEBT_REDUCTION')
        .reduce((sum, allocation) => sum + allocation.amountMillions, 0);
    closeTo(
        snapshot.closingDebtMillions,
        Math.max(
            0,
            openingDebtMillions
                + snapshot.debtIncurredMillions
                - debtReduction
                - snapshot.rescueDebtReductionMillions
                - snapshot.externalInvestmentArrearsReductionMillions
                - snapshot.externalInvestmentDebtReductionMillions,
        ),
        `${prefix} debt reconciliation`,
    );
    const numericValues = Object.entries(snapshot).filter(([, value]) => typeof value === 'number') as Array<[string, number]>;
    for (const [key, value] of numericValues) {
        assert.ok(Number.isFinite(value), `${prefix} ${key} must be finite`);
    }
};

const observeAwards = (
    before: AwardHistoryEntry[],
    after: AwardHistoryEntry[],
    world: WorldState,
    observer: ObserverState,
): void => {
    const known = new Set(observer.observedAwardKeys);
    for (const entry of after) {
        for (const winner of entry.winners) {
            if (!winner.projectId) continue;
            const key = `${entry.year}:${entry.type}:${winner.category}:${winner.projectId}`;
            if (known.has(key)) continue;
            const project = world.projects.find(candidate => candidate.id === winner.projectId);
            const windows = project?.streamingWindows || [];
            const original = windows.find(window => window.platformRelationship === 'ORIGINAL_COMMISSIONER');
            const ownedStudio = windows.find(window => window.platformRelationship === 'OWNED_STUDIO');
            const exclusive = windows.find(window => window.exclusivity === 'EXCLUSIVE');
            const platformId = original?.platformId || ownedStudio?.platformId || exclusive?.platformId;
            if (platformId) {
                observer.totals[platformId].awardWins += 1;
                const yearKey = String(entry.year);
                observer.awardsByYear[yearKey] ||= {};
                observer.awardsByYear[yearKey]![platformId] = (observer.awardsByYear[yearKey]![platformId] || 0) + 1;
            }
            known.add(key);
        }
    }
    void before;
    observer.observedAwardKeys = [...known].sort();
};

const observeWeek = (
    player: Player,
    before: WorldState,
    after: WorldState,
    observer: ObserverState,
    absoluteWeek: number,
): void => {
    const fullProjectAudit = absoluteWeek % 52 === 0 || CHECKPOINT_WEEKS.has(absoluteWeek);
    if (fullProjectAudit) {
        const ids = after.projects.map(project => project.id);
        const duplicateCount = ids.length - new Set(ids).size;
        assert.equal(duplicateCount, 0, `Canonical project IDs must remain unique at week ${absoluteWeek}`);
        const originalViolations = after.projects.filter(project => (
            project.platformContentSource === 'COMMISSIONED_ORIGINAL'
            && (project.releaseStrategy !== 'STREAMING_ONLY' || project.boxOffice !== 0)
        ));
        assert.equal(originalViolations.length, 0, `AI commissioned originals must remain streaming-only at week ${absoluteWeek}`);
    } else if (after.projects !== before.projects) {
        const beforeIds = new Set(before.projects.map(project => project.id));
        const newIds = new Set<string>();
        for (const project of after.projects) {
            if (beforeIds.has(project.id)) continue;
            assert.ok(!newIds.has(project.id), `New canonical project IDs must be unique at week ${absoluteWeek}`);
            newIds.add(project.id);
            assert.ok(
                project.platformContentSource !== 'COMMISSIONED_ORIGINAL'
                || (project.releaseStrategy === 'STREAMING_ONLY' && project.boxOffice === 0),
                `AI commissioned originals must remain streaming-only at week ${absoluteWeek}`,
            );
        }
    }

    const allProductions = Object.values(after.industryProductions || {});
    const activeProductionCounts = Object.fromEntries(
        PLATFORM_AI_TURN_ORDER.map(platformId => [platformId, 0]),
    ) as Record<PlatformId, number>;
    const newProductionsByPlatform = Object.fromEntries(
        PLATFORM_AI_TURN_ORDER.map(platformId => [platformId, []]),
    ) as Record<PlatformId, typeof allProductions>;
    for (const production of allProductions) {
        const platformId = production.commissioningPlatformId;
        if (!platformId || !PLATFORM_AI_TURN_ORDER.includes(platformId)) continue;
        if (!['DELIVERED', 'CANCELLED'].includes(production.status)) activeProductionCounts[platformId] += 1;
        if (!before.industryProductions?.[production.id] && production.aiExecution) {
            newProductionsByPlatform[platformId].push(production);
        }
    }
    let projectsById: Map<string, IndustryProject> | null = null;

    for (const platformId of PLATFORM_AI_TURN_ORDER) {
        const previous = before.platforms![platformId];
        const platform = after.platforms![platformId];
        const ai = platform.ai!;
        const total = observer.totals[platformId];
        assert.ok(platform.cashReserve >= 0, `${platformId} cash cannot be negative at week ${absoluteWeek}`);
        assert.ok(Number.isFinite(platform.cashReserve), `${platformId} cash must be finite at week ${absoluteWeek}`);
        assert.ok(Number.isFinite(ai.debtMillions), `${platformId} debt must be finite at week ${absoluteWeek}`);
        assert.ok(Number.isFinite(ai.standaloneValuationBillions), `${platformId} valuation must be finite at week ${absoluteWeek}`);
        assert.ok(ai.decisionHistory.length <= DECISION_HISTORY_LIMIT, `${platformId} decision history overflow`);
        assert.ok(ai.financeHistory.length <= FINANCE_HISTORY_LIMIT, `${platformId} finance history overflow`);
        assert.ok(ai.releaseMemory.length <= RELEASE_MEMORY_LIMIT, `${platformId} release memory overflow`);

        const snapshot = ai.financeHistory.find(item => item.absoluteWeek === absoluteWeek);
        assert.ok(snapshot, `${platformId} must settle one finance snapshot at week ${absoluteWeek}`);
        assertFinanceSnapshot(snapshot!, previous.ai?.debtMillions || 0, platformId, absoluteWeek);
        const earmarks = (ai.outstandingApprovedContentMillions || 0) + (ai.outstandingApprovedResearchMillions || 0);
        assert.ok(
            snapshot!.closingCashMillions <= snapshot!.reserveTargetMillions * 1.25 + earmarks + EPSILON,
            `${platformId} excess cash must be explained by reserve target, approved earmarks, or a distribution`,
        );

        if (ai.status === 'ACTIVE') total.activeWeeks += 1;
        if (ai.status === 'DISTRESSED' || ai.status === 'RESTRUCTURING') total.distressWeeks += 1;
        if (ai.status === 'DORMANT') total.dormantWeeks += 1;
        if (previous.ai?.status === 'ACTIVE' && ai.status === 'DISTRESSED') {
            total.distressEpisodes += 1;
            observer.openDistressEpisode[platformId] = true;
            observer.rescuedCurrentEpisode[platformId] = false;
        }
        if (ai.rescueCount > (previous.ai?.rescueCount || 0)) {
            total.rescues += ai.rescueCount - (previous.ai?.rescueCount || 0);
            if (observer.openDistressEpisode[platformId] && !observer.rescuedCurrentEpisode[platformId]) {
                total.rescueEpisodes += 1;
                observer.rescuedCurrentEpisode[platformId] = true;
            }
        }
        const currentDecisions = ai.decisionHistory.filter(decision => decision.absoluteWeek === absoluteWeek);
        total.cancelledProjects += currentDecisions.filter(decision => (
            decision.type === 'CANCELLATION' || decision.type === 'PRODUCTION_CANCELLED'
        )).length;
        total.marketExits += currentDecisions.filter(decision => (
            decision.type === 'REGION_WITHDRAWAL' || decision.action === 'WITHDRAW_REGION'
        )).length;
        const previousResearchStages = new Map((previous.ai?.researchQueue || []).map(item => [item.id, item.stage]));
        total.completedResearchPrograms += ai.researchQueue.filter(item => (
            item.stage === 'OPERATING' && previousResearchStages.get(item.id) !== 'OPERATING'
        )).length;
        if (observer.openDistressEpisode[platformId] && (ai.status === 'ACTIVE' || ai.status === 'DORMANT')) {
            observer.openDistressEpisode[platformId] = false;
        }

        const concurrentProductions = activeProductionCounts[platformId];
        total.maxConcurrentProductions = Math.max(total.maxConcurrentProductions, concurrentProductions);

        const newProductions = newProductionsByPlatform[platformId];
        for (const production of newProductions) {
            const plan = ai.slate.find(item => item.id === production.platformContentPlanId);
            if (!plan || !production.aiExecution) continue;
            const withoutMemory = selectPlatformAiTalent({
                player: { ...player, world: after },
                platformId,
                canonicalProjectId: production.canonicalProjectId,
                genre: production.genre,
                productionCalendar: production.productionCalendar,
                bookings: after.talentBookings,
                releaseMemory: [],
            });
            if (withoutMemory && (
                withoutMemory.leadActor.id !== production.aiExecution.leadActorId
                || withoutMemory.director.id !== production.aiExecution.directorId
            )) total.learnedCastingChanges += 1;
        }

        const seen = observer.seenWindowIds[platformId];
        const newlyReleasedEntries = ai.slate
            .filter(plan => plan.status === 'RELEASED' && plan.releasedAtAbsoluteWeek === absoluteWeek)
            .flatMap(plan => plan.releaseEntries)
            .filter(entry => entry.status === 'RELEASED' && entry.streamingWindowId);
        if (newlyReleasedEntries.length && !projectsById) {
            projectsById = new Map(after.projects.map(project => [project.id, project]));
        }
        for (const entry of newlyReleasedEntries) {
            const project = projectsById!.get(entry.canonicalProjectId);
            const window = project?.streamingWindows?.find(candidate => candidate.id === entry.streamingWindowId);
            assert.ok(window, `${platformId} released window ${entry.streamingWindowId} must exist canonically`);
            if (seen[window!.id]) continue;
            seen[window!.id] = true;
            total.releases += 1;
            total[window!.performance.outcome === 'HIT' ? 'hits' : window!.performance.outcome === 'FLOP' ? 'flops' : 'solidResults'] += 1;
            total.outcomeScore += outcomePoints(window!.performance.outcome);
            observer.commercialScores[platformId].push(window!.performance.commercialScore);
            const year = Math.floor(window!.startsAtAbsoluteWeek / 52) + 1;
            const yearKey = String(year);
            observer.commercialByYear[yearKey] ||= {};
            // Compare commercial execution against each service's own audience
            // base. Raw subscriber millions would mechanically award nearly every
            // year to the largest free/ad-supported incumbent.
            const normalizedSubscriberImpact = window!.performance.subscriberImpactMillions
                / Math.max(1, platform.subscribers) * 100;
            observer.commercialByYear[yearKey]![platformId] = round(Math.max(
                observer.commercialByYear[yearKey]![platformId] || Number.NEGATIVE_INFINITY,
                normalizedSubscriberImpact,
            ), 1_000);
        }
    }
    observeAwards(before.awardHistory, after.awardHistory, after, observer);
};

const winnerRows = (
    valuesByYear: ObserverState['commercialByYear'],
    observer: ObserverState,
    metric: 'commercialYearWins' | 'awardYearWins',
): Array<{ year: number; platformId: PlatformId }> => Object.entries(valuesByYear)
    .flatMap(([year, values]) => {
        const entries = PLATFORM_AI_TURN_ORDER
            .map(platformId => ({ platformId, value: values[platformId] || 0 }))
            .filter(item => Object.prototype.hasOwnProperty.call(values, item.platformId))
            .sort((left, right) => right.value - left.value || left.platformId.localeCompare(right.platformId));
        const winner = entries[0];
        if (!winner) return [];
        observer.totals[winner.platformId][metric] += 1;
        return [{ year: Number(year), platformId: winner.platformId }];
    });

const platformReports = (world: WorldState, observer: ObserverState): DeterministicPlatformReport[] => (
    PLATFORM_AI_TURN_ORDER.map(platformId => {
        const platform = world.platforms![platformId];
        return {
            ...observer.totals[platformId],
            finalCashMillions: platform.cashReserve,
            finalDebtMillions: platform.ai!.debtMillions,
            finalValuationBillions: platform.ai!.standaloneValuationBillions,
            finalSubscribersMillions: platform.subscribers,
            finalResearchLevel: round(Object.values(platform.ai!.capabilities.technologyLevels)
                .reduce((sum, level) => sum + level, 0)),
            finalActiveMarkets: platform.ai!.capabilities.activeCountryIds.length,
            finalStatus: platform.ai!.status,
        };
    })
);

const captureCheckpoint = (world: WorldState, observer: ObserverState, week: number): void => {
    observer.checkpoints.push({ week, platforms: platformReports(world, observer) });
};

const deterministicReport = (
    spec: FixtureSpec,
    branch: SimulationBranch,
): FixtureDeterministicReport => {
    const observer = structuredClone(branch.observer);
    const commercialYearWinners = winnerRows(observer.commercialByYear, observer, 'commercialYearWins');
    const awardYearWinners = winnerRows(observer.awardsByYear, observer, 'awardYearWins');
    return {
        seed: spec.seed,
        regime: spec.regime,
        checkpoints: observer.checkpoints,
        final: platformReports(branch.world, observer),
        commercialYearWinners,
        awardYearWinners,
        commercialScores: observer.commercialScores,
        industry: observer.industry,
    };
};

const observeIndustryWeek = (
    player: Player,
    world: WorldState,
    news: NewsItem[],
    observer: ObserverState,
    absoluteWeek: number,
): void => {
    const expectedYear = Math.floor(Math.max(0, absoluteWeek) / 52) + 1;
    const expectedWeek = Math.max(0, absoluteWeek) % 52 + 1;
    for (const item of news) {
        if (observer.seenNewsIds[item.id]) observer.industry.duplicateNewsEvents += 1;
        observer.seenNewsIds[item.id] = true;
        observer.industry.newsEvents += 1;
        if (item.year !== expectedYear || item.week !== expectedWeek) observer.industry.newsDateViolations += 1;
    }
    assert.equal(observer.industry.duplicateNewsEvents, 0, `News events must remain unique at week ${absoluteWeek}.`);
    assert.equal(observer.industry.newsDateViolations, 0, `News events must use the entered calendar week ${absoluteWeek}.`);
    assert.ok(player.news.length <= 50, `Live News history must remain bounded at week ${absoluteWeek}.`);
    assert.equal(new Set(player.news.map(item => item.id)).size, player.news.length, `Saved News IDs must remain unique at week ${absoluteWeek}.`);
    observer.industry.maxNewsHistory = Math.max(observer.industry.maxNewsHistory, player.news.length);

    const ecosystem = world.streamingPlatformEcosystem!;
    assert.ok(ecosystem.eventHistory.length <= 120, `Ecosystem event history overflow at week ${absoluteWeek}.`);
    assert.equal(new Set(ecosystem.eventHistory.map(event => event.id)).size, ecosystem.eventHistory.length, `Ecosystem event IDs must remain unique at week ${absoluteWeek}.`);
    const unseenEvents = ecosystem.eventHistory.filter(event => !observer.seenEcosystemEventIds[event.id]);
    for (const event of unseenEvents) {
        observer.seenEcosystemEventIds[event.id] = true;
    }
    const eventCounts = countPhase8EcosystemEvents(unseenEvents);
    observer.industry.ecosystemLaunches += eventCounts.launches;
    observer.industry.ecosystemPromotions += eventCounts.promotions;
    observer.industry.ecosystemDistressEvents += eventCounts.distress;
    observer.industry.ecosystemRecoveries += eventCounts.recoveries;
    observer.industry.ecosystemClosures += eventCounts.closures;
    const activeGenerated = Object.values(ecosystem.operators).filter(operator => (
        operator.kind === 'DYNAMIC_FICTIONAL' && operator.lifecycle !== 'CLOSED' && operator.lifecycle !== 'ACQUIRED'
    ));
    observer.industry.maxActiveGeneratedOperators = Math.max(
        observer.industry.maxActiveGeneratedOperators,
        activeGenerated.length,
    );
    for (const operator of Object.values(ecosystem.operators)) {
        if (operator.kind === 'CORE_GLOBAL' || operator.lifecycle === 'CLOSED' || operator.lifecycle === 'ACQUIRED') continue;
        assert.equal(operator.lastProcessedAbsoluteWeek, absoluteWeek, `${operator.id} missed ecosystem week ${absoluteWeek}.`);
    }
    for (const market of Object.values(ecosystem.markets)) {
        const totalShare = market.shares.reduce((sum, share) => sum + share.sharePercent, 0) + market.othersSharePercent;
        closeTo(totalShare, 100, `${market.countryId} market-share normalization at week ${absoluteWeek}`);
    }
};

type MaterializedReferenceKind =
    | 'streamingWindow'
    | 'slateSource'
    | 'releaseEntrySource'
    | 'releasedCanonicalEntry'
    | 'releaseMemory'
    | 'rightsContractSource'
    | 'materializedIndustryProduction'
    | 'releasedIndustryProduction'
    | 'awardWinner';

type PlannedReferenceKind = 'plannedCanonicalEntry' | 'plannedIndustryProduction';

interface ProjectReferenceReport {
    materializedRequired: Map<string, Set<MaterializedReferenceKind>>;
    legitimatePlanned: Map<string, Set<PlannedReferenceKind>>;
}

const collectProjectReferenceReport = (world: WorldState): ProjectReferenceReport => {
    const materializedRequired = new Map<string, Set<MaterializedReferenceKind>>();
    const legitimatePlanned = new Map<string, Set<PlannedReferenceKind>>();
    const materializedIds = new Set(world.projects.map(project => project.id));
    const addRequired = (id: unknown, kind: MaterializedReferenceKind): void => {
        if (typeof id !== 'string' || !id) return;
        const kinds = materializedRequired.get(id) || new Set<MaterializedReferenceKind>();
        kinds.add(kind);
        materializedRequired.set(id, kinds);
        legitimatePlanned.delete(id);
    };
    const addPlanned = (id: unknown, kind: PlannedReferenceKind): void => {
        if (typeof id !== 'string' || !id || materializedRequired.has(id)) return;
        const kinds = legitimatePlanned.get(id) || new Set<PlannedReferenceKind>();
        kinds.add(kind);
        legitimatePlanned.set(id, kinds);
    };

    for (const project of world.projects) {
        if (project.streamingWindows?.length) addRequired(project.id, 'streamingWindow');
    }
    for (const platform of Object.values(world.platforms || {})) {
        for (const plan of platform.ai?.slate || []) {
            plan.sourceProjectIds.forEach(projectId => addRequired(projectId, 'slateSource'));
            for (const entry of plan.releaseEntries) {
                addRequired(entry.sourceProjectId, 'releaseEntrySource');
                if (materializedIds.has(entry.canonicalProjectId) || entry.status === 'RELEASED' || plan.status === 'RELEASED') {
                    addRequired(entry.canonicalProjectId, 'releasedCanonicalEntry');
                } else {
                    addPlanned(entry.canonicalProjectId, 'plannedCanonicalEntry');
                }
            }
        }
        platform.ai?.releaseMemory.forEach(memory => addRequired(memory.projectId, 'releaseMemory'));
        platform.ai?.rightsContracts.forEach(contract => {
            if (contract.contentSource !== 'COMMISSIONED_ORIGINAL') {
                addRequired(contract.sourceProjectId, 'rightsContractSource');
            }
        });
    }
    for (const production of Object.values(world.industryProductions || {})) {
        const releasedPlan = Object.values(world.platforms || {}).some(platform => (
            platform.ai?.slate.some(plan => (
                (plan.id === production.platformContentPlanId || plan.industryProductionId === production.id)
                && plan.status === 'RELEASED'
            ))
        ));
        if (materializedIds.has(production.canonicalProjectId)) {
            addRequired(production.canonicalProjectId, 'materializedIndustryProduction');
        } else if (releasedPlan) {
            addRequired(production.canonicalProjectId, 'releasedIndustryProduction');
        } else {
            addPlanned(production.canonicalProjectId, 'plannedIndustryProduction');
        }
    }
    world.awardHistory.forEach(season => season.winners.forEach(winner => {
        // Canonical ceremonies intentionally synthesize deterministic fallback
        // winner IDs when no eligible project exists. Only real materialized
        // project links participate in persistence-retention assertions.
        if (winner.projectId && materializedIds.has(winner.projectId)) addRequired(winner.projectId, 'awardWinner');
    }));
    return { materializedRequired, legitimatePlanned };
};

const assertProjectReferenceIntegrity = (
    expectedReferences: Map<string, Set<MaterializedReferenceKind>>,
    world: WorldState,
    context: string,
): void => {
    const canonicalProjectIds = new Set(world.projects.map(project => project.id));
    for (const [projectId, referenceKinds] of expectedReferences) {
        assert.ok(
            canonicalProjectIds.has(projectId),
            `${context} lost required materialized project ${projectId} via ${[...referenceKinds].sort().join(',')}`,
        );
    }
};

const assertProjectReferenceClassifier = (): void => {
    const branch = createFixture({ seed: 1, regime: 'BASELINE' });
    const plannedOnlyWorld = structuredClone(branch.world);
    plannedOnlyWorld.platforms!.NETFLIX.ai!.slate = [{
        source: 'COMMISSIONED_ORIGINAL',
        status: 'SCHEDULED',
        sourceProjectIds: [],
        releaseEntries: [{
            sourceProjectId: null,
            canonicalProjectId: 'future-unmaterialized-original',
            status: 'SCHEDULED',
        }],
    } as never];
    const plannedReport = collectProjectReferenceReport(plannedOnlyWorld);
    assert.ok(
        plannedReport.legitimatePlanned.get('future-unmaterialized-original')?.has('plannedCanonicalEntry'),
        'Pre-release future canonical IDs must be reported as legitimate planned references.',
    );
    assert.doesNotThrow(() => assertProjectReferenceIntegrity(
        plannedReport.materializedRequired,
        plannedOnlyWorld,
        'Reference classifier planned-original self-test',
    ));

    const danglingWorld = structuredClone(plannedOnlyWorld);
    danglingWorld.platforms!.NETFLIX.ai!.releaseMemory = [{ projectId: 'dangling-release-memory-project' } as never];
    const danglingReport = collectProjectReferenceReport(danglingWorld);
    assert.throws(
        () => assertProjectReferenceIntegrity(
            danglingReport.materializedRequired,
            danglingWorld,
            'Reference classifier dangling-materialized self-test',
        ),
        /dangling-release-memory-project via releaseMemory/,
        'Required materialized references must never be hidden by an intersection with existing projects.',
    );
};

const resumeThroughProductionPersistence = (branch: SimulationBranch): SimulationBranch => {
    const referenceReport = collectProjectReferenceReport(branch.world);
    assert.ok(
        referenceReport.materializedRequired.size > 0,
        `Persistence integrity audit requires materialized references; legitimate planned references: ${referenceReport.legitimatePlanned.size}.`,
    );
    assertProjectReferenceIntegrity(referenceReport.materializedRequired, branch.world, 'Pre-persistence canonical world');
    const synchronizedPlayer = { ...branch.player, world: branch.world };
    const compacted = compactPlayerForPersistence(synchronizedPlayer);
    assert.ok(compacted.flags?.persistenceCompaction, 'Midpoint resume must execute production save compaction.');
    assertProjectReferenceIntegrity(referenceReport.materializedRequired, compacted.world, 'Production compaction');
    const serialized = JSON.parse(JSON.stringify(compacted)) as Player;
    const migrated = migratePlayerSave(serialized);
    assertProjectReferenceIntegrity(referenceReport.materializedRequired, migrated.world, 'Serialized production resume');
    return {
        player: migrated,
        world: migrated.world,
        observer: structuredClone(branch.observer),
    };
};

const resolveCanonicalCeremonyWeek = (
    player: Player,
    world: WorldState,
    absoluteWeek: number,
): WorldState => {
    const ceremonyWeek = (absoluteWeek - 1) % 52 + 1;
    const definition = AWARD_CALENDAR[ceremonyWeek];
    if (!definition) return world;
    const awardYear = Math.floor((absoluteWeek - 1) / 52) + 1;
    if (world.awardHistory.some(entry => entry.type === definition.type && entry.year === awardYear)) {
        return world;
    }
    const ceremonyPlayer: Player = {
        ...player,
        age: awardYear,
        currentWeek: ceremonyWeek,
        world,
    };
    const season = resolveCanonicalAwardSeason(ceremonyPlayer, definition.type, awardYear);
    return {
        ...world,
        awardHistory: sanitizeAwardHistoryEntries([...world.awardHistory, season]),
    };
};

const processWeek = (branch: SimulationBranch, absoluteWeek: number): SimulationBranch => {
    const weekStartedAt = performance.now();
    const shouldInjectIndustryRelease = (absoluteWeek - 1) % HORIZON_PROJECT_INTERVAL_WEEKS === 0;
    const injectedProjectIndex = BACK_CATALOGUE_TITLES + Math.floor((absoluteWeek - 1) / HORIZON_PROJECT_INTERVAL_WEEKS);
    const injectedWorld = shouldInjectIndustryRelease
        && !branch.world.projects.some(project => project.id === `platform-ai-long-run-${branch.observer.fixtureSeed}-project-${injectedProjectIndex}`)
            ? {
                ...branch.world,
                projects: [...branch.world.projects, projectAt(branch.observer.fixtureSeed, injectedProjectIndex, absoluteWeek)],
            }
            : branch.world;
    const synchronizedPlayer = { ...branch.player, world: injectedWorld };
    const before = synchronizedPlayer.world;
    const result = processPlatformAiPhase8StreamingWeek(synchronizedPlayer, before, absoluteWeek);
    const simulationFinishedAt = performance.now();
    const world = resolveCanonicalCeremonyWeek(synchronizedPlayer, result.world, absoluteWeek);
    const observer = branch.observer;
    observeWeek(synchronizedPlayer, before, world, observer, absoluteWeek);
    observeIndustryWeek(result.player, world, result.news, observer, absoluteWeek);
    const observationFinishedAt = performance.now();
    if (CHECKPOINT_WEEKS.has(absoluteWeek)) captureCheckpoint(world, observer, absoluteWeek);
    const playerWithCanonicalWorld = { ...result.player, world };
    const player = absoluteWeek % 52 === 0 || CHECKPOINT_WEEKS.has(absoluteWeek)
        ? compactPlayerForPersistence(playerWithCanonicalWorld)
        : playerWithCanonicalWorld;
    if (absoluteWeek % 52 === 0 || CHECKPOINT_WEEKS.has(absoluteWeek)) {
        observer.industry.maxSaveBytes = Math.max(
            observer.industry.maxSaveBytes,
            Buffer.byteLength(JSON.stringify(player), 'utf8'),
        );
    }
    if (TRACE_PERFORMANCE && absoluteWeek % PROGRESS_INTERVAL_WEEKS === 0) {
        const memory = process.memoryUsage();
        console.log('PHASE8_WEEK_TIMING', JSON.stringify({
            absoluteWeek,
            simulationMs: round(simulationFinishedAt - weekStartedAt),
            observationMs: round(observationFinishedAt - simulationFinishedAt),
            persistenceMs: round(performance.now() - observationFinishedAt),
            rssMb: round(memory.rss / 1024 / 1024),
            heapUsedMb: round(memory.heapUsed / 1024 / 1024),
            projects: world.projects.length,
            productions: Object.keys(world.industryProductions || {}).length,
            plans: PLATFORM_AI_TURN_ORDER.reduce((sum, platformId) => sum + world.platforms![platformId].ai!.slate.length, 0),
        }));
    }
    return { player, world: player.world, observer };
};

const assertProcessWeekWorldSynchronization = (): void => {
    const branch = createFixture({ seed: 1, regime: 'BASELINE' });
    branch.world = { ...branch.world, projects: branch.world.projects.slice(1) };
    const processed = processWeek(branch, 1);
    assert.strictEqual(processed.player.world, processed.world, 'processWeek must keep player.world synchronized with the canonical branch world.');
};

const runFixture = (spec: FixtureSpec): FixtureReport => {
    const startedAt = performance.now();
    let primary = createFixture(spec);
    for (let absoluteWeek = 1; absoluteWeek <= HORIZON_WEEKS; absoluteWeek += 1) {
        primary = processWeek(primary, absoluteWeek);
        if (absoluteWeek % PROGRESS_INTERVAL_WEEKS === 0) {
            console.log(`Fixture ${spec.seed}: ${absoluteWeek}/${HORIZON_WEEKS} weeks verified`);
        }
        if (absoluteWeek === MIDPOINT_WEEK) {
            const restored = resumeThroughProductionPersistence(primary);
            const midpointDifference = firstDifference(primary.world, restored.world);
            assert.equal(midpointDifference, null, `Midpoint migration changed canonical world: ${midpointDifference}`);
            const { world: _primaryWorld, ...primaryEnvelope } = primary.player;
            const { world: _restoredWorld, ...restoredEnvelope } = restored.player;
            void _primaryWorld;
            void _restoredWorld;
            const midpointPlayerDifference = firstDifference(primaryEnvelope, restoredEnvelope, 'player');
            assert.equal(midpointPlayerDifference, null, `Midpoint migration changed deterministic player input: ${midpointPlayerDifference}`);
            // The balance simulation continues on the restored branch only.
            // Exact weekly dual-branch parity is covered by the bounded audit below.
            primary = restored;
        }
    }
    const persistedPrimary = resumeThroughProductionPersistence(primary);
    const finalWorldDifference = firstDifference(primary.world, persistedPrimary.world);
    assert.equal(finalWorldDifference, null, `Final migration changed canonical world: ${finalWorldDifference}`);
    const report = deterministicReport(spec, persistedPrimary);
    return { ...report, runtimeMs: round(performance.now() - startedAt) };
};

const assertExactWeeklyResumeParity = (): void => {
    let primary = createFixture({ seed: 997, regime: 'BASELINE' });
    for (let absoluteWeek = 1; absoluteWeek <= RESUME_PARITY_START_WEEK; absoluteWeek += 1) {
        primary = processWeek(primary, absoluteWeek);
    }
    let restored = resumeThroughProductionPersistence(primary);
    assert.equal(
        firstDifference(primary.world, restored.world),
        null,
        'The exact resume-parity fixture must start from an identical canonical world.',
    );
    for (
        let absoluteWeek = RESUME_PARITY_START_WEEK + 1;
        absoluteWeek <= RESUME_PARITY_START_WEEK + RESUME_PARITY_WEEKS;
        absoluteWeek += 1
    ) {
        primary = processWeek(primary, absoluteWeek);
        restored = processWeek(restored, absoluteWeek);
        const worldDifference = firstDifference(primary.world, restored.world);
        assert.equal(worldDifference, null, `Exact resume parity diverged at week ${absoluteWeek}: ${worldDifference}`);
        const { world: _primaryWorld, ...primaryEnvelope } = primary.player;
        const { world: _restoredWorld, ...restoredEnvelope } = restored.player;
        void _primaryWorld;
        void _restoredWorld;
        assert.equal(
            firstDifference(primaryEnvelope, restoredEnvelope, 'player'),
            null,
            `Exact resume player envelope diverged at week ${absoluteWeek}.`,
        );
        assert.equal(
            firstDifference(primary.observer, restored.observer, 'observer'),
            null,
            `Exact resume observer diverged at week ${absoluteWeek}.`,
        );
    }
};

const assertAcquisitionStopInvariant = (): void => {
    let branch = createFixture({ seed: 999, regime: 'BASELINE' });
    branch = processWeek(branch, 1);
    const owned = branch.player.ownedStreamingPlatform!;
    branch.player = {
        ...branch.player,
        ownedStreamingPlatform: {
            ...owned,
            corporateDevelopment: {
                ...owned.corporateDevelopment,
                acquiredPlatformIds: [...owned.corporateDevelopment.acquiredPlatformIds, 'NETFLIX'],
            },
        },
    };
    const acquiredBefore = JSON.stringify(branch.world.platforms!.NETFLIX);
    const otherCheckpoint = branch.world.platforms!.HULU.ai!.lastProcessedAbsoluteWeek;
    const ecosystemCheckpoint = branch.world.streamingPlatformEcosystem!.lastProcessedAbsoluteWeek;
    const result = processPlatformAiPhase8StreamingWeek(branch.player, branch.world, 2);
    assert.equal(JSON.stringify(result.world.platforms!.NETFLIX), acquiredBefore, 'Acquired platform must remain byte-for-byte unchanged');
    assert.ok(result.world.platforms!.HULU.ai!.lastProcessedAbsoluteWeek > otherCheckpoint, 'Unacquired platform must keep processing');
    assert.ok(
        result.world.streamingPlatformEcosystem!.lastProcessedAbsoluteWeek > ecosystemCheckpoint,
        'Player acquisition must not stop the wider streaming ecosystem turn.',
    );
    assert.strictEqual(result.player.world, result.world, 'Acquisition handoff must retain the canonical player/world reference.');
};

const aggregateReports = (reports: FixtureReport[]) => {
    const totals = Object.fromEntries(PLATFORM_AI_TURN_ORDER.map(platformId => [platformId, blankTotals(platformId)])) as Record<PlatformId, PlatformTotals>;
    for (const report of reports) {
        for (const row of report.final) {
            const total = totals[row.platformId];
            for (const key of Object.keys(total) as Array<keyof PlatformTotals>) {
                if (key === 'platformId') continue;
                total[key] = (total[key] as number) + (row[key] as number) as never;
            }
        }
    }
    const releases = Object.values(totals).reduce((sum, row) => sum + row.releases, 0);
    const hits = Object.values(totals).reduce((sum, row) => sum + row.hits, 0);
    const flops = Object.values(totals).reduce((sum, row) => sum + row.flops, 0);
    const distressEpisodes = Object.values(totals).reduce((sum, row) => sum + row.distressEpisodes, 0);
    const rescueEpisodes = Object.values(totals).reduce((sum, row) => sum + row.rescueEpisodes, 0);
    return {
        totals,
        releases,
        hits,
        flops,
        hitRate: releases ? hits / releases : 0,
        flopRate: releases ? flops / releases : 0,
        distressEpisodes,
        rescueEpisodes,
    };
};

const printSummary = (reports: FixtureReport[]): void => {
    const aggregate = aggregateReports(reports);
    const runtimeMs = reports.reduce((sum, report) => sum + report.runtimeMs, 0);
    console.log(`\nPlatform AI ${round(HORIZON_WEEKS / 52)}-year aggregate by company`);
    console.table(PLATFORM_AI_TURN_ORDER.map(platformId => {
        const row = aggregate.totals[platformId];
        return {
            platform: platformId,
            releases: row.releases,
            hits: row.hits,
            solid: row.solidResults,
            flops: row.flops,
            hitRatePct: round(row.releases ? row.hits / row.releases * 100 : 0),
            flopRatePct: round(row.releases ? row.flops / row.releases * 100 : 0),
            distressEpisodes: row.distressEpisodes,
            rescues: row.rescueEpisodes,
            dormantWeeks: row.dormantWeeks,
            cancelled: row.cancelledProjects,
            researchCompleted: row.completedResearchPrograms,
            marketExits: row.marketExits,
            commercialWins: row.commercialYearWins,
        };
    }));
    const industry = reports.reduce((total, report) => ({
        newsEvents: total.newsEvents + report.industry.newsEvents,
        duplicateNewsEvents: total.duplicateNewsEvents + report.industry.duplicateNewsEvents,
        newsDateViolations: total.newsDateViolations + report.industry.newsDateViolations,
        maxNewsHistory: Math.max(total.maxNewsHistory, report.industry.maxNewsHistory),
        ecosystemLaunches: total.ecosystemLaunches + report.industry.ecosystemLaunches,
        ecosystemPromotions: total.ecosystemPromotions + report.industry.ecosystemPromotions,
        ecosystemDistressEvents: total.ecosystemDistressEvents + report.industry.ecosystemDistressEvents,
        ecosystemRecoveries: total.ecosystemRecoveries + report.industry.ecosystemRecoveries,
        ecosystemClosures: total.ecosystemClosures + report.industry.ecosystemClosures,
        maxActiveGeneratedOperators: Math.max(total.maxActiveGeneratedOperators, report.industry.maxActiveGeneratedOperators),
        maxSaveBytes: Math.max(total.maxSaveBytes, report.industry.maxSaveBytes),
    }), blankIndustryTotals());
    console.log('Balance bands', {
        fixtures: reports.length,
        simulatedWeeks: reports.length * HORIZON_WEEKS,
        platformTurns: reports.length * HORIZON_WEEKS * PLATFORM_AI_TURN_ORDER.length,
        releases: aggregate.releases,
        hitRatePct: round(aggregate.hitRate * 100),
        flopRatePct: round(aggregate.flopRate * 100),
        distressEpisodes: aggregate.distressEpisodes,
        rescueEpisodes: aggregate.rescueEpisodes,
        runtimeSeconds: round(runtimeMs / 1_000),
    });
    console.log('Integrated world and News totals', industry);
    const sortedScores = reports
        .flatMap(report => PLATFORM_AI_TURN_ORDER.flatMap(platformId => report.commercialScores[platformId]))
        .sort((left, right) => left - right);
    const percentile = (fraction: number): number => sortedScores[Math.min(
        sortedScores.length - 1,
        Math.max(0, Math.floor((sortedScores.length - 1) * fraction)),
    )] || 0;
    console.log('Commercial score quantiles', {
        p10: percentile(0.10),
        p15: percentile(0.15),
        p20: percentile(0.20),
        p45: percentile(0.45),
        p50: percentile(0.50),
        p55: percentile(0.55),
        p60: percentile(0.60),
        p65: percentile(0.65),
    });
    console.table(PLATFORM_AI_TURN_ORDER.map(platformId => {
        const values = reports
            .flatMap(report => report.commercialScores[platformId])
            .sort((left, right) => left - right);
        const at = (fraction: number): number => values[Math.min(
            values.length - 1,
            Math.max(0, Math.floor((values.length - 1) * fraction)),
        )] || 0;
        return {
            platform: platformId,
            releases: values.length,
            p10: at(0.10),
            p20: at(0.20),
            p35: at(0.35),
            p50: at(0.50),
            p65: at(0.65),
            p80: at(0.80),
            p90: at(0.90),
        };
    }));
    console.log('\nCheckpoint totals');
    console.table([...CHECKPOINT_WEEKS].sort((left, right) => left - right).map(week => {
        const rows = reports.flatMap(report => report.checkpoints.find(item => item.week === week)?.platforms || []);
        return {
            years: week / 52,
            releases: rows.reduce((sum, row) => sum + row.releases, 0),
            hits: rows.reduce((sum, row) => sum + row.hits, 0),
            solid: rows.reduce((sum, row) => sum + row.solidResults, 0),
            flops: rows.reduce((sum, row) => sum + row.flops, 0),
            distressEpisodes: rows.reduce((sum, row) => sum + row.distressEpisodes, 0),
            rescues: rows.reduce((sum, row) => sum + row.rescueEpisodes, 0),
            cancelled: rows.reduce((sum, row) => sum + row.cancelledProjects, 0),
            researchCompleted: rows.reduce((sum, row) => sum + row.completedResearchPrograms, 0),
            marketExits: rows.reduce((sum, row) => sum + row.marketExits, 0),
            subscribersMillions: round(rows.reduce((sum, row) => sum + row.finalSubscribersMillions, 0)),
            cashMillions: round(rows.reduce((sum, row) => sum + row.finalCashMillions, 0)),
            debtMillions: round(rows.reduce((sum, row) => sum + row.finalDebtMillions, 0)),
        };
    }));
};

const assertBalanceBands = (reports: FixtureReport[]): void => {
    const aggregate = aggregateReports(reports);
    assert.ok(aggregate.releases >= MIN_RELEASE_SAMPLE, `Need at least ${MIN_RELEASE_SAMPLE} releases; observed ${aggregate.releases}`);
    assert.ok(aggregate.hitRate >= 0.35 && aggregate.hitRate <= 0.55, `Aggregate hit rate ${(aggregate.hitRate * 100).toFixed(2)}% is outside 35-55%`);
    assert.ok(aggregate.flopRate >= 0.10 && aggregate.flopRate <= 0.25, `Aggregate clear-flop rate ${(aggregate.flopRate * 100).toFixed(2)}% is outside 10-25%`);
    const adverseReports = reports.filter(report => report.regime === 'ADVERSE');
    if (adverseReports.length > 0) {
        assert.ok(adverseReports.some(report => report.final.some(row => row.distressEpisodes > 0)), 'At least one adverse fixture must enter distress');
    }
    if (aggregate.distressEpisodes > 0) {
        assert.ok(aggregate.rescueEpisodes < aggregate.distressEpisodes, 'Not every distress episode may receive a rescue');
    }

    const profileBands: Record<PlatformId, { hit: [number, number]; flop: [number, number] }> = {
        NETFLIX: { hit: [0.30, 0.55], flop: [0.12, 0.30] },
        APPLE_TV: { hit: [0.35, 0.65], flop: [0.02, 0.25] },
        DISNEY_PLUS: { hit: [0.35, 0.65], flop: [0.02, 0.25] },
        HULU: { hit: [0.10, 0.45], flop: [0.05, 0.45] },
        YOUTUBE: { hit: [0.20, 0.50], flop: [0.05, 0.30] },
    };
    for (const row of Object.values(aggregate.totals)) {
        for (const [key, value] of Object.entries(row)) {
            if (key === 'platformId') continue;
            assert.ok(Number.isFinite(value), `${row.platformId} aggregate ${key} must be finite`);
        }
        if (row.activeWeeks >= 260 && row.releases >= 10) {
            assert.ok(row.hits > 0, `${row.platformId} needs at least one hit across its active sample`);
            assert.ok(row.hits < row.releases, `${row.platformId} needs at least one non-hit across its active sample`);
        }
        assert.ok(row.releases >= 100, `${row.platformId} needs at least 100 releases; observed ${row.releases}`);
        const hitRate = row.hits / Math.max(1, row.releases);
        const flopRate = row.flops / Math.max(1, row.releases);
        const band = profileBands[row.platformId];
        assert.ok(hitRate >= band.hit[0] && hitRate <= band.hit[1], `${row.platformId} hit rate ${(hitRate * 100).toFixed(2)}% is outside ${(band.hit[0] * 100)}-${(band.hit[1] * 100)}%`);
        assert.ok(flopRate >= band.flop[0] && flopRate <= band.flop[1], `${row.platformId} flop rate ${(flopRate * 100).toFixed(2)}% is outside ${(band.flop[0] * 100)}-${(band.flop[1] * 100)}%`);
        assert.ok(row.releases / Math.max(1, aggregate.releases) <= 0.50, `${row.platformId} exceeds 50% of all releases`);
    }
    assert.ok(
        Object.values(aggregate.totals).reduce((sum, row) => sum + row.learnedCastingChanges, 0) > 0,
        'At least one real commissioning choice must differ because of release memory.',
    );

    const highRows = Object.values(aggregate.totals).filter(row => PLATFORM_AI_PROFILES[row.platformId].overallLevel >= 9);
    const lowRows = Object.values(aggregate.totals).filter(row => PLATFORM_AI_PROFILES[row.platformId].overallLevel <= 7.5);
    const pooledScore = (rows: PlatformTotals[]): number => rows.reduce((sum, row) => sum + row.outcomeScore, 0)
        / Math.max(1, rows.reduce((sum, row) => sum + row.releases, 0));
    assert.ok(pooledScore(highRows) > pooledScore(lowRows), 'Competence 9+ profiles must outperform <=7.5 profiles on pooled outcomes');

    const commercialWins = Object.values(aggregate.totals).filter(row => row.commercialYearWins > 0);
    const eligibleCommercialYears = reports.reduce((sum, report) => sum + report.commercialYearWinners.length, 0);
    const largestCommercialWinnerYears = Math.max(0, ...commercialWins.map(row => row.commercialYearWins));
    assert.ok(commercialWins.length >= 3, 'At least three platforms must win commercial years');
    assert.ok(eligibleCommercialYears > 0, 'Commercial years must produce observable winners');
    assert.ok(
        largestCommercialWinnerYears / eligibleCommercialYears <= 0.70,
        `Largest commercial winner concentration ${(largestCommercialWinnerYears / eligibleCommercialYears * 100).toFixed(2)}% exceeds 70%`,
    );

    const eligibleAwardYears = reports.reduce((sum, report) => sum + report.awardYearWinners.length, 0);
    const awardWinners = Object.values(aggregate.totals).filter(row => row.awardYearWins > 0);
    const largestAwardWinnerYears = Math.max(0, ...awardWinners.map(row => row.awardYearWins));
    assert.ok(eligibleAwardYears > 0, 'Canonical ceremony weeks must produce observable award seasons');
    assert.ok(awardWinners.length >= 2, 'Canonical award observations require at least two platform winners');
    assert.ok(
        largestAwardWinnerYears / eligibleAwardYears <= 0.70,
        `Largest award winner concentration ${(largestAwardWinnerYears / eligibleAwardYears * 100).toFixed(2)}% exceeds 70%`,
    );

    for (const report of reports) {
        assert.equal(report.industry.duplicateNewsEvents, 0, `Fixture ${report.seed} produced duplicate News events.`);
        assert.equal(report.industry.newsDateViolations, 0, `Fixture ${report.seed} produced incorrectly dated News events.`);
        assert.ok(report.industry.newsEvents > 0, `Fixture ${report.seed} must surface important events through News.`);
        assert.ok(report.industry.maxNewsHistory <= 50, `Fixture ${report.seed} exceeded the bounded News history.`);
        assert.ok(
            Number.isFinite(report.industry.maxSaveBytes) && report.industry.maxSaveBytes > 0,
            `Fixture ${report.seed} must produce a finite persisted save size.`,
        );
        for (const row of report.final) {
            assert.equal(row.duplicateCanonicalProjects, 0);
            assert.equal(row.directTheatricalViolations, 0);
            assert.ok(row.finalCashMillions >= 0);
            assert.ok(Number.isFinite(row.finalCashMillions));
            assert.ok(Number.isFinite(row.finalDebtMillions));
            assert.ok(Number.isFinite(row.finalValuationBillions));
            assert.ok(Number.isFinite(row.finalSubscribersMillions) && row.finalSubscribersMillions >= 0);
            assert.ok(Number.isFinite(row.finalResearchLevel) && row.finalResearchLevel >= 0);
            assert.ok(Number.isFinite(row.finalActiveMarkets) && row.finalActiveMarkets >= 0);
        }
    }
    assert.ok(
        reports.reduce((sum, report) => sum + report.industry.ecosystemLaunches, 0) > 0,
        'The multi-seed simulation must produce at least one organic streaming-platform launch.',
    );
};

const runFixtureWorker = (spec: FixtureSpec): Promise<FixtureReport> => new Promise((resolve, reject) => {
    const worker = new Worker(new URL(import.meta.url), {
        workerData: { kind: 'PLATFORM_AI_LONG_RUN_FIXTURE', spec },
    });
    worker.once('message', message => {
        if (message?.error) reject(new Error(message.error));
        else resolve(message.report as FixtureReport);
    });
    worker.once('error', reject);
    worker.once('exit', code => {
        if (code !== 0) reject(new Error(`Long-run fixture worker exited with code ${code}`));
    });
});

const runFixturesWithBoundedConcurrency = async (specs: FixtureSpec[], concurrency: number): Promise<FixtureReport[]> => {
    const reports: FixtureReport[] = [];
    let cursor = 0;
    const workerLoop = async (): Promise<void> => {
        while (cursor < specs.length) {
            const index = cursor;
            cursor += 1;
            const spec = specs[index];
            console.log(`Running long-run fixture ${spec.seed} (${spec.regime})...`);
            const report = await runFixtureWorker(spec);
            reports[index] = report;
            console.log(`Completed fixture ${spec.seed} in ${(report.runtimeMs / 1_000).toFixed(2)}s.`);
        }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, specs.length) }, workerLoop));
    return reports;
};

if (!isMainThread && workerData?.kind === 'PLATFORM_AI_LONG_RUN_FIXTURE') {
    try {
        parentPort!.postMessage({ report: runFixture(workerData.spec as FixtureSpec) });
    } catch (error) {
        parentPort!.postMessage({ error: error instanceof Error ? error.stack || error.message : String(error) });
    }
} else {
    const wallStartedAt = performance.now();
    if (!SKIP_PREFLIGHT) {
        console.log('Running bounded Platform AI long-run preflight checks...');
        assertProjectReferenceClassifier();
        assertProcessWeekWorldSynchronization();
        assertExactWeeklyResumeParity();
        console.log(`Exact ${RESUME_PARITY_WEEKS}-week resume parity verified.`);
    }
    const reports = RUN_INLINE
        ? FIXTURES.map(spec => runFixture(spec))
        : await runFixturesWithBoundedConcurrency(FIXTURES, FIXTURE_CONCURRENCY);
    if (Number.isFinite(MAX_FIXTURE_RUNTIME_MS) && MAX_FIXTURE_RUNTIME_MS > 0) {
        for (const report of reports) {
            assert.ok(
                report.runtimeMs <= MAX_FIXTURE_RUNTIME_MS,
                `Fixture ${report.seed} runtime ${report.runtimeMs}ms exceeds ${MAX_FIXTURE_RUNTIME_MS}ms.`,
            );
        }
    }
    printSummary(reports);
    const hasCompleteRegimeMatrix = FIXTURES.length === ALL_FIXTURES.length;
    if (hasCompleteRegimeMatrix && HORIZON_WEEKS >= 520) {
        assertBalanceBands(reports);
    }
    assertAcquisitionStopInvariant();
    console.log(`\nWall-clock runtime: ${((performance.now() - wallStartedAt) / 1_000).toFixed(2)}s.`);
    console.log('Platform AI long-run balance audit passed.');
}
