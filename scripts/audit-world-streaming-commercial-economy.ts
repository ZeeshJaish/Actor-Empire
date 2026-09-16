import assert from 'node:assert/strict';
import type { OwnedStreamingPricingConfiguration } from '../types';
import {
    STREAMING_COMMERCIAL_STREAM_REGISTRY,
    calculateStreamingCommercialAudienceAdjustment,
    calculateWorldStreamingCommercialRevenue,
    createAiStreamingCommercialConfiguration,
} from '../services/worldEconomy/worldStreamingCommercialEconomy';
import { calculatePlatformAiWeeklyEconomy } from '../services/platformAi/platformAiEconomy';
import { createPlatformAiFixture } from './helpers/platformAiFixture';
import { getWorldStreamingOffers } from '../services/worldEconomy/worldStreamingOffers';
import { resolvePlayerStreamingCommerceCapabilityIndex } from '../services/worldEconomy/worldStreamingViewing';

const allStreams: OwnedStreamingPricingConfiguration = {
    streams: ['subs', 'ads', 'rentals', 'premium', 'daypass', 'sponsor', 'metered', 'patron'],
    plans: [{ id: 'base', name: 'Base', monthly: 12, featureIds: ['hd'], ads: true }],
    annualDiscount: 15,
    introOffer: 20,
    ads: { minutesPerHour: 5, cpm: 24 },
    rentals: { rent: 6, buy: 20, windowWeeks: 6 },
    premium: { price: 30 },
    daypass: { price: 7 },
    sponsor: { perTitle: 5_200_000, titles: 2 },
    metered: { perHour: 1.5 },
    patron: { monthly: 9 },
};

assert.deepEqual(
    STREAMING_COMMERCIAL_STREAM_REGISTRY.map(stream => stream.id),
    ['subs', 'ads', 'rentals', 'premium', 'daypass', 'sponsor', 'metered', 'patron'],
    'the shared registry must cover every launch revenue stream',
);
assert.equal(resolvePlayerStreamingCommerceCapabilityIndex(10), 10);
assert.equal(resolvePlayerStreamingCommerceCapabilityIndex(80), 80,
    'player Commerce research must retain its full 0-100 progression');
assert.equal(resolvePlayerStreamingCommerceCapabilityIndex(400), 100,
    'player Commerce research must remain bounded at the canonical maximum');

const commercial = calculateWorldStreamingCommercialRevenue({
    pricing: allStreams,
    paidViewingAccounts: 100_000,
    viewingAccounts: 150_000,
    nonSubscriberOpportunityAccounts: 80_000,
    hoursViewed: 600_000,
    estimatedViewers: 220_000,
    completionRate: .78,
    repeatViewingRate: .14,
    isFreshMovie: true,
    isRentalEligible: true,
    isSponsorEligible: true,
    commerceCapabilityIndex: 74,
    reputationIndex: 80,
});

assert.ok(commercial.advertisingRevenue > 0, 'advertising must earn from delivered ad viewing');
assert.ok(commercial.premiumRevenue > 0, 'premium access must produce transactions and revenue');
assert.ok(commercial.rentalRevenue > 0 && commercial.purchaseRevenue > 0, 'rent and buy must both settle');
assert.ok(commercial.dayPassRevenue > 0 && commercial.dayPassTransactions > 0, 'day passes must settle non-subscriber access');
assert.ok(commercial.meteredRevenue > 0 && commercial.meteredHours > 0, 'metered viewing must settle purchased hours');
assert.ok(commercial.patronRevenue > 0 && commercial.patronAccounts > 0, 'patron funding must settle recurring supporters');
assert.ok(commercial.sponsorshipRevenue > 0, 'sponsored titles must settle delivered exposure');
assert.equal(
    commercial.totalIncrementalRevenue,
    commercial.advertisingRevenue + commercial.premiumRevenue + commercial.rentalRevenue
        + commercial.purchaseRevenue + commercial.dayPassRevenue + commercial.meteredRevenue
        + commercial.patronRevenue + commercial.sponsorshipRevenue,
    'every commercial stream must reconcile exactly once into incremental revenue',
);
assert.ok(commercial.commercialOperatingCost > 0 && commercial.commercialOperatingCost < commercial.totalIncrementalRevenue,
    'commercial activity must carry payment, ad-serving and partner operating costs');

const subscriptionOnly = calculateWorldStreamingCommercialRevenue({
    pricing: { ...allStreams, streams: ['subs'] },
    paidViewingAccounts: 100_000,
    viewingAccounts: 150_000,
    nonSubscriberOpportunityAccounts: 80_000,
    hoursViewed: 600_000,
    estimatedViewers: 220_000,
    completionRate: .78,
    repeatViewingRate: .14,
    isFreshMovie: true,
    isRentalEligible: true,
    isSponsorEligible: true,
    commerceCapabilityIndex: 74,
    reputationIndex: 80,
});
assert.equal(subscriptionOnly.totalIncrementalRevenue, 0, 'disabled streams must never leak commercial revenue');
assert.equal(subscriptionOnly.commercialOperatingCost, 0, 'disabled streams must never leak commercial costs');

