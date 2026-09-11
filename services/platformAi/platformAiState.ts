import {
    INITIAL_PLAYER,
    PLATFORM_AI_RUNTIME_SCHEMA_VERSION,
    type OwnedStreamingCatalogLicense,
    type OwnedStreamingMarketOperation,
    type PlatformAiCapabilities,
    type PlatformAiAudienceSettlement,
    type PlatformAiContentPlan,
    type PlatformAiController,
    type PlatformAiDecisionRecord,
    type PlatformAiDistressAction,
    type PlatformAiDistressEpisode,
    type PlatformAiExpenseClass,
    type PlatformAiExternalRecapitalization,
    type PlatformAiAdministrationState,
    type PlatformAiSpendingRestrictions,
    type PlatformAiExternalCommitment,
    type PlatformAiFinanceSnapshot,
    type PlatformAiLocalizationLevel,
    type PlatformAiLocalizationJob,
    type PlatformAiLocalizationMode,
    type PlatformAiLanguageCapability,
    type PlatformAiPendingOneTimeObligation,
    type PlatformAiReleaseEntry,
    type PlatformAiReleaseReadinessSnapshot,
    type PlatformAiPremiereSelectionReason,
    type PlatformAiReleaseMemory,
    type PlatformAiReleasePattern,
    type PlatformAiReserveAllocation,
    type PlatformAiReserveAllocationType,
    type PlatformAiResearchItem,
    type PlatformAiRightsRenewalRecord,
    type PlatformAiRuntimeState,
    type PlatformAiTradeRoyaltyAllocation,
    type PlatformId,
    type PlatformState,
    type Player,
    type StreamingTechnologyBranch,
    type StreamingTechnologyCampusBranch,
    type StreamingLocalizationPromise,
    type StudioId,
    type WorldState,
} from '../../types';
import { createDeterministicId } from '../deterministicRandom';
import {
    createInitialIndustryIntelligenceState,
    normalizeIndustryIntelligenceState,
} from '../industryIntelligence/industryIntelligenceState';
import {
    STREAMING_DAY_ONE_MARKETS,
    getStreamingCountryMarketProfile,
    normalizeStreamingDayOneMarketIds,
} from '../streamingDayOneMarkets';
import { previewStreamingResearchIpCost, previewStreamingResearchProgram } from '../streamingResearchCore';
import {
    createStreamingCountryMarketOperation,
    getStreamingMarketClearanceDuration,
    getStreamingMarketPolicySnapshot,
    getStreamingMarketWeeklyOperatingCost,
} from '../streamingMarketsCore';
import { STREAMING_RESEARCH_DEFINITIONS } from '../streamingResearchLifecycle';
import {
    STREAMING_TECHNOLOGY_DEFINITIONS,
    previewStreamingTechnologyProject,
} from '../streamingTechnologyCampus';
import { fullCurrencyToMillions } from '../streamingRightsCore';
import { isKnownStreamingLanguageId, normalizeStreamingLanguageId } from '../streamingLocalizationCapabilities';
import { PLATFORM_AI_PROFILES } from './platformAiProfiles';
import { getPlatformAiOperatingProfile } from './platformAiOperatingProfiles';
import { createPlatformAiEfficiencySnapshot, normalizePlatformAiEfficiencySnapshot } from './platformAiEfficiency';
import { resolvePlatformAiLocalizationModeSupport } from './platformAiLanguageCapabilities';
import {
    getPlatformAiLocalizationJobId,
    getPlatformAiLocalizationObligationId,
    getResearchBackedContentOperationsLevel,
    quotePlatformAiLocalization,
    resolvePlatformAiLocalizationCapability,
} from './platformAiLocalizationCore';
import {
    normalizePlatformAiCommissioningLifecycle,
    normalizePlatformAiProductionEscrow,
} from './platformAiProductionEscrow';
import {
    normalizePlatformAiExternalCommitments,
    reconcilePlatformAiExternalCommitmentObligations,
} from './platformAiExternalCommitments';
import { normalizePlatformIntelligenceMigrationState } from './platformIntelligenceMigration';

const TECHNOLOGY_BRANCHES: StreamingTechnologyBranch[] = [
    'DELIVERY_CAPACITY', 'PLAYBACK_QUALITY', 'RELIABILITY', 'DATA_RECOMMENDATIONS',
    'SECURITY', 'CONTENT_OPERATIONS', 'ADVERTISING_COMMERCE', 'PRODUCT_EXPERIENCE',
];

const clampPercent = (value: unknown): number => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
const clampPrecisePercent = (value: unknown): number => Math.round(
    Math.max(0, Math.min(100, Number(value) || 0)) * 100,
) / 100;
const finiteNonNegative = (value: unknown, fallback = 0): number => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(0, numeric) : fallback;
};
const RESERVE_ALLOCATION_TYPES = new Set<PlatformAiReserveAllocationType>([
    'APPROVED_CONTENT',
    'APPROVED_RESEARCH',
    'DEBT_REDUCTION',
    'SHAREHOLDER_DISTRIBUTION',
]);
const DECISION_HISTORY_LIMIT = 40;
const ONE_TIME_OBLIGATION_HISTORY_LIMIT = 104;
const AUDIENCE_SETTLEMENT_HISTORY_LIMIT = 104;
const RIGHTS_RENEWAL_HISTORY_LIMIT = 104;
const LOCALIZATION_JOB_HISTORY_LIMIT = 104;
const COMPETENCE_FIELDS = [
    'strategy', 'creative', 'production', 'commercial',
    'prestige', 'finance', 'technology', 'negotiation',
] as const;
const PLATFORM_AI_STATUSES = new Set(['ACTIVE', 'DISTRESSED', 'RESTRUCTURING', 'DORMANT']);
const REQUIRED_RUNTIME_ARRAY_FIELDS = [
    'languageCapabilities',
    'researchQueue',
    'marketOperations',
    'slate',
    'rightsContracts',
    'talentBookingRefs',
    'releaseMemory',
    'financeHistory',
    'decisionHistory',
    'distressEpisodes',
    'externalRecapitalizations',
    'externalCommitments',
    'pendingOneTimeObligations',
    'localizationJobs',
    'rightsRenewals',
    'pendingAudienceSettlements',
] as const;
const DISTRESS_EPISODE_HISTORY_LIMIT = 8;

interface PlatformAiNormalizationDiagnostics {
    deepValidationCount: number;
    rebuildCount: number;
    turnCacheHitCount: number;
}

const canonicalTurnStates = new WeakMap<PlatformState, { absoluteWeek: number }>();
let normalizationDiagnostics: PlatformAiNormalizationDiagnostics = {
    deepValidationCount: 0,
    rebuildCount: 0,
    turnCacheHitCount: 0,
};

/**
 * Marks an internally-produced platform state as canonical for one weekly turn.
 * The WeakMap marker cannot cross JSON/save boundaries, so persisted input still
 * receives the complete structural validation performed below.
 */
export const markPlatformAiStateCanonicalForTurn = (
    platform: PlatformState,
    playerId: string,
    absoluteWeek: number,
): PlatformState => {
    void playerId;
    if (
        platform.ai?.schemaVersion === PLATFORM_AI_RUNTIME_SCHEMA_VERSION
        && platform.ai.profileId === platform.id
    ) {
        canonicalTurnStates.set(platform, { absoluteWeek });
    }
    return platform;
};

export const resetPlatformAiNormalizationDiagnostics = (): void => {
    normalizationDiagnostics = { deepValidationCount: 0, rebuildCount: 0, turnCacheHitCount: 0 };
};

export const getPlatformAiNormalizationDiagnostics = (): PlatformAiNormalizationDiagnostics => ({
    ...normalizationDiagnostics,
});
const DISTRESS_STAGE_ORDER: PlatformAiDistressAction[] = [
    'FREEZE_GREENLIGHTS',
    'PAUSE_RESEARCH',
    'HOLD_COMMISSION',
    'LICENSE_CATALOGUE',
    'WITHDRAW_REGION',
    'RESTRUCTURE',
    'PARENT_RESCUE',
    'EXTERNAL_RECAPITALIZATION',
    'BANKRUPTCY_ADMINISTRATION',
    'DORMANT',
];
const DISTRESS_EPISODE_STATUSES = new Set([
    'ACTIVE', 'MONITORING_RESTRUCTURE', 'MONITORING_RESCUE',
    'MONITORING_RECAPITALIZATION', 'ADMINISTRATION', 'RECOVERED', 'DORMANT',
]);
const DISTRESS_STAGE_OUTCOMES = new Set(['PENDING', 'APPLIED', 'UNAVAILABLE', 'FAILED']);
const ONE_TIME_OBLIGATION_CATEGORIES = new Set<PlatformAiExpenseClass>([
    'CONTRACTUAL',
    'LOCALIZATION',
    'DISCRETIONARY',
]);

export const appendPlatformAiDecisions = (
    history: PlatformAiDecisionRecord[],
    decisions: PlatformAiDecisionRecord[],
): PlatformAiDecisionRecord[] => {
    const byId = new Map<string, PlatformAiDecisionRecord>();
    for (const decision of [...history, ...decisions]) {
        if (!decision?.id) continue;
        // Re-appending a stable decision replaces and moves it to the newest position.
        byId.delete(decision.id);
        byId.set(decision.id, decision);
    }
    return Array.from(byId.values()).slice(-DECISION_HISTORY_LIMIT);
};

export const normalizePlatformAiPendingOneTimeObligations = (
    value: unknown,
    protectedSettledIds: Set<string> = new Set(),
): PlatformAiPendingOneTimeObligation[] => {
    const byId = new Map<string, PlatformAiPendingOneTimeObligation>();
    for (const rawValue of Array.isArray(value) ? value : []) {
        if (!isRecord(rawValue)) continue;
        const raw = rawValue as Partial<PlatformAiPendingOneTimeObligation> & { expenseClass?: unknown };
        const id = String(raw.id || '').trim();
        const category = String(raw.category || raw.expenseClass || '') as PlatformAiExpenseClass;
        const amountMillions = finiteNonNegative(raw.amountMillions);
        if (!id || !ONE_TIME_OBLIGATION_CATEGORIES.has(category) || amountMillions <= 0) continue;
        const createdWeek = Number.isFinite(Number(raw.createdWeek)) ? Math.max(0, Math.round(Number(raw.createdWeek))) : 0;
        const rawSettledWeek = raw.settledWeek !== null
            && raw.settledWeek !== undefined
            && Number.isFinite(Number(raw.settledWeek))
                ? Math.round(Number(raw.settledWeek))
                : null;
        const hasValidSettlement = raw.status === 'SETTLED'
            && rawSettledWeek !== null
            && rawSettledWeek >= createdWeek;
        const status = hasValidSettlement ? 'SETTLED' as const : 'HELD' as const;
        const settledWeek = hasValidSettlement ? rawSettledWeek : null;
        const normalized: PlatformAiPendingOneTimeObligation = {
            id,
            category,
            amountMillions,
            createdWeek,
            status,
            settledWeek,
        };
        const existing = byId.get(id);
        if (!existing || normalized.status === 'SETTLED' || existing.status !== 'SETTLED') {
            byId.delete(id);
            byId.set(id, normalized);
        }
    }
    const obligations = Array.from(byId.values());
    const obligationOrder = (
        left: PlatformAiPendingOneTimeObligation,
        right: PlatformAiPendingOneTimeObligation,
    ): number => (
        left.createdWeek - right.createdWeek
        || left.category.localeCompare(right.category)
        || left.id.localeCompare(right.id)
    );
    const settlementOrder = (
        left: PlatformAiPendingOneTimeObligation,
        right: PlatformAiPendingOneTimeObligation,
    ): number => (
        (left.settledWeek ?? left.createdWeek) - (right.settledWeek ?? right.createdWeek)
        || obligationOrder(left, right)
    );
    const held = obligations.filter(obligation => obligation.status === 'HELD').sort(obligationOrder);
    const protectedSettled = obligations.filter(obligation => (
        obligation.status === 'SETTLED' && protectedSettledIds.has(obligation.id)
    )).sort(settlementOrder);
    const retainedIds = new Set(protectedSettled.map(obligation => obligation.id));
    const settled = obligations.filter(obligation => (
        obligation.status === 'SETTLED' && !retainedIds.has(obligation.id)
    )).sort(settlementOrder);
    const settledCapacity = Math.max(
        0,
        ONE_TIME_OBLIGATION_HISTORY_LIMIT - held.length - protectedSettled.length,
    );
    if (settledCapacity === 0) return [...held, ...protectedSettled];
    return [
        ...held,
        ...protectedSettled,
        ...settled.slice(-settledCapacity),
    ];
};

export const getPlatformAiRightsRenewalId = (
    previousLicenseId: string,
    nextStartsAtAbsoluteWeek: number,
): string => createDeterministicId(
    'platform_ai_rights_renewal',
    previousLicenseId,
    nextStartsAtAbsoluteWeek,
);

export const getPlatformAiRightsRenewalObligationId = (
    previousLicenseId: string,
    nextStartsAtAbsoluteWeek: number,
): string => createDeterministicId(
    'platform_ai_rights_renewal_obligation',
    previousLicenseId,
    nextStartsAtAbsoluteWeek,
);

export const getPlatformAiRightsRenewalContractId = (
    previousLicenseId: string,
    nextStartsAtAbsoluteWeek: number,
): string => createDeterministicId(
    'platform_ai_rights_renewal_contract',
    previousLicenseId,
    nextStartsAtAbsoluteWeek,
);

const renewalStatusRank = (status: PlatformAiRightsRenewalRecord['status']): number => (
    status === 'CONTRACTED' ? 2 : status === 'PAYMENT_SETTLED' ? 1 : 0
);

export const normalizePlatformAiRightsRenewals = (
    value: unknown,
    platformId: PlatformId,
    rightsContracts: OwnedStreamingCatalogLicense[],
): PlatformAiRightsRenewalRecord[] => {
    const contractsById = new Map(rightsContracts
        .filter(contract => contract && typeof contract.id === 'string' && contract.id.trim())
        .map(contract => [contract.id.trim(), contract]));
    const byId = new Map<string, PlatformAiRightsRenewalRecord>();
    for (const rawValue of Array.isArray(value) ? value : []) {
        if (!isRecord(rawValue)) continue;
        const previousLicenseId = String(rawValue.previousLicenseId || '').trim();
        const previous = contractsById.get(previousLicenseId);
        if (
            !previous
            || previous.permanentPurchase
            || previous.expiresAtAbsoluteWeek >= Number.MAX_SAFE_INTEGER
        ) continue;
        const platformContentPlanId = String(
            rawValue.platformContentPlanId || previous.platformContentPlanId || '',
        ).trim();
        const sourceProjectId = String(rawValue.sourceProjectId || previous.sourceProjectId || '').trim();
        if (!platformContentPlanId || !sourceProjectId) continue;
        const nextStartsAtAbsoluteWeek = Math.max(0, Math.round(previous.expiresAtAbsoluteWeek + 1));
        if (!Number.isSafeInteger(nextStartsAtAbsoluteWeek)) continue;
        const durationWeeks = Math.max(1, Math.round(
            finiteNonNegative(rawValue.durationWeeks, finiteNonNegative(previous.durationWeeks, 1)),
        ));
        const minimumGuaranteeMillions = finiteNonNegative(
            rawValue.minimumGuaranteeMillions,
            fullCurrencyToMillions(previous.minimumGuarantee),
        );
        if (minimumGuaranteeMillions <= 0) continue;
        const id = getPlatformAiRightsRenewalId(previousLicenseId, nextStartsAtAbsoluteWeek);
        const obligationId = getPlatformAiRightsRenewalObligationId(previousLicenseId, nextStartsAtAbsoluteWeek);
        const renewalLicenseId = getPlatformAiRightsRenewalContractId(previousLicenseId, nextStartsAtAbsoluteWeek);
        const canonicalRenewal = contractsById.get(renewalLicenseId);
        const createdAtAbsoluteWeek = Number.isFinite(Number(rawValue.createdAtAbsoluteWeek))
            ? Math.max(0, Math.min(nextStartsAtAbsoluteWeek, Math.round(Number(rawValue.createdAtAbsoluteWeek))))
            : Math.max(0, previous.expiresAtAbsoluteWeek);
        const paymentSettledAtAbsoluteWeek = rawValue.paymentSettledAtAbsoluteWeek !== null
            && rawValue.paymentSettledAtAbsoluteWeek !== undefined
            && Number.isFinite(Number(rawValue.paymentSettledAtAbsoluteWeek))
            ? Math.max(createdAtAbsoluteWeek, Math.round(Number(rawValue.paymentSettledAtAbsoluteWeek)))
            : null;
        const requestedActivatedAtAbsoluteWeek = rawValue.activatedAtAbsoluteWeek !== null
            && rawValue.activatedAtAbsoluteWeek !== undefined
            && Number.isFinite(Number(rawValue.activatedAtAbsoluteWeek))
            ? Math.max(nextStartsAtAbsoluteWeek, Math.round(Number(rawValue.activatedAtAbsoluteWeek)))
            : null;
        const hasCanonicalContractedRenewal = rawValue.status === 'CONTRACTED'
            && paymentSettledAtAbsoluteWeek !== null
            && requestedActivatedAtAbsoluteWeek !== null
            && canonicalRenewal?.origin === 'RENEWAL'
            && canonicalRenewal.renewedFromLicenseId === previousLicenseId
            && canonicalRenewal.startsAtAbsoluteWeek === nextStartsAtAbsoluteWeek;
        const status = hasCanonicalContractedRenewal
            ? 'CONTRACTED' as const
            : rawValue.status === 'PAYMENT_SETTLED' && paymentSettledAtAbsoluteWeek !== null
                ? 'PAYMENT_SETTLED' as const
                : 'PENDING_PAYMENT' as const;
        const activatedAtAbsoluteWeek = status === 'CONTRACTED'
            ? requestedActivatedAtAbsoluteWeek
            : null;
        const normalized: PlatformAiRightsRenewalRecord = {
            id,
            platformId,
            previousLicenseId,
            sourceProjectId,
            platformContentPlanId,
            nextStartsAtAbsoluteWeek,
            durationWeeks,
            minimumGuaranteeMillions,
            obligationId,
            status,
            paymentSettledAtAbsoluteWeek,
            renewalLicenseId: status === 'CONTRACTED' ? renewalLicenseId : null,
            createdAtAbsoluteWeek,
            activatedAtAbsoluteWeek,
        };
        const existing = byId.get(id);
        if (!existing || renewalStatusRank(normalized.status) >= renewalStatusRank(existing.status)) {
            byId.delete(id);
            byId.set(id, normalized);
        }
    }
    const renewals = Array.from(byId.values());
    const pending = renewals.filter(record => record.status !== 'CONTRACTED');
    const activeContracted = renewals.filter(record => (
        record.status === 'CONTRACTED'
        && record.renewalLicenseId !== null
        && contractsById.get(record.renewalLicenseId)?.status === 'ACTIVE'
    ));
    const activeContractedIds = new Set(activeContracted.map(record => record.id));
    const historicalContracted = renewals.filter(record => (
        record.status === 'CONTRACTED'
        && !activeContractedIds.has(record.id)
    ));
    return [
        ...pending,
        ...activeContracted,
        ...historicalContracted.slice(-RIGHTS_RENEWAL_HISTORY_LIMIT),
    ];
};

