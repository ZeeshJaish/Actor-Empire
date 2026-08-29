import type {
    OwnedStreamingCustomIdentAudio,
    OwnedStreamingCostCommitment,
    OwnedStreamingPricingConfiguration,
    Player,
    StreamingCostCommitmentCategory,
    StreamingDefineLaunchStepId,
    StreamingIdentPackageId,
    StreamingSoundIdentKey,
} from '../types';
import { createDeterministicId } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import {
    compactOwnedStreamingPlatformForPersistence,
    normalizeOwnedStreamingPlatformState,
} from './ownedStreamingPlatform';
import { getStreamingOpeningCatalogueView } from './streamingOpeningCatalogue';
import {
    getStreamingStorefrontDefinition,
    getStreamingStorefrontLockReason,
} from './streamingStorefront';

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

const roundMoney = (value: number): number => Math.max(0, Math.round(Number(value) || 0));

export const STREAMING_FULL_IDENT_COST = 4_500_000;

const STREAMING_IDENT_PACKAGE_COSTS: Record<StreamingIdentPackageId, number> = {
    STANDARD: 0,
    FULL: STREAMING_FULL_IDENT_COST,
    CINEMATIC: 6_500_000,
    GENRE: 7_500_000,
    ADAPTIVE: 9_000_000,
    LIVING: 14_000_000,
};
const STREAMING_IDENT_PACKAGE_IDS: StreamingIdentPackageId[] = ['STANDARD', 'FULL', 'CINEMATIC', 'GENRE', 'ADAPTIVE', 'LIVING'];
const STREAMING_IDENT_PACKAGE_DURATIONS: Record<StreamingIdentPackageId, number> = {
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
export const getStreamingIdentPurchaseView = (player: Player): StreamingIdentPurchaseView => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
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

export const getStreamingLaunchDefinitionSignature = (player: Player): string => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
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
    reason: 'SAVED' | 'INVALID_STATE' | 'INSUFFICIENT_TREASURY' | 'INCOMPLETE';
    shortfall: number;
}

export const setStreamingDefineLaunchStep = (
    player: Player,
    step: StreamingDefineLaunchStepId,
): Player => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (!platform.identity) return player;
    return {
        ...player,
        ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
            ...platform,
            launchProgram: { ...platform.launchProgram, defineCurrentStep: step },
        }, player.id),
    };
};

export const saveStreamingServiceIdent = (
    player: Player,
    input: {
        soundIdentKey: StreamingSoundIdentKey;
        identPackageId: StreamingIdentPackageId;
        customIdentAudio?: OwnedStreamingCustomIdentAudio | null;
    },
): StreamingLaunchConfigurationResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (!platform.identity || platform.launchCommit) return { player, changed: false, reason: 'INVALID_STATE', shortfall: 0 };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const productLevel = platform.technologyLevels.PRODUCT_EXPERIENCE;
    const dataLevel = platform.technologyLevels.DATA_RECOMMENDATIONS;
    if (input.identPackageId === 'GENRE' && productLevel < 20) return { player, changed: false, reason: 'INVALID_STATE', shortfall: 0 };
    if (input.identPackageId === 'ADAPTIVE' && productLevel < 35) return { player, changed: false, reason: 'INVALID_STATE', shortfall: 0 };
    if (input.identPackageId === 'LIVING' && (productLevel < 60 || dataLevel < 40)) return { player, changed: false, reason: 'INVALID_STATE', shortfall: 0 };
    const targetCost = STREAMING_IDENT_PACKAGE_COSTS[input.identPackageId];
    const purchases = getStreamingIdentPurchaseView(player);
    const packagePurchased = purchases.purchasedPackageIds.includes(input.identPackageId);
    const sameCustomAudio = (input.customIdentAudio?.fingerprint || null)
        === (platform.serviceConfiguration.customIdentAudio?.fingerprint || null);
    const sameConfiguration = platform.serviceConfiguration.soundIdentKey === input.soundIdentKey
        && platform.serviceConfiguration.identPackageId === input.identPackageId
        && sameCustomAudio;
    const hasCommissionEvidence = platform.serviceConfiguration.committedAtAbsoluteWeek !== null
        && (input.identPackageId === 'STANDARD' || packagePurchased);
    if (sameConfiguration && hasCommissionEvidence) {
        return { player, changed: false, reason: 'SAVED', shortfall: 0 };
    }
    /* A package bought in this opening campaign can be selected again freely.
       Another package is a separate production job: full price, no refund and
       no trade-in credit from previous work. */
    const delta = packagePurchased ? 0 : targetCost;
    if (platform.treasuryCash < delta) {
        return { player, changed: false, reason: 'INSUFFICIENT_TREASURY', shortfall: delta - platform.treasuryCash };
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
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        treasuryCash: platform.treasuryCash - delta,
        serviceConfiguration: {
            ...platform.serviceConfiguration,
            source: 'PLAYER_ACTION',
            soundIdentKey: input.soundIdentKey,
            identPackageId: input.identPackageId,
            identDurationSeconds: input.customIdentAudio?.durationSeconds
                || STREAMING_IDENT_PACKAGE_DURATIONS[input.identPackageId],
            customIdentAudio: input.customIdentAudio || null,
            committedCost: purchases.totalPaid + delta,
            committedAtAbsoluteWeek: absoluteWeek,
            revision: platform.serviceConfiguration.revision + 1,
        },
        launchProgram: {
            ...platform.launchProgram,
            status: 'PLANNING',
            defineCurrentStep: 'IDENTITY',
            serviceConfigurationCommittedAtAbsoluteWeek: absoluteWeek,
            configurationRevision: platform.launchProgram.configurationRevision + 1,
        },
        costCommitments: commitment ? [...platform.costCommitments, commitment] : platform.costCommitments,
        eventLedger: ledger ? [...platform.eventLedger, ledger] : platform.eventLedger,
    }, player.id);
    return { player: { ...player, ownedStreamingPlatform: nextPlatform }, changed: true, reason: 'SAVED', shortfall: 0 };
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

