import {
    STREAMING_RIGHTS_CALENDAR_SCHEMA_VERSION,
    type OwnedStreamingCatalogLicense,
    type Message,
    type Player,
    type StreamingRightsCalendarDigest,
    type StreamingRightsCalendarState,
    type StreamingRightsContract,
    type StreamingRightsControlMode,
    type StreamingRightsDistributionPriority,
    type StreamingRightsDurationPreference,
    type StreamingRightsExclusivityPolicy,
    type StreamingRightsFinancialPriority,
    type StreamingRightsManagementState,
    type StreamingRightsPartnerPreference,
    type StreamingRightsRenewalCase,
    type StreamingRightsRenewalCaseRegistry,
    type StreamingRightsRenewalEconomics,
    type StreamingRightsRenewalPerformanceSnapshot,
    type StreamingRightsRenewalPreference,
    type StreamingRightsStudioMandate,
    type StreamingRightsTitleControlOverride,
} from '../types';
import { createDeterministicId, createDeterministicRng } from './deterministicRandom';
import {
    createStreamingLicenseContract,
    createStreamingRightsContractFromLicense,
    isStreamingLicenseActiveAt,
    normalizeStreamingRightsContractRegistry,
    registerStreamingRightsContract,
} from './streamingRightsCore';
import { resolveStreamingRightsCompatibility } from './streamingRightsCompatibility';
import { normalizeStreamingCataloguePackagePolicy } from './streamingCataloguePackages';
import {
    createStreamingRightsDelegationTrace,
    normalizeStreamingRightsDelegationTrace,
} from './streamingRightsDelegation';

const DEFAULT_NOTICE_WEEKS = 8;
const MAX_DIGESTS = 20;

const asRecord = (value: unknown): Record<string, any> => (
    value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {}
);
const finiteWeek = (value: unknown, fallback: number): number => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(-1, Math.round(numeric)) : fallback;
};
const finiteNonNegative = (value: unknown, fallback = 0): number => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(0, numeric) : fallback;
};
const finitePercent = (value: unknown, fallback: number): number => (
    Math.max(0, Math.min(100, finiteNonNegative(value, fallback)))
);
const cleanText = (value: unknown, fallback = '', maxLength = 180): string => {
    const text = typeof value === 'string' ? value.trim() : '';
    return (text || fallback).slice(0, maxLength);
};
const uniqueText = (value: unknown): string[] => Array.from(new Set(
    (Array.isArray(value) ? value : [])
        .map(item => cleanText(item))
        .filter(Boolean),
)).sort();
const clamp = (value: number, minimum = 0, maximum = 100): number => (
    Math.max(minimum, Math.min(maximum, Number.isFinite(value) ? value : minimum))
);
const roundMoney = (value: number): number => Math.max(0, Math.round(value / 100_000) * 100_000);

const CONTROL_MODES = new Set<StreamingRightsControlMode>(['STRATEGY', 'CUSTOM', 'FULL']);
const PREFERENCES = new Set<StreamingRightsRenewalPreference>([
    'BALANCED', 'RENEW_WINNERS', 'RETEST_MARKET', 'UPFRONT_SECURITY', 'BACKEND_UPSIDE', 'RELATIONSHIP_FIRST',
]);
const FINANCIAL_PRIORITIES = new Set<StreamingRightsFinancialPriority>(['UPFRONT_SECURITY', 'BALANCED_RETURN', 'BACKEND_UPSIDE']);
const DISTRIBUTION_PRIORITIES = new Set<StreamingRightsDistributionPriority>(['GLOBAL_PARTNER', 'REGIONAL_OPTIMIZATION', 'BROAD_NON_EXCLUSIVE']);
const EXCLUSIVITY_POLICIES = new Set<StreamingRightsExclusivityPolicy>(['ALLOW_WITHIN_LIMITS', 'RESTRICT', 'REQUIRE_APPROVAL']);
const DURATION_PREFERENCES = new Set<StreamingRightsDurationPreference>(['SHORT', 'BALANCED', 'LONG']);
const PARTNER_PREFERENCES = new Set<StreamingRightsPartnerPreference>(['STRONGEST_ECONOMICS', 'WIDEST_REACH', 'TRUSTED_RELATIONSHIPS']);
const TITLE_CONTROL_OVERRIDES = new Set<StreamingRightsTitleControlOverride>(['MANUAL', 'DELEGATED']);
const CASE_STATUSES = new Set<StreamingRightsRenewalCase['status']>([
    'WATCHING', 'OFFER_AVAILABLE', 'ACTION_REQUIRED', 'RENEWAL_SECURED', 'RETURNING_TO_MARKET',
    'LETTING_EXPIRE', 'NO_OFFER', 'EXPIRED',
]);
const CASE_OUTCOMES = new Set<StreamingRightsRenewalCase['outcome']>([
    'PENDING', 'ACCEPTED', 'DELEGATED_ACCEPTED', 'RETURN_TO_MARKET', 'LET_EXPIRE', 'NO_OFFER',
]);
const OFFER_DISPOSITIONS = new Set<StreamingRightsRenewalCase['offerDisposition']>([
    'PENDING', 'OFFERED', 'DECLINED',
]);

const normalizeStudioMandate = (
    studioId: string,
    value: unknown,
    legacy: StreamingRightsManagementState['policy'],
    legacyControlMode: StreamingRightsControlMode,
): StreamingRightsStudioMandate => {
    const source = asRecord(value);
    const titleOverrides = Object.fromEntries(Object.entries(asRecord(source.titleOverrides))
        .filter((entry): entry is [string, StreamingRightsTitleControlOverride] => (
            Boolean(cleanText(entry[0])) && TITLE_CONTROL_OVERRIDES.has(entry[1] as StreamingRightsTitleControlOverride)
        ))
        .map(([projectId, override]) => [cleanText(projectId), override]));
    const positiveMoney = Number(source.maximumAutomaticGuarantee);
    const positiveDuration = Number(source.maximumAutomaticDurationWeeks);
    return {
        studioId: cleanText(studioId, 'player-studio', 120),
        controlMode: CONTROL_MODES.has(source.controlMode as StreamingRightsControlMode)
            ? source.controlMode as StreamingRightsControlMode
            : legacyControlMode,
        financialPriority: FINANCIAL_PRIORITIES.has(source.financialPriority as StreamingRightsFinancialPriority)
            ? source.financialPriority as StreamingRightsFinancialPriority
            : 'BALANCED_RETURN',
        distributionPriority: DISTRIBUTION_PRIORITIES.has(source.distributionPriority as StreamingRightsDistributionPriority)
            ? source.distributionPriority as StreamingRightsDistributionPriority
            : 'REGIONAL_OPTIMIZATION',
        exclusivityPolicy: EXCLUSIVITY_POLICIES.has(source.exclusivityPolicy as StreamingRightsExclusivityPolicy)
            ? source.exclusivityPolicy as StreamingRightsExclusivityPolicy
            : 'ALLOW_WITHIN_LIMITS',
        durationPreference: DURATION_PREFERENCES.has(source.durationPreference as StreamingRightsDurationPreference)
            ? source.durationPreference as StreamingRightsDurationPreference
            : 'BALANCED',
        partnerPreference: PARTNER_PREFERENCES.has(source.partnerPreference as StreamingRightsPartnerPreference)
            ? source.partnerPreference as StreamingRightsPartnerPreference
            : 'STRONGEST_ECONOMICS',
        renewalPreference: PREFERENCES.has(source.renewalPreference as StreamingRightsRenewalPreference)
            ? source.renewalPreference as StreamingRightsRenewalPreference
            : legacy.preference,
        maximumAutomaticGuarantee: Number.isFinite(positiveMoney) && positiveMoney > 0
            ? Math.min(1_000_000_000, Math.round(positiveMoney))
            : legacy.maximumAutomaticGuarantee,
        maximumAutomaticDurationWeeks: Number.isFinite(positiveDuration) && positiveDuration >= 13
            ? Math.max(13, Math.min(260, Math.round(positiveDuration)))
            : legacy.maximumAutomaticDurationWeeks,
        protectGlobalExclusives: source.protectGlobalExclusives === undefined
            ? legacy.protectGlobalExclusives
            : source.protectGlobalExclusives !== false,
        protectFranchises: source.protectFranchises === undefined
            ? legacy.protectFranchises
            : source.protectFranchises !== false,
        titleOverrides,
        revision: Math.max(1, Math.round(finiteNonNegative(source.revision, 1))),
        updatedAtAbsoluteWeek: Math.max(0, finiteWeek(source.updatedAtAbsoluteWeek, 0)),
    };
};