export const reconcilePlatformAiRightsRenewalObligations = (
    value: unknown,
    renewals: PlatformAiRightsRenewalRecord[],
    protectedSettledIds: Set<string> = new Set(),
): PlatformAiPendingOneTimeObligation[] => {
    const renewalObligationIds = new Set(renewals.map(record => record.obligationId));
    const lifecycleProtectedSettledIds = new Set([
        ...protectedSettledIds,
        ...renewals
            .filter(record => record.paymentSettledAtAbsoluteWeek !== null)
            .map(record => record.obligationId),
    ]);
    const retained = normalizePlatformAiPendingOneTimeObligations(value, lifecycleProtectedSettledIds).filter(obligation => (
        !obligation.id.startsWith('platform_ai_rights_renewal_obligation_')
        || renewalObligationIds.has(obligation.id)
    ));
    const canonicalRenewalObligations = renewals.map(record => {
        const settled = record.paymentSettledAtAbsoluteWeek !== null;
        return {
            id: record.obligationId,
            category: 'CONTRACTUAL' as const,
            amountMillions: record.minimumGuaranteeMillions,
            createdWeek: record.createdAtAbsoluteWeek,
            status: settled ? 'SETTLED' as const : 'HELD' as const,
            settledWeek: settled
                ? record.paymentSettledAtAbsoluteWeek
                : null,
        };
    });
    return normalizePlatformAiPendingOneTimeObligations([
        ...retained.filter(obligation => !renewalObligationIds.has(obligation.id)),
        ...canonicalRenewalObligations,
    ], lifecycleProtectedSettledIds);
};

export const reconcilePlatformAiRightsRenewalStatuses = (
    renewals: PlatformAiRightsRenewalRecord[],
    obligations: PlatformAiPendingOneTimeObligation[],
): PlatformAiRightsRenewalRecord[] => {
    const obligationsById = new Map(obligations.map(obligation => [obligation.id, obligation]));
    return renewals.map(record => {
        if (record.status === 'CONTRACTED') return record;
        const obligation = obligationsById.get(record.obligationId);
        if (
            record.status === 'PAYMENT_SETTLED'
            && record.paymentSettledAtAbsoluteWeek !== null
            && obligation?.status === 'SETTLED'
            && obligation.settledWeek === record.paymentSettledAtAbsoluteWeek
        ) return record;
        return {
            ...record,
            status: 'PENDING_PAYMENT' as const,
        };
    });
};

export const filterPlatformAiRightsContractsByRenewalState = (
    rightsContracts: OwnedStreamingCatalogLicense[],
    renewals: PlatformAiRightsRenewalRecord[],
): OwnedStreamingCatalogLicense[] => {
    const renewalChainPredecessorIds = new Set(renewals.map(record => record.previousLicenseId));
    const backedRenewalsByContractId = new Map(renewals
        .filter(record => (
            record.status === 'CONTRACTED'
            && record.paymentSettledAtAbsoluteWeek !== null
            && record.renewalLicenseId
            && record.activatedAtAbsoluteWeek !== null
        ))
        .map(record => [record.renewalLicenseId!, record]));
    return rightsContracts.filter(contract => {
        if (contract.origin !== 'RENEWAL') return true;
        if (renewalChainPredecessorIds.has(contract.id)) return true;
        const record = backedRenewalsByContractId.get(contract.id);
        return Boolean(
            record
            && contract.renewedFromLicenseId === record.previousLicenseId
            && contract.sourceProjectId === record.sourceProjectId
            && contract.platformContentPlanId === record.platformContentPlanId
            && contract.startsAtAbsoluteWeek === record.nextStartsAtAbsoluteWeek
        );
    });
};

export const normalizePlatformAiAudienceSettlements = (
    value: unknown,
): PlatformAiAudienceSettlement[] => {
    const byId = new Map<string, PlatformAiAudienceSettlement>();
    for (const rawValue of Array.isArray(value) ? value : []) {
        if (!isRecord(rawValue)) continue;
        const raw = rawValue as Partial<PlatformAiAudienceSettlement>;
        const id = String(raw.id || '').trim();
        const streamingWindowId = String(raw.streamingWindowId || '').trim();
        const projectId = String(raw.projectId || '').trim();
        const planId = String(raw.planId || '').trim();
        const subscriberImpactMillions = Number(raw.subscriberImpactMillions);
        if (!id || !streamingWindowId || !projectId || !planId || !Number.isFinite(subscriberImpactMillions)) continue;
        const createdAtAbsoluteWeek = Number.isFinite(Number(raw.createdAtAbsoluteWeek))
            ? Math.max(0, Math.round(Number(raw.createdAtAbsoluteWeek)))
            : 0;
        const status = raw.status === 'SETTLED' ? 'SETTLED' as const : 'PENDING' as const;
        const settledAtAbsoluteWeek = status === 'SETTLED' && Number.isFinite(Number(raw.settledAtAbsoluteWeek))
            ? Math.max(createdAtAbsoluteWeek, Math.round(Number(raw.settledAtAbsoluteWeek)))
            : null;
        const proposedAcquired = finiteNonNegative(raw.acquiredSubscribersMillions);
        const proposedRetained = finiteNonNegative(raw.retainedSubscribersMillions);
        const proposedChurned = finiteNonNegative(raw.churnedSubscribersMillions);
        const componentsReconcile = Math.abs(
            proposedAcquired + proposedRetained - proposedChurned - subscriberImpactMillions
        ) <= 0.001;
        const acquiredSubscribersMillions = componentsReconcile
            ? proposedAcquired
            : Math.max(0, subscriberImpactMillions);
        const retainedSubscribersMillions = componentsReconcile ? proposedRetained : 0;
        const churnedSubscribersMillions = componentsReconcile
            ? proposedChurned
            : Math.max(0, -subscriberImpactMillions);
        const normalized: PlatformAiAudienceSettlement = {
            id,
            streamingWindowId,
            projectId,
            planId,
            subscriberImpactMillions,
            acquiredSubscribersMillions,
            retainedSubscribersMillions,
            churnedSubscribersMillions,
            engagementIndexDelta: Number.isFinite(Number(raw.engagementIndexDelta))
                ? Math.max(-5, Math.min(8, Number(raw.engagementIndexDelta)))
                : 0,
            catalogueStrengthDelta: Number.isFinite(Number(raw.catalogueStrengthDelta))
                ? Math.max(-2, Math.min(5, Number(raw.catalogueStrengthDelta)))
                : 0,
            status,
            createdAtAbsoluteWeek,
            settledAtAbsoluteWeek,
        };
        const existing = byId.get(id);
        if (!existing || normalized.status === 'SETTLED' || existing.status !== 'SETTLED') {
            byId.delete(id);
            byId.set(id, normalized);
        }
    }
    const settlements = Array.from(byId.values());
    const pending = settlements.filter(settlement => settlement.status === 'PENDING');
    const settled = settlements.filter(settlement => settlement.status === 'SETTLED');
    const settledCapacity = Math.max(0, AUDIENCE_SETTLEMENT_HISTORY_LIMIT - pending.length);
    if (settledCapacity === 0) return pending;
    return [
        ...pending,
        ...settled.slice(-settledCapacity),
    ];
};

export const normalizePlatformAiLocalizationJobs = (
    value: unknown,
    platformId: PlatformId,
    obligations: PlatformAiPendingOneTimeObligation[] = [],
    referencedContentPlanIds: Set<string> = new Set(),
    canonicalPlans: PlatformAiContentPlan[] = [],
    languageCapabilities: PlatformAiRuntimeState['languageCapabilities'] = [],
): PlatformAiLocalizationJob[] => {
    const byLogicalIdentity = new Map<string, PlatformAiLocalizationJob>();
    const obligationsById = new Map(obligations.map(obligation => [obligation.id, obligation]));
    const plansById = new Map(canonicalPlans.map(plan => [plan.id, plan]));
    for (const rawValue of Array.isArray(value) ? value : []) {
        if (!isRecord(rawValue)) continue;
        const raw = rawValue as Partial<PlatformAiLocalizationJob> & Record<string, unknown>;
        const contentPlanId = String(raw.contentPlanId || '').trim();
        const projectId = String(raw.projectId || '').trim();
        const level = raw.level === 'SUBTITLES' || raw.level === 'DUBS_AND_SUBTITLES' || raw.level === 'NONE'
            ? raw.level
            : null;
        const contentOperationsLevelAtPlanning = snapTechnologyLevel(
            'CONTENT_OPERATIONS',
            raw.contentOperationsLevelAtPlanning,
        );
        const createdAtAbsoluteWeek = Number(raw.createdAtAbsoluteWeek);
        if (!contentPlanId || !projectId || !level || !Number.isFinite(createdAtAbsoluteWeek) || createdAtAbsoluteWeek < 0) continue;
        const savedCountryIds = normalizeStreamingDayOneMarketIds(raw.countryIds).sort();
        if (!savedCountryIds.length) continue;
        const canonicalPlan = plansById.get(contentPlanId);
        if (!canonicalPlan) continue;
        const canonicalCountryIds = normalizeStreamingDayOneMarketIds(canonicalPlan.releaseCountryIds).sort();
        const canonicalProjectId = canonicalPlan.source === 'COMMISSIONED_ORIGINAL'
            ? createDeterministicId('platform_ai_project', platformId, canonicalPlan.id)
            : null;
        if (
            canonicalPlan.localizationLevel !== level
            || savedCountryIds.some(countryId => !canonicalCountryIds.includes(countryId))
            || canonicalPlan.source === 'COMMISSIONED_ORIGINAL' && projectId !== canonicalProjectId
            || canonicalPlan.source !== 'COMMISSIONED_ORIGINAL' && !canonicalPlan.sourceProjectIds.includes(projectId)
        ) continue;
        const exactLanguageId = normalizeStreamingLanguageId(raw.languageId);
        const exactMode: PlatformAiLocalizationMode | null = raw.mode === 'SUBTITLE' || raw.mode === 'DUB' ? raw.mode : null;
        const legacy = !exactLanguageId || !exactMode;
        const legacyRequirements = new Map<string, { languageId: string; mode: PlatformAiLocalizationMode; countryIds: string[]; tier: 1 | 2 | 3 }>();
        if (legacy) {
            for (const countryId of savedCountryIds) {
                const country = getStreamingCountryMarketProfile(countryId);
                const languageId = normalizeStreamingLanguageId(country?.languageDistribution
                    .slice()
                    .sort((left, right) => right.audiencePercent - left.audiencePercent)[0]?.language);
                if (!languageId || languageId === 'english') continue;
                const mode: PlatformAiLocalizationMode = level === 'SUBTITLES' ? 'SUBTITLE' : 'DUB';
                const support = resolvePlatformAiLocalizationModeSupport({ languageCapabilities }, languageId, mode);
                if (!support.supported || support.tier === 0) continue;
                const key = `${languageId}:${mode}`;
                const previous = legacyRequirements.get(key);
                legacyRequirements.set(key, {
                    languageId,
                    mode,
                    countryIds: [...new Set([...(previous?.countryIds || []), countryId])].sort(),
                    tier: support.tier as 1 | 2 | 3,
                });
            }
        }
        const exactSupport = exactLanguageId && exactMode
            ? resolvePlatformAiLocalizationModeSupport({ languageCapabilities }, exactLanguageId, exactMode)
            : null;
        const requestedCapabilityTier = Math.round(Number(raw.capabilityTierAtPlanning));
        const exactCapabilityTier = requestedCapabilityTier >= 1 && requestedCapabilityTier <= 3
            ? requestedCapabilityTier as 1 | 2 | 3
            : exactSupport?.tier || 0;
        const candidates = legacy
            ? Array.from(legacyRequirements.values())
            : exactSupport?.supported && exactCapabilityTier > 0 && exactSupport.tier >= exactCapabilityTier
                ? [{
                    languageId: exactLanguageId,
                    mode: exactMode!,
                    countryIds: savedCountryIds,
                    tier: exactCapabilityTier as 1 | 2 | 3,
                }]
                : [];
        const legacyCostTotal = Math.max(0, Number(raw.costMillions) || 0);
        for (const [candidateIndex, candidate] of candidates.entries()) {
            const savedTier = Math.round(Number(raw.capabilityTierAtPlanning) || candidate.tier);
            if (!legacy && savedTier !== candidate.tier) continue;
            const capabilityTier = candidate.tier;
            const quoteVersion: 0 | 1 = legacy || raw.quoteVersion === 0 ? 0 : 1;
            const standardQuote = quotePlatformAiLocalization({
                projectType: canonicalPlan.projectType,
                mode: candidate.mode,
                capabilityTier,
                countryIds: candidate.countryIds,
                controller: 'PLAYER',
            });
            const efficiencySnapshot = quoteVersion === 1
                ? normalizePlatformAiEfficiencySnapshot(
                    raw.efficiencySnapshot,
                    standardQuote.standardCostMillions,
                    standardQuote.standardLeadWeeks,
                    'LOCALIZATION',
                )
                : null;
            if (quoteVersion === 1 && !efficiencySnapshot) continue;
            const costMillions = quoteVersion === 0
                ? Math.round((legacyCostTotal / Math.max(1, candidates.length)) * 1_000_000) / 1_000_000
                : efficiencySnapshot!.appliedCostMillions;
            const leadWeeks = quoteVersion === 0
                ? Math.max(1, Math.round(Number(raw.leadWeeks) || standardQuote.standardLeadWeeks))
                : efficiencySnapshot!.appliedLeadWeeks;
            const qualityForecast = quoteVersion === 0
                ? Math.min(96, (candidate.mode === 'DUB' ? 50 : 56) + capabilityTier * 13)
                : standardQuote.qualityForecast;
            const id = getPlatformAiLocalizationJobId({
                platformId,
                contentPlanId,
                projectId,
                languageId: candidate.languageId,
                mode: candidate.mode,
                countryIds: candidate.countryIds,
                capabilityTier,
                controllerQuoteVersion: quoteVersion,
            });
            const legacyId = getPlatformAiLocalizationJobId(
                platformId, contentPlanId, projectId, level, savedCountryIds, contentOperationsLevelAtPlanning,
            );
            if (!legacy && String(raw.id || '').trim() !== id) continue;
            if (legacy && String(raw.id || '').trim() !== legacyId) continue;
            const obligationId = getPlatformAiLocalizationObligationId(id);
            const legacyObligationId = legacy ? String(raw.obligationId || '').trim() || null : null;
            if (!legacy && String(raw.obligationId || '').trim() !== obligationId) continue;
            const createdWeek = Math.round(createdAtAbsoluteWeek);
            const requestedStartedWeek = raw.startedAtAbsoluteWeek != null && Number.isFinite(Number(raw.startedAtAbsoluteWeek))
                ? Math.max(createdWeek, Math.round(Number(raw.startedAtAbsoluteWeek))) : null;
            const requestedCancelledWeek = raw.cancelledAtAbsoluteWeek != null && Number.isFinite(Number(raw.cancelledAtAbsoluteWeek))
                ? Math.max(createdWeek, Math.round(Number(raw.cancelledAtAbsoluteWeek))) : null;
            const obligation = obligationsById.get(obligationId) || (legacyObligationId ? obligationsById.get(legacyObligationId) : null);
            const validPaidSettlementWeek = obligation?.category === 'LOCALIZATION'
                && obligation.status === 'SETTLED'
                && obligation.settledWeek !== null
                && Number.isFinite(obligation.settledWeek)
                && obligation.settledWeek >= createdWeek
                    ? Math.round(obligation.settledWeek) : null;
            let status: PlatformAiLocalizationJob['status'] = 'WAITING_FOR_FUNDS';
            let startedAtAbsoluteWeek: number | null = null;
            let readyAtAbsoluteWeek: number | null = null;
            let cancelledAtAbsoluteWeek: number | null = null;
            if (raw.status === 'CANCELLED' && requestedCancelledWeek !== null) {
                status = 'CANCELLED';
                cancelledAtAbsoluteWeek = requestedCancelledWeek;
            } else if (validPaidSettlementWeek !== null && (requestedStartedWeek === null || requestedStartedWeek === validPaidSettlementWeek)) {
                startedAtAbsoluteWeek = validPaidSettlementWeek;
                const dueWeek = validPaidSettlementWeek + leadWeeks;
                if (raw.status === 'READY' && Number(raw.readyAtAbsoluteWeek) === dueWeek) {
                    status = 'READY';
                    readyAtAbsoluteWeek = dueWeek;
                } else status = 'IN_PROGRESS';
            }
            const normalized: PlatformAiLocalizationJob = {
                id, platformId, contentPlanId, projectId,
                countryIds: candidate.countryIds,
                level,
                languageId: candidate.languageId,
                mode: candidate.mode,
                capabilityTierAtPlanning: capabilityTier,
                qualityForecast,
                efficiencySnapshot,
                quoteVersion,
                legacyObligationId,
                contentOperationsLevelAtPlanning,
                costMillions,
                leadWeeks,
                obligationId,
                status,
                createdAtAbsoluteWeek: createdWeek,
                startedAtAbsoluteWeek,
                readyAtAbsoluteWeek,
                cancelledAtAbsoluteWeek,
            };
            if (!referencedContentPlanIds.has(contentPlanId) && normalized.status !== 'READY' && normalized.status !== 'CANCELLED') continue;
            const logicalIdentity = `${contentPlanId}\u0000${projectId}\u0000${candidate.languageId}\u0000${candidate.mode}`;
            const existing = byLogicalIdentity.get(logicalIdentity);
            if (!existing || normalized.createdAtAbsoluteWeek < existing.createdAtAbsoluteWeek || normalized.createdAtAbsoluteWeek === existing.createdAtAbsoluteWeek && normalized.id < existing.id) {
                byLogicalIdentity.set(logicalIdentity, normalized);
            }
            void candidateIndex;
        }
    }
    const jobs = Array.from(byLogicalIdentity.values());
    const canonical = jobs.filter(job => (
        referencedContentPlanIds.has(job.contentPlanId)
        && ['WAITING_FOR_FUNDS', 'IN_PROGRESS', 'READY'].includes(job.status)
    ));
    const canonicalIds = new Set(canonical.map(job => job.id));
    const history = jobs
        .filter(job => !canonicalIds.has(job.id))
        .sort((left, right) => {
            const leftTerminalWeek = left.readyAtAbsoluteWeek ?? left.cancelledAtAbsoluteWeek ?? left.createdAtAbsoluteWeek;
            const rightTerminalWeek = right.readyAtAbsoluteWeek ?? right.cancelledAtAbsoluteWeek ?? right.createdAtAbsoluteWeek;
            return leftTerminalWeek - rightTerminalWeek || left.id.localeCompare(right.id);
        })
        .slice(-LOCALIZATION_JOB_HISTORY_LIMIT);
    return [...canonical, ...history];
};

