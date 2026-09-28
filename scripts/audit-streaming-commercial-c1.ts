import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type OwnedStreamingPricingConfiguration } from '../types';
import { normalizeStreamingPricingConfiguration } from '../services/streamingPricingEconomy';
import { createStreamingPricingForCoreModel, projectStreamingCommercialOffers } from '../services/streamingCommercialOffers';
import { migratePlayerSave } from '../services/saveMigration';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { getWorldStreamingOffers } from '../services/worldEconomy/worldStreamingOffers';

const base = structuredClone(INITIAL_PLAYER.ownedStreamingPlatform.serviceConfiguration.pricing) as OwnedStreamingPricingConfiguration;
const adsOnly = normalizeStreamingPricingConfiguration({ ...base, streams: ['ads'], plans: [] });
assert.equal(adsOnly.commercialOffers?.coreModel, 'ADVERTISING', 'ad-only service must retain its own leading model');
assert.deepEqual(adsOnly.streams, ['ads']);
assert.deepEqual(adsOnly.plans, []);
assert.equal(adsOnly.ads.cpm, base.ads.cpm);
assert.deepEqual(normalizeStreamingPricingConfiguration(adsOnly), adsOnly, 'normalization must be idempotent');

const malformed = normalizeStreamingPricingConfiguration({
    ...base,
    streams: ['subs'],
    plans: Array.from({ length: 8 }, (_, index) => ({
        id: `P${index}`, name: `Plan ${index}`, monthly: 10 + index, featureIds: [], ads: false,
    })),
    commercialOffers: {
        schemaVersion: 1,
        coreModel: 'STORE',
        freeAdAccess: false,
        adFreePasses: { oneHourPrice: 5, dayPrice: 12 },
        benefits: {
            plans: { P0: { premiumAccess: true, earlyAccessWeeks: 99 }, P7: { premiumAccess: true, earlyAccessWeeks: 2 } },
            freeAds: { premiumAccess: true, earlyAccessWeeks: 3 },
            store: { premiumAccess: true, earlyAccessWeeks: 3 },
        },
    },
});
assert.equal(malformed.plans.length, 6);
assert.equal(malformed.commercialOffers?.coreModel, 'SUBSCRIPTION');
assert.deepEqual(Object.keys(malformed.commercialOffers?.benefits.plans || {}), ['P0']);
assert.equal(malformed.commercialOffers?.benefits.plans.P0.earlyAccessWeeks, 4);
assert.equal(malformed.commercialOffers?.adFreePasses.oneHourPrice, 5, 'inactive pass setting remains available when ads are enabled later');
assert.deepEqual(normalizeStreamingPricingConfiguration(malformed), malformed);
const invalidAdIntent = normalizeStreamingPricingConfiguration({
    ...base,
    streams: ['ads'],
    plans: [],
    commercialOffers: {
        schemaVersion: 1,
        coreModel: 'ADVERTISING',
        freeAdAccess: false,
        adFreePasses: { oneHourPrice: -1, dayPrice: Number.POSITIVE_INFINITY },
        benefits: { plans: {}, freeAds: { premiumAccess: false, earlyAccessWeeks: -3 }, store: { premiumAccess: false, earlyAccessWeeks: 0 } },
    },
});
assert.equal(invalidAdIntent.commercialOffers?.freeAdAccess, true, 'an ad-only core must provide its free entry offer');
assert.deepEqual(invalidAdIntent.commercialOffers?.adFreePasses, { oneHourPrice: null, dayPrice: null });

const custom = normalizeStreamingPricingConfiguration({
    ...base,
    streams: ['subs', 'ads', 'rentals'],
    plans: [{ id: 'MY_PLAN', name: 'My plan', monthly: 8.49, featureIds: ['hd'], ads: true }],
    commercialOffers: {
        schemaVersion: 1,
        coreModel: 'SUBSCRIPTION',
        freeAdAccess: true,
        adFreePasses: { oneHourPrice: 1.99, dayPrice: 3.99 },
        benefits: {
            plans: { MY_PLAN: { premiumAccess: true, earlyAccessWeeks: 2 } },
            freeAds: { premiumAccess: false, earlyAccessWeeks: 0 },
            store: { premiumAccess: true, earlyAccessWeeks: 1 },
        },
    },
});
const customOffers = projectStreamingCommercialOffers(custom);
assert.equal(customOffers.coreModel, 'SUBSCRIPTION');
assert.deepEqual(customOffers.subscriptions.map(plan => [plan.id, plan.monthly, plan.benefits.earlyAccessWeeks]), [['MY_PLAN', 8.49, 2]]);
assert.equal(customOffers.freeAdOffer?.adMinutesPerHour, base.ads.minutesPerHour);
assert.equal('targetCpm' in (customOffers.freeAdOffer || {}), false,
    'legacy saved CPM must not become an active player offer');
assert.equal(customOffers.storeOffer?.rent, base.rentals.rent);
assert.equal(customOffers.adFreePasses.dayPrice, 3.99);
assert.deepEqual(custom, normalizeStreamingPricingConfiguration(custom), 'projection must not change saved pricing');

