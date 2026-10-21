import type { ProjectDetails } from '../../types';
import type { CinemaDeliveryInput } from './boxOfficeTypes';
import { CINEMA_CRAFT_WEIGHTS } from './boxOfficeProfiles';

const finite = (value: unknown, fallback: number, min = 0, max = 100): number => (
    typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback
);
const mean = (values: number[], fallback: number, max = 100) => values.length
    ? values.reduce((sum, value) => sum + finite(value, fallback, 0, max), 0) / values.length : fallback;
export interface CinemaCraftInput {
    scriptQuality?: number; directorQuality: number; castingStrength: number; crewQualities: number[];
    equipmentQualityLevels: number[]; locationQualities: number[]; storyFitQualityAdjustment: number;
    backgroundAuthenticity: number; backgroundReliability: number; backgroundSetCare: number;
}

/** Craft and delivery, independent of fame, release footprint and box-office ROI. */
export const calculateCinemaCraftQuality = (input: CinemaCraftInput): number => {
    const craft = finite(input.scriptQuality, 50) * CINEMA_CRAFT_WEIGHTS.script
        + finite(input.directorQuality, 50) * CINEMA_CRAFT_WEIGHTS.direction
        + finite(input.castingStrength, 50) * CINEMA_CRAFT_WEIGHTS.cast
        + mean(input.crewQualities, 50) * CINEMA_CRAFT_WEIGHTS.crew;
    // Four standard equipment lines: extra keys cannot create unlimited quality.
    const equipmentLevel = input.equipmentQualityLevels.reduce((sum, value) => sum + finite(value, 0, 0, 10), 0)
        / Math.max(4, input.equipmentQualityLevels.length);
    const gear = 4 * (1 - Math.exp(-equipmentLevel / 4));
    const location = (mean(input.locationQualities, 5, 10) - 5) * 0.6;
    const story = finite(input.storyFitQualityAdjustment, 0, -5, 5);
    const background = Math.max(-3, Math.min(3,
        (finite(input.backgroundAuthenticity, 50) - 50) * 0.04
        + (finite(input.backgroundReliability, 50) - 50) * 0.03
        + (finite(input.backgroundSetCare, 50) - 50) * 0.025));
    return Math.round(Math.max(1, Math.min(100, craft + gear + location + story + background)));
};

export const buildCinemaDeliveryInput = (project: ProjectDetails): CinemaDeliveryInput => ({
    estimatedQuality: typeof project.hiddenStats.estimatedQualityScore === 'number' && Number.isFinite(project.hiddenStats.estimatedQualityScore)
        ? finite(project.hiddenStats.estimatedQualityScore, 50) : undefined,
    deliveredQuality: finite(project.hiddenStats.qualityScore, 50),
    scriptQuality: finite(project.hiddenStats.scriptQuality, 50),
    directorQuality: finite(project.hiddenStats.directorQuality, 50),
    castingStrength: finite(project.hiddenStats.castingStrength, 50),
});