export const reconcilePlatformAiLocalizationObligations = (
    value: unknown,
    jobs: PlatformAiLocalizationJob[],
): PlatformAiPendingOneTimeObligation[] => {
    const livePaidJobs = jobs.filter(job => job.status !== 'CANCELLED' && job.costMillions > 0);
    const protectedIds = new Set(livePaidJobs.map(job => job.obligationId));
    const normalized = normalizePlatformAiPendingOneTimeObligations(value, protectedIds);
    const byId = new Map(normalized.map(obligation => [obligation.id, obligation]));
    const retained = normalized.filter(obligation => (
        !obligation.id.startsWith('platform_ai_localization_obligation_')
    ));
    const canonical = livePaidJobs.map(job => {
        const existing = byId.get(job.obligationId);
        const jobSettlementWeek = job.status !== 'WAITING_FOR_FUNDS'
            && job.startedAtAbsoluteWeek !== null
            && Number.isFinite(job.startedAtAbsoluteWeek)
            && job.startedAtAbsoluteWeek >= job.createdAtAbsoluteWeek
                ? Math.round(job.startedAtAbsoluteWeek)
                : null;
        if (
            existing?.category === 'LOCALIZATION'
            && existing.amountMillions === job.costMillions
            && existing.createdWeek === job.createdAtAbsoluteWeek
            && (
                existing.status === 'HELD' && jobSettlementWeek === null
                || existing.status === 'SETTLED'
                    && existing.settledWeek !== null
                    && Number.isFinite(existing.settledWeek)
                    && existing.settledWeek >= existing.createdWeek
            )
        ) return existing;
        if (jobSettlementWeek !== null) return {
            id: job.obligationId,
            category: 'LOCALIZATION' as const,
            amountMillions: job.costMillions,
            createdWeek: job.createdAtAbsoluteWeek,
            status: 'SETTLED' as const,
            settledWeek: jobSettlementWeek,
        };
        const legacy = job.legacyObligationId ? byId.get(job.legacyObligationId) : null;
        if (
            legacy?.category === 'LOCALIZATION'
            && legacy.createdWeek === job.createdAtAbsoluteWeek
            && (
                legacy.status === 'HELD'
                || legacy.status === 'SETTLED'
                    && legacy.settledWeek !== null
                    && Number.isFinite(legacy.settledWeek)
                    && legacy.settledWeek >= legacy.createdWeek
            )
        ) return {
            id: job.obligationId,
            category: 'LOCALIZATION' as const,
            amountMillions: job.costMillions,
            createdWeek: job.createdAtAbsoluteWeek,
            status: legacy.status,
            settledWeek: legacy.status === 'SETTLED' ? legacy.settledWeek : null,
        };
        return {
            id: job.obligationId,
            category: 'LOCALIZATION' as const,
            amountMillions: job.costMillions,
            createdWeek: job.createdAtAbsoluteWeek,
            status: 'HELD' as const,
            settledWeek: null,
        };
    });
    return normalizePlatformAiPendingOneTimeObligations([...retained, ...canonical], protectedIds);
};

const normalizeFinanceHistory = (value: unknown, fallbackDebtMillions: number): PlatformAiFinanceSnapshot[] => (
    (Array.isArray(value) ? value : []).flatMap(rawValue => {
        if (!isRecord(rawValue)) return [];
        const raw = rawValue as Partial<PlatformAiFinanceSnapshot> & { contractIncomeMillions?: number };
        const absoluteWeek = Number(raw.absoluteWeek);
        if (!Number.isFinite(absoluteWeek)) return [];
        const revenueMillions = finiteNonNegative(raw.revenueMillions);
        const subscriptionRevenueMillions = finiteNonNegative(raw.subscriptionRevenueMillions, revenueMillions);
        const advertisingRevenueMillions = finiteNonNegative(raw.advertisingRevenueMillions);
        const verifiedContractIncomeMillions = finiteNonNegative(
            raw.verifiedContractIncomeMillions ?? raw.contractIncomeMillions,
            Math.max(0, revenueMillions - subscriptionRevenueMillions - advertisingRevenueMillions),
        );
        const rescueIncomeMillions = finiteNonNegative(raw.rescueIncomeMillions);
        const rescueDebtReductionMillions = finiteNonNegative(raw.rescueDebtReductionMillions);
        const externalInvestmentIncomeMillions = finiteNonNegative(raw.externalInvestmentIncomeMillions);
        const externalInvestmentDebtReductionMillions = finiteNonNegative(raw.externalInvestmentDebtReductionMillions);
        const externalInvestmentArrearsReductionMillions = finiteNonNegative(raw.externalInvestmentArrearsReductionMillions);
        const operatingCostMillions = finiteNonNegative(raw.operatingCostMillions);
        const mandatoryCostAccruedMillions = finiteNonNegative(raw.mandatoryCostAccruedMillions, operatingCostMillions);
        const mandatoryCostMillions = finiteNonNegative(raw.mandatoryCostMillions, mandatoryCostAccruedMillions);
        const settledObligationAccruedMillions = finiteNonNegative(raw.settledObligationAccruedMillions);
        const settledObligationCostMillions = finiteNonNegative(raw.settledObligationCostMillions, settledObligationAccruedMillions);
        const contractualCostAccruedMillions = finiteNonNegative(raw.contractualCostAccruedMillions, settledObligationAccruedMillions);
        const contractualCostMillions = finiteNonNegative(raw.contractualCostMillions, settledObligationCostMillions);
        const localizationCostAccruedMillions = finiteNonNegative(raw.localizationCostAccruedMillions, raw.localizationCostMillions);
        const discretionaryCostAccruedMillions = finiteNonNegative(raw.discretionaryCostAccruedMillions);
        const discretionaryCostMillions = finiteNonNegative(raw.discretionaryCostMillions);
        const financingCostAccruedMillions = finiteNonNegative(raw.financingCostAccruedMillions, raw.financingCostMillions);
        const financingCostMillions = finiteNonNegative(raw.financingCostMillions, financingCostAccruedMillions);
        const allocations: PlatformAiReserveAllocation[] = (Array.isArray(raw.allocations) ? raw.allocations : []).flatMap(item => (
            item && RESERVE_ALLOCATION_TYPES.has(item.type) && finiteNonNegative(item.amountMillions) > 0
                ? [{ type: item.type, amountMillions: finiteNonNegative(item.amountMillions), referenceId: item.referenceId || null }]
                : []
        ));
        const platformTradeRoyaltyAllocations: PlatformAiTradeRoyaltyAllocation[] = (
            Array.isArray(raw.platformTradeRoyaltyAllocations) ? raw.platformTradeRoyaltyAllocations : []
        ).flatMap(item => {
            if (!isRecord(item)) return [];
            const contractId = String(item.contractId || '').trim();
            const sellerPlatformId = String(item.sellerPlatformId || '') as PlatformId;
            const amountMillions = finiteNonNegative(item.amountMillions);
            return contractId
                && Object.prototype.hasOwnProperty.call(PLATFORM_AI_PROFILES, sellerPlatformId)
                && amountMillions > 0
                ? [{ contractId, sellerPlatformId, amountMillions }]
                : [];
        });
        const reserveAllocationMillions = finiteNonNegative(
            raw.reserveAllocationMillions,
            allocations.reduce((sum, allocation) => sum + allocation.amountMillions, 0),
        );
        const closingCashMillions = finiteNonNegative(raw.closingCashMillions);
        const netCashFlowMillions = Number.isFinite(Number(raw.netCashFlowMillions)) ? Number(raw.netCashFlowMillions) : 0;
        const openingCashMillions = finiteNonNegative(
            raw.openingCashMillions,
            Math.max(0, closingCashMillions - netCashFlowMillions),
        );
        const lossSource = raw.lossRunwayWeeks !== undefined ? raw.lossRunwayWeeks : raw.runwayWeeks;
        const numericLoss = Number(lossSource);
        const lossRunwayWeeks = lossSource === null || !Number.isFinite(numericLoss) || numericLoss >= 5_200
            ? null
            : Math.max(0, numericLoss);
        return [{
            absoluteWeek: Math.round(absoluteWeek),
            openingCashMillions,
            subscriptionRevenueMillions,
            advertisingRevenueMillions,
            verifiedContractIncomeMillions,
            rescueIncomeMillions,
            rescueDebtReductionMillions,
            externalInvestmentIncomeMillions,
            externalInvestmentDebtReductionMillions,
            externalInvestmentArrearsReductionMillions,
            revenueMillions,
            deliveryCostMillions: finiteNonNegative(raw.deliveryCostMillions),
            baseOperationsCostMillions: finiteNonNegative(raw.baseOperationsCostMillions),
            marketOperatingCostMillions: finiteNonNegative(raw.marketOperatingCostMillions),
            marketPolicyCostMillions: finiteNonNegative(raw.marketPolicyCostMillions),
            partnerRevenueShareCostMillions: finiteNonNegative(raw.partnerRevenueShareCostMillions),
            administrationCostMillions: finiteNonNegative(raw.administrationCostMillions),
            recurringEfficiency: {
                controller: raw.recurringEfficiency?.controller === 'PLAYER' ? 'PLAYER' as const : 'AI' as const,
                policyVersion: Math.max(1, normalizeNonNegativeInteger(raw.recurringEfficiency?.policyVersion, 1)),
                costMultiplier: Math.max(0.88, Math.min(1, Number(raw.recurringEfficiency?.costMultiplier) || 1)),
                standardEligibleCostMillions: finiteNonNegative(raw.recurringEfficiency?.standardEligibleCostMillions),
                appliedEligibleCostMillions: finiteNonNegative(raw.recurringEfficiency?.appliedEligibleCostMillions),
                savingMillions: finiteNonNegative(raw.recurringEfficiency?.savingMillions),
            },
            platformTradeRoyaltyAllocations,
            contentCostMillions: finiteNonNegative(raw.contentCostMillions),
            researchCostMillions: finiteNonNegative(raw.researchCostMillions),
            technologyCostMillions: finiteNonNegative(raw.technologyCostMillions),
            localizationCostMillions: finiteNonNegative(raw.localizationCostMillions),
            contractualCostAccruedMillions,
            contractualCostMillions,
            localizationCostAccruedMillions,
            discretionaryCostAccruedMillions,
            discretionaryCostMillions,
            heldObligations: (Array.isArray(raw.heldObligations) ? raw.heldObligations : []).flatMap(item => {
                const held = item as { expenseClass?: string; amountMillions?: number; status?: string };
                return ['CONTRACTUAL', 'LOCALIZATION', 'DISCRETIONARY'].includes(String(held.expenseClass))
                    && held.status === 'ON_HOLD'
                    && finiteNonNegative(held.amountMillions) > 0
                    ? [{ expenseClass: held.expenseClass as 'CONTRACTUAL' | 'LOCALIZATION' | 'DISCRETIONARY', amountMillions: finiteNonNegative(held.amountMillions), status: 'ON_HOLD' as const }]
                    : [];
            }),
            mandatoryCostAccruedMillions,
            mandatoryCostMillions,
            settledObligationAccruedMillions,
            settledObligationCostMillions,
            financingCostAccruedMillions,
            financingCostMillions,
            unfundedMandatoryCostMillions: finiteNonNegative(raw.unfundedMandatoryCostMillions),
            unfundedSettledObligationCostMillions: finiteNonNegative(raw.unfundedSettledObligationCostMillions),
            unfundedFinancingCostMillions: finiteNonNegative(raw.unfundedFinancingCostMillions),
            operatingCostMillions,
            operatingNetCashFlowMillions: Number.isFinite(Number(raw.operatingNetCashFlowMillions))
                ? Number(raw.operatingNetCashFlowMillions)
                : revenueMillions - operatingCostMillions,
            debtIncurredMillions: finiteNonNegative(raw.debtIncurredMillions),
            reserveAllocationMillions,
            allocations,
            netCashFlowMillions,
            closingCashMillions,
            closingDebtMillions: finiteNonNegative(raw.closingDebtMillions, fallbackDebtMillions),
            reserveTargetMillions: finiteNonNegative(raw.reserveTargetMillions),
            reserveCoverageWeeks: finiteNonNegative(raw.reserveCoverageWeeks, operatingCostMillions > 0 ? closingCashMillions / operatingCostMillions : 5_200),
            lossRunwayWeeks,
            runwayWeeks: lossRunwayWeeks,
        }];
    }).slice(-104)
);
const technologyTargetsFor = (branch: StreamingTechnologyBranch): number[] => STREAMING_TECHNOLOGY_DEFINITIONS
    .filter(definition => definition.branch === branch)
    .map(definition => definition.targetLevel)
    .sort((left, right) => left - right);

const snapTechnologyLevel = (branch: StreamingTechnologyBranch, value: unknown): number => {
    const numeric = Math.max(0, Math.min(75, Number(value) || 0));
    return technologyTargetsFor(branch).filter(target => target <= numeric).at(-1) ?? 0;
};

const emptyTechnologyLevels = (): Record<StreamingTechnologyBranch, number> => ({
    DELIVERY_CAPACITY: 0,
    PLAYBACK_QUALITY: 0,
    RELIABILITY: 0,
    DATA_RECOMMENDATIONS: 0,
    SECURITY: 0,
    CONTENT_OPERATIONS: 0,
    ADVERTISING_COMMERCE: 0,
    PRODUCT_EXPERIENCE: 0,
});

const buildStartingCapabilities = (platform: PlatformState): PlatformAiCapabilities => {
    const technologyLevels = emptyTechnologyLevels();
    for (const branch of ['DELIVERY_CAPACITY', 'RELIABILITY', 'DATA_RECOMMENDATIONS', 'CONTENT_OPERATIONS'] as StreamingTechnologyCampusBranch[]) {
        technologyLevels[branch] = technologyTargetsFor(branch)[0] ?? 0;
    }
    return {
        activeCountryIds: normalizeStreamingDayOneMarketIds(
            getPlatformAiOperatingProfile(platform.id).startingCountryIds,
        ),
        technologyLevels,
        ...getPlatformAiLocalizationCoverageFromContentOperations(technologyLevels.CONTENT_OPERATIONS),
    };
};

export const getPlatformAiLocalizationCoverageFromContentOperations = (level: number): Pick<PlatformAiCapabilities, 'subtitleCoveragePercent' | 'dubCoveragePercent'> => ({
    subtitleCoveragePercent: level >= 22 ? clampPercent(35 + (level - 22) * 2) : 0,
    dubCoveragePercent: level >= 40 ? clampPercent(20 + (level - 40) * 2) : 0,
});

const countriesFromLegacyRegions = (platformId: PlatformId, value: unknown): string[] => {
    const startingCountryIds = getPlatformAiOperatingProfile(platformId).startingCountryIds;
    const regions = new Set((Array.isArray(value) ? value : []).map(item => {
        const id = String(item || '').trim().toUpperCase();
        return id === 'MIDDLE_EAST_AND_AFRICA' || id === 'MIDDLE_EAST_AFRICA' ? 'AFRICA' : id;
    }));
    if (!regions.size) return normalizeStreamingDayOneMarketIds(startingCountryIds);
    const preferred = startingCountryIds.filter(countryId => {
        const market = STREAMING_DAY_ONE_MARKETS.find(item => item.id === countryId);
        return Boolean(market && regions.has(market.regionId));
    });
    const fallback = STREAMING_DAY_ONE_MARKETS.filter(market => regions.has(market.regionId)).map(market => market.id);
    return normalizeStreamingDayOneMarketIds(preferred.length ? preferred : fallback);
};

const buildTechnologyLevels = (
    capabilities: Record<string, unknown> | undefined,
    starting: PlatformAiCapabilities,
): Record<StreamingTechnologyBranch, number> => {
    const source = capabilities?.technologyLevels as Partial<Record<StreamingTechnologyBranch, number>> | undefined;
    if (source) {
        return Object.fromEntries(TECHNOLOGY_BRANCHES.map(branch => [branch, snapTechnologyLevel(branch, source[branch])])) as Record<StreamingTechnologyBranch, number>;
    }
    const legacyByBranch: Partial<Record<StreamingTechnologyBranch, unknown>> = {
        DELIVERY_CAPACITY: capabilities?.deliveryLevel,
        PLAYBACK_QUALITY: capabilities?.playbackLevel,
        RELIABILITY: capabilities?.reliabilityLevel,
        DATA_RECOMMENDATIONS: capabilities?.recommendationLevel,
        SECURITY: capabilities?.securityLevel,
        CONTENT_OPERATIONS: capabilities?.contentOperationsLevel,
    };
    const hasLegacyLevels = Object.values(legacyByBranch).some(value => value !== undefined);
    if (!hasLegacyLevels) return { ...starting.technologyLevels };
    return Object.fromEntries(TECHNOLOGY_BRANCHES.map(branch => [
        branch,
        snapTechnologyLevel(branch, (Number(legacyByBranch[branch]) || 0) * 7.5),
    ])) as Record<StreamingTechnologyBranch, number>;
};

const LEGACY_RESEARCH_MAP: Record<string, string> = {
    PLAYBACK: 'adaptive-startup',
    DELIVERY: 'edge-orchestration',
    SECURITY: 'zero-trust-sessions',
};

const normalizeWeekAtOrBefore = (
    value: unknown,
    absoluteWeek: number,
    fallback: number,
): number => {
    const numeric = Number(value);
    return Number.isFinite(numeric)
        ? Math.min(absoluteWeek, Math.max(0, Math.round(numeric)))
        : fallback;
};

const normalizeProcessedCheckpoint = (
    value: unknown,
    absoluteWeek: number,
    fallback: number,
): number => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    const rounded = Math.round(numeric);
    return rounded > absoluteWeek
        ? Math.max(-1, absoluteWeek - 1)
        : Math.max(-1, rounded);
};

