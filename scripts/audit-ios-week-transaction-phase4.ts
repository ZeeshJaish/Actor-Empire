import assert from 'node:assert/strict';

import { INITIAL_PLAYER, type Player } from '../types';
import { processGameWeek } from '../services/gameLoop';
import { migratePlayerSave } from '../services/saveMigration';
import { clonePlayerForWeekProcessing } from '../services/gameLoopClone';
import { createWeekPlayerTransaction } from '../services/weekPlayerTransaction';
import { processStreamingPlatformEcosystemTurn } from '../services/streamingPlatformEcosystemTurn';
import { getAbsoluteWeek } from '../services/legacyLogic';

const source = migratePlayerSave(structuredClone(INITIAL_PLAYER) as Player);
const fixture = {
  ...source,
  id: 'ios-week-transaction-audit',
} as Player;
const before = JSON.stringify(fixture);
const canonicalDomain = { countries: {}, snapshots: [] };
const canonicalStudios = { sample: { id: 'sample', name: 'Sample Studio' } };
const canonicalProductions = { sample: { id: 'sample', status: 'RELEASED', title: 'Sample Film' } };
const canonicalBookings = [{ id: 'booking-1', projectId: 'sample', status: 'RELEASED' }];
const canonicalEcosystem = { operators: {}, markets: {}, eventHistory: [] };
const canonicalFixture = {
  ...fixture,
  world: {
    ...fixture.world,
    worldPopulation: canonicalDomain,
    studios: canonicalStudios,
    industryProductions: canonicalProductions,
    talentBookings: canonicalBookings,
    streamingPlatformEcosystem: canonicalEcosystem,
  },
} as unknown as Player;
assert.equal(clonePlayerForWeekProcessing(canonicalFixture).world.worldPopulation, canonicalDomain,
  'An unchanged canonical world domain should be shared rather than copied.');
assert.equal(clonePlayerForWeekProcessing(canonicalFixture).world.studios, canonicalStudios,
  'Weekly studio state should be shared until a studio system takes ownership of the map.');
assert.equal(clonePlayerForWeekProcessing(canonicalFixture).world.industryProductions, canonicalProductions,
  'Industry productions should be shared until a writer produces a new map.');
assert.equal(clonePlayerForWeekProcessing(canonicalFixture).world.talentBookings, canonicalBookings,
  'Talent bookings should be shared until a writer produces a new list.');
assert.equal(clonePlayerForWeekProcessing(canonicalFixture).world.streamingPlatformEcosystem, canonicalEcosystem,
  'Streaming ecosystem history should be shared until its normalizer creates the weekly state.');
const sharedEcosystemDraft = clonePlayerForWeekProcessing(canonicalFixture);
const deepEcosystemDraft = JSON.parse(JSON.stringify(canonicalFixture)) as Player;
const ecosystemBefore = JSON.stringify(canonicalFixture.world.streamingPlatformEcosystem);
const ecosystemWeek = getAbsoluteWeek(canonicalFixture.age, canonicalFixture.currentWeek) + 1;
const sharedEcosystemResult = processStreamingPlatformEcosystemTurn(
  sharedEcosystemDraft, sharedEcosystemDraft.world, ecosystemWeek,
);
const deepEcosystemResult = processStreamingPlatformEcosystemTurn(
  deepEcosystemDraft, deepEcosystemDraft.world, ecosystemWeek,
);
assert.deepEqual(sharedEcosystemResult, deepEcosystemResult,
  'sharing the input ecosystem must not change its weekly result');
assert.equal(JSON.stringify(canonicalFixture.world.streamingPlatformEcosystem), ecosystemBefore,
  'streaming ecosystem normalization must not mutate its shared input');
const malformedStudios = {
  ...canonicalFixture,
  world: { ...canonicalFixture.world, studios: { sample: { id: 'sample', transient: undefined } } },
} as unknown as Player;
const malformedStudiosClone = clonePlayerForWeekProcessing(malformedStudios);
assert.notEqual(malformedStudiosClone.world.studios, malformedStudios.world.studios,
  'Non-canonical studios must retain JSON-clone semantics instead of sharing.');
assert.deepEqual(malformedStudiosClone.world.studios, JSON.parse(JSON.stringify(malformedStudios.world.studios)));
const malformedDomain = {
  ...fixture,
  world: {
    ...fixture.world,
    worldPopulation: { ...fixture.world.worldPopulation, transient: undefined },
  },
} as Player;
const safeClone = clonePlayerForWeekProcessing(malformedDomain);
assert.deepEqual(safeClone, JSON.parse(JSON.stringify(malformedDomain)),
  'Legacy or malformed world domains must keep JSON-clone semantics.');
