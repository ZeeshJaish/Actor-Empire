import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import * as countryRegistry from '../services/worldEconomy/worldCountryRegistry';
import * as populationEngine from '../services/worldEconomy/worldPopulation';
import { STREAMING_DAY_ONE_MARKETS } from '../services/streamingDayOneMarkets';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { getStreamingAudienceMarket } from '../services/streamingAudienceMarket';

const registryPath = resolve(process.cwd(), 'services/worldEconomy/worldCountryRegistry.ts');
const enginePath = resolve(process.cwd(), 'services/worldEconomy/worldPopulation.ts');

assert.equal(
    existsSync(registryPath),
    true,
    'WE1 requires a canonical country registry module',
);
assert.equal(existsSync(enginePath), true, 'WE1 requires a canonical population engine');

const definitions = (countryRegistry as any).WORLD_COUNTRY_DEFINITIONS;
const definitionsById = (countryRegistry as any).WORLD_COUNTRY_DEFINITIONS_BY_ID;
const baseline = (countryRegistry as any).WORLD_POPULATION_BASELINE;
const regions = new Set(['NORTH_AMERICA', 'SOUTH_AMERICA', 'EUROPE', 'AFRICA', 'ASIA', 'OCEANIA']);

assert.ok(Array.isArray(definitions), 'WE1 registry exports country definitions');
assert.ok(definitions.length >= 190, `WE1 represents countries individually (received ${definitions.length})`);
assert.equal(new Set(definitions.map((country: any) => country.id)).size, definitions.length, 'country IDs are unique');
assert.ok(definitions.every((country: any) => /^[A-Z]{2}$/.test(country.id)), 'country IDs are stable two-letter IDs');
assert.ok(definitions.every((country: any) => regions.has(country.regionId)), 'every country belongs to a supported region');
assert.ok(definitions.every((country: any) => country.name && country.baselinePopulation > 0), 'countries have names and populations');
assert.ok(definitions.every((country: any) => Array.isArray(country.languages) && country.languages.length > 0), 'countries have language fallbacks');
assert.equal(Object.keys(definitionsById || {}).length, definitions.length, 'country lookup contains every definition');
STREAMING_DAY_ONE_MARKETS.forEach(market => {
    assert.ok(definitionsById?.[market.id], `existing streaming market ${market.id} is canonical`);
});
const populationTotal = definitions.reduce((sum: number, country: any) => sum + country.baselinePopulation, 0);
assert.ok(Math.abs(populationTotal - baseline) <= definitions.length, 'normalized country populations reconcile to the world baseline');
assert.equal(baseline, 8_120_000_000, 'WE1 begins from the approved 8.12-billion game-world baseline');

console.log(`WE1 country registry: ${definitions.length} countries, ${populationTotal.toLocaleString()} people.`);

const createState = (populationEngine as any).createWorldPopulationState;
const normalizeState = (populationEngine as any).normalizeWorldPopulationState;
const advanceState = (populationEngine as any).advanceWorldPopulationToWeek;
const getCountry = (populationEngine as any).getWorldPopulationCountry;
const getSummary = (populationEngine as any).getWorldPopulationSummary;
const epoch = (populationEngine as any).WORLD_POPULATION_EPOCH_ABSOLUTE_WEEK;

assert.equal(typeof createState, 'function', 'population engine creates canonical state');
assert.equal(typeof normalizeState, 'function', 'population engine normalizes save state');
assert.equal(typeof advanceState, 'function', 'population engine advances directly to an absolute week');
assert.equal(typeof getCountry, 'function', 'population engine exposes country selectors');
assert.equal(typeof getSummary, 'function', 'population engine exposes summary selectors');
assert.equal(epoch, 728, 'world population epoch matches a new player at age 15, week 1');

const initial = createState(epoch);
const repeatedInitial = createState(epoch);
assert.deepEqual(initial, repeatedInitial, 'same-week world creation is deterministic');
assert.equal(Object.keys(initial.countries).length, definitions.length, 'state contains every canonical country');
assert.equal(initial.global.population, baseline, 'initial global population matches the approved baseline');
assert.equal(
    Object.values(initial.regions).reduce((sum: number, region: any) => sum + region.population, 0),
    initial.global.population,
    'regional population reconciles to global population',
);
assert.equal(
    Object.values(initial.countries).reduce((sum: number, country: any) => sum + country.population, 0),
    initial.global.population,
    'country population reconciles to global population',
);

