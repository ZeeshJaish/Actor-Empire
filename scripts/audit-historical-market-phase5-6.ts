import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { getHistoricalCatalogueTitles } from '../services/historicalCatalogue';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { getStreamingLicenseCandidatePool, getStreamingLicenseOpportunities, getStreamingLicenseQuote } from '../services/streamingCatalog';
import { calculateStreamingCatalogueReferenceValue } from '../services/streamingCataloguePackages';
import * as contentMarket from '../services/streamingContentMarket';
import * as historicalRivals from '../services/historicalMarketRivals';
import { createStreamingLicenseContract, fullCurrencyToMillions } from '../services/streamingRightsCore';
import { getAuthoredAiCataloguePositions } from '../services/worldEconomy/worldStreamingAiCatalogue';
import { resolveStreamingViewingProjectFacts } from '../services/worldEconomy/worldStreamingViewing';

const localValues = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
    value: {
        getItem: (key: string) => localValues.get(key) ?? null,
        setItem: (key: string, value: string) => localValues.set(key, value),
        removeItem: (key: string) => localValues.delete(key),
        clear: () => localValues.clear(),
    },
});

const fresh = (): Player => {
    const player = structuredClone(INITIAL_PLAYER);
    player.id = 'historical-market-fixture';
    player.age = 30;
    player.currentWeek = 12;
    return player;
};

const migrated = migratePlayerSave(fresh());
const allTitles = getHistoricalCatalogueTitles(migrated);
const marquee = allTitles.filter(title => (title as any).catalogueTier === 'MARQUEE');
assert.equal(marquee.length, 16,
    'an initialized shared library must append 16 scarce marquee titles');
assert.equal(marquee.filter(title => title.projectType === 'MOVIE').length, 12);
assert.equal(marquee.filter(title => title.projectType === 'SERIES').length, 4);
assert.equal(new Set(marquee.map(title => title.id)).size, 16);
assert.equal(new Set(marquee.map(title => title.title)).size, 16);
assert.ok(marquee.every(title => title.quality >= 90 && title.quality <= 98
    && title.rating >= 8.6 && title.rating <= 9.5));
assert.ok(marquee.every(title => getAbsoluteWeek(title.year, title.weekReleased)
    <= migrated.world.historicalCatalogue!.initializedAtAbsoluteWeek));
assert.equal(migrated.world.awardHistory.length, 0,
    'activation cannot fabricate historical award wins');
assert.equal(migrated.world.projects.length, 0,
    'marquee records belong to the compact shared library, not hot world projects');

const reopened = migratePlayerSave(JSON.parse(JSON.stringify(migrated)));
assert.deepEqual(getHistoricalCatalogueTitles(reopened), allTitles,
    'the premium batch and v1 titles must replay identically after save/reopen');
assert.ok(JSON.stringify(reopened.world.historicalCatalogue).length < 20_000,
    'the persisted recipe must stay compact after v2 activation');

const candidates = getStreamingLicenseCandidatePool(migrated);
assert.equal(candidates.length, 2_016,
    'a fresh save must offer the whole released shared library as market candidates');
assert.equal(new Set(candidates.map(title => title.id)).size, candidates.length);
const directShelf = getStreamingLicenseOpportunities(migrated);
assert.equal(directShelf.length, 12, 'the visible direct shelf must stay small');
assert.ok(directShelf.filter(title => title.catalogueTier === 'MARQUEE').length <= 2,
    'scarce premium titles may occupy no more than two direct-shelf positions');
assert.ok(directShelf.some(title => title.catalogueTier !== 'MARQUEE'),
    'the shelf must not consist solely of expensive marquee projects');
