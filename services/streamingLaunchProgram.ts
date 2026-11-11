import { streamingPlusLocks } from './streamingPlusPack';
import type {
    OwnedStreamingCustomIdentAudio,
    OwnedStreamingCostCommitment,
    OwnedStreamingDefineLaunchDraftState,
    OwnedStreamingPricingConfiguration,
    Player,
    StreamingCostCommitmentCategory,
    StreamingDefineLaunchStepId,
    StreamingIdentPackageId,
    StreamingSoundIdentKey,
} from '../types';
import { createDeterministicId } from './deterministicRandom';
import { describeStreamingPricingChange } from './streamingPricingChange';
import { getAbsoluteWeek } from './legacyLogic';
import {
    compactOwnedStreamingPlatformForPersistence,
    normalizeOwnedStreamingPlatformState,
} from './ownedStreamingPlatform';
import { getStreamingOpeningCatalogueView } from './streamingOpeningCatalogue';
import { getStreamingCatalogueReadContext, readStreamingCatalogueDerivedView, type StreamingCatalogueReadContext } from './streamingContentAvailability';
import {
    getStreamingStorefrontDefinition,
    getStreamingStorefrontLockReason,
} from './streamingStorefront';
import { normalizeStreamingPricingConfiguration } from './streamingPricingEconomy';
import { getStreamingInfrastructureForecast } from './streamingInfrastructure';
import { resolveStreamingTechTree, streamingTechDownloadsAllowed, streamingTechExtraMemberAllowed, streamingTechFeatureAllowed, streamingTechScreens } from './streamingTechTreeCatalogue';
import { streamingLaunchUnlockLock } from './streamingLaunchUnlocks';
import {
    STREAMING_FREE_TIER_ID, STREAMING_FREE_TIER_NAME, STREAMING_MAX_PLANS, STREAMING_PLAN_EXTRA_LOCK_TECH, getStreamingPlanExtraLocks, streamingPlanOfferLocks, type StreamingPlanOfferLock,
} from './streamingPlanOffer';
import { STREAMING_STORE_ID, STREAMING_STORE_NAME } from './streamingStoreEditions';

export type StreamingLaunchTrackId = 'DEFINE_LAUNCH' | 'BUILD_PLATFORM';
export type StreamingLaunchMilestoneId =
    | 'FUND_COMPANY'
    | 'OPENING_MARKETS'
    | 'MARKET_CLEARANCES'
    | 'SERVICE_IDENT'
    | 'STOREFRONT_PRICING'
    | 'PRICING'
    | 'OPENING_CATALOGUE'
    | 'LAUNCH_BLUEPRINT'
    | 'NETWORK_BLUEPRINT'
    | 'FACILITIES'
    | 'RACK_GROUPS'
    | 'PHYSICAL_CAPACITY'
    | 'COMMISSIONING'
    | 'REHEARSAL'
    | 'OPENING_NIGHT';
export type StreamingLaunchMilestoneStatus =
    | 'COMPLETE'
    | 'ACTION_REQUIRED'
    | 'IN_PROGRESS'
    | 'AVAILABLE'
    | 'BLOCKED';
export type StreamingLaunchDestination =
    | 'FINANCE'
    | 'OPENING_MARKETS'
    | 'MARKET_CLEARANCE'
    | 'SERVICE_IDENTITY'
    | 'STOREFRONT'
    | 'PRICING'
    | 'CATALOGUE'
    | 'LAUNCH_BLUEPRINT'
    | 'NETWORK_BLUEPRINT'
    | 'FACILITIES'
    | 'RACK_GROUPS'
    | 'PHYSICAL_CAPACITY'
    | 'COMMISSIONING'
    | 'REHEARSAL'
    | 'OPENING_NIGHT';

export interface StreamingLaunchBlockerView {
    id: string;
    milestoneId: StreamingLaunchMilestoneId;
    message: string;
}

export interface StreamingLaunchWarningView {
    id: string;
    milestoneId: StreamingLaunchMilestoneId | null;
    tone: 'NOTICE' | 'WARNING' | 'CRITICAL';
    message: string;
}

export interface StreamingLaunchMilestoneView {
    id: StreamingLaunchMilestoneId;
    trackId: StreamingLaunchTrackId | 'FINALE';
    label: string;
    shortLabel: string;
    description: string;
    destination: StreamingLaunchDestination;
    status: StreamingLaunchMilestoneStatus;
    complete: boolean;
    canPlan: boolean;
    canCommit: boolean;
    blockerCount: number;
    warningCount: number;
}

export interface StreamingLaunchTrackView {
    id: StreamingLaunchTrackId;
    label: string;
    question: string;
    completedCount: number;
    totalCount: number;
    progressPercent: number;
    milestones: StreamingLaunchMilestoneView[];
}

/** Funding remains a campaign condition, but it is not one of the seven
 * screens inside Define the Launch. Presentation counters must use this
 * boundary so a funded, cleared wizard cannot render as 8/7 or 8/8. */
export const isStreamingDefineLaunchWizardMilestone = (
    milestone: Pick<StreamingLaunchMilestoneView, 'id' | 'trackId'>,
): boolean => milestone.trackId === 'DEFINE_LAUNCH' && milestone.id !== 'FUND_COMPANY';

export const getStreamingDefineLaunchWizardProgress = (
    track: { milestones: Array<Pick<StreamingLaunchMilestoneView, 'id' | 'trackId' | 'complete'>> },
): { completedCount: number; totalCount: number } => {
    const milestones = track.milestones.filter(isStreamingDefineLaunchWizardMilestone);
    return {
        completedCount: milestones.filter(milestone => milestone.complete).length,
        totalCount: milestones.length,
    };
};

export interface StreamingLaunchBudgetView {
    availableTreasury: number;
    availableToCommit: number;
    plannedSpend: number;
    committedSpend: number;
    paidSpend: number;
    weeklyCommittedBurn: number;
    remainingAfterPlan: number;
    remainingCash: number;
    shortfall: number;
    tone: 'NEUTRAL' | 'POSITIVE' | 'WARNING' | 'CRITICAL';
}

export interface StreamingRecommendedLaunchAction {
    milestoneId: StreamingLaunchMilestoneId;
    label: string;
    description: string;
    destination: StreamingLaunchDestination;
    reason: string;
}

export interface StreamingLaunchProgramView {
    status: 'NOT_STARTED' | 'PLANNING' | 'READY' | 'LAUNCHED';
    tracks: StreamingLaunchTrackView[];
    finale: StreamingLaunchMilestoneView;
    milestones: StreamingLaunchMilestoneView[];
    completedCount: number;
    totalCount: number;
    progressPercent: number;
    blockers: StreamingLaunchBlockerView[];
    warnings: StreamingLaunchWarningView[];
    budget: StreamingLaunchBudgetView;
    recommendedNextAction: StreamingRecommendedLaunchAction | null;
}

export interface StreamingOpeningMarketDecisionState {
    selectedCountryIds: string[];
    readyToCommission: boolean;
    reviewComplete: boolean;
    actionRequiredOperationIds: string[];
    unfiledOperationIds: string[];
}

export const getStreamingOpeningMarketDecisionState = (player: Player, context?: StreamingCatalogueReadContext): StreamingOpeningMarketDecisionState => {
    const platform = context?.player === player ? context.platform : normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const operations = platform.marketOperations.filter(operation => (
        operation.scope === 'COUNTRY'
        && operation.entryKind === 'OPENING'
        && operation.status !== 'EXITED'
        && Boolean(operation.countryId)
    ));
    const actionRequired = operations.filter(operation => (
        operation.clearance?.outcome === 'ADDITIONAL_REQUIREMENT'
        || operation.clearance?.outcome === 'TEMPORARILY_REJECTED'
    ));
    const selectedCountryIds = operations.map(operation => operation.countryId!).sort();
    return {
        selectedCountryIds,
        readyToCommission: selectedCountryIds.length > 0 && actionRequired.length === 0,
        reviewComplete: selectedCountryIds.length > 0 && operations.every(operation => (
            ['READY', 'ACTIVE'].includes(operation.status)
            || operation.clearance?.outcome === 'APPROVED'
            || operation.clearance?.outcome === 'APPROVED_WITH_CONDITIONS'
        )),
        actionRequiredOperationIds: actionRequired.map(operation => operation.id).sort(),
        unfiledOperationIds: operations
            .filter(operation => ['PLANNED', 'AWAITING_FUNDING'].includes(operation.status))
            .map(operation => operation.id)
            .sort(),
    };
};

