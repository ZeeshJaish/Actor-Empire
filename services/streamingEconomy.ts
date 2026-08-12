/**
 * The incorporation price is shared by eligibility, founding UI, validation,
 * and the atomic incorporation transaction. Keeping one source of truth avoids
 * showing an $85M requirement while charging a different amount.
 */
export const STREAMING_INCORPORATION_ECONOMY = Object.freeze({
    cashRequired: 85_000_000,
    setupCostsConsumed: 70_000_000,
    openingTreasuryCash: 15_000_000,
});

export interface StreamingIncorporationBreakdown {
    cashRequired: number;
    setupCostsConsumed: number;
    openingTreasuryCash: number;
    affordable: boolean;
    shortfall: number;
    remainingPersonalCash: number;
}

export const getStreamingIncorporationBreakdown = (
    playerMoney: number,
): StreamingIncorporationBreakdown => {
    const numericPlayerMoney = Number(playerMoney);
    const safePlayerMoney = Number.isFinite(numericPlayerMoney)
        ? Math.max(0, numericPlayerMoney)
        : 0;
    const { cashRequired, setupCostsConsumed, openingTreasuryCash } = STREAMING_INCORPORATION_ECONOMY;
    return {
        cashRequired,
        setupCostsConsumed,
        openingTreasuryCash,
        affordable: safePlayerMoney >= cashRequired,
        shortfall: Math.max(0, cashRequired - safePlayerMoney),
        remainingPersonalCash: Math.max(0, safePlayerMoney - cashRequired),
    };
};
