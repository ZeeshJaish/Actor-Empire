import {
    ACQUISITION_COMMITMENTS,
    acceptAcquisitionCounter,
    analyzeCustomOffer,
    beatAcquisitionRivalBid,
    calculateDueDiligenceFee,
    completeStudioAcquisition,
    getAcquisitionCase,
    getAcquisitionEligibility,
    getFundingOptions,
    getOfferPresets,
    resolveStudioAcquisitionResponses,
    reviseAcquisitionOffer,
    runDueDiligence,
    submitOpeningOffer,
    walkAwayFromAcquisition,
} from '../services/studioAcquisition';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const profile: any = {
    id: 'TARGET_STUDIO',
    name: 'Target Pictures',
    isPlayerOwned: false,
    acquisitionState: 'OPEN_TO_OFFERS',
    valuation: 100_000_000,
    capital: 18_000_000,
    debt: 12_000_000,
    profitability: 9_000_000,
    reputation: 62,
    hits: 2,
    flops: 1,
    rightsCount: 4,
    franchiseCount: 1,
    universeCount: 0,
    facilities: ['Soundstage'],
    keyTalent: [{ name: 'Ava Star', role: 'Lead Talent' }],
    ownershipStructure: 'Privately held · Strategic ownership group',
    archetype: 'PRESTIGE',
};

const productionStudio: any = {
    id: 'PLAYER_STUDIO',
    name: 'Player Pictures',
    type: 'PRODUCTION_HOUSE',
    balance: 500_000_000,
    stats: {
        valuation: 750_000_000,
        weeklyProfit: 8_000_000,
        weeklyRevenue: 20_000_000,
        weeklyExpenses: 12_000_000,
        lifetimeRevenue: 900_000_000,
        brandHealth: 75,
        customerSatisfaction: 78,
        riskLevel: 20,
        hype: 50,
    },
};

const player: any = {
    id: 'player_1',
    age: 31,
    currentWeek: 14,
    money: 300_000_000,
    businesses: [productionStudio],
    flags: {},
    logs: [],
};

assert(getAcquisitionEligibility(profile).canApproach, 'Open-to-offers studios should be approachable.');
assert(!getAcquisitionEligibility({ ...profile, acquisitionState: 'NOT_FOR_SALE' }).canApproach, 'Not-for-sale studios should be blocked.');
assert(!getAcquisitionEligibility({ ...profile, isPlayerOwned: true }).canApproach, 'Player-owned studios should be blocked.');
assert(getAcquisitionEligibility({ ...profile, acquisitionState: 'PUBLICLY_TRADED' }).allowedOfferTypes.length === 1, 'Public companies should expose minority investment only.');

assert(calculateDueDiligenceFee({ valuation: 100_000_000 }) === 250_000, 'Diligence should respect its minimum fee.');
assert(calculateDueDiligenceFee({ valuation: 100_000_000_000 }) === 25_000_000, 'Diligence should respect its maximum fee.');
assert(calculateDueDiligenceFee({ valuation: 2_000_000_000 }) === 3_000_000, 'Diligence should scale at 0.15% between its caps.');

const personalFunding = getFundingOptions({
    player,
    profile,
    amount: 100_000_000,
    expenseType: 'OFFER',
});
assert(personalFunding[0].source === 'PERSONAL' && personalFunding[0].affordable, 'Personal wealth should be available when affordable.');
assert(personalFunding.some(option => option.source === 'STUDIO' && option.businessId === productionStudio.id && option.affordable), 'Production studio capital should be offered.');
assert(personalFunding.find(option => option.source === 'PERSONAL')?.complianceRisk === 0, 'Personal funding should carry no compliance risk.');
assert((personalFunding.find(option => option.source === 'STUDIO')?.complianceRisk || 0) > 0, 'Studio funding should preview compliance risk.');

const firstDiligence = runDueDiligence({
    player,
    profile,
    funding: { source: 'PERSONAL' },
});
assert(firstDiligence.success, 'Affordable personal diligence should succeed.');
assert(firstDiligence.player.money === player.money - 250_000, 'Personal diligence should deduct its fee immediately.');
assert(Boolean(firstDiligence.report?.hiddenLiabilities), 'Diligence should reveal hidden liabilities.');
assert(getAcquisitionCase(firstDiligence.player, profile.id)?.diligence?.status === 'COMPLETE', 'The completed report should persist in the acquisition case.');
assert(
    firstDiligence.player.news.some((item: any) => item.headline.includes('advisors begin diligence')),
    'Diligence should create a public media pulse for the acquisition process.',
);
assert(
    firstDiligence.player.x.feed.some((post: any) => post.authorHandle === '@studiodealwire' && post.content.includes('serious homework')),
    'Diligence should create industry social chatter.',
);

