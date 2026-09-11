import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { createWorldStreamingCompetitionState } from '../services/worldEconomy/worldStreamingCompetition';
import {
    advanceWorldStreamingCustomersToWeek,
    createWorldStreamingCustomerState,
} from '../services/worldEconomy/worldStreamingCustomers';
import {
    advanceWorldStreamingViewingToWeek,
    createWorldStreamingViewingState,
} from '../services/worldEconomy/worldStreamingViewing';
import * as platformEconomyEngine from '../services/worldEconomy/worldStreamingPlatformEconomy';
import { calculatePlatformAiWeeklyEconomy } from '../services/platformAi/platformAiEconomy';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { normalizeStreamingPlatformEcosystem } from '../services/streamingPlatformEcosystem';
import {
    createDynamicStreamingOperator,
    processStreamingPlatformEcosystemTurn,
} from '../services/streamingPlatformEcosystemTurn';
import { getWorldStreamingOffers } from '../services/worldEconomy/worldStreamingOffers';
import * as acquisitionService from '../services/streamingAcquisitions';

const createPlatformEconomy = (platformEconomyEngine as any).createWorldStreamingPlatformEconomyState;
const synchronizePlatformEconomy = (platformEconomyEngine as any).synchronizeWorldStreamingPlatformEconomy;
const resolveCostPolicy = (platformEconomyEngine as any).resolveWorldStreamingPlatformCostPolicy;
const normalizePlatformEconomy = (platformEconomyEngine as any).normalizeWorldStreamingPlatformEconomyState;
const settlePlatformEconomyWeek = (platformEconomyEngine as any).settleWorldStreamingPlatformEconomyWeek;
const advancePlatformEconomy = (platformEconomyEngine as any).advanceWorldStreamingPlatformEconomyToWeek;
const getAcquisitionSubscriberCount = (acquisitionService as any).getCanonicalStreamingAcquisitionSubscriberCount;

assert.equal(typeof createPlatformEconomy, 'function', 'WE7 exposes a shared platform-economy constructor');
assert.equal(typeof synchronizePlatformEconomy, 'function', 'WE7 exposes one canonical Platform AI and ecosystem synchronization seam');
assert.equal(typeof resolveCostPolicy, 'function', 'WE7 exposes an ownership-sensitive operating-cost policy');
assert.equal(typeof normalizePlatformEconomy, 'function', 'WE7 exposes deterministic save normalization');
assert.equal(typeof settlePlatformEconomyWeek, 'function', 'WE7 exposes one shared weekly settlement seam');
assert.equal(typeof advancePlatformEconomy, 'function', 'WE7 exposes long-horizon platform-economy progression');
assert.equal(typeof getAcquisitionSubscriberCount, 'function', 'streaming acquisitions expose the canonical WE7 audience handoff');

const player = structuredClone(INITIAL_PLAYER) as Player;
player.id = 'we7-shared-economy-audit';
player.age = 34;
player.currentWeek = 17;
const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);

player.world.worldStreamingCompetition = createWorldStreamingCompetitionState(player, absoluteWeek);
player.world.worldStreamingCustomers = createWorldStreamingCustomerState(player, absoluteWeek);
player.world.worldStreamingViewing = createWorldStreamingViewingState(player, absoluteWeek);

const activePlatformIds = new Set(Object.values(player.world.worldStreamingCustomers.countries)
    .flatMap(country => country.platformSummaries.map(platform => platform.platformId)));
assert.ok(activePlatformIds.size > 4, 'the shared customer world includes the full eligible platform field');
assert.deepEqual(
    new Set(Object.keys(player.world.worldStreamingViewing.platforms)),
    activePlatformIds,
    'WE6 viewing covers every platform that owns a canonical WE5 customer cell',
);

