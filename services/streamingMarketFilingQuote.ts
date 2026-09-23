/** Founder attention for one explicit market-filing action.
 * Each country still has its own rights/compliance cash and review. The energy
 * discount is for preparing several new files in one action, not for belonging
 * to a named region or group.
 */
export const STREAMING_SINGLE_MARKET_FILING_ENERGY = 5;

export const quoteStreamingMarketFilingEnergy = (requestedCount: number): number => {
    const count = Number.isFinite(requestedCount) ? Math.max(0, Math.floor(requestedCount)) : 0;
    if (count === 0) return 0;
    const additional = count - 1;
    return Math.min(30, STREAMING_SINGLE_MARKET_FILING_ENERGY
        + 2 * Math.min(additional, 8)
        + Math.max(0, additional - 8));
};
