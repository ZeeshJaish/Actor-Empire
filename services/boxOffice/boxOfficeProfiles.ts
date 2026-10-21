/** Phase 1 input contracts; this does not activate a new market/save schema. */
export const CINEMA_INPUT_VERSION = 1;
export const CINEMA_ROLE_WEIGHTS = {
    LEAD: 1, ENSEMBLE: 0.9, SUPPORTING: 0.65, CAMEO: 0.25, MINOR: 0.1,
} as const;
