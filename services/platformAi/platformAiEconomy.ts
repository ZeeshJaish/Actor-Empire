import type {
    OwnedStreamingMarketOperation,
    PlatformAiDecisionRecord,
    PlatformAiDistressAction,
    PlatformAiExpenseClass,
    PlatformAiFinanceSnapshot,
    PlatformAiPendingOneTimeObligation,
    PlatformAiReserveAllocation,
    PlatformId,
    PlatformState,
    Player,
} from '../../types';
import { createDeterministicId } from '../deterministicRandom';
import {
    calculateStreamingAdvertisingRevenueFullCurrency,
    calculateStreamingRunwayFromTrailingCosts,
    calculateStreamingStandaloneValuationFullCurrency,
    calculateStreamingSubscriptionRevenueFullCurrency,
} from '../streamingEconomyCore';
import { getStreamingCountryMarketProfile } from '../streamingDayOneMarkets';
import { fullCurrencyToMillions, isStreamingLicenseActiveAt } from '../streamingRightsCore';
import { getPlatformResearchRecurringCostMillions } from './platformAiResearch';
import { createPlatformAiRecurringEfficiencySnapshot } from './platformAiEfficiency';
import { getPlatformAiOperatingProfile } from './platformAiOperatingProfiles';
import { PLATFORM_AI_PROFILES } from './platformAiProfiles';
import {
    calculatePlatformAiPartnerRevenueShares,
    createPlatformAiTradeRoyaltyEvidenceDecision,
    progressPlatformAiDistressWorld,
} from './platformAiDistress';
import {
    normalizePlatformAiExternalCommitments,
    reconcilePlatformAiExternalCommitmentObligations,
    settlePlatformAiExternalCommitments,
} from './platformAiExternalCommitments';
import {
    appendPlatformAiDecisions,
    normalizePlatformAiAudienceSettlements,
    normalizePlatformAiState,
    normalizeWorldPlatformAi,
    reconcilePlatformAiRightsRenewalObligations,
    resolvePlatformController,
} from './platformAiState';

const NO_LOSS_RUNWAY_WEEKS = 5_200;
const FINANCE_HISTORY_LIMIT = 104;
const RESCUE_COOLDOWN_WEEKS = 104;
const DEBT_WEEKLY_INTEREST_RATE = 0.001;
const HEALTHY_RECOVERY_WEEKS = 4;
const RESTRUCTURING_FAILURE_WEEKS = 13;
const RESTRUCTURED_INTEREST_MULTIPLIER = 0.5;

const safe = (value: unknown, minimum = 0, maximum = Number.MAX_SAFE_INTEGER): number => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return minimum;
    return Math.min(maximum, Math.max(minimum, numeric));
};

const roundMillions = (value: unknown): number => Math.round(
    safe(value, -Number.MAX_SAFE_INTEGER) * 1_000_000,
) / 1_000_000;

const average = (values: number[], fallback = 0): number => values.length
    ? roundMillions(values.reduce((sum, value) => sum + safe(value, -Number.MAX_SAFE_INTEGER), 0) / values.length)
    : fallback;

const activeMarkets = (platform: PlatformState): OwnedStreamingMarketOperation[] => (
    (platform.ai?.marketOperations || []).filter(operation => (
        operation.scope === 'COUNTRY'
        && operation.status === 'ACTIVE'
        && operation.countryProfile
        && operation.policySnapshot
    ))
);

const activeRegionCount = (platform: PlatformState): number => new Set(
    activeMarkets(platform).map(operation => operation.regionId),
).size;

const fallbackRegionCount = (platform: PlatformState): number => {
    const rawCapabilities = platform.ai?.capabilities as unknown as {
        activeCountryIds?: string[];
        activeRegionIds?: string[];
    } | undefined;
    const countryRegions = (rawCapabilities?.activeCountryIds || []).flatMap(countryId => {
        const regionId = getStreamingCountryMarketProfile(countryId)?.regionId;
        return regionId ? [regionId] : [];
    });
    return new Set([...(rawCapabilities?.activeRegionIds || []), ...countryRegions]).size;
};

const releasedCatalogueProjectIds = (platform: PlatformState): string[] => [...new Set(
    (platform.ai?.slate || [])
        .filter(plan => plan.status === 'RELEASED')
        .flatMap(plan => plan.sourceProjectIds)
        .filter(Boolean),
)].sort();

const futureEarmarks = (player: Player, platform: PlatformState): PlatformAiReserveAllocation[] => {
    const canonicalProductions = Object.values(player.world.industryProductions || {})
        .filter(production => production.commissioningPlatformId === platform.id && !['DELIVERED', 'CANCELLED'].includes(production.status))
        .map(production => ({
            type: 'APPROVED_CONTENT' as const,
            amountMillions: roundMillions(Math.max(0, production.budgetMillions + (production.aiExecution?.overrunMillions || 0) - production.paidMillions)),
            referenceId: production.id,
        }))
        .sort((left, right) => left.referenceId.localeCompare(right.referenceId));
    const canonicalIds = new Set(canonicalProductions.map(item => item.referenceId));
    const content = [...canonicalProductions, ...(platform.ai?.slate || [])
        .filter(plan => ['GREENLIT', 'IN_PRODUCTION'].includes(plan.status))
        .filter(plan => !plan.industryProductionId || !canonicalIds.has(plan.industryProductionId))
        .map(plan => ({
            type: 'APPROVED_CONTENT' as const,
            amountMillions: roundMillions(Math.max(0, plan.productionFundingMillions - plan.paidSpendMillions)),
            referenceId: plan.id,
        }))
        .filter(allocation => allocation.amountMillions > 0)
        .sort((left, right) => left.referenceId.localeCompare(right.referenceId))];
    const research = (platform.ai?.researchQueue || [])
        .map(item => {
            const remaining = ['RESEARCHING', 'PROTOTYPING', 'TESTING', 'AWAITING_IP'].includes(item.stage)
                ? item.ipCostMillions + item.installationCostMillions
                : item.stage === 'READY_TO_INSTALL' ? item.installationCostMillions : 0;
            return {
                type: 'APPROVED_RESEARCH' as const,
                amountMillions: roundMillions(remaining),
                referenceId: item.id,
            };
        })
        .filter(allocation => allocation.amountMillions > 0)
        .sort((left, right) => left.referenceId.localeCompare(right.referenceId));
    return [...content, ...research];
};

const trailing = (platform: PlatformState, field: 'revenueMillions' | 'operatingCostMillions' | 'operatingNetCashFlowMillions'): number[] => (
    (platform.ai?.financeHistory || [])
        .slice(-13)
        .map(snapshot => Number(snapshot[field]))
        .filter(Number.isFinite)
);

