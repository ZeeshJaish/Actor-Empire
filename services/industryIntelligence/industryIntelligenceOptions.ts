import type {
    IndustryCapabilityDimension,
    IndustryDecisionLane,
    IndustryIntelligenceReasonCode,
} from '../../types';
import type { IndustryIntelligenceContext } from './industryIntelligenceContext';

export interface IndustryDecisionOption {
    optionId: string;
    actionFamily: string;
    expectedExposureMillions: number;
    requiresCapacity: boolean;
    requiredCapability: IndustryCapabilityDimension | null;
    commitmentId?: string;
    hardBlockReasonCodes: IndustryIntelligenceReasonCode[];
    need: number;
    strategyFit: number;
    expectedUpside: number;
    relationshipValue: number;
    competitiveValue: number;
    financialRisk: number;
    executionRisk: number;
    fatigue: number;
}

const option = (
    optionId: string,
    actionFamily: string,
    expectedExposureMillions: number,
    signals: Pick<IndustryDecisionOption, 'need' | 'strategyFit' | 'expectedUpside' | 'relationshipValue' | 'competitiveValue' | 'financialRisk' | 'executionRisk' | 'fatigue'>,
    requiredCapability: IndustryCapabilityDimension | null = null,
): IndustryDecisionOption => ({
    optionId,
    actionFamily,
    expectedExposureMillions,
    requiresCapacity: actionFamily !== 'HOLD' && actionFamily !== 'REDUCE_SPEND',
    requiredCapability,
    hardBlockReasonCodes: [],
    ...signals,
});

const holdOption = (lane: IndustryDecisionLane): IndustryDecisionOption => option(
    `hold_${lane.toLowerCase()}`,
    'HOLD',
    0,
    { need: 8, strategyFit: 20, expectedUpside: 5, relationshipValue: 0, competitiveValue: 0, financialRisk: 0, executionRisk: 0, fatigue: 0 },
);

