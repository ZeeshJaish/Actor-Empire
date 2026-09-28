import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { resolveStreamingRightsCompatibility } from '../services/streamingRightsCompatibility';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { compareProtectedSaveState, createSaveIntegrityManifest, verifySaveIntegrity } from '../services/saveIntegrity';
import { getContentMarketListings, purchaseContentMarketListing, searchContentMarketLibrary } from '../services/streamingContentMarket';
import {
    createStreamingLicenseContract, createStreamingRightsContractFromLicense,
    migrateStreamingRightsContractRegistry,
} from '../services/streamingRightsCore';

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
    player.id = 'legacy-rights-fixture';
    player.name = 'Legacy Rights Fixture';
    player.age = 30;
    player.currentWeek = 12;
    player.money = 123_456_789;
    return player;
};

const assertPermanent = (player: Player, projectId: string, buyerId: string): void => {
    const matches = Object.values(player.world.streamingRightsContracts || {})
        .filter(contract => contract.sourceProjectId === projectId);
    assert.equal(matches.length, 1, `${projectId} must have one canonical right`);
    const contract = matches[0];
    assert.equal(contract.buyer.platformId, buyerId);
    assert.equal(contract.permanentPurchase, true);
    assert.equal(contract.windowType, 'PERMANENT');
    assert.equal(contract.exclusivity, 'EXCLUSIVE');
    assert.equal(contract.territory, 'GLOBAL');
    assert.equal(contract.expiresAtAbsoluteWeek, Number.MAX_SAFE_INTEGER);
    const availability = resolveStreamingRightsCompatibility({
        world: player.world,
        sourceProjectId: projectId,
        buyerPlatformId: null,
        territory: 'GLOBAL',
        startsAtAbsoluteWeek: (player.age - 1) * 52 + player.currentWeek - 1,
        expiresAtAbsoluteWeek: (player.age - 1) * 52 + player.currentWeek + 51,
        windowType: 'FIRST_WINDOW',
        exclusivity: 'EXCLUSIVE',
    });
    assert.equal(availability.available, false, `${projectId} must not return to the market`);
};

const unresolvedWorld = {
    streamingRightsContracts: {},
    legacyStreamingRightsHolds: {
        'legacy-unknown-buyer': {
            id: 'legacy-rights-hold:legacy-unknown-buyer',
            sourceProjectId: 'legacy-unknown-buyer',
            reason: 'UNKNOWN_BUYER',
            observedAtAbsoluteWeek: 1_500,
        },
    },
} as any;
const held = resolveStreamingRightsCompatibility({
    world: unresolvedWorld,
    sourceProjectId: 'legacy-unknown-buyer', buyerPlatformId: null,
    territory: 'GLOBAL', startsAtAbsoluteWeek: 1_500, expiresAtAbsoluteWeek: 1_552,
    windowType: 'FIRST_WINDOW', exclusivity: 'EXCLUSIVE',
});
assert.equal(held.available, false, 'a sale with an unknown buyer must not be listed');
assert.equal(held.conflicts[0]?.code, 'LEGACY_RIGHTS_UNRESOLVED');
assert.equal(resolveStreamingRightsCompatibility({
    world: unresolvedWorld,
    sourceProjectId: 'different-unsold-title', buyerPlatformId: null,
    territory: 'GLOBAL', startsAtAbsoluteWeek: 1_500, expiresAtAbsoluteWeek: 1_552,
    windowType: 'FIRST_WINDOW', exclusivity: 'EXCLUSIVE',
}).available, true);

const activeRaw = fresh();
activeRaw.activeReleases = [{
    id: 'legacy-active-sold', name: 'Old Active Film', type: 'MOVIE',
    distributionPhase: 'STREAMING', status: 'FINISHED',
    projectDetails: { studioId: 'PARAMOUNT', genre: 'DRAMA', hiddenStats: {} },
    streaming: { platformId: 'NETFLIX', weekOnPlatform: 8, totalViews: 50,
        weeklyViews: [], isLeaving: false },
} as any];
const activeMigrated = migratePlayerSave(activeRaw);
assertPermanent(activeMigrated, 'legacy-active-sold', 'NETFLIX');
assert.equal(activeMigrated.money, activeRaw.money);
assert.deepEqual(activeMigrated.finance.history, activeRaw.finance.history);

