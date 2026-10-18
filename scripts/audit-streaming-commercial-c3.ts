import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type WorldAudienceCohortState, type WorldAudienceParticipationCohortState, type WorldStreamingPlatformOffer } from '../types';
import { allocateStreamingAudienceChoice, normalizeWorldStreamingAudienceChoiceState, recordPlayerStreamingAudienceEntitlement } from '../services/worldEconomy/worldStreamingAudienceChoice';
import { migratePlayerSave } from '../services/saveMigration';
import { createStreamingLicenseContract } from '../services/streamingRightsCore';
import { createSaveIntegrityManifest, verifySaveIntegrity } from '../services/saveIntegrity';

const cohort: WorldAudienceCohortState = {
    id: 'VALUE', primaryPersonaId: 'VALUE_SEEKERS', incomeBandId: 'MIDDLE', lifeStageId: 'ADULT',
    households: 1000, people: 2600, entertainmentAppetiteIndex: 70, priceSensitivityIndex: 80,
    accessReadinessIndex: 80, localLanguageAffinityIndex: 50, legalConsumptionIndex: 80,
    sharingTendencyIndex: 20, piracyTendencyIndex: 10, monthlyEntertainmentBudgetPerHousehold: 20,
    totalMonthlyEntertainmentBudget: 20000, personaAffinity: [0, 100, 0, 0, 0, 0],
};
const participation: WorldAudienceParticipationCohortState = {
    cohortId: 'VALUE', streamingEligibilityIndex: 85, streamingInterestIndex: 80,
    cinemaEligibilityIndex: 50, cinemaInterestIndex: 50, streamingOnlyHouseholds: 800,
    cinemaOnlyHouseholds: 0, dualParticipantHouseholds: 200, neitherHouseholds: 0,
    totalMonthlyStreamingBudget: 18000, totalMonthlyCinemaBudget: 0,
    totalMonthlyOtherEntertainmentBudget: 0, totalMonthlyUncommittedBudget: 2000,
    streamingBarrierId: 'NONE', streamingBarrierIndex: 0, cinemaBarrierId: 'NONE', cinemaBarrierIndex: 0,
};
const pricing = structuredClone(INITIAL_PLAYER.ownedStreamingPlatform.serviceConfiguration.pricing);
const baseOffer = (platformId: string): WorldStreamingPlatformOffer => ({
    platformId, name: platformId, isPlayer: platformId === 'PLAYER', activeCountryIds: ['US'],
    plans: [], commercialConfiguration: structuredClone(pricing), annualDiscountPercent: 0,
    introOfferPercent: 0, catalogueStrengthIndex: 70, localizationStrengthIndex: 70,
    reputationIndex: 70, reliabilityIndex: 70, marketingIndex: 70, loyaltyIndex: 70,
    countryMomentum: {}, preferredGenres: [], sourceFingerprint: platformId,
});
const paid: WorldStreamingPlatformOffer = {
    ...baseOffer('PLAYER'),
    plans: [{ id: 'STANDARD', name: 'Standard', monthlyPrice: 12, effectiveMonthlyPrice: 12,
        monthlyBillingPrice: 12, annualBillingMonthlyPrice: 10, featureIds: ['hd'], ads: false, appealIndex: 60 }],
    commercialConfiguration: { ...pricing, streams: ['subs'] },
};
const free: WorldStreamingPlatformOffer = {
    ...baseOffer('RIVAL_AD'),
    plans: [{ id: 'FREE', name: 'Free', monthlyPrice: 0, effectiveMonthlyPrice: 0,
        monthlyBillingPrice: 0, annualBillingMonthlyPrice: 0, featureIds: ['catalogue'], ads: true, appealIndex: 50 }],
    commercialConfiguration: { ...pricing, streams: ['ads'], plans: [] },
};
const store: WorldStreamingPlatformOffer = {
    ...baseOffer('RIVAL_STORE'),
    commercialConfiguration: { ...pricing, streams: ['rentals'], plans: [], rentals: { rent: 5, buy: 18, windowWeeks: 4 } },
};

