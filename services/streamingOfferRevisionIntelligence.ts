export type StreamingOfferRevisionVariant = 'UP' | 'DOWN' | 'RESTRUCTURE';

export interface StreamingOfferRevisionInput {
    currentValue: number;
    currentAmount: number;
    currentExposure?: number;
    competitorValue: number;
    capacityCeiling: number;
    minimumAmount: number;
    randomFactor: number;
}

export interface StreamingOfferRevisionDecision {
    variant: StreamingOfferRevisionVariant;
    targetAmount: number;
}

const finite = (value: number, fallback = 0): number => (
    Number.isFinite(value) ? value : fallback
);

/**
 * Shared field-aware revision policy for streaming rights auctions.
 *
 * The offer can move up, move down, or restructure. A bidder therefore reacts
 * to the room instead of treating every later revision as a higher bid.
 */
export const resolveStreamingOfferRevision = (
    input: StreamingOfferRevisionInput,
): StreamingOfferRevisionDecision => {
    const minimumAmount = Math.max(0, finite(input.minimumAmount));
    const capacityCeiling = Math.max(minimumAmount, finite(input.capacityCeiling, minimumAmount));
    const currentAmount = Math.min(capacityCeiling, Math.max(minimumAmount, finite(input.currentAmount, minimumAmount)));
    const currentExposure = Math.max(0, finite(input.currentExposure ?? input.currentAmount, currentAmount));
    const currentValue = Math.max(0, finite(input.currentValue));
    const competitorValue = Math.max(0, finite(input.competitorValue));
    const randomFactor = Math.min(1, Math.max(0, finite(input.randomFactor, 0.5)));

    if (competitorValue > currentValue * 1.12 && capacityCeiling > currentExposure * 1.08) {
        return {
            variant: 'UP',
            targetAmount: Math.min(
                capacityCeiling,
                Math.max(currentAmount * 1.14, competitorValue * (0.82 + randomFactor * 0.12)),
            ),
        };
    }

    if (currentValue > Math.max(minimumAmount, competitorValue) * 1.34) {
        return {
            variant: 'DOWN',
            targetAmount: Math.max(minimumAmount, currentAmount * (0.68 + randomFactor * 0.12)),
        };
    }

    return {
        variant: 'RESTRUCTURE',
        targetAmount: Math.min(
            capacityCeiling,
            Math.max(minimumAmount, currentAmount * (randomFactor > 0.5 ? 1.08 : 0.91)),
        ),
    };
};
