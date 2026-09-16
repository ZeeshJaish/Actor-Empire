import type {
    Player,
    WorldEconomyIntegritySeverity,
    WorldEconomyIntegritySystem,
    WorldEconomyIntegrityViolation,
    WorldEconomyHealthSummary,
    WorldEconomyValidationResult,
} from '../../types';
import { createWorldAudienceEconomyState } from './worldAudienceCohorts';
import { createWorldAudienceParticipationState } from './worldAudienceParticipation';
import { createWorldPopulationState } from './worldPopulation';
import { createWorldStreamingCompetitionState } from './worldStreamingCompetition';
import { createWorldStreamingCustomerState } from './worldStreamingCustomers';
import { createWorldStreamingPlatformEconomyState } from './worldStreamingPlatformEconomy';
import { createWorldStreamingViewingState } from './worldStreamingViewing';

const HISTORY_LIMITS: Record<Exclude<WorldEconomyIntegritySystem, 'WEEK'>, number> = {
    WE1: 32,
    WE2: 32,
    WE3: 32,
    WE4: 32,
    WE5: 52,
    WE6: 52,
    WE7: 52,
};

const ACCOUNT_TOLERANCE = 1;

export class WorldEconomyIntegrityError extends Error {
    readonly codes: string[];
    readonly status: WorldEconomyValidationResult['status'];

    constructor(result: WorldEconomyValidationResult) {
        super(`World economy integrity failed (${result.status}): ${result.violations.map(item => item.code).join(', ')}`);
        this.name = 'WorldEconomyIntegrityError';
        this.status = result.status;
        this.codes = result.violations.map(item => item.code).slice(0, 12);
    }
}

const within = (left: number, right: number, tolerance = ACCOUNT_TOLERANCE): boolean => (
    Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= tolerance
);

const allFinite = (value: unknown): boolean => {
    if (typeof value === 'number') return Number.isFinite(value);
    if (Array.isArray(value)) return value.every(allFinite);
    if (value && typeof value === 'object') return Object.values(value as Record<string, unknown>).every(allFinite);
    return true;
};

const violation = (
    code: string,
    system: WorldEconomyIntegritySystem,
    severity: WorldEconomyIntegritySeverity = 'DERIVED',
): WorldEconomyIntegrityViolation => ({ code, system, severity });

