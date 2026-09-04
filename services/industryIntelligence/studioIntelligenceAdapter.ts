import type { NPCStudioState, Player } from '../../types';
import { resolveStudioAiController } from '../studioAi/studioAiControl';
import { normalizeStudioAiState } from '../studioAi/studioAiState';
import {
    clampIndustryScore,
    finiteIndustryNumber,
    freezeIndustryContext,
    type IndustryIntelligenceContext,
} from './industryIntelligenceContext';

const launchScale: Record<string, number> = {
    BOOTSTRAPPED_BOUTIQUE: 18,
    FOUNDER_BACKED: 30,
    ESTABLISHED_LABEL: 44,
    INVESTOR_BACKED: 52,
    BREAKOUT_COMPANY: 60,
    STRATEGIC_SPINOUT: 68,
    MAJOR_CHALLENGER: 80,
    ESTABLISHED_MAJOR: 92,
};

const strategyIntent = (strategy: string) => ({
    prestige: ['PRESTIGE', 'CREATOR_LED'].includes(strategy) ? 82 : strategy === 'BALANCED' ? 56 : 38,
    commercial: ['COMMERCIAL', 'FRANCHISE'].includes(strategy) ? 84 : strategy === 'BALANCED' ? 58 : 44,
});

export const adaptStudioIntelligenceContext = (
    player: Player,
    studio: NPCStudioState,
    absoluteWeek: number,
): IndustryIntelligenceContext => {
    const ai = normalizeStudioAiState(studio, { absoluteWeek });
    const controller = resolveStudioAiController(player, studio.id);
    const totalSlots = Math.max(1, ai.capacity.developmentSlots + ai.capacity.productionSlots);
    const committedSlots = ai.capacity.committedDevelopmentSlots + ai.capacity.committedProductionSlots;
    const capacityPressure = clampIndustryScore(committedSlots / totalSlots * 100);
    const runwayWeeks = Math.max(0, finiteIndustryNumber(ai.finance.runwayWeeks));
    const debtCoverage = ai.finance.debtPrincipalMillions / Math.max(1, studio.cashReserve + ai.finance.debtPrincipalMillions);
    const financialPressure = clampIndustryScore(
        (runwayWeeks < 52 ? (52 - runwayWeeks) * 1.35 : 0)
        + debtCoverage * 42
        + Math.min(25, ai.finance.consecutiveLossWeeks * 2.5),
    );
    const intent = strategyIntent(ai.profile.strategy);
    const intelligence = ai.intelligence!;
    const activeCommitmentIds = Object.values(player.world.industryProductions || {})
        .filter(production => production.producerStudioId === studio.id && !['DELIVERED', 'CANCELLED'].includes(production.status))
        .map(production => production.id)
        .sort();
    const recentResultStrength = clampIndustryScore(
        42 + Math.min(28, (studio.recentHits || 0) * 7) - Math.min(22, (studio.flops || 0) * 3),
    );
    return freezeIndustryContext({
        companyId: studio.id,
        companyKind: 'PRODUCTION_STUDIO',
        absoluteWeek: Math.max(0, Math.round(absoluteWeek)),
        seed: intelligence.seed,
        controller,
        status: ai.status,
        identity: {
            scale: clampIndustryScore(launchScale[ai.profile.launchClass] ?? (studio.valuation >= 20 ? 82 : studio.valuation >= 2 ? 55 : 28)),
            riskTolerance: clampIndustryScore(ai.profile.riskTolerance),
            financialDiscipline: clampIndustryScore(ai.profile.financialDiscipline),
            creativePatience: clampIndustryScore(ai.profile.creativePatience),
            prestigeIntent: intent.prestige,
            commercialIntent: intent.commercial,
            franchiseAppetite: clampIndustryScore(ai.profile.franchiseDependence),
            growthIntent: clampIndustryScore(35 + ai.profile.budgetAppetite * 0.45),
            neutralMomentum: 50,
        },
        capabilities: {
            DEVELOPMENT: clampIndustryScore(ai.competence.development),
            CREATIVE: clampIndustryScore(ai.competence.creative),
            PRODUCTION: clampIndustryScore(ai.competence.production),
            FINANCE: clampIndustryScore(ai.competence.finance),
            MARKETING_DISCOVERY: clampIndustryScore(ai.competence.marketing),
            DISTRIBUTION_MARKET: clampIndustryScore(ai.competence.distribution),
            NEGOTIATION: clampIndustryScore(ai.competence.negotiation),
            TALENT_RELATIONSHIP: clampIndustryScore(ai.competence.talentRelations),
        },
        condition: {
            cashMillions: Math.max(0, finiteIndustryNumber(studio.cashReserve)),
            debtMillions: Math.max(0, finiteIndustryNumber(ai.finance.debtPrincipalMillions)),
            runwayWeeks,
            capacityPressure,
            momentum: clampIndustryScore(intelligence.momentum),
            recentResultStrength,
            audienceTrust: clampIndustryScore(studio.reputation),
            catalogueNeed: clampIndustryScore(68 - Math.min(35, (studio.projectsReleased || 0) * 1.5) - (studio.recentHits || 0) * 3),
            marketOpportunity: clampIndustryScore(45 + ai.competence.distribution * 0.25),
            financialPressure,
            competitivePressure: clampIndustryScore(42 + Math.max(0, 55 - studio.reputation) * 0.45),
            repetitionFatigue: clampIndustryScore(intelligence.learning.repetitionFatigue),
            franchiseFatigue: clampIndustryScore(intelligence.learning.franchiseFatigue),
            overextension: clampIndustryScore(Math.max(capacityPressure, activeCommitmentIds.length / totalSlots * 100)),
            spendingRestricted: ['DISTRESSED', 'RESTRUCTURING', 'DORMANT', 'CLOSED', 'SOLD_MERGED'].includes(ai.status),
        },
        learning: structuredClone(intelligence.learning),
        nextDueAbsoluteWeek: { ...intelligence.nextDueAbsoluteWeek },
        decisionCycleByLane: { ...intelligence.decisionCycleByLane },
        activeCommitmentIds,
    });
};
