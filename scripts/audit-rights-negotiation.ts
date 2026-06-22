import {
    acceptRightsTerms,
    advanceRightsNegotiations,
    developOwnedRight,
    getRightsOpportunityAction,
    getReservedRightsCapital,
    getRightsDealQuote,
    getOwnedRightRenewalQuote,
    renewOwnedRight,
    signRightsAgreement,
    startRightsNegotiation,
    submitRightsCounter,
    withdrawRightsNegotiation,
} from '../services/rightsNegotiation';
import { OwnedRightDevelopmentChoice, RightsNegotiation, RightsOpportunity } from '../types';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const baseOpportunity: RightsOpportunity = {
    id: 'rights_test_nova',
    title: 'Nova Wardens',
    archetype: 'DORMANT_HERO',
    propertyType: 'CHARACTER',
    primaryGenre: 'SUPERHERO',
    shortPitch: 'A dormant hero property.',
    availabilityReason: 'The previous option expired.',
    sellerName: 'Northstar Character Trust',
    askingPrice: 100_000_000,
    rarity: 'RARE',
    fanbase: 'HIGH',
    publicRisk: 'MEDIUM',
    visibleUpside: 'Universe starter',
    publicConcern: 'Fans guard the canon.',
    rivalInterest: 'HIGH',
    listedAtWeek: 10,
    expiresAtWeek: 20,
    marketStatus: 'AVAILABLE',
    isTracked: false,
    accent: '#6d5dfc',
    emblemKey: 'SHIELD',
    intelligenceSeed: 81173,
    investigationStatus: 'NONE',
};

const optionQuote = getRightsDealQuote(baseOpportunity, 'OPTION');
const licenseQuote = getRightsDealQuote(baseOpportunity, 'LICENSE');
const buyoutQuote = getRightsDealQuote(baseOpportunity, 'BUYOUT');
assert(optionQuote.available && optionQuote.suggestedOffer < licenseQuote.suggestedOffer, 'Option must cost less than a license.');
assert(licenseQuote.suggestedOffer < buyoutQuote.suggestedOffer, 'License must cost less than a buyout.');
assert(!getRightsDealQuote(baseOpportunity, 'CATALOG_PURCHASE').available, 'Catalog purchase must be restricted to catalog listings.');

const direct = startRightsNegotiation({
    opportunity: baseOpportunity,
    negotiations: [],
    dealType: 'BUYOUT',
    offerAmount: buyoutQuote.suggestedOffer,
    currentWeek: 12,
    studioBalance: 250_000_000,
    studioPrestige: 45,
});
assert(direct.changed && direct.negotiation, 'Available properties must be negotiable without an Inside Report.');
assert(direct.negotiation?.isInvestigated === false, 'Blind acquisition should retain its information disadvantage.');
assert(getReservedRightsCapital(direct.negotiations) === buyoutQuote.suggestedOffer, 'Active offers must reserve their full proposed capital.');
assert(
    getRightsOpportunityAction(direct.negotiations, baseOpportunity.id).label === 'Offer Submitted',
    'A submitted offer must replace the misleading Acquire action.',
);

const blocked = startRightsNegotiation({
    opportunity: { ...baseOpportunity, id: 'rights_test_second', title: 'Second Property' },
    negotiations: direct.negotiations,
    dealType: 'BUYOUT',
    offerAmount: 160_000_000,
    currentWeek: 12,
    studioBalance: 250_000_000,
    studioPrestige: 45,
});
assert(!blocked.changed && blocked.reason === 'INSUFFICIENT_AVAILABLE_CAPITAL', 'Reserved offers must prevent studio balance overcommitment.');

const investigated = startRightsNegotiation({
    opportunity: {
        ...baseOpportunity,
        id: 'rights_test_report',
        insideReport: {
            estimatedValueLow: 90_000_000,
            estimatedValueHigh: 130_000_000,
            audienceLoyalty: 'HIGH',
            commercialPotential: 'HIGH',
            ownershipRisk: 'MEDIUM',
            rivalActivity: 'HIGH',
            recommendedFormat: 'FRANCHISE_REBOOT',
            hiddenAdvantage: 'Merchandise recognition is stronger than advertised.',
            hiddenDanger: 'A supporting-character clause needs review.',
        },
        investigationStatus: 'REPORT_READY',
    },
    negotiations: [],
    dealType: 'BUYOUT',
    offerAmount: buyoutQuote.suggestedOffer,
    currentWeek: 12,
    studioBalance: 250_000_000,
    studioPrestige: 45,
});
assert(investigated.negotiation?.isInvestigated === true, 'Inside Reports must add leverage without becoming a gate.');

