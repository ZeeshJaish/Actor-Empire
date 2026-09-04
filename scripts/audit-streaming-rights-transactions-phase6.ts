import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER } from '../types';
import {
    normalizeStreamingRightsContractRegistry,
} from '../services/streamingRightsCore';
import {
    getStreamingRightsTransferChain,
    normalizeStreamingRightsTransactionRegistry,
    settleStreamingRightsSublicense,
    settleStreamingRightsTransfer,
    settleStreamingRightsTransferBatch,
} from '../services/streamingRightsTransactions';
import { normalizeWorldPlatformAi } from '../services/platformAi/platformAiState';
import { createPlatformAiFixture } from './helpers/platformAiFixture';
import {
    getStreamingRightsOpportunities,
    openStreamingRightsNegotiation,
    signStreamingRightsDeal,
} from '../services/streamingRightsMarketplace';
import { processPlatformAiRightsResaleWeek } from '../services/platformAi/platformAiRightsResale';
import StreamingRightsExchange from '../components/StreamingRightsExchange';
import StreamingRightsCalendar from '../components/StreamingRightsCalendar';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { migratePlayerSave } from '../services/saveMigration';

assert.deepEqual(
    INITIAL_PLAYER.world.streamingRightsTransactions,
    {},
    'New games must start with an explicit empty A6 transaction registry.',
);

const legacyContract = normalizeStreamingRightsContractRegistry({
    'legacy-japan-window': {
        id: 'legacy-japan-window',
        idempotencyKey: 'legacy-japan-window',
        sourceProjectId: 'empire-drama-1',
        titleAtSigning: 'Neon Monsoon',
        projectType: 'MOVIE',
        genre: 'DRAMA',
        licensorName: 'Empire Studios',
        territory: 'MULTI_REGION',
        countryIds: ['JP'],
        durationWeeks: 100,
        exclusivity: 'EXCLUSIVE',
        minimumGuarantee: 100_000_000,
        platformRevenueShare: 70,
        licensorRevenueShare: 30,
        signedAtAbsoluteWeek: 40,
        startsAtAbsoluteWeek: 40,
        expiresAtAbsoluteWeek: 140,
        status: 'ACTIVE',
        origin: 'STUDIO_MARKET',
        sellerType: 'STUDIO',
        sellerPlatformId: null,
        windowType: 'FIRST_WINDOW',
        permanentPurchase: false,
        seller: { type: 'PLAYER_STUDIO', id: 'empire-studios', name: 'Empire Studios', platformId: null },
        buyer: { type: 'AI_PLATFORM', id: 'HULU', name: 'Hulu', platformId: 'HULU' },
        dealStructure: 'GUARANTEE_REVENUE_SHARE',
        productionFunding: 0,
        futureSeasonFunding: 0,
        localization: 'DUBS_AND_SUBTITLES',
        localizationRequirements: [],
        backendBasis: 'ADJUSTED_GROSS_RECEIPTS',
        guaranteeRecoupment: 'NON_RECOUPABLE',
        backendCap: null,
        cumulativeRoyaltyAccrued: 4_000_000,
        cumulativeRoyaltyPaid: 3_000_000,
        settlement: { guarantee: 'PAID', paymentKey: 'guarantee:legacy-japan-window', settledAtAbsoluteWeek: 40 },
    },
})['legacy-japan-window'];

assert.equal(legacyContract.rootContractId, legacyContract.id, 'A legacy contract must self-root.');
assert.equal(legacyContract.parentContractId, null, 'Migration must not invent a parent contract.');
assert.equal(legacyContract.rightsTransactionId, null, 'Migration must not invent transaction history.');

assert.deepEqual(
    normalizeStreamingRightsTransactionRegistry({ broken: null }),
    {},
    'Malformed transactions must not enter canonical history.',
);

