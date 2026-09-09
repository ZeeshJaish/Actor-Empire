import assert from 'node:assert/strict';
import { createWorldPopulationState, advanceWorldPopulationToWeek, WORLD_POPULATION_EPOCH_ABSOLUTE_WEEK } from '../services/worldEconomy/worldPopulation';
import { createWorldAudienceEconomyState, advanceWorldAudienceEconomyToWeek } from '../services/worldEconomy/worldAudienceCohorts';
import * as participationEngine from '../services/worldEconomy/worldAudienceParticipation';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { getStreamingAudienceMarket } from '../services/streamingAudienceMarket';

const createState = (participationEngine as any).createWorldAudienceParticipationState;
const normalizeState = (participationEngine as any).normalizeWorldAudienceParticipationState;
const advanceState = (participationEngine as any).advanceWorldAudienceParticipationToWeek;
const getCountry = (participationEngine as any).getWorldAudienceParticipationCountry;
const getSummary = (participationEngine as any).getWorldAudienceParticipationSummary;

assert.equal(typeof createState, 'function', 'WE3 creates participation from canonical WE1 and WE2 state');
assert.equal(typeof normalizeState, 'function', 'WE3 normalizes saved participation state');
assert.equal(typeof advanceState, 'function', 'WE3 advances directly to a supplied canonical week');
assert.equal(typeof getCountry, 'function', 'WE3 exposes a country participation selector');
assert.equal(typeof getSummary, 'function', 'WE3 exposes a global participation selector');

const epoch = WORLD_POPULATION_EPOCH_ABSOLUTE_WEEK;
const population = createWorldPopulationState(epoch);
const audience = createWorldAudienceEconomyState(population, epoch);
const initial = createState(population, audience, epoch);
const repeated = createState(population, audience, epoch);

assert.deepEqual(initial, repeated, 'same WE1 and WE2 inputs produce deterministic participation');
assert.equal(initial.schemaVersion, 1, 'WE3 starts at schema version 1');
assert.equal(initial.lastProcessedAbsoluteWeek, epoch, 'WE3 starts at the canonical week');
assert.equal(Object.keys(initial.countries).length, population.global.countryCount, 'WE3 covers every canonical country');
assert.equal(initial.global.households, audience.global.households, 'WE3 global households reconcile to WE2');
assert.equal(initial.global.commercialHouseholds, audience.global.commercialHouseholds, 'WE3 commercial households reconcile to WE2');
assert.equal(
    initial.global.streamingOnlyHouseholds
    + initial.global.cinemaOnlyHouseholds
    + initial.global.dualParticipantHouseholds
    + initial.global.neitherHouseholds,
    initial.global.households,
    'WE3 global industry partitions reconcile exactly',
);

Object.values(initial.countries).forEach((country: any) => {
    const canonicalAudience = audience.countries[country.id];
    assert.ok(canonicalAudience, `${country.id} references a canonical WE2 country`);
    assert.equal(country.cohorts.length, canonicalAudience.cohorts.length, `${country.id} keeps one compact overlay per WE2 cohort`);
    assert.equal(
        country.streamingOnlyHouseholds
        + country.cinemaOnlyHouseholds
        + country.dualParticipantHouseholds
        + country.neitherHouseholds,
        country.households,
        `${country.id} household participation reconciles`,
    );
    assert.equal(country.streamingReachableHouseholds, country.streamingOnlyHouseholds + country.dualParticipantHouseholds, `${country.id} streaming reach is exact`);
    assert.equal(country.cinemaReachableHouseholds, country.cinemaOnlyHouseholds + country.dualParticipantHouseholds, `${country.id} cinema reach is exact`);
    country.cohorts.forEach((overlay: any) => {
        const cohort = canonicalAudience.cohorts.find(item => item.id === overlay.cohortId);
        assert.ok(cohort, `${overlay.cohortId} references a real WE2 cohort`);
        assert.equal(
            overlay.streamingOnlyHouseholds
            + overlay.cinemaOnlyHouseholds
            + overlay.dualParticipantHouseholds
            + overlay.neitherHouseholds,
            cohort.households,
            `${overlay.cohortId} partitions exactly`,
        );
        ['streamingEligibilityIndex', 'streamingInterestIndex', 'cinemaEligibilityIndex', 'cinemaInterestIndex', 'streamingBarrierIndex', 'cinemaBarrierIndex'].forEach(key => {
            assert.ok(overlay[key] >= 0 && overlay[key] <= 100, `${overlay.cohortId} ${key} is bounded`);
        });
        assert.equal(
            overlay.totalMonthlyStreamingBudget
            + overlay.totalMonthlyCinemaBudget
            + overlay.totalMonthlyOtherEntertainmentBudget
            + overlay.totalMonthlyUncommittedBudget,
            cohort.totalMonthlyEntertainmentBudget,
            `${overlay.cohortId} conserves the WE2 entertainment budget`,
        );
    });
});