const roundMoney = (value: number): number => Math.max(0, Math.round(Number(value) || 0));

export const STREAMING_FULL_IDENT_COST = 4_500_000;

export const STREAMING_IDENT_PACKAGE_COSTS: Record<StreamingIdentPackageId, number> = {
    STANDARD: 0,
    FULL: STREAMING_FULL_IDENT_COST,
    CINEMATIC: 6_500_000,
    GENRE: 7_500_000,
    ADAPTIVE: 9_000_000,
    LIVING: 14_000_000,
};
const STREAMING_IDENT_PACKAGE_IDS: StreamingIdentPackageId[] = ['STANDARD', 'FULL', 'CINEMATIC', 'GENRE', 'ADAPTIVE', 'LIVING'];
export const STREAMING_IDENT_PACKAGE_DURATIONS: Record<StreamingIdentPackageId, number> = {
    STANDARD: 3,
    FULL: 8,
    CINEMATIC: 12,
    GENRE: 10,
    ADAPTIVE: 10,
    LIVING: 12,
};
type NormalizedStreamingPlatform = ReturnType<typeof normalizeOwnedStreamingPlatformState>;

const getIdentCampaignId = (platform: NormalizedStreamingPlatform): string => {
    const opened = platform.launchProgram.startedAtAbsoluteWeek
        ?? platform.identity?.foundedAtAbsoluteWeek
        ?? 0;
    return `opening-${opened}`;
};

export interface StreamingIdentPurchaseView {
    campaignId: string;
    purchasedPackageIds: StreamingIdentPackageId[];
    paidByPackage: Partial<Record<StreamingIdentPackageId, number>>;
    totalPaid: number;
}

/** Ident packages are owned only inside the current launch campaign. Legacy
 * pre-campaign payments are attributed to the configuration they purchased. */
export const getStreamingIdentPurchaseView = (player: Player, context?: StreamingCatalogueReadContext): StreamingIdentPurchaseView => {
    const platform = context?.player === player ? context.platform : normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const campaignId = getIdentCampaignId(platform);
    const prefix = `service-ident:${campaignId}:`;
    const paidByPackage: Partial<Record<StreamingIdentPackageId, number>> = { STANDARD: 0 };
    const legacyPurchased = new Set<StreamingIdentPackageId>();

    platform.costCommitments.forEach(commitment => {
        if (!['PAID', 'MIGRATED'].includes(commitment.status)) return;
        const source = commitment.sourceReferenceId || '';
        if (source.startsWith(prefix)) {
            const packageId = source.slice(prefix.length).toUpperCase() as StreamingIdentPackageId;
            if (STREAMING_IDENT_PACKAGE_IDS.includes(packageId)) {
                paidByPackage[packageId] = (paidByPackage[packageId] || 0) + commitment.paidAmount;
            }
            return;
        }
        if (source === 'service-ident' && platform.serviceConfiguration.identPackageId) {
            const legacyPackage = platform.serviceConfiguration.identPackageId;
            paidByPackage[legacyPackage] = (paidByPackage[legacyPackage] || 0) + commitment.paidAmount;
            legacyPurchased.add(legacyPackage);
        }
    });

    const purchasedPackageIds = STREAMING_IDENT_PACKAGE_IDS.filter(packageId => (
        packageId === 'STANDARD'
        || legacyPurchased.has(packageId)
        || (paidByPackage[packageId] || 0) >= STREAMING_IDENT_PACKAGE_COSTS[packageId]
    ));
    const totalPaid = STREAMING_IDENT_PACKAGE_IDS.reduce((sum, packageId) => sum + (paidByPackage[packageId] || 0), 0);
    return { campaignId, purchasedPackageIds, paidByPackage, totalPaid };
};

export const getStreamingLaunchDefinitionSignature = (player: Player, context?: StreamingCatalogueReadContext): string => {
    const platform = context?.player === player ? context.platform : normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const markets = platform.marketOperations
        .filter(operation => operation.entryKind === 'OPENING' && operation.status !== 'EXITED')
        .map(operation => `${operation.countryId}:${operation.status}:${operation.plannedCosts.total}:${operation.policySnapshot?.revision || 0}:${operation.countryProfile?.recommendedNetworkFootprint.edgeSites || 0}:${operation.countryProfile?.recommendedNetworkFootprint.peakConcurrentStreams || 0}`)
        .sort();
    const licenses = platform.catalogLicenses
        .filter(license => license.status === 'ACTIVE')
        .map(license => `${license.sourceProjectId}:${license.territory}:${license.exclusivity}:${(license.countryIds || []).slice().sort().join(',')}`)
        .sort();
    const definition = JSON.stringify({
        markets,
        service: platform.serviceConfiguration,
        starterCatalog: platform.starterCatalog?.packageId || null,
        licenses,
        slate: platform.launchSlate ? `${platform.launchSlate.programmedAtAbsoluteWeek}:${platform.launchSlate.revision}` : null,
    });
    return createDeterministicId('streaming_definition', platform.simulationSeed, definition);
};

export interface StreamingLaunchConfigurationResult {
    player: Player;
    changed: boolean;
    reason: 'SAVED' | 'INVALID_STATE' | 'INSUFFICIENT_TREASURY' | 'INCOMPLETE' | 'LOCKED_OPTION';
    shortfall: number;
    /** Plans v2: the offer rows refused (LOCKED_OPTION), each with what it needs */
    locked?: Array<StreamingPlanOfferLock & { planId: string; planName: string }>;
    /** features a plan without an offer asked for and could not have, dropped and reported (Phase 1 plans) */
    dropped?: Array<{ planId: string; planName: string; featureId: string }>;
}

/** Persist free wizard intent without executing a paid domain action. */
export const saveStreamingDefineLaunchDraft = (
    player: Player,
    draft: OwnedStreamingDefineLaunchDraftState,
): StreamingLaunchConfigurationResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (platform.launchCommit) return { player, changed: false, reason: 'INVALID_STATE', shortfall: 0 };
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        launchProgram: {
            ...platform.launchProgram,
            defineDraft: draft,
        },
    }, player.id);
    if (JSON.stringify(nextPlatform.launchProgram.defineDraft) === JSON.stringify(platform.launchProgram.defineDraft)) {
        return { player, changed: false, reason: 'SAVED', shortfall: 0 };
    }
    return { player: { ...player, ownedStreamingPlatform: nextPlatform }, changed: true, reason: 'SAVED', shortfall: 0 };
};

export const setStreamingDefineLaunchStep = (
    player: Player,
    step: StreamingDefineLaunchStepId,
): Player => {
    // The UI receives a canonical player from the save boundary. Navigation
    // changes no domain configuration, so keep rights/country references warm
    // and let the normal durable-save path persist this small intent update.
    const platform = player.ownedStreamingPlatform;
    if (!platform.identity || platform.launchProgram.defineCurrentStep === step) return player;
    return {
        ...player,
        ownedStreamingPlatform: {
            ...platform,
            launchProgram: { ...platform.launchProgram, defineCurrentStep: step },
        },
    };
};

export type StreamingConfigurationScope = 'OPENING' | 'OPERATIONS';

const canEditStreamingConfiguration = (platform: ReturnType<typeof normalizeOwnedStreamingPlatformState>, scope: StreamingConfigurationScope): boolean =>
    Boolean(platform.identity && (!platform.launchCommit || scope === 'OPERATIONS' && platform.lifecycle === 'ACTIVE'));

