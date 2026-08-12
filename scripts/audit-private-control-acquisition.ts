import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import {
    beginPrivateControlAcquisition,
    completeAcquisitionTransaction,
    getAcquisitionCase,
    getAcquisitionEligibility,
    getOfferPresets,
    submitOpeningOffer,
    type AcquisitionCase,
} from '../services/studioAcquisition';
import { getCompanyEquityPositions } from '../services/companyPosition';

const profile: any = {
    id: 'PRIVATE_CONTROL_TEST',
    name: 'Northstar Pictures',
    isPlayerOwned: false,
    acquisitionState: 'OPEN_TO_OFFERS',
    valuation: 1_000_000_000,
    capital: 180_000_000,
    debt: 60_000_000,
    profitability: 42_000_000,
    reputation: 78,
    hits: 8,
    flops: 3,
    rightsCount: 14,
    franchiseCount: 2,
    universeCount: 1,
    facilities: ['Main Lot', 'Soundstage'],
    keyTalent: [{ name: 'Ava Star', role: 'Lead Talent' }],
    ownershipStructure: 'Privately held · Strategic ownership group',
    archetype: 'PRESTIGE',
    catalog: [],
};

const createPlayer = (): Player => {
    const player = structuredClone(INITIAL_PLAYER);
    player.age = 34;
    player.currentWeek = 18;
    player.money = 2_000_000_000;
    player.flags = {
        ...player.flags,
        companyEquityPositions: [{
            studioId: profile.id,
            studioName: profile.name,
            percent: 20,
            investedAmount: 150_000_000,
            acquiredYear: 31,
            acquiredWeek: 1,
            entryCompanyValuation: 750_000_000,
            currentCompanyValuation: profile.valuation,
            lifetimeDistributions: 18_000_000,
        }],
        studioAcquisitionCases: [{
            studioId: profile.id,
            studioName: profile.name,
            acquisitionState: profile.acquisitionState,
            publicValuation: profile.valuation,
            approachedWeek: 1,
            approachedYear: 31,
            status: 'ACQUIRED',
            closing: {
                finalPrice: 150_000_000,
                signedWeek: 1,
                signedYear: 31,
                funding: { source: 'PERSONAL' },
                verifiedDebt: 0,
                hiddenLiabilities: 0,
                expectedAnnualIncome: 42_000_000,
                assetSummary: '20% private equity position',
                outcome: 'MINORITY_STAKE',
            },
        }],
    };
    return player;
};

const player = createPlayer();
const moneyBeforeRoute = player.money;
const started = beginPrivateControlAcquisition({ player, profile });
assert(started.success, 'A private minority shareholder should be able to open a full-control route.');
assert.equal(started.player.money, moneyBeforeRoute, 'Opening the control route must not charge or refund cash.');
assert.equal(started.acquisitionCase?.status, 'DRAFT', 'The conversion route should start a fresh acquisition file.');
assert.equal(started.acquisitionCase?.controlConversion?.existingPercent, 20, 'The old 20% position should be credited.');
assert.equal(started.acquisitionCase?.controlConversion?.remainingPercent, 80, 'Only the remaining 80% should be negotiated.');
assert(!started.acquisitionCase?.offer && !started.acquisitionCase?.closing, 'Old minority closing terms must not leak into the new control file.');

const eligibility = getAcquisitionEligibility(profile, started.acquisitionCase, started.player);
assert.deepEqual(
    eligibility.allowedOfferTypes,
    ['CONSERVATIVE', 'FAIR', 'AGGRESSIVE'],
    'A stake-to-control route must never offer another minority purchase.',
);

const presets = getOfferPresets({ profile, acquisitionCase: started.acquisitionCase });
assert.equal(presets.FAIR.amount, 800_000_000, 'The fair offer must price only the remaining 80% block.');
assert.equal(presets.CONSERVATIVE.amount, 704_000_000, 'The conservative preset should scale from the remaining block.');
assert.equal(presets.AGGRESSIVE.amount, 920_000_000, 'The aggressive preset should scale from the remaining block.');

