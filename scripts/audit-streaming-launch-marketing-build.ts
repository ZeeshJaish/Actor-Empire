import assert from 'node:assert/strict';
import type { OwnedStreamingLaunchMarketingDraft } from '../types';
import { derive, type BuildInputs, type BuildSel } from '../components/streaming-transplant/StreamingBuildoutExperience';
import { forecastStreamingLaunchMarketing, type StreamingLaunchMarketingInput } from '../services/streamingLaunchMarketing';

const selection: BuildSel = {
  placements: [
    { cityId: 'LA', racks: 4, role: 'CORE_ORIGIN' },
    { cityId: 'TOR', racks: 3, role: 'REGIONAL_HUB' },
  ],
  arch: 'HYBRID', doctrine: 'STANDARD', campaign: 'NONE',
};
const inputs: BuildInputs = {
  absoluteWeek: 900,
  treasury: 500_000_000,
  catalogueSpend: 24_000_000,
  catalogueTitles: 18,
  originalsSpend: 40_000_000,
  originalsCount: 2,
  premiereTitle: 'Opening Night',
  regions: ['NORTH_AMERICA'],
  coverageRegions: ['NORTH_AMERICA'],
  hasExplicitOpeningMarkets: true,
  markets: [
    { id: 'US', country: 'United States', region: 'NORTH_AMERICA', audience: 225_000_000, annualGrowthPercent: 3, recommendedCityId: 'LA', localizationNote: 'English' },
    { id: 'CA', country: 'Canada', region: 'NORTH_AMERICA', audience: 29_000_000, annualGrowthPercent: 4, recommendedCityId: 'TOR', localizationNote: 'English and French' },
  ],
  homeCityId: 'LA',
  audienceMul: 4.5,
  openingDemandForecast: { low: 780_000, likely: 1_000_000, high: 1_320_000, byMarket: { US: 850_000, CA: 150_000 } },
};

const canonical = derive(selection, inputs);
const legacyNational = derive({ ...selection, campaign: 'NATIONAL' }, inputs);
assert.equal(canonical.campaignCost, 0, 'Build must not own a second marketing charge.');
assert.equal(legacyNational.campaignCost, 0, 'Legacy campaign IDs must not restore the retired multiplier or charge.');
assert.equal(canonical.demandTotal('LIKELY'), 1_000_000);
assert.equal(legacyNational.demandTotal('LIKELY'), 1_000_000, 'Marketing-adjusted demand must be consumed exactly once.');
assert.equal(canonical.demandTotal('QUIET'), 780_000);
assert.equal(canonical.demandTotal('SURGE'), 1_320_000);

const marketingInput: StreamingLaunchMarketingInput = {
  platformKey: 'build-adapter-audit', absoluteWeek: 900, buildWeeks: 6,
  availableTreasury: 500_000_000, protectedOperatingCash: 10_000_000,
  hasSellablePlan: true, hasFlagshipOriginal: true,
  pricingRevision: 1, catalogueRevision: 1, localizationRevision: 1, competitionRevision: 1,
  countries: [
    { countryId: 'US', countryName: 'United States', reachableHouseholds: 90_000_000,
      baseConcurrentStreams: 850_000, conversionHeadroom: .6, mediaCostIndex: 1.25,
      purchasingPowerIndex: 1.1, consumerConfidence: .7, internetAccess: .95,
      localizationCoverage: 1, catalogueCoverage: .9, competitionPressure: .8, priorAwareness: .08 },
    { countryId: 'CA', countryName: 'Canada', reachableHouseholds: 14_000_000,
      baseConcurrentStreams: 150_000, conversionHeadroom: .7, mediaCostIndex: 1,
      purchasingPowerIndex: 1.05, consumerConfidence: .75, internetAccess: .96,
      localizationCoverage: .9, catalogueCoverage: .85, competitionPressure: .65, priorAwareness: .05 },
  ],
};
const marketingDraft: OwnedStreamingLaunchMarketingDraft = {
  schemaVersion: 1, objective: 'PLATFORM_INTRODUCTION', timeline: 'BALANCED',
  budgetCeiling: 10_000_000, allocationMode: 'AUTO', countryWeights: {},
  channelAllocations: { SOCIAL_DIGITAL: .5, CREATORS: .5 },
  updatedAtAbsoluteWeek: 900, revision: 1,
};
const marketingForecast = forecastStreamingLaunchMarketing(marketingInput, marketingDraft);
const rehearsalInputs: BuildInputs = {
  ...inputs,
  openingDemandForecast: {
    low: marketingForecast.concurrentStreams.low,
    likely: marketingForecast.concurrentStreams.likely,
    high: marketingForecast.concurrentStreams.high,
    byMarket: Object.fromEntries(marketingForecast.countryForecasts.map(country => [country.countryId, country.likelyConcurrentStreams])),
  },
};
const marketedBuild = derive(selection, rehearsalInputs);
assert.equal(marketedBuild.demandTotal('LIKELY'), marketingForecast.concurrentStreams.likely,
  'Build rehearsal consumes the same total as the marketing forecast');
assert.equal(Object.values(rehearsalInputs.openingDemandForecast!.byMarket).reduce((sum, count) => sum + count, 0), marketingForecast.concurrentStreams.likely,
  'marketing country forecasts reconcile with the Build rehearsal demand total');
assert.ok(marketedBuild.demandTotal('LIKELY') > canonical.demandTotal('LIKELY'),
  'a funded campaign raises opening load without a second Build campaign multiplier');

console.log('Streaming launch marketing Build adapter audit passed.');
