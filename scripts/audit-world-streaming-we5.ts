import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { INITIAL_PLAYER, type Player } from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { createWorldStreamingCompetitionState } from '../services/worldEconomy/worldStreamingCompetition';
import { getWorldStreamingOffers } from '../services/worldEconomy/worldStreamingOffers';
import * as customerEngine from '../services/worldEconomy/worldStreamingCustomers';
import { migratePlayerSave } from '../services/saveMigration';
import { processOwnedStreamingPlatformWeek } from '../services/streamingWeeklyLoop';

const createCustomers = (customerEngine as any).createWorldStreamingCustomerState;
const normalizeCustomers = (customerEngine as any).normalizeWorldStreamingCustomerState;
const advanceCustomers = (customerEngine as any).advanceWorldStreamingCustomersToWeek;
const getPlayerOutcome = (customerEngine as any).getWorldStreamingPlayerCustomerOutcome;
const updateAccessPolicy = (customerEngine as any).updateWorldStreamingCustomerAccessPolicy;

assert.equal(typeof createCustomers, 'function', 'WE5 exposes a canonical customer-state constructor');
assert.equal(typeof normalizeCustomers, 'function', 'WE5 exposes deterministic normalization');
assert.equal(typeof advanceCustomers, 'function', 'WE5 exposes weekly customer progression');
assert.equal(typeof getPlayerOutcome, 'function', 'WE5 exposes the owned-platform customer result');
assert.equal(typeof updateAccessPolicy, 'function', 'WE5 exposes one platform-wide access-policy action');

const player = structuredClone(INITIAL_PLAYER) as Player;
player.id = 'we5-customer-audit';
player.age = 31;
player.currentWeek = 18;
player.ownedStreamingPlatform.lifecycle = 'ACTIVE';
player.ownedStreamingPlatform.identity = {
    name: 'Empire+', slug: 'empire-plus', primaryColor: '#6d4aff', secondaryColor: '#111827',
    logoKey: 'FRAME_PLAY', brandPromiseId: 'BALANCED', publicManifesto: 'Cinema worth staying home for.',
    dayOneMarketIds: ['US', 'IN'], launchServerCityId: null, foundedAtAbsoluteWeek: 100,
};
player.ownedStreamingPlatform.serviceConfiguration.source = 'PLAYER_ACTION';
player.ownedStreamingPlatform.serviceConfiguration.pricing = {
    ...player.ownedStreamingPlatform.serviceConfiguration.pricing,
    streams: ['subs', 'ads'],
    annualDiscount: 20,
    introOffer: 15,
    plans: [
        { id: 'ESSENTIAL', name: 'Essential', monthly: 6, featureIds: ['hd'], ads: true, colorId: 'emerald' },
        { id: 'PREMIERE', name: 'Premiere', monthly: 17, featureIds: ['uhd', 'streams4', 'downloads', 'noads'], ads: false, colorId: 'magenta' },
    ],
};
player.ownedStreamingPlatform.metrics.subscribers = 456_789;
player.ownedStreamingPlatform.launchCommit = {
    id: 'we5-launch',
    idempotencyKey: 'we5-launch:empire-plus',
    committedAtAbsoluteWeek: getAbsoluteWeek(player.age, player.currentWeek) - 10,
    capacityPlan: 'STANDARD',
    capacityPlanCost: 0,
    readinessScore: 80,
    forecastLikelyConcurrentStreams: 100_000,
    forecastHighConcurrentStreams: 200_000,
    protectedPeakConcurrentStreams: 500_000,
    launchHeadroomPercent: 50,
    initialSubscribers: 456_789,
    openingDemandIndex: 70,
    playbackSuccessRate: 99.5,
    outcomeTier: 'SMOOTH_OPENING',
    openingTitleCount: 0,
    openingOriginalTitle: 'Opening Night',
};

const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
player.world.worldStreamingCompetition = createWorldStreamingCompetitionState(player, absoluteWeek);
const before = JSON.stringify(player);
const state = createCustomers(player, absoluteWeek);
const repeated = createCustomers(player, absoluteWeek);

