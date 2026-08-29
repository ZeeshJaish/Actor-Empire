import assert from 'node:assert/strict';
import {
    attributeStreamingTitleRevenue,
    calculateStreamingContractRoyalty,
    normalizeStreamingRoyaltySettlementRegistry,
    registerStreamingRoyaltySettlement,
    settleStreamingContractRoyaltyForPlayer,
} from '../services/streamingContractSettlement';
import { INITIAL_PLAYER } from '../types';
import { registerProductionStreamingRightsContract } from '../services/streamingRightsCore';

const attributions = attributeStreamingTitleRevenue({
    subscriptionRevenue: 1_000_000,
    titles: [
        {
            projectId: 'picture-a',
            viewingAccounts: 300,
            watchHours: 100,
            subscriberAcquisition: 30,
            subscriberRetention: 10,
            advertisingRevenue: 50_000,
            transactionalRevenue: 10_000,
            taxesRefundsAndStorefrontFees: 5_000,
        },
        {
            projectId: 'picture-b',
            viewingAccounts: 100,
            watchHours: 300,
            subscriberAcquisition: 10,
            subscriberRetention: 30,
            advertisingRevenue: 20_000,
            transactionalRevenue: 0,
            taxesRefundsAndStorefrontFees: 0,
        },
    ],
});

assert.deepEqual(attributions, [
    {
        projectId: 'picture-a',
        contributionWeight: 0.475,
        attributedSubscriptionRevenue: 475_000,
        attributedAdvertisingRevenue: 50_000,
        attributedTransactionalRevenue: 10_000,
        allowedDeductions: 5_000,
        adjustedGrossReceipts: 530_000,
    },
    {
        projectId: 'picture-b',
        contributionWeight: 0.525,
        attributedSubscriptionRevenue: 525_000,
        attributedAdvertisingRevenue: 20_000,
        attributedTransactionalRevenue: 0,
        allowedDeductions: 0,
        adjustedGrossReceipts: 545_000,
    },
]);
assert.equal(
    attributions.reduce((sum, row) => sum + row.attributedSubscriptionRevenue, 0),
    1_000_000,
    'title subscription attribution must conserve the platform subscription pool exactly',
);

const nonRecoupable = calculateStreamingContractRoyalty({
    adjustedGrossReceipts: 530_000,
    licensorRevenueShare: 8,
    minimumGuarantee: 300_000,
    guaranteeRecoupment: 'NON_RECOUPABLE',
    backendCap: null,
    cumulativeRoyaltyAccrued: 0,
    cumulativeRoyaltyPaid: 0,
});
assert.deepEqual(nonRecoupable, {
    grossRoyaltyAccrued: 42_400,
    royaltyPayable: 42_400,
    cumulativeRoyaltyAccrued: 42_400,
    cumulativeRoyaltyPaid: 42_400,
    recoupmentRemaining: 0,
    capRemaining: null,
});

const belowRecoupment = calculateStreamingContractRoyalty({
    adjustedGrossReceipts: 2_000_000,
    licensorRevenueShare: 10,
    minimumGuarantee: 500_000,
    guaranteeRecoupment: 'RECOUPABLE',
    backendCap: null,
    cumulativeRoyaltyAccrued: 0,
    cumulativeRoyaltyPaid: 0,
});
assert.equal(belowRecoupment.grossRoyaltyAccrued, 200_000);
assert.equal(belowRecoupment.royaltyPayable, 0);
assert.equal(belowRecoupment.recoupmentRemaining, 300_000);

const crossesRecoupment = calculateStreamingContractRoyalty({
    adjustedGrossReceipts: 4_000_000,
    licensorRevenueShare: 10,
    minimumGuarantee: 500_000,
    guaranteeRecoupment: 'RECOUPABLE',
    backendCap: null,
    cumulativeRoyaltyAccrued: 200_000,
    cumulativeRoyaltyPaid: 0,
});
assert.equal(crossesRecoupment.grossRoyaltyAccrued, 400_000);
assert.equal(crossesRecoupment.royaltyPayable, 100_000);
assert.equal(crossesRecoupment.cumulativeRoyaltyAccrued, 600_000);
assert.equal(crossesRecoupment.recoupmentRemaining, 0);