assert.notEqual(
    initial.countries.IN.cohorts[0].streamingEligibilityIndex,
    initial.countries.IN.cohorts[0].cinemaEligibilityIndex,
    'streaming and cinema eligibility remain independent',
);
assert.equal(getCountry(initial, 'unknown'), null, 'unknown country participation is rejected');
assert.deepEqual(getSummary(initial), initial.global, 'global selector exposes the canonical WE3 summary');

const separatedPopulation = structuredClone(population);
separatedPopulation.countries.IN.reliableInternetPercent = 4;
separatedPopulation.countries.IN.smartphoneAccessPercent = 7;
separatedPopulation.countries.IN.homeScreenAccessPercent = 5;
separatedPopulation.countries.IN.digitalPaymentAccessPercent = 6;
separatedPopulation.countries.IN.cinemaAccessPercent = 92;
const separatedAudience = createWorldAudienceEconomyState(separatedPopulation, epoch);
const separated = createState(separatedPopulation, separatedAudience, epoch);
assert.ok(
    separated.countries.IN.streamingReachableHouseholds < separated.countries.IN.cinemaReachableHouseholds,
    'poor digital access can restrict streaming without restricting cinema',
);

const futurePopulation = advanceWorldPopulationToWeek(population, epoch + 400 * 52);
const futureAudience = advanceWorldAudienceEconomyToWeek(audience, futurePopulation, epoch + 400 * 52);
const future = advanceState(initial, futurePopulation, futureAudience, epoch + 400 * 52);
assert.equal(future.lastProcessedAbsoluteWeek, epoch + 400 * 52, 'WE3 projects directly across 400 years');
assert.equal(future.global.households, futureAudience.global.households, '400-year participation reconciles to WE2');
assert.equal(future.snapshots.length, 2, 'direct long-range advancement preserves origin and destination snapshots');
assert.ok(future.snapshots.length <= 32, 'WE3 snapshot history remains bounded');
assert.deepEqual(advanceState(future, futurePopulation, futureAudience, epoch + 400 * 52), future, 'same-week advancement is idempotent');

const malformed = normalizeState({ schemaVersion: 99, countries: {} }, population, audience, epoch);
assert.equal(Object.keys(malformed.countries).length, population.global.countryCount, 'malformed WE3 state repairs from canonical sources');
const sourceMismatch = structuredClone(initial);
sourceMismatch.countries.US.cohorts[0].cohortId = 'US:UNKNOWN';
assert.deepEqual(normalizeState(sourceMismatch, population, audience, epoch), initial, 'invalid cohort references regenerate deterministically');
const internallyCorrupt = structuredClone(initial);
internallyCorrupt.countries.US.cohorts[0].streamingEligibilityIndex = 140;
internallyCorrupt.countries.US.streamingReachableHouseholds += 500;
assert.deepEqual(normalizeState(internallyCorrupt, population, audience, epoch), initial, 'out-of-range cohort values and mismatched country aggregates repair deterministically');

const serializedBytes = Buffer.byteLength(JSON.stringify(initial));
const performanceStartedAt = performance.now();
for (let index = 0; index < 20; index += 1) {
    advanceState(initial, futurePopulation, futureAudience, epoch + 400 * 52);
}
const projectionMs = performance.now() - performanceStartedAt;
assert.ok(serializedBytes < 1_500_000, `WE3 participation overlay remains compact (${serializedBytes} bytes)`);
assert.ok(projectionMs < 700, `twenty 400-year WE3 projections remain mobile-practical (${projectionMs.toFixed(1)}ms)`);

console.log(`WE3 participation engine: ${initial.global.cohortCount.toLocaleString()} cohort overlays across ${initial.global.countryCount} countries; ${(serializedBytes / 1024).toFixed(1)} KiB saved state; ${projectionMs.toFixed(1)}ms for 20 long-range projections.`);

const oldSave = structuredClone(INITIAL_PLAYER) as Player;
oldSave.id = 'we3_old_save';
oldSave.age = 82;
oldSave.currentWeek = 20;
oldSave.money = 765_432_100;
oldSave.ownedStreamingPlatform.metrics.subscribers = 12_345_678;
delete oldSave.world.worldAudienceParticipation;

