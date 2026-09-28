import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER } from '../types';
import { createStreamingLicenseContract } from '../services/streamingRightsCore';
import { migratePlayerSave } from '../services/saveMigration';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { intersectStreamingRightsAccessGrants, normalizeStreamingRightsAccessGrant } from '../services/streamingRightsAccessGrant';
import { createPlatformAiFixture } from './helpers/platformAiFixture';
import { normalizeWorldPlatformAi } from '../services/platformAi/platformAiState';
import { settleStreamingRightsSublicense, settleStreamingRightsTransfer } from '../services/streamingRightsTransactions';
import { getStreamingRightsOpportunities, openStreamingRightsNegotiation, reviseStreamingRightsNegotiation } from '../services/streamingRightsMarketplace';
import { evaluateStreamingTitleRoute, evaluateStreamingTitlePlayback } from '../services/streamingTitleAccess';
import { projectStreamingCommercialOffers } from '../services/streamingCommercialOffers';
import { evaluatePlayerStreamingTitleRoute, getStreamingContentAvailability } from '../services/streamingContentAvailability';
import { calculateWorldStreamingCommercialRevenue } from '../services/worldEconomy/worldStreamingCommercialEconomy';
import { getWorldStreamingOffers } from '../services/worldEconomy/worldStreamingOffers';
import StreamingAccessGrantEditor from '../components/StreamingAccessGrantEditor';

const finiteGrantMarkup = renderToStaticMarkup(React.createElement(StreamingAccessGrantEditor, {
    grant: {
        schemaVersion: 1, modes: ['SUBSCRIPTION', 'RENTAL'], earlyWindowWeeks: 0,
        purchaseFulfillment: 'NONE', source: 'EXPLICIT',
    },
    permanentWindow: false,
    onChange: () => undefined,
}));
assert.match(finiteGrantMarkup, /Title access rights/);
assert.match(finiteGrantMarkup, /Permanent purchase/);
assert.match(finiteGrantMarkup, /disabled=""/, 'a finite window must visibly disable permanent purchase');

const legacyPlayer = structuredClone(INITIAL_PLAYER);
const currentWeek = getAbsoluteWeek(legacyPlayer.age, legacyPlayer.currentWeek);
legacyPlayer.ownedStreamingPlatform.serviceConfiguration.pricing.streams = ['subs', 'ads', 'rentals'];
legacyPlayer.ownedStreamingPlatform.catalogLicenses = [createStreamingLicenseContract({
    id: 'c2-legacy-license',
    sourceProject: { id: 'c2-legacy-title', title: 'Legacy Title' },
    buyerPlatformId: null,
    platformContentPlanId: null,
    cataloguePackageId: null,
    licensorName: 'Legacy Studio',
    territory: 'GLOBAL',
    durationWeeks: 52,
    exclusivity: 'NON_EXCLUSIVE',
    minimumGuarantee: 0,
    platformRevenueShare: 100,
    signedAtAbsoluteWeek: currentWeek,
    startsAtAbsoluteWeek: currentWeek,
    origin: 'STUDIO_MARKET',
    sellerType: 'STUDIO',
    sellerPlatformId: null,
    windowType: 'FIRST_WINDOW',
})];

const once = migratePlayerSave(legacyPlayer);
const permanentLegacy = structuredClone(legacyPlayer);
permanentLegacy.ownedStreamingPlatform.catalogLicenses = [{
    ...permanentLegacy.ownedStreamingPlatform.catalogLicenses[0],
    id: 'c2-legacy-permanent', windowType: 'PERMANENT', permanentPurchase: true,
    expiresAtAbsoluteWeek: Number.MAX_SAFE_INTEGER,
}];
const permanentMigrated = migratePlayerSave(permanentLegacy);
assert.equal(permanentMigrated.world.streamingRightsContracts?.['c2-legacy-permanent']?.accessGrant?.purchaseFulfillment,
    'PERPETUAL', 'an actual old permanent acquisition can retain durable purchase fulfillment');
