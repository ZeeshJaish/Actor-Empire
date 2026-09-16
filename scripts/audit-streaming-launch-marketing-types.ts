import assert from 'node:assert/strict';
import { createInitialOwnedStreamingPlatformState } from '../types';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';

const fresh = createInitialOwnedStreamingPlatformState('marketing-types');
assert.equal(fresh.launchMarketingDraft?.objective, 'PLATFORM_INTRODUCTION');
assert.equal(fresh.launchMarketingDraft?.timeline, 'BALANCED');
assert.equal(fresh.launchMarketingDraft?.budgetCeiling, 0);
assert.equal(fresh.launchMarketingDraft?.allocationMode, 'AUTO');
assert.equal(fresh.launchMarketingPlan, null);

const malformed = normalizeOwnedStreamingPlatformState({
  ...fresh,
  launchMarketingDraft: {
    schemaVersion: 999,
    objective: 'INVALID',
    timeline: 'INVALID',
    budgetCeiling: Number.POSITIVE_INFINITY,
    allocationMode: 'INVALID',
    countryWeights: { US: 2, CA: -4, bad: Number.NaN },
    channelAllocations: { SOCIAL_DIGITAL: 0.6, BAD_CHANNEL: 10 },
    updatedAtAbsoluteWeek: -9,
    revision: -2,
  },
}, 'marketing-types');
assert.equal(malformed.launchMarketingDraft?.schemaVersion, 1);
assert.equal(malformed.launchMarketingDraft?.objective, 'PLATFORM_INTRODUCTION');
assert.equal(malformed.launchMarketingDraft?.timeline, 'BALANCED');
assert.equal(malformed.launchMarketingDraft?.budgetCeiling, 0);
assert.deepEqual(malformed.launchMarketingDraft?.countryWeights, { US: 2 });
assert.deepEqual(malformed.launchMarketingDraft?.channelAllocations, { SOCIAL_DIGITAL: 0.6 });

const migrate = (campaign: 'NONE' | 'REGIONAL' | 'NATIONAL') => normalizeOwnedStreamingPlatformState({
  ...fresh,
  launchMarketingDraft: undefined,
  infrastructureSetupDraft: {
    architecture: 'HYBRID',
    doctrine: 'STANDARD',
    campaign,
  },
}, `legacy-${campaign}`);

assert.equal(migrate('NONE').launchMarketingDraft?.budgetCeiling, 0);
assert.equal(migrate('REGIONAL').launchMarketingDraft?.budgetCeiling, 1_800_000);
assert.equal(migrate('REGIONAL').launchMarketingDraft?.timeline, 'BALANCED');
assert.equal(migrate('NATIONAL').launchMarketingDraft?.budgetCeiling, 4_600_000);
assert.equal(migrate('NATIONAL').launchMarketingDraft?.timeline, 'LAST_WEEK_PUSH');
assert.equal('multiplier' in (migrate('NATIONAL').launchMarketingDraft as unknown as object), false);

const legacyPlan = normalizeOwnedStreamingPlatformState({
  ...fresh,
  launchMarketingPlan: {
    ...fresh.launchMarketingDraft,
    id: 'legacy-plan',
    idempotencyKey: 'legacy-plan-key',
    status: 'RESERVED',
    openingCountryIds: ['US'],
    committedAtAbsoluteWeek: 100,
    startsAtAbsoluteWeek: 101,
    endsAtAbsoluteWeek: 106,
    spentAmount: 0,
    returnedAmount: 0,
    lastProcessedAbsoluteWeek: null,
    countryAwareness: {},
    forecastSnapshot: {
      id: 'legacy-forecast', version: 1, signature: 'legacy-signature', effectiveBudget: 5_000_000,
      organicAwareness: .05, likelyAwarenessLift: .15,
      acquiredAccounts: { low: 100, likely: 150, high: 200 },
      concurrentStreams: { low: 1_000, likely: 1_500, high: 2_000 },
      customerAcquisitionCost: 33_333, confidence: 'HIGH', warnings: [],
      countryForecasts: [{
        countryId: 'US', countryName: 'United States', allocatedAmount: 5_000_000,
        organicAwareness: .05, likelyAwarenessLift: .15, likelyAcquiredAccounts: 150,
        likelyConcurrentStreams: 1_500, customerAcquisitionCost: 33_333, confidence: 'HIGH',
      }],
    },
  },
}, 'legacy-confidence');
assert.equal(legacyPlan.launchMarketingPlan?.forecastSnapshot.confidenceScore, 85, 'Legacy confidence labels must receive a compatible numeric score.');
assert.equal(legacyPlan.launchMarketingPlan?.forecastSnapshot.countryForecasts[0]?.confidenceScore, 85);

console.log('Streaming launch marketing type and migration audit passed.');