assert.deepEqual(state, repeated, 'identical WE1-WE4 inputs seed identical WE5 customer state');
assert.equal(JSON.stringify(player), before, 'WE5 construction does not mutate the player');
assert.equal(state.global.playerEndingPaidAccounts, 456_789, 'first WE5 seed preserves the existing player subscriber total');
assert.equal(state.global.startingPaidAccounts, state.global.endingPaidAccounts, 'initial seed creates no fabricated weekly movement');
assert.equal(state.global.joins, 0, 'initial seed records no fake joins');
assert.equal(state.global.cancellations, 0, 'initial seed records no fake cancellations');
assert.ok(Object.keys(state.countries).length >= 190, 'WE5 retains the canonical country registry');
assert.ok(state.global.endingPaidAccounts > state.global.payingHouseholds, 'multi-service ownership keeps accounts distinct from paying households');
assert.ok(state.global.externalSharedHouseholds >= 0 && state.global.piracyReach >= 0, 'non-paying access paths remain explicit');
assert.ok(state.snapshots.length <= 52, 'WE5 snapshots are bounded');

const playerOutcome = getPlayerOutcome(state);
assert.ok(playerOutcome, 'an active player offer has a canonical WE5 outcome');
assert.equal(playerOutcome.endingPaidAccounts, 456_789, 'player selector returns the preserved actual accounts');
assert.deepEqual(playerOutcome.planAllocations.map((row: any) => row.planId).sort(), ['ESSENTIAL', 'PREMIERE'], 'player actual accounts retain exact saved plan identities');
assert.equal(
    playerOutcome.startingPaidAccounts + playerOutcome.joins + playerOutcome.reactivations - playerOutcome.cancellations,
    playerOutcome.endingPaidAccounts,
    'player subscriber waterfall reconciles',
);
assert.deepEqual(normalizeCustomers(state, player, absoluteWeek), state, 'same-week WE5 normalization is idempotent');

console.log(`WE5 customer seed: ${state.global.endingPaidAccounts.toLocaleString()} accounts, ${state.global.payingHouseholds.toLocaleString()} paying homes, ${state.global.externalSharedHouseholds.toLocaleString()} shared homes.`);

const nextPlayer = structuredClone(player) as Player;
nextPlayer.currentWeek += 1;
nextPlayer.ownedStreamingPlatform.serviceConfiguration.pricing.plans = nextPlayer.ownedStreamingPlatform.serviceConfiguration.pricing.plans.map(plan => ({
    ...plan,
    monthly: 10_000,
}));
const nextWeek = getAbsoluteWeek(nextPlayer.age, nextPlayer.currentWeek);
nextPlayer.world.worldStreamingCompetition = createWorldStreamingCompetitionState(nextPlayer, nextWeek);
const advanced = advanceCustomers(state, nextPlayer, nextWeek);
const advancedRepeated = advanceCustomers(state, nextPlayer, nextWeek);
const advancedPlayer = getPlayerOutcome(advanced);

assert.deepEqual(advanced, advancedRepeated, 'the same previous state and week produce identical customer transitions');
assert.equal(advanced.global.startingPaidAccounts, state.global.endingPaidAccounts, 'weekly movement starts from the prior actual customer base');
assert.equal(
    advanced.global.startingPaidAccounts + advanced.global.joins + advanced.global.reactivations - advanced.global.cancellations,
    advanced.global.endingPaidAccounts,
    'global weekly customer waterfall reconciles',
);
assert.ok(advanced.recentMovements.length > 0, 'a material price shock creates saved aggregate movements');
assert.ok(advancedPlayer && advancedPlayer.endingPaidAccounts < advancedPlayer.startingPaidAccounts, 'a price shock creates gradual player account losses');
assert.ok(advancedPlayer && advancedPlayer.endingPaidAccounts > 0, 'a price shock does not teleport the entire player base away');
Object.values(advanced.countries).forEach((country: any) => {
    assert.equal(
        country.startingPaidAccounts + country.joins + country.reactivations - country.cancellations,
        country.endingPaidAccounts,
        `${country.countryId} customer waterfall reconciles`,
    );
    assert.equal(country.endingPaidAccounts, country.platformSummaries.reduce((sum: number, row: any) => sum + row.endingPaidAccounts, 0), `${country.countryId} platform accounts reconcile`);
});

const reachFirstPlayer = updateAccessPolicy(player, {
    sharingPosture: 'REACH_FIRST',
    enforcementInvestment: 'LIGHT',
}, absoluteWeek);
const reachFirstSeed = createCustomers(reachFirstPlayer, absoluteWeek);
const reachFirstNext = structuredClone(reachFirstPlayer) as Player;
reachFirstNext.currentWeek += 1;
const reachFirstWeek = getAbsoluteWeek(reachFirstNext.age, reachFirstNext.currentWeek);
reachFirstNext.world.worldStreamingCompetition = createWorldStreamingCompetitionState(reachFirstNext, reachFirstWeek);
const reachFirst = advanceCustomers(reachFirstSeed, reachFirstNext, reachFirstWeek);

