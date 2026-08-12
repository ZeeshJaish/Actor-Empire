import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import {
    PRIVATE_EQUITY_DECLINE_COOLDOWN_WEEKS,
    PRIVATE_EQUITY_EXIT_LOCK_WEEKS,
    acceptPrivateEquityExit,
    getPrivateEquityPosition,
    normalizeCompanyEquityPositions,
    processPrivateEquityWeek,
    requestPrivateEquityExit,
} from '../services/privateEquityLogic';

const atAbsoluteWeek = (player: Player, absoluteWeek: number): Player => ({
    ...player,
    age: Math.floor(Math.max(0, absoluteWeek) / 52) + 1,
    currentWeek: (Math.max(0, absoluteWeek) % 52) + 1,
});

const createPlayer = (): Player => {
    const player = structuredClone(INITIAL_PLAYER);
    player.age = 32;
    player.currentWeek = 20;
    player.money = 2_000_000_000;
    player.flags = {
        ...player.flags,
        companyEquityPositions: [{
            studioId: 'PRIVATE_TEST',
            percent: 15,
            investedAmount: 150_000_000,
            acquiredYear: 30,
            acquiredWeek: 1,
        }],
        studioAcquisitionCases: [{
            studioId: 'PRIVATE_TEST',
            studioName: 'Northstar Pictures',
            acquisitionState: 'OPEN_TO_OFFERS',
            publicValuation: 1_000_000_000,
            approachedWeek: 1,
            approachedYear: 30,
            status: 'ACQUIRED',
            closing: {
                finalPrice: 150_000_000,
                signedWeek: 1,
                signedYear: 30,
                funding: { source: 'PERSONAL' },
                verifiedDebt: 0,
                hiddenLiabilities: 0,
                expectedAnnualIncome: 12_000_000,
                assetSummary: '15% strategic equity position',
                outcome: 'MINORITY_STAKE',
            },
        }],
    };
    return player;
};

const legacyPlayer = createPlayer();
const normalized = normalizeCompanyEquityPositions(legacyPlayer);
assert.equal(normalized.length, 1, 'A legacy private stake should survive normalization.');
assert.equal(normalized[0].studioName, 'Northstar Pictures', 'Migration should recover the studio name from the acquisition file.');
assert(normalized[0].currentCompanyValuation! > 0, 'Migration should establish a deterministic current company valuation.');
assert.equal(
    normalized[0].nextExitEligibleAbsoluteWeek,
    getAbsoluteWeek(30, 1) + PRIVATE_EQUITY_EXIT_LOCK_WEEKS,
    'Old holdings should preserve their original acquisition clock for exit eligibility.',
);

const normalizedPlayer: Player = {
    ...legacyPlayer,
    flags: {
        ...legacyPlayer.flags,
        companyEquityPositions: normalized,
    },
};
const cashBeforeSearch = normalizedPlayer.money;
const customExit = requestPrivateEquityExit({
    player: normalizedPlayer,
    studioId: 'PRIVATE_TEST',
    percentForSale: 4.2,
});
assert(customExit.success, 'A mature private position should allow a custom buyer search.');
assert.equal(customExit.player.money, cashBeforeSearch, 'Starting a buyer search must never credit cash before a sale closes.');
assert.equal(customExit.position?.exit?.status, 'MARKETING', 'A requested exit should enter the marketing stage.');
assert.equal(customExit.position?.exit?.percentForSale, 4.2, 'Custom exits should market the exact requested percentage of the holding.');

const offerReadyWeek = customExit.position!.exit!.offerReadyAbsoluteWeek;
const buyerWeekPlayer = atAbsoluteWeek(customExit.player, offerReadyWeek);
const buyerUpdate = processPrivateEquityWeek(buyerWeekPlayer);
const offeredPosition = getPrivateEquityPosition(buyerUpdate.player, 'PRIVATE_TEST');
assert.equal(offeredPosition?.exit?.status, 'OFFER_READY', 'Weekly progression should turn a mature buyer search into a reviewable offer.');
assert((offeredPosition?.exit?.netProceeds || 0) > 0, 'A valid buyer offer should have positive net proceeds.');
assert(
    (offeredPosition?.exit?.liquidityDiscountRate || 0) >= 0.08
    && (offeredPosition?.exit?.liquidityDiscountRate || 0) <= 0.22,
    'Private buyer discount should remain inside the promised 8-22% range.',
);

