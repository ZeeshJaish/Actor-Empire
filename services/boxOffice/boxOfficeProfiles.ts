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