const marketPolicyCostMillions = (
    markets: OwnedStreamingMarketOperation[],
    revenueMillions: number,
): number => {
    if (!markets.length) return 0;
    const audienceTotal = markets.reduce((sum, operation) => (
        sum + safe(operation.countryProfile?.audienceSize, 1)
    ), 0) || markets.length;
    return roundMillions(markets.reduce((sum, operation) => {
        const audienceShare = safe(operation.countryProfile?.audienceSize, 1) / audienceTotal;
        const policyRate = (
            safe(operation.policySnapshot?.effectiveTaxPercent, 0, 100)
            + safe(operation.policySnapshot?.streamingLevyPercent, 0, 100)
        ) / 100;
        return sum + revenueMillions * audienceShare * policyRate;
    }, 0));
};

const distressMultiplierFor = (platform: PlatformState): number => {
    const statusMultiplier = (() => {
        switch (platform.ai?.status) {
            case 'DISTRESSED': return 0.68;
            case 'RESTRUCTURING': return 0.52;
            case 'DORMANT': return 0.28;
            default: return 1;
        }
    })();
    const administrationMultiplier = platform.ai?.administration?.outcome === 'PENDING' ? 0.34 : 1;
    const latestFunding = platform.ai?.externalRecapitalizations
        .filter(record => record.status === 'SETTLED')
        .slice()
        .sort((left, right) => (
            (right.settledAtAbsoluteWeek || 0) - (left.settledAtAbsoluteWeek || 0)
            || right.id.localeCompare(left.id)
        ))[0];
    const fundingMultiplier = latestFunding
        ? Math.max(0.45, Math.min(
            1,
            latestFunding.valuationConfidenceMultiplier
                * (1 - latestFunding.dilutionPercent / 200)
                * (1 - latestFunding.autonomyPenalty / 400),
        ))
        : 1;
    return Math.min(statusMultiplier, administrationMultiplier) * fundingMultiplier;
};

const technologyScoreFor = (platform: PlatformState): number => {
    const values = Object.values(platform.ai?.capabilities.technologyLevels || {}).map(Number).filter(Number.isFinite);
    return average(values);
};

const catalogueScoreFor = (platform: PlatformState, absoluteWeek: number): number => {
    const activeLicensedProjectIds = new Set(platform.ai?.rightsContracts.filter(contract => (
        contract.status === 'ACTIVE'
        && isStreamingLicenseActiveAt(contract, absoluteWeek)
        && contract.origin !== 'OWNED_STUDIO_TRANSFER'
        && !contract.permanentPurchase
    )).map(contract => contract.sourceProjectId) || []);
    const originalProjectIds = new Set((platform.ai?.slate || [])
        .filter(plan => plan.source === 'COMMISSIONED_ORIGINAL' && plan.status === 'RELEASED')
        .flatMap(plan => plan.releaseEntries.map(entry => entry.canonicalProjectId))
        .filter(Boolean));
    return activeLicensedProjectIds.size + originalProjectIds.size;
};

const trailingEconomyFor = (platform: PlatformState): {
    revenueMillions: number;
    operatingCostMillions: number;
    netCashFlowMillions: number;
} => {
    const profile = PLATFORM_AI_PROFILES[platform.id];
    const fallbackOperatingCost = roundMillions(
        profile.baseWeeklyOperationsMillions
        + activeRegionCount(platform) * profile.regionWeeklyCostMillions,
    );
    const revenues = trailing(platform, 'revenueMillions');
    const operatingCosts = trailing(platform, 'operatingCostMillions');
    const netCashFlows = trailing(platform, 'operatingNetCashFlowMillions');
    return {
        revenueMillions: average(revenues, 0),
        operatingCostMillions: average(operatingCosts, fallbackOperatingCost),
        netCashFlowMillions: average(netCashFlows, -fallbackOperatingCost),
    };
};

export interface PlatformAiEconomyInput {
    player: Player;
    platform: PlatformState;
    absoluteWeek: number;
    verifiedContractIncomeMillions?: number;
    rescueIncomeMillions?: number;
    settledObligationCostMillions?: number;
    localizationCostMillions?: number;
    discretionaryCostMillions?: number;
    financingCostMillions?: number;
}

export interface PlatformAiEconomyResult {
    platform: PlatformState;
    snapshot: PlatformAiFinanceSnapshot | null;
    cashDeltaMillions: number;
    changed: boolean;
    skippedReason?: 'PLAYER_CONTROLLED' | 'ALREADY_PROCESSED';
}

export interface PlatformAiRunwayInput {
    player: Player;
    platform: PlatformState;
    absoluteWeek?: number;
}

export interface PlatformAiRunwayResult {
    platform: PlatformState;
    reserveCoverageWeeks: number;
    lossRunwayWeeks: number | null;
    trailingWeeklyOperatingCostMillions: number;
    trailingWeeklyNetCashFlowMillions: number;
    targetReserveMillions: number;
}

export interface PlatformAiRescueCapInput extends PlatformAiRunwayInput {
    absoluteWeek?: number;
}

export interface PlatformAiDistressInput extends PlatformAiEconomyInput {}

export interface PlatformAiDistressResult {
    platform: PlatformState;
    changed: boolean;
    action: PlatformAiDistressAction | null;
}

const playerControlledEconomyResult = (platform: PlatformState): PlatformAiEconomyResult => ({
    platform,
    snapshot: null,
    cashDeltaMillions: 0,
    changed: false,
    skippedReason: 'PLAYER_CONTROLLED',
});

const settlePendingAudience = (
    platform: PlatformState,
    absoluteWeek: number,
): PlatformState => {
    const settlements = normalizePlatformAiAudienceSettlements(platform.ai?.pendingAudienceSettlements);
    const eligible = settlements.filter(settlement => (
        settlement.status === 'PENDING'
        && settlement.createdAtAbsoluteWeek < absoluteWeek
    ));
    if (!eligible.length) return platform;
    const eligibleIds = new Set(eligible.map(settlement => settlement.id));
    const subscriberImpactMillions = roundMillions(eligible.reduce((sum, settlement) => (
        sum + settlement.subscriberImpactMillions
    ), 0));
    const acquiredSubscribersMillions = roundMillions(eligible.reduce((sum, settlement) => (
        sum + (settlement.acquiredSubscribersMillions || 0)
    ), 0));
    const retainedSubscribersMillions = roundMillions(eligible.reduce((sum, settlement) => (
        sum + (settlement.retainedSubscribersMillions || 0)
    ), 0));
    const churnedSubscribersMillions = roundMillions(eligible.reduce((sum, settlement) => (
        sum + (settlement.churnedSubscribersMillions || 0)
    ), 0));
    const engagementIndexDelta = eligible.reduce((sum, settlement) => sum + (settlement.engagementIndexDelta || 0), 0);
    const catalogueStrengthDelta = eligible.reduce((sum, settlement) => sum + (settlement.catalogueStrengthDelta || 0), 0);
    const audienceHealth = platform.ai!.audienceHealth;
    return {
        ...platform,
        subscribers: roundMillions(Math.max(0, platform.subscribers + subscriberImpactMillions)),
        ai: {
            ...platform.ai!,
            audienceHealth: {
                engagementIndex: Math.round(Math.max(0, Math.min(100,
                    audienceHealth.engagementIndex + engagementIndexDelta,
                )) * 100) / 100,
                catalogueStrengthIndex: Math.round(Math.max(0, Math.min(100,
                    audienceHealth.catalogueStrengthIndex + catalogueStrengthDelta,
                )) * 100) / 100,
                acquiredSubscribersMillions: roundMillions(audienceHealth.acquiredSubscribersMillions + acquiredSubscribersMillions),
                retainedSubscribersMillions: roundMillions(audienceHealth.retainedSubscribersMillions + retainedSubscribersMillions),
                churnedSubscribersMillions: roundMillions(audienceHealth.churnedSubscribersMillions + churnedSubscribersMillions),
            },
            pendingAudienceSettlements: normalizePlatformAiAudienceSettlements(settlements.map(settlement => (
                eligibleIds.has(settlement.id)
                    ? { ...settlement, status: 'SETTLED' as const, settledAtAbsoluteWeek: absoluteWeek }
                    : settlement
            ))),
        },
    };
};