const validRegistry = normalizeStreamingRightsTransactionRegistry({
    'transfer-jp-80': {
        schemaVersion: 1,
        id: 'transfer-jp-80',
        idempotencyKey: 'transfer-jp-80',
        kind: 'LICENSE_TRANSFER',
        status: 'SETTLED',
        originalOwner: { type: 'PLAYER_STUDIO', id: 'empire-studios', name: 'Empire Studios', platformId: null },
        seller: { type: 'AI_PLATFORM', id: 'HULU', name: 'Hulu', platformId: 'HULU' },
        buyer: { type: 'AI_PLATFORM', id: 'NETFLIX', name: 'Netflix', platformId: 'NETFLIX' },
        sourceContractId: 'legacy-japan-window',
        rootContractId: 'legacy-japan-window',
        successorContractId: 'netflix-japan-window',
        sourceProjectId: 'empire-drama-1',
        title: 'Neon Monsoon',
        territory: 'MULTI_REGION',
        countryIds: ['JP', 'JP'],
        exclusivity: 'EXCLUSIVE',
        windowType: 'FIRST_WINDOW',
        startsAtAbsoluteWeek: 40,
        expiresAtAbsoluteWeek: 140,
        askingPrice: 60_000_000,
        acceptedPrice: 55_000_000,
        sellerReceipt: 55_000_000,
        originalOwnerParticipation: 0,
        controllerAtCommitment: { seller: 'AI', buyer: 'AI' },
        groupId: null,
        listedAtAbsoluteWeek: 78,
        committedAtAbsoluteWeek: 80,
        settledAtAbsoluteWeek: 80,
        resolvedAtAbsoluteWeek: 80,
        resolutionReason: null,
    },
});

assert.deepEqual(validRegistry['transfer-jp-80'].countryIds, ['JP']);
assert.equal(validRegistry['transfer-jp-80'].originalOwnerParticipation, 0);
assert.equal(validRegistry['transfer-jp-80'].sellerReceipt, 55_000_000);

const sublicenseFixture = createPlatformAiFixture();
sublicenseFixture.age = 2;
sublicenseFixture.currentWeek = 29;
sublicenseFixture.world = normalizeWorldPlatformAi(sublicenseFixture, sublicenseFixture.world, 80);
sublicenseFixture.world.streamingRightsContracts = {
    [legacyContract.id]: { ...legacyContract, sublicensingAllowed: true },
};
sublicenseFixture.world.platforms!.HULU.ai!.rightsContracts = [{ ...legacyContract, sublicensingAllowed: true }];
const sublicensed = settleStreamingRightsSublicense(sublicenseFixture, {
    sourceContractId: legacyContract.id,
    seller: legacyContract.buyer,
    buyer: { type: 'AI_PLATFORM', id: 'NETFLIX', name: 'Netflix', platformId: 'NETFLIX' },
    territory: 'MULTI_REGION',
    countryIds: ['JP'],
    windowType: 'FIRST_WINDOW',
    exclusivity: 'NON_EXCLUSIVE',
    durationWeeks: 20,
    price: 10_000_000,
    buyerRevenueShare: 80,
    absoluteWeek: 80,
    idempotencyKey: 'a6-sublicense-chain-check',
    controllerAtCommitment: { seller: 'AI', buyer: 'AI' },
});
assert.equal(sublicensed.changed, true);
const parentChainAfterSublicense = getStreamingRightsTransferChain(sublicensed.player.world, legacyContract.id);
assert.equal(parentChainAfterSublicense.currentContractId, legacyContract.id, 'A sublicense must not replace the parent licence holder.');
assert.deepEqual(parentChainAfterSublicense.holders.map(holder => holder.name), ['Empire Studios', 'Hulu']);

const transferFixture = createPlatformAiFixture();
transferFixture.age = 2;
transferFixture.currentWeek = 29;
transferFixture.world = normalizeWorldPlatformAi(transferFixture, transferFixture.world, 80);
transferFixture.world.streamingRightsContracts = { [legacyContract.id]: legacyContract };
transferFixture.world.platforms!.HULU.ai!.rightsContracts = [{ ...legacyContract }];
const huluCashBefore = transferFixture.world.platforms!.HULU.cashReserve;
const netflixCashBefore = transferFixture.world.platforms!.NETFLIX.cashReserve;
const studioCashBefore = transferFixture.money;

const settled = settleStreamingRightsTransfer(transferFixture, {
    sourceContractId: legacyContract.id,
    seller: legacyContract.buyer,
    buyer: { type: 'AI_PLATFORM', id: 'NETFLIX', name: 'Netflix', platformId: 'NETFLIX' },
    askingPrice: 60_000_000,
    price: 55_000_000,
    absoluteWeek: 80,
    idempotencyKey: 'a6-transfer:legacy-japan-window:hulu:netflix:80',
    controllerAtCommitment: { seller: 'AI', buyer: 'AI' },
});