export const normalizeStreamingRightsManagementState = (
    value: unknown,
): StreamingRightsManagementState => {
    const source = asRecord(value);
    const policy = asRecord(source.policy);
    const controlMode = CONTROL_MODES.has(source.controlMode as StreamingRightsControlMode)
        ? source.controlMode as StreamingRightsControlMode
        : 'CUSTOM';
    const preference = PREFERENCES.has(policy.preference as StreamingRightsRenewalPreference)
        ? policy.preference as StreamingRightsRenewalPreference
        : 'BALANCED';
    const normalizedPolicy: StreamingRightsManagementState['policy'] = {
        noticeWeeks: Math.max(2, Math.min(26, Math.round(finiteNonNegative(policy.noticeWeeks, DEFAULT_NOTICE_WEEKS)))),
        preference,
        autoRenewMinimumScore: finitePercent(policy.autoRenewMinimumScore, 62),
        letWeakContractsExpireBelowScore: finitePercent(policy.letWeakContractsExpireBelowScore, 35),
        maximumAutomaticGuarantee: Math.round(finiteNonNegative(policy.maximumAutomaticGuarantee, 150_000_000)),
        maximumAutomaticDurationWeeks: Math.max(13, Math.min(260, Math.round(finiteNonNegative(policy.maximumAutomaticDurationWeeks, 104)))),
        protectGlobalExclusives: policy.protectGlobalExclusives !== false,
        protectFranchises: policy.protectFranchises !== false,
    };
    const studioMandates = Object.fromEntries(Object.entries(asRecord(source.studioMandates))
        .map(([studioId, mandate]) => [cleanText(studioId), normalizeStudioMandate(studioId, mandate, normalizedPolicy, controlMode)])
        .filter(([studioId]) => Boolean(studioId)));
    return {
        schemaVersion: STREAMING_RIGHTS_CALENDAR_SCHEMA_VERSION,
        controlMode,
        policy: normalizedPolicy,
        packagePolicy: normalizeStreamingCataloguePackagePolicy(source.packagePolicy),
        protectedProjectIds: uniqueText(source.protectedProjectIds),
        manualContractIds: uniqueText(source.manualContractIds),
        studioMandates,
        updatedAtAbsoluteWeek: Math.max(0, finiteWeek(source.updatedAtAbsoluteWeek, 0)),
    };
};

export const getStreamingRightsStudioMandate = (
    player: Player,
    studioId: string,
): StreamingRightsStudioMandate => {
    const management = normalizeStreamingRightsManagementState(player.streamingRightsManagement);
    return getStreamingRightsStudioMandateFromManagement(management, studioId);
};

const getStreamingRightsStudioMandateFromManagement = (
    management: StreamingRightsManagementState,
    studioId: string,
): StreamingRightsStudioMandate => {
    const cleanStudioId = cleanText(studioId, 'player-studio', 120);
    return management.studioMandates[cleanStudioId]
        || normalizeStudioMandate(cleanStudioId, undefined, management.policy, management.controlMode);
};

export interface UpdateStreamingRightsStudioMandateInput {
    studioId: string;
    absoluteWeek: number;
    patch: Partial<Omit<StreamingRightsStudioMandate, 'studioId' | 'revision' | 'updatedAtAbsoluteWeek'>>;
}

export const updateStreamingRightsStudioMandate = (
    player: Player,
    input: UpdateStreamingRightsStudioMandateInput,
): Player => {
    const management = normalizeStreamingRightsManagementState(player.streamingRightsManagement);
    const studioId = cleanText(input.studioId, 'player-studio', 120);
    const current = getStreamingRightsStudioMandate(player, studioId);
    const candidate = normalizeStudioMandate(studioId, { ...current, ...input.patch }, management.policy, current.controlMode);
    const comparable = (mandate: StreamingRightsStudioMandate) => JSON.stringify({
        ...mandate,
        revision: 0,
        updatedAtAbsoluteWeek: 0,
    });
    if (comparable(candidate) === comparable(current)) return player;
    const nextMandate: StreamingRightsStudioMandate = {
        ...candidate,
        revision: current.revision + 1,
        updatedAtAbsoluteWeek: Math.max(0, Math.round(Number(input.absoluteWeek) || 0)),
    };
    return {
        ...player,
        streamingRightsManagement: {
            ...management,
            controlMode: nextMandate.controlMode,
            policy: {
                ...management.policy,
                preference: nextMandate.renewalPreference,
                maximumAutomaticGuarantee: nextMandate.maximumAutomaticGuarantee,
                maximumAutomaticDurationWeeks: nextMandate.maximumAutomaticDurationWeeks,
                protectGlobalExclusives: nextMandate.protectGlobalExclusives,
                protectFranchises: nextMandate.protectFranchises,
            },
            studioMandates: { ...management.studioMandates, [studioId]: nextMandate },
            updatedAtAbsoluteWeek: nextMandate.updatedAtAbsoluteWeek,
        },
    };
};

export interface UpdateStreamingRightsManagementInput {
    controlMode?: StreamingRightsControlMode;
    preference?: StreamingRightsRenewalPreference;
    absoluteWeek: number;
}

export const updateStreamingRightsManagement = (
    player: Player,
    input: UpdateStreamingRightsManagementInput,
): Player => {
    const current = normalizeStreamingRightsManagementState(player.streamingRightsManagement);
    const next = normalizeStreamingRightsManagementState({
        ...current,
        controlMode: input.controlMode || current.controlMode,
        policy: {
            ...current.policy,
            preference: input.preference || current.policy.preference,
        },
        updatedAtAbsoluteWeek: input.absoluteWeek,
    });
    if (
        next.controlMode === current.controlMode
        && next.policy.preference === current.policy.preference
        && next.updatedAtAbsoluteWeek === current.updatedAtAbsoluteWeek
    ) return player;
    return { ...player, streamingRightsManagement: next };
};

const normalizeParty = (
    value: unknown,
    fallback: StreamingRightsContract['seller'],
): StreamingRightsContract['seller'] => {
    const source = asRecord(value);
    const type = ['PLAYER_STUDIO', 'NPC_STUDIO', 'PLAYER_PLATFORM', 'AI_PLATFORM'].includes(source.type)
        ? source.type
        : fallback.type;
    return {
        type,
        id: cleanText(source.id, fallback.id),
        name: cleanText(source.name, fallback.name, 140),
        platformId: source.platformId === null || typeof source.platformId === 'string'
            ? source.platformId as any
            : fallback.platformId,
    };
};

const normalizeRenewalCase = (value: unknown): StreamingRightsRenewalCase | null => {
    const source = asRecord(value);
    const id = cleanText(source.id);
    const sourceContractId = cleanText(source.sourceContractId);
    const sourceProjectId = cleanText(source.sourceProjectId);
    if (!id || !sourceContractId || !sourceProjectId) return null;
    const sellerFallback: StreamingRightsContract['seller'] = {
        type: 'NPC_STUDIO', id: 'unknown-studio', name: 'Rights holder', platformId: null,
    };
    const buyerFallback: StreamingRightsContract['buyer'] = {
        type: 'AI_PLATFORM', id: 'NETFLIX', name: 'Streaming platform', platformId: 'NETFLIX',
    };
    const performanceSource = source.performance === null ? null : asRecord(source.performance);
    const economicsSource = source.proposedEconomics === null ? null : asRecord(source.proposedEconomics);
    const performance = performanceSource === null ? null : {
        attributedRevenue: finiteNonNegative(performanceSource.attributedRevenue),
        viewingAccounts: finiteNonNegative(performanceSource.viewingAccounts),
        watchHours: finiteNonNegative(performanceSource.watchHours),
        subscriberAcquisition: finiteNonNegative(performanceSource.subscriberAcquisition),
        subscriberRetention: finiteNonNegative(performanceSource.subscriberRetention),
        royaltiesPaid: finiteNonNegative(performanceSource.royaltiesPaid),
        rating: finiteNonNegative(performanceSource.rating),
        awards: Math.round(finiteNonNegative(performanceSource.awards)),
        performanceScore: finitePercent(performanceSource.performanceScore, 0),
        marketDemandScore: finitePercent(performanceSource.marketDemandScore, 0),
        relationshipScore: finitePercent(performanceSource.relationshipScore, 50),
        rivalInterestScore: finitePercent(performanceSource.rivalInterestScore, 0),
        affordabilityScore: finitePercent(performanceSource.affordabilityScore, 50),
    };
    const proposedEconomics = economicsSource === null ? null : {
        minimumGuarantee: Math.round(finiteNonNegative(economicsSource.minimumGuarantee)),
        platformRevenueShare: finitePercent(economicsSource.platformRevenueShare, 75),
        licensorRevenueShare: finitePercent(economicsSource.licensorRevenueShare, 25),
        durationWeeks: Math.max(1, Math.round(finiteNonNegative(economicsSource.durationWeeks, 52))),
        offerExpiresAtAbsoluteWeek: Math.max(0, finiteWeek(economicsSource.offerExpiresAtAbsoluteWeek, 0)),
    };
    return {
        id,
        idempotencyKey: cleanText(source.idempotencyKey, `streaming-renewal-case:${id}`),
        sourceContractId,
        sourceProjectId,
        title: cleanText(source.title, 'Untitled project', 140),
        projectType: source.projectType === 'SERIES' ? 'SERIES' : 'MOVIE',
        genre: cleanText(source.genre, 'Licensed', 80),
        territory: ['DOMESTIC', 'MULTI_REGION', 'GLOBAL'].includes(source.territory) ? source.territory : 'GLOBAL',
        countryIds: uniqueText(source.countryIds),
        exclusivity: source.exclusivity === 'NON_EXCLUSIVE' ? 'NON_EXCLUSIVE' : 'EXCLUSIVE',
        windowType: ['FIRST_WINDOW', 'SECOND_WINDOW', 'PERMANENT'].includes(source.windowType)
            ? source.windowType
            : 'FIRST_WINDOW',
        seller: normalizeParty(source.seller, sellerFallback),
        incumbentBuyer: normalizeParty(source.incumbentBuyer, buyerFallback),
        sourceExpiresAtAbsoluteWeek: Math.max(0, finiteWeek(source.sourceExpiresAtAbsoluteWeek, 0)),
        renewalStartsAtAbsoluteWeek: Math.max(0, finiteWeek(source.renewalStartsAtAbsoluteWeek, 0)),
        openedAtAbsoluteWeek: Math.max(0, finiteWeek(source.openedAtAbsoluteWeek, 0)),
        decisionDeadlineAbsoluteWeek: Math.max(0, finiteWeek(source.decisionDeadlineAbsoluteWeek, 0)),
        renewalOption: Boolean(source.renewalOption),
        status: CASE_STATUSES.has(source.status) ? source.status : 'WATCHING',
        offerDisposition: OFFER_DISPOSITIONS.has(source.offerDisposition) ? source.offerDisposition : 'PENDING',
        performance,
        proposedEconomics,
        controlModeAtOpen: CONTROL_MODES.has(source.controlModeAtOpen) ? source.controlModeAtOpen : 'CUSTOM',
        policyPreferenceAtOpen: PREFERENCES.has(source.policyPreferenceAtOpen) ? source.policyPreferenceAtOpen : 'BALANCED',
        protectionReasons: uniqueText(source.protectionReasons),
        delegatedReason: cleanText(source.delegatedReason) || null,
        ...(normalizeStreamingRightsDelegationTrace(source.delegationTrace)
            ? { delegationTrace: normalizeStreamingRightsDelegationTrace(source.delegationTrace) }
            : {}),
        outcome: CASE_OUTCOMES.has(source.outcome) ? source.outcome : 'PENDING',
        replacementContractId: cleanText(source.replacementContractId) || null,
        resolvedAtAbsoluteWeek: source.resolvedAtAbsoluteWeek === null || source.resolvedAtAbsoluteWeek === undefined
            ? null
            : Math.max(0, finiteWeek(source.resolvedAtAbsoluteWeek, 0)),
        lastProcessedAbsoluteWeek: Math.max(0, finiteWeek(source.lastProcessedAbsoluteWeek, 0)),
    };
};