const contract = once.world.streamingRightsContracts?.['c2-legacy-license'];
assert.ok(contract, 'legacy buyer-local position must import into the canonical registry');
assert.deepEqual(contract.accessGrant?.modes, ['SUBSCRIPTION', 'AD_SUPPORTED', 'RENTAL'],
    'legacy rights must snapshot active access modes once');
assert.equal(contract.accessGrant?.earlyWindowWeeks, 0);
assert.equal(contract.accessGrant?.purchaseFulfillment, 'NONE');
assert.deepEqual(once.ownedStreamingPlatform.catalogLicenses[0]?.accessGrant, contract.accessGrant,
    'buyer-local licence and canonical contract must agree after migration');
const switched = structuredClone(once);
switched.ownedStreamingPlatform.serviceConfiguration.pricing.streams = ['subs', 'ads', 'rentals'];
const twice = migratePlayerSave(switched);
assert.deepEqual(twice.world.streamingRightsContracts?.['c2-legacy-license']?.accessGrant, contract.accessGrant,
    'later offer changes must not widen an existing contract');
assert.deepEqual(twice.ownedStreamingPlatform.weeklyHistory, once.ownedStreamingPlatform.weeklyHistory,
    'grant migration must not rewrite settled owned-platform weekly history');
assert.deepEqual(twice.world.worldStreamingPlatformEconomy?.snapshots,
    once.world.worldStreamingPlatformEconomy?.snapshots,
    'grant migration must not replay or rewrite settled world economy snapshots');

assert.deepEqual(normalizeStreamingRightsAccessGrant({
    schemaVersion: 1,
    modes: ['RENTAL', 'SUBSCRIPTION', 'RENTAL', 'bogus'],
    earlyWindowWeeks: Number.POSITIVE_INFINITY,
    purchaseFulfillment: 'PERPETUAL',
    source: 'EXPLICIT',
}), {
    schemaVersion: 1,
    modes: ['SUBSCRIPTION', 'RENTAL'],
    earlyWindowWeeks: 0,
    purchaseFulfillment: 'NONE',
    source: 'EXPLICIT',
});
assert.deepEqual(intersectStreamingRightsAccessGrants({
    schemaVersion: 1, modes: ['SUBSCRIPTION'], earlyWindowWeeks: 0,
    purchaseFulfillment: 'NONE', source: 'EXPLICIT',
}, {
    schemaVersion: 1, modes: ['SUBSCRIPTION', 'AD_SUPPORTED'], earlyWindowWeeks: 3,
    purchaseFulfillment: 'NONE', source: 'EXPLICIT',
}), {
    schemaVersion: 1, modes: ['SUBSCRIPTION'], earlyWindowWeeks: 0,
    purchaseFulfillment: 'NONE', source: 'EXPLICIT',
}, 'successor grant cannot exceed upstream modes or early weeks');

const corrupted = structuredClone(once);
corrupted.world.streamingRightsContracts!['c2-legacy-license'].accessGrant = { schemaVersion: 7 } as never;
corrupted.ownedStreamingPlatform.serviceConfiguration.pricing.streams = ['subs', 'ads', 'rentals'];
const repaired = migratePlayerSave(corrupted);
assert.deepEqual(repaired.world.streamingRightsContracts?.['c2-legacy-license']?.accessGrant?.modes, [],
    'an explicit but malformed grant must deny, not resnapshot a broad current offer');

