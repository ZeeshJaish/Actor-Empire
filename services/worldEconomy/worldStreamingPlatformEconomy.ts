import type {
    Player,
    WorldStreamingCustomerPlatformSummary,
    WorldStreamingPlatformEconomyGlobalSummary,
    WorldStreamingPlatformEconomyHistoryEntry,
    WorldStreamingPlatformEconomySnapshot,
    WorldStreamingPlatformEconomyState,
    WorldStreamingPlatformEconomySummary,
    WorldStreamingPlatformOperatingCostPolicy,
} from '../../types';
import { createDeterministicId } from '../deterministicRandom';
import { normalizeStreamingPlatformEcosystem } from '../streamingPlatformEcosystem';
import { normalizeWorldPlatformAi } from '../platformAi/platformAiState';
import { normalizeWorldStreamingCustomerState } from './worldStreamingCustomers';
import { normalizeWorldStreamingViewingState } from './worldStreamingViewing';

export const WORLD_STREAMING_PLATFORM_ECONOMY_SCHEMA_VERSION = 1 as const;
const MAX_SNAPSHOTS = 52;

const clamp = (value: number, minimum: number, maximum: number): number => (
    Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
);
const canonicalZero = (value: number): number => Object.is(value, -0) ? 0 : value;
const round2 = (value: number): number => canonicalZero(Math.round((Number.isFinite(value) ? value : 0) * 100) / 100);
const round4 = (value: number): number => canonicalZero(Math.round((Number.isFinite(value) ? value : 0) * 10_000) / 10_000);
const accountsToMillions = (accounts: number): number => Math.round(Math.max(0, accounts) / 10_000) / 100;

export const resolveWorldStreamingPlatformCostPolicy = (
    player: Player,
    platformId: string,
): WorldStreamingPlatformOperatingCostPolicy => {
    const acquired = player.ownedStreamingPlatform?.corporateDevelopment?.acquiredPlatformIds || [];
    const controller: 'AI' | 'PLAYER' = platformId === 'PLAYER' || acquired.includes(platformId as never)
        ? 'PLAYER' : 'AI';
    if (controller === 'PLAYER') {
        return {
            controller,
            policyVersion: 1,
            standardCostMultiplier: 1,
            appliedCostMultiplier: 1,
            aiAssistanceActive: false,
        };
    }
    const ecosystem = normalizeStreamingPlatformEcosystem(
        player.world.streamingPlatformEcosystem,
        player.world.streamingPlatformEcosystem?.lastProcessedAbsoluteWeek ?? 0,
    );
    const efficiency = ecosystem.operators[platformId]?.efficiency ?? 65;
    return {
        controller,
        policyVersion: 1,
        standardCostMultiplier: 1,
        appliedCostMultiplier: round4(clamp(.92 - efficiency * .0012, .78, .9)),
        aiAssistanceActive: true,
    };
};

const emptyGlobal = (): WorldStreamingPlatformEconomyGlobalSummary => ({
    platformCount: 0,
    endingPaidAccounts: 0,
    payingHouseholds: 0,
    viewingAccounts: 0,
    hoursViewed: 0,
    monthlySubscriptionRevenue: 0,
    weeklySubscriptionRevenue: 0,
    weeklyIncrementalRevenue: 0,
    weeklyRevenue: 0,
    standardWeeklyOperatingCost: 0,
    appliedWeeklyOperatingCost: 0,
    weeklyOperatingResult: 0,
});