export const calculatePlatformAiWeeklyEconomy = (
    input: PlatformAiEconomyInput,
): PlatformAiEconomyResult => {
    if (resolvePlatformController(input.player, input.platform.id) === 'PLAYER') {
        return playerControlledEconomyResult(input.platform);
    }
    const legacyRegionCount = fallbackRegionCount(input.platform);
    const normalizedPlatform = normalizePlatformAiState(input.platform, input.player.id, input.absoluteWeek);
    const authoritativeMoves = Array.isArray(input.player.ownedStreamingPlatform?.competitiveWorld?.moves)
        ? input.player.ownedStreamingPlatform!.competitiveWorld.moves
        : [];
    const canonicalExternalCommitments = normalizePlatformAiExternalCommitments(
        normalizedPlatform.ai!.externalCommitments,
        normalizedPlatform.id,
        normalizedPlatform.ai!.pendingOneTimeObligations,
        authoritativeMoves,
        input.absoluteWeek,
    );
    const platform: PlatformState = {
        ...normalizedPlatform,
        ai: {
            ...normalizedPlatform.ai!,
            externalCommitments: canonicalExternalCommitments,
            pendingOneTimeObligations: reconcilePlatformAiExternalCommitmentObligations(
                normalizedPlatform.ai!.pendingOneTimeObligations,
                canonicalExternalCommitments,
            ),
        },
    };
    const profile = PLATFORM_AI_PROFILES[platform.id];
    const ai = platform.ai!;
    const markets = activeMarkets(platform);
    const canonicalWorldEconomy = input.player.world.worldStreamingPlatformEconomy;
    const canonicalPlatformEconomy = canonicalWorldEconomy
        && canonicalWorldEconomy.lastProcessedAbsoluteWeek <= input.absoluteWeek
        ? canonicalWorldEconomy.platforms[platform.id]
        : null;
    const subscriptionRevenueMillions = canonicalPlatformEconomy
        ? fullCurrencyToMillions(Math.round(canonicalPlatformEconomy.weeklySubscriptionRevenue))
        : fullCurrencyToMillions(
            calculateStreamingSubscriptionRevenueFullCurrency({
                subscribers: safe(platform.subscribers) * 1_000_000,
                monthlyArpu: profile.monthlyArpu,
                paidSubscriberShare: profile.paidSubscriberShare,
            }),
        );
    const advertisingRevenueMillions = canonicalPlatformEconomy
        ? fullCurrencyToMillions(Math.round(canonicalPlatformEconomy.weeklyIncrementalRevenue))
        : fullCurrencyToMillions(
            calculateStreamingAdvertisingRevenueFullCurrency({
                subscribers: safe(platform.subscribers) * 1_000_000,
                adSupportedShare: profile.adSupportedShare,
                weeklyAdRevenuePerSubscriber: profile.weeklyAdRevenuePerSubscriber,
            }),
        );
    const verifiedContractIncomeMillions = roundMillions(input.verifiedContractIncomeMillions || 0);
    const rescueIncomeMillions = roundMillions(input.rescueIncomeMillions || 0);
    const revenueMillions = roundMillions(
        subscriptionRevenueMillions + advertisingRevenueMillions + verifiedContractIncomeMillions,
    );
    const deliveryCostMillions = roundMillions(
        safe(platform.subscribers) * profile.weeklyDeliveryCostPerSubscriber,
    );
    const baseOperationsCostMillions = roundMillions(
        profile.baseWeeklyOperationsMillions
        + (markets.length === 0 ? legacyRegionCount * profile.regionWeeklyCostMillions : 0),
    );
    const marketOperatingCostMillions = roundMillions(markets.reduce((sum, operation) => (
        sum + fullCurrencyToMillions(safe(operation.weeklyOperatingCost))
    ), 0));
    const standardEligibleRecurringCostMillions = roundMillions(
        deliveryCostMillions + baseOperationsCostMillions + marketOperatingCostMillions,
    );
    const recurringEfficiency = createPlatformAiRecurringEfficiencySnapshot(
        standardEligibleRecurringCostMillions,
        getPlatformAiOperatingProfile(platform.id).efficiency.recurringOperationsCostMultiplier,
        'AI',
    );
    const marketPolicyCost = marketPolicyCostMillions(markets, revenueMillions);
    const partnerRevenueShareCalculation = calculatePlatformAiPartnerRevenueShares(
        platform,
        subscriptionRevenueMillions,
        input.absoluteWeek,
    );
    const partnerRevenueShareCostMillions = partnerRevenueShareCalculation.totalCostMillions;
    // One-time rights guarantees, production milestones, and research capital costs settle in their owning services.
    const contentCostMillions = 0;
    const researchCostMillions = roundMillions(ai.researchQueue.reduce((sum, item) => (
        sum + getPlatformResearchRecurringCostMillions(item)
    ), 0));
    const technologyCostMillions = roundMillions(ai.researchQueue.reduce((sum, item) => (
        sum + (item.stage === 'OPERATING' ? safe(item.technologyWeeklyOperatingCostMillions || 0) : 0)
    ), 0));
    const requestedOneTimeCosts: Array<{ category: PlatformAiExpenseClass; amountMillions: number }> = [
        { category: 'CONTRACTUAL' as const, amountMillions: roundMillions(input.settledObligationCostMillions || 0) },
        { category: 'LOCALIZATION' as const, amountMillions: roundMillions(input.localizationCostMillions || 0) },
        { category: 'DISCRETIONARY' as const, amountMillions: roundMillions(input.discretionaryCostMillions || 0) },
    ].filter(item => item.amountMillions > 0);
    const protectedLocalizationObligationIds = new Set(ai.localizationJobs
        .filter(job => job.status !== 'CANCELLED' && job.costMillions > 0)
        .map(job => job.obligationId));
    for (const commitment of ai.externalCommitments) {
        protectedLocalizationObligationIds.add(commitment.obligationId);
    }
    const pendingOneTimeObligations = reconcilePlatformAiRightsRenewalObligations([
        ...ai.pendingOneTimeObligations,
        ...requestedOneTimeCosts.map(item => ({
            id: createDeterministicId(
                'platform_ai_one_time_obligation',
                platform.id,
                item.category,
                input.absoluteWeek,
                item.amountMillions,
            ),
            category: item.category,
            amountMillions: item.amountMillions,
            createdWeek: input.absoluteWeek,
            status: 'HELD' as const,
            settledWeek: null,
        })),
    ], ai.rightsRenewals, protectedLocalizationObligationIds);
    const heldAtOpening = pendingOneTimeObligations.filter(obligation => obligation.status === 'HELD');
    const oneTimeAccrued = (category: PlatformAiExpenseClass): number => roundMillions(heldAtOpening
        .filter(obligation => obligation.category === category)
        .reduce((sum, obligation) => sum + obligation.amountMillions, 0));
    const contractualCostAccruedMillions = oneTimeAccrued('CONTRACTUAL');
    const localizationCostAccruedMillions = oneTimeAccrued('LOCALIZATION');
    const discretionaryCostAccruedMillions = oneTimeAccrued('DISCRETIONARY');
    const mandatoryCostAccruedMillions = roundMillions(
        recurringEfficiency.appliedEligibleCostMillions
        + marketPolicyCost
        + partnerRevenueShareCostMillions
        + contentCostMillions
        + researchCostMillions
        + technologyCostMillions,
    );
    const settledObligationAccruedMillions = roundMillions(
        contractualCostAccruedMillions + localizationCostAccruedMillions + discretionaryCostAccruedMillions,
    );
    const financingCostAccruedMillions = roundMillions(
        safe(input.financingCostMillions || 0)
        + safe(ai.debtMillions) * safe(ai.debtInterestRateAnnualPercent, 2, 20) / 100 / 52,
    );
    // Operating cost remains recurring and actor-neutral; settled obligations and financing stay separate.
    const operatingCostMillions = mandatoryCostAccruedMillions;
    const operatingNetCashFlowMillions = roundMillions(revenueMillions - operatingCostMillions);
    const openingCashMillions = roundMillions(platform.cashReserve);
    let availableCashMillions = roundMillions(openingCashMillions + revenueMillions + rescueIncomeMillions);
    const mandatoryCostMillions = roundMillions(Math.min(mandatoryCostAccruedMillions, availableCashMillions));
    availableCashMillions = roundMillions(availableCashMillions - mandatoryCostMillions);
    const financingCostMillions = roundMillions(Math.min(financingCostAccruedMillions, availableCashMillions));
    availableCashMillions = roundMillions(availableCashMillions - financingCostMillions);
    const settledByCategory: Record<PlatformAiExpenseClass, number> = {
        CONTRACTUAL: 0,
        LOCALIZATION: 0,
        DISCRETIONARY: 0,
    };
    const pendingExternalByObligationId = new Map(ai.externalCommitments
        .filter(commitment => commitment.status === 'PENDING_PAYMENT')
        .map(commitment => [commitment.obligationId, commitment]));
    let externalCommitmentShortfallMillions = 0;
    const settledPendingOneTimeObligations = pendingOneTimeObligations.map(
        (obligation): PlatformAiPendingOneTimeObligation => {
            if (obligation.status === 'SETTLED') return obligation;
            const externalCommitment = pendingExternalByObligationId.get(obligation.id);
            if (externalCommitment) {
                const paidFromCashMillions = roundMillions(Math.min(availableCashMillions, obligation.amountMillions));
                availableCashMillions = roundMillions(availableCashMillions - paidFromCashMillions);
                externalCommitmentShortfallMillions = roundMillions(
                    externalCommitmentShortfallMillions + obligation.amountMillions - paidFromCashMillions,
                );
                settledByCategory[obligation.category] = roundMillions(
                    settledByCategory[obligation.category] + obligation.amountMillions,
                );
                return { ...obligation, status: 'SETTLED', settledWeek: input.absoluteWeek };
            }
            if (availableCashMillions < obligation.amountMillions) return obligation;
            availableCashMillions = roundMillions(availableCashMillions - obligation.amountMillions);
            settledByCategory[obligation.category] = roundMillions(
                settledByCategory[obligation.category] + obligation.amountMillions,
            );
            return { ...obligation, status: 'SETTLED', settledWeek: input.absoluteWeek };
        },
    );
    const heldAtOpeningIds = new Set(heldAtOpening.map(obligation => obligation.id));
    const newlySettledObligationIds = new Set(settledPendingOneTimeObligations
        .filter(obligation => (
            heldAtOpeningIds.has(obligation.id)
            && obligation.status === 'SETTLED'
            && obligation.settledWeek === input.absoluteWeek
        ))
        .map(obligation => obligation.id));
    const rightsRenewals = ai.rightsRenewals.map(record => (
        record.status === 'PENDING_PAYMENT'
        && record.paymentSettledAtAbsoluteWeek === null
        && newlySettledObligationIds.has(record.obligationId)
            ? {
                ...record,
                status: 'PAYMENT_SETTLED' as const,
                paymentSettledAtAbsoluteWeek: input.absoluteWeek,
            }
            : record
    ));
    const nextPendingOneTimeObligations = reconcilePlatformAiRightsRenewalObligations(
        settledPendingOneTimeObligations,
        rightsRenewals,
        protectedLocalizationObligationIds,
    );
    const localizationJobs = ai.localizationJobs.map(job => (
        job.status === 'WAITING_FOR_FUNDS'
        && job.startedAtAbsoluteWeek === null
        && newlySettledObligationIds.has(job.obligationId)
            ? {
                ...job,
                status: 'IN_PROGRESS' as const,
                startedAtAbsoluteWeek: input.absoluteWeek,
                readyAtAbsoluteWeek: null,
            }
            : job
    ));
    const externalCommitments = settlePlatformAiExternalCommitments(
        ai.externalCommitments,
        nextPendingOneTimeObligations,
        input.absoluteWeek,
        platform.id,
    );
    const contractualCostMillions = settledByCategory.CONTRACTUAL;
    const localizationCostMillions = settledByCategory.LOCALIZATION;
    const discretionaryCostMillions = settledByCategory.DISCRETIONARY;
    const settledObligationCostMillions = roundMillions(
        contractualCostMillions + localizationCostMillions + discretionaryCostMillions,
    );
    const heldObligations = nextPendingOneTimeObligations
        .filter(obligation => obligation.status === 'HELD')
        .map(obligation => ({
            expenseClass: obligation.category,
            amountMillions: obligation.amountMillions,
            status: 'ON_HOLD' as const,
        }));
    const unfundedMandatoryCostMillions = roundMillions(mandatoryCostAccruedMillions - mandatoryCostMillions);
    const unfundedSettledObligationCostMillions = roundMillions(
        heldObligations.reduce((sum, obligation) => sum + obligation.amountMillions, 0),
    );
    const unfundedFinancingCostMillions = roundMillions(financingCostAccruedMillions - financingCostMillions);
    const debtIncurredMillions = roundMillions(
        unfundedMandatoryCostMillions
        + unfundedFinancingCostMillions
        + externalCommitmentShortfallMillions,
    );
    const preAllocationCashMillions = Math.max(0, availableCashMillions);
    const preAllocationDebtMillions = roundMillions(ai.debtMillions + debtIncurredMillions);
    const trailingOperatingCostMillions = average(
        [...trailing(platform, 'operatingCostMillions'), operatingCostMillions].slice(-13),
        operatingCostMillions,
    );
    const trailingNetCashFlowMillions = average(
        [...trailing(platform, 'operatingNetCashFlowMillions'), operatingNetCashFlowMillions].slice(-13),
        operatingNetCashFlowMillions,
    );
    const reserveTargetMillions = roundMillions(trailingOperatingCostMillions * profile.targetRunwayWeeks);
    let excessMillions = roundMillions(Math.max(
        0,
        preAllocationCashMillions - reserveTargetMillions * 1.25,
    ));
    const allocations: PlatformAiReserveAllocation[] = [];
    const approvedEarmarks = futureEarmarks(input.player, platform);
    const debtReductionMillions = roundMillions(Math.min(preAllocationDebtMillions, excessMillions));
    if (debtReductionMillions > 0) {
        allocations.push({ type: 'DEBT_REDUCTION', amountMillions: debtReductionMillions, referenceId: null });
        excessMillions = roundMillions(excessMillions - debtReductionMillions);
    }
    for (const earmark of approvedEarmarks) {
        const amountMillions = roundMillions(Math.min(earmark.amountMillions, excessMillions));
        if (amountMillions <= 0) break;
        allocations.push({ ...earmark, amountMillions });
        excessMillions = roundMillions(excessMillions - amountMillions);
    }
    if (excessMillions > 0) {
        allocations.push({ type: 'SHAREHOLDER_DISTRIBUTION', amountMillions: excessMillions, referenceId: null });
    }
    const reserveAllocationMillions = roundMillions(allocations.reduce((sum, allocation) => (
        allocation.type === 'DEBT_REDUCTION' || allocation.type === 'SHAREHOLDER_DISTRIBUTION'
            ? sum + allocation.amountMillions
            : sum
    ), 0));
    const closingCashMillions = roundMillions(Math.max(0, preAllocationCashMillions - reserveAllocationMillions));
    const closingDebtMillions = roundMillions(Math.max(0, preAllocationDebtMillions - debtReductionMillions));
    const runway = calculateStreamingRunwayFromTrailingCosts({
        cash: closingCashMillions,
        trailingWeeklyOperatingCost: trailingOperatingCostMillions,
        trailingWeeklyNetCashFlow: trailingNetCashFlowMillions,
    });
    const snapshot: PlatformAiFinanceSnapshot = {
        absoluteWeek: input.absoluteWeek,
        openingCashMillions,
        subscriptionRevenueMillions,
        advertisingRevenueMillions,
        verifiedContractIncomeMillions,
        rescueIncomeMillions,
        rescueDebtReductionMillions: 0,
        externalInvestmentIncomeMillions: 0,
        externalInvestmentDebtReductionMillions: 0,
        externalInvestmentArrearsReductionMillions: 0,
        revenueMillions,
        deliveryCostMillions,
        baseOperationsCostMillions,
        marketOperatingCostMillions,
        marketPolicyCostMillions: marketPolicyCost,
        partnerRevenueShareCostMillions,
        administrationCostMillions: 0,
        recurringEfficiency,
        platformTradeRoyaltyAllocations: partnerRevenueShareCalculation.platformTradeAllocations,
        contentCostMillions,
        researchCostMillions,
        technologyCostMillions,
        localizationCostMillions,
        contractualCostAccruedMillions,
        contractualCostMillions,
        localizationCostAccruedMillions,
        discretionaryCostAccruedMillions,
        discretionaryCostMillions,
        heldObligations,
        mandatoryCostAccruedMillions,
        mandatoryCostMillions,
        settledObligationAccruedMillions,
        settledObligationCostMillions,
        financingCostAccruedMillions,
        financingCostMillions,
        unfundedMandatoryCostMillions,
        unfundedSettledObligationCostMillions,
        unfundedFinancingCostMillions,
        operatingCostMillions,
        operatingNetCashFlowMillions,
        debtIncurredMillions,
        reserveAllocationMillions,
        allocations,
        netCashFlowMillions: roundMillions(closingCashMillions - openingCashMillions),
        closingCashMillions,
        closingDebtMillions,
        reserveTargetMillions,
        reserveCoverageWeeks: runway.reserveCoverageWeeks,
        lossRunwayWeeks: runway.lossRunwayWeeks,
        runwayWeeks: runway.lossRunwayWeeks,
    };
    return {
        platform: {
            ...platform,
            ai: {
                ...ai,
                pendingOneTimeObligations: nextPendingOneTimeObligations,
                externalCommitments,
                localizationJobs,
                rightsRenewals,
                outstandingApprovedContentMillions: roundMillions(approvedEarmarks
                    .filter(item => item.type === 'APPROVED_CONTENT')
                    .reduce((sum, item) => sum + item.amountMillions, 0)),
                outstandingApprovedResearchMillions: roundMillions(approvedEarmarks
                    .filter(item => item.type === 'APPROVED_RESEARCH')
                    .reduce((sum, item) => sum + item.amountMillions, 0)),
            },
        },
        snapshot,
        cashDeltaMillions: snapshot.netCashFlowMillions,
        changed: false,
    };
};