assert.equal(settled.changed, true, 'A valid exact-scope platform transfer must settle.');
if ('reason' in settled) throw new Error('detail' in settled ? String(settled.detail) : 'Transfer failed.');
assert.equal(settled.successorContract.expiresAtAbsoluteWeek, 140, 'A transfer must not reset expiry.');
assert.equal(settled.successorContract.startsAtAbsoluteWeek, 40, 'The inherited contract keeps its original window start.');
assert.deepEqual(settled.successorContract.countryIds, ['JP'], 'The buyer must inherit the exact Japan scope.');
assert.equal(settled.successorContract.exclusivity, 'EXCLUSIVE');
assert.equal(settled.successorContract.cumulativeRoyaltyAccrued, 4_000_000);
assert.equal(settled.successorContract.cumulativeRoyaltyPaid, 3_000_000);
assert.deepEqual(settled.successorContract.seller, legacyContract.seller, 'The original studio remains the backend counterparty.');
assert.equal(settled.player.world.streamingRightsContracts![legacyContract.id].status, 'TRANSFERRED_OUT');
assert.equal(settled.player.world.streamingRightsContracts![legacyContract.id].transferredToContractId, settled.successorContract.id);
assert.equal(settled.transaction.originalOwner.name, 'Empire Studios');
assert.equal(settled.transaction.seller.name, 'Hulu');
assert.equal(settled.transaction.sellerReceipt, 55_000_000);
assert.equal(settled.transaction.originalOwnerParticipation, 0);
assert.equal(settled.player.world.platforms!.HULU.cashReserve, huluCashBefore + 55);
assert.equal(settled.player.world.platforms!.NETFLIX.cashReserve, netflixCashBefore - 55);
assert.equal(settled.player.money, studioCashBefore, 'The original studio must receive no downstream transfer payment.');
assert.equal(
    Object.values(settled.player.world.streamingRightsContracts!).filter(contract => (
        contract.sourceProjectId === legacyContract.sourceProjectId && contract.status === 'ACTIVE'
    )).length,
    1,
    'The exact rights lot must have one active current holder.',
);
assert.deepEqual(
    getStreamingRightsTransferChain(settled.player.world, settled.successorContract.id).holders.map(holder => holder.name),
    ['Empire Studios', 'Hulu', 'Netflix'],
);

const obligationFixture = structuredClone(transferFixture);
obligationFixture.ownedStreamingPlatform.lifecycle = 'ACTIVE';
obligationFixture.ownedStreamingPlatform.treasuryCash = 100_000_000;
obligationFixture.world.streamingRightsContracts![legacyContract.id] = {
    ...legacyContract,
    marketingGuarantee: 5_000_000,
    viewershipBonusThreshold: 1_000_000,
    viewershipBonusAmount: 2_000_000,
    cancellationPenalty: 3_000_000,
};
obligationFixture.world.platforms!.HULU.ai!.rightsContracts = [{
    ...legacyContract,
    marketingGuarantee: 5_000_000,
    viewershipBonusThreshold: 1_000_000,
    viewershipBonusAmount: 2_000_000,
    cancellationPenalty: 3_000_000,
}];
const obligationTransfer = settleStreamingRightsTransfer(obligationFixture, {
    sourceContractId: legacyContract.id,
    seller: legacyContract.buyer,
    buyer: { type: 'PLAYER_PLATFORM', id: obligationFixture.id, name: 'EMPIRE+', platformId: null },
    askingPrice: 20_000_000,
    price: 20_000_000,
    absoluteWeek: 80,
    idempotencyKey: 'a6-transfer-with-obligations',
    controllerAtCommitment: { seller: 'AI', buyer: 'PLAYER' },
});
assert.equal(obligationTransfer.changed, true);
assert.equal(obligationTransfer.player.ownedStreamingPlatform.rightsObligations.length, 2, 'The player buyer must inherit actionable contract obligations.');
assert.deepEqual(
    obligationTransfer.player.ownedStreamingPlatform.rightsObligations.map(obligation => obligation.type).sort(),
    ['MARKETING_SPEND', 'VIEWERSHIP_THRESHOLD'],
);