export const saveStreamingServiceIdent = (
    player: Player,
    input: {
        soundIdentKey: StreamingSoundIdentKey;
        identPackageId: StreamingIdentPackageId;
        customIdentAudio?: OwnedStreamingCustomIdentAudio | null;
    },
    scope: StreamingConfigurationScope = 'OPENING',
): StreamingLaunchConfigurationResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (!canEditStreamingConfiguration(platform, scope)) return { player, changed: false, reason: 'INVALID_STATE', shortfall: 0 };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    /* #109 (plan §18.5): a kit is unlocked by its Tech step (Smart AI), not a Product Experience level; the kit already
       chosen stays usable */
    if (input.identPackageId !== platform.serviceConfiguration.identPackageId
        && streamingLaunchUnlockLock(resolveStreamingTechTree(platform), `ident:${input.identPackageId.toLowerCase()}`)) {
        return { player, changed: false, reason: 'INVALID_STATE', shortfall: 0 };
    }
    /* Streaming+: the Cinematic and Living idents need the pack; the ident a save already has stays */
    if (input.identPackageId !== platform.serviceConfiguration.identPackageId
        && streamingPlusLocks(player, { kind: 'IDENT', id: input.identPackageId })) {
        return { player, changed: false, reason: 'LOCKED_OPTION', shortfall: 0 };
    }
    const targetCost = STREAMING_IDENT_PACKAGE_COSTS[input.identPackageId];
    const purchases = getStreamingIdentPurchaseView(player);
    const packagePurchased = purchases.purchasedPackageIds.includes(input.identPackageId);
    const sameCustomAudio = (input.customIdentAudio?.fingerprint || null)
        === (platform.serviceConfiguration.customIdentAudio?.fingerprint || null);
    const sameConfiguration = platform.serviceConfiguration.soundIdentKey === input.soundIdentKey
        && platform.serviceConfiguration.identPackageId === input.identPackageId
        && sameCustomAudio;
    /* #112 (plan §18.11; it was charged the moment it was tapped, though its copy said "payable at launch", and a switch
       refunded nothing): a kit is charged at launch — the Opening Programme commission, with the launch's other money —
       not when it is chosen. A kit already paid for (a save from before #112) is refunded when another replaces it
       before launch. Once the programme is commissioned the launch's money has moved, so a new kit is paid as it is
       chosen. */
    const commissioned = Boolean(platform.openingProgrammeCommission);
    const hasCommissionEvidence = platform.serviceConfiguration.committedAtAbsoluteWeek !== null
        && (input.identPackageId === 'STANDARD' || packagePurchased || !commissioned);
    if (sameConfiguration && hasCommissionEvidence) {
        return { player, changed: false, reason: 'SAVED', shortfall: 0 };
    }
    const refunds = identRefundsOnSwitch(platform, purchases.campaignId, input.identPackageId);
    const refund = refunds.reduce((sum, commitment) => sum + commitment.paidAmount, 0);
    const delta = commissioned && !packagePurchased ? targetCost : 0;
    if (platform.treasuryCash + refund < delta) {
        return { player, changed: false, reason: 'INSUFFICIENT_TREASURY', shortfall: delta - platform.treasuryCash - refund };
    }
    const sourceReferenceId = `service-ident:${purchases.campaignId}:${input.identPackageId.toLowerCase()}`;
    const key = `${sourceReferenceId}:${targetCost}`;
    const commitment: OwnedStreamingCostCommitment | null = delta > 0 ? {
        id: createDeterministicId('streaming_launch_cost', platform.simulationSeed, key),
        idempotencyKey: key,
        category: 'SERVICE',
        label: `${input.identPackageId.toLowerCase()} service ident package`,
        status: 'PAID',
        plannedAmount: delta,
        committedAmount: delta,
        paidAmount: delta,
        weeklyAmount: 0,
        createdAtAbsoluteWeek: absoluteWeek,
        committedAtAbsoluteWeek: absoluteWeek,
        paidAtAbsoluteWeek: absoluteWeek,
        sourceReferenceId,
    } : null;
    const ledger = delta > 0 ? {
        id: createDeterministicId('streaming_event', platform.simulationSeed, key),
        idempotencyKey: key,
        absoluteWeek,
        type: 'SERVICE_CONFIGURATION_COMMITTED' as const,
        summary: `The ${input.identPackageId.toLowerCase()} motion and sound ident package entered production.`,
        source: 'PLAYER_ACTION' as const,
        metadata: { cost: delta, package: input.identPackageId },
    } : null;
    const refunded = new Set(refunds.map(commitment => commitment.id));
    const refundKey = `${sourceReferenceId}:refund:${refunds.map(commitment => commitment.id).join(',')}`;
    const refundLedger = refund > 0 ? {
        id: createDeterministicId('streaming_event', platform.simulationSeed, refundKey),
        idempotencyKey: refundKey,
        absoluteWeek,
        type: 'SERVICE_CONFIGURATION_COMMITTED' as const,
        summary: `The ident package it replaced was cancelled before launch; ${Math.round(refund).toLocaleString('en-US')} refunded.`,
        source: 'PLAYER_ACTION' as const,
        metadata: { refund, package: input.identPackageId },
    } : null;
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        treasuryCash: platform.treasuryCash - delta + refund,
        serviceConfiguration: {
            ...platform.serviceConfiguration,
            source: 'PLAYER_ACTION',
            soundIdentKey: input.soundIdentKey,
            identPackageId: input.identPackageId,
            identDurationSeconds: input.customIdentAudio?.durationSeconds
                || STREAMING_IDENT_PACKAGE_DURATIONS[input.identPackageId],
            customIdentAudio: input.customIdentAudio || null,
            committedCost: purchases.totalPaid - refund + delta,
            committedAtAbsoluteWeek: absoluteWeek,
            revision: platform.serviceConfiguration.revision + 1,
        },
        launchProgram: platform.launchCommit ? platform.launchProgram : {
            ...platform.launchProgram,
            status: 'PLANNING',
            defineCurrentStep: 'IDENTITY',
            serviceConfigurationCommittedAtAbsoluteWeek: absoluteWeek,
            configurationRevision: platform.launchProgram.configurationRevision + 1,
        },
        costCommitments: [
            ...platform.costCommitments.map(item => refunded.has(item.id) ? { ...item, status: 'REFUNDED' as const } : item),
            ...(commitment ? [commitment] : []),
        ],
        eventLedger: [...platform.eventLedger, ...(refundLedger ? [refundLedger] : []), ...(ledger ? [ledger] : [])],
    }, player.id);
    return { player: { ...player, ownedStreamingPlatform: nextPlatform }, changed: true, reason: 'SAVED', shortfall: 0 };
};

/* #112: the paid ident packages a switch to `nextPackage` cancels before launch — this campaign's receipts for any
   other package, and a legacy receipt for the package being replaced. Nothing after launch is refunded. */
const identRefundsOnSwitch = (
    platform: NormalizedStreamingPlatform,
    campaignId: string,
    nextPackage: StreamingIdentPackageId,
): OwnedStreamingCostCommitment[] => {
    if (platform.launchCommit) return [];
    const prefix = `service-ident:${campaignId}:`;
    const replacing = platform.serviceConfiguration.identPackageId;
    return platform.costCommitments.filter(commitment => {
        if (!['PAID', 'MIGRATED'].includes(commitment.status) || commitment.paidAmount <= 0) return false;
        const source = commitment.sourceReferenceId || '';
        if (source.startsWith(prefix)) return source.slice(prefix.length).toUpperCase() !== nextPackage;
        return source === 'service-ident' && Boolean(replacing) && replacing !== nextPackage;
    });
};

/** #112: what the chosen ident package still owes at launch (nothing once paid, or for the included one). */
export const getStreamingIdentDueAtLaunch = (player: Player, context?: StreamingCatalogueReadContext): number => {
    const platform = context?.player === player ? context.platform : normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const active = platform.serviceConfiguration.identPackageId;
    if (!active || platform.launchCommit) return 0;
    return getStreamingIdentPurchaseView(player, context).purchasedPackageIds.includes(active) ? 0 : STREAMING_IDENT_PACKAGE_COSTS[active];
};

/** #112: the Opening Programme commission pays the chosen ident package (once). It leaves the service configuration as
    it is, so the launch definition's signature — which the blueprint and the commission compare — does not move. */
