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
import { normalizeStreamingPlatformEcosystem } from '../services/streamingPlatformEcosystem';
import { evaluateStreamingRightsCompliance } from '../services/streamingRightsMarketplace';
import { resolveStreamingOfferRevision } from '../services/streamingOfferRevisionIntelligence';

const underMarketRevision = resolveStreamingOfferRevision({
    currentValue: 50_000_000,
    currentAmount: 50_000_000,
    competitorValue: 310_000_000,
    capacityCeiling: 400_000_000,
    minimumAmount: 100_000,
    randomFactor: 0.5,
});
assert.equal(underMarketRevision.variant, 'UP', 'A bidder far below a stronger field intelligently raises its offer');
assert.ok(underMarketRevision.targetAmount > 50_000_000 && underMarketRevision.targetAmount <= 400_000_000,
    'An upward revision remains inside the bidder’s fixed room ceiling');

const overMarketRevision = resolveStreamingOfferRevision({
    currentValue: 500_000_000,
    currentAmount: 500_000_000,
    competitorValue: 200_000_000,
    capacityCeiling: 700_000_000,
    minimumAmount: 100_000,
    randomFactor: 0.5,
});
assert.equal(overMarketRevision.variant, 'DOWN', 'A bidder materially above the field corrects an inflated offer downward');
assert.ok(overMarketRevision.targetAmount < 500_000_000,
    'A downward revision reduces exposure instead of blindly escalating');

const closeMarketRevision = resolveStreamingOfferRevision({
    currentValue: 210_000_000,
    currentAmount: 180_000_000,
    competitorValue: 200_000_000,
    capacityCeiling: 350_000_000,
    minimumAmount: 100_000,
    randomFactor: 0.75,
});
assert.equal(closeMarketRevision.variant, 'RESTRUCTURE', 'A close field produces a term restructure rather than a forced cash race');

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
const legacyBuyerIds = new Set(['NETFLIX', 'APPLE_TV', 'DISNEY_PLUS', 'HULU', 'YOUTUBE']);
const ecosystem = normalizeStreamingPlatformEcosystem(opened.player.world.streamingPlatformEcosystem, 1);
assert.ok(Object.keys(ecosystem.operators).length >= 33, 'The world exposes the full streaming operator ecosystem');
assert.ok(openedSession.rivals.every(rival => ecosystem.operators[rival.platformId]), 'Every auction rival comes from the canonical ecosystem');
assert.ok(openedSession.rivals.some(rival => !legacyBuyerIds.has(rival.platformId)),
    'Relevant regional and global operators outside the old five-platform list can enter');
assert.ok(openedSession.bids[0].minimumGuarantee < lot.referenceValue * 0.5,
    'An AI buyer can open with a strategic low offer instead of a forced valuation-level bid');

const runFieldRevision = (currentSellerValue: number, competitorSellerValue: number) => {
    const targetRival = openedSession.rivals[0];
    const competitorRival = openedSession.rivals[1];
    const targetBid = {
        ...openedSession.bids[0],
        id: `${openedSession.id}:field-target:${currentSellerValue}`,
        bidderId: targetRival.bidderId,
        bidderName: targetRival.platformName,
        platformId: targetRival.platformId,
        revision: 1,
        status: 'ACTIVE' as const,
        replacesBidId: null,
        minimumGuarantee: currentSellerValue,
        marketingGuarantee: 0,
        guaranteedExposure: currentSellerValue,
        sellerValue: currentSellerValue,
    };
    const competitorBid = {
        ...targetBid,
        id: `${openedSession.id}:field-competitor:${competitorSellerValue}`,
        bidderId: competitorRival.bidderId,
        bidderName: competitorRival.platformName,
        platformId: competitorRival.platformId,
        minimumGuarantee: competitorSellerValue,
        guaranteedExposure: competitorSellerValue,
        sellerValue: competitorSellerValue,
    };
    const scenarioSession = {
        ...openedSession,
        id: `${openedSession.id}:field-revision:${currentSellerValue}:${competitorSellerValue}`,
        activeSecondsElapsed: 5,
        roomSecondsRemaining: 15,
        lastRealtimeAtMs: 1_000_000,
        materialEventCount: 0,
        bids: [targetBid, competitorBid],
        leaderBidId: currentSellerValue >= competitorSellerValue ? targetBid.id : competitorBid.id,
        rivals: openedSession.rivals.map(rival => rival.bidderId === targetRival.bidderId ? {
            ...rival,
            status: 'ACTIVE' as const,
            revision: 1,
            currentBidId: targetBid.id,
            sellerValueCeiling: lot.referenceValue * 3,
            cashAvailable: lot.referenceValue * 4,
            nextActionSecond: 6,
        } : rival.bidderId === competitorRival.bidderId ? {
            ...rival,
            status: 'FINAL' as const,
            revision: 3,
            currentBidId: competitorBid.id,
            nextActionSecond: 45,
        } : { ...rival, status: 'WITHDRAWN' as const }),
    };
    const scenarioPlayer = {
        ...opened.player,
        ownedStreamingPlatform: {
            ...opened.player.ownedStreamingPlatform,
            buyerAuctionSessions: [scenarioSession],
        },
    };
    const result = advanceStreamingBuyerAuction(scenarioPlayer, scenarioSession.id, 1, 1_001_000);
    assert.ok(result.changed && result.session, 'A due rival performs its saved field-aware revision');
    return result.session!.bids.find(bid => bid.bidderId === targetRival.bidderId && bid.status === 'ACTIVE')!;
};

