import assert from 'node:assert/strict';
import type { OwnedStreamingLaunchMarketingDraft } from '../types';
import {
  forecastStreamingLaunchMarketing,
  getStreamingLaunchMarketingRecommendations,
  getStreamingLaunchMarketingWeeklySchedule,
  type StreamingLaunchMarketingInput,
} from '../services/streamingLaunchMarketing';

const input: StreamingLaunchMarketingInput = {
  platformKey: 'audit-platform',
  absoluteWeek: 140,
  buildWeeks: 6,
  availableTreasury: 80_000_000,
  protectedOperatingCash: 10_000_000,
  hasSellablePlan: true,
  hasFlagshipOriginal: true,
  pricingRevision: 4,
  catalogueRevision: 3,
  localizationRevision: 2,
  competitionRevision: 8,
  countries: [
    {
      countryId: 'US', countryName: 'United States', reachableHouseholds: 90_000_000,
      baseConcurrentStreams: 2_400_000, conversionHeadroom: 0.6, mediaCostIndex: 1.25,
      purchasingPowerIndex: 1.1, consumerConfidence: 0.7, internetAccess: 0.95,
      localizationCoverage: 1, catalogueCoverage: 0.9, competitionPressure: 0.8, priorAwareness: 0.08,
    },
    {
      countryId: 'CA', countryName: 'Canada', reachableHouseholds: 14_000_000,
      baseConcurrentStreams: 380_000, conversionHeadroom: 0.7, mediaCostIndex: 1,
      purchasingPowerIndex: 1.05, consumerConfidence: 0.75, internetAccess: 0.96,
      localizationCoverage: 0.9, catalogueCoverage: 0.85, competitionPressure: 0.65, priorAwareness: 0.05,
    },
  ],
};

const draft: OwnedStreamingLaunchMarketingDraft = {
  schemaVersion: 1,
  objective: 'PLATFORM_INTRODUCTION',
  timeline: 'BALANCED',
  budgetCeiling: 10_000_000,
  allocationMode: 'AUTO',
  countryWeights: {},
  channelAllocations: { SOCIAL_DIGITAL: 0.5, CREATORS: 0.5 },
  updatedAtAbsoluteWeek: 140,
  revision: 1,
};

const first = forecastStreamingLaunchMarketing(input, draft);
const second = forecastStreamingLaunchMarketing(input, draft);
assert.deepEqual(first, second, 'Identical inputs must produce identical forecasts.');
assert.equal(first.countryForecasts.reduce((sum, row) => sum + row.allocatedAmount, 0), 10_000_000);

const organic = forecastStreamingLaunchMarketing(input, { ...draft, budgetCeiling: 0 });
assert.equal(organic.likelyAwarenessLift, 0);
assert.equal(organic.acquiredAccounts.likely, 0);

const doubled = forecastStreamingLaunchMarketing(input, { ...draft, budgetCeiling: 20_000_000 });
assert.ok(doubled.likelyAwarenessLift >= first.likelyAwarenessLift);
assert.ok(doubled.likelyAwarenessLift < first.likelyAwarenessLift * 2);

const practicalCeiling = forecastStreamingLaunchMarketing(
  { ...input, availableTreasury: 2_000_000_000_000, protectedOperatingCash: 0 },
  { ...draft, budgetCeiling: 100_000_000 },
);
const trillionCeiling = forecastStreamingLaunchMarketing(
  { ...input, availableTreasury: 2_000_000_000_000, protectedOperatingCash: 0 },
  { ...draft, budgetCeiling: 1_000_000_000_000 },
);
assert.equal(trillionCeiling.baselineConcurrentStreams, 2_780_000, 'The comparison baseline must preserve organic opening demand.');
assert.ok(trillionCeiling.saturationPercent >= 99, 'A trillion-dollar plan must be identified as saturated.');
assert.equal(trillionCeiling.efficiencyStatus, 'SATURATED');
assert.ok(
  trillionCeiling.acquiredAccounts.likely <= practicalCeiling.acquiredAccounts.likely + 1,
  'Extreme spend must not manufacture households after the reachable market is saturated.',
);
assert.ok(
  trillionCeiling.acquiredAccounts.likely <= input.countries.reduce((sum, country) => sum + country.reachableHouseholds * country.conversionHeadroom, 0),
  'Campaign acquisition must remain inside real conversion headroom.',
);

