import { calculateIMDbRating, calculateRunOutcome, calculateWeeklyBoxOffice } from '../services/roleLogic';
import { calculateTheatricalDistributionBreakdown } from '../services/distributionRevenue';
import type { Commitment, ProjectDetails } from '../types';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const withFixedRandom = <T>(fn: () => T): T => {
    const originalRandom = Math.random;
    Math.random = () => 0.5;
    try {
        return fn();
    } finally {
        Math.random = originalRandom;
    }
};

const makeCommitment = (
    title: string,
    project: Partial<ProjectDetails>,
    productionPerformance: number,
    roleType: Commitment['roleType'] = 'LEAD'
): Commitment => ({
    id: title.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
    name: title,
    type: 'ACTING_GIG',
    roleType,
    energyCost: 0,
    income: 0,
    payoutType: 'LUMPSUM',
    productionPerformance,
    projectDetails: {
        title,
        type: 'MOVIE',
        description: 'IMDb balance audit project.',
        studioId: 'ARTISAN_PICTURES',
        subtype: 'STANDALONE',
        genre: 'DRAMA',
        budgetTier: 'HIGH',
        estimatedBudget: 100_000_000,
        visibleHype: 'HIGH',
        directorName: 'Audit Director',
        visibleDirectorTier: 'A-List',
        visibleScriptBuzz: 'Hot',
        visibleCastStrength: 'Strong',
        ...project,
        hiddenStats: {
            scriptQuality: 78,
            directorQuality: 78,
            castingStrength: 78,
            distributionPower: 70,
            rawHype: 76,
            qualityScore: 78,
            prestigeBonus: 0,
            castDepthScore: 70,
            ...(project.hiddenStats || {}),
        },
    },
});

const solidButNotElite = withFixedRandom(() => calculateIMDbRating(makeCommitment('Solid Expensive Drama', {
    estimatedBudget: 155_000_000,
    budgetTier: 'BLOCKBUSTER',
    hiddenStats: {
        scriptQuality: 78,
        directorQuality: 76,
        castingStrength: 74,
        distributionPower: 70,
        rawHype: 84,
        qualityScore: 78,
        prestigeBonus: 0,
        castDepthScore: 58,
    },
}, 80)));

assert(
    solidButNotElite < 8.2,
    `A merely solid expensive package should not easily clear elite IMDb territory; got ${solidButNotElite}.`
);

const elitePrestige = withFixedRandom(() => calculateIMDbRating(makeCommitment('Elite Prestige Drama', {
    estimatedBudget: 88_000_000,
    budgetTier: 'HIGH',
    hiddenStats: {
        scriptQuality: 94,
        directorQuality: 92,
        castingStrength: 88,
        distributionPower: 76,
        rawHype: 78,
        qualityScore: 94,
        prestigeBonus: 14,
        castDepthScore: 86,
    },
}, 92)));

assert(
    elitePrestige >= 8.7,
    `A true elite package should still reach prestige IMDb territory; got ${elitePrestige}.`
);

const calculateTheatricalRun = (project: ProjectDetails, budget: number, weeks = 8): number => {
    let totalGross = 0;
    let previousWeekGross = 0;
    for (let week = 1; week <= weeks; week += 1) {
        const demand = withFixedRandom(() => calculateWeeklyBoxOffice(
            week,
            budget,
            project.hiddenStats,
            previousWeekGross,
            week === 1 ? 20 : undefined,
            project.budgetTier,
            project.genre,
            project.format || 'LIVE_ACTION',
            0.92,
            0
        ));
        const distributed = calculateTheatricalDistributionBreakdown(project, demand, week).gross;
        totalGross += distributed;
        previousWeekGross = distributed;
    }
    return totalGross;
};

const weakMegaBudgetProject = makeCommitment('Weak Billion-Dollar Tentpole', {
    estimatedBudget: 1_000_000_000,
    budgetTier: 'BLOCKBUSTER',
    genre: 'ACTION',
    hiddenStats: {
        scriptQuality: 36,
        directorQuality: 42,
        castingStrength: 48,
        distributionPower: 58,
        rawHype: 52,
        qualityScore: 40,
        prestigeBonus: 0,
        castDepthScore: 45,
    },
}, 44).projectDetails;
const weakMegaBudgetGross = calculateTheatricalRun(weakMegaBudgetProject, 1_000_000_000);
assert(
    weakMegaBudgetGross < 1_000_000_000,
    `A weak billion-dollar production should not become a billion-dollar grosser from budget alone; got ${weakMegaBudgetGross}.`
);

const lowBudgetBreakoutProject = makeCommitment('Low Budget Breakout', {
    estimatedBudget: 5_000_000,
    budgetTier: 'LOW',
    genre: 'THRILLER',
    hiddenStats: {
        scriptQuality: 94,
        directorQuality: 90,
        castingStrength: 76,
        distributionPower: 72,
        rawHype: 64,
        qualityScore: 92,
        prestigeBonus: 10,
        castDepthScore: 76,
    },
}, 91).projectDetails;
const lowBudgetBreakoutGross = calculateTheatricalRun(lowBudgetBreakoutProject, 5_000_000, 10);
const lowBudgetOutcome = calculateRunOutcome(lowBudgetBreakoutGross, 5_000_000, 8.7);
assert(
    ['SUCCESS', 'MASSIVE_SUCCESS'].includes(lowBudgetOutcome.tier),
    `An excellent low-budget movie should be able to break out instead of being auto-flop; got ${lowBudgetOutcome.tier} on ${lowBudgetBreakoutGross}.`
);

console.log('IMDb and Greenlight balance audit passed.');