const adOffers = projectStreamingCommercialOffers(adsOnly);
assert.equal(adOffers.subscriptions.length, 0);
assert.equal(adOffers.freeAdOffer?.price, 0);
assert.equal(adOffers.storeOffer, null);
const storeOffers = projectStreamingCommercialOffers({ ...base, streams: ['rentals'], plans: [] });
assert.equal(storeOffers.subscriptions.length, 0);
assert.equal(storeOffers.freeAdOffer, null);
assert.deepEqual([storeOffers.storeOffer?.rent, storeOffers.storeOffer?.buy], [base.rentals.rent, base.rentals.buy]);

for (const [model, stream] of [
    ['SUBSCRIPTION', 'subs'], ['ADVERTISING', 'ads'], ['STORE', 'rentals'],
] as const) {
    const started = createStreamingPricingForCoreModel(custom, model);
    assert.deepEqual(started.streams, [stream]);
    assert.equal(started.commercialOffers?.coreModel, model);
    assert.deepEqual(started.plans.map(plan => plan.id), ['MY_PLAN'], 'inactive custom plans must survive strategy changes');
    assert.deepEqual(started.rentals, custom.rentals, 'uniform store prices must survive strategy changes');
    assert.deepEqual(started.commercialOffers?.benefits.store, custom.commercialOffers?.benefits.store,
        'inactive store benefits must survive strategy changes');
    assert.equal(projectStreamingCommercialOffers(started).subscriptions.length, model === 'SUBSCRIPTION' ? 1 : 0);
}
const switchedToSubscription = createStreamingPricingForCoreModel(adsOnly, 'SUBSCRIPTION');
assert.equal(switchedToSubscription.commercialOffers?.coreModel, 'SUBSCRIPTION');
assert.ok(switchedToSubscription.plans.length > 0, 'switching from a genuinely ad-only save needs a starting plan');

const rawPlayer = structuredClone(INITIAL_PLAYER);
rawPlayer.ownedStreamingPlatform.serviceConfiguration.pricing = { ...base, streams: ['ads'], plans: [] };
const migrated = migratePlayerSave(rawPlayer);
const roundTripped = migratePlayerSave(JSON.parse(JSON.stringify(migrated)));
for (const player of [migrated, roundTripped]) {
    assert.deepEqual(player.ownedStreamingPlatform.serviceConfiguration.pricing.streams, ['ads']);
    assert.deepEqual(player.ownedStreamingPlatform.serviceConfiguration.pricing.plans, []);
    assert.equal(player.ownedStreamingPlatform.serviceConfiguration.pricing.commercialOffers?.coreModel, 'ADVERTISING');
}
const missingPlans = structuredClone(INITIAL_PLAYER);
delete (missingPlans.ownedStreamingPlatform.serviceConfiguration.pricing as Partial<OwnedStreamingPricingConfiguration>).plans;
assert.ok(migratePlayerSave(missingPlans).ownedStreamingPlatform.serviceConfiguration.pricing.plans.length > 0);
for (const [core, streams] of [
    ['SUBSCRIPTION', ['subs']], ['ADVERTISING', ['ads']], ['STORE', ['rentals']],
] as const) {
    const fixture = structuredClone(INITIAL_PLAYER);
    fixture.ownedStreamingPlatform.serviceConfiguration.pricing = createStreamingPricingForCoreModel(custom, core);
    const once = migratePlayerSave(fixture);
    const twice = migratePlayerSave(JSON.parse(JSON.stringify(once)));
    const savedPricing = twice.ownedStreamingPlatform.serviceConfiguration.pricing;
    assert.deepEqual(savedPricing.streams, [...streams]);
    assert.equal(savedPricing.commercialOffers?.coreModel, core);
    assert.equal(savedPricing.plans[0]?.id, 'MY_PLAN', 'custom plan survives even when inactive');
    assert.equal(savedPricing.rentals.rent, custom.rentals.rent);
    assert.deepEqual(savedPricing.commercialOffers?.benefits.store, custom.commercialOffers?.benefits.store);
    assert.deepEqual(twice.ownedStreamingPlatform.serviceConfiguration.pricing,
        once.ownedStreamingPlatform.serviceConfiguration.pricing, 'second save migration must not alter offer intent');
}

const aiPlayer = structuredClone(INITIAL_PLAYER);
const aiOffers = getWorldStreamingOffers(aiPlayer, getAbsoluteWeek(aiPlayer.age, aiPlayer.currentWeek)).offers;
assert.ok(aiOffers.length > 0);
assert.ok(aiOffers.some(offer => offer.commercialConfiguration.streams.includes('subs')),
    'C4 still leaves subscription-led AI strategy active');
for (const offer of aiOffers) {
    const projected = projectStreamingCommercialOffers(offer.commercialConfiguration);
    assert.equal(projected.subscriptions.length > 0,
        offer.commercialConfiguration.streams.includes('subs'),
        'C4 AI plans only exist for an active subscription offer');
    assert.deepEqual(projected.subscriptions.map(plan => plan.id), offer.commercialConfiguration.plans.filter(plan => plan.monthly > 0).map(plan => plan.id));
}

console.log('C1 commercial offer audit passed');