const archivedRaw = fresh();
archivedRaw.pastProjects = [{
    id: 'legacy-archived-sold', name: 'Old Archived Film', type: 'ACTING_GIG',
    year: 29, releaseYear: 29, releaseWeek: 4, projectType: 'MOVIE',
    studioId: 'UNIVERSAL', genre: 'DRAMA', streamingPlatform: 'HULU',
    rating: 7.8, projectQuality: 76,
} as any];
const archivedMigrated = migratePlayerSave(archivedRaw);
assertPermanent(archivedMigrated, 'legacy-archived-sold', 'HULU');
assert.equal(archivedMigrated.money, archivedRaw.money);

const finiteLicense = createStreamingLicenseContract({
    id: 'explicit-finite-contract',
    sourceProject: { id: 'explicit-finite-film', title: 'Limited Film', mediaType: 'MOVIE', genre: 'DRAMA' },
    buyerPlatformId: 'NETFLIX', platformContentPlanId: null, cataloguePackageId: null,
    licensorName: 'Paramount Pictures', territory: 'DOMESTIC', countryIds: ['US'],
    durationWeeks: 26, exclusivity: 'EXCLUSIVE', minimumGuarantee: 4_000_000,
    platformRevenueShare: 90, signedAtAbsoluteWeek: 1_500, startsAtAbsoluteWeek: 1_500,
    status: 'ACTIVE', origin: 'STUDIO_MARKET', sellerType: 'STUDIO', sellerPlatformId: null,
    windowType: 'FIRST_WINDOW', permanentPurchase: false,
});
const finiteContract = createStreamingRightsContractFromLicense({
    license: finiteLicense,
    seller: { type: 'NPC_STUDIO', id: 'PARAMOUNT', name: 'Paramount Pictures', platformId: null },
    buyer: { type: 'AI_PLATFORM', id: 'NETFLIX', name: 'Netflix', platformId: 'NETFLIX' },
    guaranteeDisposition: 'PAID', settledAtAbsoluteWeek: 1_500,
});
const finiteRaw = fresh();
finiteRaw.world.streamingRightsContracts = { [finiteContract.id]: finiteContract };
finiteRaw.activeReleases = [{
    id: 'explicit-finite-film', name: 'Limited Film', type: 'MOVIE',
    distributionPhase: 'STREAMING', status: 'FINISHED',
    projectDetails: { studioId: 'PARAMOUNT', genre: 'DRAMA', hiddenStats: {} },
    streaming: { platformId: 'NETFLIX', weekOnPlatform: 3, totalViews: 5,
        weeklyViews: [], isLeaving: false },
} as any];
const finiteMigrated = migratePlayerSave(finiteRaw);
const finiteRights = Object.values(finiteMigrated.world.streamingRightsContracts || {})
    .filter(contract => contract.sourceProjectId === 'explicit-finite-film');
assert.equal(finiteRights.length, 1, 'an explicit contract must not gain a duplicate fallback');
assert.equal(finiteRights[0].permanentPurchase, false);
assert.equal(finiteRights[0].durationWeeks, 26);
assert.equal(finiteRights[0].expiresAtAbsoluteWeek, 1_526);
assert.equal(finiteRights[0].territory, 'DOMESTIC');
assert.deepEqual(finiteRights[0].countryIds, ['US']);
assert.equal(finiteMigrated.money, finiteRaw.money);

const expiredRaw = fresh();
expiredRaw.world.streamingRightsContracts = {
    [finiteContract.id]: { ...finiteContract, status: 'EXPIRED', expiresAtAbsoluteWeek: 1_505 },
};
expiredRaw.pastProjects = [{
    id: 'explicit-finite-film', name: 'Limited Film', type: 'ACTING_GIG', year: 29,
    projectType: 'MOVIE', studioId: 'PARAMOUNT', genre: 'DRAMA', streamingPlatform: 'NETFLIX',
} as any];
const expiredMigrated = migratePlayerSave(expiredRaw);
assert.equal(expiredMigrated.world.streamingRightsContracts?.[finiteContract.id]?.status, 'EXPIRED');
assert.equal(expiredMigrated.world.streamingRightsContracts?.[finiteContract.id]?.permanentPurchase, false);

const oldSynthetic = migrateStreamingRightsContractRegistry(activeRaw);
assert.equal(Object.values(oldSynthetic.world.streamingRightsContracts || {})[0]?.durationWeeks, 52);
assertPermanent(migratePlayerSave(oldSynthetic), 'legacy-active-sold', 'NETFLIX');