const normalizeDigest = (value: unknown): StreamingRightsCalendarDigest | null => {
    const source = asRecord(value);
    const id = cleanText(source.id);
    if (!id) return null;
    return {
        id,
        absoluteWeek: Math.max(0, finiteWeek(source.absoluteWeek, 0)),
        actionRequired: Math.round(finiteNonNegative(source.actionRequired)),
        approachingExpiry: Math.round(finiteNonNegative(source.approachingExpiry)),
        delegatedRenewals: Math.round(finiteNonNegative(source.delegatedRenewals)),
        returnedToMarket: Math.round(finiteNonNegative(source.returnedToMarket)),
        expired: Math.round(finiteNonNegative(source.expired)),
        summary: cleanText(source.summary, 'Rights Desk update', 240),
    };
};

export const normalizeStreamingRightsCalendarState = (
    value: unknown,
): StreamingRightsCalendarState => {
    const source = asRecord(value);
    const renewalCases: StreamingRightsRenewalCaseRegistry = {};
    Object.values(asRecord(source.renewalCases)).forEach(raw => {
        const normalized = normalizeRenewalCase(raw);
        if (normalized && !renewalCases[normalized.id]) renewalCases[normalized.id] = normalized;
    });
    const digests = (Array.isArray(source.digests) ? source.digests : [])
        .map(normalizeDigest)
        .filter((digest): digest is StreamingRightsCalendarDigest => Boolean(digest))
        .sort((left, right) => right.absoluteWeek - left.absoluteWeek || left.id.localeCompare(right.id))
        .slice(0, MAX_DIGESTS);
    return {
        schemaVersion: STREAMING_RIGHTS_CALENDAR_SCHEMA_VERSION,
        renewalCases,
        digests,
        urgentNoticeKeys: uniqueText(source.urgentNoticeKeys).slice(-100),
        lastProcessedAbsoluteWeek: finiteWeek(source.lastProcessedAbsoluteWeek, -1),
    };
};

const findProjectRecord = (player: Player, projectId: string): Record<string, any> => {
    const sources = [
        ...(player.world.projects || []),
        ...(player.pastProjects || []),
        ...(player.activeReleases || []),
    ] as any[];
    return sources.find(candidate => candidate?.id === projectId || candidate?.projectId === projectId) || {};
};

const getProjectRatingScore = (project: Record<string, any>): number => {
    const raw = Number(
        project.imdbRating
        ?? project.rating
        ?? project.finalRating
        ?? project.audienceRating
        ?? project.finalQuality
        ?? project.quality,
    );
    if (!Number.isFinite(raw)) return 50;
    return clamp(raw <= 10 ? raw * 10 : raw);
};

const relationshipScoreFor = (player: Player, contract: StreamingRightsContract): number => {
    const buyerId = contract.buyer.platformId || contract.buyer.id;
    const sellerStudio = (player.businesses || []).find(business => business.id === contract.seller.id)
        || (player.businesses || []).find(business => business.type === 'PRODUCTION_HOUSE');
    const relationship = sellerStudio?.studioState?.platformRelations?.[buyerId];
    if (!relationship) return 50;
    return clamp(
        50
        + Number(relationship.trustModifier || 0) * 1.5
        + Number(relationship.loyaltyScore || 0) * 0.25
        + Math.min(12, Number(relationship.completedDeals || 0) * 1.5)
        + Math.min(8, Number(relationship.profitableDeals || 0) * 1.5)
        - Math.min(25, Number(relationship.recoveryWeeksRemaining || 0) * 2),
    );
};

const platformAffordabilityFor = (
    player: Player,
    contract: StreamingRightsContract,
    absoluteWeek: number,
): { score: number; blocked: boolean } => {
    const originalGuarantee = Math.max(1, contract.minimumGuarantee);
    if (contract.buyer.type === 'PLAYER_PLATFORM') {
        const treasury = Math.max(0, Number(player.ownedStreamingPlatform.treasuryCash || 0));
        return { score: clamp((treasury / originalGuarantee) * 20), blocked: treasury <= 0 };
    }
    const platformId = contract.buyer.platformId;
    const platform = platformId ? player.world.platforms?.[platformId] : undefined;
    if (!platform) return { score: 35, blocked: false };
    const availableCash = Math.max(0, Number(platform.cashReserve || 0) * 1_000_000);
    const restrictions = platform.ai?.spendingRestrictions;
    const restrictionActive = Boolean(
        restrictions?.blocksNewBids
        && (restrictions.expiresAtAbsoluteWeek === null || restrictions.expiresAtAbsoluteWeek >= absoluteWeek),
    );
    const companyBlocked = platform.ai?.status === 'DORMANT' || Boolean(platform.ai?.administration);
    const debtPenalty = clamp(Number(platform.ai?.debtMillions || 0) / Math.max(1, Number(platform.cashReserve || 1)) * 18, 0, 35);
    const distressPenalty = platform.ai?.status === 'DISTRESSED' ? 18 : platform.ai?.status === 'RESTRUCTURING' ? 28 : 0;
    return {
        score: clamp((availableCash / originalGuarantee) * 16 - debtPenalty - distressPenalty),
        blocked: restrictionActive || companyBlocked,
    };
};

export interface StreamingRightsRenewalOfferEvaluation {
    offerDisposition: StreamingRightsRenewalCase['offerDisposition'];
    performance: StreamingRightsRenewalPerformanceSnapshot;
    proposedEconomics: StreamingRightsRenewalEconomics | null;
    declineReason: string | null;
}

