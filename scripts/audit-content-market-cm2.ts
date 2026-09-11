import assert from 'node:assert/strict';
import { contentMarketFixture } from './helpers/contentMarketFixture';
import { getContentMarketListings } from '../services/streamingContentMarket';
import { openStreamingPrivateOffer, reviseStreamingRightsNegotiation, signStreamingRightsDeal, submitStreamingRightsOffer } from '../services/streamingRightsMarketplace';
import { processOwnedStreamingPlatformWeek } from '../services/streamingWeeklyLoop';
import * as rightsMarket from '../services/streamingRightsMarketplace';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import StreamingContentMarket from '../components/StreamingContentMarket';
import { purchaseContentMarketListing } from '../services/streamingContentMarket';

const player = contentMarketFixture();
const listing = getContentMarketListings(player)[0];
const opened = openStreamingPrivateOffer(player, listing.id, {
    ...listing.terms,
    minimumGuarantee: Math.round(listing.terms.minimumGuarantee * 0.82),
});

assert.ok(opened.changed && opened.negotiation, 'A valid private proposal should be saved');
const negotiation = opened.negotiation as any;
assert.equal(negotiation.proposalVersion, 1, 'The first saved proposal must be version 1');
assert.equal(negotiation.submittedAtAbsoluteWeek, 1259, 'Submission week must be persisted');
assert.ok(
    negotiation.responseDueAbsoluteWeek === 1261 || negotiation.responseDueAbsoluteWeek === 1262,
    'A seller response must be scheduled for two or three processed weeks later',
);
assert.equal(negotiation.responseStatus, 'AWAITING_RESPONSE');
assert.equal(negotiation.signingDeadlineAbsoluteWeek, null);
assert.equal(opened.player.ownedStreamingPlatform.treasuryCash, player.ownedStreamingPlatform.treasuryCash,
    'Opening an offer must not charge treasury');
assert.equal(opened.player.ownedStreamingPlatform.catalogLicenses.length, 0,
    'Opening an offer must not grant rights');

const submitted = submitStreamingRightsOffer(opened.player, negotiation.id);
assert.ok(submitted.changed, 'Submitting the saved proposal should succeed');
assert.equal(submitted.negotiation?.status, 'OPEN', 'Seller must not answer in the submission click');
assert.equal((submitted.negotiation as any)?.responseStatus, 'AWAITING_RESPONSE');
assert.equal(submitted.player.ownedStreamingPlatform.treasuryCash, player.ownedStreamingPlatform.treasuryCash);

const dueWeek = negotiation.responseDueAbsoluteWeek as number;
const beforeDue = structuredClone(submitted.player);
beforeDue.age = Math.floor((dueWeek - 1) / 52) + 1;
beforeDue.currentWeek = ((dueWeek - 1) % 52) + 1;
const early = processOwnedStreamingPlatformWeek(beforeDue);
assert.equal((early.player.ownedStreamingPlatform.rightsNegotiations[0] as any).responseStatus, 'AWAITING_RESPONSE',
    'Seller cannot answer before the persisted due week');

const atDue = structuredClone(submitted.player);
atDue.age = Math.floor(dueWeek / 52) + 1;
atDue.currentWeek = (dueWeek % 52) + 1;
const resolved = processOwnedStreamingPlatformWeek(atDue);
const response = resolved.player.ownedStreamingPlatform.rightsNegotiations[0] as any;
assert.ok(['SELLER_ACCEPTED', 'SELLER_COUNTERED', 'SELLER_DECLINED', 'RIGHTS_SOLD'].includes(response.responseStatus),
    'A persisted seller outcome must resolve on the due week');
assert.equal(response.processedProposalVersion, 1);
assert.equal(response.respondedAtAbsoluteWeek, dueWeek);
assert.equal(resolved.player.inbox.filter(message => message.data?.streamingPrivateOfferId === response.id).length, 1,
    'The response must publish one actionable Message notification');
const replayed = processOwnedStreamingPlatformWeek(resolved.player);
assert.equal(replayed.player.inbox.filter(message => message.data?.streamingPrivateOfferId === response.id).length, 1,
    'Reprocessing the same week must not duplicate the response message');
assert.equal((replayed.player.ownedStreamingPlatform.rightsNegotiations[0] as any).responseStatus, response.responseStatus,
    'Reprocessing cannot reroll the saved seller decision');

