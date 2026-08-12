import type { ProjectHiddenStats } from '../types';
import { calculateWeeklyBoxOffice } from '../services/roleLogic';
import { createBusiness, processBusinessWeek } from '../services/businessLogic';
import {
    calculateCampaignReachProfile,
    getInHouseCastProjectCost,
    getInHouseCrewProjectCost,
    getOwnedEquipmentProjectCost,
    getProductionBudgetTier,
    getStudioAnnualInfrastructureOverhead,
} from '../services/studioProductionEconomy';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const withFixedRandom = <T>(value: number, fn: () => T): T => {
    const originalRandom = Math.random;
    Math.random = () => value;
    try {
        return fn();
    } finally {
        Math.random = originalRandom;
    }
};

assert(getProductionBudgetTier(8_000_000) === 'LOW', 'An $8M film should remain low-budget.');
assert(getProductionBudgetTier(15_000_000) === 'MID', 'A $15M film must not inherit the high-budget box-office ceiling.');
assert(getProductionBudgetTier(60_000_000) === 'HIGH', 'A $60M film should be high-budget.');
assert(getProductionBudgetTier(150_000_000) === 'BLOCKBUSTER', 'A $150M film should be a blockbuster-scale production.');

const maxOwnedPackageUsage =
    (getInHouseCrewProjectCost(10) * 5)
    + (getInHouseCastProjectCost(10) * 3)
    + (getOwnedEquipmentProjectCost(10) * 4);
assert(
    maxOwnedPackageUsage >= 20_000_000,
    `Maxed in-house production resources must carry meaningful per-project operating cost; got ${maxOwnedPackageUsage}.`
);

const maxInfrastructureOverhead = getStudioAnnualInfrastructureOverhead(
    { writing: 10, directing: 10, casting: 10, production: 10, postProduction: 10 },
    { cameras: 10, lighting: 10, sound: 10, practicalEffects: 10 }
);
assert(
    maxInfrastructureOverhead === 16_500_000,
    `Max facilities should create $16.5M annual overhead; got ${maxInfrastructureOverhead}.`
);

const maxedStudio = createBusiness(
    'Audit Pictures',
    'PRODUCTION_HOUSE',
    'INDIE_STUDIO',
    { quality: 'STANDARD', pricing: 'MARKET', marketing: 'LOW' },
    '🎬',
    1
);
if (!maxedStudio.studioState) throw new Error('Production-house audit fixture is missing studio state.');
maxedStudio.studioState.departments = { writing: 10, directing: 10, casting: 10, production: 10, postProduction: 10 };
maxedStudio.studioState.equipment = { cameras: 10, lighting: 10, sound: 10, practicalEffects: 10 };
const processedStudio = processBusinessWeek(maxedStudio, 50, 2, 'en', 30).updated;
assert(
    processedStudio.stats.weeklyExpenses >= Math.ceil(maxInfrastructureOverhead / 52),
    'Displayed infrastructure overhead must be deducted by the weekly business loop.'
);
assert(
    processedStudio.studioState?.financeLedger?.[0]?.label === 'Facilities, equipment and department overhead',
    'Infrastructure billing should be visible in the studio finance ledger.'
);

const quietLaunch = calculateCampaignReachProfile({
    productionBudget: 10_000_000,
    marketingSpend: 0,
    rawHype: 75,
    fameMultiplier: 1.2,
    distributionPower: 75,
});
const supportedLaunch = calculateCampaignReachProfile({
    productionBudget: 10_000_000,
    marketingSpend: 1_500_000,
    rawHype: 75,
    fameMultiplier: 1.2,
    distributionPower: 75,
});
assert(quietLaunch.label === 'LIMITED', `Zero marketing should create limited launch reach; got ${quietLaunch.label}.`);
assert(
    supportedLaunch.multiplier > quietLaunch.multiplier + 0.3,
    'A properly supported campaign should materially improve launch reach.'
);

const sleeperStats = {
    scriptQuality: 94,
    directorQuality: 92,
    castingStrength: 82,
    distributionPower: 74,
    rawHype: 66,
    qualityScore: 94,
    prestigeBonus: 10,
    fameMultiplier: 1.05,
    castDepthScore: 80,
    campaignReachMultiplier: quietLaunch.multiplier,
    campaignReachLabel: quietLaunch.label,
    boxOfficeCapRoll: 0.98,
} as ProjectHiddenStats;

const ordinaryQuietStats = {
    ...sleeperStats,
    scriptQuality: 72,
    directorQuality: 70,
    qualityScore: 74,
    boxOfficeCapRoll: 0.98,
} as ProjectHiddenStats;

const calculateRun = (stats: ProjectHiddenStats) => withFixedRandom(0.5, () => {
    let total = 0;
    let previous = 0;
    for (let week = 1; week <= 8; week += 1) {
        const gross = calculateWeeklyBoxOffice(
            week,
            8_000_000,
            stats,
            previous,
            week === 1 ? 0 : undefined,
            'LOW',
            'THRILLER',
            'LIVE_ACTION',
            1,
            0
        );
        total += gross;
        previous = gross;
    }
    return total;
});

const sleeperGross = calculateRun(sleeperStats);
const ordinaryQuietGross = calculateRun(ordinaryQuietStats);
assert(
    sleeperGross >= 24_000_000,
    `An exceptional small film should retain rare sleeper upside; got ${sleeperGross}.`
);
assert(
    sleeperGross > ordinaryQuietGross * 1.7,
    `Sleeper quality and the rare breakout roll should clearly outperform a routine zero-marketing film (${sleeperGross} vs ${ordinaryQuietGross}).`
);
assert(
    sleeperGross < 170_000_000,
    'A sleeper should earn its large return through the run, not jump automatically to the tier ceiling.'
);

console.log('Studio production economy audit passed.');
