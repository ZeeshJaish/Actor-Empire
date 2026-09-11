import assert from 'node:assert/strict';
import {
    acceptStreamingBiddingOffer,
    createStreamingBiddingSession,
    normalizeStreamingBiddingSessionRegistry,
} from '../services/streamingBidding';
import type { StreamingBiddingPlatformInput, StreamingOfferVersion } from '../types';

const platforms: StreamingBiddingPlatformInput[] = ['ALPHA', 'BETA', 'GAMMA', 'OMEGA'].map((id, index) => ({
    id,
    name: id,
    color: '#ffffff',
    cashAvailable: 500_000_000,
    baseBid: 50_000_000,
    acquisitionCeiling: 250_000_000,
    qualityPreference: 50,
    relationshipMultiplier: 1,
    sharedRightsPreference: 0.5,
    availablePremiereAbsoluteWeeks: index === 3 ? [2_003] : [2_002, 2_003],
    availablePremiereAbsoluteWeek: index === 3 ? 2_003 : 2_002,
}));

const source = createStreamingBiddingSession({
    projectId: 'shared-picture',
    title: 'Shared Picture',
    sellerStudioId: 'studio-1',
    sellerStudioName: 'First Studio',
    absoluteWeek: 2_001,
    projectType: 'MOVIE',
    genre: 'DRAMA',
    projectBudget: 30_000_000,
    packageScore: 80,
    platforms,
});
const offerTemplate = source.offers[0];
const makeOffer = (
    platformId: string,
    exclusivity: StreamingOfferVersion['exclusivity'],
    proposedPremiereAbsoluteWeek: number,
): StreamingOfferVersion => ({
    ...offerTemplate,
    id: `offer-${platformId.toLowerCase()}`,
    platformId,
    platformName: platformId,
    exclusivity,
    proposedPremiereAbsoluteWeek,
    status: 'ACTIVE',
});
const offers = [
    makeOffer('ALPHA', 'NON_EXCLUSIVE', 2_002),
    makeOffer('BETA', 'NON_EXCLUSIVE', 2_002),
    makeOffer('GAMMA', 'NON_EXCLUSIVE', 2_002),
    makeOffer('OMEGA', 'EXCLUSIVE', 2_003),
];
const room = {
    ...source,
    offers,
    platformStates: source.platformStates.map(state => ({
        ...state,
        currentOfferId: `offer-${state.platformId.toLowerCase()}`,
        status: 'RESPONDING' as const,
    })),
};

const oneShared = acceptStreamingBiddingOffer(room, 'offer-alpha');
assert.equal(oneShared.status, 'LIVE');
assert.equal(oneShared.lockedPremiereAbsoluteWeek, 2_002);
assert.equal(oneShared.offers.find(offer => offer.id === 'offer-alpha')?.status, 'ACCEPTED');
assert.equal(oneShared.offers.find(offer => offer.id === 'offer-omega')?.status, 'WITHDRAWN');

const staleExclusiveAttempt = acceptStreamingBiddingOffer(oneShared, 'offer-omega');
assert.deepEqual(staleExclusiveAttempt, oneShared, 'an exclusive offer cannot be accepted after shared rights are signed');

const twoShared = acceptStreamingBiddingOffer(oneShared, 'offer-beta');
assert.equal(twoShared.status, 'LIVE');
assert.equal(twoShared.offers.filter(offer => offer.status === 'ACCEPTED').length, 2);
const threeShared = acceptStreamingBiddingOffer(twoShared, 'offer-gamma');
assert.equal(threeShared.status, 'ACCEPTED');
assert.equal(threeShared.offers.filter(offer => offer.status === 'ACCEPTED').length, 3);

const exclusive = acceptStreamingBiddingOffer(room, 'offer-omega');
assert.equal(exclusive.status, 'ACCEPTED');
assert.ok(exclusive.offers.filter(offer => offer.id !== 'offer-omega').every(offer => offer.status === 'WITHDRAWN'));

const legacyAccepted = structuredClone(oneShared) as any;
delete legacyAccepted.lockedPremiereAbsoluteWeek;
legacyAccepted.offers.forEach((offer: any) => delete offer.proposedPremiereAbsoluteWeek);
legacyAccepted.platformStates.forEach((state: any) => {
    delete state.availablePremiereAbsoluteWeeks;
    delete state.availablePremiereAbsoluteWeek;
});
const migratedAccepted = normalizeStreamingBiddingSessionRegistry({ [legacyAccepted.id]: legacyAccepted })[legacyAccepted.id];
assert.equal(migratedAccepted.offers.find(offer => offer.status === 'ACCEPTED')?.proposedPremiereAbsoluteWeek, source.rightsLot.startsAtAbsoluteWeek);
assert.equal(migratedAccepted.lockedPremiereAbsoluteWeek, source.rightsLot.startsAtAbsoluteWeek, 'legacy accepted shared rooms need a recovered locked premiere date');

console.log('Streaming shared licensing audit passed.');
