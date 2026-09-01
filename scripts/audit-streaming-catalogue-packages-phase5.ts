import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type Player } from '../types';
import StreamingCataloguePackageDesk from '../components/StreamingCataloguePackageDesk';
import { StreamingBiddingRoom } from '../views/lifestyle/business/components/StreamingBiddingRoom';
import { normalizeStreamingRightsManagementState } from '../services/streamingRightsCalendar';
import {
    allocateStreamingCatalogueGuarantee,
    acceptStreamingCataloguePackageOffer,
    calculateStreamingCatalogueReferenceValue,
    createStreamingCataloguePackage,
    getStreamingCataloguePackageDesk,
    getStreamingCatalogueRenewalGroups,
    normalizeStreamingCataloguePackageRegistry,
    processStreamingCataloguePackagesWeek,
    updateStreamingCataloguePackagePolicy,
    validateStreamingCatalogueOfferRows,
} from '../services/streamingCataloguePackages';
import {
    createStreamingLicenseContract,
    createStreamingRightsContractFromLicense,
} from '../services/streamingRightsCore';
import {
    acceptStreamingBiddingOffer,
    advanceStreamingBiddingSession,
    createStreamingCatalogueBiddingSession,
    createStreamingBiddingSession,
    getStreamingBiddingClosingOffers,
    normalizeStreamingBiddingSessionRegistry,
} from '../services/streamingBidding';
import { processStreamingRightsCalendarWeek } from '../services/streamingRightsCalendar';
import { migratePlayerSave } from '../services/saveMigration';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { processStreamingCataloguePackageStrategyAutomation } from '../services/streamingCataloguePackageAutomation';
import { normalizePlatformAiState } from '../services/platformAi/platformAiState';

assert.deepEqual(
    (INITIAL_PLAYER.world as any).streamingCataloguePackages,
    {},
    'new games must initialize an empty catalogue-package registry',
);
assert.deepEqual(INITIAL_PLAYER.streamingRightsManagement?.packagePolicy, {
    automation: 'SUGGEST_ONLY',
    preferredSize: { min: 3, max: 6 },
    maximumAutomaticSize: 7,
    maximumAutomaticDurationWeeks: 104,
    allowAutomaticExclusive: false,
    allowAutomaticGlobal: false,
    minimumGuaranteeRatio: 0.85,
}, 'new games must expose the safe package policy without waiting for migration');

const defaultManagement = normalizeStreamingRightsManagementState(undefined);
assert.deepEqual(defaultManagement.packagePolicy, {
    automation: 'SUGGEST_ONLY',
    preferredSize: { min: 3, max: 6 },
    maximumAutomaticSize: 7,
    maximumAutomaticDurationWeeks: 104,
    allowAutomaticExclusive: false,
    allowAutomaticGlobal: false,
    minimumGuaranteeRatio: 0.85,
}, 'missing saves must receive the safe package-management policy');

const titleSession = createStreamingBiddingSession({
    projectId: 'package-subject',
    title: 'Empire Crime Collection',
    sellerStudioId: 'empire-studios',
    sellerStudioName: 'Empire Studios',
    absoluteWeek: 400,
    projectType: 'MOVIE',
    genre: 'CRIME',
    projectBudget: 100_000_000,
    packageScore: 80,
    platforms: [{
        id: 'NETFLIX',
        name: 'Netflix',
        color: '#e50914',
        cashAvailable: 2_000_000_000,
        baseBid: 100_000_000,
        acquisitionCeiling: 800_000_000,
        qualityPreference: 75,
        relationshipMultiplier: 1,
    }],
});
assert.equal(
    (normalizeStreamingBiddingSessionRegistry({ [titleSession.id]: titleSession })[titleSession.id] as any).subjectKind,
    'TITLE',
    'legacy and existing title sessions must normalize to an explicit TITLE subject',
);
const transferredPackageSession = normalizeStreamingBiddingSessionRegistry({
    [titleSession.id]: {
        ...titleSession,
        subjectKind: 'CATALOGUE_PACKAGE',
        cataloguePackageId: 'catalogue-package-1',
        componentLots: [{ ...titleSession.rightsLot, id: 'lot-a', sourceProjectId: 'film-a' }],
        offers: titleSession.offers.map(offer => ({
            ...offer,
            cataloguePackageId: 'catalogue-package-1',
            componentTerms: [{
                componentProjectId: 'film-a',
                componentLotId: 'lot-a',
                minimumGuarantee: offer.minimumGuarantee,
                licensorRevenueShare: offer.licensorRevenueShare,
                platformRevenueShare: offer.platformRevenueShare,
                backendBasis: offer.backendBasis,
                guaranteeRecoupment: offer.guaranteeRecoupment,
                backendCap: offer.backendCap,
                territory: offer.territory,
                countryIds: offer.countryIds,
                windowType: offer.windowType,
                durationWeeks: offer.durationWeeks,
                exclusivity: offer.exclusivity,
                localization: offer.localization,
                expectedRoyaltyCost: offer.expectedRoyaltyCost,
                expectedTotalCost: offer.expectedTotalCost,
                referenceAllocation: offer.minimumGuarantee,
                bidderWeight: 1,
            }],
        })),
    },
})[titleSession.id] as any;
assert.equal(transferredPackageSession.subjectKind, 'CATALOGUE_PACKAGE');
assert.equal(transferredPackageSession.cataloguePackageId, 'catalogue-package-1');
assert.equal(transferredPackageSession.componentLots.length, 1);
assert.equal(transferredPackageSession.offers[0].componentTerms.length, 1);

