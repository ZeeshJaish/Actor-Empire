import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createWorldPopulationState, advanceWorldPopulationToWeek, WORLD_POPULATION_EPOCH_ABSOLUTE_WEEK } from '../services/worldEconomy/worldPopulation';
import * as audienceEngine from '../services/worldEconomy/worldAudienceCohorts';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { getStreamingAudienceMarket } from '../services/streamingAudienceMarket';

const enginePath = resolve(process.cwd(), 'services/worldEconomy/worldAudienceCohorts.ts');

assert.equal(
    existsSync(enginePath),
    true,
    'WE2 requires a canonical audience cohort and household-budget engine',
);

const createState = (audienceEngine as any).createWorldAudienceEconomyState;
const normalizeState = (audienceEngine as any).normalizeWorldAudienceEconomyState;
const advanceState = (audienceEngine as any).advanceWorldAudienceEconomyToWeek;
const getCountry = (audienceEngine as any).getWorldAudienceCountry;
const getSummary = (audienceEngine as any).getWorldAudienceSummary;
const getPersonaShares = (audienceEngine as any).getWorldAudiencePersonaShares;

assert.equal(typeof createState, 'function', 'WE2 creates an audience economy from WE1 population');
assert.equal(typeof normalizeState, 'function', 'WE2 normalizes saved audience economy state');
assert.equal(typeof advanceState, 'function', 'WE2 advances directly to a supplied WE1 week');
assert.equal(typeof getCountry, 'function', 'WE2 exposes a country selector');
assert.equal(typeof getSummary, 'function', 'WE2 exposes a global summary selector');
assert.equal(typeof getPersonaShares, 'function', 'WE2 exposes persona shares for presentation adapters');

const epoch = WORLD_POPULATION_EPOCH_ABSOLUTE_WEEK;
const population = createWorldPopulationState(epoch);
const initial = createState(population, epoch);
const repeated = createState(population, epoch);

assert.deepEqual(initial, repeated, 'same population and week produce deterministic cohorts');
assert.equal(initial.schemaVersion, 1, 'WE2 uses schema version 1');
assert.equal(initial.lastProcessedAbsoluteWeek, epoch, 'WE2 starts at the canonical WE1 week');
assert.equal(Object.keys(initial.countries).length, population.global.countryCount, 'WE2 covers every WE1 country');
assert.equal(initial.global.population, population.global.population, 'WE2 global people reconcile to WE1');
assert.equal(initial.global.households, population.global.households, 'WE2 global households reconcile to WE1');

Object.values(initial.countries).forEach((country: any) => {
    const canonical = population.countries[country.id];
    assert.ok(canonical, `${country.id} points to a canonical WE1 country`);
    assert.ok(country.cohorts.length >= 6 && country.cohorts.length <= 18, `${country.id} remains sparse`);
    assert.equal(
        country.cohorts.reduce((sum: number, cohort: any) => sum + cohort.households, 0) + country.nonParticipantHouseholds,
        canonical.households,
        `${country.id} cohort and non-participant households reconcile`,
    );
    assert.equal(
        country.cohorts.reduce((sum: number, cohort: any) => sum + cohort.people, 0) + country.nonParticipantPopulation,
        canonical.population,
        `${country.id} cohort and non-participant people reconcile`,
    );
    assert.ok(country.nonParticipantHouseholds >= 0, `${country.id} permits households outside commercial entertainment`);
    assert.ok(country.totalMonthlyEntertainmentBudget >= 0, `${country.id} budget is finite and non-negative`);
    country.cohorts.forEach((cohort: any) => {
        assert.match(cohort.id, new RegExp(`^${country.id}:`), 'cohort IDs are country-stable');
        assert.ok(cohort.households > 0 && cohort.people > 0, 'materialized cohorts are meaningful');
        assert.ok(cohort.monthlyEntertainmentBudgetPerHousehold > 0, 'commercial cohorts have a positive budget');
        assert.equal(cohort.personaAffinity.length, 6, 'cohorts carry the six existing audience-persona affinities');
        assert.ok(cohort.personaAffinity.every((value: number) => value >= 0 && value <= 100), 'persona affinities are bounded');
        assert.ok(cohort.priceSensitivityIndex >= 0 && cohort.priceSensitivityIndex <= 100, 'price sensitivity is bounded');
        assert.ok(cohort.legalConsumptionIndex >= 0 && cohort.legalConsumptionIndex <= 100, 'legal tendency is bounded');
        assert.ok(cohort.sharingTendencyIndex >= 0 && cohort.sharingTendencyIndex <= 100, 'sharing tendency is bounded');
        assert.ok(cohort.piracyTendencyIndex >= 0 && cohort.piracyTendencyIndex <= 100, 'piracy tendency is bounded');
    });
});

