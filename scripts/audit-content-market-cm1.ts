import assert from 'node:assert/strict';
import { contentMarketFixture } from './helpers/contentMarketFixture';
import { getContentMarketListings, getContentMarketCollections, purchaseContentMarketListing, purchaseContentMarketCollection,
    getContentMarketOwnedTitles, linkContentMarketOwnedTitles, getContentMarketAuctionCollections } from '../services/streamingContentMarket';
import { getStreamingContentAvailability } from '../services/streamingContentAvailability';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { getStreamingOpeningCatalogueView } from '../services/streamingOpeningCatalogue';
import { createCanonicalContentDeskState, createCanonicalViewerState } from '../components/streaming-transplant/createCanonicalStreamingPresentation';
import { getOwnedStreamingProgramEntries } from '../services/streamingOriginals';


let p = contentMarketFixture();
let offers = getContentMarketListings(p);
assert.equal(offers.length, 6, 'Founding platform can browse actual released titles');
const first = offers[0];
const originalCash = p.ownedStreamingPlatform.treasuryCash;
let result = purchaseContentMarketListing(p, first.id, first.signature);
assert.ok(result.changed, result.detail); p = result.player;
assert.equal(p.ownedStreamingPlatform.treasuryCash, originalCash - first.terms.minimumGuarantee);
assert.ok(p.ownedStreamingPlatform.starterCatalog);
assert.deepEqual(p.ownedStreamingPlatform.catalogLicenses[0].countryIds, ['IN', 'US']);
assert.equal(purchaseContentMarketListing(p, first.id, first.signature).changed, false, 'Double click cannot charge twice');
offers = getContentMarketListings(p);
result = purchaseContentMarketListing(p, offers[0].id, offers[0].signature);
assert.ok(result.changed, 'Second pre-launch purchase works'); p = result.player;
const imported = linkContentMarketOwnedTitles(p, ['owned-cm1']);
assert.ok(imported.changed); p = imported.player;
assert.equal(linkContentMarketOwnedTitles(p, ['owned-cm1']).changed, false);
assert.equal(p.ownedStreamingPlatform.catalogProjectIds.length, 3);
assert.ok(getContentMarketOwnedTitles(p)[0].linked);
assert.equal(getStreamingContentAvailability(p, 'owned-cm1', ['IN']).status, 'READY');
const license = p.ownedStreamingPlatform.catalogLicenses[0];
const future = structuredClone(p);
future.ownedStreamingPlatform.catalogLicenses[0].startsAtAbsoluteWeek = getAbsoluteWeek(p.age, p.currentWeek) + 4;
assert.equal(getStreamingContentAvailability(future, license.sourceProjectId, ['IN']).available, false);
assert.equal(getStreamingContentAvailability(future, license.sourceProjectId).status, 'AWAITING_AVAILABILITY');
const poor = contentMarketFixture(); poor.ownedStreamingPlatform.treasuryCash = 0;
const poorOffer = getContentMarketListings(poor)[0];
assert.equal(purchaseContentMarketListing(poor, poorOffer.id, poorOffer.signature).changed, false);
assert.equal(poor.ownedStreamingPlatform.catalogLicenses.length, 0);
let collectionPlayer = contentMarketFixture();
collectionPlayer.world.projects.push(...['seller-cm1-b', 'seller-cm1-c'].flatMap((studioId, sellerIndex) => (
    Array.from({ length: 6 }, (_, index) => ({
        id: `${studioId}-film-${index}`,
        title: `Archive ${sellerIndex + 1}.${index + 1}`,
        studioId,
        mediaType: 'MOVIE',
        genre: index % 2 ? 'THRILLER' : 'DRAMA',
        rating: 6.8 + index / 10,
        year: 18 + index,
        boxOffice: 20_000_000 + index * 2_000_000,
    } as any))
)));
const auctionCollectionIds = new Set(getContentMarketAuctionCollections(collectionPlayer).map(item => item.id));
const collection = getContentMarketCollections(collectionPlayer).find(item => !auctionCollectionIds.has(item.id));
assert.ok(collection, 'Collections available before opening');
assert.equal(collection.rows.reduce((sum, row) => sum + row.minimumGuarantee, 0), collection.totalGuarantee);
const boughtCollection = purchaseContentMarketCollection(collectionPlayer, collection.id, collection.signature);
assert.ok(boughtCollection.changed, boughtCollection.detail);
assert.equal(boughtCollection.player.ownedStreamingPlatform.catalogLicenses.length, collection.rows.length);
assert.equal(purchaseContentMarketCollection(boughtCollection.player, collection.id, collection.signature).changed, false);
const loaded = normalizeOwnedStreamingPlatformState(JSON.parse(JSON.stringify(p.ownedStreamingPlatform)), p.id);
assert.deepEqual(loaded.catalogProjectIds, p.ownedStreamingPlatform.catalogProjectIds);
assert.equal(loaded.treasuryCash, p.ownedStreamingPlatform.treasuryCash);
const originalPlayer = contentMarketFixture();
originalPlayer.ownedStreamingPlatform.originalCommissions = [{ id: 'unfinished', scriptId: 'original-script', canonicalProjectId: 'not-delivered', title: 'Coming Home', projectType: 'MOVIE', genre: 'DRAMA', producerStudioId: 'cm1-studio', status: 'IN_PRODUCTION' } as any];
originalPlayer.ownedStreamingPlatform.catalogProjectIds = ['not-delivered'];
assert.equal(getStreamingOpeningCatalogueView(originalPlayer).titles[0].available, false, 'Unfinished original must not count as opening content');
assert.equal(createCanonicalContentDeskState(originalPlayer).titles[0].status, 'IN PRODUCTION');
assert.equal(createCanonicalContentDeskState(p).titles.find(t => t.id === 'owned-cm1')?.kind, 'OWNED');
assert.equal(createCanonicalViewerState(originalPlayer).titles.length, 0, 'Subscriber preview must not offer an unfinished production for playback');
originalPlayer.ownedStreamingPlatform.launchSlate = { programmedAtAbsoluteWeek: 1200, entries: [{ id: 'unfinished-slate', projectId: 'not-delivered', title: 'Coming Home', source: 'ORIGINAL', projectType: 'MOVIE', genre: 'DRAMA', launchWeek: 1, releasePattern: 'SINGLE_PREMIERE', marketingPlan: 'LEAN' }] } as any;
assert.equal(getOwnedStreamingProgramEntries(originalPlayer).length, 0, 'Scheduled but unfinished titles cannot reach the weekly playback model');
const restricted = contentMarketFixture();
const grant = structuredClone(Object.values(p.world.streamingRightsContracts)[0]);
grant.id = 'sold-india'; grant.sourceProjectId = 'owned-cm1'; grant.countryIds = ['IN']; grant.territory = 'DOMESTIC'; grant.exclusivity = 'EXCLUSIVE';
grant.buyer = { ...grant.buyer, type: 'AI_PLATFORM', id: 'NETFLIX', platformId: 'NETFLIX', name: 'Netflix' };
restricted.world.streamingRightsContracts = { [grant.id]: grant };
assert.deepEqual(getContentMarketOwnedTitles(restricted)[0].countryIds, ['US'], 'Import excludes rights already sold in India');
assert.deepEqual(getContentMarketOwnedTitles(restricted)[0].excludedCountryIds, ['IN']);
const limitedImport = linkContentMarketOwnedTitles(restricted, ['owned-cm1']);
assert.ok(limitedImport.changed);
assert.equal(getStreamingContentAvailability(limitedImport.player, 'owned-cm1', ['IN']).available, false);
assert.equal(getStreamingContentAvailability(limitedImport.player, 'owned-cm1', ['US']).available, true);
const blockedEverywhere = structuredClone(limitedImport.player);
blockedEverywhere.world.streamingRightsContracts['sold-india'].countryIds = ['IN', 'US'];
blockedEverywhere.ownedStreamingPlatform.launchSlate = { programmedAtAbsoluteWeek: 1200, entries: [{ id: 'owned-slate', projectId: 'owned-cm1', title: 'The Last Light', source: 'OWNED_LIBRARY', projectType: 'MOVIE', genre: 'DRAMA', launchWeek: 1, releasePattern: 'SINGLE_PREMIERE', marketingPlan: 'LEAN' }] } as any;
assert.equal(getOwnedStreamingProgramEntries(blockedEverywhere).length, 0, 'Rights sold in every operating market must remove an existing studio import from playback');
const reserved = contentMarketFixture();
reserved.ownedStreamingPlatform.costCommitments = [{ id: 'reserve', idempotencyKey: 'reserve', status: 'COMMITTED', committedAmount: 500_000_000 } as any];
const reservedListing = getContentMarketListings(reserved)[0];
assert.equal(purchaseContentMarketListing(reserved, reservedListing.id, reservedListing.signature).changed, false, 'Existing committed spend cannot be spent twice');
assert.equal(purchaseContentMarketListing(contentMarketFixture(), first.id, 'stale').changed, false);
const activePlayer = contentMarketFixture(); activePlayer.ownedStreamingPlatform.lifecycle = 'ACTIVE';
const activeListing = getContentMarketListings(activePlayer)[0];
assert.ok(purchaseContentMarketListing(activePlayer, activeListing.id, activeListing.signature).changed, 'Buying continues after launch');
const draftPlayer = contentMarketFixture();
draftPlayer.ownedStreamingPlatform.contentMarketDraft = { tab: 'OWNED', search: 'light', selectedId: null, ownedIds: ['owned-cm1'] };
const reloadedDraft = normalizeOwnedStreamingPlatformState(JSON.parse(JSON.stringify(draftPlayer.ownedStreamingPlatform)), draftPlayer.id);
assert.deepEqual(reloadedDraft.contentMarketDraft, { tab: 'OWNED', search: 'light', selectedId: null, ownedIds: ['owned-cm1'] });
console.log('CM1 content market: founding purchases, repeated imports, collection allocations, future availability, funds and reload passed.');