export const chargeStreamingIdentAtLaunch = (player: Player): { player: Player; charged: number } => {
    const due = getStreamingIdentDueAtLaunch(player);
    if (due <= 0) return { player, charged: 0 };
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const active = platform.serviceConfiguration.identPackageId!;
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const sourceReferenceId = `service-ident:${getIdentCampaignId(platform)}:${active.toLowerCase()}`;
    const key = `${sourceReferenceId}:${due}:at-launch`;
    if (platform.costCommitments.some(item => item.idempotencyKey === key && item.status === 'PAID')) return { player, charged: 0 };
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        treasuryCash: platform.treasuryCash - due,
        costCommitments: [...platform.costCommitments, {
            id: createDeterministicId('streaming_launch_cost', platform.simulationSeed, key),
            idempotencyKey: key,
            category: 'SERVICE',
            label: `${active.toLowerCase()} service ident package`,
            status: 'PAID',
            plannedAmount: due,
            committedAmount: due,
            paidAmount: due,
            weeklyAmount: 0,
            createdAtAbsoluteWeek: absoluteWeek,
            committedAtAbsoluteWeek: absoluteWeek,
            paidAtAbsoluteWeek: absoluteWeek,
            sourceReferenceId,
        }],
        eventLedger: [...platform.eventLedger, {
            id: createDeterministicId('streaming_event', platform.simulationSeed, key),
            idempotencyKey: key,
            absoluteWeek,
            type: 'SERVICE_CONFIGURATION_COMMITTED' as const,
            summary: `The ${active.toLowerCase()} motion and sound ident package was paid at launch.`,
            source: 'PLAYER_ACTION' as const,
            metadata: { cost: due, package: active },
        }],
    }, player.id);
    return { player: { ...player, ownedStreamingPlatform: nextPlatform }, charged: due };
};

/** Permanently removes the locally stored audio blob. Package receipts remain
 * in the ledger, but the active ident becomes incomplete until recommissioned. */
export const removeStreamingCustomIdentAudio = (player: Player): StreamingLaunchConfigurationResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (!platform.identity || platform.launchCommit) return { player, changed: false, reason: 'INVALID_STATE', shortfall: 0 };
    if (!platform.serviceConfiguration.customIdentAudio) return { player, changed: false, reason: 'SAVED', shortfall: 0 };
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        serviceConfiguration: {
            ...platform.serviceConfiguration,
            source: 'UNCONFIGURED',
            soundIdentKey: null,
            identDurationSeconds: 0,
            customIdentAudio: null,
            committedAtAbsoluteWeek: null,
            revision: platform.serviceConfiguration.revision + 1,
        },
        launchProgram: {
            ...platform.launchProgram,
            status: 'PLANNING',
            defineCurrentStep: 'IDENTITY',
            serviceConfigurationCommittedAtAbsoluteWeek: null,
            configurationRevision: platform.launchProgram.configurationRevision + 1,
        },
    }, player.id);
    return { player: { ...player, ownedStreamingPlatform: nextPlatform }, changed: true, reason: 'SAVED', shortfall: 0 };
};

/** Clear the active ident choice without refunding a commissioned package. */
export const clearStreamingServiceIdent = (player: Player): StreamingLaunchConfigurationResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (!platform.identity || platform.launchCommit) return { player, changed: false, reason: 'INVALID_STATE', shortfall: 0 };
    if (!platform.serviceConfiguration.identPackageId && !platform.serviceConfiguration.soundIdentKey) {
        return { player, changed: false, reason: 'SAVED', shortfall: 0 };
    }
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        serviceConfiguration: {
            ...platform.serviceConfiguration,
            source: 'UNCONFIGURED',
            soundIdentKey: null,
            identPackageId: null,
            identDurationSeconds: 0,
            customIdentAudio: null,
            committedAtAbsoluteWeek: null,
            revision: platform.serviceConfiguration.revision + 1,
        },
        launchProgram: {
            ...platform.launchProgram,
            status: 'PLANNING',
            defineCurrentStep: 'IDENTITY',
            serviceConfigurationCommittedAtAbsoluteWeek: null,
            configurationRevision: platform.launchProgram.configurationRevision + 1,
        },
    }, player.id);
    return { player: { ...player, ownedStreamingPlatform: nextPlatform }, changed: true, reason: 'SAVED', shortfall: 0 };
};

export const saveStreamingStorefrontPlan = (
    player: Player,
    input: { storefrontLayoutId: string; pricingApproach?: string },
    scope: StreamingConfigurationScope = 'OPENING',
): StreamingLaunchConfigurationResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (!canEditStreamingConfiguration(platform, scope)) return { player, changed: false, reason: 'INVALID_STATE', shortfall: 0 };
    if (!input.storefrontLayoutId) return { player, changed: false, reason: 'INCOMPLETE', shortfall: 0 };
    const storefront = getStreamingStorefrontDefinition(input.storefrontLayoutId);
    if (!storefront) return { player, changed: false, reason: 'INVALID_STATE', shortfall: 0 };
    const storefrontId = storefront.id;
    /* #109: a front page is unlocked by its Tech step; the one already in use stays usable */
    if (storefrontId !== platform.serviceConfiguration.storefrontLayoutId && getStreamingStorefrontLockReason(platform, storefrontId)) {
        return { player, changed: false, reason: 'INVALID_STATE', shortfall: 0 };
    }
    /* Streaming+: 13 front pages need the pack; the one already in use stays */
    if (storefrontId !== platform.serviceConfiguration.storefrontLayoutId
        && streamingPlusLocks(player, { kind: 'STOREFRONT', id: storefrontId })) {
        return { player, changed: false, reason: 'LOCKED_OPTION', shortfall: 0 };
    }
    if (platform.serviceConfiguration.storefrontLayoutId === storefrontId
        && (!input.pricingApproach || input.pricingApproach === platform.serviceConfiguration.pricingApproach)) {
        return { player, changed: false, reason: 'SAVED', shortfall: 0 };
    }
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    /* #117: a live service's new front page goes on its ledger, and next week's news reports it ("NAME redesigns its app") */
    const redesignKey = `streaming-front-page:${platform.serviceConfiguration.revision + 1}`;
    const redesign = platform.launchCommit && storefrontId !== platform.serviceConfiguration.storefrontLayoutId ? {
        id: createDeterministicId('streaming_event', platform.simulationSeed, redesignKey),
        idempotencyKey: redesignKey,
        absoluteWeek,
        type: 'SERVICE_CONFIGURATION_COMMITTED' as const,
        summary: `The app's front page is now ${storefront.name}.`,
        source: 'PLAYER_ACTION' as const,
        metadata: { kind: 'FRONT_PAGE_CHANGED', layout: storefront.name },
    } : null;
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        eventLedger: redesign ? [...platform.eventLedger, redesign] : platform.eventLedger,
        serviceConfiguration: {
            ...platform.serviceConfiguration,
            source: 'PLAYER_ACTION',
            storefrontLayoutId: storefrontId,
            pricingApproach: input.pricingApproach || platform.serviceConfiguration.pricingApproach,
            revision: platform.serviceConfiguration.revision + 1,
        },
        launchProgram: platform.launchCommit ? platform.launchProgram : {
            ...platform.launchProgram,
            status: 'PLANNING',
            startedAtAbsoluteWeek: platform.launchProgram.startedAtAbsoluteWeek ?? absoluteWeek,
            defineCurrentStep: 'STOREFRONT',
            configurationRevision: platform.launchProgram.configurationRevision + 1,
        },
    }, player.id);
    return { player: { ...player, ownedStreamingPlatform: nextPlatform }, changed: true, reason: 'SAVED', shortfall: 0 };
};

/** Clear the active storefront while preserving every paid or planned receipt. */
export const clearStreamingStorefrontPlan = (player: Player): StreamingLaunchConfigurationResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (!platform.identity || platform.launchCommit) return { player, changed: false, reason: 'INVALID_STATE', shortfall: 0 };
    if (!platform.serviceConfiguration.storefrontLayoutId) {
        return { player, changed: false, reason: 'SAVED', shortfall: 0 };
    }
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        serviceConfiguration: {
            ...platform.serviceConfiguration,
            storefrontLayoutId: null,
            revision: platform.serviceConfiguration.revision + 1,
        },
        launchProgram: {
            ...platform.launchProgram,
            status: 'PLANNING',
            defineCurrentStep: 'STOREFRONT',
            configurationRevision: platform.launchProgram.configurationRevision + 1,
        },
    }, player.id);
    return { player: { ...player, ownedStreamingPlatform: nextPlatform }, changed: true, reason: 'SAVED', shortfall: 0 };
};

