import assert from 'node:assert/strict';
import { contentMarketFixture } from './helpers/contentMarketFixture';
import {
    advanceStreamingBuyerAuction,
    getStreamingBuyerAuctionLots,
    openStreamingBuyerAuction,
    placeStreamingBuyerAuctionBid,
    processStreamingBuyerAuctionsWeek,
    reconcileStreamingBuyerAuction,
    withdrawStreamingBuyerAuctionBid,
} from '../services/streamingBuyerAuctions';
import {
    getContentMarketAuctionCollections,
    getContentMarketFunds,
    getContentMarketListings,
    purchaseContentMarketCollection,
    purchaseContentMarketListing,
    submitContentMarketPrivateOffer,
} from '../services/streamingContentMarket';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { evaluateStreamingRightsCompliance } from '../services/streamingRightsMarketplace';

const base = contentMarketFixture();
const lots = getStreamingBuyerAuctionLots(base);
assert.ok(lots.length > 0, 'The market should expose at least one eligible live title auction');
const lot = lots[0];
assert.ok(lot.countryIds.length > 0, 'An auction freezes an exact eligible country scope');
assert.ok(lot.minimumGuarantee > 0 && lot.reserveSellerValue > 0, 'The seller publishes a real reserve and opening level');
assert.ok(lot.allowedTerms.backendMaximum > lot.allowedTerms.backendMinimum, 'The lot publishes seller-approved term ranges');

const opened = openStreamingBuyerAuction(base, lot.id, 1_000_000);
assert.ok(opened.changed && opened.session, 'Entering an eligible auction creates a saved room');
const openedSession = opened.session!;
assert.equal(openedSession.status, 'LIVE');
assert.equal(openedSession.roomSecondsRemaining, 15, 'The shared room begins at 15 seconds');
assert.equal(openedSession.hardClosesAtSecond, 45, 'The room has a 45-second hard cap');
assert.deepEqual(openedSession.lot.countryIds, lot.countryIds, 'Opening cannot mutate the lot scope');
assert.ok(openedSession.rivals.length >= 2, 'At least two funded AI rivals enter a live room');
assert.ok(openedSession.rivals.every(rival => rival.sellerValueCeiling > 0), 'Rival valuation ceilings are fixed when the room opens');

const reloadedPlatform = normalizeOwnedStreamingPlatformState(opened.player.ownedStreamingPlatform, opened.player.id);
const reloadedSession = reloadedPlatform.buyerAuctionSessions.find(session => session.id === openedSession.id)!;
assert.deepEqual(reloadedSession.rivals, openedSession.rivals, 'Save normalization cannot reroll rival ceilings or priorities');

const directBlocked = purchaseContentMarketListing(opened.player, lot.listingId, lot.listingSignature);
assert.equal(directBlocked.changed, false, 'An auction-designated listing cannot be purchased directly');
assert.match(directBlocked.detail, /live auction/i);
const privateBlocked = submitContentMarketPrivateOffer(opened.player, lot.listingId, {
    ...getContentMarketListings(opened.player).find(listing => listing.id === lot.listingId)!.terms,
});
assert.equal(privateBlocked.changed, false, 'An auction-designated listing cannot simultaneously enter private negotiation');
assert.match(privateBlocked.detail || '', /live auction/i);

