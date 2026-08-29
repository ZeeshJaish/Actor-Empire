import type {
    PlatformAiCommissioningLifecycle,
    PlatformAiContentPlan,
    PlatformAiProductionEscrow,
    PlatformId,
} from '../../types';
import { createDeterministicId } from '../deterministicRandom';

export const PLATFORM_AI_MARKETING_RESERVE_RATE = 0.10;
export const PLATFORM_AI_CONTINGENCY_RESERVE_RATE = 0.08;
export const PLATFORM_AI_COMMISSIONING_RETRY_WEEKS = 4;

const roundMillions = (value: number): number => Math.round(Math.max(0, value) * 100) / 100;
const nullableWeek = (value: unknown, maximumWeek: number): number | null => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    const week = Math.round(numeric);
    return week >= 0 && week <= maximumWeek ? week : null;
};

export const getPlatformAiProductionEscrowFundingId = (
    platformId: PlatformId,
    planId: string,
): string => createDeterministicId('platform_ai_production_escrow', platformId, planId);

export const getPlatformAiProductionReserveQuote = (productionFundingMillions: number): {
    marketingMillions: number;
    contingencyMillions: number;
} => ({
    marketingMillions: roundMillions(productionFundingMillions * PLATFORM_AI_MARKETING_RESERVE_RATE),
    contingencyMillions: roundMillions(productionFundingMillions * PLATFORM_AI_CONTINGENCY_RESERVE_RATE),
});

export const createUnfundedPlatformAiProductionEscrow = (
    productionFundingMillions: number,
): PlatformAiProductionEscrow => ({
    status: 'UNFUNDED',
    fundingId: null,
    marketingCampaignMillions: getPlatformAiProductionReserveQuote(productionFundingMillions).marketingMillions,
    marketingBalanceMillions: 0,
    contingencyBalanceMillions: 0,
    fundedAtAbsoluteWeek: null,
    settledAtAbsoluteWeek: null,
    settlementReason: null,
});

export const createPendingPlatformAiCommissioningLifecycle = (
    committedAtAbsoluteWeek: number,
    depositMillions: number,
): PlatformAiCommissioningLifecycle => ({
    status: 'PENDING',
    attemptCount: 0,
    lastAttemptAtAbsoluteWeek: null,
    deadlineAtAbsoluteWeek: Math.max(0, Math.round(committedAtAbsoluteWeek)) + PLATFORM_AI_COMMISSIONING_RETRY_WEEKS,
    lastFailureReason: null,
    depositEscrowMillions: roundMillions(depositMillions),
    depositRefundedAtAbsoluteWeek: null,
});

export const normalizePlatformAiProductionEscrow = (input: {
    raw: unknown;
    plan: Pick<PlatformAiContentPlan, 'id' | 'platformId' | 'source' | 'status' | 'productionFundingMillions' | 'committedAtAbsoluteWeek' | 'commissionId' | 'industryProductionId'>;
    sourceSchemaVersion: number;
    absoluteWeek: number;
}): PlatformAiProductionEscrow => {
    const unfunded = createUnfundedPlatformAiProductionEscrow(input.plan.productionFundingMillions);
    if (input.plan.source !== 'COMMISSIONED_ORIGINAL' || input.sourceSchemaVersion < 6) return unfunded;
    if (!input.raw || typeof input.raw !== 'object') return unfunded;
    const raw = input.raw as Partial<PlatformAiProductionEscrow>;
    const expectedFundingId = getPlatformAiProductionEscrowFundingId(input.plan.platformId, input.plan.id);
    const fundedAt = nullableWeek(raw.fundedAtAbsoluteWeek, input.absoluteWeek);
    const committedAt = input.plan.committedAtAbsoluteWeek ?? 0;
    const hasCanonicalFunding = raw.fundingId === expectedFundingId
        && fundedAt !== null
        && fundedAt >= committedAt
        && Boolean(input.plan.commissionId)
        && Boolean(input.plan.industryProductionId);
    if (!hasCanonicalFunding || !['FUNDED', 'SETTLED'].includes(String(raw.status))) return unfunded;
    const quote = getPlatformAiProductionReserveQuote(input.plan.productionFundingMillions);
    if (raw.status === 'SETTLED') {
        return {
            status: 'SETTLED',
            fundingId: expectedFundingId,
            marketingCampaignMillions: quote.marketingMillions,
            marketingBalanceMillions: 0,
            contingencyBalanceMillions: 0,
            fundedAtAbsoluteWeek: fundedAt,
            settledAtAbsoluteWeek: nullableWeek(raw.settledAtAbsoluteWeek, input.absoluteWeek) ?? input.absoluteWeek,
            settlementReason: raw.settlementReason === 'RELEASED' ? 'RELEASED' : 'CANCELLED',
        };
    }
    return {
        status: 'FUNDED',
        fundingId: expectedFundingId,
        marketingCampaignMillions: quote.marketingMillions,
        marketingBalanceMillions: Math.min(quote.marketingMillions, roundMillions(Number(raw.marketingBalanceMillions) || 0)),
        contingencyBalanceMillions: Math.min(quote.contingencyMillions, roundMillions(Number(raw.contingencyBalanceMillions) || 0)),
        fundedAtAbsoluteWeek: fundedAt,
        settledAtAbsoluteWeek: null,
        settlementReason: null,
    };
};

export const normalizePlatformAiCommissioningLifecycle = (input: {
    raw: unknown;
    plan: Pick<PlatformAiContentPlan, 'source' | 'status' | 'committedAtAbsoluteWeek' | 'paidSpendMillions'>;
    absoluteWeek: number;
}): PlatformAiCommissioningLifecycle | null => {
    if (input.plan.source !== 'COMMISSIONED_ORIGINAL') return null;
    const committedAt = input.plan.committedAtAbsoluteWeek ?? input.absoluteWeek;
    const fallback = createPendingPlatformAiCommissioningLifecycle(committedAt, input.plan.paidSpendMillions);
    if (!input.raw || typeof input.raw !== 'object') return fallback;
    const raw = input.raw as Partial<PlatformAiCommissioningLifecycle>;
    const status = raw.status === 'COMMISSIONED' || raw.status === 'CANCELLED' ? raw.status : 'PENDING';
    return {
        status,
        attemptCount: Math.max(0, Math.min(PLATFORM_AI_COMMISSIONING_RETRY_WEEKS, Math.round(Number(raw.attemptCount) || 0))),
        lastAttemptAtAbsoluteWeek: nullableWeek(raw.lastAttemptAtAbsoluteWeek, input.absoluteWeek),
        deadlineAtAbsoluteWeek: Math.max(committedAt, Math.min(
            committedAt + PLATFORM_AI_COMMISSIONING_RETRY_WEEKS,
            Math.round(Number(raw.deadlineAtAbsoluteWeek) || fallback.deadlineAtAbsoluteWeek),
        )),
        lastFailureReason: typeof raw.lastFailureReason === 'string' && raw.lastFailureReason ? raw.lastFailureReason : null,
        depositEscrowMillions: status === 'PENDING'
            ? Math.min(roundMillions(input.plan.paidSpendMillions), roundMillions(Number(raw.depositEscrowMillions) || fallback.depositEscrowMillions))
            : 0,
        depositRefundedAtAbsoluteWeek: status === 'CANCELLED'
            ? nullableWeek(raw.depositRefundedAtAbsoluteWeek, input.absoluteWeek)
            : null,
    };
};