const aiFixture = createPlatformAiFixture();
aiFixture.age = 2;
aiFixture.currentWeek = 29;
aiFixture.world = normalizeWorldPlatformAi(aiFixture, aiFixture.world, 80);
const source = {
    ...contract,
    id: 'c2-ai-source',
    idempotencyKey: 'c2-ai-source',
    territory: 'MULTI_REGION' as const,
    countryIds: ['US'],
    signedAtAbsoluteWeek: 40,
    startsAtAbsoluteWeek: 40,
    expiresAtAbsoluteWeek: 140,
    durationWeeks: 100,
    sublicensingAllowed: true,
    buyer: { type: 'AI_PLATFORM' as const, id: 'HULU', name: 'Hulu', platformId: 'HULU' },
    buyerPlatformId: 'HULU',
    seller: { type: 'NPC_STUDIO' as const, id: 'c2-studio', name: 'C2 Studio', platformId: null },
    accessGrant: {
        schemaVersion: 1 as const,
        modes: ['SUBSCRIPTION', 'AD_SUPPORTED'] as Array<'SUBSCRIPTION' | 'AD_SUPPORTED'>,
        earlyWindowWeeks: 2,
        purchaseFulfillment: 'NONE' as const,
        source: 'EXPLICIT' as const,
    },
};
const explicitLicense = createStreamingLicenseContract({
    id: 'c2-new-deal',
    sourceProject: { id: 'c2-new-title', title: 'New Title' },
    buyerPlatformId: null,
    platformContentPlanId: null,
    cataloguePackageId: null,
    licensorName: 'New Studio',
    territory: 'GLOBAL',
    durationWeeks: 52,
    exclusivity: 'NON_EXCLUSIVE',
    minimumGuarantee: 0,
    platformRevenueShare: 100,
    signedAtAbsoluteWeek: currentWeek,
    startsAtAbsoluteWeek: currentWeek,
    origin: 'STUDIO_MARKET',
    sellerType: 'STUDIO',
    sellerPlatformId: null,
    windowType: 'FIRST_WINDOW',
    accessGrant: source.accessGrant,
});
assert.deepEqual(explicitLicense.accessGrant, source.accessGrant,
    'new signing must freeze explicitly negotiated access permissions');
aiFixture.world.streamingRightsContracts = { [source.id]: source };
aiFixture.world.platforms!.HULU.ai!.rightsContracts = [source];
const legacyAi = structuredClone(aiFixture);
delete legacyAi.world.streamingRightsContracts![source.id].accessGrant;
delete legacyAi.world.platforms!.HULU.ai!.rightsContracts[0].accessGrant;
const aiMigrated = migratePlayerSave(legacyAi);
assert.ok((aiMigrated.world.streamingRightsContracts?.[source.id]?.accessGrant?.modes.length || 0) > 0,
    'an AI buyer must receive a persisted, finite legacy access snapshot');
assert.deepEqual(migratePlayerSave(structuredClone(aiMigrated)).world.streamingRightsContracts?.[source.id]?.accessGrant,
    aiMigrated.world.streamingRightsContracts?.[source.id]?.accessGrant,
    'the AI snapshot must not shift on a second save migration');
const sublicensed = settleStreamingRightsSublicense(aiFixture, {
    sourceContractId: source.id,
    seller: source.buyer,
    buyer: { type: 'AI_PLATFORM', id: 'NETFLIX', name: 'Netflix', platformId: 'NETFLIX' },
    territory: 'MULTI_REGION',
    countryIds: ['US'],
    windowType: 'FIRST_WINDOW',
    exclusivity: 'NON_EXCLUSIVE',
    durationWeeks: 20,
    price: 10_000_000,
    buyerRevenueShare: 80,
    absoluteWeek: 80,
    idempotencyKey: 'c2-sublicense-subset',
    controllerAtCommitment: { seller: 'AI', buyer: 'AI' },
    requestedAccessGrant: {
        schemaVersion: 1,
        modes: ['AD_SUPPORTED', 'PURCHASE'],
        earlyWindowWeeks: 4,
        purchaseFulfillment: 'PERPETUAL',
        source: 'EXPLICIT',
    },
});
assert.equal(sublicensed.changed, true, 'valid bounded sublicense should settle');
if (!sublicensed.changed) throw new Error('C2 sublicense fixture did not settle');
assert.deepEqual(sublicensed.successorContract.accessGrant?.modes, ['AD_SUPPORTED'],
    'sublicense may not preserve unrequested modes or add modes the source lacks');