const strictPlayer = updateAccessPolicy(player, {
    sharingPosture: 'HOUSEHOLD_ONLY',
    enforcementInvestment: 'AGGRESSIVE',
}, absoluteWeek);
const strictSeed = createCustomers(strictPlayer, absoluteWeek);
const strictNext = structuredClone(strictPlayer) as Player;
strictNext.currentWeek += 1;
const strictWeek = getAbsoluteWeek(strictNext.age, strictNext.currentWeek);
strictNext.world.worldStreamingCompetition = createWorldStreamingCompetitionState(strictNext, strictWeek);
const strict = advanceCustomers(strictSeed, strictNext, strictWeek);

assert.ok(reachFirst.global.externalSharedHouseholds > 0, 'high-sharing cohorts create external shared access');
assert.ok(reachFirst.global.piracyReach > 0, 'piracy tendency and access pressure create non-paying reach');
assert.ok(reachFirst.global.accessLoadAccounts > reachFirst.global.endingPaidAccounts, 'shared access increases platform load without inventing paid accounts');
assert.ok(strict.global.playerExternalSharedHouseholds < reachFirst.global.playerExternalSharedHouseholds, 'household-only enforcement reduces player account sharing');
assert.ok(strict.global.playerCancellations >= reachFirst.global.playerCancellations, 'aggressive enforcement can increase player cancellation pressure');
assert.equal(
    reachFirst.global.monthlySubscriptionRevenue,
    Math.round(Object.values(reachFirst.countries as Record<string, any>).reduce<number>((countrySum, country) => (
        countrySum + country.cohorts.reduce((cohortSum: number, cohort: any) => (
            cohortSum + cohort.planCells.reduce((cellSum: number, cell: any) => cellSum + cell.monthlySubscriptionRevenue, 0)
        ), 0)
    ), 0) * 100) / 100,
    'subscription revenue comes only from paid plan cells',
);
assert.equal(updateAccessPolicy(strictPlayer, {
    sharingPosture: 'HOUSEHOLD_ONLY',
    enforcementInvestment: 'AGGRESSIVE',
}, absoluteWeek), strictPlayer, 'reapplying the same access policy in the same week is idempotent');

const decisionWeek = absoluteWeek + 1;
const baselineOffer = getWorldStreamingOffers(player, decisionWeek).offers.find(offer => offer.isPlayer)!;
const campaignPlayer = structuredClone(player) as Player;
campaignPlayer.ownedStreamingPlatform.weeklyDecisions = [{
    id: 'we5-audience-push',
    idempotencyKey: `weekly-plan:${decisionWeek}`,
    planId: 'AUDIENCE_PUSH',
    label: 'Turn up the premiere',
    selectedAtAbsoluteWeek: absoluteWeek,
    targetAbsoluteWeek: decisionWeek,
    cashCost: 1_200_000,
    status: 'LOCKED',
    appliedAtAbsoluteWeek: null,
    outcomeNote: null,
}];
const campaignOffer = getWorldStreamingOffers(campaignPlayer, decisionWeek).offers.find(offer => offer.isPlayer)!;
assert.ok(campaignOffer.marketingIndex > baselineOffer.marketingIndex, 'existing weekly CEO audience plans feed canonical customer demand');

