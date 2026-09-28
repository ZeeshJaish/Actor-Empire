import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as PricingControls from '../components/studio-finance/components/launch/StepPricing';
import { createInitialOwnedStreamingPlatformState } from '../types';
import { configureStreamingPricingOffer } from '../services/streamingCommercialOffers';
import { LaunchWizard } from '../components/studio-finance/components/launch/LaunchWizard';
import type { LaunchData } from '../components/studio-finance/finance/launch';

// A long pointer gesture is one saved edit, even if the browser emits many input events.
const commits: number[] = [];
const createRangeDraft = (PricingControls as any).createRangeDraft;
assert.equal(typeof createRangeDraft, 'function', 'pricing needs a local range draft controller');
const range = createRangeDraft(15, (value: number) => commits.push(value));
range.change(20);
range.change(25);
range.change(30);
assert.deepEqual(commits, [], 'continuous dragging must not persist or forecast intermediate values');
assert.equal(range.value, 30, 'the handle and label preview the draft value immediately');
range.sync(15);
assert.equal(range.value, 30, 'an unrelated parent render cannot snap the handle back mid-gesture');
range.finish();
range.finish();
assert.deepEqual(commits, [30], 'pointer-up followed by blur commits only once');
range.sync(30);
range.change(35);
range.dispose();
assert.deepEqual(commits, [30, 35], 'navigation or unmount keeps the last uncommitted value');
const rapidCommits: number[] = [];
const rapid = createRangeDraft(15, (value: number) => rapidCommits.push(value));
rapid.change(30);
rapid.finish();
rapid.change(15);
rapid.finish();
assert.deepEqual(rapidCommits, [30, 15], 'a second gesture can return to the old value before React acknowledges the first');

const pricing = configureStreamingPricingOffer(createInitialOwnedStreamingPlatformState('pricing-p3').serviceConfiguration.pricing,
  { kind: 'CORE', coreModel: 'SUBSCRIPTION' });
const html = renderToStaticMarkup(React.createElement(PricingControls.StepPricing, {
  data: { pricing, market: { rivalAveragePrice: 12, reachRate: .03 }, capabilityLocks: {}, blockers: [
    { id: 'catalogue', step: 'catalogue', text: 'Opening catalogue needs a playable title.', severity: 'block' },
  ] },
  draft: { pricing }, chosen: [], patch: () => undefined, handlers: {},
} as any));
assert.match(html, /Opening audience/);
assert.match(html, /Potential gross/);
assert.match(html, /Opening catalogue needs a playable title\./,
  'a compact forecast must not hide an opening readiness failure');
assert.match(html, /Revenue breakdown/);
assert.doesNotMatch(html, /\$0<\/strong>/,
  'an unavailable world forecast is unknown, not a zero-dollar projection');
const updatingHtml = renderToStaticMarkup(React.createElement(PricingControls.StepPricing, {
  data: { pricing, market: { rivalAveragePrice: 12, reachRate: .03 }, capabilityLocks: {}, blockers: [] },
  draft: { pricing }, chosen: [], patch: () => undefined, handlers: {},
  pricingPreview: { forecast: null, worldForecast: null, updating: true },
} as any));
assert.match(updatingHtml, /Updating forecast/);
assert.doesNotMatch(updatingHtml, /\$0<\/strong>/,
  'an in-flight revision cannot display the previous amount as a current zero');
const wizardData = {
  company: { name: 'P3 fixture', week: 2 },
  treasury: { available: 1_000_000, founderContributed: 1_000_000, planned: 0, committed: 0, paid: 0 },
  energy: { current: 100, max: 100 }, capitalRoutes: [], regions: [], countries: [],
  selectedCountryIds: [], clearance: [], identSounds: [], identPackages: [],
  ident: { commissioned: false, committedCost: 0, purchasedPackageIds: [] },
  storefronts: [], storefrontTitles: [], pricingApproaches: [], pricing,
  market: { rivalAveragePrice: 12, reachRate: .03 }, offer: { saved: false },
  catalogue: { titles: 0, hours: 0, hoursNeeded: 1 },
  forecast: { audience: 0, peakConcurrent: 0, bandwidthGbps: 0, edgeSites: 0 },
  blockers: [], blueprintSaved: false, capabilityLocks: {},
} as unknown as LaunchData;
const emptyWorld = {
  reachableHouseholds: 0, subscribers: 0, monthlySubscribers: 0, annualSubscribers: 0,
  monthlySubscriptionRevenue: 0, freeAdHouseholds: 0, storeHouseholds: 0,
  estimatedWeeklyAdRevenueIfPlayable: 0, estimatedWeeklyPassRevenueIfPlayable: 0,
  estimatedWeeklyRentalRevenueIfPlayable: 0, estimatedWeeklyPurchaseRevenueIfPlayable: 0,
  estimatedWeeklyPassBuyersIfPlayable: 0, estimatedWeeklyRentalBuyersIfPlayable: 0,
  estimatedWeeklyPurchaseBuyersIfPlayable: 0, adAvailableImpressions: 0, adFilledImpressions: 0,
  adFillRate: null, adRealizedCpm: null, firstYearSubscriptionRevenue: 0,
  planAllocations: [], activeRivalCount: 0, rivalMedianEntryPrice: 12, countries: [],
};
let worldCalls = 0;
renderToStaticMarkup(React.createElement(LaunchWizard, {
  data: wizardData, initialStep: 'pricing',
  onForecastPricing: () => { worldCalls += 1; return emptyWorld; },
}));
assert.equal(worldCalls, 1, 'the pricing page and footer must consume one shared world forecast');
console.log('PASS pricing P3: one gesture commit, unmount flush, compact forecast and readiness');
