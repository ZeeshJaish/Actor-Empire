import { isStreamingLicenseActiveAt } from './streamingRightsCore';
import type { StreamingCatalogLicenseStatus } from '../types';

const bounded = (value: unknown, minimum = 0, maximum = Number.MAX_SAFE_INTEGER): number => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return minimum;
    return Math.min(maximum, Math.max(minimum, numeric));
};

export interface StreamingSubscriptionRevenueInput {
    /** Subscribers are absolute accounts; output is full currency. */
    subscribers: number;
    monthlyArpu: number;
    paidSubscriberShare?: number;
}

export const calculateStreamingSubscriptionRevenueFullCurrency = (
    input: StreamingSubscriptionRevenueInput,
): number => (
    bounded(input.subscribers)
    * bounded(input.paidSubscriberShare ?? 1, 0, 1)
    * bounded(input.monthlyArpu)
    / 4.33
);

export interface StreamingAdvertisingRevenueInput {
    /** Subscribers are absolute accounts; output is full currency. */
    subscribers: number;
    adSupportedShare: number;
    weeklyAdRevenuePerSubscriber: number;
}

export const calculateStreamingAdvertisingRevenueFullCurrency = (
    input: StreamingAdvertisingRevenueInput,
): number => (
    bounded(input.subscribers)
    * bounded(input.adSupportedShare, 0, 1)
    * bounded(input.weeklyAdRevenuePerSubscriber)
);

export interface StreamingRevenueShareLicense {
    id: string;
    sourceProjectId: string;
    status: StreamingCatalogLicenseStatus;
    startsAtAbsoluteWeek: number;
    expiresAtAbsoluteWeek: number;
    licensorRevenueShare: number;
    origin?: string;
    permanentPurchase?: boolean;
}

export interface StreamingPartnerRevenueShareInput {
    weeklySubscriptionRevenueFullCurrency: number;
    licenses: StreamingRevenueShareLicense[];
    availableTitleCount: number;
    absoluteWeek: number;
    /** When supplied, only canonical titles already released on the service may participate. */
    eligibleSourceProjectIds?: string[];
}

/** Shared player/AI rights-share semantics. Only one live third-party right per canonical title participates. */
export const calculateStreamingPartnerRevenueShareFullCurrency = (
    input: StreamingPartnerRevenueShareInput,
): number => {
    const seenProjects = new Set<string>();
    const eligibleProjects = input.eligibleSourceProjectIds
        ? new Set(input.eligibleSourceProjectIds.filter(Boolean))
        : null;
    const active = input.licenses.filter(license => {
        if (
            license.status !== 'ACTIVE'
            || !isStreamingLicenseActiveAt(license, input.absoluteWeek)
            || license.origin === 'OWNED_STUDIO_TRANSFER'
            || license.permanentPurchase
            || !license.sourceProjectId
            || eligibleProjects !== null && !eligibleProjects.has(license.sourceProjectId)
            || seenProjects.has(license.sourceProjectId)
        ) return false;
        seenProjects.add(license.sourceProjectId);
        return true;
    });
    if (!active.length) return 0;
    const averageLicensorShare = active.reduce((sum, license) => (
        sum + bounded(license.licensorRevenueShare, 0, 100)
    ), 0) / active.length / 100;
    const licensedViewingWeight = Math.min(
        0.45,
        active.length / Math.max(1, Math.round(bounded(input.availableTitleCount))),
    );
    return bounded(input.weeklySubscriptionRevenueFullCurrency) * averageLicensorShare * licensedViewingWeight;
};

export interface StreamingRunwayInput {
    cash: number;
    trailingWeeklyOperatingCost: number;
    trailingWeeklyNetCashFlow: number;
}

export interface StreamingRunwayResult {
    /** Weeks cash can cover gross recurring operations if revenue stopped. */
    reserveCoverageWeeks: number;
    /** Weeks cash can cover the observed recurring loss; null means operations are not losing cash. */
    lossRunwayWeeks: number | null;
}

export const calculateStreamingRunwayFromTrailingCosts = (input: StreamingRunwayInput): StreamingRunwayResult => {
    const cash = bounded(input.cash);
    const operatingCost = bounded(input.trailingWeeklyOperatingCost);
    const netCashFlow = bounded(input.trailingWeeklyNetCashFlow, -Number.MAX_SAFE_INTEGER);
    const measuredLossRunwayWeeks = netCashFlow < 0 ? cash / Math.abs(netCashFlow) : null;
    return {
        reserveCoverageWeeks: operatingCost > 0 ? cash / operatingCost : 5_200,
        // Beyond the simulation's 100-year economic horizon, preserve the same
        // durable sentinel used by save migration instead of an unstable huge number.
        lossRunwayWeeks: measuredLossRunwayWeeks !== null && measuredLossRunwayWeeks < 5_200
            ? measuredLossRunwayWeeks
            : null,
    };
};

export interface StreamingStandaloneValuationInput {
    /** All currency inputs and the result are full currency values. */
    trailingWeeklyRevenueFullCurrency: number;
    trailingWeeklyOperatingCostFullCurrency: number;
    subscribers: number;
    debtFullCurrency: number;
    catalogueScore: number;
    technologyScore: number;
    distressMultiplier: number;
}

export const calculateStreamingStandaloneValuationFullCurrency = (
    input: StreamingStandaloneValuationInput,
): number => {
    const weeklyRevenue = bounded(input.trailingWeeklyRevenueFullCurrency);
    const weeklyCost = bounded(input.trailingWeeklyOperatingCostFullCurrency);
    const annualRevenueBillions = weeklyRevenue * 52 / 1_000_000_000;
    const operatingMargin = weeklyRevenue > 0
        ? Math.min(0.75, Math.max(-1, (weeklyRevenue - weeklyCost) / weeklyRevenue))
        : weeklyCost > 0 ? -1 : 0;
    const revenueMultiple = Math.max(0.5, 1.8 + operatingMargin * 1.6);
    const operatingValue = annualRevenueBillions * revenueMultiple;
    const subscriberMillions = bounded(input.subscribers) / 1_000_000;
    const subscriberValue = subscriberMillions * 0.055;
    const catalogueValue = Math.min(250, bounded(input.catalogueScore) * 0.08);
    const technologyValue = Math.min(50, bounded(input.technologyScore) / 100 * 12);
    const debtBillions = bounded(input.debtFullCurrency) / 1_000_000_000;
    const distressMultiplier = bounded(input.distressMultiplier, 0.1, 1);
    const valuationBillions = Math.max(
        0.01,
        (operatingValue + subscriberValue + catalogueValue + technologyValue - debtBillions) * distressMultiplier,
    );
    return Math.round(valuationBillions * 1_000_000_000);
};
