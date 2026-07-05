import type { BudgetTier, Genre, ProjectDetails, ProjectHiddenStats } from '../types';
import { getEpisodeRatingsGameplayImpact } from './episodeRatings';

export type ProductionRiskLabel = 'Dangerous' | 'Risky' | 'Balanced' | 'Upside' | 'Prestige Shield';

export interface ProductionRiskContext {
    budget?: number;
    imdbRating?: number;
    productionPerformance?: number;
}

export interface ProductionRiskProfile {
    label: ProductionRiskLabel;
    riskScore: number;
    theatricalDemandMultiplier: number;
    streamingViewMultiplier: number;
    platformBidMultiplier: number;
    episodeScoreModifier: number;
    notes: string[];
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const roundTwo = (value: number) => Math.round(value * 100) / 100;

const BUDGET_ANCHOR: Record<BudgetTier, number> = {
    LOW: 8_000_000,
    MID: 35_000_000,
    HIGH: 90_000_000,
    BLOCKBUSTER: 180_000_000,
};

const SPECTACLE_GENRES = new Set<Genre>(['ACTION', 'ADVENTURE', 'SCI_FI', 'SUPERHERO', 'FANTASY', 'ANIMATION']);
const PRESTIGE_GENRES = new Set<Genre>(['DRAMA', 'BIOPIC', 'DOCUMENTARY', 'MYSTERY', 'CRIME']);

const getCastPayroll = (project: ProjectDetails) => (
    (project.castList || []).reduce((sum, member) => sum + Math.max(0, Number(member.salary || 0)), 0)
);

export const calculateProductionRiskProfile = (
    project: ProjectDetails,
    context: ProductionRiskContext = {}
): ProductionRiskProfile => {
    const hidden: Partial<ProjectHiddenStats> = project.hiddenStats || {};
    const budget = Math.max(1, Number(context.budget || project.estimatedBudget || 1));
    const anchor = BUDGET_ANCHOR[project.budgetTier] || BUDGET_ANCHOR.MID;
    const budgetPressure = budget / anchor;
    const castPayrollRatio = getCastPayroll(project) / budget;

    const scriptQuality = Number(hidden.scriptQuality || hidden.qualityScore || 50);
    const directorQuality = Number(hidden.directorQuality || hidden.qualityScore || 50);
    const castingStrength = Number(hidden.castingStrength || 50);
    const qualityScore = Number(hidden.qualityScore || 50);
    const rawHype = Number(hidden.rawHype || 50);
    const castDepthScore = Number(hidden.castDepthScore ?? 70);
    const productionPerformance = Number(context.productionPerformance ?? qualityScore);
    const imdbScore = Number(context.imdbRating || 0) * 10;

    const craftScore = (scriptQuality * 0.32) + (directorQuality * 0.24) + (castingStrength * 0.16) + (qualityScore * 0.28);
    const audienceConfidence = clamp(
        (craftScore * 0.42)
        + (qualityScore * 0.24)
        + (productionPerformance * 0.2)
        + ((imdbScore || qualityScore) * 0.14),
        0,
        100
    );

    const notes: string[] = [];
    const qualityLift = (audienceConfidence - 68) / 160;
    const budgetDrag = Math.max(0, budgetPressure - 1) * 0.22;
    const efficiencyLift = budgetPressure < 0.95 && audienceConfidence >= 74 ? clamp((0.95 - budgetPressure) * 0.35, 0, 0.1) : 0;
    const starVehicleDrag = castPayrollRatio > 0.34 && audienceConfidence < 72 ? clamp((castPayrollRatio - 0.34) * 0.42, 0, 0.18) : 0;
    const hypeTrapDrag = rawHype > 78 && qualityScore < 58 ? clamp((rawHype - qualityScore) / 210, 0, 0.18) : 0;
    const thinSpectacleDrag = SPECTACLE_GENRES.has(project.genre) && ['HIGH', 'BLOCKBUSTER'].includes(project.budgetTier) && castDepthScore < 58
        ? clamp((58 - castDepthScore) / 160, 0, 0.16)
        : 0;

    if (budgetDrag > 0.06) notes.push('budget pressure');
    if (starVehicleDrag > 0.04) notes.push('star payroll pressure');
    if (hypeTrapDrag > 0.04) notes.push('hype/quality mismatch');
    if (thinSpectacleDrag > 0.04) notes.push('thin spectacle package');
    if (efficiencyLift > 0.03) notes.push('efficient budget');

    let episodeScoreModifier = 0;
    if (project.type === 'SERIES' && project.episodeRatings?.length) {
        const impact = getEpisodeRatingsGameplayImpact(project.episodeRatings);
        episodeScoreModifier = clamp((impact.averageRating - 7.2) / 9, -0.18, 0.2);
        if (episodeScoreModifier > 0.04) notes.push('strong episode scorecard');
        if (episodeScoreModifier < -0.04) notes.push('weak episode scorecard');
    }

    const prestigeShield = PRESTIGE_GENRES.has(project.genre) && (Number(hidden.prestigeBonus || 0) >= 10 || audienceConfidence >= 84);
    const prestigeLift = prestigeShield ? 0.04 : 0;

    const theatricalDemandMultiplier = roundTwo(clamp(
        1 + qualityLift + efficiencyLift + prestigeLift + (episodeScoreModifier * 0.28) - budgetDrag - starVehicleDrag - hypeTrapDrag - thinSpectacleDrag,
        0.45,
        1.28
    ));
    const streamingViewMultiplier = roundTwo(clamp(
        1 + (qualityLift * 0.85) + prestigeLift + episodeScoreModifier + (efficiencyLift * 0.5) - (budgetDrag * 0.75) - (starVehicleDrag * 0.7) - (hypeTrapDrag * 0.85) - (thinSpectacleDrag * 0.5),
        0.48,
        1.24
    ));
    const platformBidMultiplier = roundTwo(clamp(
        1 + (qualityLift * 0.75) + (episodeScoreModifier * 0.85) + (prestigeLift * 0.7) - (budgetDrag * 1.05) - starVehicleDrag - hypeTrapDrag - (thinSpectacleDrag * 0.7),
        0.42,
        1.18
    ));

    const riskScore = Math.round(clamp(
        audienceConfidence
        + (efficiencyLift * 90)
        + (episodeScoreModifier * 70)
        + (prestigeShield ? 5 : 0)
        - (Math.max(0, budgetPressure - 1) * 24)
        - (starVehicleDrag * 110)
        - (hypeTrapDrag * 90)
        - (thinSpectacleDrag * 80),
        0,
        100
    ));

    const label: ProductionRiskLabel = riskScore >= 84 && prestigeShield
        ? 'Prestige Shield'
        : riskScore >= 78
            ? 'Upside'
            : riskScore >= 58
                ? 'Balanced'
                : riskScore >= 36
                    ? 'Risky'
                    : 'Dangerous';

    return {
        label,
        riskScore,
        theatricalDemandMultiplier,
        streamingViewMultiplier,
        platformBidMultiplier,
        episodeScoreModifier: roundTwo(episodeScoreModifier),
        notes,
    };
};
