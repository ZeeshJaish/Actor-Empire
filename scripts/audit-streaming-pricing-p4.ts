import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as adMarket from '../services/worldEconomy/worldStreamingAdMarket';
import * as pricingEconomy from '../services/streamingPricingEconomy';
import * as pricingControls from '../components/studio-finance/components/launch/StepPricing';
import { createInitialOwnedStreamingPlatformState } from '../types';
import { normalizeStreamingCanonicalFoundation } from '../services/streamingCanonicalState';
import { projectStreamingCommercialOffers } from '../services/streamingCommercialOffers';

// A wrong frequency conversion changes both the offered breaks and live inventory.
const cadenceLoad = (pricingEconomy as any).adMinutesPerHourForInterval;
assert.equal(typeof cadenceLoad, 'function', 'P4 needs one canonical interval-to-ad-load conversion');
assert.equal(cadenceLoad(10), 3, 'a 30-second ad every 10 minutes is six spots and three ad minutes an hour');
assert.equal(cadenceLoad(5), 6, 'a five-minute cadence is twelve spots and six ad minutes');

// A per-platform budget resolver can mint money when the same country has several services.
const clearMarket = (adMarket as any).clearStreamingAdMarket;
assert.equal(typeof clearMarket, 'function', 'P4 needs one country-week clearing for all eligible services');
const one = { platformId: 'PLAYER', eligibleHours: 10_000, minutesPerHour: 3,
  audienceQualityIndex: 70, brandSafetyIndex: 75 };
const two = { ...one, platformId: 'RIVAL' };
const fixture = { countryId: 'US', absoluteWeek: 728, advertiserDemandBudget: 10_000,
  marketReferenceCpm: 18, suppliers: [one, two] };
const normal = clearMarket(fixture);
assert.deepEqual(normal, clearMarket({ ...fixture, suppliers: [two, one] }),
  'input order cannot decide which platform receives the country budget');
assert.deepEqual(normal.byPlatform.PLAYER, normal.byPlatform.RIVAL,
  'identical player and rival supply must clear under identical rules');
assert.ok(normal.totalRevenue > 0 && normal.totalRevenue <= fixture.advertiserDemandBudget,
  'the market can earn money but never spend more than its one country-week budget');
assert.equal(normal.totalRevenue, normal.byPlatform.PLAYER.revenue + normal.byPlatform.RIVAL.revenue);
assert.ok(normal.byPlatform.PLAYER.filledImpressions <= normal.byPlatform.PLAYER.availableImpressions);

const noDemand = clearMarket({ ...fixture, advertiserDemandBudget: 0 });
assert.equal(noDemand.totalRevenue, 0, 'no advertiser demand cannot produce ad receipts');
assert.equal(noDemand.byPlatform.PLAYER.filledImpressions, 0);
assert.equal(clearMarket({ ...fixture, suppliers: [{ ...one, eligibleHours: 0 }] }).totalRevenue, 0,
  'no delivered eligible viewing cannot produce ad receipts');
assert.equal(clearMarket({ ...fixture, suppliers: [{ ...one, minutesPerHour: 0 }] }).totalRevenue, 0,
  'zero ad load cannot produce ad receipts');
const scarce = clearMarket({ ...fixture, advertiserDemandBudget: 40, suppliers: [one, two] });
assert.ok(scarce.totalRevenue <= 40 && scarce.byPlatform.PLAYER.fillRate < normal.byPlatform.PLAYER.fillRate,
  'scarce demand lowers fill without minting cash');
const overloaded = clearMarket({ ...fixture, suppliers: [{ ...one, minutesPerHour: 30 }, two] });
assert.ok(overloaded.byPlatform.PLAYER.availableImpressions > normal.byPlatform.PLAYER.availableImpressions,
  'more ad breaks still create some inventory even after tolerance loss');
assert.ok(Object.values(overloaded.byPlatform).every((outcome: any) => Object.values(outcome)
  .filter(value => typeof value === 'number').every(value => Number.isFinite(value) && value >= 0)),
  'high load and multiple bidders cannot produce non-finite outcomes');
const otherCountry = clearMarket({ ...fixture, countryId: 'IN', advertiserDemandBudget: 400 });
assert.ok(otherCountry.totalRevenue <= 400 && otherCountry.totalRevenue !== normal.totalRevenue,
  'countries clear their own demand instead of inheriting another market budget');

const CadenceControl = (pricingControls as any).AdCadenceControl;
assert.equal(typeof CadenceControl, 'function', 'the ad card needs one market-driven cadence control');
const cadenceHtml = renderToStaticMarkup(createElement(CadenceControl, {
  minutesPerHour: 3, estimatedCpm: 14.5, estimatedFillRate: .6, onChange: () => undefined,
}));
assert.match(cadenceHtml, /Show an ad every/);
assert.match(cadenceHtml, /10 minutes/);
assert.match(cadenceHtml, /6 opportunities/);
assert.match(cadenceHtml, /3 ad min/);
assert.match(cadenceHtml, /Estimated CPM/);
assert.doesNotMatch(cadenceHtml, /Target CPM/);
const customHtml = renderToStaticMarkup(createElement(CadenceControl, {
  minutesPerHour: 4.25, estimatedCpm: null, estimatedFillRate: null, onChange: () => undefined,
}));
assert.match(customHtml, /Custom saved load/);
assert.match(customHtml, /4\.25 ad min/);
const zeroHtml = renderToStaticMarkup(createElement(CadenceControl, {
  minutesPerHour: 0, estimatedCpm: null, estimatedFillRate: null, onChange: () => undefined,
}));
assert.match(zeroHtml, /No ads/);
assert.doesNotMatch(zeroHtml, /Custom saved load/);

const oldPricing = createInitialOwnedStreamingPlatformState('p4-legacy').serviceConfiguration.pricing;
const migrated = normalizeStreamingCanonicalFoundation({ serviceConfiguration: { pricing: {
  ...oldPricing, streams: ['ads'], ads: { minutesPerHour: 4.25, cpm: 99 },
} } }).serviceConfiguration.pricing;
assert.equal(migrated.ads.minutesPerHour, 4.25, 'migration must retain a custom ad load exactly');
assert.equal(migrated.ads.cpm, 99, 'legacy CPM remains readable for the saved configuration');
const zeroMigrated = normalizeStreamingCanonicalFoundation({ serviceConfiguration: { pricing: {
  ...oldPricing, streams: ['ads'], ads: { minutesPerHour: 0, cpm: 1 },
} } }).serviceConfiguration.pricing;
assert.equal(zeroMigrated.ads.minutesPerHour, 0, 'migration keeps an explicit no-ads load');
assert.equal('targetCpm' in (projectStreamingCommercialOffers(migrated).freeAdOffer || {}), false,
  'new active offers must not expose a player target CPM');

console.log('P4 canonical cadence and shared finite advertiser clearing passed.');
