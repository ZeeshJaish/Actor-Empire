import assert from 'node:assert/strict';
import type { Player } from '../types';
import { createC6QaCareer } from '../lab/c6QaCareer';
import { filedMarketFixture } from './helpers/streamingFiledMarketFixture';
import { addStreamingAuditCatalogueTitle } from './helpers/streamingGrantedCatalogueFixture';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { getStreamingCatalogProjectIds } from '../services/streamingCatalog';
import { linkContentMarketOwnedTitles } from '../services/streamingContentMarket';
import { configureStreamingPricingOffer, projectStreamingCommercialOffers } from '../services/streamingCommercialOffers';
import { createStreamingLicenseContract, createStreamingRightsContractFromLicense } from '../services/streamingRightsCore';
import {
    createStreamingCatalogueReadContext,
    evaluatePlayerStreamingTitleRoute,
    getOwnedPlatformPackageCountryIds,
    getStreamingContentAvailability,
    getStreamingPlayableCatalogProjectIds,
} from '../services/streamingContentAvailability';
import { getStreamingOriginalLiveStatus } from '../services/streamingOriginals';
import type { StreamingTitleAccessRoute } from '../services/streamingTitleAccess';

let gateStates = 0;
const assertProjection = (player: Player, expected: string[], label: string) => {
    const before = JSON.stringify(player);
    const context = createStreamingCatalogueReadContext(player);
    const week = getAbsoluteWeek(player.age, player.currentWeek);
    const routes: Array<[string, StreamingTitleAccessRoute]> = [
        ...(context.offer.subscriptions.length ? context.offer.subscriptions.map(plan => (
            [`SUBSCRIPTION:${plan.id}`, { kind: 'SUBSCRIPTION', planId: plan.id }] as [string, StreamingTitleAccessRoute]
        )) : []),
        ['SUBSCRIPTION', { kind: 'SUBSCRIPTION', planId: context.offer.subscriptions[0]?.id || '' }],
        ['AD_SUPPORTED', { kind: 'AD_SUPPORTED' }], ['RENTAL', { kind: 'RENTAL' }], ['PURCHASE', { kind: 'PURCHASE' }],
    ];
    const fullMatrixIds = getStreamingCatalogProjectIds(context.platform).filter(projectId => {
        const availability = getStreamingContentAvailability(player, projectId, undefined, true, context);
        for (const countryId of context.packageCountryIds) for (const [key, route] of routes) {
            assert.deepEqual(availability.routesByCountry[countryId][key],
                evaluatePlayerStreamingTitleRoute(player, projectId, countryId, week, route),
                `${label}: full matrix must retain the direct canonical ${countryId}/${key} decision.`);
        }
        return availability.available && Object.values(availability.routesByCountry)
            .some(country => Object.values(country).some(route => route.allowed));
    });
    assert.deepEqual(fullMatrixIds, expected, `${label}: independently specified full-matrix eligibility.`);
    assert.deepEqual(getStreamingPlayableCatalogProjectIds(player), expected, `${label}: short-circuit projection.`);
    assert.deepEqual(getStreamingPlayableCatalogProjectIds(player, createStreamingCatalogueReadContext(player), 1),
        expected.slice(0, 1), `${label}: limiting preserves the first playable title and source order.`);
    assert.equal(JSON.stringify(player), before, `${label}: reads cannot mutate rights, cash or saved inputs.`);
    gateStates++;
};

const owned = filedMarketFixture(['US', 'IN']);
owned.ownedStreamingPlatform.lifecycle = 'ACTIVE';
owned.ownedStreamingPlatform.marketOperations = owned.ownedStreamingPlatform.marketOperations
    .map(operation => ({ ...operation, status: 'ACTIVE' }));
owned.ownedStreamingPlatform.serviceConfiguration.pricing = configureStreamingPricingOffer(
    owned.ownedStreamingPlatform.serviceConfiguration.pricing, { kind: 'CORE', coreModel: 'SUBSCRIPTION' });
const ownedId = owned.pastProjects[0].id;
const linked = linkContentMarketOwnedTitles(owned, [ownedId]);
assert.equal(linked.changed, true, linked.detail);
const ownedPlayer = linked.player;
const week = getAbsoluteWeek(ownedPlayer.age, ownedPlayer.currentWeek);
const licensedId = 'playable-licensed-control';
addStreamingAuditCatalogueTitle(ownedPlayer, week, licensedId);
ownedPlayer.ownedStreamingPlatform.catalogProjectIds.push(licensedId);

