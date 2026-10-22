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
export const CINEMA_MARKET_TUNING_VERSION = 1;
export const CINEMA_AUDIENCE_PROFILE = {
    contactRatePerSatisfiedViewer: 1.8, contactOverlap: 0.35,
    favoriteLift: 0.28, maxFavoriteLift: 0.35,
    firstWeeklyIntent: 0.32, repeatWeeklyIntent: 0.12,
    deferredRetentionPerWeek: 0.8, recentRepeatHalfLifeWeeks: 3,
    activeTitleHistoryWeeks: 104, maxAffinityEntriesPerCohort: 48,
} as const;
export const CINEMA_SUPPLY_PROFILE = {
    seatsPerShow: 180, openingMinutesPerDay: 720, daysPerWeek: 7,
    turnaroundMinutes: 25, standardBasePriceCents: 1200,
    premiumPriceMultiplier: 1.4, premiumScreenShare: 0.2,
    quietWeeksBeforeExit: 3, discoveryGraceWeeks: 4,
    /** Twelve monthly envelopes distributed exactly over each 52-week year. */
    monthsPerYear: 12, weeksPerYear: 52,
} as const;
