import {
  calculateCampaignFit,
  calculateCampaignForecast,
  normalizeMarketingChannelAllocations
} from '../services/marketingStrategy';
import type { ProjectDetails } from '../types';

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const makeProject = (overrides: Partial<ProjectDetails>): ProjectDetails => {
  const hiddenStats = {
    scriptQuality: 62,
    directorQuality: 62,
    castingStrength: 58,
    distributionPower: 45,
    rawHype: 48,
    qualityScore: 64,
    prestigeBonus: 8,
    fameMultiplier: 1.6,
    ...(overrides.hiddenStats || {})
  };

  return {
    title: 'Forecast Audit',
    type: 'MOVIE',
    description: 'Audit project',
    studioId: 'ARTISAN_PICTURES',
    subtype: 'STANDALONE',
    genre: 'DRAMA',
    budgetTier: 'MID',
    estimatedBudget: 30_000_000,
    visibleHype: 'MID',
    directorName: 'Audit Director',
    visibleDirectorTier: 'Known',
    visibleScriptBuzz: 'Medium',
    visibleCastStrength: 'Medium',
    ...overrides,
    hiddenStats
  };
};

const strongFranchise = makeProject({
  genre: 'SUPERHERO',
  subtype: 'UNIVERSE_EVENT',
  estimatedBudget: 160_000_000,
  reservedMarketingBudget: 75_000_000,
  franchiseId: 'franchise_forecast',
  universeId: 'universe_forecast',
  hiddenStats: {
    scriptQuality: 82,
    directorQuality: 78,
    castingStrength: 90,
    distributionPower: 78,
    rawHype: 88,
    qualityScore: 84,
    prestigeBonus: 8,
    fameMultiplier: 6
  }
});

const strongMix = normalizeMarketingChannelAllocations({
  TRAILER_LAUNCH: 16_000_000,
  SOCIAL_DIGITAL: 15_000_000,
  TV_OUTDOOR: 22_000_000,
  INTERNATIONAL: 14_000_000,
  FAN_EVENTS: 8_000_000
}, 75_000_000);
const strongFit = calculateCampaignFit(strongFranchise, 'MASS_EVENT', strongMix.totalSpent);
const strongForecast = calculateCampaignForecast(strongFranchise, 'MASS_EVENT', strongMix.allocations, strongFit);

assert(strongForecast.openingWeekendLow > 0, 'Opening weekend low should be positive.');
assert(strongForecast.openingWeekendHigh > strongForecast.openingWeekendLow, 'Opening weekend range should have a high above low.');
assert(strongForecast.totalRevenueHigh > strongForecast.totalRevenueLow, 'Total revenue range should have a high above low.');
assert(strongForecast.breakEvenChance >= 55, `Strong franchise should have a useful break-even estimate, got ${strongForecast.breakEvenChance}`);
assert(strongForecast.streamingBidBoost >= 8, `Strong franchise should forecast streaming bid boost, got ${strongForecast.streamingBidBoost}`);
assert(strongForecast.franchiseValueImpact >= 5, `Strong franchise should forecast franchise value impact, got ${strongForecast.franchiseValueImpact}`);

const weakOvermarketed = makeProject({
  genre: 'DRAMA',
  estimatedBudget: 12_000_000,
  reservedMarketingBudget: 90_000_000,
  hiddenStats: {
    scriptQuality: 34,
    directorQuality: 42,
    castingStrength: 30,
    distributionPower: 30,
    rawHype: 24,
    qualityScore: 33,
    prestigeBonus: 0,
    fameMultiplier: 1
  }
});

const weakMix = normalizeMarketingChannelAllocations({
  TV_OUTDOOR: 40_000_000,
  SOCIAL_DIGITAL: 30_000_000,
  RED_CARPET: 20_000_000
}, 90_000_000);
const weakFit = calculateCampaignFit(weakOvermarketed, 'PRESTIGE_PUSH', weakMix.totalSpent);
const weakForecast = calculateCampaignForecast(weakOvermarketed, 'PRESTIGE_PUSH', weakMix.allocations, weakFit);

assert(weakForecast.weekTwoDropRisk >= 65, `Weak overmarketed project should forecast week-two danger, got ${weakForecast.weekTwoDropRisk}`);
assert(weakForecast.breakEvenChance < strongForecast.breakEvenChance, 'Weak overmarketed forecast should have lower break-even chance than strong franchise.');
assert(['Early Estimate', 'Volatile Estimate', 'Market Read'].includes(weakForecast.confidenceLabel), `Unexpected confidence label ${weakForecast.confidenceLabel}`);

console.log('Marketing forecast audit passed.');