const correctedOverbid = runFieldRevision(lot.referenceValue * 1.8, lot.referenceValue * 0.7);
assert.ok(correctedOverbid.sellerValue < lot.referenceValue * 1.8,
    'An AI buyer that discovers it overbid the field can replace its own offer downward');
const correctedUnderbid = runFieldRevision(lot.referenceValue * 0.2, lot.referenceValue * 1.2);
assert.ok(correctedUnderbid.sellerValue > lot.referenceValue * 0.2,
    'An AI buyer that trails a stronger field can replace its own offer upward');

const generatedBuyerFixture = contentMarketFixture();
const generatedBuyerEcosystem = normalizeStreamingPlatformEcosystem(generatedBuyerFixture.world.streamingPlatformEcosystem, 1);
const generatedTemplate = generatedBuyerEcosystem.operators.PRIME_VIDEO;
generatedBuyerEcosystem.operators = Object.fromEntries(Object.entries(generatedBuyerEcosystem.operators).map(([id, operator]) => [
    id,
    { ...operator, lifecycle: id === 'PRIME_VIDEO' ? 'ACTIVE' : 'CLOSED' },
]));
generatedBuyerEcosystem.operators.EMBER_STREAM = {
    ...generatedTemplate,
    id: 'EMBER_STREAM',
    name: 'Ember Stream',
    kind: 'DYNAMIC_FICTIONAL',
    lifecycle: 'ACTIVE',
    cashMillions: 15_000,
    activeCountryIds: [...new Set(getStreamingBuyerAuctionLots(generatedBuyerFixture)[0].countryIds)],
    brand: { source: 'GENERATED', identity: undefined } as any,
};
generatedBuyerFixture.world.streamingPlatformEcosystem = generatedBuyerEcosystem;
const generatedBuyerLot = getStreamingBuyerAuctionLots(generatedBuyerFixture)[0];
const generatedBuyerRoom = openStreamingBuyerAuction(generatedBuyerFixture, generatedBuyerLot.id, 1_000_100);
assert.ok(generatedBuyerRoom.changed && generatedBuyerRoom.session?.rivals.some(rival => rival.platformId === 'EMBER_STREAM'),
    'A future generated streaming platform can qualify for the same auction system');
const generatedBuyerReload = normalizeOwnedStreamingPlatformState(generatedBuyerRoom.player.ownedStreamingPlatform, generatedBuyerRoom.player.id);
assert.ok(generatedBuyerReload.buyerAuctionSessions[0].rivals.some(rival => rival.platformId === 'EMBER_STREAM'),
    'Generated bidder identity survives save normalization');
const generatedSession = generatedBuyerRoom.session!;
const generatedOpeningBid = generatedSession.bids.find(bid => bid.platformId === 'EMBER_STREAM') || null;
const forcedGeneratedSession = {
    ...generatedSession,
    lot: { ...generatedSession.lot, reserveSellerValue: generatedSession.lot.minimumGuarantee },
    rivals: generatedSession.rivals.map(rival => rival.platformId === 'EMBER_STREAM' ? {
        ...rival,
        status: generatedOpeningBid ? 'ACTIVE' as const : 'WATCHING' as const,
        sellerValueCeiling: generatedSession.lot.referenceValue * 1.2,
        currentBidId: generatedOpeningBid?.id || null,
        revision: generatedOpeningBid?.revision || 0,
        nextActionSecond: 1,
    } : { ...rival, status: 'WITHDRAWN' as const }),
    bids: generatedOpeningBid ? [generatedOpeningBid] : [],
    leaderBidId: generatedOpeningBid?.id || null,
};
const generatedSettlementPlayer = {
    ...generatedBuyerRoom.player,
    ownedStreamingPlatform: {
        ...generatedBuyerRoom.player.ownedStreamingPlatform,
        buyerAuctionSessions: [forcedGeneratedSession],
    },
};
const generatedCashBefore = generatedSettlementPlayer.world.streamingPlatformEcosystem!.operators.EMBER_STREAM.cashMillions;
const generatedSettlement = advanceStreamingBuyerAuction(generatedSettlementPlayer, forcedGeneratedSession.id, 45, 1_000_200);
const generatedContract = Object.values(generatedSettlement.player.world.streamingRightsContracts || {}).find(contract => (
    contract.buyerPlatformId === 'EMBER_STREAM'
));
assert.ok(generatedContract && generatedContract.buyer.name === 'Ember Stream',
    'A generated winner is registered as the canonical rights buyer under its real brand name');