const replay = settleStreamingRightsTransfer(settled.player, {
    sourceContractId: legacyContract.id,
    seller: legacyContract.buyer,
    buyer: { type: 'AI_PLATFORM', id: 'NETFLIX', name: 'Netflix', platformId: 'NETFLIX' },
    askingPrice: 60_000_000,
    price: 55_000_000,
    absoluteWeek: 80,
    idempotencyKey: 'a6-transfer:legacy-japan-window:hulu:netflix:80',
    controllerAtCommitment: { seller: 'AI', buyer: 'AI' },
});
assert.equal(replay.changed, false);
assert.equal(replay.reason, 'ALREADY_SETTLED');
assert.deepEqual(replay.player, settled.player, 'Replaying a settled key must not move money or rights twice.');

const attemptTransfer = (
    fixture: typeof transferFixture,
    overrides: Partial<Parameters<typeof settleStreamingRightsTransfer>[1]> = {},
) => settleStreamingRightsTransfer(fixture, {
    sourceContractId: legacyContract.id,
    seller: legacyContract.buyer,
    buyer: { type: 'AI_PLATFORM', id: 'NETFLIX', name: 'Netflix', platformId: 'NETFLIX' },
    askingPrice: 60_000_000,
    price: 55_000_000,
    absoluteWeek: 80,
    idempotencyKey: `a6-negative:${Object.keys(overrides).join('-') || 'default'}`,
    controllerAtCommitment: { seller: 'AI', buyer: 'AI' },
    ...overrides,
});

const poorBuyer = structuredClone(transferFixture);
poorBuyer.world.platforms!.NETFLIX.cashReserve = 10;
const insufficient = attemptTransfer(poorBuyer, { idempotencyKey: 'a6-negative:insufficient' });
assert.equal(insufficient.changed, false);
assert.equal(insufficient.reason, 'INSUFFICIENT_TREASURY');
assert.deepEqual(insufficient.player, poorBuyer, 'A failed cash validation must be atomic.');

const wrongSeller = attemptTransfer(structuredClone(transferFixture), {
    seller: { type: 'AI_PLATFORM', id: 'DISNEY_PLUS', name: 'Disney+', platformId: 'DISNEY_PLUS' },
    idempotencyKey: 'a6-negative:seller-mismatch',
});
assert.equal(wrongSeller.changed, false);
assert.equal(wrongSeller.reason, 'SELLER_MISMATCH');

const alreadyTransferredFixture = structuredClone(transferFixture);
alreadyTransferredFixture.world.streamingRightsContracts![legacyContract.id].status = 'TRANSFERRED_OUT';
const alreadyTransferred = attemptTransfer(alreadyTransferredFixture, { idempotencyKey: 'a6-negative:not-active' });
assert.equal(alreadyTransferred.changed, false);
assert.equal(alreadyTransferred.reason, 'NOT_ACTIVE');

const conflictFixture = structuredClone(transferFixture);
conflictFixture.world.streamingRightsContracts!['blocking-japan-window'] = {
    ...legacyContract,
    id: 'blocking-japan-window',
    idempotencyKey: 'blocking-japan-window',
    buyer: { type: 'AI_PLATFORM', id: 'DISNEY_PLUS', name: 'Disney+', platformId: 'DISNEY_PLUS' },
    buyerPlatformId: 'DISNEY_PLUS',
};
const conflict = attemptTransfer(conflictFixture, { idempotencyKey: 'a6-negative:conflict' });
assert.equal(conflict.changed, false);
assert.equal(conflict.reason, 'RIGHTS_UNAVAILABLE');
assert.deepEqual(conflict.player, conflictFixture, 'A conflicting transfer must not partially mutate either party.');

