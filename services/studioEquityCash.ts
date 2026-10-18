import type { Business } from '../types';

const finite = (value: number | undefined): number => Number.isFinite(value) ? Number(value) : 0;

/**
 * Recorded studio valuations already contain cash. Keep their operating value
 * while accounting for subsequent cash movements at par, instead of counting
 * withdrawn cash again in the owner's wallet. Missing legacy bases start from
 * the existing valuation; migration never invents historical withdrawals.
 */
export const getStudioStandaloneEquityValue = (studio: Business): number => {
    const valuation = Math.max(0, finite(studio.stats?.valuation));
    const cash = finite(studio.balance);
    const basis = studio.studioState?.equityCashBasis;
    const hasCurrentBasis = basis
        && Number.isFinite(basis.recordedValuation)
        && Number.isFinite(basis.cashBalance)
        && basis.recordedValuation === valuation;
    if (!hasCurrentBasis) return Math.max(0, valuation, cash);
    return Math.max(0, cash, Math.max(basis.recordedValuation, basis.cashBalance) + cash - basis.cashBalance);
};

/** Call before mutating capital, so an old save's current valuation is preserved. */
export const captureStudioEquityCashBasis = (studio: Business): Business => {
    if (studio.type !== 'PRODUCTION_HOUSE' || !studio.studioState) return studio;
    const valuation = Math.max(0, finite(studio.stats?.valuation));
    const basis = studio.studioState.equityCashBasis;
    if (basis && basis.recordedValuation === valuation && Number.isFinite(basis.cashBalance)) return studio;
    return resetStudioEquityCashBasis(studio);
};

/** A genuine business appraisal replaces the old cash-inclusive valuation. */
export const resetStudioEquityCashBasis = (studio: Business): Business => {
    if (studio.type !== 'PRODUCTION_HOUSE' || !studio.studioState) return studio;
    return {
        ...studio,
        studioState: {
            ...studio.studioState,
            equityCashBasis: {
                recordedValuation: Math.max(0, finite(studio.stats?.valuation)),
                cashBalance: finite(studio.balance),
            },
        },
    };
};

/** Market sentiment reappraises operating assets, never capital already moved. */
export const applyStudioOperatingValuationMultiplier = (studio: Business, multiplier: number): Business => {
    if (studio.type !== 'PRODUCTION_HOUSE') return studio;
    const cash = Math.max(0, finite(studio.balance));
    const operatingValue = Math.max(0, getStudioStandaloneEquityValue(studio) - cash);
    return resetStudioEquityCashBasis({
        ...studio,
        stats: {
            ...studio.stats,
            valuation: Math.max(0, Math.round(operatingValue * Math.max(0, finite(multiplier))) + cash),
        },
    });
};