const submitted = submitOpeningOffer({
    player: started.player,
    profile,
    offerType: 'FAIR',
    offerAmount: presets.FAIR.amount,
    funding: { source: 'PERSONAL' },
});
assert(submitted.success, 'A credible remaining-block proposal should enter negotiation.');
assert.equal(submitted.acquisitionCase?.offer?.amount, 800_000_000, 'The filed offer should preserve the remaining-block amount.');

const submittedCase = getAcquisitionCase(submitted.player, profile.id)!;
const acceptedCase: AcquisitionCase = {
    ...submittedCase,
    status: 'ACCEPTED',
    sellerResponse: {
        decision: 'ACCEPTED',
        respondedWeek: submitted.player.currentWeek,
        respondedYear: submitted.player.age,
        agreedAmount: 800_000_000,
        round: 1,
        maxRounds: 3,
        summary: 'The board accepted the proposal for the remaining ownership block.',
    },
};
const acceptedPlayer: Player = {
    ...submitted.player,
    flags: {
        ...submitted.player.flags,
        studioAcquisitionCases: [
            ...(submitted.player.flags.studioAcquisitionCases || []).filter((entry: AcquisitionCase) => entry.studioId !== profile.id),
            acceptedCase,
        ],
    },
};

const cashBeforeClosing = acceptedPlayer.money;
const completed = completeAcquisitionTransaction({ player: acceptedPlayer, profile });
assert(completed.success, 'An accepted stake-to-control agreement should close as a full acquisition.');
assert.equal(completed.player.money, cashBeforeClosing - 800_000_000, 'Closing should charge exactly the accepted remaining-share price.');
assert.equal(getCompanyEquityPositions(completed.player).filter(position => position.studioId === profile.id).length, 0, 'The old private position must merge into the acquired studio.');
assert.equal(completed.player.businesses.filter(business => business.id === profile.id).length, 1, 'Closing must create exactly one owned studio.');
assert.equal(getAcquisitionCase(completed.player, profile.id)?.closing?.outcome, 'FULL_BUYOUT', 'The completed file should record full ownership.');
assert.equal(
    completed.player.flags.privateEquityConversionHistory?.[0]?.totalCashBasis,
    950_000_000,
    'The audit ledger should retain both the historical stake cost and new closing price.',
);

const duplicateCash = completed.player.money;
const duplicate = completeAcquisitionTransaction({ player: completed.player, profile: { ...profile, isPlayerOwned: true } });
assert(!duplicate.success, 'The same conversion cannot close twice.');
assert.equal(duplicate.player.money, duplicateCash, 'A duplicate close must never deduct money again.');

const exitPlayer = createPlayer();
exitPlayer.flags.companyEquityPositions[0].exit = {
    status: 'MARKETING',
    percentForSale: 10,
    requestedAbsoluteWeek: 1,
    offerReadyAbsoluteWeek: 3,
};
const exitBlocked = beginPrivateControlAcquisition({ player: exitPlayer, profile });
assert(!exitBlocked.success && exitBlocked.reason === 'EXIT_ACTIVE', 'A buyer search and takeover route cannot run at the same time.');

const publicBlocked = beginPrivateControlAcquisition({
    player: createPlayer(),
    profile: { ...profile, acquisitionState: 'PUBLICLY_TRADED' },
});
assert(!publicBlocked.success && publicBlocked.reason === 'PUBLIC_COMPANY', 'Public companies must remain on the stock-control route.');

const notForSaleBlocked = beginPrivateControlAcquisition({
    player: createPlayer(),
    profile: { ...profile, acquisitionState: 'NOT_FOR_SALE' },
});
assert(!notForSaleBlocked.success && notForSaleBlocked.reason === 'NOT_FOR_SALE', 'A private stake must not bypass a studio that is not for sale.');
assert.equal(notForSaleBlocked.player.money, createPlayer().money, 'A blocked not-for-sale control route must not move cash.');

console.log('Private stake-to-control audit passed (26 checks).');