const batchFixture = structuredClone(transferFixture);
const secondBatchContract = {
    ...legacyContract,
    id: 'legacy-india-window',
    idempotencyKey: 'legacy-india-window',
    sourceProjectId: 'empire-drama-2',
    titleAtSigning: 'Delhi After Dark',
    countryIds: ['IN'],
    rootContractId: 'legacy-india-window',
};
batchFixture.world.streamingRightsContracts![secondBatchContract.id] = secondBatchContract;
batchFixture.world.platforms!.HULU.ai!.rightsContracts.push(secondBatchContract);
batchFixture.world.platforms!.NETFLIX.cashReserve = 60;
const rejectedBatch = settleStreamingRightsTransferBatch(batchFixture, {
    groupId: 'a6-package-transfer-rejected',
    transfers: [legacyContract, secondBatchContract].map(contract => ({
        sourceContractId: contract.id,
        seller: contract.buyer,
        buyer: { type: 'AI_PLATFORM' as const, id: 'NETFLIX', name: 'Netflix', platformId: 'NETFLIX' as const },
        askingPrice: 40_000_000,
        price: 40_000_000,
        absoluteWeek: 80,
        idempotencyKey: `a6-package-transfer-rejected:${contract.id}`,
        controllerAtCommitment: { seller: 'AI' as const, buyer: 'AI' as const },
    })),
});
assert.equal(rejectedBatch.changed, false);
assert.deepEqual(rejectedBatch.player, batchFixture, 'A multi-title transfer must settle every component or mutate none.');
const fundedBatchFixture = structuredClone(batchFixture);
fundedBatchFixture.world.platforms!.NETFLIX.cashReserve = 200;
const settledBatch = settleStreamingRightsTransferBatch(fundedBatchFixture, {
    groupId: 'a6-package-transfer-settled',
    transfers: [legacyContract, secondBatchContract].map(contract => ({
        sourceContractId: contract.id,
        seller: contract.buyer,
        buyer: { type: 'AI_PLATFORM' as const, id: 'NETFLIX', name: 'Netflix', platformId: 'NETFLIX' as const },
        askingPrice: 40_000_000,
        price: 40_000_000,
        absoluteWeek: 80,
        idempotencyKey: `a6-package-transfer-settled:${contract.id}`,
        controllerAtCommitment: { seller: 'AI' as const, buyer: 'AI' as const },
    })),
});
assert.equal(settledBatch.changed, true);
if (!('reason' in settledBatch)) {
    assert.equal(settledBatch.transactions.length, 2);
    assert(settledBatch.transactions.every(transaction => transaction.groupId === 'a6-package-transfer-settled'));
}

const marketFixture = structuredClone(transferFixture);
marketFixture.ownedStreamingPlatform.lifecycle = 'ACTIVE';
marketFixture.ownedStreamingPlatform.identity = {
    name: 'EMPIRE+',
    slug: 'empire-plus',
    primaryColor: '#f5b942',
    secondaryColor: '#08090c',
    logoKey: 'SIGNAL_RING',
    brandPromiseId: 'EVENT_HOUSE',
    publicManifesto: 'Big stories deserve a global stage.',
    foundedAtAbsoluteWeek: 52,
};
marketFixture.ownedStreamingPlatform.starterCatalog = {
    packageId: 'CURATED_PREMIERE',
    ownedProjectIds: [],
    licensedProjectIds: [],
    establishedAtAbsoluteWeek: 60,
};
marketFixture.ownedStreamingPlatform.treasuryCash = 200_000_000;
const resaleOpportunity = getStreamingRightsOpportunities(marketFixture).find(opportunity => (
    opportunity.kind === 'PLATFORM_TRADE' && opportunity.sourceLicenseId === legacyContract.id
));
assert(resaleOpportunity, 'EMPIRE+ must expose an active AI-held licence as a real resale opportunity.');
assert.equal(resaleOpportunity!.originalOwnerName, 'Empire Studios');
assert.equal(resaleOpportunity!.currentHolderName, 'Hulu');
assert.deepEqual(resaleOpportunity!.countryIds, ['JP']);
assert.equal(resaleOpportunity!.remainingWeeks, 60);

const openedResale = openStreamingRightsNegotiation(marketFixture, resaleOpportunity!.id);
assert.equal(openedResale.changed, true);
if (!openedResale.changed || !openedResale.negotiation) throw new Error('The canonical resale listing did not open.');
const readyResale = {
    ...openedResale.player,
    ownedStreamingPlatform: {
        ...openedResale.player.ownedStreamingPlatform,
        rightsNegotiations: openedResale.player.ownedStreamingPlatform.rightsNegotiations.map(negotiation => (
            negotiation.id === openedResale.negotiation!.id
                ? { ...negotiation, status: 'READY_TO_SIGN' as const, minimumGuarantee: 55_000_000 }
                : negotiation
        )),
    },
};
const playerTrade = signStreamingRightsDeal(readyResale, openedResale.negotiation.id);
assert.equal(playerTrade.changed, true, 'A funded player platform must acquire a listed remaining licence.');
const playerTransaction = Object.values(playerTrade.player.world.streamingRightsTransactions || {})
    .find(transaction => transaction.sourceContractId === legacyContract.id);
