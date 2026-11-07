/**
 * #103 The offer's rules (plan §18.3; Zeesh, 2026-11-01: "ऑफर का नया रोल ठीक है"):
 *  - ads on a paid plan belong to that plan; Free with ads is the free tier alone, and the ads stream follows from the
 *    two (on while the free tier is open or a plan on sale has ads);
 *  - the main offer is the front door: the first choice opens the service with that offer alone, after it a new main
 *    only turns that offer on and leaves the rest as they are (plans, ads, levels); the main cannot be turned off;
 *  - "Basic with ads" keeps its ads (choosing Subscription took them away and kept the name); a draft an earlier rule
 *    stripped gets them back;
 *  - one range for the store's prices; the free column has no Screens or Kids rows; a members-only store with no member
 *    who can buy is flagged; 0 ad minutes is no ads (no ad penalty); the HQ headline is the main offer's number.
 * Service level, made-up offers. (~1 s)
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { OwnedStreamingPricingConfiguration } from '../types';
import {
    configureStreamingPricingOffer,
    projectStreamingCommercialOffers,
    restoreStreamingDraftAdPlans,
    streamingStoreSellsToNobody,
} from '../services/streamingCommercialOffers';
import { normalizeStreamingPricingConfiguration } from '../services/streamingPricingEconomy';
import { STREAMING_FREE_TIER_ROWS, setStreamingStoreTerms, setStreamingStoreTopEdition } from '../services/streamingPlanBuilder';

/* the starter offer a new career gets (types.ts): subscriptions with "Basic with ads", nothing chosen yet */
const starter = (): OwnedStreamingPricingConfiguration => normalizeStreamingPricingConfiguration({
    commercialOffers: {
        schemaVersion: 1, coreModel: 'SUBSCRIPTION', coreModelSelected: false, freeAdAccess: false,
        adFreePasses: { oneHourPrice: null, dayPrice: null },
        benefits: { plans: {}, freeAds: { premiumAccess: false, earlyAccessWeeks: 0 }, store: { premiumAccess: false, earlyAccessWeeks: 0 } },
    },
    streams: ['subs', 'ads'],
    plans: [
        { id: 'BASIC', name: 'Basic with ads', monthly: 7.99, featureIds: [], ads: true },
        { id: 'PREMIUM', name: 'Standard', monthly: 9.99, featureIds: [], ads: false },
    ],
    annualDiscount: 15, introOffer: 0,
    ads: { minutesPerHour: 4, cpm: 22 },
    rentals: { rent: 5.99, buy: 19.99, windowWeeks: 6 },
    premium: { price: 29.99 }, daypass: { price: 7.99 }, sponsor: { perTitle: 4_000_000, titles: 0 }, metered: { perHour: 1 }, patron: { monthly: 10 },
} as unknown as OwnedStreamingPricingConfiguration);
const core = (pricing: OwnedStreamingPricingConfiguration, coreModel: 'SUBSCRIPTION' | 'ADVERTISING' | 'STORE') => (
    configureStreamingPricingOffer(pricing, { kind: 'CORE', coreModel }));
const toggle = (pricing: OwnedStreamingPricingConfiguration, offer: 'SUBSCRIPTION' | 'ADS' | 'STORE', enabled: boolean) => (
    configureStreamingPricingOffer(pricing, { kind: 'TOGGLE', offer, enabled }));
const basic = (pricing: OwnedStreamingPricingConfiguration) => pricing.plans.find(plan => plan.id === 'BASIC')!;
const freeTier = (pricing: OwnedStreamingPricingConfiguration) => Boolean(projectStreamingCommercialOffers(pricing).freeAdOffer);
const on = (pricing: OwnedStreamingPricingConfiguration) => [...pricing.streams].sort().join(',');

/* ── the first choice: that offer alone, and the plans keep their ads ── */
const subscription = core(starter(), 'SUBSCRIPTION');
assert.deepEqual([on(subscription), basic(subscription).ads, freeTier(subscription), subscription.commercialOffers!.coreModel, subscription.commercialOffers!.coreModelSelected],
    ['ads,subs', true, false, 'SUBSCRIPTION', true], 'Subscription first: "Basic with ads" keeps its ads, no free tier (it read "Ads: None")');