const deterministicDiligence = runDueDiligence({
    player,
    profile,
    funding: { source: 'PERSONAL' },
});
assert(
    JSON.stringify(firstDiligence.report) === JSON.stringify(deterministicDiligence.report),
    'Diligence results should be deterministic for the same player and company.',
);

const duplicateDiligence = runDueDiligence({
    player: firstDiligence.player,
    profile,
    funding: { source: 'PERSONAL' },
});
assert(!duplicateDiligence.success && duplicateDiligence.reason === 'ALREADY_PURCHASED', 'Diligence must not charge twice.');
assert(duplicateDiligence.player.money === firstDiligence.player.money, 'Duplicate diligence must preserve money.');

const studioDiligence = runDueDiligence({
    player,
    profile: { ...profile, id: 'STUDIO_FUNDED_TARGET' },
    funding: { source: 'STUDIO', businessId: productionStudio.id },
});
assert(studioDiligence.success, 'Affordable studio-funded diligence should succeed.');
assert(
    studioDiligence.player.businesses[0].balance === productionStudio.balance - 250_000,
    'Studio-funded diligence should deduct from the selected production house.',
);

const offerPresets = getOfferPresets({ profile, acquisitionCase: getAcquisitionCase(firstDiligence.player, profile.id), minorityPercent: 25 });
assert(offerPresets.CONSERVATIVE.amount < offerPresets.FAIR.amount, 'Conservative offers should be below fair value.');
assert(offerPresets.AGGRESSIVE.amount > offerPresets.FAIR.amount, 'Aggressive offers should carry a premium.');
assert(offerPresets.MINORITY.percent === 25 && offerPresets.MINORITY.amount > 0, 'Minority offers should price the selected block.');

const customFull = analyzeCustomOffer({
    profile,
    offerType: 'FAIR',
    offerAmount: 92_500_000,
});
assert(customFull.normalizedAmount === 92_500_000, 'Custom full offers should preserve exact whole-dollar terms.');
assert(customFull.valueDeltaPercent === -7.5, 'Full custom offers should calculate their exact value discount.');
assert(customFull.valid, 'A credible custom full offer should be valid.');
assert(customFull.posture === 'SERIOUS', 'A near-value custom offer should be treated as serious.');

const customMinority = analyzeCustomOffer({
    profile,
    offerType: 'MINORITY',
    offerAmount: 27_500_000,
    minorityPercent: 25,
    existingOwnershipPercent: 3,
    strategicThreshold: 25,
});
assert(customMinority.impliedCompanyValue === 110_000_000, 'Minority analysis should expose the implied company value.');
assert(customMinority.combinedOwnershipPercent === 28, 'Minority analysis should include the current company position.');
assert(customMinority.reachesStrategicThreshold, 'Combined ownership above the threshold should grant strategic influence.');
assert(customMinority.valueDeltaPercent === 10, 'Minority premium should compare implied value to the company reference.');

assert(analyzeCustomOffer({ profile, offerType: 'FAIR', offerAmount: 49_000_000 }).posture === 'DISMISSIVE', 'Sub-50% offers should be dismissive.');
assert(analyzeCustomOffer({ profile, offerType: 'FAIR', offerAmount: 70_000_000 }).posture === 'TESTING', 'Discounted credible offers should be testing.');
assert(analyzeCustomOffer({ profile, offerType: 'FAIR', offerAmount: 108_000_000 }).posture === 'SERIOUS', 'Near-value offers should be serious.');
assert(analyzeCustomOffer({ profile, offerType: 'FAIR', offerAmount: 125_000_000 }).posture === 'COMPELLING', 'Meaningful premiums should be compelling.');
assert(analyzeCustomOffer({ profile, offerType: 'FAIR', offerAmount: 160_000_000 }).posture === 'OVERPAYING', 'Excessive premiums should be flagged as overpaying.');
assert(!analyzeCustomOffer({ profile, offerType: 'FAIR', offerAmount: 40_000_000 }).valid, 'Offers below half of value should be invalid.');
assert(!analyzeCustomOffer({ profile, offerType: 'FAIR', offerAmount: 210_000_000 }).valid, 'Offers above double value should be invalid.');
assert(!analyzeCustomOffer({ profile, offerType: 'MINORITY', offerAmount: 20_000_000, minorityPercent: 4 }).valid, 'Minority stakes below 5% should be invalid.');