const mergeCustomerRows = (
    rows: WorldStreamingCustomerPlatformSummary[],
): Omit<WorldStreamingCustomerPlatformSummary, 'platformId' | 'platformName' | 'planAllocations' | 'strongestReasonId'> => ({
    startingPaidAccounts: rows.reduce((sum, row) => sum + row.startingPaidAccounts, 0),
    endingPaidAccounts: rows.reduce((sum, row) => sum + row.endingPaidAccounts, 0),
    payingHouseholds: rows.reduce((sum, row) => sum + row.payingHouseholds, 0),
    joins: rows.reduce((sum, row) => sum + row.joins, 0),
    cancellations: rows.reduce((sum, row) => sum + row.cancellations, 0),
    reactivations: rows.reduce((sum, row) => sum + row.reactivations, 0),
    upgrades: rows.reduce((sum, row) => sum + row.upgrades, 0),
    downgrades: rows.reduce((sum, row) => sum + row.downgrades, 0),
    switchIns: rows.reduce((sum, row) => sum + row.switchIns, 0),
    switchOuts: rows.reduce((sum, row) => sum + row.switchOuts, 0),
    externalSharedHouseholds: rows.reduce((sum, row) => sum + row.externalSharedHouseholds, 0),
    sharedActiveViewers: rows.reduce((sum, row) => sum + row.sharedActiveViewers, 0),
    piracyReach: rows.reduce((sum, row) => sum + row.piracyReach, 0),
    accessLoadAccounts: rows.reduce((sum, row) => sum + row.accessLoadAccounts, 0),
    monthlySubscriptionRevenue: round2(rows.reduce((sum, row) => sum + row.monthlySubscriptionRevenue, 0)),
});