const free = core(starter(), 'ADVERTISING');
assert.deepEqual([on(free), freeTier(free), basic(free).ads, free.commercialOffers!.inactiveAdPlans?.BASIC?.monthly, projectStreamingCommercialOffers(free).subscriptions.length],
    ['ads', true, false, 7.99, 0], 'Free with ads first: the free tier alone; the plans wait, their ads remembered (no ad plan beside no ads stream)');
assert.equal(basic(toggle(free, 'SUBSCRIPTION', true)).ads, true, 'Subscriptions on: "Basic with ads" comes back with its ads');
const store = core(starter(), 'STORE');
assert.deepEqual([on(store), freeTier(store), Boolean(store.commercialOffers!.inactiveAdPlans?.BASIC)], ['rentals', false, true], 'Rent or buy first: the store alone, the ads waiting');
console.log('PASS first choice: Subscription keeps "Basic with ads" ads; Free with ads and Rent or buy open alone, the plans\' ads waiting for subscriptions');

/* ── after it: a new main moves the front door only ── */
const withLight = normalizeStreamingPricingConfiguration({ ...subscription, plans: subscription.plans.map(plan => (plan.id === 'BASIC' ? { ...plan, adLevel: 'LIGHT' } : plan)) });
const madeFree = core(withLight, 'ADVERTISING');
assert.deepEqual([on(madeFree), freeTier(madeFree), basic(madeFree).ads, basic(madeFree).adLevel, madeFree.commercialOffers!.coreModel],
    ['ads,subs', true, true, 'LIGHT', 'ADVERTISING'], 'Make Free with ads main: the free tier opens, subscriptions stay, Light stays Light (it went Standard)');
const madeStore = core(madeFree, 'STORE');
assert.deepEqual([on(madeStore), freeTier(madeStore), madeStore.commercialOffers!.coreModel], ['ads,rentals,subs', true, 'STORE'],
    'Make Rent or buy main: the store opens, the free tier and subscriptions stay (the wizard turned them off)');
assert.equal(on(toggle(madeStore, 'STORE', false)), on(madeStore), 'The main offer cannot be turned off');
const backAgain = toggle(toggle(madeFree, 'SUBSCRIPTION', false), 'SUBSCRIPTION', true);
assert.deepEqual([basic(backAgain).ads, basic(backAgain).adLevel], [true, 'LIGHT'], 'Subscriptions off and on again: the plan\'s ads come back at their level');
console.log('PASS main: the front door moves, the rest stays (plans, ads, levels); the main cannot be turned off');

/* ── the free tier alone ── */
const freeOff = toggle(core(madeFree, 'SUBSCRIPTION'), 'ADS', false);
assert.deepEqual([freeTier(freeOff), basic(freeOff).ads, on(freeOff)], [false, true, 'ads,subs'],
    'Free with ads off: the free tier closes, "Basic with ads" keeps its ads, the ads stream stays for it (it took every plan\'s ads)');
const noAdPlans = normalizeStreamingPricingConfiguration({ ...freeOff, plans: freeOff.plans.map(plan => ({ ...plan, ads: false })) });
assert.equal(on(noAdPlans), 'subs', 'No free tier and no ad plan: no ads stream (a dead "ads on" with nothing to show)');
const freeOn = toggle(freeOff, 'ADS', true);
assert.deepEqual([freeTier(freeOn), basic(freeOn).ads, freeOn.commercialOffers!.coreModel], [true, true, 'SUBSCRIPTION'], 'Free with ads on: the free tier opens beside the plans');
console.log('PASS free tier: on and off by itself; the plans\' ads are theirs; the ads stream follows');