const submitted = submitOpeningOffer({
    player,
    profile,
    offerType: 'FAIR',
    funding: { source: 'PERSONAL' },
});
assert(submitted.success, 'A valid direct offer should be submitted without diligence.');
assert(submitted.player.money === player.money, 'Submitting an offer must not deduct the purchase price.');
assert(getAcquisitionCase(submitted.player, profile.id)?.status === 'OFFER_SUBMITTED', 'The pending offer should persist.');
assert(getAcquisitionCase(submitted.player, profile.id)?.offer?.funding.source === 'PERSONAL', 'The funding intent should persist.');
assert(
    submitted.player.news.some((item: any) => item.headline.includes('opening approach')),
    'Submitting an offer should create acquisition news.',
);
assert(
    submitted.player.x.feed.some((post: any) => post.content.includes('put Target Pictures in play')),
    'Submitting an offer should create acquisition social chatter.',
);

const customSubmitted = submitOpeningOffer({
    player,
    profile: { ...profile, id: 'CUSTOM_TARGET', name: 'Custom Target' },
    offerType: 'FAIR',
    offerAmount: 93_750_000,
    funding: { source: 'PERSONAL' },
});
assert(customSubmitted.success, 'A credible custom offer should submit.');
assert(getAcquisitionCase(customSubmitted.player, 'CUSTOM_TARGET')?.offer?.amount === 93_750_000, 'The exact custom amount should persist.');
assert(customSubmitted.player.money === player.money, 'Custom offer submission must not deduct the purchase price.');

const commitmentSubmitted = submitOpeningOffer({
    player,
    profile: { ...profile, id: 'COMMITMENT_TARGET', name: 'Commitment Target' },
    offerType: 'FAIR',
    offerAmount: 103_000_000,
    funding: { source: 'PERSONAL' },
    commitments: ['PRESERVE_STUDIO_NAME', 'PROTECT_EMPLOYEES', 'GUARANTEE_PRODUCTIONS'],
});
assert(commitmentSubmitted.success, 'A committed acquisition offer should submit.');
const committedOffer = getAcquisitionCase(commitmentSubmitted.player, 'COMMITMENT_TARGET')?.offer;
assert(committedOffer?.commitments?.length === 3, 'Submitted offers should persist selected deal commitments.');
assert(
    ACQUISITION_COMMITMENTS.some(commitment => commitment.id === 'PROTECT_EMPLOYEES'),
    'Commitment metadata should include employee protection.',
);
const commitmentResolved = resolveStudioAcquisitionResponses(commitmentSubmitted.player);
assert(
    getAcquisitionCase(commitmentResolved, 'COMMITMENT_TARGET')?.status === 'ACCEPTED',
    'Strong commitments should improve seller willingness for a near-value offer.',
);

const invalidCustom = submitOpeningOffer({
    player,
    profile: { ...profile, id: 'INVALID_CUSTOM_TARGET' },
    offerType: 'FAIR',
    offerAmount: 40_000_000,
    funding: { source: 'PERSONAL' },
});
assert(!invalidCustom.success && invalidCustom.reason === 'INVALID_OFFER_TERMS', 'Invalid custom offer terms should be rejected.');

const duplicateOffer = submitOpeningOffer({
    player: submitted.player,
    profile,
    offerType: 'FAIR',
    funding: { source: 'PERSONAL' },
});
assert(!duplicateOffer.success && duplicateOffer.reason === 'OFFER_ALREADY_SUBMITTED', 'Duplicate opening offers should be blocked.');

const unaffordable = submitOpeningOffer({
    player: { ...player, money: 100 },
    profile,
    offerType: 'FAIR',
    funding: { source: 'PERSONAL' },
});
assert(!unaffordable.success && unaffordable.reason === 'INSUFFICIENT_FUNDS', 'Unaffordable offers should be blocked.');

const publicFullOffer = submitOpeningOffer({
    player,
    profile: { ...profile, id: 'PUBLIC_TARGET', acquisitionState: 'PUBLICLY_TRADED' },
    offerType: 'FAIR',
    funding: { source: 'PERSONAL' },
});
assert(!publicFullOffer.success && publicFullOffer.reason === 'OFFER_TYPE_UNAVAILABLE', 'Public companies should reject direct full acquisition offers.');