const deterministicA = advanceRightsNegotiations({
    negotiations: direct.negotiations,
    opportunities: [baseOpportunity],
    currentWeek: 13,
    studioPrestige: 45,
});
const deterministicB = advanceRightsNegotiations({
    negotiations: direct.negotiations,
    opportunities: [baseOpportunity],
    currentWeek: 13,
    studioPrestige: 45,
});
assert(
    JSON.stringify(deterministicA.negotiations) === JSON.stringify(deterministicB.negotiations),
    'Owner responses must be deterministic for the same save state.',
);
assert(deterministicA.newResponses.length === 1, 'Due offers must produce one owner response.');

const generous = startRightsNegotiation({
    opportunity: { ...baseOpportunity, id: 'rights_test_generous', rivalInterest: 'LOW' },
    negotiations: [],
    dealType: 'BUYOUT',
    offerAmount: 150_000_000,
    currentWeek: 12,
    studioBalance: 300_000_000,
    studioPrestige: 80,
});
const generousResponse = advanceRightsNegotiations({
    negotiations: generous.negotiations,
    opportunities: [{ ...baseOpportunity, id: 'rights_test_generous', rivalInterest: 'LOW' }],
    currentWeek: 13,
    studioPrestige: 80,
});
assert(
    ['ACCEPTED', 'CREATIVE_GUARANTEE', 'READY_TO_SIGN'].includes(generousResponse.negotiations[0].status),
    'A premium bid from a prestigious studio should reach signable terms.',
);

const awaitingTerms = {
    ...generousResponse.negotiations[0],
    status: 'COUNTEROFFER' as const,
    counterAmount: 125_000_000,
    currentOffer: 100_000_000,
    round: 1,
    agreedAmount: undefined,
};
const acceptedTerms = acceptRightsTerms([awaitingTerms], awaitingTerms.id);
assert(acceptedTerms.changed && acceptedTerms.negotiations[0].status === 'READY_TO_SIGN', 'A counteroffer can be accepted into contract review.');
assert(acceptedTerms.negotiations[0].agreedAmount === 125_000_000, 'Accepted counter amount must become the contract price.');
assert(
    getRightsOpportunityAction([{ ...awaitingTerms, status: 'ACCEPTED', agreedAmount: awaitingTerms.currentOffer }], awaitingTerms.opportunityId).label === 'Offer Accepted',
    'An accepted offer must have a visibly completed response state.',
);
assert(
    getRightsOpportunityAction(acceptedTerms.negotiations, awaitingTerms.opportunityId).label === 'Sign Contract',
    'A prepared agreement must direct the player to signing.',
);

let rounds: RightsNegotiation[] = [awaitingTerms];
for (let round = 2; round <= 3; round += 1) {
    const counter = submitRightsCounter({
        negotiations: rounds,
        negotiationId: awaitingTerms.id,
        amount: 125_000_000 + (round * 5_000_000),
        currentWeek: 13 + round,
        studioBalance: 300_000_000,
    });
    assert(counter.changed, `Round ${round} should be allowed.`);
    rounds = counter.negotiations.map(item => ({ ...item, status: 'COUNTEROFFER' as const }));
}
const fourthRound = submitRightsCounter({
    negotiations: rounds,
    negotiationId: awaitingTerms.id,
    amount: 155_000_000,
    currentWeek: 18,
    studioBalance: 300_000_000,
});
assert(!fourthRound.changed && fourthRound.reason === 'ROUND_LIMIT', 'Negotiations must stop after three submitted rounds.');

const readyToSign = acceptedTerms.negotiations[0];
const insufficientSigning = signRightsAgreement({
    negotiations: [readyToSign],
    negotiationId: readyToSign.id,
    opportunity: baseOpportunity,
    currentWeek: 14,
    studioBalance: 100_000_000,
    studioName: 'Test Studios',
});
assert(!insufficientSigning.changed && insufficientSigning.reason === 'INSUFFICIENT_FUNDS', 'Signing must recheck available cash.');

const signed = signRightsAgreement({
    negotiations: [readyToSign],
    negotiationId: readyToSign.id,
    opportunity: baseOpportunity,
    currentWeek: 14,
    studioBalance: 300_000_000,
    studioName: 'Test Studios',
});
assert(signed.changed && signed.ownedRight, 'Signing must create an owned-right record.');
assert(signed.balance === 175_000_000, 'The agreed amount must be deducted exactly once.');
assert(signed.ownedRight?.dealType === 'BUYOUT' && signed.ownedRight.expiresAtWeek === undefined, 'Permanent buyouts must not expire.');
assert(signed.negotiations[0].status === 'SIGNED', 'The signed negotiation must be terminal.');
assert(
    getRightsOpportunityAction(signed.negotiations, awaitingTerms.opportunityId).label === 'Acquired',
    'A signed deal must render as acquired instead of actionable.',
);