export const saveStreamingPricingPlan = (
    player: Player,
    pricing: OwnedStreamingPricingConfiguration,
    scope: StreamingConfigurationScope = 'OPENING',
): StreamingLaunchConfigurationResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (!canEditStreamingConfiguration(platform, scope)) return { player, changed: false, reason: 'INVALID_STATE', shortfall: 0 };
    if (pricing.commercialOffers?.coreModelSelected === false
        || !pricing.streams.length || pricing.streams.includes('subs') && !pricing.plans.length) {
        return { player, changed: false, reason: 'INCOMPLETE', shortfall: 0 };
    }
    const activeProducts = new Set(platform.productLines.filter(line => line.status === 'ACTIVE').map(line => line.lineId));
    const commerce = platform.technologyLevels.ADVERTISING_COMMERCE;
    const product = platform.technologyLevels.PRODUCT_EXPERIENCE;
    const allowedStreams = pricing.streams.filter(stream => {
        if (stream === 'subs' || stream === 'ads' || stream === 'rentals') return true;
        if (stream === 'sponsor') return commerce >= 20 || activeProducts.has('FREE');
        if (stream === 'premium') return activeProducts.has('STORE');
        if (stream === 'daypass') return activeProducts.has('LIVE');
        if (stream === 'metered') return commerce >= 60 && product >= 50;
        return activeProducts.has('FAN') && commerce >= 40;
    });
    if (!allowedStreams.length) return { player, changed: false, reason: 'INCOMPLETE', shortfall: 0 };
    /* 1080p, 4K HDR and Spatial audio come from the tech tree (Platform room · Tech). */
    const techTree = resolveStreamingTechTree(platform);
    /* Plans v2: a locked offer row is never saved, and the player is told what it needs (§6.4). */
    const requestedPlans = pricing.plans.slice(0, STREAMING_MAX_PLANS);
    const extraLocks = getStreamingPlanExtraLocks(techTree, activeProducts);
    const locked = requestedPlans.flatMap(plan => plan.offer ? [
        ...streamingPlanOfferLocks(plan.offer, techTree, platform.technologyLevels),
        // a plan built in the plan builder (#45) is refused its locked extras the same way
        ...(['live', 'extraseat'] as const).filter(id => plan.featureIds.includes(id) && extraLocks[id])
            .map((id): StreamingPlanOfferLock => ({ row: id, needs: extraLocks[id]!, techId: STREAMING_PLAN_EXTRA_LOCK_TECH[id] ?? null })),
    ].map(lock => ({ ...lock, planId: plan.id, planName: plan.name })) : []);
    // Free with ads' and Rent or buy's quality (#46, #47) are held to the same tech
    if (pricing.freeAdOffer) {
        locked.push(...streamingPlanOfferLocks(pricing.freeAdOffer, techTree, platform.technologyLevels)
            .map(lock => ({ ...lock, planId: STREAMING_FREE_TIER_ID, planName: STREAMING_FREE_TIER_NAME })));
    }
    if (pricing.storeQuality) {
        locked.push(...streamingPlanOfferLocks(pricing.storeQuality, techTree, platform.technologyLevels)
            .map(lock => ({ ...lock, planId: STREAMING_STORE_ID, planName: STREAMING_STORE_NAME })));
    }
    if (locked.length) return { player, changed: false, reason: 'LOCKED_OPTION', shortfall: 0, locked };
    const featureAllowed = (feature: string): boolean => {
        if (feature === 'hd' || feature === 'uhd' || feature === 'spatial') return streamingTechFeatureAllowed(techTree, feature);
        // screens come from Profiles and screens (#60; they read Reliability 10 and 35 before)
        if (feature === 'streams2') return streamingTechScreens(techTree) >= 2;
        if (feature === 'streams4') return streamingTechScreens(techTree) >= 4;
        if (feature === 'streams6') return streamingTechScreens(techTree) >= 6;
        if (feature === 'downloads') return streamingTechDownloadsAllowed(techTree);
        if (feature === 'early') return true; // C5 offer benefit is rights-limited, not research-gated.
        if (feature === 'live') return activeProducts.has('LIVE');
        if (feature === 'extraseat') return streamingTechExtraMemberAllowed(techTree); // Paid extra member (#56)
        return feature === 'noads' || feature === 'catalogue';
    };
    // A plan without an offer (the Phase 1 way) keeps only the features it may have, and says which it lost.
    const dropped = requestedPlans.flatMap(plan => plan.offer ? [] : plan.featureIds
        .filter(featureId => !featureAllowed(featureId))
        .map(featureId => ({ planId: plan.id, planName: plan.name, featureId })));
    const safePricing = normalizeStreamingPricingConfiguration({
        ...pricing,
        streams: allowedStreams,
        plans: requestedPlans.map(plan => ({
            ...plan,
            featureIds: plan.offer ? plan.featureIds : plan.featureIds.filter(featureAllowed),
            ads: allowedStreams.includes('ads') && plan.ads,
        })),
    });
    if (JSON.stringify(safePricing) === JSON.stringify(platform.serviceConfiguration.pricing)) {
        return { player, changed: false, reason: 'SAVED', shortfall: 0, ...(dropped.length ? { dropped } : {}) };
    }
    /* The Build wizard's three price tiers (Basic, Premium, Family) mirror the plans before launch.
       With plans of any number and price, they follow the paid plans from cheapest to dearest,
       kept inside the tiers' ranges and gaps so a plan line-up never blocks commissioning. */
    const paidPrices = safePricing.plans.map(plan => Number(plan.monthly) || 0).filter(price => price > 0).sort((a, b) => a - b);
    const tierBasic = Math.min(14.99, Math.max(3.99, paidPrices[0] ?? platform.subscriptionPrices.BASIC));
    const tierPremium = Math.min(24.99, Math.max(7.99, tierBasic + 2, paidPrices[Math.floor(paidPrices.length / 2)] ?? platform.subscriptionPrices.PREMIUM));
    const tierFamily = Math.min(34.99, Math.max(11.99, tierPremium + 3, paidPrices.at(-1) ?? platform.subscriptionPrices.FAMILY));
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    /* a live service's newsworthy change goes on its ledger, and next week's news reports it (#68) */
    const change = platform.launchCommit ? describeStreamingPricingChange(platform.serviceConfiguration.pricing, safePricing) : null;
    const changeKey = `streaming-pricing-change:${platform.serviceConfiguration.revision + 1}`;
    const changeEntry = change ? {
        id: createDeterministicId('streaming_event', platform.simulationSeed, changeKey),
        idempotencyKey: changeKey,
        absoluteWeek,
        type: 'PRICING_CHANGED' as const,
        summary: 'Prices or plans changed from next week.',
        source: 'PLAYER_ACTION' as const,
        metadata: { kind: 'PRICING_CHANGED', change: change.change, plan: change.plan, from: change.from, to: change.to, percent: change.percent },
    } : null;
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        eventLedger: changeEntry ? [...platform.eventLedger, changeEntry] : platform.eventLedger,
        /* Live copy (deviation from main): once launched, the legacy tier
           prices are left alone. The live offer reads serviceConfiguration.pricing
           only, while Build seeds network drafts from subscriptionPrices and
           validates them against the three-tier ladder; mirroring a $0 ad tier
           there would block every later network revision. */
        subscriptionPrices: platform.launchCommit ? platform.subscriptionPrices : {
            BASIC: Math.round(tierBasic * 100) / 100,
            PREMIUM: Math.round(tierPremium * 100) / 100,
            FAMILY: Math.round(tierFamily * 100) / 100,
        },
        serviceConfiguration: {
            ...platform.serviceConfiguration,
            source: 'PLAYER_ACTION',
            pricingApproach: 'CUSTOM',
            pricing: safePricing,
            revision: platform.serviceConfiguration.revision + 1,
        },
        launchProgram: platform.launchCommit ? platform.launchProgram : {
            ...platform.launchProgram,
            status: 'PLANNING',
            startedAtAbsoluteWeek: platform.launchProgram.startedAtAbsoluteWeek ?? absoluteWeek,
            defineCurrentStep: 'PRICING',
            configurationRevision: platform.launchProgram.configurationRevision + 1,
        },
    }, player.id);
    return { player: { ...player, ownedStreamingPlatform: nextPlatform }, changed: true, reason: 'SAVED', shortfall: 0, ...(dropped.length ? { dropped } : {}) };
};