const fundedConfidence = forecastStreamingLaunchMarketing(input, {
  ...draft,
  budgetCeiling: 20_000_000,
});
assert.ok('confidenceScore' in fundedConfidence, 'Forecast must expose the confidence score behind its label.');
assert.ok(
  Number(fundedConfidence.confidenceScore) > Number(organic.confidenceScore),
  'Adequate campaign coverage must improve forecast confidence over an unfunded launch.',
);

const mixedReadiness = forecastStreamingLaunchMarketing(
  {
    ...input,
    availableTreasury: 10_000_000_000,
    protectedOperatingCash: 0,
    countries: [
      input.countries[0],
      {
        ...input.countries[1],
        countryId: 'SMALL',
        countryName: 'Small test market',
        reachableHouseholds: 500_000,
        internetAccess: .55,
        localizationCoverage: .25,
        catalogueCoverage: .4,
        consumerConfidence: .45,
      },
    ],
  },
  { ...draft, budgetCeiling: 7_000_000_000 },
);
assert.notEqual(
  mixedReadiness.confidence,
  'LOW',
  'A small low-readiness market must not force a well-covered campaign to low confidence.',
);

const frontLoaded = forecastStreamingLaunchMarketing(input, { ...draft, timeline: 'FRONT_LOADED' });
const lastWeekPush = forecastStreamingLaunchMarketing(input, { ...draft, timeline: 'LAST_WEEK_PUSH' });
assert.notEqual(
  frontLoaded.likelyAwarenessLift,
  lastWeekPush.likelyAwarenessLift,
  'Campaign timing must change the country forecast, not only the weekly payment schedule.',
);

const recommendations = getStreamingLaunchMarketingRecommendations(input);
assert.ok(recommendations.lean > 0);
assert.ok(recommendations.lean < recommendations.balanced);
assert.ok(recommendations.balanced < recommendations.heavy);
assert.ok(recommendations.heavy < recommendations.event);

const expensive = getStreamingLaunchMarketingRecommendations({
  ...input,
  countries: input.countries.map(country => ({ ...country, mediaCostIndex: country.mediaCostIndex * 2 })),
});
assert.ok(expensive.balanced > recommendations.balanced);

const insufficient = forecastStreamingLaunchMarketing(
  { ...input, countries: [...input.countries, { ...input.countries[1], countryId: 'MX', countryName: 'Mexico' }] },
  { ...draft, budgetCeiling: 100_000 },
);
assert.ok(insufficient.warnings.includes('INSUFFICIENT_MARKET_COVERAGE'));

const missingOriginal = forecastStreamingLaunchMarketing(
  { ...input, hasFlagshipOriginal: false },
  { ...draft, objective: 'FLAGSHIP_ORIGINAL' },
);
assert.ok(missingOriginal.warnings.includes('MISSING_FLAGSHIP_ORIGINAL'));
assert.ok(missingOriginal.likelyAwarenessLift < first.likelyAwarenessLift);

for (const timeline of ['FRONT_LOADED', 'BALANCED', 'LAST_WEEK_PUSH'] as const) {
  const schedule = getStreamingLaunchMarketingWeeklySchedule(10_000_003, timeline, 6);
  assert.equal(schedule.reduce((sum, amount) => sum + amount, 0), 10_000_003);
  assert.equal(schedule.length, 6);
  assert.ok(schedule.every(amount => Number.isInteger(amount) && amount >= 0));
}

console.log('Streaming launch marketing forecast audit passed.');