const normalizeResearchQueue = (
    value: unknown,
    platformId: PlatformId,
    absoluteWeek: number,
): PlatformAiResearchItem[] => (Array.isArray(value) ? value : []).flatMap((rawValue): PlatformAiResearchItem[] => {
    if (!isRecord(rawValue)) return [];
    const raw = rawValue as Partial<PlatformAiResearchItem> & Record<string, unknown>;
    const researchDefinitionId = String(raw.researchDefinitionId || LEGACY_RESEARCH_MAP[String(raw.branch || '')] || '');
    const researchDefinition = STREAMING_RESEARCH_DEFINITIONS.find(definition => definition.id === researchDefinitionId);
    const technologyDefinition = STREAMING_TECHNOLOGY_DEFINITIONS.find(definition => (
        definition.id === raw.technologyDefinitionId || definition.id === researchDefinition?.mappedTechnologyId
    ));
    if (!researchDefinition || !technologyDefinition) return [];
    const buildMode = raw.buildMode === 'HARDENED' || raw.buildMode === 'SPRINT' ? raw.buildMode : 'BALANCED';
    const researchPreview = previewStreamingResearchProgram(researchDefinition, buildMode);
    const technologyPreview = previewStreamingTechnologyProject(technologyDefinition, buildMode);
    const standardResearchCostMillions = fullCurrencyToMillions(researchPreview.researchCost);
    const standardInstallationCostMillions = fullCurrencyToMillions(technologyPreview.capitalCost);
    const efficiencySnapshot = normalizePlatformAiEfficiencySnapshot(
        raw.efficiencySnapshot,
        standardResearchCostMillions,
        researchPreview.researchWeeks + researchPreview.prototypeWeeks + researchPreview.testWeeks,
        'RESEARCH',
    );
    const installationEfficiencySnapshot = normalizePlatformAiEfficiencySnapshot(
        raw.installationEfficiencySnapshot,
        standardInstallationCostMillions,
        technologyPreview.constructionWeeks,
        'INSTALLATION',
    );
    const researchDurations = [
        researchPreview.researchWeeks,
        researchPreview.prototypeWeeks,
        researchPreview.testWeeks,
    ];
    let researchReduction = Math.max(
        0,
        researchDurations.reduce((sum, weeks) => sum + weeks, 0)
            - (efficiencySnapshot?.appliedLeadWeeks ?? researchDurations.reduce((sum, weeks) => sum + weeks, 0)),
    );
    for (let index = 0; index < researchDurations.length && researchReduction > 0; index += 1) {
        const applied = Math.min(Math.max(0, researchDurations[index] - 1), researchReduction);
        researchDurations[index] -= applied;
        researchReduction -= applied;
    }
    const [researchWeeks, prototypeWeeks, testWeeks] = researchDurations;
    const installationWeeks = installationEfficiencySnapshot?.appliedLeadWeeks
        ?? technologyPreview.constructionWeeks;
    const startedAtAbsoluteWeek = normalizeWeekAtOrBefore(raw.startedAtAbsoluteWeek, absoluteWeek, absoluteWeek);
    const stage = ['RESEARCHING', 'PROTOTYPING', 'TESTING', 'AWAITING_IP', 'READY_TO_INSTALL', 'INSTALLING', 'OPERATING'].includes(String(raw.stage))
        ? raw.stage as PlatformAiResearchItem['stage']
        : 'RESEARCHING';
    const ipStrategy = raw.ipStrategy === 'LICENSE' ? 'LICENSE' : 'PATENT';
    const idempotencyKey = String(raw.idempotencyKey || `platform-ai-research:${platformId}:${researchDefinition.id}`);
    const stageStartedAtAbsoluteWeek = normalizeWeekAtOrBefore(
        raw.stageStartedAtAbsoluteWeek,
        absoluteWeek,
        startedAtAbsoluteWeek,
    );
    const stageDurationWeeks = stage === 'RESEARCHING'
        ? researchWeeks
        : stage === 'PROTOTYPING'
            ? prototypeWeeks
            : stage === 'TESTING'
                ? testWeeks
                : stage === 'INSTALLING'
                    ? installationWeeks
                    : 0;
    const maximumStageReadyAtAbsoluteWeek = stageStartedAtAbsoluteWeek + stageDurationWeeks;
    const rawStageReadyAtAbsoluteWeek = Number(raw.stageReadyAtAbsoluteWeek ?? raw.readyAtAbsoluteWeek);
    const stageReadyAtAbsoluteWeek = Number.isFinite(rawStageReadyAtAbsoluteWeek)
        ? Math.max(
            stageStartedAtAbsoluteWeek,
            Math.min(maximumStageReadyAtAbsoluteWeek, Math.round(rawStageReadyAtAbsoluteWeek)),
        )
        : maximumStageReadyAtAbsoluteWeek;
    return [{
        id: String(raw.id || createDeterministicId('platform_ai_research', platformId, researchDefinition.id)),
        idempotencyKey,
        researchDefinitionId: researchDefinition.id,
        technologyDefinitionId: technologyDefinition.id,
        branch: technologyDefinition.branch,
        targetLevel: technologyDefinition.targetLevel,
        buildMode,
        stage,
        ipStrategy,
        researchCostMillions: efficiencySnapshot?.appliedCostMillions ?? standardResearchCostMillions,
        ipCostMillions: Number.isFinite(Number(raw.ipCostMillions))
            ? Math.max(0, Number(raw.ipCostMillions))
            : fullCurrencyToMillions(ipStrategy === 'PATENT' ? researchPreview.patentCost : researchPreview.licenseIpCost),
        installationCostMillions: installationEfficiencySnapshot?.appliedCostMillions
            ?? (Number.isFinite(Number(raw.installationCostMillions))
                ? Math.max(0, Number(raw.installationCostMillions))
                : standardInstallationCostMillions),
        researchWeeklyOperatingCostMillions: Number.isFinite(Number(raw.researchWeeklyOperatingCostMillions))
            ? Math.max(0, Number(raw.researchWeeklyOperatingCostMillions))
            : fullCurrencyToMillions(researchPreview.weeklyOperatingCost),
        licenseWeeklyCostMillions: ipStrategy === 'LICENSE'
            ? Number.isFinite(Number(raw.licenseWeeklyCostMillions))
                ? Math.max(0, Number(raw.licenseWeeklyCostMillions))
                : fullCurrencyToMillions(researchPreview.licenseWeeklyCost)
            : 0,
        technologyWeeklyOperatingCostMillions: Number.isFinite(Number(raw.technologyWeeklyOperatingCostMillions))
            ? Math.max(0, Number(raw.technologyWeeklyOperatingCostMillions))
            : fullCurrencyToMillions(technologyPreview.weeklyOperatingCostDelta),
        efficiencySnapshot,
        installationEfficiencySnapshot,
        researchWeeks,
        prototypeWeeks,
        testWeeks,
        installationWeeks,
        startedAtAbsoluteWeek,
        stageStartedAtAbsoluteWeek,
        stageReadyAtAbsoluteWeek,
        completedAtAbsoluteWeek: stage === 'OPERATING'
            ? normalizeWeekAtOrBefore(raw.completedAtAbsoluteWeek, absoluteWeek, stageStartedAtAbsoluteWeek)
            : null,
        lastProcessedAbsoluteWeek: normalizeProcessedCheckpoint(
            raw.lastProcessedAbsoluteWeek,
            absoluteWeek,
            stageStartedAtAbsoluteWeek,
        ),
    }];
});

const buildHistoricalResearchQueue = (
    platformId: PlatformId,
    absoluteWeek: number,
): PlatformAiResearchItem[] => normalizeResearchQueue(
    getPlatformAiOperatingProfile(platformId).historicalResearchDefinitionIds.map(researchDefinitionId => ({
        id: createDeterministicId('platform_ai_research', platformId, researchDefinitionId),
        idempotencyKey: `platform-ai-research:${platformId}:${researchDefinitionId}`,
        researchDefinitionId,
        buildMode: 'BALANCED',
        stage: 'OPERATING',
        ipStrategy: 'PATENT',
        startedAtAbsoluteWeek: 0,
        stageStartedAtAbsoluteWeek: 0,
        stageReadyAtAbsoluteWeek: 0,
        completedAtAbsoluteWeek: 0,
        lastProcessedAbsoluteWeek: Math.max(-1, absoluteWeek - 1),
    })),
    platformId,
    absoluteWeek,
);

const mergeHistoricalResearchQueue = (
    value: unknown,
    platformId: PlatformId,
    absoluteWeek: number,
    applyOperatingProfile: boolean,
): PlatformAiResearchItem[] => {
    const saved = normalizeResearchQueue(
        (Array.isArray(value) ? value : []).filter(item => isRecord(item) && hasOnlyFiniteNumbers(item)),
        platformId,
        absoluteWeek,
    );
    if (!applyOperatingProfile) return saved;
    const savedResearchIds = new Set(saved.map(item => item.researchDefinitionId));
    return [
        ...saved,
        ...buildHistoricalResearchQueue(platformId, absoluteWeek)
            .filter(item => !savedResearchIds.has(item.researchDefinitionId)),
    ];
};

const normalizeLanguageCapabilities = (
    value: unknown,
    platformId: PlatformId,
    absoluteWeek: number,
    applyOperatingProfile: boolean,
): PlatformAiLanguageCapability[] => {
    const byLanguageId = new Map<string, PlatformAiLanguageCapability>();
    const sourceCapabilities = Array.isArray(value) ? value : [];
    const profileCapabilities = applyOperatingProfile
        ? getPlatformAiOperatingProfile(platformId).startingLanguageCapabilities
        : [];
    for (const rawValue of [...sourceCapabilities, ...profileCapabilities]) {
        if (!isRecord(rawValue)) continue;
        const languageId = normalizeStreamingLanguageId(rawValue.languageId);
        if (!languageId || !isKnownStreamingLanguageId(languageId) || byLanguageId.has(languageId)) continue;
        const source = rawValue.source === 'LANGUAGE_PACKAGE' || rawValue.source === 'PLAYER_HANDOFF'
            ? rawValue.source
            : 'HISTORICAL_PROFILE';
        byLanguageId.set(languageId, {
            languageId,
            subtitleLevel: Math.max(0, Math.min(3, Math.round(Number(rawValue.subtitleLevel) || 0))) as 0 | 1 | 2 | 3,
            dubbingLevel: Math.max(0, Math.min(3, Math.round(Number(rawValue.dubbingLevel) || 0))) as 0 | 1 | 2 | 3,
            source,
            sourceReferenceId: String(
                rawValue.sourceReferenceId
                || `platform-ai-operating-profile:${platformId}:v${getPlatformAiOperatingProfile(platformId).version}`,
            ).trim(),
            activatedAtAbsoluteWeek: normalizeWeekAtOrBefore(
                rawValue.activatedAtAbsoluteWeek,
                absoluteWeek,
                0,
            ),
        });
    }
    return Array.from(byLanguageId.values());
};

const applyOperatingResearchLevels = (
    technologyLevels: Record<StreamingTechnologyBranch, number>,
    researchQueue: PlatformAiResearchItem[],
): Record<StreamingTechnologyBranch, number> => {
    const next = { ...technologyLevels };
    for (const item of researchQueue) {
        if (item.stage !== 'OPERATING') continue;
        next[item.branch] = Math.max(next[item.branch], item.targetLevel);
    }
    return next;
};

const localizationRank: Record<PlatformAiLocalizationLevel, number> = { NONE: 0, SUBTITLES: 1, DUBS_AND_SUBTITLES: 2 };
const resolvedLocalization = (capabilities: PlatformAiCapabilities): PlatformAiLocalizationLevel => (
    capabilities.subtitleCoveragePercent < 35
        ? 'NONE'
        : capabilities.dubCoveragePercent < 20
            ? 'SUBTITLES'
            : 'DUBS_AND_SUBTITLES'
);
const clampLocalization = (requested: unknown, capabilities: PlatformAiCapabilities): PlatformAiLocalizationLevel => {
    const normalized = requested === 'DUBS_AND_SUBTITLES' || requested === 'SUBTITLES' ? requested : 'NONE';
    const supported = resolvedLocalization(capabilities);
    return localizationRank[normalized] <= localizationRank[supported] ? normalized : supported;
};

const RELEASE_PATTERNS = new Set<PlatformAiReleasePattern>([
    'MOVIE_SINGLE_PREMIERE',
    'SERIES_FULL_SEASON',
    'SERIES_WEEKLY',
    'SERIES_SPLIT_VOLUME',
]);

const normalizeReleaseEntries = (value: unknown): PlatformAiReleaseEntry[] => {
    const byId = new Map<string, PlatformAiReleaseEntry>();
    for (const rawValue of Array.isArray(value) ? value : []) {
        const raw = rawValue as Partial<PlatformAiReleaseEntry>;
        const id = String(raw.id || '').trim();
        const canonicalProjectId = String(raw.canonicalProjectId || raw.sourceProjectId || '').trim();
        const releasePattern = RELEASE_PATTERNS.has(raw.releasePattern as PlatformAiReleasePattern)
            ? raw.releasePattern as PlatformAiReleasePattern
            : null;
        const premiereAtAbsoluteWeek = Math.max(0, Math.round(Number(raw.premiereAtAbsoluteWeek) || 0));
        if (!id || !canonicalProjectId || !releasePattern || premiereAtAbsoluteWeek <= 0) continue;
        byId.set(id, {
            id,
            sourceProjectId: typeof raw.sourceProjectId === 'string' && raw.sourceProjectId ? raw.sourceProjectId : null,
            canonicalProjectId,
            rightsContractId: typeof raw.rightsContractId === 'string' && raw.rightsContractId ? raw.rightsContractId : null,
            premiereAtAbsoluteWeek,
            localizationReadyAtAbsoluteWeek: Math.max(0, Math.round(Number(raw.localizationReadyAtAbsoluteWeek) || premiereAtAbsoluteWeek)),
            countryIds: normalizeStreamingDayOneMarketIds(raw.countryIds),
            releasePattern,
            installmentAbsoluteWeeks: [...new Set((Array.isArray(raw.installmentAbsoluteWeeks) ? raw.installmentAbsoluteWeeks : [premiereAtAbsoluteWeek])
                .map(week => Math.max(premiereAtAbsoluteWeek, Math.round(Number(week) || premiereAtAbsoluteWeek))))].sort((left, right) => left - right),
            status: raw.status === 'RELEASED' ? 'RELEASED' : 'SCHEDULED',
            releasedAtAbsoluteWeek: raw.releasedAtAbsoluteWeek == null ? null : Math.max(premiereAtAbsoluteWeek, Math.round(Number(raw.releasedAtAbsoluteWeek) || premiereAtAbsoluteWeek)),
            streamingWindowId: typeof raw.streamingWindowId === 'string' && raw.streamingWindowId ? raw.streamingWindowId : null,
        });
    }
    return Array.from(byId.values());
};

const normalizeReleaseReadiness = (
    value: unknown,
    releaseEntries: PlatformAiReleaseEntry[],
    plan: PlatformAiContentPlan,
    absoluteWeek: number,
): PlatformAiReleaseReadinessSnapshot | null => {
    if (!releaseEntries.length || !['SCHEDULED', 'RELEASED'].includes(plan.status)) return null;
    const raw = isRecord(value) ? value : {};
    const premiereAtAbsoluteWeek = Math.min(...releaseEntries.map(entry => entry.premiereAtAbsoluteWeek));
    const latestRequiredAbsoluteWeek = Math.max(
        premiereAtAbsoluteWeek,
        ...releaseEntries.flatMap(entry => entry.installmentAbsoluteWeeks),
    );
    const localizationReadyAtAbsoluteWeek = Math.max(
        0,
        ...releaseEntries.map(entry => entry.localizationReadyAtAbsoluteWeek),
    );
    const allowedSelectionReasons = new Set<PlatformAiPremiereSelectionReason>([
        'EARLY_AVAILABILITY',
        'RIGHTS_EXPIRY_URGENCY',
        'LOW_CONGESTION',
        'AVOID_SELF_CANNIBALIZATION',
        'AWARDS_POSITIONING',
    ]);
    return {
        evaluatedAtAbsoluteWeek: Math.max(0, Math.round(Number(raw.evaluatedAtAbsoluteWeek)
            || Number(plan.scheduledAtAbsoluteWeek)
            || absoluteWeek)),
        premiereAtAbsoluteWeek,
        latestRequiredAbsoluteWeek,
        ready: true,
        blockers: [],
        canonicalProjectIds: [...new Set(releaseEntries.map(entry => entry.canonicalProjectId))].sort(),
        rightsContractIds: [...new Set(releaseEntries.flatMap(entry => entry.rightsContractId ? [entry.rightsContractId] : []))].sort(),
        countryIds: [...new Set(releaseEntries.flatMap(entry => entry.countryIds))].sort(),
        localizationReadyAtAbsoluteWeek,
        scheduledTitleCount: Math.max(releaseEntries.length, Math.round(Number(raw.scheduledTitleCount) || 0)),
        releaseCapacity: Math.max(releaseEntries.length, Math.round(Number(raw.releaseCapacity) || 0)),
        selectionScore: Number.isFinite(Number(raw.selectionScore)) ? Number(raw.selectionScore) : null,
        selectionReasons: [...new Set((Array.isArray(raw.selectionReasons) ? raw.selectionReasons : [])
            .filter((reason): reason is PlatformAiPremiereSelectionReason => allowedSelectionReasons.has(reason as PlatformAiPremiereSelectionReason)))],
    };
};

const PLATFORM_AI_CONTENT_SOURCES = new Set([
    'COMMISSIONED_ORIGINAL',
    'LICENSED_RELEASED_TITLE',
    'OWNED_STUDIO_TRANSFER',
    'CATALOGUE_ACQUISITION',
]);
const PLATFORM_AI_PLAN_STATUSES = new Set([
    'SCOUTED', 'BRIEF', 'PRODUCER_SELECTED', 'GREENLIT', 'IN_PRODUCTION',
    'NEGOTIATING', 'CONTRACTED', 'RIGHTS_READY', 'DELIVERED', 'LOCALIZED',
    'SCHEDULED', 'RELEASED', 'ON_HOLD', 'CANCELLED', 'SOLD',
]);
const PLATFORM_AI_STREAMING_WINDOWS = new Set([
    'ORIGINAL_STREAMING_PREMIERE',
    'POST_THEATRICAL_WINDOW',
    'CATALOGUE_WINDOW',
    'OWNED_STUDIO_STREAMING_WINDOW',
]);

export const normalizePlatformAiLocalizationPromises = (
    value: unknown,
    releaseCountryIds: string[],
    localizationLevel: PlatformAiLocalizationLevel,
): StreamingLocalizationPromise[] => {
    if (localizationLevel === 'NONE') return [];
    const allowedCountries = new Set(releaseCountryIds);
    const byKey = new Map<string, StreamingLocalizationPromise>();
    for (const raw of Array.isArray(value) ? value : []) {
        if (!isRecord(raw)) continue;
        const languageId = normalizeStreamingLanguageId(raw.languageId);
        const mode: PlatformAiLocalizationMode | null = raw.mode === 'SUBTITLE' || raw.mode === 'DUB' ? raw.mode : null;
        const tier = Math.round(Number(raw.capabilityTierAtPromise));
        const countryIds = normalizeStreamingDayOneMarketIds(raw.countryIds)
            .filter(countryId => allowedCountries.has(countryId)).sort();
        if (!languageId || !mode || ![1, 2, 3].includes(tier) || !countryIds.length) continue;
        if (localizationLevel === 'SUBTITLES' && mode !== 'SUBTITLE') continue;
        const promise: StreamingLocalizationPromise = {
            ...(typeof raw.sourceProjectId === 'string' && raw.sourceProjectId.trim()
                ? { sourceProjectId: raw.sourceProjectId.trim() } : {}),
            languageId,
            mode,
            countryIds,
            capabilityTierAtPromise: tier as 1 | 2 | 3,
            mandatory: raw.mandatory !== false,
        };
        byKey.set(`${promise.sourceProjectId || ''}:${languageId}:${mode}:${countryIds.join(',')}`, promise);
    }
    return Array.from(byKey.values()).sort((left, right) => (
        (left.sourceProjectId || '').localeCompare(right.sourceProjectId || '')
        || left.languageId.localeCompare(right.languageId)
        || left.mode.localeCompare(right.mode)
    ));
};