assert.ok(generatedSettlement.player.world.streamingPlatformEcosystem!.operators.EMBER_STREAM.cashMillions < generatedCashBefore,
    'A generated winner pays its guarantee from the shared ecosystem balance');

const uncappedRoomFixture = contentMarketFixture();
const uncappedLotCountryIds = getStreamingBuyerAuctionLots(uncappedRoomFixture)[0].countryIds;
const uncappedEcosystem = normalizeStreamingPlatformEcosystem(uncappedRoomFixture.world.streamingPlatformEcosystem, 1);
const uncappedTemplate = uncappedEcosystem.operators.PRIME_VIDEO;
uncappedEcosystem.operators = Object.fromEntries(Object.entries(uncappedEcosystem.operators).map(([id, operator]) => [
    id,
    { ...operator, lifecycle: id === 'PRIME_VIDEO' ? 'ACTIVE' : 'CLOSED' },
]));
const expectedUncappedPlatformIds = ['PRIME_VIDEO'];
for (let index = 1; index <= 12; index += 1) {
    const platformId = `OPEN_FIELD_${String(index).padStart(2, '0')}`;
    expectedUncappedPlatformIds.push(platformId);
    uncappedEcosystem.operators[platformId] = {
        ...uncappedTemplate,
        id: platformId,
        name: `Open Field ${index}`,
        kind: 'DYNAMIC_FICTIONAL',
        lifecycle: 'ACTIVE',
        cashMillions: 15_000,
        activeCountryIds: [...uncappedLotCountryIds],
        brand: { source: 'GENERATED', identity: undefined } as any,
    };
}
uncappedRoomFixture.world.streamingPlatformEcosystem = uncappedEcosystem;
const uncappedLot = getStreamingBuyerAuctionLots(uncappedRoomFixture)[0];
const uncappedRoom = openStreamingBuyerAuction(uncappedRoomFixture, uncappedLot.id, 1_000_300);
assert.ok(uncappedRoom.changed && uncappedRoom.session, 'A funded open field can enter the live auction');
assert.equal(uncappedRoom.session!.rivals.length, expectedUncappedPlatformIds.length,
    'A live room does not discard eligible bidders through a fixed participant cap');
assert.deepEqual(
    new Set(uncappedRoom.session!.rivals.map(rival => rival.platformId)),
    new Set(expectedUncappedPlatformIds),
    'Every naturally eligible platform receives a saved room participant record',
);
const uncappedReload = normalizeOwnedStreamingPlatformState(uncappedRoom.player.ownedStreamingPlatform, uncappedRoom.player.id);
assert.equal(uncappedReload.buyerAuctionSessions[0].rivals.length, expectedUncappedPlatformIds.length,
    'Save normalization preserves the complete bidder field');

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

assert.ok(lot.minimumGuarantee <= Math.max(100_000, lot.referenceValue * 0.03),
    'A lot uses only a tiny technical floor, not a forced half-valuation opening bid');
const leadingBeforeLowOffer = openedSession.bids.find(bid => bid.id === openedSession.leaderBidId)!;
const lowOffer = placeStreamingBuyerAuctionBid(opened.player, openedSession.id, {
    minimumGuarantee: lot.minimumGuarantee,
    licensorRevenueShare: lot.allowedTerms.backendMinimum,
    marketingGuarantee: 0,
    futureGreenlight: false,
}, 1_000_500);
assert.ok(lowOffer.changed && lowOffer.session?.playerBidId,
    'A valid low offer is recorded even when it does not beat the current leader');
const recordedLowOffer = lowOffer.session!.bids.find(bid => bid.id === lowOffer.session!.playerBidId)!;
assert.ok(recordedLowOffer.sellerValue < leadingBeforeLowOffer.sellerValue,
    'A player offer may remain visibly non-leading instead of being rejected');

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
