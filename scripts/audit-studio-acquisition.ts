import {
    ACQUISITION_INBOX_NOTICE_WEEKS,
    ACQUISITION_COMMITMENTS,
    ACQUISITION_MAX_OFFER_ATTEMPTS,
    acceptAcquisitionCounter,
    analyzeCustomOffer,
    beatAcquisitionRivalBid,
    calculateDueDiligenceFee,
    completeAcquisitionTransaction,
    completeStudioAcquisition,
    getAcquisitionCase,
    getAcquisitionEligibility,
    getAcquisitionOfferAttemptCount,
    getAcquisitionOfferAttemptsRemaining,
    getAcquisitionReapproachWeeksRemaining,
    getFundingOptions,
    getOfferPresets,
    resolveStudioAcquisitionResponses,
    reviseAcquisitionOffer,
    runDueDiligence,
    submitOpeningOffer,
    walkAwayFromAcquisition,
} from '../services/studioAcquisition';
import { getStockOutstandingShares } from '../services/stockLogic';
import { getCompanyPosition } from '../services/companyPosition';

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
const marketClosedOffer = submitOpeningOffer({
    player,
    profile: { ...profile, id: 'CLOSED_TARGET', acquisitionState: 'NOT_FOR_SALE' },
    offerType: 'FAIR',
    funding: { source: 'PERSONAL' },
});
assert(!marketClosedOffer.success && marketClosedOffer.reason === 'NOT_FOR_SALE', 'A market-closed studio must return its exact blocker reason.');
assert(!getAcquisitionEligibility({ ...profile, isPlayerOwned: true }).canApproach, 'Player-owned studios should be blocked.');
assert(getAcquisitionEligibility({ ...profile, acquisitionState: 'PUBLICLY_TRADED' }).allowedOfferTypes.length === 1, 'Public companies should expose minority investment only.');
const platformEligibility = getAcquisitionEligibility({ ...profile, id: 'NETFLIX', archetype: 'PLATFORM', acquisitionState: 'PUBLICLY_TRADED' });
assert(!platformEligibility.canApproach && platformEligibility.reason === 'STREAMING_PLATFORM_RESERVED', 'Streaming platforms should be reserved for the future streaming acquisition phase.');

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
    firstDiligence.player.x.feed.some((post: any) => !post.isPlayer && post.authorHandle && post.content.includes('serious homework')),
    'Diligence should create industry social chatter from an in-world account.',
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
    resolvedResponses.inbox
        .filter((message: any) => message.type === 'STUDIO_ACQUISITION')
        .every((message: any) => message.expiresIn === ACQUISITION_INBOX_NOTICE_WEEKS),
    'Acquisition inbox notices must expire instead of permanently reopening old deal states.',
);
assert(
    resolvedResponses.news.some((item: any) => item.headline.includes('board accepts')) &&
    resolvedResponses.news.some((item: any) => item.headline.includes('counters')) &&
    resolvedResponses.news.some((item: any) => item.headline.includes('rejects')),
    'Seller responses should create accepted, countered, and rejected news beats.',
);