export const getPlatformAiRunway = (input: PlatformAiRunwayInput): PlatformAiRunwayResult => {
    if (resolvePlatformController(input.player, input.platform.id) === 'PLAYER') {
        return {
            platform: input.platform,
            reserveCoverageWeeks: NO_LOSS_RUNWAY_WEEKS,
            lossRunwayWeeks: null,
            trailingWeeklyOperatingCostMillions: 0,
            trailingWeeklyNetCashFlowMillions: 0,
            targetReserveMillions: 0,
        };
    }
    const platform = input.platform.ai
        ? input.platform
        : normalizePlatformAiState(input.platform, input.player.id, 0);
    const trailingEconomy = trailingEconomyFor(platform);
    const runway = calculateStreamingRunwayFromTrailingCosts({
        cash: platform.cashReserve,
        trailingWeeklyOperatingCost: trailingEconomy.operatingCostMillions,
        trailingWeeklyNetCashFlow: trailingEconomy.netCashFlowMillions,
    });
    return {
        platform,
        ...runway,
        trailingWeeklyOperatingCostMillions: trailingEconomy.operatingCostMillions,
        trailingWeeklyNetCashFlowMillions: trailingEconomy.netCashFlowMillions,
        targetReserveMillions: roundMillions(
            trailingEconomy.operatingCostMillions * PLATFORM_AI_PROFILES[platform.id].targetRunwayWeeks,
        ),
    };
};