export const buildStreamingRightsRenewalOffer = (
    player: Player,
    contract: StreamingRightsContract,
    absoluteWeek: number,
): StreamingRightsRenewalOfferEvaluation => {
    const settlements = Object.values(player.world.streamingRoyaltySettlements || {})
        .filter(settlement => settlement.contractId === contract.id);
    const attributedRevenueFromSettlements = settlements
        .reduce((sum, settlement) => sum + Math.max(0, Number(settlement.adjustedGrossReceipts || 0)), 0);
    const royaltyPaidFromSettlements = settlements
        .reduce((sum, settlement) => sum + Math.max(0, Number(settlement.royaltyPaid || 0)), 0);
    const ownedTitleRows = (player.ownedStreamingPlatform.weeklyHistory || [])
        .flatMap(snapshot => snapshot.operations?.titlePerformance || [])
        .filter(row => row.projectId === contract.sourceProjectId);
    const ownedAttributedRevenue = ownedTitleRows
        .reduce((sum, row) => sum + Math.max(0, Number(row.attributedSubscriptionRevenue || 0)), 0);
    const viewingAccounts = ownedTitleRows
        .reduce((sum, row) => sum + Math.max(0, Number(row.viewingAccounts || 0)), 0);
    const watchHours = ownedTitleRows
        .reduce((sum, row) => sum + Math.max(0, Number(row.hoursViewed || 0)), 0);

    const platformId = contract.buyer.platformId;
    const releaseMemories = platformId
        ? (player.world.platforms?.[platformId]?.ai?.releaseMemory || [])
            .filter(memory => memory.projectId === contract.sourceProjectId)
        : [];
    const latestMemory = [...releaseMemories]
        .sort((left, right) => right.releasedAtAbsoluteWeek - left.releasedAtAbsoluteWeek)[0];
    const aiViewingMillions = (latestMemory?.regionalResults || [])
        .reduce((sum, row) => sum + Math.max(0, Number(row.viewsMillions || 0)), 0);
    const subscriberImpact = Number(latestMemory?.subscriberImpactMillions || 0);
    const project = findProjectRecord(player, contract.sourceProjectId);
    const rating = getProjectRatingScore(project);
    const awards = Math.max(
        Number(latestMemory?.awardWins || 0),
        (player.world.awardHistory || []).filter((entry: any) => (
            entry?.projectId === contract.sourceProjectId || entry?.movieId === contract.sourceProjectId
        )).length,
    );
    const attributedRevenue = attributedRevenueFromSettlements + ownedAttributedRevenue;
    const originalGuarantee = Math.max(1, contract.minimumGuarantee);
    const hasObservedSignals = Boolean(
        settlements.length || ownedTitleRows.length || latestMemory || project.id || project.projectId,
    );
    const revenueScore = clamp((attributedRevenue / originalGuarantee) * 42);
    const commercialScore = latestMemory ? clamp(Number(latestMemory.commercialScore || 0)) : rating;
    const qualityScore = latestMemory ? clamp(Number(latestMemory.quality || 0)) : rating;
    const audienceScaleScore = clamp(viewingAccounts / 800_000 + aiViewingMillions * 1.6);
    const subscriberScore = clamp(50 + subscriberImpact * 9);
    const awardScore = clamp(awards * 15);
    const performanceScore = hasObservedSignals
        ? clamp(
            commercialScore * 0.28
            + qualityScore * 0.16
            + rating * 0.12
            + revenueScore * 0.2
            + audienceScaleScore * 0.08
            + subscriberScore * 0.1
            + awardScore * 0.06,
        )
        : 50;
    const rng = createDeterministicRng(`streaming-renewal:${contract.id}:${contract.expiresAtAbsoluteWeek + 1}`);
    const rivalInterestScore = clamp(24 + rng() * 68 + Math.max(0, performanceScore - 60) * 0.18);
    const territoryBase = contract.territory === 'GLOBAL'
        ? 78
        : clamp(38 + (contract.countryIds || []).length * 8, 38, 76);
    const genreDemand = player.world.trendingGenre === contract.genre ? 12 : 0;
    const marketDemandScore = clamp(territoryBase * 0.48 + performanceScore * 0.32 + rivalInterestScore * 0.2 + genreDemand);
    const relationshipScore = relationshipScoreFor(player, contract);
    const affordability = platformAffordabilityFor(player, contract, absoluteWeek);
    const performance: StreamingRightsRenewalPerformanceSnapshot = {
        attributedRevenue,
        viewingAccounts: viewingAccounts + aiViewingMillions * 1_000_000,
        watchHours,
        subscriberAcquisition: Math.max(0, subscriberImpact) * 1_000_000,
        subscriberRetention: Math.max(0, subscriberImpact * 0.55) * 1_000_000,
        royaltiesPaid: Math.max(contract.cumulativeRoyaltyPaid, royaltyPaidFromSettlements),
        rating: rating / 10,
        awards,
        performanceScore,
        marketDemandScore,
        relationshipScore,
        rivalInterestScore,
        affordabilityScore: affordability.score,
    };
    if (affordability.blocked) {
        return {
            offerDisposition: 'DECLINED',
            performance,
            proposedEconomics: null,
            declineReason: 'The incumbent is restricted from making new rights commitments.',
        };
    }
    if (affordability.score < 8 || (performanceScore < 18 && !contract.renewalOption)) {
        return {
            offerDisposition: 'DECLINED',
            performance,
            proposedEconomics: null,
            declineReason: affordability.score < 8
                ? 'The incumbent cannot afford a responsible renewal commitment.'
                : 'The incumbent declined to renew after the title underperformed.',
        };
    }
    const valuationMultiplier = clamp(
        0.44
        + performanceScore * 0.0065
        + marketDemandScore * 0.0015
        + relationshipScore * 0.001
        + rivalInterestScore * 0.0015,
        0.45,
        1.85,
    );
    const affordabilityCeiling = contract.buyer.type === 'PLAYER_PLATFORM'
        ? Math.max(0, player.ownedStreamingPlatform.treasuryCash * 0.35)
        : Math.max(0, Number(platformId ? player.world.platforms?.[platformId]?.cashReserve || 0 : 0) * 1_000_000 * 0.18);
    const rawGuarantee = originalGuarantee * valuationMultiplier;
    const minimumGuarantee = roundMoney(Math.min(rawGuarantee, Math.max(originalGuarantee * 0.35, affordabilityCeiling)));
    const licensorShareDelta = clamp((performanceScore - 50) / 8 + (rivalInterestScore - 50) / 18, -7, 10);
    const preference = normalizeStreamingRightsManagementState(player.streamingRightsManagement).policy.preference;
    const preferenceBackendDelta = preference === 'BACKEND_UPSIDE' ? 3 : preference === 'UPFRONT_SECURITY' ? -2 : 0;
    const licensorRevenueShare = clamp(contract.licensorRevenueShare + licensorShareDelta + preferenceBackendDelta, 5, 45);
    const durationWeeks = performanceScore >= 82 && relationshipScore >= 60
        ? 104
        : performanceScore >= 62 ? 78 : 52;
    return {
        offerDisposition: 'OFFERED',
        performance,
        proposedEconomics: {
            minimumGuarantee,
            platformRevenueShare: Math.round((100 - licensorRevenueShare) * 10) / 10,
            licensorRevenueShare: Math.round(licensorRevenueShare * 10) / 10,
            durationWeeks,
            offerExpiresAtAbsoluteWeek: contract.expiresAtAbsoluteWeek,
        },
        declineReason: null,
    };
};

export interface StreamingRightsRenewalControlDecision {
    requiresApproval: boolean;
    protectionReasons: string[];
    delegatedReason: string | null;
}

export const classifyStreamingRightsRenewalControl = (
    player: Player,
    contract: StreamingRightsContract,
    offer: StreamingRightsRenewalOfferEvaluation,
    management = normalizeStreamingRightsManagementState(player.streamingRightsManagement),
): StreamingRightsRenewalControlDecision => {
    const reasons: string[] = [];
    if (management.controlMode === 'FULL') reasons.push('FULL_CONTROL');
    if (management.manualContractIds.includes(contract.id)) reasons.push('MANUAL_CONTROL');
    if (management.protectedProjectIds.includes(contract.sourceProjectId)) reasons.push('PROTECTED_TITLE');
    if (
        management.policy.protectGlobalExclusives
        && contract.territory === 'GLOBAL'
        && contract.exclusivity === 'EXCLUSIVE'
    ) reasons.push('WORLDWIDE_EXCLUSIVE');
    const project = findProjectRecord(player, contract.sourceProjectId);
    const franchiseProtected = Boolean(
        project.universeId
        || project.franchiseId
        || project.sequelOf
        || project.isFranchise,
    );
    if (management.policy.protectFranchises && franchiseProtected) reasons.push('FRANCHISE_OR_UNIVERSE');
    if (
        offer.proposedEconomics
        && offer.proposedEconomics.minimumGuarantee > management.policy.maximumAutomaticGuarantee
    ) reasons.push('VALUE_THRESHOLD');
    if (
        offer.proposedEconomics
        && offer.proposedEconomics.durationWeeks > management.policy.maximumAutomaticDurationWeeks
    ) reasons.push('DURATION_THRESHOLD');
    if (offer.performance.affordabilityScore < 30) reasons.push('SOLVENCY_SENSITIVE');
    if (
        management.policy.preference === 'RELATIONSHIP_FIRST'
        && offer.performance.relationshipScore >= 80
    ) reasons.push('RELATIONSHIP_SENSITIVE');
    const protectionReasons = Array.from(new Set(reasons)).sort();
    if (protectionReasons.length) {
        return { requiresApproval: true, protectionReasons, delegatedReason: null };
    }
    return {
        requiresApproval: false,
        protectionReasons: [],
        delegatedReason: management.controlMode === 'STRATEGY'
            ? `Strategy Mode: ${management.policy.preference} policy may handle this routine renewal.`
            : 'Custom Control: this routine renewal is inside the saved mandate.',
    };
};

const managementForStudioMandate = (
    management: StreamingRightsManagementState,
    mandate: StreamingRightsStudioMandate,
): StreamingRightsManagementState => ({
    ...management,
    controlMode: mandate.controlMode,
    policy: {
        ...management.policy,
        preference: mandate.renewalPreference,
        maximumAutomaticGuarantee: mandate.maximumAutomaticGuarantee,
        maximumAutomaticDurationWeeks: mandate.maximumAutomaticDurationWeeks,
        protectGlobalExclusives: mandate.protectGlobalExclusives,
        protectFranchises: mandate.protectFranchises,
    },
});

