import { calculateProductionRiskProfile } from '../services/productionRisk';
import type { ProjectDetails, SeasonEpisodeRatings } from '../types';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const makeRatings = (season: number, values: number[]): SeasonEpisodeRatings => {
    const averageRating = Math.round((values.reduce((sum, rating) => sum + rating, 0) / values.length) * 10) / 10;
    return {
        season,
        averageRating,
        verdict: averageRating >= 8.2 ? 'GREAT' : averageRating >= 7 ? 'GOOD' : averageRating >= 5.8 ? 'REGULAR' : 'BAD',
        episodes: values.map((rating, index) => ({ episode: index + 1, rating })),
    };
};

const makeProject = (overrides: Partial<ProjectDetails> = {}): ProjectDetails => ({
    title: 'Audit Project',
    type: 'MOVIE',
    description: 'Risk audit project.',
    studioId: 'ARTISAN_PICTURES',
    subtype: 'STANDALONE',
    genre: 'ACTION',
    budgetTier: 'HIGH',
    estimatedBudget: 120_000_000,
    visibleHype: 'HIGH',
    directorName: 'Audit Director',
    visibleDirectorTier: 'A-List',
    visibleScriptBuzz: 'Hot',
    visibleCastStrength: 'Strong',
    castList: [],
    ...overrides,
    hiddenStats: {
        scriptQuality: 72,
        directorQuality: 72,
        castingStrength: 72,
        distributionPower: 72,
        rawHype: 72,
        qualityScore: 72,
        prestigeBonus: 0,
        castDepthScore: 72,
        ...(overrides.hiddenStats || {}),
    },
});

const expensiveWeak = calculateProductionRiskProfile(makeProject({
    title: 'Overpriced Weak Action',
    estimatedBudget: 210_000_000,
    budgetTier: 'BLOCKBUSTER',
    castList: [
        { id: 'star_1', name: 'Costly Star', role: 'Lead', roleType: 'LEAD', actorId: 'star_1', salary: 85_000_000, status: 'CONFIRMED' },
        { id: 'star_2', name: 'Costly Support', role: 'Support', roleType: 'SUPPORTING', actorId: 'star_2', salary: 45_000_000, status: 'CONFIRMED' },
    ] as any,
    hiddenStats: {
        scriptQuality: 38,
        directorQuality: 44,
        castingStrength: 61,
        distributionPower: 70,
        rawHype: 86,
        qualityScore: 42,
        prestigeBonus: 0,
        castDepthScore: 38,
    },
}), { budget: 210_000_000, imdbRating: 5.4, productionPerformance: 46 });
assert(expensiveWeak.label === 'Dangerous' || expensiveWeak.label === 'Risky', 'Expensive weak films should be flagged as risky.');
assert(expensiveWeak.theatricalDemandMultiplier < 0.82, `Expensive weak films should lose demand, got ${expensiveWeak.theatricalDemandMultiplier}.`);
assert(expensiveWeak.platformBidMultiplier < 0.8, `Expensive weak films should not get a full streaming rescue, got ${expensiveWeak.platformBidMultiplier}.`);

const smartMidBudget = calculateProductionRiskProfile(makeProject({
    title: 'Smart Mid-Budget Hit',
    genre: 'THRILLER',
    budgetTier: 'MID',
    estimatedBudget: 34_000_000,
    castList: [
        { id: 'lead', name: 'Good Lead', role: 'Lead', roleType: 'LEAD', actorId: 'lead', salary: 6_000_000, status: 'CONFIRMED' },
    ] as any,
    hiddenStats: {
        scriptQuality: 88,
        directorQuality: 82,
        castingStrength: 74,
        distributionPower: 68,
        rawHype: 66,
        qualityScore: 86,
        prestigeBonus: 0,
        castDepthScore: 80,
    },
}), { budget: 34_000_000, imdbRating: 8.2, productionPerformance: 83 });
assert(smartMidBudget.label === 'Upside' || smartMidBudget.label === 'Prestige Shield', 'Smart mid-budget films should have upside.');
assert(smartMidBudget.theatricalDemandMultiplier > 1.03, `Smart mid-budget films should gain demand, got ${smartMidBudget.theatricalDemandMultiplier}.`);

const weakSeries = calculateProductionRiskProfile(makeProject({
    title: 'Weak Series',
    type: 'SERIES',
    genre: 'CRIME',
    episodeRatings: [makeRatings(1, [5.8, 5.9, 6.1, 5.7, 6.0, 5.6])],
}), { budget: 70_000_000, imdbRating: 6.2, productionPerformance: 58 });
assert(weakSeries.streamingViewMultiplier < 0.9, `Weak episode ratings should hurt streaming demand, got ${weakSeries.streamingViewMultiplier}.`);

const prestigeSeries = calculateProductionRiskProfile(makeProject({
    title: 'Prestige Series',
    type: 'SERIES',
    genre: 'DRAMA',
    episodeRatings: [makeRatings(1, [8.8, 9.0, 9.1, 8.9, 9.2, 9.0])],
    hiddenStats: {
        scriptQuality: 88,
        directorQuality: 84,
        castingStrength: 78,
        distributionPower: 76,
        rawHype: 74,
        qualityScore: 87,
        prestigeBonus: 12,
        castDepthScore: 82,
    },
}), { budget: 70_000_000, imdbRating: 8.9, productionPerformance: 86 });
assert(prestigeSeries.streamingViewMultiplier > weakSeries.streamingViewMultiplier + 0.2, 'Strong episode ratings should clearly beat weak series demand.');
assert(prestigeSeries.episodeScoreModifier > 0, 'Strong episode ratings should create a positive series modifier.');

const crowdedSelfRunSlate = calculateProductionRiskProfile(makeProject({
    title: 'Crowded Self-Run Slate',
    genre: 'DRAMA',
    budgetTier: 'MID',
    estimatedBudget: 32_000_000,
    hiddenStats: {
        scriptQuality: 82,
        directorQuality: 81,
        castingStrength: 76,
        distributionPower: 70,
        rawHype: 68,
        qualityScore: 82,
        prestigeBonus: 0,
        castDepthScore: 76,
        selfRunProduction: true,
        studioSlateFatigueScore: 56,
        studioSlateFatigueLabel: 'FATIGUED',
    },
}), { budget: 32_000_000, imdbRating: 8.1, productionPerformance: 81 });
assert(crowdedSelfRunSlate.theatricalDemandMultiplier < smartMidBudget.theatricalDemandMultiplier, 'A crowded self-run slate should lose theatrical demand against an otherwise healthy lean project.');
assert(crowdedSelfRunSlate.platformBidMultiplier < smartMidBudget.platformBidMultiplier, 'Platform bids should account for audience slate fatigue.');
assert(crowdedSelfRunSlate.notes.includes('audience slate fatigue'), 'Slate fatigue should explain its market downside.');

console.log('Production risk audit passed.');