export const checkpointStreamingLaunchBlueprint = (player: Player, preparedContext?: StreamingCatalogueReadContext): StreamingLaunchConfigurationResult => {
    const context = getStreamingCatalogueReadContext(player, preparedContext);
    const { platform } = context;
    const view = getStreamingLaunchProgramView(player, context);
    const required = ['OPENING_MARKETS', 'SERVICE_IDENT', 'STOREFRONT_PRICING', 'OPENING_CATALOGUE', 'PRICING'];
    const complete = required.every(id => view.milestones.find(item => item.id === id)?.complete);
    if (!platform.identity || !complete) return { player, changed: false, reason: 'INCOMPLETE', shortfall: 0 };
    const signature = getStreamingLaunchDefinitionSignature(player);
    if (platform.launchProgram.lastBlueprintSignature === signature) {
        return { player, changed: false, reason: 'SAVED', shortfall: 0 };
    }
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        launchProgram: {
            ...platform.launchProgram,
            status: 'PLANNING',
            defineCurrentStep: 'BLUEPRINT',
            lastBlueprintSignature: signature,
            blueprintSavedAtAbsoluteWeek: absoluteWeek,
        },
    }, player.id);
    return { player: { ...player, ownedStreamingPlatform: nextPlatform }, changed: true, reason: 'SAVED', shortfall: 0 };
};

/** Compatibility alias for older surfaces; new UI checkpoints automatically. */
export const saveStreamingLaunchBlueprint = checkpointStreamingLaunchBlueprint;

export const getStreamingLaunchBudgetView = (player: Player, context?: StreamingCatalogueReadContext): StreamingLaunchBudgetView => {
    const platform = context?.player === player ? context.platform : normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const commitmentSourceIds = new Set(platform.costCommitments.map(item => item.sourceReferenceId).filter(Boolean));
    const unmirroredMarketPlan = platform.marketOperations
        .filter(operation => !commitmentSourceIds.has(operation.id) && !['ACTIVE', 'EXITED'].includes(operation.status))
        .reduce((sum, operation) => sum + operation.plannedCosts.total, 0);
    const plannedSpend = platform.costCommitments
        .filter(item => item.status === 'PLANNED')
        .reduce((sum, item) => sum + item.plannedAmount, 0) + unmirroredMarketPlan;
    const committedSpend = platform.costCommitments
        .filter(item => item.status === 'COMMITTED')
        .reduce((sum, item) => sum + item.committedAmount, 0);
    const paidSpend = platform.costCommitments
        .filter(item => !['CANCELLED', 'REFUNDED'].includes(item.status))
        .reduce((sum, item) => sum + item.paidAmount, 0);
    const weeklyCommittedBurn = platform.costCommitments
        .filter(item => !['CANCELLED', 'REFUNDED'].includes(item.status))
        .reduce((sum, item) => sum + item.weeklyAmount, 0);
    const availableToCommit = Math.max(0, platform.treasuryCash - committedSpend);
    const remainingAfterPlan = platform.treasuryCash - committedSpend - plannedSpend;
    const shortfall = Math.max(0, -remainingAfterPlan);
    return {
        availableTreasury: roundMoney(platform.treasuryCash),
        availableToCommit: roundMoney(availableToCommit),
        plannedSpend: roundMoney(plannedSpend),
        committedSpend: roundMoney(committedSpend),
        paidSpend: roundMoney(paidSpend),
        weeklyCommittedBurn: roundMoney(weeklyCommittedBurn),
        remainingAfterPlan: Math.round(remainingAfterPlan),
        remainingCash: roundMoney(remainingAfterPlan),
        shortfall: roundMoney(shortfall),
        tone: shortfall > 0
            ? 'CRITICAL'
            : remainingAfterPlan === 0
                ? 'WARNING'
                : platform.treasuryCash > 0
                    ? 'POSITIVE'
                    : 'NEUTRAL',
    };
};

interface MilestoneDefinition {
    id: StreamingLaunchMilestoneId;
    trackId: StreamingLaunchTrackId | 'FINALE';
    label: string;
    shortLabel: string;
    description: string;
    destination: StreamingLaunchDestination;
    complete: boolean;
    inProgress?: boolean;
    blocker?: string | null;
}

const hasPositiveFundingHistory = (platform: NormalizedStreamingPlatform): boolean => {
    return platform.treasuryCash > 0
        || platform.finance.capitalActions.some(action => action.treasuryDelta > 0)
        || platform.costCommitments.some(item => ['COMMITTED', 'PAID', 'MIGRATED'].includes(item.status))
        || platform.marketOperations.some(operation => (
            operation.committedCosts.total > 0
            || ['CLEARANCE', 'INFRASTRUCTURE_PREPARATION', 'READY', 'ACTIVE'].includes(operation.status)
        ))
        || Boolean(platform.infrastructureSetup || platform.starterCatalog || platform.launchCommit);
};

