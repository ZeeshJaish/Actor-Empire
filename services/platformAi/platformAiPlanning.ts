import type { PlatformId, PlatformState, Player } from '../../types';
import { createDeterministicRng } from '../deterministicRandom';
import type { PlatformAiContentCandidate } from './platformAiContentSourcing';
import { getPlatformAiSpendingRestrictions } from './platformAiFinancing';

export interface ChoosePlatformContentCandidateInput {
    player: Pick<Player, 'id'>;
    platformId: PlatformId;
    absoluteWeek: number;
    strategyCycle: number;
    strategySkill: number;
    candidates: PlatformAiContentCandidate[];
    platform?: PlatformState;
}

const forecastErrorAmplitude = (strategySkill: number): number => {
    const bounded = Math.max(7, Math.min(10, strategySkill));
    return 0.18 - ((bounded - 7) / 3) * 0.14;
};

const beliefConfidence = (releases: number): number => Math.min(1, Math.max(0, releases) / 4);

/** Converts readable, bounded beliefs into a small future-candidate score adjustment. */
export const getPlatformAiCandidateLearningAdjustment = (
    platform: PlatformState,
    candidate: Pick<PlatformAiContentCandidate, 'genre' | 'targetAudience'>,
): number => {
    const ai = platform.ai;
    if (!ai) return 0;
    const genre = ai.genreMemory[candidate.genre];
    const audience = ai.audienceMemory[candidate.targetAudience];
    const activeCountryIds = new Set(ai.marketOperations
        .filter(operation => operation.status === 'ACTIVE' && operation.countryId)
        .map(operation => operation.countryId!));
    const regionalRows = Object.entries(ai.regionalMemory)
        .filter(([countryId]) => activeCountryIds.has(countryId))
        .map(([, belief]) => belief);
    const genreAdjustment = genre
        ? ((genre.averageCommercialScore - 75) / 25) * 5 * beliefConfidence(genre.releases)
        : 0;
    const audienceAdjustment = audience
        ? ((audience.averageCommercialScore - 75) / 25) * 3 * beliefConfidence(audience.releases)
        : 0;
    const regionalAdjustment = regionalRows.length
        ? regionalRows.reduce((sum, belief) => (
            sum + ((belief.averageCommercialScore - 75) / 25) * 2 * beliefConfidence(belief.releases)
        ), 0) / regionalRows.length
        : 0;
    const productionMemory = ai.productionOutcomeMemory;
    const productionPenalty = productionMemory.observedProductions
        ? Math.min(2.5, productionMemory.cancelledProductions * 0.35 + productionMemory.averageDelayWeeks * 0.12)
        : 0;
    const lowerSkillOverreaction = 1 + Math.max(0, 10 - ai.competence.strategy) * 0.08;
    return Math.round(Math.max(-12, Math.min(12,
        (genreAdjustment + audienceAdjustment + regionalAdjustment - productionPenalty) * lowerSkillOverreaction,
    )) * 100) / 100;
};

export const choosePlatformContentCandidate = (
    input: ChoosePlatformContentCandidateInput,
): PlatformAiContentCandidate | null => {
    if (input.platform?.ai?.status !== undefined && input.platform.ai.status !== 'ACTIVE') return null;
    if (input.platform && getPlatformAiSpendingRestrictions(input.platform, input.absoluteWeek).blocksNewGreenlights) return null;
    if (input.candidates.length === 0) return null;
    const amplitude = forecastErrorAmplitude(input.strategySkill);
    const ranked = input.candidates
        .map(candidate => {
            const errorRng = createDeterministicRng([
                input.player.id,
                input.platformId,
                input.absoluteWeek,
                input.strategyCycle,
                'CONTENT_FORECAST',
                candidate.id,
            ].join(':'));
            const error = (errorRng() * 2 - 1) * amplitude;
            const learnedAdjustment = input.platform
                ? getPlatformAiCandidateLearningAdjustment(input.platform, candidate)
                : 0;
            return {
                candidate,
                adjustedScore: Math.max(0.01, (candidate.scores.total + learnedAdjustment) * (1 + error)),
            };
        })
        .sort((left, right) => (
            right.adjustedScore - left.adjustedScore || left.candidate.id.localeCompare(right.candidate.id)
        ))
        .slice(0, 3);
    const totalWeight = ranked.reduce((sum, item) => sum + item.adjustedScore, 0);
    const choiceRng = createDeterministicRng([
        input.player.id,
        input.platformId,
        input.absoluteWeek,
        input.strategyCycle,
        'CONTENT_SELECTION',
    ].join(':'));
    let cursor = choiceRng() * totalWeight;
    for (const item of ranked) {
        cursor -= item.adjustedScore;
        if (cursor <= 0) return item.candidate;
    }
    return ranked[ranked.length - 1]?.candidate || null;
};