const bidTerms = {
    minimumGuarantee: lot.minimumGuarantee,
    licensorRevenueShare: Math.min(lot.allowedTerms.backendMaximum, lot.allowedTerms.backendMinimum + 3),
    marketingGuarantee: lot.allowedTerms.marketingMaximum,
    futureGreenlight: lot.allowedTerms.futureGreenlightAllowed,
};
const placed = placeStreamingBuyerAuctionBid(opened.player, openedSession.id, bidTerms, 1_001_000);
assert.ok(placed.changed && placed.session?.playerBidId, 'A valid mixed-term player bid becomes binding');
const firstBid = placed.session!.bids.find(bid => bid.id === placed.session!.playerBidId)!;
assert.equal(firstBid.licensorRevenueShare, bidTerms.licensorRevenueShare);
assert.equal(firstBid.futureGreenlight, bidTerms.futureGreenlight);
assert.ok(firstBid.sellerValue > firstBid.minimumGuarantee, 'Backend and supported promises contribute to seller value');
const commitment = placed.player.ownedStreamingPlatform.costCommitments.find(item => item.sourceReferenceId === placed.session!.id)!;
assert.equal(commitment.status, 'COMMITTED');
assert.equal(commitment.committedAmount, firstBid.guaranteedExposure, 'Only the current guaranteed exposure is reserved');
assert.equal(getContentMarketFunds(placed.player), placed.player.ownedStreamingPlatform.treasuryCash - firstBid.guaranteedExposure);

const cashConstrained = structuredClone(placed.player);
cashConstrained.ownedStreamingPlatform.treasuryCash = firstBid.guaranteedExposure;
const tooGenerous = placeStreamingBuyerAuctionBid(cashConstrained, openedSession.id, {
    ...bidTerms,
    minimumGuarantee: bidTerms.minimumGuarantee + lot.minimumBidIncrement,
}, 1_002_000);
assert.equal(tooGenerous.changed, false, 'A player cannot reuse or exceed uncommitted treasury');
assert.equal(tooGenerous.reason, 'INSUFFICIENT_TREASURY');

const revised = placeStreamingBuyerAuctionBid(placed.player, openedSession.id, {
    ...bidTerms,
    minimumGuarantee: bidTerms.minimumGuarantee + lot.minimumBidIncrement,
}, 1_002_000);
assert.ok(revised.changed);
const revisedSession = revised.session!;
const playerBids = revisedSession.bids.filter(bid => bid.bidderId === revisedSession.playerBidderId);
assert.equal(playerBids.length, 2);
assert.equal(playerBids.filter(bid => bid.status === 'ACTIVE').length, 1, 'A revision supersedes the previous player bid');
assert.equal(revised.player.ownedStreamingPlatform.costCommitments.filter(item => item.sourceReferenceId === revisedSession.id && item.status === 'COMMITTED').length, 1,
    'A revision replaces rather than stacks its treasury reservation');

const invalidTerms = placeStreamingBuyerAuctionBid(revised.player, openedSession.id, {
    ...bidTerms,
    licensorRevenueShare: lot.allowedTerms.backendMaximum + 1,
}, 1_003_000);
assert.equal(invalidTerms.changed, false);
assert.equal(invalidTerms.reason, 'INVALID_TERMS');

const advancedA = advanceStreamingBuyerAuction(revised.player, openedSession.id, 6, 1_008_000);
const advancedB = advanceStreamingBuyerAuction(revised.player, openedSession.id, 6, 1_008_000);
assert.deepEqual(advancedA.session, advancedB.session, 'Rival actions are deterministic for the same saved room state');
assert.ok((advancedA.session?.materialEventCount || 0) >= revisedSession.materialEventCount, 'Material rival actions may extend the common clock');

const restoredLater = reconcileStreamingBuyerAuction(revised.player, openedSession.id, 1_020_000);
assert.ok((restoredLater.session?.activeSecondsElapsed || 0) >= revisedSession.activeSecondsElapsed + 18,
    'Restoring a room reconciles elapsed wall-clock time instead of resetting it');

const withdrawn = withdrawStreamingBuyerAuctionBid(revised.player, openedSession.id);
assert.ok(withdrawn.changed);
assert.equal(withdrawn.session?.status, 'LIVE', 'Withdrawing a bid does not stop the other bidders');
assert.equal(withdrawn.session?.playerBidId, null);
assert.equal(withdrawn.player.ownedStreamingPlatform.costCommitments.find(item => item.sourceReferenceId === openedSession.id)?.status, 'CANCELLED',
    'Walking away releases the auction reservation');