const scopedSynthetic = structuredClone(oldSynthetic);
const scopedId = Object.keys(scopedSynthetic.world.streamingRightsContracts || {})[0];
scopedSynthetic.world.streamingRightsContracts![scopedId] = {
    ...scopedSynthetic.world.streamingRightsContracts![scopedId],
    territory: 'DOMESTIC', countryIds: ['US'], exclusivity: 'NON_EXCLUSIVE',
};
const scopedMigrated = migratePlayerSave(scopedSynthetic);
const scopedRight = scopedMigrated.world.streamingRightsContracts?.[scopedId];
assert.equal(scopedRight?.permanentPurchase, true);
assert.equal(scopedRight?.territory, 'DOMESTIC', 'recorded territory must survive term repair');
assert.deepEqual(scopedRight?.countryIds, ['US']);
assert.equal(scopedRight?.exclusivity, 'NON_EXCLUSIVE', 'recorded exclusivity must survive term repair');

const terminatedSynthetic = structuredClone(oldSynthetic);
const terminatedId = Object.keys(terminatedSynthetic.world.streamingRightsContracts || {})[0];
terminatedSynthetic.world.streamingRightsContracts![terminatedId] = {
    ...terminatedSynthetic.world.streamingRightsContracts![terminatedId], status: 'TERMINATED',
};
const terminatedMigrated = migratePlayerSave(terminatedSynthetic);
assert.equal(terminatedMigrated.world.streamingRightsContracts?.[terminatedId]?.status, 'TERMINATED',
    'a genuinely terminated fallback must not be revived');
assert.equal(terminatedMigrated.world.streamingRightsContracts?.[terminatedId]?.permanentPurchase, false);

const unknownRaw = fresh();
unknownRaw.pastProjects = [{
    id: 'legacy-unknown-buyer', name: 'Unclear Old Sale', type: 'ACTING_GIG',
    year: 29, projectType: 'MOVIE', studioId: 'UNIVERSAL', genre: 'DRAMA',
    streamingContractId: 'missing-old-contract',
} as any];
const unknownMigrated = migratePlayerSave(unknownRaw);
assert.equal(unknownMigrated.world.legacyStreamingRightsHolds?.['legacy-unknown-buyer']?.reason, 'UNKNOWN_BUYER');
assert.equal(resolveStreamingRightsCompatibility({
    world: unknownMigrated.world,
    sourceProjectId: 'legacy-unknown-buyer', buyerPlatformId: null,
    territory: 'GLOBAL', startsAtAbsoluteWeek: 1_519, expiresAtAbsoluteWeek: 1_571,
    windowType: 'FIRST_WINDOW', exclusivity: 'EXCLUSIVE',
}).available, false);
assert.deepEqual(
    migratePlayerSave(compactPlayerForPersistence(unknownMigrated)).world.legacyStreamingRightsHolds,
    unknownMigrated.world.legacyStreamingRightsHolds,
);
assert.equal(compareProtectedSaveState(unknownMigrated, {
    ...unknownMigrated,
    world: { ...unknownMigrated.world, legacyStreamingRightsHolds: {} },
}).ok, false, 'compaction must not discard unresolved-rights holds');
assert.equal(verifySaveIntegrity(unknownMigrated,
    createSaveIntegrityManifest(unknownMigrated, 'MIGRATION')).ok, true);

const unknownPlatformRaw = fresh();
unknownPlatformRaw.pastProjects = [{
    id: 'unknown-platform-sale', name: 'Unverified Platform', type: 'ACTING_GIG',
    year: 29, projectType: 'MOVIE', studioId: 'UNIVERSAL', genre: 'DRAMA',
    streamingPlatform: 'UNRECOGNIZED_PLATFORM',
} as any];
assert.equal(migratePlayerSave(unknownPlatformRaw).world.legacyStreamingRightsHolds
    ?.['unknown-platform-sale']?.reason, 'UNKNOWN_BUYER');

const revenueOnlyRaw = fresh();
revenueOnlyRaw.pastProjects = [{
    id: 'revenue-only-sale', name: 'Revenue Only', type: 'ACTING_GIG',
    year: 29, projectType: 'MOVIE', studioId: 'UNIVERSAL', genre: 'DRAMA',
    streamingRevenue: 9_000_000,
} as any];
assert.equal(migratePlayerSave(revenueOnlyRaw).world.legacyStreamingRightsHolds
    ?.['revenue-only-sale']?.reason, 'UNKNOWN_BUYER');