export const calculatePlatformAiRescueCapMillions = (
    input: PlatformAiRescueCapInput,
): number => {
    if (resolvePlatformController(input.player, input.platform.id) === 'PLAYER') return 0;
    const profile = PLATFORM_AI_PROFILES[input.platform.id];
    if (profile.parentBacking === 'NONE') return 0;
    const runway = getPlatformAiRunway(input);
    const history = (runway.platform.ai?.financeHistory || []).slice(-13);
    const referenceWeek = input.absoluteWeek ?? Math.max(0, ...history.map(snapshot => snapshot.absoluteWeek));
    const lastRescue = runway.platform.ai?.lastRescueAbsoluteWeek ?? null;
    if (lastRescue !== null && referenceWeek - lastRescue < RESCUE_COOLDOWN_WEEKS) return 0;
    const averageRevenueMillions = average(history.map(snapshot => snapshot.revenueMillions));
    const averageMandatoryCostMillions = average(history.map(snapshot => (
        Number(snapshot.mandatoryCostAccruedMillions)
        || Number(snapshot.mandatoryCostMillions)
        || Number(snapshot.operatingCostMillions)
        || 0
    )));
    const scaleCapMillions = Math.min(averageRevenueMillions * 13, averageMandatoryCostMillions * 13);
    const backingMultiplier = profile.parentBacking === 'STRONG' ? 1 : profile.parentBacking === 'LIMITED' ? 0.5 : 0;
    const targetCapMillions = runway.targetReserveMillions * 0.5;
    const needMillions = Math.max(0, targetCapMillions - runway.platform.cashReserve)
        + safe(runway.platform.ai?.debtMillions);
    return roundMillions(Math.min(
        scaleCapMillions * backingMultiplier,
        targetCapMillions,
        needMillions,
    ));
};

