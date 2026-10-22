import { CINEMA_RIGHTS_PROFILE as P } from './boxOfficeProfiles';
export interface CinemaRightsValueInput {
    titleId: string;
    buyerId: string;
    absoluteWeek: number;
    startsAtAbsoluteWeek: number;
    durationWeeks: number;
    hasRights: boolean;
    alreadySigned: boolean;
    buyerCashCents: number;
    unpaidObligationsCents: number;
    countries: Array<{
        countryId: string;
        reachableHouseholds: number;
        interestedHouseholds: number;
        overlapFraction: number;
        deferredHouseholds: number;
        contributionCentsPerHousehold: number;
    }>;
    uncertainty: number;
}
export interface CinemaRightsQuote {
    scope?: {
        countryIds: string[];
        startsAtAbsoluteWeek: number;
        durationWeeks: number;
    };
    eligible: boolean;
    maximumBidCents: number;
    range: {
        low: number;
        mid: number;
        high: number;
    };
    incrementalHouseholds: number;
    drivers: string[];
}
const count = (n: number) => { if (!Number.isSafeInteger(n) || n < 0)
    throw new RangeError('Invalid rights count or money'); return n; };
const fraction = (n: number) => { if (!Number.isFinite(n) || n < 0 || n > 1)
    throw new RangeError('Invalid rights uncertainty or overlap'); return n; };
/** Incremental contribution, never budget recovery. A quote grants no rights, views, subscribers or cash. */
export const valueCinemaStreamingRights = (input: CinemaRightsValueInput): CinemaRightsQuote => {
    [input.absoluteWeek, input.startsAtAbsoluteWeek, input.durationWeeks, input.buyerCashCents, input.unpaidObligationsCents].forEach(count);
    fraction(input.uncertainty);
    const seen = new Set<string>();
    let households = 0, value = 0;
    const delay = Math.max(0, input.startsAtAbsoluteWeek - input.absoluteWeek);
    for (const c of input.countries) {
        if (seen.has(c.countryId))
            throw new Error('Duplicate rights market');
        seen.add(c.countryId);
        [c.reachableHouseholds, c.interestedHouseholds, c.deferredHouseholds, c.contributionCentsPerHousehold].forEach(count);
        fraction(c.overlapFraction);
        const incremental = Math.floor(Math.min(c.reachableHouseholds, Math.max(c.interestedHouseholds, c.deferredHouseholds)) * (1 - c.overlapFraction) * Math.pow(P.intentRetentionPerWeek, delay));
        households = count(households + incremental);
        value = count(value + Math.floor(incremental * c.contributionCentsPerHousehold * Math.min(1, input.durationWeeks / 52)));
    }
    const available = Math.max(0, input.buyerCashCents - input.unpaidObligationsCents);
    const eligible = input.hasRights && !input.alreadySigned && input.durationWeeks > 0 && input.startsAtAbsoluteWeek >= input.absoluteWeek && available > 0 && value > 0;
    const maximumBidCents = eligible ? Math.floor(Math.min(available, value * P.maximumValueShare)) : 0;
    const mid = eligible ? Math.floor(Math.min(maximumBidCents, value * P.centralValueShare * (1 - input.uncertainty * .5))) : 0;
    return { eligible: eligible && maximumBidCents > 0, maximumBidCents, range: { low: Math.floor(mid * (1 - input.uncertainty)), mid, high: maximumBidCents }, incrementalHouseholds: households,
        drivers: ['Reachable households within the offered countries and window', 'Existing viewing overlap and decaying unconverted interest',
            'Buyer contribution after operating costs; uncertainty leaves a surplus for risk', 'Available cash after unpaid signed obligations; quote creates no guaranteed viewing'] };
};