const secondWeakOffer = submitOpeningOffer({
    player: resolvedResponses,
    profile: { ...profile, id: 'WEAK_TARGET', name: 'Weak Target' },
    offerType: 'CONSERVATIVE',
    offerAmount: 70_000_000,
    funding: { source: 'PERSONAL' },
});
assert(secondWeakOffer.success, 'The second offer should be available after an initial rejection.');
assert(getAcquisitionCase(secondWeakOffer.player, 'WEAK_TARGET')?.offer?.round === 2, 'The second offer should record round two.');
const secondWeakResolved = resolveStudioAcquisitionResponses(secondWeakOffer.player);
assert(getAcquisitionCase(secondWeakResolved, 'WEAK_TARGET')?.status === 'REJECTED', 'A second weak offer should receive a final chance to revise.');
assert(getAcquisitionOfferAttemptsRemaining(getAcquisitionCase(secondWeakResolved, 'WEAK_TARGET')) === 1, 'One offer should remain after the second rejection.');
const finalWeakOffer = submitOpeningOffer({
    player: secondWeakResolved,
    profile: { ...profile, id: 'WEAK_TARGET', name: 'Weak Target' },
    offerType: 'CONSERVATIVE',
    offerAmount: 70_000_000,
    funding: { source: 'PERSONAL' },
});
assert(finalWeakOffer.success, 'The final allowed offer should be submitable.');
const finalWeakResolved = resolveStudioAcquisitionResponses(finalWeakOffer.player);
const finalWeakCase = getAcquisitionCase(finalWeakResolved, 'WEAK_TARGET');
assert(finalWeakCase?.status === 'CLOSED', 'The third rejected offer should close negotiations instead of reopening the deal.');
assert(getAcquisitionOfferAttemptCount(finalWeakCase) === ACQUISITION_MAX_OFFER_ATTEMPTS, 'The closed case should preserve the three-offer history.');
assert(getAcquisitionReapproachWeeksRemaining(finalWeakCase, finalWeakResolved) === 8, 'A final rejection should start the full re-approach cooldown immediately.');
assert(
    getAcquisitionEligibility({ ...profile, id: 'WEAK_TARGET', acquisitionState: 'NOT_FOR_SALE' }, finalWeakCase, finalWeakResolved).reason === 'COOLDOWN_ACTIVE',
    'A closed final rejection must block reopening through old inbox messages.',
);
const reopenedAfterFinalRejection = {
    ...finalWeakResolved,
    currentWeek: ((finalWeakResolved.currentWeek + 8 - 1) % 52) + 1,
    age: finalWeakResolved.age + Math.floor((finalWeakResolved.currentWeek + 8 - 1) / 52),
};
assert(
    getAcquisitionEligibility({ ...profile, id: 'WEAK_TARGET', acquisitionState: 'NOT_FOR_SALE' }, finalWeakCase, reopenedAfterFinalRejection).canApproach,
    'The seller should return to the market after the final-rejection cooldown.',
);
const freshCycleOffer = submitOpeningOffer({
    player: reopenedAfterFinalRejection,
    profile: { ...profile, id: 'WEAK_TARGET', name: 'Weak Target', acquisitionState: 'NOT_FOR_SALE' },
    offerType: 'CONSERVATIVE',
    offerAmount: 70_000_000,
    funding: { source: 'PERSONAL' },
});
assert(freshCycleOffer.success, 'A cooled-off studio should accept a fresh opening offer.');
assert(getAcquisitionCase(freshCycleOffer.player, 'WEAK_TARGET')?.offer?.round === 1, 'A new negotiation cycle must restart at offer one of three.');
assert(
    resolvedResponses.x.feed.filter((post: any) => post.id?.startsWith('x_studio_acquisition_') && !post.isPlayer).length >= 6,
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
const walkedAwayCase = getAcquisitionCase(walkedAway.player, 'COUNTER_TARGET');
assert(
    getAcquisitionEligibility({ ...profile, id: 'COUNTER_TARGET', acquisitionState: 'NOT_FOR_SALE' }, walkedAwayCase, walkedAway.player).reason === 'COOLDOWN_ACTIVE',
    'A walked-away studio should show a temporary re-approach cooldown instead of a permanent market lock.',
);
const reopenedPlayer = {
    ...walkedAway.player,
    currentWeek: ((walkedAway.player.currentWeek + 8 - 1) % 52) + 1,
    age: walkedAway.player.age + Math.floor((walkedAway.player.currentWeek + 8 - 1) / 52),
};
assert(getAcquisitionReapproachWeeksRemaining(walkedAwayCase, reopenedPlayer) === 0, 'The cooldown should finish after eight in-game weeks.');
assert(
    getAcquisitionEligibility({ ...profile, id: 'COUNTER_TARGET', acquisitionState: 'NOT_FOR_SALE' }, walkedAwayCase, reopenedPlayer).canApproach,
    'A cooled-off studio should return to the acquisition market even if its older public snapshot says not for sale.',
);
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
assert(getAcquisitionCase(finalRoundResolved, 'RIVAL_TARGET')?.status === 'CLOSED', 'Final-round rival pressure should close the negotiation instead of looping forever.');

const staleRivalCase = {
    ...rivalCase!,
    status: 'RIVAL_BID' as const,
    offer: {
        ...rivalCase!.offer!,
        amount: 100_000_000,
        round: 4,
    },
    sellerResponse: {
        ...rivalCase!.sellerResponse!,
        decision: 'RIVAL_BID' as const,
        round: 4,
        maxRounds: 3,
    },
};
const staleRivalPlayer = {
    ...rivalResolved,
    flags: {
        ...rivalResolved.flags,
        studioAcquisitionCases: [staleRivalCase],
    },
};
const staleRivalResolved = resolveStudioAcquisitionResponses(staleRivalPlayer);
const repairedRivalCase = getAcquisitionCase(staleRivalResolved, 'RIVAL_TARGET');
assert(repairedRivalCase?.status === 'CLOSED', 'A saved Round 4 / 3 case must resolve into a closed cooldown instead of remaining in a rival-bid loop.');
assert(repairedRivalCase?.offer?.round === 3, 'Stale rival bidding should be normalized back to the maximum valid round.');

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
const signedDeal = completeAcquisitionTransaction({
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
    signedDeal.player.flags.acquisitionDebtLedger.some((entry: any) => (
        entry.studioId === 'SIGNING_TARGET' && entry.trackingOrigin === 'SIGNED'
    )),
    'New full acquisitions should write a signed debt ledger immediately.',
);
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

const publicProfile: any = {
    ...profile,
    id: 'PUBLIC_TARGET',
    name: 'Public Target Media',
    acquisitionState: 'PUBLICLY_TRADED',
    ownershipStructure: 'Public company · Institutional ownership',
};
const publicStock: any = {
    id: 'stk_public_target',
    symbol: 'PTM',
    name: 'Public Target Media',
    sector: 'MEDIA',
    price: 100,
    outstandingShares: 1_000_000,
    volatility: 0.12,
    dividendYield: 0.01,
    relatedStudioId: publicProfile.id,
    priceHistory: [100],
    lastDividendPayoutWeek: 0,
};
const publicOutstandingShares = getStockOutstandingShares(publicStock);
const publicBuyer: any = {
    ...player,
    money: 500_000_000,
    stocks: [publicStock],
    portfolio: [{
        stockId: publicStock.id,
        shares: Math.floor(publicOutstandingShares * 0.2),
        averageCost: 100,
        totalInvested: Math.floor(publicOutstandingShares * 0.2) * 100,
    }],
};
const publicOpening = submitOpeningOffer({
    player: publicBuyer,
    profile: publicProfile,
    offerType: 'MINORITY',
    offerAmount: 35_000_000,
    minorityPercent: 30,
    funding: { source: 'PERSONAL' },
});
assert(publicOpening.success, 'A credible public control tender should be fileable through the common acquisition service.');
const publicPositionBeforeTender = getCompanyPosition(publicOpening.player, publicProfile);
assert(
    publicPositionBeforeTender.stockCostBasis === Math.floor(publicOutstandingShares * 0.2) * 100,
    'The public-control ledger should retain the cash already committed to owned shares.',
);
assert(publicPositionBeforeTender.ownershipPercent === 20, 'The public-control ledger should count the existing stock stake before tendering.');
const filedPublicCase = getAcquisitionCase(publicOpening.player, publicProfile.id)!;
const acceptedPublicCase = {
    ...filedPublicCase,
    status: 'ACCEPTED' as const,
    sellerResponse: {
        decision: 'ACCEPTED' as const,
        agreedAmount: 35_000_000,
        round: 1,
        respondedWeek: player.currentWeek + 1,
        respondedYear: player.age,
        summary: 'The board accepted the public control tender.',
    },
};
const acceptedPublicBuyer = {
    ...publicOpening.player,
    flags: {
        ...publicOpening.player.flags,
        studioAcquisitionCases: [acceptedPublicCase],
    },
};
const publicSigned = completeAcquisitionTransaction({ player: acceptedPublicBuyer, profile: publicProfile });
assert(publicSigned.success, 'An accepted public tender should close through the shared final signature action.');
assert(
    publicSigned.player.flags.acquisitionDebtLedger.some((entry: any) => (
        entry.studioId === publicProfile.id && entry.trackingOrigin === 'SIGNED'
    )),
    'New acquisitions should create their debt ledger at signing, rather than waiting for a later save migration.',
);
assert(publicSigned.player.money === publicBuyer.money - 35_000_000, 'Public tender closing should charge the accepted tender price exactly once.');
const publicHoldingShares = publicSigned.player.portfolio.find((holding: any) => holding.stockId === publicStock.id)?.shares;
const expectedPublicShares = Math.max(
    Math.ceil(publicOutstandingShares * 0.5),
    Math.floor(publicOutstandingShares * 0.2) + Math.ceil(publicOutstandingShares * 0.3),
);
assert(publicHoldingShares === expectedPublicShares, `Existing shares should be credited and only the tender block added (${publicHoldingShares} vs ${expectedPublicShares}).`);
assert(
    (publicSigned.acquisitionCase?.closing?.assetSummary || '').includes('shares tendered'),
    'The closing record should describe the tendered shares instead of treating prior stock ownership as a new charge.',
);
assert(publicSigned.player.businesses.some((business: any) => business.id === publicProfile.id), 'A completed public tender should create the controlled studio business.');
assert(getAcquisitionCase(publicSigned.player, publicProfile.id)?.closing?.outcome === 'CONTROL', 'Public tender closing should record a control outcome.');

const majorityControlPlayer = {
    ...publicBuyer,
    portfolio: [{
        stockId: publicStock.id,
        shares: Math.ceil(publicOutstandingShares * 0.52),
        averageCost: publicStock.price,
        totalInvested: Math.ceil(publicOutstandingShares * 0.52) * publicStock.price,
    }],
};
const majorityControlSigned = completeAcquisitionTransaction({ player: majorityControlPlayer, profile: publicProfile });
assert(majorityControlSigned.success, 'A player who already controls a public studio should complete the stock-control transfer.');
assert(
    majorityControlSigned.player.flags.acquisitionDebtLedger.some((entry: any) => (
        entry.studioId === publicProfile.id && entry.trackingOrigin === 'SIGNED'
    )),
    'Direct stock-control transfers must create the same signed debt ledger as every other new acquisition.',
);

console.log('Studio acquisition audit passed.');