const strongOffer = submitOpeningOffer({
    player,
    profile: { ...profile, id: 'STRONG_TARGET', name: 'Strong Target' },
    offerType: 'AGGRESSIVE',
    offerAmount: 115_000_000,
    funding: { source: 'PERSONAL' },
});
const counterOffer = submitOpeningOffer({
    player: strongOffer.player,
    profile: { ...profile, id: 'COUNTER_TARGET', name: 'Counter Target' },
    offerType: 'FAIR',
    offerAmount: 100_000_000,
    funding: { source: 'PERSONAL' },
});
const weakOffer = submitOpeningOffer({
    player: counterOffer.player,
    profile: { ...profile, id: 'WEAK_TARGET', name: 'Weak Target' },
    offerType: 'CONSERVATIVE',
    offerAmount: 70_000_000,
    funding: { source: 'PERSONAL' },
});
const resolvedResponses = resolveStudioAcquisitionResponses(weakOffer.player);
assert(getAcquisitionCase(resolvedResponses, 'STRONG_TARGET')?.status === 'ACCEPTED', 'A strong premium should be accepted.');
assert(getAcquisitionCase(resolvedResponses, 'COUNTER_TARGET')?.status === 'COUNTERED', 'A credible offer should receive a counter.');
assert(getAcquisitionCase(resolvedResponses, 'WEAK_TARGET')?.status === 'REJECTED', 'A weak offer should be rejected.');
assert(resolvedResponses.inbox.filter((message: any) => message.type === 'STUDIO_ACQUISITION').length === 3, 'Each seller response should create one acquisition message.');
assert(
    resolvedResponses.news.some((item: any) => item.headline.includes('board accepts')) &&
    resolvedResponses.news.some((item: any) => item.headline.includes('counters')) &&
    resolvedResponses.news.some((item: any) => item.headline.includes('rejects')),
    'Seller responses should create accepted, countered, and rejected news beats.',
);
assert(
    resolvedResponses.x.feed.filter((post: any) => post.authorHandle === '@studiodealwire').length >= 6,
    'Seller responses should create social feed reactions in addition to opening-offer chatter.',
);

const acceptedCounter = acceptAcquisitionCounter({ player: resolvedResponses, studioId: 'COUNTER_TARGET' });
assert(acceptedCounter.success && getAcquisitionCase(acceptedCounter.player, 'COUNTER_TARGET')?.status === 'ACCEPTED', 'Accepting a counter should agree seller terms.');
assert(
    acceptedCounter.player.inbox.find((message: any) => message.data?.studioId === 'COUNTER_TARGET')?.data?.decision === 'ACCEPTED',
    'Accepting a counter should give its existing message the completed visual state.',
);
assert(
    acceptedCounter.player.news.some((item: any) => item.headline.includes('accepts Counter Target')),
    'Accepting a counter should create terms-agreed news.',
);

const revisedCounter = reviseAcquisitionOffer({
    player: resolvedResponses,
    studioId: 'COUNTER_TARGET',
    offerAmount: 104_000_000,
});
assert(revisedCounter.success && getAcquisitionCase(revisedCounter.player, 'COUNTER_TARGET')?.status === 'OFFER_SUBMITTED', 'Revising should resubmit the existing case.');
assert(getAcquisitionCase(revisedCounter.player, 'COUNTER_TARGET')?.offer?.amount === 104_000_000, 'Revising should persist the exact amount.');
assert(
    revisedCounter.player.news.some((item: any) => item.headline.includes('revises the bid')),
    'Revising a counter should create a renewed-bid news beat.',
);

const committedCounterOpening = submitOpeningOffer({
    player,
    profile: { ...profile, id: 'COMMITTED_COUNTER_TARGET', name: 'Committed Counter Target' },
    offerType: 'FAIR',
    offerAmount: 90_000_000,
    funding: { source: 'PERSONAL' },
    commitments: ['PRESERVE_STUDIO_NAME'],
});
const committedCounterResolved = resolveStudioAcquisitionResponses(committedCounterOpening.player);
const committedCounterRevision = reviseAcquisitionOffer({
    player: committedCounterResolved,
    studioId: 'COMMITTED_COUNTER_TARGET',
    offerAmount: 104_000_000,
});
assert(
    getAcquisitionCase(committedCounterRevision.player, 'COMMITTED_COUNTER_TARGET')?.offer?.commitments?.includes('PRESERVE_STUDIO_NAME'),
    'Revised counter offers should preserve deal commitments.',
);

