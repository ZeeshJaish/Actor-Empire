import assert from 'node:assert/strict';
import type { OwnedStreamingCatalogLicense, Player, StreamingRightsContract } from '../types';
import type { StreamingTitleAccessDecision, StreamingTitleAccessRoute } from '../services/streamingTitleAccess';
import { filedMarketFixture } from './helpers/streamingFiledMarketFixture';
import { addStreamingAuditCatalogueTitle } from './helpers/streamingGrantedCatalogueFixture';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { configureStreamingPricingOffer } from '../services/streamingCommercialOffers';
import { createStreamingRightsContractFromLicense } from '../services/streamingRightsCore';
import { stageWorldStreamingOpeningOffer } from '../services/worldEconomy/worldStreamingOpening';
import {
    createStreamingCatalogueReadContext, createStreamingTitleRouteReadBatch, evaluatePlayerStreamingTitleRoute,
} from '../services/streamingContentAvailability';

const fixture = () => {
    const player = filedMarketFixture(['US', 'IN']);
    const platform = player.ownedStreamingPlatform;
    const week = getAbsoluteWeek(player.age, player.currentWeek);
    platform.lifecycle = 'ACTIVE';
    platform.marketOperations = platform.marketOperations.map(operation => ({ ...operation, status: 'ACTIVE' }));
    platform.serviceConfiguration.pricing = configureStreamingPricingOffer({ ...platform.serviceConfiguration.pricing,
        plans: [{ id: 'STANDARD', name: 'Standard', monthly: 8, featureIds: [], ads: false },
            { id: 'EARLY', name: 'Early', monthly: 13, featureIds: [], ads: false }],
        rentals: { ...platform.serviceConfiguration.pricing.rentals, windowWeeks: 4 }, commercialOffers: undefined,
    }, { kind: 'CORE', coreModel: 'SUBSCRIPTION' });
    for (const offer of ['ADS', 'STORE'] as const) platform.serviceConfiguration.pricing = configureStreamingPricingOffer(
        platform.serviceConfiguration.pricing, { kind: 'TOGGLE', offer, enabled: true });
    platform.serviceConfiguration.pricing = configureStreamingPricingOffer(platform.serviceConfiguration.pricing,
        { kind: 'BENEFIT', offer: 'PLAN', planId: 'EARLY', premiumAccess: true, earlyAccessWeeks: 2 });
    const id = 'worldwide-route-film';
    const license = addStreamingAuditCatalogueTitle(player, week, id, ['SUBSCRIPTION', 'AD_SUPPORTED', 'RENTAL', 'PURCHASE']);
    license.accessGrant = { ...license.accessGrant!, earlyWindowWeeks: 2, purchaseFulfillment: 'PERPETUAL' };
    platform.catalogProjectIds.push(id);
    return { player, platform, week, id, license };
};
const canonical = (player: Player, license: OwnedStreamingCatalogLicense) => createStreamingRightsContractFromLicense({ license,
    buyer: { type: 'PLAYER_PLATFORM', id: player.ownedStreamingPlatform.identity!.slug,
        name: player.ownedStreamingPlatform.identity!.name, platformId: null },
    guaranteeDisposition: 'PAID', settledAtAbsoluteWeek: license.signedAtAbsoluteWeek });
const currentBatch = (player: Player) => {
    const context = createStreamingCatalogueReadContext(player);
    const ownedIds = new Set<string>();
    const batch = createStreamingTitleRouteReadBatch(player, context.absoluteWeek, context.platform, ownedIds);
    return {
        read: (id: string, country: string, route: StreamingTitleAccessRoute) => {
            const decision = batch(id, country, route);
            assert.deepEqual(decision, evaluatePlayerStreamingTitleRoute(player, id, country, context.absoluteWeek, route,
                { platform: context.platform, ownedTitleIds: ownedIds }), 'Caching must preserve every canonical decision field.');
            return decision;
        },
    };
};
const assertDecision = (decision: StreamingTitleAccessDecision, allowed: boolean, reason: string, contractId: string) => {
    assert.equal(decision.allowed, allowed);
    assert.equal(decision.reasonCode, reason);
    assert.equal(decision.contractId, contractId);
};
const subscription: StreamingTitleAccessRoute = { kind: 'SUBSCRIPTION', planId: 'STANDARD' };