const personaShares = getPersonaShares(initial);
assert.equal(personaShares.length, 6, 'all existing audience personas are represented');
assert.ok(Math.abs(personaShares.reduce((sum: number, item: any) => sum + item.sharePercent, 0) - 100) < 0.11, 'persona shares reconcile to 100%');
assert.notDeepEqual(
    getCountry(initial, 'IN').personaShares,
    getCountry(initial, 'JP').personaShares,
    'country composition changes persona prevalence',
);
assert.equal(getCountry(initial, 'unknown'), null, 'unknown countries are rejected');
assert.deepEqual(getSummary(initial), initial.global, 'global selector returns the canonical WE2 summary');

const stressedPopulation = structuredClone(population);
stressedPopulation.countries.IN.macro.consumerConfidence = 10;
stressedPopulation.countries.IN.macro.inflationPressure = 90;
stressedPopulation.countries.IN.macro.unemploymentPressure = 85;
const stressed = createState(stressedPopulation, epoch);
assert.ok(
    stressed.countries.IN.averageMonthlyEntertainmentBudget < initial.countries.IN.averageMonthlyEntertainmentBudget,
    'economic pressure reduces a country cohort budget without deleting people',
);
assert.equal(stressed.countries.IN.population, initial.countries.IN.population, 'budget pressure does not alter population');

const futurePopulation = advanceWorldPopulationToWeek(population, epoch + 400 * 52);
const future = advanceState(initial, futurePopulation, epoch + 400 * 52);
assert.equal(future.lastProcessedAbsoluteWeek, epoch + 400 * 52, 'WE2 projects directly across 400 years');
assert.equal(future.global.population, futurePopulation.global.population, '400-year cohorts reconcile to 400-year WE1 population');
assert.equal(future.global.households, futurePopulation.global.households, '400-year households reconcile');
assert.equal(future.snapshots.length, 2, 'direct advancement preserves the origin snapshot and adds the crossed-year snapshot');
assert.ok(future.snapshots.length <= 32, 'WE2 history remains bounded');
assert.deepEqual(advanceState(future, futurePopulation, epoch + 400 * 52), future, 'same-week advancement is idempotent');

const malformed = normalizeState({ schemaVersion: 99, countries: {} }, population, epoch);
assert.equal(Object.keys(malformed.countries).length, population.global.countryCount, 'malformed WE2 state repairs from WE1');
const internallyCorrupt = structuredClone(initial);
internallyCorrupt.countries.US.nonParticipantHouseholds += 1_000;
internallyCorrupt.global.population = 1;
const repaired = normalizeState(internallyCorrupt, population, epoch);
assert.equal(repaired.global.population, population.global.population, 'internally inconsistent WE2 state repairs deterministically');

const serializedBytes = Buffer.byteLength(JSON.stringify(initial));
const performanceStartedAt = performance.now();
for (let index = 0; index < 20; index += 1) {
    advanceState(initial, futurePopulation, epoch + 400 * 52);
}
const projectionMs = performance.now() - performanceStartedAt;
assert.ok(serializedBytes < 1_500_000, `WE2 state remains compact (${serializedBytes} bytes)`);
assert.ok(projectionMs < 700, `twenty 400-year WE2 projections remain mobile-practical (${projectionMs.toFixed(1)}ms)`);

console.log(`WE2 cohort engine: ${initial.global.cohortCount.toLocaleString()} sparse cohorts across ${initial.global.countryCount} countries; ${(serializedBytes / 1024).toFixed(1)} KiB saved state; ${projectionMs.toFixed(1)}ms for 20 long-range projections.`);

const oldSave = structuredClone(INITIAL_PLAYER) as Player;
oldSave.id = 'we2_old_save';
oldSave.age = 82;
oldSave.currentWeek = 20;
oldSave.money = 876_543_210;
oldSave.ownedStreamingPlatform.metrics.subscribers = 23_456_789;
delete oldSave.world.worldAudienceEconomy;

const migratedOnce = migratePlayerSave(oldSave);
const migratedTwice = migratePlayerSave(migratedOnce);
const migratedWeek = getAbsoluteWeek(oldSave.age, oldSave.currentWeek);
assert.ok(migratedOnce.world.worldAudienceEconomy, 'old saves gain canonical WE2 cohorts');
assert.equal(migratedOnce.world.worldAudienceEconomy?.lastProcessedAbsoluteWeek, migratedWeek, 'WE2 migrates directly at the save week');
assert.equal(migratedOnce.world.worldAudienceEconomy?.global.population, migratedOnce.world.worldPopulation?.global.population, 'migrated WE2 population reconciles to migrated WE1');
assert.equal(migratedOnce.money, oldSave.money, 'WE2 migration preserves player money');
assert.equal(migratedOnce.ownedStreamingPlatform.metrics.subscribers, oldSave.ownedStreamingPlatform.metrics.subscribers, 'WE2 migration preserves subscribers');
assert.deepEqual(migratedTwice.world.worldAudienceEconomy, migratedOnce.world.worldAudienceEconomy, 'WE2 migration is idempotent');

