import assert from 'node:assert/strict';
import { forecastStreamingLaunchMarketing, type StreamingLaunchMarketingInput } from '../services/streamingLaunchMarketing';
import { planPlatformAiLaunchMarketing } from '../services/platformAi/platformAiLaunchMarketing';

const input: StreamingLaunchMarketingInput = {
  platformKey: 'NETFLIX', absoluteWeek: 200, buildWeeks: 8,
  availableTreasury: 900_000_000, protectedOperatingCash: 400_000_000,
  hasSellablePlan: true, hasFlagshipOriginal: true,
  pricingRevision: 2, catalogueRevision: 8, localizationRevision: 6, competitionRevision: 12,
  countries: [{
    countryId: 'US', countryName: 'United States', reachableHouseholds: 90_000_000,
    baseConcurrentStreams: 3_000_000, conversionHeadroom: .28, mediaCostIndex: 1.3,
    purchasingPowerIndex: 1.1, consumerConfidence: .7, internetAccess: .95,
    localizationCoverage: 1, catalogueCoverage: .95, competitionPressure: .8, priorAwareness: .45,
  }],
};

const cautious = planPlatformAiLaunchMarketing({
  input, riskTolerance: .25, creativeCompetence: 7, commercialCompetence: 8, prestigeCompetence: 7,
});
const aggressive = planPlatformAiLaunchMarketing({
  input, riskTolerance: .9, creativeCompetence: 9, commercialCompetence: 9.5, prestigeCompetence: 9,
});

assert.ok(cautious.draft.budgetCeiling > 0);
assert.ok(aggressive.draft.budgetCeiling > cautious.draft.budgetCeiling);
assert.ok(aggressive.draft.budgetCeiling <= input.availableTreasury - input.protectedOperatingCash);
assert.deepEqual(aggressive.forecast, forecastStreamingLaunchMarketing(input, aggressive.draft), 'AI must use the shared player forecast kernel.');
assert.deepEqual(
  planPlatformAiLaunchMarketing({ input, riskTolerance: .9, creativeCompetence: 9, commercialCompetence: 9.5, prestigeCompetence: 9 }),
  aggressive,
  'AI campaign planning must be deterministic.',
);

console.log('Platform AI launch marketing audit passed.');