const marqueeCandidate = candidates.find(title => title.catalogueTier === 'MARQUEE')!;
assert.ok(marqueeCandidate, 'premium titles must be acquirable without being free platform originals');
const viewingFacts = resolveStreamingViewingProjectFacts(migrated, {
    id: 'marquee-viewing-fixture', projectId: marqueeCandidate.id, title: marqueeCandidate.title,
    source: 'LICENSED_WINDOW', projectType: marqueeCandidate.projectType,
    genre: marqueeCandidate.genre, launchWeek: 1, releasePattern: 'SINGLE_PREMIERE',
    marketingPlan: 'STANDARD',
}, 1);
assert.equal(viewingFacts.quality, marqueeCandidate.quality,
    'normal viewing demand must use a seeded title’s real quality, not the generic fallback');
assert.equal(viewingFacts.rating, marqueeCandidate.rating);
assert.equal(viewingFacts.originalLanguageId, marqueeCandidate.originalLanguageId);
const standardTwin = { ...marqueeCandidate, catalogueTier: undefined };
const premiumQuote = getStreamingLicenseQuote(marqueeCandidate, 'MULTI_REGION', 104, 'NON_EXCLUSIVE');
const ordinaryQuote = getStreamingLicenseQuote(standardTwin, 'MULTI_REGION', 104, 'NON_EXCLUSIVE');
assert.ok(premiumQuote.suggestedGuarantee / ordinaryQuote.suggestedGuarantee >= 1.95
    && premiumQuote.suggestedGuarantee / ordinaryQuote.suggestedGuarantee <= 2.05,
    'a comparable premium licence must cost about twice an ordinary licence');
const component = { quality: 94, audience: 0, budget: 0, theatricalGross: 180_000_000,
    streamingRevenue: 0, franchiseProtected: false };
assert.equal(calculateStreamingCatalogueReferenceValue({ ...component, catalogueTier: 'MARQUEE' } as any),
    calculateStreamingCatalogueReferenceValue(component) * 2,
    'package allocation must value a marquee title consistently with direct deals');

assert.equal(typeof (contentMarket as any).searchContentMarketLibrary, 'function',
    'the full shared library needs a rights-aware inspection/search API');
const marketPlayer = structuredClone(migrated);
marketPlayer.ownedStreamingPlatform.lifecycle = 'FOUNDING';
marketPlayer.ownedStreamingPlatform.treasuryCash = 1_000_000_000;
const startingListings = contentMarket.getContentMarketListings(marketPlayer);
assert.ok(startingListings.length >= 8,
    'a funded new platform should see useful direct supply before normal world releases');
const poorBuyer = structuredClone(marketPlayer);
poorBuyer.ownedStreamingPlatform.treasuryCash = 0;
assert.ok(contentMarket.getContentMarketListings(poorBuyer).length > 0,
    'a poor player may inspect the same shared market without receiving free rights');
const poorAttempt = contentMarket.purchaseContentMarketListing(poorBuyer,
    startingListings[0].id, startingListings[0].signature);
assert.equal(poorAttempt.changed, false);
assert.equal(poorAttempt.player.ownedStreamingPlatform.treasuryCash, 0);
const heldTitle = startingListings[0].title;
marketPlayer.world.legacyStreamingRightsHolds = {
    ...(marketPlayer.world.legacyStreamingRightsHolds || {}),
    [heldTitle.id]: { sourceProjectId: heldTitle.id, reason: 'UNKNOWN_BUYER' } as any,
};
assert.equal(contentMarket.getContentMarketListings(marketPlayer)
    .some(listing => listing.title.id === heldTitle.id), false,
    'an unresolved legacy sale cannot remain a purchasable market card');
const heldSearch = (contentMarket as any).searchContentMarketLibrary(marketPlayer,
    { query: heldTitle.title, limit: 30 });
assert.equal(heldSearch.find((row: any) => row.title.id === heldTitle.id)?.status, 'UNRESOLVED',
    'search may show the film but must explain that its rights are unresolved');

const premiumBuyer = structuredClone(migrated);
premiumBuyer.ownedStreamingPlatform.lifecycle = 'FOUNDING';
premiumBuyer.ownedStreamingPlatform.treasuryCash = 1_000_000_000;
const premiumListing = contentMarket.getContentMarketListings(premiumBuyer)
    .find(listing => listing.title.catalogueTier === 'MARQUEE')!;
