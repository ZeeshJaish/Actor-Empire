import assert from 'node:assert/strict';
import { INITIAL_PLAYER, createInitialOwnedStreamingPlatformState, type Player } from '../types';
import {
    getStreamingLicenseCandidatePool,
    getStreamingLicenseOpportunities,
} from '../services/streamingCatalog';
import {
    getContentMarketAuctionCollections,
    getContentMarketAuctionListings,
    getContentMarketListings,
    getContentMarketSupplySummary,
    submitContentMarketPrivateOffer,
} from '../services/streamingContentMarket';
import {
    getStreamingBuyerAuctionLots,
    openStreamingBuyerAuction,
} from '../services/streamingBuyerAuctions';
import {
    getStreamingCataloguePackageOpportunities,
    signOwnedStreamingCataloguePackage,
} from '../services/streamingRightsMarketplace';

const withAbsoluteWeek = (source: Player, absoluteWeek: number): Player => {
    const player = structuredClone(source);
    player.age = Math.floor(absoluteWeek / 52) + 1;
    player.currentWeek = (absoluteWeek % 52) + 1;
    return player;
};

const buildSupplyFixture = (projectCount = 84, studioCount = 4): Player => {
    const player = structuredClone(INITIAL_PLAYER) as Player;
    player.id = 'content-market-supply-player';
    player.businesses = [{ id: 'player-studio', name: 'Empire Studios', type: 'PRODUCTION_HOUSE', isActive: true } as any];
    player.pastProjects = [
        { id: 'player-owned-title', name: 'Empire Feature', title: 'Empire Feature', studioId: 'player-studio', projectType: 'MOVIE', genre: 'DRAMA', imdbRating: 8.4 },
    ] as any;
    player.world.studios = Object.fromEntries(Array.from({ length: studioCount }, (_, studioIndex) => {
        const id = `market-studio-${studioIndex}`;
        return [id, { id, name: `Market Studio ${studioIndex + 1}` } as any];
    }));
    player.world.projects = Array.from({ length: projectCount }, (_, index) => ({
        id: `market-title-${index}`,
        title: `Market Title ${index + 1}`,
        studioId: `market-studio-${index % studioCount}`,
        mediaType: index % 5 === 0 ? 'SERIES' : 'MOVIE',
        genre: ['DRAMA', 'ACTION', 'COMEDY', 'THRILLER', 'ROMANCE'][index % 5],
        rating: 5.8 + (index % 30) / 10,
        year: 20 + (index % 8),
        boxOffice: 8_000_000 + index * 1_750_000,
    })) as any;
    player.world.projects.push({ id: '', title: 'Broken ID', studioId: 'market-studio-0', mediaType: 'MOVIE' } as any);
    player.world.projects.push({ id: 'broken-title', title: '', studioId: 'market-studio-0', mediaType: 'MOVIE' } as any);
    player.world.projects.push({ id: 'broken-studio', title: 'Broken Studio', studioId: '', mediaType: 'MOVIE' } as any);
    player.world.projects.push({ id: 'player-owned-title', title: 'Duplicate Empire Feature', studioId: 'player-studio', mediaType: 'MOVIE' } as any);
    player.world.streamingRightsContracts = {};
    player.ownedStreamingPlatform = {
        ...createInitialOwnedStreamingPlatformState(player.id),
        lifecycle: 'FOUNDING',
        treasuryCash: 50_000_000_000,
        foundingProfile: {
            incorporationModel: 'FIXED_V7',
            founderCashCharged: 85_000_000,
            setupCostsConsumed: 70_000_000,
            openingTreasuryCash: 15_000_000,
            incorporatedAtAbsoluteWeek: 1_200,
        } as any,
        identity: {
            name: 'Empire+', slug: 'empire-plus', primaryColor: '#684cff', secondaryColor: '#101014',
            logoKey: 'FRAME_PLAY', brandPromiseId: 'BALANCED', dayOneMarketIds: ['IN', 'US'], foundedAtAbsoluteWeek: 1_200,
        } as any,
    };
    return withAbsoluteWeek(player, 1_200);
};

const fixture = buildSupplyFixture();
fixture.ownedStreamingPlatform.catalogProjectIds = ['market-title-2'];
const pool = getStreamingLicenseCandidatePool(fixture);
const canonicalIds = new Set([
    ...fixture.world.projects.map(project => project.id),
    ...fixture.pastProjects.map(project => project.id),
]);

assert.ok(pool.length > 12, 'The underlying pool is not limited to the mobile storefront.');
assert.ok(pool.every(title => canonicalIds.has(title.id)), 'Market supply never invents a title.');
assert.equal(new Set(pool.map(title => title.id)).size, pool.length, 'Canonical IDs are deduplicated.');
assert.ok(pool.every(title => title.id && title.title && title.studioId), 'Malformed canonical projects are excluded.');
assert.ok(!pool.some(title => ['player-owned-title', 'market-title-2'].includes(title.id)), 'Owned and already-catalogued titles are excluded.');