const inspect = (offers: WorldStreamingPlatformOffer[]) => allocateStreamingAudienceChoice('US', cohort, participation, offers);
const chosen = inspect([paid, free, store]);
assert.deepEqual(chosen, inspect([store, paid, free]), 'offer order cannot change household choice');
assert.equal(chosen.reachableHouseholds, 1000);
assert.equal(chosen.primarySubscriptions + chosen.freeAdHouseholds + chosen.storeHouseholds + chosen.outsideHouseholds,
    1000, 'one primary choice per reachable household');
assert.ok(chosen.freeAdHouseholds > 0 && chosen.storeHouseholds > 0 && chosen.primarySubscriptions > 0,
    'hybrid markets expose all three real choices');
assert.ok(chosen.monthlySubscriptions > 0 && chosen.annualSubscriptions > 0,
    'paid monthly and annual billing paths remain distinct');
assert.ok(chosen.paidMonthlySpend <= 18000, 'paid subscriptions respect the existing cohort budget');
assert.equal(chosen.allocations.filter(row => row.planId === 'FREE').length, 0,
    'free access never masquerades as a paid plan');
assert.ok(chosen.allocations.some(row => row.platformId === 'RIVAL_AD' && row.kind === 'FREE_AD'));
assert.ok(chosen.allocations.some(row => row.platformId === 'RIVAL_STORE' && row.kind === 'STORE'));
const lessPriceSensitive = allocateStreamingAudienceChoice('US', { ...cohort, priceSensitivityIndex: 20 },
    participation, [paid, free, store]);
assert.ok(chosen.freeAdHouseholds > lessPriceSensitive.freeAdHouseholds,
    'higher price sensitivity should shift reachable households toward free access');
const sameAsAi = inspect([{ ...paid, platformId: 'RIVAL_PAID', isPlayer: false }, free, store]);
assert.equal(sameAsAi.primarySubscriptions, chosen.primarySubscriptions,
    'player and AI identity must not change the shared choice kernel');

const noPaid = inspect([free, store]);
assert.equal(noPaid.primarySubscriptions, 0);
assert.equal(noPaid.allocations.filter(row => row.kind === 'SUBSCRIPTION').length, 0);
assert.equal(inspect([]).outsideHouseholds, 1000);
const adOnly = inspect([free]);
assert.equal(adOnly.primarySubscriptions, 0);
assert.equal(adOnly.storeHouseholds, 0);
assert.ok(adOnly.freeAdHouseholds > 0);
const expensiveStore = { ...store, commercialConfiguration: {
    ...store.commercialConfiguration, rentals: { ...store.commercialConfiguration.rentals, rent: 1000 },
} };
assert.equal(inspect([expensiveStore]).storeHouseholds, 0, 'unaffordable store cannot claim households');

const player = structuredClone(INITIAL_PLAYER);
const week = 40;
const before = JSON.stringify(player);
const state = normalizeWorldStreamingAudienceChoiceState(undefined, player, week);
assert.equal(JSON.stringify(player), before, 'projection does not mutate canonical player input');
assert.deepEqual(normalizeWorldStreamingAudienceChoiceState(state, player, week), state,
    'same-week normalization never duplicates audiences or entitlements');
const changedOffer = structuredClone(player);
changedOffer.ownedStreamingPlatform.lifecycle = 'ACTIVE';
changedOffer.ownedStreamingPlatform.identity = {
    name: 'Empire+', slug: 'empire-plus', primaryColor: '#f00', secondaryColor: '#111',
    logoKey: 'FRAME_PLAY', brandPromiseId: 'BALANCED', publicManifesto: 'Stories.',
    dayOneMarketIds: ['US'], launchServerCityId: null, foundedAtAbsoluteWeek: week - 1,
};
changedOffer.ownedStreamingPlatform.serviceConfiguration.pricing.streams = ['ads'];
const changedState = normalizeWorldStreamingAudienceChoiceState(state, changedOffer, week);
assert.notEqual(changedState.sourceFingerprint, state.sourceFingerprint,
    'same-week offer edits must invalidate a stale audience projection');
const malformed = structuredClone(state);
malformed.global.reachableHouseholds = Number.NaN;
assert.equal(Number.isFinite(normalizeWorldStreamingAudienceChoiceState(malformed, player, week).global.reachableHouseholds), true,
    'malformed saved projections must rebuild');