export const calculatePlatformAiValuationBillions = (
    input: PlatformAiRunwayInput,
): number => {
    if (resolvePlatformController(input.player, input.platform.id) === 'PLAYER') {
        return input.platform.valuation;
    }
    const platform = input.platform.ai
        ? input.platform
        : normalizePlatformAiState(input.platform, input.player.id, 0);
    const trailingEconomy = trailingEconomyFor(platform);
    const calculated = calculateStreamingStandaloneValuationFullCurrency({
        trailingWeeklyRevenueFullCurrency: trailingEconomy.revenueMillions * 1_000_000,
        trailingWeeklyOperatingCostFullCurrency: trailingEconomy.operatingCostMillions * 1_000_000,
        subscribers: platform.subscribers * PLATFORM_AI_PROFILES[platform.id].paidSubscriberShare * 1_000_000,
        catalogueScore: catalogueScoreFor(
            platform,
            input.absoluteWeek ?? platform.ai!.financeHistory.at(-1)?.absoluteWeek ?? 0,
        ),
        technologyScore: technologyScoreFor(platform),
        debtFullCurrency: platform.ai!.debtMillions * 1_000_000,
        distressMultiplier: distressMultiplierFor(platform),
    }) / 1_000_000_000;
    const prior = safe(platform.ai!.standaloneValuationBillions, 0) || safe(platform.valuation, 0);
    return roundMillions(prior * 0.85 + calculated * 0.15);
};

const distressDecision = (
    platformId: PlatformId,
    absoluteWeek: number,
    action: PlatformAiDistressAction,
    summary: string,
    reason: string,
    cashImpactMillions = 0,
): PlatformAiDecisionRecord => ({
    id: createDeterministicId('platform_ai_decision', platformId, absoluteWeek, 'DISTRESS_RESPONSE', action),
    absoluteWeek,
    type: 'DISTRESS_RESPONSE',
    action,
    summary,
    reason,
    cashImpactMillions: roundMillions(cashImpactMillions),
});

const hasDistressAction = (platform: PlatformState, action: PlatformAiDistressAction): boolean => (
    platform.ai!.decisionHistory.some(decision => decision.type === 'DISTRESS_RESPONSE' && (
        decision.action === action || decision.summary === action
    ))
);

const recordRescueInCurrentSnapshot = (
    platform: PlatformState,
    absoluteWeek: number,
    rescueIncomeMillions: number,
    rescueDebtReductionMillions: number,
): PlatformState => {
    const index = platform.ai!.financeHistory.findIndex(snapshot => snapshot.absoluteWeek === absoluteWeek);
    if (index < 0 || rescueIncomeMillions <= 0) return platform;
    const history = platform.ai!.financeHistory.slice();
    const source = history[index];
    const cashRemainderMillions = roundMillions(rescueIncomeMillions - rescueDebtReductionMillions);
    const closingCashMillions = roundMillions(source.closingCashMillions + cashRemainderMillions);
    const closingDebtMillions = roundMillions(Math.max(0, source.closingDebtMillions - rescueDebtReductionMillions));
    const operatingCosts = history.slice(-13).map(snapshot => snapshot.operatingCostMillions);
    const operatingNetCashFlows = history.slice(-13).map(snapshot => snapshot.operatingNetCashFlowMillions);
    const runway = calculateStreamingRunwayFromTrailingCosts({
        cash: closingCashMillions,
        trailingWeeklyOperatingCost: average(operatingCosts),
        trailingWeeklyNetCashFlow: average(operatingNetCashFlows),
    });
    history[index] = {
        ...source,
        rescueIncomeMillions: roundMillions((source.rescueIncomeMillions || 0) + rescueIncomeMillions),
        rescueDebtReductionMillions: roundMillions((source.rescueDebtReductionMillions || 0) + rescueDebtReductionMillions),
        netCashFlowMillions: roundMillions(source.netCashFlowMillions + cashRemainderMillions),
        closingCashMillions,
        closingDebtMillions,
        reserveCoverageWeeks: runway.reserveCoverageWeeks,
        lossRunwayWeeks: runway.lossRunwayWeeks,
        runwayWeeks: runway.lossRunwayWeeks,
    };
    return { ...platform, ai: { ...platform.ai!, financeHistory: history } };
};