const impossiblePrices = calculateWorldStreamingCommercialRevenue({
    pricing: {
        ...allStreams,
        ads: { minutesPerHour: 10_000, cpm: 10_000 },
        rentals: { rent: 10_000, buy: 10_000, windowWeeks: 52 },
        premium: { price: 10_000 },
        daypass: { price: 10_000 },
        metered: { perHour: 10_000 },
        patron: { monthly: 10_000 },
    },
    paidViewingAccounts: 100_000,
    viewingAccounts: 150_000,
    nonSubscriberOpportunityAccounts: 80_000,
    hoursViewed: 600_000,
    estimatedViewers: 220_000,
    completionRate: .78,
    repeatViewingRate: .14,
    isFreshMovie: true,
    isRentalEligible: true,
    isSponsorEligible: true,
    commerceCapabilityIndex: 74,
    reputationIndex: 80,
});
assert.ok(Object.values(impossiblePrices).every(value => Number.isFinite(value) && value >= 0),
    'hostile prices must remain finite and non-negative');
assert.ok(impossiblePrices.dayPassTransactions < commercial.dayPassTransactions,
    'an absurd day-pass price must destroy demand instead of creating an exploit');
assert.ok(impossiblePrices.premiumTransactions < commercial.premiumTransactions,
    'an absurd premium price must destroy transaction demand');

const aiGlobal = createAiStreamingCommercialConfiguration({
    platformId: 'NETFLIX',
    kind: 'CORE_GLOBAL',
    technology: 88,
    brandPower: 92,
    cataloguePower: 90,
    prestige: 91,
    absoluteWeek: 400,
    foundedAtAbsoluteWeek: 1,
});
const aiRegional = createAiStreamingCommercialConfiguration({
    platformId: 'REGIONAL_TEST',
    kind: 'REGIONAL_REAL',
    technology: 42,
    brandPower: 38,
    cataloguePower: 46,
    prestige: 35,
    absoluteWeek: 400,
    foundedAtAbsoluteWeek: 250,
});
assert.ok(aiGlobal.streams.includes('ads') && aiGlobal.streams.includes('premium') && aiGlobal.streams.includes('rentals'),
    'mature AI services must use multiple commercial models');
assert.ok(aiRegional.streams.length >= 1, 'smaller AI services must retain a viable commercial model');
assert.notDeepEqual(aiGlobal, aiRegional, 'AI commercial strategy must vary with platform identity and capability');
const aiOfferStreams = new Set(getWorldStreamingOffers(createPlatformAiFixture(), 2_500).offers
    .filter(offer => !offer.isPlayer)
    .flatMap(offer => offer.commercialConfiguration.streams));
STREAMING_COMMERCIAL_STREAM_REGISTRY.forEach(stream => assert.ok(aiOfferStreams.has(stream.id),
    `the mature AI field must contain a viable ${stream.id} strategy`));
const youtubeOffer = getWorldStreamingOffers(createPlatformAiFixture(), 2_500).offers
    .find(offer => offer.platformId === 'YOUTUBE');
assert.ok(youtubeOffer?.plans.some(plan => plan.monthlyPrice === 0 && plan.ads),
    'an ad-first AI service must expose its free ad-supported access instead of pretending every viewer subscribes');

const stressCommercial = () => {
    let revenue = 0;
    let cost = 0;
    for (let week = 1; week <= 20_800; week += 1) {
        const phase = week % 5;
        const pricing: OwnedStreamingPricingConfiguration = phase === 0
            ? { ...allStreams, plans: [{ ...allStreams.plans[0], monthly: 0, ads: true }], daypass: { price: 0 }, metered: { perHour: 0 }, patron: { monthly: 0 } }
            : phase === 1
                ? { ...allStreams, plans: [{ ...allStreams.plans[0], monthly: 100 }], rentals: { rent: 100, buy: 100, windowWeeks: 52 }, premium: { price: 100 }, daypass: { price: 100 }, metered: { perHour: 20 }, patron: { monthly: 100 } }
                : phase === 2
                    ? { ...allStreams, streams: ['rentals', 'premium', 'daypass', 'metered', 'patron', 'sponsor'] }
                    : phase === 3
                        ? { ...allStreams, ads: { minutesPerHour: 30, cpm: 100 } }
                        : allStreams;
        const row = calculateWorldStreamingCommercialRevenue({
            pricing,
            paidViewingAccounts: 250_000 + week * 7,
            viewingAccounts: 400_000 + week * 9,
            nonSubscriberOpportunityAccounts: 300_000 + week * 5,
            hoursViewed: 1_600_000 + week * 23,
            estimatedViewers: 600_000 + week * 11,
            completionRate: (week % 100) / 100,
            repeatViewingRate: (week % 30) / 100,
            isFreshMovie: week % 4 !== 0,
            isRentalEligible: week % 9 !== 0,
            isSponsorEligible: week % 2 === 0,
            commerceCapabilityIndex: week % 101,
            reputationIndex: (week * 3) % 101,
        });
        assert.ok(Object.values(row).every(value => Number.isFinite(value) && value >= 0), `week ${week} commercial settlement stays finite`);
        revenue += row.totalIncrementalRevenue;
        cost += row.commercialOperatingCost;
    }
    return { revenue, cost };
};
const longRunA = stressCommercial();
const longRunB = stressCommercial();
assert.deepEqual(longRunB, longRunA, '20,800 commercial weeks remain deterministic across extreme pricing modes');
assert.ok(Number.isSafeInteger(longRunA.revenue) && Number.isSafeInteger(longRunA.cost), '400-year commercial totals remain safe integers');