const packagePlayer = structuredClone(INITIAL_PLAYER) as Player;
packagePlayer.businesses = [{
    id: 'empire-studios',
    name: 'Empire Studios',
    type: 'PRODUCTION_HOUSE',
    subtype: 'MAJOR_STUDIO',
    balance: 100_000_000,
    isActive: true,
    stats: { weeklyRevenue: 0, weeklyProfit: 0, lifetimeRevenue: 0, valuation: 500_000_000 },
    studioState: { scripts: [], concepts: [], writers: [], ipMarket: [], lastMarketRefreshWeek: 0, lastWriterRefreshWeek: 0 },
} as any];
packagePlayer.pastProjects = [
    { id: 'film-a', name: 'Monsoon City', studioId: 'empire-studios', projectType: 'MOVIE', genre: 'DRAMA', projectQuality: 82, rating: 8.1, budget: 70_000_000, gross: 310_000_000, streamingRevenue: 25_000_000, originalLanguageId: 'hindi', investorPlan: { targetRaise: 20_000_000, totalRaised: 20_000_000, investorEquityPercent: 20, studioEquityPercent: 80, commitments: [] }, investorPayouts: { lifetimeInvestorPayout: 0, weeklyInvestorPayouts: [] } },
    { id: 'film-b', name: 'Silent Border', studioId: 'empire-studios', projectType: 'MOVIE', genre: 'THRILLER', projectQuality: 74, rating: 7.4, budget: 45_000_000, gross: 140_000_000, streamingRevenue: 12_000_000, originalLanguageId: 'english' },
    { id: 'commissioned', name: 'Platform Assignment', studioId: 'empire-studios', projectType: 'MOVIE', genre: 'DRAMA', projectQuality: 88, rating: 8.4, budget: 90_000_000, gross: 0, countsTowardOwnedStudioEvaluation: false, isPlatformCommissionCredit: true },
] as any;
const indiaLicense = createStreamingLicenseContract({
    id: 'existing-india-license',
    sourceProject: { id: 'film-a', title: 'Monsoon City', mediaType: 'MOVIE', genre: 'DRAMA' },
    buyerPlatformId: 'NETFLIX',
    platformContentPlanId: null,
    cataloguePackageId: null,
    licensorName: 'Empire Studios',
    territory: 'DOMESTIC',
    countryIds: ['IN'],
    durationWeeks: 200,
    exclusivity: 'EXCLUSIVE',
    minimumGuarantee: 80_000_000,
    platformRevenueShare: 75,
    signedAtAbsoluteWeek: 300,
    startsAtAbsoluteWeek: 300,
    origin: 'STUDIO_MARKET',
    sellerType: 'STUDIO',
    sellerPlatformId: null,
    windowType: 'FIRST_WINDOW',
    permanentPurchase: false,
    renewalOption: true,
    sublicensingAllowed: false,
    sequelRightsIncluded: false,
    changeOfControl: 'NOTICE',
});
const indiaContract = createStreamingRightsContractFromLicense({
    license: indiaLicense,
    seller: { type: 'PLAYER_STUDIO', id: 'empire-studios', name: 'Empire Studios', platformId: null },
    buyer: { type: 'AI_PLATFORM', id: 'NETFLIX', name: 'Netflix', platformId: 'NETFLIX' },
    guaranteeDisposition: 'PAID',
    settledAtAbsoluteWeek: 300,
});
packagePlayer.world.streamingRightsContracts = { [indiaContract.id]: indiaContract };

