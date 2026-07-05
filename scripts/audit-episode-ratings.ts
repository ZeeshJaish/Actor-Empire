import { buildEpisodeRatingsStory, generateEpisodeRatings, getEpisodeRatingsGameplayImpact, summarizeEpisodeRatings } from '../services/episodeRatings';
import type { ActiveRelease, ProjectDetails } from '../types';

type ProjectDetailsOverrides = Partial<Omit<ProjectDetails, 'hiddenStats'>> & {
    hiddenStats?: Partial<ProjectDetails['hiddenStats']>;
};

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const makeProjectDetails = (overrides: ProjectDetailsOverrides = {}): ProjectDetails => ({
    title: 'Audit Season',
    type: 'SERIES',
    description: 'A controlled audit series.',
    studioId: 'ARTISAN_PICTURES',
    subtype: 'STANDALONE',
    genre: 'DRAMA',
    budgetTier: 'HIGH',
    estimatedBudget: 80_000_000,
    visibleHype: 'HIGH',
    directorName: 'Audit Director',
    visibleDirectorTier: 'A-List',
    visibleScriptBuzz: 'Hot',
    visibleCastStrength: 'Strong',
    episodes: 8,
    ...overrides,
    hiddenStats: {
        scriptQuality: 86,
        directorQuality: 82,
        castingStrength: 78,
        distributionPower: 76,
        rawHype: 72,
        qualityScore: 84,
        prestigeBonus: 10,
        castDepthScore: 82,
        ...(overrides.hiddenStats || {}),
    },
});

const makeRelease = (overrides: Partial<Omit<ActiveRelease, 'projectDetails'>> & { projectDetails?: ProjectDetailsOverrides } = {}): ActiveRelease => {
    const { projectDetails, streaming, ...restOverrides } = overrides;
    return {
        id: 'episode_rating_audit_release',
        name: 'Audit Season',
        type: 'SERIES',
        roleType: 'LEAD',
        projectDetails: makeProjectDetails(projectDetails),
        distributionPhase: 'STREAMING',
        weekNum: 6,
        weeklyGross: [],
        totalGross: 0,
        budget: 80_000_000,
        status: 'RUNNING',
        imdbRating: 8.6,
        productionPerformance: 82,
        streaming: streaming || {
            platformId: 'NETFLIX',
            weekOnPlatform: 6,
            totalViews: 72_000_000,
            weeklyViews: [14_000_000, 16_000_000, 13_000_000, 11_000_000, 9_000_000, 9_000_000],
            isLeaving: false,
        },
        streamingRevenue: 118_000_000,
        ...restOverrides,
    };
};

const strong = generateEpisodeRatings(makeRelease());
assert(strong.length === 1, 'A released series should receive one season row set.');
assert(strong[0].season === 1, 'The first generated matrix should describe season 1.');
assert(strong[0].episodes.length === 8, 'Episode count should follow ProjectDetails.episodes.');
assert(strong[0].episodes.every(item => item.rating >= 1 && item.rating <= 10), 'Every episode rating should stay in the 1-10 range.');
const strongAverage = strong[0].episodes.reduce((sum, item) => sum + item.rating, 0) / strong[0].episodes.length;
assert(strongAverage > 8.0 && strongAverage < 9.3, `Strong season average should sit near the IMDb score, got ${strongAverage.toFixed(2)}.`);
const strongSummary = summarizeEpisodeRatings(strong);
const strongImpact = getEpisodeRatingsGameplayImpact(strong);
assert(strongSummary.averageRating >= 8, 'Strong scorecard summary should preserve the average rating signal.');
assert(strongImpact.renewalModifier > 0, 'Strong episode ratings should improve renewal odds.');
assert(strongImpact.studioReputationModifier >= 1, 'Strong episode ratings should improve studio reputation.');
assert(strongImpact.platformConfidenceModifier > 0, 'Strong episode ratings should improve platform confidence.');

const weak = generateEpisodeRatings(makeRelease({
    imdbRating: 5.4,
    productionPerformance: 48,
    streaming: {
        platformId: 'HULU',
        weekOnPlatform: 6,
        totalViews: 4_500_000,
        weeklyViews: [1_500_000, 1_000_000, 700_000, 500_000, 450_000, 350_000],
        isLeaving: true,
    },
    projectDetails: {
        hiddenStats: {
            scriptQuality: 42,
            directorQuality: 48,
            castingStrength: 44,
            distributionPower: 38,
            rawHype: 35,
            qualityScore: 46,
            prestigeBonus: 0,
            castDepthScore: 45,
        },
        episodes: 6,
    },
}));
const weakAverage = weak[0].episodes.reduce((sum, item) => sum + item.rating, 0) / weak[0].episodes.length;
assert(weak[0].episodes.length === 6, 'Weak season should still follow its configured episode count.');
assert(weakAverage < 6.2, `Weak season should not get inflated into good scores, got ${weakAverage.toFixed(2)}.`);
const weakImpact = getEpisodeRatingsGameplayImpact(weak);
assert(weakImpact.renewalModifier < 0, 'Weak episode ratings should hurt renewal odds.');
assert(weakImpact.franchiseValueModifier < 0, 'Weak episode ratings should hurt franchise value.');

const story = buildEpisodeRatingsStory({
    projectId: 'episode_rating_audit_release',
    title: 'Audit Season',
    ratings: strong,
    week: 12,
    year: 24,
});
assert(story?.news.headline.includes('Audit Season'), 'Episode ratings story should create a project-specific headline.');
assert(story?.impact.averageRating >= 8, 'Episode ratings story should preserve gameplay impact details.');

const movie = generateEpisodeRatings(makeRelease({
    type: 'MOVIE',
    projectDetails: {
        type: 'MOVIE',
        episodes: undefined,
    },
}));
assert(movie.length === 0, 'Movie releases should not receive episode ratings.');

console.log('Episode ratings audit passed.');