assert.equal(sublicensed.successorContract.accessGrant?.earlyWindowWeeks, 2,
    'sublicense early lead cannot exceed source');
const transferred = settleStreamingRightsTransfer(aiFixture, {
    sourceContractId: source.id,
    seller: source.buyer,
    buyer: { type: 'AI_PLATFORM', id: 'NETFLIX', name: 'Netflix', platformId: 'NETFLIX' },
    price: 10_000_000,
    absoluteWeek: 80,
    idempotencyKey: 'c2-transfer-subset',
    controllerAtCommitment: { seller: 'AI', buyer: 'AI' },
    requestedAccessGrant: {
        schemaVersion: 1, modes: ['AD_SUPPORTED'], earlyWindowWeeks: 1,
        purchaseFulfillment: 'NONE', source: 'EXPLICIT',
    },
});
assert.equal(transferred.changed, true);
if (!transferred.changed) throw new Error('C2 transfer fixture did not settle');
assert.deepEqual(transferred.successorContract.accessGrant?.modes, ['AD_SUPPORTED']);
assert.equal(transferred.successorContract.accessGrant?.earlyWindowWeeks, 1);

const marketFixture = structuredClone(aiFixture);
marketFixture.ownedStreamingPlatform.lifecycle = 'ACTIVE';
marketFixture.ownedStreamingPlatform.identity = {
    name: 'EMPIRE+', slug: 'empire-plus', primaryColor: '#f5b942', secondaryColor: '#08090c',
    logoKey: 'SIGNAL_RING', brandPromiseId: 'EVENT_HOUSE',
    publicManifesto: 'Big stories deserve a global stage.', foundedAtAbsoluteWeek: 52,
};
marketFixture.ownedStreamingPlatform.starterCatalog = {
    packageId: 'CURATED_PREMIERE', ownedProjectIds: [], licensedProjectIds: [], establishedAtAbsoluteWeek: 60,
};
marketFixture.ownedStreamingPlatform.treasuryCash = 200_000_000;
marketFixture.ownedStreamingPlatform.serviceConfiguration.pricing.streams = ['subs', 'ads'];
const resale = getStreamingRightsOpportunities(marketFixture).find(opportunity => (
    opportunity.kind === 'PLATFORM_TRADE' && opportunity.sourceLicenseId === source.id
));
assert.ok(resale, 'the AI-held source must be available for a bounded player resale');
const opened = openStreamingRightsNegotiation(marketFixture, resale.id);
assert.equal(opened.changed, true);
assert.deepEqual(opened.negotiation?.accessGrant?.modes, ['SUBSCRIPTION', 'AD_SUPPORTED'],
    'default term sheet must inherit the seller source ceiling, not create purchase rights');
if (!opened.negotiation) throw new Error('C2 resale negotiation did not open');
const widenedRevision = reviseStreamingRightsNegotiation(opened.player, opened.negotiation.id, {
    ...opened.negotiation,
    accessGrant: {
        schemaVersion: 1, modes: ['SUBSCRIPTION', 'AD_SUPPORTED', 'RENTAL', 'PURCHASE'],
        earlyWindowWeeks: 4, purchaseFulfillment: 'PERPETUAL', source: 'EXPLICIT',
    },
});
assert.deepEqual(widenedRevision.negotiation?.accessGrant, opened.negotiation.accessGrant,
    'revising an inherited transfer must never expand its title entitlement');
const malformedRevision = reviseStreamingRightsNegotiation(opened.player, opened.negotiation.id, {
    ...opened.negotiation, accessGrant: { schemaVersion: 99 } as never,
});
assert.deepEqual(malformedRevision.negotiation?.accessGrant, opened.negotiation.accessGrant,
    'an exact transfer remains fixed even when a malformed grant is submitted');
