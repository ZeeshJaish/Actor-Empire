import type { IndustryDecisionLane } from '../../types';
import { createDeterministicRng, createDeterministicId } from '../deterministicRandom';
import type { IndustryIntelligenceContext } from './industryIntelligenceContext';

export interface IndustryForecast {
    uncertaintyKey: string;
    error: number;
    confidence: number;
    relevantCompetence: number;
}

const average = (values: Array<number | undefined>): number => {
    const finite = values.filter((value): value is number => Number.isFinite(value));
    return finite.length ? finite.reduce((sum, value) => sum + value, 0) / finite.length : 50;
};

const relevantCompetence = (context: IndustryIntelligenceContext, lane: IndustryDecisionLane): number => {
    const c = context.capabilities;
    if (lane === 'CONTENT_STRATEGY') return average([c.DEVELOPMENT, c.CREATIVE, c.CATALOGUE]);
    if (lane === 'PRODUCTION_REVIEW') return average([c.PRODUCTION, c.FINANCE]);
    if (lane === 'RELEASE_REVIEW') return average([c.MARKETING_DISCOVERY, c.DISTRIBUTION_MARKET]);
    if (lane === 'FINANCE_REVIEW') return average([c.FINANCE]);
    if (lane === 'MARKET_EXPANSION') return average([c.DISTRIBUTION_MARKET, c.LOCALIZATION, c.NEGOTIATION]);
    return average([c.TECHNOLOGY, c.LOCALIZATION, c.DEVELOPMENT, c.FINANCE]);
};

export const createIndustryForecast = (
    context: IndustryIntelligenceContext,
    lane: IndustryDecisionLane,
    optionId: string,
): IndustryForecast => {
    const competence = Math.max(0, Math.min(100, relevantCompetence(context, lane)));
    const cycle = context.decisionCycleByLane[lane] || 0;
    const uncertaintyKey = createDeterministicId(
        'industry_forecast', context.seed, context.companyId, lane, cycle, optionId, context.absoluteWeek,
    );
    const rng = createDeterministicRng(uncertaintyKey);
    const amplitude = 42 - competence * 0.3;
    return {
        uncertaintyKey,
        error: Math.round(((rng() * 2) - 1) * amplitude * 1_000) / 1_000,
        confidence: Math.round((35 + competence * 0.6) * 100) / 100,
        relevantCompetence: Math.round(competence * 100) / 100,
    };
};
