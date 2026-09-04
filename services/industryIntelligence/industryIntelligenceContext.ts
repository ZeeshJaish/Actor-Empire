import type {
    IndustryCapabilityDimension,
    IndustryCompanyKind,
    IndustryDecisionLane,
    IndustryIntelligenceLearningState,
} from '../../types';

export interface IndustryIntelligenceIdentity {
    scale: number;
    riskTolerance: number;
    financialDiscipline: number;
    creativePatience: number;
    prestigeIntent: number;
    commercialIntent: number;
    franchiseAppetite: number;
    growthIntent: number;
    neutralMomentum: number;
}

export interface IndustryIntelligenceCondition {
    cashMillions: number;
    debtMillions: number;
    runwayWeeks: number;
    capacityPressure: number;
    momentum: number;
    recentResultStrength: number;
    audienceTrust: number;
    catalogueNeed: number;
    marketOpportunity: number;
    financialPressure: number;
    competitivePressure: number;
    repetitionFatigue: number;
    franchiseFatigue: number;
    overextension: number;
    spendingRestricted: boolean;
}

export interface IndustryIntelligenceContext {
    companyId: string;
    companyKind: IndustryCompanyKind;
    absoluteWeek: number;
    seed: string;
    controller: 'AI' | 'PLAYER';
    status: string;
    identity: IndustryIntelligenceIdentity;
    capabilities: Partial<Record<IndustryCapabilityDimension, number>>;
    condition: IndustryIntelligenceCondition;
    learning: IndustryIntelligenceLearningState;
    nextDueAbsoluteWeek: Record<IndustryDecisionLane, number | null>;
    decisionCycleByLane: Record<IndustryDecisionLane, number>;
    activeCommitmentIds: string[];
}

export const clampIndustryScore = (value: unknown, fallback = 0): number => {
    const numeric = Number(value);
    return Math.max(0, Math.min(100, Number.isFinite(numeric) ? numeric : fallback));
};

export const finiteIndustryNumber = (value: unknown, fallback = 0): number => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
};

export const freezeIndustryContext = (context: IndustryIntelligenceContext): IndustryIntelligenceContext => {
    Object.freeze(context.identity);
    Object.freeze(context.capabilities);
    Object.freeze(context.condition);
    Object.freeze(context.learning.averageOutcomeByLane);
    Object.freeze(context.learning.capabilityProgress);
    Object.freeze(context.learning.samples);
    Object.freeze(context.learning.processedEvidenceIds);
    Object.freeze(context.learning);
    Object.freeze(context.nextDueAbsoluteWeek);
    Object.freeze(context.decisionCycleByLane);
    Object.freeze(context.activeCommitmentIds);
    return Object.freeze(context);
};
