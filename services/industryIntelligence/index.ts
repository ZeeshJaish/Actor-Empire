export {
    INDUSTRY_DECISION_LANES,
    INDUSTRY_INTELLIGENCE_COMPARISON_LIMIT,
    INDUSTRY_INTELLIGENCE_LEARNING_LIMIT,
    INDUSTRY_INTELLIGENCE_PROCESSED_KEY_LIMIT,
    INDUSTRY_INTELLIGENCE_PROPOSAL_LIMIT,
    INDUSTRY_CONTENT_BLUEPRINT_LIMIT,
    INDUSTRY_CONTENT_FINGERPRINT_LIMIT,
    INDUSTRY_CONTENT_MATERIALIZATION_KEY_LIMIT,
    INDUSTRY_CONTENT_NOVELTY_SIGNATURE_LIMIT,
    compactIndustryIntelligenceState,
    compactIndustryContentFingerprints,
    getIndustryIntelligenceFootprint,
    type IndustryIntelligenceFootprint,
    createInitialIndustryIntelligenceState,
    createInitialIndustryContentState,
    normalizeIndustryContentState,
    normalizeIndustryIntelligenceState,
} from './industryIntelligenceState';
export {
    clampIndustryScore,
    finiteIndustryNumber,
    freezeIndustryContext,
    type IndustryIntelligenceCondition,
    type IndustryIntelligenceContext,
    type IndustryIntelligenceIdentity,
} from './industryIntelligenceContext';
export { adaptStudioIntelligenceContext } from './studioIntelligenceAdapter';
export { adaptPlatformIntelligenceContext } from './platformIntelligenceAdapter';
export {
    advanceIndustryDecisionLane,
    getDueIndustryDecisionLanes,
    getIndustryDecisionProcessedKey,
} from './industryIntelligenceScheduler';
export {
    processIndustryIntelligenceShadowCompany,
    type ProcessIndustryIntelligenceShadowCompanyInput,
    type ProcessIndustryIntelligenceShadowCompanyResult,
} from './industryIntelligenceCoordinator';
export { createDefaultIndustryDecisionOptions, type IndustryDecisionOption } from './industryIntelligenceOptions';
export { createIndustryForecast, type IndustryForecast } from './industryIntelligenceForecast';
export {
    evaluateIndustryDecisionOptions,
    getIndustryAffordabilityCeilingMillions,
    type EvaluatedIndustryDecisionOption,
    type IndustryDecisionEvaluation,
    type RejectedIndustryDecisionOption,
} from './industryIntelligenceScoring';
export {
    coolIndustryMomentum,
    deriveIndustryFatigue,
    recordIndustryLearningOutcome,
    type IndustryFatigueSnapshot,
    type IndustryLearningOutcome,
} from './industryIntelligenceLearning';
export {
    captureIndustryShadowBaseline,
    compareIndustryShadowDecision,
    observePlatformAuthoritativeDecision,
    observeStudioAuthoritativeDecision,
    type CompareIndustryShadowDecisionInput,
    type CompareIndustryShadowDecisionResult,
    type IndustryAuthoritativeDecisionObservation,
    type IndustryShadowBaseline,
} from './industryIntelligenceShadow';
export { generateIndustryContentCandidates, type GenerateIndustryContentCandidatesInput } from './industryContentGenerator';
export {
    scoreIndustryContentNovelty,
    selectIndustryContentCandidate,
    type IndustryContentNoveltyContext,
    type IndustryContentNoveltyReason,
    type IndustryContentNoveltyScore,
} from './industryContentNovelty';
export {
    createIndustryBudgetSuitability,
    evaluateIndustryBudgetSuitability,
    type CreateIndustryBudgetSuitabilityInput,
    type IndustryBudgetSuitabilityEvaluation,
} from './industryBudgetSuitability';
export {
    advanceIndustryUniverseBlueprint,
    createIndustryUniverseBlueprint,
    evaluateIndustryUniverseBlueprint,
    type AdvanceIndustryUniverseBlueprintInput,
    type CreateIndustryUniverseBlueprintInput,
    type EvaluateIndustryUniverseBlueprintInput,
    type IndustryUniverseBlueprintEvaluation,
    type IndustryUniverseEvaluationReason,
    type IndustryUniverseFoundingMode,
} from './industryUniverseBlueprint';
export {
    createCanonicalUniverseDraft,
    createIndustryContentMaterializationDraft,
    evaluateIndustryContentMaterialization,
    type IndustryContentMaterializationBoundary,
    type IndustryContentMaterializationDraft,
    type IndustryContentMaterializationEligibility,
} from './industryContentMaterialization';
export {
    collectIndustryContentGlobalRecent,
    processIndustryContentShadowSelection,
    type ProcessIndustryContentShadowSelectionInput,
    type ProcessIndustryContentShadowSelectionResult,
} from './industryContentShadow';