const before = JSON.stringify(player);
const economy = createPlatformEconomy(player, absoluteWeek);
const repeated = createPlatformEconomy(player, absoluteWeek);
assert.deepEqual(economy, repeated, 'identical WE7 inputs produce deterministic platform outcomes');
assert.equal(JSON.stringify(player), before, 'WE7 construction does not mutate the player');
assert.deepEqual(new Set(Object.keys(economy.platforms)), activePlatformIds, 'every active platform receives one shared economy summary');
assert.equal(
    Object.values(economy.platforms).reduce((sum: number, platform: any) => sum + platform.endingPaidAccounts, 0),
    player.world.worldStreamingCustomers.global.endingPaidAccounts,
    'platform paid accounts reconcile to the finite WE5 customer world',
);
assert.equal(
    Math.round((Object.values(economy.platforms) as Array<{ weeklySubscriptionRevenue: number }>)
        .reduce((sum, platform) => sum + platform.weeklySubscriptionRevenue, 0) * 100) / 100,
    economy.global.weeklySubscriptionRevenue,
    'platform subscription revenue reconciles to the WE7 global total',
);
assert.ok(economy.snapshots.length <= 52, 'WE7 history remains bounded');
assert.equal(economy.historyByPlatform.NETFLIX.length, 1, 'WE7 retains a bounded per-platform history for later acquisition handoff');
assert.equal(normalizePlatformEconomy(economy, player, absoluteWeek), economy, 'same-week normalization preserves immutable WE7 state identity');
const priorWithExitedPlatform = structuredClone(economy);
priorWithExitedPlatform.historyByPlatform.EXITED_TEST = [{
    absoluteWeek: absoluteWeek - 1,
    controller: 'AI',
    endingPaidAccounts: 1_000,
    viewingAccounts: 600,
    hoursViewed: 1_200,
    weeklyRevenue: 5_000,
    weeklyOperatingResult: -500,
}];
const historyPlayer = structuredClone(player) as Player;
const historyWeek = absoluteWeek + 1;
historyPlayer.world.worldStreamingCompetition = createWorldStreamingCompetitionState(historyPlayer, historyWeek);
historyPlayer.world.worldStreamingCustomers = createWorldStreamingCustomerState(historyPlayer, historyWeek);
historyPlayer.world.worldStreamingViewing = createWorldStreamingViewingState(historyPlayer, historyWeek);
const historyAdvanced = normalizePlatformEconomy(priorWithExitedPlatform, historyPlayer, historyWeek);
assert.equal(historyAdvanced.historyByPlatform.EXITED_TEST.length, 1,
    'platform history survives after a closed, acquired, or exited service leaves the active allocator');

const netflix = economy.platforms.NETFLIX;
assert.ok(netflix && netflix.endingPaidAccounts > 0, 'a core AI platform receives a canonical shared-world audience');
assert.equal(netflix.controller, 'AI', 'an unacquired rival remains AI-controlled');
assert.ok(netflix.operatingCostPolicy.appliedCostMultiplier < 1, 'AI-controlled rivals retain the approved operating-cost assistance');

const acquired = structuredClone(player) as Player;
acquired.ownedStreamingPlatform.corporateDevelopment.acquiredPlatformIds = ['NETFLIX'];
const acquiredPolicy = resolveCostPolicy(acquired, 'NETFLIX');
assert.equal(acquiredPolicy.controller, 'PLAYER', 'ownership is resolved from the canonical acquisition portfolio');
assert.equal(acquiredPolicy.appliedCostMultiplier, 1, 'player acquisition removes future AI-only operating-cost assistance');
acquired.world.worldStreamingPlatformEconomy = economy;
assert.equal(
    getAcquisitionSubscriberCount(acquired, 'NETFLIX', 1),
    netflix.endingPaidAccounts,
    'acquisition signing uses the canonical paid-account total rather than a decorative rival estimate',
);
assert.ok(
    !getWorldStreamingOffers(acquired, absoluteWeek + 1).offers.some(offer => offer.platformId === 'NETFLIX'),
    'an acquired platform no longer competes against its owner as a separate AI offer',
);