const createdPackage = createStreamingCataloguePackage(packagePlayer, {
    studioId: 'empire-studios',
    name: 'Empire Crime Collection',
    projectIds: ['commissioned', 'film-b', 'film-a', 'film-a'],
    source: 'PLAYER_CURATED',
    absoluteWeek: 400,
    startsAtAbsoluteWeek: 400,
    desiredCountryIds: ['IN', 'US'],
    maximumDurationWeeks: 104,
    windowType: 'FIRST_WINDOW',
    exclusivity: 'EXCLUSIVE',
});
assert.ok(createdPackage.package, 'two eligible real titles should create a package');
assert.deepEqual(createdPackage.package!.components.map(row => row.sourceProjectId), ['film-a', 'film-b']);
assert.equal(createdPackage.package!.excluded.some(row => row.projectId === 'commissioned' && row.code === 'NO_PROFIT_RIGHTS'), true);
assert.deepEqual(createdPackage.package!.components.find(row => row.sourceProjectId === 'film-a')!.rightsLot.countryIds, ['US']);
assert.deepEqual(createdPackage.package!.components.find(row => row.sourceProjectId === 'film-a')!.rightsLot.excludedCountryIds, ['IN']);
assert.equal(createdPackage.package!.components.find(row => row.sourceProjectId === 'film-a')!.rightsLot.notice, 'India is already licensed. This auction covers the remaining eligible markets.');

const transferredPackages = normalizeStreamingCataloguePackageRegistry(
    JSON.parse(JSON.stringify(createdPackage.player.world.streamingCataloguePackages)),
);
assert.deepEqual(transferredPackages[createdPackage.package!.id], createdPackage.package, 'package facts must survive JSON save transfer');

const livePackagePlayer = structuredClone(createdPackage.player) as Player;
livePackagePlayer.world.streamingCataloguePackages![createdPackage.package!.id].lifecycle = 'LIVE';
const overlapping = createStreamingCataloguePackage(livePackagePlayer, {
    studioId: 'empire-studios',
    name: 'Conflicting Collection',
    projectIds: ['film-a', 'film-b'],
    source: 'PLAYER_CURATED',
    absoluteWeek: 400,
    startsAtAbsoluteWeek: 400,
    desiredCountryIds: ['US'],
    maximumDurationWeeks: 104,
    windowType: 'FIRST_WINDOW',
    exclusivity: 'EXCLUSIVE',
});
assert.equal(overlapping.package, null, 'a live overlapping package must reserve its exact component scope');
assert.equal(overlapping.reason, 'NOT_ENOUGH_ELIGIBLE_TITLES');

