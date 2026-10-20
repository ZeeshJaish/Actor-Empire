import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import type { Player } from '../types';
import { getHistoricalCatalogueTitles } from '../services/historicalCatalogue';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { createStreamingLicenseContract, createStreamingRightsContractFromLicense } from '../services/streamingRightsCore';
import { getContentMarketListings, purchaseContentMarketListing, searchContentMarketLibrary } from '../services/streamingContentMarket';
import { filedMarketFixture } from './helpers/streamingFiledMarketFixture';

const base = filedMarketFixture();
const searches = [
    { query: 'the', limit: 100 },
    { projectType: 'SERIES' as const, minimumQuality: 80, limit: 7 },
    { query: 'harbour', projectType: 'MOVIE' as const, limit: 5 },
];
const fingerprints = searches.map(options => createHash('sha256')
    .update(JSON.stringify(searchContentMarketLibrary(base, options))).digest('hex'));
if (process.argv.includes('--snapshots')) {
    console.log(JSON.stringify({ fingerprints }));
    process.exit(0);
}

// Recorded from checkpoint 9d770f3 before the read batching change. These cover
// complete title metadata, ordering, status/reasons and rotating shelf references.
assert.deepEqual(fingerprints, [
    '4019951e7de6ac0a540baa6d2b6e5f94970fa34017e00f6b8278b196dc59792e',
    'c4152c5bc2a3e2957ee7262d3c648cca007f6b220c7711b7365323764b7610ce',
    '4fa00f21637aa4672422265afe262002c61bf7b755fed85d017c1dddd22fc5a6',
], 'Search batching must preserve the complete pre-change projections.');

const week = getAbsoluteWeek(base.age, base.currentWeek);
const targetId = 'search-read-context-boundary';
const title = 'Search Boundary Film';
const boundary: Player = { ...base, world: { ...base.world,
    projects: [...base.world.projects, { id: targetId, title, studioId: 'search-seller',
        mediaType: 'MOVIE', genre: 'DRAMA', rating: 7, quality: 70,
        year: base.age - 1, weekReleased: 1 } as any],
} };
const row = (player: Player) => searchContentMarketLibrary(player, { query: title, limit: 100 })
    .find(item => item.title.id === targetId)!;
const freeStatus = row(boundary).status;
assert.ok(freeStatus === 'AVAILABLE' || freeStatus === 'NOT_OFFERED');
const license = createStreamingLicenseContract({ id: 'search-read-context-conflict',
    sourceProject: { id: targetId, title, mediaType: 'MOVIE', genre: 'DRAMA' },
    buyerPlatformId: 'search-rival', platformContentPlanId: null, cataloguePackageId: null,
    licensorName: 'Search Seller', territory: 'DOMESTIC', countryIds: ['US'], durationWeeks: 1,
    exclusivity: 'EXCLUSIVE', minimumGuarantee: 0, platformRevenueShare: 100,
    signedAtAbsoluteWeek: week, startsAtAbsoluteWeek: week,
    origin: 'STUDIO_MARKET', sellerType: 'STUDIO', sellerPlatformId: null, windowType: 'FIRST_WINDOW',
});
const conflict = createStreamingRightsContractFromLicense({ license,
    buyer: { type: 'AI_PLATFORM', id: 'search-rival', name: 'Search Rival', platformId: null },
    guaranteeDisposition: 'PAID', settledAtAbsoluteWeek: week,
});
const held: Player = { ...boundary, world: { ...boundary.world, streamingRightsContracts: {
    ...boundary.world.streamingRightsContracts, [conflict.id]: conflict,
} } };
assert.equal(row(held).status, 'HELD', 'A subsequent search must see newly granted conflicting rights.');
assert.ok(row(held).reason.includes('Search Rival'));
const samePlayer = structuredClone(boundary);
assert.ok(['AVAILABLE', 'NOT_OFFERED'].includes(row(samePlayer).status));
samePlayer.world.streamingRightsContracts = held.world.streamingRightsContracts;
assert.equal(row(samePlayer).status, 'HELD', 'A fresh search must also see a replaced registry on the same player object.');
assert.ok(['AVAILABLE', 'NOT_OFFERED'].includes(row({ ...held, currentWeek: held.currentWeek + 2 }).status),
    'A subsequent week must stop treating expired rights as a current conflict.');