assert.ok(premiumListing, 'a premium title must appear among live rights offers');
const boughtPremium = contentMarket.purchaseContentMarketListing(premiumBuyer,
    premiumListing.id, premiumListing.signature);
assert.equal(boughtPremium.changed, true, boughtPremium.detail);
assert.ok(boughtPremium.player.ownedStreamingPlatform.catalogProjectIds.includes(premiumListing.title.id));
assert.ok(Object.values(boughtPremium.player.world.streamingRightsContracts || {})
    .some(contract => contract.sourceProjectId === premiumListing.title.id
        && contract.buyer.type === 'PLAYER_PLATFORM'));
assert.ok(boughtPremium.player.ownedStreamingPlatform.treasuryCash < premiumBuyer.ownedStreamingPlatform.treasuryCash);
assert.equal(contentMarket.searchContentMarketLibrary(boughtPremium.player,
    { query: premiumListing.title.title }).find(row => row.title.id === premiumListing.title.id)?.status,
    'OWNED', 'search must not offer a title already added to the player catalogue');

const packageBuyer = structuredClone(migrated);
packageBuyer.ownedStreamingPlatform.lifecycle = 'FOUNDING';
packageBuyer.ownedStreamingPlatform.treasuryCash = 20_000_000_000;
const auctionAssignments = contentMarket.getContentMarketAuctionAssignments(packageBuyer);
const historicalCollection = contentMarket.getContentMarketCollections(packageBuyer)
    .find(collection => !auctionAssignments.collectionIds.has(collection.id))!;
assert.ok(historicalCollection?.rows.length > 1,
    'seeded history must supply saleable collections, not only single titles');
const boughtCollection = contentMarket.purchaseContentMarketCollection(packageBuyer,
    historicalCollection.id, historicalCollection.signature);
assert.equal(boughtCollection.changed, true, boughtCollection.detail);
assert.ok(historicalCollection.package.components.every(component => boughtCollection.player.world.streamingRightsContracts
    && Object.values(boughtCollection.player.world.streamingRightsContracts)
        .some(contract => contract.sourceProjectId === component.sourceProjectId
            && contract.buyer.type === 'PLAYER_PLATFORM')),
    'a signed collection must give the player explicit title-level canonical rights');

assert.equal(typeof (historicalRivals as any).initializeHistoricalMarketPacing, 'function',
    'platform founding must persist a one-time first-look and rival opening state');
const founder = structuredClone(migrated);
founder.ownedStreamingPlatform.lifecycle = 'FOUNDING';
founder.ownedStreamingPlatform.foundingProfile = {
    incorporatedAtAbsoluteWeek: getAbsoluteWeek(founder.age, founder.currentWeek),
} as any;
const paced = (historicalRivals as any).initializeHistoricalMarketPacing(founder) as Player;
const pacing = (paced.world.historicalCatalogue as any).marketPacing;
assert.ok(pacing, 'founding must store first-look and rival-opening state');
assert.equal(pacing.anchorAbsoluteWeek, getAbsoluteWeek(founder.age, founder.currentWeek));
assert.equal(pacing.protectedTitleIds.length, 12,
    'the player gets a stable 12-title first-look set, not free licences');
assert.ok(pacing.protectedTitleIds.filter((id: string) => id.startsWith('historical_marquee_v2_')).length <= 2);
assert.equal(paced.ownedStreamingPlatform.catalogLicenses.length, founder.ownedStreamingPlatform.catalogLicenses.length);
assert.equal(paced.ownedStreamingPlatform.treasuryCash, founder.ownedStreamingPlatform.treasuryCash);
assert.ok(pacing.rivalOpeningContractIds.length <= 24);
assert.ok(pacing.rivalOpeningContractIds.every((id: string) => {
    const contract = paced.world.streamingRightsContracts![id];
    return contract?.buyer.type === 'AI_PLATFORM'
        && !pacing.protectedTitleIds.includes(contract.sourceProjectId)
        && contract.minimumGuarantee === 0;
}), 'rival opening claims must be explicit, compatible, non-financial and outside first-look');
assert.deepEqual((historicalRivals as any).initializeHistoricalMarketPacing(paced), paced,
    'a repeated migration or reopen cannot restart first-look or add rival claims');
