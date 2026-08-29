import type {
    PlatformAiCompanyScale,
    PlatformAiLanguageCapability,
    PlatformAiOperatingEfficiencyPolicy,
    PlatformId,
} from '../../types';
import { STREAMING_DAY_ONE_MARKETS } from '../streamingDayOneMarkets';
import { STREAMING_RESEARCH_DEFINITIONS } from '../streamingResearchLifecycle';
import { normalizeStreamingLanguageId } from '../streamingLocalizationCapabilities';

export interface PlatformAiOperatingProfile {
    platformId: PlatformId;
    version: number;
    scale: PlatformAiCompanyScale;
    homeCountryIds: string[];
    startingCountryIds: string[];
    historicalResearchDefinitionIds: string[];
    startingLanguageCapabilities: PlatformAiLanguageCapability[];
    researchOrganizationLevel: number;
    expansionAmbition: number;
    localizationAmbition: number;
    efficiency: PlatformAiOperatingEfficiencyPolicy;
}

const clamp = (value: unknown, min: number, max: number): number => Math.max(min, Math.min(max, Number(value) || 0));

export const clampPlatformAiEfficiencyPolicy = (
    value: Partial<PlatformAiOperatingEfficiencyPolicy> | null | undefined,
): PlatformAiOperatingEfficiencyPolicy => ({
    recurringOperationsCostMultiplier: clamp(value?.recurringOperationsCostMultiplier ?? 0.9, 0.88, 0.95),
    researchCostMultiplier: clamp(value?.researchCostMultiplier ?? 0.9, 0.8, 0.95),
    installationCostMultiplier: clamp(value?.installationCostMultiplier ?? 0.9, 0.8, 0.95),
    marketEntryCostMultiplier: clamp(value?.marketEntryCostMultiplier ?? 0.9, 0.8, 0.95),
    localizationCostMultiplier: clamp(value?.localizationCostMultiplier ?? 0.9, 0.8, 0.95),
    leadTimeMultiplier: clamp(value?.leadTimeMultiplier ?? 0.93, 0.85, 1),
    localizationThroughputMultiplier: clamp(value?.localizationThroughputMultiplier ?? 1.1, 1, 1.2),
    localPartnershipEligible: value?.localPartnershipEligible === true,
});

const language = (
    platformId: PlatformId,
    languageId: string,
    subtitleLevel: 0 | 1 | 2 | 3,
    dubbingLevel: 0 | 1 | 2 | 3,
): PlatformAiLanguageCapability => ({
    languageId: normalizeStreamingLanguageId(languageId),
    subtitleLevel,
    dubbingLevel,
    source: 'HISTORICAL_PROFILE',
    sourceReferenceId: `platform-ai-operating-profile:${platformId}:v1`,
    activatedAtAbsoluteWeek: 0,
});

const profile = (
    platformId: PlatformId,
    scale: PlatformAiCompanyScale,
    homeCountryIds: string[],
    startingCountryIds: string[],
    historicalResearchDefinitionIds: string[],
    startingLanguageCapabilities: PlatformAiLanguageCapability[],
    researchOrganizationLevel: number,
    expansionAmbition: number,
    localizationAmbition: number,
    efficiency: Partial<PlatformAiOperatingEfficiencyPolicy>,
): PlatformAiOperatingProfile => ({
    platformId,
    version: 1,
    scale,
    homeCountryIds: [...homeCountryIds],
    startingCountryIds: [...startingCountryIds],
    historicalResearchDefinitionIds: [...historicalResearchDefinitionIds],
    startingLanguageCapabilities: startingLanguageCapabilities.map(item => ({ ...item })),
    researchOrganizationLevel: clamp(researchOrganizationLevel, 1, 10),
    expansionAmbition: clamp(expansionAmbition, 0, 1),
    localizationAmbition: clamp(localizationAmbition, 0, 1),
    efficiency: clampPlatformAiEfficiencyPolicy(efficiency),
});

