import assert from 'node:assert/strict';
import { derive, type BuildInputs, type BuildSel } from '../components/streaming-transplant/StreamingBuildoutExperience';

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

console.log('Streaming launch marketing Build adapter audit passed.');
