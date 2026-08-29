import assert from 'node:assert/strict';
import type { IndustryProject, PlatformAiContentPlan } from '../types';
import { calculatePlatformAiStreamingPerformance } from '../services/platformAi/platformAiRelease';
import { recordPlatformAiReleaseMemory } from '../services/platformAi/platformAiMemory';
import * as platformAiMemoryModule from '../services/platformAi/platformAiMemory';
import * as platformAiPlanningModule from '../services/platformAi/platformAiPlanning';
import * as platformAiTalentModule from '../services/platformAi/platformAiTalent';
import { normalizePlatformAiState } from '../services/platformAi/platformAiState';
import { createPlatformAiFixture } from './helpers/platformAiFixture';

const readinessModule = await import('../services/platformAi/platformAiReleaseReadiness');
const choosePlatformAiPremiere = (readinessModule as any).choosePlatformAiPremiere;

assert.equal(
    typeof choosePlatformAiPremiere,
    'function',
    'Phase 6 must expose a deterministic strategic premiere selector.',
);

const baseInput = {
    playerId: 'phase-6-player',
    platformId: 'NETFLIX',
    planId: 'prestige-drama-plan',
    absoluteWeek: 100,
    strategyCycle: 4,
    strategySkill: 9,
    genre: 'DRAMA',
    targetAudience: 'PG-13',
    commercialForecast: 76,
    prestigeForecast: 90,
    marketingReserveMillions: 30,
};

const congestionChoice = choosePlatformAiPremiere({
    ...baseInput,
    candidates: [
        {
            premiereAtAbsoluteWeek: 101,
            latestRequiredAbsoluteWeek: 101,
            rightsExpireAtAbsoluteWeek: 150,
            scheduledTitleCount: 1,
            sameGenreCount: 1,
            sameAudienceCount: 2,
        },
        {
            premiereAtAbsoluteWeek: 102,
            latestRequiredAbsoluteWeek: 102,
            rightsExpireAtAbsoluteWeek: 150,
            scheduledTitleCount: 0,
            sameGenreCount: 0,
            sameAudienceCount: 0,
        },
    ],
});
assert.equal(congestionChoice?.premiereAtAbsoluteWeek, 102, 'The AI should avoid severe self-cannibalization.');
assert.deepEqual(
    choosePlatformAiPremiere({
        ...baseInput,
        candidates: [
            {
                premiereAtAbsoluteWeek: 101,
                latestRequiredAbsoluteWeek: 101,
                rightsExpireAtAbsoluteWeek: 150,
                scheduledTitleCount: 1,
                sameGenreCount: 1,
                sameAudienceCount: 2,
            },
            {
                premiereAtAbsoluteWeek: 102,
                latestRequiredAbsoluteWeek: 102,
                rightsExpireAtAbsoluteWeek: 150,
                scheduledTitleCount: 0,
                sameGenreCount: 0,
                sameAudienceCount: 0,
            },
        ],
    }),
    congestionChoice,
    'Equivalent scheduling inputs must replay identically.',
);

const awardsChoice = choosePlatformAiPremiere({
    ...baseInput,
    absoluteWeek: 132,
    candidates: [
        {
            premiereAtAbsoluteWeek: 133,
            latestRequiredAbsoluteWeek: 133,
            rightsExpireAtAbsoluteWeek: 190,
            scheduledTitleCount: 0,
            sameGenreCount: 0,
            sameAudienceCount: 0,
        },
        {
            premiereAtAbsoluteWeek: 145,
            latestRequiredAbsoluteWeek: 145,
            rightsExpireAtAbsoluteWeek: 190,
            scheduledTitleCount: 0,
            sameGenreCount: 0,
            sameAudienceCount: 0,
        },
    ],
});
assert.equal(awardsChoice?.premiereAtAbsoluteWeek, 145, 'A prestige-heavy title should value an awards-season launch.');
assert.ok(awardsChoice?.reasons.includes('AWARDS_POSITIONING'));

