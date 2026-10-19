import assert from 'node:assert/strict';
import { filedMarketFixture } from './helpers/streamingFiledMarketFixture';
import { getStreamingBuyerAuctionLots, getStreamingBuyerAuctionBackendCapability } from '../services/streamingBuyerAuctions';
import { getStreamingLicenseOpportunities } from '../services/streamingCatalog';
import { visitStreamingHqSection } from '../services/streamingHq';
import { configureStreamingPricingOffer } from '../services/streamingCommercialOffers';
import type { StreamingRightsAccessGrant } from '../types';
import { getContentMarketCollections, getContentMarketListings, purchaseContentMarketListing } from '../services/streamingContentMarket';
import { getStreamingContentAvailability } from '../services/streamingContentAvailability';
import { getStreamingOpportunityCards } from '../services/streamingOpportunityMarket';

const failures: string[] = [];
let passed = 0;
const check = (name: string, run: () => void) => {
    try { run(); passed++; console.log(`PASS ${name}`); }
    catch (error) { failures.push(name); console.error(`FAIL ${name}: ${String(error)}`); }
};

const player = filedMarketFixture();
const lot = getStreamingBuyerAuctionLots(player).find(row => row.listingKind === 'TITLE' && !row.upcomingRightsSaleId)!;
assert.ok(lot);

check('one-lot backend eligibility never traverses unrelated world titles', () => {
    const projects = player.world.projects;
    let reads = 0;
    const observed = { ...player, world: { ...player.world } };
    Object.defineProperty(observed.world, 'projects', { enumerable: true, get: () => { reads++; return projects; } });
    getStreamingBuyerAuctionBackendCapability(observed, lot);
    assert.equal(reads, 0, 'one lot must not rebuild the world catalogue');
});

check('licence discovery prepares countries once instead of once per title', () => {
    let profileReads = 0;
    const operations = player.ownedStreamingPlatform.marketOperations.map(operation => {
        const result = { ...operation };
        Object.defineProperty(result, 'countryProfile', { enumerable: true, get: () => { profileReads++; return operation.countryProfile; } });
        return result;
    });
    const observed = { ...player, ownedStreamingPlatform: { ...player.ownedStreamingPlatform, marketOperations: operations } };
    assert.ok(getStreamingLicenseOpportunities(observed).length > 0);
    assert.ok(profileReads <= operations.length * 10, `country profiles read ${profileReads} times for ${operations.length} countries`);
});

check('licensed title route checks reuse countries across every plan and market', () => {
    const listing = getContentMarketListings(player)[0];
    const purchased = purchaseContentMarketListing(player, listing.id, listing.signature);
    assert.ok(purchased.changed, purchased.detail);
    let profileReads = 0;
    const operations = purchased.player.ownedStreamingPlatform.marketOperations.map(operation => {
        const result = { ...operation };
        Object.defineProperty(result, 'countryProfile', { enumerable: true, get: () => { profileReads++; return operation.countryProfile; } });
        return result;
    });
    const observed = { ...purchased.player, ownedStreamingPlatform: { ...purchased.player.ownedStreamingPlatform, marketOperations: operations } };
    const availability = getStreamingContentAvailability(observed, listing.title.id);
    assert.equal(Object.keys(availability.routesByCountry).length, 197);
    assert.ok(availability.available);
    assert.ok(profileReads <= operations.length * 10, `route checks read country profiles ${profileReads} times`);
});

check('title readiness and licensed positions are resolved once for a route matrix', () => {
    const listing = getContentMarketListings(player)[0];
    const purchased = purchaseContentMarketListing(player, listing.id, listing.signature);
    assert.ok(purchased.changed, purchased.detail);
    const projects = purchased.player.world.projects;
    let reads = 0;
    const observed = { ...purchased.player, world: { ...purchased.player.world } };
    Object.defineProperty(observed.world, 'projects', { enumerable: true, get: () => { reads++; return projects; } });
    assert.ok(getStreamingContentAvailability(observed, listing.title.id).available);
    assert.ok(reads <= 20, `one title matrix traversed world titles ${reads} times`);
});

check('collection backend quotes normalize countries once per batch', () => {
    let profileReads = 0;
    const operations = player.ownedStreamingPlatform.marketOperations.map(operation => {
        const result = { ...operation };
        Object.defineProperty(result, 'countryProfile', { enumerable: true, get: () => { profileReads++; return operation.countryProfile; } });
        return result;
    });
    const observed = { ...player, ownedStreamingPlatform: { ...player.ownedStreamingPlatform, marketOperations: operations } };
    assert.ok(getContentMarketCollections(observed).length > 0);
    assert.ok(profileReads <= operations.length * 10, `collection quotes read profiles ${profileReads} times`);
});

check('individual opportunity reads do not also rebuild unrelated collections', () => {
    const projects = player.world.projects;
    let reads = 0;
    const observed = { ...player, world: { ...player.world } };
    Object.defineProperty(observed.world, 'projects', { enumerable: true, get: () => { reads++; return projects; } });
    const cards = getStreamingOpportunityCards(observed, { includeCollections: false });
    assert.ok(cards.individuals.length > 0);
    assert.equal(reads, 0, 'reading saved individual offers must not scan the world catalogue');
});

check('revisiting an HQ section returns the unchanged player without losing tour progress', () => {
    const first = visitStreamingHqSection(player, 'HOME');
    assert.ok(first.ownedStreamingPlatform.hqOnboarding.visitedSections.includes('HOME'));
    assert.ok(visitStreamingHqSection(first, 'HOME') === first, 'unchanged tour state must not trigger another global player update');
});

check('backend eligibility reads current canonical grants and service configuration', () => {
    const configured = structuredClone(player);
    configured.ownedStreamingPlatform.serviceConfiguration.pricing = configureStreamingPricingOffer(
        configured.ownedStreamingPlatform.serviceConfiguration.pricing, { kind: 'CORE', coreModel: 'STORE' });
    const restricted: StreamingRightsAccessGrant = { schemaVersion: 1, modes: ['SUBSCRIPTION'], earlyWindowWeeks: 0, purchaseFulfillment: 'NONE', source: 'EXPLICIT' };
    configured.ownedStreamingPlatform.catalogLicenses.push({ id: 'source-grant', accessGrant: restricted } as any);
    const sourced = { ...lot, sourceLicenseId: 'source-grant' };
    assert.equal(getStreamingBuyerAuctionBackendCapability(configured, sourced).rental, false);
    configured.ownedStreamingPlatform.catalogLicenses.at(-1)!.accessGrant = { ...restricted, modes: ['RENTAL'] };
    assert.equal(getStreamingBuyerAuctionBackendCapability(configured, sourced).rental, true);
    configured.ownedStreamingPlatform.serviceConfiguration.pricing = configureStreamingPricingOffer(
        configured.ownedStreamingPlatform.serviceConfiguration.pricing, { kind: 'CORE', coreModel: 'SUBSCRIPTION' });
    assert.equal(getStreamingBuyerAuctionBackendCapability(configured, sourced).rental, false);
    assert.equal(getStreamingBuyerAuctionBackendCapability(configured, { ...sourced, windowType: 'PERMANENT' }).eligibleRevenueFraction, 0);
});

console.log(JSON.stringify({ passed, failed: failures.length, countriesFiled: player.ownedStreamingPlatform.marketOperations.length }));
if (failures.length) process.exitCode = 1;