export const saveStreamingStorefrontPlan = (
    player: Player,
    input: { storefrontLayoutId: string; pricingApproach?: string },
): StreamingLaunchConfigurationResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (!platform.identity || platform.launchCommit) return { player, changed: false, reason: 'INVALID_STATE', shortfall: 0 };
    if (!input.storefrontLayoutId) return { player, changed: false, reason: 'INCOMPLETE', shortfall: 0 };
    const storefront = getStreamingStorefrontDefinition(input.storefrontLayoutId);
    if (!storefront) return { player, changed: false, reason: 'INVALID_STATE', shortfall: 0 };
    const storefrontId = storefront.id;
    if (getStreamingStorefrontLockReason(platform, storefrontId)) {
        return { player, changed: false, reason: 'INVALID_STATE', shortfall: 0 };
    }
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        serviceConfiguration: {
            ...platform.serviceConfiguration,
            source: 'PLAYER_ACTION',
            storefrontLayoutId: storefrontId,
            pricingApproach: input.pricingApproach || platform.serviceConfiguration.pricingApproach,
            revision: platform.serviceConfiguration.revision + 1,
        },
        launchProgram: {
            ...platform.launchProgram,
            status: 'PLANNING',
            startedAtAbsoluteWeek: platform.launchProgram.startedAtAbsoluteWeek ?? absoluteWeek,
            defineCurrentStep: 'STOREFRONT',
            configurationRevision: platform.launchProgram.configurationRevision + 1,
        },
    }, player.id);
    return { player: { ...player, ownedStreamingPlatform: nextPlatform }, changed: true, reason: 'SAVED', shortfall: 0 };
};