const normalizePlatformAiSlate = (
    value: unknown,
    capabilities: PlatformAiCapabilities,
    sourceSchemaVersion: number,
    absoluteWeek: number,
): PlatformAiContentPlan[] => (Array.isArray(value) ? value : []).flatMap(rawPlan => {
    if (!isRecord(rawPlan) || !hasOnlyFiniteNumbers(rawPlan)) return [];
    const plan = rawPlan as unknown as PlatformAiContentPlan & { releaseRegionIds?: string[]; releaseCountryIds?: string[] };
    if (
        typeof plan.id !== 'string'
        || !plan.id.trim()
        || typeof plan.title !== 'string'
        || !plan.title.trim()
        || !PLATFORM_AI_CONTENT_SOURCES.has(plan.source)
        || !PLATFORM_AI_PLAN_STATUSES.has(plan.status)
        || !PLATFORM_AI_STREAMING_WINDOWS.has(plan.streamingWindow)
        || !Array.isArray(plan.sourceProjectIds)
        || !Array.isArray(plan.rightsContractIds)
        || !isRecord(plan.forecast)
        || !['strategic', 'creative', 'commercial', 'prestige', 'risk'].every(field => (
            isFiniteNumberInRange(plan.forecast[field as keyof PlatformAiContentPlan['forecast']], 0, 100)
        ))
        || ![
            plan.minimumGuaranteeMillions,
            plan.rightsCostMillions,
            plan.productionFundingMillions,
            plan.paidSpendMillions,
            plan.marketingReserveMillions,
            plan.contingencyMillions,
        ].every(amount => isFiniteNumberInRange(amount, 0, Number.MAX_VALUE))
    ) return [];
    const hasSavedReleaseCountries = Object.prototype.hasOwnProperty.call(plan, 'releaseCountryIds') && plan.releaseCountryIds !== undefined;
    const legacyRegions = new Set((Array.isArray(plan.releaseRegionIds) ? plan.releaseRegionIds : []).map(regionId => (
        regionId === 'MIDDLE_EAST_AND_AFRICA' || regionId === 'MIDDLE_EAST_AFRICA' ? 'AFRICA' : regionId
    )));
    const requestedCountries = hasSavedReleaseCountries
        ? normalizeStreamingDayOneMarketIds(plan.releaseCountryIds)
        : legacyRegions.size
            ? capabilities.activeCountryIds.filter(countryId => legacyRegions.has(getStreamingCountryMarketProfile(countryId)?.regionId || ''))
            : capabilities.activeCountryIds.slice();
    const historicalPlan = ['RELEASED', 'CANCELLED', 'SOLD'].includes(plan.status);
    const releaseCountryIds = historicalPlan
        ? requestedCountries
        : requestedCountries.filter(countryId => capabilities.activeCountryIds.includes(countryId));
    const normalizePlanWeek = (week: unknown): number | null => (
        week != null && Number.isFinite(Number(week))
            ? Math.max(0, Math.round(Number(week)))
            : null
    );
    const { releaseRegionIds: _legacyReleaseRegionIds, ...currentPlan } = plan;
    void _legacyReleaseRegionIds;
    const productionEscrow = normalizePlatformAiProductionEscrow({
        raw: (plan as unknown as Record<string, unknown>).productionEscrow,
        plan,
        sourceSchemaVersion,
        absoluteWeek,
    });
    const commissioningLifecycle = normalizePlatformAiCommissioningLifecycle({
        raw: (plan as unknown as Record<string, unknown>).commissioningLifecycle,
        plan,
        absoluteWeek,
    });
    const isUnfundedBrief = productionEscrow.status === 'UNFUNDED' && plan.status === 'BRIEF';
    const normalizedHoldWeek = normalizePlanWeek(plan.productionHoldStartedAtAbsoluteWeek);
    const localizationLevel = historicalPlan && ['NONE', 'SUBTITLES', 'DUBS_AND_SUBTITLES'].includes(plan.localizationLevel)
        ? plan.localizationLevel
        : clampLocalization(plan.localizationLevel, capabilities);
    const releaseEntries = normalizeReleaseEntries(plan.releaseEntries);
    return [{
        ...currentPlan,
        id: plan.id.trim(),
        title: plan.title.trim(),
        sourceProjectIds: [...new Set(plan.sourceProjectIds
            .filter((projectId): projectId is string => typeof projectId === 'string' && Boolean(projectId.trim()))
            .map(projectId => projectId.trim()))],
        rightsContractIds: [...new Set(plan.rightsContractIds
            .filter((contractId): contractId is string => typeof contractId === 'string' && Boolean(contractId.trim()))
            .map(contractId => contractId.trim()))],
        localizationLevel,
        localizationRequirements: normalizePlatformAiLocalizationPromises(
            plan.localizationRequirements,
            releaseCountryIds,
            localizationLevel,
        ),
        releaseCountryIds,
        marketingReserveMillions: isUnfundedBrief
            ? productionEscrow.marketingCampaignMillions
            : productionEscrow.marketingBalanceMillions,
        contingencyMillions: isUnfundedBrief
            ? Math.round(plan.productionFundingMillions * 0.08 * 100) / 100
            : productionEscrow.contingencyBalanceMillions,
        productionEscrow,
        commissioningLifecycle,
        committedAtAbsoluteWeek: normalizePlanWeek(plan.committedAtAbsoluteWeek),
        rightsReadyAtAbsoluteWeek: normalizePlanWeek(plan.rightsReadyAtAbsoluteWeek),
        localizationReadyAtAbsoluteWeek: normalizePlanWeek(plan.localizationReadyAtAbsoluteWeek),
        premiereAtAbsoluteWeek: normalizePlanWeek(plan.premiereAtAbsoluteWeek),
        releasePattern: RELEASE_PATTERNS.has(plan.releasePattern as PlatformAiReleasePattern)
            ? plan.releasePattern as PlatformAiReleasePattern
            : null,
        releaseEntries,
        releaseReadiness: normalizeReleaseReadiness(plan.releaseReadiness, releaseEntries, plan, absoluteWeek),
        scheduledAtAbsoluteWeek: normalizePlanWeek(plan.scheduledAtAbsoluteWeek),
        releasedAtAbsoluteWeek: normalizePlanWeek(plan.releasedAtAbsoluteWeek),
        productionHoldStartedAtAbsoluteWeek: normalizedHoldWeek !== null && normalizedHoldWeek <= absoluteWeek
            ? normalizedHoldWeek
            : null,
    }];
});

const normalizeReleaseMemory = (value: unknown): PlatformAiReleaseMemory[] => (Array.isArray(value) ? value : [])
    .flatMap((rawValue): PlatformAiReleaseMemory[] => {
        if (!isRecord(rawValue)) return [];
        const raw = rawValue as Partial<PlatformAiReleaseMemory> & { subscriberImpact?: unknown };
        const projectId = String(raw.projectId || '').trim();
        if (!projectId || !raw.genre || !raw.targetAudience) return [];
        const outcome = raw.outcome === 'HIT' || raw.outcome === 'FLOP' ? raw.outcome : 'SOLID';
        const regionalResults = (Array.isArray(raw.regionalResults) ? raw.regionalResults : []).flatMap(row => {
            if (!isRecord(row)) return [];
            const countryId = String(row.countryId || '').trim();
            const localizationState = ['NATIVE_OR_COMPATIBLE', 'DUBBED', 'SUBTITLED', 'UNLOCALIZED'].includes(String(row.localizationState))
                ? row.localizationState as 'NATIVE_OR_COMPATIBLE' | 'DUBBED' | 'SUBTITLED' | 'UNLOCALIZED'
                : 'UNLOCALIZED';
            if (!countryId) return [];
            return [{
                countryId,
                localizationState,
                reachMultiplier: Math.max(0, Math.min(1, Number(row.reachMultiplier) || 0)),
                appreciationMultiplier: Math.max(0, Math.min(1, Number(row.appreciationMultiplier) || 0)),
                completionMultiplier: Math.max(0, Math.min(1, Number(row.completionMultiplier) || 0)),
                viewsMillions: finiteNonNegative(row.viewsMillions),
                commercialScore: clampPrecisePercent(row.commercialScore),
                subscriberImpactMillions: Number.isFinite(Number(row.subscriberImpactMillions))
                    ? Number(row.subscriberImpactMillions)
                    : 0,
            }];
        }).sort((left, right) => left.countryId.localeCompare(right.countryId));
        return [{
            projectId,
            releasedAtAbsoluteWeek: Math.max(0, Math.round(Number(raw.releasedAtAbsoluteWeek) || 0)),
            genre: raw.genre,
            targetAudience: raw.targetAudience,
            leadActorId: typeof raw.leadActorId === 'string' && raw.leadActorId ? raw.leadActorId : null,
            directorId: typeof raw.directorId === 'string' && raw.directorId ? raw.directorId : null,
            quality: clampPrecisePercent(raw.quality),
            commercialScore: clampPrecisePercent(raw.commercialScore),
            prestigeScore: clampPrecisePercent(raw.prestigeScore),
            subscriberImpactMillions: Number.isFinite(Number(raw.subscriberImpactMillions ?? raw.subscriberImpact))
                ? Number(raw.subscriberImpactMillions ?? raw.subscriberImpact)
                : 0,
            outcome,
            awardWins: Math.max(0, Math.round(Number(raw.awardWins) || 0)),
            observedAwardKeys: [...new Set((Array.isArray(raw.observedAwardKeys) ? raw.observedAwardKeys : [])
                .filter((key): key is string => typeof key === 'string' && Boolean(key)))],
            regionalResults,
            localizationLevel: ['NONE', 'SUBTITLES', 'DUBS_AND_SUBTITLES'].includes(String(raw.localizationLevel))
                ? raw.localizationLevel as PlatformAiLocalizationLevel
                : 'NONE',
            releasePattern: RELEASE_PATTERNS.has(raw.releasePattern as PlatformAiReleasePattern)
                ? raw.releasePattern as PlatformAiReleasePattern
                : null,
            productionDelayWeeks: Math.max(0, Math.round(Number(raw.productionDelayWeeks) || 0)),
        }];
    })
    .sort((left, right) => left.releasedAtAbsoluteWeek - right.releasedAtAbsoluteWeek || left.projectId.localeCompare(right.projectId))
    .slice(-12);

const normalizePlatformMarketOperations = (input: {
    platformId: PlatformId;
    value: unknown;
    migrationActiveCountryIds: string[];
    absoluteWeek: number;
}): OwnedStreamingMarketOperation[] => {
    const migrationActiveCountryIds = normalizeStreamingDayOneMarketIds(input.migrationActiveCountryIds);
    const migrationActiveCountries = new Set(migrationActiveCountryIds);
    const byCountryId = new Map<string, OwnedStreamingMarketOperation>();
    for (const rawValue of Array.isArray(input.value) ? input.value : []) {
        if (!isRecord(rawValue)) continue;
        const raw = rawValue as unknown as OwnedStreamingMarketOperation;
        const countryId = normalizeStreamingDayOneMarketIds([raw.countryId])[0];
        if (!countryId || byCountryId.has(countryId)) continue;
        const profile = getStreamingCountryMarketProfile(countryId);
        const base = createStreamingCountryMarketOperation({
            seed: `platform-ai:${input.platformId}`,
            countryId,
            entryKind: raw.entryKind || 'EXPANSION',
            absoluteWeek: raw.plannedAtAbsoluteWeek ?? input.absoluteWeek,
            source: 'PLATFORM_AI',
        });
        if (!profile || !base) continue;
        const efficiencySnapshot = normalizePlatformAiEfficiencySnapshot(
            raw.platformAiEfficiencySnapshot,
            fullCurrencyToMillions(profile.entryCosts.total),
            getStreamingMarketClearanceDuration(profile, base.id),
            'MARKET_ENTRY',
        );
        const scaleCosts = (costs: typeof profile.entryCosts, multiplier: number): typeof profile.entryCosts => {
            const rights = Math.round(costs.rights * multiplier);
            const compliance = Math.round(costs.compliance * multiplier);
            const localization = Math.round(costs.localization * multiplier);
            const infrastructure = Math.round(costs.infrastructure * multiplier);
            const other = Math.round(costs.other * multiplier);
            return { rights, compliance, localization, infrastructure, other, total: rights + compliance + localization + infrastructure + other };
        };
        const plannedCosts = efficiencySnapshot
            ? scaleCosts(profile.entryCosts, efficiencySnapshot.costMultiplier)
            : profile.entryCosts;
        const rawPartnership = raw.platformAiPartnership;
        const platformAiPartnership = rawPartnership
            && typeof rawPartnership.partnerId === 'string'
            && rawPartnership.partnerId.trim()
            ? {
                partnerId: rawPartnership.partnerId.trim(),
                weeklyPremium: Math.max(0, Math.min(
                    Math.round(base.weeklyOperatingCost * 0.25),
                    Math.round(Number(rawPartnership.weeklyPremium) || 0),
                )),
                performanceCeilingPercent: Math.max(50, Math.min(
                    100,
                    Math.round(Number(rawPartnership.performanceCeilingPercent) || 100),
                )),
            }
            : null;
        const forceActive = migrationActiveCountries.has(countryId);
        const status = forceActive ? 'ACTIVE' as const : raw.status;
        const policyAbsoluteWeek = raw.policySnapshot?.capturedAtAbsoluteWeek
            ?? raw.activatedAtAbsoluteWeek
            ?? input.absoluteWeek;
        byCountryId.set(countryId, {
            ...base,
            ...raw,
            id: raw.id || base.id,
            idempotencyKey: raw.idempotencyKey || base.idempotencyKey,
            scope: 'COUNTRY',
            scopeId: countryId,
            countryId,
            regionId: profile.regionId,
            status,
            plannedCosts,
            committedCosts: raw.committedAtAbsoluteWeek !== null && efficiencySnapshot
                ? plannedCosts
                : raw.committedCosts || base.committedCosts,
            weeklyOperatingCost: getStreamingMarketWeeklyOperatingCost(profile)
                + (platformAiPartnership?.weeklyPremium || 0),
            countryProfile: profile,
            policySnapshot: status === 'ACTIVE'
                ? getStreamingMarketPolicySnapshot(profile, policyAbsoluteWeek, raw.policySnapshot?.revision ?? 0)
                : raw.policySnapshot,
            policyHistory: raw.policyHistory || [],
            activatedAtAbsoluteWeek: status === 'ACTIVE'
                ? raw.activatedAtAbsoluteWeek ?? input.absoluteWeek
                : raw.activatedAtAbsoluteWeek,
            source: status === 'ACTIVE' ? 'PLATFORM_AI' : raw.source || 'PLATFORM_AI',
            platformAiEfficiencySnapshot: efficiencySnapshot,
            platformAiPartnership,
        });
    }
    for (const countryId of migrationActiveCountryIds) {
        if (byCountryId.has(countryId)) continue;
        const profile = getStreamingCountryMarketProfile(countryId);
        const operation = createStreamingCountryMarketOperation({
            seed: `platform-ai:${input.platformId}`,
            countryId,
            entryKind: 'OPENING',
            absoluteWeek: input.absoluteWeek,
            source: 'PLATFORM_AI',
        });
        if (!profile || !operation) continue;
        byCountryId.set(countryId, {
            ...operation,
            status: 'ACTIVE',
            policySnapshot: getStreamingMarketPolicySnapshot(profile, input.absoluteWeek),
            activatedAtAbsoluteWeek: input.absoluteWeek,
            lastProcessedAbsoluteWeek: input.absoluteWeek,
            platformAiEfficiencySnapshot: null,
            platformAiPartnership: null,
        });
    }
    return Array.from(byCountryId.values());
};

export const resolvePlatformController = (player: Player, platformId: PlatformId): PlatformAiController => (
    player.ownedStreamingPlatform?.corporateDevelopment?.acquiredPlatformIds?.includes(platformId) ? 'PLAYER' : 'AI'
);

export const resolveStudioController = (player: Player, studioId: StudioId): PlatformAiController => {
    const owned = player.businesses.some(business => business.type === 'PRODUCTION_HOUSE' && (
        business.id === studioId || business.studioState?.acquisitionPortfolio?.sourceStudioId === studioId
    ));
    return owned ? 'PLAYER' : 'AI';
};

export const getPlatformAiProductionDuration = (
    standardWeeks: number,
    productionSkill: number,
    controller: PlatformAiController,
): number => {
    if (controller === 'PLAYER') return Math.max(1, Math.round(standardWeeks));
    const boundedSkill = Math.max(7, Math.min(10, productionSkill));
    const multiplier = Math.max(0.75, Math.min(0.90, 0.90 - (boundedSkill - 7) * 0.05));
    return Math.max(1, Math.round(standardWeeks * multiplier));
};

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const normalizeNonNegativeInteger = (value: unknown, fallback: number): number => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : fallback;
};

const normalizeNextPlanningCheckpoint = (
    value: unknown,
    absoluteWeek: number,
    planningCadenceWeeks: number,
): number => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return absoluteWeek;
    const rounded = Math.max(0, Math.round(numeric));
    return rounded > absoluteWeek + planningCadenceWeeks ? absoluteWeek : rounded;
};

const normalizeNullableWeek = (value: unknown): number | null => (
    value === null || value === undefined
        ? null
        : Number.isFinite(Number(value))
            ? Math.max(0, Math.round(Number(value)))
            : null
);

const normalizeCompetence = (
    value: unknown,
    fallback: PlatformAiRuntimeState['competence'],
): PlatformAiRuntimeState['competence'] => {
    const source = isRecord(value) ? value : {};
    return Object.fromEntries(COMPETENCE_FIELDS.map(field => {
        const numeric = Number(source[field]);
        return [field, Number.isFinite(numeric) ? Math.max(0, Math.min(10, numeric)) : fallback[field]];
    })) as unknown as PlatformAiRuntimeState['competence'];
};

const normalizeDecisionHistory = (value: unknown): PlatformAiDecisionRecord[] => {
    const normalized = (Array.isArray(value) ? value : []).flatMap(rawValue => {
        if (!isRecord(rawValue)) return [];
        const id = String(rawValue.id || '').trim();
        if (!id) return [];
        const cashImpactMillions = Number(rawValue.cashImpactMillions);
        const action = typeof rawValue.action === 'string'
            ? rawValue.action as PlatformAiDecisionRecord['action']
            : undefined;
        return [{
            id,
            absoluteWeek: normalizeNonNegativeInteger(rawValue.absoluteWeek, 0),
            type: String(rawValue.type || 'STATE_REPAIR'),
            summary: String(rawValue.summary || 'Platform state repaired.'),
            reason: String(rawValue.reason || 'Malformed decision history was normalized.'),
            cashImpactMillions: Number.isFinite(cashImpactMillions) ? cashImpactMillions : 0,
            ...(action ? { action } : {}),
        }];
    });
    return appendPlatformAiDecisions(normalized, []);
};

