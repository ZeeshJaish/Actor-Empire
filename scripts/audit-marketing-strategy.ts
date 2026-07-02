import { calculateCampaignFit } from '../services/marketingStrategy';
import type { ProjectDetails } from '../types';

const assert = (condition: boolean, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const makeProject = (overrides: Partial<ProjectDetails>): ProjectDetails => {
  const hiddenStats = {
    scriptQuality: 40,
    directorQuality: 40,
    castingStrength: 35,
    distributionPower: 20,
    rawHype: 20,
    qualityScore: 35,
    prestigeBonus: 0,
    fameMultiplier: 1,
    ...(overrides.hiddenStats || {})
  };

  return {
    title: 'Audit Picture',
    type: 'MOVIE',
    description: 'Audit project',
    studioId: 'ARTISAN_PICTURES',
    subtype: 'STANDALONE',
    genre: 'DRAMA',
    budgetTier: 'LOW',
    estimatedBudget: 10_000_000,
    visibleHype: 'LOW',
    directorName: 'Audit Director',
    visibleDirectorTier: 'Indie',
    visibleScriptBuzz: 'Low',
    visibleCastStrength: 'Unknown',
    ...overrides,
    hiddenStats
  };
};

const weakOvermarketed = makeProject({
  estimatedBudget: 10_000_000,
  reservedMarketingBudget: 1_000_000_000,
  genre: 'DRAMA',
  hiddenStats: {
    scriptQuality: 32,
    directorQuality: 38,
    castingStrength: 28,
    distributionPower: 20,
    rawHype: 18,
    qualityScore: 31,
    prestigeBonus: 0,
    fameMultiplier: 1
  }
});

const weakMassEvent = calculateCampaignFit(weakOvermarketed, 'MASS_EVENT', 1_000_000_000);
assert(weakMassEvent.fitScore < 45, `Weak overmarketed movie should have low fit, got ${weakMassEvent.fitScore}`);
assert(weakMassEvent.falseMarketingRisk === 'SEVERE', `Weak overmarketed movie should be severe false-marketing risk, got ${weakMassEvent.falseMarketingRisk}`);
assert(weakMassEvent.overspendRisk === 'SEVERE', `Weak overmarketed movie should be severe overspend risk, got ${weakMassEvent.overspendRisk}`);
assert(weakMassEvent.recommendedSpendCap < 80_000_000, `Weak movie support cap should stay grounded, got ${weakMassEvent.recommendedSpendCap}`);

const strongFranchise = makeProject({
  estimatedBudget: 180_000_000,
  reservedMarketingBudget: 90_000_000,
  genre: 'SUPERHERO',
  subtype: 'UNIVERSE_EVENT',
  franchiseId: 'AUDIT_FRANCHISE',
  universeId: 'AUDIT_UNIVERSE',
  hiddenStats: {
    scriptQuality: 82,
    directorQuality: 80,
    castingStrength: 90,
    distributionPower: 75,
    rawHype: 88,
    qualityScore: 84,
    prestigeBonus: 8,
    fameMultiplier: 6
  }
});

const strongMassEvent = calculateCampaignFit(strongFranchise, 'MASS_EVENT', 90_000_000);
assert(strongMassEvent.fitScore >= 70, `Strong franchise should support mass-event marketing, got ${strongMassEvent.fitScore}`);
assert(strongMassEvent.falseMarketingRisk !== 'SEVERE', `Strong franchise should not be severe false-marketing risk, got ${strongMassEvent.falseMarketingRisk}`);
assert(strongMassEvent.audienceMatch >= 70, `Strong franchise should have audience match, got ${strongMassEvent.audienceMatch}`);

const weakPrestige = calculateCampaignFit(weakOvermarketed, 'PRESTIGE_PUSH', 70_000_000);
assert(['HIGH', 'SEVERE'].includes(weakPrestige.falseMarketingRisk), `Weak prestige push should flag false marketing, got ${weakPrestige.falseMarketingRisk}`);
assert(weakPrestige.criticMatch < 55, `Weak prestige push should not fake critic match, got ${weakPrestige.criticMatch}`);

const hiddenGem = makeProject({
  estimatedBudget: 18_000_000,
  reservedMarketingBudget: 5_000_000,
  genre: 'DRAMA',
  hiddenStats: {
    scriptQuality: 88,
    directorQuality: 84,
    castingStrength: 58,
    distributionPower: 42,
    rawHype: 28,
    qualityScore: 86,
    prestigeBonus: 18,
    fameMultiplier: 1.4
  }
});

const sleeperFit = calculateCampaignFit(hiddenGem, 'SLEEPER_BUILD', 5_000_000);
const massFit = calculateCampaignFit(hiddenGem, 'MASS_EVENT', 50_000_000);
assert(sleeperFit.fitScore > massFit.fitScore, `Hidden gem should fit sleeper build better than mass event (${sleeperFit.fitScore} <= ${massFit.fitScore})`);
assert(sleeperFit.falseMarketingRisk !== 'SEVERE', `High-quality sleeper should not be severe false marketing, got ${sleeperFit.falseMarketingRisk}`);

console.log('Marketing strategy audit passed.');