const offerFixture = createPlatformAiFixture();
offerFixture.ownedStreamingPlatform.lifecycle = 'ACTIVE';
offerFixture.ownedStreamingPlatform.identity = {
    name: 'Commercial Test', slug: 'commercial-test', primaryColor: '#000000', secondaryColor: '#ffffff',
    logoKey: 'FRAME_PLAY', brandPromiseId: 'BALANCED', publicManifesto: '', dayOneMarketIds: ['US'],
    launchServerCityId: null, foundedAtAbsoluteWeek: 1,
};
offerFixture.ownedStreamingPlatform.serviceConfiguration.source = 'PLAYER_ACTION';
offerFixture.ownedStreamingPlatform.serviceConfiguration.pricing = structuredClone(allStreams);
const offerFingerprint = getWorldStreamingOffers(offerFixture, 400).fingerprint;
offerFixture.ownedStreamingPlatform.serviceConfiguration.pricing.ads.minutesPerHour = 11;
assert.notEqual(getWorldStreamingOffers(offerFixture, 400).fingerprint, offerFingerprint,
    'commercial price and load changes must invalidate same-week world projections');
const accessOnlyFixture = structuredClone(offerFixture);
accessOnlyFixture.ownedStreamingPlatform.serviceConfiguration.pricing = {
    ...allStreams,
    streams: ['daypass', 'rentals'],
    plans: [],
};
const accessOnlyOffer = getWorldStreamingOffers(accessOnlyFixture, 400).offers.find(offer => offer.isPlayer);
assert.ok(accessOnlyOffer && accessOnlyOffer.plans.length === 1 && accessOnlyOffer.plans[0].monthlyPrice === 0,
    'a non-subscription service must remain reachable through a zero-subscription access account');
assert.ok(calculateStreamingCommercialAudienceAdjustment({ ...allStreams, ads: { minutesPerHour: 4, cpm: 24 } })
    > calculateStreamingCommercialAudienceAdjustment({ ...allStreams, ads: { minutesPerHour: 18, cpm: 24 } }),
    'heavy ad load must reduce acquisition utility and eventually increase churn pressure');
assert.ok(calculateStreamingCommercialAudienceAdjustment({ ...allStreams, streams: ['daypass'], daypass: { price: 7 } })
    > calculateStreamingCommercialAudienceAdjustment({ ...allStreams, streams: ['daypass'], daypass: { price: 10_000 } }),
    'a viable alternative payment product must attract more audience than an unusable price');

const aiFixture = createPlatformAiFixture();
const aiWeek = 2_500;
aiFixture.world.worldStreamingPlatformEconomy = {
    lastProcessedAbsoluteWeek: aiWeek,
    platforms: {
        NETFLIX: {
            weeklySubscriptionRevenue: 40_000_000,
            weeklyIncrementalRevenue: 9_000_000,
        },
    },
} as any;
aiFixture.world.worldStreamingViewing = {
    lastProcessedAbsoluteWeek: aiWeek,
    platforms: {
        NETFLIX: {
            revenue: {
                advertisingRevenue: 2_000_000,
                premiumRevenue: 1_500_000,
                rentalRevenue: 1_000_000,
                purchaseRevenue: 750_000,
                dayPassRevenue: 500_000,
                meteredRevenue: 250_000,
                patronRevenue: 125_000,
                sponsorshipRevenue: 2_875_000,
                commercialOperatingCost: 900_000,
            },
        },
    },
} as any;
const aiEconomy = calculatePlatformAiWeeklyEconomy({
    player: aiFixture,
    platform: aiFixture.world.platforms!.NETFLIX,
    absoluteWeek: aiWeek,
});
assert.equal(aiEconomy.snapshot?.advertisingRevenueMillions, 2, 'AI finance must preserve advertising as its own revenue class');
assert.equal(aiEconomy.snapshot?.transactionRevenueMillions, 4, 'AI finance must preserve premium, rent, buy, day-pass and metered revenue');
assert.equal(aiEconomy.snapshot?.communityRevenueMillions, .125, 'AI finance must preserve patron funding');
assert.equal(aiEconomy.snapshot?.sponsorshipRevenueMillions, 2.875, 'AI finance must preserve sponsorship income');
assert.equal(aiEconomy.snapshot?.commercialOperatingCostMillions, .9, 'AI finance must pay commercial delivery and payment costs');
assert.equal(aiEconomy.snapshot?.revenueMillions, 49, 'AI finance must reconcile subscription and every commercial class once');

console.log(`Commercial registry: ${STREAMING_COMMERCIAL_STREAM_REGISTRY.length} streams; all player streams settle and AI strategies vary.`);