const allocationComponents = Array.from({ length: 8 }, (_, index) => ({
    ...createdPackage.package!.components[index % createdPackage.package!.components.length],
    sourceProjectId: `allocation-film-${index + 1}`,
    title: `Allocation Film ${index + 1}`,
    rightsLot: {
        ...createdPackage.package!.components[index % createdPackage.package!.components.length].rightsLot,
        id: `allocation-lot-${index + 1}`,
        sourceProjectId: `allocation-film-${index + 1}`,
    },
    referenceValue: [160, 120, 80, 60, 40, 30, 20, 10][index] * 1_000_000,
}));
const netflixAllocation = allocateStreamingCatalogueGuarantee({
    totalGuarantee: 500_000_000,
    components: allocationComponents,
    platformId: 'NETFLIX',
    bidderValues: Object.fromEntries(allocationComponents.map((component, index) => [component.sourceProjectId, [100, 90, 80, 70, 60, 50, 40, 30][index]])),
    durationWeeks: 104,
    exclusivity: 'EXCLUSIVE',
    localization: 'DUBS_AND_SUBTITLES',
    localizationRequirements: [],
});
assert.equal(netflixAllocation.valid, true);
assert.equal(netflixAllocation.rows.reduce((sum, row) => sum + row.minimumGuarantee, 0), 500_000_000);
assert.ok(netflixAllocation.rows.every(row => row.minimumGuarantee >= 1_000_000));
const referenceTotal = allocationComponents.reduce((sum, component) => sum + component.referenceValue, 0);
const allocationRemainder = 500_000_000 - allocationComponents.length * 1_000_000;
netflixAllocation.rows.forEach(row => {
    const component = allocationComponents.find(candidate => candidate.sourceProjectId === row.componentProjectId)!;
    const independentReference = 1_000_000 + allocationRemainder * component.referenceValue / referenceTotal;
    assert.ok(row.minimumGuarantee >= Math.max(1_000_000, independentReference * 0.5) - 1);
    assert.ok(row.minimumGuarantee <= independentReference * 1.75 + 1);
});
const replayedNetflixAllocation = allocateStreamingCatalogueGuarantee({
    totalGuarantee: 500_000_000,
    components: allocationComponents,
    platformId: 'NETFLIX',
    bidderValues: Object.fromEntries(allocationComponents.map((component, index) => [component.sourceProjectId, [100, 90, 80, 70, 60, 50, 40, 30][index]])),
    durationWeeks: 104,
    exclusivity: 'EXCLUSIVE',
    localization: 'DUBS_AND_SUBTITLES',
    localizationRequirements: [],
});
assert.deepEqual(replayedNetflixAllocation, netflixAllocation, 'saved package inputs must replay the same commercial schedule');
const primeAllocation = allocateStreamingCatalogueGuarantee({
    totalGuarantee: 500_000_000,
    components: allocationComponents,
    platformId: 'APPLE_TV',
    bidderValues: Object.fromEntries(allocationComponents.map((component, index) => [component.sourceProjectId, [30, 40, 50, 60, 70, 80, 90, 100][index]])),
    durationWeeks: 104,
    exclusivity: 'EXCLUSIVE',
    localization: 'SUBTITLES',
    localizationRequirements: [],
});
assert.notDeepEqual(
    primeAllocation.rows.map(row => row.minimumGuarantee),
    netflixAllocation.rows.map(row => row.minimumGuarantee),
    'different platform fit must produce a different bounded title schedule',
);
assert.deepEqual(validateStreamingCatalogueOfferRows({
    components: allocationComponents,
    rows: netflixAllocation.rows,
    totalGuarantee: 500_000_000,
}), { valid: true });
assert.equal(validateStreamingCatalogueOfferRows({
    components: allocationComponents,
    rows: [...netflixAllocation.rows.slice(0, 7), netflixAllocation.rows[0]],
    totalGuarantee: 500_000_000,
}).valid, false, 'duplicate and missing title rows must invalidate the offer');
assert.ok(
    calculateStreamingCatalogueReferenceValue({ ...allocationComponents[0], quality: 90, theatricalGross: 400_000_000 })
    > calculateStreamingCatalogueReferenceValue({ ...allocationComponents[0], quality: 40, theatricalGross: 10_000_000 }),
    'independent reference value must reward real title strength without bidder preferences',
);

const packageRoom = createStreamingCatalogueBiddingSession({
    cataloguePackage: createdPackage.package!,
    platforms: [{
        id: 'NETFLIX', name: 'Netflix', color: '#e50914', cashAvailable: 2_000_000_000,
        baseBid: 100_000_000, acquisitionCeiling: 900_000_000, qualityPreference: 75, relationshipMultiplier: 1,
    }, {
        id: 'APPLE_TV', name: 'Apple TV+', color: '#f5f5f7', cashAvailable: 1_500_000_000,
        baseBid: 80_000_000, acquisitionCeiling: 700_000_000, qualityPreference: 70, relationshipMultiplier: 1,
    }, {
        id: 'HULU', name: 'Hulu', color: '#1ce783', cashAvailable: 1_500_000,
        baseBid: 1_000_000, acquisitionCeiling: 1_500_000, qualityPreference: 60, relationshipMultiplier: 1,
    }],
    bidderValuesByPlatform: {
        NETFLIX: { 'film-a': 120, 'film-b': 60 },
        APPLE_TV: { 'film-a': 70, 'film-b': 110 },
    },
});
assert.equal(packageRoom.subjectKind, 'CATALOGUE_PACKAGE');
assert.equal(packageRoom.cataloguePackageId, createdPackage.package!.id);
assert.equal(packageRoom.platformStates.some(state => state.platformId === 'HULU'), false, 'a platform unable to fund every title floor must not enter');
assert.equal(packageRoom.offers.length, 1, 'the package room opens with one real clearing offer');
assert.equal(packageRoom.offers[0].componentTerms?.length, 2);
assert.equal(packageRoom.offers[0].productionFunding, 0);
assert.equal(packageRoom.offers[0].futureSeasonFunding, 0);
assert.equal(packageRoom.offers[0].componentTerms!.reduce((sum, row) => sum + row.minimumGuarantee, 0), packageRoom.offers[0].minimumGuarantee);
let closedPackageRoom = packageRoom;
while (closedPackageRoom.status === 'LIVE') closedPackageRoom = advanceStreamingBiddingSession(closedPackageRoom, 1);
assert.equal(closedPackageRoom.status, 'CLOSING');
assert.equal(closedPackageRoom.acceptedOfferId, null, 'closing a package room must never choose a winner');
getStreamingBiddingClosingOffers(closedPackageRoom).forEach(offer => {
    assert.equal(offer.componentTerms?.length, 2);
    assert.equal(offer.componentTerms!.reduce((sum, row) => sum + row.minimumGuarantee, 0), offer.minimumGuarantee);
});