const indiaOnly: Player = { ...held, ownedStreamingPlatform: { ...held.ownedStreamingPlatform,
    marketOperations: held.ownedStreamingPlatform.marketOperations.filter(operation => operation.countryId === 'IN'),
    identity: { ...held.ownedStreamingPlatform.identity!, dayOneMarketIds: ['IN'] },
} };
assert.ok(['AVAILABLE', 'NOT_OFFERED'].includes(row(indiaOnly).status),
    'A subsequent footprint must re-evaluate the exact inbound territory.');
const unresolved: Player = { ...boundary, world: { ...boundary.world, legacyStreamingRightsHolds: {
    ...boundary.world.legacyStreamingRightsHolds,
    [targetId]: { sourceProjectId: targetId, reason: 'UNKNOWN_BUYER' } as any,
} } };
assert.equal(row(unresolved).status, 'UNRESOLVED');
assert.equal(row({ ...boundary, ownedStreamingPlatform: { ...boundary.ownedStreamingPlatform,
    catalogProjectIds: [...boundary.ownedStreamingPlatform.catalogProjectIds, targetId],
} }).status, 'OWNED', 'Fresh ownership must not retain a purchasable search projection.');

const listed = getContentMarketListings(base)[0];
assert.ok(listed, 'The real rotating market must provide a stale-listing validation case.');
const blockedListing = createStreamingRightsContractFromLicense({ license: { ...license,
    id: 'search-stale-listing', sourceProjectId: listed.title.id, titleAtSigning: listed.title.title,
    territory: 'GLOBAL', countryIds: [],
}, buyer: { type: 'AI_PLATFORM', id: 'search-rival', name: 'Search Rival', platformId: null },
guaranteeDisposition: 'PAID', settledAtAbsoluteWeek: week });
const beforePurchase: Player = { ...base, world: { ...base.world, streamingRightsContracts: {
    ...base.world.streamingRightsContracts, [blockedListing.id]: blockedListing,
} } };
const purchase = purchaseContentMarketListing(beforePurchase, listed.id, listed.signature);
assert.equal(purchase.changed, false, 'A previously displayed listing must revalidate current conflicting rights before purchase.');
assert.equal(purchase.player.ownedStreamingPlatform.treasuryCash, beforePurchase.ownedStreamingPlatform.treasuryCash);
assert.ok(!purchase.player.ownedStreamingPlatform.catalogProjectIds.includes(listed.title.id));

// A fixed number of platform preparations is allowed for the current shelf.
// Returning another 99 rows must not normalize the retained catalogue per row.
const historical = getHistoricalCatalogueTitles(base);
for (const retained of [52, 1040]) {
    const licenses = historical.slice(0, retained).map((source, index) => ({ ...license,
        id: `search-retained-${index}`, sourceProjectId: source.id, titleAtSigning: source.title,
        territory: 'GLOBAL' as const, countryIds: [], exclusivity: 'NON_EXCLUSIVE' as const,
        expiresAtAbsoluteWeek: week + 104,
    }));
    let catalogueReads = 0;
    const observed: Player = { ...base, ownedStreamingPlatform: new Proxy({ ...base.ownedStreamingPlatform,
        catalogProjectIds: licenses.map(item => item.sourceProjectId), catalogLicenses: licenses,
    }, { get(target, key, receiver) {
        if (key === 'catalogLicenses') catalogueReads++;
        return Reflect.get(target, key, receiver);
    } }) };
    searchContentMarketLibrary(observed, { query: 'the', limit: 1 });
    const oneRowReads = catalogueReads;
    catalogueReads = 0;
    const results = searchContentMarketLibrary(observed, { query: 'the', limit: 100 });
    assert.equal(results.length, 100);
    console.log(JSON.stringify({ retained, rows: results.length, oneRowReads, hundredRowReads: catalogueReads }));
    assert.ok(catalogueReads <= oneRowReads + 2,
        `${retained} retained titles: search prepared the platform per result (${oneRowReads} -> ${catalogueReads}).`);
}
console.log(JSON.stringify({ passed: 18 }));
