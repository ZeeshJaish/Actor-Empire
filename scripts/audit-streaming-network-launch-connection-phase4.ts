import { readFileSync } from 'node:fs';
import { getSuggestedStreamingNetworkPlacements } from '../services/streamingInfrastructure';
import {
  derive,
  recommendedMarketPlacements,
  type BuildInputs,
  type BuildSel,
} from '../components/streaming-transplant/StreamingBuildoutExperience';
import { getStreamingDayOneMarket } from '../services/streamingDayOneMarkets';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const marketIds = ['US', 'IN', 'GB'];
const markets = marketIds.flatMap(id => {
  const market = getStreamingDayOneMarket(id);
  return market ? [{
    id: market.id,
    country: market.country,
    region: market.regionId,
    audience: market.streamingAudience,
    annualGrowthPercent: market.annualGrowthPercent,
    recommendedCityId: market.recommendedCityId,
    localizationNote: market.localizationNote,
  }] : [];
});
const suggested = getSuggestedStreamingNetworkPlacements(marketIds, 1);
const repeated = getSuggestedStreamingNetworkPlacements(marketIds, 1);
assert(JSON.stringify(suggested) === JSON.stringify(repeated), 'Market topology must be deterministic.');
assert(suggested.length > 1, 'A multi-region opening should be able to recommend multiple data centres.');
assert(suggested.filter(node => node.role === 'CORE_ORIGIN').length === 1, 'A recommendation must contain one core origin.');
assert(suggested.some(node => node.role === 'REGIONAL_HUB'), 'A multi-region recommendation should include a regional hub.');

const inputs: BuildInputs = {
  treasury: 200_000_000,
  catalogueSpend: 0,
  catalogueTitles: 0,
  originalsSpend: 0,
  originalsCount: 0,
  premiereTitle: 'Opening Signal',
  regions: ['NORTH_AMERICA', 'ASIA', 'EUROPE'],
  coverageRegions: ['NORTH_AMERICA', 'ASIA', 'EUROPE'],
  markets,
  recommendedPlacements: suggested,
  homeCityId: null,
  audienceMul: 1,
};
const recommended = recommendedMarketPlacements(inputs);
assert(JSON.stringify(recommended) === JSON.stringify(suggested), 'The visual Build room must consume the canonical recommendation.');
const selection: BuildSel = { placements: recommended, arch: 'HYBRID', doctrine: 'STANDARD', campaign: 'NONE' };
const derived = derive(selection, inputs);
assert(derived.countryService.length === markets.length, 'Every selected country must receive its own service forecast.');
assert(derived.countryService.every(row => row.cityId), 'Every country should identify the serving network city.');
assert(derived.countryService.every(row => row.demand > 0), 'Country forecasts must derive real opening demand.');
assert(derived.demandTotal('QUIET') < derived.demandTotal('LIKELY'), 'Quiet demand must remain below likely demand.');
assert(derived.demandTotal('LIKELY') < derived.demandTotal('SURGE'), 'Likely demand must remain below surge demand.');

const buildSource = readFileSync('components/streaming-transplant/StreamingBuildoutExperience.tsx', 'utf8');
const hqSource = readFileSync('components/StreamingPlatformHQ.tsx', 'utf8');
[
  'COUNTRY SERVICE FORECAST',
  'REPAIR THE PLAN',
  'FOUNDER OVERRIDE AVAILABLE',
  'BUILD IT ANYWAY',
].forEach(marker => assert(buildSource.includes(marker), `Missing Phase 4 player-facing contract: ${marker}`));

/**
 * The Phase 4 contract is that the opening network derived from the player's
 * Day-One markets is offered to them, and that accepting it applies the derived
 * facilities rather than some second projection.
 *
 * This used to be asserted by pinning the eyebrow copy
 * "OPENING NETWORK · FOUNDATION 1 OF 3". The Build redesign demoted that card to
 * a single suggestion line, so the copy changed while the contract did not.
 * Asserting on the mechanism as well as the wording makes this survive the next
 * copy edit, which a bare string never could.
 */
assert(
  buildSource.includes('Your team suggests'),
  'The recommended opening network must still be offered to the player.',
);
assert(
  buildSource.includes('recommendedMarketPlacements')
  && buildSource.includes('selectionWithFacilities(sel, recommendationFacilities)'),
  'Accepting the recommendation must apply the facilities derived from Day-One markets.',
);
assert(!hqSource.includes("import StreamingInfrastructureSetup from './StreamingInfrastructureSetup'"), 'HQ must not expose a second infrastructure configurator.');
assert(!hqSource.includes('setShowInfrastructureSetup'), 'All server decisions must route through Network Build.');
assert(hqSource.includes('openingDemandForecast'), 'Commissioning must persist the exact rehearsal demand range.');
const infrastructureSource = readFileSync('services/streamingInfrastructure.ts', 'utf8');
assert(infrastructureSource.includes("label: rehearsalDemand ? 'Day-One market demand'"), 'The canonical load test must consume the Day-One rehearsal range.');
assert(!buildSource.includes('Math.random'), 'Opening-night rehearsal must not use uncontrolled randomness.');

console.log('Streaming Network and Launch Rehearsal Connection audit passed.');
