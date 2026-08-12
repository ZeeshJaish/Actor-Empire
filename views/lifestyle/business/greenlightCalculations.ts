import { getOwnedEquipmentProjectCost } from '../../../services/studioProductionEconomy';

export interface GreenlightBudgetCastRole {
    actorId: string | null;
    salary?: number;
}

export interface GreenlightCrewCosts {
    director: number;
    cinematographer: number;
    composer: number;
    lineProducer: number;
    vfx: number;
}

export interface GreenlightGearCostTier {
    cost: number;
    quality?: number;
}

export interface CalculateGreenlightBudgetInput {
    scriptCost: number;
    crewCosts: GreenlightCrewCosts;
    castRoles: GreenlightBudgetCastRole[];
    contractedActorIds: ReadonlySet<string>;
    availableActorIds: ReadonlySet<string>;
    inHouseActorCost: number;
    backgroundCastingCost: number;
    locationCosts: number[];
    equipmentChoices: Record<string, string>;
    ownedEquipmentLevels: Partial<Record<string, number>>;
    gearTiers: Record<string, GreenlightGearCostTier>;
    baseCost?: number;
}

export interface GreenlightBudgetBreakdown {
    total: number;
    baseCost: number;
    scriptCost: number;
    cast: number;
    backgroundEnsemble: number;
    director: number;
    crew: number;
    locationCost: number;
    equipmentCost: number;
}

export const calculateGreenlightBudget = ({
    scriptCost,
    crewCosts,
    castRoles,
    contractedActorIds,
    availableActorIds,
    inHouseActorCost,
    backgroundCastingCost,
    locationCosts,
    equipmentChoices,
    ownedEquipmentLevels,
    gearTiers,
    baseCost = 5_000_000,
}: CalculateGreenlightBudgetInput): GreenlightBudgetBreakdown => {
    let castCost = 0;
    for (const role of castRoles) {
        if (!role.actorId || role.actorId === 'PLAYER_SELF') continue;
        if (role.actorId === 'STUDIO_STAFF') {
            castCost += inHouseActorCost;
            continue;
        }
        if (contractedActorIds.has(role.actorId)) continue;
        if (availableActorIds.has(role.actorId) || role.salary) {
            castCost += role.salary || 0;
        }
    }

    const locationCost = locationCosts.reduce(
        (total, cost) => total + (Number(cost) || 0),
        0,
    );

    let equipmentCost = 0;
    for (const [equipmentId, choice] of Object.entries(equipmentChoices)) {
        if (choice === 'OWNED') {
            equipmentCost += getOwnedEquipmentProjectCost(ownedEquipmentLevels[equipmentId] || 0);
            continue;
        }
        const gearTier = gearTiers[choice];
        if (gearTier) {
            equipmentCost += gearTier.cost;
        }
    }

    const directorCost = Number(crewCosts.director) || 0;
    const crewCost = (Number(crewCosts.cinematographer) || 0)
        + (Number(crewCosts.composer) || 0)
        + (Number(crewCosts.lineProducer) || 0)
        + (Number(crewCosts.vfx) || 0);
    const normalizedScriptCost = Number(scriptCost) || 0;
    const normalizedBackgroundCost = Number(backgroundCastingCost) || 0;
    const total = baseCost
        + normalizedScriptCost
        + directorCost
        + crewCost
        + castCost
        + normalizedBackgroundCost
        + locationCost
        + equipmentCost;

    return {
        total: Number(total) || 0,
        baseCost,
        scriptCost: normalizedScriptCost,
        cast: Number(castCost) || 0,
        backgroundEnsemble: normalizedBackgroundCost,
        director: directorCost,
        crew: crewCost,
        locationCost,
        equipmentCost,
    };
};

export const calculateAvailableGreenlightFunds = (
    studioBalance: number,
    productionFund: number,
    lockedStreamingFunding: number,
): number => Math.max(
    0,
    Math.round((studioBalance || 0) + (productionFund || 0) + (lockedStreamingFunding || 0)),
);

export const calculateMaxGreenlightMarketingBudget = (
    availableFunds: number,
    productionBudget: number,
    musicBudget: number,
): number => Math.max(
    0,
    Math.floor((availableFunds - (productionBudget || 0) - (musicBudget || 0)) / 50_000) * 50_000,
);

export const calculateGreenlightPackageBudget = (
    productionBudget: number,
    musicBudget: number,
    reservedMarketingBudget: number,
): number => Math.max(
    0,
    Math.round((productionBudget || 0) + (musicBudget || 0) + (reservedMarketingBudget || 0)),
);

export const calculateInvestorRaisePercent = (
    normalizedInvestorRaise: number,
    maxInvestorRaise: number,
): number => (
    maxInvestorRaise > 0
        ? Math.round((normalizedInvestorRaise / maxInvestorRaise) * 100)
        : 0
);

export const calculateInvestorRaiseAmountFromPercent = (
    percent: number,
    maxInvestorRaise: number,
): number => {
    const clamped = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
    return Math.round((maxInvestorRaise * clamped / 100) / 100_000) * 100_000;
};

