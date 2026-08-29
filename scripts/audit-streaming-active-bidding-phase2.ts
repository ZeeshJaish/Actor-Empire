import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
    acceptStreamingBiddingOffer,
    advanceStreamingBiddingSession,
    createStreamingBiddingSession,
    getRestorableStreamingBiddingSession,
    getStreamingOfferFundingAllocation,
    getStreamingBiddingClosingOffers,
    normalizeStreamingBiddingSessionRegistry,
    upsertStreamingBiddingSession,
} from '../services/streamingBidding';
import { INITIAL_PLAYER, type StreamingBiddingPlatformInput } from '../types';
import { getPlatformFundingRelationshipMultiplier, processStreamingFundingContracts } from '../services/streamingFundingLogic';
import { registerProductionStreamingRightsContractFromOffer } from '../services/streamingRightsCore';
import { StreamingBiddingRoom } from '../views/lifestyle/business/components/StreamingBiddingRoom';
import { resolveStreamingPlatformBrandById } from '../services/streamingPlatformBrandRegistry';

const platforms: StreamingBiddingPlatformInput[] = [
    { id: 'NETFLIX' as const, cashAvailable: 500_000_000, baseBid: 12_000_000, acquisitionCeiling: 420_000_000, qualityPreference: 72, relationshipMultiplier: 1 },
    { id: 'APPLE_TV' as const, cashAvailable: 700_000_000, baseBid: 17_000_000, acquisitionCeiling: 560_000_000, qualityPreference: 82, relationshipMultiplier: 1 },
    { id: 'DISNEY_PLUS' as const, cashAvailable: 600_000_000, baseBid: 11_000_000, acquisitionCeiling: 520_000_000, qualityPreference: 70, relationshipMultiplier: 1 },
    { id: 'HULU' as const, cashAvailable: 250_000_000, baseBid: 7_500_000, acquisitionCeiling: 180_000_000, qualityPreference: 58, relationshipMultiplier: 1 },
].map(platform => {
    const brand = resolveStreamingPlatformBrandById(platform.id);
    return { ...platform, name: brand.displayName, color: brand.primaryColor };
});

const createFixture = () => createStreamingBiddingSession({
    projectId: 'picture-1',
    title: 'The Quiet Fire',
    sellerStudioId: 'studio-1',
    sellerStudioName: 'First Studio',
    absoluteWeek: 500,
    projectType: 'MOVIE',
    genre: 'DRAMA',
    projectBudget: 80_000_000,
    packageScore: 74,
    theatricalGross: 0,
    platforms,
});

const opening = createFixture();
const replayedOpening = createFixture();

const restrictedBidderRoom = createStreamingBiddingSession({
    projectId: 'restricted-bidder-picture',
    title: 'The Restricted Bidder',
    sellerStudioId: 'studio-1',
    sellerStudioName: 'First Studio',
    absoluteWeek: 500,
    projectType: 'MOVIE',
    genre: 'DRAMA',
    projectBudget: 80_000_000,
    packageScore: 74,
    theatricalGross: 0,
    platforms: platforms.map(platform => platform.id === 'NETFLIX'
        ? { ...platform, canStartNewBids: false }
        : platform),
});
assert.equal(
    restrictedBidderRoom.platformStates.some(state => state.platformId === 'NETFLIX'),
    false,
    'A recapitalized or administered platform must not enter a new bidding room.',
);
assert.equal(restrictedBidderRoom.platformStates.length, platforms.length - 1);

assert.deepEqual(opening, replayedOpening, 'the same project/week inputs must produce the same room');
assert.equal(opening.status, 'LIVE');
assert.equal(opening.roomSecondsRemaining, 15);
assert.equal(opening.activeSecondsElapsed, 0);
assert.equal(opening.acceptedOfferId, null);
assert.equal(opening.platformStates.length, platforms.length);
assert.ok(opening.platformStates.every(state => state.actionCooldownSeconds === 6), 'every platform must use the same response cooldown');
assert.ok(opening.platformStates.every(state => (
    state.color === resolveStreamingPlatformBrandById(state.platformId, state.platformName).primaryColor
)), 'serialized bidder states must retain their canonical platform colour');

const openingOffers = opening.offers.filter(offer => offer.status === 'ACTIVE' || offer.status === 'FINAL');
assert.equal(openingOffers.length, 1, 'a room should open with one real clearing offer');
assert.equal(openingOffers[0].isClearingOffer, true);
assert.ok(openingOffers[0].minimumGuarantee > 0, 'the clearing offer must reserve real cash');
assert.ok(openingOffers[0].fixedExposure <= platforms.find(platform => platform.id === openingOffers[0].platformId)!.cashAvailable);
assert.equal('highestBidId' in opening, false, 'the room must not persist a winning/highest bid concept');

