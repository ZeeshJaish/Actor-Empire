import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialOwnedStreamingPlatformState, type OwnedStreamingLaunchCommit } from '../types';
import StreamingLaunchReceipt from '../components/StreamingLaunchReceipt';
import { normalizeStreamingPricingConfiguration } from '../services/streamingPricingEconomy';
import { configureStreamingPricingOffer, summarizeStreamingBuildPricing } from '../services/streamingCommercialOffers';
import { createC6QaCareer } from '../lab/c6QaCareer';
import { summarizeBlueprintOffer } from '../components/studio-finance/components/launch/StepBlueprint';
import { forecastWorldStreamingBuildDemand, forecastWorldStreamingLaunchPricing } from '../services/worldEconomy/worldStreamingPricingForecast';

// A QA career must enter the actual wizard before either its offer or its
// physical network is committed; otherwise a four-mode walkthrough skips the
// decisions it claims to test.
const unchosenCareer = createC6QaCareer('PRICING');
assert.equal(unchosenCareer.ownedStreamingPlatform.serviceConfiguration.pricingApproach, null);
assert.equal(unchosenCareer.ownedStreamingPlatform.serviceConfiguration.pricing.commercialOffers?.coreModelSelected, false);
assert.equal(unchosenCareer.ownedStreamingPlatform.infrastructureSetup, null);
assert.equal(unchosenCareer.ownedStreamingPlatform.launchProgram.blueprintSavedAtAbsoluteWeek, null);

const startingPricing = createInitialOwnedStreamingPlatformState('p6-build-label').serviceConfiguration.pricing;
const subscriptionPricing = configureStreamingPricingOffer(startingPricing, { kind: 'CORE', coreModel: 'SUBSCRIPTION' });
assert.equal(summarizeStreamingBuildPricing(subscriptionPricing).label, 'Subscription',
  'three subscription tiers are one offer family, not two extra offers');
const hybridPricing = configureStreamingPricingOffer(
  configureStreamingPricingOffer(subscriptionPricing, { kind: 'TOGGLE', offer: 'ADS', enabled: true }),
  { kind: 'TOGGLE', offer: 'STORE', enabled: true },
);
assert.equal(summarizeStreamingBuildPricing(hybridPricing).label, 'Subscription + free ads + rent or buy');
const adOnlyPricing = configureStreamingPricingOffer(startingPricing, { kind: 'CORE', coreModel: 'ADVERTISING' });
const storeOnlyPricing = configureStreamingPricingOffer(startingPricing, { kind: 'CORE', coreModel: 'STORE' });
assert.equal(summarizeBlueprintOffer(adOnlyPricing).showPlanLadder, false,
  'the blueprint must not depict hidden subscription plans for an ad-only service');
assert.match(summarizeBlueprintOffer(adOnlyPricing).value, /Free with ads/);
assert.equal(summarizeBlueprintOffer(storeOnlyPricing).showPlanLadder, false,
  'the blueprint must not depict hidden subscription plans for a store-only service');
assert.match(summarizeBlueprintOffer(storeOnlyPricing).value, /Rent.*Buy/);
assert.equal(summarizeBlueprintOffer(subscriptionPricing).showPlanLadder, true);
assert.equal(summarizeBlueprintOffer(hybridPricing).showPlanLadder, true);
for (const [mode, pricing] of [['ad-only', adOnlyPricing], ['store-only', storeOnlyPricing]] as const) {
  const audience = forecastWorldStreamingLaunchPricing(unchosenCareer, pricing, ['US']);
  const demand = forecastWorldStreamingBuildDemand(unchosenCareer, pricing, ['US']);
  assert.ok(audience.freeAdHouseholds + audience.storeHouseholds > 0,
    `${mode} fixture needs a real free/store audience`);
  assert.ok(demand.forecastAccounts > 0 && demand.likely > 0 && demand.byMarket.US > 0,
    `${mode} viewers need opening-night build capacity even when paid subscribers are zero`);
}

const commit: OwnedStreamingLaunchCommit = {
  id: 'opening-1', idempotencyKey: 'opening-1', committedAtAbsoluteWeek: 2050,
  capacityPlan: 'STANDARD', capacityPlanCost: 0, readinessScore: 100,
  forecastLikelyConcurrentStreams: 14_000, forecastHighConcurrentStreams: 20_000,
  protectedPeakConcurrentStreams: 2_040_000, launchHeadroomPercent: 99,
  initialSubscribers: 34_500, openingDemandIndex: 60, playbackSuccessRate: 99.99,
  outcomeTier: 'SMOOTH_OPENING', openingTitleCount: 3, openingOriginalTitle: 'Signal House',
};
const html = renderToStaticMarkup(React.createElement(StreamingLaunchReceipt, {
  platformName: 'C6 Test+', commit, onOpen: () => undefined, onBack: () => undefined,
}));
assert.match(html, /Saved opening night record/);
assert.match(html, /C6 Test\+ is live/);
assert.match(html, /34,500/);
assert.match(html, /99\.99%/);
assert.match(html, /2,040,000/);
assert.doesNotMatch(html, /GO \/ NO-GO|GO LIVE|14,000|20,000/,
  'a committed launch must not display a fresh gate or invented actual peak');

const hq = readFileSync('components/StreamingPlatformHQ.tsx', 'utf8');
assert.match(hq, /platform\.launchCommit && !premiereStartedHere/,
  'reopened saves must branch to the saved receipt before the pre-launch cinematic');
assert.match(hq, /pendingLaunchReveal\.id/, 'the receipt must acknowledge the queued reveal');
const agreement = readFileSync('components/studio-finance/components/build/StageLaunch.tsx', 'utf8');
assert.match(agreement, /facility\.tenure === 'CLOUD'/);
assert.match(agreement, /providerOf\(facility\)\.name/);
assert.match(agreement, /computeRacks\(facility\)/);
assert.doesNotMatch(agreement, /room move-in|group\.moveIn/,
  'uncanonical listing subtotals cannot appear beside the actual execution charge');
const premiere = readFileSync('components/streaming-transplant/StreamingPremiereExperience.tsx', 'utf8');
assert.match(premiere, /<span>ACCOUNTS<\/span><b>\{conc\(result\.subsGained\)\}/,
  'opening-night cinematic counts all accounts, not only paid subscribers');
const buildMoney = readFileSync('components/studio-finance/components/build/StageMoney.tsx', 'utf8');
assert.match(buildMoney, /label: 'Ways to watch'/,
  'ad-only and store-only are offers, not subscription plans on sale');
const pricingUi = readFileSync('components/studio-finance/components/launch/StepPricing.tsx', 'utf8');
assert.match(pricingUi, /label="Rent a film"[^\n]*step=\{0\.01\}/,
  'the default $5.99 rental value must be a valid native slider step');
assert.match(pricingUi, /label="Own it"[^\n]*step=\{0\.01\}/,
  'the default $19.99 purchase value must be a valid native slider step');

const initialPricing = createInitialOwnedStreamingPlatformState('pricing-p6').serviceConfiguration.pricing;
const normalizedAdPlan = normalizeStreamingPricingConfiguration({
  ...initialPricing,
  streams: ['subs', 'ads'],
  plans: [{ ...initialPricing.plans[0], featureIds: ['hd', 'streams2', 'noads'], ads: true }],
}).plans[0];
assert.deepEqual(normalizedAdPlan.featureIds, ['hd', 'streams2'],
  'ads remove the incompatible no-ads perk, not picture quality or simultaneous streams');

console.log('PASS pricing P6: saved launch receipt, commissioning presentation, ad-plan features');