export const validateWorldEconomyCandidate = (
    player: Player,
    absoluteWeek: number,
): WorldEconomyValidationResult => {
    const week = Math.max(0, Math.round(Number(absoluteWeek) || 0));
    const issues: WorldEconomyIntegrityViolation[] = [];

    if (!Number.isFinite(player.money)) {
        issues.push(violation('PLAYER_MONEY_NON_FINITE', 'WEEK', 'PROTECTED'));
    }

    const states = [
        ['WE1', player.world.worldPopulation],
        ['WE2', player.world.worldAudienceEconomy],
        ['WE3', player.world.worldAudienceParticipation],
        ['WE4', player.world.worldStreamingCompetition],
        ['WE5', player.world.worldStreamingCustomers],
        ['WE6', player.world.worldStreamingViewing],
        ['WE7', player.world.worldStreamingPlatformEconomy],
    ] as const;

    states.forEach(([system, state]) => {
        if (!state) {
            issues.push(violation(`${system}_STATE_MISSING`, system));
            return;
        }
        if (state.lastProcessedAbsoluteWeek !== week) {
            issues.push(violation(`${system}_WEEK_MISMATCH`, system));
        }
        if (!allFinite(state.global)) {
            issues.push(violation(`${system}_NON_FINITE`, system));
        }
        if (state.snapshots.length > HISTORY_LIMITS[system]) {
            issues.push(violation(`${system}_HISTORY_UNBOUNDED`, system));
        }
    });

    const population = player.world.worldPopulation;
    if (population) {
        const countries = Object.values(population.countries);
        const populationTotal = countries.reduce((sum, country) => sum + country.population, 0);
        const householdTotal = countries.reduce((sum, country) => sum + country.households, 0);
        if (!within(population.global.population, populationTotal)) {
            issues.push(violation('WE1_POPULATION_TOTAL_MISMATCH', 'WE1'));
        }
        if (!within(population.global.households, householdTotal)) {
            issues.push(violation('WE1_HOUSEHOLD_TOTAL_MISMATCH', 'WE1'));
        }
        if (population.global.countryCount !== countries.length) {
            issues.push(violation('WE1_COUNTRY_COUNT_MISMATCH', 'WE1'));
        }
    }

    const audience = player.world.worldAudienceEconomy;
    if (population && audience) {
        if (!within(audience.global.population, population.global.population)
            || !within(audience.global.households, population.global.households)) {
            issues.push(violation('WE2_POPULATION_SOURCE_MISMATCH', 'WE2'));
        }
    }

    const participation = player.world.worldAudienceParticipation;
    if (audience && participation) {
        if (!within(participation.global.population, audience.global.population)
            || !within(participation.global.households, audience.global.households)) {
            issues.push(violation('WE3_AUDIENCE_SOURCE_MISMATCH', 'WE3'));
        }
    }

    const customers = player.world.worldStreamingCustomers;
    const viewing = player.world.worldStreamingViewing;
    const platformEconomy = player.world.worldStreamingPlatformEconomy;
    if (customers) {
        const paidAccounts = Object.values(customers.countries).reduce(
            (sum, country) => sum + country.platformSummaries.reduce((countrySum, row) => countrySum + row.endingPaidAccounts, 0),
            0,
        );
        if (!within(customers.global.endingPaidAccounts, paidAccounts)) {
            issues.push(violation('WE5_PAID_ACCOUNTS_MISMATCH', 'WE5'));
        }
        if (Object.values(customers.countries).some(country => !allFinite({
            endingPaidAccounts: country.endingPaidAccounts,
            payingHouseholds: country.payingHouseholds,
            monthlySubscriptionRevenue: country.monthlySubscriptionRevenue,
        }))) issues.push(violation('WE5_COUNTRY_NON_FINITE', 'WE5'));
    }
    if (viewing) {
        const viewingAccounts = Object.values(viewing.platforms).reduce((sum, row) => sum + row.totalViewingAccounts, 0);
        if (!within(viewing.global.totalViewingAccounts, viewingAccounts)) {
            issues.push(violation('WE6_VIEWING_ACCOUNTS_MISMATCH', 'WE6'));
        }
        if (Object.values(viewing.platforms).some(platform => !allFinite({
            totalViewingAccounts: platform.totalViewingAccounts,
            totalHoursViewed: platform.totalHoursViewed,
            totalIncrementalRevenue: platform.revenue.totalIncrementalRevenue,
        }))) issues.push(violation('WE6_PLATFORM_NON_FINITE', 'WE6'));
    }
    if (platformEconomy) {
        const summaries = Object.values(platformEconomy.platforms);
        if (summaries.some(summary => !allFinite({
            endingPaidAccounts: summary.endingPaidAccounts,
            viewingAccounts: summary.viewingAccounts,
            weeklyRevenue: summary.weeklyRevenue,
            weeklyOperatingResult: summary.weeklyOperatingResult,
        }))) issues.push(violation('WE7_PLATFORM_NON_FINITE', 'WE7'));
        const paidAccounts = summaries.reduce((sum, row) => sum + row.endingPaidAccounts, 0);
        if (!within(platformEconomy.global.endingPaidAccounts, paidAccounts)) {
            issues.push(violation('WE7_PAID_ACCOUNTS_MISMATCH', 'WE7'));
        }
        if (Object.values(platformEconomy.historyByPlatform).some(history => history.length > HISTORY_LIMITS.WE7)) {
            issues.push(violation('WE7_HISTORY_UNBOUNDED', 'WE7'));
        }
        const acquired = new Set<string>(player.ownedStreamingPlatform?.corporateDevelopment?.acquiredPlatformIds || []);
        for (const [platformId, summary] of Object.entries(platformEconomy.platforms)) {
            if (!acquired.has(platformId)) continue;
            if (summary.controller !== 'PLAYER'
                || summary.operatingCostPolicy.controller !== 'PLAYER'
                || summary.operatingCostPolicy.aiAssistanceActive
                || summary.operatingCostPolicy.appliedCostMultiplier !== 1) {
                issues.push(violation('WE7_ACQUIRED_AI_ASSISTANCE', 'WE7'));
                break;
            }
        }
    }

    const status = issues.some(item => item.severity === 'PROTECTED')
        ? 'ABORT_PROTECTED'
        : issues.length ? 'REBUILD_DERIVED' : 'VALID';
    return { status, violations: issues };
};

