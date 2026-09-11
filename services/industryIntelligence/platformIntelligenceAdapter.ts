import type { PlatformState, Player } from '../../types';
import { PLATFORM_AI_PROFILES } from '../platformAi/platformAiProfiles';
import { resolvePlatformController } from '../platformAi/platformAiState';
import {
    clampIndustryScore,
    finiteIndustryNumber,
    freezeIndustryContext,
    type IndustryIntelligenceContext,
} from './industryIntelligenceContext';

const activeMarketStatuses = new Set(['ACTIVE', 'OPERATING']);

export const adaptPlatformIntelligenceContext = (
    player: Player,
    platform: PlatformState,
    absoluteWeek: number,
): IndustryIntelligenceContext => {
    if (!platform.ai?.intelligence) throw new Error(`Platform ${platform.id} must be normalized before intelligence adaptation.`);
    const ai = platform.ai;
    const intelligence = ai.intelligence;
    const profile = PLATFORM_AI_PROFILES[platform.id];
    const competenceScale = (value: number) => clampIndustryScore(value * 10);
    const activePlans = ai.slate.filter(plan => !['RELEASED', 'CANCELLED'].includes(plan.status));
    const activeResearch = ai.researchQueue.filter(item => !['OPERATING', 'CANCELLED'].includes(item.stage));
    const activeLocalization = ai.localizationJobs.filter(job => !['COMPLETED', 'CANCELLED'].includes(job.status));
    const activeMarkets = ai.marketOperations.filter(operation => activeMarketStatuses.has(operation.status)).length;
    const totalMarkets = Math.max(1, ai.marketOperations.length || ai.capabilities.activeCountryIds.length);
    const committedMillions = (ai.outstandingApprovedContentMillions || 0)
        + (ai.outstandingApprovedResearchMillions || 0)
        + ai.pendingOneTimeObligations.filter(item => !['PAID', 'CANCELLED'].includes(item.status)).reduce((sum, item) => sum + item.amountMillions, 0);
    const weeklyBurn = Math.max(1, profile.baseWeeklyOperationsMillions + activeMarkets * profile.regionWeeklyCostMillions);
    const runwayWeeks = Math.max(0, (platform.cashReserve - committedMillions) / weeklyBurn);
    const capacityPressure = clampIndustryScore(activePlans.length / Math.max(1, profile.maxConcurrentProductions) * 100);
    const financialPressure = clampIndustryScore(
        (runwayWeeks < profile.targetRunwayWeeks ? (profile.targetRunwayWeeks - runwayWeeks) * 1.1 : 0)
        + ai.debtMillions / Math.max(1, platform.cashReserve + ai.debtMillions) * 40,
    );
    const technologyLevels = Object.values(ai.capabilities.technologyLevels).filter(Number.isFinite);
    const technologyLevel = technologyLevels.length
        ? technologyLevels.reduce((sum, value) => sum + value, 0) / technologyLevels.length
        : ai.competence.technology;
    const localization = (ai.capabilities.subtitleCoveragePercent + ai.capabilities.dubCoveragePercent) / 2;
    const catalogueStrength = clampIndustryScore(ai.audienceHealth.catalogueStrengthIndex);
    const worldFeedback = ai.worldEconomyFeedback;
    const activeCommitmentIds = [
        ...activePlans.map(plan => plan.id),
        ...activeResearch.map(item => item.id),
        ...activeLocalization.map(job => job.id),
    ].sort();
    return freezeIndustryContext({
        companyId: platform.id,
        companyKind: 'STREAMING_PLATFORM',
        absoluteWeek: Math.max(0, Math.round(absoluteWeek)),
        seed: intelligence.seed,
        controller: resolvePlatformController(player, platform.id),
        status: ai.status,
        identity: {
            scale: clampIndustryScore(profile.overallLevel * 10),
            riskTolerance: clampIndustryScore(profile.riskTolerance * 100),
            financialDiscipline: competenceScale(ai.competence.finance),
            creativePatience: clampIndustryScore(35 + ai.competence.prestige * 5),
            prestigeIntent: competenceScale(ai.competence.prestige),
            commercialIntent: competenceScale(ai.competence.commercial),
            franchiseAppetite: clampIndustryScore(35 + profile.releaseVolume * 6),
            growthIntent: competenceScale(ai.competence.strategy),
            neutralMomentum: 50,
        },
        capabilities: {
            DEVELOPMENT: competenceScale(ai.competence.strategy),
            CREATIVE: competenceScale(ai.competence.creative),
            PRODUCTION: competenceScale(ai.competence.production),
            FINANCE: competenceScale(ai.competence.finance),
            MARKETING_DISCOVERY: competenceScale(ai.competence.commercial),
            DISTRIBUTION_MARKET: competenceScale((ai.competence.strategy + ai.competence.commercial) / 2),
            NEGOTIATION: competenceScale(ai.competence.negotiation),
            TECHNOLOGY: clampIndustryScore(Math.max(ai.competence.technology * 10, technologyLevel * 10)),
            CATALOGUE: catalogueStrength,
            LOCALIZATION: clampIndustryScore(localization),
        },
        condition: {
            cashMillions: Math.max(0, finiteIndustryNumber(platform.cashReserve)),
            debtMillions: Math.max(0, finiteIndustryNumber(ai.debtMillions)),
            runwayWeeks,
            capacityPressure,
            momentum: clampIndustryScore(intelligence.momentum + (worldFeedback?.audienceMomentum || 0) * 120),
            recentResultStrength: clampIndustryScore(42 + platform.recentHits * 8 + ai.audienceHealth.engagementIndex * 0.18),
            audienceTrust: clampIndustryScore((platform.reputation + ai.audienceHealth.engagementIndex) / 2),
            catalogueNeed: clampIndustryScore(100 - catalogueStrength + (worldFeedback?.unmetDemandPressure || 0) * 22),
            marketOpportunity: clampIndustryScore(45 + (1 - activeMarkets / totalMarkets) * 45
                + (worldFeedback?.unmetDemandPressure || 0) * 14),
            financialPressure: clampIndustryScore(financialPressure
                + (worldFeedback && worldFeedback.weeklyOperatingResult < 0 ? 12 : 0)
                + (worldFeedback?.churnPressure || 0) * 90),
            competitivePressure: clampIndustryScore(48 + Math.max(0, 80 - platform.reputation) * 0.3),
            repetitionFatigue: clampIndustryScore(intelligence.learning.repetitionFatigue),
            franchiseFatigue: clampIndustryScore(intelligence.learning.franchiseFatigue),
            overextension: clampIndustryScore(Math.max(capacityPressure, activeResearch.length * 14 + activeLocalization.length * 6)),
            spendingRestricted: ai.spendingRestrictions.blocksNewBids
                || ai.spendingRestrictions.blocksNewGreenlights
                || ai.spendingRestrictions.blocksNewResearch
                || ai.spendingRestrictions.blocksExpansion,
        },
        learning: structuredClone(intelligence.learning),
        nextDueAbsoluteWeek: { ...intelligence.nextDueAbsoluteWeek },
        decisionCycleByLane: { ...intelligence.decisionCycleByLane },
        activeCommitmentIds,
    });
};