const conflictingRaw = fresh();
conflictingRaw.pastProjects = [{
    id: 'conflicting-sale', name: 'Conflicting Sale', type: 'ACTING_GIG',
    year: 29, projectType: 'MOVIE', studioId: 'UNIVERSAL', genre: 'DRAMA',
    streamingPlatform: 'NETFLIX',
    streamingRuns: [{ platformId: 'HULU', contractId: 'missing-run',
        startWeekAbsolute: 1_500, weekOnPlatform: 1, totalViews: 1,
        weeklyViews: [], isLeaving: false }],
} as any];
assert.equal(migratePlayerSave(conflictingRaw).world.legacyStreamingRightsHolds
    ?.['conflicting-sale']?.reason, 'CONFLICTING_EVIDENCE');

const orphanBidRaw = fresh();
orphanBidRaw.pastProjects = [{
    id: 'accepted-bid-without-contract', name: 'Orphan Accepted Bid', type: 'ACTING_GIG',
    year: 29, projectType: 'MOVIE', studioId: 'UNIVERSAL', genre: 'DRAMA',
} as any];
orphanBidRaw.world.streamingBiddingSessions = {
    'old-accepted-room': {
        id: 'old-accepted-room', projectId: 'accepted-bid-without-contract',
        status: 'ACCEPTED', acceptedOfferId: 'old-winning-offer',
        offers: [{ id: 'old-winning-offer', platformId: 'NETFLIX', status: 'ACCEPTED',
            durationWeeks: 52, territory: 'GLOBAL' }],
    } as any,
};
const orphanBidMigrated = migratePlayerSave(orphanBidRaw);
assert.equal(orphanBidMigrated.world.legacyStreamingRightsHolds
    ?.['accepted-bid-without-contract']?.reason, 'UNVERIFIED_ACCEPTED_BID');
assert.equal(resolveStreamingRightsCompatibility({
    world: orphanBidMigrated.world,
    sourceProjectId: 'accepted-bid-without-contract', buyerPlatformId: null,
    territory: 'GLOBAL', startsAtAbsoluteWeek: 1_519, expiresAtAbsoluteWeek: 1_571,
    windowType: 'FIRST_WINDOW', exclusivity: 'EXCLUSIVE',
}).available, false);

const ownedNoTermRaw = fresh();
ownedNoTermRaw.ownedStreamingPlatform.catalogLicenses = [{
    id: 'old-player-platform-license', sourceProjectId: 'old-player-platform-film',
    titleAtSigning: 'Player Platform Film', licensorName: 'Independent Studio',
    territory: 'GLOBAL', countryIds: [], exclusivity: 'EXCLUSIVE',
    minimumGuarantee: 3_000_000, platformRevenueShare: 90,
    signedAtAbsoluteWeek: 1_500, startsAtAbsoluteWeek: 1_500,
    status: 'ACTIVE', origin: 'STUDIO_MARKET', sellerType: 'STUDIO',
} as any];
const ownedNoTermMigrated = migratePlayerSave(ownedNoTermRaw);
const ownedNoTermContract = ownedNoTermMigrated.world.streamingRightsContracts?.['old-player-platform-license'];
assert.equal(ownedNoTermContract?.buyer.type, 'PLAYER_PLATFORM');
assert.equal(ownedNoTermContract?.permanentPurchase, true);
assert.equal(ownedNoTermContract?.expiresAtAbsoluteWeek, Number.MAX_SAFE_INTEGER);
assert.equal(ownedNoTermMigrated.ownedStreamingPlatform.catalogLicenses[0]?.expiresAtAbsoluteWeek,
    Number.MAX_SAFE_INTEGER);
assert.equal(ownedNoTermMigrated.money, ownedNoTermRaw.money);

const ownedScopedRaw = structuredClone(ownedNoTermRaw);
ownedScopedRaw.ownedStreamingPlatform.catalogLicenses[0] = {
    ...ownedScopedRaw.ownedStreamingPlatform.catalogLicenses[0],
    territory: 'DOMESTIC', countryIds: ['US'], exclusivity: 'NON_EXCLUSIVE',
};
const ownedScopedMigrated = migratePlayerSave(ownedScopedRaw);
assert.equal(ownedScopedMigrated.world.streamingRightsContracts?.['old-player-platform-license']?.territory,
    'DOMESTIC');
assert.deepEqual(ownedScopedMigrated.world.streamingRightsContracts?.['old-player-platform-license']?.countryIds,
    ['US']);
assert.equal(ownedScopedMigrated.ownedStreamingPlatform.catalogLicenses[0]?.exclusivity,
    'NON_EXCLUSIVE');