const capped = calculateStreamingContractRoyalty({
    adjustedGrossReceipts: 5_000_000,
    licensorRevenueShare: 10,
    minimumGuarantee: 0,
    guaranteeRecoupment: 'NON_RECOUPABLE',
    backendCap: 1_000_000,
    cumulativeRoyaltyAccrued: 2_000_000,
    cumulativeRoyaltyPaid: 900_000,
});
assert.equal(capped.grossRoyaltyAccrued, 500_000, 'the cap must not hide realized gross royalty accrual');
assert.equal(capped.royaltyPayable, 100_000);
assert.equal(capped.cumulativeRoyaltyPaid, 1_000_000);
assert.equal(capped.capRemaining, 0);

const settlement = {
    id: 'royalty-contract-1-week-500',
    idempotencyKey: 'royalty:contract-1:500',
    contractId: 'contract-1',
    projectId: 'picture-a',
    buyerPlatformId: 'NETFLIX' as const,
    sellerStudioId: 'studio-1',
    absoluteWeek: 500,
    adjustedGrossReceipts: 530_000,
    grossRoyaltyAccrued: 42_400,
    royaltyPaid: 42_400,
    recoupmentRemaining: 0,
    capRemaining: null,
};
const firstRegistration = registerStreamingRoyaltySettlement({}, settlement);
assert.equal(firstRegistration.changed, true);
const replayRegistration = registerStreamingRoyaltySettlement(firstRegistration.registry, settlement);
assert.equal(replayRegistration.changed, false, 'replaying a weekly settlement must not create a second payment record');
assert.strictEqual(replayRegistration.registry, firstRegistration.registry);

const playerFixture = structuredClone(INITIAL_PLAYER);
playerFixture.businesses = [{
    id: 'studio-1',
    name: 'First Studio',
    type: 'PRODUCTION_HOUSE',
    balance: 10_000_000,
    stats: { weeklyRevenue: 0, weeklyExpenses: 0, weeklyProfit: 0, lifetimeRevenue: 0, valuation: 0, employees: 0 },
    studioState: { platformRelations: {} },
} as any];
const registeredContract = registerProductionStreamingRightsContract(playerFixture, {
    sourceProjectId: 'picture-a',
    title: 'Picture A',
    projectType: 'MOVIE',
    genre: 'DRAMA',
    sellerStudioId: 'studio-1',
    sellerStudioName: 'First Studio',
    buyerPlatformId: 'NETFLIX',
    minimumGuarantee: 5_000_000,
    platformRevenueShare: 90,
    guaranteeRecoupment: 'NON_RECOUPABLE',
    signedAtAbsoluteWeek: 499,
    startsAtAbsoluteWeek: 500,
    durationWeeks: 52,
});
const contractId = registeredContract.contract!.id;
const platformCashBefore = registeredContract.player.world.platforms!.NETFLIX.cashReserve;
const studioCashBefore = registeredContract.player.businesses[0].balance;
const settledPlayer = settleStreamingContractRoyaltyForPlayer(registeredContract.player, {
    contractId,
    attribution: attributions[0],
    absoluteWeek: 500,
});
assert.equal(settledPlayer.changed, true);
assert.equal(settledPlayer.royaltyPaid, 53_000);
assert.equal(settledPlayer.player.world.platforms!.NETFLIX.cashReserve, platformCashBefore - 0.053);
assert.equal(settledPlayer.player.businesses[0].balance, studioCashBefore + 53_000);
assert.equal(settledPlayer.player.world.streamingRightsContracts![contractId].cumulativeRoyaltyPaid, 53_000);
assert.equal(
    settledPlayer.player.businesses[0].studioState?.platformRelations?.NETFLIX?.profitableDeals,
    0,
    'weekly royalty payments must not manufacture more profitable deals than completed deals',
);
assert.ok(settledPlayer.player.world.streamingRoyaltySettlements?.[settledPlayer.settlementId!]);
const replayedPlayerSettlement = settleStreamingContractRoyaltyForPlayer(settledPlayer.player, {
    contractId,
    attribution: attributions[0],
    absoluteWeek: 500,
});
assert.equal(replayedPlayerSettlement.changed, false);
assert.equal(replayedPlayerSettlement.royaltyPaid, 0, 'an exact-once replay must not report the prior payment as new revenue');
assert.strictEqual(replayedPlayerSettlement.player, settledPlayer.player);
const transferredSettlements = normalizeStreamingRoyaltySettlementRegistry(JSON.parse(JSON.stringify({
    [settlement.id]: settlement,
    malformed: { id: '', contractId: '' },
})));
assert.deepEqual(Object.keys(transferredSettlements), [settlement.id]);
assert.deepEqual(transferredSettlements[settlement.id], settlement);

console.log('Streaming contract economics Phase 2 audit passed.');