export const saveStreamingPricingPlan = (
    player: Player,
    pricing: OwnedStreamingPricingConfiguration,
): StreamingLaunchConfigurationResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    if (!platform.identity || platform.launchCommit) return { player, changed: false, reason: 'INVALID_STATE', shortfall: 0 };
    if (!pricing.streams.length || pricing.streams.includes('subs') && !pricing.plans.length) {
        return { player, changed: false, reason: 'INCOMPLETE', shortfall: 0 };
    }
    const activeProducts = new Set(platform.productLines.filter(line => line.status === 'ACTIVE').map(line => line.lineId));
    const commerce = platform.technologyLevels.ADVERTISING_COMMERCE;
    const product = platform.technologyLevels.PRODUCT_EXPERIENCE;
    const allowedStreams = pricing.streams.filter(stream => {
        if (stream === 'subs') return true;
        if (stream === 'ads' || stream === 'sponsor') return commerce >= 20 || activeProducts.has('FREE');
        if (stream === 'rentals' || stream === 'premium') return activeProducts.has('STORE');
        if (stream === 'daypass') return activeProducts.has('LIVE');
        if (stream === 'metered') return commerce >= 60 && product >= 50;
        return activeProducts.has('FAN') && commerce >= 40;
    });
    if (!allowedStreams.length) return { player, changed: false, reason: 'INCOMPLETE', shortfall: 0 };
    const featureAllowed = (feature: string): boolean => {
        if (feature === 'hd') return platform.technologyLevels.PLAYBACK_QUALITY >= 20;
        if (feature === 'uhd') return platform.technologyLevels.PLAYBACK_QUALITY >= 55;
        if (feature === 'spatial') return platform.technologyLevels.PLAYBACK_QUALITY >= 45;
        if (feature === 'streams2') return platform.technologyLevels.RELIABILITY >= 10;
        if (feature === 'streams4') return platform.technologyLevels.RELIABILITY >= 35;
        if (feature === 'downloads') return platform.technologyLevels.PRODUCT_EXPERIENCE >= 25;
        if (feature === 'early') return platform.technologyLevels.CONTENT_OPERATIONS >= 20;
        if (feature === 'live') return activeProducts.has('LIVE');
        if (feature === 'extraseat') return commerce >= 30;
        return feature === 'noads' || feature === 'catalogue';
    };
    const safePricing: OwnedStreamingPricingConfiguration = {
        ...pricing,
        streams: allowedStreams,
        plans: pricing.plans.slice(0, 6).map(plan => ({
            ...plan,
            featureIds: plan.featureIds.filter(featureAllowed),
            ads: allowedStreams.includes('ads') && plan.ads,
        })),
    };
    const priceFor = (id: string, index: number, fallback: number) => {
        const plan = safePricing.plans.find(item => item.id === id) || safePricing.plans[index];
        return plan ? Math.max(0, Math.min(100, Number(plan.monthly) || 0)) : fallback;
    };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        subscriptionPrices: {
            BASIC: priceFor('BASIC', 0, platform.subscriptionPrices.BASIC),
            PREMIUM: priceFor('PREMIUM', 1, platform.subscriptionPrices.PREMIUM),
            FAMILY: priceFor('FAMILY', 2, platform.subscriptionPrices.FAMILY),
        },
        serviceConfiguration: {
            ...platform.serviceConfiguration,
            source: 'PLAYER_ACTION',
            pricingApproach: 'CUSTOM',
            pricing: safePricing,
            revision: platform.serviceConfiguration.revision + 1,
        },
        launchProgram: {
            ...platform.launchProgram,
            status: 'PLANNING',
            startedAtAbsoluteWeek: platform.launchProgram.startedAtAbsoluteWeek ?? absoluteWeek,
            defineCurrentStep: 'PRICING',
            configurationRevision: platform.launchProgram.configurationRevision + 1,
        },
    }, player.id);
    return { player: { ...player, ownedStreamingPlatform: nextPlatform }, changed: true, reason: 'SAVED', shortfall: 0 };
};

export const saveStreamingLaunchBlueprint = (player: Player): StreamingLaunchConfigurationResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const view = getStreamingLaunchProgramView(player);
    const required = ['OPENING_MARKETS', 'SERVICE_IDENT', 'STOREFRONT_PRICING', 'OPENING_CATALOGUE', 'PRICING'];
    const complete = required.every(id => view.milestones.find(item => item.id === id)?.complete);
    if (!platform.identity || !complete) return { player, changed: false, reason: 'INCOMPLETE', shortfall: 0 };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        launchProgram: {
            ...platform.launchProgram,
            status: 'PLANNING',
            defineCurrentStep: 'BLUEPRINT',
            lastBlueprintSignature: getStreamingLaunchDefinitionSignature(player),
            blueprintSavedAtAbsoluteWeek: absoluteWeek,
        },
    }, player.id);
    return { player: { ...player, ownedStreamingPlatform: nextPlatform }, changed: true, reason: 'SAVED', shortfall: 0 };
};

export const getStreamingLaunchBudgetView = (player: Player): StreamingLaunchBudgetView => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
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
        .filter(item => ['PAID', 'MIGRATED'].includes(item.status))
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

const hasPositiveFundingHistory = (player: Player): boolean => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    return platform.treasuryCash > 0
        || platform.finance.capitalActions.some(action => action.treasuryDelta > 0)
        || platform.costCommitments.some(item => ['COMMITTED', 'PAID', 'MIGRATED'].includes(item.status))
        || platform.marketOperations.some(operation => (
            operation.committedCosts.total > 0
            || ['CLEARANCE', 'INFRASTRUCTURE_PREPARATION', 'READY', 'ACTIVE'].includes(operation.status)
        ))
        || Boolean(platform.infrastructureSetup || platform.starterCatalog || platform.launchCommit);
};

