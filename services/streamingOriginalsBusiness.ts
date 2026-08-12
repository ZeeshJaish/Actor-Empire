import type {
    OwnedStreamingLedgerEntry,
    OwnedStreamingOriginalCommission,
    OwnedStreamingOriginalCommissionDraft,
    Player,
    StreamingOriginalLifecycleDecisionType,
    StreamingOriginalLocalizationPackage,
    StreamingOriginalReleasePattern,
    StreamingOriginalReleaseScope,
    StreamingSlateMarketingPlan,
} from '../types';
import { createDeterministicId } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import {
    compactOwnedStreamingPlatformForPersistence,
    normalizeOwnedStreamingPlatformState,
} from './ownedStreamingPlatform';
import {
    createDefaultStreamingOriginalDraft,
    getStreamingOriginalLiveStatus,
} from './streamingOriginals';
import { getStreamingTitleAnalytics } from './streamingTitleAnalytics';

export interface StreamingOriginalLocalizationDefinition {
    id: StreamingOriginalLocalizationPackage;
    label: string;
    reach: string;
    subtitleLanguageCount: number;
    dubbedLanguageCount: number;
    cashCost: number;
    deliveryWeeks: number;
    contentOperationsRequired: number;
}

export const STREAMING_ORIGINAL_LOCALIZATION_PACKAGES: StreamingOriginalLocalizationDefinition[] = [
    {
        id: 'DOMESTIC',
        label: 'Home Market Master',
        reach: 'Primary-language launch with accessibility subtitles',
        subtitleLanguageCount: 2,
        dubbedLanguageCount: 0,
        cashCost: 500_000,
        deliveryWeeks: 1,
        contentOperationsRequired: 0,
    },
    {
        id: 'MULTI_REGION',
        label: 'Regional Bridge',
        reach: 'Eight subtitle tracks and three premium dubs',
        subtitleLanguageCount: 8,
        dubbedLanguageCount: 3,
        cashCost: 2_500_000,
        deliveryWeeks: 2,
        contentOperationsRequired: 10,
    },
    {
        id: 'GLOBAL',
        label: 'World Premiere Grid',
        reach: 'Twenty subtitle tracks and eight secure dubbing masters',
        subtitleLanguageCount: 20,
        dubbedLanguageCount: 8,
        cashCost: 7_500_000,
        deliveryWeeks: 3,
        contentOperationsRequired: 20,
    },
];

export interface StreamingOriginalStudioRecord {
    commission: OwnedStreamingOriginalCommission;
    liveStatus: ReturnType<typeof getStreamingOriginalLiveStatus>;
    localizationStatus: 'NOT_PLANNED' | 'IN_PROGRESS' | 'READY';
    measuredWeeks: number;
    decisionReady: boolean;
    evidenceSummary: string;
}

const getLocalizationDefinition = (id: StreamingOriginalLocalizationPackage) => (
    STREAMING_ORIGINAL_LOCALIZATION_PACKAGES.find(item => item.id === id)
    || STREAMING_ORIGINAL_LOCALIZATION_PACKAGES[0]
);

export const getStreamingOriginalsStudio = (player: Player): StreamingOriginalStudioRecord[] => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    return platform.originalCommissions.map(commission => {
        const analytics = commission.canonicalProjectId
            ? getStreamingTitleAnalytics(player, commission.canonicalProjectId).selected
            : null;
        const measuredWeeks = analytics?.entry.projectId === commission.canonicalProjectId
            ? analytics.measuredWeeks
            : 0;
        const localizationStatus = !commission.localization
            ? 'NOT_PLANNED' as const
            : commission.localization.readyAtAbsoluteWeek <= absoluteWeek
                ? 'READY' as const
                : 'IN_PROGRESS' as const;
        const liveStatus = getStreamingOriginalLiveStatus(player, commission);
        const evidenceSummary = measuredWeeks < 4
            ? `${measuredWeeks}/4 measured weeks. Financials and future outlook are still maturing.`
            : `${measuredWeeks} measured weeks · ${analytics?.momentum || 'UNKNOWN'} momentum · ${Math.round(analytics?.averageSatisfactionScore || 0)} audience satisfaction.`;
        return {
            commission,
            liveStatus,
            localizationStatus,
            measuredWeeks,
            decisionReady: liveStatus === 'RELEASED' && measuredWeeks >= 4 && !commission.lifecycleDecision,
            evidenceSummary,
        };
    }).sort((left, right) => right.commission.commissionedAtAbsoluteWeek - left.commission.commissionedAtAbsoluteWeek);
};