const passPlayer = structuredClone(changedOffer);
passPlayer.ownedStreamingPlatform.serviceConfiguration.pricing.streams = ['subs', 'ads'];
passPlayer.ownedStreamingPlatform.serviceConfiguration.pricing.plans = [
    { id: 'AD_TIER', name: 'Ad tier', monthly: 4.99, featureIds: ['hd'], ads: true },
];
passPlayer.ownedStreamingPlatform.serviceConfiguration.pricing.commercialOffers = {
    schemaVersion: 1, coreModel: 'SUBSCRIPTION', freeAdAccess: false,
    adFreePasses: { oneHourPrice: null, dayPrice: 2 },
    benefits: { plans: {}, freeAds: { premiumAccess: false, earlyAccessWeeks: 0 },
        store: { premiumAccess: false, earlyAccessWeeks: 0 } },
};
// Pass demand requires an actual title covered by the ad-supported plan.
passPlayer.world.projects.push({ id: 'c3-pass-film', title: 'C3 Pass Film', genre: 'DRAMA',
    mediaType: 'MOVIE', quality: 80, rating: 8, originalLanguageId: 'English', year: passPlayer.age } as any);
const passLicense = createStreamingLicenseContract({
    id: 'c3-pass-license', sourceProject: { id: 'c3-pass-film', title: 'C3 Pass Film' },
    buyerPlatformId: null, platformContentPlanId: null, cataloguePackageId: null,
    licensorName: 'C3 Studio', territory: 'GLOBAL', durationWeeks: 52,
    exclusivity: 'NON_EXCLUSIVE', minimumGuarantee: 0, platformRevenueShare: 100,
    signedAtAbsoluteWeek: week - 1, startsAtAbsoluteWeek: week - 1,
    origin: 'STUDIO_MARKET', sellerType: 'STUDIO', sellerPlatformId: null, windowType: 'FIRST_WINDOW',
});
passLicense.accessGrant = { schemaVersion: 1, modes: ['SUBSCRIPTION'], earlyWindowWeeks: 0,
    purchaseFulfillment: 'NONE', source: 'EXPLICIT' };
passPlayer.ownedStreamingPlatform.catalogLicenses = [passLicense];
const passState = normalizeWorldStreamingAudienceChoiceState(undefined, passPlayer, week);
assert.ok(passState.platforms.PLAYER?.passOpportunities > 0,
    'ad-supported subscription households can choose optional ad-free passes without becoming extra households');
assert.equal(state.global.reachableHouseholds,
    state.global.primarySubscriptions + state.global.freeAdHouseholds + state.global.storeHouseholds + state.global.outsideHouseholds);
assert.equal(Object.values(state.platforms).reduce((sum, row) => sum + row.primarySubscriptions, 0),
    state.global.primarySubscriptions, 'platform choices reconcile to one global primary subscription count');
assert.equal(state.global.settledRevenue, 0, 'C3 is a shadow projection and never settles cash');
const stateBytes = Buffer.byteLength(JSON.stringify(state));
assert.ok(stateBytes < 180_000, `C3 country/platform aggregate should stay compact (${stateBytes} bytes)`);
const migrated = migratePlayerSave(player);
assert.ok(migrated.world.worldStreamingAudienceChoice, 'save migration creates the C3 projection');
assert.equal(migrated.world.worldStreamingAudienceChoice?.global.settledRevenue, 0);
const migratedTwice = migratePlayerSave(migrated);
assert.deepEqual(migratedTwice.world.worldStreamingAudienceChoice, migrated.world.worldStreamingAudienceChoice,
    'save migration is idempotent for C3');

const rightsPlayer = structuredClone(changedOffer);
rightsPlayer.ownedStreamingPlatform.serviceConfiguration.pricing.streams = ['rentals'];
rightsPlayer.ownedStreamingPlatform.serviceConfiguration.pricing.rentals.windowWeeks = 4;
const license = createStreamingLicenseContract({
    id: 'c3-owned-license', sourceProject: { id: 'c3-title', title: 'C3 Title' },
    buyerPlatformId: null, platformContentPlanId: null, cataloguePackageId: null,
    licensorName: 'C3 Studio', territory: 'GLOBAL', durationWeeks: 20,
    exclusivity: 'NON_EXCLUSIVE', minimumGuarantee: 0, platformRevenueShare: 100,
    signedAtAbsoluteWeek: week - 1, startsAtAbsoluteWeek: week - 1,
    origin: 'STUDIO_MARKET', sellerType: 'STUDIO', sellerPlatformId: null,
    windowType: 'PERMANENT',
});
license.accessGrant = { schemaVersion: 1, modes: ['RENTAL', 'PURCHASE'], earlyWindowWeeks: 0,
    purchaseFulfillment: 'PERPETUAL', source: 'EXPLICIT' };