const synchronized = synchronizePlatformEconomy(player, economy, absoluteWeek);
assert.equal(
    synchronized.world.platforms?.NETFLIX?.subscribers,
    Math.round(netflix.endingPaidAccounts / 10_000) / 100,
    'core Platform AI subscriber totals are synchronized from canonical WE5 accounts in millions',
);
assert.equal(
    synchronized.world.platforms?.NETFLIX?.ai?.worldEconomyFeedback?.asOfAbsoluteWeek,
    absoluteWeek,
    'Platform AI receives a dated canonical strategy-feedback record',
);
assert.equal(
    synchronized.world.platforms?.NETFLIX?.ai?.worldEconomyFeedback?.endingPaidAccounts,
    netflix.endingPaidAccounts,
    'Platform AI strategy feedback carries the same paid-account fact used by finance and Forbes',
);
const netflixOperator = Object.values(synchronized.world.streamingPlatformEcosystem?.operators || {})
    .find((operator: any) => operator.corePlatformId === 'NETFLIX') as any;
assert.equal(netflixOperator?.subscriberMillions, Math.round(netflix.endingPaidAccounts / 10_000) / 100,
    'the Forbes ecosystem projection receives the same canonical subscriber total');
const weeklySettlement = settlePlatformEconomyWeek(player, absoluteWeek);
assert.deepEqual(weeklySettlement.world.worldStreamingPlatformEconomy, economy, 'the weekly settlement persists the exact canonical WE7 result');
assert.equal(
    weeklySettlement.world.platforms?.NETFLIX?.subscribers,
    synchronized.world.platforms?.NETFLIX?.subscribers,
    'the weekly settlement synchronizes Platform AI through the same public seam',
);

const economyPlayer = structuredClone(synchronized) as Player;
economyPlayer.world.worldStreamingPlatformEconomy = economy;
const canonicalFinance = calculatePlatformAiWeeklyEconomy({
    player: economyPlayer,
    platform: economyPlayer.world.platforms!.NETFLIX,
    absoluteWeek: absoluteWeek + 1,
});
assert.equal(
    canonicalFinance.snapshot?.subscriptionRevenueMillions,
    Math.round(netflix.weeklySubscriptionRevenue) / 1_000_000,
    'Platform AI finance consumes the shared-world subscription revenue instead of a parallel subscriber estimate',
);

const oldSave = structuredClone(player) as Player;
delete oldSave.world.worldStreamingPlatformEconomy;
const migrated = migratePlayerSave(oldSave);
assert.ok(migrated.world.worldStreamingPlatformEconomy, 'old saves gain the versioned WE7 platform economy');
assert.deepEqual(
    migratePlayerSave(migrated).world.worldStreamingPlatformEconomy,
    migrated.world.worldStreamingPlatformEconomy,
    'repeated WE7 migration remains idempotent',
);

const liveInput = structuredClone(INITIAL_PLAYER) as Player;
liveInput.id = 'we7-live-week-audit';
liveInput.age = 20;
liveInput.currentWeek = 2;
const stages: string[] = [];
const liveResult = await processGameWeek(liveInput, { onStage: stage => stages.push(stage) });
assert.ok(liveResult.player.world.worldStreamingPlatformEconomy, 'the real game week commits WE7 without requiring a player streaming platform');
const viewingDone = stages.indexOf('world_streaming_viewing_done');
const economyStart = stages.indexOf('world_streaming_platform_economy_start');
const ownedStart = stages.indexOf('owned_streaming_done');
assert.ok(viewingDone >= 0 && economyStart > viewingDone && ownedStart > economyStart,
    'the real weekly loop settles WE7 after viewing and before completing the owned-platform stage');