const weeklyInput = structuredClone(nextPlayer) as Player;
weeklyInput.world.worldStreamingCustomers = advanced;
weeklyInput.ownedStreamingPlatform.metrics.subscribers = advancedPlayer.startingPaidAccounts;
const weeklyResult = processOwnedStreamingPlatformWeek(weeklyInput);
const weeklyOperations = weeklyResult.snapshot?.operations;
assert.ok(weeklyResult.processed && weeklyOperations, 'the real owned-platform weekly processor consumes WE5');
assert.equal(weeklyResult.snapshot?.subscribers, advancedPlayer.endingPaidAccounts, 'weekly subscribers equal WE5 ending paid accounts');
assert.equal(weeklyOperations?.joinedSubscribers, advancedPlayer.joins, 'weekly joins come from WE5');
assert.equal(weeklyOperations?.cancellations, advancedPlayer.cancellations, 'weekly cancellations come from WE5');
assert.equal(weeklyOperations?.reactivations, advancedPlayer.reactivations, 'weekly reactivations come from WE5');
assert.equal(weeklyOperations?.worldCustomerUpgrades, advancedPlayer.upgrades, 'weekly reporting retains WE5 upgrades');
assert.equal(weeklyOperations?.worldCustomerDowngrades, advancedPlayer.downgrades, 'weekly reporting retains WE5 downgrades');
assert.equal(weeklyOperations?.worldCustomerSwitchIns, advancedPlayer.switchIns, 'weekly reporting retains WE5 switch-ins');
assert.equal(weeklyOperations?.worldCustomerSwitchOuts, advancedPlayer.switchOuts, 'weekly reporting retains WE5 switch-outs');
assert.equal(weeklyOperations?.worldCustomerAccessLoadAccounts, advancedPlayer.accessLoadAccounts, 'weekly infrastructure receives paid plus shared WE5 access load');
assert.equal(weeklyOperations?.worldCustomerPiracyReach, advancedPlayer.piracyReach, 'weekly reporting retains non-paying piracy reach');
assert.deepEqual(weeklyOperations?.worldCustomerPlanAllocations, advancedPlayer.planAllocations, 'weekly plan mix uses actual WE5 accounts');
assert.equal(
    weeklyOperations?.worldCustomerMonthlySubscriptionRevenue,
    advancedPlayer.monthlySubscriptionRevenue,
    'weekly economics retain exact paid-plan monthly revenue without monetizing shared access or piracy',
);

const recoveryBase = structuredClone(advanced);
const seededPlayerCountry = Object.values(state.countries).find((country: any) => country.cohorts.some((cohort: any) => (
    cohort.planCells.some((cell: any) => cell.platformId === 'PLAYER')
))) as any;
const seededPlayerCohort = seededPlayerCountry.cohorts.find((cohort: any) => cohort.planCells.some((cell: any) => cell.platformId === 'PLAYER'));
const recoveryCountry = recoveryBase.countries[seededPlayerCountry.countryId] as any;
const recoveryCohort = recoveryCountry.cohorts.find((cohort: any) => cohort.cohortId === seededPlayerCohort.cohortId);
recoveryCohort.lapsedCells.push({
    platformId: 'PLAYER',
    planId: 'ESSENTIAL',
    households: 1_000,
    lastActiveAbsoluteWeek: nextWeek,
});
const recoveryPlayer = structuredClone(player) as Player;
recoveryPlayer.currentWeek += 2;
const recoveryWeek = getAbsoluteWeek(recoveryPlayer.age, recoveryPlayer.currentWeek);
recoveryPlayer.world.worldStreamingCompetition = createWorldStreamingCompetitionState(recoveryPlayer, recoveryWeek);
const recovered = advanceCustomers(recoveryBase, recoveryPlayer, recoveryWeek);
assert.ok(recovered.global.playerReactivations > 0, 'recently lapsed customers can return instead of being counted as brand-new joins');
assert.equal(
    recovered.global.playerStartingPaidAccounts + recovered.global.playerJoins + recovered.global.playerReactivations - recovered.global.playerCancellations,
    recovered.global.playerEndingPaidAccounts,
    'reactivation remains a separate reconciled waterfall path',
);

const oldSave = structuredClone(player) as Player;
delete oldSave.world.worldStreamingCustomers;
oldSave.money = 987_654_321;
oldSave.ownedStreamingPlatform.treasuryCash = 321_654_987;
oldSave.ownedStreamingPlatform.metrics.subscribers = 765_432;
const migrated = migratePlayerSave(oldSave);
assert.ok(migrated.world.worldStreamingCustomers, 'old saves gain canonical WE5 customer state');
assert.equal(migrated.money, oldSave.money, 'WE5 migration does not move player cash');
assert.equal(migrated.ownedStreamingPlatform.treasuryCash, oldSave.ownedStreamingPlatform.treasuryCash, 'WE5 migration does not move streaming treasury');
assert.equal(migrated.ownedStreamingPlatform.metrics.subscribers, oldSave.ownedStreamingPlatform.metrics.subscribers, 'WE5 migration preserves existing subscribers');
assert.equal(migrated.world.worldStreamingCustomers.global.playerEndingPaidAccounts, oldSave.ownedStreamingPlatform.metrics.subscribers, 'migrated WE5 state seeds the saved subscriber count');
assert.deepEqual(migratePlayerSave(migrated).world.worldStreamingCustomers, migrated.world.worldStreamingCustomers, 'repeated WE5 migration is idempotent');

