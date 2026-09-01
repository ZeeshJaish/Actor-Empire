export { PLATFORM_AI_PROFILES, type PlatformAiProfile } from './platformAiProfiles';
export {
    processStreamingIndustryWorldWeek,
    type StreamingIndustryWeeklyTurnResult,
} from './platformAiWeeklyIntegration';
export {
    PLATFORM_AI_OPERATING_PROFILES,
    clampPlatformAiEfficiencyPolicy,
    getPlatformAiOperatingProfile,
    type PlatformAiOperatingProfile,
} from './platformAiOperatingProfiles';
export {
    createPlatformAiEfficiencySnapshot,
    createPlatformAiRecurringEfficiencySnapshot,
    normalizePlatformAiEfficiencySnapshot,
    type PlatformAiEfficiencyKind,
} from './platformAiEfficiency';
export {
    getPlatformAiLanguageCapability,
    normalizePlatformAiLanguageId,
    resolvePlatformAiLocalizationModeSupport,
    resolvePlatformAiTitleCountryComprehension,
    type PlatformAiTitleCountryComprehension,
    type PlatformAiTitleCountryComprehensionInput,
} from './platformAiLanguageCapabilities';
export {
    choosePlatformAiAdministrationOutcome,
    createPlatformAiFundingRecord,
    getPlatformAiPostFundingRestrictions,
    getPlatformAiSpendingRestrictions,
    quotePlatformAiExternalRecapitalization,
    PLATFORM_AI_EXTERNAL_FUNDING_COOLDOWN_WEEKS,
    type PlatformAiAdministrationOutcome,
    type PlatformAiAdministrationOutcomeInput,
    type PlatformAiExternalFundingQuote,
    type PlatformAiExternalFundingQuoteInput,
} from './platformAiFinancing';
export {
    DISTRESS_STAGE_ORDER,
    cancelPendingPlatformAiCatalogueDistressDealsForAcquisition,
    normalizePlatformAiCatalogueDistressDeals,
    progressPlatformAiDistressWorld,
    type CancelPendingPlatformAiCatalogueDistressDealsForAcquisitionInput,
    type ProgressPlatformAiDistressWorldInput,
    type ProgressPlatformAiDistressWorldResult,
} from './platformAiDistress';
export {
    getPlatformAiProductionDuration,
    normalizePlatformAiAudienceSettlements,
    normalizePlatformAiRightsRenewals,
    normalizePlatformAiState,
    normalizeWorldPlatformAi,
    resolvePlatformController,
    resolveStudioController,
} from './platformAiState';
export {
    planPlatformAiLocalization,
    progressPlatformAiLocalization,
    resolvePlatformAiLocalizationCapability,
    type PlanPlatformAiLocalizationInput,
    type PlatformAiLocalizationMutationResult,
} from './platformAiLocalization';
export {
    progressPlatformAiRightsLifecycle,
    queuePlatformAiRightsRenewal,
    type PlatformAiRightsLifecycleInput,
    type PlatformAiRightsLifecycleReason,
    type ProgressPlatformAiRightsLifecycleResult,
    type QueuePlatformAiRightsRenewalInput,
    type QueuePlatformAiRightsRenewalResult,
} from './platformAiRightsLifecycle';
export {
    buildPlatformContentCandidates,
    commitPlatformContentCandidate,
    type CommitPlatformContentCandidateInput,
    type CommitPlatformContentCandidateResult,
    type PlatformAiContentCandidate,
    type PlatformAiSourcingInput,
} from './platformAiContentSourcing';
export {
    getPlatformAiCandidateLearningAdjustment,
    choosePlatformContentCandidate,
    type ChoosePlatformContentCandidateInput,
} from './platformAiPlanning';
export {
    buildPlatformAiProductionCalendar,
    commissionPlatformAiOriginal,
    selectPlatformAiProducer,
    type CommissionPlatformAiOriginalInput,
    type PlatformAiProductionMutationResult,
    type SelectPlatformAiProducerInput,
} from './platformAiCommissioning';
export {
    acceptPlatformAiPlayerCommission,
    calculatePlatformAiPlayerProducerFee,
    createPlatformAiPlayerCommissionOffer,
    declinePlatformAiPlayerCommission,
    finalizePlatformAiPlayerCommissionGreenlight,
    expirePlatformAiPlayerCommissionOffers,
    generatePlatformAiPlayerCommissionOffers,
    hasEligiblePlayerProductionStudio,
    hasOpenPlayerCommissionForPlan,
    normalizePlatformAiPlayerCommissionOffers,
    settlePlatformAiPlayerCommissionDelivery,
    syncPlatformAiPlayerCommissionProductions,
    transferPlatformAiPlayerCommission,
    type CreatePlatformAiPlayerCommissionOfferInput,
    type PlatformAiPlayerCommissionResult,
} from './platformAiPlayerCommissions';
export {
    buildPlatformAiPhase4QaFixture,
    createPlatformAiPlayerCommissionQaFixture,
    getPlatformAiPhase4QaSnapshot,
    type PlatformAiPhase4QaSnapshot,
    type PlatformAiPlayerCommissionQaResult,
} from './platformAiPlayerCommissionQa';
export {
    buildPlatformCommissionActiveCardPresentation,
    buildPlatformCommissionBudgetPresentation,
    buildPlatformCommissionFilmography,
    createPlatformCommissionBriefReference,
    type PlatformCommissionFilmographyCredit,
} from './platformAiPlayerCommissionPresentation';
export {
    getPlatformAiTalentMemoryModifier,
    getPlatformAiTalentPairMemoryModifier,
    selectPlatformAiTalent,
    type PlatformAiTalentSelection,
    type SelectPlatformAiTalentInput,
} from './platformAiTalent';
export {
    handoffAcquiredPlatformProductions,
    progressPlatformAiProduction,
    type ProgressPlatformAiProductionInput,
} from './platformAiProduction';
export {
    choosePlatformResearch,
    clampPlatformContentPlanSupport,
    commitPlatformResearch,
    getPlatformResearchRecurringCostMillions,
    progressPlatformResearch,
    resolvePlatformLocalizationLevel,
    type CommitPlatformResearchInput,
    type PlatformAiResearchChoice,
    type PlatformAiResearchInput,
    type PlatformAiResearchMutationResult,
} from './platformAiResearch';
export {
    choosePlatformResearchPortfolio,
    getPlatformAiForwardObligations,
    getPlatformAiResearchCapacity,
    type PlatformAiResearchCapacityResult,
    type PlatformAiResearchPortfolioInput,
    type PlatformAiResearchPortfolioResult,
} from './platformAiResearchPortfolio';
export {
    choosePlatformMarketExpansion,
    commitPlatformMarketExpansion,
    getPlatformActiveCountryIds,
    getPlatformActiveRegionIds,
    progressPlatformMarketExpansion,
    type CommitPlatformMarketInput,
    type PlatformAiMarketChoice,
    type PlatformAiMarketInput,
    type PlatformAiMarketMutationResult,
} from './platformAiMarkets';
export {
    calculatePlatformAiRescueCapMillions,
    calculatePlatformAiValuationBillions,
    calculatePlatformAiWeeklyEconomy,
    getPlatformAiRunway,
    resolvePlatformAiDistress,
    settlePlatformAiEconomy,
    type PlatformAiDistressInput,
    type PlatformAiDistressResult,
    type PlatformAiEconomyInput,
    type PlatformAiEconomyResult,
    type PlatformAiRescueCapInput,
    type PlatformAiRunwayInput,
    type PlatformAiRunwayResult,
} from './platformAiEconomy';
export {
    commitPlatformAiExternalCommitment,
    getPlatformAiExternalCommitmentId,
    normalizePlatformAiExternalCommitments,
    reconcilePlatformAiExternalCommitmentObligations,
    settlePlatformAiExternalCommitments,
    settlePendingPlatformAiExternalCommitmentsForAcquisition,
    type CommitPlatformAiExternalCommitmentInput,
    type CommitPlatformAiExternalCommitmentResult,
} from './platformAiExternalCommitments';
export {
    calculatePlatformAiStreamingPerformance,
    PLATFORM_AI_FLOP_COMMERCIAL_SCORE,
    PLATFORM_AI_HIT_COMMERCIAL_SCORE,
    PLATFORM_AI_OUTCOME_THRESHOLDS,
    releasePlatformContentPlan,
    schedulePlatformStreamingWindow,
    type CalculatePlatformAiStreamingPerformanceInput,
    type PlatformAiReleaseMutationReason,
    type PlatformAiReleaseMutationResult,
    type ReleasePlatformContentPlanInput,
    type SchedulePlatformStreamingWindowInput,
} from './platformAiRelease';
export {
    buildReadyPlatformAiReleasePassport,
    choosePlatformAiPremiere,
    type BuildReadyPlatformAiReleasePassportInput,
    type ChoosePlatformAiPremiereInput,
    type PlatformAiPremiereCandidate,
    type PlatformAiPremiereChoice,
    type PlatformAiPremiereReason,
} from './platformAiReleaseReadiness';
export {
    derivePlatformAiProductionOutcomeMemory,
    getPlatformAiPresentationEvents,
    recordPlatformAiReleaseMemory,
    updatePlatformAiMemory,
    type PlatformAiMemoryMutationResult,
    type DerivePlatformAiProductionOutcomeMemoryInput,
    type PlatformAiPresentationEvent,
    type RecordPlatformAiReleaseMemoryInput,
    type UpdatePlatformAiMemoryInput,
} from './platformAiMemory';
export {
    PLATFORM_AI_TURN_IDEMPOTENCY_PREFIX,
    PLATFORM_AI_TURN_ORDER,
    getPlatformAiTurnIdempotencyKey,
    processPlatformAiWorldTurn,
    type PlatformAiWorldTurnResult,
} from './platformAiTurn';