const normalizePlatformAiExternalRecapitalizations = (
    value: unknown,
    platformId: PlatformId,
): PlatformAiExternalRecapitalization[] => {
    const statuses = new Set(['OFFERED', 'DECLINED', 'SETTLED', 'FAILED']);
    const investorArchetypes = new Set(['PRIVATE_EQUITY', 'MEDIA_GROUP', 'TECH_GROUP', 'TELECOM_GROUP', 'SOVEREIGN_FUND']);
    const byId = new Map<string, PlatformAiExternalRecapitalization>();
    for (const raw of Array.isArray(value) ? value : []) {
        if (!isRecord(raw) || raw.platformId !== platformId) continue;
        const id = String(raw.id || '').trim();
        const idempotencyKey = String(raw.idempotencyKey || '').trim();
        const episodeId = String(raw.episodeId || '').trim();
        if (!id || !idempotencyKey || !episodeId || !statuses.has(String(raw.status))) continue;
        const status = raw.status as PlatformAiExternalRecapitalization['status'];
        const settledAtAbsoluteWeek = status === 'SETTLED' ? normalizeNullableWeek(raw.settledAtAbsoluteWeek) : null;
        byId.set(id, {
            id,
            idempotencyKey,
            episodeId,
            platformId,
            status,
            investorArchetype: investorArchetypes.has(String(raw.investorArchetype))
                ? raw.investorArchetype as PlatformAiExternalRecapitalization['investorArchetype']
                : 'PRIVATE_EQUITY',
            offeredMillions: finiteNonNegative(raw.offeredMillions),
            settledMillions: finiteNonNegative(raw.settledMillions),
            arrearsReductionMillions: finiteNonNegative(raw.arrearsReductionMillions),
            debtReductionMillions: finiteNonNegative(raw.debtReductionMillions),
            cashRemainderMillions: finiteNonNegative(raw.cashRemainderMillions),
            dilutionPercent: Math.min(100, finiteNonNegative(raw.dilutionPercent)),
            autonomyPenalty: Math.min(100, finiteNonNegative(raw.autonomyPenalty)),
            valuationConfidenceMultiplier: Math.max(0, Math.min(1, Number(raw.valuationConfidenceMultiplier) || 0)),
            offeredAtAbsoluteWeek: normalizeNonNegativeInteger(raw.offeredAtAbsoluteWeek, 0),
            settledAtAbsoluteWeek,
            cooldownUntilAbsoluteWeek: normalizeNullableWeek(raw.cooldownUntilAbsoluteWeek),
            reason: String(raw.reason || 'External recapitalization record normalized.'),
        });
    }
    return [...byId.values()]
        .sort((left, right) => left.offeredAtAbsoluteWeek - right.offeredAtAbsoluteWeek || left.id.localeCompare(right.id))
        .slice(-16);
};

export const appendPlatformAiExternalRecapitalizations = (
    current: PlatformAiExternalRecapitalization[],
    additions: PlatformAiExternalRecapitalization[],
    platformId: PlatformId,
): PlatformAiExternalRecapitalization[] => normalizePlatformAiExternalRecapitalizations(
    [...current, ...additions],
    platformId,
);

const normalizePlatformAiAdministration = (value: unknown): PlatformAiAdministrationState | null => {
    if (!isRecord(value)) return null;
    const episodeId = String(value.episodeId || '').trim();
    const outcomes = new Set(['PENDING', 'ACQUISITION_AVAILABLE', 'REGIONAL_DOWNSIZE', 'DORMANT']);
    if (!episodeId || !outcomes.has(String(value.outcome))) return null;
    return {
        enteredAtAbsoluteWeek: normalizeNonNegativeInteger(value.enteredAtAbsoluteWeek, 0),
        episodeId,
        outcome: value.outcome as PlatformAiAdministrationState['outcome'],
        resolvedAtAbsoluteWeek: normalizeNullableWeek(value.resolvedAtAbsoluteWeek),
        referenceId: value.referenceId === null || value.referenceId === undefined
            ? null
            : String(value.referenceId).trim() || null,
    };
};

const NO_PLATFORM_AI_SPENDING_RESTRICTIONS: PlatformAiSpendingRestrictions = {
    source: 'NONE',
    blocksNewBids: false,
    blocksNewGreenlights: false,
    blocksNewResearch: false,
    blocksExpansion: false,
    expiresAtAbsoluteWeek: null,
};

const normalizePlatformAiSpendingRestrictions = (value: unknown): PlatformAiSpendingRestrictions => {
    if (!isRecord(value)) return { ...NO_PLATFORM_AI_SPENDING_RESTRICTIONS };
    const sources = new Set(['NONE', 'RESTRUCTURE', 'PARENT_RESCUE', 'EXTERNAL_RECAPITALIZATION', 'ADMINISTRATION']);
    const source = sources.has(String(value.source))
        ? value.source as PlatformAiSpendingRestrictions['source']
        : 'NONE';
    if (source === 'NONE') return { ...NO_PLATFORM_AI_SPENDING_RESTRICTIONS };
    return {
        source,
        blocksNewBids: value.blocksNewBids === true,
        blocksNewGreenlights: value.blocksNewGreenlights === true,
        blocksNewResearch: value.blocksNewResearch === true,
        blocksExpansion: value.blocksExpansion === true,
        expiresAtAbsoluteWeek: normalizeNullableWeek(value.expiresAtAbsoluteWeek),
    };
};

export const normalizePlatformAiDistressEpisodes = (
    value: unknown,
    platformId: PlatformId,
    absoluteWeek: number,
    legacyStatus?: unknown,
): PlatformAiDistressEpisode[] => {
    const byId = new Map<string, PlatformAiDistressEpisode>();
    for (const rawValue of Array.isArray(value) ? value : []) {
        if (!isRecord(rawValue)) continue;
        const id = String(rawValue.id || '').trim();
        if (!id || rawValue.platformId !== platformId || !DISTRESS_EPISODE_STATUSES.has(String(rawValue.status))) continue;
        const startedAtAbsoluteWeek = Math.min(
            absoluteWeek,
            normalizeNonNegativeInteger(rawValue.startedAtAbsoluteWeek, absoluteWeek),
        );
        const status = rawValue.status as PlatformAiDistressEpisode['status'];
        const terminal = status === 'RECOVERED' || status === 'DORMANT';
        const completedAtAbsoluteWeek = terminal
            ? Math.max(startedAtAbsoluteWeek, Math.min(
                absoluteWeek,
                normalizeNonNegativeInteger(rawValue.completedAtAbsoluteWeek, absoluteWeek),
            ))
            : null;
        const seenStages = new Set<PlatformAiDistressAction>();
        const normalizedStageResults = (Array.isArray(rawValue.stageResults) ? rawValue.stageResults : []).flatMap(rawResult => {
            if (!isRecord(rawResult)) return [];
            const stage = String(rawResult.stage) as PlatformAiDistressAction;
            if (!DISTRESS_STAGE_ORDER.includes(stage) || seenStages.has(stage)) return [];
            const outcome = String(rawResult.outcome);
            if (!DISTRESS_STAGE_OUTCOMES.has(outcome)) return [];
            seenStages.add(stage);
            const enteredAtAbsoluteWeek = Math.max(startedAtAbsoluteWeek, Math.min(
                absoluteWeek,
                normalizeNonNegativeInteger(rawResult.enteredAtAbsoluteWeek, startedAtAbsoluteWeek),
            ));
            const resolvedAtAbsoluteWeek = outcome === 'PENDING'
                ? null
                : Math.max(enteredAtAbsoluteWeek, Math.min(
                    absoluteWeek,
                    normalizeNonNegativeInteger(rawResult.resolvedAtAbsoluteWeek, enteredAtAbsoluteWeek),
                ));
            return [{
                stage,
                outcome: outcome as PlatformAiDistressEpisode['stageResults'][number]['outcome'],
                enteredAtAbsoluteWeek,
                resolvedAtAbsoluteWeek,
                reason: String(rawResult.reason || 'Distress stage normalized.'),
                referenceId: rawResult.referenceId === null || rawResult.referenceId === undefined
                    ? null
                    : String(rawResult.referenceId).trim() || null,
            }];
        });
        const stageResultByStage = new Map(normalizedStageResults.map(result => [result.stage, result]));
        const stageResults: PlatformAiDistressEpisode['stageResults'] = [];
        for (const stage of DISTRESS_STAGE_ORDER) {
            const result = stageResultByStage.get(stage);
            if (!result) break;
            stageResults.push(result);
        }
        const lastContiguousResult = stageResults.at(-1);
        const normalizedLastAdvancedAtAbsoluteWeek = Math.max(startedAtAbsoluteWeek, Math.min(
            absoluteWeek,
            normalizeNonNegativeInteger(rawValue.lastAdvancedAtAbsoluteWeek, startedAtAbsoluteWeek),
        ));
        const currentStageIndex = lastContiguousResult?.outcome === 'PENDING'
            || (lastContiguousResult?.outcome === 'UNAVAILABLE' || lastContiguousResult?.outcome === 'FAILED')
                && normalizedLastAdvancedAtAbsoluteWeek <= (
                    lastContiguousResult.resolvedAtAbsoluteWeek ?? lastContiguousResult.enteredAtAbsoluteWeek
                )
            ? Math.max(0, stageResults.length - 1)
            : stageResults.length;
        byId.set(id, {
            id,
            platformId,
            status,
            startedAtAbsoluteWeek,
            completedAtAbsoluteWeek,
            currentStageIndex,
            lastAdvancedAtAbsoluteWeek: normalizedLastAdvancedAtAbsoluteWeek,
            stageResults,
        });
    }
    if (byId.size === 0 && (legacyStatus === 'DISTRESSED' || legacyStatus === 'RESTRUCTURING')) {
        const id = createDeterministicId('platform_ai_distress_episode', platformId, absoluteWeek, 'LEGACY_MIGRATION');
        byId.set(id, {
            id,
            platformId,
            status: 'ACTIVE',
            startedAtAbsoluteWeek: absoluteWeek,
            completedAtAbsoluteWeek: null,
            currentStageIndex: 0,
            lastAdvancedAtAbsoluteWeek: Math.max(0, absoluteWeek - 1),
            stageResults: [],
        });
    }
    const episodes = Array.from(byId.values());
    const active = episodes.filter(episode => episode.completedAtAbsoluteWeek === null)
        .sort((left, right) => left.startedAtAbsoluteWeek - right.startedAtAbsoluteWeek || left.id.localeCompare(right.id))
        .slice(-1);
    const completed = episodes.filter(episode => episode.completedAtAbsoluteWeek !== null)
        .sort((left, right) => (
            left.completedAtAbsoluteWeek! - right.completedAtAbsoluteWeek!
            || left.id.localeCompare(right.id)
        ))
        .slice(-DISTRESS_EPISODE_HISTORY_LIMIT);
    return [...completed, ...active];
};

const isFiniteNumberInRange = (
    value: unknown,
    minimum: number,
    maximum: number,
    integer = false,
): value is number => (
    typeof value === 'number'
    && Number.isFinite(value)
    && value >= minimum
    && value <= maximum
    && (!integer || Number.isInteger(value))
);

const isNullableNonNegativeInteger = (value: unknown): boolean => (
    value === null || isFiniteNumberInRange(value, 0, Number.MAX_SAFE_INTEGER, true)
);

const hasOnlyFiniteNumbers = (value: unknown, seen = new WeakSet<object>()): boolean => {
    if (typeof value === 'number') return Number.isFinite(value);
    if (!value || typeof value !== 'object') return true;
    if (seen.has(value)) return true;
    seen.add(value);
    return Array.isArray(value)
        ? value.every(item => hasOnlyFiniteNumbers(item, seen))
        : Object.values(value).every(item => hasOnlyFiniteNumbers(item, seen));
};

const isStructurallyEqual = (
    left: unknown,
    right: unknown,
    seen = new WeakMap<object, object>(),
): boolean => {
    if (Object.is(left, right)) return true;
    if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
    const seenRight = seen.get(left);
    if (seenRight) return seenRight === right;
    seen.set(left, right);
    if (Array.isArray(left) || Array.isArray(right)) {
        if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
        return left.every((item, index) => isStructurallyEqual(item, right[index], seen));
    }
    const leftRecord = left as Record<string, unknown>;
    const rightRecord = right as Record<string, unknown>;
    const leftKeys = Object.keys(leftRecord);
    const rightKeys = Object.keys(rightRecord);
    if (leftKeys.length !== rightKeys.length) return false;
    return leftKeys.every(key => Object.prototype.hasOwnProperty.call(rightRecord, key)
        && isStructurallyEqual(leftRecord[key], rightRecord[key], seen));
};

const isCanonicalCapabilities = (value: unknown): value is PlatformAiCapabilities => {
    if (!isRecord(value) || !Array.isArray(value.activeCountryIds) || !isRecord(value.technologyLevels)) return false;
    if (!value.activeCountryIds.every(countryId => typeof countryId === 'string')) return false;
    const canonicalCountryIds = normalizeStreamingDayOneMarketIds(value.activeCountryIds);
    if (
        canonicalCountryIds.length !== value.activeCountryIds.length
        || !canonicalCountryIds.every((countryId, index) => countryId === value.activeCountryIds[index])
    ) return false;
    if (
        !isFiniteNumberInRange(value.subtitleCoveragePercent, 0, 100, true)
        || !isFiniteNumberInRange(value.dubCoveragePercent, 0, 100, true)
    ) return false;
    const derivedLocalization = getPlatformAiLocalizationCoverageFromContentOperations(Number(value.technologyLevels.CONTENT_OPERATIONS));
    if (
        value.subtitleCoveragePercent !== derivedLocalization.subtitleCoveragePercent
        || value.dubCoveragePercent !== derivedLocalization.dubCoveragePercent
    ) return false;
    return TECHNOLOGY_BRANCHES.every(branch => {
        const level = value.technologyLevels[branch];
        return isFiniteNumberInRange(level, 0, 75)
            && (level === 0 || technologyTargetsFor(branch).includes(level));
    });
};

const STREAMING_LICENSE_TERRITORIES = new Set(['DOMESTIC', 'MULTI_REGION', 'GLOBAL']);
const STREAMING_LICENSE_EXCLUSIVITY = new Set(['NON_EXCLUSIVE', 'EXCLUSIVE']);
const STREAMING_LICENSE_STATUSES = new Set(['ACTIVE', 'EXPIRED', 'TERMINATED', 'TRANSFERRED_OUT']);
const STREAMING_LICENSE_ORIGINS = new Set([
    'STARTER',
    'STUDIO_MARKET',
    'PLATFORM_TRADE',
    'RENEWAL',
    'OWNED_STUDIO_TRANSFER',
    'CATALOGUE_ACQUISITION',
]);

const isCanonicalRightsContract = (value: unknown): value is OwnedStreamingCatalogLicense => {
    if (!isRecord(value) || !hasOnlyFiniteNumbers(value)) return false;
    const contract = value as unknown as OwnedStreamingCatalogLicense;
    if (!['id', 'sourceProjectId', 'titleAtSigning', 'licensorName'].every(field => {
        const textValue = contract[field as keyof OwnedStreamingCatalogLicense];
        return typeof textValue === 'string' && textValue === textValue.trim() && Boolean(textValue);
    })) return false;
    if (
        !STREAMING_LICENSE_TERRITORIES.has(contract.territory)
        || !STREAMING_LICENSE_EXCLUSIVITY.has(contract.exclusivity)
        || !STREAMING_LICENSE_STATUSES.has(contract.status)
        || contract.origin !== undefined && !STREAMING_LICENSE_ORIGINS.has(contract.origin)
        || !isFiniteNumberInRange(contract.durationWeeks, 1, Number.MAX_SAFE_INTEGER, true)
        || !isFiniteNumberInRange(contract.minimumGuarantee, 0, Number.MAX_SAFE_INTEGER)
        || !isFiniteNumberInRange(contract.platformRevenueShare, 0, 100)
        || !isFiniteNumberInRange(contract.licensorRevenueShare, 0, 100)
        || Math.abs(contract.platformRevenueShare + contract.licensorRevenueShare - 100) > Number.EPSILON
        || !isFiniteNumberInRange(contract.signedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER, true)
        || !isFiniteNumberInRange(contract.startsAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER, true)
        || !isFiniteNumberInRange(contract.expiresAtAbsoluteWeek, contract.startsAtAbsoluteWeek, Number.MAX_SAFE_INTEGER, true)
    ) return false;
    if (contract.countryIds !== undefined && (
        !Array.isArray(contract.countryIds)
        || contract.countryIds.some(countryId => typeof countryId !== 'string' || !countryId.trim())
        || new Set(contract.countryIds).size !== contract.countryIds.length
    )) return false;
    return [
        contract.marketingGuarantee,
        contract.viewershipBonusThreshold,
        contract.viewershipBonusAmount,
        contract.cancellationPenalty,
    ].every(amount => amount === undefined || isFiniteNumberInRange(amount, 0, Number.MAX_SAFE_INTEGER));
};

export const normalizePlatformAiRightsContracts = (value: unknown): OwnedStreamingCatalogLicense[] => {
    const byId = new Map<string, OwnedStreamingCatalogLicense>();
    for (const rawContract of Array.isArray(value) ? value : []) {
        if (!isCanonicalRightsContract(rawContract) || byId.has(rawContract.id)) continue;
        byId.set(rawContract.id, rawContract);
    }
    return Array.from(byId.values());
};

const isCanonicalNormalizedCollection = <T,>(
    value: unknown,
    normalize: (source: unknown) => T[],
): value is T[] => (
    Array.isArray(value)
    && isStructurallyEqual(normalize(value), value)
);

const isCanonicalAudienceSettlementHistory = (value: unknown): value is PlatformAiAudienceSettlement[] => {
    if (!Array.isArray(value)) return false;
    const ids = new Set<string>();
    let settledStarted = false;
    let pendingCount = 0;
    let settledCount = 0;
    for (const item of value) {
        if (!isRecord(item)) return false;
        const stringFields = ['id', 'streamingWindowId', 'projectId', 'planId'] as const;
        if (!stringFields.every(field => typeof item[field] === 'string' && item[field] === item[field].trim() && Boolean(item[field]))) return false;
        if (ids.has(item.id as string)) return false;
        ids.add(item.id as string);
        if (typeof item.subscriberImpactMillions !== 'number' || !Number.isFinite(item.subscriberImpactMillions)) return false;
        if (!isFiniteNumberInRange(item.createdAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER, true)) return false;
        if (item.status === 'PENDING') {
            if (settledStarted || item.settledAtAbsoluteWeek !== null) return false;
            pendingCount += 1;
            continue;
        }
        if (
            item.status !== 'SETTLED'
            || !isFiniteNumberInRange(item.settledAtAbsoluteWeek, item.createdAtAbsoluteWeek, Number.MAX_SAFE_INTEGER, true)
        ) return false;
        settledStarted = true;
        settledCount += 1;
    }
    return settledCount <= Math.max(0, AUDIENCE_SETTLEMENT_HISTORY_LIMIT - pendingCount);
};

const isCanonicalOneTimeObligationHistory = (
    value: unknown,
    protectedSettledIds: Set<string> = new Set(),
): value is PlatformAiPendingOneTimeObligation[] => {
    if (!Array.isArray(value)) return false;
    const ids = new Set<string>();
    let settledStarted = false;
    let heldCount = 0;
    let historicalSettledCount = 0;
    for (const item of value) {
        if (!isRecord(item)) return false;
        if (typeof item.id !== 'string' || item.id !== item.id.trim() || !item.id || ids.has(item.id)) return false;
        ids.add(item.id);
        if (!ONE_TIME_OBLIGATION_CATEGORIES.has(item.category as PlatformAiExpenseClass)) return false;
        if (!isFiniteNumberInRange(item.amountMillions, Number.MIN_VALUE, Number.MAX_VALUE)) return false;
        if (!isFiniteNumberInRange(item.createdWeek, 0, Number.MAX_SAFE_INTEGER, true)) return false;
        if (item.status === 'HELD') {
            if (settledStarted || item.settledWeek !== null) return false;
            heldCount += 1;
            continue;
        }
        if (
            item.status !== 'SETTLED'
            || !isFiniteNumberInRange(item.settledWeek, item.createdWeek, Number.MAX_SAFE_INTEGER, true)
        ) return false;
        settledStarted = true;
        if (!protectedSettledIds.has(item.id)) historicalSettledCount += 1;
    }
    return historicalSettledCount <= Math.max(0, ONE_TIME_OBLIGATION_HISTORY_LIMIT - heldCount);
};