const selectedPackageOffer = getStreamingBiddingClosingOffers(closedPackageRoom)
    .find(offer => offer.platformId === 'NETFLIX')!;
assert.ok(selectedPackageOffer, 'the financially strongest clearing bidder must remain available');
const acceptedPackageRoom = acceptStreamingBiddingOffer(closedPackageRoom, selectedPackageOffer.id);
const packageSigningPlayer = structuredClone(createdPackage.player) as Player;
packageSigningPlayer.world.platforms!.NETFLIX = normalizePlatformAiState(
    packageSigningPlayer.world.platforms!.NETFLIX,
    packageSigningPlayer.id,
    400,
);
packageSigningPlayer.world.streamingCataloguePackages![createdPackage.package!.id] = {
    ...packageSigningPlayer.world.streamingCataloguePackages![createdPackage.package!.id],
    lifecycle: 'LIVE',
    biddingSessionId: acceptedPackageRoom.id,
};
packageSigningPlayer.world.streamingBiddingSessions = { [acceptedPackageRoom.id]: acceptedPackageRoom };
const sellerBefore = packageSigningPlayer.businesses.find(business => business.id === 'empire-studios')!;
const sellerBalanceBefore = sellerBefore.balance;
const buyerCashBefore = packageSigningPlayer.world.platforms!.NETFLIX.cashReserve;
const filmAAllocation = selectedPackageOffer.componentTerms!.find(row => row.componentProjectId === 'film-a')!.minimumGuarantee;
const expectedInvestorPayout = Math.round(filmAAllocation * 0.2);
const signing = acceptStreamingCataloguePackageOffer(packageSigningPlayer, {
    packageId: createdPackage.package!.id,
    session: acceptedPackageRoom,
    offerId: selectedPackageOffer.id,
    absoluteWeek: 400,
});
assert.equal(signing.changed, true);
assert.equal(signing.contracts.length, 2);
assert.equal(signing.package?.lifecycle, 'SIGNED');
assert.equal(signing.package?.componentContractIds.length, 2);
assert.equal(signing.player.world.platforms!.NETFLIX.cashReserve, buyerCashBefore - selectedPackageOffer.minimumGuarantee / 1_000_000);
const signedSeller = signing.player.businesses.find(business => business.id === 'empire-studios')!;
assert.equal(signedSeller.balance, sellerBalanceBefore + selectedPackageOffer.minimumGuarantee - expectedInvestorPayout);
assert.equal(
    signing.player.pastProjects.find(project => project.id === 'film-a')!.investorPayouts!.lifetimeInvestorPayout,
    expectedInvestorPayout,
);
selectedPackageOffer.componentTerms!.forEach(row => {
    const contract = signing.contracts.find(candidate => candidate.sourceProjectId === row.componentProjectId)!;
    assert.equal(contract.minimumGuarantee, row.minimumGuarantee);
    assert.equal(contract.licensorRevenueShare, row.licensorRevenueShare);
    assert.equal(contract.guaranteeRecoupment, row.guaranteeRecoupment);
    assert.equal(contract.cataloguePackageId, createdPackage.package!.id);
    assert.equal(contract.biddingSessionId, acceptedPackageRoom.id);
    assert.equal(contract.sourceOfferId, selectedPackageOffer.id);
});
assert.deepEqual(
    signing.player.world.platforms!.NETFLIX.ai!.rightsContracts
        .filter(contract => contract.cataloguePackageId === createdPackage.package!.id)
        .map(contract => contract.id)
        .sort(),
    signing.contracts.map(contract => contract.id).sort(),
    'the AI buyer projection must carry the same title cost basis as the canonical package contracts',
);
const signingReplay = acceptStreamingCataloguePackageOffer(signing.player, {
    packageId: createdPackage.package!.id,
    session: acceptedPackageRoom,
    offerId: selectedPackageOffer.id,
    absoluteWeek: 400,
});
assert.equal(signingReplay.changed, false);
assert.deepEqual(signingReplay.player, signing.player, 'repeated acceptance must not repeat cash, contracts, investor payouts, or energy');

