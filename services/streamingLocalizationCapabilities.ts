import { STREAMING_DAY_ONE_MARKETS } from './streamingDayOneMarkets';
import type { OwnedStreamingPlatformState } from '../types';

export type StreamingLocalizationCapabilityId =
    | 'LOCALIZATION_FOUNDATION'
    | 'SUBTITLE_OPERATIONS_L1'
    | 'SUBTITLE_OPERATIONS_L2'
    | 'SUBTITLE_OPERATIONS_L3'
    | 'DUBBING_OPERATIONS_L1'
    | 'DUBBING_OPERATIONS_L2'
    | 'DUBBING_OPERATIONS_L3'
    | 'SIMULTANEOUS_LOCALIZATION';

export interface StreamingLocalizationCapabilityDefinition {
    id: StreamingLocalizationCapabilityId;
    prerequisiteIds: StreamingLocalizationCapabilityId[];
    subtitleLevel: 0 | 1 | 2 | 3;
    dubbingLevel: 0 | 1 | 2 | 3;
    contentOperationsFloor: number;
}

export interface StreamingLanguagePackage {
    id: string;
    name: string;
    languageIds: string[];
    prerequisiteCapabilityIds: StreamingLocalizationCapabilityId[];
    activationCost: number;
    weeklyOperatingCost: number;
}

export const normalizeStreamingLanguageId = (value: unknown): string => String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const STREAMING_LOCALIZATION_CAPABILITY_DEFINITIONS: StreamingLocalizationCapabilityDefinition[] = [
    { id: 'LOCALIZATION_FOUNDATION', prerequisiteIds: [], subtitleLevel: 0, dubbingLevel: 0, contentOperationsFloor: 10 },
    { id: 'SUBTITLE_OPERATIONS_L1', prerequisiteIds: ['LOCALIZATION_FOUNDATION'], subtitleLevel: 1, dubbingLevel: 0, contentOperationsFloor: 10 },
    { id: 'SUBTITLE_OPERATIONS_L2', prerequisiteIds: ['SUBTITLE_OPERATIONS_L1'], subtitleLevel: 2, dubbingLevel: 0, contentOperationsFloor: 22 },
    { id: 'SUBTITLE_OPERATIONS_L3', prerequisiteIds: ['SUBTITLE_OPERATIONS_L2'], subtitleLevel: 3, dubbingLevel: 0, contentOperationsFloor: 40 },
    { id: 'DUBBING_OPERATIONS_L1', prerequisiteIds: ['LOCALIZATION_FOUNDATION'], subtitleLevel: 0, dubbingLevel: 1, contentOperationsFloor: 22 },
    { id: 'DUBBING_OPERATIONS_L2', prerequisiteIds: ['DUBBING_OPERATIONS_L1'], subtitleLevel: 0, dubbingLevel: 2, contentOperationsFloor: 40 },
    { id: 'DUBBING_OPERATIONS_L3', prerequisiteIds: ['DUBBING_OPERATIONS_L2'], subtitleLevel: 0, dubbingLevel: 3, contentOperationsFloor: 65 },
    { id: 'SIMULTANEOUS_LOCALIZATION', prerequisiteIds: ['SUBTITLE_OPERATIONS_L3', 'DUBBING_OPERATIONS_L2'], subtitleLevel: 3, dubbingLevel: 2, contentOperationsFloor: 65 },
];

export const STREAMING_LANGUAGE_PACKAGES: StreamingLanguagePackage[] = [
    { id: 'INDIA_CORE', name: 'India Core Languages', languageIds: ['hindi', 'tamil', 'telugu', 'bengali'], prerequisiteCapabilityIds: ['LOCALIZATION_FOUNDATION'], activationCost: 9_000_000, weeklyOperatingCost: 145_000 },
    { id: 'EAST_ASIA_CORE', name: 'East Asia Core Languages', languageIds: ['japanese', 'korean'], prerequisiteCapabilityIds: ['LOCALIZATION_FOUNDATION'], activationCost: 8_000_000, weeklyOperatingCost: 120_000 },
    { id: 'LATIN_AMERICA_CORE', name: 'Latin America Core Languages', languageIds: ['spanish', 'portuguese'], prerequisiteCapabilityIds: ['LOCALIZATION_FOUNDATION'], activationCost: 6_500_000, weeklyOperatingCost: 95_000 },
    { id: 'WESTERN_EUROPE_CORE', name: 'Western Europe Core Languages', languageIds: ['english', 'french', 'german', 'italian'], prerequisiteCapabilityIds: ['LOCALIZATION_FOUNDATION'], activationCost: 7_500_000, weeklyOperatingCost: 110_000 },
    { id: 'SOUTHEAST_ASIA_CORE', name: 'Southeast Asia Core Languages', languageIds: ['indonesian', 'thai', 'filipino'], prerequisiteCapabilityIds: ['LOCALIZATION_FOUNDATION'], activationCost: 7_000_000, weeklyOperatingCost: 105_000 },
    { id: 'MIDDLE_EAST_AFRICA_CORE', name: 'Middle East and Africa Core Languages', languageIds: ['arabic', 'swahili', 'hausa', 'yoruba', 'igbo'], prerequisiteCapabilityIds: ['LOCALIZATION_FOUNDATION'], activationCost: 8_500_000, weeklyOperatingCost: 125_000 },
];

