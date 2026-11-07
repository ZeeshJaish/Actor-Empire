import type { Genre } from '../types';

/**
 * #275: every choice in Setup and Gear does something. Quality effects are worked out at greenlight, so a project
 * already made keeps its number. Pacing is read later, so only a project built with `pacingLive` feels it.
 */

export type SetupVisualStyle = 'REALISTIC' | 'STYLISTIC' | 'GRITTY' | 'VIBRANT' | 'MINIMALIST' | 'NOIR';
export type SetupPacing = 'SLOW' | 'MODERATE' | 'FAST' | 'FRENETIC';

const STYLE_FIT: Record<Genre, Record<SetupVisualStyle, number>> = {
    ACTION: { REALISTIC: 1, STYLISTIC: 1, GRITTY: 1, VIBRANT: 0, NOIR: 0, MINIMALIST: -1 },
    DRAMA: { REALISTIC: 2, MINIMALIST: 1, GRITTY: 1, NOIR: 0, STYLISTIC: 0, VIBRANT: -1 },
    COMEDY: { VIBRANT: 2, REALISTIC: 1, STYLISTIC: 1, MINIMALIST: 0, GRITTY: -1, NOIR: -1 },
    ROMANCE: { VIBRANT: 1, REALISTIC: 1, STYLISTIC: 1, MINIMALIST: 1, NOIR: 0, GRITTY: -1 },
    THRILLER: { NOIR: 2, GRITTY: 1, MINIMALIST: 1, REALISTIC: 1, STYLISTIC: 0, VIBRANT: -1 },
    MYSTERY: { NOIR: 2, MINIMALIST: 1, REALISTIC: 1, STYLISTIC: 1, GRITTY: 0, VIBRANT: -1 },
    HORROR: { GRITTY: 2, NOIR: 1, MINIMALIST: 1, STYLISTIC: 1, REALISTIC: 0, VIBRANT: -1 },
    SCI_FI: { STYLISTIC: 2, MINIMALIST: 1, GRITTY: 1, VIBRANT: 0, REALISTIC: 0, NOIR: 0 },
    ADVENTURE: { VIBRANT: 2, REALISTIC: 1, STYLISTIC: 1, GRITTY: 0, MINIMALIST: -1, NOIR: -1 },
    SUPERHERO: { STYLISTIC: 2, VIBRANT: 1, GRITTY: 1, NOIR: 0, REALISTIC: 0, MINIMALIST: -1 },
    MUSICAL: { VIBRANT: 2, STYLISTIC: 1, REALISTIC: 0, MINIMALIST: 0, NOIR: 0, GRITTY: -1 },
    BIOPIC: { REALISTIC: 2, GRITTY: 1, MINIMALIST: 1, STYLISTIC: 0, NOIR: 0, VIBRANT: -1 },
    SPORTS: { REALISTIC: 2, GRITTY: 1, VIBRANT: 1, STYLISTIC: 0, MINIMALIST: 0, NOIR: -1 },
    ANIMATION: { VIBRANT: 2, STYLISTIC: 1, MINIMALIST: 1, REALISTIC: 0, NOIR: 0, GRITTY: -1 },
    FANTASY: { STYLISTIC: 2, VIBRANT: 1, GRITTY: 1, REALISTIC: 0, NOIR: 0, MINIMALIST: -1 },
    CRIME: { GRITTY: 2, NOIR: 1, STYLISTIC: 1, REALISTIC: 1, MINIMALIST: 0, VIBRANT: -1 },
    DOCUMENTARY: { REALISTIC: 2, MINIMALIST: 1, GRITTY: 1, STYLISTIC: 0, NOIR: 0, VIBRANT: 0 },
};

/** 0 is all practical, 100 is all CGI: where each genre looks best */
const BEST_EFFECTS_MIX: Record<Genre, number> = {
    ANIMATION: 90, SUPERHERO: 80, SCI_FI: 75, FANTASY: 75, ADVENTURE: 55, ACTION: 45, HORROR: 30, MUSICAL: 30, THRILLER: 25, SPORTS: 25,
    MYSTERY: 20, COMEDY: 20, CRIME: 15, ROMANCE: 15, BIOPIC: 15, DRAMA: 10, DOCUMENTARY: 5,
};

export const getVisualStyleQuality = (genre: string | undefined, style: string | undefined): number => (
    STYLE_FIT[genre as Genre]?.[style as SetupVisualStyle] ?? 0
);

export const getEffectsMixQuality = (genre: string | undefined, tone: number | undefined): number => {
    const best = BEST_EFFECTS_MIX[genre as Genre] ?? 50;
    return Math.round(Math.max(-2, Math.min(2, 2 - Math.abs(Number(tone ?? 50) - best) / 25)) * 10) / 10;
};

export const getBestEffectsMix = (genre: string | undefined): number => BEST_EFFECTS_MIX[genre as Genre] ?? 50;

/** The share of a project's other costs that its effects add: CGI is a big bill, practical sets a smaller one */
export const getEffectsCostShare = (tone: number | undefined): number => {
    const mix = Number(tone ?? 50);
    return mix >= 50 ? 0.15 * ((mix - 50) / 50) : 0.06 * ((50 - mix) / 50);
};

export const getSetupQualityAdjustment = (genre: string | undefined, style: string | undefined, tone: number | undefined): number => (
    getVisualStyleQuality(genre, style) + getEffectsMixQuality(genre, tone)
);

/** Gear's whole share of quality, from the four lines' average level. Up to level 8 it is the curve it always was. Tier 4 and tier 5 now climb. */
export const getGearQuality = (averageLevel: number): number => {
    const level = Math.max(0, Math.min(30, Number(averageLevel) || 0));
    return level <= 8 ? 4 * (1 - Math.exp(-level / 4)) : 4 * (1 - Math.exp(-2)) + (level - 8) * 0.115;
};

/** What one of the four lines gives at this level, the number a gear button shows */
export const getGearLineQuality = (level: number): number => Math.round((getGearQuality(level) / 4) * 10) / 10;

export const PACING_EFFECTS: Record<SetupPacing, { pull: number; hold: number }> = {
    SLOW: { pull: -0.08, hold: 0.06 },
    MODERATE: { pull: 0, hold: 0 },
    FAST: { pull: 0.06, hold: -0.05 },
    FRENETIC: { pull: 0.1, hold: -0.1 },
};

/** `pull` is the first weeks' viewers, `hold` is how well they stay. A project made before #275 feels neither. */
export const getPacingEffect = (details: any): { pull: number; hold: number } => (
    details?.pacingLive ? PACING_EFFECTS[details.pacing as SetupPacing] || PACING_EFFECTS.MODERATE : PACING_EFFECTS.MODERATE
);

export const formatSetupChange = (value: number): string => (value > 0 ? `+${value}` : `${value}`).replace('-', '−');
