/** Phase 1 input contracts; this does not activate a new market/save schema. */
export const CINEMA_INPUT_VERSION = 1;
export const CINEMA_ROLE_WEIGHTS = {
    LEAD: 1, ENSEMBLE: 0.9, SUPPORTING: 0.65, CAMEO: 0.25, MINOR: 0.1,
} as const;

/** Normalized craft shares; fame/marketing/distribution have no craft weight. */
export const CINEMA_CRAFT_WEIGHTS = { script: 0.35, direction: 0.25, cast: 0.2, crew: 0.2 } as const;

/** Candidate exposure parameters, not calibrated ticket conversion or revenue multipliers. */
export const CINEMA_EXPOSURE_TUNING_VERSION = 1;
export const CINEMA_EXPOSURE_PROFILE = {
    legacyRecognitionCeiling: 0.22,
    incrementalCastOverlap: 0.25,
    announcementRecognitionReach: 0.45,
    localFootfallDiscovery: 0.025,
    qualifiedImpressionsPerDollar: 30,
    favoriteRecognitionLift: 0.2,
    studioTrustReach: 0.2,
} as const;

/** Candidate behavior/supply coefficients. Phase 6 calibrates these against full careers. */
export const CINEMA_MARKET_TUNING_VERSION = 5;
export const CINEMA_AUDIENCE_PROFILE = {
    contactRatePerSatisfiedViewer: 1.8, contactOverlap: 0.35,
    favoriteLift: 0.28, maxFavoriteLift: 0.35,
    firstWeeklyIntent: 0.08, repeatWeeklyIntent: 0.05,
    /** Satisfied existing fans plan visits more readily; fame alone creates no loyal segment. */
    loyalWeeklyIntent: 0.32, loyalAttentionOpportunities: 4,
    /** Opportunity loses urgency gradually; no money or week-count cutoff. */
    openingInterestGraceWeeks: 2, firstInterestHalfLifeWeeks: 3, repeatInterestHalfLifeWeeks: 2,
    /** Only a reliable, excellent paid response sustains a film's existing audience interest. */
    excellentResponseHold: 3,
    deferredRetentionPerWeek: 0.8, recentRepeatHalfLifeWeeks: 3,
    activeTitleHistoryWeeks: 104, maxAffinityEntriesPerCohort: 48,
} as const;
export const CINEMA_SUPPLY_PROFILE = {
    seatsPerShow: 180, openingMinutesPerDay: 720, daysPerWeek: 7,
    turnaroundMinutes: 25, standardBasePriceCents: 1200,
    premiumPriceMultiplier: 1.4, premiumScreenShare: 0.2,
    quietWeeksBeforeExit: 2, discoveryGraceWeeks: 2,
    standardOperatingCentsPerShow: 9500,
    minimumShowsPerBooking: 7, targetOccupancy: .5, minimumOccupancy: .18,
    /** Twelve monthly envelopes distributed exactly over each 52-week year. */
    monthsPerYear: 12, weeksPerYear: 52,
} as const;

/** Forecast valuation assumptions, not guaranteed household conversions or producer returns. */
export const CINEMA_RIGHTS_PROFILE = Object.freeze({
    titleCashShare:.08, awarenessIntentShare:.22, paidContributionMargin:.35, attributedPaidMonths:2,
    maximumValueShare:.7, centralValueShare:.55, intentRetentionPerWeek:.97,
    observedUncertainty:.25, unobservedUncertainty:.5, maximumWaitingPreference:.25,
    reachableSubscriberMultiple:2,
});