const ownedMissingCountriesRaw = structuredClone(ownedScopedRaw);
ownedMissingCountriesRaw.ownedStreamingPlatform.catalogLicenses[0] = {
    ...ownedMissingCountriesRaw.ownedStreamingPlatform.catalogLicenses[0], countryIds: [],
};
const ownedMissingCountries = migratePlayerSave(ownedMissingCountriesRaw);
assert.equal(ownedMissingCountries.world.legacyStreamingRightsHolds
    ?.['old-player-platform-film']?.reason, 'CONFLICTING_EVIDENCE',
    'a recorded bounded territory with no countries must be held, not widened globally');
assert.notEqual(ownedMissingCountries.world.streamingRightsContracts
    ?.['old-player-platform-license']?.territory, 'GLOBAL');

const aiNoTermRaw = fresh();
aiNoTermRaw.world.platforms!.NETFLIX.ai = { rightsContracts: [{
    id: 'old-ai-platform-license', sourceProjectId: 'old-ai-platform-film',
    titleAtSigning: 'AI Platform Film', licensorName: 'Independent Studio',
    territory: 'GLOBAL', countryIds: [], exclusivity: 'EXCLUSIVE',
    minimumGuarantee: 3_000_000, platformRevenueShare: 90,
    signedAtAbsoluteWeek: 1_500, startsAtAbsoluteWeek: 1_500,
    status: 'ACTIVE', origin: 'STUDIO_MARKET', sellerType: 'STUDIO',
} as any] } as any;
const aiNoTermMigrated = migratePlayerSave(aiNoTermRaw);
assert.equal(aiNoTermMigrated.world.streamingRightsContracts?.['old-ai-platform-license']?.permanentPurchase, true);
assert.equal(aiNoTermMigrated.world.platforms?.NETFLIX.ai?.rightsContracts.find(
    contract => contract.id === 'old-ai-platform-license')?.expiresAtAbsoluteWeek, Number.MAX_SAFE_INTEGER);

const marketRaw = structuredClone(unknownRaw);
marketRaw.ownedStreamingPlatform.lifecycle = 'ACTIVE';
const marketMigrated = migratePlayerSave(marketRaw);
const unresolvedListing = getContentMarketListings(marketMigrated)
    .find(listing => listing.title.id === 'legacy-unknown-buyer');
assert.equal(unresolvedListing, undefined, 'an unresolved old sale cannot be a purchasable listing');
assert.equal(searchContentMarketLibrary(marketMigrated, { query: 'Unclear Old Sale' })
    .find(row => row.title.id === 'legacy-unknown-buyer')?.status, 'UNRESOLVED',
    'the old sale must remain inspectable with its rights warning');
const deniedPurchase = purchaseContentMarketListing(marketMigrated,
    'STUDIO_ACQUISITION:legacy-unknown-buyer', 'stale-held-title');
assert.equal(deniedPurchase.changed, false);
assert.equal(deniedPurchase.player.money, marketMigrated.money);

const unsoldRaw = fresh();
unsoldRaw.ownedStreamingPlatform.lifecycle = 'ACTIVE';
unsoldRaw.pastProjects = [{
    id: 'unsold-old-film', name: 'Unsold Old Film', type: 'ACTING_GIG',
    year: 29, projectType: 'MOVIE', studioId: 'UNIVERSAL', genre: 'DRAMA',
} as any];
const unsoldMigrated = migratePlayerSave(unsoldRaw);
const unsoldListing = getContentMarketListings(unsoldMigrated)
    .find(listing => listing.title.id === 'unsold-old-film');
const unsoldSearch = searchContentMarketLibrary(unsoldMigrated, { query: 'Unsold Old Film' })
    .find(row => row.title.id === 'unsold-old-film');
assert.ok(unsoldSearch, 'an unsold old film remains in the shared library');
assert.ok(unsoldSearch.status === 'AVAILABLE' || unsoldSearch.status === 'NOT_OFFERED',
    'unsold history may rotate off the direct shelf but cannot be rights-blocked');
if (unsoldListing) assert.equal(unsoldListing.unavailableReason, null);

const replay = migratePlayerSave(activeMigrated);
assert.deepEqual(replay.world.streamingRightsContracts, activeMigrated.world.streamingRightsContracts);
assert.deepEqual(
    migratePlayerSave(compactPlayerForPersistence(activeMigrated)).world.streamingRightsContracts,
    activeMigrated.world.streamingRightsContracts,
);

console.log('Legacy streaming rights Phase 1–2 audit passed.');