const pacedReopen = migratePlayerSave(JSON.parse(JSON.stringify(paced)));
assert.deepEqual(pacedReopen.world.historicalCatalogue?.marketPacing, pacing,
    'a saved platform migration must preserve its original clock and claim ids');
assert.equal(Object.keys(pacedReopen.world.streamingRightsContracts || {}).length,
    Object.keys(paced.world.streamingRightsContracts || {}).length,
    'reopen must not recreate rival opening rights');
const firstRivalContract = paced.world.streamingRightsContracts?.[pacing.rivalOpeningContractIds[0]];
if (firstRivalContract) assert.ok(getAuthoredAiCataloguePositions(paced, firstRivalContract.buyerPlatformId!)
    .some(position => position.contractId === firstRivalContract.id),
    'an opening claim must be visible in the rival catalogue, not only block the player');
const existingPlatform = fresh();
existingPlatform.ownedStreamingPlatform.lifecycle = 'ACTIVE';
existingPlatform.ownedStreamingPlatform.foundingProfile = {
    incorporatedAtAbsoluteWeek: getAbsoluteWeek(existingPlatform.age, existingPlatform.currentWeek) - 100,
} as any;
const migratedExisting = migratePlayerSave(existingPlatform);
assert.equal(migratedExisting.world.historicalCatalogue?.marketPacing?.anchorAbsoluteWeek,
    getAbsoluteWeek(existingPlatform.age, existingPlatform.currentWeek),
    'an older live platform first receiving the library starts its grace at migration, not 100 weeks ago');

const beforeGraceEnds = structuredClone(paced);
beforeGraceEnds.currentWeek += 11;
assert.equal(historicalRivals.isHistoricalMarketGraceActive(beforeGraceEnds), true,
    'week 11 of a new platform must still be protected below 25 playable titles');
assert.deepEqual(historicalRivals.processHistoricalMarketRivalWeek(beforeGraceEnds), beforeGraceEnds,
    'rivals must not take new positions in the protected first-look interval');
const atGraceEnd = structuredClone(paced);
atGraceEnd.currentWeek += 12;
assert.equal(historicalRivals.isHistoricalMarketGraceActive(atGraceEnd), false,
    'grace must end exactly 12 game weeks after its saved anchor');
const contested = historicalRivals.processHistoricalMarketRivalWeek(atGraceEnd);
const newContracts = Object.keys(contested.world.streamingRightsContracts || {}).filter(id =>
    !atGraceEnd.world.streamingRightsContracts?.[id]);
assert.equal(newContracts.length, 1, 'one rights-valid rival acquisition should occur per three-week cycle');
assert.ok(contested.world.streamingRightsContracts?.[newContracts[0]]?.minimumGuarantee > 0);
const paidRivalContract = contested.world.streamingRightsContracts![newContracts[0]];
assert.equal(contested.world.platforms[paidRivalContract.buyerPlatformId!].cashReserve,
    atGraceEnd.world.platforms[paidRivalContract.buyerPlatformId!].cashReserve
        - fullCurrencyToMillions(paidRivalContract.minimumGuarantee),
    'a new rival win must debit only that rival’s treasury in the correct currency unit');
assert.equal(contested.ownedStreamingPlatform.treasuryCash, atGraceEnd.ownedStreamingPlatform.treasuryCash,
    'rival bidding cannot charge the player');
const rivalTitleId = contested.world.streamingRightsContracts![newContracts[0]].sourceProjectId;
assert.equal(contentMarket.searchContentMarketLibrary(contested,
    { query: rivalTitleId, limit: 100 }).find(row => row.title.id === rivalTitleId)?.status, undefined,
    'internal IDs should not leak as a customer search term');