const isCanonicalRightsRenewalHistory = (
    value: unknown,
    platformId: PlatformId,
    rightsContracts: OwnedStreamingCatalogLicense[],
    pendingOneTimeObligations: PlatformAiPendingOneTimeObligation[],
): value is PlatformAiRightsRenewalRecord[] => {
    if (!Array.isArray(value)) return false;
    const normalized = normalizePlatformAiRightsRenewals(value, platformId, rightsContracts);
    if (!isStructurallyEqual(normalized, value)) return false;
    const obligationsById = new Map(pendingOneTimeObligations.map(obligation => [obligation.id, obligation]));
    const contractsById = new Map(rightsContracts.map(contract => [contract.id, contract]));
    return normalized.every(record => {
        const obligation = obligationsById.get(record.obligationId);
        if (
            !obligation
            || obligation.category !== 'CONTRACTUAL'
            || obligation.amountMillions !== record.minimumGuaranteeMillions
            || obligation.createdWeek !== record.createdAtAbsoluteWeek
        ) return false;
        if (
            record.paymentSettledAtAbsoluteWeek !== null
            && !isFiniteNumberInRange(
                record.paymentSettledAtAbsoluteWeek,
                record.createdAtAbsoluteWeek,
                Number.MAX_SAFE_INTEGER,
                true,
            )
        ) return false;
        if (record.status === 'PENDING_PAYMENT') {
            const paymentEvidenceMatches = record.paymentSettledAtAbsoluteWeek === null
                ? obligation.status === 'HELD' && obligation.settledWeek === null
                : obligation.status === 'SETTLED'
                    && obligation.settledWeek === record.paymentSettledAtAbsoluteWeek;
            return paymentEvidenceMatches
                && record.renewalLicenseId === null
                && record.activatedAtAbsoluteWeek === null;
        }
        if (
            record.paymentSettledAtAbsoluteWeek === null
            || obligation.status !== 'SETTLED'
            || obligation.settledWeek !== record.paymentSettledAtAbsoluteWeek
        ) return false;
        if (record.status === 'PAYMENT_SETTLED') {
            return record.renewalLicenseId === null && record.activatedAtAbsoluteWeek === null;
        }
        const contract = record.renewalLicenseId ? contractsById.get(record.renewalLicenseId) : null;
        return Boolean(
            contract
            && contract.origin === 'RENEWAL'
            && contract.renewedFromLicenseId === record.previousLicenseId
            && contract.startsAtAbsoluteWeek === record.nextStartsAtAbsoluteWeek
            && record.activatedAtAbsoluteWeek !== null,
        );
    });
};

const isCanonicalPlatformAiState = (
    value: unknown,
    platformId: PlatformId,
    absoluteWeek: number,
): value is PlatformAiRuntimeState => {
    if (!isRecord(value) || value.schemaVersion !== PLATFORM_AI_RUNTIME_SCHEMA_VERSION || value.profileId !== platformId) return false;
    const operatingProfile = getPlatformAiOperatingProfile(platformId);
    if (value.operatingProfileVersion !== operatingProfile.version) return false;
    if (value.playerAcquisitionHandoffAtAbsoluteWeek !== null && !isFiniteNumberInRange(
        value.playerAcquisitionHandoffAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER, true,
    )) return false;
    if (!REQUIRED_RUNTIME_ARRAY_FIELDS.every(field => Array.isArray(value[field]))) return false;
    if (
        !isRecord(value.genreMemory) || !hasOnlyFiniteNumbers(value.genreMemory)
        || !isRecord(value.audienceMemory) || !hasOnlyFiniteNumbers(value.audienceMemory)
        || !isRecord(value.regionalMemory) || !hasOnlyFiniteNumbers(value.regionalMemory)
        || !isRecord(value.localizationMemory) || !hasOnlyFiniteNumbers(value.localizationMemory)
        || !isRecord(value.talentPairMemory) || !hasOnlyFiniteNumbers(value.talentPairMemory)
        || !isRecord(value.releasePatternMemory) || !hasOnlyFiniteNumbers(value.releasePatternMemory)
        || !isRecord(value.productionOutcomeMemory) || !hasOnlyFiniteNumbers(value.productionOutcomeMemory)
        || !Array.isArray(value.productionOutcomeMemory.observedProductionIds)
        || !isRecord(value.audienceHealth) || !hasOnlyFiniteNumbers(value.audienceHealth)
        || !isRecord(value.competence)
    ) return false;
    if (!isCanonicalCapabilities(value.capabilities)) return false;
    const candidate = value as unknown as PlatformAiRuntimeState;
    const planningCadenceWeeks = PLATFORM_AI_PROFILES[platformId].planningCadenceWeeks;
    if (!isCanonicalNormalizedCollection(candidate.researchQueue, source => normalizeResearchQueue(
        source,
        platformId,
        absoluteWeek,
    ))) return false;
    if (!isCanonicalNormalizedCollection(candidate.languageCapabilities, source => normalizeLanguageCapabilities(
        source,
        platformId,
        absoluteWeek,
        false,
    ))) return false;
    const researchBackedContentOperationsLevel = getResearchBackedContentOperationsLevel(candidate.researchQueue);
    const researchBackedCoverage = getPlatformAiLocalizationCoverageFromContentOperations(researchBackedContentOperationsLevel);
    if (
        candidate.capabilities.technologyLevels.CONTENT_OPERATIONS !== researchBackedContentOperationsLevel
        || candidate.capabilities.subtitleCoveragePercent !== researchBackedCoverage.subtitleCoveragePercent
        || candidate.capabilities.dubCoveragePercent !== researchBackedCoverage.dubCoveragePercent
    ) return false;
    if (!isCanonicalNormalizedCollection(candidate.marketOperations, source => normalizePlatformMarketOperations({
        platformId,
        value: source,
        migrationActiveCountryIds: [],
        absoluteWeek,
    }).filter(operation => hasOnlyFiniteNumbers(operation)))) return false;
    if (!isCanonicalNormalizedCollection(candidate.slate, source => normalizePlatformAiSlate(
        source,
        candidate.capabilities,
        PLATFORM_AI_RUNTIME_SCHEMA_VERSION,
        absoluteWeek,
    ))) return false;
    if (!isCanonicalNormalizedCollection(candidate.rightsContracts, normalizePlatformAiRightsContracts)) return false;
    if (!isCanonicalNormalizedCollection(candidate.releaseMemory, normalizeReleaseMemory)) return false;
    if (!isCanonicalNormalizedCollection(candidate.financeHistory, source => normalizeFinanceHistory(
        source,
        candidate.debtMillions,
    ))) return false;
    if (!isCanonicalNormalizedCollection(candidate.decisionHistory, normalizeDecisionHistory)) return false;
    if (!isCanonicalNormalizedCollection(candidate.distressEpisodes, source => (
        normalizePlatformAiDistressEpisodes(source, platformId, absoluteWeek)
    ))) return false;
    if (!isCanonicalNormalizedCollection(candidate.externalRecapitalizations, source => (
        normalizePlatformAiExternalRecapitalizations(source, platformId)
    ))) return false;
    if (!isStructurallyEqual(normalizePlatformAiAdministration(candidate.administration), candidate.administration)) return false;
    if (!isStructurallyEqual(normalizePlatformAiSpendingRestrictions(candidate.spendingRestrictions), candidate.spendingRestrictions)) return false;
    if (!isCanonicalNormalizedCollection(candidate.externalCommitments, source => (
        normalizePlatformAiExternalCommitments(
            source,
            platformId,
            candidate.pendingOneTimeObligations,
            undefined,
            absoluteWeek,
        )
    ))) return false;
    if (!isCanonicalAudienceSettlementHistory(value.pendingAudienceSettlements)) return false;
    const protectedLocalizationObligationIds = new Set((candidate.localizationJobs as unknown[])
        .filter(job => isRecord(job) && job.status !== 'CANCELLED' && Number(job.costMillions) > 0)
        .map(job => String((job as unknown as Record<string, unknown>).obligationId || '').trim())
        .filter(Boolean));
    for (const commitment of candidate.externalCommitments) {
        protectedLocalizationObligationIds.add(commitment.obligationId);
    }
    if (!isCanonicalOneTimeObligationHistory(value.pendingOneTimeObligations, protectedLocalizationObligationIds)) return false;
    if (!isCanonicalRightsRenewalHistory(
        value.rightsRenewals,
        platformId,
        value.rightsContracts as OwnedStreamingCatalogLicense[],
        value.pendingOneTimeObligations as PlatformAiPendingOneTimeObligation[],
    )) return false;
    if (!isCanonicalNormalizedCollection(candidate.localizationJobs, source => normalizePlatformAiLocalizationJobs(
        source,
        platformId,
        candidate.pendingOneTimeObligations,
        new Set(candidate.slate
            .filter(plan => ['RIGHTS_READY', 'DELIVERED', 'LOCALIZED'].includes(plan.status))
            .map(plan => plan.id)),
        candidate.slate,
        candidate.languageCapabilities,
    ))) return false;
    if (!isStructurallyEqual(reconcilePlatformAiLocalizationObligations(
        candidate.pendingOneTimeObligations,
        candidate.localizationJobs,
    ), candidate.pendingOneTimeObligations)) return false;
    if (!isStructurallyEqual(normalizePlatformAiPendingOneTimeObligations(
        reconcilePlatformAiExternalCommitmentObligations(
            candidate.pendingOneTimeObligations,
            candidate.externalCommitments,
        ),
        protectedLocalizationObligationIds,
    ), candidate.pendingOneTimeObligations)) return false;
    if (!isStructurallyEqual(filterPlatformAiRightsContractsByRenewalState(
        candidate.rightsContracts,
        candidate.rightsRenewals,
    ), candidate.rightsContracts)) return false;
    if (!hasOnlyFiniteNumbers(value)) return false;
    if (!COMPETENCE_FIELDS.every(field => isFiniteNumberInRange(candidate.competence[field], 0, 10))) return false;
    if (!PLATFORM_AI_STATUSES.has(String(candidate.status))) return false;
    if (
        !isFiniteNumberInRange(candidate.effectiveCompetenceDelta, -0.5, 0.5)
        || !isFiniteNumberInRange(candidate.lastProcessedAbsoluteWeek, -1, absoluteWeek, true)
        || !isFiniteNumberInRange(
            candidate.nextPlanningAbsoluteWeek,
            0,
            absoluteWeek + planningCadenceWeeks,
            true,
        )
        || !isFiniteNumberInRange(candidate.strategyCycle, 0, Number.MAX_SAFE_INTEGER, true)
        || !isFiniteNumberInRange(candidate.debtMillions, 0, Number.MAX_VALUE)
        || !isNullableNonNegativeInteger(candidate.lastRescueAbsoluteWeek)
        || !isFiniteNumberInRange(candidate.rescueCount, 0, Number.MAX_SAFE_INTEGER, true)
        || !isFiniteNumberInRange(candidate.standaloneValuationBillions, 0, Number.MAX_VALUE)
        || !isFiniteNumberInRange(candidate.healthyOperatingWeeks, 0, Number.MAX_SAFE_INTEGER, true)
        || !isNullableNonNegativeInteger(candidate.restructuringStartedAtAbsoluteWeek)
        || !isNullableNonNegativeInteger(candidate.restructuringFailedAtAbsoluteWeek)
        || !isFiniteNumberInRange(candidate.restructuringInterestRateMultiplier, 0.5, 1)
        || !isFiniteNumberInRange(candidate.debtInterestRateAnnualPercent, 2, 20)
        || candidate.outstandingApprovedContentMillions !== undefined && !isFiniteNumberInRange(candidate.outstandingApprovedContentMillions, 0, Number.MAX_VALUE)
        || candidate.outstandingApprovedResearchMillions !== undefined && !isFiniteNumberInRange(candidate.outstandingApprovedResearchMillions, 0, Number.MAX_VALUE)
    ) return false;
    if (
        candidate.decisionHistory.length > DECISION_HISTORY_LIMIT
        || candidate.financeHistory.length > 104
        || candidate.releaseMemory.length > 12
        || !candidate.talentBookingRefs.every(reference => (
            typeof reference === 'string'
            && reference === reference.trim()
            && Boolean(reference)
        ))
        || new Set(candidate.talentBookingRefs).size !== candidate.talentBookingRefs.length
    ) return false;
    const activeMarketCountryIds = normalizeStreamingDayOneMarketIds(candidate.marketOperations
        .filter(operation => operation?.status === 'ACTIVE' && operation.countryId)
        .map(operation => operation.countryId!));
    return activeMarketCountryIds.length === candidate.capabilities.activeCountryIds.length
        && activeMarketCountryIds.every((countryId, index) => countryId === candidate.capabilities.activeCountryIds[index]);
};