const week1200 = withAbsoluteWeek(buildSupplyFixture(), 1_200);
const week1201 = withAbsoluteWeek(buildSupplyFixture(), 1_201);
const week1202 = withAbsoluteWeek(buildSupplyFixture(), 1_202);
const week1203 = withAbsoluteWeek(buildSupplyFixture(), 1_203);
const ids = (player: Player) => getStreamingLicenseOpportunities(player).map(title => title.id);

assert.equal(ids(week1200).length, 12, 'The mobile storefront remains bounded.');
assert.deepEqual(ids(week1200), ids(week1201), 'Week one of a market cycle must remain stable.');
assert.deepEqual(ids(week1200), ids(week1202), 'Week two of a market cycle must remain stable.');
assert.notDeepEqual(ids(week1200), ids(week1203), 'The rotating portion changes at the next three-week boundary.');
assert.deepEqual(ids(week1200).slice(0, 3), ids(week1203).slice(0, 3), 'Eligible headliners stay discoverable across adjacent cycles.');
assert.deepEqual(
    getStreamingLicenseOpportunities(week1200),
    getStreamingLicenseOpportunities(structuredClone(week1200)),
    'Reloading the same save cannot reroll the market.',
);

const deepFounding = buildSupplyFixture(180, 6);
const deepProjectIds = new Set(deepFounding.world.projects.map(project => project.id).filter(Boolean));
const foundingCollections = getStreamingCataloguePackageOpportunities(deepFounding);
assert.ok(foundingCollections.length >= 4 && foundingCollections.length <= 6, 'A supplied founding world exposes four to six real collections.');
for (const offer of foundingCollections) {
    assert.ok(offer.rows.length >= 15 && offer.rows.length <= 50, 'Deep founding collections contain 15–50 titles.');
    assert.ok(offer.package.components.every(component => (
        component.sellerStudioId === offer.package.seller.id
        && deepProjectIds.has(component.sourceProjectId)
    )), 'Every collection component belongs to its declared canonical seller.');
    assert.equal(
        offer.rows.reduce((sum, row) => sum + row.minimumGuarantee, 0),
        offer.totalGuarantee,
        'Per-title allocations sum exactly to the collection guarantee.',
    );
}
assert.ok(
    new Set(foundingCollections.flatMap(offer => offer.rows.map(row => row.componentProjectId))).size >= 100,
    'A mature founding world exposes at least 100 unique canonical collection titles.',
);

const regularPlayer = structuredClone(deepFounding);
regularPlayer.ownedStreamingPlatform.lifecycle = 'ACTIVE';
const regularCollections = getStreamingCataloguePackageOpportunities(regularPlayer);
assert.ok(regularCollections.length <= 4, 'Regular market collection count remains bounded.');
assert.ok(regularCollections.every(offer => offer.rows.length <= 24), 'Regular collections remain compact.');

const sparsePlayer = buildSupplyFixture(7, 1);
const sparseCollections = getStreamingCataloguePackageOpportunities(sparsePlayer);
assert.equal(sparseCollections.length, 1, 'A legitimate sparse seller still receives one collection.');
assert.equal(sparseCollections[0].rows.length, 7, 'Sparse collections are not padded with synthetic titles.');

const signedCollection = signOwnedStreamingCataloguePackage(deepFounding, foundingCollections[0].id);
assert.ok(signedCollection.changed, signedCollection.detail || signedCollection.reason);
assert.equal(signedCollection.contracts.length, foundingCollections[0].package.components.length, 'Signing creates one contract per canonical component.');
assert.ok(signedCollection.contracts.every(contract => deepProjectIds.has(contract.sourceProjectId)), 'Signed package contracts retain canonical project IDs.');

const auctionWeek1200 = withAbsoluteWeek(buildSupplyFixture(180, 6), 1_200);
const auctionWeek1201 = withAbsoluteWeek(buildSupplyFixture(180, 6), 1_201);
const auctionWeek1202 = withAbsoluteWeek(buildSupplyFixture(180, 6), 1_202);
const auctionWeek1203 = withAbsoluteWeek(buildSupplyFixture(180, 6), 1_203);
const currentAuctionLots = (player: Player) => getStreamingBuyerAuctionLots(player)
    .filter(lot => !lot.upcomingRightsSaleId);
const auctionIds = (player: Player) => currentAuctionLots(player).map(lot => lot.id);

assert.ok(currentAuctionLots(auctionWeek1200).length <= 3, 'Founding discovery exposes at most three current auctions in total.');
assert.deepEqual(auctionIds(auctionWeek1200), auctionIds(auctionWeek1201), 'Auction IDs remain stable in week one of the cycle.');
assert.deepEqual(auctionIds(auctionWeek1200), auctionIds(auctionWeek1202), 'Auction IDs remain stable in week two of the cycle.');
assert.notDeepEqual(
    [
        ...getContentMarketAuctionListings(auctionWeek1200).map(listing => listing.id),
        ...getContentMarketAuctionCollections(auctionWeek1200).map(collection => collection.id),
    ],
    [
        ...getContentMarketAuctionListings(auctionWeek1203).map(listing => listing.id),
        ...getContentMarketAuctionCollections(auctionWeek1203).map(collection => collection.id),
    ],
    'Current auction assignments rotate at the three-week market boundary.',
);
const regularAuctionPlayer = structuredClone(auctionWeek1200);
regularAuctionPlayer.ownedStreamingPlatform.lifecycle = 'ACTIVE';
assert.ok(currentAuctionLots(regularAuctionPlayer).length <= 2, 'Regular discovery exposes at most two current auctions in total.');

