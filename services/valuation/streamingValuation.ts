/**
 * #184: the valuation engine's streaming adapters: our own service, from its books and its catalogue, and an AI
 * platform, from the economy the platform AI keeps.
 */
import type { OwnedStreamingPlatformState, OwnedStreamingWeeklyOperations } from '../../types';
import { getStreamingAdditionalOperatingExpense } from '../streamingOperatingExpenses';
import { valueCompany, type CompanyFundamentals, type CompanyValuation } from './valuationEngine';

const YEAR = 52;
const QUARTER = 13;
const number = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

const revenueOf = (operations: OwnedStreamingWeeklyOperations) => (
    number(operations.subscriptionRevenue) + number(operations.productRevenue) + number(operations.worldViewingIncrementalRevenue)
);
/* earnings: half the cash the week brought in, half the books' view (content spread over its life), so a big catalogue
   bought up front neither vanishes from the costs nor sinks the value while it is written off */
const earningsOf = (operations: OwnedStreamingWeeklyOperations) => (
    operations.contentAccountingVersion === 1
        ? (number(operations.netCashContribution) + number(operations.accountingContribution)) / 2
        : number(operations.netCashContribution)
);

/** our service's fundamentals, from its last 52 weeks, its catalogue, its Originals, its network and its team */
export const streamingPlatformFundamentals = (platform: OwnedStreamingPlatformState): CompanyFundamentals => {
    const weeks = (platform.weeklyHistory || []).filter(item => item.operations).slice(-YEAR);
    const quarter = weeks.slice(-QUARTER);
    const aYear = (items: typeof weeks, read: (item: (typeof weeks)[number]) => number) => (
        items.length ? items.reduce((sum, item) => sum + read(item), 0) * YEAR / items.length : 0
    );
    const revenueTtm = aYear(weeks, item => revenueOf(item.operations!));
    const revenueRunRate = aYear(quarter, item => revenueOf(item.operations!));
    const weekEarnings = (item: (typeof weeks)[number]) => earningsOf(item.operations!)
        - getStreamingAdditionalOperatingExpense(platform, item.absoluteWeek, item.operations!.additionalOperatingExpense);
    /* a young service is judged as much on its latest quarter as on its year */
    const earningsTtm = (aYear(weeks, weekEarnings) + aYear(quarter, weekEarnings)) / 2;
    const now = weeks.at(-1)?.absoluteWeek ?? 0;

    /* the library: what is left of each licence we paid for, and the Originals we own outright at half their budget */
    const licensed = (platform.catalogLicenses || []).filter(item => item.status === 'ACTIVE').reduce((sum, item) => {
        const left = Math.max(0, item.expiresAtAbsoluteWeek - Math.max(now, item.startsAtAbsoluteWeek));
        return sum + number(item.minimumGuarantee) * Math.min(1, left / Math.max(1, item.durationWeeks));
    }, 0);
    const originals = platform.originalCommissions || [];
    const released = originals.filter(item => item.status === 'RELEASED');
    const owned = released.reduce((sum, item) => sum + number(item.productionFundingApplied || item.productionBudgetCap) * 0.5, 0);
    /* the last 8 releases: renewed or made a franchise counts as a hit, cancelled as a flop */
    const lastEight = released.slice(-8);
    const recentHits = lastEight.filter(item => item.lifecycleDecision?.type === 'RENEW' || item.lifecycleDecision?.type === 'FRANCHISE').length;
    const recentFlops = lastEight.filter(item => item.lifecycleDecision?.type === 'CANCEL').length;
    /* the pipeline: what is commissioned and not yet out, by our record (a hit's chance, Laplace-smoothed) */
    const hitChance = (recentHits + 1) / (recentHits + recentFlops + 2);
    const pipelineValue = originals.filter(item => item.status === 'GREENLIT' || item.status === 'IN_PRODUCTION' || item.status === 'DELIVERED')
        .reduce((sum, item) => sum + number(item.productionFundingApplied || item.productionBudgetCap) * (0.5 + hitChance), 0);
    const franchiseValue = released.filter(item => item.lifecycleDecision?.type === 'FRANCHISE')
        .reduce((sum, item) => sum + number(item.productionFundingApplied || item.productionBudgetCap) * 1.5, 0);
    /* technology: the servers we built (at 60% once built), and the platform's health on top of its revenue */
    const technologyValue = (platform.networkOrders || []).reduce((sum, order) => sum + number(order.capitalCost) * (order.status === 'DONE' ? 0.6 : 0.9), 0)
        + revenueTtm * 0.1 * Math.max(0, Math.min(100, number(platform.metrics.technologyHealth))) / 100;
    const team = platform.leadership.appointments.filter(item => item.status === 'ACTIVE');
    const listing = platform.publicCompany?.listing;
    return {
        kind: 'STREAMING',
        revenueTtm,
        revenueRunRate,
        earningsTtm,
        cash: number(platform.treasuryCash),
        debt: number(platform.debtPrincipal),
        churnPercent: number(platform.metrics.churnRate) * 100,
        libraryValue: licensed + owned,
        technologyValue,
        pipelineValue,
        recentHits,
        recentFlops,
        prestige: number(platform.competitiveWorld?.globalPrestige),
        franchiseValue,
        reliability: (number(platform.metrics.technologyHealth) + number(platform.crisisSecurity?.publicTrust ?? 70)) / 2,
        leadership: team.length ? team.reduce((sum, item) => sum + number(item.skill), 0) / team.length : 45,
        shares: listing?.sharesOutstanding,
    };
};

/** our service's value; a service with almost nothing yet is still worth $50M (its idea, its brand, its people) */
export const valueOwnedStreamingPlatform = (platform: OwnedStreamingPlatformState): CompanyValuation => {
    const valuation = valueCompany(streamingPlatformFundamentals(platform));
    return valuation.equityValue >= 50_000_000 ? valuation : { ...valuation, equityValue: 50_000_000 };
};

/** an AI platform's fundamentals, from the economy the platform AI keeps (weekly figures in millions) */
export interface AiPlatformValuationInput {
    weeklyRevenueMillions: number;
    weeklyOperatingCostMillions: number;
    /** the latest quarter's weekly revenue, for growth */
    quarterWeeklyRevenueMillions: number;
    cashMillions: number;
    debtMillions: number;
    catalogueScore: number;
    technologyScore: number;
    prestige: number;
    /** 0.1–1: the platform AI's distress multiplier */
    distressMultiplier: number;
}

export const valueAiStreamingPlatform = (input: AiPlatformValuationInput): CompanyValuation => valueCompany({
    kind: 'STREAMING',
    revenueTtm: number(input.weeklyRevenueMillions) * YEAR * 1_000_000,
    revenueRunRate: number(input.quarterWeeklyRevenueMillions) * YEAR * 1_000_000,
    earningsTtm: (number(input.weeklyRevenueMillions) - number(input.weeklyOperatingCostMillions)) * YEAR * 1_000_000,
    cash: number(input.cashMillions) * 1_000_000,
    debt: number(input.debtMillions) * 1_000_000,
    libraryValue: Math.min(250_000_000_000, number(input.catalogueScore) * 80_000_000),
    technologyValue: Math.min(50_000_000_000, number(input.technologyScore) / 100 * 12_000_000_000),
    pipelineValue: 0,
    recentHits: 0,
    recentFlops: 0,
    prestige: number(input.prestige),
    franchiseValue: 0,
    reliability: 70,
    leadership: 60,
    distress: 1 - Math.max(0.1, Math.min(1, number(input.distressMultiplier) || 1)),
});