export const commitStreamingOriginalLocalization = (
    player: Player,
    commissionId: string,
    packageId: StreamingOriginalLocalizationPackage,
): {
    player: Player;
    changed: boolean;
    reason?: 'UNKNOWN_ORIGINAL' | 'NOT_GREENLIT' | 'ALREADY_PLANNED' | 'TECH_REQUIRED' | 'INSUFFICIENT_TREASURY';
} => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const commission = platform.originalCommissions.find(item => item.id === commissionId);
    if (!commission) return { player, changed: false, reason: 'UNKNOWN_ORIGINAL' };
    if (!commission.canonicalProjectId) return { player, changed: false, reason: 'NOT_GREENLIT' };
    if (commission.localization) return { player, changed: false, reason: 'ALREADY_PLANNED' };
    const definition = getLocalizationDefinition(packageId);
    if (platform.technologyLevels.CONTENT_OPERATIONS < definition.contentOperationsRequired) {
        return { player, changed: false, reason: 'TECH_REQUIRED' };
    }
    if (platform.treasuryCash < definition.cashCost) {
        return { player, changed: false, reason: 'INSUFFICIENT_TREASURY' };
    }
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const idempotencyKey = `original-localization:${commission.id}`;
    if (platform.eventLedger.some(entry => entry.idempotencyKey === idempotencyKey)) {
        return { player, changed: false, reason: 'ALREADY_PLANNED' };
    }
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        absoluteWeek,
        type: 'ORIGINAL_LOCALIZATION_COMMITTED',
        summary: `${commission.title} entered the ${definition.label} localization bay.`,
        source: 'PLAYER_ACTION',
        metadata: {
            commissionId,
            packageId,
            cashCost: definition.cashCost,
            readyAtAbsoluteWeek: absoluteWeek + definition.deliveryWeeks,
        },
    };
    return {
        player: {
            ...player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                treasuryCash: platform.treasuryCash - definition.cashCost,
                originalCommissions: platform.originalCommissions.map(item => item.id === commissionId ? {
                    ...item,
                    localization: {
                        packageId,
                        subtitleLanguageCount: definition.subtitleLanguageCount,
                        dubbedLanguageCount: definition.dubbedLanguageCount,
                        cashCost: definition.cashCost,
                        committedAtAbsoluteWeek: absoluteWeek,
                        readyAtAbsoluteWeek: absoluteWeek + definition.deliveryWeeks,
                    },
                } : item),
                eventLedger: [...platform.eventLedger, ledger],
            }, player.id),
        },
        changed: true,
    };
};

const scopeRank: Record<StreamingOriginalReleaseScope, number> = {
    DOMESTIC: 0,
    MULTI_REGION: 1,
    GLOBAL: 2,
};

