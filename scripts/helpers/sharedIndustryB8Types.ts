export type SharedIndustryB8Regime = 'BASELINE' | 'LEAN' | 'BOOM' | 'CROWDED' | 'ADVERSE';

export type SharedIndustryB8ViolationCode =
    | 'NON_FINITE_VALUE'
    | 'DUPLICATE_PROJECT_ID'
    | 'DUPLICATE_PRODUCTION_ID'
    | 'DUPLICATE_EVENT_ID'
    | 'DANGLING_PROJECT_REFERENCE'
    | 'INVALID_STREAMING_THEATRICAL_RELEASE'
    | 'UNEXPLAINED_NEGATIVE_CASH'
    | 'UNBOUNDED_HISTORY'
    | 'CHECKPOINT_MISSING';

export interface SharedIndustryB8Violation {
    code: SharedIndustryB8ViolationCode;
    detail: string;
    absoluteWeek: number;
}

export interface SharedIndustryB8IntegritySnapshot {
    nonFiniteValues: number;
    duplicateProjectIds: number;
    duplicateProductionIds: number;
    duplicateEventIds: number;
    danglingProjectReferences: number;
    invalidStreamingTheatricalReleases: number;
    unexplainedNegativeCash: number;
    unboundedHistories: number;
}

export interface SharedIndustryB8RegistryCounts {
    studios: number;
    platforms: number;
    projects: number;
    productions: number;
    rightsContracts: number;
    industryEvents: number;
}

export interface SharedIndustryB8Snapshot {
    absoluteWeek: number;
    counts: SharedIndustryB8RegistryCounts;
    integrity: SharedIndustryB8IntegritySnapshot;
    projectIds: string[];
    productionIds: string[];
    eventIds: string[];
    materialEventCount: number;
}

export interface SharedIndustryB8Report {
    regime: SharedIndustryB8Regime;
    seed: string;
    horizonWeeks: number;
    checkpoints: SharedIndustryB8Snapshot[];
    expectedCheckpoints: number[];
    integrity: SharedIndustryB8IntegritySnapshot & {
        missingCheckpoints: number;
    };
    experience?: SharedIndustryB8ExperienceMetrics;
}

export interface SharedIndustryB8ExperienceMetrics {
    regime: SharedIndustryB8Regime;
    seed: string;
    measuredYears: number;
    commercialYearWins: Record<string, number>;
    majorExpensiveFailures: number;
    smallRegionalBreakouts: number;
    genuineCompanyFailures: number;
    unexplainedRescueCashEvents: number;
    exactNonLineageFingerprintRepeats: number;
    materialPublicEvents: number;
    routineAccountingEvents: number;
    silentYears: number;
    activeCompaniesAtEnd: number;
}

export interface FinalizeSharedIndustryB8ReportInput {
    regime: SharedIndustryB8Regime;
    seed: string;
    snapshots: SharedIndustryB8Snapshot[];
    expectedCheckpoints?: readonly number[];
}
