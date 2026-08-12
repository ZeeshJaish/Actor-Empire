import assert from 'node:assert/strict';
import {
    calculateAvailableGreenlightFunds,
    calculateGreenlightBudget,
    calculateGreenlightCastingStrength,
    calculateGreenlightEstimatedQuality,
    calculateGreenlightFundingPosition,
    calculateGreenlightPackageBudget,
    calculateInvestorRaiseAmountFromPercent,
    calculateInvestorRaisePercent,
    calculateMaxGreenlightMarketingBudget,
} from '../views/lifestyle/business/greenlightCalculations';

const budget = calculateGreenlightBudget({
    scriptCost: 2_000_000,
    crewCosts: {
        director: 3_000_000,
        cinematographer: 1_000_000,
        composer: 2_000_000,
        lineProducer: 3_000_000,
        vfx: 4_000_000,
    },
    castRoles: [
        { actorId: 'PLAYER_SELF', salary: 20_000_000 },
        { actorId: 'STUDIO_STAFF' },
        { actorId: 'contracted_actor', salary: 8_000_000 },
        { actorId: 'market_actor', salary: 4_000_000 },
        { actorId: 'linked_actor', salary: 1_500_000 },
        { actorId: 'unknown_actor' },
    ],
    contractedActorIds: new Set(['contracted_actor']),
    availableActorIds: new Set(['market_actor']),
    inHouseActorCost: 750_000,
    backgroundCastingCost: 500_000,
    locationCosts: [1_000_000, 2_000_000],
    equipmentChoices: {
        cameras: 'TIER_3',
        lighting: 'OWNED',
    },
    ownedEquipmentLevels: {
        lighting: 2,
    },
    gearTiers: {
        TIER_3: { cost: 500_000 },
    },
});

assert.deepEqual(budget, {
    total: 30_533_000,
    baseCost: 5_000_000,
    scriptCost: 2_000_000,
    cast: 6_250_000,
    backgroundEnsemble: 500_000,
    director: 3_000_000,
    crew: 10_000_000,
    locationCost: 3_000_000,
    equipmentCost: 783_000,
});

assert.equal(
    calculateAvailableGreenlightFunds(100_000_000, 5_000_000, 10_000_000),
    115_000_000,
    'Available funds should combine wallet, production fund, and locked streaming funding.',
);
assert.equal(
    calculateMaxGreenlightMarketingBudget(115_000_000, budget.total, 2_000_000),
    82_450_000,
    'Marketing capacity should remain quantized to $50k steps.',
);
assert.equal(
    calculateGreenlightPackageBudget(budget.total, 2_000_000, 12_345_678),
    44_878_678,
    'Package budget should combine production, music, and campaign reserve.',
);
assert.equal(calculateInvestorRaisePercent(16_500_000, 50_000_000), 33);
assert.equal(calculateInvestorRaisePercent(1, 0), 0);
assert.equal(
    calculateInvestorRaiseAmountFromPercent(33, 50_000_000),
    16_500_000,
    'Raise percent should retain $100k quantization.',
);
assert.equal(calculateInvestorRaiseAmountFromPercent(150, 50_000_000), 50_000_000);

assert.deepEqual(calculateGreenlightFundingPosition({
    packageBudget: 45_000_000,
    investorRaisedAmount: 15_000_000,
    normalizedInvestorRaise: 20_000_000,
    studioBalance: 40_000_000,
    productionFund: 5_000_000,
    lockedStreamingFundingAmount: 10_000_000,
}), {
    netGreenlightCashRequirement: 30_000_000,
    investorFundingShortfall: 5_000_000,
    investorFundingOverage: 0,
    effectiveStudioFundingPool: 55_000_000,
});

assert.equal(calculateGreenlightCastingStrength({
    cast: [
        { roleType: 'LEAD', talent: 80, fame: 60 },
        { roleType: 'SUPPORTING', talent: 70, fame: 50 },
        { roleType: 'CAMEO', talent: 90, fame: 90 },
    ],
    projectType: 'MOVIE',
    estimatedBudget: 30_000_000,
}), 69);
assert.equal(calculateGreenlightCastingStrength({
    cast: [],
    projectType: 'SERIES',
    estimatedBudget: 10_000_000,
}), 35);

assert.equal(calculateGreenlightEstimatedQuality({
    scriptQuality: 80,
    directorQuality: 90,
    castingStrength: 70,
    crewQualities: [80, 70, 60, 50],
    equipmentChoices: {
        cameras: 'TIER_3',
        lighting: 'OWNED',
    },
    ownedEquipmentLevels: {
        lighting: 2,
    },
    gearTiers: {
        TIER_3: { cost: 500_000, quality: 8 },
    },
    locationQualities: [8, 6],
    storyFitQualityAdjustment: -2,
    backgroundAuthenticity: 70,
    backgroundReliability: 60,
    backgroundSetCare: 80,
}), 97);

console.log('Greenlight calculation audit passed.');