const createRenewalCase = (
    contract: StreamingRightsContract,
    absoluteWeek: number,
    management: StreamingRightsManagementState,
): StreamingRightsRenewalCase => {
    const renewalStartsAtAbsoluteWeek = contract.expiresAtAbsoluteWeek + 1;
    const id = createDeterministicId('streaming_renewal_case', contract.id, renewalStartsAtAbsoluteWeek);
    return {
        id,
        idempotencyKey: `streaming-renewal-case:${contract.id}:${renewalStartsAtAbsoluteWeek}`,
        sourceContractId: contract.id,
        sourceProjectId: contract.sourceProjectId,
        title: contract.titleAtSigning,
        projectType: contract.projectType === 'SERIES' ? 'SERIES' : 'MOVIE',
        genre: contract.genre || 'Licensed',
        territory: contract.territory,
        countryIds: [...(contract.countryIds || [])].sort(),
        exclusivity: contract.exclusivity,
        windowType: contract.windowType || 'FIRST_WINDOW',
        seller: { ...contract.seller },
        incumbentBuyer: { ...contract.buyer },
        sourceExpiresAtAbsoluteWeek: contract.expiresAtAbsoluteWeek,
        renewalStartsAtAbsoluteWeek,
        openedAtAbsoluteWeek: absoluteWeek,
        decisionDeadlineAbsoluteWeek: contract.expiresAtAbsoluteWeek,
        renewalOption: Boolean(contract.renewalOption),
        status: 'WATCHING',
        offerDisposition: 'PENDING',
        performance: null,
        proposedEconomics: null,
        controlModeAtOpen: management.controlMode,
        policyPreferenceAtOpen: management.policy.preference,
        protectionReasons: [],
        delegatedReason: null,
        outcome: 'PENDING',
        replacementContractId: null,
        resolvedAtAbsoluteWeek: null,
        lastProcessedAbsoluteWeek: absoluteWeek,
    };
};

const synchronizeLicenseProjection = (
    license: OwnedStreamingCatalogLicense,
    canonical: Record<string, StreamingRightsContract>,
): OwnedStreamingCatalogLicense => {
    const contract = canonical[license.id];
    if (!contract || contract.status === license.status) return license;
    return { ...license, status: contract.status };
};

const synchronizeBuyerProjections = (
    player: Player,
    canonical: Record<string, StreamingRightsContract>,
    absoluteWeek: number,
): Player => {
    const ownedContracts = Object.values(canonical)
        .filter(contract => contract.buyer.type === 'PLAYER_PLATFORM');
    const ownedActiveProjectIds = new Set(ownedContracts
        .filter(contract => isStreamingLicenseActiveAt(contract, absoluteWeek))
        .map(contract => contract.sourceProjectId));
    const ownedExpiredProjectIds = new Set(ownedContracts
        .filter(contract => contract.status === 'EXPIRED' && !ownedActiveProjectIds.has(contract.sourceProjectId))
        .map(contract => contract.sourceProjectId));
    const ownedStreamingPlatform = {
        ...player.ownedStreamingPlatform,
        catalogLicenses: player.ownedStreamingPlatform.catalogLicenses
            .map(license => synchronizeLicenseProjection(license, canonical)),
        catalogProjectIds: player.ownedStreamingPlatform.catalogProjectIds
            .filter(projectId => !ownedExpiredProjectIds.has(projectId)),
        launchSlate: player.ownedStreamingPlatform.launchSlate ? {
            ...player.ownedStreamingPlatform.launchSlate,
            entries: player.ownedStreamingPlatform.launchSlate.entries
                .filter(entry => !ownedExpiredProjectIds.has(entry.projectId)),
        } : null,
    };
    const platforms = player.world.platforms
        ? Object.fromEntries(Object.entries(player.world.platforms).map(([platformId, platform]) => (
            [platformId, platform.ai ? {
                ...platform,
                ai: {
                    ...platform.ai,
                    rightsContracts: platform.ai.rightsContracts
                        .map(license => synchronizeLicenseProjection(license, canonical)),
                    slate: platform.ai.slate.map(plan => {
                        if (plan.status !== 'SCHEDULED') return plan;
                        const hasInvalidRight = plan.rightsContractIds.some(contractId => {
                            const contract = canonical[contractId];
                            return !contract || contract.status !== 'ACTIVE';
                        });
                        if (!hasInvalidRight) return plan;
                        return {
                            ...plan,
                            status: 'RIGHTS_READY' as const,
                            localizationReadyAtAbsoluteWeek: null,
                            premiereAtAbsoluteWeek: null,
                            releasePattern: null,
                            releaseEntries: [],
                            scheduledAtAbsoluteWeek: null,
                        };
                    }),
                },
            } : platform]
        ))) as typeof player.world.platforms
        : player.world.platforms;
    return {
        ...player,
        ownedStreamingPlatform,
        world: { ...player.world, platforms },
    };
};

export interface ProcessStreamingRightsCalendarWeekResult {
    player: Player;
    processed: boolean;
    digest: StreamingRightsCalendarDigest | null;
    createdCaseIds: string[];
    expiredContractIds: string[];
}

