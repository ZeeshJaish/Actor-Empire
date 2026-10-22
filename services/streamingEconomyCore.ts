import { isStreamingLicenseActiveAt } from './streamingRightsCore';
import type { StreamingBackendBasis, StreamingRoyaltyRevenueSource, StreamingCatalogLicenseStatus } from '../types';
import { attributeStreamingTitleRevenue, calculateStreamingContractRoyalty } from './streamingContractSettlement';
import type { StreamingGuaranteeRecoupment, StreamingTitleRevenueSignal } from '../types';

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
    backendBasis?: StreamingBackendBasis;
    minimumGuarantee?: number;
    guaranteeRecoupment?: StreamingGuaranteeRecoupment;
    backendCap?: number | null;
    cumulativeRoyaltyAccrued?: number;
    cumulativeRoyaltyPaid?: number;
    lastRoyaltyReceiptAbsoluteWeek?: number;
}

/** One finite receipt pool, including owned/zero-backend titles. No signal invents no contribution. */
export const allocateStreamingSubscriptionReceipts = (input: {
    weeklySubscriptionRevenueFullCurrency: number;
    titles: Array<StreamingTitleRevenueSignal & {contractId: string | null}>;
}) => {
    const seen = new Set<string>();
    const titles = input.titles.filter(title => {
        if (!title.projectId || seen.has(title.projectId)) return false;
        seen.add(title.projectId);
        return [title.viewingAccounts, title.watchHours, title.subscriberAcquisition, title.subscriberRetention]
            .some(value => Number.isFinite(value) && value > 0);
    });
    return attributeStreamingTitleRevenue({subscriptionRevenue: bounded(input.weeklySubscriptionRevenueFullCurrency), titles})
        .map((row, index) => ({...row, contractId: titles[index].contractId}));
};

/** All modes earned by one contract in one week consume its advance/cap together. */
export const calculateStreamingSignedRoyaltyAllocations = (input: {
    licenses: StreamingRevenueShareLicense[];
    receipts: Array<{receiptId: string; contractId: string; grossReceipts: number; sourceKind?: StreamingRoyaltyRevenueSource}>;
    absoluteWeek: number;
}) => {
    const licenses = new Map(input.licenses.map(row => [row.id, row]));
    const seen = new Set<string>();
    const receipts = input.receipts.filter(row => {
        if (!row.receiptId || seen.has(row.receiptId) || !Number.isSafeInteger(row.grossReceipts) || row.grossReceipts <= 0) return false;
        seen.add(row.receiptId);
        const license = licenses.get(row.contractId);
        return license?.backendBasis !== 'ADS_RENTAL_RECEIPTS' || row.sourceKind === 'ADVERTISING' || row.sourceKind === 'RENTAL';
    });
    // Preserve receipt order and arithmetic while totaling each contract once.
    // Rescanning the complete country/mode archive per contract is quadratic.
    const adjustedGrossByContract = new Map<string, number>();
    for (const receipt of receipts) adjustedGrossByContract.set(receipt.contractId,
        (adjustedGrossByContract.get(receipt.contractId) || 0) + receipt.grossReceipts);
    const allocations = calculateStreamingStoreRevenueShareAllocations({
        licenses: input.licenses.filter(license => (license.lastRoyaltyReceiptAbsoluteWeek ?? -1) < input.absoluteWeek
            && license.startsAtAbsoluteWeek <= input.absoluteWeek && input.absoluteWeek < license.expiresAtAbsoluteWeek),
        receipts, absoluteWeek: input.absoluteWeek,
    });
    return allocations.map(row => ({...row, adjustedGrossReceipts:adjustedGrossByContract.get(row.contractId) || 0,
        lastRoyaltyReceiptAbsoluteWeek: input.absoluteWeek}));
};

export interface StreamingStoreRevenueShareInput {
    licenses: StreamingRevenueShareLicense[];
    /** Each receipt is attributed to the exact country/mode contract that authorized the sale. */
    receipts: Array<{contractId: string; grossReceipts: number}>;
    absoluteWeek: number;
}

export const calculateStreamingStoreRevenueShareAllocations = (input: StreamingStoreRevenueShareInput) => {
    const licensesById = new Map<string, StreamingRevenueShareLicense>();
    // Match .find: an old imported duplicate keeps its first-position meaning.
    for (const license of input.licenses) if (!licensesById.has(license.id)) licensesById.set(license.id, license);
    const grossByContract = new Map<string, number>();
    for (const row of input.receipts) grossByContract.set(row.contractId,
        (grossByContract.get(row.contractId) || 0) + bounded(row.grossReceipts));
    return [...grossByContract].flatMap(([contractId, grossReceipts]) => {
        const license = licensesById.get(contractId);
        if (!license || license.status !== 'ACTIVE' || !isStreamingLicenseActiveAt(license, input.absoluteWeek)
            || license.origin === 'OWNED_STUDIO_TRANSFER' || license.permanentPurchase) return [];
        return [{contractId, ...calculateStreamingContractRoyalty({
            adjustedGrossReceipts: grossReceipts,
            licensorRevenueShare: license.licensorRevenueShare,
            minimumGuarantee: license.minimumGuarantee || 0,
            guaranteeRecoupment: license.guaranteeRecoupment || 'NON_RECOUPABLE',
            backendCap: license.backendCap ?? null,
            cumulativeRoyaltyAccrued: license.cumulativeRoyaltyAccrued || 0,
            cumulativeRoyaltyPaid: license.cumulativeRoyaltyPaid || 0,
        })}];
    });
};

export const calculateStreamingStoreRevenueShareFullCurrency = (input: StreamingStoreRevenueShareInput): number =>
    calculateStreamingStoreRevenueShareAllocations(input).reduce((sum, row) => sum + row.royaltyPayable, 0);

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