export const authorizeStreamingOriginalRelease = (
    player: Player,
    commissionId: string,
    input: {
        scope: StreamingOriginalReleaseScope;
        releasePattern: StreamingOriginalReleasePattern;
        marketingPlan: StreamingSlateMarketingPlan;
    },
): {
    player: Player;
    changed: boolean;
    reason?: 'UNKNOWN_ORIGINAL' | 'NOT_DELIVERED' | 'LOCALIZATION_REQUIRED' | 'LOCALIZATION_IN_PROGRESS' | 'SCOPE_EXCEEDS_LOCALIZATION' | 'ALREADY_AUTHORIZED';
} => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const commission = platform.originalCommissions.find(item => item.id === commissionId);
    if (!commission || !commission.canonicalProjectId) return { player, changed: false, reason: 'UNKNOWN_ORIGINAL' };
    if (commission.releasePlan) return { player, changed: false, reason: 'ALREADY_AUTHORIZED' };
    const liveStatus = getStreamingOriginalLiveStatus(player, commission);
    if (liveStatus !== 'DELIVERED') return { player, changed: false, reason: 'NOT_DELIVERED' };
    if (!commission.localization) return { player, changed: false, reason: 'LOCALIZATION_REQUIRED' };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    if (commission.localization.readyAtAbsoluteWeek > absoluteWeek) {
        return { player, changed: false, reason: 'LOCALIZATION_IN_PROGRESS' };
    }
    if (scopeRank[input.scope] > scopeRank[commission.localization.packageId]) {
        return { player, changed: false, reason: 'SCOPE_EXCEEDS_LOCALIZATION' };
    }
    const commitment = player.commitments.find(item => item.id === commission.canonicalProjectId);
    if (!commitment || commitment.projectPhase !== 'AWAITING_RELEASE' || !commitment.projectDetails) {
        return { player, changed: false, reason: 'NOT_DELIVERED' };
    }
    const idempotencyKey = `original-release:${commission.id}`;
    const releasePattern = commission.projectType === 'MOVIE' ? 'SINGLE_PREMIERE' : input.releasePattern;
    const premiereAtAbsoluteWeek = absoluteWeek + 1;
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        absoluteWeek,
        type: 'ORIGINAL_RELEASE_AUTHORIZED',
        summary: `${commission.title} was cleared for a ${input.scope.toLowerCase().replace('_', ' ')} ${releasePattern.toLowerCase().replace('_', ' ')} premiere.`,
        source: 'PLAYER_ACTION',
        metadata: {
            commissionId,
            projectId: commission.canonicalProjectId,
            premiereAtAbsoluteWeek,
            scope: input.scope,
            releasePattern,
        },
    };
    return {
        player: {
            ...player,
            commitments: player.commitments.map(item => item.id !== commitment.id ? item : {
                ...item,
                projectPhase: 'AWAITING_RELEASE',
                phaseWeeksLeft: 1,
                totalPhaseDuration: 1,
                projectDetails: {
                    ...item.projectDetails!,
                    releaseStrategy: 'STREAMING_ONLY',
                    releaseDate: (player.currentWeek % 52) + 1,
                    hiddenStats: {
                        ...item.projectDetails!.hiddenStats,
                        ownedStreamingReleaseScope: input.scope,
                        ownedStreamingReleasePattern: releasePattern,
                        ownedStreamingLocalizationPackage: commission.localization.packageId,
                    },
                },
            }),
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                originalCommissions: platform.originalCommissions.map(item => item.id === commissionId ? {
                    ...item,
                    releasePlan: {
                        scope: input.scope,
                        releasePattern,
                        marketingPlan: input.marketingPlan,
                        premiereAtAbsoluteWeek,
                        authorizedAtAbsoluteWeek: absoluteWeek,
                    },
                } : item),
                eventLedger: [...platform.eventLedger, ledger],
            }, player.id),
        },
        changed: true,
    };
};

const continuationTitle = (
    commission: OwnedStreamingOriginalCommission,
    type: StreamingOriginalLifecycleDecisionType,
): string => {
    if (type === 'RENEW') {
        const nextSeason = Math.max(2, (commission.seasonNumber || 1) + 1);
        return commission.title.replace(/\s+Season\s+\d+$/i, '') + ` Season ${nextSeason}`;
    }
    return `${commission.title.replace(/\s+Season\s+\d+$/i, '')}: New Story`;
};

