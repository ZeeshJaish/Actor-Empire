import type {
    OwnedStreamingMarketOperation,
    Player,
    StreamingTechnologyBranch,
} from '../types';
import { normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import {
    getStreamingDayOneCountryPresentation,
    getStreamingDayOneMarket,
    getStreamingMarketEntryProfile,
    type StreamingDayOneMarket,
    type StreamingDayOneCountryPresentation,
    type StreamingMarketEntryProfile,
} from './streamingDayOneMarkets';
export {
    getStreamingLaunchBudgetView,
    getStreamingLaunchProgramView,
} from './streamingLaunchProgram';
export type {
    StreamingLaunchBlockerView,
    StreamingLaunchBudgetView,
    StreamingLaunchDestination,
    StreamingLaunchMilestoneId,
    StreamingLaunchMilestoneStatus,
    StreamingLaunchMilestoneView,
    StreamingLaunchProgramView,
    StreamingLaunchTrackId,
    StreamingLaunchTrackView,
    StreamingLaunchWarningView,
    StreamingRecommendedLaunchAction,
} from './streamingLaunchProgram';

export type StreamingSemanticTone = 'NEUTRAL' | 'BRAND' | 'POSITIVE' | 'WARNING' | 'CRITICAL' | 'LOCKED';

export interface StreamingMarketCardView {
    operation: OwnedStreamingMarketOperation;
    market: StreamingDayOneMarket | null;
    presentation: StreamingDayOneCountryPresentation;
    entryProfile: StreamingMarketEntryProfile | null;
    tone: StreamingSemanticTone;
    canInspect: true;
    canCommit: boolean;
}

export interface StreamingMarketPortfolioView {
    opening: StreamingMarketCardView[];
    expansion: StreamingMarketCardView[];
    legacyRegions: StreamingMarketCardView[];
    activeCountryIds: string[];
    plannedCountryIds: string[];
}

const marketTone = (operation: OwnedStreamingMarketOperation): StreamingSemanticTone => {
    if (operation.status === 'ACTIVE' || operation.status === 'READY') return 'POSITIVE';
    if (operation.status === 'AWAITING_FUNDING' || operation.status === 'SUSPENDED') return 'WARNING';
    if (operation.status === 'EXITED') return 'LOCKED';
    if (operation.status === 'CLEARANCE' || operation.status === 'INFRASTRUCTURE_PREPARATION') return 'BRAND';
    return 'NEUTRAL';
};

const toMarketCard = (operation: OwnedStreamingMarketOperation): StreamingMarketCardView => {
    const market = operation.countryId ? getStreamingDayOneMarket(operation.countryId) : null;
    return {
        operation,
        market,
        presentation: operation.countryId
            ? getStreamingDayOneCountryPresentation(operation.countryId)
            : { localName: '' },
        entryProfile: operation.countryId ? getStreamingMarketEntryProfile(operation.countryId) : null,
        tone: marketTone(operation),
        canInspect: true,
        canCommit: ['EVALUATING', 'PLANNED', 'AWAITING_FUNDING'].includes(operation.status),
    };
};

export const getStreamingMarketPortfolioView = (player: Player): StreamingMarketPortfolioView => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const cards = platform.marketOperations.map(toMarketCard);
    const opening = cards.filter(card => card.operation.scope === 'COUNTRY' && card.operation.entryKind === 'OPENING');
    const expansion = cards.filter(card => card.operation.scope === 'COUNTRY' && card.operation.entryKind === 'EXPANSION');
    return {
        opening,
        expansion,
        legacyRegions: cards.filter(card => card.operation.scope === 'LEGACY_REGION'),
        activeCountryIds: cards
            .filter(card => card.operation.countryId && card.operation.status === 'ACTIVE')
            .map(card => card.operation.countryId as string),
        plannedCountryIds: cards
            .filter(card => card.operation.countryId && card.operation.status !== 'ACTIVE' && card.operation.status !== 'EXITED')
            .map(card => card.operation.countryId as string),
    };
};

export interface StreamingServiceConfigurationView {
    configured: boolean;
    source: 'UNCONFIGURED' | 'PLAYER_ACTION' | 'LEGACY_FOUNDING';
    soundIdentKey: string | null;
    identPackageId: string | null;
    storefrontConfigured: boolean;
    pricingConfigured: boolean;
    committedCost: number;
    tone: StreamingSemanticTone;
}

export const getStreamingServiceConfigurationView = (player: Player): StreamingServiceConfigurationView => {
    const configuration = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id).serviceConfiguration;
    const configured = configuration.source !== 'UNCONFIGURED';
    return {
        configured,
        source: configuration.source,
        soundIdentKey: configuration.soundIdentKey,
        identPackageId: configuration.identPackageId,
        storefrontConfigured: Boolean(configuration.storefrontLayoutId),
        pricingConfigured: Boolean(configuration.pricingApproach),
        committedCost: configuration.committedCost,
        tone: configured ? 'POSITIVE' : 'LOCKED',
    };
};

export interface StreamingTechnologyBranchView {
    branch: StreamingTechnologyBranch;
    currentLevel: number;
    inheritedLevelFloor: number;
    installedCapabilityCount: number;
    activeProjectCount: number;
    tone: StreamingSemanticTone;
}

export const getStreamingTechnologyStatusView = (player: Player): StreamingTechnologyBranchView[] => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    return (Object.keys(platform.technologyLevels) as StreamingTechnologyBranch[]).map(branch => {
        const currentLevel = platform.technologyLevels[branch];
        const activeProjectCount = platform.technologyProjects.filter(project => (
            project.branch === branch && project.status === 'UNDER_CONSTRUCTION'
        )).length;
        return {
            branch,
            currentLevel,
            inheritedLevelFloor: platform.capabilities.legacyLevelFloors[branch],
            installedCapabilityCount: platform.capabilities.installed.filter(item => item.branch === branch).length,
            activeProjectCount,
            tone: activeProjectCount > 0 ? 'BRAND' : currentLevel > 0 ? 'POSITIVE' : 'LOCKED',
        };
    });
};

export interface StreamingLocalizationPortfolioView {
    providerCount: number;
    activeFacilityCount: number;
    plannedJobCount: number;
    readyAssetCount: number;
    legacyGrantCount: number;
    tone: StreamingSemanticTone;
}

export const getStreamingLocalizationPortfolioView = (player: Player): StreamingLocalizationPortfolioView => {
    const operations = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id).localizationOperations;
    const plannedJobCount = operations.jobs.filter(job => job.status !== 'READY').length;
    const readyAssetCount = operations.titleLanguageAssets.filter(asset => asset.subtitleReady || asset.dubReady).length;
    return {
        providerCount: operations.providers.filter(provider => provider.status === 'CONTRACTED').length,
        activeFacilityCount: operations.facilities.filter(facility => facility.status === 'ACTIVE').length,
        plannedJobCount,
        readyAssetCount,
        legacyGrantCount: operations.legacyPackageGrants.length,
        tone: readyAssetCount > 0 || operations.legacyPackageGrants.length > 0 ? 'POSITIVE' : plannedJobCount > 0 ? 'BRAND' : 'LOCKED',
    };
};