export const PLATFORM_AI_OPERATING_PROFILES: Record<PlatformId, PlatformAiOperatingProfile> = {
    NETFLIX: profile(
        'NETFLIX', 'GLOBAL', ['US'],
        ['US', 'CA', 'MX', 'BR', 'GB', 'DE', 'FR', 'ES', 'IT', 'ZA', 'IN', 'JP', 'KR', 'AU'],
        ['adaptive-startup', 'edge-orchestration', 'perceptual-compression', 'localization-exchange', 'global-publishing-orchestrator', 'zero-trust-sessions'],
        [language('NETFLIX', 'english', 3, 3), language('NETFLIX', 'spanish', 3, 3), language('NETFLIX', 'french', 3, 3), language('NETFLIX', 'german', 3, 2), language('NETFLIX', 'hindi', 3, 3), language('NETFLIX', 'japanese', 3, 2), language('NETFLIX', 'korean', 3, 2)],
        10, 0.92, 0.95,
        { recurringOperationsCostMultiplier: 0.88, researchCostMultiplier: 0.82, installationCostMultiplier: 0.84, marketEntryCostMultiplier: 0.82, localizationCostMultiplier: 0.82, leadTimeMultiplier: 0.86, localizationThroughputMultiplier: 1.18, localPartnershipEligible: true },
    ),
    APPLE_TV: profile(
        'APPLE_TV', 'GLOBAL', ['US'],
        ['US', 'CA', 'GB', 'DE', 'FR', 'IN', 'JP', 'KR', 'AU'],
        ['adaptive-startup', 'perceptual-compression', 'localization-exchange', 'global-publishing-orchestrator', 'zero-trust-sessions'],
        [language('APPLE_TV', 'english', 3, 3), language('APPLE_TV', 'spanish', 3, 2), language('APPLE_TV', 'portuguese', 2, 1), language('APPLE_TV', 'french', 3, 2), language('APPLE_TV', 'german', 3, 2), language('APPLE_TV', 'hindi', 2, 2), language('APPLE_TV', 'japanese', 3, 2), language('APPLE_TV', 'korean', 3, 2)],
        9, 0.72, 0.86,
        { recurringOperationsCostMultiplier: 0.89, researchCostMultiplier: 0.84, installationCostMultiplier: 0.82, marketEntryCostMultiplier: 0.87, localizationCostMultiplier: 0.86, leadTimeMultiplier: 0.85, localizationThroughputMultiplier: 1.15, localPartnershipEligible: true },
    ),
    DISNEY_PLUS: profile(
        'DISNEY_PLUS', 'GLOBAL', ['US'],
        ['US', 'CA', 'MX', 'BR', 'GB', 'DE', 'FR', 'IN', 'JP', 'AU'],
        ['adaptive-startup', 'edge-orchestration', 'localization-exchange', 'global-publishing-orchestrator', 'zero-trust-sessions'],
        [language('DISNEY_PLUS', 'english', 3, 3), language('DISNEY_PLUS', 'spanish', 3, 3), language('DISNEY_PLUS', 'french', 3, 3), language('DISNEY_PLUS', 'german', 3, 3), language('DISNEY_PLUS', 'hindi', 3, 3), language('DISNEY_PLUS', 'japanese', 3, 3)],
        9, 0.78, 0.96,
        { recurringOperationsCostMultiplier: 0.90, researchCostMultiplier: 0.85, installationCostMultiplier: 0.85, marketEntryCostMultiplier: 0.84, localizationCostMultiplier: 0.8, leadTimeMultiplier: 0.88, localizationThroughputMultiplier: 1.2, localPartnershipEligible: true },
    ),
    HULU: profile(
        'HULU', 'MATURE', ['US'],
        ['US', 'JP'],
        ['adaptive-startup', 'localization-exchange', 'zero-trust-sessions'],
        [language('HULU', 'english', 3, 2), language('HULU', 'japanese', 2, 1), language('HULU', 'spanish', 2, 1)],
        7, 0.48, 0.62,
        { recurringOperationsCostMultiplier: 0.94, researchCostMultiplier: 0.93, installationCostMultiplier: 0.94, marketEntryCostMultiplier: 0.95, localizationCostMultiplier: 0.93, leadTimeMultiplier: 0.95, localizationThroughputMultiplier: 1.06, localPartnershipEligible: true },
    ),
    YOUTUBE: profile(
        'YOUTUBE', 'GLOBAL', ['US'],
        STREAMING_DAY_ONE_MARKETS.map(market => market.id),
        ['adaptive-startup', 'edge-orchestration', 'perceptual-compression', 'localization-exchange', 'global-publishing-orchestrator', 'zero-trust-sessions'],
        [language('YOUTUBE', 'english', 3, 2), language('YOUTUBE', 'spanish', 3, 2), language('YOUTUBE', 'french', 3, 2), language('YOUTUBE', 'german', 3, 2), language('YOUTUBE', 'hindi', 3, 2), language('YOUTUBE', 'japanese', 3, 2), language('YOUTUBE', 'korean', 3, 2), language('YOUTUBE', 'portuguese', 3, 2)],
        10, 0.9, 0.84,
        { recurringOperationsCostMultiplier: 0.88, researchCostMultiplier: 0.8, installationCostMultiplier: 0.8, marketEntryCostMultiplier: 0.8, localizationCostMultiplier: 0.86, leadTimeMultiplier: 0.85, localizationThroughputMultiplier: 1.16, localPartnershipEligible: true },
    ),
};

const validateProfiles = (): void => {
    const validCountries = new Set(STREAMING_DAY_ONE_MARKETS.map(market => market.id));
    const validResearch = new Set(STREAMING_RESEARCH_DEFINITIONS.map(definition => definition.id));
    for (const [platformId, value] of Object.entries(PLATFORM_AI_OPERATING_PROFILES)) {
        const duplicateCountries = new Set(value.startingCountryIds).size !== value.startingCountryIds.length;
        const duplicateLanguages = new Set(value.startingLanguageCapabilities.map(item => item.languageId)).size !== value.startingLanguageCapabilities.length;
        if (value.platformId !== platformId || duplicateCountries || duplicateLanguages) {
            throw new Error(`Invalid Platform AI operating profile identity for ${platformId}.`);
        }
        if (!value.homeCountryIds.every(id => value.startingCountryIds.includes(id))) {
            throw new Error(`${platformId} home countries must be active at game start.`);
        }
        if (!value.startingCountryIds.every(id => validCountries.has(id))) {
            throw new Error(`${platformId} references an unknown starting country.`);
        }
        if (!value.historicalResearchDefinitionIds.every(id => validResearch.has(id))) {
            throw new Error(`${platformId} references an unknown historical research definition.`);
        }
    }
};

validateProfiles();

export const getPlatformAiOperatingProfile = (platformId: PlatformId): PlatformAiOperatingProfile => (
    PLATFORM_AI_OPERATING_PROFILES[platformId]
);