assert(playerTransaction, 'Player platform trade signing must use the shared A6 transaction authority.');
assert.equal(playerTransaction!.buyer.type, 'PLAYER_PLATFORM');
assert.equal(
    playerTrade.player.world.streamingRightsContracts![playerTransaction!.successorContractId!].expiresAtAbsoluteWeek,
    140,
);
assert.equal(playerTrade.player.ownedStreamingPlatform.treasuryCash, 145_000_000);

const playerHeldContractId = playerTransaction!.successorContractId!;
assert.equal(
    playerTrade.player.world.streamingRightsContracts![playerHeldContractId].sublicensingAllowed,
    false,
    'The fixture intentionally has no sublicensing clause.',
);
const outboundTransferOpportunity = getStreamingRightsOpportunities(playerTrade.player).find(opportunity => (
    opportunity.kind === 'TRANSFER_OUT' && opportunity.sourceLicenseId === playerHeldContractId
));
assert(
    outboundTransferOpportunity,
    'A player may fully transfer its remaining licence even when the contract does not allow sublicensing.',
);
const openedOutbound = openStreamingRightsNegotiation(playerTrade.player, outboundTransferOpportunity!.id);
assert.equal(openedOutbound.changed, true);
if (!openedOutbound.changed || !openedOutbound.negotiation) throw new Error('The outgoing transfer table did not open.');
const readyOutbound = {
    ...openedOutbound.player,
    ownedStreamingPlatform: {
        ...openedOutbound.player.ownedStreamingPlatform,
        rightsNegotiations: openedOutbound.player.ownedStreamingPlatform.rightsNegotiations.map(negotiation => (
            negotiation.id === openedOutbound.negotiation!.id
                ? { ...negotiation, status: 'READY_TO_SIGN' as const, minimumGuarantee: 40_000_000 }
                : negotiation
        )),
    },
};
const soldByPlayer = signStreamingRightsDeal(readyOutbound, openedOutbound.negotiation.id);
assert.equal(soldByPlayer.changed, true);
assert.equal(soldByPlayer.player.ownedStreamingPlatform.treasuryCash, 185_000_000);
assert.equal(soldByPlayer.player.world.streamingRightsContracts![playerHeldContractId].status, 'TRANSFERRED_OUT');
assert.equal(
    Object.values(soldByPlayer.player.world.streamingRightsTransactions || {})
        .filter(transaction => transaction.kind === 'LICENSE_TRANSFER').length,
    2,
    'The inbound and outbound player trades must share the same transaction history.',
);