export const processStreamingRightsCalendarWeek = (
    player: Player,
    absoluteWeek: number,
): ProcessStreamingRightsCalendarWeekResult => {
    const week = Math.max(0, Math.round(Number(absoluteWeek) || 0));
    const management = normalizeStreamingRightsManagementState(player.streamingRightsManagement);
    const state = normalizeStreamingRightsCalendarState(player.world.streamingRightsCalendar);
    if (state.lastProcessedAbsoluteWeek >= week) {
        return { player, processed: false, digest: null, createdCaseIds: [], expiredContractIds: [] };
    }

    const contracts = normalizeStreamingRightsContractRegistry(player.world.streamingRightsContracts);
    const renewalCases = { ...state.renewalCases };
    const renewalCaseByContractId = new Map(
        Object.values(renewalCases).map(candidate => [candidate.sourceContractId, candidate]),
    );
    const managementBySellerId = new Map<string, StreamingRightsManagementState>();
    const createdCaseIds: string[] = [];
    const expiredContractIds: string[] = [];

    Object.values(contracts)
        .sort((left, right) => left.id.localeCompare(right.id))
        .forEach(contract => {
            let contractManagement = managementBySellerId.get(contract.seller.id);
            if (!contractManagement) {
                const studioMandate = getStreamingRightsStudioMandateFromManagement(management, contract.seller.id);
                contractManagement = managementForStudioMandate(management, studioMandate);
                managementBySellerId.set(contract.seller.id, contractManagement);
            }
            if (contract.permanentPurchase || contract.windowType === 'PERMANENT') return;
            const noticeStart = Math.max(contract.startsAtAbsoluteWeek, contract.expiresAtAbsoluteWeek - contractManagement.policy.noticeWeeks);
            const existingCase = renewalCaseByContractId.get(contract.id);
            let renewalCase = existingCase;
            if (!renewalCase && week >= noticeStart) {
                renewalCase = createRenewalCase(contract, week, contractManagement);
                renewalCases[renewalCase.id] = renewalCase;
                renewalCaseByContractId.set(contract.id, renewalCase);
                createdCaseIds.push(renewalCase.id);
            }
            if (
                renewalCase
                && renewalCase.outcome === 'PENDING'
                && renewalCase.performance === null
                && week <= contract.expiresAtAbsoluteWeek
            ) {
                const offer = buildStreamingRightsRenewalOffer(player, contract, week);
                const control = classifyStreamingRightsRenewalControl(player, contract, offer, contractManagement);
                renewalCase = {
                    ...renewalCase,
                    offerDisposition: offer.offerDisposition,
                    performance: offer.performance,
                    proposedEconomics: offer.proposedEconomics,
                    protectionReasons: control.protectionReasons,
                    delegatedReason: control.delegatedReason,
                    status: offer.offerDisposition === 'DECLINED'
                        ? 'NO_OFFER'
                        : control.requiresApproval ? 'ACTION_REQUIRED' : 'OFFER_AVAILABLE',
                    outcome: offer.offerDisposition === 'DECLINED' ? 'NO_OFFER' : 'PENDING',
                    resolvedAtAbsoluteWeek: offer.offerDisposition === 'DECLINED' ? week : null,
                    lastProcessedAbsoluteWeek: week,
                };
                renewalCases[renewalCase.id] = renewalCase;
            }
            if (week > contract.expiresAtAbsoluteWeek && contract.status === 'ACTIVE') {
                contracts[contract.id] = { ...contract, status: 'EXPIRED' };
                expiredContractIds.push(contract.id);
            }
            if (renewalCase && week > contract.expiresAtAbsoluteWeek && !renewalCase.replacementContractId) {
                renewalCases[renewalCase.id] = {
                    ...renewalCase,
                    status: 'EXPIRED',
                    offerDisposition: renewalCase.offerDisposition === 'PENDING' ? 'DECLINED' : renewalCase.offerDisposition,
                    outcome: renewalCase.outcome === 'PENDING' ? 'NO_OFFER' : renewalCase.outcome,
                    resolvedAtAbsoluteWeek: renewalCase.resolvedAtAbsoluteWeek ?? week,
                    lastProcessedAbsoluteWeek: week,
                };
            }
        });

    const nextState: StreamingRightsCalendarState = {
        ...state,
        renewalCases,
        lastProcessedAbsoluteWeek: week,
    };
    let nextPlayer: Player = {
        ...player,
        streamingRightsManagement: management,
        world: {
            ...player.world,
            streamingRightsContracts: contracts,
            streamingRightsCalendar: nextState,
        },
    };
    nextPlayer = synchronizeBuyerProjections(nextPlayer, contracts, week);
    const delegatedCaseIds = Object.values(nextPlayer.world.streamingRightsCalendar!.renewalCases)
        .filter(candidate => (
            candidate.status === 'OFFER_AVAILABLE'
            && candidate.outcome === 'PENDING'
            && Boolean(candidate.delegatedReason)
            && week > candidate.openedAtAbsoluteWeek
        ))
        .map(candidate => candidate.id)
        .sort();
    for (const caseId of delegatedCaseIds) {
        const currentCalendar = normalizeStreamingRightsCalendarState(nextPlayer.world.streamingRightsCalendar);
        const candidate = currentCalendar.renewalCases[caseId];
        if (!candidate?.performance) continue;
        const baseManagement = normalizeStreamingRightsManagementState(nextPlayer.streamingRightsManagement);
        const mandate = getStreamingRightsStudioMandate(nextPlayer, candidate.seller.id);
        const currentManagement = managementForStudioMandate(baseManagement, mandate);
        let action: StreamingRightsRenewalAction;
        if (currentManagement.policy.preference === 'RETEST_MARKET') {
            action = 'RETURN_TO_MARKET';
        } else if (
            candidate.performance.performanceScore
            < currentManagement.policy.letWeakContractsExpireBelowScore
        ) {
            action = 'LET_EXPIRE';
        } else if (
            candidate.performance.performanceScore >= currentManagement.policy.autoRenewMinimumScore
            || (
                currentManagement.policy.preference === 'RELATIONSHIP_FIRST'
                && candidate.performance.relationshipScore >= 65
            )
        ) {
            action = 'ACCEPT_RENEWAL';
        } else if (candidate.performance.rivalInterestScore >= 55) {
            action = 'RETURN_TO_MARKET';
        } else {
            action = 'LET_EXPIRE';
        }
        const tracedCalendar = normalizeStreamingRightsCalendarState(nextPlayer.world.streamingRightsCalendar);
        const tracedCase = tracedCalendar.renewalCases[caseId];
        nextPlayer = updateRenewalCase(nextPlayer, tracedCalendar, {
            ...tracedCase,
            delegationTrace: createStreamingRightsDelegationTrace({
                mandate,
                rule: action === 'ACCEPT_RENEWAL'
                    ? 'RENEWAL_SCORE_WITHIN_MANDATE'
                    : action === 'RETURN_TO_MARKET' ? 'RETEST_MARKET_WITHIN_MANDATE' : 'WEAK_TITLE_WITHIN_MANDATE',
                facts: {
                    sourceContractId: candidate.sourceContractId,
                    sourceProjectId: candidate.sourceProjectId,
                    performanceScore: candidate.performance.performanceScore,
                    relationshipScore: candidate.performance.relationshipScore,
                    rivalInterestScore: candidate.performance.rivalInterestScore,
                    minimumGuarantee: candidate.proposedEconomics?.minimumGuarantee ?? null,
                    durationWeeks: candidate.proposedEconomics?.durationWeeks ?? null,
                    territory: candidate.territory,
                    exclusivity: candidate.exclusivity,
                    action,
                },
                explanation: candidate.delegatedReason || 'Routine renewal completed inside the saved mandate.',
            }),
        });
        const delegated = resolveStreamingRightsRenewal(nextPlayer, {
            caseId,
            action,
            absoluteWeek: week,
            delegated: true,
        });
        if (delegated.changed) {
            nextPlayer = delegated.player;
            continue;
        }
        const failedCalendar = normalizeStreamingRightsCalendarState(nextPlayer.world.streamingRightsCalendar);
        const failedCase = failedCalendar.renewalCases[caseId];
        if (!failedCase || failedCase.outcome !== 'PENDING') continue;
        nextPlayer = updateRenewalCase(nextPlayer, failedCalendar, {
            ...failedCase,
            status: 'ACTION_REQUIRED',
            protectionReasons: Array.from(new Set([
                ...failedCase.protectionReasons,
                delegated.reason === 'RIGHTS_CONFLICT' ? 'RIGHTS_CONFLICT' : 'DELEGATED_RESOLUTION_FAILED',
            ])).sort(),
            delegatedReason: null,
            lastProcessedAbsoluteWeek: week,
        });
    }
    const resolvedCalendar = normalizeStreamingRightsCalendarState(nextPlayer.world.streamingRightsCalendar);
    const resolvedCases = Object.values(resolvedCalendar.renewalCases);
    const actionRequired = resolvedCases.filter(candidate => candidate.status === 'ACTION_REQUIRED').length;
    const approachingExpiry = resolvedCases.filter(candidate => (
        candidate.outcome === 'PENDING' && candidate.sourceExpiresAtAbsoluteWeek >= week
    )).length;
    const delegatedRenewals = resolvedCases.filter(candidate => (
        candidate.outcome === 'DELEGATED_ACCEPTED' && candidate.resolvedAtAbsoluteWeek === week
    )).length;
    const returnedToMarket = resolvedCases.filter(candidate => (
        candidate.outcome === 'RETURN_TO_MARKET' && candidate.resolvedAtAbsoluteWeek === week
    )).length;
    const urgentCases = resolvedCases.filter(candidate => (
        candidate.status === 'ACTION_REQUIRED'
        && candidate.outcome === 'PENDING'
        && candidate.decisionDeadlineAbsoluteWeek >= week
        && candidate.decisionDeadlineAbsoluteWeek - week <= 1
    ));
    const urgentKey = `rights-urgent:${week}`;
    const urgentAlreadyRecorded = resolvedCalendar.urgentNoticeKeys.includes(urgentKey);
    const urgentAlreadyDelivered = (nextPlayer.inbox || []).some(message => message.id === urgentKey);
    const shouldRecordUrgent = urgentCases.length > 0 && !urgentAlreadyRecorded;
    const shouldDeliverUrgent = shouldRecordUrgent && !urgentAlreadyDelivered;
    const nextUrgentNoticeKeys = shouldRecordUrgent
        ? [...resolvedCalendar.urgentNoticeKeys, urgentKey].slice(-100)
        : resolvedCalendar.urgentNoticeKeys;
    if (shouldDeliverUrgent) {
        const titles = urgentCases.slice(0, 3).map(candidate => candidate.title).join(', ');
        const urgentMessage: Message = {
            id: urgentKey,
            sender: 'Rights Desk',
            subject: `${urgentCases.length} rights ${urgentCases.length === 1 ? 'decision' : 'decisions'} due`,
            text: `${titles}${urgentCases.length > 3 ? ` and ${urgentCases.length - 3} more` : ''} require a decision before their current windows close.`,
            type: 'RIGHTS_REPORT',
            data: { kind: 'STREAMING_RIGHTS_URGENT', caseIds: urgentCases.map(candidate => candidate.id) },
            isRead: false,
            weekSent: Math.max(1, ((week - 1) % 52) + 1),
        };
        nextPlayer = {
            ...nextPlayer,
            inbox: [urgentMessage, ...(nextPlayer.inbox || [])].slice(0, 120),
        };
    }
    const digest = createdCaseIds.length
        || expiredContractIds.length
        || delegatedRenewals
        || returnedToMarket
        || shouldRecordUrgent
        ? {
            id: createDeterministicId('streaming_rights_digest', week),
            absoluteWeek: week,
            actionRequired,
            approachingExpiry,
            delegatedRenewals,
            returnedToMarket,
            expired: expiredContractIds.length,
            summary: `Rights Desk: ${actionRequired} decision${actionRequired === 1 ? '' : 's'} required; ${approachingExpiry} approaching expiry; ${delegatedRenewals} delegated renewal${delegatedRenewals === 1 ? '' : 's'}; ${returnedToMarket} market return${returnedToMarket === 1 ? '' : 's'}; ${expiredContractIds.length} expired.`,
        }
        : null;
    const finalCalendar: StreamingRightsCalendarState = {
        ...resolvedCalendar,
        digests: digest
            ? [digest, ...resolvedCalendar.digests.filter(candidate => candidate.id !== digest.id)].slice(0, MAX_DIGESTS)
            : resolvedCalendar.digests,
        urgentNoticeKeys: nextUrgentNoticeKeys,
        lastProcessedAbsoluteWeek: week,
    };
    nextPlayer = {
        ...nextPlayer,
        world: { ...nextPlayer.world, streamingRightsCalendar: finalCalendar },
    };
    return { player: nextPlayer, processed: true, digest, createdCaseIds, expiredContractIds };
};

export type StreamingRightsRenewalAction = 'ACCEPT_RENEWAL' | 'LET_EXPIRE' | 'RETURN_TO_MARKET';
export type StreamingRightsRenewalResolutionReason =
    | 'RENEWED'
    | 'MARKED_TO_EXPIRE'
    | 'RETURNING_TO_MARKET'
    | 'CASE_NOT_FOUND'
    | 'ALREADY_RESOLVED'
    | 'OFFER_NOT_AVAILABLE'
    | 'DECISION_WINDOW_CLOSED'
    | 'SOURCE_CONTRACT_MISSING'
    | 'RIGHTS_CONFLICT'
    | 'BUYER_CANNOT_PAY';