export const decideStreamingOriginalFuture = (
    player: Player,
    commissionId: string,
    type: StreamingOriginalLifecycleDecisionType,
): {
    player: Player;
    changed: boolean;
    opensPitchRoom: boolean;
    reason?: 'UNKNOWN_ORIGINAL' | 'REPORTS_MATURING' | 'ALREADY_DECIDED' | 'SEQUEL_RIGHTS_REQUIRED';
} => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const commission = platform.originalCommissions.find(item => item.id === commissionId);
    if (!commission || !commission.canonicalProjectId) {
        return { player, changed: false, opensPitchRoom: false, reason: 'UNKNOWN_ORIGINAL' };
    }
    if (commission.lifecycleDecision) {
        return { player, changed: false, opensPitchRoom: false, reason: 'ALREADY_DECIDED' };
    }
    const analytics = getStreamingTitleAnalytics(player, commission.canonicalProjectId).selected;
    const evidenceWeeks = analytics?.entry.projectId === commission.canonicalProjectId ? analytics.measuredWeeks : 0;
    if (getStreamingOriginalLiveStatus(player, commission) !== 'RELEASED' || evidenceWeeks < 4) {
        return { player, changed: false, opensPitchRoom: false, reason: 'REPORTS_MATURING' };
    }
    if (type === 'FRANCHISE' && commission.contract?.sequelRightsIncluded === false) {
        return { player, changed: false, opensPitchRoom: false, reason: 'SEQUEL_RIGHTS_REQUIRED' };
    }
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const idempotencyKey = `original-future:${commission.id}`;
    const evidenceSummary = `${evidenceWeeks} measured weeks · ${analytics?.momentum || 'UNKNOWN'} momentum · ${Math.round(analytics?.averageSatisfactionScore || 0)} satisfaction.`;
    const decisionId = createDeterministicId('streaming_original_decision', platform.simulationSeed, idempotencyKey);
    const opensPitchRoom = type === 'RENEW' || type === 'FRANCHISE';
    let nextDraft: OwnedStreamingOriginalCommissionDraft | null = platform.originalCommissionDraft;
    if (opensPitchRoom) {
        const base = createDefaultStreamingOriginalDraft(player);
        const nextSeason = type === 'RENEW' ? Math.max(2, (commission.seasonNumber || 1) + 1) : 1;
        nextDraft = {
            ...base,
            currentStep: 1,
            title: continuationTitle(commission, type),
            projectType: type === 'RENEW' ? commission.projectType : 'SERIES',
            genre: commission.genre,
            episodes: type === 'RENEW' && commission.projectType === 'SERIES' ? commission.episodes : 8,
            producerStudioId: commission.producerStudioId,
            productionBudgetCap: Math.max(
                5_000_000,
                Math.min(platform.treasuryCash, Math.round(commission.productionBudgetCap * (type === 'RENEW' ? 1.12 : 0.72) / 1_000_000) * 1_000_000),
            ),
            strategy: type === 'RENEW' ? commission.strategy : 'EXPERIMENTAL_CULT',
            platformRightsPercent: commission.contract?.platformRightsPercent || 85,
            exclusiveWindowWeeks: commission.contract?.exclusiveWindowWeeks || 24,
            sequelRightsIncluded: commission.contract?.sequelRightsIncluded !== false,
            parentCommissionId: commission.id,
            lineageId: commission.lineageId || commission.id,
            seasonNumber: nextSeason,
            updatedAtAbsoluteWeek: absoluteWeek,
        };
    }
    const exclusiveWindowWeeks = type === 'LICENSE_WINDOW'
        ? Math.max(8, commission.contract?.exclusiveWindowWeeks || 24)
        : null;
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        absoluteWeek,
        type: 'ORIGINAL_LIFECYCLE_DECIDED',
        summary: `${commission.title}: ${type.toLowerCase().replace('_', ' ')} approved from mature title evidence.`,
        source: 'PLAYER_ACTION',
        metadata: {
            commissionId,
            decisionId,
            decisionType: type,
            evidenceWeeks,
            exclusiveWindowWeeks,
        },
    };
    return {
        player: {
            ...player,
            ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
                ...platform,
                originalCommissionDraft: nextDraft,
                originalCommissions: platform.originalCommissions.map(item => item.id === commission.id ? {
                    ...item,
                    lifecycleDecision: {
                        id: decisionId,
                        type,
                        decidedAtAbsoluteWeek: absoluteWeek,
                        evidenceWeeks,
                        evidenceSummary,
                        exclusiveWindowWeeks,
                    },
                } : item),
                eventLedger: [...platform.eventLedger, ledger],
            }, player.id),
        },
        changed: true,
        opensPitchRoom,
    };
};