const weekPlayer = migratePlayerSave({
    ...structuredClone(INITIAL_PLAYER),
    id: 'we2_week_wrap',
    age: 27,
    currentWeek: 52,
} as Player);
const stages: string[] = [];
const weekResult = await processGameWeek(weekPlayer, { onStage: stage => stages.push(stage) });
const resultWeek = getAbsoluteWeek(weekResult.player.age, weekResult.player.currentWeek);
assert.equal(weekResult.player.world.worldAudienceEconomy?.lastProcessedAbsoluteWeek, resultWeek, 'weekly progression advances WE2 after clock normalization');
assert.equal(weekResult.player.world.worldAudienceEconomy?.global.population, weekResult.player.world.worldPopulation?.global.population, 'weekly WE2 population stays reconciled to WE1');
assert.equal(weekResult.player.world.worldAudienceEconomy?.global.households, weekResult.player.world.worldPopulation?.global.households, 'weekly WE2 households stay reconciled to WE1');
assert.ok(stages.indexOf('world_population_done') < stages.indexOf('world_audience_economy_start'), 'WE2 runs after WE1 population');
assert.ok(stages.indexOf('world_audience_economy_done') < stages.indexOf('streaming_rights_calendar_start'), 'WE2 completes before downstream streaming systems');

console.log('WE2 save migration and weekly progression integration passed.');

const beforeAudienceRead = JSON.stringify(migratedOnce);
const moneyBeforeAudienceRead = migratedOnce.money;
const subscribersBeforeAudienceRead = migratedOnce.ownedStreamingPlatform.metrics.subscribers;
const market = getStreamingAudienceMarket(migratedOnce);
const canonicalAudience = migratedOnce.world.worldAudienceEconomy!;
const canonicalPersonaShares = getPersonaShares(canonicalAudience);

assert.ok(market.householdEconomy, 'Audience Market exposes the canonical household economy');
assert.equal(market.householdEconomy.commercialHouseholds, canonicalAudience.global.commercialHouseholds, 'Audience Market uses canonical commercial households');
assert.equal(market.householdEconomy.nonParticipantHouseholds, canonicalAudience.global.nonParticipantHouseholds, 'Audience Market preserves households outside the market');
assert.equal(market.householdEconomy.averageMonthlyEntertainmentBudget, canonicalAudience.global.averageMonthlyEntertainmentBudget, 'Audience Market uses the canonical entertainment budget');
assert.ok(market.payingHouseholds <= market.householdEconomy.commercialHouseholds, 'Global paying homes cannot exceed commercially participating homes');
market.personas.forEach(persona => {
    const canonical = canonicalPersonaShares.find((entry: any) => entry.id === persona.id);
    assert.equal(persona.sharePercent, canonical?.sharePercent, `${persona.id} share comes from WE2 cohorts`);
    assert.equal(persona.averageMonthlyEntertainmentBudget, canonical?.averageMonthlyEntertainmentBudget, `${persona.id} budget comes from WE2 cohorts`);
});
market.countries.forEach(country => {
    const canonical = canonicalAudience.countries[country.id];
    assert.equal(country.commercialHouseholds, canonical.commercialHouseholds, `${country.id} commercial households are canonical`);
    assert.equal(country.nonParticipantHouseholds, canonical.nonParticipantHouseholds, `${country.id} non-participants are canonical`);
    assert.equal(country.averageMonthlyEntertainmentBudget, canonical.averageMonthlyEntertainmentBudget, `${country.id} budget is canonical`);
    assert.ok(country.payingHouseholds <= country.commercialHouseholds, `${country.id} paying homes cannot exceed commercially participating homes`);
});
assert.equal(JSON.stringify(migratedOnce), beforeAudienceRead, 'opening Audience Market does not mutate the player or canonical cohorts');
assert.equal(migratedOnce.money, moneyBeforeAudienceRead, 'Audience Market does not alter player cash');
assert.equal(migratedOnce.ownedStreamingPlatform.metrics.subscribers, subscribersBeforeAudienceRead, 'Audience Market does not alter subscribers');

console.log('WE2 Audience Market shadow adapter passed.');