const runToClose = (minimumGuarantee: number) => {
    const fixture = contentMarketFixture();
    const activeLot = getStreamingBuyerAuctionLots(fixture)[0];
    const room = openStreamingBuyerAuction(fixture, activeLot.id, 2_000_000);
    assert.ok(room.changed && room.session);
    const bid = placeStreamingBuyerAuctionBid(room.player, room.session!.id, {
        minimumGuarantee,
        licensorRevenueShare: activeLot.allowedTerms.backendMaximum,
        marketingGuarantee: activeLot.allowedTerms.marketingMaximum,
        futureGreenlight: activeLot.allowedTerms.futureGreenlightAllowed,
    }, 2_001_000);
    assert.ok(bid.changed);
    return advanceStreamingBuyerAuction(bid.player, room.session!.id, 45, 2_046_000);
};

const winning = runToClose(Math.round(lot.referenceValue * 1.8));
assert.equal(winning.session?.status, 'WON', 'A sufficiently strong player contract can win');
assert.ok(winning.player.ownedStreamingPlatform.catalogProjectIds.includes(lot.sourceProjectId), 'Winning adds the canonical title to the catalogue');
assert.ok(winning.player.ownedStreamingPlatform.catalogLicenses.some(license => license.sourceProjectId === lot.sourceProjectId), 'Winning grants one canonical licence');
assert.equal(winning.player.ownedStreamingPlatform.costCommitments.find(item => item.sourceReferenceId === winning.session!.id)?.status, 'PAID');
const cashAfterWin = winning.player.ownedStreamingPlatform.treasuryCash;
const replayClose = advanceStreamingBuyerAuction(winning.player, winning.session!.id, 45, 2_100_000);
assert.equal(replayClose.player.ownedStreamingPlatform.treasuryCash, cashAfterWin, 'Replaying a closed room cannot charge the winner twice');
assert.equal(replayClose.player.ownedStreamingPlatform.catalogLicenses.filter(license => license.sourceProjectId === lot.sourceProjectId).length, 1);
assert.equal(replayClose.player.inbox.filter(message => message.data?.streamingBuyerAuctionId === winning.session!.id).length, 1,
    'A result creates one actionable Message');
const futureGreenlightObligation = winning.player.ownedStreamingPlatform.rightsObligations.find(obligation => (
    obligation.type === 'FUTURE_GREENLIGHT' && obligation.sourceProjectId === lot.sourceProjectId
));
assert.ok(futureGreenlightObligation, 'A winning future-greenlight promise becomes a canonical obligation');
const compliancePlatform = {
    ...winning.player.ownedStreamingPlatform,
    originalCommissions: [...winning.player.ownedStreamingPlatform.originalCommissions, {
        id: 'cm3-promised-original', scriptId: 'cm3-script', canonicalProjectId: null,
        title: 'Seller Follow-up Original', gapId: 'BROAD_AUDIENCE' as const, projectType: 'MOVIE' as const,
        genre: 'DRAMA' as const, episodes: 1,
        producerStudioId: futureGreenlightObligation!.counterpartyId!, producerStudioName: lot.sellerName,
        commissionedByPlatformName: 'Test Stream', productionBudgetCap: 20_000_000,
        productionFundingApplied: 0, status: 'GREENLIT' as const,
        commissionedAtAbsoluteWeek: futureGreenlightObligation!.createdAtAbsoluteWeek! + 1,
        greenlitAtAbsoluteWeek: futureGreenlightObligation!.createdAtAbsoluteWeek! + 1,
    }],
};
const compliance = evaluateStreamingRightsCompliance(compliancePlatform, futureGreenlightObligation!.createdAtAbsoluteWeek! + 2);
assert.equal(compliance.platform.rightsObligations.find(item => item.id === futureGreenlightObligation!.id)?.status, 'SATISFIED',
    'Commissioning an original with the promised producer satisfies the future-greenlight obligation');