const revisionBase = structuredClone(submitted.player);
revisionBase.currentWeek += 1;
const revised = reviseStreamingRightsNegotiation(revisionBase, negotiation.id, {
    ...listing.terms,
    minimumGuarantee: Math.round(listing.terms.minimumGuarantee * 0.9),
});
assert.ok(revised.changed && revised.negotiation);
assert.equal((revised.negotiation as any).proposalVersion, 2, 'Revision must supersede version 1');
assert.equal((revised.negotiation as any).responseStatus, 'AWAITING_RESPONSE');
assert.equal((revised.negotiation as any).processedProposalVersion, null);
assert.ok((revised.negotiation as any).responseDueAbsoluteWeek >= (revised.negotiation as any).submittedAtAbsoluteWeek + 2);
const reloaded = structuredClone(revised.player);
const normalizedReload = processOwnedStreamingPlatformWeek(reloaded);
assert.equal((normalizedReload.player.ownedStreamingPlatform.rightsNegotiations[0] as any).proposalVersion, 2,
    'Private offer proposal metadata survives save normalization');

const expiredAccepted = structuredClone(submitted.player);
expiredAccepted.age = Math.floor((dueWeek + 5) / 52) + 1;
expiredAccepted.currentWeek = ((dueWeek + 5) % 52) + 1;
expiredAccepted.ownedStreamingPlatform.rightsNegotiations[0] = {
    ...expiredAccepted.ownedStreamingPlatform.rightsNegotiations[0],
    status: 'READY_TO_SIGN',
    responseStatus: 'SELLER_ACCEPTED',
    signingDeadlineAbsoluteWeek: dueWeek + 3,
} as any;
const expiredSign = signStreamingRightsDeal(expiredAccepted, negotiation.id);
assert.equal(expiredSign.changed, false, 'An accepted private offer cannot sign after its deadline');
assert.equal(expiredSign.reason, 'NOT_READY');

const unfunded = contentMarketFixture();
unfunded.ownedStreamingPlatform.treasuryCash = 1;
const unfundedListing = getContentMarketListings(unfunded)[0];
const unfundedOffer = openStreamingPrivateOffer(unfunded, unfundedListing.id, unfundedListing.terms);
assert.equal(unfundedOffer.changed, false, 'A proposal above currently available treasury is not credible');
assert.equal(unfundedOffer.reason, 'INSUFFICIENT_TREASURY');

const scopedPlayer = contentMarketFixture();
const scopedListing = getContentMarketListings(scopedPlayer)[0];
const scopedOffer = openStreamingPrivateOffer(scopedPlayer, scopedListing.id, {
    ...scopedListing.terms,
    territory: 'MULTI_REGION',
    countryIds: ['IN'],
} as any);
assert.deepEqual(scopedOffer.negotiation?.countryIds, ['IN'], 'A private proposal preserves the exact countries the player selected');

const committedAfterAcceptance = structuredClone(submitted.player);
committedAfterAcceptance.ownedStreamingPlatform.rightsNegotiations[0] = {
    ...committedAfterAcceptance.ownedStreamingPlatform.rightsNegotiations[0],
    status: 'READY_TO_SIGN', responseStatus: 'SELLER_ACCEPTED', signingDeadlineAbsoluteWeek: dueWeek + 20,
} as any;
committedAfterAcceptance.ownedStreamingPlatform.costCommitments = [{
    id: 'later-commitment', idempotencyKey: 'later-commitment', status: 'COMMITTED',
    committedAmount: committedAfterAcceptance.ownedStreamingPlatform.treasuryCash,
} as any];
const blockedByCommitment = signStreamingRightsDeal(committedAfterAcceptance, negotiation.id);
assert.equal(blockedByCommitment.changed, false, 'Signature must recheck other reserved commitments');
assert.equal(blockedByCommitment.reason, 'INSUFFICIENT_TREASURY');

const withdrawPrivateOffer = (rightsMarket as any).withdrawStreamingRightsNegotiation;
assert.equal(typeof withdrawPrivateOffer, 'function', 'Players need a persisted way to walk away from an open private offer');
const withdrawn = withdrawPrivateOffer(submitted.player, negotiation.id);
assert.ok(withdrawn.changed);
assert.equal(withdrawn.negotiation.responseStatus, 'WITHDRAWN');
assert.equal(signStreamingRightsDeal(withdrawn.player, negotiation.id).changed, false,
    'A withdrawn offer can never be signed');

const marketUiPlayer = structuredClone(player);
marketUiPlayer.ownedStreamingPlatform.contentMarketDraft = { tab: 'ALL', search: '', selectedId: listing.id, ownedIds: [] };
const marketHtml = renderToStaticMarkup(React.createElement(StreamingContentMarket, {
    player: marketUiPlayer,
    brand: { name: 'Empire+', markId: 'FRAME_PLAY', customMark: null, hue: 258, sat: 78, identId: 'ASCENT',
        customIdent: null, promiseId: 'BALANCED', publicManifesto: '', layoutId: 'cinema', typeId: 'GROTESK',
        accentHue: 280, identMode: 'badge', identLen: 2, ratingId: 'MATURE', lockupId: 'STACKED', serverCity: null } as any,
    onUpdatePlayer: () => undefined,
    onClose: () => undefined,
    onOpenFinance: () => undefined,
    onCommission: () => undefined,
    onReview: () => undefined,
}));
assert.match(marketHtml, /Make private offer/, 'Listing detail must offer the delayed negotiation path');
assert.match(marketHtml, /data-content-market-design="zip-exact"/, 'The delayed negotiation path stays inside the approved ZIP market presentation');

