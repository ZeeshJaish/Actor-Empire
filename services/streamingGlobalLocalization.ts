import type { OwnedStreamingLedgerEntry, Player } from '../types';
import { createDeterministicId } from './deterministicRandom';
import { getAbsoluteWeek } from './legacyLogic';
import {
    STREAMING_LANGUAGE_PACKAGES,
    getStreamingLanguagePackageCapabilityId,
    resolveStreamingGlobalLocalizationCapability,
} from './streamingLocalizationCapabilities';
import {
    compactOwnedStreamingPlatformForPersistence,
    normalizeOwnedStreamingPlatformState,
} from './ownedStreamingPlatform';

export type StreamingLanguagePackageActivationResult = {
    player: Player;
    changed: boolean;
    detail: string;
    reason?: 'UNKNOWN_PACKAGE' | 'FOUNDATION_REQUIRED' | 'ALREADY_ACTIVE' | 'INSUFFICIENT_TREASURY';
};

export interface StreamingGlobalLocalizationView {
    subtitleLevel: number;
    dubbingLevel: number;
    simultaneousLocalization: boolean;
    coveredTitleCount: number;
    activeLanguageCount: number;
    packages: Array<{
        id: string;
        name: string;
        languages: string[];
        active: boolean;
        locked: boolean;
        activationCost: number;
        weeklyOperatingCost: number;
    }>;
}

const languageLabel = (languageId: string): string => languageId
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const getStreamingGlobalLocalizationView = (player: Player): StreamingGlobalLocalizationView => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const installedIds = new Set(platform.capabilities.installed
        .filter(item => item.status === 'OPERATING' || item.status === 'LEGACY_GRANT')
        .map(item => item.capabilityId));
    const capability = resolveStreamingGlobalLocalizationCapability(platform);
    const projectIds = new Set([
        ...platform.catalogProjectIds,
        ...platform.originalCommissions.flatMap(item => item.canonicalProjectId ? [item.canonicalProjectId] : []),
    ]);

    return {
        subtitleLevel: capability.subtitleLevel,
        dubbingLevel: capability.dubbingLevel,
        simultaneousLocalization: capability.simultaneousLocalization,
        coveredTitleCount: projectIds.size,
        activeLanguageCount: capability.activeLanguageIds.length,
        packages: STREAMING_LANGUAGE_PACKAGES.map(definition => ({
            id: definition.id,
            name: definition.name,
            languages: definition.languageIds.map(languageLabel),
            active: capability.activePackageIds.includes(definition.id),
            locked: !definition.prerequisiteCapabilityIds.every(id => installedIds.has(id)),
            activationCost: definition.activationCost,
            weeklyOperatingCost: definition.weeklyOperatingCost,
        })),
    };
};

export const activateStreamingLanguagePackage = (
    player: Player,
    packageId: string,
): StreamingLanguagePackageActivationResult => {
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const definition = STREAMING_LANGUAGE_PACKAGES.find(item => item.id === packageId);
    if (!definition) return { player, changed: false, reason: 'UNKNOWN_PACKAGE', detail: 'That language network is not available.' };
    const installedIds = new Set(platform.capabilities.installed
        .filter(item => item.status === 'OPERATING' || item.status === 'LEGACY_GRANT')
        .map(item => item.capabilityId));
    if (!definition.prerequisiteCapabilityIds.every(id => installedIds.has(id))) {
        return { player, changed: false, reason: 'FOUNDATION_REQUIRED', detail: 'Install Localization Foundation before opening a language network.' };
    }
    const capabilityId = getStreamingLanguagePackageCapabilityId(definition.id);
    if (installedIds.has(capabilityId)) {
        return { player, changed: false, reason: 'ALREADY_ACTIVE', detail: `${definition.name} is already active.` };
    }
    if (platform.treasuryCash < definition.activationCost) {
        return { player, changed: false, reason: 'INSUFFICIENT_TREASURY', detail: 'Platform treasury cannot fund this language network.' };
    }
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const key = `streaming-language-package:${definition.id.toLowerCase()}`;
    const ledger: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', platform.simulationSeed, key),
        idempotencyKey: key,
        absoluteWeek,
        type: 'TITLE_LOCALIZATION_COMMITTED',
        summary: `${definition.name} opened across the platform catalogue.`,
        source: 'PLAYER_ACTION',
        metadata: {
            packageId: definition.id,
            activationCost: definition.activationCost,
            weeklyOperatingCost: definition.weeklyOperatingCost,
        },
    };
    const commitment = {
        id: createDeterministicId('streaming_cost', platform.simulationSeed, key),
        idempotencyKey: key,
        category: 'LOCALIZATION' as const,
        label: definition.name,
        status: 'PAID' as const,
        plannedAmount: definition.activationCost,
        committedAmount: definition.activationCost,
        paidAmount: definition.activationCost,
        weeklyAmount: definition.weeklyOperatingCost,
        createdAtAbsoluteWeek: absoluteWeek,
        committedAtAbsoluteWeek: absoluteWeek,
        paidAtAbsoluteWeek: absoluteWeek,
        sourceReferenceId: capabilityId,
    };
    const nextPlatform = compactOwnedStreamingPlatformForPersistence({
        ...platform,
        treasuryCash: platform.treasuryCash - definition.activationCost,
        capabilities: {
            ...platform.capabilities,
            installed: [...platform.capabilities.installed, {
                capabilityId,
                branch: 'CONTENT_OPERATIONS' as const,
                status: 'OPERATING' as const,
                installedAtAbsoluteWeek: absoluteWeek,
                sourceProjectId: null,
                legacyLevelFloor: 0,
            }],
        },
        costCommitments: [...platform.costCommitments, commitment],
        eventLedger: [...platform.eventLedger, ledger],
        launchProgram: {
            ...platform.launchProgram,
            configurationRevision: platform.launchProgram.configurationRevision + 1,
        },
    }, player.id);
    return {
        player: { ...player, ownedStreamingPlatform: nextPlatform },
        changed: true,
        detail: `${definition.name} now applies to every current and future catalogue title.`,
    };
};
