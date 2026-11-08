/**
 * The incorporation price is shared by eligibility, founding UI, validation,
 * and the atomic incorporation transaction. Keeping one source of truth avoids
 * showing one requirement while charging a different amount.
 */
export const STREAMING_INCORPORATION_ECONOMY = Object.freeze({
    /* Zeesh, 2026-11-08: the entry rose from $85M to $150M - qualify with it, pay it, all of it consumed */
    cashRequired: 150_000_000,
    setupCostsConsumed: 150_000_000,
    openingTreasuryCash: 0,
});

/** The entry as copy says it ("$150M"), so no screen spells the number out by hand. */
export const STREAMING_INCORPORATION_LABEL = `$${Math.round(STREAMING_INCORPORATION_ECONOMY.cashRequired / 1_000_000)}M`;

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