const capabilityBoundRoom = createStreamingBiddingSession({
    projectId: 'foreign-picture', title: 'Foreign Picture', sellerStudioId: 'studio-1', sellerStudioName: 'First Studio',
    absoluteWeek: 500, projectType: 'MOVIE', projectBudget: 40_000_000, packageScore: 70,
    platforms: [{
        ...platforms[0],
        localizationLevelCap: 'SUBTITLES',
        localizationRequirements: [{
            languageId: 'japanese', mode: 'SUBTITLE', countryIds: ['JP'],
            capabilityTierAtPromise: 2, mandatory: true,
        }],
    } as any],
});
assert.notEqual(capabilityBoundRoom.offers[0].localization, 'DUBS_AND_SUBTITLES');
assert.deepEqual((capabilityBoundRoom.offers[0] as any).localizationRequirements, [{
    languageId: 'japanese', mode: 'SUBTITLE', countryIds: ['JP'],
    capabilityTierAtPromise: 2, mandatory: true,
}], 'Bids must retain their exact capability-backed language promise.');

let live = opening;
let sawExtension = false;
let sawUpwardRevision = false;
let sawDownwardRevision = false;
let priorOffers = new Map(live.offers.map(offer => [offer.id, offer]));
for (let second = 0; second < 45 && live.status === 'LIVE'; second += 1) {
    const beforeRemaining = live.roomSecondsRemaining;
    live = advanceStreamingBiddingSession(live, 1);
    if (live.roomSecondsRemaining > beforeRemaining) sawExtension = true;
    for (const offer of live.offers) {
        if (!offer.replacesOfferId) continue;
        const prior = priorOffers.get(offer.replacesOfferId);
        if (!prior) continue;
        if (offer.minimumGuarantee > prior.minimumGuarantee) sawUpwardRevision = true;
        if (offer.minimumGuarantee < prior.minimumGuarantee) sawDownwardRevision = true;
    }
    priorOffers = new Map(live.offers.map(offer => [offer.id, offer]));
}

assert.equal(live.status, 'CLOSING', 'the universal timer must finish at a closing table');
assert.ok(live.activeSecondsElapsed <= 45, 'material activity must never exceed the hard active-room cap');
assert.equal(live.acceptedOfferId, null, 'closing the room must not auto-sign an offer');
assert.ok(sawExtension, 'a material platform action should extend the universal clock');
assert.ok(sawUpwardRevision, 'competition should be able to make an offer rise');
assert.ok(sawDownwardRevision, 'an overbid platform should be able to replace an offer downward');

const closingOffers = getStreamingBiddingClosingOffers(live);
assert.ok(closingOffers.length >= 1, 'a normally opened room must never reach an empty closing table');
assert.ok(closingOffers.some(offer => offer.isClearingOffer), 'the clearing offer must survive through closing');
assert.ok(closingOffers.every(offer => offer.status === 'ACTIVE' || offer.status === 'FINAL'));
const selectedOffer = closingOffers.find(offer => offer.licensorRevenueShare > 0) || closingOffers[0];
assert.deepEqual(getStreamingOfferFundingAllocation({
    ...selectedOffer,
    productionFunding: 12_000_000,
    futureSeasonFunding: 8_000_000,
}), {
    productionFund: 12_000_000,
    lockedFutureSeasonFund: 8_000_000,
    totalFunding: 20_000_000,
}, 'production finance and future-season finance must remain separate when a deal is accepted');
const acceptedSession = acceptStreamingBiddingOffer(live, selectedOffer.id);
assert.equal(acceptedSession.status, 'ACCEPTED');
assert.equal(acceptedSession.acceptedOfferId, selectedOffer.id);
assert.equal(acceptedSession.offers.find(offer => offer.id === selectedOffer.id)?.status, 'ACCEPTED');

