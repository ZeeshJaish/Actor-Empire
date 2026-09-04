import type { StreamingEcosystemOperator } from '../../types';
import {
    clampIndustryScore,
    finiteIndustryNumber,
    freezeIndustryContext,
    type IndustryIntelligenceContext,
} from './industryIntelligenceContext';

export const adaptStreamingEcosystemIntelligenceContext = (
    operator: StreamingEcosystemOperator,
    absoluteWeek: number,
): IndustryIntelligenceContext => {
    if (!operator.intelligence) throw new Error(`Streaming operator ${operator.id} must be normalized before intelligence adaptation.`);
    const weeklyBurn = Math.max(0.5, 0.8 + operator.activeCountryIds.length * 0.42 + operator.cataloguePower / 38 + operator.technology / 90);
    const runwayWeeks = Math.max(0, operator.cashMillions / weeklyBurn);
    const financialPressure = clampIndustryScore(
        (runwayWeeks < 52 ? (52 - runwayWeeks) * 1.25 : 0)
        + operator.risk * 0.22
        + (operator.lifecycle === 'DISTRESSED' ? 30 : 0),
    );
    const marketMomentum = Object.values(operator.marketMomentum);
    const momentum = marketMomentum.length
        ? clampIndustryScore(50 + marketMomentum.reduce((sum, value) => sum + value, 0) / marketMomentum.length * 4)
        : operator.intelligence.momentum;
    const scale = operator.startingClass === 'GLOBAL_ENTRANT' ? 90
        : operator.startingClass === 'CORPORATE_ENTRANT' ? 78
            : operator.startingClass === 'REGIONAL_CHALLENGER' ? 64 : 45;
    const status = operator.lifecycle === 'CLOSED' ? 'CLOSED'
        : operator.lifecycle === 'ACQUIRED' ? 'SOLD_MERGED'
            : operator.lifecycle;
    return freezeIndustryContext({
        companyId: operator.id,
        companyKind: 'STREAMING_PLATFORM',
        absoluteWeek: Math.max(0, Math.round(absoluteWeek)),
        seed: operator.intelligence.seed,
        controller: operator.lifecycle === 'ACQUIRED' ? 'PLAYER' : 'AI',
        status,
        identity: {
            scale: clampIndustryScore(scale + operator.subscriberMillions * 0.25),
            riskTolerance: clampIndustryScore(100 - operator.risk),
            financialDiscipline: clampIndustryScore(operator.efficiency),
            creativePatience: clampIndustryScore((operator.prestige + operator.cataloguePower) / 2),
            prestigeIntent: clampIndustryScore(operator.prestige),
            commercialIntent: clampIndustryScore((operator.brandPower + operator.subscriberMillions * 0.15)),
            franchiseAppetite: clampIndustryScore(30 + operator.cataloguePower * 0.58),
            growthIntent: clampIndustryScore(operator.brandPower * 0.55 + operator.technology * 0.45),
            neutralMomentum: 50,
        },
        capabilities: {
            DEVELOPMENT: clampIndustryScore((operator.cataloguePower + operator.prestige) / 2),
            CREATIVE: clampIndustryScore((operator.cataloguePower + operator.prestige * 1.2) / 2.2),
            PRODUCTION: clampIndustryScore(operator.cataloguePower * 0.65 + operator.efficiency * 0.35),
            FINANCE: clampIndustryScore(operator.efficiency),
            MARKETING_DISCOVERY: clampIndustryScore(operator.brandPower),
            DISTRIBUTION_MARKET: clampIndustryScore((operator.technology + operator.localization + operator.brandPower) / 3),
            NEGOTIATION: clampIndustryScore((operator.brandPower + operator.efficiency) / 2),
            TECHNOLOGY: clampIndustryScore(operator.technology),
            CATALOGUE: clampIndustryScore(operator.cataloguePower),
            LOCALIZATION: clampIndustryScore(operator.localization),
        },
        condition: {
            cashMillions: finiteIndustryNumber(operator.cashMillions),
            debtMillions: 0,
            runwayWeeks,
            capacityPressure: clampIndustryScore(operator.activeCountryIds.length * 6 + operator.consecutiveStressWeeks * 3),
            momentum,
            recentResultStrength: clampIndustryScore(45 + operator.prestige * 0.32 + momentum * 0.25),
            audienceTrust: clampIndustryScore((operator.brandPower + operator.prestige) / 2),
            catalogueNeed: clampIndustryScore(100 - operator.cataloguePower),
            marketOpportunity: clampIndustryScore(86 - operator.activeCountryIds.length * 2),
            financialPressure,
            competitivePressure: clampIndustryScore(50 + operator.risk * 0.25),
            repetitionFatigue: clampIndustryScore(operator.intelligence.learning.repetitionFatigue),
            franchiseFatigue: clampIndustryScore(operator.intelligence.learning.franchiseFatigue),
            overextension: clampIndustryScore(operator.activeCountryIds.length * 5 + operator.consecutiveStressWeeks * 2),
            spendingRestricted: operator.lifecycle !== 'ACTIVE' || runwayWeeks < 8,
        },
        learning: structuredClone(operator.intelligence.learning),
        nextDueAbsoluteWeek: { ...operator.intelligence.nextDueAbsoluteWeek },
        decisionCycleByLane: { ...operator.intelligence.decisionCycleByLane },
        activeCommitmentIds: [],
    });
};