export interface ResolveStreamingRightsRenewalInput {
    caseId: string;
    action: StreamingRightsRenewalAction;
    absoluteWeek: number;
    delegated?: boolean;
}

export interface ResolveStreamingRightsRenewalResult {
    player: Player;
    changed: boolean;
    reason: StreamingRightsRenewalResolutionReason;
    detail: string | null;
    replacementContractId: string | null;
}

const updateRenewalCase = (
    player: Player,
    calendar: StreamingRightsCalendarState,
    renewalCase: StreamingRightsRenewalCase,
): Player => ({
    ...player,
    world: {
        ...player.world,
        streamingRightsCalendar: {
            ...calendar,
            renewalCases: { ...calendar.renewalCases, [renewalCase.id]: renewalCase },
        },
    },
});

const canBuyerPayRenewal = (
    player: Player,
    contract: StreamingRightsContract,
    guarantee: number,
    absoluteWeek: number,
): boolean => {
    if (contract.buyer.type === 'PLAYER_PLATFORM') {
        return player.ownedStreamingPlatform.treasuryCash >= guarantee;
    }
    const platformId = contract.buyer.platformId;
    const platform = platformId ? player.world.platforms?.[platformId] : undefined;
    if (!platform || platform.cashReserve * 1_000_000 < guarantee) return false;
    const restrictions = platform.ai?.spendingRestrictions;
    return !(
        restrictions?.blocksNewBids
        && (restrictions.expiresAtAbsoluteWeek === null || restrictions.expiresAtAbsoluteWeek >= absoluteWeek)
    ) && platform.ai?.status !== 'DORMANT' && !platform.ai?.administration;
};

const settleRenewalGuarantee = (
    player: Player,
    contract: StreamingRightsContract,
    guarantee: number,
): Player => {
    let nextPlayer = player;
    if (contract.buyer.type === 'PLAYER_PLATFORM') {
        nextPlayer = {
            ...nextPlayer,
            ownedStreamingPlatform: {
                ...nextPlayer.ownedStreamingPlatform,
                treasuryCash: nextPlayer.ownedStreamingPlatform.treasuryCash - guarantee,
            },
        };
    } else if (contract.buyer.platformId && nextPlayer.world.platforms?.[contract.buyer.platformId]) {
        const platformId = contract.buyer.platformId;
        const platform = nextPlayer.world.platforms[platformId];
        nextPlayer = {
            ...nextPlayer,
            world: {
                ...nextPlayer.world,
                platforms: {
                    ...nextPlayer.world.platforms!,
                    [platformId]: {
                        ...platform,
                        cashReserve: Math.max(0, platform.cashReserve - guarantee / 1_000_000),
                    },
                },
            },
        };
    }

    if (contract.seller.type === 'PLAYER_STUDIO') {
        let credited = false;
        const businesses = nextPlayer.businesses.map(business => {
            if (business.id !== contract.seller.id) return business;
            credited = true;
            return {
                ...business,
                balance: business.balance + guarantee,
                stats: {
                    ...business.stats,
                    weeklyRevenue: Number(business.stats?.weeklyRevenue || 0) + guarantee,
                    weeklyProfit: Number(business.stats?.weeklyProfit || 0) + guarantee,
                    lifetimeRevenue: Number(business.stats?.lifetimeRevenue || 0) + guarantee,
                },
            };
        });
        nextPlayer = credited
            ? { ...nextPlayer, businesses }
            : { ...nextPlayer, money: nextPlayer.money + guarantee };
    } else if (contract.seller.type === 'PLAYER_PLATFORM') {
        nextPlayer = {
            ...nextPlayer,
            ownedStreamingPlatform: {
                ...nextPlayer.ownedStreamingPlatform,
                treasuryCash: nextPlayer.ownedStreamingPlatform.treasuryCash + guarantee,
            },
        };
    }
    return nextPlayer;
};

const projectRenewalToBuyer = (
    player: Player,
    source: StreamingRightsContract,
    replacement: StreamingRightsContract,
): Player => {
    if (replacement.buyer.type === 'PLAYER_PLATFORM') {
        const alreadyProjected = player.ownedStreamingPlatform.catalogLicenses
            .some(license => license.id === replacement.id);
        return {
            ...player,
            ownedStreamingPlatform: {
                ...player.ownedStreamingPlatform,
                catalogLicenses: alreadyProjected
                    ? player.ownedStreamingPlatform.catalogLicenses
                    : [...player.ownedStreamingPlatform.catalogLicenses, replacement],
                catalogProjectIds: Array.from(new Set([
                    ...player.ownedStreamingPlatform.catalogProjectIds,
                    replacement.sourceProjectId,
                ])),
            },
        };
    }
    const platformId = replacement.buyer.platformId;
    const platform = platformId ? player.world.platforms?.[platformId] : undefined;
    if (!platform?.ai || !platformId) return player;
    const alreadyProjected = platform.ai.rightsContracts.some(contract => contract.id === replacement.id);
    const slate = platform.ai.slate.map(plan => {
        if (!plan.rightsContractIds.includes(source.id)) return plan;
        return {
            ...plan,
            rightsContractIds: Array.from(new Set(plan.rightsContractIds.map(contractId => (
                contractId === source.id ? replacement.id : contractId
            )))),
            releaseEntries: plan.releaseEntries.map(entry => (
                entry.rightsContractId === source.id
                && entry.premiereAtAbsoluteWeek >= replacement.startsAtAbsoluteWeek
                    ? { ...entry, rightsContractId: replacement.id }
                    : entry
            )),
        };
    });
    return {
        ...player,
        world: {
            ...player.world,
            platforms: {
                ...player.world.platforms!,
                [platformId]: {
                    ...platform,
                    ai: {
                        ...platform.ai,
                        rightsContracts: alreadyProjected
                            ? platform.ai.rightsContracts
                            : [...platform.ai.rightsContracts, replacement],
                        slate,
                    },
                },
            },
        },
    };
};