Object.values(initial.countries).forEach((country: any) => {
    assert.equal(
        Object.values(country.ageBands).reduce((sum: number, value: any) => sum + Number(value), 0),
        country.population,
        `${country.id} age bands reconcile`,
    );
    assert.equal(
        Object.values(country.incomeBands).reduce((sum: number, value: any) => sum + Number(value), 0),
        country.households,
        `${country.id} income bands reconcile`,
    );
    [
        country.urbanPercent,
        country.reliableInternetPercent,
        country.smartphoneAccessPercent,
        country.homeScreenAccessPercent,
        country.digitalPaymentAccessPercent,
        country.cinemaAccessPercent,
        country.macro.inflationPressure,
        country.macro.unemploymentPressure,
        country.macro.consumerConfidence,
        country.macro.inequalityIndex,
    ].forEach(value => assert.ok(value >= 0 && value <= 100, `${country.id} percentage/index stays bounded`));
});

const sameWeek = advanceState(initial, epoch);
assert.deepEqual(sameWeek, initial, 'advancing to the current week is idempotent');

const century = advanceState(initial, epoch + 100 * 52);
const fourCenturies = advanceState(initial, epoch + 400 * 52);
assert.equal(century.lastProcessedAbsoluteWeek, epoch + 100 * 52, 'century jump lands on target week');
assert.equal(fourCenturies.lastProcessedAbsoluteWeek, epoch + 400 * 52, '400-year jump lands on target week');
assert.ok(fourCenturies.global.population > 2_000_000_000, '400-year world does not collapse implausibly');
assert.ok(fourCenturies.global.population < 20_000_000_000, '400-year world avoids exponential population explosion');
assert.ok(century.countries.JP.population < initial.countries.JP.population, 'mature ageing markets can decline');
assert.ok(century.countries.NG.population > initial.countries.NG.population, 'young developing markets can continue growing');
assert.ok(fourCenturies.snapshots.length <= 32, 'population history remains bounded');

const malformed = normalizeState({
    schemaVersion: 99,
    countries: { US: { population: -5, households: Number.NaN } },
}, epoch + 52);
assert.equal(malformed.schemaVersion, 1, 'malformed schema migrates to WE1');
assert.equal(Object.keys(malformed.countries).length, definitions.length, 'malformed state repairs missing countries');
assert.ok(malformed.countries.US.population > 0, 'malformed negative population is repaired');
const internallyCorrupt = structuredClone(initial);
internallyCorrupt.countries.US.ageBands.CHILD = -1;
internallyCorrupt.countries.US.incomeBands.MIDDLE += 9_999;
internallyCorrupt.global.population = 1;
const repairedInternal = normalizeState(internallyCorrupt, epoch);
assert.ok(repairedInternal.countries.US.ageBands.CHILD >= 0, 'schema-valid negative age data is repaired');
assert.equal(
    Object.values(repairedInternal.countries.US.incomeBands).reduce((sum: number, value: any) => sum + Number(value), 0),
    repairedInternal.countries.US.households,
    'schema-valid household distribution drift is repaired',
);
assert.equal(repairedInternal.global.population, baseline, 'schema-valid summary drift is repaired');
assert.equal(getCountry(initial, 'in')?.id, 'IN', 'country selector normalizes IDs');
assert.equal(getCountry(initial, 'unknown'), null, 'country selector rejects unknown IDs');
assert.deepEqual(getSummary(initial), initial.global, 'summary selector returns canonical global summary');

const serializedPopulationBytes = Buffer.byteLength(JSON.stringify(initial));
const performanceStartedAt = performance.now();
for (let index = 0; index < 20; index += 1) {
    advanceState(initial, epoch + 400 * 52 + index);
}
const fourCenturyBatchMs = performance.now() - performanceStartedAt;
assert.ok(serializedPopulationBytes < 750_000, `canonical population remains compact (${serializedPopulationBytes} bytes)`);
assert.ok(fourCenturyBatchMs < 500, `twenty direct 400-year projections remain fast (${fourCenturyBatchMs.toFixed(1)}ms)`);