const walkedAway = walkAwayFromAcquisition({ player: resolvedResponses, studioId: 'COUNTER_TARGET' });
assert(walkedAway.success && getAcquisitionCase(walkedAway.player, 'COUNTER_TARGET')?.status === 'CLOSED', 'Walking away should close the case.');
assert(
    walkedAway.player.news.some((item: any) => item.headline.includes('walks away')),
    'Walking away should create a closed-approach news beat.',
);

const rivalOpening = submitOpeningOffer({
    player,
    profile: { ...profile, id: 'RIVAL_TARGET', name: 'Rival Target', acquisitionState: 'AUCTION_EXPECTED' },
    offerType: 'FAIR',
    offerAmount: 96_000_000,
    funding: { source: 'PERSONAL' },
});
assert(rivalOpening.success, 'Auction targets should accept credible opening offers into review.');
const rivalResolved = resolveStudioAcquisitionResponses(rivalOpening.player);
const rivalCase = getAcquisitionCase(rivalResolved, 'RIVAL_TARGET');
assert(rivalCase?.status === 'RIVAL_BID', 'Auction pressure should be able to trigger a rival bidding round.');
assert(Boolean(rivalCase?.sellerResponse?.rivalStudioName), 'Rival bidding should name the competing studio.');
assert((rivalCase?.sellerResponse?.rivalAmount || 0) > 96_000_000, 'Rival bidding should beat the player opening offer.');
assert((rivalCase?.sellerResponse?.requiredBidAmount || 0) > (rivalCase?.sellerResponse?.rivalAmount || 0), 'Rival bidding should expose the required beat amount.');
assert(rivalCase?.sellerResponse?.maxRounds === 3, 'Rival bidding should cap the deal at three rounds.');
assert(
    rivalResolved.news.some((item: any) => item.headline.includes('enters the fight')),
    'Rival bids should create bidding-war news.',
);

const lowRivalReply = beatAcquisitionRivalBid({
    player: rivalResolved,
    studioId: 'RIVAL_TARGET',
    offerAmount: (rivalCase?.sellerResponse?.rivalAmount || 0) - 1_000_000,
});
assert(!lowRivalReply.success && lowRivalReply.reason === 'BID_BELOW_REQUIRED', 'A rival reply below the beat amount should be blocked.');

const beatRival = beatAcquisitionRivalBid({
    player: rivalResolved,
    studioId: 'RIVAL_TARGET',
    offerAmount: rivalCase?.sellerResponse?.requiredBidAmount || 0,
});
assert(beatRival.success && getAcquisitionCase(beatRival.player, 'RIVAL_TARGET')?.status === 'OFFER_SUBMITTED', 'Beating the rival should resubmit the acquisition case.');
assert(getAcquisitionCase(beatRival.player, 'RIVAL_TARGET')?.offer?.round === 2, 'Beating a rival should advance the bidding round.');
assert(
    beatRival.player.news.some((item: any) => item.headline.includes('raises the bid')),
    'Beating a rival should create a raised-bid news beat.',
);

const committedRivalOpening = submitOpeningOffer({
    player,
    profile: { ...profile, id: 'COMMITTED_RIVAL_TARGET', name: 'Committed Rival Target', acquisitionState: 'AUCTION_EXPECTED' },
    offerType: 'FAIR',
    offerAmount: 96_000_000,
    funding: { source: 'PERSONAL' },
    commitments: ['GUARANTEE_PRODUCTIONS'],
});
const committedRivalResolved = resolveStudioAcquisitionResponses(committedRivalOpening.player);
const committedRivalCase = getAcquisitionCase(committedRivalResolved, 'COMMITTED_RIVAL_TARGET');
const committedRivalBeat = beatAcquisitionRivalBid({
    player: committedRivalResolved,
    studioId: 'COMMITTED_RIVAL_TARGET',
    offerAmount: committedRivalCase?.sellerResponse?.requiredBidAmount || 0,
});
assert(
    getAcquisitionCase(committedRivalBeat.player, 'COMMITTED_RIVAL_TARGET')?.offer?.commitments?.includes('GUARANTEE_PRODUCTIONS'),
    'Beating a rival bid should preserve deal commitments.',
);

const finalRoundCase = {
    ...rivalCase!,
    status: 'OFFER_SUBMITTED' as const,
    offer: {
        ...rivalCase!.offer!,
        amount: 100_000_000,
        round: 3,
    },
    sellerResponse: undefined,
};
const finalRoundPlayer = {
    ...rivalResolved,
    flags: {
        ...rivalResolved.flags,
        studioAcquisitionCases: [finalRoundCase],
    },
};
const finalRoundResolved = resolveStudioAcquisitionResponses(finalRoundPlayer);
assert(getAcquisitionCase(finalRoundResolved, 'RIVAL_TARGET')?.status === 'REJECTED', 'Final-round rival pressure should not loop forever.');