assert.notEqual(safeClone.world.worldPopulation, malformedDomain.world.worldPopulation);
const rejectedTransaction = createWeekPlayerTransaction(fixture);
assert.throws(() => rejectedTransaction.commit(rejectedTransaction.draft), /stale or incomplete/,
  'A partial week must not become the committed player.');

const originalRandom = Math.random;
const originalNow = Date.now;
Math.random = () => 0.42;
Date.now = () => 4_200_000_000_000;
let result: Awaited<ReturnType<typeof processGameWeek>>;
let fullCloneFactoryCalls = 0;
let fullCloneResult: Awaited<ReturnType<typeof processGameWeek>>;
try {
  result = await processGameWeek(fixture);
  Math.random = () => 0.42;
  Date.now = () => 4_200_000_000_000;
  fullCloneResult = await processGameWeek(fixture, {
    createWeekTransaction: player => {
      fullCloneFactoryCalls += 1;
      return {
        draft: JSON.parse(JSON.stringify(player)) as Player,
        adopt: candidate => candidate,
        commit: candidate => candidate,
      };
    },
  });
} finally {
  Math.random = originalRandom;
  Date.now = originalNow;
}

assert.equal(JSON.stringify(fixture), before, 'A failed or successful week must never mutate the committed player.');
assert.equal(result.player.age * 52 + result.player.currentWeek, fixture.age * 52 + fixture.currentWeek + 1);
assert.equal(fullCloneFactoryCalls, 1, 'the differential baseline must really use the prior JSON clone');
assert.deepEqual(result, fullCloneResult, 'sharing unchanged domains must preserve the exact weekly outcome');

const immutableProductions = Object.fromEntries(Array.from({ length: 32 }, (_, index) => {
  const production = {
    id: `historical-production-${index}`,
    canonicalProjectId: `historical-project-${index}`,
    title: `Historical Project ${index}`,
    projectType: 'MOVIE', genre: 'ACTION', producerStudioId: 'HISTORICAL_STUDIO',
    source: 'PLATFORM_COMMISSION', status: 'RELEASED',
    productionCalendar: { preProductionWeeks: 2, productionWeeks: 8, postProductionWeeks: 2,
      totalWeeks: 12, focusWindowWeeks: 3, elapsedWeeks: 12 },
    budgetMillions: 20, paidMillions: 20, talentBookingIds: [],
    writerSource: 'IN_HOUSE_TEAM', writerId: null, writerName: 'Story Team', writerSkill: 70,
    createdAtAbsoluteWeek: 1, updatedAtAbsoluteWeek: 12,
  };
  Object.freeze(production.productionCalendar);
  Object.freeze(production.talentBookingIds);
  Object.freeze(production);
  return [production.id, production];
}));
Object.freeze(immutableProductions);
const immutableBookings = Object.freeze([Object.freeze({
  id: 'talent:historical-project-0:ACTOR:NPC_TEST',
  npcId: 'NPC_TEST', role: 'ACTOR', projectId: 'historical-project-0',
  projectOwner: 'INDUSTRY_PRODUCTION', producerStudioId: 'HISTORICAL_STUDIO',
  startAbsoluteWeek: 3, endAbsoluteWeek: 11, status: 'RELEASED', releasedAtAbsoluteWeek: 12,
})]);
const historicalFixture = {
  ...fixture,
  world: { ...fixture.world, industryProductions: immutableProductions, talentBookings: immutableBookings },
} as unknown as Player;
const historicalBefore = JSON.stringify(historicalFixture);
const originalRandomForHistory = Math.random;
const originalNowForHistory = Date.now;
Math.random = () => 0.42;
Date.now = () => 4_200_000_000_000;
try {
  const shared = await processGameWeek(historicalFixture);
  Math.random = () => 0.42;
  Date.now = () => 4_200_000_000_000;
  const copied = await processGameWeek(historicalFixture, {
    createWeekTransaction: player => ({
      draft: JSON.parse(JSON.stringify(player)) as Player,
      adopt: candidate => candidate,
      commit: candidate => candidate,
    }),
  });
  assert.deepEqual(shared, copied, 'terminal production history must not change the weekly result when shared');
} finally {
  Math.random = originalRandomForHistory;
  Date.now = originalNowForHistory;
}
assert.equal(JSON.stringify(historicalFixture), historicalBefore,
  'shared historical production records must remain untouched by the weekly pipeline');

console.log('iOS domain-level weekly transaction audit passed.');