export const getStreamingLaunchProgramView = (player: Player): StreamingLaunchProgramView => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const budget = getStreamingLaunchBudgetView(player);
    const openingMarkets = platform.marketOperations.filter(operation => (
        operation.scope === 'COUNTRY' && operation.entryKind === 'OPENING' && operation.status !== 'EXITED'
    ));
    const marketsChosen = openingMarkets.length > 0;
    const marketsCleared = marketsChosen && openingMarkets.every(operation => ['READY', 'ACTIVE'].includes(operation.status));
    const identPurchases = getStreamingIdentPurchaseView(player);
    const activeIdentPackage = platform.serviceConfiguration.identPackageId;
    const hasIdent = Boolean(
        platform.serviceConfiguration.soundIdentKey
        && activeIdentPackage
        && platform.serviceConfiguration.committedAtAbsoluteWeek !== null
        && identPurchases.purchasedPackageIds.includes(activeIdentPackage),
    );
    const hasStorefront = Boolean(platform.serviceConfiguration.storefrontLayoutId);
    const hasPricing = Boolean(
        platform.serviceConfiguration.pricingApproach
        && platform.serviceConfiguration.pricing.streams.length
        && (!platform.serviceConfiguration.pricing.streams.includes('subs') || platform.serviceConfiguration.pricing.plans.length),
    );
    const hasCatalogue = Boolean(platform.starterCatalog);
    const catalogueCoverage = getStreamingOpeningCatalogueView(player);
    const launchDefinitionSignature = getStreamingLaunchDefinitionSignature(player);
    const blueprintSaved = Boolean(
        platform.launchProgram.lastBlueprintSignature
        && platform.launchProgram.lastBlueprintSignature === launchDefinitionSignature,
    );

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
    const rehearsed = Boolean(platform.launchProgram.lastRehearsalSignature || platform.launchCommit);
    const launched = Boolean(platform.launchCommit);
    const funded = hasPositiveFundingHistory(player);

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
            description: 'Resolve market access, regulation and launch approval in each opening country.',
            destination: 'MARKET_CLEARANCE', complete: marketsCleared,
            inProgress: marketsChosen && !marketsCleared,
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
            id: 'LAUNCH_BLUEPRINT', trackId: 'DEFINE_LAUNCH', label: 'Save the launch blueprint', shortLabel: 'Launch blueprint',
            description: 'Checkpoint markets, service, pricing, catalogue and campaign assumptions for Build.',
            destination: 'LAUNCH_BLUEPRINT', complete: blueprintSaved,
            blocker: hasCatalogue && hasIdent && hasStorefront && hasPricing
                ? null
                : 'Finish the required launch definition before saving its blueprint.',
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
            id: 'COMMISSIONING', trackId: 'BUILD_PLATFORM', label: 'Commission the network', shortLabel: 'Commissioning',
            description: 'Lock the funded infrastructure plan and bring the opening network online.',
            destination: 'COMMISSIONING', complete: isCommissioned,
            inProgress: Boolean(draft && hasPhysicalCapacity),
            blocker: hasPhysicalCapacity ? null : 'Clear physical capacity before commissioning the network.',
        },
        {
            id: 'REHEARSAL', trackId: 'BUILD_PLATFORM', label: 'Rehearse the service', shortLabel: 'Rehearsal',
            description: 'Run opening-night demand through the exact catalogue, markets and commissioned network.',
            destination: 'REHEARSAL', complete: rehearsed,
            blocker: isCommissioned && marketsCleared && hasCatalogue && hasIdent && hasStorefront && blueprintSaved
                ? null
                : 'The saved launch blueprint and commissioned infrastructure must both be current before rehearsal.',
        },
        {
            id: 'OPENING_NIGHT', trackId: 'FINALE', label: 'Opening Night', shortLabel: 'Opening Night',
            description: 'Commit the signal and let the first viewers into the service.',
            destination: 'OPENING_NIGHT', complete: launched,
            blocker: rehearsed ? null : 'Complete the launch rehearsal before Opening Night.',
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
    if (platform.launchProgram.lastBlueprintSignature && !blueprintSaved) warnings.push({
        id: 'launch-warning:blueprint-stale', milestoneId: 'LAUNCH_BLUEPRINT', tone: 'WARNING',
        message: 'The launch definition changed after its last checkpoint. Save a new blueprint and rehearse again.',
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