console.log(`WE1 population engine: ${fourCenturies.global.population.toLocaleString()} people after 400 years; ${fourCenturies.snapshots.length} bounded snapshots; ${(serializedPopulationBytes / 1024).toFixed(1)} KiB saved state; ${fourCenturyBatchMs.toFixed(1)}ms for 20 long-range projections.`);

const oldSave = structuredClone(INITIAL_PLAYER) as Player;
oldSave.id = 'we1_old_save';
oldSave.age = 82;
oldSave.currentWeek = 20;
oldSave.money = 987_654_321;
oldSave.ownedStreamingPlatform.metrics.subscribers = 12_345_678;
delete oldSave.world.worldPopulation;

const migratedOnce = migratePlayerSave(oldSave);
const migratedTwice = migratePlayerSave(migratedOnce);
const oldSaveAbsoluteWeek = getAbsoluteWeek(oldSave.age, oldSave.currentWeek);
assert.ok(migratedOnce.world.worldPopulation, 'old saves gain canonical world population');
assert.equal(migratedOnce.world.worldPopulation?.lastProcessedAbsoluteWeek, oldSaveAbsoluteWeek, 'old saves initialize directly at their current week');
assert.equal(migratedOnce.money, oldSave.money, 'WE1 migration does not alter player money');
assert.equal(migratedOnce.ownedStreamingPlatform.metrics.subscribers, oldSave.ownedStreamingPlatform.metrics.subscribers, 'WE1 migration does not alter streaming subscribers');
assert.deepEqual(migratedTwice.world.worldPopulation, migratedOnce.world.worldPopulation, 'WE1 migration is idempotent');

const weekPlayer = migratePlayerSave({
    ...structuredClone(INITIAL_PLAYER),
    id: 'we1_week_wrap',
    age: 27,
    currentWeek: 52,
} as Player);
const beforePopulation = weekPlayer.world.worldPopulation!;
const weekResult = await processGameWeek(weekPlayer);
assert.equal(weekResult.player.age, 28, 'week progression wraps into the next age/year');
assert.equal(weekResult.player.currentWeek, 1, 'week progression wraps week 53 to week 1');
assert.equal(
    weekResult.player.world.worldPopulation?.lastProcessedAbsoluteWeek,
    getAbsoluteWeek(weekResult.player.age, weekResult.player.currentWeek),
    'weekly progression advances canonical population after clock normalization',
);
assert.ok(
    weekResult.player.world.worldPopulation!.lastProcessedAbsoluteWeek > beforePopulation.lastProcessedAbsoluteWeek,
    'weekly population progression advances exactly forward',
);

console.log('WE1 save migration and weekly progression integration passed.');

const beforeAudienceRead = JSON.stringify(migratedOnce.world.worldPopulation);
const audienceMarket = getStreamingAudienceMarket(migratedOnce);
assert.equal(
    audienceMarket.globalPopulation,
    migratedOnce.world.worldPopulation?.global.population,
    'Audience Market reads the canonical global population',
);
audienceMarket.countries.forEach(country => {
    assert.equal(
        country.estimatedPopulation,
        migratedOnce.world.worldPopulation?.countries[country.id]?.population,
        `Audience Market reads canonical population for ${country.id}`,
    );
});
assert.equal(
    JSON.stringify(migratedOnce.world.worldPopulation),
    beforeAudienceRead,
    'opening Audience Market does not mutate canonical population',
);
const farFuturePlayer = structuredClone(migratedOnce);
farFuturePlayer.age = 415;
farFuturePlayer.currentWeek = 1;
farFuturePlayer.world.worldPopulation = fourCenturies;
const farFutureAudience = getStreamingAudienceMarket(farFuturePlayer);
assert.ok(
    farFutureAudience.countries.every(country => country.activeViewers <= country.estimatedPopulation),
    'streaming audience presentation never exceeds canonical country population',
);

console.log('WE1 Audience Market canonical projection passed.');