const rivalTitle = getHistoricalCatalogueTitles(contested).find(title => title.id === rivalTitleId)!;
assert.equal(contentMarket.searchContentMarketLibrary(contested,
    { query: rivalTitle.title, limit: 100 }).find(row => row.title.id === rivalTitleId)?.status, 'HELD',
    'a rival win must remain discoverable but no longer purchasable');
assert.deepEqual(historicalRivals.processHistoricalMarketRivalWeek(contested), contested,
    'a repeated weekly tick cannot charge the rival or create the deal twice');
let threeCycles = contested;
for (let index = 0; index < 3; index += 1) {
    threeCycles = structuredClone(threeCycles);
    threeCycles.currentWeek += 3;
    threeCycles = historicalRivals.processHistoricalMarketRivalWeek(threeCycles);
}
assert.ok(Object.values(threeCycles.world.streamingRightsContracts || {}).some(contract =>
    contract.buyer.type === 'AI_PLATFORM'
    && contract.minimumGuarantee > 0
    && getHistoricalCatalogueTitles(threeCycles).some(title => title.id === contract.sourceProjectId
        && title.catalogueTier === 'MARQUEE')),
    'after grace, rivals must periodically contest available premium marquee projects');

const playableFixture = structuredClone(paced);
const playableTitles = getStreamingLicenseCandidatePool(playableFixture)
    .filter(title => !Object.values(playableFixture.world.streamingRightsContracts || {})
        .some(contract => contract.sourceProjectId === title.id)).slice(0, 25);
const now = getAbsoluteWeek(playableFixture.age, playableFixture.currentWeek);
playableFixture.ownedStreamingPlatform.lifecycle = 'ACTIVE';
playableFixture.ownedStreamingPlatform.marketOperations = [{
    scope: 'COUNTRY', scopeId: 'US', countryId: 'US', status: 'ACTIVE', entryKind: 'OPENING',
} as any];
playableFixture.ownedStreamingPlatform.launchCommit = { idempotencyKey: 'playable-fixture', committedAtAbsoluteWeek: now - 1 } as any;
playableFixture.ownedStreamingPlatform.launchSlate = {
    entries: playableTitles.map(title => ({ id: `slate-${title.id}`, projectId: title.id, launchWeek: 1 } as any)),
} as any;
playableFixture.ownedStreamingPlatform.catalogProjectIds = playableTitles.map(title => title.id);
playableFixture.ownedStreamingPlatform.catalogLicenses = playableTitles.map(title => createStreamingLicenseContract({
    id: `playable-${title.id}`, sourceProject: { id: title.id, title: title.title,
        mediaType: title.projectType, genre: title.genre },
    buyerPlatformId: null, platformContentPlanId: null, cataloguePackageId: null,
    licensorName: title.studioName, territory: 'GLOBAL', durationWeeks: 104,
    exclusivity: 'NON_EXCLUSIVE', minimumGuarantee: 0, platformRevenueShare: 72,
    signedAtAbsoluteWeek: now, startsAtAbsoluteWeek: now, origin: 'STUDIO_MARKET',
    sellerType: 'STUDIO', sellerPlatformId: null, windowType: 'FIRST_WINDOW',
    accessGrant: { schemaVersion: 1, modes: ['SUBSCRIPTION'], earlyWindowWeeks: 0,
        purchaseFulfillment: 'NONE', source: 'EXPLICIT' },
}));
assert.equal(historicalRivals.countActuallyPlayableMarketTitles(playableFixture), 25,
    'the 25-title threshold must require playable rights and an active market');
assert.equal(historicalRivals.isHistoricalMarketGraceActive(playableFixture), false,
    '25 live titles should end first-look even before week 12');
playableFixture.ownedStreamingPlatform.catalogLicenses.pop();
assert.equal(historicalRivals.countActuallyPlayableMarketTitles(playableFixture), 24,
    'a catalogue entry without valid streaming rights must not count as playable');
assert.equal(historicalRivals.isHistoricalMarketGraceActive(playableFixture), true,
    '24 playable titles keep first-look active');

console.log('Historical market Phase 5–6 audit passed.');