rightsPlayer.ownedStreamingPlatform.catalogLicenses = [license];
const rightsState = normalizeWorldStreamingAudienceChoiceState(undefined, rightsPlayer, week);
assert.ok(rightsState.countries.US.playerStoreHouseholds > 0, 'store-only player has reachable buyers');
const rental = recordPlayerStreamingAudienceEntitlement(rightsState, rightsPlayer, {
    transactionId: 'c3-rent-1', countryId: 'US', titleId: 'c3-title', kind: 'RENTAL',
    households: 1, purchasedAtAbsoluteWeek: week,
});
assert.equal(rental.entitlements[0].expiresAtAbsoluteWeek, week + 4);
assert.deepEqual(recordPlayerStreamingAudienceEntitlement(rental, rightsPlayer, {
    transactionId: 'c3-rent-1', countryId: 'US', titleId: 'c3-title', kind: 'RENTAL',
    households: 1, purchasedAtAbsoluteWeek: week,
}), rental, 'duplicate transaction IDs never duplicate household ownership');
assert.equal(normalizeWorldStreamingAudienceChoiceState(rental, rightsPlayer, week + 3).entitlements.length, 1);
assert.equal(normalizeWorldStreamingAudienceChoiceState(rental, rightsPlayer, week + 4).entitlements.length, 0,
    'rental expires at its exclusive end week');
const purchase = recordPlayerStreamingAudienceEntitlement(rightsState, rightsPlayer, {
    transactionId: 'c3-buy-1', countryId: 'US', titleId: 'c3-title', kind: 'PURCHASE',
    households: 1, purchasedAtAbsoluteWeek: week,
});
assert.equal(normalizeWorldStreamingAudienceChoiceState(purchase, rightsPlayer, week + 52).entitlements.length, 1,
    'C2-approved durable purchase remains in the aggregate ledger after ordinary rights expiry');
const signedPlayer = { ...rightsPlayer, world: { ...rightsPlayer.world, worldStreamingAudienceChoice: purchase } };
const savedPurchase = migratePlayerSave(signedPlayer);
assert.equal(savedPurchase.world.worldStreamingAudienceChoice?.entitlements[0]?.transactionId, 'c3-buy-1',
    'old/new save normalization keeps C2-validated aggregate purchase ownership');
assert.deepEqual(migratePlayerSave(savedPurchase).world.worldStreamingAudienceChoice,
    savedPurchase.world.worldStreamingAudienceChoice, 'purchase ownership survives a second save migration');
const manifest = createSaveIntegrityManifest(signedPlayer, 'MANUAL', 123);
const tampered = structuredClone(signedPlayer);
tampered.world.worldStreamingAudienceChoice!.entitlements[0].households = 99;
assert.equal(verifySaveIntegrity(tampered, manifest).ok, false,
    'save integrity protects aggregate title ownership from tampering');
assert.throws(() => recordPlayerStreamingAudienceEntitlement(rightsState, rightsPlayer, {
    transactionId: 'c3-denied', countryId: 'CA', titleId: 'c3-title', kind: 'RENTAL',
    households: 1, purchasedAtAbsoluteWeek: week,
}), /denied|exceeds/, 'country access cannot be invented by the C3 ledger');
const noPurchaseRights = structuredClone(rightsPlayer);
noPurchaseRights.ownedStreamingPlatform.catalogLicenses[0].accessGrant!.purchaseFulfillment = 'NONE';
assert.throws(() => recordPlayerStreamingAudienceEntitlement(rightsState, noPurchaseRights, {
    transactionId: 'c3-no-buy', countryId: 'US', titleId: 'c3-title', kind: 'PURCHASE',
    households: 1, purchasedAtAbsoluteWeek: week,
}), /PURCHASE_FULFILLMENT_MISSING/, 'C3 cannot sell a non-durable purchase');
console.log(`C3 audience choice audit passed; initial aggregate ${stateBytes} bytes.`);