const moneyBeforeSale = buyerUpdate.player.money;
const partialSale = acceptPrivateEquityExit({
    player: buyerUpdate.player,
    studioId: 'PRIVATE_TEST',
});
assert(partialSale.success, 'A live private buyer offer should be closable.');
assert.equal(partialSale.position?.percent, 10.8, 'A custom sale should retain the exact unsold percentage.');
assert.equal(partialSale.position?.investedAmount, 108_000_000, 'Custom exits should reduce cost basis proportionally.');
assert.equal(
    partialSale.player.money,
    moneyBeforeSale + (offeredPosition?.exit?.netProceeds || 0),
    'Only the accepted net proceeds should reach player cash.',
);
assert.equal(
    partialSale.player.finance.history[0]?.category,
    'ASSET',
    'Private stake sales should be recorded as an asset transaction.',
);

const duplicateAccept = acceptPrivateEquityExit({
    player: partialSale.player,
    studioId: 'PRIVATE_TEST',
});
assert(!duplicateAccept.success, 'The same buyer offer must not be accepted twice.');
assert.equal(duplicateAccept.player.money, partialSale.player.money, 'A duplicate acceptance must not duplicate cash.');

const cooldownWeek = (partialSale.position?.nextExitEligibleAbsoluteWeek || 0);
assert(
    cooldownWeek >= offerReadyWeek + PRIVATE_EQUITY_DECLINE_COOLDOWN_WEEKS,
    'A completed partial exit should impose a cooldown before another buyer search.',
);

const fullSearchBase = atAbsoluteWeek(partialSale.player, cooldownWeek);
const fullExitSearch = requestPrivateEquityExit({
    player: fullSearchBase,
    studioId: 'PRIVATE_TEST',
    portion: 'ALL',
});
assert(fullExitSearch.success, 'A remaining partial position should support a later full exit.');
const fullOfferWeek = fullExitSearch.position!.exit!.offerReadyAbsoluteWeek;
const fullOfferUpdate = processPrivateEquityWeek(atAbsoluteWeek(fullExitSearch.player, fullOfferWeek));
const moneyBeforeFullExit = fullOfferUpdate.player.money;
const fullOfferPosition = getPrivateEquityPosition(fullOfferUpdate.player, 'PRIVATE_TEST');
const fullExit = acceptPrivateEquityExit({
    player: fullOfferUpdate.player,
    studioId: 'PRIVATE_TEST',
});
assert(fullExit.success, 'A full private-equity exit should close successfully.');
assert(!getPrivateEquityPosition(fullExit.player, 'PRIVATE_TEST'), 'A full exit should remove the sold position.');
assert(
    fullExit.player.money === moneyBeforeFullExit + (fullOfferPosition?.exit?.netProceeds || 0),
    'A full exit should credit exactly one net buyer payment.',
);
const resetCase = fullExit.player.flags.studioAcquisitionCases.find((entry: any) => entry.studioId === 'PRIVATE_TEST');
assert(
    resetCase?.status === 'CLOSED' && !resetCase?.offer && !resetCase?.closing,
    'A full exit should reset the old acquisition file without leaving stale ownership terms.',
);

let reviewPlayer = atAbsoluteWeek(partialSale.player, cooldownWeek);
let sawDistribution = false;
let sawRetainedOrLoss = false;
for (let quarter = 0; quarter < 32; quarter += 1) {
    reviewPlayer = atAbsoluteWeek(reviewPlayer, getAbsoluteWeek(reviewPlayer.age, reviewPlayer.currentWeek) + 13);
    const update = processPrivateEquityWeek(reviewPlayer);
    sawDistribution ||= update.events.some(event => event.type === 'DISTRIBUTION' && (event.amount || 0) > 0);
    sawRetainedOrLoss ||= update.events.some(event => event.type === 'VALUE_REVIEW');
    reviewPlayer = update.player;
}
assert(sawDistribution, 'Profitable private holdings should sometimes produce shareholder distributions.');
assert(sawRetainedOrLoss, 'Private holdings should also have quarters where the board retains earnings or cannot distribute.');

