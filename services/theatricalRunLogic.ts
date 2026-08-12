import { BudgetTier, TheatricalExtensionDecision, TheatricalExtensionReason } from '../types';

export const MAX_THEATRICAL_EXTENSION_WEEKS = 6;
export const ABSOLUTE_THEATRICAL_WEEK_CAP = 22;

export const getTheatricalWeekRange = (budgetTier: BudgetTier): { min: number; max: number } => {
    if (budgetTier === 'BLOCKBUSTER') return { min: 13, max: 16 };
    if (budgetTier === 'HIGH') return { min: 12, max: 15 };
    if (budgetTier === 'MID') return { min: 10, max: 14 };
    return { min: 8, max: 12 };
};

export interface TheatricalExtensionInput {
    weekNum: number;
    baseTheatricalWeeks: number;
    maxTheatricalWeeks: number;
    extensionWeeks?: number;
    extensionHistory?: TheatricalExtensionDecision[];
    weeklyGross: number[];
    budget: number;
    imdbRating: number;
    marketDemand: number;
    remainingBoxOfficeHeadroom: number;
}

export interface TheatricalExtensionResult {
    shouldExtend: boolean;
    addedWeeks: number;
    newMaxTheatricalWeeks: number;
    totalExtensionWeeks: number;
    decision?: TheatricalExtensionDecision;
}

const noExtension = (
    maxTheatricalWeeks: number,
    totalExtensionWeeks: number
): TheatricalExtensionResult => ({
    shouldExtend: false,
    addedWeeks: 0,
    newMaxTheatricalWeeks: maxTheatricalWeeks,
    totalExtensionWeeks,
});

export const evaluateTheatricalExtension = (
    input: TheatricalExtensionInput
): TheatricalExtensionResult => {
    const baseWeeks = Math.max(1, Math.round(input.baseTheatricalWeeks || input.maxTheatricalWeeks || 12));
    const currentMaxWeeks = Math.max(baseWeeks, Math.round(input.maxTheatricalWeeks || baseWeeks));
    const derivedExtensionWeeks = Math.max(0, currentMaxWeeks - baseWeeks);
    const recordedExtensionWeeks = Math.max(0, Math.round(input.extensionWeeks || 0));
    const totalExtensionWeeks = Math.max(derivedExtensionWeeks, recordedExtensionWeeks);
    const reviewWeek = Math.max(1, Math.round(input.weekNum));
    const alreadyReviewed = (input.extensionHistory || []).some(item => item.reviewWeek === reviewWeek);

    if (
        reviewWeek < currentMaxWeeks
        || alreadyReviewed
        || totalExtensionWeeks >= MAX_THEATRICAL_EXTENSION_WEEKS
        || currentMaxWeeks >= ABSOLUTE_THEATRICAL_WEEK_CAP
    ) {
        return noExtension(currentMaxWeeks, totalExtensionWeeks);
    }

    const currentGross = Math.max(0, Number(input.weeklyGross.at(-1) || 0));
    const previousGross = Math.max(1, Number(input.weeklyGross.at(-2) || 1));
    const holdRatio = currentGross / previousGross;
    const grossToBudget = currentGross / Math.max(1, Number(input.budget || 1));
    const rating = Math.max(0, Math.min(10, Number(input.imdbRating || 0)));
    const marketDemand = Math.max(0.72, Math.min(1.36, Number(input.marketDemand || 1)));
    const hasRevenueRoom = input.remainingBoxOfficeHeadroom >= Math.max(currentGross * 0.75, input.budget * 0.025);

    const commerciallyViable =
        currentGross > 0
        && grossToBudget >= 0.055
        && holdRatio >= 0.60
        && rating >= 6.8
        && marketDemand >= 0.86
        && hasRevenueRoom;

    if (!commerciallyViable) {
        return noExtension(currentMaxWeeks, totalExtensionWeeks);
    }

    let reason: TheatricalExtensionReason | null = null;
    if (holdRatio >= 0.72 && rating >= 7.2) {
        reason = 'STRONG_HOLD';
    } else if (grossToBudget >= 0.12 && marketDemand >= 1) {
        reason = 'BREAKOUT_DEMAND';
    } else if (input.budget <= 50_000_000 && holdRatio >= 0.66 && rating >= 7.3) {
        reason = 'SLEEPER_MOMENTUM';
    }

    if (!reason) {
        return noExtension(currentMaxWeeks, totalExtensionWeeks);
    }

    const exceptionalRun =
        holdRatio >= 0.78
        && rating >= 7.6
        && marketDemand >= 0.96
        && grossToBudget >= 0.08;
    const remainingExtensionAllowance = Math.min(
        MAX_THEATRICAL_EXTENSION_WEEKS - totalExtensionWeeks,
        ABSOLUTE_THEATRICAL_WEEK_CAP - currentMaxWeeks
    );
    const addedWeeks = Math.max(0, Math.min(exceptionalRun ? 2 : 1, remainingExtensionAllowance));

    if (addedWeeks <= 0) {
        return noExtension(currentMaxWeeks, totalExtensionWeeks);
    }

    const decision: TheatricalExtensionDecision = {
        reviewWeek,
        addedWeeks,
        reason,
        weeklyGross: Math.round(currentGross),
        holdPercent: Math.round(holdRatio * 100),
        marketDemand: Math.round(marketDemand * 100),
    };

    return {
        shouldExtend: true,
        addedWeeks,
        newMaxTheatricalWeeks: currentMaxWeeks + addedWeeks,
        totalExtensionWeeks: totalExtensionWeeks + addedWeeks,
        decision,
    };
};

export const getTheatricalExtensionReasonLabel = (reason: TheatricalExtensionReason): string => {
    if (reason === 'BREAKOUT_DEMAND') return 'breakout demand';
    if (reason === 'SLEEPER_MOMENTUM') return 'sleeper-hit momentum';
    return 'strong audience hold';
};