const resolveOfferAtDue = (minimumGuarantee: number) => {
    const base = contentMarketFixture();
    const opportunity = getContentMarketListings(base)[0];
    const result = openStreamingPrivateOffer(base, opportunity.id, { ...opportunity.terms, minimumGuarantee });
    assert.ok(result.changed && result.negotiation);
    const due = (result.negotiation as any).responseDueAbsoluteWeek as number;
    const duePlayer = structuredClone(result.player);
    duePlayer.age = Math.floor(due / 52) + 1;
    duePlayer.currentWeek = (due % 52) + 1;
    return processOwnedStreamingPlatformWeek(duePlayer).player.ownedStreamingPlatform.rightsNegotiations[0] as any;
};
assert.equal(resolveOfferAtDue(Math.round(listing.rivalBidAmount * 1.4)).responseStatus, 'SELLER_ACCEPTED',
    'A premium credible term sheet can be accepted');
assert.equal(resolveOfferAtDue(Math.round(listing.rivalBidAmount * 0.9)).responseStatus, 'SELLER_COUNTERED',
    'A near-market term sheet can produce a seller counter');
assert.equal(resolveOfferAtDue(250_000).responseStatus, 'SELLER_DECLINED',
    'A deeply under-market term sheet can be declined');

const contested = contentMarketFixture();
const contestedListing = getContentMarketListings(contested)[0];
const pendingExclusive = openStreamingPrivateOffer(contested, contestedListing.id, { ...contestedListing.terms, exclusivity: 'EXCLUSIVE' });
assert.ok(pendingExclusive.changed && pendingExclusive.negotiation);
const otherBuyer = contentMarketFixture();
const otherListing = getContentMarketListings(otherBuyer)[0];
const otherPurchase = purchaseContentMarketListing(otherBuyer, otherListing.id, otherListing.signature);
assert.ok(otherPurchase.changed);
assert.equal((otherPurchase.player.ownedStreamingPlatform.rightsNegotiations[0] as any).proposalVersion, undefined,
    'CM1 instant purchases must not be mislabelled as private offers');
const soldWhilePending = structuredClone(pendingExclusive.player);
soldWhilePending.world.streamingRightsContracts = structuredClone(otherPurchase.player.world.streamingRightsContracts);
const contestedDue = (pendingExclusive.negotiation as any).responseDueAbsoluteWeek as number;
soldWhilePending.age = Math.floor(contestedDue / 52) + 1;
soldWhilePending.currentWeek = (contestedDue % 52) + 1;
const closedOffer = processOwnedStreamingPlatformWeek(soldWhilePending).player.ownedStreamingPlatform.rightsNegotiations[0] as any;
assert.equal(closedOffer.responseStatus, 'RIGHTS_SOLD', 'A competing rights sale closes the pending proposal safely');

const staleCounter = structuredClone(resolved.player);
staleCounter.ownedStreamingPlatform.rightsNegotiations[0] = {
    ...staleCounter.ownedStreamingPlatform.rightsNegotiations[0], status: 'COUNTERED', responseStatus: 'SELLER_COUNTERED',
    signingDeadlineAbsoluteWeek: dueWeek, counterMinimumGuarantee: listing.rivalBidAmount,
    counterPlatformRevenueShare: 68,
} as any;
const expiredCounter = rightsMarket.processStreamingPrivateOffersWeek(staleCounter, dueWeek + 1).player;
assert.equal((expiredCounter.ownedStreamingPlatform.rightsNegotiations[0] as any).responseStatus, 'EXPIRED',
    'An unanswered seller counter expires after its deadline');

const legacyState = structuredClone(opened.player.ownedStreamingPlatform) as any;
delete legacyState.rightsNegotiations[0].proposalVersion;
delete legacyState.rightsNegotiations[0].responseStatus;
const legacyReload = { ...player, ownedStreamingPlatform: legacyState };
const legacyProcessed = processOwnedStreamingPlatformWeek(legacyReload);
assert.notEqual((legacyProcessed.player.ownedStreamingPlatform.rightsNegotiations[0] as any).responseStatus, 'AWAITING_RESPONSE',
    'Old negotiations load without being silently converted into pending CM2 replies');

console.log('CM2 private offer scheduling passed.');