const buildStreamingLaunchProgramView = (player: Player, context: StreamingCatalogueReadContext): StreamingLaunchProgramView => {
    const { platform } = context;
    const budget = getStreamingLaunchBudgetView(player, context);
    const openingMarkets = platform.marketOperations.filter(operation => (
        operation.scope === 'COUNTRY' && operation.entryKind === 'OPENING' && operation.status !== 'EXITED'
    ));
    const marketDecision = getStreamingOpeningMarketDecisionState(player, context);
    const marketsChosen = openingMarkets.length > 0;
    const marketsCleared = marketDecision.reviewComplete;
    const identPurchases = getStreamingIdentPurchaseView(player, context);
    const activeIdentPackage = platform.serviceConfiguration.identPackageId;
    /* #112: before the Opening Programme is commissioned a chosen kit is enough (it is paid at the commission) */
    const hasIdent = Boolean(
        platform.serviceConfiguration.soundIdentKey
        && activeIdentPackage
        && platform.serviceConfiguration.committedAtAbsoluteWeek !== null
        && (identPurchases.purchasedPackageIds.includes(activeIdentPackage) || !platform.openingProgrammeCommission),
    );
    const hasStorefront = Boolean(platform.serviceConfiguration.storefrontLayoutId);
    const hasPricing = Boolean(
        platform.serviceConfiguration.pricing.commercialOffers?.coreModelSelected !== false
        && platform.serviceConfiguration.pricingApproach
        && platform.serviceConfiguration.pricing.streams.length
        && (!platform.serviceConfiguration.pricing.streams.includes('subs') || platform.serviceConfiguration.pricing.plans.length),
    );
    const catalogueCoverage = getStreamingOpeningCatalogueView(player, context);
    const hasCatalogue = Boolean(platform.starterCatalog && catalogueCoverage.titles.some(title => title.available));
    /* #253: once commissioned the plan is locked: see getStreamingOpeningLock.
       2026-11-11: the blueprint autosaves, so it is current whenever the definition is
       complete. Comparing a stored signature went stale on every slate, price or
       clearance change, and the HQ sent players back to a page that already said
       "All 6 objectives are settled". */
    const blueprintSaved = Boolean(platform.infrastructureSetup)
        || Boolean(marketsChosen && hasIdent && hasStorefront && hasPricing && hasCatalogue);

    const draft = platform.infrastructureSetupDraft;
    const commissioned = platform.infrastructureSetup;
    const facilities = commissioned?.facilities?.length
        ? commissioned.facilities
        : draft?.facilities || [];
    const hasBlueprint = Boolean(commissioned || draft?.networkPlacements.length || facilities.length);
    const hasFacilities = Boolean(
        commissioned
        || facilities.length
        || draft?.networkPlacements.length,
    );
    const hasRackGroups = Boolean(
        commissioned
        || (facilities.length && facilities.every(facility => (
            facility.rackGroups?.length
            && facility.rackGroups.reduce((sum, group) => sum + group.rackCount, 0) > 0
        ))),
    );
    const hasPhysicalCapacity = Boolean(
        commissioned
        || draft?.lastLoadTestSignature
        || facilities.some(facility => Boolean(facility.physical)),
    );
    const isCommissioned = Boolean(commissioned);
    const draftForecast = draft ? getStreamingInfrastructureForecast(player, draft, context) : null;
    const rehearsalEvidence = draft?.lastLaunchRehearsal || commissioned?.loadTest.launchRehearsal;
    const rehearsalSignature = draftForecast?.configurationSignature || commissioned?.loadTest.configurationSignature;
    const currentBuildRehearsal = Boolean(
        rehearsalEvidence
        && rehearsalSignature
        && rehearsalEvidence.configurationSignature === rehearsalSignature
        && rehearsalEvidence.verdict !== 'BROKE',
    );
    const rehearsed = currentBuildRehearsal || Boolean(platform.launchProgram.lastRehearsalSignature || platform.launchCommit);
    const launched = Boolean(platform.launchCommit);
    const funded = hasPositiveFundingHistory(platform);

    const definitions: MilestoneDefinition[] = [
        {
            id: 'FUND_COMPANY', trackId: 'DEFINE_LAUNCH', label: 'Fund the company', shortLabel: 'Fund company',
            description: 'Move founder capital into Studio Finance before reserving launch spending.',
            destination: 'FINANCE', complete: funded,
        },
        {
            id: 'OPENING_MARKETS', trackId: 'DEFINE_LAUNCH', label: 'Choose Opening Markets', shortLabel: 'Opening Markets',
            description: 'Plan the countries that will receive the service first.',
            destination: 'OPENING_MARKETS', complete: marketsChosen,
        },
        {
            id: 'MARKET_CLEARANCES', trackId: 'DEFINE_LAUNCH', label: 'Clear the markets', shortLabel: 'Market clearance',
            description: 'Prepare every opening-country application and resolve any government request.',
            destination: 'MARKET_CLEARANCE', complete: marketDecision.reviewComplete,
            inProgress: marketDecision.readyToCommission && !marketsCleared,
            blocker: marketsChosen ? null : 'Choose at least one Opening Market before beginning clearance.',
        },
        {
            id: 'SERVICE_IDENT', trackId: 'DEFINE_LAUNCH', label: 'Create the service ident', shortLabel: 'Service ident',
            description: 'Choose the motion and sound package viewers meet before every title.',
            destination: 'SERVICE_IDENTITY', complete: hasIdent,
            inProgress: platform.serviceConfiguration.source !== 'UNCONFIGURED' && !hasIdent,
        },
        {
            id: 'STOREFRONT_PRICING', trackId: 'DEFINE_LAUNCH', label: 'Design the storefront', shortLabel: 'Storefront',
            description: 'Choose the discovery and catalogue presentation viewers meet first.',
            destination: 'STOREFRONT', complete: hasStorefront,
            inProgress: Boolean(platform.serviceConfiguration.storefrontLayoutId),
        },
        {
            id: 'OPENING_CATALOGUE', trackId: 'DEFINE_LAUNCH', label: 'Assemble the opening catalogue', shortLabel: 'Catalogue',
            description: 'Stage enough owned and licensed titles to make opening night credible.',
            destination: 'CATALOGUE', complete: hasCatalogue,
        },
        {
            id: 'PRICING', trackId: 'DEFINE_LAUNCH', label: 'Price the service', shortLabel: 'Pricing',
            description: 'Choose revenue models, plans, prices and the opening commercial offer.',
            destination: 'PRICING', complete: hasPricing,
            inProgress: Boolean(platform.serviceConfiguration.pricingApproach || platform.serviceConfiguration.pricing.plans.length),
        },
        {
            id: 'LAUNCH_BLUEPRINT', trackId: 'DEFINE_LAUNCH', label: 'Launch blueprint', shortLabel: 'Launch blueprint',
            description: 'Keep markets, service, pricing, catalogue and campaign assumptions current for Build.',
            destination: 'LAUNCH_BLUEPRINT', complete: blueprintSaved,
            blocker: hasCatalogue && hasIdent && hasStorefront && hasPricing
                ? null
                : 'Finish the required launch definition before its blueprint can become current.',
        },
        {
            id: 'NETWORK_BLUEPRINT', trackId: 'BUILD_PLATFORM', label: 'Draw the network blueprint', shortLabel: 'Network blueprint',
            description: 'Turn opening-market demand into sites, delivery roles and capacity requirements.',
            destination: 'NETWORK_BLUEPRINT', complete: hasBlueprint,
            blocker: marketsChosen ? null : 'Opening Markets are required before network demand can be calculated.',
        },
        {
            id: 'FACILITIES', trackId: 'BUILD_PLATFORM', label: 'Secure facilities', shortLabel: 'Facilities',
            description: 'Choose the spaces and contracts that will hold the opening network.',
            destination: 'FACILITIES', complete: hasFacilities,
            blocker: hasBlueprint ? null : 'Create the network blueprint before selecting facilities.',
        },
        {
            id: 'RACK_GROUPS', trackId: 'BUILD_PLATFORM', label: 'Assign rack groups', shortLabel: 'Rack groups',
            description: 'Give every rack a delivery, encoding or platform-services job.',
            destination: 'RACK_GROUPS', complete: hasRackGroups,
            blocker: hasFacilities ? null : 'Secure at least one facility before assigning rack groups.',
        },
        {
            id: 'PHYSICAL_CAPACITY', trackId: 'BUILD_PLATFORM', label: 'Clear physical capacity', shortLabel: 'Physical capacity',
            description: 'Verify power, cooling, bandwidth, redundancy and usable stream capacity.',
            destination: 'PHYSICAL_CAPACITY', complete: hasPhysicalCapacity,
            blocker: hasRackGroups ? null : 'Rack groups are required before physical capacity can be tested.',
        },
        {
            id: 'REHEARSAL', trackId: 'BUILD_PLATFORM', label: 'Rehearse the service', shortLabel: 'Rehearsal',
            description: 'Run opening-night demand through the exact catalogue, markets and proposed network.',
            destination: 'REHEARSAL', complete: currentBuildRehearsal,
            blocker: hasPhysicalCapacity && marketDecision.readyToCommission && hasCatalogue && hasIdent && hasStorefront && blueprintSaved
                ? null
                : 'Finish the launch definition and physical network before running its load rehearsal.',
        },
        {
            id: 'COMMISSIONING', trackId: 'BUILD_PLATFORM', label: 'Commission the network', shortLabel: 'Commissioning',
            description: 'Lock the tested, funded infrastructure plan and start construction.',
            destination: 'COMMISSIONING', complete: isCommissioned,
            inProgress: Boolean(draft && currentBuildRehearsal),
            blocker: currentBuildRehearsal ? null : 'Run a successful load rehearsal for this exact network before commissioning.',
        },
        {
            id: 'OPENING_NIGHT', trackId: 'FINALE', label: 'Opening Night', shortLabel: 'Opening Night',
            description: 'Commit the signal and let the first viewers into the service.',
            destination: 'OPENING_NIGHT', complete: launched,
            blocker: isCommissioned && rehearsed
                ? null
                : 'Commission the successfully rehearsed network before Opening Night.',
        },
    ];

    const blockers: StreamingLaunchBlockerView[] = definitions.flatMap(definition => definition.blocker && !definition.complete
        ? [{ id: `launch-blocker:${definition.id}`, milestoneId: definition.id, message: definition.blocker }]
        : []);
    const warnings: StreamingLaunchWarningView[] = [];
    if (!funded) warnings.push({
        id: 'launch-warning:unfunded', milestoneId: 'FUND_COMPANY', tone: 'NOTICE',
        message: 'Planning is open, but spending commitments remain locked until the company is funded.',
    });
    if (budget.shortfall > 0) warnings.push({
        id: 'launch-warning:shortfall', milestoneId: 'FUND_COMPANY', tone: 'CRITICAL',
        message: `The current launch plan is short by ${budget.shortfall.toLocaleString()} in company cash.`,
    });
    if (budget.committedSpend > 0 && budget.availableToCommit === 0) warnings.push({
        id: 'launch-warning:reserved', milestoneId: null, tone: 'WARNING',
        message: 'All available treasury is already reserved by committed launch work.',
    });
    if (platform.localizationOperations.jobs.some(job => job.status !== 'READY') || !catalogueCoverage.qualityReady) warnings.push({
        id: 'launch-warning:localization', milestoneId: 'OPENING_CATALOGUE', tone: 'WARNING',
        message: 'Optional language coverage is incomplete. This does not block launch, but reach may be lower in affected markets.',
    });

    const blockerByMilestone = new Map(blockers.map(blocker => [blocker.milestoneId, blocker]));
    const warningCounts = new Map<StreamingLaunchMilestoneId, number>();
    warnings.forEach(warning => {
        if (warning.milestoneId) warningCounts.set(warning.milestoneId, (warningCounts.get(warning.milestoneId) || 0) + 1);
    });
    const recommendedDefinition = definitions.find(definition => (
        !definition.complete && !definition.blocker
    )) || definitions.find(definition => !definition.complete) || null;

    const milestones = definitions.map((definition): StreamingLaunchMilestoneView => {
        const blocked = Boolean(definition.blocker) && !definition.complete;
        const isRecommended = definition.id === recommendedDefinition?.id;
        const status: StreamingLaunchMilestoneStatus = definition.complete
            ? 'COMPLETE'
            : isRecommended
                ? 'ACTION_REQUIRED'
                : blocked
                    ? 'BLOCKED'
                    : definition.inProgress
                        ? 'IN_PROGRESS'
                        : 'AVAILABLE';
        const canCommit = definition.id === 'FUND_COMPANY'
            ? player.money > 0
            : !definition.complete && !blocked && budget.availableToCommit > 0;
        return {
            id: definition.id,
            trackId: definition.trackId,
            label: definition.label,
            shortLabel: definition.shortLabel,
            description: definition.description,
            destination: definition.destination,
            status,
            complete: definition.complete,
            canPlan: !definition.complete,
            canCommit,
            blockerCount: blockerByMilestone.has(definition.id) ? 1 : 0,
            warningCount: warningCounts.get(definition.id) || 0,
        };
    });

    const track = (id: StreamingLaunchTrackId, label: string, question: string): StreamingLaunchTrackView => {
        const trackMilestones = milestones.filter(milestone => milestone.trackId === id);
        const completedCount = trackMilestones.filter(milestone => milestone.complete).length;
        return {
            id,
            label,
            question,
            completedCount,
            totalCount: trackMilestones.length,
            progressPercent: Math.round(completedCount / Math.max(1, trackMilestones.length) * 100),
            milestones: trackMilestones,
        };
    };
    const tracks = [
        track('DEFINE_LAUNCH', 'Define the Launch', 'What are we launching, where, and for whom?'),
        track('BUILD_PLATFORM', 'Build the Platform', 'Can we reliably deliver what we promised?'),
    ];
    const finale = milestones.find(milestone => milestone.id === 'OPENING_NIGHT')!;
    const completedCount = milestones.filter(milestone => milestone.complete).length;
    const ready = tracks.every(item => item.completedCount === item.totalCount);
    const status = launched ? 'LAUNCHED' : ready ? 'READY' : platform.identity ? 'PLANNING' : 'NOT_STARTED';

    return {
        status,
        tracks,
        finale,
        milestones,
        completedCount,
        totalCount: milestones.length,
        progressPercent: Math.round(completedCount / Math.max(1, milestones.length) * 100),
        blockers,
        warnings,
        budget,
        recommendedNextAction: recommendedDefinition ? {
            milestoneId: recommendedDefinition.id,
            label: recommendedDefinition.label,
            description: recommendedDefinition.description,
            destination: recommendedDefinition.destination,
            reason: recommendedDefinition.id === 'FUND_COMPANY'
                ? 'The company exists, but its operating treasury has not been funded.'
                : recommendedDefinition.blocker
                    ? recommendedDefinition.blocker
                    : 'This is the clearest next step on the critical path to Opening Night.',
        } : null,
    };
};