const performancePlayer = createPlatformAiFixture();
const performanceWorld = structuredClone(performancePlayer.world);
performanceWorld.platforms!.NETFLIX = normalizePlatformAiState(
    performanceWorld.platforms!.NETFLIX,
    performancePlayer.id,
    200,
);
const performanceProject: IndustryProject = {
    id: 'phase-6-performance-project',
    title: 'The Long Signal',
    genre: 'DRAMA',
    mediaType: 'SERIES',
    targetAudience: 'PG-13',
    studioId: 'WARNER_BROS',
    budgetTier: 'HIGH',
    quality: 84,
    rating: 8.4,
    boxOffice: 0,
    year: 4,
    weekReleased: 42,
    leadActorId: 'phase-6-lead',
    leadActorName: 'Phase Six Lead',
    directorId: 'phase-6-director',
    directorName: 'Phase Six Director',
    reviews: 'A prestige streaming fixture.',
    releaseStrategy: 'STREAMING_ONLY',
    originalLanguageId: 'english',
};
performanceWorld.projects.push(performanceProject);
const performancePlan = {
    id: 'phase-6-performance-plan',
    platformId: 'NETFLIX',
    genre: 'DRAMA',
    targetAudience: 'PG-13',
    releaseCountryIds: ['US', 'JP'],
    localizationLevel: 'NONE',
    releasePattern: 'SERIES_WEEKLY',
    marketingReserveMillions: 35,
    forecast: { strategic: 82, creative: 84, commercial: 80, prestige: 88, risk: 28 },
} as PlatformAiContentPlan;
const regionalPerformance = calculatePlatformAiStreamingPerformance({
    player: performancePlayer,
    world: performanceWorld,
    platformId: 'NETFLIX',
    plan: performancePlan,
    project: performanceProject,
    absoluteWeek: 210,
});
assert.equal((regionalPerformance as any).regionalResults?.length, 2, 'Performance must retain one row per release country.');
assert.ok((regionalPerformance as any).regionalResults.every((row: any) => (
    row.countryId && row.viewsMillions >= 0 && row.commercialScore >= 0 && row.commercialScore <= 100
)));
assert.ok((regionalPerformance as any).acquiredSubscribersMillions >= 0);
assert.ok((regionalPerformance as any).retainedSubscribersMillions >= 0);
assert.ok((regionalPerformance as any).churnedSubscribersMillions >= 0);
assert.equal(
    Math.round((
        (regionalPerformance as any).acquiredSubscribersMillions
        + (regionalPerformance as any).retainedSubscribersMillions
        - (regionalPerformance as any).churnedSubscribersMillions
    ) * 1_000) / 1_000,
    regionalPerformance.subscriberImpactMillions,
    'Subscriber acquisition, retention and churn must reconcile to the exact Phase 5 settlement.',
);
assert.ok(Number.isFinite((regionalPerformance as any).catalogueStrengthDelta));
assert.deepEqual(
    calculatePlatformAiStreamingPerformance({
        player: performancePlayer,
        world: performanceWorld,
        platformId: 'NETFLIX',
        plan: performancePlan,
        project: performanceProject,
        absoluteWeek: 210,
    }),
    regionalPerformance,
    'Regional release performance must replay deterministically.',
);

const learnedWorld = (recordPlatformAiReleaseMemory as any)({
    player: performancePlayer,
    world: performanceWorld,
    platformId: 'NETFLIX',
    project: performanceProject,
    plan: performancePlan,
    performance: regionalPerformance,
    absoluteWeek: 210,
}).world;
const learnedAi = learnedWorld.platforms!.NETFLIX.ai as any;
assert.ok(learnedAi.regionalMemory, 'Phase 6 must materialize regional release memory.');
assert.equal(learnedAi.regionalMemory.US.releases, 1, 'The AI must learn from each observed release country.');
assert.equal(learnedAi.regionalMemory.JP.releases, 1);
assert.equal(learnedAi.localizationMemory.NONE.releases, 1, 'The AI must remember the localization approach.');
assert.equal(learnedAi.talentPairMemory['phase-6-lead:phase-6-director'].releases, 1);
assert.equal(learnedAi.releasePatternMemory.SERIES_WEEKLY.releases, 1);
assert.ok(Math.abs(
    learnedAi.regionalMemory.US.averageCommercialScore
    - regionalPerformance.regionalResults.find(row => row.countryId === 'US')!.commercialScore
) <= 0.001);

