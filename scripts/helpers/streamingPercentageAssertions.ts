/** Audit-only checks: tolerate floating-point addition, never invalid data. */
export const assertPercentageTotal = (values: readonly number[], message: string): void => {
    if (!values.length || values.some(value => typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100)) {
        throw new Error(`${message} Invalid percentage value.`);
    }
    const total = values.reduce((sum, value) => sum + value, 0);
    if (Math.abs(total - 100) > 1e-9) throw new Error(`${message} Received ${total}%.`);
};

interface DiscoveryPercentages {
    homepagePercent: number;
    recommendationsPercent: number;
    searchPercent: number;
    directPercent: number;
    marketingPercent?: number;
    externalBuzzPercent?: number;
}

export const assertDiscoveryPercentageTotal = (mix: DiscoveryPercentages, message: string): void => {
    assertPercentageTotal([
        mix.homepagePercent,
        mix.recommendationsPercent,
        mix.searchPercent,
        mix.directPercent,
        mix.marketingPercent === undefined ? 0 : mix.marketingPercent,
        mix.externalBuzzPercent === undefined ? 0 : mix.externalBuzzPercent,
    ], message);
};