const signingOpening = submitOpeningOffer({
    player,
    profile: { ...profile, id: 'SIGNING_TARGET', name: 'Signing Target' },
    offerType: 'AGGRESSIVE',
    offerAmount: 115_000_000,
    funding: { source: 'PERSONAL' },
    commitments: ['PRESERVE_STUDIO_NAME', 'PROTECT_EMPLOYEES'],
});
const signingResolved = resolveStudioAcquisitionResponses(signingOpening.player);
assert(getAcquisitionCase(signingResolved, 'SIGNING_TARGET')?.status === 'ACCEPTED', 'Signing fixture should reach accepted terms.');
const signedDeal = completeStudioAcquisition({
    player: signingResolved,
    profile: { ...profile, id: 'SIGNING_TARGET', name: 'Signing Target' },
});
assert(signedDeal.success, 'Accepted full acquisitions should be signable.');
assert(signedDeal.player.money === player.money - 115_000_000, 'Signing should deduct the agreed purchase price from personal wealth.');
const acquiredBusiness = signedDeal.player.businesses.find((business: any) => business.id === 'SIGNING_TARGET');
assert(acquiredBusiness?.type === 'PRODUCTION_HOUSE', 'Signing should create an owned production house for the acquired studio.');
assert(acquiredBusiness?.name === 'Signing Target', 'The acquired business should preserve the studio name.');
assert(acquiredBusiness?.studioState?.scripts && Array.isArray(acquiredBusiness.studioState.scripts), 'The acquired studio should use the existing studio state shape.');
assert(acquiredBusiness?.stats?.valuation === profile.valuation, 'The acquired studio should carry the Forbes valuation into business stats.');
assert(getAcquisitionCase(signedDeal.player, 'SIGNING_TARGET')?.status === 'ACQUIRED', 'Signing should mark the acquisition case acquired.');
assert(
    signedDeal.player.inbox.find((message: any) => message.data?.studioId === 'SIGNING_TARGET')?.data?.decision === 'ACQUIRED',
    'Signing should give the acquisition message a completed acquired state.',
);
assert(
    signedDeal.player.news.some((item: any) => item.headline.includes('completes the acquisition')),
    'Signing should create a final acquisition headline.',
);
assert(
    signedDeal.player.x.feed.some((post: any) => post.content.includes('officially acquired Signing Target')),
    'Signing should create a final acquisition social reaction.',
);

const acceptedButBroke = {
    ...signingResolved,
    money: 10,
};
const brokeSigning = completeStudioAcquisition({
    player: acceptedButBroke,
    profile: { ...profile, id: 'SIGNING_TARGET', name: 'Signing Target' },
});
assert(!brokeSigning.success && brokeSigning.reason === 'INSUFFICIENT_FUNDS', 'Signing should re-check funds before moving ownership.');
assert(!brokeSigning.player.businesses.some((business: any) => business.id === 'SIGNING_TARGET'), 'Failed signing must not create the acquired business.');

const studioFundedSigningOpening = submitOpeningOffer({
    player,
    profile: { ...profile, id: 'STUDIO_SIGNING_TARGET', name: 'Studio Signing Target' },
    offerType: 'AGGRESSIVE',
    offerAmount: 115_000_000,
    funding: { source: 'STUDIO', businessId: productionStudio.id },
});
const studioFundedResolved = resolveStudioAcquisitionResponses(studioFundedSigningOpening.player);
const studioFundedSigned = completeStudioAcquisition({
    player: studioFundedResolved,
    profile: { ...profile, id: 'STUDIO_SIGNING_TARGET', name: 'Studio Signing Target' },
});
assert(studioFundedSigned.success, 'Accepted studio-funded acquisitions should sign.');
assert(
    studioFundedSigned.player.businesses.find((business: any) => business.id === productionStudio.id)?.balance === productionStudio.balance - 115_000_000,
    'Studio-funded signing should deduct from the selected production house capital.',
);
assert(
    studioFundedSigned.player.businesses.some((business: any) => business.id === 'STUDIO_SIGNING_TARGET' && business.type === 'PRODUCTION_HOUSE'),
    'Studio-funded signing should still create the acquired production house.',
);

console.log('Studio acquisition audit passed.');
