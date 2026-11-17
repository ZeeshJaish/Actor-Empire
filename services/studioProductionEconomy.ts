import type { BudgetTier, StudioDepartments, StudioEquipment } from '../types';
import { getOwnedGearQualityLevel } from './greenlightSetupEffects';

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

/**
 * #306: the Writing Room writes your in-house scripts. It was upgradeable and charged overhead, but the script's skill was always 45.
 * Level 1 is what it always was, level 10 is 90, and a better room costs more per script (level 10: $500K).
 */
export const getInHouseWriterSkill = (level: number): number => 45 + (Math.max(1, safeLevel(level)) - 1) * 5;
export const getInHouseScriptCost = (level: number): number => 5_000 * Math.max(1, safeLevel(level)) ** 2;

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
/* B28 (2026-11-15): owned gear at quality 8 cost $1.345M a film against $500K to rent the same quality, though the
   Greenlight promises "discounted studio operating rates". Using owned gear now costs about 40% of renting the same
   quality (the rental prices, in between tiers read along a straight line). */
const RENTAL_PRICE_BY_QUALITY: ReadonlyArray<readonly [number, number]> = [[2, 10_000], [5, 100_000], [8, 500_000], [15, 2_500_000], [30, 8_500_000]];
const OWNED_GEAR_SHARE_OF_RENTAL = 0.4;
const rentalPriceAtQuality = (quality: number): number => {
    if (quality <= RENTAL_PRICE_BY_QUALITY[0][0]) return RENTAL_PRICE_BY_QUALITY[0][1] * (quality / RENTAL_PRICE_BY_QUALITY[0][0]);
    for (let index = 1; index < RENTAL_PRICE_BY_QUALITY.length; index += 1) {
        const [q1, p1] = RENTAL_PRICE_BY_QUALITY[index];
        const [q0, p0] = RENTAL_PRICE_BY_QUALITY[index - 1];
        if (quality <= q1) return p0 + (p1 - p0) * ((quality - q0) / (q1 - q0));
    }
    return RENTAL_PRICE_BY_QUALITY[RENTAL_PRICE_BY_QUALITY.length - 1][1];
};
/* B28 cap (Zeesh 2026-11-16): the released price per film is a ceiling, so no owned level costs more than it did
   before the update. Levels 1–8 are 40% of renting (well under it); levels 9–10, which now give High-End and
   Cutting-Edge quality, stay at $1.58M and $1.84M a line (about 30% and 22% of renting that quality). */
const releasedOwnedEquipmentProjectCost = (level: number): number => Math.round(65_000 + (level * 92_000) + (level * level * 8_500));
export const getOwnedEquipmentProjectCost = (level: number): number => {
    const safe = safeLevel(level);
    if (safe <= 0) return 0;
    const shareOfRenting = Math.round((rentalPriceAtQuality(getOwnedGearQualityLevel(safe)) * OWNED_GEAR_SHARE_OF_RENTAL) / 1_000) * 1_000;
    return Math.min(shareOfRenting, releasedOwnedEquipmentProjectCost(safe));
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

const PRODUCTION_SCALE_ANCHORS: ReadonlyArray<{ budget: number; tier: BudgetTier }> = [
    { budget: 8_000_000, tier: 'LOW' }, { budget: 35_000_000, tier: 'MID' },
    { budget: 90_000_000, tier: 'HIGH' }, { budget: 180_000_000, tier: 'BLOCKBUSTER' },
];

/** Compatibility bridge for the old economy: interpolate numeric inputs, never
 * switch earnings because one dollar changed a production-label bucket.
 * The later shared audience engine has no budget-derived monetary ceiling.
 */
export const interpolateProductionBudget = (budget: number, values: Record<BudgetTier, number>): number => {
    const amount = Number.isFinite(budget) ? Math.max(0, budget) : 0;
    if (amount <= PRODUCTION_SCALE_ANCHORS[0].budget) return values.LOW;
    for (let index = 1; index < PRODUCTION_SCALE_ANCHORS.length; index++) {
        const low = PRODUCTION_SCALE_ANCHORS[index - 1], high = PRODUCTION_SCALE_ANCHORS[index];
        if (amount <= high.budget) {
            const weight = Math.log(amount / low.budget) / Math.log(high.budget / low.budget);
            return values[low.tier] + (values[high.tier] - values[low.tier]) * weight;
        }
    }
    return values.BLOCKBUSTER;
};
export const getProductionScale = (budget: number): number => interpolateProductionBudget(budget, { LOW: 0, MID: 1, HIGH: 2, BLOCKBUSTER: 3 });
export const getProductionBudgetReference = (budget: number): number => interpolateProductionBudget(budget,
    { LOW: 8_000_000, MID: 35_000_000, HIGH: 90_000_000, BLOCKBUSTER: 180_000_000 });