const missingSourcePlayer = structuredClone(packageSigningPlayer) as Player;
missingSourcePlayer.pastProjects = missingSourcePlayer.pastProjects.filter(project => project.id !== 'film-b');
const missingSourceSnapshot = structuredClone(missingSourcePlayer);
const missingSourceSigning = acceptStreamingCataloguePackageOffer(missingSourcePlayer, {
    packageId: createdPackage.package!.id,
    session: acceptedPackageRoom,
    offerId: selectedPackageOffer.id,
    absoluteWeek: 400,
});
assert.equal(missingSourceSigning.changed, false);
assert.equal(missingSourceSigning.reason, 'RIGHTS_CHANGED');
assert.deepEqual(missingSourceSigning.player, missingSourceSnapshot, 'a missing source project must roll back the whole package');

const conflictSigningPlayer = structuredClone(packageSigningPlayer) as Player;
const lateConflictLicense = createStreamingLicenseContract({
    id: 'late-us-conflict', sourceProject: { id: 'film-b', title: 'Silent Border', mediaType: 'MOVIE', genre: 'THRILLER' },
    buyerPlatformId: 'DISNEY_PLUS', platformContentPlanId: null, cataloguePackageId: null, licensorName: 'Empire Studios',
    territory: 'DOMESTIC', countryIds: ['US'], durationWeeks: 104, exclusivity: 'EXCLUSIVE', minimumGuarantee: 20_000_000,
    platformRevenueShare: 80, signedAtAbsoluteWeek: 399, startsAtAbsoluteWeek: 399, origin: 'STUDIO_MARKET', sellerType: 'STUDIO',
    sellerPlatformId: null, windowType: 'FIRST_WINDOW', permanentPurchase: false, renewalOption: true,
});
const lateConflictContract = createStreamingRightsContractFromLicense({
    license: lateConflictLicense,
    seller: { type: 'PLAYER_STUDIO', id: 'empire-studios', name: 'Empire Studios', platformId: null },
    buyer: { type: 'AI_PLATFORM', id: 'DISNEY_PLUS', name: 'Disney+', platformId: 'DISNEY_PLUS' },
    guaranteeDisposition: 'PAID', settledAtAbsoluteWeek: 399,
});
conflictSigningPlayer.world.streamingRightsContracts![lateConflictContract.id] = lateConflictContract;
const conflictSnapshot = structuredClone(conflictSigningPlayer);
const rejectedSigning = acceptStreamingCataloguePackageOffer(conflictSigningPlayer, {
    packageId: createdPackage.package!.id,
    session: acceptedPackageRoom,
    offerId: selectedPackageOffer.id,
    absoluteWeek: 400,
});
assert.equal(rejectedSigning.changed, false);
assert.equal(rejectedSigning.reason, 'RIGHTS_CHANGED');
assert.deepEqual(rejectedSigning.player, conflictSnapshot, 'late rights conflicts must roll back the whole package');