const resolvePlatformAiDistressLegacy = (
    input: PlatformAiDistressInput,
): PlatformAiDistressResult => {
    if (resolvePlatformController(input.player, input.platform.id) === 'PLAYER') {
        return { platform: input.platform, changed: false, action: null };
    }
    const existingDecision = input.platform.ai?.decisionHistory.some(decision => (
        decision.type === 'DISTRESS_RESPONSE' && decision.absoluteWeek === input.absoluteWeek
    ));
    if (existingDecision) return { platform: input.platform, changed: false, action: null };
    let platform = normalizePlatformAiState(input.platform, input.player.id, input.absoluteWeek);
    const ai = platform.ai!;
    if (ai.status === 'DORMANT') return { platform: input.platform, changed: false, action: null };
    const latest = ai.financeHistory.at(-1);
    const financiallyDistressed = ai.status !== 'ACTIVE'
        || ai.debtMillions > 0
        || Boolean(latest && (
            latest.debtIncurredMillions > 0
            || latest.lossRunwayWeeks !== null && latest.lossRunwayWeeks !== undefined && latest.lossRunwayWeeks < 8
        ));
    if (!financiallyDistressed) return { platform: input.platform, changed: false, action: null };
    if (ai.status === 'RESTRUCTURING' && ai.restructuringFailedAtAbsoluteWeek === null) {
        const completedPreRestructureActions = ['FREEZE_GREENLIGHTS', 'PAUSE_RESEARCH', 'HOLD_COMMISSION', 'WITHDRAW_REGION']
            .every(action => hasDistressAction(platform, action as PlatformAiDistressAction));
        const eligibleLegacyRescue = completedPreRestructureActions
            && hasDistressAction(platform, 'RESTRUCTURE')
            && ai.lastRescueAbsoluteWeek === null
            && PLATFORM_AI_PROFILES[platform.id].parentBacking !== 'NONE';
        const eligibleLegacyRestructure = completedPreRestructureActions && !hasDistressAction(platform, 'RESTRUCTURE');
        if (!eligibleLegacyRescue && !eligibleLegacyRestructure) {
            return { platform, changed: false, action: null };
        }
    }
    if (ai.status === 'RESTRUCTURING' && ai.lastRescueAbsoluteWeek !== null
        && input.absoluteWeek - ai.lastRescueAbsoluteWeek < RESCUE_COOLDOWN_WEEKS) {
        return { platform, changed: false, action: null };
    }

    let action: PlatformAiDistressAction;
    let summary: string;
    let reason: string;
    let cashImpactMillions = 0;
    if (!hasDistressAction(platform, 'FREEZE_GREENLIGHTS')) {
        action = 'FREEZE_GREENLIGHTS';
        summary = 'FREEZE_GREENLIGHTS';
        reason = 'New discretionary greenlights are frozen while mandatory obligations are protected.';
        platform = { ...platform, ai: { ...ai, status: 'DISTRESSED' } };
    } else if (!hasDistressAction(platform, 'PAUSE_RESEARCH')) {
        action = 'PAUSE_RESEARCH';
        summary = 'PAUSE_RESEARCH';
        reason = 'New research commitments are paused until recurring losses recover.';
        platform = { ...platform, ai: { ...ai, status: 'DISTRESSED' } };
    } else {
        const holdable = ai.slate
            .filter(plan => ['BRIEF', 'PRODUCER_SELECTED', 'GREENLIT'].includes(plan.status))
            .sort((left, right) => left.id.localeCompare(right.id))[0];
        if (!hasDistressAction(platform, 'HOLD_COMMISSION') && holdable) {
            action = 'HOLD_COMMISSION';
            summary = 'HOLD_COMMISSION';
            reason = `${holdable.title} was placed on hold before another discretionary payment.`;
            platform = {
                ...platform,
                ai: {
                    ...ai,
                    status: 'DISTRESSED',
                    slate: ai.slate.map(plan => plan.id === holdable.id ? { ...plan, status: 'ON_HOLD' } : plan),
                },
            };
        } else {
            const withdrawable = activeMarkets(platform)
                .slice()
                .sort((left, right) => (
                    safe(left.countryProfile?.audienceSize) - safe(right.countryProfile?.audienceSize)
                    || right.weeklyOperatingCost - left.weeklyOperatingCost
                    || left.id.localeCompare(right.id)
                ))[0];
            if (!hasDistressAction(platform, 'WITHDRAW_REGION') && withdrawable) {
                action = 'WITHDRAW_REGION';
                summary = 'WITHDRAW_REGION';
                reason = `${withdrawable.countryProfile?.country || withdrawable.countryId || 'A weak market'} was suspended to reduce recurring cost.`;
                platform = {
                    ...platform,
                    ai: {
                        ...ai,
                        status: 'DISTRESSED',
                        marketOperations: ai.marketOperations.map(operation => operation.id === withdrawable.id
                            ? { ...operation, status: 'SUSPENDED', suspendedAtAbsoluteWeek: input.absoluteWeek }
                            : operation),
                        capabilities: {
                            ...ai.capabilities,
                            activeCountryIds: ai.capabilities.activeCountryIds.filter(countryId => countryId !== withdrawable.countryId),
                        },
                    },
                };
            } else if (!hasDistressAction(platform, 'RESTRUCTURE')) {
                action = 'RESTRUCTURE';
                summary = 'RESTRUCTURE';
                reason = 'Leadership entered a formal restructuring after operating cuts were exhausted.';
                platform = { ...platform, ai: {
                    ...ai,
                    status: 'RESTRUCTURING',
                    restructuringStartedAtAbsoluteWeek: input.absoluteWeek,
                    restructuringFailedAtAbsoluteWeek: null,
                    healthyOperatingWeeks: 0,
                    restructuringInterestRateMultiplier: Math.max(0.5, ai.restructuringInterestRateMultiplier * RESTRUCTURED_INTEREST_MULTIPLIER),
                    debtInterestRateAnnualPercent: Math.max(2, Math.min(ai.debtInterestRateAnnualPercent - 1, ai.debtInterestRateAnnualPercent * 0.5)),
                } };
            } else {
                const profile = PLATFORM_AI_PROFILES[platform.id];
                const rescueCap = calculatePlatformAiRescueCapMillions({ player: input.player, platform, absoluteWeek: input.absoluteWeek });
                const lastRescue = ai.lastRescueAbsoluteWeek;
                const cooldownReady = lastRescue === null || input.absoluteWeek - lastRescue >= RESCUE_COOLDOWN_WEEKS;
                const targetReserve = getPlatformAiRunway({ player: input.player, platform }).targetReserveMillions;
                const rescueAmount = rescueCap;
                if (profile.parentBacking !== 'NONE' && cooldownReady && rescueAmount > 0) {
                    action = 'PARENT_RESCUE';
                    summary = 'PARENT_RESCUE';
                    reason = 'Capped parent support restored part of the operating target without creating a balance floor.';
                    cashImpactMillions = rescueAmount;
                    const debtReductionMillions = roundMillions(Math.min(ai.debtMillions, rescueAmount));
                    const cashRemainderMillions = roundMillions(Math.min(
                        rescueAmount - debtReductionMillions,
                        Math.max(0, targetReserve * 0.5 - platform.cashReserve),
                    ));
                    platform = {
                        ...platform,
                        cashReserve: roundMillions(platform.cashReserve + cashRemainderMillions),
                        ai: {
                            ...ai,
                            status: 'RESTRUCTURING',
                            debtMillions: roundMillions(ai.debtMillions - debtReductionMillions),
                            lastRescueAbsoluteWeek: input.absoluteWeek,
                            rescueCount: ai.rescueCount + 1,
                        },
                    };
                    platform = recordRescueInCurrentSnapshot(
                        platform,
                        input.absoluteWeek,
                        rescueAmount,
                        debtReductionMillions,
                    );
                } else {
                    if (ai.restructuringFailedAtAbsoluteWeek === null) {
                        return { platform, changed: false, action: null };
                    }
                    action = 'DORMANT';
                    summary = 'DORMANT';
                    reason = cooldownReady
                        ? 'No eligible rescue remained after the fixed distress ladder.'
                        : 'Parent support is cooling down and no independent recovery path remains.';
                    platform = { ...platform, ai: { ...ai, status: 'DORMANT' } };
                }
            }
        }
    }
    const decision = distressDecision(
        platform.id,
        input.absoluteWeek,
        action,
        summary,
        reason,
        cashImpactMillions,
    );
    platform = {
        ...platform,
        ai: {
            ...platform.ai!,
            decisionHistory: appendPlatformAiDecisions(platform.ai!.decisionHistory, [decision]),
        },
    };
    return { platform, changed: true, action };
};

