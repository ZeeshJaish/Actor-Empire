import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createLabBuildData, createLabDraft } from '../lab/buildLabData';
import { buildTotals, serviceForecast } from '../components/studio-finance/finance/build';
import { RegionBoard } from '../components/studio-finance/components/build/RegionBoard';
import { createRangeDraft } from '../components/studio-finance/components/launch/rangeDraft';
import { createCloudDragScheduler } from '../components/studio-finance/components/build/cloudDrag';
import { previewMonthlyAtCurrentAudience } from '../components/studio-finance/finance/launch';
import { regionsOf, serverCeilingOf, placeRegion, emptySetup, cloudCeilingOf } from '../components/studio-finance/finance/placer';

const data = createLabBuildData(['US']);
const draft = createLabDraft();
const html = renderToStaticMarkup(React.createElement(RegionBoard, {
  data, draft, patch: () => undefined, totals: buildTotals(data, draft),
  services: serviceForecast(data, draft),
} as any));

assert.match(html, /viewers per rack/i,
  'server comparison must explain its capability as concurrent viewing capacity');
assert.doesNotMatch(html, /bw-rg-tier-reach[^>]*>[^<]*km/i,
  'kilometres must not be the server-card headline capability');
assert.equal((html.match(/data-cloud-provider-card=/g) || []).length, 3,
  'the cloud comparison must remain three clear provider choices');
assert.match(html, /data-cloud-provider-detail=/,
  'the chosen provider must retain a readable detail panel below compact choices');
assert.match(html, /only entered markets count toward viewers and revenue/i,
  'the green footprint must not imply customers or receipts from unopened countries');

const cloudRegion = regionsOf(data).find(region => region.opening.length > 0)!;
const preservedCompute = cloudCeilingOf(data, cloudRegion, 'MERIDIAN') * 2 + 1;
const preserved = placeRegion(data, draft, cloudRegion.id, {
  servers: emptySetup().servers, cloud: { provider: 'MERIDIAN', compute: preservedCompute },
}).draft;
assert.ok(preserved.facilities.some(room => data.cities.find(city => city.id === room.cityId)?.code !== 'US'),
  'a large North America plan may place network infrastructure outside its only entered market');
assert.deepEqual(serviceForecast(data, preserved).map(service => service.code), ['US'],
  'physical footprint in unopened countries must not create extra forecast markets');
const preservedHtml = renderToStaticMarkup(React.createElement(RegionBoard, {
  data, draft: preserved, patch: () => undefined, totals: buildTotals(data, preserved),
  services: serviceForecast(data, preserved),
} as any));
const preservedSlider = preservedHtml.match(/<input[^>]*aria-label="Cloud compute in North America"[^>]*>/)?.[0] || '';
assert.ok(preservedSlider, 'the North America cloud slider is visible for a saved beyond-plan draft');
assert.ok(Number(preservedSlider.match(/max="(\d+)"/)?.[1]) >= preservedCompute,
  'a saved cloud plan remains inside the slider range after switching to a lower-ceiling provider');
assert.doesNotMatch(preservedHtml, /Extend cloud range/i,
  'the full-region cloud range is available in one slider without a separate extension control');

let listingReads = 0;
const indexedData = { ...data, listings: new Proxy(data.listings, {
  get(target, key, receiver) {
    if (typeof key === 'string' && /^\d+$/.test(key)) listingReads += 1;
    return Reflect.get(target, key, receiver);
  },
}) };
const northAmerica = regionsOf(indexedData).find(region => region.opening.length > 0);
assert.ok(northAmerica, 'the fixture must include North America');
serverCeilingOf(indexedData, northAmerica);
const afterFirstCeiling = listingReads;
assert.ok(afterFirstCeiling > 0, 'first listing lookup reads the real catalogue');
serverCeilingOf(indexedData, northAmerica);
assert.equal(listingReads, afterFirstCeiling,
  'repeated drag updates must reuse the unchanged city-listing index rather than rescan it');

const previewed: number[] = [];
const committed: number[] = [];
const range = createRangeDraft(0, value => committed.push(value), value => previewed.push(value));
range.change(12);
range.change(18);
assert.deepEqual(previewed, [12, 18], 'slider previews must follow the thumb before commit');
assert.deepEqual(committed, [], 'dragging must not commit expensive forecasts at every step');
range.finish(18);
assert.deepEqual(committed, [18], 'the released value must be committed exactly once');

const applied: number[] = [];
const queued = new Map<number, () => void>();
let nextTimer = 1;
const cloud = createCloudDragScheduler(value => applied.push(value), 90, {
  set: callback => { const id = nextTimer++; queued.set(id, callback); return id; },
  clear: id => { queued.delete(id); },
});
cloud.change(41);
cloud.change(85);
assert.equal(queued.size, 1, 'rapid cloud changes schedule one map recalculation');
assert.deepEqual(applied, [], 'the thumb is not blocked by placement work');
const first = queued.entries().next().value;
if (first) { queued.delete(first[0]); first[1](); }
assert.deepEqual(applied, [85], 'the map applies the newest draft, not a stale intermediate one');
cloud.change(121);
cloud.finish(135);
assert.deepEqual(applied, [85, 135], 'release applies the exact final compute count');
assert.equal(queued.size, 0, 'release clears pending map work');

const pricing = {
  streams: ['subs', 'ads'], plans: [{ id: 'BASIC', monthly: 12 }],
  annualDiscount: 20, introOffer: 0, introOfferPlanId: null,
} as any;
const currentAudience = {
  plans: [{ plan: { id: 'BASIC', monthly: 10 }, monthlyBillingSubscribers: 80, annualBillingSubscribers: 20 }],
  streams: [{ id: 'subs', monthly: 900 }, { id: 'ads', monthly: 20 }],
} as any;
assert.equal(previewMonthlyAtCurrentAudience(currentAudience, pricing), 1172,
  'preview reprices fixed paid cohorts and retains independent ad receipts');
assert.equal(previewMonthlyAtCurrentAudience(currentAudience, { ...pricing, introOffer: 50, introOfferPlanId: 'BASIC' }), 692,
  'introductory discount changes only eligible monthly buyers in the live preview');

console.log('PASS Build/Pricing interaction: capability cards and draft-first range contract');