export const getStreamingLaunchProgramView = (player: Player, preparedContext?: StreamingCatalogueReadContext): StreamingLaunchProgramView => {
    const context = getStreamingCatalogueReadContext(player, preparedContext);
    return readStreamingCatalogueDerivedView(context, getStreamingLaunchProgramView, () => buildStreamingLaunchProgramView(player, context));
};

export interface PlanStreamingLaunchCostInput {
    idempotencyKey: string;
    category: StreamingCostCommitmentCategory;
    label: string;
    amount: number;
    weeklyAmount?: number;
    sourceReferenceId?: string | null;
}

export interface StreamingLaunchCostMutationResult {
    player: Player;
    changed: boolean;
    reason: 'PLANNED' | 'COMMITTED' | 'INVALID_STATE' | 'INVALID_AMOUNT' | 'ALREADY_EXISTS' | 'NOT_FOUND' | 'INSUFFICIENT_TREASURY';
    commitment: OwnedStreamingCostCommitment | null;
    shortfall: number;
}

const cleanKey = (value: string): string => value.replace(/[^a-z0-9:_-]/gi, '-').slice(0, 180);

/** Planning is always allowed after incorporation and never changes treasury. */
export const planStreamingLaunchCost = (
    player: Player,
    input: PlanStreamingLaunchCostInput,
): StreamingLaunchCostMutationResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (!platform.identity || !platform.foundingProfile || platform.launchCommit) {
        return { player, changed: false, reason: 'INVALID_STATE', commitment: null, shortfall: 0 };
    }
    const amount = roundMoney(input.amount);
    if (!amount) return { player, changed: false, reason: 'INVALID_AMOUNT', commitment: null, shortfall: 0 };
    const idempotencyKey = cleanKey(`launch-plan:${input.idempotencyKey}`);
    const existing = platform.costCommitments.find(item => item.idempotencyKey === idempotencyKey);
    if (existing) return { player, changed: false, reason: 'ALREADY_EXISTS', commitment: existing, shortfall: 0 };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const commitment: OwnedStreamingCostCommitment = {
        id: createDeterministicId('streaming_launch_cost', platform.simulationSeed, idempotencyKey),
        idempotencyKey,
        category: input.category,
        label: String(input.label || 'Launch plan').trim().slice(0, 120),
        status: 'PLANNED',
        plannedAmount: amount,
        committedAmount: 0,
        paidAmount: 0,
        weeklyAmount: roundMoney(input.weeklyAmount || 0),
        createdAtAbsoluteWeek: absoluteWeek,
        committedAtAbsoluteWeek: null,
        paidAtAbsoluteWeek: null,
        sourceReferenceId: input.sourceReferenceId || null,
    };
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        launchProgram: {
            ...platform.launchProgram,
            status: 'PLANNING',
            startedAtAbsoluteWeek: platform.launchProgram.startedAtAbsoluteWeek ?? absoluteWeek,
            configurationRevision: platform.launchProgram.configurationRevision + 1,
        },
        costCommitments: [...platform.costCommitments, commitment],
    }, player.id);
    const nextPlayer = { ...player, ownedStreamingPlatform: nextPlatform };
    return {
        player: nextPlayer,
        changed: true,
        reason: 'PLANNED',
        commitment,
        shortfall: getStreamingLaunchBudgetView(nextPlayer).shortfall,
    };
};

/** Committing reserves treasury capacity; settlement remains owned by the destination system. */
export const commitStreamingLaunchCost = (
    player: Player,
    commitmentIdOrKey: string,
): StreamingLaunchCostMutationResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (!platform.identity || !platform.foundingProfile || platform.launchCommit) {
        return { player, changed: false, reason: 'INVALID_STATE', commitment: null, shortfall: 0 };
    }
    const target = platform.costCommitments.find(item => (
        item.id === commitmentIdOrKey || item.idempotencyKey === commitmentIdOrKey
    ));
    if (!target) return { player, changed: false, reason: 'NOT_FOUND', commitment: null, shortfall: 0 };
    if (target.status !== 'PLANNED') {
        return { player, changed: false, reason: 'ALREADY_EXISTS', commitment: target, shortfall: 0 };
    }
    const budget = getStreamingLaunchBudgetView(player);
    const shortfall = Math.max(0, target.plannedAmount - budget.availableToCommit);
    if (shortfall > 0) {
        return { player, changed: false, reason: 'INSUFFICIENT_TREASURY', commitment: target, shortfall };
    }
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const committed: OwnedStreamingCostCommitment = {
        ...target,
        status: 'COMMITTED',
        committedAmount: target.plannedAmount,
        committedAtAbsoluteWeek: absoluteWeek,
    };
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        launchProgram: {
            ...platform.launchProgram,
            status: 'PLANNING',
            configurationRevision: platform.launchProgram.configurationRevision + 1,
        },
        costCommitments: platform.costCommitments.map(item => item.id === target.id ? committed : item),
    }, player.id);
    return {
        player: { ...player, ownedStreamingPlatform: nextPlatform },
        changed: true,
        reason: 'COMMITTED',
        commitment: committed,
        shortfall: 0,
    };
};