const subscriptionOnlyBuyer = structuredClone(marketFixture);
subscriptionOnlyBuyer.ownedStreamingPlatform.serviceConfiguration.pricing.streams = ['subs'];
const exactTransfer = openStreamingRightsNegotiation(subscriptionOnlyBuyer, resale.id);
assert.deepEqual(exactTransfer.negotiation?.accessGrant?.modes, ['SUBSCRIPTION', 'AD_SUPPORTED'],
    'an exact transfer retains its full fixed rights even if the buyer currently uses only subscriptions');

const accessPricing = structuredClone(INITIAL_PLAYER.ownedStreamingPlatform.serviceConfiguration.pricing);
accessPricing.streams = ['subs', 'ads', 'rentals'];
accessPricing.plans = [
    { id: 'ESSENTIAL', name: 'Essential', monthly: 7.99, featureIds: [], ads: false },
    { id: 'PREMIERE', name: 'Premiere', monthly: 17.99, featureIds: ['early'], ads: false },
];
accessPricing.commercialOffers = {
    schemaVersion: 1, coreModel: 'SUBSCRIPTION', freeAdAccess: true,
    adFreePasses: { oneHourPrice: 1, dayPrice: 3 },
    benefits: {
        plans: {
            PREMIERE: { premiumAccess: true, earlyAccessWeeks: 2 },
        },
        freeAds: { premiumAccess: false, earlyAccessWeeks: 0 },
        store: { premiumAccess: false, earlyAccessWeeks: 0 },
    },
};
const accessOffers = projectStreamingCommercialOffers(accessPricing);
const aiOffer = getWorldStreamingOffers(aiMigrated, 80).offers.find(offer => offer.platformId === 'HULU');
assert.ok(aiOffer, 'AI source contract needs its buyer platform offer fixture');
const aiAccess = evaluateStreamingTitleRoute({
    titleId: source.sourceProjectId, countryId: 'US', absoluteWeek: 80,
    productionReadyAtAbsoluteWeek: 0, generalReleaseAtAbsoluteWeek: 80,
    marketActive: true, offer: projectStreamingCommercialOffers(aiOffer.commercialConfiguration),
    route: { kind: 'AD_SUPPORTED' },
    position: {
        contractId: source.id, territory: source.territory, countryIds: source.countryIds,
        startsAtAbsoluteWeek: source.startsAtAbsoluteWeek,
        expiresAtAbsoluteWeek: source.expiresAtAbsoluteWeek, status: 'ACTIVE',
        accessGrant: aiMigrated.world.streamingRightsContracts![source.id].accessGrant!,
    },
});
assert.equal(aiAccess.allowed, true, 'AI and player positions use the same C2 route evaluator');
const accessFixture = {
    titleId: 'c2-premiere', countryId: 'US', absoluteWeek: 98,
    productionReadyAtAbsoluteWeek: 95, generalReleaseAtAbsoluteWeek: 100,
    marketActive: true, offer: accessOffers,
    position: {
        contractId: 'c2-access-right', territory: 'MULTI_REGION' as const, countryIds: ['US'],
        startsAtAbsoluteWeek: 90, expiresAtAbsoluteWeek: 160,
        status: 'ACTIVE' as const,
        accessGrant: {
            schemaVersion: 1 as const,
            modes: ['SUBSCRIPTION', 'AD_SUPPORTED', 'RENTAL', 'PURCHASE'] as Array<'SUBSCRIPTION' | 'AD_SUPPORTED' | 'RENTAL' | 'PURCHASE'>,
            earlyWindowWeeks: 2, purchaseFulfillment: 'PERPETUAL' as const, source: 'EXPLICIT' as const,
        },
    },
};
const protectedFixture = structuredClone(accessFixture);
const deniedRoutes = [
    [{ ...accessFixture, position: null, route: { kind: 'SUBSCRIPTION', planId: 'PREMIERE' } }, 'RIGHTS_MISSING'],
    [{ ...accessFixture, productionReadyAtAbsoluteWeek: 99, route: { kind: 'SUBSCRIPTION', planId: 'PREMIERE' } }, 'PRODUCTION_NOT_READY'],
    [{ ...accessFixture, position: { ...accessFixture.position, startsAtAbsoluteWeek: 99 }, route: { kind: 'SUBSCRIPTION', planId: 'PREMIERE' } }, 'RIGHTS_NOT_STARTED'],
    [{ ...accessFixture, position: { ...accessFixture.position, status: 'TRANSFERRED_OUT' }, route: { kind: 'SUBSCRIPTION', planId: 'PREMIERE' } }, 'RIGHTS_TRANSFERRED'],
    [{ ...accessFixture, position: { ...accessFixture.position, accessGrant: { ...accessFixture.position.accessGrant, modes: ['RENTAL'] } }, route: { kind: 'SUBSCRIPTION', planId: 'PREMIERE' } }, 'MODE_NOT_GRANTED'],
] as const;
for (const [input, reason] of deniedRoutes) {
    assert.equal(evaluateStreamingTitleRoute(input as Parameters<typeof evaluateStreamingTitleRoute>[0]).reasonCode, reason);
}
assert.equal(evaluateStreamingTitlePlayback({
    ...accessFixture, absoluteWeek: 101, route: { kind: 'SUBSCRIPTION', planId: 'PREMIERE' },
    viewerProof: { kind: 'SUBSCRIPTION', planId: 'ESSENTIAL' },
}).reasonCode, 'PLAN_ENTITLEMENT_MISSING');
assert.equal(evaluateStreamingTitlePlayback({
    ...accessFixture, absoluteWeek: 101, route: { kind: 'RENTAL' },
}).reasonCode, 'VIEWER_ENTITLEMENT_MISSING');
assert.deepEqual(accessFixture, protectedFixture, 'C2 decisions must not mutate their inputs');
assert.equal(evaluateStreamingTitleRoute({
    ...accessFixture, route: { kind: 'SUBSCRIPTION', planId: 'PREMIERE' },
}).allowed, true, 'contract and plan should permit a two-week early title');
assert.equal(evaluateStreamingTitleRoute({
    ...accessFixture, route: { kind: 'SUBSCRIPTION', planId: 'ESSENTIAL' },
}).reasonCode, 'EARLY_WINDOW_DENIED', 'base plan cannot inherit the premium early window');
assert.equal(evaluateStreamingTitleRoute({
    ...accessFixture, position: { ...accessFixture.position, accessGrant: {
        ...accessFixture.position.accessGrant, earlyWindowWeeks: 0,
    } }, route: { kind: 'SUBSCRIPTION', planId: 'PREMIERE' },
}).reasonCode, 'NOT_RELEASED', 'an ungranted early window leaves a scheduled title unreleased');
assert.equal(evaluateStreamingTitleRoute({
    ...accessFixture, countryId: 'CA', route: { kind: 'SUBSCRIPTION', planId: 'PREMIERE' },
}).reasonCode, 'TERRITORY_DENIED', 'market rights must cover the viewer country');
assert.equal(evaluateStreamingTitleRoute({
    ...accessFixture, absoluteWeek: 159, route: { kind: 'RENTAL' },
}).reasonCode, 'RENTAL_WINDOW_TOO_SHORT', 'a rental cannot be sold without its full playback term');
assert.equal(evaluateStreamingTitlePlayback({
    ...accessFixture, absoluteWeek: 101, route: { kind: 'AD_SUPPORTED' },
    viewerProof: { kind: 'AD_SUPPORTED', adFreePassActive: true },
}).adEligible, false, 'a pass only suppresses ads on an allowed underlying route');
assert.equal(evaluateStreamingTitlePlayback({
    ...accessFixture, absoluteWeek: 101, route: { kind: 'RENTAL' },
    viewerProof: { kind: 'AD_SUPPORTED', adFreePassActive: true },
}).allowed, false, 'an ad-free pass is not a rental purchase');
assert.equal(evaluateStreamingTitlePlayback({
    ...accessFixture, absoluteWeek: 159, route: { kind: 'RENTAL' },
    viewerProof: { kind: 'RENTAL', purchasedAtAbsoluteWeek: 154 },
}).allowed, true, 'a valid earlier rental may be rewatched near rights expiry');
assert.equal(evaluateStreamingTitlePlayback({
    ...accessFixture, absoluteWeek: 160, route: { kind: 'RENTAL' },
    viewerProof: { kind: 'RENTAL', purchasedAtAbsoluteWeek: 154 },
}).reasonCode, 'RIGHTS_EXPIRED', 'rental playback cannot outlive the licensed window');
assert.equal(evaluateStreamingTitlePlayback({
    ...accessFixture, absoluteWeek: 200, route: { kind: 'PURCHASE' },
    viewerProof: { kind: 'PURCHASE', purchasedAtAbsoluteWeek: 101 },
}).allowed, true, 'a vested durable purchase survives ordinary distribution expiry');
assert.equal(evaluateStreamingTitlePlayback({
    ...accessFixture, absoluteWeek: 130, route: { kind: 'PURCHASE' },
    position: { ...accessFixture.position, status: 'TRANSFERRED_OUT', transferredAtAbsoluteWeek: 120 },
    viewerProof: { kind: 'PURCHASE', purchasedAtAbsoluteWeek: 101 },
}).allowed, true, 'a rights transfer retains playback owed to an earlier permanent buyer');
assert.equal(evaluateStreamingTitleRoute({
    ...accessFixture, absoluteWeek: 101, route: { kind: 'PURCHASE' },
    position: { ...accessFixture.position, accessGrant: {
        ...accessFixture.position.accessGrant, purchaseFulfillment: 'NONE',
    } },
}).reasonCode, 'PURCHASE_FULFILLMENT_MISSING', 'finite rights cannot promise a permanent purchase');