/* ── plans an earlier rule stripped ── */
const stripped = normalizeStreamingPricingConfiguration({
    ...free,
    commercialOffers: { ...free.commercialOffers!, inactiveAdPlans: { BASIC: { monthly: 7.99 } } },
    plans: free.plans.map(plan => ({ ...plan, ads: false })),
});
assert.deepEqual([basic(toggle(stripped, 'SUBSCRIPTION', true)).ads, toggle(stripped, 'SUBSCRIPTION', true).commercialOffers!.inactiveAdPlans],
    [true, {}], 'Subscriptions back on: a plan an earlier rule stripped gets its ads back');
const strippedDraft = normalizeStreamingPricingConfiguration({ ...subscription,
    commercialOffers: { ...subscription.commercialOffers!, inactiveAdPlans: { BASIC: { monthly: 7.99 } } },
    plans: subscription.plans.map(plan => ({ ...plan, ads: false })) });
assert.equal(basic(restoreStreamingDraftAdPlans(strippedDraft)).ads, true, 'A launch draft stripped by the old first choice gets them back');
const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
assert.ok(source('services/streamingCanonicalState.ts').includes('pricing: restoreStreamingDraftAdPlans(normalizePricingConfiguration(root, { pricing: source.pricing })),'),
    'Only the launch draft is restored; a live service keeps its plans as they are');
console.log('PASS stripped plans: back with subscriptions, and in a launch draft');

/* ── one range, no dead settings ── */
const prices = setStreamingStoreTerms(store, { rent: 50, buy: 99 });
const top = setStreamingStoreTopEdition(prices, { rent: 90, buy: 99 });
assert.deepEqual([prices.rentals.rent, prices.rentals.buy, top.storeTopEdition?.rent, top.storeTopEdition?.buy], [12, 30, 20, 40],
    'The store: rent $12 and buy $30 at most, wherever they are set (the table went to $100); the top edition $20 and $40');
assert.ok(!STREAMING_FREE_TIER_ROWS.includes('screens') && !STREAMING_FREE_TIER_ROWS.includes('kids'), 'The free column has no Screens or Kids rows (a free viewer never reads them)');
const membersOnly = configureStreamingPricingOffer(store, { kind: 'STORE_ELIGIBILITY', scope: 'MEMBERSHIP_PLANS', planIds: ['BASIC'] });
assert.deepEqual([streamingStoreSellsToNobody(membersOnly), streamingStoreSellsToNobody(store), streamingStoreSellsToNobody(toggle(membersOnly, 'SUBSCRIPTION', true))],
    [true, false, false], 'A members-only store with subscriptions off sells to nobody, and says so');
console.log('PASS one range, no dead settings: store prices capped once; no free Screens or Kids rows; a store nobody can buy from flagged');

/* ── the engine and the HQ (source) ── */
const offers = source('services/worldEconomy/worldStreamingOffers.ts');
assert.ok(offers.includes('const servesAds = plan.ads && pricing.ads.minutesPerHour > 0;') && offers.includes('ads: servesAds,'),
    '0 ad minutes an hour: an ad plan is ad-free to viewers, with no ad penalty');
assert.ok(!source('components/studio-finance/components/launch/StepPricing.tsx').includes('onClick={() => onChange(0)}>No ads</button>'),
    'The ad cadence offers no "No ads"');
const headline = source('services/streamingPlatformOffer.ts');
assert.ok(headline.includes("const kind: StreamingPlatformHeadline['kind'] = core === 'ADVERTISING' && freeAds ? 'AD_HOMES'"),
    'The HQ headline is the main offer\'s number');
const offerTab = source('components/streaming-transplant/PlatformOffer.tsx');
assert.ok(offerTab.includes("const makeCore = (item: Offer) => update(configureStreamingPricingOffer(draft, { kind: 'CORE', coreModel: CORE_OF[item] }));")
    && !offerTab.includes('ads on cheaper plans'), 'The Offer tab\'s Make main is the same rule; the Free with ads card means the free tier only');
console.log('PASS engine and pages: 0 ad minutes is no ads; no "No ads" cadence; the HQ headline follows the main offer; Make main the same everywhere');
console.log('done');
