import { calculateIMDbRating } from '../services/roleLogic';
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

console.log('IMDb and Greenlight balance audit passed.');
