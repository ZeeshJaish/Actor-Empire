import assert from 'node:assert/strict';
import { createInitialOwnedStreamingPlatformState } from '../types';
import { normalizeStreamingPricingConfiguration } from '../services/streamingPricingEconomy';
import { configureStreamingPricingOffer, projectStreamingCommercialOffers } from '../services/streamingCommercialOffers';
import { evaluateStreamingStoreBuyer, evaluateStreamingTitlePlayback,
    evaluateStreamingTitleRoute } from '../services/streamingTitleAccess';
import { calculateAiTitleStoreBuyerPool } from '../services/worldEconomy/worldStreamingAiCatalogue';

const fresh = createInitialOwnedStreamingPlatformState('p2').serviceConfiguration.pricing;
const legacy = normalizeStreamingPricingConfiguration({ ...fresh, streams: ['subs', 'rentals'],
    rentals: { ...fresh.rentals, windowWeeks: 4 },
    plans: [{ id: 'ESSENTIAL', name: 'Essential', monthly: 8, featureIds: [], ads: false },
        { id: 'STANDARD', name: 'Standard', monthly: 13, featureIds: [], ads: false }],
    commercialOffers: undefined });
assert.deepEqual(legacy.commercialOffers?.storeEligibility, { kind: 'PUBLIC', planIds: [] },
    'older saves keep their public store');
const restricted = configureStreamingPricingOffer(legacy,
    { kind: 'STORE_ELIGIBILITY', scope: 'MEMBERSHIP_PLANS', planIds: ['STANDARD'] });
const store = projectStreamingCommercialOffers(restricted).storeOffer;
assert.ok(store);
assert.equal(evaluateStreamingStoreBuyer(store, { planId: 'ESSENTIAL', membershipActive: true }).allowed, false,
    'Essential cannot buy a Standard-only rental');
assert.equal(evaluateStreamingStoreBuyer(store, { planId: 'STANDARD', membershipActive: true }).allowed, true,
    'active Standard can buy');
assert.equal(evaluateStreamingStoreBuyer(store, { planId: 'STANDARD', membershipActive: false }).allowed, false,
    'expired Standard cannot make a new purchase');
assert.equal(evaluateStreamingStoreBuyer(store, null).allowed, false,
    'public viewer cannot buy under member-only access');
assert.equal(evaluateStreamingStoreBuyer(projectStreamingCommercialOffers(legacy).storeOffer, null).allowed, true,
    'public store does not require membership');
const deleted = normalizeStreamingPricingConfiguration({ ...restricted,
    plans: restricted.plans.filter(plan => plan.id !== 'STANDARD') });
assert.deepEqual(deleted.commercialOffers?.storeEligibility, { kind: 'MEMBERSHIP_PLANS', planIds: [] },
    'deleting the only eligible plan closes new sales instead of widening to public');
assert.equal(evaluateStreamingStoreBuyer(projectStreamingCommercialOffers(deleted).storeOffer, null).allowed, false);
assert.equal(calculateAiTitleStoreBuyerPool({ price: 8, monthlySubscriptionPrice: 5,
    subscriptionIncluded: false, freeAdIncluded: false,
    storeEligibility: { kind: 'MEMBERSHIP_PLANS', planIds: ['STANDARD'] },
    cohorts: [{ budget: 20, subscriptions: 10, eligibleSubscriptions: 4, freeAd: 3, store: 5 }] }), 4,
    'AI store pool cannot sell to public, free-ad, or excluded plan viewers');
const conflicted = normalizeStreamingPricingConfiguration({ ...legacy, streams: ['subs', 'ads'],
    plans: [{ ...legacy.plans[0], featureIds: ['hd', 'uhd', 'streams2', 'streams4', 'noads', 'early'], ads: true }] });
assert.deepEqual(conflicted.plans[0].featureIds.filter(id => ['hd', 'uhd', 'streams2', 'streams4', 'noads'].includes(id)),
    ['uhd', 'streams4'], 'legacy exclusive features resolve to the higher tier and ads wins over no-ads');
assert.equal(conflicted.plans[0].featureIds.includes('early'), false,
    'a legacy early chip without the saved benefit cannot imply real early access');
const position = { contractId: 'p2-rights', territory: 'GLOBAL' as const, countryIds: ['US'],
    startsAtAbsoluteWeek: 0, expiresAtAbsoluteWeek: 40, status: 'ACTIVE' as const,
    accessGrant: { schemaVersion: 1 as const, modes: ['RENTAL', 'PURCHASE', 'AD_SUPPORTED'] as Array<'RENTAL' | 'PURCHASE' | 'AD_SUPPORTED'>,
        earlyWindowWeeks: 2, purchaseFulfillment: 'PERPETUAL' as const, source: 'EXPLICIT' as const } };
const title = { titleId: 'p2-film', countryId: 'US', absoluteWeek: 10,
    productionReadyAtAbsoluteWeek: 0, generalReleaseAtAbsoluteWeek: 0, marketActive: true,
    offer: projectStreamingCommercialOffers(restricted), position };
assert.equal(evaluateStreamingTitlePlayback({ ...title, route: { kind: 'PURCHASE' },
    viewerProof: { kind: 'PURCHASE', purchasedAtAbsoluteWeek: 5 } }).allowed, true,
    'an existing durable purchase survives a later membership restriction');
assert.equal(evaluateStreamingTitlePlayback({ ...title, absoluteWeek: 7, route: { kind: 'RENTAL' },
    viewerProof: { kind: 'RENTAL', purchasedAtAbsoluteWeek: 5 } }).allowed, true,
    'an unexpired rental survives a later membership restriction');
assert.equal(evaluateStreamingTitlePlayback({ ...title, route: { kind: 'RENTAL' },
    viewerProof: { kind: 'RENTAL', purchasedAtAbsoluteWeek: 5 } }).reasonCode, 'RENTAL_EXPIRED');
assert.equal(evaluateStreamingTitleRoute({ ...title, route: { kind: 'PURCHASE' },
    position: { ...position, accessGrant: { ...position.accessGrant, modes: ['RENTAL'] } } }).allowed, false,
    'buyer eligibility never overrides missing publisher rights');
const early = configureStreamingPricingOffer(restricted,
    { kind: 'BENEFIT', offer: 'STORE', premiumAccess: true, earlyAccessWeeks: 2 });
assert.equal(evaluateStreamingTitleRoute({ ...title, absoluteWeek: 8, generalReleaseAtAbsoluteWeek: 10,
    offer: projectStreamingCommercialOffers(early), route: { kind: 'RENTAL' } }).allowed, true,
    'early benefit applies only within the licensed early window');
assert.equal(evaluateStreamingTitleRoute({ ...title, absoluteWeek: 7, generalReleaseAtAbsoluteWeek: 10,
    offer: projectStreamingCommercialOffers(early), route: { kind: 'RENTAL' } }).allowed, false);
const corrupt = normalizeStreamingPricingConfiguration({ ...legacy, commercialOffers: {
    ...restricted.commercialOffers!, storeEligibility: { kind: 'UNKNOWN', planIds: [] } as any,
} });
assert.equal(evaluateStreamingStoreBuyer(projectStreamingCommercialOffers(corrupt).storeOffer, null).allowed, false,
    'an explicitly malformed access policy must not quietly become public');
console.log('PASS pricing P2: store scope, membership expiry, legacy migration, plan deletion, feature conflicts');