const buildState = (
    player: Player,
    absoluteWeek: number,
    initializedAtAbsoluteWeek: number,
    snapshots: WorldStreamingPlatformEconomySnapshot[],
    historyByPlatform: Record<string, WorldStreamingPlatformEconomyHistoryEntry[]>,
): WorldStreamingPlatformEconomyState => {
    const customers = normalizeWorldStreamingCustomerState(player.world.worldStreamingCustomers, player, absoluteWeek);
    const prepared: Player = { ...player, world: { ...player.world, worldStreamingCustomers: customers } };
    const viewing = normalizeWorldStreamingViewingState(prepared.world.worldStreamingViewing, prepared, absoluteWeek);
    const rowsByPlatform = new Map<string, Array<WorldStreamingCustomerPlatformSummary & { countryId: string }>>();
    Object.values(customers.countries).forEach(country => country.platformSummaries.forEach(row => {
        rowsByPlatform.set(row.platformId, [...(rowsByPlatform.get(row.platformId) || []), { ...row, countryId: country.countryId }]);
    }));

    const platforms = Object.fromEntries([...rowsByPlatform.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([platformId, rows]) => {
        const merged = mergeCustomerRows(rows);
        const platformViewing = viewing.platforms[platformId];
        const policy = resolveWorldStreamingPlatformCostPolicy(prepared, platformId);
        const weeklySubscriptionRevenue = round2(merged.monthlySubscriptionRevenue / 4.33);
        const weeklyIncrementalRevenue = round2(platformViewing?.revenue.totalIncrementalRevenue || 0);
        const weeklyRevenue = round2(weeklySubscriptionRevenue + weeklyIncrementalRevenue);
        const countryEconomy = rows.map(row => ({
            countryId: row.countryId,
            endingPaidAccounts: row.endingPaidAccounts,
            payingHouseholds: row.payingHouseholds,
            monthlySubscriptionRevenue: row.monthlySubscriptionRevenue,
            viewingAccounts: viewing.countries[row.countryId]?.platformPerformance?.[platformId]?.totalViewingAccounts || 0,
            hoursViewed: viewing.countries[row.countryId]?.platformPerformance?.[platformId]?.totalHoursViewed || 0,
            joinAccounts: row.joins + row.reactivations,
            cancellationAccounts: row.cancellations,
        })).sort((left, right) => right.endingPaidAccounts - left.endingPaidAccounts || left.countryId.localeCompare(right.countryId));
        const standardWeeklyOperatingCost = round2(
            merged.accessLoadAccounts * .035
            + (platformViewing?.totalHoursViewed || 0) * .0015
            + Math.max(1, countryEconomy.length) * 125_000,
        );
        const appliedWeeklyOperatingCost = round2(standardWeeklyOperatingCost * policy.appliedCostMultiplier);
        const audienceMovement = merged.joins + merged.reactivations - merged.cancellations;
        const summary: WorldStreamingPlatformEconomySummary = {
            platformId,
            platformName: rows[0]?.platformName || platformId,
            controller: policy.controller,
            endingPaidAccounts: merged.endingPaidAccounts,
            payingHouseholds: merged.payingHouseholds,
            joins: merged.joins,
            cancellations: merged.cancellations,
            reactivations: merged.reactivations,
            sharedActiveViewers: merged.sharedActiveViewers,
            piracyReach: merged.piracyReach,
            viewingAccounts: platformViewing?.totalViewingAccounts || 0,
            estimatedViewers: platformViewing?.estimatedViewers || 0,
            hoursViewed: platformViewing?.totalHoursViewed || 0,
            unmetDemandAccounts: platformViewing?.unmetDemandAccounts || 0,
            monthlySubscriptionRevenue: merged.monthlySubscriptionRevenue,
            weeklySubscriptionRevenue,
            weeklyIncrementalRevenue,
            weeklyRevenue,
            standardWeeklyOperatingCost,
            appliedWeeklyOperatingCost,
            weeklyOperatingResult: round2(weeklyRevenue - appliedWeeklyOperatingCost),
            operatingCostPolicy: policy,
            countryEconomy,
            strategySignals: {
                audienceMomentum: round4(audienceMovement / Math.max(1, merged.startingPaidAccounts)),
                churnPressure: round4(merged.cancellations / Math.max(1, merged.startingPaidAccounts)),
                viewingDepth: round4((platformViewing?.totalHoursViewed || 0) / Math.max(1, platformViewing?.totalViewingAccounts || 0)),
                unmetDemandPressure: round4((platformViewing?.unmetDemandAccounts || 0) / Math.max(1, merged.accessLoadAccounts)),
                revenuePerPaidAccount: round2(merged.monthlySubscriptionRevenue / Math.max(1, merged.endingPaidAccounts)),
                strongestCountryId: countryEconomy[0]?.countryId || null,
            },
        };
        return [platformId, summary];
    }));

    const values = Object.values(platforms);
    const global = values.reduce<WorldStreamingPlatformEconomyGlobalSummary>((sum, row) => ({
        platformCount: sum.platformCount + 1,
        endingPaidAccounts: sum.endingPaidAccounts + row.endingPaidAccounts,
        payingHouseholds: sum.payingHouseholds + row.payingHouseholds,
        viewingAccounts: sum.viewingAccounts + row.viewingAccounts,
        hoursViewed: sum.hoursViewed + row.hoursViewed,
        monthlySubscriptionRevenue: round2(sum.monthlySubscriptionRevenue + row.monthlySubscriptionRevenue),
        weeklySubscriptionRevenue: round2(sum.weeklySubscriptionRevenue + row.weeklySubscriptionRevenue),
        weeklyIncrementalRevenue: round2(sum.weeklyIncrementalRevenue + row.weeklyIncrementalRevenue),
        weeklyRevenue: round2(sum.weeklyRevenue + row.weeklyRevenue),
        standardWeeklyOperatingCost: round2(sum.standardWeeklyOperatingCost + row.standardWeeklyOperatingCost),
        appliedWeeklyOperatingCost: round2(sum.appliedWeeklyOperatingCost + row.appliedWeeklyOperatingCost),
        weeklyOperatingResult: round2(sum.weeklyOperatingResult + row.weeklyOperatingResult),
    }), emptyGlobal());
    const nextSnapshot: WorldStreamingPlatformEconomySnapshot = {
        absoluteWeek,
        platformCount: global.platformCount,
        endingPaidAccounts: global.endingPaidAccounts,
        viewingAccounts: global.viewingAccounts,
        weeklyRevenue: global.weeklyRevenue,
        weeklyOperatingResult: global.weeklyOperatingResult,
    };
    const retainedHistoryByPlatform = Object.fromEntries(Object.entries(historyByPlatform).map(([platformId, history]) => [
        platformId,
        history.slice(-MAX_SNAPSHOTS),
    ]));
    const currentHistoryByPlatform = Object.fromEntries(Object.entries(platforms).map(([platformId, summary]) => {
        const historyEntry: WorldStreamingPlatformEconomyHistoryEntry = {
            absoluteWeek,
            controller: summary.controller,
            endingPaidAccounts: summary.endingPaidAccounts,
            viewingAccounts: summary.viewingAccounts,
            hoursViewed: summary.hoursViewed,
            weeklyRevenue: summary.weeklyRevenue,
            weeklyOperatingResult: summary.weeklyOperatingResult,
        };
        return [platformId, [
            ...(historyByPlatform[platformId] || []).filter(item => item.absoluteWeek !== absoluteWeek),
            historyEntry,
        ].slice(-MAX_SNAPSHOTS)];
    }));
    const nextHistoryByPlatform = { ...retainedHistoryByPlatform, ...currentHistoryByPlatform };
    return {
        schemaVersion: WORLD_STREAMING_PLATFORM_ECONOMY_SCHEMA_VERSION,
        initializedAtAbsoluteWeek,
        lastProcessedAbsoluteWeek: absoluteWeek,
        sourceFingerprint: createDeterministicId('world-streaming-platform-economy', absoluteWeek, customers.sourceFingerprint, viewing.sourceFingerprint),
        platforms,
        global,
        snapshots: [...snapshots.filter(item => item.absoluteWeek !== absoluteWeek), nextSnapshot].slice(-MAX_SNAPSHOTS),
        historyByPlatform: nextHistoryByPlatform,
    };
};

