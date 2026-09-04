import type { Genre, IndustryBudgetSuitability, IndustryContentFormat } from '../../types';

export interface CreateIndustryBudgetSuitabilityInput {
    format: IndustryContentFormat;
    primaryGenre: Genre;
    creativeRisk: number;
    starPowerTarget: number;
    commercialIntent: number;
    affordabilityCeilingMillions: number;
}

export interface IndustryBudgetSuitabilityEvaluation {
    executionEfficiency: number;
    qualityBonus: number;
    downsideRisk: number;
    band: 'UNDERFUNDED' | 'VIABLE' | 'IDEAL' | 'AMBITIOUS' | 'EXCESSIVE';
}

const finite = (value: number, fallback: number): number => Number.isFinite(value) ? value : fallback;
const bounded = (value: number): number => Math.max(0, Math.min(100, Math.round(value * 10) / 10));
const money = (value: number): number => Math.max(0.1, Math.round(value * 10) / 10);

export const createIndustryBudgetSuitability = (
    input: CreateIndustryBudgetSuitabilityInput,
): IndustryBudgetSuitability => {
    const formatScale = input.format === 'SERIES' ? 1.4 : input.format === 'LIMITED_SERIES' ? 1.18 : 1;
    const genreScale = ['ACTION', 'SCI_FI', 'SUPERHERO', 'FANTASY', 'ANIMATION', 'ADVENTURE', 'MUSICAL'].includes(input.primaryGenre) ? 1.34 : 1;
    const risk = bounded(input.creativeRisk);
    const stars = bounded(input.starPowerTarget);
    const commercial = bounded(input.commercialIntent);
    const naturalIdeal = (6 + stars * 0.72 + risk * 0.18 + commercial * 0.12) * formatScale * genreScale;
    const ceiling = Math.max(5, finite(input.affordabilityCeilingMillions, naturalIdeal));
    const idealHighMillions = money(Math.max(3.1, Math.min(naturalIdeal * 1.18, ceiling)));
    const idealLowMillions = money(Math.max(2.1, Math.min(idealHighMillions - 0.1, idealHighMillions * 0.68)));
    const minimumMillions = money(Math.max(1, Math.min(idealLowMillions - 0.1, idealLowMillions * 0.56)));
    const ambitiousMaximumMillions = money(Math.max(idealHighMillions + 0.1, Math.min(Math.max(ceiling, idealHighMillions * 1.25), idealHighMillions * 1.7)));
    return { minimumMillions, idealLowMillions, idealHighMillions, ambitiousMaximumMillions };
};

export const evaluateIndustryBudgetSuitability = (
    curve: IndustryBudgetSuitability,
    proposedBudgetMillions: number,
): IndustryBudgetSuitabilityEvaluation => {
    const budget = Math.max(0, finite(proposedBudgetMillions, 0));
    if (budget < curve.minimumMillions) {
        const ratio = budget / Math.max(0.1, curve.minimumMillions);
        return { executionEfficiency: bounded(18 + ratio * 62), qualityBonus: bounded(ratio * 2), downsideRisk: bounded(88 - ratio * 25), band: 'UNDERFUNDED' };
    }
    if (budget < curve.idealLowMillions) {
        const ratio = (budget - curve.minimumMillions) / Math.max(0.1, curve.idealLowMillions - curve.minimumMillions);
        return { executionEfficiency: bounded(72 + ratio * 23), qualityBonus: bounded(2 + ratio * 4), downsideRisk: bounded(48 - ratio * 22), band: 'VIABLE' };
    }
    if (budget <= curve.idealHighMillions) {
        return { executionEfficiency: 100, qualityBonus: 7, downsideRisk: 20, band: 'IDEAL' };
    }
    if (budget <= curve.ambitiousMaximumMillions) {
        const ratio = (budget - curve.idealHighMillions) / Math.max(0.1, curve.ambitiousMaximumMillions - curve.idealHighMillions);
        return { executionEfficiency: bounded(100 - ratio * 4), qualityBonus: bounded(7 + ratio), downsideRisk: bounded(20 + ratio * 25), band: 'AMBITIOUS' };
    }
    const excessRatio = Math.min(2, (budget - curve.ambitiousMaximumMillions) / Math.max(0.1, curve.ambitiousMaximumMillions));
    return { executionEfficiency: bounded(94 - excessRatio * 12), qualityBonus: 8, downsideRisk: bounded(52 + excessRatio * 24), band: 'EXCESSIVE' };
};