assert.equal(getStreamingContentAvailability(ownedPlayer, ownedId).source, 'OWNED');
assert.equal(getStreamingContentAvailability(ownedPlayer, licensedId).source, 'LICENSED');
assertProjection(ownedPlayer, [ownedId, licensedId], 'Owned library and licensed control are initially playable');
const rivalLicense = createStreamingLicenseContract({ id: 'playable-owned-conflict',
    sourceProject: { id: ownedId, title: ownedPlayer.pastProjects[0].name, mediaType: 'MOVIE', genre: 'DRAMA' },
    buyerPlatformId: 'NETFLIX', platformContentPlanId: null, cataloguePackageId: null,
    licensorName: 'Empire Studios', territory: 'GLOBAL', countryIds: [], durationWeeks: 26,
    exclusivity: 'EXCLUSIVE', minimumGuarantee: 0, platformRevenueShare: 100,
    signedAtAbsoluteWeek: week, startsAtAbsoluteWeek: week, origin: 'STUDIO_MARKET',
    sellerType: 'STUDIO', sellerPlatformId: null, windowType: 'FIRST_WINDOW',
});
const conflict = createStreamingRightsContractFromLicense({ license: rivalLicense,
    buyer: { type: 'AI_PLATFORM', id: 'NETFLIX', name: 'Netflix', platformId: 'NETFLIX' },
    guaranteeDisposition: 'PAID', settledAtAbsoluteWeek: week });
const conflicted: Player = { ...ownedPlayer, world: { ...ownedPlayer.world, streamingRightsContracts: {
    ...ownedPlayer.world.streamingRightsContracts, [conflict.id]: conflict,
} } };
assertProjection(conflicted, [licensedId], 'A current worldwide grant removes only the conflicted owned title');
const partiallyHeld: Player = { ...conflicted, world: { ...conflicted.world, streamingRightsContracts: {
    ...conflicted.world.streamingRightsContracts, [conflict.id]: { ...conflict, territory: 'DOMESTIC', countryIds: ['US'] },
} } };
assert.equal(evaluatePlayerStreamingTitleRoute(partiallyHeld, ownedId, 'US', week,
    { kind: 'SUBSCRIPTION', planId: partiallyHeld.ownedStreamingPlatform.serviceConfiguration.pricing.plans[0].id }).allowed, false);
assert.equal(evaluatePlayerStreamingTitleRoute(partiallyHeld, ownedId, 'IN', week,
    { kind: 'SUBSCRIPTION', planId: partiallyHeld.ownedStreamingPlatform.serviceConfiguration.pricing.plans[0].id }).allowed, true);
assertProjection(partiallyHeld, [ownedId, licensedId], 'An owned title remains playable in its other unencumbered country');
console.log('PASS current canonical owned grants and partial-country access');

const original = createC6QaCareer();
const platform = original.ownedStreamingPlatform;
const originalId = platform.originalCommissions[0].canonicalProjectId!;
const originalWeek = getAbsoluteWeek(original.age, original.currentWeek);
platform.lifecycle = 'ACTIVE';
platform.marketOperations = platform.marketOperations.map(operation => ({ ...operation, status: 'ACTIVE' }));
platform.catalogLicenses = []; platform.catalogProjectIds = []; platform.starterCatalog = null;
platform.launchSlate = { ...platform.launchSlate!, entries: platform.launchSlate!.entries.filter(entry => entry.projectId === originalId) };
platform.serviceConfiguration.pricing = configureStreamingPricingOffer({ ...platform.serviceConfiguration.pricing,
    plans: [{ id: 'STANDARD', name: 'Standard', monthly: 8, featureIds: [], ads: false },
        { id: 'EARLY', name: 'Early', monthly: 13, featureIds: [], ads: false }],
    commercialOffers: undefined,
}, { kind: 'CORE', coreModel: 'SUBSCRIPTION' });
for (const offer of ['ADS', 'STORE'] as const) platform.serviceConfiguration.pricing = configureStreamingPricingOffer(
    platform.serviceConfiguration.pricing, { kind: 'TOGGLE', offer, enabled: true });