/**
 * Compatibility entrypoint for callers that resolve a single platform.
 * The persisted episode ledger remains the sole progression authority.
 */
export const resolvePlatformAiDistress = (
    input: PlatformAiDistressInput,
): PlatformAiDistressResult => {
    if (resolvePlatformController(input.player, input.platform.id) === 'PLAYER') {
        return { platform: input.platform, changed: false, action: null };
    }
    const sourceWorld = {
        ...input.player.world,
        platforms: {
            ...input.player.world.platforms,
            [input.platform.id]: input.platform,
        },
    };
    const world = normalizeWorldPlatformAi(
        { ...input.player, world: sourceWorld },
        sourceWorld,
        input.absoluteWeek,
    );
    const resolved = progressPlatformAiDistressWorld({
        player: { ...input.player, world },
        world,
        absoluteWeek: input.absoluteWeek,
    });
    const platform = resolved.world.platforms?.[input.platform.id] || input.platform;
    const stageResult = platform.ai?.distressEpisodes
        .flatMap(episode => episode.stageResults)
        .find(result => result.enteredAtAbsoluteWeek === input.absoluteWeek);
    return {
        platform,
        changed: resolved.changed,
        action: stageResult?.outcome === 'APPLIED' ? stageResult.stage : null,
    };
};

export const settlePlatformAiEconomy = (
    input: PlatformAiEconomyInput,
): PlatformAiEconomyResult => {
    if (resolvePlatformController(input.player, input.platform.id) === 'PLAYER') {
        return playerControlledEconomyResult(input.platform);
    }
    const alreadySettled = input.platform.ai?.financeHistory.find(snapshot => (
        snapshot.absoluteWeek === input.absoluteWeek
    ));
    if (alreadySettled) {
        return {
            platform: input.platform,
            snapshot: alreadySettled,
            cashDeltaMillions: 0,
            changed: false,
            skippedReason: 'ALREADY_PROCESSED',
        };
    }
    const normalizedPlatform = normalizePlatformAiState(input.platform, input.player.id, input.absoluteWeek);
    const audienceSettledPlatform = settlePendingAudience(normalizedPlatform, input.absoluteWeek);
    const calculated = calculatePlatformAiWeeklyEconomy({ ...input, platform: audienceSettledPlatform });
    if (!calculated.snapshot) return calculated;
    const snapshot = calculated.snapshot;
    const allocationDecisions: PlatformAiDecisionRecord[] = snapshot.allocations.map((allocation, index) => ({
        id: createDeterministicId('platform_ai_decision', input.platform.id, input.absoluteWeek, 'RESERVE_ALLOCATION', index, allocation.type),
        absoluteWeek: input.absoluteWeek,
        type: 'RESERVE_ALLOCATION',
        action: allocation.type,
        summary: allocation.type,
        reason: `${allocation.amountMillions}M moved above the platform reserve ceiling.`,
        cashImpactMillions: -allocation.amountMillions,
    }));
    const platformTradeRoyaltyEvidence = createPlatformAiTradeRoyaltyEvidenceDecision(
        input.platform.id,
        input.absoluteWeek,
        snapshot.platformTradeRoyaltyAllocations || [],
    );
    const shortfallDecision: PlatformAiDecisionRecord[] = snapshot.debtIncurredMillions > 0 ? [{
        id: createDeterministicId('platform_ai_decision', input.platform.id, input.absoluteWeek, 'MANDATORY_SHORTFALL'),
        absoluteWeek: input.absoluteWeek,
        type: 'MANDATORY_SHORTFALL',
        summary: 'Committed cost shortfall financed',
        reason: `${snapshot.debtIncurredMillions}M of mandatory or already-executed external cost exceeded available cash.`,
        cashImpactMillions: snapshot.debtIncurredMillions,
    }] : [];
    const wasRestructuring = calculated.platform.ai!.status === 'RESTRUCTURING';
    const healthyRestructuringWeek = wasRestructuring
        && snapshot.debtIncurredMillions === 0
        && snapshot.closingDebtMillions === 0
        && snapshot.operatingNetCashFlowMillions >= 0;
    const healthyOperatingWeeks = healthyRestructuringWeek
        ? calculated.platform.ai!.healthyOperatingWeeks + 1
        : 0;
    const recovered = wasRestructuring && healthyOperatingWeeks >= HEALTHY_RECOVERY_WEEKS;
    const restructuringFailed = wasRestructuring
        && !healthyRestructuringWeek
        && calculated.platform.ai!.restructuringStartedAtAbsoluteWeek !== null
        && input.absoluteWeek - calculated.platform.ai!.restructuringStartedAtAbsoluteWeek >= RESTRUCTURING_FAILURE_WEEKS;
    let platform: PlatformState = {
        ...calculated.platform,
        cashReserve: snapshot.closingCashMillions,
        ai: {
            ...calculated.platform.ai!,
            status: recovered
                ? 'ACTIVE'
                : wasRestructuring
                    ? 'RESTRUCTURING'
                    : snapshot.debtIncurredMillions > 0 ? 'DISTRESSED' : calculated.platform.ai!.status,
            debtMillions: snapshot.closingDebtMillions,
            healthyOperatingWeeks: recovered ? 0 : healthyOperatingWeeks,
            restructuringStartedAtAbsoluteWeek: recovered ? null : calculated.platform.ai!.restructuringStartedAtAbsoluteWeek,
            restructuringFailedAtAbsoluteWeek: recovered
                ? null
                : restructuringFailed ? input.absoluteWeek : calculated.platform.ai!.restructuringFailedAtAbsoluteWeek,
            restructuringInterestRateMultiplier: recovered ? 1 : calculated.platform.ai!.restructuringInterestRateMultiplier,
            spendingRestrictions: recovered
                ? {
                    source: 'NONE',
                    blocksNewBids: false,
                    blocksNewGreenlights: false,
                    blocksNewResearch: false,
                    blocksExpansion: false,
                    expiresAtAbsoluteWeek: null,
                }
                : calculated.platform.ai!.spendingRestrictions,
            financeHistory: [...calculated.platform.ai!.financeHistory, snapshot].slice(-FINANCE_HISTORY_LIMIT),
            decisionHistory: appendPlatformAiDecisions(
                calculated.platform.ai!.decisionHistory,
                [
                    ...shortfallDecision,
                    ...allocationDecisions,
                    ...(platformTradeRoyaltyEvidence ? [platformTradeRoyaltyEvidence] : []),
                ],
            ),
        },
    };
    const valuation = calculatePlatformAiValuationBillions({ player: input.player, platform, absoluteWeek: input.absoluteWeek });
    platform = {
        ...platform,
        valuation,
        ai: { ...platform.ai!, standaloneValuationBillions: valuation },
    };
    const finalSnapshot = platform.ai!.financeHistory.find(item => item.absoluteWeek === input.absoluteWeek) || snapshot;
    return {
        platform,
        snapshot: finalSnapshot,
        cashDeltaMillions: finalSnapshot.netCashFlowMillions,
        changed: true,
    };
};