export const resolveStreamingRightsRenewal = (
    player: Player,
    input: ResolveStreamingRightsRenewalInput,
): ResolveStreamingRightsRenewalResult => {
    const absoluteWeek = Math.max(0, Math.round(Number(input.absoluteWeek) || 0));
    const calendar = normalizeStreamingRightsCalendarState(player.world.streamingRightsCalendar);
    const renewalCase = calendar.renewalCases[input.caseId];
    if (!renewalCase) {
        return { player, changed: false, reason: 'CASE_NOT_FOUND', detail: 'The renewal case no longer exists.', replacementContractId: null };
    }
    if (renewalCase.outcome !== 'PENDING' || renewalCase.replacementContractId) {
        return {
            player,
            changed: false,
            reason: 'ALREADY_RESOLVED',
            detail: 'This renewal decision has already been recorded.',
            replacementContractId: renewalCase.replacementContractId,
        };
    }
    if (absoluteWeek > renewalCase.decisionDeadlineAbsoluteWeek) {
        return { player, changed: false, reason: 'DECISION_WINDOW_CLOSED', detail: 'The renewal window has closed.', replacementContractId: null };
    }
    const source = player.world.streamingRightsContracts?.[renewalCase.sourceContractId];
    if (!source) {
        return { player, changed: false, reason: 'SOURCE_CONTRACT_MISSING', detail: 'The source contract is missing.', replacementContractId: null };
    }
    if (input.action === 'LET_EXPIRE' || input.action === 'RETURN_TO_MARKET') {
        const returning = input.action === 'RETURN_TO_MARKET';
        const nextCase: StreamingRightsRenewalCase = {
            ...renewalCase,
            status: returning ? 'RETURNING_TO_MARKET' : 'LETTING_EXPIRE',
            outcome: returning ? 'RETURN_TO_MARKET' : 'LET_EXPIRE',
            resolvedAtAbsoluteWeek: absoluteWeek,
            delegatedReason: input.delegated ? renewalCase.delegatedReason : null,
            lastProcessedAbsoluteWeek: absoluteWeek,
        };
        return {
            player: updateRenewalCase(player, calendar, nextCase),
            changed: true,
            reason: returning ? 'RETURNING_TO_MARKET' : 'MARKED_TO_EXPIRE',
            detail: returning
                ? `The exact next window becomes marketable in Week ${renewalCase.renewalStartsAtAbsoluteWeek}.`
                : `The incumbent remains active through Week ${renewalCase.sourceExpiresAtAbsoluteWeek}.`,
            replacementContractId: null,
        };
    }
    if (renewalCase.offerDisposition !== 'OFFERED' || !renewalCase.proposedEconomics) {
        return { player, changed: false, reason: 'OFFER_NOT_AVAILABLE', detail: 'No renewal offer is available to accept.', replacementContractId: null };
    }
    const economics = renewalCase.proposedEconomics;
    if (!canBuyerPayRenewal(player, source, economics.minimumGuarantee, absoluteWeek)) {
        return { player, changed: false, reason: 'BUYER_CANNOT_PAY', detail: 'The incumbent can no longer fund these terms.', replacementContractId: null };
    }
    const compatibility = resolveStreamingRightsCompatibility({
        world: player.world,
        sourceProjectId: source.sourceProjectId,
        buyerPlatformId: source.buyer.platformId,
        sellerPartyId: source.seller.id,
        territory: source.territory,
        countryIds: source.countryIds || [],
        startsAtAbsoluteWeek: renewalCase.renewalStartsAtAbsoluteWeek,
        expiresAtAbsoluteWeek: renewalCase.renewalStartsAtAbsoluteWeek + economics.durationWeeks,
        windowType: source.windowType || 'FIRST_WINDOW',
        exclusivity: source.exclusivity,
        excludeContractIds: [source.id],
    });
    if (!compatibility.available) {
        return { player, changed: false, reason: 'RIGHTS_CONFLICT', detail: compatibility.summary, replacementContractId: null };
    }
    const replacementId = createDeterministicId(
        'streaming_renewal_contract',
        source.id,
        renewalCase.renewalStartsAtAbsoluteWeek,
    );
    const license = createStreamingLicenseContract({
        id: replacementId,
        sourceProject: {
            id: source.sourceProjectId,
            title: source.titleAtSigning,
            mediaType: source.projectType,
            genre: source.genre,
        },
        buyerPlatformId: source.buyer.platformId,
        platformContentPlanId: source.platformContentPlanId || null,
        cataloguePackageId: source.cataloguePackageId || null,
        contentSource: source.contentSource,
        licensorName: source.licensorName,
        territory: source.territory,
        countryIds: source.countryIds || [],
        durationWeeks: economics.durationWeeks,
        exclusivity: source.exclusivity,
        minimumGuarantee: economics.minimumGuarantee,
        platformRevenueShare: economics.platformRevenueShare,
        signedAtAbsoluteWeek: absoluteWeek,
        startsAtAbsoluteWeek: renewalCase.renewalStartsAtAbsoluteWeek,
        status: 'ACTIVE',
        origin: 'RENEWAL',
        sellerType: source.sellerType || (source.seller.type.endsWith('PLATFORM') ? 'PLATFORM' : 'STUDIO'),
        sellerPlatformId: source.seller.platformId,
        windowType: source.windowType || 'FIRST_WINDOW',
        permanentPurchase: false,
        marketingGuarantee: source.marketingGuarantee,
        viewershipBonusThreshold: source.viewershipBonusThreshold,
        viewershipBonusAmount: source.viewershipBonusAmount,
        renewalOption: source.renewalOption,
        sublicensingAllowed: source.sublicensingAllowed,
        sequelRightsIncluded: source.sequelRightsIncluded,
        changeOfControl: source.changeOfControl,
        cancellationPenalty: source.cancellationPenalty,
        renewedFromLicenseId: source.id,
    });
    const replacement = createStreamingRightsContractFromLicense({
        license,
        seller: source.seller,
        buyer: source.buyer,
        guaranteeDisposition: 'PAID',
        settledAtAbsoluteWeek: absoluteWeek,
        productionFunding: 0,
        futureSeasonFunding: 0,
        localization: source.localization,
        localizationRequirements: source.localizationRequirements,
        guaranteeRecoupment: source.guaranteeRecoupment,
        backendCap: source.backendCap,
        idempotencyKey: `streaming-renewal-contract:${renewalCase.id}`,
    });
    const registration = registerStreamingRightsContract(player.world.streamingRightsContracts, replacement);
    if (!registration.contract) {
        return { player, changed: false, reason: 'RIGHTS_CONFLICT', detail: 'The replacement contract could not be registered.', replacementContractId: null };
    }
    let nextPlayer: Player = {
        ...player,
        world: { ...player.world, streamingRightsContracts: registration.registry },
    };
    nextPlayer = settleRenewalGuarantee(nextPlayer, source, economics.minimumGuarantee);
    nextPlayer = projectRenewalToBuyer(nextPlayer, source, registration.contract);
    const nextCalendar = normalizeStreamingRightsCalendarState(nextPlayer.world.streamingRightsCalendar);
    const nextCase: StreamingRightsRenewalCase = {
        ...renewalCase,
        status: 'RENEWAL_SECURED',
        outcome: input.delegated ? 'DELEGATED_ACCEPTED' : 'ACCEPTED',
        replacementContractId: registration.contract.id,
        resolvedAtAbsoluteWeek: absoluteWeek,
        delegatedReason: input.delegated ? renewalCase.delegatedReason : null,
        lastProcessedAbsoluteWeek: absoluteWeek,
    };
    nextPlayer = updateRenewalCase(nextPlayer, nextCalendar, nextCase);
    return {
        player: nextPlayer,
        changed: true,
        reason: 'RENEWED',
        detail: `Renewal secured from Week ${renewalCase.renewalStartsAtAbsoluteWeek}.`,
        replacementContractId: registration.contract.id,
    };
};

export interface StreamingRightsCalendarItem extends StreamingRightsRenewalCase {
    weeksRemaining: number;
}

export interface StreamingRightsCalendarView {
    summary: {
        actionRequired: number;
        approachingExpiry: number;
        renewalNegotiations: number;
        returningToMarket: number;
        recentlyCompleted: number;
        permanent: number;
    };
    groups: {
        actionRequired: StreamingRightsCalendarItem[];
        expiringSoon: StreamingRightsCalendarItem[];
        renewalNegotiations: StreamingRightsCalendarItem[];
        returningToMarket: StreamingRightsCalendarItem[];
        recentlyCompleted: StreamingRightsCalendarItem[];
    };
}

export const getStreamingRightsCalendar = (
    player: Player,
    absoluteWeek: number,
): StreamingRightsCalendarView => {
    const week = Math.max(0, Math.round(Number(absoluteWeek) || 0));
    const state = normalizeStreamingRightsCalendarState(player.world.streamingRightsCalendar);
    const items = Object.values(state.renewalCases)
        .map(candidate => ({
            ...candidate,
            weeksRemaining: Math.max(0, candidate.sourceExpiresAtAbsoluteWeek - week),
        }))
        .sort((left, right) => (
            left.sourceExpiresAtAbsoluteWeek - right.sourceExpiresAtAbsoluteWeek
            || left.title.localeCompare(right.title)
        ));
    const actionRequired = items.filter(item => item.status === 'ACTION_REQUIRED');
    const expiringSoon = items.filter(item => item.outcome === 'PENDING' && item.status === 'WATCHING');
    const renewalNegotiations = items.filter(item => item.status === 'OFFER_AVAILABLE');
    const returningToMarket = items.filter(item => item.status === 'RETURNING_TO_MARKET');
    const recentlyCompleted = items.filter(item => (
        ['RENEWAL_SECURED', 'LETTING_EXPIRE', 'NO_OFFER', 'EXPIRED'].includes(item.status)
    ));
    const contracts = Object.values(normalizeStreamingRightsContractRegistry(player.world.streamingRightsContracts));
    return {
        summary: {
            actionRequired: actionRequired.length,
            approachingExpiry: expiringSoon.length,
            renewalNegotiations: renewalNegotiations.length,
            returningToMarket: returningToMarket.length,
            recentlyCompleted: recentlyCompleted.length,
            permanent: contracts.filter(contract => contract.permanentPurchase || contract.windowType === 'PERMANENT').length,
        },
        groups: { actionRequired, expiringSoon, renewalNegotiations, returningToMarket, recentlyCompleted },
    };
};

export interface TakeControlOfStreamingRightsRenewalResult {
    player: Player;
    changed: boolean;
}

export const takeControlOfStreamingRightsRenewal = (
    player: Player,
    caseId: string,
    absoluteWeek: number,
): TakeControlOfStreamingRightsRenewalResult => {
    const management = normalizeStreamingRightsManagementState(player.streamingRightsManagement);
    const calendar = normalizeStreamingRightsCalendarState(player.world.streamingRightsCalendar);
    const renewalCase = calendar.renewalCases[caseId];
    if (!renewalCase || renewalCase.replacementContractId || renewalCase.outcome !== 'PENDING') {
        return { player, changed: false };
    }
    const alreadyManual = management.manualContractIds.includes(renewalCase.sourceContractId);
    const alreadyWaiting = renewalCase.status === 'ACTION_REQUIRED'
        && renewalCase.protectionReasons.includes('MANUAL_CONTROL')
        && renewalCase.delegatedReason === null;
    if (alreadyManual && alreadyWaiting) return { player, changed: false };
    const nextManagement: StreamingRightsManagementState = {
        ...management,
        manualContractIds: Array.from(new Set([
            ...management.manualContractIds,
            renewalCase.sourceContractId,
        ])).sort(),
        updatedAtAbsoluteWeek: Math.max(0, Math.round(Number(absoluteWeek) || 0)),
    };
    const nextCase: StreamingRightsRenewalCase = {
        ...renewalCase,
        status: 'ACTION_REQUIRED',
        protectionReasons: Array.from(new Set([
            ...renewalCase.protectionReasons,
            'MANUAL_CONTROL',
        ])).sort(),
        delegatedReason: null,
        lastProcessedAbsoluteWeek: Math.max(
            renewalCase.lastProcessedAbsoluteWeek,
            Math.max(0, Math.round(Number(absoluteWeek) || 0)),
        ),
    };
    return {
        changed: true,
        player: {
            ...player,
            streamingRightsManagement: nextManagement,
            world: {
                ...player.world,
                streamingRightsCalendar: {
                    ...calendar,
                    renewalCases: { ...calendar.renewalCases, [caseId]: nextCase },
                },
            },
        },
    };
};