const signingPlayer = structuredClone(INITIAL_PLAYER);
const acceptedSigning = registerProductionStreamingRightsContractFromOffer(signingPlayer, {
    session: acceptedSession,
    offer: selectedOffer,
    signedAtAbsoluteWeek: 500,
    startsAtAbsoluteWeek: 501,
});
assert.ok(acceptedSigning.contract, 'an accepted immutable offer should create a Phase 1 contract');
assert.equal(acceptedSigning.contract?.sourceOfferId, selectedOffer.id);
assert.equal(acceptedSigning.contract?.biddingSessionId, acceptedSession.id);
assert.equal(acceptedSigning.contract?.minimumGuarantee, selectedOffer.minimumGuarantee);
assert.equal(acceptedSigning.contract?.licensorRevenueShare, selectedOffer.licensorRevenueShare);
assert.equal(acceptedSigning.contract?.guaranteeRecoupment, selectedOffer.guaranteeRecoupment);
assert.equal(acceptedSigning.contract?.backendCap, selectedOffer.backendCap);
assert.equal(acceptedSigning.contract?.durationWeeks, selectedOffer.durationWeeks);
assert.equal(acceptedSigning.contract?.exclusivity, selectedOffer.exclusivity);
assert.equal(acceptedSigning.contract?.localization, selectedOffer.localization);
assert.deepEqual(acceptedSigning.contract?.localizationRequirements, selectedOffer.localizationRequirements || []);
assert.equal(acceptedSigning.contract?.productionFunding, selectedOffer.productionFunding);
assert.equal(acceptedSigning.contract?.futureSeasonFunding, selectedOffer.futureSeasonFunding);
const acceptedSigningReplay = registerProductionStreamingRightsContractFromOffer(acceptedSigning.player, {
    session: acceptedSession,
    offer: selectedOffer,
    signedAtAbsoluteWeek: 500,
    startsAtAbsoluteWeek: 501,
});
assert.equal(acceptedSigningReplay.changed, false, 'replaying accepted offer conversion must be idempotent');
const closingMarkup = renderToStaticMarkup(React.createElement(StreamingBiddingRoom, {
    session: live,
    canAccept: true,
    energyCost: 5,
    onStart: () => undefined,
    onSessionChange: () => undefined,
    onAccept: () => undefined,
    onLeave: () => undefined,
    onBack: () => undefined,
}));
assert.match(closingMarkup, /Room clock/i);
assert.match(closingMarkup, /Adjusted gross/i);
assert.match(closingMarkup, /Closing table/i);
assert.match(closingMarkup, /data-platform-brand="NETFLIX"/i);
assert.doesNotMatch(closingMarkup, /Highest bid|Winning bid|Best offer/i, 'the UI must not advise a winner');

assert.deepEqual(INITIAL_PLAYER.world.streamingBiddingSessions, {}, 'new games should initialize an empty bidding-session registry');
const savedRegistry = upsertStreamingBiddingSession({}, live);
const transferredRegistry = normalizeStreamingBiddingSessionRegistry(JSON.parse(JSON.stringify(savedRegistry)));
assert.deepEqual(transferredRegistry, savedRegistry, 'a session must survive a JSON save transfer without rerolling');
assert.deepEqual(
    getRestorableStreamingBiddingSession(transferredRegistry, 'picture-1', 'studio-1', 500),
    live,
    'reopening in the same absolute week must restore the exact room',
);
assert.equal(
    getRestorableStreamingBiddingSession(transferredRegistry, 'picture-1', 'studio-1', 501),
    null,
    'a later game week may create a fresh market instead of restoring the old room',
);
assert.equal(
    getPlatformFundingRelationshipMultiplier({
        trustModifier: 2,
        recoveryWeeksRemaining: 0,
        completedDeals: 8,
        profitableDeals: 6,
        loyaltyScore: 80,
        realizedPartnerValue: 500_000_000,
    }),
    1.16,
    'strong profitable history may improve bidding appetite but must stay capped',
);
const recoveredCommercialRelationship = processStreamingFundingContracts({
    currentWeek: 11,
    currentYear: 30,
    lockedStreamingFunds: [],
    platformRelations: {
        NETFLIX: {
            trustModifier: 2,
            recoveryWeeksRemaining: 0,
            completedDeals: 4,
            profitableDeals: 3,
            loyaltyScore: 42,
            realizedPartnerValue: 120_000_000,
        },
    },
});
assert.equal(recoveredCommercialRelationship.platformRelations.NETFLIX?.completedDeals, 4,
    'weekly breach recovery must not erase completed-deal history');
assert.equal(recoveredCommercialRelationship.platformRelations.NETFLIX?.trustModifier, 2,
    'positive relationship trust must survive weeks without a breach timer');
const normalizedMalformed = normalizeStreamingBiddingSessionRegistry({
    valid: live,
    broken: { ...live, id: '', projectId: '' },
});
assert.deepEqual(Object.keys(normalizedMalformed), [live.id], 'malformed sessions should be discarded during migration');

console.log('Streaming active bidding Phase 2 audit passed.');