const routePlayer = structuredClone(once);
routePlayer.ownedStreamingPlatform.catalogLicenses[0] = {
    ...routePlayer.ownedStreamingPlatform.catalogLicenses[0],
    territory: 'MULTI_REGION', countryIds: ['US'],
};
routePlayer.world.streamingRightsContracts!['c2-legacy-license'] = {
    ...routePlayer.world.streamingRightsContracts!['c2-legacy-license'],
    territory: 'MULTI_REGION', countryIds: ['US'],
};
const countryReport = getStreamingContentAvailability(routePlayer, 'c2-legacy-title', ['US', 'CA']);
assert.equal(countryReport.routesByCountry?.US?.SUBSCRIPTION?.allowed, true,
    'catalogue report should show a permitted title route');
assert.equal(countryReport.routesByCountry?.CA?.SUBSCRIPTION?.reasonCode, 'TERRITORY_DENIED',
    'catalogue report should explain a country-specific denial');
const unconfiguredMarket = structuredClone(routePlayer);
unconfiguredMarket.ownedStreamingPlatform.identity = { ...marketFixture.ownedStreamingPlatform.identity!, dayOneMarketIds: ['US'] };
unconfiguredMarket.ownedStreamingPlatform.catalogLicenses[0].territory = 'GLOBAL';
unconfiguredMarket.ownedStreamingPlatform.catalogLicenses[0].countryIds = [];
unconfiguredMarket.world.streamingRightsContracts!['c2-legacy-license'].territory = 'GLOBAL';
unconfiguredMarket.world.streamingRightsContracts!['c2-legacy-license'].countryIds = [];
assert.equal(evaluatePlayerStreamingTitleRoute(unconfiguredMarket, 'c2-legacy-title', 'CA', currentWeek,
    { kind: 'SUBSCRIPTION', planId: unconfiguredMarket.ownedStreamingPlatform.serviceConfiguration.pricing.plans[0]?.id || 'ESSENTIAL' }).reasonCode,
    'MARKET_INACTIVE', 'global title rights must not activate an unconfigured service market');
