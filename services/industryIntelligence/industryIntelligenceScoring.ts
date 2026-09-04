import type {
    IndustryDecisionLane,
    IndustryIntelligenceReasonCode,
    IndustryIntelligenceScore,
} from '../../types';
import { hashDeterministicSeed } from '../deterministicRandom';
import { clampIndustryScore, type IndustryIntelligenceContext } from './industryIntelligenceContext';
import { createIndustryForecast, type IndustryForecast } from './industryIntelligenceForecast';
import type { IndustryDecisionOption } from './industryIntelligenceOptions';

export interface EvaluatedIndustryDecisionOption extends IndustryDecisionOption {
    score: IndustryIntelligenceScore;
    reasonCodes: IndustryIntelligenceReasonCode[];
    forecast: IndustryForecast;
}

export interface RejectedIndustryDecisionOption extends IndustryDecisionOption {
    reasonCodes: IndustryIntelligenceReasonCode[];
}

export interface IndustryDecisionEvaluation {
    selected: EvaluatedIndustryDecisionOption | null;
    eligible: EvaluatedIndustryDecisionOption[];
    rejected: RejectedIndustryDecisionOption[];
    affordabilityCeilingMillions: number;
}

const terminal = new Set(['CLOSED', 'SOLD_MERGED', 'DORMANT']);
const uniqueReasons = (reasons: IndustryIntelligenceReasonCode[]) => [...new Set(reasons)].slice(0, 8);

export const getIndustryAffordabilityCeilingMillions = (context: IndustryIntelligenceContext): number => {
    const protectedShare = 0.05 + (100 - clampIndustryScore(context.condition.financialPressure)) / 100 * 0.25;
    return Math.max(0, Math.round(context.condition.cashMillions * protectedShare * 1_000) / 1_000);
};

const eligibilityReasons = (
    context: IndustryIntelligenceContext,
    option: IndustryDecisionOption,
    ceiling: number,
): IndustryIntelligenceReasonCode[] => {
    if (option.actionFamily === 'HOLD') return [];
    const reasons = [...option.hardBlockReasonCodes];
    if (context.controller !== 'AI') reasons.push('PLAYER_CONTROLLED');
    if (terminal.has(context.status)) reasons.push('TERMINAL_COMPANY');
    if (context.condition.spendingRestricted && option.expectedExposureMillions > 0) reasons.push('SPENDING_RESTRICTED');
    if (option.expectedExposureMillions > ceiling) reasons.push('INSUFFICIENT_RUNWAY');
    if (option.requiresCapacity && context.condition.capacityPressure >= 100) reasons.push('INSUFFICIENT_CAPACITY');
    if (option.requiredCapability && (context.capabilities[option.requiredCapability] || 0) <= 0) reasons.push('MISSING_CAPABILITY');
    if (option.commitmentId && context.activeCommitmentIds.includes(option.commitmentId)) reasons.push('DUPLICATE_COMMITMENT');
    return uniqueReasons(reasons);
};

const decisionReasons = (
    context: IndustryIntelligenceContext,
    option: IndustryDecisionOption,
): IndustryIntelligenceReasonCode[] => {
    if (option.actionFamily === 'HOLD') return ['NO_ELIGIBLE_OPTION'];
    const reasons: IndustryIntelligenceReasonCode[] = [];
    if (option.need >= 55) reasons.push('STRATEGIC_NEED');
    if (context.condition.marketOpportunity >= 55) reasons.push('AUDIENCE_OPPORTUNITY');
    if (option.actionFamily.includes('RESEARCH') || option.actionFamily.includes('CAPABILITY')) reasons.push('CAPABILITY_GAP');
    if (option.competitiveValue >= 55) reasons.push('COMPETITIVE_PRESSURE');
    if (option.relationshipValue >= 35) reasons.push('RELATIONSHIP_VALUE');
    if (context.condition.financialPressure >= 55) reasons.push('FINANCIAL_PRESSURE');
    if (context.condition.capacityPressure >= 70) reasons.push('CAPACITY_PRESSURE');
    if (option.fatigue >= 45) reasons.push('FATIGUE_PRESSURE');
    return uniqueReasons(reasons.length ? reasons : ['STRATEGIC_NEED']);
};

export const evaluateIndustryDecisionOptions = (
    context: IndustryIntelligenceContext,
    lane: IndustryDecisionLane,
    options: IndustryDecisionOption[],
): IndustryDecisionEvaluation => {
    const affordabilityCeilingMillions = getIndustryAffordabilityCeilingMillions(context);
    const eligible: EvaluatedIndustryDecisionOption[] = [];
    const rejected: RejectedIndustryDecisionOption[] = [];
    options.forEach(option => {
        const blockers = eligibilityReasons(context, option, affordabilityCeilingMillions);
        if (blockers.length) {
            rejected.push({ ...option, reasonCodes: blockers });
            return;
        }
        const forecast = createIndustryForecast(context, lane, option.optionId);
        const score: IndustryIntelligenceScore = {
            need: clampIndustryScore(option.need),
            strategyFit: clampIndustryScore(option.strategyFit),
            expectedUpside: clampIndustryScore(option.expectedUpside + forecast.error),
            relationshipValue: clampIndustryScore(option.relationshipValue),
            competitiveValue: clampIndustryScore(option.competitiveValue),
            financialRisk: clampIndustryScore(option.financialRisk),
            capacityPressure: clampIndustryScore(context.condition.capacityPressure),
            fatigue: clampIndustryScore(option.fatigue),
            executionRisk: clampIndustryScore(option.executionRisk),
            total: 0,
        };
        score.total = Math.round((score.need + score.strategyFit + score.expectedUpside
            + score.relationshipValue + score.competitiveValue - score.financialRisk
            - score.capacityPressure - score.fatigue - score.executionRisk) * 1_000) / 1_000;
        eligible.push({ ...option, score, reasonCodes: decisionReasons(context, option), forecast });
    });
    eligible.sort((left, right) => right.score.total - left.score.total
        || hashDeterministicSeed(`${context.seed}:${lane}:${context.decisionCycleByLane[lane]}:${left.optionId}`)
        - hashDeterministicSeed(`${context.seed}:${lane}:${context.decisionCycleByLane[lane]}:${right.optionId}`)
        || left.optionId.localeCompare(right.optionId));
    return { selected: eligible[0] || null, eligible, rejected, affordabilityCeilingMillions };
};