const gameLoopSource = readFileSync(resolve(process.cwd(), 'services/gameLoop.ts'), 'utf8');
const competitionStage = gameLoopSource.indexOf("emitLoopStage('world_streaming_competition_done'");
const customersStage = gameLoopSource.indexOf("emitLoopStage('world_streaming_customers_start'");
const ownedStreamingStage = gameLoopSource.indexOf('const ownedStreamingResult = processOwnedStreamingPlatformWeek');
assert.ok(competitionStage >= 0 && customersStage > competitionStage && customersStage < ownedStreamingStage, 'WE5 advances after WE4 and before owned streaming economics');

const corrupt = structuredClone(advanced) as any;
const corruptCohort = Object.values(corrupt.countries).flatMap((country: any) => country.cohorts)
    .find((cohort: any) => cohort.planCells.length > 0) as any;
assert.ok(corruptCohort, 'corruption fixture finds a materialized customer cell');
corruptCohort.planCells[0].paidAccounts = -99;
const repaired = normalizeCustomers(corrupt, nextPlayer, nextWeek);
assert.ok(Object.values(repaired.countries).every((country: any) => country.cohorts.every((cohort: any) => (
    cohort.planCells.every((cell: any) => cell.paidAccounts >= 0)
))), 'malformed customer cells rebuild deterministically without leaving negative accounts');
assert.equal(repaired.global.playerEndingPaidAccounts, nextPlayer.ownedStreamingPlatform.metrics.subscribers, 'corruption recovery preserves the saved player subscriber authority');

const runLongHorizon = () => {
    const horizonPlayer = structuredClone(player) as Player;
    let horizonState = createCustomers(horizonPlayer, absoluteWeek);
    for (let year = 1; year <= 400; year += 1) {
        const horizonWeek = absoluteWeek + year * 52;
        horizonPlayer.world.worldStreamingCustomers = horizonState;
        horizonPlayer.world.worldStreamingCompetition = createWorldStreamingCompetitionState(horizonPlayer, horizonWeek);
        horizonState = advanceCustomers(horizonState, horizonPlayer, horizonWeek);
        horizonPlayer.ownedStreamingPlatform.metrics.subscribers = getPlayerOutcome(horizonState)?.endingPaidAccounts || 0;
        if (year % 25 === 0) {
            const reloaded = normalizeCustomers(JSON.parse(JSON.stringify(horizonState)), horizonPlayer, horizonWeek);
            assert.deepEqual(reloaded, horizonState, `year ${year} save/reload does not reroll WE5`);
            horizonState = reloaded;
        }
    }
    return horizonState;
};
const longRunStartedAt = performance.now();
const longRun = runLongHorizon();
const longRunMs = performance.now() - longRunStartedAt;
const serializedBytes = Buffer.byteLength(JSON.stringify(longRun));
assert.equal(longRun.lastProcessedAbsoluteWeek, absoluteWeek + 20_800, 'WE5 reaches a 400-year / 20,800-week horizon');
assert.ok(longRun.snapshots.length <= 52 && longRun.recentMovements.length <= 624, '400-year WE5 histories remain bounded');
assert.ok(serializedBytes < 6_000_000, 'WE5 customer state remains below the explicit 6 MB mobile-save ceiling');
assert.ok(Number.isFinite(longRun.global.endingPaidAccounts) && longRun.global.endingPaidAccounts >= 0, '400-year paid accounts remain finite and non-negative');
assert.equal(
    longRun.global.startingPaidAccounts + longRun.global.joins + longRun.global.reactivations - longRun.global.cancellations,
    longRun.global.endingPaidAccounts,
    '400-year final customer waterfall reconciles',
);
assert.equal(
    longRun.global.playerMonthlySubscriptionRevenue,
    Math.round(longRun.global.playerPlanAllocations.reduce((total: number, plan: any) => total + plan.monthlySubscriptionRevenue, 0) * 100) / 100,
    '400-year player subscription revenue still comes only from paid plan allocations',
);
console.log(`WE5 400-year horizon: ${(serializedBytes / 1024).toFixed(1)} KiB state; ${longRunMs.toFixed(1)}ms across 400 annual checkpoints.`);