export const STREAMING_LANGUAGE_PACKAGE_CAPABILITY_PREFIX = 'LANGUAGE_PACKAGE:';

export const getStreamingLanguagePackageCapabilityId = (packageId: string): string => (
    `${STREAMING_LANGUAGE_PACKAGE_CAPABILITY_PREFIX}${packageId}`
);

export interface StreamingGlobalLocalizationCapability {
    subtitleLevel: 0 | 1 | 2 | 3;
    dubbingLevel: 0 | 1 | 2 | 3;
    simultaneousLocalization: boolean;
    activePackageIds: string[];
    activeLanguageIds: string[];
}

/**
 * Localization is a platform capability, not a title queue. Once a language
 * package and subtitle/dubbing tier are operating, every current and future
 * catalogue title inherits that capability without adding per-title save data.
 */
export const resolveStreamingGlobalLocalizationCapability = (
    platform: Pick<OwnedStreamingPlatformState, 'capabilities'>,
): StreamingGlobalLocalizationCapability => {
    const installedIds = new Set(platform.capabilities.installed
        .filter(item => item.status === 'OPERATING' || item.status === 'LEGACY_GRANT')
        .map(item => item.capabilityId));
    const tiers = resolveStreamingLocalizationTiers(Array.from(installedIds));
    const activePackages = STREAMING_LANGUAGE_PACKAGES.filter(item => (
        installedIds.has(getStreamingLanguagePackageCapabilityId(item.id))
    ));
    return {
        ...tiers,
        activePackageIds: activePackages.map(item => item.id),
        activeLanguageIds: Array.from(new Set(activePackages.flatMap(item => item.languageIds))).sort(),
    };
};

const CAPABILITY_BY_ID = new Map(STREAMING_LOCALIZATION_CAPABILITY_DEFINITIONS.map(item => [item.id, item]));
const KNOWN_LANGUAGE_IDS = new Set([
    ...STREAMING_DAY_ONE_MARKETS.flatMap(market => market.languages.map(normalizeStreamingLanguageId)),
    ...STREAMING_LANGUAGE_PACKAGES.flatMap(item => item.languageIds),
]);

export const isKnownStreamingLanguageId = (value: unknown): boolean => (
    KNOWN_LANGUAGE_IDS.has(normalizeStreamingLanguageId(value))
);

export const resolveStreamingLocalizationTiers = (
    installedCapabilityIds: unknown,
): { subtitleLevel: 0 | 1 | 2 | 3; dubbingLevel: 0 | 1 | 2 | 3; simultaneousLocalization: boolean } => {
    const installed = new Set((Array.isArray(installedCapabilityIds) ? installedCapabilityIds : [])
        .map(item => String(item || '').trim().toUpperCase())
        .filter((id): id is StreamingLocalizationCapabilityId => CAPABILITY_BY_ID.has(id as StreamingLocalizationCapabilityId)));
    const effective = new Set<StreamingLocalizationCapabilityId>();
    let changed = true;
    while (changed) {
        changed = false;
        for (const definition of STREAMING_LOCALIZATION_CAPABILITY_DEFINITIONS) {
            if (
                installed.has(definition.id)
                && !effective.has(definition.id)
                && definition.prerequisiteIds.every(id => effective.has(id))
            ) {
                effective.add(definition.id);
                changed = true;
            }
        }
    }
    let subtitleLevel: 0 | 1 | 2 | 3 = 0;
    let dubbingLevel: 0 | 1 | 2 | 3 = 0;
    for (const id of effective) {
        const definition = CAPABILITY_BY_ID.get(id)!;
        subtitleLevel = Math.max(subtitleLevel, definition.subtitleLevel) as 0 | 1 | 2 | 3;
        dubbingLevel = Math.max(dubbingLevel, definition.dubbingLevel) as 0 | 1 | 2 | 3;
    }
    return {
        subtitleLevel,
        dubbingLevel,
        simultaneousLocalization: effective.has('SIMULTANEOUS_LOCALIZATION'),
    };
};

const validateLocalizationDefinitions = (): void => {
    const capabilityIds = new Set(STREAMING_LOCALIZATION_CAPABILITY_DEFINITIONS.map(item => item.id));
    if (capabilityIds.size !== STREAMING_LOCALIZATION_CAPABILITY_DEFINITIONS.length) {
        throw new Error('Duplicate streaming localization capability ID.');
    }
    for (const definition of STREAMING_LOCALIZATION_CAPABILITY_DEFINITIONS) {
        if (!definition.prerequisiteIds.every(id => capabilityIds.has(id))) {
            throw new Error(`Unknown prerequisite in ${definition.id}.`);
        }
    }
    const packageIds = new Set<string>();
    for (const languagePackage of STREAMING_LANGUAGE_PACKAGES) {
        if (packageIds.has(languagePackage.id) || !languagePackage.languageIds.length) {
            throw new Error(`Invalid streaming language package ${languagePackage.id}.`);
        }
        packageIds.add(languagePackage.id);
        if (
            new Set(languagePackage.languageIds).size !== languagePackage.languageIds.length
            || !languagePackage.languageIds.every(id => id === normalizeStreamingLanguageId(id) && KNOWN_LANGUAGE_IDS.has(id))
            || !languagePackage.prerequisiteCapabilityIds.every(id => capabilityIds.has(id))
        ) throw new Error(`Invalid language membership in ${languagePackage.id}.`);
    }
};

validateLocalizationDefinitions();