const firstAuctionLot = currentAuctionLots(auctionWeek1200)[0];
assert.ok(firstAuctionLot, 'The supplied founding fixture has a current auction lot.');
const openedAuction = openStreamingBuyerAuction(auctionWeek1200, firstAuctionLot.id, 10_000);
assert.ok(openedAuction.changed && openedAuction.session, 'The current canonical auction can be opened.');
const progressedAuctionPlayer = withAbsoluteWeek(openedAuction.player, 1_203);
assert.ok(
    progressedAuctionPlayer.ownedStreamingPlatform.buyerAuctionSessions.some(session => session.id === openedAuction.session!.id),
    'The frozen auction session survives a market rotation.',
);
assert.ok(
    !currentAuctionLots(progressedAuctionPlayer).some(lot => lot.sourceProjectId === openedAuction.session!.lot.sourceProjectId),
    'A live frozen session prevents duplicate current auction rights after rotation.',
);

const supplySummary = getContentMarketSupplySummary(auctionWeek1200);
const expectedCanonicalMarketIds = new Set([
    ...getStreamingLicenseOpportunities(auctionWeek1200).map(title => title.id),
    ...getStreamingCataloguePackageOpportunities(auctionWeek1200)
        .flatMap(collection => collection.package.components.map(component => component.sourceProjectId)),
]);
assert.equal(supplySummary.totalCanonicalTitles, expectedCanonicalMarketIds.size, 'Supply totals count unique canonical projects, not market cards.');
assert.equal(supplySummary.liveAuctions, currentAuctionLots(auctionWeek1200).length, 'Supply totals report the bounded current auction allocation.');
assert.equal(supplySummary.nextRotationAbsoluteWeek, 1_203, 'The market reports its exact next three-week boundary.');
assert.equal(supplySummary.foundingBoost, true, 'The launch-period market is identified without persisted snapshot state.');

const offerPlayer = withAbsoluteWeek(buildSupplyFixture(84, 4), 1_200);
const auctionListingIds = new Set(getContentMarketAuctionListings(offerPlayer).map(listing => listing.id));
const privateListing = getContentMarketListings(offerPlayer).find(listing => !auctionListingIds.has(listing.id))!;
const submittedOffer = submitContentMarketPrivateOffer(offerPlayer, privateListing.id, privateListing.terms);
assert.ok(submittedOffer.changed && submittedOffer.negotiation, 'A canonical headliner can enter private negotiation.');
const offerAfterRotation = withAbsoluteWeek(submittedOffer.player, 1_203);
assert.ok(
    offerAfterRotation.ownedStreamingPlatform.rightsNegotiations.some(negotiation => negotiation.id === submittedOffer.negotiation!.id),
    'A saved private offer survives discovery rotation.',
);
assert.ok(
    !getContentMarketListings(offerAfterRotation).some(listing => listing.title.id === privateListing.title.id),
    'A title with an active private offer cannot reappear as a fresh discovery deal.',
);
assert.ok(
    !getStreamingCataloguePackageOpportunities(offerAfterRotation).some(collection => (
        collection.package.components.some(component => component.sourceProjectId === privateListing.title.id)
    )),
    'A title with an active private offer cannot be rebundled into a collection.',
);
assert.ok(
    !getStreamingCataloguePackageOpportunities(progressedAuctionPlayer).some(collection => (
        collection.package.components.some(component => component.sourceProjectId === openedAuction.session!.lot.sourceProjectId)
    )),
    'A title in a live frozen auction cannot be rebundled after rotation.',
);

const acquiredPlatform = withAbsoluteWeek(buildSupplyFixture(84, 4), 1_260);
acquiredPlatform.ownedStreamingPlatform.lifecycle = 'ACTIVE';
acquiredPlatform.ownedStreamingPlatform.catalogProjectIds = ['acquired-existing-title'];
const acquiredBefore = JSON.stringify(acquiredPlatform.ownedStreamingPlatform);
getContentMarketSupplySummary(acquiredPlatform);
getContentMarketListings(acquiredPlatform);
getStreamingCataloguePackageOpportunities(acquiredPlatform);
assert.equal(JSON.stringify(acquiredPlatform.ownedStreamingPlatform), acquiredBefore, 'Market reads cannot mutate an acquired platform catalogue or save a listing snapshot.');
assert.ok(!('marketSupplySnapshot' in acquiredPlatform.ownedStreamingPlatform), 'Derived market supply adds no save payload.');

console.log('Content Market supply: canonical pool, rotation, founding collections and package accounting passed.');
