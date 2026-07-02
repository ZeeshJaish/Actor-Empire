import { evaluatePostReleaseReality } from '../services/marketingReality';
import type { ActiveRelease } from '../types';

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const makeRelease = (overrides: Partial<ActiveRelease> = {}): ActiveRelease => {
  const projectDetails: ActiveRelease['projectDetails'] = {
    title: 'Reality Audit',
    type: 'MOVIE',
    description: 'Audit release',
    studioId: 'ARTISAN_PICTURES',
    subtype: 'STANDALONE',
    genre: 'DRAMA',
    budgetTier: 'MID',
    estimatedBudget: 40_000_000,
    visibleHype: 'MID',
    directorName: 'Audit Director',
    visibleDirectorTier: 'Known',
    visibleScriptBuzz: 'High',
    visibleCastStrength: 'Medium',
    campaignPositioning: 'PRESTIGE_PUSH',
    campaignTimeline: 'BALANCED_ROLLOUT',
    marketingBudgetSpent: 10_000_000,
    campaignFitSnapshot: {
      positioning: 'PRESTIGE_PUSH',
      fitScore: 78,
      falseMarketingRisk: 'LOW',
      overspendRisk: 'LOW',
      audienceMatch: 72,
      criticMatch: 84,
      recommendedSpendCap: 18_000_000,
      warning: 'Campaign position fits.',
      strengths: ['Critic-facing story is credible'],
      risks: []
    },
    campaignForecastSnapshot: {
      timeline: 'BALANCED_ROLLOUT',
      openingWeekendLow: 22_000_000,
      openingWeekendHigh: 34_000_000,
      totalRevenueLow: 90_000_000,
      totalRevenueHigh: 140_000_000,
      breakEvenChance: 76,
      weekTwoDropRisk: 28,
      streamingBidBoost: 18,
      awardsVisibility: 56,
      franchiseValueImpact: 4,
      confidenceLabel: 'Market Read'
    },
    hiddenStats: {
      scriptQuality: 84,
      directorQuality: 82,
      castingStrength: 62,
      distributionPower: 52,
      rawHype: 58,
      qualityScore: 84,
      prestigeBonus: 12,
      fameMultiplier: 1.5,
      campaignPromise: 'PRESTIGE_PUSH',
      campaignTimeline: 'BALANCED_ROLLOUT'
    }
  };

  return {
    id: 'release_reality_audit',
    name: 'Reality Audit',
    type: 'MOVIE',
    roleType: 'LEAD',
    distributionPhase: 'THEATRICAL',
    weekNum: 2,
    weeklyGross: [28_000_000],
    totalGross: 28_000_000,
    budget: 40_000_000,
    status: 'RUNNING',
    imdbRating: 7.6,
    productionPerformance: 78,
    ...overrides,
    projectDetails: {
      ...projectDetails,
      ...(overrides.projectDetails || {}),
      hiddenStats: {
        ...projectDetails.hiddenStats,
        ...(overrides.projectDetails?.hiddenStats || {})
      }
    }
  };
};

const delivered = evaluatePostReleaseReality(makeRelease(), 12, 35);
assert(delivered.outcome === 'CAMPAIGN_DELIVERED', `Expected delivered verdict, got ${delivered.outcome}`);
assert(!delivered.shouldCreatePopup, 'Normal reality checks must not create popup events.');
assert(delivered.review.text.includes('campaign promise'), 'Reality check should add an IMDb review note about the campaign promise.');

const overhypedRelease = makeRelease();
overhypedRelease.imdbRating = 4.4;
overhypedRelease.weeklyGross = [9_000_000];
overhypedRelease.totalGross = 9_000_000;
overhypedRelease.projectDetails.campaignPositioning = 'MASS_EVENT';
overhypedRelease.projectDetails.campaignTimeline = 'FRONT_LOADED_OPENING';
overhypedRelease.projectDetails.marketingBudgetSpent = 85_000_000;
overhypedRelease.projectDetails.campaignFitSnapshot = {
  ...overhypedRelease.projectDetails.campaignFitSnapshot!,
  positioning: 'MASS_EVENT',
  fitScore: 31,
  falseMarketingRisk: 'SEVERE',
  overspendRisk: 'SEVERE',
  audienceMatch: 34,
  criticMatch: 28
};
overhypedRelease.projectDetails.hiddenStats.qualityScore = 34;
overhypedRelease.projectDetails.hiddenStats.scriptQuality = 36;
overhypedRelease.projectDetails.hiddenStats.rawHype = 28;
overhypedRelease.projectDetails.hiddenStats.campaignPromise = 'MASS_EVENT';
overhypedRelease.projectDetails.hiddenStats.campaignTimeline = 'FRONT_LOADED_OPENING';

const overhyped = evaluatePostReleaseReality(overhypedRelease, 12, 35);
assert(overhyped.outcome === 'OVERHYPED' || overhyped.outcome === 'EVENT_DROP_OFF', `Expected overhype/drop-off verdict, got ${overhyped.outcome}`);
assert(!!overhyped.newsItem, 'Major overhype should generate news.');
assert(!!overhyped.socialPost, 'Major overhype should generate social chatter.');
assert(!overhyped.shouldCreatePopup, 'Even major reality checks should not create routine popup events.');
assert(overhyped.reputationDelta < 0, 'Overhype should hurt reputation.');

const hiddenGemRelease = makeRelease();
hiddenGemRelease.imdbRating = 8.8;
hiddenGemRelease.weeklyGross = [12_000_000];
hiddenGemRelease.totalGross = 12_000_000;
hiddenGemRelease.projectDetails.campaignPositioning = 'SLEEPER_BUILD';
hiddenGemRelease.projectDetails.campaignTimeline = 'SLOW_BURN_WOM';
hiddenGemRelease.projectDetails.marketingBudgetSpent = 1_200_000;
hiddenGemRelease.projectDetails.hiddenStats.qualityScore = 90;
hiddenGemRelease.projectDetails.hiddenStats.scriptQuality = 92;
hiddenGemRelease.projectDetails.hiddenStats.rawHype = 38;
hiddenGemRelease.projectDetails.hiddenStats.campaignPromise = 'SLEEPER_BUILD';
hiddenGemRelease.projectDetails.hiddenStats.campaignTimeline = 'SLOW_BURN_WOM';

const hiddenGem = evaluatePostReleaseReality(hiddenGemRelease, 12, 35);
assert(hiddenGem.outcome === 'WORD_OF_MOUTH_BREAKOUT' || hiddenGem.outcome === 'HIDDEN_GEM', `Expected hidden gem or WOM breakout, got ${hiddenGem.outcome}`);
assert(hiddenGem.buzzDelta > 0, 'Hidden gem should improve buzz.');

console.log('Marketing reality audit passed.');