const losing = runToClose(lot.minimumGuarantee);
assert.ok(['LOST', 'NO_SALE'].includes(losing.session?.status || ''), 'A weak player contract can lose or leave the lot unsold');
assert.equal(losing.player.ownedStreamingPlatform.costCommitments.find(item => item.sourceReferenceId === losing.session!.id)?.status, 'CANCELLED');
assert.equal(losing.player.ownedStreamingPlatform.catalogLicenses.some(license => license.sourceProjectId === lot.sourceProjectId), false,
    'A losing player is never granted the rights');

const abandonedBase = contentMarketFixture();
const abandonedLot = getStreamingBuyerAuctionLots(abandonedBase)[0];
const abandoned = openStreamingBuyerAuction(abandonedBase, abandonedLot.id, 4_000_000);
assert.ok(abandoned.session);
const afterWeekBoundary = processStreamingBuyerAuctionsWeek(abandoned.player);
const closedAbandoned = afterWeekBoundary.ownedStreamingPlatform.buyerAuctionSessions.find(item => item.id === abandoned.session!.id)!;
assert.notEqual(closedAbandoned.status, 'LIVE', 'Processing a game week cannot leave an abandoned real-time room stuck open');

const packageFixture = contentMarketFixture();
packageFixture.world.projects.push(...Array.from({ length: 5 }, (_, index) => ({
    id: `cm3-library-${index}`,
    title: `Neon District ${index + 1}`,
    studioId: 'seller-cm3-package',
    mediaType: 'MOVIE' as const,
    genre: 'THRILLER' as const,
    rating: 7.6,
    year: 24,
    boxOffice: 62_000_000,
} as any)));
const auctionCollections = getContentMarketAuctionCollections(packageFixture);
assert.ok(auctionCollections.length > 0, 'Eligible catalogue packages can be assigned to the auction floor');
const auctionCollection = auctionCollections[0];
const directPackageBlocked = purchaseContentMarketCollection(packageFixture, auctionCollection.id, auctionCollection.signature);
assert.equal(directPackageBlocked.changed, false, 'An auction collection cannot also be purchased directly');
assert.match(directPackageBlocked.detail, /live auction/i);
const packageLot = getStreamingBuyerAuctionLots(packageFixture).find(item => item.cataloguePackageId === auctionCollection.id)!;
assert.ok(packageLot && packageLot.catalogueComponentIds?.length === auctionCollection.rows.length,
    'A package lot freezes every component contract before entry');
const packageRoom = openStreamingBuyerAuction(packageFixture, packageLot.id, 5_000_000);
assert.ok(packageRoom.session);
const packageBid = placeStreamingBuyerAuctionBid(packageRoom.player, packageRoom.session!.id, {
    minimumGuarantee: Math.round(packageLot.referenceValue * 1.8),
    licensorRevenueShare: packageLot.allowedTerms.backendMaximum,
    marketingGuarantee: 0,
    futureGreenlight: false,
}, 5_001_000);
assert.ok(packageBid.changed);
const packageClose = advanceStreamingBuyerAuction(packageBid.player, packageRoom.session!.id, 45, 5_046_000);
assert.equal(packageClose.session?.status, 'WON', 'A strong catalogue contract can win atomically');
const packageContracts = packageClose.player.ownedStreamingPlatform.catalogLicenses.filter(license => (
    license.cataloguePackageId === auctionCollection.id
));
assert.equal(packageContracts.length, auctionCollection.rows.length, 'Every package title receives one canonical allocated contract');
assert.equal(packageContracts.reduce((sum, contract) => sum + contract.minimumGuarantee, 0), packageClose.session!.bids.find(bid => bid.id === packageClose.session!.winnerBidId)!.minimumGuarantee,
    'The winning package guarantee is allocated exactly across its title contracts');

console.log('CM3 live buyer auction domain passed.');