export const repairDerivedWorldEconomyState = (
    player: Player,
    absoluteWeek: number,
): Player => {
    const week = Math.max(0, Math.round(Number(absoluteWeek) || 0));
    const population = createWorldPopulationState(week);
    const audience = createWorldAudienceEconomyState(population, week);
    const participation = createWorldAudienceParticipationState(population, audience, week);
    let repaired: Player = {
        ...player,
        world: {
            ...player.world,
            worldPopulation: population,
            worldAudienceEconomy: audience,
            worldAudienceParticipation: participation,
        },
    };
    const competition = createWorldStreamingCompetitionState(repaired, week);
    repaired = { ...repaired, world: { ...repaired.world, worldStreamingCompetition: competition } };
    const customers = createWorldStreamingCustomerState(repaired, week);
    repaired = { ...repaired, world: { ...repaired.world, worldStreamingCustomers: customers } };
    const viewing = createWorldStreamingViewingState(repaired, week);
    repaired = { ...repaired, world: { ...repaired.world, worldStreamingViewing: viewing } };
    const economy = createWorldStreamingPlatformEconomyState(repaired, week);
    return { ...repaired, world: { ...repaired.world, worldStreamingPlatformEconomy: economy } };
};

export const createWorldEconomyHealthSummary = (
    player: Player,
    absoluteWeek: number,
    migrationVersion: number,
    warningCodes: string[] = [],
    workloadMode: WorldEconomyHealthSummary['workloadMode'] = 'NORMAL',
): WorldEconomyHealthSummary => {
    const world = player.world;
    const audienceCountries = Object.values(world.worldAudienceEconomy?.countries || {});
    return {
        schemaVersion: 1,
        lastValidatedAbsoluteWeek: Math.max(0, Math.round(Number(absoluteWeek) || 0)),
        sourceFingerprints: {
            WE1: world.worldPopulation
                ? `we1:${world.worldPopulation.schemaVersion}:${world.worldPopulation.lastProcessedAbsoluteWeek}:${world.worldPopulation.global.population}`
                : 'missing',
            WE2: world.worldAudienceEconomy
                ? `we2:${world.worldAudienceEconomy.schemaVersion}:${world.worldAudienceEconomy.lastProcessedAbsoluteWeek}:${world.worldAudienceEconomy.global.cohortCount}`
                : 'missing',
            WE3: world.worldAudienceParticipation
                ? `we3:${world.worldAudienceParticipation.schemaVersion}:${world.worldAudienceParticipation.lastProcessedAbsoluteWeek}:${world.worldAudienceParticipation.global.streamingReachableHouseholds}`
                : 'missing',
            WE4: world.worldStreamingCompetition?.sourceFingerprint || 'missing',
            WE5: world.worldStreamingCustomers?.sourceFingerprint || 'missing',
            WE6: world.worldStreamingViewing?.sourceFingerprint || 'missing',
            WE7: world.worldStreamingPlatformEconomy?.sourceFingerprint || 'missing',
        },
        workloadMode,
        warningCodes: [...new Set(warningCodes)].slice(0, 12),
        stateSizeCounters: {
            countries: Object.keys(world.worldPopulation?.countries || {}).length,
            cohorts: audienceCountries.reduce((sum, country) => sum + country.cohorts.length, 0),
            platforms: Object.keys(world.worldStreamingPlatformEconomy?.platforms || {}).length,
            customerMovements: world.worldStreamingCustomers?.recentMovements.length || 0,
            snapshots: [
                world.worldPopulation,
                world.worldAudienceEconomy,
                world.worldAudienceParticipation,
                world.worldStreamingCompetition,
                world.worldStreamingCustomers,
                world.worldStreamingViewing,
                world.worldStreamingPlatformEconomy,
            ].reduce((sum, state) => sum + (state?.snapshots.length || 0), 0),
        },
        lastSuccessfulMigrationVersion: Math.max(0, Math.round(Number(migrationVersion) || 0)),
    };
};