{
    const { player, platform, week, id, license } = fixture();
    license.accessGrant = { ...license.accessGrant!, modes: ['RENTAL'] };
    const domestic: OwnedStreamingCatalogLicense = { ...license, id: 'worldwide-mixed-domestic',
        territory: 'DOMESTIC', countryIds: ['US'], startsAtAbsoluteWeek: week - 1,
        accessGrant: { ...license.accessGrant, modes: ['SUBSCRIPTION'] } };
    platform.catalogLicenses.push(domestic);
    player.world.streamingRightsContracts = { [license.id]: canonical(player, license), [domestic.id]: canonical(player, domestic) };
    const batch = currentBatch(player);
    assertDecision(batch.read(id, 'US', subscription), true, 'ALLOWED', domestic.id);
    assertDecision(batch.read(id, 'IN', subscription), false, 'MODE_NOT_GRANTED', license.id);
    for (const country of ['US', 'IN']) assertDecision(batch.read(id, country, { kind: 'RENTAL' }), true, 'ALLOWED', license.id);
    console.log('PASS mixed GLOBAL/DOMESTIC positions preserve country-specific winner and denial metadata');
}

{
    const { player, week, id, license } = fixture();
    const initial = canonical(player, license);
    const overrides: Array<[Partial<StreamingRightsContract>, string]> = [
        [{}, 'ALLOWED'],
        [{ status: 'EXPIRED' }, 'RIGHTS_EXPIRED'],
        [{ status: 'TRANSFERRED_OUT' }, 'RIGHTS_TRANSFERRED'],
        [{ status: 'TERMINATED' }, 'RIGHTS_TERMINATED'],
        [{ startsAtAbsoluteWeek: week + 1 }, 'RIGHTS_NOT_STARTED'],
        [{ expiresAtAbsoluteWeek: week }, 'RIGHTS_EXPIRED'],
    ];
    for (const [patch, reason] of overrides) {
        // Keep the local projection ACTIVE while replacing canonical truth on
        // the same player. Each separate invocation must prepare fresh rights.
        player.world.streamingRightsContracts = { [license.id]: { ...initial, ...patch } };
        const batch = currentBatch(player);
        for (const country of ['US', 'IN']) assertDecision(batch.read(id, country, subscription), reason === 'ALLOWED', reason, license.id);
        assertDecision(batch.read(id, 'NOT_A_MARKET', subscription), false, 'MARKET_INACTIVE', license.id);
    }
    console.log('PASS fresh worldwide batches preserve canonical status, start/expiry and inactive-market gates');
}

{
    const source = fixture();
    const player = stageWorldStreamingOpeningOffer(source.player, source.week - 2);
    const platform = player.ownedStreamingPlatform;
    const { id, week } = source;
    const license = platform.catalogLicenses[0];
    license.signedAtAbsoluteWeek = week - 24;
    license.startsAtAbsoluteWeek = week - 24;
    license.durationWeeks = 28;
    license.expiresAtAbsoluteWeek = week + 4;
    player.world.streamingRightsContracts = { [license.id]: canonical(player, license) };
    platform.launchSlate = { programmedAtAbsoluteWeek: week - 2, revision: 1, entries: [{
        id: 'worldwide-future-slate', projectId: id, title: license.titleAtSigning, source: 'LICENSED_WINDOW',
        projectType: 'MOVIE', genre: 'DRAMA', launchWeek: 5, releasePattern: 'SINGLE_PREMIERE', marketingPlan: 'LEAN',
    }] };
    const beforePremiere = currentBatch(player);
    for (const country of ['US', 'IN']) {
        assertDecision(beforePremiere.read(id, country, subscription), false, 'EARLY_WINDOW_DENIED', license.id);
        const early = beforePremiere.read(id, country, { kind: 'SUBSCRIPTION', planId: 'EARLY' });
        assertDecision(early, true, 'ALLOWED', license.id);
        assert.equal(early.priceSource, 'PLAN:EARLY');
        assertDecision(beforePremiere.read(id, country, { kind: 'SUBSCRIPTION', planId: 'MISSING' }), false, 'PLAN_NOT_OFFERED', license.id);
        for (const kind of ['AD_SUPPORTED', 'RENTAL', 'PURCHASE'] as const) {
            assertDecision(beforePremiere.read(id, country, { kind }), false, 'EARLY_WINDOW_DENIED', license.id);
        }
    }
    const premiere = currentBatch({ ...player, currentWeek: player.currentWeek + 2 });
    for (const country of ['US', 'IN']) {
        assertDecision(premiere.read(id, country, subscription), true, 'ALLOWED', license.id);
        assertDecision(premiere.read(id, country, { kind: 'RENTAL' }), false, 'RENTAL_WINDOW_TOO_SHORT', license.id);
        assertDecision(premiere.read(id, country, { kind: 'PURCHASE' }), true, 'ALLOWED', license.id);
        const ads = premiere.read(id, country, { kind: 'AD_SUPPORTED' });
        assertDecision(ads, true, 'ALLOWED', license.id);
        assert.equal(ads.adEligible, true);
    }
    console.log('PASS worldwide routes separate plans, early windows, rental expiry and durable purchase modes');
}
console.log(JSON.stringify({ passed: 3 }));
