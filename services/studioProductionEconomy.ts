import type { BudgetTier, StudioDepartments, StudioEquipment } from '../types';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const safeLevel = (level: unknown) => clamp(Math.floor(Number(level) || 0), 0, 10);

/**
 * Cash budget tiers represent the production's practical market scale.
 * A small film can still become a sleeper hit, but a modest cash spend should
 * not automatically inherit the ceiling of a tentpole.
 */
export const getProductionBudgetTier = (amount: number): BudgetTier => {
    const safeAmount = Math.max(0, Number(amount) || 0);
    if (safeAmount > 120_000_000) return 'BLOCKBUSTER';
    if (safeAmount > 45_000_000) return 'HIGH';
    if (safeAmount > 12_000_000) return 'MID';
    return 'LOW';
};

/**
 * In-house departments avoid outside talent premiums, but using them still
 * consumes payroll, stages, support crews, insurance, and production capacity.
 */
export const getInHouseCrewProjectCost = (level: number): number => {
    const safe = safeLevel(level);
    if (safe <= 0) return 0;
    return Math.round(120_000 + (safe * 105_000) + (safe * safe * 7_500));
};

export const getInHouseCastProjectCost = (level: number): number => {
    const safe = safeLevel(level);
    if (safe <= 0) return 0;
    return Math.round(80_000 + (safe * 72_000) + (safe * safe * 4_500));
};

/**
 * Owned gear is cheaper than renting the equivalent package, not free.
 * This allocation represents maintenance, operators, transport, expendables,
 * insurance, and wear for one production.
 */
export const getOwnedEquipmentProjectCost = (level: number): number => {
    const safe = safeLevel(level);
    if (safe <= 0) return 0;
    return Math.round(65_000 + (safe * 92_000) + (safe * safe * 8_500));
};

export const getInfrastructureLineAnnualOverhead = (level: number, isDepartment: boolean): number => (
    safeLevel(level) * (isDepartment ? 250_000 : 100_000)
);

export const getStudioAnnualInfrastructureOverhead = (
    departments?: Partial<StudioDepartments>,
    equipment?: Partial<StudioEquipment>
): number => {
    const departmentLevels = Object.values(departments || {});
    const equipmentLevels = Object.values(equipment || {});
    const departmentOverhead = departmentLevels.reduce(
        (sum, level) => sum + getInfrastructureLineAnnualOverhead(level, true),
        0
    );
    const equipmentOverhead = equipmentLevels.reduce(
        (sum, level) => sum + getInfrastructureLineAnnualOverhead(level, false),
        0
    );
    return Math.round(departmentOverhead + equipmentOverhead);
};

export interface CampaignReachInput {
    productionBudget: number;
    marketingSpend: number;
    rawHype?: number;
    fameMultiplier?: number;
    distributionPower?: number;
}

export interface CampaignReachProfile {
    multiplier: number;
    label: 'LIMITED' | 'TARGETED' | 'WIDE' | 'EVENT';
    spendRatio: number;
}

/**
 * Marketing primarily buys initial awareness. Strong IP, stars and
 * distribution can soften a lean campaign, but cannot make zero spend behave
 * like an event launch. Word of mouth remains a separate path after opening.
 */
export const calculateCampaignReachProfile = ({
    productionBudget,
    marketingSpend,
    rawHype = 50,
    fameMultiplier = 1,
    distributionPower = 50,
}: CampaignReachInput): CampaignReachProfile => {
    const safeBudget = Math.max(1, Number(productionBudget) || 1);
    const spendRatio = Math.max(0, (Number(marketingSpend) || 0) / safeBudget);

    const paidReach = spendRatio <= 0
        ? 0.42
        : spendRatio < 0.04
            ? 0.52 + (spendRatio / 0.04) * 0.12
            : spendRatio < 0.1
                ? 0.64 + ((spendRatio - 0.04) / 0.06) * 0.18
                : spendRatio < 0.2
                    ? 0.82 + ((spendRatio - 0.1) / 0.1) * 0.18
                    : spendRatio < 0.4
                        ? 1 + ((spendRatio - 0.2) / 0.2) * 0.14
                        : 1.14;

    const organicReach = clamp(
        ((Number(rawHype) || 50) - 50) / 360
        + ((Number(fameMultiplier) || 1) - 1) * 0.1
        + ((Number(distributionPower) || 50) - 50) / 650,
        -0.05,
        0.18
    );
    const multiplier = Math.round(clamp(paidReach + organicReach, 0.38, 1.28) * 100) / 100;
    const label: CampaignReachProfile['label'] = multiplier >= 1.12
        ? 'EVENT'
        : multiplier >= 0.9
            ? 'WIDE'
            : multiplier >= 0.62
                ? 'TARGETED'
                : 'LIMITED';

    return { multiplier, label, spendRatio };
};