const deriveProductionOutcomeMemory = (platformAiMemoryModule as any).derivePlatformAiProductionOutcomeMemory;
assert.equal(typeof deriveProductionOutcomeMemory, 'function', 'Phase 6 must expose bounded production-outcome learning.');
const productionOutcomeMemory = deriveProductionOutcomeMemory({
    platformId: 'NETFLIX',
    productions: [
        {
            id: 'phase-6-delayed-delivery',
            commissioningPlatformId: 'NETFLIX',
            status: 'DELIVERED',
            updatedAtAbsoluteWeek: 205,
            aiExecution: { delayWeeks: 4 },
        },
        {
            id: 'phase-6-cancelled-production',
            commissioningPlatformId: 'NETFLIX',
            status: 'CANCELLED',
            updatedAtAbsoluteWeek: 206,
            aiExecution: { delayWeeks: 2 },
        },
        {
            id: 'another-platform-production',
            commissioningPlatformId: 'HULU',
            status: 'DELIVERED',
            updatedAtAbsoluteWeek: 207,
            aiExecution: { delayWeeks: 0 },
        },
    ],
});
assert.deepEqual(productionOutcomeMemory, {
    observedProductions: 2,
    deliveredProductions: 1,
    delayedProductions: 2,
    cancelledProductions: 1,
    averageDelayWeeks: 3,
    observedProductionIds: ['phase-6-delayed-delivery', 'phase-6-cancelled-production'],
});

const getPlatformAiCandidateLearningAdjustment = (platformAiPlanningModule as any).getPlatformAiCandidateLearningAdjustment;
assert.equal(typeof getPlatformAiCandidateLearningAdjustment, 'function', 'Future planning must consume bounded release learning.');
const learningPlatform = structuredClone(learnedWorld.platforms!.NETFLIX);
learningPlatform.ai!.genreMemory.DRAMA = { releases: 4, averageQuality: 84, averageCommercialScore: 92 };
learningPlatform.ai!.audienceMemory['PG-13'] = { releases: 4, averageCommercialScore: 90, averageSubscriberImpact: 0.4 };
learningPlatform.ai!.regionalMemory.US = { releases: 4, averageCommercialScore: 91, averageSubscriberImpact: 0.3 };
const learnedCandidate = {
    id: 'learned-drama-candidate',
    genre: 'DRAMA',
    targetAudience: 'PG-13',
} as any;
const positiveAdjustment = getPlatformAiCandidateLearningAdjustment(learningPlatform, learnedCandidate);
assert.ok(positiveAdjustment > 0 && positiveAdjustment <= 12, 'Repeated success must create a bounded positive strategy adjustment.');
learningPlatform.ai!.genreMemory.DRAMA.averageCommercialScore = 42;
learningPlatform.ai!.audienceMemory['PG-13']!.averageCommercialScore = 45;
learningPlatform.ai!.regionalMemory.US.averageCommercialScore = 48;
const negativeAdjustment = getPlatformAiCandidateLearningAdjustment(learningPlatform, learnedCandidate);
assert.ok(negativeAdjustment < 0 && negativeAdjustment >= -12, 'Repeated failure must create a bounded negative strategy adjustment.');

const getPlatformAiTalentPairMemoryModifier = (platformAiTalentModule as any).getPlatformAiTalentPairMemoryModifier;
assert.equal(typeof getPlatformAiTalentPairMemoryModifier, 'function', 'Talent hiring must consume actor-director combination memory.');
const rememberedPairBonus = getPlatformAiTalentPairMemoryModifier(
    learnedAi.releaseMemory,
    'phase-6-lead',
    'phase-6-director',
);
assert.ok(rememberedPairBonus > 0 && rememberedPairBonus <= 10);
assert.equal(
    getPlatformAiTalentPairMemoryModifier(learnedAi.releaseMemory, 'phase-6-lead', 'different-director'),
    0,
    'Individual actor success must not fabricate success for an untested pairing.',
);

console.log('Platform AI Phase 6 audit passed.');