export interface GreenlightFundingPosition {
    netGreenlightCashRequirement: number;
    investorFundingShortfall: number;
    investorFundingOverage: number;
    effectiveStudioFundingPool: number;
}

export const calculateGreenlightFundingPosition = ({
    packageBudget,
    investorRaisedAmount,
    normalizedInvestorRaise,
    studioBalance,
    productionFund,
    lockedStreamingFundingAmount,
}: {
    packageBudget: number;
    investorRaisedAmount: number;
    normalizedInvestorRaise: number;
    studioBalance: number;
    productionFund: number;
    lockedStreamingFundingAmount: number;
}): GreenlightFundingPosition => ({
    netGreenlightCashRequirement: Math.max(0, packageBudget - investorRaisedAmount),
    investorFundingShortfall: Math.max(0, normalizedInvestorRaise - investorRaisedAmount),
    investorFundingOverage: Math.max(0, investorRaisedAmount - normalizedInvestorRaise),
    effectiveStudioFundingPool: studioBalance + productionFund + lockedStreamingFundingAmount,
});

export interface GreenlightCastingScoreEntry {
    roleType: 'LEAD' | 'SUPPORTING' | 'CAMEO' | 'EXTRA';
    talent: number;
    fame: number;
}

export const calculateGreenlightCastingStrength = ({
    cast,
    projectType,
    estimatedBudget,
}: {
    cast: GreenlightCastingScoreEntry[];
    projectType?: string;
    estimatedBudget: number;
}): number => {
    if (cast.length === 0) return 35;

    const weightedScores = cast.map(member => {
        const roleWeight = member.roleType === 'LEAD'
            ? 1.2
            : member.roleType === 'SUPPORTING'
                ? 0.8
                : member.roleType === 'CAMEO'
                    ? 0.35
                    : 0.15;
        return {
            score: (member.talent * 0.72) + (member.fame * 0.28),
            weight: roleWeight,
        };
    });
    const totalWeight = weightedScores.reduce((sum, item) => sum + item.weight, 0) || 1;
    const weightedAverage = weightedScores.reduce(
        (sum, item) => sum + (item.score * item.weight),
        0,
    ) / totalWeight;
    const requiredCastCount = projectType === 'SERIES'
        ? 4
        : estimatedBudget > 100_000_000
            ? 6
            : estimatedBudget > 25_000_000
                ? 4
                : 3;
    const completenessRatio = Math.min(1, cast.length / requiredCastCount);
    const completenessPenalty = (1 - completenessRatio) * 18;
    const ensembleBonus = cast.length >= requiredCastCount
        ? Math.min(6, (cast.length - requiredCastCount) * 1.5)
        : 0;
    const score = weightedAverage - completenessPenalty + ensembleBonus;
    return Math.round(Math.max(20, Math.min(98, score)));
};

export const calculateGreenlightEstimatedQuality = ({
    scriptQuality,
    directorQuality,
    castingStrength,
    crewQualities,
    equipmentChoices,
    ownedEquipmentLevels,
    gearTiers,
    locationQualities,
    storyFitQualityAdjustment,
    backgroundAuthenticity,
    backgroundReliability,
    backgroundSetCare,
}: {
    scriptQuality?: number;
    directorQuality: number;
    castingStrength: number;
    crewQualities: number[];
    equipmentChoices: Record<string, string>;
    ownedEquipmentLevels: Partial<Record<string, number>>;
    gearTiers: Record<string, GreenlightGearCostTier>;
    locationQualities: number[];
    storyFitQualityAdjustment: number;
    backgroundAuthenticity: number;
    backgroundReliability: number;
    backgroundSetCare: number;
}): number => {
    let score = 50;
    if (scriptQuality !== undefined) {
        score += ((scriptQuality || 50) - 50) * 0.5;
    }
    score += ((directorQuality || 50) - 50) * 0.4;
    score += (castingStrength - 50) * 0.3;

    const averageCrewQuality = crewQualities.length > 0
        ? crewQualities.reduce((total, quality) => total + (quality || 50), 0) / crewQualities.length
        : 50;
    score += (averageCrewQuality - 50) * 0.2;

    let equipmentScore = 0;
    for (const [equipmentId, choice] of Object.entries(equipmentChoices)) {
        if (choice === 'OWNED') {
            equipmentScore += (ownedEquipmentLevels[equipmentId] || 0) * 3;
            continue;
        }
        equipmentScore += gearTiers[choice]?.quality || 0;
    }
    score += equipmentScore / 4;

    if (locationQualities.length > 0) {
        const locationScore = locationQualities.reduce(
            (total, quality) => total + (((quality || 5) - 5) * 2),
            0,
        );
        score += locationScore / locationQualities.length;
    }

    score += storyFitQualityAdjustment || 0;
    const backgroundAdjustment = ((backgroundAuthenticity - 50) * 0.04)
        + ((backgroundReliability - 50) * 0.03)
        + ((backgroundSetCare - 50) * 0.025);
    score += Math.max(-3, Math.min(5, backgroundAdjustment));

    return Math.max(1, Math.min(100, Math.round(score || 50)));
};