const hasOnlyFiniteNumbers = (value: unknown): boolean => {
    if (typeof value === 'number') return Number.isFinite(value);
    if (Array.isArray(value)) return value.every(hasOnlyFiniteNumbers);
    if (value && typeof value === 'object') return Object.values(value as Record<string, unknown>).every(hasOnlyFiniteNumbers);
    return true;
};

const isValidState = (value: WorldStreamingPlatformEconomyState | undefined, absoluteWeek: number): boolean => Boolean(
    value
    && value.schemaVersion === WORLD_STREAMING_PLATFORM_ECONOMY_SCHEMA_VERSION
    && value.lastProcessedAbsoluteWeek === absoluteWeek
    && value.snapshots.length <= MAX_SNAPSHOTS
    && Boolean(value.historyByPlatform)
    && Object.values(value.historyByPlatform).every(history => Array.isArray(history) && history.length <= MAX_SNAPSHOTS)
    && hasOnlyFiniteNumbers(value),
);

export const createWorldStreamingPlatformEconomyState = (
    player: Player,
    absoluteWeek: number,
): WorldStreamingPlatformEconomyState => {
    const week = Math.max(0, Math.round(Number(absoluteWeek) || 0));
    return buildState(player, week, week, [], {});
};

export const normalizeWorldStreamingPlatformEconomyState = (
    input: WorldStreamingPlatformEconomyState | undefined,
    player: Player,
    absoluteWeek: number,
): WorldStreamingPlatformEconomyState => {
    const week = Math.max(0, Math.round(Number(absoluteWeek) || 0));
    if (isValidState(input, week)) return input!;
    return buildState(
        player,
        week,
        Math.max(0, Math.round(Number(input?.initializedAtAbsoluteWeek) || week)),
        input?.snapshots || [],
        input?.historyByPlatform || {},
    );
};

export const advanceWorldStreamingPlatformEconomyToWeek = normalizeWorldStreamingPlatformEconomyState;

export const getWorldStreamingPlatformEconomyOutcome = (
    state: WorldStreamingPlatformEconomyState | undefined,
    platformId: string,
): WorldStreamingPlatformEconomySummary | null => state?.platforms?.[platformId] || null;