const duplicateSigning = signRightsAgreement({
    negotiations: signed.negotiations,
    negotiationId: readyToSign.id,
    opportunity: baseOpportunity,
    currentWeek: 14,
    studioBalance: signed.balance,
    studioName: 'Test Studios',
});
assert(!duplicateSigning.changed && duplicateSigning.reason === 'ALREADY_SIGNED', 'A signed contract must never charge twice.');

const development = developOwnedRight({
    ownedRight: {
        ...signed.ownedRight!,
        dealType: 'OPTION',
        expiresAtWeek: 120,
        projectsAllowed: 1,
        projectsUsed: 0,
    },
    currentWeek: 20,
});
assert(development.changed && development.script, 'An active owned right must create a concept in the existing script pipeline.');
assert(development.ownedRight?.projectsUsed === 1, 'Developing a right must consume one allowed project.');
assert(development.script?.sourceMaterial === 'ADAPTATION', 'Rights development must retain adaptation metadata.');

const movieChoice: OwnedRightDevelopmentChoice = { format: 'MOVIE', strategy: 'FRESH_ADAPTATION' };
const seriesChoice: OwnedRightDevelopmentChoice = { format: 'SERIES', strategy: 'FRESH_ADAPTATION' };
const rebootChoice: OwnedRightDevelopmentChoice = { format: 'MOVIE', strategy: 'REBOOT' };
const choiceTestRight = { ...signed.ownedRight!, id: 'owned_choice_test', projectsUsed: 0 };
const movieDevelopment = developOwnedRight({ ownedRight: choiceTestRight, currentWeek: 20, choice: movieChoice });
assert(movieDevelopment.script?.projectType === 'MOVIE', 'Movie choice must use the existing movie pipeline.');
const seriesDevelopment = developOwnedRight({ ownedRight: choiceTestRight, currentWeek: 20, choice: seriesChoice });
assert(seriesDevelopment.script?.projectType === 'SERIES', 'Series choice must use the existing series pipeline.');
const rebootDevelopment = developOwnedRight({ ownedRight: choiceTestRight, currentWeek: 20, choice: rebootChoice });
assert(rebootDevelopment.script?.connectedProjectIntent === 'REBOOT', 'Reboot choice must use existing reboot intent.');
assert(rebootDevelopment.script?.tags?.includes('REBOOT'), 'Reboot choice must remain visible to existing downstream rules.');
assert(
    rebootDevelopment.script?.tags?.includes(`OWNED_RIGHT:${choiceTestRight.id}`),
    'Developed scripts must retain a lightweight link to the existing ownership record.',
);
assert(
    !developOwnedRight({ ownedRight: development.ownedRight!, currentWeek: 21 }).changed,
    'A temporary right cannot exceed its project allowance.',
);
assert(
    developOwnedRight({
        ownedRight: { ...signed.ownedRight!, dealType: 'LICENSE', expiresAtWeek: 19, projectsAllowed: 2 },
        currentWeek: 20,
    }).reason === 'EXPIRED',
    'Expired temporary rights must not create new projects.',
);

const renewableRight = {
    ...signed.ownedRight!,
    id: 'renewable_license',
    ownershipSource: 'ACQUIRED' as const,
    dealType: 'LICENSE' as const,
    purchasePrice: 100_000_000,
    expiresAtWeek: 100,
    projectsAllowed: 2,
};
const renewalQuote = getOwnedRightRenewalQuote({ ownedRight: renewableRight, currentWeek: 80 });
assert(renewalQuote.available && renewalQuote.cost === 35_000_000, 'A licence inside its renewal window should quote 35% of acquisition cost.');
const renewed = renewOwnedRight({ ownedRight: renewableRight, currentWeek: 80, studioBalance: 80_000_000 });
assert(renewed.changed && renewed.ownedRight?.expiresAtWeek === 204, 'Renewal should add 104 weeks from the existing expiry.');
assert(renewed.balance === 45_000_000, 'Renewal should deduct its exact quoted cost once.');
assert(
    getOwnedRightRenewalQuote({ ownedRight: signed.ownedRight!, currentWeek: 80 }).reason === 'PERMANENT',
    'Permanent control must never show a renewal action.',
);
assert(
    renewOwnedRight({ ownedRight: renewableRight, currentWeek: 80, studioBalance: 10_000_000 }).reason === 'INSUFFICIENT_FUNDS',
    'Renewal must leave state unchanged when studio capital is insufficient.',
);

const withdrawn = withdrawRightsNegotiation(direct.negotiations, direct.negotiation!.id);
assert(withdrawn.changed && getReservedRightsCapital(withdrawn.negotiations) === 0, 'Walking away must release reserved capital.');

console.log('Rights negotiation audit passed.');