const workloadPlayer = structuredClone(packagePlayer) as Player;
workloadPlayer.pastProjects.push(...([
    { id: 'film-c', name: 'Ashes of Summer', studioId: 'empire-studios', projectType: 'MOVIE', genre: 'DRAMA', projectQuality: 78, rating: 7.8, budget: 35_000_000, gross: 95_000_000 },
    { id: 'film-d', name: 'Midnight Assembly', studioId: 'empire-studios', projectType: 'MOVIE', genre: 'DRAMA', projectQuality: 71, rating: 7.1, budget: 28_000_000, gross: 70_000_000 },
    { id: 'film-e', name: 'Paper Kingdom', studioId: 'empire-studios', projectType: 'MOVIE', genre: 'DRAMA', projectQuality: 68, rating: 6.8, budget: 22_000_000, gross: 55_000_000 },
    { id: 'film-f', name: 'Rain Check', studioId: 'empire-studios', projectType: 'MOVIE', genre: 'COMEDY', projectQuality: 65, rating: 6.5, budget: 18_000_000, gross: 40_000_000 },
    { id: 'film-g', name: 'Signal Lost', studioId: 'empire-studios', projectType: 'MOVIE', genre: 'THRILLER', projectQuality: 73, rating: 7.3, budget: 32_000_000, gross: 82_000_000 },
    { id: 'film-h', name: 'Second Monsoon', studioId: 'empire-studios', projectType: 'MOVIE', genre: 'DRAMA', projectQuality: 76, rating: 7.6, budget: 38_000_000, gross: 110_000_000 },
] as any[]));
const customManaged = updateStreamingCataloguePackagePolicy(workloadPlayer, {
    preferredSize: { min: 3, max: 3 },
    automation: 'SUGGEST_ONLY',
}, 404);
const proposalWeek = processStreamingCataloguePackagesWeek(customManaged, 404);
assert.equal(proposalWeek.processed, true);
assert.equal(proposalWeek.createdPackageIds.length, 1, 'Custom control should replace title spam with one bounded package proposal');
assert.equal(proposalWeek.digest?.proposed, 1);
assert.equal(proposalWeek.player.inbox.length, customManaged.inbox.length, 'routine package proposals must not create inbox spam');
const proposedPackage = proposalWeek.player.world.streamingCataloguePackages![proposalWeek.createdPackageIds[0]];
assert.equal(proposedPackage.source, 'RIGHTS_DESK_PROPOSAL');
assert.equal(proposedPackage.lifecycle, 'READY');
assert.equal(proposedPackage.components.length, 3);
assert.equal(proposedPackage.requestedExclusivity, 'NON_EXCLUSIVE');
assert.equal(proposedPackage.manualApprovalRequired, false);
const proposalReplay = processStreamingCataloguePackagesWeek(proposalWeek.player, 404);
assert.equal(proposalReplay.processed, false);
assert.deepEqual(proposalReplay.player, proposalWeek.player, 'same-week package processing must be an exact no-op');
const offCycle = processStreamingCataloguePackagesWeek(proposalWeek.player, 405);
assert.equal(offCycle.createdPackageIds.length, 0, 'Rights Desk can propose only once per four-week market cycle');
const packageDesk = getStreamingCataloguePackageDesk(proposalWeek.player, 'empire-studios', 404);
assert.equal(packageDesk.ready.length, 1);
assert.ok(packageDesk.eligibleTitleCount >= 3);

const fullControl = structuredClone(workloadPlayer) as Player;
fullControl.streamingRightsManagement = {
    ...normalizeStreamingRightsManagementState(fullControl.streamingRightsManagement),
    controlMode: 'FULL',
};
const fullWeek = processStreamingCataloguePackagesWeek(fullControl, 404);
assert.equal(fullWeek.createdPackageIds.length, 0, 'Full Control must never choose package components for the player');

const protectedPlayer = structuredClone(workloadPlayer) as Player;
protectedPlayer.streamingRightsManagement = {
    ...normalizeStreamingRightsManagementState(protectedPlayer.streamingRightsManagement),
    controlMode: 'STRATEGY',
    protectedProjectIds: ['film-a'],
    packagePolicy: { ...normalizeStreamingRightsManagementState(protectedPlayer.streamingRightsManagement).packagePolicy!, automation: 'ROUTINE_AUTOMATIC' },
};
const protectedWeek = processStreamingCataloguePackagesWeek(protectedPlayer, 404);
const protectedProposal = protectedWeek.createdPackageIds.map(id => protectedWeek.player.world.streamingCataloguePackages![id])[0];
assert.ok(!protectedProposal || protectedProposal.manualApprovalRequired, 'protected titles can be proposed but can never be auto-signed');
const protectedAutomation = processStreamingCataloguePackageStrategyAutomation(protectedWeek.player, 404);
assert.equal(protectedAutomation.signedPackageIds.length, 0, 'Strategy automation must never sign a protected package');

const strategyPlayer = structuredClone(workloadPlayer) as Player;
strategyPlayer.streamingRightsManagement = {
    ...normalizeStreamingRightsManagementState(strategyPlayer.streamingRightsManagement),
    controlMode: 'STRATEGY',
    packagePolicy: {
        ...normalizeStreamingRightsManagementState(strategyPlayer.streamingRightsManagement).packagePolicy!,
        automation: 'ROUTINE_AUTOMATIC',
        preferredSize: { min: 3, max: 3 },
        maximumAutomaticSize: 3,
        maximumAutomaticDurationWeeks: 104,
        allowAutomaticExclusive: false,
        allowAutomaticGlobal: false,
        minimumGuaranteeRatio: 0.5,
    },
};
const strategyProposalWeek = processStreamingCataloguePackagesWeek(strategyPlayer, 404);
const strategyAutomation = processStreamingCataloguePackageStrategyAutomation(strategyProposalWeek.player, 404);
assert.equal(strategyAutomation.signedPackageIds.length, 1, 'Strategy routine automation should close one safe package without title-by-title work');
const automaticallySigned = strategyAutomation.player.world.streamingCataloguePackages![strategyAutomation.signedPackageIds[0]];
assert.equal(automaticallySigned.lifecycle, 'SIGNED');
assert.equal(automaticallySigned.components.length, automaticallySigned.componentContractIds.length);
assert.equal(automaticallySigned.requestedExclusivity, 'NON_EXCLUSIVE');
assert.ok(automaticallySigned.requestedCountryIds.length < 10, 'non-global Strategy policy must remain a bounded market scope');
assert.equal(strategyAutomation.player.world.streamingCataloguePackageDigests?.[0]?.signed, 1);
const strategyAutomationReplay = processStreamingCataloguePackageStrategyAutomation(strategyAutomation.player, 404);
assert.equal(strategyAutomationReplay.signedPackageIds.length, 0);
assert.deepEqual(strategyAutomationReplay.player, strategyAutomation.player, 'delegated signing must be idempotent on replay');