const expiryBase = atAbsoluteWeek(normalizedPlayer, getAbsoluteWeek(33, 1));
const expirySearch = requestPrivateEquityExit({
    player: expiryBase,
    studioId: 'PRIVATE_TEST',
    portion: 'ALL',
});
const expiryOfferUpdate = processPrivateEquityWeek(atAbsoluteWeek(expirySearch.player, expirySearch.position!.exit!.offerReadyAbsoluteWeek));
const expiryOffer = getPrivateEquityPosition(expiryOfferUpdate.player, 'PRIVATE_TEST')!.exit!;
const expiredUpdate = processPrivateEquityWeek(atAbsoluteWeek(
    expiryOfferUpdate.player,
    (expiryOffer.offerExpiresAbsoluteWeek || 0) + 1,
));
const expiredPosition = getPrivateEquityPosition(expiredUpdate.player, 'PRIVATE_TEST');
assert(!expiredPosition?.exit, 'Expired private buyer offers should clear automatically.');
assert(
    expiredUpdate.events.some(event => event.type === 'EXIT_OFFER_EXPIRED'),
    'An expired buyer offer should produce understandable player feedback.',
);

const freshPlayer = createPlayer();
freshPlayer.age = 30;
freshPlayer.currentWeek = 10;
freshPlayer.flags.companyEquityPositions[0].acquiredYear = 30;
freshPlayer.flags.companyEquityPositions[0].acquiredWeek = 1;
const lockedExit = requestPrivateEquityExit({
    player: freshPlayer,
    studioId: 'PRIVATE_TEST',
    portion: 'ALL',
});
assert(!lockedExit.success && lockedExit.reason === 'EXIT_LOCKED', 'New stakes should respect the 26-week private-market lock.');

const invalidCustomExit = requestPrivateEquityExit({
    player: normalizedPlayer,
    studioId: 'PRIVATE_TEST',
    percentForSale: 15.1,
});
assert(!invalidCustomExit.success && invalidCustomExit.reason === 'INVALID_POSITION', 'A private sale cannot market more than the player owns.');

const multiStudioPlayer = createPlayer();
multiStudioPlayer.flags.companyEquityPositions.push({
    studioId: 'SECOND_PRIVATE_TEST',
    studioName: 'Westwind Animation',
    percent: 9,
    investedAmount: 72_000_000,
    acquiredYear: 29,
    acquiredWeek: 12,
});
const normalizedMultiStudioPlayer: Player = {
    ...multiStudioPlayer,
    flags: {
        ...multiStudioPlayer.flags,
        companyEquityPositions: normalizeCompanyEquityPositions(multiStudioPlayer),
    },
};
assert.equal(normalizedMultiStudioPlayer.flags.companyEquityPositions.length, 2, 'Two private studio holdings should remain separate after migration.');
const untouchedSecondPosition = getPrivateEquityPosition(normalizedMultiStudioPlayer, 'SECOND_PRIVATE_TEST');
const targetedMultiStudioExit = requestPrivateEquityExit({
    player: normalizedMultiStudioPlayer,
    studioId: 'PRIVATE_TEST',
    percentForSale: 3,
});
assert(targetedMultiStudioExit.success, 'A player with multiple holdings should be able to market one chosen position.');
assert.deepEqual(
    getPrivateEquityPosition(targetedMultiStudioExit.player, 'SECOND_PRIVATE_TEST'),
    untouchedSecondPosition,
    'Selling one private holding must not alter another studio position.',
);
const multiStudioReview = processPrivateEquityWeek(atAbsoluteWeek(
    normalizedMultiStudioPlayer,
    getAbsoluteWeek(normalizedMultiStudioPlayer.age, normalizedMultiStudioPlayer.currentWeek) + 13,
));
assert.equal(
    normalizeCompanyEquityPositions(multiStudioReview.player).length,
    2,
    'Quarterly processing should preserve every separate private studio holding.',
);

console.log('Private equity lifecycle audit passed (32 checks).');