const overlappingRights = structuredClone(routePlayer);
const expiredSecondLicense = {
    ...overlappingRights.ownedStreamingPlatform.catalogLicenses[0],
    id: 'c2-expired-overlap', startsAtAbsoluteWeek: currentWeek - 2,
    expiresAtAbsoluteWeek: currentWeek - 1, status: 'EXPIRED' as const,
};
overlappingRights.ownedStreamingPlatform.catalogLicenses.push(expiredSecondLicense);
assert.equal(evaluatePlayerStreamingTitleRoute(overlappingRights, 'c2-legacy-title', 'US', currentWeek,
    { kind: 'SUBSCRIPTION', planId: overlappingRights.ownedStreamingPlatform.serviceConfiguration.pricing.plans[0]?.id || 'ESSENTIAL' }).allowed,
    true, 'one expired overlapping licence must not hide an earlier still-active licence');

const commercialBase = {
    pricing: accessPricing, paidViewingAccounts: 1_000_000, viewingAccounts: 1_000_000,
    nonSubscriberOpportunityAccounts: 100_000, hoursViewed: 2_000_000,
    estimatedViewers: 1_400_000, completionRate: .7, repeatViewingRate: .14,
    isFreshMovie: true, isRentalEligible: true, isSponsorEligible: false,
    commerceCapabilityIndex: 70, reputationIndex: 60,
};
const commercialBoth = calculateWorldStreamingCommercialRevenue(commercialBase);
assert.ok(commercialBoth.rentalTransactions > 0 && commercialBoth.purchaseTransactions > 0);
const noPurchase = calculateWorldStreamingCommercialRevenue({ ...commercialBase, isPurchaseEligible: false });
assert.equal(noPurchase.purchaseTransactions, 0, 'finite rental rights cannot create permanent purchase transactions');
assert.equal(noPurchase.rentalTransactions, commercialBoth.rentalTransactions,
    'purchase denial must not remove independently valid rentals');

