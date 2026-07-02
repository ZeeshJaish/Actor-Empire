import {
  calculateCampaignFit,
  calculateCampaignForecast,
  normalizeMarketingChannelAllocations
} from '../services/marketingStrategy';
import type { ProjectDetails } from '../types';

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const project: ProjectDetails = {
  title: 'Timeline Audit',
  type: 'MOVIE',
  description: 'Audit project',
  studioId: 'ARTISAN_PICTURES',
  subtype: 'STANDALONE',
  genre: 'DRAMA',
  budgetTier: 'MID',
  estimatedBudget: 36_000_000,
  visibleHype: 'MID',
  directorName: 'Audit Director',
  visibleDirectorTier: 'Known',
  visibleScriptBuzz: 'High',
  visibleCastStrength: 'Medium',
  hiddenStats: {
    scriptQuality: 84,
    directorQuality: 78,
    castingStrength: 62,
    distributionPower: 52,
    rawHype: 54,
    qualityScore: 82,
    prestigeBonus: 12,
    fameMultiplier: 1.7
  }
};

const mix = normalizeMarketingChannelAllocations({
  TRAILER_LAUNCH: 4_000_000,
  SOCIAL_DIGITAL: 5_000_000,
  CRITIC_SCREENINGS: 3_000_000,
  RED_CARPET: 2_000_000
}, 14_000_000);
const fit = calculateCampaignFit(project, 'PRESTIGE_PUSH', mix.totalSpent);

const balanced = calculateCampaignForecast(project, 'PRESTIGE_PUSH', mix.allocations, fit, 'BALANCED_ROLLOUT');
const frontLoaded = calculateCampaignForecast(project, 'PRESTIGE_PUSH', mix.allocations, fit, 'FRONT_LOADED_OPENING');
const slowBurn = calculateCampaignForecast(project, 'PRESTIGE_PUSH', mix.allocations, fit, 'SLOW_BURN_WOM');
const lastWeek = calculateCampaignForecast(project, 'PRESTIGE_PUSH', mix.allocations, fit, 'LAST_WEEK_BLITZ');

assert(frontLoaded.openingWeekendHigh > balanced.openingWeekendHigh, 'Front-loaded timeline should lift opening weekend.');
assert(frontLoaded.weekTwoDropRisk > balanced.weekTwoDropRisk, 'Front-loaded timeline should raise week-two drop risk.');
assert(slowBurn.openingWeekendHigh < balanced.openingWeekendHigh, 'Slow-burn timeline should soften opening weekend.');
assert(slowBurn.weekTwoDropRisk < balanced.weekTwoDropRisk, 'Slow-burn timeline should lower week-two drop risk.');
assert(slowBurn.totalRevenueHigh >= balanced.totalRevenueHigh, 'Strong word-of-mouth film should preserve or improve total upside on slow-burn.');
assert(lastWeek.weekTwoDropRisk > balanced.weekTwoDropRisk, 'Last-week blitz should raise volatility/drop risk.');
assert(lastWeek.confidenceLabel === 'Volatile Estimate' || lastWeek.weekTwoDropRisk >= frontLoaded.weekTwoDropRisk, 'Last-week blitz should read as volatile.');
assert(slowBurn.timeline === 'SLOW_BURN_WOM', 'Forecast snapshot should preserve selected campaign timeline.');

console.log('Marketing timeline audit passed.');
