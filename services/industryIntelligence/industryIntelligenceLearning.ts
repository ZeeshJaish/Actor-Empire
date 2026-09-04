import type {
    IndustryCapabilityDimension,
    IndustryDecisionLane,
    IndustryIntelligenceState,
} from '../../types';
import { createDeterministicId } from '../deterministicRandom';
import { clampIndustryScore, type IndustryIntelligenceContext } from './industryIntelligenceContext';
import {
    INDUSTRY_INTELLIGENCE_LEARNING_LIMIT,
    INDUSTRY_INTELLIGENCE_PROCESSED_KEY_LIMIT,
} from './industryIntelligenceState';

export interface IndustryLearningOutcome {
    evidenceId: string;
    absoluteWeek: number;
    lane: IndustryDecisionLane;
    outcomeScore: number;
    capability: IndustryCapabilityDimension;
    capabilityDelta: number;
    momentumDelta: number;
    repetitionDelta?: number;
    franchiseDelta?: number;
}

export interface IndustryFatigueSnapshot {
    repetition: number;
    franchise: number;
    overextension: number;
    total: number;
}

export const recordIndustryLearningOutcome = (
    state: IndustryIntelligenceState,
    outcome: IndustryLearningOutcome,
): IndustryIntelligenceState => {
    const evidenceId = String(outcome.evidenceId || '').trim();
    if (!evidenceId || state.learning.processedEvidenceIds.includes(evidenceId)) return state;
    const outcomeScore = clampIndustryScore(outcome.outcomeScore, 50);
    const previousAverage = state.learning.averageOutcomeByLane[outcome.lane];
    const average = previousAverage === undefined
        ? outcomeScore
        : Math.round((previousAverage * 0.8 + outcomeScore * 0.2) * 1_000) / 1_000;
    const existingProgress = clampIndustryScore(state.learning.capabilityProgress[outcome.capability], 0);
    const diminishingGain = Math.max(-existingProgress, Number(outcome.capabilityDelta) || 0)
        * Math.max(0, 1 - existingProgress / 100);
    const capabilityProgress = clampIndustryScore(existingProgress + diminishingGain, existingProgress);
    const sample = {
        id: createDeterministicId('industry_learning', state.companyId, evidenceId),
        evidenceId,
        absoluteWeek: Math.max(0, Math.round(Number(outcome.absoluteWeek) || 0)),
        lane: outcome.lane,
        outcomeScore,
        capabilityDelta: Math.round(diminishingGain * 1_000) / 1_000,
        momentumDelta: Number.isFinite(Number(outcome.momentumDelta)) ? Number(outcome.momentumDelta) : 0,
    };
    return {
        ...state,
        momentum: clampIndustryScore(state.momentum + sample.momentumDelta, state.momentum),
        learning: {
            ...state.learning,
            averageOutcomeByLane: { ...state.learning.averageOutcomeByLane, [outcome.lane]: average },
            capabilityProgress: { ...state.learning.capabilityProgress, [outcome.capability]: capabilityProgress },
            repetitionFatigue: clampIndustryScore(state.learning.repetitionFatigue + (Number(outcome.repetitionDelta) || 0)),
            franchiseFatigue: clampIndustryScore(state.learning.franchiseFatigue + (Number(outcome.franchiseDelta) || 0)),
            samples: [...state.learning.samples, sample].slice(-INDUSTRY_INTELLIGENCE_LEARNING_LIMIT),
            processedEvidenceIds: [...state.learning.processedEvidenceIds, evidenceId]
                .slice(-INDUSTRY_INTELLIGENCE_PROCESSED_KEY_LIMIT),
        },
    };
};

export const coolIndustryMomentum = (
    state: IndustryIntelligenceState,
    context: IndustryIntelligenceContext,
    absoluteWeek: number,
): IndustryIntelligenceState => {
    const neutral = clampIndustryScore(context.identity.neutralMomentum, 50);
    const elapsed = Math.max(0, Math.round(absoluteWeek) - state.lastProcessedAbsoluteWeek);
    if (!elapsed || state.momentum === neutral) return state;
    const coolingShare = Math.min(0.72, elapsed * 0.055);
    const momentum = Math.round((state.momentum + (neutral - state.momentum) * coolingShare) * 1_000) / 1_000;
    return { ...state, momentum: clampIndustryScore(momentum, neutral) };
};

export const deriveIndustryFatigue = (
    context: IndustryIntelligenceContext,
): IndustryFatigueSnapshot => {
    const repetition = clampIndustryScore(context.condition.repetitionFatigue);
    const franchise = clampIndustryScore(context.condition.franchiseFatigue);
    const overextension = clampIndustryScore(context.condition.overextension);
    return {
        repetition,
        franchise,
        overextension,
        total: Math.round(Math.min(100, repetition * 0.45 + franchise * 0.2 + overextension * 0.35) * 1_000) / 1_000,
    };
};