const appealPlayer = structuredClone(routePlayer);
appealPlayer.ownedStreamingPlatform.lifecycle = 'ACTIVE';
appealPlayer.ownedStreamingPlatform.identity = {
    name: 'EMPIRE+', slug: 'empire-plus', primaryColor: '#f5b942', secondaryColor: '#08090c',
    logoKey: 'SIGNAL_RING', brandPromiseId: 'EVENT_HOUSE',
    publicManifesto: 'Stories on every screen.', foundedAtAbsoluteWeek: currentWeek - 10,
    dayOneMarketIds: ['US'],
};
appealPlayer.ownedStreamingPlatform.serviceConfiguration.pricing = accessPricing;
const earlyFeatureOffer = getWorldStreamingOffers(appealPlayer, currentWeek).offers.find(offer => offer.isPlayer);
assert.ok(earlyFeatureOffer);
const withoutFeature = structuredClone(appealPlayer);
withoutFeature.ownedStreamingPlatform.serviceConfiguration.pricing.plans[1].featureIds = [];
const noFeatureOffer = getWorldStreamingOffers(withoutFeature, currentWeek).offers.find(offer => offer.isPlayer);
assert.ok(noFeatureOffer);
assert.equal(earlyFeatureOffer.plans[1].appealIndex, noFeatureOffer.plans[1].appealIndex,
    'an early badge must not improve plan appeal when no title can play early');

console.log('C2 rights and entitlement audit passed');