export const synchronizeWorldStreamingPlatformEconomy = (
    player: Player,
    economy: WorldStreamingPlatformEconomyState,
    absoluteWeek: number,
): Player => {
    const normalizedWorld = normalizeWorldPlatformAi(player, player.world, absoluteWeek);
    const ecosystem = structuredClone(normalizeStreamingPlatformEcosystem(player.world.streamingPlatformEcosystem, absoluteWeek));
    const platforms = { ...(normalizedWorld.platforms || {}) };
    Object.values(ecosystem.operators).forEach(operator => {
        const summary = economy.platforms[operator.id];
        if (!summary) return;
        operator.subscriberMillions = accountsToMillions(summary.endingPaidAccounts);
        operator.marketMomentum = Object.fromEntries(summary.countryEconomy.map(country => [
            country.countryId,
            round2((country.joinAccounts - country.cancellationAccounts) / Math.max(1, country.endingPaidAccounts) * 100),
        ]));
        if (operator.corePlatformId && platforms[operator.corePlatformId]) {
            const platform = platforms[operator.corePlatformId]!;
            platforms[operator.corePlatformId] = {
                ...platform,
                subscribers: operator.subscriberMillions,
                ai: platform.ai ? {
                    ...platform.ai,
                    audienceHealth: {
                        ...platform.ai.audienceHealth,
                        engagementIndex: round2(clamp(35 + summary.strategySignals.viewingDepth * 6, 0, 100)),
                    },
                    worldEconomyFeedback: {
                        asOfAbsoluteWeek: absoluteWeek,
                        endingPaidAccounts: summary.endingPaidAccounts,
                        viewingAccounts: summary.viewingAccounts,
                        hoursViewed: summary.hoursViewed,
                        weeklyRevenue: summary.weeklyRevenue,
                        weeklyOperatingResult: summary.weeklyOperatingResult,
                        audienceMomentum: summary.strategySignals.audienceMomentum,
                        churnPressure: summary.strategySignals.churnPressure,
                        viewingDepth: summary.strategySignals.viewingDepth,
                        unmetDemandPressure: summary.strategySignals.unmetDemandPressure,
                        strongestCountryId: summary.strategySignals.strongestCountryId,
                    },
                } : platform.ai,
            };
        }
    });
    Object.values(ecosystem.markets).forEach(market => {
        const rows = Object.values(economy.platforms)
            .map(summary => ({ summary, country: summary.countryEconomy.find(country => country.countryId === market.countryId) }))
            .filter((row): row is typeof row & { country: NonNullable<typeof row.country> } => Boolean(row.country));
        const total = rows.reduce((sum, row) => sum + row.country.endingPaidAccounts, 0);
        market.shares = rows.flatMap(row => ecosystem.operators[row.summary.platformId] && row.country.endingPaidAccounts > 0 ? [{
            operatorId: row.summary.platformId,
            sharePercent: round2(row.country.endingPaidAccounts / Math.max(1, total) * 100),
        }] : []).sort((left, right) => right.sharePercent - left.sharePercent || left.operatorId.localeCompare(right.operatorId));
        market.othersSharePercent = round2(Math.max(0, 100 - market.shares.reduce((sum, row) => sum + row.sharePercent, 0)));
        market.lastRebalancedAtAbsoluteWeek = absoluteWeek;
    });
    return {
        ...player,
        world: {
            ...normalizedWorld,
            platforms: platforms as Player['world']['platforms'],
            streamingPlatformEcosystem: ecosystem,
            worldStreamingPlatformEconomy: economy,
        },
    };
};

export const settleWorldStreamingPlatformEconomyWeek = (
    player: Player,
    absoluteWeek: number,
): Player => {
    const economy = normalizeWorldStreamingPlatformEconomyState(
        player.world.worldStreamingPlatformEconomy,
        player,
        absoluteWeek,
    );
    return synchronizeWorldStreamingPlatformEconomy(player, economy, absoluteWeek);
};