const backgroundFixture = structuredClone(transferFixture);
backgroundFixture.ownedStreamingPlatform.lifecycle = 'LOCKED';
backgroundFixture.world.platforms!.HULU.ai!.status = 'DISTRESSED';
Object.values(backgroundFixture.world.platforms!).forEach(platform => {
    if (platform.id !== 'HULU' && platform.ai) platform.ai.capabilities.activeCountryIds = ['JP'];
});
backgroundFixture.world.platforms!.HULU.ai!.slate = [{
    id: 'a6-resale-release-plan',
    platformId: 'HULU',
    title: 'Neon Monsoon',
    sourceProjectIds: ['empire-drama-1'],
    rightsContractIds: [legacyContract.id],
    status: 'RELEASED',
    localizationLevel: 'DUBS_AND_SUBTITLES',
    releaseCountryIds: ['US', 'JP', 'FR'],
    localizationRequirements: [
        { sourceProjectId: 'empire-drama-1', languageId: 'french', mode: 'DUB', countryIds: ['FR'], capabilityTierAtPromise: 2, mandatory: true },
        { sourceProjectId: 'empire-drama-1', languageId: 'japanese', mode: 'DUB', countryIds: ['JP'], capabilityTierAtPromise: 2, mandatory: true },
    ],
    releaseEntries: [{ canonicalProjectId: 'empire-drama-1', status: 'RELEASED' }],
    releaseReadiness: { ready: true, canonicalProjectIds: ['empire-drama-1'], rightsContractIds: [legacyContract.id] },
}] as unknown as typeof backgroundFixture.world.platforms.HULU.ai.slate;
const background = processPlatformAiRightsResaleWeek(
    backgroundFixture,
    backgroundFixture.world,
    84,
);
assert.equal(background.settledTransactionIds.length, 1, 'A distressed AI platform should sell one eligible remaining licence in the background.');
const backgroundTransaction = background.world.streamingRightsTransactions![background.settledTransactionIds[0]];
assert.equal(backgroundTransaction.seller.platformId, 'HULU');
assert.notEqual(backgroundTransaction.buyer.platformId, 'HULU');
assert.equal(backgroundTransaction.originalOwner.name, 'Empire Studios');
assert.equal(backgroundTransaction.originalOwnerParticipation, 0);
assert.equal(background.world.streamingRightsContracts![legacyContract.id].status, 'TRANSFERRED_OUT');
const backgroundBuyer = background.world.platforms![backgroundTransaction.buyer.platformId!];
const acquiredBackgroundPlan = backgroundBuyer.ai!.slate.find(plan => (
    plan.rightsContractIds.includes(backgroundTransaction.successorContractId!)
));
assert(acquiredBackgroundPlan, 'The AI buyer must receive a plan for the transferred licence.');
assert(
    acquiredBackgroundPlan!.releaseCountryIds.every(countryId => backgroundBuyer.ai!.capabilities.activeCountryIds.includes(countryId)),
    'A transferred plan may retain broad rights ownership but must schedule only markets the buyer can operate.',
);
const soldBackgroundPlan = background.world.platforms!.HULU.ai!.slate.find(plan => plan.id === 'a6-resale-release-plan');
assert.equal(soldBackgroundPlan?.status, 'SOLD');
assert.equal(soldBackgroundPlan?.releaseReadiness, null, 'A sold plan must already match its normalized persistence shape.');
assert.equal(
    background.world.streamingRightsContracts![backgroundTransaction.successorContractId!].expiresAtAbsoluteWeek,
    140,
);
assert.equal(
    backgroundFixture.ownedStreamingPlatform.catalogLicenses.length,
    0,
    'AI-to-AI resale must not require or mutate a player-owned streaming house.',
);

const exchangeMarkup = renderToStaticMarkup(React.createElement(StreamingRightsExchange, {
    player: marketFixture,
    onUpdatePlayer: () => undefined,
    onClose: () => undefined,
}));
assert.match(exchangeMarkup, /Original owner/);
assert.match(exchangeMarkup, /Empire Studios/);
assert.match(exchangeMarkup, /Current holder/);
assert.match(exchangeMarkup, /Hulu/);
assert.match(exchangeMarkup, /Japan/);
assert.match(exchangeMarkup, /60 weeks remaining/);
assert.match(exchangeMarkup, /30% studio backend/);
assert.match(exchangeMarkup, /No inherited actions/);

const studioLedgerMarkup = renderToStaticMarkup(React.createElement(StreamingRightsCalendar, {
    player: settled.player,
    context: 'STUDIO',
    onUpdatePlayer: () => undefined,
}));
assert.match(studioLedgerMarkup, /Rights transfer ledger/);
assert.match(studioLedgerMarkup, /Empire Studios.*Hulu.*Netflix/);
assert.match(studioLedgerMarkup, /Current holder.*Netflix/);
assert.match(studioLedgerMarkup, /Japan.*60 weeks remaining/);

const persisted = migratePlayerSave(compactPlayerForPersistence(settled.player));
const persistedTransaction = persisted.world.streamingRightsTransactions![settled.transaction.id];
assert(persistedTransaction, 'A settled A6 transfer must survive persistence compaction and migration.');
assert.equal(persistedTransaction.successorContractId, settled.successorContract.id);
assert.equal(persisted.world.streamingRightsContracts![legacyContract.id].status, 'TRANSFERRED_OUT');
assert.equal(persisted.world.streamingRightsContracts![settled.successorContract.id].status, 'ACTIVE');
assert.deepEqual(
    getStreamingRightsTransferChain(persisted.world, settled.successorContract.id).holders.map(holder => holder.name),
    ['Empire Studios', 'Hulu', 'Netflix'],
    'Save/load must preserve the complete transfer chain and current holder.',
);

