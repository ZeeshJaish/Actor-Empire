/**
 * #314: the moment a film is locked. Everything before this (the script, the people, the money, the time on set) only sets what the
 * film could be. Nothing that is made comes out perfect: the very top is squeezed, the edit moves it a little either way, and there is a
 * ceiling nothing crosses. Seeded by the project, so reloading the week cannot re-roll it.
 */
import type { Commitment } from '../types';
import { createDeterministicRng } from './deterministicRandom';

const SQUEEZE_ABOVE = 85;
const SQUEEZE = 0.5;
export const FINAL_QUALITY_CEILING = 97;
export const FINAL_CUT_SWING = 4;
const RATING_SQUEEZE_ABOVE = 9;
export const FINAL_RATING_CEILING = 9.6;
/** a roll this big is felt in the room, and the log says so */
const FELT_ROLL = 2.5;

const finite = (value: unknown, fallback: number): number => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

/** The closer to the top, the less each extra point gives: 85 stays 85, 95 reads 90, 100 reads 92.5 */
export const squeezeFinalQuality = (quality: number): number => {
    const value = finite(quality, 50);
    return value > SQUEEZE_ABOVE ? SQUEEZE_ABOVE + (value - SQUEEZE_ABOVE) * SQUEEZE : value;
};

/** Up to 4 either way, small moves far more often than big ones. One value per project, for ever. */
export const rollFinalCut = (projectId: string): number => {
    const rng = createDeterministicRng(`final-cut:${projectId}`);
    return Math.round((rng() + rng() - 1) * FINAL_CUT_SWING * 10) / 10;
};

export const settleFinalQuality = (quality: number, projectId: string): { quality: number; roll: number } => {
    const roll = rollFinalCut(projectId);
    return { quality: Math.round(Math.max(1, Math.min(FINAL_QUALITY_CEILING, squeezeFinalQuality(quality) + roll))), roll };
};

/** What the player can be told before the film is made: the same squeeze and roll, so the range is true */
export const getFinalQualityRange = (low: number, high: number): { low: number; high: number } => ({
    low: Math.round(Math.max(1, squeezeFinalQuality(Math.max(1, low)) - FINAL_CUT_SWING)),
    high: Math.round(Math.min(FINAL_QUALITY_CEILING, squeezeFinalQuality(Math.min(100, high)) + FINAL_CUT_SWING)),
});

/** A rating is squeezed the same way: real films top out around 9.3, so ours do too */
export const squeezeFinalRating = (rating: number): number => {
    const value = finite(rating, 5);
    return value > RATING_SQUEEZE_ABOVE
        ? Math.min(FINAL_RATING_CEILING, Math.round((RATING_SQUEEZE_ABOVE + (value - RATING_SQUEEZE_ABOVE) * SQUEEZE) * 10) / 10)
        : value;
};

/**
 * Locks a title's quality once, when post-production ends. Authored classics (`isFamous`) keep their authored number.
 * Returns the line for the log when the edit changed something a producer would feel.
 */
export const applyFinalCut = (commitment: Commitment): { commitment: Commitment; note: string } => {
    const details = commitment.projectDetails;
    const stats = details?.hiddenStats;
    if (!details || !stats || details.isFamous || stats.finalCutRoll !== undefined) return { commitment, note: '' };
    const { quality, roll } = settleFinalQuality(finite(stats.qualityScore, 50), commitment.id);
    return {
        commitment: { ...commitment, projectDetails: { ...details, hiddenStats: { ...stats, qualityScore: quality, finalCutRoll: roll } } },
        note: roll >= FELT_ROLL ? ' The final cut came together better than the rushes.'
            : roll <= -FELT_ROLL ? ' It lost something in the edit.'
                : '',
    };
};