export const createDefaultIndustryDecisionOptions = (
    context: IndustryIntelligenceContext,
    lane: IndustryDecisionLane,
): IndustryDecisionOption[] => {
    const { condition, identity, capabilities } = context;
    const exposureBase = Math.max(1, condition.cashMillions * 0.035);
    const hold = holdOption(lane);
    if (lane === 'CONTENT_STRATEGY') return [
        option('develop_content', 'DEVELOP_CONTENT', exposureBase, {
            need: condition.catalogueNeed, strategyFit: (identity.commercialIntent + identity.prestigeIntent) / 2,
            expectedUpside: condition.marketOpportunity, relationshipValue: 20,
            competitiveValue: condition.competitivePressure, financialRisk: condition.financialPressure,
            executionRisk: 100 - (capabilities.CREATIVE || 50), fatigue: condition.repetitionFatigue,
        }, 'CREATIVE'),
        hold,
    ];
    if (lane === 'PRODUCTION_REVIEW') return [
        option('continue_production', 'CONTINUE_PRODUCTION', exposureBase * 0.65, {
            need: Math.max(25, 100 - condition.capacityPressure), strategyFit: 62,
            expectedUpside: condition.recentResultStrength, relationshipValue: 30,
            competitiveValue: condition.competitivePressure * 0.5, financialRisk: condition.financialPressure,
            executionRisk: 100 - (capabilities.PRODUCTION || 50), fatigue: condition.overextension,
        }, 'PRODUCTION'),
        option('reduce_slate', 'REDUCE_SPEND', 0, {
            need: condition.financialPressure, strategyFit: identity.financialDiscipline,
            expectedUpside: condition.overextension, relationshipValue: 0, competitiveValue: 0,
            financialRisk: 10, executionRisk: 5, fatigue: 0,
        }),
        hold,
    ];
    if (lane === 'RELEASE_REVIEW') return [
        option('prepare_release', 'PREPARE_RELEASE', exposureBase * 0.4, {
            need: condition.catalogueNeed, strategyFit: identity.commercialIntent,
            expectedUpside: condition.recentResultStrength, relationshipValue: 15,
            competitiveValue: condition.competitivePressure, financialRisk: condition.financialPressure * 0.6,
            executionRisk: 100 - (capabilities.MARKETING_DISCOVERY || 50), fatigue: condition.repetitionFatigue,
        }, 'MARKETING_DISCOVERY'),
        hold,
    ];
    if (lane === 'FINANCE_REVIEW') return [
        option('maintain_budget', 'MAINTAIN_BUDGET', 0, {
            need: 100 - condition.financialPressure, strategyFit: identity.financialDiscipline,
            expectedUpside: condition.recentResultStrength, relationshipValue: 0,
            competitiveValue: condition.competitivePressure * 0.25, financialRisk: condition.financialPressure,
            executionRisk: 100 - (capabilities.FINANCE || 50), fatigue: condition.overextension,
        }, 'FINANCE'),
        option('reduce_spend', 'REDUCE_SPEND', 0, {
            need: condition.financialPressure, strategyFit: identity.financialDiscipline,
            expectedUpside: condition.financialPressure, relationshipValue: 0, competitiveValue: 0,
            financialRisk: 5, executionRisk: 8, fatigue: 0,
        }),
        hold,
    ];
    if (lane === 'MARKET_EXPANSION') return [
        option('localize_catalogue', 'LOCALIZE_CATALOGUE', exposureBase * 0.35, {
            need: 100 - (capabilities.LOCALIZATION || 0), strategyFit: identity.growthIntent,
            expectedUpside: condition.marketOpportunity, relationshipValue: 18,
            competitiveValue: condition.competitivePressure, financialRisk: condition.financialPressure,
            executionRisk: 100 - (capabilities.LOCALIZATION || 40), fatigue: condition.overextension,
        }, 'LOCALIZATION'),
        option('enter_market', 'ENTER_MARKET', exposureBase * 0.7, {
            need: condition.marketOpportunity, strategyFit: identity.growthIntent,
            expectedUpside: condition.marketOpportunity, relationshipValue: 10,
            competitiveValue: condition.competitivePressure, financialRisk: condition.financialPressure,
            executionRisk: 100 - (capabilities.DISTRIBUTION_MARKET || 50), fatigue: condition.overextension,
        }, 'DISTRIBUTION_MARKET'),
        hold,
    ];
    const capabilityGap = 100 - Math.max(
        capabilities.TECHNOLOGY || 0,
        capabilities.LOCALIZATION || 0,
        capabilities.DEVELOPMENT || 0,
    );
    return [
        option('research_capability', context.companyKind === 'STREAMING_PLATFORM' ? 'RESEARCH_TECHNOLOGY' : 'INVEST_CAPABILITY', exposureBase * 0.55, {
            need: capabilityGap, strategyFit: identity.growthIntent,
            expectedUpside: condition.marketOpportunity, relationshipValue: 0,
            competitiveValue: condition.competitivePressure, financialRisk: condition.financialPressure,
            executionRisk: 100 - (capabilities.FINANCE || 50), fatigue: condition.overextension,
        }, context.companyKind === 'STREAMING_PLATFORM' ? 'TECHNOLOGY' : 'DEVELOPMENT'),
        ...(context.companyKind === 'STREAMING_PLATFORM' ? [option('research_localization', 'RESEARCH_LOCALIZATION', exposureBase * 0.4, {
            need: 100 - (capabilities.LOCALIZATION || 0), strategyFit: identity.growthIntent,
            expectedUpside: condition.marketOpportunity, relationshipValue: 15,
            competitiveValue: condition.competitivePressure, financialRisk: condition.financialPressure,
            executionRisk: 100 - (capabilities.LOCALIZATION || 40), fatigue: condition.overextension,
        }, 'LOCALIZATION')] : []),
        hold,
    ];
};