const generatedPlayer = structuredClone(player) as Player;
const generatedEcosystem = normalizeStreamingPlatformEcosystem(generatedPlayer.world.streamingPlatformEcosystem, absoluteWeek);
const generatedOperator = createDynamicStreamingOperator({
    playerId: generatedPlayer.id,
    state: generatedEcosystem,
    absoluteWeek,
    homeCountryId: 'IN',
    origin: 'VENTURE_BACKED',
    startingClass: 'REGIONAL_CHALLENGER',
});
generatedEcosystem.operators[generatedOperator.id] = generatedOperator;
generatedEcosystem.lastProcessedAbsoluteWeek = absoluteWeek;
generatedPlayer.world.streamingPlatformEcosystem = generatedEcosystem;
generatedPlayer.world.worldStreamingCompetition = createWorldStreamingCompetitionState(generatedPlayer, absoluteWeek);
generatedPlayer.world.worldStreamingCustomers = createWorldStreamingCustomerState(generatedPlayer, absoluteWeek);
generatedPlayer.world.worldStreamingViewing = createWorldStreamingViewingState(generatedPlayer, absoluteWeek);
const generatedEconomy = createPlatformEconomy(generatedPlayer, absoluteWeek);
const generatedOutcome = generatedEconomy.platforms[generatedOperator.id];
assert.ok(generatedOutcome?.endingPaidAccounts > 0, 'a newly generated platform enters the same finite customer economy automatically');
generatedPlayer.world.worldStreamingPlatformEconomy = generatedEconomy;
const generatedTurn = processStreamingPlatformEcosystemTurn(generatedPlayer, generatedPlayer.world, absoluteWeek + 1);
const progressedGenerated = generatedTurn.world.streamingPlatformEcosystem!.operators[generatedOperator.id];
const expectedGeneratedCash = Math.round((generatedOperator.cashMillions + generatedOutcome.weeklyOperatingResult / 1_000_000) * 100) / 100;
assert.equal(progressedGenerated.cashMillions, expectedGeneratedCash,
    'a generated platform settles its next operating turn from the canonical WE7 economy result');

const horizonPlayer = structuredClone(player) as Player;
let horizonCustomers = createWorldStreamingCustomerState(horizonPlayer, absoluteWeek);
horizonPlayer.world.worldStreamingCustomers = horizonCustomers;
let horizonViewing = createWorldStreamingViewingState(horizonPlayer, absoluteWeek);
horizonPlayer.world.worldStreamingViewing = horizonViewing;
let horizonEconomy = createPlatformEconomy(horizonPlayer, absoluteWeek);
const longRunStartedAt = performance.now();
for (let year = 1; year <= 400; year += 1) {
    const horizonWeek = absoluteWeek + year * 52;
    horizonPlayer.world.worldStreamingCompetition = createWorldStreamingCompetitionState(horizonPlayer, horizonWeek);
    horizonCustomers = advanceWorldStreamingCustomersToWeek(horizonCustomers, horizonPlayer, horizonWeek);
    horizonPlayer.world.worldStreamingCustomers = horizonCustomers;
    horizonViewing = advanceWorldStreamingViewingToWeek(horizonViewing, horizonPlayer, horizonWeek);
    horizonPlayer.world.worldStreamingViewing = horizonViewing;
    horizonEconomy = advancePlatformEconomy(horizonEconomy, horizonPlayer, horizonWeek);
    horizonPlayer.world.worldStreamingPlatformEconomy = horizonEconomy;
    if (year % 25 === 0) {
        const reloaded = normalizePlatformEconomy(JSON.parse(JSON.stringify(horizonEconomy)), horizonPlayer, horizonWeek);
        assert.deepEqual(reloaded, horizonEconomy, `year ${year} save/reload preserves the WE7 settlement`);
    }
}
const longRunMs = performance.now() - longRunStartedAt;
const serializedBytes = Buffer.byteLength(JSON.stringify(horizonEconomy));
assert.equal(horizonEconomy.lastProcessedAbsoluteWeek, absoluteWeek + 20_800,
    'WE7 reaches a 400-year / 20,800-week horizon through annual checkpoints');
assert.ok(horizonEconomy.snapshots.length <= 52, '400-year WE7 global history remains bounded');
assert.ok(Object.values(horizonEconomy.historyByPlatform).every((history: any) => history.length <= 52),
    '400-year per-platform histories remain bounded');
assert.ok(serializedBytes < 2_000_000, 'WE7 shared platform state remains below the explicit 2 MB mobile-save ceiling');
assert.ok(Number.isFinite(horizonEconomy.global.weeklyOperatingResult), '400-year platform finances remain finite');

console.log(`WE7 shared economy: ${Object.keys(economy.platforms).length} platforms, ${economy.global.endingPaidAccounts.toLocaleString()} paid accounts.`);
console.log(`WE7 400-year horizon: ${(serializedBytes / 1024).toFixed(1)} KiB state; ${longRunMs.toFixed(1)}ms across 400 annual checkpoints.`);
