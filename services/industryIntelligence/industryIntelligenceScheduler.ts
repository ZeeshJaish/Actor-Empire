import type {
    IndustryDecisionLane,
    IndustryIntelligenceState,
} from '../../types';
import { hashDeterministicSeed } from '../deterministicRandom';
import type { IndustryIntelligenceContext } from './industryIntelligenceContext';
import {
    INDUSTRY_DECISION_LANES,
    INDUSTRY_INTELLIGENCE_PROCESSED_KEY_LIMIT,
} from './industryIntelligenceState';

const LANE_CADENCE_WEEKS: Record<IndustryDecisionLane, number> = {
    CONTENT_STRATEGY: 6,
    PRODUCTION_REVIEW: 5,
    RELEASE_REVIEW: 6,
    FINANCE_REVIEW: 4,
    MARKET_EXPANSION: 13,
    CAPABILITY_GROWTH: 12,
};

export const getDueIndustryDecisionLanes = (
    context: IndustryIntelligenceContext,
): IndustryDecisionLane[] => INDUSTRY_DECISION_LANES.filter(lane => {
    const dueWeek = context.nextDueAbsoluteWeek[lane];
    return dueWeek !== null && dueWeek <= context.absoluteWeek;
});

export const getIndustryDecisionProcessedKey = (
    state: IndustryIntelligenceState,
    lane: IndustryDecisionLane,
    absoluteWeek: number,
): string => `${state.companyKind}:${state.companyId}:${lane}:${Math.max(0, Math.round(absoluteWeek))}`;

export const advanceIndustryDecisionLane = (
    state: IndustryIntelligenceState,
    lane: IndustryDecisionLane,
    absoluteWeek: number,
): IndustryIntelligenceState => {
    const week = Math.max(0, Math.round(absoluteWeek));
    const processedKey = getIndustryDecisionProcessedKey(state, lane, week);
    if (state.processedKeys.includes(processedKey)) return state;
    const nextCycle = state.decisionCycleByLane[lane] + 1;
    const baseCadence = LANE_CADENCE_WEEKS[lane];
    const cadenceVariation = hashDeterministicSeed(`${state.seed}:${lane}:${nextCycle}`) % 2;
    return {
        ...state,
        lastProcessedAbsoluteWeek: Math.max(state.lastProcessedAbsoluteWeek, week),
        nextDueAbsoluteWeek: {
            ...state.nextDueAbsoluteWeek,
            [lane]: week + baseCadence + cadenceVariation,
        },
        decisionCycleByLane: {
            ...state.decisionCycleByLane,
            [lane]: nextCycle,
        },
        processedKeys: [...state.processedKeys, processedKey].slice(-INDUSTRY_INTELLIGENCE_PROCESSED_KEY_LIMIT),
    };
};