export const normalizePlatformAiState = (
    platform: PlatformState,
    playerId: string,
    absoluteWeek: number,
): PlatformState => {
    const turnMarker = canonicalTurnStates.get(platform);
    if (turnMarker && turnMarker.absoluteWeek <= absoluteWeek) {
        normalizationDiagnostics.turnCacheHitCount += 1;
        return platform;
    }
    normalizationDiagnostics.deepValidationCount += 1;
    const profile = PLATFORM_AI_PROFILES[platform.id];
    const operatingProfile = getPlatformAiOperatingProfile(platform.id);
    const existing = platform.ai as unknown as (Record<string, any> | undefined);
    // Canonical v4 state can skip allocation-heavy history rebuilding only after
    // the complete persisted runtime contract has passed structural validation.
    if (isCanonicalPlatformAiState(existing, platform.id, absoluteWeek)) return platform;
    normalizationDiagnostics.rebuildCount += 1;
    const rawCapabilities = existing?.capabilities as unknown as Record<string, unknown> | undefined;
    const startingCapabilities = buildStartingCapabilities(platform);
    const schemaVersion = Number(existing?.schemaVersion) || 0;
    const savedOperatingProfileVersion = Math.max(0, Math.round(Number(existing?.operatingProfileVersion) || 0));
    const applyOperatingProfile = savedOperatingProfileVersion < operatingProfile.version
        || !Array.isArray(existing?.researchQueue)
        || !Array.isArray(existing?.languageCapabilities);
    const migratingCountryAuthority = schemaVersion < 3;
    const hasSavedCountryIds = Boolean(rawCapabilities && Object.prototype.hasOwnProperty.call(rawCapabilities, 'activeCountryIds'));
    const savedCountryIds = normalizeStreamingDayOneMarketIds(rawCapabilities?.activeCountryIds);
    const migrationActiveCountryIds = migratingCountryAuthority
        ? hasSavedCountryIds ? savedCountryIds : countriesFromLegacyRegions(platform.id, rawCapabilities?.activeRegionIds)
        : [];
    const marketOperations = normalizePlatformMarketOperations({
        platformId: platform.id,
        value: existing?.marketOperations,
        migrationActiveCountryIds,
        absoluteWeek,
    }).filter(operation => hasOnlyFiniteNumbers(operation));
    const activeCountryIds = normalizeStreamingDayOneMarketIds(marketOperations
        .filter(operation => operation.status === 'ACTIVE' && operation.countryId)
        .map(operation => operation.countryId!));
    const capabilities: PlatformAiCapabilities = {
        activeCountryIds,
        technologyLevels: buildTechnologyLevels(rawCapabilities, startingCapabilities),
        subtitleCoveragePercent: 0,
        dubCoveragePercent: 0,
    };
    const researchQueue = mergeHistoricalResearchQueue(
        existing?.researchQueue,
        platform.id,
        absoluteWeek,
        applyOperatingProfile,
    );
    capabilities.technologyLevels = applyOperatingResearchLevels(
        capabilities.technologyLevels,
        researchQueue,
    );
    capabilities.technologyLevels.CONTENT_OPERATIONS = getResearchBackedContentOperationsLevel(researchQueue);
    Object.assign(capabilities, getPlatformAiLocalizationCoverageFromContentOperations(capabilities.technologyLevels.CONTENT_OPERATIONS));
    const languageCapabilities = normalizeLanguageCapabilities(
        existing?.languageCapabilities,
        platform.id,
        absoluteWeek,
        applyOperatingProfile,
    );
    const slate = normalizePlatformAiSlate(existing?.slate, capabilities, schemaVersion, absoluteWeek);
    // External commitments were introduced in schema 7 and remain authoritative
    // during the schema 7 -> 8 distress migration.
    const externalCommitments: PlatformAiExternalCommitment[] = schemaVersion >= 7
        ? normalizePlatformAiExternalCommitments(
            existing?.externalCommitments,
            platform.id,
            existing?.pendingOneTimeObligations,
            undefined,
            absoluteWeek,
        )
        : [];
    let rightsContracts = normalizePlatformAiRightsContracts(existing?.rightsContracts);
    let rightsRenewals = normalizePlatformAiRightsRenewals(existing?.rightsRenewals, platform.id, rightsContracts);
    const rawLocalizationObligationIds = new Set(
        (Array.isArray(existing?.localizationJobs) ? existing!.localizationJobs : [])
            .filter(isRecord)
            .map(job => String(job.obligationId || '').trim())
            .filter(Boolean),
    );
    let pendingOneTimeObligations = reconcilePlatformAiRightsRenewalObligations(
        existing?.pendingOneTimeObligations,
        rightsRenewals,
        rawLocalizationObligationIds,
    );
    rightsRenewals = reconcilePlatformAiRightsRenewalStatuses(rightsRenewals, pendingOneTimeObligations);
    pendingOneTimeObligations = reconcilePlatformAiRightsRenewalObligations(
        pendingOneTimeObligations,
        rightsRenewals,
        rawLocalizationObligationIds,
    );
    rightsContracts = filterPlatformAiRightsContractsByRenewalState(rightsContracts, rightsRenewals);
    const localizationJobs = normalizePlatformAiLocalizationJobs(
        existing?.localizationJobs,
        platform.id,
        pendingOneTimeObligations,
        new Set(slate.filter(plan => ['RIGHTS_READY', 'DELIVERED', 'LOCALIZED'].includes(plan.status)).map(plan => plan.id)),
        slate,
        languageCapabilities,
    );
    pendingOneTimeObligations = reconcilePlatformAiLocalizationObligations(
        pendingOneTimeObligations,
        localizationJobs,
    );
    pendingOneTimeObligations = normalizePlatformAiPendingOneTimeObligations(
        reconcilePlatformAiExternalCommitmentObligations(
            pendingOneTimeObligations,
            externalCommitments,
        ),
        new Set([
            ...externalCommitments.map(commitment => commitment.obligationId),
            ...localizationJobs
                .filter(job => job.status !== 'CANCELLED' && job.costMillions > 0)
                .map(job => job.obligationId),
            ...rightsRenewals
                .filter(record => record.paymentSettledAtAbsoluteWeek !== null)
                .map(record => record.obligationId),
        ]),
    );
    const debtMillions = finiteNonNegative(existing?.debtMillions);
    const effectiveCompetenceDelta = Number(existing?.effectiveCompetenceDelta);
    const restructuringInterestRateMultiplier = Number(existing?.restructuringInterestRateMultiplier);
    const debtInterestRateAnnualPercent = Number(existing?.debtInterestRateAnnualPercent);
    const ai: PlatformAiRuntimeState = {
        schemaVersion: PLATFORM_AI_RUNTIME_SCHEMA_VERSION,
        profileId: platform.id,
        operatingProfileVersion: operatingProfile.version,
        playerAcquisitionHandoffAtAbsoluteWeek: normalizeNullableWeek(existing?.playerAcquisitionHandoffAtAbsoluteWeek),
        competence: normalizeCompetence(existing?.competence, profile.competence),
        effectiveCompetenceDelta: Number.isFinite(effectiveCompetenceDelta)
            ? Math.max(-0.5, Math.min(0.5, effectiveCompetenceDelta))
            : 0,
        lastProcessedAbsoluteWeek: normalizeProcessedCheckpoint(
            existing?.lastProcessedAbsoluteWeek,
            absoluteWeek,
            absoluteWeek,
        ),
        nextPlanningAbsoluteWeek: normalizeNextPlanningCheckpoint(
            existing?.nextPlanningAbsoluteWeek,
            absoluteWeek,
            profile.planningCadenceWeeks,
        ),
        strategyCycle: normalizeNonNegativeInteger(existing?.strategyCycle, 0),
        status: PLATFORM_AI_STATUSES.has(String(existing?.status))
            ? existing!.status
            : 'ACTIVE',
        capabilities,
        languageCapabilities,
        researchQueue,
        marketOperations,
        slate,
        rightsContracts,
        talentBookingRefs: Array.from(new Set((Array.isArray(existing?.talentBookingRefs) ? existing.talentBookingRefs : [])
            .filter((reference): reference is string => typeof reference === 'string' && Boolean(reference.trim()))
            .map(reference => reference.trim()))),
        releaseMemory: normalizeReleaseMemory(
            (Array.isArray(existing?.releaseMemory) ? existing.releaseMemory : [])
                .filter(item => isRecord(item) && hasOnlyFiniteNumbers(item)),
        ),
        genreMemory: isRecord(existing?.genreMemory) && hasOnlyFiniteNumbers(existing.genreMemory) ? existing.genreMemory : {},
        audienceMemory: isRecord(existing?.audienceMemory) && hasOnlyFiniteNumbers(existing.audienceMemory) ? existing.audienceMemory : {},
        regionalMemory: isRecord(existing?.regionalMemory) && hasOnlyFiniteNumbers(existing.regionalMemory)
            ? existing.regionalMemory as PlatformAiRuntimeState['regionalMemory'] : {},
        localizationMemory: isRecord(existing?.localizationMemory) && hasOnlyFiniteNumbers(existing.localizationMemory)
            ? existing.localizationMemory as PlatformAiRuntimeState['localizationMemory'] : {},
        talentPairMemory: isRecord(existing?.talentPairMemory) && hasOnlyFiniteNumbers(existing.talentPairMemory)
            ? existing.talentPairMemory as PlatformAiRuntimeState['talentPairMemory'] : {},
        releasePatternMemory: isRecord(existing?.releasePatternMemory) && hasOnlyFiniteNumbers(existing.releasePatternMemory)
            ? existing.releasePatternMemory as PlatformAiRuntimeState['releasePatternMemory'] : {},
        productionOutcomeMemory: isRecord(existing?.productionOutcomeMemory)
            && hasOnlyFiniteNumbers(existing.productionOutcomeMemory)
            && Array.isArray(existing.productionOutcomeMemory.observedProductionIds)
            ? {
                observedProductions: Math.max(0, Math.round(Number(existing.productionOutcomeMemory.observedProductions) || 0)),
                deliveredProductions: Math.max(0, Math.round(Number(existing.productionOutcomeMemory.deliveredProductions) || 0)),
                delayedProductions: Math.max(0, Math.round(Number(existing.productionOutcomeMemory.delayedProductions) || 0)),
                cancelledProductions: Math.max(0, Math.round(Number(existing.productionOutcomeMemory.cancelledProductions) || 0)),
                averageDelayWeeks: finiteNonNegative(existing.productionOutcomeMemory.averageDelayWeeks),
                observedProductionIds: [...new Set(existing.productionOutcomeMemory.observedProductionIds
                    .filter((id): id is string => typeof id === 'string' && Boolean(id.trim()))
                    .map(id => id.trim()))],
            }
            : {
                observedProductions: 0,
                deliveredProductions: 0,
                delayedProductions: 0,
                cancelledProductions: 0,
                averageDelayWeeks: 0,
                observedProductionIds: [],
            },
        financeHistory: normalizeFinanceHistory(existing?.financeHistory, debtMillions),
        decisionHistory: normalizeDecisionHistory(existing?.decisionHistory),
        distressEpisodes: normalizePlatformAiDistressEpisodes(
            existing?.distressEpisodes,
            platform.id,
            absoluteWeek,
            schemaVersion < PLATFORM_AI_RUNTIME_SCHEMA_VERSION ? existing?.status : undefined,
        ),
        externalRecapitalizations: normalizePlatformAiExternalRecapitalizations(
            existing?.externalRecapitalizations,
            platform.id,
        ),
        administration: normalizePlatformAiAdministration(existing?.administration),
        spendingRestrictions: normalizePlatformAiSpendingRestrictions(existing?.spendingRestrictions),
        externalCommitments,
        pendingOneTimeObligations,
        localizationJobs,
        rightsRenewals,
        pendingAudienceSettlements: normalizePlatformAiAudienceSettlements(existing?.pendingAudienceSettlements),
        audienceHealth: isRecord(existing?.audienceHealth) && hasOnlyFiniteNumbers(existing.audienceHealth)
            ? {
                engagementIndex: Math.max(0, Math.min(100, Number(existing.audienceHealth.engagementIndex) || 0)),
                catalogueStrengthIndex: Math.max(0, Math.min(100, Number(existing.audienceHealth.catalogueStrengthIndex) || 0)),
                acquiredSubscribersMillions: finiteNonNegative(existing.audienceHealth.acquiredSubscribersMillions),
                retainedSubscribersMillions: finiteNonNegative(existing.audienceHealth.retainedSubscribersMillions),
                churnedSubscribersMillions: finiteNonNegative(existing.audienceHealth.churnedSubscribersMillions),
            }
            : {
                engagementIndex: 50,
                catalogueStrengthIndex: 50,
                acquiredSubscribersMillions: 0,
                retainedSubscribersMillions: 0,
                churnedSubscribersMillions: 0,
            },
        worldEconomyFeedback: isRecord(existing?.worldEconomyFeedback) && hasOnlyFiniteNumbers(existing.worldEconomyFeedback)
            ? {
                asOfAbsoluteWeek: normalizeNonNegativeInteger(existing.worldEconomyFeedback.asOfAbsoluteWeek, absoluteWeek),
                endingPaidAccounts: finiteNonNegative(existing.worldEconomyFeedback.endingPaidAccounts),
                viewingAccounts: finiteNonNegative(existing.worldEconomyFeedback.viewingAccounts),
                hoursViewed: finiteNonNegative(existing.worldEconomyFeedback.hoursViewed),
                weeklyRevenue: finiteNonNegative(existing.worldEconomyFeedback.weeklyRevenue),
                weeklyOperatingResult: Number.isFinite(Number(existing.worldEconomyFeedback.weeklyOperatingResult))
                    ? Number(existing.worldEconomyFeedback.weeklyOperatingResult) : 0,
                audienceMomentum: Number.isFinite(Number(existing.worldEconomyFeedback.audienceMomentum))
                    ? Number(existing.worldEconomyFeedback.audienceMomentum) : 0,
                churnPressure: finiteNonNegative(existing.worldEconomyFeedback.churnPressure),
                viewingDepth: finiteNonNegative(existing.worldEconomyFeedback.viewingDepth),
                unmetDemandPressure: finiteNonNegative(existing.worldEconomyFeedback.unmetDemandPressure),
                strongestCountryId: typeof existing.worldEconomyFeedback.strongestCountryId === 'string'
                    ? existing.worldEconomyFeedback.strongestCountryId : null,
            }
            : undefined,
        debtMillions,
        lastRescueAbsoluteWeek: normalizeNullableWeek(existing?.lastRescueAbsoluteWeek),
        rescueCount: normalizeNonNegativeInteger(existing?.rescueCount, 0),
        standaloneValuationBillions: Number.isFinite(Number(existing?.standaloneValuationBillions))
            ? Math.max(0, Number(existing?.standaloneValuationBillions))
            : Math.max(0, Number(platform.valuation) || 0),
        healthyOperatingWeeks: Math.max(0, Math.round(Number(existing?.healthyOperatingWeeks) || 0)),
        restructuringStartedAtAbsoluteWeek: normalizeNullableWeek(existing?.restructuringStartedAtAbsoluteWeek),
        restructuringFailedAtAbsoluteWeek: normalizeNullableWeek(existing?.restructuringFailedAtAbsoluteWeek),
        restructuringInterestRateMultiplier: Number.isFinite(restructuringInterestRateMultiplier)
            ? Math.max(0.5, Math.min(1, restructuringInterestRateMultiplier))
            : 1,
        debtInterestRateAnnualPercent: Number.isFinite(debtInterestRateAnnualPercent)
            ? Math.max(2, Math.min(20, debtInterestRateAnnualPercent))
            : 5.2,
        outstandingApprovedContentMillions: finiteNonNegative(existing?.outstandingApprovedContentMillions),
        outstandingApprovedResearchMillions: finiteNonNegative(existing?.outstandingApprovedResearchMillions),
        intelligence: {
            ...normalizeIndustryIntelligenceState(
                existing?.intelligence,
                createInitialIndustryIntelligenceState(
                platform.id,
                'STREAMING_PLATFORM',
                createDeterministicId('platform_intelligence_seed', platform.id, playerId),
                absoluteWeek,
                ),
            ),
            platformMigration: normalizePlatformIntelligenceMigrationState(
                existing?.intelligence?.platformMigration ?? (existing as PlatformAiRuntimeState & { intelligenceMigration?: unknown } | undefined)?.intelligenceMigration,
                absoluteWeek,
            ),
        },
    };
    return { ...platform, ai };
};

export const normalizeWorldPlatformAi = (
    player: Player,
    world: WorldState,
    absoluteWeek: number,
): WorldState => {
    const sourcePlatforms = world.platforms ?? INITIAL_PLAYER.world.platforms;
    if (!sourcePlatforms) return world;
    const acquiredIds = new Set(player.ownedStreamingPlatform?.corporateDevelopment?.acquiredPlatformIds || []);
    const platforms = Object.fromEntries(Object.entries(sourcePlatforms).map(([platformId, platform]) => {
        const normalized = normalizePlatformAiState(platform, player.id, absoluteWeek);
        return [platformId, acquiredIds.has(platformId as PlatformId)
            ? applyPlatformAiPlayerAcquisitionHandoff(normalized, absoluteWeek)
            : normalized];
    })) as Record<PlatformId, PlatformState>;
    return { ...world, platforms };
};

const researchStageStandardWeeks = (
    item: PlatformAiResearchItem,
    preview: ReturnType<typeof previewStreamingResearchProgram>,
): number | null => {
    if (item.stage === 'RESEARCHING') return preview.researchWeeks;
    if (item.stage === 'PROTOTYPING') return preview.prototypeWeeks;
    if (item.stage === 'TESTING') return preview.testWeeks;
    return null;
};

/** Converts only unpaid/future AI advantages when an acquired company first becomes player-controlled. */
export const applyPlatformAiPlayerAcquisitionHandoff = (
    platform: PlatformState,
    absoluteWeek: number,
): PlatformState => {
    const sourceAi = platform.ai;
    if (!sourceAi || sourceAi.playerAcquisitionHandoffAtAbsoluteWeek !== null) return platform;
    const settlements = normalizePlatformAiAudienceSettlements(sourceAi.pendingAudienceSettlements);
    const eligibleIds = new Set(settlements
        .filter(settlement => settlement.status === 'PENDING' && settlement.createdAtAbsoluteWeek <= absoluteWeek)
        .map(settlement => settlement.id));
    const eligible = settlements.filter(settlement => eligibleIds.has(settlement.id));
    const roundMillions = (value: number): number => Math.round(value * 1_000) / 1_000;
    const audienceHealth = sourceAi.audienceHealth;
    const settledPlatform: PlatformState = eligible.length ? {
        ...platform,
        subscribers: roundMillions(Math.max(0, platform.subscribers + eligible.reduce((sum, settlement) => (
            sum + settlement.subscriberImpactMillions
        ), 0))),
        ai: {
            ...sourceAi,
            audienceHealth: {
                engagementIndex: Math.round(Math.max(0, Math.min(100,
                    audienceHealth.engagementIndex + eligible.reduce((sum, settlement) => sum + (settlement.engagementIndexDelta || 0), 0),
                )) * 100) / 100,
                catalogueStrengthIndex: Math.round(Math.max(0, Math.min(100,
                    audienceHealth.catalogueStrengthIndex + eligible.reduce((sum, settlement) => sum + (settlement.catalogueStrengthDelta || 0), 0),
                )) * 100) / 100,
                acquiredSubscribersMillions: roundMillions(audienceHealth.acquiredSubscribersMillions + eligible.reduce((sum, settlement) => (
                    sum + (settlement.acquiredSubscribersMillions || 0)
                ), 0)),
                retainedSubscribersMillions: roundMillions(audienceHealth.retainedSubscribersMillions + eligible.reduce((sum, settlement) => (
                    sum + (settlement.retainedSubscribersMillions || 0)
                ), 0)),
                churnedSubscribersMillions: roundMillions(audienceHealth.churnedSubscribersMillions + eligible.reduce((sum, settlement) => (
                    sum + (settlement.churnedSubscribersMillions || 0)
                ), 0)),
            },
            pendingAudienceSettlements: normalizePlatformAiAudienceSettlements(settlements.map(settlement => (
                eligibleIds.has(settlement.id)
                    ? { ...settlement, status: 'SETTLED' as const, settledAtAbsoluteWeek: absoluteWeek }
                    : settlement
            ))),
        },
    } : platform;
    const ai = settledPlatform.ai;
    if (!ai || ai.playerAcquisitionHandoffAtAbsoluteWeek !== null) return platform;
    const researchQueue = ai.researchQueue.map(item => {
        if (item.stage === 'OPERATING') return item;
        const researchDefinition = STREAMING_RESEARCH_DEFINITIONS.find(definition => definition.id === item.researchDefinitionId);
        const technologyDefinition = STREAMING_TECHNOLOGY_DEFINITIONS.find(definition => definition.id === item.technologyDefinitionId);
        if (!researchDefinition || !technologyDefinition) return item;
        const researchPreview = previewStreamingResearchProgram(researchDefinition, item.buildMode);
        const technologyPreview = previewStreamingTechnologyProject(technologyDefinition, item.buildMode);
        const currentStageStandardWeeks = researchStageStandardWeeks(item, researchPreview);
        const elapsedCurrentStageWeeks = Math.max(0, absoluteWeek - item.stageStartedAtAbsoluteWeek);
        const stageReadyAtAbsoluteWeek = currentStageStandardWeeks === null
            ? item.stageReadyAtAbsoluteWeek
            : Math.max(
                item.stageReadyAtAbsoluteWeek,
                absoluteWeek + Math.max(0, currentStageStandardWeeks - elapsedCurrentStageWeeks),
            );
        const ipPaid = item.stage === 'READY_TO_INSTALL' || item.stage === 'INSTALLING';
        const installationPaid = item.stage === 'INSTALLING';
        const standardInstallationCost = fullCurrencyToMillions(technologyPreview.capitalCost);
        const standardInstallationWeeks = technologyPreview.constructionWeeks;
        return {
            ...item,
            researchWeeks: item.stage === 'RESEARCHING' ? researchPreview.researchWeeks : item.researchWeeks,
            prototypeWeeks: ['RESEARCHING', 'PROTOTYPING'].includes(item.stage) ? researchPreview.prototypeWeeks : item.prototypeWeeks,
            testWeeks: ['RESEARCHING', 'PROTOTYPING', 'TESTING'].includes(item.stage) ? researchPreview.testWeeks : item.testWeeks,
            ipCostMillions: ipPaid ? item.ipCostMillions : fullCurrencyToMillions(previewStreamingResearchIpCost(
                { patentCost: researchPreview.patentCost }, item.ipStrategy,
            )),
            installationCostMillions: installationPaid ? item.installationCostMillions : standardInstallationCost,
            installationWeeks: installationPaid ? item.installationWeeks : standardInstallationWeeks,
            installationEfficiencySnapshot: installationPaid
                ? item.installationEfficiencySnapshot
                : createPlatformAiEfficiencySnapshot(
                    standardInstallationCost,
                    standardInstallationWeeks,
                    null,
                    'INSTALLATION',
                    'PLAYER',
                ),
            stageReadyAtAbsoluteWeek,
        };
    });
    let pendingOneTimeObligations = ai.pendingOneTimeObligations;
    const localizationJobs = ai.localizationJobs.map(job => {
        if (job.status !== 'WAITING_FOR_FUNDS') return job;
        const plan = ai.slate.find(item => item.id === job.contentPlanId);
        if (!plan) return job;
        const quote = quotePlatformAiLocalization({
            projectType: plan.projectType,
            mode: job.mode,
            capabilityTier: job.capabilityTierAtPlanning,
            countryIds: job.countryIds,
            controller: 'PLAYER',
        });
        const efficiencySnapshot = createPlatformAiEfficiencySnapshot(
            quote.standardCostMillions,
            quote.standardLeadWeeks,
            null,
            'LOCALIZATION',
            'PLAYER',
        );
        pendingOneTimeObligations = pendingOneTimeObligations.map(obligation => (
            obligation.id === job.obligationId && obligation.status === 'HELD'
                ? { ...obligation, amountMillions: quote.standardCostMillions }
                : obligation
        ));
        return {
            ...job,
            costMillions: quote.standardCostMillions,
            leadWeeks: quote.standardLeadWeeks,
            efficiencySnapshot,
        };
    });
    return {
        ...settledPlatform,
        ai: {
            ...ai,
            playerAcquisitionHandoffAtAbsoluteWeek: absoluteWeek,
            spendingRestrictions: {
                source: 'NONE',
                blocksNewBids: false,
                blocksNewGreenlights: false,
                blocksNewResearch: false,
                blocksExpansion: false,
                expiresAtAbsoluteWeek: null,
            },
            researchQueue,
            localizationJobs,
            pendingOneTimeObligations,
        },
    };
};