const nearExpiry = processStreamingRightsCalendarWeek(signing.player, 496).player;
const calendarBeforeGrouping = structuredClone(nearExpiry.world.streamingRightsCalendar);
const renewalGroups = getStreamingCatalogueRenewalGroups(nearExpiry);
assert.equal(renewalGroups.length, 1, 'compatible child renewals from one signed package should appear as one review group');
assert.equal(renewalGroups[0].cases.length, 2);
const remainingGroup = getStreamingCatalogueRenewalGroups(nearExpiry, [renewalGroups[0].cases[0].id]);
assert.equal(remainingGroup[0].cases.length, 1, 'excluding a title changes only the review projection');
assert.deepEqual(nearExpiry.world.streamingRightsCalendar, calendarBeforeGrouping, 'renewal grouping must not mutate canonical A4 cases');

const deskMarkup = renderToStaticMarkup(React.createElement(StreamingCataloguePackageDesk, {
    player: proposalWeek.player,
    studioId: 'empire-studios',
    onUpdatePlayer: () => undefined,
}));
assert.match(deskMarkup, /Package Desk/);
assert.match(deskMarkup, /Portfolio proposals/);
assert.match(deskMarkup, /Empire Studios drama collection/i);
assert.match(deskMarkup, /3 titles/);
assert.doesNotMatch(deskMarkup, /output deal/i);

const packageRoomMarkup = renderToStaticMarkup(React.createElement(StreamingBiddingRoom, {
    session: closedPackageRoom,
    canAccept: true,
    energyCost: 10,
    onStart: () => undefined,
    onSessionChange: () => undefined,
    onAccept: () => undefined,
    onLeave: () => undefined,
    onBack: () => undefined,
}));
assert.match(packageRoomMarkup, /Title schedule/);
assert.match(packageRoomMarkup, /Monsoon City/);
assert.match(packageRoomMarkup, /Silent Border/);
assert.match(packageRoomMarkup, /2 titles/);
assert.doesNotMatch(packageRoomMarkup, /best offer/i);

const migrationSource = structuredClone(signing.player) as Player;
delete migrationSource.world.streamingCataloguePackages;
delete migrationSource.world.streamingCataloguePackageDigests;
delete migrationSource.world.streamingCataloguePackagesLastProcessedWeek;
const migratedPackages = migratePlayerSave(migrationSource);
const reconstructedPackage = migratedPackages.world.streamingCataloguePackages?.[createdPackage.package!.id];
assert.equal(reconstructedPackage?.lifecycle, 'SIGNED', 'shared historical package IDs should reconstruct a factual signed projection');
assert.equal(reconstructedPackage?.componentContractIds.length, 2);
assert.equal(migratedPackages.world.streamingCataloguePackageDigests?.length, 0);
const corruptPackages = migratePlayerSave({
    ...structuredClone(INITIAL_PLAYER),
    world: { ...structuredClone(INITIAL_PLAYER.world), streamingCataloguePackages: { broken: { id: 'broken', components: [] } } },
} as any);
assert.deepEqual(corruptPackages.world.streamingCataloguePackages, {}, 'malformed package saves must normalize to an empty safe registry');
const compactedPackages = compactPlayerForPersistence(signing.player);
assert.equal(compactedPackages.world.streamingCataloguePackages?.[createdPackage.package!.id]?.lifecycle, 'SIGNED');
assert.ok((compactedPackages.world.streamingCataloguePackageDigests || []).length <= 52);

console.log('Streaming catalogue packages Phase A5 audit passed.');