const migratedOnce = migratePlayerSave(oldSave);
const migratedTwice = migratePlayerSave(migratedOnce);
const migratedWeek = getAbsoluteWeek(oldSave.age, oldSave.currentWeek);
assert.ok(migratedOnce.world.worldAudienceParticipation, 'old saves gain canonical WE3 participation');
assert.equal(migratedOnce.world.worldAudienceParticipation?.lastProcessedAbsoluteWeek, migratedWeek, 'WE3 migrates directly at the save week');
assert.equal(migratedOnce.world.worldAudienceParticipation?.global.households, migratedOnce.world.worldAudienceEconomy?.global.households, 'migrated WE3 households reconcile to migrated WE2');
assert.equal(migratedOnce.money, oldSave.money, 'WE3 migration preserves player money');
assert.equal(migratedOnce.ownedStreamingPlatform.metrics.subscribers, oldSave.ownedStreamingPlatform.metrics.subscribers, 'WE3 migration preserves subscribers');
assert.deepEqual(migratedTwice.world.worldAudienceParticipation, migratedOnce.world.worldAudienceParticipation, 'WE3 migration is idempotent');

const weekPlayer = migratePlayerSave({
    ...structuredClone(INITIAL_PLAYER),
    id: 'we3_week_wrap',
    age: 27,
    currentWeek: 52,
} as Player);
const stages: string[] = [];
const weekResult = await processGameWeek(weekPlayer, { onStage: stage => stages.push(stage) });
const resultWeek = getAbsoluteWeek(weekResult.player.age, weekResult.player.currentWeek);
assert.equal(weekResult.player.world.worldAudienceParticipation?.lastProcessedAbsoluteWeek, resultWeek, 'weekly progression advances WE3 after clock normalization');
assert.equal(weekResult.player.world.worldAudienceParticipation?.global.households, weekResult.player.world.worldAudienceEconomy?.global.households, 'weekly WE3 households reconcile to WE2');
assert.ok(stages.indexOf('world_audience_economy_done') < stages.indexOf('world_audience_participation_start'), 'WE3 runs after WE2');
assert.ok(stages.indexOf('world_audience_participation_done') < stages.indexOf('streaming_rights_calendar_start'), 'WE3 completes before downstream streaming systems');

console.log('WE3 save migration and weekly progression integration passed.');

const beforeMarketRead = JSON.stringify(migratedOnce);
const moneyBeforeMarketRead = migratedOnce.money;
const subscribersBeforeMarketRead = migratedOnce.ownedStreamingPlatform.metrics.subscribers;
const market = getStreamingAudienceMarket(migratedOnce);
const canonicalParticipation = migratedOnce.world.worldAudienceParticipation!;
assert.ok(market.industryParticipation, 'Audience Market exposes canonical WE3 participation');
assert.equal(market.industryParticipation.streamingReachableHouseholds, canonicalParticipation.global.streamingReachableHouseholds, 'global streaming reach comes from WE3');
assert.equal(market.industryParticipation.cinemaReachableHouseholds, canonicalParticipation.global.cinemaReachableHouseholds, 'global cinema reach comes from WE3');
assert.equal(market.industryParticipation.dualParticipantHouseholds, canonicalParticipation.global.dualParticipantHouseholds, 'global dual participation comes from WE3');
assert.equal(market.industryParticipation.neitherHouseholds, canonicalParticipation.global.neitherHouseholds, 'global neither participation comes from WE3');
market.countries.forEach(country => {
    const canonical = canonicalParticipation.countries[country.id];
    assert.equal(country.streamingReachableHouseholds, canonical.streamingReachableHouseholds, `${country.id} streaming reach is canonical`);
    assert.equal(country.cinemaReachableHouseholds, canonical.cinemaReachableHouseholds, `${country.id} cinema reach is canonical`);
    assert.equal(country.dualParticipantHouseholds, canonical.dualParticipantHouseholds, `${country.id} dual participation is canonical`);
    assert.equal(country.neitherHouseholds, canonical.neitherHouseholds, `${country.id} neither participation is canonical`);
});
assert.equal(JSON.stringify(migratedOnce), beforeMarketRead, 'opening Audience Market does not mutate WE3 or the player');
assert.equal(migratedOnce.money, moneyBeforeMarketRead, 'WE3 presentation does not alter player cash');
assert.equal(migratedOnce.ownedStreamingPlatform.metrics.subscribers, subscribersBeforeMarketRead, 'WE3 presentation does not alter subscribers');

console.log('WE3 Audience Market shadow adapter passed.');