platform.serviceConfiguration.pricing = configureStreamingPricingOffer(platform.serviceConfiguration.pricing,
    { kind: 'BENEFIT', offer: 'PLAN', planId: 'EARLY', premiumAccess: true, earlyAccessWeeks: 2 });
const commission = platform.originalCommissions[0];
commission.releasePlan = { scope: 'DOMESTIC', releasePattern: 'SINGLE_PREMIERE', marketingPlan: 'STANDARD',
    premiereAtAbsoluteWeek: originalWeek + 3, authorizedAtAbsoluteWeek: originalWeek };
assert.equal(getStreamingOriginalLiveStatus(original, commission), 'DELIVERED');
assert.deepEqual(projectStreamingCommercialOffers(platform.serviceConfiguration.pricing).subscriptions.map(plan => plan.id), ['STANDARD', 'EARLY']);
assertProjection(original, [], 'Delivered Original cannot play before its early window');
const early: Player = { ...original, currentWeek: original.currentWeek + 1 };
const earlyAvailability = getStreamingContentAvailability(early, originalId, ['US']);
assert.equal(earlyAvailability.available, true);
assert.equal(earlyAvailability.routesByCountry.US.SUBSCRIPTION.allowed, false, 'The first subscription plan is still blocked.');
assert.equal(earlyAvailability.routesByCountry.US['SUBSCRIPTION:EARLY'].allowed, true, 'Only the second plan opens two weeks before premiere.');
for (const kind of ['AD_SUPPORTED', 'RENTAL', 'PURCHASE'] as const) assert.equal(earlyAvailability.routesByCountry.US[kind].allowed, false);
assertProjection(early, [originalId], 'The second subscription plan alone makes the delivered Original playable');
const localizationHeld: Player = { ...early, ownedStreamingPlatform: { ...early.ownedStreamingPlatform,
    originalCommissions: [{ ...commission, localization: { packageId: 'DOMESTIC', subtitleLanguageCount: 1,
        dubbedLanguageCount: 0, cashCost: 0, committedAtAbsoluteWeek: originalWeek,
        readyAtAbsoluteWeek: originalWeek + 2 } }],
} };
assertProjection(localizationHeld, [], 'A valid early benefit cannot bypass unfinished localization delivery');
const atPremiere: Player = { ...original, currentWeek: original.currentWeek + 3 };
const premiereAvailability = getStreamingContentAvailability(atPremiere, originalId, ['US']);
for (const key of ['SUBSCRIPTION:STANDARD', 'SUBSCRIPTION:EARLY', 'AD_SUPPORTED', 'RENTAL', 'PURCHASE']) {
    assert.equal(premiereAvailability.routesByCountry.US[key].allowed, true, `${key} opens at the actual premiere.`);
}
assertProjection(atPremiere, [originalId], 'All configured offer routes open at the delivered Original premiere');
console.log('PASS delivered Original, second-plan early access, localization and premiere gates');

for (const [label, source] of [['Owned/licensed', ownedPlayer], ['Original', atPremiere]] as const) {
    const suspended: Player = { ...source, ownedStreamingPlatform: { ...source.ownedStreamingPlatform,
        marketOperations: source.ownedStreamingPlatform.marketOperations.map(operation => ({ ...operation, status: 'SUSPENDED' })),
    } };
    assert.deepEqual(getOwnedPlatformPackageCountryIds(suspended.ownedStreamingPlatform), [],
        'An explicit suspended footprint must override the saved day-one fallback.');
    for (const id of getStreamingCatalogProjectIds(suspended.ownedStreamingPlatform)) {
        assert.equal(getStreamingContentAvailability(suspended, id).available, true,
            'Title-level readiness alone does not prove any country can play it.');
        assert.equal(evaluatePlayerStreamingTitleRoute(suspended, id, 'US', getAbsoluteWeek(suspended.age, suspended.currentWeek),
            { kind: 'SUBSCRIPTION', planId: suspended.ownedStreamingPlatform.serviceConfiguration.pricing.plans[0].id }).reasonCode,
        'MARKET_INACTIVE');
    }
    assertProjection(suspended, [], `${label} titles have no playable route when every country is suspended`);
}
console.log('PASS fully suspended footprints for owned, licensed and Original titles');
console.log(JSON.stringify({ passed: 3, gateStates }));