const expiredHistoryFixture = structuredClone(transferFixture);
const expiredContracts = Object.fromEntries(Array.from({ length: 260 }, (_, index) => {
    const id = `expired-active-history-${index}`;
    return [id, {
        ...legacyContract,
        id,
        idempotencyKey: id,
        signedAtAbsoluteWeek: 0,
        startsAtAbsoluteWeek: 0,
        expiresAtAbsoluteWeek: 10,
        durationWeeks: 10,
        status: 'ACTIVE' as const,
    }];
}));
const futureContractId = 'future-active-history';
expiredHistoryFixture.world.streamingRightsContracts = {
    ...expiredContracts,
    [futureContractId]: {
        ...legacyContract,
        id: futureContractId,
        idempotencyKey: futureContractId,
        expiresAtAbsoluteWeek: 10_000,
        durationWeeks: 9_960,
        status: 'ACTIVE',
    },
};
expiredHistoryFixture.world.platforms!.HULU.ai!.rightsContracts = Object.values(expiredContracts).map((contract, index) => ({
    ...contract,
    platformContentPlanId: `expired-plan-${index}`,
}));
expiredHistoryFixture.world.platforms!.HULU.ai!.slate = Object.values(expiredContracts).map((contract, index) => ({
    id: `expired-plan-${index}`,
    status: 'RELEASED',
    rightsContractIds: [contract.id],
    releasedAtAbsoluteWeek: 10,
    committedAtAbsoluteWeek: 0,
} as unknown as typeof expiredHistoryFixture.world.platforms.HULU.ai.slate[number]));
const compactedExpiredHistoryPlayer = compactPlayerForPersistence(expiredHistoryFixture);
const compactedRightsHistory = compactedExpiredHistoryPlayer.world.streamingRightsContracts!;
assert(compactedRightsHistory[futureContractId], 'A currently usable future rights contract must survive compaction.');
assert(
    Object.keys(compactedRightsHistory).filter(id => id.startsWith('expired-active-history-')).length <= 240,
    'Expired ACTIVE-labelled contracts are terminal history and must obey the bounded rights-history limit.',
);
assert(
    compactedExpiredHistoryPlayer.world.platforms!.HULU.ai!.slate
        .filter(plan => plan.id.startsWith('expired-plan-')).length <= 104,
    'Expired rights projections must not protect an unbounded terminal platform slate through a reference cycle.',
);
const restoredExpiredHistoryPlayer = migratePlayerSave(structuredClone(compactedExpiredHistoryPlayer));
assert.deepEqual(
    restoredExpiredHistoryPlayer.world.streamingRightsContracts,
    compactedExpiredHistoryPlayer.world.streamingRightsContracts,
    'Loading a canonical compacted save must not re-import pruned terminal platform projections.',
);

const staleProjectionFixture = structuredClone(transferFixture);
const staleProjectionContracts = Object.fromEntries(Array.from({ length: 12 }, (_, index) => {
    const id = `stale-local-projection-${index}`;
    return [id, {
        ...legacyContract,
        id,
        idempotencyKey: id,
        signedAtAbsoluteWeek: 0,
        startsAtAbsoluteWeek: 0,
        expiresAtAbsoluteWeek: 10,
        durationWeeks: 10,
        status: 'EXPIRED' as const,
    }];
}));
const newerTerminalContracts = Object.fromEntries(Array.from({ length: 260 }, (_, index) => {
    const id = `newer-terminal-contract-${index}`;
    return [id, {
        ...legacyContract,
        id,
        idempotencyKey: id,
        signedAtAbsoluteWeek: 20 + index,
        startsAtAbsoluteWeek: 20 + index,
        expiresAtAbsoluteWeek: 30 + index,
        durationWeeks: 10,
        status: 'EXPIRED' as const,
    }];
}));
staleProjectionFixture.world.streamingRightsContracts = {
    ...staleProjectionContracts,
    ...newerTerminalContracts,
};
staleProjectionFixture.world.platforms!.HULU.ai!.rightsContracts = Object.values(staleProjectionContracts);
const compactedStaleProjectionPlayer = compactPlayerForPersistence(staleProjectionFixture);
assert.equal(
    Object.keys(compactedStaleProjectionPlayer.world.streamingRightsContracts || {})
        .some(id => id.startsWith('stale-local-projection-')),
    false,
    'Older terminal contracts should fall outside the canonical bounded-history window.',
);
assert.deepEqual(
    migratePlayerSave(structuredClone(compactedStaleProjectionPlayer)).world.streamingRightsContracts,
    compactedStaleProjectionPlayer.world.streamingRightsContracts,
    'Canonical save loading must not resurrect terminal local projections that canonical compaction pruned.',
);

console.log('Streaming rights transactions Phase A6 schema audit passed.');
